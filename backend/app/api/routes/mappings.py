from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import json
from app.database import get_db
from app.models import Mapping, Schema, Project, Execution
from app.engine.executor import ExecutionEngine
from app.services.llm_service import LLMService

router = APIRouter(prefix="/api/mappings", tags=["mappings"])

execution_engine = ExecutionEngine()
llm_service = LLMService()


@router.post("/")
async def create_mapping(
    project_id: str,
    source_schema_id: str,
    target_schema_id: str,
    name: str = None,
    rules: List[dict] = None,
    db: Session = Depends(get_db)
):
    """
    Create a new mapping between two schemas.
    """
    try:
        # Verify schemas exist
        source_schema = db.query(Schema).filter(Schema.id == source_schema_id).first()
        target_schema = db.query(Schema).filter(Schema.id == target_schema_id).first()

        if not source_schema or not target_schema:
            raise HTTPException(status_code=404, detail="Schema not found")

        # Create mapping
        mapping = Mapping(
            project_id=project_id,
            source_schema_id=source_schema_id,
            target_schema_id=target_schema_id,
            name=name or f"{source_schema.name} -> {target_schema.name}",
            rules=rules or []
        )

        db.add(mapping)
        db.commit()
        db.refresh(mapping)

        return {
            "status": "success",
            "mapping_id": mapping.id,
            "name": mapping.name
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{mapping_id}")
async def get_mapping(mapping_id: str, db: Session = Depends(get_db)):
    """
    Get a mapping by ID.
    """
    mapping = db.query(Mapping).filter(Mapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    source_schema = db.query(Schema).filter(Schema.id == mapping.source_schema_id).first()
    target_schema = db.query(Schema).filter(Schema.id == mapping.target_schema_id).first()

    return {
        "id": mapping.id,
        "name": mapping.name,
        "source_schema": {
            "id": source_schema.id,
            "name": source_schema.name,
            "source_type": source_schema.source_type,
            "fields": source_schema.fields
        },
        "target_schema": {
            "id": target_schema.id,
            "name": target_schema.name,
            "source_type": target_schema.source_type,
            "fields": target_schema.fields
        },
        "rules": mapping.rules,
        "created_at": mapping.created_at.isoformat()
    }


@router.post("/{mapping_id}/suggest")
async def suggest_mappings(mapping_id: str, db: Session = Depends(get_db)):
    """
    Get AI-suggested field mappings.
    """
    try:
        mapping = db.query(Mapping).filter(Mapping.id == mapping_id).first()
        if not mapping:
            raise HTTPException(status_code=404, detail="Mapping not found")

        source_schema = db.query(Schema).filter(Schema.id == mapping.source_schema_id).first()
        target_schema = db.query(Schema).filter(Schema.id == mapping.target_schema_id).first()

        # Get suggestions from Claude
        suggestions = await llm_service.suggest_mappings(
            source_schema.fields if source_schema.fields else {"fields": []},
            target_schema.fields if target_schema.fields else {"fields": []}
        )

        return {
            "status": "success",
            "mapping_id": mapping_id,
            "suggestions": suggestions
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{mapping_id}/execute")
async def execute_mapping(
    mapping_id: str,
    source_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Execute a mapping on source data.
    """
    try:
        mapping = db.query(Mapping).filter(Mapping.id == mapping_id).first()
        if not mapping:
            raise HTTPException(status_code=404, detail="Mapping not found")

        source_schema = db.query(Schema).filter(Schema.id == mapping.source_schema_id).first()
        target_schema = db.query(Schema).filter(Schema.id == mapping.target_schema_id).first()

        # Save uploaded file temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            content = await source_file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Execute mapping
        result = await execution_engine.execute_mapping(
            mapping_id=mapping_id,
            source_file_path=tmp_path,
            source_schema={"fields": source_schema.fields} if source_schema.fields else {"fields": []},
            target_schema={"fields": target_schema.fields} if target_schema.fields else {"fields": []},
            mapping_rules=mapping.rules,
            source_type=source_schema.source_type
        )

        # Save execution record
        execution = Execution(
            mapping_id=mapping_id,
            status=result["status"],
            records_processed=result["records_processed"],
            records_failed=result["records_failed"],
            output_file_path=result.get("output_file"),
            errors=result.get("errors", [])
        )

        db.add(execution)
        db.commit()

        return {
            "status": "success",
            "execution_id": execution.id,
            "result": result
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{mapping_id}/sample")
async def get_sample_output(
    mapping_id: str,
    source_file: UploadFile = File(...),
    sample_size: int = 10,
    db: Session = Depends(get_db)
):
    """
    Preview sample transformation output (first N records).
    """
    try:
        mapping = db.query(Mapping).filter(Mapping.id == mapping_id).first()
        if not mapping:
            raise HTTPException(status_code=404, detail="Mapping not found")

        source_schema = db.query(Schema).filter(Schema.id == mapping.source_schema_id).first()
        target_schema = db.query(Schema).filter(Schema.id == mapping.target_schema_id).first()

        # Save uploaded file temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            content = await source_file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Get sample output
        result = await execution_engine.get_sample_output(
            source_file_path=tmp_path,
            source_schema={"fields": source_schema.fields} if source_schema.fields else {"fields": []},
            target_schema={"fields": target_schema.fields} if target_schema.fields else {"fields": []},
            mapping_rules=mapping.rules,
            source_type=source_schema.source_type,
            sample_size=sample_size
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/project/{project_id}")
async def list_mappings(project_id: str, db: Session = Depends(get_db)):
    """
    List all mappings in a project.
    """
    mappings = db.query(Mapping).filter(Mapping.project_id == project_id).all()

    return {
        "status": "success",
        "mappings": [
            {
                "id": m.id,
                "name": m.name,
                "source_schema_id": m.source_schema_id,
                "target_schema_id": m.target_schema_id,
                "rule_count": len(m.rules) if m.rules else 0,
                "created_at": m.created_at.isoformat()
            }
            for m in mappings
        ]
    }
