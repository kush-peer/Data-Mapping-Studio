# Contributing to Data Mapping Studio

Thank you for your interest in contributing! This is an open-source project dedicated to making healthcare data integration accessible to everyone.

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our Code of Conduct in all interactions.

## How to Contribute

### 1. Report Bugs

Found a bug? Please create an issue with:
- **Description**: Clear description of the problem
- **Steps to Reproduce**: How to reproduce the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What's happening instead
- **Environment**: OS, Python version, relevant versions
- **Logs**: Any error messages or logs

### 2. Suggest Features

Have a great idea? Open a feature request with:
- **Title**: Clear, concise feature name
- **Description**: What and why (use cases)
- **Benefits**: How it helps users
- **Alternatives**: Any alternatives considered

### 3. Write Code

#### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/your-org/data-mapping-studio.git
cd data-mapping-studio

# Create feature branch (always from main)
git checkout -b feature/your-feature-name

# Frontend development
npm install
npm run dev

# Backend development
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

#### Code Style

**Python (Backend)**
```bash
# Format code
black app/ main.py

# Check linting
flake8 app/ main.py

# Type checking
mypy app/
```

**TypeScript/JavaScript (Frontend)**
```bash
# Format code
npm run lint -- --fix

# Type checking
tsc --noEmit
```

#### Writing Tests

**Backend Tests**
```python
# tests/test_my_feature.py
import pytest
from app.models import User

def test_my_feature(client, auth_headers, db):
    """Test description"""
    response = client.post(
        "/api/endpoint",
        json={"field": "value"},
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["field"] == "value"
```

Run tests:
```bash
cd backend
pytest tests/test_my_feature.py -v
```

**Frontend Tests**
```typescript
// tests/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

#### Documentation

Update documentation for:
- New features (README.md, backend/README.md)
- API changes (docstrings, /docs endpoint)
- Configuration (SETUP.md)
- Examples (comments in code)

### 4. Create Connectors

Adding a new data connector? Follow the pattern:

```python
# app/connectors/my_connector.py
from app.connectors.base_connector import BaseConnector
from typing import Dict, List, Any, AsyncGenerator

class MyConnector(BaseConnector):
    """Connector for MyDataSource"""

    async def detect_schema(self, file_content: bytes = None, **kwargs) -> Dict[str, Any]:
        """Detect schema from data sample"""
        # Implementation
        return {
            "fields": [
                {"name": "field_name", "type": "string", "description": "..."}
            ],
            "source_type": "my_source"
        }

    async def read_data(self, file_path: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream data records"""
        # Implementation
        yield {"field": "value"}

    async def write_data(self, output_path: str, data: List[Dict[str, Any]]) -> str:
        """Write transformed data"""
        # Implementation
        return output_path
```

Register in `app/api/routes/schemas.py`:
```python
CONNECTOR_MAP = {
    "my_source": MyConnector,
    # ...
}
```

### 5. Submit a Pull Request

#### Before Submitting

1. **Update code**
   ```bash
   git add .
   git commit -m "feat: Add my feature

   - Detailed description
   - More details

   Fixes #123"
   ```

2. **Run tests**
   ```bash
   # Backend
   cd backend && pytest --cov=app

   # Frontend
   npm test -- --coverage
   ```

3. **Check formatting**
   ```bash
   # Python
   black . && flake8 .

   # TypeScript
   npm run lint
   ```

4. **Update documentation**
   - Update README if feature is user-facing
   - Add docstrings to functions
   - Update SETUP.md if configuration changed

#### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] All tests pass

## Screenshots (if applicable)
```

### 6. Review Process

1. **Automated Checks**
   - Tests must pass (GitHub Actions)
   - Code coverage should not decrease
   - Linting must pass

2. **Code Review**
   - Maintainers will review your PR
   - Feedback provided within 48 hours
   - May request changes

3. **Merge**
   - Approved by at least 1 maintainer
   - All checks pass
   - Branch is up to date with main

## Development Guidelines

### Backend (Python)

1. **Use Type Hints**
   ```python
   async def process_file(file_path: str, format: str = "csv") -> Dict[str, Any]:
       pass
   ```

2. **Handle Errors Gracefully**
   ```python
   try:
       # code
   except SpecificError as e:
       logger.error(f"Failed to process: {e}")
       raise HTTPException(status_code=400, detail=str(e))
   ```

3. **Use Async/Await**
   ```python
   async def read_file(path: str):
       async for record in connector.read_data(path):
           yield record
   ```

4. **Document with Docstrings**
   ```python
   async def detect_schema(self, file_content: bytes) -> Dict:
       """
       Detect schema from file content.

       Args:
           file_content: Raw file bytes

       Returns:
           Dictionary with 'fields' key containing field definitions

       Raises:
           ValueError: If file format is invalid
       """
   ```

### Frontend (React/TypeScript)

1. **Use TypeScript**
   ```typescript
   interface SchemaField {
     name: string;
     type: 'string' | 'number' | 'date' | 'boolean';
     required: boolean;
   }
   ```

2. **Component Structure**
   ```typescript
   // MyComponent.tsx
   interface Props {
     data: Schema[];
     onSelect: (schema: Schema) => void;
   }

   export const MyComponent: React.FC<Props> = ({ data, onSelect }) => {
     return <div>...</div>;
   };
   ```

3. **Error Handling**
   ```typescript
   try {
     const result = await api.executeMapping(mappingId, file);
   } catch (error) {
     toast.error(`Failed: ${error.message}`);
   }
   ```

## Project Structure

### Backend Architecture

```
backend/
├── app/
│   ├── api/routes/          # API endpoints
│   ├── connectors/          # Data source connectors (extensible)
│   ├── engine/              # Transformation execution
│   ├── models/              # SQLAlchemy ORM
│   ├── services/            # Business logic (LLM, etc.)
│   └── database/            # Database setup
├── tests/                   # Test suite
├── main.py                  # FastAPI app entry
└── requirements.txt
```

### Frontend Architecture

```
src/
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── MappingCanvas.tsx    # Main mapping interface
│   └── ...
├── pages/                   # Full pages
├── services/                # API client, utilities
├── hooks/                   # Custom React hooks
└── App.tsx
```

## Release Process

1. **Version Bump**
   ```bash
   # major.minor.patch (semantic versioning)
   # v1.0.0 = initial release
   ```

2. **Update CHANGELOG**
   ```markdown
   ## v1.1.0 - 2025-03-20

   ### Added
   - New JSON connector
   - Real-time WebSocket updates

   ### Fixed
   - CSV parsing with special characters
   ```

3. **Create Release Tag**
   ```bash
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin v1.1.0
   ```

## Community

- **GitHub Issues**: https://github.com/your-org/data-mapping-studio/issues
- **Discussions**: https://github.com/your-org/data-mapping-studio/discussions
- **Discord**: Coming soon
- **Email**: contribute@your-domain.com

## First-Time Contributors

Look for issues labeled:
- `good first issue` - Perfect for getting started
- `help wanted` - Community input needed
- `documentation` - Help improve docs

Don't be intimidated! We're here to help. Ask questions in issues or discussions.

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Twitter/social media shoutouts

Thank you for contributing! 🎉
