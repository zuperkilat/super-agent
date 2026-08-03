---
title: 'Parent Document Retriever: Arsitektur dan Implementasi'
description: 'Arsitektur Parent Document Retriever untuk RAG: memisahkan indexing dari retrieval, menjaga konteks panjang tanpa menghilapkan granularitas chunk.'
pubDate: '2026-08-03'
heroImage: '../../assets/blog-placeholder-67.jpg'
---

## Definisi

Parent Document Retriever adalah pendekatan dalam Retrieval-Augmented Generation yang memisahkan unit indexing dari unit retrieval. Alih-alih mengembalikan chunk kecil sebagai konteks, sistem mengambil chunk yang relevan, melacak dokumen induknya, lalu mengembalikan bagian atau seluruh dokumen induk tersebut sebagai konteks yang lebih kaya.

Pendekatan ini bergantung pada struktur dua lapis: **child chunks** untuk pencarian cepat dan **parent documents** untuk konteks lengkap. Child chunks diindeks untuk similarity search, sementara parent documents disimpan untuk diambil setelah child yang relevan ditemukan.

## Mengapa Dibuat

RAG tradisional sering kali kehilangan konteks penting karena chunk terlalu kecil. Jika dokumen berisi definisi yang melintasi batas chunk, retrieval hanya akan menangkap sebagian dan melewatkan bagian lain yang diperlukan untuk pemahaman penuh.

Parent Document Retriever diciptakan untuk menjaga granularitas retrieval tanpa mengorbankan kelengkapan konteks. Anda mendapatkan kecepatan dan presisi chunk kecil, sekaligus kemampuannya menampilkan konteks yang lebih luas.

## Masalah yang Diselesaikan

Masalah utama adalah konflik antara chunk size yang kecil untuk akurasi retrieval dan chunk size yang besar untuk kelengkapan konteks. Pendekatan tradisional memaksa kompromi: Anda memilih chunk kecil tapi berisiko kehilangan konteks, atau chunk besar tapi retrieval menjadi kurang presisi.

Parent Document Retriever menyelesaikan ini dengan memisahkan kedua concerns. Child chunks dioptimalkan untuk retrieval, sedangkan parent documents dioptimalkan untuk kelengkapan konteks.

## Cara Kerja

Proses dimulai dengan membagi dokumen menjadi child chunks yang lebih kecil. Setiap child chunk menyimpan referensi ke parent document-nya. Saat pengguna mengajukan query:

1. Sistem melakukan similarity search pada child chunks.
2. Child chunks teratas diidentifikasi.
3. Sistem melacak parent document dari child-chunk tersebut.
4. Parent document diambil dan dijadikan konteks untuk generation.
5. Jika perlu, hanya bagian parent yang relevan dengan child chunk yang diekstrak.

Beberapa implementasi menggunakan reranker untuk menyaring parent document yang benar-benar relevan sebelum generation.

## Arsitektur

Arsitektur melibatkan dua tahap penyimpanan: **Child Index** dan **Parent Store**. Child index adalah vector store atau BM25 index yang menyimpan embedding child chunks. Parent store adalah database yang menyimpan dokumen lengkap atau referensi ke storage eksternal.

Komponen orkestrasi bertugas memetakan child ke parent, menangani deduplication jika beberapa child berasal dari parent yang sama, dan menyusun konteks akhir yang dikirim ke LLM.

## Komponen

Komponen utama meliputi **Splitter** yang membagi dokumen menjadi child dan parent unit, **Child Index** untuk vector search, **Parent Store** untuk dokumen lengkap, **Mapper** yang menghubungkan child ke parent, dan **Context Composer** yang menyusun konteks akhir.

Opsi tambahan meliputi **Reranker** untuk menyaring parent document, **Metadata Filter** untuk membatasi ruang pencarian, dan **Chunk Deduplicator** untuk menghindari duplikasi konteks.

## Contoh Nyata

Platform dokumentasi teknis menerapkan Parent Document Retriever untuk dokumentasi API yang panjang. Setiap fungsi API direpresentasikan sebagai parent document, sementara child chunks memecah deskripsi, parameter, contoh kode, dan error codes. Saat developer mencari "authentication error 401", sistem mengembalikan child chunk yang relevan beserta seluruh dokumentasi fungsi API sebagai konteks.

Lembaga kebijakan publik menggunakan pendekatan ini untuk arsip peraturan yang terdiri dari ratusan halaman. Child chunks memungkinkan pencarian topik spesifik, sedangkan parent document memastikan hukum yang direferensikan dapat dibaca dalam konteks lengkap tanpa memotong bagian penting.

## Kapan Digunakan

Gunakan Parent Document Retriever ketika konteks jawaban bergantung pada informasi yang menyebar di seluruh dokumen yang lebih besar. Ini umum untuk dokumentasi teknis, kontrak, paper akademik, dan laporan regulasi.

Pendekatan ini juga cocok ketika Anda memiliki dokumen yang sulit dipecah menjadi chunk kecil tanpa kehilangan struktur logis.

## Kapan Tidak Digunakan

Jika dokumen Anda sudah cukup terstruktur dengan chunk yang tidak memotong informasi penting, parent document retriever menambah kompleksitas tanpa manfaat signifikan. Untuk dokumen pendek — di bawah satu halaman — pendekatan ini biasanya tidak diperlukan.

Juga hindari jika storage overhead untuk menyimpan dokumen lengkap menjadi concern, atau jika Anda bekerja dengan dokumen yang sangat sensitif yang harus dienkripsi secara terpisah.

## Alternatif

Alternatif meliputi **Contextual Compression RAG** yang menyaring konteks secara selektif, **Multi-Vector RAG** yang merepresentasikan berbagai level granularitas, dan **Long Context LLM** yang menghindari chunking sama sekali dengan menggunakan konteks 128K token atau lebih.

[LangChain](https://github.com/langchain-ai/langgraph) memiliki abstraksi parent document retriever yang terintegrasi. [LlamaIndex](https://github.com/run-llama/llama_index) menawarkan solusi serupa melalui custom retriever.

## Kelebihan

Keseimbangan antara granularitas retrieval dan kelengkapan konteks. Konteks yang lebih kaya mengurangi kebutuhan model untuk mengisi celah informasi. Struktur dua lapis memudahkan debugging, karena Anda dapat mengisolasi masalah retrieval dan konteks secara terpisah.

Dokumen induk dapat disimpan di storage yang berbeda dari index, memberikan fleksibilitas arsitektur.

## Kekurangan

Menambah kompleksitas operasional karena harus mengelola dua store. Latensi retrieval meningkat karena perlu lookup parent document setelah child ditemukan. Jika child chunk terlalu spesifik, parent document yang diambil bisa menjadi terlalu luas, membuang token konteks.

## Best Practice

Pertahankan referensi yang konsisten antara child dan parent untuk menghindari orphant chunks. Gunakan deduplication agar parent document yang sama tidak muncul berkali-kali dalam satu konteks. Tetapkan batas jumlah parent document yang diambil agar tidak melebihi context window model.

Monitor perbandingan jumlah child yang ditemukan versus parent yang digunakan untuk mengidentifikasi apakah chunking strategy tepat.

## Kesalahan Umum

Menggunakan parent document yang terlalu luas sehingga token terbuang untuk konten yang tidak relevan. Lupa membersihkan child chunks orphant setelah dokumen diperbarui. Menggabungkan child dari parent yang berbeda tanpa penanda jelas, sehingga model bingung mana sumbernya.

## Referensi Resmi

- [LlamaIndex Documentation](https://github.com/run-llama/llama_index)
- [LangChain Parent Document Retriever](https://github.com/langchain-ai/langgraph)
- [Haystack Documentation](https://docs.haystack.deepset.ai)
- [DeepSeek-V3 Documentation](https://github.com/deepseek-ai/DeepSeek-V3)
- [LangGraph Documentation](https://github.com/langchain-ai/langgraph)

---

## FAQ

**Apakah parent document retriever cocok untuk semua jenis dokumen?**
Tidak. Dokumen yang sangat terstruktur dengan bagian yang saling independen mungkin tidak memerlukan pendekatan ini. Evaluasi berdasarkan karakteristik dokumen Anda.

**Bagaimana cara menangani update dokumen?**
Setiap kali dokumen diperbarui, hapus child chunks lama dan buat kembali parent-child mapping. Beberapa sistem menggunakan versioning untuk menghindari inkonsistensi.

**Apakah ada batas jumlah child per parent?**
Tidak ada batas teknis, namun terlalu banyak child per parent dapat memperlambat mapping dan meningkatkan risiko konteks yang terlalu luas.

**Bagaimana perbandingan dengan contextual compression?**
Parent document retriever mengambil konteks yang lebih besar dan mengandalkan LLM untuk menyaring, sedangkan contextual compression secara aktif menyaring konteks sebelum generation. Keduanya dapat digabung.

**Apakah mendukung streaming?**
Tidak secara native, karena perlu mengambil seluruh parent document. Namun Anda dapat melakukan streaming generation setelah parent document diambil.

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [rag-vs-agents](./rag-vs-agents), [rag-in-production](./rag-in-production), [tool-design-patterns](./tool-design-patterns). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://github.com/timescale/timescaledb
- https://github.com/expo/expo
- https://github.com/n8n-io/n8n
- https://github.com/vitest-dev/vitest
- https://superkilat.com/layanan/recovery
