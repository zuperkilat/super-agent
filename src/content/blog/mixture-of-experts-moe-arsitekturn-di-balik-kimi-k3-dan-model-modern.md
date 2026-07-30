---
title: 'Mixture of Experts (MoE): Arsitektur di Balik Kimi K3 dan Model Modern'
description: 'MoE adalah arsitektur yang membuat model AI modern lebih efisien dalam compute dan inference. Pelajari bagaimana MoE bekerja dan mengapa menjadi pilihan arsitektur untuk model dengan billion parameters.'
pubDate: '2026-07-27'
heroImage: '../../assets/blog-placeholder-19.jpg'
---

Referensi glossary: /glossary/moe, /glossary/inference, /glossary/parameter, /glossary/model, /glossary/routing.

## Apa Itu MoE

Mixture-of-Experts adalah arsitektur di mana model terdiri dari beberapa sub-networks (experts) dan sebuah router yang menentukan expert mana yang diaktifkan untuk setiap input. Kimi K3 menggunakan 896 experts dengan 16 aktif per token.

## Keuntungan MoE

MoE memungkinkan model dengan parameter besar (2,8T untuk Kimi K3) berjalan lebih efisien dari model dense setara. Karena hanya subset parameters yang diaktifkan per token, biaya inference lebih rendah dan throughput lebih tinggi. /glossary/Inference.

## Tantangan MoE

MoE membutuhkan teknik training khusus dan load balancing antar experts untuk mencegah expert collapse. Scaling MoE secara efisien memerlukan hardware dan infrastructure yang lebih sophisticated.

## FAQ

- **Mengapa MoE lebih efisien?** Karena tidak semua parameters diaktifkan per token, menghemat compute secara signifikan.
- **Apakah MoE lebih sulit di-training?** Ya, MoE membutuhkan teknik training khusus, expert parallelism, dan load balancing yang cermat.

## Artikel Terkait

- [Kimi K3](/blog/kimi-k3-model-ai-moonshot-ai-tiongkok-siap-bersaing)
