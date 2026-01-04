/**
 * Phase 7 - Lesson 7.2: パワーコード
 *
 * 学ぶこと:
 * - パワーコードの構造
 * - 打ち込み方
 * - パワーコード進行
 */
import { Lesson } from '../../types/lesson'

export const phase7Lesson2: Lesson = {
  id: 'phase7-lesson2',
  phaseId: 7,
  lessonNumber: 2,
  title: 'パワーコード',
  description: 'ロックの基本コード',
  estimatedMinutes: 25,
  prerequisites: ['phase7-lesson1'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'パワーコードとは',
      content: `<strong>パワーコード</strong>はルートと5度だけのコードです。

<strong>構造:</strong>
[0, 7]（距離0と距離7）

<strong>例（0のパワーコード）:</strong>
0⁽³⁾ + 7⁽³⁾
= MIDI 48 + MIDI 55

<strong>特徴:</strong>
- 2音だけ
- メジャー/マイナーの区別がない
- 力強い響き
- ロックの基本

<strong>なぜ「パワー」？:</strong>
- 歪みに強い
- シンプルで太い
- どんな曲にも合う`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'オクターブ追加',
      content: `パワーコードにオクターブを足すと厚くなります。

<strong>2音パワーコード:</strong>
[0, 7]
シンプル、軽め

<strong>3音パワーコード（オクターブ追加）:</strong>
[0, 7, 0+12]
つまり [0⁽³⁾, 7⁽³⁾, 0⁽⁴⁾]
厚い、力強い

<strong>使い分け:</strong>
- Aメロ: 2音
- サビ: 3音
- 激しい曲: 常に3音

<strong>アニソンでは:</strong>
3音パワーコードが基本。
サビでは特に厚く。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'パワーコードの移調',
      content: `パワーコードの移調は簡単です。

<strong>基本形 [0, 7] を移調:</strong>

0のパワーコード: [0, 7]
5のパワーコード: [5, 0]（5+7=12→0）
7のパワーコード: [7, 2]（7+7=14→2）
9のパワーコード: [9, 4]

<strong>計算方法:</strong>
ルート + 7（mod 12）= 5度

<strong>MIDIで考える場合:</strong>
ルートのMIDI + 7 = 5度のMIDI

例: 0⁽³⁾(48) のパワーコード
48 + 7 = 55 = 7⁽³⁾

<strong>実践:</strong>
コード進行に沿って
パワーコードを並べるだけ！`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：パワーコード進行',
      content: `パワーコード進行を打ち込みましょう。

<strong>課題：0→5→7→0 の進行</strong>

ギタートラックに（2分音符）：

<strong>0のパワーコード（0拍目）:</strong>
[0⁽³⁾, 7⁽³⁾, 0⁽⁴⁾]（MIDI 48, 55, 60）

<strong>5のパワーコード（2拍目）:</strong>
[5⁽³⁾, 0⁽⁴⁾, 5⁽⁴⁾]（MIDI 53, 60, 65）

<strong>7のパワーコード（4拍目）:</strong>
[7⁽³⁾, 2⁽⁴⁾, 7⁽⁴⁾]（MIDI 55, 62, 67）

<strong>0のパワーコード（6拍目）:</strong>
[0⁽³⁾, 7⁽³⁾, 0⁽⁴⁾]（MIDI 48, 55, 60）`,
      targetTrack: 'guitar',
      hints: [
        '3音同時に置く',
        '2拍ごとにコード変更',
        'オクターブ3-4で',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'パームミュート',
      content: `<strong>パームミュート</strong>はギターの定番奏法です。

<strong>音の特徴:</strong>
「ズンズン」「ドゥドゥ」という
短く詰まった音。

<strong>打ち込み方:</strong>
- デュレーション: 短め（0.25拍程度）
- ベロシティ: やや控えめ（70-90）
- 8分または16分で刻む

<strong>使いどころ:</strong>
- イントロ
- Aメロ
- Bメロの盛り上げ

<strong>サビでは:</strong>
パームミュートを解除して
開放的に鳴らすことが多い。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'パワーコードのリズム',
      content: `パワーコードの刻み方です。

<strong>基本（2分音符）:</strong>
| ズーン | ズーン |
シンプル、バラード向き

<strong>4分刻み:</strong>
| ズン | ズン | ズン | ズン |
普通のロック

<strong>8分刻み:</strong>
| ズズ | ズズ | ズズ | ズズ |
激しいロック

<strong>シンコペーション:</strong>
| ズン | 休 | ズン | ズン |
ファンキー、ポップ

<strong>アニソンのサビ:</strong>
8分刻みが王道。
ドラムと同期させる。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：パワーコード',
      content: 'パワーコードの構造を確認しましょう。',
      question: '「5のパワーコード」の構成音は？',
      options: [
        '[5, 8]',
        '[5, 9]',
        '[5, 0]',
        '[5, 7]',
      ],
      correctIndex: 2,
      explanation: 'パワーコードはルート+距離7。5+7=12=0（mod 12）なので[5, 0]です。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>パワーコード</strong>
   - [ルート, +7]
   - 2音または3音

2. <strong>移調</strong>
   - ルート+7=5度
   - mod 12で計算

3. <strong>パームミュート</strong>
   - 短いデュレーション
   - ズンズン音

4. <strong>リズム</strong>
   - 2分〜8分刻み
   - サビは8分

<strong>次のレッスン：</strong>
リフとバッキングを学びます。`,
    },
  ],
}
