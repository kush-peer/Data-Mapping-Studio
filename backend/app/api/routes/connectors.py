from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.database import get_db
from app.models import User, Project
from app.api.dependencies import get_current_user
import json

router = APIRouter(prefix="/api/connectors", tags=["connectors"])


class ConnectorConfig(BaseModel):
    """Connector configuration for data source/destination."""
    connector_type: str  # "csv", "json", "database", "rest"
    name: str
    config: Dict[str, Any]  # Connector-specific configuration
    is_source: bool = True  # True for source, False for destination


class ConnectorCredential(BaseModel):
    """Secure credential storage for connectors."""
    connector_id: str
    password_or_token: str  # Will be encrypted before storage


class JSONConnectorConfig(BaseModel):
    """JSON connector configuration."""
    is_jsonl: bool = False
    root_path: Optional[str] = None
    encoding: str = "utf-8"


class DatabaseConnectorConfig(BaseModel):
    """Database connector configuration."""
    db_type: str  # "postgresql", "mysql", "oracle", "mssql"
    host: str
    port: int
    database: str
    username: str
    # password will be stored separately for security


class RESTConnectorConfig(BaseModel):
    """REST API connector configuration."""
    base_url: str
    auth_type: str = "none"  # "none", "apikey", "basic", "oauth"
    endpoint: str
    method: str = "GET"
    pagination_type: Optional[str] = None  # "offset", "limit", "cursor", "page"
    # auth_token will be stored separately for security


@router.get("/available")
async def list_available_connectors(current_user: User = Depends(get_current_user)):
    """
    List all available connectors with descriptions.
    """
    return {
        "connectors": [
            {
                "type": "csv",
                "name": "CSV/TSV/Delimited Files",
                "description": "Read and write CSV, TSV, and other delimited text files",
                "supported_operations": ["read", "write"],
                "config_fields": [
                    {"name": "delimiter", "type": "string", "default": ",", "required": False},
                    {"name": "encoding", "type": "string", "default": "utf-8", "required": False},
                    {"name": "skip_rows", "type": "integer", "default": 0, "required": False},
                ]
            },
            {
                "type": "json",
                "name": "JSON Files",
                "description": "Read and write JSON and JSON Lines (JSONL) files",
                "supported_operations": ["read", "write"],
                "config_fields": [
                    {"name": "is_jsonl", "type": "boolean", "default": False, "required": False},
                    {"name": "root_path", "type": "string", "default": None, "required": False},
                    {"name": "encoding", "type": "string", "default": "utf-8", "required": False},
                ]
            },
            {
                "type": "database",
                "name": "Relational Databases",
                "description": "Connect to PostgreSQL, MySQL, Oracle, or SQL Server",
                "supported_operations": ["read", "write"],
                "config_fields": [
                    {"name": "db_type", "type": "string", "required": True},
                    {"name": "host", "type": "string", "required": True},
                    {"name": "port", "type": "integer", "required": True},
                    {"name": "database", "type": "string", "required": True},
                    {"name": "username", "type": "string", "required": True},
                    {"name": "password", "type": "password", "required": True},
                ]
            },
            {
                "type": "rest",
                "name": "REST APIs",
                "description": "Connect to REST APIs with authentication support",
                "supported_operations": ["read"],
                "config_fields": [
                    {"name": "base_url", "type": "string", "required": True},
                    {"name": "endpoint", "type": "string", "required": True},
                    {"name": "method", "type": "string", "default": "GET", "required": False},
                    {"name": "auth_type", "type": "string", "default": "none", "required": False},
                    {"name": "auth_token", "type": "password", "required": False},
                    {"name": "pagination_type", "type": "string", "required": False},
                ]
            },
            {
                "type": "edi",
                "name": "EDI X12",
                "description": "Parse EDI X12 messages (healthcare claims, remittance, etc.)",
                "supported_operations": ["read"],
                "config_fields": [
                    {"name": "version", "type": "string", "default": "5010", "required": False},
                ]
            },
            {
                "type": "hl7",
                "name": "HL7v2 Messages",
                "description": "Parse HL7v2 clinical messages",
                "supported_operations": ["read"],
                "config_fields": []
            },
        ]
    }


@router.post("/test-connection")
async def test_connector_connection(
    connector_type: str,
    config: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Test a connector configuration without saving it.
    Useful for validating credentials and connectivity.
    """
    try:
        if connector_type == "database":
            # Test database connection
            from app.connectors import DatabaseConnector
            conn = DatabaseConnector(config)
            if not conn.engine:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to establish database connection"
                )
            # Try to get table list as a basic test
            from sqlalchemy import inspect
            inspector = inspect(conn.engine)
            tables = inspector.get_table_names()
            return {
                "status": "success",
                "message": "Database connection successful",
                "tables_found": len(tables)
            }

        elif connector_type == "rest":
            # Test REST API connection
            import httpx
            import asyncio
            base_url = config.get("base_url", "")
            endpoint = config.get("endpoint", "")
            auth_type = config.get("auth_type", "none")
            auth_token = config.get("auth_token")

            headers = {}
            if auth_type == "apikey" and auth_token:
                headers["Authorization"] = f"Bearer {auth_token}"
            elif auth_type == "basic" and auth_token:
                headers["Authorization"] = f"Basic {auth_token}"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{base_url}{endpoint}",
                    headers=headers,
                    timeout=10.0
                )
                if response.status_code < 400:
                    return {
                        "status": "success",
                        "message": "REST API connection successful",
                        "status_code": response.status_code
                    }
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"REST API returned status {response.status_code}"
                    )

        elif connector_type == "json":
            # JSON connector doesn't need connection test
            return {
                "status": "success",
                "message": "JSON connector ready (no connection required)"
            }

        else:
            return {
                "status": "success",
                "message": f"Connector {connector_type} configuration is valid"
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection test failed: {str(e)}"
        )


@router.get("/supported")
async def get_supported_formats(current_user: User = Depends(get_current_user)):
    """
    Get list of supported file formats and data sources.
    """
    return {
        "file_formats": [
            {"type": "csv", "extensions": [".csv", ".tsv", ".txt"], "name": "CSV/TSV Files"},
            {"type": "json", "extensions": [".json", ".jsonl"], "name": "JSON Files"},
            {"type": "edi", "extensions": [".edi", ".x12"], "name": "EDI X12"},
            {"type": "hl7", "extensions": [".hl7", ".txt"], "name": "HL7v2"},
        ],
        "data_sources": [
            {"type": "database", "name": "PostgreSQL, MySQL, Oracle, SQL Server"},
            {"type": "rest", "name": "REST APIs (with auth support)"},
            {"type": "file", "name": "Uploaded Files (CSV, JSON, EDI, HL7)"},
        ],
        "encoding_options": [
            "utf-8",
            "iso-8859-1",
            "windows-1252",
            "ascii",
            "utf-16",
        ]
    }


@router.get("/healthcare-connectors")
async def get_healthcare_connectors(current_user: User = Depends(get_current_user)):
    """
    Get healthcare-specific connector information.
    Phase 3+ feature for Epic, Cerner, Athena EHR APIs.
    """
    return {
        "coming_soon": [
            {
                "type": "epic",
                "name": "Epic EHR",
                "description": "Connect to Epic EHR systems via API",
                "use_cases": ["Patient data", "Clinical notes", "Lab results"],
                "status": "Phase 3",
            },
            {
                "type": "cerner",
                "name": "Cerner Millennium",
                "description": "Connect to Cerner EHR systems",
                "use_cases": ["Patient data", "Orders", "Results"],
                "status": "Phase 3",
            },
            {
                "type": "athena",
                "name": "Athena EHR",
                "description": "Connect to Athena health systems",
                "use_cases": ["Practice data", "Patient data"],
                "status": "Phase 3",
            },
            {
                "type": "fhir",
                "name": "FHIR Standard",
                "description": "Modern healthcare data exchange standard",
                "use_cases": ["Interoperability", "Data exchange"],
                "status": "Phase 3",
            },
            {
                "type": "salesforce_health",
                "name": "Salesforce Health Cloud",
                "description": "Connect to Salesforce Health Cloud",
                "use_cases": ["Patient engagement", "Care teams"],
                "status": "Phase 3",
            },
        ]
    }
