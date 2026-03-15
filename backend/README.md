# Data Mapping Studio - Backend API

Python FastAPI backend for the AI-driven healthcare data mapping platform.

## Quick Start

### 1. Set up Python Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set up Environment Variables

```bash
cp .env.example .env
# Edit .env with your Claude API key and database settings
```

### 3. Initialize Database

```bash
python -c "from app.database import init_db; init_db()"
```

### 4. Run Development Server

```bash
python main.py
# Or with uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API docs: `http://localhost:8000/docs`

## API Endpoints

### Health Check
- `GET /` - Health status
- `GET /health` - Detailed health info

### Schemas
- `POST /api/schemas/detect` - Upload file and auto-detect schema
- `POST /api/schemas/` - Create new schema
- `GET /api/schemas/{schema_id}` - Get schema details
- `GET /api/schemas/project/{project_id}` - List all schemas in project

### Mappings
- `POST /api/mappings/` - Create mapping
- `GET /api/mappings/{mapping_id}` - Get mapping details
- `POST /api/mappings/{mapping_id}/suggest` - Get AI-suggested mappings
- `POST /api/mappings/{mapping_id}/sample` - Preview sample output
- `POST /api/mappings/{mapping_id}/execute` - Execute mapping on data
- `GET /api/mappings/project/{project_id}` - List all mappings in project

## Architecture

### Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── schemas.py    # Schema management endpoints
│   │       └── mappings.py   # Mapping execution endpoints
│   ├── connectors/
│   │   ├── base_connector.py # Abstract connector base class
│   │   ├── csv_connector.py  # CSV/delimited file connector
│   │   └── edi_connector.py  # EDI X12 healthcare connector
│   ├── database/
│   │   └── database.py       # SQLAlchemy setup
│   ├── engine/
│   │   └── executor.py       # Data transformation execution engine
│   ├── models/
│   │   └── models.py         # SQLAlchemy ORM models
│   ├── services/
│   │   └── llm_service.py    # Claude API integration
│   └── utils/
├── main.py                   # FastAPI application entry point
├── requirements.txt          # Python dependencies
├── Dockerfile               # Docker image definition
└── .env.example             # Environment variables template
```

### Key Components

#### Connectors
- **BaseConnector**: Abstract base class for all data sources
- **CSVConnector**: Reads/writes CSV, TSV, delimited files with schema detection
- **EDIConnector**: Parses EDI X12 healthcare standards (837, 835 claims)

#### Services
- **LLMService**: Claude API integration for:
  - AI-powered schema detection
  - Intelligent field mapping suggestions
  - Transformation code generation
  - Data quality analysis

#### Engine
- **ExecutionEngine**: Executes mappings:
  - Streams source data (memory efficient)
  - Applies transformations using Claude-generated code
  - Validates against target schema
  - Generates execution reports

## Environment Variables

```
DATABASE_URL=postgresql://user:password@host:port/dbname
ANTHROPIC_API_KEY=your_claude_api_key
HOST=0.0.0.0
PORT=8000
ENV=development|production
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
TRUSTED_HOSTS=localhost,127.0.0.1
```

## Database Schema

### Users
- `id`, `email`, `api_key`, `created_at`, `updated_at`

### Projects
- `id`, `user_id`, `name`, `description`, `created_at`, `updated_at`

### Schemas
- `id`, `project_id`, `name`, `source_type` (csv|edi|json), `fields` (JSON), `created_at`, `updated_at`

### Mappings
- `id`, `project_id`, `source_schema_id`, `target_schema_id`, `name`, `rules` (JSON), `created_at`, `updated_at`

### Executions
- `id`, `mapping_id`, `status` (pending|running|completed|failed), `records_processed`, `records_failed`, `output_file_path`, `errors` (JSON), `logs`, `started_at`, `completed_at`

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app
```

## Deployment

### Docker

```bash
docker-compose up
```

### Production

For production deployment:
1. Set `ENV=production`
2. Use PostgreSQL instead of SQLite
3. Configure proper CORS origins
4. Set strong ANTHROPIC_API_KEY
5. Use environment-specific .env file
6. Run migrations before deployment

## Contributing

Contributions welcome! Please:
1. Create feature branch from `main`
2. Add tests for new features
3. Update documentation
4. Submit pull request

## License

Apache 2.0 - See LICENSE file
