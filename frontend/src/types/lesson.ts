/**
 * レッスン関連の型定義
 */

/**
 * レッスンのステップ種別
 */
export type LessonStepType =
  | 'theory'      // 理論説明
  | 'exercise'    // 実習（ピアノロールで入力）
  | 'reference'   // 参照曲確認（YouTube）
  | 'quiz'        // クイズ

/**
 * レッスンの1ステップ
 */
export interface LessonStep {
  id: string
  type: LessonStepType
  title: string
  content: string           // マークダウン形式の説明文
  voiceText?: string        // VOICEVOX読み上げ用テキスト

  // exercise 用
  targetTrack?: 'drum' | 'bass' | 'keyboard' | 'guitar'
  expectedNotes?: {
    pitch: number
    start: number
    duration: number
  }[]
  hints?: string[]

  // reference 用（YouTube）
  spotifyQuery?: string     // 検索クエリ（YouTube検索用、名前は後方互換のため維持）
  analysisNote?: string     // 分析の注目ポイント

  // quiz 用
  question?: string
  options?: string[]
  correctIndex?: number
  explanation?: string
}

/**
 * レッスン
 */
export interface Lesson {
  id: string
  phaseId: number           // 1-8
  lessonNumber: number      // フェーズ内のレッスン番号
  title: string
  description: string
  estimatedMinutes: number
  steps: LessonStep[]
  prerequisites?: string[]  // 前提レッスンID
}

/**
 * フェーズ
 */
export interface Phase {
  id: number
  title: string
  description: string
  lessons: Lesson[]
  estimatedHours: string    // "8-10時間" など
}

/**
 * ユーザーの進捗
 */
export interface LessonProgress {
  lessonId: string
  completedSteps: string[]  // 完了したステップID
  completedAt?: string      // 完了日時（ISO形式）
  score?: number            // クイズスコア（オプション）
}

/**
 * ユーザーの全進捗
 */
export interface UserProgress {
  currentPhase: number
  currentLesson: string
  completedLessons: LessonProgress[]
}
