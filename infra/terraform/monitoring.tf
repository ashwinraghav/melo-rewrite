# ── Cloud Monitoring Dashboard ─────────────────────────────────────────────────
#
# Single pane of glass for the Mello API: request health, business metrics,
# pipeline durations, and infrastructure. Links to Cloud Trace and Cloud Logging.

resource "google_monitoring_dashboard" "mello_api" {
  project        = var.project_id
  dashboard_json = jsonencode({
    displayName = "Mello API"
    labels      = { "service" : "" }
    mosaicLayout = {
      columns = 48
      tiles = concat(
        # ── Header: Navigation links ─────────────────────────────────────
        [
          {
            width  = 48
            height = 4
            widget = {
              title = "Quick Links"
              text = {
                content = join("\n", [
                  "**[Cloud Trace](https://console.cloud.google.com/traces/list?project=${var.project_id})** | ",
                  "**[Cloud Logging](https://console.cloud.google.com/logs/query?project=${var.project_id})** | ",
                  "**[Cloud Run](https://console.cloud.google.com/run/detail/${var.region}/mello-api?project=${var.project_id})** | ",
                  "**[Sentry](https://spectrum-bridge.sentry.io/issues/)**",
                ])
                format = "MARKDOWN"
              }
            }
          },
        ],

        # ── Row 1: Request Health ────────────────────────────────────────
        [
          {
            yPos   = 4
            width  = 16
            height = 16
            widget = {
              title = "Request Rate (by status)"
              xyChart = {
                dataSets = [
                  {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"mello-api\" AND metric.type=\"run.googleapis.com/request_count\""
                        aggregation = {
                          alignmentPeriod  = "60s"
                          perSeriesAligner = "ALIGN_RATE"
                          crossSeriesReducer = "REDUCE_SUM"
                          groupByFields = ["metric.labels.response_code_class"]
                        }
                      }
                    }
                    plotType = "STACKED_BAR"
                  }
                ]
                yAxis = { label = "req/s" }
              }
            }
          },
          {
            xPos   = 16
            yPos   = 4
            width  = 16
            height = 16
            widget = {
              title = "Request Latency (p50 / p95 / p99)"
              xyChart = {
                dataSets = [
                  for percentile in [50, 95, 99] : {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"mello-api\" AND metric.type=\"run.googleapis.com/request_latencies\""
                        aggregation = {
                          alignmentPeriod  = "60s"
                          perSeriesAligner = "ALIGN_PERCENTILE_${percentile}"
                          crossSeriesReducer = "REDUCE_MEAN"
                        }
                      }
                    }
                    plotType = "LINE"
                  }
                ]
                yAxis = { label = "ms" }
              }
            }
          },
          {
            xPos   = 32
            yPos   = 4
            width  = 16
            height = 16
            widget = {
              title = "Error Rate (4xx + 5xx)"
              xyChart = {
                dataSets = [
                  {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"mello-api\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class!=\"2xx\""
                        aggregation = {
                          alignmentPeriod  = "60s"
                          perSeriesAligner = "ALIGN_RATE"
                          crossSeriesReducer = "REDUCE_SUM"
                          groupByFields = ["metric.labels.response_code_class"]
                        }
                      }
                    }
                    plotType = "STACKED_BAR"
                  }
                ]
                yAxis = { label = "errors/s" }
              }
            }
          },
        ],

        # ── Row 2: Business Metrics ──────────────────────────────────────
        [
          for i, metric_info in [
            { name = "stories.generated",    title = "Stories Generated" },
            { name = "stories.published",    title = "Stories Published" },
            { name = "searches.performed",   title = "Searches" },
            { name = "voice_clones.completed", title = "Voice Clones" },
          ] : {
            xPos   = i * 12
            yPos   = 20
            width  = 12
            height = 12
            widget = {
              title = metric_info.title
              xyChart = {
                dataSets = [
                  {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "metric.type=\"custom.googleapis.com/opencensus/mello.${metric_info.name}\""
                        aggregation = {
                          alignmentPeriod  = "300s"
                          perSeriesAligner = "ALIGN_DELTA"
                          crossSeriesReducer = "REDUCE_SUM"
                        }
                      }
                    }
                    plotType = "STACKED_BAR"
                  }
                ]
              }
            }
          }
        ],

        # ── Row 3: Pipeline Durations ────────────────────────────────────
        [
          for i, metric_info in [
            { name = "story.generation.duration", title = "Story Generation Duration" },
            { name = "story.publish.duration",    title = "Story Publish Duration" },
          ] : {
            xPos   = i * 24
            yPos   = 32
            width  = 24
            height = 16
            widget = {
              title = "${metric_info.title} (p50 / p95)"
              xyChart = {
                dataSets = [
                  for percentile in [50, 95] : {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "metric.type=\"custom.googleapis.com/opencensus/mello.${metric_info.name}\""
                        aggregation = {
                          alignmentPeriod  = "300s"
                          perSeriesAligner = "ALIGN_PERCENTILE_${percentile}"
                          crossSeriesReducer = "REDUCE_MEAN"
                        }
                      }
                    }
                    plotType = "LINE"
                  }
                ]
                yAxis = { label = "seconds" }
              }
            }
          }
        ],

        # ── Row 4: Client Durations (p50 / p95) ─────────────────────────
        [
          for i, metric_info in [
            { name = "gcs.duration",         title = "GCS" },
            { name = "anthropic.duration",   title = "Anthropic (Claude)" },
            { name = "genai.duration",       title = "GenAI (Imagen/Embed)" },
            { name = "elevenlabs.duration",  title = "ElevenLabs" },
            { name = "cohere.duration",      title = "Cohere" },
          ] : {
            xPos   = i * 9
            yPos   = 48
            width  = 9
            height = 12
            widget = {
              title = "${metric_info.title} Latency"
              xyChart = {
                dataSets = [
                  for percentile in [50, 95] : {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "metric.type=\"custom.googleapis.com/opencensus/mello.${metric_info.name}\""
                        aggregation = {
                          alignmentPeriod  = "300s"
                          perSeriesAligner = "ALIGN_PERCENTILE_${percentile}"
                          crossSeriesReducer = "REDUCE_MEAN"
                        }
                      }
                    }
                    plotType = "LINE"
                  }
                ]
                yAxis = { label = "seconds" }
              }
            }
          }
        ],

        # ── Row 5: Client Errors ─────────────────────────────────────────
        [
          for i, metric_info in [
            { name = "gcs.errors",         title = "GCS Errors" },
            { name = "anthropic.errors",   title = "Anthropic Errors" },
            { name = "genai.errors",       title = "GenAI Errors" },
            { name = "elevenlabs.errors",  title = "ElevenLabs Errors" },
            { name = "cohere.errors",      title = "Cohere Errors" },
          ] : {
            xPos   = i * 9
            yPos   = 60
            width  = 9
            height = 12
            widget = {
              title = metric_info.title
              xyChart = {
                dataSets = [
                  {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "metric.type=\"custom.googleapis.com/opencensus/mello.${metric_info.name}\""
                        aggregation = {
                          alignmentPeriod  = "300s"
                          perSeriesAligner = "ALIGN_DELTA"
                          crossSeriesReducer = "REDUCE_SUM"
                          groupByFields = ["metric.labels.operation"]
                        }
                      }
                    }
                    plotType = "STACKED_BAR"
                  }
                ]
              }
            }
          }
        ],

        # ── Row 6: Infrastructure ────────────────────────────────────────
        [
          {
            yPos   = 72
            width  = 12
            height = 12
            widget = {
              title = "Instance Count"
              xyChart = {
                dataSets = [
                  {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"mello-api\" AND metric.type=\"run.googleapis.com/container/instance_count\""
                        aggregation = {
                          alignmentPeriod  = "60s"
                          perSeriesAligner = "ALIGN_MEAN"
                          crossSeriesReducer = "REDUCE_SUM"
                        }
                      }
                    }
                    plotType = "LINE"
                  }
                ]
              }
            }
          },
          {
            xPos   = 12
            yPos   = 72
            width  = 12
            height = 12
            widget = {
              title = "CPU Utilization"
              xyChart = {
                dataSets = [
                  {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"mello-api\" AND metric.type=\"run.googleapis.com/container/cpu/utilizations\""
                        aggregation = {
                          alignmentPeriod  = "60s"
                          perSeriesAligner = "ALIGN_PERCENTILE_95"
                          crossSeriesReducer = "REDUCE_MEAN"
                        }
                      }
                    }
                    plotType = "LINE"
                  }
                ]
                yAxis = { label = "%" }
              }
            }
          },
          {
            xPos   = 24
            yPos   = 72
            width  = 12
            height = 12
            widget = {
              title = "Memory Utilization"
              xyChart = {
                dataSets = [
                  {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"mello-api\" AND metric.type=\"run.googleapis.com/container/memory/utilizations\""
                        aggregation = {
                          alignmentPeriod  = "60s"
                          perSeriesAligner = "ALIGN_PERCENTILE_95"
                          crossSeriesReducer = "REDUCE_MEAN"
                        }
                      }
                    }
                    plotType = "LINE"
                  }
                ]
                yAxis = { label = "%" }
              }
            }
          },
          {
            xPos   = 36
            yPos   = 72
            width  = 12
            height = 12
            widget = {
              title = "Startup Latency"
              xyChart = {
                dataSets = [
                  {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"mello-api\" AND metric.type=\"run.googleapis.com/container/startup_latencies\""
                        aggregation = {
                          alignmentPeriod  = "300s"
                          perSeriesAligner = "ALIGN_PERCENTILE_99"
                          crossSeriesReducer = "REDUCE_MEAN"
                        }
                      }
                    }
                    plotType = "LINE"
                  }
                ]
                yAxis = { label = "ms" }
              }
            }
          },
        ],
      )
    }
  })

  depends_on = [google_project_service.apis]
}
