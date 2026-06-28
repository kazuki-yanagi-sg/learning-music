"""
ドラム重複除去のテンポ連動閾値テスト（TDD: Red → Green → Refactor）

テスト仕様: docs/test-spec-timing-drums.md グループ1-5

契約:
  - テンポが上がるほど dedup 閾値が単調減少（または非増加）
  - 真の重複（数ms以内）は除去する
  - 16分音符相当の連打（テンポ180で0.04s≒16分音符の1/3）は残す

対象:
  - is_duplicate_onset(time, detected, threshold) -> bool
  - dedup_threshold_for_tempo(tempo) -> float  ← 新規追加が必要
"""
import pytest
from app.services.librosa_transcriber import is_duplicate_onset


# テンポ連動閾値算出関数は librosa_transcriber に追加する
# Red フェーズ: まだ存在しないのでインポートに失敗→ AttributeError で Red になる
try:
    from app.services.librosa_transcriber import dedup_threshold_for_tempo
    _HAS_DEDUP_HELPER = True
except ImportError:
    _HAS_DEDUP_HELPER = False


class TestDedupThresholdScalesWithTempo:
    """dedup 閾値がテンポに連動することを確認"""

    def test_dedup_threshold_scales_with_tempo(self):
        """高テンポほど閾値が小さい（速い連打を残す）: threshold(240) <= threshold(120)"""
        assert _HAS_DEDUP_HELPER, "dedup_threshold_for_tempo が librosa_transcriber に存在しない"
        th_120 = dedup_threshold_for_tempo(120.0)
        th_240 = dedup_threshold_for_tempo(240.0)
        assert th_240 <= th_120, (
            f"高テンポほど閾値が小さいはず: threshold(240)={th_240} > threshold(120)={th_120}"
        )

    def test_dedup_threshold_returns_positive(self):
        """閾値は正の値（0より大きい）"""
        assert _HAS_DEDUP_HELPER, "dedup_threshold_for_tempo が librosa_transcriber に存在しない"
        assert dedup_threshold_for_tempo(120.0) > 0.0
        assert dedup_threshold_for_tempo(180.0) > 0.0

    def test_dedup_threshold_returns_float(self):
        """戻り値は float"""
        assert _HAS_DEDUP_HELPER, "dedup_threshold_for_tempo が librosa_transcriber に存在しない"
        result = dedup_threshold_for_tempo(160.0)
        assert isinstance(result, float)


class TestDedupKeepsFastConsecutiveHits:
    """テンポ連動閾値で16分連打が保持されることを確認"""

    def test_dedup_keeps_fast_consecutive_hits(self):
        """tempo=180 で 0.0s と 0.04s の2ヒットは両方残る

        tempo=180 の16分音符 = 60/180 * 0.25 ≈ 0.0833s
        0.04s は16分音符の約半分 → 重複ではなく速い連打
        """
        assert _HAS_DEDUP_HELPER, "dedup_threshold_for_tempo が librosa_transcriber に存在しない"
        tempo = 180.0
        threshold = dedup_threshold_for_tempo(tempo)

        # 1発目: 検出済み辞書に登録
        detected: dict[float, str] = {0.0: "kick"}

        # 2発目 0.04s: 重複でないはず（threshold < 0.04）
        is_dup = is_duplicate_onset(0.04, detected, threshold=threshold)
        assert not is_dup, (
            f"tempo={tempo}, threshold={threshold:.4f}: "
            f"0.04s 間隔の連打が重複とみなされた（連打が消える）"
        )

    def test_dedup_keeps_eighth_note_hits(self):
        """tempo=160 で8分音符間隔（≈0.1875s）は明確に保持される"""
        assert _HAS_DEDUP_HELPER, "dedup_threshold_for_tempo が librosa_transcriber に存在しない"
        tempo = 160.0
        threshold = dedup_threshold_for_tempo(tempo)
        eighth_note = 60.0 / tempo * 0.5  # 8分音符 = ≈0.1875s

        detected: dict[float, str] = {0.0: "snare"}
        is_dup = is_duplicate_onset(eighth_note, detected, threshold=threshold)
        assert not is_dup, (
            f"8分音符間隔が重複とみなされた: interval={eighth_note:.4f}, threshold={threshold:.4f}"
        )


class TestDedupRemovesTrueDuplicate:
    """真の重複（数ms以内）が除去されることを確認"""

    def test_dedup_removes_true_duplicate(self):
        """0.0s と 0.005s (5ms) の2ヒットは1件にまとまる

        5ms は量子化誤差・検出ジッタの範囲内 → 真の重複として除去する
        """
        assert _HAS_DEDUP_HELPER, "dedup_threshold_for_tempo が librosa_transcriber に存在しない"
        tempo = 120.0  # テンポ問わず 5ms は真の重複
        threshold = dedup_threshold_for_tempo(tempo)

        detected: dict[float, str] = {0.0: "kick"}
        is_dup = is_duplicate_onset(0.005, detected, threshold=threshold)
        assert is_dup, (
            f"5ms の差は真の重複のはずだが重複と判定されなかった: threshold={threshold:.4f}"
        )

    def test_is_duplicate_onset_pure_function_basic(self):
        """is_duplicate_onset の基本動作: 同じ時刻は重複"""
        detected: dict[float, str] = {1.0: "kick", 2.0: "snare"}
        assert is_duplicate_onset(1.0, detected, threshold=0.02)

    def test_is_duplicate_onset_far_apart_not_duplicate(self):
        """十分離れていれば重複ではない"""
        detected: dict[float, str] = {0.0: "kick"}
        assert not is_duplicate_onset(0.1, detected, threshold=0.02)

    def test_is_duplicate_onset_empty_detected(self):
        """検出済みが空なら常に False"""
        assert not is_duplicate_onset(1.0, {}, threshold=0.02)
