# TypeScript入門 - 完全初心者向け

このドキュメントは「プログラミングって何？」というレベルから説明します。

## 目次

1. [プログラミングとは](#プログラミングとは)
2. [JavaScriptとは](#javascriptとは)
3. [TypeScriptとは](#typescriptとは)
4. [基本的な書き方](#基本的な書き方)
5. [このアプリでよく使う構文](#このアプリでよく使う構文)

---

## プログラミングとは

### コンピュータへの指示書

プログラミングとは「コンピュータにやってほしいことを書く」ことです。

```
【料理のレシピに例えると】

1. 材料を用意する
2. 野菜を切る
3. 鍋に水を入れる
4. 沸騰したら野菜を入れる
5. 味付けをする

↓ これをコンピュータ用の言葉で書くのがプログラミング

【プログラムっぽく書くと】

1. 材料 = [玉ねぎ, にんじん, じゃがいも]
2. 切った野菜 = 切る(材料)
3. 鍋.追加(水)
4. if (鍋が沸騰している) then 鍋.追加(切った野菜)
5. 鍋.追加(調味料)
```

---

## JavaScriptとは

### ブラウザで動く唯一の言語

Webページを「動かす」ための言語です。

```
【Webページの3つの要素】

1. HTML   → 「何を表示するか」（骨格）
2. CSS    → 「どう見せるか」（デザイン）
3. JavaScript → 「どう動くか」（動き）

例: ボタンをクリックしたら何かが起こる → JavaScript
```

### シンプルな例

```javascript
// これはJavaScript
// 「//」で始まる行はコメント（説明文）

// 変数: 値を入れる箱
let name = "太郎";

// 関数: 処理をまとめたもの
function sayHello(name) {
  return "こんにちは、" + name + "さん！";
}

// 関数を使う
let message = sayHello("太郎");
// → "こんにちは、太郎さん！"
```

---

## TypeScriptとは

### JavaScriptに「型」を追加したもの

TypeScript = JavaScript + 型チェック

```
【なぜ型が必要？】

JavaScript（型なし）:
  let age = 25;       // 数字
  age = "二十五歳";    // 文字列もOK！（エラーにならない）
  age + 1;            // → "二十五歳1" （意図しない結果）

TypeScript（型あり）:
  let age: number = 25;   // 「数字型」と宣言
  age = "二十五歳";        // エラー！文字列は入れられない
  age + 1;                // 26 （正しく計算される）
```

### 型がある利点

```
【スーパーのレジに例えると】

JavaScriptのレジ:
  「りんご1個ください」→ OK
  「猫1匹ください」    → OK（？）← 何でも受け付けちゃう

TypeScriptのレジ:
  「りんご1個ください」→ OK
  「猫1匹ください」    → NG！うちは食品のみです ← 間違いを防げる
```

---

## 基本的な書き方

### 1. 変数（値を入れる箱）

```typescript
// let: 後から変更できる変数
let score = 100;
score = 200;  // OK

// const: 変更できない変数（定数）
const pi = 3.14;
pi = 3;  // エラー！変更できない

// 型を明示する場合
let name: string = "太郎";
let age: number = 25;
let isStudent: boolean = true;  // true（はい）か false（いいえ）
```

### 2. 基本的な型

```typescript
// 文字列（string）
let greeting: string = "こんにちは";

// 数値（number）
let count: number = 42;
let price: number = 1980.50;

// 真偽値（boolean）
let isActive: boolean = true;
let hasError: boolean = false;

// 配列（array）- 同じ型のものをリストにする
let fruits: string[] = ["りんご", "みかん", "バナナ"];
let scores: number[] = [80, 95, 72, 88];

// オブジェクト（object）- 関連する情報をまとめる
let user: { name: string; age: number } = {
  name: "太郎",
  age: 25,
};
```

### 3. 関数（処理をまとめる）

```typescript
// 基本形
function add(a: number, b: number): number {
  return a + b;
}
//    ↑ 引数の型    ↑ 戻り値の型

let result = add(3, 5);  // → 8


// アロー関数（短い書き方）
const multiply = (a: number, b: number): number => {
  return a * b;
};

// 1行で書ける場合（returnを省略）
const double = (n: number): number => n * 2;

let x = double(5);  // → 10
```

### 4. 条件分岐（if文）

```typescript
let score = 85;

if (score >= 90) {
  console.log("優秀！");
} else if (score >= 70) {
  console.log("合格");
} else {
  console.log("もう少し頑張ろう");
}
// → "合格"
```

### 5. 繰り返し（for, forEach）

```typescript
// for文
for (let i = 0; i < 5; i++) {
  console.log(i);  // 0, 1, 2, 3, 4 と表示
}

// 配列の繰り返し
const fruits = ["りんご", "みかん", "バナナ"];

// forEach（各要素に対して処理）
fruits.forEach((fruit) => {
  console.log(fruit);
});
// → りんご、みかん、バナナ

// map（各要素を変換して新しい配列を作る）
const upperFruits = fruits.map((fruit) => fruit.toUpperCase());
// → ["りんご", "みかん", "バナナ"] （日本語は変わらない例）
```

---

## このアプリでよく使う構文

### interface（型の定義）

```typescript
// ノート情報の型を定義
interface NoteInfo {
  pitch: number;    // MIDIノート番号
  start: number;    // 開始時間（秒）
  end: number;      // 終了時間（秒）
  velocity: number; // 音量
}

// 使用例
const note: NoteInfo = {
  pitch: 60,      // C4（ド）
  start: 0.0,
  end: 0.5,
  velocity: 100,
};
```

### Optional（あってもなくてもいい）

```typescript
interface User {
  name: string;       // 必須
  email?: string;     // ?がついてるとオプション（任意）
}

// OK: emailがなくてもいい
const user1: User = { name: "太郎" };

// OK: emailがあってもいい
const user2: User = { name: "花子", email: "hanako@example.com" };
```

### 配列の操作（map, filter）

```typescript
const notes: NoteInfo[] = [
  { pitch: 60, start: 0.0, end: 0.5, velocity: 100 },
  { pitch: 62, start: 0.5, end: 1.0, velocity: 80 },
  { pitch: 64, start: 1.0, end: 1.5, velocity: 90 },
];

// map: 各要素を変換
const pitches = notes.map(note => note.pitch);
// → [60, 62, 64]

// filter: 条件に合うものだけ残す
const loudNotes = notes.filter(note => note.velocity > 85);
// → velocity が 85 より大きいノートだけ

// find: 条件に合う最初の1つを取得
const firstNote = notes.find(note => note.pitch === 60);
// → { pitch: 60, start: 0.0, end: 0.5, velocity: 100 }
```

### async/await（非同期処理）

時間がかかる処理を「待つ」仕組み。

```typescript
// 普通の関数
function hello() {
  return "こんにちは";
}

// 非同期関数（サーバーからデータを取得する等）
async function searchSongs(query: string) {
  // fetch でサーバーにリクエスト
  const response = await fetch(`/api/v1/song-analysis/search?query=${query}`);

  // await: 結果が返ってくるまで待つ
  const data = await response.json();

  return data;
}

// 使い方
async function main() {
  const result = await searchSongs("バンドリ");
  console.log(result);  // 検索結果
}
```

**なぜ await が必要？**

```
【カフェの注文に例えると】

同期処理（await なし）:
  1. コーヒーを注文
  2. すぐ席に戻る ← まだコーヒーできてない！
  3. 「あれ、コーヒーは？」

非同期処理（await あり）:
  1. コーヒーを注文
  2. できるまで待つ ← await
  3. コーヒーを受け取って席に戻る ← 完璧！
```

### 分割代入

```typescript
// オブジェクトから必要な値だけ取り出す
const user = { name: "太郎", age: 25, email: "taro@example.com" };

// 普通の書き方
const name = user.name;
const age = user.age;

// 分割代入（短く書ける）
const { name, age } = user;

// 配列でも使える
const [first, second, third] = ["a", "b", "c"];
// first = "a", second = "b", third = "c"
```

### スプレッド演算子（...）

```typescript
// 配列を展開
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];  // [1, 2, 3, 4, 5]

// オブジェクトをコピー&拡張
const user = { name: "太郎", age: 25 };
const updatedUser = { ...user, age: 26 };
// { name: "太郎", age: 26 }
```

---

## よくあるエラーと対処法

### 1. 型エラー

```typescript
// エラー: Type 'string' is not assignable to type 'number'
let age: number = "25";  // 数字型に文字列を入れようとした

// 修正
let age: number = 25;  // 数字で入れる
// または
let age: string = "25";  // 文字列型に変更
```

### 2. undefined エラー

```typescript
// エラー: Cannot read properties of undefined
const user = undefined;
console.log(user.name);  // undefined に .name はない

// 修正: Optional chaining（?）を使う
console.log(user?.name);  // undefined なら undefined を返す（エラーにならない）
```

### 3. null チェック

```typescript
function greet(name: string | null) {
  // 修正: null チェックを入れる
  if (name !== null) {
    console.log("こんにちは、" + name);
  } else {
    console.log("こんにちは、ゲストさん");
  }
}
```

---

## まとめ

| 概念 | 説明 | 例 |
|-----|------|-----|
| 変数 | 値を入れる箱 | `let x = 10` |
| 型 | 値の種類を指定 | `string`, `number`, `boolean` |
| 関数 | 処理をまとめる | `function add(a, b) { return a + b }` |
| interface | 型の設計図 | `interface User { name: string }` |
| async/await | 待つ処理 | `await fetch(url)` |

## 次に読むべきドキュメント

→ [03-REACT-BASICS.md](./03-REACT-BASICS.md) - React入門

## 参考文献

### TypeScript

- [TypeScript 公式](https://www.typescriptlang.org/)
- [サバイバルTypeScript](https://typescriptbook.jp/) - 日本語で詳しい
- [Qiita: TypeScript入門](https://qiita.com/uhyo/items/e2fdef2d3236b9bfe74a)
- [Qiita: TypeScriptの型入門](https://qiita.com/uhyo/items/6acb7f4ee73b8c0e6b6b)

### JavaScript

- [MDN JavaScript ガイド](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide)
- [JavaScript Primer](https://jsprimer.net/) - 日本語で詳しい
- [Qiita: モダンJavaScript入門](https://qiita.com/sho-t/items/9eb0f1a8e6e7b67c20b6)
- [Qiita: async/await入門](https://qiita.com/soarflat/items/1a9613e023200b2e84e7)

### 配列操作

- [Qiita: map, filter, reduce入門](https://qiita.com/may88seiji/items/8f7a156c7e84cbb75b7c)
- [Qiita: 分割代入とスプレッド演算子](https://qiita.com/Masayuki-M/items/4f5c8def0cda67c6db6a)
