---
title: 'HyDE: Hypothetical Document Embeddings untuk RAG'
description: 'Teknik HyDE dalam RAG: menghasilkan dokumen hipotetis untuk meningkatkan retrieval, mengatasi kesenjangan antara query dan dokumen sebenarnya.'
pubDate: '2026-08-03'
heroImage: '../../assets/blog-placeholder-69.jpg'
---

## Definisi

HyDE, atau Hypothetical Document Embeddings, adalah teknik RAG di mana sistem pertama kali menghasilkan dokumen hipotetis yang seharusnya menjawab query pengguna, kemudian menggunakan embedding dari dokumen hipotetis tersebut untuk mencari dokumen nyata di knowledge base.

Dengan kata lain, HyDE menerjemahkan query menjadi representasi dokumen yang lebih dekat dengan korpus target, sehingga meningkatkan kemiripan dan kualitas retrieval. Teknik ini dikenalkan dalam paper oleh Gao et al. dan sejak then diadopsi di berbagai framework RAG.

## Mengapa Dibuat

Masalah dasar dalam dense retrieval adalah kesenjangan distribusi antara query pengguna dan dokumen di knowledge base. Query cenderung pendek, deklaratif, dan mungkin ambigu, sedangkan dokumen biasanya lebih panjang, informatif, dan terstruktur. Distribusi yang berbeda ini menyebabkan similarity search sering gagal menemukan dokumen yang sebenarnya relevan.

HyDE diciptakan untuk menjembatani kesenjangan distribusi ini. Dengan membuat dokumen hipotetis yang meniru gaya bahasa korpus target, representasi vektornya menjadi lebih kompatibel dengan indeks yang ada.

## Masalah yang Diselesaikan

Salah satu masalah utama adalah query yang terlalu pendek atau ambigu. Query seperti "cara reset password" memiliki representasi vektor yang sangat ringkas dan mungkin mirip dengan dokumen lain yang tidak relevan. Dengan HyDE, sistem menghasilkan versi yang lebih lengkap dari query tersebut sebelum melakukan retrieval.

Masalah lain adalah vocabulary mismatch. Query dapat menggunakan istilah yang berbeda dengan dokumen di knowledge base. Dokumen hipotetis cenderung menggunakan kosakata yang lebih dekat dengan korpus target, sehingga meningkatkan peluang pencocokan.

## Cara Kerja

Proses HyDE memiliki dua tahap: **generation** dan **retrieval**.

1. Sistem menerima query pengguna.
2. LLM menghasilkan satu atau beberapa dokumen hipotetis yang menjawab query.
3. Dokumen hipotetis di-embed menjadi vektor.
4. Vektor digunakan untuk similarity search terhadap indeks dokumen nyata.
5. Dokumen nyata yang ditemukan digabung dengan query asli untuk generasi akhir.

Beberapa implementasi menghasilkan beberapa dokumen hipotetis dengan temperatur yang lebih tinggi untuk meningkatkan cakupan retrieval.

## Arsitektur

Arsitektur HyDE memerlukan dua komponen utama: **Hypothetical Document Generator** dan **Retriever**.

Generator biasanya menggunakan LLM yang sama dengan sistem utama, namun dengan prompt yang dirancang untuk menghasilkan dokumen informatif daripada jawaban percakapan. Retriever dapat berupa vector store atau hybrid search yang menerima vektor hipotetis sebagai input.

Output dari retriever kemudian dikembalikan ke pipeline generation standar untuk menghasilkan jawaban akhir kepada pengguna.

## Komponen

Komponen kunci meliputi **Prompt Template** yang menginduksi LLM menghasilkan dokumen hipotetis, **LLM Call** untuk generation, **Embedding Model** untuk mengubah dokumen menjadi vektor, **Vector Store** untuk similarity search, dan **Post-Processor** yang menyaring hasil retrieval.

Beberapa sistem menambahkan **Reranker** setelah retrieval untuk menyempurnakan hasil sebelum generation. **Multi-HyDE** menghasilkan beberapa dokumen hipotetis dengan variasi untuk meningkatkan recall.

## Contoh Nyata

Platform e-book menggunakan HyDE untuk meningkatkan pencarian konten buku. Query pengguna seperti "cara mengatasi insomnia tanpa obat" diubah menjadi dokumen hipotetis yang lebih panjang dan terstruktur sebelum dicocokkan dengan indeks buku. Hasilnya, sistem menemukan bagian spesifik dalam buku kesehatan yang mungkin terlewatkan oleh vector search biasa.

Sistem FAQ internal perusahaan menerapkan HyDE untuk mendukung pertanyaan karyawan. Dokumen FAQ yang pendek sering tidak cocok secara vektoral dengan query yang lebih natural. HyDE meningkatkan akurasi pencarian sebesar 30 persen dalam beberapa evaluasi internal.

## Kapan Digunakan

Gunakan HyDE ketika knowledge base Anda memiliki distribusi dokumen yang berbeda secara signifikan dengan query pengguna. Teknik ini sangat efektif untuk korpus dokumen panjang, formal, atau teknis di mana query cenderung pendek dan tidak terstruktur.

HyDE juga cocok ketika Anda memiliki data yang kaya dengan istilah spesifik yang jarang muncul dalam percakapan sehari-hari.

## Kapan Tidak Digunakan

Jika query pengguna Anda sudah secara alami mirip dengan dokumen di knowledge base — misalnya dalam sistem pencarian internal yang menggunakan terminologi yang sama — HyDE mungkin tidak memberikan peningkatan yang signifikan.

Juga hindari jika latency adalah masalah besar, karena HyDE menambahkan satu panggilan LLM per query. Untuk sistem dengan throughput tinggi, overhead ini dapat menjadi mahal.

## Alternatif

Alternatif meliputi **Query Expansion** yang menambahkan istilah terkait tanpa menghasilkan dokumen penuh, **Reranking** dengan cross-encoder, **Hybrid Search** yang menggabungkan BM25 dan dense retrieval, serta **Self-Querying RAG** yang memfilter dokumen berdasarkan metadata.

[LlamaIndex](https://github.com/run-llama/llama_index) memiliki dukungan HyDE melalui HyDE retriever. [LangChain](https://github.com/langchain-ai/langgraph) memungkinkan implementasi kustom dengan mudah.

## Kelebihan

Meningkatkan recall secara signifikan tanpa mengubah indeks dokumen yang ada. Cepat diimplementasikan karena hanya memerlukan tambahan prompt dan LLM call. Tidak memerlukan pelatihan ulang model embedding. Dapat dikombinasi dengan teknik RAG lain seperti reranking atau contextual compression.

## Kekurangan

Menambah latency dan biaya karena panggilan LLM tambahan. Hasil dokumen hipotetis bergantung pada kualitas prompt dan model. Jika dokumen hipotetis menyesatkan, retrieval bisa semakin buruk. Sulit di-debug ketika dokumen hipotetis tidak sesuai ekspektasi.

## Best Practice

Buat prompt yang secara eksplisit meminta dokumen yang informatif, terstruktur, dan menggunakan terminologi dari domain Anda. Hasilkan beberapa dokumen hipotetis dengan variasi untuk meningkatkan cakupan. Evaluasi secara berkala apakah dokumen hipotetis benar-benar meningkatkan retrieval, bukan hanya meningkatkan cosine similarity secara artifisial.

## Kesalahan Umum

Menggunakan temperatur terlalu tinggi sehingga dokumen hipotetis menjadi tidak fokus. Mengabaikan evaluasi retrieval, sehingga hanya mengandalkan metrik generation yang bisa dipengaruhi faktor lain. Mengandalkan HyDE untuk semua jenis query meskipun sebagian besar query sudah sesuai dengan distribusi dokumen.

## Referensi Resmi

- [HyDE Paper](https://arxiv.org/abs/2012.16084)
- [LlamaIndex Documentation](https://github.com/run-llama/llama_index)
- [LangChain Documentation](https://github.com/langchain-ai/langgraph)
- [Haystack Documentation](https://docs.haystack.deepset.ai)
- [DeepSeek-V3 Documentation](https://github.com/deepseek-ai/DeepSeek-V3)

---

## FAQ

**Apakah HyDE menggantikan retrieval biasa?**
Tidak. HyDE adalah pendekatan untuk memperkuat retrieval. Anda tetap dapat menggunakan vector search atau hybrid search sebagai basis.

**Apakah dokumen hipotetis perlu disimpan?**
Tidak. Dokumen hipotetis hanya digunakan sebagai jembatan untuk menghasilkan vektor retrieval dan dapat diabaikan setelah proses selesai.

**Bagaimana cara mengevaluasi efektivitas HyDE?**
Bandingkan precision dan recall retrieval sebelum dan sesudah HyDE pada dataset evaluasi yang representatif. Juga ukur apakah jawaban akhir menjadi lebih akurat.

**Apakah HyDE bekerja dengan model open-source?**
Ya, selama model dapat menghasilkan dokumen yang informatif. Model yang lebih kecil mungkin memerlukan prompt yang lebih eksplisit.

**Apakah HyDE cocok untuk knowledge base yang berubah sering?**
Ya, karena HyDE tidak bergantung pada pelatihan ulang embedding. Selama indeks dokumen diperbarui, HyDE tetap berfungsi.

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [agentic-whatsapp-bot](./agentic-whatsapp-bot), [hermes-agent](./hermes-agent), [rag-vs-agents](./rag-vs-agents). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- https://github.com/storybookjs/storybook
- https://github.com/vuejs/core
- https://github.com/prometheus/prometheus
- https://superkilat.com/layanan/website-baru
