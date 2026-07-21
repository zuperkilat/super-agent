---
title: 'RAG in Production: Chunking, Embedding, Vector DB, dan Optimization'
description: 'Panduan produksi membangun Retrieval-Augmented Generation yang handal — chunking strategies, embedding selection, vector database comparison, dan cost optimization.'
pubDate: '2026-08-20'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

RAG (Retrieval-Augmented Generation) telah menjadi backbone production agentic systems. Data menunjukkan 85-90% production queries bisa dijawab via RAG — jauh lebih cepat dan murah daripada agent full loop. Namun, meluncurkan RAG ke production memerlukan pemahaman yang solid tentang chunking, embedding, vector search, dan optimization yang sering tidak tercakup di tutorial.

## RAG Architecture di Production

```
┌─────────────────────────────────────────────────────┐
│               Document Ingestion                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ PDF     │ │ Confluence│ │ Database │ ... other    │
│  │ Files   │ │ Pages     │ │ Tables   │   sources    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│       └──────────────┼──────────────┘               │
│                      ▼                              │
│           ┌────────────────────┐                    │
│           │  ETL Pipeline      │                    │
│           │  1. Extract text   │                    │
│           │  2. Clean/markdown │                    │
│           │  3. Chunk          │                    │
│           │  4. Embed          │                    │
│           │  5. Upsert to DB   │                    │
│           └──────────┬─────────┘                    │
└──────────────────────┼─────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────────┐   ┌──────────────────────┐
│   Vector Database    │   │   Metadata Store      │
│   ┌────────────────┐ │   │   ┌────────────────┐  │
│   │ Embedding Model │ │   │   │  Source docs   │  │
│   │ • HNSW index   │ │   │   │  • URLs        │  │
│   │ • IVF index    │ │   │   │  • Metadata    │  │
│   │ • Flat index   │ │   │   │  • Timestamps  │  |
│   └────────────────┘ │   │   └────────────────┘  │
└──────────────────────┘   └──────────────────────┘
                       │
                       │ Query time
                       ▼
          ┌────────────────────────┐
          │     Query Pipeline     │
          │  ┌──────────────────┐  │
          │  │ 1. Query embed   │  │
          │  │ 2. Vector search │  │
          │  │ 3. Rerank (opt)  │  │
          │  │ 4. LLM generate  │  │
          │  └──────────────────┘  │
          └────────────────────────┘
```

## Chunking Strategies

Chunking adalah langkah paling critical — chunking yang salah menghasilkan retrieval yang salah.

### Strategy 1: Fixed-Size Chunking

```python
def fixed_size_chunker(text: str, chunk_size: int = 512, overlap: int = 64):
    """Split text into fixed-size chunks with overlap."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
    return chunks

# 512 token chunks, 64 token overlap
chunks = fixed_size_chunker(document, chunk_size=512, overlap=64)
```

**Trade-offs:**
- Pro: Predictable size, fast indexing
- Con: Memotong di tengah kalimat, hilang context

**Use case**: FAQ, legal documents, API docs yang sudah di-structure.

### Strategy 2: Sentence-Based Chunking

```python
import nltk

def sentence_chunker(text: str, max_chunk_tokens: int = 256):
    """Chunk by sentences, respect sentence boundaries."""
    sentences = nltk.sent_tokenize(text)
    chunks, current_chunk = [], []
    current_tokens = 0
    
    for sentence in sentences:
        sentence_tokens = count_tokens(sentence)
        
        if current_tokens + sentence_tokens > max_chunk_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_tokens = 0
        
        current_chunk.append(sentence)
        current_tokens += sentence_tokens
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks
```

**Trade-offs:**
- Pro: Preserve sentence boundaries, easier to read
- Con: Chunk size bisa bervariasi dramatis

**Use case**: Knowledge base yang butuh readability tinggi.

### Strategy 3: Semantic Chunking (production best-practice)

```python
def semantic_chunker(text: str, embedding_model, max_tokens: int = 512):
    """Chunk by semantic boundaries — detect topic shifts."""
    sentences = sentence_split(text)
    embeddings = embedding_model.encode(sentences)
    
    # Calculate cosine similarity between adjacent sentences
    boundaries = []
    for i in range(len(embeddings) - 1):
        similarity = cosine_similarity(embeddings[i], embeddings[i+1])
        boundaries.append(similarity)
    
    # Break at low similarity (topic change)
    chunks = []
    current_chunk = []
    for i, (sentence, similarity) in enumerate(zip(sentences, boundaries)):
        current_chunk.append(sentence)
        
        if similarity < 0.5 and count_tokens(current_chunk) > max_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks
```

**Trade-offs:**
- Pro: Preserve semantic coherence — chunk hanya berisi topik yang sama
- Con: Lebih lambat, requires embedding model

### Strategy 4: Hierarchical Chunking

```python
def hierarchical_chunker(document: str):
    """Create parent-child chunk pairs."""
    # Parent chunks (broader context)
    parent_chunks = fixed_size_chunker(document, chunk_size=2048, overlap=256)
    
    # Child chunks (granular retrieval)
    child_chunks = []
    for parent in parent_chunks:
        children = sentence_chunker(parent, max_chunk_tokens=256)
        child_chunks.extend(children)
    
    return {
        "parents": parent_chunks,
        "children": child_chunks,
        "mapping": {child_id: parent_id for child_id, parent_id in ...}
    }
```

**Use case**: Large documents (technical specs, policies) — retrieve small chunk tapi bisa expand ke parent jika perlu context lebih.

## Embedding Selection

Embedding model adalah encoder yang bagi input text menjadi vector representation. Pilihan model berdampak langsung ke retrieval quality.

### Comparison Table

| Model | Dimensions | Max Tokens | Quality (MTEB) | Speed | Cost |
|--------|-----------|------------|----------------|-------|------|
| text-embedding-3-large | 3072 | 8191 | 64.6 | Medium | $0.13/1M tokens |
| text-embedding-3-small | 1536 | 8191 | 62.3 | Fast | $0.02/1M tokens |
| Cohere embed-v3 | 1024 | 512 | 64.5 | Fast | $0.10/1M tokens |
| BGE-M3 | 1024 | 8192 | 62.1 | Fast | Self-hosted |
| nomic-embed-text-v1.5 | 768 | 8192 | 60.2 | Fast | Self-hosted |

**Recommendation**:
- **Production quality**: OpenAI text-embedding-3-large atau Cohere embed-v3
- **Cost optimization**: text-embedding-3-small (turun 8x harga, sedikit quality drop)
- **Self-hosted**: BGE-M3 atau nomic-embed (free tapi butuh GPU)

### Embedding Best Practices

```python
# OpenAI embedding dengan dimension reduction
response = client.embeddings.create(
    model="text-embedding-3-small",
    input=chunks,
    encoding_format="float",
    dimensions=1536  # Explicit early truncation
)

# Reduce dimensions after embedding if needed
from sklearn.decomposition import PCA
embeddings = np.array([e.embedding for e in response.data])
pca = PCA(n_components=768)  # Compress 1536 → 768
reduced = pca.fit_transform(embeddings)
```

## Vector Database Selection

### Postgres + pgvector (untuk scale kecil-menengah)

```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(1536)
);

CREATE INDEX ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1000);
```

**Pro**: Single database, SQL support, ACID transactions.
**Con**: Scaling terbatas pada single PG instance.

### Pinecone (managed)

```python
import pinecone

pinecone.init(api_key=os.environ["PINECONE_API_KEY"])
index = pinecone.Index("my-knowledge-base")

# Upsert
index.upsert(
    vectors=[
        {"id": "chunk-1", "values": [0.1, 0.2, ...], "metadata": {"source": "docs/sales.md"}}
    ],
    namespace="production-v1"
)

# Query
results = index.query(
    vector=[0.1, 0.2, ...],
    top_k=5,
    namespace="production-v1",
    filter={"language": "id"}
)
```

**Pro**: Managed, auto-scaling, low latency P95 < 100ms.
**Con**: Vendor lock-in, cost scale non-linear.

### Weaviate (open-source, modular)

```python
import weaviate

client = weaviate.connect_to_weaviate_cloud(
    cluster_url=os.environ["WEAVIATE_URL"],
    auth_credentials=weaviate.auth.AuthApiKey(os.environ["WEAVIATE_API_KEY"])
)

# Define schema
schema = {
    "class": "Document",
    "vectorizer": "text2vec-openai",
    "properties": [
        {"name": "content", "dataType": ["text"]},
        {"name": "source", "dataType": ["string"]}
    ]
}

client.collections.create(schema)
```

**Pro**: Modular (tersedia module untuk Cohere, HuggingFace, OpenAI), open-source cloud atau self-hosted.
**Con**: Setup lebih kompleks dari Pinecone.

### Chroma (lightweight)

```python
import chromadb

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("docs")

collection.add(
    documents=["Pesanan dikirim via JNE, estimasi 3 hari"],
    metadatas=[{"source": "shipping_policy.md"}],
    ids=["chunk-shipping-1"]
)

results = collection.query(
    query_embeddings=[embed(query)],
    n_results=5
)
```

**Pro**: Minimal setup, file-based, cocok untuk prototype.
**Con**: Tidak cocok untuk production high-throughput.

## Query Pipeline: Retrieval + Reranking

Retrieval + reranking adalah standard untuk production RAG:

```python
def rag_query(question: str, top_k: int = 50, rerank_top_n: int = 5):
    # Step 1: Initial retrieval (broad)
    query_embedding = embed(question)
    initial_results = vector_db.search(
        query_embedding,
        top_k=top_k,  # Retrieve more candidates
        filter={"language": "id"}
    )
    
    # Step 2: Reranking (narrow down)
    reranked = rerank_model.rank(
        query=question,
        documents=[r["content"] for r in initial_results],
        top_n=rerank_top_n
    )
    
    # Step 3: Build context
    context = "\n\n".join([r["content"] for r in reranked[:rerank_top_n]])
    
    # Step 4: Generate
    response = llm.generate(
        system="Gunakan konteks berikut untuk menjawab pertanyaan.",
        context=context,
        question=question
    )
    
    return response
```

Reranking model (misal: Cohere Rerank, BGE-Reranker) meningkatkan accuracy retrieval 10-20% dibanding raw embedding search.

## Production Optimizations

### Optimasi 1: Hybrid Search

Gabungkan dense retrieval (embedding) dengan sparse retrieval (BM25):

```python
from langchain.retrievers import BM25Retriever, EnsembleRetriever

# Sparse retriever (keyword-based)
bm25 = BM25Retriever.from_texts(documents)

# Dense retriever (semantic)
faiss = FAISS.from_texts(documents, embedding_model)

# Hybrid: 50% dense + 50% sparse
ensemble = EnsembleRetriever(
    retrievers=[bm25, faiss.as_retriever()],
    weights=[0.5, 0.5]
)
```

**Keuntungan**: Menangkap exact match (BM25) + semantic similarity (embedding).

### Optimasi 2: Metadata Filtering

```python
# Filter sebelum vector search
results = vector_db.search(
    query_embedding,
    top_k=5,
    filter={
        "and": [
            {"source": {"$eq": "sales_policy"}},
            {"language": {"$eq": "id"}},
            {"last_updated": {"$gte": "2026-01-01"}}
        ]
    }
)
```

Metadata filtering mengurangi candidate space dan meningkatkan precision.

### Optimasi 3: Caching

```python
from diskcache import Cache

cache = Cache("rag_cache")

def cached_rag_query(question: str):
    key = f"rag:{hash(question)}"
    
    if key in cache:
        return cache[key]
    
    result = rag_query(question)
    cache[key] = result
    return result
```

## Cost Analysis

### Per-Query Cost Breakdown

```
Embedding query:      $0.00001 (text-embedding-3-small)
Vector search:        $0 (self-hosted) or $0.0001 (managed)
Reranking (optional): $0.001 (Cohere rerank)
LLM generation:       $0.01-0.10 (tergantung model + context length)
─────────────────────────────────────────────
Total per query:      $0.01-0.11
```

### Scaling Cost

| Kebutuhan | Setup | Cost/bulan |
|-----------|--------|------------|
| 100K queries/bulan | Pinecone + text-embedding-3-small + GPT-4o-mini | ~$300 |
| 1M queries/bulan | Self-hosted vector DB + local embedding + Llama 3.1 | ~$1000 (infra) + $200 (LLM) |
| 10M queries/bulan | Self-hosted cluster + optimized batching | ~$5000 (infra) + $1500 (LLM) |

## Monitoring & Observability

```python
RAG_METRICS = {
    "retrieval_latency_ms": "Waktu vector search",
    "rerank_latency_ms": "Waktu reranking (opsional)",
    "context_length": "Jumlah token context yang dikirim ke LLM",
    "retrieval_score": "Cosine similarity score dari top chunk",
    "rerank_score": "Reranking score",
    "hallucination_flag": "Apakah response mengandung info di luar context",
    "citation_accuracy": "Apakah cited chunk memang ada di context"
}
```

Log metrics ini untuk setiap query. Jika retrieval score < 0.7, pertimbangkan untuk meningkatkan top_k atau memperbaiki chunking strategy.

## Best Practice

1. **Chunking**: Mulai dari sentence-based (512 token, 64 overlap), evolution ke semantic jika quality kurang.
2. **Embedding**: Gunakan text-embedding-3-small untuk cost optimization, large untuk production quality.
3. **Vector DB**: Mulai dari Postgres+pgvector untuk MVP, migrasi ke Pinecone/Weaviate jika scale > 1M vectors.
4. **Reranking**: Wajib untuk production — minimal Cohere rerank atau BGE-Reranker.
5. **Hybrid Search**: Kombinasi BM25 + dense retrieval adalah sweet spot untuk FAQ/technical docs.
6. **Cache**: Implementasikan query-level cache untuk question yang sering diketik.
7. **Eval**: Buat golden dataset (50-100 questions + expected answers) untuk regression test retrieval quality.

## Kesalahan Umum

- Chunk terlalu kecil: hilang context, retrieval tidak relevan
- Chunk terlalu besar: burn token budget, LLM lupa informasi penting
- Tidak ada reranking: precision rendah, banyak false positives
- Metadata tidak diikutsertakan: filter tidak presisi, irrelevant chunks masuk
- Embedding model tidak cocok: domain mismatch (model trained general vs domain-specific)

## Referensi Resmi

- [LangChain RAG Tutorial](https://python.langchain.com/docs/tutorials/rag)
- [LlamaIndex RAG Guides](https://docs.llamaindex.ai/en/stable/examples/retriever/)
- [Pinecone RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Cohere Reranking](https://docs.cohere.com/docs/reranking)
- [Mistral Embedding Models](https://huggingface.co/mistralai/Mistral-embed)
- [BGE-M3: Towards a Generalist Embedding Model](https://arxiv.org/abs/2402.03216)

---

Hubungan artikel ini dengan artikel lain di blog:

- **RAG vs Agents**: lihat [RAG vs Agents](../rag-vs-agents.md) untuk trade-off antara RAG dan agentic approaches.
- **Mengoordinasikan RAG di dalam Agent**: lihat [Prompy Engineering untuk Agentic Systems](../prompt-engineering-agentic-systems.md) untuk cara merancang agent yang menggunakan RAG sebagai tool.
- **Observabilitas**: lihat [AI Engineering Observability](../ai-engineering-observability.md) untuk cara mmonitoring retrieval performance.
- **Infrastruktur Inference**: lihat [AI Infrastructure: Docker & Kubernetes untuk LLM Serving](../ai-infrastructure-docker-kubernetes-llm.md) untuk cara deploy embedding dan reranking models di container.
- **Tool Design**: lihat [Tool Design Patterns](../tool-design-patterns.md) untuk cara membungkus RAG sebagai tool yang bisa dipanggil LLM.


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
