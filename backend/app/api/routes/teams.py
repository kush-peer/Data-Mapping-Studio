from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Team, UserRole
from app.api.dependencies import get_current_user
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/teams", tags=["teams"])


class TeamCreate(BaseModel):
    name: str


class TeamResponse(BaseModel):
    id: str
    name: str
    created_by: str
    created_at: str
    member_count: int

    class Config:
        from_attributes = True


class TeamMemberResponse(BaseModel):
    user_id: str
    email: str
    role: str
    created_at: str

    class Config:
        from_attributes = True


class AddMemberRequest(BaseModel):
    email: str
    role: str = "editor"  # Default role


class UpdateMemberRoleRequest(BaseModel):
    role: str


@router.get("/my-team", response_model=TeamResponse | None)
async def get_my_team(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current user's team"""
    if not current_user.team_id:
        return None

    team = db.query(Team).filter(Team.id == current_user.team_id).first()
    if not team:
        return None

    return {
        "id": team.id,
        "name": team.name,
        "created_by": team.created_by,
        "created_at": team.created_at.isoformat(),
        "member_count": len(team.members)
    }


@router.post("/", response_model=TeamResponse)
async def create_team(
    team_create: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new team"""
    # Check if user is already in a team
    if current_user.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already member of a team"
        )

    # Create team
    new_team = Team(
        name=team_create.name,
        created_by=current_user.id
    )
    db.add(new_team)
    db.flush()

    # Add creator as admin
    current_user.team_id = new_team.id
    current_user.role = UserRole.ADMIN

    db.commit()
    db.refresh(new_team)

    return {
        "id": new_team.id,
        "name": new_team.name,
        "created_by": new_team.created_by,
        "created_at": new_team.created_at.isoformat(),
        "member_count": 1
    }


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get team details by ID"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if user is member of this team
    if current_user.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return {
        "id": team.id,
        "name": team.name,
        "created_by": team.created_by,
        "created_at": team.created_at.isoformat(),
        "member_count": len(team.members)
    }


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def get_team_members(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of team members"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if user is member of this team
    if current_user.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return [
        {
            "user_id": member.id,
            "email": member.email,
            "role": member.role.value,
            "created_at": member.created_at.isoformat()
        }
        for member in team.members
    ]


@router.post("/{team_id}/members", response_model=TeamMemberResponse)
async def add_team_member(
    team_id: str,
    request: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to the team"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if user is admin of this team
    if current_user.team_id != team_id or current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team admins can add members"
        )

    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if user is already in a team
    if user.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already member of another team"
        )

    # Add user to team
    user.team_id = team_id
    user.role = UserRole(request.role)  # Validate role

    db.commit()
    db.refresh(user)

    return {
        "user_id": user.id,
        "email": user.email,
        "role": user.role.value,
        "created_at": user.created_at.isoformat()
    }


@router.put("/{team_id}/members/{user_id}", response_model=TeamMemberResponse)
async def update_member_role(
    team_id: str,
    user_id: str,
    request: UpdateMemberRoleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a team member's role"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if current user is admin
    if current_user.team_id != team_id or current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team admins can update member roles"
        )

    # Find member
    member = db.query(User).filter(User.id == user_id, User.team_id == team_id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found"
        )

    # Cannot change role of team creator
    if member.id == team.created_by and request.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove admin role from team creator"
        )

    # Update role
    member.role = UserRole(request.role)  # Validate role
    db.commit()
    db.refresh(member)

    return {
        "user_id": member.id,
        "email": member.email,
        "role": member.role.value,
        "created_at": member.created_at.isoformat()
    }


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from the team"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Check if current user is admin
    if current_user.team_id != team_id or current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team admins can remove members"
        )

    # Find member
    member = db.query(User).filter(User.id == user_id, User.team_id == team_id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found"
        )

    # Cannot remove team creator
    if member.id == team.created_by:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove team creator"
        )

    # Remove member from team
    member.team_id = None
    member.role = UserRole.EDITOR  # Reset to default role
    db.commit()

    return {"message": "Member removed from team"}
