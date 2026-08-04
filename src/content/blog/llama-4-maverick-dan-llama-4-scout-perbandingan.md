---
title: "Llama 4 Maverick vs Llama 4 Scout: Perbandingan Mendalam"
description: "Perbandingan detail Llama 4 Maverick dan Llama 4 Scout dari Meta. Pelajari perbedaan arsitektur, performa, harga, dan use case terbaik untuk setiap varian model open-source terbaru."
pubDate: 2026-08-04
heroImage: '../../assets/blog-placeholder-102.jpg'
---

## Daftar Isi

- [Definisi: Apa itu Llama 4](#definisi-apa-itu-llama-4)
- [Mengapa Dibuat](#mengapa-dibuat)
- [Masalah yang Diselesaikan](#masalah-yang-diselesaikan)
- [Cara Kerja](#cara-kerja)
- [Arsitektur](#arsitektur)
- [Komponen](#komponen)
- [Contoh Nyata](#contoh-nyata)
- [Kapan Digunakan](#kapan-digunakan)
- [Kapan Tidak Digunakan](#kapan-tidak-digunakan)
- [Alternatif](#alternatif)
- [Kelebihan](#kelebihan)
- [Kekurangan](#kekurangan)
- [Best Practice](#best-practice)
- [Kesalahan Umum](#kesalahan-umum)
- [Referensi Resmi](#referensi-resmi)
- [FAQ](#faq)

## Definisi: Apa itu Llama 4

Llama 4 adalah keluarga model bahasa besar open-source dari Meta AI, dirilis pada 2026. Seri ini menonjol sebagai lompatan generasional dari Llama 3, mengadopsi arsitektur mixture-of-experts (MoE) untuk pertama kalinya dalam ekosistem Llama. Dua varian utama yang dirilis adalah Llama 4 Maverick dan Llama 4 Scout.

Llama 4 Maverick adalah varian flagship dengan 400 miliar parameter total, di mana hanya 17 miliar yang aktif per token (MoE). Llama 4 Scout adalah varian efisien dengan 109 miliar parameter total dan 13 miliar parameter aktif. Keduanya menggunakan basis transformer decoder-only dengan 128K konteks, tetapi perbedaannya terletak pada kedalaman, lebar, dan jumlah expert yang diaktifkan.

## Mengapa Dibuat

Meta membangun Llama 4 untuk menjawab tantangan dua kali lipat: skala dan efisiensi. Model dense sebesar Llama 3 405B membutuhkan biaya inferensi yang mahal, sehingga tidak terjangkau untuk developer kecil. MoE memungkinkan model besar tanpa biaya komputasi per token yang proporsional. Dengan Maverick dan Scout, Meta menawarkan spektrum pilihan: performa maksimal untuk use case yang membutuhkan, dan efisiensi untuk skala produksi.

Selain itu, persaingan dengan GPT-4o dan Gemini mendorong Meta untuk meningkatkan kemampuan multimodal bawaan tanpa bergantung pada encoder eksternal. Llama 4 juga memperkuat posisi Meta dalam komunitas open-source AI.

## Masalah yang Diselesaikan

1. **Biaya inferensi tinggi pada model dense**: MoE mengurangi biaya per token hingga 70% dibanding model dense ukuran setara.
2. **Keterbatasan skala di perangkat edge**: Scout dirancang untuk berjalan di hardware konsumen dengan kuantisasi.
3. **Kebutuhan multimodal terintegrasi**: Tanpa encoder eksternal, developer dapat fokus pada aplikasi.
4. **Kontekstual yang pendek**: Konteks 128K token menutup kebutuhan dokumen panjang dan percakapan kompleks.

## Cara Kerja

Llama 4 menggunakan mixture-of-experts di mana setiap lapisan transformer memiliki beberapa "expert" (sub-network). Saat memproses token, router MoE memilih 2 expert terbaik untuk diaktifkan dari 16 expert tersedia di Maverick, atau 1 dari 8 di Scout. Ini berarti meskipun total parameter besar, hanya sebagian kecil yang dihitung per token.

Prosesnya dimulai dari tokenizer Byte Pair Encoding (BPE) yang mendukung 256K kosakata. Input teks di-embed ke dalam embedding 8192-dimensi untuk Maverick dan 4096 untuk Scout. Seiring lapisan MoE, attention mechanism memproses token dalam kelompok, dan setiap expert menangkap pola spesifik—satu ahli pada sintaks, satu lain pada fakta dunia, dan seterusnya.

## Arsitektur

### Llama 4 Maverick
- **Total parameter**: 400B
- **Parameter aktif per token**: 17B
- **Hidden size**: 8192
- **Lapisan**: 48
- **Attention head**: 64
- **MoE expert**: 16, top-2 aktif
- **Konteks**: 128K token

### Llama 4 Scout
- **Total parameter**: 109B
- **Parameter aktif per token**: 13B
- **Hidden size**: 4096
- **Lapisan**: 40
- **Attention head**: 32
- **MoE expert**: 8, top-1 aktif
- **Konteks**: 128K token

Keduanya menggunakan RoPE, RMSNorm, dan SwiGLU. Perbedaan utama adalah kedalaman dan jumlah expert.

## Komponen

### 1. Router MoE
Network kecil yang memilih expert berdasarkan representasi token. Dilatih bersama dengan model menggunakan load balancing loss.

### 2. Expert Feed-Forward
Setiap expert memiliki jaringan dua lapisan dengan hidden size 4x. Di Maverick, setiap expert roughly 25B parameter; di Scout, sekitar 13B.

### 3. Attention Block
Multi-head attention dengan grouped query attention (GQA) untuk efisiensi memori. Kv heads dibagi untuk mengurangi bandwidth.

### 4. Tokenizer
BPE dengan vocab 256K. Mendukung code generation, bahasa alami, dan pemformatan khusus.

### 5. Output Head
Linear layer dengan weight tying ke tokenizer.

## Contoh Nyata

Sebuai startup pendidikan menggunakan Llama 4 Scout untuk chatbot pembelajaran adaptif. Karena VRAM terbatas di server edukasi, Scout menjamin respons cepat. Sementara itu, tim riset university menggunakan Llama 4 Maverick untuk sintesis literatur medis, memanfaatkan konteks 128K untuk memproses ratusan paper sekaligus.

## Kapan Digunakan

- **Maverick**: Produksi dengan anggaran GPU besar, penelitian yang membutuhkan reasoning mendalam, atau use case dengan data sensitif yang tidak boleh keluar dari server.
- **Scout**: Aplikasi edge, chatbot dengan volume tinggi, atau prototipe yang membutuhkan iterasi cepat dengan biaya rendah.
- Keduanya cocok untuk sistem yang mengutamakan kontrol penuh atas model.

## Kapan Tidak Digunakan

- Jika Anda membutuhkan multimodal native tanpa setup tambahan, model seperti GPT-4o atau Gemini mungkin lebih siap pakai.
- Untuk use case dengan dataset kecil, fine-tuning MoE lebih rumit dibanding model dense kecil.
- Jika tim tidak memiliki keahlian infrastruktur, managed API lebih aman.

## Alternatif

- **GPT-4o**: Proprietary, multimodal bawaan, performa tinggi
- **Gemini 2.5 Pro**: Multimodal native, ecosystem Google
- **DeepSeek-V3**: MoE 671B total, 37B aktif, performa kompetitif
- **Qwen 3.5**: Alternatif multimodal dari Alibaba
- **Mistral Large 3**: Closed-weight, optimised untuk enterprise

## Kelebihan

1. **Open weight**: Akses penuh, komunitas besar.
2. **Efisiensi MoE**: Performa tinggi dengan biaya inferensi lebih rendah.
3. **Konteks panjang**: 128K token untuk analisis dokumen kompleks.
4. **Dukungan multimodal**: Gambar dan audio diproses tanpa encoder eksternal.
5. **Skalabilitas**: Dari edge (Scout) hingga data center (Maverick).

## Kekurangan

1. **Ukuran total besar**: Meskipun aktif sedikit, weight masih perlu dimuat sebagian.
2. **Kompleksitas deployment**: MoE memerlukan kernel khusus untuk optimalisasi penuh.
3. **Dokumentasi**: Dibanding GPT atau Gemini, panduan deployment untuk MoE masih lebih sedikit.
4. **Ketergantungan pada hardware NVIDIA**: Optimasi terbaik hanya di Ampere dan Blackwell.

## Best Practice

- Gunakan vLLM atau TensorRT-LLM untuk deployment Maverick agar throughput maksimal. Lihat [ai-infrastructure-docker-kubernetes-llm.md](/ai-infrastructure-docker-kubernetes-llm.md) untuk panduan containerisasi.
- Untuk Scout, kuantisasi AWQ 4-bit biasanya cukup untuk memori 24GB.
- Evaluasi performa menggunakan [agent-testing-evaluation.md](/agent-testing-evaluation.md) sebelum memutuskan varian.
- Terapkan [tool-design-patterns.md](/tool-design-patterns.md) saat membungkus Llama 4 sebagai tool dalam sistem agent.
- Jika membangun sistem multimodal, pelajari [rag-vs-agents.md](/rag-vs-agents.md) untuk memilih arsitektur tepat.

## Kesalahan Umum

1. **Mengira total parameter = parameter aktif**: MoE berarti hanya sebagian kecil yang dihitung. Membandingkan biaya dengan model dense 17B lebih adil.
2. **Menggunakan resolution default terlalu tinggi untuk vision**: Default 224x224 sudah cukup untuk kebanyakan kasus. Naikkan hanya jika diperlukan detail tinggi.
3. **Mengabaikan router bias**: Router MoE cenderung memilih expert yang sering digunakan. Tambahkan load balancing loss untuk distribusi merata.
4. **Melakukan fine-tuning penuh**: Gunakan LoRA untuk menghemat waktu dan biaya. Fine-tuning penuh MoE biasanya tidak diperlukan.

## Referensi Resmi

- [Meta Llama 4 Blog](https://ai.meta.com/blog/meta-llama-4/)
- [Llama 4 Model Card](https://ai.meta.com/blog/meta-llama-4/)
- [GitHub Repository](https://github.com/meta-llama/llama-models)

## FAQ

**1. Apakah Llama 4 benar-benar gratis untuk komersial?**
Ya. Llama 4 dilisensikan di bawah Meta Community License, yang mengizinkan penggunaan komersial dengan beberapa batasan pada layanan berskala besar.

**2. Berapa VRAM minimum untuk Maverick dan Scout?**
Maverick membutuhkan minimal 80GB (4x A100 80GB) untuk full precision. Scout cukup dengan 24GB (RTX 4090) untuk AWQ 4-bit.

**3. Apakah Llama 4 mendukung bahasa Indonesia?**
Ya. Meskipun tidak diuji secara khusus untuk semua bahasa daerah, performanya baik untuk bahasa dengan sumber data yang cukup di pelatihan.

**4. Bagaimana perbedaan utama Maverick vs Scout selain ukuran?**
Maverick memiliki lebih banyak expert dan lapisan, sehingga lebih kuat untuk reasoning kompleks. Scout lebih cepat dan ringan, cocok untuk skala tinggi.

**5. Bisakah Scout menggantikan Llama 3 70B?**
Ya, untuk banyak use case. Dengan MoE, Scout sering mengungguli Llama 3 70B di benchmark meskipun parameter aktif lebih sedikit.

**6. Apakah Llama 4 mendukung function calling?**
Ya, melalui format tool use standar yang kompatibel dengan library seperti LangChain dan LlamaIndex.

**7. Apakah ada API resmi dari Meta?**
Meta menyediakan API melalui Meta AI dan partner hosting. Namun, banyak perusahaan memilih self-hosted untuk kontrol penuh. [SuperKilat](https://superkilat.com/layanan/ai-agentic-umkm) dapat membantu deployment dan integrasi Llama 4 ke sistem Anda.

**8. Bagaimana cara mengukur performa MoE?**
Gunakan benchmark standar seperti MMLU, HumanEval, dan MT-Bench. Juga evaluasi throughput token per detik pada hardware target Anda.

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [agent-testing-evaluation](./agent-testing-evaluation), [rag-in-production](./rag-in-production), [memory-systems-for-agents](./memory-systems-for-agents). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://github.com/facebook/react
- https://github.com/mlflow/mlflow
- https://github.com/valkey-io/valkey
- https://github.com/JetBrains/compose-multiplatform
- https://superkilat.com/layanan/optimasi-kecepatan
