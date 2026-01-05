# 楽曲解析システム - 技術ドキュメント

YouTube から楽曲を取得し、4トラックに分離してMIDI変換するシステムの詳細。

## 概要

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  YouTube    │    │   Demucs    │    │ Basic Pitch │    │  Frontend   │
│  Data API   │───▶│  (分離)     │───▶│  (MIDI変換) │───▶│ Piano Roll  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       │                  │                  │
   曲検索            4トラック分離      音声→ノート変換
   URL取得           drums/bass/         時間・ピッチ・
                    other/vocals        ベロシティ抽出
```

## 処理フロー

### 1. 曲検索（YouTube Data API v3）

**ファイル:** `backend/app/services/youtube.py`

```python
# YouTubeで音楽を検索
videos = youtube.search_music("バンドリ", limit=10)
# → [{"id": "xxx", "title": "...", "channel": "...", "url": "..."}]
```

**必要な環境変数:**
- `YOUTUBE_API_KEY`: YouTube Data API v3 のAPIキー

### 2. 音声ダウンロード（yt-dlp）

**ファイル:** `backend/app/services/audio_downloader.py`

```python
# YouTube URLからWAVファイルをダウンロード
result = downloader.download_audio("https://youtube.com/watch?v=xxx")
# → {"success": True, "file_path": "/path/to/audio.wav"}
```

**出力フォーマット:**
- WAV形式
- 48kHz サンプルレート
- ステレオ（2ch）

**保存先:** `storage/audio/` または環境変数 `ANISONG_AUDIO_DIR`

### 3. 楽器分離（Demucs）

**ファイル:** `backend/app/services/audio_separator.py`

Meta社が開発した音源分離AI。1つの音声ファイルを4トラックに分離。

```python
# 4トラックに分離
result = separator.separate("/path/to/audio.wav")
# → {
#     "success": True,
#     "tracks": {
#         "drums": "/tmp/.../drums.wav",
#         "bass": "/tmp/.../bass.wav",
#         "other": "/tmp/.../other.wav",   # ギター・キーボード等
#         "vocals": "/tmp/.../vocals.wav"
#     }
# }
```

**モデル:** `htdemucs`（デフォルト）
**GPU加速:** Apple Silicon の MPS に対応

**注意点:**
- 処理時間: 3分の曲で約1-2分（MPS使用時）
- メモリ使用量: 約4GB

### 4. MIDI変換（Basic Pitch）

**ファイル:** `backend/app/services/basic_pitch_service.py`

Spotify社が開発したオープンソースの音声→MIDI変換ライブラリ。

```python
# 音声ファイルからノート情報を抽出
result = basic_pitch.transcribe_audio("/path/to/drums.wav")
# → {
#     "success": True,
#     "tempo": None,  # Basic Pitchはテンポ検出しない
#     "notes": [
#         {"pitch": 36, "start": 0.0, "end": 0.1, "velocity": 100},
#         {"pitch": 38, "start": 0.5, "end": 0.6, "velocity": 90},
#         ...
#     ]
# }
```

**出力:**
- `pitch`: MIDIノート番号（0-127）
- `start`: 開始時間（秒）
- `end`: 終了時間（秒）
- `velocity`: 音量（1-127）

**ノートは開始時間順にソートされる**

### 5. コード認識

**ファイル:** `backend/app/services/magenta.py` → `extract_chords_from_notes()`

ノート情報からコード進行を推定。

```python
chords = magenta.extract_chords_from_notes(notes, window_size=0.5)
# → [
#     {"time": 0.0, "chord": "C"},
#     {"time": 2.0, "chord": "Am"},
#     {"time": 4.0, "chord": "F"},
#     ...
# ]
```

**アルゴリズム:**
1. 0.5秒ごとのウィンドウでノートを集計
2. ピッチクラス（0-11）の出現頻度を計算
3. コードパターン（Major, Minor, 7th等）とマッチング
4. 最も一致度の高いコードを選択

## ファイル構成

```
backend/app/
├── routers/
│   └── song_analysis.py      # APIエンドポイント
├── services/
│   ├── youtube.py            # YouTube検索
│   ├── audio_downloader.py   # yt-dlpダウンロード
│   ├── audio_separator.py    # Demucs分離
│   ├── basic_pitch_service.py # Basic Pitch MIDI変換
│   ├── magenta.py            # コード認識 & 統合サービス
│   └── gemini.py             # AI解説生成
└── prompts/
    └── ...                   # Gemini用プロンプト
```

## APIエンドポイント

### GET `/api/v1/song-analysis/search`

曲を検索。

```
GET /api/v1/song-analysis/search?query=バンドリ&limit=10
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "query": "バンドリ",
    "total": 10,
    "results": [
      {
        "id": "xxx",
        "title": "...",
        "channel": "...",
        "thumbnail": "...",
        "url": "..."
      }
    ]
  }
}
```

### GET `/api/v1/song-analysis/analyze-4tracks/{video_id}`

4トラック分離解析。

```
GET /api/v1/song-analysis/analyze-4tracks/xxx
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "video_id": "xxx",
    "title": "...",
    "channel": "...",
    "tempo": 120,
    "tracks": {
      "drums": {
        "notes": [{"pitch": 36, "start": 0.0, "end": 0.1, "velocity": 100}, ...],
        "midi_path": "/path/to/drums.mid"
      },
      "bass": { ... },
      "other": { ... },
      "vocals": { "notes": [] }
    },
    "chords": [{"time": 0.0, "chord": "C"}, ...],
    "analysis_text": "AI解説..."
  }
}
```

## MIDIノート番号リファレンス

### ドラム（General MIDI）

| 楽器 | ノート番号 |
|------|-----------|
| キック | 36 |
| スネア | 38 |
| クローズドHH | 42 |
| オープンHH | 46 |
| クラッシュ | 49 |
| ライド | 51 |
| ハイタム | 50 |
| ミッドタム | 47 |
| ロータム | 43 |

### 音階

| 音名 | ノート番号 |
|------|-----------|
| C3 | 48 |
| C4（中央のド）| 60 |
| C5 | 72 |
| C6 | 84 |

**計算式:** `ノート番号 = オクターブ × 12 + ピッチクラス + 12`

例: C4 = 4 × 12 + 0 + 12 = 60

## 依存ライブラリ

### Basic Pitch

```bash
pip install 'basic-pitch[coreml]'  # macOS用
```

**scipy互換性の問題:**

scipy 1.14以降で `scipy.signal.gaussian` が削除されたため、パッチが必要：

```python
# basic_pitch_service.py の先頭で
import scipy.signal
import scipy.signal.windows
if not hasattr(scipy.signal, 'gaussian'):
    scipy.signal.gaussian = scipy.signal.windows.gaussian
```

### Demucs

```bash
pip install demucs torch torchaudio
```

**Apple Silicon (MPS) 対応:**
- PyTorchが自動的にMPSを検出
- 環境変数 `PYTORCH_ENABLE_MPS_FALLBACK=1` 推奨

## 環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `YOUTUBE_API_KEY` | YouTube Data API v3 | `AIzaSy...` |
| `GEMINI_API_KEY` | Gemini API | `AIzaSy...` |
| `VOICEVOX_HOST` | VOICEVOX URL | `http://localhost:50021` |
| `ANISONG_AUDIO_DIR` | 音声保存先 | `/path/to/storage/audio` |
| `ANISONG_MIDI_DIR` | MIDI保存先 | `/path/to/storage/midi` |

## パフォーマンス目安

| 処理 | 3分の曲 | 備考 |
|------|---------|------|
| ダウンロード | 5-10秒 | ネットワーク依存 |
| Demucs分離 | 60-120秒 | MPS使用時 |
| Basic Pitch | 10-20秒/トラック | CPU処理 |
| **合計** | **2-4分** | |

## 次のステップ

- [ ] テンポ検出の追加（librosa使用）
- [ ] リアルタイム進捗表示の改善
- [ ] MIDI出力エクスポート機能

## 参考文献

### YouTube Data API

- [YouTube Data API 公式](https://developers.google.com/youtube/v3)
- [Qiita: YouTube Data API v3 入門](https://qiita.com/g-iki/items/91f73a8d12c8889a2bcd)
- [Qiita: Python で YouTube API](https://qiita.com/tarakokko3233/items/f9b7b58bf5f3b0e16f66)

### yt-dlp

- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
- [Qiita: yt-dlp の使い方](https://qiita.com/satto_sann/items/ff10a4ff8cc6c6ad7d28)
- [yt-dlp 公式ドキュメント](https://github.com/yt-dlp/yt-dlp#readme)

### Demucs（音源分離）

- [Demucs GitHub](https://github.com/facebookresearch/demucs)
- [Meta AI Blog: Demucs](https://ai.meta.com/blog/demucs-music-source-separation/)
- [Qiita: Demucs で音源分離](https://qiita.com/erukiti/items/f2b6f60f2e8ce9bb1c71)
- [Qiita: Python で楽器分離](https://qiita.com/m__k/items/82cb24a79a0a3c1a1b72)

### Basic Pitch（音声→MIDI）

- [Basic Pitch GitHub](https://github.com/spotify/basic-pitch)
- [Spotify Engineering Blog](https://engineering.atspotify.com/2022/06/meet-basic-pitch/)
- [Basic Pitch Web Demo](https://basicpitch.spotify.com/)

### MIDI 規格

- [MIDI Association 公式](https://www.midi.org/)
- [General MIDI ドラムマップ](https://www.midi.org/specifications-old/item/gm-level-1-sound-set)
- [Qiita: MIDI ファイル構造](https://qiita.com/ryoofuchi/items/72de0daa7b19c2fd839b)
- [Qiita: Python で MIDI 操作（mido）](https://qiita.com/Watanabe_kakeru/items/e7cc6e16b8c1e6b0e7c7)

### コード認識

- [Qiita: Python で和音認識](https://qiita.com/koshian2/items/a6bb8a19b83d6c3bf45d)
- [tonal.js GitHub](https://github.com/tonaljs/tonal)

### PyTorch / Apple Silicon

- [PyTorch MPS Backend](https://pytorch.org/docs/stable/notes/mps.html)
- [Qiita: Apple Silicon で PyTorch](https://qiita.com/HiroyukiMakmo/items/e94c8c3c1f4b2ab8f1ec)
