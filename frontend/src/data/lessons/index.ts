/**
 * レッスンデータのエクスポート
 */
import { Lesson, Phase } from '../../types/lesson'
import { phase1Lesson1 } from './phase1-lesson1'
import { phase1Lesson2 } from './phase1-lesson2'
import { phase1Lesson3 } from './phase1-lesson3'
import { phase1Lesson4 } from './phase1-lesson4'
import { phase2Lesson1 } from './phase2-lesson1'
import { phase2Lesson2 } from './phase2-lesson2'
import { phase2Lesson3 } from './phase2-lesson3'
import { phase2Lesson4 } from './phase2-lesson4'
import { phase3Lesson1 } from './phase3-lesson1'
import { phase3Lesson2 } from './phase3-lesson2'
import { phase3Lesson3 } from './phase3-lesson3'
import { phase3Lesson4 } from './phase3-lesson4'
import { phase4Lesson1 } from './phase4-lesson1'
import { phase4Lesson2 } from './phase4-lesson2'
import { phase4Lesson3 } from './phase4-lesson3'
import { phase4Lesson4 } from './phase4-lesson4'
import { phase5Lesson1 } from './phase5-lesson1'
import { phase5Lesson2 } from './phase5-lesson2'
import { phase5Lesson3 } from './phase5-lesson3'
import { phase5Lesson4 } from './phase5-lesson4'
import { phase6Lesson1 } from './phase6-lesson1'
import { phase6Lesson2 } from './phase6-lesson2'
import { phase6Lesson3 } from './phase6-lesson3'
import { phase6Lesson4 } from './phase6-lesson4'
import { phase7Lesson1 } from './phase7-lesson1'
import { phase7Lesson2 } from './phase7-lesson2'
import { phase7Lesson3 } from './phase7-lesson3'
import { phase7Lesson4 } from './phase7-lesson4'
import { phase8Lesson1 } from './phase8-lesson1'
import { phase8Lesson2 } from './phase8-lesson2'
import { phase8Lesson3 } from './phase8-lesson3'
import { phase8Lesson4 } from './phase8-lesson4'

// 全レッスンのマップ
export const lessonsMap: Record<string, Lesson> = {
  'phase1-lesson1': phase1Lesson1,
  'phase1-lesson2': phase1Lesson2,
  'phase1-lesson3': phase1Lesson3,
  'phase1-lesson4': phase1Lesson4,
  'phase2-lesson1': phase2Lesson1,
  'phase2-lesson2': phase2Lesson2,
  'phase2-lesson3': phase2Lesson3,
  'phase2-lesson4': phase2Lesson4,
  'phase3-lesson1': phase3Lesson1,
  'phase3-lesson2': phase3Lesson2,
  'phase3-lesson3': phase3Lesson3,
  'phase3-lesson4': phase3Lesson4,
  'phase4-lesson1': phase4Lesson1,
  'phase4-lesson2': phase4Lesson2,
  'phase4-lesson3': phase4Lesson3,
  'phase4-lesson4': phase4Lesson4,
  'phase5-lesson1': phase5Lesson1,
  'phase5-lesson2': phase5Lesson2,
  'phase5-lesson3': phase5Lesson3,
  'phase5-lesson4': phase5Lesson4,
  'phase6-lesson1': phase6Lesson1,
  'phase6-lesson2': phase6Lesson2,
  'phase6-lesson3': phase6Lesson3,
  'phase6-lesson4': phase6Lesson4,
  'phase7-lesson1': phase7Lesson1,
  'phase7-lesson2': phase7Lesson2,
  'phase7-lesson3': phase7Lesson3,
  'phase7-lesson4': phase7Lesson4,
  'phase8-lesson1': phase8Lesson1,
  'phase8-lesson2': phase8Lesson2,
  'phase8-lesson3': phase8Lesson3,
  'phase8-lesson4': phase8Lesson4,
}

// Phase 1 の定義
const phase1: Phase = {
  id: 1,
  title: '音の基礎',
  description: '12音、距離、和音、MIDIの基本を学ぶ',
  lessons: [phase1Lesson1, phase1Lesson2, phase1Lesson3, phase1Lesson4],
  estimatedHours: '3-4時間',
}

// Phase 2 の定義
const phase2: Phase = {
  id: 2,
  title: 'スケールと進行',
  description: 'メジャー/マイナースケール、ダイアトニックコード、定番進行',
  lessons: [phase2Lesson1, phase2Lesson2, phase2Lesson3, phase2Lesson4],
  estimatedHours: '4-5時間',
}

// Phase 3 の定義
const phase3: Phase = {
  id: 3,
  title: 'メロディ',
  description: '音域、跳躍、モチーフ、アニソンパターン',
  lessons: [phase3Lesson1, phase3Lesson2, phase3Lesson3, phase3Lesson4],
  estimatedHours: '4-5時間',
}

// Phase 4 の定義
const phase4: Phase = {
  id: 4,
  title: 'リズムとドラム',
  description: '拍子、BPM、ドラムキット、フィル、グルーヴ',
  lessons: [phase4Lesson1, phase4Lesson2, phase4Lesson3, phase4Lesson4],
  estimatedHours: '4-5時間',
}

// Phase 5 の定義
const phase5: Phase = {
  id: 5,
  title: 'ベースライン',
  description: 'ルート弾き、オクターブ奏法、経過音',
  lessons: [phase5Lesson1, phase5Lesson2, phase5Lesson3, phase5Lesson4],
  estimatedHours: '4-5時間',
}

// Phase 6 の定義
const phase6: Phase = {
  id: 6,
  title: 'キーボード',
  description: 'ボイシング、アルペジオ、刻みパターン',
  lessons: [phase6Lesson1, phase6Lesson2, phase6Lesson3, phase6Lesson4],
  estimatedHours: '4-5時間',
}

// Phase 7 の定義
const phase7: Phase = {
  id: 7,
  title: 'ギター',
  description: 'パワーコード、リフ、バッキング',
  lessons: [phase7Lesson1, phase7Lesson2, phase7Lesson3, phase7Lesson4],
  estimatedHours: '4-5時間',
}

// Phase 8 の定義
const phase8: Phase = {
  id: 8,
  title: '曲構成とアレンジ',
  description: 'セクション構成、4トラックアレンジ',
  lessons: [phase8Lesson1, phase8Lesson2, phase8Lesson3, phase8Lesson4],
  estimatedHours: '5-6時間',
}

// 全フェーズ
export const phases: Phase[] = [
  phase1,
  phase2,
  phase3,
  phase4,
  phase5,
  phase6,
  phase7,
  phase8,
]

// レッスンをIDで取得
export function getLessonById(id: string): Lesson | undefined {
  return lessonsMap[id]
}

// 次のレッスンを取得
export function getNextLesson(currentLessonId: string): Lesson | undefined {
  const lessonIds = Object.keys(lessonsMap)
  const currentIndex = lessonIds.indexOf(currentLessonId)
  if (currentIndex === -1 || currentIndex >= lessonIds.length - 1) {
    return undefined
  }
  return lessonsMap[lessonIds[currentIndex + 1]]
}

// フェーズ内の全レッスンを取得
export function getLessonsByPhase(phaseId: number): Lesson[] {
  return Object.values(lessonsMap).filter((lesson) => lesson.phaseId === phaseId)
}
