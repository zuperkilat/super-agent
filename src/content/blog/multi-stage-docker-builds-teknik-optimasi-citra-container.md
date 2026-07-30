---
title: 'Multi-Stage Docker Builds: Teknik Optimasi Citra Container'
description: 'Teknik multi-stage Docker builds untuk optimasi citra container — mengurangi size, meningkatkan security, dan mempercepat deployment.'
pubDate: '2026-07-27'
heroImage: ../../assets/blog-placeholder-19.jpg
---

Multi-stage Docker builds adalah teknik yang memisahkan proses build dan runtime ke dalam tahapan yang berbeda — setiap tahap berjalan di Docker image yang berbeda dan hanya artifact yang dibutuhkan saja yang di-copy ke final image. Hasilnya: citra container yang jauh lebih kecil, lebih aman, dan lebih cepat untuk di-deploy dan di-pull [glossary: docker-build-optimization].

Panduan ini membahas secara mendalam multi-stage build patterns, teknik optimasi citra, dan cara mengintegrasikan ini ke CI/CD pipeline.

## Masalah dengan Citra Docker Single-Stage

Sebuah Dockerfile single-stage khas untuk Node.js application mungkin terlihat seperti ini:

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Masalah dengan pendekatan ini:**
1. **Image size besar**: citra berisi build tools (npm, node_modules), build artifact (dist/), dan source code — padahal untuk running hanya dibutuhkan node_modules + dist/
2. **Security surface**: build tools (npm, compiler) membuka attack vector tambahan
3. **No reproducibility**: tidak ada explicit base version separation
4. **Slow pull**: image besar memerlukan lebih banyak bandwidth saat deploy ke cluster

## Bagaimana Multi-Stage Build Menyelesaikan Masalah

Multi-stage build memisahkan proses ke dalam beberapa "stage" — setiap stage dimulai dengan image dasar yang berbeda dan hasilnya hanya di-copy ke stage berikutnya jika diperlukan.

```dockerfile
# Stage 1: Build (dengan semua tools yang dibutuhkan untuk build)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Runtime (minimal image untuk running application)
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Perbaikan:**
- Stage 2 tidak membawa build tools, source code, atau dependency source
- Image size turun drastis (biasanya 70-90% reduction)
- Attack surface kecil (tidak ada compiler atau build tools di runtime)
- Security scanning lebih efektif (lebih sedikit packages = CVE surface lebih kecil)

## Stage Configuration Detail

### Stage Naming

Setiap stage bisa diberi name dengan `AS` keyword:
```dockerfile
FROM python:3.12 AS build
FROM node:20 AS frontend-builder
FROM node:20-alpine AS production
```

Stage names digunakan untuk merujuk stage lain dalam `COPY --from` instruction.

### Stage Dependencies

```dockerfile
# Stage 1: System dependencies (compile native modules)
FROM ubuntu:22.04 AS sysdeps
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Python build (requires sysdeps)
FROM python:3.12 AS builder
COPY --from=sysdeps /usr/bin/python3 /usr/bin/
COPY --from=sysdeps /usr/lib/python3/ /usr/lib/python3/
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN pip install --no-cache-dir .

# Stage 3: Runtime (no build tools)
FROM python:3.12-slim AS production
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin/myapp /usr/local/bin/myapp
CMD ["myapp"]
```

## Advanced Multi-Stage Patterns

### Pattern 1: Builder-Pattern untuk Compiled Languages

```dockerfile
# Stage 1: Build Go binary
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Stage 2: Minimal runtime
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/main /usr/local/bin/main
CMD ["main"]
```

**Result**: citra final < 15MB (Go binary + CA certificates) — sangat minimal.

### Pattern 2: Multi-Language Application

```dockerfile
# Stage 1: Node.js frontend build
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python backend build
FROM python:3.12-slim AS backend-builder
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

# Stage 3: Combined runtime
FROM python:3.12-slim AS production
WORKDIR /app
COPY --from=frontend-builder /app/frontend/dist ./frontend
COPY --from=backend-builder /app/backend ./backend
COPY --from=backend-builder /usr/local/lib/python3.12/site-packages ./libs
COPY entrypoint.sh .
CMD ["./entrypoint.sh"]
```

### Pattern 3: Build-Time Configuration Injection

```dockerfile
FROM node:20-alpine AS builder
ARG BUILD_VERSION
ARG BUILD_DATE
ARG GIT_COMMIT
ENV BUILD_VERSION=$BUILD_VERSION
ENV BUILD_DATE=$BUILD_DATE
ENV GIT_COMMIT=$GIT_COMMIT
COPY . .
RUN npm run build

FROM node:20-alpine AS production
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./
# Build parameters embedded in image
ENV BUILD_VERSION=${BUILD_VERSION:-unknown}
ENV BUILD_DATE=${BUILD_DATE:-unknown}
ENV GIT_COMMIT=${GIT_COMMIT:-unknown}
USER node
CMD ["node", "dist/main.js"]
```

Build command:
```bash
docker build \
  --build-arg BUILD_VERSION=v1.2.3 \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  -t myapp:v1.2.3 .
```

### Pattern 4: Development vs Production Stages

```dockerfile
# Development stage (includes debugging tools and hot reload)
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage (minimal, no dev dependencies)
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
USER node
CMD ["node", "dist/main.js"]
```

Build development: `docker build --target development -t myapp:dev .`
Build production: `docker build --target production -t myapp:prod .`

## Citra Size Optimization Techniques

### 1. Layer Optimization

Setiap `RUN`, `COPY`, dan `ADD` instruction menghasilkan Docker layer. Optimasi:

```dockerfile
# ❌ Suboptimal: setiap RUN creates layer
RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://example.com/something.tar.gz | tar xz
RUN rm -rf /var/lib/apt/lists/*

# ✅ Optimal: minimize layers
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -sL https://example.com/something.tar.gz | tar xz && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get purge -y curl && \
    apt-get autoremove -y
```

### 2. Using .dockerignore

Sama seperti .gitignore — exclude file that tidak perlu dalam build context:

```
node_modules
npm-debug.log
.git
.gitignore
*.md
.DS_Store
coverage
.nyc_output
dist
.vscode
.idea
```

### 3. Squashing Layers (Advanced)

Untuk menghasilkan citra dengan lebih sedikit layers (mengurangi size):
```bash
docker build --squash -t myapp:squashed .
```

**Note**: `--squash` experimental. Alternatif: gunakan BuildKit dengan `DOCKER_BUILDKIT=1` dan export output.

### 4. BuildKit Advanced Features

Enable BuildKit dengan `DOCKER_BUILDKIT=1`:
```bash
DOCKER_BUILDKIT=1 docker build -t myapp .
```

BuildKit menyediakan:
- `--mount=type=cache`: persistent cache untuk dependency installation
- `--secret`: secure secret mounting (no secret in image)
- `--ssh`: SSH key forwarding during build

```dockerfile
# BuildKit cache mount for npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# BuildKit secret mount (not in final image)
RUN --mount=type=secret,id=npmrc \
    npm ci
```

## Keamanan Multi-Stage Build

### 1. Build-Time vs Runtime Separation

Multi-stage build secara default memisahkan build tools (development) dari runtime — security improvement:
- Build stage (builder) memiliki compiler, package manager, source code
- Runtime stage (production) hanya memiliki application binary dan runtime dependencies
- Tidak ada source code, compiler, atau package manager di production image

### 2. Non-Root User di Setiap Stage

```dockerfile
FROM node:20-alpine AS builder
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --chown=appuser:appgroup package*.json ./
RUN npm ci && npm run build

FROM node:20-alpine AS production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
USER appuser
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 3. Scanning Results Comparison

Single-stage vs multi-stage scanning:
- Single-stage: 150+ vulnerabilities (includes build tools, development dependencies)
- Multi-stage: < 20 vulnerabilities (only runtime dependencies)
- Reduction: > 85% fewer vulnerabilities detected

## Integrasi dengan CI/CD Pipeline

### GitHub Actions with BuildKit

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: Dockerfile
    push: true
    tags: |
      ghcr.io/superkilat/myapp:${{ github.sha }}
      ghcr.io/superkilat/myapp:${{ github.ref_name }}
      ghcr.io/superkilat/myapp:latest
    platforms: linux/amd64,linux/arm64
    build-args: |
      BUILD_VERSION=${{ github.ref_name }}
      GIT_COMMIT=${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### BuildKit Cache with GitHub Actions

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build with BuildKit cache
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ghcr.io/superkilat/myapp:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
    outputs: type=image,name=ghcr.io/superkilat/myapp,push-by-digest=true
```

## Studi Kasus: Optimasi Citra Build Pipeline

**Before optimization:**
- Node.js application image size: 450MB
- Single stage, includes build tools and source code
- Build time: 3 minutes
- Vulnerabilities scanned: 120+

**After multi-stage build optimization:**
- Node.js application image size: 65MB (86% reduction)
- Two stages (builder + production)
- Runtime stage: no build tools, no source code
- Build time: 2 minutes (with BuildKit cache)
- Vulnerabilities scanned: 15

**CI/CD Impact:**
- Docker image pull time deployment dari 45s ke 12s per node
- Cluster storage requirements reduced 86%
- CI pipeline cache hit rate improved (fewer layers to rebuild)

## Pengukuran Citra Size

```bash
# History layer size (reveals largest layers)
docker image history myapp:latest

# Detailed image analysis
docker scout cves myapp:latest

# Image size breakdown
dive myapp:latest

# Compare before/after
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

## Alat Pendukung

1. **BuildKit**: default Docker build backend (modern, feature-rich)
2. **docker-slim**: analyze dan minify Docker image setelah build (`docker-slim build myapp`)
3. **dive**: tool untuk explore citra layers dan size breakdown
4. **Trivy**: vulnerability scanner untuk citra security audit
5. **docker scout**: Docker's native image analysis tool
6. **Buildx**: BuildKit CLI plugin untuk multi-platform builds

## Kesalahan Umum Multi-Stage Build

1. **COPY --from referencing wrong stage**: stage name typo atau stage tidak pernah dibuat (didefinisikan tapi tidak dieksekusi)
2. **Meng-copy build artifacts yang terlalu banyak**: hanya copy runtime artifacts (compiled binary, bundled files, production node_modules)
3. **Tidak setting USER di production stage**: running sebagai root meningkatkan security risk
4. **Tidak membersihkan artifacts dari builder stage**: build tools dan cache tidak dibutuhkan di production — hanya copy what's required
5. **Ignoring layer caching**: order RUN/COPY instructions untuk maximize cache hit rate
6. **Not using `.dockerignore`**: build context yang besar memperlambat build context transfer
7. **Multi-stage dengan base image version mismatch**: builder menggunakan `node:20-full` dan production `node:20-slim` dapat causing compatibility issues (e.g., compiled native modules)

## Best Practice Ringkasan

1. **Gunakan named stages** untuk readability dan maintainability
2. **Minimal production stage**: copy hanya apa yang dibutuhkan untuk runtime
3. **Gunakan .dockerignore** untuk exclude unnecessary files from build context
4. **Run non-root user** di production stage
5. **Setiap stage minimal base image**: Alpine atau distroless untuk production
6. **Leverage BuildKit cache mounts** untuk dependency caching
7. **Scan citra** sebelum deployment — terutama production stage citra
8. **Tag citra dengan git SHA** untuk provenance dan reproducibility

## Referensi Resmi

- [Docker Multi-Stage Builds Documentation](https://docs.docker.com/build/building/multi-stage/) — dokumentasi resmi multi-stage
- [Docker BuildKit Documentation](https://docs.docker.com/build/buildkit/) — BuildKit reference
- [Docker Best Practices Guide](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/) — complete Dockerfile best practices
- [BuildKit GitHub Repository](https://github.com/moby/buildkit) — source code
- [Docker Scout](https://docs.docker.com/scout/) — image analysis

## FAQ

**Q: Berapa pengurangan citra size dengan multi-stage build?**
A: Pengurangan 70-90% untuk majority application types. Node.js apps: dari 450MB → 65MB (86% reduction). Python apps: dari 1GB → 120MB (88% reduction). Go apps: dari 100MB → 15MB (85% reduction).

**Q: Apakah multi-stage build lebih slow dari single-stage?**
A: Tidak signifikan untuk majority cases. BuildKit caching memastikan unchanged layers tidak dibangun ulang. Multi-stage justru sering faster karena setiap stage independent dan parallelizable. Total build time typically 10-30% faster dengan BuildKit.

**Q: Apakah BuildKit adalah multi-stage build yang wajib?**
A: BuildKit (enabled dengan `DOCKER_BUILDKIT=1`) adalah rekomendasi tapi multi-stage build `FROM ... AS` syntax works without BuildKit (traditional Docker engine). BuildKit menambah fitur seperti cache mounts and secret mounts — highly recommended tapi tidak required.

**Q: Bagaimana jika aplikasi membutuhkan build tools di runtime?**
A: Tidak banyak — hampir semua cases, build tools (compiler, build system) tidak dibutuhkan untuk running compiled binary. Jika benar-benar membutuhkan (misalnya JIT compilation), gunakan builder stage tapi jangan copy entire builder stage ke production — copy hanya required runtime component.

**Q: Apakah multi-stage build compatible dengan Docker Compose?**
A: Ya, sepenuhnya. Docker Compose menggunakan Dockerfile yang sama. Multi-stage build dan Dockerfile works identical baik untuk `docker build` maupun `docker compose build`.

**Q: Berapa banyak stage yang bisa saya punya?**
A: Tidak ada limit. Multi-stage build bisa memiliki banyak stage — common pattern adalah 2-3 stage. Untuk extreme complexity, bisa 5+ stage (misalnya: system deps → frontend build → backend build → combined runtime → optimization).

**Q: Apakah multi-stage build bisa digunakan untuk non-Docker build pipeline?**
A: Multi-stage pattern concept applies to CI/CD pipeline secara umum — build environment separate dari runtime environment. Dalam CI/CD: build stage (full dependencies) → artifact storage → deploy stage (minimal runtime image). Arsitektur serupa dengan GitLab CI stages dan GitHub Actions `needs`.

## Referensi

Artikel terkait di blog ini:
- [Docker Best Practices 2026](docker-best-practices-2026-keamanan-dan-optimasi-citra.md)
- [CI/CD Pipeline dengan Docker dan Kubernetes 2026](ci-cd-pipeline-dengan-docker-dan-kubernetes-2026.md)
- [Kubernetes di Tahun 2026](kubernetes-di-tahun-2026-tren-dan-cara-implementasi.md)
- [Memahami Terraform untuk Infrastructure as Code](memahami-terraform-untuk-infrastructure-as-code-di-2026.md)

External references:
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker BuildKit](https://docs.docker.com/build/buildkit/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)