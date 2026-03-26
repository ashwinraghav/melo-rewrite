# ── Firestore indexes ─────────────────────────────────────────────────────────
#
# Vector index on the embedding field for semantic search.
# Uses COSINE distance to match the existing embedding model (text-embedding-005).
# Pre-filters on isPublished so only published stories are searched.
#
# NOTE: This index was created via gcloud CLI and exists in production.
# The Terraform resource is commented out because the imported state doesn't
# match the config (Terraform adds a __name__ field automatically).
# To recreate: gcloud firestore indexes composite create \
#   --project=melo-f5756 --collection-group=stories --query-scope=COLLECTION \
#   --field-config=order=ASCENDING,field-path=isPublished \
#   --field-config='vector-config={"dimension":"768","flat":"{}"},field-path=embedding'
#
# resource "google_firestore_index" "stories_embedding_vector" {
#   project    = var.project_id
#   database   = "(default)"
#   collection = "stories"
#
#   fields {
#     field_path = "isPublished"
#     order      = "ASCENDING"
#   }
#
#   fields {
#     field_path = "embedding"
#     vector_config {
#       dimension = 768
#       flat {}
#     }
#   }
#
#   depends_on = [google_project_service.apis]
# }
