"""
normalize_tempo 純関数のユニットテスト（TDD: Red → Green → Refactor）

テスト仕様: docs/test-spec-timing-drums.md グループ1-1

契約確定:
  - ×2/÷2 は最大1回。補正後に帯域内なら採用、入らなければ元値を返す。
  - raw <= 0 は 120.0 を返す。
"""
import pytest
from app.services.librosa_transcriber import normalize_tempo


class TestNormalizeTempo:
    """normalize_tempo の契約テスト（仕様書 1-1 準拠）"""

    def test_normalize_keeps_in_range(self):
        """帯域内（150）はそのまま"""
        assert normalize_tempo(150.0) == 150.0

    def test_normalize_doubles_half_tempo(self):
        """半テンポ 75 → ×2=150（帯域内）→ 150.0"""
        assert normalize_tempo(75.0) == 150.0

    def test_normalize_halves_double_tempo(self):
        """倍テンポ 320 → ÷2=160（帯域内）→ 160.0"""
        assert normalize_tempo(320.0) == 160.0

    def test_normalize_no_change_when_doubling_overshoots(self):
        """100.0 → ×2=200 が 185 超で帯域外 → 元値 100.0 を返す"""
        # target_low=110 (default) で 100 < 110 なので倍にしようとする
        # ×2=200 > 185 で帯域外 → 元値 100.0
        result = normalize_tempo(100.0)
        assert result == 100.0

    def test_normalize_no_change_when_halving_undershoots(self):
        """200.0 → ÷2=100 が 110 未満で帯域外 → 元値 200.0 を返す"""
        # 200 > 185 なので ÷2 を試みる → 100 < 110 で帯域外 → 元値 200.0
        result = normalize_tempo(200.0)
        assert result == 200.0

    def test_normalize_boundary_low_inclusive(self):
        """下限 110.0 は帯域内（そのまま）"""
        assert normalize_tempo(110.0) == 110.0

    def test_normalize_boundary_high_inclusive(self):
        """上限 185.0 は帯域内（そのまま）"""
        assert normalize_tempo(185.0) == 185.0

    def test_normalize_zero_falls_back(self):
        """0.0 は不正値 → 120.0 を返す"""
        assert normalize_tempo(0.0) == 120.0

    def test_normalize_negative_falls_back(self):
        """-5.0 は不正値 → 120.0 を返す"""
        assert normalize_tempo(-5.0) == 120.0

    def test_normalize_returns_float(self):
        """戻り値は必ず float"""
        result = normalize_tempo(120)
        assert isinstance(result, float)

    def test_normalize_custom_range(self):
        """target_low / target_high で帯域を変えられる"""
        # 200 を [180, 220] でテスト
        assert normalize_tempo(200.0, target_low=180.0, target_high=220.0) == 200.0

    def test_normalize_160_in_range(self):
        """160.0 は 110-185 の帯域内"""
        assert normalize_tempo(160.0) == 160.0
