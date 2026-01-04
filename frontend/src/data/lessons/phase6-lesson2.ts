/**
 * Phase 6 - Lesson 6.2: コードボイシング
 *
 * 学ぶこと:
 * - ボイシングとは
 * - 転回形
 * - 滑らかな進行
 */
import { Lesson } from '../../types/lesson'

export const phase6Lesson2: Lesson = {
  id: 'phase6-lesson2',
  phaseId: 6,
  lessonNumber: 2,
  title: 'コードボイシング',
  description: 'コードの音の配置を工夫する',
  estimatedMinutes: 30,
  prerequisites: ['phase6-lesson1'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'ボイシングとは',
      content: `<strong>ボイシング</strong>はコードの音の配置のことです。

<strong>同じコードでも配置で響きが変わる。</strong>

<strong>例（0メジャー [0,4,7]）:</strong>

基本形: 0-4-7（低→高）
第1転回: 4-7-0（4が最低音）
第2転回: 7-0-4（7が最低音）

<strong>オクターブも変えられる:</strong>
0⁽⁴⁾-4⁽⁴⁾-7⁽⁴⁾
0⁽⁴⁾-4⁽⁵⁾-7⁽⁴⁾
など自由に配置できる。

<strong>ボイシングを工夫する理由:</strong>
- 滑らかな進行
- 響きの調整
- 声部の動きを小さく`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: '転回形',
      content: `<strong>転回形</strong>は最低音を変えたコードです。

<strong>0メジャー [0,4,7] の場合:</strong>

<strong>基本形:</strong>
0-4-7（ルートが最低音）
安定感がある

<strong>第1転回形:</strong>
4-7-0（3度が最低音）
軽やかな響き

<strong>第2転回形:</strong>
7-0-4（5度が最低音）
浮遊感がある

<strong>キーボードでは:</strong>
ベースがルートを弾くので、
キーボードは転回形を使いやすい。

<strong>例:</strong>
ベース: 0⁽²⁾
キーボード: 4⁽⁴⁾-7⁽⁴⁾-0⁽⁵⁾（第1転回）`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: '滑らかなボイシング',
      content: `コードが変わるとき、動きを最小限にします。

<strong>悪い例（0→5マイナー）:</strong>
0: [0⁽⁴⁾, 4⁽⁴⁾, 7⁽⁴⁾]
5m: [5⁽⁴⁾, 8⁽⁴⁾, 0⁽⁵⁾]
→ 全部の音が大きく動く

<strong>良い例（0→5マイナー）:</strong>
0: [0⁽⁴⁾, 4⁽⁴⁾, 7⁽⁴⁾]
5m: [0⁽⁴⁾, 5⁽⁴⁾, 8⁽⁴⁾]
→ 0は動かない、他は近い

<strong>コツ:</strong>
- 共通音を探す
- 最小限の動きで次へ
- 跳躍を避ける

<strong>効果:</strong>
滑らかで自然な進行になる。
「ボイスリーディング」とも呼ぶ。`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：滑らかな進行',
      content: `滑らかなボイシングを試しましょう。

<strong>課題：0→7→9→4の進行</strong>

キーボードトラックに：

<strong>0メジャー（0拍目）:</strong>
[7⁽⁴⁾, 0⁽⁵⁾, 4⁽⁵⁾]（MIDI 67, 72, 76）

<strong>7メジャー（4拍目）:</strong>
[7⁽⁴⁾, 11⁽⁴⁾, 2⁽⁵⁾]（MIDI 67, 71, 74）
→ 7は動かない

<strong>9マイナー（8拍目）:</strong>
[9⁽⁴⁾, 0⁽⁵⁾, 4⁽⁵⁾]（MIDI 69, 72, 76）
→ 0と4は近くへ

<strong>4メジャー（12拍目）:</strong>
[8⁽⁴⁾, 0⁽⁵⁾, 4⁽⁵⁾]（MIDI 68, 72, 76）
→ 0と4は動かない`,
      targetTrack: 'keyboard',
      hints: [
        '共通音を維持する',
        '動きは最小限に',
        'デュレーション4拍',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'オープンボイシング',
      content: `音を広く配置するテクニックです。

<strong>クローズボイシング（狭い）:</strong>
[0⁽⁴⁾, 4⁽⁴⁾, 7⁽⁴⁾]
→ 1オクターブ内に収まる

<strong>オープンボイシング（広い）:</strong>
[0⁽⁴⁾, 7⁽⁴⁾, 4⁽⁵⁾]
→ 音が離れている

<strong>効果:</strong>
- クローズ: 密集、力強い
- オープン: 開放的、広がる

<strong>使い分け:</strong>
- Aメロ: オープンで余裕
- サビ: クローズで密度

<strong>作り方:</strong>
真ん中の音を1オクターブ上げる
[0, 4, 7] → [0, 7, 4+12]`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: '音の重ね方',
      content: `何音重ねるかも重要です。

<strong>3音（トライアド）:</strong>
[0, 4, 7]
シンプル、クリア

<strong>4音（セブンス）:</strong>
[0, 4, 7, 11]
豊か、おしゃれ

<strong>5音以上:</strong>
テンション追加
複雑、ジャズ的

<strong>アニソンでは:</strong>
- 基本は3-4音
- サビで厚くする
- Aメロは少なめ

<strong>注意:</strong>
音が多すぎるとごちゃごちゃ。
ベースとメロディの間を埋める程度に。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：ボイシング',
      content: 'ボイシングの基本を確認しましょう。',
      question: '滑らかな進行のために重要なのは？',
      options: [
        '全ての音を大きく動かす',
        '共通音を維持し動きを最小限にする',
        '常に基本形を使う',
        'オクターブを揃える',
      ],
      correctIndex: 1,
      explanation: '滑らかな進行には共通音を維持し、各声部の動きを最小限にすることが重要です。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>ボイシング</strong>
   - コードの音の配置
   - 響きが変わる

2. <strong>転回形</strong>
   - 基本形、第1、第2転回
   - 最低音が変わる

3. <strong>滑らかな進行</strong>
   - 共通音を維持
   - 最小限の動き

4. <strong>オープン/クローズ</strong>
   - 広い配置と狭い配置

<strong>次のレッスン：</strong>
アルペジオを学びます。`,
    },
  ],
}
