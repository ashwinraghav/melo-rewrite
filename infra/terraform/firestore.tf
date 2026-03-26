# ── Firestore indexes ─────────────────────────────────────────────────────────

# Vector index on the embedding field for semantic search.
# Uses COSINE distance to match the existing embedding model (text-embedding-005).
# Pre-filters on isPublished so only published stories are searched.
resource "google_firestore_index" "stories_embedding_vector" {
  project    = var.project_id
  database   = "(default)"
  collection = "stories"

  fields {
    field_path = "isPublished"
    order      = "ASCENDING"
  }

  fields {
    field_path = "embedding"
    vector_config {
      dimension = 768
      flat {}
    }
  }

  depends_on = [google_project_service.apis]
}
