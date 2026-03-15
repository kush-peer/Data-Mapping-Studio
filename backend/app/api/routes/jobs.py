from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models import Job, Mapping, Execution, Project
from app.queue.tasks import execute_mapping as execute_mapping_task

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("/{mapping_id}/execute-now")
async def execute_mapping_now(
    mapping_id: str,
    source_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Execute a mapping immediately (non-scheduled).
    """
    try:
        mapping = db.query(Mapping).filter(Mapping.id == mapping_id).first()
        if not mapping:
            raise HTTPException(status_code=404, detail="Mapping not found")

        # Create job record
        job = Job(
            project_id=mapping.project_id,
            mapping_id=mapping_id,
            status="pending"
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # Save uploaded file temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            content = await source_file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Queue async execution
        execute_mapping_task.delay(job.id, mapping_id, tmp_path)

        return {
            "status": "queued",
            "job_id": job.id,
            "mapping_id": mapping_id,
            "message": "Mapping execution queued. Check status with GET /api/jobs/{job_id}/status"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{mapping_id}/schedule")
async def schedule_mapping(
    mapping_id: str,
    schedule_cron: str,  # "0 9 * * *" = daily at 9am
    db: Session = Depends(get_db)
):
    """
    Schedule a mapping to run on a cron schedule.
    """
    try:
        mapping = db.query(Mapping).filter(Mapping.id == mapping_id).first()
        if not mapping:
            raise HTTPException(status_code=404, detail="Mapping not found")

        # Find or create scheduled job
        job = db.query(Job).filter(
            Job.mapping_id == mapping_id,
            Job.schedule_cron == schedule_cron
        ).first()

        if not job:
            job = Job(
                project_id=mapping.project_id,
                mapping_id=mapping_id,
                schedule_cron=schedule_cron,
                next_run=datetime.utcnow(),
                status="pending"
            )
            db.add(job)
            db.commit()
            db.refresh(job)

        return {
            "status": "scheduled",
            "job_id": job.id,
            "mapping_id": mapping_id,
            "schedule_cron": schedule_cron,
            "next_run": job.next_run.isoformat() if job.next_run else None,
            "message": "Mapping scheduled successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{job_id}/status")
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """
    Get job execution status and details.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get latest execution
    execution = db.query(Execution).filter(
        Execution.mapping_id == job.mapping_id
    ).order_by(Execution.created_at.desc()).first()

    return {
        "job_id": job.id,
        "mapping_id": job.mapping_id,
        "status": job.status,
        "execution_count": job.execution_count,
        "failure_count": job.failure_count,
        "schedule_cron": job.schedule_cron,
        "last_run": job.last_run.isoformat() if job.last_run else None,
        "next_run": job.next_run.isoformat() if job.next_run else None,
        "latest_execution": {
            "id": execution.id,
            "status": execution.status,
            "records_processed": execution.records_processed,
            "records_failed": execution.records_failed,
            "started_at": execution.started_at.isoformat() if execution.started_at else None,
            "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
            "output_file": execution.output_file_path,
            "errors": execution.errors
        } if execution else None
    }


@router.get("/{job_id}/logs")
async def get_job_logs(job_id: str, db: Session = Depends(get_db)):
    """
    Get detailed execution logs for a job.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get executions for this job
    executions = db.query(Execution).filter(
        Execution.mapping_id == job.mapping_id
    ).order_by(Execution.created_at.desc()).limit(10).all()

    return {
        "job_id": job.id,
        "mapping_id": job.mapping_id,
        "executions": [
            {
                "id": e.id,
                "status": e.status,
                "records_processed": e.records_processed,
                "records_failed": e.records_failed,
                "started_at": e.started_at.isoformat() if e.started_at else None,
                "completed_at": e.completed_at.isoformat() if e.completed_at else None,
                "errors": e.errors
            }
            for e in executions
        ]
    }


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str, db: Session = Depends(get_db)):
    """
    Cancel a scheduled job.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.schedule_cron = None
    job.next_run = None
    job.status = "cancelled"
    db.commit()

    return {
        "status": "cancelled",
        "job_id": job.id,
        "message": "Job cancelled successfully"
    }


@router.get("/mapping/{mapping_id}")
async def list_jobs_for_mapping(mapping_id: str, db: Session = Depends(get_db)):
    """
    List all jobs for a mapping (scheduled and executed).
    """
    mapping = db.query(Mapping).filter(Mapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    jobs = db.query(Job).filter(Job.mapping_id == mapping_id).order_by(Job.created_at.desc()).all()

    return {
        "mapping_id": mapping_id,
        "total_jobs": len(jobs),
        "jobs": [
            {
                "id": j.id,
                "status": j.status,
                "schedule_cron": j.schedule_cron,
                "last_run": j.last_run.isoformat() if j.last_run else None,
                "next_run": j.next_run.isoformat() if j.next_run else None,
                "execution_count": j.execution_count,
                "failure_count": j.failure_count,
                "created_at": j.created_at.isoformat()
            }
            for j in jobs
        ]
    }
