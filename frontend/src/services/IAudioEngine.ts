/**
 * 再生エンジンの抽象インターフェース（依存性逆転）
 *
 * AnalysisPianoRollModal / useAnalysisPlayback が直接 audioEngine 具象に
 * 依存しないための最小インターフェース。解析結果の再生に必要な
 * メソッドだけを宣言する（init / play4TrackAnalysis / playAnalysisNotes）。
 *
 * シグネチャは audioEngine 実装と完全一致させ、挙動は変えない。
 * テストではこのインターフェースに適合するモックを注入できる。
 */

/** 再生ハンドル（停止のみ） */
export interface PlaybackHandle {
  stop: () => void
}

/** 4トラック再生ハンドル（停止＋シーク） */
export interface FourTrackPlaybackHandle {
  stop: () => void
  seek: (time: number) => void
}

/** 単純なノート（pitch/start/end と任意の velocity） */
export interface PlaybackNote {
  pitch: number
  start: number
  end: number
  velocity?: number
}

export interface IAudioEngine {
  /** オーディオエンジンの初期化（多重呼び出し安全） */
  init(): Promise<void>

  /**
   * 4〜6トラックの解析結果を再生（htdemucs_6s 対応）
   *
   * htdemucs_6s の guitar/keyboard（piano）stem に対応するため
   * guitar/keyboard フィールドを追加（optional）。
   * 後方互換: drums/bass/other/melody は引き続き使用可能。
   *
   * @param startFrom 開始位置（秒）
   */
  play4TrackAnalysis(
    tracks: {
      drums?: Array<{ pitch: number; start: number; end: number }>
      bass?: Array<{ pitch: number; start: number; end: number }>
      other?: Array<{ pitch: number; start: number; end: number }>
      melody?: Array<{ pitch: number; start: number; end: number }>
      guitar?: Array<{ pitch: number; start: number; end: number }>    // htdemucs_6s 追加
      keyboard?: Array<{ pitch: number; start: number; end: number }>  // htdemucs_6s 追加（piano stem）
    },
    mutedTracks?: Set<string>,
    onProgress?: (time: number) => void,
    startFrom?: number
  ): FourTrackPlaybackHandle

  /** 単一トラックの解析結果を再生 */
  playAnalysisNotes(
    notes: PlaybackNote[],
    trackType?: 'drums' | 'bass' | 'other' | 'default',
    onProgress?: (time: number) => void
  ): PlaybackHandle
}
