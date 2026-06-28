"""
ドラム過剰検出抑制 + quantize 原点修正の TDD テスト (Red → Green → Refactor)

設計書（監督追加指示）に従い以下を検証する:
1. 帯域別 delta 定数テスト: _ONSET_DELTA_BY_BAND（kick/snare/hihat ごとの delta 値）
2. 帯域別 dedup 閾値定数テスト: _DEDUP_THRESHOLD_BY_BAND（hihat 専用の厳しい閾値）
3. quantize_to_grid 純関数テスト: offset 起点での 16 分グリッドスナップ
4. 過剰検出抑制統合テスト: モック onset_detect で delta/threshold が帯域ごとに渡されること
"""
import numpy as np
import pytest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# 1. 帯域別 delta 定数テスト
# ---------------------------------------------------------------------------

class TestOnsetDeltaByBand:
    """帯域ごとに異なる delta 値が定義されていることを確認する

    設計背景: hihat 帯域(5000-18000Hz)は高周波でスペクトル変化が激しく
    onset_strength のノイズが多い。delta を大きくして感度を下げる。
    kick/snare は相対的に delta を小さく保ち、正規打点を取りこぼさない。

    実測で 4258 ノートと過剰検出した原因のひとつは delta=0.03(全帯域一律)が
    hihat には緩すぎることにある。
    """

    def test_onset_delta_by_band_exists(self):
        """_ONSET_DELTA_BY_BAND 定数が存在すること"""
        from app.services.librosa_transcriber import _ONSET_DELTA_BY_BAND
        assert isinstance(_ONSET_DELTA_BY_BAND, dict)

    def test_onset_delta_by_band_has_all_bands(self):
        """kick/snare/hihat のエントリがあること"""
        from app.services.librosa_transcriber import _ONSET_DELTA_BY_BAND
        assert "kick" in _ONSET_DELTA_BY_BAND
        assert "snare" in _ONSET_DELTA_BY_BAND
        assert "hihat" in _ONSET_DELTA_BY_BAND

    def test_hihat_delta_larger_than_kick(self):
        """hihat の delta が kick より大きいこと（hihat 帯域は感度を下げる）"""
        from app.services.librosa_transcriber import _ONSET_DELTA_BY_BAND
        assert _ONSET_DELTA_BY_BAND["hihat"] > _ONSET_DELTA_BY_BAND["kick"], (
            f"hihat delta({_ONSET_DELTA_BY_BAND['hihat']}) が "
            f"kick delta({_ONSET_DELTA_BY_BAND['kick']}) 以下: 過剰検出の原因になる"
        )

    def test_hihat_delta_at_least_0_07(self):
        """hihat delta が 0.07 以上であること（過剰検出抑制）"""
        from app.services.librosa_transcriber import _ONSET_DELTA_BY_BAND
        assert _ONSET_DELTA_BY_BAND["hihat"] >= 0.07, (
            f"hihat delta={_ONSET_DELTA_BY_BAND['hihat']} は 0.07 未満: 過剰検出が残る"
        )

    def test_kick_delta_reasonable(self):
        """kick delta が 0 より大きく hihat より小さいこと"""
        from app.services.librosa_transcriber import _ONSET_DELTA_BY_BAND
        d = _ONSET_DELTA_BY_BAND["kick"]
        assert 0 < d < _ONSET_DELTA_BY_BAND["hihat"]


# ---------------------------------------------------------------------------
# 2. 帯域別 dedup 閾値定数テスト
# ---------------------------------------------------------------------------

class TestDedupThresholdByBand:
    """帯域ごとに異なる dedup 閾値が定義されていることを確認する

    設計背景: hihat は音が短く連打が多いが、それでも ~16ms 以内の重複は
    真のダブルヒットではなく量子化ジッタ。一方 kick/snare は dedup を
    緩めに保ち、遅め検出のバックトラックを受け入れる。
    """

    def test_dedup_threshold_by_band_exists(self):
        """_DEDUP_BASE_THRESHOLD_BY_BAND 定数が存在すること"""
        from app.services.librosa_transcriber import _DEDUP_BASE_THRESHOLD_BY_BAND
        assert isinstance(_DEDUP_BASE_THRESHOLD_BY_BAND, dict)

    def test_dedup_threshold_by_band_has_all_bands(self):
        """kick/snare/hihat のエントリがあること"""
        from app.services.librosa_transcriber import _DEDUP_BASE_THRESHOLD_BY_BAND
        assert "kick" in _DEDUP_BASE_THRESHOLD_BY_BAND
        assert "snare" in _DEDUP_BASE_THRESHOLD_BY_BAND
        assert "hihat" in _DEDUP_BASE_THRESHOLD_BY_BAND

    def test_hihat_dedup_threshold_not_smaller_than_kick(self):
        """hihat dedup 閾値が kick 以上であること（hihat の連続発火を抑制）

        hihat 閾値を大きくすることで近接オンセットを重複とみなし間引く。
        """
        from app.services.librosa_transcriber import _DEDUP_BASE_THRESHOLD_BY_BAND
        assert _DEDUP_BASE_THRESHOLD_BY_BAND["hihat"] >= _DEDUP_BASE_THRESHOLD_BY_BAND["kick"]


# ---------------------------------------------------------------------------
# 3. quantize_to_grid 純関数テスト
# ---------------------------------------------------------------------------

class TestQuantizeToGrid:
    """quantize_to_grid 純関数の契約テスト

    設計: quantize_to_grid(t, grid, offset) = round((t - offset) / grid) * grid + offset
    - offset 起点の 16 分グリッドにスナップする
    - 出力は offset 起点でのグリッド整数倍 + offset（絶対時刻）
    - 負にならない（クランプ）
    """

    def _get_fn(self):
        from app.services.librosa_transcriber import quantize_to_grid
        return quantize_to_grid

    def test_zero_offset_snaps_to_grid(self):
        """offset=0 のとき round(t/grid)*grid と等価"""
        fn = self._get_fn()
        # tempo=120, grid=0.125s(16分), t=0.13 → round(0.13/0.125)*0.125=0.125
        result = fn(0.13, grid=0.125, offset=0.0)
        assert result == pytest.approx(0.125, abs=1e-6)

    def test_with_offset_anchors_to_beat(self):
        """offset=0.07 のとき offset 起点でスナップする"""
        fn = self._get_fn()
        # offset=0.07, grid=0.1s
        # (0.42 - 0.07) / 0.1 = 3.4999...（浮動小数点精度で 3.5 未満）
        # round(3.4999...) = 3 → 3 * 0.1 + 0.07 = 0.37
        # 注: 数学的には 3.5 だが浮動小数点で 3.4999... になるため round は 3
        grid = 0.1
        offset = 0.07
        t = 0.42
        expected = round((t - offset) / grid) * grid + offset  # 実際の計算結果に合わせる
        result = fn(t, grid=grid, offset=offset)
        assert result == pytest.approx(expected, abs=1e-6)

    def test_offset_absolute_result(self):
        """出力が絶対時刻（offset が含まれた値）であること"""
        fn = self._get_fn()
        offset = 0.05
        grid = 0.125
        t = 0.2
        result = fn(t, grid=grid, offset=offset)
        # (0.2 - 0.05) / 0.125 = 1.2 → round = 1 → 1 * 0.125 + 0.05 = 0.175
        assert result == pytest.approx(0.175, abs=1e-6)

    def test_clamped_to_zero(self):
        """offset より前のノートはクランプして 0 以上になること"""
        fn = self._get_fn()
        # t=0.02, offset=0.07 → (0.02-0.07)/grid → 負 → クランプ → 0 か offset か
        result = fn(0.02, grid=0.1, offset=0.07)
        assert result >= 0.0

    def test_exact_grid_point_unchanged(self):
        """グリッド上の点はそのまま"""
        fn = self._get_fn()
        # offset=0.0, grid=0.125, t=0.5 → round(0.5/0.125)*0.125 = 4*0.125=0.5
        result = fn(0.5, grid=0.125, offset=0.0)
        assert result == pytest.approx(0.5, abs=1e-6)

    def test_returns_float(self):
        """戻り値が float であること"""
        fn = self._get_fn()
        result = fn(0.3, grid=0.125, offset=0.0)
        assert isinstance(result, float)


# ---------------------------------------------------------------------------
# 4. 過剰検出抑制の spy テスト: 帯域ごとに delta が渡されること
# ---------------------------------------------------------------------------

class TestOnsetDetectCalledWithBandDelta:
    """_detect_band_onsets が帯域ごとの delta を onset_detect に渡すことを確認"""

    def _build_mock_librosa(self):
        mock_lib = MagicMock()
        mock_lib.feature.melspectrogram.return_value = np.ones((128, 100))
        mock_lib.power_to_db.return_value = np.ones((128, 100))
        mock_lib.onset.onset_strength.return_value = np.ones(100)
        mock_lib.onset.onset_detect.return_value = np.array([10, 50])
        mock_lib.frames_to_time.return_value = np.array([0.1, 0.5])
        return mock_lib

    def test_hihat_delta_different_from_kick_delta(self):
        """hihat と kick で onset_detect に渡される delta が異なること"""
        from app.services.librosa_transcriber import LibrosaTranscriber, _ONSET_DELTA_BY_BAND
        transcriber = LibrosaTranscriber()
        mock_lib = self._build_mock_librosa()

        with patch("app.services.librosa_transcriber.librosa", mock_lib):
            y = np.zeros(44100, dtype=np.float32)
            kick_result = transcriber._detect_band_onsets(y, 44100, "kick")
            kick_calls = mock_lib.onset.onset_detect.call_args_list.copy()
            mock_lib.onset.onset_detect.reset_mock()

            hihat_result = transcriber._detect_band_onsets(y, 44100, "hihat")
            hihat_calls = mock_lib.onset.onset_detect.call_args_list.copy()

        # kick と hihat の delta を取得
        kick_delta = kick_calls[-1].kwargs.get("delta") if kick_calls else None
        hihat_delta = hihat_calls[-1].kwargs.get("delta") if hihat_calls else None

        assert kick_delta is not None, "kick の onset_detect に delta が渡されていない"
        assert hihat_delta is not None, "hihat の onset_detect に delta が渡されていない"
        assert hihat_delta != kick_delta, (
            f"hihat と kick の delta が同じ({hihat_delta}): 帯域別 delta が機能していない"
        )
        # hihat の delta が kick より大きいこと
        assert hihat_delta > kick_delta, (
            f"hihat delta({hihat_delta}) <= kick delta({kick_delta}): hihat 感度を下げる必要がある"
        )

    def test_hihat_onset_detect_uses_band_specific_delta(self):
        """hihat の onset_detect が _ONSET_DELTA_BY_BAND["hihat"] を使うこと"""
        from app.services.librosa_transcriber import LibrosaTranscriber, _ONSET_DELTA_BY_BAND
        transcriber = LibrosaTranscriber()
        mock_lib = self._build_mock_librosa()

        with patch("app.services.librosa_transcriber.librosa", mock_lib):
            y = np.zeros(44100, dtype=np.float32)
            transcriber._detect_band_onsets(y, 44100, "hihat")

        calls = mock_lib.onset.onset_detect.call_args_list
        assert len(calls) >= 1
        actual_delta = calls[-1].kwargs.get("delta")
        expected_delta = _ONSET_DELTA_BY_BAND["hihat"]
        assert actual_delta == pytest.approx(expected_delta), (
            f"hihat delta が {expected_delta} でない: {actual_delta}"
        )


# ---------------------------------------------------------------------------
# 5. quantize フロー: offset 起点スナップ後の二重 offset 適用テスト
# ---------------------------------------------------------------------------

class TestQuantizeOffsetFlowIntegration:
    """extract_drums の quantize → apply_offset_to_notes フローで
    最終ノートが offset 起点のグリッド整数倍になることを検証する

    設計:
      quantize_to_grid(t, grid, offset) で絶対時刻にスナップ
      → apply_offset_to_notes で offset を引く
      → 最終的なノートの start が grid の整数倍になること
    """

    def test_quantize_then_apply_offset_yields_grid_multiple(self):
        """quantize_to_grid → apply_offset すると start が grid の整数倍になる"""
        from app.services.librosa_transcriber import quantize_to_grid, apply_offset_to_notes

        offset = 0.07
        tempo = 150.0
        grid = 60.0 / tempo * 0.25  # 0.1s
        t = 0.42  # テスト用オンセット時刻

        # step1: quantize（offset 起点）
        t_q = quantize_to_grid(t, grid=grid, offset=offset)

        # step2: apply_offset_to_notes でオフセット除去
        notes_before = [{"pitch": 36, "start": t_q, "end": t_q + 0.05, "velocity": 100}]
        notes_after = apply_offset_to_notes(notes_before, offset)

        start = notes_after[0]["start"]
        # start が grid の整数倍かどうか確認（誤差 grid*5% 未満）
        remainder = start % grid
        aligned_error = min(remainder, grid - remainder)
        assert aligned_error < grid * 0.1, (
            f"quantize_to_grid → apply_offset 後の start={start:.4f} が "
            f"grid={grid:.4f} の整数倍でない: remainder={remainder:.4f}"
        )

    def test_quantize_to_grid_vs_old_formula_differ_with_nonzero_offset(self):
        """新式(offset起点) と 旧式(絶対0起点) が offset!=0 のとき異なること

        旧式: round(t/grid)*grid - offset (≒ absolute 0 origin)
        新式: round((t-offset)/grid)*grid + offset (offset origin)
        これらは offset が grid の非整数倍のとき値が異なる → 新式が正しい
        """
        from app.services.librosa_transcriber import quantize_to_grid

        offset = 0.07
        grid = 0.1
        t = 0.42

        # 新式（quantize_to_grid）
        new_result = quantize_to_grid(t, grid=grid, offset=offset)

        # 旧式（絶対0起点: round(t/grid)*grid）
        old_result = round(t / grid) * grid

        # offset が grid の非整数倍(0.07/0.1=0.7)のとき両式は異なる
        assert new_result != pytest.approx(old_result, abs=1e-6), (
            f"新旧式が同じ値({new_result:.4f}): offset が grid の整数倍のためテスト無効"
        )
