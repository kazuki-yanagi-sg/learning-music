"""
apply_offset 純関数のユニットテスト（TDD: Red → Green → Refactor）

テスト仕様: docs/test-spec-timing-drums.md グループ1-2

apply_offset(time, offset) -> float: スカラー版
apply_offset_to_notes(notes, offset) -> list[dict]: ノートリスト版（補助）
"""
import pytest
from app.services.librosa_transcriber import apply_offset, apply_offset_to_notes
from app.services.basic_pitch_service import BasicPitchService


class TestApplyOffset:
    """apply_offset(time, offset) -> float のスカラー版テスト"""

    def test_apply_offset_subtracts(self):
        """time=2.05, offset=0.3 → 1.75"""
        result = apply_offset(2.05, 0.3)
        assert result == pytest.approx(1.75)

    def test_apply_offset_clamps_to_zero(self):
        """time=0.1, offset=0.3 → 0.0（負にしない）"""
        result = apply_offset(0.1, 0.3)
        assert result == 0.0

    def test_apply_offset_zero_offset_noop(self):
        """time=1.0, offset=0.0 → 1.0（変化なし）"""
        assert apply_offset(1.0, 0.0) == 1.0

    def test_first_note_aligns_near_zero(self):
        """offset補正→quantize_time を通した先頭ノートが 0 付近に揃う

        生 start=1.03, offset=1.0, tempo=150
        grid = 60/150 * 0.25 = 0.1 秒（16分音符）
        補正後 time = 0.03 → quantize → 0.0 または 0.1
        abs(quantized) <= grid を満たすこと
        """
        service = BasicPitchService()
        tempo = 150.0
        grid = 60.0 / tempo * 0.25  # 16分音符 = 0.1s

        raw_start = 1.03
        offset = 1.0
        corrected = apply_offset(raw_start, offset)  # 0.03
        quantized = service.quantize_time(corrected, tempo, resolution=0.25)

        assert abs(quantized) <= grid, f"quantized={quantized}, grid={grid}"

    def test_returns_float(self):
        """戻り値は float"""
        assert isinstance(apply_offset(1.0, 0.5), float)


class TestApplyOffsetToNotes:
    """apply_offset_to_notes(notes, offset) -> list[dict] のノートリスト版テスト"""

    def _note(self, start, end):
        return {"pitch": 60, "start": start, "end": end, "velocity": 80}

    def test_zero_offset_returns_copy(self):
        """offset=0.0 は値変化なし（コピーを返す）"""
        notes = [self._note(1.0, 2.0)]
        result = apply_offset_to_notes(notes, 0.0)
        assert result[0]["start"] == pytest.approx(1.0)
        assert result[0]["end"] == pytest.approx(2.0)

    def test_offset_shifts_all_notes(self):
        """全ノートがシフトされる"""
        notes = [self._note(1.0, 1.5), self._note(2.0, 2.5)]
        result = apply_offset_to_notes(notes, 1.0)
        assert result[0]["start"] == pytest.approx(0.0)
        assert result[1]["start"] == pytest.approx(1.0)

    def test_clamps_negative_to_zero(self):
        """offset > start の場合はクランプ"""
        notes = [self._note(0.1, 0.5)]
        result = apply_offset_to_notes(notes, 0.3)
        assert result[0]["start"] == 0.0

    def test_original_not_mutated(self):
        """元のノートリストは変更されない"""
        notes = [self._note(1.0, 2.0)]
        apply_offset_to_notes(notes, 0.5)
        assert notes[0]["start"] == 1.0

    def test_empty_list_returns_empty(self):
        """空リストは空を返す"""
        assert apply_offset_to_notes([], 0.5) == []


class TestExtractDrumsQuantizeOrder:
    """extract_drums のクオンタイズ順序が正しいことを確認するテスト

    修正2: offset を先に引いてからグリッドにスナップする正しい順序を保護する。
    offset がグリッド（16分音符）の非整数倍のとき、順序が変わると結果が変わる。

    設計:
      - offset が非整数倍の場合に「先 offset → 後 quantize」と「先 quantize → 後 offset」で
        結果が分かれるケースを確認する。
      - BPM=150, grid=0.1s, onset=0.42s, offset=0.07s のとき:
          先 offset: 0.42 - 0.07 = 0.35 → round(0.35/0.1)*0.1 = 0.4
          先 quantize: round(0.42/0.1)*0.1 = 0.4 - 0.07 = 0.33
        両者で異なるため、正しい順序（先 offset）の結果を期待値とする。
    """

    def _make_wav_with_onset(self, onset_time: float, sr: int = 44100) -> str:
        """指定時刻にキック音を持つ WAV ファイルを生成して返す"""
        import tempfile
        import soundfile as sf
        import numpy as np

        total_dur = max(onset_time + 0.3, 1.0)
        y = np.zeros(int(sr * total_dur), dtype=np.float32)
        # キック: 60Hz サイン波 + エンベロープ
        t_chunk = np.linspace(0, 0.1, int(sr * 0.1))
        kick = (np.sin(2 * np.pi * 60 * t_chunk) * np.exp(-t_chunk * 20) * 0.8).astype(np.float32)
        s = int(onset_time * sr)
        e = min(s + len(kick), len(y))
        y[s:e] += kick[:e - s]

        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        sf.write(tmp.name, y, sr)
        tmp.close()
        return tmp.name

    @pytest.mark.integration
    def test_quantize_uses_offset_as_grid_anchor(self):
        """クオンタイズのグリッド参照が offset を原点として揃う

        BPM=150, grid=0.1s, onset≈0.42s, offset=0.07s のとき
          正しい順序（先offset基準でquantize → offset後のstartはグリッド整数倍）:
            offset後の値 = round((0.42-0.07)/0.1)*0.1 = 0.3 → start=0.3
          誤った順序（先quantize → 後offset）:
            round(0.42/0.1)*0.1 = 0.4 → 0.4 - 0.07 = 0.33 → グリッドにズレ

        extract_drums に offset を渡して呼び出したとき、
        最終ノートの start が「offset を引いた後の値として」グリッド整数倍になることを確認。
        つまり: start % grid ≈ 0（grid = 0.1s）
        """
        import os
        import numpy as np
        from app.services.librosa_transcriber import LibrosaTranscriber

        onset = 0.42
        offset = 0.07
        tempo = 150.0
        grid = 60.0 / tempo * 0.25  # 0.1s

        wav_path = self._make_wav_with_onset(onset_time=onset)
        try:
            t = LibrosaTranscriber()
            result = t.extract_drums(wav_path, tempo=tempo, offset=offset)

            assert result["success"], f"extract_drums failed: {result.get('error')}"
            notes = result["notes"]
            assert len(notes) >= 1, "ノートが検出されなかった"

            first_start = notes[0]["start"]

            # offset を引いた後の値がグリッド整数倍かどうか（剰余が半グリッド未満）
            remainder = first_start % grid
            # 周期の境界考慮: 剰余が grid/2 より大きければ grid から引く
            aligned_error = min(remainder, grid - remainder)

            assert aligned_error < grid * 0.1, (
                f"ノートが拍グリッドにスナップされていない: "
                f"start={first_start:.3f}s, grid={grid:.3f}s, "
                f"remainder={remainder:.4f}s (grid の {remainder/grid*100:.0f}%). "
                f"先 offset → 後 quantize なら start はグリッド整数倍になるはず"
            )
        finally:
            os.unlink(wav_path)
