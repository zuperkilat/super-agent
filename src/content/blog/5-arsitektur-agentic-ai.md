---
title: '5 Arsitektur Agentic AI yang Wajib Dipelajari AI Engineer di 2026'
description: 'ReAct, Reflection, Tool Use, Planning, dan Multi-Agent Collaboration — dari teori hingga implementasi Python production-ready dengan LangChain, LangGraph, dan CrewAI.'
pubDate: '2026-07-20'
heroImage: '../../assets/blog-placeholder-2.jpg'
---

Berdasarkan laporan IDC Q4 2025, pasar agentic AI diproyeksikan tumbuh 300% pada 2026, dengan 72% perusahaan enterprise telah mengadopsi sistem agen otonomus untuk otomatisasi operasional. Perbedaan mendasar antara sistem agentic dengan model prediktif konvensional terletak pada kemampuan autonomus: berinteraksi dengan lingkungan, membuat keputusan berdasar konteks, dan menyesuaikan strategi secara real-time. Namun, kinerja agent tidak ditentukan sepenuhnya oleh kualitas foundation model, melainkan oleh arsitektur yang digunakan untuk mengatur aliran reasoning, action, dan feedback.

Bagi AI Engineer, menguasai lima arsitektur berikut bukan lagi pilihan, melainkan kebutuhan untuk membangun sistem yang reliable, scalable, dan measurable. Artikel ini membahas ReAct, Reflection, Tool Use, Planning, dan Multi-Agent Collaboration dengan pendekatan teknis, termasuk contoh kode production-ready, trade-off, dan perbandingan antar pattern.

## 1. ReAct (Reasoning + Acting)

### 1.1 Definisi Pattern

ReAct adalah arsitektur agentic yang menggabungkan dua tahap berulang: **Reasoning** (proses berpikir langkah demi langkah untuk memecah masalah) dan **Acting** (eksekusi aksi terhadap lingkungan atau tool). Pattern ini pertama kali diusulkan oleh Yao et al. (2022) dalam paper "ReAct: Synergizing Reasoning and Acting in Language Models", kemudian diadopsi luas di framework populer seperti LangChain dan LangGraph.

Berbeda dengan Chain-of-Thought (CoT) murni yang hanya berfokus pada reasoning tanpa interaksi lingkungan, ReAct memaksa model menghasilkan rationale untuk setiap aksi sebelum dieksekusi. Pendekatan ini meminimalkan hallucination dan meningkatkan akurasi pada tugas yang membutuhkan informasi real-time, seperti penelusuran data atau troubleshooting sistem.

### 1.2 Cara Kerja Teknis

Secara teknis, ReAct berjalan dalam siklus iteratif yang terdiri dari empat komponen utama:

1. **Prompt Engine**: Mengirimkan instruksi sistem yang menentukan format output eksplisit: `Thought` (pemikiran), `Action` (aksi yang diambil), dan `Observation` (hasil dari aksi).
2. **LLM Reasoning**: Model menghasilkan `Thought` sebagai reasoning langkah, kemudian `Action` dalam format terstruktur (JSON atau string yang dapat diparse) yang sesuai dengan definisi tool yang tersedia.
3. **Executor Module**: Menerjemahkan `Action` menjadi panggilan API, database query, atau tool execution.
4. **Feedback Loop**: Hasil dari aksi dikembalikan sebagai `Observation`, yang kemudian dimasukkan kembali ke dalam konteks percakapan untuk iterasi berikutnya.

Proses berulang hingga LLM menghasilkan output akhir (`Final Answer`) atau mencapai kondisi terminasi yang ditentukan.

### 1.3 Kapan Digunakan

ReAct paling efektif pada tiga skenario utama:
- **Retrieval + Reasoning**: Tugas yang mensyaratkanEvidence gathering sebelum kesimpulan. Contoh: analisis regulasi yang memerlukan cross-reference beberapa dokumen.
- **Sequential Tool Use**: Alur yang melibatkan tools yang saling bergantung—misalnya, query database → transformasi data → visualisasi.
- **Error Recovery**: Setiap iterasi menghasilkan observasi; jika hasil tidak sesuai harapan, agent dapat menyesuaikan strategi tanpa mengulang seluruh alur.

### 1.4 Contoh Kode Python

```python
from langchain.agents import initialize_agent, AgentType
from langchain.tools import tool
from langchain_openai import ChatOpenAI

@tool
def search_database(query: str) -> str:
    """Cari data dalam database internal."""
    return f"Hasil query: {query}"

@tool
def send_email(recipient: str, body: str) -> str:
    """Kirim email ke penerima."""
    return f"Email terkirim ke {recipient}"

llm = ChatOpenAI(model="gpt-4o", temperature=0)
tools = [search_database, send_email]

agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True)
result = agent.run("Cari data penjualan Q2 untuk region Eropa, lalu kirim summary ke finance@perusahaan.com")
```

### 1.5 Trade-off

Kelebihan: ReAct mengurangi hallucination karena setiap klaim harus dilanjutkan dengan observasi nyata.
Kekurangan: Overhead token meningkat—setiap iterasi menyimpan Thought + Action + Observation di context window. Untuk tugas simple yang memerlukan <2 langkah, ReAct menambah biaya tanpa manfaat signifikan.

## 2. Reflection Pattern

### 2.1 Definisi Pattern

Reflection pattern menambahkan lapisan *self-critique* setelah agent menghasilkan output. Agent tidak hanya memberikan jawaban, tetapi mengevaluasi kualitas jawaban tersebut—menandai bagian yang lemah, memeriksa konsistensi, dan menghasilkan versi revisi. Reflection diilustrasikan oleh Shinn et al. (2024) dalam paper "Reflexion: Language Agents with Verbal Reinforcement Learning" yang menunjukkan peningkatan 27% pada benchmark matematika dan 35% pada coding tasks dibandingkan baseline tanpa reflection.

### 2.2 Cara Kerja Teknis

Reflection loop biasanya melibatkan dua LLM calls per iterasi:
1. **Generator**: Menghasilkan output awal berdasarkan task description.
2. **Reflector**: Menerima output dan rubrik kriteria, menghasilkan umpan balik verbal—bukan hanya score numerik, tetapi penjelasan spesifik tentang apa yang salah dan bagaimana memperbaikinya.
3. **Revision Generator**: Menerima feedback dan menghasilkan versi revisi.

Iterasi dapat berjalan lebih dari sekali (multi-pass reflection) hingga memenuhi kriteria kualitas.

### 2.3 Kapan Digunakan

- **Generative tasks yang memerlukan kualitas tinggi**: Tulisan teknis, desain arsitektur, code review, legal drafting.
- **Quality assurance otomatis**: Sebelum mengirim output ke manusia atau sistem lain.
- **Learning from mistakes**: Menyimpan reflection pairs ke memori jangka panjang untuk meningkatkan performa di masa depan.

### 2.4 Contoh Kode Python

```python
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

llm = ChatOpenAI(model="gpt-4o", temperature=0)

generator_prompt = ChatPromptTemplate.from_messages([
    ("system", "Kamu adalah analis keuangan senior."),
    ("user", "{task}")
])

reflector_prompt = ChatPromptTemplate.from_messages([
    ("system", "Kamu adalah reviewer ketat. Identifikasi 3 kekuatan dan 3 kelemahan dalam laporan berikut. Berikan skor 1-10 untuk: akurasi, kelengkapan, kejelasan."),
    ("user", "{draft}")
])

def generate(task: str):
    return llm.invoke(generator_prompt.format(task=task))

def reflect(draft: str):
    return llm.invoke(reflector_prompt.format(draft=draft))

task = "Tulis laporan analisa tren penjualan Q2 2026 untuk region Eropa"
draft = generate(task).content
feedback = reflect(draft).content
print(f"Feedback: {feedback}")
```

### 2.5 Trade-off

Kelebihan: Meningkatkan kualitas output secara signifikan pada tugas generative.
Kekurangan: Biaya token naik 2x–3x karena panggilan LLM ganda. Tugas yang memiliki ground truth yang jelas (seperti QA factual) seringkali tidak mendapat manfaat besar dari reflection.

## 3. Tool Use / Function Calling

### 3.1 Definisi Pattern

Tool use pattern mengacu pada kemampuan model untuk memanggil fungsi eksternal secara terstruktur. OpenAI menggambarkan ini sebagai *function calling*, Anthropic sebagai *tool use*, dan Google sebagai *function calling dengan grounding*. Intinya sama: LLM menghasilkan structured output yang mendeskripsikan tool yang ingin dipanggil beserta parameter, kemudian runtime mengeksekusi tool dan mengembalikan hasil.

### 3.2 Cara Kerja Teknis

Tool use memiliki tiga elemen:
1. **Tool Registry**: Kumpulan definisi tools dengan schema JSON yang valid. Setiap tool memiliki `name`, `description`, dan `parameters` (type, required fields, constraints).
2. **Model Binding**: LLM diberikan tool definitions beserta instruksi untuk menggunakan tools hanya ketika diperlukan. Model memutuskan antara reasoning langsung atau tool invocation.
3. **Execution & Injection**: Tool dispatcher validasi parameter, mengeksekusi, dan menyisipkan hasil kembali ke konteks sebagai function response message.

Contoh schema:

```json
{
  "name": "search_database",
  "description": "Cari data penjualan berdasarkan kriteria",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {"type": "string", "description": "SQL query atau filter natural language"},
      "limit": {"type": "integer", "description": "Jumlah maksimal hasil"}
    },
    "required": ["query"]
  }
}
```

### 3.3 Kapan Digunakan

- **Data retrieval yang dinamis**: Query yang memerlukan data real-time atau parameter yang tidak dapat di-hardcode dalam prompt.
- **Side effects terstruktur**: Membuat record, mengirim notifikasi, memperbarui konfigurasi.
- **External world interaction**: Navigasi browser, automation OS, IoT control.

### 3.4 Contoh Kode Python

```python
from langchain_openai import ChatOpenAI
from langchain.tools import tool

llm = ChatOpenAI(model="gpt-4o", temperature=0)
llm_with_tools = llm.bind_tools([search_database, send_email])

response = llm_with_tools.invoke("Cari penjualan Q2 untuk region Eropa")
print(response.tool_calls)
```

### 3.5 Trade-off

Kelebihan: Kapasitas aksi LLM meluas secara signifikan—dari teks generator menjadi system orchestrator.
Kekurangan: Tool yang tidak terdefinisi dengan baik menjadi sumber utama failure. Deskripsi yang ambigu atau schema yang tidak sesuai menyebabkan LLM memanggil tool dengan parameter yang salah.

## 4. Planning / Hierarchical Task Decomposition

### 4.1 Definisi Pattern

Planning pattern memisahkan agen menjadi dua fase: *Planner* yang merancang rencana multi-langkah sebelum eksekusi, dan *Executor* yang menjalankan langkah-langkah tersebut. Hierarchical Task Decomposition (HTN) memecah tugas kompleks menjadi subtasks yang dapat dieksekusi secara independen, kemudian menggabungkan hasilnya.

### 4.2 Cara Kerja Teknis

Dalam LangGraph, planning dapat diimplementasikan sebagai node terpisah:

```python
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END

class AgentState(TypedDict):
    task: str
    plan: list[str]
    current_step: int
    result: str
    done: bool

def planner(state: AgentState) -> AgentState:
    plan_prompt = f"Buat langkah-langkah eksekusi untuk: {state['task']}"
    plan = llm.invoke(plan_prompt).content.split("\n")
    return {"plan": plan, "current_step": 0, "done": False}

def executor(state: AgentState) -> AgentState:
    step = state["plan"][state["current_step"]]
    result_step = llm_with_tools.invoke(step).content
    return {"current_step": state["current_step"] + 1, "result": result_step}

def should_continue(state: AgentState) -> str:
    return "executor" if state["current_step"] < len(state["plan"]) else END

workflow = StateGraph(AgentState)
workflow.add_node("planner", planner)
workflow.add_node("executor", executor)
workflow.add_edge("planner", "executor")
workflow.add_conditional_edges("executor", should_continue)
workflow.set_entry_point("planner")
app = workflow.compile()
```

### 4.3 Kapan Digunakan

- **Tugas kompleks dengan dependencies eksplisit**: Build pipeline, migration database, incident response.
- **Koordinasi multi-team**: Project management automation yang memerlukan alur lintas fungsi.
- **Reasoning-intensive domains**: Scientific research, regulatory compliance analysis.

### 4.4 Trade-off

Kelebihan: Transparan dan mudah di-debug. Anda dapat melihat seluruh rencana sebelum eksekusi dan mengintervensi jika langkah tidak sesuai.
Kekurangan: Planning statis rapuh jika lingkungan berubah di tengah alur—misalnya, API error memaksa perubahan urutan. Untuk domain dinamis, implicit planning lebih tangguh.

## 5. Multi-Agent Collaboration

### 5.1 Definisi Pattern

Multi-agent collaboration mengadopsi pola spesialisasi: setiap agent memiliki peran, tools, dan goal yang berbeda, berkomunikasi melalui shared state atau message passing. Pola ini diilustrasikan oleh CrewAI, AutoGen, dan LangGraph Multi-Agent patterns. CrewAI mengelompokkan agent sebagai *crew* dengan role-based delegation; LangGraph menggunakan *supervisor agent* yang memilih agent mana yang harus menangani langkah berikutnya.

### 5.2 Cara Kerja Teknis

Contoh implementasi supervisor pattern dalam LangGraph:

```python
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langchain.tools import tool

llm = ChatOpenAI(model="gpt-4o", temperature=0)

members = ["researcher", "writer", "reviewer"]
options = members + ["FINISH"]

system_prompt = (
    "Kamu adalah supervisor. Pilih agent berikutnya berdasarkan task saat ini: "
    f"{', '.join(options)}. "
    "Setiap agent memiliki output yang dapat kamu lihat. "
    "Apabila task sudah selesai, jawab FINISH."
)

supervisor_chain = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{task}")
]).pipe(llm.bind_functions([{"name": "route", "parameters": {"type": "string", "enum": options}}]))
```

### 5.3 Kapan Digunakan

- **Domain kompleks yang membutuhkan keahlian berbeda**: Research (web search), writing (content generation), review (quality assurance).
- **Parallel execution**: Menjalankan subtasks secara konkuren—misalnya, mengumpulkan data dari lima sumber berbeda secara bersamaan, kemudian merge hasil.
- **Error isolation**: Jika satu agent gagal, supervisor dapat memilih rute alternatif tanpa menghentikan seluruh alur.

### 5.4 Trade-off

Kelebihan: Skalabilitas arsitektur—tambahkan agent baru tanpa mengubah sistem lain. Spesialisasi meningkatkan kualitas output per domain.
Kekurangan: Coordination overhead—supervisor menjadi bottleneck. Menambah agent meningkatkan biaya token dan latency. Debugging state yang melintasi banyak agent menantang tanpa observability yang kuat.

## Perbandingan Antar Patterns

| Pattern | Complexitas | Latency | Token Cost | Error Recovery | Use Case Terbaik |
|---|---|---|---|---|---|
| ReAct | Rendah | Sedang | Sedang | Baik – iterative | Retrieval, sequential tools |
| Reflection | Sedang | Tinggi | Tinggi | Baik – self-correcting | Generative, high-quality output |
| Tool Use | Rendah | Rendah | Rendah | Sedang – depends on tool | Action-heavy, API-driven |
| Planning | Tinggi | Tinggi | Tinggi | Rendah – static plan | Deterministic multi-step |
| Multi-Agent | Sangat Tinggi | Sangat Tinggi | Sangat Tinggi | Baik – supervisor reroutes | Complex, multi-domain |

## Rekomendasi Implementasi untuk 2026

- **Hackathon / MVP**: Gunakan Tool Use + ReAct kombinasi. LangChain `create_react_agent` mengabungkan keduanya dengan minimal konfigurasi.
- **Production dengan high reliability**: Tambahkan Reflection untuk quality assurance dan Planning untuk controllability.
- **Enterprise yang memerlukan audit**: Multi-agent dengan supervisor memungkinkan role separation dan audit trail terpisah per agent.
- **Time-critical atau cost-sensitive**: Evaluasi kembali apakah agentic AI benar-benar dibutuhkan, atau deterministic workflow sudah cukup.

## FAQ

**Apakah saya harus menguasai kelima pattern sebelum mulai membangun?**
Tidak. Mulai dengan Tool Use dan ReAct—dua pattern yang paling umum digunakan—kemudian tambahkan Reflection atau Planning seiring kebutuhan.

**Pattern mana yang paling efisien dalam biaya token?**
Tool Use murni tanpa reasoning loop adalah yang paling murah—hanya satu LLM call per task. Reflection adalah yang paling mahal karena multiple passes.

**Bisakah saya menggabungkan beberapa pattern dalam satu sistem?**
Ya. Contoh umum: Planner membagi task menjadi subtasks, ReAct loop mengeksekusi setiap subtask, dan Reflection mengevaluasi output sebelum dikirim ke tahap berikutnya.

**Apakah pattern ini berlaku untuk semua LLM?**
Konsepnya berlaku universal, tetapi implementasi teknis berbeda. OpenAI dan Anthropic memiliki native tool calling; model open-source seperti Llama 3 atau Mistral memerlukan prompt engineering untuk memaksa format Thought-Action.

**Bagaimana cara mengukur efektivitas pattern yang saya gunakan?**
Bandingkan metriks: task success rate, average steps, token per task, dan human intervention rate. Jika reflection menambah biaya 2x tetapi mengurangi human intervention sebesar 50%, itu worth it.

## Referensi Resmi

- Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models", 2022. https://arxiv.org/abs/2210.03629
- Shinn et al., "Reflexion: Language Agents with Verbal Reinforcement Learning", 2024. https://arxiv.org/abs/2303.11366
- OpenAI, "Function Calling Guide", docs.openai.com.
- Anthropic, "Tool Use with Claude", docs.anthropic.com.
- LangChain, "Agent Architectures", langchain.com.
- CrewAI, "Role-Based Multi-Agent Framework", crewai.com.
- LangGraph, "Multi-Agent Supervisor Pattern", langchain-ai.github.io/langgraph.
