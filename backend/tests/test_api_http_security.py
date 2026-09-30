"""Tests d'API des protections HTTP : en-têtes de sécurité, cache des réponses
d'authentification et origines autorisées par le CORS."""

from conftest import TEST_PASSWORD


def test_every_response_carries_security_headers(client):
    response = client.get("/health")

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert "default-src 'none'" in response.headers["Content-Security-Policy"]


def test_tokens_are_never_cached(client, make_user):
    make_user("cache@example.com")

    response = client.post("/auth/login", data={"username": "cache@example.com", "password": TEST_PASSWORD})

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"


def test_cors_allows_the_frontend_origin(client):
    response = client.options("/sessions/", headers={
        "Origin": "http://localhost:4200",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
    })

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:4200"
    assert "access-control-allow-credentials" not in response.headers


def test_cors_rejects_an_unknown_origin(client):
    response = client.options("/sessions/", headers={
        "Origin": "https://site-malveillant.example",
        "Access-Control-Request-Method": "GET",
    })

    assert "access-control-allow-origin" not in response.headers
