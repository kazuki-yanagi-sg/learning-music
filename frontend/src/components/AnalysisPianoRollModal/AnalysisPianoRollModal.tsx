/**
 * 解析結果ピアノロールモーダル
 *
 * 4トラック表示:
 * - ドラム: 専用のグリッド形式（DAW風）
 * - ベース/その他: ピアノロール形式
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { AnalysisResult, FourTrackResult, NoteInfo } from '../../services/songAnalysisApi'
import { audioEngine } from '../../services/audioEngine'
import { AnalysisDrumGrid } from './AnalysisDrumGrid'

interface AnalysisPianoRollModalProps {
  isOpen: boolean
  onClose: () => void
  result: AnalysisResult | FourTrackResult
}

// 4トラック結果かどうかを判定
function isFourTrackResult(result: AnalysisResult | FourTrackResult): result is FourTrackResult {
  return 'tracks' in result
}

// トラック設定
const TRACK_CONFIG = {
  drums: {
    label: 'Drums',
    color: '#ef4444',
    bgColor: '#7f1d1d',
    defaultPitchRange: { min: 35, max: 52 }, // ドラム用MIDI範囲
  },
  bass: {
    label: 'Bass',
    color: '#22c55e',
    bgColor: '#14532d',
    defaultPitchRange: { min: 28, max: 55 }, // ベース用
  },
  other: {
    label: 'Guitar/Keys',
    color: '#3b82f6',
    bgColor: '#1e3a8a',
    defaultPitchRange: { min: 48, max: 84 }, // コード楽器用
  },
  melody: {
    label: 'Melody',
    color: '#f59e0b',  // オレンジ系（ボーカルメロディを強調）
    bgColor: '#78350f',
    defaultPitchRange: { min: 48, max: 84 }, // ボーカル音域
  },
} as const

type TrackType = keyof typeof TRACK_CONFIG

// ピッチ名変換
function pitchToNoteName(pitch: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(pitch / 12) - 1
  const note = noteNames[pitch % 12]
  return `${note}${octave}`
}

// 黒鍵判定
function isBlackKey(pitch: number): boolean {
  return [1, 3, 6, 8, 10].includes(pitch % 12)
}

// 単一トラックのピアノロール
interface TrackPianoRollProps {
  trackType: TrackType
  notes: NoteInfo[]
  maxTime: number
  zoom: number
  playbackTime: number
  isPlaying: boolean
  isMuted: boolean
  onToggleMute: () => void
}

function TrackPianoRoll({
  trackType,
  notes,
  maxTime,
  zoom,
  playbackTime,
  isPlaying,
  isMuted,
  onToggleMute,
}: TrackPianoRollProps) {
  const config = TRACK_CONFIG[trackType]
  const containerRef = useRef<HTMLDivElement>(null)

  // このトラックの音域を計算
  const { min: minPitch, max: maxPitch } = useMemo(() => {
    if (notes.length === 0) {
      return config.defaultPitchRange
    }
    const pitches = notes.map(n => n.pitch)
    return {
      min: Math.max(0, Math.min(...pitches) - 2),
      max: Math.min(127, Math.max(...pitches) + 2),
    }
  }, [notes, config.defaultPitchRange])

  const noteHeight = 8
  const pixelsPerSecond = 80 * zoom

  const pitches = useMemo(() => {
    const result: number[] = []
    for (let p = maxPitch; p >= minPitch; p--) {
      result.push(p)
    }
    return result
  }, [minPitch, maxPitch])

  const gridHeight = pitches.length * noteHeight
  const gridWidth = maxTime * pixelsPerSecond

  // 秒数マーカー（5秒ごと）
  const timeMarkers = useMemo(() => {
    const markers: number[] = []
    for (let t = 0; t <= maxTime; t += 5) {
      markers.push(t)
    }
    return markers
  }, [maxTime])

  // プレイヘッドの自動スクロール
  useEffect(() => {
    if (isPlaying && containerRef.current) {
      const scrollLeft = playbackTime * pixelsPerSecond - containerRef.current.clientWidth / 2
      containerRef.current.scrollLeft = Math.max(0, scrollLeft)
    }
  }, [isPlaying, playbackTime, pixelsPerSecond])

  return (
    <div className={`flex flex-col border-b border-gray-700 ${isMuted ? 'opacity-40' : ''}`}>
      {/* トラックヘッダー */}
      <div
        className="flex items-center justify-between px-3 py-1 border-b border-gray-600"
        style={{ backgroundColor: config.bgColor }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-sm font-bold text-white">{config.label}</span>
          <span className="text-xs text-white/70">({notes.length} notes)</span>
        </div>
        <button
          onClick={onToggleMute}
          className={`px-2 py-0.5 rounded text-xs font-bold ${
            isMuted
              ? 'bg-gray-600 text-gray-300'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          {isMuted ? 'MUTED' : 'M'}
        </button>
      </div>

      {/* ピアノロール */}
      <div className="flex" style={{ height: gridHeight + 20 }}>
        {/* ピアノキー */}
        <div className="flex-shrink-0 bg-gray-800" style={{ width: 40 }}>
          {pitches.map((pitch) => (
            <div
              key={pitch}
              className={`flex items-center justify-end pr-1 text-[10px] border-b border-gray-700 ${
                isBlackKey(pitch) ? 'bg-gray-900 text-gray-500' : 'bg-gray-700 text-gray-400'
              }`}
              style={{ height: noteHeight }}
            >
              {pitch % 12 === 0 ? pitchToNoteName(pitch) : ''}
            </div>
          ))}
        </div>

        {/* グリッド */}
        <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <svg width={gridWidth} height={gridHeight} className="block">
            {/* 背景 */}
            {pitches.map((pitch, idx) => (
              <rect
                key={pitch}
                x={0}
                y={idx * noteHeight}
                width={gridWidth}
                height={noteHeight}
                fill={isBlackKey(pitch) ? '#1a1a2e' : '#16213e'}
                stroke="#333"
                strokeWidth={0.3}
              />
            ))}

            {/* 時間線 */}
            {timeMarkers.map((t) => (
              <g key={t}>
                <line
                  x1={t * pixelsPerSecond}
                  y1={0}
                  x2={t * pixelsPerSecond}
                  y2={gridHeight}
                  stroke="#444"
                  strokeWidth={1}
                />
                <text
                  x={t * pixelsPerSecond + 2}
                  y={10}
                  fill="#666"
                  fontSize={9}
                >
                  {Math.floor(t / 60)}:{String(t % 60).padStart(2, '0')}
                </text>
              </g>
            ))}

            {/* ノート */}
            {notes.map((note, i) => {
              const pitchIndex = pitches.indexOf(note.pitch)
              if (pitchIndex === -1) return null

              const x = note.start * pixelsPerSecond
              const y = pitchIndex * noteHeight
              const width = Math.max(2, (note.end - note.start) * pixelsPerSecond - 1)

              return (
                <rect
                  key={i}
                  x={x}
                  y={y + 1}
                  width={width}
                  height={noteHeight - 2}
                  rx={1}
                  fill={config.color}
                  opacity={0.9}
                />
              )
            })}

            {/* プレイヘッド */}
            {isPlaying && playbackTime > 0 && (
              <line
                x1={playbackTime * pixelsPerSecond}
                y1={0}
                x2={playbackTime * pixelsPerSecond}
                y2={gridHeight}
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}

export function AnalysisPianoRollModal({
  isOpen,
  onClose,
  result,
}: AnalysisPianoRollModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set())

  // 再生状態
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const playbackRef = useRef<{ stop: () => void } | null>(null)
  const [audioInitialized, setAudioInitialized] = useState(false)

  // トラックデータ
  const tracksData = useMemo(() => {
    if (isFourTrackResult(result)) {
      return {
        drums: result.tracks.drums?.notes || [],
        bass: result.tracks.bass?.notes || [],
        other: result.tracks.other?.notes || [],
        melody: result.tracks.melody?.notes || [],  // ボーカルメロディ
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

  // ミュート切り替え
  const toggleMute = useCallback((trackType: string) => {
    setMutedTracks(prev => {
      const next = new Set(prev)
      if (next.has(trackType)) {
        next.delete(trackType)
      } else {
        next.add(trackType)
      }
      return next
    })
  }, [])

  // 再生/停止
  const handlePlayToggle = useCallback(async () => {
    if (isPlaying) {
      playbackRef.current?.stop()
      playbackRef.current = null
      setIsPlaying(false)
      setPlaybackTime(0)
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
        playbackRef.current = audioEngine.play4TrackAnalysis(
          {
            drums: mutedTracks.has('drums') ? [] : result.tracks.drums?.notes,
            bass: mutedTracks.has('bass') ? [] : result.tracks.bass?.notes,
            other: mutedTracks.has('other') ? [] : result.tracks.other?.notes,
            melody: mutedTracks.has('melody') ? [] : result.tracks.melody?.notes,
          },
          mutedTracks,
          onProgress
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
  }, [isPlaying, audioInitialized, result, mutedTracks])

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

        {/* トラック別ピアノロール */}
        <div className="flex-1 overflow-y-auto">
          {is4Track ? (
            // 4トラック表示
            <>
              {/* メロディ（ボーカル）は一番上に表示 */}
              <TrackPianoRoll
                trackType="melody"
                notes={tracksData.melody || []}
                maxTime={maxTime}
                zoom={zoom}
                playbackTime={playbackTime}
                isPlaying={isPlaying}
                isMuted={mutedTracks.has('melody')}
                onToggleMute={() => toggleMute('melody')}
              />
              {/* ドラムは専用グリッド */}
              <AnalysisDrumGrid
                notes={tracksData.drums || []}
                maxTime={maxTime}
                zoom={zoom}
                playbackTime={playbackTime}
                isPlaying={isPlaying}
                isMuted={mutedTracks.has('drums')}
                onToggleMute={() => toggleMute('drums')}
                tempo={result.tempo || 120}
              />
              {/* ベース・その他はピアノロール */}
              {(['bass', 'other'] as TrackType[]).map(trackType => {
                const notes = tracksData[trackType] || []
                return (
                  <TrackPianoRoll
                    key={trackType}
                    trackType={trackType}
                    notes={notes}
                    maxTime={maxTime}
                    zoom={zoom}
                    playbackTime={playbackTime}
                    isPlaying={isPlaying}
                    isMuted={mutedTracks.has(trackType)}
                    onToggleMute={() => toggleMute(trackType)}
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
              isMuted={false}
              onToggleMute={() => {}}
            />
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-2 border-t border-gray-700 bg-gray-800 text-xs text-gray-400">
          Space: Play/Stop | Scroll: horizontal scroll | M: Mute track
        </div>
      </div>
    </div>
  )
}
