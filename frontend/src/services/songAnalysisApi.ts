/**
 * 楽曲解析API クライアント
 *
 * バックエンドのsong-analysis APIを呼び出す（YouTube + Magenta）
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface YouTubeVideo {
  id: string
  title: string
  channel: string
  thumbnail: string | null
  url: string
  published_at: string
}

export interface ChordInfo {
  time: number
  chord: string
}

export interface NoteInfo {
  pitch: number
  start: number
  end: number
  velocity: number
}

export interface AnalysisResult {
  video_id: string
  title: string
  channel: string
  thumbnail: string | null
  url: string | null
  tempo: number | null
  duration: number | null
  notes_count: number
  notes: NoteInfo[]
  chords: ChordInfo[]
  analysis_text: string | null
}

// 4トラック解析結果
export interface TrackNotes {
  notes: NoteInfo[]
  midi_path: string | null
  error: string | null
}

export interface FourTrackResult {
  video_id: string
  title: string
  channel: string
  thumbnail: string | null
  url: string | null
  tempo: number
  tracks: {
    drums: TrackNotes
    bass: TrackNotes
    other: TrackNotes
    melody: TrackNotes  // ボーカルメロディ → ピアノで表示
  }
  chords: ChordInfo[]
  analysis_text: string | null
}

export interface SearchResult {
  query: string
  total: number
  results: YouTubeVideo[]
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

/**
 * 曲を検索（YouTube）
 */
export async function searchSongs(query: string, limit: number = 10): Promise<SearchResult> {
  const params = new URLSearchParams({ query, limit: String(limit) })
  const response = await fetch(`${API_BASE_URL}/api/v1/song-analysis/search?${params}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'Search failed')
  }

  const json: ApiResponse<SearchResult> = await response.json()
  return json.data
}

/**
 * 動画詳細を取得
 */
export async function getVideo(videoId: string): Promise<YouTubeVideo> {
  const response = await fetch(`${API_BASE_URL}/api/v1/song-analysis/video/${videoId}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'Failed to get video')
  }

  const json: ApiResponse<YouTubeVideo> = await response.json()
  return json.data
}

/**
 * 曲を解析（yt-dlp + Magenta）
 */
export async function analyzeVideo(videoId: string, generateAiAnalysis: boolean = true): Promise<AnalysisResult> {
  const params = new URLSearchParams({ generate_ai_analysis: String(generateAiAnalysis) })
  const response = await fetch(`${API_BASE_URL}/api/v1/song-analysis/analyze/${videoId}?${params}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'Analysis failed')
  }

  const json: ApiResponse<AnalysisResult> = await response.json()
  return json.data
}

/**
 * 曲を4トラックに分離して解析（Demucs + Gemini）
 */
export async function analyze4Tracks(videoId: string): Promise<FourTrackResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/song-analysis/analyze-4tracks/${videoId}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || '4-track analysis failed')
  }

  const json: ApiResponse<FourTrackResult> = await response.json()
  return json.data
}

/**
 * 解析進捗イベント
 */
export interface AnalysisProgressEvent {
  stage: 'init' | 'download' | 'convert' | 'analyze' | 'ai' | 'complete' | 'error'
  progress: number
  message: string
  data?: AnalysisResult
}

/**
 * 曲を解析（SSEストリーミング・進捗付き）
 */
export function analyzeVideoWithProgress(
  videoId: string,
  onProgress: (event: AnalysisProgressEvent) => void,
  generateAiAnalysis: boolean = true
): { abort: () => void } {
  const params = new URLSearchParams({ generate_ai_analysis: String(generateAiAnalysis) })
  const url = `${API_BASE_URL}/api/v1/song-analysis/analyze/${videoId}/stream?${params}`

  const eventSource = new EventSource(url)

  eventSource.onmessage = (event) => {
    try {
      const data: AnalysisProgressEvent = JSON.parse(event.data)
      onProgress(data)

      // 完了またはエラーで接続を閉じる
      if (data.stage === 'complete' || data.stage === 'error') {
        eventSource.close()
      }
    } catch (e) {
      console.error('Failed to parse SSE event:', e)
    }
  }

  eventSource.onerror = () => {
    onProgress({
      stage: 'error',
      progress: 0,
      message: '接続が切断されました',
    })
    eventSource.close()
  }

  return {
    abort: () => {
      eventSource.close()
    }
  }
}
