---
title: 'Fine-Tuning Language Models for Improved Agent Behavior'
description: 'When and how to fine-tune LLMs to improve agent tool use, reasoning, and task completion rates. Practical guidance with ROI analysis.'
pubDate: '2026-08-09'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

Fine-tuning LLMs for agentic systems remains underexplored despite significant potential gains. Many teams assume frontier models like GPT-4o are "good enough," missing opportunities to dramatically improve agent performance through targeted fine-tuning.

## When Fine-Tuning Is Worth It

Fine-tuning is valuable when:

**1. Tool Use Accuracy**: Your agents frequently misuse tools (wrong parameters, hallucinated values)
**2. Domain Specificity**: Your agent operates in specialized domain (medical, legal, finance) where generic knowledge fails
**3. Prompt Sensitivity**: Small prompt changes dramatically change behavior (indicating the model hasn't internalized patterns)
**4. Cost Sensitivity**: Your deployment requires 1000s of daily inference—cheaper fine-tuned models become economical

Fine-tuning is NOT worth it when:

- Agent failure is due to tool design (fix tools first)
- You have <100 examples of ground truth behavior
- Latency constraints prevent offline fine-tuning
- Generic model performance is already >85% on your task

## Fine-Tuning Strategies for Agents

### Strategy 1: Tool Use Consistency

**Problem**: Agent hallucinates tool parameters. Example: Calls `transfer_funds(amount="$500")` instead of `transfer_funds(amount=500)`.

**Solution**: Fine-tune on correct tool invocation patterns.

```python
# Training data: pairs of (context, correct_tool_call)
training_examples = [
    {
        "instruction": "Transfer $500 to account john_doe",
        "correct_response": '{"tool": "transfer_funds", "params": {"amount": 500, "recipient": "john_doe"}}'
    },
    {
        "instruction": "Query sales data for Q3 2026",
        "correct_response": '{"tool": "database_query", "params": {"query": "SELECT * FROM sales WHERE quarter=3 AND year=2026", "limit": 1000}}'
    },
    # ... 100+ more examples
]

# Use OpenAI fine-tuning API
import openai

formatted_training = [{
    "messages": [
        {"role": "system", "content": "You are an agent that selects and invokes tools correctly."},
        {"role": "user", "content": ex["instruction"]},
        {"role": "assistant", "content": ex["correct_response"]}
    ]
} for ex in training_examples]

job = openai.FineTuningJob.create(
    training_file=upload_file(formatted_training),
    model="gpt-3.5-turbo",
    hyperparameters={"n_epochs": 3}
)
```

**Expected improvement**: 10-30% reduction in tool misuse errors
**Cost**: ~$500-$2000 for fine-tuning, $0.20 per 1K inference tokens (vs $0.30 for GPT-4o)

### Strategy 2: Reasoning Chain Consistency

**Problem**: Agent reasoning is inconsistent, leading to poor tool selection.

**Solution**: Fine-tune on chains-of-thought examples.

```python
training_examples = [
    {
        "user_query": "Find all customers with unpaid invoices over $10K and send them a reminder",
        "reasoning_chain": """
I need to:
1. Query for customers with unpaid invoices > $10K
2. For each customer, draft a reminder email
3. Send the email via the email tool

First, I'll search the database.""",
        "first_action": '{"tool": "query_database", "params": {"query": "SELECT customer_id, email, invoice_total FROM invoices WHERE status=unpaid AND invoice_total > 10000"}}'
    },
    # ... more examples
]
```

**Expected improvement**: 15-25% improvement in task completion rate
**Cost**: $1000-$3000 for fine-tuning

### Strategy 3: Error Recovery

**Problem**: When agents encounter errors, they give up instead of retrying or using alternative tools.

**Solution**: Fine-tune on error recovery patterns.

```python
training_examples = [
    {
        "context": "User asked to fetch customer by ID. First attempt failed with 'Connection timeout'.",
        "recovery_action": '{"tool": "query_database", "params": {"query": "SELECT * FROM customers WHERE id=12345"}, "retry_count": 2}'
    },
    {
        "context": "API call failed with '401 Unauthorized'. Should authenticate.",
        "recovery_action": '{"tool": "refresh_api_token", "params": {}}, then retry'
    },
]
```

**Expected improvement**: 20-40% fewer escalations to human
**Cost**: $500-$1500 for fine-tuning

## Data Collection for Fine-Tuning

The quality of training data determines fine-tuning success.

**Step 1: Collect Logs**
Run your agent system without fine-tuning for 1-2 months. Collect every interaction:
- User input
- Agent reasoning
- Tool calls made
- Tool results
- Final outcome (success/failure)

```python
def log_agent_interaction(interaction: dict):
    """Log each agent step"""
    logger.info("agent_interaction", extra={
        "user_input": interaction["input"],
        "agent_steps": interaction["steps"],
        "tools_called": interaction["tools_called"],
        "success": interaction["success"],
        "outcome": interaction["outcome"]
    })
```

**Step 2: Filter for Ground Truth**
Identify interactions where the outcome was clearly correct or incorrect:
- Correct: Task completed successfully, user confirmed
- Incorrect: Task failed, user escalated, or manual correction needed
- Ambiguous: Borderline cases—exclude for now

```python
def filter_ground_truth(logs, threshold=0.9):
    ground_truth = []
    for log in logs:
        if log["success"] and log.get("user_rating", 1.0) >= threshold:
            ground_truth.append(log)  # Positive example
        elif not log["success"] and log.get("required_escalation"):
            ground_truth.append(log)  # Negative example
    return ground_truth
```

**Step 3: Format Training Pairs**
Convert logs into training format:

```python
def format_training_data(logs):
    formatted = []
    for log in logs:
        formatted.append({
            "messages": [
                {"role": "system", "content": "You are an autonomous agent..."},
                {"role": "user", "content": log["user_input"]},
                {"role": "assistant", "content": format_agent_response(log["agent_steps"])}
            ]
        })
    return formatted
```

**Step 4: Validation Split**
Reserve 20% of data for validation:

```python
train_data = ground_truth[:-0.2*len(ground_truth)]
val_data = ground_truth[-0.2*len(ground_truth):]
```

## Fine-Tuning Workflow in Production

```python
# 1. Collect data over 4-6 weeks
# 2. Filter ground truth (should be 300+ examples minimum)
# 3. Format training data
# 4. Submit fine-tuning job
# 5. Test on validation set
# 6. Measure improvement vs baseline
# 7. A/B test in production
# 8. If >10% improvement, roll out

import openai
from datetime import datetime

class FineTuningPipeline:
    def __init__(self):
        self.client = openai.OpenAI()
    
    def train_new_version(self, training_data, val_data):
        # Upload training file
        with open("training_data.jsonl", "w") as f:
            for example in training_data:
                f.write(json.dumps(example) + "\n")
        
        training_file = self.client.files.create(
            file=open("training_data.jsonl", "rb"),
            purpose="fine-tune"
        )
        
        # Start fine-tuning job
        job = self.client.fine_tuning.jobs.create(
            training_file=training_file.id,
            model="gpt-3.5-turbo",
            hyperparameters={
                "n_epochs": 3,
                "learning_rate_multiplier": 1.0
            }
        )
        
        print(f"Fine-tuning job started: {job.id}")
        
        # Wait for completion
        while job.status not in ["succeeded", "failed"]:
            job = self.client.fine_tuning.jobs.retrieve(job.id)
            print(f"Status: {job.status}")
            time.sleep(30)
        
        if job.status == "failed":
            print(f"Job failed: {job.error}")
            return None
        
        model_id = job.fine_tuned_model
        
        # Evaluate on validation set
        accuracy = self.evaluate_model(model_id, val_data)
        print(f"Validation accuracy: {accuracy:.1%}")
        
        return model_id
    
    def evaluate_model(self, model_id, val_data):
        correct = 0
        for example in val_data:
            response = self.client.chat.completions.create(
                model=model_id,
                messages=example["messages"][:-1]  # Exclude ground truth
            )
            predicted = response.choices[0].message.content
            expected = example["messages"][-1]["content"]
            
            if self.compare_tool_calls(predicted, expected):
                correct += 1
        
        return correct / len(val_data)
    
    def ab_test_in_production(self, baseline_model, finetuned_model, traffic_split=0.1):
        """Run A/B test with 10% of traffic on fine-tuned model"""
        for i in range(10000):  # Run 10K interactions
            if random.random() < traffic_split:
                # Use fine-tuned model
                result = run_agent_with_model(finetuned_model)
            else:
                # Use baseline
                result = run_agent_with_model(baseline_model)
            
            log_ab_test_result(result)
        
        # Analyze results
        baseline_metrics = analyze_metrics("baseline")
        finetuned_metrics = analyze_metrics("finetuned")
        
        print(f"Baseline accuracy: {baseline_metrics['accuracy']:.1%}")
        print(f"Fine-tuned accuracy: {finetuned_metrics['accuracy']:.1%}")
        print(f"Improvement: {finetuned_metrics['accuracy'] - baseline_metrics['accuracy']:.1%}")
```

## ROI of Fine-Tuning

**Costs**:
- Data collection and labeling: 40 hours × $100/hour = $4,000
- Fine-tuning compute: ~$2,000
- A/B testing infrastructure: ~$1,000
- **Total: ~$7,000**

**Benefits** (for 10K queries/day agent):
- Tool misuse reduced 20% → 2K fewer failures/day
- Each failure costs $5 (human intervention) → $10K/day saved
- Or: task completion improved from 75% to 85% → 1K more successful tasks/day at $50 revenue each = $50K/day gain
- Monthly benefit: ~$300K-$1.5M

**ROI: 4,300%-21,400%** (breaks even in hours, not months)

The key: fine-tuning pays for itself immediately when you have volume.

## Best Practices

1. **Start with classification tasks** (tool selection, routing) before full agentic fine-tuning
2. **Use multi-step examples**, not just single-turn interactions
3. **Include failure cases** in training to teach recovery
4. **Monitor for drift**: fine-tuned models sometimes degrade on unrelated tasks
5. **Version your models**: keep baseline available for rollback
6. **Periodic retraining**: new patterns emerge monthly; refresh fine-tuning quarterly

---

Fine-tuning isn't a one-time investment—it's an ongoing capability. Organizations fine-tuning agents continuously improve in 2026 while those using only off-the-shelf models plateau quickly.


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
