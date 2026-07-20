---
title: 'LangGraph Agent Patterns: Building Production-Ready Autonomous Systems'
description: 'Practical patterns for building scalable agents with LangGraph including ReAct, planning, reflection, and multi-agent supervision.'
pubDate: '2026-08-14'
heroImage: '../../assets/blog-placeholder-2.jpg'
---

LangGraph has emerged as the standard orchestration framework for agentic AI in enterprise deployments. Unlike higher-level abstractions that hide complexity, LangGraph provides explicit control over agent state, tool execution, and decision routing—exactly what production systems require.

## Why LangGraph for Enterprise Agents?

Several factors make LangGraph the preferred choice for production agentic systems:

**Explicit Control**: You control every node transition and state transformation. No magic happens behind the scenes.

**Checkpointing**: Native support for persisting agent state to PostgreSQL or other backends enables human-in-the-loop workflows and recovery from failures.

**Streaming**: Agents can stream tool results, reasoning steps, and final outputs in real-time to clients.

**Debugging**: Full observability into agent execution makes diagnosing failures straightforward.

## Pattern 1: ReAct (Reasoning + Acting)

ReAct is the foundational pattern: the agent alternates between reasoning steps and tool invocations.

```python
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict, Annotated
from langgraph.graph import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    iteration: int

def agent_reasoning(state: AgentState) -> AgentState:
    # LLM generates thought and tool call
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    # Check for tool_calls in the response
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    return END

# Build the graph
workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_reasoning)
workflow.add_node("tools", ToolNode(tools))
workflow.add_edge("tools", "agent")
workflow.add_conditional_edges("agent", should_continue)
workflow.set_entry_point("agent")

app = workflow.compile()
```

**When to use ReAct**: Data retrieval tasks where you need to fetch information, transform it, and present results. Example: "Find all customers in APAC region with ARR > $100K and generate a report."

**Trade-offs**: ReAct minimizes hallucinations by grounding every claim in observed tool results. However, context windows grow with each iteration. For 10-step workflows, you can consume 100K+ tokens easily.

## Pattern 2: Planning with Execution Separation

For complex workflows, separate planning from execution:

```python
class PlanningState(TypedDict):
    goal: str
    plan: list[str]
    current_step_index: int
    step_results: list

def planner_node(state: PlanningState) -> PlanningState:
    # Generate multi-step plan
    plan_prompt = f"""Given the goal: {state['goal']}
    Generate a step-by-step plan. Return as numbered list."""
    
    plan_text = llm.invoke(plan_prompt).content
    steps = [s.strip() for s in plan_text.split('\n') if s.strip()]
    
    return {"plan": steps, "current_step_index": 0}

def executor_node(state: PlanningState) -> PlanningState:
    if state["current_step_index"] >= len(state["plan"]):
        return state
    
    current_step = state["plan"][state["current_step_index"]]
    result = llm_with_tools.invoke(current_step)
    
    updated_results = state.get("step_results", []) + [result]
    return {
        "current_step_index": state["current_step_index"] + 1,
        "step_results": updated_results
    }

def should_continue_execution(state: PlanningState) -> str:
    if state["current_step_index"] < len(state["plan"]):
        return "executor"
    return END
```

**When to use**: Projects requiring explicit approval or human visibility into planned steps. The plan is visible upfront, allowing stakeholders to intervene before execution begins.

**Trade-offs**: Static planning fails if the environment changes mid-execution. If step 3 fails and you need to revise steps 4-5, a static plan becomes obsolete. Use with structured domains where plans are unlikely to need revision.

## Pattern 3: Reflection and Self-Critique

Reflection pattern adds a quality gate after agent output:

```python
class ReflectionState(TypedDict):
    task: str
    draft: str
    feedback: str
    iterations: int

def generator_node(state: ReflectionState) -> ReflectionState:
    if state["iterations"] == 0:
        # Initial generation
        response = llm.invoke(f"Complete this task: {state['task']}")
        return {"draft": response.content, "iterations": 1}
    else:
        # Revision based on feedback
        revision_prompt = f"""Original task: {state['task']}
        Previous feedback: {state['feedback']}
        Generate improved response."""
        
        revised = llm.invoke(revision_prompt).content
        return {"draft": revised, "iterations": state["iterations"] + 1}

def reflector_node(state: ReflectionState) -> ReflectionState:
    reflection_prompt = f"""Critique this work: {state['draft']}
    Identify 3 strengths and 3 improvements needed."""
    
    feedback = llm.invoke(reflection_prompt).content
    return {"feedback": feedback}

def should_revise(state: ReflectionState) -> str:
    # Stop after 3 iterations or if feedback is positive
    if state["iterations"] >= 3:
        return END
    if "excellent" in state["feedback"].lower():
        return END
    return "generate"
```

**When to use**: Content generation, code review, technical writing where quality matters more than latency.

**Trade-offs**: 2-3x higher token costs due to multiple LLM invocations. Only justified when output quality directly impacts business outcomes.

## Pattern 4: Multi-Agent Supervision

For tasks requiring different expertise, use a supervisor pattern:

```python
class SupervisorState(TypedDict):
    task: str
    agents_output: dict
    current_agent: str
    completed: bool

def supervisor_node(state: SupervisorState) -> SupervisorState:
    # Determine which agent should handle this
    routing_prompt = f"""Task: {state['task']}
    Available agents: researcher, writer, reviewer
    Which agent should handle this next? Return only the agent name."""
    
    agent_choice = llm.invoke(routing_prompt).content.strip().lower()
    
    if agent_choice == "done":
        return {"completed": True}
    
    return {"current_agent": agent_choice}

def run_agent(state: SupervisorState) -> SupervisorState:
    agent_name = state["current_agent"]
    agent_graphs = {
        "researcher": research_agent,
        "writer": writing_agent,
        "reviewer": review_agent
    }
    
    result = agent_graphs[agent_name].invoke({"task": state["task"]})
    
    updated_output = state.get("agents_output", {})
    updated_output[agent_name] = result
    
    return {"agents_output": updated_output}
```

**When to use**: Complex projects spanning research, content creation, and quality assurance. Each agent can be optimized for its domain.

**Trade-offs**: Coordination overhead increases latency significantly. A 3-step workflow might take 30-60 seconds total execution time. Only viable for async use cases.

## Pattern 5: Human-in-the-Loop with Interrupts

LangGraph's interrupt capability enables human-in-the-loop workflows:

```python
from langgraph.checkpoint.postgres import PostgresSaver

checkpointer = PostgresSaver(DATABASE_URL)

# Compile with interrupt before tools
app = workflow.compile(
    checkpointer=checkpointer,
    interrupt_before=["tools"]  # Stop before executing tools
)

# Usage: agent runs up to tool execution, then pauses
config = {"configurable": {"thread_id": "user-session-123"}}
result = app.invoke({"messages": [HumanMessage(content=user_input)]}, config=config)

# Human reviews and approves
# Later: resume execution
app.invoke(None, config=config)  # Resumes from interrupt point
```

**When to use**: High-risk operations (transferring funds, deleting data) where human approval is mandatory.

**Trade-offs**: Adds operational overhead. Humans must actively monitor and approve, which limits throughput. Use only for critical operations.

## Best Practices for Production LangGraph Agents

**1. Tool Design**: Define tools with precise schemas. Ambiguous tool descriptions cause agents to misuse them.

```python
from pydantic import BaseModel, Field

class QueryInput(BaseModel):
    sql_query: str = Field(description="Valid SQL SELECT query")
    limit: int = Field(default=10, description="Max rows to return")
```

**2. Error Handling**: Tools should return structured errors, not raise exceptions.

```python
def database_query(query: str) -> str:
    try:
        result = db.execute(query)
        return json.dumps({"status": "success", "data": result})
    except Exception as e:
        return json.dumps({"status": "error", "reason": str(e)})
```

**3. Cost Monitoring**: Track token usage per agent run and alert on anomalies.

```python
def log_metrics(state: AgentState) -> AgentState:
    token_count = llm.count_tokens(state["messages"])
    logger.info(f"tokens_used={token_count}, iteration={state['iteration']}")
    return state
```

**4. Timeout Handling**: Always set maximum iterations to prevent infinite loops.

```python
def should_continue(state: AgentState) -> str:
    if state["iteration"] >= 15:  # Max 15 steps
        return END
    # ... rest of routing logic
```

## Migration Path from v0.1 to Modern LangGraph

If you're using older LangGraph versions, the migration involves:

- Replace `AgentExecutor` with explicit StateGraph
- Move from implicit message handling to explicit `add_messages` reducer
- Migrate checkpointing to PostgresSaver for production persistence
- Update tool definitions to use Pydantic v2

## Performance Benchmarks (Tested on GPT-4o)

| Pattern | Avg Latency | Tokens/Task | Cost |
|---------|-------------|-------------|------|
| Simple Tool Use | 2s | 2K | $0.01 |
| ReAct (3 steps avg) | 8s | 8K | $0.04 |
| Planning + Execution | 15s | 15K | $0.08 |
| Reflection (2 iterations) | 20s | 20K | $0.10 |
| Multi-Agent Supervisor | 45s | 50K | $0.25 |

These numbers assume moderate complexity. Simple retrieval tasks perform much better; complex reasoning tasks worse.

## Conclusion

LangGraph patterns provide the scaffolding for building reliable, observable, production-grade agents. The key is choosing the right pattern for your use case and maintaining disciplined tool design. Most production failures stem not from LangGraph issues but from poorly specified tools and uncontrolled token growth.

Start with ReAct for 80% of use cases. Add reflection only if output quality is critical. Use multi-agent patterns only when domain complexity genuinely requires specialization.

---

## Resources

- LangGraph Documentation: https://langchain-ai.github.io/langgraph/
- Production Patterns Guide: https://python.langchain.com/docs/agents
- LangSmith for Evaluation: https://docs.smith.langchain.com
