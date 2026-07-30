---
title: 'Chunking Strategy untuk Retrieval-Augmented Generation'
description: 'Panduan memilih chunking strategy optimal untuk RAG: fixed-size, semantic, parent-child, dan hybrid. Contoh kode dan evaluasi.'
pubDate: '2026-07-27'
heroImage: '../../assets/blog-placeholder-13.jpg'
---

## Definisi

Chunking strategy adalah metode memecah dokumen menjadi potongan-potongan kecil (chunks) sebelum embedding dan penyimpanan di vector database untuk RAG. Chunk menjadi unit dasar retrieval — setiap kali sistem RAG mencari dokumen relevan, ia sebenarnya mencari chunk, bukan dokumen utuh.

Istilah /glossary/chunk-overlap merujuk pada jumlah token yang tumpang tindih antar chunk berurutan untuk mempertahankan konteks lintas boundary chunk. Istilah /glossary/semantic-boundary merujuk pada pemecahan dokumen berdasarkan struktur semantik (paragraf, heading, section) bukan ukuran byte yang arbitrary, sehingga setiap chunk koheren secara makna. Untuk evaluasi chunking quality, lihat [Evaluasi RAG Sistem](/blog/evaluasi-rag-sistem-metrik-dan-cara-mengukur-kualitas). Untuk arsitektur RAG lengkap, lihat [RAG Panduan Lengkap 2026](/blog/rag-retrieval-augmented-generation-panduan-lengkap-2026).

## Masalah yang Dihadapi

Chunking sering menjadi bottleneck tersembunyi dalam RAG system. Masalah umum:

- **Chunk terlalu kecil**: kehilangan konteks cross-chunk, retrieval miss karena informasi terfragmentasi
- **Chunk terlalu besar**: noise dari konteks tidak relevan, biaya token meningkat, relevansi menurun
- **Chunk di tengah kalimat**: memotong gagasan yang utuh, embedding menjadi kabur
- **Chunk berdasarkan ukuran fixed tanpa mempertimbangkan dokumen structure**: table terpotong, kode terfragmentasi, list putus
- **Tidak ada strategy chunking yang konsisten**: tim yang berbeda menggunakan pendekatan berbeda tanpa evaluasi

Setiap dokumen membutuhkan chunk strategy yang berbeda — panduan seragam menghasilkan hasil rata-rata.

## Cara Kerja

Chunking strategy menentukan bagaimana algoritma memecah aliran teks menjadi chunks. Setiap strategy punya trade-off antara retrieval quality, latency, dan cost:

1. **Fixed-Size Chunking**: potong teks setiap N token, dengan overlap M token. Sederhana dan predictably.
2. **Semantic Chunking**: potong di boundary makna (heading, paragraph, section). Koheren tapi sulit otomatis.
3. **Parent-Child Chunking**: buat chunk kecil untuk retrieval dan chunk besar (parent) untuk context. Retrieval temukan child, generation gunakan parent.
4. **Late Chunking (Colbert-style)**: dokumen di-tokenisasi penuh, dan attention dilakukan per-token saat retrieval — mengurangi dependency pada chunk boundaries.
5. **Sliding Window**: jendela yang bergerak dengan overlap tetap — menghasilkan overlapping views of konteks.

Untuk implementasi late chunking, lihat [ColBERT Late Interaction Retrieval](/blog/colbert-late-interaction-retrieval) jika tersedia di blog ini.

## Arsitektur Chunking Strategies

```
┌──────────────────────────────────────────────────────┐
│               Fixed-Size Chunking                         │
│  "lorem ipsum dolor sit amet, consectetur adipiscing"  │
│  ├─ chunk 1: "lorem ipsum dolor sit amet..." (512 tkn) │
│  ├─ chunk 2: "[overlap 50 tkn]...consectetur adipiscing" │
│  └─ chunk 3: "[overlap 50 tkn]..."                     │
│  Sederhana, tapi potong ide di tengah kalimat          │
├──────────────────────────────────────────────────────┤
│              Semantic Chunking                            │
│  # Heading 1                                           │
│  "paragraf pertama berisi konteks penuh section"       │
│  # Heading 2                                           │
│  "paragraf kedua berisi konteks penuh section"         │
│  Koheren tapi hanya berfungsi untuk dokumen b-structure │
├──────────────────────────────────────────────────────┤
│            Parent-Child Chunking                          │
│  Parent: seluruh dokumen atau section                 │
│  ├─ Child 1: subset kecil dari parent (256 tokens)    │
│  ├─ Child 2: subset kecil lain dari parent            │
│  └─ Child N: ...                                     │
│  Retrieval → Child → Generation dengan full Parent     │
├──────────────────────────────────────────────────────┤
│             Late Chunking (Colbert)                      │
│  Dokumen di-tokenisasi penuh                           │
│  Retrieval: per-token attention scoring                │
│  Tidak perlu chunk boundary sama sekali                │
│  Memerlukan model dengan late-interaction architecture │
└──────────────────────────────────────────────────────┘
```

Lihat arsitektur retrieval lanjutan di [RAG Retrieval-Augmented Generation Panduan 2026](/blog/rag-retrieval-augmented-generation-panduan-lengkap-2026).

## Komponen Kunci

1. **Splitter**: algoritma yang menentukan cara memecah (RecursiveCharacterTextSplitter, SemanticChunker, LangChain splitters)
2. **Chunk size**: optimal untuk embedding model context window dan retrieval quality
3. **Overlap**: konteks shared antar chunk berurutan (biasanya 10-20% dari chunk size)
4. **Metadata**: setiap chunk dilengkapi metadata (source file, chunk index, section heading, page number)
5. **Tokenizer alignment**: chunk harus align dengan model tokenizer — jangan putus di tengah token
6. **Separator strategy**: karakter pemisah (newline, paragraph, sentence) yang konsisten dengan semantik dokumen
7. **Filtering**: chunk terlalu pendek (<50 token) atau terlalu panjang (>model context window) perlu dibuang atau digabung

## Contoh Kode

```python
# Semantic Chunking dengan LangChain
from langchain.text_splitter import SemanticChunkingTextSplitter

# Semantic chunking mempertahankan boundary kalimat
# dan mendeteksi topic shift
splitter = SemanticChunkingTextSplitter(
    break_point_kind="line_ending",
    threshold=0.95,  # similarity threshold untuk split
    max_chunk_size=1000,
)
chunks = splitter.split_text(long_document_text)
```

```python
# Parent-Child Chunking
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
)

# Parent: section-level chunks (2000 tokens)
parent_splitter = RecursiveCharacterTextSplitter(
    chunk_size=2000, chunk_overlap=200
)
# Child: sub-section chunks (500 tokens)
child_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, chunk_overlap=50
)

parents = parent_splitter.split_text(document)
children_by_parent = {}
for parent in parents:
    children = child_splitter.split_text(parent.page_content)
    children_by_parent[parent.metadata["source"]] = {
        "parent": parent,
        "children": children
    }
```

## Contoh Nyata

- **Code repositories**: untuk documentation code, chunking per function dengan metadata "language", "class", "function name". Retrieval per function yang relevan lebih akurat daripada chunking acak.

- **Legal contracts**: chunking per section dan clause (dengan heading sebagai metadata) memungkinkan pencarian spesifik "termination clause" daripada menemukan klausa yang relevan di tengah 50 halaman kontrak.

- **Research papers**: parent chunk = paragraph (konteks generation), child chunk = sentence/claim (retrieval unit). Model retrieval temukan klaim spesifik, model generation menghasilkan jawaban dengan konteks paragraph lengkap.

- **E-commerce product descriptions**: fixed-size chunking 1000 tokens dengan metadata product_id dan category. Filtering per-category saat retrieval meningkatkan relevansi 30-50%.

## Kapan Digunakan

- Dokumen panjang > 10 halaman (parent-child atau semantic chunking)
- Dokumen bers structure (heading hierarchy, sections)
- Code/documentation yang lebih baik dichunk per function/class
- Dataset heterogen dengan mix panjang dokumen
- Ketika re-retrieval dan re-ranking diperlukan (hierarchical retrieval)
- Ketika retrieval quality adalah metrik utama dan budget retrieval memadai

## Kapan Tidak

- Dokumen pendek < 1 halaman (tidak perlu di-chunk, embed utuh)
- Dataset seragam dengan query sederhana (fixed-size 512 tokens cukup)
- Prototyping — mulai dengan simple fixed-size dan upgrade setelah baseline evaluasi
- Ketika sumber data tidak memiliki struktur yang bisa dimanfaatkan untuk semantic chunking

Alternatif: Late chunking (ColBERT-style) yang menghilangkan kebutuhan chunk boundary sama sekali, atau sliding window approach yang memberikan overlapping view konteks. Untuk evaluasi strategy, lihat [Evaluasi RAG Sistem](/blog/evaluasi-rag-sistem-metrik-dan-cara-mengukur-kualitas).

## Kelebihan

- Semantic chunking mempertahankan konteks dan coherence antar-chunk
- Parent-child memberikan retrieval precision (child) dan generation quality (parent)
- Fixed-size adalah baseline yang reliable dan cepat
- Metadata pada chunk meningkatkan filtering dan precision
- Strategy yang tepat meningkatkan retrieval recall 20-40% vs naive chunking
- Late chunking menghilangkan dependency pada chunk boundaries

## Kekurangan

- Semantic chunking membutuhkan NLP infrastructure (sentence boundary detection, topic modeling)
- Parent-child menambah complexity pipeline dan storage (2x chunks)
- Fixed-size berpotensi memotong gagasan di tengah
- Late chunking memerlukan model arsitektur khusus (ColBERT) yang kurang mature
- Setiap strategy memerlukan evaluasi pada data spesifik — tidak ada strategy universal
- Overlap yang terlalu besar meningkatkan storage dan retrieval cost tanpa improvement signifikan

## Best Practice

1. **Evaluasi chunk size pada data Anda**: test 256, 512, 1000, 2000 token dan ukur retrieval recall@10 untuk masing-masing
2. **Gunakan overlap 10-20%** — terlalu bisa menduplikasi konteks, terlalu sedikit konteks hilang di boundary
3. **Pertahankan chunk align dengan semantic boundaries**: jangan putus di tengah paragraf
4. **Rich metadata**: setiap chunk harus punya source, chunk_id, parent_id, section heading, page number, dan domain-specific metadata
5. **Filter chunk yang tidak informatif**: chunks yang hanya whitespace, page numbers, atau boilerplate
6. **Monitor chunk quality secara berkala**: sampling random retrieval results dan periksa apakah chunk relevan dengan query
7. **Iterate berdasarkan failure mode**: jika retrieval miss karena konteks fragmentasi, naikkan chunk size atau kurangi overlap
8. **Combine strategies**: semantic chunking untuk dokumen bers-structure, fixed-size untuk dokumen unstructured — dengan router yang mendeteksi dokumen type
9. **Jangan chunking terlalu granular untuk retrieval tasks**: chunk dengan <50 token kehilangan konteks yang cukup
10. **Evaluasi end-to-end**: jangan evaluasi chunk retrieval in isolation — ukur apakah chunk menghasilkan answer yang benar dalam RAG pipeline lengkap

## Kesalahan Umum

- Menggunakan satu chunk size untuk semua jenis dokumen — PDF riset memerlukan strategy berbeda dari HTML knowledge base
- Overlap 0% yang menyebabkan konteks hilang di boundary chunk
- Tidak menyertakan chunk index dan metadata — menyulitkan debug dan re-ranking
- Mengabaikan tokenizer alignment — chunk yang memotong multi-byte token menghasilkan embedding yang rusak
- Tidak mengevaluasi chunking impact pada end-to-end RAG — hanya evaluasi retrieval recall (korelasi buruk dengan answer quality)
- Fixed-size berdasarkan karakter (bukan token) yang tidak align dengan embedding model tokenization
- Chunking berdasarkan model size tanpa mempertimbangkan model context window (model 8kx bisa handle chunk 4k, 32kx bisa handle 16k)
- Tidak mempertimbangkan retrieval strategy saat menentukan chunk size — hybrid retrieval mungkin toleran terhadap chunk size yang lebih besar

## Referensi Resmi

- [LangChain Text Splitter Documentation](https://python.langchain.com/docs/modules/data_connection/document_transformers/) — reference implementation untuk chunking
- [Unstructured.io Document Processing](https://docs.unstructured.io/) — parsing dan chunking multi-format
- [ColBERT Late Interaction Retrieval](https://github.com/stanford-futuredata/ColBERT) — late chunking approach
- [RAGAS Evaluation](https://docs.ragas.io/) — framework untuk mengukur dampak chunking pada RAG quality
- [HuggingFace BGE Embedding Models](https://huggingface.co/BAAI) — embedding model yang optimal untuk berbagai chunk sizes

## FAQ

**Q: Bagaimana menentukan chunk size optimal untuk RAG saya?**
A: Lakukan eksperimen dengan 3-4 chunk size (256, 512, 1000, 2000) dan ukur retrieval recall@10 dengan ground truth yang relevan. Pilih chunk size yang menghasilkan recall tertinggi. Benchmark harus menggunakan data Anda sendiri.

**Q: Apa itu optimal overlap?**
A: 10-20% dari chunk size. Overlap <10% menghilangkan konteks di boundary; overlap >30% menduplikasi konteks dan meningkatkan retrieval cost tanpa improvement signifikan.

**Q: Apakah semantic chunking selalu lebih baik daripada fixed-size?**
A: Tidak selalu. Untuk dokumen yang tidak memiliki struktur (plain text, email), semantic chunking tidak banyak berbeda dari fixed-size. Semantic chunking unggul untuk dokumen b-structure (PDF, HTML, markdown).

**Q: Bagaimana parent-child chunking bekerja dalam praktik?**
A: Retrieval hanya search child chunks (kecil, precise). Saat jawaban di-generate, parent chunk (besar, context) dikirim ke LLM bersama child chunk yang relevan. Ini memberikan precision retrieval dan context-rich generation.

**Q: Apakah late chunking menggantikan fixed-size chunking?**
A: Late chunking (ColBERT-style) cocok untuk retrieval yang akurat tanpa dependency chunk boundaries. Namun memerlukan model arsitektur khusus dan tidak didukung oleh semua vector DB. Fixed-size masih paling universal dan reliable.

**Q: Berapa banyak chunk yang ideal per dokumen?**
A: Tergantung panjang dokumen dan chunk size. Panduan umum: chunk size yang menghasilkan 5-20 chunks per dokumen untuk dokumen 10-50 halaman terlalu banyak chunk. Untuk 500 halaman, 50-200 chunks adalah wajar jika metadata filtering diterapkan.
