/**
 * Phase 1 - Lesson 1.2: 2つの音の距離
 *
 * 学ぶこと:
 * - 距離 = 2音の差（引き算）
 * - 各距離の響きと感情
 */
import { Lesson } from '../../types/lesson'

export const phase1Lesson2: Lesson = {
  id: 'phase1-lesson2',
  phaseId: 1,
  lessonNumber: 2,
  title: '2つの音の距離',
  description: '2つの音の間隔と、それぞれの響きを学ぶ',
  estimatedMinutes: 25,
  prerequisites: ['phase1-lesson1'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: '距離とは',
      content: `<strong>距離</strong>とは、2つの音の間隔のことです。

計算方法はシンプル：
<strong>距離 = 高い音 − 低い音</strong>

例：
- 0 と 4 → 4 - 0 = <strong>4</strong>
- 0 と 7 → 7 - 0 = <strong>7</strong>
- 2 と 9 → 9 - 2 = <strong>7</strong>

距離は <strong>0〜11</strong> の12種類あります。
それぞれに特有の「響き」と「感情」があります。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: '距離一覧',
      content: `各距離の響きを覚えましょう。

| 距離 | 響き・感情 |
|-----|-----------|
| 0 | 同じ音、一体感 |
| 1 | 不協和、緊張、ホラー |
| 2 | やや緊張、隣り合う音 |
| 3 | <strong>暗い、切ない、マイナー感</strong> |
| 4 | <strong>明るい、メジャー感</strong> |
| 5 | 浮遊感、東洋的 |
| 6 | 不安定、緊張 |
| 7 | <strong>安定、力強い、パワフル</strong> |
| 8 | 神秘的、映画音楽 |
| 9 | 温かい、優しい |
| 10 | ブルージー、ジャズ |
| 11 | おしゃれ、都会的 |

<strong>特に重要なのは 3, 4, 7 です。</strong>`,
    },
    {
      id: 'step3',
      type: 'quiz',
      title: '確認クイズ：距離計算',
      content: '距離を計算してみましょう。',
      question: '4 と 11 の距離は？',
      options: ['5', '6', '7', '8'],
      correctIndex: 2,
      explanation: '11 - 4 = 7 なので、距離は7です。安定した響きがします。',
    },
    {
      id: 'step4',
      type: 'theory',
      title: '距離3と距離4',
      content: `音楽で最も重要な距離は <strong>3</strong> と <strong>4</strong> です。

<strong>距離3</strong>
- 暗い、悲しい、切ない
- マイナー感の源
- アニソンの「泣きメロ」に多用

<strong>距離4</strong>
- 明るい、楽しい、希望
- メジャー感の源
- サビの盛り上がりに多用

この <strong>1の違い</strong> で、曲の印象が180度変わります！

覚え方：
- 3 = <strong>暗</strong>い（3画）
- 4 = 明る<strong>い</strong>（4文字）`,
    },
    {
      id: 'step5',
      type: 'exercise',
      title: '実践：距離3を聴く',
      content: `距離3の響きを体験しましょう。

<strong>課題：0⁽⁴⁾ と 3⁽⁴⁾ を同時に鳴らす</strong>

キーボードトラックに：
- 0⁽⁴⁾ = MIDI 60
- 3⁽⁴⁾ = MIDI 63

を同じ拍に置いてください。

再生して「暗い・切ない」響きを確認しましょう。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 63, start: 0, duration: 1 },
      ],
      hints: [
        '60 と 63 の差は 3',
        'マイナー感の響きの元になる距離です',
      ],
    },
    {
      id: 'step6',
      type: 'exercise',
      title: '実践：距離4を聴く',
      content: `次は距離4の響きを体験しましょう。

<strong>課題：0⁽⁴⁾ と 4⁽⁴⁾ を同時に鳴らす</strong>

キーボードトラックに：
- 0⁽⁴⁾ = MIDI 60
- 4⁽⁴⁾ = MIDI 64

を同じ拍に置いてください。

先ほどの距離3と比べて「明るい」響きを確認しましょう。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 64, start: 0, duration: 1 },
      ],
      hints: [
        '60 と 64 の差は 4',
        'メジャー感の響きの元になる距離です',
        '距離3より1音高いだけで印象が変わります',
      ],
    },
    {
      id: 'step7',
      type: 'theory',
      title: '距離7',
      content: `<strong>距離7</strong>は最も安定した響きです。

特徴：
- 力強い、安定感
- パワーコード（ロック）の基本
- ほぼすべての和音に含まれる

0 と 7 が代表例です。

<strong>アニソンでの使い方：</strong>
- ギターのパワーコード
- ベースのオクターブ + 7
- サビの盛り上がりで多用

「基準音 + 距離7」だけでも十分かっこいい音になります！`,
    },
    {
      id: 'step8',
      type: 'quiz',
      title: '確認クイズ：響きの判定',
      content: '距離の響きを当てましょう。',
      question: '「切ない」「泣きメロ」に使われる距離は？',
      options: [
        '距離4',
        '距離3',
        '距離7',
        '距離2',
      ],
      correctIndex: 1,
      explanation: '距離3は暗く切ない響きで、アニソンの泣きメロに多用されます。',
    },
    {
      id: 'step9',
      type: 'quiz',
      title: '確認クイズ：距離識別',
      content: '計算と響きを組み合わせて考えましょう。',
      question: '5 と 9 の距離は？どんな響き？',
      options: [
        '距離3・暗い',
        '距離4・明るい',
        '距離5・浮遊感',
        '距離7・安定',
      ],
      correctIndex: 1,
      explanation: '9 - 5 = 4 なので距離4です。距離4は明るい響きがします。',
    },
    {
      id: 'step10',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>距離 = 2音の差</strong>
   - 高い音 − 低い音 で計算
   - 0〜11 の12種類

2. <strong>重要な距離</strong>
   - 距離3: 暗い、切ない → マイナー感
   - 距離4: 明るい → メジャー感
   - 距離7: 安定、力強い → パワフル

3. <strong>響きを覚える</strong>
   - 数字だけでなく「感情」で覚える
   - 実際に鳴らして耳で確認

<strong>次のレッスン：</strong>
和音の作り方を学びます。
距離を組み合わせて和音を作ります。`,
    },
  ],
}
