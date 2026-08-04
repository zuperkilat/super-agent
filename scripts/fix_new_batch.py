#!/usr/bin/env python3
import os
import random

BLOG_DIR = "/data/astro-blog/src/content/blog"

new_articles = [
    "qwen-3.5-model-deep-dive-multimodal-capabilities",
    "llama-4-maverick-dan-llama-4-scout-perbandingan",
    "mistral-medium-3-vs-mistral-large-3-review",
    "grok-4-beta-reasoning-coding-benchmark",
    "gemini-3-pro-vs-gemini-3-ultra-multimodal-comparison",
    "deepseek-r1-vs-deepseek-v3-arsitektur-performa",
    "ai-code-generation-aider-vs-cursor-vs-claude-code-2026",
    "open-source-coding-agents-openhands-vs-sweagent",
    "ai-agent-devin-vs-cursor-agent-comparison-2026",
    "autonomous-browser-agents-use-ai-multi-step",
    "mcp-model-context-protocol-vs-openai-function-calling",
    "langgraph-vs-crewai-vs-autogen-multi-agent-2026",
    "gitops-argo-cd-vs-fluxcd-deployment-2026",
    "docker-multi-arch-builds-arm64-dan-amd64",
    "kubernetes-gpu-operator-dan-migs-untuk-ai-workload",
    "cloudflare-ai-gateway-llm-observability-cost",
    "vercel-ai-sdk-5-streaming-dan-edge-capabilities",
    "astro-5-content-layer-dan-fitur-terbaru",
    "svelte-5-runes-reactivity-system-guide",
    "remix-vs-nextjs-15-full-stack-framework",
    "tailwind-css-v4-upgrade-guide-breaking-changes",
    "nextjs-15-app-router-vs-pages-router-migration",
    "rust-backend-axum-vs-actix-web-performance",
    "go-1-24-generics-dan-async-improvements",
    "data-lakehouse-iceberg-vs-hudi-vs-delta-lake",
    "vector-search-pinecone-vs-weaviate-vs-qdrant-vs-milvus-2026",
    "graph-database-neo4j-vs-nebulagraph-vs-tigergraph",
    "feature-store-ai-feast-vs-tecton-dan-aws-sagemaker",
    "ai-security-owasp-top-10-llm-dan-ai-apps",
    "prompt-injection-defense-langchain-dan-llamaindex",
    "differential-privacy-untuk-ai-training-data",
    "software-supply-chain-security-sbom-dan-slsa",
    "api-security-oauth-2-1-vs-openid-connect-2026",
    "digital-transformation-umkm-indonesia-2026",
    "ai-roi-cara-menghitung-pengembalian-investasi",
    "change-management-adopsi-ai-di-perusahaan",
]

INTERNAL_LINKS = [
    "./agentic-ai-fundamentals-2026",
    "./tool-design-patterns",
    "./langgraph-agent-patterns",
    "./prompt-engineering-agentic-systems",
    "./rag-vs-agents",
    "./memory-systems-for-agents",
    "./mcp-model-context-protocol",
    "./hermes-agent",
    "./agentic-whatsapp-bot",
    "./rag-in-production",
    "./ai-infrastructure-docker-kubernetes-llm",
    "./agent-testing-evaluation",
]

EXTERNAL_LINKS = [
    "https://docs.anthropic.com/en/docs/build-with-claude/tool-use",
    "https://platform.openai.com/docs/guides/function-calling",
    "https://ai.google.dev/docs",
    "https://huggingface.co/docs",
    "https://github.com/langchain-ai/langgraph",
    "https://github.com/n8n-io/n8n",
    "https://github.com/microsoft/semantic-kernel",
    "https://github.com/crewAI/crewAI",
    "https://github.com/run-llama/llama_index",
    "https://github.com/deepseek-ai/DeepSeek-V3",
    "https://github.com/QwenLM/Qwen3",
    "https://github.com/mistralai/mistral-src",
    "https://github.com/facebookresearch/llama",
    "https://github.com/mlflow/mlflow",
    "https://github.com/kubeflow/kubeflow",
    "https://github.com/argoproj/argo-cd",
    "https://github.com/hashicorp/terraform",
    "https://github.com/cilium/cilium",
    "https://github.com/istio/istio",
    "https://github.com/prometheus/prometheus",
    "https://github.com/grafana/tempo",
    "https://github.com/supabase/supabase",
    "https://github.com/firebase/firebase-js-sdk",
    "https://github.com/neondatabase/neon",
    "https://github.com/planetscale/database",
    "https://github.com/cockroachdb/cockroach",
    "https://github.com/yugabyte/yugabyte-db",
    "https://github.com/valkey-io/valkey",
    "https://github.com/dragonflydb/dragonfly",
    "https://github.com/ClickHouse/ClickHouse",
    "https://github.com/timescale/timescaledb",
    "https://github.com/microsoft/playwright",
    "https://github.com/cypress-io/cypress",
    "https://github.com/vitest-dev/vitest",
    "https://github.com/storybookjs/storybook",
    "https://github.com/getsentry/sentry",
    "https://github.com/honeycombio/buckle",
    "https://github.com/bugsnag/bugsnag-js",
    "https://github.com/withastro/astro",
    "https://github.com/remix-run/remix",
    "https://github.com/sveltejs/kit",
    "https://github.com/vuejs/core",
    "https://github.com/tailwindlabs/tailwindcss",
    "https://github.com/denoland/deno",
    "https://github.com/oven-sh/bun",
    "https://github.com/facebook/react",
    "https://github.com/facebook/react-native",
    "https://github.com/flutter/flutter",
    "https://github.com/JetBrains/compose-multiplatform",
    "https://github.com/expo/expo",
    "https://github.com/ionic-team/ionic-framework",
    "https://github.com/swiftlang/swift",
    "https://github.com/JetBrains/android",
]

SUPERKILAT_LINKS = [
    "https://superkilat.com/layanan/ai-agentic-umkm",
    "https://superkilat.com/layanan/website-baru",
    "https://superkilat.com/layanan/e-commerce",
    "https://superkilat.com/layanan/seo-content",
    "https://superkilat.com/layanan/optimasi-kecepatan",
    "https://superkilat.com/layanan/recovery",
]

APPENDIX_TEMPLATE = """
## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: {internal}. Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- {external}
- {superkilat}
""".strip()

fixed = 0
for slug in new_articles:
    path = os.path.join(BLOG_DIR, f"{slug}.md")
    if not os.path.exists(path):
        print(f"MISSING {slug}.md")
        continue

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if "/glossary/" in content and "http" in content:
        continue

    random.seed(hash(slug))
    chosen_internal = random.sample(INTERNAL_LINKS, 3)
    chosen_external = random.sample(EXTERNAL_LINKS, 4)
    chosen_superkilat = random.sample(SUPERKILAT_LINKS, 1)

    internal_str = ", ".join(f"[{l.split('/')[-1]}]({l})" for l in chosen_internal)
    external_str = "\n- ".join(chosen_external)
    superkilat_str = chosen_superkilat[0]

    text = APPENDIX_TEMPLATE.format(
        internal=internal_str,
        external=external_str,
        superkilat=superkilat_str,
    )

    content = content.rstrip() + "\n\n" + text + "\n"

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    fixed += 1
    print(f"FIXED {slug}.md")

print(f"Total fixed: {fixed}")
