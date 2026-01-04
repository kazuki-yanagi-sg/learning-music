/**
 * 理論解説パネル
 *
 * 入力中のノートをリアルタイム解析して表示
 * - コード認識
 * - 進行パターン検出
 * - リアルタイム解説
 */
import { useMemo } from 'react'
import { Track } from '../../types/music'
import {
  detectChordsByBeat,
  detectProgressionPattern,
  generateProgressionAnalysis,
  progressionToString,
  DetectedChord,
  PROGRESSION_PATTERNS,
} from '../../services/musicAnalysis'

interface TheoryPanelProps {
  tracks: Track[]
  keyRoot: number // 0-11
  className?: string
}

// メジャースケールの距離パターン
const MAJOR_SCALE_DISTANCES = [0, 2, 4, 5, 7, 9, 11]

export function TheoryPanel({ tracks, keyRoot, className = '' }: TheoryPanelProps) {
  // 全トラックのノートを集約
  const allNotes = useMemo(() => {
    return tracks.flatMap((t) => t.notes)
  }, [tracks])

  // キーボードトラックのノートからコード検出
  const keyboardNotes = useMemo(() => {
    const keyboardTrack = tracks.find((t) => t.type === 'keyboard')
    return keyboardTrack?.notes || []
  }, [tracks])

  // 拍ごとのコード検出
  const chordsByBeat = useMemo(() => {
    return detectChordsByBeat(keyboardNotes, keyRoot)
  }, [keyboardNotes, keyRoot])

  // コードを配列に変換（拍順）
  const chordsArray = useMemo(() => {
    const chords: DetectedChord[] = []
    const beats = [...chordsByBeat.keys()].sort((a, b) => a - b)

    // 連続する同じコードをまとめる
    let lastChord: DetectedChord | null = null
    beats.forEach(beat => {
      const chord = chordsByBeat.get(beat)!
      if (!lastChord || lastChord.root !== chord.root || lastChord.type.name !== chord.type.name) {
        chords.push(chord)
        lastChord = chord
      }
    })

    return chords
  }, [chordsByBeat])

  // 進行パターン検出
  const detectedPatterns = useMemo(() => {
    return detectProgressionPattern(chordsArray, keyRoot)
  }, [chordsArray, keyRoot])

  // 解説生成
  const insights = useMemo(() => {
    return generateProgressionAnalysis(chordsArray, detectedPatterns, keyRoot)
  }, [chordsArray, detectedPatterns, keyRoot])

  // 使用されている音（ピッチクラス）
  const usedPitchClasses = useMemo(() => {
    const pitches = new Set(allNotes.map((n) => n.pitch % 12))
    return [...pitches].sort((a, b) => a - b)
  }, [allNotes])

  // キー内の音かどうか判定
  const isInKey = (pitchClass: number): boolean => {
    const distance = (pitchClass - keyRoot + 12) % 12
    return MAJOR_SCALE_DISTANCES.includes(distance)
  }

  // 統計情報
  const stats = useMemo(() => {
    return {
      totalNotes: allNotes.length,
      detectedChords: chordsArray.length,
      patternsFound: detectedPatterns.length,
    }
  }, [allNotes, chordsArray, detectedPatterns])

  return (
    <div className={`bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto ${className}`}>
      <h2 className="text-lg font-bold text-white mb-4">理論解説</h2>

      {/* コード進行表示 */}
      {chordsArray.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-400 mb-2">コード進行</h3>
          <div className="text-sm text-blue-400 font-mono bg-gray-900 p-2 rounded overflow-x-auto">
            {progressionToString(chordsArray)}
          </div>
        </div>
      )}

      {/* 検出されたパターン */}
      {detectedPatterns.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-400 mb-2">検出パターン</h3>
          <div className="space-y-2">
            {detectedPatterns.slice(0, 2).map((result, i) => (
              <div
                key={i}
                className="p-2 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded border border-purple-700"
              >
                <div className="flex items-center gap-2">
                  <span className="text-purple-300 font-bold">
                    {result.pattern.nameJp}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({Math.round(result.confidence * 100)}%)
                  </span>
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {result.pattern.degrees.join(' → ')}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {result.pattern.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 解説 */}
      {insights.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-400 mb-2">解説</h3>
          <div className="space-y-1">
            {insights.map((insight, i) => (
              <div key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 検出和音（詳細） */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-400 mb-2">
          検出和音 ({chordsArray.length})
        </h3>
        {chordsArray.length > 0 ? (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {chordsArray.slice(0, 12).map((chord, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-400">
                  {chord.degree || `${chord.rootName}`}
                </span>
                <span className="text-blue-400 font-mono">
                  {chord.rootName} {chord.type.nameJp}
                </span>
                <span className={`text-xs px-1 rounded ${
                  chord.function === 'T' ? 'bg-green-900 text-green-300' :
                  chord.function === 'SD' ? 'bg-yellow-900 text-yellow-300' :
                  chord.function === 'D' ? 'bg-red-900 text-red-300' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {chord.function || '?'}
                </span>
              </div>
            ))}
            {chordsArray.length > 12 && (
              <div className="text-xs text-gray-500">
                ...他 {chordsArray.length - 12} 和音
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            キーボードに2音以上配置してください
          </div>
        )}
      </div>

      {/* 使用音 */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-400 mb-2">使用音</h3>
        <div className="flex flex-wrap gap-1">
          {usedPitchClasses.map((pc) => {
            const inKey = isInKey(pc)
            return (
              <span
                key={pc}
                className={`px-2 py-1 text-xs rounded ${
                  inKey
                    ? 'bg-green-900 text-green-300'
                    : 'bg-yellow-900 text-yellow-300'
                }`}
                title={inKey ? 'スケール内' : 'スケール外'}
              >
                {pc}
              </span>
            )
          })}
        </div>
        {usedPitchClasses.length === 0 && (
          <div className="text-sm text-gray-500">ノートがありません</div>
        )}
      </div>

      {/* パターンリファレンス */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-400 mb-2">進行パターン一覧</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {PROGRESSION_PATTERNS.slice(0, 5).map((pattern, i) => (
            <div
              key={i}
              className="text-xs p-1.5 bg-gray-700/50 rounded cursor-default hover:bg-gray-700"
              title={pattern.description}
            >
              <div className="font-bold text-gray-300">{pattern.nameJp}</div>
              <div className="text-gray-500">{pattern.degrees.join('→')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 統計 */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-400 mb-2">統計</h3>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">総ノート数:</span>
            <span className="text-white">{stats.totalNotes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">和音数:</span>
            <span className="text-white">{stats.detectedChords}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">パターン検出:</span>
            <span className="text-white">{stats.patternsFound}</span>
          </div>
        </div>
      </div>

      {/* ヒント */}
      <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-bold text-gray-300 mb-2">ヒント</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          {stats.totalNotes === 0
            ? 'ピアノロールをクリックしてノートを追加しましょう'
            : stats.detectedChords === 0
            ? 'キーボードトラックに2音以上同時に置くと和音を検出します'
            : stats.patternsFound === 0
            ? '3つ以上のコードを入力すると進行パターンを検出します'
            : '検出されたパターンを参考に曲を発展させましょう'}
        </p>
        <div className="mt-2 text-xs text-gray-500">
          <span className="text-green-400">T</span>=トニック(安定)
          <span className="text-yellow-400 ml-2">SD</span>=サブドミナント(展開)
          <span className="text-red-400 ml-2">D</span>=ドミナント(緊張)
        </div>
      </div>
    </div>
  )
}
