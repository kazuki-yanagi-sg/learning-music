/**
 * 解析結果用ドラムグリッドコンポーネント
 *
 * ドラムをピアノロールではなく、DAW風のグリッド形式で表示
 */
import { useMemo, useRef, useEffect } from 'react'
import { NoteInfo } from '../../services/songAnalysisApi'

// GM Drum Map（MIDIノート番号→ドラム名）
const GM_DRUM_MAP: { [key: number]: { name: string; shortName: string; color: string } } = {
  35: { name: 'Acoustic Bass Drum', shortName: 'Kick', color: '#ec4899' },
  36: { name: 'Bass Drum 1', shortName: 'Kick', color: '#ec4899' },
  37: { name: 'Side Stick', shortName: 'Stick', color: '#f472b6' },
  38: { name: 'Acoustic Snare', shortName: 'Snare', color: '#8b5cf6' },
  39: { name: 'Hand Clap', shortName: 'Clap', color: '#a78bfa' },
  40: { name: 'Electric Snare', shortName: 'E.Snare', color: '#8b5cf6' },
  41: { name: 'Low Floor Tom', shortName: 'Lo Tom', color: '#3b82f6' },
  42: { name: 'Closed Hi-Hat', shortName: 'HH(C)', color: '#22c55e' },
  43: { name: 'High Floor Tom', shortName: 'Fl Tom', color: '#3b82f6' },
  44: { name: 'Pedal Hi-Hat', shortName: 'HH(P)', color: '#22c55e' },
  45: { name: 'Low Tom', shortName: 'Lo Tom', color: '#0ea5e9' },
  46: { name: 'Open Hi-Hat', shortName: 'HH(O)', color: '#84cc16' },
  47: { name: 'Low-Mid Tom', shortName: 'Mid Tom', color: '#0ea5e9' },
  48: { name: 'Hi-Mid Tom', shortName: 'Hi Tom', color: '#06b6d4' },
  49: { name: 'Crash Cymbal 1', shortName: 'Crash', color: '#fbbf24' },
  50: { name: 'High Tom', shortName: 'Hi Tom', color: '#06b6d4' },
  51: { name: 'Ride Cymbal 1', shortName: 'Ride', color: '#f59e0b' },
  52: { name: 'Chinese Cymbal', shortName: 'China', color: '#fb923c' },
  53: { name: 'Ride Bell', shortName: 'R.Bell', color: '#f97316' },
  55: { name: 'Splash Cymbal', shortName: 'Splash', color: '#fcd34d' },
  57: { name: 'Crash Cymbal 2', shortName: 'Crash2', color: '#fbbf24' },
}

// 表示するドラム行（上から下の順序）
const DRUM_ROWS = [
  { pitch: 49, name: 'Crash', color: '#fbbf24' },
  { pitch: 51, name: 'Ride', color: '#f59e0b' },
  { pitch: 46, name: 'HH(O)', color: '#84cc16' },
  { pitch: 42, name: 'HH(C)', color: '#22c55e' },
  { pitch: 48, name: 'Hi Tom', color: '#06b6d4' },
  { pitch: 47, name: 'Mid Tom', color: '#0ea5e9' },
  { pitch: 45, name: 'Lo Tom', color: '#3b82f6' },
  { pitch: 38, name: 'Snare', color: '#8b5cf6' },
  { pitch: 36, name: 'Kick', color: '#ec4899' },
]

interface AnalysisDrumGridProps {
  notes: NoteInfo[]
  maxTime: number
  zoom: number
  playbackTime: number
  isPlaying: boolean
  isMuted: boolean
  onToggleMute: () => void
  tempo?: number
}

export function AnalysisDrumGrid({
  notes,
  maxTime,
  zoom,
  playbackTime,
  isPlaying,
  isMuted,
  onToggleMute,
  tempo = 120,
}: AnalysisDrumGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const rowHeight = 24
  const pixelsPerSecond = 80 * zoom
  const beatDuration = 60 / tempo  // 1拍の長さ（秒）
  const barDuration = beatDuration * 4  // 1小節の長さ（秒）

  const gridHeight = DRUM_ROWS.length * rowHeight
  const gridWidth = maxTime * pixelsPerSecond

  // ノートを正規化してドラム行に割り当て
  const normalizedNotes = useMemo(() => {
    return notes.map(note => {
      // GM Drum Mapで対応するドラムを探す
      const drumInfo = GM_DRUM_MAP[note.pitch]

      // 対応するピッチが見つからない場合は最も近いものにマップ
      let mappedPitch = note.pitch
      if (!DRUM_ROWS.find(r => r.pitch === note.pitch)) {
        // キック（低い音）
        if (note.pitch < 40) mappedPitch = 36
        // スネア（中程度）
        else if (note.pitch < 45) mappedPitch = 38
        // ハイハット（高い音）
        else if (note.pitch < 55) mappedPitch = 42
        // シンバル（さらに高い音）
        else mappedPitch = 49
      }

      return {
        ...note,
        originalPitch: note.pitch,
        pitch: mappedPitch,
        drumName: drumInfo?.shortName || 'Unknown',
      }
    })
  }, [notes])

  // 小節線の位置
  const barLines = useMemo(() => {
    const lines: number[] = []
    for (let t = 0; t <= maxTime; t += barDuration) {
      lines.push(t)
    }
    return lines
  }, [maxTime, barDuration])

  // 拍線の位置
  const beatLines = useMemo(() => {
    const lines: number[] = []
    for (let t = 0; t <= maxTime; t += beatDuration) {
      lines.push(t)
    }
    return lines
  }, [maxTime, beatDuration])

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
        style={{ backgroundColor: '#7f1d1d' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm font-bold text-white">Drums</span>
          <span className="text-xs text-white/70">({notes.length} hits)</span>
          {tempo > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-white/20 rounded text-white/80">
              {tempo} BPM
            </span>
          )}
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

      {/* ドラムグリッド */}
      <div className="flex" style={{ height: gridHeight + 20 }}>
        {/* ドラム名ラベル */}
        <div className="flex-shrink-0 bg-gray-800" style={{ width: 60 }}>
          {DRUM_ROWS.map((drum) => (
            <div
              key={drum.pitch}
              className="flex items-center gap-1 px-1 text-[10px] border-b border-gray-700 text-gray-300"
              style={{ height: rowHeight }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: drum.color }}
              />
              <span className="truncate">{drum.name}</span>
            </div>
          ))}
        </div>

        {/* グリッド */}
        <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <svg width={gridWidth} height={gridHeight} className="block">
            {/* 背景行 */}
            {DRUM_ROWS.map((drum, idx) => (
              <rect
                key={drum.pitch}
                x={0}
                y={idx * rowHeight}
                width={gridWidth}
                height={rowHeight}
                fill={idx % 2 === 0 ? '#1a1a2e' : '#16213e'}
                stroke="#333"
                strokeWidth={0.3}
              />
            ))}

            {/* 拍線（薄い） */}
            {beatLines.map((t, i) => (
              <line
                key={`beat-${i}`}
                x1={t * pixelsPerSecond}
                y1={0}
                x2={t * pixelsPerSecond}
                y2={gridHeight}
                stroke="#333"
                strokeWidth={0.5}
              />
            ))}

            {/* 小節線（濃い） */}
            {barLines.map((t, i) => (
              <g key={`bar-${i}`}>
                <line
                  x1={t * pixelsPerSecond}
                  y1={0}
                  x2={t * pixelsPerSecond}
                  y2={gridHeight}
                  stroke="#555"
                  strokeWidth={1}
                />
                <text
                  x={t * pixelsPerSecond + 3}
                  y={12}
                  fill="#666"
                  fontSize={9}
                >
                  {i + 1}
                </text>
              </g>
            ))}

            {/* ノート（丸形で表示 - ドラムらしく） */}
            {normalizedNotes.map((note, i) => {
              const rowIndex = DRUM_ROWS.findIndex(r => r.pitch === note.pitch)
              if (rowIndex === -1) return null

              const row = DRUM_ROWS[rowIndex]
              const x = note.start * pixelsPerSecond
              const y = rowIndex * rowHeight + rowHeight / 2
              const radius = Math.min(rowHeight / 2 - 2, 8)

              // ベロシティに応じて透明度を変える
              const opacity = 0.5 + (note.velocity / 127) * 0.5

              return (
                <g key={i}>
                  {/* ノートの丸 */}
                  <circle
                    cx={x + radius}
                    cy={y}
                    r={radius}
                    fill={row.color}
                    opacity={opacity}
                  />
                  {/* ベロシティが高いものには光彩を追加 */}
                  {note.velocity > 100 && (
                    <circle
                      cx={x + radius}
                      cy={y}
                      r={radius + 2}
                      fill="none"
                      stroke={row.color}
                      strokeWidth={1}
                      opacity={0.5}
                    />
                  )}
                </g>
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
