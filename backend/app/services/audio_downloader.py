"""
yt-dlp 音声ダウンロードサービス

YouTubeから音声（WAV）をダウンロード
"""
import os
import re
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import Optional, Generator

# ダウンロードのタイムアウト（秒）
DOWNLOAD_TIMEOUT_SEC = 300  # 5分タイムアウト


class AudioDownloaderService:
    """yt-dlp を使用した音声ダウンローダー"""

    def _build_ytdlp_argv(
        self, url: str, output_template: str, with_progress: bool = False
    ) -> list[str]:
        """
        yt-dlp の引数リストを組み立てる

        Args:
            url: YouTube動画のURL
            output_template: -o に渡す出力パス（テンプレート）
            with_progress: 進捗出力用フラグを付けるか
                           True: --newline / --progress-template を付与
                           False: --quiet を付与

        Returns:
            subprocess に渡す引数リスト
        """
        argv = [
            "yt-dlp",
            # YouTube の JS チャレンジ(n-sig)解決に使う JavaScript ランタイム。
            # yt-dlp の対応名は deno/node/bun/quickjs。"nodejs" は無視され、
            # 解決できず HTTP 403 になるため、導入済みの deno を明示指定する。
            "--js-runtimes", "deno",
            "-x",  # 音声のみ抽出
            "--audio-format", "wav",
            "-o", output_template,
            "--no-playlist",  # プレイリストは無視
        ]
        if with_progress:
            argv += [
                "--newline",  # 進捗を行ごとに出力
                "--progress-template", "%(progress._percent_str)s",
            ]
        else:
            argv += ["--quiet"]
        argv.append(url)
        return argv

    def _resolve_downloaded_file(self, file_id: str) -> Optional[Path]:
        """
        ダウンロードされたファイルを解決する（拡張子の自動付与に対応）

        Args:
            file_id: ファイル名のID部分

        Returns:
            見つかったファイルパス。なければ None
        """
        # yt-dlpは拡張子を自動で付けることがあるので確認
        possible_paths = list(self.temp_dir.glob(f"{file_id}.*"))
        if possible_paths:
            return possible_paths[0]
        return None

    def __init__(self):
        # 共有ディレクトリを環境変数から優先取得
        custom_dir = os.getenv("ANISONG_AUDIO_DIR")
        if custom_dir:
            self.temp_dir = Path(custom_dir)
        else:
            # ダウンロード用の一時ディレクトリ
            self.temp_dir = Path(tempfile.gettempdir()) / "anisong_audio"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def download_audio(self, url: str) -> dict:
        """
        YouTubeから音声（WAV）をダウンロード

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
        output_path = self.temp_dir / f"{file_id}.wav"

        try:
            # yt-dlpコマンドを実行
            result = subprocess.run(
                self._build_ytdlp_argv(url, str(output_path)),
                capture_output=True,
                text=True,
                timeout=DOWNLOAD_TIMEOUT_SEC,
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "file_path": None,
                    "error": result.stderr or "yt-dlp failed",
                }

            # ファイルが存在するか確認
            if not output_path.exists():
                resolved = self._resolve_downloaded_file(file_id)
                if resolved is not None:
                    output_path = resolved
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
        YouTubeから音声（WAV）をダウンロード（進捗付き）

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
        output_path = self.temp_dir / f"{file_id}.wav"

        try:
            process = subprocess.Popen(
                self._build_ytdlp_argv(url, output_template, with_progress=True),
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
                resolved = self._resolve_downloaded_file(file_id)
                if resolved is not None:
                    output_path = resolved
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
