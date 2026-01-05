# React入門 - 完全初心者向け

このドキュメントは「Reactって何？」というレベルから説明します。

## 目次

1. [Reactとは](#reactとは)
2. [コンポーネント](#コンポーネント)
3. [JSX - HTMLっぽい書き方](#jsx---htmlっぽい書き方)
4. [Props - データを渡す](#props---データを渡す)
5. [State - 状態を管理する](#state---状態を管理する)
6. [Hooks - Reactの便利機能](#hooks---reactの便利機能)
7. [このアプリでよく使うパターン](#このアプリでよく使うパターン)

---

## Reactとは

### 画面を「部品」で作るライブラリ

Reactは画面を小さな部品（コンポーネント）に分けて作ります。

```
【レゴブロックに例えると】

普通のHTMLページ:
  ┌─────────────────────────────────────┐
  │ 全部が1つの大きな塊                 │
  │ 変更したい部分があると全体を書き直す │
  └─────────────────────────────────────┘

Reactのページ:
  ┌─────────────────────────────────────┐
  │ ┌────────┐ ┌──────────────────────┐│
  │ │ ヘッダー │ │                    ││
  │ └────────┘ │    メインコンテンツ  ││
  │ ┌────────┐ │                    ││
  │ │サイドバー││    ┌────┐ ┌────┐   ││
  │ │        ││    │ボタン│ │カード│   ││
  │ └────────┘ │    └────┘ └────┘   ││
  │            └──────────────────────┘│
  └─────────────────────────────────────┘
    ↑ 各部品を組み合わせて画面を作る
```

### なぜReactを使うのか

1. **再利用性**: 同じ部品を何度も使い回せる
2. **保守性**: 部品ごとに修正できる
3. **効率性**: 変更があった部品だけ更新される

---

## コンポーネント

### コンポーネント = 関数

Reactのコンポーネントは「画面の部品を返す関数」です。

```tsx
// シンプルなコンポーネント
function Hello() {
  return <h1>こんにちは！</h1>;
}

// 使い方
function App() {
  return (
    <div>
      <Hello />
      <Hello />
      <Hello />
    </div>
  );
}
// → 「こんにちは！」が3回表示される
```

### ファイル構成

```
frontend/src/components/
├── PianoRoll/
│   ├── PianoRoll.tsx      ← コンポーネント本体
│   └── PianoRoll.css      ← スタイル
├── DrumGrid/
│   └── DrumGrid.tsx
└── SongSearchModal/
    └── SongSearchModal.tsx
```

**命名規則:**
- コンポーネント名は**大文字で始める**（PianoRoll, DrumGrid）
- ファイル名もコンポーネント名と同じ

---

## JSX - HTMLっぽい書き方

### JSXとは

JavaScript の中に HTML のようなコードを書ける構文。

```tsx
// これがJSX
function Welcome() {
  const name = "太郎";

  return (
    <div className="welcome">
      <h1>ようこそ、{name}さん！</h1>
      <p>今日も頑張りましょう</p>
    </div>
  );
}
```

### 重要なルール

```tsx
// ルール1: 必ず1つの要素で囲む
// ❌ NG
function Bad() {
  return (
    <h1>タイトル</h1>
    <p>本文</p>
  );
}

// ✅ OK（divで囲む）
function Good() {
  return (
    <div>
      <h1>タイトル</h1>
      <p>本文</p>
    </div>
  );
}

// ✅ OK（Fragment: <>...</>で囲む）
function AlsoGood() {
  return (
    <>
      <h1>タイトル</h1>
      <p>本文</p>
    </>
  );
}

// ルール2: classは className と書く
<div className="container">  // ✅
<div class="container">      // ❌ HTML用の書き方

// ルール3: styleはオブジェクトで書く
<div style={{ color: "red", fontSize: "16px" }}>  // ✅
<div style="color: red;">                          // ❌ HTML用の書き方

// ルール4: {}の中にJavaScriptを書ける
const items = ["りんご", "みかん", "バナナ"];
<ul>
  {items.map((item, index) => (
    <li key={index}>{item}</li>
  ))}
</ul>
```

---

## Props - データを渡す

### Propsとは

親コンポーネントから子コンポーネントにデータを渡す仕組み。

```tsx
// 子コンポーネント（データを受け取る側）
interface GreetingProps {
  name: string;
  age: number;
}

function Greeting({ name, age }: GreetingProps) {
  return (
    <div>
      <p>名前: {name}</p>
      <p>年齢: {age}歳</p>
    </div>
  );
}

// 親コンポーネント（データを渡す側）
function App() {
  return (
    <div>
      <Greeting name="太郎" age={25} />
      <Greeting name="花子" age={22} />
    </div>
  );
}
```

**図解:**

```
┌───────────────────────────────────────┐
│ App（親）                             │
│                                       │
│   name="太郎", age={25} を渡す         │
│         ↓                             │
│   ┌───────────────────────────┐       │
│   │ Greeting（子）             │       │
│   │ 受け取った name と age を表示│       │
│   └───────────────────────────┘       │
│                                       │
└───────────────────────────────────────┘
```

### 子から親への通知（コールバック）

```tsx
// 子コンポーネント
interface ButtonProps {
  label: string;
  onClick: () => void;  // 関数を受け取る
}

function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// 親コンポーネント
function App() {
  const handleClick = () => {
    alert("クリックされました！");
  };

  return <Button label="クリック！" onClick={handleClick} />;
}
```

---

## State - 状態を管理する

### Stateとは

画面に表示する「変化するデータ」を管理する仕組み。

```tsx
import { useState } from 'react';

function Counter() {
  // useState の使い方
  // const [現在の値, 値を更新する関数] = useState(初期値);
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>カウント: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        +1
      </button>
    </div>
  );
}
```

**useState の動き:**

```
1. 最初: count = 0
   画面: 「カウント: 0」

2. ボタンをクリック
   setCount(0 + 1) が実行される

3. count が 1 に更新される
   画面: 「カウント: 1」← 自動で更新！
```

### なぜ普通の変数ではダメなのか

```tsx
// ❌ NG: 普通の変数
function BadCounter() {
  let count = 0;

  const handleClick = () => {
    count = count + 1;  // 値は変わるけど...
    console.log(count); // ログには出るけど...
  };

  return (
    <div>
      <p>カウント: {count}</p>  {/* 画面は更新されない！ */}
      <button onClick={handleClick}>+1</button>
    </div>
  );
}

// ✅ OK: useState を使う
function GoodCounter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>カウント: {count}</p>  {/* 画面が自動更新される！ */}
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

---

## Hooks - Reactの便利機能

### よく使うHooks

```tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
```

### 1. useState - 状態管理

```tsx
// 基本
const [value, setValue] = useState(初期値);

// 例
const [isOpen, setIsOpen] = useState(false);
const [query, setQuery] = useState("");
const [notes, setNotes] = useState<NoteInfo[]>([]);
```

### 2. useEffect - 副作用の実行

「コンポーネントが表示されたとき」などに処理を実行。

```tsx
useEffect(() => {
  // 実行したい処理
  console.log("コンポーネントが表示された！");

  // クリーンアップ（コンポーネントが消えるときに実行）
  return () => {
    console.log("コンポーネントが消えた！");
  };
}, [依存する値]);  // この値が変わったら再実行
```

**例:**

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // userIdが変わるたびにデータを取得
    async function fetchUser() {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      setUser(data);
    }
    fetchUser();
  }, [userId]);  // userIdが変わったら再実行

  return <div>{user?.name}</div>;
}
```

**依存配列のルール:**

```tsx
useEffect(() => {}, [])      // 最初の1回だけ実行
useEffect(() => {}, [a])     // aが変わるたびに実行
useEffect(() => {}, [a, b])  // aまたはbが変わるたびに実行
useEffect(() => {})          // 毎回実行（非推奨）
```

### 3. useMemo - 計算結果のキャッシュ

重い計算を毎回やらないようにする。

```tsx
// 毎回計算される（遅い）
const filteredNotes = notes.filter(n => n.velocity > 50);

// 必要なときだけ計算（速い）
const filteredNotes = useMemo(() => {
  return notes.filter(n => n.velocity > 50);
}, [notes]);  // notesが変わったときだけ再計算
```

### 4. useCallback - 関数のキャッシュ

関数を毎回作り直さないようにする。

```tsx
// 毎回新しい関数が作られる
const handleClick = () => {
  console.log("clicked");
};

// 同じ関数を再利用
const handleClick = useCallback(() => {
  console.log("clicked");
}, []);  // 依存するものがなければ[]
```

### 5. useRef - 値の保持（再レンダリングなし）

画面更新せずに値を保持したいとき。

```tsx
function Timer() {
  const intervalRef = useRef<number | null>(null);

  const start = () => {
    intervalRef.current = setInterval(() => {
      console.log("tick");
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return (
    <>
      <button onClick={start}>開始</button>
      <button onClick={stop}>停止</button>
    </>
  );
}
```

---

## このアプリでよく使うパターン

### 1. モーダル（開く/閉じる）

```tsx
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>
        モーダルを開く
      </button>

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <p>モーダルの中身</p>
        </Modal>
      )}
    </div>
  );
}
```

### 2. フォーム入力

```tsx
function SearchForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const response = await fetch(`/api/search?q=${query}`);
    const data = await response.json();
    setResults(data.results);
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="検索..."
      />
      <button onClick={handleSearch}>検索</button>

      <ul>
        {results.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. ローディング表示

```tsx
function DataLoader() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/data");
        const result = await response.json();
        setData(result);
      } catch (e) {
        setError("データの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;
  return <div>{JSON.stringify(data)}</div>;
}
```

### 4. リスト表示とkey

```tsx
interface Note {
  id: string;
  pitch: number;
  start: number;
}

function NoteList({ notes }: { notes: Note[] }) {
  return (
    <ul>
      {notes.map((note) => (
        // keyは必須！一意の値を指定
        <li key={note.id}>
          ピッチ: {note.pitch}, 開始: {note.start}秒
        </li>
      ))}
    </ul>
  );
}
```

### 5. 条件付きレンダリング

```tsx
function ConditionalRender({ isLoggedIn, userName }: Props) {
  return (
    <div>
      {/* 方法1: && を使う */}
      {isLoggedIn && <p>ようこそ！</p>}

      {/* 方法2: 三項演算子 */}
      {isLoggedIn ? (
        <p>こんにちは、{userName}さん</p>
      ) : (
        <p>ログインしてください</p>
      )}

      {/* 方法3: 早期リターン */}
      {/* 関数コンポーネント内で if を使う */}
    </div>
  );
}
```

---

## まとめ

| 概念 | 説明 | 例 |
|-----|------|-----|
| コンポーネント | 画面の部品 | `function Button() { return <button>...</button> }` |
| JSX | HTMLっぽい書き方 | `<div className="...">{value}</div>` |
| Props | 親→子へのデータ | `<Child name="太郎" />` |
| State | 変化するデータ | `const [count, setCount] = useState(0)` |
| useEffect | 副作用の実行 | データ取得、タイマーなど |
| useMemo | 計算結果のキャッシュ | 重い処理の最適化 |
| useCallback | 関数のキャッシュ | 子コンポーネントへの関数渡し |

## 次に読むべきドキュメント

→ [04-PYTHON-FASTAPI.md](./04-PYTHON-FASTAPI.md) - Python/FastAPI入門

## 参考文献

### React

- [React 公式（日本語）](https://ja.react.dev/)
- [Qiita: React入門](https://qiita.com/TsutomuNakamura/items/72d8cf9f07a5a30be048)
- [Qiita: React Hooks入門](https://qiita.com/seira/items/f063e262b1d57d7e78b4)
- [Qiita: useStateの使い方](https://qiita.com/cheez921/items/9a5659f8f2a77f6fba63)
- [Qiita: useEffectの使い方](https://qiita.com/cheez921/items/9a5659f8f2a77f6fba63#useeffect)

### コンポーネント設計

- [Qiita: Reactコンポーネント設計](https://qiita.com/Yametaro/items/7b4e2c3ef2bf75c6d0d9)
- [Qiita: Props と State の違い](https://qiita.com/because_its_there/items/d9f5f5dd9d13db2ae00a)

### パフォーマンス

- [Qiita: useMemoとuseCallbackの違い](https://qiita.com/soarflat/items/b9d3d17b8ab1f5dbfed2)
- [React パフォーマンス最適化](https://ja.react.dev/reference/react/useMemo)
