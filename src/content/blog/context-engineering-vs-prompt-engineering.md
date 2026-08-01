---
title: 'Context Engineering vs Prompt Engineering: Membangun Sistem yang Skalabel'
description: 'Context engineering vs prompt engineering menyoroti pergeseran dari prompt statis ke pengelolaan konteks dinamis. Pahami perbedaan, arsitektur, dan kapan memakai masing-masing.'
pubDate: '2026-08-01'
heroImage: '../../assets/blog-placeholder-8.jpg'
---

Seiring agen AI semakin kompleks, menulis satu prompt sempurna tidak lagi cukup. Konsep context engineering muncul sebagai evolusi dari prompt engineering: alih-alih merumuskan instruksi tunggal, kita merancang sistem yang mengumpulkan, memilah, dan menyajikan konteks tepat pada momen yang tepat.

## Definisi

Prompt engineering adalah seni menyusun instruksi teks agar model memberikan respons diinginkan. Context engineering adalah disiplin merancang apa yang dimasukkan ke dalam jendela konteks model—termasuk riwayat, dokumen, hasil tool, dan instruksi—secara dinamis dan terukur. Prompt adalah bagian dari konteks, bukan penggantinya.

## Masalah yang Diselesaikan

Prompt statis gagal ketika tugas bergantung pada data yang berubah-ubah: isi database terbaru, status sesi pengguna, atau hasil pencarian. Context engineering mengatasi "masalah konteks yang salah"—model mendapat informasi relevan tanpa kelebihan beban (context bloat) yang menurunkan kualitas dan menaikkan biaya.

## Cara Kerja

Pada setiap langkah agen, modul context assembly menyeleksi sumber: memory jangka pendek, memory jangka panjang, hasil retrieval, dan instruksi sistem. Pemilihan ini diatur oleh kebijakan—bisa aturan deterministik maupun model kecil pendukung. Hasilnya disusun menjadi prompt final sebelum dikirim ke model utama.

## Arsitektur dan Komponen

- **Context store**: penyimpanan state, memori, dan dokumen.
- **Retrieval layer**: mengambil potongan relevan (RAG).
- **Selector**: memutuskan bagian mana yang dimasukkan.
- **Compactor**: merangkum konteks yang terlalu panjang.
- **Renderer**: menyusun konteks menjadi format prompt.

## Contoh Kode Production-Ready

```python
def build_context(user_query: str, history: list, kb_chunks: list, max_tokens: int = 4000) -> str:
    parts = []
    # Instruksi sistem selalu di awal
    parts.append("Anda adalah asisten support. Jawab berdasar konteks di bawah.")
    # Riwayat dibatasi agar tidak meledak
    for turn in history[-4:]:
        parts.append(f"{turn['role']}: {turn['text']}")
    # Potongan knowledge base relevan
    used = 0
    for chunk in sorted(kb_chunks, key=lambda c: c['score'], reverse=True):
        if used + len(chunk['text']) > max_tokens:
            break
        parts.append(f"[Dokumen] {chunk['text']}")
        used += len(chunk['text'])
    parts.append(f"Pertanyaan: {user_query}")
    return "\n".join(parts)
```

## Kapan Dipakai dan Tidak

Gunakan context engineering untuk agen multi-langkah, multi-sumber, atau yang melayani banyak pengguna dengan state berbeda. Untuk tugas satu kali seperti klasifikasi teks pendek, prompt engineering sederhana sudah memadai dan lebih murah.

## Alternatif

- **Fine-tuning**: memasukkan pengetahuan ke bobot model, bukan konteks.
- **Long-context model**: memuat semua data ke jendela besar, mengurangi kebutuhan seleksi (lihat artikel long-context vs RAG).
- **Template statis**: cocok untuk alur sangat kaku.

## Kelebihan dan Kekurangan

Kelebihan: fleksibel, adaptif, menjaga relevansi. Kekurangan: tambahan kompleksitas engineering, risiko konteks salah pilih, dan overhead latensi dari tahap assembly.

## Best Practice

Batasi ukuran konteks dengan ambang token eksplisit. Prioritaskan instruksi sistem di awal. Log konteks yang dikirim untuk audit. Gunakan compactor sebelum jendela penuh.

## Kesalahan Umum

Memasukkan seluruh riwayat tanpa batas, menaruh instruksi di akhir (bisa diabaikan model), serta tidak menguji dampak perubahan konteks terhadap kualitas respons.

## Pola Penyusunan Konteks yang Efektif

Dalam praktik, context engineering menghadapi tiga tantangan nyata. Tantangan pertama adalah anggaran konteks (context budgeting): jendela model terbatas, sehingga Anda harus memutuskan komponen mana yang paling berharga. Pendekatan umum memberi bobot tetap—instruksi sistem selalu masuk, riwayat dibatasi empat putaran terakhir, dan sisa slot diisi hasil retrieval terurut skor.

Tantangan kedua adalah multi-tenansi. Setiap pengguna memiliki state berbeda; mencampur konteks antar pengguna adalah cacat keamanan serius. Pisahkan context store per sesi dan jangan pernah memuat memori pengguna A ke dalam prompt pengguna B, bahkan secara tidak sengaja lewat cache bersama.

Tantangan ketiga adalah caching. Konteks yang dihitung ulang setiap langkah memboroskan latensi dan biaya. Untuk bagian statis seperti instruksi sistem dan dokumen rujukan tetap, manfaatkan prompt caching yang ditawarkan beberapa penyedia agar token tersebut tidak dihitung ulang. Sebaliknya, bagian dinamis seperti hasil tool call tetap dihitung segar.

Menerapkan ketiga pola ini mengubah context engineering dari sekadar "menyusun prompt panjang" menjadi sistem yang terukur, aman, dan efisien.

## FAQ

**Apakah context engineering menggantikan prompt engineering?**
Tidak sepenuhnya. Prompt engineering tetap diperlukan untuk merumuskan instruksi; context engineering mengelola apa saja yang masuk ke jendela model, termasuk prompt tersebut.

**Apakah butuh model dengan jendela konteks besar?**
Tidak harus. Context engineering justru berguna untuk membatasi konteks agar model kecil pun tetap efektif.

**Bagaimana mengukur kualitas konteks?**
Gunakan evaluasi berbasis task: bandingkan akurasi saat konteks berubah. Metrik seperti answer relevancy membantu.

**Apakah context engineering sama dengan RAG?**
RAG adalah satu komponen retrieval dalam context engineering. Context engineering mencakup seluruh proses penyusunan konteks.

**Istilah seperti jendela konteks dan token sering membingungkan—di mana penjelasannya?**
Daftar istilah tersebut tersedia di [glossary](/glossary/) blog ini.

## Backlink References
- [Anthropic Prompt Engineering Overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [LangChain Context Management](https://python.langchain.com/docs/)
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)

---

## Hubungan artikel ini dengan artikel lain di blog:
- [Memory Systems for Agents](./memory-systems-for-agents.md) — manajemen state yang menjadi sumber konteks
- [RAG vs Agents](./rag-vs-agents.md) — kapan retrieval masuk dalam arsitektur
- [Long Context vs RAG](./long-context-vs-rag.md) — trade-off konteks panjang vs retrieval

Tim yang ingin membangun agen dengan manajemen konteks handal dapat memanfaatkan layanan [AI Agentic untuk UMKM](https://superkilat.com/layanan/ai-agentic-umkm) dari superkilat.com.
