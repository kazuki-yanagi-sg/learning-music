"""
プロンプトモジュールのテスト
"""
import pytest
from app.prompts import (
    load_prompt,
    get_system_prompt,
    SONG_ANALYSIS_PROMPT,
    CHORD_ADVICE_PROMPT,
    PROGRESSION_PATTERN_PROMPT,
)


class TestLoadPrompt:
    """load_prompt関数のテスト"""

    def test_load_existing_prompt(self):
        """存在するプロンプトを読み込める"""
        prompt = load_prompt("SYSTEM_SONG_ANALYSIS.md")
        assert isinstance(prompt, str)
        assert len(prompt) > 0
        assert "音楽理論" in prompt

    def test_load_nonexistent_prompt_raises_error(self):
        """存在しないプロンプトはエラーになる"""
        with pytest.raises(FileNotFoundError):
            load_prompt("NONEXISTENT.md")


class TestGetSystemPrompt:
    """get_system_prompt関数のテスト"""

    def test_get_song_analysis_prompt(self):
        """SONG_ANALYSISプロンプトを取得できる"""
        prompt = get_system_prompt("SONG_ANALYSIS")
        assert "楽曲" in prompt or "曲" in prompt

    def test_get_chord_advisor_prompt(self):
        """CHORD_ADVISORプロンプトを取得できる"""
        prompt = get_system_prompt("CHORD_ADVISOR")
        assert "コード" in prompt

    def test_get_progression_pattern_prompt(self):
        """PROGRESSION_PATTERNプロンプトを取得できる"""
        prompt = get_system_prompt("PROGRESSION_PATTERN")
        assert "パターン" in prompt


class TestPromptTemplates:
    """プロンプトテンプレートのテスト"""

    def test_song_analysis_prompt_has_placeholders(self):
        """楽曲解析プロンプトにプレースホルダーが含まれている"""
        assert "{track_name}" in SONG_ANALYSIS_PROMPT
        assert "{artist}" in SONG_ANALYSIS_PROMPT
        assert "{key}" in SONG_ANALYSIS_PROMPT
        assert "{tempo}" in SONG_ANALYSIS_PROMPT

    def test_chord_advice_prompt_has_placeholders(self):
        """コードアドバイスプロンプトにプレースホルダーが含まれている"""
        assert "{key}" in CHORD_ADVICE_PROMPT
        assert "{chord_progression}" in CHORD_ADVICE_PROMPT

    def test_progression_pattern_prompt_has_placeholders(self):
        """進行パターンプロンプトにプレースホルダーが含まれている"""
        assert "{pattern_name}" in PROGRESSION_PATTERN_PROMPT
        assert "{degrees}" in PROGRESSION_PATTERN_PROMPT

    def test_song_analysis_prompt_can_format(self):
        """楽曲解析プロンプトをフォーマットできる"""
        formatted = SONG_ANALYSIS_PROMPT.format(
            track_name="テスト曲",
            artist="テストアーティスト",
            key="C",
            mode="major",
            tempo=120,
            chord_progression="C → G → Am → F",
            notes_count=100,
        )
        assert "テスト曲" in formatted
        assert "テストアーティスト" in formatted
        assert "120" in formatted
