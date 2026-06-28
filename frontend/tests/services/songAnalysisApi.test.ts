/**
 * songAnalysisApi の float BPM パーステスト
 *
 * テスト仕様: docs/test-spec-timing-drums.md グループ5-1
 *
 * 目的:
 *   - バックエンドが返す float BPM（例: 173.5）がフロント側で Math.round 等されず
 *     number として保持されることを確認する（原因4の最終保護）。
 *
 * 方針:
 *   - fetch をモックしてレスポンスJSONを制御する。
 *   - analyzeVideo / analyze4Tracks がレスポンスの tempo を丸めずそのまま返すことを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeVideo, analyze4Tracks } from '../../src/services/songAnalysisApi'

// fetch をモック（グローバル）
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/** JSON レスポンスを返す fetch モックを組み立てる */
function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response)
}

describe('songAnalysisApi - float tempo のパース', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('parses float tempo without rounding (analyzeVideo)', async () => {
    // モックレスポンス: tempo = 173.5（float）
    const mockResponse = {
      success: true,
      data: {
        video_id: 'vid001',
        title: 'テスト曲',
        channel: 'テストチャンネル',
        thumbnail: null,
        url: 'https://www.youtube.com/watch?v=vid001',
        tempo: 173.5,        // float BPM
        duration: 210.0,
        notes_count: 42,
        notes: [],
        chords: [],
        analysis_text: null,
      },
    }
    mockFetch.mockReturnValue(mockJsonResponse(mockResponse))

    const result = await analyzeVideo('vid001')

    // tempo が Math.round 等されず 173.5 のまま保持される
    expect(result.tempo).toBe(173.5)
    // number 型（TypeScript の number は 64bit float。整数に丸められていない）
    expect(typeof result.tempo).toBe('number')
  })

  it('parses float tempo without rounding (analyze4Tracks)', async () => {
    // モックレスポンス: tempo = 140.7（float）
    const mockResponse = {
      success: true,
      data: {
        video_id: 'vid001',
        title: 'テスト曲',
        channel: 'テストチャンネル',
        thumbnail: null,
        url: 'https://www.youtube.com/watch?v=vid001',
        tempo: 140.7,        // float BPM
        tracks: {
          drums:  { notes: [], midi_path: null, error: null },
          bass:   { notes: [], midi_path: null, error: null },
          other:  { notes: [], midi_path: null, error: null },
          melody: { notes: [], midi_path: null, error: null },
        },
        chords: [],
        analysis_text: null,
      },
    }
    mockFetch.mockReturnValue(mockJsonResponse(mockResponse))

    const result = await analyze4Tracks('vid001')

    // tempo が Math.round 等されず 140.7 のまま保持される
    expect(result.tempo).toBe(140.7)
    expect(typeof result.tempo).toBe('number')
  })

  it('integer BPM is also valid (120 stays 120)', async () => {
    // 整数 BPM も number として扱われる（丸め後に同値になることを確認）
    const mockResponse = {
      success: true,
      data: {
        video_id: 'vid001',
        title: 'テスト曲',
        channel: 'テストチャンネル',
        thumbnail: null,
        url: null,
        tempo: 120,
        duration: null,
        notes_count: 0,
        notes: [],
        chords: [],
        analysis_text: null,
      },
    }
    mockFetch.mockReturnValue(mockJsonResponse(mockResponse))

    const result = await analyzeVideo('vid001')

    expect(result.tempo).toBe(120)
    expect(typeof result.tempo).toBe('number')
  })
})
