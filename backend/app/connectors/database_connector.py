import json
from typing import Dict, List, Any, AsyncGenerator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from .base_connector import BaseConnector


class DatabaseConnector(BaseConnector):
    """
    Connector for relational databases (PostgreSQL, MySQL, Oracle, SQL Server).

    Supports:
    - Direct SQL queries
    - Automatic schema detection from tables
    - Insert, update, delete operations
    - Connection pooling
    """

    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.db_type = config.get("db_type", "postgresql") if config else "postgresql"
        self.connection_string = config.get("connection_string") if config else ""
        self.engine = None
        self.session_maker = None

        if self.connection_string:
            self._init_connection()

    def _init_connection(self):
        """Initialize database connection."""
        self.engine = create_engine(self.connection_string, pool_pre_ping=True)
        self.session_maker = sessionmaker(bind=self.engine)

    async def detect_schema(self, file_content: bytes = None, sample_data: List[Dict] = None) -> Dict[str, Any]:
        """
        Detect schema from database tables.
        """
        if not self.engine:
            return {"fields": [], "format": "database"}

        try:
            inspector = inspect(self.engine)

            # Get first table
            tables = inspector.get_table_names()
            if not tables:
                return {"fields": [], "format": "database"}

            table_name = tables[0]
            columns = inspector.get_columns(table_name)

            fields = []
            for column in columns:
                fields.append({
                    "name": column["name"],
                    "type": self._map_sql_type(str(column["type"])),
                    "description": column.get("comment", ""),
                    "required": not column.get("nullable", True),
                    "sql_type": str(column["type"])
                })

            return {
                "fields": fields,
                "format": "database",
                "db_type": self.db_type,
                "table_name": table_name,
                "tables": tables
            }

        except Exception as e:
            return {
                "fields": [],
                "format": "database",
                "error": str(e)
            }

    async def read_data(self, file_path: str = None, **kwargs) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream data from database query.
        file_path contains: {"table": "table_name", "query": "SELECT ...", "batch_size": 100}
        """
        if not self.engine:
            return

        if isinstance(file_path, str):
            try:
                config = json.loads(file_path)
            except:
                config = {"table": file_path}
        else:
            config = file_path or {}

        try:
            session = self.session_maker()

            # Build query
            if "query" in config:
                query = config["query"]
            elif "table" in config:
                query = f"SELECT * FROM {config['table']}"
            else:
                return

            # Stream results with batch size
            batch_size = config.get("batch_size", 100)

            # Execute query with limit for streaming
            offset = 0
            while True:
                results = session.execute(text(query + f" LIMIT {batch_size} OFFSET {offset}"))
                rows = results.fetchall()

                if not rows:
                    break

                for row in rows:
                    # Convert row to dict
                    if hasattr(row, "_mapping"):
                        yield dict(row._mapping)
                    else:
                        yield dict(zip([col[0] for col in results.cursor.description], row))

                if len(rows) < batch_size:
                    break

                offset += batch_size

            session.close()

        except Exception as e:
            raise Exception(f"Error reading from database: {e}")

    async def write_data(self, output_path: str, data: List[Dict[str, Any]]) -> str:
        """
        Insert/update data in database.
        """
        if not self.engine:
            raise Exception("Database connection not configured")

        if isinstance(output_path, str):
            try:
                config = json.loads(output_path)
            except:
                config = {"table": output_path}
        else:
            config = output_path or {}

        try:
            session = self.session_maker()

            table_name = config.get("table")
            if not table_name:
                raise ValueError("Table name required")

            # Insert data
            for record in data:
                # Create placeholders
                columns = list(record.keys())
                values = list(record.values())

                # Build INSERT statement
                cols = ", ".join(columns)
                placeholders = ", ".join([f":{col}" for col in columns])
                query = f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})"

                session.execute(text(query), {col: record[col] for col in columns})

            session.commit()
            session.close()

            return f"Database:{table_name}:{len(data)} records inserted"

        except Exception as e:
            if session:
                session.rollback()
                session.close()
            raise Exception(f"Error writing to database: {e}")

    def _map_sql_type(self, sql_type: str) -> str:
        """Map SQL type to generic type."""
        sql_type_lower = str(sql_type).lower()

        if any(x in sql_type_lower for x in ["int", "bigint", "smallint", "numeric", "decimal", "float", "double"]):
            return "number"
        elif any(x in sql_type_lower for x in ["date", "timestamp", "time"]):
            return "date"
        elif any(x in sql_type_lower for x in ["bool", "boolean"]):
            return "boolean"
        elif any(x in sql_type_lower for x in ["json", "jsonb"]):
            return "object"
        elif "text" in sql_type_lower or "varchar" in sql_type_lower or "char" in sql_type_lower:
            return "string"
        else:
            return "string"

    def get_tables(self) -> List[str]:
        """Get list of available tables."""
        if not self.engine:
            return []

        inspector = inspect(self.engine)
        return inspector.get_table_names()

    def get_table_schema(self, table_name: str) -> Dict[str, Any]:
        """Get schema for specific table."""
        if not self.engine:
            return {}

        inspector = inspect(self.engine)
        columns = inspector.get_columns(table_name)

        return {
            "table_name": table_name,
            "columns": [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                    "default": col.get("default"),
                }
                for col in columns
            ]
        }
