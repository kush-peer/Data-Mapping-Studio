import os
import json
from typing import Dict, List, Any
from datetime import datetime
from pathlib import Path
from app.connectors import CSVConnector, EDIConnector, BaseConnector
from app.services.llm_service import LLMService


class ExecutionEngine:
    """Execute data mappings end-to-end"""

    CONNECTOR_TYPES = {
        "csv": CSVConnector,
        "edi": EDIConnector,
    }

    def __init__(self, output_dir: str = "/tmp/dms_output"):
        self.output_dir = output_dir
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        self.llm_service = LLMService()

    async def execute_mapping(
        self,
        mapping_id: str,
        source_file_path: str,
        source_schema: Dict[str, Any],
        target_schema: Dict[str, Any],
        mapping_rules: List[Dict[str, Any]],
        source_type: str = "csv"
    ) -> Dict[str, Any]:
        """
        Execute a mapping: read source, transform, write target.
        """
        execution_result = {
            "mapping_id": mapping_id,
            "status": "running",
            "records_processed": 0,
            "records_failed": 0,
            "errors": [],
            "output_file": None,
            "started_at": datetime.utcnow().isoformat()
        }

        try:
            # Get source connector
            connector_class = self.CONNECTOR_TYPES.get(source_type.lower(), CSVConnector)
            source_connector = connector_class()

            # Generate transformation code using Claude
            transformation_code = await self.llm_service.generate_transformation(
                source_schema,
                target_schema,
                mapping_rules
            )

            # Compile transformation function
            transform_func = self._compile_transformation(transformation_code)

            # Stream source data and transform
            target_data = []
            async for source_record in source_connector.read_data(source_file_path):
                try:
                    # Apply transformation
                    target_record = transform_func(source_record)

                    # Validate against target schema
                    if await source_connector.validate(target_record, target_schema):
                        target_data.append(target_record)
                        execution_result["records_processed"] += 1
                    else:
                        execution_result["records_failed"] += 1
                        execution_result["errors"].append({
                            "record_index": execution_result["records_processed"],
                            "error": "Validation failed against target schema",
                            "record": target_record
                        })

                except Exception as e:
                    execution_result["records_failed"] += 1
                    execution_result["errors"].append({
                        "record_index": execution_result["records_processed"],
                        "error": str(e),
                        "record": source_record
                    })

            # Write output file
            target_connector = connector_class()
            output_file = os.path.join(
                self.output_dir,
                f"{mapping_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
            )

            await target_connector.write_data(output_file, target_data)

            execution_result["status"] = "completed"
            execution_result["output_file"] = output_file
            execution_result["completed_at"] = datetime.utcnow().isoformat()

        except Exception as e:
            execution_result["status"] = "failed"
            execution_result["errors"].append({"error": str(e)})
            execution_result["completed_at"] = datetime.utcnow().isoformat()

        return execution_result

    def _compile_transformation(self, code: str):
        """
        Compile transformation code into callable function.
        WARNING: This uses exec() which has security implications.
        Only use with trusted code from Claude API.
        """
        namespace = {}
        try:
            exec(code, namespace)
            return namespace.get("transform_record", lambda x: x)
        except Exception as e:
            print(f"Error compiling transformation: {e}")
            # Return identity function as fallback
            return lambda x: x

    async def get_sample_output(
        self,
        source_file_path: str,
        source_schema: Dict[str, Any],
        target_schema: Dict[str, Any],
        mapping_rules: List[Dict[str, Any]],
        source_type: str = "csv",
        sample_size: int = 10
    ) -> Dict[str, Any]:
        """
        Show sample output by running transformation on first N records.
        """
        try:
            # Get source connector
            connector_class = self.CONNECTOR_TYPES.get(source_type.lower(), CSVConnector)
            source_connector = connector_class()

            # Generate transformation code
            transformation_code = await self.llm_service.generate_transformation(
                source_schema,
                target_schema,
                mapping_rules
            )

            # Compile transformation function
            transform_func = self._compile_transformation(transformation_code)

            # Stream source data and transform (limited to sample size)
            sample_data = []
            count = 0

            async for source_record in source_connector.read_data(source_file_path):
                if count >= sample_size:
                    break

                try:
                    target_record = transform_func(source_record)
                    sample_data.append({
                        "source": source_record,
                        "target": target_record
                    })
                    count += 1
                except Exception as e:
                    sample_data.append({
                        "source": source_record,
                        "error": str(e)
                    })
                    count += 1

            return {
                "status": "success",
                "sample_size": count,
                "sample_data": sample_data,
                "transformation_code": transformation_code
            }

        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
