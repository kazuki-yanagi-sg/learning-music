"""
app/models のpydanticモデルの単体テスト

外部依存（librosa / basic-pitch 等）を一切読み込まない純粋なモデルテスト。
TranscriptionResult は basic_pitch_service の戻り値 dict と相互変換できることを保証する。
"""
from app.models import TranscriptionResult


class TestTranscriptionResultConstruction:
    """モデルの構築とデフォルト値"""

    def test_success_result(self):
        # 成功ケース: tempo / notes を持ち error は None
        notes = [{"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 100, "confidence": 0.9}]
        result = TranscriptionResult(success=True, tempo=120, notes=notes, error=None)
        assert result.success is True
        assert result.tempo == 120
        assert result.notes == notes
        assert result.error is None

    def test_failure_result(self):
        # 失敗ケース: tempo / notes は空で error にメッセージ
        result = TranscriptionResult(
            success=False, tempo=None, notes=[], error="Audio file not found"
        )
        assert result.success is False
        assert result.tempo is None
        assert result.notes == []
        assert result.error == "Audio file not found"

    def test_defaults(self):
        # success のみ指定したときの安全なデフォルト
        result = TranscriptionResult(success=True)
        assert result.tempo is None
        assert result.notes == []
        assert result.error is None


class TestTranscriptionResultRoundTrip:
    """既存契約の dict との相互変換（挙動不変の保証）"""

    def test_from_dict_matches_existing_contract(self):
        # basic_pitch_service が現在返している成功 dict
        src = {
            "success": True,
            "tempo": 140,
            "notes": [{"pitch": 64, "start": 0.0, "end": 0.25, "velocity": 90, "confidence": 0.7}],
            "error": None,
        }
        result = TranscriptionResult.from_dict(src)
        assert result.success == src["success"]
        assert result.tempo == src["tempo"]
        assert result.notes == src["notes"]
        assert result.error == src["error"]

    def test_to_dict_matches_existing_contract(self):
        # 失敗時の dict キー構成（success/tempo/notes/error）が完全一致すること
        result = TranscriptionResult(
            success=False, tempo=None, notes=[], error="Track transcription failed"
        )
        as_dict = result.to_dict()
        assert as_dict == {
            "success": False,
            "tempo": None,
            "notes": [],
            "error": "Track transcription failed",
        }

    def test_round_trip_preserves_value(self):
        # dict → model → dict で元の dict に戻る
        src = {
            "success": True,
            "tempo": 128,
            "notes": [
                {"pitch": 36, "start": 0.0, "end": 0.05, "velocity": 110, "confidence": 0.95},
                {"pitch": 38, "start": 0.5, "end": 0.55, "velocity": 100, "confidence": 0.8},
            ],
            "error": None,
        }
        assert TranscriptionResult.from_dict(src).to_dict() == src


class TestTranscriptionResultMigrationSafety:
    """basic_pitch_service.transcribe_track の戻り値を TranscriptionResult 経由に
    置き換えても「キー・値・型・キー順」が完全一致することの保証（挙動不変）。

    transcribe_track が組み立てる値（numpy 由来を含む）が pydantic を通っても
    legacy の raw dict と == かつ同型であることを担保する。
    """

    def _build_via_model(self, success, tempo, notes, error):
        # 実装側と同じ経路（TranscriptionResult(...).to_dict()）で組み立てる
        return TranscriptionResult(
            success=success, tempo=tempo, notes=notes, error=error
        ).to_dict()

    def test_success_path_matches_legacy_dict(self):
        import numpy as np

        # transcribe_track と同じ作り方で値を生成する
        # tempo: round(np.float64) は Python int を返す
        tempo = round(np.float64(140.4))
        # notes: float(event[i]) してから round(..., n) するので Python float
        velocity_raw = float(np.float32(0.9))
        notes = [
            {
                "pitch": int(np.float64(64.0)),
                "start": round(float(np.float64(0.123456)), 3),
                "end": round(float(np.float64(0.5)), 3),
                "velocity": min(127, max(1, int(velocity_raw * 127))),
                "confidence": round(velocity_raw, 2),
            }
        ]

        # legacy（旧実装）の raw dict
        legacy = {"success": True, "tempo": tempo, "notes": notes, "error": None}
        # 新実装の経路
        migrated = self._build_via_model(True, tempo, notes, None)

        # 値の一致
        assert migrated == legacy
        # キー順の一致
        assert list(migrated.keys()) == list(legacy.keys())
        # tempo の型一致（int のまま）
        assert type(migrated["tempo"]) is type(legacy["tempo"])
        # notes 内の各値の型一致
        ln, mn = legacy["notes"][0], migrated["notes"][0]
        assert list(mn.keys()) == list(ln.keys())
        for key in ln:
            assert type(mn[key]) is type(ln[key]), key
            assert mn[key] == ln[key]

    def test_failure_path_matches_legacy_dict(self):
        # 失敗パス（ファイル未検出 / 空ファイル / 例外）の dict 構成が一致すること
        legacy = {
            "success": False,
            "tempo": None,
            "notes": [],
            "error": "Track transcription failed: boom",
        }
        migrated = self._build_via_model(
            False, None, [], "Track transcription failed: boom"
        )
        assert migrated == legacy
        assert list(migrated.keys()) == list(legacy.keys())
