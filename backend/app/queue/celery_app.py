from celery import Celery
from celery.schedules import crontab
import os
from dotenv import load_dotenv

load_dotenv()

# Create Celery app
celery_app = Celery(
    __name__,
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0"),
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,  # Process one task at a time
)

# Beat schedule (periodic tasks)
celery_app.conf.beat_schedule = {
    "check-scheduled-jobs": {
        "task": "app.queue.tasks.check_and_run_scheduled_jobs",
        "schedule": crontab(minute="*"),  # Every minute
    },
    "cleanup-old-executions": {
        "task": "app.queue.tasks.cleanup_old_executions",
        "schedule": crontab(hour=0, minute=0),  # Daily at midnight
    },
}
