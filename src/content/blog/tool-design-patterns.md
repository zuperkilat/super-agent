---
title: 'Tool Design Patterns for Agentic Systems: Getting LLMs to Call the Right Tools Correctly'
description: 'Advanced patterns for designing tools that agents actually use correctly. Schema design, error handling, and common pitfalls.'
pubDate: '2026-08-12'
heroImage: '../../assets/blog-placeholder-4.jpg'
---

Agent performance is fundamentally limited by tool quality. An agent with access to five well-designed tools will outperform an agent with access to fifty poorly-designed tools.

The critical realization: LLMs don't truly "understand" tools—they pattern-match tool descriptions and parameter names against training data. Ambiguous descriptions lead to incorrect invocations. Unclear parameter semantics lead to hallucinated values.

## The Tool Invocation Failure Taxonomy

Agents fail to invoke tools correctly for specific, preventable reasons:

**Hallucination**: Agent provides parameters that don't exist. Example: trying to filter by `user_type` when the only valid filter is `account_type`.

**Type Mismatch**: Agent passes wrong type. Example: passing a string like "2026-08-15" instead of a timestamp integer.

**Logic Error**: Agent understands the tool but chooses wrong parameter values. Example: querying for `status=active` when it should query `status=inactive`.

**Context Loss**: Agent forgets constraints mentioned in the system prompt. Example: supposed to filter by current user's org_id but passes null or generic value.

## Pattern 1: Unambiguous Naming

Use clear, searchable parameter names that encode their purpose and constraints.

**Bad**:
```python
@tool
def get_data(q: str, l: int) -> str:
    """Get data matching query"""
    pass
```

**Good**:
```python
@tool
def search_customer_records(
    customer_name_query: str,
    max_results: int = 10
) -> str:
    """Search for customer records by name.
    
    Args:
        customer_name_query: Full or partial customer name (e.g., "Acme Corp")
        max_results: Maximum number of results (1-100, default 10)
    
    Returns:
        JSON list of matching customers with id, name, email, account_status
    """
    pass
```

The difference:
- Parameter names are verbose but unambiguous
- Constraints are explicit (1-100)
- Return type is specified
- Examples are provided

## Pattern 2: Strict Enum for Categorical Choices

When a parameter has fixed valid values, make them explicit using Pydantic enums.

```python
from enum import Enum
from pydantic import BaseModel, Field

class CustomerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TRIAL = "trial"
    SUSPENDED = "suspended"

class QueryCustomerInput(BaseModel):
    status: CustomerStatus = Field(
        description="Customer account status"
    )
    region: str = Field(
        description="Region code: NA, EMEA, APAC, LATAM"
    )
```

This prevents agents from inventing invalid values like "active_paid" or "usa". The schema validation catches this before the tool runs.

## Pattern 3: Structured Error Returns

Tools should never raise exceptions. Instead, return structured error objects.

**Bad**:
```python
def transfer_funds(from_account: str, to_account: str, amount: float):
    if amount < 0:
        raise ValueError("Amount must be positive")
    if insufficient_balance(from_account, amount):
        raise Exception("Insufficient funds")
    # ... execute transfer
```

**Good**:
```python
def transfer_funds(from_account: str, to_account: str, amount: float) -> dict:
    """Transfer funds between accounts.
    
    Returns JSON object with:
    - success (bool): Whether transfer completed
    - error (str, optional): Human-readable error if failed
    - transaction_id (str, optional): ID if successful
    - reason (str, optional): Why transfer failed
    """
    
    if amount <= 0:
        return {
            "success": False,
            "error": "Invalid amount",
            "reason": "Transfer amount must be positive"
        }
    
    balance = get_balance(from_account)
    if balance < amount:
        return {
            "success": False,
            "error": "Insufficient funds",
            "reason": f"Account balance ${balance:.2f} < requested ${amount:.2f}"
        }
    
    transaction_id = execute_transfer(from_account, to_account, amount)
    return {
        "success": True,
        "transaction_id": transaction_id
    }
```

The agent can now see the error message and decide: retry, try alternative tool, escalate to human.

## Pattern 4: Output Consistency

Tools should return output in a consistent, parseable format (JSON recommended).

```python
@tool
def analyze_sales_data(
    date_range_start: str,
    date_range_end: str
) -> str:
    """Analyze sales data for date range.
    
    Returns JSON with:
    - total_revenue (float)
    - transaction_count (int)
    - average_transaction (float)
    - top_products (list of dict with name, count, revenue)
    """
    
    data = query_sales(date_range_start, date_range_end)
    
    return json.dumps({
        "total_revenue": float(data.revenue),
        "transaction_count": int(data.count),
        "average_transaction": float(data.revenue / data.count),
        "top_products": [
            {
                "name": p.name,
                "count": int(p.count),
                "revenue": float(p.revenue)
            }
            for p in data.top_products[:5]
        ]
    })
```

Consistency enables the agent to reliably parse results. If sometimes you return plain text and sometimes JSON, the agent can't plan based on the output.

## Pattern 5: Size-Aware Truncation

Tools accessing large datasets should bound output size. Large outputs consume tokens and confuse agents.

```python
@tool
def retrieve_documents(
    query: str,
    max_results: int = 5
) -> str:
    """Search documents. Returns truncated to 2000 chars per result."""
    
    results = vector_db.search(query, limit=max_results)
    
    formatted = []
    for doc in results:
        # Truncate each document to 2000 characters
        summary = doc.content[:2000] + "..." if len(doc.content) > 2000 else doc.content
        formatted.append({
            "id": doc.id,
            "title": doc.title,
            "relevance": round(doc.score, 2),
            "content": summary
        })
    
    return json.dumps(formatted)
```

This prevents single tool calls from blowing up the context window with verbose output.

## Pattern 6: Smart Defaults with Explicit Overrides

Provide sensible defaults for optional parameters so agents don't need to overthink them.

```python
class CustomerQueryInput(BaseModel):
    customer_id: str = Field(description="Unique customer ID")
    include_order_history: bool = Field(
        default=True,
        description="Include recent orders (default: True)"
    )
    order_count_limit: int = Field(
        default=10,
        description="Number of recent orders to include (default: 10, max: 100)"
    )
    include_contact_info: bool = Field(
        default=True,
        description="Include phone and email (default: True)"
    )
```

Most agents will call this with just `customer_id` and get sensible results. Advanced agents can override to fetch only order history if that's all they need.

## Pattern 7: Contextual Disambiguation

When a tool could be ambiguous in different contexts, add disambiguating fields.

**Scenario**: Multiple "create_task" operations (create for customer, create for project, create for user).

**Bad**: Single `create_task` tool

**Good**: Different tools or context-aware routing
```python
@tool
def create_customer_task(
    customer_id: str,
    task_type: Literal["follow_up", "support_issue", "sales_opportunity"],
    description: str,
    priority: Literal["low", "medium", "high"] = "medium"
) -> str:
    """Create a task associated with a customer."""
    pass

@tool  
def create_project_task(
    project_id: str,
    task_type: Literal["feature", "bug", "infrastructure"],
    description: str,
    assigned_to: str = None
) -> str:
    """Create a task within a project."""
    pass
```

Clear separation prevents agents from mixing contexts.

## Pattern 8: Rate-Limit Aware Design

Tools should communicate rate limits and retry guidance.

```python
def handle_api_call(endpoint: str, params: dict) -> dict:
    """Call external API with retry logic.
    
    Returns:
    - success (bool)
    - data (optional): Result if successful
    - error (str, optional): Error message
    - retry_after_seconds (int, optional): If rate limited
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.get(endpoint, params=params, timeout=10)
            if response.status_code == 429:  # Rate limited
                retry_after = int(response.headers.get("Retry-After", 60))
                return {
                    "success": False,
                    "error": "Rate limited",
                    "retry_after_seconds": retry_after
                }
            response.raise_for_status()
            return {"success": True, "data": response.json()}
        except Exception as e:
            if attempt == max_retries - 1:
                return {"success": False, "error": str(e)}
            time.sleep(2 ** attempt)  # Exponential backoff
```

Agent sees `retry_after_seconds` and can decide: wait and retry, or try different tool.

## Tool Testing Strategy

Before deploying tools to production agents, validate them with this checklist:

```python
def test_tool_robustness(tool_func, test_cases):
    """
    Test cases should include:
    1. Happy path (valid inputs, expected output)
    2. Missing required params
    3. Invalid enum values
    4. Type mismatches
    5. Boundary values (empty string, negative number, huge list)
    6. API failures / network timeouts
    """
    
    for case in test_cases:
        result = tool_func(**case["input"])
        
        # Verify structure
        assert isinstance(result, dict), "Result must be dict"
        assert "success" in result or "error" in result
        
        # Verify JSON parseable
        json.loads(json.dumps(result))
        
        # Verify output size
        result_size = len(json.dumps(result))
        assert result_size < 50000, f"Output too large: {result_size} bytes"
```

## Common Tool Design Mistakes

**Mistake 1**: Exposing implementation details in parameter names
- Bad: `internal_user_id`, `db_row_id`
- Good: `user_id`, `customer_id`

**Mistake 2**: Loose descriptions that could match multiple tools
- Bad: "Query database" (which database? what query?)
- Good: "Search customer records by name and status"

**Mistake 3**: Tools with side effects that agents don't expect
- Bad: A read tool that also logs to external service
- Good: Pure read tools, separate write tools

**Mistake 4**: Inconsistent return types
- Sometimes returns string, sometimes JSON
- Sometimes returns error as exception, sometimes as field

**Mistake 5**: Oversized output
- Returning entire database tables instead of summaries
- Including all fields when only a few are relevant

## The Golden Rule

If an LLM hallucinating a parameter value would cause catastrophic failure, that parameter shouldn't exist as a tool. Instead, encode it into the tool name or routing logic.

Example: Don't create a generic "execute_query" tool that takes SQL. Instead, create specific tools: "search_customers", "count_orders", "list_invoices". This forces the agent into safe, bounded operations.

---

## Next Steps

Audit your existing tools against these patterns. For each tool, ask:
- Could the parameter names be clearer?
- Are error cases handled gracefully?
- Is output size bounded?
- Would an agent reasonably understand this tool's purpose?

Tools are the lever by which agents interact with your systems. Small improvements in tool design yield outsized improvements in agent reliability.


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
