/**
 * Phase 8 - Lesson 8.1: 曲構成の基本
 *
 * 学ぶこと:
 * - セクションとは
 * - 基本的な曲構成
 * - 小節数の考え方
 */
import { Lesson } from '../../types/lesson'

export const phase8Lesson1: Lesson = {
  id: 'phase8-lesson1',
  phaseId: 8,
  lessonNumber: 1,
  title: '曲構成の基本',
  description: '曲の全体像を理解する',
  estimatedMinutes: 25,
  prerequisites: ['phase7-lesson4'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'セクションとは',
      content: `曲は複数の<strong>セクション</strong>で構成されます。

<strong>主なセクション:</strong>
- イントロ（Intro）: 曲の導入
- Aメロ（Verse）: 静かなパート
- Bメロ（Pre-Chorus）: 橋渡し
- サビ（Chorus）: 盛り上がり
- 間奏（Interlude）: 楽器のみ
- アウトロ（Outro）: 曲の締め

<strong>日本の呼び方:</strong>
Aメロ、Bメロ、サビは日本独自。
海外ではVerse、Pre-Chorus、Chorus。

<strong>セクションの役割:</strong>
曲に「起承転結」を作る。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: '基本構成',
      content: `最も基本的な曲構成です。

<strong>シンプル構成:</strong>
イントロ → Aメロ → Bメロ → サビ
→ Aメロ → Bメロ → サビ
→ アウトロ

<strong>拡張構成:</strong>
イントロ → Aメロ → Bメロ → サビ
→ 間奏
→ Aメロ → Bメロ → サビ
→ Cメロ（大サビ前）
→ 落ちサビ → 大サビ
→ アウトロ

<strong>アニソンの特徴:</strong>
TV版: 1分30秒（1コーラス）
フル版: 4-5分（2-3コーラス）`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: '小節数の基本',
      content: `セクションは4の倍数が基本です。

<strong>典型的な小節数:</strong>
- イントロ: 4-8小節
- Aメロ: 8-16小節
- Bメロ: 4-8小節
- サビ: 8-16小節
- 間奏: 4-8小節
- アウトロ: 4-8小節

<strong>なぜ4の倍数？:</strong>
- 4/4拍子との相性
- 繰り返しが自然
- 人間が心地よい周期

<strong>例外:</strong>
2小節のつなぎ
奇数小節の変拍子部分
（でも基本は4の倍数）`,
    },
    {
      id: 'step4',
      type: 'theory',
      title: 'コード進行とセクション',
      content: `セクションごとにコード進行を設定します。

<strong>例（キー0）:</strong>

<strong>Aメロ（8小節）:</strong>
| 0 | 5m | 9m | 4 |
| 0 | 5m | 4 | 7 |

<strong>Bメロ（4小節）:</strong>
| 9m | 4 | 0 | 7 |

<strong>サビ（8小節）:</strong>
| 0 | 7 | 9m | 4 |
| 5m | 2 | 4 | 7 |

<strong>ポイント:</strong>
- Aメロ: 安定、繰り返し
- Bメロ: 変化、期待感
- サビ: キャッチー、盛り上がり

<strong>サビの終わり:</strong>
7（ドミナント）で終わると
次のセクションにつながる。`,
    },
    {
      id: 'step5',
      type: 'quiz',
      title: '確認クイズ：曲構成',
      content: '曲構成の基本を確認しましょう。',
      question: '一般的なセクションの小節数は？',
      options: [
        '3の倍数',
        '4の倍数',
        '5の倍数',
        '7の倍数',
      ],
      correctIndex: 1,
      explanation: 'セクションは4の倍数（4, 8, 16小節）が基本です。4/4拍子との相性が良いためです。',
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'TV版とフル版',
      content: `アニソンには2つのバージョンがあります。

<strong>TV版（1分30秒）:</strong>
- OPやEDで流れる
- 1コーラスのみ
- イントロ→A→B→サビ→アウトロ

<strong>フル版（4-5分）:</strong>
- CDやストリーミング
- 2-3コーラス
- 間奏やCメロあり

<strong>TV版の構成例:</strong>
イントロ: 8小節（約15秒）
Aメロ: 8小節（約15秒）
Bメロ: 8小節（約15秒）
サビ: 16小節（約30秒）
アウトロ: 8小節（約15秒）
計: 約1分30秒

<strong>まずはTV版を目指そう！</strong>`,
    },
    {
      id: 'step7',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>セクション</strong>
   - イントロ〜アウトロ
   - 各パートの役割

2. <strong>基本構成</strong>
   - A→B→サビの繰り返し
   - 起承転結

3. <strong>小節数</strong>
   - 4の倍数が基本
   - 8小節が標準

4. <strong>TV版/フル版</strong>
   - 1分30秒 vs 4-5分

<strong>次のレッスン：</strong>
各セクションの詳細を学びます。`,
    },
  ],
}
