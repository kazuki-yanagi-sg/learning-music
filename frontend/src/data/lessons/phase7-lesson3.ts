/**
 * Phase 7 - Lesson 7.3: リフとバッキング
 *
 * 学ぶこと:
 * - リフとは
 * - バッキングパターン
 * - キーボードとの役割分担
 */
import { Lesson } from '../../types/lesson'

export const phase7Lesson3: Lesson = {
  id: 'phase7-lesson3',
  phaseId: 7,
  lessonNumber: 3,
  title: 'リフとバッキング',
  description: 'ギターの2つの役割',
  estimatedMinutes: 25,
  prerequisites: ['phase7-lesson2'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'リフとは',
      content: `<strong>リフ</strong>は繰り返される印象的なフレーズです。

<strong>特徴:</strong>
- 短い（1-2小節）
- 覚えやすい
- 曲の「顔」になる

<strong>使いどころ:</strong>
- イントロ
- 間奏
- アウトロ
- Aメロの合間

<strong>有名なリフ:</strong>
多くのロック曲はリフで始まる。
「あのフレーズ」で曲が思い浮かぶ。

<strong>アニソンでは:</strong>
イントロのリフが印象的な曲が多い。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'リフの作り方',
      content: `基本的なリフの構造です。

<strong>要素:</strong>
- パワーコード
- 単音フレーズ
- リズムパターン

<strong>シンプルなリフの例（0キー）:</strong>
| 0-0-0 | 3 | 5 | 3 |
8分:  1 2 3   4   5   6

パワーコードと単音を組み合わせる。

<strong>コツ:</strong>
- シンプルに
- 繰り返しやすく
- スケール内の音で
- リズムに特徴を

<strong>作り方:</strong>
1. パワーコードを置く
2. 間に単音を入れる
3. リズムを調整`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'バッキングとは',
      content: `<strong>バッキング</strong>は伴奏のことです。

<strong>リフとの違い:</strong>
- リフ: 目立つ、メロディ的
- バッキング: 支える、伴奏

<strong>バッキングの役割:</strong>
- コードを鳴らす
- リズムを刻む
- 曲を支える

<strong>使いどころ:</strong>
- ボーカルがいるパート
- Aメロ、Bメロ、サビ

<strong>特徴:</strong>
- 控えめ
- 一定のパターン
- ボーカルを邪魔しない`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：シンプルなリフ',
      content: `短いリフを作りましょう。

<strong>課題：2小節リフ</strong>

ギタートラックに：

<strong>小節1:</strong>
0拍目: 0⁽³⁾のパワーコード [48, 55]
1拍目: 3⁽³⁾ 単音（MIDI 51）
1.5拍目: 5⁽³⁾ 単音（MIDI 53）
2拍目: 0⁽³⁾のパワーコード
3拍目: 休み

<strong>小節2:</strong>
4拍目: 0⁽³⁾のパワーコード
5拍目: 7⁽³⁾ 単音（MIDI 55）
5.5拍目: 5⁽³⁾ 単音（MIDI 53）
6拍目: 3⁽³⁾ 単音（MIDI 51）
7拍目: 0⁽³⁾のパワーコード`,
      targetTrack: 'guitar',
      hints: [
        'パワーコードと単音を混ぜる',
        'リズムに変化を',
        '繰り返して確認',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'バッキングパターン',
      content: `よく使うバッキングパターンです。

<strong>1. 白玉（全音符）:</strong>
| ジャーン |
バラード、静かなパート

<strong>2. 4分ストローク:</strong>
| ジャン | ジャン | ジャン | ジャン |
普通のポップス

<strong>3. 8分ストローク:</strong>
| ジャカ | ジャカ | ジャカ | ジャカ |
アップテンポ

<strong>4. ブリッジミュート刻み:</strong>
| ズクズク | ズクズク |
ロック、激しめ

<strong>アニソンのサビ:</strong>
パターン3か4が多い。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'キーボードとの棲み分け',
      content: `ギターとキーボードは被りやすい。

<strong>方法1: パートで分ける</strong>
- Aメロ: キーボード主体
- Bメロ: ギター主体
- サビ: 両方

<strong>方法2: 奏法で分ける</strong>
- ギター: 刻み（8分）
- キーボード: 白玉パッド

<strong>方法3: 音域で分ける</strong>
- ギター: オクターブ3
- キーボード: オクターブ4-5

<strong>方法4: L/Rで分ける</strong>
- ギター: 左に振る
- キーボード: 右に振る
（ミックス時に）

<strong>重要:</strong>
両方全開だとうるさい。
どちらかを控えめに。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：リフとバッキング',
      content: 'ギターの役割を確認しましょう。',
      question: 'ボーカルがいるパートで主に演奏するのは？',
      options: [
        'リフ',
        'バッキング',
        'ソロ',
        '無音',
      ],
      correctIndex: 1,
      explanation: 'ボーカルがいるパート（Aメロ、サビなど）ではバッキングで伴奏します。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>リフ</strong>
   - 印象的なフレーズ
   - イントロ、間奏

2. <strong>バッキング</strong>
   - 伴奏
   - ボーカルを支える

3. <strong>パターン</strong>
   - 白玉〜8分刻み
   - パームミュート

4. <strong>キーボードとの分担</strong>
   - 奏法、音域で分ける

<strong>次のレッスン：</strong>
ギターパターン集を学びます。`,
    },
  ],
}
