/**
 * Phase 5 - Lesson 5.3: オクターブ奏法
 *
 * 学ぶこと:
 * - オクターブの概念
 * - オクターブ奏法の効果
 * - 実践パターン
 */
import { Lesson } from '../../types/lesson'

export const phase5Lesson3: Lesson = {
  id: 'phase5-lesson3',
  phaseId: 5,
  lessonNumber: 3,
  title: 'オクターブ奏法',
  description: '同じ音を1オクターブ上下で弾く技法',
  estimatedMinutes: 25,
  prerequisites: ['phase5-lesson2'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'オクターブとは',
      content: `<strong>オクターブ</strong>とは距離12のことです。

<strong>例:</strong>
0⁽²⁾（MIDI 36）と 0⁽³⁾（MIDI 48）
→ 同じ「0」だがオクターブ違い

<strong>オクターブの特徴:</strong>
- 距離12 = 周波数が2倍
- 同じ音に聞こえる（高さが違う）
- 最も協和する音程

<strong>計算:</strong>
同じ音の1オクターブ上 = +12
同じ音の1オクターブ下 = -12

<strong>ベースでの活用:</strong>
低いルートと高いルートを
交互に弾くと動きが出る。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'オクターブ奏法',
      content: `<strong>オクターブ奏法</strong>は同じ音を
オクターブ違いで弾く技法です。

<strong>基本パターン:</strong>
0拍目: 低いルート（オクターブ2）
1拍目: 高いルート（オクターブ3）
2拍目: 低いルート
3拍目: 高いルート

<strong>効果:</strong>
- 動きが出る
- エネルギッシュ
- 単調さを防ぐ

<strong>使いどころ:</strong>
- サビ
- 盛り上がりパート
- ダンス系の曲

<strong>アニソンでは:</strong>
サビでよく使われる。
王道のベースパターン。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: '8分オクターブ',
      content: `8分音符でオクターブを刻むパターンです。

<strong>パターン:</strong>
| 低 | 高 | 低 | 高 | 低 | 高 | 低 | 高 |
0   0.5  1   1.5  2   2.5  3   3.5

<strong>例（ルート0）:</strong>
0拍目: 0⁽²⁾（MIDI 36）
0.5拍目: 0⁽³⁾（MIDI 48）
1拍目: 0⁽²⁾
1.5拍目: 0⁽³⁾
...以下繰り返し

<strong>ドライブ感:</strong>
8分オクターブは推進力抜群。
曲を前に進める感じ。

<strong>注意:</strong>
低い音と高い音の
ベロシティを揃える。`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：オクターブ奏法',
      content: `オクターブ奏法を打ち込みましょう。

<strong>課題：8分オクターブ（2小節）</strong>

ルートは0。

ベーストラックに：
- 0拍目: 0⁽²⁾（MIDI 36）
- 0.5拍目: 0⁽³⁾（MIDI 48）
- 1拍目: 0⁽²⁾
- 1.5拍目: 0⁽³⁾
- 2拍目: 0⁽²⁾
- 2.5拍目: 0⁽³⁾
- 3拍目: 0⁽²⁾
- 3.5拍目: 0⁽³⁾
（2小節目も同様）`,
      targetTrack: 'bass',
      hints: [
        '低い音 = MIDI 36',
        '高い音 = MIDI 48',
        '交互に8分で刻む',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'バリエーション',
      content: `オクターブ奏法のバリエーションです。

<strong>1. 低-低-高パターン:</strong>
| 低 | 低 | 高 | 休 |
0    1    2    3

落ち着いた感じ。

<strong>2. 低-高-高パターン:</strong>
| 低 | 高 | 高 | 休 |
0    1    2    3

軽やかな感じ。

<strong>3. シンコペーション:</strong>
| 低 | 休 | 高 | 低 |
0    1    2    3

ファンキーな感じ。

<strong>4. ダブルオクターブ:</strong>
低音と高音を同時に鳴らす。
太い音になる（上級テクニック）。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'コード変化への対応',
      content: `コードが変わったらオクターブも変える。

<strong>例: 0 → 5 の進行</strong>

<strong>1-2小節目（0のコード）:</strong>
低: 0⁽²⁾（MIDI 36）
高: 0⁽³⁾（MIDI 48）

<strong>3-4小節目（5のコード）:</strong>
低: 5⁽¹⁾（MIDI 29）
高: 5⁽²⁾（MIDI 41）

<strong>ポイント:</strong>
- コードと同時にルートを変える
- 低いオクターブは1か2
- 高いオクターブは2か3

<strong>音域が変わりすぎる場合:</strong>
5⁽²⁾（MIDI 41）と5⁽³⁾（MIDI 53）
のように調整する。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：オクターブ',
      content: 'オクターブの計算を確認しましょう。',
      question: '0⁽²⁾（MIDI 36）の1オクターブ上は？',
      options: [
        '0⁽¹⁾（MIDI 24）',
        '0⁽³⁾（MIDI 48）',
        '7⁽²⁾（MIDI 43）',
        '12⁽²⁾（MIDI 48）',
      ],
      correctIndex: 1,
      explanation: '1オクターブ上は+12。MIDI 36 + 12 = MIDI 48 = 0⁽³⁾です。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>オクターブ</strong>
   - 距離12
   - 同じ音、高さ違い

2. <strong>オクターブ奏法</strong>
   - 低と高を交互に
   - 動きとエネルギー

3. <strong>8分オクターブ</strong>
   - サビの定番
   - ドライブ感

4. <strong>バリエーション</strong>
   - 低-低-高
   - シンコペーション

<strong>次のレッスン：</strong>
ベースラインパターンを学びます。`,
    },
  ],
}
