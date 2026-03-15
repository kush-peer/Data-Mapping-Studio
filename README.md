# Data Mapping Studio - AI-Driven Healthcare Data Integration

An open-source, AI-native data mapping platform that kills paid tools like Talend, Informatica, and Zapier. Built for healthcare data workflows with comprehensive support for EDI X12, CSV, and future connectors.

## 🎯 Mission

Provide healthcare organizations with a **free, open-source, self-hostable** alternative to expensive data integration platforms. Powered by Claude AI for intelligent schema detection, field mapping suggestions, and transformation code generation.

## ⭐ Why Data Mapping Studio?

| Feature | This Tool | Talend | Informatica | Zapier |
|---------|-----------|--------|-------------|--------|
| **Cost** | FREE | $$$$ | $$$$ | Monthly SaaS |
| **Self-Hosted** | ✅ Yes | ⚠️ Enterprise only | ✅ Yes | ❌ No |
| **AI-Powered** | ✅ Claude | ❌ None | ❌ None | ⚠️ Limited |
| **Healthcare Focus** | ✅ Yes | ⚠️ Generic | ⚠️ Generic | ⚠️ Generic |
| **Setup Time** | 15 minutes | Weeks | Weeks | Hours |
| **Source Code** | ✅ Open | ❌ Closed | ❌ Closed | ❌ Closed |

## ✨ Key Features

### Core Capabilities
- **Visual Field Mapping**: Intuitive drag-and-drop canvas for field connections
- **AI-Powered Schema Detection**: Upload any healthcare data → Claude auto-detects schema
- **Intelligent Mapping Suggestions**: Claude analyzes both schemas and suggests smart mappings
- **Smart Transformations**: AI generates Python transformation code from UI rules
- **Data Execution**: Run mappings on real data with streaming for memory efficiency
- **Healthcare-First**: Built for EDI X12, healthcare data standards, and HIPAA compliance

### Data Connectors (MVP)
- **CSV/Delimited Files**: Auto-detect delimiters, handle encoding
- **EDI X12**: Parse healthcare claims (837), remittance (835), and more
- **Phase 2+**: JSON, PostgreSQL, REST APIs, HL7v2, FHIR, S3

### Enterprise Features
- **Execution History**: Track all data transformations with logs
- **Sample Preview**: Test mappings on first N records before full execution
- **Error Tracking**: Detailed error reports per record
- **Docker-Ready**: One command to run everything locally or deploy

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/data-mapping-studio.git
cd data-mapping-studio

# 2. Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env and add your Claude API key

# 3. Run with Docker Compose
docker-compose up
```

Then:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Option 2: Local Development

#### Prerequisites
- Node.js (v18+)
- Python (3.11+)
- PostgreSQL (15+)
- pip package manager

#### Frontend Setup

```bash
npm install
npm run dev
# Frontend available at http://localhost:5173
```

#### Backend Setup

```bash
cd backend

# Create Python environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Initialize database
python -c "from app.database import init_db; init_db()"

# Run server
python main.py
# API available at http://localhost:8000
```

See [backend/README.md](./backend/README.md) for detailed backend documentation.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **shadcn/ui** (component library)
- **React Router** (routing)
- **Lucide React** (icons)

### Backend
- **Python 3.11+**
- **FastAPI** (async web framework)
- **SQLAlchemy** (ORM)
- **PostgreSQL** (production database, SQLite for development)
- **Claude API** (AI/LLM integration)
- **Celery + Redis** (job queue, for Phase 2+)

### Infrastructure
- **Docker & Docker Compose** (containerization)
- **Pytest** (testing)
- **Uvicorn** (ASGI server)

## 📁 Project Structure

```
data-mapping-studio/
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom hooks
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Python FastAPI backend
│   ├── app/
│   │   ├── api/routes/         # API endpoints
│   │   ├── connectors/         # Data connectors (CSV, EDI, etc.)
│   │   ├── engine/             # Execution engine
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── services/           # Business logic (LLM, etc.)
│   │   └── database/           # Database setup
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md
│
├── docker-compose.yml          # Local development setup
├── README.md                   # This file
└── .gitignore
```

## 📖 Usage

### Basic Workflow

1. **Create Project** - Organize your mappings by project
2. **Upload Source Data** - CSV, EDI X12, or any supported format
3. **Auto-Detect Schema** - Claude AI analyzes your data structure
4. **Create Target Schema** - Define your output format
5. **Get Mapping Suggestions** - AI suggests field mappings
6. **Review & Adjust** - Fine-tune mappings visually
7. **Test Sample** - Preview output on first N records
8. **Execute** - Run full transformation
9. **Download Output** - Get your mapped data

### Configuration

Backend configuration via `backend/.env`:
```env
DATABASE_URL=postgresql://user:pass@localhost/dms
ANTHROPIC_API_KEY=your_claude_api_key
CORS_ORIGINS=http://localhost:5173
```

Frontend connects to backend at `VITE_API_URL` (default: `http://localhost:8000`)

## 🚢 Deployment

### Docker (Recommended)

```bash
docker-compose -f docker-compose.yml up -d
```

### Kubernetes

```bash
# Build images
docker build -t dms-backend backend/
docker build -t dms-frontend .

# Deploy with kubectl
kubectl apply -f k8s/
```

### Cloud Providers

- **Heroku**: `git push heroku main`
- **AWS/EC2**: Use Docker image
- **Digital Ocean**: One-click Docker app
- **Render/Railway**: Connect GitHub repo

## 🔒 Security

- All data processing happens on your infrastructure (no cloud vendor lock-in)
- Supports HIPAA compliance with proper configuration
- Credential encryption for database connections
- API key authentication for backend
- CORS properly configured for frontend

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push branch (`git push origin feature/my-feature`)
5. Open Pull Request

### Development

```bash
# Set up development environment
docker-compose up

# Run tests
cd backend && pytest
cd frontend && npm test

# Check code quality
cd backend && black . && flake8 .
cd frontend && npm run lint
```

## 📄 License

This project is licensed under the **Apache License 2.0** - see [LICENSE](LICENSE) file for details.

### Free to Use
- ✅ Use commercially
- ✅ Modify source code
- ✅ Distribute
- ✅ Private use
- ✅ Patent use

### Requirements
- ⚠️ Include LICENSE
- ⚠️ Document changes
- ⚠️ No warranty

## 🙋 Support

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Discord**: Community support (coming soon)
- **Documentation**: Read [backend/README.md](./backend/README.md) and inline code comments

## 🎯 Roadmap

### Phase 1 (MVP) - Complete ✅
- [x] AI schema detection
- [x] CSV & EDI connectors
- [x] Execution engine
- [x] Docker setup

### Phase 2 (Coming Soon)
- [ ] JSON connector
- [ ] Database connections (PostgreSQL, MySQL)
- [ ] REST API connector
- [ ] Job scheduling
- [ ] Web UI improvements

### Phase 3
- [ ] HL7v2 support
- [ ] FHIR support
- [ ] Multi-user teams
- [ ] Audit logging

---

**Built with ❤️ for the healthcare community**

Last Updated: March 2025
