"""
帯域別ドラムオンセット検出の TDD テスト (Red → Green → Refactor)

設計書に従い以下を検証する:
1. 定数テスト: _DRUM_BANDS/_DRUM_PRIORITY/_SUPERFLUX_LAG/_SUPERFLUX_MAX_SIZE/_BAND_TO_DRUM_TYPE
2. merge_band_onsets テスト: 同時打ち両方残す / time 昇順 / 空入力
3. _detect_band_onsets の spy テスト: librosa 呼び出し引数検証
4. 合成音 integration: 低域キック+高域ハイハット同時刻を両方検出
"""
import numpy as np
import pytest
from unittest.mock import MagicMock, patch, call


# ---------------------------------------------------------------------------
# 1. 定数テスト
# ---------------------------------------------------------------------------

class TestDrumBandConstants:
    """設計書で定められた定数の値を検証する"""

    def test_drum_bands_keys(self):
        """_DRUM_BANDS が kick/snare/hihat を持つこと"""
        from app.services.librosa_transcriber import _DRUM_BANDS
        assert "kick" in _DRUM_BANDS
        assert "snare" in _DRUM_BANDS
        assert "hihat" in _DRUM_BANDS

    def test_drum_bands_kick_range(self):
        """_DRUM_BANDS["kick"] が (20, 200) であること"""
        from app.services.librosa_transcriber import _DRUM_BANDS
        assert _DRUM_BANDS["kick"] == (20, 200)

    def test_drum_bands_snare_range(self):
        """_DRUM_BANDS["snare"] が (200, 2000) であること"""
        from app.services.librosa_transcriber import _DRUM_BANDS
        assert _DRUM_BANDS["snare"] == (200, 2000)

    def test_drum_bands_hihat_range(self):
        """_DRUM_BANDS["hihat"] が (5000, 18000) であること"""
        from app.services.librosa_transcriber import _DRUM_BANDS
        assert _DRUM_BANDS["hihat"] == (5000, 18000)

    def test_drum_priority_order(self):
        """_DRUM_PRIORITY が ["kick", "snare", "hihat"] の順であること"""
        from app.services.librosa_transcriber import _DRUM_PRIORITY
        assert _DRUM_PRIORITY == ["kick", "snare", "hihat"]

    def test_superflux_lag(self):
        """_SUPERFLUX_LAG が 2 であること"""
        from app.services.librosa_transcriber import _SUPERFLUX_LAG
        assert _SUPERFLUX_LAG == 2

    def test_superflux_max_size(self):
        """_SUPERFLUX_MAX_SIZE が 3 であること"""
        from app.services.librosa_transcriber import _SUPERFLUX_MAX_SIZE
        assert _SUPERFLUX_MAX_SIZE == 3

    def test_band_to_drum_type_kick(self):
        """_BAND_TO_DRUM_TYPE["kick"] が "kick" であること"""
        from app.services.librosa_transcriber import _BAND_TO_DRUM_TYPE
        assert _BAND_TO_DRUM_TYPE["kick"] == "kick"

    def test_band_to_drum_type_snare(self):
        """_BAND_TO_DRUM_TYPE["snare"] が "snare" であること"""
        from app.services.librosa_transcriber import _BAND_TO_DRUM_TYPE
        assert _BAND_TO_DRUM_TYPE["snare"] == "snare"

    def test_band_to_drum_type_hihat(self):
        """_BAND_TO_DRUM_TYPE["hihat"] が "hihat_closed" であること"""
        from app.services.librosa_transcriber import _BAND_TO_DRUM_TYPE
        assert _BAND_TO_DRUM_TYPE["hihat"] == "hihat_closed"


# ---------------------------------------------------------------------------
# 2. merge_band_onsets テスト（最重要: 同時打ちを潰さない）
# ---------------------------------------------------------------------------

class TestMergeBandOnsets:
    """merge_band_onsets 純関数の振る舞いテスト"""

    def _get_fn(self):
        from app.services.librosa_transcriber import merge_band_onsets
        return merge_band_onsets

    def test_empty_input_returns_empty_list(self):
        """空入力 → 空リストを返す"""
        fn = self._get_fn()
        result = fn({"kick": [], "snare": [], "hihat": []})
        assert result == []

    def test_single_band_single_onset(self):
        """kick だけに 1 オンセット → 1 件返す"""
        fn = self._get_fn()
        result = fn({"kick": [1.0], "snare": [], "hihat": []})
        assert len(result) == 1
        assert result[0]["time"] == pytest.approx(1.0)
        assert result[0]["drum_type"] == "kick"

    def test_simultaneous_kick_and_snare_both_remain(self):
        """【最重要】同一 time(1.000) に kick と snare がある → 両方が残ること(2件)"""
        fn = self._get_fn()
        result = fn({"kick": [1.0], "snare": [1.0], "hihat": []})
        # 同時打ちは両方残す
        assert len(result) == 2, f"同時打ちが潰れている: {result}"
        times = [r["time"] for r in result]
        drum_types = {r["drum_type"] for r in result}
        assert all(t == pytest.approx(1.0) for t in times)
        assert "kick" in drum_types
        assert "snare" in drum_types

    def test_simultaneous_all_three_bands_all_remain(self):
        """kick/snare/hihat が同時刻 → 3件全て残ること"""
        fn = self._get_fn()
        result = fn({"kick": [0.5], "snare": [0.5], "hihat": [0.5]})
        assert len(result) == 3, f"同時打ちが潰れている: {result}"
        drum_types = {r["drum_type"] for r in result}
        assert "kick" in drum_types
        assert "snare" in drum_types
        assert "hihat_closed" in drum_types  # hihat → hihat_closed に変換される

    def test_output_sorted_by_time_ascending(self):
        """出力は time 昇順であること"""
        fn = self._get_fn()
        result = fn({"kick": [2.0, 0.5], "snare": [1.0], "hihat": []})
        times = [r["time"] for r in result]
        assert times == sorted(times), f"time 昇順でない: {times}"

    def test_hihat_band_maps_to_hihat_closed(self):
        """hihat 帯域 → drum_type = "hihat_closed" に変換される"""
        fn = self._get_fn()
        result = fn({"kick": [], "snare": [], "hihat": [0.3]})
        assert len(result) == 1
        assert result[0]["drum_type"] == "hihat_closed"

    def test_multiple_onsets_per_band(self):
        """各帯域に複数オンセット → 全件返る"""
        fn = self._get_fn()
        result = fn({"kick": [0.0, 0.5, 1.0], "snare": [0.25, 0.75], "hihat": [0.125]})
        assert len(result) == 6

    def test_output_has_time_and_drum_type_keys(self):
        """出力の各要素が "time" と "drum_type" キーを持つこと"""
        fn = self._get_fn()
        result = fn({"kick": [1.0], "snare": [], "hihat": []})
        assert "time" in result[0]
        assert "drum_type" in result[0]


# ---------------------------------------------------------------------------
# 3. _detect_band_onsets spy テスト
# ---------------------------------------------------------------------------

class TestDetectBandOnsetsSpy:
    """_detect_band_onsets が librosa を正しい引数で呼ぶことを spy で確認する"""

    def _build_mock_librosa(self):
        """librosa モックを組み立てる"""
        mock_lib = MagicMock()
        # melspectrogram: 2D 配列を返す
        mock_lib.feature.melspectrogram.return_value = np.ones((128, 100))
        # power_to_db: 入力と同形を返す
        mock_lib.power_to_db.return_value = np.ones((128, 100))
        # onset_strength: フレーム配列を返す
        mock_lib.onset.onset_strength.return_value = np.ones(100)
        # onset_detect: フレーム番号配列を返す
        mock_lib.onset.onset_detect.return_value = np.array([10, 50])
        # frames_to_time: 時刻配列を返す
        mock_lib.frames_to_time.return_value = np.array([0.1, 0.5])
        return mock_lib

    def test_onset_strength_called_with_S_keyword(self):
        """onset_strength が S= キーワード引数で呼ばれること"""
        from app.services.librosa_transcriber import LibrosaTranscriber
        transcriber = LibrosaTranscriber()
        mock_lib = self._build_mock_librosa()

        with patch("app.services.librosa_transcriber.librosa", mock_lib):
            y = np.zeros(44100, dtype=np.float32)
            transcriber._detect_band_onsets(y, 44100, "kick")

        # onset_strength の呼び出し引数を確認
        calls = mock_lib.onset.onset_strength.call_args_list
        assert len(calls) >= 1, "onset_strength が呼ばれていない"
        for c in calls:
            kwargs = c.kwargs if c.kwargs else {}
            assert "S" in kwargs, f"onset_strength に S= が渡っていない: kwargs={kwargs}"

    def test_onset_strength_called_with_lag_and_max_size(self):
        """onset_strength が lag=2, max_size=3 で呼ばれること"""
        from app.services.librosa_transcriber import LibrosaTranscriber
        transcriber = LibrosaTranscriber()
        mock_lib = self._build_mock_librosa()

        with patch("app.services.librosa_transcriber.librosa", mock_lib):
            y = np.zeros(44100, dtype=np.float32)
            transcriber._detect_band_onsets(y, 44100, "snare")

        calls = mock_lib.onset.onset_strength.call_args_list
        assert len(calls) >= 1
        for c in calls:
            kwargs = c.kwargs if c.kwargs else {}
            assert kwargs.get("lag") == 2, f"lag が 2 でない: {kwargs}"
            assert kwargs.get("max_size") == 3, f"max_size が 3 でない: {kwargs}"

    def test_onset_detect_called_with_backtrack_and_band_delta(self):
        """onset_detect が backtrack=True および帯域別 delta で呼ばれること

        新契約（帯域別 delta）:
        - delta は _ONSET_DELTA_BY_BAND[band] を使用する
        - hihat は 0.15 以上（過剰検出抑制のため）
        - 旧契約 delta=0.03(全帯域一律) は廃止
        """
        from app.services.librosa_transcriber import LibrosaTranscriber, _ONSET_DELTA_BY_BAND
        transcriber = LibrosaTranscriber()
        mock_lib = self._build_mock_librosa()

        with patch("app.services.librosa_transcriber.librosa", mock_lib):
            y = np.zeros(44100, dtype=np.float32)
            transcriber._detect_band_onsets(y, 44100, "hihat")

        calls = mock_lib.onset.onset_detect.call_args_list
        assert len(calls) >= 1, "onset_detect が呼ばれていない"
        for c in calls:
            kwargs = c.kwargs if c.kwargs else {}
            assert kwargs.get("backtrack") is True, f"backtrack が True でない: {kwargs}"
            # 新契約: delta は帯域別（hihat の期待値は _ONSET_DELTA_BY_BAND["hihat"]）
            expected_delta = _ONSET_DELTA_BY_BAND["hihat"]
            assert kwargs.get("delta") == pytest.approx(expected_delta), (
                f"hihat の delta が {expected_delta} でない: {kwargs}"
            )

    def test_onset_strength_called_with_sr_and_hop(self):
        """onset_strength が sr=44100, hop_length=512 で呼ばれること"""
        from app.services.librosa_transcriber import LibrosaTranscriber
        transcriber = LibrosaTranscriber()
        mock_lib = self._build_mock_librosa()

        with patch("app.services.librosa_transcriber.librosa", mock_lib):
            y = np.zeros(44100, dtype=np.float32)
            transcriber._detect_band_onsets(y, 44100, "kick")

        calls = mock_lib.onset.onset_strength.call_args_list
        for c in calls:
            kwargs = c.kwargs if c.kwargs else {}
            assert kwargs.get("sr") == 44100
            assert kwargs.get("hop_length") == 512

    def test_returns_numpy_array_of_seconds(self):
        """戻り値が numpy 配列（秒単位）であること"""
        from app.services.librosa_transcriber import LibrosaTranscriber
        transcriber = LibrosaTranscriber()
        mock_lib = self._build_mock_librosa()
        expected_times = np.array([0.1, 0.5])
        mock_lib.frames_to_time.return_value = expected_times

        with patch("app.services.librosa_transcriber.librosa", mock_lib):
            y = np.zeros(44100, dtype=np.float32)
            result = transcriber._detect_band_onsets(y, 44100, "kick")

        assert isinstance(result, np.ndarray), f"戻り値が ndarray でない: {type(result)}"


# ---------------------------------------------------------------------------
# 4. 合成音 integration テスト: 同時打ちが潰れないことを確認
# ---------------------------------------------------------------------------

class TestSyntheticSimultaneousHitDetection:
    """合成音を使い kick+hihat 同時打ちが両方検出されることを確認する

    低域正弦波(50Hz=キック帯域) + 高域正弦波(10000Hz=ハイハット帯域) を
    同一時刻に重ねた波形から _detect_band_onsets を kick/hihat それぞれで呼び出し、
    両方が同時刻付近でオンセットを検出することを確認する。
    """

    @staticmethod
    def _make_click_wave(freq: float, click_times: list, sr: int = 44100, duration: float = 2.0) -> np.ndarray:
        """指定周波数・指定時刻にクリック（短い正弦波パルス）を配置した波形を生成する

        Args:
            freq: 周波数 (Hz)
            click_times: クリックを配置する時刻リスト (秒)
            sr: サンプルレート
            duration: 波形全体の長さ (秒)

        Returns:
            mono 波形 (float32)
        """
        y = np.zeros(int(sr * duration), dtype=np.float32)
        pulse_len = int(sr * 0.05)  # 50ms のパルス
        t_pulse = np.linspace(0, 0.05, pulse_len, endpoint=False)
        pulse = np.sin(2 * np.pi * freq * t_pulse).astype(np.float32)
        # エンベロープ（急速減衰）
        envelope = np.exp(-t_pulse * 60).astype(np.float32)
        pulse = pulse * envelope

        for ct in click_times:
            start = int(ct * sr)
            end = min(start + pulse_len, len(y))
            y[start:end] += pulse[:end - start]

        # 正規化
        max_val = np.max(np.abs(y))
        if max_val > 0:
            y /= max_val
        return y

    def test_kick_and_hihat_both_detected_at_simultaneous_hit(self):
        """低域キック+高域ハイハットを同時刻(0.5s)に置いたとき、
        _detect_band_onsets を kick/hihat それぞれで呼ぶと両方オンセット検出される

        注: 実librosa を使うため integration マーカーを付与する
        """
        import app.services.librosa_transcriber as lt_mod
        from app.services.librosa_transcriber import _ensure_audio_libs

        # 元の状態を保存してから実librosaを注入する（後続テストのために teardown で戻す）
        original_librosa = lt_mod.librosa
        original_signal = lt_mod.signal

        # _ensure_audio_libs を呼び出して librosa と signal を両方ロードする
        _ensure_audio_libs()

        try:
            from app.services.librosa_transcriber import LibrosaTranscriber
            transcriber = LibrosaTranscriber()

            sr = 44100
            hit_time = 0.5
            tolerance = 0.15  # 150ms の検出許容誤差

            # 低域キック波形（50Hz）
            y_kick = self._make_click_wave(50.0, [hit_time], sr=sr, duration=2.0)
            # 高域ハイハット波形（10000Hz）
            y_hihat = self._make_click_wave(10000.0, [hit_time], sr=sr, duration=2.0)
            # 合成: 両方を重ねる
            y_mixed = y_kick + y_hihat
            # クリッピング防止
            max_val = np.max(np.abs(y_mixed))
            if max_val > 0:
                y_mixed /= max_val

            # kick 帯域で検出
            kick_times = transcriber._detect_band_onsets(y_mixed, sr, "kick")
            # hihat 帯域で検出
            hihat_times = transcriber._detect_band_onsets(y_mixed, sr, "hihat")

            # kick が hit_time 付近で検出されること
            kick_near = [t for t in kick_times if abs(t - hit_time) <= tolerance]
            assert len(kick_near) >= 1, (
                f"kick オンセットが {hit_time}s ± {tolerance}s で検出されなかった。"
                f"検出時刻: {kick_times.tolist() if len(kick_times) > 0 else []}"
            )

            # hihat が hit_time 付近で検出されること（同時打ちが潰れない）
            hihat_near = [t for t in hihat_times if abs(t - hit_time) <= tolerance]
            assert len(hihat_near) >= 1, (
                f"hihat オンセットが {hit_time}s ± {tolerance}s で検出されなかった。"
                f"検出時刻: {hihat_times.tolist() if len(hihat_times) > 0 else []}"
            )
        finally:
            # 元の状態に戻す（後続テストが遅延インポートに依存している場合でも安全）
            lt_mod.librosa = original_librosa
            lt_mod.signal = original_signal


# integration マーカーを TestSyntheticSimultaneousHitDetection に付与
import pytest as _pytest
TestSyntheticSimultaneousHitDetection = _pytest.mark.integration(
    TestSyntheticSimultaneousHitDetection
)
