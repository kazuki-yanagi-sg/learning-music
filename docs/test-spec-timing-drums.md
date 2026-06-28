# テスト仕様（TDD・先に書く失敗テスト）: タイミングずれ / ドラム修正

対象: `learning-music/backend`（pytest, テストは `backend/tests/`, 命名 `test_xxx.py`）
　　　＋ `learning-music/frontend`（Vitest, `frontend/tests/`, 命名 `xxx.test.ts(x)`）
方針: TDD。**まずこの仕様どおりに失敗するテストを書き（Red）、最小実装で通す（Green）、整える（Refactor）。**
ペア設計書: `docs/design-timing-drums.md`（責務分割・TempoInfo・データフロー・実装順序）

実行:
```
docker-compose exec backend pytest                       # 全件
docker-compose exec backend pytest -m "not integration"  # 純ロジックのみ（高速）
docker-compose exec backend pytest -m integration        # librosa実行（合成音）
docker-compose exec frontend npm run test
```

> 監督承認事項: ①dead code除去は別フェーズ（本サイクル温存） ②補正帯域 110-185
> ③librosa実行テストは `@pytest.mark.integration` で Unit と分離。
> `pytest.ini` / `pyproject.toml` に `markers = integration: ...` を登録すること。

---

## 0. 合成音フィクスチャ仕様 — `backend/tests/conftest.py` に追加

librosa は重いので、純ロジックUnitでは使わない。合成音Integrationテストでのみ使う。
生成は numpy で配列を作り `soundfile.write`（無ければ `scipy.io.wavfile.write`）で保存。

### make_click_track

```python
@pytest.fixture
def make_click_track(tmp_path):
    """既知BPM・既知オフセットのクリック列WAVを生成して返すファクトリ。

    使い方:
        path, bpm, onset_times = make_click_track(bpm=160, bars=8, sr=44100, lead_silence=0.0)

    仕様:
      - sr はデフォルト 44100（Demucs出力を模す）。
      - 4/4 拍として 1拍ごとにクリックを置く（bars*4 個）。
      - クリック = 5ms の指数減衰インパルス + 微小ホワイトノイズ
        （onset_strength が安定して反応する程度）。
      - lead_silence 秒の無音を先頭に付加（offset検出テスト用）。
      - 戻り: (wav_path: str, bpm: float, onset_times: list[float])
        onset_times は lead_silence を含む絶対時刻。
    """
```

### make_drum_pattern

```python
@pytest.fixture
def make_drum_pattern(tmp_path):
    """kick/snare/hihat を既知時刻に配置したドラムWAVを生成するファクトリ。

    使い方:
        path, expected = make_drum_pattern(sr=44100, events=[(0.0,"kick"),(0.25,"hihat"),...])

    各ドラムの合成:
      - kick  : 60Hz サイン 20ms（指数減衰、低域優勢）
      - snare : 200Hz サイン + 広帯域ホワイトノイズ 30ms（中域+スナッピー）
      - hihat : 8k-12kHz 帯域ノイズ 15ms（高域優勢、短い減衰）
    戻り: (wav_path: str, expected: list[tuple[float, str]])  # (time, drum_type)
    """
```

### make_sine_melody（任意・extract_melody回帰用、必要時のみ）

```python
@pytest.fixture
def make_sine_melody(tmp_path):
    """既知ピッチ・既知開始/終了のサイン波メロディWAV(sr=22050)を生成する。"""
```

---

## グループ1: 純関数 Unit（重依存なし・最初に緑にする）

### 1-1. `backend/tests/services/test_tempo_normalize.py`（新規）

対象: `normalize_tempo(raw_bpm, target_low=110.0, target_high=185.0) -> float`

| テスト名 | 入力 | 期待出力 |
| --- | --- | --- |
| `test_normalize_keeps_in_range` | 150.0 | 150.0 |
| `test_normalize_doubles_half_tempo` | 75.0 | 150.0（×2で帯域内） |
| `test_normalize_halves_double_tempo` | 320.0 | 160.0（÷2で帯域内） |
| `test_normalize_no_change_when_doubling_overshoots` | 100.0（target_low=110） | 100.0（×2=200>185で帯域外→元値） |
| `test_normalize_no_change_when_halving_undershoots` | 200.0（が帯域外だが ÷2=100<110） | 100.0 か 200.0 を**仕様確定**: ÷2して入らなければ元値 → 200.0 |
| `test_normalize_boundary_low_inclusive` | 110.0 | 110.0 |
| `test_normalize_boundary_high_inclusive` | 185.0 | 185.0 |
| `test_normalize_zero_falls_back` | 0.0 | 120.0 |
| `test_normalize_negative_falls_back` | -5.0 | 120.0 |

> 契約確定: 「×2/÷2は最大1回。補正後に帯域内なら採用、入らなければ元値を返す。raw<=0は120.0」。
> `test_normalize_no_change_when_doubling_overshoots` / `_when_halving_undershoots` が境界を固定する。

### 1-2. `backend/tests/services/test_offset_quantize.py`（新規）

対象: `apply_offset(time, offset) -> float`（必要に応じ `quantize_time` との合成も検証）

| テスト名 | 入力 | 期待出力 |
| --- | --- | --- |
| `test_apply_offset_subtracts` | time=2.05, offset=0.3 | 1.75 |
| `test_apply_offset_clamps_to_zero` | time=0.1, offset=0.3 | 0.0（負にしない） |
| `test_apply_offset_zero_offset_noop` | time=1.0, offset=0.0 | 1.0 |
| `test_first_note_aligns_near_zero` | offset補正→quantize_time を通した「曲先頭ノート」の start（例: 生start=1.03, offset=1.0, tempo=150） | `abs(start) <= grid`（grid=16分音符長=60/150*0.25=0.1）。第1拍が0付近に揃う |

### 1-3. `backend/tests/services/test_transcriber_pure.py`（既存に追加）

float BPM保持の保護。既存テストはそのまま残す。

| テスト名 | 入力 | 期待出力 |
| --- | --- | --- |
| `test_quantize_time_preserves_float_grid` | `quantize_time(0.33, 173.0)` | 173BPMの16分グリッド値（`round(0.33/grid)*grid`, grid=60/173*0.25≈0.0867。int丸めせず算出した値）に一致 |

### 1-4. `backend/tests/services/test_drum_classification.py`（新規）

対象: `LibrosaTranscriber._classify_drum(r_low, r_mid, r_high, r_hihat, decay, centroid) -> str`

| テスト名 | 入力（エネルギー比, decay, centroid） | 期待出力 |
| --- | --- | --- |
| `test_classify_kick_low_dominant` | r_low=0.7, r_mid=0.1, r_high=0.1, r_hihat=0.1 | "kick" |
| `test_classify_snare_mid_high` | r_low=0.1, r_mid=0.4, r_high=0.2, r_hihat=0.1 | "snare" |
| `test_classify_hihat_closed_short_decay` | r_hihat=0.6, decay=0.02 | "hihat_closed" |
| `test_classify_hihat_open_long_decay` | r_hihat=0.6, decay=0.12 | "hihat_open" |
| `test_classify_tom_by_centroid` | r_mid=0.5, r_high=0.05, centroid=180 | "tom_low"（centroid<200） |
| `test_classify_fallback_uses_argmax_not_constant` | r_low=0.3, r_mid=0.28, r_high=0.22, r_hihat=0.2（どの閾値にも非該当） | **"kick"**（最大帯域=low）。**現状Red**（今は必ず hihat_closed） |
| `test_classify_fallback_mid_argmax_is_snare` | r_low=0.2, r_mid=0.45, r_high=0.2, r_hihat=0.15（非該当寄り） | "snare"（最大帯域=mid） |
| `test_classify_no_single_pitch_collapse` | 上記の複数比パターンの結果集合 | 戻り値が **2種類以上**（全部 hihat_closed に崩壊しない＝ドラム原因2の核心） |

> 閾値の最終値は実装屋が `make_drum_pattern` のIntegrationで合うよう微調整してよいが、
> 「非該当ヒットを hihat_closed 固定にしない（argmaxで分散させる）」契約は固定。

### 1-5. `backend/tests/services/test_drum_dedup.py`（新規）

対象: 重複除去のテンポ連動閾値。`_is_duplicate` または閾値算出ヘルパ。

| テスト名 | 入力 | 期待出力 |
| --- | --- | --- |
| `test_dedup_threshold_scales_with_tempo` | tempo=180 から算出した dedup 閾値（例 `min(0.02, grid*0.5)`, grid=60/180*0.25≈0.0833 → 0.02、tempo=240なら grid≈0.0625*0.5=0.031→0.02、より速い連打前提のときは閾値を縮める設計） | 高テンポほど閾値が小さい（速い連打を残す）。`threshold(240) <= threshold(120)` を確認 |
| `test_dedup_keeps_fast_consecutive_hits` | 0.0s と 0.04s の2ヒット, tempo=180 | 2件とも残る |
| `test_dedup_removes_true_duplicate` | 0.0s と 0.005s | 1件にまとまる |

> 閾値式は実装屋裁量だが「テンポが上がるほど閾値が単調減少（または非増加）」「真の重複(数ms)は除去」「16分相当の連打は残す」の3契約を満たすこと。

---

## グループ2: テンポ検出 Integration（`@pytest.mark.integration`）

### 2-1. `backend/tests/services/test_tempo_detection_integration.py`（新規）

対象: `LibrosaTranscriber.detect_tempo(audio_path, start_bpm=150.0) -> TempoInfo`

| テスト名 | 入力 | 期待出力 |
| --- | --- | --- |
| `test_beat_track_called_with_start_bpm` | 任意クリック（`librosa.beat.beat_track` を mock/spy） | `start_bpm` 引数付きで呼ばれる（≈150。原因2一次防御の保護） |
| `test_frames_to_time_uses_explicit_sr` | Demucs想定 sr=44100 入力（`librosa.frames_to_time` と `beat_track` を spy） | 両者が `sr=44100`（ロードSR）かつ同一 `hop_length` で呼ばれる。**sr未明示なら時間軸2倍ずれ**を検出（原因1の核心保護） |
| `test_detect_tempo_returns_anison_band` | `make_click_track(bpm=160)` | `0.9*160 <= info.tempo <= 1.1*160`（半/倍を返さない） |
| `test_detect_tempo_half_tempo_corrected` | 拍が薄く75付近に出やすいパターン（or 80BPMクリック） | `info.tempo` が 110-185 帯（×2補正が効く） |
| `test_detect_tempo_offset_captured` | `make_click_track(bpm=150, lead_silence=1.0)` | `abs(info.offset - 1.0) <= grid`（第1拍≈1.0秒を捕捉。原因3） |
| `test_detect_tempo_returns_tempoinfo_type` | 任意 | 戻り値が `TempoInfo`、`info.tempo` は float（int丸めされていない） |

> spy の張り方: `unittest.mock.patch("app.services.librosa_transcriber.librosa.beat.beat_track", wraps=...)`
> 等で呼び出し引数を検証する。遅延importのため、`_ensure_audio_libs()` 実行後に
> モジュール属性 `librosa` を patch する点に注意（実装屋は既存の遅延import構造を確認）。

### 2-2. `backend/tests/services/test_transcriber_pure.py` 互換（純Unit側）

`TempoInfo` モデル単体テストは重依存不要なので純Unitに置く。

| テスト名 | 入力 | 期待出力 |
| --- | --- | --- |
| `test_tempo_info_model` | `TempoInfo(tempo=173.5, beat_times=[0.0,0.35], offset=0.0)` | 各フィールド保持。`tempo` は float。デフォルト `beat_times=[]`, `offset=0.0` |

---

## グループ3: ドラム改良 Integration（`@pytest.mark.integration`）

### 3-1. `backend/tests/services/test_drums_integration.py`（新規）

対象: `LibrosaTranscriber.extract_drums(audio_path, tempo=None, offset=0.0)`

| テスト名 | 入力 | 期待出力 |
| --- | --- | --- |
| `test_extract_drums_detects_events` | `make_drum_pattern` で kick/snare/hihat 計N発 | `len(notes) >= N*0.8`（取りこぼし2割許容） |
| `test_no_double_percussive_keeps_onsets` | 同パターン（percussive二重がけ除去後の実装） | 既知ヒット本数の下限を満たす（onsetが埋もれない＝原因1の保護） |
| `test_drum_pitches_are_multiple_types` | kick/snare/hihat 混在 | 検出 pitch 集合が `{36,38,42}` のうち **2種類以上**を含む（全部42に落ちない） |
| `test_drum_onsets_aligned_to_grid` | bpm既知パターン（tempo渡し） | 各 `note["start"]` が grid 整数倍に近い（tolerance=grid*0.2） |
| `test_extract_drums_applies_offset` | lead_silence付きパターン, offset渡し | 先頭 note の start が offset 補正後 0 付近 |

### 3-2. `backend/tests/services/test_drum_calls.py`（新規・spy。Unit寄りだが librosa import あり→integration可）

| テスト名 | 期待出力 |
| --- | --- |
| `test_drum_librosa_calls_use_consistent_sr_hop` | `extract_drums` 内の `onset_strength` / `onset_detect` / `frames_to_time` が**同一 sr / hop_length(512)** で呼ばれる（時間軸整合の保護） |
| `test_extract_drums_no_percussive_call` | `librosa.effects.percussive` が呼ばれない（二重がけ除去の保護） |

---

## グループ4: float データフロー回帰（Unit／既存テストに追加）

### 4-1. `backend/tests/services/test_magenta.py`（既存に追加）

| テスト名 | モック設定 | 期待出力 |
| --- | --- | --- |
| `test_audio_to_4tracks_tempo_kept_as_float` | テンポ検出が float 173.5 を返すよう mock（`LibrosaTranscriber.detect_tempo` → `TempoInfo(tempo=173.5, beat_times=[], offset=0.0)`） | `result["tempo"] == 173.5`（round されていない）。**現状Red**（今は174になる） |
| `test_audio_to_midi_tempo_not_rounded` | `transcribe_audio` が tempo=140.7 を返す mock | `result["tempo"] == 140.7` |
| `test_audio_to_4tracks_passes_offset_to_transcribers` | detect_tempo が offset=0.8 を返す mock | 各変換器（transcribe_track / extract_drums）が offset=0.8 を受け取って呼ばれる |

> 既存の `test_magenta.py` のモックは `detect_tempo.return_value = (120.0, [])`（タプル）。
> magenta が `LibrosaTranscriber.detect_tempo`（`TempoInfo`）を直接呼ぶ形に変えるため、
> 既存テストのモックも `TempoInfo` を返すよう更新が必要（回帰として全件緑を維持）。
> `BasicPitchService.detect_tempo` のタプル契約は別途ラッパとして残るので、それ自体の
> 互換テストがあれば維持する。

### 4-2. `backend/tests/routers/test_song_analysis.py`（既存に追加）

| テスト名 | 入力 | 期待出力 |
| --- | --- | --- |
| `test_analysis_result_accepts_float_tempo` | `AnalysisResult(video_id=..., title=..., channel=..., tempo=173.5)` | バリデーションエラーにならず `tempo == 173.5` |
| `test_four_track_result_accepts_float_tempo` | `FourTrackResult(..., tempo=173.5)` | 同上 |

---

## グループ5: フロント（Vitest）— float BPM 表示

### 5-1. `frontend/tests/services/songAnalysisApi.test.ts`（新規 or 追加）

| テスト名 | 入力 | 期待出力 |
| --- | --- | --- |
| `parses float tempo without rounding` | モックレスポンス `tempo: 173.5` | パース結果 `tempo === 173.5`（number で保持、round しない） |

### 5-2. PianoRoll グリッド（該当コンポーネント特定後に実装屋が記述）

| テスト名 | 期待出力 |
| --- | --- |
| `grid uses same bpm value as note positions` | 描画グリッドの拍間隔計算と、ノートの秒→x座標変換が**同一の float BPM 変数**から計算される。表示ラベルのみ `Math.round`。原因4の最終保護 |

> フロント該当ファイルは `frontend/src/components/PianoRoll/` 配下。実装屋が
> 「BPMをグリッド計算とノート位置計算の両方で同一変数から取る」原則でテストを書く。
> 設計上の契約（round は表示ラベルのみ）は `docs/design-timing-drums.md` §4 で固定済み。

---

## まとめ: テスト → 保護する原因 対応

| 原因 | 主な保護テスト |
| --- | --- |
| 1. sr/hop明示不足（時間軸2倍ずれ） | `test_frames_to_time_uses_explicit_sr`, `test_drum_librosa_calls_use_consistent_sr_hop` |
| 2. 半/倍BPM誤検出 | `test_beat_track_called_with_start_bpm`, `test_tempo_normalize.py`, `test_detect_tempo_returns_anison_band`, `_half_tempo_corrected` |
| 3. 第1拍オフセット未補正 | `test_offset_quantize.py`, `test_detect_tempo_offset_captured`, `test_extract_drums_applies_offset`, `test_audio_to_4tracks_passes_offset_to_transcribers` |
| 4. BPM整数丸めによるグリッド不一致 | `test_quantize_time_preserves_float_grid`, `test_*_tempo_kept_as_float`, `test_*_accepts_float_tempo`, `parses float tempo without rounding`, `grid uses same bpm value` |
| ドラム1. percussive二重がけ | `test_no_double_percussive_keeps_onsets`, `test_extract_drums_no_percussive_call` |
| ドラム2. hihat_closed崩壊 | `test_classify_fallback_uses_argmax_not_constant`, `test_classify_no_single_pitch_collapse`, `test_drum_pitches_are_multiple_types` |
| ドラム3. dedup固定で連打消失 | `test_drum_dedup.py`（threshold連動・連打保持・真の重複除去） |
