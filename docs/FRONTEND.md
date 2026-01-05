# フロントエンド アーキテクチャ

React + TypeScript + Vite で構築されたSPA。

## 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 18+ | UIライブラリ |
| TypeScript | 5+ | 型安全性 |
| Vite | 5+ | ビルドツール |
| Tailwind CSS | 3+ | スタイリング |
| tonal | - | 音楽理論計算 |
| Tone.js | - | Web Audio API |

## ディレクトリ構成

```
frontend/src/
├── main.tsx                 # エントリーポイント
├── App.tsx                  # ルートコンポーネント
├── components/
│   ├── PianoRoll/          # ピアノロール（メロディ入力）
│   ├── DrumGrid/           # ドラムグリッド（リズム入力）
│   ├── TheoryPanel/        # 理論解説パネル
│   ├── SongSearchModal/    # 楽曲検索モーダル
│   ├── AnalysisPianoRollModal/  # 解析結果表示
│   ├── LessonModal/        # レッスンモーダル
│   └── HelpModal/          # ヘルプモーダル
├── services/
│   ├── songAnalysisApi.ts  # バックエンドAPI呼び出し
│   └── audioEngine.ts      # Tone.js音声再生
├── hooks/                  # カスタムフック
├── types/                  # 型定義
└── utils/                  # ユーティリティ
```

## コンポーネント詳細

### App.tsx - ルートコンポーネント

全体のレイアウトと状態管理を担当。

```
┌─────────────────────────────────────────────────┐
│ ヘッダー（レッスン、楽曲検索ボタン）              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────────────────────────┐ │
│  │ Track    │  │                              │ │
│  │ Controls │  │   PianoRoll / DrumGrid       │ │
│  │          │  │                              │ │
│  └──────────┘  └──────────────────────────────┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│ フッター（BPM、キー、再生コントロール）          │
└─────────────────────────────────────────────────┘
```

### SongSearchModal - 楽曲検索

**責務:** YouTube検索 → 解析実行 → 結果表示

```typescript
// 状態管理
const [query, setQuery] = useState('')           // 検索クエリ
const [videos, setVideos] = useState([])         // 検索結果
const [analysisResult, setAnalysisResult] = useState(null)  // 解析結果
const [isAnalyzing, setIsAnalyzing] = useState(false)       // 解析中フラグ
const [progress, setProgress] = useState(null)   // 進捗情報
```

**処理フロー:**

```
1. ユーザーが検索キーワード入力
   ↓
2. searchSongs(query) → YouTube Data API
   ↓
3. 検索結果リスト表示
   ↓
4. ユーザーが曲を選択（標準 or 4トラック）
   ↓
5. analyze4Tracks(videoId) → バックエンドAPI
   ↓
6. 結果を analysisResult に保存
   ↓
7. 「ピアノロールで表示」ボタン → AnalysisPianoRollModal
```

### AnalysisPianoRollModal - 解析結果表示

**責務:** 4トラックのノートをピアノロールで可視化

```typescript
// Props
interface Props {
  isOpen: boolean
  onClose: () => void
  result: AnalysisResult | FourTrackResult  // 解析結果
}
```

**4トラック判定:**

```typescript
function isFourTrackResult(result): result is FourTrackResult {
  return 'tracks' in result  // tracks プロパティの有無で判定
}
```

**トラック設定:**

```typescript
const TRACK_CONFIG = {
  drums: {
    label: 'Drums',
    color: '#ef4444',      // 赤
    defaultPitchRange: { min: 35, max: 52 },
  },
  bass: {
    label: 'Bass',
    color: '#22c55e',      // 緑
    defaultPitchRange: { min: 28, max: 55 },
  },
  other: {
    label: 'Guitar/Keys',
    color: '#3b82f6',      // 青
    defaultPitchRange: { min: 48, max: 84 },
  },
  vocals: {
    label: 'Vocals',
    color: '#a855f7',      // 紫
    defaultPitchRange: { min: 48, max: 84 },
  },
}
```

**レンダリング:**

```
4トラックの場合:
┌─────────────────────────────────────┐
│ Drums   [ミュート]                   │
│ ████ ████ ████ ████ ████ ████      │
├─────────────────────────────────────┤
│ Bass    [ミュート]                   │
│ ▬▬▬ ▬▬▬ ▬▬▬ ▬▬▬ ▬▬▬ ▬▬▬           │
├─────────────────────────────────────┤
│ Guitar/Keys [ミュート]               │
│ ♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪           │
└─────────────────────────────────────┘
```

## サービス層

### songAnalysisApi.ts - API クライアント

バックエンドとの通信を担当。

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// 曲検索
export async function searchSongs(query: string, limit: number = 10): Promise<SearchResult>

// 動画詳細取得
export async function getVideo(videoId: string): Promise<YouTubeVideo>

// 標準解析
export async function analyzeVideo(videoId: string): Promise<AnalysisResult>

// 4トラック解析
export async function analyze4Tracks(videoId: string): Promise<FourTrackResult>

// SSEストリーミング解析（進捗表示）
export function analyzeVideoWithProgress(
  videoId: string,
  onProgress: (event: AnalysisProgressEvent) => void
): { abort: () => void }
```

**型定義:**

```typescript
// ノート情報
interface NoteInfo {
  pitch: number     // MIDIノート番号 (0-127)
  start: number     // 開始時間（秒）
  end: number       // 終了時間（秒）
  velocity: number  // 音量 (1-127)
}

// 4トラック結果
interface FourTrackResult {
  video_id: string
  title: string
  tempo: number
  tracks: {
    drums: { notes: NoteInfo[], error?: string }
    bass: { notes: NoteInfo[], error?: string }
    other: { notes: NoteInfo[], error?: string }
    vocals: { notes: NoteInfo[], error?: string }
  }
  chords: ChordInfo[]
  analysis_text: string | null
}
```

### audioEngine.ts - 音声再生

Tone.js を使用した MIDI 再生エンジン。

```typescript
class AudioEngine {
  private synths: Map<string, Tone.PolySynth>

  async init(): Promise<void>  // AudioContext 初期化

  // 4トラック再生
  play4TrackAnalysis(
    tracks: { drums?: NoteInfo[], bass?: NoteInfo[], other?: NoteInfo[] },
    mutedTracks: Set<string>,
    onProgress: (time: number) => void
  ): { stop: () => void }
}
```

**楽器別シンセ:**

```typescript
// ドラム: MembraneSynth（キック）、NoiseSynth（スネア/ハイハット）
// ベース: MonoSynth（低音特化）
// その他: PolySynth（和音対応）
```

## データフロー

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │     │  Component  │     │   Service   │
│  Action     │────▶│   State     │────▶│    API      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │                   ▼
                           │            ┌─────────────┐
                           │            │  Backend    │
                           │            │   API       │
                           │            └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │    UI       │◀────│  Response   │
                    │  Render     │     │   Data      │
                    └─────────────┘     └─────────────┘
```

## React パターン

### useMemo - 計算結果のキャッシュ

```typescript
// トラックデータの変換（resultが変わらない限り再計算しない）
const tracksData = useMemo(() => {
  if (isFourTrackResult(result)) {
    return {
      drums: result.tracks.drums?.notes || [],
      bass: result.tracks.bass?.notes || [],
      // ...
    }
  }
  return { default: result.notes || [] }
}, [result])
```

### useCallback - 関数のメモ化

```typescript
// ミュート切り替え関数（再レンダリング時に再生成しない）
const toggleMute = useCallback((trackType: string) => {
  setMutedTracks(prev => {
    const next = new Set(prev)
    if (next.has(trackType)) next.delete(trackType)
    else next.add(trackType)
    return next
  })
}, [])
```

### useRef - DOM参照 / 値の保持

```typescript
// 再生中のインスタンス参照（レンダリングに影響しない値）
const playbackRef = useRef<{ stop: () => void } | null>(null)
```

## 参考文献

### React / TypeScript

- [React 公式ドキュメント](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Qiita: React Hooks の使い方](https://qiita.com/seira/items/f063e262b1d57d7e78b4)
- [Qiita: useMemo と useCallback の違い](https://qiita.com/soarflat/items/b9d3d17b8ab1f5dbfed2)

### Tailwind CSS

- [Tailwind CSS 公式](https://tailwindcss.com/)
- [Qiita: Tailwind CSS 入門](https://qiita.com/takeshisakuma/items/c1d05f2a5ad1c2a7dc23)

### Web Audio / Tone.js

- [Tone.js 公式](https://tonejs.github.io/)
- [MDN: Web Audio API](https://developer.mozilla.org/ja/docs/Web/API/Web_Audio_API)
- [Qiita: Tone.js で音楽アプリを作る](https://qiita.com/miso_develop/items/2c8b270cee8c8b3a9b19)

### Vite

- [Vite 公式](https://vitejs.dev/)
- [Qiita: Vite + React + TypeScript 環境構築](https://qiita.com/y-suzu/items/7d92c49e14c6d41d9e14)

### 音楽理論ライブラリ

- [tonal 公式](https://github.com/tonaljs/tonal)
- [Qiita: tonal.js で音楽理論を扱う](https://qiita.com/because_its_there/items/d9f5f5dd9d13db2ae00a)
