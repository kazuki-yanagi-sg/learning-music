/**
 * Phase 4 - Lesson 4.2: ドラムキット
 *
 * 学ぶこと:
 * - 各ドラムの役割
 * - 音色の特徴
 * - 打ち分け
 */
import { Lesson } from '../../types/lesson'

export const phase4Lesson2: Lesson = {
  id: 'phase4-lesson2',
  phaseId: 4,
  lessonNumber: 2,
  title: 'ドラムキット',
  description: '各楽器の役割と使い分け',
  estimatedMinutes: 25,
  prerequisites: ['phase4-lesson1'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'ドラムキットの構成',
      content: `ドラムキットは複数の打楽器で構成されています。

<strong>主要パーツ:</strong>

1. <strong>キック（バスドラム）</strong>
   - 低い「ドン」という音
   - リズムの土台

2. <strong>スネア</strong>
   - 「タン」「パン」という音
   - バックビートを担当

3. <strong>ハイハット</strong>
   - 金属的な「チッ」「シャン」
   - 細かいリズムを刻む

4. <strong>タム</strong>
   - フィルに使用
   - 高・中・低の3種類

5. <strong>シンバル</strong>
   - クラッシュ、ライド
   - アクセント、持続音`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'キック（バスドラム）',
      content: `<strong>キック</strong>はリズムの土台です。

<strong>特徴:</strong>
- 最も低い音
- 体に響く重低音
- 曲の「心臓」

<strong>打ち方:</strong>
- 1拍目: ほぼ必須
- 3拍目: 基本パターン
- それ以外: アクセント

<strong>ジャンル別の傾向:</strong>
- ロック: シンプルに1・3拍
- EDM: 4つ打ち（毎拍）
- ジャズ: 少なめ、自由

<strong>アニソンでは:</strong>
サビは4つ打ち傾向
Aメロはシンプルに1・3拍`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'スネア',
      content: `<strong>スネア</strong>はバックビートを担当します。

<strong>特徴:</strong>
- 「裏」にスナッピー（響き線）
- 「タン」「パン」という音
- 曲のアクセント

<strong>基本位置:</strong>
2拍目と4拍目（バックビート）

<strong>バリエーション:</strong>
- ゴーストノート: 弱く入れる
- フラム: 装飾音をつける
- リムショット: 強いアタック

<strong>アニソンでの使い分け:</strong>
- Aメロ: 控えめ、ゴースト多め
- サビ: しっかり、リムショット
- フィル: 連打`,
    },
    {
      id: 'step4',
      type: 'theory',
      title: 'ハイハット',
      content: `<strong>ハイハット</strong>は細かいリズムを刻みます。

<strong>2つの状態:</strong>
- クローズ（閉）: 短い「チッ」
- オープン（開）: 長い「シャーン」

<strong>基本パターン:</strong>
8分音符で刻む: チチチチチチチチ
16分音符: チチチチチチチチチチチチチチチチ

<strong>アクセント:</strong>
- 表拍を強く
- または裏拍を強く（シャッフル感）

<strong>オープンの使いどころ:</strong>
- フレーズの区切り
- 盛り上がりの合図
- 4拍目の裏 → 次の小節へ`,
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'タム',
      content: `<strong>タム</strong>はフィルで活躍します。

<strong>種類:</strong>
- ハイタム: 高い音
- ミッドタム: 中くらい
- ロータム（フロアタム）: 低い音

<strong>使いどころ:</strong>
- フィルイン
- セクション間の橋渡し
- メロディ的な動き

<strong>定番フィル:</strong>
ハイ → ミッド → ロー → キック
「タタタ、ドン！」

<strong>注意:</strong>
タムを使いすぎると落ち着かない。
ここぞという時に使う。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'シンバル',
      content: `<strong>シンバル</strong>はアクセントと持続音です。

<strong>クラッシュシンバル:</strong>
- 「ジャーン！」という派手な音
- セクションの頭
- サビの入り
- 1拍目に多い

<strong>ライドシンバル:</strong>
- 「チーン」という持続する音
- ハイハットの代わりに刻む
- ジャズでよく使う
- 落ち着いた雰囲気

<strong>使い分け:</strong>
- Aメロ: ハイハット中心
- Bメロ: ライド検討
- サビ: クラッシュで始める`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：ドラム配置',
      content: '各パーツの役割を確認しましょう。',
      question: 'バックビート（2・4拍目）を担当するのは？',
      options: [
        'キック',
        'スネア',
        'ハイハット',
        'タム',
      ],
      correctIndex: 1,
      explanation: 'スネアが2・4拍目（バックビート）を担当します。これがロック/ポップスの基本です。',
    },
    {
      id: 'step8',
      type: 'exercise',
      title: '実践：フルキットパターン',
      content: `キット全体を使ったパターンを作りましょう。

<strong>課題：1小節のフルパターン</strong>

ドラムトラックに：

<strong>クラッシュ（49）:</strong> 0拍目
<strong>ハイハット（42）:</strong> 0.5, 1, 1.5, 2, 2.5, 3, 3.5
<strong>キック（36）:</strong> 0, 2
<strong>スネア（38）:</strong> 1, 3

クラッシュで始まり、基本パターンが続きます。`,
      targetTrack: 'drum',
      hints: [
        'クラッシュは小節頭だけ',
        'ハイハットは8分で刻む（0拍目除く）',
        'キックとスネアは基本パターン',
      ],
    },
    {
      id: 'step9',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>キック</strong>
   - 土台、低音
   - 1・3拍が基本

2. <strong>スネア</strong>
   - バックビート
   - 2・4拍が基本

3. <strong>ハイハット</strong>
   - 細かいリズム
   - クローズ/オープン

4. <strong>タム</strong>
   - フィル用
   - 高→低が定番

5. <strong>シンバル</strong>
   - アクセント
   - セクション頭

<strong>次のレッスン：</strong>
フィルインを学びます。`,
    },
  ],
}
