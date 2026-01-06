"""
Basic Pitch サービス

Spotify's Basic Pitch を使用した高精度オーディオ→MIDI変換
+ librosaによるテンポ検出
+ 信頼度フィルタリング
+ ビートクオンタイズ
"""
from pathlib import Path
from typing import Optional
import numpy as np

# scipy互換性修正（scipy.signal.gaussian → scipy.signal.windows.gaussian）
# https://github.com/spotify/basic-pitch/issues/120
import scipy.signal
import scipy.signal.windows
if not hasattr(scipy.signal, 'gaussian'):
    scipy.signal.gaussian = scipy.signal.windows.gaussian

# Basic Pitch のインポート
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH

# テンポ検出用
import librosa

# デバッグ: 使用されるモデルパスを表示
print(f"[BasicPitch] Model path: {ICASSP_2022_MODEL_PATH}")


class BasicPitchService:
    """Basic Pitch による音声→MIDI変換 + テンポ検出 + クオンタイズ"""

    def __init__(self):
        """初期化（モデルはpredict時に自動ロード）"""
        self.model_path = ICASSP_2022_MODEL_PATH
        print(f"[BasicPitch] Using model: {self.model_path}")
        # 信頼度しきい値（これ以下のノートは除外）
        self.confidence_threshold = 0.25  # 0.3→0.25 ノートを拾いやすく
        # クオンタイズ解像度（16分音符 = 0.25拍）
        self.quantize_resolution = 0.25  # 0.5→0.25 精度UP
        # ノートマージ用の最大ギャップ（秒）
        self.merge_gap_threshold = 0.15  # 0.1→0.15 ぶつ切り軽減

    def detect_tempo(self, audio_path: str) -> tuple[float, np.ndarray]:
        """
        librosaでテンポとビート位置を検出

        Returns:
            (tempo, beat_times): テンポ(BPM)とビート位置の配列
        """
        try:
            y, sr = librosa.load(audio_path, sr=22050)
            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
            beat_times = librosa.frames_to_time(beat_frames, sr=sr)
            # tempo が numpy 配列の場合は最初の値を取得
            if hasattr(tempo, '__len__'):
                tempo = float(tempo[0]) if len(tempo) > 0 else 120.0
            return float(tempo), beat_times
        except Exception as e:
            print(f"[BasicPitch] Tempo detection failed: {e}")
            return 120.0, np.array([])

    def quantize_time(self, time: float, tempo: float, resolution: float = 0.5) -> float:
        """
        時間をビートグリッドにクオンタイズ

        Args:
            time: 元の時間（秒）
            tempo: テンポ（BPM）
            resolution: クオンタイズ解像度（拍単位、0.5=8分音符）

        Returns:
            クオンタイズされた時間（秒）
        """
        beat_duration = 60.0 / tempo  # 1拍の長さ（秒）
        grid_duration = beat_duration * resolution  # グリッド単位の長さ
        # 最も近いグリッドにスナップ
        quantized = round(time / grid_duration) * grid_duration
        return round(quantized, 3)

    def merge_notes(self, notes: list[dict], gap_threshold: float = 0.1) -> list[dict]:
        """
        同じピッチの隣接ノートをマージしてぶつ切りを解消

        Args:
            notes: ノートのリスト（開始時間順にソート済み）
            gap_threshold: マージする最大ギャップ（秒）

        Returns:
            マージされたノートのリスト
        """
        if not notes:
            return []

        # ピッチごとにグループ化
        pitch_groups: dict[int, list[dict]] = {}
        for note in notes:
            pitch = note["pitch"]
            if pitch not in pitch_groups:
                pitch_groups[pitch] = []
            pitch_groups[pitch].append(note)

        merged_notes = []

        for pitch, group in pitch_groups.items():
            # 開始時間順にソート
            group.sort(key=lambda n: n["start"])

            current_note = None
            for note in group:
                if current_note is None:
                    current_note = note.copy()
                else:
                    # 前のノートの終了と現在のノートの開始のギャップをチェック
                    gap = note["start"] - current_note["end"]

                    if gap <= gap_threshold:
                        # マージ: 終了時間を延長、ベロシティは平均
                        current_note["end"] = note["end"]
                        current_note["velocity"] = (current_note["velocity"] + note["velocity"]) // 2
                        if "confidence" in note and "confidence" in current_note:
                            current_note["confidence"] = max(current_note["confidence"], note["confidence"])
                    else:
                        # ギャップが大きいので別ノートとして保存
                        merged_notes.append(current_note)
                        current_note = note.copy()

            # 最後のノートを追加
            if current_note:
                merged_notes.append(current_note)

        # 開始時間順にソート
        merged_notes.sort(key=lambda n: n["start"])
        return merged_notes

    def transcribe_audio(self, audio_path: str, quantize: bool = True) -> dict:
        """
        音声ファイルからノート情報を抽出

        Args:
            audio_path: 音声ファイルのパス
            quantize: ビートグリッドにクオンタイズするか

        Returns:
            {
                "success": True/False,
                "tempo": テンポ（BPM）- librosaで検出,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Audio file not found: {audio_path}",
            }

        file_size = audio_file.stat().st_size
        if file_size == 0:
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": "Audio file is empty",
            }

        try:
            # 1. テンポ検出（librosa）
            tempo, beat_times = self.detect_tempo(str(audio_file))
            print(f"[BasicPitch] Detected tempo: {tempo:.1f} BPM")

            # 2. Basic Pitch で推論
            model_output, midi_data, note_events = predict(
                str(audio_file),
                model_or_model_path=self.model_path,
            )

            # 3. note_events を変換 + 信頼度フィルタリング
            # note_events: List of (start_time, end_time, pitch, velocity, [confidence])
            notes = []
            filtered_count = 0

            for event in note_events:
                start_time = float(event[0])
                end_time = float(event[1])
                pitch = int(event[2])
                velocity = float(event[3])  # 0-1

                # 信頼度（velocity）でフィルタリング
                if velocity < self.confidence_threshold:
                    filtered_count += 1
                    continue

                # クオンタイズ
                if quantize and tempo > 0:
                    start_time = self.quantize_time(start_time, tempo, self.quantize_resolution)
                    end_time = self.quantize_time(end_time, tempo, self.quantize_resolution)
                    # 最小ノート長を確保（16分音符）
                    min_length = 60.0 / tempo * self.quantize_resolution
                    if end_time <= start_time:
                        end_time = start_time + min_length

                notes.append({
                    "pitch": pitch,
                    "start": round(start_time, 3),
                    "end": round(end_time, 3),
                    "velocity": min(127, max(1, int(velocity * 127))),
                    "confidence": round(velocity, 2),  # 信頼度も保存
                })

            # 開始時間順にソート
            notes.sort(key=lambda n: n["start"])

            # ぶつ切りノートをマージ
            original_count = len(notes)
            notes = self.merge_notes(notes, gap_threshold=self.merge_gap_threshold)

            print(f"[BasicPitch] Transcribed {len(notes)} notes (filtered {filtered_count}, merged {original_count - len(notes)})")

            return {
                "success": True,
                "tempo": round(tempo),
                "notes": notes,
                "error": None,
            }

        except Exception as e:
            print(f"[BasicPitch] Error: {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Basic Pitch transcription failed: {str(e)}",
            }

    def transcribe_track(self, audio_path: str, track_type: str, tempo: float = None) -> dict:
        """
        楽器別にトラックをMIDI変換

        Args:
            audio_path: 分離された音声ファイルのパス
            track_type: トラック種別（"drums", "bass", "other", "vocals"）
            tempo: テンポ（BPM）- Noneの場合は検出する

        Returns:
            {
                "success": True/False,
                "tempo": テンポ（BPM）,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        # vocals は melody として処理（ボーカルメロディをピアノで表示）

        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Audio file not found: {audio_path}",
            }

        file_size = audio_file.stat().st_size
        if file_size == 0:
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Audio file is empty: {track_type}",
            }

        try:
            # テンポが未検出なら検出
            if tempo is None:
                tempo, _ = self.detect_tempo(str(audio_file))

            # 楽器別パラメータ設定
            params = self._get_track_params(track_type)

            # ドラムはBasic Pitchに不向きなのでスキップ
            if params.get("skip"):
                print(f"[BasicPitch] {track_type}: skipped (not suitable for pitch detection)")
                return {
                    "success": True,
                    "tempo": round(tempo) if tempo else None,
                    "notes": [],
                    "error": None,
                }

            model_output, midi_data, note_events = predict(
                str(audio_file),
                model_or_model_path=self.model_path,
                onset_threshold=params["onset_threshold"],
                frame_threshold=params["frame_threshold"],
                minimum_note_length=params["min_note_length"],
                minimum_frequency=params.get("min_freq"),
                maximum_frequency=params.get("max_freq"),
            )

            # note_events を変換 + 信頼度フィルタリング
            notes = []
            filtered_count = 0

            for event in note_events:
                start_time = float(event[0])
                end_time = float(event[1])
                pitch = int(event[2])
                velocity = float(event[3])  # 0-1

                # 信頼度フィルタリング（楽器別しきい値）
                if velocity < params["confidence_threshold"]:
                    filtered_count += 1
                    continue

                # ドラムは短いノートに（打楽器なので）
                if track_type == "drums":
                    end_time = min(end_time, start_time + 0.05)
                    # ドラムノートをGM Drumマップに正規化
                    pitch = self._normalize_drum_pitch(pitch)

                # クオンタイズ
                if tempo > 0:
                    resolution = 0.125 if track_type == "drums" else 0.25  # ドラムは32分音符
                    start_time = self.quantize_time(start_time, tempo, resolution)
                    if track_type != "drums":
                        end_time = self.quantize_time(end_time, tempo, resolution)
                        min_length = 60.0 / tempo * resolution
                        if end_time <= start_time:
                            end_time = start_time + min_length

                notes.append({
                    "pitch": pitch,
                    "start": round(start_time, 3),
                    "end": round(end_time, 3),
                    "velocity": min(127, max(1, int(velocity * 127))),
                    "confidence": round(velocity, 2),
                })

            # 開始時間順にソート
            notes.sort(key=lambda n: n["start"])

            # ドラム以外はノートをマージ（ドラムは短いヒットなのでマージしない）
            if track_type != "drums":
                original_count = len(notes)
                notes = self.merge_notes(notes, gap_threshold=self.merge_gap_threshold)
                print(f"[BasicPitch] {track_type}: {len(notes)} notes (filtered {filtered_count}, merged {original_count - len(notes)})")
            else:
                print(f"[BasicPitch] {track_type}: {len(notes)} notes (filtered {filtered_count})")

            return {
                "success": True,
                "tempo": round(tempo) if tempo else None,
                "notes": notes,
                "error": None,
            }

        except Exception as e:
            print(f"[BasicPitch] {track_type} Error: {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Track transcription failed: {str(e)}",
            }

    def _get_track_params(self, track_type: str) -> dict:
        """楽器別のパラメータを取得（感度UP調整済み）"""
        params = {
            "drums": {
                # ドラムはBasic Pitchに不向き - スキップフラグ
                "skip": True,
                "onset_threshold": 0.5,
                "frame_threshold": 0.5,
                "min_note_length": 50,
                "confidence_threshold": 0.8,
                "min_freq": None,
                "max_freq": None,
            },
            "bass": {
                "onset_threshold": 0.3,       # 0.5→0.3 感度UP
                "frame_threshold": 0.25,      # 0.4→0.25 持続音検出強化
                "min_note_length": 50,        # 100→50ms 細かいノートも拾う
                "confidence_threshold": 0.3,  # 0.5→0.3 低い音を拾いやすく
                "min_freq": 30,   # E1あたり
                "max_freq": 300,  # D4あたり（ベース音域を絞る）
            },
            "other": {
                "onset_threshold": 0.3,       # 0.5→0.3 感度UP
                "frame_threshold": 0.25,      # 0.4→0.25 持続音検出強化
                "min_note_length": 50,        # 80→50ms 細かいノートも拾う
                "confidence_threshold": 0.35, # 0.5→0.35 和音の弱い音を拾う
                "min_freq": 80,   # E2あたり
                "max_freq": 2000, # B6あたり
            },
            "vocals": {
                "onset_threshold": 0.3,       # 0.4→0.3 感度UP
                "frame_threshold": 0.2,       # 0.3→0.2 持続音検出強化
                "min_note_length": 50,        # 100→50ms 細かいノートも拾う
                "confidence_threshold": 0.25, # 0.4→0.25 弱いメロディも拾う
                "min_freq": 150,  # D3あたり（ボーカル下限）
                "max_freq": 1000, # B5あたり（ボーカル上限）
            },
        }
        return params.get(track_type, params["other"])

    def _normalize_drum_pitch(self, pitch: int) -> int:
        """
        検出されたピッチをGM Drumマップに正規化

        GM Drum Map:
            35: Acoustic Bass Drum
            36: Bass Drum 1 (Kick)
            38: Acoustic Snare
            42: Closed Hi-Hat
            46: Open Hi-Hat
            49: Crash Cymbal 1
            51: Ride Cymbal 1
        """
        # 低いピッチはキック
        if pitch < 40:
            return 36  # Kick
        # 中間はスネアまたはタム
        elif pitch < 50:
            return 38  # Snare
        # 高いピッチはハイハット/シンバル
        elif pitch < 60:
            return 42  # Hi-Hat
        else:
            return 49  # Crash


# シングルトンインスタンス
_basic_pitch_service: Optional[BasicPitchService] = None


def get_basic_pitch_service() -> BasicPitchService:
    """BasicPitchServiceのシングルトンを取得"""
    global _basic_pitch_service
    if _basic_pitch_service is None:
        _basic_pitch_service = BasicPitchService()
    return _basic_pitch_service
