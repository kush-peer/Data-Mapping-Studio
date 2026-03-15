from abc import ABC, abstractmethod
from typing import Dict, List, Any, AsyncGenerator
import json


class BaseConnector(ABC):
    """Abstract base class for all data connectors"""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

    @abstractmethod
    async def detect_schema(self, file_content: bytes = None, sample_data: List[Dict] = None) -> Dict[str, Any]:
        """
        Detect schema from data samples.
        Returns schema dict with fields array.
        """
        pass

    @abstractmethod
    async def read_data(self, file_path: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream data from source file.
        Yields dict for each record.
        """
        pass

    @abstractmethod
    async def write_data(self, output_path: str, data: List[Dict[str, Any]]) -> str:
        """
        Write transformed data to output file.
        Returns path to output file.
        """
        pass

    async def validate(self, data: Dict[str, Any], schema: Dict[str, Any]) -> bool:
        """
        Validate data matches schema.
        Override in subclasses for custom validation.
        """
        if not schema.get("fields"):
            return True

        for field in schema["fields"]:
            field_name = field["name"]
            if field.get("required") and field_name not in data:
                return False

        return True

    def parse_schema(self, schema_json: str) -> Dict[str, Any]:
        """Helper to parse schema JSON"""
        return json.loads(schema_json)
