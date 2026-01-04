# CLAUDE.md - アニソン作曲学習アプリ

## Overview

アニソン作曲を学ぶための学習アプリ。
理論解説 + 演習 + AI 音声ガイドで、音楽未経験者でも 1 曲完成を目指す。

## 関連ドキュメント

| ファイル      | 内容                                              |
| ------------- | ------------------------------------------------- |
| `Planning.md` | カリキュラム詳細（Phase 1-8）、演習設計、実装順序 |
| `README.md`   | セットアップ手順、クイックスタート                |

## 現在のステータス

```
Phase: 設計完了、実装未着手
Next:  環境構築（docker-compose）→ Phase 1 実装開始
```

---

## Mission

**ユーザーが音楽理論ゼロからオリジナルアニソン 1 曲（1 分 30 秒以上）を完成させられる状態になる**

### ターゲット

- 音名ぐらいしかわからない初心者
- 理論的に「なぜそうなるか」を理解したい人

### 成功の定義

- イントロ →A メロ →B メロ → サビ → アウトロの構成がある
- コード進行とメロディを自分で作れている
- 理論的に「なぜそうしたか」を説明できる

### スコープ

```
対象:
  - 作曲（コード進行、メロディ、曲構成）
  - 音楽理論の理解
  - 既存曲の解析・参照（必須）
    → ユーザーが「この曲みたいなの作りたい」を実現するため
    → 理論と実曲を繋げて記憶に定着させる
  - 基本4楽器の役割理解（作曲に必要な範囲）
    → ドラム: リズム/テンポの理解
    → ベース: ルート音/コード進行の土台
    → キーボード: 和音/メロディの視覚化
    → ギター: コードボイシング

対象外:
  - 本格的な編曲（各楽器の詳細アレンジ）
  - ミキシング・マスタリング
  - 歌詞
  - DAWの詳細な操作方法
```

### 学習時間の目安

```
Phase 1: 音の基礎         →  2-3時間
Phase 2: 和声の基礎       →  3-4時間
Phase 3: コード進行       →  5-6時間
Phase 4: メロディ         →  6-8時間
Phase 5: リズム           →  2-3時間
Phase 6: 曲構成           →  3-4時間
Phase 7: 実践             → 15-20時間
Phase 8: 統合（7レッスン）→ 30-40時間
  8.1 各楽器の役割       →  2-3時間
  8.2 リズム隊           →  4-5時間
  8.3 +キーボード        →  3-4時間
  8.4 +ギター            →  3-4時間
  8.5 セクション別       →  4-5時間
  8.6 サビ完成           →  6-8時間
  8.7 フル構成完成       → 10-15時間
─────────────────────────────────
合計: 約 70-90時間

目安ペース:
  週10時間（集中）  → 7-9週間（約2ヶ月）
  週5時間（普通）   → 14-18週間（約4ヶ月）
  週3時間（ゆっくり）→ 6-7ヶ月

※ 論理的思考力が高い人を想定。
※ 「理解」と「できる」は別。演習量が鍵。
※ 商品化を見据えた本格的なカリキュラム。
```

## 開発方針

### TDD（テスト駆動開発）

```
※ TDDを正とする。テストなしのコードは原則マージしない。

開発フロー:
  1. テストを先に書く（Red）
  2. テストが通る最小限のコードを書く（Green）
  3. リファクタリングする（Refactor）

Frontend (Vitest + React Testing Library):
  場所: frontend/tests/
  命名: xxx.test.ts, xxx.test.tsx
  実行: npm run test

Backend (pytest):
  場所: backend/tests/
  命名: test_xxx.py
  実行: pytest
  設定: conftest.py にフィクスチャを集約

テストの種類:
  - Unit: 関数・クラス単体（services/, utils/）
  - Integration: API エンドポイント（routers/）
  - Component: UIコンポーネント（components/）

ルール:
  - 実装前にテストを書く
  - テストが通らないコードはマージしない
  - モック・スタブは tests/ 内に配置
```

### 学習アプローチ

**理論先行型**を採用（成人の脳は論理的に理解 → 記憶が効率的）

```
理論を学ぶ → 実際に音で確認 → 課題で定着 → 次のステップへ
```

## Tech Stack

### Frontend

- **Framework:** React 18+ with TypeScript
- **Build:** Vite
- **UI:** Tailwind CSS
- **Theory Engine:** `tonal`

### Backend

- **Framework:** FastAPI (Python)
- **AI:** Gemini API（解説文の生成）
- **TTS:** VOICEVOX（音声読み上げ）
- **楽曲検索:** YouTube Data API v3
- **音声ダウンロード:** yt-dlp
- **MIDI変換:** Magenta (onsets_frames)

### 楽曲解析フロー（耳コピ・参照機能）

```
⚠️ これは本アプリの核となる機能
⚠️ 個人学習専用（商品化なし）

フロー:
1. ユーザーが「この曲みたいなの作りたい」で検索（YouTube Data API v3）
2. YouTube URLを取得
3. yt-dlpでMP3ダウンロード
4. Magenta (onsets_frames) でMIDI変換
5. tonaljsでコード認識
6. Geminiで解説生成
7. ユーザーが参照しながら自分の曲を作成

✓ フル楽曲解析が可能:
  - イントロ〜アウトロまで全セクション
  - コード進行
  - 楽器配置（4トラック）
  - リズムパターン
  - セクション間の遷移

⚠️ 著作権に関する注意:
  - 個人の学習目的でのみ使用
  - 解析結果の再配布・商用利用は禁止
  - ダウンロードした音源は解析後に削除

※ 手動DBは作らない（リアルタイム解析のみ）
```

### アーキテクチャ

```
[Frontend]           [Backend]              [External]
  Vite          →     FastAPI          →    Gemini API
  React               (port 8000)           YouTube Data API
  (port 5173)              ↓
                      VOICEVOX Engine
                      (port 50021)
                           ↓
                      yt-dlp（音声ダウンロード）
                           ↓
                      Magenta（MIDI変換、Docker）
```

- Frontend → Backend: REST API
- Backend で API キーを管理（Gemini, YouTube）
- VOICEVOX はバックエンド経由で呼び出し
- yt-dlp でYouTubeから音声をダウンロード
- Magenta (onsets_frames) でMIDI変換（Docker推奨）

### 音楽理論解析の役割分担

```
Frontend (tonaljs):
  - リアルタイム解析（即時フィードバック）
  - コード認識、インターバル計算
  - ユーザーが音を置いた瞬間の反応
  → 遅延なしでUX向上

Backend (Python):
  - Geminiと連携した詳細解説の生成
  - 進行パターンのマッチング
  - 演習の正誤判定
  - 解説文の音声化（VOICEVOX）
  → 重い処理・外部API連携
```

## Core Concepts

### Pitch Class (音高表記)

**数字ベース（mod 12）を採用:**

```
0  1  2  3  4  5  6  7  8  9  10  11
C  C# D  D# E  F  F# G  G# A  A#  B
```

**理由:**

- インターバル計算が単純な引き算になる
- 移調が加算で完結する
- DAW/MIDI との親和性が高い

**コード表記例:**

- メジャートライアド: `[0, 4, 7]`（ルートからの相対距離）
- マイナートライアド: `[0, 3, 7]`
- ドミナント 7th: `[0, 4, 7, 10]`

### アニソンの特徴

- **構成:** イントロ →A メロ →B メロ → サビ →...
- **進行:** 王道進行、小室進行、Just the Two of Us 進行
- **テンポ:** 140-180 BPM が多い
- **転調:** サビ前や落ちサビで頻出

### UI 構成

```
メイン画面（4トラック固定）:
┌─────────────────────────────────────────────────┐
│ [レッスン]  [楽曲検索 🔍]           [▶ 再生]    │
├─────────────────────────────────────────────────┤
│ ドラム   │ ████ ████ ████ ████ │              │
├──────────┼──────────────────────┤              │
│ ベース   │ ▬▬▬  ▬▬▬  ▬▬▬  ▬▬▬  │   [❓解説]  │
├──────────┼──────────────────────┤              │
│ キーボード│ ♪♪♪  ♪♪♪  ♪♪♪  ♪♪♪  │              │
├──────────┼──────────────────────┤              │
│ ギター   │ ≋≋≋  ≋≋≋  ≋≋≋  ≋≋≋  │              │
├─────────────────────────────────────────────────┤
│ BPM: 140   Key: 0 (C)   [各トラック音量調整]   │
└─────────────────────────────────────────────────┘

解説: モーダル形式（必要な時だけ表示）
楽曲検索: モーダルで曲を検索 → コード進行を表示・解析
```

**設計意図:**

- 4 トラック固定 → インストバンド構成がわかりやすい
- 同一画面で全体を見ながら編集
- 楽器固定でシンプル（初心者向け）
- 解説はモーダル → 必要な時だけ表示
- 楽曲検索 → 「この曲みたいな」を参照可能

## Project Structure

```
/
├── frontend/                # Vite + React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Lesson/            # 各レッスンのUI
│   │   │   ├── PianoRoll/         # ピアノロール
│   │   │   ├── TheoryPanel/       # 理論解説パネル
│   │   │   └── Exercise/          # 練習問題
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   │   └── theoryTranslator.ts
│   │   └── constants/
│   ├── tests/                     # Frontendテスト
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
│
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── main.py              # エントリーポイント
│   │   ├── routers/
│   │   │   ├── theory.py        # 理論解説API
│   │   │   ├── tts.py           # VOICEVOX連携
│   │   │   ├── exercise.py      # 演習API
│   │   │   └── song_analysis.py # 楽曲解析API（YouTube/yt-dlp/Magenta）
│   │   ├── services/
│   │   │   ├── gemini.py        # Gemini API連携
│   │   │   ├── voicevox.py      # VOICEVOX連携
│   │   │   ├── analyzer.py      # 音楽理論解析
│   │   │   ├── youtube.py       # YouTube Data API連携（曲検索、URL取得）
│   │   │   ├── audio_downloader.py  # yt-dlp連携（MP3ダウンロード）
│   │   │   └── magenta.py       # Magenta連携（音声→MIDI変換）
│   │   ├── models/
│   │   └── prompts/             # プロンプト管理（md形式）
│   │       ├── SYSTEM_THEORY_EXPLAINER.md
│   │       ├── SYSTEM_EXERCISE_FEEDBACK.md
│   │       ├── SYSTEM_COMPOSITION_REVIEW.md
│   │       ├── SYSTEM_SONG_ANALYSIS.md      # 楽曲解析結果の解説生成
│   │       ├── SYSTEM_DRUM_ADVISOR.md       # ドラムパターンのアドバイス
│   │       ├── SYSTEM_BASS_ADVISOR.md       # ベースラインのアドバイス
│   │       ├── SYSTEM_KEYBOARD_ADVISOR.md   # コードボイシングのアドバイス
│   │       ├── SYSTEM_GUITAR_ADVISOR.md     # ストロークパターンのアドバイス
│   │       ├── SYSTEM_INTEGRATION_ADVISOR.md # 4トラック統合のアドバイス
│   │       └── USER_TEMPLATES/
│   │           ├── chord_analysis.md
│   │           └── interval_quiz.md
│   ├── tests/                   # Backendテスト
│   │   ├── routers/
│   │   ├── services/
│   │   └── conftest.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── lessons/                 # レッスンデータ（JSON）
│   ├── phase1-basics/
│   │   ├── lesson1-1-pitch.json
│   │   └── lesson1-2-interval.json
│   ├── phase2-harmony/
│   ├── phase3-progression/
│   ├── phase4-melody/
│   ├── phase5-rhythm/
│   ├── phase6-structure/
│   ├── phase7-practice/
│   └── phase8-integration/
│       ├── lesson8-1-roles.json        # 各楽器の役割
│       ├── lesson8-2-rhythm-section.json # リズム隊
│       ├── lesson8-3-add-keyboard.json  # +キーボード
│       ├── lesson8-4-add-guitar.json    # +ギター
│       ├── lesson8-5-section-arrange.json # セクション別
│       ├── lesson8-6-chorus-complete.json # サビ完成
│       └── lesson8-7-full-complete.json  # フル構成完成
│
├── docker-compose.yml
└── README.md
```

## 環境構築

**Docker Compose を使用**

```yaml
services:
  frontend: # Vite + React (port 5173)
  backend: # FastAPI (port 8000)
  voicevox: # VOICEVOX Engine (port 50021)
```

## Key Commands

```bash
# Docker
docker-compose up -d          # 全サービス起動
docker-compose down           # 停止
docker-compose logs -f        # ログ確認

# Frontend
docker-compose exec frontend npm run dev
docker-compose exec frontend npm run build
docker-compose exec frontend npm run typecheck

# Backend
docker-compose exec backend uvicorn app.main:app --reload
docker-compose exec backend pytest
```

## Coding Conventions

- 日本語コメントを積極的に使用
- 型は明示的に定義（`types/`に集約）
- 解説文は初心者にわかる平易な言葉
- 1 レッスン = 1 ディレクトリ

## 運用・保守

### コード規約

- フォルダ・ファイル・クラス・関数・変数で明確に分ける
- 何度も使用できるものは関数化してまとめる
- ネストの深さは 2 まで
- コメントは必ずつける
- 一目でわかる名称をつける
- プロンプトは一個のファイルに書く
- 接頭辞に`SYSTEM_`, `USER_`でプロンプトを分類する
- 可能な限り`pydantic`を使用する。

### Git 運用

```
ブランチ戦略:
  main     ← 本番リリース用
  develop  ← 開発統合用
  feature/xxx ← 機能開発用

コミットメッセージ:
  feat:     新機能追加
  fix:      バグ修正
  docs:     ドキュメント
  refactor: リファクタリング
  test:     テスト追加・修正
  chore:    雑務（依存関係更新など）

例: feat: インターバル解析機能を追加
```

### 環境変数

```
管理ファイル:
  .env.example  ← テンプレート（リポジトリに含める）
  .env          ← 実際の値（.gitignoreに追加）

必須変数:
  GEMINI_API_KEY=xxx
  YOUTUBE_API_KEY=xxx
  VOICEVOX_HOST=http://voicevox:50021
  FRONTEND_URL=http://localhost:5173

ルール:
  - 本番キーは絶対にコミットしない
  - 新しい環境変数を追加したら .env.example も更新

⚠️ 重要: API キーは既に取得済み
  - モックデータで代用しない
  - 開発時から実際のAPIを使用する
  - Gemini, YouTube 等は本物のAPIを叩く
```

### API 設計

```
規約:
  - RESTful に統一
  - エンドポイント: /api/v1/xxx
  - メソッド: GET（取得）, POST（作成）, PUT（更新）, DELETE（削除）

レスポンス形式:
  成功: { "success": true, "data": T }
  失敗: { "success": false, "error": { "code": "E001", "message": "説明" } }

エラーコード:
  E001: バリデーションエラー
  E002: 認証エラー
  E003: 外部API連携エラー（Gemini, VOICEVOX）
  E004: 内部エラー
```

### ログ・エラーハンドリング

```
Backend (Python):
  - logging モジュールで統一
  - レベル: DEBUG, INFO, WARNING, ERROR
  - 本番は INFO 以上を出力

Frontend (TypeScript):
  - console.error はキャッチしたエラーのみ
  - ユーザー向けエラーは日本語で表示

例外処理:
  - 握りつぶさない（必ずログを残す）
  - ユーザーに適切なフィードバックを返す
```

---

## Future TODO（将来の拡張）

```
現在の到達点: アマチュア上級（理論を理解し、自力で1曲作れる）

次のステップ（優先度順）:
  [ ] 編曲編（楽器アレンジ、音色選び）
  [ ] ミキシング・マスタリング編
  [ ] セミプロレベルへの拡張

⚠️ 重要: ユーザーがチェックを入れるまで実装しないこと
⚠️ LLMが勝手に着手してはいけない
⚠️ まずは現在のスコープ（Phase 1-8）を完成させる
```
