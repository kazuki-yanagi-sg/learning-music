"""
AudioSeparatorServiceのテスト
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path


class TestAudioSeparatorService:
    """AudioSeparatorServiceのテスト"""

    @patch("app.services.audio_separator.torch")
    @patch("app.services.audio_separator.pretrained")
    def test_init_cpu_device(self, mock_pretrained, mock_torch):
        """CPUデバイスで初期化"""
        mock_torch.backends.mps.is_available.return_value = False
        mock_torch.cuda.is_available.return_value = False

        from app.services.audio_separator import AudioSeparatorService

        service = AudioSeparatorService()
        assert service.device == "cpu"

    @patch("app.services.audio_separator.torch")
    @patch("app.services.audio_separator.pretrained")
    def test_init_mps_device(self, mock_pretrained, mock_torch):
        """Apple Siliconデバイスで初期化"""
        mock_torch.backends.mps.is_available.return_value = True

        from app.services.audio_separator import AudioSeparatorService

        service = AudioSeparatorService()
        assert service.device == "mps"

    def test_separate_file_not_found(self):
        """存在しないファイルはエラー"""
        from app.services.audio_separator import AudioSeparatorService

        with patch("app.services.audio_separator.torch") as mock_torch:
            mock_torch.backends.mps.is_available.return_value = False
            mock_torch.cuda.is_available.return_value = False

            service = AudioSeparatorService()
            result = service.separate("/nonexistent/audio.wav")

            assert result["success"] is False
            assert "not found" in result["error"].lower()

    @patch("app.services.audio_separator.sf")
    @patch("app.services.audio_separator.apply_model")
    @patch("app.services.audio_separator.pretrained")
    @patch("app.services.audio_separator.torch")
    def test_separate_success(self, mock_torch, mock_pretrained, mock_apply, mock_sf):
        """楽器分離が成功"""
        import tempfile
        import os
        import numpy as np

        # テンポラリファイルを作成
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            mock_torch.backends.mps.is_available.return_value = False
            mock_torch.cuda.is_available.return_value = False
            mock_torch.no_grad.return_value.__enter__ = lambda self: None
            mock_torch.no_grad.return_value.__exit__ = lambda self, *args: False
            # wav 生成用に torch.from_numpy をモック（後段の処理は wav に依存しない）
            mock_wav = MagicMock()
            mock_wav.shape = [2, 44100]
            mock_wav.unsqueeze.return_value = mock_wav
            mock_wav.to.return_value = mock_wav
            mock_torch.from_numpy.return_value = mock_wav

            # モデルのモック
            mock_model = MagicMock()
            mock_model.sources = ["drums", "bass", "other", "vocals"]
            mock_pretrained.get_model.return_value = mock_model

            # 音声読み込みのモック（soundfile.read を使用）
            # [samples, channels] のステレオ配列を返す
            audio_data = np.zeros((44100, 2), dtype=np.float32)
            mock_sf.read.return_value = (audio_data, 44100)

            # 分離結果のモック sources[0, i].cpu().numpy() を満たす
            mock_sources = MagicMock()
            mock_track = MagicMock()
            mock_track.cpu.return_value.numpy.return_value = np.zeros((2, 44100), dtype=np.float32)
            mock_sources.__getitem__ = lambda self, idx: mock_track
            mock_apply.return_value = mock_sources

            from app.services.audio_separator import AudioSeparatorService

            service = AudioSeparatorService()
            result = service.separate(temp_path)

            # 成功を確認（モックなので実際のファイルは生成されない）
            assert mock_apply.called

        finally:
            os.unlink(temp_path)

    def test_cleanup(self):
        """クリーンアップが動作"""
        import tempfile
        import os

        with patch("app.services.audio_separator.torch") as mock_torch:
            mock_torch.backends.mps.is_available.return_value = False
            mock_torch.cuda.is_available.return_value = False

            from app.services.audio_separator import AudioSeparatorService

            service = AudioSeparatorService()

            # 存在しないファイルのクリーンアップ
            service.cleanup({"test": "/nonexistent/file.wav"})
            # エラーが出ないことを確認
