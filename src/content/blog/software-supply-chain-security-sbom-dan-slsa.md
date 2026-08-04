---
title: 'Software Supply Chain Security: SBOM dan SLSA'
description: Panduan keamanan rantai pasokan software dengan SBOM dan SLSA untuk melindungi aset digital dari ancaman komponen pihak ketiga dan supply chain.
pubDate: 2026-08-04
heroImage: '../../assets/blog-placeholder-132.jpg'
---

## Daftar Isi

- [Definisi: Apa itu Software Supply Chain Security?](#definisi-apa-itu-software-supply-chain-security)
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

<a id="definisi-apa-itu-software-supply-chain-security"></a>
## Definisi: Apa itu Software Supply Chain Security?

Software supply chain security adalah praktik melindungi perangkat lunak dari ancaman yang muncul selama proses development, build, dan deployment. Ini mencakup komponen open-source, library pihak ketiga, build pipeline, dan konfigurasi infrastruktur. SBOM (Software Bill of Materials) dan SLSA (Supply-chain Levels for Software Artifacts) adalah dua standar utama untuk mencapai visibilitas dan assurance pada rantai pasokan.

<a id="mengapa-dibuat"></a>
## Mengapa Dibuat

Serangan seperti SolarWinds dan incident log4j menunjukkan bahwa komponen pihak ketiga bisa menjadi titik masuk bagi penyerang. Tanpa daftar komponen yang jelas atau standar integritas build, organisasi kesulitan mengetahui risiko apa yang mereka hadapi. SBOM dan SLSA diciptakan untuk menciptakan transparansi dan accountability.

<a id="masalah-yang-diselesaikan"></a>
## Masalah yang Diselesaikan

- **Unknown dependency**: Tidak tahu library mana yang ada di dalam aplikasi.
- **Vulnerability sprawl**: CVE menumpuk karena tidak ada inventaris komponen.
- **Build tampering**: Artifacts bisa diganti tanpa terdeteksi.
- **Provenance gap**: Sulit membuktikan bahwa binary berasal dari source code yang sah.
- **Incident response**: Sulit mengevaluasi dampak kerusakan karena tidak ada data komponen.

<a id="cara-kerja"></a>
## Cara Kerja

SBOM berfungsi seperti daftar bahan makanan: mencantumkan setiap komponen, versi, dan lisensi yang ada dalam suatu build. SLSA menetapkan tingkatan integritas build yang harus dipenuhi oleh pipeline, mulai dari version control hingga signed artifacts. Bersama, keduanya memberi organisasi kemampuan untuk memindai, melacak, dan memverifikasi komponen software.

<a id="arsitektur"></a>
## Arsitektur

Arsitektur melibatkan source repository, CI/CD pipeline, artifact registry, dan SBOM generator. Pipeline menghasilkan SLSA-compliant artifacts yang ditandatangani. Registry menyimpan SBOM bersama binary. Scanner secara berkala mencocokkan SBOM dengan database CVE. Tim operasional menerapkan arsitektur ini seperti yang dijelaskan di [ai-infrastructure-docker-kubernetes-llm.md](ai-infrastructure-docker-kubernetes-llm.md) untuk menjaga konsistensi deployment.

<a id="komponen"></a>
## Komponen

- **SBOM generator**: Tools seperti Syft atau CycloneDX untuk menghasilkan daftar komponen.
- **Build attestation**: Proses penandatanganan metadata build.
- **Policy engine**: Menentukan komponen mana yang diizinkan atau dilarang.
- **Vulnerability scanner**: Mencocokkan komponen dengan database CVE.
- **Artifact registry**: Repositori dengan kontrol akses dan signature verification.

<a id="contoh-nyata"></a>
## Contoh Nyata

Perusahaan software enterprise menerapkan SBOM pada setiap rilis agar customer bisa memindai komponen berbahaya dengan cepat. Organisasi pemerintah meminta vendor untuk menyediakan SLSA Level 3 attestation sebelum kontrak ditandatangani. Startup cybersecurity menggunakan tools scanning otomatis yang menolak merge request jika mengandung dependency dengan kerentanan tinggi. Banyak tim juga mengadopsi pendekatan ini agar sistem yang dijelaskan di [agent-testing-evaluation.md](agent-testing-evaluation.md) bisa berjalan di atas dasar komponen yang terverifikasi.

<a id="kapan-digunakan"></a>
## Kapan Digunakan

- Aplikasi di-host di lingkungan yang diatur ketat.
- Organisasi memakai banyak library open-source.
- Ada kebutuhan compliance seperti PCI-DSS, HIPAA, atau regulasi pemerintah.
- Proses CI/CD menangani deployment ke production secara otomatis.
- Anda ingin mempercepat respons insiden dengan inventaris komponen yang jelas.

<a id="kapan-tidak-digunakan"></a>
## Kapan Tidak Digunakan

- Project sangat kecil dengan dua atau tiga file tanpa dependency eksternal.
- Tim hanya membuat prototype yang tidak pernah masuk production.
- Lingkungan tidak memiliki akses internet untuk update vulnerability database.
- Proyek hanya berjalan di perangkat lokal tanpa deployment jarak jauh.

<a id="alternatif"></a>
## Alternatif

Vendor security management seperti Snyk, Dependabot, atau Sonatype. Untuk organisasi yang ingin kontrol penuh, mereka bisa mengembangkan scanner proprietary, tetapi SBOM dan SLSA tetap menjadi standar yang direkomendasikan.

<a id="kelebihan"></a>
## Kelebihan

- **Visibilitas**: Memahami komposisi aplikasi secara penuh.
- **Compliance**: Memenuhi persyaratan regulator dan customer.
- **Automation**: Bisa diintegrasikan ke CI/CD tanpa hambatan besar.
- **Incident response**: Mempercepat identifikasi dampak kerentanan.

<a id="kekurangan"></a>
## Kekurangan

- **Overhead**: Menghasilkan dan memelihara SBOM membutuhkan waktu.
- **Noise**: Vulnerability false positive bisa menyulitkan prioritasi.
- **Tool sprawl**: Berbagai tools untuk generation, scanning, dan enforcement bisa rumit.
- **License compliance**: SBOM juga mengungkap lisensi yang perlu dikelola secara hukum.

<a id="best-practice"></a>
## Best Practice

1. Hasilkan SBOM di setiap build dan simpan bersama artifact.
2. Tetapkan standar SLSA sesuai kematangan tim dan risiko bisnis.
3. Dokumentasikan daftar dependency approved di [glossary](/glossary/) untuk akses cepat.
4. Jadwalkan scan CVE secara otomatis di setiap pull request dan release.
5. Audit pipeline untuk memastikan bahwa signature dan attestation tidak bisa diabaikan.

<a id="kesalahan-umum"></a>
## Kesalahan Umum

- Menghasilkan SBOM tetapi tidak memindai atau memantaunya.
- Bergantung pada tools scanning tanpa memverifikasi kebenaran CVE.
- Mengabaikan transitive dependencies karena hanya memeriksa direct dependencies.
- Menandatangani artifact tetapi tidak memverifikasi signature saat deployment.

<a id="referensi-resmi"></a>
## Referensi Resmi

- [SLSA](https://slsa.dev)
- [Snyk Security](https://www.snyk.io)
- [NIST Cybersecurity](https://nist.gov)

<a id="faq"></a>
## FAQ

**1. Apakah SBOM wajib hukum di Indonesia?**
UU PDP dan regulasi sektor tertentu mulai mendorong transparency. Periksa ketentuan spesifik industri Anda.

**2. Berapa biaya implementasi SBOM?**
Banyak tools open-source yang gratis. Biaya biasanya untuk engineering time dan integrasi.

**3. Apakah SLSA menggantikan CI/CD security?**
Tidak. SLSA menetapkan standar untuk pipeline, tetapi security practice lain tetap diperlukan.

**4. Berapa SLSA level yang harus saya targetkan?**
Level 1 untuk startup, Level 2 untuk menengah, dan Level 3 untuk regulated industries.

**5. Bisakah saya menghasilkan SBOM dari Docker image?**
Ya, tools seperti Syft bisa menghasilkan SBOM dari container image, filesystem, atau archive.

**6. Apakah SBOM melindungi dari zero-day vulnerability?**
SBOM membantu identifikasi dampak, tetapi tidak mencegah zero-day. Ia mempercepat respons.

**7. Bagaimana dengan komisi closed-source?**
SBOM juga bisa mencatat komponen proprietary yang digunakan.

**8. Apakah ada hubungannya dengan keamanan AI?**
Rantai pasokan model juga perlu dilindungi agar tidak terjadi poisoning atau backdoor, yang menjadi bagian dari kontrol di [hermes-agent.md](hermes-agent.md).
