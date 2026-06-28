"""
Basic Pitch サービス

Spotify's Basic Pitch を使用した高精度オーディオ→MIDI変換
+ librosaによるテンポ検出
+ 信頼度フィルタリング
+ ビートクオンタイズ
"""
import logging
from pathlib import Path
from typing import Optional
import numpy as np

from app.models import TranscriptionResult

logger = logging.getLogger(__name__)

# basic-pitch / librosa / scipy は import が重く、純粋ロジック（quantize_time /
# merge_notes / _normalize_drum_pitch 等）のテストには不要なため遅延 import する。
# 実際に音声を変換するメソッドの冒頭で _ensure_basic_pitch() / _ensure_librosa() を呼ぶ。
predict = None
ICASSP_2022_MODEL_PATH = None
librosa = None


def limit_polyphony(notes: list[dict], max_polyphony: int) -> list[dict]:
    """同時発音数を max_polyphony 音までに制限する（純関数）

    Basic Pitch は和音stem やノイズから過剰なノートを出すことがあり、
    同時に多数の音が鳴ると「意味のわからない音の塊」に聞こえる。
    各時刻で同時に鳴っているノートが上限を超える場合、velocity（強さ）の
    高い順に上限数だけ残し、弱いノートを捨てる。

    Args:
        notes: ノートのリスト（{"pitch","start","end","velocity",...}）
        max_polyphony: 同時に鳴らしてよい最大ノート数（1以上）

    Returns:
        同時発音数が上限以下に制限されたノートのリスト（start昇順）
    """
    if not notes or max_polyphony < 1:
        return list(notes)

    # 開始が早い順、同時なら velocity 強い順で処理する（強い音を優先的に残す）
    ordered = sorted(notes, key=lambda n: (n["start"], -n.get("velocity", 0)))
    kept: list[dict] = []
    for note in ordered:
        # この音の区間に重なって既に採用済みのノート数を数える
        overlap = [
            k for k in kept
            if k["start"] < note["end"] and note["start"] < k["end"]
        ]
        if len(overlap) < max_polyphony:
            kept.append(note)
            continue
        # 上限に達している場合、重なりの中で最も弱い音より強ければ置き換える
        weakest = min(overlap, key=lambda k: k.get("velocity", 0))
        if note.get("velocity", 0) > weakest.get("velocity", 0):
            kept.remove(weakest)
            kept.append(note)

    kept.sort(key=lambda n: n["start"])
    return kept


def select_melody_line(notes: list[dict]) -> list[dict]:
    """ポリフォニックなノート列から単旋律（スカイライン）を取り出す（純関数）

    各時刻で最も高いピッチの音だけを残し、単音のメロディラインにする。
    和音の塊を「メロディ」として鳴らすと旋律に聞こえないため、
    最高音を旋律とみなす一般的な skyline 法を用いる。

    Args:
        notes: ノートのリスト（{"pitch","start","end",...}）

    Returns:
        同時に2音以上鳴らない単旋律のノートリスト（start昇順）
    """
    if not notes:
        return []

    # 開始が早い順、同時なら高音優先で処理
    ordered = sorted(notes, key=lambda n: (n["start"], -n["pitch"]))
    melody: list[dict] = []
    for note in ordered:
        note = dict(note)  # 元を壊さない
        if not melody:
            melody.append(note)
            continue
        prev = melody[-1]
        if note["start"] < prev["end"]:
            # 直前の音と重なる → 高い方を旋律として採用
            if note["pitch"] > prev["pitch"]:
                # 直前の音をこの音の開始で打ち切り、こちらを採用
                prev["end"] = min(prev["end"], note["start"])
                if prev["end"] <= prev["start"]:
                    melody.pop()  # 長さが消えた直前音は捨てる
                melody.append(note)
            # 低い／同じなら無視（最高音を優先）
        else:
            melody.append(note)

    # 長さが0以下になったノートを除外し、start昇順で返す
    melody = [n for n in melody if n["end"] > n["start"]]
    melody.sort(key=lambda n: n["start"])
    return melody


def to_monophonic_bass(notes: list[dict]) -> list[dict]:
    """ベースを「穴の無い」単旋律に整える（純関数）

    ベースは単音楽器。重なりを velocity で削除すると音が消えて「ブツ切り」に
    聞こえるため、削除せず以下で単音化する:
      - 同時に始まる重なりは最低音(ルート)を残す
      - 部分的な重なりは、直前の音を次の音の開始時刻まで縮めて連続させる
    これにより同時発音は1以下になりつつ、不要な無音(穴)を作らない。

    Args:
        notes: ノートのリスト（{"pitch","start","end",...}）

    Returns:
        同時発音1以下のベースノートリスト（start昇順）
    """
    if not notes:
        return []

    # 開始が早い順、同時なら低音(ルート)優先で処理する
    ordered = sorted(notes, key=lambda n: (n["start"], n["pitch"]))
    result: list[dict] = []
    for note in ordered:
        note = dict(note)  # 元を壊さない
        if not result:
            result.append(note)
            continue
        prev = result[-1]
        if note["start"] < prev["start"] + 1e-9:
            # ほぼ同時開始 → 低音(ルート)を残す。既存(prev)は ordered 上で低音側。
            # note は prev 以上の音高なので捨てる（prev の長さは保持）。
            continue
        if note["start"] < prev["end"]:
            # 部分的な重なり → 直前音を次音の開始まで縮めて連続させる（削除しない）
            prev["end"] = note["start"]
            if prev["end"] <= prev["start"]:
                # 長さが消えた直前音は捨てる（次音が即始まる場合）
                result.pop()
        result.append(note)

    result = [n for n in result if n["end"] > n["start"]]
    result.sort(key=lambda n: n["start"])
    return result


def _ensure_basic_pitch() -> None:
    """Basic Pitch（predict / モデルパス）を遅延 import する"""
    global predict, ICASSP_2022_MODEL_PATH
    if predict is None:
        # scipy互換性修正（scipy.signal.gaussian → scipy.signal.windows.gaussian）
        # https://github.com/spotify/basic-pitch/issues/120
        import scipy.signal
        import scipy.signal.windows
        if not hasattr(scipy.signal, 'gaussian'):
            scipy.signal.gaussian = scipy.signal.windows.gaussian

        from basic_pitch.inference import predict as _predict
        from basic_pitch import ICASSP_2022_MODEL_PATH as _model_path
        predict = _predict
        ICASSP_2022_MODEL_PATH = _model_path
        logger.info(f"[BasicPitch] Model path: {ICASSP_2022_MODEL_PATH}")


def _ensure_librosa() -> None:
    """librosa（テンポ検出用）を遅延 import する"""
    global librosa
    if librosa is None:
        import librosa as _librosa
        librosa = _librosa


class BasicPitchService:
    """Basic Pitch による音声→MIDI変換 + テンポ検出 + クオンタイズ"""

    def __init__(self):
        """初期化（モデルはpredict時に自動ロード）"""
        # モデルパスは実際に変換するとき _ensure_model() で遅延解決する
        self.model_path = None
        # 信頼度しきい値（これ以下のノートは除外）
        self.confidence_threshold = 0.25  # 0.3→0.25 ノートを拾いやすく
        # クオンタイズ解像度（16分音符 = 0.25拍）
        self.quantize_resolution = 0.25  # 0.5→0.25 精度UP
        # ノートマージ用の最大ギャップ（秒）
        self.merge_gap_threshold = 0.15  # 0.1→0.15 ぶつ切り軽減
        # 無音stem判定のRMSしきい値。
        # 実測: 鳴っている stem は RMS≈0.02〜0.22、ほぼ無音の piano stem は RMS≈0.001。
        # 0.005 未満なら「実質無音」とみなしノートを出さない（ノイズの音程化を防ぐ）。
        self.silence_rms_threshold = 0.005

    def _ensure_model(self) -> None:
        """Basic Pitch モデルパスを遅延解決する（初回の変換時に呼ばれる）"""
        _ensure_basic_pitch()
        if self.model_path is None:
            self.model_path = ICASSP_2022_MODEL_PATH

    def detect_tempo(self, audio_path: str) -> tuple[float, np.ndarray]:
        """
        テンポとビート位置を検出する後方互換 thin-wrapper

        ⚠️ 後方互換ラッパ: 実処理は LibrosaTranscriber.detect_tempo に委譲済み。
        既存テスト（test_timing_and_drum_fixes.py::TestTempoFloatPassthrough）が
        (float, ndarray) タプルに依存するためシグネチャは変更しない。
        float のまま返し round() はしない（BPM を float で貫通させる）。

        Returns:
            (tempo, beat_times): テンポ(BPM: float)とビート位置の配列
        """
        try:
            from app.services.librosa_transcriber import get_librosa_transcriber
            tempo_info = get_librosa_transcriber().detect_tempo(audio_path)
            return tempo_info.tempo, np.array(tempo_info.beat_times)
        except Exception as e:
            logger.warning(f"[BasicPitch] Tempo detection failed: {e}")
            return 120.0, np.array([])

    def quantize_time(self, time: float, tempo: float, resolution: float = 0.5) -> float:
        """
        時間をビートグリッドにクオンタイズ

        Args:
            time: 元の時間（秒）
            tempo: テンポ（BPM）
            resolution: クオンタイズ解像度（拍単位、0.5=8分音符）

        Returns:
            クオンタイズされた時間（秒）
        """
        beat_duration = 60.0 / tempo  # 1拍の長さ（秒）
        grid_duration = beat_duration * resolution  # グリッド単位の長さ
        # 最も近いグリッドにスナップ（float 精度を維持。int/round による丸めをしない）
        quantized = round(time / grid_duration) * grid_duration
        return quantized

    def merge_notes(self, notes: list[dict], gap_threshold: float = 0.1) -> list[dict]:
        """
        同じピッチの隣接ノートをマージしてぶつ切りを解消

        Args:
            notes: ノートのリスト（開始時間順にソート済み）
            gap_threshold: マージする最大ギャップ（秒）

        Returns:
            マージされたノートのリスト
        """
        if not notes:
            return []

        # ピッチごとにグループ化
        pitch_groups: dict[int, list[dict]] = {}
        for note in notes:
            pitch = note["pitch"]
            if pitch not in pitch_groups:
                pitch_groups[pitch] = []
            pitch_groups[pitch].append(note)

        merged_notes = []

        for pitch, group in pitch_groups.items():
            # 開始時間順にソート
            group.sort(key=lambda n: n["start"])

            current_note = None
            for note in group:
                if current_note is None:
                    current_note = note.copy()
                else:
                    # 前のノートの終了と現在のノートの開始のギャップをチェック
                    gap = note["start"] - current_note["end"]

                    if gap <= gap_threshold:
                        # マージ: 終了時間を延長、ベロシティは平均
                        current_note["end"] = note["end"]
                        current_note["velocity"] = (current_note["velocity"] + note["velocity"]) // 2
                        if "confidence" in note and "confidence" in current_note:
                            current_note["confidence"] = max(current_note["confidence"], note["confidence"])
                    else:
                        # ギャップが大きいので別ノートとして保存
                        merged_notes.append(current_note)
                        current_note = note.copy()

            # 最後のノートを追加
            if current_note:
                merged_notes.append(current_note)

        # 開始時間順にソート
        merged_notes.sort(key=lambda n: n["start"])
        return merged_notes

    def transcribe_audio(self, audio_path: str, quantize: bool = True, offset: float = 0.0) -> dict:
        """
        音声ファイルからノート情報を抽出

        Args:
            audio_path: 音声ファイルのパス
            quantize: ビートグリッドにクオンタイズするか
            offset: 第1拍のオフセット（秒）。クオンタイズ前に各ノートの時刻から差し引く。
                    TempoInfo.offset を渡すことでノート先頭をグリッド原点に揃える（原因3対策）。

        Returns:
            {
                "success": True/False,
                "tempo": テンポ（BPM）- librosaで検出,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Audio file not found: {audio_path}",
            }

        file_size = audio_file.stat().st_size
        if file_size == 0:
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": "Audio file is empty",
            }

        try:
            # 1. テンポ検出（librosa）
            tempo, beat_times = self.detect_tempo(str(audio_file))
            logger.info(f"[BasicPitch] Detected tempo: {tempo:.1f} BPM")

            # 2. Basic Pitch で推論
            self._ensure_model()
            model_output, midi_data, note_events = predict(
                str(audio_file),
                model_or_model_path=self.model_path,
            )

            # 3. note_events を変換 + 信頼度フィルタリング
            # note_events: List of (start_time, end_time, pitch, velocity, [confidence])
            notes = []
            filtered_count = 0

            for event in note_events:
                start_time = float(event[0])
                end_time = float(event[1])
                pitch = int(event[2])
                velocity = float(event[3])  # 0-1

                # 信頼度（velocity）でフィルタリング
                if velocity < self.confidence_threshold:
                    filtered_count += 1
                    continue

                # オフセット補正（第1拍を原点に揃える）→ クオンタイズ前に適用する
                if offset != 0.0:
                    from app.services.librosa_transcriber import apply_offset as _apply_offset
                    start_time = _apply_offset(start_time, offset)
                    end_time = _apply_offset(end_time, offset)

                # クオンタイズ
                if quantize and tempo > 0:
                    start_time = self.quantize_time(start_time, tempo, self.quantize_resolution)
                    end_time = self.quantize_time(end_time, tempo, self.quantize_resolution)
                    # 最小ノート長を確保（16分音符）
                    min_length = 60.0 / tempo * self.quantize_resolution
                    if end_time <= start_time:
                        end_time = start_time + min_length

                notes.append({
                    "pitch": pitch,
                    "start": round(start_time, 3),
                    "end": round(end_time, 3),
                    "velocity": min(127, max(1, int(velocity * 127))),
                    "confidence": round(velocity, 2),  # 信頼度も保存
                })

            # 開始時間順にソート
            notes.sort(key=lambda n: n["start"])

            # ぶつ切りノートをマージ
            original_count = len(notes)
            notes = self.merge_notes(notes, gap_threshold=self.merge_gap_threshold)

            logger.info(f"[BasicPitch] Transcribed {len(notes)} notes (filtered {filtered_count}, merged {original_count - len(notes)})")

            return {
                "success": True,
                # float で貫通させる（round() しない。フロントは number 型で問題なし）
                "tempo": float(tempo),
                "notes": notes,
                "error": None,
            }

        except Exception as e:
            logger.error(f"[BasicPitch] Error: {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Basic Pitch transcription failed: {str(e)}",
            }

    def transcribe_track(self, audio_path: str, track_type: str, tempo: float = None, offset: float = 0.0) -> dict:
        """
        楽器別にトラックをMIDI変換

        Args:
            audio_path: 分離された音声ファイルのパス
            track_type: トラック種別（"drums", "bass", "other", "vocals"）
            tempo: テンポ（BPM）- Noneの場合は検出する

        Returns:
            {
                "success": True/False,
                "tempo": テンポ（BPM）,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        # vocals は melody として処理（ボーカルメロディをピアノで表示）

        audio_file = Path(audio_path)
        if not audio_file.exists():
            # 戻り値の契約は TranscriptionResult で型保証する（consumer は dict のまま）
            return TranscriptionResult(
                success=False,
                tempo=None,
                notes=[],
                error=f"Audio file not found: {audio_path}",
            ).to_dict()

        file_size = audio_file.stat().st_size
        if file_size == 0:
            return TranscriptionResult(
                success=False,
                tempo=None,
                notes=[],
                error=f"Audio file is empty: {track_type}",
            ).to_dict()

        try:
            # 無音に近い stem ガード:
            # htdemucs_6s は曲によって piano など特定 stem をほぼ無音で出す。
            # 無音stem を Basic Pitch にかけるとノイズを音程化した「意味のない音」が
            # 大量に出る（ユーザーが報告した症状）。RMS が極小なら空ノートを返す。
            if self._stem_is_silent(str(audio_file)):
                logger.info(f"[BasicPitch] {track_type}: 無音stemのためスキップ（notes=0）")
                return TranscriptionResult(
                    success=True, tempo=float(tempo) if tempo else None,
                    notes=[], error=None,
                ).to_dict()

            # テンポが未検出なら検出
            if tempo is None:
                tempo, _ = self.detect_tempo(str(audio_file))

            # 楽器別パラメータ設定
            params = self._get_track_params(track_type)

            self._ensure_model()
            model_output, midi_data, note_events = predict(
                str(audio_file),
                model_or_model_path=self.model_path,
                onset_threshold=params["onset_threshold"],
                frame_threshold=params["frame_threshold"],
                minimum_note_length=params["min_note_length"],
                minimum_frequency=params.get("min_freq"),
                maximum_frequency=params.get("max_freq"),
            )

            # note_events を変換 + 信頼度フィルタリング
            notes = []
            filtered_count = 0

            for event in note_events:
                start_time = float(event[0])
                end_time = float(event[1])
                pitch = int(event[2])
                velocity = float(event[3])  # 0-1

                # 信頼度フィルタリング（楽器別しきい値）
                if velocity < params["confidence_threshold"]:
                    filtered_count += 1
                    continue

                # ドラムは短いノートに（打楽器なので）
                if track_type == "drums":
                    end_time = min(end_time, start_time + 0.05)
                    # ドラムノートをGM Drumマップに正規化
                    pitch = self._normalize_drum_pitch(pitch)

                # クオンタイズ
                if tempo > 0:
                    resolution = 0.125 if track_type == "drums" else 0.25  # ドラムは32分音符
                    start_time = self.quantize_time(start_time, tempo, resolution)
                    if track_type != "drums":
                        end_time = self.quantize_time(end_time, tempo, resolution)
                        min_length = 60.0 / tempo * resolution
                        if end_time <= start_time:
                            end_time = start_time + min_length

                notes.append({
                    "pitch": pitch,
                    "start": round(start_time, 3),
                    "end": round(end_time, 3),
                    "velocity": min(127, max(1, int(velocity * 127))),
                    "confidence": round(velocity, 2),
                })

            # 開始時間順にソート
            notes.sort(key=lambda n: n["start"])

            # ドラム以外はノートをマージ（ドラムは短いヒットなのでマージしない）
            if track_type != "drums":
                original_count = len(notes)
                notes = self.merge_notes(notes, gap_threshold=self.merge_gap_threshold)
                # 同時発音数を制限して「音の塊」を減らす（和音stemの過剰ノート対策）。
                # 和音楽器(guitar/piano/other)はやや多めを許容。
                # bass は単音楽器だが limit_polyphony で削ると「ブツ切り」になるため、
                # 削除せず重なりを縮めて連続させる to_monophonic_bass を使う。
                if track_type == "bass":
                    notes = to_monophonic_bass(notes)
                else:
                    max_poly = params.get("max_polyphony")
                    if max_poly:
                        notes = limit_polyphony(notes, max_poly)
                logger.info(
                    f"[BasicPitch] {track_type}: {len(notes)} notes "
                    f"(filtered {filtered_count}, merged {original_count - len(notes)})"
                )
            else:
                logger.info(f"[BasicPitch] {track_type}: {len(notes)} notes (filtered {filtered_count})")

            # オフセット補正（第1拍を原点に揃える）
            if offset != 0.0:
                from app.services.librosa_transcriber import apply_offset_to_notes
                notes = apply_offset_to_notes(notes, offset)

            return TranscriptionResult(
                success=True,
                # float で貫通させる（round() しない）
                tempo=float(tempo) if tempo else None,
                notes=notes,
                error=None,
            ).to_dict()

        except Exception as e:
            logger.error(f"[BasicPitch] {track_type} Error: {type(e).__name__}: {str(e)}")
            return TranscriptionResult(
                success=False,
                tempo=None,
                notes=[],
                error=f"Track transcription failed: {str(e)}",
            ).to_dict()

    def _stem_is_silent(self, audio_path: str) -> bool:
        """stem がほぼ無音か（RMS がしきい値未満か）を判定する

        soundfile で軽量に読み込み、全体RMSを計算する。
        ほぼ無音の stem に Basic Pitch をかけるとノイズを音程化した
        ゴミノートが大量に出るため、その前段で弾く。
        """
        try:
            import soundfile as sf
            import numpy as np
            y, _ = sf.read(audio_path)
            if y.ndim > 1:
                y = y.mean(axis=1)
            if y.size == 0:
                return True
            rms = float(np.sqrt(np.mean(np.square(y))))
            return rms < self.silence_rms_threshold
        except Exception:
            # 読めない場合は無音扱いにせず、通常経路に委ねる
            return False

    def _get_track_params(self, track_type: str) -> dict:
        """楽器別のパラメータを取得（感度UP調整済み）"""
        params = {
            "drums": {
                # ドラムもBasic Pitchで変換する（下流で_normalize_drum_pitch / resolution=0.125を適用）
                # 打楽器は音程が曖昧でBasic Pitchの信頼度（velocity）が低く出るため、
                # しきい値0.8では全ノートが除外され0件になる。0.3まで下げてヒットを拾う。
                "onset_threshold": 0.5,
                "frame_threshold": 0.5,
                "min_note_length": 50,
                "confidence_threshold": 0.3,
                "min_freq": None,
                "max_freq": None,
            },
            "bass": {
                "onset_threshold": 0.4,       # 0.3→0.4 弱い倍音由来の過剰ノートを抑制
                "frame_threshold": 0.3,       # 0.25→0.3 持続音の途切れと過検出のバランス
                "min_note_length": 80,        # 50→80ms ぶつ切り・ゴーストノート低減
                "confidence_threshold": 0.4,  # 0.3→0.4 低信頼ノート（誤検出）を除外
                "min_freq": 41,   # E1（30Hzはサブオクターブ誤検出を生むため引き上げ）
                "max_freq": 350,  # F4あたり（ベース音域に限定）
                "max_polyphony": 1,  # ベースは単音楽器（ルート1音）
            },
            "other": {
                "onset_threshold": 0.4,       # 0.35→0.4 和音の過剰ノートをさらに抑制
                "frame_threshold": 0.4,       # 0.3→0.4 持続音の過検出（残響のゴミ）を抑制
                "min_note_length": 80,        # 70→80ms 細かすぎるゴーストノート低減
                "confidence_threshold": 0.45, # 0.4→0.45 弱い誤検出を除外
                "min_freq": 80,   # E2あたり
                "max_freq": 2000, # B6あたり
                "max_polyphony": 4,  # 伴奏の和音は最大4音まで
            },
            # vocals は magenta側で librosa pyin（単音抽出）に切替済み。
            # このパラメータは Basic Pitch 経由（transcribe_track単体）の互換用に残す。
            "vocals": {
                "onset_threshold": 0.3,       # 0.4→0.3 感度UP
                "frame_threshold": 0.2,       # 0.3→0.2 持続音検出強化
                "min_note_length": 50,        # 100→50ms 細かいノートも拾う
                "confidence_threshold": 0.25, # 0.4→0.25 弱いメロディも拾う
                "min_freq": 150,  # D3あたり（ボーカル下限）
                "max_freq": 1000, # B5あたり（ボーカル上限）
            },
            # htdemucs_6s 追加 stem（設計書 A-1/_get_track_params）
            # guitar: E2(82Hz) 〜 E6(1319Hz) 程度のギター音域
            "guitar": {
                "onset_threshold": 0.4,       # 0.35→0.4 ストロークの過剰ノートを抑制
                "frame_threshold": 0.4,       # 0.3→0.4 持続音の過検出（ノイズ）を抑制
                "min_note_length": 80,        # 70→80ms ゴーストノート低減
                "confidence_threshold": 0.45, # 0.4→0.45 弱い誤検出を除外
                "min_freq": 82,   # E2（ギター最低音）
                "max_freq": 1400, # ギター最高音近辺
                "max_polyphony": 4,  # ギター和音は最大4音（過剰な同時発音を抑える）
            },
            # piano: A0(27Hz) 〜 C8(4186Hz) のピアノ音域
            # ただし実際の楽曲では中音域中心なので絞る
            "piano": {
                "onset_threshold": 0.4,       # 0.35→0.4 和音の過剰ノートを抑制
                "frame_threshold": 0.4,       # 0.3→0.4 残響由来の過検出を抑制
                "min_note_length": 80,        # 70→80ms 細かすぎるノート低減
                "confidence_threshold": 0.45, # 0.4→0.45 弱い誤検出を除外
                "min_freq": 80,   # E2付近（ピアノ低音実用下限）
                "max_freq": 2000, # ピアノ高音域（B6付近）
                "max_polyphony": 4,  # ピアノ和音は最大4音
            },
        }
        return params.get(track_type, params["other"])

    def _normalize_drum_pitch(self, pitch: int) -> int:
        """
        検出されたピッチをGM Drumマップに正規化

        GM Drum Map:
            35: Acoustic Bass Drum
            36: Bass Drum 1 (Kick)
            38: Acoustic Snare
            42: Closed Hi-Hat
            46: Open Hi-Hat
            49: Crash Cymbal 1
            51: Ride Cymbal 1
        """
        # 低いピッチはキック
        if pitch < 40:
            return 36  # Kick
        # 中間はスネアまたはタム
        elif pitch < 50:
            return 38  # Snare
        # 高いピッチはハイハット/シンバル
        elif pitch < 60:
            return 42  # Hi-Hat
        else:
            return 49  # Crash


# シングルトンインスタンス
_basic_pitch_service: Optional[BasicPitchService] = None


def get_basic_pitch_service() -> BasicPitchService:
    """BasicPitchServiceのシングルトンを取得"""
    global _basic_pitch_service
    if _basic_pitch_service is None:
        _basic_pitch_service = BasicPitchService()
    return _basic_pitch_service
