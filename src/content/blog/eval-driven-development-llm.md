---
title: 'Eval-Driven Development LLM: Membangun dengan Evaluasi sejak Awal'
description: 'Eval-driven development LLM menempatkan evaluasi sebagai bagian inti siklus pengembangan. Pelajari metrik, dataset golden, dan praktik mengukur kualitas agen.'
pubDate: '2026-08-01'
heroImage: '../../assets/blog-placeholder-48.jpg'
---

Berbeda dengan pengembangan tradisional yang menguji setelah fitur selesai, eval-driven development (EDD) menjadikan evaluasi sebagai langkah pertama dan berulang. Untuk sistem LLM yang tidak deterministik, ini krusial demi keandalan.

## Definisi

Eval-driven development adalah pendekatan di mana kita menulis evaluasi (dataset, metrik, assert) sebelum atau bersamaan dengan implementasi fitur LLM, lalu menjalankannya secara berkelanjutan. Eval berfungsi seperti test suite untuk perilaku model yang tak tentu.

## Masalah yang Diselesaikan

LLM tidak deterministik: output berubah antar run. Tanpa eval, perbaikan satu aspek bisa merusak aspek lain tanpa terdeteksi. EDD memberikan sinyal objektif bahwa perubahan kode atau prompt benar-benar memperbaiki, bukan sekadar "terasa lebih baik".

## Cara Kerja

Tim menyusun dataset golden: pasangan input dan respons ideal atau kriteria. Setiap perubahan dijalankan terhadap dataset, dihitung skornya (akurasi, relevansi, kepatuhan format), lalu dibandingkan dengan baseline. Regresi memicu peringatan.

## Arsitektur dan Komponen

- **Golden dataset**: contoh berlabel representatif.
- **Evaluator**: metrik (exact match, LLM-as-judge, ragas).
- **CI hook**: menjalankan eval saat PR.
- **Dashboard**: pelacakan skor dari waktu ke waktu.
- **Regression gate**: blokir perubahan yang menurunkan skor.

## Contoh Kode Production-Ready

```python
import json

def llm_judge(answer: str, rubric: str) -> int:
    # Placeholder: ganti dengan pemanggilan model penilai
    return 1 if rubric.lower() in answer.lower() else 0

def run_eval(cases: list) -> float:
    scores = []
    for case in cases:
        out = case["generate"](case["input"])
        s = llm_judge(out, case["rubric"])
        scores.append(s)
    return sum(scores) / len(scores)

golden = [
    {"input": "Apa ibu kota Indonesia?", "rubric": "Jakarta", "generate": lambda q: "Jakarta"},
]
print(f"Eval score: {run_eval(golden):.2f}")
```

## Kapan Dipakai dan Tidak

Gunakan untuk setiap sistem LLM di produksi, minimal sebagai smoke test. Untuk prototipe sekali pakai, eval ringkas cukup. Namun semakin kritis sistem, semakin lengkap eval wajib.

## Alternatif

- **Manual review**: akurat tapi tak scalable.
- **A/B testing produksi**: lambat, butuh traffic.
- **Monitoring pasif**: melihat keluhan, bukan mencegah regresi.

## Kelebihan dan Kekurangan

Kelebihan: mencegah regresi, objektif, mempercepat iterasi aman. Kekurangan: menyusun dataset golden memakan waktu, dan LLM-as-judge punya bias sendiri.

## Best Practice

Mulai dari puluhan contoh representatif, bukan ribuan kosong. Pisahkan eval kualitas dan eval kepatuhan (format, keamanan). Jalankan di CI. Tinjau skor sebagai seri waktu, bukan angka tunggal.

## Kesalahan Umum

Mengandalkan satu metrik, menggunakan dataset tak representatif, serta LLM-as-judge tanpa kalibrasi terhadap penilaian manusia.

## Mengotomatisasi Evaluasi di CI

Eval-driven development mencapai nilai penuhnya saat evaluasi berjalan otomatis, bukan sekadar skrip yang sesekali dijalankan analis. Integrasikan eval ke pipeline integrasi berkelanjutan (CI): setiap pull request yang menyentuh prompt, kode agen, atau pemilihan model memicu suite eval terhadap golden set. Jika skor turun di bawah baseline, pipeline gagal dan perubahan diblokir.

Bentuk scorecard, bukan angka tunggal. Laporkan terpisah: akurasi jawaban, kepatuhan format, keamanan (tidak ada rahasia bocor), dan biaya per task. Satu perbaikan bisa menaikkan akurasi namun merusak kepatuhan format; scorecard memunculkan trade-off itu secara transparan kepada pembuat PR.

Kalibrasi LLM-as-judge secara berkala. Bandingkan penilaian model dengan penilaian manusia pada sampel; jika korolasinya rendah, revisi rubric atau ganti model penilai. Tanpa kalibrasi, eval memberi rasa aman palsu.

Simpan hasil eval sebagai artefak yang bisa dibandingkan antar commit. Tim dapat melihat grafik "skor vs waktu" dan mengidentifikasi kapan regresi diperkenalkan. Kombinasi CI gate, scorecard multidimensi, dan pelacakan historis mengubah evaluasi dari beban manual menjadi jangkar kualitas otomatis.

## Membangun Golden Set

Golden set adalah aset terpenting dalam eval-driven development, namun sering diabaikan karena dianggap mahal membuatnya. Mulailah dari sampel produksi nyata: ambil beberapa ratus query historis, lalu tuliskan respons ideal atau kriteria penilaiannya secara manual. Anda tak butuh ribuan contoh di awal; ratusan yang representatif sudah membedakan regresi besar.

Cakup keberagaman, bukan hanya kasus sukses. Sertakan query ambigu, query di luar domain, dan input berpotensi berbahaya. Golden set yang hanya berisi kasus mudah akan melaporkan skor tinggi semu padahal agen gagal di dunia nyata. Seimbangkan distribusinya dengan pola traffic sesungguhnya.

Simpan golden set di repositori terversi, terpisah dari kode, dan perlakukan sebagai data sensitif bila berisi informasi pengguna. Tinjau secara berkala: saat perilaku pengguna bergeser, tambahkan contoh baru agar eval tetap relevan.

Terakhir, bedakan dua jenis golden set: satu untuk kualitas jawaban, satu untuk kepatuhan (format, keamanan). Keduanya berjalan bersama namun dievaluasi berbeda. Golden set yang dirawat adalah fondasi agar setiap perubahan kode dapat dipertanggungjawabkan secara objektif.

## FAQ

**Apakah eval butuh model tambahan?**
Untuk LLM-as-judge ya, namun metrik deterministik (regex, exact match) tidak butuh.

**Berapa banyak contoh golden yang cukup?**
Cukup untuk menutupi kasus penting; ratusan bisa representatif untuk domain sempit.

**Bisakah eval otomatis di CI?**
Ya, jalankan sebagai gate saat pull request agar regresi tertangkap sebelum merge.

**Apakah eval menggantikan monitoring produksi?**
Tidak. Eval cegah regresi di dev, monitoring tangkap anomali di produksi.

**Istilah seperti LLM-as-judge dan rubric sering membingungkan—di mana penjelasannya?**
Penjelasan istilah tersebut tersedia di [glossary](/glossary/) blog ini.

## Backlink References
- [LangSmith Evaluation](https://docs.smith.langchain.com/evaluation)
- [Ragas Metrics](https://docs.ragas.io/)
- [OpenAI Evals](https://github.com/openai/evals)

---

## Hubungan artikel ini dengan artikel lain di blog:
- [Agent Testing dan Evaluasi](./agent-testing-evaluation.md) — metodologi menguji agen
- [RAG in Production](./rag-in-production.md) — evaluasi kualitas retrieval
- [Embedding Drift Monitoring](./embedding-drift-monitoring.md) — deteksi penurunan kualitas

Untuk membangun sistem LLM yang terukur, layanan [AI Agentic untuk UMKM](https://superkilat.com/layanan/ai-agentic-umkm) dari superkilat.com menawarkan pendekatan evaluasi sejak awal.
