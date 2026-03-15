import pytest
from io import BytesIO
from app.models import Schema


def test_create_schema(client, db, test_project, auth_headers):
    """Test creating a new schema"""
    response = client.post(
        "/api/schemas/",
        json={
            "project_id": test_project.id,
            "name": "New Schema",
            "source_type": "csv",
            "fields": [
                {"name": "field1", "type": "string"},
                {"name": "field2", "type": "number"}
            ]
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["name"] == "New Schema"
    assert "schema_id" in data


def test_get_schema(client, test_schema, auth_headers):
    """Test retrieving a schema"""
    response = client.get(
        f"/api/schemas/{test_schema.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_schema.id
    assert data["name"] == test_schema.name
    assert data["source_type"] == "csv"
    assert len(data["fields"]) == 3


def test_get_schema_not_found(client, auth_headers):
    """Test getting non-existent schema"""
    response = client.get(
        "/api/schemas/nonexistent",
        headers=auth_headers
    )

    assert response.status_code == 404
    assert "Schema not found" in response.json()["detail"]


def test_list_schemas(client, db, test_project, test_schema, auth_headers):
    """Test listing schemas in a project"""
    # Create another schema
    schema2 = Schema(
        project_id=test_project.id,
        name="Another Schema",
        source_type="edi",
        fields=[{"name": "edi_field", "type": "string"}]
    )
    db.add(schema2)
    db.commit()

    response = client.get(
        f"/api/schemas/project/{test_project.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["schemas"]) == 2


def test_detect_schema_csv(client, auth_headers):
    """Test schema detection from CSV file"""
    csv_content = b"name,age,salary\nJohn,30,50000\nJane,28,60000"
    files = {"file": ("test.csv", BytesIO(csv_content), "text/csv")}

    response = client.post(
        "/api/schemas/detect",
        files=files,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["source_type"] == "csv"
    assert len(data["schema"]["fields"]) >= 2
    assert any(f["name"] == "name" for f in data["schema"]["fields"])
