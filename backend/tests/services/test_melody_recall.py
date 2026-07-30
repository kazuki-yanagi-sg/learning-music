"""
is_voiced_frame 純関数のユニットテスト (TDD: Red → Green → Refactor)

設計書に従い以下を検証する:
- pitch < 0 → False
- prob = nan → False
- prob < threshold → False
- 全条件 OK → True
"""
import math
import pytest


class TestIsVoicedFrame:
    """is_voiced_frame 純関数の契約テスト

    設計: is_voiced_frame(pitch, prob, threshold) = (pitch >= 0) and (not np.isnan(prob)) and (prob >= threshold)
    """

    def _get_fn(self):
        from app.services.librosa_transcriber import is_voiced_frame
        return is_voiced_frame

    def test_negative_pitch_returns_false(self):
        """pitch < 0 → False"""
        fn = self._get_fn()
        assert fn(-1.0, 0.5, 0.2) is False

    def test_pitch_zero_is_valid_boundary(self):
        """pitch == 0 は境界値: False となる（pitch >= 0 かつ prob >= threshold で True になるべきだが
        現行 _f0_to_notes の判定は pitch >= 0 → False になりうる。
        設計書の契約: (pitch >= 0) の場合のみ他条件で評価。
        pitch=0 は MIDI0 (C-1) として有効なので True を期待する。"""
        fn = self._get_fn()
        # pitch=0, prob=0.5, threshold=0.2 → True（全条件OK）
        assert fn(0.0, 0.5, 0.2) is True

    def test_prob_nan_returns_false(self):
        """prob = NaN → False"""
        fn = self._get_fn()
        assert fn(60.0, float("nan"), 0.2) is False

    def test_prob_below_threshold_returns_false(self):
        """prob < threshold → False"""
        fn = self._get_fn()
        assert fn(60.0, 0.1, 0.2) is False

    def test_all_conditions_ok_returns_true(self):
        """pitch >= 0, prob は nan でない, prob >= threshold → True"""
        fn = self._get_fn()
        assert fn(60.0, 0.5, 0.2) is True

    def test_prob_exactly_at_threshold_returns_true(self):
        """prob == threshold の境界値 → True"""
        fn = self._get_fn()
        assert fn(60.0, 0.2, 0.2) is True

    def test_very_low_threshold(self):
        """threshold=0.0 のとき prob=0.0 でも True"""
        fn = self._get_fn()
        assert fn(60.0, 0.0, 0.0) is True

    def test_returns_bool_type(self):
        """戻り値は bool であること"""
        fn = self._get_fn()
        result = fn(60.0, 0.5, 0.2)
        assert isinstance(result, bool), f"戻り値が bool でない: {type(result)}"
