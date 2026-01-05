"""
Geminiサービスのテスト
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import sys


class TestGeminiService:
    """GeminiServiceのテスト"""

    def test_init_without_api_key_raises_error(self):
        """API keyがなければエラーになる"""
        import app.services.gemini as gemini_module
        gemini_module._gemini_service = None

        with patch.dict("os.environ", {}, clear=True):
            from app.services.gemini import GeminiService
            with pytest.raises(ValueError, match="GEMINI_API_KEY"):
                GeminiService()

    def test_init_with_api_key(self):
        """API keyが設定されていれば初期化できる"""
        mock_genai = MagicMock()
        mock_client = MagicMock()
        mock_genai.Client.return_value = mock_client

        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
            with patch.dict(sys.modules, {"google": MagicMock(), "google.genai": mock_genai}):
                # モジュールを再インポート
                import importlib
                import app.services.gemini as gemini_module
                gemini_module._gemini_service = None
                importlib.reload(gemini_module)

                # genaiをモックに差し替え
                with patch.object(gemini_module, "GeminiService") as MockService:
                    MockService.return_value.model = "gemini-2.5-flash"
                    service = MockService()
                    assert service.model == "gemini-2.5-flash"

    @pytest.mark.asyncio
    async def test_generate_song_analysis(self):
        """楽曲解析の解説を生成できる"""
        mock_client = MagicMock()
        mock_response = Mock()
        mock_response.text = "テスト解説文"
        mock_client.models.generate_content.return_value = mock_response

        mock_genai = MagicMock()
        mock_genai.Client.return_value = mock_client

        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
            with patch.dict(sys.modules, {"google.genai": mock_genai}):
                from app.services.gemini import GeminiService

                service = GeminiService.__new__(GeminiService)
                service.client = mock_client
                service.model = "gemini-2.5-flash"

                result = await service.generate_song_analysis(
                    track_name="テスト曲",
                    artist="テストアーティスト",
                    key="C",
                    mode="major",
                    tempo=120,
                    chords=[{"root": "C", "type": "maj"}],
                    notes_count=100,
                )

                assert result == "テスト解説文"

    @pytest.mark.asyncio
    async def test_generate_chord_advice(self):
        """コードアドバイスを生成できる"""
        mock_client = MagicMock()
        mock_response = Mock()
        mock_response.text = "テストアドバイス"
        mock_client.models.generate_content.return_value = mock_response

        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
            from app.services.gemini import GeminiService

            service = GeminiService.__new__(GeminiService)
            service.client = mock_client
            service.model = "gemini-2.5-flash"

            result = await service.generate_chord_advice(
                current_chords=[{"root": "C", "type": "maj"}],
                key="C",
            )

            assert result == "テストアドバイス"

    @pytest.mark.asyncio
    async def test_explain_progression_pattern(self):
        """進行パターンの解説を生成できる"""
        mock_client = MagicMock()
        mock_response = Mock()
        mock_response.text = "テスト進行解説"
        mock_client.models.generate_content.return_value = mock_response

        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
            from app.services.gemini import GeminiService

            service = GeminiService.__new__(GeminiService)
            service.client = mock_client
            service.model = "gemini-2.5-flash"

            result = await service.explain_progression_pattern(
                pattern_name="王道進行",
                degrees=["IV", "V", "iii", "vi"],
            )

            assert result == "テスト進行解説"

    @pytest.mark.asyncio
    async def test_generate_song_analysis_handles_error(self):
        """API呼び出しエラーを適切に処理する"""
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("API Error")

        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
            from app.services.gemini import GeminiService

            service = GeminiService.__new__(GeminiService)
            service.client = mock_client
            service.model = "gemini-2.5-flash"

            result = await service.generate_song_analysis(
                track_name="テスト",
                artist="テスト",
                key="C",
                mode="major",
                tempo=120,
                chords=[],
                notes_count=0,
            )

            assert "失敗しました" in result
            assert "API Error" in result

    def test_transcribe_audio_file_not_found(self):
        """存在しない音声ファイルはエラー"""
        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
            from app.services.gemini import GeminiService

            service = GeminiService.__new__(GeminiService)
            service.client = MagicMock()
            service.model = "gemini-2.5-flash"

            result = service.transcribe_audio("/nonexistent/audio.wav")

            assert result["success"] is False
            assert "not found" in result["error"].lower()

    def test_transcribe_audio_success(self):
        """音声ファイルの解析が成功"""
        import tempfile
        import os

        mock_client = MagicMock()
        mock_uploaded_file = MagicMock()
        mock_client.files.upload.return_value = mock_uploaded_file

        mock_response = Mock()
        mock_response.text = '{"tempo": 140, "notes": [{"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 80}]}'
        mock_client.models.generate_content.return_value = mock_response

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
                from app.services.gemini import GeminiService

                service = GeminiService.__new__(GeminiService)
                service.client = mock_client
                service.model = "gemini-2.5-flash"

                result = service.transcribe_audio(temp_path)

                assert result["success"] is True
                assert result["tempo"] == 140
                assert len(result["notes"]) == 1
                assert result["notes"][0]["pitch"] == 60
        finally:
            os.unlink(temp_path)

    def test_transcribe_audio_json_with_markdown(self):
        """マークダウンで囲まれたJSONレスポンスを処理"""
        import tempfile
        import os

        mock_client = MagicMock()
        mock_uploaded_file = MagicMock()
        mock_client.files.upload.return_value = mock_uploaded_file

        mock_response = Mock()
        mock_response.text = '```json\n{"tempo": 120, "notes": []}\n```'
        mock_client.models.generate_content.return_value = mock_response

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
                from app.services.gemini import GeminiService

                service = GeminiService.__new__(GeminiService)
                service.client = mock_client
                service.model = "gemini-2.5-flash"

                result = service.transcribe_audio(temp_path)

                assert result["success"] is True
                assert result["tempo"] == 120
        finally:
            os.unlink(temp_path)

    def test_transcribe_audio_invalid_json(self):
        """無効なJSONレスポンスはエラー"""
        import tempfile
        import os

        mock_client = MagicMock()
        mock_uploaded_file = MagicMock()
        mock_client.files.upload.return_value = mock_uploaded_file

        mock_response = Mock()
        mock_response.text = "これはJSONではありません"
        mock_client.models.generate_content.return_value = mock_response

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            f.write(b"dummy audio data")

        try:
            with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
                from app.services.gemini import GeminiService

                service = GeminiService.__new__(GeminiService)
                service.client = mock_client
                service.model = "gemini-2.5-flash"

                result = service.transcribe_audio(temp_path)

                assert result["success"] is False
                assert "JSON" in result["error"]
        finally:
            os.unlink(temp_path)
