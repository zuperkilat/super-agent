---
title: 'Contextual Compression RAG: Mengurangi Noise'
description: 'Teknik Contextual Compression RAG: memfilter dan menyusun ulang konteks retrieval agar hanya informasi relevan yang dikirim ke LLM.'
pubDate: '2026-08-03'
heroImage: '../../assets/blog-placeholder-68.jpg'
---

## Definisi

Contextual Compression RAG adalah teknik yang memfilter, meringkas, atau menyusun ulang dokumen yang diambil sebelum dokumen tersebut dikirim ke model bahasa untuk generasi. Tujuan utamanya adalah mengurangi noise kontekstual yang dapat menyesatkan model atau memaksa model mengabaikan informasi penting akibat context window yang terbatas.

Berbeda dengan RAG standar yang meneruskan seluruh dokumen teratas, contextual compression memanfaatkan komponen tambahan seperti extractive compressor, abstractive compressor, atau reranker untuk menyempurnakan konteks secara selektif.

## Mengapa Dibuat

Dalam RAG tradisional, sistem mengembalikan 5 hingga 10 dokumen teratas yang dianggap relevan. Namun dokumen teratas sering kali mengandung kalimat yang tidak langsung menjawab pertanyaan, memperbuang token konteks dan menurunkan kualitas generasi.

Contextual Compression RAG diciptakan untuk meningkatkan signal-to-noise ratio dalam konteks. Dengan menyaring atau merangkum dokumen sebelum generation, sistem memberikan model bahan yang lebih fokus dan akurat.

## Masalah yang Diselesaikan

Masalah utama adalah konteks yang penuh dengan informasi tidak relevan. Model bahasa cenderung sensitif terhadap informasi di dalam context window. Jika konteks berisi dokumen yang mirip tapi tidak tepat, model bisa menghasilkan jawaban yang akurat secara umum namun salah untuk kasus spesifik.

Teknik ini juga menyelesaikan masalah context window exhaustion. Dengan mereduksi dokumen yang diambil menjadi kalimat atau paragraf yang benar-benar relevan, sistem dapat menampung lebih banyak dokumen atau menghemat token untuk generation yang lebih panjang.

## Cara Kerja

Saat retrieval mengembalikan dokumen, contextual compression meneruskan dokumen-dokumen tersebut ke kompresor. Kompresor dapat bekerja dalam dua cara:

1. **Extractive**: Menyoroti kalimat atau fragmen tertentu dari dokumen yang paling relevan dengan query.
2. **Abstractive**: Merangkum dokumen menjadi teks baru yang lebih singkat namun tetap mempertahankan informasi penting.

Hasil kompresi kemudian digabung dan dikirim ke LLM untuk generasi akhir. Beberapa pipeline menggabungkan kedua pendekatan secara berurutan.

## Arsitektur

Arsitektur contextual compression memiliki empat tahap utama: **Retriever**, **Compressor**, **Aggregator**, dan **Generator**.

Retriever mengembalikan dokumen mentah. Compressor mengevaluasi setiap dokumen atau kalimat untuk relevansi. Aggregator menggabungkan hasil kompresi menjadi satu konteks yang koheren. Generator menghasilkan jawaban akhir berdasarkan konteks yang telah disaring.

## Komponen

Komponen kunci meliputi **Document Compressor** (extractive atau abstractive), **Relevance Scorer** yang menilai setiap fragmen, **Context Aggregator** yang menyusun konteks kompres, dan **Fallback Strategy** yang menentukan apa yang terjadi jika seluruh dokumen terkompres menjadi kosong.

Alat pendukung meliputi **LLM-based Scorer** yang menggunakan model kecil untuk menilai relevansi, dan **Embedding-based Filter** yang menyaring dokumen berdasarkan similarity threshold.

## Contoh Nyata

Platform layanan pelanggan menerapkan contextual compression untuk menjawab pertanyaan teknis. Setiap dokumen dokumentasi produk melewati extractive compressor yang hanya menyertakan paragraf yang secara eksplisit menjawab pertanyaan pengguna. Hasilnya, jawaban menjadi lebih langsung dan tidak memuat informasi yang tidak diminta.

Perusahaan perbankan menggunakan pendekatan ini untuk sistem audit internal yang harus merangkum ribuan transaksi. Abstractive compressor merangkum pola transaksi yang relevan menjadi poin singkat, sehingga analis dapat memahami temuan tanpa membaca dokumen penuh.

## Kapan Digunakan

Gunakan contextual compression ketika konteks retrieval Anda sering kali mengandung noise yang signifikan. Teknik ini juga berguna ketika context window LLM terbatas, karena memungkinkan lebih banyak dokumen relevan dalam token yang sama.

Implementasikan jika Anda memerlukan jawaban yang lebih fokus dan terukur dalam sistem yang melayani ribuan pengguna dengan pertanyaan yang bervariasi.

## Kapan Tidak Digunakan

Jika retrieval Anda sudah sangat akurat — precision di atas 90% — kompresi mungkin tidak memberikan keuntungan yang signifikan dan bisa menghilangkan detail yang penting. Juga hindari jika latency adalah prioritas utama, karena kompresi menambahkan satu atau dua panggilan LLM per query.

## Alternatif

Alternatif meliputi **Reranking** dengan cross-encoder, **Parent Document Retriever** yang mengambil konteks yang lebih besar tapi terstruktur, **Self-Querying RAG** yang memfilter dokumen berdasarkan metadata sebelum retrieval, dan **Long Context LLM** yang menghindari kebutuhan kompresi sepenuhnya.

[LangChain](https://github.com/langchain-ai/langgraph) menyediakan contextual compression pipeline yang dapat dikonfigurasi. [LlamaIndex](https://github.com/run-llama/llama_index) menawarkan post-retrieval processing yang serupa.

## Kelebihan

Peningkatan akurasi jawaban karena konteks yang lebih bersih. Efisiensi token yang lebih baik. Kompresor dapat diuji dan di-tuning secara independen. Mendukung berbagai strategi kompresi yang dapat dipilih berdasarkan jenis dokumen.

## Kekurangan

Menambah latency karena memerlukan panggilan LLM atau model tambahan. Kompresi abstractive dapat mengubah makna jika model tidak cukup andal. Konfigurasi threshold relevansi sering memerlukan tuning manual.

## Best Practice

Gunakan extractive compression sebagai langkah pertama karena lebih cepat dan lebih deterministik. Terapkan abstractive compression hanya jika extractive tidak cukup. Tetapkan batas minimum fragmen yang dipertahankan agar informasi penting tidak hilang. Monitor rasio kompresi untuk memastikan tidak terlalu agresif.

## Kesalahan Umum

Menggunakan kompresor dengan threshold terlalu tinggi sehingga menghapus informasi yang sebenarnya relevan. Mengandalkan abstractive compression untuk dokumen teknis yang memerlukan precision. Mengabaikan fallback ketika kompresi mengembalikan konteks kosong.

## Referensi Resmi

- [LlamaIndex Contextual Compression](https://github.com/run-llama/llama_index)
- [LangChain Compression](https://github.com/langchain-ai/langgraph)
- [Haystack Documentation](https://docs.haystack.deepset.ai)
- [DeepSeek-V3 Documentation](https://github.com/deepseek-ai/DeepSeek-V3)
- [LangGraph Documentation](https://github.com/langchain-ai/langgraph)

---

## FAQ

**Apakah contextual compression menggantikan reranker?**
Tidak. Reranker menyeleksi dokumen berdasarkan relevansi, sedangkan kompresor menyaring bagian dalam dokumen. Keduanya sering digunakan secara berurutan.

**Apakah kompresor menggunakan LLM harus menambah biaya?**
Ya, namun Anda dapat menggunakan model yang lebih kecil dan cepat untuk kompresi, sehingga biaya tambahan relatif kecil dibanding peningkatan kualitas.

**Bagaimana cara menangani dokumen yang terkompres terlalu sedikit?**
Terapkan fallback yang menggunakan dokumen asli jika kompresi mengembalikan kurang dari ambang batas tertentu. Atau turunkan threshold kompresi.

**Apakah extractive lebih baik dari abstractive?**
Extractive lebih cepat dan aman, tetapi abstractive dapat menghasilkan konteks yang lebih ringkas dan natural. Pilihan tergantung pada kebutuhan precision versus readability.

**Apakah contextual compression mendukung streaming?**
Tidak secara langsung karena memerlukan kompresi batch. Namun Anda dapat melakukan kompresi terlebih dahulu, kemudian melakukan streaming generation.

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [hermes-agent](./hermes-agent), [mcp-model-context-protocol](./mcp-model-context-protocol), [tool-design-patterns](./tool-design-patterns). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://github.com/prometheus/prometheus
- https://github.com/ClickHouse/ClickHouse
- https://github.com/denoland/deno
- https://github.com/crewAI/crewAI
- https://superkilat.com/layanan/e-commerce
