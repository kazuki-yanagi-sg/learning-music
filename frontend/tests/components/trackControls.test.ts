/**
 * trackControls（音量→実効ミュート導出）の純ロジックテスト
 *
 * UI は音量スライダーのみ。ソロ/ミュートボタンは廃止し、
 * 音量0のトラックを鳴らさない（=スライダーで消音/ソロ相当を表現）。
 */
import { describe, it, expect } from 'vitest'
import {
  computeMutedFromVolumes,
  PLAYABLE_TRACKS,
} from '../../src/components/AnalysisPianoRollModal/trackControls'

describe('computeMutedFromVolumes', () => {
  const ALL = ['drums', 'bass', 'guitar', 'keyboard', 'melody']

  it('音量未設定（既定1）なら実効ミュートは空', () => {
    const r = computeMutedFromVolumes(ALL, {})
    expect(r.size).toBe(0)
  })

  it('音量0のトラックは実効ミュートになる', () => {
    const r = computeMutedFromVolumes(ALL, { bass: 0 })
    expect(r.has('bass')).toBe(true)
    expect(r.has('drums')).toBe(false)
  })

  it('正の音量はミュートにならない（小さくても鳴る）', () => {
    const r = computeMutedFromVolumes(ALL, { bass: 0.05, melody: 1.5 })
    expect(r.has('bass')).toBe(false)
    expect(r.has('melody')).toBe(false)
  })

  it('聴きたいトラック以外を0にすると「そのトラックだけ」になる（ソロ相当）', () => {
    // bass だけ鳴らす = bass 以外を0
    const volumes = { drums: 0, guitar: 0, keyboard: 0, melody: 0, bass: 1 }
    const r = computeMutedFromVolumes(ALL, volumes)
    expect(r.has('bass')).toBe(false)
    expect(r.has('drums')).toBe(true)
    expect(r.has('guitar')).toBe(true)
    expect(r.has('keyboard')).toBe(true)
    expect(r.has('melody')).toBe(true)
  })

  it('負の音量も無音扱い（防御的）', () => {
    const r = computeMutedFromVolumes(ALL, { drums: -0.1 })
    expect(r.has('drums')).toBe(true)
  })

  it('PLAYABLE_TRACKS に other は含まれない（元々非再生）', () => {
    expect(PLAYABLE_TRACKS).not.toContain('other')
    expect(PLAYABLE_TRACKS).toContain('melody')
  })
})
