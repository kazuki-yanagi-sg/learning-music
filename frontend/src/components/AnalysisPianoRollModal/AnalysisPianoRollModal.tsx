/**
 * 解析結果ピアノロールモーダル
 *
 * 4トラック表示:
 * - ドラム: 専用のグリッド形式（DAW風）
 * - ベース/その他: ピアノロール形式
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { AnalysisResult, FourTrackResult, NoteInfo, explainSection } from '../../services/songAnalysisApi'
import { AnalysisDrumGrid } from './AnalysisDrumGrid'
import { useDragSelection } from './useDragSelection'
import { useAnalysisPlayback } from './useAnalysisPlayback'
import { TrackPianoRoll, TrackType } from './TrackPianoRoll'
import {
  computeMutedFromVolumes,
  PLAYABLE_TRACKS,
  DEFAULT_TRACK_VOLUME,
} from './trackControls'

interface AnalysisPianoRollModalProps {
  isOpen: boolean
  onClose: () => void
  result: AnalysisResult | FourTrackResult
}

// 4トラック結果かどうかを判定
function isFourTrackResult(result: AnalysisResult | FourTrackResult): result is FourTrackResult {
  return 'tracks' in result
}

export function AnalysisPianoRollModal({
  isOpen,
  onClose,
  result,
}: AnalysisPianoRollModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  // トラック別ボリューム（0..1.5、既定 1）。UI は音量スライダーのみ。
  // ソロ/ミュートボタンは廃止し、スライダーを 0 にすれば実質ミュート＝
  // 聴きたいトラック以外を 0 にすればソロ相当。
  const [trackVolumes, setTrackVolumes] = useState<Record<string, number>>({})

  // 音量0のトラックは鳴らさない（実効ミュート）。これを再生に渡す。
  const effectiveMuted = useMemo(
    () => computeMutedFromVolumes(PLAYABLE_TRACKS, trackVolumes),
    [trackVolumes],
  )

  // トラックデータをrefで保持（シーク時に参照）
  const tracksDataRef = useRef<typeof tracksData | null>(null)

  // AI解説機能
  const [sectionAnalysis, setSectionAnalysis] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 範囲選択（ドラッグ）
  const {
    selectionStart,
    selectionEnd,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    clearSelection,
  } = useDragSelection()

  // 再生まわり（init/play4TrackAnalysis/playAnalysisNotes/stop の呼び出しを保持）
  const {
    isPlaying,
    playbackTime,
    handlePlayToggle,
    handleSeek,
    setTrackVolume: applyTrackVolume,
  } = useAnalysisPlayback({
    result,
    mutedTracks: effectiveMuted,
    isOpen,
    clearSelection,
  })

  // トラックデータ（htdemucs_6s: guitar/keyboard を追加）
  // other は後方互換のため保持するが描画リストには含めない
  // melody は描画リストに追加（bass/guitar/keyboard/melody の4トラックを表示）
  const tracksData = useMemo(() => {
    if (isFourTrackResult(result)) {
      return {
        drums:    result.tracks.drums?.notes    || [],
        bass:     result.tracks.bass?.notes     || [],
        other:    result.tracks.other?.notes    || [],  // 描画しないが maxTime 計算に使う
        melody:   result.tracks.melody?.notes   || [],  // 描画対象（ピアノロールで表示）
        guitar:   result.tracks.guitar?.notes   || [],  // htdemucs_6s 追加
        keyboard: result.tracks.keyboard?.notes || [],  // htdemucs_6s 追加（piano stem）
      }
    }
    return { default: result.notes || [] }
  }, [result])

  // 最大時間を計算
  const maxTime = useMemo(() => {
    const allNotes: NoteInfo[] = []
    Object.values(tracksData).forEach(notes => allNotes.push(...notes))
    if (allNotes.length === 0) return 30
    return Math.max(...allNotes.map(n => n.end)) + 2
  }, [tracksData])

  // tracksDataをrefに保存
  useEffect(() => {
    tracksDataRef.current = tracksData
  }, [tracksData])

  // 音量変更（state 更新＋エンジンへリアルタイム反映）
  const handleVolumeChange = useCallback((trackType: string, volume: number) => {
    setTrackVolumes(prev => ({ ...prev, [trackType]: volume }))
    applyTrackVolume?.(trackType, volume)
  }, [applyTrackVolume])

  // トラックの現在ボリュームを引く（未設定は既定値）
  const volumeOf = useCallback(
    (trackType: string) => trackVolumes[trackType] ?? DEFAULT_TRACK_VOLUME,
    [trackVolumes],
  )

  // 選択範囲を計算（ドラッグ選択 or 現在位置±5秒）
  const analysisRange = useMemo(() => {
    if (selectionStart !== null && selectionEnd !== null) {
      const start = Math.min(selectionStart, selectionEnd)
      const end = Math.max(selectionStart, selectionEnd)
      if (end - start > 0.5) {  // 0.5秒以上の範囲
        return { start, end, isSelection: true }
      }
    }
    // デフォルト: 現在位置±5秒
    const center = playbackTime || 0
    return {
      start: Math.max(0, center - 5),
      end: center + 5,
      isSelection: false,
    }
  }, [selectionStart, selectionEnd, playbackTime])

  // AI解説を取得
  const handleExplainSection = useCallback(async () => {
    if (!isFourTrackResult(result)) return

    setIsAnalyzing(true)
    setSectionAnalysis(null)

    try {
      const response = await explainSection({
        track_name: result.title,
        tempo: result.tempo || 120,
        start_time: analysisRange.start,
        end_time: analysisRange.end,
        tracks: {
          melody: result.tracks.melody?.notes,
          drums: result.tracks.drums?.notes,
          bass: result.tracks.bass?.notes,
          other: result.tracks.other?.notes,
        },
      })

      if (response.success && response.data) {
        setSectionAnalysis(response.data.analysis_text)
      } else {
        setSectionAnalysis(`エラー: ${response.error || '不明なエラー'}`)
      }
    } catch (e) {
      setSectionAnalysis(`エラー: ${e instanceof Error ? e.message : '不明'}`)
    } finally {
      setIsAnalyzing(false)
    }
  }, [result, analysisRange])

  // キーボードショートカット
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault()
        handlePlayToggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handlePlayToggle])

  if (!isOpen) return null

  const is4Track = isFourTrackResult(result)
  const totalNotes = Object.values(tracksData).reduce((sum, notes) => sum + notes.length, 0)

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-gray-900 rounded-lg shadow-2xl flex flex-col w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white truncate max-w-md">{result.title}</h2>
            {is4Track && (
              <span className="px-2 py-0.5 bg-purple-900 text-purple-300 rounded text-xs">4Track</span>
            )}
            {result.tempo && (
              <span className="px-2 py-0.5 bg-blue-900 text-blue-300 rounded text-xs">
                {result.tempo} BPM
              </span>
            )}
            <span className="text-xs text-gray-400">{totalNotes} notes</span>
          </div>

          <div className="flex items-center gap-2">
            {/* 再生ボタン */}
            <button
              onClick={handlePlayToggle}
              className={`px-4 py-1 rounded font-bold ${
                isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {isPlaying ? '⏹ Stop' : '▶ Play'}
            </button>

            {/* AI解説ボタン */}
            {is4Track && (
              <button
                onClick={handleExplainSection}
                disabled={isAnalyzing}
                className={`px-3 py-1 rounded font-bold ${
                  isAnalyzing
                    ? 'bg-gray-600 cursor-wait'
                    : analysisRange.isSelection
                      ? 'bg-purple-500 hover:bg-purple-600 ring-2 ring-purple-300'
                      : 'bg-purple-600 hover:bg-purple-700'
                } text-white text-sm`}
                title={`${analysisRange.start.toFixed(1)}〜${analysisRange.end.toFixed(1)}秒を解説`}
              >
                {isAnalyzing ? '解析中...' : analysisRange.isSelection ? `🤖 選択範囲を解説` : '🤖 AI解説'}
              </button>
            )}

            {isPlaying && (
              <span className="text-sm text-gray-300 font-mono w-16">
                {Math.floor(playbackTime / 60)}:{String(Math.floor(playbackTime % 60)).padStart(2, '0')}
              </span>
            )}

            <div className="w-px h-6 bg-gray-600 mx-1" />

            {/* ズーム */}
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
            >
              -
            </button>
            <span className="text-xs text-gray-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
            >
              +
            </button>

            <div className="w-px h-6 bg-gray-600 mx-1" />

            <button
              onClick={onClose}
              className="px-2 py-1 bg-gray-700 hover:bg-red-600 rounded text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>

        {/* AI解説表示 */}
        {sectionAnalysis && (
          <div className="mx-4 my-2 p-3 bg-purple-900/50 border border-purple-700 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="text-xs text-purple-300 mb-1">
                  🤖 AI解説 ({analysisRange.start.toFixed(1)}〜{analysisRange.end.toFixed(1)}秒)
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{sectionAnalysis}</p>
              </div>
              <button
                onClick={() => setSectionAnalysis(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* トラック別ピアノロール */}
        <div className="flex-1 overflow-y-auto">
          {is4Track ? (
            // 6トラック表示（htdemucs_6s 対応）
            // 描画リスト: bass / guitar / keyboard / melody
            // other は描画しない（guitar/keyboard で代替）
            // drums は AnalysisDrumGrid で別途描画
            <>
              {/* ドラムは専用グリッド（常に表示） */}
              <AnalysisDrumGrid
                notes={tracksData.drums || []}
                maxTime={maxTime}
                zoom={zoom}
                playbackTime={playbackTime}
                isPlaying={isPlaying}
                volume={volumeOf('drums')}
                onVolumeChange={(v) => handleVolumeChange('drums', v)}
                tempo={result.tempo || 120}
                onSeek={handleSeek}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                selectionStart={selectionStart}
                selectionEnd={selectionEnd}
              />
              {/* bass / guitar / keyboard / melody をピアノロールで描画 */}
              {(['bass', 'guitar', 'keyboard', 'melody'] as TrackType[]).map(trackType => {
                const notes = tracksData[trackType as keyof typeof tracksData] || []
                return (
                  <TrackPianoRoll
                    key={trackType}
                    trackType={trackType}
                    notes={notes}
                    maxTime={maxTime}
                    zoom={zoom}
                    playbackTime={playbackTime}
                    isPlaying={isPlaying}
                    volume={volumeOf(trackType)}
                    onVolumeChange={(v) => handleVolumeChange(trackType, v)}
                    onSeek={handleSeek}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                    selectionStart={selectionStart}
                    selectionEnd={selectionEnd}
                  />
                )
              })}
            </>
          ) : (
            // 単一トラック表示
            <TrackPianoRoll
              trackType="other"
              notes={tracksData.default || []}
              maxTime={maxTime}
              zoom={zoom}
              playbackTime={playbackTime}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              selectionStart={selectionStart}
              selectionEnd={selectionEnd}
            />
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-2 border-t border-gray-700 bg-gray-800 text-xs text-gray-400">
          Space: Play/Stop | Click: 位置移動 | Drag: 範囲選択 | 🔊 各トラックの音量で調整（0で消音）
        </div>
      </div>
    </div>
  )
}
