# Media Platform

A multi-service media platform for managing and discovering programs and episodes. It is composed of two backend services backed by PostgreSQL, Elasticsearch, and Redis.

---

## Table of Contents

- [Services](#services)
  - [CMS Service](#cms-service)
  - [Discovery Service](#discovery-service)
- [Infrastructure](#infrastructure)
- [Folder Structure](#folder-structure)
- [Running with Docker](#running-with-docker)
- [Running Locally](#running-locally)

---

## Services

### CMS Service

> `cms/` — NestJS (TypeScript) · Port `3000`

The CMS is an internal API for managing all media content. It handles the full content lifecycle:

- **Programs & Episodes** — CRUD operations for programs and their episodes.
- **Storage** — Generates pre-signed S3 URLs for direct client uploads and processes uploaded video files via a background queue.
- **Import** — Imports content from external sources (YouTube playlist import via the YouTube Data API v3). Additional providers can be added by implementing the `ContentProvider` interface under `src/import/providers/`.
- **Search Indexing** — Listens to content events and keeps the Elasticsearch index in sync whenever programs or episodes are created, updated, or deleted.
- **Scheduled Publication** — A background scheduler automatically publishes episodes at their configured publication date.

**Environment variables (`cms/.env`)**

| Variable | Description |
|---|---|
| `NODE_ENV` | Node environment (`development` / `production`) |
| `PORT` | HTTP server port (default: `3000`) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default: `5432`) |
| `DB_NAME` | Database name |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `OS_ENDPOINT` | OpenSearch endpoint URL (include `https://`) |
| `SQS_QUEUE_URL` | Full SQS queue URL for the upload processing worker |
| `S3_BUCKET` | S3 bucket name for video uploads |
| `AWS_REGION` | AWS region |
| `AWS_ACCESS_KEY_ID` | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key |
| `AWS_CLOUDFRONT_DOMAIN` | CloudFront domain used to build public video URLs |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key (required for playlist import) |
| `JWT_SECRET` | Secret used to sign access JWTs (required for CMS auth; access tokens expire in 15m) |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens (refresh tokens expire in 7d) |

---

### Discovery Service

> `discovery/` — Go (Gin) · Port `8080`

The Discovery service is the public-facing, read-only API for end users. It is optimized for scale through response caching:

- **Search** — `GET /search` — Unified full-text search across programs and episodes with filters and pagination, backed by Elasticsearch.
- **Program detail** — `GET /programs/:id` — Returns full program details with a paginated list of its episodes.
- **Episode detail** — `GET /episodes/:id` — Returns episode details including a summary of its parent program.
- **Swagger UI** — Available at `GET /swagger/index.html`.

Responses are cached in Redis with a short TTL to reduce load on Elasticsearch at scale.

**Environment variables**

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP server port |
| `OS_ENDPOINT` | `http://localhost:9200` | OpenSearch endpoint URL (include `https://`) |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | _(empty)_ | Redis password |
| `REDIS_TLS` | `false` | Enable TLS for Redis (`true`/`false`) |
| `AWS_REGION` | `us-east-1` | AWS region |

---

## Infrastructure

| Service | Image | Port | Purpose |
|---|---|---|---|
| PostgreSQL | `postgres:18-alpine` | `5432` | Primary database |
| Redis | `redis:alpine` | `6379` | Response cache for Discovery |
| Elasticsearch | `elasticsearch:9.3.0` | `9200` | Full-text search index |

---

## Folder Structure

```
media-platform/
├── docker-compose.yml          # Orchestrates all services and infrastructure
├── cms/                        # CMS service (NestJS / TypeScript)
│   ├── Dockerfile
│   ├── drizzle.config.ts       # Drizzle ORM migration config
│   ├── drizzle/                # SQL migration files
│   └── src/
│       ├── app.module.ts
│       ├── main.ts
│       ├── common/             # Shared enums, events, and pagination helpers
│       ├── database/           # Drizzle database module and schema
│       ├── episodes/           # Episode CRUD, publication logic, upload listener
│       ├── import/             # Content import (YouTube provider)
│       ├── programs/           # Program CRUD
│       ├── scheduler/          # Scheduled publication service
│       ├── search/             # Elasticsearch indexing listeners
│       └── storage/            # S3 signed URL generation and upload queue
└── discovery/                  # Discovery service (Go / Gin)
    ├── Dockerfile
    ├── go.mod
    ├── cmd/api/
    │   └── main.go             # Entry point
    ├── docs/                   # Auto-generated Swagger docs
    └── internal/
        ├── cache/              # Redis client
        ├── config/             # Environment config loader
        ├── handler/            # HTTP handlers
        ├── model/              # Domain models
        ├── port/               # Interface definitions
        ├── service/            # Business logic
        └── store/              # Elasticsearch store
```

---

## Running with Docker

The easiest way to run the full platform. Docker and Docker Compose are the only prerequisites.

```bash
# Build and start all services
docker compose up --build

# Start in the background
docker compose up --build -d

# Stop all services
docker compose down

# Stop and remove volumes (wipes all data)
docker compose down -v
```

Once running, the services are available at:

| Service | URL |
|---|---|
| CMS API | http://localhost:3000 |
| CMS Swagger | http://localhost:3000/api/docs |
| Discovery API | http://localhost:8080 |
| Discovery Swagger | http://localhost:8080/swagger/index.html |
| Elasticsearch | http://localhost:9200 |

---

## Running Locally

Run the infrastructure dependencies via Docker and each service directly on your machine.

### 1. Start infrastructure

```bash
docker compose up postgres redis elasticsearch -d
```

### 2. CMS Service

**Prerequisites:** Node.js 22+

```bash
cd cms

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env   # then fill in YOUTUBE_API_KEY if needed

# Run database migrations
npx drizzle-kit migrate

# Seed the demo account (demo@example.com / demo)
npm run seed

# Start in development (watch) mode
npm run start:dev

# Or build and start in production mode
npm run build
npm run start:prod
```

The CMS API will be available at http://localhost:3000.  
Swagger UI: http://localhost:3000/api/docs

### 3. Discovery Service

**Prerequisites:** Go 1.25+

```bash
cd discovery

# Download dependencies
go mod download

# Run the service
go run ./cmd/api/main.go

# Or build and run the binary
go build -o discovery ./cmd/api/main.go
./discovery
```

The Discovery API will be available at http://localhost:8080.  
Swagger UI: http://localhost:8080/swagger/index.html
