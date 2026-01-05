# Python/FastAPI入門 - 完全初心者向け

このドキュメントは「Pythonって何？」というレベルから説明します。

## 目次

1. [Pythonとは](#pythonとは)
2. [Pythonの基本的な書き方](#pythonの基本的な書き方)
3. [FastAPIとは](#fastapiとは)
4. [APIエンドポイントの作り方](#apiエンドポイントの作り方)
5. [Pydantic - データの型を定義する](#pydantic---データの型を定義する)
6. [このアプリでよく使うパターン](#このアプリでよく使うパターン)

---

## Pythonとは

### 読みやすいプログラミング言語

Pythonは「人間が読みやすいコード」を目指した言語です。

```python
# 他の言語と比較

# JavaScript
function greet(name) {
    return "Hello, " + name + "!";
}

# Java
public String greet(String name) {
    return "Hello, " + name + "!";
}

# Python（シンプル！）
def greet(name):
    return f"Hello, {name}!"
```

### Pythonの特徴

1. **シンプル**: 波括弧 `{}` ではなく、インデント（字下げ）でブロックを表す
2. **豊富なライブラリ**: AI、Web、データ分析など何でもできる
3. **読みやすい**: 英語に近い書き方

---

## Pythonの基本的な書き方

### 1. 変数

```python
# 変数の定義（型を書かなくてもOK）
name = "太郎"
age = 25
is_student = True  # True/False（Pythonは大文字）

# 型ヒント付き（推奨）
name: str = "太郎"
age: int = 25
is_student: bool = True
price: float = 1980.5

# リスト（配列）
fruits: list[str] = ["りんご", "みかん", "バナナ"]
scores: list[int] = [80, 95, 72]

# 辞書（オブジェクト）
user: dict = {
    "name": "太郎",
    "age": 25,
}
```

### 2. 関数

```python
# 基本形
def add(a: int, b: int) -> int:
    return a + b

result = add(3, 5)  # → 8


# デフォルト引数
def greet(name: str, greeting: str = "こんにちは") -> str:
    return f"{greeting}、{name}さん！"

greet("太郎")              # → "こんにちは、太郎さん！"
greet("太郎", "おはよう")   # → "おはよう、太郎さん！"
```

### 3. 条件分岐

```python
score = 85

if score >= 90:
    print("優秀！")
elif score >= 70:
    print("合格")
else:
    print("もう少し頑張ろう")
# → "合格"

# インデントが重要！
# 4つのスペースでブロックを表す
```

### 4. 繰り返し

```python
# for文
for i in range(5):
    print(i)  # 0, 1, 2, 3, 4

# リストの繰り返し
fruits = ["りんご", "みかん", "バナナ"]

for fruit in fruits:
    print(fruit)

# インデックス付き
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")
# 0: りんご
# 1: みかん
# 2: バナナ
```

### 5. リスト操作

```python
numbers = [1, 2, 3, 4, 5]

# リスト内包表記（map的な処理）
doubled = [n * 2 for n in numbers]
# → [2, 4, 6, 8, 10]

# フィルタリング
evens = [n for n in numbers if n % 2 == 0]
# → [2, 4]

# 普通の書き方
result = []
for n in numbers:
    if n > 3:
        result.append(n)
# → [4, 5]
```

### 6. クラス

```python
class User:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

    def greet(self) -> str:
        return f"こんにちは、{self.name}です。{self.age}歳です。"


# 使い方
user = User("太郎", 25)
print(user.name)     # → "太郎"
print(user.greet())  # → "こんにちは、太郎です。25歳です。"
```

---

## FastAPIとは

### 高速なWeb APIフレームワーク

FastAPIは「APIを簡単に作れる」Pythonのフレームワークです。

```
【FastAPIの特徴】

1. 高速: 名前の通り速い
2. 簡単: 少ないコードでAPIが作れる
3. 自動ドキュメント: Swagger UIが自動生成
4. 型安全: Pydanticで型チェック
```

### 最小限のAPI

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

# 起動: uvicorn main:app --reload
# アクセス: http://localhost:8000/
# → {"message": "Hello, World!"}
```

### 自動ドキュメント

FastAPIを起動すると自動でAPIドキュメントが生成されます。

```
http://localhost:8000/docs   ← Swagger UI（インタラクティブ）
http://localhost:8000/redoc  ← ReDoc（読みやすい）
```

---

## APIエンドポイントの作り方

### 基本パターン

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

# GET: データを取得
@app.get("/items")
def get_items():
    return {"items": ["りんご", "みかん", "バナナ"]}

# GET: パラメータ付き
@app.get("/items/{item_id}")
def get_item(item_id: int):
    return {"item_id": item_id, "name": f"アイテム{item_id}"}

# GET: クエリパラメータ
@app.get("/search")
def search(query: str, limit: int = 10):
    return {"query": query, "limit": limit}
# /search?query=バンドリ&limit=5

# POST: データを送信
@app.post("/items")
def create_item(name: str, price: int):
    return {"name": name, "price": price, "created": True}
```

### このアプリの例

```python
# backend/app/routers/song_analysis.py

from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/search")
async def search_songs(query: str, limit: int = 10):
    """
    曲を検索

    Args:
        query: 検索キーワード
        limit: 取得件数
    """
    if not query:
        raise HTTPException(status_code=400, detail="クエリを入力してください")

    # YouTubeで検索
    youtube = get_youtube_service()
    videos = youtube.search_music(query, limit)

    return {
        "success": True,
        "data": {
            "query": query,
            "results": videos,
        }
    }
```

### デコレータとは

`@app.get("/")` のような `@` で始まるものを「デコレータ」といいます。

```python
# 普通に書くと...
def my_function():
    return "Hello"

# FastAPIに「これはGETリクエストで/にアクセスしたときに実行する関数です」と教える
app.add_route("/", my_function, methods=["GET"])

# デコレータを使うと短く書ける
@app.get("/")
def my_function():
    return "Hello"
```

---

## Pydantic - データの型を定義する

### Pydanticとは

データの型を定義し、自動でバリデーション（検証）してくれるライブラリ。

```python
from pydantic import BaseModel

# モデル（データの型）を定義
class User(BaseModel):
    name: str
    age: int
    email: str | None = None  # オプション（None可）


# 使い方
user = User(name="太郎", age=25)
print(user.name)  # → "太郎"
print(user.model_dump())  # → {"name": "太郎", "age": 25, "email": None}


# 不正なデータはエラーになる
user = User(name="太郎", age="二十五")  # age は int なのに str
# → ValidationError!
```

### このアプリの例

```python
# backend/app/routers/song_analysis.py

from pydantic import BaseModel
from typing import Optional

class NoteInfo(BaseModel):
    """MIDIノート情報"""
    pitch: int        # MIDIノート番号（0-127）
    start: float      # 開始時間（秒）
    end: float        # 終了時間（秒）
    velocity: int = 80  # 音量（デフォルト80）


class AnalysisResult(BaseModel):
    """解析結果"""
    video_id: str
    title: str
    channel: str
    tempo: Optional[int] = None  # テンポ（なければNone）
    notes: list[NoteInfo] = []   # ノートのリスト
    chords: list[dict] = []


# APIのレスポンスで使う
@router.get("/analyze/{video_id}")
async def analyze_video(video_id: str) -> dict:
    # ... 処理 ...

    result = AnalysisResult(
        video_id=video_id,
        title="曲名",
        channel="チャンネル名",
        tempo=120,
        notes=[
            NoteInfo(pitch=60, start=0.0, end=0.5, velocity=100),
            NoteInfo(pitch=62, start=0.5, end=1.0),  # velocityはデフォルト80
        ],
    )

    return {"success": True, "data": result}
```

---

## このアプリでよく使うパターン

### 1. サービス層の分離

ビジネスロジックをRouterから分離する。

```python
# backend/app/services/youtube.py
class YouTubeService:
    def __init__(self):
        self.api_key = os.getenv("YOUTUBE_API_KEY")

    def search_music(self, query: str, limit: int = 10) -> list[dict]:
        # YouTube APIを呼び出す処理
        ...
        return videos


# シングルトン（1つだけ作る）
_youtube_service = None

def get_youtube_service() -> YouTubeService:
    global _youtube_service
    if _youtube_service is None:
        _youtube_service = YouTubeService()
    return _youtube_service


# 使い方（Routerから）
from app.services.youtube import get_youtube_service

@router.get("/search")
async def search(query: str):
    youtube = get_youtube_service()
    videos = youtube.search_music(query)
    return {"results": videos}
```

### 2. 非同期処理（async/await）

時間がかかる処理を「待つ」仕組み。

```python
# 同期関数（待たない）
def sync_function():
    return "Hello"

# 非同期関数（待てる）
async def async_function():
    # 外部APIを呼ぶときなど
    result = await some_async_operation()
    return result


# FastAPIでは async def を使うことが多い
@router.get("/analyze/{video_id}")
async def analyze_video(video_id: str):
    # await で結果を待つ
    analysis = await run_analysis(video_id)
    return analysis
```

### 3. エラーハンドリング

```python
from fastapi import HTTPException

@router.get("/video/{video_id}")
async def get_video(video_id: str):
    try:
        youtube = get_youtube_service()
        video = youtube.get_video(video_id)

        if not video:
            # 404 Not Found を返す
            raise HTTPException(status_code=404, detail="動画が見つかりません")

        return {"success": True, "data": video}

    except HTTPException:
        # HTTPExceptionはそのまま再raise
        raise

    except Exception as e:
        # その他のエラーは500 Internal Server Error
        raise HTTPException(status_code=500, detail=f"エラー: {str(e)}")
```

### 4. 環境変数の読み込み

```python
import os
from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv()

# 環境変数を取得
api_key = os.getenv("YOUTUBE_API_KEY")
port = int(os.getenv("PORT", "8000"))  # デフォルト値あり

# 必須の環境変数
api_key = os.getenv("YOUTUBE_API_KEY")
if not api_key:
    raise ValueError("YOUTUBE_API_KEY is not set")
```

### 5. SSEストリーミング

長時間処理の進捗をリアルタイムで返す。

```python
from fastapi.responses import StreamingResponse
import json

async def progress_generator():
    """進捗をSSEで返すジェネレータ"""
    for i in range(100):
        yield f"data: {json.dumps({'progress': i})}\n\n"
        await asyncio.sleep(0.1)

    yield f"data: {json.dumps({'complete': True})}\n\n"


@router.get("/analyze/{video_id}/stream")
async def analyze_stream(video_id: str):
    return StreamingResponse(
        progress_generator(),
        media_type="text/event-stream",
    )
```

---

## ディレクトリ構成

```
backend/
├── app/
│   ├── main.py              # エントリーポイント
│   ├── routers/             # APIエンドポイント
│   │   ├── __init__.py
│   │   ├── song_analysis.py
│   │   └── theory.py
│   ├── services/            # ビジネスロジック
│   │   ├── __init__.py
│   │   ├── youtube.py
│   │   ├── audio_downloader.py
│   │   ├── audio_separator.py
│   │   ├── basic_pitch_service.py
│   │   ├── magenta.py
│   │   └── gemini.py
│   ├── models/              # Pydanticモデル
│   └── prompts/             # AIプロンプト
├── tests/                   # テスト
├── requirements.txt         # 依存関係
└── .env                     # 環境変数（gitignore）
```

---

## コマンドまとめ

```bash
# 仮想環境を作成
python -m venv .venv

# 仮想環境を有効化
source .venv/bin/activate  # Mac/Linux
.venv\Scripts\activate     # Windows

# パッケージをインストール
pip install -r requirements.txt

# サーバーを起動
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
#                                              ↑ コード変更時に自動再起動

# テストを実行
pytest
```

---

## まとめ

| 概念 | 説明 | 例 |
|-----|------|-----|
| 関数 | 処理をまとめる | `def add(a, b): return a + b` |
| クラス | データと処理をまとめる | `class User: ...` |
| デコレータ | 関数に機能を追加 | `@app.get("/")` |
| Pydantic | データの型定義 | `class User(BaseModel): ...` |
| async/await | 非同期処理 | `async def func(): await ...` |
| HTTPException | エラーレスポンス | `raise HTTPException(404, "Not found")` |

## 次に読むべきドキュメント

これで初心者向けドキュメントは終わりです。

詳細なアーキテクチャは以下を参照:
- [../BACKEND.md](../BACKEND.md) - バックエンドアーキテクチャ
- [../FRONTEND.md](../FRONTEND.md) - フロントエンドアーキテクチャ
- [../SONG_ANALYSIS.md](../SONG_ANALYSIS.md) - 楽曲解析システム

## 参考文献

### Python

- [Python 公式（日本語）](https://docs.python.org/ja/3/)
- [Qiita: Python入門](https://qiita.com/Fendo181/items/a934e4f94021115efb2e)
- [Qiita: Python基礎文法](https://qiita.com/AI_Academy/items/b97b2178b4d10abe0adb)
- [Qiita: リスト内包表記](https://qiita.com/y__sama/items/a2c458de97c4aa5a98e7)

### FastAPI

- [FastAPI 公式（日本語）](https://fastapi.tiangolo.com/ja/)
- [Qiita: FastAPI入門](https://qiita.com/bee2/items/75d9c0d7ba20e7a4a0e9)
- [Qiita: FastAPIでREST API](https://qiita.com/TsuMakoto/items/dd06c78ed42e5e7b49b5)
- [Qiita: FastAPI + Pydantic](https://qiita.com/yamap55/items/6153d45b52f9c44c3cfc)

### Pydantic

- [Pydantic 公式](https://docs.pydantic.dev/)
- [Qiita: Pydantic入門](https://qiita.com/0622okakyo/items/d1dcb896621907f9002b)
- [Qiita: PydanticのBaseModel](https://qiita.com/bee2/items/d529d3fa31ab47a71bee)

### 非同期処理

- [Qiita: Python asyncio入門](https://qiita.com/sugurunatsuno/items/5186f29427a22a426ad1)
- [Qiita: async/await徹底解説](https://qiita.com/kaitolucifer/items/3f3e5611f8bcb3b67bb6)

### 環境構築

- [Qiita: Python仮想環境venv](https://qiita.com/fiftystorm36/items/b2fd47cf32c7694adc2e)
- [Qiita: pip入門](https://qiita.com/suzuki_y/items/3261ffa9b67410803443)
