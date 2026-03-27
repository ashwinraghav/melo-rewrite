"""
Structured JSON logging for Cloud Logging integration.

In production: JSON lines to stdout with trace correlation fields that
Cloud Logging recognizes for clickable trace links.

In development: standard human-readable format.
"""
from __future__ import annotations

import json
import logging
import sys

from .config import config


class CloudJsonFormatter(logging.Formatter):
    """JSON formatter compatible with Google Cloud Logging's structured logging."""

    LEVEL_MAP = {
        "DEBUG": "DEBUG",
        "INFO": "INFO",
        "WARNING": "WARNING",
        "ERROR": "ERROR",
        "CRITICAL": "CRITICAL",
    }

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict = {
            "severity": self.LEVEL_MAP.get(record.levelname, "DEFAULT"),
            "message": record.getMessage(),
            "logger": record.name,
        }

        # Trace correlation — injected by OTel LoggingInstrumentor
        trace_id = getattr(record, "otelTraceID", "0")
        span_id = getattr(record, "otelSpanID", "0")
        if trace_id and trace_id != "0":
            log_entry["logging.googleapis.com/trace"] = (
                f"projects/{config.gcp_project_id}/traces/{trace_id}"
            )
            log_entry["logging.googleapis.com/spanId"] = span_id

        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def configure_logging() -> None:
    """Set up logging for the application. Call before any getLogger() usage."""
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # Remove existing handlers (uvicorn adds its own)
    for handler in root.handlers[:]:
        root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)

    if config.env == "production":
        handler.setFormatter(CloudJsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-8s %(name)s — %(message)s")
        )

    root.addHandler(handler)

    # Quiet noisy libraries
    logging.getLogger("google").setLevel(logging.WARNING)
    logging.getLogger("grpc").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
