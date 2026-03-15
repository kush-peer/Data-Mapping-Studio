from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models import Project, User, Team
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    team_id: Optional[str] = None


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    user_id: str
    team_id: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


@router.post("/", response_model=dict)
async def create_project(
    request: ProjectCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new project for the current user.
    """
    try:
        # Verify team exists if team_id provided
        if request.team_id:
            team = db.query(Team).filter(Team.id == request.team_id).first()
            if not team:
                raise HTTPException(status_code=404, detail="Team not found")

        # Create project
        project = Project(
            user_id=current_user.id,
            team_id=request.team_id,
            name=request.name,
            description=request.description
        )

        db.add(project)
        db.commit()
        db.refresh(project)

        return {
            "status": "success",
            "project_id": project.id,
            "name": project.name,
            "created_at": project.created_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=dict)
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all projects for the current user.
    """
    try:
        projects = db.query(Project).filter(Project.user_id == current_user.id).all()

        return {
            "status": "success",
            "total": len(projects),
            "projects": [
                {
                    "id": p.id,
                    "name": p.name,
                    "description": p.description,
                    "team_id": p.team_id,
                    "created_at": p.created_at.isoformat(),
                    "updated_at": p.updated_at.isoformat()
                }
                for p in projects
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a project by ID (must belong to current user).
    """
    try:
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        ).first()

        if not project:
            raise HTTPException(status_code=404, detail="Project not found or not accessible")

        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "user_id": project.user_id,
            "team_id": project.team_id,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    request: ProjectUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a project (must belong to current user).
    """
    try:
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        ).first()

        if not project:
            raise HTTPException(status_code=404, detail="Project not found or not accessible")

        # Update fields
        if request.name is not None:
            project.name = request.name
        if request.description is not None:
            project.description = request.description

        db.commit()
        db.refresh(project)

        return {
            "status": "success",
            "project_id": project.id,
            "name": project.name,
            "updated_at": project.updated_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a project (must belong to current user).
    WARNING: This will cascade delete all schemas and mappings in the project.
    """
    try:
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        ).first()

        if not project:
            raise HTTPException(status_code=404, detail="Project not found or not accessible")

        db.delete(project)
        db.commit()

        return {
            "status": "success",
            "message": "Project deleted successfully",
            "project_id": project_id
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
