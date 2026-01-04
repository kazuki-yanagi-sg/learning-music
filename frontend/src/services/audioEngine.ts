/**
 * オーディオエンジン - Tone.js を使った音声再生
 *
 * 4トラック（ドラム、ベース、キーボード、ギター）の再生を管理
 */
import * as Tone from 'tone'
import { Track, TrackType, Note } from '../types/music'

// ドラムキットのマッピング（MIDIノート → 楽器）
const DRUM_MAP: Record<number, 'kick' | 'snare' | 'hihat' | 'tom' | 'crash' | 'ride'> = {
  36: 'kick',     // キック
  38: 'snare',    // スネア
  42: 'hihat',    // ハイハット(C)
  46: 'hihat',    // ハイハット(O)
  45: 'tom',      // ロータム
  47: 'tom',      // ミドルタム
  48: 'tom',      // ハイタム
  49: 'crash',    // クラッシュ
  51: 'ride',     // ライド
}

class AudioEngine {
  private isInitialized = false
  private bpm = 140
  private isPlaying = false
  private scheduledEvents: number[] = []

  // 楽器
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
   * ドラムノートをトリガー
   */
  private triggerDrumNote(pitch: number, time: number): void {
    const drumType = DRUM_MAP[pitch] || 'kick'
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
   * 破棄
   */
  dispose(): void {
    this.stop()

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
