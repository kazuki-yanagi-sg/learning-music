/**
 * 音楽解析サービス
 *
 * コード認識、進行パターン検出、解説生成
 */
import { Note } from '../types/music'

// 音名（数字表記と従来表記）
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// 数字表記に変換
export function pitchToNumber(pitch: number): string {
  return String(pitch % 12)
}

// 音名に変換
export function pitchToNoteName(pitch: number): string {
  return NOTE_NAMES[pitch % 12]
}

// コードタイプ定義
export interface ChordType {
  name: string
  nameJp: string
  intervals: number[]
  description: string
}

// 和音パターン（距離の組み合わせ）
export const CHORD_TYPES: ChordType[] = [
  { name: 'maj', nameJp: 'メジャー', intervals: [0, 4, 7], description: '明るい響き' },
  { name: 'min', nameJp: 'マイナー', intervals: [0, 3, 7], description: '暗い・切ない響き' },
  { name: 'maj7', nameJp: 'メジャー7', intervals: [0, 4, 7, 11], description: 'おしゃれな響き' },
  { name: 'min7', nameJp: 'マイナー7', intervals: [0, 3, 7, 10], description: '切なくおしゃれ' },
  { name: '7', nameJp: 'ドミナント7', intervals: [0, 4, 7, 10], description: '解決したい緊張感' },
  { name: 'sus4', nameJp: 'サス4', intervals: [0, 5, 7], description: '浮遊感' },
  { name: 'sus2', nameJp: 'サス2', intervals: [0, 2, 7], description: '開放的' },
  { name: 'dim', nameJp: 'ディミニッシュ', intervals: [0, 3, 6], description: '不安定・緊張' },
  { name: 'aug', nameJp: 'オーギュメント', intervals: [0, 4, 8], description: '神秘的' },
  { name: 'add9', nameJp: 'アド9', intervals: [0, 2, 4, 7], description: '広がりのある響き' },
  { name: '5', nameJp: 'パワーコード', intervals: [0, 7], description: '力強い・ロック' },
]

// 検出されたコード
export interface DetectedChord {
  root: number          // ルート音（0-11）
  rootName: string      // ルート音の名前
  type: ChordType       // コードタイプ
  beat: number          // 拍位置
  degree?: string       // キー内でのディグリー（I, ii, iii, etc.）
  function?: string     // 機能（T, SD, D）
}

// コード進行パターン
export interface ProgressionPattern {
  name: string
  nameJp: string
  degrees: string[]     // ディグリー表記
  intervals: number[]   // ルートからの距離（0=I, 5=IV, 7=V, 9=vi, etc.）
  description: string
  examples: string[]
}

// アニソン頻出進行パターン
export const PROGRESSION_PATTERNS: ProgressionPattern[] = [
  {
    name: 'Royal Road',
    nameJp: '王道進行',
    degrees: ['IV', 'V', 'iii', 'vi'],
    intervals: [5, 7, 4, 9],
    description: '壮大で感動的。アニソンの定番。',
    examples: ['残酷な天使のテーゼ', '紅蓮華'],
  },
  {
    name: 'Komuro',
    nameJp: '小室進行',
    degrees: ['vi', 'IV', 'V', 'I'],
    intervals: [9, 5, 7, 0],
    description: '切なくも力強い。90年代アニソンの定番。',
    examples: ['Get Wild', 'HOT LIMIT'],
  },
  {
    name: 'Canon',
    nameJp: 'カノン進行',
    degrees: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    intervals: [0, 7, 9, 4, 5, 0, 5, 7],
    description: '王道中の王道。安定感抜群。',
    examples: ['パッヘルベルのカノン', '愛をこめて花束を'],
  },
  {
    name: 'Just The Two Of Us',
    nameJp: 'JTTU進行',
    degrees: ['IVmaj7', 'III7', 'vi'],
    intervals: [5, 4, 9],
    description: 'おしゃれで都会的。夜の街の雰囲気。',
    examples: ['丸の内サディスティック', 'Pretender'],
  },
  {
    name: 'Pop Punk',
    nameJp: 'ポップパンク進行',
    degrees: ['I', 'V', 'vi', 'IV'],
    intervals: [0, 7, 9, 5],
    description: '明るく前向き。ポップな曲に最適。',
    examples: ['Let It Go', '前前前世'],
  },
  {
    name: 'Sad',
    nameJp: '切ない進行',
    degrees: ['vi', 'V', 'IV', 'V'],
    intervals: [9, 7, 5, 7],
    description: '切ない雰囲気。バラードに最適。',
    examples: ['花束を君に', '未来へ'],
  },
  {
    name: 'Dramatic',
    nameJp: 'ドラマチック進行',
    degrees: ['I', 'III7', 'vi', 'V'],
    intervals: [0, 4, 9, 7],
    description: 'ドラマチックで感動的。',
    examples: ['名前のない怪物', 'シルエット'],
  },
]

// ダイアトニックコードの定義（メジャーキー）
export const DIATONIC_CHORDS = [
  { degree: 'I', interval: 0, quality: 'maj', function: 'T' },
  { degree: 'ii', interval: 2, quality: 'min', function: 'SD' },
  { degree: 'iii', interval: 4, quality: 'min', function: 'T' },
  { degree: 'IV', interval: 5, quality: 'maj', function: 'SD' },
  { degree: 'V', interval: 7, quality: 'maj', function: 'D' },
  { degree: 'vi', interval: 9, quality: 'min', function: 'T' },
  { degree: 'vii°', interval: 11, quality: 'dim', function: 'D' },
]

/**
 * ノートの配列からコードを検出
 */
export function detectChord(notes: Note[], keyRoot: number = 0): DetectedChord | null {
  if (notes.length < 2) return null

  // ピッチクラスを取得してユニークに
  const pitchClasses = [...new Set(notes.map((n) => n.pitch % 12))].sort((a, b) => a - b)
  if (pitchClasses.length < 2) return null

  // 各音をルートとして試す
  for (const root of pitchClasses) {
    // ルートからの距離を計算
    const distances = pitchClasses.map((p) => (p - root + 12) % 12).sort((a, b) => a - b)

    // パターンマッチング
    for (const chordType of CHORD_TYPES) {
      if (distances.length === chordType.intervals.length &&
          distances.every((d, i) => d === chordType.intervals[i])) {

        // ディグリーと機能を計算
        const rootInterval = (root - keyRoot + 12) % 12
        const diatonic = DIATONIC_CHORDS.find(d => d.interval === rootInterval)

        return {
          root,
          rootName: pitchToNumber(root),
          type: chordType,
          beat: Math.min(...notes.map(n => n.start)),
          degree: diatonic?.degree,
          function: diatonic?.function,
        }
      }
    }
  }

  return null
}

/**
 * 拍ごとにコードを検出
 */
export function detectChordsByBeat(notes: Note[], keyRoot: number = 0): Map<number, DetectedChord> {
  const notesByBeat: Map<number, Note[]> = new Map()

  // 拍ごとにグループ化（同時に鳴っているノートを考慮）
  notes.forEach((note) => {
    // ノートがカバーする全ての拍を考慮
    for (let beat = Math.floor(note.start); beat < note.start + note.duration; beat++) {
      if (!notesByBeat.has(beat)) notesByBeat.set(beat, [])
      notesByBeat.get(beat)!.push(note)
    }
  })

  const result = new Map<number, DetectedChord>()
  notesByBeat.forEach((beatNotes, beat) => {
    const chord = detectChord(beatNotes, keyRoot)
    if (chord) {
      chord.beat = beat
      result.set(beat, chord)
    }
  })

  return result
}

/**
 * コード進行からパターンを検出
 */
export function detectProgressionPattern(
  chords: DetectedChord[],
  keyRoot: number
): { pattern: ProgressionPattern; startBeat: number; confidence: number }[] {
  if (chords.length < 3) return []

  const results: { pattern: ProgressionPattern; startBeat: number; confidence: number }[] = []

  // 各パターンをチェック
  for (const pattern of PROGRESSION_PATTERNS) {
    const patternLength = pattern.intervals.length

    // スライディングウィンドウでマッチング
    for (let i = 0; i <= chords.length - patternLength; i++) {
      const windowChords = chords.slice(i, i + patternLength)
      const windowIntervals = windowChords.map(c => (c.root - keyRoot + 12) % 12)

      // マッチ度を計算
      let matches = 0
      for (let j = 0; j < patternLength; j++) {
        if (windowIntervals[j] === pattern.intervals[j]) {
          matches++
        }
      }

      const confidence = matches / patternLength
      if (confidence >= 0.75) { // 75%以上マッチで検出
        results.push({
          pattern,
          startBeat: windowChords[0].beat,
          confidence,
        })
      }
    }
  }

  // 信頼度でソート
  return results.sort((a, b) => b.confidence - a.confidence)
}

/**
 * コード進行の解説を生成
 */
export function generateProgressionAnalysis(
  chords: DetectedChord[],
  patterns: { pattern: ProgressionPattern; startBeat: number; confidence: number }[],
  _keyRoot: number
): string[] {
  const insights: string[] = []

  // コード数
  if (chords.length > 0) {
    insights.push(`${chords.length}個のコードを検出しました`)
  }

  // パターン検出結果
  if (patterns.length > 0) {
    const topPattern = patterns[0]
    const confidence = Math.round(topPattern.confidence * 100)
    insights.push(
      `【${topPattern.pattern.nameJp}】を検出 (${confidence}%マッチ)`
    )
    insights.push(topPattern.pattern.description)
    if (topPattern.pattern.examples.length > 0) {
      insights.push(`例: ${topPattern.pattern.examples.slice(0, 2).join(', ')}`)
    }
  }

  // 機能和声の分析
  const functions = chords.map(c => c.function).filter(Boolean)
  if (functions.length > 0) {
    const tCount = functions.filter(f => f === 'T').length
    const sdCount = functions.filter(f => f === 'SD').length
    const dCount = functions.filter(f => f === 'D').length

    if (dCount > 0 && tCount > 0) {
      insights.push('ドミナント→トニックの解決感があります')
    }
    if (sdCount > tCount) {
      insights.push('サブドミナントが多く、展開感があります')
    }
  }

  // キー外の音
  const outOfKey = chords.filter(c => !c.degree)
  if (outOfKey.length > 0) {
    insights.push(`借用和音または転調の可能性: ${outOfKey.length}個`)
  }

  return insights
}

/**
 * コードのディグリー表記を取得
 */
export function chordToDegree(chord: DetectedChord): string {
  if (chord.degree) {
    // メジャー/マイナーの表記を追加
    const suffix = chord.type.name === 'maj' ? '' :
                   chord.type.name === 'min' ? '' :
                   chord.type.name
    return chord.degree + suffix
  }
  // ダイアトニック外のコード
  return `${chord.rootName}${chord.type.name === 'maj' ? '' : chord.type.nameJp}`
}

/**
 * コード進行を文字列で表示
 */
export function progressionToString(chords: DetectedChord[]): string {
  return chords.map(c => chordToDegree(c)).join(' → ')
}
