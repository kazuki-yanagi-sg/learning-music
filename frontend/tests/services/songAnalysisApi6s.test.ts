/**
 * htdemucs_6s 対応: songAnalysisApi の型拡張テスト（設計書 B-1）
 *
 * TrackNotes / FourTrackResult の tracks に guitar/keyboard が含まれること。
 * API レスポンスの guitar/keyboard フィールドが正しく型として扱われることを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyze4Tracks } from '../../src/services/songAnalysisApi'
import type { FourTrackResult } from '../../src/services/songAnalysisApi'

// fetch をモック
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

describe('songAnalysisApi - 6stem FourTrackResult の型拡張（B-1）', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('FourTrackResult の tracks に guitar フィールドが存在すること', async () => {
    // バックエンドが guitar を含む 6stem レスポンスを返す
    const mockResponse = {
      success: true,
      data: {
        video_id: 'vid001',
        title: 'テスト曲',
        channel: 'テストチャンネル',
        thumbnail: null,
        url: null,
        tempo: 140.0,
        tracks: {
          drums:    { notes: [], midi_path: null, error: null },
          bass:     { notes: [], midi_path: null, error: null },
          other:    { notes: [], midi_path: null, error: null },
          melody:   { notes: [], midi_path: null, error: null },
          guitar:   { notes: [{ pitch: 64, start: 0.0, end: 0.5, velocity: 80 }], midi_path: null, error: null },
          keyboard: { notes: [], midi_path: null, error: null },
        },
        chords: [],
        analysis_text: null,
      },
    }
    mockFetch.mockReturnValue(mockJsonResponse(mockResponse))

    const result = await analyze4Tracks('vid001')

    // guitar フィールドが存在し、ノートを持つこと
    expect(result.tracks.guitar).toBeDefined()
    expect(result.tracks.guitar!.notes).toHaveLength(1)
    expect(result.tracks.guitar!.notes[0].pitch).toBe(64)
  })

  it('FourTrackResult の tracks に keyboard フィールドが存在すること', async () => {
    // piano stem → keyboard キーでレスポンスが返る
    const mockResponse = {
      success: true,
      data: {
        video_id: 'vid002',
        title: 'テスト曲2',
        channel: 'テストチャンネル',
        thumbnail: null,
        url: null,
        tempo: 150.0,
        tracks: {
          drums:    { notes: [], midi_path: null, error: null },
          bass:     { notes: [], midi_path: null, error: null },
          other:    { notes: [], midi_path: null, error: null },
          melody:   { notes: [], midi_path: null, error: null },
          guitar:   { notes: [], midi_path: null, error: null },
          keyboard: { notes: [{ pitch: 60, start: 0.0, end: 1.0, velocity: 90 }], midi_path: null, error: null },
        },
        chords: [],
        analysis_text: null,
      },
    }
    mockFetch.mockReturnValue(mockJsonResponse(mockResponse))

    const result = await analyze4Tracks('vid002')

    // keyboard フィールドが存在し、ノートを持つこと
    expect(result.tracks.keyboard).toBeDefined()
    expect(result.tracks.keyboard!.notes).toHaveLength(1)
    expect(result.tracks.keyboard!.notes[0].pitch).toBe(60)
  })

  it('既存の 4stem フィールド（drums/bass/other/melody）が引き続き動作すること（後方互換）', async () => {
    const mockResponse = {
      success: true,
      data: {
        video_id: 'vid003',
        title: '後方互換テスト',
        channel: 'ch',
        thumbnail: null,
        url: null,
        tempo: 120,
        tracks: {
          drums:  { notes: [], midi_path: null, error: null },
          bass:   { notes: [{ pitch: 48, start: 0.0, end: 0.5, velocity: 80 }], midi_path: null, error: null },
          other:  { notes: [], midi_path: null, error: null },
          melody: { notes: [], midi_path: null, error: null },
        },
        chords: [],
        analysis_text: null,
      },
    }
    mockFetch.mockReturnValue(mockJsonResponse(mockResponse))

    const result = await analyze4Tracks('vid003')

    // 既存フィールドが維持されていること
    expect(result.tracks.bass).toBeDefined()
    expect(result.tracks.bass.notes).toHaveLength(1)
    expect(result.tracks.drums).toBeDefined()
    expect(result.tracks.melody).toBeDefined()
  })
})

/**
 * FourTrackResult 型静的チェック
 *
 * TypeScript コンパイラが guitar/keyboard フィールドを受け入れること。
 * ランタイムテストではなく型レベルの検証（コンパイルエラーがないことを確認）。
 */
describe('FourTrackResult 型の静的検証（B-1）', () => {
  it('FourTrackResult 型が guitar/keyboard を optional フィールドとして持つこと', () => {
    // 型アサーション: guitar/keyboard を持つオブジェクトが FourTrackResult に代入可能
    const result: FourTrackResult = {
      video_id: 'test',
      title: 'test',
      channel: 'test',
      thumbnail: null,
      url: null,
      tempo: 140,
      tracks: {
        drums:    { notes: [], midi_path: null, error: null },
        bass:     { notes: [], midi_path: null, error: null },
        other:    { notes: [], midi_path: null, error: null },
        melody:   { notes: [], midi_path: null, error: null },
        guitar:   { notes: [], midi_path: null, error: null },
        keyboard: { notes: [], midi_path: null, error: null },
      },
      chords: [],
      analysis_text: null,
    }
    // コンパイルエラーがなければ型が正しい
    expect(result.tracks.guitar).toBeDefined()
    expect(result.tracks.keyboard).toBeDefined()
  })
})
