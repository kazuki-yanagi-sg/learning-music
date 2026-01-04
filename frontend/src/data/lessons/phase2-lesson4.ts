/**
 * Phase 2 - Lesson 2.4: コード進行の基礎
 *
 * 学ぶこと:
 * - コード進行 = 和音の並び順
 * - 定番パターン（カノン進行、小室進行など）
 * - アニソンで多用される進行
 */
import { Lesson } from '../../types/lesson'

export const phase2Lesson4: Lesson = {
  id: 'phase2-lesson4',
  phaseId: 2,
  lessonNumber: 4,
  title: 'コード進行の基礎',
  description: 'アニソン定番のコード進行パターンを学ぶ',
  estimatedMinutes: 35,
  prerequisites: ['phase2-lesson3'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'コード進行とは',
      content: `<strong>コード進行</strong>とは、和音の並び順のことです。

同じ和音でも、並び順で印象が大きく変わります。

<strong>例:</strong>
I → V → vi → IV（明るく前向き）
vi → IV → I → V（切なく始まる）

<strong>コード進行の役割:</strong>
- 曲の「流れ」を作る
- 感情を導く
- 緊張と解決を演出する

アニソンには定番の進行パターンがあり、
それを知っているだけで作曲が楽になります。`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: '最も基本：I → V → I',
      content: `最もシンプルな進行は <strong>I → V → I</strong> です。

<strong>基準音 0 の場合:</strong>
[0,4,7] → [7,11,2] → [0,4,7]

<strong>機能の流れ:</strong>
トニック → ドミナント → トニック
（安定 → 緊張 → 解決）

これだけでも「始まって、盛り上がって、終わる」
という最小限の物語が作れます。

<strong>発展形:</strong>
I → IV → V → I（サブドミナントを追加）
I → IV → V → vi（終わりをマイナーに）`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'カノン進行',
      content: `<strong>カノン進行</strong>はポップスの王道です。

<strong>I → V → vi → iii → IV → I → IV → V</strong>

基準音 0 で展開すると：
[0,4,7] → [7,11,2] → [9,0,4] → [4,7,11] → [5,9,0] → [0,4,7] → [5,9,0] → [7,11,2]

<strong>簡略版（4コード）:</strong>
I → V → vi → IV

<strong>特徴:</strong>
- 安心感がある
- キャッチーで覚えやすい
- J-POPの定番中の定番

<strong>使用例:</strong>
多くのアイドルソング、明るいアニメOP`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：カノン進行（簡略版）',
      content: `カノン進行の簡略版 I → V → vi → IV を作りましょう。

<strong>課題：4つの和音を順番に入力</strong>

各和音を1小節（4拍）ずつ：
- 1〜4拍目: I = [0,4,7] (MIDI 60,64,67)
- 5〜8拍目: V = [7,11,14] (MIDI 67,71,74)
- 9〜12拍目: vi = [9,12,16] (MIDI 69,72,76)
- 13〜16拍目: IV = [5,9,12] (MIDI 65,69,72)

※オクターブは自由に調整してください`,
      targetTrack: 'keyboard',
      hints: [
        'I → V → vi → IV',
        'メジャー → メジャー → マイナー → メジャー',
        '明るく始まり、viで切なくなり、IVで希望的に',
      ],
    },
    {
      id: 'step5',
      type: 'theory',
      title: '小室進行',
      content: `<strong>小室進行</strong>は90年代J-POPで流行した進行です。

<strong>vi → IV → V → I</strong>

基準音 0 で展開すると：
[9,0,4] → [5,9,0] → [7,11,2] → [0,4,7]

<strong>特徴:</strong>
- viから始まるので切ない印象
- ドラマティックな展開
- サビへの盛り上がりに最適

<strong>使用例:</strong>
- 小室哲哉プロデュース曲
- 多くのアニソンのサビ
- 感動的なシーンのBGM`,
    },
    {
      id: 'step6',
      type: 'theory',
      title: '王道進行',
      content: `<strong>王道進行</strong>はアニソンで最も使われる進行です。

<strong>IV → V → iii → vi</strong>
または
<strong>IV → V → I → I</strong>

基準音 0 の場合：
[5,9,0] → [7,11,2] → [4,7,11] → [9,0,4]

<strong>特徴:</strong>
- IVから始まるので「浮遊感」がある
- Vで盛り上がり
- iii → vi で切なく解決

<strong>アニソンでの使用例:</strong>
サビの最後4小節でよく使われます。
「感動のクライマックス」を演出できます。`,
    },
    {
      id: 'step7',
      type: 'quiz',
      title: '確認クイズ：進行パターン',
      content: 'コード進行の特徴を確認しましょう。',
      question: 'vi から始まり、切ない印象を与える進行は？',
      options: [
        'I → V → vi → IV',
        'vi → IV → V → I',
        'IV → V → iii → vi',
        'I → IV → V → I',
      ],
      correctIndex: 1,
      explanation: 'vi → IV → V → I（小室進行）は vi から始まるので切ない印象で始まります。',
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'Just The Two Of Us 進行',
      content: `<strong>Just The Two Of Us 進行</strong>は洗練された響きの進行です。

<strong>IVmaj7 → III7 → vi → I</strong>
（セブンスコード使用）

簡略化すると：
<strong>IV → III → vi → I</strong>

<strong>特徴:</strong>
- おしゃれ、都会的
- シティポップ風
- 大人っぽいアニソン向き

<strong>注意:</strong>
III はダイアトニック外（本来は iii）ですが、
この進行では III（メジャー）を使います。
これを「セカンダリードミナント」といいます。`,
    },
    {
      id: 'step9',
      type: 'theory',
      title: '進行の組み合わせ方',
      content: `曲の構成で進行を使い分けます。

<strong>イントロ:</strong>
I → V → vi → IV（カノン進行）
→ 曲の雰囲気を提示

<strong>Aメロ:</strong>
vi → IV → I → V（小室進行の変形）
→ 静かに始まる

<strong>Bメロ:</strong>
IV → V → iii → vi（王道進行）
→ サビへの期待感を高める

<strong>サビ:</strong>
I → V → vi → IV（カノン進行）
→ キャッチーで印象的に

<strong>ポイント:</strong>
- Aメロは控えめに
- Bメロで盛り上げ
- サビで爆発

この緩急が「アニソンらしさ」を生みます。`,
    },
    {
      id: 'step10',
      type: 'quiz',
      title: '確認クイズ：進行選択',
      content: 'シーンに合った進行を選びましょう。',
      question: '「明るく希望的なサビ」に最適な進行は？',
      options: [
        'vi → iv → i → V',
        'I → V → vi → IV',
        'IV → V → iii → vi',
        'i → VII → VI → V',
      ],
      correctIndex: 1,
      explanation: 'I → V → vi → IV（カノン進行）は明るく希望的な響きで、サビに最適です。',
    },
    {
      id: 'step11',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>定番コード進行</strong>
   - カノン進行: I → V → vi → IV
   - 小室進行: vi → IV → V → I
   - 王道進行: IV → V → iii → vi

2. <strong>進行の特徴</strong>
   - I から始まる: 安定、明るい
   - vi から始まる: 切ない
   - IV から始まる: 浮遊感

3. <strong>曲構成での使い分け</strong>
   - Aメロ: 控えめに
   - Bメロ: 盛り上げ
   - サビ: キャッチーに

<strong>Phase 2 完了！</strong>
次のフェーズではメロディの作り方を学びます。`,
    },
  ],
}
