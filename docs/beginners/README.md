# 初心者向けドキュメント

プログラミング未経験者でも理解できるように、基礎から段階的に説明したドキュメント集です。

## 学習順序

以下の順番で読むことを推奨します:

```
1. Web基礎     → 2. TypeScript → 3. React → 4. Python/FastAPI
   ↓                ↓              ↓           ↓
   Web全体像を     フロントエンド    UIの        バックエンド
   理解する        の言語を学ぶ     作り方を学ぶ  の仕組みを学ぶ
```

## ドキュメント一覧

| ファイル | 内容 | 所要時間 |
|---------|------|---------|
| [01-WEB-BASICS.md](./01-WEB-BASICS.md) | Webアプリの基礎（HTTP, API, JSON） | 30分 |
| [02-TYPESCRIPT-BASICS.md](./02-TYPESCRIPT-BASICS.md) | TypeScript入門（変数、関数、型） | 45分 |
| [03-REACT-BASICS.md](./03-REACT-BASICS.md) | React入門（コンポーネント、Hooks） | 60分 |
| [04-PYTHON-FASTAPI.md](./04-PYTHON-FASTAPI.md) | Python/FastAPI入門（API作成） | 45分 |

**合計: 約3時間**

## 前提知識

これらのドキュメントは以下を前提としています:

- パソコンの基本操作ができる
- テキストエディタを使える
- ターミナル（コマンドライン）を開ける

プログラミング経験は不要です。

## このドキュメントで学べること

### 01-WEB-BASICS.md

- Webアプリとは何か
- フロントエンドとバックエンドの違い
- HTTPリクエスト/レスポンス
- APIとJSON

### 02-TYPESCRIPT-BASICS.md

- 変数と型
- 関数の書き方
- 配列とオブジェクト
- async/await（非同期処理）

### 03-REACT-BASICS.md

- コンポーネントとは
- JSXの書き方
- Props（データの受け渡し）
- State（状態管理）
- Hooks（useState, useEffect, useMemo など）

### 04-PYTHON-FASTAPI.md

- Pythonの基本文法
- FastAPIでのAPI作成
- Pydanticでの型定義
- エラーハンドリング

## 次のステップ

基礎を理解したら、以下のドキュメントに進んでください:

| ファイル | 内容 |
|---------|------|
| [../FRONTEND.md](../FRONTEND.md) | フロントエンドの詳細アーキテクチャ |
| [../BACKEND.md](../BACKEND.md) | バックエンドの詳細アーキテクチャ |
| [../SONG_ANALYSIS.md](../SONG_ANALYSIS.md) | 楽曲解析システムの技術詳細 |
| [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md) | よくある問題と解決方法 |

## 学習のコツ

1. **手を動かす**: 読むだけでなく、実際にコードを書いてみる
2. **エラーを恐れない**: エラーは学習のチャンス
3. **少しずつ**: 一度に全部理解しようとしない
4. **分からなければ検索**: Qiitaや公式ドキュメントを参照

## 質問があれば

このアプリのコードを見ながら、ドキュメントと照らし合わせると理解が深まります:

- フロントエンド: `frontend/src/` ディレクトリ
- バックエンド: `backend/app/` ディレクトリ
