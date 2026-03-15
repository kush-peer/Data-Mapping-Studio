import csv
import io
import chardet
from typing import Dict, List, Any, AsyncGenerator
from .base_connector import BaseConnector
import json


class CSVConnector(BaseConnector):
    """Connector for CSV, TSV, and delimited files"""

    async def detect_schema(self, file_content: bytes = None, sample_data: List[Dict] = None) -> Dict[str, Any]:
        """
        Detect schema from CSV file content.
        Infers field types from sample data.
        """
        if not file_content:
            return {"fields": [], "delimiter": ","}

        # Detect encoding
        encoding = self._detect_encoding(file_content)

        # Decode content
        try:
            text = file_content.decode(encoding)
        except:
            text = file_content.decode('utf-8', errors='ignore')

        lines = text.strip().split('\n')
        if not lines:
            return {"fields": [], "delimiter": ","}

        # Detect delimiter
        delimiter = self._detect_delimiter(lines[0])

        # Parse header and sample rows
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        headers = reader.fieldnames or []

        # Collect sample data to infer types
        sample_rows = []
        for i, row in enumerate(reader):
            if i >= 100:  # Sample first 100 rows
                break
            sample_rows.append(row)

        # Infer field types
        fields = []
        for header in headers:
            field_type = self._infer_type(header, [row.get(header, '') for row in sample_rows])
            fields.append({
                "name": header,
                "type": field_type,
                "description": "",
                "required": False,
                "examples": self._get_examples(header, sample_rows, limit=3)
            })

        return {
            "fields": fields,
            "delimiter": delimiter,
            "encoding": encoding,
            "total_rows": len(sample_rows)
        }

    async def read_data(self, file_path: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream CSV data from file.
        Yields one record (dict) at a time.
        """
        with open(file_path, 'rb') as f:
            file_content = f.read()

        encoding = self._detect_encoding(file_content)
        text = file_content.decode(encoding, errors='ignore')

        # Detect delimiter from first line
        first_line = text.split('\n')[0]
        delimiter = self._detect_delimiter(first_line)

        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        for row in reader:
            if row:  # Skip empty rows
                yield row

    async def write_data(self, output_path: str, data: List[Dict[str, Any]]) -> str:
        """
        Write data to CSV file.
        """
        if not data:
            # Create empty CSV file
            with open(output_path, 'w') as f:
                f.write("")
            return output_path

        fieldnames = list(data[0].keys())

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)

        return output_path

    def _detect_delimiter(self, line: str) -> str:
        """Detect delimiter from first line"""
        delimiters = [',', '\t', '|', ';']
        for delimiter in delimiters:
            if delimiter in line:
                count = line.count(delimiter)
                if count > 0:
                    return delimiter
        return ','  # Default to comma

    def _detect_encoding(self, content: bytes) -> str:
        """Detect file encoding"""
        try:
            result = chardet.detect(content)
            return result.get('encoding', 'utf-8') or 'utf-8'
        except:
            return 'utf-8'

    def _infer_type(self, header: str, values: List[str]) -> str:
        """Infer field type from values"""
        # Remove empty values
        non_empty = [v for v in values if v and v.strip()]

        if not non_empty:
            return "string"

        # Check for numbers
        try:
            for v in non_empty[:10]:  # Check first 10 non-empty values
                float(v)
            return "number"
        except:
            pass

        # Check for booleans
        bool_values = {'true', 'false', 'yes', 'no', '1', '0'}
        if all(v.lower() in bool_values for v in non_empty[:10]):
            return "boolean"

        # Check for dates
        date_patterns = ['-', '/', '\\']
        if all(any(p in v for p in date_patterns) for v in non_empty[:10]):
            return "date"

        # Default to string
        return "string"

    def _get_examples(self, header: str, rows: List[Dict], limit: int = 3) -> List[str]:
        """Extract example values for field"""
        examples = []
        for row in rows:
            value = row.get(header, '').strip()
            if value and value not in examples:
                examples.append(value)
                if len(examples) >= limit:
                    break
        return examples
