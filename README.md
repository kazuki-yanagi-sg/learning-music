# アニソン作曲学習アプリ

**音楽理論ゼロからオリジナルアニソン1曲（1分30秒以上）を完成させる**ための学習アプリ

## 核心機能

1. **理論学習** - Phase 1-8の段階的カリキュラム（70-90時間）
2. **楽曲検索・解析** - YouTubeで曲を検索 → 4トラック分離 → MIDI変換 → 耳コピ練習
3. **4トラック合成** - ドラム/ベース/キーボード/ギターで1曲作成
4. **AI解説** - Gemini APIによる理論解説・コード進行分析 + VOICEVOX音声ガイド（※音声ガイドは現在無効）

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
- **TTS:** VOICEVOX（音声読み上げ） ※現在は未使用のため一時的に無効化中（詳細は「クイックスタート」参照）

### 楽曲解析
- **曲検索:** YouTube Data API v3
- **音声取得:** yt-dlp（WAVダウンロード）
- **楽器分離:** Demucs（ドラム/ベース/ギター/ボーカル）
- **MIDI変換:** Basic Pitch（Spotify製オープンソース）
- **コード認識:** tonaljs

### インフラ
- **コンテナ:** Docker Compose（Frontend）
- **ホスト実行:** Backend（PyTorch/Demucs の MPS対応）

なぜ Backend だけホストで実行するのか: Demucs/PyTorch が Apple Silicon の GPU 加速（MPS）を使うためです。Docker コンテナ内では MPS が使えず処理が大幅に遅くなるので、Backend だけホストで直接動かしています。`docker-compose.yml` の `backend` サービスは `profiles: [docker-only]` になっており、通常の `docker-compose up` では起動しません（Docker完結構成にしたい場合のために残してあるだけです）。

> ⚠️ **個人学習専用（商用・再配布禁止）**
> 楽曲解析機能でダウンロードした音源・分離データは、解析後に削除してください。

## 必要環境

- **macOS**（Apple Silicon推奨 - MPS加速対応）
- **Docker Desktop**（起動しておくこと）
- **Python 3.11 または 3.12**（3.13以降は非対応。`start.sh` が起動時に自動判定し、対応バージョンが無ければエラーで停止します）
  - 未インストールの場合: `brew install python@3.12`
- **Homebrew**（`start.sh` が必要に応じて `brew install lame` を実行するため）
- **ffmpeg**（`brew install ffmpeg`）
- **git**

## クイックスタート

### 1. リポジトリを取得

```bash
git clone https://github.com/kazuki-yanagi-sg/learning-music.git
cd learning-music
```

### 2. 環境変数を設定

```bash
cp .env.example .env
# .env を編集して以下の必須項目を実際の値にする:
#   GEMINI_API_KEY=xxx    （取得: https://aistudio.google.com/app/apikey）
#   YOUTUBE_API_KEY=xxx   （取得: https://console.cloud.google.com/apis/credentials）
# VOICEVOX_HOST / FRONTEND_URL は自動設定される値なので変更不要
```

APIキーが未設定（プレースホルダのまま）だと、次の `start.sh` がエラーで停止します。

### 3. 起動（一発！）

```bash
./start.sh
```

（実行権限が無い場合は先に `chmod +x ./start.sh`）

これだけで以下が自動実行されます:
- Pythonバージョンの確認、`.env` とAPIキーの確認
- Python仮想環境（`backend/.venv`）の作成・依存関係インストール（PyTorch/Demucs/`requirements.txt` など）
- ポート5173を占有する他プロセスのチェック（警告のみ、自動停止はしません）
- Docker サービス起動（Frontend）
- storage ディレクトリの作成
- ポート8001の残プロセスの掃除
- Backend 起動（ホスト実行、port 8001）

> ⚠️ **初回起動は PyTorch・Demucs 等のダウンロードで数GB・10〜20分ほどかかります。**2回目以降はキャッシュされるため速くなります。
>
> ⚠️ **VOICEVOX（音声読み上げ）は現在無効化されています。** 重い処理でアプリからまだ呼び出していないため、`start.sh` 内で一時的にコメントアウトしています。

### 4. アクセス

- Frontend: http://localhost:5173
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

### 5. 終了

```
Ctrl+C
```
（Docker サービスも自動停止します。もし Backend が終了しない場合は、以下でプロセスを確認して手動で止めてください）

```bash
lsof -nP -tiTCP:8001 -sTCP:LISTEN
kill <PID>
```

## 開発コマンド

```bash
# 通常起動（推奨）
./start.sh

# Frontend のみ Docker 起動
docker-compose up -d frontend

# ログ確認
docker-compose logs -f frontend

# 停止
docker-compose down

# Frontend をローカルで直接動かす場合（package.json の scripts）
cd frontend
npm run dev         # vite --host（開発サーバー）
npm run build        # tsc && vite build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest（ウォッチモード）
npm run test:coverage
npx vitest run       # 1回だけ実行したい場合

# Frontend テスト・型チェック（Docker経由）
docker-compose exec frontend npm run test
docker-compose exec frontend npm run typecheck

# Backend テスト（ホスト実行）
cd backend
source .venv/bin/activate
pytest

# もしくは Docker で Backend テストのみ実行
docker-compose run --rm test
```

## トラブルシューティング（抜粋）

- **Python 3.13 で `start.sh` が止まる** → `brew install python@3.12` で 3.12 を導入してください。
- **`http://localhost:5173` で別のアプリが表示される** → 他プロジェクトの Vite サーバーがポート5173を占有している可能性があります。`start.sh` が実行中プロセスのPIDを警告表示するので、内容を確認した上で `kill <PID>` してください（自動停止はしません）。
- **`.env` のAPIキーが未設定でエラー終了する** → `.env` を開いて `GEMINI_API_KEY` / `YOUTUBE_API_KEY` を実際の値に置き換えてください。
- **初回起動がなかなか終わらない** → PyTorch/Demucs 等の数GBダウンロード中です。10〜20分ほど待ってください。
- 詳細は `docs/TROUBLESHOOTING.md` を参照してください。

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
