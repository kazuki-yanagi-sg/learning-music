/**
 * audioEngine の特性化テスト（リファクタの安全網）
 *
 * 目的:
 *   楽器再生の逐語重複を private ヘルパーに一本化する（REFACTOR_PLAN #5）にあたり、
 *   「どの分岐で・どのオブジェクトの・どのメソッドが・どの引数で」呼ばれるかを固定する。
 *   音源選択（soundfont 有無）と、即時(time なし)/スケジュール(time あり)の両系統を網羅する。
 *
 * 方針:
 *   - Tone.js / soundfont-player をモックし、外部I/Oを排除する。
 *   - midiToFreq / midiToNote は Tone.Frequency のモックで決定論的に固定する。
 *   - スケジュール再生は Transport.schedule で渡されたコールバックを捕捉し、
 *     既知の time を渡して同期実行することで「time 付き」の引数列を検証する。
 *   - 楽器インスタンス(sfXxx / synth / drumSampler / kick等)はテスト用モックを
 *     private フィールドへ直接注入して、呼び出し引数を assert する（挙動は変えない）。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ---- Tone.js モック ----------------------------------------------------------
// midiToFreq / midiToNote が決定論的になるよう Frequency をスタブする。
// pitch=60 → freq=261.6 / note='C4' 固定（値そのものは検証対象ではなく、
// 「synth には freq、soundfont/keyboard には note」を渡す使い分けが検証対象）。
const FAKE_FREQ = 261.6
const FAKE_NOTE = 'C4'

// Transport.schedule に渡されたコールバックを溜める器
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
      return scheduledCallbacks.length // eventId
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
    // クラスは init() で使うが、本テストでは init() を呼ばず
    // 直接フィールド注入するため最小スタブで十分
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

// モック定義後に import（vi.mock は巻き上げられる）
import { audioEngine } from '../../src/services/audioEngine'

// ---- 楽器モック生成ヘルパー ---------------------------------------------------
function makeSf() {
  return { play: vi.fn(), stop: vi.fn() }
}
function makeSynth() {
  return { triggerAttackRelease: vi.fn() }
}

// private フィールドへアクセスするためのキャスト
const engine = audioEngine as unknown as Record<string, unknown>

// 楽器モック一式を注入し、soundfont 有無を切り替える
function setup(opts: { soundfontsLoaded: boolean; drumSamplesLoaded: boolean }) {
  // melody は sfPiano を流用するため sfVoice は廃止済み
  const sf = { sfBass: makeSf(), sfPiano: makeSf(), sfGuitar: makeSf() }
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
    bpm: 60, // duration 計算を単純化（duration = note.duration * (60/bpm) = note.duration）
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

// スケジュールされた全コールバックを既知の time で実行する
function flushScheduled(time: number) {
  // play4Track / playAnalysis は末尾に「曲の終わり検出」コールバックを積む。
  // それは stop() を呼ぶだけなので、time を渡しても triggerNote は呼ばれない。
  for (const cb of [...scheduledCallbacks]) {
    cb(time)
  }
}

const PITCH = 60 // → FAKE_FREQ / FAKE_NOTE
const KICK_PITCH = 36 // DRUM_MAP[36] = 'kick'
const SNARE_PITCH = 38 // 'snare'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('playNote（即時再生・time 引数なし）', () => {
  it('bass: soundfont あり → sfBass.play(note, undefined, {duration})', () => {
    const { sf, synth } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.playNote('bass', PITCH, 0.5)
    expect(sf.sfBass.play).toHaveBeenCalledTimes(1)
    expect(sf.sfBass.play).toHaveBeenCalledWith(FAKE_NOTE, undefined, { duration: 0.5 })
    expect(synth.bass.triggerAttackRelease).not.toHaveBeenCalled()
  })

  it('bass: soundfont なし → bass.triggerAttackRelease(freq, duration)（time なし=引数2個）', () => {
    const { sf, synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.playNote('bass', PITCH, 0.5)
    expect(synth.bass.triggerAttackRelease).toHaveBeenCalledTimes(1)
    expect(synth.bass.triggerAttackRelease).toHaveBeenCalledWith(FAKE_FREQ, 0.5)
    // time なし＝引数は2個ちょうど
    expect(synth.bass.triggerAttackRelease.mock.calls[0]).toHaveLength(2)
    expect(sf.sfBass.play).not.toHaveBeenCalled()
  })

  it('keyboard: soundfont あり → sfPiano.play(note, undefined, {duration})', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.playNote('keyboard', PITCH, 0.5)
    expect(sf.sfPiano.play).toHaveBeenCalledWith(FAKE_NOTE, undefined, { duration: 0.5 })
  })

  it('keyboard: soundfont なし → keyboard.triggerAttackRelease(note, duration)（freq でなく note）', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.playNote('keyboard', PITCH, 0.5)
    expect(synth.keyboard.triggerAttackRelease).toHaveBeenCalledWith(FAKE_NOTE, 0.5)
    expect(synth.keyboard.triggerAttackRelease.mock.calls[0]).toHaveLength(2)
  })

  it('guitar: soundfont あり → sfGuitar.play(note, undefined, {duration})', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.playNote('guitar', PITCH, 0.5)
    expect(sf.sfGuitar.play).toHaveBeenCalledWith(FAKE_NOTE, undefined, { duration: 0.5 })
  })

  it('guitar: soundfont なし → guitar.triggerAttackRelease(freq, duration)（freq を使う）', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.playNote('guitar', PITCH, 0.5)
    expect(synth.guitar.triggerAttackRelease).toHaveBeenCalledWith(FAKE_FREQ, 0.5)
    expect(synth.guitar.triggerAttackRelease.mock.calls[0]).toHaveLength(2)
  })

  it('drum: サンプラーあり → drumSampler.triggerAttackRelease(sampleNote, "8n")（time なし）', () => {
    const { drumSampler } = setup({ soundfontsLoaded: false, drumSamplesLoaded: true })
    audioEngine.playNote('drum', KICK_PITCH)
    expect(drumSampler.triggerAttackRelease).toHaveBeenCalledWith('C1', '8n')
    expect(drumSampler.triggerAttackRelease.mock.calls[0]).toHaveLength(2)
  })

  it('drum: サンプラーなし kick → kick.triggerAttackRelease("C1", "8n")（time なし）', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.playNote('drum', KICK_PITCH)
    expect(synth.kick.triggerAttackRelease).toHaveBeenCalledWith('C1', '8n')
    expect(synth.kick.triggerAttackRelease.mock.calls[0]).toHaveLength(2)
  })

  it('drum: サンプラーなし snare → snare.triggerAttackRelease("8n")（time なし）', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.playNote('drum', SNARE_PITCH)
    expect(synth.snare.triggerAttackRelease).toHaveBeenCalledWith('8n')
    expect(synth.snare.triggerAttackRelease.mock.calls[0]).toHaveLength(1)
  })
})

describe('play → triggerNote（スケジュール再生・time 付き）', () => {
  const TIME = 1.23
  // play() は note.start から "bars:beats:0" を作るだけ。time は schedule のコールバックに渡る。
  const track = (type: string, pitch: number = PITCH) => ({
    id: type,
    type,
    volume: 1,
    muted: false,
    notes: [{ id: 'n', pitch, start: 0, duration: 0.5 }],
  })

  it('bass: soundfont あり → sfBass.play(note, time, {duration})', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play([track('bass')] as never)
    flushScheduled(TIME)
    expect(sf.sfBass.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
  })

  it('bass: soundfont なし → bass.triggerAttackRelease(freq, duration, time)（引数3個）', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.play([track('bass')] as never)
    flushScheduled(TIME)
    expect(synth.bass.triggerAttackRelease).toHaveBeenCalledWith(FAKE_FREQ, 0.5, TIME)
    expect(synth.bass.triggerAttackRelease.mock.calls[0]).toHaveLength(3)
  })

  it('keyboard: soundfont あり → sfPiano.play(note, time, {duration})', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play([track('keyboard')] as never)
    flushScheduled(TIME)
    expect(sf.sfPiano.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
  })

  it('keyboard: soundfont なし → keyboard.triggerAttackRelease(note, duration, time)（note を使う）', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.play([track('keyboard')] as never)
    flushScheduled(TIME)
    expect(synth.keyboard.triggerAttackRelease).toHaveBeenCalledWith(FAKE_NOTE, 0.5, TIME)
    expect(synth.keyboard.triggerAttackRelease.mock.calls[0]).toHaveLength(3)
  })

  it('guitar: soundfont あり → sfGuitar.play(note, time, {duration})', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play([track('guitar')] as never)
    flushScheduled(TIME)
    expect(sf.sfGuitar.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
  })

  it('guitar: soundfont なし → guitar.triggerAttackRelease(freq, duration, time)（freq を使う）', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.play([track('guitar')] as never)
    flushScheduled(TIME)
    expect(synth.guitar.triggerAttackRelease).toHaveBeenCalledWith(FAKE_FREQ, 0.5, TIME)
    expect(synth.guitar.triggerAttackRelease.mock.calls[0]).toHaveLength(3)
  })

  it('drum: サンプラーあり → drumSampler.triggerAttackRelease(sampleNote, "8n", time)（引数3個）', () => {
    const { drumSampler } = setup({ soundfontsLoaded: false, drumSamplesLoaded: true })
    audioEngine.play([track('drum')] as never)
    flushScheduled(TIME)
    expect(drumSampler.triggerAttackRelease).toHaveBeenCalledWith('C1', '8n', TIME)
    expect(drumSampler.triggerAttackRelease.mock.calls[0]).toHaveLength(3)
  })

  it('drum: サンプラーなし kick → kick.triggerAttackRelease("C1", "8n", time)', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.play([track('drum')] as never)
    flushScheduled(TIME)
    expect(synth.kick.triggerAttackRelease).toHaveBeenCalledWith('C1', '8n', TIME)
    expect(synth.kick.triggerAttackRelease.mock.calls[0]).toHaveLength(3)
  })

  it('drum: サンプラーなし snare → snare.triggerAttackRelease("8n", time)', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.play([track('drum', SNARE_PITCH)] as never)
    flushScheduled(TIME)
    expect(synth.snare.triggerAttackRelease).toHaveBeenCalledWith('8n', TIME)
    expect(synth.snare.triggerAttackRelease.mock.calls[0]).toHaveLength(2)
  })
})

describe('即時版とスケジュール版の引数列の整合（time=undefined ⇔ 即時版）', () => {
  // 即時版は triggerAttackRelease(freq, duration)（2引数）、
  // スケジュール版は triggerAttackRelease(freq, duration, time)（3引数）。
  // ヘルパー集約後も「即時=末尾 time なし / スケジュール=末尾 time あり」を保つことを固定する。
  it('bass synth: 即時は2引数・スケジュールは3引数で末尾だけ time が増える', () => {
    const a = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.playNote('bass', PITCH, 0.5)
    const immediate = a.synth.bass.triggerAttackRelease.mock.calls[0]

    const b = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.play([
      { id: 'b', type: 'bass', volume: 1, muted: false, notes: [{ id: 'n', pitch: PITCH, start: 0, duration: 0.5 }] },
    ] as never)
    flushScheduled(9.9)
    const scheduled = b.synth.bass.triggerAttackRelease.mock.calls[0]

    // 先頭2引数（freq, duration）は完全一致し、スケジュール版だけ time が末尾に付く
    expect(scheduled.slice(0, 2)).toEqual(immediate)
    expect(immediate).toHaveLength(2)
    expect(scheduled).toHaveLength(3)
    expect(scheduled[2]).toBe(9.9)
  })

  it('bass soundfont: 即時は time=undefined・スケジュールは time=値で、他引数は同一', () => {
    const a = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.playNote('bass', PITCH, 0.5)
    const immediate = a.sf.sfBass.play.mock.calls[0]

    const b = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play([
      { id: 'b', type: 'bass', volume: 1, muted: false, notes: [{ id: 'n', pitch: PITCH, start: 0, duration: 0.5 }] },
    ] as never)
    flushScheduled(9.9)
    const scheduled = b.sf.sfBass.play.mock.calls[0]

    // play(note, time, {duration}) の形は同一。time だけ undefined ⇔ 値。
    expect(immediate[0]).toBe(scheduled[0]) // note
    expect(immediate[2]).toEqual(scheduled[2]) // {duration}
    expect(immediate[1]).toBeUndefined()
    expect(scheduled[1]).toBe(9.9)
  })
})

describe('playAnalysisNotes / play4TrackAnalysis（スケジュール再生）', () => {
  const TIME = 2.5
  const notes = [{ pitch: PITCH, start: 0, end: 0.5 }]

  it('playAnalysisNotes bass(soundfont あり) → sfBass.play(note, time, {duration})', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.playAnalysisNotes(notes, 'bass')
    flushScheduled(TIME)
    expect(sf.sfBass.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
  })

  it('playAnalysisNotes other/default(soundfont なし) → keyboard.triggerAttackRelease(note, duration, time)', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.playAnalysisNotes(notes, 'default')
    flushScheduled(TIME)
    expect(synth.keyboard.triggerAttackRelease).toHaveBeenCalledWith(FAKE_NOTE, 0.5, TIME)
  })

  it('play4TrackAnalysis other(soundfont あり) → sfGuitar.play で再生', () => {
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ other: notes })
    flushScheduled(TIME)
    expect(sf.sfGuitar.play).toHaveBeenCalledWith(FAKE_NOTE, TIME, { duration: 0.5 })
  })

  it('play4TrackAnalysis melody(soundfont あり) → sfPiano.play（ピアノ音源流用）で再生', () => {
    // melody は sfPiano（acoustic_grand_piano）を流用する（声系音源 sfVoice は廃止済み）
    const { sf } = setup({ soundfontsLoaded: true, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ melody: notes })
    flushScheduled(TIME)
    // sfPiano で再生されること（melody=sfPiano 統一）。
    // melody は主旋律として少し大きく鳴らすため相対ゲイン(2.0/1.5)を渡す。
    expect(sf.sfPiano.play).toHaveBeenCalledWith(
      FAKE_NOTE,
      TIME,
      { duration: 0.5, gain: 2.0 / 1.5 },
    )
  })

  it('play4TrackAnalysis bass(soundfont なし) → bass.triggerAttackRelease(freq, duration, time)', () => {
    const { synth } = setup({ soundfontsLoaded: false, drumSamplesLoaded: false })
    audioEngine.play4TrackAnalysis({ bass: notes })
    flushScheduled(TIME)
    expect(synth.bass.triggerAttackRelease).toHaveBeenCalledWith(FAKE_FREQ, 0.5, TIME)
  })
})
