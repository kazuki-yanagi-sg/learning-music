/**
 * ドラッグ範囲選択の状態機械フック
 *
 * AnalysisPianoRollModal から逐語抽出した純粋カスタムフック。
 * selectionStart / selectionEnd / isDragging を保持し、
 * ドラッグ開始・中・終了のハンドラを提供する。
 * 状態遷移・挙動は元コードと完全に同一。
 */
import { useState, useCallback } from 'react'

export interface UseDragSelectionResult {
  selectionStart: number | null
  selectionEnd: number | null
  isDragging: boolean
  handleDragStart: (time: number) => void
  handleDragMove: (time: number) => void
  handleDragEnd: () => void
  /** 選択範囲をクリア（クリック=シーク時に使用） */
  clearSelection: () => void
}

export function useDragSelection(): UseDragSelectionResult {
  // 範囲選択（ドラッグ）
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // ドラッグ開始
  const handleDragStart = useCallback((time: number) => {
    setIsDragging(true)
    setSelectionStart(time)
    setSelectionEnd(time)
  }, [])

  // ドラッグ中
  const handleDragMove = useCallback((time: number) => {
    if (isDragging) {
      setSelectionEnd(time)
    }
  }, [isDragging])

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 範囲選択をクリア
  const clearSelection = useCallback(() => {
    setSelectionStart(null)
    setSelectionEnd(null)
  }, [])

  return {
    selectionStart,
    selectionEnd,
    isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    clearSelection,
  }
}
