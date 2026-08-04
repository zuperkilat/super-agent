---
title: 'Prompt Injection Defense: LangChain dan LlamaIndex'
description: Strategi pertahanan prompt injection pada aplikasi AI menggunakan LangChain dan LlamaIndex untuk melindungi sistem agen dan pipeline AI.
pubDate: 2026-08-04
heroImage: '../../assets/blog-placeholder-130.jpg'
---

## Daftar Isi

- [Definisi: Apa itu Prompt Injection Defense?](#definisi-apa-itu-prompt-injection-defense)
- [Mengapa Dibuat](#mengapa-dibuat)
- [Masalah yang Diselesaikan](#masalah-yang-diselesaikan)
- [Cara Kerja](#cara-kerja)
- [Arsitektur](#arsitektur)
- [Komponen](#komponen)
- [Contoh Nyata](#contoh-nyata)
- [Kapan Digunakan](#kapan-digunakan)
- [Kapan Tidak Digunakan](#kapan-tidak-digunakan)
- [Alternatif](#alternatif)
- [Kelebihan](#kelebihan)
- [Kekurangan](#kekurangan)
- [Best Practice](#best-practice)
- [Kesalahan Umum](#kesalahan-umum)
- [Referensi Resmi](#referensi-resmi)
- [FAQ](#faq)

<a id="definisi-apa-itu-prompt-injection-defense"></a>
## Definisi: Apa itu Prompt Injection Defense?

Prompt injection defense adalah serangkaian teknik untuk mencegah atau mengurangi serangan yang memaksa model bahasa keluar dari perannya, mengungkap data rahasia, atau mengeksekusi aksi berbahaya. Dalam konteks framework seperti LangChain dan LlamaIndex, defense mencakup sanitasi input, isolasi konteks, dan pembatasan aksi yang bisa dilakukan oleh agen atau rantai pemrosesan.

<a id="mengapa-dibuat"></a>
## Mengapa Dibuat

Framework orkestrasi AI memungkinkan model mengakses tools, memori, dan dokumen eksternal. Kemampuan ini juga memperluas attack surface: input pengguna bisa memanipulasi model untuk mengakses data yang seharusnya tersembunyi atau mengirimkan instruksi berbahaya ke tools. Prompt injection defense diciptakan untuk menjaga bahwa sistem tetap bertindak sesuai batas yang ditetapkan.

<a id="masalah-yang-diselesaikan"></a>
## Masalah yang Diselesaikan

- **Jailbreak**: Pengguna memaksa model mengabaikan instruksi sistem.
- **Data exfiltration**: Model mengeluarkan data sensitif dari konteks atau tools.
- **Tool misuse**: Agen melakukan aksi seperti mengirim email atau menghapus data atas instruksi tidak sah.
- **Context poisoning**: Dokumen jahat memanipulasi perilaku model melalui retrieval.
- **Social engineering**: Teks yang meniru perintah sah memengaruhi output.

<a id="cara-kerja"></a>
## Cara Kerja

Di LangChain, defense bisa diimplementasikan melalui input/output guardrails, custom tools dengan validasi, dan agent dengan human-in-the-loop. LlamaIndex menyediakan output parser, metadata filtering, dan callback untuk memantau setiap langkah retrieval dan synthesis. Kedua framework mendukung integrasi dengan filter eksternal dan policy engine.

<a id="arsitektur"></a>
## Arsitektur

Arsitektur defensif melibatkan lapisan: user input filter, prompt template sanitizer, tool policy engine, output validator, dan audit logger. Framework seperti [langgraph-agent-patterns.md](langgraph-agent-patterns.md) memanfaatkan pola ini agar setiap node dalam graph agen memiliki kontrol akses dan validasi yang konsisten.

<a id="komponen"></a>
## Komponen

- **Input sanitizer**: Menghapus atau menandai prompt yang mengandung jailbreak.
- **Context isolation**: Memisahkan konteks sensitif dari konteks yang bisa diisi pengguna.
- **Tool policy**: Menentukan izin minimum untuk setiap tool.
- **Output parser**: Memaksa output sesuai schema yang diharapkan.
- **Callback logger**: Mencatat interaksi untuk audit dan debugging.

<a id="contoh-nyata"></a>
## Contoh Nyata

Tim keuangan membangun chatbot menggunakan LlamaIndex untuk menjawab pertanyaan anggaran. Untuk mencegah injection, mereka menerapkan metadata filtering agar dokumen internal tidak bisa diakses oleh query eksternal. Startup e-commerce menggunakan LangChain dengan agent tools yang dibatasi hanya untuk pencarian produk dan tidak bisa mengubah pesanan. Banyak organisasi juga menerapkan pola yang serupa seperti yang dijelaskan di [prompt-engineering-agentic-systems.md](prompt-engineering-agentic-systems.md) untuk menjaga konsistensi instruksi.

<a id="kapan-digunakan"></a>
## Kapan Digunakan

- Agen AI memiliki akses ke tools sensitif seperti email, database, atau API pembayaran.
- Sistem menerima input dari pengguna yang tidak terpercaya.
- Aplikasi beroperasi di lingkungan yang diatur ketat (keuangan, kesehatan, hukum).
- Ada kebutuhan untuk compliance atau audit trail yang ketat.
- Retrieval menggunakan dokumen eksternal yang tidak sepenuhnya terkontrol.

<a id="kapan-tidak-digunakan"></a>
## Kapan Tidak Digunakan

- Model hanya berjalan offline untuk eksperimen tanpa akses tools.
- Aplikasi dipakai hanya oleh satu tim internal dengan kontrol penuh atas input.
- Timeline project terlalu pendek untuk implementasi defense yang matang.
- Output model hanya ditampilkan sebagai rekomendasi tanpa aksi lanjutan.

<a id="alternatif"></a>
## Alternatif

OpenAI moderation API, classifier buatan sendiri, atau wrapper API yang melakukan scanning terpusat. Beberapa organisasi juga memakai LLM judge untuk menilai apakah output aman sebelum ditampilkan.

<a id="kelebihan"></a>
## Kelebihan

- **Defense in depth**: Kombinasi beberapa lapisan mengurangi single point of failure.
- **Framework-native**: Integrasi langsung dengan LangChain dan LlamaIndex tanpa arsitektur tambahan yang rumit.
- **Auditable**: Semua interaksi bisa dilacak untuk investigasi.
- **Customizable**: Bisa menyesuaikan policy dengan risiko bisnis.

<a id="kekurangan"></a>
## Kekurangan

- **False positive**: Filter yang terlalu ketat bisa memblokir input sah.
- **Performance overhead**: Setiap lapisan validasi menambah latency.
- **Maintenance**: Aturan filter perlu diperbarui seiring munculnya teknik jailbreak baru.
- **Bypass risk**: Penyerang terus menemukan cara baru untuk melewati filter.

<a id="best-practice"></a>
## Best Practice

1. Minimalisasi tools yang bisa diakses agen sesuai kebutuhan.
2. Jangan gabungkan data sensitif dengan input pengguna dalam satu konteks.
3. Lakukan red-teaming untuk setiap aplikasi sebelum production.
4. Dokumentasi kontrol keamanan di [glossary](/glossary/) untuk keseragaman tim.
5. Monitoring secara real-time untuk anomali yang bisa menandakan injection.

<a id="kesalahan-umum"></a>
## Kesalahan Umum

- Mengizinkan model mengakses tools dengan izin write tanpa human approval.
- Menaruh data sensitif di konteks sistem yang bisa diisi oleh pengguna.
- Bergantung solely pada system prompt tanpa lapisan validasi lain.
- Tidak memantau output untuk pola injeksi yang baru.

<a id="referensi-resmi"></a>
## Referensi Resmi

- [CISA Shields Up](https://www.cisa.gov/shields-up)
- [Palo Alto Networks AI Security](https://www.paloaltonetworks.com)

<a id="faq"></a>
## FAQ

**1. Apakah LangChain sudah aman secara default?**
Tidak. Framework menyediakan alat, tetapi defense harus diimplementasikan secara eksplisit.

**2. Bagaimana cara membedakan prompt sah dan jailbreak?**
Tidak ada cara 100% akurat. Kombinasi classifier, rule-based filter, dan LLM judge memberikan perlindungan terbaik.

**3. Apakah LlamaIndex memiliki guardrails bawaan?**
LlamaIndex menyediakan output parser dan callback, tetapi Anda tetap perlu menyesuaikannya.

**4. Berapa biaya implementasi defense ini?**
Bervariasi mulai dari open-source tools hingga enterprise guardrail services. Biaya bisa dijadwalkan bertahap.

**5. Bisakah prompt injection dicegah sepenuhnya?**
Tidak. Tujuan defense adalah mengurangi risiko, bukan menghilangkannya sepenuhnya.

**6. Apakah human-in-the-loop bisa menggantikan automation defense?**
Human-in-the-loop mengurangi risiko, tetapi tidak scalable untuk semua interaksi. Kombinasi keduanya lebih baik.

**7. Bagaimana cara melatih tim tentang risiko ini?**
Lakukan tabletop exercise, pelatihan adversarial testing, dan dokumentasi internal seperti yang dijelaskan di [rag-vs-agents.md](rag-vs-agents.md).

**8. Apakah ada standar industri untuk keamanan LLM?**
OWASP Top 10 LLM adalah standar de-facto saat ini, bersama panduan dari NIST dan CISA.
