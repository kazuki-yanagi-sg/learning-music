"""
pytest設定・フィクスチャ
"""
import pytest


@pytest.fixture
def client():
    """FastAPIテストクライアント

    app.main は重い外部依存（librosa/basic-pitch 等）を読み込むため、
    フィクスチャ使用時にのみ遅延インポートする。
    これにより、外部依存を持たない純粋ロジックのテストは
    重いライブラリ無しでも収集・実行できる。
    """
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)
