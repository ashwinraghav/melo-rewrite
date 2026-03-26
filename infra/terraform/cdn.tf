# ── Cloud CDN for story assets ─────────────────────────────────────────────────
#
# Puts a global CDN in front of the stories GCS bucket. Cover art and audio
# are cached at Google's edge nodes worldwide. First request hits GCS, every
# subsequent request from that region is served from cache (~10-20ms).
#
# URL: https://cdn.melostories.com/stories/{storyId}/cover.webp
#
# The API returns public GCS URLs today. After CDN is live, update the API
# to return CDN URLs instead (just swap the domain).

# Reserve a global static IP for the load balancer
resource "google_compute_global_address" "cdn" {
  name    = "mello-cdn-ip"
  project = var.project_id

  depends_on = [google_project_service.apis]
}

# Backend bucket — connects the GCS bucket to the load balancer with CDN
resource "google_compute_backend_bucket" "stories" {
  name        = "mello-stories-backend"
  project     = var.project_id
  bucket_name = google_storage_bucket.stories.name
  enable_cdn  = true

  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                  = 86400    # 24 hours
    max_ttl                      = 604800   # 7 days
    client_ttl                   = 86400    # 24 hours
    serve_while_stale            = 86400    # Serve stale for 24h while revalidating
    signed_url_cache_max_age_sec = 0        # Not using signed URLs
  }
}

# URL map — routes all traffic to the backend bucket
resource "google_compute_url_map" "cdn" {
  name            = "mello-cdn-url-map"
  project         = var.project_id
  default_service = google_compute_backend_bucket.stories.id
}

# Managed SSL certificate for cdn.melostories.com
resource "google_compute_managed_ssl_certificate" "cdn" {
  name    = "mello-cdn-cert"
  project = var.project_id

  managed {
    domains = ["cdn.melostories.com"]
  }
}

# HTTPS proxy — terminates TLS and forwards to the URL map
resource "google_compute_target_https_proxy" "cdn" {
  name             = "mello-cdn-https-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.cdn.id
  ssl_certificates = [google_compute_managed_ssl_certificate.cdn.id]
}

# Global forwarding rule — binds the static IP to the HTTPS proxy
resource "google_compute_global_forwarding_rule" "cdn" {
  name       = "mello-cdn-forwarding-rule"
  project    = var.project_id
  target     = google_compute_target_https_proxy.cdn.id
  ip_address = google_compute_global_address.cdn.address
  port_range = "443"
}

# DNS record — point cdn.melostories.com to the CDN IP
resource "google_dns_record_set" "cdn_a" {
  managed_zone = google_dns_managed_zone.melostories.name
  name         = "cdn.melostories.com."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.cdn.address]
  project      = var.project_id
}
