import pytest
from io import BytesIO
from app.models import Mapping, Schema


def test_create_mapping(client, db, test_project, test_schema, auth_headers):
    """Test creating a new mapping"""
    # Create target schema
    target_schema = Schema(
        project_id=test_project.id,
        name="Target Schema",
        source_type="csv",
        fields=[
            {"name": "id", "type": "string"},
            {"name": "name", "type": "string"},
        ]
    )
    db.add(target_schema)
    db.commit()
    db.refresh(target_schema)

    response = client.post(
        "/api/mappings/",
        json={
            "project_id": test_project.id,
            "source_schema_id": test_schema.id,
            "target_schema_id": target_schema.id,
            "name": "Test Mapping",
            "rules": [
                {"source_field": "id", "target_field": "id"},
                {"source_field": "name", "target_field": "name"}
            ]
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["name"] == "Test Mapping"
    assert "mapping_id" in data


def test_get_mapping(client, db, test_project, test_schema, auth_headers):
    """Test retrieving a mapping"""
    # Create target schema
    target_schema = Schema(
        project_id=test_project.id,
        name="Target Schema",
        source_type="csv",
        fields=[{"name": "output_field", "type": "string"}]
    )
    db.add(target_schema)
    db.commit()
    db.refresh(target_schema)

    # Create mapping
    mapping = Mapping(
        project_id=test_project.id,
        source_schema_id=test_schema.id,
        target_schema_id=target_schema.id,
        name="Test Mapping",
        rules=[]
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)

    response = client.get(
        f"/api/mappings/{mapping.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == mapping.id
    assert data["name"] == "Test Mapping"
    assert data["source_schema"]["id"] == test_schema.id
    assert data["target_schema"]["id"] == target_schema.id


def test_list_mappings(client, db, test_project, test_schema, auth_headers):
    """Test listing mappings in a project"""
    # Create target schema
    target_schema = Schema(
        project_id=test_project.id,
        name="Target Schema",
        source_type="csv",
        fields=[{"name": "output", "type": "string"}]
    )
    db.add(target_schema)
    db.commit()
    db.refresh(target_schema)

    # Create mappings
    for i in range(2):
        mapping = Mapping(
            project_id=test_project.id,
            source_schema_id=test_schema.id,
            target_schema_id=target_schema.id,
            name=f"Mapping {i+1}",
            rules=[]
        )
        db.add(mapping)
    db.commit()

    response = client.get(
        f"/api/mappings/project/{test_project.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["mappings"]) == 2


def test_suggest_mappings(client, db, test_project, test_schema, auth_headers):
    """Test getting mapping suggestions from AI"""
    # Create target schema with similar field names
    target_schema = Schema(
        project_id=test_project.id,
        name="Target Schema",
        source_type="csv",
        fields=[
            {"name": "id", "type": "string"},
            {"name": "name", "type": "string"},
            {"name": "amount", "type": "number"}
        ]
    )
    db.add(target_schema)
    db.commit()
    db.refresh(target_schema)

    # Create mapping
    mapping = Mapping(
        project_id=test_project.id,
        source_schema_id=test_schema.id,
        target_schema_id=target_schema.id,
        name="Test Mapping",
        rules=[]
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)

    response = client.post(
        f"/api/mappings/{mapping.id}/suggest",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "suggestions" in data
    # Suggestions should include at least some mappings
    assert len(data["suggestions"]) > 0


def test_get_sample_output(client, db, test_project, test_schema, auth_headers):
    """Test getting sample output from mapping"""
    # Create target schema
    target_schema = Schema(
        project_id=test_project.id,
        name="Target Schema",
        source_type="csv",
        fields=[
            {"name": "id", "type": "string"},
            {"name": "name", "type": "string"}
        ]
    )
    db.add(target_schema)
    db.commit()
    db.refresh(target_schema)

    # Create mapping
    mapping = Mapping(
        project_id=test_project.id,
        source_schema_id=test_schema.id,
        target_schema_id=target_schema.id,
        name="Test Mapping",
        rules=[]
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)

    # Create test CSV file
    csv_content = b"id,name,amount\n1,John,100\n2,Jane,200"
    files = {"source_file": ("test.csv", BytesIO(csv_content), "text/csv")}

    response = client.post(
        f"/api/mappings/{mapping.id}/sample",
        files=files,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "sample_data" in data
