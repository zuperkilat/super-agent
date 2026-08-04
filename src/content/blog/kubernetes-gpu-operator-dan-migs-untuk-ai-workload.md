---
title: 'Kubernetes GPU Operator dan MIGs untuk AI Workload 2026'
description: 'Panduan Kubernetes GPU Operator dan MIGs (Multi-Instance GPU) untuk workload AI. Arsitektur, konfigurasi, dan best practice production deployment.'
pubDate: '2026-08-04'
heroImage: '../../assets/blog-placeholder-115.jpg'
---

Kubernetes GPU Operator dan MIGs (Multi-Instance GPU) adalah fondasi infrastruktur untuk menjalankan AI workloads — training dan inference — di cluster Kubernetes. Di tahun 2026, NVIDIA MIG telah menjadi standard untuk GPU sharing di data center, dan GPU Operator memudahkan provisioning otomatis driver, runtime, dan device plugin.

Artikel ini membahas arsitektur GPU Operator, bagaimana MIG bekerja di Kubernetes, konfigurasi praktis, dan strategi untuk membangun cluster AI yang efisien.

## Definisi: Apa Itu Kubernetes GPU Operator?

Kubernetes GPU Operator adalah operator Kubernetes yang mengotomasi manajemen GPU NVIDIA di cluster. Ia menginstall dan maintain NVIDIA driver, CUDA toolkit, container runtime, dan device plugin secara otomatis.

Tanpa GPU Operator, tim DevOps harus:
1. Install NVIDIA driver secara manual di setiap node
2. Configure nvidia-docker runtime
3. Install NVIDIA device plugin untuk ekspos GPU ke Kubernetes
4. Handle upgrade driver dan kernel compatibility
5. Troubleshoot GPU issues di production

GPU Operator menyederhanakan ini menjadi declarative Kubernetes resources.

**MIG (Multi-Instance GPU)** adalah teknologi NVIDIA yang membagi satu GPU fisik menjadi beberapa isolated instances. Misalnya, A100 80GB bisa dibagi menjadi 7 instances masing-masing 10GB, atau H100 bisa dibagi menjadi beberapa instances.

## Mengapa GPU Operator dan MIG Dibutuhkan?

Tren AI workloads memaksa organisasi untuk mempertimbangkan GPU sharing:

1. **GPU expensive**: H100 dan A100 mahal — seringkali lebih ekonomis untuk share GPU antar banyak workloads daripada dedicasi penuh.
2. **Inference workloads kecil**: Banyak inference workloads hanya butuh 1-8GB VRAM. Menempatkan satu workload penuh di A100 80GB adalah waste.
3. **Operational overhead**: Manual GPU management di cluster besar memakan waktu signifikan. GPU Operator mengotomasi ini.
4. **Heterogeneous workloads**: Training (butuh GPU penuh) dan inference (butuh GPU sebagian) berjalan di cluster yang sama. MIG memungkinkan isolation dan sharing yang aman.

## Masalah yang Diselesaikan

**Driver management**: NVIDIA driver harus cocok dengan kernel version dan CUDA version. GPU Operator memastikan compatibility secara otomatis.

**GPU visibility**: Tanpa device plugin, Kubernetes tidak melihat GPU sebagai schedulable resources. Pods tidak bisa request GPU.

**GPU fragmentation**: Tanpa MIG, satu GPU hanya bisa dijalankan satu workload. MIG memungkinkan multiple workloads per GPU.

**Monitoring dan observability**: GPU Operator menyediakan DCGM (Data Center GPU Manager) metrics untuk Prometheus, memungkinkan monitoring VRAM usage, temperature, dan utilization.

## Cara Kerja GPU Operator

GPU Operator menggunakan standard Kubernetes operator pattern:

1. **Driver installation**: Menginstall NVIDIA driver via daemonset atau pre-built driver container
2. **Toolkit installation**: NVIDIA container toolkit untuk runtime integration
3. **Device plugin registration**: nvidia-k8s-device-plugin yang mengekspos GPU sebagai extended resources
4. **DCGM exporter**: Metrics exporter untuk Prometheus/Grafana
5. **Node Feature Discovery**: Menandai node dengan `nvidia.com/gpu.present=true`

Setiap komponen di-deploy sebagai DaemonSet atau Deployment, dengan toleration dan affinity untuk GPU nodes.

## Arsitektur GPU Operator

```
┌─────────────────────────────────────────────────────────────┐
│                    GPU Operator Components                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Driver       │  │ Toolkit      │  │ Device Plugin    │  │
│  │ DaemonSet    │  │ DaemonSet    │  │ DaemonSet        │  │
│  │ (NVIDIA drv) │  │ (nvidia-     │  │ (nvidia-k8s-     │  │
│  │              │  │  ctk)        │  │  device-plugin)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ DCGM Exporter│  │ Node Feature │  │ GFD              │  │
│  │ DaemonSet    │  │ Discovery    │  │ (GPU Feature     │  │
│  │ (Prometheus) │  │ DaemonSet    │  │  Discovery)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Komponen Utama

**GPU Driver**: NVIDIA kernel driver. Bisa di-install dari host atau via GPU Operator driver container. Driver container menggunakan `nvidia/driver` image.

**NVIDIA Container Toolkit**: Mereplaces standard Docker runtime dengan `nvidia` runtime. Memungkinkan container mengakses GPU.

**NVIDIA Device Plugin**: DaemonSet yang mengamankan GPU dari node dan mengeksposnya sebagai `nvidia.com/gpu` resource. Pods bisa request `nvidia.com/gpu: 1`.

**DCGM (Data Center GPU Manager)**: Libraries dan tools untuk monitoring GPU. DCGM Exporter expose metrics ke Prometheus.

**Node Feature Discovery**: Mendeteksi hardware features di setiap node — termasuk GPU presence, MIG capability, dan Compute Capability.

## Contoh Nyata: AI Inference Service dengan MIG

**Skenario**: Tim AI di SuperKilat menjalankan inference service untuk model NLP dan computer vision. Inference workloads butuh 8-16GB VRAM, sementara training workloads butuh 80GB penuh. A100 80GB di cluster dibagi dengan MIG.

**Konfigurasi cluster dengan GPU Operator:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gpu-config
  namespace: nvidia-gpu-operator
data:
  MIG: "all"  # Enable MIG strategy
```

**Pod training dengan full GPU:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: training-job
spec:
  containers:
  - name: pytorch
    image: pytorch/pytorch:2.1-cuda12.1-cudnn8-runtime
    resources:
      limits:
        nvidia.com/gpu: 1  # Full A100 80GB
```

**Pod inference dengan MIG (10GB slice):**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: inference-service
spec:
  containers:
  - name: vllm-inference
    image: vllm/vllm-openai:latest
    resources:
      limits:
        nvidia.com/gpu: 1  # MIG slice 10GB
```

GPU Operator dan MIG device plugin menangani allocation otomatis. Inference service mendapatkan 10GB isolated slice dari A100 [glossary: gpu-operator].

## Kapan Digunakan

**Gunakan GPU Operator ketika:**
- Cluster menjalankan workloads AI/ML (training atau inference)
- Ada NVIDIA GPUs di node (A100, H100, L4, T4, A10G)
Tim butuh automated driver dan runtime management [glossary: kubernetes].
- Ingin monitor GPU utilization dengan Prometheus/Grafana
- Multi-node cluster dengan GPU yang heterogeneous (mixed GPU types)

**Gunakan MIGs ketika:**
- Inference workloads lebih banyak daripada training
- GPU utilization rendah karena workload kecil
- Cost optimization adalah prioritas
- Banyak tim mengakses shared GPU resources
- Workloads bisa di-batch ke time slots

## Kapan Tidak Digunakan

**Jangan gunakan GPU Operator ketika:**
- Cluster hanya menjalankan CPU workloads
- Tidak ada NVIDIA GPUs di node
- Menggunakan AMD or Intel GPUs (GPU Operator khusus NVIDIA)
- Single-node setup dengan manual management yang lebih cepat

**Jangan gunakan MIGs ketika:**
- Training workloads besar yang butuh GPU penuh
- Single workload per GPU (no sharing needed)
- GPU adalah bottleneck dan workloads bisa di-batch sequential
- Menggunakan consumer GPUs (RTX series) yang tidak support MIG

## Alternatif GPU di Kubernetes

1. **AMD GPU Operator**: Operator untuk AMD Instinct GPUs — mirip NVIDIA GPU Operator tetapi untuk AMD ROCm ecosystem.
2. **Intel GPU Operator**: Untuk Intel Data Center GPU (Ponte Vecchio, Max Series).
3. **Manual device plugin**: Install nvidia-device-plugin manual tanpa GPU Operator — lebih sedikit overhead tetapi butuh maintenance manual.
4. **Kubernetes Device Plugins for vGPU**: NVIDIA vGPU untuk virtualized GPUs di cloud.
5. **SkyPilot atau Volcano**: Scheduler extensions untuk gang scheduling dan multi-node AI jobs.

## Kelebihan GPU Operator

1. **Automated lifecycle management**: Driver, toolkit, dan plugin di-update otomatis
2. **DCGM integration**: Monitoring GPU built-in tanpa setup manual
3. **MIG automation**: Konfigurasi MIG secara declarative
4. **Cluster consistency**: Semua GPU nodes consistent configuration
5. **Rollback capability**: Ketika upgrade gagal, rollback otomatis
6. **CNCF sandbox project**: Open source dengan active development

## Kelebihan MIGs

1. **GPU sharing**: Multiple workloads per GPU
2. **Isolation**: MIG instances isolated secara hardware — tidak ada interference antar tenants
3. **Cost efficiency**: Manfaatkan GPU investment lebih optimal
4. **Quality of Service**: Setiap MIG instance punya guaranteed VRAM dan compute
5. **Workload mixing**: Training dan inference bisa berjalan bersamaan di GPU yang sama

## Kekurangan GPU Operator

1. **NVIDIA-specific**: Tidak mendukung AMD atau Intel GPUs
2. **Resource overhead**: DaemonSets menggunakan sedikit CPU dan memory di setiap GPU node
3. **Driver dependency**: Harus cocok dengan host kernel version
4. **Learning curve**: Operator configuration kompleks untuk setup pertama kali
5. **Upgrade risk**: Driver upgrade bisa memerlukan node reboot

## Kekurangan MIGs

1. **Memory overhead**: MIG instances menggunakan sebagian VRAM untuk management overhead
2. **Configuration complexity**: MIG profile harus dipilih berdasarkan workload characteristics
3. **Limited to high-end GPUs**: Hanya tersedia di A100, H100, L4, A30. T4, A10G, dan RTX tidak support MIG.
4. **Profile switching**: Mengubah MIG configuration memerlukan GPU reset dan potential workload interruption
5. **Monitoring complexity**: Melacak utilization di banyak MIG instances memerlukan Grafana dashboard yang specialized

## Best Practice GPU Kubernetes 2026

1. **Gunakan GPU Operator untuk production clusters**: Avoid manual driver installation.
2. **Enable MIG untuk inference-heavy clusters**: Ratio inference-to-training workloads menentukan MIG configuration optimal.
3. **Monitor dengan DCGM metrics**: VRAM utilization, GPU temperature, dan memory bandwidth adalah critical metrics.
4. **Use Kubernetes QoS classes**: Guaranteed QoS untuk training jobs, Burstable untuk inference.
5. **Taint GPU nodes**: `nvidia.com/gpu` nodes di-taint dan pods menggunakan toleration untuk mencegah scheduling CPU workloads di GPU nodes.
6. **Schedule gang scheduling untuk distributed training**: Gunakan Volcano atau MPI Operator untuk jobs yang butuh multiple GPUs.
7. **Enable MIG on cluster-wide basis**: Gunakan ConfigMap untuk consistent MIG strategy di semua nodes.

## Kesalahan Umum GPU Kubernetes

1. **Menggunakan GPU nodes untuk CPU workloads**: GPU nodes mahal. Gunakan taints dan tolerations untuk isolate.
2. **Mengabaikan GPU driver version compatibility**: Driver mismatch dengan CUDA version menyebabkan runtime errors.
3. **Request lebih banyak GPU daripada yang ada**: GPU Operator tidak enforce hard limits kecuali configuration benar.
4. **Menggunakan MIG dengan workloads yang butuh full GPU**: Training jobs di MIG instances mengalami out-of-memory errors.
5. **Tidak monitor GPU utilization**: Tanpa DCGM metrics, tim tidak tahu apakah GPUs terutilasi optimal atau underutilized.
6. **Skip testing MIG configuration**: Test MIG profiles di staging sebelum apply ke production.

## Referensi Resmi

- [NVIDIA GPU Operator Documentation](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/) — Dokumentasi resmi NVIDIA GPU Operator
- [Kubernetes GPU Scheduling](https://kubernetes.io/docs/tasks/manage-gpu-scheduling/) — Panduan scheduling GPU di Kubernetes
- [NVIDIA MIG Documentation](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/mig.html) — Konfigurasi MIG dengan GPU Operator
- [NVIDIA Data Center GPU Manager](https://developer.nvidia.com/dcgm) — Monitoring dan management GPU
- [Kubernetes Device Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/) — Arsitektur device plugins

## FAQ

**Q: Apakah GPU Operator mendukung NVIDIA consumer GPUs (RTX, GTX)?**
A: GPU Operator primarily designed untuk data center GPUs. Consumer GPUs bisa digunakan tetapi some features (seperti MIG) tidak tersedia.

**Q: Berapa biaya overhead GPU Operator?**
A: Minimal — DCGM exporter dan device plugin menggunakan ~50-100MB memory per node. Driver installation memerlukan temporary resources tetapi tidak persistent overhead.

**Q: Apakah MIG mempengaruhi GPU performance untuk single workload?**
A: Ya, MIG instances memiliki isolasi bandwidth. Full GPU vs MIG slice bisa memiliki throughput difference sekitar 5-10%. Namun untuk inference workloads, ini trade-off yang acceptable.

**Q: Bagaimana cara menentukan MIG profile yang tepat?**
A: Profiles ditentukan oleh VRAM requirement dan compute requirement. A100 80GB offers: 1x80GB, 2x40GB, 3x20GB, 7x10GB. Pilih yang terdekat dengan requirement workload tanpa waste.

**Q: Apakah GPU Operator bisa digunakan dengan non-Kubernetes environments?**
A: GPU Operator adalah operator Kubernetes. Untuk bare metal atau VM tanpa Kubernetes, gunakan NVIDIA driver installation manual atau NVIDIA Container Toolkit saja.

**Q: Bagaimana cara troubleshooting GPU Operator issues?**
A: Periksa pod logs di namespace `nvidia-gpu-operator`. Gunakan `kubectl describe node` untuk cek allocated resources. DCGM metrics menunjukkan GPU health.

Artikel terkait:
- [AI Infrastructure Docker Kubernetes LLM](ai-infrastructure-docker-kubernetes-llm.md)
- [Kubernetes di Tahun 2026](kubernetes-di-tahun-2026-tren-dan-cara-implementasi.md)
- [CI/CD Pipeline Docker Kubernetes](ci-cd-pipeline-dengan-docker-dan-kubernetes-2026.md)

External references:
- [NVIDIA GPU Operator Documentation](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/)
- [Kubernetes GPU Scheduling](https://kubernetes.io/docs/tasks/manage-gpu-scheduling/)
- [Docker Multi-Arch Build Guide](https://www.docker.com/blog/multi-arch-build-and-cross-platform-build/)

Service links:
- [SuperKilat AI Agentic UMKM](https://superkilat.com/layanan/ai-agentic-umkm)
- [SuperKilat E-commerce](https://superkilat.com/layanan/e-commerce)

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [ai-infrastructure-docker-kubernetes-llm](./ai-infrastructure-docker-kubernetes-llm), [prompt-engineering-agentic-systems](./prompt-engineering-agentic-systems), [agent-testing-evaluation](./agent-testing-evaluation). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://github.com/prometheus/prometheus
- https://github.com/JetBrains/compose-multiplatform
- https://github.com/hashicorp/terraform
- https://github.com/neondatabase/neon
- https://superkilat.com/layanan/optimasi-kecepatan
