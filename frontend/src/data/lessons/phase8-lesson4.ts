/**
 * Phase 8 - Lesson 8.4: 4トラックアレンジ
 *
 * 学ぶこと:
 * - 4トラックの役割分担
 * - セクション別アレンジ
 * - 総仕上げ
 */
import { Lesson } from '../../types/lesson'

export const phase8Lesson4: Lesson = {
  id: 'phase8-lesson4',
  phaseId: 8,
  lessonNumber: 4,
  title: '4トラックアレンジ',
  description: '全パートをまとめて曲を完成させる',
  estimatedMinutes: 35,
  prerequisites: ['phase8-lesson3'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: '4トラックの役割',
      content: `このアプリの4トラックの役割を確認します。

<strong>1. ドラム</strong>
- リズムの土台
- 曲のテンポを決める
- エネルギーの指標

<strong>2. ベース</strong>
- 低音の土台
- コードのルート
- ドラムと連携

<strong>3. キーボード</strong>
- 和声（コード）
- 雰囲気づくり
- 中音域を埋める

<strong>4. ギター</strong>
- リフとバッキング
- エネルギー調整
- ロック感

<strong>全体像:</strong>
リズム隊（ドラム+ベース）+
コード隊（キーボード+ギター）`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: 'イントロのアレンジ',
      content: `イントロの4トラック配置です。

<strong>パターン1: フルバンド</strong>
- ドラム: 8ビート
- ベース: ルート弾き
- キーボード: コードかリフ
- ギター: リフ

<strong>パターン2: リズム隊から</strong>
- 最初4小節: ドラム+ベース
- 後半4小節: キーボード+ギター追加

<strong>パターン3: メロディ楽器から</strong>
- 最初4小節: キーボードorギター
- 後半4小節: ドラム+ベース追加

<strong>アニソンでは:</strong>
パターン1か2が多い。
いきなり全開か、徐々に増やす。`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'A/Bメロのアレンジ',
      content: `静かなパートのアレンジです。

<strong>Aメロ:</strong>
- ドラム: ハイハット中心、軽め
- ベース: シンプルなルート
- キーボード: 白玉orアルペジオ
- ギター: パームミュートor休み

<strong>Bメロ:</strong>
- ドラム: 少し増やす
- ベース: 動きを追加
- キーボード: 刻み開始
- ギター: 開放的に

<strong>ポイント:</strong>
- Aメロは「引く」
- Bメロで「足す」
- サビとの対比を意識

<strong>楽器を減らす選択肢:</strong>
Aメロでギターを休ませる
→ サビで入ると効果的`,
    },
    {
      id: 'step4',
      type: 'theory',
      title: 'サビのアレンジ',
      content: `サビは全開です。

<strong>全パートの設定:</strong>

<strong>ドラム:</strong>
- 8分ハイハット全開
- キック+スネアしっかり
- クラッシュでセクション頭

<strong>ベース:</strong>
- オクターブ奏法
- 8分で刻む
- ベロシティ高め

<strong>キーボード:</strong>
- コード刻み（8分）
- パッドを重ねる
- 高音域も使う

<strong>ギター:</strong>
- パワーコード刻み
- ディストーション
- 8分で推進力

<strong>結果:</strong>
全パートが8分で刻む
→ 最大のドライブ感`,
    },
    {
      id: 'step5',
      type: 'exercise',
      title: '実践：8小節を完成させる',
      content: `サビ8小節のアレンジを実践しましょう。

<strong>課題：サビ8小節（コード 0→7→9→4 ×2）</strong>

<strong>ドラム:</strong>
8ビート + 頭にクラッシュ

<strong>ベース:</strong>
オクターブ奏法（各コード2小節）
0⁽²⁾↔0⁽³⁾ → 7⁽¹⁾↔7⁽²⁾ → 9⁽¹⁾↔9⁽²⁾ → 4⁽²⁾↔4⁽³⁾

<strong>キーボード:</strong>
8分刻みコード
0maj → 7maj → 9min → 4maj

<strong>ギター:</strong>
パワーコード刻み
[0,7] → [7,2] → [9,4] → [4,11]

まずは各パートを個別に作成し、
再生して確認してみましょう！`,
      targetTrack: 'drum',
      hints: [
        '1パートずつ作る',
        'ドラムから始める',
        'こまめに再生確認',
      ],
    },
    {
      id: 'step6',
      type: 'theory',
      title: 'バランス調整',
      content: `最後にバランスを整えます。

<strong>ボリュームバランス:</strong>
- ドラム: 基準（100%）
- ベース: やや大きめ（100-110%）
- キーボード: 控えめ（80-90%）
- ギター: 中程度（90-100%）

<strong>パート間の調整:</strong>
- ベースとキックを揃える
- キーボードとギターが被らない
- 低音と高音のバランス

<strong>セクション間の調整:</strong>
- Aメロ→サビで盛り上げる
- 落ちサビで引く
- 大サビで最大に

<strong>このアプリでは:</strong>
各トラックのボリューム調整で対応。
再生しながら調整しよう。`,
    },
    {
      id: 'step7',
      type: 'theory',
      title: 'チェックリスト',
      content: `曲を完成させる前のチェックリストです。

<strong>リズム:</strong>
□ ドラムとベースが同期している
□ テンポが安定している
□ グルーヴ感がある

<strong>和声:</strong>
□ コード進行が自然
□ ベースがルートを弾いている
□ キーボードとギターが被りすぎない

<strong>構成:</strong>
□ セクションの変化が明確
□ サビが盛り上がっている
□ 起承転結がある

<strong>バランス:</strong>
□ 各パートが聞こえる
□ うるさすぎない
□ スカスカすぎない`,
    },
    {
      id: 'step8',
      type: 'theory',
      title: 'おめでとうございます！',
      content: `<strong>全8フェーズ、32レッスン完了！</strong>

お疲れ様でした！

<strong>学んだこと：</strong>

<strong>Phase 1-2: 音の基礎</strong>
12音、距離、コード、スケール、進行

<strong>Phase 3: メロディ</strong>
音域、跳躍、モチーフ、アニソンパターン

<strong>Phase 4: リズム</strong>
拍子、BPM、ドラムキット、フィル

<strong>Phase 5-7: 各楽器</strong>
ベース、キーボード、ギター

<strong>Phase 8: 曲構成</strong>
セクション、アレンジ、仕上げ

<strong>これからは:</strong>
実際に曲を作ってみよう！
作っては直し、を繰り返すことで
どんどん上達します。

<strong>楽しんで音楽を作ろう！</strong>`,
    },
  ],
}
