/**
 * Phase 7 - Lesson 7.4: ギターパターン
 *
 * 学ぶこと:
 * - アニソン定番パターン
 * - セクション別の奏法
 * - 実践テクニック
 */
import { Lesson } from '../../types/lesson'

export const phase7Lesson4: Lesson = {
  id: 'phase7-lesson4',
  phaseId: 7,
  lessonNumber: 4,
  title: 'ギターパターン',
  description: 'アニソンで使える実践パターン',
  estimatedMinutes: 30,
  prerequisites: ['phase7-lesson3'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'イントロのパターン',
      content: `イントロはギターが目立つ場所です。

<strong>パターン1: リフ主体</strong>
印象的なフレーズで始まる。
覚えやすいメロディ。

<strong>パターン2: パワーコード刻み</strong>
8分でズンズン刻む。
激しい曲の定番。

<strong>パターン3: アルペジオ</strong>
コードを分散して弾く。
バラード、おしゃれ系。

<strong>パターン4: 無音から入る</strong>
ドラムやシンセだけで始まり、
途中からギターが入る。

<strong>アニソンでは:</strong>
パターン1か2が多い。
「つかみ」が大事。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'Aメロのパターン',
      content: `Aメロは控えめに弾きます。

<strong>パターン1: パームミュート刻み</strong>
| ズクズク | ズクズク |
低音で支える。

<strong>パターン2: 白玉コード</strong>
| ジャーン |
音を伸ばす、スペース多め。

<strong>パターン3: アルペジオ</strong>
優しく分散和音。
バラード向き。

<strong>パターン4: 休み</strong>
ギターは弾かない。
キーボードに任せる。

<strong>ポイント:</strong>
ボーカルを邪魔しない。
サビのために「溜める」。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'Bメロのパターン',
      content: `Bメロはサビへの橋渡し。

<strong>パターン1: 徐々に盛り上げ</strong>
Aメロより刻みを増やす。
パームミュート → 開放へ。

<strong>パターン2: シンコペーション</strong>
| ジャン | 休 | ジャ | ジャン |
リズムに変化を。

<strong>パターン3: コードチェンジ強調</strong>
コードが変わるところでアクセント。
期待感を煽る。

<strong>パターン4: フィルイン</strong>
Bメロ最後に盛り上げフレーズ。
「サビが来る！」という合図。

<strong>アニソンでは:</strong>
Bメロ後半で一気に盛り上げる。`,
    },
    {
      id: 'step4',
      type: 'theory',
      title: 'サビのパターン',
      content: `サビはギター全開です。

<strong>パターン1: 8分パワーコード</strong>
| ズンズン | ズンズン | ズンズン | ズンズン |
最も基本的。力強い。

<strong>パターン2: オクターブ奏法</strong>
ベースと同じくオクターブで刻む。
明るい響き。

<strong>パターン3: コード刻み</strong>
フルコードで8分刻み。
厚い響き。

<strong>パターン4: ユニゾンリフ</strong>
ベースと同じフレーズ。
一体感、迫力。

<strong>アニソンのサビ:</strong>
パターン1が王道。
ドラムと同期して推進力を出す。`,
    },
    {
      id: 'step5',
      type: 'exercise',
      title: '実践：サビパターン',
      content: `サビ用の8分パワーコードを作りましょう。

<strong>課題：8分刻み（1小節）</strong>

コード: 0のパワーコード

ギタートラックに：
タイミング: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5

各タイミングで:
[0⁽³⁾, 7⁽³⁾, 0⁽⁴⁾]（MIDI 48, 55, 60）

<strong>デュレーション:</strong> 0.4拍

<strong>ベロシティ:</strong>
表拍（0, 1, 2, 3）: 100
裏拍（0.5, 1.5, 2.5, 3.5）: 80`,
      targetTrack: 'guitar',
      hints: [
        '8回繰り返し',
        '表と裏で強弱',
        'デュレーション短め',
      ],
    },
    {
      id: 'step6',
      type: 'theory',
      title: '落ちサビと大サビ',
      content: `曲の終盤のパターンです。

<strong>落ちサビ（静かなサビ）:</strong>
- ギターは休むか控えめ
- クリーントーンでアルペジオ
- ピアノやボーカルを引き立てる

<strong>大サビ（最後のサビ）:</strong>
- 最大の盛り上がり
- ギター2本重ね
- オクターブ上のフレーズ追加
- 全力で刻む

<strong>アニソンの定番:</strong>
落ちサビ → 無音 → 大サビ！
このコントラストが感動を生む。

<strong>ギターの役割:</strong>
落ちサビで引いて、
大サビで全開にする。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：パターン',
      content: 'セクション別のパターンを確認しましょう。',
      question: 'Aメロでギターが心がけることは？',
      options: [
        '全力で弾く',
        'ボーカルを邪魔しない',
        'リフを弾く',
        'ソロを弾く',
      ],
      correctIndex: 1,
      explanation: 'Aメロではボーカルが主役なので、ギターは控えめに伴奏します。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>イントロ</strong>
   - リフで印象付け
   - パワーコード刻み

2. <strong>Aメロ</strong>
   - パームミュート
   - 控えめに

3. <strong>Bメロ</strong>
   - 徐々に盛り上げ
   - サビへの橋渡し

4. <strong>サビ</strong>
   - 8分パワーコード
   - 全開

5. <strong>落ち・大サビ</strong>
   - コントラスト

<strong>Phase 7 完了！</strong>
次のフェーズでは曲構成を学びます。`,
    },
  ],
}
