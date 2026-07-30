/**
 * audioEngine の 6stem 対応テスト（設計書 B-4）
 *
 * play4TrackAnalysis の switch に guitar→sfGuitar / keyboard→sfPiano を追加し、
 * - guitar トラック: sfGuitar.play で再生されること
 * - keyboard トラック: sfPiano.play で再生されること
 * - other トラック: 引き続き sfGuitar.play で再生されること（後方互換）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ---- Tone.js モック -------------------------------------------------------
const FAKE_FREQ = 261.6
const FAKE_NOTE = 'C4'

const scheduledCallbacks: Array<(time: number) => void> = []

vi.mock('tone', () => {
  const Frequency = () => ({
    toFrequency: () => FAKE_FREQ,
    toNote: () => FAKE_NOTE,
  })
  const transport = {
    bpm: { value: 140 },
    position: 0,
    seconds: 0,
    schedule: (cb: (time: number) => void) => {
      scheduledCallbacks.push(cb)
      return scheduledCallbacks.length
    },
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    clear: vi.fn(),
  }
  return {
    start: vi.fn(async () => {}),
    getTransport: () => transport,
    getContext: () => ({ rawContext: {} }),
    Frequency,
    Volume: class {},
    Sampler: class {},
    MembraneSynth: class {},
    NoiseSynth: class {},
    MetalSynth: class {},
    MonoSynth: class {},
    PolySynth: class {},
    PluckSynth: class {},
    Synth: class {},
  }
})

vi.mock('soundfont-player', () => ({
  default: { instrument: vi.fn() },
}))

import { audioEngine } from '../../src/services/audioEngine'

// 楽器モック生成ヘルパー
function makeSf() {
  return { play: vi.fn(), stop: vi.fn() }
}
function makeSynth() {
  return { triggerAttackRelease: vi.fn() }
}

// private フィールドへアクセス
const engine = audioEngine as unknown as Record<string, unknown>

/** soundfont 有無を指定してモック楽器を注入する */
function setup(opts: { soundfontsLoaded: boolean; drumSamplesLoaded: boolean }) {
  // melody は sfMelody（独立ピアノ音源）で再生（keyboard は sfPiano）
  const sf = { sfBass: makeSf(), sfPiano: makeSf(), sfGuitar: makeSf(), sfMelody: makeSf() }
  const synth = {
    bass: makeSynth(),
    keyboard: makeSynth(),
    guitar: makeSynth(),
    kick: makeSynth(),
    snare: makeSynth(),
    hihat: makeSynth(),
    tom: makeSynth(),
    crash: makeSynth(),
    ride: makeSynth(),
  }
  const drumSampler = makeSynth()

  Object.assign(engine, {
    isInitialized: true,
    isPlaying: false,
    bpm: 60,
    scheduledEvents: [],
    soundfontsLoaded: opts.soundfontsLoaded,
    drumSamplesLoaded: opts.drumSamplesLoaded,
    drumSampler,
    ...sf,
    ...synth,
  })

  scheduledCallbacks.length = 0
  return { sf, synth, drumSampler }
}

function flushScheduled(time: number) {
  for (const cb of [...scheduledCallbacks]) {
    cb(time)
  }
}

const PITCH = 60
const TIME = 2.5
const notes = [{ pitch: PITCH, start: 0, end: 0.5 }]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('play4TrackAnalysis - guitar/keyboard 音源マッピング（B-4）', () => {
  it('guitar トラック(soundfont あり) → sfGuitar.play で再生されること', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ guitar: notes })
    flushScheduled(TIME)
    expect(sf.sfGuitar.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
  })

  it('keyboard トラック(soundfont あり) → sfPiano.play で再生されること', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ keyboard: notes })
    flushScheduled(TIME)
    expect(sf.sfPiano.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
  })

  it('guitar トラック(soundfont なし) → guitar.triggerAttackRelease(freq, duration, time)', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ guitar: notes })
    flushScheduled(TIME)
    expect(synth.guitar.triggerAttackRelease).toHaveBeenCalledWith(FAKE_FREQ, 0.5, TIME)
  })

  it('keyboard トラック(soundfont なし) → keyboard.triggerAttackRelease(note, duration, time)', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ keyboard: notes })
    flushScheduled(TIME)
    expect(synth.keyboard.triggerAttackRelease).toHaveBeenCalledWith(FAKE_NOTE, 0.5, TIME)
  })

  it('other トラック(soundfont あり) → sfGuitar.play（後方互換）', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ other: notes })
    flushScheduled(TIME)
    expect(sf.sfGuitar.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
  })

  it('melody トラック(soundfont あり) → sfMelody.play（独立ピアノ音源）', () => {
    // melody は sfMelody（acoustic_grand_piano・独立ゲインノード）で再生。
    // 音量はマスターGainNode管理のため per-note gain は渡さない。
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ melody: notes })
    flushScheduled(TIME)
    expect(sf.sfMelody.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
  })

  it('bass トラック(soundfont あり) → sfBass.play（後方互換）', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ bass: notes })
    flushScheduled(TIME)
    expect(sf.sfBass.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
  })
})

describe('IAudioEngine - play4TrackAnalysis シグネチャ（B-2）', () => {
  it('guitar/keyboard を含む tracks オブジェクトで play4TrackAnalysis が呼べること', () => {
    // play4TrackAnalysis が guitar/keyboard を受け入れるシグネチャを持つことを確認
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    const handle = audioEngine.play4TrackAnalysis({
      drums: [],
      bass: [],
      other: [],
      melody: [],
      guitar: notes,
      keyboard: notes,
    })
    expect(handle).toHaveProperty('stop')
    expect(handle).toHaveProperty('seek')
    flushScheduled(TIME)
    // guitar → sfGuitar
    expect(sf.sfGuitar.play).toHaveBeenCalled()
    // keyboard → sfPiano
    expect(sf.sfPiano.play).toHaveBeenCalled()
  })
})
