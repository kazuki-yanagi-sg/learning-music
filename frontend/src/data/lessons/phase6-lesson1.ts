/**
 * Phase 6 - Lesson 6.1: キーボードの役割
 *
 * 学ぶこと:
 * - キーボードパートとは
 * - 和声を担当
 * - 音域と配置
 */
import { Lesson } from '../../types/lesson'

export const phase6Lesson1: Lesson = {
  id: 'phase6-lesson1',
  phaseId: 6,
  lessonNumber: 1,
  title: 'キーボードの役割',
  description: '和声を彩る楽器パート',
  estimatedMinutes: 20,
  prerequisites: ['phase5-lesson4'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'キーボードパートとは',
      content: `<strong>キーボードパート</strong>はコードを演奏するパートです。

<strong>主な楽器:</strong>
- ピアノ
- シンセサイザー
- オルガン
- ストリングス（弦楽器パッド）

<strong>役割:</strong>
- 和声（コード）を鳴らす
- 曲の雰囲気を作る
- ベースとメロディの間を埋める

<strong>アニソンでは:</strong>
シンセパッドやピアノが多い。
サビでストリングスを重ねることも。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'ベースとの役割分担',
      content: `ベースとキーボードは役割が違います。

<strong>ベース:</strong>
- ルート（根音）を担当
- 低い音域
- 単音が基本

<strong>キーボード:</strong>
- コード（和音）を担当
- 中〜高音域
- 複数の音を同時に

<strong>重要:</strong>
ベースがルートを弾くので、
キーボードはルートを省略してOK。

<strong>例（0のメジャーコード）:</strong>
- ベース: 0⁽²⁾
- キーボード: [4⁽⁴⁾, 7⁽⁴⁾] または [0⁽⁴⁾, 4⁽⁴⁾, 7⁽⁴⁾]

ルートはベースに任せる。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'キーボードの音域',
      content: `キーボードは中〜高音域を使います。

<strong>標準的な音域:</strong>
- 最低音: 0⁽³⁾（MIDI 48）
- 最高音: 0⁽⁶⁾（MIDI 84）程度

<strong>使い分け:</strong>
- オクターブ3: 落ち着いた響き
- オクターブ4: 標準的
- オクターブ5: 明るい、華やか

<strong>このアプリのキーボードトラック:</strong>
MIDI 48-84 を表示
（0⁽³⁾から0⁽⁶⁾まで）

<strong>注意:</strong>
低すぎるとベースと被る。
高すぎるとメロディと被る。`,
    },
    {
      id: 'step4',
      type: 'theory',
      title: 'コードの打ち込み方',
      content: `コードを打ち込む基本です。

<strong>白玉（ホールノート）:</strong>
1小節まるまる伸ばす。
バラード、静かなパート。

<strong>刻み:</strong>
8分や4分で繰り返す。
アップテンポ、リズミカル。

<strong>アルペジオ:</strong>
コードの音を順番に弾く。
次のレッスンで詳しく。

<strong>パッド:</strong>
長く伸ばす音色。
背景を埋める。

<strong>アニソンでは:</strong>
Aメロ: 白玉かアルペジオ
サビ: 刻みかパッド`,
    },
    {
      id: 'step5',
      type: 'exercise',
      title: '実践：コードを置く',
      content: `簡単なコード進行を打ち込みましょう。

<strong>課題：4小節の白玉コード</strong>

コード進行: 0 → 5 → 9 → 4

キーボードトラックに：

<strong>小節1（0メジャー）:</strong>
0拍目: [0⁽⁴⁾, 4⁽⁴⁾, 7⁽⁴⁾]（MIDI 60, 64, 67）

<strong>小節2（5マイナー）:</strong>
4拍目: [5⁽⁴⁾, 8⁽⁴⁾, 0⁽⁵⁾]（MIDI 65, 68, 72）

<strong>小節3（9マイナー）:</strong>
8拍目: [9⁽⁴⁾, 0⁽⁵⁾, 4⁽⁵⁾]（MIDI 69, 72, 76）

<strong>小節4（4メジャー）:</strong>
12拍目: [4⁽⁴⁾, 8⁽⁴⁾, 11⁽⁴⁾]（MIDI 64, 68, 71）`,
      targetTrack: 'keyboard',
      hints: [
        '3音同時に置く',
        'デュレーションは4拍（1小節）',
        'オクターブ4-5で',
      ],
    },
    {
      id: 'step6',
      type: 'quiz',
      title: '確認クイズ：キーボード',
      content: 'キーボードパートの基本を確認しましょう。',
      question: 'キーボードパートの主な役割は？',
      options: [
        'リズムを刻む',
        'ルート音を弾く',
        '和音（コード）を演奏する',
        'メロディを弾く',
      ],
      correctIndex: 2,
      explanation: 'キーボードパートの主な役割は和音（コード）を演奏して曲の和声を作ることです。',
    },
    {
      id: 'step7',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>キーボードの役割</strong>
   - コードを演奏
   - 和声を担当

2. <strong>ベースとの分担</strong>
   - ベース: ルート
   - キーボード: 和音

3. <strong>音域</strong>
   - オクターブ3-5
   - 中音域メイン

4. <strong>打ち込み方</strong>
   - 白玉、刻み、アルペジオ

<strong>次のレッスン：</strong>
コードボイシングを学びます。`,
    },
  ],
}
