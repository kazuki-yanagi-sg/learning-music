/**
 * レーン間の時間軸アライメント（gutter 幅）テスト
 *
 * メイン編集画面では DrumGrid と PianoRoll を縦に並べる。
 * 左ラベル領域（gutter）の幅が一致しないと、時間軸の開始 x がズレ、
 * 小節ルーラーの縦ラインがレーン間で揃わなくなる（バグ症状）。
 *
 * 両コンポーネントが共有定数 LABEL_GUTTER_WIDTH を使い、
 * グリッド開始位置（marginLeft）と左ラベルパネル幅が一致することを固定する。
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DrumGrid } from '../../src/components/DrumGrid/DrumGrid'
import { PianoRoll } from '../../src/components/PianoRoll/PianoRoll'
import { LABEL_GUTTER_WIDTH } from '../../src/constants/pianoRollLayout'

describe('LABEL_GUTTER_WIDTH（共通 gutter 定数）', () => {
  it('80px である（ドラムの文字ラベルが切れない広い方に統一）', () => {
    expect(LABEL_GUTTER_WIDTH).toBe(80)
  })
})

describe('DrumGrid と PianoRoll の gutter 幅一致', () => {
  // グリッド本体（SVG）の marginLeft を取得する
  const gridMarginLeft = (container: HTMLElement): string => {
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    return (svg as SVGSVGElement).style.marginLeft
  }

  it('DrumGrid のグリッド marginLeft が LABEL_GUTTER_WIDTH と一致する', () => {
    const { container } = render(
      <DrumGrid notes={[]} onNotesChange={() => {}} visibleBars={4} beatWidth={24} />
    )
    expect(gridMarginLeft(container)).toBe(`${LABEL_GUTTER_WIDTH}px`)
  })

  it('PianoRoll のグリッド marginLeft が LABEL_GUTTER_WIDTH と一致する', () => {
    const { container } = render(
      <PianoRoll
        notes={[]}
        onNotesChange={() => {}}
        config={{ visibleBars: 4, beatWidth: 24 }}
      />
    )
    expect(gridMarginLeft(container)).toBe(`${LABEL_GUTTER_WIDTH}px`)
  })

  it('両コンポーネントの gutter（marginLeft）が一致する', () => {
    const drum = render(
      <DrumGrid notes={[]} onNotesChange={() => {}} visibleBars={4} beatWidth={24} />
    )
    const piano = render(
      <PianoRoll
        notes={[]}
        onNotesChange={() => {}}
        config={{ visibleBars: 4, beatWidth: 24 }}
      />
    )
    expect(gridMarginLeft(drum.container)).toBe(gridMarginLeft(piano.container))
  })
})
