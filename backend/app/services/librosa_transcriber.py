"""
Librosa ベースの音声解析サービス

TensorFlow不要の軽量な実装:
- pyin: ボーカルメロディ抽出（単音ピッチ検出）
- onset_detect: ドラムオンセット検出
"""
from pathlib import Path
from typing import Optional
import numpy as np
import librosa
from scipy import signal


class LibrosaTranscriber:
    """Librosaによる音声→ノート変換"""

    def __init__(self):
        # ボーカル用パラメータ
        self.vocal_fmin = 80    # Hz (E2あたり)
        self.vocal_fmax = 2000  # Hz (B6あたり) - 女性ボーカル対応
        self.min_note_duration = 0.02  # 秒（短いノートも拾う）
        self.voiced_threshold = 0.05  # 有声判定しきい値（さらに緩和）
        self.pitch_tolerance = 1  # 半音（ビブラート許容）
        self.gap_tolerance = 0.05  # 秒（この時間以内のギャップは無視）

        # ドラム用パラメータ
        self.drum_map = {
            "kick": 36,     # Bass Drum
            "snare": 38,    # Acoustic Snare
            "hihat": 42,    # Closed Hi-Hat
        }

    def extract_melody(self, audio_path: str, tempo: float = None) -> dict:
        """
        pyinでボーカルメロディを抽出

        Args:
            audio_path: 音声ファイルのパス（分離済みボーカル推奨）
            tempo: テンポ（BPM）- クオンタイズ用

        Returns:
            {
                "success": True/False,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {
                "success": False,
                "notes": [],
                "error": f"Audio file not found: {audio_path}",
            }

        try:
            print(f"[Librosa] Loading audio: {audio_file}")
            # 音声を読み込み
            y, sr = librosa.load(str(audio_file), sr=22050, mono=True)
            print(f"[Librosa] Loaded: {len(y)} samples, sr={sr}, duration={len(y)/sr:.1f}s")

            if len(y) == 0:
                return {
                    "success": False,
                    "notes": [],
                    "error": "Audio file is empty",
                }

            # pyinでピッチ推定（高解像度）
            print(f"[Librosa] Running pyin for melody extraction...")
            hop_length = 128  # 最高解像度（デフォルト512）
            # f0: 基本周波数（Hz）、voiced_flag: 有声/無声フラグ
            f0, voiced_flag, voiced_probs = librosa.pyin(
                y,
                fmin=self.vocal_fmin,
                fmax=self.vocal_fmax,
                sr=sr,
                frame_length=2048,
                hop_length=hop_length,
                fill_na=None,  # NaNを残して後処理で対応
            )

            # 時間軸
            times = librosa.times_like(f0, sr=sr, hop_length=hop_length)

            # デバッグ: 有声フレーム数
            voiced_count = np.sum(voiced_flag) if voiced_flag is not None else 0
            print(f"[Librosa] Total frames: {len(f0)}, voiced frames: {voiced_count}")

            # ピッチをノートに変換
            notes = self._f0_to_notes(f0, voiced_flag, voiced_probs, times, tempo)

            print(f"[Librosa] Extracted {len(notes)} melody notes")

            return {
                "success": True,
                "notes": notes,
                "error": None,
            }

        except Exception as e:
            print(f"[Librosa] Melody error: {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "notes": [],
                "error": f"Melody extraction failed: {str(e)}",
            }

    def _f0_to_notes(
        self,
        f0: np.ndarray,
        voiced_flag: np.ndarray,
        voiced_probs: np.ndarray,
        times: np.ndarray,
        tempo: float = None
    ) -> list[dict]:
        """
        連続ピッチデータをノートイベントに変換
        ビブラート許容・ギャップブリッジ対応
        """
        notes = []

        # 周波数をMIDIノート番号に変換
        midi_pitches = np.zeros_like(f0)
        valid_mask = ~np.isnan(f0) & (f0 > 0) & voiced_flag
        midi_pitches[valid_mask] = librosa.hz_to_midi(f0[valid_mask])
        midi_pitches[~valid_mask] = -1

        # ノートをグループ化
        current_note = None
        current_start = None
        current_end = None
        current_pitches = []
        current_probs = []
        gap_start = None  # ギャップ開始時刻

        for i, (t, pitch, prob) in enumerate(zip(times, midi_pitches, voiced_probs)):
            is_valid = pitch >= 0 and not np.isnan(prob) and prob >= self.voiced_threshold

            if not is_valid:
                # 無効なフレーム
                if current_note is not None:
                    if gap_start is None:
                        # ギャップ開始
                        gap_start = t
                        current_end = times[i-1] if i > 0 else t
                    elif t - gap_start > self.gap_tolerance:
                        # ギャップが長すぎる - ノートを終了
                        note = self._finalize_note(
                            current_note, current_start, current_end,
                            current_pitches, current_probs, tempo
                        )
                        if note:
                            notes.append(note)
                        current_note = None
                        current_start = None
                        current_end = None
                        current_pitches = []
                        current_probs = []
                        gap_start = None
            else:
                rounded_pitch = round(pitch)

                if current_note is None:
                    # 新しいノート開始
                    current_note = rounded_pitch
                    current_start = t
                    current_end = t
                    current_pitches = [pitch]
                    current_probs = [prob]
                    gap_start = None
                elif abs(rounded_pitch - current_note) <= self.pitch_tolerance:
                    # 同じノートが続く（ビブラート許容）
                    current_pitches.append(pitch)
                    current_probs.append(prob)
                    current_end = t
                    gap_start = None  # ギャップ解消
                else:
                    # 新しいノートに変わった
                    note = self._finalize_note(
                        current_note, current_start, current_end,
                        current_pitches, current_probs, tempo
                    )
                    if note:
                        notes.append(note)
                    current_note = rounded_pitch
                    current_start = t
                    current_end = t
                    current_pitches = [pitch]
                    current_probs = [prob]
                    gap_start = None

        # 最後のノートを追加
        if current_note is not None and len(current_pitches) > 0:
            note = self._finalize_note(
                current_note, current_start, current_end or times[-1],
                current_pitches, current_probs, tempo
            )
            if note:
                notes.append(note)

        # 近接ノートをマージ（同じピッチで短いギャップ）
        notes = self._merge_nearby_notes(notes)

        return notes

    def _merge_nearby_notes(self, notes: list[dict]) -> list[dict]:
        """同じピッチの近接ノートをマージ"""
        if len(notes) < 2:
            return notes

        merged = [notes[0]]
        for note in notes[1:]:
            prev = merged[-1]
            gap = note["start"] - prev["end"]
            # 同じピッチで短いギャップならマージ
            if note["pitch"] == prev["pitch"] and gap <= self.gap_tolerance:
                prev["end"] = note["end"]
                prev["velocity"] = max(prev["velocity"], note["velocity"])
            else:
                merged.append(note)
        return merged

    def _finalize_note(
        self,
        pitch: int,
        start: float,
        end: float,
        pitches: list[float],
        probs: list[float],
        tempo: float = None
    ) -> Optional[dict]:
        """ノートを確定"""
        duration = end - start
        if duration < self.min_note_duration:
            return None

        # 平均ピッチを使用
        avg_pitch = round(np.mean(pitches)) if pitches else pitch
        avg_confidence = np.mean(probs) if probs else 0.5

        # クオンタイズ
        if tempo and tempo > 0:
            beat_duration = 60.0 / tempo
            grid = beat_duration * 0.25  # 16分音符
            start = round(start / grid) * grid
            end = round(end / grid) * grid
            if end <= start:
                end = start + grid

        return {
            "pitch": int(avg_pitch),
            "start": round(start, 3),
            "end": round(end, 3),
            "velocity": min(127, max(40, int(avg_confidence * 100))),
        }

    def extract_drums(self, audio_path: str, tempo: float = None) -> dict:
        """
        オンセット検出でドラムイベントを抽出

        Args:
            audio_path: 音声ファイルのパス（分離済みドラム）
            tempo: テンポ（BPM）- クオンタイズ用

        Returns:
            {
                "success": True/False,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {
                "success": False,
                "notes": [],
                "error": f"Audio file not found: {audio_path}",
            }

        try:
            print(f"[Librosa] Loading drum audio: {audio_file}")
            # 音声を読み込み
            y, sr = librosa.load(str(audio_file), sr=22050, mono=True)
            print(f"[Librosa] Drum audio loaded: {len(y)} samples, duration={len(y)/sr:.1f}s")

            if len(y) == 0:
                return {
                    "success": False,
                    "notes": [],
                    "error": "Audio file is empty",
                }

            # 周波数帯域ごとに分離してオンセット検出
            notes = []
            print(f"[Librosa] Running onset detection for drums...")

            # キック（低域: ~150Hz）
            y_low = librosa.effects.harmonic(y)
            y_kick = signal.lfilter([1], [1, -0.97], y_low)
            kick_onsets = self._detect_onsets(y_kick, sr, tempo)
            print(f"[Librosa] Kick onsets: {len(kick_onsets)}")
            for onset_time in kick_onsets:
                notes.append({
                    "pitch": self.drum_map["kick"],
                    "start": round(onset_time, 3),
                    "end": round(onset_time + 0.05, 3),
                    "velocity": 100,
                })

            # スネア/ハイハット（高域）
            y_perc = librosa.effects.percussive(y)
            perc_onsets = self._detect_onsets(y_perc, sr, tempo)
            print(f"[Librosa] Percussion onsets: {len(perc_onsets)}")

            # スペクトル重心で分類
            for onset_time in perc_onsets:
                # 既にキックとして検出されていたらスキップ
                if any(abs(n["start"] - onset_time) < 0.03 for n in notes if n["pitch"] == self.drum_map["kick"]):
                    continue

                # 簡易的にスネアとハイハットを交互に（本当は周波数分析が必要）
                frame_idx = int(onset_time * sr / 512)
                if frame_idx < len(y) // 512:
                    # スペクトル重心で判定
                    start_sample = int(onset_time * sr)
                    end_sample = min(start_sample + 2048, len(y))
                    segment = y[start_sample:end_sample]
                    if len(segment) > 0:
                        centroid = librosa.feature.spectral_centroid(y=segment, sr=sr)
                        if centroid.mean() > 3000:
                            drum_type = "hihat"
                        else:
                            drum_type = "snare"
                    else:
                        drum_type = "snare"
                else:
                    drum_type = "snare"

                notes.append({
                    "pitch": self.drum_map[drum_type],
                    "start": round(onset_time, 3),
                    "end": round(onset_time + 0.05, 3),
                    "velocity": 90,
                })

            # 時間順にソート
            notes.sort(key=lambda n: n["start"])

            print(f"[Librosa] Detected {len(notes)} drum events")

            return {
                "success": True,
                "notes": notes,
                "error": None,
            }

        except Exception as e:
            print(f"[Librosa] Drums error: {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "notes": [],
                "error": f"Drum detection failed: {str(e)}",
            }

    def _detect_onsets(self, y: np.ndarray, sr: int, tempo: float = None) -> np.ndarray:
        """オンセット検出"""
        onset_frames = librosa.onset.onset_detect(
            y=y,
            sr=sr,
            hop_length=512,
            backtrack=True,
            units='frames',
        )
        onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=512)

        # クオンタイズ
        if tempo and tempo > 0:
            beat_duration = 60.0 / tempo
            grid = beat_duration * 0.25  # 16分音符
            onset_times = np.round(onset_times / grid) * grid

        return onset_times


# シングルトンインスタンス
_librosa_transcriber: Optional[LibrosaTranscriber] = None


def get_librosa_transcriber() -> LibrosaTranscriber:
    """LibrosaTranscriberのシングルトンを取得"""
    global _librosa_transcriber
    if _librosa_transcriber is None:
        _librosa_transcriber = LibrosaTranscriber()
    return _librosa_transcriber
