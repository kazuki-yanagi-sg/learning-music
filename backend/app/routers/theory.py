"""
音楽理論解説API

- コード認識
- 進行パターン解説
- インターバル解説
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_theory_info():
    """理論解説APIの情報"""
    return {"message": "音楽理論解説API"}


@router.post("/explain-chord")
async def explain_chord(notes: list[int]):
    """
    コードを解説する

    Args:
        notes: MIDIノート番号のリスト（例: [60, 64, 67] = Cメジャー）
    """
    # TODO: 実装
    return {"chord": "C", "type": "major", "explanation": "明るい響きのメジャーコード"}


@router.post("/explain-progression")
async def explain_progression(chords: list[str]):
    """
    コード進行を解説する

    Args:
        chords: コード名のリスト（例: ["C", "G", "Am", "F"]）
    """
    # TODO: 実装
    return {"progression": chords, "name": "王道進行", "explanation": "アニソンで頻出の進行"}
