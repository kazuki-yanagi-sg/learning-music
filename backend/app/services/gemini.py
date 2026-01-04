"""
Gemini API サービス

楽曲解析結果の解説生成
"""
import os
from typing import Optional

from app.prompts import (
    SONG_ANALYSIS_PROMPT,
    CHORD_ADVICE_PROMPT,
    PROGRESSION_PATTERN_PROMPT,
)


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
        chord_str = " → ".join([f"{c['root']}{c['type']}" for c in chords[:8]]) if chords else "検出なし"

        prompt = SONG_ANALYSIS_PROMPT.format(
            track_name=track_name,
            artist=artist,
            key=key,
            mode=mode,
            tempo=tempo,
            chord_progression=chord_str,
            notes_count=notes_count,
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )
            return response.text
        except Exception as e:
            return f"解説の生成に失敗しました: {str(e)}"

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

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )
            return response.text
        except Exception as e:
            return f"アドバイスの生成に失敗しました: {str(e)}"

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

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )
            return response.text
        except Exception as e:
            return f"解説の生成に失敗しました: {str(e)}"


# シングルトンインスタンス
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """GeminiServiceのシングルトンを取得"""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
