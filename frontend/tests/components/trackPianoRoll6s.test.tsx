/**
 * TrackPianoRoll / AnalysisPianoRollModal の 6stem 対応テスト（設計書 B-3）
 *
 * - TRACK_CONFIG に guitar/keyboard が追加されていること
 * - 描画リストが ['bass', 'guitar', 'keyboard'] であること（melody/other は含めない）
 * - guitar/keyboard トラックが正しく描画されること
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// --- モック関数を先に定義 ---
const { initMock, play4TrackMock, playNotesMock, explainSectionMock } = vi.hoisted(() => ({
  initMock: vi.fn().mockResolvedValue(undefined),
  play4TrackMock: vi.fn(() => ({ stop: vi.fn(), seek: vi.fn() })),
  playNotesMock: vi.fn(() => ({ stop: vi.fn() })),
  explainSectionMock: vi.fn(),
}))

vi.mock('../../src/services/audioEngine', () => ({
  audioEngine: {
    init: initMock,
    play4TrackAnalysis: play4TrackMock,
    playAnalysisNotes: playNotesMock,
  },
}))

vi.mock('../../src/services/songAnalysisApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/songAnalysisApi')>()
  return { ...actual, explainSection: explainSectionMock }
})

import { AnalysisPianoRollModal } from '../../src/components/AnalysisPianoRollModal/AnalysisPianoRollModal'
import type { FourTrackResult, NoteInfo } from '../../src/services/songAnalysisApi'

const note = (pitch: number, start: number, end: number): NoteInfo => ({
  pitch, start, end, velocity: 100,
})

/** 6stem の FourTrackResult フィクスチャ */
function make6StemResult(): FourTrackResult {
  return {
    video_id: 'vid6s',
    title: '6stemテスト曲',
    channel: 'ch',
    thumbnail: null,
    url: null,
    tempo: 150,
    tracks: {
      drums:    { notes: [note(36, 0, 0.2)], midi_path: null, error: null },
      bass:     { notes: [note(40, 0, 1)], midi_path: null, error: null },
      other:    { notes: [note(60, 0, 2)], midi_path: null, error: null },
      melody:   { notes: [note(72, 0, 1.5)], midi_path: null, error: null },
      guitar:   { notes: [note(64, 0, 1)], midi_path: null, error: null },
      keyboard: { notes: [note(60, 0, 1)], midi_path: null, error: null },
    },
    chords: [],
    analysis_text: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  initMock.mockResolvedValue(undefined)
  play4TrackMock.mockImplementation(() => ({ stop: vi.fn(), seek: vi.fn() }))
})

describe('TRACK_CONFIG - guitar/keyboard エントリ追加（B-3）', () => {
  it('TRACK_CONFIG に guitar エントリが存在すること', async () => {
    // TrackPianoRoll を直接インポートして TRACK_CONFIG を検証
    const { TrackPianoRoll } = await import('../../src/components/AnalysisPianoRollModal/TrackPianoRoll')
    // guitar を trackType に指定してレンダリングが成功すること（TRACK_CONFIG にエントリがある証拠）
    const { container } = render(
      <TrackPianoRoll
        trackType="guitar"
        notes={[note(64, 0, 1)]}
        maxTime={2}
        zoom={1}
        playbackTime={0}
        isPlaying={false}
        isMuted={false}
        onToggleMute={() => {}}
      />
    )
    expect(container.firstChild).not.toBeNull()
    // Guitar ラベルが表示されること
    expect(screen.getByText('Guitar')).toBeInTheDocument()
  })

  it('TRACK_CONFIG に keyboard エントリが存在すること', async () => {
    const { TrackPianoRoll } = await import('../../src/components/AnalysisPianoRollModal/TrackPianoRoll')
    const { container } = render(
      <TrackPianoRoll
        trackType="keyboard"
        notes={[note(60, 0, 1)]}
        maxTime={2}
        zoom={1}
        playbackTime={0}
        isPlaying={false}
        isMuted={false}
        onToggleMute={() => {}}
      />
    )
    expect(container.firstChild).not.toBeNull()
    // Keyboard ラベルが表示されること
    expect(screen.getByText('Keyboard')).toBeInTheDocument()
  })
})

describe('AnalysisPianoRollModal - 6stem 描画（B-3）', () => {
  it('6stem 結果で Guitar ラベルが表示されること', () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={make6StemResult()} />)
    // 描画リスト ['bass', 'guitar', 'keyboard'] に Guitar が含まれること
    expect(screen.getByText('Guitar')).toBeInTheDocument()
  })

  it('6stem 結果で Keyboard ラベルが表示されること', () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={make6StemResult()} />)
    expect(screen.getByText('Keyboard')).toBeInTheDocument()
  })

  it('6stem 結果で Bass ラベルが表示されること', () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={make6StemResult()} />)
    expect(screen.getByText('Bass')).toBeInTheDocument()
  })

  it('描画リストに Melody が含まれること（方針変更: melody をピアノロールで表示する）', () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={make6StemResult()} />)
    // Melody ラベルが描画されること（bass/guitar/keyboard/melody の4トラックを表示）
    expect(screen.getByText('Melody')).toBeInTheDocument()
  })

  it('描画リストに Guitar/Keys（other）が含まれないこと（設計書: other は描画しない）', () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={make6StemResult()} />)
    // 'Guitar/Keys' ラベル（other の表示名）が描画されないこと
    expect(screen.queryByText('Guitar/Keys')).not.toBeInTheDocument()
  })
})
