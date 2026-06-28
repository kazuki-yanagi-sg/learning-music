"""
_classify_drum メソッドのユニットテスト（TDD: Red → Green → Refactor）

テスト仕様: docs/test-spec-timing-drums.md グループ1-4

対象: LibrosaTranscriber._classify_drum(r_low, r_mid, r_high, r_hihat, decay, centroid)
"""
import pytest
from app.services.librosa_transcriber import LibrosaTranscriber


class TestClassifyDrum:
    """_classify_drum メソッドの契約テスト"""

    def setup_method(self):
        self.t = LibrosaTranscriber()

    def _call(self, r_low=0.0, r_mid=0.0, r_high=0.0, r_hihat=0.0,
              decay=0.05, centroid=200.0):
        """デフォルト引数付きヘルパー"""
        return self.t._classify_drum(r_low, r_mid, r_high, r_hihat, decay, centroid)

    def test_classify_kick_low_dominant(self):
        """低域優勢 → kick"""
        result = self._call(r_low=0.7, r_mid=0.1, r_high=0.1, r_hihat=0.1)
        assert result == "kick"

    def test_classify_snare_mid_high(self):
        """中域+高域（スナッピー）→ snare"""
        result = self._call(r_low=0.1, r_mid=0.4, r_high=0.2, r_hihat=0.1, decay=0.05)
        assert result == "snare"

    def test_classify_hihat_closed_short_decay(self):
        """ハイハット優勢 + 短い減衰 → hihat_closed"""
        result = self._call(r_hihat=0.6, decay=0.02)
        assert result == "hihat_closed"

    def test_classify_hihat_open_long_decay(self):
        """ハイハット優勢 + 長い減衰 → hihat_open"""
        result = self._call(r_hihat=0.6, decay=0.12)
        assert result == "hihat_open"

    def test_classify_tom_by_centroid(self):
        """中域優勢 + centroid<200 → tom_low"""
        result = self._call(r_mid=0.5, r_high=0.05, centroid=180.0)
        assert result == "tom_low"

    def test_classify_fallback_uses_argmax_not_constant(self):
        """どの閾値にも非該当 → argmax で kick（r_low が最大）"""
        # r_low=0.3 が最大。従来コードは hihat_closed 固定だった（設計書ドラム原因2の核心）
        result = self._call(r_low=0.3, r_mid=0.28, r_high=0.22, r_hihat=0.2)
        assert result == "kick", f"argmax fallback が kick のはず。got: {result}"

    def test_classify_fallback_mid_argmax_is_snare(self):
        """どの閾値にも非該当で r_mid が最大 → snare（mid→snare or tom 系）"""
        # r_mid=0.45 が最大。argmax → mid帯 → snare
        result = self._call(r_low=0.2, r_mid=0.45, r_high=0.2, r_hihat=0.15)
        # snare または tom 系（mid が最大帯域なら hihat_closed ではない）
        assert result != "hihat_closed", f"mid最大なのに hihat_closed に崩壊: {result}"

    def test_classify_no_single_pitch_collapse(self):
        """複数の比パターンで結果が 2 種類以上（hihat_closed 単一崩壊しない）"""
        patterns = [
            self._call(r_low=0.7, r_mid=0.1, r_high=0.1, r_hihat=0.1),   # kick期待
            self._call(r_low=0.1, r_mid=0.4, r_high=0.2, r_hihat=0.1),   # snare期待
            self._call(r_hihat=0.6, decay=0.02),                           # hihat_closed期待
            self._call(r_low=0.3, r_mid=0.28, r_high=0.22, r_hihat=0.2), # argmax→kick
        ]
        unique_types = set(patterns)
        assert len(unique_types) >= 2, f"単一ピッチに崩壊: {unique_types}"

    def test_classify_returns_valid_drum_key(self):
        """戻り値は drum_map の有効なキーである"""
        valid_types = set(self.t.drum_map.keys())
        for pattern in [
            self._call(r_low=0.7, r_mid=0.1, r_high=0.1, r_hihat=0.1),
            self._call(r_low=0.1, r_mid=0.5, r_high=0.2, r_hihat=0.1),
            self._call(r_hihat=0.7, decay=0.02),
            self._call(r_hihat=0.7, decay=0.15),
            self._call(r_low=0.25, r_mid=0.25, r_high=0.25, r_hihat=0.25),
        ]:
            assert pattern in valid_types, f"無効なドラム種別: {pattern}"

    # ----------------------------------------------------------------
    # 境界テスト: snare vs hihat_closed（前回の見落とし箇所）
    # 実測値: r_low=0.06, r_mid=0.36, r_high=0.15, r_hihat=0.43
    # ----------------------------------------------------------------

    def test_snare_with_real_measured_ratio(self):
        """実計測スネア帯域比 → snare（hihat_closed に化けてはならない）

        実音声検証で観測した帯域比 (r_mid=0.36, r_hihat=0.43) を使用。
        r_hihat=0.43 > 0.4 だが、r_mid が大きいためスネアと判定すべき。
        前回の見落とし: hihat_closed ルールが snare ルールより先にマッチしていた。
        """
        result = self._call(
            r_low=0.06, r_mid=0.36, r_high=0.15, r_hihat=0.43, decay=0.05
        )
        assert result == "snare", (
            f"実計測スネア比で hihat_closed に誤分類: got={result}. "
            f"r_mid=0.36/r_hihat=0.43 → snare であるべき"
        )

    def test_pure_hihat_without_mid_is_hihat_closed(self):
        """mid が乏しいハイハット → hihat_closed（回帰）

        純粋なハイハット音（r_mid 小さい）は hihat_closed のまま。
        スネア判定を先に置いても回帰が起きないことを確認。
        """
        result = self._call(
            r_low=0.01, r_mid=0.04, r_high=0.03, r_hihat=0.92, decay=0.02
        )
        assert result == "hihat_closed", (
            f"純粋ハイハット比で hihat_closed にならない: got={result}"
        )

    def test_pure_kick_is_not_misclassified(self):
        """低域優勢キック → kick（回帰）

        スネア判定を前に置いても kick は正しく分類される。
        """
        result = self._call(
            r_low=0.69, r_mid=0.04, r_high=0.01, r_hihat=0.26, decay=0.05
        )
        assert result == "kick", (
            f"低域優勢キック比で kick にならない: got={result}"
        )

    def test_snare_vs_hihat_boundary_hihat_wins_when_mid_low(self):
        """r_hihat > 0.5 かつ r_mid < 0.2 → hihat_closed（hihat 優勢で mid 乏しい）

        hihat 閾値の境界確認: mid が乏しければ hihat_closed が優先される。
        """
        result = self._call(
            r_low=0.05, r_mid=0.10, r_high=0.10, r_hihat=0.75, decay=0.02
        )
        assert result == "hihat_closed", (
            f"mid 乏しい hihat 優勢で hihat_closed にならない: got={result}"
        )
