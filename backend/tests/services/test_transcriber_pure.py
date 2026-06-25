"""
音声→ノート変換サービスの「純粋ロジック」ユニットテスト

librosa / basic-pitch / torch といった重い外部依存を読み込まずに実行できる、
副作用のない変換ロジックだけを対象にした安全網。
（重い依存は各サービスで遅延 import されるため、ここでは未インストールでも動く）
"""
import app.services.basic_pitch_service as bp_mod
from app.services.basic_pitch_service import BasicPitchService


class TestLazyImport:
    """重い依存が遅延 import されていることの保証"""

    def test_basic_pitch_not_imported_at_module_load(self):
        assert bp_mod.predict is None
        assert bp_mod.librosa is None

    def test_services_constructible_without_heavy_deps(self):
        # 重い依存なしでもインスタンス化できる
        assert BasicPitchService().model_path is None


class TestBasicPitchQuantizeTime:
    """ビートグリッドへのクオンタイズ"""

    def setup_method(self):
        self.s = BasicPitchService()

    def test_snaps_to_nearest_grid(self):
        # tempo=120 → 1拍=0.5秒, resolution=0.5 → grid=0.25秒
        assert self.s.quantize_time(0.3, 120) == 0.25
        assert self.s.quantize_time(0.4, 120) == 0.5
        assert self.s.quantize_time(0.0, 120) == 0.0


class TestBasicPitchMergeNotes:
    """同一ピッチの隣接ノートのマージ（velocityは平均）"""

    def setup_method(self):
        self.s = BasicPitchService()

    def _note(self, pitch, start, end, velocity=100):
        return {"pitch": pitch, "start": start, "end": end, "velocity": velocity}

    def test_empty_returns_empty(self):
        assert self.s.merge_notes([]) == []

    def test_merges_same_pitch_within_gap(self):
        notes = [self._note(60, 0.0, 0.5, 80), self._note(60, 0.55, 1.0, 100)]
        merged = self.s.merge_notes(notes, gap_threshold=0.1)
        assert len(merged) == 1
        assert merged[0]["end"] == 1.0
        assert merged[0]["velocity"] == 90  # (80 + 100) // 2

    def test_keeps_separate_when_gap_too_large(self):
        notes = [self._note(60, 0.0, 0.5), self._note(60, 0.9, 1.4)]  # gap 0.4 > 0.1
        assert len(self.s.merge_notes(notes, gap_threshold=0.1)) == 2

    def test_result_sorted_by_start(self):
        notes = [self._note(64, 1.0, 1.5), self._note(60, 0.0, 0.5)]
        merged = self.s.merge_notes(notes)
        assert [n["start"] for n in merged] == [0.0, 1.0]


class TestBasicPitchNormalizeDrumPitch:
    """検出ピッチ → GM Drum Map への正規化"""

    def setup_method(self):
        self.s = BasicPitchService()

    def test_low_is_kick(self):
        assert self.s._normalize_drum_pitch(30) == 36

    def test_mid_is_snare(self):
        assert self.s._normalize_drum_pitch(45) == 38

    def test_high_is_hihat(self):
        assert self.s._normalize_drum_pitch(55) == 42

    def test_very_high_is_crash(self):
        assert self.s._normalize_drum_pitch(70) == 49
