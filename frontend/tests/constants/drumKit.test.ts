/**
 * ドラムキット定数の特性化テスト
 *
 * 再生用の DRUM_MAP / DRUM_SAMPLE_URLS は audioEngine の再生挙動を決める。
 * 単一モジュール化（値の移設のみ）で値が変わっていないことを安全網として固定する。
 */
import { describe, it, expect } from 'vitest'
import {
  DRUM_MAP,
  DRUM_SAMPLE_URLS,
  DRUM_SAMPLES_BASE,
} from '../../src/constants/drumKit'

describe('DRUM_MAP（MIDIノート → 再生サンプル種別）', () => {
  it('現状の全エントリと完全一致する', () => {
    expect(DRUM_MAP).toEqual({
      36: 'kick',
      38: 'snare',
      42: 'hihat',
      46: 'hihatOpen',
      45: 'tom',
      47: 'tom',
      48: 'tom',
      49: 'crash',
      51: 'ride',
    })
  })

  it('エントリ数が9個である', () => {
    expect(Object.keys(DRUM_MAP)).toHaveLength(9)
  })
})

describe('DRUM_SAMPLE_URLS（種別 → サンプルURL）', () => {
  it('ベースURLが現状値と一致する', () => {
    expect(DRUM_SAMPLES_BASE).toBe(
      'https://tonejs.github.io/audio/drum-samples/breakbeat13/'
    )
  })

  it('各種別のURLが現状値と完全一致する', () => {
    expect(DRUM_SAMPLE_URLS).toEqual({
      kick: 'https://tonejs.github.io/audio/drum-samples/breakbeat13/kick.mp3',
      snare: 'https://tonejs.github.io/audio/drum-samples/breakbeat13/snare.mp3',
      hihat: 'https://tonejs.github.io/audio/drum-samples/breakbeat13/hihat.mp3',
      hihatOpen:
        'https://tonejs.github.io/audio/drum-samples/breakbeat13/hihat-open.mp3',
      tom: 'https://tonejs.github.io/audio/drum-samples/breakbeat13/tom1.mp3',
      crash: 'https://tonejs.github.io/audio/drum-samples/breakbeat13/crash.mp3',
      ride: 'https://tonejs.github.io/audio/drum-samples/breakbeat13/ride.mp3',
    })
  })
})
