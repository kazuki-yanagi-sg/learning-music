"""
AudioDownloaderサービスのテスト
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path


class TestAudioDownloaderService:
    """AudioDownloaderServiceのテスト"""

    @patch("app.services.audio_downloader.subprocess.run")
    def test_download_audio_success(self, mock_run):
        """音声ダウンロードが成功する"""
        from app.services.audio_downloader import AudioDownloaderService

        mock_run.return_value = MagicMock(returncode=0, stderr="")

        service = AudioDownloaderService()

        # テンポラリディレクトリにダミーファイルを作成
        with patch.object(Path, "exists", return_value=True):
            result = service.download_audio("https://www.youtube.com/watch?v=test123")

        assert result["success"] is True
        assert result["file_path"] is not None
        assert result["error"] is None

    @patch("app.services.audio_downloader.subprocess.run")
    def test_download_audio_failure(self, mock_run):
        """yt-dlpエラー時に失敗を返す"""
        from app.services.audio_downloader import AudioDownloaderService

        mock_run.return_value = MagicMock(returncode=1, stderr="Download error")

        service = AudioDownloaderService()
        result = service.download_audio("https://www.youtube.com/watch?v=test123")

        assert result["success"] is False
        assert result["file_path"] is None
        assert "error" in result["error"].lower() or "failed" in result["error"].lower()

    @patch("app.services.audio_downloader.subprocess.run")
    def test_download_audio_timeout(self, mock_run):
        """タイムアウト時に失敗を返す"""
        from app.services.audio_downloader import AudioDownloaderService
        import subprocess

        mock_run.side_effect = subprocess.TimeoutExpired(cmd="yt-dlp", timeout=300)

        service = AudioDownloaderService()
        result = service.download_audio("https://www.youtube.com/watch?v=test123")

        assert result["success"] is False
        assert result["error"] is not None
        # エラーメッセージにtimeoutが含まれることを確認（大文字小文字問わず）
        assert "timed out" in result["error"].lower() or "timeout" in result["error"].lower()

    @patch("app.services.audio_downloader.subprocess.run")
    def test_download_audio_ytdlp_not_found(self, mock_run):
        """yt-dlpが見つからない場合"""
        from app.services.audio_downloader import AudioDownloaderService

        mock_run.side_effect = FileNotFoundError()

        service = AudioDownloaderService()
        result = service.download_audio("https://www.youtube.com/watch?v=test123")

        assert result["success"] is False
        assert "yt-dlp" in result["error"].lower()

    def test_cleanup_nonexistent_file(self):
        """存在しないファイルのクリーンアップ"""
        from app.services.audio_downloader import AudioDownloaderService

        service = AudioDownloaderService()
        result = service.cleanup("/nonexistent/path/file.mp3")

        assert result is False
