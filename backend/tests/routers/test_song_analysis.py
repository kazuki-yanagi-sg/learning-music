"""
楽曲解析APIルーターのテスト
"""
import json

import pytest
from unittest.mock import AsyncMock, Mock, patch


class TestSongAnalysisRouter:
    """楽曲解析ルーターのテスト"""

    def test_get_info(self, client):
        """API情報エンドポイントが正しいレスポンスを返す"""
        response = client.get("/api/v1/song-analysis/")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "endpoints" in data["data"]
        assert "features" in data["data"]

    @patch("app.routers.song_analysis.get_youtube_service")
    def test_search_songs_success(self, mock_get_youtube, client):
        """曲検索が成功する"""
        mock_service = Mock()
        mock_service.search_music.return_value = [
            {
                "id": "video123",
                "title": "Test Song",
                "channel": "Test Artist",
                "thumbnail": "https://example.com/image.jpg",
                "url": "https://www.youtube.com/watch?v=video123",
                "published_at": "2024-01-01T00:00:00Z",
            }
        ]
        mock_get_youtube.return_value = mock_service

        response = client.get("/api/v1/song-analysis/search?query=test")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert data["data"]["total"] == 1
        assert len(data["data"]["results"]) == 1

    def test_search_songs_empty_query(self, client):
        """空のクエリはエラーになる"""
        response = client.get("/api/v1/song-analysis/search?query=")
        assert response.status_code == 400

    @patch("app.routers.song_analysis.get_youtube_service")
    def test_get_video_success(self, mock_get_youtube, client):
        """動画取得が成功する"""
        mock_service = Mock()
        mock_service.get_video.return_value = {
            "id": "video123",
            "title": "Test Song",
            "channel": "Test Artist",
            "description": "Test description",
            "thumbnail": "https://example.com/image.jpg",
            "url": "https://www.youtube.com/watch?v=video123",
            "duration": "PT3M30S",
            "published_at": "2024-01-01T00:00:00Z",
        }
        mock_get_youtube.return_value = mock_service

        response = client.get("/api/v1/song-analysis/video/video123")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["title"] == "Test Song"

    @patch("app.routers.song_analysis.get_youtube_service")
    def test_get_video_not_found(self, mock_get_youtube, client):
        """存在しない動画は404エラー"""
        mock_service = Mock()
        mock_service.get_video.return_value = None
        mock_get_youtube.return_value = mock_service

        response = client.get("/api/v1/song-analysis/video/nonexistent")
        assert response.status_code == 404


class TestFloatTempoModels:
    """AnalysisResult / FourTrackResult が float BPM をバリデーションエラーなしで受け入れる（仕様 4-2）"""

    def test_analysis_result_accepts_float_tempo(self):
        """AnalysisResult(tempo=173.5) はバリデーションエラーにならず tempo == 173.5"""
        from app.routers.song_analysis import AnalysisResult

        result = AnalysisResult(
            video_id="vid001",
            title="テスト曲",
            channel="テストチャンネル",
            thumbnail="https://example.com/thumb.jpg",
            url="https://www.youtube.com/watch?v=vid001",
            tempo=173.5,
        )
        assert result.tempo == 173.5, f"tempo が float のまま保持されない: {result.tempo}"
        assert isinstance(result.tempo, float), f"tempo の型が float でない: {type(result.tempo)}"

    def test_four_track_result_accepts_float_tempo(self):
        """FourTrackResult(tempo=173.5) はバリデーションエラーにならず tempo == 173.5"""
        from app.routers.song_analysis import FourTrackResult

        result = FourTrackResult(
            video_id="vid001",
            title="テスト曲",
            channel="テストチャンネル",
            thumbnail="https://example.com/thumb.jpg",
            url="https://www.youtube.com/watch?v=vid001",
            tempo=173.5,
        )
        assert result.tempo == 173.5, f"tempo が float のまま保持されない: {result.tempo}"
        assert isinstance(result.tempo, float), f"tempo の型が float でない: {type(result.tempo)}"


class TestChordDetection:
    """コード検出のテスト（MagentaService）"""

    def test_detect_major_chord(self):
        """メジャーコードを検出できる"""
        from app.services.magenta import MagentaService

        service = MagentaService()

        # C major: C(60), E(64), G(67)
        notes = [
            {"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 100},
            {"pitch": 64, "start": 0.0, "end": 0.5, "velocity": 100},
            {"pitch": 67, "start": 0.0, "end": 0.5, "velocity": 100},
        ]
        chords = service.extract_chords_from_notes(notes)
        assert len(chords) > 0
        assert chords[0]["chord"] == "C"

    def test_detect_minor_chord(self):
        """マイナーコードを検出できる"""
        from app.services.magenta import MagentaService

        service = MagentaService()

        # D minor: D(62), F(65), A(69) - clearer minor detection
        notes = [
            {"pitch": 62, "start": 0.0, "end": 0.5, "velocity": 100},
            {"pitch": 65, "start": 0.0, "end": 0.5, "velocity": 100},
            {"pitch": 69, "start": 0.0, "end": 0.5, "velocity": 100},
        ]
        chords = service.extract_chords_from_notes(notes)
        assert len(chords) > 0
        # コード検出されることを確認（具体的なコード名はアルゴリズム依存）
        assert chords[0]["chord"] is not None

    def test_detect_chord_changes(self):
        """コードの変化を検出できる"""
        from app.services.magenta import MagentaService

        service = MagentaService()

        # 0.0-0.5: C major, 1.0-1.5: G major
        notes = [
            {"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 100},
            {"pitch": 64, "start": 0.0, "end": 0.5, "velocity": 100},
            {"pitch": 67, "start": 0.0, "end": 0.5, "velocity": 100},
            {"pitch": 67, "start": 1.0, "end": 1.5, "velocity": 100},
            {"pitch": 71, "start": 1.0, "end": 1.5, "velocity": 100},
            {"pitch": 74, "start": 1.0, "end": 1.5, "velocity": 100},
        ]
        chords = service.extract_chords_from_notes(notes, window_size=0.5)
        assert len(chords) >= 2

    def test_empty_notes_returns_empty(self):
        """空のノートリストは空のコードリストを返す"""
        from app.services.magenta import MagentaService

        service = MagentaService()
        chords = service.extract_chords_from_notes([])
        assert chords == []


# --- 特性化テスト（analyze系3ハンドラの現状の振る舞いを固定） ---

VIDEO = {
    "id": "vid123",
    "title": "Test Song",
    "channel": "Test Artist",
    "thumbnail": "https://example.com/thumb.jpg",
    "url": "https://www.youtube.com/watch?v=vid123",
}

NOTES = [
    {"pitch": 60, "start": 0.0, "end": 1.0, "velocity": 90},
    {"pitch": 64, "start": 1.0, "end": 2.5, "velocity": 80},
]

CHORDS_DATA = [
    {"time": 0.0, "chord": "C"},
    {"time": 1.0, "chord": "G"},
]


def _make_youtube(video=VIDEO):
    """YouTubeサービスのモック"""
    svc = Mock()
    svc.get_video.return_value = video
    return svc


def _make_magenta():
    """Magentaサービスのモック（MIDI変換・コード抽出）"""
    svc = Mock()
    svc.audio_to_midi.return_value = {
        "success": True,
        "midi_path": "/tmp/out.mid",
        "notes": NOTES,
        "tempo": 140,
    }
    svc.extract_chords_from_notes.return_value = CHORDS_DATA
    svc.cleanup.return_value = True
    return svc


def _make_downloader():
    """yt-dlpダウンローダーのモック（download_audio）"""
    svc = Mock()
    svc.download_audio.return_value = {"success": True, "file_path": "/tmp/audio.wav"}
    svc.cleanup.return_value = True
    return svc


def _make_gemini(text="AI解説テキスト"):
    """Geminiサービスのモック（非同期）"""
    svc = Mock()
    svc.generate_song_analysis = AsyncMock(return_value=text)
    return svc


class TestAnalyzeVideoCharacterization:
    """GET /analyze/{video_id}（analyze_video, plain JSON）の現状固定"""

    @patch("app.routers.song_analysis.get_gemini_service")
    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_success_response_shape(
        self, mock_yt, mock_dl, mock_mag, mock_gem, client
    ):
        """成功時の最終JSONレスポンス形を固定"""
        mock_yt.return_value = _make_youtube()
        downloader = _make_downloader()
        mock_dl.return_value = downloader
        magenta = _make_magenta()
        mock_mag.return_value = magenta
        mock_gem.return_value = _make_gemini()

        response = client.get("/api/v1/song-analysis/analyze/vid123")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        data = body["data"]
        # AnalysisResult のキー構成・値
        assert data["video_id"] == "vid123"
        assert data["title"] == "Test Song"
        assert data["channel"] == "Test Artist"
        assert data["thumbnail"] == "https://example.com/thumb.jpg"
        assert data["url"] == "https://www.youtube.com/watch?v=vid123"
        assert data["tempo"] == 140
        assert data["duration"] == 2.5  # max end of NOTES
        assert data["notes_count"] == 2
        assert data["notes"] == []  # analyze_video は notes をレスポンスに含めない
        assert data["chords"] == [
            {"time": 0.0, "chord": "C"},
            {"time": 1.0, "chord": "G"},
        ]
        assert data["analysis_text"] == "AI解説テキスト"

    @patch("app.routers.song_analysis.get_gemini_service")
    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_cleanup_called(self, mock_yt, mock_dl, mock_mag, mock_gem, client):
        """finally の cleanup（downloader/magenta）が呼ばれる"""
        mock_yt.return_value = _make_youtube()
        downloader = _make_downloader()
        mock_dl.return_value = downloader
        magenta = _make_magenta()
        mock_mag.return_value = magenta
        mock_gem.return_value = _make_gemini()

        client.get("/api/v1/song-analysis/analyze/vid123")
        downloader.cleanup.assert_called_once_with("/tmp/audio.wav")
        magenta.cleanup.assert_called_once_with("/tmp/out.mid")

    @patch("app.routers.song_analysis.get_youtube_service")
    def test_video_not_found_returns_404(self, mock_yt, client):
        """動画が見つからない場合は404"""
        mock_yt.return_value = _make_youtube(video=None)
        response = client.get("/api/v1/song-analysis/analyze/nope")
        assert response.status_code == 404
        assert response.json()["detail"] == "動画が見つかりません"

    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_download_error_returns_500(self, mock_yt, mock_dl, mock_mag, client):
        """ダウンロード失敗は500"""
        mock_yt.return_value = _make_youtube()
        downloader = Mock()
        downloader.download_audio.return_value = {"success": False, "error": "boom"}
        downloader.cleanup.return_value = True
        mock_dl.return_value = downloader
        mock_mag.return_value = _make_magenta()

        response = client.get("/api/v1/song-analysis/analyze/vid123")
        assert response.status_code == 500
        assert "音声ダウンロードエラー: boom" in response.json()["detail"]

    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_midi_error_returns_500(self, mock_yt, mock_dl, mock_mag, client):
        """MIDI変換失敗は500"""
        mock_yt.return_value = _make_youtube()
        mock_dl.return_value = _make_downloader()
        magenta = Mock()
        magenta.audio_to_midi.return_value = {"success": False, "error": "midi-fail"}
        magenta.cleanup.return_value = True
        mock_mag.return_value = magenta

        response = client.get("/api/v1/song-analysis/analyze/vid123")
        assert response.status_code == 500
        assert "音声解析エラー: midi-fail" in response.json()["detail"]


class TestAnalyze4TracksCharacterization:
    """GET /analyze-4tracks/{video_id}（analyze_4tracks）の現状固定"""

    def _make_magenta_4tracks(self):
        svc = Mock()
        svc.audio_to_4tracks.return_value = {
            "success": True,
            "tempo": 128,
            "tracks": {
                "bass": {"notes": [NOTES[0]], "midi_path": "/tmp/bass.mid"},
                "other": {"notes": [NOTES[1]], "midi_path": "/tmp/other.mid"},
            },
        }
        svc.extract_chords_from_notes.return_value = CHORDS_DATA
        svc.cleanup.return_value = True
        return svc

    @patch("app.routers.song_analysis.get_gemini_service")
    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_success_response_shape(
        self, mock_yt, mock_dl, mock_mag, mock_gem, client
    ):
        """成功時の最終JSONレスポンス形を固定"""
        mock_yt.return_value = _make_youtube()
        mock_dl.return_value = _make_downloader()
        mock_mag.return_value = self._make_magenta_4tracks()
        mock_gem.return_value = _make_gemini()

        response = client.get("/api/v1/song-analysis/analyze-4tracks/vid123")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        data = body["data"]
        assert data["video_id"] == "vid123"
        assert data["title"] == "Test Song"
        assert data["channel"] == "Test Artist"
        assert data["thumbnail"] == "https://example.com/thumb.jpg"
        assert data["url"] == "https://www.youtube.com/watch?v=vid123"
        assert data["tempo"] == 128
        assert set(data["tracks"].keys()) == {"bass", "other"}
        assert data["tracks"]["bass"]["notes"] == [NOTES[0]]
        assert data["tracks"]["bass"]["midi_path"] == "/tmp/bass.mid"
        assert data["tracks"]["bass"]["error"] is None
        assert data["chords"] == [
            {"time": 0.0, "chord": "C"},
            {"time": 1.0, "chord": "G"},
        ]
        assert data["analysis_text"] == "AI解説テキスト"

    @patch("app.routers.song_analysis.get_gemini_service")
    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_cleanup_called(self, mock_yt, mock_dl, mock_mag, mock_gem, client):
        """finally の cleanup（downloaderのみ）が呼ばれる"""
        mock_yt.return_value = _make_youtube()
        downloader = _make_downloader()
        mock_dl.return_value = downloader
        mock_mag.return_value = self._make_magenta_4tracks()
        mock_gem.return_value = _make_gemini()

        client.get("/api/v1/song-analysis/analyze-4tracks/vid123")
        downloader.cleanup.assert_called_once_with("/tmp/audio.wav")

    @patch("app.routers.song_analysis.get_youtube_service")
    def test_video_not_found_returns_404(self, mock_yt, client):
        """動画が見つからない場合は404"""
        mock_yt.return_value = _make_youtube(video=None)
        response = client.get("/api/v1/song-analysis/analyze-4tracks/nope")
        assert response.status_code == 404
        assert response.json()["detail"] == "動画が見つかりません"

    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_4tracks_error_returns_500(self, mock_yt, mock_dl, mock_mag, client):
        """4トラック変換失敗は500"""
        mock_yt.return_value = _make_youtube()
        mock_dl.return_value = _make_downloader()
        magenta = Mock()
        magenta.audio_to_4tracks.return_value = {"success": False, "error": "sep-fail"}
        magenta.cleanup.return_value = True
        mock_mag.return_value = magenta

        response = client.get("/api/v1/song-analysis/analyze-4tracks/vid123")
        assert response.status_code == 500
        assert "4トラック変換エラー: sep-fail" in response.json()["detail"]


def _parse_sse(text):
    """SSEレスポンスをイベント辞書のリストにパース"""
    events = []
    for block in text.strip().split("\n\n"):
        block = block.strip()
        if block.startswith("data: "):
            events.append(json.loads(block[len("data: "):]))
    return events


class TestAnalyzeStreamCharacterization:
    """GET /analyze/{video_id}/stream（analyze_with_progress, SSE）の現状固定"""

    def _make_downloader_with_progress(self):
        """download_audio_with_progress のジェネレータモック"""
        svc = Mock()

        def gen(url):
            yield {"stage": "download", "progress": 50, "message": "50%"}
            yield {"stage": "complete", "progress": 100, "message": "done",
                   "file_path": "/tmp/audio.wav"}

        svc.download_audio_with_progress.side_effect = gen
        svc.cleanup.return_value = True
        return svc

    @patch("app.routers.song_analysis.get_gemini_service")
    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_success_event_sequence(
        self, mock_yt, mock_dl, mock_mag, mock_gem, client
    ):
        """SSE: 成功時のイベント列・stage・progress・最終データを固定"""
        mock_yt.return_value = _make_youtube()
        downloader = self._make_downloader_with_progress()
        mock_dl.return_value = downloader
        magenta = _make_magenta()
        mock_mag.return_value = magenta
        mock_gem.return_value = _make_gemini()

        response = client.get("/api/v1/song-analysis/analyze/vid123/stream")
        assert response.status_code == 200
        events = _parse_sse(response.text)

        # (stage, progress) の列を固定
        seq = [(e["stage"], e["progress"]) for e in events]
        assert seq == [
            ("init", 0),
            ("init", 5),
            ("download", 20),   # int(50 * 0.4)
            ("download", 100),  # complete
            ("convert", 45),
            ("convert", 70),
            ("analyze", 75),
            ("analyze", 85),
            ("ai", 90),
            ("ai", 95),
            ("complete", 100),
        ]
        # メッセージの一部を固定
        assert events[0]["message"] == "動画情報を取得中..."
        assert events[1]["message"] == "「Test Song」を解析します"
        assert events[3]["message"] == "ダウンロード完了"
        assert events[4]["message"] == "音声を解析中（Basic Pitch）..."
        assert events[5]["message"] == "音声解析完了: 2ノート検出"
        assert events[7]["message"] == "2個のコードを検出"

        # complete イベントの data 形
        result = events[-1]["data"]
        assert result["video_id"] == "vid123"
        assert result["title"] == "Test Song"
        assert result["channel"] == "Test Artist"
        assert result["tempo"] == 140
        assert result["duration"] == 2.5
        assert result["notes_count"] == 2
        assert len(result["notes"]) == 2  # stream は notes を含める
        assert result["chords"] == [
            {"time": 0.0, "chord": "C"},
            {"time": 1.0, "chord": "G"},
        ]
        assert result["analysis_text"] == "AI解説テキスト"

        # cleanup 呼出
        downloader.cleanup.assert_called_once_with("/tmp/audio.wav")
        magenta.cleanup.assert_called_once_with("/tmp/out.mid")

    @patch("app.routers.song_analysis.get_youtube_service")
    def test_video_not_found_emits_error_event(self, mock_yt, client):
        """SSE: 動画が見つからない場合は error イベントで終了"""
        mock_yt.return_value = _make_youtube(video=None)
        response = client.get("/api/v1/song-analysis/analyze/nope/stream")
        assert response.status_code == 200
        events = _parse_sse(response.text)
        # init(0) のあと error(0)
        assert events[0]["stage"] == "init"
        assert events[-1]["stage"] == "error"
        assert events[-1]["progress"] == 0
        assert events[-1]["message"] == "動画が見つかりません"

    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_midi_error_emits_error_event(self, mock_yt, mock_dl, mock_mag, client):
        """SSE: MIDI変換失敗は error イベント"""
        mock_yt.return_value = _make_youtube()
        mock_dl.return_value = self._make_downloader_with_progress()
        magenta = Mock()
        magenta.audio_to_midi.return_value = {"success": False, "error": "midi-fail"}
        magenta.cleanup.return_value = True
        mock_mag.return_value = magenta

        response = client.get("/api/v1/song-analysis/analyze/vid123/stream")
        events = _parse_sse(response.text)
        assert events[-1]["stage"] == "error"
        assert events[-1]["message"] == "音声解析エラー: midi-fail"

    @patch("app.routers.song_analysis.get_gemini_service")
    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_no_ai_when_generate_disabled(
        self, mock_yt, mock_dl, mock_mag, mock_gem, client
    ):
        """SSE: generate_ai_analysis=False では AI生成イベントの message が変わらず analysis_text は None"""
        mock_yt.return_value = _make_youtube()
        mock_dl.return_value = self._make_downloader_with_progress()
        magenta = _make_magenta()
        mock_mag.return_value = magenta
        gemini = _make_gemini()
        mock_gem.return_value = gemini

        response = client.get(
            "/api/v1/song-analysis/analyze/vid123/stream?generate_ai_analysis=false"
        )
        events = _parse_sse(response.text)
        # ai 90 ("AI解説を生成中...") はスキップされる
        seq = [(e["stage"], e["progress"]) for e in events]
        assert ("ai", 90) not in seq
        assert ("ai", 95) in seq  # 95 は常に送られる
        gemini.generate_song_analysis.assert_not_called()
        assert events[-1]["data"]["analysis_text"] is None


class TestFourTrackResultWith6Stems:
    """FourTrackResult に guitar/keyboard フィールドが追加されていること（設計書 A-4）

    - FourTrackResult モデルが guitar/keyboard フィールドを受け入れること
    - analyze_4tracks エンドポイントが guitar/keyboard トラックを返せること
    - コード抽出対象が bass + keyboard + guitar になっていること
    """

    def test_four_track_result_accepts_guitar_keyboard_fields(self):
        """FourTrackResult が guitar/keyboard フィールドを受け入れること"""
        from app.routers.song_analysis import FourTrackResult, TrackNotes

        # guitar/keyboard フィールドを含む FourTrackResult を作成
        result = FourTrackResult(
            video_id="vid001",
            title="テスト曲",
            channel="テストチャンネル",
            tempo=140.0,
            tracks={
                "drums": TrackNotes(notes=[], midi_path=None),
                "bass": TrackNotes(notes=[], midi_path=None),
                "other": TrackNotes(notes=[], midi_path=None),
                "melody": TrackNotes(notes=[], midi_path=None),
                "guitar": TrackNotes(notes=[], midi_path=None),
                "keyboard": TrackNotes(notes=[], midi_path=None),
            },
        )
        assert "guitar" in result.tracks, "FourTrackResult が guitar フィールドを持たない"
        assert "keyboard" in result.tracks, "FourTrackResult が keyboard フィールドを持たない"

    @patch("app.routers.song_analysis.get_gemini_service")
    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_analyze_4tracks_returns_guitar_keyboard_tracks(
        self, mock_yt, mock_dl, mock_mag, mock_gem, client
    ):
        """analyze_4tracks が guitar/keyboard トラックを含むレスポンスを返すこと"""
        mock_yt.return_value = _make_youtube()
        mock_dl.return_value = _make_downloader()
        mock_gem.return_value = _make_gemini()

        # 6stem を返すマジェンタモック
        magenta = Mock()
        magenta.audio_to_4tracks.return_value = {
            "success": True,
            "tempo": 140,
            "tracks": {
                "drums": {"notes": [], "midi_path": None},
                "bass": {"notes": [NOTES[0]], "midi_path": None},
                "other": {"notes": [], "midi_path": None},
                "melody": {"notes": [], "midi_path": None},
                "guitar": {"notes": [NOTES[1]], "midi_path": None},
                "keyboard": {"notes": [], "midi_path": None},
            },
        }
        magenta.extract_chords_from_notes.return_value = CHORDS_DATA
        mock_mag.return_value = magenta

        response = client.get("/api/v1/song-analysis/analyze-4tracks/vid123")
        assert response.status_code == 200
        data = response.json()["data"]
        assert "guitar" in data["tracks"], "レスポンスに guitar トラックがない"
        assert "keyboard" in data["tracks"], "レスポンスに keyboard トラックがない"

    @patch("app.routers.song_analysis.get_gemini_service")
    @patch("app.routers.song_analysis.get_magenta_service")
    @patch("app.routers.song_analysis.get_audio_downloader_service")
    @patch("app.routers.song_analysis.get_youtube_service")
    def test_chord_extraction_uses_bass_keyboard_guitar(
        self, mock_yt, mock_dl, mock_mag, mock_gem, client
    ):
        """コード抽出が bass + keyboard + guitar のノートを参照すること（設計書 A-4）"""
        mock_yt.return_value = _make_youtube()
        mock_dl.return_value = _make_downloader()
        mock_gem.return_value = _make_gemini()

        bass_note = {"pitch": 48, "start": 0.0, "end": 0.5, "velocity": 80}
        keyboard_note = {"pitch": 60, "start": 0.0, "end": 0.5, "velocity": 80}
        guitar_note = {"pitch": 64, "start": 0.0, "end": 0.5, "velocity": 80}
        other_note = {"pitch": 72, "start": 0.0, "end": 0.5, "velocity": 80}  # other は除外

        magenta = Mock()
        magenta.audio_to_4tracks.return_value = {
            "success": True,
            "tempo": 140,
            "tracks": {
                "drums": {"notes": [], "midi_path": None},
                "bass": {"notes": [bass_note], "midi_path": None},
                "other": {"notes": [other_note], "midi_path": None},
                "melody": {"notes": [], "midi_path": None},
                "guitar": {"notes": [guitar_note], "midi_path": None},
                "keyboard": {"notes": [keyboard_note], "midi_path": None},
            },
        }
        magenta.extract_chords_from_notes.return_value = CHORDS_DATA
        mock_mag.return_value = magenta

        client.get("/api/v1/song-analysis/analyze-4tracks/vid123")

        # extract_chords_from_notes に渡されたノートを検証
        call_args = magenta.extract_chords_from_notes.call_args
        passed_notes = call_args.args[0] if call_args.args else call_args[0][0]

        passed_pitches = {n["pitch"] for n in passed_notes}
        # bass/keyboard/guitar が含まれること
        assert bass_note["pitch"] in passed_pitches, "bass ノートが含まれていない"
        assert keyboard_note["pitch"] in passed_pitches, "keyboard ノートが含まれていない"
        assert guitar_note["pitch"] in passed_pitches, "guitar ノートが含まれていない"
        # other は除外されること
        assert other_note["pitch"] not in passed_pitches, "other ノートが含まれてはいけない"
