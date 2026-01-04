/**
 * Phase 4 - Lesson 4.4: グルーヴとダイナミクス
 *
 * 学ぶこと:
 * - ベロシティの使い分け
 * - ゴーストノート
 * - 人間らしいドラム
 */
import { Lesson } from '../../types/lesson'

export const phase4Lesson4: Lesson = {
  id: 'phase4-lesson4',
  phaseId: 4,
  lessonNumber: 4,
  title: 'グルーヴとダイナミクス',
  description: '生きたドラムを打ち込む技術',
  estimatedMinutes: 30,
  prerequisites: ['phase4-lesson3'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'グルーヴとは',
      content: `<strong>グルーヴ</strong>とは、リズムの「ノリ」です。

同じパターンでも、グルーヴがあると体が動く。
グルーヴがないと機械的で退屈。

<strong>グルーヴを生む要素:</strong>
1. ベロシティ（強弱）
2. タイミング（微妙なズレ）
3. 音色の変化

<strong>機械的な打ち込み:</strong>
- 全部同じベロシティ
- 完璧なタイミング
- 変化がない

<strong>グルーヴのある打ち込み:</strong>
- 強弱がある
- 微妙な揺れ
- 「生きている」感じ`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'ベロシティの基本',
      content: `ベロシティ（音の強さ）で表情をつけます。

<strong>ドラムの基本ベロシティ:</strong>

<strong>キック:</strong>
- 1拍目: 100-120（強い）
- 3拍目: 90-110（やや強い）
- その他: 80-100

<strong>スネア:</strong>
- バックビート: 100-127（しっかり）
- ゴースト: 30-50（弱く）

<strong>ハイハット:</strong>
- 表拍: 80-100
- 裏拍: 60-80
- アクセント: 100-110

<strong>ポイント:</strong>
全部同じにしない！
強弱の「波」を作る。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'ゴーストノート',
      content: `<strong>ゴーストノート</strong>は非常に弱い音です。

<strong>特徴:</strong>
- ベロシティ 20-50
- 聞こえるか聞こえないか程度
- グルーヴを生む隠し味

<strong>主にスネアで使用:</strong>
バックビートの間に弱いスネアを入れる

例（1小節）:
1拍目: （なし）
1.5拍目: ゴースト（vel 40）
2拍目: スネア（vel 110）
2.5拍目: ゴースト（vel 35）
3拍目: （なし）
3.5拍目: ゴースト（vel 45）
4拍目: スネア（vel 115）

<strong>効果:</strong>
リズムが「うねる」感じに。
プロの打ち込みの秘密。`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：ゴースト入りパターン',
      content: `ゴーストノートを含むパターンを作りましょう。

<strong>課題：ゴースト入り8ビート</strong>

ドラムトラックに：

<strong>キック（36）:</strong>
0拍目（vel 110）、2拍目（vel 100）

<strong>スネア（38）:</strong>
- 1拍目（vel 110）: メイン
- 3拍目（vel 115）: メイン
- 0.5拍目（vel 40）: ゴースト
- 2.5拍目（vel 35）: ゴースト

<strong>ハイハット（42）:</strong>
8分音符で、表拍を強め（90）裏拍を弱め（70）`,
      targetTrack: 'drum',
      hints: [
        'ゴーストはベロシティ40以下',
        '強弱の差を意識する',
        'ハイハットも表と裏で変える',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'タイミングの揺れ',
      content: `完璧なタイミングは機械的に聞こえます。

<strong>人間のドラマー:</strong>
- 微妙に早い/遅い
- 意図的な「ため」
- グルーヴの源

<strong>打ち込みでの再現:</strong>
- 数ティック（数ms）ずらす
- ハイハットを少し早めに
- スネアを少し遅めに

<strong>注意:</strong>
やりすぎると「下手」に聞こえる。
5-20ms程度の微調整。

<strong>DAWの機能:</strong>
- ヒューマナイズ
- スウィング
- グルーヴテンプレート

<strong>このアプリでは:</strong>
まずはベロシティで表現しましょう。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'セクション別ダイナミクス',
      content: `セクションごとにドラムの激しさを変えます。

<strong>イントロ:</strong>
- 控えめ
- ハイハット中心
- 期待感を煽る

<strong>Aメロ:</strong>
- シンプル
- キック+スネアは基本
- 歌を邪魔しない

<strong>Bメロ:</strong>
- やや盛り上げ
- フィルを入れ始める
- サビへの期待

<strong>サビ:</strong>
- 全開
- クラッシュ、4つ打ち
- ベロシティ高め

<strong>落ちサビ:</strong>
- 静かに
- キックとハイハットだけ
- 最後のサビへの布石`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：ダイナミクス',
      content: 'ダイナミクスの使い方を確認しましょう。',
      question: 'ゴーストノートの適切なベロシティは？',
      options: [
        '100-127（強い）',
        '70-90（中程度）',
        '20-50（弱い）',
        '0（無音）',
      ],
      correctIndex: 2,
      explanation: 'ゴーストノートは20-50程度の非常に弱いベロシティで入れます。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>グルーヴ</strong>
   - ノリ、生きた感じ
   - 強弱と揺れで生まれる

2. <strong>ベロシティ</strong>
   - パーツごとに設定
   - 表拍強め、裏拍弱め

3. <strong>ゴーストノート</strong>
   - 非常に弱い音
   - グルーヴの隠し味

4. <strong>セクション別</strong>
   - Aメロ: 控えめ
   - サビ: 全開

<strong>Phase 4 完了！</strong>
次のフェーズでは4トラックのアレンジを学びます。`,
    },
  ],
}
