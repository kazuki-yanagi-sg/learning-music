"""
音声→MIDI変換（Basic Pitch）結果のpydanticモデル

basic_pitch_service.transcribe_track / transcribe_audio が返す dict の契約を
型として明示するためのモデル。既存の consumer（magenta.py 等）は当面 dict 添字
アクセスのままなので、dict との相互変換ヘルパー（from_dict / to_dict）を提供し、
挙動を変えずに段階的な pydantic 化を進められるようにする。
"""
from pydantic import BaseModel, Field


class TempoInfo(BaseModel):
    """librosa beat_track によるテンポ検出結果

    Attributes:
        tempo: 検出テンポ（BPM）。float で管理し round() を避ける
        beat_times: ビート位置の時間配列（秒）
        offset: 第1拍の時刻（クオンタイズ原点）。0.0 はオフセットなし
    """

    tempo: float
    beat_times: list[float] = Field(default_factory=list)
    offset: float = 0.0


class TranscriptionResult(BaseModel):
    """Basic Pitch による変換結果

    Attributes:
        success: 変換に成功したか
        tempo: 検出テンポ（BPM）。失敗時や未検出時は None
        notes: ノート情報の辞書リスト（pitch/start/end/velocity/confidence）
        error: 失敗時のエラーメッセージ（成功時は None）
    """

    success: bool
    # float で貫通させ round() しない（フロントは number 型で問題なし）
    tempo: float | None = None
    # まずは互換重視で list[dict]。NoteData 化は将来ステップで検討する。
    notes: list[dict] = Field(default_factory=list)
    error: str | None = None

    @classmethod
    def from_dict(cls, data: dict) -> "TranscriptionResult":
        """既存サービスが返す dict からモデルを構築する"""
        return cls(
            success=data["success"],
            tempo=data.get("tempo"),
            notes=data.get("notes", []),
            error=data.get("error"),
        )

    def to_dict(self) -> dict:
        """既存契約と同じキー構成の dict に変換する（consumer 非破壊）"""
        return {
            "success": self.success,
            "tempo": self.tempo,
            "notes": self.notes,
            "error": self.error,
        }
