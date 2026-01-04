/**
 * Phase 2 - Lesson 2.2: マイナースケール
 *
 * 学ぶこと:
 * - マイナースケールの距離パターン [0, 2, 3, 5, 7, 8, 10]
 * - メジャーとの違い
 * - 平行調の関係
 */
import { Lesson } from '../../types/lesson'

export const phase2Lesson2: Lesson = {
  id: 'phase2-lesson2',
  phaseId: 2,
  lessonNumber: 2,
  title: 'マイナースケール',
  description: '暗い・切ない曲の音のパレットを理解する',
  estimatedMinutes: 25,
  prerequisites: ['phase2-lesson1'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'マイナースケールの構造',
      content: `<strong>マイナースケール</strong>は暗い響きのスケールです。

基準音を 0 とした場合の距離パターン：
<strong>[0, 2, 3, 5, 7, 8, 10]</strong>

距離の間隔を見ると：
0 → 2: 距離2
2 → 3: 距離1
3 → 5: 距離2
5 → 7: 距離2
7 → 8: 距離1
8 → 10: 距離2
10 → 12(0): 距離2

パターン: <strong>2-1-2-2-1-2-2</strong>

メジャーの「2-2-1-2-2-2-1」と比べてみてください。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'メジャーとマイナーの比較',
      content: `2つのスケールを並べて比較しましょう。

<strong>メジャー:</strong> [0, 2, <strong>4</strong>, 5, 7, <strong>9</strong>, <strong>11</strong>]
<strong>マイナー:</strong> [0, 2, <strong>3</strong>, 5, 7, <strong>8</strong>, <strong>10</strong>]

違いは 3箇所：
- 4 → 3（距離1下がる）
- 9 → 8（距離1下がる）
- 11 → 10（距離1下がる）

<strong>特に重要なのは 4 → 3 の違い：</strong>
- メジャー: 距離4がある → 明るい
- マイナー: 距離3がある → 暗い

和音と同じ原理です！`,
    },
    {
      id: 'step3',
      type: 'quiz',
      title: '確認クイズ：マイナースケール',
      content: 'マイナースケールの構造を確認しましょう。',
      question: '基準音 0 のマイナースケールに含まれる音は？',
      options: [
        '[0, 2, 4, 5, 7, 9, 11]',
        '[0, 2, 3, 5, 7, 9, 11]',
        '[0, 2, 3, 5, 7, 8, 10]',
        '[0, 1, 3, 5, 7, 8, 10]',
      ],
      correctIndex: 2,
      explanation: 'マイナースケールは [0, 2, 3, 5, 7, 8, 10] です。2-1-2-2-1-2-2 のパターン。',
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：マイナースケールを弾く',
      content: `基準音 0 のマイナースケールを順番に弾きましょう。

<strong>課題：[0, 2, 3, 5, 7, 8, 10, 12] を順番に入力</strong>

キーボードトラックに、1拍ずつ順番に：
- 0⁽⁴⁾ (MIDI 60) → 1拍目
- 2⁽⁴⁾ (MIDI 62) → 2拍目
- 3⁽⁴⁾ (MIDI 63) → 3拍目
- 5⁽⁴⁾ (MIDI 65) → 4拍目
- 7⁽⁴⁾ (MIDI 67) → 5拍目
- 8⁽⁴⁾ (MIDI 68) → 6拍目
- 10⁽⁴⁾ (MIDI 70) → 7拍目
- 0⁽⁵⁾ (MIDI 72) → 8拍目

メジャースケールと比べて暗い響きを確認してください。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 62, start: 1, duration: 1 },
        { pitch: 63, start: 2, duration: 1 },
        { pitch: 65, start: 3, duration: 1 },
        { pitch: 67, start: 4, duration: 1 },
        { pitch: 68, start: 5, duration: 1 },
        { pitch: 70, start: 6, duration: 1 },
        { pitch: 72, start: 7, duration: 1 },
      ],
      hints: [
        '3拍目が 4⁽⁴⁾ ではなく 3⁽⁴⁾ になります',
        'メジャーより「暗い」響きになるはず',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: '平行調の関係',
      content: `メジャーとマイナーには面白い関係があります。

<strong>基準音 0 のメジャー:</strong> [0, 2, 4, 5, 7, 9, 11]
<strong>基準音 9 のマイナー:</strong> [9, 11, 0, 2, 4, 5, 7]

並べ替えると... 同じ音！

これを<strong>平行調</strong>といいます。

<strong>公式:</strong>
- メジャー基準音 + 9 = 平行マイナーの基準音
- マイナー基準音 + 3 = 平行メジャーの基準音

同じ音を使っていても、どの音を「基準」とするかで
明るく聞こえたり暗く聞こえたりします。`,
    },
    {
      id: 'step6',
      type: 'quiz',
      title: '確認クイズ：平行調',
      content: '平行調の関係を計算しましょう。',
      question: '基準音 5 のメジャースケールの平行マイナーは？',
      options: [
        '基準音 2 のマイナー',
        '基準音 8 のマイナー',
        '基準音 3 のマイナー',
        '基準音 7 のマイナー',
      ],
      correctIndex: 0,
      explanation: '5 + 9 = 14。14 mod 12 = 2。よって基準音 2 のマイナーが平行調です。',
    },
    {
      id: 'step7',
      type: 'theory',
      title: 'マイナースケールの響き',
      content: `マイナースケールは<strong>暗い・切ない響き</strong>が特徴です。

<strong>理由:</strong>
基準音から距離3の位置に音がある
→ 距離3 = 暗い響き
→ マイナー和音 [0, 3, 7] がスケール内で作れる

<strong>アニソンでの使用例:</strong>
- 切ないバラード
- シリアスなシーン
- 戦闘BGM
- 感動的なクライマックス

<strong>特徴的な使い方:</strong>
アニソンでは「Aメロはマイナー、サビはメジャー」
というパターンがよくあります。
暗い → 明るい で感情の変化を表現します。`,
    },
    {
      id: 'step8',
      type: 'theory',
      title: '3種類のマイナースケール',
      content: `実は、マイナースケールには3つのバリエーションがあります。

<strong>1. ナチュラルマイナー（自然的短音階）</strong>
[0, 2, 3, 5, 7, 8, 10]
→ 今回学んだ基本形

<strong>2. ハーモニックマイナー（和声的短音階）</strong>
[0, 2, 3, 5, 7, 8, 11]
→ 10 が 11 に上がる
→ 中東風、ドラマティックな響き

<strong>3. メロディックマイナー（旋律的短音階）</strong>
[0, 2, 3, 5, 7, 9, 11]
→ 8 と 10 が 9 と 11 に上がる
→ ジャズでよく使用

<strong>アニソンでは主にナチュラルマイナーを使います。</strong>`,
    },
    {
      id: 'step9',
      type: 'quiz',
      title: '確認クイズ：移調',
      content: 'マイナースケールの移調を計算しましょう。',
      question: '基準音 7 のナチュラルマイナースケールに含まれる音は？',
      options: [
        '[7, 9, 10, 0, 2, 3, 5]',
        '[7, 9, 11, 0, 2, 4, 5]',
        '[7, 8, 10, 0, 2, 3, 5]',
        '[7, 9, 10, 0, 2, 4, 6]',
      ],
      correctIndex: 0,
      explanation: '[0, 2, 3, 5, 7, 8, 10] + 7 = [7, 9, 10, 12, 14, 15, 17]。mod 12 で [7, 9, 10, 0, 2, 3, 5]。',
    },
    {
      id: 'step10',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>マイナースケール</strong>
   - パターン: [0, 2, 3, 5, 7, 8, 10]
   - 間隔: 2-1-2-2-1-2-2
   - 暗い・切ない響き

2. <strong>メジャーとの違い</strong>
   - 4→3、9→8、11→10
   - 距離3があるから暗い

3. <strong>平行調</strong>
   - 同じ音を使う
   - メジャー + 9 = マイナー基準音

<strong>次のレッスン：</strong>
ダイアトニックコードを学びます。
スケールから自然に生まれる和音です。`,
    },
  ],
}
