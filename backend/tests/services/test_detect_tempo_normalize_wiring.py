"""
detect_tempo 内の normalize_tempo 配線テスト（TDD: Red → Green）

設計書 §2.2: 「検出 tempo に normalize_tempo を適用して110-185帯へ正規化（原因2の二次防御）」

テスト対象: LibrosaTranscriber.detect_tempo が返す TempoInfo.tempo が
           normalize_tempo 済みであること（librosaのモックで制御）

Red フェーズ: detect_tempo が normalize_tempo を呼ばない場合に失敗するテスト。
"""
import numpy as np
import pytest
from unittest.mock import MagicMock, patch
from app.services.librosa_transcriber import LibrosaTranscriber, normalize_tempo


class TestDetectTempoNormalizesResult:
    """detect_tempo が返す tempo が normalize_tempo 済みであることを確認"""

    def _mock_librosa(self, raw_bpm: float, n_beats: int = 4, sr: int = 44100):
        """librosa の beat_track / frames_to_time をモックして raw_bpm を返す"""
        mock_lib = MagicMock()
        mock_lib.load.return_value = (np.zeros(sr, dtype=np.float32), sr)
        mock_lib.beat.beat_track.return_value = (
            np.array([raw_bpm]),
            np.arange(n_beats) * int(sr * 60.0 / raw_bpm / 512),
        )
        beat_times = np.arange(n_beats) * (60.0 / raw_bpm)
        mock_lib.frames_to_time.return_value = beat_times
        return mock_lib

    def test_detect_tempo_normalizes_half_bpm(self):
        """librosa が半テンポ 75.0 を返すとき detect_tempo は 150.0 を返す（normalize_tempo 適用）

        現状 Red: detect_tempo 内に normalize_tempo がなければ 75.0 のまま返る。
        """
        import app.services.librosa_transcriber as lt_mod

        raw_bpm = 75.0  # アニソン帯 110-185 より低い半テンポ
        mock_lib = self._mock_librosa(raw_bpm)

        original_lib = lt_mod.librosa
        lt_mod.librosa = mock_lib
        try:
            t = LibrosaTranscriber()
            result = t.detect_tempo("/dummy.wav")

            # normalize_tempo(75.0) = 150.0（×2で帯域内）
            expected = normalize_tempo(raw_bpm)
            assert result.tempo == pytest.approx(expected), (
                f"detect_tempo が normalize_tempo を適用していない: "
                f"got={result.tempo}, expected={expected} (raw={raw_bpm})"
            )
        finally:
            lt_mod.librosa = original_lib

    def test_detect_tempo_normalizes_double_bpm(self):
        """librosa が倍テンポ 320.0 を返すとき detect_tempo は 160.0 を返す"""
        import app.services.librosa_transcriber as lt_mod

        raw_bpm = 320.0  # 帯域外の倍テンポ
        mock_lib = self._mock_librosa(raw_bpm)

        original_lib = lt_mod.librosa
        lt_mod.librosa = mock_lib
        try:
            t = LibrosaTranscriber()
            result = t.detect_tempo("/dummy.wav")

            expected = normalize_tempo(raw_bpm)  # 160.0
            assert result.tempo == pytest.approx(expected), (
                f"倍テンポが正規化されていない: got={result.tempo}, expected={expected}"
            )
        finally:
            lt_mod.librosa = original_lib

    def test_detect_tempo_keeps_in_range_bpm(self):
        """librosa が帯域内 150.0 を返すとき detect_tempo はそのまま 150.0 を返す"""
        import app.services.librosa_transcriber as lt_mod

        raw_bpm = 150.0  # 帯域内（変化なし）
        mock_lib = self._mock_librosa(raw_bpm)

        original_lib = lt_mod.librosa
        lt_mod.librosa = mock_lib
        try:
            t = LibrosaTranscriber()
            result = t.detect_tempo("/dummy.wav")

            assert result.tempo == pytest.approx(150.0), (
                f"帯域内テンポが変化した: got={result.tempo}"
            )
        finally:
            lt_mod.librosa = original_lib

    def test_detect_tempo_result_is_float(self):
        """detect_tempo が返す tempo は float（丸められていない）"""
        import app.services.librosa_transcriber as lt_mod

        # 173.5 は 110-185 帯域内なので normalize 後も 173.5 のまま
        raw_bpm = 173.5
        mock_lib = self._mock_librosa(raw_bpm)

        original_lib = lt_mod.librosa
        lt_mod.librosa = mock_lib
        try:
            t = LibrosaTranscriber()
            result = t.detect_tempo("/dummy.wav")

            assert isinstance(result.tempo, float), f"tempo が float でない: {type(result.tempo)}"
            assert result.tempo == pytest.approx(173.5)
        finally:
            lt_mod.librosa = original_lib

    def test_detect_tempo_offset_is_beat_times_0(self):
        """detect_tempo が返す offset は beat_times[0] と一致する（第1拍オフセット）"""
        import app.services.librosa_transcriber as lt_mod

        raw_bpm = 160.0
        # beat_times[0] = 0.8 秒（イントロ無音分）
        mock_lib = MagicMock()
        mock_lib.load.return_value = (np.zeros(44100, dtype=np.float32), 44100)
        mock_lib.beat.beat_track.return_value = (
            np.array([raw_bpm]),
            np.array([int(44100 * 0.8 / 512), int(44100 * 1.175 / 512)]),
        )
        mock_lib.frames_to_time.return_value = np.array([0.8, 1.175])

        original_lib = lt_mod.librosa
        lt_mod.librosa = mock_lib
        try:
            t = LibrosaTranscriber()
            result = t.detect_tempo("/dummy.wav")

            assert result.offset == pytest.approx(0.8, abs=0.01), (
                f"offset が beat_times[0] と一致しない: got={result.offset}"
            )
        finally:
            lt_mod.librosa = original_lib
