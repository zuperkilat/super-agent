---
title: 'Evaluasi RAG Sistem: Metrik dan Cara Mengukur Kualitas'
description: 'Metrik evaluasi RAG production — faithfulness, answer relevancy, context precision/recall, dan tools untuk mengukur setiap metrik.'
pubDate: '2026-07-27'
heroImage: '../../assets/blog-placeholder-14.jpg'
---

## Definisi

Evaluasi RAG system adalah proses mengukur kualitas retrieval dan generation secara sistematis. Berbeda dari evaluasi model LLM konvensional (perplexity, BLEU), evaluasi RAG mengukur kombinasi retrieval quality dan generation quality — apakah dokumen yang tepat di-retrieve dan jawaban yang dihasilkan akurat, relevan, dan berdasarkan konteks.

Istilah /glossary/faithfulness mengukur apakah jawaban LLM didukung sepenuhnya oleh konteks yang diberikan. Istilah /glossary/retrieval-recall mengukur proporsi dokumen relevan yang berhasil ditemukan oleh pipeline retrieval. Untuk evaluasi retrieval lanjutan, lihat [Context Precision & Recall Explained](/blog/context-precision-recall-explained) jika tersedia. Untuk RAG evaluation tools, lihat [RAG Evaluation Metrics](/blog/rag-evaluation-metrics).

## Masalah yang Dihadapi

Tim yang tidak mengevaluasi RAG secara sistematis menghadapi:

- **Invisible degradation**: retrieval quality turun perlahan tanpa terdeteksi karena tidak ada evaluasi berkala
- **Perbaikan tanpa ukuran**: mengupdate embedding model atau chunking strategy tanpa metrik yang jelas apakah ini membantu
- **Hallucination tanpa deteksi**: LLM menghasilkan jawaban yang terdengar benar tapi tidak didukung konteks
- **Resource waste**: menginvestasikan uang dan engineering effort pada improvement yang tidak terukur dampaknya
- **Stakeholder trust**: tanpa evaluasi, tidak bisa membuktikan kualitas RAG system kepada bisnis

## Cara Kerja Evaluasi RAG

Evaluasi RAG mengikuti pipeline terstruktur:

1. **Prepare test set**: kumpulan pasangan (query, ground-truth answer, expected sources)
2. **Run RAG pipeline**: eksekusi query melalui RAG system
3. **Measure retrieval metrics**: evaluasi apakah dokumen yang relevan ditemukan
4. **Measure generation metrics**: evaluasi apakah jawaban akurat, relevan, dan faithful
5. **Aggregate dan analyze**: hitung mean dan variance metrics
6. **Iterate**: berdasarkan result, tune parameters atau components

Evaluasi harus dilakukan secara terpisah untuk retrieval dan generation — menggabungkan keduanya menyamarkan di mana perbaikan dibutuhkan.

## Arsitektur Evaluasi

```
┌────────────────────────────────────────────────────────┐
│                  Evaluation Dataset                        │
│  {query, ground_truth_answer, expected_sources,        │
│   expected_context}                                    │
└────────────────────┬──────────────────────────────────┘
                      ▼ run RAG pipeline
┌────────────────────────────────────────────────────────┐
│             RAG Pipeline Execution                       │
│  Query → Embed → Retrieve → Rerank → Prompt → LLM    │
└────────────────────┬──────────────────────────────────┘
                      ▼ collect results
┌────────────────────────────────────────────────────────┐
│         Metric Calculation Layer                        │
│                                                        │
│  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │ RETRIEVAL METRICS      │  │ GENERATION METRICS   │ │
│  │ • Context Precision     │  │ • Faithfulness        │ │
│  │ • Context Recall        │  │ • Answer Relevancy    │ │
│  │ • MRR (Mean Reciprocal Rank) │  │ • Answer Correctness │ │
│  │ • Hit Rate@K           │  │ • Citation Accuracy   │ │
│  └─────────────────────┘  └────────────────────────┘ │
│                                                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │ END-TO-END METRICS                                │ │
│  │ • Answer Correctness (EC)                        │ │
│  │ • Information Density                             │ │
│  │ • User Satisfaction (if available)              │ │
│  └─────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## Komponen Evaluasi

### Retrieval Metrics
- **Context Precision**: dari retrieved docs, berapa persen yang relevan?
- **Context Recall**: dari semua relevant docs di knowledge base, berapa yang berhasil di-retrieve?
- **MRR (Mean Reciprocal Rank)**: rata-rata 1/rank dari first relevant document
- **Hit Rate@K**: percentage of queries where relevant doc appears in top-K

### Generation Metrics
- **Faithfulness**: apakah jawaban didukung oleh konteks yang diberikan? (no hallucination)
- **Answer Relevancy**: apakah jawaban relevan dengan query?
- **Answer Correctness**: apakah jawaban sesuai dengan ground truth?
- **Citation Accuracy**: apakah setiap claim dalam jawaban punya sumber yang benar?

### End-to-End Metrics
- **LlamaEval (v1/v2)**: comprehensive RAG eval framework
- **G-Eval**: LLM-as-judge untuk RAG quality
- **Human evaluation**: gold standard tapi mahal dan tidak scalable

## Contoh Nyata

Tim RAG production di industry mengevaluasi dengan framework formal:

- **E-commerce search**: evaluasi 500 query per sprint menggunakan faithfulness dan answer relevancy. Target: faithfulness > 0.85, answer relevancy > 0.90. Evaluasi menghasilkan discovery bahwa chunk size 512 tokens mengungguli 1000 tokens untuk product spec queries — temuan yang tidak bisa disimpulkan dari retrieval-only metrics.

- **Enterprise legal review**: evaluasi RAG dengan ground-truth dari senior lawyer. Metrik utama: citation accuracy dan faithfulness. System dievaluasi dengan 200 legal queries dari kasus nyata. Hasil: faithfulness 0.78 (22% of answers contain unsupported claims) — menunjukkan kebutuhan akan reranking step.

Untuk implementasi RAG evaluation tools, lihat [RAG Evaluation Metrics](/blog/rag-evaluation-metrics).

## Kapan Digunakan

- Ketika RAG pipeline sudah produksi dan perlu monitoring quality
- Sebelum dan sesudah update component (embedding model, chunk size, reranker model)
- Saat stakeholder meminta bukti kualitas RAG system
- Ketika mengalami drift retrieval quality seiring waktu
- Untuk research dan development yang perlu bandingkan pendekatan
- Sebagai bagian dari CI/CD pipeline yang menjalankan evaluasi pada setiap deploy

## Kapan Tidak

- Prototyping tanpa ground-truth dataset — evaluasi tanpa ground truth tidak bermakna
- Aplikasi di mana retrieval quality tidak kritis (chatbot entertainment)
- Tim tanpa expertise evaluation dan tidak ada budget untuk human labeling
- Ketika menggunakan RAG evaluation tools (RAGAS, DeepEval) tanpa memvalidasi dengan sampel human review

Alternatif: user feedback loop (thumbs up/down, explicit quality rating) sebagai proxy untuk RAG quality. Tidak menggantikan systematic evaluation tapi memberikan signal real-time.

## Kelebihan

- Mendeteksi kualitas degradation sebelum bisnis terpengaruh
- Memberikan signal perbaikan yang concrete dan actionable
- Stakeholder confidence dengan measurable quality guarantees
- Identifikasi component yang perlu dioptimasi (retrieval vs generation)
- Benchmark antar pendekatan (A/B testing dengan evaluasi)

## Kekurangan

- Memerlukan ground-truth dataset yang mahal dan time-consuming untuk dibuat
- Metrik tidak selalu berkorelasi dengan user satisfaction
- Evaluation framework (RAGAS, DeepEval) menambah complexity dan cost
- Human evaluation gold standard tidak scalable untuk ratusan queries
- Metrik bisa "game" — optimasi untuk metric yang salah tanpa improvement nyata
- Maintenance overhead evaluasi pipeline dan test set

## Best Practice

1. **Mulai dengan human-labeled eval set**: 100-500 query dari user yang representative
2. **Evaluasi retrieval dan generation secara terpisah**: jangan gabungkan metrics
3. **Gunakan RAGAS atau DeepEval untuk automated eval**: konsisten dan scalable
4. **Sertakan human review**: sample 5-10% automated eval results untuk validation
5. **Jalankan evaluasi setiap sprint**: jangan tunggu complaint dari user
6. **Track metrics historical**: time series evaluation metrics menunjukkan degradation trend
7. **Define quality thresholds**: faithfulness > 0.80, answer relevancy > 0.85 sebagai production gate
8. **Evaluate on production data**: eval set synthetic tidak mencerminkan distribusi query real
9. **A/B test component changes**: perubahan chunking strategy, embedding model, atau LLM diuji dengan eval set sebelum deploy
10. **Monitor latency per metric**: evaluasi yang lambat bisa become bottleneck dalam iteration cycle

## Kesalahan Umum

- Evaluasi retrieval dengan cosine similarity saja — retrieval recall dan precision harus diukur dengan ground truth, bukan similarity score
- Mengandalkan evaluasi LLM-as-judge tanpa human validation — LLM judge bisa bias terhadap jawaban yang terdengar plausible
- Tidak menyertakan negative queries: query yang seharusnya TIDAK menghasilkan retrieval tertentu
- Menggunakan eval script yang tidak reliable: RAGAS dan DeepEval seringkali punya bug atau metric definition yang berbeda dengan user expectation
- Mengevaluasi pada data yang tidak representative untuk distribusi query aktual
- Tidak melabeli ground-truth dengan benar: ground truth harus dari expert domain, bukan dari LLM-generated answer
- Mengabaikan retrieval time dalam evaluasi: latency adalah metrik kualitas bagi user, bukan hanya answer accuracy
- Evaluasi terlalu sering dengan eval set yang sama — overfitting pada eval set dan bukan improvement nyata
- Tidak mengevaluasi failure mode: apakah sistem gagal secara konsisten untuk jenis query tertentu?
- Menyimpulkan kualitas berdasarkan single metric saja

## Referensi Resmi

- [RAGAS Documentation](https://docs.ragas.io/) — framework evaluasi RAG terstandar
- [DeepEval](https://docs.deepeval.com/) — evaluation framework dengan 14+ RAG metrics
- [TruLens](https://www.trulens.org/) — evaluation and monitoring untuk LLM apps
- [LangSmith Evaluation](https://smith.langchain.com/) — observability dan evaluasi dari LangChain
- [NIST LLM Evaluation Guidelines](https://www.nist.gov/artificial-intelligence) — pedoman evaluasi AI pemerintah AS
- [HuggingFace RAG Evaluation Tutorials](https://huggingface.co/learn/llm-best-practices) — tutorial evaluasi retrieval

## FAQ

**Q: Berapa banyak evaluasi query yang dibutuhkan?**
A: Untuk initial baseline: 50-100 queries. Untuk statistik yang robust: 200-500 queries. Untau production monitoring: 100-500 queries per bulan cukup.

**Q: Apa metrik yang paling penting untuk RAG?**
A: Context recall (berapa banyak relevant info yang di-retrieve) dan faithfulness (apakah jawaban berdasarkan dokumen). Dua metrik ini memberikan sinyal terkuat tentang RAG quality.

**Q: Apakah RAGAS evaluation bisa "game"?**
A: Ya. LLM-as-judge (termasuk RAGAS) bisa bias terhadap jawaban yang terdengar meyakinkan tanpa memverifikasi factual accuracy. Selalu gunakan human spot-check untuk validasi.

**Q: Bagaimana cara membuat ground-truth eval set?**
A: Label 50 query: (1) minta domain expert jawab query, (2) identifikasi dokumen sumber yang seharusnya di-retrieve, (3) tuliskan ground-truth answer yang sepenuhnya berdasarkan sumber. Gunakan format yang konsisten.

**Q: Bagaimana mengukur faithfulness secara automated?**
A: RAGAS menggunakan approach LLM judge yang mengevaluasi setiap fakta dalam jawaban dan memeriksa apakah didukung oleh konteks. DeepEval menggunakan NLI (Natural Language Inference) model sebagai faithfulness scorer. Keduanya bagus namun memerlukan kalibrasi.

**Q: Kapan harus melakukan evaluation ulang?**
A: Setiap kali ada perubahan yang mengubah pipeline: ubah chunk size, ganti embedding model, update LLM, atau add/remove data sources. Juga setidaknya bulanan untuk monitoring degradation.
