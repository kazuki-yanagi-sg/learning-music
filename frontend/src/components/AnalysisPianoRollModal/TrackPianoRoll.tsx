/**
 * 単一トラックのピアノロール表示
 *
 * AnalysisPianoRollModal から逐語抽出（move-only）。
 * ★SVG 描画 JSX・座標計算式（pixelsPerSecond = 80 * zoom、noteHeight = 8、
 *   ピッチ範囲 min-2..max+2、playbackTime*pixelsPerSecond 等）は一切変更していない。
 */
import { useMemo, useRef, useEffect } from 'react'
import { NoteInfo } from '../../services/songAnalysisApi'

/**
 * トラック設定（htdemucs_6s 対応で guitar/keyboard を追加）
 *
 * 描画対象: bass / guitar / keyboard（melody/other は描画しない）
 * drums は AnalysisDrumGrid で別途描画するため TRACK_CONFIG には含めるが
 * AnalysisPianoRollModal の描画リストには含めない。
 */
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
    defaultPitchRange: { min: 48, max: 84 }, // コード楽器用（後方互換で残す）
  },
  melody: {
    label: 'Melody',
    color: '#f59e0b',  // オレンジ系（ピアノメロディを強調）
    bgColor: '#78350f',
    defaultPitchRange: { min: 48, max: 84 }, // ピアノメロディ音域
  },
  // htdemucs_6s 追加 stem（設計書 B-3）
  guitar: {
    label: 'Guitar',
    color: '#a78bfa',  // 紫系（ギターを視覚的に識別）
    bgColor: '#4c1d95',
    defaultPitchRange: { min: 40, max: 84 }, // ギター音域 E2〜C6
  },
  keyboard: {
    label: 'Keyboard',
    color: '#38bdf8',  // 水色（キーボード/ピアノを識別）
    bgColor: '#0c4a6e',
    defaultPitchRange: { min: 48, max: 84 }, // キーボード中音域
  },
} as const

export type TrackType = keyof typeof TRACK_CONFIG

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
  // 音量（UI は音量スライダーのみ。0 で実質ミュート）
  volume?: number
  onVolumeChange?: (volume: number) => void
  onSeek?: (time: number) => void
  // ドラッグ選択
  onDragStart?: (time: number) => void
  onDragMove?: (time: number) => void
  onDragEnd?: () => void
  selectionStart?: number | null
  selectionEnd?: number | null
}

export function TrackPianoRoll({
  trackType,
  notes,
  maxTime,
  zoom,
  playbackTime,
  isPlaying,
  volume = 1,
  onVolumeChange,
  onSeek,
  onDragStart,
  onDragMove,
  onDragEnd,
  selectionStart,
  selectionEnd,
}: TrackPianoRollProps) {
  // 音量0は実質ミュート（行を薄く表示）
  const isSilenced = volume <= 0
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
    <div className={`flex flex-col border-b border-gray-700 ${isSilenced ? 'opacity-40' : ''}`}>
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
        {/* 音量スライダー（0〜1.5、既定1.0。0で実質ミュート）。
            操作しやすいよう 🔊アイコン＋広めのスライダー＋%表示をまとめる。 */}
        {onVolumeChange && (
          <div className="flex items-center gap-2 bg-black/25 rounded px-2 py-1">
            <span className="text-xs" aria-hidden>🔊</span>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              aria-label={`${config.label} 音量`}
              title={`${config.label} 音量 ${Math.round(volume * 100)}%（0で消音）`}
              className="w-32 h-1.5 accent-white cursor-pointer"
            />
            <span className="text-xs font-bold text-white w-10 text-right tabular-nums">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}
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

        {/* グリッド（クリック=シーク、ドラッグ=範囲選択） */}
        <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <svg
            width={gridWidth}
            height={gridHeight}
            className="block cursor-crosshair select-none"
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0)
              const time = Math.max(0, Math.min(x / pixelsPerSecond, maxTime))
              onDragStart?.(time)
            }}
            onMouseMove={(e) => {
              if (!onDragMove) return
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0)
              const time = Math.max(0, Math.min(x / pixelsPerSecond, maxTime))
              onDragMove(time)
            }}
            onMouseUp={(e) => {
              // ドラッグ距離が短ければクリック扱い（シーク）
              const start = selectionStart ?? 0
              const end = selectionEnd ?? 0
              const distance = Math.abs(end - start)
              if (distance < 0.5 && onSeek) {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0)
                const time = Math.max(0, Math.min(x / pixelsPerSecond, maxTime))
                onSeek(time)
              }
              onDragEnd?.()
            }}
            onMouseLeave={() => onDragEnd?.()}
          >
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

            {/* 選択範囲 */}
            {selectionStart != null && selectionEnd != null && Math.abs(selectionEnd - selectionStart) > 0.1 && (
              <rect
                x={Math.min(selectionStart, selectionEnd) * pixelsPerSecond}
                y={0}
                width={Math.abs(selectionEnd - selectionStart) * pixelsPerSecond}
                height={gridHeight}
                fill="rgba(168, 85, 247, 0.3)"
                stroke="#a855f7"
                strokeWidth={1}
              />
            )}

            {/* プレイヘッド（常に表示） */}
            {playbackTime > 0 && (
              <line
                x1={playbackTime * pixelsPerSecond}
                y1={0}
                x2={playbackTime * pixelsPerSecond}
                y2={gridHeight}
                stroke={isPlaying ? '#fff' : '#888'}
                strokeWidth={2}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}
