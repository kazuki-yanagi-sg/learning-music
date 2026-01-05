/**
 * soundfont-player 型定義
 */
declare module 'soundfont-player' {
  export interface Player {
    play(note: string | number, when?: number, options?: PlayOptions): AudioNode
    stop(when?: number): void
    schedule(when: number, events: ScheduleEvent[]): void
    listenToMidi(input: unknown): void
    on(event: string, callback: (event: unknown) => void): void
  }

  export interface PlayOptions {
    gain?: number
    attack?: number
    decay?: number
    sustain?: number
    release?: number
    duration?: number
    adsr?: [number, number, number, number]
  }

  export interface ScheduleEvent {
    time: number
    note: string | number
    duration?: number
    gain?: number
  }

  export interface InstrumentOptions {
    soundfont?: 'MusyngKite' | 'FluidR3_GM'
    format?: 'mp3' | 'ogg'
    gain?: number
    attack?: number
    decay?: number
    sustain?: number
    release?: number
    adsr?: [number, number, number, number]
    destination?: AudioNode
    nameToUrl?: (name: string, soundfont: string, format: string) => string
  }

  export function instrument(
    audioContext: AudioContext,
    name: string,
    options?: InstrumentOptions
  ): Promise<Player>
}
