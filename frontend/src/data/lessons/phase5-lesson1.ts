/**
 * Phase 5 - Lesson 5.1: ベースの役割
 *
 * 学ぶこと:
 * - ベースとは何か
 * - 曲における役割
 * - 音域とピッチ
 */
import { Lesson } from '../../types/lesson'

export const phase5Lesson1: Lesson = {
  id: 'phase5-lesson1',
  phaseId: 5,
  lessonNumber: 1,
  title: 'ベースの役割',
  description: '低音で曲を支える楽器',
  estimatedMinutes: 20,
  prerequisites: ['phase4-lesson4'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'ベースとは',
      content: `<strong>ベース</strong>は曲の最低音を担当する楽器です。

<strong>主な種類:</strong>
- エレキベース: ロック、ポップス
- シンセベース: EDM、アニソン
- アコースティックベース: ジャズ

<strong>特徴:</strong>
- 低い音域（主にオクターブ1-3）
- 曲の「土台」を作る
- ドラムと一緒に「リズム隊」

<strong>アニソンでは:</strong>
シンセベースが多い。
太くて存在感のある音。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'ベースの3つの役割',
      content: `ベースには大きく3つの役割があります。

<strong>1. 和声の土台</strong>
コードの「根音（ルート）」を演奏。
例: 0のコード → ベースは0を弾く

<strong>2. リズムの推進</strong>
ドラムと連携してグルーヴを作る。
キックと同じタイミングで弾くことが多い。

<strong>3. メロディとの橋渡し</strong>
低音と高音をつなぐ。
コードとメロディの接着剤。

<strong>重要度:</strong>
ベースがないと曲が「軽く」なる。
ベースがあると曲が「締まる」。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'ベースの音域',
      content: `ベースは低い音域を使います。

<strong>標準的な音域:</strong>
- 最低音: 4⁽¹⁾（MIDI 28）
- 最高音: 7⁽³⁾（MIDI 55）程度

<strong>よく使う音域:</strong>
- オクターブ1-2: 太くて深い
- オクターブ3: やや高め、メロディ的

<strong>このアプリのベーストラック:</strong>
MIDI 24-59 を表示
（0⁽¹⁾から11⁽³⁾まで）

<strong>注意:</strong>
低すぎると聞こえにくい。
高すぎるとベースらしくない。
オクターブ1-2がメイン。`,
    },
    {
      id: 'step4',
      type: 'theory',
      title: 'ベースとキックの関係',
      content: `ベースとキックは「低音コンビ」です。

<strong>基本ルール:</strong>
キックが鳴るところでベースも鳴らす。

<strong>例（8ビート）:</strong>
キック: 0拍目、2拍目
ベース: 0拍目、2拍目

<strong>同期させる理由:</strong>
- 低音が重なって太くなる
- リズムが安定する
- グルーヴが生まれる

<strong>応用:</strong>
完全に同期させなくてもOK。
ベースで「つなぎ」を入れる。

例:
キック: 0拍目
ベース: 0拍目、0.5拍目（経過音）`,
    },
    {
      id: 'step5',
      type: 'quiz',
      title: '確認クイズ：ベースの役割',
      content: 'ベースの役割を確認しましょう。',
      question: 'ベースが主に演奏するのは？',
      options: [
        'コードの最高音',
        'コードのルート（根音）',
        'メロディと同じ音',
        'ドラムと同じリズム',
      ],
      correctIndex: 1,
      explanation: 'ベースは主にコードのルート（根音）を演奏し、和声の土台を作ります。',
    },
    {
      id: 'step6',
      type: 'exercise',
      title: '実践：ベースを置いてみよう',
      content: `簡単なベースを打ち込みましょう。

<strong>課題：ルート音だけのベース</strong>

キーを0（Cメジャー）に設定。

ベーストラックに：
- 0拍目: 0⁽²⁾（MIDI 36）
- 2拍目: 0⁽²⁾
- 4拍目: 7⁽¹⁾（MIDI 31）
- 6拍目: 7⁽¹⁾

これで「0のコード2小節 → 7のコード2小節」という
進行のベースになります。`,
      targetTrack: 'bass',
      hints: [
        '0⁽²⁾ = MIDI 36',
        '7⁽¹⁾ = MIDI 31',
        'キックと同じタイミングで',
      ],
    },
    {
      id: 'step7',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>ベースの役割</strong>
   - 和声の土台
   - リズムの推進
   - 低音を担当

2. <strong>音域</strong>
   - オクターブ1-2がメイン
   - 低すぎず高すぎず

3. <strong>キックとの関係</strong>
   - 同期させると太い
   - 低音コンビ

<strong>次のレッスン：</strong>
ルート弾きのパターンを学びます。`,
    },
  ],
}
