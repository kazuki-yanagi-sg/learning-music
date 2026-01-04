/**
 * Phase 3 - Lesson 3.4: アニソンメロディパターン
 *
 * 学ぶこと:
 * - アニソン特有のメロディ構造
 * - サビの作り方
 * - キャッチーさの秘密
 */
import { Lesson } from '../../types/lesson'

export const phase3Lesson4: Lesson = {
  id: 'phase3-lesson4',
  phaseId: 3,
  lessonNumber: 4,
  title: 'アニソンメロディパターン',
  description: 'アニソン特有のメロディ技法を学ぶ',
  estimatedMinutes: 30,
  prerequisites: ['phase3-lesson3'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'アニソンメロディの特徴',
      content: `アニソンには独特のメロディスタイルがあります。

<strong>特徴:</strong>
- キャッチーで覚えやすい
- 感情の起伏が激しい
- サビの盛り上がりが強い
- 90秒で完結（TV版）

<strong>一般的なJ-POPとの違い:</strong>
- より極端な音域の使い方
- サビのインパクト重視
- 歌詞とメロディの一体感

<strong>目的:</strong>
「一度聴いたら忘れない」
「思わず口ずさんでしまう」
これがアニソンの理想形です。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'サビ頭の跳躍',
      content: `アニソンのサビは<strong>跳躍</strong>で始まることが多い。

<strong>パターン:</strong>
低い音 → 高い音（距離5〜7以上）

例: 0⁽⁴⁾ → 7⁽⁴⁾（距離7）
例: 0⁽⁴⁾ → 0⁽⁵⁾（オクターブ跳躍）

<strong>効果:</strong>
- 「サビ来た！」という合図
- 一気に盛り上がる
- 印象に残る

<strong>跳躍後の処理:</strong>
跳躍後は順次下降することが多い。
高い位置に飛んで、ゆっくり降りてくる。

<strong>例:</strong>
0 → 7 → 5 → 4 → 2 → 0
（跳躍 → 順次下降）`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: '同音連打',
      content: `<strong>同音連打</strong>はアニソンの定番技法です。

同じ音を連続で歌うパターン。

<strong>例:</strong>
[7, 7, 7, 5, 4]
ダダダ・ダーダー

<strong>効果:</strong>
- 歌詞を強調できる
- ラップ的なノリ
- 勢いが出る

<strong>使いどころ:</strong>
- Aメロで情報量多い歌詞を乗せる
- サビ前の盛り上げ
- 決めフレーズ

<strong>アニソン例:</strong>
「走り出せ走り出せ」のような
同じ言葉を繰り返す部分に最適。`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：サビ頭パターン',
      content: `典型的なサビ頭のメロディを作りましょう。

<strong>課題：跳躍 → 順次下降</strong>

[0, 7, 7, 5, 4, 2, 0]

キーボードトラックに：
- 0⁽⁴⁾ (60) → 0拍目
- 7⁽⁴⁾ (67) → 1拍目（跳躍！）
- 7⁽⁴⁾ (67) → 2拍目（同音）
- 5⁽⁴⁾ (65) → 3拍目
- 4⁽⁴⁾ (64) → 4拍目
- 2⁽⁴⁾ (62) → 5拍目
- 0⁽⁴⁾ (60) → 6拍目`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 67, start: 1, duration: 1 },
        { pitch: 67, start: 2, duration: 1 },
        { pitch: 65, start: 3, duration: 1 },
        { pitch: 64, start: 4, duration: 1 },
        { pitch: 62, start: 5, duration: 1 },
        { pitch: 60, start: 6, duration: 1 },
      ],
      hints: [
        '最初の跳躍がインパクト',
        'その後は順次進行で下降',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: '泣きメロ',
      content: `<strong>泣きメロ</strong>はアニソンの代名詞です。

<strong>特徴:</strong>
- マイナースケールベース
- 距離3（暗い）を多用
- 下降フレーズが多い

<strong>典型パターン:</strong>
高い音から順次下降
[9, 7, 5, 4, 2, 0]

<strong>効果:</strong>
- 切ない感情
- 涙を誘う
- 感動的なクライマックス

<strong>使いどころ:</strong>
- バラードのサビ
- 感動シーンのBGM
- 最終回のED

<strong>コツ:</strong>
距離3の音（マイナー感）を経由する。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'コール&レスポンス',
      content: `<strong>コール&レスポンス</strong>は問いと答えの構造です。

<strong>パターン:</strong>
フレーズA（問い）→ フレーズB（答え）

<strong>例:</strong>
コール: [0, 2, 4, 5]（上昇）
レスポンス: [7, 5, 4, 2]（下降）

<strong>効果:</strong>
- 対話感
- 期待と解決
- 聴いていて気持ちいい

<strong>アニソンでの使用:</strong>
- ライブで掛け合いになる部分
- メロディの「会話」
- AメロとBメロの関係

<strong>作り方:</strong>
コールで終わりを不安定に（5や2で終わる）
レスポンスで解決（0で終わる）`,
    },
    {
      id: 'step7',
      type: 'exercise',
      title: '実践：コール&レスポンス',
      content: `問いと答えのフレーズを作りましょう。

<strong>課題：コール → レスポンス</strong>

コール（1〜4拍目）: [0, 2, 4, 5]
レスポンス（5〜8拍目）: [4, 2, 0, 0]

キーボードトラックに両方を入力してください。
コールが上昇、レスポンスが下降します。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 62, start: 1, duration: 1 },
        { pitch: 64, start: 2, duration: 1 },
        { pitch: 65, start: 3, duration: 1 },
        { pitch: 64, start: 4, duration: 1 },
        { pitch: 62, start: 5, duration: 1 },
        { pitch: 60, start: 6, duration: 1 },
        { pitch: 60, start: 7, duration: 1 },
      ],
      hints: [
        'コールは上昇して期待感',
        'レスポンスは下降して解決',
      ],
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'フック（決めフレーズ）',
      content: `<strong>フック</strong>は最も印象に残る部分です。

<strong>特徴:</strong>
- 曲を代表するフレーズ
- タイトルコールになることも
- 繰り返し使われる

<strong>フックの作り方:</strong>
1. シンプルで覚えやすい
2. 特徴的なリズムか音型
3. 歌詞と一体化

<strong>配置場所:</strong>
- サビの最初
- サビの最後
- イントロ

<strong>アニソンの例:</strong>
「〜〜〜〜！」という叫びのようなフレーズ
これだけで曲が特定できるレベルを目指す。`,
    },
    {
      id: 'step9',
      type: 'quiz',
      title: '確認クイズ：アニソンパターン',
      content: 'アニソンメロディの特徴を確認しましょう。',
      question: '「サビ頭のインパクト」に最適な動きは？',
      options: [
        '順次下降',
        '同音反復から始まる',
        '低→高の跳躍',
        'ゆっくりした音符',
      ],
      correctIndex: 2,
      explanation: 'サビ頭は低→高の跳躍が効果的。一気に盛り上がりを演出できます。',
    },
    {
      id: 'step10',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>サビ頭の跳躍</strong>
   - 低→高で始める
   - その後は順次下降

2. <strong>同音連打</strong>
   - 勢いと強調
   - ラップ的表現

3. <strong>泣きメロ</strong>
   - マイナー系
   - 下降フレーズ

4. <strong>コール&レスポンス</strong>
   - 問いと答え
   - 上昇→下降

5. <strong>フック</strong>
   - 曲の顔
   - 最も印象的な部分

<strong>Phase 3 完了！</strong>
次のフェーズではリズムとドラムを学びます。`,
    },
  ],
}
