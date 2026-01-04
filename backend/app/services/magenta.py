"""
Magenta 音声→MIDI変換サービス

Docker経由でonsets_framesモデルを使用
"""
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import mido


class MagentaService:
    """Magenta onsets_frames を使用した音声→MIDI変換"""

    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "anisong_midi"
        self.temp_dir.mkdir(exist_ok=True)

    def audio_to_midi(self, audio_path: str) -> dict:
        """
        音声ファイルをMIDIに変換

        Args:
            audio_path: 音声ファイルのパス

        Returns:
            {
                "success": True/False,
                "midi_path": MIDIファイルのパス,
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_path = Path(audio_path)
        if not audio_path.exists():
            return {
                "success": False,
                "midi_path": None,
                "error": f"Audio file not found: {audio_path}",
            }

        # 出力MIDIファイルのパス
        midi_filename = audio_path.stem + ".mid"
        midi_path = self.temp_dir / midi_filename

        try:
            # Dockerコンテナでonsets_framesを実行
            result = subprocess.run(
                [
                    "docker", "run", "--rm",
                    "-v", f"{audio_path.parent}:/input:ro",
                    "-v", f"{self.temp_dir}:/output",
                    "tensorflow/magenta:latest",
                    "onsets_frames_transcription_transcribe",
                    "--model_dir=/magenta-models/onsets_frames_transcription",
                    f"--audio_file=/input/{audio_path.name}",
                    f"--output_file=/output/{midi_filename}",
                ],
                capture_output=True,
                text=True,
                timeout=600,  # 10分タイムアウト
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "midi_path": None,
                    "error": result.stderr or "Magenta transcription failed",
                }

            if not midi_path.exists():
                return {
                    "success": False,
                    "midi_path": None,
                    "error": "MIDI file not generated",
                }

            return {
                "success": True,
                "midi_path": str(midi_path),
                "error": None,
            }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "midi_path": None,
                "error": "Transcription timed out",
            }
        except FileNotFoundError:
            return {
                "success": False,
                "midi_path": None,
                "error": "Docker not found. Please install Docker.",
            }
        except Exception as e:
            return {
                "success": False,
                "midi_path": None,
                "error": str(e),
            }

    def parse_midi(self, midi_path: str) -> dict:
        """
        MIDIファイルを解析してノート情報を抽出

        Args:
            midi_path: MIDIファイルのパス

        Returns:
            {
                "success": True/False,
                "notes": ノート情報のリスト,
                "tempo": テンポ（BPM）,
                "duration": 曲の長さ（秒）,
                "error": エラーメッセージ（失敗時）
            }
        """
        try:
            midi = mido.MidiFile(midi_path)

            # テンポ取得（デフォルト120BPM）
            tempo = 500000  # microseconds per beat (120 BPM)
            for track in midi.tracks:
                for msg in track:
                    if msg.type == "set_tempo":
                        tempo = msg.tempo
                        break

            bpm = mido.tempo2bpm(tempo)

            # ノート情報を抽出
            notes = []
            current_time = 0
            ticks_per_beat = midi.ticks_per_beat

            for track in midi.tracks:
                track_time = 0
                active_notes = {}

                for msg in track:
                    track_time += msg.time

                    if msg.type == "note_on" and msg.velocity > 0:
                        # ノート開始
                        active_notes[msg.note] = {
                            "start_ticks": track_time,
                            "velocity": msg.velocity,
                        }
                    elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                        # ノート終了
                        if msg.note in active_notes:
                            start_info = active_notes.pop(msg.note)
                            start_time = mido.tick2second(
                                start_info["start_ticks"], ticks_per_beat, tempo
                            )
                            end_time = mido.tick2second(track_time, ticks_per_beat, tempo)

                            notes.append({
                                "pitch": msg.note,
                                "start": round(start_time, 3),
                                "end": round(end_time, 3),
                                "duration": round(end_time - start_time, 3),
                                "velocity": start_info["velocity"],
                            })

            # ノートを開始時間でソート
            notes.sort(key=lambda x: x["start"])

            # 曲の長さを計算
            duration = midi.length if hasattr(midi, "length") else (
                max(n["end"] for n in notes) if notes else 0
            )

            return {
                "success": True,
                "notes": notes,
                "tempo": round(bpm),
                "duration": round(duration, 2),
                "error": None,
            }

        except Exception as e:
            return {
                "success": False,
                "notes": [],
                "tempo": None,
                "duration": None,
                "error": str(e),
            }

    def extract_chords_from_notes(self, notes: list[dict], window_size: float = 0.5) -> list[dict]:
        """
        ノート情報からコード進行を推定

        Args:
            notes: ノート情報のリスト
            window_size: コード検出のウィンドウサイズ（秒）

        Returns:
            コード情報のリスト
        """
        if not notes:
            return []

        # ピッチクラス名
        pitch_classes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

        # コードパターン（ルートからの半音数）
        chord_patterns = {
            "": [0, 4, 7],           # Major
            "m": [0, 3, 7],          # Minor
            "7": [0, 4, 7, 10],      # Dominant 7th
            "M7": [0, 4, 7, 11],     # Major 7th
            "m7": [0, 3, 7, 10],     # Minor 7th
            "dim": [0, 3, 6],        # Diminished
            "aug": [0, 4, 8],        # Augmented
            "sus4": [0, 5, 7],       # Suspended 4th
        }

        # 曲の終了時間
        end_time = max(n["end"] for n in notes)

        chords = []
        current_time = 0

        while current_time < end_time:
            window_end = current_time + window_size

            # ウィンドウ内のノートを収集
            window_notes = [
                n for n in notes
                if n["start"] < window_end and n["end"] > current_time
            ]

            if window_notes:
                # ピッチクラスを集計
                pitch_class_counts = {}
                for note in window_notes:
                    pc = note["pitch"] % 12
                    pitch_class_counts[pc] = pitch_class_counts.get(pc, 0) + note["velocity"]

                # 最も可能性の高いコードを検出
                best_chord = self._detect_chord(pitch_class_counts, pitch_classes, chord_patterns)

                if best_chord and (not chords or chords[-1]["chord"] != best_chord):
                    chords.append({
                        "time": round(current_time, 2),
                        "chord": best_chord,
                    })

            current_time += window_size

        return chords

    def _detect_chord(
        self, pitch_counts: dict, pitch_classes: list, patterns: dict
    ) -> Optional[str]:
        """ピッチクラスの出現からコードを推定"""
        if not pitch_counts:
            return None

        best_score = 0
        best_chord = None

        # 各ルート音について試行
        for root in range(12):
            for chord_type, intervals in patterns.items():
                score = 0
                for interval in intervals:
                    pc = (root + interval) % 12
                    if pc in pitch_counts:
                        score += pitch_counts[pc]

                if score > best_score:
                    best_score = score
                    best_chord = pitch_classes[root] + chord_type

        return best_chord

    def cleanup(self, midi_path: str) -> bool:
        """MIDIファイルを削除"""
        try:
            path = Path(midi_path)
            if path.exists() and path.is_file():
                path.unlink()
                return True
            return False
        except Exception:
            return False


# シングルトンインスタンス
_magenta_service: Optional[MagentaService] = None


def get_magenta_service() -> MagentaService:
    """MagentaServiceのシングルトンを取得"""
    global _magenta_service
    if _magenta_service is None:
        _magenta_service = MagentaService()
    return _magenta_service
