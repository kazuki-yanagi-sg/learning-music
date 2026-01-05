# トラブルシューティング

よくある問題と解決方法。

## 目次

1. [バックエンド起動関連](#バックエンド起動関連)
2. [YouTube API関連](#youtube-api関連)
3. [Basic Pitch関連](#basic-pitch関連)
4. [Demucs関連](#demucs関連)
5. [フロントエンド関連](#フロントエンド関連)

---

## バックエンド起動関連

### 環境変数が読み込まれない

**症状:**
```
API key not valid. Please pass a valid API key.
key=YOUR_YOUTUBE_API_KEY
```

**原因:** `.env` ファイルが読み込まれていない

**解決方法:**

```bash
# 方法1: start.sh を使う（推奨）
./start.sh

# 方法2: 手動で環境変数を設定
export $(grep -v '^#' .env | xargs)
source backend/.venv/bin/activate
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 方法3: インラインで指定
YOUTUBE_API_KEY="your_key" GEMINI_API_KEY="your_key" uvicorn app.main:app ...
```

### Port 8000 already in use

**症状:**
```
ERROR: [Errno 48] Address already in use
```

**解決方法:**
```bash
# 既存プロセスを終了
pkill -f "uvicorn app.main:app"
# または
lsof -i :8000  # PIDを確認
kill <PID>
```

### Python バージョンエラー

**症状:**
```
Python 3.13 は未対応
```

**解決方法:**
```bash
# Python 3.11 または 3.12 をインストール
brew install python@3.12

# 仮想環境を作り直す
rm -rf backend/.venv
python3.12 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

---

## YouTube API関連

### API key not valid

**症状:**
```
検索エラー: API key not valid
```

**確認事項:**

1. `.env` に正しいキーが設定されているか
```bash
grep YOUTUBE_API_KEY .env
```

2. YouTube Data API v3 が有効か
   - [Google Cloud Console](https://console.cloud.google.com/) で確認
   - 「APIとサービス」→「有効なAPIとサービス」

3. APIキーの制限を確認
   - IPアドレス制限がないか
   - リファラー制限がないか

### クォータ超過

**症状:**
```
quotaExceeded
```

**解決方法:**
- 1日のクォータ（10,000単位）を超過
- 翌日まで待つ、または新しいプロジェクトを作成

---

## Basic Pitch関連

### scipy.signal.gaussian エラー

**症状:**
```
AttributeError: module 'scipy.signal' has no attribute 'gaussian'
```

**原因:** scipy 1.14以降で関数が移動された

**解決方法:**

`backend/app/services/basic_pitch_service.py` の先頭に以下を追加:

```python
import scipy.signal
import scipy.signal.windows
if not hasattr(scipy.signal, 'gaussian'):
    scipy.signal.gaussian = scipy.signal.windows.gaussian
```

または scipy をダウングレード:
```bash
pip install "scipy>=1.10.0,<1.14.0"
```

### ノートが検出されない / 0ノート

**確認事項:**

1. 音声ファイルが正常か
```python
import soundfile as sf
data, sr = sf.read("audio.wav")
print(f"Duration: {len(data)/sr}s, Max: {data.max()}")
```

2. Basic Pitch が正しくインストールされているか
```bash
pip install 'basic-pitch[coreml]'  # macOS
```

3. バックエンドログを確認
```
[BasicPitch] Transcribed 1146 notes from audio.wav
```

### ノートが曲の最後に集中している

**症状:** 全てのノートが曲の終わり（200秒台など）から始まる

**原因:** ノートがソートされていない

**解決方法:** `basic_pitch_service.py` でソートを追加

```python
notes.sort(key=lambda n: n["start"])
```

---

## Demucs関連

### TorchCodec エラー

**症状:**
```
TorchCodec is required for load_with_torchcodec
```

**解決方法:**

`audio_separator.py` で `soundfile` を使用:

```python
import soundfile as sf
import numpy as np
import torch

# torchaudio.load() の代わりに
audio_data, sr = sf.read(str(audio_path))
if audio_data.ndim == 1:
    audio_data = np.stack([audio_data, audio_data], axis=1)
wav = torch.from_numpy(audio_data.T.astype(np.float32))
```

### MPS (Apple Silicon) で遅い / 動かない

**解決方法:**

```bash
# MPS フォールバックを有効化
export PYTORCH_ENABLE_MPS_FALLBACK=1

# またはCPUを強制使用
export CUDA_VISIBLE_DEVICES=""
```

### メモリ不足

**症状:**
```
RuntimeError: MPS backend out of memory
```

**解決方法:**
- 短い曲で試す
- 他のアプリを閉じる
- `segment` パラメータを小さく設定

---

## フロントエンド関連

### CORS エラー

**症状:**
```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**解決方法:**

`backend/app/main.py` を確認:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発環境用
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### ピアノロールが表示されない

**確認事項:**

1. ブラウザのコンソールでエラーを確認
2. ネットワークタブでAPIレスポンスを確認
3. ハードリフレッシュ（Cmd+Shift+R）を試す

### Docker コンテナが古いコードを使っている

**解決方法:**
```bash
# コンテナを再起動
docker-compose restart frontend

# または再ビルド
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

---

## デバッグ方法

### バックエンドログの確認

```bash
# uvicorn を直接実行している場合
# ターミナルに出力される

# バックグラウンドで実行している場合
tail -f /tmp/backend.log
```

### Python で直接テスト

```python
# インタラクティブにテスト
source backend/.venv/bin/activate
cd backend
python

>>> from app.services.basic_pitch_service import get_basic_pitch_service
>>> bp = get_basic_pitch_service()
>>> result = bp.transcribe_audio("/path/to/audio.wav")
>>> print(f"Notes: {len(result['notes'])}")
```

### API を直接呼び出す

```bash
# 検索テスト
curl "http://localhost:8000/api/v1/song-analysis/search?query=test&limit=1"

# ヘルスチェック
curl "http://localhost:8000/health"
```

---

## サポート

問題が解決しない場合:

1. バックエンドログを確認
2. ブラウザのコンソールログを確認
3. 環境変数が正しく設定されているか確認
4. 依存ライブラリのバージョンを確認

```bash
pip list | grep -E "basic-pitch|scipy|torch|demucs"
```
