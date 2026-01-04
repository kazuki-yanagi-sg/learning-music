/**
 * アニソン作曲学習アプリ - メインコンポーネント
 *
 * 4トラック固定のピアノロールUIを提供
 * - ドラム
 * - ベース
 * - キーボード
 * - ギター
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { PianoRoll } from './components/PianoRoll'
import { DrumGrid } from './components/DrumGrid'
import { LessonModal } from './components/LessonModal'
import { HelpModal } from './components/HelpModal'
import { SongSearchModal } from './components/SongSearchModal'
import { TheoryPanel } from './components/TheoryPanel'
import { Note, Track, TrackType, TRACK_CONFIGS } from './types/music'
import { audioEngine } from './services/audioEngine'

// 初期トラック
const createInitialTracks = (): Track[] => [
  { id: 'drum', type: 'drum', name: 'ドラム', notes: [], muted: false, volume: 0.8 },
  { id: 'bass', type: 'bass', name: 'ベース', notes: [], muted: false, volume: 0.8 },
  { id: 'keyboard', type: 'keyboard', name: 'キーボード', notes: [], muted: false, volume: 0.7 },
  { id: 'guitar', type: 'guitar', name: 'ギター', notes: [], muted: false, volume: 0.7 },
]

// アンドゥ履歴の最大数
const MAX_UNDO_HISTORY = 50

function App() {
  const [tracks, setTracks] = useState<Track[]>(createInitialTracks)
  const [bpm, setBpm] = useState(140)
  const [keyRoot, setKeyRoot] = useState(0) // 0 = C
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedTrackId, setSelectedTrackId] = useState<string>('keyboard')
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [isSongSearchModalOpen, setIsSongSearchModalOpen] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  // クリップボード（トラックごと）
  const [clipboard, setClipboard] = useState<Record<string, Note[]>>({})
  // アンドゥ履歴
  const undoHistory = useRef<Track[][]>([])

  // レッスンモーダルを閉じる
  const handleCloseLesson = useCallback(() => {
    setIsLessonModalOpen(false)
  }, [])

  // ノート追加時のプレビュー音
  const handleNotePreview = useCallback(async (trackType: TrackType, pitch: number) => {
    // 初回はオーディオエンジンを初期化
    if (!audioInitialized.current) {
      await audioEngine.init()
      audioInitialized.current = true
    }
    audioEngine.playNote(trackType, pitch, 0.3)
  }, [])

  // トラックのノートを更新（アンドゥ履歴に保存）
  const handleNotesChange = useCallback((trackId: string, newNotes: Note[]) => {
    setTracks((prev) => {
      // 現在の状態を履歴に保存
      undoHistory.current.push(JSON.parse(JSON.stringify(prev)))
      // 履歴が最大数を超えたら古いものを削除
      if (undoHistory.current.length > MAX_UNDO_HISTORY) {
        undoHistory.current.shift()
      }
      return prev.map((track) =>
        track.id === trackId ? { ...track, notes: newNotes } : track
      )
    })
  }, [])

  // アンドゥ
  const handleUndo = useCallback(() => {
    if (undoHistory.current.length === 0) return
    const previousState = undoHistory.current.pop()
    if (previousState) {
      setTracks(previousState)
    }
  }, [])

  // クリップボードにコピー
  const handleCopy = useCallback((trackId: string, notes: Note[]) => {
    setClipboard((prev) => ({ ...prev, [trackId]: notes }))
  }, [])

  // クリップボードからペースト
  const handlePaste = useCallback((trackId: string): Note[] | undefined => {
    return clipboard[trackId]
  }, [clipboard])

  // オーディオエンジン初期化フラグ
  const audioInitialized = useRef(false)

  // BPM変更時にオーディオエンジンに反映
  useEffect(() => {
    audioEngine.setBpm(bpm)
  }, [bpm])

  // 再生中は再生位置を更新
  useEffect(() => {
    if (!isPlaying) {
      setCurrentBeat(0)
      return
    }

    let animationId: number
    const updateBeat = () => {
      setCurrentBeat(audioEngine.getCurrentBeat())
      animationId = requestAnimationFrame(updateBeat)
    }
    animationId = requestAnimationFrame(updateBeat)

    return () => cancelAnimationFrame(animationId)
  }, [isPlaying])

  // グローバルキーボードショートカット（アンドゥ、ヘルプ）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if (e.key === '?' || (isMod && e.key === '/')) {
        e.preventDefault()
        setIsHelpModalOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo])

  // 再生/停止
  const handlePlayToggle = useCallback(async () => {
    // 初回はオーディオエンジンを初期化
    if (!audioInitialized.current) {
      await audioEngine.init()
      audioInitialized.current = true
    }

    if (isPlaying) {
      audioEngine.stop()
      setIsPlaying(false)
    } else {
      audioEngine.play(tracks)
      setIsPlaying(true)
    }
  }, [isPlaying, tracks])

  // 基準音（0-11）
  const keyNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsLessonModalOpen(true)}
            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
          >
            レッスン
          </button>
          <button
            onClick={() => setIsSongSearchModalOpen(true)}
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
          >
            楽曲検索
          </button>
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
            title="ヘルプ (?)"
          >
            ?
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">BPM:</span>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-16 px-2 py-1 bg-gray-700 rounded text-center"
              min={60}
              max={240}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">基準音:</span>
            <select
              value={keyRoot}
              onChange={(e) => setKeyRoot(Number(e.target.value))}
              className="px-2 py-1 bg-gray-700 rounded"
            >
              {keyNumbers.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handlePlayToggle}
            className={`px-4 py-2 rounded font-bold ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isPlaying ? '■ 停止' : '▶ 再生'}
          </button>
        </div>
      </header>

      {/* メインエリア: トラック + 理論パネル */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左: 4トラック */}
        <main className="flex-1 p-4 overflow-auto">
          <div className="flex flex-col gap-3">
            {tracks.map((track) => (
            <div
              key={track.id}
              className={`flex bg-gray-800 rounded border ${
                selectedTrackId === track.id
                  ? 'border-blue-500'
                  : 'border-gray-700'
              }`}
              onClick={() => setSelectedTrackId(track.id)}
            >
              {/* トラック名 */}
              <div className="w-24 px-3 py-2 border-r border-gray-700 flex flex-col justify-center">
                <span className="text-sm font-bold">{track.name}</span>
                <div className="flex gap-1 mt-1">
                  <button
                    className={`text-xs px-1 rounded ${
                      track.muted ? 'bg-red-600' : 'bg-gray-600'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      const newMuted = !track.muted
                      audioEngine.setTrackMute(track.type as TrackType, newMuted)
                      setTracks((prev) =>
                        prev.map((t) =>
                          t.id === track.id ? { ...t, muted: newMuted } : t
                        )
                      )
                    }}
                  >
                    M
                  </button>
                </div>
              </div>

              {/* ピアノロール / ドラムグリッド */}
              <div className="flex-1 overflow-x-auto">
                {track.type === 'drum' ? (
                  <DrumGrid
                    notes={track.notes}
                    onNotesChange={(notes) => handleNotesChange(track.id, notes)}
                    onNoteAdd={(pitch) => handleNotePreview('drum', pitch)}
                    visibleBars={32}
                    beatWidth={24}
                    className="h-72"
                    currentBeat={currentBeat}
                    isPlaying={isPlaying}
                    onCopy={(notes) => handleCopy(track.id, notes)}
                    onPaste={() => handlePaste(track.id)}
                  />
                ) : (
                  <PianoRoll
                    notes={track.notes}
                    onNotesChange={(notes) => handleNotesChange(track.id, notes)}
                    onNoteAdd={(pitch) => handleNotePreview(track.type as TrackType, pitch)}
                    config={{
                      ...TRACK_CONFIGS[track.type as TrackType],
                      visibleBars: 32,
                      beatWidth: 24,
                    }}
                    className="h-48"
                    currentBeat={currentBeat}
                    isPlaying={isPlaying}
                    onCopy={(notes) => handleCopy(track.id, notes)}
                    onPaste={() => handlePaste(track.id)}
                  />
                )}
              </div>
            </div>
            ))}
          </div>
        </main>

        {/* 右: 理論解説パネル */}
        <TheoryPanel
          tracks={tracks}
          keyRoot={keyRoot}
          className="w-72 flex-shrink-0"
        />
      </div>

      {/* フッター */}
      <footer className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-sm text-gray-400">
        クリック: 追加/選択 | ⌘+ドラッグ: 範囲選択 | ⌘C: コピー | ⌘V: ペースト | ⌘Z: 戻す | ?: ヘルプ
      </footer>

      {/* レッスンモーダル */}
      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={handleCloseLesson}
      />

      {/* ヘルプモーダル */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* 楽曲検索モーダル */}
      <SongSearchModal
        isOpen={isSongSearchModalOpen}
        onClose={() => setIsSongSearchModalOpen(false)}
      />
    </div>
  )
}

export default App
