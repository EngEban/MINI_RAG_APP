# Mini-RAG Project Audit

Audit date: 2026-08-30

This report is an analysis-only snapshot of the current repository state. It describes what is actually implemented today, where the core flow lives, and where the cleanest extension points are for the next phase.

## 1. Project Structure

### Top-level layout

- `.github/` - GitHub automation/configuration.
- `.vscode/` - local editor settings.
- `docker/` - Docker Compose stack, service configs, and the application image.
- `src/` - the full application codebase.
- `README.md` - project overview and run instructions.
- `LICENSE` - license text.

### Key application areas under `src/`

- `main.py` - FastAPI app bootstrap, dependency wiring, startup/shutdown hooks.
- `routes/` - HTTP API routers and request schemas.
- `controllers/` - application logic for file handling, chunking, and RAG orchestration.
- `tasks/` - Celery background jobs for file processing, indexing, workflow chaining, and maintenance.
- `stores/llm/` - LLM and embedding provider abstractions plus prompt templates.
- `stores/vectordb/` - vector database abstraction plus Qdrant and PostgreSQL/pgvector providers.
- `models/` - SQLAlchemy ORM models and enums.
- `helpers/` - configuration loading.
- `utils/` - metrics and Celery idempotency support.
- `assets/` - runtime file storage and the Postman collection.

### Runtime storage

- Uploaded files are stored beneath `src/assets/files/` at runtime, partitioned by project ID.
- There is also a `src/assets/database/` path referenced by `BaseController`, but the current repo does not ship a populated database directory.

## 2. Current Architecture

The application is a lightweight RAG backend with these layers:

- FastAPI serves the HTTP API.
- PostgreSQL stores project/file/chunk records and Celery execution state.
- A pluggable vector database stores embeddings and supports semantic retrieval.
- Celery handles long-running file processing and indexing jobs.
- LLM and embedding providers are abstracted behind a factory so the backend can be OpenAI or Cohere.
- Prompt text is handled via a simple locale/template parser.

### Startup wiring

On startup, `src/main.py`:

- loads settings from environment values via `helpers.config.get_settings()`
- creates an async SQLAlchemy engine and session factory
- instantiates the LLM factory and vector DB factory
- creates the generation client and embedding client
- connects the vector DB client
- initializes the prompt `TemplateParser`
- registers the routers
- installs Prometheus metrics middleware and the metrics endpoint

### Execution model

- Synchronous API requests are used for file upload and job submission.
- Processing and indexing are pushed into Celery jobs.
- Search and answer generation still run synchronously inside the FastAPI request cycle.

## 3. RAG Pipeline

### End-to-end flow

1. A file is uploaded through `POST /api/v1/data/upload/{project_id}`.
2. The file is validated for type and size.
3. The file is written to `src/assets/files/{project_id}/...`.
4. An `Asset` row is created in PostgreSQL.
5. The user triggers processing through `POST /api/v1/data/process/{project_id}` or `POST /api/v1/data/process-and-push/{project_id}`.
6. `tasks.file_processing.process_project_files` loads the stored file from disk.
7. `ProcessController` converts the document into chunks.
8. Chunks are persisted in PostgreSQL as `chunks` rows.
9. `tasks.data_indexing.index_data_content` reads chunk rows and embeds them.
10. The embedding vectors are inserted into the configured vector store.
11. `POST /api/v1/nlp/index/search/{project_id}` embeds the query and performs vector search.
12. `POST /api/v1/nlp/index/answer/{project_id}` retrieves the top chunks, builds a prompt, and asks the LLM for a final answer.

### Important note about the current pipeline

- There is no separate ingestion pipeline for metadata normalization, semantic chunking, hybrid retrieval, reranking, query rewriting, or citation assembly.
- The current system is a dense-retrieval RAG baseline.

## 4. Database Architecture

### PostgreSQL usage

PostgreSQL is the primary relational store and is used for:

- `projects`
- `assets`
- `chunks`
- `celery_task_executions`

These models live under:

- `src/models/db_schemes/minirag/schemes/project.py`
- `src/models/db_schemes/minirag/schemes/asset.py`
- `src/models/db_schemes/minirag/schemes/datachunk.py`
- `src/models/db_schemes/minirag/schemes/celery_task_execution.py`

### Schema summary

- `Project` has integer `project_id`, a UUID, and timestamps.
- `Asset` stores upload records, file name, file size, type, optional JSON config, and a foreign key back to `projects`.
- `DataChunk` stores chunk text, JSON metadata, ordering, and foreign keys to both `projects` and `assets`.
- `CeleryTaskExecution` stores idempotency and task-tracking data for background jobs, including task hash, Celery task ID, status, result JSON, and timestamps.

### Relationships

- `Project` -> many `Asset`
- `Project` -> many `DataChunk`
- `Asset` -> many `DataChunk`

### Migrations

- Alembic is configured for this schema set.
- Migration history currently includes the initial tables plus the `celery_task_executions` table and its later unique index update.

### Vector-store-backed tables

If `PGVECTOR` is selected, the vector store is materialized as dynamically created PostgreSQL tables rather than a fixed ORM schema.

- Table name pattern: `collection_{embedding_size}_{project_id}`
- Columns: `id`, `text`, `vector`, `metadata` JSONB, `chunk_id`
- The `chunk_id` column references `chunks.chunk_id`

This is created and managed in `src/stores/vectordb/providers/PGVectorProvider.py`.

### Database-related risks

- The project depends on a working PostgreSQL + `vector` extension path when using `PGVECTOR`.
- The current Docker stack mixes a migration-driven app startup with a copied Alembic config that is not present in the repo as a concrete file name.

## 5. API Endpoints

All exposed API routes are under the `/api/v1` prefix except the Prometheus metrics endpoint.

### Base

- `GET /api/v1/` - returns app name and version.

### Data

- `POST /api/v1/data/upload/{project_id}` - upload a file for a project.
- `POST /api/v1/data/process/{project_id}` - enqueue chunking / DB write job.
- `POST /api/v1/data/process-and-push/{project_id}` - enqueue chunking followed by vector indexing.

### NLP / RAG

- `POST /api/v1/nlp/index/push/{project_id}` - enqueue indexing of stored chunks into the vector DB.
- `GET /api/v1/nlp/index/info/{project_id}` - return vector collection info.
- `POST /api/v1/nlp/index/search/{project_id}` - semantic search over the collection.
- `POST /api/v1/nlp/index/answer/{project_id}` - full RAG answer generation.

### Observability

- `GET /TrhBVe_m5gg2002_E5VVqS` - Prometheus metrics endpoint, hidden from the OpenAPI schema.

### API request schemas

- `src/routes/schemes/data.py` defines `ProcessRequest`.
- `src/routes/schemes/nlp.py` defines `PushRequest` and `SearchRequest`.

## 6. Dependencies + Versions

The canonical dependency list is `src/requirements.txt`. Key pinned versions are:

- `fastapi==0.110.2`
- `uvicorn[standard]==0.29.0`
- `python-multipart==0.0.9`
- `python-dotenv==1.0.1`
- `pydantic-settings==2.2.1`
- `aiofiles==23.2.1`
- `langchain==0.1.20`
- `PyMuPDF==1.24.3`
- `motor==3.4.0`
- `pydantic-mongo==2.3.0`
- `openai==1.75.0`
- `cohere==5.5.8`
- `qdrant-client==1.10.1`
- `SQLAlchemy==2.0.36`
- `asyncpg==0.30.0`
- `alembic==1.14.0`
- `psycopg2==2.9.10`
- `pgvector==0.4.0`
- `nltk==3.9.1`
- `prometheus-client==0.21.1`
- `starlette-exporter==0.23.0`
- `fastapi-health==0.4.0`
- `celery==5.5.3`
- `redis==6.2.0`
- `kombu==5.5.4`
- `billiard==4.2.1`
- `vine==5.1.0`
- `flower==2.0.1`

### Container base image versions

- Application image: `ghcr.io/astral-sh/uv:0.6.14-python3.10-bookworm`
- PostgreSQL/pgvector image: `pgvector/pgvector:0.8.0-pg17`
- Qdrant: `qdrant/qdrant:v1.13.6`
- Prometheus: `prom/prometheus:v3.3.0`
- Grafana: `grafana/grafana:11.6.0-ubuntu`
- Node exporter: `prom/node-exporter:v1.9.1`
- Postgres exporter: `prometheuscommunity/postgres-exporter:v0.17.1`
- RabbitMQ: `rabbitmq:4.1.2-management-alpine`
- Redis: `redis:8.0.3-alpine`
- Nginx: `nginx:stable-alpine3.20-perl`

## 7. Current Chunking

### Implementation location

- `src/controllers/ProcessController.py`

### Current behavior

- Only `.txt` and `.pdf` files are supported for processing.
- `.txt` files are loaded with LangChain `TextLoader`.
- `.pdf` files are loaded with LangChain `PyMuPDFLoader`.
- Chunking is performed by `process_simpler_splitter()`.
- The splitter joins all page text together, splits on newline, and accumulates lines until the configured `chunk_size` is reached.
- `overlap_size` is accepted by the API and task signatures but is not used by the current splitter implementation.
- Chunk metadata is discarded in the current splitter and replaced with an empty dict.

### Implication

This is not semantic chunking yet. It is a character-threshold line accumulator.

### Historical clue

There is a commented-out reference to a more standard splitter path, which suggests the project previously intended to use LangChain document splitters more directly.

## 8. Current Retrieval

### Retrieval mode

The current retrieval path is dense vector search only.

### Retrieval flow

- Query text is embedded by the configured embedding provider.
- The query embedding is passed to the vector DB provider.
- The vector DB returns the top N records by similarity.
- Search results are returned as `RetrievedDocument` objects containing text and score.

### Where it lives

- `src/controllers/NLPController.py`
- `src/stores/vectordb/VectorDBInterface.py`
- `src/stores/vectordb/providers/QdrantDBProvider.py`
- `src/stores/vectordb/providers/PGVectorProvider.py`

### Current limitations

- No lexical/BM25 component.
- No hybrid score fusion.
- No metadata filters in the search path.
- No reranking stage.
- No query rewriting or expansion stage.
- No citations are assembled from structured source metadata.

## 9. LLM/Embedding Setup

### Provider abstraction

LLM and embedding behavior are controlled by:

- `src/stores/llm/LLMInterface.py`
- `src/stores/llm/LLMProviderFactory.py`
- `src/stores/llm/providers/OpenAIProvider.py`
- `src/stores/llm/providers/CoHereProvider.py`

### Supported backends

- `OPENAI`
- `COHERE`

### Current behavior

- The same provider instance is used both for generation and for embedding.
- The generation model ID and embedding model ID are set separately at startup.
- OpenAI generation uses `chat.completions.create`.
- OpenAI embeddings use `embeddings.create`.
- Cohere generation uses `client.chat`.
- Cohere embeddings use `client.embed`.

### Prompting

- Prompt text is assembled through `TemplateParser`.
- The RAG prompt templates live in:
  - `src/stores/llm/templates/locales/en/rag.py`
  - `src/stores/llm/templates/locales/ar/rag.py`
- The answer path currently sends:
  - one system message
  - a single user prompt containing concatenated retrieved documents plus the question

### Important behavior note

- There is no persistent conversation memory in the current LLM flow.
- The answer is generated from the retrieved context only.

## 10. Docker/Infrastructure

### Docker Compose stack

`docker/docker-compose.yml` defines:

- `fastapi`
- `celery-worker`
- `celery-beat`
- `flower`
- `nginx`
- `pgvector`
- `qdrant`
- `prometheus`
- `grafana`
- `node-exporter`
- `postgres-exporter`
- `rabbitmq`
- `redis`

### Service responsibilities

- `fastapi` serves the API.
- `celery-worker` runs background jobs.
- `celery-beat` runs the scheduled cleanup task.
- `flower` exposes task monitoring.
- `nginx` fronts the FastAPI service.
- `pgvector` is the PostgreSQL database with the vector extension.
- `qdrant` is the alternate vector DB backend.
- `prometheus` scrapes app and infra metrics.
- `grafana` visualizes metrics.
- `rabbitmq` is the Celery broker.
- `redis` is the Celery result/cache backend.
- `node-exporter` and `postgres-exporter` feed monitoring.

### Application container behavior

- The Dockerfile installs Python dependencies with `uv pip install`.
- The entrypoint runs `alembic upgrade head` before launching Uvicorn.

### Important infrastructure risk

- `docker/minirag/Dockerfile` copies `docker/minirag/alembic.ini`, but the repository only contains `docker/minirag/alembic.example.ini`.
- If that file is not created in the build context, the container build or startup path will fail.

### Monitoring details

- Prometheus middleware is installed in the FastAPI app.
- Metrics are exposed at a non-obvious endpoint path.
- `docker/prometheus/prometheus.yml` is configured to scrape the app, node exporter, Qdrant, Prometheus itself, and postgres-exporter.

## 11. Extension Points

This section identifies the best current hook points for the first implementation wave.

### Metadata + JSON

Best files:

- `src/models/db_schemes/minirag/schemes/datachunk.py`
- `src/models/db_schemes/minirag/schemes/asset.py`
- `src/controllers/ProcessController.py`
- `src/controllers/NLPController.py`
- `src/stores/vectordb/providers/PGVectorProvider.py`

Why:

- `DataChunk.chunk_metadata` and `Asset.asset_config` already exist.
- `PGVectorProvider` already stores JSONB metadata in the vector table payload.
- The chunking/indexing path is the place to preserve richer metadata end to end.

### Semantic Chunking

Best files:

- `src/controllers/ProcessController.py`
- `src/tasks/file_processing.py`

Why:

- `ProcessController.process_file_content()` is the current chunking gateway.
- Replacing `process_simpler_splitter()` with a semantic splitter will update all ingestion flows without touching the API surface.

### Hybrid Search

Best files:

- `src/controllers/NLPController.py`
- `src/stores/vectordb/VectorDBInterface.py`
- `src/stores/vectordb/providers/QdrantDBProvider.py`
- `src/stores/vectordb/providers/PGVectorProvider.py`

Why:

- Retrieval is centralized in `NLPController.search_vector_db_collection()`.
- The vector DB interface is already the abstraction layer where a lexical search path can be added.

### Reranker

Best files:

- `src/controllers/NLPController.py`
- `src/stores/llm/LLMProviderFactory.py`

Why:

- Reranking fits naturally between `search_vector_db_collection()` and prompt construction.
- If a model-backed reranker is used, the LLM factory is the correct place to instantiate it.

### Query Expansion

Best files:

- `src/controllers/NLPController.py`
- `src/stores/llm/templates/locales/en/rag.py`
- `src/stores/llm/templates/locales/ar/rag.py`

Why:

- Query expansion belongs before retrieval in `answer_rag_question()`.
- Prompt templates can be extended to support rewrite instructions or multi-query generation.

### Conversation Memory

Best files:

- `src/routes/nlp.py`
- `src/controllers/NLPController.py`
- `src/models/db_schemes/minirag/schemes/celery_task_execution.py`

Why:

- The answer endpoint is the natural API hook for conversation IDs or session IDs.
- `NLPController.answer_rag_question()` currently has no memory layer, so it is the right place to introduce one.
- A new DB table would likely be needed for durable chat history.

### Citations

Best files:

- `src/controllers/NLPController.py`
- `src/stores/vectordb/providers/PGVectorProvider.py`
- `src/stores/vectordb/providers/QdrantDBProvider.py`
- `src/models/db_schemes/minirag/schemes/datachunk.py`

Why:

- Citations require the retrieved record to carry chunk IDs, asset IDs, and probably source names or page info.
- That data must be preserved by retrieval and surfaced in the final answer payload.

### RAG Evaluation

Best files:

- `src/tasks/maintenance.py`
- `src/tasks/process_workflow.py`
- `src/controllers/NLPController.py`

Why:

- Background tasks are already established, so evaluation jobs can reuse the Celery + PostgreSQL execution pattern.
- The current answer flow is deterministic enough to benchmark with stored queries and expected answers.

### Agentic RAG

Best files:

- `src/controllers/NLPController.py`
- `src/stores/llm/`
- `src/routes/nlp.py`

Why:

- A tool-using or planning layer can be introduced at the controller level without disturbing ingestion.
- The LLM abstraction already gives a clean place to plug in additional agent models or tools.

### Multi-Agent RAG

Best files:

- `src/controllers/NLPController.py`
- `src/tasks/process_workflow.py`
- `src/stores/llm/`

Why:

- Multi-agent orchestration will likely need a coordinator above the current single-query answer flow.
- The existing Celery workflow is a natural place to run distributed agent steps if needed.

## 12. Potential Issues/Risks

### High-priority implementation risks

- `overlap_size` is accepted but not used in chunking.
- Current chunking is not semantic and discards metadata.
- Search is dense-only, so recall may be weak on lexical or exact-match queries.
- There is no citation mechanism, so answers are not source-grounded in the response payload.
- There is no conversation memory or session persistence for questions spanning multiple turns.

### Code-level risks

- `QdrantDBProvider` contains several async methods that call other async methods without `await`, which can produce incorrect truthiness checks and skipped work.
- `QdrantDBProvider.insert_one()` appears to pass `id=[record_id]` rather than a scalar ID, which may not match the expected client shape.
- The OpenAI and Cohere provider classes use mutable default arguments for `chat_history=[]`, which is a Python footgun.
- `CeleryTaskExecution.celery_task_id` is defined as UUID in the ORM, while Celery task IDs are commonly string UUIDs; that deserves care in integration.
- `ProcessController.get_file_content()` only supports `.txt` and `.pdf`.
- `DataController.validate_uploaded_file()` depends on `UploadFile.size`, which is not always the most reliable upload validation primitive.

### Infrastructure risks

- The Dockerfile references a concrete Alembic config file that is not present in the repository as named.
- The app startup path runs migrations automatically, so schema issues will block container startup.
- The stack depends on external API credentials for the chosen LLM and embedding backend.

### Observability risk

- Metrics are exposed on a hidden, non-obvious route path; that is fine for convenience but easy to miss during deployment or scraping setup.

## Recommended first files to review

Before the first implementation task, the most important files to read again are:

- `src/controllers/NLPController.py`
- `src/controllers/ProcessController.py`
- `src/tasks/file_processing.py`
- `src/tasks/data_indexing.py`
- `src/stores/vectordb/providers/PGVectorProvider.py`
- `src/stores/vectordb/providers/QdrantDBProvider.py`
- `src/stores/llm/providers/OpenAIProvider.py`
- `src/stores/llm/providers/CoHereProvider.py`
- `src/models/db_schemes/minirag/schemes/datachunk.py`
- `src/models/db_schemes/minirag/schemes/celery_task_execution.py`
- `docker/docker-compose.yml`
- `docker/minirag/Dockerfile`

