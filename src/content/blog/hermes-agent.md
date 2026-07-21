---
title: 'Hermes Agent: Open-Source Framework untuk AI Agent Autonomus'
description: 'Panduan lengkap Hermes Agent dari Nous Research — arsitektur, skill authoring, plugin system, dan production deployment.'
pubDate: '2026-08-18'
heroImage: '../../assets/blog-placeholder-2.jpg'
---

Hermes Agent adalah open-source framework untuk building dan deploying autonomous AI agents. Dikembangkan oleh Nous Research, Hermes dirancang untuk mengatasi gap antara LLM yang canggih dan kebutuhan produksi yang严格要求 — observability, determinism, tool integration, dan cost control.

## Apa yang Membuat Hermes Berbeda

Hermes bukan wrapper LLM biasa. Ia menyediakan:

1. **Agent Runtime**: Execution environment yang menjalankan reasoning loop dengan observability penuh
2. **Skill System**: Modular units of capability — bisa dideploy, diupdate, di-reuse
3. **Plugin Architecture**: Extensible tool system dengan isolation
4. **Memory Layer**: Conversation state persistence dengan TTL management
5. **Context Management**: Automatic context windowing untuk prevent token overflow
6. **Human-in-the-Loop**: First-class support untuk approval gates dan handoff

## Arsitektur Hermes

```
┌─────────────────────────────────────────────────┐
│                   Hermes CLI                     │
│              (hermes config, hermes tools)       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│               Hermes Runtime                     │
│  ┌──────────────────────────────────────────┐   │
│  │          Agent Orchestrator               │   │
│  │  ┌─────────────┐  ┌──────────────────┐  │   │
│  │  │ Agent Loop   │  │ State Machine    │  │   │
│  │  │ - Reasoning  │  │ - Transitions    │  │   │
│  │  │ - Tool exec  │  │ - Retry logic    │  │   │
│  │  └─────────────┘  └──────────────────┘  │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │           Context Layer                  │   │
│  │  - Prompt assembly                       │   │
│  │  - Token management                      │   │
│  │  - History pruning                       │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │           Memory Layer                   │   │
│  │  - Short-term (Redis / session)          │   │
│  │  - Long-term (Vector DB)                 │   │
│  │  - Semantic search                       │   │
│  └──────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
┌──────────────────┐  ┌──────────────────────────────┐
│  Skills / Tools  │  │  Plugins                     │
│                  │  │  - Custom extensions         │
│  • Search        │  │  - API wrappers              │
│  • Compute       │  │  - Data connectors           │
│  • Memory        │  │  - Event handlers            │
│  • Integration   │  │                              │
└──────────────────┘  └──────────────────────────────┘
```

## Core Concepts

### Agent Runtime

Runtime adalah mesin yang menjalankan agent loop. Setiap agent memiliki lifecycle:

```python
from hermes_agent.runtime import AgentRuntime, RunConfig

runtime = AgentRuntime(
    model="anthropic/claude-3-5-sonnet",
    skills=["search", "database", "email"],
    memory={"backend": "redis", "ttl": 86400}
)

config = RunConfig(
    max_iterations=10,        # Prevent infinite loops
    timeout_seconds=30,        # Hard timeout
    tool_timeout=5,           # Per-tool timeout
    human_handoff_threshold=3 # Handoff after 3 failures
)

result = runtime.run(
    goal="Find all orders from last week and flag for delivery review",
    context={"user_id": "user_123"}
)
```

Runtime menangani:
- **Reasoning loop**: Iterasi antara LLM reasoning dan tool execution
- **State persistence**: Simpan state agent setelah setiap step
- **Error recovery**: Retry tools yang gagal, fallback ke alternative
- **Resource management**: Token counting, approximation cost tracking

### Skills

Skills adalah **modular capabilities** yang bisa di-attach ke agent. Mirip dengan methods di class — tapi bisa di-deploy independen:

```python
from hermes_agent.skills import BaseSkill, skill

@skill(
    name="order_lookup",
    description="Retrieve order details by ID or customer attributes",
    version="1.2.0"
)
class OrderLookupSkill(BaseSkill):
    """Skill untuk lookup order status dan details."""
    
    def tools(self):
        return [
            self.lookup_by_id,
            self.lookup_by_customer,
            self.recent_orders
        ]
    
    def lookup_by_id(self, order_id: str) -> dict:
        """Lookup single order by ID."""
        return db.orders.find_one({"id": order_id})
    
    def lookup_by_customer(self, phone: str, days: int = 30) -> list:
        """Get recent orders for customer."""
        since = datetime.now() - timedelta(days=days)
        return db.orders.find({
            "customer_phone": phone,
            "created_at": {"$gte": since.isoformat()}
        }).to_list()
```

Skills bisa di-share antar agent dan di-deploy secara terpisah dari agent core.

### Plugins

Plugin adalah **extensions untuk Hermes core** — bisa menambahkan fitur baru ke runtime:

```
Plugin types:
- Tool plugins (add new tool types)
- Model plugins (custom LLM providers)
- Storage plugins (alternate memory backends)
- Monitoring plugins (custom metrics)
- Auth plugins (SSO, OAuth integration)
```

### Memory

Hermes memory system abstrak storage ke belakang layar:

```python
from hermes_agent.memory import Memory

memory = Memory(
    backend="redis",
    ttl=86400,  # 24 hours
    max_history=20,
    summarize_after=10  # Summarize when history > 10
)

# Store interaction
memory.store("user_123", {
    "role": "user",
    "content": "Lacak pesanan TRX-123",
    "timestamp": datetime.utcnow().isoformat()
})

# Retrieve with summarization
history = memory.retrieve("user_123", limit=20)
```

**Auto-summarization**: Ketika history mencapai threshold, Hermes otomatis meringkas percakapan lama ke dalam 200-300 token summary, menyimpan token untuk reasoning yang lebih penting.

### Human-in-the-Loop

Hermes mendukung human handoff secara native:

```python
from hermes_agent.handoff import HandoffTrigger, HumanAgentPool

handoff_pool = HumanAgentPool()

@HandoffTrigger.when("frustration_detected")
async def handle_frustrated(customer_message: str, context: dict):
    """Trigger handoff when customer frustration detected."""
    return handoff_pool.assign(
        reason="Customer frustration detected",
        context=context,
        priority="high"
    )

@HandoffTrigger.when("keyword_match", keywords=["keluhan", "complain", "lawyer"])
async def handle_keyword(customer_message: str, context: dict):
    """Trigger handoff on specific keywords."""
    return handoff_pool.assign(
        reason="Customer mentioned complaint/legal",
        context=context,
        priority="medium"
    )
```

## Konfigurasi Hermes

```yaml
# hermes.config.yaml
version: "2.0"

model:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  max_tokens: 4096
  temperature: 0.7
  
agent:
  max_iterations: 15
  timeout_seconds: 60
  tool_timeout: 5
  
context:
  max_tokens: 100000
  history_limit: 20
  summarize_after: 10
  
memory:
  backend: redis
  url: ${REDIS_URL}
  ttl: 86400
  
tools:
  enabled:
    - search
    - database
    - email
  
logging:
  level: info
  format: json
  trace_enabled: true
  log_tool_calls: true
```

## CLI Usage

Hermes menyediakan CLI untuk development dan deployment:

```bash
# Install
pip install hermes-agent

# Initialize project
hermes init my-agent

# Add skill
hermes skills add order_lookup

# Test agent interactively
hermes chat

# Run agent headless
hermes run --goal "Process today's support queue"

# Deploy
hermes deploy --production
```

## Comparing Hermes to Alternatives

| Framework | Strengths | Use Case |
|-----------|-----------|----------|
| Hermes | Production-ready, modular skills, low-latency runtime | Enterprise deployment với strict requirements |
| LangGraph | Flexible graph-based workflows | Complex multi-step orchestration |
| CrewAI | Multi-agent collaboration | Parallel task execution |
| AutoGen | Microsoft ecosystem | Azure-integrated applications |
| Vercel AI SDK | Streaming real-time | Frontend apps dengan real-time UI |

Hermes unggul dalam **production operationalization** — observability, determinism, dan cost control adalah first-class concerns, bukan afterthought.

## Best Practice

1. **Skills over monolithic prompts**: Pecah capability ke skills terpisah
2. **Memory TTL**: Selalu set TTL — memory leaks mahal
3. **Tool timeouts**: Set per-tool timeout untuk prevent hanging
4. **Observability**: Enable tracing dari day 1 — debugging agent tanpa logs adalah nightmare
5. **Cost budgets**: Set token budgets per agent run — agent bisa easily consume $1+ per task tanpa constraint
6. **Canary deployment**: Deploy skills secara bertahap, bukan semua sekaligus

## Referensi Resmi

- [Hermes Agent Documentation](https://hermes-agent.nousresearch.com/docs)
- [Hermes Skill Authoring Guide](https://github.com/nousresearch/hermes-agent)
- [Hermes CLI Reference](https://hermes-agent.nousresearch.com/docs/cli)
- [Nous Research Blog](https://nousresearch.com/blog)

---

Hubungan artikel ini dengan artikel lain di blog:

- **Skill & Plugin Design**: lihat [Tool Design Patterns](../tool-design-patterns.md) untuk cara merancang tools yang digunakan Hermes.
- **Orchestration dengan Graph**: lihat [LangGraph Agent Patterns](../langgraph-agent-patterns.md) untuk alternative orchestration approach.
- **Prompt untuk Agent**: lihat [Prompt Engineering untuk Agentic Systems](../prompt-engineering-agentic-systems.md) untuk cara merancang system prompt Hermes.
- **Agentic Fundamentals**: lihat [Agentic AI Fundamentals](../agentic-ai-fundamentals-2026.md) untuk arsitektur sistem otonom secara umum.
- **Mengelola Tools**: lihat [MCP: Model Context Protocol](../mcp-model-context-protocol.md) untuk cara Hermes terintegrasi dengan ecosystem tool.
- **RAG vs Agents**: lihat [RAG vs Agents](../rag-vs-agents.md) untuk trade-off antara retrieval-based dan agentic approaches.

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
