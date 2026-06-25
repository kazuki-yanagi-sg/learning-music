/**
 * 音楽解析サービスのユニットテスト
 *
 * コード認識・進行パターン検出はアプリの中核となる純粋ロジック。
 * 外部依存を持たないため、安全網としてここで振る舞いを固定する。
 */
import { describe, it, expect } from 'vitest'
import {
  pitchToNumber,
  detectChord,
  detectChordsByBeat,
  detectProgressionPattern,
  type DetectedChord,
} from '../../src/services/musicAnalysis'
import type { Note } from '../../src/types/music'

// テスト用ノート生成ヘルパー
function note(pitch: number, start = 0, duration = 1): Note {
  return { id: `${pitch}-${start}`, pitch, start, duration }
}

describe('pitchToNumber', () => {
  it('ピッチをmod12の数字表記にする', () => {
    expect(pitchToNumber(60)).toBe('0') // C
    expect(pitchToNumber(64)).toBe('4') // E
    expect(pitchToNumber(67)).toBe('7') // G
  })
})

describe('detectChord', () => {
  it('音が1つだけなら null', () => {
    expect(detectChord([note(60)])).toBeNull()
  })

  it('Cメジャートライアド [C,E,G] を maj / ルート0 / I と判定', () => {
    const chord = detectChord([note(60), note(64), note(67)], 0)
    expect(chord).not.toBeNull()
    expect(chord!.root).toBe(0)
    expect(chord!.type.name).toBe('maj')
    expect(chord!.degree).toBe('I')
    expect(chord!.function).toBe('T')
  })

  it('Aマイナートライアド [A,C,E] を min / ルート9 / vi と判定', () => {
    const chord = detectChord([note(57), note(60), note(64)], 0)
    expect(chord).not.toBeNull()
    expect(chord!.root).toBe(9)
    expect(chord!.type.name).toBe('min')
    expect(chord!.degree).toBe('vi')
  })

  it('ドミナント7th [G,B,D,F] を 7 と判定', () => {
    const chord = detectChord([note(67), note(71), note(74), note(77)], 0)
    expect(chord).not.toBeNull()
    expect(chord!.root).toBe(7)
    expect(chord!.type.name).toBe('7')
    expect(chord!.degree).toBe('V')
  })

  it('オクターブ違いの同音は無視される（[C, C+8va] は単一ピッチクラスで null）', () => {
    expect(detectChord([note(60), note(72)])).toBeNull()
  })
})

describe('detectChordsByBeat', () => {
  it('拍ごとにコードを検出する', () => {
    // beat 0: Cメジャー / beat 1: Aマイナー
    const notes: Note[] = [
      note(60, 0, 1), note(64, 0, 1), note(67, 0, 1),
      note(57, 1, 1), note(60, 1, 1), note(64, 1, 1),
    ]
    const byBeat = detectChordsByBeat(notes, 0)
    expect(byBeat.get(0)?.type.name).toBe('maj')
    expect(byBeat.get(0)?.root).toBe(0)
    expect(byBeat.get(1)?.type.name).toBe('min')
    expect(byBeat.get(1)?.root).toBe(9)
  })
})

describe('detectProgressionPattern', () => {
  // ルート・拍だけ持つ最小のコード列を作る
  function chordAt(root: number, beat: number): DetectedChord {
    return {
      root,
      rootName: pitchToNumber(root),
      type: { name: 'maj', nameJp: 'メジャー', intervals: [0, 4, 7], description: '' },
      beat,
    }
  }

  it('コードが3つ未満なら空配列', () => {
    expect(detectProgressionPattern([chordAt(5, 0), chordAt(7, 1)], 0)).toEqual([])
  })

  it('王道進行 [IV,V,iii,vi] を100%マッチで検出する', () => {
    // intervals [5,7,4,9]（keyRoot=0）
    const chords = [chordAt(5, 0), chordAt(7, 1), chordAt(4, 2), chordAt(9, 3)]
    const results = detectProgressionPattern(chords, 0)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].pattern.nameJp).toBe('王道進行')
    expect(results[0].confidence).toBe(1)
    expect(results[0].startBeat).toBe(0)
  })

  it('信頼度の高い順にソートされる', () => {
    const chords = [chordAt(5, 0), chordAt(7, 1), chordAt(4, 2), chordAt(9, 3)]
    const results = detectProgressionPattern(chords, 0)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence)
    }
  })
})
