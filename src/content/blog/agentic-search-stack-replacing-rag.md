---
title: 'Agentic Search Stack: Menggantikan RAG dengan Keyword Search'
description: 'Paper AAAI 2026 menunjukkan agentic keyword search mencapai 94.5% RAG faithfulness tanpa vector store.'
pubDate: '2026-07-27'
heroImage: '../../assets/blog-placeholder-2.jpg'
---

## Masalah Vector Search

Vector search butuh indexing, embedding generation, dan maintenance cost. Untuk query dengan named entities atau exact constraints, keyword search sering lebih akurat.

## Arsitektur Agentic Search

Agent decompose query menjadi sub-queries, execute sequential keyword searches, lalu synthesize findings. Mirip Search-R1 di AAAI 2026.

## Kapan Agentic Search Menang

Saat query butuh reasoning tentang data structure seperti invoice bulan Mei dengan status unpaid. Dense retrieval gagal menangkap exact constraints.
## FAQ

**Q: Bagaimana cara menerapkan ini?**
A: Mulai dari pilot project kecil. Fokus pada use case dengan measurable ROI.

**Q: Apakah ini scalable?**
A: Ya, gunakan stateless design, caching, dan observability.

**Q: Berapa biaya implementasi?**
A: Tergantung kompleksitas. Start dengan open-source stack untuk reduce cost.

**Q: Bagaimana mengukur success?**
A: Gunakan metrics: pass rate, latency, dan cost per task.

**Q: Apakah glossary tersedia?**
A: Ya, lihat [glossary](/glossary/) untuk definisi istilah teknis yang digunakan dalam artikel ini.

## Backlink References

- [AAAI 2026 Agentic Search Paper](https://www.firecrawl.dev/blog/agentic-ai-trends)
---

Hubungan artikel ini dengan artikel lain di blog:

- Lihat [RAG vs Agents](./rag-vs-agents.md)
- Lihat [Prompt Engineering untuk Agentic Systems](./prompt-engineering-agentic-systems.md)
- Lihat [Memory Systems for Agents](./memory-systems-for-agents.md)

---

### Artikel Terkait di Blog Ini
- [Agentic AI Fundamentals](./agentic-ai-fundamentals-2026.md)
- [Tool Design Patterns](./tool-design-patterns.md)
- [LangGraph Agent Patterns](./langgraph-agent-patterns.md)
- [Prompt Engineering untuk Agentic Systems](./prompt-engineering-agentic-systems.md)
- [Memory Systems for Agents](./memory-systems-for-agents.md)
- [MCP: Model Context Protocol](./mcp-model-context-protocol.md)
- [RAG vs Agents](./rag-vs-agents.md)
- [RAG in Production](./rag-in-production.md)
