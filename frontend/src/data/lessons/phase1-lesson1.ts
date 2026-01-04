/**
 * Phase 1 - Lesson 1.1: 音は数字だ
 *
 * 学ぶこと:
 * - 12音の世界（0-11, mod 12）
 * - オクターブの概念（12足すと1オクターブ上）
 * - MIDIノートナンバー
 */
import { Lesson } from '../../types/lesson'

export const phase1Lesson1: Lesson = {
  id: 'phase1-lesson1',
  phaseId: 1,
  lessonNumber: 1,
  title: '音は数字だ',
  description: '12音の世界とMIDIノートナンバーを理解する',
  estimatedMinutes: 20,
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: '12音の世界',
      content: `音楽の世界では、すべての音は <strong>12種類</strong> しかありません。

これを数字で表すと：
<strong>0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11</strong>

| 数字 | 鍵盤の位置 |
|-----|----------|
| 0 | 白鍵（基準） |
| 1 | 黒鍵 |
| 2 | 白鍵 |
| 3 | 黒鍵 |
| 4 | 白鍵 |
| 5 | 白鍵 |
| 6 | 黒鍵 |
| 7 | 白鍵 |
| 8 | 黒鍵 |
| 9 | 白鍵 |
| 10 | 黒鍵 |
| 11 | 白鍵 |

この12音が延々と繰り返されます。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'mod 12 の考え方',
      content: `12音は <strong>時計</strong> のように循環します。

11 の次は 0 に戻ります。

これを数学では「mod 12」（12で割った余り）と言います。

例：
- 12 mod 12 = 0
- 13 mod 12 = 1
- 14 mod 12 = 2
- 24 mod 12 = 0（2周目）

<strong>どんな大きな数字でも、12で割った余りで音の種類がわかります。</strong>

これがこのアプリの基本的な考え方です。`,
    },
    {
      id: 'step3',
      type: 'quiz',
      title: '確認クイズ：mod 12',
      content: '12で割った余りを考えましょう。',
      question: '15 mod 12 は何？',
      options: ['0', '1', '2', '3'],
      correctIndex: 3,
      explanation: '15 ÷ 12 = 1 余り 3 なので、15 mod 12 = 3 です。',
    },
    {
      id: 'step4',
      type: 'theory',
      title: 'オクターブ',
      content: `同じ種類の音でも、高さが違う音があります。

例えば「0」の音にも：
- 低い 0
- 中くらいの 0
- 高い 0

があります。この「高さの違い」を <strong>オクターブ</strong> と呼びます。

<strong>12音上がると、1オクターブ上</strong>の同じ音になります。

このアプリでは <strong>n⁽ᵏ⁾</strong> と表記します：
- n = 音の種類（0〜11）
- k = オクターブ番号

例：
- 0⁽⁴⁾ = オクターブ4の音0
- 0⁽⁵⁾ = オクターブ5の音0（1オクターブ上）
- 7⁽⁴⁾ = オクターブ4の音7`,
    },
    {
      id: 'step5',
      type: 'quiz',
      title: '確認クイズ：オクターブ',
      content: 'オクターブの関係を確認しましょう。',
      question: '0⁽⁴⁾ と 0⁽⁵⁾ の関係は？',
      options: [
        '全く違う音',
        '同じ種類で1オクターブ違い',
        '同じ種類で2オクターブ違い',
        '1音違い',
      ],
      correctIndex: 1,
      explanation: '両方とも音の種類は0です。オクターブ番号が4と5で、1オクターブ違いです。',
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'MIDIノートナンバー',
      content: `コンピュータ音楽では <strong>MIDIノートナンバー</strong> という番号で音を表します。

0〜127 の数字で、すべての音を表現できます。

<strong>計算式：</strong>
MIDI = 12 × (k + 1) + n

つまり n⁽ᵏ⁾ の場合：
- 0⁽⁴⁾ = 12 × 5 + 0 = 60
- 4⁽⁴⁾ = 12 × 5 + 4 = 64
- 7⁽⁴⁾ = 12 × 5 + 7 = 67
- 0⁽⁵⁾ = 12 × 6 + 0 = 72

<strong>逆算：</strong>
- n = MIDI mod 12
- k = (MIDI ÷ 12) - 1

例：MIDI 64 の場合
- n = 64 mod 12 = 4
- k = 64 ÷ 12 - 1 = 5 - 1 = 4
- よって 4⁽⁴⁾`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：MIDIノート',
      content: 'MIDIノートナンバーを計算しましょう。',
      question: 'MIDIノートナンバー 67 は何？',
      options: ['5⁽⁴⁾', '6⁽⁴⁾', '7⁽⁴⁾', '8⁽⁴⁾'],
      correctIndex: 2,
      explanation: '67 mod 12 = 7、67 ÷ 12 - 1 = 4 なので 7⁽⁴⁾ です。',
    },
    {
      id: 'step8',
      type: 'exercise',
      title: '実践：音を数字で入力',
      content: `では実際に、指定された音をピアノロールに入力してみましょう。

<strong>課題：キーボードトラックに 0, 4, 7 を同時に入力</strong>

これらを同じオクターブ（k=4）で置くと：
- 0⁽⁴⁾ = MIDI 60
- 4⁽⁴⁾ = MIDI 64
- 7⁽⁴⁾ = MIDI 67

これは「0を基準とした和音」です。
同じ拍に3つの音を置いてみてください。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 64, start: 0, duration: 1 },
        { pitch: 67, start: 0, duration: 1 },
      ],
      hints: [
        'キーボードトラックを選択してください',
        'ピアノロールの左側で 0⁽⁴⁾, 4⁽⁴⁾, 7⁽⁴⁾ を探してください',
        '同じ列（同じ拍）に3つのノートを置きます',
      ],
    },
    {
      id: 'step9',
      type: 'quiz',
      title: '最終確認',
      content: 'このレッスンの総まとめです。',
      question: '次のうち、正しい説明はどれ？',
      options: [
        '音は無限に種類がある',
        '0⁽⁵⁾ は 0⁽⁴⁾ の1オクターブ上',
        'オクターブは6音ごとに変わる',
        'mod 12 は12を掛け算すること',
      ],
      correctIndex: 1,
      explanation: '0⁽⁵⁾ と 0⁽⁴⁾ は同じ種類（0）で、オクターブ番号が1つ違います。',
    },
    {
      id: 'step10',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>12音の世界</strong>
   - すべての音は 0〜11 の12種類
   - mod 12（12で割った余り）で音の種類がわかる

2. <strong>オクターブと表記</strong>
   - 12音上がると1オクターブ上
   - n⁽ᵏ⁾ = 音の種類n、オクターブk

3. <strong>MIDIノートナンバー</strong>
   - MIDI = 12 × (k + 1) + n
   - 0⁽⁴⁾ = 60 が基準点

<strong>次のレッスン：</strong>
2つの音の距離を学びます。`,
    },
  ],
}
