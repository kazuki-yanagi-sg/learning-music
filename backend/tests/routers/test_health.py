"""
ヘルスチェックエンドポイントのテスト

外部プローブが /api/health を叩いて 404 になる問題への対策として、
ヘルスチェックを複数パス（/health, /api/health, /api/v1/health）の
エイリアスとして同一応答できることを検証する。
"""
import pytest


@pytest.mark.parametrize(
    "path",
    ["/health", "/api/health", "/api/v1/health"],
)
def test_health_returns_healthy_for_all_aliases(client, path):
    """3つのヘルスチェックパスがいずれも 200 と {"status":"healthy"} を返す"""
    response = client.get(path)
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_root_still_returns_ok(client):
    """既存ルート / が壊れていないことを確認（{"status":"ok", ...}）"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
