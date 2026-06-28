"""
Librosa ベースの音声解析サービス

TensorFlow不要の軽量な実装:
- pyin: ボーカルメロディ抽出（単音ピッチ検出）
- onset_detect: ドラムオンセット検出（帯域別）

純関数（モジュールレベル）:
- normalize_tempo: 倍/半テンポをアニソン帯 110-185 に補正
- apply_offset: クオンタイズ原点を第1拍に揃える
- classify_drum: 帯域エネルギー比からドラム種別を判定
- is_duplicate_onset: テンポ連動重複判定
- merge_band_onsets: 帯域別オンセットをマージ（同時打ちを潰さない）
- is_voiced_frame: ボイスフレーム判定（_f0_to_notes から切り出した純関数）
"""
import logging
from pathlib import Path
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)

# librosa / scipy.signal は import が重く、純粋ロジックのテストには不要なため遅延 import する。
# 音声を実際に解析する入口メソッド（extract_melody / extract_drums）の冒頭で
# _ensure_audio_libs() を呼び、以降の librosa.xxx / signal.xxx 参照を解決する。
librosa = None
signal = None

# アニソン帯域（BPM）
_ANISON_TEMPO_MIN = 110.0
_ANISON_TEMPO_MAX = 185.0

# detect_tempo 用パラメータ
_DETECT_TEMPO_SR = 44100          # Demucs 出力と合わせる
_DETECT_TEMPO_HOP = 512           # hop_length（frames_to_time と統一）
_DETECT_TEMPO_START_BPM = 150.0   # アニソン帯の中央付近をスタート値に

# ---------------------------------------------------------------------------
# 帯域別ドラムオンセット検出用定数
# ---------------------------------------------------------------------------

# 各ドラム種別に対応する周波数帯域 (fmin_Hz, fmax_Hz)
# kick: 低域のドスン / snare: 中域の胴鳴り+スナッピー / hihat: 超高域の金属音
_DRUM_BANDS: dict[str, tuple[int, int]] = {
    "kick":  (20, 200),
    "snare": (200, 2000),
    "hihat": (5000, 18000),
}

# 分類優先順位（merge_band_onsets でのソート基準に使用）
_DRUM_PRIORITY: list[str] = ["kick", "snare", "hihat"]

# Superflux オンセット強度計算パラメータ
# lag=2, max_size=3 により 2 フレーム差分 + 3フレーム最大値でスペクトル変化を捉える
_SUPERFLUX_LAG: int = 2
_SUPERFLUX_MAX_SIZE: int = 3

# 帯域名 → ドラム種別のマッピング（hihat は hihat_closed として扱う）
_BAND_TO_DRUM_TYPE: dict[str, str] = {
    "kick":  "kick",
    "snare": "snare",
    "hihat": "hihat_closed",
}

# ---------------------------------------------------------------------------
# 帯域別 onset_detect delta（過剰検出抑制）
# ---------------------------------------------------------------------------
# 実測(wSTbdqo-j74): 旧実装(delta=0.03全帯域一律)で 4258 ノートと過剰検出。
# delta=0.15 では 3093 ノートと依然過密。抜本是正のため大幅引き上げ。
#
# 反復実験(drums stem htdemucs_6s 直叩き, BPM156.6, 310s曲):
#   kick  delta=0.05→1287 / 0.30→447 / 0.35→約350 / 0.40→290
#   snare delta=0.07→1054 / 0.30→437 / 0.40→319 / 0.50→159
#   hihat delta=0.15→753  / 0.40→229 / 0.50→122
#   最小間隔フィルタ(kick/snare=8分、hihat=16分)と組合せた最終計測:
#     kick=0.35 + snare=0.40 + hihat=0.40 → 895 ノート達成（目標1000以下）
#     hihat=224件は8分打ちの55%程度で音楽的に自然。
#
# kick 帯域(20-200Hz): ドラムstemの低域成分が密に発火するため強い抑制が必要。
#   delta=0.35 で正規のキック打点のみ残す。
#
# snare 帯域(200-2000Hz): 中域は広帯域でstemの漏れが多い。
#   delta=0.40 で明確な胴鳴りのみ抽出する。
#
# hihat 帯域(5000-18000Hz): 高周波はノイズが最も多い。
#   delta=0.40 で実発音のみ残す（0.50では少なすぎ、0.40でhihat224件=8分の55%確保）。
_ONSET_DELTA_BY_BAND: dict[str, float] = {
    "kick":  0.35,   # 低域: 過密対策 → 高い閾値で正規打点のみ
    "snare": 0.40,   # 中域: stemの漏れ抑制 → 明確な胴鳴りのみ
    "hihat": 0.40,   # 超高域: ノイズ多 → 実発音のみ（0.50 は少なすぎ, 0.40 で 8分打ち55%を確保）
}

# ---------------------------------------------------------------------------
# 帯域別 dedup ベース閾値（hihat 連続発火の間引き）
# ---------------------------------------------------------------------------
# dedup_threshold_for_tempo(tempo) でテンポ連動値を計算する際の「帯域ごとのベース乗数」。
# hihat は同一テンポ・同一閾値でも発火が多いため、基本閾値を kick より大きくする。
# 実際の閾値: max(base_threshold, dedup_threshold_for_tempo(tempo))
#
# kick:  テンポ連動のみ（ベースを小さく保ち連打を残す）
# snare: 同上
# hihat: ベース閾値を最低 0.025s に保ち、~40Hz 以上の連打をデフォルト除外する
_DEDUP_BASE_THRESHOLD_BY_BAND: dict[str, float] = {
    "kick":  0.010,  # キック: テンポ連動 dedup を優先。最低 10ms は保持
    "snare": 0.012,  # スネア: キックより若干厳しく（バックビートの誤重複を除く）
    "hihat": 0.025,  # ハイハット: 最低 25ms 間隔を保証（~40Hz 相当の連打を間引く）
}

# ---------------------------------------------------------------------------
# 帯域別 最小音楽的間隔（音楽的に意味のある最短打点間隔）
# ---------------------------------------------------------------------------
# onset_detect + dedup だけでは弱いピークの連続発火を除ききれない。
# 後段フィルタとして「同一種別の連続オンセットに最短間隔を設ける」ことで
# 楽器として非現実的な速さの連打（ゴーストノートでもない限り発生しない）を除外する。
#
# 値の単位: 拍長（beat_duration = 60/tempo）の倍数
#   kick:  0.5 = 8分音符。キックは通常最速でも8分打ち。
#          アニソンで16分連打のkickは稀。8分を最短とする。
#   snare: 0.5 = 8分音符。スネアも同様に8分が最速（ゴーストは別扱い）。
#   hihat: 0.25 = 16分音符。ハイハットは16分打ちが一般的で最速。
#          (8分=0.5に変えると合計~500となり少なすぎる。16分を許容上限とする)
#
# 実測での効果(BPM156.6, beat=0.383s):
#   kick  min_interval=0.191s(8分): 725→359 (-50%)
#   snare min_interval=0.191s(8分): 617→312 (-49%)
#   hihat min_interval=0.096s(16分): 229→93  (-59%)
#   合計: 1571→789 (-50%) ※ delta引き上げ後の値
_MIN_INTERVAL_BY_BEAT_FACTOR: dict[str, float] = {
    "kick":  0.5,   # 8分音符 = beat * 0.5
    "snare": 0.5,   # 8分音符 = beat * 0.5
    "hihat": 0.25,  # 16分音符 = beat * 0.25
}


def _ensure_audio_libs() -> None:
    """重い音声ライブラリ（librosa / scipy.signal）を遅延 import する"""
    global librosa, signal
    if librosa is None:
        import librosa as _librosa
        from scipy import signal as _signal
        librosa = _librosa
        signal = _signal


# ---------------------------------------------------------------------------
# 純関数: テンポ正規化
# ---------------------------------------------------------------------------

def normalize_tempo(
    raw_bpm: float,
    target_low: float = _ANISON_TEMPO_MIN,
    target_high: float = _ANISON_TEMPO_MAX,
) -> float:
    """半/倍テンポをアニソン帯へ補正する純関数（最大1回補正）

    librosa の beat_track はアニソン140-180BPM帯で半分/倍のBPMを誤検出しやすい。
    本関数は1回だけ補正を試み、補正後も帯域外ならば元値を返す。

    契約:
      - raw_bpm が [target_low, target_high] 内ならそのまま返す（境界は inclusive）
      - raw_bpm < target_low: ×2 して帯域内なら採用。入らなければ元値を返す（最大1回）
      - raw_bpm > target_high: ÷2 して帯域内なら採用。入らなければ元値を返す（最大1回）
      - raw_bpm <= 0（不正値）: 120.0 を返す

    Args:
        raw_bpm: 生のテンポ推定値（BPM）
        target_low: アニソン帯下限（デフォルト 110.0）
        target_high: アニソン帯上限（デフォルト 185.0）

    Returns:
        補正後のテンポ（float）
    """
    raw_bpm = float(raw_bpm)
    # 不正値（0以下）はデフォルト120を返す
    if raw_bpm <= 0:
        return 120.0
    # 既に帯域内ならそのまま
    if target_low <= raw_bpm <= target_high:
        return raw_bpm
    # 遅すぎる場合: ×2 を1回だけ試みる
    if raw_bpm < target_low:
        doubled = raw_bpm * 2.0
        return doubled if target_low <= doubled <= target_high else raw_bpm
    # 速すぎる場合: ÷2 を1回だけ試みる
    halved = raw_bpm / 2.0
    return halved if target_low <= halved <= target_high else raw_bpm


# ---------------------------------------------------------------------------
# 純関数: オフセット適用
# ---------------------------------------------------------------------------

def apply_offset(time: float, offset: float) -> float:
    """クオンタイズ前にノート時刻から第1拍オフセットを差し引く純関数

    ノート時刻から第1拍オフセット（beat_times[0]）を差し引いて
    クオンタイズ原点を第1拍に揃える。負にはしない（クランプ）。

    Args:
        time:   ノートの時刻（秒）
        offset: 第1拍の絶対時刻（秒）

    Returns:
        オフセット適用後の時刻（負にならない）
    """
    return max(0.0, time - offset)


def apply_offset_to_notes(notes: list[dict], offset: float) -> list[dict]:
    """ノートリスト全体にオフセットを適用する補助関数

    apply_offset をノートリストの start/end に適用する。
    元のリスト・辞書は変更しない（副作用なし）。

    Args:
        notes:  ノート辞書のリスト（start/end キーを持つ）
        offset: 第1拍の絶対時刻（秒）

    Returns:
        offset を適用した新しいノートリスト
    """
    if offset == 0.0:
        return [n.copy() for n in notes]
    result = []
    for note in notes:
        new_note = note.copy()
        new_note["start"] = apply_offset(note["start"], offset)
        new_note["end"] = apply_offset(note["end"], offset)
        result.append(new_note)
    return result


# ---------------------------------------------------------------------------
# 純関数: ドラム分類
# ---------------------------------------------------------------------------

# ドラム種別の帯域エネルギー比による優先順位マッピング
# (条件関数, ドラム種別) のリスト。最初にマッチした種別を返す
#
# ルール評価順序の設計方針:
#   1. スネア: 中域(胴鳴り)+高域(スナッピー)が同時に強い場合を最優先。
#      スネアは超高域成分も持つため r_hihat が 0.4 を超えることがあるが、
#      r_mid が大きければスネアと判定する（先に評価して hihat_closed への誤分類を防ぐ）。
#   2. キック: 低域が圧倒的で中域が少ない場合。
#   3. ハイハット: 超高域が優勢 かつ 中域が乏しい場合（r_mid < 0.2）。
#      スネアを先に評価することで mid が大きい場合は hihat に誤分類されない。
#   4. タム/キック（弱め）: 残りのパターンに対応。
_DRUM_RULES = [
    # スネア: 中域（胴鳴り）＋高域（スナッピー）が同時に強い → 最優先
    # r_hihat が 0.4 を超えていても r_mid が大きければスネアを優先
    # r_high >= 0.15（>=）: 実計測値 0.15 を境界として含める
    (lambda r_low, r_mid, r_high, r_hihat: r_mid > 0.3 and r_high >= 0.15, "snare"),
    # キック: 低域が圧倒的で中域が少ない
    (lambda r_low, r_mid, r_high, r_hihat: r_low > 0.5 and r_mid < 0.25, "kick"),
    # ハイハット: 超高域が優勢 かつ 中域が乏しい（スネアとの区別）
    (lambda r_low, r_mid, r_high, r_hihat: r_hihat > 0.4 and r_mid < 0.2, "hihat_closed"),
    # 中域のみ → タム（スネアより弱い高域）
    (lambda r_low, r_mid, r_high, r_hihat: r_mid > 0.4, "tom_mid"),
    # 低域優勢（キックほど強くない）
    (lambda r_low, r_mid, r_high, r_hihat: r_low > 0.35, "kick"),
]

# argmax fallback 用: 帯域インデックス → ドラム種別
_BAND_TO_DRUM = ["kick", "tom_mid", "snare", "hihat_closed"]


def classify_drum(r_low: float, r_mid: float, r_high: float, r_hihat: float) -> str:
    """帯域エネルギー比からドラム種別を判定する純関数

    全ルールに合致しない場合（fallback）は、最大エネルギーの帯域を argmax で選ぶ。
    hihat_closed に一律崩壊することを避ける。

    Args:
        r_low:   低域エネルギー比（キック帯域 20-120 Hz）
        r_mid:   中域エネルギー比（スネア胴 150-500 Hz）
        r_high:  高域エネルギー比（スナッピー 2000-6000 Hz）
        r_hihat: 超高域エネルギー比（ハイハット 6000-15000 Hz）

    Returns:
        ドラム種別文字列（drum_map のキー）
    """
    for condition, drum_type in _DRUM_RULES:
        if condition(r_low, r_mid, r_high, r_hihat):
            return drum_type

    # fallback: 最大エネルギーの帯域で決定（hihat_closed 固定を避ける）
    bands = [r_low, r_mid, r_high, r_hihat]
    return _BAND_TO_DRUM[int(np.argmax(bands))]


# ---------------------------------------------------------------------------
# 純関数: 重複判定
# ---------------------------------------------------------------------------

def dedup_threshold_for_tempo(tempo: float) -> float:
    """テンポ連動の dedup 閾値を返す純関数

    テンポが上がるほど閾値を小さくすることで、速い連打を消さない。
    計算式: min(0.02, 16分音符長 * 0.25)
      - 16分音符長 = 60.0 / tempo * 0.25
      - 「拍の 5% 以内」は真の重複とみなす
      - ただし最小 0.006s（量子化誤差・ジッタ吸収）

    3契約を満たす:
      1. テンポが上がるほど単調減少（または非増加）
      2. 真の重複(数ms)は除去 → 下限 0.006s を超える
      3. 16分音符相当の連打は残す（閾値 < 16分音符長）

    Args:
        tempo: BPM

    Returns:
        dedup 閾値（秒）
    """
    if tempo <= 0:
        return 0.02
    # 16分音符長（秒）
    sixteenth_note = 60.0 / tempo * 0.25
    # 16分音符の 25% を閾値上限とする（連打は残す）
    raw = sixteenth_note * 0.25
    # 0.006s〜0.02s にクランプ（真の重複を確実に除去、連打を確実に残す）
    return float(max(0.006, min(0.02, raw)))


def is_duplicate_onset(time: float, detected: dict, threshold: float = 0.02) -> bool:
    """オンセット時刻が検出済み辞書と重複するか判定する純関数

    threshold はテンポ連動で渡すことを推奨:
        threshold = beat_duration * 0.05  （beat_duration = 60.0 / bpm）

    Args:
        time:      判定する時刻（秒）
        detected:  既検出の時刻→種別辞書
        threshold: 重複とみなす時間差（秒）

    Returns:
        重複していれば True
    """
    for t in detected.keys():
        if abs(t - time) < threshold:
            return True
    return False


# ---------------------------------------------------------------------------
# 純関数: 帯域別オンセットのマージ
# ---------------------------------------------------------------------------

def merge_band_onsets(band_times: dict[str, list[float]]) -> list[dict]:
    """帯域別オンセット時刻リストを統合して {time, drum_type} の昇順リストを返す純関数

    【最重要】同一 time に複数帯域のオンセットがあっても両方残す（同時打ちを潰さない）。
    旧来の全帯域単一 onset_detect では同時打ちが「最初の 1 種別だけ」に潰れていた。
    本関数はそれを防ぐため、帯域ごとに独立してオンセットを収集してから統合する。

    Args:
        band_times: {"kick": [t, ...], "snare": [...], "hihat": [...]} 形式の帯域→時刻辞書

    Returns:
        [{"time": float, "drum_type": str}, ...] を time 昇順で返す
    """
    result: list[dict] = []

    # 帯域ごとに全オンセットを収集（同時刻でも独立して追加する）
    for band_name, times in band_times.items():
        # _BAND_TO_DRUM_TYPE で帯域名 → ドラム種別に変換
        drum_type = _BAND_TO_DRUM_TYPE.get(band_name, band_name)
        for t in times:
            result.append({"time": float(t), "drum_type": drum_type})

    # time 昇順ソート
    result.sort(key=lambda x: x["time"])
    return result


# ---------------------------------------------------------------------------
# 純関数: ボイスフレーム判定
# ---------------------------------------------------------------------------

def is_voiced_frame(pitch: float, prob: float, threshold: float) -> bool:
    """ピッチフレームが有声（ボーカル）として有効かを判定する純関数

    _f0_to_notes 内のインライン判定を切り出した（単一責任）。
    振る舞いは変えない（voiced_threshold=0.2 / vocal_fmax=2000 は不変）。

    Args:
        pitch:     MIDI ピッチ値（負の値は無効）
        prob:      voiced_probs（NaN の場合は無効）
        threshold: voiced_threshold（デフォルト値 0.2 を外から渡す）

    Returns:
        有声フレームとして有効なら True、無効なら False
    """
    import math
    # pitch が負 → 無効
    if pitch < 0:
        return False
    # prob が NaN → 無効
    if math.isnan(prob):
        return False
    # prob がしきい値未満 → 無効
    if prob < threshold:
        return False
    return True


# ---------------------------------------------------------------------------
# 純関数: offset 起点グリッドスナップ
# ---------------------------------------------------------------------------

def quantize_to_grid(t: float, grid: float, offset: float) -> float:
    """オンセット時刻を offset 起点の 16 分グリッドにスナップする純関数

    正しい式: round((t - offset) / grid) * grid + offset

    【設計根拠】
    旧式 round(t/grid)*grid は絶対0秒を原点とするため、
    offset が grid の非整数倍のとき全ノートが真の拍から系統的にずれる。
    本関数は offset(=第1拍)を原点にスナップするため、
    apply_offset_to_notes で offset を引いた後のノートが
    grid の整数倍に揃う（拍グリッドとの整合を保証）。

    また、スナップ前に t が offset より前（負側）になる場合は
    np.maximum(0.0, ...) でクランプして非負を保証する。

    Args:
        t:      オンセット時刻（秒、絶対時刻）
        grid:   16 分音符長（秒）= 60.0 / tempo * 0.25
        offset: 第1拍の絶対時刻（秒）

    Returns:
        グリッドスナップ後の絶対時刻（秒、>= 0）
    """
    # 先に offset を引いて相対時刻へ（負にならないようクランプ）
    shifted = max(0.0, t - offset)
    # 16 分グリッドにスナップ
    snapped = round(shifted / grid) * grid
    # offset を足し戻して絶対時刻に変換
    return float(snapped + offset)


class LibrosaTranscriber:
    """Librosaによる音声→ノート変換"""

    def __init__(self):
        # ボーカル用パラメータ（htdemucs_6s 対応でノイズ除去調整）
        self.vocal_fmin = 80    # Hz (E2あたり)
        # vocal_fmax は 2000Hz（高音ボーカル対応で復帰）
        # C6(1047Hz) では高音区間のボーカルを切り落とすため、2000Hz まで拾う
        self.vocal_fmax = 2000  # Hz (高音ボーカル上限)
        self.min_note_duration = 0.01  # 0.02→0.01秒 短いノートも拾う
        # voiced_threshold は 0.2（メロディ回復のため緩和）
        # pyin の voiced_probs は真のボーカルでも 0.2-0.4 に密集する。
        # 0.5 では正しいボーカルを大量に捨てるため、分布を踏まえ 0.2 とする
        # （ノート回復とノイズ抑制のバランスが実測で最良）
        self.voiced_threshold = 0.2    # 真ボーカルの voiced_probs 分布(0.2-0.4)に合わせる
        self.pitch_tolerance = 1  # 半音（ビブラート許容）
        self.gap_tolerance = 0.08  # 0.05→0.08秒 ぶつ切り軽減

        # ドラム用パラメータ（GM Drum Map準拠）
        self.drum_map = {
            "kick": 36,         # Bass Drum 1
            "snare": 38,        # Acoustic Snare
            "hihat_closed": 42, # Closed Hi-Hat
            "hihat_open": 46,   # Open Hi-Hat
            "tom_high": 48,     # Hi-Mid Tom
            "tom_mid": 45,      # Low Tom
            "tom_low": 41,      # Low Floor Tom
            "crash": 49,        # Crash Cymbal 1
            "ride": 51,         # Ride Cymbal 1
        }

    def detect_tempo(self, audio_path: str):
        """
        librosa beat_track でテンポと第1拍オフセットを検出する

        sr と hop_length を明示的に指定して時間軸ずれを防ぐ。
        Demucs 出力は 44100 Hz なので sr=44100 を使用する。
        戻り値は TempoInfo pydantic モデル（tempo float / beat_times / offset）。

        Args:
            audio_path: 音声ファイルのパス

        Returns:
            TempoInfo: tempo (float BPM), beat_times (秒配列), offset (第1拍秒)
        """
        from app.models.transcription import TempoInfo

        _ensure_audio_libs()
        try:
            # Demucs 出力に合わせ sr=44100 で読み込む
            y, sr = librosa.load(audio_path, sr=_DETECT_TEMPO_SR)
            # start_bpm をアニソン帯中央に設定してハーフ/ダブルテンポを抑制
            tempo, beat_frames = librosa.beat.beat_track(
                y=y,
                sr=sr,
                start_bpm=_DETECT_TEMPO_START_BPM,
            )
            # sr と hop_length を明示（未指定だとデフォルト 22050 前提で時間軸が 2 倍ずれる）
            beat_times = librosa.frames_to_time(
                beat_frames,
                sr=sr,
                hop_length=_DETECT_TEMPO_HOP,
            )
            # numpy 配列の場合は最初の値を取得
            if hasattr(tempo, "__len__"):
                tempo = float(tempo[0]) if len(tempo) > 0 else _DETECT_TEMPO_START_BPM
            tempo = float(tempo)
            # start_bpm でも取りこぼす半/倍テンポをアニソン帯(110-185)へ最終補正する
            tempo = normalize_tempo(tempo)

            # 第1拍のオフセット（クオンタイズ原点）
            offset = float(beat_times[0]) if len(beat_times) > 0 else 0.0

            return TempoInfo(
                tempo=tempo,
                beat_times=beat_times.tolist(),
                offset=offset,
            )
        except Exception as e:
            logger.warning(f"[Librosa] detect_tempo failed: {e}. Using default BPM.")
            return TempoInfo(
                tempo=_DETECT_TEMPO_START_BPM,
                beat_times=[],
                offset=0.0,
            )

    def _classify_drum(
        self,
        r_low: float,
        r_mid: float,
        r_high: float,
        r_hihat: float,
        decay: float,
        centroid: float,
    ) -> str:
        """帯域エネルギー比・減衰時間・スペクトル重心からドラム種別を判定するメソッド

        `extract_drums` の分類ロジックを切り出した（単一責任）。
        decay / centroid を受け取り、ハイハットのクローズ/オープン判定と
        タムの低/中/高判定に使う。

        どの閾値にも当てはまらない場合（fallback）は hihat_closed に固定せず、
        最大エネルギー帯域の argmax で決定する（ドラム原因2の解消）。

        Args:
            r_low:    低域エネルギー比（キック帯域 20-120 Hz）
            r_mid:    中域エネルギー比（スネア胴 150-500 Hz）
            r_high:   高域エネルギー比（スナッピー 2000-6000 Hz）
            r_hihat:  超高域エネルギー比（ハイハット 6000-15000 Hz）
            decay:    超高域信号の減衰時間（秒）。ハイハットの開閉判定に使う
            centroid: スペクトル重心（Hz）。タムの音域判定に使う

        Returns:
            drum_map のキー文字列（"kick" / "snare" / "hihat_closed" / "hihat_open" /
            "tom_low" / "tom_mid" / "tom_high"）
        """
        # スネア: 中域（胴鳴り）＋高域（スナッピー）が同時に強い → 最優先
        # スネアは超高域成分も持つため r_hihat が 0.4 を超えることがあるが、
        # r_mid が大きければスネアを優先し hihat_closed への誤分類を防ぐ。
        # r_high >= 0.15（>=）: 実計測値 0.15 を境界として含める
        if r_mid > 0.3 and r_high >= 0.15:
            return "snare"

        # キック: 低域が圧倒的で中域が少ない
        if r_low > 0.5 and r_mid < 0.25:
            return "kick"

        # ハイハット優勢: 超高域が支配的 かつ 中域が乏しい（スネアとの区別）
        # r_mid < 0.2 を追加することで、中域も強いスネアを hihat_closed に誤分類しない
        if r_hihat > 0.4 and r_mid < 0.2:
            return "hihat_open" if decay > 0.08 else "hihat_closed"

        # タム: 中域が優勢（スネアより弱い高域）
        if r_mid > 0.4:
            if centroid < 200:
                return "tom_low"
            elif centroid < 350:
                return "tom_mid"
            return "tom_high"

        # 低域優勢（キックほど強くない）
        if r_low > 0.35:
            return "kick"

        # fallback: hihat_closed 固定を避け、最大エネルギー帯域で判定（argmax）
        # 帯域インデックス: 0=low, 1=mid, 2=high, 3=hihat
        bands = [r_low, r_mid, r_high, r_hihat]
        argmax_to_drum = ["kick", "snare", "snare", "hihat_closed"]
        return argmax_to_drum[int(np.argmax(bands))]

    def _detect_band_onsets(
        self, y: np.ndarray, sr: int, band: str, hop: int = 512
    ) -> np.ndarray:
        """指定帯域の melspectrogram → Superflux onset_strength → onset_detect で秒配列を返す

        帯域名（kick/snare/hihat）から _DRUM_BANDS で周波数範囲を取得し、
        その帯域に特化した mel スペクトログラムからオンセットを検出する。
        これにより kick/snare/hihat を互いに干渉せず独立検出できる。

        Args:
            y:    mono 波形 (float32, sr=44100 前提)
            sr:   サンプルレート（44100 推奨）
            band: 帯域名 ("kick" / "snare" / "hihat")
            hop:  hop_length（デフォルト 512）

        Returns:
            オンセット時刻の numpy 配列（秒単位）
        """
        # 帯域の周波数範囲を取得
        fmin, fmax = _DRUM_BANDS[band]

        # melspectrogram を帯域限定で計算
        melspec = librosa.feature.melspectrogram(
            y=y, sr=sr, fmin=fmin, fmax=fmax, hop_length=hop
        )
        # dB スケールに変換（線形スペクトルよりオンセットが鮮明になる）
        S = librosa.power_to_db(melspec)

        # Superflux オンセット強度を計算
        # lag=_SUPERFLUX_LAG, max_size=_SUPERFLUX_MAX_SIZE で Superflux の差分を取る
        onset_env = librosa.onset.onset_strength(
            S=S,
            sr=sr,
            hop_length=hop,
            lag=_SUPERFLUX_LAG,
            max_size=_SUPERFLUX_MAX_SIZE,
        )

        # オンセットフレームを検出
        # backtrack=True でフレームを実際の立ち上がりに戻す
        # delta は帯域ごとに _ONSET_DELTA_BY_BAND から取得する（過剰検出抑制）
        band_delta = _ONSET_DELTA_BY_BAND.get(band, 0.05)
        onset_frames = librosa.onset.onset_detect(
            onset_envelope=onset_env,
            sr=sr,
            hop_length=hop,
            backtrack=True,
            delta=band_delta,
            units="frames",
        )

        # フレーム → 秒に変換
        onset_times = librosa.frames_to_time(
            onset_frames,
            sr=sr,
            hop_length=hop,
        )
        return onset_times

    def _classify_hihat_open_close(self, decay: float) -> str:
        """ハイハットのオープン/クローズドを減衰時間で判定する純関数

        decay > 0.08 秒 → hihat_open（開いたシンバルは長く鳴り響く）
        decay <= 0.08 秒 → hihat_closed（閉じた状態は短く切れる）

        Args:
            decay: 減衰時間（秒）

        Returns:
            "hihat_open" または "hihat_closed"
        """
        if decay > 0.08:
            return "hihat_open"
        return "hihat_closed"

    def extract_melody(self, audio_path: str, tempo: float = None, offset: float = 0.0) -> dict:
        """
        pyinでボーカルメロディを抽出

        Args:
            audio_path: 音声ファイルのパス（分離済みボーカル推奨）
            tempo: テンポ（BPM）- クオンタイズ用

        Returns:
            {
                "success": True/False,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {
                "success": False,
                "notes": [],
                "error": f"Audio file not found: {audio_path}",
            }

        try:
            _ensure_audio_libs()
            logger.debug(f"[Librosa] Loading audio: {audio_file}")
            # 音声を読み込み
            y, sr = librosa.load(str(audio_file), sr=22050, mono=True)
            logger.debug(f"[Librosa] Loaded: {len(y)} samples, sr={sr}, duration={len(y)/sr:.1f}s")

            if len(y) == 0:
                return {
                    "success": False,
                    "notes": [],
                    "error": "Audio file is empty",
                }

            # pyinでピッチ推定（高解像度）
            logger.debug(f"[Librosa] Running pyin for melody extraction...")
            hop_length = 128  # 最高解像度（デフォルト512）
            # f0: 基本周波数（Hz）、voiced_flag: 有声/無声フラグ
            f0, voiced_flag, voiced_probs = librosa.pyin(
                y,
                fmin=self.vocal_fmin,
                fmax=self.vocal_fmax,
                sr=sr,
                frame_length=2048,
                hop_length=hop_length,
                fill_na=None,  # NaNを残して後処理で対応
            )

            # 時間軸
            times = librosa.times_like(f0, sr=sr, hop_length=hop_length)

            # デバッグ: 有声フレーム数
            voiced_count = np.sum(voiced_flag) if voiced_flag is not None else 0
            logger.debug(f"[Librosa] Total frames: {len(f0)}, voiced frames: {voiced_count}")

            # ピッチをノートに変換
            notes = self._f0_to_notes(f0, voiced_flag, voiced_probs, times, tempo)

            # オフセット補正（第1拍を原点に揃える）
            if offset != 0.0:
                notes = apply_offset_to_notes(notes, offset)

            logger.info(f"[Librosa] Extracted {len(notes)} melody notes")

            return {
                "success": True,
                "notes": notes,
                "error": None,
            }

        except Exception as e:
            logger.error(f"[Librosa] Melody error: {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "notes": [],
                "error": f"Melody extraction failed: {str(e)}",
            }

    def _f0_to_notes(
        self,
        f0: np.ndarray,
        voiced_flag: np.ndarray,
        voiced_probs: np.ndarray,
        times: np.ndarray,
        tempo: float = None
    ) -> list[dict]:
        """
        連続ピッチデータをノートイベントに変換
        ビブラート許容・ギャップブリッジ対応
        """
        notes = []

        # 周波数をMIDIノート番号に変換
        midi_pitches = np.zeros_like(f0)
        valid_mask = ~np.isnan(f0) & (f0 > 0) & voiced_flag
        midi_pitches[valid_mask] = librosa.hz_to_midi(f0[valid_mask])
        midi_pitches[~valid_mask] = -1

        # ノートをグループ化
        current_note = None
        current_start = None
        current_end = None
        current_pitches = []
        current_probs = []
        gap_start = None  # ギャップ開始時刻

        for i, (t, pitch, prob) in enumerate(zip(times, midi_pitches, voiced_probs)):
            # is_voiced_frame 純関数に委譲（単一責任・テスト可能性）
            is_valid = is_voiced_frame(float(pitch), float(prob), self.voiced_threshold)

            if not is_valid:
                # 無効なフレーム
                if current_note is not None:
                    if gap_start is None:
                        # ギャップ開始
                        gap_start = t
                        current_end = times[i-1] if i > 0 else t
                    elif t - gap_start > self.gap_tolerance:
                        # ギャップが長すぎる - ノートを終了
                        note = self._finalize_note(
                            current_note, current_start, current_end,
                            current_pitches, current_probs, tempo
                        )
                        if note:
                            notes.append(note)
                        current_note = None
                        current_start = None
                        current_end = None
                        current_pitches = []
                        current_probs = []
                        gap_start = None
            else:
                rounded_pitch = round(pitch)

                if current_note is None:
                    # 新しいノート開始
                    current_note = rounded_pitch
                    current_start = t
                    current_end = t
                    current_pitches = [pitch]
                    current_probs = [prob]
                    gap_start = None
                elif abs(rounded_pitch - current_note) <= self.pitch_tolerance:
                    # 同じノートが続く（ビブラート許容）
                    current_pitches.append(pitch)
                    current_probs.append(prob)
                    current_end = t
                    gap_start = None  # ギャップ解消
                else:
                    # 新しいノートに変わった
                    note = self._finalize_note(
                        current_note, current_start, current_end,
                        current_pitches, current_probs, tempo
                    )
                    if note:
                        notes.append(note)
                    current_note = rounded_pitch
                    current_start = t
                    current_end = t
                    current_pitches = [pitch]
                    current_probs = [prob]
                    gap_start = None

        # 最後のノートを追加
        if current_note is not None and len(current_pitches) > 0:
            note = self._finalize_note(
                current_note, current_start, current_end or times[-1],
                current_pitches, current_probs, tempo
            )
            if note:
                notes.append(note)

        # 近接ノートをマージ（同じピッチで短いギャップ）
        notes = self._merge_nearby_notes(notes)

        return notes

    def _merge_nearby_notes(self, notes: list[dict]) -> list[dict]:
        """同じピッチの近接ノートをマージ"""
        if len(notes) < 2:
            return notes

        merged = [notes[0]]
        for note in notes[1:]:
            prev = merged[-1]
            gap = note["start"] - prev["end"]
            # 同じピッチで短いギャップならマージ
            if note["pitch"] == prev["pitch"] and gap <= self.gap_tolerance:
                prev["end"] = note["end"]
                prev["velocity"] = max(prev["velocity"], note["velocity"])
            else:
                merged.append(note)
        return merged

    def _finalize_note(
        self,
        pitch: int,
        start: float,
        end: float,
        pitches: list[float],
        probs: list[float],
        tempo: float = None
    ) -> Optional[dict]:
        """ノートを確定"""
        duration = end - start
        if duration < self.min_note_duration:
            return None

        # 平均ピッチを使用
        avg_pitch = round(np.mean(pitches)) if pitches else pitch
        avg_confidence = np.mean(probs) if probs else 0.5

        # クオンタイズ
        if tempo and tempo > 0:
            beat_duration = 60.0 / tempo
            grid = beat_duration * 0.25  # 16分音符
            start = round(start / grid) * grid
            end = round(end / grid) * grid
            if end <= start:
                end = start + grid

        return {
            "pitch": int(avg_pitch),
            "start": round(start, 3),
            "end": round(end, 3),
            "velocity": min(127, max(40, int(avg_confidence * 100))),
        }

    def extract_drums(self, audio_path: str, tempo: float = None, offset: float = 0.0) -> dict:
        """
        帯域別オンセット検出によるドラムイベント抽出（帯域別フロー）

        旧来の「全帯域単一 onset_detect」から
        「kick/snare/hihat を独立した帯域で検出し同時打ちを両方残す」方式に置換。

        フロー:
        1. ファイル存在チェック・load(sr=44100, mono)
        2. 各帯域(kick/snare/hihat)で _detect_band_onsets → 秒配列
        3. 帯域内 dedup: is_duplicate_onset + dedup_threshold_for_tempo で帯域ごとに重複除去
        4. 帯域ごとに quantize: tempo>0 のとき grid=60/tempo*0.25、
           「先に offset を引く → 16分グリッドスナップ → offset 足し戻す」パターン
        5. merge_band_onsets で {time, drum_type} の統合リストへ（同時打ち両方残す）
        6. hihat の drum_type は decay で open/close を _classify_hihat_open_close で再判定
        7. 各要素を _create_drum_note でノート化
        8. sort(start) → offset!=0 なら apply_offset_to_notes を最後に適用

        注: percussive 分離は不使用。
            既存の _classify_drum / classify_drum / _DRUM_RULES / 帯域フィルタ群は温存。

        Args:
            audio_path: 音声ファイルのパス（分離済みドラム）
            tempo: テンポ（BPM）- クオンタイズ用
            offset: 第1拍の絶対時刻（秒）

        Returns:
            {
                "success": True/False,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {
                "success": False,
                "notes": [],
                "error": f"Audio file not found: {audio_path}",
            }

        try:
            _ensure_audio_libs()
            logger.debug(f"[Librosa] Loading drum audio: {audio_file}")
            # Demucs 出力は 44100 Hz。sr=44100 で読み込んで高周波数を正確に捉える。
            drum_sr = 44100
            drum_hop = 512
            y, sr = librosa.load(str(audio_file), sr=drum_sr, mono=True)
            logger.debug(
                f"[Librosa] Drum audio loaded: {len(y)} samples, "
                f"sr={sr}, duration={len(y)/sr:.1f}s"
            )

            if len(y) == 0:
                return {
                    "success": False,
                    "notes": [],
                    "error": "Audio file is empty",
                }

            # テンポ連動 dedup 閾値を事前計算
            if tempo and tempo > 0:
                beat_duration = 60.0 / tempo
                grid = beat_duration * 0.25        # 16分音符長
                tempo_dedup = dedup_threshold_for_tempo(tempo)
            else:
                beat_duration = None
                grid = None
                tempo_dedup = 0.02                 # テンポ未知は固定 20ms

            # ステップ2: 各帯域でオンセット検出し、ステップ3/4 で dedup・quantize する
            band_times: dict[str, list[float]] = {}
            for band_name in _DRUM_PRIORITY:
                logger.debug(f"[Librosa] Detecting onsets for band: {band_name}")
                raw_times = self._detect_band_onsets(y, sr, band_name, hop=drum_hop)

                # ステップ3: 帯域内重複除去
                # dedup 閾値は「帯域ごとのベース閾値」と「テンポ連動閾値」の大きい方を使う。
                # hihat はベース閾値 0.025s を下限に保ち連続発火を間引く（過剰検出抑制）。
                band_base = _DEDUP_BASE_THRESHOLD_BY_BAND.get(band_name, 0.010)
                effective_dedup = max(band_base, tempo_dedup)
                detected_in_band: dict[float, str] = {}
                deduped: list[float] = []
                for t in raw_times:
                    if not is_duplicate_onset(float(t), detected_in_band, threshold=effective_dedup):
                        deduped.append(float(t))
                        detected_in_band[float(t)] = band_name

                # ステップ4: クオンタイズ（quantize_to_grid 純関数を使用）
                # 正しい原点: offset 起点でスナップし offset を足し戻す
                # これにより apply_offset_to_notes(offset を引く) 後のノートが
                # grid の整数倍になる（拍グリッドとの整合を保証）
                if beat_duration is not None and grid is not None:
                    quantized = [
                        quantize_to_grid(float(t), grid=grid, offset=offset)
                        for t in deduped
                    ]
                else:
                    quantized = deduped

                # ステップ4.5: 種別ごとの最小音楽的間隔フィルタ
                # onset_detect + dedup の後に、楽器として非現実的な速さの連打を除外する。
                # 最小間隔 = beat_duration * _MIN_INTERVAL_BY_BEAT_FACTOR[band]
                # テンポ不明時はこのフィルタをスキップする（beat_durationが必要）。
                if beat_duration is not None:
                    beat_factor = _MIN_INTERVAL_BY_BEAT_FACTOR.get(band_name, 0.25)
                    min_interval = beat_duration * beat_factor
                    filtered: list[float] = []
                    last_accepted = -999.0
                    for t in sorted(quantized):
                        if t - last_accepted >= min_interval:
                            filtered.append(t)
                            last_accepted = t
                    band_times[band_name] = filtered
                else:
                    band_times[band_name] = quantized

                logger.debug(
                    f"[Librosa] Band {band_name}: raw={len(raw_times)}, "
                    f"deduped={len(deduped)}, quantized={len(quantized)}, "
                    f"filtered={len(band_times[band_name])}, "
                    f"dedup_threshold={effective_dedup:.3f}s"
                )

            # ステップ5: merge_band_onsets で統合（同時打ちを両方残す）
            merged = merge_band_onsets(band_times)
            logger.debug(f"[Librosa] Merged total: {len(merged)} events")

            # hihat 帯域のための y_hihat（ステップ6 の decay 計算に使用）
            y_hihat = self._bandpass_filter(y, sr, 6000, 15000)

            # ステップ6: hihat の open/close 再判定 + ステップ7: ノート化
            # ベロシティのドラム種別マップ（既行と同じ）
            velocity_map = {
                "kick": 100, "snare": 95, "hihat_closed": 80, "hihat_open": 75,
                "tom_high": 90, "tom_mid": 90, "tom_low": 90,
                "crash": 85, "ride": 80,
            }
            notes = []
            for event in merged:
                t = event["time"]
                drum_type = event["drum_type"]

                # hihat は decay で open/close を再判定する
                if drum_type == "hihat_closed":
                    decay = self._get_decay_time(y_hihat, sr, t)
                    drum_type = self._classify_hihat_open_close(decay)

                vel = velocity_map.get(drum_type, 80)
                notes.append(self._create_drum_note(drum_type, t, velocity=vel))

            # ステップ8: start 昇順ソート
            notes.sort(key=lambda n: n["start"])

            # 統計ログ
            drum_counts: dict[str, int] = {}
            for note in notes:
                pitch = note["pitch"]
                drum_name_list = [k for k, v in self.drum_map.items() if v == pitch]
                drum_name_str = drum_name_list[0] if drum_name_list else str(pitch)
                drum_counts[drum_name_str] = drum_counts.get(drum_name_str, 0) + 1
            logger.info(f"[Librosa] Drum summary: {drum_counts}")
            logger.info(f"[Librosa] Total drum events: {len(notes)}")

            # ステップ8 続き: offset 補正（第1拍を原点に揃える）
            # quantize で offset を足し戻した絶対時刻に対し、ここで再び offset を引く（現行踏襲）
            if offset != 0.0:
                notes = apply_offset_to_notes(notes, offset)

            return {
                "success": True,
                "notes": notes,
                "error": None,
            }

        except Exception as e:
            logger.error(f"[Librosa] Drums error: {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "notes": [],
                "error": f"Drum detection failed: {str(e)}",
            }

    def _bandpass_filter(self, y: np.ndarray, sr: int, low: float, high: float) -> np.ndarray:
        """バンドパスフィルタを適用（SOS形式で数値安定性を確保）"""
        nyquist = sr / 2
        low_norm = max(low / nyquist, 0.001)
        high_norm = min(high / nyquist, 0.999)
        if low_norm >= high_norm:
            return y
        # SOS形式を使用（低周波数で数値的に安定）
        sos = signal.butter(4, [low_norm, high_norm], btype='band', output='sos')
        return signal.sosfiltfilt(sos, y)

    def _create_drum_note(self, drum_type: str, time: float, velocity: int = 100) -> dict:
        """ドラムノートを生成"""
        return {
            "pitch": self.drum_map[drum_type],
            "start": round(time, 3),
            "end": round(time + 0.05, 3),
            "velocity": velocity,
        }

    def _get_energy_at_time(self, y: np.ndarray, sr: int, time: float) -> float:
        """指定時刻のRMSエネルギーを取得"""
        start_sample = int(time * sr)
        end_sample = min(start_sample + int(sr * 0.03), len(y))  # 30ms窓
        if start_sample >= len(y):
            return 0.0
        segment = y[start_sample:end_sample]
        if len(segment) == 0:
            return 0.0
        return float(np.sqrt(np.mean(segment ** 2)))

    def _get_spectral_centroid_at_time(self, y: np.ndarray, sr: int, time: float) -> float:
        """指定時刻のスペクトル重心を取得"""
        start_sample = int(time * sr)
        end_sample = min(start_sample + 2048, len(y))
        if start_sample >= len(y):
            return 200.0
        segment = y[start_sample:end_sample]
        if len(segment) < 512:
            return 200.0
        centroid = librosa.feature.spectral_centroid(y=segment, sr=sr)
        return float(centroid.mean())

    def _get_decay_time(self, y: np.ndarray, sr: int, time: float) -> float:
        """減衰時間を推定（オープン/クローズドハイハット判定用）"""
        start_sample = int(time * sr)
        window_size = int(sr * 0.2)  # 200ms window
        end_sample = min(start_sample + window_size, len(y))
        if start_sample >= len(y):
            return 0.0
        segment = y[start_sample:end_sample]
        if len(segment) < 100:
            return 0.0
        # RMSエンベロープを計算
        frame_length = 512
        hop_length = 128
        rms = librosa.feature.rms(y=segment, frame_length=frame_length, hop_length=hop_length)[0]
        if len(rms) < 2:
            return 0.0
        # ピークから-6dBになるまでの時間
        peak_idx = np.argmax(rms)
        peak_val = rms[peak_idx]
        threshold = peak_val * 0.5  # -6dB
        for i in range(peak_idx, len(rms)):
            if rms[i] < threshold:
                return (i - peak_idx) * hop_length / sr
        return 0.15  # 減衰しない場合はオープンと判定


# シングルトンインスタンス
_librosa_transcriber: Optional[LibrosaTranscriber] = None


def get_librosa_transcriber() -> LibrosaTranscriber:
    """LibrosaTranscriberのシングルトンを取得"""
    global _librosa_transcriber
    if _librosa_transcriber is None:
        _librosa_transcriber = LibrosaTranscriber()
    return _librosa_transcriber
