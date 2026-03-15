import logging
from datetime import datetime, timedelta
from celery import Task
from sqlalchemy.orm import Session
from app.queue.celery_app import celery_app
from app.database import SessionLocal
from app.models import Job, Execution, Mapping, Schema
from app.engine.executor import ExecutionEngine
from app.services.error_service import ErrorService
import tempfile

logger = logging.getLogger(__name__)
execution_engine = ExecutionEngine()
error_service = ErrorService()


class DatabaseTask(Task):
    """Base task class that handles database sessions"""
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3, 'countdown': 60}

    def __call__(self, *args, **kwargs):
        with SessionLocal() as db:
            self.db = db
            return self.run(*args, **kwargs)


@celery_app.task(name="app.queue.tasks.execute_mapping")
def execute_mapping(job_id: str, mapping_id: str, source_file_path: str = None):
    """
    Execute a mapping job asynchronously.
    Called by either:
    - Immediate execution (user clicks "Execute")
    - Scheduled job (cron triggers)
    """
    db = SessionLocal()
    try:
        # Get job and mapping
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        mapping = db.query(Mapping).filter(Mapping.id == mapping_id).first()
        if not mapping:
            logger.error(f"Mapping {mapping_id} not found")
            job.status = "failed"
            job.updated_at = datetime.utcnow()
            db.commit()
            return

        # Update job status
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()

        # Get source and target schemas
        source_schema = db.query(Schema).filter(Schema.id == mapping.source_schema_id).first()
        target_schema = db.query(Schema).filter(Schema.id == mapping.target_schema_id).first()

        # If no source file provided, use the one from last execution (for scheduled jobs)
        if not source_file_path:
            last_execution = db.query(Execution).filter(
                Execution.mapping_id == mapping_id
            ).order_by(Execution.created_at.desc()).first()

            if last_execution and last_execution.output_file_path:
                source_file_path = last_execution.output_file_path
            else:
                raise ValueError("No source file provided and no previous execution found")

        # Execute mapping
        result = execution_engine.execute_mapping(
            mapping_id=mapping_id,
            source_file_path=source_file_path,
            source_schema={"fields": source_schema.fields} if source_schema.fields else {"fields": []},
            target_schema={"fields": target_schema.fields} if target_schema.fields else {"fields": []},
            mapping_rules=mapping.rules,
            source_type=source_schema.source_type
        )

        # Create execution record
        execution = Execution(
            mapping_id=mapping_id,
            status=result["status"],
            records_processed=result.get("records_processed", 0),
            records_failed=result.get("records_failed", 0),
            output_file_path=result.get("output_file"),
            errors=result.get("errors", []),
            started_at=job.started_at,
            completed_at=datetime.utcnow()
        )
        db.add(execution)

        # Get error suggestions from Claude if there were failures
        if result.get("errors"):
            for error in result["errors"]:
                try:
                    suggestion = error_service.get_error_suggestion(
                        error=error,
                        mapping_rules=mapping.rules,
                        source_schema=source_schema.fields if source_schema.fields else []
                    )
                    error["ai_suggestion"] = suggestion
                except Exception as e:
                    logger.warning(f"Failed to get error suggestion: {e}")

        # Update job status
        job.status = result["status"]
        job.execution_count = (job.execution_count or 0) + 1
        if result["status"] == "failed":
            job.failure_count = (job.failure_count or 0) + 1
        job.updated_at = datetime.utcnow()
        job.last_run = datetime.utcnow()

        db.add(execution)
        db.commit()

        logger.info(f"Job {job_id} completed with status {result['status']}")
        return {"job_id": job_id, "status": result["status"]}

    except Exception as e:
        logger.error(f"Error executing job {job_id}: {e}")
        if job:
            job.status = "failed"
            job.failure_count = (job.failure_count or 0) + 1
            job.updated_at = datetime.utcnow()
            db.commit()
        raise

    finally:
        db.close()


@celery_app.task(name="app.queue.tasks.check_and_run_scheduled_jobs")
def check_and_run_scheduled_jobs():
    """
    Periodic task: Every minute, check for scheduled jobs that should run.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()

        # Find jobs that should run now
        jobs_to_run = db.query(Job).filter(
            Job.schedule_cron.isnot(None),
            Job.next_run <= now,
            Job.status != "running"
        ).all()

        for job in jobs_to_run:
            logger.info(f"Running scheduled job {job.id}")
            execute_mapping.delay(job.id, job.mapping_id)

            # Calculate next run time (simple: add 1 day for daily jobs, etc.)
            # For production, use a proper cron parser
            if job.schedule_cron:
                # For MVP, assume daily jobs
                job.next_run = now + timedelta(days=1)
                db.commit()

    except Exception as e:
        logger.error(f"Error checking scheduled jobs: {e}")
    finally:
        db.close()


@celery_app.task(name="app.queue.tasks.cleanup_old_executions")
def cleanup_old_executions():
    """
    Periodic task: Daily, delete execution records older than 90 days.
    """
    db = SessionLocal()
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=90)

        deleted_count = db.query(Execution).filter(
            Execution.created_at < cutoff_date
        ).delete()

        logger.info(f"Deleted {deleted_count} old execution records")
        db.commit()

    except Exception as e:
        logger.error(f"Error cleaning up executions: {e}")
    finally:
        db.close()


@celery_app.task(name="app.queue.tasks.retry_failed_execution")
def retry_failed_execution(execution_id: str, with_fixes: bool = False):
    """
    Retry a failed mapping execution with optional Claude-suggested fixes.
    """
    db = SessionLocal()
    try:
        execution = db.query(Execution).filter(Execution.id == execution_id).first()
        if not execution:
            logger.error(f"Execution {execution_id} not found")
            return

        mapping = db.query(Mapping).filter(Mapping.id == execution.mapping_id).first()

        # If with_fixes, update mapping rules with Claude suggestions
        if with_fixes and execution.errors:
            mapping.rules = error_service.apply_error_fixes(
                mapping.rules,
                execution.errors
            )
            db.commit()

        # Create new job for retry
        job = Job(
            mapping_id=mapping.id,
            status="pending"
        )
        db.add(job)
        db.commit()

        # Execute immediately
        execute_mapping.delay(job.id, mapping.id)

        return {"job_id": job.id, "message": "Retry job queued"}

    except Exception as e:
        logger.error(f"Error retrying execution: {e}")
        raise
    finally:
        db.close()
