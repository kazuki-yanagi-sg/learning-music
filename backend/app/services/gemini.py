"""
Gemini API サービス

楽曲解析結果の解説生成
"""
import logging
import os
import time
from typing import Optional

logger = logging.getLogger(__name__)

# 一時的（リトライで回復しうる）なGemini APIエラーの判定キーワード。
# gemini-2.5-flash は混雑時に 503 UNAVAILABLE / 429 を返すが、数秒後の再試行で回復する。
_TRANSIENT_ERROR_KEYWORDS = (
    "503",
    "unavailable",
    "overloaded",
    "high demand",
    "429",
    "resource_exhausted",
    "rate limit",
    "deadline",
    "timeout",
)
# リトライ回数と待機（指数バックオフ: 1s, 2s, 4s）
_MAX_RETRIES = 3
_BACKOFF_BASE_SECONDS = 1.0

from app.prompts import (
    get_system_prompt,
    SONG_ANALYSIS_PROMPT,
    CHORD_ADVICE_PROMPT,
    PROGRESSION_PATTERN_PROMPT,
)

# 範囲指定解説用プロンプト（SYSTEM_SECTION_ANALYSIS.md から読み込み）
SECTION_ANALYSIS_PROMPT = get_system_prompt("SECTION_ANALYSIS")


class GeminiService:
    """Gemini API クライアント"""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")

        # 遅延インポート（テスト時のモック対応）
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.5-flash"

    def _is_transient_error(self, error: Exception) -> bool:
        """一時的（リトライで回復しうる）なエラーかを判定する（503/429/混雑等）"""
        msg = str(error).lower()
        return any(keyword in msg for keyword in _TRANSIENT_ERROR_KEYWORDS)

    def _generate(self, prompt: str, failure_message: str) -> str:
        """
        プロンプトをGeminiに渡してテキストを生成する共通処理

        gemini-2.5-flash は混雑時に 503 UNAVAILABLE を断続的に返すため、
        一時的なエラーのときだけ指数バックオフで最大 _MAX_RETRIES 回リトライする。
        恒久的なエラー（無効リクエスト等）は即座に失敗メッセージを返す。

        Args:
            prompt: Geminiに渡すプロンプト
            failure_message: 失敗時に返すメッセージ（接頭辞）。
                             "{接頭辞}: {例外文字列}" の形式で返す

        Returns:
            生成されたテキスト。失敗時は failure_message を含むエラーテキスト
        """
        last_error: Optional[Exception] = None
        for attempt in range(_MAX_RETRIES):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                )
                return response.text
            except Exception as e:
                last_error = e
                # 一時的でないエラー、または最終試行なら即座に終了
                if not self._is_transient_error(e) or attempt == _MAX_RETRIES - 1:
                    break
                # 指数バックオフで待機してから再試行（1s, 2s, 4s）
                wait = _BACKOFF_BASE_SECONDS * (2 ** attempt)
                logger.warning(
                    "[Gemini] 一時的エラー（%d/%d回目）: %s。%.1f秒後に再試行",
                    attempt + 1, _MAX_RETRIES, str(e), wait,
                )
                time.sleep(wait)

        logger.error("[Gemini] 生成失敗: %s", str(last_error))
        return f"{failure_message}: {str(last_error)}"

    async def generate_song_analysis(
        self,
        track_name: str,
        artist: str,
        key: str,
        mode: str,
        tempo: int,
        chords: list[dict],
        notes_count: int,
    ) -> str:
        """
        楽曲解析の解説を生成

        Args:
            track_name: 曲名
            artist: アーティスト名
            key: キー（C, D, E, ...）
            mode: モード（major, minor）
            tempo: テンポ（BPM）
            chords: 検出されたコード進行
            notes_count: 検出されたノート数

        Returns:
            解説テキスト
        """
        # コード形式の互換性対応（'chord' または 'root'+'type'）
        def format_chord(c):
            if 'chord' in c:
                return c['chord']
            elif 'root' in c:
                return f"{c['root']}{c.get('type', '')}"
            return str(c)

        chord_str = " → ".join([format_chord(c) for c in chords[:8]]) if chords else "検出なし"

        prompt = SONG_ANALYSIS_PROMPT.format(
            track_name=track_name,
            artist=artist,
            key=key,
            mode=mode,
            tempo=tempo,
            chord_progression=chord_str,
            notes_count=notes_count,
        )

        return self._generate(prompt, "解説の生成に失敗しました")

    async def generate_section_analysis(
        self,
        track_name: str,
        tempo: int,
        start_time: float,
        end_time: float,
        tracks_data: dict,
    ) -> str:
        """
        指定区間の解説を生成

        Args:
            track_name: 曲名
            tempo: テンポ（BPM）
            start_time: 開始時間（秒）
            end_time: 終了時間（秒）
            tracks_data: 各トラックのノート情報
                {
                    "melody": [{ pitch, start, end }, ...],
                    "drums": [...],
                    "bass": [...],
                    "other": [...]
                }

        Returns:
            解説テキスト
        """
        # ノート情報をサマリー化
        def summarize_track(name: str, notes: list) -> str:
            if not notes:
                return f"- {name}: なし"
            # 時間範囲内のノートをフィルタ
            filtered = [n for n in notes if n.get('start', 0) >= start_time and n.get('start', 0) < end_time]
            if not filtered:
                return f"- {name}: この区間にノートなし"
            # ピッチの分布
            pitches = [n.get('pitch', 0) for n in filtered]
            min_p, max_p = min(pitches), max(pitches)
            return f"- {name}: {len(filtered)}ノート (音域: {min_p}〜{max_p})"

        notes_summary = "\n".join([
            summarize_track("メロディ", tracks_data.get("melody", [])),
            summarize_track("ドラム", tracks_data.get("drums", [])),
            summarize_track("ベース", tracks_data.get("bass", [])),
            summarize_track("その他", tracks_data.get("other", [])),
        ])

        prompt = SECTION_ANALYSIS_PROMPT.format(
            track_name=track_name,
            tempo=tempo,
            start_time=start_time,
            end_time=end_time,
            notes_summary=notes_summary,
        )

        return self._generate(prompt, "解説の生成に失敗しました")

    async def generate_chord_advice(
        self,
        current_chords: list[dict],
        key: str,
    ) -> str:
        """
        現在のコード進行に対するアドバイスを生成

        Args:
            current_chords: 現在のコード進行
            key: キー

        Returns:
            アドバイステキスト
        """
        chord_str = " → ".join([f"{c['root']}{c['type']}" for c in current_chords]) if current_chords else "なし"

        prompt = CHORD_ADVICE_PROMPT.format(
            key=key,
            chord_progression=chord_str,
        )

        return self._generate(prompt, "アドバイスの生成に失敗しました")

    async def explain_progression_pattern(
        self,
        pattern_name: str,
        degrees: list[str],
    ) -> str:
        """
        コード進行パターンの解説を生成

        Args:
            pattern_name: パターン名（王道進行、小室進行など）
            degrees: ディグリー表記（IV, V, iii, vi など）

        Returns:
            解説テキスト
        """
        degrees_str = " → ".join(degrees)

        prompt = PROGRESSION_PATTERN_PROMPT.format(
            pattern_name=pattern_name,
            degrees=degrees_str,
        )

        return self._generate(prompt, "解説の生成に失敗しました")


# シングルトンインスタンス
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """GeminiServiceのシングルトンを取得"""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
