/**
 * 音楽ユーティリティのテスト
 *
 * 注: 本アプリは音高をピアノロール上で「数字表記 n⁽ᵏ⁾」で表示する設計
 *     （CLAUDE.md「Pitch Class: 数字ベース(mod 12)を採用」）。
 *     そのため pitchToNoteName は "C4" ではなく "0⁽⁴⁾" を返すのが正。
 *     ここでは現状の振る舞いを固定する（特性化テスト）。
 */
import { describe, it, expect } from 'vitest'
import { pitchToNoteName, noteNameToPitch } from '../../src/types/music'

describe('pitchToNoteName（数字表記 n⁽ᵏ⁾）', () => {
  it('MIDI 60（中央のド）は 0⁽⁴⁾', () => {
    expect(pitchToNoteName(60)).toBe('0⁽⁴⁾')
  })

  it('MIDI 69（A4=440Hz）は 9⁽⁴⁾', () => {
    expect(pitchToNoteName(69)).toBe('9⁽⁴⁾')
  })

  it('MIDI 61（C#4）は 1⁽⁴⁾', () => {
    expect(pitchToNoteName(61)).toBe('1⁽⁴⁾')
  })

  it('MIDI 59（B3）は 11⁽³⁾', () => {
    expect(pitchToNoteName(59)).toBe('11⁽³⁾')
  })

  it('オクターブ番号は上付き文字で表す（MIDI 0 → 0⁽⁻¹⁾相当の桁変換）', () => {
    // pitch 12 → n=0, k=floor(12/12)-1=0 → "0⁽⁰⁾"
    expect(pitchToNoteName(12)).toBe('0⁽⁰⁾')
  })
})

describe('noteNameToPitch（文字表記 → MIDI番号）', () => {
  it('C4 → 60', () => {
    expect(noteNameToPitch('C4')).toBe(60)
  })

  it('A4 → 69', () => {
    expect(noteNameToPitch('A4')).toBe(69)
  })

  it('C#4 → 61', () => {
    expect(noteNameToPitch('C#4')).toBe(61)
  })

  it('B3 → 59', () => {
    expect(noteNameToPitch('B3')).toBe(59)
  })

  it('不正な音名は例外を投げる', () => {
    expect(() => noteNameToPitch('not-a-note')).toThrow()
  })
})
