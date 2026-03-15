import json
import logging
from typing import Dict, List, Any, Optional
from anthropic import Anthropic

logger = logging.getLogger(__name__)


class ErrorService:
    """Service for analyzing errors and suggesting fixes using Claude"""

    def __init__(self, api_key: str = None):
        import os
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if self.api_key:
            self.client = Anthropic(api_key=self.api_key)
        else:
            self.client = None

    async def get_error_suggestion(
        self,
        error: Dict[str, Any],
        mapping_rules: List[Dict],
        source_schema: List[Dict]
    ) -> Optional[str]:
        """
        Analyze an error and suggest a fix using Claude.
        """
        if not self.client:
            return None

        try:
            prompt = f"""A data mapping transformation failed. Help me fix it.

Error Details:
- Record Index: {error.get('record_index', 'unknown')}
- Error: {error.get('error', 'unknown')}
- Record Data: {json.dumps(error.get('record', {}), indent=2)}

Mapping Rules:
{json.dumps(mapping_rules, indent=2)}

Source Schema:
{json.dumps(source_schema, indent=2)}

What's the most likely cause and how to fix it? Be concise (1-2 sentences).
Respond with ONLY the fix suggestion, no explanation."""

            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()

        except Exception as e:
            logger.warning(f"Error getting Claude suggestion: {e}")
            return None

    def apply_error_fixes(
        self,
        mapping_rules: List[Dict],
        errors: List[Dict]
    ) -> List[Dict]:
        """
        Apply Claude-suggested fixes to mapping rules.
        For MVP, this is a placeholder. In production, would parse Claude suggestions
        and intelligently update rules.
        """
        # For now, just return rules unchanged
        # In Phase 2.5, parse Claude suggestions and auto-fix rules
        return mapping_rules

    async def analyze_transformation_failure(
        self,
        source_value: str,
        target_value: Optional[str],
        transformation_code: str,
        error_message: str,
        field_name: str
    ) -> Dict[str, str]:
        """
        Deep analysis of why a transformation failed.
        Returns: {"cause": "...", "fix": "..."}
        """
        if not self.client:
            return {
                "cause": "Unable to analyze (Claude API not configured)",
                "fix": "Check error logs manually"
            }

        try:
            prompt = f"""Analyze this transformation failure:

Field: {field_name}
Source Value: {source_value!r}
Expected Target Value: {target_value!r}
Transformation Code:
{transformation_code}

Error: {error_message}

Explain:
1. Why did it fail?
2. How to fix the transformation code?

Format response as JSON:
{{"cause": "...", "fix": "..."}}"""

            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = response.content[0].text.strip()

            # Try to parse as JSON
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                # If not JSON, extract cause and fix from text
                return {
                    "cause": "See logs for details",
                    "fix": response_text
                }

        except Exception as e:
            logger.error(f"Error analyzing failure: {e}")
            return {
                "cause": str(e),
                "fix": "Check logs manually"
            }

    async def suggest_validation_rules(
        self,
        schema: Dict[str, Any],
        historical_errors: List[Dict] = None
    ) -> List[Dict]:
        """
        Suggest data validation rules based on schema and historical errors.
        """
        if not self.client:
            return []

        try:
            prompt = f"""Based on this schema, suggest validation rules to catch common errors.

Schema:
{json.dumps(schema, indent=2)}

Historical Errors (if any):
{json.dumps(historical_errors or [], indent=2)}

Suggest 3-5 validation rules as JSON array. For each rule:
{{"field": "field_name", "rule_type": "required|pattern|range|format", "params": {{...}}, "description": "..."}}

Respond with ONLY the JSON array, no explanation."""

            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = response.content[0].text.strip()

            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                logger.warning("Failed to parse validation rules JSON")
                return []

        except Exception as e:
            logger.error(f"Error suggesting validation rules: {e}")
            return []
