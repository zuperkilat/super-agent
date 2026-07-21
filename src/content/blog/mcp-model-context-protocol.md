---
title: 'Model Context Protocol (MCP): Standar Terbuka untuk Tool Integration di Agentic AI'
description: 'Panduan lengkap MCP — standar Anthropic yang menghubungkan LLM ke tools, APIs, dan data sources. Arsitektur, implementasi, dan production patterns.'
pubDate: '2026-08-16'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

Model Context Protocol (MCP) adalah standar terbuka yang dirancang Anthropic untuk menyatukan LLM dengan tools, APIs, dan data sources eksternal. Sejak peluncuran November 2024, MCP berkembang menjadi infrastruktur de-facto untuk plugin system di agentic AI — menggantikan pendekatan custom integration yang bertele-tele.

## Mengapa MCP Ada?

Sebelum MCP, setiap integrasi LLM-ke-API memerlukan kode custom:

```
Claude → custom wrapper A → Salesforce API
Claude → custom wrapper B → Shopify API
Claude → custom wrapper C → Database query
```

Masalahnya:
- Setiap wrapper memiliki interface berbeda
- Tidak ada standar schema
- Scaling ke 10 tools berarti 10 implementasi berbeda
- Vendor lock-in setiap integrasi

MCP mensolves ini dengan model client-server. LLM sebagai client memanggil tools via protokol standar, tanpa perlu tahu detail implementasi backend.

## Arsitektur MCP

MCP menggunakan model **client-host-server** tiga lapis:

```
┌─────────────────────────────────────────────────────┐
│                   Host Application                   │
│  (Claude Desktop, Cursor, IDE, atau custom app)     │
└────────────────────────┬────────────────────────────┘
                         │ MCP Protocol (JSON-RPC)
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ MCP      │  │ MCP      │  │ MCP      │
   │ Client A │  │ Client B │  │ Client C │
   │ (LLM)    │  │ (LLM)    │  │ (LLM)    │
   └──────────┘  └──────────┘  └──────────┘
          │              │              │
          ▼              ▼              ▼
   ┌──────────────────────────────────────────┐
   │              MCP Server                  │
   │   ┌────────────────────────────────┐     │
   │   │  Tool Registry                 │     │
   │   │  • search_contacts             │     │
   │   │  • send_message                │     │
   │   │  • lookup_order                │     │
   │   │  • query_database              │     │
   │   │  • transcribe_audio            │     │
   │   └────────────────────────────────┘     │
   │   ┌────────────────────────────────┐     │
   │   │  Resource Provider             │     │
   │   │  • file://schema.json          │     │
   │   │  • db://customers              │     │
   │   │  • api://inventory             │     │
   │   └────────────────────────────────┘     │
   │   ┌────────────────────────────────┐     │
   │   │  Prompt Template Library       │     │
   │   │  • support_flow.md             │     │
   │   │  • sales_outreach.md           │     │
   │   └────────────────────────────────┘     │
   └──────────────────────────────────────────┘
```

## Konsep Dasar MCP

### 1. Resources

Resource adalah data yang diekspos oleh server dan dapat dibaca oleh client. Contoh:

```
file://company_policies/refund_policy.md
db://customers/active?region=APAC
api://inventory/sku-123
```

Client bisa membaca resource ini dan memasukkannya ke context LLM.

### 2. Tools

Tool adalah **aksi yang bisa dieksekusi**. LLM memanggil tool untuk melakukan hal-hal seperti mengirim email, query database, atau update record.

Setiap tool didefinisikan dengan schema JSON:

```json
{
  "name": "lookup_order",
  "description": "Retrieve order status by phone number or order ID",
  "inputSchema": {
    "type": "object",
    "properties": {
      "phone_number": {
        "type": "string",
        "description": "Customer WhatsApp number in E.164 format"
      },
      "order_id": {
        "type": "string",
        "description": "Optional specific order ID"
      }
    },
    "required": ["phone_number"]
  }
}
```

### 3. Prompts

Template prompt yang bisa dipanggil client untuk menginisiasi percakapan dengan instruksi khusus:

```json
{
  "name": "support_handoff",
  "description": "Generate handoff message when escalating to human agent",
  "arguments": [
    {
      "name": "customer_name",
      "description": "Customer full name",
      "required": true
    },
    {
      "name": "issue_summary",
      "description": "Brief description of the issue",
      "required": true
    }
  ]
}
```

### 4. Notifications

Server bisa mengirim notification ke client saat ada perubahan data (misal: database record diupdate, pesan WhatsApp masuk). Ini memungkinkan **real-time agentic workflows**.

## Implementasi MCP Server

### Python (FastMCP)

```python
from mcp.server.fastmcp import FastMCP

# Initialize server
mcp = FastMCP("whatsapp-business-server")

# Tool definition
@mcp.tool()
def lookup_order(phone_number: str, order_id: str = None) -> dict:
    """Lookup order status for a customer.
    
    Args:
        phone_number: Customer WhatsApp number in E.164 format
        order_id: Optional specific order ID
    
    Returns:
        Order details including status, items, and ETA
    """
    query = {"customer_phone": phone_number}
    if order_id:
        query["id"] = order_id
    
    order = db.orders.find_one(query)
    if not order:
        return {"error": "No order found", "found": False}
    
    return {
        "found": True,
        "order_id": order["id"],
        "status": order["status"],
        "items": order["items"],
        "eta": order["estimated_delivery"]
    }

@mcp.tool()
def create_support_ticket(phone_number: str, reason: str, summary: str) -> dict:
    """Create a support ticket and notify human agent.
    
    Args:
        phone_number: Customer WhatsApp number
        reason: Category of the issue (billing, technical, delivery)
        summary: Brief description of the problem
    
    Returns:
        Ticket ID and expected response time
    """
    ticket = {
        "id": generate_ticket_id(),
        "customer_phone": phone_number,
        "reason": reason,
        "summary": summary,
        "status": "open",
        "created_at": datetime.utcnow().isoformat()
    }
    db.tickets.insert_one(ticket)
    
    # Notify via Slack (real-world)
    slack.notify(f"New ticket {ticket['id']}: {summary}")
    
    return {
        "ticket_id": ticket["id"],
        "status": "created",
        "expected_response": "24 hours"
    }

# Resource definition
@mcp.resource("db://customers/active")
def get_active_customers(region: str = None) -> str:
    """Get list of active customers, optionally filtered by region."""
    query = {"status": "active"}
    if region:
        query["region"] = region
    
    customers = db.customers.find(query).limit(50)
    return json.dumps([
        {
            "phone": c["phone"],
            "name": c["name"],
            "region": c["region"],
            "tier": c["tier"]
        }
        for c in customers
    ])

if __name__ == "__main__":
    mcp.run()
```

### TypeScript (MCP SDK)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "whatsapp-business-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// Register tool
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "lookup_order",
      description: "Lookup order status for a customer",
      inputSchema: {
        type: "object",
        properties: {
          phone_number: { type: "string" },
          order_id: { type: "string" }
        },
        required: ["phone_number"]
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "lookup_order") {
    const result = await lookupOrderInDB(args.phone_number, args.order_id);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## MCP di Production

### Transport Options

MCP mendukung beberapa transport:

| Transport | Use Case | Keterangan |
|-----------|----------|------------|
| stdio | Local tools | Standard input/output, cocok untuk Claude Desktop |
| SSE (Server-Sent Events) | Remote tools | HTTP-based, cocok untuk server terpisah |
| HTTP Streaming | Real-time | Streaming responses untuk agent yang butuh low latency |

### Security

MCP dirancang dengan security sebagai first-class concern:

1. **Scoped Access**: Server hanya bisa mengakses resource yang diizinkan oleh host
2. **User Consent**: Host aplikasi meminta persetujuan user sebelum mengizinkan akses
3. **Input Validation**: Semua tool input divalidasi oleh schema
4. **Audit Logging**: Semua tool calls tercatat untuk compliance

**Critical warning** — sesuai dokumentasi resmi:

> MCP servers are subject to the lethal trifecta: prompt injection, excessive permission, and data exfiltration. A compromised MCP server can access all user data visible to the LLM.

Implementasikan **principle of least privilege**:
- Jangan expose seluruh database sebagai satu tool
- Gunakan scoped queries (filter by verified phone number)
- Implementasi rate limiting di level server
- Audit semua tool executions

## Ecosystem 2026

### MCP Servers Populer

| Server | Transport | Fungsi |
|--------|-----------|--------|
| WhatsApp MCP (`lharries/whatsapp-mcp`) | stdio | Personal WhatsApp via whatsmeow |
| Cloud API WhatsApp MCP (`networkerman/whatsapp-cloud-api-mcp-server`) | stdio/HTTP | Official Meta Cloud API (50+ tools) |
| File System MCP | stdio | File read/write/edit |
| PostgreSQL MCP | HTTP | Database query |
| Slack MCP | HTTP | Slack messaging |
| GitHub MCP | HTTP | Repository operations |

### Clients yang Mendukung MCP

- **Claude Desktop** (Anthropic) — native MCP support
- **Cursor** — built-in MCP integration
- **Windsurf** — MCP client support
- **Custom apps** — via MCP SDK

## MCP vs Custom Integration

| Aspek | Custom Wrapper | MCP |
|-------|----------------|-----|
| Development time | 2-4 hari per tool | 1-2 jam per tool |
| Schema consistency | Manual enforcement | Built-in validation |
| Tool discovery | Manual | Automatic via `list` endpoint |
| Client compatibility | Satu client | Semua MCP client |
| Debugging | Logging sendiri | Built-in message logging |
| Standardization | Tidak ada | JSON-RPC 2.0 |
| Community | Terbatas | 50+ open-source servers |

## Bagaimana MCP Terhubung dengan Agentic Systems

MCP adalah **infrastructure layer** yang menghubungkan LLM dengan dunia nyata:

```
User: "Lacak pesanan saya"
    ↓
LLM reasoning
    ↓
LLM sees tool: lookup_order (registered via MCP)
    ↓
LLM calls: lookup_order(phone_number="+628987654321")
    ↓
MCP Server executes: db.orders.find_one({customer_phone: "+628987654321"})
    ↓
Result returned to LLM
    ↓
LLM formats response
    ↓
User: "Pesanan kamu dalam perjalanan, estimasi tiba besok jam 14:00"
```

Tanpa MCP, Anda harus menulis custom wrapper untuk setiap tool. Dengan MCP, LLM memanggil tool via protokol standar, dan server menangani execution.

## Implementation Patterns

### Pattern 1: MCP untuk Agentic WhatsApp Bot

```python
# WhatsApp agent menggunakan MCP tools
mcp_client = MCPClient()

# Register WhatsApp Cloud API MCP server
mcp_client.connect("whatsapp-cloud-api")

# Register CRM MCP server  
mcp_client.connect("salesforce-crm")

# Agent reasoning loop
async def handle_whatsapp_message(message: str, phone: str):
    # 1. Get conversation context from MCP resource
    context = mcp_client.get_resource(f"whatsapp://conversation/{phone}")
    
    # 2. LLM decides which tool to call
    tool_call = llm.decide_tool(message, available_tools=mcp_client.list_tools())
    
    # 3. Execute via MCP
    result = mcp_client.call_tool(tool_call.name, tool_call.arguments)
    
    # 4. Format response
    response = llm.format_response(result)
    
    # 5. Send via MCP
    mcp_client.call_tool("send_message", {
        "to": phone,
        "body": response
    })
```

### Pattern 2: MCP di LangGraph

```python
from langgraph.graph import StateGraph

class AgentState(TypedDict):
    messages: list
    mcp_context: dict

def mcp_tool_node(state: AgentState) -> AgentState:
    """Node yang mengeksekusi tools via MCP"""
    last_message = state["messages"][-1]
    
    if last_message.get("tool_calls"):
        tool_results = []
        for tool_call in last_message["tool_calls"]:
            result = mcp_client.call_tool(
                tool_call["name"],
                tool_call["arguments"]
            )
            tool_results.append({
                "role": "tool",
                "content": result
            })
        
        return {"messages": tool_results}
    
    return state

workflow = StateGraph(AgentState)
workflow.add_node("mcp_tools", mcp_tool_node)
workflow.add_edge("agent", "mcp_tools")
workflow.add_edge("mcp_tools", "agent")
```

## Best Practice

1. **Tool Granularity**: Pecah tools besar menjadi tools kecil. Lebih baik 5 tools spesifik daripada 1 tool generic.
2. **Schema Documentation**: Setiap parameter harus punya `description` yang jelas. LLM menggunakan description ini untuk memilih parameter yang benar.
3. **Error sebagai Data**: Tools yang error harus return JSON `{success: false, error: "..."}` bukan raise exception. Agent bisa membaca error dan recovery.
4. **Idempotency**: Tools harus idempoten — bisa dipanggil berkali tanpa side effects. Ini penting karena agent bisa retry.
5. **Output Size Limits**: Batasi output maksimal 10-50KB. Output besar membakar context window.
6. **Monitoring**: Log semua tool calls (input + output + latency). Data ini untuk debugging agent performance.

## Kapan MCP Tidak Perlu Digunakan

Tiap kali tool integration hanya untuk satu client dan tidak akan reuse, custom wrapper bisa lebih cepat. MCP mulai worth it ketika:
- Lebih dari 2 tools
- Multiple LLM clients perlu access ke tools yang sama
- Tools berubah secara dinamis (runtime registration)
- Team membangun internal agentic platform

## Referensi Resmi

- [Anthropic Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [lharries/whatsapp-mcp (GitHub)](https://github.com/lharries/whatsapp-mcp)
- [networkerman/whatsapp-cloud-api-mcp-server](https://mcpservers.org/servers/networkerman/whatsapp-cloud-api-mcp-server)
- [FastMCP Documentation](https://github.com/jlowin/fastmcp)
- [LangChain MCP Integration](https://python.langchain.com/docs/integrations/tools/mcp/)

---

Hubungan artikel ini dengan artikel lain di blog:

- **Tool Calling & Design**: lihat [Tool Design Patterns](../tool-design-patterns.md) untuk cara merancang tools yang benar-benar digunakan LLM.
- **Mengoordinasikan Tools dalam Graph**: lihat [LangGraph Agent Patterns](../langgraph-agent-patterns.md) untuk MCP sebagai node dalam LangGraph workflow.
- **Agentic Fundamentals**: lihat [Agentic AI Fundamentals](../agentic-ai-fundamentals-2026.md) untuk konteks sistem otonom secara umum.
- **Testing Agentic Systems**: lihat [Agent Testing dan Evaluasi](../agent-testing-evaluation.md) untuk cara menguji MCP tools sebelum production.
- **Agentic WhatsApp Bot**: lihat [Agentic WhatsApp Bot](../agentic-whatsapp-bot.md) untuk implementasi nyata MCP dalam sistem messaging.


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
