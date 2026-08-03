---
title: 'Advanced RAG: Hybrid Search dan Multi-Vector'
description: 'Mendalam teknik advanced RAG: hybrid search menggabungkan sparse dan dense retrieval, serta multi-vector untuk representasi dokumen yang lebih kaya.'
pubDate: '2026-08-03'
heroImage: '../../assets/blog-placeholder-66.jpg'
---

## Definisi

Advanced RAG mengacu pada serangkaian teknik yang memperbaiki retrieval accuracy di luar pendekatan dasar vector search. Dua teknik utama yang dibahas adalah **Hybrid Search** dan **Multi-Vector Representation**.

Hybrid Search menggabungkan kekuatan sparse retrieval seperti BM25 dengan dense retrieval berbasis embedding. Multi-Vector Representation memecah dokumen menjadi beberapa vektor yang merepresentasikan bagian yang berbeda, sehingga meningkatkan kemiripan pencarian untuk dokumen yang kompleks.

Keduanya bertujuan memastikan bahwa informasi yang diambil tidak hanya mirip secara semantik, tetapi juga secara leksikal dan struktural.

## Mengapa Dibuat

Vector search tunggal sering kehilangan informasi leksikal yang spesifik. Misalnya, query "API authentication endpoint" mungkin menghasilkan dokumen yang secara semantik mirip tapi tidak mengandung string eksak yang dicari. BM25 unggul dalam pencarian kata kunci tepat, namun kehilangan konteks semantik.

Hybrid search diciptakan untuk menangani kesenjangan ini. Multi-vector representation, di sisi lain, mengatasi masalah representasi dokumen yang terlalu generik. Dokumen panjang yang diembeddings menjadi satu vektor sering kali mencampur informasi yang berbeda, sehingga mengurangi akurasi retrieval.

## Masalah yang Diselesaikan

Masalah utama adalah **retrieval mismatch** di mana dokumen yang diambil terlihat relevan secara umum tapi tidak menjawab pertanyaan spesifik. Teknik hybrid search mengurangi masalah ini dengan menyeimbangkan skor BM25 dan cosine similarity.

Multi-vector representation menyelesaikan masalah representasi yang terlalu kasar. Dengan membagi dokumen menjadi summary vector, chunk vector, dan section vector, sistem dapat mencocokkan query dengan level detail yang tepat — apakah pengguna mencari ringkasan atau bagian spesifik.

## Cara Kerja

Dalam hybrid search, query dieksekusi terhadap dua indeks secara paralel: BM25 untuk leksikal dan vector index untuk semantik. Skor dari kedua indeks kemudian dinormalisasi dan digabung menggunakan Reciprocal Rank Fusion atau weighted sum.

Multi-vector bekerja dengan menghasilkan embedding terpisah untuk setiap bagian dokumen. Saat retrieval, sistem mencari similarity terhadap setiap vektor bagian, lalu menggabungkan skor dengan memperhatikan overlap dan kedekatan.

## Arsitektur

Arsitektur hybrid search biasanya melibatkan dua jalur paralel: **Sparse Retriever** dan **Dense Retriever**. Output dari kedua jalur digabung oleh **Fusion Layer** yang menentukan ranking final.

Untuk multi-vector, arsitektur memerlukan **Vectorizer** yang menghasilkan embedding per chunk atau per section, **Multi-Vector Index** yang menyimpan semua embedding tersebut, dan **Aggregation Layer** yang menggabungkan skor retrieval.

Kedua arsitektur ini dapat digabung menjadi sistem yang melakukan hybrid search terhadap indeks multi-vector, memberikan granularitas pencarian yang tinggi.

## Komponen

Komponen utama meliputi **Sparse Retriever** (BM25 atau similar), **Dense Retriever** (vector similarity), **Fusion Strategy** (RRF, weighted sum, atau learned), **Chunker** yang mendukung multi-granularity, **Embedding Model**, dan **Reranker** opsional untuk menyempurnakan hasil akhir.

Untuk multi-vector, Anda memerlukan **Section Splitter** yang memahami struktur dokumen, serta **Aggregation Function** yang menggabungkan skor vektor dengan benar tanpa menghilangkan sinyal yang relevan.

## Contoh Nyata

Platform dokumentasi teknis menggunakan hybrid search untuk menjembatani pencarian nama fungsi API yang spesifik dan konsep arsitektur yang lebih abstrak. Sistem mengembalikan halaman dokumentasi yang relevan secara leksikal dan semantik, meningkatkan akurasi jawaban dibanding vector search tunggal.

Perusahaan hukum menerapkan multi-vector representation untuk kontrak yang panjang. Setiap klausul direpresentasikan dengan embedding tersendiri, sehingga pencarian "force majeure clause dalam kontrak vendor" dapat langsung mengembalikan bagian spesifik tanpa memfilter dokumen penuh yang tidak relevan.

## Kapan Digunakan

Gunakan hybrid search ketika basis pengetahuan Anda berisi banyak istilah teknis, singkatan, atau nama produk yang harus dicocokkan secara eksak. Multi-vector cocok untuk dokumen panjang seperti laporan, paper, atau kontrak yang memerlukan retrieval dengan granularitas tinggi.

Keduanya sangat relevan untuk sistem customer support yang harus menangkap intent spesifik sekaligus memahami konteks percakapan yang lebih luas.

## Kapan Tidak Digunakan

Jika korpus dokumen Anda sangat kecil — di bawah ratusan halaman — hybrid search mungkin tidak memberikan dampak signifikan. Multi-vector juga menambah kompleksitas penyimpanan dan indexing, sehingga untuk dataset kecil bisa menjadi pemborosan.

Juga hindari jika retrieval speed adalah prioritas utama dan Anda tidak dapat mentolerir latensi tambahan dari dual retrieval.

## Alternatif

Alternatif meliputi **Reranking** dengan model cross-encoder untuk menyempurnakan hasil retrieval, **Late Interaction** seperti ColBERT yang menggabungkan sparse dan dense dalam satu model, serta **Graph-based Retrieval** yang memanfaatkan hubungan entitas di dalam dokumen.

[LangChain](https://github.com/langchain-ai/langgraph) menyediakan abstraksi hybrid search yang dapat diintegrasikan dengan berbagai backend. [LlamaIndex](https://github.com/run-llama/llama_index) menawarkan multi-vector index terintegrasi.

## Kelebihan

Hybrid search secara konsisten meningkatkan precision dan recall dibanding dense retrieval tunggal. Multi-vector meningkatkan kemampuan sistem untuk menavigasi dokumen yang kompleks tanpa kehilangan konteks bagian spesifik. Kedua teknik ini dapat diuji secara independen, sehingga memudahkan iterasi.

Dukungan untuk reranker sebagai lapisan akhir memberikan peningkatan kualitas tanpa mengganti arsitektur retrieval.

## Kekurangan

Hybrid search memerlukan dua indeks yang harus dirawat, meningkatkan biaya operasional. Multi-vector meningkatkan ukuran indeks secara signifikan — bisa 5 hingga 20 kali lipat dibanding single-vector. Konfigurasi bobot fusion sering kali memerlukan tuning manual.

## Best Practice

Uji berbagai strategi fusion sebelum memilih yang tetap. Untuk multi-vector, tetapkan batas jumlah vektor per dokumen agar indeks tetap dapat dikelola. Dokumentasikan schema chunk dan embedding yang digunakan untuk setiap indeks. Monitor skewness antara skor sparse dan dense untuk menyesuaikan bobot.

## Kesalahan Umum

Menggunakan chunk size yang terlalu besar untuk multi-vector, sehingga vektor bagian menjadi terlalu generik. Menggabungkan skor tanpa normalisasi, sehingga salah satu jalur mendominasi ranking. Mengabaikan reranker ketika hasil hybrid search masih membutuhkan penyempurnaan.

## Referensi Resmi

- [LlamaIndex Hybrid Search Guide](https://github.com/run-llama/llama_index)
- [LangChain Hybrid Search](https://github.com/langchain-ai/langgraph)
- [DeepSeek-V3 Documentation](https://github.com/deepseek-ai/DeepSeek-V3)
- [Haystack Documentation](https://docs.haystack.deepset.ai)
- [LangGraph Documentation](https://github.com/langchain-ai/langgraph)

---

## FAQ

**Apakah hybrid search selalu lebih baik dari vector search?**
Tidak selalu. Untuk korpus kecil atau query yang sangat semantik, vector search tunggal sudah cukup. Hybrid search memberikan keuntungan terbesar pada korpus yang kaya dengan istilah teknis.

**Berapa ukuran chunk yang ideal untuk multi-vector?**
Tidak ada nilai universal, namun untuk dokumen teknis 256-512 token per chunk sering memberikan keseimbangan yang baik. Uji pada dataset representatif Anda.

**Apakah multi-vector meningkatkan biaya storage?**
Ya. Karena setiap dokumen menghasilkan beberapa embedding, biaya storage dan memory bisa bertambah signifikan. Rencanakan skalabilitas vector store sejak awal.

**Bagaimana cara menyeimbangkan BM25 dan dense retrieval?**
Gunakan Reciprocal Rank Fusion untuk menghindari tuning manual, atau lakukan grid search pada bobot jika Anda memiliki dataset evaluasi yang cukup besar.

**Apakah hybrid search mendukung reranking?**
Ya. Hasil gabungan dapat direrank menggunakan cross-encoder sebelum dikembalikan ke pengguna, memberikan peningkatan kualitas yang konsisten.

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [agentic-ai-fundamentals-2026](./agentic-ai-fundamentals-2026), [langgraph-agent-patterns](./langgraph-agent-patterns), [ai-infrastructure-docker-kubernetes-llm](./ai-infrastructure-docker-kubernetes-llm). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://github.com/timescale/timescaledb
- https://platform.openai.com/docs/guides/function-calling
- https://github.com/remix-run/remix
- https://github.com/storybookjs/storybook
- https://superkilat.com/layanan/e-commerce
