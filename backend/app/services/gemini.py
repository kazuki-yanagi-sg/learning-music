"""
Gemini API サービス

楽曲解析結果の解説生成、音声→ノート変換
"""
import json
import os
import re
from pathlib import Path
from typing import Optional

from app.prompts import (
    SONG_ANALYSIS_PROMPT,
    CHORD_ADVICE_PROMPT,
    PROGRESSION_PATTERN_PROMPT,
    AUDIO_TRANSCRIPTION_PROMPT,
    TRANSCRIBE_DRUMS_PROMPT,
    TRANSCRIBE_BASS_PROMPT,
    TRANSCRIBE_OTHER_PROMPT,
)

# 範囲指定解説用プロンプト
SECTION_ANALYSIS_PROMPT = """
あなたは音楽理論の専門家です。以下の楽曲の指定区間について、初心者にもわかりやすく解説してください。

## 楽曲情報
- 曲名: {track_name}
- テンポ: {tempo} BPM
- 解析区間: {start_time:.1f}秒 〜 {end_time:.1f}秒

## この区間のノート情報
{notes_summary}

## 解説してほしいこと
1. この区間で使われている音楽的な特徴（コード、スケール、リズムパターンなど）
2. アニソン/J-POPでよく使われるテクニックとの関連
3. 作曲に活かせるポイント

簡潔に、200〜300文字程度で解説してください。
"""


def _extract_json(text: str) -> dict:
    """
    テキストからJSON部分を抽出してパース

    Args:
        text: Geminiのレスポンステキスト

    Returns:
        パースされたdict

    Raises:
        json.JSONDecodeError: JSONパース失敗時
    """
    text = text.strip()

    # ```json ... ``` で囲まれている場合
    json_match = re.search(r'```json\s*([\s\S]*?)\s*```', text)
    if json_match:
        return json.loads(json_match.group(1))

    # ``` ... ``` で囲まれている場合
    code_match = re.search(r'```\s*([\s\S]*?)\s*```', text)
    if code_match:
        return json.loads(code_match.group(1))

    # { ... } を直接探す
    brace_match = re.search(r'\{[\s\S]*\}', text)
    if brace_match:
        return json.loads(brace_match.group(0))

    # そのままパースを試みる
    return json.loads(text)


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

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )
            return response.text
        except Exception as e:
            return f"解説の生成に失敗しました: {str(e)}"

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

    def transcribe_audio(self, audio_path: str) -> dict:
        """
        音声ファイルからノート情報を抽出

        Args:
            audio_path: 音声ファイルのパス

        Returns:
            {
                "success": True/False,
                "tempo": テンポ（BPM）,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Audio file not found: {audio_path}",
            }

        # ファイルサイズチェック（空ファイルのみ拒否）
        file_size = audio_file.stat().st_size
        if file_size == 0:
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": "Audio file is empty",
            }

        try:
            # 音声ファイルをアップロード（google-genaiのバグ回避）
            try:
                uploaded_file = self.client.files.upload(file=audio_file)
            except ZeroDivisionError:
                # google-genaiライブラリの進捗計算バグを回避
                # ファイルパスを文字列で渡す
                uploaded_file = self.client.files.upload(file=str(audio_file))

            # Geminiで音声を分析
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    AUDIO_TRANSCRIPTION_PROMPT,
                    uploaded_file,
                ],
            )

            # レスポンスをパース
            data = _extract_json(response.text)

            return {
                "success": True,
                "tempo": data.get("tempo", 120),
                "notes": data.get("notes", []),
                "error": None,
            }

        except json.JSONDecodeError as e:
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Failed to parse Gemini response as JSON: {str(e)}",
            }
        except ZeroDivisionError:
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": "Gemini API upload error (library bug). Try a shorter audio file.",
            }
        except Exception as e:
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Audio transcription failed: {str(e)}",
            }

    def transcribe_track(self, audio_path: str, track_type: str) -> dict:
        """
        楽器別にトラックをMIDI変換

        Args:
            audio_path: 分離された音声ファイルのパス
            track_type: トラック種別（"drums", "bass", "other", "vocals"）

        Returns:
            {
                "success": True/False,
                "tempo": テンポ（BPM）,
                "notes": ノート情報のリスト,
                "error": エラーメッセージ（失敗時）
            }
        """
        # ボーカルは作曲学習では使わない
        if track_type == "vocals":
            return {
                "success": True,
                "tempo": 120,
                "notes": [],
                "error": None,
            }

        # 楽器別プロンプトを選択
        prompts = {
            "drums": TRANSCRIBE_DRUMS_PROMPT,
            "bass": TRANSCRIBE_BASS_PROMPT,
            "other": TRANSCRIBE_OTHER_PROMPT,
        }
        prompt = prompts.get(track_type, AUDIO_TRANSCRIPTION_PROMPT)

        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Audio file not found: {audio_path}",
            }

        # ファイルサイズチェック（空ファイルのみ拒否）
        file_size = audio_file.stat().st_size
        if file_size == 0:
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Audio file is empty: {track_type}",
            }

        try:
            # 音声ファイルをアップロード（google-genaiのバグ回避）
            try:
                uploaded_file = self.client.files.upload(file=audio_file)
            except ZeroDivisionError:
                uploaded_file = self.client.files.upload(file=str(audio_file))

            # Geminiで音声を分析
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    prompt,
                    uploaded_file,
                ],
            )

            # デバッグ用ログ
            print(f"[DEBUG] {track_type} track response (first 500 chars):")
            print(response.text[:500] if response.text else "Empty response")

            # レスポンスをパース
            data = _extract_json(response.text)

            print(f"[DEBUG] {track_type} parsed notes count: {len(data.get('notes', []))}")

            return {
                "success": True,
                "tempo": data.get("tempo", 120),
                "notes": data.get("notes", []),
                "error": None,
            }

        except json.JSONDecodeError as e:
            print(f"[ERROR] {track_type} JSON parse error: {str(e)}")
            print(f"[ERROR] Response text (last 200 chars): {response.text[-200:] if response.text else 'None'}")
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Failed to parse response as JSON: {str(e)}",
            }
        except ZeroDivisionError:
            print(f"[ERROR] {track_type} ZeroDivisionError (google-genai bug)")
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Gemini API upload error for {track_type} (library bug)",
            }
        except Exception as e:
            print(f"[ERROR] {track_type} exception: {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "tempo": None,
                "notes": [],
                "error": f"Track transcription failed: {str(e)}",
            }


# シングルトンインスタンス
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """GeminiServiceのシングルトンを取得"""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
