from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from app.database import get_db
from app.models import Schema, Project
from app.connectors import CSVConnector, EDIConnector, JSONConnector, DatabaseConnector, RESTConnector
from app.services.llm_service import LLMService

router = APIRouter(prefix="/api/schemas", tags=["schemas"])

# Map file extensions to connector types
CONNECTOR_MAP = {
    "csv": CSVConnector,
    "tsv": CSVConnector,
    "txt": CSVConnector,
    "edi": EDIConnector,
    "x12": EDIConnector,
    "json": JSONConnector,
}


@router.post("/detect")
async def detect_schema(
    file: UploadFile = File(...),
    project_id: str = None,
    db: Session = Depends(get_db)
):
    """
    Upload a data file and auto-detect schema using AI.
    """
    try:
        # Read file content
        content = await file.read()

        # Determine file type
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else "csv"
        connector_class = CONNECTOR_MAP.get(file_ext, CSVConnector)

        # Create connector and detect schema
        connector = connector_class()
        schema = await connector.detect_schema(file_content=content)

        # Enhance with Claude if API key available
        llm = LLMService()
        if llm.client:
            # For MVP, just use basic schema detection
            # Claude enhancement can be added in Phase 2
            pass

        return {
            "status": "success",
            "filename": file.filename,
            "source_type": file_ext,
            "schema": schema
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Schema detection failed: {str(e)}")


@router.post("/")
async def create_schema(
    project_id: str,
    name: str,
    source_type: str,
    fields: List[dict],
    db: Session = Depends(get_db)
):
    """
    Create a new schema in a project.
    """
    try:
        # Verify project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Create schema
        schema = Schema(
            project_id=project_id,
            name=name,
            source_type=source_type,
            fields=fields
        )

        db.add(schema)
        db.commit()
        db.refresh(schema)

        return {
            "status": "success",
            "schema_id": schema.id,
            "name": schema.name
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{schema_id}")
async def get_schema(schema_id: str, db: Session = Depends(get_db)):
    """
    Get a schema by ID.
    """
    schema = db.query(Schema).filter(Schema.id == schema_id).first()
    if not schema:
        raise HTTPException(status_code=404, detail="Schema not found")

    return {
        "id": schema.id,
        "name": schema.name,
        "source_type": schema.source_type,
        "fields": schema.fields,
        "created_at": schema.created_at.isoformat()
    }


@router.get("/project/{project_id}")
async def list_schemas(project_id: str, db: Session = Depends(get_db)):
    """
    List all schemas in a project.
    """
    schemas = db.query(Schema).filter(Schema.project_id == project_id).all()

    return {
        "status": "success",
        "schemas": [
            {
                "id": s.id,
                "name": s.name,
                "source_type": s.source_type,
                "field_count": len(s.fields) if s.fields else 0,
                "created_at": s.created_at.isoformat()
            }
            for s in schemas
        ]
    }
