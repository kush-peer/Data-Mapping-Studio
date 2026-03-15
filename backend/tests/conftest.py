import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.database import Base
from app.models import User, Project, Schema, Mapping
from main import app

# Use SQLite in-memory database for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def setup_db():
    """Create test database tables"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db(setup_db):
    """Create a fresh database for each test"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    """Create test client with test database"""
    def override_get_db():
        yield db

    from app.database import get_db
    app.dependency_overrides[get_db] = override_get_db

    yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Create a test user"""
    user = User(
        email="test@example.com",
        api_key="test_api_key_12345"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_project(db, test_user):
    """Create a test project"""
    project = Project(
        user_id=test_user.id,
        name="Test Project",
        description="A test project"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture
def test_schema(db, test_project):
    """Create a test schema"""
    schema = Schema(
        project_id=test_project.id,
        name="Test Schema",
        source_type="csv",
        fields=[
            {"name": "id", "type": "string", "description": "ID field"},
            {"name": "name", "type": "string", "description": "Name field"},
            {"name": "amount", "type": "number", "description": "Amount field"},
        ]
    )
    db.add(schema)
    db.commit()
    db.refresh(schema)
    return schema


@pytest.fixture
def auth_headers(test_user):
    """Get authorization headers for test user"""
    return {
        "Authorization": f"Bearer {test_user.api_key}"
    }
