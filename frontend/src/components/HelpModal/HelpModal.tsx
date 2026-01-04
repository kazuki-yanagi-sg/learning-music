/**
 * ヘルプモーダルコンポーネント
 *
 * 操作説明を表示するモーダル
 */

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">操作ガイド</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-4 space-y-6">
          {/* 基本操作 */}
          <section>
            <h3 className="text-lg font-bold text-blue-400 mb-3">基本操作</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">ノート追加</span>
                <span className="text-gray-400">クリック</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">ノート削除</span>
                <span className="text-gray-400">選択中のノートをクリック</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">再生/停止</span>
                <span className="text-gray-400">再生ボタン</span>
              </div>
            </div>
          </section>

          {/* 選択 */}
          <section>
            <h3 className="text-lg font-bold text-green-400 mb-3">選択</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">単一選択</span>
                <span className="text-gray-400">クリック</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">複数選択に追加</span>
                <span className="text-gray-400">Shift + クリック</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">範囲選択</span>
                <span className="text-gray-400">⌘/Ctrl + ドラッグ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">全選択</span>
                <span className="text-gray-400">⌘/Ctrl + A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">選択解除</span>
                <span className="text-gray-400">Escape</span>
              </div>
            </div>
          </section>

          {/* 編集 */}
          <section>
            <h3 className="text-lg font-bold text-yellow-400 mb-3">編集</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">コピー</span>
                <span className="text-gray-400">⌘/Ctrl + C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">ペースト（カーソル位置）</span>
                <span className="text-gray-400">⌘/Ctrl + V</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">削除</span>
                <span className="text-gray-400">Delete / Backspace</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">元に戻す</span>
                <span className="text-gray-400">⌘/Ctrl + Z</span>
              </div>
            </div>
          </section>

          {/* その他 */}
          <section>
            <h3 className="text-lg font-bold text-purple-400 mb-3">その他</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">このヘルプを開く</span>
                <span className="text-gray-400">? または ⌘/Ctrl + /</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">トラックミュート</span>
                <span className="text-gray-400">Mボタン</span>
              </div>
            </div>
          </section>

          {/* ヒント */}
          <section className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-2">ヒント</h3>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li>カーソル位置（青い破線）がペースト先になります</li>
              <li>コピーはトラックごとに保存されます</li>
              <li>レッスンボタンで音楽理論を学べます</li>
            </ul>
          </section>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
