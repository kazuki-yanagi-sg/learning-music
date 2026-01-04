/**
 * Phase 4 - Lesson 4.3: フィルイン
 *
 * 学ぶこと:
 * - フィルインの役割
 * - 定番パターン
 * - 配置のタイミング
 */
import { Lesson } from '../../types/lesson'

export const phase4Lesson3: Lesson = {
  id: 'phase4-lesson3',
  phaseId: 4,
  lessonNumber: 3,
  title: 'フィルイン',
  description: 'セクション間をつなぐドラムフレーズ',
  estimatedMinutes: 25,
  prerequisites: ['phase4-lesson2'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'フィルインとは',
      content: `<strong>フィルイン</strong>は基本パターンを崩すフレーズです。

<strong>役割:</strong>
- セクション間の橋渡し
- 次の展開を予告
- 単調さを防ぐ
- 盛り上がりを演出

<strong>配置場所:</strong>
- 4小節目の最後
- 8小節目の最後
- セクションの変わり目

<strong>長さ:</strong>
- 1拍: 短いアクセント
- 2拍: 標準的
- 1小節: 派手なフィル

<strong>ポイント:</strong>
フィルは「つなぎ」であって「主役」ではない。
やりすぎは禁物。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: '定番フィル：タム回し',
      content: `最も基本的なフィルが<strong>タム回し</strong>です。

<strong>パターン:</strong>
ハイタム → ミッドタム → ロータム → キック

<strong>タイミング:</strong>
4拍目から始まる場合:
3.5: ハイ
3.75: ミッド
4.0: ロー
次の1拍目: キック + クラッシュ

<strong>バリエーション:</strong>
- 2回ずつ: タタ・タタ・タタ・ドン
- 加速: タ・タタ・タタタ・ドン
- シンプル: タ・タ・タ・ドン

<strong>効果:</strong>
音が高→低に移動することで
「落ちていく」感覚 → 次のセクションへ`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: '定番フィル：スネア連打',
      content: `<strong>スネア連打</strong>は盛り上げに最適です。

<strong>パターン:</strong>
16分音符でスネアを連打
タタタタタタタタ...

<strong>使いどころ:</strong>
- サビ前の盛り上げ
- クライマックス
- 「ここぞ」の瞬間

<strong>バリエーション:</strong>
- ロール: 高速連打
- アクセント付き: 強弱をつける
- クレッシェンド: だんだん強く

<strong>注意:</strong>
長すぎると間延びする。
2拍程度が効果的。`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：タム回しフィル',
      content: `タム回しフィルを作りましょう。

<strong>課題：4拍目でタム回し</strong>

3拍目までは基本パターン、
4拍目でフィル。

ドラムトラックに：
- 0拍目: キック
- 1拍目: スネア
- 2拍目: キック
- 3拍目: スネア（途中まで）
- 3.5拍目: ハイタム（50）
- 3.75拍目: ミッドタム（47）
- 4拍目以降: 次の小節へ

※ハイハットは適宜入れてください`,
      targetTrack: 'drum',
      hints: [
        '3.5からフィル開始',
        'タムは高→低の順',
        '次の小節頭でキック+クラッシュ',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'フィルの長さと効果',
      content: `フィルの長さで印象が変わります。

<strong>1拍フィル:</strong>
- さりげない
- 流れを止めない
- 頻繁に使える

<strong>2拍フィル:</strong>
- 標準的
- 適度なインパクト
- 4小節ごとに

<strong>1小節フィル:</strong>
- 派手
- 大きな転換点
- サビ前など

<strong>2小節フィル:</strong>
- 非常に派手
- 曲のクライマックス
- 使いすぎ注意

<strong>目安:</strong>
8小節: 2拍フィル
16小節: 1小節フィル
セクション変更: 1-2小節フィル`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'フィル後の着地',
      content: `フィルの後は<strong>着地</strong>が重要です。

<strong>基本:</strong>
フィルの直後に キック + クラッシュ

これが「解決」になります。

<strong>例:</strong>
タタタタ・ドンジャーン！
（フィル）（着地）

<strong>着地がないと:</strong>
- 中途半端な印象
- 次のセクションが弱い
- 盛り上がりが消える

<strong>着地のバリエーション:</strong>
- キック + クラッシュ: 最も強い
- キックのみ: やや控えめ
- スネア + クラッシュ: 跳ねる感じ`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：フィル配置',
      content: 'フィルの配置を確認しましょう。',
      question: '「サビへの期待感を最大限に高める」フィルはどこに置く？',
      options: [
        'サビの1小節目',
        'Bメロの最後',
        'サビの途中',
        'イントロの頭',
      ],
      correctIndex: 1,
      explanation: 'Bメロの最後（サビ直前）にフィルを置くと、サビへの期待感が最大になります。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>フィルインの役割</strong>
   - セクション間の橋渡し
   - 展開の予告
   - 盛り上がり

2. <strong>定番パターン</strong>
   - タム回し: 高→低
   - スネア連打: 盛り上げ

3. <strong>長さの使い分け</strong>
   - 1拍: さりげなく
   - 2拍: 標準
   - 1小節: 派手

4. <strong>着地</strong>
   - フィル後はキック+クラッシュ

<strong>次のレッスン：</strong>
グルーヴとダイナミクスを学びます。`,
    },
  ],
}
