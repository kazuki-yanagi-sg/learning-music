"""
演習問題API

- 問題の取得
- 回答の判定
- フィードバック生成
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_exercise_info():
    """演習APIの情報"""
    return {"message": "演習問題API"}


@router.get("/lesson/{phase}/{lesson}")
async def get_lesson_exercises(phase: int, lesson: int):
    """
    指定されたレッスンの演習問題を取得

    Args:
        phase: フェーズ番号（1-8）
        lesson: レッスン番号
    """
    # TODO: lessonsディレクトリからJSONを読み込む
    return {
        "phase": phase,
        "lesson": lesson,
        "exercises": []
    }


@router.post("/check")
async def check_answer(exercise_id: str, answer: dict):
    """
    回答を判定する

    Args:
        exercise_id: 演習問題ID
        answer: ユーザーの回答
    """
    # TODO: 実装
    return {
        "correct": True,
        "feedback": "正解です！"
    }
