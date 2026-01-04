/**
 * Phase 2 - Lesson 2.3: ダイアトニックコード
 *
 * 学ぶこと:
 * - スケールから和音を作る
 * - ダイアトニックコードの構造
 * - 各和音の役割（トニック、ドミナント、サブドミナント）
 */
import { Lesson } from '../../types/lesson'

export const phase2Lesson3: Lesson = {
  id: 'phase2-lesson3',
  phaseId: 2,
  lessonNumber: 3,
  title: 'ダイアトニックコード',
  description: 'スケールから自然に生まれる7つの和音',
  estimatedMinutes: 30,
  prerequisites: ['phase2-lesson1', 'phase1-lesson3'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'ダイアトニックコードとは',
      content: `<strong>ダイアトニックコード</strong>とは、スケールの音だけで作る和音です。

メジャースケール [0, 2, 4, 5, 7, 9, 11] の各音を基準として、
スケール内の音で和音を作ります。

<strong>ルール:</strong>
- 基準音から1つ飛ばしで音を重ねる
- スケール内の音だけを使う

例：0 を基準にする場合
- 0（1番目）
- 4（3番目 = 1つ飛ばし）
- 7（5番目 = さらに1つ飛ばし）
→ [0, 4, 7] = メジャー和音

これをスケールの7音すべてで行います。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'メジャースケールの7つの和音',
      content: `基準音 0 のメジャースケールで作れる和音：

| 番号 | 基準 | 構成音 | 距離 | 種類 |
|-----|-----|--------|------|------|
| I | 0 | [0, 4, 7] | [0, 4, 7] | メジャー |
| II | 2 | [2, 5, 9] | [0, 3, 7] | マイナー |
| III | 4 | [4, 7, 11] | [0, 3, 7] | マイナー |
| IV | 5 | [5, 9, 0] | [0, 4, 7] | メジャー |
| V | 7 | [7, 11, 2] | [0, 4, 7] | メジャー |
| VI | 9 | [9, 0, 4] | [0, 3, 7] | マイナー |
| VII | 11 | [11, 2, 5] | [0, 3, 6] | ディミニッシュ |

<strong>パターン:</strong>
メジャー - マイナー - マイナー - メジャー - メジャー - マイナー - ディミニッシュ`,
    },
    {
      id: 'step3',
      type: 'quiz',
      title: '確認クイズ：ダイアトニック',
      content: '和音の種類を確認しましょう。',
      question: '基準音 0 のメジャースケールで、基準音 2 から作る和音は？',
      options: [
        'メジャー',
        'マイナー',
        'ディミニッシュ',
        'パワー',
      ],
      correctIndex: 1,
      explanation: '基準音 2 の和音は [2, 5, 9]。距離は [0, 3, 7] なのでマイナーです。',
    },
    {
      id: 'step4',
      type: 'theory',
      title: '和音の機能：3つの役割',
      content: `ダイアトニックコードには3つの「機能」があります。

<strong>1. トニック（T）- 安定</strong>
I, III, VI
→ 曲の始まりや終わりに使う
→ 「家」のような安心感

<strong>2. サブドミナント（SD）- やや不安定</strong>
II, IV
→ 曲を展開させる
→ 「旅に出る」感じ

<strong>3. ドミナント（D）- 不安定</strong>
V, VII
→ トニックに戻りたくなる緊張感
→ 「家に帰りたい」感じ

<strong>基本の流れ:</strong>
T → SD → D → T
（安定 → 展開 → 緊張 → 解決）`,
    },
    {
      id: 'step5',
      type: 'exercise',
      title: '実践：I の和音',
      content: `ダイアトニックコードの I（トニック）を作りましょう。

<strong>課題：[0, 4, 7] を同時に鳴らす</strong>

キーボードトラックに：
- 0⁽⁴⁾ = MIDI 60
- 4⁽⁴⁾ = MIDI 64
- 7⁽⁴⁾ = MIDI 67

を1拍目に置いてください。

これが「トニック」= 安定した響きです。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 64, start: 0, duration: 1 },
        { pitch: 67, start: 0, duration: 1 },
      ],
      hints: [
        'I = 1番目 = メジャー和音',
        '曲の始まりと終わりに最適',
      ],
    },
    {
      id: 'step6',
      type: 'exercise',
      title: '実践：V の和音',
      content: `ダイアトニックコードの V（ドミナント）を作りましょう。

<strong>課題：[7, 11, 2] を同時に鳴らす</strong>

キーボードトラックに：
- 7⁽⁴⁾ = MIDI 67
- 11⁽⁴⁾ = MIDI 71
- 2⁽⁵⁾ = MIDI 74（オクターブ上の2）

を2拍目に置いてください。

これが「ドミナント」= 緊張した響きです。
I に戻りたくなる感覚を確認してください。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 67, start: 1, duration: 1 },
        { pitch: 71, start: 1, duration: 1 },
        { pitch: 74, start: 1, duration: 1 },
      ],
      hints: [
        'V = 5番目 = メジャー和音',
        'I の前に置くと「解決感」が生まれる',
      ],
    },
    {
      id: 'step7',
      type: 'theory',
      title: 'ローマ数字表記',
      content: `和音を表すのにローマ数字を使います。

<strong>大文字 = メジャー</strong>
I, IV, V

<strong>小文字 = マイナー</strong>
ii, iii, vi

<strong>° = ディミニッシュ</strong>
vii°

<strong>基準音 0 のダイアトニックコード:</strong>
I - ii - iii - IV - V - vi - vii°

<strong>移調した場合（例：基準音 5）:</strong>
5 - 7 - 9 - 10 - 0 - 2 - 4
の位置にそれぞれの和音ができます。

ローマ数字は相対的な位置を表すので、
移調しても同じ番号で呼べます。`,
    },
    {
      id: 'step8',
      type: 'quiz',
      title: '確認クイズ：機能',
      content: '和音の機能を確認しましょう。',
      question: 'トニック機能を持つ和音は？（複数あり）',
      options: [
        'I, II, III',
        'I, III, VI',
        'I, IV, V',
        'I, V, VII',
      ],
      correctIndex: 1,
      explanation: 'トニック機能は I, III, VI（iii, vi）です。安定した響きを持ちます。',
    },
    {
      id: 'step9',
      type: 'theory',
      title: 'マイナースケールのダイアトニック',
      content: `マイナースケールにもダイアトニックコードがあります。

基準音 0 のナチュラルマイナー [0, 2, 3, 5, 7, 8, 10]：

| 番号 | 基準 | 種類 |
|-----|-----|------|
| i | 0 | マイナー |
| ii° | 2 | ディミニッシュ |
| III | 3 | メジャー |
| iv | 5 | マイナー |
| v | 7 | マイナー |
| VI | 8 | メジャー |
| VII | 10 | メジャー |

<strong>パターン:</strong>
マイナー - ディミニッシュ - メジャー - マイナー - マイナー - メジャー - メジャー

メジャースケールとは逆のパターンになります。`,
    },
    {
      id: 'step10',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>ダイアトニックコード</strong>
   - スケールの音だけで作る和音
   - 7つの和音が自動的に決まる

2. <strong>メジャースケールの場合</strong>
   - I, IV, V = メジャー
   - ii, iii, vi = マイナー
   - vii° = ディミニッシュ

3. <strong>3つの機能</strong>
   - トニック（I, iii, vi）: 安定
   - サブドミナント（ii, IV）: 展開
   - ドミナント（V, vii°）: 緊張

<strong>次のレッスン：</strong>
コード進行の基礎を学びます。
定番パターンを使って曲を作ります。`,
    },
  ],
}
