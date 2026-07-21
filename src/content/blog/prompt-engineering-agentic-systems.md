---
title: 'Prompt Engineering untuk Agentic Systems: Desain Reasoning, Tool Calling, dan Agent Loop'
description: 'Panduan lanjutan merancang prompt untuk agentic AI — reasoning chains, tool invocation, memory integration, dan guardrail production.'
pubDate: '2026-08-17'
heroImage: '../../assets/blog-placeholder-5.jpg'
---

Prompt engineering untuk agentic systems berbeda secara mendasar dari prompt engineering untuk chatbot biasa. Agentic prompt tidak hanya menentukan "tone" dan "format" — mereka **mendefinisikan cara agent berpikir, memilih tools, dan beradaptasi**. Kesalahan satu baris bisa membuat agent melakukan hallucination, memanggil tools yang salah, atau masuk infinite loop.

## Filosofi: Prompt sebagai Agent Controller

Agentic prompt adalah **runtime controller** untuk LLM. Ia menentukan:

1. **Apa yang boleh dilakukan** — daftar tools dan batasan akses
2. **Bagaimana cara berpikir** — reasoning chain format
3. **Kapan berhenti** — termination conditions
4. **Bagaimana recovery dari kegagalan** — fallback strategies
5. **Apa yang tidak boleh dilakukan** — guardrails

System prompt untuk agentic system biasanya 500-2000 kata. Lebih pendek dari artikel blog ini — tapi setiap kalimat punya konsekuensi pada behavior agent.

## Core Components of Agentic Prompt

### 1. Role / Persona

Menetapkan identitas dan tanggung jawab agent.

```
You are an order management assistant for TechMart. Your primary
responsibilities are:
- Look up order status and delivery estimates
- Initiate return/exchange requests
- Answer questions about products and policies
- Escalate complex issues to human agents when needed
```

**Rules of thumb:**
- Satu role per agent, jangan campur support + sales + billing
- Jelaskan scope secara eksplisit — "You are NOT authorized to process refunds"
- Tambahkan boundary conditions: "If unsure, ask for clarification rather than guessing"

### 2. Available Tools

Daftar tools yang bisa dipanggil agent, dengan deskripsi yang jelas.

```
AVAILABLE TOOLS:

1. lookup_order(phone_number: string, order_id?: string) -> dict
   Retrieve order status. Always use phone_number from conversation context.
   Returns: {order_id, status, items, eta, tracking_url}

2. initiate_return(order_id: string, reason: string) -> dict
   Start return process. Requires valid order_id. Customer has 30-day
   return window. Returns: {return_id, status, next_steps}

3. human_handoff(reason: string, summary: string) -> dict
   Transfer to human agent. Use when:
   - Customer mentions refund, legal issue, or complaint
   - You are uncertain after 3 attempts
   - Customer explicitly asks for human
   Returns: {ticket_id, estimated_wait_minutes}
```

**Critical**: Deskripsi tools harus jelas tentang **kapan harus dipanggil**. Agent mempattern-match dari description — deskripsi yang baik mengurangi hallucination.

### 3. Reasoning Instructions

Cara agent harus berpikir sebelum bertindak. Format populer:

**Chain-of-Thought (CoT):**
```
Before taking any action, think through:
1. What is the customer asking?
2. What information do I have?
3. What information do I need?
4. Which tool should I use?
5. What are the edge cases?
```

**Tree-of-Thought (ToT):**
```
Consider multiple possible approaches:
- Option A: Direct lookup
- Option B: Ask for clarification first
Evaluate trade-offs, then choose best path.
```

**ReAct Pattern:**
```
For each customer message:
Thought: [Your reasoning about what to do]
Action: [Tool name and parameters]
Observation: [Tool result]
... (repeat as needed)
Final Answer: [Response to customer]
```

### 4. Context Management

Menentukan apa yang diingat dan apa yang diabaikan.

```
MEMORY RULES:
- Remember: customer name, order history, previous issues, preferences
- Do NOT remember: credit card numbers, passwords, OTP codes
- After 10 messages, summarize older context into 3-4 bullet points
- If user references earlier conversation, acknowledge the history
```

### 5. Guardrails

Batasan yang tidak boleh dilanggar, dengan handling instructions.

```
GUARDRAILS:
1. Never claim to be a human. Always identify as AI assistant.
2. Never make promises about refund timing — use initiate_return tool.
3. Never discuss pricing not listed in official catalog.
4. If customer uses profanity, remain professional. Do not reciprocate.
5. Maximum response length: 3 sentences.
```

Guardrails harus spesifik. "Be helpful" tidak cukup. "If customer asks about refund timing, say 'Refund process takes 5-7 business days after approval' dan use initiate_return" jauh lebih baik.

### 6. Output Format

Menentukan format output agent.

```
OUTPUT FORMAT:
- Always respond in Indonesian
- Maximum 3 sentences
- Use bullet points for lists
- End with question only if you need clarification
- NEVER use ALL CAPS for emphasis
```

## Prompt Engineering untuk Tool Calling

Tool calling adalah inti dari agentic behavior. Prompt yang bagus untuk tool calling:

### Format 1: Instructed Tool Use

```python
SYSTEM_PROMPT = """
You are an AI assistant with access to the following tools:

{tools_list}

INSTRUCTIONS:
1. When the user asks a question, think about which tool would help
2. If a tool is needed, call it with the appropriate parameters
3. After receiving tool results, formulate your response
4. If no tool is relevant, respond directly from your knowledge

IMPORTANT RULES:
- Always verify the customer's phone number exists in the conversation
  before calling lookup_order
- If lookup_order returns "not found", ask the user to verify their number
- Never make up order IDs
- If initiate_return fails, explain why and suggest next steps

FORMAT YOUR TOOL CALLS AS:
Action: tool_name(parameter=value)

Example:
Action: lookup_order(phone_number="+6281234567890")

After receiving the tool result, provide your final answer.
"""
```

### Format 2: Structured Reasoning

```python
SYSTEM_PROMPT = """
You are an order support agent. Follow this structure for every response:

STEP 1: ANALYSIS
- What did the customer say?
- What do they need?

STEP 2: INFORMATION CHECK
- Do I have the phone number? 
- Do I need to call a tool?

STEP 3: ACTION
- [Tool call jika diperlukan]
- [Atau reasoning langsung]

STEP 4: RESPONSE
- Draft final answer dalam 1-3 kalimat

EXAMPLE INTERACTION:

Customer: "Pesanan saya belum sampai 2 minggu"

ANALYSIS: Customer is asking about order status. They have a delivery delay.
INFORMATION CHECK: I don't have their order ID. I need their phone number or order ID.
ACTION: Ask for phone number.
RESPONSE: "Bisa kasih nomor WhatsApp atau Order ID biar saya cek statusnya?"
"""
```

### Format 3: Few-Shot Example Injection

Sertakan contoh percakapan yang berhasil:

```python
SYSTEM_PROMPT = """
Here are examples of ideal interactions:

Example 1:
Customer: "Lacak pesanan ID TRX-12345"
→ Action: lookup_order(order_id="TRX-12345")
→ Observation: {status: "in_transit", eta: "2026-08-20"}
→ Response: "Pesanan TRX-12345 sedang dalam perjalanan, estimasi tiba 20 Agustus."

Example 2:
Customer: "Gimana cara return?"
→ Action: ask_for_details("return")
→ Response: "Untuk return, saya butuh Order ID dan alasan return. Bisa kasih?"

Example 3:
Customer: "Saya mau keluhan!"
→ Action: human_handoff(reason="complaint", summary="Customer wants to file complaint")
→ Response: "Saya akan transfer ke agent yang bisa membantu. Mohon tunggu sebentar."
"""
```

Few-shot examples jauh lebih efektif daripada instruction-only prompts untuk tool invocation patterns.

## Prompting untuk Agent Loop

Agent loop biasanya melibatkan multi-step reasoning. Prompt untuk loop:

```python
SYSTEM_PROMPT = """
You operate in a continuous loop. Each user message may require:
- Direct response (no tool)
- One or more tool calls (sequential or parallel)
- Clarification questions
- Handoff to human

LOOP RULES:
1. Maximum 5 tool calls per user message
2. After each tool result, decide next action
3. If tool returns error, try alternative approach or handoff
4. Stop when you have a complete answer for the user
5. NEVER repeat the same tool call with same parameters

TERMINATION CONDITIONS:
- Customer question answered adequately
- Human handoff completed
- Maximum iterations reached (5 tool calls)
- Ambiguous request requiring human judgment
"""
```

## Prompting untuk Multi-Agent Coordination

Jika sistem menggunakan supervisor pattern atau multi-agent:

```python
SUPERVISOR_PROMPT = """
You are a conversation router. Available specialist agents:

- sales_agent: Product inquiries, pricing, promotions
- support_agent: Order status, returns, technical issues  
- billing_agent: Invoice, payment, refund status
- escalation_agent: Complaints, legal issues, VIP customers

ROUTING RULES:
1. Analyze customer message for intent
2. Select ONE most appropriate agent
3. Hand off with context summary
4. NEVER try to answer specialist questions yourself

Example routing:
"Apakah produk ini ada stok?" → sales_agent (product availability)
"Pesanan saya rusak" → support_agent (damaged item)
"Saya mau refund total uang saya" → escalation_agent (large refund)
"""
```

## Eval untuk Prompt Agentic

Prompt engineering untuk agentic system memerlukan evaluasi khusus:

### Metric 1: Tool Selection Accuracy

```
Test case: "Lacak pesanan TRX-123"
Expected: Should call lookup_order with order_id="TRX-123"
Pass criteria: Correct tool selected 95%+ of time
```

### Metric 2: Parameter Accuracy

```
Test case: Customer phone is +6281234567890
Expected: Phone number passed correctly to tools
Pass criteria: No hallucinated phone numbers
```

### Metric 3: Termination Correctness

```
Test case: Customer says "thanks, that's all"
Expected: Agent stops, doesn't call unnecessary tools
Pass criteria: No extra tool calls within 2 turns of closure
```

### Metric 4: Hallucination Rate

```
Test case: "What is the refund policy?"
Expected: Answer based on known policy or use lookup tool
Pass criteria: No fabricated refund amounts or timelines
```

## Prompt Maintenance: Versioning

Prompt adalah kode. Kelola dengan version control:

```
v1.0: Initial baseline
v1.1: Fixed tool description for lookup_order
v1.2: Added clarification step for ambiguous requests
v2.0: Switched from CoT to ReAct format, added budget constraints
v2.1: Tuned handoff trigger threshold from 2 to 3 attempts
```

Setiap perubahan prompt harus melalui:
1. Offline eval (50+ test cases)
2. Canary production test (5% traffic)
3. Full rollout jika metrics improves

## Kesalahan Umum

| Kesalahan | Contoh | Konsekuensi | Solusi |
|-----------|--------|-------------|--------|
| Tool descriptions terlalu singkat | "Query database" | Agent panggil tool yang salah | Tambah constraint, examples, return format |
| Tidak ada fallback instructions | - | Agent bingung saat tool gagal | Tambahkan "If tool returns error, try X or handoff" |
| Guardrails tidak spesifik | "Be careful" | Agent tetap salah langkah | Gunakan concrete rules: "Never say X. Always say Y when Z" |
| Output format ambiguous | - | Agent output inconsistent | Define exact format, include examples |
| Prompt terlalu panjang (>5000 kata) | - | LLM lupa instruksi di akhir | Prioritaskan instruksi penting, move details ke reference doc |
| Tidak ada numbing mechanism | "Help with everything" | Agent overloaded, inconsistent | Scope tools per conversation state |

## Best Practice Summary

1. **Concise but complete**: 500-1500 kata optimal. Lebih sedikit untuk simple agents, lebih banyak untuk complex ones.
2. **Tool first**: Jelaskan tools sebelum reasoning instructions — LLM prioritaskan instruksi yang datang pertama.
3. **Examples beat instructions**: 2-3 few-shot examples lebih efektif dari 5 baris instruction.
4. **Negative constraints**: Sering kali lebih penting daripada positive instructions. "DON'T do X" lebih kuat daripada "DO Y".
5. **Iterate with eval**: Prompts evolve. Promote changes via A/B testing, bukan feelings.

## Referensi Resmi

- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)
- [Claude Tool Use Documentation](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [OpenAI Function Calling Best Practices](https://platform.openai.com/docs/guides/function-calling)
- [LangChain Prompt Templates](https://python.langchain.com/docs/concepts/prompt_templates)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

---

Hubungan artikel ini dengan artikel lain di blog:

- **Tool Calling & Design**: lihat [Tool Design Patterns](../tool-design-patterns.md) untuk merancang tools yang dipanggil oleh LLM.
- **State & Memory**: lihat [Memory Systems for Agents](../memory-systems-for-agents.md) untuk konteks manajemen state dalam agent loop.
- **Agent Testing & Evaluasi**: lihat [Agent Testing dan Evaluasi](../agent-testing-evaluation.md) untuk cara menguji prompt agent secara sistematis.
- **LangGraph Orchestration**: lihat [LangGraph Agent Patterns](../langgraph-agent-patterns.md) untuk integrasi prompt dalam graph workflow.
- **Agentic Fundamentals**: lihat [Agentic AI Fundamentals](../agentic-ai-fundamentals-2026.md) untuk konteks sistem otonom.


---

### Artikel Terkait di Blog Ini

- [RAG vs Agents: When to Use Each Pattern](./rag-vs-agents.md) — trade-off antara RAG dan agentic approach
- [LangGraph Agent Patterns](./langgraph-agent-patterns.md) — orchestration stateful agents
- [Tool Design Patterns](./tool-design-patterns.md) — cara merancang tools yang benar-benar dipakai LLM
- [Prompt Engineering untuk Agentic Systems](./prompt-engineering-agentic-systems.md) — merancang reasoning dan tool calling prompts
- [Memory Systems for Agents](./memory-systems-for-agents.md) — state management untuk conversation
- [Agent Testing dan Evaluasi](./agent-testing-evaluation.md) — testing dan grading agent behavior
- [MCP: Model Context Protocol](./mcp-model-context-protocol.md) — standar tool integration
- [Hermes Agent](./hermes-agent.md) — framework agentic production-ready
- [AI Infrastructure: Docker & Kubernetes untuk LLM Serving](./ai-infrastructure-docker-kubernetes-llm.md)
- [RAG in Production](./rag-in-production.md) — chunking, embedding, vector DB, optimization
- [Agentic AI Fundamentals](./agentic-ai-fundamentals-2026.md) — konsep dasar sistem otonom
