---
title: 'Cara Membangun Agentic AI System dari Nol: Practical Guide dengan LangGraph'
description: 'Tutorial end-to-end membangun agentic system dengan LangGraph: setup, tools, state management, agent loop, memory, error handling, testing, dan deployment.'
pubDate: '2026-07-20'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

Agentic AI system adalah paradigm baru dalam engineering AI di mana model bahasa besar (LLM) tidak hanya merespons prompt secara pasif, tetapi secara aktif merencanakan, menggunakan tools, mempertahankan state, dan berulang kali mengevaluasi hasilnya sebelum memberikan jawaban akhir. Berbeda dengan aplikasi RAG klasik yang hanya melakukan retrieval + generate, agentic system mampu memecah masalah kompleks secara otomatis, memanggil API eksternal, mengoreksi kesalahan, dan beradaptasi dalam beberapa langkah.

**LangGraph** — framework milik LangChain — dirancang khusus untuk mengelola alur kerja agent yang bersifat *stateful*, *cyclic*, dan kontrol penuh developer. LangGraph memecahkan masalah utama dalam arsitektur agent: kontrol alur, persistent memory, dan error handling yang konsisten. Framework ini banyak diadopsi di production karena fleksibilitasnya untuk menggabungkan LLM, tools, dan logic bisnis tanpa abstrak berlebihan.

Artikel ini adalah practical guide end-to-end: mulai instalasi, setup tools, definisi state, agent loop, memory management, error handling, testing, hingga deployment best practices. Semua kode ditulis dengan API modern LangGraph (>=0.2.x) dan production-ready.

## 1. Instalasi dan Persiapan Lingkungan

Sebelum mulai, siapkan environment pengembangan yang bersih. Gunakan Python 3.10+ untuk kompatibilitas library terbaru.

```bash
# Buat virtual environment
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows

# Instal dependensi inti
pip install --upgrade pip
pip install langgraph langchain-openai langchain-community \
            langchain-core python-dotenv pydantic==2.9.2

# Instal dependensi opsional untuk persistence & observability
pip install langgraph-checkpoint-postgres langsmith
```

Buat file `.env` di root project:

```
OPENAI_API_KEY=sk-...
LANGCHAIN_API_KEY=lsv2_pt_...        # opsional untuk LangSmith tracing
DATABASE_URL=postgresql://user:pass@localhost:5432/agentdb
```

## 2. Konsep Dasar State, Nodes, dan Edges

LangGraph membangun graph dengan tiga konsep inti:

- **State**: Structured data yang mengalir antar nodes. Diimplementasikan biasanya sebagai TypedDict atau Pydantic model.
- **Nodes**: Fungsi Python yang menerima state, memproses, dan mengembalikan state yang telah diperbarui.
- **Edges**: Transisi antar nodes. Bisa conditional (berdasarkan kondisi di state) atau unconditional (selalu ke node tertentu).

```python
from typing_extensions import TypedDict

class AgentState(TypedDict):
    messages: list
    next: str
```

## 3. Definisi Tools

Tools didefinisikan dengan decorator `@tool` dari LangChain, dilengkapi dengan Pydantic schema untuk parameter validation.

```python
from langchain.tools import tool
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    query: str = Field(description="Kata kunci pencarian")
    max_results: int = Field(default=5, description="Jumlah maksimal hasil")

@tool(args_schema=SearchInput)
def search_web(query: str, max_results: int = 5) -> str:
    """Cari informasi di web berdasarkan kata kunci."""
    # Implementasi dengan Tavily, Serper, atau SerpAPI
    return f"Hasil pencarian untuk '{query}' (limas {max_results} items)"
```

Validasi parameter dilakukan otomatis sebelum fungsi dieksekusi, sehingga Anda tidak perlu handling manual untuk input yang salah.

## 4. Agent LLM dengan bind_tools

Agent LLM bertindak sebagai *reasoning engine* yang memilih tool berdasarkan state saat ini.

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o", temperature=0)
llm_with_tools = llm.bind_tools([search_web, ...])
```

LLM dengan `bind_tools` menerima dua jenis output: `text` (respons langsung) atau `tool_calls` (aksi yang harus dieksekusi). Graph kemudian merutekan output tersebut ke node yang sesuai.

## 5. Membangun Graph

Gabungkan nodes dan edges ke dalam `StateGraph`:

```python
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

def agent(state: AgentState) -> AgentState:
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END

workflow = StateGraph(AgentState)
workflow.add_node("agent", agent)
workflow.add_node("tools", ToolNode([search_web, send_email]))

workflow.add_edge("agent", "tools")
workflow.add_conditional_edges("agent", should_continue, ["tools", END])
workflow.set_entry_point("agent")

app = workflow.compile()
```

## 6. Menjalankan Interaksi Pertama

Gunakan `.stream()` atau `.invoke()` untuk menjalankan graph:

```python
config = {"configurable": {"thread_id": "thread-123"}}
result = app.stream({
    "messages": [{"role": "user", "content": "Cari penjualan Q2"}]
}, config=config)

for step in result:
    print(step)
```

`thread_id` digunakan untuk memisahkan percakapan—pengguna A dan B memiliki memory yang terpisah meskipun menggunakan graph yang sama.

## 7. State Management Terstruktur

Untuk aplikasi yang lebih kompleks, gunakan reducer untuk mengatur bagaimana state diperbarui.

```python
from typing import Annotated
from langgraph.graph import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]  # append, don't overwrite
    context: dict  # metadata tambahan
```

`add_messages` adalah reducer bawaan yang menambahkan message baru ke list tanpa menghapus yang lama. Untuk collections lain (dict, list, set), definisikan reducer kustom.

## 8. Agent Loop dan Termination Conditions

Agent loop berhenti ketika:
- LLM menghasilkan respons teks tanpa tool call.
- Jumlah iterasi mencapai `max_iterations`.
- Kondisi kustom terpenuhi (misalnya, `done: True` di state).

```python
def should_continue(state: AgentState) -> str:
    if state.get("done"):
        return END
    if len(state["messages"]) > 20:
        return END
    last = state["messages"][-1]
    return "tools" if last.tool_calls else END
```

## 9. Memory: Checkpointing dan Persistent Store

Memory dalam LangGraph dibagi menjadi:
- **Short-term**: Dipertahankan dalam `messages` selama sesi aktif.
- **Long-term**: Disimpan di checkpoint backend—PostgreSQL dengan `langgraph-checkpoint-postgres` adalah rekomendasi untuk production.

```python
from langgraph.checkpoint.postgres import PostgresSaver

checkpointer = PostgresSaver(DATABASE_URL)
app = workflow.compile(checkpointer=checkpointer)
```

Dengan checkpointing, agent dapat di-*resume* dari donde ia terhenti—berguna untuk human-in-the-loop atau recovery setelah crash.

## 10. Error Handling dan Retry

Error handling harus mencakup:

- **Tool execution failure**: Tangkap exception, kembalikan error message ke LLM, dan biarkan agent memutuskan langkah berikutnya.
- **LLM API error**: Gunakan exponential backoff dengan `tenacity`.

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
def call_llm(messages):
    return llm_with_tools.invoke(messages)
```

- **State validation**: Validasi state setelah setiap node untuk memastikan struktur tidak rusak.

## 11. Testing

Testing agentic system berbeda dari unit testing biasa. Uji pada tiga level:

1. **Unit test tools**: Validasi bahwa tools mengembalikan output yang benar untuk input yang diketahui.
2. **Integration test graph**: Jalankan graph dengan mock LLM responses untuk memastikan routing dan state transitions berfungsi.
3. **Evaluation**: Gunakan LangSmith untuk melacak performa agent terhadap dataset benchmark.

```python
from langsmith import Client

client = Client()
dataset = client.create_dataset("agent-eval")
client.create_example(
    inputs={"messages": [{"role": "user", "content": "Cari penjualan Q2"}]},
    outputs={"expected_tool": "search_web"},
    dataset_id=dataset.id
)
```

## 12. Observability

Instrumentasi wajib di production:

- **LangSmith tracing**: Aktifkan callback untuk melacak setiap node, tool call, dan LLM invocation.

```python
from langchain.callbacks import LangSmithCallback
from langsmith import trace

with trace("agent-run", project_name="production"):
    result = app.invoke(inputs, config=config)
```

- **Custom metrics**: Catat token usage, latency per node, dan tool success rate.
- **Alerting**: Buat threshold—misalnya, alert jika error rate tool >5%.

## 13. Deployment

### FastAPI Wrapper

Bungkus graph menjadi REST API:

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = API = FastAPI()

class ChatRequest(BaseModel):
    message: str
    thread_id: str

@api.post("/chat")
async def chat(request: ChatRequest):
    try:
        result = app.stream(
            {"messages": [{"role": "user", "content": request.message}]},
            config={"configurable": {"thread_id": request.thread_id}}
        )
        return {"response": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Docker Containerization

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:api", "--host", "0.0.0.0", "--port", "8000"]
```

Tambahkan rate limiting dan token budget middleware untuk mencegah abuse.

## 14. Human-in-the-Loop

Untuk use case yang memerlukan approval manusia, gunakan `interrupt`:

```python
from langgraph.checkpoint.postgres import PostgresSaver

checkpointer = PostgresSaver(DATABASE_URL)
app = workflow.compile(checkpointer=checkpointer, interrupt_before=["tools"])
```

Graph akan berhenti sebelum menjalankan tools, memungkinkan manusia memeriksa state, mengedit input, atau menghentikan eksekusi.

## 15. Multi-Agent Orchestration

Untuk sistem yang kompleks, pisahkan menjadi beberapa graph:

```python
from langgraph.graph import StateGraph

research_graph = build_research_agent()
writing_graph = build_writing_agent()
review_graph = build_review_agent()

supervisor = StateGraph(AgentState)
supervisor.add_node("research", research_graph)
supervisor.add_node("write", writing_graph)
supervisor.add_node("review", review_graph)
supervisor.add_edge("research", "write")
supervisor.add_edge("write", "review")
supervisor.add_edge("review", END)
```

Setiap graph dapat ditempatkan di service terpisah untuk isolasi failure dan scaling independen.

## 16. Deployment Checklist

Sebelum mendorong ke production:

- [ ] Semua tools memiliki schema yang valid dan error handling.
- [ ] Checkpointer dikonfigurasi dengan backup dan retention policy.
- [ ] Observability aktif: LangSmith tracing, metrics, dan alerting.
- [ ] Cost monitoring: batas token per task dan alert jika threshold terlampaui.
- [ ] Security review: least-privilege untuk setiap tool, input validation, output filtering.
- [ ] Rollback plan: graph dapat di-revert ke versi sebelumnya tanpa data loss.
- [ ] Shadow testing:jalankan versi baru berdampingan dengan versi lama selama 1 minggu sebelum full rollout.

## FAQ

**Apakah LangGraph cocok untuk pemula?**
Ya. LangGraph memiliki learning curve yang lebih rendah daripada arsitektur agent dari nol, tetapi memerlukan pemahaman state machine dan async programming.

**Berapa biaya operasional agentic system per query?**
Bervariasi tergantung kompleksitas. Agent coding dengan tool calling bisa mencapai 10K–100K token per task—sekitar $0,10–$1 per task di GPT-4o. Sedangkan agent customer service sederhana bisa di bawah 1K token.

**Bagaimana cara mencegah infinite loop?**
Atur `max_iterations` pada agent loop dan conditional edges yang memaksa terminasi setelah kondisi tertentu.

**Bisakah agent berjalan secara asynchronous?**
Ya. Gunakan `ainvoke()` dan `astream()` daripada versi sinkron untuk throughput tinggi.

**Apakah saya memerlukan database khusus untuk agentic AI?**
PostgreSQL dengan pgvector cukup untuk start. Untuk skala besar, pertimbangkan Redis untuk short-term cache dan Pinecone atau Weaviate untuk long-term vector store.

**Bagaimana cara meng-handle error pada tools?**
Jangan biarkan exception bocor ke LLM tanpa konteks. Tangkap error, kembalikan structured error message, dan biarkan LLM memutuskan: retry, switch tool, atau escalate.

## Referensi Resmi

- LangGraph Documentation, https://langchain-ai.github.io/langgraph/
- LangChain Agents Guide, https://python.langchain.com/docs/agents
- OpenAI Cookbook: Function Calling, https://github.com/openai/openai-cookbook
- LangSmith Evaluation Guide, https://docs.smith.langchain.com
- Anthropic Claude Tool Use, https://docs.anthropic.com/claude/tool-use
