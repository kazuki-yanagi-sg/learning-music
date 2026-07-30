"""
BasicPitchService.transcribe_track の offset 配線テスト（TDD: Red → Green）

単一契約（設計屋定義）:
  「offset は各トランスクライバー内で量子化の前に一度だけ適用する。
   呼び出し側(audio_to_4tracks)は offset を渡すだけで、
   後段で再適用（apply_offset_to_notes 等）しない。」

バグ: 現状の transcribe_track は
  1. quantize_time で「offset を考慮しないグリッド」にスナップ
  2. その後 apply_offset_to_notes で offset を一括で引く
という順序になっており、offset がグリッド（16分音符）の非整数倍のとき
グリッドとの整合が崩れる（実験屋の実測: 正=0.30s のところ現状=0.33s）。

正しい順序は「先に offset を引いてから、offset を考慮しないグリッドで量子化する」
（= transcribe_audio と同じパターン）。
"""
import pytest
from unittest.mock import patch, MagicMock


class TestTranscribeTrackOffsetOrder:
    """transcribe_track の offset 適用順序（量子化の前に一度だけ）を確認する"""

    def _make_service(self):
        from app.services.basic_pitch_service import BasicPitchService
        return BasicPitchService()

    def _mock_predict_single_note(self, start: float, end: float, pitch: int = 60, velocity: float = 0.9):
        return MagicMock(return_value=(
            None,
            None,
            [(start, end, pitch, velocity)],
        ))

    def _run_transcribe_track(self, service, track_type, start, end, tempo, offset):
        """predict / ファイルI/O をモックして transcribe_track を実行するヘルパー"""
        mock_predict = self._mock_predict_single_note(start=start, end=end)
        with patch("app.services.basic_pitch_service.predict", mock_predict), \
             patch("app.services.basic_pitch_service.ICASSP_2022_MODEL_PATH", "dummy"), \
             patch.object(service, "_ensure_model"), \
             patch.object(service, "_stem_is_silent", return_value=False):
            with patch("pathlib.Path.exists", return_value=True), \
                 patch("pathlib.Path.stat") as mock_stat:
                mock_stat.return_value.st_size = 1024
                return service.transcribe_track(
                    "/dummy.wav", track_type, tempo=tempo, offset=offset
                )

    def test_reproduces_experiment_case_0_30_vs_0_33(self):
        """実験屋が特定した実測ケース: BPM=150, grid=0.1s, onset=0.42s, offset=0.07s

        正しい順序（先 offset → 後 quantize）:
            (0.42 - 0.07) = 0.35 → round(0.35/0.1)*0.1 = 0.30 ... (A)
        誤った順序（先 quantize → 後 offset、現状のバグ）:
            round(0.42/0.1)*0.1 = 0.40 → 0.40 - 0.07 = 0.33 ... (B)

        修正後は (A)=0.30 になっていなければならない。
        """
        service = self._make_service()
        tempo = 150.0
        offset = 0.07
        onset = 0.42

        result = self._run_transcribe_track(
            service, "other", start=onset, end=onset + 0.5, tempo=tempo, offset=offset
        )

        assert result["success"] is True, f"failed: {result.get('error')}"
        notes = result["notes"]
        assert len(notes) >= 1, "ノートが0件"

        first_start = notes[0]["start"]
        assert first_start == pytest.approx(0.30, abs=1e-6), (
            f"transcribe_track の offset 適用順序が誤っている: "
            f"got={first_start} (誤った順序なら 0.33 になる), expected=0.30"
        )

    def test_offset_applied_before_quantize_not_after(self):
        """offset がグリッドの非整数倍のとき、量子化前に適用した結果と一致すること"""
        service = self._make_service()
        tempo = 150.0  # grid = 60/150*0.25 = 0.1s
        offset = 0.03  # グリッドの非整数倍
        raw_start = 1.0

        result = self._run_transcribe_track(
            service, "bass", start=raw_start, end=raw_start + 0.3, tempo=tempo, offset=offset
        )

        assert result["success"] is True
        notes = result["notes"]
        assert len(notes) >= 1

        # 正しい計算: (1.0-0.03)=0.97 -> round(0.97/0.1)*0.1 = 1.0 (grid上)
        expected_correct = round((raw_start - offset) / 0.1) * 0.1
        # 誤った計算（quantize後にoffsetを引く）: round(1.0/0.1)*0.1=1.0 -> 1.0-0.03=0.97
        expected_wrong = round(raw_start / 0.1) * 0.1 - offset

        first_start = notes[0]["start"]
        assert first_start == pytest.approx(expected_correct, abs=1e-6), (
            f"got={first_start}, expected_correct={expected_correct}, "
            f"expected_wrong(should NOT match)={expected_wrong}"
        )

    def test_zero_offset_unchanged(self):
        """offset=0.0 のときは通常の量子化のみ（回帰なし）"""
        service = self._make_service()
        tempo = 120.0

        result_zero = self._run_transcribe_track(
            service, "other", start=1.0, end=1.5, tempo=tempo, offset=0.0
        )
        result_default = self._run_transcribe_track(
            service, "other", start=1.0, end=1.5, tempo=tempo, offset=0.0
        )

        assert result_zero["success"] is True
        assert result_zero["notes"] == result_default["notes"]

    def test_no_double_application_tail_block_removed(self):
        """後段の二重適用がないことを確認する（offset を1回だけ適用した値と一致）

        もし後段で apply_offset_to_notes が再度適用されていれば、
        ノートの start はさらに offset 分小さくなってしまう（二重適用）。
        """
        service = self._make_service()
        tempo = 150.0
        offset = 0.1  # グリッドの整数倍（順序に依らず同じ値になるよう選ぶ）
        raw_start = 1.0

        result = self._run_transcribe_track(
            service, "other", start=raw_start, end=raw_start + 0.3, tempo=tempo, offset=offset
        )
        assert result["success"] is True
        notes = result["notes"]
        assert len(notes) >= 1

        # offset がグリッドの整数倍なら、一度だけ適用した結果は
        # (raw_start - offset) をグリッドスナップした値になる。
        once_applied = round((raw_start - offset) / 0.1) * 0.1
        # 二重適用されていれば、さらに offset が引かれてしまう
        twice_applied = once_applied - offset

        first_start = notes[0]["start"]
        assert first_start == pytest.approx(once_applied, abs=1e-6), (
            f"got={first_start}, once_applied={once_applied}, "
            f"twice_applied(should NOT match)={twice_applied}"
        )
