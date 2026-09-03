# Task 2.1 Smoke Test: Metadata Preservation

Test date: 2026-08-30

## 1. Environment Status

Overall environment status: partially available, but blocked for a true end-to-end runtime smoke test.

- Repository-local virtual environment exists at `C:\MultiRagAgent\venv`.
- Direct venv Python execution failed because `venv\pyvenv.cfg` points to a missing interpreter:
  - `C:\Users\HP\AppData\Local\Programs\Python\Python312\python.exe`
- Workaround used for verification: bundled Codex Python plus existing project venv `site-packages` through `PYTHONPATH`.
- Required project dependencies imported successfully through that workaround.
- PostgreSQL/pgvector port check passed on `localhost:5400`.
- Redis port check passed on `localhost:6379`.
- RabbitMQ/Celery broker port check failed on `localhost:5672`.
- Docker CLI is not available in this shell, so container status could not be inspected with `docker ps`.
- `localhost:8000` is running a FastAPI app, but it is not the mini-rag app. Its OpenAPI schema exposes `/predict`, `/api/model/status`, and `/`, not the mini-rag routes.
- The PostgreSQL database `minirag` is reachable, but the `public` schema contains no tables.
- The PostgreSQL `vector` extension is not currently installed; only `plpgsql` is present.
- The local path `C:\MultiRagAgent\src\assets\files` exists as a zero-byte file, not a directory. This blocks the normal `ProjectController` file-storage path.

Dependency versions verified from the existing environment package set:

```text
fastapi=0.110.2
uvicorn=0.29.0
python-multipart=0.0.9
python-dotenv=1.0.1
pydantic-settings=2.2.1
aiofiles=23.2.1
langchain=0.1.20
PyMuPDF=1.24.3
motor=3.4.0
pydantic-mongo=2.3.0
openai=1.75.0
cohere=5.5.8
qdrant-client=1.10.1
SQLAlchemy=2.0.36
asyncpg=0.30.0
alembic=1.14.0
psycopg2=2.9.10
pgvector=0.4.0
nltk=3.9.1
celery=5.5.3
redis=6.2.0
flower=2.0.1
```

## 2. TXT Test Result

Status: PASS for local loader/chunker metadata preservation.

Because the normal runtime storage path is blocked by `src/assets/files` being a file, the TXT smoke input was created under:

```text
C:\Users\HP\AppData\Local\Temp\minirag_task2_smoke\task2_metadata_smoke.txt
```

The test used `TextLoader`, `ProcessController.normalize_document_metadata()`, and `ProcessController.process_file_content()` with the existing simple chunking strategy.

Observed TXT result:

```json
{
  "document_count": 1,
  "chunk_count": 2,
  "all_metadata_non_empty": true,
  "required_keys_present": true,
  "first_chunk_metadata": {
    "source": "task2_metadata_smoke.txt",
    "filename": "task2_metadata_smoke.txt",
    "filepath": "C:\\Users\\HP\\AppData\\Local\\Temp\\minirag_task2_smoke\\task2_metadata_smoke.txt",
    "file_type": "txt",
    "page": 1,
    "page_number": 1,
    "chunk_index": 0,
    "total_chunks": 2
  }
}
```

The required metadata fields were present on every generated TXT chunk:

- `source`
- `filename`
- `file_type`
- `chunk_index`
- `total_chunks`

## 3. PDF Test Result

Status: PASS for local PDF loader/chunker metadata preservation.

The PDF smoke input was generated with the already-available `reportlab` package under:

```text
C:\Users\HP\AppData\Local\Temp\minirag_task2_smoke\task2_metadata_smoke.pdf
```

The test used `PyMuPDFLoader`, `ProcessController.normalize_document_metadata()`, and `ProcessController.process_file_content()`.

Observed PDF result:

```json
{
  "document_count": 1,
  "chunk_count": 2,
  "all_metadata_non_empty": true,
  "required_keys_present": true,
  "first_chunk_metadata": {
    "source": "task2_metadata_smoke.pdf",
    "filename": "task2_metadata_smoke.pdf",
    "filepath": "C:\\Users\\HP\\AppData\\Local\\Temp\\minirag_task2_smoke\\task2_metadata_smoke.pdf",
    "file_type": "pdf",
    "page": 1,
    "page_number": 1,
    "chunk_index": 0,
    "total_chunks": 2
  }
}
```

PDF page metadata was available from the parser and was normalized to:

```json
{
  "page": 1,
  "page_number": 1
}
```

## 4. Database Verification Result

Status: BLOCKED.

PostgreSQL is reachable on `localhost:5400`, but the target `minirag` database currently has no application tables:

```json
{
  "tables": [],
  "extensions": ["plpgsql"]
}
```

Because the existing `projects`, `assets`, and `chunks` tables are absent, `DataChunk.chunk_metadata` could not be verified through a real insert/query without running migrations or creating schema. The task constraints explicitly prohibit running migrations or creating database schemas.

## 5. Retrieval Verification Result

Status: BLOCKED.

Retrieval could not be verified end to end because:

- The PostgreSQL application schema is missing.
- The `vector` extension is not installed.
- No existing pgvector collection table exists for the project.
- The currently running API on `localhost:8000` is not the mini-rag FastAPI app.
- RabbitMQ on `localhost:5672` is unavailable, so the Celery ingestion workflow cannot be queued normally.

The code path for `PGVectorProvider.search_by_vector()` was inspected previously during Task 2 and is designed to return `RetrievedDocument.metadata`, but the runtime DB state prevents an actual vector retrieval test in this environment.

## 6. Exact Commands/Tests Executed

Checked repository and environment:

```powershell
Get-ChildItem -Force
Get-ChildItem -Force src
Get-ChildItem -Force -Directory | Where-Object { $_.Name -match 'venv|env|\.venv' }
rg --files -g "pyvenv.cfg" -g ".env*" -g "*.ini"
Get-Content venv\pyvenv.cfg
venv\Scripts\python.exe --version
```

Checked dependency availability:

```powershell
$env:PYTHONPATH='C:\MultiRagAgent\venv\Lib\site-packages;C:\MultiRagAgent\src'
C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -c "import fastapi, sqlalchemy, asyncpg, langchain, fitz, openai, cohere, celery, redis; print('imports-ok')"
```

Checked dependency versions:

```powershell
$env:PYTHONPATH='C:\MultiRagAgent\venv\Lib\site-packages;C:\MultiRagAgent\src'
C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -c "from importlib.metadata import version; pkgs=['fastapi','uvicorn','python-multipart','python-dotenv','pydantic-settings','aiofiles','langchain','PyMuPDF','motor','pydantic-mongo','openai','cohere','qdrant-client','SQLAlchemy','asyncpg','alembic','psycopg2','pgvector','nltk','celery','redis','flower']; print({p: version(p) for p in pkgs})"
```

Checked running services:

```powershell
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
Test-NetConnection -ComputerName localhost -Port 5400
Test-NetConnection -ComputerName localhost -Port 6379
Test-NetConnection -ComputerName localhost -Port 5672
Test-NetConnection -ComputerName localhost -Port 8000
Invoke-RestMethod -Uri http://localhost:8000/openapi.json -Method Get -TimeoutSec 15
```

Checked PostgreSQL state:

```powershell
$env:PYTHONPATH='C:\MultiRagAgent\venv\Lib\site-packages;C:\MultiRagAgent\src'
C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe $env:TEMP\minirag_db_check.py
```

Ran targeted TXT/PDF loader and chunker smoke test:

```powershell
$env:PYTHONPATH='C:\MultiRagAgent\venv\Lib\site-packages;C:\MultiRagAgent\src'
C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe $env:TEMP\minirag_task2_targeted_smoke.py
```

## 7. Errors Encountered

### Broken repository venv launcher

```text
Unable to create process using '"C:\Users\HP\AppData\Local\Programs\Python\Python312\python.exe" --version'
```

### Docker CLI unavailable

```text
docker: The term 'docker' is not recognized as a name of a cmdlet, function, script file, or executable program.
```

### FastAPI app mismatch on port 8000

Observed OpenAPI paths:

```json
{
  "/predict": {},
  "/api/model/status": {},
  "/": {}
}
```

Expected mini-rag routes such as `/api/v1/data/upload/{project_id}` and `/api/v1/nlp/index/search/{project_id}` were not present.

### RabbitMQ unavailable

```text
localhost:5672 TcpTestSucceeded=False
```

### PostgreSQL schema missing

```json
{
  "tables": [],
  "extensions": ["plpgsql"]
}
```

### Local file storage path mismatch

```text
C:\MultiRagAgent\src\assets\files
Mode: -a---
Length: 0
```

`ProjectController` expects `src/assets/files` to be a directory.

## 8. Final PASS / FAIL Status

Final status: FAIL for the full required end-to-end runtime smoke test.

Reason: The environment cannot currently execute the complete mini-rag runtime flow because the local venv launcher is broken, the running FastAPI app is not mini-rag, RabbitMQ is unavailable, the PostgreSQL database has no mini-rag tables, the `vector` extension is missing, and the expected local asset storage path is a file rather than a directory.

Partial result: PASS for the metadata preservation code path that could be tested locally. TXT and PDF loader/chunker verification confirmed non-empty chunk metadata with `source`, `filename`, `file_type`, `page`, `page_number`, `chunk_index`, and `total_chunks`.

