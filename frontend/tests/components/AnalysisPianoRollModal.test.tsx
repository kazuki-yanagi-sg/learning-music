/**
 * AnalysisPianoRollModal 特性化テスト（characterization tests）
 *
 * 目的: 現状の振る舞いをそのまま固定する安全網。
 *   後続のフック分割・audioEngine 抽象化（#4/#8）リファクタで
 *   「出力・副作用が変わっていない」ことを保証するために用意する。
 *
 * 方針:
 *   - audioEngine（再生エンジン）と explainSection（範囲解説API）を vi.mock し、
 *     副作用呼び出しを spy で検証する。
 *   - あるべき論で直さず、現状コードで全テストが緑になることを確認済み。
 *
 * 注意（jsdom 前提）:
 *   - SVG の getBoundingClientRect は 0 を返し、scrollLeft も 0。
 *     よって mouse 座標 clientX は x = clientX として扱われ、
 *     time = clientX / (80 * zoom) に対応する（zoom=1 で 80px = 1秒）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { AnalysisPianoRollModal } from '../../src/components/AnalysisPianoRollModal/AnalysisPianoRollModal'
import type { FourTrackResult, AnalysisResult, NoteInfo } from '../../src/services/songAnalysisApi'

// --- モック関数を vi.hoisted で先に定義（vi.mock は先頭へ巻き上げられるため） ---
const { initMock, play4TrackMock, playNotesMock, explainSectionMock } = vi.hoisted(() => ({
  initMock: vi.fn().mockResolvedValue(undefined),
  play4TrackMock: vi.fn(() => ({ stop: vi.fn(), seek: vi.fn() })),
  playNotesMock: vi.fn(() => ({ stop: vi.fn() })),
  explainSectionMock: vi.fn(),
}))

// --- audioEngine（シングルトン）をモック ---
// 実モジュールは Tone.js / soundfont-player を import するため、丸ごと差し替える。
vi.mock('../../src/services/audioEngine', () => ({
  audioEngine: {
    init: initMock,
    play4TrackAnalysis: play4TrackMock,
    playAnalysisNotes: playNotesMock,
  },
}))

// --- songAnalysisApi の explainSection だけ差し替え（型・他の export は温存） ---
vi.mock('../../src/services/songAnalysisApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/songAnalysisApi')>()
  return { ...actual, explainSection: explainSectionMock }
})

// テスト用ノート生成ヘルパー
const note = (pitch: number, start: number, end: number): NoteInfo => ({
  pitch,
  start,
  end,
  velocity: 100,
})

// 4トラック結果のフィクスチャ（各トラックにノートを 1〜2 個ずつ）
function makeFourTrackResult(): FourTrackResult {
  return {
    video_id: 'vid123',
    title: 'テスト楽曲',
    channel: 'ch',
    thumbnail: null,
    url: null,
    tempo: 150,
    tracks: {
      drums: { notes: [note(36, 0, 0.2), note(38, 1, 1.2)], midi_path: null, error: null },
      bass: { notes: [note(40, 0, 1)], midi_path: null, error: null },
      other: { notes: [note(60, 0, 2)], midi_path: null, error: null },
      melody: { notes: [note(72, 0, 1.5)], midi_path: null, error: null },
    },
    chords: [],
    analysis_text: null,
  }
}

// 単一トラック結果のフィクスチャ
function makeSingleTrackResult(): AnalysisResult {
  return {
    video_id: 'vid999',
    title: '単一トラック曲',
    channel: 'ch',
    thumbnail: null,
    url: null,
    tempo: 120,
    duration: null,
    notes_count: 2,
    notes: [note(60, 0, 1), note(64, 1, 2)],
    chords: [],
    analysis_text: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  initMock.mockResolvedValue(undefined)
  play4TrackMock.mockImplementation(() => ({ stop: vi.fn(), seek: vi.fn() }))
  playNotesMock.mockImplementation(() => ({ stop: vi.fn() }))
})

// ============================================================
// 観点1: 描画 / 開閉の条件分岐
// ============================================================
describe('観点1: 描画・開閉', () => {
  it('isOpen=false のとき何も描画しない', () => {
    const { container } = render(
      <AnalysisPianoRollModal isOpen={false} onClose={() => {}} result={makeFourTrackResult()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('4トラック結果を開くとタイトル・4Trackバッジ・BPM・各トラックラベルが表示される', () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    expect(screen.getByText('テスト楽曲')).toBeInTheDocument()
    expect(screen.getByText('4Track')).toBeInTheDocument()
    // "150 BPM" はヘッダーのバッジ＋ドラムグリッド内テンポ表示の 2 箇所に出る（現状）
    expect(screen.getAllByText('150 BPM')).toHaveLength(2)
    // 描画リスト（方針変更: bass/melody を描画、other は非表示）
    // 4stem フィクスチャには guitar/keyboard は含まれないため非表示
    expect(screen.getByText('Bass')).toBeInTheDocument()
    expect(screen.getByText('Melody')).toBeInTheDocument()          // melody は表示
    expect(screen.queryByText('Guitar/Keys')).not.toBeInTheDocument() // other は非表示
  })

  it('各トラックのノート数がヘッダーに表示される（bass=1 notes）', () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    // bass が 1 ノート → "(1 notes)" が少なくとも 1 箇所出る
    expect(screen.getAllByText('(1 notes)').length).toBeGreaterThanOrEqual(1)
  })

  it('合計ノート数（totalNotes）がヘッダーに表示される', () => {
    // drums2 + bass1 + other1 + melody1 = 5 notes
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    expect(screen.getByText('5 notes')).toBeInTheDocument()
  })

  it('単一トラック結果では 4Track バッジ・AI解説ボタンを出さない', () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeSingleTrackResult()} />)
    expect(screen.getByText('単一トラック曲')).toBeInTheDocument()
    expect(screen.queryByText('4Track')).not.toBeInTheDocument()
    expect(screen.queryByText('🤖 AI解説')).not.toBeInTheDocument()
  })

  it('初期状態では再生ボタンが「▶ Play」、AI解説ボタンが「🤖 AI解説」', () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    expect(screen.getByRole('button', { name: '▶ Play' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '🤖 AI解説' })).toBeInTheDocument()
  })
})

// ============================================================
// 観点2: 再生トグル（handlePlayToggle）
// ============================================================
describe('観点2: 再生トグル', () => {
  it('再生開始で audioEngine.init → play4TrackAnalysis が呼ばれ、ボタンが「⏹ Stop」になる', async () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    fireEvent.click(screen.getByRole('button', { name: '▶ Play' }))
    // init は await されるので state 反映を待つ
    expect(await screen.findByRole('button', { name: '⏹ Stop' })).toBeInTheDocument()
    expect(initMock).toHaveBeenCalledTimes(1)
    expect(play4TrackMock).toHaveBeenCalledTimes(1)
    expect(playNotesMock).not.toHaveBeenCalled()
  })

  it('play4TrackAnalysis の引数概形: tracks/mutedTracks(Set)/onProgress(fn)/startFrom(初期0)', async () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    fireEvent.click(screen.getByRole('button', { name: '▶ Play' }))
    await screen.findByRole('button', { name: '⏹ Stop' })

    const [tracksArg, mutedArg, onProgressArg, startFromArg] = play4TrackMock.mock.calls[0]
    // other は [] で渡す（非再生）、melody/guitar/keyboard は再生する
    const actualKeys = Object.keys(tracksArg).sort()
    expect(actualKeys).toContain('bass')
    expect(actualKeys).toContain('drums')
    expect(actualKeys).toContain('guitar')
    expect(actualKeys).toContain('keyboard')
    // ミュートなし → drums は実ノート配列、other は空配列（非再生）、melody は再生する
    expect(tracksArg.drums).toHaveLength(2)
    expect(tracksArg.other).toEqual([])      // other は非再生
    expect(tracksArg.melody).toHaveLength(1) // melody（ボーカル）は再生する
    expect(mutedArg).toBeInstanceOf(Set)
    expect(mutedArg.size).toBe(0)
    expect(typeof onProgressArg).toBe('function')
    expect(startFromArg).toBe(0)
  })

  it('再生中に再度押すと playbackRef.stop() が呼ばれ「▶ Play」に戻る', async () => {
    const stopSpy = vi.fn()
    play4TrackMock.mockImplementation(() => ({ stop: stopSpy, seek: vi.fn() }))
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)

    fireEvent.click(screen.getByRole('button', { name: '▶ Play' }))
    const stopBtn = await screen.findByRole('button', { name: '⏹ Stop' })
    fireEvent.click(stopBtn)
    expect(stopSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '▶ Play' })).toBeInTheDocument()
  })

  it('単一トラック結果では playAnalysisNotes が呼ばれる（notes, "default", onProgress）', async () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeSingleTrackResult()} />)
    fireEvent.click(screen.getByRole('button', { name: '▶ Play' }))
    await screen.findByRole('button', { name: '⏹ Stop' })
    expect(playNotesMock).toHaveBeenCalledTimes(1)
    expect(play4TrackMock).not.toHaveBeenCalled()
    const [notesArg, trackArg, onProgressArg] = playNotesMock.mock.calls[0]
    expect(notesArg).toHaveLength(2)
    expect(trackArg).toBe('default')
    expect(typeof onProgressArg).toBe('function')
  })

  it('2回目の再生では init は再度呼ばれない（audioInitialized が立つ）', async () => {
    play4TrackMock.mockImplementation(() => ({ stop: vi.fn(), seek: vi.fn() }))
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    fireEvent.click(screen.getByRole('button', { name: '▶ Play' }))
    fireEvent.click(await screen.findByRole('button', { name: '⏹ Stop' }))
    fireEvent.click(await screen.findByRole('button', { name: '▶ Play' }))
    await screen.findByRole('button', { name: '⏹ Stop' })
    expect(initMock).toHaveBeenCalledTimes(1)
    expect(play4TrackMock).toHaveBeenCalledTimes(2)
  })
})

// ============================================================
// 観点3: ミュート（mutedTracks）
// ============================================================
describe('観点3: ミュート', () => {
  it('Bass トラックをミュートすると再生時に bass=[]（空配列）が渡る', async () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)

    // Bass トラックヘッダー内のミュートボタン（初期ラベル "M"）をクリック
    const bassLabel = screen.getByText('Bass')
    const bassHeader = bassLabel.closest('div')!.parentElement as HTMLElement
    const muteBtn = within(bassHeader).getByRole('button', { name: 'M' })
    fireEvent.click(muteBtn)
    // ミュート後はラベルが "MUTED" になる
    expect(within(bassHeader).getByRole('button', { name: 'MUTED' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '▶ Play' }))
    await screen.findByRole('button', { name: '⏹ Stop' })

    const [tracksArg, mutedArg] = play4TrackMock.mock.calls[0]
    expect(tracksArg.bass).toEqual([]) // ミュート → 空配列
    // other は常に空（非再生）。melody（ボーカル）はミュートしない限り再生する
    expect(tracksArg.other).toEqual([])
    expect(tracksArg.melody).toHaveLength(1)
    expect(mutedArg.has('bass')).toBe(true)
  })
})

// ============================================================
// 観点4 & 5: ドラッグ選択の状態機械 + AI解説 fetch
// ============================================================
describe('観点4: ドラッグ選択 → 観点5: AI解説', () => {
  // melody トラックの SVG（描画順で最初の svg）を取得
  const firstSvg = (container: HTMLElement): SVGSVGElement => {
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    return svg as SVGSVGElement
  }

  it('ドラッグで 0.5秒超の範囲を選択するとボタンが「🤖 選択範囲を解説」に変わる', () => {
    const { container } = render(
      <AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />
    )
    const svg = firstSvg(container)
    // zoom=1 → 80px=1秒。SVG 幅は maxTime(=4)*80=320px なので clientX は 0〜320 に収まる範囲を使う。
    // clientX 0→240 = 0秒→3秒の選択（0.5秒超なので選択扱い）
    fireEvent.mouseDown(svg, { clientX: 0 })
    fireEvent.mouseMove(svg, { clientX: 240 })
    fireEvent.mouseUp(svg, { clientX: 240 })

    expect(screen.getByRole('button', { name: '🤖 選択範囲を解説' })).toBeInTheDocument()
  })

  it('範囲選択後に解説ボタンを押すと explainSection が選択範囲の start/end で呼ばれる', async () => {
    explainSectionMock.mockResolvedValue({
      success: true,
      data: { analysis_text: 'これはサビ前の盛り上がりです', section: { start: 0, end: 10 } },
    })
    const { container } = render(
      <AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />
    )
    const svg = firstSvg(container)
    // clientX 0→240 = 0秒→3秒（SVG 幅 320px=maxTime4 内）
    fireEvent.mouseDown(svg, { clientX: 0 })
    fireEvent.mouseMove(svg, { clientX: 240 })
    fireEvent.mouseUp(svg, { clientX: 240 })

    fireEvent.click(screen.getByRole('button', { name: '🤖 選択範囲を解説' }))

    // 結果が sectionAnalysis に入り表示される
    expect(await screen.findByText('これはサビ前の盛り上がりです')).toBeInTheDocument()
    expect(explainSectionMock).toHaveBeenCalledTimes(1)
    const req = explainSectionMock.mock.calls[0][0]
    expect(req.track_name).toBe('テスト楽曲')
    expect(req.tempo).toBe(150)
    expect(req.start_time).toBeCloseTo(0, 5)
    expect(req.end_time).toBeCloseTo(3, 5)
    // tracks の各キーがノート配列で渡る
    expect(req.tracks.melody).toHaveLength(1)
    expect(req.tracks.drums).toHaveLength(2)
  })

  it('選択なしで AI解説を押すと現在位置±5秒（初期: 0±5 → start=0,end=5）で呼ばれる', async () => {
    explainSectionMock.mockResolvedValue({
      success: true,
      data: { analysis_text: 'デフォルト範囲の解説', section: { start: 0, end: 5 } },
    })
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    fireEvent.click(screen.getByRole('button', { name: '🤖 AI解説' }))
    await screen.findByText('デフォルト範囲の解説')
    const req = explainSectionMock.mock.calls[0][0]
    expect(req.start_time).toBe(0) // Math.max(0, 0-5)
    expect(req.end_time).toBe(5) // 0+5
  })

  it('解説中はボタンが「解析中...」になり disabled、解決後に解説テキストが入る', async () => {
    let resolveFn: (v: unknown) => void = () => {}
    explainSectionMock.mockImplementation(
      () => new Promise((resolve) => { resolveFn = resolve })
    )
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    fireEvent.click(screen.getByRole('button', { name: '🤖 AI解説' }))

    const analyzing = await screen.findByRole('button', { name: '解析中...' })
    expect(analyzing).toBeDisabled()

    resolveFn({ success: true, data: { analysis_text: '解析完了テキスト', section: { start: 0, end: 5 } } })
    expect(await screen.findByText('解析完了テキスト')).toBeInTheDocument()
    // isAnalyzing が解除されボタンが戻る
    expect(screen.getByRole('button', { name: '🤖 AI解説' })).toBeInTheDocument()
  })

  it('explainSection が success=false を返すとエラー文言が sectionAnalysis に入る', async () => {
    explainSectionMock.mockResolvedValue({ success: false, error: 'サーバエラー' })
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    fireEvent.click(screen.getByRole('button', { name: '🤖 AI解説' }))
    expect(await screen.findByText('エラー: サーバエラー')).toBeInTheDocument()
  })
})

// ============================================================
// 観点6: アンマウント時 cleanup
// ============================================================
describe('観点6: アンマウント cleanup', () => {
  it('再生中にアンマウントすると playbackRef.stop() が呼ばれる', async () => {
    const stopSpy = vi.fn()
    play4TrackMock.mockImplementation(() => ({ stop: stopSpy, seek: vi.fn() }))
    const { unmount } = render(
      <AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />
    )
    fireEvent.click(screen.getByRole('button', { name: '▶ Play' }))
    await screen.findByRole('button', { name: '⏹ Stop' })

    unmount()
    expect(stopSpy).toHaveBeenCalled()
  })

  it('再生中に isOpen=false へ更新すると stop() が呼ばれ、再生状態が解除される', async () => {
    const stopSpy = vi.fn()
    play4TrackMock.mockImplementation(() => ({ stop: stopSpy, seek: vi.fn() }))
    const { rerender } = render(
      <AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />
    )
    fireEvent.click(screen.getByRole('button', { name: '▶ Play' }))
    await screen.findByRole('button', { name: '⏹ Stop' })

    rerender(<AnalysisPianoRollModal isOpen={false} onClose={() => {}} result={makeFourTrackResult()} />)
    expect(stopSpy).toHaveBeenCalled()
  })
})

// ============================================================
// 観点7: キーボードショートカット
// ============================================================
describe('観点7: キーボードショートカット', () => {
  it('Escape キーで onClose が呼ばれる', () => {
    const onClose = vi.fn()
    render(<AnalysisPianoRollModal isOpen onClose={onClose} result={makeFourTrackResult()} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Space キー（target=body）で再生がトグルされ play4TrackAnalysis が呼ばれる', async () => {
    render(<AnalysisPianoRollModal isOpen onClose={() => {}} result={makeFourTrackResult()} />)
    // 現状コードは e.target === document.body のときのみ反応
    fireEvent.keyDown(document.body, { key: ' ' })
    await screen.findByRole('button', { name: '⏹ Stop' })
    expect(play4TrackMock).toHaveBeenCalledTimes(1)
  })

  it('オーバーレイ（背景）クリックで onClose が呼ばれる', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AnalysisPianoRollModal isOpen onClose={onClose} result={makeFourTrackResult()} />
    )
    // 最外の fixed inset-0 オーバーレイが onClick={onClose}
    fireEvent.click(container.firstChild as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
