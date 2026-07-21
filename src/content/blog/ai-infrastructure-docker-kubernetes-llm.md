---
title: 'AI Infrastructure: Docker dan Kubernetes untuk LLM Serving'
description: 'Panduan teknis deploy LLM inference di container environment — Docker image, Kubernetes deployment, autoscaling, dan observability untuk production AI.'
pubDate: '2026-08-19'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

Deploying LLMs di production mensyaratkan infrastructure yang bisa menangani variabel workload, model sizes yang besar, dan latency requirements yang ketat. Docker dan Kubernetes telah menjadi standard de-facto untuk LLM serving — memberikan isolation, reproducibility, dan scaling kontrol yang dibutuhkan enterprise.

## Why Containerization untuk LLM Serving

LLM inference memiliki karakteristik yang unique:

- **Heavy dependencies**: CUDA drivers, cuDNN, Python environments, model weights
- **Reproducibility**: Inference results bisa berubah jika environment berganti
- **Resource contention**: GPU memory terbatas — tanpa isolation, model crash
- **Scaling**: Workload LLM sangat burst; pagi hari 100 req/s, malam hari 10 req/s
- **Model versioning**: Beda model = beda image = beda behavior

Docker menyelesaikan ini dengan packaging seluruh runtime — dependencies, drivers, model files, serving code — menjadi unit yang reproducible.

## Docker Image untuk LLM Serving

### Base Image Selection

```dockerfile
# Production base (optimized)
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

# Install Python + system deps
RUN apt-get update && apt-get install -y \
    python3.11 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install vLLM (high-throughput LLM serving)
RUN pip install vllm==0.6.4.post1 \
    && pip cache purge

# Set working directory
WORKDIR /app

# Copy application code
COPY serving.py .

# Expose API port
EXPOSE 8000

# Run vLLM OpenAI-compatible server
CMD ["python", "serving.py", "--model", "meta-llama/Llama-3.1-8B-Instruct"]
```

### Optimized Image dengan Multi-Stage Build

```dockerfile
# Stage 1: Download model weights
FROM python:3.11-slim AS downloader
WORKDIR /models
RUN pip install huggingface-hub \
    && huggingface-cli download meta-llama/Llama-3.1-8B-Instruct \
       --local-dir /models/llama-3.1-8b

# Stage 2: Production serving image
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

# System dependencies
RUN apt-get update && apt-get install -y \
    python3.11 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install vLLM
RUN pip install vllm==0.6.4.post1

# Copy pre-downloaded model from stage 1
COPY --from=downloader /models/llama-3.1-8b /models/llama-3.1-8b

# Application
WORKDIR /app
COPY serving.py .

EXPOSE 8000
CMD ["vllm", "serve", "/models/llama-3.1-8b", "--host", "0.0.0.0", "--port", "8000"]
```

Multi-stage build mengurangi image size dari 50GB ke ~15GB — signifikan untuk image pull time.

## Kubernetes untuk LLM Serving

Kubernetes menyediakan orchestration, autoscaling, dan resource management untuk model serving.

### Deployment dengan GPU

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-inference-llama-8b
  namespace: ai-serving
spec:
  replicas: 2
  selector:
    matchLabels:
      app: llm-inference
      model: llama-8b
  template:
    metadata:
      labels:
        app: llm-inference
        model: llama-8b
    spec:
      # GPU node selection
      nodeSelector:
        cloud.google.com/gke-accelerator: nvidia-l4
      
      containers:
      - name: vllm
        image: gcr.io/my-project/vllm-llama-8b:v1.2.0
        ports:
        - containerPort: 8000
          name: http
        resources:
          requests:
            cpu: "4"
            memory: "32Gi"
            nvidia.com/gpu: 1
          limits:
            cpu: "8"
            memory: "64Gi"
            nvidia.com/gpu: 1
        env:
        - name: NVIDIA_VISIBLE_DEVICES
          value: "0"
        - name: CUDA_VISIBLE_DEVICES
          value: "0"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 5
```

### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llm-inference-hpa
  namespace: ai-serving
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: llm-inference-llama-8b
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: vllm_queue_size
      target:
        type: AverageValue
        averageValue: "10"
```

HPA scale berdasarkan CPU utilization dan custom metric (vLLM queue size).

### Service & Ingress

```yaml
apiVersion: v1
kind: Service
metadata:
  name: llm-inference-service
  namespace: ai-serving
spec:
  selector:
    app: llm-inference
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: llm-inference-ingress
  namespace: ai-serving
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  rules:
  - host: api.my-llm-platform.io
    http:
      paths:
      - path: /v1
        pathType: Prefix
        backend:
          service:
            name: llm-inference-service
            port:
              number: 80
```

## Observability untuk LLM Serving

Inference di production butuh visibility penuh — bukan hanya "is it running" tapi "is it performing".

### Metrics yang Perlu Ditrack

```python
import prometheus_client

# Export metrics
prometheus_client.start_http_server(9090)

# Custom metrics
REQUEST_COUNT = prometheus_client.Counter(
    'llm_requests_total',
    'Total LLM requests',
    ['model', 'status']
)

REQUEST_LATENCY = prometheus_client.Histogram(
    'llm_request_latency_seconds',
    'Request latency',
    ['model'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1, 5, 10]
)

TOKEN_COUNT = prometheus_client.Counter(
    'llm_tokens_total',
    'Total tokens processed',
    ['model', 'type']  # type: input/output
)

GPU_MEMORY = prometheus_client.Gauge(
    'llm_gpu_memory_used_bytes',
    'GPU memory used',
    ['gpu_id', 'model']
)

QUEUE_SIZE = prometheus_client.Gauge(
    'llm_queue_size',
    'Current inference queue size',
    ['model']
)
```

**Critical metrics untuk LLM:**
- Queue depth: Antrian request yang menumpuk
- Time to first token (TTFT): Waktu pertama kata keluar
- Tokens per second: Throughput aktual
- KV cache hit ratio: Efisiensi attention cache
- GPU utilization: Apakah GPU terpakai optimal
- OOM errors: Jumlah out-of-memory yang memaksa restart

### Structured Logging

```python
import structlog

logger = structlog.get_logger()

def handle_request(request):
    logger.info(
        "llm_request_started",
        model="llama-3.1-8b",
        input_tokens=count_tokens(request.prompt),
        request_id=request.id
    )
    
    try:
        response = model.generate(request.prompt)
        
        logger.info(
            "llm_request_completed",
            model="llama-3.1-8b",
            output_tokens=count_tokens(response.text),
            latency_seconds=response.latency,
            ttft_seconds=response.time_to_first_token,
            request_id=request.id
        )
        
        return response
    except Exception as e:
        logger.error(
            "llm_request_failed",
            model="llama-3.1-8b",
            error=str(e),
            error_type=type(e).__name__,
            request_id=request.id
        )
        raise
```

## VLLM untuk High-Throughput Serving

vLLM adalah production-grade LLM serving engine dengan optimasi untuk throughput tinggi:

```python
# serving.py
from vllm import LLM, SamplingParams
from prometheus_client import Counter, Histogram

# Initialize model
llm = LLM(
    model="meta-llama/Llama-3.1-8B-Instruct",
    tensor_parallel_size=2,  # Multi-GPU
    max_model_len=4096,
    gpu_memory_utilization=0.9,
    max_num_batched_tokens=4096
)

# Monitoring
REQUEST_COUNT = Counter('vllm_requests_total', ['model'])

def generate(prompts: list[str], max_tokens: int = 512) -> list[str]:
    REQUEST_COUNT.labels(model="llama-8b").inc(len(prompts))
    
    sampling_params = SamplingParams(
        temperature=0.7,
        top_p=0.95,
        max_tokens=max_tokens
    )
    
    outputs = llm.generate(prompts, sampling_params)
    
    return [output.outputs[0].text for output in outputs]
```

vLLM menggunakan PagedAttention untuk efisiensi KV cache yang dramatis — mengurangi GPU memory usage 2-4x dibanding serving tradisional.

## Cost Optimization

LLM serving mahal. Strategi optimization:

### 1. Model Quantization

```dockerfile
# INT4 quantization via AWQ/GPTQ
RUN pip install auto-gptq

# Load quantized model (4-bit, 8x smaller, minimal accuracy loss)
CMD ["python", "serving.py", 
     "--model", "TheBloke/Llama-3.1-8B-Instruct-AWQ",
     "--quantization", "awq"]
```

Hasil: 8B parameter model dari 16GB weights ke 2GB — bisa jalan di GPU entry-level (RTX 3090/4090) atau CPU inference.

### 2. Request Batching

```python
from vllm import AsyncLLM

llm = AsyncLLM(model="meta-llama/Llama-3.1-8B-Instruct")

async def batched_generate(requests: list) -> list:
    """Batch multiple prompts into single inference call."""
    prompts = [r.prompt for r in requests]
    max_tokens = [r.max_tokens for r in requests]
    
    sampling_params = [
        SamplingParams(temperature=0.7, max_tokens=mt)
        for mt in max_tokens
    ]
    
    results = await llm.generate(prompts, sampling_params)
    return [r.outputs[0].text for r in results]
```

### 3. Tiered Model Serving

```
High-value/complex requests → Llama-3.1-70B (10 req/s max)
Medium complexity → Llama-3.1-8B (100 req/s)
Simple FAQ → Fine-tuned small model or RAG (1000 req/s)
```

## Scaling Strategies

### Multi-Model Kubernetes Cluster

```yaml
# Separate node pools per model size
nodeSelector:
  model-size: large  # A100/H100 untuk 70B models
---
nodeSelector:
  model-size: medium # L4/A10 untuk 8B models  
---
nodeSelector:
  model-size: small  # CPU/entry GPU untuk embedding models
```

### Inference Gateway

```python
# FastAPI gateway untuk route requests
from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI()

BACKENDS = [
    {"url": "http://llm-70b:8000", "max_concurrent": 10, "model": "llama-70b"},
    {"url": "http://llm-8b:8000", "max_concurrent": 100, "model": "llama-8b"},
]

@app.post("/v1/chat/completions")
async def route_request(request: dict):
    # Determine model tier based on complexity
    complexity = estimate_complexity(request["messages"])
    
    if complexity > 0.7:
        backend = BACKENDS[0]  # Large model
    else:
        backend = BACKENDS[1]  # Small model
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{backend['url']}/v1/chat/completions",
            json=request,
            timeout=30.0
        )
    
    return response.json()
```

## LLM Inference di Kubernetes vs Dedicated Server

| Aspek | Kubernetes | Dedicated Server |
|-------|------------|------------------|
| Scaling | Automatic HPA | Manual |
| GPU sharing | MIG/Kubernetes device plugin | Manual |
| Rollout | Rolling update, zero downtime | Manual |
| Multi-model | Multiple namespaces/pools | Single server, manual routing |
| Observability | Built-in metrics, logs | Manual setup |
| Cost | Higher operational complexity | Higher hardware waste |

**Recommendation**: Kubernetes untuk production deployment dengan >1000 req/day. Dedicated server untuk prototyping atau very small scale.

## Production Checklist

- [ ] Image pinned to specific SHA, never `:latest`
- [ ] GPU driver versions compatible dengan CUDA
- [ ] Health checks: `/health` endpoint yang cek model loaded
- [ ] Resource requests/limits set dengan realisti
- [ ] HPA dengan custom metrics (queue size, latency)
- [ ] Prometheus + Grafana dashboards untuk inference metrics
- [ ] SLO alerts: P95 latency > 2s, queue size > 20
- [ ] Model weights signed dan verified (prevent tampering)
- [ ] Secrets management untuk API keys (never di-Dockerfile)
- [ ] Network policies: inference cluster isolate dari public internet

## Referensi Resmi

- [vLLM Documentation](https://docs.vllm.ai/)
- [NVIDIA Triton Inference Server](https://docs.nvidia.com/deeplearning/triton-inference-server/)
- [Kubernetes GPU Scheduling](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)
- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [OpenAI Models on Kubernetes](https://github.com/openai/tiktoken)

---

Hubungan artikel ini dengan artikel lain di blog:

- **Observability untuk LLM**: lihat [AI Engineering Observability](../ai-engineering-observability.md) untuk tracing dan monitoring LLM inference secara lebih luas.
- **RAG di Production**: lihat [RAG in Production](../rag-in-production.md) untuk deployment vector search di container environment.
- **Multi-Agent Orchestration**: lihat [LangGraph Agent Patterns](../langgraph-agent-patterns.md) untuk cara menjalankan agent workflows di atas infrastructure ini.
- **Tool Design**: lihat [Tool Design Patterns](../tool-design-patterns.md) untuk performance tool execution di containerized load.
- **Cost Optimization**: lihat [ROI AI Automation](../roi-ai-automation.md) untuk cost analysis LLM serving.


---

### Artikel Terkait di Blog Ini

- [RAG vs Agents: When to Use Each Pattern](./rag-vs-agents.md) — trade-off antara RAG dan agentic approach
- [LangGraph Agent Patterns](./langgraph-agent-patterns.md) — orchestration stateful agents
- [Tool Design Patterns](./tool-design-patterns.md) — cara merancang tools yang benar-benar dipakai LLM
- [Prompt Engineering untuk Agentic Systems](./prompt-engineering-agentic-systems.md) — merancang reasoning dan tool calling prompts
- [Memory Systems for Agents](./memory-systems-for-agents.md) — state management untuk conversation
- [Agent Testing dan Evaluasi](./agent-testing-evaluation.md) — testing dan grading agent behavior
- [MCP: Model Context Protocol](./mcp-model-context-protocol.md) — standar tool integration
- [Hermes Agent](./hermes-agent.md) — framework agentic production-ready
- [AI Infrastructure: Docker & Kubernetes untuk LLM Serving](./ai-infrastructure-docker-kubernetes-llm.md)
- [RAG in Production](./rag-in-production.md) — chunking, embedding, vector DB, optimization
- [Agentic AI Fundamentals](./agentic-ai-fundamentals-2026.md) — konsep dasar sistem otonom
