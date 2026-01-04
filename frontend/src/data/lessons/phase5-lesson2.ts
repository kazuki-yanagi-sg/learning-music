/**
 * Phase 5 - Lesson 5.2: ルート弾き
 *
 * 学ぶこと:
 * - ルート弾きの基本
 * - リズムパターン
 * - コード進行への対応
 */
import { Lesson } from '../../types/lesson'

export const phase5Lesson2: Lesson = {
  id: 'phase5-lesson2',
  phaseId: 5,
  lessonNumber: 2,
  title: 'ルート弾き',
  description: 'コードの根音を弾く基本技法',
  estimatedMinutes: 25,
  prerequisites: ['phase5-lesson1'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'ルートとは',
      content: `<strong>ルート（Root）</strong>はコードの根音です。

<strong>例:</strong>
- 0のメジャーコード [0,4,7] → ルートは0
- 5のマイナーコード [5,8,0] → ルートは5
- 7のパワーコード [7,2] → ルートは7

<strong>ルート弾きとは:</strong>
コードのルート音だけを弾く奏法。
最もシンプルなベースライン。

<strong>特徴:</strong>
- 簡単で確実
- コードを明確にする
- 初心者におすすめ

<strong>プロでも使う:</strong>
シンプル is ベスト。
余計な動きは不要なことも。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'ルート弾きのリズム',
      content: `ルート弾きにもいくつかのリズムがあります。

<strong>1. 全音符（1小節1音）:</strong>
バラード、静かなパート
0拍目: ルート（長く伸ばす）

<strong>2. 2分音符（1小節2音）:</strong>
ミドルテンポ
0拍目、2拍目: ルート

<strong>3. 4分音符（1小節4音）:</strong>
アップテンポ
0, 1, 2, 3拍目: ルート

<strong>4. 8分音符（1小節8音）:</strong>
激しい曲
0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5: ルート

<strong>アニソンでは:</strong>
Aメロ: 2分または4分
サビ: 8分でドライブ`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'コード進行に合わせる',
      content: `コードが変わったらルートも変わります。

<strong>例: カノン進行</strong>
| 0 | 7 | 9 | 4 |
| 5 | 2 | 5 | 7 |

<strong>ベース（2分音符で）:</strong>
小節1: 0, 0
小節2: 7, 7
小節3: 9, 9
小節4: 4, 4
小節5: 5, 5
小節6: 2, 2
小節7: 5, 5
小節8: 7, 7

<strong>ポイント:</strong>
- コードと同時に変わる
- コードより先に変わらない
- 遅れても駄目

<strong>オクターブの選択:</strong>
基本はオクターブ2（MIDI 36-47）
低すぎず、太さも十分。`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：カノン進行のベース',
      content: `カノン進行にルート弾きを入れましょう。

<strong>課題：4小節のルート弾き</strong>

コード進行: 0 → 7 → 9 → 4

ベーストラックに（2分音符）：
- 0拍目: 0⁽²⁾（MIDI 36）
- 2拍目: 0⁽²⁾
- 4拍目: 7⁽¹⁾（MIDI 31）
- 6拍目: 7⁽¹⁾
- 8拍目: 9⁽¹⁾（MIDI 33）
- 10拍目: 9⁽¹⁾
- 12拍目: 4⁽²⁾（MIDI 40）
- 14拍目: 4⁽²⁾`,
      targetTrack: 'bass',
      hints: [
        '各コード2小節',
        '2分音符 = 2拍ごと',
        'オクターブ1-2で',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: '音の長さ（デュレーション）',
      content: `ベース音の長さで印象が変わります。

<strong>スタッカート（短い）:</strong>
- デュレーション: 0.25拍程度
- 「ブッブッブッブッ」
- タイトでファンキー
- EDM、ダンス系

<strong>テヌート（長い）:</strong>
- デュレーション: 0.9拍程度
- 「ブーンブーンブーン」
- 滑らかで重厚
- バラード、ロック

<strong>使い分け:</strong>
- 静かなパート: 長め
- 激しいパート: 短め
- サビ: 曲調による

<strong>基本は0.5拍程度:</strong>
中間の長さが扱いやすい。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'ベロシティの使い方',
      content: `ベースにもベロシティで強弱をつけます。

<strong>基本パターン:</strong>
- 1拍目: 100-110（強い）
- 2拍目: 80-90（弱め）
- 3拍目: 90-100（やや強い）
- 4拍目: 80-90（弱め）

<strong>8分音符の場合:</strong>
- 表拍: 90-100
- 裏拍: 70-80

<strong>効果:</strong>
強弱があるとグルーヴが出る。
全部同じだと機械的。

<strong>サビでは:</strong>
全体的にベロシティを上げる。
100-120でドライブ感を出す。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：ルート弾き',
      content: 'ルート弾きの基本を確認しましょう。',
      question: '「5のマイナーコード」のルートは？',
      options: [
        '0',
        '3',
        '5',
        '8',
      ],
      correctIndex: 2,
      explanation: 'コードのルートはコード名の数字そのものです。5のマイナーコードなら5がルートです。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>ルート弾き</strong>
   - コードの根音を弾く
   - 最もシンプルな奏法

2. <strong>リズムパターン</strong>
   - 全音符〜8分音符
   - 曲調に合わせる

3. <strong>コード対応</strong>
   - コード変化と同時に
   - オクターブ2が基本

4. <strong>表現</strong>
   - デュレーション
   - ベロシティ

<strong>次のレッスン：</strong>
オクターブ奏法を学びます。`,
    },
  ],
}
