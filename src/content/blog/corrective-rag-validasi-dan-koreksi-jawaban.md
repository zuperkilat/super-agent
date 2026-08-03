---
title: 'Corrective RAG: Validasi dan Koreksi Jawaban'
description: 'Teknik Corrective RAG: memvalidasi retrieval dan jawaban secara otomatis, menangani hallucination, dan meningkatkan keandalan sistem RAG.'
pubDate: '2026-08-03'
heroImage: '../../assets/blog-placeholder-72.jpg'
---

## Definisi

Corrective RAG adalah pendekatan yang menambahkan lapisan validasi dan koreksi setelah retrieval dan sebelum atau setelah generasi. Lapisan ini mengevaluasi apakah dokumen yang diambil benar-benar relevan dan apakah jawaban yang dihasilkan konsisten dengan konteks yang tersedia.

Tujuan utamanya adalah mengurangi hallucination dan meningkatkan keandalan sistem RAG, terutama untuk use case yang memerlukan akurasi tinggi seperti layanan finansial, hukum, atau medis.

## Mengapa Dibuat

RAG standar mengandalkan asumsi bahwa dokumen teratas secara otomatis relevan. Dalam praktiknya, retrieval sering kali mengembalikan dokumen yang mirip secara semantik namun tidak tepat untuk menjawab pertanyaan. Jika model menggunakan dokumen yang salah, jawaban akan menjadi tidak akurat meskipun terdengar meyakinkan.

Corrective RAG diciptakan untuk mengatasi kelemahan ini dengan mekanisme validasi yang eksplisit. Jika validasi gagal, sistem dapat melakukan retrieval ulang, memperbaiki query, atau menolak memberikan jawaban.

## Masalah yang Diselesaikan

Masalah utama adalah hallucination berbasis konteks. Model dapat menghasilkan informasi yang logis tapi tidak didukung oleh dokumen yang diambil. Dalam domain sensitif, jawaban yang salah dapat berdampak hukum atau finansial.

Corrective RAG juga menyelesaikan masalah retrieval yang gagal secara diam-diam. Dalam RAG standar, jika retrieval mengembalikan dokumen yang tidak relevan, pengguna mungkin tidak menyadari kesalahan kecuali mereka ahli pada topik tersebut.

## Cara Kerja

Proses Corrective RAG biasanya memiliki tahap validasi ganda:

1. Retrieval mengembalikan dokumen.
2. **Relevance Check** menilai apakah dokumen benar-benar relevan dengan query.
3. Jika tidak, sistem melakukan **Query Rewriting** atau retrieval ulang.
4. Setelah dokumen yang cukup relevan terkumpul, **Answer Validation** mengevaluasi apakah jawaban yang dihasilkan didukung oleh konteks.
5. Jika jawaban tidak didukung, sistem dapat mengulangi generation dengan instruksi tambahan atau menolak menjawab.

## Arsitektur

Arsitektur melibatkan **Retriever**, **Relevance Validator**, **Query Rewriter**, **Generator**, dan **Answer Validator**. Relevance Validator menggunakan LLM kecil atau model klasifikasi untuk menilai setiap dokumen. Query Rewriter memodifikasi query jika retrieval awal gagal. Answer Validator memeriksa apakah setiap klaim dalam jawaban memiliki dasar dalam konteks.

## Komponen

Komponen utama meliputi **Document Relevance Scorer**, **Answer Faithfulness Scorer**, **Query Rewriter**, **Fallback Handler**, dan **Unsupported Claim Detector**.

Document Relevance Scorer menilai setiap dokumen yang diambil. Answer Faithfulness Scorer mengevaluasi seluruh jawaban terhadap konteks. Query Rewriter menyesuaikan query jika retrieval awal tidak memadai. Fallback Handler menentukan respons jika sistem tidak dapat memberikan jawaban yang andal.

## Contoh Nyata

Platform layanan finansial menggunakan Corrective RAG untuk menjawab pertanyaan tentang regulasi perbankan. Sistem memvalidasi setiap dokumen yang diambil untuk memastikan hanya aturan resmi yang digunakan. Jika jawaban dihasilkan tanpa referensi yang memadai, sistem menolak menjawab dan mengarahkan pengguna ke sumber resmi.

Layanan medis menerapkan pendekatan ini untuk sistem informasi obat. Setiap jawaban divalidasi terhadap leaflet obat dan pedoman klinis. Jika dokumen yang diambil tidak cukup untuk menjawab pertanyaan, sistem memberikan peringatan dan menyarankan konsultasi dengan apoteker.

## Kapan Digunakan

Gunakan Corrective RAG ketika akurasi jawaban adalah prioritas utama dan konsekuensi kesalahan bisa serius. Teknik ini sangat relevan untuk domain regulasi, hukum, medis, keuangan, dan layanan publik.

Implementasikan juga jika pengguna Anda tidak memiliki expertise untuk mengevaluasi kualitas retrieval dan sepenuhnya mengandalkan sistem untuk keandalan.

## Kapan Tidak Digunakan

Jika proyek Anda hanya memerlukan asisten pencarian yang tidak kritis, Corrective RAG menambah kompleksitas dan biaya yang tidak perlu. Juga hindari jika latensi tambahan dari dua kali validasi LLM menjadi penghambat pengalaman pengguna.

## Alternatif

Alternatif meliputi **Reranking** dengan cross-encoder untuk menyaring dokumen yang relevan, **Contextual Compression** untuk mengurangi noise sebelum generation, **Guardrails** yang memfilter jawaban setelah generation, serta **Evaluation-Driven Development** yang menguji pipeline secara berkala.

[LangChain](https://github.com/langchain-ai/langgraph) memungkinkan implementasi corrective RAG dengan mudah. [LlamaIndex](https://github.com/run-llama/llama_index) menawarkan response synthesizer dengan validasi.

## Kelebihan

Mengurangi hallucination secara signifikan. Memberikan transparansi tentang keandalan jawaban. Memungkinkan sistem menolak menjawab jika konteks tidak cukup, yang lebih baik daripada memberikan jawaban yang salah. Dapat diintegrasikan dengan evaluasi otomatis untuk monitoring berkelanjutan.

## Kekurangan

Menambah latency karena dua kali panggilan validasi. Biaya operasional meningkat karena LLM calls tambahan. Konfigurasi threshold relevansi dan faithfulness memerlukan tuning dan dataset evaluasi.

## Best Practice

Gunakan model kecil untuk relevance checking agar biaya tetap terkendali. Terapkan fallback yang jelas ketika sistem tidak dapat memberikan jawaban yang andal. Dokumentasikan setiap kasus di mana sistem menolak menjawab untuk analisis berkelanjutan. Monitor rasio penolakan jawaban untuk mengidentifikasi gap dalam knowledge base.

## Kesalahan Umum

Menggunakan threshold yang terlalu tinggi sehingga sistem sering menolak menjawab. Mengandalkan validasi LLM tanpa ground truth untuk tuning. Mengabaikan logging penolakan jawaban, sehingga tidak dapat meningkatkan knowledge base.

## Referensi Resmi

- [LlamaIndex Documentation](https://github.com/run-llama/llama_index)
- [LangChain Documentation](https://github.com/langchain-ai/langgraph)
- [Haystack Documentation](https://docs.haystack.deepset.ai)
- [DeepSeek-V3 Documentation](https://github.com/deepseek-ai/DeepSeek-V3)
- [LangGraph Documentation](https://github.com/langchain-ai/langgraph)

---

## FAQ

**Apakah Corrective RAG sepenuhnya menghilangkan hallucination?**
Tidak sepenuhnya, namun mengurangi secara signifikan. Validasi berkala dan monitoring tetap diperlukan untuk menangkap kasus edge.

**Bagaimana cara menetapkan threshold relevansi?**
Gunakan dataset evaluasi dengan dokumen yang dilabeli relevan dan tidak relevan. Cari titik sweet spot yang menyeimbangkan recall dan false positive.

**Apakah Answer Validator memeriksa setiap kalimat?**
Tergantung implementasi. Beberapa sistem memeriksa seluruh jawaban secara agregat, sementara yang lain mengecek setiap klaim secara individual. Pendekatan individual lebih akurat tapi lebih lambat.

**Bagaimana cara menangani pertanyaan di luar knowledge base?**
Terapkan fallback yang secara eksplisit menyatakan bahwa informasi tidak tersedia, alih-alih mencoba menjawab dengan asumsi. Berikan opsi untuk menghubungi manusia atau sumber alternatif.

**Apakah Corrective RAG mendukung feedback pengguna?**
Ya. Anda dapat menambahkan loop di mana pengguna dapat melaporkan jawaban yang tidak akurat, yang kemudian digunakan untuk meningkatkan validasi atau knowledge base.

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [rag-vs-agents](./rag-vs-agents), [memory-systems-for-agents](./memory-systems-for-agents), [agent-testing-evaluation](./agent-testing-evaluation). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://github.com/valkey-io/valkey
- https://github.com/remix-run/remix
- https://github.com/timescale/timescaledb
- https://github.com/grafana/tempo
- https://superkilat.com/layanan/recovery
