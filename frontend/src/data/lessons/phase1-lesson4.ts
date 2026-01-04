/**
 * Phase 1 - Lesson 1.4: MIDIの基礎
 *
 * 学ぶこと:
 * - ベロシティ（強さ）
 * - デュレーション（長さ）
 * - ノートの3要素: pitch, velocity, duration
 */
import { Lesson } from '../../types/lesson'

export const phase1Lesson4: Lesson = {
  id: 'phase1-lesson4',
  phaseId: 1,
  lessonNumber: 4,
  title: 'MIDIの基礎',
  description: 'ベロシティとデュレーションを理解する',
  estimatedMinutes: 20,
  prerequisites: ['phase1-lesson1'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'ノートの3要素',
      content: `MIDIノートには3つの要素があります：

<strong>1. ピッチ (Pitch)</strong>
- 音の高さ
- 0〜127（このアプリでは n⁽ᵏ⁾ 表記）
- Lesson 1.1 で学びました

<strong>2. ベロシティ (Velocity)</strong>
- 音の強さ・音量
- 0〜127
- 今回学びます

<strong>3. デュレーション (Duration)</strong>
- 音の長さ
- 拍単位で指定
- 今回学びます

これら3つの組み合わせで、あらゆる演奏を表現できます。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'ベロシティ',
      content: `<strong>ベロシティ</strong>は音の強さを表します。

範囲: 0〜127

| 値 | 強さ | 使いどころ |
|---|------|----------|
| 0 | 無音 | （使わない） |
| 1-31 | pp（とても弱い）| バラードの静かな部分 |
| 32-63 | p（弱い）| 伴奏、背景 |
| 64-95 | mf（中程度）| 通常のメロディ |
| 96-127 | f〜ff（強い）| サビ、アクセント |

<strong>ポイント:</strong>
- 同じメロディでもベロシティで表情が変わる
- 強弱をつけると生き生きした演奏になる
- アクセントをつけたい音は高めに設定`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'デュレーション',
      content: `<strong>デュレーション</strong>は音の長さを表します。

このアプリでは拍単位で指定します：

| 値 | 長さ | 音符名 |
|---|------|--------|
| 0.25 | 1/4拍 | 16分音符 |
| 0.5 | 1/2拍 | 8分音符 |
| 1 | 1拍 | 4分音符 |
| 2 | 2拍 | 2分音符 |
| 4 | 4拍（1小節）| 全音符 |

<strong>ポイント:</strong>
- 短いノートはスタッカート的
- 長いノートはレガート的
- 音符を重ねる（オーバーラップ）と滑らかに聞こえる`,
    },
    {
      id: 'step4',
      type: 'quiz',
      title: '確認クイズ：ベロシティ',
      content: 'ベロシティの使い方を確認しましょう。',
      question: 'サビで盛り上がる部分のベロシティは？',
      options: [
        '20-40（弱い）',
        '50-70（中程度）',
        '90-120（強い）',
        '127のみ',
      ],
      correctIndex: 2,
      explanation: 'サビなど盛り上がる部分は90-120程度の強いベロシティが適切です。127だけだと単調になります。',
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'ドラムのベロシティ',
      content: `ドラムはベロシティが特に重要です。

<strong>キック（バスドラム）</strong>
- 強拍（1拍目、3拍目）: 100-120
- 弱拍: 80-100

<strong>スネア</strong>
- バックビート（2拍目、4拍目）: 100-127
- ゴーストノート: 40-60

<strong>ハイハット</strong>
- アクセント: 90-110
- 通常: 60-80
- ゴースト: 30-50

<strong>ポイント:</strong>
ベロシティに変化をつけることで「人間らしい」グルーヴが生まれます。
全部同じベロシティだと機械的に聞こえます。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'ゲートタイム',
      content: `<strong>ゲートタイム</strong>とは、音が実際に鳴っている時間です。

デュレーションとの違い：
- デュレーション: ノートの配置上の長さ
- ゲートタイム: 実際に音が出ている長さ

例えば：
- デュレーション = 1拍
- ゲートタイム = 0.8拍

→ 0.2拍分の「隙間」ができる

<strong>スタイル別の目安:</strong>
- レガート: 100%（繋がる）
- ノーマル: 80-90%
- スタッカート: 50%以下

このアプリでは、デュレーションがそのままゲートタイムになります。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：デュレーション',
      content: 'デュレーションの計算をしましょう。',
      question: '1小節（4拍）の中に8分音符を敷き詰めると何個？',
      options: [
        '4個',
        '8個',
        '16個',
        '32個',
      ],
      correctIndex: 1,
      explanation: '8分音符のデュレーションは0.5拍。4拍 ÷ 0.5 = 8個です。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'MIDIデータの構造',
      content: `MIDIデータをコードで表すと：

<strong>ノート1つ:</strong>
{
  pitch: 60,      // 0⁽⁴⁾
  velocity: 100,  // 強め
  start: 0,       // 0拍目から
  duration: 1     // 1拍間
}

<strong>和音:</strong>
[
  { pitch: 60, velocity: 100, start: 0, duration: 1 },
  { pitch: 64, velocity: 95, start: 0, duration: 1 },
  { pitch: 67, velocity: 90, start: 0, duration: 1 }
]

<strong>ポイント:</strong>
和音の各音のベロシティを少しずらすと、より自然な響きになります。`,
    },
    {
      id: 'step9',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>ノートの3要素</strong>
   - ピッチ: 音の高さ（0-127）
   - ベロシティ: 音の強さ（0-127）
   - デュレーション: 音の長さ（拍単位）

2. <strong>ベロシティ</strong>
   - 強弱で表情をつける
   - ドラムは特に重要
   - 変化をつけると人間らしくなる

3. <strong>デュレーション</strong>
   - 0.5 = 8分音符、1 = 4分音符
   - 長さで演奏のスタイルが変わる

<strong>Phase 1 完了！</strong>
次のフェーズではスケールと進行を学びます。`,
    },
  ],
}
