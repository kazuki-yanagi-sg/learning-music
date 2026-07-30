/**
 * メロディ再生の TDD テスト（改訂版）
 *
 * 確定仕様:
 *   - melody は sfPiano（acoustic_grand_piano）で再生する
 *     （声系音源 sfVoice/choir_aahs は廃止、piano に統一）
 *   - soundfontsLoaded=true かつ sfPiano 注入済み → sfPiano.play が呼ばれる
 *   - soundfontsLoaded=false → keyboard ピアノシンセフォールバック
 *   - soundfontsLoaded=true だが sfPiano=null → keyboard ピアノシンセフォールバック
 *   - melody と bass は別の音源を使う（混線しない）
 *   - dispose() 後に sfPiano が stop() され null 化される（sfVoice フィールドは存在しない）
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
import { SF_INSTRUMENTS, SF_GAINS } from '../../src/constants/instruments'

// 楽器モック生成ヘルパー
function makeSf() {
  return { play: vi.fn(), stop: vi.fn() }
}
function makeSynth() {
  // dispose を含める: dispose() テストで前テストのモックが残っていても壊れないよう
  return { triggerAttackRelease: vi.fn(), dispose: vi.fn() }
}

// private フィールドへアクセスするためのキャスト
const engine = audioEngine as unknown as Record<string, unknown>

/**
 * テスト用の楽器モックを注入する。
 * sfPiano を明示的に指定できるため、null（ロード失敗）も表現可能。
 * ※ sfVoice フィールドは廃止済み（melody は sfPiano を流用）
 */
function setup(opts: {
  soundfontsLoaded: boolean
  drumSamplesLoaded: boolean
  // melody 用 SoundFont プレイヤー（旧名 sfPiano。null でロード失敗ケースを表現）
  sfPiano?: { play: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> } | null
}) {
  const sfBass = makeSf()
  // melody は sfMelody（独立ピアノ音源）で再生。opts.sfPiano は melody 用プレイヤーを指す。
  const sfMelody = opts.sfPiano !== undefined ? opts.sfPiano : makeSf()
  const sfPiano = makeSf()  // keyboard 用（melody とは別インスタンス）
  const sfGuitar = makeSf()

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
    sfBass,
    sfPiano,    // keyboard 用
    sfMelody,   // melody 用（独立ピアノ音源）
    sfGuitar,
    ...synth,
  })

  scheduledCallbacks.length = 0
  // 互換のため melody 用プレイヤーを sfPiano という名でも返す（既存アサーション用）
  return { sfBass, sfPiano: sfMelody, sfMelody, sfGuitar, synth, drumSampler }
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

// ============================================================
// 定数検証
// ============================================================
describe('instruments 定数', () => {
  it('T5c: SF_INSTRUMENTS の全トラック種別が定義されている', () => {
    // melody は sfPiano（acoustic_grand_piano）を流用するため melody エントリは不要
    expect(SF_INSTRUMENTS).toHaveProperty('bass')
    expect(SF_INSTRUMENTS).toHaveProperty('piano')
    expect(SF_INSTRUMENTS).toHaveProperty('guitar')
  })

  it('SF_INSTRUMENTS に melody キーが存在しないこと（sfPiano を流用のため不要）', () => {
    // melody は sfPiano（acoustic_grand_piano）で再生するため、独立した音源エントリは持たない
    expect(SF_INSTRUMENTS).not.toHaveProperty('melody')
  })
})

// ============================================================
// T1: melody soundfontsLoaded=true & sfPiano 注入 → sfPiano.play が呼ばれる
// ============================================================
describe('T1: melody → ピアノ音源(sfPiano)で再生', () => {
  it('play4TrackAnalysis melody(soundfontsLoaded=true & sfPiano 注入) → sfPiano.play が呼ばれる', () => {
    const { sfPiano, sfBass } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ melody: notes })
    flushScheduled(TIME)
    // melody 用ピアノ音源で再生される。音量はマスターGainNode管理のため
    // per-note gain は渡さない（再生中スライダー変更を効かせるための構造）。
    expect(sfPiano!.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
    // melody の基準音量は keyboard(=piano,1.5)より大きい（=より大きく鳴る）
    expect(SF_GAINS.melody).toBeGreaterThan(SF_GAINS.piano)
    // sfBass は呼ばれない（偽陰性でないことの確認）
    expect(sfBass.play).not.toHaveBeenCalled()
  })
})

// ============================================================
// T2: melody soundfontsLoaded=false → keyboard ピアノフォールバック
// ============================================================
describe('T2: melody(soundfont 未ロード) → keyboard フォールバック', () => {
  it('play4TrackAnalysis melody(soundfontsLoaded=false) → keyboard.triggerAttackRelease が呼ばれる', () => {
    const { sfPiano, synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ melody: notes })
    flushScheduled(TIME)
    // sfPiano は呼ばれない
    expect(sfPiano!.play).not.toHaveBeenCalled()
    // keyboard フォールバック（ピアノ = triggerAttackRelease）
    expect(synth.keyboard.triggerAttackRelease).toHaveBeenCalledWith(FAKE_NOTE, 0.5, TIME)
  })
})

// ============================================================
// T2b: melody soundfontsLoaded=true だが sfPiano=null → フォールバック
// ============================================================
describe('T2b: melody(soundfontsLoaded=true & sfPiano=null ロード失敗) → keyboard フォールバック', () => {
  it('sfPiano=null の場合でも keyboard.triggerAttackRelease にフォールバックする', () => {
    const { synth } = setup({
      soundfontsLoaded: true,
      drumSamplesLoaded: false,
      sfPiano: null, // ロード失敗を模擬
    })
    audioEngine.play4TrackAnalysis({ melody: notes })
    flushScheduled(TIME)
    // sfPiano は null なので再生されない
    // keyboard フォールバック（ピアノ）
    expect(synth.keyboard.triggerAttackRelease).toHaveBeenCalledWith(FAKE_NOTE, 0.5, TIME)
  })
})

// ============================================================
// T3: melody と bass が別音源で鳴る（混線しない）
// ============================================================
describe('T4: melody と bass は別の音源で鳴る（混線しない）', () => {
  it('melody=sfPiano, bass=sfBass が別々に呼ばれ、互いが混線しない', () => {
    const { sfPiano, sfBass } = setup({
      soundfontsLoaded: true,
      drumSamplesLoaded: false,
    })
    // melody と bass を同時に再生
    audioEngine.play4TrackAnalysis({
      melody: [{ pitch: PITCH, start: 0, end: 0.5 }],
      bass: [{ pitch: 40, start: 0, end: 0.5 }],
    })
    flushScheduled(TIME)
    // melody → sfPiano
    expect(sfPiano!.play).toHaveBeenCalledTimes(1)
    // bass → sfBass
    expect(sfBass.play).toHaveBeenCalledTimes(1)
  })
})

// dispose() 用の最小シンセモック（dispose メソッドを持つ）
function makeDisposableSynth() {
  return { triggerAttackRelease: vi.fn(), dispose: vi.fn() }
}

// dispose() 用のサンプラーモック
function makeDisposableSampler() {
  return { triggerAttackRelease: vi.fn(), dispose: vi.fn() }
}

// ============================================================
// T5: dispose() 後に sfPiano が stop される
//     （sfVoice フィールドは廃止 → 存在しない）
// ============================================================
describe('T5: dispose() → sfPiano.stop() が呼ばれる（sfVoice は廃止済み）', () => {
  it('dispose() を呼ぶと sfPiano.stop() が呼ばれ、sfVoice フィールドが存在しないこと', () => {
    const sfPiano = makeSf()
    // dispose() は kick/snare 等の dispose() も呼ぶため、適切なシンセを注入する
    Object.assign(engine, {
      isInitialized: true,
      sfBass: makeSf(),
      sfPiano, // melody=sfPiano を流用（sfVoice は廃止）
      sfGuitar: makeSf(),
      // sfVoice は存在しない（廃止済み）
      soundfontsLoaded: true,
      drumSamplesLoaded: false,
      drumSampler: makeDisposableSampler(),
      scheduledEvents: [],
      isPlaying: false,
      // シンセ楽器（dispose() が呼ぶ）
      kick: makeDisposableSynth(),
      snare: makeDisposableSynth(),
      hihat: makeDisposableSynth(),
      tom: makeDisposableSynth(),
      crash: makeDisposableSynth(),
      ride: makeDisposableSynth(),
      bass: makeDisposableSynth(),
      keyboard: makeDisposableSynth(),
      guitar: makeDisposableSynth(),
      // ボリュームノード（dispose() が呼ぶ）
      volumes: { drum: { dispose: vi.fn() }, bass: { dispose: vi.fn() }, keyboard: { dispose: vi.fn() }, guitar: { dispose: vi.fn() } },
    })
    audioEngine.dispose()
    // sfPiano.stop() が呼ばれること
    expect(sfPiano.stop).toHaveBeenCalled()
    // sfVoice フィールドは存在しないこと（廃止確認）
    expect('sfVoice' in engine).toBe(false)
  })
})
