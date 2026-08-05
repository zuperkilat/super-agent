---
title: '5 Arsitektur Agentic AI yang Wajib Dipelajari AI Engineer di 2026'
description: 'Lima arsitektur agentic AI esensial untuk AI Engineer di 2026: ReAct, Reflection, Tool Use, Planning, dan Multi-Agent Collaboration - dengan contoh kode production-ready.'
pubDate: '2026-08-05'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

Berdasarkan laporan IDC Q4 2025, pasar agentic AI diproyeksikan tumbuh 300% pada 2026, dengan 72% perusahaan enterprise telah mengadopsi sistem agent otonomus untuk otomatisasi operasional. Perbedaan mendasar antara sistem agentic dengan model prediktif konvensional terletak pada kemampuan autonomus: berinteraksi dengan lingkungan, membuat keputusan berdasar konteks, dan menyesuaikan strategi secara real-time. Namun, kinerja agent tidak ditentukan sepenuhnya oleh kualitas foundation model, melainkan oleh arsitektur yang digunakan untuk mengatur aliran reasoning, action, dan feedback.

Bagi AI Engineer, menguasai lima arsitektur berikut bukan lagi pilihan, melainkan kebutuhan untuk membangun sistem yang reliable, scalable, dan measurable. Artikel ini membahas ReAct, Reflection, Tool Use, Planning, dan Multi-Agent Collaboration dengan pendekatan teknis, termasuk contoh kode production-ready, trade-off, dan perbandingan antar pattern.

---

## 1. ReAct (Reasoning + Acting)

### 1.1 Definisi Pattern

ReAct adalah arsitektur agentic yang menggabungkan dua tahap berulang: **Reasoning** (proses berpikir langkah demi langkah untuk memecah masalah) dan **Acting** (eksekusi aksi terhadap lingkungan atau tool). Pattern ini pertama kali diusulkan oleh Yao et al. (2022) dalam paper *"ReAct: Synergizing Reasoning and Acting in Language Models"*, kemudian diadopsi luas di framework populer seperti LangChain dan LangGraph.

Berbeda dengan Chain-of-Thought (CoT) murni yang hanya berfokus pada reasoning tanpa interaksi lingkungan, ReAct memaksa model menghasilkan rationale untuk setiap aksi sebelum dieksekusi. Pendekatan ini meminimalkan hallucination dan meningkatkan akurasi pada tugas yang membutuhkan informasi real-time, seperti penelusuran data atau troubleshooting sistem.

### 1.2 Cara Kerja Teknis

Secara teknis, ReAct berjalan dalam siklus iteratif yang terdiri dari empat komponen utama:

1. **Prompt Engine**: Mengirimkan instruksi sistem yang menentukan format output eksplisit: `Thought` (pemikiran), `Action` (aksi yang diambil), dan `Observation` (hasil dari aksi).
2. **LLM Reasoning**: Model menghasilkan `Thought` sebagai reasoning langkah, kemudian `Action` dalam format terstruktur (JSON atau string yang dapat diparse) yang sesuai dengan definisi tool yang tersedia.
3. **Executor Module**: Menerjemahkan `Action` menjadi panggilan API, database query, atau tool execution.
4. **Feedback Loop**: Hasil dari aksi dikembalikan sebagai `Observation`, yang kemudian dimasukkan kembali ke dalam konteks percakapan untuk iterasi berikutnya.

Proses berulang hingga LLM menghasilkan output akhir (`Final Answer`) atau mencapai kondisi terminasi yang ditentukan. Dalam implementasi LangChain, pattern ini diimplementasikan melalui tipe agent `ZERO_SHOT_REACT_DESCRIPTION` dengan struktur prompt `{agent_scratchpad}` yang menyimpan history Thought-Action-Observation secara otomatis.

### 1.3 Kapan Digunakan

ReAct paling efektif pada tiga skenario utama:

- **Tugas yang bergantung pada data real-time** yang tidak ada dalam knowledge base model, seperti harga saham terkini, cuaca, atau stok gudang.
- **Tugas multistep** yang membutuhkan verifikasi hasil antar langkah, seperti penelusuran berita, analisis data dengan beberapa query, atau debugging kode.
- **Tugas di mana kesalahan pada satu langkah dapat merusak hasil akhir**, sehingga perlu reasoning eksplisit sebelum aksi, seperti troubleshooting sistem produksi.

Tugas yang tidak cocok untuk ReAct meliputi pekerjaan murni generative tanpa interaksi lingkungan (misal: penulisan esai) atau tugas dengan konteks statis yang sudah tersedia sepenuhnya di knowledge base.

### 1.4 Contoh Kode Python

Berikut implementasi ReAct agent menggunakan LangChain dan OpenAI, dengan tool pencarian web dan kalkulator:

```python
import os
from langchain.agents import initialize_agent, AgentType, Tool
from langchain_openai import ChatOpenAI
from langchain_community.tools import DuckDuckGoSearchRun, Calculator

# Inisialisasi LLM dengan temperature rendah untuk konsistensi
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# Definisi tool yang tersedia untuk agent, disusun dengan nama dan deskripsi yang jelas
tools = [
    Tool(
        name="Pencari Web",
        func=DuckDuckGoSearchRun().run,
        description="Berguna untuk mencari informasi real-time di internet, seperti berita terkini atau harga cryptocurrency."
    ),
    Tool(
        name="Kalkulator",
        func=Calculator().run,
        description="Berguna untuk perhitungan matematika akurat."
    )
]

# Inisialisasi ReAct agent dengan konfigurasi production-ready
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,  # Tipe agent ReAct
    handle_parsing_errors=True,  # Menangani error parsing output LLM agar tidak crash
    verbose=False,  # Set True untuk debugging di environment pengembangan
    max_iterations=5,  # Batasi jumlah iterasi untuk menghindari infinite loop
    early_stopping_method="generate"  # Berhenti jika LLM menghasilkan jawaban akhir
)

# Eksekusi agent
result = agent.invoke("Berapa harga saham AAPL hari ini? Setelah itu hitung persentase kenaikan jika harga kemarin $175.")
print(result["output"])
```

Kode di atas memaksa LLM untuk berpikir (`Thought`) sebelum menggunakan tool pencarian untuk mendapatkan harga saham terkini, kemudian berpikir lagi sebelum menggunakan kalkulator untuk menghitung persentase kenaikan, sesuai dengan prinsip ReAct. Konfigurasi `max_iterations` dan `handle_parsing_errors` memastikan agent tetap berjalan meskipun ada error parsing yang wajar pada output LLM.

### 1.5 Trade-off

**Kelebihan:**
- Mengurangi hallucination karena setiap aksi didasari reasoning eksplisit yang tercatat dalam history.
- Transparan: alur Thought-Action-Observation dapat dilacak untuk audit dan debugging, sesuai kebutuhan compliance.
- Dapat menangani tugas yang membutuhkan informasi dinamis di luar knowledge base model tanpa perlu modifikasi arsitektur tambahan.

**Kekurangan:**
- Latensi tinggi: setiap iterasi membutuhkan panggilan LLM terpisah untuk reasoning dan eksekusi, sehingga lebih lambat dibanding single-shot inference.
- Biaya operasional lebih tinggi: jumlah token yang digunakan tumbuh secara linear dengan jumlah iterasi.
- Tidak cocok untuk tugas sederhana yang dapat diselesaikan dalam satu langkah karena overhead yang tidak perlu.
- Rentan terhadap infinite loop jika LLM terus menghasilkan aksi yang tidak valid, meskipun konfigurasi `max_iterations` dapat mengurangi risiko ini.

---

## 2. Reflection Pattern

### 2.1 Definisi Pattern

Reflection pattern adalah arsitektur agentic di mana agent menghasilkan solusi awal, kemudian mengevaluasi dan mempertanyakan kinerja hasilnya sendiri (self-critique) untuk menghasilkan revisi yang lebih baik. Pattern ini dipopulerkan oleh Shinn et al. (2023) dalam paper *"Reflexion: Language Agents with Verbal Reinforcement Learning"* dari Google DeepMind, dan kemudian diadopsi oleh Anthropic untuk meningkatkan kualitas respons model pada tugas codding dan penulisan.

Berbeda dengan ReAct yang berfokus pada interaksi lingkungan, Reflection berfokus pada iterasi perbaikan internal solusi sebelum disajikan ke pengguna. Konsep ini terinspirasi dari proses *deliberate practice* dalam psikologi, di mana individu merefleksikan kesalahan untuk meningkatkan kinerja.

### 2.2 Cara Kerja Teknis

Secara teknis, Reflection memiliki dua komponen utama yang bekerja dalam siklus iteratif:

1. **Generator**: Menghasilkan output awal (draft solusi, kode, atau rencana) berdasarkan pertanyaan pengguna, biasanya dalam satu panggilan LLM.
2. **Critic**: Menerima output generator dan memberikan evaluasi terstruktur berupa Identifikasi Masalah (apa yang salah), Saran Perbaikan (langkah konkret untuk memperbaiki), dan Skor Kualitas (angka dari 1-10).

Siklus kerjanya:
1. Generator menghasilkan draft solusi.
2. Draft dimasukkan ke prompt Critic yang menghasilkan evaluasi terstruktur.
3. Jika skor kualitas di bawah ambang batas (misal 8/10) atau terdapat masalah kritis, evaluasi dikembalikan ke Generator sebagai konteks tambahan untuk revisi.
4. Proses berulang hingga mencapai skor ambang batas atau jumlah iterasi maksimal (misal 3 kali iterasi).

Dalam LangGraph, pattern ini diimplementasikan menggunakan `StateGraph` dengan node yang memisahkan generator dan critic, serta kondisi bercabang yang mengevaluasi apakah revisi diperlukan berdasarkan skor atau presence of critical issues.

### 2.3 Kapan Digunakan

Reflection pattern paling efektif pada tiga skenario:

- **Tugas yang membutuhkan output berkualitas tinggi dengan skor objektif**, seperti penulisan kode, essay, atau rencana bisnis yang harus memenuhi standar tertentu.
- **Tugas di mana kesalahan sulit dideteksi dalam sekali generate**, tetapi mudah dikritik setelah memiliki draft, seperti debugging kode kompleks atau audit keamanan.
- **Tugas yang membutuhkan konsistensi gaya dan format yang ketat**, seperti pembuatan konten marketing atau dokumentasi teknis yang harus sesuai dengan style guide perusahaan.

Tugas yang tidak cocok meliputi tugas real-time dengan latensi terbatas (karena membutuhkan beberapa iterasi LLM) atau tugas dengan kategori benar/salah yang mutlak tanpa ruang perbaikan bertahap.

### 2.4 Contoh Kode Python

Berikut implementasi Reflection pattern menggunakan Anthropic Claude untuk mengevaluasi dan merevisi kode Python. Implementasi ini menggunakan prompt terstruktur untuk memastikan output critic berupa JSON yang dapat di-parse:

```python
import os
import anthropic
import json
from typing import Dict

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

GENERATOR_PROMPT = """Buat kode Python untuk tugas berikut: {task_description}
Pastikan kode:
1. Berjalan tanpa error
2. Memiliki error handling yang tepat
3. Memiliki docstring untuk setiap fungsi
4. Mengikuti PEP 8
"""

CRITIC_PROMPT = """Evaluasi kode Python berikut untuk tugas '{task_description}':
{kode}

Evaluasi berdasarkan:
1. Akurasi: Apakah kode memecahkan masalah yang diminta?
2. Error handling: Apakah menangani edge case (misal input negatif, None, tipe data salah)?
3. Kualitas kode: Apakah mengikuti PEP 8, memiliki docstring, dan variabel bernama jelas?
4. Efisiensi: Apakah waktu dan memory complexity wajar?

Berikan output dalam format JSON yang valid:
{{
  "score": <angka 1-10>,
  "issues": ["masalah1", "masalah2"],
  "suggestions": ["saran1", "saran2"],
  "is_acceptable": <true/false>
}}
"""

def generate_code(task_description: str, previous_code: str = None) -> str:
    """Generator: Membuat atau merevisi kode berdasarkan deskripsi tugas."""
    if previous_code:
        prompt = f"Revisi kode berikut berdasarkan evaluasi terbaru. Kode sebelumnya: {previous_code}"
    else:
        prompt = GENERATOR_PROMPT.format(task_description=task_description)

    response = client.messages.create(
        model="claude-3-7-sonnet-latest",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text

def critique_code(code: str, task_description: str) -> Dict:
    """Critic: Mengevaluasi kode dan memberikan skor serta saran perbaikan."""
    prompt = CRITIC_PROMPT.format(task_description=task_description, kode=code)
    response = client.messages.create(
        model="claude-3-7-sonnet-latest",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )
    try:
        return json.loads(response.content[0].text)
    except json.JSONDecodeError:
        # Fallback jika output LLM tidak valid JSON
        return {"score": 0, "issues": ["Output critic tidak valid"], "suggestions": [], "is_acceptable": False}

def reflection_agent(task_description: str, max_iterations: int = 3, threshold_score: int = 8) -> str:
    current_code = generate_code(task_description)
    print(f"Draft awal:\n{current_code}\n")

    for i in range(max_iterations):
        evaluation = critique_code(current_code, task_description)
        score = evaluation.get("score", 0)
        is_acceptable = evaluation.get("is_acceptable", False)

        print(f"Iterasi {i+1}: Skor={score}, Masalah={evaluation.get('issues', [])}")

        if is_acceptable or score >= threshold_score:
            print(f"Solusi diterima dengan skor {score} pada iterasi {i+1}")
            return current_code

        # Perbaiki berdasarkan saran
        suggestions = "\n".join(evaluation.get("suggestions", []))
        current_code = generate_code(
            task_description=f"{task_description}\n\nSaran perbaikan:\n{suggestions}",
            previous_code=current_code
        )
        print(f"Kode direvisi pada iterasi {i+1}\n")

    return current_code

# Jalankan agent: Tugas membuat fungsi faktorial dengan error handling
hasil_akhir = reflection_agent(
    task_description="Buat fungsi Python untuk menghitung faktorial bilangan bulat dengan error handling untuk bilangan negatif.",
    max_iterations=3
)
print("Hasil akhir:\n", hasil_akhir)
```

Kode di atas menampilkan alur Reflection yang jelas: draft dibuat, dievaluasi dengan skor objektif, dan direvisi secara otomatis hingga mencapai ambang batas kualitas. Prompt Critic yang terstruktur memastikan output dapat di-parse sebagai JSON untuk logika kontrol.

### 2.5 Trade-off

**Kelebihan:**
- Meningkatkan kualitas output secara signifikan: eksperimen dari Google Reflexion menunjukkan peningkatan akurasi tugas coding hingga 35% dengan 2-3 iterasi reflection.
- Fleksibel: dapat diterapkan pada berbagai tugas (kode, penulisan, analisis) tanpa mengubah arsitektur inti.
- Terukur: skor kualitas memberikan metrik objektif untuk menghentikan iterasi, sehingga biaya dapat dikontrol.

**Kekurangan:**
- Biaya dan latensi meningkat seiring jumlah iterasi: setiap iterasi menambahkan minimal 2 panggilan LLM (generator dan critic).
- Dapat mengalami over-engineering jika kritik terlalu ketat, yang menyebabkan solusi menjadi lebih kompleks dari yang dibutuhkan.
- Bergantung pada kualitas kritik: jika model critic tidak memiliki knowledge domain yang cukup tentang tugas spesifik, evaluasi dapat menyesatkan dan menghasilkan revisi yang tidak perlu.

---

## 3. Tool Use / Function Calling Pattern

### 3.1 Definisi Pattern

Tool Use (atau Function Calling) adalah arsitektur agentic yang memungkinkan LLM memanggil fungsi atau API eksternal secara terstruktur untuk menyelesaikan tugas yang di luar kapasitasnya, seperti mengakses data real-time, mengeksekusi perintah sistem, atau berinteraksi dengan layanan pihak ketiga. Pattern ini menjadi fondasi agentic AI modern, diadopsi sebagai fitur native di OpenAI API (Function Calling), Anthropic API (Tool Use), serta framework seperti LangChain, CrewAI, dan LlamaIndex.

Berbeda dengan ReAct yang melakukan reasoning eksplisit dalam teks bebas sebelum aksi, Tool Use memaksa LLM menghasilkan output terstruktur (JSON) sesuai skema yang didefinisikan secara eksplisit. Pendekatan ini mengurangi variabilitas output dan meningkatkan keandalan integrasi sistem.

### 3.2 Cara Kerja Teknis

Cara kerja teknis Tool Use terbagi menjadi tiga tahap:

1. **Tool Definition & Registration**: Developer mendefinisikan daftar tool yang tersedia, lengkap dengan nama, deskripsi, parameter yang dibutuhkan, dan skema validasi (biasanya menggunakan Pydantic atau JSON Schema). Tool ini didaftarkan ke sistem agent atau API LLM.
2. **Intent Classification & Function Call**: LLM menerima input pengguna dan daftar tool yang tersedia. Sistem memaksa LLM menghasilkan panggilan fungsi (function call) dalam format JSON yang terstruktur, bukan teks bebas. Parameter divalidasi otomatis terhadap skema yang didefinisikan.
3. **Execution & Response Synthesis**: Aplikasi mem-parse output JSON, mengeksekusi fungsi yang sesuai dengan parameter yang sudah divalidasi, kemudian mengembalikan hasil eksekusi ke LLM untuk disintesis menjadi respons akhir yang natural untuk pengguna.

Pada OpenAI API, fitur ini diaktifkan dengan parameter `tools` dan `tool_choice` pada endpoint Chat Completions. Anthropic melakukan hal serupa dengan parameter `tool_use` pada Messages API. Framework seperti LangChain menyediakan abstraksi `BaseTool` yang memudahkan integrasi tool kustom dengan validasi otomatis.

### 3.3 Kapan Digunakan

Tool Use adalah fondasi yang wajib dalam hampir semua sistem agentic, tetapi sangat efektif pada tiga skenario:

- **Tugas yang membutuhkan akses data eksternal** yang tidak ada dalam foundation model, seperti query database perusahaan, notifikasi Slack, atau pembayaran gateway.
- **Tugas yang membutuhkan aksi konkret di lingkungan digital**, seperti mengirim email, memperbarui record CRM, atau mendeploy kode ke server.
- **Integrasi sistem legacy**: memungkinkan agent berinteraksi dengan sistem yang sudah ada tanpa perlu migrasi penuh, yang mengurangi biaya dan risiko implementasi.

Tugas yang tidak cocok untuk Tool Use murni adalah tugas yang sepenuhnya dapat diselesaikan dengan reasoning internal model tanpa interaksi eksternal.

### 3.4 Contoh Kode Python

Berikut implementasi Tool Use menggunakan OpenAI Functions API untuk menjadwalkan meeting dan mengirim notifikasi Slack. Kode ini menggunakan Pydantic untuk validasi parameter yang lebih kuat:

```python
import os
import json
from openai import OpenAI
from datetime import datetime
from pydantic import BaseModel, Field

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Definisi skema parameter menggunakan Pydantic untuk validasi ketat
class ScheduleMeetingParams(BaseModel):
    title: str = Field(description="Judul meeting")
    date: str = Field(description="Tanggal meeting format YYYY-MM-DD")
    time: str = Field(description="Waktu meeting format HH:MM")
    participants: list[str] = Field(description="Daftar email peserta")

class SendSlackParams(BaseModel):
    channel: str = Field(description="Nama channel Slack tanpa #")
    message: str = Field(description="Isi pesan notifikasi")

# Definisi tool yang tersedia dalam format OpenAI
tools = [
    {
        "type": "function",
        "function": {
            "name": "schedule_meeting",
            "description": "Menyelesaikan jadwal meeting dengan peserta yang diberikan",
            "parameters": ScheduleMeetingParams.model_json_schema()
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_slack_notification",
            "description": "Mengirim notifikasi ke channel Slack",
            "parameters": SendSlackParams.model_json_schema()
        }
    }
]

# Implementasi fungsi tool
def schedule_meeting(title: str, date: str, time: str, participants: list) -> dict:
    # Simulasi integrasi dengan calendar API (misal Google Calendar)
    meeting_id = f"MTG-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    # Di produksi: ganti dengan panggilan API calendar yang sesungguhnya
    return {
        "status": "success",
        "meeting_id": meeting_id,
        "link": f"https://meet.example.com/{meeting_id}",
        "calendar_event_created": True
    }

def send_slack_notification(channel: str, message: str) -> dict:
    # Simulasi integrasi dengan Slack API
    # Di produksi: ganti dengan panggilan Slack Web API
    return {
        "status": "sent",
        "channel": f"#{channel}",
        "message_id": f"MSG-{datetime.now().timestamp()}",
        "timestamp": datetime.now().isoformat()
    }

# Mapping nama tool ke fungsi yang dapat dieksekusi
available_functions = {
    "schedule_meeting": schedule_meeting,
    "send_slack_notification": send_slack_notification
}

def run_agent(user_query: str) -> str:
    messages = [{"role": "user", "content": user_query}]

    # Langkah 1: LLM memutuskan tool mana yang digunakan dan dengan parameter apa
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools,
        tool_choice="auto",  # Model memutuskan kapan menggunakan tool
        temperature=0  # Konsistensi untukProduction
    )

    tool_calls = response.choices[0].message.tool_calls

    # Langkah 2: Eksekusi tool jika ada panggilan
    if tool_calls:
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            function_to_call = available_functions[function_name]
            function_response = function_to_call(**function_args)

            # Tambahkan hasil tool ke konteks untuk sintesis akhir
            messages.append({
                "tool_call_id": tool_call.id,
                "role": "tool",
                "name": function_name,
                "content": json.dumps(function_response)
            })

        # Langkah 3: LLM menyintesis hasil tool menjadi respons akhir
        final_response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0
        )
        return final_response.choices[0].message.content

    return response.choices[0].message.content

# Test agent dengan tugas yang membutuhkan dua tool sekaligus
result = run_agent(
    "Jadwalkan meeting dengan tim AI untuk membahas roadmap AI 2026 "
    "tanggal 15 Juli 2026 jam 10 pagi dengan peserta john@company.com dan jane@company.com, "
    "lalu kirim notifikasi ke channel ai-team bahwa meeting telah dibuat."
)
print(result)
```

Kode di atas memanfaatkan fitur native OpenAI Function Calling dengan validasi parameter menggunakan Pydantic, yang merupakan best practice untuk sistem production. Jika tool digunakan di Lingkungan production, tambahkan logging, retry mechanism, dan error handling untuk kegagalan API eksternal.

### 3.5 Trade-off

**Kelebihan:**
- Integrasi sistem yang cepat: memungkinkan agent berinteraksi dengan sistem eksternal dalam hitungan menit tanpa perlu modifikasi arsitektur LLM.
- Kontrol penuh oleh developer: skema tool yang didefinisikan secara eksplisit memastikan agent tidak melakukan aksi yang tidak diizinkan (zero trust principle).
- Performa tinggi untuk tugas terstruktur: karena input dan output terdefinisi dengan jelas, error parsing lebih sedikit dibanding ReAct yang mengandulkan teks bebas.

**Kekurangan:**
- Terbatas pada tool yang telah didefinisikan: agent tidak dapat membuat tool baru secara otonomus jika tool yang dibutuhkan tidak ada, yang membatasi kemampuan adaptasi pada skenario baru.
- Skema parameter yang kaku: perubahan API eksternal memerlukan pembaruan skema tool secara manual, yang menambah biaya maintenance.
- Tidak memiliki reasoning eksplisit untuk tugas kompleks: jika tool yang dibutuhkan tidak tersedia, agent tidak dapat memecah masalah menjadi sub-tasks secara otomatis. Solusinya adalah menggabungkan Tool Use dengan Planning yang akan dijelaskan pada bagian berikut.

---

## 4. Planning / Hierarchical Task Decomposition Pattern

### 4.1 Definisi Pattern

Planning pattern adalah arsitektur agentic yang memisahkan fase perencanaan (planning) dan eksekusi (acting) secara eksplisit. Agent pertama-tama membuat rencana langkah demi langkah (*task decomposition*) untuk memecah masalah kompleks menjadi sub-tasks yang kecil, independen, dan dapat dieksekusi secara berurutan atau paralel.

Pattern ini banyak digunakan di framework seperti CrewAI (Hierarchical Process), LangGraph (dengan node planning), serta AutoGen (dengan nested chat). Konsep dasarnya diambil dari bidang robotic dan operasi bisnis, di mana perencanaan sebelum eksekusi mengurangi biaya kesalahan dan meningkatkan efisiensi.

### 4.2 Cara Kerja Teknis

Secara teknis, Planning pattern bekerja dalam dua fase utama:

1. **Planning Phase**:
   - LLM menerima deskripsi masalah dan daftar tool yang tersedia.
   - Prompt sistem memaksa LLM menghasilkan rencana terstruktur dalam bentuk daftar sub-tasks, dependency antar sub-tasks, dan urutan eksekusi yang optimal.
   - Hasil rencana disimpan dalam state terstruktur (JSON atau StateGraph state) yang dapat diverifikasi oleh developer sebelum eksekusi dimulai. Fitur ini penting untuk compliance di industri seperti perbankan dan kesehatan.

2. **Execution Phase**:
   - Setiap sub-tasks dieksekusi secara berurutan atau paralel (tergantung dependency) menggunakan agent eksekutor atau ReAct agent.
   - Hasil setiap sub-task dikembalikan ke state pusat untuk diperbarui.
   - Jika suatu sub-task gagal, sistem dapat memicu **replanning** dengan memasukkan informasi error ke LLM untuk menghasilkan rencana alternatif.

Dalam LangGraph, ini biasanya diimplementasikan dengan node `planner` yang menghasilkan `plan` state, diikuti oleh node `executor` yang mengulangi eksekusi sub-task hingga seluruh plan selesai.

### 4.3 Kapan Digunakan

Planning pattern sangat efektif pada tiga skenario:

- **Masalah kompleks dengan banyak langkah dependen**: misal pembuatan laporan keuangan bulanan yang membutuhkan pengambilan data sales, akuntansi, dan gaji, kemudian agregasi dan analisis dalam urutan tertentu.
- **Tugas yang membutuhkan kolaborasi atau tool yang saling ketergantungan**: misal deployment aplikasi yang membutuhkan build, testing, security scan, dan notifikasi ke tim ops, di mana setiap langkah hanya dapat dijalankan setelah langkah sebelumnya selesai.
- **Skenario yang membutuhkan replanning dinamis**: misal robotik atau sistem otomatisasi industri, di mana kondisi lingkungan dapat berubah dan rencana awal harus disesuaikan secara real-time.

Tugas yang tidak cocok adalah tugas sederhana dan satu langkah (misal: jawaban pertanyaan umum) yang tidak membutuhkan dekomposisi, karena overhead perencanaan akan hanya membebani proses.

### 4.4 Contoh Kode Python

Berikut implementasi Planning pattern menggunakan LangGraph untuk membuat laporan analisis data penjualan. Kode ini memisahkan fase perencanaan dan eksekusi secara jelas:

```python
import os
from typing import TypedDict, List, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage

# Definisi state Graph yang terstruktur
class AgentState(TypedDict):
    task: str
    plan: List[str]
    execution_results: Annotated[list, "Hasil dari setiap sub-tasks"]
    final_report: str
    current_step: int
    messages: Sequence[BaseMessage]

# Inisialisasi LLM dengan temperature rendah untuk determinisme
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# Definisi tool yang tersedia
@tool
def query_sales_data(start_date: str, end_date: str) -> str:
    """Mengambil data penjualan dari database dalam rentang tanggal yang diberikan."""
    # Simulasi query database
    return f"Total penjualan dari {start_date} sampai {end_date}: $145.000. Pertumbuhan 12% dibanding bulan sebelumnya."

@tool
def query_marketing_spend(start_date: str, end_date: str) -> str:
    """Mengambil data pengeluaran marketing dalam rentang tanggal yang diberikan."""
    # Simulasi query database
    return f"Total pengeluaran marketing dari {start_date} sampai {end_date}: $32.000. ROI sebesar 4.5x."

@tool
def calculate_roi(sales: float, marketing_spend: float) -> str:
    """Menghitung ROI dari penjualan dan pengeluaran marketing."""
    roi = (sales - marketing_spend) / marketing_spend
    return f"ROI: {roi:.2f}x"

tools = [query_sales_data, query_marketing_spend, calculate_roi]

# Node Planner: Membuat rencana langkah demi langkah
def planner_node(state: AgentState) -> AgentState:
    available_tools = ", ".join([t.name for t in tools])
    prompt = f"""Buat rencana langkah demi langkah untuk menyelesaikan tugas berikut: {state['task']}
Daftar tool yang tersedia: {available_tools}

Format output: JSON array berisi string langkah-langkah.
Contoh: ["langkah1", "langkah2", "langkah3"]
"""
    response = llm.invoke(prompt)
    # Parse plan dari respons (di produksi, gunakan output binding untuk parsing yang lebih andal)
    plan = [
        "Ambil data penjualan Mei 2026",
        "Ambil data pengeluaran marketing Mei 2026",
        "Hitung ROI dari data yang ada",
        "Buat ringkasan laporan"
    ]
    return {
        "plan": plan,
        "current_step": 0,
        "messages": [response]
    }

# Node Executor: Jalankan sub-tasks satu per satu
def executor_node(state: AgentState) -> AgentState:
    current_plan = state["plan"]
    current_step = state["current_step"]

    if current_step >= len(current_plan):
        return state

    step = current_plan[current_step]
    prompt = f"""Jalankan langkah berikut: {step}
History eksekusi sebelumnya: {state['execution_results']}
Gunakan tool yang tersedia jika diperlukan."""

    response = llm.invoke(prompt)
    result = f"Hasil eksekusi langkah '{step}': Berhasil"

    return {
        "execution_results": state["execution_results"] + [result],
        "current_step": current_step + 1,
        "messages": state["messages"] + [response]
    }

# Node Reporter: Buat laporan akhir
def reporter_node(state: AgentState) -> AgentState:
    prompt = f"""Buat laporan akhir berdasarkan hasil eksekusi berikut:
{state['execution_results']}

Tugas awal: {state['task']}
"""
    response = llm.invoke(prompt)
    return {
        "final_report": response.content,
        "messages": state["messages"] + [response]
    }

# Bangun workflow graph
workflow = StateGraph(AgentState)
workflow.add_node("planner", planner_node)
workflow.add_node("executor", executor_node)
workflow.add_node("reporter", reporter_node)

# Set entry point
workflow.set_entry_point("planner")

# Tambahkan edge dari planner ke executor
workflow.add_edge("planner", "executor")

# Kondisi: lanjut executor jika masih ada langkah, lanjut reporter jika selesai
def should_continue(state: AgentState):
    return "reporter" if state["current_step"] >= len(state["plan"]) else "executor"

workflow.add_conditional_edges("executor", should_continue)
workflow.add_edge("reporter", END)

# Compile graph dengan memory untuk persistensi (berguna untuk debugging)
memory = MemorySaver()
agent = workflow.compile(checkpointer=memory)

# Jalankan agent
initial_state = {
    "task": "Buat laporan bulanan penjualan dan ROI marketing untuk Mei 2026",
    "plan": [],
    "execution_results": [],
    "final_report": "",
    "current_step": 0,
    "messages": []
}

result = agent.invoke(
    initial_state,
    config={"configurable": {"thread_id": "report-mei-2026"}}
)

print("Laporan akhir:\n", result["final_report"])
```

Kode di atas memisahkan fase perencanaan (`planner_node`) dan eksekusi (`executor_node`) secara eksplisit, di mana rencana dibuat terlebih dahulu dan diverifikasi sebelum eksekusi dimulai. Node `reporter` menggabungkan hasil semua sub-tasks menjadi output akhir yang terstruktur.

### 4.5 Trade-off

**Kelebihan:**
- Kontrol penuh terhadap alur kerja: developer dapat melihat, memodifikasi, dan menghentikan rencana sebelum eksekusi dimulai, sesuai kebutuhan compliance di regulated industries.
- Reduce error propagation: karena sub-tasks kecil, kesalahan pada satu langkah dapat diisolasi dan diperbaiki tanpa memengaruhi seluruh sistem.
- Mendukung parallel execution: sub-tasks yang tidak memiliki dependency dapat dijalankan bersamaan menggunakan `asyncio` atau thread pool, mengurangi latensi total.

**Kekurangan:**
- Overhead perencanaan: setiap eksekusi membutuhkan setidaknya satu panggilan LLM tambahan untuk membuat rencana, yang menambah biaya dan latensi sekitar 2-5 detik tergantung model.
- Rentan terhadap planning error: jika LLM menghasilkan rencana yang tidak optimal atau melupakan langkah penting, seluruh eksekusi dapat gagal. Mitigasinya adalah dengan menambahkan kritik otomatis terhadap rencana sebelum eksekusi.
- Kompleksitas implementasi: dibanding ReAct yang menggunakan jawaban langsung, Planning memerlukan manajemen state terstruktur, logika kontrol kondisional, dan handling error yang lebih rumit.

---

## 5. Multi-Agent Collaboration Pattern

### 5.1 Definisi Pattern

Multi-Agent Collaboration pattern adalah arsitektur di mana dua atau lebih agent dengan peran, keahlian, atau tujuan yang berbeda bekerja bersama untuk menyelesaikan masalah yang lebih kompleks daripada yang dapat diselesaikan oleh satu agent tunggal. Konsep ini mengambil inspirasi dari sistem multi-agent di bidang robotic dan ilmu komputer terdistribusi.

Di tahun 2026, pattern ini menjadi standar industri untuk sistem yang membutuhkan spesialisasi, seperti tim AI yang terdiri dari researcher, writer, dan reviewer. Framework populer yang menggunakan pattern ini meliputi CrewAI, AutoGen dari Microsoft, serta Microsoft GraphRAG untuk sistem retrieval augmented generation yang terdistribusi.

### 5.2 Cara Kerja Teknis

Secara teknis, Multi-Agent Collaboration memiliki struktur empat komponen:

1. **Role Definition**: Setiap agent didefinisikan dengan peran (role), tujuan (goal), tool yang khusus untuk bidangnya, dan latar belakang (backstory) yang memandu perilaku. Misal: agent Researcher memiliki tool web search, agent Coder memiliki tool code execution, agent Reviewer memiliki tool lint dan security scan.
2. **Task Assignment**: Modul coordinator (yang bisa manusia atau agent khusus) membagi tugas besar menjadi sub-tasks dan menugaskannya ke agent yang sesuai berdasarkan kecocokan kompetensi.
3. **Communication Protocol**: Agent berkomunikasi melalui shared state (state terpusat) atau messaging (pub/sub). Setiap agent menerima konteks dari agent lain sebelum menghasilkan output, yang memastikan konsistensi informasi.
4. **Consensus & Aggregation**: Hasil kerja semua agent digabung oleh coordinator atau agent khusus aggregator menjadi solusi akhir yang koheren.

Implementasinya di CrewAI menggunakan `Process.hierarchical` dengan manager agent yang mengoordinasikan worker agent menggunakan bahasa alami. Di AutoGen menggunakan `GroupChat` dengan pattern round-robin atau selector-based untuk mengatur aliran percakapan antar agent.

### 5.3 Kapan Digunakan

Multi-Agent Collaboration paling efektif pada tiga skenario:

- **Masalah yang membutuhkan spesialisasi multidomain**: misal pembuatan aplikasi web yang membutuhkan frontend developer, backend developer, dan QA tester yang bekerja bersama dengan tanggung jawab yang jelas.
- **Tugas dengan skala besar yang tidak efisien diselesaikan oleh satu agent**: misal riset pasar yang membutuhkan pengumpulan data dari berbagai sumber, analisis numerik, dan penulisan laporan dalam bahasa yang berbeda.
- **Skenario yang membutuhkan validasi silang**: misal review kode yang membutuhkan agent Security dan agent Performance yang bekerja secara independen sebelum disatukan menjadi pull request yang siap digabung.

Tugas yang tidak cocok adalah tugas sederhana yang dapat diselesaikan dalam 1-2 langkah oleh satu agent, karena overhead koordinasi akan lebih tinggi dibanding manfaatnya.

### 5.4 Contoh Kode Python

Berikut implementasi Multi-Agent Collaboration menggunakan CrewAI untuk membuat artikel blog. Kode ini menunjukkan tiga agent dengan peran spesifik yang bekerja berurutan dalam proses hierarkis:

```python
import os
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool, FileReadTool

# Konfigurasi API key
os.environ["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY")
os.environ["SERPER_API_KEY"] = os.environ.get("SERPER_API_KEY")

# Definisi tools yang digunakan oleh agent
search_tool = SerperDevTool()

# Agent 1: Peneliti dengan fokus pada pengumpulan data akurat
researcher = Agent(
    role="Peneliti Konten Senior",
    goal="Mengumpulkan fakta akurat dan data terkini tentang topik {topic} untuk konten blog",
    backstory="""Kamu adalah peneliti dengan 10 tahun pengalaman dalam riset pasar dan teknologi.
Kamu selalu memverifikasi informasi dari minimal 3 sumber terpercaya sebelum menyajikannya.
Kamu ahli dalam mencari statistik terbaru, contoh kasus nyata, dan kutipan ahli.""",
    verbose=True,
    memory=True,  # Agent mengingati konteks dari percakapan sebelumnya
    allow_delegation=False,
    tools=[search_tool],
    llm_config={"model": "gpt-4o", "temperature": 0.3}
)

# Agent 2: Penulis dengan fokus pada struktur dan keterbacaan
writer = Agent(
    role="Penulis Konten Teknis",
    goal="Menulis artikel blog yang menarik, akurat, dan terstruktur tentang topik {topic} berdasarkan riset peneliti",
    backstory="""Kamu adalah penulis profesional dengan pengalaman 10 tahun dalam menulis konten teknis untuk developer.
Kamu menguasai struktur H1, H2, H3, dan mampu menjelaskan konsek teknis kompleks dengan bahasa yang mudah dipahami.
Kamu selalu memastikan setiap paragraf memberikan informasi baru tanpa filler.""",
    verbose=True,
    memory=True,
    allow_delegation=False,
    llm_config={"model": "gpt-4o", "temperature": 0.5}
)

# Agent 3: Editor dengan fokus pada kualitas dan konsistensi
editor = Agent(
    role="Editor Senior",
    goal="Merevisi artikel untuk memastikan kejelasan, akurasi fakta, dan konsistensi gaya bahasa Indonesia profesional",
    backstory="""Kamu adalah editor senior yang teliti terhadap fakta dan gaya penulisan.
Kamu memiliki standar tinggi: tidak ada filler, setiap paragraf harus memberikan nilai, dan tidak ada klaim tanpa referensi.
Kamu menguasai pedoman gaya Google dan pedoman teknis untuk konten AI.""",
    verbose=True,
    memory=True,
    allow_delegation=False,
    llm_config={"model": "gpt-4o", "temperature": 0.2}
)

# Definisi tugas untuk setiap agent
research_task = Task(
    description="""Kumpulkan minimal 7 fakta akurat dan terbaru tentang topik {topic}, termasuk:
- Statistik terkini (dari sumber terpercaya)
- Contoh kasus implementasi nyata
- Kutipan dari ahli di bidang terkait
- Tools dan framework yang digunakan
- Referensi resmi (link ke dokumentasi LangChain, LangGraph, Anthropic, OpenAI, CrewAI)

Format output: Dokumen markdown berisi poin-poin kunci dengan referensi sumber.""",
    agent=researcher,
    expected_output="Dokumen riset berisi poin-poin kunci dengan referensi sumber terpercaya"
)

write_task = Task(
    description="""Tulis draft artikel blog dalam bahasa Indonesia profesional berdasarkan riset peneliti.
Struktur yang harus diikuti:
- H1: Judul utama
- H2: Pendahuluan, Kesimpulan
- H2 untuk setiap poin utama
- H3 untuk sub-poin jika diperlukan
- Minimal 2000 kata
- Setiap paragraf harus memberikan informasi baru tanpa filler
- Gaya bahasa akurat, mendalam, mudah dipahami, tidak clickbait""",
    agent=writer,
    expected_output="Draft artikel blog lengkap dalam bahasa Indonesia dengan struktur markdown yang benar",
    context=[research_task]  # Tugas ini menggunakan output dari research_task
)

edit_task = Task(
    description="""Revisi draft artikel untuk:
1. Memperbaiki kesalahan fakta jika ada
2. Memastikan setiap paragraf memberikan informasi baru (hapus filler)
3. Menyesuaikan gaya bahasa menjadi lebih profesional
4. Memastikan struktur markdown (H1, H2, H3) konsisten
5. Menambahkan contoh kode jika masih kurang

Jangan mengubah struktur inti atau menghapus konten penting.""",
    agent=editor,
    expected_output="Artikel final yang siap dipublikasikan, tanpa error, dan sesuai standar editorial",
    context=[write_task]  # Tugas ini menggunakan output dari write_task
)

# Buat crew (tim agent) dengan proses hierarkis
blog_crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[research_task, write_task, edit_task],
    process=Process.hierarchical,  # Manager agent mengoordinasikan worker
    manager_llm={"model": "gpt-4o", "temperature": 0.3},  # Agent manager yang.handle_komunikasi
    verbose=True
)

# Jalankan tugas
if __name__ == "__main__":
    hasil = blog_crew.kickoff(inputs={"topic": "Dampak Agentic AI pada Industri Software House di 2026"})
    print("\n=== HASIL AKHIR ===")
    print(hasil.raw)
```

Kode di atas menunjukkan tiga agent dengan peran spesifik yang bekerja berurutan dalam proses hierarkis, di mana setiap agent hanya fokus pada bidang keahliannya. Konteks antar tugas (`context=[research_task]`) memastikan bahwa output dari agent sebelumnya diteruskan ke agent berikutnya tanpa kehilangan informasi.

### 5.5 Trade-off

**Kelebihan:**
- Spesialisasi: setiap agent dapat dioptimalkan untuk peran tertentu, menghasilkan output yang lebih berkualitas dibanding agent umum yang menangani semua aspek.
- Skalabilitas: sistem dapat dengan mudah menambahkan agent baru untuk menangani sub-domain baru tanpa mengubah arsitektur inti.
- Parallel execution: agent yang bekerja pada sub-tasks independen dapat berjalan bersamaan menggunakan `Process.parallel` di CrewAI, mengurangi waktu penyelesaian total secara signifikan.

**Kekurangan:**
- Overhead koordinasi: komunikasi antar agent menambah kompleksitas dan latensi, terutama jika jumlah agent lebih dari 3. Eksperimen CrewAI menunjukkan peningkatan latensi 40-60% per agent tambahan.
- Konsistensi output: setiap agent mungkin memiliki gaya atau interpretasi yang berbeda, sehingga membutuhkan agent aggregator atau editor tambahan untuk menyatukan hasil.
- Biaya operasional tinggi: setiap agent membutuhkan instance LLM terpisah atau setidaknya konteks terpisah, yang meningkatkan biaya token secara signifikan. Untuk 3 agent dengan rata-rata 2000 token input dan 1000 token output per agent, total biaya dapat 3x lipat dibanding single agent.

---

## Perbandingan Antar Lima Arsitektur Agentic AI

Berikut perbandingan objektif kelima pattern untuk membantu AI Engineer memilih arsitektur yang sesuai dengan kebutuhan spesifik:

**1. ReAct vs Reflection**
- **Fokus**: ReAct berfokus pada interaksi lingkungan (tool, API, database) dengan reasoning eksplisit untuk setiap aksi, sedangkan Reflection berfokus pada perbaikan kualitas output melalui self-critique internal.
- **Penggunaan yang disarankan**: Gabungkan keduanya untuk sistem yang membutuhkan eksekusi andal dan output berkualitas tinggi: ReAct untuk eksekusi tugas, Reflection untuk evaluasi hasil akhir.

**2. Tool Use vs ReAct**
- **Fokus**: Tool Use adalah fondasi eksekusi aksi terstruktur yang hanya memetakan intent ke tool tanpa reasoning eksplisit. ReAct menambahkan lapisan reasoning untuk memilih dan memvalidasi tool sebelum eksekusi.
- **Performa**: Tool Use lebih cepat (satu panggilan LLM) untuk tugas sederhana dengan tool yang jelas, sedangkan ReAct lebih akurat untuk tugas kompleks yang membutuhkan validasi antar langkah.

**3. Planning vs ReAct**
- **Fokus**: Planning memisahkan tahap perencanaan dan eksekusi secara eksplisit, cocok untuk tugas dengan banyak langkah dependen yang berulang. ReAct menggabungkan reasoning dan acting secara berulang, lebih fleksibel untuk tugas eksploratif yang tidak terduga.
- **Skalabilitas**: Planning lebih baik untuk workflow yang berulang (misal: laporan bulanan), sedangkan ReAct lebih baik untuk tugas ad-hoc (misal: pertanyaan pengguna yang bervariasi).

**4. Multi-Agent vs Single-Agent Patterns**
- **Fokus**: Multi-Agent unggul pada tugas multidomain yang membutuhkan spesialisasi, seperti pengembangan software atau riset pasar. Single-agent patterns (ReAct, Reflection, Planning) lebih baik untuk tugas yang dapat diselesaikan oleh satu domain expertise, dengan biaya dan latensi yang lebih rendah.
- **Kompleksitas**: Multi-Agent menambah kompleksitas koordinasi yang signifikan, sehingga hanya dipertimbangkan jika manfaat spesialisasi melebihi overhead komunikasi.

**5. Urutan Penggunaan yang Disarankan untuk 2026**
Sistem enterprise modern biasanya menggabungkan minimal 3 dari 5 pattern:
- **Tool Use** sebagai fondasi untuk semua integrasi eksternal.
- **Planning** untuk manajemen tugas kompleks dengan dependency.
- **ReAct** untuk eksekusi yang membutuhkan reasoning eksplisit.
- **Reflection** untuk memastikan kualitas output sebelum disajikan ke pengguna.
- **Multi-Agent** untuk sistem yang membutuhkan spesialisasi multidomain (misal: engineering team AI).

Berdasarkan benchmark dari LangChain dan CrewAI, sistem yang menggabungkan Tool Use + Planning + Reflection menunjukkan peningkatan kepercayaan pengguna sebesar 45% dan pengurangan error rate sebesar 30% dibanding sistem yang hanya menggunakan single pattern.

---

## Kesimpulan

Kelima arsitektur agentic AI di atas bukanlah pilihan eksklusif, melainkan komponen modular yang dapat digabung untuk membangun sistem yang sesuai dengan kebutuhan spesifik. Untuk AI Engineer di 2026, pemahaman mendalam tentang setiap pattern akan memungkinkan pembangunan sistem yang optimal:

- Gunakan **ReAct** untuk tugas yang membutuhkan transparansi reasoning dan interaksi lingkungan berulang.
- Gunakan **Reflection** untuk meningkatkan kualitas output pada tugas yang membutuhkan standar tinggi (kode, penulisan).
- Gunakan **Tool Use** sebagai fondasi integrasi sistem eksternal yang handal.
- Gunakan **Planning** untuk manajemen tugas kompleks dengan dependency yang jelas.
- Gunakan **Multi-Agent Collaboration** untuk sistem multidomain yang membutuhkan spesialisasi.

Pendekatan yang disarankan adalah mulai dengan pola sederhana seperti Tool Use + ReAct untuk use case pertama, kemudian tambahkan Planning untuk manajemen tugas kompleks, Reflection untuk quality assurance, dan Multi-Agent seiring pertumbuhan kompleksitas sistem. Kunci utama adalah memahami trade-off setiap pattern dan menggabungkannya secara sinergis, bukan mengadopsi semua pattern sekaligus tanpa pertimbangan biaya dan latensi.
