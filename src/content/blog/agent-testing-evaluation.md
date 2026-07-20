---
title: 'Testing and Evaluating Agentic Systems: Benchmarks, Metrics, and Continuous Improvement'
description: 'Comprehensive guide to testing autonomous agents. Unit tests, integration tests, regression tests, and production monitoring.'
pubDate: '2026-08-05'
heroImage: '../../assets/blog-placeholder-4.jpg'
---

Testing agentic systems is harder than testing traditional software. Agents are probabilistic—the same input produces different outputs depending on temperature settings and random sampling. Success metrics are often qualitative ("Did it solve the problem?") rather than deterministic ("Does 2+2=4?").

Yet testing is essential. Deploying an untested agent to production is like shipping untested nuclear power plant code. The consequences scale with agent autonomy.

## Testing Pyramid for Agents

```
        ╱╲              Integration Tests (few, slow)
       ╱  ╲               - Full workflow tests
      ╱────╲              - Real tool interactions
     ╱      ╲
    ╱────────╲            Unit Tests (many, fast)
   ╱          ╲           - Tool execution
  ╱────────────╲          - Tool schema validation
 ╱              ╲         - Single-step agent operations
```

## Level 1: Unit Tests

Test individual components in isolation.

### Tool Testing

```python
import pytest

class TestSalesforceQuery:
    def test_valid_query_returns_structured_result(self):
        # Valid Salesforce ID
        result = query_salesforce("Account", "001D000000IZ3STAAQ")
        assert result["success"] == True
        assert "contact" in result["data"]
    
    def test_invalid_id_returns_error(self):
        # Invalid Salesforce ID format
        result = query_salesforce("Account", "INVALID")
        assert result["success"] == False
        assert "error" in result
    
    def test_timeout_returns_error(self, monkeypatch):
        # Simulate timeout
        def mock_timeout(*args, **kwargs):
            raise TimeoutError("Salesforce API timeout")
        
        monkeypatch.setattr("requests.get", mock_timeout)
        result = query_salesforce("Account", "001D000000IZ3STAAQ")
        assert result["success"] == False
    
    def test_output_size_bounded(self):
        # Ensure tool never returns huge output
        result = query_salesforce("Account", "001D000000IZ3STAAQ", limit=1000)
        output_size = len(json.dumps(result))
        assert output_size < 50000  # 50KB max
```

### Tool Schema Validation

```python
from pydantic import ValidationError

def test_tool_schema_validation():
    """Verify tools reject invalid inputs"""
    
    tools = [transfer_funds, query_database, send_email]
    
    for tool in tools:
        input_schema = tool.args_schema
        
        # Test with empty input
        with pytest.raises(ValidationError):
            input_schema()
        
        # Test with wrong types
        bad_inputs = [
            {"amount": "not_a_number"},
            {"recipient": 12345},
            {"query": None}
        ]
        
        for bad_input in bad_inputs:
            with pytest.raises(ValidationError):
                input_schema(**bad_input)
```

## Level 2: Integration Tests

Test agent workflows with real tools (or mocked).

### Single-Tool Workflows

```python
@pytest.mark.asyncio
async def test_customer_lookup_workflow():
    """Test: Look up customer by name, return contact info"""
    
    # Mock Salesforce API
    mock_salesforce_response = {
        "success": True,
        "data": {
            "id": "001D000000IZ3STAAQ",
            "name": "Acme Corp",
            "email": "contact@acme.com"
        }
    }
    
    with patch("salesforce.query", return_value=mock_salesforce_response):
        state = {"messages": [HumanMessage(content="Find Acme Corp")]}
        result = await agent.invoke(state)
        
        assert "Acme Corp" in result["messages"][-1].content
        assert "contact@acme.com" in result["messages"][-1].content
```

### Multi-Tool Workflows

```python
@pytest.mark.asyncio
async def test_order_creation_workflow():
    """Test: Find customer, check inventory, create order"""
    
    mock_salesforce_response = {"success": True, "data": {"id": "cust123"}}
    mock_inventory_response = {"success": True, "available": 50}
    mock_order_response = {"success": True, "order_id": "ord456"}
    
    with patch("salesforce.query", return_value=mock_salesforce_response), \
         patch("inventory.check", return_value=mock_inventory_response), \
         patch("orders.create", return_value=mock_order_response) as mock_create:
        
        state = {"messages": [HumanMessage(
            content="Create order for Acme Corp, 20 units of SKU-123"
        )]}
        
        result = await agent.invoke(state)
        
        # Verify order was created
        assert mock_create.called
        
        # Verify correct quantity
        call_args = mock_create.call_args
        assert call_args[1]["quantity"] == 20
```

### Error Handling Tests

```python
@pytest.mark.asyncio
async def test_agent_retries_on_timeout():
    """Test: Agent retries when tool times out"""
    
    # First call times out, second succeeds
    responses = [
        TimeoutError("Timeout"),
        {"success": True, "data": {"id": "cust123"}}
    ]
    
    with patch("salesforce.query", side_effect=responses):
        state = {"messages": [HumanMessage(content="Find customer X")]}
        result = await agent.invoke(state)
        
        # Should have succeeded despite timeout
        assert result["messages"][-1].content  # Has response
```

## Level 3: Regression Testing

Prevent previously-fixed bugs from reoccurring.

```python
# regression_tests.json
{
  "tests": [
    {
      "name": "Does not send to internal emails",
      "input": "Send email to john@company.com",
      "should_reject": True,
      "reason": "Internal addresses should not receive external emails"
    },
    {
      "name": "Hallucinates valid database IDs",
      "input": "Query customer ID FAKE-12345",
      "should_fail": True,
      "reason": "Agent should not accept arbitrary customer IDs"
    },
    {
      "name": "Handles API errors gracefully",
      "input": "Check status of order X", 
      "expected_behavior": "Retry or suggest alternative",
      "should_not": "Crash or return raw error"
    }
  ]
}

async def run_regression_tests():
    """Run tests from regression suite"""
    
    with open("regression_tests.json") as f:
        tests = json.load(f)["tests"]
    
    results = []
    for test in tests:
        try:
            result = await agent.invoke({"messages": [HumanMessage(test["input"])]})
            
            if test.get("should_reject"):
                passed = "error" in result or "cannot" in result.lower()
            elif test.get("should_fail"):
                passed = False  # Test name suggests it should fail
            else:
                passed = test["expected_behavior"] in result
            
            results.append({
                "name": test["name"],
                "passed": passed,
                "reason": test.get("reason")
            })
        except Exception as e:
            results.append({
                "name": test["name"],
                "passed": False,
                "error": str(e)
            })
    
    return results
```

## Level 4: Benchmark Testing

Measure performance on standard tasks.

### Custom Benchmark Dataset

```python
class AgentBenchmark:
    def __init__(self):
        self.dataset = [
            {
                "task": "Retrieve customer order history",
                "input": "Show me all orders for customer john@example.com",
                "expected_tools": ["query_salesforce"],
                "expected_fields": ["order_id", "date", "total"],
                "max_tokens": 5000,
                "max_iterations": 3
            },
            {
                "task": "Create follow-up task",
                "input": "Create a reminder for tomorrow to follow up with Acme Corp",
                "expected_tools": ["create_task"],
                "should_succeed": True,
                "max_tokens": 3000
            },
            # ... more test cases
        ]
    
    async def run_benchmark(self, agent):
        """Run agent on all test cases, measure performance"""
        
        results = []
        for test in self.dataset:
            start = time.time()
            
            result = await agent.invoke({
                "messages": [HumanMessage(content=test["input"])],
                "max_iterations": test["max_iterations"]
            })
            
            elapsed = time.time() - start
            token_used = count_tokens(str(result))
            
            # Grade the result
            grade = self.grade_result(result, test)
            
            results.append({
                "task": test["task"],
                "success": grade["success"],
                "latency_s": elapsed,
                "tokens_used": tokens_used,
                "iterations": result.get("iterations"),
                "feedback": grade["feedback"]
            })
        
        return results
    
    def grade_result(self, result, expected):
        """Grade agent output against expectations"""
        
        success = True
        feedback = []
        
        # Check tools used
        tools_used = result.get("tools_called", [])
        for tool in expected["expected_tools"]:
            if tool not in tools_used:
                success = False
                feedback.append(f"Missing tool: {tool}")
        
        # Check response contains expected fields
        response_text = str(result["messages"][-1])
        for field in expected.get("expected_fields", []):
            if field not in response_text:
                success = False
                feedback.append(f"Missing field in response: {field}")
        
        # Check constraints
        if result.get("tokens_used", 0) > expected.get("max_tokens", float('inf')):
            success = False
            feedback.append(f"Token limit exceeded")
        
        return {"success": success, "feedback": feedback}
```

## Level 5: Production Testing

Monitor agent performance in the wild.

### Canary Deployment

```python
def canary_deployment(new_model, baseline_model, traffic_percentage=0.1):
    """Route small percentage of traffic to new model"""
    
    metrics_new = {"success": 0, "fail": 0, "tokens": 0, "latency": []}
    metrics_baseline = {"success": 0, "fail": 0, "tokens": 0, "latency": []}
    
    for interaction in get_production_traffic(10000):  # 10K interactions
        if random.random() < traffic_percentage:
            # Route to new model
            model = new_model
            metrics = metrics_new
        else:
            # Route to baseline
            model = baseline_model
            metrics = metrics_baseline
        
        try:
            start = time.time()
            result = model.invoke(interaction)
            elapsed = time.time() - start
            
            metrics["success"] += 1
            metrics["tokens"] += count_tokens(result)
            metrics["latency"].append(elapsed)
        except Exception as e:
            metrics["fail"] += 1
            logger.error(f"Error: {e}")
    
    # Compare metrics
    new_success_rate = metrics_new["success"] / (metrics_new["success"] + metrics_new["fail"])
    baseline_success_rate = metrics_baseline["success"] / (metrics_baseline["success"] + metrics_baseline["fail"])
    
    if new_success_rate > baseline_success_rate * 1.05:  # 5% improvement threshold
        logger.info(f"New model wins: {new_success_rate:.1%} vs {baseline_success_rate:.1%}")
        return True
    else:
        logger.info(f"Baseline wins: {baseline_success_rate:.1%} vs {new_success_rate:.1%}")
        return False
```

### Key Metrics to Monitor

```python
metrics_to_track = {
    "task_completion_rate": "% of tasks successfully completed",
    "human_escalation_rate": "% requiring human intervention",
    "average_latency": "Mean time to completion (seconds)",
    "p95_latency": "95th percentile latency (seconds)",
    "token_usage": "Average tokens per task",
    "cost_per_task": "Average LLM cost per task",
    "error_rate": "% of tasks ending in error",
    "tool_success_rate": "% of tool calls succeeding",
    "user_satisfaction": "NPS or CSAT score"
}
```

## CI/CD Integration

```yaml
# .github/workflows/agent-test.yml
name: Agent Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt pytest pytest-asyncio
      
      - name: Run unit tests
        run: pytest tests/unit -v
      
      - name: Run integration tests
        run: pytest tests/integration -v -m "not slow"
      
      - name: Run regression tests
        run: python -m regression_tests
      
      - name: Run benchmarks
        run: python -m benchmark_agent --model gpt-4o --baseline-model gpt-3.5-turbo
      
      - name: Check performance regressions
        run: python scripts/check_metrics.py --threshold 0.1
        # Fail if performance drops >10%
```

## Continuous Improvement Loop

```python
async def continuous_improvement():
    """Automated loop for agent improvement"""
    
    while True:
        # Collect metrics from production
        metrics = collect_production_metrics()
        
        # Identify failure patterns
        failures = analyze_failures(metrics)
        
        # Generate training data from failures
        training_data = failures_to_training_data(failures)
        
        # Fine-tune model on failures
        if len(training_data) > 100:
            new_model = finetune_model(model, training_data)
            
            # Test new model
            if await canary_deployment(new_model, baseline_model):
                logger.info("Deploying improved model")
                deploy_model(new_model)
        
        # Weekly cycle
        await asyncio.sleep(7 * 86400)
```

---

Testing agentic systems requires discipline and structure. Build comprehensive tests before deploying to production. Your future debugging sessions will thank you.
