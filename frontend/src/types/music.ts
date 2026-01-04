/**
 * 音楽関連の型定義
 */

/**
 * ノート（音符）
 * - pitch: MIDIノート番号（0-127、60 = C4）
 * - start: 開始位置（拍単位、0 = 1拍目）
 * - duration: 長さ（拍単位、1 = 1拍）
 */
export interface Note {
  id: string
  pitch: number
  start: number
  duration: number
}

/**
 * トラック種別
 */
export type TrackType = 'drum' | 'bass' | 'keyboard' | 'guitar'

/**
 * トラック
 */
export interface Track {
  id: string
  type: TrackType
  name: string
  notes: Note[]
  muted: boolean
  volume: number // 0-1
}

/**
 * プロジェクト全体
 */
export interface Project {
  id: string
  name: string
  bpm: number
  key: number // 0-11 (C=0, C#=1, ... B=11)
  tracks: Track[]
  totalBars: number // 小節数
}

/**
 * ピアノロールの設定
 */
export interface PianoRollConfig {
  // 表示範囲
  minPitch: number // 最低音（MIDIノート番号）
  maxPitch: number // 最高音
  visibleBars: number // 表示する小節数

  // グリッド
  beatsPerBar: number // 1小節の拍数（通常4）
  gridDivision: number // グリッドの細かさ（4 = 4分音符、8 = 8分音符）

  // サイズ
  noteHeight: number // 1音の高さ（px）
  beatWidth: number // 1拍の幅（px）
}

/**
 * トラック種別ごとのデフォルト設定
 */
export const TRACK_CONFIGS: Record<TrackType, Partial<PianoRollConfig>> = {
  drum: {
    minPitch: 35, // B1（キック）
    maxPitch: 59, // B3（ハイハット等）
    noteHeight: 20,
  },
  bass: {
    minPitch: 28, // E1
    maxPitch: 55, // G3
    noteHeight: 16,
  },
  keyboard: {
    minPitch: 48, // C3
    maxPitch: 84, // C6
    noteHeight: 12,
  },
  guitar: {
    minPitch: 40, // E2
    maxPitch: 76, // E5
    noteHeight: 12,
  },
}

/**
 * デフォルトのピアノロール設定
 */
export const DEFAULT_PIANO_ROLL_CONFIG: PianoRollConfig = {
  minPitch: 48,
  maxPitch: 72,
  visibleBars: 4,
  beatsPerBar: 4,
  gridDivision: 4,
  noteHeight: 16,
  beatWidth: 40,
}

/**
 * MIDIノート番号から音名を取得
 * @param pitch MIDIノート番号
 * @returns 音名（例: "0⁽⁴⁾", "4⁽⁵⁾"）
 *
 * 表記: n⁽ᵏ⁾
 * - n = 音の種類（0〜11）
 * - k = オクターブ番号
 */
export function pitchToNoteName(pitch: number): string {
  const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']
  const n = pitch % 12
  const k = Math.floor(pitch / 12) - 1

  // オクターブ番号を上付き文字に変換
  const kStr = k.toString().split('').map(d => superscripts[parseInt(d)]).join('')

  return `${n}⁽${kStr}⁾`
}

/**
 * 音名からMIDIノート番号を取得
 * @param noteName 音名（例: "C4", "F#5"）
 * @returns MIDIノート番号
 */
export function noteNameToPitch(noteName: string): number {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const match = noteName.match(/^([A-G]#?)(\d+)$/)
  if (!match) throw new Error(`Invalid note name: ${noteName}`)

  const [, note, octaveStr] = match
  const noteIndex = noteNames.indexOf(note)
  const octave = parseInt(octaveStr, 10)

  return (octave + 1) * 12 + noteIndex
}
