---
title: 'Multimodal RAG Dokumen PDF: Mengambil Jawaban dari Gambar dan Teks'
description: 'Multimodal RAG dokumen PDF menggabungkan teks dan visual dalam retrieval. Pelajari arsitektur, ekstraksi tabel gambar, dan praktik produksi untuk PDF.'
pubDate: '2026-08-01'
heroImage: '../../assets/blog-placeholder-19.jpg'
---

Dokumen PDF sering tidak hanya berisi teks, tetapi juga tabel, diagram, dan grafik. RAG konvensional yang hanya membaca teks kehilangan informasi penting ini. Multimodal RAG membawa gambar dan teks ke dalam satu ruang pencarian.

## Definisi

Multimodal RAG adalah sistem retrieval-augmented generation yang mengindeks dan mengambil konten dari berbagai modalitas—teks, gambar, tabel—lalu menggunakan model multimodal untuk menjawab pertanyaan berdasarkan gabungan tersebut.

## Masalah yang Diselesaikan

Banyak keputusan bisnis bergantung pada tabel keuangan atau diagram di PDF yang tidak terbaca oleh ekstraktor teks biasa. Multimodal RAG memastikan jawaban tidak bias karena bagian visual terlewat.

## Cara Kerja

PDF dipecah per halaman. Teks diekstrak, gambar dan tabel di-crop lalu diberi caption oleh model vision. Semua dipetakan ke embedding dalam ruang bersama (atau ruang terpisah yang disejajarkan). Saat query, sistem mengambil chunk teks dan gambar relevan, lalu model multimodal menyusun jawaban.

## Arsitektur dan Komponen

- **PDF parser**: ekstrak teks, gambar, tata letak.
- **Vision captioner**: membuat deskripsi gambar/tabel.
- **Embedding model multimodal**: pemetaan ke vektor.
- **Vector store**: penyimpanan dan pencarian.
- **Multimodal LLM**: generator jawaban.

## Contoh Kode Production-Ready

```python
from pdf2image import convert_from_path
import pytesseract
from pathlib import Path

def extract_page_images(pdf_path: str, out_dir: str):
    images = convert_from_path(pdf_path, dpi=200)
    paths = []
    for i, img in enumerate(images):
        p = Path(out_dir) / f"page_{i}.png"
        img.save(p, "PNG")
        paths.append(str(p))
    return paths

# Caption tiap gambar halaman dengan model vision (tanpa API key di contoh)
def caption_image(path: str) -> str:
    # Ganti dengan pemanggilan model vision lokal/API
    return pytesseract.image_to_string(path)[:500]

for p in extract_page_images("laporan.pdf", "pages"):
    print(caption_image(p))
```

## Kapan Dipakai dan Tidak

Gunakan untuk dokumen kaya visual: laporan keuangan, paper ilmiah, manual teknis. Hindari untuk dokumen teks murni di mana RAG teks biasa lebih efisien dan murah.

## Alternatif

- **RAG teks + OCR**: lebih murah, kehilangan struktur tabel.
- **Document AI layanan khusus**: ekstraksi terstruktur tingkat tinggi.
- **Long-context model**: muat seluruh PDF, namun boros untuk banyak dokumen.

## Kelebihan dan Kekurangan

Kelebihan: menjaga informasi visual, akurasi tinggi untuk dokumen kompleks. Kekurangan: biaya embedding gambar lebih tinggi, latensi更大, dan pipeline ekstraksi rapuh pada PDF scan buruk.

## Best Practice

Gunakan OCR lapis bawah untuk fallback. Simpan referensi halaman asli untuk kutipan. Evaluasi dengan pertanyaan yang menuntut pembacaan tabel, bukan hanya teks.

## Kesalahan Umum

Hanya mengindeks teks, mengabaikan tabel sebagai gambar; tidak menyimpan sumber halaman; serta menggunakan embedding teks untuk gambar tanpa penyelarasan modalitas.

## Menangani Tabel dan Diagram Kompleks

Tantangan sesungguhnya dalam multimodal RAG bukan gambar biasa, melainkan tabel dan diagram dengan struktur dalam. Tabel keuangan sering memiliki sel yang menyebar lintas halaman, header berganda, dan catatan kaki. OCR polos akan merusak struktur ini menjadi teks berantakan yang tak bermakna bagi model.

Pendekatan yang lebih baik adalah mengekstrak tabel sebagai struktur (baris/kolom) menggunakan model pengenal tata letak (layout-aware), lalu menyajikannya kembali sebagai markdown atau JSON sebelum di-caption. Dengan demikian, informasi "pendapatan Q3 naik 12 persen" tetap dapat di-retrieve secara presisi, bukan sekadar "ada angka di gambar".

Untuk diagram alur, caption vision sering melewatkan label kecil atau arah panah. Tambahkan langkah pembesaran regional (crop zoom) pada area berlabel padat sebelum captioning. Hasil caption yang kaya konteks jauh lebih berguna saat model menjawab pertanyaan seperti "apa penyebab bottleneck pada langkah 3?".

Jangan lupakan pelacakan sumber. Simpan nomor halaman dan koordinat bounding box agar jawaban dapat mengutip "halaman 12, tabel 3". Tanpa atribusi, pengguna tidak bisa memverifikasi fakta, dan evaluasi kualitas retrieval menjadi mustahil. Kombinasi struktur terjaga dan sumber jelas adalah pembeda antara multimodal RAG yang berguna dan yang sekadar estetik.

## Evaluasi Multimodal

Kualitas multimodal RAG tak bisa diukur hanya dengan metrik teks. Anda butuh golden set yang berisi pertanyaan eksplisit menuntut pembacaan visual—misalnya "berapa total pada tabel di halaman 4?" atau "warna apa pada label di diagram?". Tanpa pertanyaan semacam ini, evaluasi akan menyatakan sistem baik padahal bagian gambar tak pernah benar-benar diuji.

Jalankan evaluasi dalam dua tahap. Tahap pertama mengukur presisi retrieval: apakah chunk gambar/tabel yang relevan masuk ke top-k? Tahap kedua mengukur kualitas jawaban akhir dengan LLM-as-judge yang diberi akses ke gambar asli. Pisahkan kedua skor agar Anda tahu apakah masalah ada di retrieval atau di generasi.

Catat juga kasus di mana model menjawab dari teks padahal jawaban sebenarnya ada di tabel gambar. Pola ini mengindikasikan caption terlalu lemah. Evaluasi berkelanjutan dengan golden set visual adalah satu-satunya cara meyakinkan sistem benar-benar multimodal, bukan sekadar RAG teks yang kebetulan menyertakan gambar.

## FAQ

**Apakah butuh model vision khusus?**
Untuk captioning gambar/tabel, ya. Model multimodal seperti yang mendukung input gambar diperlukan.

**Bagaimana menangani PDF hasil scan?**
Gunakan OCR (contoh: Tesseract) sebelum embedding, atau layanan Document AI.

**Apakah embedding gambar dan teks sejajar?**
Harus. Gunakan model yang memetakan keduanya ke ruang vektor sama agar retrieval menyilang modalitas.

**Bisakah dipakai untuk banyak dokumen sekaligus?**
Bisa, asalkan vector store diskalakan dan biaya embedding dikelola.

**Istilah seperti embedding dan vector store sering membingungkan—di mana penjelasannya?**
Penjelasan istilah tersebut tersedia di [glossary](/glossary/) blog ini.

## Backlink References
- [LangChain Document Loaders](https://python.langchain.com/docs/integrations/document_loaders/)
- [Hugging Face Transformers Vision](https://huggingface.co/docs/transformers/index)
- [OpenAI Vision Guide](https://platform.openai.com/docs/guides/vision)

---

## Hubungan artikel ini dengan artikel lain di blog:
- [RAG in Production](./rag-in-production.md) — chunking, embedding, dan vector DB
- [Long Context vs RAG](./long-context-vs-rag.md) — alternatif memuat PDF ke model
- [Embedding Drift Monitoring](./embedding-drift-monitoring.md) — menjaga kualitas retrieval

Untuk bisnis dengan banyak dokumen PDF, layanan [AI Agentic untuk UMKM](https://superkilat.com/layanan/ai-agentic-umkm) dari superkilat.com dapat membantu membangun pipeline pengetaran otomatis.
