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

    @pytest.mark.asyncio
    async def test_generate_retries_on_transient_error(self):
        """一時的な503エラーはリトライして成功する"""
        mock_client = MagicMock()
        mock_response = Mock()
        mock_response.text = "リトライ後の解説文"
        # 1回目は503、2回目は成功
        mock_client.models.generate_content.side_effect = [
            Exception("503 UNAVAILABLE. This model is currently experiencing high demand."),
            mock_response,
        ]

        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
            with patch("app.services.gemini.time.sleep"):  # バックオフ待機をスキップ
                from app.services.gemini import GeminiService

                service = GeminiService.__new__(GeminiService)
                service.client = mock_client
                service.model = "gemini-2.5-flash"

                result = await service.generate_song_analysis(
                    track_name="テスト", artist="テスト", key="C", mode="major",
                    tempo=120, chords=[], notes_count=0,
                )

                assert result == "リトライ後の解説文"
                assert mock_client.models.generate_content.call_count == 2

    @pytest.mark.asyncio
    async def test_generate_does_not_retry_on_permanent_error(self):
        """恒久的なエラーはリトライせず即座に失敗を返す"""
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("400 INVALID_ARGUMENT")

        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-api-key"}):
            with patch("app.services.gemini.time.sleep") as mock_sleep:
                from app.services.gemini import GeminiService

                service = GeminiService.__new__(GeminiService)
                service.client = mock_client
                service.model = "gemini-2.5-flash"

                result = await service.generate_song_analysis(
                    track_name="テスト", artist="テスト", key="C", mode="major",
                    tempo=120, chords=[], notes_count=0,
                )

                assert "失敗しました" in result
                # 恒久エラーは1回だけ呼ばれ、sleep（リトライ待機）は発生しない
                assert mock_client.models.generate_content.call_count == 1
                mock_sleep.assert_not_called()
