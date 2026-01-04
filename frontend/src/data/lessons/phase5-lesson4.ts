/**
 * Phase 5 - Lesson 5.4: ベースラインパターン
 *
 * 学ぶこと:
 * - 経過音
 * - アプローチノート
 * - 定番パターン
 */
import { Lesson } from '../../types/lesson'

export const phase5Lesson4: Lesson = {
  id: 'phase5-lesson4',
  phaseId: 5,
  lessonNumber: 4,
  title: 'ベースラインパターン',
  description: 'ルート以外の音を使ったライン',
  estimatedMinutes: 30,
  prerequisites: ['phase5-lesson3'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: '経過音とは',
      content: `<strong>経過音</strong>はルートとルートをつなぐ音です。

<strong>例: 0 → 5 の進行</strong>

ルートだけ:
| 0 | - | 5 | - |

経過音あり:
| 0 | 2 | 3 | 5 |

<strong>効果:</strong>
- 滑らかにつながる
- 動きが出る
- プロっぽくなる

<strong>選び方:</strong>
- スケール内の音を使う
- 次のルートに向かって進む
- 半音アプローチも有効`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'アプローチノート',
      content: `<strong>アプローチノート</strong>は
次のルートの直前に入れる音です。

<strong>半音アプローチ:</strong>
次のルートの±1の音を入れる。

例（0 → 5）:
| 0 | - | - | 4 | 5 |
4は5の半音下。

<strong>全音アプローチ:</strong>
次のルートの±2の音を入れる。

例（0 → 5）:
| 0 | - | - | 3 | 5 |
3は5の全音下。

<strong>どちらが良い？</strong>
半音: テンション感あり
全音: 自然な流れ

<strong>定番:</strong>
下からのアプローチが多い。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: '5度を使ったライン',
      content: `ルートと5度（距離7）を使うパターンです。

<strong>基本:</strong>
ルート: 0
5度: 7（距離7上）

<strong>パターン例:</strong>
| ルート | 5度 | ルート | 5度 |
| 0 | 7 | 0 | 7 |

<strong>効果:</strong>
- ルート弾きより動きがある
- でも安定感がある
- ロックの定番

<strong>オクターブと組み合わせ:</strong>
| 低ルート | 5度 | 高ルート | 5度 |
| 0⁽²⁾ | 7⁽²⁾ | 0⁽³⁾ | 7⁽²⁾ |

<strong>5度の計算:</strong>
ルート + 7（mod 12で考える）
0のルート → 5度は7
5のルート → 5度は0`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：5度ライン',
      content: `ルートと5度を使ったラインを作りましょう。

<strong>課題：ルート+5度パターン（2小節）</strong>

ルートは0。

ベーストラックに：
- 0拍目: 0⁽²⁾（MIDI 36）ルート
- 1拍目: 7⁽²⁾（MIDI 43）5度
- 2拍目: 0⁽²⁾ ルート
- 3拍目: 7⁽²⁾ 5度
- 4-7拍目: 同じパターン`,
      targetTrack: 'bass',
      hints: [
        '0のルート = MIDI 36',
        '0の5度 = 7（MIDI 43）',
        '交互に弾く',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: 'ウォーキングベース風',
      content: `<strong>ウォーキングベース</strong>は
4分音符で歩くように動くラインです。

<strong>ジャズの基本だが、アニソンでも使える。</strong>

<strong>基本ルール:</strong>
- スケール内の音を使う
- 次のコードへ向かう
- 毎拍違う音

<strong>例（0 → 5）:</strong>
小節1: | 0 | 2 | 4 | 5 |
小節2: | 5 | 7 | 9 | 0 |

<strong>使いどころ:</strong>
- Aメロの静かなパート
- おしゃれな雰囲気
- ジャズ風アレンジ

<strong>注意:</strong>
サビには向かない。
激しい曲では使わない。`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'アニソン定番ベースライン',
      content: `アニソンでよく使われるパターンです。

<strong>1. 8分オクターブ（サビ）:</strong>
| 低 | 高 | 低 | 高 | 低 | 高 | 低 | 高 |
ドライブ感、盛り上がり

<strong>2. シンコペーション:</strong>
| ルート | 休 | 休 | ルート | 休 | 高 | 休 | 低 |
リズミカル、グルーヴ

<strong>3. キックユニゾン:</strong>
キックと完全同期
| K+B | 休 | K+B | 休 |
シンプルで太い

<strong>4. 経過音入り:</strong>
| ルート | 休 | 経過 | 次ルート |
コード変化を滑らかに

<strong>使い分け:</strong>
Aメロ: 3か4
Bメロ: 4
サビ: 1か2`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：ベースライン',
      content: 'ベースラインの要素を確認しましょう。',
      question: '「5のルート」の5度（距離7）は？',
      options: [
        '0',
        '5',
        '7',
        '12',
      ],
      correctIndex: 0,
      explanation: '5 + 7 = 12。12 mod 12 = 0。5のルートの5度は0です。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>経過音</strong>
   - ルートをつなぐ
   - スケール内から選ぶ

2. <strong>アプローチノート</strong>
   - 半音または全音下から
   - 次のルートへ向かう

3. <strong>5度ライン</strong>
   - ルート + 距離7
   - 安定感と動き

4. <strong>定番パターン</strong>
   - オクターブ
   - シンコペーション
   - キックユニゾン

<strong>Phase 5 完了！</strong>
次のフェーズではキーボードパートを学びます。`,
    },
  ],
}
