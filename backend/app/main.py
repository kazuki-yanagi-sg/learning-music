"""
アニソン作曲学習アプリ - FastAPI エントリーポイント

提供するAPI:
- /api/v1/theory: 音楽理論解説
- /api/v1/tts: VOICEVOX音声合成
- /api/v1/exercise: 演習問題
- /api/v1/song-analysis: 楽曲解析（Spotify + Basic Pitch）
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

# Routerのインポート
from app.routers import theory, tts, exercise, song_analysis

app = FastAPI(
    title="アニソン作曲学習API",
    description="音楽理論解説、演習、楽曲解析を提供するAPI",
    version="0.1.0",
)

# CORS設定（開発環境では全オリジンを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # allow_origins=["*"] の場合は False に
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routerの登録
app.include_router(theory.router, prefix="/api/v1/theory", tags=["theory"])
app.include_router(tts.router, prefix="/api/v1/tts", tags=["tts"])
app.include_router(exercise.router, prefix="/api/v1/exercise", tags=["exercise"])
app.include_router(song_analysis.router, prefix="/api/v1/song-analysis", tags=["song-analysis"])


@app.get("/")
async def root():
    """ヘルスチェック用エンドポイント"""
    return {"status": "ok", "message": "アニソン作曲学習API"}


@app.get("/health")
async def health():
    """ヘルスチェック"""
    return {"status": "healthy"}
