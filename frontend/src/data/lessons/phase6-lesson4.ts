/**
 * Phase 6 - Lesson 6.4: キーボードパターン
 *
 * 学ぶこと:
 * - セクション別の奏法
 * - リズミックなパターン
 * - パッドとの組み合わせ
 */
import { Lesson } from '../../types/lesson'

export const phase6Lesson4: Lesson = {
  id: 'phase6-lesson4',
  phaseId: 6,
  lessonNumber: 4,
  title: 'キーボードパターン',
  description: 'セクション別の実践的な奏法',
  estimatedMinutes: 30,
  prerequisites: ['phase6-lesson3'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'セクション別の考え方',
      content: `キーボードの弾き方はセクションで変えます。

<strong>イントロ:</strong>
- アルペジオ
- 単音またはシンプルなコード
- 期待感を煽る

<strong>Aメロ:</strong>
- 控えめ
- 白玉かアルペジオ
- ボーカルを邪魔しない

<strong>Bメロ:</strong>
- やや動きを出す
- コードの刻み開始
- サビへの橋渡し

<strong>サビ:</strong>
- 全開
- 刻みまたはパッド
- 厚く、力強く`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'コード刻みパターン',
      content: `リズミカルにコードを刻むパターンです。

<strong>4分刻み:</strong>
| コード | コード | コード | コード |
0       1       2       3

<strong>8分刻み:</strong>
| コ | コ | コ | コ | コ | コ | コ | コ |
0  0.5  1  1.5  2  2.5  3  3.5

<strong>シンコペーション:</strong>
| コ | 休 | コ | 休 | 休 | コ | 休 | コ |
0       1       2       3

<strong>アニソンの定番:</strong>
サビで8分刻みが多い。
シンコペで動きを出すことも。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'パッドとの使い分け',
      content: `<strong>パッド</strong>は長く伸ばす音です。

<strong>ピアノ/シンセの刻み:</strong>
- アタックが明確
- リズムを刻む
- 前に出る音

<strong>ストリングス/シンセパッド:</strong>
- ふわっと広がる
- 長く持続
- 背景を埋める

<strong>組み合わせ:</strong>
刻み + パッド = 厚みが出る

<strong>例:</strong>
ピアノで8分刻み
+ ストリングスで白玉パッド

<strong>アニソンのサビ:</strong>
この組み合わせが王道。
厚みと推進力を両立。`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：8分刻み',
      content: `サビ用のコード刻みを作りましょう。

<strong>課題：0メジャーの8分刻み（1小節）</strong>

キーボードトラックに：

コード: [0⁽⁴⁾, 4⁽⁴⁾, 7⁽⁴⁾]（MIDI 60, 64, 67）

<strong>タイミング:</strong>
0拍目、0.5拍目、1拍目、1.5拍目、
2拍目、2.5拍目、3拍目、3.5拍目

（全部で8回）

<strong>デュレーション:</strong> 0.4拍程度

<strong>ベロシティ:</strong>
表拍（0, 1, 2, 3）: 90
裏拍（0.5, 1.5, 2.5, 3.5）: 70`,
      targetTrack: 'keyboard',
      hints: [
        '3音同時に8回',
        '表拍と裏拍で強弱',
        'デュレーションは短め',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'ギターとの棲み分け',
      content: `キーボードとギターは似た音域です。

<strong>被りを防ぐ方法:</strong>

<strong>1. 音域を分ける:</strong>
- キーボード: オクターブ4-5
- ギター: オクターブ3-4
または逆

<strong>2. リズムを分ける:</strong>
- キーボード: 白玉
- ギター: 刻み
または逆

<strong>3. 役割を分ける:</strong>
- キーボード: パッド的
- ギター: リフ的

<strong>4. 交互に弾く:</strong>
- Aメロ: キーボード主体
- Bメロ: ギター主体

<strong>アニソンでは:</strong>
両方同時に鳴ることも多い。
でも片方を控えめにする。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'アニソン定番パターン集',
      content: `アニソンでよく聴くパターンです。

<strong>1. サビの8分刻み:</strong>
全パートが8分で刻む。
ドライブ感、疾走感。

<strong>2. イントロのアルペジオ:</strong>
ピアノの分散和音。
期待感、美しさ。

<strong>3. Aメロの白玉パッド:</strong>
ストリングスが背景に。
空間を埋める。

<strong>4. Bメロのシンコペ:</strong>
リズミカルな刻み。
サビへの期待。

<strong>5. 落ちサビのピアノソロ:</strong>
他楽器が消えてピアノだけ。
エモーショナル。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：パターン',
      content: 'キーボードパターンを確認しましょう。',
      question: 'アニソンのサビでよく使われる組み合わせは？',
      options: [
        'アルペジオのみ',
        '白玉のみ',
        '刻み + パッド',
        '無音',
      ],
      correctIndex: 2,
      explanation: 'サビでは刻み（リズム）+ パッド（厚み）の組み合わせが王道です。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>セクション別</strong>
   - Aメロ: 控えめ
   - サビ: 全開

2. <strong>刻みパターン</strong>
   - 4分、8分
   - シンコペーション

3. <strong>パッドとの組み合わせ</strong>
   - 刻み + パッド = 厚み

4. <strong>ギターとの棲み分け</strong>
   - 音域、リズム、役割

<strong>Phase 6 完了！</strong>
次のフェーズではギターパートを学びます。`,
    },
  ],
}
