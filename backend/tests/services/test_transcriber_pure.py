"""
音声→ノート変換サービスの「純粋ロジック」ユニットテスト

librosa / basic-pitch / torch といった重い外部依存を読み込まずに実行できる、
副作用のない変換ロジックだけを対象にした安全網。
（重い依存は各サービスで遅延 import されるため、ここでは未インストールでも動く）
"""
import pytest
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

    def test_quantize_time_preserves_float_grid(self):
        """173.0 BPM のグリッドでクオンタイズしても float 精度が失われない

        設計書 §4: BPM は float のまま保持し、int() / round() で丸めない。
        grid = 60 / 173.0 * 0.25 ≈ 0.08671...（16分音符長）

        quantize_time(0.33, 173.0) = round(0.33 / grid) * grid
        = round(0.33 / 0.08671) * 0.08671
        = round(3.804...) * 0.08671
        = 4 * 0.08671 ≈ 0.34682...

        期待: 整数 BPM（173）で計算した場合と同値であること。
        int 丸めされた BPM（173）を使っても同じ結果になるため、
        少なくとも quantize_time 自体が内部で BPM を int に丸めていないことを確認する。
        """
        import pytest
        tempo = 173.0
        grid = 60.0 / tempo * 0.25  # ≈ 0.08671...
        expected = round(0.33 / grid) * grid  # float 精度で計算
        result = self.s.quantize_time(0.33, tempo)
        assert result == pytest.approx(expected, abs=1e-6), (
            f"quantize_time が float BPM を丸めて計算している: "
            f"got={result}, expected={expected} (grid={grid:.6f})"
        )


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


class TestLibrosaTranscriberVocalParams:
    """LibrosaTranscriber のボーカルパラメータ変更テスト

    メロディ回復対応（実験屋の実測知見）:
    - voiced_threshold = 0.2（pyin voiced_probs は 0.2-0.4 に密集するため、
      0.5 では真のボーカルを大量に捨てる。0.2 でノート回復とノイズ抑制を両立）
    - vocal_fmax = 2000 Hz（C6=1047 では高音ボーカルを切り落とすため旧値 2000 に復帰）
    """

    def test_voiced_threshold_is_0_2(self):
        """voiced_threshold が 0.2 に設定されていること（メロディ回復）"""
        from app.services.librosa_transcriber import LibrosaTranscriber
        transcriber = LibrosaTranscriber()
        assert transcriber.voiced_threshold == 0.2, (
            f"voiced_threshold={transcriber.voiced_threshold}、期待値は 0.2"
        )

    def test_vocal_fmax_is_2000(self):
        """vocal_fmax が 2000 Hz に設定されていること（高音ボーカル対応）"""
        from app.services.librosa_transcriber import LibrosaTranscriber
        transcriber = LibrosaTranscriber()
        assert transcriber.vocal_fmax == 2000, (
            f"vocal_fmax={transcriber.vocal_fmax}、期待値は 2000 (高音ボーカル対応)"
        )


class TestLibrosaTranscriberExtractMelodyBehavior:
    """extract_melody の振る舞いベース回帰テスト（合成音・実librosa使用）

    定数アサートだけでは「閾値が厳しすぎてノートが空になる」回帰を捉えられない。
    既知ピッチ（A4=440Hz）の正弦波を実際に extract_melody に通し、
    ノートが 1 つ以上抽出され、検出ピッチが A4(MIDI69) 付近であることを保証する。
    重い実依存（librosa / soundfile）を使うため integration マーカーを付与する。
    """

    @staticmethod
    def _write_sine_wav(path, freq=440.0, duration=1.0, sr=22050):
        """指定周波数の正弦波 mono wav を一時生成する"""
        import numpy as np
        import soundfile as sf

        t = np.linspace(0.0, duration, int(sr * duration), endpoint=False)
        # 振幅 0.5 の正弦波（クリッピング回避）
        y = 0.5 * np.sin(2.0 * np.pi * freq * t)
        sf.write(path, y, sr)

    def test_extract_melody_detects_a4_sine(self, tmp_path):
        """A4(440Hz) の正弦波からノートが抽出され、ピッチが MIDI69±2 に収まること"""
        import pytest

        from app.services.librosa_transcriber import LibrosaTranscriber

        wav_path = str(tmp_path / "a4_sine.wav")
        self._write_sine_wav(wav_path, freq=440.0, duration=1.0)

        result = LibrosaTranscriber().extract_melody(wav_path, tempo=120, offset=0.0)

        assert result["success"] is True, f"抽出失敗: {result.get('error')}"
        notes = result["notes"]
        # 閾値が厳しすぎると空になる → 回帰検出
        assert len(notes) >= 1, "A4 正弦波からノートが 1 つも抽出されなかった"
        # 検出ピッチが A4(MIDI69) 付近であること
        pitches = [n["pitch"] for n in notes]
        assert any(abs(p - 69) <= 2 for p in pitches), (
            f"検出ピッチ {pitches} が A4(MIDI69)±2 に収まっていない"
        )


# このファイル末尾のクラスへ integration マーカーを付与する
import pytest as _pytest  # noqa: E402

TestLibrosaTranscriberExtractMelodyBehavior = _pytest.mark.integration(
    TestLibrosaTranscriberExtractMelodyBehavior
)


class TestFinalizeNoteOffsetQuantize:
    """LibrosaTranscriber._finalize_note の offset-aware 量子化テスト

    単一契約: offset は量子化の前に一度だけ適用する（quantize_to_grid を使用）。
    _finalize_note に offset を配線し、extract_drums と同じ「quantize_to_grid で
    offset をグリッド原点として量子化する」パターンに統一する。

    境界ケース:
      - offset=0: 従来どおりの量子化結果と一致する
      - offset>0: グリッドの非整数倍でも offset を原点として正しくスナップする
      - グリッド境界ちょうど: ぴったりの値はそのまま保持される
      - 負値にならない: offset > start でも 0 未満にならない
    """

    def setup_method(self):
        from app.services.librosa_transcriber import LibrosaTranscriber
        self.t = LibrosaTranscriber()

    def _finalize(self, start, end, tempo, offset=0.0, pitch=60):
        return self.t._finalize_note(
            pitch=pitch, start=start, end=end,
            pitches=[float(pitch)], probs=[0.8],
            tempo=tempo, offset=offset,
        )

    def test_offset_zero_matches_plain_quantize(self):
        """offset=0 は素の round(t/grid)*grid と一致する"""
        tempo = 150.0
        grid = 60.0 / tempo * 0.25  # 0.1s
        note = self._finalize(start=0.42, end=0.42 + 0.2, tempo=tempo, offset=0.0)

        assert note is not None
        assert note["start"] == pytest.approx(round(0.42 / grid) * grid, abs=1e-6)

    def test_offset_positive_uses_offset_as_grid_anchor(self):
        """offset>0 のとき、offset を原点としたグリッドにスナップする

        BPM=150, grid=0.1s, start=0.42, offset=0.07 のとき
        正しい値: round((0.42-0.07)/0.1)*0.1 + 0.07 = 0.30 + 0.07 = 0.37
        誤った値（offset無視の量子化）: round(0.42/0.1)*0.1 = 0.40
        """
        tempo = 150.0
        offset = 0.07
        note = self._finalize(start=0.42, end=0.42 + 0.2, tempo=tempo, offset=offset)

        assert note is not None
        expected = round((0.42 - offset) / 0.1) * 0.1 + offset
        wrong = round(0.42 / 0.1) * 0.1
        assert note["start"] == pytest.approx(expected, abs=1e-6)
        assert note["start"] != pytest.approx(wrong, abs=1e-6)

    def test_grid_boundary_exact_value_kept(self):
        """offset を引いた後の値がちょうどグリッド境界なら、その値のまま保持される"""
        tempo = 150.0  # grid = 0.1s
        offset = 0.05
        # (start - offset) = 0.2 ちょうど（グリッド整数倍）
        start = 0.25
        note = self._finalize(start=start, end=start + 0.2, tempo=tempo, offset=offset)

        assert note is not None
        # round((0.25-0.05)/0.1)*0.1 + 0.05 = round(2.0)*0.1+0.05 = 0.2+0.05 = 0.25
        assert note["start"] == pytest.approx(0.25, abs=1e-6)

    def test_does_not_go_negative_when_offset_exceeds_start(self):
        """offset > start でも量子化結果が負値にならない"""
        tempo = 150.0
        offset = 1.0
        note = self._finalize(start=0.05, end=0.05 + 0.2, tempo=tempo, offset=offset)

        assert note is not None
        assert note["start"] >= 0.0

    def test_end_after_start_when_quantized_equal(self):
        """量子化後に end <= start になった場合、grid 分だけ end を延長する"""
        tempo = 150.0
        offset = 0.0
        # start と end が同じグリッドにスナップされるケース
        note = self._finalize(start=0.41, end=0.43, tempo=tempo, offset=offset)

        assert note is not None
        assert note["end"] > note["start"]


class TestBasicPitchTrackParamsGuitar:
    """BasicPitchService の guitar/piano トラックパラメータテスト

    設計書 A-1/_get_track_params: guitar と piano への明示エントリ追加
    """

    def test_guitar_params_defined(self):
        """guitar トラックパラメータが明示的に定義されていること"""
        from app.services.basic_pitch_service import BasicPitchService
        service = BasicPitchService()
        params = service._get_track_params("guitar")
        # guitar 専用エントリがある（"other" のデフォルトにフォールバックしない）ことを
        # min_freq で区別する（ギターは E2=82Hz 付近が下限）
        assert params.get("min_freq") is not None, "guitar の min_freq が設定されていない"

    def test_piano_params_defined(self):
        """piano トラックパラメータが明示的に定義されていること"""
        from app.services.basic_pitch_service import BasicPitchService
        service = BasicPitchService()
        params = service._get_track_params("piano")
        # piano 専用エントリがある（"other" のデフォルトにフォールバックしない）ことを確認
        assert params.get("min_freq") is not None, "piano の min_freq が設定されていない"

    def test_guitar_confidence_threshold_reduces_noise(self):
        """guitar は過剰ノート抑制のため confidence_threshold を一定以上に保つ"""
        from app.services.basic_pitch_service import BasicPitchService
        service = BasicPitchService()
        params = service._get_track_params("guitar")
        assert params["confidence_threshold"] >= 0.35, (
            f"guitar confidence_threshold={params['confidence_threshold']}、0.35 以上であること"
        )

    def test_piano_confidence_threshold_reduces_noise(self):
        """piano は過剰ノート抑制のため confidence_threshold を一定以上に保つ"""
        from app.services.basic_pitch_service import BasicPitchService
        service = BasicPitchService()
        params = service._get_track_params("piano")
        assert params["confidence_threshold"] >= 0.35, (
            f"piano confidence_threshold={params['confidence_threshold']}、0.35 以上であること"
        )
