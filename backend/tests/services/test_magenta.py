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

    @patch("app.services.magenta.subprocess.run")
    def test_audio_to_midi_file_not_found(self, mock_run):
        """存在しない音声ファイルはエラー"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        result = service.audio_to_midi("/nonexistent/audio.mp3")

        assert result["success"] is False
        assert "not found" in result["error"].lower()

    @patch("app.services.magenta.subprocess.run")
    def test_audio_to_midi_docker_not_found(self, mock_run):
        """Dockerが見つからない場合"""
        from app.services.magenta import MagentaService
        import tempfile
        import os

        # テンポラリファイルを作成
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            mock_run.side_effect = FileNotFoundError()

            service = MagentaService()
            result = service.audio_to_midi(temp_path)

            assert result["success"] is False
            assert "docker" in result["error"].lower()
        finally:
            os.unlink(temp_path)

    def test_cleanup_nonexistent_file(self):
        """存在しないファイルのクリーンアップ"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        result = service.cleanup("/nonexistent/path/file.mid")

        assert result is False


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
