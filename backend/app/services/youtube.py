"""
YouTube Data API v3 サービス

曲検索とURL取得を提供
"""
import os
from typing import Optional
from googleapiclient.discovery import build


class YouTubeService:
    """YouTube Data API v3 クライアント"""

    def __init__(self):
        api_key = os.getenv("YOUTUBE_API_KEY")
        if not api_key:
            raise ValueError("YOUTUBE_API_KEY not found in environment variables")

        self.youtube = build("youtube", "v3", developerKey=api_key)

    def search_music(self, query: str, limit: int = 10) -> list[dict]:
        """
        音楽を検索

        Args:
            query: 検索クエリ（曲名、アーティスト名など）
            limit: 取得件数

        Returns:
            動画情報のリスト
        """
        request = self.youtube.search().list(
            q=query,
            part="snippet",
            type="video",
            videoCategoryId="10",  # Music category
            maxResults=limit,
        )
        response = request.execute()

        videos = []
        for item in response.get("items", []):
            video_id = item["id"]["videoId"]
            snippet = item["snippet"]
            video = {
                "id": video_id,
                "title": snippet["title"],
                "channel": snippet["channelTitle"],
                "thumbnail": snippet["thumbnails"]["high"]["url"] if "high" in snippet["thumbnails"] else snippet["thumbnails"]["default"]["url"],
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "published_at": snippet["publishedAt"],
            }
            videos.append(video)

        return videos

    def get_video(self, video_id: str) -> Optional[dict]:
        """
        動画詳細を取得

        Args:
            video_id: YouTubeの動画ID

        Returns:
            動画情報（見つからない場合はNone）
        """
        try:
            request = self.youtube.videos().list(
                id=video_id,
                part="snippet,contentDetails",
            )
            response = request.execute()

            items = response.get("items", [])
            if not items:
                return None

            item = items[0]
            snippet = item["snippet"]
            content_details = item["contentDetails"]

            return {
                "id": video_id,
                "title": snippet["title"],
                "channel": snippet["channelTitle"],
                "description": snippet.get("description", ""),
                "thumbnail": snippet["thumbnails"]["high"]["url"] if "high" in snippet["thumbnails"] else snippet["thumbnails"]["default"]["url"],
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "duration": content_details["duration"],  # ISO 8601 format
                "published_at": snippet["publishedAt"],
            }
        except Exception:
            return None


# シングルトンインスタンス
_youtube_service: Optional[YouTubeService] = None


def get_youtube_service() -> YouTubeService:
    """YouTubeServiceのシングルトンを取得"""
    global _youtube_service
    if _youtube_service is None:
        _youtube_service = YouTubeService()
    return _youtube_service
