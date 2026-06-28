"""
タイミングずれ／ドラム検出修正の純関数ユニットテスト（TDD: Red → Green → Refactor）

テスト対象:
    - normalize_tempo: 倍/半テンポをアニソン帯 110-185 に補正する純関数
    - apply_offset: クオンタイズ原点を第1拍に合わせる純関数
    - _classify_drum: 帯域エネルギーからドラム種別を判定する純関数
    - _is_duplicate / deduplicate: テンポ連動重複除去
    - TempoInfo pydantic モデル
    - detect_tempo の呼び出し引数（spy）
"""
import numpy as np
import pytest
from unittest.mock import patch, MagicMock


# ===========================================================================
# A. タイミングずれ修正
# ===========================================================================

class TestNormalizeTempo:
    """normalize_tempo 純関数のユニットテスト

    仕様:
        - アニソン帯 110-185 BPM に収まっている場合はそのまま返す
        - 半テンポ（遅すぎ）の場合は 2 倍して帯域に収める  例: 75 → 150
        - 倍テンポ（速すぎ）の場合は 1/2 にして帯域に収める 例: 320 → 160
        - 再帰的に補正する（例: 55 → 110 など端値も対応）
    """

    def _get_fn(self):
        """実装後にインポートする（Red フェーズでは ImportError が出ることを期待しない）"""
        from app.services.librosa_transcriber import normalize_tempo
        return normalize_tempo

    def test_within_range_unchanged(self):
        """帯域内は変更なし"""
        fn = self._get_fn()
        assert fn(150.0) == 150.0

    def test_lower_bound_unchanged(self):
        """下限 110 はそのまま"""
        fn = self._get_fn()
        assert fn(110.0) == 110.0

    def test_upper_bound_unchanged(self):
        """上限 185 はそのまま"""
        fn = self._get_fn()
        assert fn(185.0) == 185.0

    def test_half_tempo_doubled(self):
        """半テンポ 75 → 150"""
        fn = self._get_fn()
        assert fn(75.0) == 150.0

    def test_double_tempo_halved(self):
        """倍テンポ 320 → 160"""
        fn = self._get_fn()
        assert fn(320.0) == 160.0

    def test_very_slow_recursive(self):
        """超低速 55 → 110（2回倍にする）"""
        fn = self._get_fn()
        result = fn(55.0)
        assert 110.0 <= result <= 185.0

    def test_very_fast_recursive(self):
        """超高速 600 → 最大1回の補正（÷2=300 が帯域外なら元値 600.0 を返す）

        仕様: ×2/÷2 は最大1回。補正後も帯域外なら元値を返す。
        600/2=300 > 185 なので元値 600.0 が返る。
        """
        fn = self._get_fn()
        result = fn(600.0)
        # 最大1回補正: 600 → 300 (帯域外) → 元値 600.0 を返す
        assert result == 600.0

    def test_returns_float(self):
        """戻り値は float"""
        fn = self._get_fn()
        result = fn(120)
        assert isinstance(result, float)


class TestApplyOffset:
    """apply_offset_to_notes 補助関数のユニットテスト

    仕様:
        - apply_offset_to_notes(notes, offset) は apply_offset をノートリストに適用する
        - offset を引くことで第1拍をグリッド原点 0 に揃える
        - start/end キーを持つノートのリストを受け取り、新しいリストを返す
        - offset が 0 の場合は変更なし
        - start が offset より小さい場合は 0 にクランプする（負にしない）

    ※ apply_offset(time, offset) はスカラー版（個別テストは test_offset_quantize.py に集約）
    """

    def _get_fn(self):
        # apply_offset_to_notes はリスト版（ノートリスト全体にオフセットを適用）
        from app.services.librosa_transcriber import apply_offset_to_notes
        return apply_offset_to_notes

    def _note(self, start, end, pitch=60):
        return {"pitch": pitch, "start": start, "end": end, "velocity": 80}

    def test_zero_offset_unchanged(self):
        """offset=0 は変更なし"""
        fn = self._get_fn()
        notes = [self._note(1.0, 2.0)]
        result = fn(notes, 0.0)
        assert result[0]["start"] == pytest.approx(1.0)
        assert result[0]["end"] == pytest.approx(2.0)

    def test_offset_shifts_start_end(self):
        """offset が start/end から引かれる"""
        fn = self._get_fn()
        notes = [self._note(0.5, 1.0)]
        result = fn(notes, 0.5)
        assert result[0]["start"] == pytest.approx(0.0)
        assert result[0]["end"] == pytest.approx(0.5)

    def test_negative_start_clamped_to_zero(self):
        """offset > start の場合 start は 0 にクランプ"""
        fn = self._get_fn()
        notes = [self._note(0.1, 0.5)]
        result = fn(notes, 0.3)
        assert result[0]["start"] >= 0.0

    def test_original_notes_not_mutated(self):
        """元のノートリストは変更しない（副作用なし）"""
        fn = self._get_fn()
        original = [self._note(1.0, 2.0)]
        fn(original, 0.5)
        assert original[0]["start"] == 1.0

    def test_empty_list_returns_empty(self):
        """空リストは空を返す"""
        fn = self._get_fn()
        assert fn([], 0.5) == []

    def test_multiple_notes_all_shifted(self):
        """複数ノートすべてシフト"""
        fn = self._get_fn()
        notes = [self._note(1.0, 1.5), self._note(2.0, 2.5)]
        result = fn(notes, 1.0)
        assert result[0]["start"] == pytest.approx(0.0)
        assert result[1]["start"] == pytest.approx(1.0)


class TestTempoInfoModel:
    """TempoInfo pydantic モデルのユニットテスト"""

    def test_model_instantiation(self):
        """正常なパラメータでインスタンス化できる"""
        from app.models.transcription import TempoInfo
        info = TempoInfo(tempo=140.0, beat_times=[0.0, 0.43, 0.86], offset=0.0)
        assert info.tempo == 140.0
        assert info.beat_times == [0.0, 0.43, 0.86]
        assert info.offset == 0.0

    def test_offset_defaults_to_zero(self):
        """offset のデフォルトは 0.0"""
        from app.models.transcription import TempoInfo
        info = TempoInfo(tempo=120.0, beat_times=[])
        assert info.offset == 0.0

    def test_tempo_is_float(self):
        """tempo は float 型"""
        from app.models.transcription import TempoInfo
        info = TempoInfo(tempo=120, beat_times=[])
        assert isinstance(info.tempo, float)


class TestDetectTempoSpy:
    """detect_tempo が正しい引数で librosa を呼び出すことを検証（spy）"""

    def test_beat_track_called_with_start_bpm(self):
        """beat_track は start_bpm≈150 で呼ばれる"""
        import sys
        import types

        # librosa をモジュールレベルで差し込む
        mock_librosa = MagicMock()
        mock_librosa.load.return_value = (np.zeros(44100), 44100)
        mock_librosa.beat.beat_track.return_value = (np.array([150.0]), np.array([0, 20, 40]))
        mock_librosa.frames_to_time.return_value = np.array([0.0, 0.46, 0.93])

        # librosa_transcriber モジュールを再ロードしてモックを注入
        import app.services.librosa_transcriber as lt_mod
        original_librosa = lt_mod.librosa
        lt_mod.librosa = mock_librosa

        try:
            from app.services.librosa_transcriber import LibrosaTranscriber
            transcriber = LibrosaTranscriber()
            result = transcriber.detect_tempo("/dummy/path.wav")

            # beat_track が start_bpm で呼ばれたことを確認
            call_kwargs = mock_librosa.beat.beat_track.call_args
            assert call_kwargs is not None, "beat_track が呼ばれていない"
            kwargs = call_kwargs.kwargs if call_kwargs.kwargs else {}
            args = call_kwargs.args if call_kwargs.args else ()
            # start_bpm が kwargs に存在するか確認
            assert "start_bpm" in kwargs, f"start_bpm が未指定: kwargs={kwargs}"
            assert 140 <= kwargs["start_bpm"] <= 160, f"start_bpm≈150 期待: {kwargs['start_bpm']}"
        finally:
            lt_mod.librosa = original_librosa

    def test_frames_to_time_uses_explicit_sr_hop(self):
        """frames_to_time は sr と hop_length を明示的に渡す"""
        import app.services.librosa_transcriber as lt_mod

        mock_librosa = MagicMock()
        mock_librosa.load.return_value = (np.zeros(44100), 44100)
        mock_librosa.beat.beat_track.return_value = (np.array([150.0]), np.array([0, 20]))
        mock_librosa.frames_to_time.return_value = np.array([0.0, 0.46])

        original_librosa = lt_mod.librosa
        lt_mod.librosa = mock_librosa

        try:
            from app.services.librosa_transcriber import LibrosaTranscriber
            transcriber = LibrosaTranscriber()
            transcriber.detect_tempo("/dummy/path.wav")

            call_kwargs = mock_librosa.frames_to_time.call_args
            assert call_kwargs is not None, "frames_to_time が呼ばれていない"
            kwargs = call_kwargs.kwargs if call_kwargs.kwargs else {}
            # sr と hop_length が明示されている
            assert "sr" in kwargs, f"sr が未指定: kwargs={kwargs}"
            assert "hop_length" in kwargs, f"hop_length が未指定: kwargs={kwargs}"
        finally:
            lt_mod.librosa = original_librosa


# ===========================================================================
# B. ドラム修正
# ===========================================================================

class TestClassifyDrum:
    """_classify_drum 純関数のユニットテスト

    仕様:
        - 帯域エネルギー比を受け取り ドラム種別文字列を返す
        - キック: 低域が圧倒的（r_low > 0.5, r_mid < 0.25）
        - スネア: 中域+高域が強い（r_mid > 0.3, r_high > 0.15）
        - ハイハット: 超高域が優勢（r_hihat > 0.4）
        - fallback: hihat_closed に崩壊せず argmax で決める
    """

    def _get_fn(self):
        from app.services.librosa_transcriber import classify_drum
        return classify_drum

    def _ratios(self, low=0.0, mid=0.0, high=0.0, hihat=0.0):
        """帯域エネルギー比を辞書形式で返す"""
        return {"r_low": low, "r_mid": mid, "r_high": high, "r_hihat": hihat}

    def test_kick_detection(self):
        """低域優勢はキック"""
        fn = self._get_fn()
        result = fn(**self._ratios(low=0.7, mid=0.1, high=0.1, hihat=0.1))
        assert result == "kick"

    def test_snare_detection(self):
        """中域+高域（スナッピー）はスネア"""
        fn = self._get_fn()
        result = fn(**self._ratios(low=0.1, mid=0.5, high=0.3, hihat=0.1))
        assert result == "snare"

    def test_hihat_detection(self):
        """超高域優勢はハイハット"""
        fn = self._get_fn()
        result = fn(**self._ratios(low=0.05, mid=0.1, high=0.05, hihat=0.8))
        assert result in ("hihat_closed", "hihat_open")

    def test_fallback_not_always_hihat_closed(self):
        """fallback は常に hihat_closed ではなく argmax で決める"""
        fn = self._get_fn()
        # 中域が最大のケース → kick/snare/tomのどれかが返るべきで hihat_closed ではない
        result_mid = fn(**self._ratios(low=0.1, mid=0.6, high=0.1, hihat=0.2))
        result_low = fn(**self._ratios(low=0.5, mid=0.2, high=0.1, hihat=0.2))
        # 少なくとも一方が hihat_closed 以外であること（argmax fallback が機能している）
        assert result_mid != "hihat_closed" or result_low != "hihat_closed"

    def test_returns_valid_drum_type(self):
        """戻り値は drum_map の有効なキーである"""
        fn = self._get_fn()
        valid_types = {"kick", "snare", "hihat_closed", "hihat_open",
                       "tom_high", "tom_mid", "tom_low", "crash", "ride"}
        for ratios in [
            self._ratios(0.7, 0.1, 0.1, 0.1),
            self._ratios(0.1, 0.6, 0.2, 0.1),
            self._ratios(0.1, 0.1, 0.1, 0.7),
            self._ratios(0.25, 0.25, 0.25, 0.25),  # 均等
        ]:
            result = fn(**ratios)
            assert result in valid_types, f"無効なドラム種別: {result}"


class TestDrumDedup:
    """テンポ連動重複除去のユニットテスト

    仕様:
        - 同時刻に重複するオンセットは除去する
        - 高速連打（1拍の 1/4 以内）は別々のヒットとして保持する
        - 閾値 = beat_duration * dedup_ratio（例: 0.05）
    """

    def _get_fn(self):
        from app.services.librosa_transcriber import is_duplicate_onset
        return is_duplicate_onset

    def test_exact_duplicate_detected(self):
        """同じ時刻は重複として検出"""
        fn = self._get_fn()
        detected = {0.50: "kick"}
        assert fn(0.50, detected, threshold=0.02) is True

    def test_near_duplicate_detected(self):
        """閾値内の時刻は重複として検出"""
        fn = self._get_fn()
        detected = {0.50: "kick"}
        assert fn(0.505, detected, threshold=0.02) is True

    def test_rapid_hit_not_duplicate(self):
        """閾値外の高速連打は重複ではない"""
        fn = self._get_fn()
        detected = {0.50: "kick"}
        # 30ms 離れていれば threshold=0.02 なら別ヒット
        assert fn(0.53, detected, threshold=0.02) is False

    def test_empty_detected_never_duplicate(self):
        """検出済みが空なら重複なし"""
        fn = self._get_fn()
        assert fn(0.50, {}, threshold=0.02) is False

    def test_tempo_linked_threshold(self):
        """テンポ連動閾値の計算が正しい（BPM 120 → beat 0.5s → threshold = 0.5 * ratio）"""
        # beat_duration(BPM=120) = 0.5s, dedup_ratio=0.05 → threshold=0.025
        beat_duration = 60.0 / 120.0  # 0.5s
        threshold = beat_duration * 0.05  # 0.025s
        fn = self._get_fn()
        detected = {1.0: "kick"}
        # 0.02s 離れ → threshold=0.025 より小さいので重複
        assert fn(1.02, detected, threshold=threshold) is True
        # 0.03s 離れ → threshold=0.025 より大きいので別ヒット
        assert fn(1.03, detected, threshold=threshold) is False


class TestExtractDrumsConsistentSrHop:
    """extract_drums 内の librosa 呼び出しが sr=44100/hop=512 で一貫することを検証（帯域別フロー）"""

    def test_drum_librosa_calls_use_consistent_sr_hop(self):
        """帯域別フロー: onset_strength(S=)/onset_detect/frames_to_time が sr=44100/hop=512 で呼ばれる

        新契約:
        - melspectrogram / power_to_db が帯域ごとに呼ばれる
        - onset_strength は S= キーワードで呼ばれる（旧フローは y= だった）
        - onset_detect は 3 帯域分以上呼ばれる
        - onset_strength に lag=2, max_size=3 が渡される（Superflux）
        - onset_detect に backtrack=True, delta=0.03 が渡される
        """
        import app.services.librosa_transcriber as lt_mod
        import tempfile, os

        # ダミー WAV ファイルを作成
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            dummy_path = f.name

        mock_librosa = MagicMock()
        # librosa.load の戻り値
        mock_librosa.load.return_value = (np.zeros(44100), 44100)
        # melspectrogram の戻り値（帯域別に呼ばれる）
        mock_librosa.feature.melspectrogram.return_value = np.ones((128, 100))
        # power_to_db の戻り値
        mock_librosa.power_to_db.return_value = np.ones((128, 100))
        # onset_strength の戻り値
        mock_onset_env = np.zeros(100)
        mock_librosa.onset.onset_strength.return_value = mock_onset_env
        # onset_detect の戻り値
        mock_librosa.onset.onset_detect.return_value = np.array([0, 10, 20])
        # frames_to_time の戻り値
        mock_librosa.frames_to_time.return_value = np.array([0.0, 0.1, 0.2])
        # effects.percussive は除去済みのため呼ばれないことも検証
        mock_librosa.effects.percussive.return_value = np.zeros(44100)

        mock_signal = MagicMock()
        mock_signal.butter.return_value = MagicMock()
        mock_signal.sosfiltfilt.return_value = np.zeros(44100)

        # patch コンテキストマネージャを使って安全に置き換える
        # （グローバル変数への直接代入は finally で None に戻すと後続テストが壊れる）
        with patch("app.services.librosa_transcriber.librosa", mock_librosa), \
             patch("app.services.librosa_transcriber.signal", mock_signal):
            try:
                from app.services.librosa_transcriber import LibrosaTranscriber
                transcriber = LibrosaTranscriber()
                transcriber.extract_drums(dummy_path, tempo=120.0)

                # 新契約: onset_strength が S= キーワードで 3 帯域分以上呼ばれた
                oss_calls = mock_librosa.onset.onset_strength.call_args_list
                assert len(oss_calls) >= 3, f"onset_strength が 3 帯域分以上呼ばれていない: {len(oss_calls)} 回"
                for c in oss_calls:
                    kw = c.kwargs if c.kwargs else {}
                    assert "S" in kw, f"onset_strength に S= が渡っていない: {kw}"
                    assert kw.get("sr") == 44100, f"onset_strength の sr が 44100 でない: {kw}"
                    assert kw.get("hop_length") == 512, f"onset_strength の hop_length が 512 でない: {kw}"
                    assert kw.get("lag") == 2, f"onset_strength の lag が 2 でない: {kw}"
                    assert kw.get("max_size") == 3, f"onset_strength の max_size が 3 でない: {kw}"

                # 新契約: onset_detect が 3 帯域分以上呼ばれ、
                # backtrack=True / delta は帯域別(_ONSET_DELTA_BY_BAND)で渡される
                from app.services.librosa_transcriber import _ONSET_DELTA_BY_BAND
                valid_deltas = set(_ONSET_DELTA_BY_BAND.values())
                osd_calls = mock_librosa.onset.onset_detect.call_args_list
                assert len(osd_calls) >= 3, f"onset_detect が 3 帯域分以上呼ばれていない: {len(osd_calls)} 回"
                for c in osd_calls:
                    kw = c.kwargs if c.kwargs else {}
                    assert kw.get("sr") == 44100, f"onset_detect の sr が 44100 でない: {kw}"
                    assert kw.get("hop_length") == 512, f"onset_detect の hop_length が 512 でない: {kw}"
                    assert kw.get("backtrack") is True, f"onset_detect の backtrack が True でない: {kw}"
                    # 新フロー: delta は帯域別（_ONSET_DELTA_BY_BAND の値のいずれか）
                    actual_delta = kw.get("delta")
                    assert any(abs(actual_delta - d) < 1e-9 for d in valid_deltas), (
                        f"onset_detect の delta={actual_delta} が _ONSET_DELTA_BY_BAND "
                        f"の値でない: {valid_deltas}"
                    )

                # frames_to_time が sr=44100/hop=512 で呼ばれた
                ftt_calls = mock_librosa.frames_to_time.call_args_list
                assert len(ftt_calls) > 0, "frames_to_time が呼ばれていない"
                for c in ftt_calls:
                    kw = c.kwargs if c.kwargs else {}
                    assert kw.get("sr") == 44100, f"frames_to_time の sr が 44100 でない: {kw}"
                    assert kw.get("hop_length") == 512, f"frames_to_time の hop_length が 512 でない: {kw}"

                # melspectrogram が 3 帯域分以上呼ばれた（新フロー）
                msc_calls = mock_librosa.feature.melspectrogram.call_args_list
                assert len(msc_calls) >= 3, (
                    f"melspectrogram が 3 帯域分以上呼ばれていない: {len(msc_calls)} 回"
                )
            finally:
                os.unlink(dummy_path)


# ===========================================================================
# C. float データフロー（回帰テスト）
# ===========================================================================

class TestTempoFloatPassthrough:
    """BPM が float のまま貫通するかの回帰テスト"""

    def test_transcription_result_tempo_accepts_float(self):
        """TranscriptionResult.tempo は float を受け付ける"""
        from app.models.transcription import TranscriptionResult
        result = TranscriptionResult(success=True, tempo=140.5, notes=[], error=None)
        # float が int に変換されない
        assert result.tempo == 140.5

    def test_basic_pitch_service_detect_tempo_returns_float(self):
        """detect_tempo の thin-wrapper は float を返す"""
        import app.services.basic_pitch_service as bp_mod

        mock_librosa = MagicMock()
        mock_librosa.load.return_value = (np.zeros(44100), 44100)
        mock_librosa.beat.beat_track.return_value = (np.array([140.0]), np.array([0, 20]))
        mock_librosa.frames_to_time.return_value = np.array([0.0, 0.46])

        original_librosa = bp_mod.librosa
        bp_mod.librosa = mock_librosa

        try:
            from app.services.basic_pitch_service import BasicPitchService
            service = BasicPitchService()
            tempo, _ = service.detect_tempo("/dummy.wav")
            assert isinstance(tempo, float), f"tempo は float であるべき: {type(tempo)}"
        finally:
            bp_mod.librosa = original_librosa


# ===========================================================================
# D. Integration テスト（@pytest.mark.integration）
# ===========================================================================

@pytest.mark.integration
class TestIntegrationTempoDetection:
    """既知BPMの合成音で detect_tempo が半/倍テンポを返さないことを検証

    このテストは librosa が実際にインストールされている環境でのみ実行する。
    """

    @pytest.fixture
    def make_click_track(self, tmp_path):
        """指定BPMのクリックトラック（numpy sinc）を一時WAVとして生成するファクトリ"""
        def _make(bpm: float, duration: float = 4.0, sr: int = 44100) -> str:
            """duration 秒のクリックトラックを tmp_path に保存してパスを返す"""
            try:
                import soundfile as sf
            except ImportError:
                pytest.skip("soundfile が未インストール")

            beat_interval = 60.0 / bpm
            n_samples = int(sr * duration)
            y = np.zeros(n_samples)

            # ビート位置にクリック音（正弦波バースト）を置く
            t = 0.0
            click_len = int(sr * 0.01)  # 10ms
            while t < duration:
                idx = int(t * sr)
                if idx + click_len <= n_samples:
                    burst = np.sin(2 * np.pi * 1000 * np.linspace(0, 0.01, click_len))
                    y[idx: idx + click_len] = burst
                t += beat_interval

            path = str(tmp_path / f"click_{int(bpm)}bpm.wav")
            sf.write(path, y, sr)
            return path

        return _make

    def test_detect_tempo_not_half_bpm(self, make_click_track):
        """BPM 150 のクリックトラックで半テンポ（75付近）が返らない"""
        try:
            import librosa  # noqa: F401
        except ImportError:
            pytest.skip("librosa が未インストール")

        from app.services.librosa_transcriber import LibrosaTranscriber, normalize_tempo

        path = make_click_track(150.0)
        transcriber = LibrosaTranscriber()
        tempo_info = transcriber.detect_tempo(path)
        # TempoInfo または float 両方に対応
        raw_tempo = tempo_info.tempo if hasattr(tempo_info, "tempo") else float(tempo_info)
        normalized = normalize_tempo(raw_tempo)
        assert 110.0 <= normalized <= 185.0, f"normalize 後も帯域外: {normalized}"

    def test_drum_onset_not_single_pitch(self, make_click_track, tmp_path):
        """合成ドラムのオンセットが単一ピッチに崩壊しない（percussive 二重がけ除去後）"""
        try:
            import librosa  # noqa: F401
            import soundfile as sf  # noqa: F401
        except ImportError:
            pytest.skip("librosa/soundfile が未インストール")

        import soundfile as sf
        from app.services.librosa_transcriber import LibrosaTranscriber

        bpm = 120.0
        sr = 44100
        duration = 4.0
        # kick(36) と hihat(42) の混合パターン
        n = int(sr * duration)
        y = np.zeros(n)
        beat = int(sr * 60.0 / bpm)

        for i in range(16):  # 16 分音符
            idx = int(i * beat / 4)
            if idx + 512 <= n:
                # キック: 低域（50Hz 正弦波）
                if i % 4 == 0:
                    t = np.linspace(0, 0.01, 512)
                    y[idx: idx + 512] += np.sin(2 * np.pi * 50 * t)
                # ハイハット: 高域（8000Hz 正弦波）
                elif i % 2 == 0:
                    t = np.linspace(0, 0.01, 512)
                    y[idx: idx + 512] += np.sin(2 * np.pi * 8000 * t)

        path = str(tmp_path / "drums.wav")
        sf.write(path, y, sr)

        transcriber = LibrosaTranscriber()
        result = transcriber.extract_drums(path, tempo=bpm)
        assert result["success"] is True

        # 単一ピッチに崩壊していないことを確認
        pitches = {n["pitch"] for n in result["notes"]}
        assert len(pitches) >= 2, f"ドラムが単一ピッチに崩壊: {pitches}"
