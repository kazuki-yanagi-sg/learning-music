"""
transcribe_audio の offset 引数配線テスト（TDD: Red → Green）

設計書 §3: 「有音程トラック（bass/other）は Basic Pitch の note_events の
クオンタイズ前（basic_pitch_service.py:228-230 相当）に apply_offset を通す」

対象: BasicPitchService.transcribe_audio(audio_path, quantize=True, offset=0.0)
     offset 引数を受け取り、クオンタイズ前の時刻に apply_offset を適用する。

Red フェーズ: offset 引数が存在しない / 適用されない場合に失敗するテスト。
"""
import pytest
from unittest.mock import patch, MagicMock


class TestTranscribeAudioOffset:
    """transcribe_audio の offset 引数が正しく動作することを確認"""

    def _make_service(self):
        from app.services.basic_pitch_service import BasicPitchService
        return BasicPitchService()

    def _mock_predict_single_note(self, start: float, end: float, pitch: int = 60):
        """単一ノートを返す predict モック"""
        mock_predict = MagicMock(return_value=(
            None,
            None,
            [(start, end, pitch, 0.9)],  # (start, end, pitch, velocity)
        ))
        return mock_predict

    def test_transcribe_audio_accepts_offset_argument(self):
        """transcribe_audio が offset=0.5 を受け取れる（シグネチャ確認）

        現状 Red: offset 引数が存在しなければ TypeError になる。
        """
        service = self._make_service()
        # offset 引数が存在するかチェック（ファイルは存在しなくてよい→not found で返る）
        try:
            result = service.transcribe_audio("/nonexistent.wav", offset=0.5)
            # success=False（ファイルなし）でも offset 引数が受け付けられれば OK
            assert result["success"] is False
        except TypeError as e:
            pytest.fail(f"transcribe_audio が offset 引数を受け取れない: {e}")

    def test_transcribe_audio_offset_shifts_note_start(self):
        """offset=1.0 のとき、raw start=1.03 のノートが start≈0.03 に補正される

        apply_offset(1.03, 1.0) = 0.03 → quantize_time で 0.0 または grid に揃う
        """
        service = self._make_service()
        tempo = 150.0  # grid=60/150*0.25=0.1s

        # predict をモック: start=1.03, end=1.5 の単一ノート
        mock_predict = self._mock_predict_single_note(start=1.03, end=1.5, pitch=60)

        with patch("app.services.basic_pitch_service.predict", mock_predict), \
             patch("app.services.basic_pitch_service.ICASSP_2022_MODEL_PATH", "dummy"), \
             patch.object(service, "_ensure_model"), \
             patch.object(service, "detect_tempo", return_value=(tempo, [])):

            # 実際にファイルを読まないよう audio_file.exists() をパッチ
            with patch("pathlib.Path.exists", return_value=True), \
                 patch("pathlib.Path.stat") as mock_stat:
                mock_stat.return_value.st_size = 1024  # 空でない

                result = service.transcribe_audio("/dummy.wav", offset=1.0)

        assert result["success"] is True, f"transcription failed: {result.get('error')}"
        notes = result["notes"]
        assert len(notes) >= 1, "ノートが0件"

        # offset 補正後の start は 1.0 より小さいはず
        first_start = notes[0]["start"]
        assert first_start < 1.0, (
            f"offset 補正が適用されていない: start={first_start} (expected < 1.0)"
        )

    def test_transcribe_audio_zero_offset_unchanged(self):
        """offset=0.0 のとき、ノートは変化しない（apply_offset(t, 0.0) = t）"""
        service = self._make_service()
        tempo = 120.0

        mock_predict = self._mock_predict_single_note(start=1.0, end=1.5, pitch=60)

        with patch("app.services.basic_pitch_service.predict", mock_predict), \
             patch("app.services.basic_pitch_service.ICASSP_2022_MODEL_PATH", "dummy"), \
             patch.object(service, "_ensure_model"), \
             patch.object(service, "detect_tempo", return_value=(tempo, [])):

            with patch("pathlib.Path.exists", return_value=True), \
                 patch("pathlib.Path.stat") as mock_stat:
                mock_stat.return_value.st_size = 1024

                result_no_offset = service.transcribe_audio("/dummy.wav", offset=0.0)
                result_default = service.transcribe_audio("/dummy.wav")

        # offset=0.0 とデフォルト（offset 未指定）が同じ結果
        assert result_no_offset["notes"] == result_default["notes"]
