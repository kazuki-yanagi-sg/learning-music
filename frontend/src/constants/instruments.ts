/**
 * SoundFont 楽器定数
 *
 * 各トラックに使用する GM 音源（MusyngKite SoundFont）の instrument 名と
 * 音量ゲインを一箇所に集約する。差し替えが必要な場合はここだけ編集する。
 *
 * 音色選定基準:
 *   - bass     : electric_bass_finger（アニソンの低音域を自然に再現）
 *   - piano    : acoustic_grand_piano（コード・メロディ兼用）
 *   - guitar   : electric_guitar_clean（クリーントーンでピアノロール可視化）
 *
 * ※ melody トラックは sfPiano（acoustic_grand_piano）を流用する。
 *    声系音源（choir_aahs / voice_oohs）は廃止済み。
 */

/**
 * トラック種別 → SoundFont instrument 名 のマッピング
 * audioEngine.ts の loadSoundfonts() で参照する。
 * melody は sfPiano を流用するため、独立したエントリは持たない。
 */
export const SF_INSTRUMENTS = {
  bass: 'electric_bass_finger',
  piano: 'acoustic_grand_piano',
  guitar: 'electric_guitar_clean',
} as const

/**
 * トラック種別 → SoundFont 音量ゲイン のマッピング
 * ベースは低音域のため少し大きめに設定する。
 */
export const SF_GAINS = {
  bass: 2.0,   // ベースは低音域のため少し大きめ
  piano: 1.5,
  guitar: 1.5,
  // melody は sfPiano を流用するが、主旋律として少し前に出したいので
  // piano(1.5) より大きめにする（1.5 → 2.0、約 +33% / 約 +2.5dB）。
  melody: 2.0,
} as const
