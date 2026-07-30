# リファクタリング計画書 — アニソン作曲学習アプリ

> 解析屋（analyst）による read-only 解析の結果。コードは未変更。
> リファクタリングは「テスト緑のベースライン → 影響小 → 大」の順に、振る舞いを変えず段階的に行う。

## 1. 全体サマリ

構造は「routers → services（外部API連携）」「App → components/services」と素直なレイヤ分けができており、バックエンドにはサービスのテストが7本存在する点は健全。一方で**外部依存（Gemini/yt-dlp/Demucs/Basic Pitch/librosa/Web Audio）が全てモジュールグローバルなシングルトンに具象結合**しており、FastAPIの`Depends`もフロントのDIも一切ないため、テストは毎回グローバルを`@patch`する形に追い込まれている（D違反が全体を支配）。最大の負債は、(a) 同一責務「音声→ノート」を持つ3エンジン（librosa/basic_pitch/gemini）が共通インターフェースを持たず`magenta.py`の`if/elif`分岐に直書きされている点（O違反）、(b) `song_analysis`の3つの解析ハンドラが同一パイプラインを丸ごと重複している点（DRY）、(c) フロントの`audioEngine`(771行)と`AnalysisPianoRollModal`(733行)が再生・状態・描画・通信を抱えるGodクラス/コンポーネントである点（S違反）。加えて**フロント唯一のテストが現行実装と不整合で壊れている**ため、安全網は実質ほぼ皆無。

## 2. 問題一覧（重要度順）

### 最優先（High）

1. **[高] `frontend/tests/utils/music.test.ts:9` ↔ `frontend/src/types/music.ts:113`** — 壊れた/陳腐化したテスト（DRY・正当性）。テストは`pitchToNoteName(60)==='C4'`を期待するが実装は上付き表記`"0⁽⁴⁾"`を返す。さらに`pitchToNoteName`が3箇所で**異なる出力**で定義（`music.ts:113`/`musicAnalysis.ts:17`/`AnalysisPianoRollModal.tsx:55`）。→ 正典関数を`types/`に集約しテスト修正。リスク: 唯一の安全網が誤動作している。
2. **[高] `backend/app/services/magenta.py:207-221`** — トラック種別の`if/elif/else`でlibrosa/basic_pitchを直接ディスパッチ（O+D違反）。3エンジンは戻り値dict形状が近いのに共通抽象がない（`basic_pitch_service.py:240`/`librosa_transcriber.py:40,265`/`gemini.py:270,354`）。→ `Transcriber` Protocol + トラック種別→戦略のレジストリ（Strategy）。
3. **[高] `backend/app/routers/song_analysis.py:137-280 / 328-435 / 458-571`** — 3ハンドラがYouTube→DL→MIDI→コード→Gemini→cleanupの全パイプラインを重複（DRY）。`finally`のcleanupも3回コピペ。各ハンドラ約120-145行・ネスト深度3-4（`:173-189`）（S）。→ パイプラインを1サービスに集約、cleanupはcontext manager化。
4. **[高] `frontend/src/services/audioEngine.ts:37`（771行・末尾でシングルトンexport）** — Tone.js/soundfont-playerに具象結合したGodクラス（init/楽器生成/ドラム/4スケジューラ/音量/transport）（S+D）。consumerは全て具象シングルトンをimport（`App.tsx:18`,`AnalysisPianoRollModal.tsx:10`）。→ `IAudioEngine`抽象＋注入、`InstrumentFactory`/`DrumKit`/`PlaybackScheduler`へ分割。
5. **[高] `audioEngine.ts:282-307 / 406-431 / 538-557 / 643-670`（＋ドラム`325-347`/`448-470`）** — bass/keyboard/guitarの「SF再生 or シンセfallback」分岐とドラム`switch`がほぼ逐語重複（DRY/O）。→ `playInstrument(trackType, note, time?, dur?)`一本化。
6. **[高] `song_analysis.py:236-237, 395-396, 532-533` ＋ cleanup `279-280/434-435/570-571`** — Gemini失敗を文字列化してユーザー本文に埋め込み、bare `except: pass`でログなし（例外握り潰し・CLAUDE.md違反）。→ `logging`導入・構造化エラー。
7. **[高] `librosa_transcriber.py` / `basic_pitch_service.py` にテストが皆無** — 最も複雑な純粋ロジック（`_f0_to_notes:116`,`extract_drums:324-378`,`merge_notes:82`）が未テスト。→ 純粋関数に先にユニットテスト追加してから着手。
8. **[高] `AnalysisPianoRollModal.tsx`（733行）** — 描画(`TrackPianoRoll:86-314`)＋再生(`handlePlayToggle:466`,直接audioEngine呼出`:473/483/495`)＋AI fetch(`handleExplainSection:433`)＋ドラッグ選択状態機械(`:338-412`)＋ショートカット(`:519`)が同居（S）。→ `useAnalysisPlayback`/`useDragSelection`フック抽出、`TrackPianoRoll`分離、表示専用モーダル化。

### 中（Medium）

9. **[中] `gemini.py:135-142, 199-206, 230-237, 261-268`** — 4つの`generate_*`が`generate_content→.text`、except→失敗文字列化を逐語重複（DRY＋握り潰し）。→ `_generate(prompt)->str`抽出＋ログ。
10. **[中] `gemini.py:270-352 ↔ 354-462`** — `transcribe_audio`と`transcribe_track`が約90%重複（ZeroDivisionError回避策`306-311≈408-411`含む）。→ プロンプト引数化で1メソッドに統合。
11. **[中] `magenta.py`命名** — `MagentaService`はMagentaを使わずBasic Pitch+librosaを使用（`:1-8`）。→ `TranscriptionService`等へ改名。
12. **[中] `basic_pitch_service.py:371-409`（`_get_track_params`）** — 楽器別チューニングがメソッド内dictリテラルにハードコード、drum特殊分岐も散在（O）。→ 設定/定数へ外出し。
13. **[中] フロント描画の重複** — `TrackPianoRoll`↔`PianoRoll.tsx`、`DrumGrid.tsx`↔`AnalysisDrumGrid.tsx`、`PianoRoll`↔`DrumGrid`の編集/ショートカット/ドラッグ処理（DRY）。→ `<PianoRollCanvas>`＋`useNoteEditor`/`useDragSelect`共有。
14. **[中] MIDI→ドラム対応表が3重定義（不整合あり）** — `audioEngine.ts:13-23`/`AnalysisDrumGrid.tsx:10-32`/`DrumGrid.tsx:11-21`（45/47/48の扱いが食い違い）。→ 単一`drumKit`定数モジュール。
15. **[中] サービス戻り値の契約が不統一（CLAUDE.md「pydantic使用」違反）** — `{success,notes,tempo,error}`等がサービス毎にバラバラ（I/DRY）。→ 共有`TranscriptionResult` pydanticモデル。#2の前提。
16. **[中] `audio_downloader.py:48-62, 129-144`** — yt-dlp argvとglobフォールバックを2メソッドで重複、`subprocess`直呼び、timeout`300`マジックナンバー。→ argvビルダー＋出力解決ヘルパー抽出。
17. **[中] `audio_separator.py:11-17, 43-50`** — torch/torchaudio/demucsをモジュール先頭import、モデル名`"htdemucs"`ハードコード、`separate`が約65行の単一tryブロック。→ separatorバックエンド注入＋前処理と推論の分離。
18. **[中] `App.tsx:65`（`handleNotesChange`）** — `JSON.parse(JSON.stringify(prev))`で全トラックを毎編集ディープクローン×50履歴（性能）。→ 構造共有/immer、変更トラックのみ保存。
19. **[中] `gemini.py:23-40`（`SECTION_ANALYSIS_PROMPT`）** — プロンプトをコード内リテラル定義、`SYSTEM_*.md`規約に違反。→ `SYSTEM_SECTION_ANALYSIS.md`へ移動。

### 低（Low）

20. **[低] 横断的: `print`ロギング多数 ＋ 死にコード ＋ デバッグ経路** — logging統一違反が`librosa_transcriber.py:64..`,`basic_pitch_service.py`,`magenta.py`,`gemini.py`,`audio_separator.py`全域。死にコード疑い`librosa_transcriber.py:459,517,527`。デバッグ経路`song_analysis.py:283-302`(`/sse-test`)。`youtube.py:96-97`の無言握り潰し。`main.py:28-34`のCORS`["*"]`ハードコード（`FRONTEND_URL`未使用）。

## 3. 優先度付き着手順（安全網 → 影響小 → 大）

**ステップ1: 安全網の確立（純粋ロジックのテスト）**
- フロント壊れテスト#1を修正し`pitchToNoteName`を1本化。
- 純粋関数にユニットテスト追加: BE `librosa_transcriber._f0_to_notes/_merge_nearby_notes`、`basic_pitch_service.merge_notes/quantize_time/_normalize_drum_pitch`、FE `musicAnalysis.ts`の`detectChord/detectChordsByBeat/detectProgressionPattern`。

**ステップ2: 低リスクなクリーンアップ（挙動不変）**
- `print`→`logging`一括置換（#20）、死にコード削除、`/sse-test`削除、`SECTION_ANALYSIS_PROMPT`を`.md`へ（#19）、`MagentaService`改名（#11）。

**ステップ3: サービス内重複の集約（局所的）**
- Gemini `_generate`ヘルパー抽出（#9）＋`transcribe_*`統合（#10）、`audio_downloader`のargv/フォールバック抽出（#16）。

**ステップ4: 抽象の導入（DI・契約統一）**
- `TranscriptionResult` pydanticモデル導入（#15）→ 各サービス戻り値を移行。
- `Transcriber` Protocol＋戦略レジストリで`magenta.py:207-221`の分岐を除去（#2）。
- routerを`Depends`によるDIへ移行（#6の握り潰し是正と同時に）。

**ステップ5: パイプライン重複の解消（影響中）**
- `song_analysis`の3ハンドラを1パイプラインサービス＋cleanup context managerへ集約（#3）。

**ステップ6: フロントGod分割（影響大）**
- `audioEngine`に`IAudioEngine`抽象＋注入（#4）→ `playInstrument`一本化（#5）。
- `AnalysisPianoRollModal`をフック/サブコンポーネントへ分割（#8）、共有`PianoRollCanvas`/`useNoteEditor`抽出（#13）、`drumKit`定数統一（#14）。

## 4. テスト容易性の所見（安全リファクタの前提）

- **バックエンドDIの欠如が最大の障壁**: ハンドラが`get_xxx_service()`直呼び、サービスはモジュールグローバルシングルトン。先に FastAPI `Depends` へ移行し`app.dependency_overrides`で差し替え可能にすべき。
- **外部依存の具象結合**: `librosa`/`torch/demucs`/`genai`/`subprocess`/`Tone/Soundfont`がモジュール先頭import。「外部I/Oの薄いラッパ」と「純粋な変換ロジック」を分離し、後者を先にテスト化。
- **フロントの安全網がほぼゼロ**: テストは`music.test.ts`一本のみで壊れている。注入可能なaudio interfaceの導入が、componentテストとaudioEngine分割の両方の前提。
- **HTTP境界の抽象化**: `songAnalysisApi.ts`は`fetch`/`EventSource`直呼び。薄い共通ラッパ化が望ましい。
- **既にテスト済みで安心して触れる領域**: `magenta.extract_chords_from_notes/_detect_chord`、`youtube`/`audio_downloader`/`audio_separator`/`gemini`/`prompts`/`song_analysis`ルータ（モック済み）。

### 要確認（推測・未精読）
- `songAnalysisApi.ts`の`analyzeVideo:113`/`getVideo:98`、`librosa_transcriber.py:459/517/527`、`magenta.extract_chords` は未使用/重複の疑い → 削除/統合前にgrepで参照確認。
- `theory.py`/`exercise.py` は `# TODO` スタブでロジックなし。
- `LessonModal.tsx`(441行)・`HelpModal.tsx`(144行) は今回未精読。必要なら追加調査。
