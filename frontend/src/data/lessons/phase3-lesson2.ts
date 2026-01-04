/**
 * Phase 3 - Lesson 3.2: リズムとメロディ
 *
 * 学ぶこと:
 * - メロディのリズム要素
 * - 表拍と裏拍
 * - シンコペーション
 */
import { Lesson } from '../../types/lesson'

export const phase3Lesson2: Lesson = {
  id: 'phase3-lesson2',
  phaseId: 3,
  lessonNumber: 2,
  title: 'リズムとメロディ',
  description: 'メロディにグルーヴを与えるリズム',
  estimatedMinutes: 25,
  prerequisites: ['phase3-lesson1'],
  steps: [
    {
      id: 'step1',
      type: 'theory',
      title: 'メロディのリズム',
      content: `メロディは「音高」だけでなく「リズム」も重要です。

同じ音の並びでも、リズムを変えると印象が変わります。

<strong>例：0 → 2 → 4 → 5</strong>

パターン1: 各1拍ずつ
→ 落ち着いた印象

パターン2: 0.5拍 → 0.5拍 → 0.5拍 → 1.5拍
→ 勢いがあって最後に伸びる

<strong>リズムが変わると:</strong>
- 曲のノリが変わる
- 歌詞の聞こえ方が変わる
- 感情表現が変わる`,
    },
    {
      id: 'step2',
      type: 'theory',
      title: '表拍と裏拍',
      content: `拍には「表」と「裏」があります。

4拍子の場合:
<strong>1</strong> と <strong>2</strong> と <strong>3</strong> と <strong>4</strong> と
↑表  ↑裏 ↑表  ↑裏 ↑表  ↑裏 ↑表  ↑裏

数字の位置が「表拍」
「と」の位置が「裏拍」

<strong>表拍の特徴:</strong>
- 安定感がある
- 強調される
- 歌詞の重要な言葉を置く

<strong>裏拍の特徴:</strong>
- 推進力がある
- グルーヴが出る
- ノリが良くなる`,
    },
    {
      id: 'step3',
      type: 'theory',
      title: 'シンコペーション',
      content: `<strong>シンコペーション</strong>とは、裏拍を強調するリズムです。

通常: 表拍にアクセント
シンコペーション: 裏拍にアクセント

<strong>効果:</strong>
- リズムに「うねり」が出る
- ダンサブルになる
- 意外性が生まれる

<strong>アニソンでの使用:</strong>
- サビの入り（裏拍から入る）
- ノリの良い曲全般
- 「食い気味」に入るボーカル

<strong>記法:</strong>
0.5拍目、1.5拍目、2.5拍目... から音が始まる`,
    },
    {
      id: 'step4',
      type: 'exercise',
      title: '実践：表拍のメロディ',
      content: `表拍だけでメロディを作りましょう。

<strong>課題：0, 2, 4, 5 を各表拍に置く</strong>

キーボードトラックに：
- 0⁽⁴⁾ (60) → 0拍目（1拍目の頭）
- 2⁽⁴⁾ (62) → 1拍目
- 4⁽⁴⁾ (64) → 2拍目
- 5⁽⁴⁾ (65) → 3拍目

各1拍の長さで置いてください。
安定したリズムを確認しましょう。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0, duration: 1 },
        { pitch: 62, start: 1, duration: 1 },
        { pitch: 64, start: 2, duration: 1 },
        { pitch: 65, start: 3, duration: 1 },
      ],
      hints: [
        '表拍 = 整数の位置',
        '安定感のあるリズム',
      ],
    },
    {
      id: 'step5',
      type: 'exercise',
      title: '実践：シンコペーション',
      content: `裏拍から始まるメロディを作りましょう。

<strong>課題：0.5拍目から始める</strong>

キーボードトラックに：
- 0⁽⁴⁾ (60) → 0.5拍目（裏拍）
- 2⁽⁴⁾ (62) → 1.5拍目（裏拍）
- 4⁽⁴⁾ (64) → 2.5拍目（裏拍）
- 5⁽⁴⁾ (65) → 3拍目（表拍で着地）

各0.5拍の長さで、最後は1拍で伸ばします。`,
      targetTrack: 'keyboard',
      expectedNotes: [
        { pitch: 60, start: 0.5, duration: 0.5 },
        { pitch: 62, start: 1.5, duration: 0.5 },
        { pitch: 64, start: 2.5, duration: 0.5 },
        { pitch: 65, start: 3, duration: 1 },
      ],
      hints: [
        '裏拍 = 0.5刻みの位置',
        '最後は表拍で安定させる',
      ],
    },
    {
      id: 'step6',
      type: 'theory',
      title: '音の長さのバリエーション',
      content: `メロディの音の長さを変えると表情が変わります。

<strong>長い音（2拍以上）:</strong>
- 感情を込める
- 言葉を強調
- サビの最後によく使う

<strong>短い音（0.5拍以下）:</strong>
- 勢いを出す
- 言葉を詰め込む
- ラップ的な表現

<strong>組み合わせパターン:</strong>
「短・短・長」→ タタターン
「長・短・短」→ ターンタタ
「短・長・短」→ タターンタ

<strong>アニソンの定番:</strong>
Aメロ: 短い音多め（情報量多い）
サビ: 長い音多め（感情込める）`,
    },
    {
      id: 'step7',
      type: 'theory',
      title: '休符の効果',
      content: `<strong>休符</strong>（音のない部分）も重要です。

<strong>休符の効果:</strong>
- 息継ぎのポイントを作る
- 次の音を強調する
- 緊張感を生む

<strong>使いどころ:</strong>
- フレーズとフレーズの間
- サビ前の「タメ」
- 言葉の区切り

<strong>アニソンでよくあるパターン:</strong>
「〜〜〜！（休）ここから〜」
休符の後にサビが来ると、インパクト大。

<strong>注意:</strong>
休符を入れすぎると途切れ途切れに聞こえる。
歌として自然な位置に入れる。`,
    },
    {
      id: 'step8',
      type: 'quiz',
      title: '確認クイズ：リズム',
      content: 'リズムの特徴を確認しましょう。',
      question: '「ノリが良くダンサブル」にするには？',
      options: [
        '表拍だけにノートを置く',
        '裏拍を強調する（シンコペーション）',
        '全部同じ長さにする',
        '休符を入れない',
      ],
      correctIndex: 1,
      explanation: 'シンコペーション（裏拍の強調）がグルーヴとノリを生みます。',
    },
    {
      id: 'step9',
      type: 'theory',
      title: '歌詞とリズム',
      content: `メロディのリズムは歌詞と密接に関係します。

<strong>日本語の特徴:</strong>
- 1文字 = 1音が基本
- アクセントの位置が重要
- 「っ」「ん」の扱い

<strong>歌詞を乗せるコツ:</strong>
- 大事な言葉を長い音に
- 助詞は短い音に
- 文の切れ目で息継ぎ

<strong>例：「きみのこえが」</strong>
き(短)・み(短)・の(短)・こ(長)・え(短)・が(長)
→「こ」と「が」を強調

<strong>メロディ先か歌詞先か:</strong>
アニソンはメロディ先が多い。
メロディに合わせて歌詞を調整する。`,
    },
    {
      id: 'step10',
      type: 'theory',
      title: 'まとめ',
      content: `お疲れ様でした！

<strong>このレッスンで学んだこと：</strong>

1. <strong>表拍と裏拍</strong>
   - 表拍: 安定、強調
   - 裏拍: 推進力、グルーヴ

2. <strong>シンコペーション</strong>
   - 裏拍を強調
   - ノリが良くなる

3. <strong>音の長さ</strong>
   - 長い音: 感情を込める
   - 短い音: 勢いを出す

4. <strong>休符</strong>
   - 息継ぎ、タメ
   - 次の音を強調

<strong>次のレッスン：</strong>
モチーフと展開を学びます。`,
    },
  ],
}
