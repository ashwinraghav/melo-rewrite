"""
Cloud Tasks queue — enqueues background work targeting the same Cloud Run service.

Production: creates HTTP tasks with OIDC authentication.
Tests: SyncTaskQueue runs the handler synchronously for deterministic assertions.
"""
from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    pass

log = logging.getLogger(__name__)


class TaskQueueService(ABC):
    @abstractmethod
    def enqueue(self, task_type: str, payload: dict, dedup_id: str | None = None) -> None: ...


class CloudTaskQueue(TaskQueueService):
    """Enqueues HTTP tasks via Google Cloud Tasks."""

    def __init__(
        self,
        project_id: str,
        location: str,
        queue_name: str,
        service_url: str,
        service_account_email: str,
    ) -> None:
        from google.cloud import tasks_v2

        self._client = tasks_v2.CloudTasksClient()
        self._queue_path = self._client.queue_path(project_id, location, queue_name)
        self._service_url = service_url.rstrip("/")
        self._service_account_email = service_account_email

    def enqueue(self, task_type: str, payload: dict, dedup_id: str | None = None) -> None:
        from google.cloud import tasks_v2

        client = self._client
        url = f"{self._service_url}/internal/tasks/{task_type}"

        task: dict = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": url,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(payload).encode(),
                "oidc_token": {
                    "service_account_email": self._service_account_email,
                    "audience": self._service_url,
                },
            },
        }

        if dedup_id:
            task["name"] = f"{self._queue_path}/tasks/{task_type}-{dedup_id}"

        try:
            client.create_task(
                request={"parent": self._queue_path, "task": task},
            )
            log.info("Enqueued task %s (dedup=%s)", task_type, dedup_id)
        except Exception as e:
            # If dedup ID already exists, Cloud Tasks returns ALREADY_EXISTS
            if "ALREADY_EXISTS" in str(e):
                log.info("Task %s already enqueued (dedup=%s), skipping", task_type, dedup_id)
            else:
                raise


class SyncTaskQueue(TaskQueueService):
    """Runs task handlers synchronously — for deterministic tests."""

    def __init__(self, handler: Callable[[str, dict], None]) -> None:
        self._handler = handler

    def enqueue(self, task_type: str, payload: dict, dedup_id: str | None = None) -> None:
        self._handler(task_type, payload)
