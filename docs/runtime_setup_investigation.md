# Runtime Setup Investigation

Investigation date: 2026-08-30

This is an analysis-only report. No code, environment, Docker services, database schema, migrations, dependencies, or storage paths were modified.

## 1. Official Local Setup Procedure

The repository documents two intended setup modes:

1. Local development mode from `src/`
2. Docker Compose mode from `docker/`

For local development, the README expects:

```bash
conda create -n mini-rag python=3.10
conda activate mini-rag
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

For Docker Compose, the Docker README expects:

```bash
cd docker/env
cp .env.example.app .env.app
cp .env.example.postgres .env.postgres
cp .env.example.grafana .env.grafana
cp .env.example.postgres-exporter .env.postgres-exporter
cd ../minirag
cp alembic.example.ini alembic.ini
cd ..
docker compose up --build -d
```

The Docker instructions also suggest starting databases first if connection timing causes failures.

## 2. Required Python Version

The README explicitly requires:

```text
Python 3.10
```

The Dockerfile uses:

```text
ghcr.io/astral-sh/uv:0.6.14-python3.10-bookworm
```

So the intended runtime is Python 3.10, not Python 3.12.

The current repository-local `venv` points to:

```text
C:\Users\HP\AppData\Local\Programs\Python\Python312\python.exe
```

That does not match the documented version and was missing during the previous smoke test.

## 3. Required Docker Services

### API only

Minimum Docker services for the FastAPI application when using `PGVECTOR`:

- `pgvector`
- `fastapi`

The `fastapi` service depends on `pgvector` being healthy.

If using `QDRANT` instead of `PGVECTOR`, the app would also need Qdrant reachable, but the shipped Docker `.env.app` sets:

```text
VECTOR_DB_BACKEND = "PGVECTOR"
```

### Document ingestion

The API endpoints for ingestion enqueue Celery tasks:

- `POST /api/v1/data/process/{project_id}`
- `POST /api/v1/data/process-and-push/{project_id}`

For normal API-driven document ingestion, required services are:

- `pgvector`
- `fastapi`
- `rabbitmq`
- `redis`
- `celery-worker`

The file upload endpoint itself writes the file and creates an `Asset` row synchronously, so upload needs the API and PostgreSQL, but actual processing needs Celery infrastructure.

### Background processing

Required services:

- `rabbitmq`
- `redis`
- `pgvector`
- `celery-worker`

The worker runs:

```bash
python -m celery -A celery_app worker --queues=default,file_processing,data_indexing --loglevel=info
```

### Full Celery workflow

Required services:

- `rabbitmq`
- `redis`
- `pgvector`
- `fastapi`
- `celery-worker`
- `celery-beat` if scheduled maintenance is desired
- `flower` if task monitoring is desired

The full Docker stack also includes:

- `nginx`
- `qdrant`
- `prometheus`
- `grafana`
- `node-exporter`
- `postgres-exporter`

Those are not all required for the minimal RAG workflow when using `PGVECTOR`.

## 4. Database Initialization Procedure

The official PostgreSQL service is the Docker Compose service named `pgvector`.

It uses:

```yaml
image: pgvector/pgvector:0.8.0-pg17
ports:
  - "5400:5432"
env_file:
  - ./env/.env.postgres
```

The Docker env example creates:

```text
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_password
POSTGRES_DB=minirag
```

Local development uses `src/.env.example`, which points at:

```text
POSTGRES_HOST="localhost"
POSTGRES_PORT=5432
POSTGRES_MAIN_DATABASE="minirag"
```

Docker mode uses `docker/env/.env.example.app`, which points at the Compose service name:

```text
POSTGRES_HOST="pgvector"
POSTGRES_PORT=5432
POSTGRES_MAIN_DATABASE="minirag"
```

Because Compose maps host port `5400` to container port `5432`, a host-side local app should use port `5400` if connecting to the Compose PostgreSQL container from Windows.

## 5. Migration Procedure

The intended migration command is:

```bash
alembic upgrade head
```

For local development, this is documented in both:

- `README.md`
- `src/models/db_schemes/minirag/README.md`

The Alembic working directory should be:

```text
src/models/db_schemes/minirag
```

The local Alembic config must be created from:

```bash
cp alembic.ini.example alembic.ini
```

and then edited with the correct `sqlalchemy.url`.

For Docker mode, `docker/minirag/entrypoint.sh` runs:

```bash
cd /app/models/db_schemes/minirag/
alembic upgrade head
cd /app
```

This means the application container is expected to run migrations automatically before launching Uvicorn.

Important repository issue: `docker/minirag/Dockerfile` copies:

```dockerfile
COPY docker/minirag/alembic.ini /app/models/db_schemes/minirag/alembic.ini
```

but the repository currently contains:

```text
docker/minirag/alembic.example.ini
```

not `docker/minirag/alembic.ini`. The Docker README expects the user to create that file before building.

## 6. pgvector Initialization Mechanism

There is no migration file that creates the `vector` extension.

The pgvector Docker image provides PostgreSQL with the extension available, but the extension is enabled by application code.

`src/stores/vectordb/providers/PGVectorProvider.py` runs this during provider connection:

```sql
SELECT 1 FROM pg_extension WHERE extname = 'vector'
CREATE EXTENSION vector
```

So the expected mechanism is:

- Docker image makes the extension available.
- FastAPI or Celery startup creates the extension by calling `PGVectorProvider.connect()`.
- Dynamic pgvector collection tables are then created by `PGVectorProvider.create_collection()`.

The Alembic migrations only create application tables:

- `projects`
- `assets`
- `chunks`
- `celery_task_executions`

## 7. RabbitMQ Requirement Analysis

RabbitMQ is required for Celery task dispatch.

It is required for normal API calls that enqueue background work:

- `POST /api/v1/data/process/{project_id}`
- `POST /api/v1/data/process-and-push/{project_id}`
- `POST /api/v1/nlp/index/push/{project_id}`

RabbitMQ is not required for:

- FastAPI application startup
- the welcome endpoint
- direct synchronous search/answer endpoints, assuming data and vectors already exist
- direct Python calls to the underlying async functions, if done outside Celery for debugging

For a basic synchronous smoke test that bypasses Celery and calls internal functions directly, RabbitMQ is not strictly required. For the official API-driven ingestion workflow, RabbitMQ is required.

## 8. Redis Requirement Analysis

Redis is configured as the Celery result backend:

```text
CELERY_RESULT_BACKEND="redis://:minirag_redis_2222@localhost:6379/0"
```

Redis is required for:

- Celery result storage
- observing task completion/status through Celery result backend behavior
- the full background workflow as configured

Redis is not required for:

- FastAPI startup by itself
- direct database migrations
- direct synchronous code-path smoke tests that bypass Celery

For the official Celery workflow, Redis should be considered required.

## 9. Correct FastAPI Startup Command

The local development command from README is:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

This command should be run from:

```text
C:\MultiRagAgent\src
```

The Docker command is:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

This is run inside the container from:

```text
/app
```

The app object is:

```text
main:app
```

## 10. Expected API Port

Expected ports differ by run mode:

- Local development README command: `5000`
- Docker Compose FastAPI service: `8000`
- Nginx reverse proxy: `80`

The previous smoke test checked `localhost:8000`, which is correct for Docker mode. However, the service currently bound there exposes a different FastAPI application, not mini-rag.

## 11. Storage Directory Investigation

The application expects runtime files under:

```text
src/assets/files
```

This is set in `src/controllers/BaseController.py`:

```python
self.files_dir = os.path.join(
    self.base_dir,
    "assets/files"
)
```

`ProjectController.get_project_path()` then expects to create project subdirectories under that path.

The repository currently has:

```text
C:\MultiRagAgent\src\assets\files
Mode: -a---
Length: 0
```

That means `files` is currently a zero-byte file, not a directory.

The `.gitignore` under `src/assets/.gitignore` contains:

```text
files
database
```

This suggests the repository-intended state is:

- `src/assets/files/` should be an ignored runtime directory.
- `src/assets/database/` should be an ignored runtime directory.
- Those paths should not be committed with runtime contents.

The current zero-byte `src/assets/files` file conflicts with the application expectation. It should not be modified during this investigation, but it must be addressed before an upload or ingestion smoke test can run successfully from the local checkout.

## 12. Recommended Minimal Setup for an End-to-End Smoke Test

The cleanest minimal official setup for an end-to-end smoke test is Docker Compose with the app, PostgreSQL, RabbitMQ, Redis, and a Celery worker.

Minimum services:

```text
pgvector
rabbitmq
redis
fastapi
celery-worker
```

Optional but useful:

```text
flower
nginx
```

Not required for a PGVector-only smoke test:

```text
qdrant
prometheus
grafana
node-exporter
postgres-exporter
celery-beat
```

For a direct synchronous smoke test that bypasses API-enqueued Celery jobs, the minimum is smaller:

```text
Python 3.10 runtime
installed requirements
configured .env
PostgreSQL/pgvector database
Alembic-created app schema
valid src/assets/files directory
valid LLM/embedding credentials or a controlled embedding stub
```

However, that direct approach is not the official API workflow because the project routes enqueue Celery tasks for processing and indexing.

## Recommended Next Actions

1. Recreate or repair the local Python environment using Python 3.10.
2. Install the existing pinned dependencies from `src/requirements.txt`.
3. Create `src/.env` from `src/.env.example` for local mode, or create Docker env files from the `docker/env/.env.example.*` files for Docker mode.
4. For local mode with Compose PostgreSQL, set `POSTGRES_HOST=localhost` and `POSTGRES_PORT=5400`.
5. Fix the runtime storage path by replacing the zero-byte `src/assets/files` file with a directory.
6. Create the missing concrete Alembic config from `src/models/db_schemes/minirag/alembic.ini.example` for local mode, or from `docker/minirag/alembic.example.ini` for Docker mode.
7. Start the required database and queue services: `pgvector`, `rabbitmq`, and `redis`.
8. Run `alembic upgrade head` from `src/models/db_schemes/minirag` for local mode, or let the Docker app entrypoint run migrations after the concrete Docker Alembic config exists.
9. Start the mini-rag FastAPI app with `uvicorn main:app --reload --host 0.0.0.0 --port 5000` from `src`, or start the Docker `fastapi` service on port `8000`.
10. Start the Celery worker with `python -m celery -A celery_app worker --queues=default,file_processing,data_indexing --loglevel=info`.
11. Confirm the running app exposes mini-rag routes in `/openapi.json`.
12. Re-run the Task 2.1 smoke test through upload, process, index, database query, and retrieval.

