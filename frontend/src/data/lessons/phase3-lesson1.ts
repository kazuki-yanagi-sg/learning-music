/**
 * Phase 3 - Lesson 3.1: メロディの基本
 *
 * 学ぶこと:
 * - メロディ = 単音の連なり
 * - 音域（レンジ）
 * - 順次進行と跳躍進行
 */
import { Lesson } from '../../types/lesson'

export const phase3Lesson1: Lesson = {
  id: 'phase3-lesson1',
  phaseId: 3,
  lessonNumber: 1,
  title: 'メロディの基本',
  description: '歌えるメロディの条件を理解する',
  estimatedMinutes: 25,
  prerequisites: ['phase2-lesson1'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'メロディとは',
      content: `<strong>メロディ</strong>とは、単音が時間順に並んだものです。

和音（同時に鳴る音）とは違い、メロディは1音ずつ順番に鳴ります。

<strong>メロディの要素:</strong>
- 音高（ピッチ）: どの高さの音か
- 音長（リズム）: どのくらいの長さか
- 順序: どの順番で並ぶか

<strong>良いメロディの条件:</strong>
- 歌いやすい（人間の声域に収まる）
- 覚えやすい（パターンがある）
- 感情を表現できる`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: '音域（レンジ）',
      content: `<strong>音域</strong>とは、メロディで使う音の範囲です。

<strong>人間の歌える音域の目安:</strong>
- 一般的な歌: 10〜12音（約1オクターブ）
- 上手な歌手: 15〜18音（1.5オクターブ）
- プロ: 20音以上（2オクターブ）

<strong>アニソンの傾向:</strong>
サビは高めの音域を使うことが多い。
Aメロは低め〜中音域で始まり、
サビで一気に高音域に上がる。

<strong>数字で表すと:</strong>
Aメロ: 0⁽⁴⁾ 〜 7⁽⁴⁾（MIDI 60〜67）
サビ: 5⁽⁴⁾ 〜 0⁽⁵⁾（MIDI 65〜72）

1オクターブ = 12音 が目安です。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: '順次進行',
      content: `<strong>順次進行</strong>とは、隣り合う音に移動することです。

距離で言うと: <strong>1 または 2</strong>

例（基準音 0 のメジャースケール）:
0 → 2 → 4 → 5 → 7（順次上行）
7 → 5 → 4 → 2 → 0（順次下行）

<strong>特徴:</strong>
- 滑らかで歌いやすい
- 穏やかな印象
- 歌詞が乗せやすい

<strong>アニソンでの使用:</strong>
- Aメロ、Bメロで多用
- 歌詞を伝えたい部分
- 落ち着いた雰囲気を出したい時`,
    },
    {
      id: 'step4',
      type: 'theory',
      title: '跳躍進行',
      content: `<strong>跳躍進行</strong>とは、離れた音に移動することです。

距離で言うと: <strong>3以上</strong>

例:
0 → 4（距離4の跳躍）
0 → 7（距離7の跳躍）
7 → 0⁽⁵⁾（距離5の跳躍、オクターブ上へ）

<strong>特徴:</strong>
- インパクトがある
- 感情的な表現
- 歌うのは難しい

<strong>アニソンでの使用:</strong>
- サビの冒頭で跳躍
- 感情が高ぶる部分
- 「ここぞ」という決めフレーズ

<strong>注意:</strong>
跳躍後は順次進行で「着地」すると自然。`,
    },
    {
      id: 'step5',
      type: 'quiz',
      title: '確認クイズ：進行の種類',
      content: '順次進行と跳躍進行を区別しましょう。',
      question: '0 → 2 → 4 → 7 の動きで、跳躍はどこ？',
      options: [
        '0 → 2',
        '2 → 4',
        '4 → 7',
        '跳躍はない',
      ],
      correctIndex: 2,
      explanation: '4 → 7 は距離3なので跳躍進行です。0 → 2、2 → 4 は距離2なので順次進行。',
    },
    {
      id: 'step6',
      type: 'exercise',
      title: '実践：順次進行のメロディ',
      content: `順次進行だけでメロディを作りましょう。

<strong>課題：0 → 2 → 4 → 5 → 4 → 2 → 0</strong>

キーボードトラックに、1拍ずつ：
- 0⁽⁴⁾ (60) → 2⁽⁴⁾ (62) → 4⁽⁴⁾ (64) → 5⁽⁴⁾ (65)
- → 4⁽⁴⁾ (64) → 2⁽⁴⁾ (62) → 0⁽⁴⁾ (60)

上がって下がる、山形のメロディです。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 62, start: 1, duration: 1 },
        { pitch: 64, start: 2, duration: 1 },
        { pitch: 65, start: 3, duration: 1 },
        { pitch: 64, start: 4, duration: 1 },
        { pitch: 62, start: 5, duration: 1 },
        { pitch: 60, start: 6, duration: 1 },
      ],
      hints: [
        'すべて距離1〜2の動き',
        '滑らかで歌いやすいメロディになります',
      ],
    },
    {
      id: 'step7',
      type: 'exercise',
      title: '実践：跳躍を含むメロディ',
      content: `跳躍を含むメロディを作りましょう。

<strong>課題：0 → 7 → 5 → 4 → 2 → 0</strong>

キーボードトラックに、1拍ずつ：
- 0⁽⁴⁾ (60) → 7⁽⁴⁾ (67)：距離7の跳躍！
- → 5⁽⁴⁾ (65) → 4⁽⁴⁾ (64) → 2⁽⁴⁾ (62) → 0⁽⁴⁾ (60)

跳躍後は順次進行で下がります。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 67, start: 1, duration: 1 },
        { pitch: 65, start: 2, duration: 1 },
        { pitch: 64, start: 3, duration: 1 },
        { pitch: 62, start: 4, duration: 1 },
        { pitch: 60, start: 5, duration: 1 },
      ],
      hints: [
        '最初の跳躍がインパクト',
        'その後は順次進行で「着地」',
      ],
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'メロディの方向性',
      content: `メロディには「上昇」「下降」「停滞」があります。

<strong>上昇:</strong>
- 盛り上がり、期待感
- サビに向かう部分で多用
- エネルギーが上がる感じ

<strong>下降:</strong>
- 落ち着き、解決感
- フレーズの終わりで多用
- 「着地」する感じ

<strong>停滞（同音反復）:</strong>
- 緊張感、強調
- ラップ的な表現
- 歌詞を際立たせる

<strong>基本パターン:</strong>
上昇 → 頂点 → 下降
これが自然な「フレーズ」になります。`,
    },
    {
      id: 'step9',
      type: 'quiz',
      title: '確認クイズ：メロディの設計',
      content: 'メロディの特徴を考えましょう。',
      question: 'サビの冒頭に適した動きは？',
      options: [
        '順次下降',
        '同音反復',
        '跳躍上昇',
        '半音の動き',
      ],
      correctIndex: 2,
      explanation: 'サビの冒頭は跳躍上昇が効果的。インパクトがあり、盛り上がりを演出できます。',
    },
    {
      id: 'step10',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>音域</strong>
   - 1オクターブ（12音）が基本
   - サビは高め、Aメロは低め

2. <strong>順次進行</strong>
   - 距離1〜2の動き
   - 滑らかで歌いやすい

3. <strong>跳躍進行</strong>
   - 距離3以上の動き
   - インパクト、感情表現
   - 跳躍後は順次進行で着地

4. <strong>方向性</strong>
   - 上昇 → 頂点 → 下降
   - 自然なフレーズの形

<strong>次のレッスン：</strong>
リズムとメロディの関係を学びます。`,
    },
  ],
}
