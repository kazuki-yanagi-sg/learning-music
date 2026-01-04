"""
プロンプトモジュール

Gemini API等で使用するプロンプトテンプレートを管理
プロンプトは.md形式で保存し、SYSTEM_/USER_接頭辞で分類
"""
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent


def load_prompt(filename: str) -> str:
    """
    プロンプトファイルを読み込む

    Args:
        filename: ファイル名（例: "SYSTEM_SONG_ANALYSIS.md"）

    Returns:
        プロンプト文字列
    """
    filepath = PROMPTS_DIR / filename
    if not filepath.exists():
        raise FileNotFoundError(f"Prompt file not found: {filename}")
    return filepath.read_text(encoding="utf-8")


def get_system_prompt(name: str) -> str:
    """
    システムプロンプトを取得

    Args:
        name: プロンプト名（例: "SONG_ANALYSIS"）

    Returns:
        プロンプト文字列
    """
    return load_prompt(f"SYSTEM_{name}.md")


def get_user_template(name: str) -> str:
    """
    ユーザーテンプレートを取得

    Args:
        name: テンプレート名（例: "chord_analysis"）

    Returns:
        テンプレート文字列
    """
    return load_prompt(f"USER_TEMPLATES/{name}.md")


# プロンプトテンプレートをロード
SONG_ANALYSIS_PROMPT = get_system_prompt("SONG_ANALYSIS")
CHORD_ADVICE_PROMPT = get_system_prompt("CHORD_ADVISOR")
PROGRESSION_PATTERN_PROMPT = get_system_prompt("PROGRESSION_PATTERN")
