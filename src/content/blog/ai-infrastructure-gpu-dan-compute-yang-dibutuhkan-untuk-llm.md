---
title: 'AI Infrastructure: GPU dan Compute yang Dibutuhkan untuk LLM'
description: 'Panduan lengkap GPU dan compute infrastructure untuk LLM — hardware requirements, vendor comparison, dan skala untuk production workloads.'
pubDate: '2026-07-27'
heroImage: '../../assets/blog-placeholder-5.jpg'
---

## Definisi

AI infrastructure untuk LLM memerlukan hardware compute yang dirancang khusus untuk *matrix multiplications* dan *tensor operations* — operasi dasar *neural network inference* dan *training*. GPU adalah komponen pusat karena arsitektur *parallel processing* yang sesuai dengan kebutuhan LLM. [GPU computing](/glossary/#gpu-computing) untuk LLM meliputi *inference serving*, *fine-tuning*, dan *embedding generation* yang masing-masing memiliki kebutuhan hardware berbeda.

## Masalah

Organisasi menghadapi tiga tantangan utama di AI infrastructure: (1) *inference latency* — model besar memerlukan banyak GPU untuk melayani permintaan real-time, (2) *cost optimization* — GPU enterprise (A100, H100) sangat mahal dan efisiensi biaya menjadi kritis, dan (3) *scaling complexity* — *horizontal scaling* untuk LLM serving tidak trivial karena *memory constraints* setiap GPU membatasi ukuran model yang dapat dilayani per node. Tim sering over-provision atau under-provision GPU karena kurangnya pemahaman *workload profiling*.

[AI Infrastructure](https://aws.amazon.com/solutions/ai-infrastructure/) dari AWS dan [NVIDIA DGX Cloud](https://www.nvidia.com/en-us/data-center/dgx-cloud/) menyediakan infrastruktur terkelola yang menangani masalah-masalah ini dengan *elastic scaling* dan *multi-instance GPU*.

## Cara Kerja

GPU mempercepat LLM melalui *massively parallel computation*. Setiap transformer layer LLM melibatkan *matrix-matrix multiplication* (GEMM) yang dieksekusi pada ribuan *CUDA cores* secara simultan. Untuk *inference*, *KV-cache* dan *attention computation* adalah bottleneck utama — VRAM bandwidth dan capacity menentukan throughput. Untuk *training*, *mixed-precision computation* (FP16/BF16) dengan *tensor cores* memberikan akselerasi signifikan. *[Inference optimization](/glossary/#inference-optimization)* seperti *kv-cache compression* dan *quantization* mengurangi kebutuhan GPU per model instance.

## Arsitektur

Arsitektur *inference cluster* mengikuti pola *load-balanced GPU pool*. Frontend menerima request HTTP dan menggunakan *request router* untuk mendistribusikan ke worker node. Setiap worker node berisi 1-8 GPU dengan VRAM gabungan yang cukup untuk *model weights + KV-cache*. Load balancer menggunakan *request batching* dan *continuous batching* untuk memaksimalkan GPU utilization. [vLLM](https://github.com/vllm-project/vllm) dan [TensorRT-LLM](https://developer.nvidia.com/tensorrt-llm) menyediakan *kernel optimization* untuk setiap GPU vendor. Arsitektur *training cluster* menggunakan *distributed training* dengan *data parallel*, *tensor parallel*, dan *pipeline parallel* strategies yang memerlukan *high-bandwidth interconnect* antar GPU.

## Komponen

1. **GPU Accelerator**: NVIDIA H100/H200 untuk training dan high-throughput inference; L40S untuk inference yang hemat biaya; [GPU computing](https://developer.nvidia.com/gpu-computing) dari NVIDIA menyediakan compute capability spesifik.
2. **CPU and Host System**: CPU mengelola data preprocessing, I/O, dan *scheduling*. Minimal 64+ cores untuk inference clusters dan 128+ cores untuk training clusters.
3. **High Bandwidth Memory (HBM)**: VRAM pada GPU menentukan ukuran model yang bisa dilayani. H100 memiliki 80GB HBM3 yang mendukung model hingga ~70B parameters dengan *tensor parallelism*.
4. **Network Fabric**: InfiniBand atau NVLink untuk *training clusters* yang membutuhkan *all-reduce* antar GPU. 100 Gbps Ethernet minimum untuk *inference clusters*.
5. **Storage**: NVMe SSD untuk *model weights* dan *dataset*; *distributed file system* (Lustre, GPFS) untuk *training data pipeline*.
6. **Orchestration Layer**: Kubernetes dengan GPU operator untuk menjadwalkan pods ke node dengan GPU tersedia. [Docker & Kubernetes untuk LLM Serving](/blog/ai-infrastructure-docker-kubernetes-llm.md) memberikan detail deployment.
7. **Monitoring**: GPU utilization monitoring (*nvidia-smi*, DCGM), *memory utilization*, *request latency percentiles*, dan *error rates per model endpoint*.

## Contoh Nyata

Sebuah startup AI mengembangkan model 13B parameter untuk bahasa Indonesia. Mereka memulai dengan node 4x RTX 4090 (24GB VRAM per GPU) — total 96GB VRAM — memungkinkan *tensor parallel* untuk model 13B dengan *quantization* 4-bit. Latensi p95: 350ms per token. Setelah 6 bulan dengan peningkatan traffic 10x, mereka migrasi ke node 8x H100 di cloud (AWS P5 instances) dengan *vLLM* serving. Latensi turun menjadi p95: 85ms, throughput naik 12x. Keputusan migrasi diambil setelah *profiling* menunjukkan bahwa H100's *FP8 Transformer Engine* memberikan throughput 3x lipat untuk model yang sama. [NVIDIA benchmarks](https://www.nvidia.com/en-us/data-center/h100/) dan [AWS EC2 P5 instances](https://aws.amazon.com/ec2/instance-types/p5/) menyediakan data performa yang dapat dijadikan referensi.

## Kapan Digunakan

GPU-based AI infrastructure diperlukan ketika: model memiliki parameter >7B yang tidak muat di CPU memory, *inference latency* di bawah 500ms diperlukan, *throughput* di atas 100 requests/second, *fine-tuning* model besar diperlukan, atau *embedding generation* untuk *RAG pipeline* dengan volume tinggi. [AI Infrastructure: Docker & Kubernetes untuk LLM Serving](/ai-infrastructure-docker-kubernetes-llm.md) memberikan arsitektur deployment untuk scene ini.

## Kapan Tidak

GPU infrastructure tidak diperlukan ketika model *quantized* cukup kecil untuk inference CPU (model di bawah ~7B dengan 4-bit quantization pada CPU dengan AVX-512) atau ketika *latency* tidak kritis (batch processing semalam). Untuk *prototyping* dan *experimentation*, cloud GPU instances dengan *pay-as-you-go* lebih masuk akal dari capex dedicated hardware. [vLLM deployment guide](/blog/cara-deploy-model-llm-sendiri-dengan-vllm-di-2026.md) membahas deployment model dengan infrastruktur efisien.

## Alternatif

Alternatif dari GPU berbasis NVIDIA meliputi *inference-optimized ASICs* seper sebagai *Google TPU* (untuk model yang di-optimalkan untuk TPU pod), *Groq LPU* (Language Processing Unit — deterministic inference dengan ultra-low latency), *AMD MI300X* yang menawarkan harga kompetitif dengan *ROCm* software stack, dan *CPU-only inference* dengan framework seper *llama.cpp* untuk model yang lebih kecil. [vLLM](https://github.com/vllm-project/vllm) mendukung multi-backend termasuk CUDA, ROCm, dan *CPU inference*. [vLLM deployment in 2026](/blog/cara-deploy-model-llm-sendiri-dengan-vllm-di-2026.md) memberikan panduan lengkap. Alternatif *cloud provider* juga muncul seperti [Lambda Cloud](https://lambdalabs.com/) dan [Coreweave](https://www.coreweave.com/) untuk GPU on-demand.

## Kelebihan

- *Throughput* dan *latency* yang tak tertandingi untuk LLM inference.
- *CUDA ecosystem* (PyTorch, TensorRT, vLLM) sangat matang dan teroptimasi.
- *Heterogeneous compute* — GPU menangani *inference* sementara CPU menangani *pre/post-processing*.
- *Elastic cloud GPU* memungkinkan scaling sesuai *workload* tanpa *upfront capex*.
- NVIDIA *NVLink* dan *InfiniBand* memungkinkan *multi-GPU distributed inference* yang efisien.

## Kekurangan

- Biaya tinggi — H100 instance di cloud ($3-30/hour) dan *A100* di on-premise ($10-15K per unit).
- Vendor lock-in ke ekosistem NVIDIA CUDA meski AMD ROCm dan *open-source alternatives* berkembang.
- *Power consumption* — single H100 node mengonsumsi 700W+ dan memerlukan *cooling infrastructure*.
- *VRAM limitation* — model besar memerlukan *tensor parallel* yang kompleks.
- *Capacity constraints* — H100 supply chain masih terbatas dan lead time panjang.

## Best Practice

1. **Profile sebelum provision** — ukur *memory usage*, *GPU utilization*, dan *latency profile* model spesifik Anda sebelum membeli/hosting hardware.
2. **Mulai dengan cloud GPU instances** — validasi *workload* di cloud sebelum commit ke on-premise infrastructure.
3. **Gunakan *quantization* secara aktif** — 4-bit/8-bit quantization mengurangi VRAM requirement 4x-2x dengan degradasi kualitas minimal.
4. **Implementasikan *auto-scaling*** — *inference traffic* berfluktuasi; *horizontal pod autoscaler* di Kubernetes menyesuaikan *GPU pod count* berdasarkan *request queue depth*.
5. **Monitor GPU utilization, bukan CPU** — *GPU utilization* <70% berarti resource terbuang; *GPU utilization* >90% berarti *bottleneck*. Targetkan sweet spot 60-80%.
6. **Terapkan *request batching*** — *continuous batching* pada *inference servers* (vLLM, TensorRT-LLM) meningkatkan throughput secara signifikan.
7. **Pilih vendor GPU berdasarkan workload** — NVIDIA H100 untuk *training*; L40S atau T4 untuk *inference cost optimization*.
8. **Rencanakan untuk *power and cooling*** — *GPU density* per rack menentukan *cooling* requirements; *liquid cooling* menjadi standard untuk >8 GPUs per rack.

## Kesalahan Umum

- **Over-provisioning dengan satu GPU type**: Menggunakan semua H100 untuk *inference* yang sebenarnya tidak membutuhkan FP8 Tensor Core — L40S lebih *cost-effective*.
- **Mengabaikan *network overhead***: Mendistribusikan model *tensor parallel* tanpa *high-bandwidth interconnect* (NVLink/InfiniBand) menyebabkan bottleneck komunikasi.
- **Tidak mempertimbangkan *KV-cache* memory**: *KV-cache* bisa mengkonsumsi memori setara atau melebihi *model weights* untuk *long context* inference. Perencanaan VRAM harus memperhitungkan ini.
- **Menggunakan GPU instance yang sama untuk training dan inference**: *Inference* dan *training* memiliki *hardware preference* yang berbeda. *Inference* menguntungkan dari *memory bandwidth*; *training* dari *compute throughput*.
- **Tidak ada *failover strategy***: Single GPU failure di *inference cluster* menyebabkan *service degradation* tanpa *redundancy*.

## Referensi Resmi

- [NVIDIA H100 Technical Specs](https://www.nvidia.com/en-us/data-center/h100/)
- [NVIDIA CUDA Computing](https://developer.nvidia.com/gpu-computing)
- [AWS P5 Instances for AI](https://aws.amazon.com/ec2/instance-types/p5/)
- [Google Cloud TPU v5p](https://cloud.google.com/vertex-ai/docs/gpus/tpus)
- [AMD ROCm Documentation](https://rocm.docs.amd.com/)

## FAQ

**Q: Berapa banyak GPU yang dibutuhkan untuk model 70B parameter?**
A: Model 70B membutuhkan minimal 80GB VRAM untuk model weights saja (FP16). Dengan *tensor parallelism* 2-way (2 GPU per layer), 2x A100 80GB atau H100 80GB GPU sudah cukup untuk *inference*. Untuk *training*, tambahan GPU diperlukan untuk *optimizer states* dan *gradients* — rekomendasi minimal 4-8 H100 GPU.

**Q: Apakah LLM inference bisa berjalan di CPU?**
A: Ya, untuk model kecil (7B atau kurang) dengan *4-bit quantization*, CPU inference dengan *llama.cpp* atau *vLLM CPU backend* adalah pilihan viable untuk development dan *low-throughput* production. Latensi akan 10-50x lebih lambat dari GPU.

**Q: Apa itu *tensor parallelism* dan kapan digunakan?**
A: *Tensor parallelism* membagi *weight matrices* dari setiap *transformer layer* ke beberapa GPU, yang berkomunikasi setiap *forward pass*. Digunakan ketika model tidak muat di satu GPU — model besar (70B+) memerlukan *tensor parallel* pada minimal 2 GPU. [Infrastruktur untuk Agentic AI](/blog/infrastruktur-untuk-agentic-ai-dari-gpu-ke-network.md) membahas *distributed compute* lebih lanjut.

**Q: Apa perbedaan *inference-optimized* GPU vs *training-optimized* GPU?**
A: *Training GPU* (A100, H100) mengutamakan *compute throughput* (TFLOPS) dengan *Tensor Cores* dan *NVLink bandwidth*. *Inference-optimized GPU* (L40S, T4) mengutamakan *memory bandwidth* (untuk *KV-cache* access) dan *power efficiency*. *Inference* membutuhkan bandwidth; *training* membutuhkan compute.

**Q: Bagaimana cara menurunkan biaya GPU inference?**
A: Strategi meliputi *quantization* (4-bit), *batch inference* untuk *off-peak hours*, *speculative decoding* untuk mempercepat throughput, *GPU sharing* melalui *vLLM* *multi-model serving*, dan menggunakan *spot instances* / *preemptible GPU* untuk non-latency-critical workloads.

**Q: Apa itu *continuous batching* dan mengapa penting?**
A: *Continuous batching* adalah teknik *inference serving* yang menambahkan *requests* ke *batch* secara dinamis tanpa menunggu batch penuh. Ini meningkatkan GPU utilization dari ~30% (static batching) menjadi ~80%+ (continuous batching), secara signifikan menurunkan *cost per token*.

---

### Artikel Terkait di Blog Ini

- [Mengapa Cloud Provider Bersaing Memperebutkan AI Workloads](/blog/mengapa-cloud-provider-bersaing-memperebutkan-ai-workloads.md)
- [Infrastruktur untuk Agentic AI: Dari GPU ke Network](/blog/infrastruktur-untuk-agentic-ai-dari-gpu-ke-network.md)
- [OpenAI API vs Self-Hosted LLM: Analisis Biaya dan Kinerja](/blog/openai-api-vs-self-hosted-llm-analisis-biaya-dan-kinerja.md)
- [Cara Deploy Model LLM Sendiri dengan vLLM di 2026](/blog/cara-deploy-model-llm-sendiri-dengan-vllm-di-2026.md)
- [AI Infrastructure: Docker & Kubernetes untuk LLM Serving](/blog/ai-infrastructure-docker-kubernetes-llm.md)
