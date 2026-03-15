import json
import os
from typing import Dict, List, Any
from anthropic import Anthropic

client = Anthropic()


class LLMService:
    """Service for Claude-powered AI features"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if self.api_key:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=self.api_key)
        else:
            self.client = None

    async def detect_schema_with_ai(self, file_name: str, sample_data: List[Dict]) -> Dict[str, Any]:
        """
        Use Claude to detect and enhance schema from sample data.
        """
        if not self.client:
            return self._fallback_schema_detection(file_name, sample_data)

        prompt = f"""Analyze this data sample and provide a JSON schema.

File: {file_name}

Sample data (first 5 rows):
{json.dumps(sample_data[:5], indent=2)}

Respond with ONLY a valid JSON object (no markdown, no explanation) with structure:
{{
  "fields": [
    {{"name": "field_name", "type": "string|number|date|boolean", "description": "what this field contains", "required": true/false}}
  ],
  "healthcare_context": "brief description of what this data represents",
  "suggested_transformations": ["list", "of", "suggested", "transformations"]
}}

Focus on healthcare data context (patient identifiers, claim numbers, amounts, dates, medical codes, etc.)."""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse response
            response_text = response.content[0].text.strip()

            # Try to extract JSON from response
            try:
                schema = json.loads(response_text)
                return schema
            except json.JSONDecodeError:
                # If direct parsing fails, try to extract JSON block
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    schema = json.loads(json_match.group())
                    return schema
                return self._fallback_schema_detection(file_name, sample_data)

        except Exception as e:
            print(f"Error calling Claude API: {e}")
            return self._fallback_schema_detection(file_name, sample_data)

    async def generate_transformation(self, source_schema: Dict, target_schema: Dict, mapping_rules: List[Dict]) -> str:
        """
        Generate Python transformation code using Claude.
        """
        if not self.client:
            return self._fallback_transformation_code(mapping_rules)

        prompt = f"""Generate Python code to transform data from source schema to target schema.

Source Schema:
{json.dumps(source_schema, indent=2)}

Target Schema:
{json.dumps(target_schema, indent=2)}

Mapping Rules:
{json.dumps(mapping_rules, indent=2)}

Generate a Python function with signature:
def transform_record(source_record: dict) -> dict:
    '''Transform source record to target format'''
    target_record = {{}}
    # ... implementation
    return target_record

Focus on healthcare data handling (NPI validation, date parsing, code lookups, etc.)
Respond with ONLY the Python function code, no markdown or explanation."""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            code = response.content[0].text.strip()

            # Remove markdown code blocks if present
            if code.startswith("```"):
                code = code.split("```")[1]
                if code.startswith("python"):
                    code = code[6:]
            code = code.strip()

            return code

        except Exception as e:
            print(f"Error generating transformation code: {e}")
            return self._fallback_transformation_code(mapping_rules)

    async def suggest_mappings(self, source_schema: Dict, target_schema: Dict) -> List[Dict]:
        """
        Suggest field mappings between schemas using Claude.
        """
        if not self.client:
            return self._fallback_mapping_suggestions(source_schema, target_schema)

        prompt = f"""Suggest field mappings between healthcare schemas.

Source Schema:
{json.dumps(source_schema, indent=2)}

Target Schema:
{json.dumps(target_schema, indent=2)}

Respond with ONLY a JSON array (no markdown, no explanation):
[
  {{"source_field": "field_name", "target_field": "field_name", "confidence": 0.95, "reason": "why this mapping makes sense"}},
  ...
]

Consider healthcare context (claim data, patient identifiers, amounts, codes, dates, etc.)."""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = response.content[0].text.strip()

            try:
                mappings = json.loads(response_text)
                return mappings if isinstance(mappings, list) else [mappings]
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                if json_match:
                    mappings = json.loads(json_match.group())
                    return mappings if isinstance(mappings, list) else [mappings]
                return self._fallback_mapping_suggestions(source_schema, target_schema)

        except Exception as e:
            print(f"Error suggesting mappings: {e}")
            return self._fallback_mapping_suggestions(source_schema, target_schema)

    def _fallback_schema_detection(self, file_name: str, sample_data: List[Dict]) -> Dict[str, Any]:
        """Fallback schema detection without Claude"""
        fields = []
        if sample_data and isinstance(sample_data[0], dict):
            for key in sample_data[0].keys():
                fields.append({
                    "name": key,
                    "type": "string",
                    "description": key,
                    "required": False
                })
        return {
            "fields": fields,
            "healthcare_context": "Detected from file structure",
            "suggested_transformations": []
        }

    def _fallback_transformation_code(self, mapping_rules: List[Dict]) -> str:
        """Fallback transformation code generation"""
        code = "def transform_record(source_record: dict) -> dict:\n"
        code += "    target_record = {}\n"
        for rule in mapping_rules:
            source = rule.get("source_field")
            target = rule.get("target_field")
            if source and target:
                code += f"    target_record['{target}'] = source_record.get('{source}')\n"
        code += "    return target_record\n"
        return code

    def _fallback_mapping_suggestions(self, source_schema: Dict, target_schema: Dict) -> List[Dict]:
        """Fallback mapping suggestions"""
        source_fields = {f["name"]: f for f in source_schema.get("fields", [])}
        target_fields = {f["name"]: f for f in target_schema.get("fields", [])}

        suggestions = []
        for target_field_name, target_field in target_fields.items():
            # Simple exact match first
            if target_field_name in source_fields:
                suggestions.append({
                    "source_field": target_field_name,
                    "target_field": target_field_name,
                    "confidence": 0.9,
                    "reason": "Exact field name match"
                })
            # Try to match by substring
            else:
                for source_field_name in source_fields.keys():
                    if source_field_name.lower() in target_field_name.lower() or target_field_name.lower() in source_field_name.lower():
                        suggestions.append({
                            "source_field": source_field_name,
                            "target_field": target_field_name,
                            "confidence": 0.6,
                            "reason": f"Substring match: {source_field_name} <-> {target_field_name}"
                        })
                        break

        return suggestions
