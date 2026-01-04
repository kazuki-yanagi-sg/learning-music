"""
VOICEVOX連携API

- テキストから音声を生成
"""
import os
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

VOICEVOX_HOST = os.getenv("VOICEVOX_HOST", "http://voicevox:50021")


@router.get("/")
async def get_tts_info():
    """TTS APIの情報"""
    return {"message": "VOICEVOX TTS API", "host": VOICEVOX_HOST}


@router.post("/synthesize")
async def synthesize(text: str, speaker_id: int = 1):
    """
    テキストから音声を生成する

    Args:
        text: 読み上げるテキスト
        speaker_id: VOICEVOXのスピーカーID（デフォルト: 1）
    """
    try:
        async with httpx.AsyncClient() as client:
            # 音声合成用のクエリを作成
            query_response = await client.post(
                f"{VOICEVOX_HOST}/audio_query",
                params={"text": text, "speaker": speaker_id}
            )
            query_response.raise_for_status()
            query = query_response.json()

            # 音声を合成
            synthesis_response = await client.post(
                f"{VOICEVOX_HOST}/synthesis",
                params={"speaker": speaker_id},
                json=query
            )
            synthesis_response.raise_for_status()

            return {
                "success": True,
                "audio": synthesis_response.content.hex()  # バイナリを16進数で返す
            }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"VOICEVOX error: {str(e)}")
