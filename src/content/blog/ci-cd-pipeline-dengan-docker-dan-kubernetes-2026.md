---
title: 'CI/CD Pipeline dengan Docker dan Kubernetes 2026'
description: 'Membangun CI/CD pipeline modern dengan Docker dan Kubernetes 2026 — GitOps, ArgoCD, dan best practice deployment automation.'
pubDate: '2026-07-27'
heroImage: ../../assets/blog-placeholder-18.jpg
---

CI/CD (Continuous Integration/Continuous Deployment) pipeline merupakan tulang punggung modern software delivery. Pada tahun 2026, kombinasi Docker dan Kubernetes menjadi standard untuk containerized CI/CD pipelines yang scalable, reproducible, dan git-driven [glossary: cicd-pipeline].

Artikel ini membahas bagaimana merancang dan mengimplementasikan CI/CD pipeline dengan Docker dan Kubernetes 2026.

## Apa Itu CI/CD Pipeline?

CI/CD pipeline adalah serangkaian automated steps yang mengubah kode dari repository ke production deployment tanpa manual intervention:

### Continuous Integration (CI)
- Setiap commit/push trigger automated build dan test
- Build Docker image dari application source code
- Run unit tests, integration tests, dan lint checks
- Push image ke container registry (Docker Hub, GitHub Container Registry, or registry internal)
- Run security scanning (vulnerability scan) pada image

### Continuous Deployment (CD)
- Deploy image to target environment (staging, production)
- Run database migrations
- Run smoke tests
- Monitor deployment and rollback if necessary

## Arsitektur CI/CD Pipeline Modern 2026

```
[Developer Pushes to Git]
        ↓
[CI Trigger (GitHub Actions / GitLab CI / Flux)]
        ↓
┌─────────────────────────────────────────┐
│  CI Stage: Build & Test                │
│  ├── Checkout code                     │
│  ├── Install dependencies              │
│  ├── Lint (ESLint, Prettier)           │
│  ├── Unit tests                        │
│  ├── Build Docker image                │
│  ├── Scan image (Trivy/Snyk)           │
│  └── Push image to registry            │
└─────────────────────────────────────────┘
        ↓
[CD Stage: Deploy]
┌─────────────────────────────────────────┐
│  CD Stage: Deploy to Kubernetes        │
│  ├── Update Kubernetes manifest        │
│  ├── Apply with kubectl / Helm         │
│  ├── Wait for rollout completion       │
│  ├── Run smoke tests                   │
│  └── Notify team (Slack/Teams)         │
└─────────────────────────────────────────┘
        ↓
[Post-Deploy]
┌─────────────────────────────────────────┐
│  Monitoring & Observability            │
│  ├── Prometheus metrics                │
│  ├── Error tracking (Sentry)           │
│  └── Alert on degradation              │
└─────────────────────────────────────────┘
```

## GitHub Actions Workflow

Berikut contoh GitHub Actions workflow untuk Docker + Kubernetes deployment:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # CI Stage
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run lint
      - run: npm test
      
      - name: Build Docker image
        run: docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} .
      
      - name: Scan Docker image
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'

  # CD Stage
  deploy:
    needs: build-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Set up Kubernetes
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.28.0'
      
      - name: Configure Kubernetes
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config
      
      - name: Update deployment image
        run: |
          kubectl set image deployment/my-app \
            my-app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --namespace=production
      
      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/my-app \
            --namespace=production \
            --timeout=300s
      
      - name: Run smoke tests
        run: npm run test:smoke
      
      - name: Notify
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ Deployment to production successful: ${{ github.sha }}\"}"
```

## GitOps dengan ArgoCD

GitOps adalah methodology di mana Git repository adalah single source of truth untuk infrastructure dan application configuration. ArgoCD adalah GitOps tool yang continuously sync Kubernetes cluster state dengan Git repository.

### ArgoCD Workflow

```
[Git Repository]
  └── Kubernetes manifests (Helm charts or Kustomize)
        ↓
[ArgoCD Application]
  ├── Monitor Git repository for changes
  ├── Compare desired state (Git) with live state (cluster)
  ├── Auto-sync (or manual approval)
  └── Apply changes to Kubernetes cluster
        ↓
[Kubernetes Cluster]
  ├── Pods updated with new image/configuration
  ├── Health monitoring (ArgoCD application health)
  └── Rollback via Git revert
```

### ArgoCD Application Configuration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/superkilat/k8s-manifests
    targetRevision: main
    path: environments/production
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=false
      - RespectIgnoreDifferences=true
```

## Docker Images dalam CI/CD Context

### Multi-Stage Builds (Revisited)

CI/CD pipeline memanfaatkan multi-stage Docker builds untuk optimized images:

```dockerfile
from node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

from node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Cache Layer Optimization

Optimasi build speed:
```yaml
# GitHub Actions Docker build with cache
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ghcr.io/superkilat/my-app:latest
    cache-from: type=registry,ref=ghcr.io/superkilat/my-app:buildcache
    cache-to: type=registry,ref=ghcr.io/superkilat/my-app:buildcache,mode=max
```

## Helm Charts vs Kustomize

### Helm (Package Manager)

Helm adalah package manager untuk Kubernetes — chart adalah template for Kubernetes manifests.

```yaml
# chart/values.yaml
replicaCount: 3
image:
  repository: ghcr.io/superkilat/my-app
  tag: latest
  pullPolicy: IfNotPresent
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### Kustomize (Native Kubernetes)

Kustomize adalah konfiguration overlay tool bundled with kubectl — overlays dan patches tanpa templates.

```
base/
├── deployment.yaml
├── service.yaml
└── kustomization.yaml
overlay/
└── production/
    ├── replicas-patch.yaml
    └── kustomization.yaml
```

### Pilihan Helm vs Kustomize 2026

| Aspek | Helm | Kustomize |
|-------|------|-----------|
| **Template engine** | Go templates (powerful) | No templates (patches only) |
| **Package management** | Chart repositories | Overlay directories |
| **Learning curve** | Medium (Go template syntax) | Low (YAML patches) |
| **Reusability** | High (parameterized charts) | Medium (reusable bases) |
| **Secrets management** | Sealed Secrets, Helm Secrets | External (Sealed Secrets, SOPS) |
| **Adoption** | Most widely used, Helm Hub | Bundled with kubectl |
| **GitOps friendly** | Yes (with helm-values diff) | Yes (pure YAML diff) |

Rekomendasi 2026: Helm untuk applications dengan complex configuration; Kustomize untuk simpler configurations dan GitOps workflow [glossary: helm-kustomize].

## Keamanan CI/CD Pipeline

### 1. Image Scanning

```yaml
# Trivy scanning dalam pipeline
- name: Scan with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'

- name: Upload Trivy to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy-results.sarif'
```

### 2. Image Signing

```bash
# Cosign (Sigstore) for image signing
cosign sign --key cosign.key ghcr.io/superkilat/my-app:${{ github.sha }}

# Verify in Kubernetes
cosign verify ghcr.io/superkilat/my-app:latest --key cosign.pub
```

### 3. Supply Chain Security

- Signed commits (GPG/SSH signing)
- Signed Docker images (Cosign/Notary)
- SBOM (Software Bill of Materials) generation (Syft)
- SLSA provenance attestation

### 4. RBAC and Access Control

- GitHub Actions with OIDC federation (no long-lived secrets)
- Kubernetes RBAC dengan least-privilege principles
- Service Accounts dengan hanya permission yang diperlukan
- ClusterRoles dan RoleBindings yang specific ke namespace

## Observability dalam CI/CD Pipeline

1. **Build metrics**: build time, cache hit rate, image size
2. **Deployment metrics**: deployment frequency, lead time for changes, change failure rate
3. **Post-deployment metrics**: error rate, latency, uptime
4. **Security metrics**: vulnerabilities per image, critical vulnerabilities
5. **Cost metrics**: build minutes, registry storage, compute cost

Dashboard dengan:
- Grafana/Prometheus untuk deployment metrics
- GitHub Actions/ArgoCD UI untuk pipeline visibility
- Snyk/Dependabot untuk vulnerability tracking

## Studi Kasus: CI/CD Pipeline for Astro + n8n on Kubernetes

Sebuah agency mengoperasikan:
- Customer-facing Astro static site
- Internal n8n workflow automation server
- Data processing workers

**Pipeline:**
1. Git push ke `main` → triggers GitHub Actions workflow
2. Astro build → static HTML uploaded to Cloudflare Pages via R2
3. n8n Docker image built → pushed to registry → deployed to Kubernetes
4. n8n update rolling restart dengan zero downtime
5. Database migrations applied (separate job)
6. Smoke tests → if pass → notify team via Slack
7. ArgoCD monitored and auto-sync

**Result:** deployment dari commit to production dalam < 10 minutes (Astro) dan < 5 minutes (n8n). Zero failed deployments in 3 months.

## Best Practice CI/CD 2026

1. **Implement GitOps**: ArgoCD atau Flux sebagai single source of truth — semua changes via Git
2. **Container image scanning**: every image scanned for vulnerabilities before deployment (Trivy, Snyk)
3. **Signed images**: cosign/Notary image signing with verification in Kubernetes
4. **Immutable tags**: use git SHA as image tag (`my-app:abc123`) — never deploy `:latest`
5. **Rollback strategy**: Kubernetes native rollback (`kubectl rollout undo`) dan ArgoCD `Sync Revert`
6. **Environment promotion**: build once, promote same image through dev → staging → prod.
7. **Secret management**: external secrets (external-secrets-operator atau Sealed Secrets) — tidak hardcoded di manifest
8. **Ephemeral environments**: per-PR staging environment via ArgoCD ApplicationSet
9. **Cost control**: resource quotas pada namespace, HPA (Horizontal Pod Autoscaler) untuk autoscaling
10. **Observability**: monitor pipeline health and deployment metrics dengan Grafana dashboards

## Kesalahan Umum

1. **Deploying `:latest` tag**: non-immutable, tidak reproducible — selalu use git SHA
2. **No rollback mechanism**: tanpa rollback capability, failed deployment sulit di-recover
3. **Tidak ada smoke tests**: deployment tanpa validation = potentially broken production
4. **Overprivileged service accounts K8s**: service account dengan cluster-admin permissions = security risk besar
5. **Ignoring cache invalidation**: CI pipeline cache tanpa invalidation strategy → build inconsistency
6. **Tidak ada branch protection**: main branch tanpa required review + CI checks → regression risk
7. **Hardcoded image pull policy `Always`**: increase unnecessary pull time — use `IfNotPresent` dengan proper tag strategy

## Referensi Resmi

- [GitHub Actions Documentation](https://docs.github.com/en/actions) — CI/CD platform
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/) — GitOps tool
- [Helm Documentation](https://helm.sh/docs/) — Kubernetes package manager
- [Kustomize Documentation](https://kustomize.io/) — YAML overlays (bundled with kubectl)
- [Trivy](https://github.com/aquasecurity/trivy) — container image and filesystem scanner
- [Cosign (Sigstore)](https://cosign.sigstore.dev/) — container image signing

## FAQ

**Q: Berapa lama setup CI/CD pipeline untuk Docker+Kubernetes project?**
A: Setup basic GitHub Actions workflow: 1-2 hari. Full GitOps implementation dengan ArgoCD: 1-2 minggu.

**Q: Apakah ArgoCD atau Flux lebih baik?**
A: Keduanya excellent. ArgoCD lebih user-friendly dengan visual dashboard dan sync status. Flux lebih GitOps-native (uses Flux Custom Resources). Pilihan tergantung preference dan team experience. Lihat [Kubernetes 2026 tren](kubernetes-di-tahun-2026-tren-dan-cara-implementasi.md) untuk perbandingan tool.

**Q: Apakah CI/CD pipeline bisa digunakan untuk deploy ke managed K8s service (EKS, GKE, AKS)?**
A: Ya. GitHub Actions workflow menggunakan `kubectl` atau `helm` untuk deploy ke managed K8s clusters. ArgoCD di-deploy di cluster sebagai ArgoCD Application Set.

**Q: Bagaimana menangani Kubernetes secret management dalam CI/CD pipeline?**
A: Gunakan external-secrets-operator + AWS Secrets Manager / HashiCorp Vault / Sealed Secrets (encrypted in Git, decrypted in cluster).

**Q: Bagaimana cara mengimplementasikan environment promotion (dev → staging → prod)?**
A: Bangun pipeline dengan sequential jobs: build di dev, promote image to staging, run integration tests, approve promotion, deploy to production.

**Q: Apakah CI/CD pipeline hanya untuk Kubernetes?**
A: Tidak. Pipeline bisa digunakan untuk deploy ke VM (bare metal/Cloud), PaaS (Vercel/Netlify), atau serverless (Cloudflare Workers). Docker image building reusable di semua platform.

## Referensi

Artikel terkait di blog ini:
- [Docker Best Practices 2026](docker-best-practices-2026-keamanan-dan-optimasi-citra.md)
- [Kubernetes di Tahun 2026](kubernetes-di-tahun-2026-tren-dan-cara-implementasi.md)
- [Multi-Stage Docker Builds](multi-stage-docker-builds-teknik-optimasi-citra-container.md)
- [Memahami Terraform untuk Infrastructure as Code](memahami-terraform-untuk-infrastructure-as-code-di-2026.md)
- [Deploy Aplikasi Astro ke Cloudflare Pages](cara-deploy-aplikasi-astro-ke-cloudflare-pages.md)

External references:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Helm Documentation](https://helm.sh/docs/)
- [Kustomize Documentation](https://kustomize.io/)