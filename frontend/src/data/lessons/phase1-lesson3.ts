/**
 * Phase 1 - Lesson 1.3: 和音の作り方
 *
 * 学ぶこと:
 * - 和音 = 距離の組み合わせ
 * - メジャー [0, 4, 7]
 * - マイナー [0, 3, 7]
 * - パワーコード [0, 7]
 */
import { Lesson } from '../../types/lesson'

export const phase1Lesson3: Lesson = {
  id: 'phase1-lesson3',
  phaseId: 1,
  lessonNumber: 3,
  title: '和音の作り方',
  description: '距離を組み合わせて和音を作る',
  estimatedMinutes: 30,
  prerequisites: ['phase1-lesson2'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: '和音とは',
      content: `<strong>和音</strong>とは、複数の音を同時に鳴らしたものです。

和音は「距離の組み合わせ」で定義できます。

例：ある和音が [0, 4, 7] という構造を持つとします。
これは「基準音から距離0、4、7の音を同時に鳴らす」という意味です。

基準音を変えても、距離の関係が同じなら同じ種類の和音になります。

基準音 0 の場合: [0, 4, 7]
基準音 5 の場合: [5, 9, 0] （mod 12で計算）

これが「移調」の本質です。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'メジャー和音',
      content: `最も基本的な和音が <strong>メジャー和音</strong> です。

<strong>構造: [0, 4, 7]</strong>

距離の内訳:
- 0 → 4: 距離4（明るい響き）
- 0 → 7: 距離7（安定した響き）
- 4 → 7: 距離3

<strong>特徴:</strong>
- 明るい、ポジティブ
- アニソンのサビで多用
- 「ハッピーエンド感」

基準音が 0 なら [0, 4, 7]
基準音が 7 なら [7, 11, 2]（mod 12）`,
    },
    {
      id: 'step3',
      type: 'exercise',
      title: '実践：メジャー和音を作る',
      content: `基準音 0 のメジャー和音を作りましょう。

<strong>課題：[0, 4, 7] を同時に鳴らす</strong>

キーボードトラックに：
- 0⁽⁴⁾ = MIDI 60
- 4⁽⁴⁾ = MIDI 64
- 7⁽⁴⁾ = MIDI 67

を同じ拍に置いてください。

「明るい」響きを確認しましょう。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 64, start: 0, duration: 1 },
        { pitch: 67, start: 0, duration: 1 },
      ],
      hints: [
        'Lesson 1.1 でも同じ和音を作りました',
        '距離4（明るい）+ 距離7（安定）= メジャー和音',
      ],
    },
    {
      id: 'step4',
      type: 'theory',
      title: 'マイナー和音',
      content: `メジャーと対になる <strong>マイナー和音</strong> です。

<strong>構造: [0, 3, 7]</strong>

距離の内訳:
- 0 → 3: 距離3（暗い響き）
- 0 → 7: 距離7（安定した響き）
- 3 → 7: 距離4

<strong>メジャーとの違い:</strong>
- メジャー: [0, <strong>4</strong>, 7]（距離4 = 明るい）
- マイナー: [0, <strong>3</strong>, 7]（距離3 = 暗い）

たった1の違いで、印象が180度変わります！

<strong>特徴:</strong>
- 暗い、切ない、悲しい
- 泣きメロ、バラードに多用
- 「感動シーン」の定番`,
    },
    {
      id: 'step5',
      type: 'exercise',
      title: '実践：マイナー和音を作る',
      content: `基準音 0 のマイナー和音を作りましょう。

<strong>課題：[0, 3, 7] を同時に鳴らす</strong>

キーボードトラックに：
- 0⁽⁴⁾ = MIDI 60
- 3⁽⁴⁾ = MIDI 63
- 7⁽⁴⁾ = MIDI 67

を同じ拍に置いてください。

先ほどのメジャー和音と比べて「暗い」響きを確認しましょう。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 63, start: 0, duration: 1 },
        { pitch: 67, start: 0, duration: 1 },
      ],
      hints: [
        'メジャーの 4 を 3 に変えるだけ',
        '距離3（暗い）+ 距離7（安定）= マイナー和音',
      ],
    },
    {
      id: 'step6',
      type: 'quiz',
      title: '確認クイズ：メジャーとマイナー',
      content: '和音の構造を確認しましょう。',
      question: '基準音 5 のマイナー和音は？',
      options: [
        '[5, 8, 0]',
        '[5, 9, 0]',
        '[5, 8, 12]',
        '[5, 9, 12]',
      ],
      correctIndex: 0,
      explanation: 'マイナーは [0, 3, 7] の構造。基準音5に適用すると [5, 5+3, 5+7] = [5, 8, 12]。12 mod 12 = 0 なので [5, 8, 0]。',
    },
    {
      id: 'step7',
      type: 'theory',
      title: 'パワーコード',
      content: `<strong>パワーコード</strong>はロックの基本です。

<strong>構造: [0, 7]</strong>

2音だけのシンプルな和音です。
距離7（安定）のみで構成されています。

<strong>特徴:</strong>
- 力強い、シンプル
- メジャーでもマイナーでもない（距離3/4がない）
- ギターでよく使われる
- アニソンのイントロ・サビで多用

<strong>なぜ「パワー」か:</strong>
距離3/4がないため、曖昧さがなく力強い響きになります。
ロック、メタル、アニソンの激しいパートに最適。`,
    },
    {
      id: 'step8',
      type: 'exercise',
      title: '実践：パワーコードを作る',
      content: `基準音 0 のパワーコードを作りましょう。

<strong>課題：[0, 7] を同時に鳴らす</strong>

キーボードトラックに：
- 0⁽⁴⁾ = MIDI 60
- 7⁽⁴⁾ = MIDI 67

を同じ拍に置いてください。

「力強い」響きを確認しましょう。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 67, start: 0, duration: 1 },
      ],
      hints: [
        '2音だけのシンプルな和音',
        '明るくも暗くもない、純粋な力強さ',
      ],
    },
    {
      id: 'step9',
      type: 'theory',
      title: '和音の移調',
      content: `和音を別の基準音に移動させることを <strong>移調</strong> といいます。

計算は簡単です：
<strong>全ての音に同じ数を足す（mod 12）</strong>

例：0 メジャー [0, 4, 7] を基準音 5 に移調
[0+5, 4+5, 7+5] = [5, 9, 12]
12 mod 12 = 0 なので [5, 9, 0]

これが「5 メジャー」です。

<strong>重要:</strong>
移調しても「距離の関係」は変わりません。
だから同じ種類の和音として聞こえます。`,
    },
    {
      id: 'step10',
      type: 'quiz',
      title: '確認クイズ：移調',
      content: '移調の計算をしましょう。',
      question: '7 メジャー（基準音7のメジャー和音）の構成音は？',
      options: [
        '[7, 10, 2]',
        '[7, 11, 2]',
        '[7, 11, 14]',
        '[7, 10, 14]',
      ],
      correctIndex: 1,
      explanation: 'メジャーは [0, 4, 7]。基準音7に移調すると [7, 11, 14]。14 mod 12 = 2 なので [7, 11, 2]。',
    },
    {
      id: 'step11',
      type: 'theory',
      title: 'その他の和音',
      content: `よく使う和音パターンをまとめます。

| 名前 | 構造 | 響き |
|-----|------|------|
| メジャー | [0, 4, 7] | 明るい |
| マイナー | [0, 3, 7] | 暗い |
| パワー | [0, 7] | 力強い |
| メジャー7 | [0, 4, 7, 11] | おしゃれ |
| マイナー7 | [0, 3, 7, 10] | 切ない |
| 7 (ドミナント) | [0, 4, 7, 10] | 緊張→解決 |
| sus4 | [0, 5, 7] | 浮遊感 |
| dim | [0, 3, 6] | 不安定 |
| aug | [0, 4, 8] | 不思議 |

<strong>まずは上3つ（メジャー、マイナー、パワー）を覚えましょう。</strong>`,
    },
    {
      id: 'step12',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>和音 = 距離の組み合わせ</strong>
   - 基準音からの距離で定義
   - 移調 = 全部に同じ数を足す

2. <strong>基本の3和音</strong>
   - メジャー [0, 4, 7]: 明るい
   - マイナー [0, 3, 7]: 暗い
   - パワー [0, 7]: 力強い

3. <strong>メジャーとマイナーの違い</strong>
   - 距離4 vs 距離3 の違いだけ
   - 1の差で印象が180度変わる

<strong>次のレッスン：</strong>
スケール（音階）を学びます。
曲で使う音の「パレット」を理解します。`,
    },
  ],
}
