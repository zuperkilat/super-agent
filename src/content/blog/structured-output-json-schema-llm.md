---
title: 'Structured Output JSON Schema LLM: Respons Terstruktur Tanpa Parsing Error'
description: 'Structured output JSON Schema LLM memastikan model mengembalikan JSON valid sesuai skema. Pelajari cara kerja, implementasi, dan praktik produksi.'
pubDate: '2026-08-01'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

Model bahasa besar (LLM) secara bawaan menghasilkan teks bebas. Kelemahan ini mengganggu ketika output harus masuk ke sistem lain—database, API, atau antarmuka yang menuntut struktur ketat. Structured output dengan JSON Schema menjawab masalah itu dengan memaksa model mengembalikan data yang sudah tervalidasi.

## Definisi

Structured output adalah kemampuan model untuk menghasilkan respons yang secara deterministik sesuai dengan skema JSON yang Anda tentukan. Alih-alih bergantung pada prompt "tolong kembalikan dalam JSON", penyedia seperti OpenAI dan Anthropic kini menawarkan mode di mana model hanya boleh menghasilkan token yang lolos validasi skema. JSON Schema bertindak sebagai kontrak: mendefinisikan field, tipe data, enum, dan batasan yang wajib dipatuhi.

## Masalah yang Diselesaikan

Tanpa structured output, pipeline produksi rentan terhadap parsing error. Model bisa menghasilkan JSON yang tidak lengkap, menambahkan teks penjelasan di luar kurung kurawal, atau menggunakan nama field yang salah kaprah. Hal ini memaksa developer menulis kode "perbaiki JSON rusak" yang rapuh. Dalam sistem berbasis agen, error parsing berarti tool call gagal dan seluruh alur terhenti.

## Cara Kerja

Secara internal, structured output menggunakan constrained decoding. Model tidak benar-benar "memahami" skema; sebaliknya, pada setiap langkah generasi, vocabulary token yang diizinkan difilter agar hanya token yang menjaga keabsahan JSON yang bisa dipilih. Pendekatan ini berbeda dari function calling biasa yang hanya menyarankan format. Dengan constrained decoding, output yang melanggar skema secara matematis tidak mungkin dihasilkan.

## Arsitektur dan Komponen

Komponen utama meliputi:

- **Schema registry**: definisi JSON Schema tersentralisasi untuk setiap tipe output.
- **Validator**: lapisan yang memvalidasi output (misalnya `pydantic` atau `jsonschema`).
- **Adapter**: menerjemahkan schema ke format yang diterima API model.
- **Fallback handler**: menangani kasus di mana model menolak (misalnya karena schema terlalu kompleks).

## Contoh Kode Production-Ready

```python
from pydantic import BaseModel, Field
from enum import Enum
from typing import List

class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"

class ExtractedTicket(BaseModel):
    sentiment: Sentiment
    category: str = Field(description="Kategori isu pelanggan")
    priority: int = Field(ge=1, le=5, description="Prioritas 1-5")
    action_items: List[str] = Field(default_factory=list)

# Kirim schema Pydantic ke model yang mendukung structured output.
# Tanpa API key di contoh ini, Anda cukup mengonversi ke JSON Schema:
import json
schema = ExtractedTicket.model_json_schema()
print(json.dumps(schema, indent=2))
```

Pola ini memastikan field `priority` selalu antara 1–5 dan `sentiment` hanya salah satu dari tiga nilai.

## Kapan Dipakai dan Tidak

Gunakan structured output saat output akan dikonsumsi secara programatis—ekstraksi entitas, klasifikasi, atau tool calling. Hindari untuk tugas naratif murni seperti penulisan artikel, di mana memaksa skema justru membatasi kualitas.

## Alternatif

- **Function calling / tool use**: cocok untuk memanggil fungsi, namun tidak selalu menjamin seluruh respons terstruktur.
- **Output parser heuristik**: regex atau library seperti `json5` untuk membersihkan teks; lebih rapuh.
- **Guidance / outlines**: library constrained decoding lokal untuk model self-hosted.

## Kelebihan dan Kekurangan

Kelebihan: determinisme tinggi, mengurangi kode pembersih, integrasi mudah. Kekurangan: latency tambahan untuk kompilasi schema, tidak semua model mendukung, dan schema terlalu dalam bisa menolak request.

## Best Practice

Sederhanakan schema semaksimal mungkin. Gunakan enum untuk nilai terbatas. Berikan `description` pada setiap field agar model memahami semantik. Simpan schema di registry terpisah agar bisa diuji.

## Kesalahan Umum

Menggunakan schema bersarang terlalu dalam, menambahkan field opsional tanpa default, serta lupa memvalidasi ulang di sisi klien. Validasi ganda (model + aplikasi Anda) tetap penting sebagai pertahanan terakhir.

## Catatan Implementasi di Produksi

Penerapan structured output di produksi membawa beberapa pertimbangan operasional yang sering terlewat saat prototipe. Pertama, skema harus divaliasi. Saat kebutuhan berubah—menambah field baru atau mengubah enum—anda memerlukan versioning agar klien lama tetap kompatibel. Simpan setiap versi skema di registry dan tautkan ke versi model yang digunakan.

Kedua, tangani kasus penolakan. Model terkadang menolak menghasilkan output karena instruksi bertentangan dengan kebijakan penyedia. Rancang fallback: kembalikan respons error terstruktur yang bisa diproses klien, bukan exception mentah. Jangan biarkan agen terjebak mencoba ulang tanpa batas.

Ketiga, catat setiap upaya yang menghasilkan output tidak valid di sisi klien. Meski constrained decoding menjamin validitas grammar, validasi semantik (misalnya tanggal logis) tetap perlu. Log ini menjadi sinyal untuk memperbaiki deskripsi field atau menyederhanakan skema.

Keempat, letakkan validasi di batas sistem. Library seperti Pydantic di sisi aplikasi Anda berfungsi sebagai pertahanan kedua, terutama saat multiple layanan mengonsumsi output yang sama. Pola ini membuat pipeline tangguh terhadap perubahan pada sisi model.

## FAQ

**Apa bedanya structured output dengan function calling?**
Function calling dirancang agar model memilih dan mengisi argumen fungsi. Structured output memaksa seluruh respons mengikuti skema JSON apa pun, termasuk untuk teks bukan tool call.

**Apakah semua model LLM mendukung fitur ini?**
Tidak. Fitur ini tersedia pada model tertentu dari penyedia besar dan pada model self-hosted via library constrained decoding.

**Bisakah schema berisi array dinamis?**
Ya, asalkan batas atas wajar. Array tak berbatas memperbesar ruang pencarian token dan berisiko menolak request.

**Bagaimana kalau model menghasilkan field yang tidak ada di schema?**
Dengan constrained decoding, token untuk field ilegal difilter sejak awal, sehingga tidak mungkin muncul.

**Istilah seperti constrained decoding dan vocabulary masking sering membingungkan—di mana saya bisa melihat daftarnya?**
Penjelasan istilah teknis tersebut tersedia di [glossary](/glossary/) blog ini.

## Backlink References
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [Anthropic Tool Use Docs](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [LangChain Structured Output](https://python.langchain.com/docs/how_to/structured_output)

---

## Hubungan artikel ini dengan artikel lain di blog:
- [Tool Design Patterns](./tool-design-patterns.md) — merancang tools yang dipanggil agen dengan parameter terstruktur
- [Prompt Engineering untuk Agentic Systems](./prompt-engineering-agentic-systems.md) — merancang prompt reasoning dan tool calling
- [Agent Testing dan Evaluasi](./agent-testing-evaluation.md) — menguji keandalan output terstruktur di produksi

Untuk tim yang ingin menerapkan ekstraksi dan agen terstruktur di operasional nyata, layanan [AI Agentic untuk UMKM](https://superkilat.com/layanan/ai-agentic-umkm) dari superkilat.com menyediakan fondasi siap pakai.
