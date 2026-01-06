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
        # ボーカル用パラメータ（感度UP調整済み）
        self.vocal_fmin = 80    # Hz (E2あたり)
        self.vocal_fmax = 2000  # Hz (B6あたり) - 女性ボーカル対応
        self.min_note_duration = 0.01  # 0.02→0.01秒 短いノートも拾う
        self.voiced_threshold = 0.02   # 0.05→0.02 弱いメロディも拾う
        self.pitch_tolerance = 1  # 半音（ビブラート許容）
        self.gap_tolerance = 0.08  # 0.05→0.08秒 ぶつ切り軽減

        # ドラム用パラメータ（GM Drum Map準拠）
        self.drum_map = {
            "kick": 36,         # Bass Drum 1
            "snare": 38,        # Acoustic Snare
            "hihat_closed": 42, # Closed Hi-Hat
            "hihat_open": 46,   # Open Hi-Hat
            "tom_high": 48,     # Hi-Mid Tom
            "tom_mid": 45,      # Low Tom
            "tom_low": 41,      # Low Floor Tom
            "crash": 49,        # Crash Cymbal 1
            "ride": 51,         # Ride Cymbal 1
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
        周波数帯域分離によるドラムイベント抽出

        各ドラムの周波数特性:
        - Kick: 20-100Hz（低域のドスン）
        - Toms: 80-400Hz（中低域のドン）
        - Snare: 150-500Hz + 2000-5000Hz（胴鳴り＋スナッピー）
        - Hi-hat: 5000-15000Hz（金属的なチッ）
        - Crash/Ride: 3000-10000Hz（シンバルのシャーン）

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
            # 44100Hzで読み込み（高周波数を正確に捉えるため）
            y, sr = librosa.load(str(audio_file), sr=44100, mono=True)
            print(f"[Librosa] Drum audio loaded: {len(y)} samples, sr={sr}, duration={len(y)/sr:.1f}s")

            if len(y) == 0:
                return {
                    "success": False,
                    "notes": [],
                    "error": "Audio file is empty",
                }

            notes = []
            detected_times = {}  # 重複検出防止用

            # 1. キック検出（20-100Hz）
            print(f"[Librosa] Detecting kick...")
            y_kick = self._bandpass_filter(y, sr, 20, 100)
            kick_onsets = self._detect_band_onsets(y_kick, sr, tempo, delta=0.08)
            print(f"[Librosa] Kick onsets: {len(kick_onsets)}")
            for t in kick_onsets:
                notes.append(self._create_drum_note("kick", t))
                detected_times[round(t, 2)] = "kick"

            # 2. スネア検出（150-500Hz + 高周波成分で判定）
            print(f"[Librosa] Detecting snare...")
            y_snare_low = self._bandpass_filter(y, sr, 150, 500)
            y_snare_high = self._bandpass_filter(y, sr, 2000, 5000)
            snare_onsets = self._detect_band_onsets(y_snare_low, sr, tempo, delta=0.06)
            for t in snare_onsets:
                # キックと重複していたらスキップ
                if self._is_duplicate(t, detected_times, threshold=0.03):
                    continue
                # スナッピー成分（高周波）があればスネアと判定
                if self._has_energy_at_time(y_snare_high, sr, t, threshold=0.1):
                    notes.append(self._create_drum_note("snare", t, velocity=95))
                    detected_times[round(t, 2)] = "snare"
            print(f"[Librosa] Snare detected: {sum(1 for n in notes if n['pitch'] == self.drum_map['snare'])}")

            # 3. タム検出（80-400Hz、キック/スネア以外）
            print(f"[Librosa] Detecting toms...")
            y_tom = self._bandpass_filter(y, sr, 80, 400)
            tom_onsets = self._detect_band_onsets(y_tom, sr, tempo, delta=0.07)
            for t in tom_onsets:
                if self._is_duplicate(t, detected_times, threshold=0.03):
                    continue
                # 周波数重心でタムの種類を判定
                centroid = self._get_spectral_centroid_at_time(y, sr, t)
                if centroid < 150:
                    tom_type = "tom_low"
                elif centroid < 250:
                    tom_type = "tom_mid"
                else:
                    tom_type = "tom_high"
                notes.append(self._create_drum_note(tom_type, t, velocity=90))
                detected_times[round(t, 2)] = tom_type
            print(f"[Librosa] Toms detected: {sum(1 for n in notes if 'tom' in str(n.get('pitch', '')))}")

            # 4. ハイハット検出（5000-15000Hz）
            print(f"[Librosa] Detecting hi-hat...")
            y_hihat = self._bandpass_filter(y, sr, 5000, 15000)
            hihat_onsets = self._detect_band_onsets(y_hihat, sr, tempo, delta=0.04)
            for t in hihat_onsets:
                if self._is_duplicate(t, detected_times, threshold=0.02):
                    continue
                # 持続時間でオープン/クローズドを判定
                decay = self._get_decay_time(y_hihat, sr, t)
                if decay > 0.1:
                    hihat_type = "hihat_open"
                else:
                    hihat_type = "hihat_closed"
                notes.append(self._create_drum_note(hihat_type, t, velocity=80))
                detected_times[round(t, 2)] = hihat_type
            print(f"[Librosa] Hi-hat detected: {sum(1 for n in notes if 'hihat' in str(n.get('pitch', '')))}")

            # 5. クラッシュ/ライドシンバル検出（3000-10000Hz）
            print(f"[Librosa] Detecting cymbals...")
            y_cymbal = self._bandpass_filter(y, sr, 3000, 10000)
            cymbal_onsets = self._detect_band_onsets(y_cymbal, sr, tempo, delta=0.1)
            for t in cymbal_onsets:
                if self._is_duplicate(t, detected_times, threshold=0.05):
                    continue
                # 音量でクラッシュ/ライドを判定（クラッシュはアタックが強い）
                attack = self._get_attack_strength(y_cymbal, sr, t)
                if attack > 0.3:
                    cymbal_type = "crash"
                    vel = 100
                else:
                    cymbal_type = "ride"
                    vel = 85
                notes.append(self._create_drum_note(cymbal_type, t, velocity=vel))
                detected_times[round(t, 2)] = cymbal_type
            print(f"[Librosa] Cymbals detected: {sum(1 for n in notes if n['pitch'] in [self.drum_map['crash'], self.drum_map['ride']])}")

            # 時間順にソート
            notes.sort(key=lambda n: n["start"])

            # 統計を出力
            drum_counts = {}
            for note in notes:
                pitch = note["pitch"]
                drum_name = [k for k, v in self.drum_map.items() if v == pitch]
                drum_name = drum_name[0] if drum_name else str(pitch)
                drum_counts[drum_name] = drum_counts.get(drum_name, 0) + 1
            print(f"[Librosa] Drum summary: {drum_counts}")
            print(f"[Librosa] Total drum events: {len(notes)}")

            return {
                "success": True,
                "notes": notes,
                "error": None,
            }

        except Exception as e:
            import traceback
            print(f"[Librosa] Drums error: {type(e).__name__}: {str(e)}")
            traceback.print_exc()
            return {
                "success": False,
                "notes": [],
                "error": f"Drum detection failed: {str(e)}",
            }

    def _bandpass_filter(self, y: np.ndarray, sr: int, low: float, high: float) -> np.ndarray:
        """バンドパスフィルタを適用"""
        nyquist = sr / 2
        low_norm = max(low / nyquist, 0.001)
        high_norm = min(high / nyquist, 0.999)
        if low_norm >= high_norm:
            return y
        b, a = signal.butter(4, [low_norm, high_norm], btype='band')
        return signal.filtfilt(b, a, y)

    def _detect_band_onsets(self, y: np.ndarray, sr: int, tempo: float = None, delta: float = 0.05) -> np.ndarray:
        """帯域別オンセット検出"""
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
        onset_frames = librosa.onset.onset_detect(
            onset_envelope=onset_env,
            sr=sr,
            hop_length=512,
            backtrack=True,
            units='frames',
            delta=delta,
        )
        onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=512)

        # クオンタイズ
        if tempo and tempo > 0:
            beat_duration = 60.0 / tempo
            grid = beat_duration * 0.25  # 16分音符
            onset_times = np.round(onset_times / grid) * grid

        return onset_times

    def _create_drum_note(self, drum_type: str, time: float, velocity: int = 100) -> dict:
        """ドラムノートを生成"""
        return {
            "pitch": self.drum_map[drum_type],
            "start": round(time, 3),
            "end": round(time + 0.05, 3),
            "velocity": velocity,
        }

    def _is_duplicate(self, time: float, detected: dict, threshold: float = 0.03) -> bool:
        """既に検出済みかチェック"""
        for t in detected.keys():
            if abs(t - round(time, 2)) < threshold:
                return True
        return False

    def _has_energy_at_time(self, y: np.ndarray, sr: int, time: float, threshold: float = 0.1) -> bool:
        """指定時刻にエネルギーがあるかチェック"""
        start_sample = int(time * sr)
        end_sample = min(start_sample + int(sr * 0.05), len(y))
        if start_sample >= len(y):
            return False
        segment = y[start_sample:end_sample]
        rms = np.sqrt(np.mean(segment ** 2))
        return rms > threshold * np.max(np.abs(y))

    def _get_spectral_centroid_at_time(self, y: np.ndarray, sr: int, time: float) -> float:
        """指定時刻のスペクトル重心を取得"""
        start_sample = int(time * sr)
        end_sample = min(start_sample + 2048, len(y))
        if start_sample >= len(y):
            return 200.0
        segment = y[start_sample:end_sample]
        if len(segment) < 512:
            return 200.0
        centroid = librosa.feature.spectral_centroid(y=segment, sr=sr)
        return float(centroid.mean())

    def _get_decay_time(self, y: np.ndarray, sr: int, time: float) -> float:
        """減衰時間を推定（オープン/クローズドハイハット判定用）"""
        start_sample = int(time * sr)
        window_size = int(sr * 0.2)  # 200ms window
        end_sample = min(start_sample + window_size, len(y))
        if start_sample >= len(y):
            return 0.0
        segment = y[start_sample:end_sample]
        if len(segment) < 100:
            return 0.0
        # RMSエンベロープを計算
        frame_length = 512
        hop_length = 128
        rms = librosa.feature.rms(y=segment, frame_length=frame_length, hop_length=hop_length)[0]
        if len(rms) < 2:
            return 0.0
        # ピークから-6dBになるまでの時間
        peak_idx = np.argmax(rms)
        peak_val = rms[peak_idx]
        threshold = peak_val * 0.5  # -6dB
        for i in range(peak_idx, len(rms)):
            if rms[i] < threshold:
                return (i - peak_idx) * hop_length / sr
        return 0.15  # 減衰しない場合はオープンと判定

    def _get_attack_strength(self, y: np.ndarray, sr: int, time: float) -> float:
        """アタックの強さを取得（クラッシュ/ライド判定用）"""
        start_sample = int(time * sr)
        window_size = int(sr * 0.05)  # 50ms
        end_sample = min(start_sample + window_size, len(y))
        if start_sample >= len(y):
            return 0.0
        segment = y[start_sample:end_sample]
        return float(np.max(np.abs(segment)))

    def _detect_onsets(self, y: np.ndarray, sr: int, tempo: float = None) -> np.ndarray:
        """オンセット検出（感度UP調整済み）"""
        onset_frames = librosa.onset.onset_detect(
            y=y,
            sr=sr,
            hop_length=512,
            backtrack=True,
            units='frames',
            delta=0.05,  # デフォルト0.07→0.05 感度UP
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
