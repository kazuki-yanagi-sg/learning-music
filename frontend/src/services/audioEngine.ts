/**
 * オーディオエンジン - Tone.js を使った音声再生
 *
 * 4トラック（ドラム、ベース、キーボード、ギター）の再生を管理
 */
import * as Tone from 'tone'
import { Track, TrackType, Note } from '../types/music'

// ドラムキットのマッピング（MIDIノート → 楽器）
const DRUM_MAP: Record<number, 'kick' | 'snare' | 'hihat' | 'hihatOpen' | 'tom' | 'crash' | 'ride'> = {
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
const DRUM_SAMPLES_BASE = 'https://tonejs.github.io/audio/drum-samples/breakbeat13/'
const DRUM_SAMPLE_URLS: Record<string, string> = {
  kick: DRUM_SAMPLES_BASE + 'kick.mp3',
  snare: DRUM_SAMPLES_BASE + 'snare.mp3',
  hihat: DRUM_SAMPLES_BASE + 'hihat.mp3',
  hihatOpen: DRUM_SAMPLES_BASE + 'hihat-open.mp3',
  tom: DRUM_SAMPLES_BASE + 'tom1.mp3',
  crash: DRUM_SAMPLES_BASE + 'crash.mp3',
  ride: DRUM_SAMPLES_BASE + 'ride.mp3',
}

class AudioEngine {
  private isInitialized = false
  private bpm = 140
  private isPlaying = false
  private scheduledEvents: number[] = []
  private drumSamplesLoaded = false

  // ドラムサンプラー（リアルなドラム音）
  private drumSampler: Tone.Sampler | null = null

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
    console.log('Audio engine initialized')
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
   * 単一のノートを再生（プレビュー用）
   */
  playNote(trackType: TrackType, pitch: number, duration: number = 0.5): void {
    if (!this.isInitialized) return

    const freq = this.midiToFreq(pitch)
    const note = this.midiToNote(pitch)

    switch (trackType) {
      case 'drum':
        this.playDrumSound(pitch)
        break
      case 'bass':
        this.bass?.triggerAttackRelease(freq, duration)
        break
      case 'keyboard':
        this.keyboard?.triggerAttackRelease(note, duration)
        break
      case 'guitar':
        this.guitar?.triggerAttackRelease(freq, duration)
        break
    }
  }

  /**
   * ドラム音を再生
   */
  private playDrumSound(pitch: number): void {
    const drumType = DRUM_MAP[pitch] || 'kick'

    // サンプラーが読み込まれていればサンプル音を使用
    if (this.drumSamplesLoaded && this.drumSampler) {
      // ドラム種別をサンプラーのノートに変換
      const sampleNote = this.drumTypeToSampleNote(drumType)
      this.drumSampler.triggerAttackRelease(sampleNote, '8n')
      return
    }

    // フォールバック: シンセ音
    switch (drumType) {
      case 'kick':
        this.kick?.triggerAttackRelease('C1', '8n')
        break
      case 'snare':
        this.snare?.triggerAttackRelease('8n')
        break
      case 'hihat':
        this.hihat?.triggerAttackRelease('C4', '32n')
        break
      case 'hihatOpen':
        this.hihat?.triggerAttackRelease('C4', '16n')
        break
      case 'tom':
        this.tom?.triggerAttackRelease('G2', '8n')
        break
      case 'crash':
        this.crash?.triggerAttackRelease('C4', '4n')
        break
      case 'ride':
        this.ride?.triggerAttackRelease('C4', '8n')
        break
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

    switch (trackType) {
      case 'drum':
        this.triggerDrumNote(note.pitch, time)
        break
      case 'bass':
        this.bass?.triggerAttackRelease(freq, duration, time)
        break
      case 'keyboard':
        this.keyboard?.triggerAttackRelease(noteName, duration, time)
        break
      case 'guitar':
        this.guitar?.triggerAttackRelease(freq, duration, time)
        break
    }
  }

  /**
   * ドラムノートをトリガー（スケジュール再生用）
   */
  private triggerDrumNote(pitch: number, time: number): void {
    const drumType = DRUM_MAP[pitch] || 'kick'

    // サンプラーが読み込まれていればサンプル音を使用
    if (this.drumSamplesLoaded && this.drumSampler) {
      const sampleNote = this.drumTypeToSampleNote(drumType)
      this.drumSampler.triggerAttackRelease(sampleNote, '8n', time)
      return
    }

    // フォールバック: シンセ音
    switch (drumType) {
      case 'kick':
        this.kick?.triggerAttackRelease('C1', '8n', time)
        break
      case 'snare':
        this.snare?.triggerAttackRelease('8n', time)
        break
      case 'hihat':
        this.hihat?.triggerAttackRelease('C4', '32n', time)
        break
      case 'hihatOpen':
        this.hihat?.triggerAttackRelease('C4', '16n', time)
        break
      case 'tom':
        this.tom?.triggerAttackRelease('G2', '8n', time)
        break
      case 'crash':
        this.crash?.triggerAttackRelease('C4', '4n', time)
        break
      case 'ride':
        this.ride?.triggerAttackRelease('C4', '8n', time)
        break
    }
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
            this.bass?.triggerAttackRelease(freq, duration, time)
            break
          case 'other':
          case 'default':
            this.keyboard?.triggerAttackRelease(noteName, duration, time)
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
   * 4トラックの解析結果を再生（melody追加）
   */
  play4TrackAnalysis(
    tracks: {
      drums?: Array<{ pitch: number; start: number; end: number }>;
      bass?: Array<{ pitch: number; start: number; end: number }>;
      other?: Array<{ pitch: number; start: number; end: number }>;
      melody?: Array<{ pitch: number; start: number; end: number }>;
    },
    mutedTracks: Set<string> = new Set(),
    onProgress?: (time: number) => void
  ): { stop: () => void } {
    if (!this.isInitialized) {
      return { stop: () => {} }
    }

    this.stop()
    this.isPlaying = true

    const transport = Tone.getTransport()
    transport.bpm.value = 60

    // 各トラックのノートをスケジュール
    const scheduleTrack = (
      notes: Array<{ pitch: number; start: number; end: number }> | undefined,
      trackType: 'drums' | 'bass' | 'other' | 'melody'
    ) => {
      if (!notes || mutedTracks.has(trackType)) return

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
              this.bass?.triggerAttackRelease(freq, duration, time)
              break
            case 'other':
            case 'melody':
              // メロディはキーボード音源で再生
              this.keyboard?.triggerAttackRelease(noteName, duration, time)
              break
          }
        }, startTime)

        this.scheduledEvents.push(eventId)
      })
    }

    scheduleTrack(tracks.drums, 'drums')
    scheduleTrack(tracks.bass, 'bass')
    scheduleTrack(tracks.other, 'other')
    scheduleTrack(tracks.melody, 'melody')

    // 進捗コールバック
    let progressInterval: number | null = null
    if (onProgress) {
      progressInterval = window.setInterval(() => {
        if (this.isPlaying) {
          onProgress(transport.seconds)
        }
      }, 50)
    }

    // 曲の終わりを検出
    const allNotes = [
      ...(tracks.drums || []),
      ...(tracks.bass || []),
      ...(tracks.other || []),
      ...(tracks.melody || []),
    ]
    const maxTime = allNotes.length > 0 ? Math.max(...allNotes.map((n) => n.end)) + 1 : 0

    if (maxTime > 0) {
      const endEventId = transport.schedule(() => {
        this.stop()
        if (progressInterval) clearInterval(progressInterval)
        if (onProgress) onProgress(0)
      }, maxTime)
      this.scheduledEvents.push(endEventId)
    }

    transport.start()

    return {
      stop: () => {
        this.stop()
        if (progressInterval) clearInterval(progressInterval)
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
