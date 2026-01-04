/**
 * ドラムグリッドコンポーネント
 *
 * ドラム専用のシンプルなグリッドUI
 * 複数選択、コピー/ペースト/削除対応
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Note } from '../../types/music'

// ドラムキットの定義
export const DRUM_SOUNDS = [
  { id: 'crash', name: 'クラッシュ', pitch: 49, color: '#fbbf24' },
  { id: 'ride', name: 'ライド', pitch: 51, color: '#f59e0b' },
  { id: 'hihat-open', name: 'ハイハット(O)', pitch: 46, color: '#84cc16' },
  { id: 'hihat-closed', name: 'ハイハット(C)', pitch: 42, color: '#22c55e' },
  { id: 'tom-high', name: 'ハイタム', pitch: 48, color: '#06b6d4' },
  { id: 'tom-mid', name: 'ミドルタム', pitch: 47, color: '#0ea5e9' },
  { id: 'tom-low', name: 'ロータム', pitch: 45, color: '#3b82f6' },
  { id: 'snare', name: 'スネア', pitch: 38, color: '#8b5cf6' },
  { id: 'kick', name: 'キック', pitch: 36, color: '#ec4899' },
] as const

interface DrumGridProps {
  notes: Note[]
  onNotesChange: (notes: Note[]) => void
  onNoteAdd?: (pitch: number) => void // ノート追加時のコールバック（プレビュー用）
  visibleBars?: number
  beatWidth?: number
  className?: string
  currentBeat?: number
  isPlaying?: boolean
  // クリップボード機能
  onCopy?: (notes: Note[]) => void
  onPaste?: () => Note[] | undefined
}

export function DrumGrid({
  notes,
  onNotesChange,
  onNoteAdd,
  visibleBars = 4,
  beatWidth = 30,
  className = '',
  currentBeat = 0,
  isPlaying = false,
  onCopy,
  onPaste,
}: DrumGridProps) {
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [cursorBeat, setCursorBeat] = useState(0)

  // ドラッグ選択用の状態
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null)
  const justFinishedDragging = useRef(false)

  const beatsPerBar = 4
  const rowHeight = 28

  // 拍の配列
  const beats = useMemo(() => {
    const totalBeats = visibleBars * beatsPerBar
    return Array.from({ length: totalBeats }, (_, i) => i)
  }, [visibleBars])

  // グリッドサイズ
  const gridHeight = DRUM_SOUNDS.length * rowHeight
  const gridWidth = beats.length * beatWidth

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
      id: `drum-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      start: n.start + pasteStart,
    }))

    onNotesChange([...notes, ...newNotes])
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

      const rowIndex = Math.floor(y / rowHeight)
      const beat = Math.floor(x / beatWidth)

      if (rowIndex < 0 || rowIndex >= DRUM_SOUNDS.length) return
      if (beat < 0 || beat >= beats.length) return

      const drum = DRUM_SOUNDS[rowIndex]
      const pitch = drum.pitch

      // 既存のノートがあるかチェック
      const existingNote = notes.find(
        (n) => n.pitch === pitch && n.start === beat
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
          id: `drum-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          pitch,
          start: beat,
          duration: 1,
        }
        onNotesChange([...notes, newNote])
        setSelectedNoteIds(new Set([newNote.id]))
        onNoteAdd?.(pitch)
      }
    },
    [notes, onNotesChange, onNoteAdd, beats.length, beatWidth, selectedNoteIds]
  )

  // マウス移動でカーソル位置を更新
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const beat = Math.floor(x / beatWidth)
      setCursorBeat(Math.max(0, Math.min(beat, beats.length - 1)))

      // ドラッグ中なら選択範囲を更新
      if (isDragging) {
        setDragEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }
    },
    [beatWidth, beats.length, isDragging]
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

      const startBeat = Math.floor(minX / beatWidth)
      const endBeat = Math.ceil(maxX / beatWidth)
      const startRowIndex = Math.floor(minY / rowHeight)
      const endRowIndex = Math.ceil(maxY / rowHeight)

      const selectedDrums = DRUM_SOUNDS.slice(startRowIndex, endRowIndex)
      const selectedPitches = selectedDrums.map((d) => d.pitch as number)

      const newSelectedIds = new Set<string>()
      notes.forEach((note) => {
        if (
          selectedPitches.includes(note.pitch) &&
          note.start >= startBeat &&
          note.start < endBeat
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
  }, [isDragging, dragStart, dragEnd, beatWidth, rowHeight, notes])

  // マウスがSVGから離れた時
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleMouseUp()
    }
  }, [isDragging, handleMouseUp])

  // 小節番号の配列
  const bars = useMemo(() => {
    return Array.from({ length: visibleBars }, (_, i) => i + 1)
  }, [visibleBars])

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
        style={{ marginLeft: 80, width: gridWidth }}
      >
        {bars.map((bar) => (
          <div
            key={bar}
            className="text-xs text-gray-400 bg-gray-800 border-b border-gray-600 flex items-center justify-center flex-shrink-0"
            style={{
              width: beatsPerBar * beatWidth,
              height: 20,
              borderRight: '1px solid #555'
            }}
          >
            {bar}
          </div>
        ))}
      </div>

      {/* ドラム名ラベル（左側） */}
      <div
        className="absolute left-0 z-10 bg-gray-800"
        style={{ width: 80, height: gridHeight, top: 20 }}
      >
        {DRUM_SOUNDS.map((drum) => (
          <div
            key={drum.id}
            className="flex items-center gap-2 px-2 text-xs border-b border-gray-700 text-white"
            style={{ height: rowHeight }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: drum.color }}
            />
            <span>{drum.name}</span>
          </div>
        ))}
      </div>

      {/* グリッド */}
      <svg
        width={gridWidth}
        height={gridHeight}
        onClick={handleGridClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
        style={{ marginLeft: 80 }}
      >
        {/* 背景グリッド */}
        {DRUM_SOUNDS.map((drum, rowIndex) => (
          <g key={drum.id}>
            {/* 行の背景 */}
            <rect
              x={0}
              y={rowIndex * rowHeight}
              width={gridWidth}
              height={rowHeight}
              fill={rowIndex % 2 === 0 ? '#1e293b' : '#0f172a'}
              stroke="#334155"
              strokeWidth={0.5}
            />
            {/* 拍線 */}
            {beats.map((beat) => (
              <line
                key={beat}
                x1={beat * beatWidth}
                y1={rowIndex * rowHeight}
                x2={beat * beatWidth}
                y2={(rowIndex + 1) * rowHeight}
                stroke={beat % beatsPerBar === 0 ? '#475569' : '#334155'}
                strokeWidth={beat % beatsPerBar === 0 ? 1 : 0.5}
              />
            ))}
          </g>
        ))}

        {/* ノート */}
        {notes.map((note) => {
          const drum = DRUM_SOUNDS.find((d) => d.pitch === note.pitch)
          if (!drum) return null

          const rowIndex = DRUM_SOUNDS.indexOf(drum)
          const x = note.start * beatWidth
          const y = rowIndex * rowHeight
          const isSelected = selectedNoteIds.has(note.id)

          return (
            <rect
              key={note.id}
              x={x + 2}
              y={y + 2}
              width={beatWidth - 4}
              height={rowHeight - 4}
              rx={4}
              fill={drum.color}
              opacity={isSelected ? 1 : 0.8}
              stroke={isSelected ? '#fff' : 'transparent'}
              strokeWidth={2}
              className="cursor-pointer hover:opacity-100"
            />
          )
        })}

        {/* カーソル位置インジケータ */}
        {isFocused && !isPlaying && (
          <line
            x1={cursorBeat * beatWidth}
            y1={0}
            x2={cursorBeat * beatWidth}
            y2={gridHeight}
            stroke="#60a5fa"
            strokeWidth={1}
            strokeDasharray="4 2"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* プレイヘッド */}
        {isPlaying && (
          <line
            x1={currentBeat * beatWidth}
            y1={0}
            x2={currentBeat * beatWidth}
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
