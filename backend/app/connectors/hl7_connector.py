import re
from typing import Dict, List, Any, AsyncGenerator
from .base_connector import BaseConnector


class HL7Connector(BaseConnector):
    """
    Connector for HL7v2 clinical data standard.

    HL7v2 is the dominant healthcare data exchange standard used in hospitals,
    EHRs (Epic, Cerner, Athena), and healthcare systems worldwide.

    Format:
    - Messages separated by \r (carriage return)
    - Segments separated by | (pipe)
    - Fields separated by | within segments
    - Subfields separated by ^ (caret)
    - Repetitions separated by ~ (tilde)
    - Escape characters: \ (backslash)

    Example segment:
    MSH|^~\&|SENDINGAPP|SENDFAC|RECAPP|RECFAC|20230315120000||ADT^A01|MSG001|P|2.5
    """

    # HL7 segment definitions (subset - full spec is massive)
    HL7_SEGMENTS = {
        "MSH": {
            "name": "Message Header",
            "fields": ["segment_id", "field_separator", "encoding", "sending_app", "sending_facility",
                      "receiving_app", "receiving_facility", "timestamp", "security", "message_type",
                      "message_id", "processing_id", "version"]
        },
        "PID": {
            "name": "Patient Identification",
            "fields": ["segment_id", "sequence", "patient_id", "alt_patient_id", "mrn", "birth_mrn",
                      "name", "mother_name", "dob", "gender", "race", "address", "phone", "alt_phone",
                      "email", "marital_status", "religion", "account_number", "ssn"]
        },
        "PV1": {
            "name": "Patient Visit",
            "fields": ["segment_id", "sequence", "admission_type", "ward_location", "financial_class",
                      "admission_officer", "referring_doctor", "admitting_doctor", "admission_diagnosis",
                      "patient_class", "assignment_of_patient_bed"]
        },
        "OBX": {
            "name": "Observation/Result",
            "fields": ["segment_id", "sequence", "value_type", "observation_id", "observation_text",
                      "observation_sub_id", "observation_value", "units", "reference_range",
                      "abnormal_flags", "probability", "nature_abnormal", "observation_result_status"]
        },
        "OBR": {
            "name": "Order Details",
            "fields": ["segment_id", "sequence", "placer_order_number", "filler_order_number",
                      "universal_service_id", "priority", "requested_date", "observation_date",
                      "observation_end_date", "quantity", "result_copies_to", "parent_result"]
        },
        "AL1": {
            "name": "Allergy Information",
            "fields": ["segment_id", "sequence", "allergy_type", "allergen_code", "allergen_description",
                      "allergy_severity", "allergy_reaction"]
        },
        "DG1": {
            "name": "Diagnosis",
            "fields": ["segment_id", "sequence", "diagnosis_coding_method", "diagnosis_code",
                      "diagnosis_description", "diagnosis_date", "diagnosis_type"]
        },
        "ST": {
            "name": "Message Start",
            "fields": ["segment_id", "message_type", "message_control_id", "version_id"]
        },
        "SE": {
            "name": "Message End",
            "fields": ["segment_id", "segment_count", "message_control_id"]
        },
    }

    async def detect_schema(self, file_content: bytes = None, sample_data: List[Dict] = None) -> Dict[str, Any]:
        """
        Detect HL7v2 schema from message content.
        """
        if not file_content:
            return {"fields": [], "format": "hl7v2"}

        try:
            text = file_content.decode('utf-8', errors='ignore')
        except:
            text = file_content.decode('latin1', errors='ignore')

        # Parse first HL7 message
        message = self._extract_first_message(text)
        if not message:
            return {"fields": [], "format": "hl7v2"}

        # Extract segments
        segments = message.split('\r')
        message_type, event_type = self._extract_message_type(segments)
        hl7_version = self._extract_hl7_version(segments)

        # Build schema from segments
        fields = self._build_schema_from_segments(segments)

        return {
            "fields": fields,
            "format": "hl7v2",
            "message_type": message_type,  # "ADT", "ORU", etc.
            "event_type": event_type,       # "A01", "R01", etc.
            "hl7_version": hl7_version,     # "2.5", "2.8", etc.
            "encoding": "ASCII"
        }

    async def read_data(self, file_path: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream HL7 messages from file.
        Each HL7 message becomes one record.
        """
        with open(file_path, 'rb') as f:
            content = f.read()

        try:
            text = content.decode('utf-8', errors='ignore')
        except:
            text = content.decode('latin1', errors='ignore')

        # Split messages (separated by \r or \n)
        messages = re.split(r'[\r\n]+(?=MSH\|)', text)

        for message in messages:
            message = message.strip()
            if message and message.startswith('MSH'):
                record = self._parse_hl7_message(message)
                if record:
                    yield record

    async def write_data(self, output_path: str, data: List[Dict[str, Any]]) -> str:
        """
        Write data as HL7v2 format.
        """
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, record in enumerate(data):
                hl7_message = self._dict_to_hl7(record)
                if i > 0:
                    f.write('\r')  # Separate messages with carriage return
                f.write(hl7_message)

        return output_path

    def _extract_first_message(self, text: str) -> str:
        """Extract first HL7 message from text."""
        match = re.search(r'MSH\|[^\r\n]+([\r\n](?!MSH\|)[^\r\n]*)*', text)
        return match.group(0) if match else None

    def _extract_message_type(self, segments: List[str]) -> tuple:
        """Extract message type and event type from ST or MSH segment."""
        for segment in segments:
            if segment.startswith('ST|'):
                parts = segment.split('|')
                if len(parts) >= 3:
                    msg_type_event = parts[2]
                    if '^' in msg_type_event:
                        return msg_type_event.split('^')
                    return (msg_type_event, "")
            elif segment.startswith('MSH|'):
                parts = segment.split('|')
                if len(parts) >= 10:
                    msg_type_event = parts[9]
                    if '^' in msg_type_event:
                        return msg_type_event.split('^')
                    return (msg_type_event, "")
        return ("", "")

    def _extract_hl7_version(self, segments: List[str]) -> str:
        """Extract HL7 version from MSH segment."""
        for segment in segments:
            if segment.startswith('MSH|'):
                parts = segment.split('|')
                if len(parts) >= 13:
                    return parts[12]
        return "2.5"  # Default version

    def _build_schema_from_segments(self, segments: List[str]) -> List[Dict]:
        """Build schema from segment structure."""
        fields = []
        message_type, event_type = self._extract_message_type(segments)
        segment_types = set()

        # Collect segment types
        for segment in segments:
            if segment:
                seg_type = segment[:3]
                if seg_type in self.HL7_SEGMENTS:
                    segment_types.add(seg_type)

        # Build fields for each segment type
        for seg_type in sorted(segment_types):
            seg_def = self.HL7_SEGMENTS.get(seg_type, {})
            segment_fields = seg_def.get("fields", [])

            for i, field_name in enumerate(segment_fields):
                field_id = f"{seg_type}_{field_name}"
                fields.append({
                    "name": field_id,
                    "type": self._infer_hl7_field_type(seg_type, field_name),
                    "description": f"{seg_type} - {field_name}",
                    "required": seg_type in ["MSH", "PID"] and i < 5,
                    "segment": seg_type,
                    "field_position": i
                })

        return fields

    def _infer_hl7_field_type(self, segment: str, field_name: str) -> str:
        """Infer field type from segment and field name."""
        # Date fields
        if "date" in field_name.lower() or "time" in field_name.lower():
            return "date"
        # Numeric fields
        if "count" in field_name.lower() or "sequence" in field_name.lower():
            return "number"
        # Boolean
        if field_name in ["gender", "processing_id", "abnormal_flags"]:
            return "boolean"
        # Default
        return "string"

    def _parse_hl7_message(self, message: str) -> Dict[str, Any]:
        """Parse HL7 message into flat dictionary."""
        record = {}
        segments = message.split('\r')

        message_type, event_type = self._extract_message_type(segments)
        record["MESSAGE_TYPE"] = message_type
        record["EVENT_TYPE"] = event_type

        # Parse each segment
        for segment in segments:
            if not segment:
                continue

            seg_type = segment[:3]
            fields = segment.split('|')[1:]  # Skip segment ID

            for i, value in enumerate(fields):
                field_name = f"{seg_type}_{i}"
                record[field_name] = value

        return record

    def _dict_to_hl7(self, record: Dict[str, Any]) -> str:
        """Convert dict back to HL7 format."""
        segments = []
        message_type = record.get("MESSAGE_TYPE", "ADT")
        event_type = record.get("EVENT_TYPE", "A01")

        # Group fields by segment type
        segments_dict = {}
        for key, value in record.items():
            if "_" in key:
                seg_type, field_index = key.rsplit("_", 1)
                if seg_type not in segments_dict:
                    segments_dict[seg_type] = []
                try:
                    idx = int(field_index)
                    # Pad list if needed
                    while len(segments_dict[seg_type]) <= idx:
                        segments_dict[seg_type].append("")
                    segments_dict[seg_type][idx] = str(value)
                except ValueError:
                    pass

        # Build HL7 message
        for seg_type in sorted(segments_dict.keys()):
            fields = [seg_type] + segments_dict[seg_type]
            segments.append("|".join(fields))

        return "\r".join(segments)
