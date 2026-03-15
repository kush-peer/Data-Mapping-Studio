# Phase 2 Implementation Plan - Enterprise Features & Healthcare Connectors

## Vision Alignment

**Phase 1 Verdict**: Good foundation (MVP), but lacks enterprise features needed to compete with Talend/Informatica.

**Phase 2 Mission**: Build the features that make us a REAL alternative to paid tools.

### What Will Change Phase 2 into a Competitive Product
```
Phase 1: "Nice proof-of-concept"
+ Job Scheduling (Celery)
+ HL7v2 Connector (healthcare critical)
+ Multi-User Support (teams can use it)
+ Error Recovery (users can debug)
+ Workflow Builder (complex pipelines)
= Phase 2: "Serious competitor to Talend"
```

---

## Phase 2 Feature Breakdown

### Tier 1: Critical for Enterprise (Weeks 1-2)

#### 1. Async Job Processing & Scheduling

**Why**: Talend/Informatica success is built on scheduling. Without this, we can only do one-off mappings.

**Implementation**:
```
backend/
├── app/
│   ├── queue/
│   │   ├── celery_app.py          # Celery configuration
│   │   ├── tasks.py               # Background job definitions
│   │   └── __init__.py
│   ├── models/models.py           # NEW: Job, Schedule, Execution models
│   └── api/routes/
│       └── jobs.py                # NEW: Job management API
├── docker-compose.yml             # ADD: Redis service
└── backend/requirements.txt        # ADD: celery, redis
```

**API Endpoints**:
```
POST   /api/jobs/{mapping_id}/execute    # Run immediately
POST   /api/jobs/{mapping_id}/schedule   # Schedule recurring
GET    /api/jobs/{job_id}/status        # Check execution status
GET    /api/jobs/{job_id}/logs          # View execution logs
DELETE /api/jobs/{job_id}               # Cancel running job
```

**Data Model**:
```python
class Job(Base):
    id: str (PK)
    mapping_id: str (FK)
    status: enum [pending, running, completed, failed, scheduled]
    schedule_cron: str (optional) # "0 9 * * *" = daily at 9am
    next_run: datetime
    last_run: datetime
    execution_count: int
    failure_count: int
    logs: JSON (execution output)
    created_at: datetime
    updated_at: datetime

class JobExecution(Base):
    id: str (PK)
    job_id: str (FK)
    status: enum [running, completed, failed]
    started_at: datetime
    completed_at: datetime
    records_processed: int
    records_failed: int
    errors: JSON
```

**Celery Task**:
```python
@celery_app.task(name='execute_mapping')
def execute_mapping_task(job_id, mapping_id, source_file_path):
    # 1. Load job from database
    # 2. Run ExecutionEngine.execute_mapping()
    # 3. Update Job status
    # 4. Notify user (email, webhook)
    # 5. Store results in database
    pass

@celery_app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    # Set up scheduled jobs from database
    # Every minute, check for jobs that should run
    sender.add_periodic_task(60.0, check_scheduled_jobs.s())
```

#### 2. Error Recovery & Debugging

**Why**: When a mapping fails, users need to understand why and fix it. Claude can help!

**Implementation**:
```
backend/app/services/
├── error_service.py               # NEW: Error analysis & recovery
├── llm_service.py                 # ENHANCE: Add error recovery
└── logging_service.py             # NEW: Structured logging
```

**Features**:
```
When mapping fails:
1. Capture error + context (failed record, transformation code, stack trace)
2. Send to Claude: "Why did this transformation fail? How to fix it?"
3. Store suggestion in database
4. Show user: "This failed because... Try this instead..."
5. Allow user to click "Apply suggestion" to auto-fix

Structured Logging:
- Log each transformation step as JSON
- Include: field name, input value, transformation code, output value, errors
- Users can view logs to debug issues
```

**Data Model**:
```python
class ExecutionLog(Base):
    id: str (PK)
    execution_id: str (FK)
    record_number: int
    source_field: str
    target_field: str
    source_value: str
    target_value: str (optional)
    transformation_code: str
    error_message: str (optional)
    ai_suggestion: str (optional)  # Claude's fix suggestion
    timestamp: datetime
```

**API Endpoints**:
```
GET    /api/executions/{id}/logs        # View detailed logs
POST   /api/executions/{id}/retry       # Re-run with suggested fixes
GET    /api/executions/{id}/debug       # Debug view (source + target values)
```

---

### Tier 1: Healthcare Critical (Weeks 2-4)

#### 3. HL7v2 Connector

**Why**: HL7v2 is THE standard for clinical data. Without it, we can't handle patient records, lab results, care documentation.

**What it enables**:
- HL7 ADT (Admit, Discharge, Transfer) messages
- HL7 ORU (Observation Result) messages
- HL7 ORM (Order messages)
- Lab results, vitals, medications
- Patient demographics, clinical history

**Implementation**:
```
backend/app/connectors/
├── hl7_connector.py               # NEW: HL7v2 parser
├── healthcare_transformations.py  # NEW: ICD-10, NPI, medical codes
└── fhir_adapter.py                # NEW: Convert HL7 to FHIR (Phase 2.5)
```

**HL7v2 Structure**:
```
HL7 Message: Segments separated by \r, fields by |, subfields by ^

MSH|^~\&|SendingApp|SendingFac|ReceivingApp|ReceivingFac|20230315120000||ADT^A01|MSG123|P|2.5
PID|||12345^^^MRN||DOE^JOHN||19800101|M|...
PV1|1|O|CCU^CCU01^01|H|...
OBX|1|NM|GLU^GLUCOSE||150|mg/dL|70-110|H|||F

Goal: Convert this into:
{
  "message_type": "ADT",
  "event": "A01",
  "patient": {
    "mrn": "12345",
    "name": "DOE, JOHN",
    "dob": "1980-01-01",
    "gender": "M"
  },
  "visit": {...},
  "observations": [...]
}
```

**Data Model**:
```python
class HL7Schema(Schema):
    message_type: str  # "ADT", "ORU", "ORM", etc.
    event_type: str    # "A01", "A02", etc.
    version: str       # "2.3", "2.5", "2.8"
    fields: JSON       # Segment definitions
```

**Connector Methods**:
```python
async def detect_schema(self, file_content: bytes):
    # 1. Parse first HL7 message
    # 2. Extract message type & event
    # 3. Parse all segments (MSH, PID, OBX, etc.)
    # 4. Build schema from segment structure
    # 5. Use Claude to classify fields (demographics vs clinical vs order)
    return schema

async def read_data(self, file_path: str):
    # 1. Read file (may have multiple HL7 messages separated by \r)
    # 2. For each message, parse segments
    # 3. Convert to dict
    # 4. Yield one record per message
    yield record

async def write_data(self, output_path: str, data: List[Dict]):
    # Convert dicts back to HL7 format
    # Write to file
```

**Healthcare-Specific Transformations**:
```python
class HealthcareTransformations:
    @staticmethod
    def validate_npi(npi: str) -> bool:
        """Validate NPI checksum"""

    @staticmethod
    def map_icd10(icd9: str) -> str:
        """Convert ICD-9 to ICD-10 code"""

    @staticmethod
    def parse_hl7_date(hl7_date: str) -> str:
        """Convert HL7 date (YYYYMMDD) to ISO (YYYY-MM-DD)"""

    @staticmethod
    def map_gender_code(hl7_code: str) -> str:
        """Convert HL7 gender (M/F/O) to FHIR (male/female/other)"""
```

---

### Tier 1: Multi-User Support (Week 3-4)

#### 4. Teams & Access Control

**Why**: Organizations have multiple people. Without multi-user, tool is useless in teams.

**Implementation**:
```
Database Schema Changes:
User (existing)
├── id, email, api_key
├── NEW: team_id (optional)
├── NEW: role (admin, editor, viewer)
└── NEW: created_at, updated_at

NEW: Team
├── id, name, created_by (user_id)
├── members: List[User]
├── projects: List[Project]
└── api_keys: List[APIKey]

NEW: APIKey
├── id, key, team_id
├── created_by (user_id)
├── scopes: List[str] # ["mappings:read", "mappings:execute", ...]
├── rate_limit: int   # requests per minute
└── expires_at: datetime

Access Control:
- User can belong to multiple teams
- Team owns projects, schemas, mappings
- Each user has role: admin (full), editor (run mappings), viewer (read-only)
- API keys scoped to specific permissions
```

**API Changes**:
```
NEW Teams Endpoints:
POST   /api/teams                  # Create team
GET    /api/teams                  # List my teams
POST   /api/teams/{id}/members     # Add user to team
DELETE /api/teams/{id}/members/{user_id}  # Remove user

Updated Project Endpoints:
- All projects now owned by team, not user
- ACL checks before each operation
- Teams can share projects internally
```

**Implementation Details**:
```python
# middleware/auth.py - ENHANCE existing get_current_user
async def get_current_team(
    api_key: str = Header(...),
    db: Session = Depends(get_db)
) -> Team:
    # Extract team from API key
    # Verify user is member of team
    # Return team (with permission check)

# All routes need: @inject_team dependency
@router.post("/api/projects/")
async def create_project(
    name: str,
    team: Team = Depends(get_current_team),  # NEW
    db: Session = Depends(get_db)
):
    # Only allow if user has "projects:write" permission in team
    verify_permission(team, "projects:write")
    # Create project owned by team
```

---

### Tier 2: More Connectors (Weeks 2-3)

#### 5. REST API Connector

**Why**: Connects to any HTTP API (Salesforce, Epic, modern apps).

**Features**:
```
- Automatic schema detection from API responses
- Pagination handling (offset, cursor, page-based)
- Authentication (API key, OAuth, Basic auth)
- Rate limiting (respect provider limits)
- Error handling (retry, backoff)
- Incremental sync (detect & process only new records)
```

#### 6. Database Connector (PostgreSQL, MySQL, Oracle)

**Why**: Direct database access is essential for enterprise workflows.

**Features**:
```
- Auto-detect schema from tables
- Query builder UI
- Support for stored procedures
- Connection pooling (efficient resource use)
- CDC (Change Data Capture) - detect new/updated records
- Transaction support
```

#### 7. JSON Connector

**Why**: Nested JSON is common in APIs and modern systems.

**Features**:
```
- Handle nested objects and arrays
- Flatten or keep nested structure
- JSONPath support for field selection
```

---

### Tier 2: Workflow Orchestration (Week 4+)

#### 8. Workflow Builder

**Why**: Complex data pipelines require chaining multiple mappings.

**Features**:
```
Workflow = Directed Acyclic Graph (DAG) of mappings

Example:
1. Extract patient data from EHR API
2. Map to standard format
3. Validate against rules
4. Transform for EDI claims
5. Upload to claims processor

Implementation:
- Store as DAG in database
- Support branching: if validation passes → proceed, else → alert
- Support error handling: if step fails → retry or skip
- Execute in order with dependency tracking
```

---

## Implementation Timeline

```
Week 1-2: Job Scheduling + Error Recovery
├─ Celery integration (4 days)
├─ Redis setup (1 day)
├─ Job tracking API (2 days)
├─ Error logging & Claude suggestions (3 days)
└─ Tests (2 days)

Week 2-3: HL7v2 Connector
├─ HL7v2 parser (4 days)
├─ Healthcare transformations library (2 days)
├─ Tests with real HL7 samples (2 days)
└─ Documentation (1 day)

Week 3-4: Multi-User + REST/DB Connectors
├─ Team & ACL model (2 days)
├─ REST connector (2 days)
├─ PostgreSQL connector (2 days)
├─ Tests & migration (2 days)
└─ Documentation (1 day)

Week 4+: Workflow Builder (Phase 2B)
├─ DAG model (2 days)
├─ Execution engine enhancements (3 days)
├─ UI (if time permits)
└─ Tests (2 days)

Total: 5-6 weeks for full Phase 2
```

---

## Success Criteria for Phase 2

### Features
- ✅ Job scheduling working (cron, webhooks)
- ✅ HL7v2 messages parsed correctly
- ✅ Multi-user teams with ACL
- ✅ Error recovery suggestions from Claude
- ✅ 10+ connectors (CSV, EDI, HL7v2, JSON, REST, PostgreSQL, MySQL, Oracle, S3, Kafka)
- ✅ Workflow DAG execution
- ✅ 80%+ test coverage

### Quality
- ✅ Documentation for all new features
- ✅ Healthcare-specific guides
- ✅ Real healthcare customer using it
- ✅ No critical bugs

### Adoption
- ✅ 1,000+ GitHub stars
- ✅ 100+ active users
- ✅ 10+ community forks
- ✅ Healthcare case study

---

## Risk Mitigation

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Celery complexity | Medium | Use simple Redis, document setup |
| HL7v2 standard complexity | High | Use existing library, Claude for parsing |
| Multi-user security | High | Review ACL logic, security audit |
| Performance degradation | Medium | Add caching, optimize queries |
| Timeline overrun | Medium | Prioritize features, skip Tier 2 if needed |

---

## Team Recommendations

**If Solo Developer**:
- Focus on Tier 1 features (scheduling, HL7v2, multi-user, error recovery)
- Skip Tier 2 connectors (do later)
- Skip workflow builder (Phase 2B)
- Realistic timeline: 6-8 weeks

**If Small Team (2-3 people)**:
- Parallel: One on scheduling, one on HL7v2, one on multi-user
- Realistic timeline: 4-5 weeks

**If Well-Funded Team (4+ people)**:
- Full Phase 2 including workflow builder
- Realistic timeline: 3 weeks
- Can start Phase 3 in parallel

---

## How Phase 2 Addresses Gap vs Talend/Informatica

```
Current Gap (Phase 1):

Talend: 50+ connectors, scheduling, real-time, multi-user, compliance
This: 2 connectors, no scheduling, no multi-user

Phase 2 Result:

This: 10+ connectors, scheduling ✅, multi-user ✅, healthcare-first ✅, AI-powered ✅
Talend: Still has more connectors, but we have:
  - 90% cost savings
  - AI assistance for mappings
  - Healthcare focus (they have none)
  - Open source (they don't)
  - Faster setup (self-hosted)
```

---

## Alignment with Original Vision

**Original**: "AI-native healthcare data integration platform that kills paid tools"

**After Phase 2**:
```
✅ AI-native: Claude powers schema detection, transformations, error recovery
✅ Healthcare: HL7v2 support, healthcare transformations, HIPAA-ready
✅ Data integration: 10+ connectors covering most integration needs
✅ Kills paid tools: Free + open-source + self-hosted + no lock-in
✅ Enterprise-ready: Scheduling, multi-user, auditing, workflow orchestration

This becomes a REAL alternative, not just a proof-of-concept.
```

---

**Next Step**: Execute Phase 2 implementation starting with Tier 1 features.
