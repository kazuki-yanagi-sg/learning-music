/**
 * ドラムキット定数 - 再生用のMIDIマッピングとサンプルURL
 *
 * 再生（audioEngine）専用のドラム定数を単一モジュールに集約する。
 * ※ 表示用のドラムマップ（DrumGrid / AnalysisDrumGrid）とは用途・値が異なるため統合しない。
 */

/** ドラムの再生サンプル種別 */
export type DrumSampleType = 'kick' | 'snare' | 'hihat' | 'hihatOpen' | 'tom' | 'crash' | 'ride'

// ドラムキットのマッピング（MIDIノート → 楽器）
export const DRUM_MAP: Record<number, DrumSampleType> = {
  36: 'kick',       // キック
  38: 'snare',      // スネア
  42: 'hihat',      // ハイハット(クローズ)
  46: 'hihatOpen',  // ハイハット(オープン)
  45: 'tom',        // ロータム
  47: 'tom',        // ミドルタム
  48: 'tom',        // ハイタム
  49: 'crash',      // クラッシュ
  51: 'ride',       // ライド
}

// ドラムサンプルURL（無料のドラムキット）
export const DRUM_SAMPLES_BASE = 'https://tonejs.github.io/audio/drum-samples/breakbeat13/'
export const DRUM_SAMPLE_URLS: Record<string, string> = {
  kick: DRUM_SAMPLES_BASE + 'kick.mp3',
  snare: DRUM_SAMPLES_BASE + 'snare.mp3',
  hihat: DRUM_SAMPLES_BASE + 'hihat.mp3',
  hihatOpen: DRUM_SAMPLES_BASE + 'hihat-open.mp3',
  tom: DRUM_SAMPLES_BASE + 'tom1.mp3',
  crash: DRUM_SAMPLES_BASE + 'crash.mp3',
  ride: DRUM_SAMPLES_BASE + 'ride.mp3',
}
