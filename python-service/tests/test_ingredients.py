from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_normalize_merges_duplicates():
    payload = {
        "ingredients": [
            {"name": "  Tomate  ", "quantity": 2, "unit": "kg"},
            {"name": "tomate", "quantity": 1, "unit": "KG"},
            {"name": "Cebolla", "quantity": 3, "unit": "unidad"},
        ]
    }
    response = client.post("/ingredients/normalize", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["original_count"] == 3
    assert body["normalized_count"] == 2
    tomate = next(i for i in body["items"] if i["name"] == "tomate")
    assert tomate["quantity"] == 3


def test_normalize_rejects_invalid_quantity():
    payload = {"ingredients": [{"name": "Sal", "quantity": -1, "unit": "g"}]}
    response = client.post("/ingredients/normalize", json=payload)
    assert response.status_code == 422


def test_normalize_rejects_blank_name():
    payload = {"ingredients": [{"name": "   ", "quantity": 1, "unit": "kg"}]}
    response = client.post("/ingredients/normalize", json=payload)
    assert response.status_code == 422


def test_normalize_rejects_empty_list():
    response = client.post("/ingredients/normalize", json={"ingredients": []})
    assert response.status_code == 422


def test_normalize_keeps_small_quantities_visible():
    payload = {"ingredients": [{"name": "Levadura", "quantity": 0.004, "unit": "kg"}]}
    response = client.post("/ingredients/normalize", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["quantity"] == 0.004
