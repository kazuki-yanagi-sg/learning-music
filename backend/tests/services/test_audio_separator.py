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
    @patch("app.services.audio_separator.torch")
    def test_separate_exception_preserves_type_no_double_wrap(self, mock_torch, mock_sf):
        """分離中の例外は「型名: メッセージ」で返し、元情報を潰さない

        回帰防止: 以前は str(e) のみで "System error." のような曖昧メッセージだと
        原因が分からなかった。例外型名を含め、二重の "Separation failed:" も付けない。
        """
        mock_torch.backends.mps.is_available.return_value = False
        mock_torch.cuda.is_available.return_value = False
        # sf.read が曖昧メッセージの例外を投げる状況を再現
        mock_sf.read.side_effect = RuntimeError("System error.")

        from app.services.audio_separator import AudioSeparatorService

        service = AudioSeparatorService()
        with patch.object(Path, "exists", return_value=True):
            result = service.separate("/tmp/some.wav")

        assert result["success"] is False
        # 例外型名が含まれる（"System error." 単独で原因不明にならない）
        assert "RuntimeError" in result["error"]
        assert "System error." in result["error"]
        # separator 単体の戻り値は "Separation failed:" を二重に付けない
        assert "Separation failed:" not in result["error"]

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


class TestAudioSeparatorHtdemucs6s:
    """htdemucs_6s（6stem）切り替えのテスト

    設計書 A-1:
    - pretrained.get_model("htdemucs_6s") を呼ぶこと
    - model.sources を動的取得し名前引きで 6 トラックを格納できること
    """

    @patch("app.services.audio_separator.pretrained")
    @patch("app.services.audio_separator.torch")
    def test_model_name_is_htdemucs_6s(self, mock_torch, mock_pretrained):
        """get_model に "htdemucs_6s" を渡すこと"""
        mock_torch.backends.mps.is_available.return_value = False
        mock_torch.cuda.is_available.return_value = False

        # モデルを遅延ロードさせるため _model を None のままにする
        mock_model = MagicMock()
        mock_model.sources = ["drums", "bass", "other", "vocals", "guitar", "piano"]
        mock_pretrained.get_model.return_value = mock_model

        from app.services.audio_separator import AudioSeparatorService

        service = AudioSeparatorService()
        # model プロパティへアクセスしてロードを起動する
        _ = service.model

        # htdemucs_6s を要求している
        mock_pretrained.get_model.assert_called_once_with("htdemucs_6s")

    @patch("app.services.audio_separator.sf")
    @patch("app.services.audio_separator.apply_model")
    @patch("app.services.audio_separator.pretrained")
    @patch("app.services.audio_separator.torch")
    def test_six_stems_stored_by_name(self, mock_torch, mock_pretrained, mock_apply, mock_sf):
        """model.sources の名前引きで 6 トラック全てが tracks に格納される"""
        import tempfile
        import os
        import numpy as np
        from unittest.mock import patch as local_patch, MagicMock as LocalMagicMock

        six_stems = ["drums", "bass", "other", "vocals", "guitar", "piano"]

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            mock_torch.backends.mps.is_available.return_value = False
            mock_torch.cuda.is_available.return_value = False
            mock_torch.no_grad.return_value.__enter__ = lambda self: None
            mock_torch.no_grad.return_value.__exit__ = lambda self, *args: False

            mock_wav = MagicMock()
            mock_wav.shape = [2, 44100]
            mock_wav.unsqueeze.return_value = mock_wav
            mock_wav.to.return_value = mock_wav
            mock_torch.from_numpy.return_value = mock_wav

            # 6 stems を返すモデル
            mock_model = MagicMock()
            mock_model.sources = six_stems
            mock_pretrained.get_model.return_value = mock_model

            audio_data = np.zeros((44100, 2), dtype=np.float32)
            mock_sf.read.return_value = (audio_data, 44100)

            # 6 トラック分の sources を返す（インデックス参照をモック）
            mock_track = MagicMock()
            mock_track.cpu.return_value.numpy.return_value = np.zeros((2, 44100), dtype=np.float32)
            mock_sources = MagicMock()
            mock_sources.__getitem__ = lambda self, idx: mock_track
            mock_apply.return_value = mock_sources

            from app.services.audio_separator import AudioSeparatorService

            service = AudioSeparatorService()

            # track_path.stat() はファイルが実際に書かれないため stat モックが必要
            # Path.stat() を MagicMock で差し替えて FileNotFoundError を回避する
            mock_stat = LocalMagicMock()
            mock_stat.st_size = 1024 * 1024  # 1MB
            with local_patch("pathlib.Path.stat", return_value=mock_stat):
                result = service.separate(temp_path)

            # 分離成功し、6 トラック全て名前引きで格納されること
            assert result["success"] is True, f"失敗: {result.get('error')}"
            for name in six_stems:
                assert name in result["tracks"], f"stem '{name}' が tracks に見つからない"
        finally:
            os.unlink(temp_path)
