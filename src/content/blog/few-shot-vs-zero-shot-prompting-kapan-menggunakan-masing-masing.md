---
title: 'Few-Shot vs Zero-Shot Prompting: Kapan Menggunakan Masing-Masing'
description: 'Perbandingan menyeluruh few-shot dan zero-shot prompting — kapan masing-masing efektif, trade-off bias, cost, dan best practice.'
pubDate: '2026-07-27'
heroImage: '../../assets/blog-placeholder-16.jpg'
---

## Definisi

Zero-shot prompting adalah teknik di mana model diberikan instruksi langsung tanpa contoh. Model mengandalkan pengetahuan pre-training-nya untuk menghasilkan jawaban yang sesuai. Few-shot prompting memberikan beberapa contoh (biasanya 3-10) di dalam prompt untuk mengarahkan model ke format, style, atau pola reasoning yang diinginkan. Keduanya adalah fondasi prompt engineering — teknik paling fundamental dan paling sering digunakan.

Istilah /glossary/task-generalization merujuk pada kemampuan model untuk menangani tugas yang belum pernah dilihat secara spesifik berdasarkan training-nya. Istilah /glossary/task-specific-bias menggambarkan kecenderungan model untuk terpengaruh oleh pola dalam contoh yang diberikan (few-shot) atau oleh distribusi pengetahuan pre-training (zero-shot). Untuk teknik lanjutan, lihat [Teknik Prompt Engineering Lanjutan untuk 2026](/blog/teknik-prompt-engineering-lanjutan-untuk-2026).

## Masalah yang Dihadap

Memilih antara zero-shot dan few-shot bukan pilihan hitam-putih — ada spektrum nuance:

- **Model yang tidak tahu format output yang diinginkan**: tanpa example, model menebak format → inconsistent output
- **Ketika bias pada contoh few-shot lebih buruk dari bias zero-shot**: contoh yang dipilih dengan buruk dapat mengarahkan model ke arah yang salah
- **Cost dan latency**: few-shot menambah token consumption yang signifikan di prompt
- **Task complexity**: tugas sederhana tidak memerlukan examples, tapi tugas kompleks mungkin membutuhkan beberapa
- **Domain-specific terminology**: saat domain punya vocabulary khusus yang mungkin tidak ada di training data model
- **Overfitting example**: dengan too many examples, model mulai "memorize" pola contoh daripada generalizing

## Cara Kerja Zero-Shot

Model menerima instruksi saja. Tidak ada contoh eksplisit dalam prompt. Model menggunakan pengetahuan yang di-acquire selama pre-training untuk menghasilkan output yang sesuai dengan instruksi.

```
Prompt: "Klasifikasikan ulasan berikut sebagai positif atau negatif. Ulasan: 'Makanan luar biasa tapi pelayanan lambat'."
Output: "Positif"
```

Zero-shot bekerja paling baik ketika:
- Tugas sudah sering dijumpai oleh model selama pre-training
- Instruksi jelas dan tidak ambigu
- Output format cukup straightforward (sentiment, kategori, ya/tidak)
- Tidak perlu mencontoh format yang sangat spesifik

## Cara Kerja Few-Shot

Model menerima instruksi DAN beberapa contoh. Contoh berfungsi sebagai in-context learning — memberi model "preview" dari pola yang diharapkan.

```
Prompt: "Klasifikasikan ulasan berikut sebagai positif atau negatif.

Ulasan: 'Makanan luar biasa!' → Positif
Ulasan: 'Pelayanan buruk dan dingin' → Negatif
Ulasan: 'Tempat bagus tapi harga mahal' → ?
Output: ?"
```

Few-shot bekerja paling baik ketika:
- Output format sangat spesifik (JSON dengan schema tertentu)
- Model perlu belajar pola yang jarang tapi konsisten
- Tugas yang ambiguous tanpa contoh (nuanced sentiment, edge cases)
- Kualitas output sangat dependent pada format consistency

## Arsitektur Perbandingan

```
┌──────────────────────────────────────────────────────────────┐
│                    ZERO-SHOT                                   │
│                                                                  │
│  [Instruction] → Model → Response                               │
│                                                                  │
│  ✅ Cepat, murah, simple                                       │
│  ❌ Tidak ada kontrol format, quality tergantung pre-training │
│  ❌ Ambiguous tanpa contoh                                      │
├──────────────────────────────────────────────────────────────┤
│                    FEW-SHOT (3-10 examples)                      │
│                                                                  │
│  [Instruction] → [Example 1] → [Example 2] → [Example 3]      │
│  → Model → Response                                              │
│                                                                  │
│  ✅ Kontrol format, menunjukkan pola yang diinginkan           │
│  ✅ Quality lebih konsisten                                     │
│  ❌ Lebih banyak token → lebih mahal                            │
│  ❌ Risiko bias dari contoh yang buruk                          │
│  ❌ Maksimal ~10-16 examples sebelum context window penuh     │
└──────────────────────────────────────────────────────────────┘
```

Untuk deep-dive few-shot dengan teknik selecting exemplars, lihat [Few-Shot Prompting Deep Dive](/blog/few-shot-prompting-deep-dive-production).

## Komponen Kunci

**Zero-Shot Components:**
1. Instruction clarity: seberapa jelas dan spesifik instruksi
2. Task framing: bagaimana tugas di-formalkan untuk model
3. Output formatting instruction: apakah model tahu format yang diinginkan
4. Role/persona setting: konteks siapa yang berbicara
5. Constraints dan guardrails: apa yang boleh dan tidak boleh dilakukan model

**Few-Shot Components:**
1. Number of examples: 3-5 untuk general tasks, 10 untuk format-specific tasks
2. Example quality: contoh harus representatif, bukan average
3. Example diversity: cover edge cases dan failure modes
4. Example format: structure input → output harus konsisten dengan inference input
5. Position of examples: beberapa research menunjukkan examples di tengah (golden position) lebih efektif
6. Example selection: strategic sampling vs random sampling

## Contoh Nyata Penerapan

**Zero-shot dalam production**: Chatbot FAQ menggunakan zero-shot klasifikasi intent. Setiap user query diklasifikasikan ke intent (bookings, cancellation, refund, general) dengan instruksi saja. Model sudah tahu format intent classification dari pre-training. Tidak perlu example — 80% accuracy baseline yang cukup untuk routing.

**Few-shot dalam production**: Invoice extraction dari dokumen PDF. Format extraction sangat spesifik — field name, data type, dan format setiap field harus konsisten. Few-shot dengan 5 contoh (setiap contoh: invoice image + JSON output) meningkatkan accuracy dari 60% (zero-shot) ke 92% (few-shot). Cost: 500 token per request lebih banyak, tapi ROI dari accuracy improvement sangat signifikan.

**Hybrid approach**: Zero-shot untuk classification (intent), few-shot untuk extraction (structured data), dan zero-shot untuk generation (summary). Setiap subtask dalam pipeline menggunakan teknik yang paling efektif untuk subtask tersebut.

Untuk prompt engineering dalam konteks agentic systems, lihat [Prompt Engineering Agentic Systems](/blog/prompt-engineering-agentic-systems) jika tersedia, dan [Chain-of-Thought Prompting](/blog/chain-of-thought-prompting-complex-reasoning) untuk teknik reasoning.

## Kapan Menggunakan Zero-Shot

- Tugas klasifikasi sederhana (sentiment, intent, topic)
- Pertanyaan yang jawabannya sudah ada dalam pengetahuan model
- Pembuatan struktur output yang model sudah familiar (JSON, markdown, list)
- Ketika latency dan cost sensitivity tinggi
- Ideation dan brainstorming yang memerlukan kreativitas, bukan format consistency
- Ketika tidak ada access ke labeled examples berkualitas
- Ketika task distribution sangat beragam dan tidak bisa direpresentasikan oleh beberapa examples

## Kapan Menggunakan Few-Shot

- Output format sangat spesifik (schema JSON tertentu, structured data extraction)
- Task yang ambiguous tanpa contoh
- Ketika kualitas dan consistency output lebih penting dari cost dan latency
- Ketika model perlu belajar style atau tone tertentu
- Tugas yang memerlukan pengetahuan spesifik domain yang jarang di training data
- Ketika zero-shot baseline tidak cukup (accuracy di bawah threshold)

## Kapan Tidak Menggunakan Masing-Masing

**Tidak zero-shot jika:**
- Tugas memerlukan format output yang sangat spesifik dan non-standard
- Task ambiguity tinggi dan model perlu melihat contoh untuk memahami apa yang diharapkan
- Zero-shot baseline accuracy konsisten di bawah acceptable threshold

**Tidak few-shot jika:**
- Context window terbatas dan setiap token penting
- Cost per request sangat sensitive (high-volume API)
- Contoh berkualitas rendah atau bias — few-shot example noise lebih buruk dari zero-shot baseline
- Tugas sangat sederhana yang bisa diselesaikan zero-shot dengan instruction yang baik

Alternatif: zero-shot + output format instruction (mid-point antara zero-shot dan few-shot) dan structured prompt dengan schema definition tanpa examples. Juga lihat [Chunking Strategy untuk RAG](/blog/chunking-strategy-untuk-retrieval-augmented-generation) untuk konteks penggunaan few-shot dalam pipeline data.

## Kelebihan Zero-Shot

- Latency paling rendah (tidak ada token untuk examples)
- Cost paling murah (minimal prompt tokens)
- Setup paling cepat dan simple
- Tidak ada risk example bias
- Model bisa generalize ke tugas yang tidak pernah dilihat dalam examples
- Skalabel untuk kategori task yang sangat beragam

## Kekurangan Zero-Shot

- Format control terbatas — model free-form output kecuali ada instruction eksplisit
- Quality variance tinggi di antara model dan tugas
- Tidak ada in-context learning (kesempatan belajar dari example)
- Model mungkin tidak tahu format apa yang diinginkan
- Untuk tugas niche, zero-shot quality bisa sangat rendah

## Kelebihan Few-Shot

- Format control yang presisi — model belajar dari pattern dalam examples
- Consistency tinggi di antara multiple runs
- Model bisa "belajar" domain terminology dan task-specific patterns dari example
- Quality lebih predictable dan stable
- Example selection adalah hyperparameter yang powerful untuk optimize

## Kekurangan Few-Shot

- Token cost meningkat seiring jumlah examples
- Latency meningkat (more tokens to process)
- Example selection yang buruk dapat memperburuk output
- Risk of overfitting ke pattern contoh (model copy format, bukan mempelajari task)
- Context window limit membatasi jumlah examples yang bisa ditambahkan
- Maintenance overhead ketika task requirement berubah (retrain examples)

## Best Practice

1. **Mulai dengan zero-shot untuk semua tugas**: jangan tambahkan few-shot tanpa membuktikan zero-shot kurang memadai
2. **Jika few-shot diperlukan, mulai dengan 3 examples**: lebih sedikit bisa cukup, lebih banyak tidak selalu lebih baik
3. **Pilih examples secara strategis**: include positive cases, negative cases, dan edge cases
4. **Consistency contoh format**: setiap example harus mengikuti pola yang sama (input → output)
5. **Bervariasi topic dalam examples**: jangan semua examples dari topik yang sama — model bisa overfit ke domain dalam examples
6. **Gunakan output format instruction + few-shot together**: instruction menentukan aturan umum, example menunjukkan penerapannya
7. **Monitor example quality**: jika task distribution berubah, review dan update examples secara berkala
8. **Measure cost impact**: track token usage zero-shot vs few-shot dan apakah quality improvement worth cost increase
9. **Consider zero-shot + output schema**: untuk tasks yang butuh structure, schema definition mungkin cukup tanpa examples
10. **A/B test**: bandingkan zero-shot dan few-shot dengan metrik yang sama untuk tugas spesifik Anda

## Kesalahan Umum

- Menggunakan too many examples (10-15) tanpa evidence bahwa lebih banyak membantu
- Memilih contoh yang tidak representatif — semua positive examples, tidak ada edge cases
- Inconsistent format antar examples — setiap example dengan format berbeda menambah noise
- Tidak ada explicit instruction tentang format di antara examples — model menebak format
- Menganggap few-shot selalu lebih baik dari zero-shot — untuk tugas sederhana, zero-shot sudah optimal
- Tidak mempertimbangkan cost impact few-shot di scale (10,000 QPS × 500 extra tokens = signifikan)
- Menggunakan examples dari domain yang sangat berbeda dengan inference domain — model bisa bingung
- Overfitting ke specific examples — model menghafal pola contoh, bukan mempelajari task
- Tidak melakukan shuffle atau rotation examples — model bisa bias ke position (first examples lebih berpengaruh)
- Ignoring temperature settings — temperature lebih tinggi saat few-shot dapat membantu model generalize dari pattern contoh lebih baik

## Referensi Resmi

- [GPT-4 Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering/) — official OpenAI best practice
- [Few-Shot Prompting Paper (Brown et al., 2020)](https://arxiv.org/abs/2005.14165) — original paper demonstrating few-shot learning in language models
- [Anthropic Prompt Engineering Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) — Claude-specific best practices
- [Google Gemini Prompt Engineering](https://ai.google.dev/docs/prompting) — Gemini prompting guide with few-shot patterns
- [LlamaIndex Few-Shot Guide](https://docs.llamaindex.ai/) — framework-specific few-shot implementation patterns

## FAQ

**Q: Berapa banyak few-shot examples yang ideal?**
A: 3-5 examples memberikan sweet spot untuk kebanyakan tugas. Di atas 10, diminishing returns dan potential overfitting. Beberapa tugas format-specific (JSON extraction, code generation) membutuhkan 7-10 examples.

**Q: Apakah zero-shot bisa sebaik few-shot untuk semua tugas?**
A: Tidak secara universal. Untuk tasks dengan format output spesifik dan non-standard, few-shot konsisten lebih baik. Untuk tasks yang model sudah familiar dari pre-training, zero-shot sama baiknya atau bahkan lebih baik (tidak ada example bias risk).

**Q: Apakah order examples penting?**
A: Ya, terutama untuk model dengan positional bias. Beberapa research menunjukkan placing "golden" examples di tengah (bukan di awal atau akhir) memberikan best results. Tapi untuk kebanyakan practical use kasus, order tidak signifikan selama examples konsisten.

**Q: Apa perbedaan few-shot dan fine-tuning?**
A: Few-shot mengubah prompt saat inference — no model changes. Fine-tuning mengubah model weights saat training. Few-shot: zero training cost, flexible, per-query. Fine-tuning: high training cost, fixed behavior, consistent.

**Q: Apakah zero-shot bisa digunakan untuk structured output?**
A: Ya, dengan output format instruction yang eksplisit (misal "Respons dalam JSON dengan field: sentiment, confidence, explanation"). Model sudah familiar dengan JSON format dari pre-training, jadi zero-shot seringkali cukup untuk structured output tasks.

**Q: Bagaimana memilih antara zero-shot dan few-shot secara decision framework?**
A: 1) Coba zero-shot dulu. 2) Jika quality < threshold atau format inconsistent, tambahkan 3-5 few-shot examples. Jika masih < threshold setelah few-shot optimization, pertimbangkan fine-tuning atau chain-of-thought prompting untuk tasks reasoning-heavy. Lihat [Teknik Prompt Engineering Lanjutan](/blog/teknik-prompt-engineering-lanjutan-untuk-2026) untuk teknik lebih lanjut.
