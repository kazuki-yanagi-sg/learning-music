"""
YouTubeサービスのテスト
"""
import pytest
from unittest.mock import Mock, patch


class TestYouTubeService:
    """YouTubeServiceのテスト"""

    @patch.dict("os.environ", {"YOUTUBE_API_KEY": "test_key"})
    @patch("app.services.youtube.build")
    def test_search_music(self, mock_build):
        """音楽検索が正しく動作する"""
        from app.services.youtube import YouTubeService

        # モックセットアップ
        mock_youtube = Mock()
        mock_build.return_value = mock_youtube

        mock_response = {
            "items": [
                {
                    "id": {"videoId": "video123"},
                    "snippet": {
                        "title": "Test Song",
                        "channelTitle": "Test Channel",
                        "thumbnails": {"high": {"url": "https://example.com/thumb.jpg"}},
                        "publishedAt": "2024-01-01T00:00:00Z",
                    },
                }
            ]
        }
        mock_youtube.search().list().execute.return_value = mock_response

        service = YouTubeService()
        results = service.search_music("test query", limit=5)

        assert len(results) == 1
        assert results[0]["id"] == "video123"
        assert results[0]["title"] == "Test Song"
        assert results[0]["channel"] == "Test Channel"

    @patch.dict("os.environ", {"YOUTUBE_API_KEY": "test_key"})
    @patch("app.services.youtube.build")
    def test_get_video(self, mock_build):
        """動画詳細取得が正しく動作する"""
        from app.services.youtube import YouTubeService

        mock_youtube = Mock()
        mock_build.return_value = mock_youtube

        mock_response = {
            "items": [
                {
                    "id": "video123",
                    "snippet": {
                        "title": "Test Song",
                        "channelTitle": "Test Channel",
                        "description": "Test description",
                        "thumbnails": {"high": {"url": "https://example.com/thumb.jpg"}},
                        "publishedAt": "2024-01-01T00:00:00Z",
                    },
                    "contentDetails": {
                        "duration": "PT3M30S",
                    },
                }
            ]
        }
        mock_youtube.videos().list().execute.return_value = mock_response

        service = YouTubeService()
        video = service.get_video("video123")

        assert video is not None
        assert video["id"] == "video123"
        assert video["title"] == "Test Song"
        assert video["duration"] == "PT3M30S"

    @patch.dict("os.environ", {"YOUTUBE_API_KEY": "test_key"})
    @patch("app.services.youtube.build")
    def test_get_video_not_found(self, mock_build):
        """存在しない動画はNoneを返す"""
        from app.services.youtube import YouTubeService

        mock_youtube = Mock()
        mock_build.return_value = mock_youtube
        mock_youtube.videos().list().execute.return_value = {"items": []}

        service = YouTubeService()
        video = service.get_video("nonexistent")

        assert video is None

    @patch.dict("os.environ", {}, clear=True)
    def test_missing_api_key_raises_error(self):
        """APIキーがない場合はエラー"""
        from app.services.youtube import YouTubeService

        with pytest.raises(ValueError, match="YOUTUBE_API_KEY"):
            YouTubeService()

    @patch.dict("os.environ", {"YOUTUBE_API_KEY": "test_key"})
    @patch("app.services.youtube.build")
    def test_search_music_skips_items_without_video_id(self, mock_build):
        """videoIdがないアイテム（チャンネルなど）はスキップされる"""
        from app.services.youtube import YouTubeService

        mock_youtube = Mock()
        mock_build.return_value = mock_youtube

        # videoIdがあるアイテムとないアイテムが混在するレスポンス
        mock_response = {
            "items": [
                {
                    # videoIdがない（チャンネルやプレイリストの場合）
                    "id": {"channelId": "channel123"},
                    "snippet": {
                        "title": "Channel Title",
                        "channelTitle": "Channel Name",
                        "thumbnails": {"default": {"url": "https://example.com/thumb.jpg"}},
                        "publishedAt": "2024-01-01T00:00:00Z",
                    },
                },
                {
                    # 正常なvideoIdあり
                    "id": {"videoId": "video456"},
                    "snippet": {
                        "title": "Video Title",
                        "channelTitle": "Video Channel",
                        "thumbnails": {"high": {"url": "https://example.com/thumb2.jpg"}},
                        "publishedAt": "2024-01-02T00:00:00Z",
                    },
                },
                {
                    # idがない異常なケース
                    "snippet": {
                        "title": "Bad Item",
                        "channelTitle": "Bad Channel",
                        "thumbnails": {"default": {"url": "https://example.com/thumb3.jpg"}},
                        "publishedAt": "2024-01-03T00:00:00Z",
                    },
                },
            ]
        }
        mock_youtube.search().list().execute.return_value = mock_response

        service = YouTubeService()
        results = service.search_music("test query", limit=10)

        # videoIdがあるアイテムのみ返される
        assert len(results) == 1
        assert results[0]["id"] == "video456"
        assert results[0]["title"] == "Video Title"
