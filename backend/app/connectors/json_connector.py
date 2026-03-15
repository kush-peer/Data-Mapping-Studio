import json
from typing import Dict, List, Any, AsyncGenerator, Optional
from .base_connector import BaseConnector


class JSONConnector(BaseConnector):
    """
    Connector for JSON files and data.

    Supports:
    - Flat JSON objects (one object per line or array of objects)
    - Nested JSON structures
    - JSON Lines format (newline-delimited JSON)
    - Automatic field type inference
    """

    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.is_jsonl = config.get("is_jsonl", False) if config else False  # JSON Lines format
        self.root_path = config.get("root_path") if config else None  # JSONPath to root array if nested
        self.encoding = config.get("encoding", "utf-8") if config else "utf-8"

    async def detect_schema(self, file_content: bytes = None, sample_data: List[Dict] = None) -> Dict[str, Any]:
        """
        Detect schema from JSON file content.
        Handles both flat JSON objects and nested structures.
        """
        try:
            if sample_data:
                # Use provided sample data
                data = sample_data
            elif file_content:
                # Parse JSON from file content
                content_str = file_content.decode(self.encoding)
                data = self._parse_json_content(content_str)
            else:
                return {"fields": [], "format": "json"}

            if not data or not isinstance(data, list) or len(data) == 0:
                return {"fields": [], "format": "json"}

            # Infer schema from first object
            first_record = data[0]
            schema = self._infer_schema_from_data([first_record])

            return {
                "fields": schema.get("fields", []),
                "format": "json",
                "record_count": len(data),
                "is_jsonl": self.is_jsonl,
                "root_path": self.root_path,
            }
        except Exception as e:
            return {
                "fields": [],
                "format": "json",
                "error": str(e)
            }

    def _parse_json_content(self, content: str) -> List[Dict[str, Any]]:
        """
        Parse JSON content from file.
        Handles both JSON array and JSON Lines formats.
        """
        content = content.strip()

        if self.is_jsonl or content.startswith('{'):
            # JSON Lines format (one JSON object per line)
            lines = content.split('\n')
            data = []
            for line in lines:
                if line.strip():
                    try:
                        obj = json.loads(line)
                        data.append(obj)
                    except json.JSONDecodeError:
                        continue
            return data
        else:
            # Regular JSON array
            full_data = json.loads(content)

            # Handle nested structures with root_path
            if self.root_path:
                full_data = self._navigate_json_path(full_data, self.root_path)

            # Ensure we have a list of objects
            if isinstance(full_data, dict):
                full_data = [full_data]
            elif not isinstance(full_data, list):
                full_data = [{"value": full_data}]

            return full_data

    def _navigate_json_path(self, data: Any, path: str) -> Any:
        """
        Navigate nested JSON using dot notation.
        Example: "response.data.users" navigates to data["response"]["data"]["users"]
        """
        parts = path.split('.')
        current = data

        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, list) and part.isdigit():
                current = current[int(part)]
            else:
                return None

        return current

    async def read_data(self, file_path: str = None, **kwargs) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream JSON records from file.
        """
        try:
            with open(file_path, 'r', encoding=self.encoding) as f:
                content = f.read()

            data = self._parse_json_content(content)

            for record in data:
                if isinstance(record, dict):
                    yield record
                else:
                    yield {"value": record}

        except Exception as e:
            raise Exception(f"Error reading JSON file: {str(e)}")

    async def write_data(self, records: List[Dict[str, Any]], output_path: str, **kwargs) -> None:
        """
        Write records to JSON file.
        """
        try:
            if self.is_jsonl:
                # JSON Lines format
                with open(output_path, 'w', encoding=self.encoding) as f:
                    for record in records:
                        f.write(json.dumps(record, default=str) + '\n')
            else:
                # JSON array format
                with open(output_path, 'w', encoding=self.encoding) as f:
                    json.dump(records, f, indent=2, default=str)

        except Exception as e:
            raise Exception(f"Error writing JSON file: {str(e)}")

    async def validate(self, record: Dict[str, Any], schema: Dict[str, Any]) -> List[str]:
        """
        Validate JSON record against schema.
        """
        errors = []
        fields = schema.get("fields", [])

        for field_def in fields:
            field_name = field_def.get("name")
            field_type = field_def.get("type")
            is_required = field_def.get("required", False)

            if field_name not in record:
                if is_required:
                    errors.append(f"Missing required field: {field_name}")
                continue

            value = record[field_name]

            # Type validation
            if not self._validate_type(value, field_type):
                errors.append(f"Field {field_name} has invalid type. Expected {field_type}, got {type(value).__name__}")

        return errors

    def _validate_type(self, value: Any, expected_type: str) -> bool:
        """Validate value against expected type."""
        if value is None:
            return True

        type_map = {
            "string": (str,),
            "integer": (int,),
            "number": (int, float),
            "boolean": (bool,),
            "array": (list,),
            "object": (dict,),
        }

        expected_python_types = type_map.get(expected_type, (str,))
        return isinstance(value, expected_python_types)
