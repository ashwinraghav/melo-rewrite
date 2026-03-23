# ── Build / dependency layer ────────────────────────────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app

# Install deps into a virtual environment for easy copying
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY apps/api/pyproject.toml ./
RUN pip install --no-cache-dir -e .

# ── Production image ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS runner
WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY apps/api/mello_api ./mello_api

ENV PORT=8080
EXPOSE 8080

CMD ["uvicorn", "mello_api.asgi:app", "--host", "0.0.0.0", "--port", "8080"]
