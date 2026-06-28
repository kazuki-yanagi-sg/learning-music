/**
 * オーディオエンジン - Tone.js + SoundFont を使った音声再生
 *
 * 4トラック（ドラム、ベース、キーボード、ギター）の再生を管理
 * - ドラム: サンプル音源
 * - ベース/キーボード/ギター: SoundFont (GM音源)
 * - メロディ: sfPiano（acoustic_grand_piano）を流用して再生
 *   （声系音源 sfVoice/choir_aahs は廃止済み）
 */
import * as Tone from 'tone'
import Soundfont, { Player as SoundfontPlayer } from 'soundfont-player'
import { Track, TrackType, Note } from '../types/music'
// ドラムの再生用MIDIマッピングとサンプルURL（単一モジュールへ集約済み）
import { DRUM_MAP, DRUM_SAMPLE_URLS } from '../constants/drumKit'
// SoundFont 楽器定数（音色名・ゲイン）
import { SF_INSTRUMENTS, SF_GAINS } from '../constants/instruments'

// triggerAttackRelease に渡しうる引数の型（音名/周波数=string|number、末尾 time=number、省略=undefined）
type TriggerArg = string | number | undefined
// Tone.js の各シンセが共通で持つ triggerAttackRelease を抽象化した最小インターフェース
type TriggerSynth = { triggerAttackRelease: (...args: TriggerArg[]) => void }

class AudioEngine {
  private isInitialized = false
  private bpm = 140
  private isPlaying = false
  private scheduledEvents: number[] = []
  private drumSamplesLoaded = false
  private soundfontsLoaded = false
  private audioContext: AudioContext | null = null

  // ドラムサンプラー（リアルなドラム音）
  private drumSampler: Tone.Sampler | null = null

  // SoundFont楽器（GM音源）
  private sfBass: SoundfontPlayer | null = null
  private sfPiano: SoundfontPlayer | null = null  // melody も sfPiano を流用
  private sfGuitar: SoundfontPlayer | null = null
  // ※ sfVoice（choir_aahs）は廃止済み。melody は sfPiano で再生する。

  // シンセ楽器（フォールバック用）
  private kick: Tone.MembraneSynth | null = null
  private snare: Tone.NoiseSynth | null = null
  private hihat: Tone.MetalSynth | null = null
  private tom: Tone.MembraneSynth | null = null
  private crash: Tone.MetalSynth | null = null
  private ride: Tone.MetalSynth | null = null
  private bass: Tone.MonoSynth | null = null
  private keyboard: Tone.PolySynth | null = null
  private guitar: Tone.PluckSynth | null = null

  // ボリュームノード
  private volumes: Record<TrackType, Tone.Volume | null> = {
    drum: null,
    bass: null,
    keyboard: null,
    guitar: null,
  }

  /**
   * オーディオエンジンを初期化
   * ユーザーインタラクション後に呼び出す必要がある
   */
  async init(): Promise<void> {
    if (this.isInitialized) return

    await Tone.start()

    // ドラムキット
    this.volumes.drum = new Tone.Volume(-6).toDestination()

    // ドラムサンプラー（リアルな音）
    // 各ドラム音をMIDIノートに対応付け
    this.drumSampler = new Tone.Sampler(
      {
        C1: DRUM_SAMPLE_URLS.kick,     // キック (MIDI 36付近)
        D1: DRUM_SAMPLE_URLS.snare,    // スネア (MIDI 38付近)
        'F#1': DRUM_SAMPLE_URLS.hihat, // ハイハット (MIDI 42付近)
        'A#1': DRUM_SAMPLE_URLS.hihatOpen, // オープンハイハット (MIDI 46付近)
        A1: DRUM_SAMPLE_URLS.tom,      // タム (MIDI 45付近)
        'C#2': DRUM_SAMPLE_URLS.crash, // クラッシュ (MIDI 49付近)
        'D#2': DRUM_SAMPLE_URLS.ride,  // ライド (MIDI 51付近)
      },
      {
        onload: () => {
          console.log('Drum samples loaded')
          this.drumSamplesLoaded = true
        },
        onerror: (err) => {
          console.warn('Failed to load drum samples, using synth fallback:', err)
          this.drumSamplesLoaded = false
        },
      }
    ).connect(this.volumes.drum)

    // シンセ楽器（サンプルロード失敗時のフォールバック）
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
    }).connect(this.volumes.drum)

    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
    }).connect(this.volumes.drum)

    this.hihat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).connect(this.volumes.drum)
    this.hihat.volume.value = -10

    this.tom = new Tone.MembraneSynth({
      pitchDecay: 0.1,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.5 },
    }).connect(this.volumes.drum)

    this.crash = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 1, release: 0.3 },
      harmonicity: 5.1,
      modulationIndex: 40,
      resonance: 4000,
      octaves: 1.5,
    }).connect(this.volumes.drum)
    this.crash.volume.value = -8

    this.ride = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.4, release: 0.1 },
      harmonicity: 3,
      modulationIndex: 20,
      resonance: 5000,
      octaves: 1,
    }).connect(this.volumes.drum)
    this.ride.volume.value = -12

    // ベース
    this.volumes.bass = new Tone.Volume(-3).toDestination()
    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.5,
        baseFrequency: 200,
        octaves: 2.5,
      },
    }).connect(this.volumes.bass)

    // キーボード（ポリフォニック）
    this.volumes.keyboard = new Tone.Volume(-6).toDestination()
    this.keyboard = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
    }).connect(this.volumes.keyboard)

    // ギター（プラック音源）
    this.volumes.guitar = new Tone.Volume(-6).toDestination()
    this.guitar = new Tone.PluckSynth({
      attackNoise: 1,
      dampening: 4000,
      resonance: 0.98,
    }).connect(this.volumes.guitar)

    this.isInitialized = true
    console.log('Audio engine initialized (synth fallback ready)')

    // SoundFont楽器を非同期でロード（アニソン向けGM音源）
    this.loadSoundfonts()
  }

  /**
   * SoundFont楽器をロード
   */
  private async loadSoundfonts(): Promise<void> {
    try {
      // AudioContextを取得（Tone.jsのコンテキストを使用）
      this.audioContext = Tone.getContext().rawContext as AudioContext

      console.log('Loading SoundFont instruments...')

      // 並列でロード（音色名・ゲインは constants/instruments.ts から参照）
      // melody は sfPiano を流用するため、ロードは bass/piano/guitar の3音源のみ
      const [bass, piano, guitar] = await Promise.all([
        Soundfont.instrument(this.audioContext, SF_INSTRUMENTS.bass, {
          soundfont: 'MusyngKite',
          gain: SF_GAINS.bass,
        }),
        Soundfont.instrument(this.audioContext, SF_INSTRUMENTS.piano, {
          soundfont: 'MusyngKite',
          gain: SF_GAINS.piano,
        }),
        Soundfont.instrument(this.audioContext, SF_INSTRUMENTS.guitar, {
          soundfont: 'MusyngKite',
          gain: SF_GAINS.guitar,
        }),
      ])

      this.sfBass = bass
      this.sfPiano = piano  // melody も sfPiano を流用
      this.sfGuitar = guitar
      this.soundfontsLoaded = true

      console.log('SoundFont instruments loaded: bass, piano(melody共用), guitar')
    } catch (err) {
      console.warn('Failed to load SoundFont instruments, using synth fallback:', err)
      this.soundfontsLoaded = false
    }
  }

  /**
   * BPMを設定
   */
  setBpm(bpm: number): void {
    this.bpm = bpm
    Tone.getTransport().bpm.value = bpm
  }

  /**
   * トラックのボリュームを設定
   */
  setTrackVolume(trackType: TrackType, volume: number): void {
    const volumeNode = this.volumes[trackType]
    if (volumeNode) {
      // 0-1 を dB に変換（0 = -60dB, 1 = 0dB）
      volumeNode.volume.value = volume > 0 ? 20 * Math.log10(volume) : -60
    }
  }

  /**
   * トラックをミュート
   */
  setTrackMute(trackType: TrackType, muted: boolean): void {
    const volumeNode = this.volumes[trackType]
    if (volumeNode) {
      volumeNode.mute = muted
    }
  }

  /**
   * MIDIノート番号を周波数に変換
   */
  private midiToFreq(midi: number): number {
    return Tone.Frequency(midi, 'midi').toFrequency()
  }

  /**
   * MIDIノート番号を音名に変換
   */
  private midiToNote(midi: number): string {
    return Tone.Frequency(midi, 'midi').toNote()
  }

  /**
   * 旋律系トラック（bass/keyboard/guitar/melody）の1音を再生する共通ヘルパー。
   *
   * 即時再生（time なし）とスケジュール再生（time あり）の両方を一本化する。
   * - SoundFont が使える場合: sfXxx.play(note, time, { duration })
   *   ※ time=undefined のときは即時版と同じく第2引数が undefined になる。
   * - フォールバック（シンセ）の場合: synth.triggerAttackRelease(...)
   *   ※ bass/guitar は freq、keyboard/melody は note を渡す。
   *   ※ time が undefined のときは末尾 time を付けず2引数で呼ぶ（即時版と完全一致）。
   *
   * @param trackType 旋律系トラック種別（melody=sfPiano / フォールバックは keyboard）
   * @param freq      MIDI から変換した周波数（bass/guitar 用）
   * @param note      MIDI から変換した音名（soundfont / keyboard / melody 用）
   * @param duration  発音長（秒）
   * @param time      スケジュール時刻（即時再生では undefined）
   */
  private playInstrument(
    trackType: 'bass' | 'keyboard' | 'guitar' | 'melody',
    freq: number,
    note: string,
    duration: number,
    time?: number
  ): void {
    // 楽器ごとの「SoundFontプレイヤー」と「フォールバックシンセ + シンセに渡す値」を引く
    const sf = this.instrumentSoundfont(trackType)
    if (this.soundfontsLoaded && sf) {
      // melody は sfPiano(piano gain=1.5)を流用しているため、主旋律として
      // 少し大きく鳴らすよう、ノート単位の相対ゲイン(melody/piano)を掛ける。
      // 他トラックは追加ゲイン無し（ロード時の gain のまま）。
      const playOpts: { duration: number; gain?: number } = { duration }
      if (trackType === 'melody') {
        playOpts.gain = SF_GAINS.melody / SF_GAINS.piano
      }
      sf.play(note, time, playOpts)
      return
    }

    const { synth, value } = this.instrumentSynth(trackType, freq, note)
    if (!synth) return
    // 即時版（time なし）は2引数、スケジュール版（time あり）は3引数で呼ぶ
    if (time === undefined) {
      synth.triggerAttackRelease(value, duration)
    } else {
      synth.triggerAttackRelease(value, duration, time)
    }
  }

  /**
   * 旋律系トラックに対応する SoundFont プレイヤーを返す。
   * melody は sfPiano（acoustic_grand_piano）を流用する。
   * （sfVoice/choir_aahs は廃止済み）
   */
  private instrumentSoundfont(
    trackType: 'bass' | 'keyboard' | 'guitar' | 'melody'
  ): SoundfontPlayer | null {
    switch (trackType) {
      case 'bass':
        return this.sfBass
      case 'keyboard':
        return this.sfPiano
      case 'guitar':
        return this.sfGuitar
      case 'melody':
        // メロディは sfPiano（acoustic_grand_piano）を流用する（声系音源廃止）
        return this.sfPiano
    }
  }

  /**
   * 旋律系トラックに対応するフォールバックシンセと、それに渡す値（freq か note）を返す。
   * bass/guitar は freq、keyboard/melody は note を使う。
   * melody は sfPiano ロード失敗時に keyboard シンセへフォールバックする。
   */
  private instrumentSynth(
    trackType: 'bass' | 'keyboard' | 'guitar' | 'melody',
    freq: number,
    note: string
  ): { synth: TriggerSynth | null; value: number | string } {
    switch (trackType) {
      case 'bass':
        return { synth: this.bass as TriggerSynth | null, value: freq }
      case 'keyboard':
        return { synth: this.keyboard as TriggerSynth | null, value: note }
      case 'guitar':
        return { synth: this.guitar as TriggerSynth | null, value: freq }
      case 'melody':
        // sfPiano ロード失敗時はキーボードシンセにフォールバック（note を渡す）
        return { synth: this.keyboard as TriggerSynth | null, value: note }
    }
  }

  /**
   * 単一のノートを再生（プレビュー用）
   */
  playNote(trackType: TrackType, pitch: number, duration: number = 0.5): void {
    if (!this.isInitialized) return

    const freq = this.midiToFreq(pitch)
    const note = this.midiToNote(pitch)

    if (trackType === 'drum') {
      this.playDrumSound(pitch)
      return
    }
    // bass/keyboard/guitar は共通ヘルパーで即時再生（time なし）
    this.playInstrument(trackType, freq, note, duration)
  }

  /**
   * ドラム音を再生する共通ヘルパー。
   *
   * 即時再生（time なし）とスケジュール再生（time あり）を一本化する。
   * triggerAttackRelease の末尾 time を有無で出し分ける。
   *
   * @param pitch MIDI ノート番号
   * @param time  スケジュール時刻（即時再生では undefined）
   */
  private playDrumSound(pitch: number, time?: number): void {
    const drumType = DRUM_MAP[pitch] || 'kick'

    // サンプラーが読み込まれていればサンプル音を使用
    if (this.drumSamplesLoaded && this.drumSampler) {
      // ドラム種別をサンプラーのノートに変換
      const sampleNote = this.drumTypeToSampleNote(drumType)
      this.triggerWithOptionalTime(this.drumSampler as unknown as TriggerSynth, sampleNote, '8n', time)
      return
    }

    // フォールバック: シンセ音（楽器・音名・音価の対応表を引いて発音）
    const fb = this.drumFallback(drumType)
    if (!fb || !fb.synth) return
    if (fb.note === undefined) {
      // snare は音名なしで triggerAttackRelease(duration[, time])
      this.triggerWithOptionalTime(fb.synth, fb.dur, time)
    } else {
      this.triggerWithOptionalTime(fb.synth, fb.note, fb.dur, time)
    }
  }

  /**
   * triggerAttackRelease を「末尾 time の有無」で出し分ける小ヘルパー。
   * time が undefined のときは time 引数を付けない（即時版と完全一致）。
   */
  private triggerWithOptionalTime(
    synth: TriggerSynth,
    ...args: TriggerArg[]
  ): void {
    const time = args[args.length - 1]
    const head = args.slice(0, -1)
    if (time === undefined) {
      synth.triggerAttackRelease(...head)
    } else {
      synth.triggerAttackRelease(...head, time)
    }
  }

  /**
   * フォールバックシンセのドラム発音定義を返す。
   * note=undefined のシンセ（snare）は音名なしで発音する。
   */
  private drumFallback(
    drumType: string
  ): { synth: TriggerSynth | null; note?: string; dur: string } | null {
    switch (drumType) {
      case 'kick':
        return { synth: this.kick as TriggerSynth | null, note: 'C1', dur: '8n' }
      case 'snare':
        return { synth: this.snare as TriggerSynth | null, note: undefined, dur: '8n' }
      case 'hihat':
        return { synth: this.hihat as TriggerSynth | null, note: 'C4', dur: '32n' }
      case 'hihatOpen':
        return { synth: this.hihat as TriggerSynth | null, note: 'C4', dur: '16n' }
      case 'tom':
        return { synth: this.tom as TriggerSynth | null, note: 'G2', dur: '8n' }
      case 'crash':
        return { synth: this.crash as TriggerSynth | null, note: 'C4', dur: '4n' }
      case 'ride':
        return { synth: this.ride as TriggerSynth | null, note: 'C4', dur: '8n' }
      default:
        return null
    }
  }

  /**
   * ドラム種別をサンプラーのノートに変換
   */
  private drumTypeToSampleNote(drumType: string): string {
    switch (drumType) {
      case 'kick': return 'C1'
      case 'snare': return 'D1'
      case 'hihat': return 'F#1'
      case 'hihatOpen': return 'A#1'
      case 'tom': return 'A1'
      case 'crash': return 'C#2'
      case 'ride': return 'D#2'
      default: return 'C1' // fallback to kick
    }
  }

  /**
   * 全トラックを再生
   */
  play(tracks: Track[]): void {
    if (!this.isInitialized || this.isPlaying) return

    this.stop()
    this.isPlaying = true

    const transport = Tone.getTransport()
    transport.bpm.value = this.bpm

    // 各トラックのノートをスケジュール
    tracks.forEach((track) => {
      if (track.muted) return

      this.setTrackVolume(track.type as TrackType, track.volume)

      track.notes.forEach((note) => {
        const startTime = `${Math.floor(note.start / 4)}:${note.start % 4}:0`

        const eventId = transport.schedule((time) => {
          this.triggerNote(track.type as TrackType, note, time)
        }, startTime)

        this.scheduledEvents.push(eventId)
      })
    })

    transport.start()
  }

  /**
   * ノートをトリガー
   */
  private triggerNote(trackType: TrackType, note: Note, time: number): void {
    const freq = this.midiToFreq(note.pitch)
    const noteName = this.midiToNote(note.pitch)
    const duration = note.duration * (60 / this.bpm)

    if (trackType === 'drum') {
      this.triggerDrumNote(note.pitch, time)
      return
    }
    // bass/keyboard/guitar は共通ヘルパーでスケジュール再生（time あり）
    this.playInstrument(trackType, freq, noteName, duration, time)
  }

  /**
   * ドラムノートをトリガー（スケジュール再生用）。
   * 実体は playDrumSound と共通。time を渡すだけ。
   */
  private triggerDrumNote(pitch: number, time: number): void {
    this.playDrumSound(pitch, time)
  }

  /**
   * 再生を停止
   */
  stop(): void {
    const transport = Tone.getTransport()
    transport.stop()
    transport.cancel()
    transport.position = 0

    this.scheduledEvents.forEach((id) => transport.clear(id))
    this.scheduledEvents = []

    this.isPlaying = false
  }

  /**
   * 再生中かどうか
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * 現在の再生位置を拍数で取得
   */
  getCurrentBeat(): number {
    if (!this.isPlaying) return 0
    const transport = Tone.getTransport()
    // position は "bars:beats:sixteenths" 形式
    const [bars, beats] = transport.position.toString().split(':').map(Number)
    return bars * 4 + beats
  }

  /**
   * 解析結果のノートを再生（時間ベース）
   *
   * @param notes 再生するノート（start/endは秒単位）
   * @param trackType トラック種別（デフォルト: keyboard）
   * @param onProgress 進捗コールバック（秒単位）
   * @returns 停止関数
   */
  playAnalysisNotes(
    notes: Array<{ pitch: number; start: number; end: number; velocity?: number }>,
    trackType: 'drums' | 'bass' | 'other' | 'default' = 'default',
    onProgress?: (time: number) => void
  ): { stop: () => void } {
    if (!this.isInitialized) {
      return { stop: () => {} }
    }

    this.stop()
    this.isPlaying = true

    const transport = Tone.getTransport()
    transport.bpm.value = 60 // 1拍 = 1秒として扱う

    // 各ノートをスケジュール
    notes.forEach((note) => {
      const startTime = note.start
      const duration = Math.max(0.05, note.end - note.start)

      const eventId = transport.schedule((time) => {
        const freq = this.midiToFreq(note.pitch)
        const noteName = this.midiToNote(note.pitch)

        switch (trackType) {
          case 'drums':
            this.triggerDrumNote(note.pitch, time)
            break
          case 'bass':
            // sfBass / bass(freq) → 'bass' の対応と完全一致
            this.playInstrument('bass', freq, noteName, duration, time)
            break
          case 'other':
          case 'default':
            // sfPiano / keyboard(note) → 'keyboard' の対応と完全一致
            this.playInstrument('keyboard', freq, noteName, duration, time)
            break
        }
      }, startTime)

      this.scheduledEvents.push(eventId)
    })

    // 進捗コールバック用のインターバル
    let progressInterval: number | null = null
    if (onProgress) {
      progressInterval = window.setInterval(() => {
        if (this.isPlaying) {
          const seconds = transport.seconds
          onProgress(seconds)
        }
      }, 50)
    }

    // 曲の終わりを検出
    const maxTime = Math.max(...notes.map((n) => n.end)) + 1
    const endEventId = transport.schedule(() => {
      this.stop()
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      if (onProgress) {
        onProgress(0)
      }
    }, maxTime)
    this.scheduledEvents.push(endEventId)

    transport.start()

    return {
      stop: () => {
        this.stop()
        if (progressInterval) {
          clearInterval(progressInterval)
        }
      },
    }
  }

  /**
   * 4〜6トラックの解析結果を再生（htdemucs_6s 対応: guitar/keyboard 追加）
   *
   * 音源マッピング（設計書 B-4）:
   *   guitar   → sfGuitar（サウンドフォント）/ guitar シンセ（フォールバック）
   *   keyboard → sfPiano（サウンドフォント）/ keyboard シンセ（フォールバック）
   *   other    → sfGuitar（後方互換）
   *   melody   → sfPiano（ピアノ音源流用）/ keyboard シンセ（フォールバック）
   *              ※ 声系音源（sfVoice/choir_aahs）は廃止済み
   *
   * @param startFrom 開始位置（秒）- 指定した位置から再生開始
   */
  play4TrackAnalysis(
    tracks: {
      drums?: Array<{ pitch: number; start: number; end: number }>;
      bass?: Array<{ pitch: number; start: number; end: number }>;
      other?: Array<{ pitch: number; start: number; end: number }>;
      melody?: Array<{ pitch: number; start: number; end: number }>;
      guitar?: Array<{ pitch: number; start: number; end: number }>;    // htdemucs_6s 追加
      keyboard?: Array<{ pitch: number; start: number; end: number }>;  // htdemucs_6s 追加（piano stem）
    },
    mutedTracks: Set<string> = new Set(),
    onProgress?: (time: number) => void,
    startFrom: number = 0
  ): { stop: () => void; seek: (time: number) => void } {
    if (!this.isInitialized) {
      return { stop: () => {}, seek: () => {} }
    }

    this.stop()
    this.isPlaying = true

    const transport = Tone.getTransport()
    transport.bpm.value = 60

    // 各トラックのノートをスケジュール（startFromより後のノートのみ）
    // htdemucs_6s 対応: guitar/keyboard を追加（設計書 B-4）
    const scheduleTrack = (
      notes: Array<{ pitch: number; start: number; end: number }> | undefined,
      trackType: 'drums' | 'bass' | 'other' | 'melody' | 'guitar' | 'keyboard'
    ) => {
      if (!notes || mutedTracks.has(trackType)) return

      notes.forEach((note) => {
        // startFromより前に終わるノートはスキップ
        if (note.end <= startFrom) return

        // 開始時間を調整（startFromを0として再計算）
        const adjustedStart = Math.max(0, note.start - startFrom)
        const duration = Math.max(0.05, note.end - note.start)

        const eventId = transport.schedule((time) => {
          const freq = this.midiToFreq(note.pitch)
          const noteName = this.midiToNote(note.pitch)

          switch (trackType) {
            case 'drums':
              this.triggerDrumNote(note.pitch, time)
              break
            case 'bass':
              // sfBass / bass(freq) → 'bass' の対応と完全一致
              this.playInstrument('bass', freq, noteName, duration, time)
              break
            case 'other':
              // other（後方互換）はギター音源で再生（sfGuitar）
              // フォールバックは keyboard(note)
              if (this.soundfontsLoaded && this.sfGuitar) {
                this.sfGuitar.play(noteName, time, { duration })
              } else {
                this.keyboard?.triggerAttackRelease(noteName, duration, time)
              }
              break
            case 'melody':
              // メロディ = sfPiano（acoustic_grand_piano）で再生（声系音源廃止）。
              // sfPiano ロード失敗時は keyboard シンセにフォールバック（playInstrument ヘルパー内で処理）
              this.playInstrument('melody', freq, noteName, duration, time)
              break
            case 'guitar':
              // htdemucs_6s guitar stem → sfGuitar で再生（設計書 B-4）
              this.playInstrument('guitar', freq, noteName, duration, time)
              break
            case 'keyboard':
              // htdemucs_6s piano stem → sfPiano で再生（設計書 B-4）
              // playInstrument の 'keyboard' case は sfPiano を使用
              this.playInstrument('keyboard', freq, noteName, duration, time)
              break
          }
        }, adjustedStart)

        this.scheduledEvents.push(eventId)
      })
    }

    scheduleTrack(tracks.drums, 'drums')
    scheduleTrack(tracks.bass, 'bass')
    scheduleTrack(tracks.other, 'other')
    scheduleTrack(tracks.melody, 'melody')
    // htdemucs_6s 追加 stem（設計書 B-4）
    scheduleTrack(tracks.guitar, 'guitar')
    scheduleTrack(tracks.keyboard, 'keyboard')

    // 進捗コールバック（startFromを加算して実際の時間を返す）
    let progressInterval: number | null = null
    if (onProgress) {
      progressInterval = window.setInterval(() => {
        if (this.isPlaying) {
          onProgress(transport.seconds + startFrom)
        }
      }, 50)
    }

    // 曲の終わりを検出（htdemucs_6s 追加 stem も含める）
    const allNotes = [
      ...(tracks.drums    || []),
      ...(tracks.bass     || []),
      ...(tracks.other    || []),
      ...(tracks.melody   || []),
      ...(tracks.guitar   || []),  // htdemucs_6s 追加
      ...(tracks.keyboard || []),  // htdemucs_6s 追加
    ]
    const maxTime = allNotes.length > 0 ? Math.max(...allNotes.map((n) => n.end)) - startFrom + 1 : 0

    if (maxTime > 0) {
      const endEventId = transport.schedule(() => {
        this.stop()
        if (progressInterval) clearInterval(progressInterval)
        if (onProgress) onProgress(0)
      }, maxTime)
      this.scheduledEvents.push(endEventId)
    }

    transport.start()

    // シーク関数を保存（再利用のため）
    const allTracksData = tracks
    const currentMutedTracks = mutedTracks
    const currentOnProgress = onProgress

    return {
      stop: () => {
        this.stop()
        if (progressInterval) clearInterval(progressInterval)
      },
      seek: (time: number) => {
        // 現在の再生を停止して新しい位置から再開
        this.stop()
        if (progressInterval) clearInterval(progressInterval)
        // 再帰的に新しい位置から再生開始
        const newPlayback = this.play4TrackAnalysis(allTracksData, currentMutedTracks, currentOnProgress, time)
        // 参照を更新できないので、stopだけ動作するようにする
        Object.assign(this, { _currentPlayback: newPlayback })
      },
    }
  }

  /**
   * 破棄
   */
  dispose(): void {
    this.stop()

    // ドラムサンプラー
    this.drumSampler?.dispose()
    this.drumSamplesLoaded = false

    // SoundFont楽器（メモリリーク防止: stop() 後 null 化）
    // melody は sfPiano を流用しているため、sfPiano の解放のみで十分
    this.sfBass?.stop()
    this.sfPiano?.stop()
    this.sfGuitar?.stop()
    this.sfBass = null
    this.sfPiano = null
    this.sfGuitar = null
    this.soundfontsLoaded = false

    // シンセ楽器
    this.kick?.dispose()
    this.snare?.dispose()
    this.hihat?.dispose()
    this.tom?.dispose()
    this.crash?.dispose()
    this.ride?.dispose()
    this.bass?.dispose()
    this.keyboard?.dispose()
    this.guitar?.dispose()

    Object.values(this.volumes).forEach((v) => v?.dispose())

    this.isInitialized = false
  }
}

// シングルトンインスタンス
export const audioEngine = new AudioEngine()
