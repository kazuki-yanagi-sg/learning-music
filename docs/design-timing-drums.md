# 設計書: 楽曲解析の「タイミングずれ」「ドラムが取れない」修正

対象: `learning-music/backend`（FastAPI / pytest）＋一部 `learning-music/frontend`（Vitest）
作成: 設計屋。実コードで全原因を裏取り済み（指摘 `file:line` は現状コードと一致）。
方針: TDD（Red→Green→Refactor）。本ドキュメント単体で実装着手できるよう自己完結で記述する。

> ペアになるテスト仕様: `docs/test-spec-timing-drums.md`

---

## 0. 背景と確定した原因

楽曲解析（YouTube→yt-dlp→Demucs 4分離→各トラックMIDI化→tonal/コード認識→Gemini解説）で
2つの不具合が報告された。

- **タイミングずれ**: 再生位置とノート位置がずれる。曲が長いほど後半で累積する。
- **ドラムが取れない / 崩れる**: ドラムイベントが少ない、または全部同じ音（hihat_closed）になる。

### タイミングずれの原因（確定）

1. **librosa呼び出しの sr/hop_length 明示不足**
   - `basic_pitch_service.py:81` `detect_tempo` は `librosa.load(..., sr=22050)`、
     `librosa_transcriber.py:317` `extract_drums` は `sr=44100`。
   - 本質は「統一していないこと」ではなく、**Demucs出力(44100Hz)を librosa に渡すとき
     `sr` を明示しないとデフォルト22050仮定になり時間軸が2倍ずれる**点。
   - 対策は「全部44100に統一」ではなく、**各 librosa 呼び出し内で
     `librosa.load` のSRと `beat_track` / `onset_detect` / `frames_to_time` の
     `sr` / `hop_length` を同一値で明示すること**（Basic Pitch は内部で22050へ
     自動リサンプルするので bass/other の入力SRは不問）。
2. **半/倍BPM誤検出**: `librosa.beat.beat_track` がアニソン140-180BPM帯で
   半分/倍のBPMを誤検出しやすい。誤BPMで全ノートをクオンタイズ
   （`basic_pitch_service.py:229-234`）するため後半ほどズレが累積する。
   - 対策: `beat_track(start_bpm=150)`（公式パラメータ）で一次抑制 ＋
     後段 `normalize_tempo`(110-185帯への倍/半補正)で二次防御。
3. **第1拍オフセット未補正**: イントロ無音/フェードイン分の絶対オフセットが
   差し引かれていない。`beat_times[0]` を全ノートから引く補正が無い。
4. **BPMを整数に丸めてフロントへ渡す**: `magenta.py:275` 等で `round(tempo)`。
   一方クオンタイズは float BPM。描画グリッド(整数BPM)とノート位置(float BPM)が
   不一致になり長い曲でズレる。→ **BPMをfloatのまま貫通**させる。
5. （維持）コード抽出（`magenta.py:383-445`）は0.5秒固定ウィンドウのカレンダー時間
   ベースでBPM非依存。だからコードだけ正常だった。**この挙動は変更しない**。

### ドラムの原因（確定。既存librosa帯域分類の改良で対応。新規依存は入れない）

1. `librosa_transcriber.py:338` で分離済みdrumsトラックに
   `librosa.effects.percussive(y)` を**二重がけ**（Demucsで既にドラム分離済み）。
   アーティファクトでonsetが埋もれる → **除去**。
2. `librosa_transcriber.py:361-394` の帯域エネルギー比分類で、どのカテゴリにも
   当てはまらないヒットが**全部デフォルトの hihat_closed (pitch=42) に落ちる**(:393)。
   → 閾値見直し ＋ **デフォルト崩壊の解消**（最大エネルギー帯域で判定するフォールバック）。
3. `_is_duplicate` の重複除去 threshold=0.02秒固定（:344, :469-473）が
   速い連打を消す → **テンポ連動**に。

### 触らない（公式確認済み）

- Basic Pitch のタイミング定数（FFT_HOP=256, ANNOTATION_HOP≈0.011628秒,
  MAGIC_ALIGNMENT_OFFSET=0.0018秒）は有音程トラックのズレ主因ではない。**変更しない**。

---

## 1. 関連する現状コード（読むべき箇所）

| ファイル | 箇所 | 現状の責務 |
| --- | --- | --- |
| `app/services/basic_pitch_service.py` | `detect_tempo`(72-90) | librosaでテンポ/ビート検出（sr=22050固定） |
| 〃 | `quantize_time`(92-108) | 時間をビートグリッドにスナップ |
| 〃 | `transcribe_audio`(165-267) | Basic Pitch全体変換。:255 で `round(tempo)` |
| 〃 | `transcribe_track`(269-390) | 楽器別変換。:342-345 ドラム分岐(dead), :378 `round(tempo)` |
| 〃 | `_get_track_params`(392-433) | 楽器別パラメータ（"drums"はdead） |
| 〃 | `_normalize_drum_pitch`(435-458) | dead（drumsはlibrosa経路） |
| `app/services/librosa_transcriber.py` | `extract_melody`(57-132) | pyin単音抽出（sr=22050） |
| 〃 | `extract_drums`(283-426) | 帯域分類ドラム検出（sr=44100）。:338 percussive二重がけ, :361-394 分類, :344 dedup |
| 〃 | `_detect_band_onsets`(439-458) | onset検出+クオンタイズ |
| 〃 | `_is_duplicate`(469-474) | 重複判定（threshold固定） |
| `app/services/magenta.py` | `audio_to_4tracks`(202-292) | テンポ検出→Demucs→各トラック変換。:275 `round(tempo)` |
| 〃 | `audio_to_midi`(36-100) | 単一変換。:77 default 120(int) |
| 〃 | `extract_chords_from_notes`(383-445) | コード抽出（BPM非依存。**維持**） |
| `app/routers/song_analysis.py` | `AnalysisResult`(110-126) | `tempo: Optional[int]` |
| 〃 | `FourTrackResult`(453-463) | `tempo: int = 120` |
| `app/models/transcription.py` | `TranscriptionResult` | 変換結果のpydanticモデル |
| `frontend/src/types/music.ts` | `bpm: number`(41) | 既に number（変更不要） |
| `frontend/src/services/songAnalysisApi.ts` | `tempo`(36,57) | 既に number（変更不要） |

---

## 2. 新インターフェース / モデル

### 2.1 TempoInfo（新規）— `app/models/transcription.py` に追記

テンポ検出の戻り値契約を型で明示する。**第1拍オフセットを含める**のがタイミング修正(原因3)の鍵。

```python
class TempoInfo(BaseModel):
    """テンポ検出の結果。

    Attributes:
        tempo: 検出テンポ（BPM）。float のまま保持し丸めない（原因2,4対策）。
        beat_times: ビート時刻（秒）のリスト。
        offset: 第1拍の絶対オフセット秒（beat_times[0]、無ければ 0.0）。
                クオンタイズ前にノート時刻から差し引く（原因3対策）。
    """
    tempo: float
    beat_times: list[float] = Field(default_factory=list)
    offset: float = 0.0
```

### 2.2 LibrosaTranscriber.detect_tempo（移設＋拡張）

`detect_tempo` は命名・責務的に `LibrosaTranscriber` へ移す（単一責任）。

```python
def detect_tempo(self, audio_path: str, start_bpm: float = 150.0) -> TempoInfo:
    """librosaでテンポ・ビート位置・第1拍オフセットを検出する。

    - librosa.load のSRと beat_track / frames_to_time の sr / hop_length を
      同一値で明示する（原因1対策。Demucs 44100入力でも時間軸がずれない）。
    - beat_track(start_bpm=start_bpm) でアニソン帯の半/倍誤検出を一次抑制（原因2）。
    - 検出 tempo に normalize_tempo を適用して110-185帯へ正規化（原因2の二次防御）。
    - beat_times[0] を offset として返す（原因3）。
    """
```

### 2.3 BasicPitchService.detect_tempo（後方互換 thin-wrapper）

既存呼び出し（`magenta.py:236`, `tests/services/test_magenta.py` のモック
`detect_tempo.return_value = (120.0, [])`）を壊さないため、署名 `(tempo, beat_times)` の
タプルを返す薄いラッパとして残す。内部は `LibrosaTranscriber.detect_tempo` に委譲し、
新ロジック（start_bpm / normalize / offset）はTranscriber側に集約する。

```python
def detect_tempo(self, audio_path: str) -> tuple[float, np.ndarray]:
    """後方互換ラッパ。新ロジックは LibrosaTranscriber.detect_tempo に集約。"""
    info = get_librosa_transcriber().detect_tempo(audio_path)
    return info.tempo, np.array(info.beat_times)
```

> magenta は将来 `TempoInfo` を直接使う形へ移行するのが望ましいが、本サイクルでは
> 「offset を使ってノート補正する」ために magenta が `LibrosaTranscriber.detect_tempo`
> を直接呼び `TempoInfo` を受ける形に変更する（2.6参照）。

### 2.4 純関数: normalize_tempo（新規）

重い依存なしでUnitテスト可能なモジュールレベル純関数として置く
（`librosa_transcriber.py` のモジュールトップ、または `app/services/tempo_utils.py` を新設）。

```python
def normalize_tempo(raw_bpm: float, target_low: float = 110.0, target_high: float = 185.0) -> float:
    """半/倍テンポをアニソン帯へ補正する。

    契約:
      - raw が [low, high] 内ならそのまま返す（境界は inclusive）。
      - raw < low: ×2 して帯域内なら採用。×2しても入らなければ raw のまま（最大1回）。
      - raw > high: ÷2 して帯域内なら採用。÷2しても入らなければ raw のまま（最大1回）。
      - raw <= 0（不正値）: 120.0 を返す。
    """
```

### 2.5 純関数: apply_offset（新規）

```python
def apply_offset(time: float, offset: float) -> float:
    """クオンタイズ前にノート時刻から第1拍オフセットを差し引く。負にはしない。"""
    return max(0.0, time - offset)
```

### 2.6 ドラム分類の純関数化: _classify_drum（切り出し）

`extract_drums` 内のインライン判定（:361-394）を純関数に切り出す（単一責任・テスト容易化）。
**デフォルト崩壊（全部 hihat_closed）を、最大エネルギー帯域による argmax フォールバックに置き換える。**

```python
def _classify_drum(
    self,
    r_low: float, r_mid: float, r_high: float, r_hihat: float,
    decay: float, centroid: float,
) -> str:
    """エネルギー比から drum_type を判定する。

    既存の閾値判定（hihat優勢→kick→snare→tom→kick）はそのまま順に評価し、
    どれにも当てはまらない場合は最大エネルギー帯域で決める（hihat_closed固定にしない）:
      argmax(r_low, r_mid, r_high+r_hihat) → kick / snare / hihat_closed
    戻り値は self.drum_map のキー文字列（"kick"/"snare"/"hihat_closed"/"hihat_open"/
    "tom_low"/"tom_mid"/"tom_high"）。
    """
```

---

## 3. before/after 責務（変更する関数）

| 関数 | before | after |
| --- | --- | --- |
| `LibrosaTranscriber.detect_tempo` | （存在しない。BasicPitch側にあった） | テンポ/ビート/オフセット検出。sr/hop明示、start_bpm、normalize適用。`TempoInfo`を返す |
| `BasicPitchService.detect_tempo` | librosaで検出、sr=22050固定、(tempo, beat_times)返す | Transcriberへ委譲する薄いラッパ（署名維持） |
| `BasicPitchService.transcribe_audio` | :255 `round(tempo)` | tempo を float のまま返す |
| `BasicPitchService.transcribe_track` | :378 `round(tempo)` | tempo を float のまま返す（ドラム分岐 dead は本サイクル温存） |
| `LibrosaTranscriber.extract_drums` | :338 percussive二重がけ、:361-394 インライン分類+hihat固定、:344 dedup 0.02固定 | percussive除去、`_classify_drum`へ委譲（argmaxフォールバック）、dedupテンポ連動。librosa呼び出しの sr/hop_length を同一値で明示 |
| `MagentaService.audio_to_4tracks` | :236 BasicPitch.detect_tempo、:275 `round(tempo)` | `LibrosaTranscriber.detect_tempo`を直接呼び`TempoInfo`受領、offsetを各トラックノート補正に渡す、tempo を float のまま返す |
| `MagentaService.audio_to_midi` | :77 default 120(int) | default 120.0、tempo を float のまま返す |
| `MagentaService.extract_chords_from_notes` | 0.5秒固定窓・BPM非依存 | **変更なし（維持）** |
| ルーター `AnalysisResult` / `FourTrackResult` | `tempo: int` | `tempo: float`（default 120.0） |

> **offsetの適用場所**: ノートのクオンタイズ前に `apply_offset(time, offset)` を通す。
> 有音程トラック（bass/other）は Basic Pitch の note_events のクオンタイズ前
> （`basic_pitch_service.py:228-230` 相当）、ドラムは `extract_drums` の
> onset クオンタイズ前に差し引く。offset を各変換器へ渡す経路を magenta が仲介する。
> 実装方針: `transcribe_track(..., offset: float = 0.0)` /
> `extract_drums(..., offset: float = 0.0)` のように offset 引数を追加し、
> magenta が `TempoInfo.offset` を渡す。

---

## 4. BPMを float で貫通させるデータフロー

```
[librosa.beat_track raw bpm: float]
        │ start_bpm=150
        ▼
[normalize_tempo → tempo: float]  ← LibrosaTranscriber.detect_tempo
        │  TempoInfo{tempo, beat_times, offset}
        ▼
[MagentaService.audio_to_4tracks / audio_to_midi]
        │  tempo を round しない（原因4修正）。offset を各変換器へ渡す
        ▼
[transcribe_track / extract_drums]
        │  apply_offset → quantize_time（float tempo で計算）
        ▼
[ルーター AnalysisResult.tempo / FourTrackResult.tempo : float]
        ▼
[フロント songAnalysisApi tempo: number（float受領）]
        ▼
[PianoRoll: グリッド拍間隔とノート秒→x変換に "同一 float BPM変数" を使う]
        表示ラベルのみ Math.round（描画計算には使わない）
```

要点:
- round するのは**フロントの表示ラベルだけ**。グリッド計算・ノート位置計算・
  クオンタイズはすべて同一の float BPM を使う。
- フロントの型（`music.ts` `bpm: number`、`songAnalysisApi.ts` `tempo`）は既に number。
  **型変更は不要**。round を挟まないことだけ保証する。

---

## 5. 変更ファイル × 保護テスト 対応表

| 変更ファイル | 変更内容 | 保護するテスト（`docs/test-spec-timing-drums.md`参照） |
| --- | --- | --- |
| `app/models/transcription.py` | `TempoInfo` 追加 | `test_tempo_info_model` |
| `app/services/tempo_utils.py`（新規）または librosa_transcriber トップ | `normalize_tempo` / `apply_offset` | `test_tempo_normalize.py` / `test_offset_quantize.py` |
| `app/services/librosa_transcriber.py` | `detect_tempo`移設(start_bpm/sr・hop明示/normalize/offset)、`extract_drums`(percussive除去/`_classify_drum`/dedupテンポ連動/sr・hop整合)、`_classify_drum`切出し、offset引数追加 | `test_tempo_detection_integration.py`, `test_drum_classification.py`, `test_drum_dedup.py`, `test_drums_integration.py` |
| `app/services/basic_pitch_service.py` | `detect_tempo`を委譲ラッパ化、`round(tempo)`除去(255,378)、offset引数追加 | `test_transcriber_pure.py`(float grid追加), `test_magenta.py`(float追加) |
| `app/services/magenta.py` | tempo float保持、`TempoInfo`受領、offset配線、`round`除去(275,77) | `test_magenta.py`(float tempo追加), 既存 test_magenta 全件(回帰) |
| `app/routers/song_analysis.py` | `AnalysisResult.tempo`/`FourTrackResult.tempo` を float化 | `test_song_analysis.py`(float tempo追加) |
| `frontend/src/services/songAnalysisApi.ts` | round除去確認（型変更不要） | `songAnalysisApi.test.ts` |
| `frontend/src/components/PianoRoll/*` | グリッドとノートで同一floatBPM、表示のみround | `PianoRoll` grid test |

### dead code（本サイクルは温存。refactorerフェーズで除去）

監督承認済み: 機能修正と構造改変を混ぜない（振る舞い不変の検証を濁らせない）。
- `basic_pitch_service.py:342-345`（ドラム分岐）, `:349` の drums resolution分岐,
  `_normalize_drum_pitch`(435-458), `_get_track_params["drums"]` は
  magenta が drums を librosa 経路へ回すため実質 dead。
- 保護テスト: `test_transcriber_pure.py:66-82`(`_normalize_drum_pitch`),
  `test_magenta.py:356-362`(drums params skip無し)。
- **除去時はこれらテストも同時に削除/移動する**（refactorerタスクで実施→実験屋で検証）。

---

## 6. 実装順序（依存順 / Red→Green→Refactor）

1. **純関数群（重依存なし・最速で緑にできる）**
   - `normalize_tempo`（target 110-185, 倍/半は最大1回, raw<=0→120.0）→ `test_tempo_normalize.py`
   - `apply_offset` → `test_offset_quantize.py`
   - `_classify_drum`（切り出し＋argmaxフォールバック）→ `test_drum_classification.py`
   - dedupテンポ連動の閾値算出 → `test_drum_dedup.py`
2. **モデル拡張**: `TempoInfo` 追加 → `test_tempo_info_model`
3. **Transcriber統合**（2段階）
   - 3a. `detect_tempo` 移設 ＋ `start_bpm=150` ＋ beat_track/frames_to_time の
     sr/hop_length 明示 ＋ offset抽出
     → `test_beat_track_called_with_start_bpm`, `test_frames_to_time_uses_explicit_sr`,
       `test_detect_tempo_offset_captured`
   - 3b. `normalize_tempo` を detect_tempo の戻り tempo に適用
     → `test_detect_tempo_returns_anison_band`, `test_detect_tempo_half_tempo_corrected`
4. **extract_drums 改良**: percussive除去 ＋ `_classify_drum` 配線 ＋ dedup配線 ＋
   librosa呼び出しの sr/hop_length 整合 → `test_drums_integration.py`,
   `test_drum_librosa_calls_use_consistent_sr_hop`
5. **float データフロー**: basic_pitch_service の round除去 ＋ offset引数 →
   magenta の round除去/TempoInfo受領/offset配線 → ルーター型変更
   → `test_magenta.py`(float), `test_song_analysis.py`(float)
6. **フロント**: songAnalysisApi / PianoRoll の float統一 → Vitest
7. **（別フェーズ・refactorer）** dead code 除去 ＋ 保護テスト整理 → 実験屋で全テスト緑確認

依存は 1→7 で一方向。3でsr/hop明示(原因1)・offset(原因3)・start_bpm/normalize(原因2)を満たし、
5でfloat貫通(原因4)が完成する。

---

## 7. SOLID 観点メモ

- **S 単一責任**: テンポ検出は LibrosaTranscriber に集約。ドラム分類は `_classify_drum`、
  テンポ正規化/オフセットは純関数に分離。
- **O 開放閉鎖**: `normalize_tempo` の帯域・`detect_tempo` の `start_bpm` は引数化。
  ジャンルが変わっても呼び出し側パラメータで拡張でき、本体修正不要。
- **L リスコフ**: `BasicPitchService.detect_tempo` のラッパは既存タプル契約を厳守。
- **I インターフェース分離**: `TempoInfo` は tempo/beat_times/offset の最小構成。
- **D 依存性逆転**: 重い librosa は遅延 import を維持。純ロジックは重依存なしでテスト可能。
