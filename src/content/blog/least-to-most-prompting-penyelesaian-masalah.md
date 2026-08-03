---
title: 'Least-to-Most Prompting: Penyelesaian Masalah Kompleks dengan Strategi Bertahap'
description: 'Pelajari Least-to-Most Prompting, teknik prompting yang memecah masalah kompleks menjadi sub-masalah berurutan untuk meningkatkan akurasi LLM.'
pubDate: '2026-08-03'
heroImage: '../../assets/blog-placeholder-75.jpg'
---

# Least-to-Most Prompting: Penyelesaian Masalah Kompleks dengan Strategi Bertahap

## Definisi dan Konsep Dasar

Least-to-Most Prompting adalah pendekatan [prompt engineering](/glossary/) yang memecah masalah kompleks menjadi serangkaian sub-masalahan yang diselesaikan secara berurutan. Model bahasa besar menerima petunjuk awal yang sederhana, kemudian solusi bertahap semakin spesifik, membangun pemahaman kontekstual di setiap tahap. Metode ini terinspirasi dari cara manusia menangani soal-soal penalaran yang kompleks, mulai dari inti sederhana menuju struktur yang rumit.

## Mengapa Metode Ini Diciptakan

Penelitian pada LLM menunjukkan bahwa model bekerja lebih akurat ketika diberi konteks yang bertahap dibandingkan satu instruksi besar sekaligus. Least-to-Most Prompting muncul untuk mengatasi keterbatasan [context window](/glossary/) dan masalah "lost in the middle" yang membuat model lupa detail di tengah konteks panjang. Dengan men distribusikan beban pemecahan masalah, model dapat fokus pada satu variabel pada satu waktu tanpa terbebani informasi sekaligus.

## Masalah yang Disediakan

Tanpa strategi bertahap, LLM sering menghasilkan solusi yang tidak konsisten ketika menghadapi soal multi-langkah seperti perhitungan matematika, pemrograman, atau analisis data. Masalah lain yang muncul adalah inkonsistensi antar variabel—hasil langkah pertama bisa mengacaukan perhitungan berikutnya. Least-to-Most Prompting memastikan setiap sub-masalah diselesaikan sebelum melanjutkan, mirip pendekatan dalam pemrograman modular.

## Cara Kerja

Implementasi dimulai dengan menulis prompt tingkat atas yang mendefinisikan tujuan akhir. Sistem kemudian mengeksekusi sub-masalah pertama, menyimpan hasilnya, dan menyusun prompt berikutnya yang sudah memasukkan variabel yang sudah dihitung. Proses berulang hingga seluruh rantai selesai. Dalam beberapa implementasi, model dijalankan secara mandiri untuk mengevaluasi apakah output sementara benar sebelum melanjutkan ke langkah berikutnya.

## Arsitektur Sistem

Arsitektur Least-to-Most Prompting terdiri dari tiga komponen utama: Planner, Solver, dan Validator. Planner memecah masalah menjadi sub-masalah. Solver menangani eksekusi setiap sub-masalah dengan konteks yang sudah diperkaya. Validator memeriksa apakah output antar tahap konsisten sebelum diteruskan. Komunikasi antar komponen biasanya melalui struktur data JSON yang memudahkan debug dan versioning.

## Komponen Utama

- **Problem Decomposer**: Mengidentifikasi langkah-langkah yang diperlukan untuk menyelesaikan masalah utama.
- **Context Builder**: Menyusun prompt untuk setiap tahap dengan memasukkan hasil sebelumnya.
- **Answer Aggregator**: Menggabungkan semua hasil sub-masalah menjadi solusi akhir yang koheren.

## Contoh Nyata dan Studi Kasus

Tim peneliti di Google DeepMind menggunakan Least-to-Most Prompting untuk meningkatkan akurasi pemecahan soal matematika pada GSM8K benchmark. Dengan membagi soal cerita menjadi pertanyaan-pertanyaan sederhana, mereka mencapai peningkatan akurasi sebesar 40% dibandingkan zero-shot prompting. Kasus lain terjadi pada startup fintech yang menerapkan pendekatan ini untuk analisis risiko kredit—model memecah profil peminjam menjadi indikator risiko terpisah sebelum memberikan skor akhir.

## Kapan Menggunakan

Least-to-Most Prompting cocok untuk tugas-tugas yang memerlukan multi-step reasoning seperti matematika, pemrograman, analisis data, atau perencanaan strategis. Metode ini juga efektif untuk sistem [agentic AI fundamentals 2026](/agentic-ai-fundamentals-2026/) yang perlu membuat keputusan berurutan dalam lingkungan dinamis. Saat konteks masalah cukup panjang dan kompleksitasnya terbagi menjadi bagian-bagian independen, pendekatan ini menjadi pilihan yang lebih stabil.

## Kapan Tidak Menggunakan

Metode ini kurang efisien untuk tugas-tugas sederhana atau satu langkah, karena overhead pemecahan masalah menambah biaya inferensi dan latensi. Untuk kasus di mana setiap langkah saling ketergantungan kuat dan tidak dapat diuji secara individual, pendekatan bertahap malah memperkenalkan risiko akumulasi error. Juga tidak disarankan ketika batas waktu respons sangat ketat dan ketersediaan token terbatas.

## Alternatif Lain

- **Chain-of-Thought Prompting**: Meminta model mengekspresikan reasoning dalam satu respons.
- **Tree-of-Thought**: Mengeksplorasi beberapa jalur reasoning secara paralel sebelum memilih yang terbaik.
- **Self-Consistency**: Menjalankan beberapa sampel reasoning dan mengambil voting mayoritas.
- **Zero-Shot Chain-of-Thought**: Menambahkan kalimat "mari kita pikirkan langkah demi langkah" tanpa contoh.

## Kelebihan

- Meningkatkan akurasi pada tugas multi-langkah secara signifikan.
- Lebih mudah di-debug karena setiap sub-masalah terpisah.
- Mengurangi beban konteks per langkah dibandingkan memberikan seluruh masalah sekaligus.
- Memberikan transparansi pada proses reasoning yang dapat diaudit.

## Kekurangan

- Menambah latensi total karena memerlukan beberapa pemanggilan model.
- Jika sub-masalah pertama salah, seluruh rantai terancam.
- Membutuhkan desain prompt yang hati-hati untuk setiap tahap transisi.
- Overhead engineering meningkat dibandingkan prompt tunggal.

## Best Practice

Gunakan pendekatan modular dengan memastikan setiap sub-masalah memiliki definisi input dan output yang jelas. Dokumentasikan hasil setiap tahap untuk keperluan audit dan iterasi prompt. Gabungkan dengan teknik caching untuk sub-masalah yang sering diulang. Pertimbangkan [tool design patterns](/tool-design-patterns/) untuk mengotomatisasi validasi antar tahap. Untuk skala produksi, pertimbangkan layanan [AI Agentic UMKM](https://superkilat.com/layanan/ai-agentic-umkm) yang sudah mengadopsi pendekatan modular dalam arsitektur agennya.

## Kesalahan Umum

Paling umum adalah membagi masalah terlalu halus sehingga overhead komunikasi menjadi lebih besar dari manfaatnya. Kesalahan lain adalah mengabaikan validasi antar tahap—sebuah sub-masalah yang salah langsung mengacaukan langkah berikutnya. Beberapa praktisi juga menambahkan terlalu banyak instruksi di tiap tahap, seolah-olah menulis ulang seluruh prompt dari awal.

## Referensi Resmi

- [Least-to-Most Prompting Paper](https://arxiv.org/abs/2208.12281)
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Anthropic Tool Use Documentation](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [LangGraph GitHub Repository](https://github.com/langchain-ai/langgraph)
- [Hugging Face Prompt Engineering Guide](https://huggingface.co/docs)

## FAQ

**Apa perbedaan Least-to-Most dengan Chain-of-Thought?**
Least-to-Most secara eksplisit memecah masalah menjadi sub-masalah yang dijalankan berurutan, sementara Chain-of-Thought meminta model mengekspresikan reasoning dalam satu respons.

**Apakah Least-to-Most bekerja untuk semua model?**
Metode ini terbukti efektif pada model berukuran menengah ke besar. Model yang sangat kecil mungkin kesulitan mengikuti transisi antar sub-masalah.

**Berapa jumlah sub-masalah yang optimal?**
Tidak ada angka pasti, tapi mulai dari 2–5 sub-masalah untuk menjaga overhead tetap terkendali.

**Bisakah saya menggabungkan Least-to-Most dengan teknik lain?**
Ya, banyak sistem menggabungkannya dengan [prompt engineering agentic systems](/prompt-engineering-agentic-systems/) atau self-reflection untuk hasil yang lebih robust.

**Apakah ada library yang mendukung Least-to-Most?**
Beberapa library seperti LangGraph menyediakan struktur kontrol alur yang dapat diadaptasi untuk pendekatan ini.
