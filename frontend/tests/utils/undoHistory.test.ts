/**
 * アンドゥ履歴の特性化テスト（リファクタの安全網 / REFACTOR_PLAN #18）
 *
 * 目的:
 *   App.tsx の handleNotesChange が履歴へ積むスナップショット生成
 *   （snapshotTracks）と、undo（pop して setTracks）の振る舞いを固定する。
 *
 *   #18 の最適化は「全トラックのディープクローン
 *   （JSON.parse(JSON.stringify(...))）」を、
 *   不変条件（ノートや配列を in-place 変更しない）に基づく
 *   浅いスナップショットへ置換するもの。
 *   挙動（特に undo の正しさ・スナップショット独立性）は厳密に不変であること。
 *
 * 方針:
 *   - App の編集ループの本質（履歴 push / shift / pop と
 *     prev.map による「変更トラックのみ新規 track で置換」）を
 *     純粋なヘルパー上で忠実に再現し、観点ごとに固定する。
 *   - スナップショット生成は App.tsx から export した snapshotTracks を使う
 *     （実装差し替え＝この特性化テストでガードする対象そのもの）。
 */
import { describe, it, expect, vi } from 'vitest'

// App.tsx は audioEngine 経由で tone.js を読み込むが、ここで検証するのは
// 履歴スナップショット（純粋ロジック）のみ。重い外部I/Oを排除するため
// audioEngine をモックして tone の読み込みを回避する。
vi.mock('../../src/services/audioEngine', () => ({
  audioEngine: {
    init: vi.fn(),
    playNote: vi.fn(),
    setBpm: vi.fn(),
    setTrackMute: vi.fn(),
    play: vi.fn(),
    stop: vi.fn(),
    getCurrentBeat: vi.fn(() => 0),
  },
}))

import { snapshotTracks, MAX_UNDO_HISTORY } from '../../src/App'
import { Note, Track } from '../../src/types/music'

// 初期トラック（App.createInitialTracks 相当）
const createInitialTracks = (): Track[] => [
  { id: 'drum', type: 'drum', name: 'ドラム', notes: [], muted: false, volume: 0.8 },
  { id: 'bass', type: 'bass', name: 'ベース', notes: [], muted: false, volume: 0.8 },
  { id: 'keyboard', type: 'keyboard', name: 'キーボード', notes: [], muted: false, volume: 0.7 },
  { id: 'guitar', type: 'guitar', name: 'ギター', notes: [], muted: false, volume: 0.7 },
]

const note = (id: string, pitch: number): Note => ({ id, pitch, start: 0, duration: 1 })

/**
 * App の編集ループを再現するミニ・ストア。
 * - handleNotesChange: 現在状態を snapshotTracks で履歴に積み、
 *   MAX 超過で古いものを shift、変更トラックのみ新 track で置換する。
 * - undo: 履歴を pop して現在状態へ戻す。
 * いずれも App.tsx の該当ロジックと同一手順。
 */
class UndoStore {
  tracks: Track[]
  history: Track[][] = []

  constructor() {
    this.tracks = createInitialTracks()
  }

  handleNotesChange(trackId: string, newNotes: Note[]): void {
    // 現在の状態を履歴に保存
    this.history.push(snapshotTracks(this.tracks))
    // 履歴が最大数を超えたら古いものを削除
    if (this.history.length > MAX_UNDO_HISTORY) {
      this.history.shift()
    }
    // 変更トラックのみ新しい track オブジェクトで置換（in-place 変更しない）
    this.tracks = this.tracks.map((track) =>
      track.id === trackId ? { ...track, notes: newNotes } : track
    )
  }

  undo(): void {
    if (this.history.length === 0) return
    const previous = this.history.pop()
    if (previous) this.tracks = previous
  }

  notesOf(trackId: string): Note[] {
    return this.tracks.find((t) => t.id === trackId)!.notes
  }
}

describe('アンドゥ履歴の特性化（snapshotTracks + undo）', () => {
  it('複数トラックを順に編集→undo を繰り返すと各段階の過去状態へ正しく戻る', () => {
    const store = new UndoStore()

    // 段階0: 全トラック空
    const kb1 = [note('k1', 60)]
    store.handleNotesChange('keyboard', kb1) // 段階1
    const bass1 = [note('b1', 40)]
    store.handleNotesChange('bass', bass1) // 段階2
    const kb2 = [note('k1', 60), note('k2', 64)]
    store.handleNotesChange('keyboard', kb2) // 段階3

    // 現在は段階3
    expect(store.notesOf('keyboard')).toEqual(kb2)
    expect(store.notesOf('bass')).toEqual(bass1)

    // undo → 段階2（keyboard が kb1 に戻り bass はまだ bass1）
    store.undo()
    expect(store.notesOf('keyboard')).toEqual(kb1)
    expect(store.notesOf('bass')).toEqual(bass1)

    // undo → 段階1（bass が空に戻る）
    store.undo()
    expect(store.notesOf('keyboard')).toEqual(kb1)
    expect(store.notesOf('bass')).toEqual([])

    // undo → 段階0（keyboard も空に戻る、全トラック空）
    store.undo()
    expect(store.notesOf('keyboard')).toEqual([])
    expect(store.notesOf('bass')).toEqual([])

    // これ以上 undo しても安全（履歴空で no-op）
    store.undo()
    expect(store.notesOf('keyboard')).toEqual([])
  })

  it('スナップショット独立性: 後続の編集で過去の履歴が汚染されない', () => {
    const store = new UndoStore()

    // トラックA(keyboard)を編集して履歴に「空」を積む
    const kbV1 = [note('k1', 60)]
    store.handleNotesChange('keyboard', kbV1)

    // 別の編集（bass / keyboard 上書き）を重ねる
    store.handleNotesChange('bass', [note('b1', 40)])
    store.handleNotesChange('keyboard', [note('k1', 60), note('k2', 67)])

    // pop して戻る過去状態は「積んだ時点の内容」と一致すること
    // 段階3→段階2: keyboard=kbV1, bass=[b1]
    store.undo()
    expect(store.notesOf('keyboard')).toEqual(kbV1)
    expect(store.notesOf('bass')).toEqual([note('b1', 40)])

    // 段階2→段階1: keyboard=kbV1, bass=[]
    store.undo()
    expect(store.notesOf('keyboard')).toEqual(kbV1)
    expect(store.notesOf('bass')).toEqual([])

    // 段階1→段階0: 全トラック空（最初に積んだ「空」の状態）
    store.undo()
    expect(store.notesOf('keyboard')).toEqual([])
    expect(store.notesOf('bass')).toEqual([])
  })

  it('不変条件下では現在状態を変えても履歴スナップショットは不変', () => {
    const store = new UndoStore()
    const kbV1 = [note('k1', 60)]
    store.handleNotesChange('keyboard', kbV1) // 履歴[0] = 全トラック空のスナップショット

    const snapshotBefore = store.history[0]
    const keyboardSnap = snapshotBefore.find((t) => t.id === 'keyboard')!

    // 現在状態（tracks）を「置換」で更新（App と同じ：in-place しない）
    store.handleNotesChange('keyboard', [note('k1', 60), note('k2', 64)])
    store.handleNotesChange('bass', [note('b9', 41)])

    // 最初に積んだスナップショットは一切変化していないこと
    expect(keyboardSnap.notes).toEqual([])
    expect(snapshotBefore.find((t) => t.id === 'bass')!.notes).toEqual([])
  })

  it(`履歴が MAX_UNDO_HISTORY(${MAX_UNDO_HISTORY}) を超えると最古が捨てられる`, () => {
    const store = new UndoStore()

    // MAX + 5 回編集 → 履歴長は MAX に張り付く
    const total = MAX_UNDO_HISTORY + 5
    for (let i = 0; i < total; i++) {
      store.handleNotesChange('keyboard', [note(`k${i}`, 60 + (i % 12))])
    }

    expect(store.history.length).toBe(MAX_UNDO_HISTORY)

    // 現在状態は最後の編集結果
    expect(store.notesOf('keyboard')).toEqual([note(`k${total - 1}`, 60 + ((total - 1) % 12))])

    // MAX 回 undo してもエラーなく辿れる（最古は捨てられているため初期空には戻らない）
    for (let i = 0; i < MAX_UNDO_HISTORY; i++) {
      store.undo()
    }
    expect(store.history.length).toBe(0)
    // 最古スナップショット（捨てられず残った中で一番古い）は
    // 「total - MAX 回目の編集」直前の状態 = k{total-MAX-1} を含む
    const oldestKept = total - MAX_UNDO_HISTORY // = 5
    expect(store.notesOf('keyboard')).toEqual([
      note(`k${oldestKept - 1}`, 60 + ((oldestKept - 1) % 12)),
    ])
  })

  it('snapshotTracks は元配列から独立した（同値だが別参照の）コピーを返す', () => {
    const tracks = createInitialTracks()
    tracks[2].notes = [note('k1', 60)]

    const snap = snapshotTracks(tracks)

    // 同値
    expect(snap).toEqual(tracks)
    // 別参照（配列・各 track オブジェクトとも）
    expect(snap).not.toBe(tracks)
    expect(snap[2]).not.toBe(tracks[2])
  })
})
