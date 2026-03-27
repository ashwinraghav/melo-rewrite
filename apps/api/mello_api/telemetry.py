"""
OpenTelemetry initialization — Cloud Trace, Cloud Monitoring, auto-instrumentation.

Production only. In dev/test this is a no-op (all instruments return no-op instances).
"""
from __future__ import annotations

import logging

from .config import config

log = logging.getLogger(__name__)


def init_telemetry() -> None:
    """Initialize OTel tracing, metrics, and auto-instrumentation. No-op outside production."""
    if config.env != "production":
        log.info("Skipping OTel init (env=%s)", config.env)
        return

    from opentelemetry import trace, metrics
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.propagate import set_global_textmap
    from opentelemetry.propagators.composite import CompositePropagator
    from opentelemetry.trace.propagation import get_current_span

    # GCP-specific
    from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
    from opentelemetry.exporter.cloud_monitoring import CloudMonitoringMetricsExporter
    from opentelemetry.resourcedetector.gcp_resource_detector import (
        GoogleCloudResourceDetector,
    )
    from opentelemetry.propagators.cloud_trace_propagator import (
        CloudTraceFormatPropagator,
    )
    from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

    # Auto-instrumentors
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
    from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient
    from opentelemetry.instrumentation.logging import LoggingInstrumentor

    # ── Resource detection ────────────────────────────────────────────────
    resource = Resource.create().merge(
        GoogleCloudResourceDetector().detect()
    )

    # ── Tracing ───────────────────────────────────────────────────────────
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(CloudTraceSpanExporter())
    )
    trace.set_tracer_provider(tracer_provider)

    # ── Metrics ───────────────────────────────────────────────────────────
    metric_reader = PeriodicExportingMetricReader(
        CloudMonitoringMetricsExporter(),
        export_interval_millis=60_000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # ── Propagation ───────────────────────────────────────────────────────
    # Support both W3C Trace Context (standard) and X-Cloud-Trace-Context
    # (injected by Cloud Run's load balancer).
    set_global_textmap(CompositePropagator([
        TraceContextTextMapPropagator(),
        CloudTraceFormatPropagator(),
    ]))

    # ── Auto-instrumentation ──────────────────────────────────────────────
    FastAPIInstrumentor().instrument(excluded_urls="health")
    HTTPXClientInstrumentor().instrument()
    GrpcInstrumentorClient().instrument()
    LoggingInstrumentor().instrument(set_logging_format=False)

    log.info("OpenTelemetry initialized (Cloud Trace + Cloud Monitoring)")
