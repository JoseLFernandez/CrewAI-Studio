import os
import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path):
    os.environ["DB_URL"] = f"sqlite:///{(tmp_path / 'test.db')}"
    import backend.main as main
    import db_utils
    importlib.reload(db_utils)
    importlib.reload(main)
    with TestClient(main.app) as c:
        yield c


def test_create_and_get_flow(client):
    response = client.post("/flows", json={"nodes": [], "edges": []})
    assert response.status_code == 200
    flow_id = response.json()["id"]

    get_res = client.get(f"/flows/{flow_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == flow_id
    assert data["nodes"] == []
    assert data["edges"] == []

