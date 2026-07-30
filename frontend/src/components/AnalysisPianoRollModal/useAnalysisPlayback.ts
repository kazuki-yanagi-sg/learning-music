/**
 * 解析結果の再生まわりを担うカスタムフック
 *
 * AnalysisPianoRollModal から逐語抽出。再生状態（isPlaying/playbackTime）と
 * audioEngine の呼び出し（init / play4TrackAnalysis / playAnalysisNotes / stop）の
 * 順序・引数・playbackRef の扱いを完全保存する。
 *
 * 依存性逆転: audioEngine は IAudioEngine 抽象として注入可能（デフォルトは実シングルトン）。
 *   → 既存挙動は不変。テストではモックを差し替えられる。
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { AnalysisResult, FourTrackResult } from '../../services/songAnalysisApi'
import { audioEngine as defaultAudioEngine } from '../../services/audioEngine'
import { IAudioEngine } from '../../services/IAudioEngine'

// 4トラック結果かどうかを判定
function isFourTrackResult(result: AnalysisResult | FourTrackResult): result is FourTrackResult {
  return 'tracks' in result
}

export interface UseAnalysisPlaybackParams {
  result: AnalysisResult | FourTrackResult
  mutedTracks: Set<string>
  isOpen: boolean
  /** クリック=シーク時に範囲選択をクリアするためのコールバック */
  clearSelection: () => void
  /** 注入可能な再生エンジン（デフォルトは実シングルトン） */
  audioEngine?: IAudioEngine
}

export interface UseAnalysisPlaybackResult {
  isPlaying: boolean
  playbackTime: number
  handlePlayToggle: () => Promise<void>
  handleSeek: (time: number) => void
  /** トラック別ボリューム倍率を設定（IAudioEngine 抽象越し・リアルタイム反映） */
  setTrackVolume: (track: string, volume: number) => void
}

export function useAnalysisPlayback({
  result,
  mutedTracks,
  isOpen,
  clearSelection,
  audioEngine = defaultAudioEngine,
}: UseAnalysisPlaybackParams): UseAnalysisPlaybackResult {
  // 再生状態
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const playbackRef = useRef<{ stop: () => void; seek?: (time: number) => void } | null>(null)
  const [audioInitialized, setAudioInitialized] = useState(false)

  // クリック = 位置セットのみ（再生しない）
  const handleSeek = useCallback((time: number) => {
    // 再生中なら停止
    if (isPlaying) {
      playbackRef.current?.stop()
      setIsPlaying(false)
    }
    setPlaybackTime(time)
    // 範囲選択をクリア
    clearSelection()
  }, [isPlaying, clearSelection])

  // 再生/停止（現在位置から開始）
  const handlePlayToggle = useCallback(async () => {
    if (isPlaying) {
      playbackRef.current?.stop()
      playbackRef.current = null
      setIsPlaying(false)
    } else {
      if (!audioInitialized) {
        await audioEngine.init()
        setAudioInitialized(true)
      }

      const onProgress = (time: number) => {
        setPlaybackTime(time)
        if (time === 0) setIsPlaying(false)
      }

      if (isFourTrackResult(result)) {
        // htdemucs_6s 対応: guitar/keyboard を追加、other は非再生（設計書 B-4）
        // other は濁り回避のため空配列を渡す（ミュート扱い）
        playbackRef.current = audioEngine.play4TrackAnalysis(
          {
            drums:    mutedTracks.has('drums')    ? [] : result.tracks.drums?.notes,
            bass:     mutedTracks.has('bass')     ? [] : result.tracks.bass?.notes,
            other:    [],  // other は再生しない（htdemucs_6s で guitar/keyboard に分離済み）
            melody:   mutedTracks.has('melody') ? [] : result.tracks.melody?.notes,  // メロディ（歌メロ=vocals由来）をピアノ音で再生する
            guitar:   mutedTracks.has('guitar')   ? [] : result.tracks.guitar?.notes,
            keyboard: mutedTracks.has('keyboard') ? [] : result.tracks.keyboard?.notes,
          },
          mutedTracks,
          onProgress,
          playbackTime  // 現在位置から再生
        )
      } else {
        playbackRef.current = audioEngine.playAnalysisNotes(
          result.notes || [],
          'default',
          onProgress
        )
      }
      setIsPlaying(true)
    }
  }, [isPlaying, audioInitialized, result, mutedTracks, playbackTime, audioEngine])

  // クリーンアップ
  useEffect(() => {
    return () => { playbackRef.current?.stop() }
  }, [])

  useEffect(() => {
    if (!isOpen && isPlaying) {
      playbackRef.current?.stop()
      setIsPlaying(false)
      setPlaybackTime(0)
    }
  }, [isOpen, isPlaying])

  // トラック別ボリューム倍率を再生エンジンへ反映（リアルタイム）
  const setTrackVolume = useCallback((track: string, volume: number) => {
    audioEngine.setAnalysisTrackVolume(track, volume)
  }, [audioEngine])

  return {
    isPlaying,
    playbackTime,
    handlePlayToggle,
    handleSeek,
    setTrackVolume,
  }
}
