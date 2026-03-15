import re
from typing import Dict, List, Any, AsyncGenerator
from .base_connector import BaseConnector


class EDIConnector(BaseConnector):
    """Connector for EDI X12 healthcare files"""

    # Common EDI X12 transaction types
    TRANSACTION_TYPES = {
        "837": "Health Care Claim (Claim)",
        "835": "Health Care Claim Payment/Advice",
        "834": "Benefit Enrollment and Maintenance",
        "810": "Invoice",
        "277": "Health Care Information Status",
        "997": "Functional Acknowledgment",
    }

    async def detect_schema(self, file_content: bytes = None, sample_data: List[Dict] = None) -> Dict[str, Any]:
        """
        Detect schema from EDI X12 file.
        Parses segments and creates schema from structure.
        """
        if not file_content:
            return {"fields": [], "format": "edi_x12"}

        try:
            text = file_content.decode('utf-8', errors='ignore')
        except:
            text = file_content.decode('latin1', errors='ignore')

        # Parse EDI structure
        segments = self._parse_edi_segments(text)

        if not segments:
            return {"fields": [], "format": "edi_x12"}

        # Extract transaction type from ISA/ST segments
        transaction_type = self._extract_transaction_type(segments)

        # Build schema from first transaction
        fields = self._build_schema_from_segments(segments, transaction_type)

        return {
            "fields": fields,
            "format": "edi_x12",
            "transaction_type": transaction_type,
            "transaction_description": self.TRANSACTION_TYPES.get(transaction_type, "Unknown"),
            "total_segments": len(segments),
            "encoding": "ascii"
        }

    async def read_data(self, file_path: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream EDI data as structured records.
        Each ST...SE block becomes one record.
        """
        with open(file_path, 'rb') as f:
            content = f.read()

        try:
            text = content.decode('utf-8', errors='ignore')
        except:
            text = content.decode('latin1', errors='ignore')

        # Split by transaction sets (ST...SE)
        st_pattern = r'ST\*(\d+)\*(.+?)SE\*'
        transactions = re.findall(st_pattern, text, re.DOTALL)

        for trans_type, content in transactions:
            # Parse this transaction into flat structure
            record = self._parse_transaction(content, trans_type)
            if record:
                yield record

    async def write_data(self, output_path: str, data: List[Dict[str, Any]]) -> str:
        """
        Write data as EDI X12 format.
        For MVP, we'll write as structured text representation.
        """
        with open(output_path, 'w', encoding='utf-8') as f:
            for record in data:
                # Write flattened EDI record
                f.write(self._record_to_edi_text(record))
                f.write('\n---\n')

        return output_path

    def _parse_edi_segments(self, text: str) -> List[List[str]]:
        """
        Parse EDI text into segments.
        EDI format: segments separated by ~, fields separated by *
        """
        # Find segment terminator (usually ~)
        segment_term = '~'
        if '~' not in text and '\n' in text:
            segment_term = '\n'

        segments = []
        for segment_str in text.split(segment_term):
            segment_str = segment_str.strip()
            if segment_str:
                fields = segment_str.split('*')
                segments.append(fields)

        return segments

    def _extract_transaction_type(self, segments: List[List[str]]) -> str:
        """Extract transaction type from ST segment"""
        for segment in segments:
            if segment and segment[0] == 'ST' and len(segment) > 1:
                return segment[1]
        return "999"

    def _build_schema_from_segments(self, segments: List[List[str]], trans_type: str) -> List[Dict]:
        """Build schema from segment structure"""
        fields = []
        field_map = {}

        # Map common EDI segments to fields
        segment_mappings = {
            "837": {  # Claims
                "BHT": ["transaction_type", "transmission_date", "transmission_time"],
                "NM1": ["entity_type", "organization_name", "id_qualifier", "id"],
                "CLM": ["claim_number", "amount", "frequency", "provider_id"],
                "SVC": ["procedure_code", "units", "charge", "allowed"],
            },
            "835": {  # Remittance
                "BPR": ["amount", "credit_debit", "payment_method"],
                "NM1": ["entity_type", "organization_name", "id_qualifier", "id"],
                "CLP": ["claim_number", "status_code", "amount", "paid_amount"],
                "SVC": ["procedure_code", "units", "charge", "allowed"],
            }
        }

        mappings = segment_mappings.get(trans_type, {})

        for segment in segments:
            if not segment:
                continue
            seg_id = segment[0]

            if seg_id in mappings:
                segment_fields = mappings[seg_id]
                for i, field_name in enumerate(segment_fields):
                    if i + 1 < len(segment):
                        # Create unique field name with segment prefix
                        full_field_name = f"{seg_id}_{field_name}"
                        if full_field_name not in field_map:
                            field_map[full_field_name] = segment[i + 1]

        # Convert field map to schema fields
        for field_name, sample_value in field_map.items():
            field_type = self._infer_edi_type(sample_value)
            fields.append({
                "name": field_name,
                "type": field_type,
                "description": f"{field_name} from EDI",
                "required": False,
                "examples": [sample_value] if sample_value else []
            })

        return fields

    def _infer_edi_type(self, value: str) -> str:
        """Infer field type from EDI value"""
        if not value:
            return "string"

        # Check if numeric
        try:
            float(value)
            return "number"
        except:
            pass

        # Check if date-like
        if re.match(r'^\d{8}$', value):  # YYYYMMDD
            return "date"

        return "string"

    def _parse_transaction(self, content: str, trans_type: str) -> Dict[str, Any]:
        """Parse a single transaction into flat dict"""
        record = {"transaction_type": trans_type}

        # Simple parsing - extract key segments
        segments = self._parse_edi_segments(content)

        for segment in segments:
            if segment:
                seg_id = segment[0]
                # Store first few fields of each segment type
                for i in range(1, min(len(segment), 5)):
                    field_name = f"{seg_id}_{i}"
                    record[field_name] = segment[i]

        return record

    def _record_to_edi_text(self, record: Dict[str, Any]) -> str:
        """Convert record back to EDI-like text representation"""
        lines = []
        current_segment = None

        for key, value in record.items():
            if '_' in key:
                seg_id, field_num = key.rsplit('_', 1)
                if current_segment != seg_id:
                    if current_segment:
                        lines.append(f"{current_segment}*")
                    current_segment = seg_id
                lines.append(f"  {key}: {value}")

        return '\n'.join(lines)
