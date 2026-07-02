"""
audio_to_4tracks の end-to-end 統合テスト（TDD: Red → Green）

設計書 §3（offsetの適用場所）・§4（BPM float フロー）

検証事項:
  1. normalize_tempo が適用された tempo で量子化される
     → 半テンポ 75.0 を返す detect_tempo でも、result["tempo"] == 150.0
  2. offset 補正後のノート先頭がグリッド原点（0 付近）に揃う
     → offset=1.0 のとき、raw start=1.03 のノートが start≈0.0 になる
  3. audio_to_midi の transcribe_audio 呼び出しにも offset が渡る

外部I/Oはモック（LibrosaTranscriber.detect_tempo / predict / separator）。
"""
import pytest
from unittest.mock import patch, MagicMock, Mock
import numpy as np
from app.models.transcription import TempoInfo


class TestAudioTo4TracksNormalizeAndOffset:
    """audio_to_4tracks が normalize_tempo 済みテンポと offset 補正を正しく伝搬する"""

    def _make_temp_wav(self):
        import tempfile
        f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        f.write(b"dummy audio data")
        f.close()
        return f.name

    def _track_paths(self):
        return {
            "drums": self._make_temp_wav(),
            "bass": self._make_temp_wav(),
            "other": self._make_temp_wav(),
            "vocals": self._make_temp_wav(),
        }

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_normalize_tempo_applied_in_pipeline(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """detect_tempo が normalize 済みの TempoInfo を返し、result["tempo"] がそのまま貫通する

        設計書 §2.2: normalize_tempo は LibrosaTranscriber.detect_tempo 内で適用する。
        magenta.audio_to_4tracks は detect_tempo の戻り値（TempoInfo.tempo）をそのまま使う。

        テストの確認:
          - detect_tempo が TempoInfo(tempo=150.0)（normalize 済み）を返す
          - result["tempo"] == 150.0（float のまま丸めない）
          - transcribe_track が tempo=150.0 で呼ばれる（normalize 済み値で量子化）
        """
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()

        # detect_tempo が normalize 済みテンポ 150.0 を TempoInfo で返す
        # （実際の detect_tempo は内部で normalize_tempo を適用して 150.0 を返す）
        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=150.0,              # normalize_tempo(75.0) = 150.0 適用済み
            beat_times=[0.0, 0.4],
            offset=0.0,
        )
        mock_librosa.extract_drums.return_value = {
            "success": True, "notes": [], "error": None,
        }
        mock_librosa.extract_melody.return_value = {
            "success": True, "notes": [], "error": None,
        }
        mock_get_librosa.return_value = mock_librosa

        mock_basic_pitch = Mock()
        mock_basic_pitch.transcribe_track.return_value = {
            "success": True, "notes": [], "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

        mock_separator = Mock()
        mock_separator.separate.return_value = {"success": True, "tracks": track_paths}
        mock_get_separator.return_value = mock_separator

        try:
            from app.services.magenta import MagentaService
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True

            # TempoInfo.tempo がそのまま result["tempo"] に貫通する（float, 丸めなし）
            assert result["tempo"] == pytest.approx(150.0), (
                f"TempoInfo.tempo が result['tempo'] に貫通していない: got={result['tempo']}"
            )

            # transcribe_track が TempoInfo.tempo=150.0 で呼ばれているか
            for c in mock_basic_pitch.transcribe_track.call_args_list:
                passed_tempo = c.kwargs.get("tempo") if c.kwargs else None
                assert passed_tempo == pytest.approx(150.0), (
                    f"transcribe_track に正規化済み tempo=150.0 が渡されていない: {passed_tempo}"
                )
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                try:
                    os.unlink(p)
                except FileNotFoundError:
                    pass

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_offset_applied_to_result_notes(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """detect_tempo が offset=1.0 を返すとき、実 offset が各変換器へ配線される

        単一契約（設計屋定義）:
          「offset は各トランスクライバー内で量子化の前に一度だけ適用する。
           呼び出し側(audio_to_4tracks)は offset を渡すだけで、
           後段で再適用（apply_offset_to_notes 等）しない。」

        よって audio_to_4tracks は:
          - extract_drums / extract_melody / transcribe_track に real offset(=1.0) を渡す
          - 変換器（モック）が返したノートをそのまま結果へ通す（後段で再シフトしない）
        """
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()

        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=160.0,
            beat_times=[1.0, 1.375],
            offset=1.0,               # 第1拍オフセット
        )
        # 変換器はすでに offset 適用済みのノート（start=0.5）を返す前提
        applied_note = {"pitch": 60, "start": 0.5, "end": 1.0, "velocity": 80}
        mock_librosa.extract_drums.return_value = {
            "success": True,
            "notes": [{"pitch": 36, "start": 0.5, "end": 0.55, "velocity": 80, "drum_type": "kick"}],
            "error": None,
        }
        mock_librosa.extract_melody.return_value = {
            "success": True, "notes": [dict(applied_note)], "error": None,
        }
        mock_get_librosa.return_value = mock_librosa

        mock_basic_pitch = Mock()
        mock_basic_pitch.transcribe_track.return_value = {
            "success": True, "notes": [dict(applied_note)], "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

        mock_separator = Mock()
        mock_separator.separate.return_value = {"success": True, "tracks": track_paths}
        mock_get_separator.return_value = mock_separator

        try:
            from app.services.magenta import MagentaService
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True

            # real offset(=1.0) が extract_drums / extract_melody / transcribe_track に渡っているか
            drums_call = mock_librosa.extract_drums.call_args
            assert drums_call.kwargs.get("offset") == pytest.approx(1.0), (
                f"extract_drums に real offset=1.0 が渡っていない: {drums_call.kwargs}"
            )
            melody_call = mock_librosa.extract_melody.call_args
            assert melody_call.kwargs.get("offset") == pytest.approx(1.0), (
                f"extract_melody に real offset=1.0 が渡っていない: {melody_call.kwargs}"
            )
            for c in mock_basic_pitch.transcribe_track.call_args_list:
                assert c.kwargs.get("offset") == pytest.approx(1.0), (
                    f"transcribe_track に real offset=1.0 が渡っていない: {c.kwargs}"
                )

            # 変換器が返したノートがそのまま通る（後段で再シフトされない）
            bass_notes = result["tracks"].get("bass", {}).get("notes", [])
            assert len(bass_notes) >= 1, "bass ノートが空"
            assert bass_notes[0]["start"] == pytest.approx(0.5, abs=1e-9), (
                f"後段で offset が再適用され二重シフトしている: {bass_notes[0]['start']}"
            )

            drums_notes = result["tracks"].get("drums", {}).get("notes", [])
            assert len(drums_notes) >= 1, "drums ノートが空"
            assert drums_notes[0]["start"] == pytest.approx(0.5, abs=1e-9), (
                f"後段で offset が再適用され二重シフトしている: {drums_notes[0]['start']}"
            )
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                try:
                    os.unlink(p)
                except FileNotFoundError:
                    pass


class TestAudioTo4TracksNoteOffsetApplied:
    """audio_to_4tracks が _transcribe_track へ real offset を配線し、後段で再適用しない

    単一契約（設計屋定義。旧・チームリード指示 §配線2(b) を置き換え）:
      「offset は各トランスクライバー内で量子化の前に一度だけ適用する。
       呼び出し側(audio_to_4tracks)は offset を渡すだけで、
       後段で再適用（apply_offset_to_notes 等）しない。」

    旧設計（audio_to_4tracks レベルで一元的に apply_offset_to_notes する）は、
    各トランスクライバーへ offset=0.0 を渡してから量子化前提のグリッドと
    ズレた事後シフトを行っていたため、offset がグリッドの非整数倍のとき
    タイミングがズレるバグの原因だった（実験屋の実測: 0.30s → 0.33s）。
    """

    def _make_temp_wav(self):
        import tempfile
        f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        f.write(b"dummy audio data")
        f.close()
        return f.name

    def _track_paths(self):
        return {
            "drums": self._make_temp_wav(),
            "bass": self._make_temp_wav(),
            "other": self._make_temp_wav(),
            "vocals": self._make_temp_wav(),
        }

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_note_start_corrected_by_offset_at_4tracks_level(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """offset=0.5 が各変換器へ real offset として渡り、結果は後段で再シフトされない

        新契約（Red→Green 対象）:
          - detect_tempo: offset=0.5 を返す
          - _transcribe_track は offset=0.5 で各変換器を呼ぶ（0.0 で呼んではいけない）
          - 変換器（モック）が返した「補正済みのつもり」のノートをそのまま結果へ通す
            （audio_to_4tracks は自前で apply_offset_to_notes をかけ直さない）
        """
        import os

        audio_path = self._make_temp_wav()
        track_paths = self._track_paths()

        # detect_tempo: offset=0.5（第1拍が 0.5 秒目）
        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=150.0,
            beat_times=[0.5, 0.9],
            offset=0.5,
        )
        # 変換器はすでに offset 適用済みのノート（start=0.0）を返す前提
        applied_note = {"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 80}
        mock_librosa.extract_drums.return_value = {
            "success": True,
            "notes": [{"pitch": 36, "start": 0.0, "end": 0.05, "velocity": 80, "drum_type": "kick"}],
            "error": None,
        }
        mock_librosa.extract_melody.return_value = {
            "success": True,
            "notes": [dict(applied_note)],
            "error": None,
        }
        mock_get_librosa.return_value = mock_librosa

        mock_basic_pitch = Mock()
        mock_basic_pitch.transcribe_track.return_value = {
            "success": True,
            "notes": [dict(applied_note)],
            "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

        mock_separator = Mock()
        mock_separator.separate.return_value = {"success": True, "tracks": track_paths}
        mock_get_separator.return_value = mock_separator

        try:
            from app.services.magenta import MagentaService
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True, f"4tracks failed: {result.get('error')}"

            # real offset(=0.5) が各変換器に渡っているか（0.0 で呼ばれてはいけない）
            drums_call = mock_librosa.extract_drums.call_args
            assert drums_call.kwargs.get("offset") == pytest.approx(0.5), (
                f"extract_drums に real offset=0.5 が渡っていない: {drums_call.kwargs}"
            )
            for c in mock_basic_pitch.transcribe_track.call_args_list:
                assert c.kwargs.get("offset") == pytest.approx(0.5), (
                    f"transcribe_track に real offset=0.5 が渡っていない: {c.kwargs}"
                )

            # 変換器が返したノートがそのまま通る（後段で再シフトされない）
            bass_notes = result["tracks"].get("bass", {}).get("notes", [])
            assert len(bass_notes) >= 1, "bass ノートが空"
            first_start = bass_notes[0]["start"]
            assert first_start == pytest.approx(0.0, abs=1e-9), (
                f"後段で offset が再適用され二重シフトしている: bass notes[0]['start']={first_start}"
            )

            drums_notes = result["tracks"].get("drums", {}).get("notes", [])
            assert len(drums_notes) >= 1, "drums ノートが空"
            drums_start = drums_notes[0]["start"]
            assert drums_start == pytest.approx(0.0, abs=1e-9), (
                f"後段で offset が再適用され二重シフトしている: drums notes[0]['start']={drums_start}"
            )
        finally:
            os.unlink(audio_path)
            for p in track_paths.values():
                try:
                    os.unlink(p)
                except FileNotFoundError:
                    pass

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_normalize_tempo_in_detect_tempo_reflected_in_result(
        self, mock_get_basic_pitch, mock_get_librosa, mock_get_separator
    ):
        """detect_tempo が 75（半テンポ）を生成するとき normalize_tempo で 150 になる配線を確認

        TDD Red フェーズ:
          detect_tempo 内で normalize_tempo が適用されなければ TempoInfo.tempo=75 のまま返る。
          audio_to_4tracks の result["tempo"] も 75 になる。

        テストの設定:
          - 実際の LibrosaTranscriber.detect_tempo をモックせず、
            normalize_tempo がモジュールレベルで差し替えられることを確認する。
          - librosa.beat.beat_track が 75.0 を返すとき、detect_tempo が 150.0 を返す。
        """
        import app.services.librosa_transcriber as lt_mod
        import numpy as np

        raw_bpm = 75.0  # 半テンポ
        # librosa モジュールをモック
        mock_lib = MagicMock()
        mock_lib.load.return_value = (np.zeros(44100, dtype=np.float32), 44100)
        mock_lib.beat.beat_track.return_value = (
            np.array([raw_bpm]),
            np.array([int(44100 * 0.0 / 512), int(44100 * 0.8 / 512)]),
        )
        mock_lib.frames_to_time.return_value = np.array([0.0, 0.8])

        original_lib = lt_mod.librosa
        lt_mod.librosa = mock_lib
        try:
            from app.services.librosa_transcriber import LibrosaTranscriber, normalize_tempo
            t = LibrosaTranscriber()
            result = t.detect_tempo("/dummy.wav")

            # normalize_tempo(75.0) = 150.0 になっているか
            expected = normalize_tempo(raw_bpm)
            assert result.tempo == pytest.approx(expected), (
                f"detect_tempo が normalize_tempo を適用していない: "
                f"got={result.tempo}, expected={expected} (raw_bpm={raw_bpm})"
            )
            assert result.tempo == pytest.approx(150.0), (
                f"半テンポ 75.0 が 150.0 に補正されていない: got={result.tempo}"
            )
        finally:
            lt_mod.librosa = original_lib


class TestAudioToMidiOffsetWiring:
    """audio_to_midi の transcribe_audio 呼び出しに offset が渡ることを確認"""

    def _make_temp_wav(self):
        import tempfile
        f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        f.write(b"dummy audio data")
        f.close()
        return f.name

    @patch("app.services.magenta.get_librosa_transcriber")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_audio_to_midi_passes_offset_to_transcribe_audio(
        self, mock_get_basic_pitch, mock_get_librosa
    ):
        """audio_to_midi が detect_tempo の offset を transcribe_audio に渡す

        現状 Red: audio_to_midi は transcribe_audio を offset なしで呼んでいる。
        """
        import os

        audio_path = self._make_temp_wav()

        # LibrosaTranscriber.detect_tempo が offset=0.8 を返す
        mock_librosa = Mock()
        mock_librosa.detect_tempo.return_value = TempoInfo(
            tempo=160.0,
            beat_times=[0.8, 1.175],
            offset=0.8,
        )
        mock_get_librosa.return_value = mock_librosa

        # BasicPitchService.transcribe_audio のモック
        mock_basic_pitch = Mock()
        mock_basic_pitch.transcribe_audio.return_value = {
            "success": True,
            "tempo": 160.0,
            "notes": [{"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 80}],
            "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

        try:
            from app.services.magenta import MagentaService
            service = MagentaService()
            result = service.audio_to_midi(audio_path)

            # transcribe_audio が offset=0.8 で呼ばれているか確認
            call_args = mock_basic_pitch.transcribe_audio.call_args
            assert call_args is not None, "transcribe_audio が呼ばれていない"
            passed_offset = call_args.kwargs.get("offset") if call_args.kwargs else None
            assert passed_offset == pytest.approx(0.8), (
                f"audio_to_midi の transcribe_audio に offset=0.8 が渡されていない: "
                f"offset={passed_offset}"
            )
        finally:
            os.unlink(audio_path)


@pytest.mark.integration
class TestAudioTo4TracksRealDrumQuantize:
    """audio_to_4tracks を「トランスクライバーを丸ごとモックせず」通す統合テスト

    過剰モック是正（4-3）:
      これまでの統合テストは extract_drums 自体もモックしていたため、
      「audio_to_4tracks が正しい offset を配線しているか」を検証できても
      「実際の量子化ロジック（quantize_to_grid 等）まで含めて正しく動くか」は
      検証できていなかった。

      本テストは LibrosaTranscriber.extract_drums を実体のまま使い、
      Basic Pitch（重い依存）と Demucs 分離のみをモックする。
      「audio_to_4tracks 経由の結果」と「extract_drums を直接呼んだ結果」が
      一致することを確認することで、audio_to_4tracks が real offset を
      正しく配線している（=途中で 0.0 にすり替えたり後段で二重補正したり
      していない）ことを実際の量子化ロジックを通して保証する。
    """

    def _make_temp_wav(self):
        import tempfile
        f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        f.write(b"dummy audio data")
        f.close()
        return f.name

    def _make_wav_with_kick_onset(self, onset_time: float, sr: int = 44100) -> str:
        """指定時刻にキック音を持つ WAV ファイルを生成して返す（test_offset_quantize.py と同様）"""
        import tempfile
        import soundfile as sf
        import numpy as np

        total_dur = max(onset_time + 0.5, 1.0)
        y = np.zeros(int(sr * total_dur), dtype=np.float32)
        t_chunk = np.linspace(0, 0.1, int(sr * 0.1))
        kick = (np.sin(2 * np.pi * 60 * t_chunk) * np.exp(-t_chunk * 20) * 0.8).astype(np.float32)
        s = int(onset_time * sr)
        e = min(s + len(kick), len(y))
        y[s:e] += kick[:e - s]

        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        sf.write(tmp.name, y, sr)
        tmp.close()
        return tmp.name

    @patch("app.services.magenta.get_audio_separator_service")
    @patch("app.services.magenta.get_basic_pitch_service")
    def test_4tracks_drum_notes_match_direct_extract_drums_call(
        self, mock_get_basic_pitch, mock_get_separator
    ):
        """audio_to_4tracks 経由の drums ノートが extract_drums 直接呼び出しと一致する

        LibrosaTranscriber は実体を使う（extract_drums / detect_tempo ともに実処理）。
        Demucs 分離と Basic Pitch のみモックし、drums stem には実際にオンセットを
        含む WAV を割り当てる。

        offset の配線を誤ると（例: audio_to_4tracks が offset=0.0 で
        extract_drums を呼び、後段で apply_offset_to_notes をかけ直すと）、
        直接呼び出しの結果とズレる（グリッド整合が崩れる）。
        """
        import os
        from app.services.librosa_transcriber import get_librosa_transcriber

        drum_wav = self._make_wav_with_kick_onset(onset_time=0.42)
        other_wavs = {
            "bass": self._make_temp_wav(),
            "other": self._make_temp_wav(),
            "vocals": self._make_temp_wav(),
        }
        # audio_to_4tracks は「元音声」から tempo/offset を検出したうえで
        # 各トラックを変換する。drum_wav 自体を元音声として渡すことで、
        # 直接呼び出しの detect_tempo と audio_to_4tracks 内部の detect_tempo が
        # 同一ファイル・同一結果になるようにする（tempo/offset のズレを排除）。
        audio_path = drum_wav

        track_paths = {"drums": drum_wav, **other_wavs}

        # Demucs 分離をモック（drums stem に実オンセット入り WAV を割り当てる）
        mock_separator = Mock()
        mock_separator.separate.return_value = {"success": True, "tracks": track_paths}
        mock_get_separator.return_value = mock_separator

        # Basic Pitch（重い依存）のみモック。vocals は librosa 経路なので影響しない。
        mock_basic_pitch = Mock()
        mock_basic_pitch.transcribe_track.return_value = {
            "success": True, "notes": [], "error": None,
        }
        mock_get_basic_pitch.return_value = mock_basic_pitch

        try:
            from app.services.magenta import MagentaService

            # 実 LibrosaTranscriber で tempo/offset を検出する（audio_to_4tracks 用と直接呼び出し用で共有）
            real_transcriber = get_librosa_transcriber()
            tempo_info = real_transcriber.detect_tempo(drum_wav)

            # 期待値: extract_drums を real offset で直接呼んだ結果
            expected = real_transcriber.extract_drums(
                drum_wav, tempo=tempo_info.tempo, offset=tempo_info.offset
            )
            assert expected["success"] is True
            assert len(expected["notes"]) >= 1, "テスト用オンセットからノートが検出できていない"

            # audio_to_4tracks はキャッシュされた LibrosaTranscriber シングルトンを
            # 遅延 import で取得するため、モックせず実体をそのまま使わせる。
            service = MagentaService()
            result = service.audio_to_4tracks(audio_path)

            assert result["success"] is True, f"4tracks failed: {result.get('error')}"

            actual_notes = result["tracks"].get("drums", {}).get("notes", [])
            assert actual_notes == expected["notes"], (
                f"audio_to_4tracks 経由の drums notes が extract_drums 直接呼び出しと一致しない: "
                f"actual={actual_notes}, expected={expected['notes']}"
            )
        finally:
            os.unlink(drum_wav)
            for p in other_wavs.values():
                os.unlink(p)
