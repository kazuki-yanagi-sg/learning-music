"""
audio_to_4tracks の end-to-end 統合テスト（TDD: Red → Green）

設計書 §3（offsetの適用場所）・§4（BPM float フロー）

検証事項:
  1. normalize_tempo が適用された tempo で量子化される
     → 半テンポ 75.0 を返す detect_tempo でも、result["tempo"] == 150.0
  2. offset 補正後のノート先頭がグリッド原点（0 付近）に揃う
     → offset=1.0 のとき、raw start=1.03 のノートが start≈0.0 になる
  3. audio_to_midi の transcribe_audio 呼び出しにも offset が渡る

外部I/Oはモック（LibrosaTranscriber.detect_tempo / predict / separator）。
"""
import pytest
from unittest.mock import patch, MagicMock, Mock
import numpy as np
from app.models.transcription import TempoInfo


class TestAudioTo4TracksNormalizeAndOffset:
    """audio_to_4tracks が normalize_tempo 済みテンポと offset 補正を正しく伝搬する"""

    def _make_temp_wav(self):
        import tempfile
        f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        f.write(b"dummy audio data")
        f.close()
        return f.name

    def _track_paths(self):
        return {
            "drums": self._make_temp_wav(),
            "bass": self._make_temp_wav(),
            "other": self._make_temp_wav(),
            "vocals": self._make_temp_wav(),
        }

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_normalize_tempo_applied_in_pipeline(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """detect_tempo が normalize 済みの TempoInfo を返し、result["tempo"] がそのまま貫通する

        設計書 §2.2: normalize_tempo は LibrosaTranscriber.detect_tempo 内で適用する。
        magenta.audio_to_4tracks は detect_tempo の戻り値（TempoInfo.tempo）をそのまま使う。

        テストの確認:
          - detect_tempo が TempoInfo(tempo=150.0)（normalize 済み）を返す
          - result["tempo"] == 150.0（float のまま丸めない）
          - transcribe_track が tempo=150.0 で呼ばれる（normalize 済み値で量子化）
        """
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()

        # detect_tempo が normalize 済みテンポ 150.0 を TempoInfo で返す
        # （実際の detect_tempo は内部で normalize_tempo を適用して 150.0 を返す）
        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=150.0,              # normalize_tempo(75.0) = 150.0 適用済み
            beat_times=[0.0, 0.4],
            offset=0.0,
        )
        mock_librosa.extract_drums.return_value = {
            "success": True, "notes": [], "error": None,
        }
        mock_librosa.extract_melody.return_value = {
            "success": True, "notes": [], "error": None,
        }
        mock_get_librosa.return_value = mock_librosa

        mock_basic_pitch = Mock()
        mock_basic_pitch.transcribe_track.return_value = {
            "success": True, "notes": [], "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

        mock_separator = Mock()
        mock_separator.separate.return_value = {"success": True, "tracks": track_paths}
        mock_get_separator.return_value = mock_separator

        try:
            from app.services.magenta import MagentaService
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True

            # TempoInfo.tempo がそのまま result["tempo"] に貫通する（float, 丸めなし）
            assert result["tempo"] == pytest.approx(150.0), (
                f"TempoInfo.tempo が result['tempo'] に貫通していない: got={result['tempo']}"
            )

            # transcribe_track が TempoInfo.tempo=150.0 で呼ばれているか
            for c in mock_basic_pitch.transcribe_track.call_args_list:
                passed_tempo = c.kwargs.get("tempo") if c.kwargs else None
                assert passed_tempo == pytest.approx(150.0), (
                    f"transcribe_track に正規化済み tempo=150.0 が渡されていない: {passed_tempo}"
                )
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                try:
                    os.unlink(p)
                except FileNotFoundError:
                    pass

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_offset_applied_to_result_notes(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """detect_tempo が offset=1.0 を返すとき、最終ノートが offset 補正される

        設計書 §配線2(b) の確認:
          audio_to_4tracks レベルで apply_offset_to_notes を一元適用するため、
          変換器（モック）が raw ノート（start=1.5）を返しても
          最終結果は start≈0.5（=1.5-1.0）になる。
        """
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()

        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=160.0,
            beat_times=[1.0, 1.375],
            offset=1.0,               # 第1拍オフセット
        )
        # raw ノート（offset 未適用）を返す
        raw_note = {"pitch": 60, "start": 1.5, "end": 2.0, "velocity": 80}
        mock_librosa.extract_drums.return_value = {
            "success": True,
            "notes": [{"pitch": 36, "start": 1.5, "end": 1.55, "velocity": 80, "drum_type": "kick"}],
            "error": None,
        }
        mock_librosa.extract_melody.return_value = {
            "success": True, "notes": [dict(raw_note)], "error": None,
        }
        mock_get_librosa.return_value = mock_librosa

        mock_basic_pitch = Mock()
        mock_basic_pitch.transcribe_track.return_value = {
            "success": True, "notes": [dict(raw_note)], "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

        mock_separator = Mock()
        mock_separator.separate.return_value = {"success": True, "tracks": track_paths}
        mock_get_separator.return_value = mock_separator

        try:
            from app.services.magenta import MagentaService
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True

            # bass ノートが offset=1.0 で補正されているか（raw start=1.5 → 0.5）
            bass_notes = result["tracks"].get("bass", {}).get("notes", [])
            assert len(bass_notes) >= 1, "bass ノートが空"
            assert bass_notes[0]["start"] == pytest.approx(0.5, abs=0.01), (
                f"bass notes[0]['start']={bass_notes[0]['start']} (expected ≈0.5 = 1.5-1.0)"
            )

            # drums ノートが offset=1.0 で補正されているか（raw start=1.5 → 0.5）
            drums_notes = result["tracks"].get("drums", {}).get("notes", [])
            assert len(drums_notes) >= 1, "drums ノートが空"
            assert drums_notes[0]["start"] == pytest.approx(0.5, abs=0.01), (
                f"drums notes[0]['start']={drums_notes[0]['start']} (expected ≈0.5 = 1.5-1.0)"
            )
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                try:
                    os.unlink(p)
                except FileNotFoundError:
                    pass


class TestAudioTo4TracksNoteOffsetApplied:
    """audio_to_4tracks が _transcribe_track 戻り値のノートに apply_offset を適用する

    チームリード指示 §配線2(b): 各トラック result["notes"] に対して
    audio_to_4tracks レベルで apply_offset(notes, offset) を適用すること。

    これにより、変換器実装の差異（apply 済み/未済み）に依存せず、
    パイプライン全体として常に補正が保証される。
    """

    def _make_temp_wav(self):
        import tempfile
        f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        f.write(b"dummy audio data")
        f.close()
        return f.name

    def _track_paths(self):
        return {
            "drums": self._make_temp_wav(),
            "bass": self._make_temp_wav(),
            "other": self._make_temp_wav(),
            "vocals": self._make_temp_wav(),
        }

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_note_start_corrected_by_offset_at_4tracks_level(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """offset=0.5 のとき、変換器が start=0.5 を返しても最終ノートは start≈0.0

        TDD Red フェーズ:
          _transcribe_track が（内部の apply_offset を経ない）raw ノートを返す。
          audio_to_4tracks レベルで apply_offset_to_notes が適用されなければ start=0.5 のまま残る。

        テストの設定:
          - detect_tempo: offset=0.5 を返す
          - _transcribe_track（モック経由）: start=0.5 のノートを返す
          - 期待: result["tracks"]["bass"]["notes"][0]["start"] ≈ 0.0
        """
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()

        # detect_tempo: offset=0.5（第1拍が 0.5 秒目）
        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=150.0,
            beat_times=[0.5, 0.9],
            offset=0.5,
        )
        # extract_drums / extract_melody は offset 未適用の raw ノートを返す（補正前を再現）
        raw_note = {"pitch": 60, "start": 0.5, "end": 1.0, "velocity": 80}
        mock_librosa.extract_drums.return_value = {
            "success": True,
            "notes": [{"pitch": 36, "start": 0.5, "end": 0.55, "velocity": 80, "drum_type": "kick"}],
            "error": None,
        }
        mock_librosa.extract_melody.return_value = {
            "success": True,
            "notes": [dict(raw_note)],
            "error": None,
        }
        mock_get_librosa.return_value = mock_librosa

        # transcribe_track: offset 未適用の raw ノート（start=0.5）を返す
        mock_basic_pitch = Mock()
        mock_basic_pitch.transcribe_track.return_value = {
            "success": True,
            "notes": [dict(raw_note)],
            "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

        mock_separator = Mock()
        mock_separator.separate.return_value = {"success": True, "tracks": track_paths}
        mock_get_separator.return_value = mock_separator

        try:
            from app.services.magenta import MagentaService
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True, f"4tracks failed: {result.get('error')}"

            # bass トラックのノート start が offset 補正されているか
            bass_notes = result["tracks"].get("bass", {}).get("notes", [])
            assert len(bass_notes) >= 1, "bass ノートが空"
            first_start = bass_notes[0]["start"]
            assert first_start == pytest.approx(0.0, abs=0.01), (
                f"audio_to_4tracks レベルで apply_offset が適用されていない: "
                f"bass notes[0]['start']={first_start} (expected ≈0.0, offset=0.5 を適用すると 0.5-0.5=0.0)"
            )

            # drums トラックのノート start も補正されているか
            drums_notes = result["tracks"].get("drums", {}).get("notes", [])
            assert len(drums_notes) >= 1, "drums ノートが空"
            drums_start = drums_notes[0]["start"]
            assert drums_start == pytest.approx(0.0, abs=0.01), (
                f"drums notes[0]['start']={drums_start} (expected ≈0.0)"
            )
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                try:
                    os.unlink(p)
                except FileNotFoundError:
                    pass

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_normalize_tempo_in_detect_tempo_reflected_in_result(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """detect_tempo が 75（半テンポ）を生成するとき normalize_tempo で 150 になる配線を確認

        TDD Red フェーズ:
          detect_tempo 内で normalize_tempo が適用されなければ TempoInfo.tempo=75 のまま返る。
          audio_to_4tracks の result["tempo"] も 75 になる。

        テストの設定:
          - 実際の LibrosaTranscriber.detect_tempo をモックせず、
            normalize_tempo がモジュールレベルで差し替えられることを確認する。
          - librosa.beat.beat_track が 75.0 を返すとき、detect_tempo が 150.0 を返す。
        """
        import app.services.librosa_transcriber as lt_mod
        import numpy as np

        raw_bpm = 75.0  # 半テンポ
        # librosa モジュールをモック
        mock_lib = MagicMock()
        mock_lib.load.return_value = (np.zeros(44100, dtype=np.float32), 44100)
        mock_lib.beat.beat_track.return_value = (
            np.array([raw_bpm]),
            np.array([int(44100 * 0.0 / 512), int(44100 * 0.8 / 512)]),
        )
        mock_lib.frames_to_time.return_value = np.array([0.0, 0.8])

        original_lib = lt_mod.librosa
        lt_mod.librosa = mock_lib
        try:
            from app.services.librosa_transcriber import LibrosaTranscriber, normalize_tempo
            t = LibrosaTranscriber()
            result = t.detect_tempo("/dummy.wav")

            # normalize_tempo(75.0) = 150.0 になっているか
            expected = normalize_tempo(raw_bpm)
            assert result.tempo == pytest.approx(expected), (
                f"detect_tempo が normalize_tempo を適用していない: "
                f"got={result.tempo}, expected={expected} (raw_bpm={raw_bpm})"
            )
            assert result.tempo == pytest.approx(150.0), (
                f"半テンポ 75.0 が 150.0 に補正されていない: got={result.tempo}"
            )
        finally:
            lt_mod.librosa = original_lib


class TestAudioToMidiOffsetWiring:
    """audio_to_midi の transcribe_audio 呼び出しに offset が渡ることを確認"""

    def _make_temp_wav(self):
        import tempfile
        f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        f.write(b"dummy audio data")
        f.close()
        return f.name

    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_audio_to_midi_passes_offset_to_transcribe_audio(
        self, mock_get_basic_pitch, mock_get_librosa
    ):
        """audio_to_midi が detect_tempo の offset を transcribe_audio に渡す

        現状 Red: audio_to_midi は transcribe_audio を offset なしで呼んでいる。
        """
        import os

        audio_path = self._make_temp_wav()

        # LibrosaTranscriber.detect_tempo が offset=0.8 を返す
        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=160.0,
            beat_times=[0.8, 1.175],
            offset=0.8,
        )
        mock_get_librosa.return_value = mock_librosa

        # BasicPitchService.transcribe_audio のモック
        mock_basic_pitch = Mock()
        mock_basic_pitch.transcribe_audio.return_value = {
            "success": True,
            "tempo": 160.0,
            "notes": [{"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 80}],
            "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

        try:
            from app.services.magenta import MagentaService
            service = MagentaService()
            result = service.audio_to_midi(audio_path)

            # transcribe_audio が offset=0.8 で呼ばれているか確認
            call_args = mock_basic_pitch.transcribe_audio.call_args
            assert call_args is not None, "transcribe_audio が呼ばれていない"
            passed_offset = call_args.kwargs.get("offset") if call_args.kwargs else None
            assert passed_offset == pytest.approx(0.8), (
                f"audio_to_midi の transcribe_audio に offset=0.8 が渡されていない: "
                f"offset={passed_offset}"
            )
        finally:
            os.unlink(audio_path)
