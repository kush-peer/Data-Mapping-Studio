import pytest
from app.models import User


def test_generate_api_key(client, db):
    """Test generating new API key"""
    response = client.post(
        "/api/auth/generate-key",
        json={"email": "newuser@example.com"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "api_key" in data
    assert "user_id" in data

    # Verify user was created in database
    user = db.query(User).filter(User.email == "newuser@example.com").first()
    assert user is not None
    assert user.api_key == data["api_key"]


def test_generate_api_key_existing_user(client, db, test_user):
    """Test generating key for existing user returns same key"""
    response = client.post(
        "/api/auth/generate-key",
        json={"email": test_user.email}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["api_key"] == test_user.api_key
    assert data["user_id"] == test_user.id


def test_validate_api_key_valid(client, auth_headers):
    """Test validating valid API key"""
    response = client.get(
        "/api/auth/validate",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["email"] == "test@example.com"


def test_validate_api_key_missing_header(client):
    """Test validation with missing auth header"""
    response = client.get("/api/auth/validate")

    assert response.status_code == 401
    assert "Missing authorization header" in response.json()["detail"]


def test_validate_api_key_invalid_format(client):
    """Test validation with invalid header format"""
    response = client.get(
        "/api/auth/validate",
        headers={"Authorization": "InvalidFormat"}
    )

    assert response.status_code == 401
    assert "Invalid authorization header" in response.json()["detail"]


def test_validate_api_key_invalid_key(client):
    """Test validation with invalid key"""
    response = client.get(
        "/api/auth/validate",
        headers={"Authorization": "Bearer invalid_key_12345"}
    )

    assert response.status_code == 401
    assert "Invalid API key" in response.json()["detail"]
