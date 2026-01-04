# アニソン作曲学習アプリ

**音楽理論ゼロからオリジナルアニソン1曲（1分30秒以上）を完成させる**ための学習アプリ

## 核心機能

1. **理論学習** - Phase 1-8の段階的カリキュラム（70-90時間）
2. **楽曲検索・解析** - Spotifyで曲を検索 → コード進行を解析 → 耳コピ練習
3. **4トラック合成** - ドラム/ベース/キーボード/ギターで1曲作成
4. **AI解説** - Gemini APIによる理論解説 + VOICEVOX音声ガイド

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
- **曲検索:** Spotify API（preview_url 30秒取得）
- **音声→MIDI:** Basic Pitch（OSS）
- **コード認識:** tonaljs

### インフラ
- **コンテナ:** Docker Compose

## クイックスタート

### 1. 環境変数を設定

```bash
cp .env.example .env
# .env を編集して以下を設定:
#   GEMINI_API_KEY=xxx
#   SPOTIFY_CLIENT_ID=xxx
#   SPOTIFY_CLIENT_SECRET=xxx
```

### 2. 起動

```bash
docker-compose up -d
```

### 3. アクセス

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 開発コマンド

```bash
# 全サービス起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down

# Frontend
docker-compose exec frontend npm run dev
docker-compose exec frontend npm run build
docker-compose exec frontend npm run typecheck
docker-compose exec frontend npm run test

# Backend
docker-compose exec backend pytest
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

| ファイル | 内容 |
|----------|------|
| `CLAUDE.md` | プロジェクト全体の設計・方針・構造 |
| `Planning.md` | カリキュラム詳細（Phase 1-8）、実装順序 |

## ライセンス

MIT
