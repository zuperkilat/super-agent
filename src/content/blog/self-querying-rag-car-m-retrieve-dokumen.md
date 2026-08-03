---
title: 'Self-Querying RAG: Cara M Retrieve Dokumen'
description: 'Teknik Self-Querying RAG: memisahkan intent semantik dari filter metadata, meningkatkan akurasi retrieval dengan query terstruktur otomatis.'
pubDate: '2026-08-03'
heroImage: '../../assets/blog-placeholder-71.jpg'
---

## Definisi

Self-Querying RAG adalah teknik di mana model bahasa menganalisis pertanyaan pengguna, memisahkan komponen semantik dari komponen filter, lalu menghasilkan query terstruktur yang dapat dieksekusi langsung terhadap vector store atau database.

Dengan kata lain, sistem tidak hanya memahami apa yang ditanyakan pengguna, tetapi juga memahami kriteria seperti tanggal, kategori, harga, atau status yang implisit dalam pertanyaan, lalu menerapkannya sebagai filter sebelum retrieval.

## Mengapa Dibuat

RAG standar hanya melakukan similarity search berdasarkan representasi semantik query. Namun banyak pertanyaan memerlukan filter yang lebih spesifik. Pertanyaan seperti "laporan keuangan 2024 yang diaudit oleh KAP Tanaka" memerlukan filter tahun dan nama auditor, selain intent semantik "laporan keuangan".

Self-Querying RAG diciptakan untuk menangani kebutuhan ini secara otomatis, tanpa memaksa pengguna mempelajari sintaks query terstruktur atau memisahkan kriteria secara manual.

## Masalah yang Diselesaikan

Masalah utama adalah filter metadata yang tidak terpakai dalam vector search. Di banyak sistem, metadata seperti tanggal, kategori, atau harga hanya dapat difilter setelah retrieval, yang menyebabkan hasil yang tidak relevan menduduki peringkat teratas dan menghabiskan token konteks.

Self-Querying RAG menyelesaikan ini dengan menerapkan filter metadata sejak tahap awal retrieval, sehingga hanya dokumen yang memenuhi kriteria semantik dan struktural yang diambil.

## Cara Kerja

1. Pengguna mengajukan pertanyaan dalam bahasa natural.
2. LLM menganalisis pertanyaan dan menghasilkan dua output: string query untuk semantic search dan dictionary filter untuk metadata.
3. Semantic search dieksekusi terhadap vector store.
4. Filter diterapkan pada hasil retrieval.
5. Dokumen yang lolos difilter digabung dan dikirim ke generator.

Beberapa implementasi menghasilkan beberapa query semantik dan menggabungkannya menggunakan RAG Fusion sebelum menerapkan filter.

## Arsitektur

Arsitektur melibatkan **Query Analyzer** yang memecah pertanyaan menjadi semantic query dan metadata filters, **Vector Retriever** yang melakukan similarity search, **Metadata Filter Engine** yang menerapkan kriteria, dan **Context Aggregator** yang menyusun hasil akhir.

Query Analyzer biasanya menggunakan LLM dengan output yang diformat sebagai JSON atau Pydantic model untuk memastikan struktur yang valid.

## Komponen

Komponen utama meliputi **Query Analyzer** atau **Self-Querying Prompt**, **Structured Output Parser**, **Vector Store** dengan dukungan metadata filter, **Filter Validator** yang memastikan metadata yang dimaksud benar-benar ada, dan **Fallback Strategy** jika filter tidak dapat dipetakan.

Banyak sistem menambahkan **Query Rewriter** untuk menangani pertanyaan yang ambigu sebelum analisis.

## Contoh Nyata

Platform e-commerce menerapkan Self-Querying RAG untuk pencarian produk. Pertanyaan "sepatu lari pria ukuran 42 di bawah Rp 1 juta" dipecah menjadi semantic query "sepatu lari pria" dan filter metadata: kategori sepatu, gender pria, ukuran 42, dan harga di bawah satu juta. Hasilnya, pengguna mendapatkan produk yang benar-benar sesuai kriteria tanpa perlu navigasi filter manual.

Sistem hukum perusahaan menggunakan pendekatan ini untuk pencarian kontrak. Pertanyaan "kontrak vendor 2024 yang belum diperpanjang" dipecah menjadi semantic query tentang ketentuan vendor dan filter tahun 2024 plus status aktif. Retrieval langsung mengembalikan kontrak yang relevan tanpa dokumen yang tidak diperlukan.

## Kapan Digunakan

Gunakan Self-Querying RAG ketika knowledge base Anda kaya dengan metadata yang bernilai untuk filtering. Teknik ini sangat efektif untuk database produk, arsip dokumen terstruktur, atau sistem yang menggabungkan dokumen tidak terstruktur dengan informasi terstruktur.

Implementasikan jika pengguna sering mengajukan pertanyaan yang memuat kriteria spesifik selain intent semantik.

## Kapan Tidak Digunakan

Jika knowledge base Anda tidak memiliki metadata yang signifikan untuk difilter, Self-Querying RAG menambah kompleksitas tanpa manfaat. Juga hindari jika struktur metadata sangat beragam dan sulit dipetakan secara otomatis.

Untuk use case di mana pengguna selalu memberikan query yang bersifat semantik murni, pendekatan ini mungkin tidak diperlukan.

## Alternatif

Alternatif meliputi **Hybrid Search** yang menggabungkan leksikal dan semantik, **RAG Fusion** yang mengeksplorasi varias i query, **HyDE** yang menggunakan dokumen hipotetis, dan **Structured Retrieval** di mana pengguna memilih filter secara manual sebelum query.

[LlamaIndex](https://github.com/run-llama/llama_index) menyediakan self-query retriever terintegrasi. [LangChain](https://github.com/langchain-ai/langgraph) memungkinkan implementasi kustom dengan mudah.

## Kelebihan

Meningkatkan precision dengan menerapkan filter sejak tahap awal retrieval. Mengurangi jumlah dokumen yang dikonsumsi oleh generator, sehingga menghemat token. Menghilangkan kebutuhan antarmuka filter manual untuk pengguna non-teknis. Dapat dikombinasi dengan teknik RAG lain.

## Kekurangan

Bergantung pada kemampuan LLM untuk memetakan pertanyaan ke struktur metadata dengan benar. Jika metadata tidak konsisten, filter bisa gagal. Konfigurasi prompt untuk query analyzer memerlukan tuning. Menambah latency karena analisis tambahan sebelum retrieval.

## Best Practice

Definisikan metadata yang konsisten dan terdokumentasi dengan baik. Gunakan Pydantic model atau schema yang ketat untuk output analyzer. Terapkan fallback jika filter tidak dapat dipetakan agar retrieval tetap berfungsi. Evaluasi secara berkala akurasi pemetaan query ke metadata.

## Kesalahan Umum

Mengandalkan LLM untuk memetakan metadata yang ambigu tanpa validasi. Mengabaikan fallback ketika filter tidak terdeteksi, sehingga retrieval menjadi kosong. Menggunakan metadata yang terlalu detail sehingga sulit dipetakan secara otomatis.

## Referensi Resmi

- [LlamaIndex Self-Query Retriever](https://github.com/run-llama/llama_index)
- [LangChain Documentation](https://github.com/langchain-ai/langgraph)
- [Haystack Documentation](https://docs.haystack.deepset.ai)
- [DeepSeek-V3 Documentation](https://github.com/deepseek-ai/DeepSeek-V3)
- [LangGraph Documentation](https://github.com/langchain-ai/langgraph)

---

## FAQ

**Apakah Self-Querying RAG menggantikan vector search?**
Tidak. Teknik ini melengkapi vector search dengan filter metadata yang dihasilkan secara otomatis dari pertanyaan pengguna.

**Bagaimana cara menangani metadata yang kompleks?**
Gunakan nested filter atau composite filter yang didukung oleh vector store Anda. LLM dapat menghasilkan struktur filter bertingkat jika prompt dan schema mendukung.

**Apakah Self-Querying RAG mendukung lebih dari satu filter?**
Ya. LLM dapat menghasilkan beberapa kondisi filter sekaligus, seperti kombinasi kategori, rentang harga, dan tanggal.

**Bagaimana performa dibanding manual filtering?**
Secara umum lebih cepat untuk pengguna karena tidak perlu memilih filter secara manual, namun menambah sedikit latency akibat analisis LLM sebelum retrieval.

**Apakah cocok untuk sistem dengan metadata yang sering berubah?**
Ya, selama struktur metadata terdokumentasi dan konsisten. LLM dapat menyesuaikan dengan metadata baru selama outputnya tetap terikat pada schema yang ditentukan.

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [hermes-agent](./hermes-agent), [prompt-engineering-agentic-systems](./prompt-engineering-agentic-systems), [agentic-whatsapp-bot](./agentic-whatsapp-bot). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://github.com/vitest-dev/vitest
- https://github.com/mistralai/mistral-src
- https://github.com/tailwindlabs/tailwindcss
- https://github.com/microsoft/semantic-kernel
- https://superkilat.com/layanan/recovery
