"""
サービス層

外部APIとの連携を担当
"""

__all__ = [
    "get_youtube_service",
    "get_audio_downloader_service",
    "get_magenta_service",
    "get_gemini_service",
]


def get_youtube_service():
    """YouTubeServiceを遅延インポートして取得"""
    from .youtube import get_youtube_service as _get_youtube_service
    return _get_youtube_service()


def get_audio_downloader_service():
    """AudioDownloaderServiceを遅延インポートして取得"""
    from .audio_downloader import get_audio_downloader_service as _get_audio_downloader_service
    return _get_audio_downloader_service()


def get_magenta_service():
    """MagentaServiceを遅延インポートして取得"""
    from .magenta import get_magenta_service as _get_magenta_service
    return _get_magenta_service()


def get_gemini_service():
    """GeminiServiceを遅延インポートして取得"""
    from .gemini import get_gemini_service as _get_gemini_service
    return _get_gemini_service()
