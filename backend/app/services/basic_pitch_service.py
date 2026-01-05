"""
Basic Pitch サービス

Spotify's Basic Pitch を使用した高精度オーディオ→MIDI変換
"""
from pathlib import Path
from typing import Optional

# scipy互換性修正（scipy.signal.gaussian → scipy.signal.windows.gaussian）
# https://github.com/spotify/basic-pitch/issues/120
import scipy.signal
import scipy.signal.windows
if not hasattr(scipy.signal, 'gaussian'):
    scipy.signal.gaussian = scipy.signal.windows.gaussian

# Basic Pitch のインポート
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH


class BasicPitchService:
    """Basic Pitch による音声→MIDI変換"""

    def __init__(self):
        """初期化（モデルはpredict時に自動ロード）"""
        self.model_path = ICASSP_2022_MODEL_PATH

    def transcribe_audio(self, audio_path: str) -> dict:
        """
        音声ファイルからノート情報を抽出

        Args:
            audio_path: 音声ファイルのパス

        Returns:
            {
                "success": True/False,
                "tempo": テンポ（BPM）- Basic Pitchはテンポ検出しないのでNone,
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
            # Basic Pitch で推論
            model_output, midi_data, note_events = predict(
                str(audio_file),
                model_or_model_path=self.model_path,
            )

            # note_events を変換
            # note_events: List of (start_time, end_time, pitch, velocity, [confidence])
            notes = []
            for event in note_events:
                start_time = float(event[0])
                end_time = float(event[1])
                pitch = int(event[2])
                velocity = int(event[3] * 127)  # 0-1 → 0-127

                notes.append({
                    "pitch": pitch,
                    "start": round(start_time, 3),
                    "end": round(end_time, 3),
                    "velocity": min(127, max(1, velocity)),
                })

            # 開始時間順にソート
            notes.sort(key=lambda n: n["start"])

            print(f"[BasicPitch] Transcribed {len(notes)} notes from {audio_file.name}")

            return {
                "success": True,
                "tempo": None,  # Basic Pitchはテンポ検出しない
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

    def transcribe_track(self, audio_path: str, track_type: str) -> dict:
        """
        楽器別にトラックをMIDI変換

        Args:
            audio_path: 分離された音声ファイルのパス
            track_type: トラック種別（"drums", "bass", "other", "vocals"）

        Returns:
            {
                "success": True/False,
                "tempo": テンポ（BPM）,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        # ボーカルは作曲学習では使わない
        if track_type == "vocals":
            return {
                "success": True,
                "tempo": None,
                "notes": [],
                "error": None,
            }

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
            # Basic Pitch で推論
            # drums トラックは onset_threshold を下げて検出しやすく
            onset_threshold = 0.3 if track_type == "drums" else 0.5
            frame_threshold = 0.2 if track_type == "drums" else 0.3

            model_output, midi_data, note_events = predict(
                str(audio_file),
                model_or_model_path=self.model_path,
                onset_threshold=onset_threshold,
                frame_threshold=frame_threshold,
                minimum_note_length=50 if track_type == "drums" else 127.70,  # ms
                minimum_frequency=None,  # 自動
                maximum_frequency=None,  # 自動
            )

            # note_events を変換
            notes = []
            for event in note_events:
                start_time = float(event[0])
                end_time = float(event[1])
                pitch = int(event[2])
                velocity = int(event[3] * 127)

                # ドラムは短いノートに
                if track_type == "drums":
                    end_time = min(end_time, start_time + 0.1)

                notes.append({
                    "pitch": pitch,
                    "start": round(start_time, 3),
                    "end": round(end_time, 3),
                    "velocity": min(127, max(1, velocity)),
                })

            # 開始時間順にソート
            notes.sort(key=lambda n: n["start"])

            print(f"[BasicPitch] {track_type}: {len(notes)} notes")

            return {
                "success": True,
                "tempo": None,
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


# シングルトンインスタンス
_basic_pitch_service: Optional[BasicPitchService] = None


def get_basic_pitch_service() -> BasicPitchService:
    """BasicPitchServiceのシングルトンを取得"""
    global _basic_pitch_service
    if _basic_pitch_service is None:
        _basic_pitch_service = BasicPitchService()
    return _basic_pitch_service
