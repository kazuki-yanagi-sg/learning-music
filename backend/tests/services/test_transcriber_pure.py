"""
音声→ノート変換サービスの「純粋ロジック」ユニットテスト

librosa / basic-pitch / torch といった重い外部依存を読み込まずに実行できる、
副作用のない変換ロジックだけを対象にした安全網。
（重い依存は各サービスで遅延 import されるため、ここでは未インストールでも動く）
"""
import app.services.librosa_transcriber as lt_mod
import app.services.basic_pitch_service as bp_mod
from app.services.librosa_transcriber import LibrosaTranscriber
from app.services.basic_pitch_service import BasicPitchService


class TestLazyImport:
    """重い依存が遅延 import されていることの保証"""

    def test_librosa_not_imported_at_module_load(self):
        # 入口メソッドを呼ぶまで librosa は None のまま
        assert lt_mod.librosa is None

    def test_basic_pitch_not_imported_at_module_load(self):
        assert bp_mod.predict is None
        assert bp_mod.librosa is None

    def test_services_constructible_without_heavy_deps(self):
        # 重い依存なしでもインスタンス化できる
        assert LibrosaTranscriber() is not None
        assert BasicPitchService().model_path is None


class TestLibrosaMergeNearbyNotes:
    """同一ピッチの近接ノートのマージ（gap_tolerance=0.08）"""

    def setup_method(self):
        self.t = LibrosaTranscriber()

    def _note(self, pitch, start, end, velocity=100):
        return {"pitch": pitch, "start": start, "end": end, "velocity": velocity}

    def test_returns_as_is_when_less_than_two(self):
        notes = [self._note(60, 0.0, 0.5)]
        assert self.t._merge_nearby_notes(notes) == notes

    def test_merges_same_pitch_within_gap_tolerance(self):
        notes = [self._note(60, 0.0, 0.5, 80), self._note(60, 0.55, 1.0, 110)]
        merged = self.t._merge_nearby_notes(notes)
        assert len(merged) == 1
        assert merged[0]["end"] == 1.0
        assert merged[0]["velocity"] == 110  # max(80, 110)

    def test_does_not_merge_when_gap_too_large(self):
        notes = [self._note(60, 0.0, 0.5), self._note(60, 0.8, 1.2)]  # gap 0.3 > 0.08
        assert len(self.t._merge_nearby_notes(notes)) == 2

    def test_does_not_merge_different_pitch(self):
        notes = [self._note(60, 0.0, 0.5), self._note(62, 0.5, 1.0)]
        assert len(self.t._merge_nearby_notes(notes)) == 2


class TestLibrosaFinalizeNote:
    """ノート確定（平均ピッチ・確信度→velocity・最短長フィルタ）"""

    def setup_method(self):
        self.t = LibrosaTranscriber()

    def test_returns_none_when_too_short(self):
        # duration 0.005 < min_note_duration(0.01)
        assert self.t._finalize_note(60, 0.0, 0.005, [60.0], [0.8]) is None

    def test_uses_average_pitch_and_confidence(self):
        note = self.t._finalize_note(60, 0.0, 0.5, [60.0, 60.2], [0.8, 0.9])
        assert note["pitch"] == 60          # round(mean([60.0, 60.2]))
        assert note["start"] == 0.0
        assert note["end"] == 0.5
        assert note["velocity"] == 85       # int(mean([0.8,0.9]) * 100)

    def test_velocity_has_floor_of_40(self):
        note = self.t._finalize_note(60, 0.0, 0.5, [60.0], [0.1])
        assert note["velocity"] == 40       # max(40, int(0.1*100))


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
