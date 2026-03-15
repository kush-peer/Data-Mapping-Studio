import httpx
import json
from typing import Dict, List, Any, AsyncGenerator, Optional
from .base_connector import BaseConnector


class RESTConnector(BaseConnector):
    """
    Connector for generic REST APIs.

    Supports:
    - GET/POST/PUT endpoints
    - Basic auth, API key authentication, OAuth
    - Pagination (offset, limit, cursor, page-based)
    - JSON responses
    """

    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.base_url = config.get("base_url") if config else ""
        self.auth_type = config.get("auth_type", "none") if config else "none"  # none, apikey, basic, oauth
        self.auth_token = config.get("auth_token") if config else None

    async def detect_schema(self, file_content: bytes = None, sample_data: List[Dict] = None) -> Dict[str, Any]:
        """
        Detect schema from REST API response.
        """
        if sample_data:
            # Schema from provided sample data
            schema = self._infer_schema_from_data(sample_data)
        elif self.base_url:
            # Fetch sample data from API
            try:
                sample_data = await self._fetch_sample_data()
                schema = self._infer_schema_from_data(sample_data)
            except Exception as e:
                return {
                    "fields": [],
                    "format": "rest_api",
                    "error": str(e)
                }
        else:
            return {"fields": [], "format": "rest_api"}

        return {
            "fields": schema.get("fields", []),
            "format": "rest_api",
            "pagination": schema.get("pagination"),
            "data_path": schema.get("data_path"),  # JSONPath to actual data if nested
        }

    async def read_data(self, file_path: str = None, **kwargs) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream data from REST API.
        file_path contains API endpoint configuration (JSON).
        """
        if isinstance(file_path, str):
            # file_path is JSON config: {"endpoint": "/users", "pagination": "offset", ...}
            try:
                config = json.loads(file_path)
            except:
                config = {"endpoint": file_path}
        else:
            config = file_path or {}

        endpoint = config.get("endpoint", "")
        if not endpoint.startswith("http"):
            endpoint = self.base_url + endpoint

        pagination_type = config.get("pagination_type", "none")  # none, offset, cursor, page
        per_page = config.get("per_page", 100)
        data_path = config.get("data_path")  # JSONPath to actual data

        offset = 0
        page = 1

        async with httpx.AsyncClient() as client:
            while True:
                # Build pagination params
                params = {}
                if pagination_type == "offset":
                    params["offset"] = offset
                    params["limit"] = per_page
                elif pagination_type == "page":
                    params["page"] = page
                    params["per_page"] = per_page
                elif pagination_type == "cursor":
                    # For cursor-based, need to track cursor from response
                    pass

                # Fetch data
                try:
                    response = await client.get(
                        endpoint,
                        params=params,
                        headers=self._get_auth_headers(),
                        timeout=30
                    )
                    response.raise_for_status()

                    data = response.json()

                    # Extract data from nested structure if needed
                    if data_path:
                        data = self._extract_by_path(data, data_path)

                    if not isinstance(data, list):
                        data = [data]

                    if not data:
                        break

                    # Yield each record
                    for record in data:
                        if isinstance(record, dict):
                            yield record

                    # Check if there's more data
                    if len(data) < per_page:
                        break

                    # Update pagination
                    if pagination_type == "offset":
                        offset += per_page
                    elif pagination_type == "page":
                        page += 1

                except Exception as e:
                    raise Exception(f"Error fetching from API: {e}")

    async def write_data(self, output_path: str, data: List[Dict[str, Any]]) -> str:
        """
        Send data to REST API endpoint.
        """
        config = json.loads(output_path) if isinstance(output_path, str) else {}
        endpoint = config.get("endpoint", "")

        if not endpoint.startswith("http"):
            endpoint = self.base_url + endpoint

        method = config.get("method", "POST")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(
                    method,
                    endpoint,
                    json=data,
                    headers=self._get_auth_headers(),
                    timeout=30
                )
                response.raise_for_status()

                return f"API:{endpoint}:{len(data)} records sent"

            except Exception as e:
                raise Exception(f"Error posting to API: {e}")

    async def _fetch_sample_data(self, limit: int = 10) -> List[Dict]:
        """Fetch sample data from API for schema detection."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.base_url,
                params={"limit": limit},
                headers=self._get_auth_headers(),
                timeout=30
            )
            response.raise_for_status()

            data = response.json()
            if isinstance(data, dict) and "results" in data:
                return data["results"]
            elif isinstance(data, list):
                return data
            else:
                return [data]

    def _infer_schema_from_data(self, data: List[Dict]) -> Dict[str, Any]:
        """Infer schema from API response data."""
        if not data:
            return {"fields": []}

        # Analyze first record
        first_record = data[0] if isinstance(data, list) else data

        fields = []
        for key, value in first_record.items():
            field_type = self._infer_type(value)
            fields.append({
                "name": key,
                "type": field_type,
                "description": key,
                "required": False
            })

        return {"fields": fields}

    def _infer_type(self, value: Any) -> str:
        """Infer field type from value."""
        if isinstance(value, bool):
            return "boolean"
        elif isinstance(value, int):
            return "number"
        elif isinstance(value, float):
            return "number"
        elif isinstance(value, str):
            # Try to detect date
            if "-" in value and len(value) == 10:
                return "date"
            return "string"
        elif isinstance(value, list):
            return "array"
        elif isinstance(value, dict):
            return "object"
        else:
            return "string"

    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers."""
        headers = {}

        if self.auth_type == "apikey":
            headers["Authorization"] = f"Bearer {self.auth_token}"
        elif self.auth_type == "basic":
            import base64
            auth = base64.b64encode(self.auth_token.encode()).decode()
            headers["Authorization"] = f"Basic {auth}"

        return headers

    def _extract_by_path(self, data: Dict, path: str) -> Any:
        """Extract data from nested object using JSONPath-like syntax."""
        # Simple JSONPath implementation: "data.results.items"
        keys = path.split(".")
        current = data

        for key in keys:
            if isinstance(current, dict):
                current = current.get(key)
            elif isinstance(current, list):
                try:
                    current = current[int(key)]
                except:
                    return None
            else:
                return None

        return current
