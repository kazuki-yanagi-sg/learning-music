"""
音声→MIDI変換サービス

Demucsで楽器分離 → 各トラックを「楽器に適した変換器」でMIDI変換
- drums  : librosa オンセット検出（打楽器に音程検出器は不向き）
- vocals : librosa pyin 単音抽出 → melody（CLAUDE.md:189 の確定ルール。
  メロディの音源はボーカル。再生音色はフロント側でピアノにする）
- bass / other / guitar / piano : Basic Pitch（音程楽器）
- keyboard : piano stem 由来
"""
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

import mido

logger = logging.getLogger(__name__)

# 重い依存（torch 等）を持つサービスはトップレベルでインポートせず、
# 使用する直前に遅延インポートすることでテストのモック容易性を確保する。


def get_basic_pitch_service():
    """BasicPitchService のシングルトンを遅延取得する"""
    from app.services.basic_pitch_service import get_basic_pitch_service as _get
    return _get()


def get_librosa_transcriber():
    """LibrosaTranscriber のシングルトンを遅延取得する"""
    from app.services.librosa_transcriber import get_librosa_transcriber as _get
    return _get()


def get_audio_separator_service():
    """AudioSeparatorService のシングルトンを遅延取得する"""
    from app.services.audio_separator import get_audio_separator_service as _get
    return _get()


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
            # LibrosaTranscriber でテンポ・オフセット（第1拍）を先に検出する
            # offset: 楽曲冒頭の無音部分を除いた第1拍の開始時刻（秒）
            # これを transcribe_audio に渡してノート時刻を第1拍原点に揃える
            tempo_info = get_librosa_transcriber().detect_tempo(str(audio_path))
            detected_offset = tempo_info.offset
            detected_tempo = tempo_info.tempo  # normalize_tempo 済み float BPM
            logger.info(
                f"[Magenta.audio_to_midi] detected tempo={detected_tempo:.3f} BPM, "
                f"offset={detected_offset:.3f}s"
            )

            # Basic Pitchで音声を分析（オフセット補正を適用する）
            basic_pitch = get_basic_pitch_service()
            result = basic_pitch.transcribe_audio(str(audio_path), offset=detected_offset)

            if not result["success"]:
                return {
                    "success": False,
                    "midi_path": None,
                    "notes": [],
                    "tempo": None,
                    "error": result["error"],
                }

            notes = result["notes"]
            # LibrosaTranscriber が検出した normalize 済みテンポを優先する
            # （Basic Pitch は音程検出器なのでテンポ精度が低い）
            tempo = detected_tempo or result["tempo"] or 120

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

    # stem 名 → 出力キー変換マップ
    # 確定ルール（CLAUDE.md:189）: メロディの音源はボーカル(vocals stem)。
    #   歌のメロディをそのまま melody とする。ただし再生音色はピアノにする（フロント側）。
    # keyboard はピアノ伴奏（piano stem）を割り当てる。
    # 値は list[str]（1 stem を複数キーへ複製する将来拡張のため）。
    TRACK_KEY_MAP: dict[str, list[str]] = {
        "vocals": ["melody"],   # 歌メロを melody に（音色はフロントでピアノ）
        "piano": ["keyboard"],  # ピアノ伴奏を keyboard に
    }

    def _stem_to_output_keys(self, stem_name: str) -> list[str]:
        """stem 名を出力キー（複数可）に変換する

        TRACK_KEY_MAP に定義がある場合はマップ後のキー一覧を、
        それ以外は stem 名そのもの 1 件のリストを返す。
        """
        return self.TRACK_KEY_MAP.get(stem_name, [stem_name])

    def _transcribe_track(
        self,
        track_type: str,
        track_path: str,
        tempo: float,
        offset: float = 0.0,
    ) -> dict:
        """
        トラック種別に応じて最適な変換器でMIDI変換する

        - drums  : librosa オンセット検出（打楽器は音程検出器に不向き）
        - vocals : librosa pyin 単音抽出（歌メロは単旋律。melody の音源）
        - その他（bass/other/guitar/piano） : Basic Pitch（音程楽器）

        確定ルール（CLAUDE.md:189）: メロディの音源はボーカル(vocals stem)。
        歌メロを pyin で単旋律抽出する（再生音色はフロント側でピアノにする）。

        Args:
            track_type: 変換対象トラック種別（stem 名）
            track_path: 音声ファイルパス
            tempo:      BPM（float。round しない）
            offset:     第1拍オフセット（秒）。ノート時刻をシフトして第1拍を原点に揃える

        Returns:
            {"success": bool, "notes": list, "error": str | None}
        """
        if track_type == "drums":
            logger.info(f"[Magenta] Using librosa onset detection for {track_type}")
            return get_librosa_transcriber().extract_drums(
                track_path, tempo=tempo, offset=offset
            )

        if track_type == "vocals":
            logger.info(f"[Magenta] Using librosa pyin (歌メロ単音抽出) for {track_type}")
            return get_librosa_transcriber().extract_melody(
                track_path, tempo=tempo, offset=offset
            )

        # bass / other / guitar / piano → Basic Pitch（音程楽器）
        logger.info(f"[Magenta] Using Basic Pitch for {track_type}")
        return get_basic_pitch_service().transcribe_track(
            track_path, track_type, tempo=tempo, offset=offset
        )

    def _build_track_output(
        self, result: dict, stem: str, output_key: str, tempo: float
    ) -> dict:
        """
        変換結果からトラック出力（notes + MIDIファイル）を構築する

        Returns:
            {"notes": list, "midi_path": str | None} （失敗時は error も付与）
        """
        if not result["success"]:
            return {
                "notes": [],
                "midi_path": None,
                "error": result.get("error"),
            }

        notes = result["notes"]
        midi_path = None
        if notes:
            midi_filename = f"{stem}_{output_key}.mid"
            midi_file = self.temp_dir / midi_filename
            self._notes_to_midi(notes, tempo, midi_file)
            midi_path = str(midi_file)

        return {
            "notes": notes,
            "midi_path": midi_path,
        }

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
                    "other": {"notes": [...], "midi_path": "..."},
                    "guitar": {"notes": [...], "midi_path": "..."},
                    "melody": {"notes": [...], "midi_path": "..."},    # vocals stem 由来（歌メロ・ピアノ音色で再生）
                    "keyboard": {"notes": [...], "midi_path": "..."},  # piano stem 由来（ピアノ伴奏）
                    # vocals は含めない（メロディに流用しないため）
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
            # 1. 元の音声からテンポを検出（LibrosaTranscriber 直呼びで TempoInfo を取得）
            # TempoInfo: tempo (float BPM) / beat_times / offset（第1拍オフセット）
            tempo_info = get_librosa_transcriber().detect_tempo(str(audio_path))
            tempo = tempo_info.tempo   # float のまま保持（round しない）
            offset = tempo_info.offset
            logger.info(
                f"[Magenta] Detected tempo from original: {tempo:.3f} BPM, "
                f"offset={offset:.3f}s"
            )

            # 2. Demucsで楽器分離
            separator = get_audio_separator_service()
            sep_result = separator.separate(str(audio_path))

            if not sep_result["success"]:
                # separator のエラーは既に「型名: メッセージ」形式なので二重に
                # "Separation failed:" を付けない（元情報を潰さない）。
                logger.error(f"[Magenta] 楽器分離に失敗: {sep_result['error']}")
                return {
                    "success": False,
                    "tempo": None,
                    "tracks": {},
                    "error": f"Separation failed: {sep_result['error']}",
                }

            separated_tracks = sep_result["tracks"]

            # 3. 各トラックを「楽器に適した変換器」でMIDI変換
            tracks = {}
            # apply_offset_to_notes は librosa_transcriber で定義された純関数
            from app.services.librosa_transcriber import apply_offset_to_notes

            for track_type, track_path in separated_tracks.items():
                # 確定ルール（CLAUDE.md:189）: メロディの音源はボーカル(vocals stem)。
                # vocals は melody として処理する（スキップしない）。
                logger.info(f"[Magenta] Processing {track_type} track: {track_path}")

                # トラック種別ごとに最適な変換器を選ぶ。
                # offset は _transcribe_track には渡さず（二重適用防止）、
                # audio_to_4tracks レベルで apply_offset_to_notes を一元適用する。
                result = self._transcribe_track(track_type, track_path, tempo, offset=0.0)

                # 第1拍オフセット補正: 全トラックのノートを グリッド原点に揃える
                # apply_offset_to_notes は純関数（元のリストを変更しない）
                if result["success"] and offset != 0.0:
                    result = dict(result)  # 元の dict を変更しない（シャローコピー）
                    result["notes"] = apply_offset_to_notes(result["notes"], offset)

                logger.info(
                    f"[Magenta] {track_type} result: success={result['success']}, "
                    f"notes={len(result.get('notes', []))}"
                )

                # stem 名 → 出力キー。vocals→melody, piano→keyboard, その他はそのまま。
                # melody（歌メロ）は単旋律化して和音の取りこぼし／重なりを防ぐ
                # （pyin は基本単音だが、安全網として skyline を通す）。
                # MIDI ファイル名は output_key ごとに分かれる（{stem}_{output_key}.mid）。
                for output_key in self._stem_to_output_keys(track_type):
                    track_result = result
                    if output_key == "melody" and result.get("success"):
                        from app.services.basic_pitch_service import select_melody_line
                        track_result = dict(result)
                        track_result["notes"] = select_melody_line(result["notes"])
                    tracks[output_key] = self._build_track_output(
                        track_result, audio_path.stem, output_key, tempo
                    )

            return {
                "success": True,
                # float で貫通させる（round() しない。フロントは number 型で問題なし）
                "tempo": float(tempo),
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
                # float で貫通させる（round() しない）
                "tempo": float(bpm),
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
