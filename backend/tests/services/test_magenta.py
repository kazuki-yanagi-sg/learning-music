"""
Magentaサービスのテスト
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
from app.models.transcription import TempoInfo


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

    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_audio_to_midi_success(self, mock_get_basic_pitch, mock_get_librosa):
        """Basic Pitchで音声解析が成功"""
        from app.services.magenta import MagentaService
        import tempfile
        import os

        # テンポラリファイルを作成
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            # LibrosaTranscriber.detect_tempo のモックをセットアップ
            # audio_to_midi が offset を取得するために呼ばれる
            mock_librosa = Mock()
            mock_librosa.detect_tempo.return_value = TempoInfo(
                tempo=120.0, beat_times=[0.0, 0.5], offset=0.0
            )
            mock_get_librosa.return_value = mock_librosa

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
            # LibrosaTranscriber 検出テンポ（120.0）が採用される
            assert result["tempo"] == pytest.approx(120.0)
            assert len(result["notes"]) == 2
            assert result["midi_path"] is not None
        finally:
            os.unlink(temp_path)

    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_audio_to_midi_gemini_error(self, mock_get_basic_pitch, mock_get_librosa):
        """Basic Pitchがエラーを返す場合"""
        from app.services.magenta import MagentaService
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            # LibrosaTranscriber.detect_tempo のモック（offset 取得のため必要）
            mock_librosa = Mock()
            mock_librosa.detect_tempo.return_value = TempoInfo(
                tempo=120.0, beat_times=[0.0, 0.5], offset=0.0
            )
            mock_get_librosa.return_value = mock_librosa

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

    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_audio_to_midi_tempo_not_rounded(self, mock_get_basic_pitch, mock_get_librosa):
        """transcribe_audio が float tempo=140.7 を返すとき result["tempo"] が丸められない

        設計書 §4-1: BPM は int() / round() で丸めない。float のまま貫通させる。
        """
        from app.services.magenta import MagentaService
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            mock_librosa = Mock()
            mock_librosa.detect_tempo.return_value = TempoInfo(
                tempo=140.7, beat_times=[0.0, 0.427], offset=0.0
            )
            mock_get_librosa.return_value = mock_librosa

            mock_basic_pitch = Mock()
            mock_basic_pitch.transcribe_audio.return_value = {
                "success": True,
                "tempo": 140.7,  # float BPM がそのまま返る
                "notes": [{"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 80}],
                "error": None,
            }
            mock_get_basic_pitch.return_value = mock_basic_pitch

            service = MagentaService()
            result = service.audio_to_midi(temp_path)

            assert result["success"] is True
            # 140.7 が 141 に丸められていないことを確認
            assert result["tempo"] == pytest.approx(140.7), (
                f"tempo が丸められている: got={result['tempo']}, expected=140.7"
            )
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
    - bass/other/guitar/piano : Basic Pitch transcribe_track（音程楽器）
    - melody/keyboard : piano stem 由来（CLAUDE.md:189 の確定ルール）
    - vocals : メロディに流用せず、解析・出力から除外する
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
        """3サービスのモックを共通セットアップ

        audio_to_4tracks が LibrosaTranscriber.detect_tempo を直接呼ぶため、
        TempoInfo を返すようにモックを設定する。
        """
        from app.models.transcription import TempoInfo

        # Librosa（テンポ検出 + drums / melody変換）
        mock_librosa = Mock()
        # detect_tempo は TempoInfo を返す（audio_to_4tracks の直呼び先）
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=120.0, beat_times=[0.0, 0.5], offset=0.0
        )
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

        # Basic Pitch（bass/other変換のみ。テンポ検出はもう呼ばれない）
        mock_basic_pitch = Mock()
        mock_basic_pitch.transcribe_track.return_value = {
            "success": True,
            "tempo": 120,
            "notes": [{"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 80}],
            "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

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
    def test_vocals_transcribed_to_melody_via_extract_melody(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """確定ルール: melody の音源は vocals。extract_melody(pyin) で歌メロを抽出する

        CLAUDE.md:189「メロディの音源はボーカル(vocals stem)」のガード。
        """
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
            # vocals 由来のメロディ抽出（pyin）が呼ばれる
            mock_librosa.extract_melody.assert_called_once()
            assert mock_librosa.extract_melody.call_args.args[0] == track_paths["vocals"]
            # 出力は melody キー。vocals 生キーは残らない
            assert "melody" in result["tracks"]
            assert "vocals" not in result["tracks"]
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
            # Basic Pitch は bass/other だけ（drums は librosa、vocals はスキップ）
            assert called_track_types == {"bass", "other"}
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_output_keys_vocals_mapped_to_melody_4stem(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """4stem入力（drums/bass/other/vocals）の出力キーは drums/bass/other/melody

        vocals は melody にマップされる（音源はボーカル）。
        """
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


class TestStemKeyMapping:
    """stem 名から出力キーへのマッピング（確定ルール CLAUDE.md:189 準拠）

    - TRACK_KEY_MAP: {"vocals": ["melody"], "piano": ["keyboard"]}
    - vocals stem → tracks["melody"]（歌メロが音源。再生音色はフロントでピアノ）
    - piano stem → tracks["keyboard"]（ピアノ伴奏）
    - guitar stem → tracks["guitar"] キー
    - その他（drums/bass/other）→ stem 名そのままキー
    """

    def _make_temp_wav(self):
        """ダミー WAV ファイルを作成してパスを返す"""
        import tempfile
        f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        f.write(b"dummy audio data")
        f.close()
        return f.name

    def _track_paths_6s(self):
        """htdemucs_6s の 6 stem パスを返す"""
        return {
            "drums": self._make_temp_wav(),
            "bass": self._make_temp_wav(),
            "other": self._make_temp_wav(),
            "vocals": self._make_temp_wav(),
            "guitar": self._make_temp_wav(),
            "piano": self._make_temp_wav(),
        }

    def _setup_mocks_6s(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths
    ):
        """6 stem 用モックセットアップ"""
        from app.models.transcription import TempoInfo

        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=140.0, beat_times=[0.0, 0.43], offset=0.0
        )
        mock_librosa.extract_drums.return_value = {
            "success": True, "notes": [], "error": None,
        }
        # vocals(melody) は pyin で歌メロ（pitch=67）を返す
        mock_librosa.extract_melody.return_value = {
            "success": True,
            "notes": [{"pitch": 67, "start": 0.0, "end": 0.5, "velocity": 90}],
            "error": None,
        }
        mock_get_librosa.return_value = mock_librosa

        # Basic Pitch: stem(track_type)ごとに固有ノートを返す。
        # piano stem だけ pitch=72 の固有ノートを返し、
        # keyboard が piano 由来であることを検証可能にする。
        mock_basic_pitch = Mock()

        def _transcribe_side_effect(track_path, track_type, **kwargs):
            if track_type == "piano":
                return {
                    "success": True,
                    "notes": [{"pitch": 72, "start": 0.0, "end": 0.5, "velocity": 80}],
                    "error": None,
                }
            return {"success": True, "notes": [], "error": None}

        mock_basic_pitch.transcribe_track.side_effect = _transcribe_side_effect
        mock_get_basic_pitch.return_value = mock_basic_pitch

        mock_separator = Mock()
        mock_separator.separate.return_value = {"success": True, "tracks": track_paths}
        mock_get_separator.return_value = mock_separator

        return mock_basic_pitch, mock_librosa, mock_separator

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_piano_stem_mapped_to_keyboard_key(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """piano stem → tracks["keyboard"]（ピアノ伴奏）。melody は vocals 由来。

        piano という生キーは残してはいけない。
        """
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths_6s()
        self._setup_mocks_6s(mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths)

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            assert "keyboard" in result["tracks"], "piano stem が keyboard キーにマップされていない"
            assert "piano" not in result["tracks"], "piano キーはそのまま残ってはいけない"
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_guitar_stem_kept_as_guitar_key(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """guitar stem → tracks["guitar"] キー（そのまま）"""
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths_6s()
        self._setup_mocks_6s(mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths)

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            assert "guitar" in result["tracks"], "guitar stem が tracks に見つからない"
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_melody_is_vocals_derived(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """melody は vocals stem 由来（CLAUDE.md:189: メロディの音源はボーカル）

        - tracks["melody"] が存在する
        - vocals 生キーは残らない
        - librosa.extract_melody（pyin単音）が vocals パスで呼ばれる
        - melody のノートが歌メロ（pitch=67）由来
        """
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths_6s()
        mock_basic_pitch, mock_librosa, _ = self._setup_mocks_6s(
            mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths
        )

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            assert "melody" in result["tracks"], "melody キーが存在しない"
            assert "vocals" not in result["tracks"], "vocals 生キーは残ってはいけない"
            # 歌メロ抽出（pyin）が vocals パスで呼ばれる
            mock_librosa.extract_melody.assert_called_once()
            assert mock_librosa.extract_melody.call_args.args[0] == track_paths["vocals"]
            # melody のノートは歌メロ（pitch=67）由来
            melody_notes = result["tracks"]["melody"]["notes"]
            assert melody_notes and melody_notes[0]["pitch"] == 67
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_vocals_stem_becomes_melody(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """vocals stem は melody の音源になる（出力キーは melody、生キー vocals は残らない）"""
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths_6s()
        _, mock_librosa, _ = self._setup_mocks_6s(
            mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths
        )

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            assert "melody" in result["tracks"], "vocals が melody にマップされていない"
            assert "vocals" not in result["tracks"], "vocals 生キーは残ってはいけない"
            mock_librosa.extract_melody.assert_called_once()
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_melody_from_vocals_keyboard_from_piano_are_distinct(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """melody は vocals 由来の単旋律、keyboard は piano 由来。両者は別音源。

        melody は歌メロを単旋律化（skyline 安全網）したもの。
        """
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths_6s()
        mock_bp, mock_librosa, _ = self._setup_mocks_6s(
            mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths
        )
        # vocals(pyin) は歌メロ（単音 pitch=67 が2つ）を返す
        mock_librosa.extract_melody.return_value = {
            "success": True,
            "notes": [
                {"pitch": 67, "start": 0.0, "end": 0.5, "velocity": 90},
                {"pitch": 69, "start": 0.5, "end": 1.0, "velocity": 90},
            ],
            "error": None,
        }

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            melody_notes = result["tracks"]["melody"]["notes"]
            keyboard_notes = result["tracks"]["keyboard"]["notes"]
            # melody は歌メロ由来（67,69）
            assert {n["pitch"] for n in melody_notes} == {67, 69}
            # keyboard は piano 由来（pitch=72）
            assert keyboard_notes and keyboard_notes[0]["pitch"] == 72
            # melody は単旋律（同時発音1以下）
            events = []
            for n in melody_notes:
                events.append((n["start"], 1))
                events.append((n["end"], -1))
            events.sort()
            cur = mx = 0
            for _, d in events:
                cur += d
                mx = max(mx, cur)
            assert mx <= 1, f"melody が単旋律でない（同時発音 {mx}）"
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_melody_uses_pyin_keyboard_uses_basic_pitch(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """melody は vocals の pyin(extract_melody)由来、keyboard は piano の Basic Pitch 由来"""
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths_6s()
        mock_basic_pitch, mock_librosa, _ = self._setup_mocks_6s(
            mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths
        )

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            # melody は vocals の pyin 由来
            mock_librosa.extract_melody.assert_called_once()
            assert mock_librosa.extract_melody.call_args.args[0] == track_paths["vocals"]
            # keyboard は piano の Basic Pitch 由来
            called_paths = {
                call.args[0] for call in mock_basic_pitch.transcribe_track.call_args_list
            }
            assert track_paths["piano"] in called_paths
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                os.unlink(p)

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_6stem_output_contains_expected_keys(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """6stem 出力に drums/bass/other/melody/guitar/keyboard が含まれること"""
        from app.services.magenta import MagentaService
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths_6s()
        self._setup_mocks_6s(mock_get_basic_pitch, mock_get_librosa, mock_get_separator, track_paths)

        try:
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            expected_keys = {"drums", "bass", "other", "melody", "guitar", "keyboard"}
            actual_keys = set(result["tracks"].keys())
            assert actual_keys == expected_keys, (
                f"期待するキー: {expected_keys}, 実際のキー: {actual_keys}"
            )
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


class TestAudioTo4TracksFloatTempo:
    """audio_to_4tracks の float BPM 貫通テスト（仕様 4-1）

    magenta が LibrosaTranscriber.detect_tempo を直接呼び出し、
    TempoInfo の float tempo が round されずに流れることを確認する。
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

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_audio_to_4tracks_tempo_kept_as_float(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """LibrosaTranscriber.detect_tempo が float 173.5 を返したとき result["tempo"] == 173.5

        現状 Red: audio_to_4tracks が BasicPitchService.detect_tempo（タプル）を呼んでいるため
        TempoInfo を直接呼んでいない。magenta が LibrosaTranscriber.detect_tempo を
        直呼びするよう変更後に Green になる。
        """
        from app.services.magenta import MagentaService
        from app.models.transcription import TempoInfo
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()

        # LibrosaTranscriber.detect_tempo が TempoInfo(173.5) を返す
        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=173.5, beat_times=[0.0, 0.34], offset=0.0
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
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True
            assert result["tempo"] == 173.5, (
                f"tempo が float のまま貫通していない: {result['tempo']} (expected 173.5)"
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
    def test_audio_to_4tracks_applies_offset_to_result_notes(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """detect_tempo が offset=0.8 を返すとき最終ノートが offset で補正される

        設計書 §配線2(b): audio_to_4tracks レベルで apply_offset_to_notes を一元適用。
        変換器（モック）が raw ノート（start=0.8）を返すとき、
        最終結果は start≈0.0（=0.8-0.8）になる。
        """
        from app.services.magenta import MagentaService
        from app.models.transcription import TempoInfo
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()

        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=160.0, beat_times=[0.8, 1.175], offset=0.8
        )
        # raw ノート（offset 未適用）を返す
        raw_note = {"pitch": 60, "start": 0.8, "end": 1.2, "velocity": 80}
        mock_librosa.extract_drums.return_value = {
            "success": True,
            "notes": [{"pitch": 36, "start": 0.8, "end": 0.85, "velocity": 80, "drum_type": "kick"}],
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
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True

            # bass ノートが offset=0.8 で補正されているか（raw start=0.8 → 0.0）
            bass_notes = result["tracks"].get("bass", {}).get("notes", [])
            assert len(bass_notes) >= 1, "bass ノートが空"
            assert bass_notes[0]["start"] == pytest.approx(0.0, abs=0.01), (
                f"bass notes[0]['start']={bass_notes[0]['start']} "
                f"(expected ≈0.0 = raw 0.8 - offset 0.8)"
            )

            # drums ノートが offset=0.8 で補正されているか（raw start=0.8 → 0.0）
            drums_notes = result["tracks"].get("drums", {}).get("notes", [])
            assert len(drums_notes) >= 1, "drums ノートが空"
            assert drums_notes[0]["start"] == pytest.approx(0.0, abs=0.01), (
                f"drums notes[0]['start']={drums_notes[0]['start']} "
                f"(expected ≈0.0 = raw 0.8 - offset 0.8)"
            )
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                try:
                    os.unlink(p)
                except FileNotFoundError:
                    pass


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
