/**
 * レッスンモーダルコンポーネント
 *
 * 機能:
 * - レッスン一覧表示（選択画面）
 * - レッスン内容をモーダルで表示
 * - ステップごとに進行
 * - 理論説明、実習、参照曲、クイズに対応
 */
import { useState, useEffect } from 'react'
import { Lesson, LessonStepType } from '../../types/lesson'
import { phases, getLessonById } from '../../data/lessons'

interface LessonModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LessonModal({ isOpen, onClose }: LessonModalProps) {
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const [showQuizResult, setShowQuizResult] = useState(false)
  const [expandedPhaseId, setExpandedPhaseId] = useState<number | null>(1) // 最初はPhase 1を開く

  // レッスンが変わったらリセット
  useEffect(() => {
    setCurrentStepIndex(0)
    setQuizAnswer(null)
    setShowQuizResult(false)
  }, [currentLesson?.id])

  if (!isOpen) return null

  // レッスン選択画面に戻る
  const handleBackToList = () => {
    setCurrentLesson(null)
    setCurrentStepIndex(0)
  }

  // レッスンを選択
  const handleSelectLesson = (lessonId: string) => {
    const lesson = getLessonById(lessonId)
    if (lesson) {
      setCurrentLesson(lesson)
    }
  }

  // 次のステップへ
  const handleNext = () => {
    if (currentLesson && currentStepIndex < currentLesson.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
      setQuizAnswer(null)
      setShowQuizResult(false)
    }
  }

  // 前のステップへ
  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
      setQuizAnswer(null)
      setShowQuizResult(false)
    }
  }

  // クイズ回答
  const handleQuizSubmit = () => {
    setShowQuizResult(true)
  }

  // ステップタイプのアイコン
  const getStepIcon = (type: LessonStepType): string => {
    switch (type) {
      case 'theory':
        return '📖'
      case 'exercise':
        return '🎹'
      case 'reference':
        return '🔍'
      case 'quiz':
        return '❓'
    }
  }

  // ステップタイプの日本語名
  const getStepTypeName = (type: LessonStepType): string => {
    switch (type) {
      case 'theory':
        return '理論'
      case 'exercise':
        return '実習'
      case 'reference':
        return '参照曲'
      case 'quiz':
        return 'クイズ'
    }
  }

  // フェーズの開閉を切り替え
  const togglePhase = (phaseId: number) => {
    setExpandedPhaseId(expandedPhaseId === phaseId ? null : phaseId)
  }

  // レッスン選択画面
  const renderLessonSelector = () => (
    <div className="p-4">
      {phases.map((phase) => {
        const isExpanded = expandedPhaseId === phase.id
        return (
          <div key={phase.id} className="mb-2">
            {/* Phase ヘッダー（クリックで開閉） */}
            <button
              onClick={() => togglePhase(phase.id)}
              className="w-full flex items-center justify-between p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-600 rounded-full text-sm font-bold">
                  Phase {phase.id}
                </span>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">{phase.title}</h3>
                  <p className="text-sm text-gray-400">{phase.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">{phase.estimatedHours}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* レッスン一覧（アコーディオン内容） */}
            {isExpanded && (
              <div className="mt-2 ml-4 space-y-2">
                {phase.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson.id)}
                    className="w-full text-left p-3 bg-gray-750 hover:bg-gray-600 rounded-lg transition-colors border-l-4 border-blue-500"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-blue-400 font-medium">
                          {phase.id}.{lesson.lessonNumber}
                        </span>
                        <h4 className="text-white">{lesson.title}</h4>
                      </div>
                      <div className="text-right text-sm text-gray-400">
                        {lesson.estimatedMinutes}分
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {phases.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          レッスンがありません
        </div>
      )}
    </div>
  )

  // レッスン内容画面
  const renderLessonContent = () => {
    if (!currentLesson) return null

    const currentStep = currentLesson.steps[currentStepIndex]
    const isFirstStep = currentStepIndex === 0
    const isLastStep = currentStepIndex === currentLesson.steps.length - 1

    return (
      <>
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToList}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="text-sm text-gray-400">
                Phase {currentLesson.phaseId} - Lesson {currentLesson.lessonNumber}
              </div>
              <h2 className="text-xl font-bold text-white">{currentLesson.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* プログレスバー */}
        <div className="px-6 py-2 border-b border-gray-700">
          <div className="flex items-center gap-1">
            {currentLesson.steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStepIndex(index)
                  setQuizAnswer(null)
                  setShowQuizResult(false)
                }}
                className={`flex-1 h-2 rounded-full transition-colors cursor-pointer hover:opacity-80 ${
                  index < currentStepIndex
                    ? 'bg-green-500'
                    : index === currentStepIndex
                    ? 'bg-blue-500'
                    : 'bg-gray-600'
                }`}
                title={`Step ${index + 1}: ${step.title}`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-2xl">{getStepIcon(currentStep.type)}</span>
            <span className="text-gray-400">
              Step {currentStepIndex + 1}/{currentLesson.steps.length}:
            </span>
            <span className="text-white font-medium">{currentStep.title}</span>
            <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
              {getStepTypeName(currentStep.type)}
            </span>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 理論説明 */}
          {currentStep.type === 'theory' && (
            <div className="prose prose-invert max-w-none">
              <div
                className="text-gray-200 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: currentStep.content }}
              />
            </div>
          )}

          {/* 実習 */}
          {currentStep.type === 'exercise' && (
            <div className="space-y-4">
              <div
                className="text-gray-200 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: currentStep.content }}
              />
              {currentStep.hints && currentStep.hints.length > 0 && (
                <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <h4 className="font-bold text-blue-400 mb-2">ヒント</h4>
                  <ul className="list-disc list-inside text-gray-300 space-y-1">
                    {currentStep.hints.map((hint, i) => (
                      <li key={i}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  モーダルを閉じてピアノロールで入力してください。
                  {currentStep.targetTrack && (
                    <span>「{currentStep.targetTrack}」トラックを選択して練習しましょう。</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* 参照曲 */}
          {currentStep.type === 'reference' && (
            <div className="space-y-4">
              <div
                className="text-gray-200 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: currentStep.content }}
              />
              {currentStep.spotifyQuery && (
                <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <h4 className="font-bold text-red-400 mb-2">参照曲を検索</h4>
                  <p className="text-gray-300 mb-3">
                    検索キーワード: 「{currentStep.spotifyQuery}」
                  </p>
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors">
                    YouTubeで検索
                  </button>
                  {currentStep.analysisNote && (
                    <p className="mt-3 text-sm text-gray-400">
                      注目ポイント: {currentStep.analysisNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* クイズ */}
          {currentStep.type === 'quiz' && (
            <div className="space-y-4">
              <div
                className="text-gray-200 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: currentStep.content }}
              />
              {currentStep.question && currentStep.options && (
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <h4 className="font-bold text-white mb-4">{currentStep.question}</h4>
                  <div className="space-y-2">
                    {currentStep.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => !showQuizResult && setQuizAnswer(index)}
                        disabled={showQuizResult}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${
                          showQuizResult
                            ? index === currentStep.correctIndex
                              ? 'bg-green-900/50 border-green-500 text-green-200'
                              : quizAnswer === index
                              ? 'bg-red-900/50 border-red-500 text-red-200'
                              : 'bg-gray-700 border-gray-600 text-gray-400'
                            : quizAnswer === index
                            ? 'bg-blue-900/50 border-blue-500 text-blue-200'
                            : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                        }`}
                      >
                        <span className="font-bold mr-2">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        {option}
                      </button>
                    ))}
                  </div>
                  {!showQuizResult && quizAnswer !== null && (
                    <button
                      onClick={handleQuizSubmit}
                      className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                    >
                      回答する
                    </button>
                  )}
                  {showQuizResult && currentStep.explanation && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                      <h5 className="font-bold text-white mb-2">解説</h5>
                      <p className="text-gray-300">{currentStep.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター（ナビゲーション） */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isFirstStep
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-500 text-white'
            }`}
          >
            ← 前へ
          </button>

          <span className="text-sm text-gray-400">
            {currentLesson.estimatedMinutes}分
          </span>

          {isLastStep ? (
            <button
              onClick={handleBackToList}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
            >
              完了 → 一覧へ
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            >
              次へ →
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-800 rounded-lg shadow-2xl flex flex-col mx-4">
        {currentLesson ? (
          renderLessonContent()
        ) : (
          <>
            {/* 選択画面ヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">レッスン一覧</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* 選択画面コンテンツ */}
            <div className="flex-1 overflow-y-auto">
              {renderLessonSelector()}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
