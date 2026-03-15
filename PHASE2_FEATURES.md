# Phase 2 Implementation - New Features & Capabilities

## Overview

Phase 2 adds enterprise-grade features and healthcare-specific functionality to transform the tool from an MVP into a competitive alternative to Talend/Informatica.

**Major additions**:
- ✅ Job scheduling & async processing (Celery + Redis)
- ✅ HL7v2 healthcare connector (clinical data standard)
- ✅ Error recovery with Claude-powered debugging
- ✅ Multi-user team support & access control
- ✅ REST API connector (connects to any HTTP API)
- ✅ Database connector (PostgreSQL, MySQL, Oracle, SQL Server)
- ✅ Healthcare transformations library (100+ utilities)

---

## Feature Details

### 1. Job Scheduling & Async Processing

**What it enables**:
- Run mappings on a schedule (daily, weekly, hourly)
- Execute long-running mappings without blocking
- Retry failed jobs automatically
- Monitor job status in real-time

**How it works**:
```
User clicks "Schedule Mapping" → Creates Job record in database
Every minute, Celery Beat checks for jobs that should run
When next_run time is reached → Celery Worker executes the mapping
Execution result is stored → User can view results/logs
```

**API Endpoints** (new):
```
POST   /api/jobs/{mapping_id}/execute-now      # Run immediately (async)
POST   /api/jobs/{mapping_id}/schedule          # Schedule recurring (cron)
GET    /api/jobs/{job_id}/status               # Check status
GET    /api/jobs/{job_id}/logs                 # View execution logs
POST   /api/jobs/{job_id}/cancel               # Cancel scheduled job
GET    /api/jobs/mapping/{mapping_id}          # List all jobs for mapping
```

**Database Models**:
```python
Job:
  - id, mapping_id, project_id
  - status: pending | running | completed | failed
  - schedule_cron: "0 9 * * *" (daily at 9am)
  - execution_count, failure_count
  - last_run, next_run

ExecutionLog:
  - id, execution_id
  - record_number, source_field, target_field
  - source_value, target_value
  - transformation_code, error_message
  - ai_suggestion (Claude's fix)
```

**Architecture**:
```
┌─────────────┐
│  User UI    │ ← POST /api/jobs/{id}/schedule
└──────┬──────┘
       │
       ▼
┌─────────────┐         ┌──────────────┐
│  FastAPI    │────────▶│  PostgreSQL  │
│  Server     │         └──────────────┘
└──────┬──────┘
       │
       ├─── Job added to queue
       ▼
┌──────────────────┐
│  Celery Beat     │ ← Checks every minute
│  (Scheduler)     │   if job.next_run <= now
└─────────┬────────┘
          │
          ├─── Queue job
          ▼
┌──────────────────┐
│ Celery Worker    │ ← Executes mapping
│ (Executor)       │   (async, parallel)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│  Result stored   │ ← GET /api/jobs/{id}/status
└──────────────────┘
```

---

### 2. HL7v2 Healthcare Connector

**What it enables**:
- Parse HL7 messages (clinical data standard)
- Map patient records, lab results, diagnoses, medications
- Support for 10+ HL7 transaction types (ADT, ORU, ORM, etc.)
- Handle complex nested clinical structures

**Supported HL7 Segments**:
```
MSH - Message Header (who sent what when)
PID - Patient Identification (name, MRN, DOB, gender)
PV1 - Patient Visit (admission, location, discharge)
OBX - Observation/Result (lab values, vitals)
OBR - Order Details (what test/procedure ordered)
DG1 - Diagnosis (ICD-10/ICD-9 codes)
AL1 - Allergies
ST  - Segment Start
SE  - Segment End
```

**Example HL7 Message**:
```
MSH|^~\&|SENDINGAPP|SENDFAC|RECAPP|RECFAC|20230315120000||ADT^A01|MSG001|P|2.5
PID|||12345^^^MRN||DOE^JOHN||19800101|M|...
PV1|1|O|CCU^CCU01^01|H|...
OBX|1|NM|GLU^GLUCOSE||150|mg/dL|70-110|H|||F
```

**Usage**:
```python
# Automatically detect HL7v2 schema from message
schema = await hl7_connector.detect_schema(message_bytes)
# Result:
{
  "message_type": "ADT",
  "event_type": "A01",
  "hl7_version": "2.5",
  "fields": [
    {"name": "MSH_sending_app", "type": "string"},
    {"name": "PID_mrn", "type": "string", "required": true},
    {"name": "PID_dob", "type": "date"},
    ...
  ]
}

# Stream HL7 records from file
async for record in hl7_connector.read_data("messages.hl7"):
  # record = parsed HL7 message as dict
  #   {"MESSAGE_TYPE": "ADT", "PID_mrn": "12345", ...}
```

---

### 3. Error Recovery & Debugging

**What it enables**:
- When transformation fails, show why
- Claude suggests how to fix it
- One-click "Apply fix" to auto-correct mappings
- Detailed execution logs for troubleshooting

**How it works**:
```
1. Transformation fails on 500 records
   ↓
2. ExecutionLog captures:
   - Failed field: "AGE"
   - Source value: "UNKNOWN"
   - Target expected: integer
   - Error: "Cannot convert 'UNKNOWN' to int"
   ↓
3. Claude analyzes:
   "Age field contains non-numeric values. Try:
    - Map 'UNKNOWN' to default value (0 or NULL)
    - Or use regex to extract number: /(\d+)/"
   ↓
4. User clicks "Apply suggestion"
   - Mapping rule updated
   - Job retried
   - Success! Records processed.
```

**API Endpoints** (new):
```
GET    /api/executions/{id}/logs        # View detailed logs
POST   /api/executions/{id}/retry       # Retry with fixes
GET    /api/executions/{id}/debug       # Debug view (values + errors)
```

**Database Model**:
```python
ExecutionLog:
  - execution_id, record_number
  - source_field, target_field
  - source_value, target_value
  - transformation_code
  - error_message
  - ai_suggestion (Claude's fix)
```

---

### 4. Multi-User & Team Support

**What it enables**:
- Multiple users per project
- Teams can share mappings
- Role-based access control (admin, editor, viewer)
- Audit trails for compliance

**New Database Models**:
```python
Team:
  - id, name, created_by
  - members: List[User]
  - projects: List[Project]

User:
  + team_id (NEW)
  + role: admin | editor | viewer (NEW)
  # email, api_key (existing)

Project:
  + team_id (NEW)
  # owner -> team
```

**Usage**:
```
Team Setup:
1. Create team: POST /api/teams
   {
     "name": "Healthcare Operations",
   }
2. Add members: POST /api/teams/{id}/members
   {
     "email": "mapper@hospital.com",
     "role": "editor"   # admin | editor | viewer
   }
3. Share projects: GET /api/projects
   # Returns only projects accessible to user's team

Permissions:
- Admin: Create, edit, delete, manage users
- Editor: Create, edit, execute mappings
- Viewer: Read-only access to results
```

---

### 5. Healthcare Transformations Library

**What it includes**:

**Identifier Validation**:
```python
validate_npi(npi) → bool                    # National Provider ID
validate_mrn(mrn) → bool                    # Medical Record Number
format_npi(npi) → str                       # Format as XX-XXX-XXXXX
normalize_ssn(ssn) → str                    # Format as XXX-XX-XXXX
```

**Medical Codes**:
```python
map_icd9_to_icd10(icd9) → icd10            # Diagnosis code mapping
validate_icd10(code) → bool                 # ICD-10 format check
validate_cpt_code(code) → bool              # CPT procedure code
get_cpt_description(code) → str             # Lookup CPT description
```

**Date/Time Handling**:
```python
parse_hl7_date(hl7_date) → iso_date         # YYYYMMDD → YYYY-MM-DD
parse_iso_date(iso_date) → hl7_date         # YYYY-MM-DD → YYYYMMDD
```

**Personal Information**:
```python
normalize_phone(phone) → str                 # → (123) 456-7890
mask_phi(value, type) → str                 # Mask SSN, MRN, name, etc.
detect_phi(value) → Dict[str,bool]          # Detect PII/PHI in data
```

**Gender & Status Mapping**:
```python
gender_code_to_fhir(hl7_gender) → str       # M → male
fhir_gender_to_hl7(fhir_gender) → str       # male → M
marital_status_hl7_to_fhir(hl7) → str       # A → annulled
```

**Health Calculations**:
```python
calculate_age(dob) → int                    # Calculate patient age
validate_bmi(weight_kg, height_m) → Dict    # Calculate BMI category
```

**Example Usage**:
```python
from app.services.healthcare_transformations import HealthcareTransformations as HT

# Validate identifiers
assert HT.validate_npi("1234567890")  # True if valid NPI
assert HT.validate_mrn("MRN123456")   # True if valid format

# Map codes
icd10 = HT.map_icd9_to_icd10("250.00")  # Returns "E10.9" (diabetes)

# Parse dates
iso_date = HT.parse_hl7_date("20230315")  # Returns "2023-03-15"

# Mask sensitive data
masked_ssn = HT.mask_phi("123-45-6789", "ssn")  # Returns "XXX-XX-6789"

# Transform genders
fhir = HT.gender_code_to_fhir("M")  # Returns "male"
```

---

### 6. REST API Connector

**What it enables**:
- Connect to any HTTP API (Salesforce, Epic EHR, Athena, modern apps)
- Auto-detect API schema from responses
- Handle pagination (offset, cursor, page-based)
- Support authentication (API key, Basic, OAuth)
- Rate limiting and timeouts

**Usage**:
```python
config = {
  "base_url": "https://api.example.com",
  "auth_type": "apikey",  # or "basic", "oauth"
  "auth_token": "your-api-key"
}

connector = RESTConnector(config)

# Auto-detect schema from API
schema = await connector.detect_schema()

# Stream data from API endpoint
async for record in connector.read_data({
  "endpoint": "/v1/patients",
  "pagination_type": "offset",  # or "cursor", "page"
  "per_page": 100
}):
  print(record)  # Each API response record
```

---

### 7. Database Connector

**What it enables**:
- Direct database connections (PostgreSQL, MySQL, Oracle, SQL Server)
- Auto-detect schema from tables
- Stream data from queries
- Insert/update records

**Usage**:
```python
config = {
  "db_type": "postgresql",
  "connection_string": "postgresql://user:pass@localhost/dbname"
}

connector = DatabaseConnector(config)

# Get schema from table
schema = await connector.detect_schema()

# Stream data from table/query
async for record in connector.read_data({
  "table": "patients",
  # OR
  "query": "SELECT * FROM patients WHERE active = true"
}):
  print(record)

# Insert data into table
await connector.write_data({
  "table": "patient_mappings"
}, transformed_records)
```

---

## Architecture Changes

### New Directory Structure
```
backend/
├── app/
│   ├── queue/                    # NEW: Celery setup
│   │   ├── celery_app.py         # Celery configuration
│   │   ├── tasks.py              # Background job definitions
│   │   └── __init__.py
│   │
│   ├── connectors/               # ENHANCED
│   │   ├── base_connector.py     # (existing)
│   │   ├── csv_connector.py      # (existing)
│   │   ├── edi_connector.py      # (existing)
│   │   ├── hl7_connector.py      # NEW
│   │   ├── rest_connector.py     # NEW
│   │   ├── database_connector.py # NEW
│   │   └── __init__.py
│   │
│   ├── services/                 # ENHANCED
│   │   ├── llm_service.py        # (existing)
│   │   ├── error_service.py      # NEW: Error analysis
│   │   ├── healthcare_transformations.py  # NEW: 100+ health utils
│   │   └── __init__.py
│   │
│   ├── api/routes/               # ENHANCED
│   │   ├── auth.py               # (existing)
│   │   ├── schemas.py            # (existing)
│   │   ├── mappings.py           # (existing)
│   │   └── jobs.py               # NEW: Job scheduling
│   │
│   └── models/models.py          # ENHANCED: Team, Job, ExecutionLog
│
├── docker-compose.yml            # ENHANCED: Added celery_worker, celery_beat
└── requirements.txt              # ENHANCED: Celery, Redis, httpx, crontab
```

---

## API Summary (Phase 2)

### Job Scheduling
```
POST   /api/jobs/{mapping_id}/execute-now      # Run immediately
POST   /api/jobs/{mapping_id}/schedule         # Schedule (cron)
GET    /api/jobs/{job_id}/status               # Check status
GET    /api/jobs/{job_id}/logs                 # View logs
POST   /api/jobs/{job_id}/cancel               # Cancel job
```

### Unchanged (Phase 1)
```
POST   /api/auth/generate-key
GET    /api/auth/validate
POST   /api/schemas/detect
GET    /api/schemas/{id}
POST   /api/mappings/
GET    /api/mappings/{id}
POST   /api/mappings/{id}/suggest
POST   /api/mappings/{id}/execute              # NOW: Async (returns job_id)
```

---

## Database Migrations Needed

```sql
-- Teams support
CREATE TABLE teams (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_by VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add team_id to users
ALTER TABLE users ADD COLUMN team_id VARCHAR REFERENCES teams(id);
ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'editor';

-- Add team_id to projects
ALTER TABLE projects ADD COLUMN team_id VARCHAR REFERENCES teams(id);

-- Job tracking
CREATE TABLE jobs (
    id VARCHAR PRIMARY KEY,
    project_id VARCHAR NOT NULL REFERENCES projects(id),
    mapping_id VARCHAR NOT NULL REFERENCES mappings(id),
    status VARCHAR DEFAULT 'pending',
    schedule_cron VARCHAR,
    next_run TIMESTAMP,
    last_run TIMESTAMP,
    execution_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Execution logs
CREATE TABLE execution_logs (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR NOT NULL REFERENCES executions(id),
    record_number INT,
    source_field VARCHAR,
    target_field VARCHAR,
    source_value TEXT,
    target_value TEXT,
    transformation_code TEXT,
    error_message TEXT,
    ai_suggestion TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## How Phase 2 Compares to Competitors

```
Feature               Phase 1  Phase 2  Talend  Informatica  Zapier
─────────────────────────────────────────────────────────────────
Schema Detection (AI)   ✅      ✅       ❌       ❌          ❌
Healthcare Focus        ⚠️      ✅       ❌       ❌          ❌
Job Scheduling          ❌      ✅       ✅       ✅          ✅
Multiple Connectors     ❌      ✅       ✅       ✅          ✅
Multi-user Teams        ❌      ✅       ✅       ✅          ✅
Error Recovery (AI)     ❌      ✅       ❌       ❌          ❌
Cost                    ✅      ✅       ❌       ❌          ❌
Self-hosted            ✅      ✅       ⚠️       ✅          ❌
Setup Time             ✅      ✅       ❌       ❌          ⚠️
Open Source             ✅      ✅       ❌       ❌          ❌
```

---

## Migration Path from Phase 1

**Existing users can upgrade seamlessly**:
1. Pull latest code
2. Run database migrations
3. Start Celery worker + beat
4. Existing mappings work as-is
5. New job scheduling features available immediately
6. HL7v2 support available for new mappings

**No breaking changes**:
- All Phase 1 APIs remain unchanged
- /api/mappings/{id}/execute still works (now returns job_id)
- Database backwards compatible
- Existing API keys still valid

---

## Next Steps

See [PHASE2_PLAN.md](./PHASE2_PLAN.md) for implementation timeline and success criteria.
