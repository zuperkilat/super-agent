---
title: 'AI Engineering Observability: Monitoring Agents in Production'
description: 'Building observability infrastructure for autonomous AI agents. Metrics, tracing, alerting, and debugging strategies for production deployments.'
pubDate: '2026-08-13'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

Most AI engineering teams focus intensely on model performance during development, then deploy systems into production with almost no observability infrastructure. This is backwards.

Agentic systems are significantly more complex than traditional applications. An agent might retry a failed operation, switch to an alternative tool, or escalate to a human—all based on observations during execution. Without detailed tracing through this decision process, debugging failures becomes guesswork.

## The Observability Challenge

Traditional application monitoring tracks:
- Request latency
- Error rates  
- Database query performance
- API response times

For agents, you need visibility into:
- Which tool was selected and why
- What parameters were passed to tools
- Whether tool execution succeeded or failed
- How many iterations the agent loop ran
- Token consumption per invocation
- State transformations at each step

## The Observability Stack

A production-grade observability system for agents includes:

**Tracing Layer**: Captures the complete execution path—every LLM call, tool invocation, and state transition. LangSmith provides this natively for LangGraph-based agents.

```python
from langsmith import trace
from langsmith.run_trees import RunTree

with trace("agent_execution", project_name="production"):
    result = agent.invoke(input_state, config=config)
```

**Metrics Layer**: Structured logging of operational metrics.

```python
import logging
from pythonjsonlogger import jsonlogger

logger = logging.getLogger()
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
handler.setFormatter(formatter)
logger.addHandler(handler)

def log_agent_step(agent_id: str, step: int, tool_name: str, tokens: int):
    logger.info("agent_step", extra={
        "agent_id": agent_id,
        "step": step,
        "tool_name": tool_name,
        "tokens_used": tokens
    })
```

**Alerting Layer**: Automated notifications for anomalies and failures.

```python
from datadog import initialize, api

def alert_on_high_error_rate():
    error_rate = metrics.get_error_rate(window="5m")
    if error_rate > 0.05:  # >5% error rate
        api.Event.create(title="High Agent Error Rate", text=f"Error rate: {error_rate}")
```

## Critical Metrics to Track

### Tool Execution Metrics

Track success/failure rates per tool. Different tools have different failure characteristics:
- API tools might timeout due to external service latency
- Database tools might fail due to permission issues
- Parsing tools might fail on malformed input

```python
def instrument_tool(tool_func):
    def wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = tool_func(*args, **kwargs)
            metrics.histogram("tool_duration_ms", 
                            (time.time() - start) * 1000,
                            tags=[f"tool:{tool_func.__name__}", "status:success"])
            return result
        except Exception as e:
            metrics.histogram("tool_duration_ms",
                            (time.time() - start) * 1000,
                            tags=[f"tool:{tool_func.__name__}", "status:error"])
            metrics.increment("tool_errors", tags=[f"tool:{tool_func.__name__}"])
            raise
    return wrapper
```

### Agent Loop Metrics

- **Iterations per task**: How many times does the agent loop before completing?
- **Branch rate**: What percentage of executions take the tool path vs. direct response?
- **Escalation rate**: How often does the agent escalate to human?

Healthy baseline: 80-90% of queries complete within 3 iterations, <2% escalation rate.

### Cost Metrics

Token usage is directly proportional to cost. Track:
- Tokens per task type
- Tokens per iteration
- Cost anomalies (tasks consuming 10x expected tokens)

```python
def track_token_usage(messages, response):
    input_tokens = llm.count_tokens(messages)
    output_tokens = llm.count_tokens(response)
    total_tokens = input_tokens + output_tokens
    
    cost = (input_tokens * 0.003 + output_tokens * 0.006) / 1000  # GPT-4o pricing
    
    metrics.gauge("tokens_per_task", total_tokens)
    metrics.gauge("cost_per_task", cost)
```

### Quality Metrics

Track outcomes: Did the agent solve the problem correctly? This requires a second-pass evaluation.

```python
def evaluate_agent_output(agent_output: str, ground_truth: str) -> float:
    # Use an LLM to score accuracy
    scorer_prompt = f"""
    Expected output: {ground_truth}
    Agent output: {agent_output}
    Rate accuracy 0-100."""
    
    score = int(llm.invoke(scorer_prompt).content)
    metrics.gauge("output_quality_score", score)
    return score
```

## Debugging Workflow

When agents fail, you need to reconstruct what happened:

**Step 1: Check Error Metrics**
```python
# Which tool failed?
failed_tool = metrics.query("tool_errors", time_range="5m").top(1)
# What was the error rate trend?
metrics.plot("tool_success_rate", tool_name=failed_tool)
```

**Step 2: Retrieve Trace**
```python
from langsmith import Client

client = Client()
run = client.read_run(run_id="specific_run")
# Inspect tool inputs/outputs
for child in run.child_runs:
    print(f"Tool: {child.name}")
    print(f"Input: {child.inputs}")
    print(f"Output: {child.outputs}")
```

**Step 3: Replay Execution**
```python
# Create minimal test case from trace
test_input = run.inputs
test_config = {"configurable": {"thread_id": run.extra["thread_id"]}}

# Re-run with same seed
result = agent.invoke(test_input, config=test_config)
```

**Step 4: Instrument Further**
Add debug logging around the failure point:

```python
def agent_node_with_debug(state: AgentState) -> AgentState:
    logger.debug(f"Agent state: {json.dumps(state, default=str)}")
    response = llm_with_tools.invoke(state["messages"])
    logger.debug(f"LLM response: {response}")
    if hasattr(response, "tool_calls"):
        logger.debug(f"Tool calls: {response.tool_calls}")
    return {"messages": [response]}
```

## Common Production Issues and Diagnostics

**Issue: Agent stuck in infinite loop**
- Diagnostic: Check `iteration_count` metric—if mode is >20, you have a loop problem
- Root cause: `should_continue` conditional returning wrong value, or tool never reaching termination condition
- Fix: Add explicit iteration limit, improve termination detection

**Issue: Tool calls with wrong parameters**
- Diagnostic: Examine tool invocation traces—do parameter types match schema?
- Root cause: LLM hallucinating parameter values not provided in context
- Fix: Add examples to system prompt, improve tool descriptions

**Issue: High latency for simple tasks**
- Diagnostic: Compare token usage to baseline—is context growing unexpectedly?
- Root cause: Message history accumulating without clearing, or tools returning verbose output
- Fix: Implement message summarization, truncate verbose tool responses

**Issue: Escalation rate creeping up**
- Diagnostic: Tag escalations by reason—confidence below threshold? Tool failed?
- Root cause: Model degradation, tool API changes, or threshold set too strict
- Fix: Retrain or fine-tune model, update tool integration, recalibrate thresholds

## Alerting Strategy

Implement a 3-tier alerting system:

**Tier 1: Immediate (Page On-Call)**
- Agent crash/uncaught exception
- Tool integration broken (100% failure rate)
- Cost anomaly (>$10 per task when baseline is $0.10)

**Tier 2: Important (Create Ticket)**
- Error rate >5%
- Escalation rate >10%
- Latency p95 >3x baseline

**Tier 3: Informational (Slack Notification)**
- New tool added/updated
- Model version changed
- Cost trending up (slow drift)

## Cost Optimization Through Observability

Observability reveals cost opportunities:

- **Token analysis**: If 95% of tokens are context window overhead, switch from GPT-4o to GPT-4-Turbo
- **Tool optimization**: If one tool consumes 40% of tokens, optimize its interface or caching
- **Pattern recognition**: If afternoon tasks cost 3x morning tasks, investigate data size correlation

One team reduced agent costs by 60% after discovering their reflection loop was running 5 iterations instead of 2 due to a misaligned confidence threshold.

## Implementation Roadmap

**Week 1**: Instrument LLM calls and tool execution—capture start/end times, tokens, errors
**Week 2**: Add state transition logging and cost tracking
**Week 3**: Set up dashboards for the 5 critical metrics above
**Week 4**: Implement alerting for top 3 error modes
**Month 2**: Add trace replay capability for debugging
**Month 3**: Implement automated root cause analysis

---

Observability is not optional for production agentic systems. Start monitoring before you have failures.


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
