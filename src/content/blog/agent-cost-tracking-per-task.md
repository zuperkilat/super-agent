---
title: 'Agent Cost Tracking per Task: Mengukur Biaya Setiap Langkah Agen'
description: 'Agent cost tracking per task memantau pengeluaran token dan API per aksi agen. Pelajari arsitektur metering, dashboard, dan cara menekan biaya produksi.'
pubDate: '2026-08-01'
heroImage: '../../assets/blog-placeholder-22.jpg'
---

Agen AI menjalankan banyak langkah otomatis—memanggil LLM, tool, dan retrieval—tanpa intervensi manusia. Tanpa pelacakan biaya per tugas, tagihan API bisa membengkak tanpa terasa. Cost tracking per task memberikan visibilitas hingga level aksi.

## Definisi

Agent cost tracking per task adalah praktik mengukur dan mencatat biaya (token, API call, komputasi) yang dikeluarkan untuk setiap unit kerja agen, bukan sekadar total bulanan. Metrik ini memungkinkan atribusi biaya ke pengguna, fitur, atau alur tertentu.

## Masalah yang Diselesaikan

Tanpa pelacakan granular, tim tidak tahu langkah mana yang boros. Agen bisa terjebak loop, memanggil model berulang kali untuk tugas sederhana. Cost tracking mendeteksi anomali dan memungkinkan batas pengeluaran per tugas.

## Cara Kerja

Setiap permintaan ke model diintersep untuk mencatat token input/output dan harga. Tool call dan retrieval juga dicatat. Semua digabungkan ke dalam "cost span" yang terikat pada task ID. Aggregator menghitung total dan memicu alert saat melewati ambang.

## Arsitektur dan Komponen

- **Instrumentation layer**: wrapper di sekitar klien LLM.
- **Cost ledger**: penyimpanan catatan biaya.
- **Task correlator**: mengaitkan span ke task.
- **Dashboard & alert**: visualisasi dan batas.

## Contoh Kode Production-Ready

```python
import time
from dataclasses import dataclass, field

PRICING = {"gpt-4o-mini": {"in": 0.00015, "out": 0.0006}}  # per 1K token

@dataclass
class TaskCost:
    task_id: str
    spans: list = field(default_factory=list)

    def record(self, model: str, in_tok: int, out_tok: int):
        cost = (in_tok/1000)*PRICING[model]["in"] + (out_tok/1000)*PRICING[model]["out"]
        self.spans.append({"model": model, "cost": cost, "ts": time.time()})

    def total(self) -> float:
        return sum(s["cost"] for s in self.spans)

ledger = {}
def track(task_id, model, in_tok, out_tok):
    ledger.setdefault(task_id, TaskCost(task_id)).record(model, in_tok, out_tok)
    if ledger[task_id].total() > 0.50:  # batas $0.50 per task
        print(f"ALERT: task {task_id} melebihi batas biaya")
```

## Kapan Dipakai dan Tidak

Gunakan sejak hari pertama produksi agen berbayar. Untuk eksperimen lokal tanpa API komersial, pelacakan sederhana cukup. Namun begitu agen melayani pengguna nyata, metering wajib.

## Alternatif

- **Aggregate billing saja**: lebih mudah, kehilangan detail langkah.
- **LLM provider dashboard**: gratis tapi tidak mengaitkan ke task internal.
- **Observability penuh (tracing)**: mencakup biaya sebagai subset.

## Kelebihan dan Kekurangan

Kelebihan: visibilitas, deteksi loop boros, optimasi tarif. Kekurangan: overhead instrumentasi dan penyimpanan catatan.

## Best Practice

Terapkan batas biaya per task (budget guard). Log token di setiap span. Gunakan model murah untuk langkah mudah. Tinjau distribusi biaya mingguan untuk menemukan outlier.

## Kesalahan Umum

Hanya melihat total tagihan bulanan, tidak menyetel alert, serta melupakan biaya tool/retrieval yang sering lebih besar dari dugaan.

## Optimasi Berbasis Data Biaya

Pelacakan biaya baru bernilai jika ditindaklanjuti. Langkah pertama adalah atribusi: bagi total pengeluaran ke fitur, tim, atau pelanggan. Tanpa atribusi, "siapa yang boros" tetap teka-teki. Pola showback—menampilkan biaya ke pemilik fitur meski belum dibebankan—sudah cukup memicu disiplin efisiensi.

Kedua, tetapkan budget guard per tipe tugas. Tugas sederhana seperti klasifikasi tak sepantasnya menghabiskan sama dengan agen penelusuran dokumen panjang. Ambang per tugas mencegah satu alur menyedot seluruh kuota.

Ketiga, terapkan FinOps untuk LLM: tinjau distribusi biaya mingguan, identifikasi 5 persen tugas paling mahal, dan selidiki. Seringkali penyebabnya loop tak berujung atau pemakaian model frontier untuk tugas yang cukup ditangani model murah. Geser tugas tersebut ke SLM atau cache hasil, dan penghematan bisa mencapai mayoritas tagihan.

Keempat, jadikan biaya metrik pertama dalam evaluasi perubahan. Saat mengganti prompt atau model, bandingkan bukan hanya kualitas tetapi juga biaya per sukses. Peningkatan kualitas dua persen tidak sepadan bila biaya melonjak sepuluh kali. Catatan biaya per task adalah fondasi pengambilan keputusan yang rasional.

## Dashboard dan Alerting

Data biaya hanya berguna bila terlihat oleh orang yang berwenang. Dashboard minimal harus menampilkan total pengeluaran harian, biaya per tipe tugas, dan distribusi penggunaan model (murah vs mahal). Tampilkan pula tren mingguan agar penyimpangan terlihat sebelum akhir bulan.

Lapisan alerting tak kalah penting. Atur dua jenis peringatan: ambang absolut (total harian melebihi budget) dan anomali relatif (lonjakan 50 persen dibanding rata-rata harian). Anomali relatif lebih peka menangkap loop agen yang menggandakan biaya tanpa menyentuh ambang absolut.

Integrasikan alert ke kanal yang diawasi tim, bukan email yang terkubur. Untuk sistem kritis, picu tindakan otomatis: throttle tugas boros atau turunkan ke model murah saat anggaran harian tersisa tipis. Kombinasi visibilitas dan respons otomatis mengubah cost tracking dari sekadar laporan menjadi kontrol aktif yang menjaga keuangan produksi tetap terkendali.

## FAQ

**Apakah cost tracking memperlambat agen?**
Sedikit, karena pencatatan ringan. Overhead biasanya di bawah satu persen latency.

**Bagaimana mengetahui langkah mana yang boros?**
Lihat breakdown span per task; loop tool call berulang biasanya menonjol.

**Apakah harga API harus di-hardcode?**
Tidak ideal. Simpan di config agar mudah diperbarui saat penyedia mengubah tarif.

**Bisakah dipakai untuk model self-hosted?**
Ya, dengan menghitung biaya komputasi (GPU-hour) per task sebagai pengganti harga token.

**Istilah seperti token dan span sering membingungkan—di mana penjelasannya?**
Daftar istilah tersebut tersedia di [glossary](/glossary/) blog ini.

## Backlink References
- [OpenAI Pricing](https://platform.openai.com/docs/pricing)
- [LangSmith Tracing](https://docs.smith.langchain.com/)
- [Anthropic Pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)

---

## Hubungan artikel ini dengan artikel lain di blog:
- [LLM Cost Optimization 2026](./llm-cost-optimization-2026.md) — strategi menekan biaya secara luas
- [Eval-Driven Development LLM](./eval-driven-development-llm.md) — mengukur efisiensi vs kualitas
- [Agent Testing dan Evaluasi](./agent-testing-evaluation.md) — menguji perilaku agen sebelum produksi

Tim yang ingin mengendalikan biaya agen dapat memanfaatkan layanan [AI Agentic untuk UMKM](https://superkilat.com/layanan/ai-agentic-umkm) dari superkilat.com.
