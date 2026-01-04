"""
pytest設定・フィクスチャ
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """FastAPIテストクライアント"""
    return TestClient(app)
