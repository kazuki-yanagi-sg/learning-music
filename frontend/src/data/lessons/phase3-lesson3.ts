/**
 * Phase 3 - Lesson 3.3: モチーフと展開
 *
 * 学ぶこと:
 * - モチーフ = 最小単位のメロディ
 * - 反復、変形、発展
 * - 統一感のある曲作り
 */
import { Lesson } from '../../types/lesson'

export const phase3Lesson3: Lesson = {
  id: 'phase3-lesson3',
  phaseId: 3,
  lessonNumber: 3,
  title: 'モチーフと展開',
  description: '覚えやすいメロディを作る技術',
  estimatedMinutes: 30,
  prerequisites: ['phase3-lesson2'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'モチーフとは',
      content: `<strong>モチーフ</strong>とは、メロディの最小単位です。

通常2〜8音程度の短いフレーズで、
曲全体を通して繰り返し使われます。

<strong>モチーフの役割:</strong>
- 曲の「顔」になる
- 聴く人の記憶に残る
- 統一感を生む

<strong>有名なモチーフ:</strong>
ベートーヴェン「運命」: ダダダダーン（4音）
これだけで曲が特定できる！

<strong>アニソンでも同じ:</strong>
サビの最初の数音がモチーフになることが多い。
「あの曲だ！」と分かる部分です。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'モチーフの作り方',
      content: `良いモチーフには特徴があります。

<strong>1. シンプルであること</strong>
- 2〜8音程度
- 覚えやすい長さ
- 複雑すぎない

<strong>2. 特徴があること</strong>
- 印象的な跳躍
- 特徴的なリズム
- 覚えやすい音型

<strong>3. 発展の余地があること</strong>
- 変形しても成立する
- 繰り返しに耐える
- バリエーションが作れる

<strong>モチーフの例:</strong>
[0, 2, 4, 2]（上がって戻る）
[0, 0, 7, 5]（同音反復→跳躍→下降）
[0, 4, 7, 4]（和音の分散）`,
    },
    {
      id: 'step3',
      type: 'exercise',
      title: '実践：シンプルなモチーフ',
      content: `シンプルなモチーフを作りましょう。

<strong>課題：[0, 2, 4, 2] を入力</strong>

キーボードトラックに：
- 0⁽⁴⁾ (60) → 0拍目
- 2⁽⁴⁾ (62) → 1拍目
- 4⁽⁴⁾ (64) → 2拍目
- 2⁽⁴⁾ (62) → 3拍目

上がって戻る、山形のモチーフです。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 62, start: 1, duration: 1 },
        { pitch: 64, start: 2, duration: 1 },
        { pitch: 62, start: 3, duration: 1 },
      ],
      hints: [
        '4音のシンプルなモチーフ',
        'これを基に展開していきます',
      ],
    },
    {
      id: 'step4',
      type: 'theory',
      title: '反復',
      content: `<strong>反復</strong>は最もシンプルな展開方法です。

同じモチーフをそのまま繰り返します。

<strong>原型:</strong> [0, 2, 4, 2]
<strong>反復:</strong> [0, 2, 4, 2] [0, 2, 4, 2]

<strong>効果:</strong>
- 覚えやすくなる
- 安定感が出る
- 「サビ感」が出る

<strong>注意:</strong>
- 3回以上繰り返すと飽きる
- 2回目は少し変化をつけることも
- 最後だけ変えるパターンも効果的

<strong>アニソンでは:</strong>
サビの同じフレーズを2回繰り返し、
3回目で変化させて終わるパターンが多い。`,
    },
    {
      id: 'step5',
      type: 'theory',
      title: '移高（トランスポジション）',
      content: `<strong>移高</strong>とは、モチーフ全体を上下に移動させることです。

<strong>原型:</strong> [0, 2, 4, 2]
<strong>+2移高:</strong> [2, 4, 6, 4]
<strong>+5移高:</strong> [5, 7, 9, 7]

音の「形」は同じで、位置だけが変わります。

<strong>効果:</strong>
- 統一感を保ちながら変化
- 盛り上がり感（上に移高）
- 落ち着き感（下に移高）

<strong>アニソンでの使用:</strong>
1回目: 原型
2回目: +2〜+5移高（盛り上げ）
これで「同じなのに違う」感覚に。`,
    },
    {
      id: 'step6',
      type: 'exercise',
      title: '実践：移高',
      content: `モチーフを移高させましょう。

<strong>課題：原型 [0,2,4,2] → 移高 [5,7,9,7]</strong>

キーボードトラックに：
1〜4拍目: 原型
- 0⁽⁴⁾, 2⁽⁴⁾, 4⁽⁴⁾, 2⁽⁴⁾

5〜8拍目: +5移高
- 5⁽⁴⁾ (65), 7⁽⁴⁾ (67), 9⁽⁴⁾ (69), 7⁽⁴⁾ (67)`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 62, start: 1, duration: 1 },
        { pitch: 64, start: 2, duration: 1 },
        { pitch: 62, start: 3, duration: 1 },
        { pitch: 65, start: 4, duration: 1 },
        { pitch: 67, start: 5, duration: 1 },
        { pitch: 69, start: 6, duration: 1 },
        { pitch: 67, start: 7, duration: 1 },
      ],
      hints: [
        '形は同じ、位置が+5',
        '2回目が少し高くなる',
      ],
    },
    {
      id: 'step7',
      type: 'theory',
      title: '反転と逆行',
      content: `<strong>反転</strong>と<strong>逆行</strong>は高度な展開技法です。

<strong>反転（インバージョン）:</strong>
上下を逆にする
原型: [0, 2, 4, 2]（上がって戻る）
反転: [0, -2, -4, -2]（下がって戻る）
= [0, 10, 8, 10]（mod 12）

<strong>逆行（レトログレード）:</strong>
順序を逆にする
原型: [0, 2, 4, 2]
逆行: [2, 4, 2, 0]

<strong>効果:</strong>
- 原型との関連性を保ちつつ変化
- 「対」になるフレーズ
- 問いと答えの関係

<strong>使いどころ:</strong>
Aメロで原型、Bメロで反転など。`,
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'リズム変形',
      content: `音高はそのままで<strong>リズムだけ変形</strong>する方法です。

<strong>原型:</strong>
[0, 2, 4, 2] 各1拍

<strong>拡大（アウグメンテーション）:</strong>
[0, 2, 4, 2] 各2拍
→ ゆったりした印象

<strong>縮小（ディミニューション）:</strong>
[0, 2, 4, 2] 各0.5拍
→ 勢いのある印象

<strong>リズム変更:</strong>
[0(長), 2(短), 4(短), 2(長)]
→ タメと勢いのメリハリ

<strong>アニソンでの使用:</strong>
Aメロ: 拡大（ゆったり）
サビ: 縮小（勢い）
同じモチーフでも印象が変わる。`,
    },
    {
      id: 'step9',
      type: 'quiz',
      title: '確認クイズ：展開技法',
      content: '展開技法を確認しましょう。',
      question: 'モチーフ [0,4,7,4] を+3移高すると？',
      options: [
        '[3, 7, 10, 7]',
        '[0, 4, 7, 4]',
        '[-3, 1, 4, 1]',
        '[3, 4, 7, 4]',
      ],
      correctIndex: 0,
      explanation: '全ての音に+3します。[0+3, 4+3, 7+3, 4+3] = [3, 7, 10, 7]。',
    },
    {
      id: 'step10',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>モチーフ</strong>
   - 2〜8音の短いフレーズ
   - 曲の「顔」になる
   - シンプルで特徴的に

2. <strong>反復</strong>
   - そのまま繰り返す
   - 覚えやすさ、サビ感

3. <strong>移高</strong>
   - 全体を上下に移動
   - 統一感を保ちつつ変化

4. <strong>その他の技法</strong>
   - 反転、逆行
   - リズム変形

<strong>次のレッスン：</strong>
アニソン特有のメロディパターンを学びます。`,
    },
  ],
}
