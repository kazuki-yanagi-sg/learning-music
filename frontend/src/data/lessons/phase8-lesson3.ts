/**
 * Phase 8 - Lesson 8.3: アニソン構成パターン
 *
 * 学ぶこと:
 * - アニソン特有の構成
 * - TV版の作り方
 * - 盛り上げテクニック
 */
import { Lesson } from '../../types/lesson'

export const phase8Lesson3: Lesson = {
  id: 'phase8-lesson3',
  phaseId: 8,
  lessonNumber: 3,
  title: 'アニソン構成パターン',
  description: 'アニメソング特有のテクニック',
  estimatedMinutes: 25,
  prerequisites: ['phase8-lesson2'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'アニソンの特徴',
      content: `アニソンには独特の特徴があります。

<strong>1. 即座に盛り上がる</strong>
- イントロからテンションが高い
- サビが早く来る
- TV版は1分30秒で完結

<strong>2. キャッチーさ重視</strong>
- サビが覚えやすい
- フックが多い
- リピートさせる

<strong>3. ドラマチック</strong>
- 感情の起伏が大きい
- 落ちサビ→大サビの構成
- クライマックス感

<strong>4. アニメとの同期</strong>
- 映像に合わせた展開
- OPならキャラ登場に合わせる
- EDなら余韻を残す`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'TV版の構成',
      content: `TV版（1分30秒）の典型的な構成です。

<strong>パターン1: スタンダード</strong>
イントロ(8) → A(8) → B(8) → サビ(16) → アウトロ(8)

<strong>パターン2: サビ始まり</strong>
サビ(8) → イントロ(4) → A(8) → B(8) → サビ(16) → アウトロ(4)

<strong>パターン3: ショートイントロ</strong>
イントロ(4) → A(8) → B(8) → サビ(24) → アウトロ(4)

<strong>よく使われるのは:</strong>
パターン1とパターン2。
パターン2は「つかみ」が強い。

<strong>BPM 140の場合:</strong>
8小節 ≈ 14秒
16小節 ≈ 28秒
48小節 ≈ 1分24秒`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'サビ始まりの効果',
      content: `<strong>サビ始まり</strong>はアニソンの定番です。

<strong>構成:</strong>
サビ（短め）→ イントロ → A → B → サビ（フル）

<strong>効果:</strong>
- 最初から印象に残る
- 「この曲知ってる」と思わせる
- 視聴者を即座に引き込む

<strong>テクニック:</strong>
- 最初のサビは短め（8小節）
- 歌詞を変えることも
- いきなりボーカルで始まる

<strong>イントロへの戻り方:</strong>
- ドラムフィルで切り替え
- ブレイク（一瞬の無音）
- キーボードのグリッサンド`,
    },
    {
      id: 'step4',
      type: 'theory',
      title: '盛り上げテクニック',
      content: `曲を盛り上げるテクニックです。

<strong>1. ドラムフィル</strong>
セクション変化の直前に入れる。
「次が来る！」という合図。

<strong>2. ブレイク</strong>
一瞬全パート無音にする。
緊張感を高める。

<strong>3. ビルドアップ</strong>
だんだん音を増やす。
シンセのライザー音。

<strong>4. キーチェンジ</strong>
大サビで半音〜1音上げる。
最後のひと押し。

<strong>5. ユニゾン</strong>
全パートが同じリズムで刻む。
一体感、クライマックス感。`,
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'つなぎ目の処理',
      content: `セクション間のつなぎ方です。

<strong>A→Bのつなぎ:</strong>
- ドラムが少し増える
- ベースラインが動く
- 最後の小節でフィル

<strong>B→サビのつなぎ:</strong>
- Bメロ最後に大きなフィル
- ブレイク（0.5-1小節の無音）
- クラッシュで着地

<strong>サビ→Aメロのつなぎ:</strong>
- 楽器を減らす
- ボリュームを下げる
- ドラムをシンプルに

<strong>ポイント:</strong>
つなぎ目がスムーズだと
曲全体が気持ちよく流れる。`,
    },
    {
      id: 'step6',
      type: 'quiz',
      title: '確認クイズ：アニソン構成',
      content: 'アニソンの構成を確認しましょう。',
      question: 'TV版アニソンの長さは約何秒？',
      options: [
        '60秒',
        '90秒',
        '120秒',
        '180秒',
      ],
      correctIndex: 1,
      explanation: 'TV版アニソンは約90秒（1分30秒）です。OPやEDの尺に合わせています。',
    },
    {
      id: 'step7',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>アニソンの特徴</strong>
   - 即座に盛り上がる
   - キャッチー
   - ドラマチック

2. <strong>TV版の構成</strong>
   - 48小節で約90秒
   - サビ始まりパターン

3. <strong>盛り上げテクニック</strong>
   - フィル、ブレイク
   - ビルドアップ

4. <strong>つなぎ目</strong>
   - スムーズな移行

<strong>次のレッスン：</strong>
4トラックのアレンジを実践します。`,
    },
  ],
}
