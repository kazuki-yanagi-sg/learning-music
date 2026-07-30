/**
 * 解析画面のトラック制御（音量のみ）の純ロジック
 *
 * UI（AnalysisPianoRollModal）から分離してテスト容易にする。
 * 仕様: UI は各トラックの「音量スライダーのみ」。ソロ/ミュートボタンは廃止し、
 *   スライダーを 0 にすれば実質ミュート＝聴きたいトラック以外を 0 にすればソロ相当。
 */

/** 解析で再生対象になるトラック（other は元々非再生なので含めない） */
export const PLAYABLE_TRACKS = ['drums', 'bass', 'guitar', 'keyboard', 'melody'] as const

/** トラック音量の既定値・範囲 */
export const DEFAULT_TRACK_VOLUME = 1
export const MIN_TRACK_VOLUME = 0
export const MAX_TRACK_VOLUME = 1.5

/**
 * 音量から「実効ミュート集合」を導く。
 *
 * 音量が 0（以下）のトラックは鳴らない＝ミュート相当として扱う。
 * これによりミュート/ソロのフラグを別途持たず、スライダー1つで
 * 「ミュート（0 にする）」も「ソロ（聴きたい以外を 0 にする）」も表現できる。
 *
 * @param allTracks  対象トラック名の配列
 * @param volumes    トラック別音量（未設定は既定 1 とみなす）
 * @returns          実効ミュート集合（新しい Set）
 */
export function computeMutedFromVolumes(
  allTracks: readonly string[],
  volumes: Record<string, number>,
): Set<string> {
  const result = new Set<string>()
  for (const t of allTracks) {
    const v = volumes[t] ?? DEFAULT_TRACK_VOLUME
    if (v <= 0) result.add(t)
  }
  return result
}
