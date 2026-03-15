from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, Text, Float, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

Base = declarative_base()


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class Team(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    created_by = Column(String, nullable=False)  # User ID
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("User", back_populates="team")
    projects = relationship("Project", back_populates="team", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    api_key = Column(String, unique=True, index=True)
    team_id = Column(String, ForeignKey("teams.id"), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.EDITOR)  # admin, editor, viewer
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("Team", back_populates="members")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    team_id = Column(String, ForeignKey("teams.id"), nullable=True)  # NEW
    name = Column(String, nullable=False)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    team = relationship("Team", back_populates="projects")  # NEW
    schemas = relationship("Schema", back_populates="project", cascade="all, delete-orphan")
    mappings = relationship("Mapping", back_populates="project", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="project", cascade="all, delete-orphan")  # NEW


class Schema(Base):
    __tablename__ = "schemas"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)  # "csv", "edi", "json", etc.
    fields = Column(JSON, nullable=False)  # Array of field definitions
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="schemas")
    source_mappings = relationship("Mapping", foreign_keys="Mapping.source_schema_id", back_populates="source_schema")
    target_mappings = relationship("Mapping", foreign_keys="Mapping.target_schema_id", back_populates="target_schema")


class Mapping(Base):
    __tablename__ = "mappings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    source_schema_id = Column(String, ForeignKey("schemas.id"), nullable=False)
    target_schema_id = Column(String, ForeignKey("schemas.id"), nullable=False)
    name = Column(String)
    rules = Column(JSON, nullable=False)  # Array of mapping rules
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="mappings")
    source_schema = relationship("Schema", foreign_keys=[source_schema_id], back_populates="source_mappings")
    target_schema = relationship("Schema", foreign_keys=[target_schema_id], back_populates="target_mappings")
    executions = relationship("Execution", back_populates="mapping", cascade="all, delete-orphan")


class Execution(Base):
    __tablename__ = "executions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mapping_id = Column(String, ForeignKey("mappings.id"), nullable=False)
    status = Column(String, default="pending")  # pending, running, completed, failed
    records_processed = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    output_file_path = Column(String)
    errors = Column(JSON)  # Array of error details
    logs = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    mapping = relationship("Mapping", back_populates="executions")


class MappingRule(Base):
    __tablename__ = "mapping_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mapping_id = Column(String, ForeignKey("mappings.id"), nullable=False)
    source_field = Column(String, nullable=False)
    target_field = Column(String, nullable=False)
    transformation_type = Column(String)  # "direct", "uppercase", "lowercase", "format", etc.
    transformation_params = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    """Background job for executing mappings"""
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    mapping_id = Column(String, ForeignKey("mappings.id"), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)  # pending, running, completed, failed
    schedule_cron = Column(String, nullable=True)  # "0 9 * * *" for cron-based scheduling
    next_run = Column(DateTime, nullable=True)
    last_run = Column(DateTime, nullable=True)
    execution_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="jobs")
    mapping = relationship("Mapping")


class ExecutionLog(Base):
    """Detailed logs for each step of a mapping execution"""
    __tablename__ = "execution_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id = Column(String, ForeignKey("executions.id"), nullable=False)
    record_number = Column(Integer)
    source_field = Column(String)
    target_field = Column(String)
    source_value = Column(Text)
    target_value = Column(Text)
    transformation_code = Column(Text)
    error_message = Column(Text, nullable=True)
    ai_suggestion = Column(Text, nullable=True)  # Claude's suggestion to fix error
    timestamp = Column(DateTime, default=datetime.utcnow)
