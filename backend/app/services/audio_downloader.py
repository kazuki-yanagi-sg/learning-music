"""
yt-dlp 音声ダウンロードサービス

YouTubeからMP3をダウンロード
"""
import os
import re
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import Optional, Generator


class AudioDownloaderService:
    """yt-dlp を使用した音声ダウンローダー"""

    def __init__(self):
        # ダウンロード用の一時ディレクトリ
        self.temp_dir = Path(tempfile.gettempdir()) / "anisong_audio"
        self.temp_dir.mkdir(exist_ok=True)

    def download_audio(self, url: str) -> dict:
        """
        YouTubeからMP3をダウンロード

        Args:
            url: YouTube動画のURL

        Returns:
            {
                "success": True/False,
                "file_path": ダウンロードしたファイルのパス,
                "error": エラーメッセージ（失敗時）
            }
        """
        # ユニークなファイル名を生成
        file_id = str(uuid.uuid4())
        output_path = self.temp_dir / f"{file_id}.mp3"

        try:
            # yt-dlpコマンドを実行
            result = subprocess.run(
                [
                    "yt-dlp",
                    "--js-runtimes", "nodejs",  # Node.jsをJSランタイムとして使用
                    "-x",  # 音声のみ抽出
                    "--audio-format", "mp3",
                    "--audio-quality", "0",  # 最高品質
                    "-o", str(output_path),
                    "--no-playlist",  # プレイリストは無視
                    "--quiet",
                    url,
                ],
                capture_output=True,
                text=True,
                timeout=300,  # 5分タイムアウト
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "file_path": None,
                    "error": result.stderr or "yt-dlp failed",
                }

            # ファイルが存在するか確認
            if not output_path.exists():
                # yt-dlpは拡張子を自動で付けることがあるので確認
                possible_paths = list(self.temp_dir.glob(f"{file_id}.*"))
                if possible_paths:
                    output_path = possible_paths[0]
                else:
                    return {
                        "success": False,
                        "file_path": None,
                        "error": "Downloaded file not found",
                    }

            return {
                "success": True,
                "file_path": str(output_path),
                "error": None,
            }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "file_path": None,
                "error": "Download timed out",
            }
        except FileNotFoundError:
            return {
                "success": False,
                "file_path": None,
                "error": "yt-dlp not found. Please install yt-dlp.",
            }
        except Exception as e:
            return {
                "success": False,
                "file_path": None,
                "error": str(e),
            }

    def download_audio_with_progress(self, url: str) -> Generator[dict, None, None]:
        """
        YouTubeからMP3をダウンロード（進捗付き）

        Args:
            url: YouTube動画のURL

        Yields:
            {
                "stage": "download" | "convert" | "complete" | "error",
                "progress": 0-100,
                "message": 状態メッセージ,
                "file_path": 完了時のファイルパス（completeのみ）
            }
        """
        file_id = str(uuid.uuid4())
        output_template = str(self.temp_dir / f"{file_id}.%(ext)s")
        output_path = self.temp_dir / f"{file_id}.mp3"

        try:
            process = subprocess.Popen(
                [
                    "yt-dlp",
                    "--js-runtimes", "nodejs",  # Node.jsをJSランタイムとして使用
                    "-x",
                    "--audio-format", "mp3",
                    "--audio-quality", "0",
                    "-o", output_template,
                    "--no-playlist",
                    "--newline",  # 進捗を行ごとに出力
                    "--progress-template", "%(progress._percent_str)s",
                    url,
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            yield {
                "stage": "download",
                "progress": 0,
                "message": "ダウンロード開始...",
            }

            # 進捗を読み取る
            last_progress = 0
            for line in iter(process.stdout.readline, ""):
                line = line.strip()
                if not line:
                    continue

                # パーセンテージを抽出 (例: "50.0%" or " 50.0%")
                match = re.search(r"(\d+\.?\d*)%", line)
                if match:
                    progress = min(float(match.group(1)), 100)
                    if progress > last_progress:
                        last_progress = progress
                        yield {
                            "stage": "download",
                            "progress": int(progress),
                            "message": f"ダウンロード中... {int(progress)}%",
                        }
                elif "Extracting" in line or "extract" in line.lower():
                    yield {
                        "stage": "convert",
                        "progress": 0,
                        "message": "音声変換中...",
                    }

            process.wait()

            if process.returncode != 0:
                stderr = process.stderr.read()
                yield {
                    "stage": "error",
                    "progress": 0,
                    "message": stderr or "ダウンロード失敗",
                }
                return

            # ファイルを探す
            if not output_path.exists():
                possible_paths = list(self.temp_dir.glob(f"{file_id}.*"))
                if possible_paths:
                    output_path = possible_paths[0]
                else:
                    yield {
                        "stage": "error",
                        "progress": 0,
                        "message": "ダウンロードファイルが見つかりません",
                    }
                    return

            yield {
                "stage": "complete",
                "progress": 100,
                "message": "ダウンロード完了",
                "file_path": str(output_path),
            }

        except FileNotFoundError:
            yield {
                "stage": "error",
                "progress": 0,
                "message": "yt-dlpがインストールされていません",
            }
        except Exception as e:
            yield {
                "stage": "error",
                "progress": 0,
                "message": str(e),
            }

    def cleanup(self, file_path: str) -> bool:
        """
        ダウンロードしたファイルを削除

        Args:
            file_path: 削除するファイルのパス

        Returns:
            成功したかどうか
        """
        try:
            path = Path(file_path)
            if path.exists() and path.is_file():
                path.unlink()
                return True
            return False
        except Exception:
            return False

    def cleanup_all(self) -> int:
        """
        一時ディレクトリ内のすべてのファイルを削除

        Returns:
            削除したファイル数
        """
        count = 0
        try:
            for file in self.temp_dir.iterdir():
                if file.is_file():
                    file.unlink()
                    count += 1
        except Exception:
            pass
        return count


# シングルトンインスタンス
_audio_downloader_service: Optional[AudioDownloaderService] = None


def get_audio_downloader_service() -> AudioDownloaderService:
    """AudioDownloaderServiceのシングルトンを取得"""
    global _audio_downloader_service
    if _audio_downloader_service is None:
        _audio_downloader_service = AudioDownloaderService()
    return _audio_downloader_service
