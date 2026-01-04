/**
 * ピアノロールコンポーネント
 *
 * 機能:
 * - グリッド表示（ピッチ × 時間）
 * - クリックでノート追加/削除
 * - 複数選択（Shift+クリック）
 * - コピー/ペースト/削除（Cmd+C/V, Delete）
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  Note,
  PianoRollConfig,
  DEFAULT_PIANO_ROLL_CONFIG,
  pitchToNoteName,
} from '../../types/music'

interface PianoRollProps {
  notes: Note[]
  onNotesChange: (notes: Note[]) => void
  onNoteAdd?: (pitch: number) => void // ノート追加時のコールバック（プレビュー用）
  config?: Partial<PianoRollConfig>
  className?: string
  currentBeat?: number // 再生位置（拍）
  isPlaying?: boolean
  // クリップボード機能
  onCopy?: (notes: Note[]) => void
  onPaste?: () => Note[] | undefined
}

export function PianoRoll({
  notes,
  onNotesChange,
  onNoteAdd,
  config: configOverride,
  className = '',
  currentBeat = 0,
  isPlaying = false,
  onCopy,
  onPaste,
}: PianoRollProps) {
  const config = useMemo(
    () => ({ ...DEFAULT_PIANO_ROLL_CONFIG, ...configOverride }),
    [configOverride]
  )

  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [cursorBeat, setCursorBeat] = useState(0)

  // ドラッグ選択用の状態
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null)
  const justFinishedDragging = useRef(false)

  // ピッチの配列（高い音から低い音へ）
  const pitches = useMemo(() => {
    const result: number[] = []
    for (let p = config.maxPitch; p >= config.minPitch; p--) {
      result.push(p)
    }
    return result
  }, [config.minPitch, config.maxPitch])

  // 拍の配列
  const beats = useMemo(() => {
    const totalBeats = config.visibleBars * config.beatsPerBar
    return Array.from({ length: totalBeats }, (_, i) => i)
  }, [config.visibleBars, config.beatsPerBar])

  // グリッドの高さと幅
  const gridHeight = pitches.length * config.noteHeight
  const gridWidth = beats.length * config.beatWidth

  // 選択されたノートを削除
  const deleteSelectedNotes = useCallback(() => {
    if (selectedNoteIds.size === 0) return
    onNotesChange(notes.filter((n) => !selectedNoteIds.has(n.id)))
    setSelectedNoteIds(new Set())
  }, [notes, onNotesChange, selectedNoteIds])

  // 選択されたノートをコピー
  const copySelectedNotes = useCallback(() => {
    if (selectedNoteIds.size === 0 || !onCopy) return
    const selectedNotes = notes.filter((n) => selectedNoteIds.has(n.id))
    if (selectedNotes.length === 0) return

    // 最小の開始位置を基準に相対位置で保存
    const minStart = Math.min(...selectedNotes.map((n) => n.start))
    const relativizedNotes = selectedNotes.map((n) => ({
      ...n,
      start: n.start - minStart,
    }))
    onCopy(relativizedNotes)
  }, [notes, selectedNoteIds, onCopy])

  // クリップボードからペースト（カーソル位置に挿入）
  const pasteNotes = useCallback(() => {
    if (!onPaste) return
    const clipboardNotes = onPaste()
    if (!clipboardNotes || clipboardNotes.length === 0) return

    // カーソル位置にペースト
    const pasteStart = cursorBeat
    const newNotes = clipboardNotes.map((n) => ({
      ...n,
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      start: n.start + pasteStart,
    }))

    onNotesChange([...notes, ...newNotes])
    // 新しくペーストしたノートを選択
    setSelectedNoteIds(new Set(newNotes.map((n) => n.id)))
  }, [notes, onNotesChange, onPaste, cursorBeat])

  // 全選択
  const selectAll = useCallback(() => {
    setSelectedNoteIds(new Set(notes.map((n) => n.id)))
  }, [notes])

  // キーボードショートカット
  useEffect(() => {
    if (!isFocused) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key === 'c') {
        e.preventDefault()
        copySelectedNotes()
      } else if (isMod && e.key === 'v') {
        e.preventDefault()
        pasteNotes()
      } else if (isMod && e.key === 'a') {
        e.preventDefault()
        selectAll()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelectedNotes()
      } else if (e.key === 'Escape') {
        setSelectedNoteIds(new Set())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFocused, copySelectedNotes, pasteNotes, selectAll, deleteSelectedNotes])

  // グリッドクリックでノート追加/選択
  const handleGridClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // ドラッグ選択直後はクリック処理をスキップ
      if (justFinishedDragging.current) {
        justFinishedDragging.current = false
        return
      }

      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // クリック位置からピッチと拍を計算
      const pitchIndex = Math.floor(y / config.noteHeight)
      const beat = Math.floor(x / config.beatWidth)

      if (pitchIndex < 0 || pitchIndex >= pitches.length) return
      if (beat < 0 || beat >= beats.length) return

      const pitch = pitches[pitchIndex]

      // 既存のノートがあるかチェック
      const existingNote = notes.find(
        (n) => n.pitch === pitch && n.start <= beat && n.start + n.duration > beat
      )

      if (existingNote) {
        if (e.shiftKey) {
          // Shift+クリック: 選択に追加/除去
          setSelectedNoteIds((prev) => {
            const next = new Set(prev)
            if (next.has(existingNote.id)) {
              next.delete(existingNote.id)
            } else {
              next.add(existingNote.id)
            }
            return next
          })
        } else if (selectedNoteIds.has(existingNote.id) && selectedNoteIds.size === 1) {
          // 単一選択中のノートをクリック: 削除
          onNotesChange(notes.filter((n) => n.id !== existingNote.id))
          setSelectedNoteIds(new Set())
        } else {
          // 通常クリック: そのノートのみ選択
          setSelectedNoteIds(new Set([existingNote.id]))
        }
      } else {
        // 空きスペースにノート追加
        const newNote: Note = {
          id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          pitch,
          start: beat,
          duration: 1, // デフォルト1拍
        }
        onNotesChange([...notes, newNote])
        setSelectedNoteIds(new Set([newNote.id]))
        // プレビュー音を鳴らす
        onNoteAdd?.(pitch)
      }
    },
    [notes, onNotesChange, onNoteAdd, pitches, beats, config.noteHeight, config.beatWidth, selectedNoteIds]
  )

  // 黒鍵かどうか判定
  const isBlackKey = (pitch: number): boolean => {
    const note = pitch % 12
    return [1, 3, 6, 8, 10].includes(note)
  }

  // マウス移動でカーソル位置を更新
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const beat = Math.floor(x / config.beatWidth)
      setCursorBeat(Math.max(0, Math.min(beat, beats.length - 1)))

      // ドラッグ中なら選択範囲を更新
      if (isDragging) {
        setDragEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }
    },
    [config.beatWidth, beats.length, isDragging]
  )

  // ドラッグ開始（Cmd/Ctrl+マウスダウン）
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.metaKey || e.ctrlKey) {
        const svg = e.currentTarget
        const rect = svg.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setIsDragging(true)
        setDragStart({ x, y })
        setDragEnd({ x, y })
        e.preventDefault()
      }
    },
    []
  )

  // ドラッグ終了
  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart && dragEnd) {
      // 選択範囲内のノートを選択
      const minX = Math.min(dragStart.x, dragEnd.x)
      const maxX = Math.max(dragStart.x, dragEnd.x)
      const minY = Math.min(dragStart.y, dragEnd.y)
      const maxY = Math.max(dragStart.y, dragEnd.y)

      const startBeat = Math.floor(minX / config.beatWidth)
      const endBeat = Math.ceil(maxX / config.beatWidth)
      const startPitchIndex = Math.floor(minY / config.noteHeight)
      const endPitchIndex = Math.ceil(maxY / config.noteHeight)

      const selectedPitches = pitches.slice(startPitchIndex, endPitchIndex)

      const newSelectedIds = new Set<string>()
      notes.forEach((note) => {
        const noteEnd = note.start + note.duration
        if (
          selectedPitches.includes(note.pitch) &&
          note.start < endBeat &&
          noteEnd > startBeat
        ) {
          newSelectedIds.add(note.id)
        }
      })

      setSelectedNoteIds(newSelectedIds)
      // ドラッグ終了フラグを立てて、直後のclickイベントをスキップ
      justFinishedDragging.current = true
    }
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [isDragging, dragStart, dragEnd, config.beatWidth, config.noteHeight, pitches, notes])

  // マウスがSVGから離れた時
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleMouseUp()
    }
  }, [isDragging, handleMouseUp])

  // 小節番号の配列
  const bars = useMemo(() => {
    return Array.from({ length: config.visibleBars }, (_, i) => i + 1)
  }, [config.visibleBars])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className} ${isFocused ? 'ring-1 ring-blue-500' : ''}`}
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {/* 小節番号ヘッダー */}
      <div
        className="sticky top-0 z-20 flex"
        style={{ marginLeft: 48, width: gridWidth }}
      >
        {bars.map((bar) => (
          <div
            key={bar}
            className="text-xs text-gray-400 bg-gray-800 border-b border-gray-600 flex items-center justify-center flex-shrink-0"
            style={{
              width: config.beatsPerBar * config.beatWidth,
              height: 20,
              borderRight: '1px solid #555'
            }}
          >
            {bar}
          </div>
        ))}
      </div>

      {/* ピアノキー（左側） */}
      <div
        className="absolute left-0 z-10 bg-gray-800"
        style={{ width: 48, height: gridHeight, top: 20 }}
      >
        {pitches.map((pitch) => (
          <div
            key={pitch}
            className={`flex items-center justify-end pr-1 text-xs border-b border-gray-700 ${
              isBlackKey(pitch) ? 'bg-gray-900 text-gray-400' : 'bg-gray-700 text-white'
            }`}
            style={{ height: config.noteHeight }}
          >
            {pitchToNoteName(pitch)}
          </div>
        ))}
      </div>

      {/* グリッド */}
      <svg
        ref={svgRef}
        width={gridWidth}
        height={gridHeight}
        onClick={handleGridClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
        style={{ marginLeft: 48 }}
      >
        {/* 背景グリッド */}
        {pitches.map((pitch, pitchIndex) => (
          <g key={pitch}>
            {/* 行の背景 */}
            <rect
              x={0}
              y={pitchIndex * config.noteHeight}
              width={gridWidth}
              height={config.noteHeight}
              fill={isBlackKey(pitch) ? '#1a1a2e' : '#16213e'}
              stroke="#333"
              strokeWidth={0.5}
            />
            {/* 拍線 */}
            {beats.map((beat) => (
              <line
                key={beat}
                x1={beat * config.beatWidth}
                y1={pitchIndex * config.noteHeight}
                x2={beat * config.beatWidth}
                y2={(pitchIndex + 1) * config.noteHeight}
                stroke={beat % config.beatsPerBar === 0 ? '#555' : '#333'}
                strokeWidth={beat % config.beatsPerBar === 0 ? 1 : 0.5}
              />
            ))}
          </g>
        ))}

        {/* ノート */}
        {notes.map((note) => {
          const pitchIndex = pitches.indexOf(note.pitch)
          if (pitchIndex === -1) return null

          const x = note.start * config.beatWidth
          const y = pitchIndex * config.noteHeight
          const width = note.duration * config.beatWidth - 2
          const height = config.noteHeight - 2
          const isSelected = selectedNoteIds.has(note.id)

          return (
            <rect
              key={note.id}
              x={x + 1}
              y={y + 1}
              width={width}
              height={height}
              rx={2}
              fill={isSelected ? '#60a5fa' : '#3b82f6'}
              stroke={isSelected ? '#93c5fd' : '#2563eb'}
              strokeWidth={isSelected ? 2 : 1}
              className="cursor-pointer hover:brightness-110"
            />
          )
        })}

        {/* カーソル位置インジケータ */}
        {isFocused && !isPlaying && (
          <line
            x1={cursorBeat * config.beatWidth}
            y1={0}
            x2={cursorBeat * config.beatWidth}
            y2={gridHeight}
            stroke="#60a5fa"
            strokeWidth={1}
            strokeDasharray="4 2"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* プレイヘッド（再生位置インジケータ） */}
        {isPlaying && (
          <line
            x1={currentBeat * config.beatWidth}
            y1={0}
            x2={currentBeat * config.beatWidth}
            y2={gridHeight}
            stroke="#ef4444"
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* ドラッグ選択範囲 */}
        {isDragging && dragStart && dragEnd && (
          <rect
            x={Math.min(dragStart.x, dragEnd.x)}
            y={Math.min(dragStart.y, dragEnd.y)}
            width={Math.abs(dragEnd.x - dragStart.x)}
            height={Math.abs(dragEnd.y - dragStart.y)}
            fill="rgba(96, 165, 250, 0.2)"
            stroke="#60a5fa"
            strokeWidth={1}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>
    </div>
  )
}
