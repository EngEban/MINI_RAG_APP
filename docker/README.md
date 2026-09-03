# Docker Runtime

This directory contains the Docker Compose runtime for MultiRagAgent. For full setup and API usage instructions, start with the root [README.md](../README.md).

## Services

`docker-compose.yml` defines:

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

## Environment Files

Create runtime files from the examples:

```bash
cd docker/env
cp .env.example.app .env.app
cp .env.example.postgres .env.postgres
cp .env.example.rabbitmq .env.rabbitmq
cp .env.example.redis .env.redis
cp .env.example.grafana .env.grafana
cp .env.example.postgres-exporter .env.postgres-exporter
```

Create the Docker Alembic config:

```bash
cd ../minirag
cp alembic.example.ini alembic.ini
```

Add your own keys to `docker/env/.env.app`:

```text
COHERE_API_KEY="your-cohere-api-key"
GEMINI_API_KEY="your-gemini-api-key"
```

For Docker runtime, service-to-service URLs must use Docker Compose service names:

```text
POSTGRES_HOST="pgvector"
CELERY_BROKER_URL="amqp://<user>:<password>@rabbitmq:5672/<vhost>"
CELERY_RESULT_BACKEND="redis://:<password>@redis:6379/0"
```

Do not use `localhost` for RabbitMQ, Redis, PostgreSQL, or Qdrant from inside containers.

## Start

From this directory:

```bash
docker compose up --build -d
docker compose ps
```

## Access

| Service | Host URL or port |
| --- | --- |
| Nginx | `http://localhost` |
| FastAPI | `http://localhost:8000` |
| FastAPI docs | `http://localhost:8000/docs` |
| Flower | `http://localhost:5555` |
| PostgreSQL/PGVector | `localhost:5400` |
| Qdrant | `http://localhost:6333` |
| Qdrant gRPC | `localhost:6334` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3000` |
| Node exporter | `localhost:9100` |
| Postgres exporter | `localhost:9187` |
| RabbitMQ AMQP | `localhost:5672` |
| RabbitMQ management | `http://localhost:15672` |
| Redis | `localhost:6379` |

FastAPI metrics are exposed at `/TrhBVe_m5gg2002_E5VVqS`.

## Logs

```bash
docker compose logs --tail=100 fastapi
docker compose logs --tail=100 celery-worker
docker compose logs --tail=100 celery-beat
docker compose logs --tail=100 flower
docker compose logs --tail=100 pgvector rabbitmq redis
```

Check Celery:

```bash
docker compose exec celery-worker python -m celery -A celery_app inspect ping
docker compose exec celery-worker python -m celery -A celery_app inspect registered
```

Expected queues:

- `default`
- `file_processing`
- `data_indexing`

## Stop and Restart

Stop without deleting data:

```bash
docker compose stop
```

Start existing containers again:

```bash
docker compose start
```

Restart application services after environment changes:

```bash
docker compose up -d --no-deps --force-recreate fastapi celery-worker celery-beat flower
```

Rebuild after dependency or Docker image changes:

```bash
docker compose up --build -d
```

Avoid `docker compose down -v` during normal development. The `-v` flag deletes named volumes and can remove persisted database, vector, broker, cache, and monitoring data.
