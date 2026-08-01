---
title: 'Sandboxing Code Execution Agent: Menjalankan Kode Agen dengan Aman'
description: 'Sandboxing code execution agent mengisolasi kode yang dihasilkan LLM agar tak merusak sistem. Pelajari arsitektur, container, dan praktik keamanan produksi.'
pubDate: '2026-08-01'
heroImage: '../../assets/blog-placeholder-27.jpg'
---

Agen yang bisa menulis dan menjalankan kode adalah kekuatan sekaligus risiko. Kode yang dihasilkan model bisa saja mencoba mengakses file sensitif atau memanggil jaringan tak diinginkan. Sandboxing mengisolasi eksekusi tersebut demi keamanan sistem.

## Definisi

Sandboxing code execution adalah praktik menjalankan kode yang dibuat agen di dalam lingkungan terisolasi—container, VM, atau runtime terbatas—yang membatasi akses sistem file, jaringan, dan sumber daya. Tujuannya: agen bebas bereksperimen tanpa membahayakan host.

## Masalah yang Diselesaikan

LLM tidak kebal dari menghasilkan kode berbahaya atau salah. Tanpa isolasi, kode bisa menghapus data, membocorkan rahasia, atau menjadi vektor serangan. Sandbox menjamin kerusakan terbatas pada lingkungan sementara yang mudah dibuang.

## Cara Kerja

Agen menghasilkan kode, lalu dikirim ke sandbox runner. Runner membuat container ephemeral dengan resource limit (CPU, memori), filesystem read-only atau temp, dan jaringan diblokir除非 diizinkan. Output dan status dikembalikan ke agen. Setelah selesai, container dihancurkan.

## Arsitektur dan Komponen

- **Code executor**: menjalankan kode di runtime terbatas.
- **Resource limiter**: cgroup/quotas CPU, memori, waktu.
- **Network policy**: allowlist egress.
- **Filesystem isolation**: volume temp.
- **Orchestrator**: membuat/menghancurkan sandbox.

## Contoh Kode Production-Ready

```python
import docker
import uuid

client = docker.from_env()

def run_sandboxed(code: str, timeout: int = 30):
    container = client.containers.run(
        "python:3.12-slim",
        command=["python", "-c", code],
        network_mode="none",        # tanpa akses jaringan
        mem_limit="128m",
        cpu_quota=50000,            # ~0.5 CPU
        detach=True,
        remove=True,
        stdout=True,
        stderr=True,
    )
    try:
        exit_status = container.wait(timeout=timeout)
        logs = container.logs().decode()
        return {"status": exit_status["StatusCode"], "logs": logs}
    except Exception as e:
        container.kill()
        return {"status": -1, "logs": str(e)}

print(run_sandboxed("print(2**10)"))
```

## Kapan Dipakai dan Tidak

Gunakan saat agen perlu menjalankan kode tak terpercaya: analitik data, generasi laporan, atau coding agent. Hindari sandbox berat untuk tugas deterministik aman yang cukup divalidasi statis.

## Alternatif

- **WASM runtime**: isolasi ringan tanpa container.
- **API terbatas**: agen memanggil fungsi aman bukan kode bebas.
- **Review manusia**: untuk kode kritis sebelum dijalankan.

## Kelebihan dan Kekurangan

Kelebihan: isolasi kuat, batas resource, reversibel. Kekurangan: overhead startup container dan kompleksitas operasional.

## Best Practice

Selalu blokir jaringan secara default. Batasi waktu dan memori. Gunakan image minimal. Hancurkan sandbox setelah eksekusi. Catat semua eksekusi untuk audit.

## Kesalahan Umum

Membiarkan akses jaringan terbuka, tidak membatasi memori (memory exhaustion), dan menggunakan sandbox bersama antar-tugas yang bocor state.

## Isolasi Multi-Tenant dan Reuse Sandbox

Di lingkungan produksi yang melayani banyak pengguna, sandbox tidak boleh berbagi state. Jika dua tugas berjalan dalam sandbox yang sama berturut-turut tanpa pembersihan, tugas pertama bisa menyisakan file atau variabel lingkungan yang dibaca tugas kedua—kebocoran data antar penyewa. Solusinya: setiap eksekusi menggunakan volume temp yang dibuat khusus dan dihapus setelahnya.

Namun membuat container baru tiap panggilan mahal. Compromise umum adalah pool sandbox: sekelompok container hangat yang dipakai bergiliran, namun antara pemakaian dilakukan reset menyeluruh (hapus volume, reset user, bersihkan memori). Reset yang tak sempurna adalah lubang keamanan; uji dengan skenario "tugas jahat lalu tugas korban" secara berkala.

Untuk isolasi lebih dalam, tambahkan seccomp dan AppArmor guna membatasi panggilan sistem yang diizinkan. Kode agen tak perlu memanggil `fork` atau mengakses `ptrace`; memblokirnya menyempitkan permukaan serangan secara drastis.

Terakhir, pasang batas waktu total (wall-clock) di luar batas CPU. Kode yang menunggu I/O tak berujung akan tetap memakan slot sandbox; pembunuhan otomatis berdasar waktu menyelamatkan kapasitas sistem. Kombinasi container ephemeral, reset ketat, dan pembatasan syscall membentuk pertahanan berlapis bagi eksekusi kode agen.

## Observabilitas Eksekusi

Menjalankan kode di sandbox tak berarti kita buta terhadap apa yang terjadi di dalamnya. Setiap eksekusi harus meninggalkan jejak: siapa memanggil, kode apa, durasi, penggunaan CPU/memori puncak, dan status keluar. Jejak ini krusial saat men-debug perilaku agen yang tak terduga.

Metrik agregat membantu mendeteksi pola. Misalnya, jika rata-rata durasi eksekusi naik tiba-tiba, mungkin ada kode yang menunggu jaringan yang seharusnya diblokir, atau model menghasilkan loop tak berujung. Pantau pula rasio kegagalan; lonjakan bisa mengindikasikan prompt agen berubah sehingga menghasilkan kode invalid.

Untuk keamanan, catat syscall yang diblokir. Banyak upaya akses terlarang yang tercatat bisa menjadi sinyal agen disusupi atau sekadar bug. Log ini, dipadukan dengan alert, mengubah sandbox dari kotak hitam menjadi komponen yang diawasi.

Terakhir, simpan output eksekusi (dengan redaksi rahasia) untuk audit. Bila pengguna mengeluh hasil salah, tim bisa merekonstruksi persis kode dan lingkungan yang dipakai. Observabilitas adalah jembatan antara isolasi keamanan dan kemudahan operasional harian.

## FAQ

**Apakah container cukup aman?**
Untuk mayoritas kasus ya, asalkan resource dan jaringan dibatasi. Untuk isolasi maksimal, gunakan microVM.

**Berapa overhead sandbox?**
Puluhan hingga ratusan milidetik per container. Untuk eksekusi masif, gunakan pool sandbox yang dipakai ulang dengan hati-hati.

**Apakah bisa menjalankan kode bahasa lain?**
Bisa, asalkan image runtime tersedia dan kebijakan isolasi sama diterapkan.

**Bagaimana mencegah exfiltrasi data lewat jaringan?**
Blokir egress secara default; hanya izinkan domain allowlist bila benar dibutuhkan.

**Istilah seperti container dan cgroup sering membingungkan—di mana penjelasannya?**
Penjelasan istilah tersebut tersedia di [glossary](/glossary/) blog ini.

## Backlink References
- [Docker Security](https://docs.docker.com/engine/security/)
- [OpenAI Code Interpreter](https://platform.openai.com/docs/assistants/tools/code-interpreter)
- [GitHub Actions Runners Security](https://docs.github.com/en/actions/hosting-your-own-runners)

---

## Hubungan artikel ini dengan artikel lain di blog:
- [Agent Security Guardrails](./agent-security-guardrails.md) — perlindungan agen dari risiko
- [Tool Design Patterns](./tool-design-patterns.md) — merancang tool eksekusi aman
- [Memory Systems for Agents](./memory-systems-for-agents.md) — isolasi state antar tugas

Untuk menjalankan agen dengan eksekusi kode aman di bisnis, layanan [AI Agentic untuk UMKM](https://superkilat.com/layanan/ai-agentic-umkm) dari superkilat.com menyediakan infrastruktur terisolasi.
