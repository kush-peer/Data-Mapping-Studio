# Data Mapping Studio - Architecture & Design

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  Visual Mapping Canvas, Schema Management, Results View     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST API
                           ├─ axios client (api.ts)
                           ├─ Bearer Token Auth
                           └─ multipart form uploads
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                  Backend (FastAPI)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ API Routes (REST Endpoints)                         │   │
│  │ ├─ /api/auth/* (authentication)                    │   │
│  │ ├─ /api/schemas/* (schema management)               │   │
│  │ └─ /api/mappings/* (mapping execution)              │   │
│  └────────────┬────────────────────────────────────────┘   │
│               │                                             │
│  ┌────────────┴────────────────────────────────────────┐   │
│  │ Services & Logic                                    │   │
│  │ ├─ LLMService (Claude API integration)              │   │
│  │ ├─ ExecutionEngine (transformation execution)       │   │
│  │ └─ Auth (API key validation)                        │   │
│  └────────────┬────────────────────────────────────────┘   │
│               │                                             │
│  ┌────────────┴────────────────────────────────────────┐   │
│  │ Data Connectors (Pluggable)                         │   │
│  │ ├─ CSVConnector (CSV, TSV, delimited)               │   │
│  │ ├─ EDIConnector (X12 837, 835, etc.)                │   │
│  │ ├─ JSONConnector (Phase 2)                          │   │
│  │ ├─ DatabaseConnector (Phase 2)                      │   │
│  │ └─ RESTConnector (Phase 2)                          │   │
│  └────────────┬────────────────────────────────────────┘   │
│               │                                             │
│  ┌────────────┴────────────────────────────────────────┐   │
│  │ Database Layer                                      │   │
│  │ ├─ SQLAlchemy ORM                                   │   │
│  │ └─ PostgreSQL / SQLite                              │   │
│  └────────────┬────────────────────────────────────────┘   │
└──────────────┬────────────────────────────────────────────┘
               │ API calls
       ┌───────┴──────────┐
       │                  │
    ┌──▼───┐      ┌───────▼────┐
    │Claude│      │ PostgreSQL │
    │ API  │      │  Database  │
    └──────┘      └────────────┘
```

## Component Architecture

### Frontend Architecture

#### Layer 1: UI Components (`src/components/`)
```
MappingCanvas.tsx
├─ Visual canvas for field mapping
├─ Drag-and-drop interaction
└─ Real-time connection visualization

SchemaPanel.tsx
├─ Display source/target schemas
└─ Field selection and dragging

FileUploadPanel.tsx
├─ File upload interface
├─ Format detection
└─ Progress tracking

AIAssistant.tsx
├─ AI suggestions display
├─ Mapping confidence scores
└─ Natural language input
```

#### Layer 2: Services (`src/services/`)
```
api.ts (API Client)
├─ Axios instance with interceptors
├─ Authentication header injection
├─ Error handling & token refresh
└─ Endpoint wrappers:
   ├─ detectSchema(file)
   ├─ createMapping(...)
   ├─ suggestMappings(mappingId)
   ├─ executeMapping(mappingId, file)
   └─ ...
```

#### Layer 3: State Management
```
React Hooks (useState, useContext)
├─ Local component state
├─ Global auth context
└─ Mapping/schema state
```

### Backend Architecture

#### Route Handlers (`app/api/routes/`)
```
auth.py
├─ POST /api/auth/generate-key  → Create API key
├─ GET /api/auth/validate       → Validate token
└─ Dependency: get_current_user → Inject user into routes

schemas.py
├─ POST /api/schemas/detect     → Auto-detect schema from file
├─ POST /api/schemas/           → Create schema
├─ GET /api/schemas/{id}        → Retrieve schema
└─ GET /api/schemas/project/{id} → List schemas

mappings.py
├─ POST /api/mappings/          → Create mapping
├─ GET /api/mappings/{id}       → Get mapping
├─ POST /api/mappings/{id}/suggest → Get AI suggestions
├─ POST /api/mappings/{id}/sample  → Preview output
└─ POST /api/mappings/{id}/execute → Run transformation
```

#### Services Layer (`app/services/`)
```
LLMService
├─ detect_schema_with_ai()     → Claude analyzes data
├─ generate_transformation()   → Claude writes Python code
├─ suggest_mappings()          → Claude suggests field mappings
└─ Fallback logic for when Claude API unavailable
```

#### Connector Framework (`app/connectors/`)
```
BaseConnector (Abstract)
├─ detect_schema(file_content) → Analyze data structure
├─ read_data(file_path)        → Stream records
├─ write_data(output_path)     → Write transformed data
└─ validate(data, schema)      → Verify data matches schema

CSVConnector (implements BaseConnector)
├─ Delimiter detection (comma, tab, pipe, semicolon)
├─ Encoding detection (UTF-8, Latin-1, etc.)
├─ Type inference (string, number, date, boolean)
└─ Field example extraction

EDIConnector (implements BaseConnector)
├─ X12 segment parsing
├─ Transaction type detection (837, 835, 834, etc.)
├─ Healthcare field mapping
└─ EDI structure to schema conversion
```

#### Execution Engine (`app/engine/`)
```
ExecutionEngine
├─ execute_mapping(mapping_id, source_file, ...)
│  ├─ Get source connector
│  ├─ Generate transformation code (Claude)
│  ├─ Compile Python code
│  ├─ Stream source data
│  ├─ Apply transformations record-by-record
│  ├─ Validate against target schema
│  ├─ Handle errors gracefully
│  └─ Write output file
│
└─ get_sample_output(mapping_id, source_file, sample_size)
   ├─ Same as above but limited to N records
   └─ Return transformation code + sample results
```

#### Database Layer (`app/models/`, `app/database/`)
```
SQLAlchemy Models
├─ User (id, email, api_key, created_at)
├─ Project (id, user_id, name, description)
├─ Schema (id, project_id, name, source_type, fields JSON)
├─ Mapping (id, project_id, source_schema_id, target_schema_id, rules JSON)
├─ Execution (id, mapping_id, status, records_processed, output_file_path)
└─ MappingRule (id, mapping_id, source_field, target_field, transformation_type)

Database Setup
├─ create_engine() → Connect to PostgreSQL/SQLite
├─ SessionLocal → Database session factory
└─ get_db() → FastAPI dependency for injecting sessions
```

## Data Flow

### User Journey: Upload & Map

```
1. User Uploads File
   │
   └─→ frontend: FileUploadPanel
       │
       └─→ api.detectSchema(file)
           │
           └─→ backend: POST /api/schemas/detect
               │
               ├─→ route handler: schemas.py
               │
               ├─→ CSVConnector.detect_schema()
               │
               ├─→ LLMService.detect_schema_with_ai()
               │   │
               │   └─→ Claude API
               │       └─→ Returns enhanced schema with descriptions
               │
               └─→ return schema to frontend
                   │
                   └─→ frontend: SchemaPanel displays fields

2. User Creates Mapping
   │
   └─→ frontend: Drag-drop fields in MappingCanvas
       │
       └─→ api.createMapping(...)
           │
           └─→ backend: POST /api/mappings/
               │
               └─→ database: Store mapping rules

3. User Clicks "Get Suggestions"
   │
   └─→ api.suggestMappings(mappingId)
       │
       └─→ backend: POST /api/mappings/{id}/suggest
           │
           ├─→ LLMService.suggest_mappings()
           │   │
           │   └─→ Claude API analyzes source & target schemas
           │       └─→ Returns field mapping suggestions with confidence
           │
           └─→ return suggestions to frontend

4. User Clicks "Execute"
   │
   └─→ api.executeMapping(mappingId, sourceFile)
       │
       └─→ backend: POST /api/mappings/{id}/execute
           │
           ├─→ route: mappings.py
           │
           ├─→ ExecutionEngine.execute_mapping()
           │   │
           │   ├─→ Get source connector (CSV/EDI)
           │   │
           │   ├─→ LLMService.generate_transformation()
           │   │   │
           │   │   └─→ Claude API: "Generate Python code to transform..."
           │   │       └─→ Returns Python function code
           │   │
           │   ├─→ Compile code into callable function
           │   │
           │   ├─→ Stream source file record-by-record
           │   │
           │   ├─→ Apply transformation to each record
           │   │
           │   ├─→ Validate against target schema
           │   │
           │   ├─→ Collect successes/failures
           │   │
           │   └─→ Write output file
           │
           ├─→ Save Execution record to database
           │
           └─→ return results to frontend
               │
               └─→ frontend: Show results, download link
```

## Technology Decisions

### Why FastAPI?
- Async support for non-blocking I/O (streaming files)
- Automatic OpenAPI documentation
- Type hints with Pydantic validation
- Native async/await syntax
- Superior performance vs Flask/Django

### Why PostgreSQL?
- ACID compliance for data integrity
- JSONB support for flexible schema storage
- Excellent performance at scale
- Widely deployed in enterprises
- Free and open-source

### Why Claude API?
- Superior code generation (for transformation code)
- Healthcare domain understanding
- Longer context windows (100K tokens)
- Competitive pricing per-token
- Anthropic's focus on safety & reliability

### Why SQLAlchemy ORM?
- Type-safe database queries
- Migration support (future: Alembic)
- Relationship modeling (users → projects → mappings)
- Raw SQL fallback when needed

### Why React + TypeScript?
- Component reusability (mapping canvas)
- Type safety in frontend
- Large ecosystem (libraries, components)
- Excellent performance with hooks
- Visual component libraries (shadcn/ui)

## Scalability Considerations

### Current Limitations
- Single-threaded execution (per request)
- File streaming keeps memory usage constant
- Database connections pooled (PgBouncer in production)

### Scaling Strategies (Future)

#### Horizontal Scaling
```
Load Balancer
├─ Backend Instance 1 (gunicorn 4 workers)
├─ Backend Instance 2 (gunicorn 4 workers)
└─ Backend Instance N
    └─ All share PostgreSQL database
```

#### Async Job Processing
```
Celery + Redis
├─ Frontend submits mapping execution
├─ Celery worker picks up job
├─ Executes long-running transformation
├─ Stores result in database
└─ Frontend polls for completion (WebSocket in Phase 2)
```

#### Caching Strategy
```
Redis Cache
├─ Schema detection results (1 hour TTL)
├─ Field suggestions (24 hour TTL)
├─ User session data
└─ Execution history
```

#### Database Optimization
```
PostgreSQL
├─ Index on (user_id, created_at) for queries
├─ JSONB column indexes for fields
├─ Read replicas for reporting queries
└─ Partitioning executions by date
```

## Security Architecture

### Authentication Flow
```
1. User provides email
   └─→ POST /api/auth/generate-key

2. Backend creates/retrieves API key
   └─→ Return key to user (save to localStorage)

3. User includes key in requests
   └─→ "Authorization: Bearer sk_..."

4. Middleware validates key
   └─→ Extract user from database
   └─→ Inject into route handler

5. Route checks user has access to resource
   └─→ Verify project ownership, etc.
```

### Data Security
```
Database
├─ All user data belongs to users
├─ No data shared across users
└─ API keys used for rate limiting/audit

File Uploads
├─ Temporary storage only
├─ Deleted after processing
├─ Max size limits (100MB in Nginx)

Credentials
├─ ANTHROPIC_API_KEY env variable only
├─ Database credentials in env variables
└─ No secrets in code/repo
```

## Testing Strategy

### Unit Tests (`tests/test_*.py`)
```
test_auth.py
├─ API key generation
├─ Token validation
└─ Authentication failures

test_schemas.py
├─ Schema creation
├─ Schema retrieval
└─ Schema detection from files

test_mappings.py
├─ Mapping creation
├─ AI suggestions
├─ Sample output
└─ Execution status

test_connectors.py
├─ CSV parsing
├─ EDI segment handling
├─ Type inference
└─ Data streaming
```

### Integration Tests
```
test_auth + test_schemas
├─ Create user → Create project → Create schema
└─ Verify relationships

test_connectors + test_mappings
├─ Upload file → Detect schema → Create mapping → Execute
└─ Verify end-to-end flow
```

### End-to-End Tests (Manual)
```
Workflow: CSV → EDI
├─ Upload CSV patient data
├─ Auto-detect schema
├─ Create target EDI schema
├─ Get AI suggestions
├─ Review and execute
└─ Verify EDI output valid
```

## Deployment Architecture

### Development (Docker Compose)
```
docker-compose.yml
├─ Frontend (npm dev, port 5173)
├─ Backend (uvicorn reload, port 8000)
├─ PostgreSQL (in-memory for tests)
└─ Redis (optional, not required)
```

### Production (docker-compose.prod.yml)
```
docker-compose.prod.yml
├─ Frontend (nginx, port 3000)
├─ Backend (gunicorn 4 workers, port 8000)
├─ PostgreSQL (persistent volume)
├─ Redis (persistent volume, for future jobs)
└─ Nginx reverse proxy (port 80/443)

Features
├─ Rate limiting (10 req/s API, 30 req/s general)
├─ Gzip compression
├─ Security headers
├─ SSL/TLS support
└─ Health checks
```

## Future Architecture (Phase 2+)

### Job Queue System
```
Celery + Redis
├─ Long-running mappings → async jobs
├─ Scheduled workflows
└─ Parallel processing
```

### Real-time Updates
```
WebSocket / Socket.io
├─ Live execution progress
├─ Transformation logs
└─ Error notifications
```

### Multi-Connector Architecture
```
Connector Framework
├─ Plugin system for new connectors
├─ REST API connector
├─ Database connector (PostgreSQL, MySQL, Oracle)
├─ HL7v2 healthcare standard
├─ FHIR API connector
└─ Kafka streaming connector
```

### Advanced Features
```
Data Lineage
├─ Track field origins
├─ Impact analysis
└─ Compliance reporting

Data Validation
├─ Custom validation rules
├─ Healthcare-specific validators (NPI, ICD-10)
└─ ML-based anomaly detection

Transformation Library
├─ 100+ pre-built transformations
├─ User-defined custom functions
└─ Machine learning pipelines
```

---

For implementation details, see:
- [SETUP.md](./SETUP.md) - Deployment & configuration
- [backend/README.md](./backend/README.md) - Backend architecture
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
