# バックエンド アーキテクチャ

FastAPI + Python で構築された REST API サーバー。

## 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Python | 3.11/3.12 | 言語 |
| FastAPI | - | Web フレームワーク |
| Pydantic | - | データバリデーション |
| PyTorch | - | 機械学習（Demucs用） |
| Demucs | - | 楽器分離 |
| Basic Pitch | - | 音声→MIDI変換 |
| yt-dlp | - | YouTube音声ダウンロード |
| google-genai | - | Gemini API クライアント |
| mido | - | MIDI ファイル操作 |

## ディレクトリ構成

```
backend/
├── app/
│   ├── main.py              # FastAPI エントリーポイント
│   ├── routers/
│   │   ├── song_analysis.py # 楽曲解析API
│   │   ├── theory.py        # 音楽理論API
│   │   ├── tts.py           # VOICEVOX連携
│   │   └── exercise.py      # 演習API
│   ├── services/
│   │   ├── youtube.py       # YouTube Data API
│   │   ├── audio_downloader.py  # yt-dlp
│   │   ├── audio_separator.py   # Demucs
│   │   ├── basic_pitch_service.py # Basic Pitch
│   │   ├── magenta.py       # 統合サービス
│   │   └── gemini.py        # Gemini API
│   ├── models/              # Pydantic モデル
│   └── prompts/             # AI用プロンプト
├── tests/                   # テストコード
├── requirements.txt         # Python依存関係
└── Dockerfile
```

## アーキテクチャ概要

```
┌────────────────────────────────────────────────────────────────┐
│                        FastAPI (main.py)                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              CORS Middleware (allow_origins=["*"])       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                     Routers (API定義)                    │  │
│  │  ┌───────────────┐  ┌──────┐  ┌───────┐  ┌──────────┐  │  │
│  │  │ song_analysis │  │theory│  │  tts  │  │ exercise │  │  │
│  │  └───────────────┘  └──────┘  └───────┘  └──────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Services (ビジネスロジック)            │  │
│  │  ┌──────────┐  ┌───────────────┐  ┌──────────────────┐  │  │
│  │  │ youtube  │  │audio_downloader│  │ audio_separator │  │  │
│  │  └──────────┘  └───────────────┘  └──────────────────┘  │  │
│  │  ┌──────────────────┐  ┌─────────┐  ┌──────────────┐   │  │
│  │  │basic_pitch_service│  │ magenta │  │   gemini     │   │  │
│  │  └──────────────────┘  └─────────┘  └──────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## FastAPI 基本構造

### main.py - エントリーポイント

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="アニソン作曲学習API",
    description="音楽理論解説、演習、楽曲解析を提供するAPI",
    version="0.1.0",
)

# CORS設定（開発環境では全オリジン許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # ワイルドカード使用時はFalse必須
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router登録（APIバージョニング）
app.include_router(song_analysis.router, prefix="/api/v1/song-analysis")
```

**ポイント:**
- `allow_origins=["*"]` と `allow_credentials=True` は同時使用不可
- Router で prefix を指定してバージョニング

### Router パターン

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class NoteInfo(BaseModel):
    """ノート情報（Pydanticモデル）"""
    pitch: int
    start: float
    end: float
    velocity: int = 80  # デフォルト値

@router.get("/search")
async def search_songs(query: str, limit: int = 10):
    """
    曲を検索

    Args:
        query: 検索キーワード（必須）
        limit: 取得件数（任意、デフォルト10）
    """
    if not query:
        raise HTTPException(status_code=400, detail="検索クエリを入力してください")

    # サービス層を呼び出し
    youtube = get_youtube_service()
    videos = youtube.search_music(query, limit)

    return {"success": True, "data": {"results": videos}}
```

**ポイント:**
- `async def` で非同期エンドポイント定義
- 型ヒント（`query: str`）で自動バリデーション
- `HTTPException` でエラーレスポンス

## サービス層詳細

### 依存関係とデータフロー

```
┌─────────────┐
│   Router    │  ← API リクエスト受信
└─────┬───────┘
      │ get_youtube_service()
      ▼
┌─────────────┐     YouTube      ┌─────────────┐
│  youtube.py │────Data API────▶│   YouTube   │
└─────┬───────┘                  └─────────────┘
      │ video URL
      ▼
┌─────────────────────┐            ┌─────────────┐
│ audio_downloader.py │───yt-dlp──▶│  WAV file   │
└─────────┬───────────┘            └─────────────┘
          │ WAV path
          ▼
┌─────────────────────┐            ┌──────────────────┐
│ audio_separator.py  │───Demucs──▶│ 4 WAV files      │
│  (Demucs)           │            │ drums/bass/other │
└─────────┬───────────┘            └──────────────────┘
          │ track paths
          ▼
┌─────────────────────┐            ┌──────────────────┐
│basic_pitch_service.py│──Basic───▶│ MIDI notes       │
│                     │   Pitch    │ [{pitch, start}] │
└─────────┬───────────┘            └──────────────────┘
          │ notes
          ▼
┌─────────────────────┐            ┌──────────────────┐
│   magenta.py        │──コード───▶│ Chords           │
│   (統合サービス)     │   認識     │ [{time, chord}]  │
└─────────┬───────────┘            └──────────────────┘
          │ notes + chords
          ▼
┌─────────────────────┐            ┌──────────────────┐
│   gemini.py         │──Gemini───▶│ AI解説テキスト   │
│                     │   API      │                  │
└─────────────────────┘            └──────────────────┘
```

### youtube.py - YouTube 検索

YouTube Data API v3 を使用した動画検索。

```python
class YouTubeService:
    def __init__(self):
        self.api_key = os.getenv("YOUTUBE_API_KEY")
        # googleapiclient を使用
        self.youtube = build("youtube", "v3", developerKey=self.api_key)

    def search_music(self, query: str, limit: int = 10) -> list[dict]:
        """
        音楽動画を検索

        クォータ消費: 100単位/リクエスト
        """
        request = self.youtube.search().list(
            part="snippet",
            q=query,
            type="video",
            videoCategoryId="10",  # Music カテゴリ
            maxResults=limit,
        )
        response = request.execute()

        return [
            {
                "id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "channel": item["snippet"]["channelTitle"],
                "thumbnail": item["snippet"]["thumbnails"]["default"]["url"],
                "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            }
            for item in response.get("items", [])
        ]
```

**環境変数:** `YOUTUBE_API_KEY`

### audio_downloader.py - 音声ダウンロード

yt-dlp を使用した YouTube 音声ダウンロード。

```python
import yt_dlp

class AudioDownloaderService:
    def __init__(self):
        self.output_dir = Path(os.getenv("ANISONG_AUDIO_DIR", "/tmp/anisong_audio"))
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def download_audio(self, url: str) -> dict:
        """
        YouTube URLから音声をダウンロード

        Returns:
            {"success": True, "file_path": "/path/to/audio.wav"}
        """
        output_path = self.output_dir / f"{uuid4()}.wav"

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": str(output_path.with_suffix("")),
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
                "preferredquality": "192",
            }],
            "quiet": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        return {"success": True, "file_path": str(output_path)}
```

**依存:** `yt-dlp`, `ffmpeg`

### audio_separator.py - 楽器分離（Demucs）

Meta社製のDemucsを使用した音源分離。

```python
import torch
from demucs import pretrained
from demucs.apply import apply_model

class AudioSeparatorService:
    def __init__(self):
        # デバイス自動選択（Apple Silicon対応）
        if torch.backends.mps.is_available():
            self.device = "mps"
        elif torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"

        # モデル遅延ロード（メモリ節約）
        self._model = None

    @property
    def model(self):
        """モデルを遅延ロード"""
        if self._model is None:
            self._model = pretrained.get_model("htdemucs")
            self._model.to(self.device)
        return self._model

    def separate(self, audio_path: str) -> dict:
        """
        音声を4トラックに分離

        Returns:
            {
                "success": True,
                "tracks": {
                    "drums": "/path/to/drums.wav",
                    "bass": "/path/to/bass.wav",
                    "other": "/path/to/other.wav",  # ギター・キーボード
                    "vocals": "/path/to/vocals.wav",
                }
            }
        """
        # soundfile で読み込み（torchcodec問題を回避）
        audio_data, sr = sf.read(str(audio_path))

        # numpy → torch tensor 変換
        wav = torch.from_numpy(audio_data.T.astype(np.float32))

        # サンプルレートを44.1kHzに統一（Demucsの要件）
        if sr != 44100:
            wav = torchaudio.functional.resample(wav, sr, 44100)

        # 分離実行
        with torch.no_grad():
            sources = apply_model(self.model, wav.unsqueeze(0).to(self.device))

        # sources shape: [batch, sources, channels, samples]
        # source order: drums, bass, other, vocals
```

**ポイント:**
- `htdemucs`（Hybrid Transformer Demucs）が高品質
- Apple Silicon は MPS バックエンドで高速化
- `soundfile` 使用で TorchCodec 依存を回避

### basic_pitch_service.py - 音声→MIDI変換

Spotify製のBasic Pitchを使用したピッチ検出。

```python
# scipy互換性修正（scipy 1.14以降で必要）
import scipy.signal
import scipy.signal.windows
if not hasattr(scipy.signal, 'gaussian'):
    scipy.signal.gaussian = scipy.signal.windows.gaussian

from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH

class BasicPitchService:
    def transcribe_audio(self, audio_path: str) -> dict:
        """
        音声からノート情報を抽出

        Returns:
            {
                "success": True,
                "tempo": None,  # Basic Pitchはテンポ検出しない
                "notes": [
                    {"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 100},
                    ...
                ]
            }
        """
        # Basic Pitch で推論
        model_output, midi_data, note_events = predict(
            str(audio_path),
            model_or_model_path=ICASSP_2022_MODEL_PATH,
        )

        # note_events: [(start, end, pitch, velocity), ...]
        notes = []
        for event in note_events:
            notes.append({
                "pitch": int(event[2]),
                "start": round(float(event[0]), 3),
                "end": round(float(event[1]), 3),
                "velocity": min(127, max(1, int(event[3] * 127))),
            })

        # 開始時間順にソート（重要！）
        notes.sort(key=lambda n: n["start"])

        return {"success": True, "notes": notes}
```

**ポイント:**
- scipy 1.14以降は `gaussian` 関数が移動 → モンキーパッチで対応
- Basic Pitch はテンポ検出しない（120 BPM をデフォルト使用）
- `notes.sort()` 必須（Basic Pitch はソートせずに返す）

### magenta.py - 統合サービス

Basic Pitch + コード認識 + MIDI出力を統合。

```python
class MagentaService:
    def audio_to_midi(self, audio_path: str) -> dict:
        """Basic Pitchで音声解析"""
        basic_pitch = get_basic_pitch_service()
        result = basic_pitch.transcribe_audio(str(audio_path))

        if result["success"]:
            # ノート情報をMIDIファイルに変換
            self._notes_to_midi(result["notes"], 120, midi_path)

        return result

    def audio_to_4tracks(self, audio_path: str) -> dict:
        """Demucs分離 → 各トラックMIDI変換"""
        # 1. Demucs で分離
        separator = get_audio_separator_service()
        sep_result = separator.separate(str(audio_path))

        # 2. 各トラックを Basic Pitch で変換
        basic_pitch = get_basic_pitch_service()
        for track_type, track_path in sep_result["tracks"].items():
            result = basic_pitch.transcribe_track(track_path, track_type)

        return tracks

    def extract_chords_from_notes(self, notes: list, window_size: float = 0.5) -> list:
        """
        ノート情報からコード進行を推定

        アルゴリズム:
        1. 0.5秒ごとのウィンドウでノートを集計
        2. ピッチクラス（0-11）の出現頻度を計算
        3. コードパターン（Major, Minor等）とマッチング
        """
        chord_patterns = {
            "": [0, 4, 7],      # Major
            "m": [0, 3, 7],     # Minor
            "7": [0, 4, 7, 10], # Dom7
            "M7": [0, 4, 7, 11], # Maj7
            "m7": [0, 3, 7, 10], # Min7
        }

        # 各ウィンドウで最も一致度の高いコードを選択
        ...
```

### gemini.py - AI解説生成

Google Gemini APIを使用した解説文生成。

```python
from google import genai

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.5-flash"

    async def generate_song_analysis(
        self,
        track_name: str,
        artist: str,
        tempo: int,
        chords: list[dict],
        notes_count: int,
    ) -> str:
        """楽曲解析の解説を生成"""
        chord_str = " → ".join([c['chord'] for c in chords[:8]])

        prompt = SONG_ANALYSIS_PROMPT.format(
            track_name=track_name,
            chord_progression=chord_str,
            ...
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        return response.text
```

**環境変数:** `GEMINI_API_KEY`

## シングルトンパターン

各サービスはシングルトンで提供：

```python
# シングルトンインスタンス
_basic_pitch_service: Optional[BasicPitchService] = None

def get_basic_pitch_service() -> BasicPitchService:
    """シングルトンを取得"""
    global _basic_pitch_service
    if _basic_pitch_service is None:
        _basic_pitch_service = BasicPitchService()
    return _basic_pitch_service
```

**理由:**
- モデルのロードは重い処理 → 一度だけ実行
- メモリ効率の向上
- Router から簡単にアクセス

## SSE（Server-Sent Events）ストリーミング

長時間処理の進捗をリアルタイム送信：

```python
from fastapi.responses import StreamingResponse

async def analyze_with_progress(video_id: str) -> AsyncGenerator[str, None]:
    """SSEストリーミングで進捗を送信"""
    def send_event(stage: str, progress: int, message: str):
        return f"data: {json.dumps({'stage': stage, 'progress': progress})}\n\n"

    yield send_event("init", 0, "動画情報を取得中...")

    # ダウンロード（0-40%）
    for event in downloader.download_with_progress(url):
        yield send_event("download", event["progress"] * 0.4, event["message"])

    # Basic Pitch解析（45-70%）
    yield send_event("convert", 45, "Basic Pitchで解析中...")
    midi_result = magenta.audio_to_midi(audio_path)

    # 完了
    yield send_event("complete", 100, "解析完了", result)

@router.get("/analyze/{video_id}/stream")
async def analyze_video_stream(video_id: str):
    return StreamingResponse(
        analyze_with_progress(video_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Nginx対策
        }
    )
```

**フロントエンドでの受信:**

```typescript
const eventSource = new EventSource(`/api/v1/song-analysis/analyze/${videoId}/stream`)
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  setProgress(data.progress)
}
```

## Pydantic モデル

レスポンス型定義：

```python
from pydantic import BaseModel
from typing import Optional

class NoteInfo(BaseModel):
    """MIDIノート情報"""
    pitch: int        # MIDIノート番号（0-127）
    start: float      # 開始時間（秒）
    end: float        # 終了時間（秒）
    velocity: int = 80  # 音量（デフォルト80）

class ChordInfo(BaseModel):
    """コード情報"""
    time: float       # 時間（秒）
    chord: str        # コード名（"C", "Am7" など）

class FourTrackResult(BaseModel):
    """4トラック解析結果"""
    video_id: str
    title: str
    channel: str
    tempo: int = 120
    tracks: dict[str, TrackNotes]  # drums/bass/other/vocals
    chords: list[ChordInfo]
    analysis_text: Optional[str] = None
```

**Pydanticの利点:**
- 自動バリデーション
- OpenAPI（Swagger）スキーマ自動生成
- 型安全性

## エラーハンドリング

```python
from fastapi import HTTPException

@router.get("/analyze/{video_id}")
async def analyze_video(video_id: str):
    try:
        # 処理
        ...
    except HTTPException:
        raise  # HTTPExceptionはそのまま再raise
    except Exception as e:
        # その他のエラーは500エラーに変換
        raise HTTPException(status_code=500, detail=f"解析エラー: {str(e)}")
    finally:
        # クリーンアップ（一時ファイル削除）
        if audio_path:
            downloader.cleanup(audio_path)
```

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `YOUTUBE_API_KEY` | Yes | YouTube Data API v3 |
| `GEMINI_API_KEY` | Yes | Google Gemini API |
| `VOICEVOX_HOST` | No | VOICEVOX URL |
| `ANISONG_AUDIO_DIR` | No | 音声保存先 |
| `ANISONG_MIDI_DIR` | No | MIDI保存先 |

## テスト

```bash
# pytest実行
cd backend
source .venv/bin/activate
pytest

# 特定テストのみ
pytest tests/services/test_basic_pitch.py -v

# カバレッジ付き
pytest --cov=app --cov-report=html
```

**テストファイル構成:**

```
backend/tests/
├── conftest.py              # pytest フィクスチャ
├── services/
│   ├── test_youtube.py
│   ├── test_audio_downloader.py
│   ├── test_audio_separator.py
│   ├── test_basic_pitch.py
│   ├── test_magenta.py
│   └── test_gemini.py
└── routers/
    └── test_song_analysis.py
```

## 参考文献

### FastAPI

- [FastAPI 公式ドキュメント](https://fastapi.tiangolo.com/)
- [Qiita: FastAPI入門](https://qiita.com/bee2/items/75d9c0d7ba20e7a4a0e9)
- [Qiita: FastAPIでCORS設定](https://qiita.com/satto_sann/items/0e1f5dbbe62efc612a78)
- [Qiita: FastAPI + Pydantic](https://qiita.com/yamap55/items/6153d45b52f9c44c3cfc)

### Pydantic

- [Pydantic 公式](https://docs.pydantic.dev/)
- [Qiita: Pydantic入門](https://qiita.com/0622okakyo/items/d1dcb896621907f9002b)

### PyTorch / Demucs

- [Demucs GitHub](https://github.com/facebookresearch/demucs)
- [PyTorch 公式](https://pytorch.org/)
- [Qiita: Apple Silicon で PyTorch](https://qiita.com/HiroyukiMakmo/items/e94c8c3c1f4b2ab8f1ec)
- [Qiita: Demucs で音源分離](https://qiita.com/erukiti/items/f2b6f60f2e8ce9bb1c71)

### Basic Pitch

- [Basic Pitch GitHub](https://github.com/spotify/basic-pitch)
- [Spotify Engineering Blog](https://engineering.atspotify.com/2022/06/meet-basic-pitch/)

### yt-dlp

- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
- [Qiita: yt-dlp 使い方](https://qiita.com/satto_sann/items/ff10a4ff8cc6c6ad7d28)

### SSE（Server-Sent Events）

- [MDN: Server-Sent Events](https://developer.mozilla.org/ja/docs/Web/API/Server-sent_events)
- [Qiita: FastAPI で SSE](https://qiita.com/takurx/items/09aa27d8fa0ea3ae95f5)

### 非同期処理

- [Qiita: Python asyncio入門](https://qiita.com/sugurunatsuno/items/5186f29427a22a426ad1)
- [Qiita: FastAPI async/await](https://qiita.com/honey32/items/04b0364b2cb9be5f53e0)

### MIDI

- [mido 公式](https://mido.readthedocs.io/)
- [Qiita: Python で MIDI](https://qiita.com/Watanabe_kakeru/items/e7cc6e16b8c1e6b0e7c7)

