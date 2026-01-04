/**
 * 楽曲検索・解析モーダル
 *
 * YouTubeから曲を検索して解析結果を表示
 */
import { useState, useCallback } from 'react'
import {
  searchSongs,
  analyzeVideoWithProgress,
  YouTubeVideo,
  AnalysisResult,
  AnalysisProgressEvent,
} from '../../services/songAnalysisApi'

interface SongSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyProgression?: (chords: Array<{ chord: string }>) => void
}

export function SongSearchModal({
  isOpen,
  onClose,
  onApplyProgression,
}: SongSearchModalProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<AnalysisProgressEvent | null>(null)

  // 検索実行
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)
    setVideos([])
    setSelectedVideo(null)
    setAnalysisResult(null)

    try {
      const result = await searchSongs(query, 10)
      setVideos(result.results)
      if (result.results.length === 0) {
        setError('曲が見つかりませんでした')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索に失敗しました')
    } finally {
      setIsSearching(false)
    }
  }, [query])

  // 解析実行（SSEストリーミング）
  const handleAnalyze = useCallback((video: YouTubeVideo) => {
    setSelectedVideo(video)
    setIsAnalyzing(true)
    setError(null)
    setAnalysisResult(null)
    setProgress({ stage: 'init', progress: 0, message: '解析を開始しています...' })

    analyzeVideoWithProgress(video.id, (event) => {
      setProgress(event)

      if (event.stage === 'complete' && event.data) {
        setAnalysisResult(event.data)
        setIsAnalyzing(false)
        setProgress(null)
      } else if (event.stage === 'error') {
        setError(event.message)
        setIsAnalyzing(false)
        setProgress(null)
      }
    }, true)
  }, [])

  // 進行を適用
  const handleApplyProgression = useCallback(() => {
    if (!analysisResult?.chords || !onApplyProgression) return

    const chords = analysisResult.chords.map(c => ({
      chord: c.chord,
    }))
    onApplyProgression(chords)
    onClose()
  }, [analysisResult, onApplyProgression, onClose])

  // Enterキーで検索
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">楽曲検索・解析</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 検索フォーム */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="曲名やアーティスト名を入力..."
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-white font-bold"
            >
              {isSearching ? '検索中...' : '検索'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            YouTubeから楽曲を検索してフル解析できます
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300">
              {error}
            </div>
          )}

          {/* 検索結果 */}
          {videos.length > 0 && !analysisResult && !isAnalyzing && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-400 mb-3">検索結果</h3>
              {videos.map((video) => (
                <div
                  key={video.id}
                  className={`flex items-center gap-4 p-3 rounded cursor-pointer transition ${
                    selectedVideo?.id === video.id
                      ? 'bg-blue-900/50 border border-blue-700'
                      : 'bg-gray-700/50 hover:bg-gray-700'
                  }`}
                  onClick={() => handleAnalyze(video)}
                >
                  {video.thumbnail && (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-20 h-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{video.title}</div>
                    <div className="text-sm text-gray-400 truncate">{video.channel}</div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-red-900 text-red-300 rounded">
                    YouTube
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 解析中（プログレスバー） */}
          {isAnalyzing && progress && (
            <div className="flex flex-col items-center justify-center py-12">
              {/* サムネイル */}
              {selectedVideo?.thumbnail && (
                <img
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  className="w-40 h-24 rounded shadow mb-4 object-cover"
                />
              )}
              <p className="text-white font-bold mb-4">{selectedVideo?.title}</p>

              {/* プログレスバー */}
              <div className="w-full max-w-md mb-4">
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
              </div>

              {/* ステージ表示 */}
              <div className="flex gap-2 text-xs">
                <span className={`px-2 py-1 rounded ${progress.stage === 'init' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  初期化
                </span>
                <span className={`px-2 py-1 rounded ${progress.stage === 'download' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  ダウンロード
                </span>
                <span className={`px-2 py-1 rounded ${progress.stage === 'convert' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  MIDI変換
                </span>
                <span className={`px-2 py-1 rounded ${progress.stage === 'analyze' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  コード解析
                </span>
                <span className={`px-2 py-1 rounded ${progress.stage === 'ai' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  AI解説
                </span>
              </div>
            </div>
          )}

          {/* 解析結果 */}
          {analysisResult && (
            <div className="space-y-6">
              {/* 動画情報 */}
              <div className="flex items-start gap-4">
                {analysisResult.thumbnail && (
                  <img
                    src={analysisResult.thumbnail}
                    alt={analysisResult.title}
                    className="w-32 h-20 rounded shadow object-cover"
                  />
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">{analysisResult.title}</h3>
                  <p className="text-gray-400">{analysisResult.channel}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    {analysisResult.tempo && (
                      <span className="text-blue-400">
                        {analysisResult.tempo} BPM
                      </span>
                    )}
                    {analysisResult.duration && (
                      <span className="text-green-400">
                        {Math.floor(analysisResult.duration / 60)}:{String(Math.floor(analysisResult.duration % 60)).padStart(2, '0')}
                      </span>
                    )}
                    <span className="text-yellow-400">
                      {analysisResult.notes_count} ノート検出
                    </span>
                  </div>
                </div>
              </div>

              {/* コード進行 */}
              {analysisResult.chords.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 mb-2">検出コード進行</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.chords.map((chord, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-purple-900/50 border border-purple-700 rounded text-purple-300"
                      >
                        {chord.chord}
                      </span>
                    ))}
                  </div>
                  {onApplyProgression && (
                    <button
                      onClick={handleApplyProgression}
                      className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm"
                    >
                      この進行を使ってみる
                    </button>
                  )}
                </div>
              )}

              {/* AI解説 */}
              {analysisResult.analysis_text && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 mb-2">AI解説</h4>
                  <div className="p-4 bg-gray-700/50 rounded text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {analysisResult.analysis_text}
                  </div>
                </div>
              )}

              {/* 戻るボタン */}
              <button
                onClick={() => {
                  setAnalysisResult(null)
                  setSelectedVideo(null)
                }}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                ← 検索結果に戻る
              </button>
            </div>
          )}

          {/* 初期状態 */}
          {videos.length === 0 && !isSearching && !analysisResult && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-4">🎵</p>
              <p>曲名やアーティスト名で検索してください</p>
              <p className="text-sm mt-2">
                例: 「紅蓮華」「残酷な天使のテーゼ」「YOASOBI」
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
