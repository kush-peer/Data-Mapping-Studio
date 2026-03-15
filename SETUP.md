# Data Mapping Studio - Setup & Deployment Guide

## Table of Contents
1. [Quick Start (Docker)](#quick-start-docker)
2. [Local Development Setup](#local-development-setup)
3. [Backend Configuration](#backend-configuration)
4. [Running Tests](#running-tests)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start (Docker)

### Prerequisites
- Docker & Docker Compose installed
- Claude API key (get at: https://console.anthropic.com)

### Steps

1. **Clone & Setup**
```bash
git clone https://github.com/your-org/data-mapping-studio.git
cd data-mapping-studio

# Copy environment template
cp backend/.env.example backend/.env
```

2. **Configure Backend**
Edit `backend/.env`:
```env
DATABASE_URL=postgresql://dms_user:dms_password@postgres:5432/dms_db
ANTHROPIC_API_KEY=sk-ant-v1-your-key-here
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
ENV=development
```

3. **Start Services**
```bash
docker-compose up
```

Wait for all services to be healthy:
- ✅ PostgreSQL (port 5432)
- ✅ Redis (port 6379)
- ✅ Backend API (port 8000)
- ✅ Frontend (port 5173)

4. **Access the Application**
- **Frontend**: http://localhost:5173
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **API Redoc**: http://localhost:8000/redoc

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+ (or SQLite for quick start)
- Git

### Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file (optional, uses defaults)
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
# → Frontend available at http://localhost:5173
```

### Backend Setup

```bash
cd backend

# 1. Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup environment
cp .env.example .env
# Edit .env with your settings (see Backend Configuration below)

# 4. Initialize database
python -c "from app.database import init_db; init_db()"

# 5. Run development server
python main.py
# → API available at http://localhost:8000

# Or use uvicorn directly with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## Backend Configuration

### Environment Variables

Create `backend/.env`:

```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
ENV=development  # or 'production'

# Database
# PostgreSQL (production):
DATABASE_URL=postgresql://user:password@localhost:5432/dms_db

# SQLite (development/testing):
DATABASE_URL=sqlite:///./test.db

# Claude API
ANTHROPIC_API_KEY=sk-ant-v1-xxxxxxxxxxxx

# CORS (comma-separated URLs)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080

# Trusted hosts
TRUSTED_HOSTS=localhost,127.0.0.1

# Output directory for generated files
OUTPUT_DIR=/tmp/dms_output
```

### PostgreSQL Setup (Optional but Recommended)

If you want to use PostgreSQL instead of SQLite:

```bash
# Create database
createdb dms_db
createuser dms_user -P  # Enter password: dms_password

# Or with Docker:
docker run -d \
  --name postgres_dms \
  -e POSTGRES_USER=dms_user \
  -e POSTGRES_PASSWORD=dms_password \
  -e POSTGRES_DB=dms_db \
  -p 5432:5432 \
  postgres:15-alpine
```

---

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::test_generate_api_key

# Run tests in watch mode (auto-rerun on changes)
pytest-watch

# Run tests with verbose output
pytest -v
```

### Test Files Structure

```
backend/tests/
├── conftest.py              # Shared test configuration & fixtures
├── test_auth.py             # Authentication tests
├── test_schemas.py          # Schema management tests
├── test_mappings.py         # Mapping execution tests
└── test_connectors.py       # CSV/EDI connector tests
```

### Example Test Output

```
$ pytest -v
tests/test_auth.py::test_generate_api_key PASSED
tests/test_auth.py::test_validate_api_key_valid PASSED
tests/test_schemas.py::test_create_schema PASSED
tests/test_connectors.py::test_detect_schema_csv PASSED
...
========================== 15 passed in 2.34s ==========================
```

---

## API Authentication

### Getting Started with API

1. **Generate API Key**
```bash
curl -X POST http://localhost:8000/api/auth/generate-key \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com"}'
```

Response:
```json
{
  "api_key": "sk_test_abc123xyz...",
  "email": "your@email.com",
  "user_id": "uuid-here"
}
```

2. **Use API Key in Requests**
```bash
# Add to Authorization header
curl -H "Authorization: Bearer sk_test_abc123xyz..." \
  http://localhost:8000/api/schemas/project/project-id
```

3. **Validate Key**
```bash
curl -H "Authorization: Bearer sk_test_abc123xyz..." \
  http://localhost:8000/api/auth/validate
```

---

## Example Workflow

### 1. Create Project (via UI)

### 2. Upload Source Data
```bash
curl -X POST http://localhost:8000/api/schemas/detect \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@patient_data.csv"
```

### 3. Create Mapping
```bash
curl -X POST http://localhost:8000/api/mappings/ \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj-123",
    "source_schema_id": "schema-456",
    "target_schema_id": "schema-789",
    "name": "Patient to EDI Mapping",
    "rules": []
  }'
```

### 4. Get AI Suggestions
```bash
curl -X POST http://localhost:8000/api/mappings/mapping-id/suggest \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 5. Execute Mapping
```bash
curl -X POST http://localhost:8000/api/mappings/mapping-id/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "source_file=@patient_data.csv"
```

---

## Production Deployment

### Docker Production Build

```bash
# Build images
docker build -t dms-backend backend/
docker build -t dms-frontend .

# Tag for registry
docker tag dms-backend your-registry/dms-backend:1.0.0
docker tag dms-frontend your-registry/dms-frontend:1.0.0

# Push to registry
docker push your-registry/dms-backend:1.0.0
docker push your-registry/dms-frontend:1.0.0
```

### Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dms-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dms-backend
  template:
    metadata:
      labels:
        app: dms-backend
    spec:
      containers:
      - name: backend
        image: your-registry/dms-backend:1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: dms-secrets
              key: database-url
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: dms-secrets
              key: anthropic-api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Cloud Deployment Examples

#### Heroku
```bash
# Login
heroku login

# Create app
heroku create dms-app

# Set config
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
heroku config:set DATABASE_URL=postgresql://...

# Deploy
git push heroku main
```

#### AWS EC2
```bash
# SSH into instance
ssh -i key.pem ubuntu@instance-ip

# Clone repo
git clone https://github.com/your-org/data-mapping-studio.git

# Set up environment
cd data-mapping-studio
cp backend/.env.example backend/.env
# Edit .env

# Start with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

#### DigitalOcean App Platform
- Connect GitHub repo
- Set environment variables in UI
- Deploy with one click

---

## Monitoring & Maintenance

### Health Checks

```bash
# API health
curl http://localhost:8000/health

# Detailed health check
curl http://localhost:8000/

# Database connectivity
curl -X GET http://localhost:8000/api/auth/validate \
  -H "Authorization: Bearer test-key"
```

### Logging

Backend logs are output to stdout:
```bash
# View live logs
docker logs -f dms_backend

# Or from local dev:
# Logs appear in terminal where `python main.py` runs
```

### Database Backups

```bash
# PostgreSQL backup
pg_dump -U dms_user dms_db > backup.sql

# PostgreSQL restore
psql -U dms_user dms_db < backup.sql
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
PORT=8001 python main.py
```

### Database Connection Error

```
ERROR: can't connect to PostgreSQL at localhost:5432
```

**Solution:**
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in .env
- Check credentials are correct
- Try SQLite first: `DATABASE_URL=sqlite:///./test.db`

### Claude API Error

```
Error calling Claude API: Invalid API key
```

**Solution:**
- Verify ANTHROPIC_API_KEY is set correctly
- Check API key has appropriate permissions
- Ensure Claude API is available in your region

### Frontend Can't Connect to Backend

```
Error: Failed to fetch from http://localhost:8000/api/...
```

**Solution:**
- Ensure backend is running: `curl http://localhost:8000/health`
- Check CORS_ORIGINS includes your frontend URL
- Verify API_URL in frontend .env is correct

### CORS Errors

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
Edit `backend/.env`:
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://your-domain.com
```

### Out of Memory

```
MemoryError: Unable to allocate memory
```

**Solution:**
- Reduce file upload size limits
- Implement streaming for large files
- Increase container memory: `docker-compose up --memory 2g`

---

## Support & Contributing

- **Issues**: https://github.com/your-org/data-mapping-studio/issues
- **Discussions**: https://github.com/your-org/data-mapping-studio/discussions
- **Email**: support@your-domain.com

For contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Last Updated**: March 2025
