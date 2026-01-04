/**
 * Phase 8 - Lesson 8.2: セクションの役割
 *
 * 学ぶこと:
 * - 各セクションの特徴
 * - 楽器の使い分け
 * - エネルギーの流れ
 */
import { Lesson } from '../../types/lesson'

export const phase8Lesson2: Lesson = {
  id: 'phase8-lesson2',
  phaseId: 8,
  lessonNumber: 2,
  title: 'セクションの役割',
  description: '各パートの特徴と楽器配置',
  estimatedMinutes: 30,
  prerequisites: ['phase8-lesson1'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'イントロ',
      content: `<strong>イントロ</strong>は曲の導入です。

<strong>役割:</strong>
- 曲の雰囲気を伝える
- リスナーを引き込む
- キーとテンポを確立

<strong>楽器配置:</strong>
- ドラム: 4つ打ちor 8ビート
- ベース: ルート弾き
- キーボード: コードorリフ
- ギター: リフが多い

<strong>パターン:</strong>
1. ギターリフから始まる
2. ドラムビートから始まる
3. ピアノアルペジオから始まる
4. シンセパッドから始まる

<strong>小節数:</strong>
4-8小節が一般的。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'Aメロ',
      content: `<strong>Aメロ</strong>は静かなパートです。

<strong>役割:</strong>
- 物語の導入
- ボーカルを引き立てる
- サビのための「溜め」

<strong>楽器配置:</strong>
- ドラム: 控えめ、ハイハット中心
- ベース: シンプルなルート弾き
- キーボード: 白玉orアルペジオ
- ギター: パームミュートor休み

<strong>エネルギー:</strong>
低め（30-50%）

<strong>ポイント:</strong>
全楽器が控えめ。
ボーカルのための「余白」を作る。
サビとの対比が大事。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'Bメロ',
      content: `<strong>Bメロ</strong>はサビへの橋渡しです。

<strong>役割:</strong>
- Aメロからサビへつなぐ
- 期待感を高める
- 変化を加える

<strong>楽器配置:</strong>
- ドラム: 少し増やす、フィル入れ始め
- ベース: 動きを追加
- キーボード: コード刻み開始
- ギター: 開放的に

<strong>エネルギー:</strong>
中程度（50-70%）

<strong>コツ:</strong>
- Aメロより動きを増やす
- 最後にフィルを入れる
- サビへの期待を最大化`,
    },
    {
      id: 'step4',
      type: 'theory',
      title: 'サビ',
      content: `<strong>サビ</strong>は曲のクライマックスです。

<strong>役割:</strong>
- 最も盛り上がる
- 曲の「顔」
- 記憶に残るメロディ

<strong>楽器配置:</strong>
- ドラム: 全開、8分刻み
- ベース: オクターブ奏法
- キーボード: 刻み+パッド
- ギター: パワーコード刻み

<strong>エネルギー:</strong>
最大（90-100%）

<strong>サビの特徴:</strong>
- 全パートが参加
- 音量・密度が最大
- メロディがキャッチー
- 繰り返しで印象付け`,
    },
    {
      id: 'step5',
      type: 'theory',
      title: '間奏・Cメロ・落ちサビ',
      content: `その他の重要なセクションです。

<strong>間奏:</strong>
- 楽器のみ（ボーカルなし）
- ギターソロやシンセソロ
- 2コーラス目への橋渡し
- 8小節程度

<strong>Cメロ（大サビ前）:</strong>
- 新しいメロディ
- 展開を加える
- フル版でよく使う
- エモーショナル

<strong>落ちサビ:</strong>
- 静かなサビ
- ピアノとボーカルだけ
- 大サビ前の「溜め」
- コントラストを作る`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'エネルギーカーブ',
      content: `曲全体のエネルギーの流れです。

<strong>TV版の例:</strong>

イントロ: ████░░░░ 50%
Aメロ:   ███░░░░░ 35%
Bメロ:   █████░░░ 65%
サビ:    ████████ 100%
アウトロ: █████░░░ 60%

<strong>フル版の例:</strong>

イントロ:   ████░░░░ 50%
1A:        ███░░░░░ 35%
1B:        █████░░░ 60%
1サビ:     ███████░ 90%
間奏:      █████░░░ 60%
2A:        ████░░░░ 45%
2B:        ██████░░ 75%
2サビ:     ████████ 100%
Cメロ:     █████░░░ 60%
落ちサビ:   ██░░░░░░ 25%
大サビ:    ████████ 100%

<strong>ポイント:</strong>
波を作る。上げ下げがあると飽きない。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：セクション',
      content: 'セクションの役割を確認しましょう。',
      question: '「落ちサビ」の役割は？',
      options: [
        '最も盛り上がるパート',
        '大サビ前の静かな溜め',
        '曲の導入',
        '間奏の代わり',
      ],
      correctIndex: 1,
      explanation: '落ちサビは大サビ前に静かにすることで、コントラストを作り感動を増幅させます。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>イントロ</strong>
   - 曲の導入
   - リフやビートで始まる

2. <strong>Aメロ</strong>
   - 控えめ、ボーカル主体

3. <strong>Bメロ</strong>
   - 橋渡し、期待感

4. <strong>サビ</strong>
   - 全開、クライマックス

5. <strong>その他</strong>
   - 間奏、Cメロ、落ちサビ

6. <strong>エネルギーカーブ</strong>
   - 波を作る

<strong>次のレッスン：</strong>
アニソン特有の構成パターンを学びます。`,
    },
  ],
}
