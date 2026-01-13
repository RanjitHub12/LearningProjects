FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install build dependencies for some Python packages (adjust if not needed)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker layer caching
COPY requirements.txt ./requirements.txt

RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app

# Create a non-root user and use it
RUN useradd -m appuser \
    && chown -R appuser /app
USER appuser

EXPOSE 8000

# Default command (assumes FastAPI app instance is `app` in `main.py`)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
