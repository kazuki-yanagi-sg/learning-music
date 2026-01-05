"""
音声楽器分離サービス

Demucsを使用して音声を4トラック（drums, bass, vocals, other）に分離
"""
import os
import tempfile
from pathlib import Path
from typing import Optional

import torch
import torchaudio
import soundfile as sf
import numpy as np

from demucs import pretrained
from demucs.apply import apply_model


class AudioSeparatorService:
    """Demucsを使用した楽器分離"""

    def __init__(self):
        # 出力ディレクトリ
        custom_dir = os.getenv("ANISONG_SEPARATED_DIR")
        if custom_dir:
            self.output_dir = Path(custom_dir)
        else:
            self.output_dir = Path(tempfile.gettempdir()) / "anisong_separated"
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # デバイス設定（Apple Silicon対応）
        if torch.backends.mps.is_available():
            self.device = "mps"
        elif torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"

        # モデルは遅延ロード
        self._model = None

    @property
    def model(self):
        """モデルを遅延ロード"""
        if self._model is None:
            # htdemucs: Hybrid Transformer Demucs（高品質）
            self._model = pretrained.get_model("htdemucs")
            self._model.to(self.device)
        return self._model

    def separate(self, audio_path: str) -> dict:
        """
        音声ファイルを楽器ごとに分離

        Args:
            audio_path: 音声ファイルのパス

        Returns:
            {
                "success": True/False,
                "tracks": {
                    "drums": ドラムトラックのパス,
                    "bass": ベーストラックのパス,
                    "vocals": ボーカルトラックのパス,
                    "other": その他（ギター等）トラックのパス,
                },
                "error": エラーメッセージ（失敗時）
            }
        """
        audio_path = Path(audio_path)
        if not audio_path.exists():
            return {
                "success": False,
                "tracks": {},
                "error": f"Audio file not found: {audio_path}",
            }

        try:
            # 音声を読み込み（soundfileを使用してtorchcodec問題を回避）
            audio_data, sr = sf.read(str(audio_path))

            # numpy配列をtorch tensorに変換
            # soundfileは [samples, channels] 形式で返す
            if audio_data.ndim == 1:
                # モノラル -> ステレオ
                audio_data = np.stack([audio_data, audio_data], axis=1)

            # [samples, channels] -> [channels, samples]
            wav = torch.from_numpy(audio_data.T.astype(np.float32))

            # サンプルレートを44100Hzに統一（Demucsの要件）
            if sr != 44100:
                wav = torchaudio.functional.resample(wav, sr, 44100)
                sr = 44100

            # ステレオに変換（モノラルの場合）
            if wav.shape[0] == 1:
                wav = wav.repeat(2, 1)

            # バッチ次元を追加 [channels, samples] -> [batch, channels, samples]
            wav = wav.unsqueeze(0).to(self.device)

            # 分離実行
            with torch.no_grad():
                sources = apply_model(
                    self.model,
                    wav,
                    device=self.device,
                    progress=False,
                )

            # sources shape: [batch, sources, channels, samples]
            # source order: drums, bass, other, vocals（htdemucsの場合）
            source_names = self.model.sources  # ['drums', 'bass', 'other', 'vocals']

            # 各トラックを保存（soundfileを使用）
            tracks = {}
            stem = audio_path.stem
            for i, name in enumerate(source_names):
                track_path = self.output_dir / f"{stem}_{name}.wav"
                track_audio = sources[0, i].cpu().numpy()
                # [channels, samples] -> [samples, channels]
                track_audio = track_audio.T
                sf.write(str(track_path), track_audio, sr)
                tracks[name] = str(track_path)

                # デバッグ用ログ
                file_size = track_path.stat().st_size / 1024 / 1024
                duration = track_audio.shape[0] / sr
                print(f"[DEBUG] Saved {name} track: {track_path} ({file_size:.2f}MB, {duration:.1f}s)")

            return {
                "success": True,
                "tracks": tracks,
                "error": None,
            }

        except Exception as e:
            return {
                "success": False,
                "tracks": {},
                "error": f"Separation failed: {str(e)}",
            }

    def cleanup(self, tracks: dict) -> None:
        """分離したトラックファイルを削除"""
        for path in tracks.values():
            try:
                p = Path(path)
                if p.exists():
                    p.unlink()
            except Exception:
                pass


# シングルトンインスタンス
_separator_service: Optional[AudioSeparatorService] = None


def get_audio_separator_service() -> AudioSeparatorService:
    """AudioSeparatorServiceのシングルトンを取得"""
    global _separator_service
    if _separator_service is None:
        _separator_service = AudioSeparatorService()
    return _separator_service
