"""
音声→MIDI変換サービス

Demucsで楽器分離 → 各トラックをMIDI変換
- ドラム: librosa onset_detect
- ボーカル: librosa pyin
- ベース/その他: Basic Pitch
"""
import os
import tempfile
from pathlib import Path
from typing import Optional

import mido

from app.services.basic_pitch_service import get_basic_pitch_service
from app.services.audio_separator import get_audio_separator_service
from app.services.librosa_transcriber import get_librosa_transcriber


class MagentaService:
    """Basic Pitchを使用した音声→ノート変換"""

    def __init__(self):
        # MIDI出力ディレクトリ（共有ディレクトリを優先）
        custom_midi_dir = os.getenv("ANISONG_MIDI_DIR")
        if custom_midi_dir:
            self.temp_dir = Path(custom_midi_dir)
        else:
            self.temp_dir = Path(tempfile.gettempdir()) / "anisong_midi"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def audio_to_midi(self, audio_path: str) -> dict:
        """
        音声ファイルをMIDIに変換（Basic Pitchを使用）

        Args:
            audio_path: 音声ファイルのパス

        Returns:
            {
                "success": True/False,
                "midi_path": MIDIファイルのパス,
                "notes": ノート情報のリスト,
                "tempo": テンポ（BPM）- Basic Pitchはテンポ検出しないため120固定,
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_path = Path(audio_path)
        if not audio_path.exists():
            return {
                "success": False,
                "midi_path": None,
                "notes": [],
                "tempo": None,
                "error": f"Audio file not found: {audio_path}",
            }

        try:
            # Basic Pitchで音声を分析
            basic_pitch = get_basic_pitch_service()
            result = basic_pitch.transcribe_audio(str(audio_path))

            if not result["success"]:
                return {
                    "success": False,
                    "midi_path": None,
                    "notes": [],
                    "tempo": None,
                    "error": result["error"],
                }

            notes = result["notes"]
            tempo = result["tempo"] or 120  # Basic Pitchはテンポ検出しないため120をデフォルト

            # ノート情報をMIDIファイルに変換
            midi_filename = audio_path.stem + ".mid"
            midi_path = self.temp_dir / midi_filename

            self._notes_to_midi(notes, tempo, midi_path)

            return {
                "success": True,
                "midi_path": str(midi_path),
                "notes": notes,
                "tempo": tempo,
                "error": None,
            }

        except Exception as e:
            return {
                "success": False,
                "midi_path": None,
                "notes": [],
                "tempo": None,
                "error": f"Audio transcription failed: {str(e)}",
            }

    def _notes_to_midi(self, notes: list[dict], tempo: int, midi_path: Path) -> None:
        """
        ノート情報をMIDIファイルに変換

        Args:
            notes: ノート情報のリスト
            tempo: テンポ（BPM）
            midi_path: 出力MIDIファイルのパス
        """
        mid = mido.MidiFile()
        track = mido.MidiTrack()
        mid.tracks.append(track)

        # テンポを設定
        tempo_microseconds = mido.bpm2tempo(tempo)
        track.append(mido.MetaMessage("set_tempo", tempo=tempo_microseconds, time=0))

        ticks_per_beat = mid.ticks_per_beat

        # ノートをイベントに変換
        events = []
        for note in notes:
            pitch = note.get("pitch", 60)
            start = note.get("start", 0)
            end = note.get("end", start + 0.5)
            velocity = note.get("velocity", 80)

            # 時間をティックに変換
            start_ticks = int(mido.second2tick(start, ticks_per_beat, tempo_microseconds))
            end_ticks = int(mido.second2tick(end, ticks_per_beat, tempo_microseconds))

            events.append((start_ticks, "note_on", pitch, velocity))
            events.append((end_ticks, "note_off", pitch, 0))

        # イベントを時間順にソート
        events.sort(key=lambda x: (x[0], x[1] == "note_on"))

        # 相対時間に変換してトラックに追加
        last_tick = 0
        for tick, msg_type, pitch, velocity in events:
            delta = tick - last_tick
            if msg_type == "note_on":
                track.append(mido.Message("note_on", note=pitch, velocity=velocity, time=delta))
            else:
                track.append(mido.Message("note_off", note=pitch, velocity=0, time=delta))
            last_tick = tick

        mid.save(midi_path)

    def audio_to_4tracks(self, audio_path: str) -> dict:
        """
        音声ファイルを4トラックに分離してMIDI変換

        Args:
            audio_path: 音声ファイルのパス

        Returns:
            {
                "success": True/False,
                "tempo": テンポ（BPM）,
                "tracks": {
                    "drums": {"notes": [...], "midi_path": "..."},
                    "bass": {"notes": [...], "midi_path": "..."},
                    "other": {"notes": [...], "midi_path": "..."},  # ギター/キーボード
                    "vocals": {"notes": [], "midi_path": None},  # 使用しない
                },
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_path = Path(audio_path)
        if not audio_path.exists():
            return {
                "success": False,
                "tempo": None,
                "tracks": {},
                "error": f"Audio file not found: {audio_path}",
            }

        separated_tracks = None

        try:
            # 1. 元の音声からテンポを検出（最も正確）
            basic_pitch = get_basic_pitch_service()
            tempo, _ = basic_pitch.detect_tempo(str(audio_path))
            print(f"[Magenta] Detected tempo from original: {tempo:.1f} BPM")

            # 2. Demucsで楽器分離
            separator = get_audio_separator_service()
            sep_result = separator.separate(str(audio_path))

            if not sep_result["success"]:
                return {
                    "success": False,
                    "tempo": None,
                    "tracks": {},
                    "error": f"Separation failed: {sep_result['error']}",
                }

            separated_tracks = sep_result["tracks"]

            # 3. 各トラックをMIDI変換（楽器別に最適なツールを使用）
            tracks = {}
            librosa_transcriber = get_librosa_transcriber()

            for track_type, track_path in separated_tracks.items():
                print(f"[Magenta] Processing {track_type} track: {track_path}")

                # 楽器別に最適なツールを選択
                if track_type == "drums":
                    # ドラム: librosa onset_detect
                    print(f"[Magenta] Using librosa for drums")
                    result = librosa_transcriber.extract_drums(track_path, tempo=tempo)
                    output_key = "drums"
                elif track_type == "vocals":
                    # ボーカル: librosa pyin（単音メロディに最適）
                    print(f"[Magenta] Using librosa pyin for vocals")
                    result = librosa_transcriber.extract_melody(track_path, tempo=tempo)
                    output_key = "melody"
                else:
                    # ベース/その他: Basic Pitch（和音に最適）
                    print(f"[Magenta] Using Basic Pitch for {track_type}")
                    result = basic_pitch.transcribe_track(track_path, track_type, tempo=tempo)
                    output_key = track_type

                print(f"[Magenta] {track_type} result: success={result['success']}, notes={len(result.get('notes', []))}")

                if result["success"]:
                    notes = result["notes"]

                    # MIDIファイルを生成
                    midi_path = None
                    if notes:
                        midi_filename = f"{audio_path.stem}_{output_key}.mid"
                        midi_path = self.temp_dir / midi_filename
                        self._notes_to_midi(notes, tempo, midi_path)
                        midi_path = str(midi_path)

                    tracks[output_key] = {
                        "notes": notes,
                        "midi_path": midi_path,
                    }
                else:
                    tracks[output_key] = {
                        "notes": [],
                        "midi_path": None,
                        "error": result["error"],
                    }

            return {
                "success": True,
                "tempo": round(tempo),
                "tracks": tracks,
                "error": None,
            }

        except Exception as e:
            return {
                "success": False,
                "tempo": None,
                "tracks": {},
                "error": f"4-track conversion failed: {str(e)}",
            }

        finally:
            # 分離したトラックをクリーンアップ
            if separated_tracks:
                separator = get_audio_separator_service()
                separator.cleanup(separated_tracks)

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
