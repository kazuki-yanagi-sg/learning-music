# アニソン作曲学習アプリ

**音楽理論ゼロからオリジナルアニソン1曲（1分30秒以上）を完成させる**ための学習アプリ

## 核心機能

1. **理論学習** - Phase 1-8の段階的カリキュラム（70-90時間）
2. **楽曲検索・解析** - YouTubeで曲を検索 → 4トラック分離 → MIDI変換 → 耳コピ練習
3. **4トラック合成** - ドラム/ベース/キーボード/ギターで1曲作成
4. **AI解説** - Gemini APIによる理論解説・コード進行分析 + VOICEVOX音声ガイド

## ゴール

```
現在地: 音名ぐらいしかわからない
    ↓
到達点: オリジナルのアニソンを4トラックで完成させる
        + 理論的に「なぜそうしたか」を説明できる
```

## カリキュラム概要

| Phase | 内容 | 学ぶこと | 時間目安 |
|-------|------|----------|----------|
| 1 | 音の基礎 | 12音(0-11)、インターバル | 2-3時間 |
| 2 | 和声の基礎 | コード構造、7th、ダイアトニック | 3-4時間 |
| 3 | コード進行 | 機能和声、アニソン頻出進行 | 5-6時間 |
| 4 | メロディ | スケール、モチーフ、展開 | 6-8時間 |
| 5 | リズム | 拍子、BPM、パターン | 2-3時間 |
| 6 | 曲構成 | Aメロ→Bメロ→サビ、設計図 | 3-4時間 |
| 7 | 実践 | 8小節→32小節→1曲完成 | 15-20時間 |
| 8 | 統合 | 4トラック合成 + 参照曲で耳コピ | 30-40時間 |

**合計: 約70-90時間**

## Tech Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **Build:** Vite
- **UI:** Tailwind CSS
- **Theory Engine:** tonal

### Backend
- **Framework:** FastAPI (Python)
- **AI:** Gemini API（理論解説の生成）
- **TTS:** VOICEVOX（音声読み上げ）

### 楽曲解析
- **曲検索:** YouTube Data API v3
- **音声取得:** yt-dlp（WAVダウンロード）
- **楽器分離:** Demucs（ドラム/ベース/ギター/ボーカル）
- **MIDI変換:** Basic Pitch（Spotify製オープンソース）
- **コード認識:** tonaljs

### インフラ
- **コンテナ:** Docker Compose（Frontend, VOICEVOX）
- **ホスト実行:** Backend（PyTorch/Demucs の MPS対応）

## 必要環境

- **macOS** (Apple Silicon推奨 - MPS加速対応)
- **Docker Desktop**
- **Python 3.11 または 3.12** (3.13以降は未対応)
- **ffmpeg** (`brew install ffmpeg`)

## クイックスタート

### 1. 環境変数を設定

```bash
cp .env.example .env
# .env を編集して以下を設定:
#   GEMINI_API_KEY=xxx
#   YOUTUBE_API_KEY=xxx
```

### 2. 起動（一発！）

```bash
./start.sh
```

これだけで以下が自動実行されます:
- Python仮想環境の作成・依存関係インストール
- Docker サービス起動（Frontend, VOICEVOX）
- Backend 起動（ホスト実行）

### 3. アクセス

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 4. 終了

```
Ctrl+C
```
（Docker サービスも自動停止します）

## 開発コマンド

```bash
# 通常起動（推奨）
./start.sh

# Docker サービスのみ起動
docker-compose up -d frontend voicevox

# ログ確認
docker-compose logs -f

# 停止
docker-compose down

# Frontend テスト
docker-compose exec frontend npm run test
docker-compose exec frontend npm run typecheck

# Backend テスト（ホスト実行）
cd backend
source .venv/bin/activate
pytest
```

## 音の表記

**数字ベース（mod 12）を採用:**

```
0  1  2  3  4  5  6  7  8  9  10  11
C  C# D  D# E  F  F# G  G# A  A#  B
```

メリット:
- インターバル = 引き算（例: 7 - 0 = 7半音）
- 移調 = 足し算（例: key=0 → key=2 は全部+2）
- DAW/MIDIとそのまま対応

## 関連ドキュメント

### プロジェクト設計

| ファイル | 内容 |
|----------|------|
| `CLAUDE.md` | プロジェクト全体の設計・方針・構造 |
| `Planning.md` | カリキュラム詳細（Phase 1-8）、実装順序 |

### 技術ドキュメント

| ファイル | 内容 |
|----------|------|
| `docs/FRONTEND.md` | フロントエンドアーキテクチャ（React/TypeScript） |
| `docs/BACKEND.md` | バックエンドアーキテクチャ（Python/FastAPI） |
| `docs/SONG_ANALYSIS.md` | 楽曲解析システムの技術詳細 |
| `docs/TROUBLESHOOTING.md` | よくある問題と解決方法 |

### 初心者向け（プログラミング未経験者向け）

| ファイル | 内容 | 所要時間 |
|----------|------|---------|
| `docs/beginners/01-WEB-BASICS.md` | Webアプリの基礎 | 30分 |
| `docs/beginners/02-TYPESCRIPT-BASICS.md` | TypeScript入門 | 45分 |
| `docs/beginners/03-REACT-BASICS.md` | React入門 | 60分 |
| `docs/beginners/04-PYTHON-FASTAPI.md` | Python/FastAPI入門 | 45分 |

## ライセンス

MIT
