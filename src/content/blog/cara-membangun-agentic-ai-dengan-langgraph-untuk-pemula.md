---
title: 'Cara Membangun Agentic AI dengan LangGraph untuk Pemula'
description: 'Panduan langkah demi langkah membangun agentic AI pertama Anda menggunakan LangGraph — framework yang populer untuk orkestrasi multi-agent dan workflow kompleks.'
pubDate: '2026-07-27'
heroImage: '../../assets/blog-placeholder-6.jpg'
---

LangGraph adalah framework open-source dari LangChain yang dirancang khusus untuk membangun sistem agentic dan multi-agent workflows. Bagi pemula, LangGraph memberikan abstraksi yang cukup tinggi untuk membangun agent yang berfungsi dengan cepat, namun cukup fleksibel untuk di-custom sesuai kebutuhan [glossary: langgraph].

Dalam panduan ini, kita akan membahas cara membangun agentic AI pertama Anda dengan LangGraph dari nol.

## Apa Itu LangGraph?

LangGraph adalah library Python (dan JavaScript) yang memungkinkan Anda mendefinisikan graph-based workflows di mana node adalah komponen (LLM, tool, function) dan edges adalah alur logika antar komponen. Ini berbeda dari chains sederhana di LangChain karena LangGraph mendukung:

- **Loops** — Agent bisa mengulangi langkah berdasarkan observation
- **Conditional edges** — Routing berdasarkan state atau kondisi tertentu
- **State management** — State yang persisten dan bisa diakses oleh semua node
- **Human-in-the-loop** — Titik jeda di mana manusia bisa intervene

Untuk dokumentasi lengkap, kunjungi [LangGraph Documentation](https://docs.langchain.com/langgraph).

## Konsep Dasar yang Perlu Dipahami

Sebelum mulai coding, ada 5 konsep kunci:

1. **State** — Data yang di-thread-kan melalui graph dan bisa diakses oleh semua node
2. **Nodes** — Fungsi yang memproses state dan mengembalikan update
3. **Edges** — Koneksi antar node yang menentukan alur eksekusi
4. **Conditional Edges** — Edges yang routing berdasarkan kondisi dinamis
5. **Agent** — Kombinasi dari LLM + tool + planner yang menjadi satu node

## Langkah 1: Installasi dan Setup

```bash
pip install langgraph langchain langchain-community
```

Anda juga memerlukan API key untuk LLM provider:

```bash
export ANTHROPIC_API_KEY="your-key"
# atau
export OPENAI_API_KEY="your-key"
```

## Langkah 2: Mendefinisikan State

State adalah pusat data yang mengalir melalui graph Anda. Definisikan state menggunakan TypedDict:

```python
from typing import TypedDict, Annotated, List
import operator

class AgentState(TypedDict):
    messages: Annotated[List, operator.add]
    goal: str
    current_step: str
    observations: List[str]
    completed: bool
```

Di sini, `messages` menggunakan `operator.add` untuk meng-append list secara otomatis ketika node memperbarui state.

## Langkah 3: Membuat Node Pertama — Planner Node

Planner node menerima goal dan menghasilkan rencana tindakan:

```python
from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o")

def planner_node(state: AgentState):
    # Prompt untuk generate plan
    plan = llm.invoke([
        {"role": "system", "content": "Buat daftar langkah konkret untuk mencapai tujuan berikut."},
        {"role": "user", "content": state["goal"]}
    ])
    return {"current_step": plan.content, "observations": []}
```

## Langkah 4: Membuat Tool-Using Node

Node ini bertanggung jawab untuk memanggil tool berdasarkan step yang dihasilkan oleh planner:

```python
from langchain_core.tools import tool

@tool
def get_weather(city: str) -> str:
    """Get current weather for a city."""
    return f"The weather in {city} is sunny, 25°C"

tools = [get_weather]
llm_with_tools = llm.bind_tools(tools)

def tool_executor_node(state: AgentState):
    result = llm_with_tools.invoke(state["messages"])
    return {"messages": [result]}
```

## Langkah 5: Membangun Graph dan Mendefinisikan Alur

```python
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("planner", planner_node)
workflow.add_node("executor", tool_executor_node)

# Define edges
workflow.set_entry_point("planner")
workflow.add_conditional_edges(
    "planner",
    route_based_on_plan,
    {"execute": "executor", "done": "__end__"}
)
workflow.add_edge("executor", "planner")  # Loop back

# Compile
app = workflow.compile()
```

## Langkah 6: Menjalankan Agent

```python
result = app.invoke({
    "goal": "Cek cuaca di Jakarta dan bandingkan dengan Bali",
    "messages": [],
    "current_step": "",
    "observations": [],
    "completed": False
})
```

## Konsep Lebih Lanjut

### Memory Checkpointing

LangGraph mendukung checkpointing yang menyimpan state graph setiap kali ada update. Ini memungkinkan agent untuk resume dari titik terakhir setelah restart atau error [lihat glossary kita](/glossary/agentic-ai).

### Human-in-the-Loop

Anda bisa menambahkan titik intervensi manusia:

```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(llm, tools, state=AgentState)
```

### Streaming Updates

Untuk pengalaman real-time, LangGraph mendukung streaming:

```python
for event in app.stream(input_state):
    print(event)
```

## Troubleshooting Umum

- **Agent stuck in loop** — Pastikan ada termination condition yang jelas
- **Tool not being called** — Periksa apakah tool schema sudah didefinisikan dengan benar
- **State not updating** — Pastikan node mengembalikan dict dengan key yang sesuai dengan state definition

Untuk contoh yang lebih lengkap, lihat [LangSmith documentation](https://docs.smith.langchain.com/) untuk debugging dan tracing agent Anda.

## Referensi Resmi

- [LangGraph Documentation](https://docs.langchain.com/langgraph)
- [LangChain Documentation](https://docs.langchain.com/)
- [LangGraph GitHub Repository](https://github.com/langchain-ai/langgraph)
- [LangSmith — Observability for LangGraph Agents](https://docs.smith.langchain.com/)

## FAQ

**Q: Apakah LangGraph hanya bisa digunakan dengan Python?**
A: LangGraph juga tersedia untuk TypeScript/JavaScript. Dokumentasi untuk JavaScript bisa diakses di [docs.langchain.com](https://docs.langchain.com/langgraph).

**Q: Apakah LangGraph gratis?**
A: Ya, LangGraph open-source di bawah lisensi MIT. LangSmith (platform observability) memiliki tier gratis dan berbayar.

**Q: Apa perbedaan LangGraph dengan LangChain?**
A: LangChain adalah library untuk chaining LLM calls dan integrasi tool. LangGraph dibangun di atas LangChain dan menambahkan kemampuan graph-based stateful workflows, loops, dan multi-agent coordination.

**Q: Model apa yang cocok untuk LangGraph?**
A: Model dengan kemampuan tool calling — Claude, GPT-4o, Gemini, dan Llama 3.1 semua didukung.

**Q: Bisakah saya deploy LangGraph agent ke production?**
A: Ya, LangGraph menyediakan LangGraph Platform untuk deployment dan LangGraph Serve untuk API serving.

**Q: Berapa lama untuk membangun agentic AI pertama dengan LangGraph?**
A: Untuk pemula, prototype sederhana bisa dalam 1-2 jam. Agent yang production-ready memerlukan beberapa hari untuk development, testing, dan observability setup.

**Q: Apa alternatif dari LangGraph?**
A: CrewAI, AutoGen dari Microsoft (AutoGen), dan Temporal + custom LLM orchestration adalah alternatif populer. Lihat also artikel [Membandingkan GitHub Copilot, Claude Code, dan Cursor](/membandingkan-github-copilot-claude-code-dan-cursor-tabel-lengkap) untuk tooling comparison yang lebih luas.