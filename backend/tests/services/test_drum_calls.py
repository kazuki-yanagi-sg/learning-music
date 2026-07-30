"""
extract_drums 内部の librosa 呼び出しを検証する spy テスト（帯域別フロー対応）

テスト仕様: docs/test-spec-timing-drums.md グループ3-2（帯域別フロー版）

保護する原因:
  - 原因1: sr/hop 不整合による時間軸 2 倍ずれ
  - ドラム原因1: percussive 二重がけ

新契約（帯域別フロー）:
  - melspectrogram / power_to_db が帯域ごとに呼ばれる（3帯域分）
  - onset_strength が S= キーワードで呼ばれる（旧フローは y= だった）
  - onset_detect が 3 帯域分 ≧ 3 回呼ばれる
  - onset_strength に lag=2, max_size=3 が渡される（Superflux パラメータ）
  - onset_detect に backtrack=True, delta=0.03 が渡される
  - sr=44100/hop=512 は引き続き一貫

注意: このテストは librosa をインポートするが、実際の音声ファイルは必要としない。
モック/spy で extract_drums が librosa 関数を正しい引数で呼ぶことを確認する。
"""
import pytest
from unittest.mock import patch, MagicMock, call
import numpy as np
from app.services.librosa_transcriber import LibrosaTranscriber


# extract_drums の呼び出し内でのみ librosa をモックするため integration マークは付けない
# （実librosa呼び出しは発生しないため高速）


class TestDrumLibrosaCallsConsistentSrHop:
    """extract_drums 内の librosa 呼び出しが一貫した sr/hop_length を使うことを確認（帯域別フロー）"""

    def _make_mock_librosa(self):
        """librosa のモックを組み立てる（帯域別フロー対応）"""
        mock_lib = MagicMock()
        # load: (y_array, sr) を返す
        mock_lib.load.return_value = (np.zeros(44100, dtype=np.float32), 44100)
        # melspectrogram: mel スペクトログラムを返す（帯域別に呼ばれる）
        mock_lib.feature.melspectrogram.return_value = np.ones((128, 200))
        # power_to_db: dB スケール変換後の配列を返す
        mock_lib.power_to_db.return_value = np.ones((128, 200))
        # onset_strength: フレーム配列を返す（帯域ごとに3回呼ばれる）
        mock_lib.onset.onset_strength.return_value = np.ones(200)
        # onset_detect: フレーム番号配列を返す（帯域ごとに3回呼ばれる）
        mock_lib.onset.onset_detect.return_value = np.array([10, 50, 100])
        # frames_to_time: 時刻配列を返す（帯域ごとに3回呼ばれる）
        mock_lib.frames_to_time.return_value = np.array([0.1, 0.5, 1.0])
        return mock_lib

    def test_drum_librosa_calls_use_consistent_sr_hop(self):
        """onset_strength / onset_detect / frames_to_time が同一 sr=44100 / hop_length=512 で呼ばれる

        帯域別フロー: 3帯域(kick/snare/hihat)それぞれで onset_strength/onset_detect が呼ばれる。
        全呼び出しで sr=44100 かつ hop_length=512 を使っていることを確認。
        """
        transcriber = LibrosaTranscriber()
        mock_lib = self._make_mock_librosa()

        # _bandpass_filter が scipy を使うので signal もモック
        mock_signal = MagicMock()
        mock_signal.butter.return_value = np.ones((6, 6))
        mock_signal.sosfiltfilt.return_value = np.zeros(44100, dtype=np.float32)

        with patch("app.services.librosa_transcriber.librosa", mock_lib), \
             patch("app.services.librosa_transcriber.signal", mock_signal):

            # 音声ファイル存在チェックをバイパスするため存在しないパスではなく
            # Path.exists をパッチして True を返す
            with patch("pathlib.Path.exists", return_value=True):
                transcriber.extract_drums("/fake/drums.wav", tempo=160.0)

        # 新契約: onset_strength が S= キーワードで呼ばれること（帯域別フロー）
        onset_strength_calls = mock_lib.onset.onset_strength.call_args_list
        assert len(onset_strength_calls) >= 3, (
            f"onset_strength が 3 帯域分以上呼ばれていない: {len(onset_strength_calls)} 回"
        )
        for c in onset_strength_calls:
            kwargs = c.kwargs if c.kwargs else {}
            # 新フロー: S= が渡される（旧フローは y= だった）
            assert "S" in kwargs, f"onset_strength に S= が渡っていない: {kwargs}"
            sr_val = kwargs.get("sr", None)
            hop_val = kwargs.get("hop_length", None)
            assert sr_val == 44100, f"onset_strength の sr が 44100 でない: {sr_val}"
            assert hop_val == 512, f"onset_strength の hop_length が 512 でない: {hop_val}"
            # Superflux パラメータ
            assert kwargs.get("lag") == 2, f"onset_strength の lag が 2 でない: {kwargs}"
            assert kwargs.get("max_size") == 3, f"onset_strength の max_size が 3 でない: {kwargs}"

        # 新契約: onset_detect が 3 帯域分以上呼ばれること
        onset_detect_calls = mock_lib.onset.onset_detect.call_args_list
        assert len(onset_detect_calls) >= 3, (
            f"onset_detect が 3 帯域分以上呼ばれていない: {len(onset_detect_calls)} 回"
        )
        # 帯域別 delta: _ONSET_DELTA_BY_BAND の値を使うことを検証
        from app.services.librosa_transcriber import _ONSET_DELTA_BY_BAND
        valid_deltas = set(_ONSET_DELTA_BY_BAND.values())
        for c in onset_detect_calls:
            kwargs = c.kwargs if c.kwargs else {}
            sr_val = kwargs.get("sr", None)
            hop_val = kwargs.get("hop_length", None)
            assert sr_val == 44100, f"onset_detect の sr が 44100 でない: {sr_val}"
            assert hop_val == 512, f"onset_detect の hop_length が 512 でない: {hop_val}"
            # 新フロー: backtrack=True, delta は帯域別（_ONSET_DELTA_BY_BAND の値）
            assert kwargs.get("backtrack") is True, f"onset_detect の backtrack が True でない: {kwargs}"
            actual_delta = kwargs.get("delta")
            assert actual_delta in valid_deltas or any(
                abs(actual_delta - d) < 1e-9 for d in valid_deltas
            ), (
                f"onset_detect の delta={actual_delta} が _ONSET_DELTA_BY_BAND の値でない: "
                f"期待値={valid_deltas}"
            )

        # melspectrogram が 3 帯域分呼ばれること（新フロー）
        melspec_calls = mock_lib.feature.melspectrogram.call_args_list
        assert len(melspec_calls) >= 3, (
            f"melspectrogram が 3 帯域分以上呼ばれていない: {len(melspec_calls)} 回"
        )

        # power_to_db が 3 帯域分呼ばれること（新フロー）
        power_to_db_calls = mock_lib.power_to_db.call_args_list
        assert len(power_to_db_calls) >= 3, (
            f"power_to_db が 3 帯域分以上呼ばれていない: {len(power_to_db_calls)} 回"
        )

        # frames_to_time: sr=44100 かつ hop_length=512 で呼ばれたか
        frames_to_time_calls = mock_lib.frames_to_time.call_args_list
        assert len(frames_to_time_calls) >= 1, "frames_to_time が呼ばれていない"
        for c in frames_to_time_calls:
            kwargs = c.kwargs if c.kwargs else {}
            sr_val = kwargs.get("sr", None)
            hop_val = kwargs.get("hop_length", None)
            assert sr_val == 44100, f"frames_to_time の sr が 44100 でない: {sr_val}"
            assert hop_val == 512, f"frames_to_time の hop_length が 512 でない: {hop_val}"


class TestExtractDrumsNoPercussiveCall:
    """extract_drums が librosa.effects.percussive を呼ばないことを確認

    分離済みドラムトラックに percussive を再適用すると
    オンセットが埋もれる（ドラム原因1の核心）。
    """

    def test_extract_drums_no_percussive_call(self):
        """librosa.effects.percussive が呼ばれない（二重がけ除去の保護）"""
        transcriber = LibrosaTranscriber()

        mock_lib = MagicMock()
        mock_lib.load.return_value = (np.zeros(44100, dtype=np.float32), 44100)
        mock_lib.onset.onset_strength.return_value = np.ones(200)
        mock_lib.onset.onset_detect.return_value = np.array([])
        mock_lib.frames_to_time.return_value = np.array([])

        mock_signal = MagicMock()
        mock_signal.butter.return_value = np.ones((6, 6))
        mock_signal.sosfiltfilt.return_value = np.zeros(44100, dtype=np.float32)

        with patch("app.services.librosa_transcriber.librosa", mock_lib), \
             patch("app.services.librosa_transcriber.signal", mock_signal):
            with patch("pathlib.Path.exists", return_value=True):
                transcriber.extract_drums("/fake/drums.wav", tempo=160.0)

        # percussive が呼ばれていないことを確認
        assert not mock_lib.effects.percussive.called, (
            "librosa.effects.percussive が呼ばれた（分離済み drums への二重がけは禁止）"
        )
