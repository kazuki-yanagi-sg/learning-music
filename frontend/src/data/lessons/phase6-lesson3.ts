/**
 * Phase 6 - Lesson 6.3: アルペジオ
 *
 * 学ぶこと:
 * - アルペジオとは
 * - 基本パターン
 * - 応用パターン
 */
import { Lesson } from '../../types/lesson'

export const phase6Lesson3: Lesson = {
  id: 'phase6-lesson3',
  phaseId: 6,
  lessonNumber: 3,
  title: 'アルペジオ',
  description: 'コードを分散して弾く技法',
  estimatedMinutes: 25,
  prerequisites: ['phase6-lesson2'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'アルペジオとは',
      content: `<strong>アルペジオ</strong>はコードの音を
順番に1つずつ弾く技法です。

<strong>和音との違い:</strong>
和音: 全部同時に鳴らす
アルペジオ: 順番に1つずつ

<strong>例（0メジャー）:</strong>
和音: [0, 4, 7] を同時に
アルペジオ: 0 → 4 → 7 と順番に

<strong>効果:</strong>
- 動きが出る
- 優雅な響き
- 単調さを防ぐ

<strong>使いどころ:</strong>
- バラード
- イントロ
- 静かなパート`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: '基本パターン：上昇',
      content: `最も基本的なアルペジオは<strong>上昇パターン</strong>です。

<strong>3音上昇（8分音符）:</strong>
0拍目: 0（ルート）
0.5拍目: 4（3度）
1拍目: 7（5度）
1.5拍目: 休み
（繰り返し）

<strong>4音上昇（16分音符）:</strong>
0拍目: 0
0.25拍目: 4
0.5拍目: 7
0.75拍目: 0（オクターブ上）
（繰り返し）

<strong>特徴:</strong>
- 明るい印象
- 期待感を高める
- 盛り上がりに向かう`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: '基本パターン：下降',
      content: `<strong>下降パターン</strong>は上から始まります。

<strong>3音下降（8分音符）:</strong>
0拍目: 7（5度）
0.5拍目: 4（3度）
1拍目: 0（ルート）
1.5拍目: 休み

<strong>特徴:</strong>
- 落ち着いた印象
- 解決感
- 終わりに向かう

<strong>使い分け:</strong>
- 上昇: 盛り上げ、サビ前
- 下降: 落ち着き、Aメロ

<strong>組み合わせ:</strong>
上昇→下降 を繰り返すと
波のような動きになる。`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：上昇アルペジオ',
      content: `上昇アルペジオを打ち込みましょう。

<strong>課題：0メジャーの上昇アルペジオ（1小節）</strong>

キーボードトラックに：

<strong>1回目:</strong>
0拍目: 0⁽⁴⁾（MIDI 60）
0.5拍目: 4⁽⁴⁾（MIDI 64）
1拍目: 7⁽⁴⁾（MIDI 67）

<strong>2回目:</strong>
2拍目: 0⁽⁴⁾
2.5拍目: 4⁽⁴⁾
3拍目: 7⁽⁴⁾

※デュレーションは0.5拍程度`,
      targetTrack: 'keyboard',
      hints: [
        '低い音から高い音へ',
        '8分音符間隔',
        '1小節で2回繰り返し',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: '応用パターン',
      content: `アルペジオのバリエーションです。

<strong>1. 交互パターン:</strong>
0 → 7 → 4 → 7 → 0 → 7 → 4 → 7
低音と高音を行き来

<strong>2. オクターブ追加:</strong>
0 → 4 → 7 → 0⁽+1⁾ → 7 → 4 → 0
オクターブ上を含める

<strong>3. ベースノート固定:</strong>
0 → 0+4 → 0+7 → 0+4
ルートを常に鳴らしながら

<strong>4. シンコペーション:</strong>
休 → 0 → 4 → 7
裏拍から始める

<strong>アニソンでは:</strong>
パターン1と2がよく使われる。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'コード進行でのアルペジオ',
      content: `コードが変わってもアルペジオは続きます。

<strong>例: 0 → 5m の進行</strong>

<strong>0メジャー（小節1）:</strong>
0 → 4 → 7 → 4 | 0 → 4 → 7 → 4

<strong>5マイナー（小節2）:</strong>
5 → 8 → 0 → 8 | 5 → 8 → 0 → 8

<strong>ポイント:</strong>
- パターンは維持
- コードの構成音だけ変わる
- 一貫性が大事

<strong>滑らかにつなぐコツ:</strong>
小節の最後と次の最初を
近い音にする。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：アルペジオ',
      content: 'アルペジオの基本を確認しましょう。',
      question: '「アルペジオ」とは何か？',
      options: [
        'コードを全部同時に鳴らす',
        'コードの音を順番に1つずつ弾く',
        'スケールを弾く',
        'オクターブで弾く',
      ],
      correctIndex: 1,
      explanation: 'アルペジオはコードの構成音を同時ではなく順番に1つずつ弾く技法です。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>アルペジオ</strong>
   - 順番に弾く
   - 動きと優雅さ

2. <strong>上昇パターン</strong>
   - 低→高
   - 盛り上げ

3. <strong>下降パターン</strong>
   - 高→低
   - 落ち着き

4. <strong>応用</strong>
   - 交互、オクターブ
   - シンコペーション

<strong>次のレッスン：</strong>
キーボードの実践パターンを学びます。`,
    },
  ],
}
