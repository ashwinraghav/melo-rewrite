# ── Cloud DNS — melobooks.com ──────────────────────────────────────────────────
#
# Managed zone for the custom domain. Migrated from Squarespace-managed DNS
# so that Firebase Hosting's internal resolver can reach the records reliably.
#
# After applying, update the registrar (Squarespace Domains) nameservers to
# the values output by `terraform output dns_nameservers`.

resource "google_dns_managed_zone" "melobooks" {
  name        = "melobooks-com"
  dns_name    = "melobooks.com."
  description = "Mello custom domain — melobooks.com"
  project     = var.project_id
  visibility  = "public"

  depends_on = [google_project_service.apis]
}

# ── A record — root domain → Firebase Hosting ──────────────────────────────────

resource "google_dns_record_set" "root_a" {
  name         = "melobooks.com."
  managed_zone = google_dns_managed_zone.melobooks.name
  type         = "A"
  ttl          = 300
  rrdatas      = ["199.36.158.100"]
  project      = var.project_id
}

# ── TXT record — Firebase Hosting ownership verification ───────────────────────

resource "google_dns_record_set" "root_txt" {
  name         = "melobooks.com."
  managed_zone = google_dns_managed_zone.melobooks.name
  type         = "TXT"
  ttl          = 300
  rrdatas      = ["\"hosting-site=melo-f5756\""]
  project      = var.project_id
}

# ── CNAME — www subdomain → Firebase Hosting ───────────────────────────────────

resource "google_dns_record_set" "www_cname" {
  name         = "www.melobooks.com."
  managed_zone = google_dns_managed_zone.melobooks.name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["melo-f5756.web.app."]
  project      = var.project_id
}

# ── Cloud DNS — melostories.com ────────────────────────────────────────────────
#
# Registered via Google Cloud Domains in the melo-f5756 project.
# Cloud Domains creates its own managed zone, but we import and manage
# the DNS records through Terraform for consistency.
#
# NOTE: The managed zone is created automatically by Cloud Domains registration.
# Import it with: terraform import google_dns_managed_zone.melostories melostories-com

resource "google_dns_managed_zone" "melostories" {
  name        = "melostories-com"
  dns_name    = "melostories.com."
  description = "Mello primary domain — melostories.com"
  project     = var.project_id
  visibility  = "public"

  depends_on = [google_project_service.apis]
}

# ── A record — root domain → Firebase Hosting ──────────────────────────────────

resource "google_dns_record_set" "melostories_root_a" {
  name         = "melostories.com."
  managed_zone = google_dns_managed_zone.melostories.name
  type         = "A"
  ttl          = 300
  rrdatas      = ["199.36.158.100"]
  project      = var.project_id
}

# ── TXT record — Firebase Hosting ownership verification ───────────────────────

resource "google_dns_record_set" "melostories_root_txt" {
  name         = "melostories.com."
  managed_zone = google_dns_managed_zone.melostories.name
  type         = "TXT"
  ttl          = 300
  rrdatas      = ["\"hosting-site=melo-f5756\""]
  project      = var.project_id
}

# ── CNAME — www subdomain → Firebase Hosting ───────────────────────────────────

resource "google_dns_record_set" "melostories_www_cname" {
  name         = "www.melostories.com."
  managed_zone = google_dns_managed_zone.melostories.name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["melo-f5756.web.app."]
  project      = var.project_id
}
