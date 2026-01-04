/**
 * Phase 7 - Lesson 7.1: ギターの役割
 *
 * 学ぶこと:
 * - ギターパートとは
 * - エレキとアコギ
 * - 音域と特徴
 */
import { Lesson } from '../../types/lesson'

export const phase7Lesson1: Lesson = {
  id: 'phase7-lesson1',
  phaseId: 7,
  lessonNumber: 1,
  title: 'ギターの役割',
  description: 'ロックサウンドの主役',
  estimatedMinutes: 20,
  prerequisites: ['phase6-lesson4'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'ギターパートとは',
      content: `<strong>ギター</strong>はロック/ポップスの主役楽器です。

<strong>種類:</strong>
- エレキギター: ロック、メタル
- アコースティックギター: バラード、フォーク
- クリーンギター: おしゃれ系

<strong>アニソンでは:</strong>
エレキギターが主流。
歪んだ（ひずんだ）音が特徴的。

<strong>役割:</strong>
- コードを刻む（バッキング）
- リフを弾く
- ソロを弾く
- 雰囲気を作る`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'エレキギターの音色',
      content: `エレキギターには様々な音色があります。

<strong>クリーン:</strong>
- 歪みなし
- 澄んだ音
- バラード、Aメロ

<strong>クランチ:</strong>
- 軽い歪み
- 温かい音
- ポップス向き

<strong>ディストーション:</strong>
- 強い歪み
- 攻撃的
- ロック、サビ

<strong>ハイゲイン:</strong>
- 超強い歪み
- メタル
- 激しい曲

<strong>アニソンでは:</strong>
クランチ〜ディストーションが多い。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'ギターの音域',
      content: `ギターは中音域を担当します。

<strong>標準的な音域:</strong>
- 最低音: 4⁽²⁾（MIDI 40、6弦開放）
- 最高音: 0⁽⁵⁾（MIDI 72）程度

<strong>よく使う音域:</strong>
- オクターブ2-3: パワーコード
- オクターブ3-4: バッキング
- オクターブ4-5: リード、ソロ

<strong>このアプリのギタートラック:</strong>
MIDI 40-72 を表示

<strong>キーボードとの違い:</strong>
ギターの方がやや低め。
パワーコードは低音域で弾く。`,
    },
    {
      id: 'step4',
      type: 'theory',
      title: 'ギター特有の奏法',
      content: `ギターには独特の奏法があります。

<strong>ストローク:</strong>
弦を一気にかき鳴らす。
コードをジャカジャカ弾く。

<strong>アルペジオ:</strong>
弦を1本ずつ弾く。
繊細な表現。

<strong>ミュート:</strong>
音を短く切る。
「チャカチャカ」という音。

<strong>パームミュート:</strong>
手のひらで弦を抑える。
「ズンズン」という音。

<strong>アニソンでは:</strong>
ストロークとパームミュートが多い。`,
    },
    {
      id: 'step5',
      type: 'quiz',
      title: '確認クイズ：ギターの役割',
      content: 'ギターの基本を確認しましょう。',
      question: 'アニソンで最もよく使われるギターの音色は？',
      options: [
        'クリーン',
        'クランチ〜ディストーション',
        'アコースティック',
        'ハイゲイン',
      ],
      correctIndex: 1,
      explanation: 'アニソンではクランチからディストーション程度の歪みが多く使われます。',
    },
    {
      id: 'step6',
      type: 'exercise',
      title: '実践：ギターを置いてみよう',
      content: `簡単なギターコードを打ち込みましょう。

<strong>課題：パワーコード（0のコード）</strong>

ギタートラックに：

<strong>パワーコード [0, 7]（距離7）:</strong>
0拍目: [0⁽³⁾, 7⁽³⁾]（MIDI 48, 55）
2拍目: [0⁽³⁾, 7⁽³⁾]

デュレーション: 1.5拍程度

<strong>パワーコードとは:</strong>
ルートと5度だけのコード。
ロックの基本。次のレッスンで詳しく。`,
      targetTrack: 'guitar',
      hints: [
        '2音同時に置く',
        'オクターブ3で',
        '1・3拍目に',
      ],
    },
    {
      id: 'step7',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>ギターの役割</strong>
   - バッキング
   - リフ、ソロ

2. <strong>音色</strong>
   - クリーン〜ディストーション
   - アニソンはクランチ多め

3. <strong>音域</strong>
   - オクターブ2-4
   - 中音域担当

4. <strong>奏法</strong>
   - ストローク
   - パームミュート

<strong>次のレッスン：</strong>
パワーコードを学びます。`,
    },
  ],
}
