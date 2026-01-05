"""
楽曲解析API（YouTube + yt-dlp + Demucs + Basic Pitch）

4トラック分離 → MIDI変換 → コード解説
"""
import asyncio
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator

from app.services import (
    get_youtube_service,
    get_audio_downloader_service,
    get_magenta_service,
    get_gemini_service,
)

router = APIRouter()


class ChordInfo(BaseModel):
    """コード情報"""
    time: float
    chord: str


class NoteInfo(BaseModel):
    """ノート情報"""
    pitch: int
    start: float
    end: float
    velocity: int = 80


class AnalysisResult(BaseModel):
    """解析結果"""
    video_id: str
    title: str
    channel: str
    thumbnail: Optional[str] = None
    url: Optional[str] = None

    # 解析データ
    tempo: Optional[int] = None
    duration: Optional[float] = None
    notes_count: int = 0
    notes: list[NoteInfo] = []  # ピアノロール表示用
    chords: list[ChordInfo] = []

    # AI解説
    analysis_text: Optional[str] = None


@router.get("/")
async def get_song_analysis_info():
    """楽曲解析APIの情報"""
    return {
        "success": True,
        "data": {
            "message": "楽曲解析API（YouTube + yt-dlp + Demucs + Basic Pitch）",
            "endpoints": {
                "/search": "曲を検索（クエリ必須）",
                "/video/{video_id}": "動画詳細を取得",
                "/analyze/{video_id}": "曲を解析（フル楽曲）",
                "/analyze/{video_id}/stream": "曲を解析（進捗ストリーミング）",
            },
            "features": {
                "full_song_analysis": True,
                "analyzable": [
                    "コード進行（全体）",
                    "メロディライン",
                    "テンポ",
                    "曲構成",
                ],
            }
        }
    }


@router.get("/search")
async def search_songs(query: str, limit: int = 10):
    """
    YouTubeで曲を検索

    Args:
        query: 検索クエリ（曲名、アーティスト名など）
        limit: 取得件数（デフォルト: 10、最大: 25）
    """
    if not query:
        raise HTTPException(status_code=400, detail="検索クエリを入力してください")

    limit = min(limit, 25)

    try:
        youtube = get_youtube_service()
        videos = youtube.search_music(query, limit)

        return {
            "success": True,
            "data": {
                "query": query,
                "total": len(videos),
                "results": videos,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"検索エラー: {str(e)}")


@router.get("/video/{video_id}")
async def get_video(video_id: str):
    """
    動画詳細を取得

    Args:
        video_id: YouTubeの動画ID
    """
    try:
        youtube = get_youtube_service()
        video = youtube.get_video(video_id)

        if not video:
            raise HTTPException(status_code=404, detail="動画が見つかりません")

        return {
            "success": True,
            "data": video,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"取得エラー: {str(e)}")


async def analyze_with_progress(video_id: str, generate_ai_analysis: bool = True) -> AsyncGenerator[str, None]:
    """
    解析を実行し、進捗をSSEでストリーミング
    """
    audio_path = None
    midi_path = None

    def send_event(stage: str, progress: int, message: str, data: dict = None):
        event_data = {
            "stage": stage,
            "progress": progress,
            "message": message,
        }
        if data:
            event_data["data"] = data
        return f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"

    try:
        # 1. YouTubeから動画情報を取得
        yield send_event("init", 0, "動画情報を取得中...")
        await asyncio.sleep(0)

        youtube = get_youtube_service()
        video = youtube.get_video(video_id)

        if not video:
            yield send_event("error", 0, "動画が見つかりません")
            return

        video_url = video["url"]
        yield send_event("init", 5, f"「{video['title']}」を解析します")
        await asyncio.sleep(0)

        # 2. yt-dlpで音声をダウンロード（進捗付き）
        downloader = get_audio_downloader_service()

        for progress_event in downloader.download_audio_with_progress(video_url):
            stage = progress_event["stage"]
            progress = progress_event["progress"]
            message = progress_event["message"]

            if stage == "error":
                yield send_event("error", 0, message)
                return
            elif stage == "complete":
                audio_path = progress_event["file_path"]
                yield send_event("download", 100, "ダウンロード完了")
                await asyncio.sleep(0)
            else:
                # ダウンロード進捗を0-40%にマッピング
                mapped_progress = int(progress * 0.4)
                yield send_event("download", mapped_progress, message)
                await asyncio.sleep(0)

        # 3. Basic Pitchで音声を解析（MIDI変換）
        yield send_event("convert", 45, "音声を解析中（Basic Pitch）...")
        await asyncio.sleep(0)

        magenta = get_magenta_service()
        midi_result = magenta.audio_to_midi(audio_path)

        if not midi_result["success"]:
            yield send_event("error", 0, f"音声解析エラー: {midi_result['error']}")
            return

        midi_path = midi_result["midi_path"]
        notes = midi_result.get("notes", [])
        tempo = midi_result.get("tempo", 120)

        yield send_event("convert", 70, f"音声解析完了: {len(notes)}ノート検出")
        await asyncio.sleep(0)

        # 4. コード進行を抽出
        yield send_event("analyze", 75, "コード進行を抽出中...")
        await asyncio.sleep(0)

        chords_data = magenta.extract_chords_from_notes(notes)
        chords = [{"time": c["time"], "chord": c["chord"]} for c in chords_data]

        yield send_event("analyze", 85, f"{len(chords)}個のコードを検出")
        await asyncio.sleep(0)

        # 5. AI解説生成（オプション）
        analysis_text = None
        if generate_ai_analysis and chords:
            yield send_event("ai", 90, "AI解説を生成中...")
            await asyncio.sleep(0)
            try:
                gemini = get_gemini_service()
                chord_list = chords[:20]
                analysis_text = await gemini.generate_song_analysis(
                    track_name=video["title"],
                    artist=video["channel"],
                    key="",
                    mode="",
                    tempo=tempo,
                    chords=chord_list,
                    notes_count=len(notes),
                )
            except Exception as e:
                analysis_text = f"AI解説の生成に失敗しました: {str(e)}"

        yield send_event("ai", 95, "AI解説完了")
        await asyncio.sleep(0)

        # 6. 曲の長さを計算
        duration = max((n.get("end", 0) for n in notes), default=0) if notes else 0

        # 7. 結果を送信（最初の500ノートのみ）
        notes_for_response = [
            {"pitch": n["pitch"], "start": n["start"], "end": n["end"], "velocity": n.get("velocity", 80)}
            for n in notes[:500]
        ]
        result = {
            "video_id": video_id,
            "title": video["title"],
            "channel": video["channel"],
            "thumbnail": video.get("thumbnail"),
            "url": video["url"],
            "tempo": tempo,
            "duration": round(duration, 2),
            "notes_count": len(notes),
            "notes": notes_for_response,
            "chords": chords[:50],
            "analysis_text": analysis_text,
        }

        yield send_event("complete", 100, "解析完了", result)
        await asyncio.sleep(0)

    except Exception as e:
        yield send_event("error", 0, f"解析エラー: {str(e)}")

    finally:
        # クリーンアップ
        try:
            if audio_path:
                downloader = get_audio_downloader_service()
                downloader.cleanup(audio_path)
            if midi_path:
                magenta = get_magenta_service()
                magenta.cleanup(midi_path)
        except Exception:
            pass


async def simple_sse_test():
    """シンプルなSSEテスト"""
    for i in range(5):
        yield f"data: {{\"count\": {i}}}\n\n"
        await asyncio.sleep(1)
    yield "data: {\"done\": true}\n\n"


@router.get("/sse-test")
async def sse_test():
    """SSEテストエンドポイント"""
    return StreamingResponse(
        simple_sse_test(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/analyze/{video_id}/stream")
async def analyze_video_stream(video_id: str, generate_ai_analysis: bool = True):
    """
    曲を解析する（SSEストリーミング）

    Args:
        video_id: YouTubeの動画ID
        generate_ai_analysis: AI解説を生成するか（デフォルト: True）

    Returns:
        Server-Sent Events ストリーム
    """
    return StreamingResponse(
        analyze_with_progress(video_id, generate_ai_analysis),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/analyze/{video_id}")
async def analyze_video(video_id: str, generate_ai_analysis: bool = True):
    """
    曲を解析する（yt-dlp → Basic Pitch → コード認識 → AI解説）

    Args:
        video_id: YouTubeの動画ID
        generate_ai_analysis: AI解説を生成するか（デフォルト: True）
    """
    audio_path = None
    midi_path = None

    try:
        # 1. YouTubeから動画情報を取得
        youtube = get_youtube_service()
        video = youtube.get_video(video_id)

        if not video:
            raise HTTPException(status_code=404, detail="動画が見つかりません")

        video_url = video["url"]

        # 2. yt-dlpで音声をダウンロード
        downloader = get_audio_downloader_service()
        download_result = downloader.download_audio(video_url)

        if not download_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"音声ダウンロードエラー: {download_result['error']}"
            )

        audio_path = download_result["file_path"]

        # 3. Basic Pitchで音声を解析
        magenta = get_magenta_service()
        midi_result = magenta.audio_to_midi(audio_path)

        if not midi_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"音声解析エラー: {midi_result['error']}"
            )

        midi_path = midi_result["midi_path"]
        notes = midi_result.get("notes", [])
        tempo = midi_result.get("tempo", 120)

        # 4. コード進行を抽出
        chords_data = magenta.extract_chords_from_notes(notes)
        chords = [ChordInfo(time=c["time"], chord=c["chord"]) for c in chords_data]

        # 5. AI解説生成（オプション）
        analysis_text = None
        if generate_ai_analysis and chords:
            try:
                gemini = get_gemini_service()
                chord_list = [{"chord": c.chord, "time": c.time} for c in chords[:20]]
                analysis_text = await gemini.generate_song_analysis(
                    track_name=video["title"],
                    artist=video["channel"],
                    key="",
                    mode="",
                    tempo=tempo,
                    chords=chord_list,
                    notes_count=len(notes),
                )
            except Exception as e:
                analysis_text = f"AI解説の生成に失敗しました: {str(e)}"

        # 曲の長さを計算
        duration = max((n.get("end", 0) for n in notes), default=0) if notes else 0

        # 結果を返す
        result = AnalysisResult(
            video_id=video_id,
            title=video["title"],
            channel=video["channel"],
            thumbnail=video.get("thumbnail"),
            url=video["url"],
            tempo=tempo,
            duration=round(duration, 2),
            notes_count=len(notes),
            chords=chords[:50],
            analysis_text=analysis_text,
        )

        return {
            "success": True,
            "data": result,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析エラー: {str(e)}")

    finally:
        # 一時ファイルをクリーンアップ
        try:
            if audio_path:
                downloader = get_audio_downloader_service()
                downloader.cleanup(audio_path)
            if midi_path:
                magenta = get_magenta_service()
                magenta.cleanup(midi_path)
        except Exception:
            pass


class TrackNotes(BaseModel):
    """トラックのノート情報"""
    notes: list[dict] = []
    midi_path: Optional[str] = None
    error: Optional[str] = None


class FourTrackResult(BaseModel):
    """4トラック解析結果"""
    video_id: str
    title: str
    channel: str
    thumbnail: Optional[str] = None
    url: Optional[str] = None
    tempo: int = 120
    tracks: dict[str, TrackNotes] = {}
    chords: list[ChordInfo] = []
    analysis_text: Optional[str] = None


@router.get("/analyze-4tracks/{video_id}")
async def analyze_4tracks(video_id: str):
    """
    曲を4トラックに分離して解析

    Demucsで楽器分離 → 各パートをMIDI変換 → コード進行解説

    Args:
        video_id: YouTubeの動画ID

    Returns:
        4トラック（drums, bass, other, vocals）のノート情報とコード解説
    """
    audio_path = None

    try:
        # 1. YouTubeから動画情報を取得
        youtube = get_youtube_service()
        video = youtube.get_video(video_id)

        if not video:
            raise HTTPException(status_code=404, detail="動画が見つかりません")

        video_url = video["url"]

        # 2. yt-dlpで音声をダウンロード
        downloader = get_audio_downloader_service()
        download_result = downloader.download_audio(video_url)

        if not download_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"音声ダウンロードエラー: {download_result['error']}"
            )

        audio_path = download_result["file_path"]

        # 3. 4トラック分離 → MIDI変換
        magenta = get_magenta_service()
        result = magenta.audio_to_4tracks(audio_path)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"4トラック変換エラー: {result['error']}"
            )

        tracks = result["tracks"]
        tempo = result["tempo"]

        # 4. コード進行を抽出（ベース + other から）
        all_notes = []
        for track_type in ["bass", "other"]:
            if track_type in tracks and tracks[track_type].get("notes"):
                all_notes.extend(tracks[track_type]["notes"])

        chords_data = magenta.extract_chords_from_notes(all_notes)
        chords = [ChordInfo(time=c["time"], chord=c["chord"]) for c in chords_data]

        # 5. AI解説生成（コード進行の解説）
        analysis_text = None
        if chords:
            try:
                gemini = get_gemini_service()
                chord_list = [{"chord": c.chord, "time": c.time} for c in chords[:20]]
                analysis_text = await gemini.generate_song_analysis(
                    track_name=video["title"],
                    artist=video["channel"],
                    key="",
                    mode="",
                    tempo=tempo,
                    chords=chord_list,
                    notes_count=len(all_notes),
                )
            except Exception as e:
                analysis_text = f"AI解説の生成に失敗しました: {str(e)}"

        # 結果を返す
        track_results = {}
        for track_type, track_data in tracks.items():
            track_results[track_type] = TrackNotes(
                notes=track_data.get("notes", []),
                midi_path=track_data.get("midi_path"),
                error=track_data.get("error"),
            )

        return {
            "success": True,
            "data": FourTrackResult(
                video_id=video_id,
                title=video["title"],
                channel=video["channel"],
                thumbnail=video.get("thumbnail"),
                url=video["url"],
                tempo=tempo,
                tracks=track_results,
                chords=chords[:50],
                analysis_text=analysis_text,
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析エラー: {str(e)}")

    finally:
        # 一時ファイルをクリーンアップ
        try:
            if audio_path:
                downloader = get_audio_downloader_service()
                downloader.cleanup(audio_path)
        except Exception:
            pass
