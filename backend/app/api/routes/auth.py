from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import secrets
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class GenerateKeyRequest(BaseModel):
    email: str


class GenerateKeyResponse(BaseModel):
    api_key: str
    email: str
    user_id: str
    role: str


class ValidateKeyResponse(BaseModel):
    valid: bool
    email: str
    user_id: str
    role: str


@router.post("/generate-key", response_model=GenerateKeyResponse)
async def generate_api_key(request: GenerateKeyRequest, db: Session = Depends(get_db)):
    """
    Generate or retrieve API key for user.
    If user exists, return existing key.
    If new user, create with new API key.
    """
    try:
        # Check if user exists
        user = db.query(User).filter(User.email == request.email).first()

        if not user:
            # Create new user with API key
            api_key = secrets.token_urlsafe(32)
            user = User(
                email=request.email,
                api_key=api_key
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            api_key = user.api_key

        return {
            "api_key": api_key,
            "email": user.email,
            "user_id": user.id,
            "role": user.role.value
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/validate", response_model=ValidateKeyResponse)
async def validate_api_key(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Validate API key from Authorization header.
    Header format: Authorization: Bearer <api_key>
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        # Extract token from "Bearer <token>" format
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization header")

        api_key = parts[1]

        # Find user with this key
        user = db.query(User).filter(User.api_key == api_key).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid API key")

        return {
            "valid": True,
            "email": user.email,
            "user_id": user.id,
            "role": user.role.value
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Dependency for validating API key in other routes
async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Extract current user from API key in Authorization header.
    Use this as a dependency in protected routes.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization header")

        api_key = parts[1]
        user = db.query(User).filter(User.api_key == api_key).first()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid API key")

        return user

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")
