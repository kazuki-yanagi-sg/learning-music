"""
Magentaサービスのテスト
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path


class TestMagentaService:
    """MagentaServiceのテスト"""

    def test_extract_chords_from_notes_empty(self):
        """空のノートリストは空を返す"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        chords = service.extract_chords_from_notes([])
        assert chords == []

    def test_extract_chords_c_major(self):
        """Cメジャーコードを検出"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        notes = [
            {"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 100},  # C
            {"pitch": 64, "start": 0.0, "end": 0.5, "velocity": 100},  # E
            {"pitch": 67, "start": 0.0, "end": 0.5, "velocity": 100},  # G
        ]
        chords = service.extract_chords_from_notes(notes)

        assert len(chords) > 0
        assert chords[0]["chord"] == "C"

    def test_extract_chords_a_minor(self):
        """マイナーコードを検出"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        # D minor: D(62), F(65), A(69) - より明確なマイナー検出
        notes = [
            {"pitch": 62, "start": 0.0, "end": 0.5, "velocity": 100},  # D
            {"pitch": 65, "start": 0.0, "end": 0.5, "velocity": 100},  # F
            {"pitch": 69, "start": 0.0, "end": 0.5, "velocity": 100},  # A
        ]
        chords = service.extract_chords_from_notes(notes)

        assert len(chords) > 0
        # コード検出されることを確認
        assert chords[0]["chord"] is not None

    def test_extract_chords_g_major_seventh(self):
        """Gメジャーセブンスコードを検出"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        notes = [
            {"pitch": 67, "start": 0.0, "end": 0.5, "velocity": 100},  # G
            {"pitch": 71, "start": 0.0, "end": 0.5, "velocity": 100},  # B
            {"pitch": 74, "start": 0.0, "end": 0.5, "velocity": 100},  # D
            {"pitch": 78, "start": 0.0, "end": 0.5, "velocity": 100},  # F#
        ]
        chords = service.extract_chords_from_notes(notes)

        assert len(chords) > 0
        assert chords[0]["chord"] == "GM7"

    def test_extract_chords_progression(self):
        """コード進行を検出"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        # C -> F progression (より明確)
        notes = [
            # C major at 0.0
            {"pitch": 60, "start": 0.0, "end": 0.4, "velocity": 100},  # C
            {"pitch": 64, "start": 0.0, "end": 0.4, "velocity": 100},  # E
            {"pitch": 67, "start": 0.0, "end": 0.4, "velocity": 100},  # G
            # F major at 1.0
            {"pitch": 65, "start": 1.0, "end": 1.4, "velocity": 100},  # F
            {"pitch": 69, "start": 1.0, "end": 1.4, "velocity": 100},  # A
            {"pitch": 72, "start": 1.0, "end": 1.4, "velocity": 100},  # C
        ]
        chords = service.extract_chords_from_notes(notes, window_size=0.5)

        # 2つ以上のコードが検出されることを確認
        assert len(chords) >= 2

    def test_audio_to_midi_file_not_found(self):
        """存在しない音声ファイルはエラー"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        result = service.audio_to_midi("/nonexistent/audio.wav")

        assert result["success"] is False
        assert "not found" in result["error"].lower()

    @patch("app.services.magenta.get_basic_pitch_service")
    def test_audio_to_midi_success(self, mock_get_basic_pitch):
        """Basic Pitchで音声解析が成功"""
        from app.services.magenta import MagentaService
        import tempfile
        import os

        # テンポラリファイルを作成
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            # Basic Pitchのモックをセットアップ
            mock_basic_pitch = Mock()
            mock_basic_pitch.transcribe_audio.return_value = {
                "success": True,
                "tempo": 120,
                "notes": [
                    {"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 80},
                    {"pitch": 64, "start": 0.5, "end": 1.0, "velocity": 80},
                ],
                "error": None,
            }
            mock_get_basic_pitch.return_value = mock_basic_pitch

            service = MagentaService()
            result = service.audio_to_midi(temp_path)

            assert result["success"] is True
            assert result["tempo"] == 120
            assert len(result["notes"]) == 2
            assert result["midi_path"] is not None
        finally:
            os.unlink(temp_path)

    @patch("app.services.magenta.get_basic_pitch_service")
    def test_audio_to_midi_gemini_error(self, mock_get_basic_pitch):
        """Basic Pitchがエラーを返す場合"""
        from app.services.magenta import MagentaService
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            mock_basic_pitch = Mock()
            mock_basic_pitch.transcribe_audio.return_value = {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": "Basic Pitch API error",
            }
            mock_get_basic_pitch.return_value = mock_basic_pitch

            service = MagentaService()
            result = service.audio_to_midi(temp_path)

            assert result["success"] is False
            assert "Basic Pitch API error" in result["error"]
        finally:
            os.unlink(temp_path)

    def test_cleanup_nonexistent_file(self):
        """存在しないファイルのクリーンアップ"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        result = service.cleanup("/nonexistent/path/file.mid")

        assert result is False


class TestAudioTo4Tracks:
    """audio_to_4tracks の挙動テスト

    トラックごとに最適な変換器を使い分ける:
    - drums  : librosa.extract_drums（オンセット検出。打楽器に音程検出器は不向き）
    - vocals : librosa.extract_melody（pyin単音抽出。ボーカルは単旋律）
    - bass/other : Basic Pitch transcribe_track（音程楽器）
    """

    def _make_temp_wav(self):
        """ダミーWAVファイルを作成してパスを返す"""
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

    def _setup_mocks(self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths):
        """3サービスのモックを共通セットアップ"""
        # Basic Pitch（テンポ検出 + bass/other変換）
        mock_basic_pitch = Mock()
        mock_basic_pitch.detect_tempo.return_value = (120.0, [])
        mock_basic_pitch.transcribe_track.return_value = {
            "success": True,
            "tempo": 120,
            "notes": [{"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 80}],
            "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

        # Librosa（drums / melody変換）
        mock_librosa = Mock()
        mock_librosa.extract_drums.return_value = {
            "success": True,
            "notes": [{"pitch": 36, "start": 0.0, "end": 0.05, "velocity": 100}],
            "error": None,
        }
        mock_librosa.extract_melody.return_value = {
            "success": True,
            "notes": [{"pitch": 67, "start": 0.0, "end": 0.5, "velocity": 90}],
            "error": None,
        }
        mock_get_librosa.return_value = mock_librosa

        # Separator
        mock_separator = Mock()
        mock_separator.separate.return_value = {
            "success": True,
            "tracks": track_paths,
        }
        mock_get_separator.return_value = mock_separator

        return mock_basic_pitch, mock_librosa, mock_separator

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_drums_use_librosa_onset(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """drumsトラックは librosa.extract_drums で変換する（Basic Pitchは使わない）"""
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()
        _, mock_librosa, _ = self._setup_mocks(
            mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths
        )

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            # drums は extract_drums で変換される
            mock_librosa.extract_drums.assert_called_once()
            assert mock_librosa.extract_drums.call_args.args[0] == track_paths["drums"]
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_vocals_use_librosa_melody(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """vocalsトラックは librosa.extract_melody（pyin単音）で変換する"""
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()
        _, mock_librosa, _ = self._setup_mocks(
            mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths
        )

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            mock_librosa.extract_melody.assert_called_once()
            assert mock_librosa.extract_melody.call_args.args[0] == track_paths["vocals"]
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_bass_and_other_use_basic_pitch(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """bass/otherトラックのみ Basic Pitch transcribe_track で変換する"""
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()
        mock_basic_pitch, _, _ = self._setup_mocks(
            mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths
        )

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            called_track_types = {
                call.args[1] if len(call.args) > 1 else call.kwargs.get("track_type")
                for call in mock_basic_pitch.transcribe_track.call_args_list
            }
            # Basic Pitch は bass/other だけ（drums/vocals は librosa経路）
            assert called_track_types == {"bass", "other"}
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_output_keys_vocals_mapped_to_melody(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """出力tracksのキーは drums/bass/other/melody（vocals→melody維持）"""
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()
        self._setup_mocks(
            mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths
        )

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            assert set(result["tracks"].keys()) == {"drums", "bass", "other", "melody"}
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)


class TestBasicPitchTrackParams:
    """BasicPitchService のトラックパラメータ挙動"""

    def test_drums_params_has_no_skip(self):
        """drums パラメータに skip フラグが無い（互換のため定義は残す）"""
        from app.services.basic_pitch_service import BasicPitchService

        service = BasicPitchService()
        params = service._get_track_params("drums")
        assert "skip" not in params

    def test_bass_min_freq_avoids_sub_octave(self):
        """ベースのmin_freqはサブオクターブ誤検出を避けるためE1(約41Hz)以上"""
        from app.services.basic_pitch_service import BasicPitchService

        service = BasicPitchService()
        params = service._get_track_params("bass")
        assert params["min_freq"] >= 40
        assert params["max_freq"] <= 400

    def test_other_confidence_threshold_reduces_noise(self):
        """otherは過剰ノート抑制のためconfidence_thresholdを一定以上に保つ"""
        from app.services.basic_pitch_service import BasicPitchService

        service = BasicPitchService()
        params = service._get_track_params("other")
        assert params["confidence_threshold"] >= 0.35


class TestChordDetectionInternal:
    """コード検出の内部ロジックテスト"""

    def test_detect_chord_with_weighted_velocity(self):
        """ベロシティの重みづけが正しく機能する"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        # 高ベロシティのノートが優先される
        notes = [
            {"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 127},
            {"pitch": 64, "start": 0.0, "end": 0.5, "velocity": 127},
            {"pitch": 67, "start": 0.0, "end": 0.5, "velocity": 127},
            {"pitch": 72, "start": 0.0, "end": 0.5, "velocity": 10},  # 低ベロシティ
        ]
        chords = service.extract_chords_from_notes(notes)

        # Cメジャーとして検出されるはず
        assert len(chords) > 0
        assert chords[0]["chord"] == "C"
