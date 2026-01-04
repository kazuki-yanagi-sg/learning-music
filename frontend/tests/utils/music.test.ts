/**
 * 音楽ユーティリティのテスト
 */
import { describe, it, expect } from 'vitest'
import { pitchToNoteName, noteNameToPitch } from '../../src/types/music'

describe('pitchToNoteName', () => {
  it('C4 (中央のド) は MIDI 60', () => {
    expect(pitchToNoteName(60)).toBe('C4')
  })

  it('A4 (440Hz) は MIDI 69', () => {
    expect(pitchToNoteName(69)).toBe('A4')
  })

  it('C#4 は MIDI 61', () => {
    expect(pitchToNoteName(61)).toBe('C#4')
  })

  it('B3 は MIDI 59', () => {
    expect(pitchToNoteName(59)).toBe('B3')
  })
})

describe('noteNameToPitch', () => {
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

  it('双方向変換が一致する', () => {
    for (let pitch = 21; pitch <= 108; pitch++) {
      const noteName = pitchToNoteName(pitch)
      expect(noteNameToPitch(noteName)).toBe(pitch)
    }
  })
})
