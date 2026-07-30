---
title: 'Prompt Engineering Best Practice dari IBM dan Anthropic'
description: 'Panduan prompt engineering berbasis praktik terbaik IBM dan Anthropic untuk model bahasa besar. Teknik, arsitektur, dan pola yang terbukti di production.'
pubDate: '2026-07-27'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

## Definisi

Prompt engineering adalah seni dan ilmu merancang instruksi yang diberikan ke model bahasa besar (LLM) agar menghasilkan output yang akurat, konsisten, dan dapat diandalkan. Praktik terbaik dari IBM dan Anthropic menunjukkan bahwa prompt yang dirancang dengan baik dapat meningkatkan kinerja model hingga orde besar tanpa perlu mengubah model itu sendiri. [Prompt engineering](/glossary/#prompt-engineering) menjadi inti strategi AI modern karena mengurangi kebutuhan fine-tuning dan memungkinkan iterasi cepat.

## Masalah

Banyak tim mengalami degradasi kualitas output saat beralih dari prototipe ke production. Masalah umum meliputi output yang tidak konsisten antar sesi, respons yang mengandung hallucinasi, failure mode yang tidak terduga ketika input diubah sedikit, dan biaya operasional yang membengkak karena prompt yang terlalu panjang. [Chain-of-thought prompting](/glossary/#chain-of-thought) dan teknik lain dari IBM Research dan Anthropic memberikan kerangka metodis untuk mengatasi masalah ini secara sistematis.

## Cara Kerja

IBM Research menekankan pendekatan *iterative refinement*: buat prompt awal, evaluasi output, identifikasi failure case, lalu sesuaikan instruksi dan contoh. Anthropic mengembangkan teknik berbasis *system-level instructions* di mana pesan sistem memberikan konteks peran dan batasan yang jelas, mengurangi kebutuhan untuk mengulangi instruzioni dalam setiap pesan pengguna. [Anthropic's prompt library](https://docs.anthropic.com/en/docs/prompts) dan [IBM's AI guidance](https://www.ibm.com/thought-leadership/institute-business-value/prompt-engineering) menyediakan pola yang dapat direplikasi. Gabungan kedua pendekatan ini menghasilkan prompt yang ringkas namun efektif.

## Arsitektur

Arsitektur prompt production yang baik mengikuti pola hierarkis. Lapisan atas adalah *system prompt* yang menetapkan peran dan constraints. Lapisan kedua adalah *few-shot examples* yang menunjukkan pola input-output yang diharapkan. Lapisan ketiga adalah *user query* yang bervariasi per interaksi. Dalam sistem agentic, ada tambahan *tool schema instructions* yang mengarahkan model untuk pemanggilan fungsi yang tepat. Arsitektur ini menciptakan *[prompt template](/glossary/#prompt-template) yang modular dan mudah diuji*.

## Komponen

1. **System Prompt**: Menetapkan persona, batasan, dan format output. Anthropic menyarankan pernyataan eksplisit tentang apa yang *bukan* model lakukan.
2. **Few-shot Examples**: 3-5 contoh yang mencakup kasus normal dan edge case. IBM merekomendasikan variasi dalam contoh untuk mencegah overfitting pada pola tertentu.
3. **Context Window**: Informasi latar yang relevan dibatasi pada kebutuhan minimum untuk menjaga efisiensi token.
4. **Output Format Specification**: Definisi JSON schema atau format terstruktur yang konsisten agar output mudah diproses downstream.
5. **Safety Guidelines**: Instruksi eksplisit untuk menolak permintaan berbahaya, sesuai prinsip Anthropic AI Safety.

## Contoh Nyata

Sebuah perusahaan fintech menerapkan *prompt template system* dari IBM untuk klasifikasi kategori transaksi bank. Awalnya, akurasi model hanya 72% dengan prompt bebas. Setelah menerapkan struktur: system role (expert financial analyst) + 5 few-shot examples covering edge cases (transaksi multi-mata uang, refund) + format output JSON terstruktur, akurasi naik menjadi 94%. Tim menggunakan *prompt caching* untuk mengurangi latency. [IBM Prompt Engineering Guide](https://www.ibm.com/think/topics/prompt-engineering) memberikan detail lebih lanjut.

## Kapan Digunakan

Prompt engineering terbaik berlaku ketika Anda perlu: mengontrol format output LLM secara konsisten, mengurangi hallucinasi pada kasus penggunaan kritis, mengoptimalkan biaya inference dengan meminimalkan prompt length, dan membangun pipeline yang memerlukan perilaku model yang dapat direproduksi antar sesi. Teknik ini juga essential untuk [agentic AI systems](/blog/agentic-ai-fundamentals-2026.md) yang bergantung pada reasoning yang andal.

## Kapan Tidak

Prompt engineering saja tidak cukup ketika model secara fundamental kekurangan pengetahuan domain spesifik yang tidak ada di training data. Juga tidak efektif ketika tugas memerlukan logika matematika kompleks tanpa penalaran step-by-step—di sini diperlukan fine-tuning atau *reinforcement learning from human feedback (RLHF)*. [RAG vs Agents](/blog/rag-vs-agents.md) adalah alternatif ketika problemnya adalah retrieval knowledge, bukan instruksi.

## Alternatif

Alternatif dari prompt engineering murni termasuk fine-tuning model pada dataset spesifik domain, RAG (Retrieval-Augmented Generation) untuk menginfus pengetahuan eksternal, dan *tool calling* dengan *function calling API* yang memungkinkan model mengeksekusi aksi nyata. [MCP Model Context Protocol](/blog/mcp-model-context-protocol.md) menyediakan alternatif terstruktur untuk integrasi tool tanpa prompt engineering manual setiap kali.

## Kelebihan

- Implementasi cepat tanpa perubahan model.
- Biaya rendah karena hanya mengubah instruksi, bukan model.
- Mudah diiterasi—a/B testing prompt berbeda dalam hitungan menit.
- Tidak memerlukan GPU atau infrastruktur training tambahan.
- Dapat diterapkan di atas API manapun (OpenAI, Anthropic, self-hosted).

## Kekurangan

- Tidak mengubah kemampuan fundamental model—hanya mengarahkan perilaku.
- Sensitif terhadap perubahan model versi (prompt yang optimal untuk GPT-4 mungkin tidak optimal untuk Claude 3.5).
- Scaling menjadi kompleks ketika ratusan prompt dikelola untuk ratusan use case.
- Tidak menyelesaikan masalah knowledge gap model—hanya mengarahkan bagaimana model menggunakan pengetahuannya.

## Best Practice

1. **Mulai dengan system prompt yang jelas** — tentukan peran, tujuan, dan output format sebelum menambahkan examples.
2. **Gunakan few-shot yang beragam** — sertakan kasus edge untuk mengurangi unexpected failure mode.
3. **Pisahkan instruksi dari konteks** — system prompt berisi perilaku, user message berisi data spesifik.
4. **Validasi output secara otomatis** — gunakan *output schema validation* untuk menangkap kesalahan sebelum downstream.
5. **Monitor dan iterasi** — catat input-output pairs dari production untuk mengidentifikasi failure case baru.
6. **Batasi context window secara bijak** — tidak semua informasi perlu dalam prompt; kurangi noise.
7. **Tetapkan safety guardrails** — ikuti prinsip *[Anthropic Constitutional AI](/glossary/#constitutional-ai)* untuk membatasi perilaku model.

## Kesalahan Umum

- **Prompt yang terlalu panjang**: Menyertakan seluruh konteks yang tersedia, bukan konteks yang relevan, meningkatkan biaya dan menurunkan fokus model.
- **Over-reliance pada zero-shot**: Tidak memberikan contoh apapun, mengandalkan model untuk "memahami" tanpa panduan format output.
- **Instruksi yang saling konflik**: System prompt bertentangan dengan user message, menyebabkan model bingung tentang prioritas.
- **Tidak menetapkan output format**: Tanpa spesifikasi format, output menjadi tidak terstruktur dan sulit diproses secara otomatis.
- **Mengabaikan version compatibility**: Mengasumsikan prompt yang dioptimalkan untuk satu model version akan bekerja sama di versi lain.

## Referensi Resmi

- [IBM Prompt Engineering Best Practices](https://www.ibm.com/think/topics/prompt-engineering)
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/en/docs/prompts/quickstart)
- [Anthropic Prompt Library](https://github.com/anthropics/prompt-eng-interactive-tutorial)
- [IBM Institute for Business Value: Prompt Engineering](https://www.ibm.com/thought-leadership/institute-business-value/prompt-engineering)

## FAQ

**Q: Apa perbedaan prompt engineering IBM vs Anthropic?**
A: IBM fokus pada pendekatan enterprise-grade dengan iterative refinement dan struktur prompt berbasis template. Anthropic menekankan system-level instructions dan Constitutional AI principles untuk mengontrol perilaku model secara lebih granular. Keduanya saling melengkapi.

**Q: Berapa banyak few-shot examples yang ideal?**
A: 3-5 contoh adalah sweet spot menurut IBM dan Anthropic. Terlalu sedikit tidak memberikan cukup konteks pola; terlalu banyak meningkatkan prompt length dan biaya tanpa peningkatan kinerja yang proporsional.

**Q: Apakah prompt engineering bisa menggantikan fine-tuning?**
A: Tidak sepenuhnya. Prompt engineering bagus untuk mengarahkan perilaku model, tetapi fine-tuning diperlukan ketika model perlu menguasai domain knowledge spesifik atau keterampilan yang tidak ada di training data. Kombinasi keduanya sering kali optimal.

**Q: Bagaimana cara menguji efektivitas prompt?**
A: Buat evaluasi set dari 50-100 input representatif dengan output ideal yang sudah dilabeli. Ukur akurasi, konsistensi format, dan latency. Lakukan A/B testing antar versi prompt secara berkala.

**Q: Apa itu prompt template dan mengapa penting?**
A: Prompt template adalah struktur prompt yang reusable dengan variabel yang bisa diisi secara dinamis. Ini memungkinkan manajemen prompt yang scalable dan konsisten di berbagai use case tanpa duplikasi manual.

**Q: Kapan saya harus menggunakan pendekatan Anthropic vs IBM?**
A: Untuk keamanan dan alignment, tiru pendekatan Anthropic dengan Constitutional AI. Untuk pipeline production enterprise dengan banyak use case, terapkan struktur IBM yang sistematis. Kombinasi keduanya memberikan hasil terbaik.

---

### Artikel Terkait di Blog Ini

- [Menguasai Chain-of-Thought Prompting untuk Logika Kompleks](./menguasai-chain-of-thought-prompting-untuk-logika-kompleks.md)
- [Prompt Security: Melindungi AI dari Prompt Injection Attack](./prompt-security-melindungi-ai-dari-prompt-injection-attack.md)
- [Cara Merancang Prompt untuk Agentic AI Systems](./cara-merancang-prompt-untuk-agentic-ai-systems.md)
- [Agentic AI Fundamentals 2026](./agentic-ai-fundamentals-2026.md)
- [MCP Model Context Protocol](./mcp-model-context-protocol.md)
