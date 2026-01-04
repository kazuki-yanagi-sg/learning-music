/**
 * Phase 4 - Lesson 4.1: リズムの基礎
 *
 * 学ぶこと:
 * - 拍子とビート
 * - BPMの意味
 * - 基本的なリズムパターン
 */
import { Lesson } from '../../types/lesson'

export const phase4Lesson1: Lesson = {
  id: 'phase4-lesson1',
  phaseId: 4,
  lessonNumber: 1,
  title: 'リズムの基礎',
  description: '拍子、BPM、基本パターンを理解する',
  estimatedMinutes: 20,
  prerequisites: ['phase1-lesson4'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: '拍子とは',
      content: `<strong>拍子</strong>とは、リズムの基本単位です。

<strong>4/4拍子（4分の4拍子）:</strong>
- 1小節に4拍
- 最も一般的
- ほとんどのアニソンはこれ

<strong>拍の強弱:</strong>
1拍目: 強（ダウンビート）
2拍目: 弱
3拍目: やや強
4拍目: 弱

この繰り返しが「ビート」を生みます。

<strong>他の拍子:</strong>
- 3/4: ワルツ（1-2-3、1-2-3）
- 6/8: 複合拍子
- 変拍子: プログレ系

<strong>アニソンは 4/4 が99%です。</strong>`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'BPM',
      content: `<strong>BPM</strong>（Beats Per Minute）は曲の速さです。

1分間に何回拍を打つか。

<strong>BPMの目安:</strong>
| BPM | 速さ | アニソン例 |
|-----|------|-----------|
| 60-80 | 遅い | バラード |
| 80-100 | やや遅い | ミドルバラード |
| 100-120 | 普通 | 一般的なポップス |
| 120-140 | やや速い | アップテンポ |
| 140-160 | 速い | ダンス系 |
| 160-180 | とても速い | 激しい曲 |
| 180+ | 超高速 | スピードコア系 |

<strong>アニソンの典型:</strong>
- アップテンポOP: 140-160
- バラードED: 70-90
- 日常系: 110-130`,
    },
    {
      id: 'step3',
      type: 'quiz',
      title: '確認クイズ：BPM',
      content: 'BPMと曲調の関係を確認しましょう。',
      question: '「熱いバトル曲」に適したBPMは？',
      options: [
        '70-80',
        '100-110',
        '150-170',
        '200以上',
      ],
      correctIndex: 2,
      explanation: '熱いバトル曲は150-170程度が適切。速すぎると疾走感より混乱になります。',
    },
    {
      id: 'step4',
      type: 'theory',
      title: '4つ打ち',
      content: `<strong>4つ打ち</strong>は最も基本的なリズムパターンです。

キックを毎拍打つ:
1拍目: キック
2拍目: キック
3拍目: キック
4拍目: キック

ドンドンドンドン...

<strong>特徴:</strong>
- シンプルで力強い
- ダンスミュージックの基本
- EDM、ハウス、テクノ

<strong>アニソンでの使用:</strong>
- サビで4つ打ち
- 盛り上がるパート
- ライブ映えする曲

<strong>変形:</strong>
1・3拍目にキック、2・4拍目にスネア
→ 「ドンタンドンタン」パターン`,
    },
    {
      id: 'step5',
      type: 'theory',
      title: '8ビート',
      content: `<strong>8ビート</strong>はロックの基本パターンです。

<strong>構成:</strong>
- キック: 1拍目、3拍目
- スネア: 2拍目、4拍目
- ハイハット: 8分音符で刻む

<strong>パターン:</strong>
ハイハット: チチチチチチチチ（8回）
キック:     ド　　ド
スネア:       タン　タン

<strong>特徴:</strong>
- 推進力がある
- ロック、ポップスの定番
- ほとんどのアニソンの基本

<strong>バリエーション:</strong>
- キックの位置を変える
- ハイハットを16分に
- ゴーストノートを追加`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'バックビート',
      content: `<strong>バックビート</strong>とは2拍目と4拍目を強調することです。

1拍目: （弱）
2拍目: <strong>スネア！</strong>
3拍目: （弱）
4拍目: <strong>スネア！</strong>

<strong>効果:</strong>
- グルーヴが出る
- ノリが良くなる
- 「裏打ち」の感覚

<strong>ポイント:</strong>
スネアはバックビート（2・4拍）に置く。
これがロック/ポップスの大原則。

<strong>逆パターン:</strong>
1・3拍にスネア = 「表打ち」
→ 行進曲っぽくなる（あまり使わない）`,
    },
    {
      id: 'step7',
      type: 'exercise',
      title: '実践：基本8ビート',
      content: `基本の8ビートパターンを作りましょう。

<strong>課題：2小節の8ビート</strong>

ドラムトラックに：

<strong>キック（ピッチ36）:</strong>
0拍目、2拍目、4拍目、6拍目

<strong>スネア（ピッチ38）:</strong>
1拍目、3拍目、5拍目、7拍目

<strong>ハイハット（ピッチ42）:</strong>
0, 0.5, 1, 1.5, 2, 2.5, ... と8分音符で`,
      targetTrack: 'drum',
      hints: [
        'キックは偶数拍（0, 2, 4, 6）',
        'スネアは奇数拍（1, 3, 5, 7）',
        'ハイハットは0.5刻み',
      ],
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>拍子</strong>
   - 4/4拍子が基本
   - 1小節 = 4拍

2. <strong>BPM</strong>
   - 曲の速さ
   - アニソンは120-160が多い

3. <strong>基本パターン</strong>
   - 4つ打ち: 毎拍キック
   - 8ビート: キック+スネア+ハイハット
   - バックビート: 2・4拍にスネア

<strong>次のレッスン：</strong>
ドラムキットの各楽器を学びます。`,
    },
  ],
}
