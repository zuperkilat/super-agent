---
title: 'RAG Fusion: Pencarian Multi-Query RAG'
description: 'Teknik RAG Fusion: menghasilkan beberapa query dari pertanyaan asli, menggabungkan hasil retrieval, dan menyempurnakan jawaban dengan reciprocal rank fusion.'
pubDate: '2026-08-03'
heroImage: '../../assets/blog-placeholder-70.jpg'
---

## Definisi

RAG Fusion adalah pendekatan yang memecah satu pertanyaan pengguna menjadi beberapa query alternatif, menjalankan retrieval untuk setiap query secara paralel, lalu menggabungkan hasilnya menggunakan Reciprocal Rank Fusion atau teknik serupa untuk menghasilkan ranking dokumen yang lebih komprehensif.

Teknik ini mengatasi masalah bahwa satu formulasi query sering tidak cukup untuk menangkap semua dokumen yang relevan, terutama ketika pertanyaan memiliki multiple facets atau ambigu.

## Mengapa Dibuat

Pertanyaan natural sering kali ambigu atau memiliki intent ganda. Query tunggal yang dihasilkan dari pertanyaan pengguna mungkin hanya menangkap satu aspek, sehingga dokumen yang relevan untuk aspek lain tidak terambil.

RAG Fusion diciptakan untuk meningkatkan recall tanpa mengorbankan precision. Dengan mengeksplorasi varias i query yang dihasilkan dari pertanyaan yang sama, sistem dapat menemukan dokumen yang mungkin terlewat oleh formulasi tunggal.

## Masalah yang Diselesaikan

Masalah utama adalah recall yang terbatas oleh formulasi query tunggal. Jika pengguna bertanya "bagaimana cara menghemat baterai laptop", dokumen yang menggunakan istilah "power management" atau "energy saving" mungkin tidak terambil oleh query asli.

RAG Fusion juga menyelesaikan masalah ambiguity. Pertanyaan seperti "apple stock prediction" bisa merujuk pada perusahaan atau buah. Dengan beberapa query yang dihasilkan, sistem dapat menangkap kedua kemungkinan dan menyaring dokumen yang benar berdasarkan konteks.

## Cara Kerja

1. Sistem menerima query pengguna.
2. LLM menghasilkan 3 hingga 5 query alternatif yang reformulasi pertanyaan dengan kata kunci atau sudut pandang berbeda.
3. Setiap query dijalankan retrieval secara paralel terhadap indeks yang sama.
4. Hasil retrieval dari setiap query digabung menggunakan Reciprocal Rank Fusion.
5. Ranking final digunakan untuk mengambil dokumen dan menjawab pertanyaan awal.

Beberapa implementasi menambahkan reranker setelah fusion untuk menyempurnakan hasil.

## Arsitektur

Arsitektur RAG Fusion memerlukan **Query Decomposer** atau **Multi-Query Generator**, **Parallel Retriever**, **Fusion Engine**, dan **Generator**.

Query Decomposer menggunakan LLM dengan prompt yang dirancang untuk menghasilkan variasi query yang orthogonal. Parallel Retriever mengeksekusi semua query secara bersamaan untuk mengurangi latensi. Fusion Engine menggabungkan ranking menggunakan algoritma yang konsisten.

## Komponen

Komponen utama meliputi **Multi-Query Prompt** yang mendefinisikan cara LLM menghasilkan variasi, **LLM Call** untuk generation query, **Retriever** yang dapat dieksekusi secara paralel, **Reciprocal Rank Fusion** atau weighted combination, **Document Store**, dan **Reranker** opsional.

Beberapa sistem menambahkan **Query Classifier** untuk memfilter query yang tidak produktif sebelum retrieval.

## Contoh Nyata

Platform dokumentasi API menggunakan RAG Fusion untuk meningkatkan pencarian developer. Query "timeout handling" menghasilkan variasi seperti "request timeout configuration", "connection timeout error", dan "read timeout setting". Hasil fusion menangkap dokumentasi timeout untuk setiap jenis operasi API, memberikan jawaban yang lebih lengkap.

Sistem riset medis menerapkan RAG Fusion untuk query klinis. Pertanyaan dokter tentang "efek samping obat hipertensi pada Lansia" dipecah menjadi query tentang efek fisiologis, interaksi obat, dan pedoman klinis. Fusion mengembalikan dokumen dari berbagai database yang relevan untuk setiap aspek.

## Kapan Digunakan

Gunakan RAG Fusion ketika pertanyaan pengguna cenderung ambigu atau multi-dimensional. Teknik ini juga efektif untuk knowledge base yang besar dengan terminologi yang beragam, di mana satu formulasi query tidak cukup menangkap semua dokumen relevan.

Implementasikan jika recall sistem Anda rendah meskipun precision sudah baik, atau jika Anda ingin meningkatkan cakupan jawaban.

## Kapan Tidak Digunakan

Jika setiap query pengguna sudah sangat spesifik dan knowledge base menggunakan terminologi yang konsisten, RAG Fusion mungkin tidak memberikan peningkatan yang signifikan. Juga hindari jika biaya dan latency LLM call tambahan menjadi masalah, karena setiap query menambah overhead.

## Alternatif

Alternatif meliputi **Query Expansion** yang menambahkan istilah tanpa menghasilkan query lengkap, **HyDE** yang mengubah query menjadi dokumen hipotetis, **Hybrid Search** yang menggabungkan sparse dan dense retrieval, serta **Reranking** yang menyempurnakan hasil retrieval tunggal.

[LangChain](https://github.com/langchain-ai/langgraph) menyediakan multi-query retriever yang dapat dikombinasi dengan fusion. [LlamaIndex](https://github.com/run-llama/llama_index) menawarkan pendekatan serupa melalui custom retriever.

## Kelebihan

Peningkatan recall yang signifikan tanpa perubahan pada indeks dokumen. Kemampuan menangkap dokumen dari berbagai sudut pandang dalam satu respons. Fungsionalitas paralel retrieval mengurangi latensi tambahan. Dapat dikombinasi dengan reranker untuk kualitas yang lebih tinggi.

## Kekurangan

Menambah biaya karena beberapa panggilan LLM untuk query generation. Hasil fusion bisa memasukkan dokumen yang kurang relevan jika query alternatif terlalu lebar. Konfigurasi jumlah query dan strategi fusion memerlukan tuning.

## Best Practice

Batas jumlah query alternatif antara 3 hingga 5 untuk menjaga keseimbangan recall dan biaya. Gunakan temperatur rendah untuk query generation agar variasi tetap terkontrol. Terapkan reciprocal rank fusion dengan parameter yang telah diuji pada dataset evaluasi Anda.

Monitor proporsi dokumen yang muncul dari query yang berbeda untuk memastikan fusion benar-benar meningkatkan cakupan.

## Kesalahan Umum

Menghasilkan query yang terlalu mirip sehingga fusion tidak menambah nilai. Menggunakan fusion tanpa evaluasi, sehingga dokumen yang kurang relevan bisa naik peringkat. Mengabaikan reranker setelah fusion meskipun hasil masih membutuhkan penyempurnaan.

## Referensi Resmi

- [LlamaIndex Documentation](https://github.com/run-llama/llama_index)
- [LangChain Multi-Query Retriever](https://github.com/langchain-ai/langgraph)
- [Haystack Documentation](https://docs.haystack.deepset.ai)
- [DeepSeek-V3 Documentation](https://github.com/deepseek-ai/DeepSeek-V3)
- [LangGraph Documentation](https://github.com/langchain-ai/langgraph)

---

## FAQ

**Berapa jumlah query alternatif yang ideal?**
3 hingga 5 query biasanya memberikan keseimbangan yang baik. Lebih dari itu meningkatkan biaya tanpa peningkatan recall yang signifikan.

**Apakah RAG Fusion meningkatkan precision?**
Fusion dirancang untuk recall, bukan precision. Namun dengan reranker setelah fusion, Anda dapat menyeimbangkan kedua metrik.

**Apakah query alternatif perlu disimpan?**
Tidak. Query alternatif hanya digunakan untuk retrieval dan dapat diabaikan setelah proses selesai.

**Bagaimana cara menangani query yang berlebihan?**
Gunakan query classifier atau filter berbasis similarity untuk menyingkirkan query yang terlalu jauh dari intent asli sebelum retrieval.

**Apakah RAG Fusion bekerja dengan hybrid search?**
Ya. Setiap query alternatif dapat dijalankan melalui jalur sparse dan dense, kemudian hasilnya digabung menggunakan fusion.

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [langgraph-agent-patterns](./langgraph-agent-patterns), [ai-infrastructure-docker-kubernetes-llm](./ai-infrastructure-docker-kubernetes-llm), [memory-systems-for-agents](./memory-systems-for-agents). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://github.com/cilium/cilium
- https://github.com/prometheus/prometheus
- https://github.com/honeycombio/buckle
- https://github.com/ionic-team/ionic-framework
- https://superkilat.com/layanan/website-baru
