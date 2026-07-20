---
title: 'Memory Systems for Agentic AI: Short-term, Long-term, and Episodic Memory'
description: 'Designing scalable memory architectures for agents that learn and adapt. Implementation patterns for different memory types.'
pubDate: '2026-08-07'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

Agents without memory are fundamentally limited. They cannot learn from past mistakes, cannot maintain continuity across sessions, and cannot personalize behavior. Yet most production agents today operate stateless—each interaction starts from zero context.

## Three Memory Types

**Short-term Memory**: The current session context. Active conversation state, recent tool results, current goal. Stored in application memory or message history.

**Long-term Memory**: User preferences, learned patterns, and domain knowledge accumulated over time. Stored in vector databases or knowledge graphs.

**Episodic Memory**: Specific past interactions and their outcomes. "Last time this user did X, they failed; this time they want Y." Used for decision-making and error recovery.

## Pattern 1: Short-Term Memory with Message History

Simplest pattern: maintain full message history within session.

```python
from typing_extensions import TypedDict, Annotated
from langgraph.graph import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    current_goal: str
    iteration: int

def update_messages(state: AgentState, new_messages: list) -> AgentState:
    """Append new messages to history"""
    return {"messages": state["messages"] + new_messages}
```

**Limitation**: Context window fills quickly. With each tool result, you accumulate tokens. After 10-15 tool calls, context is consumed.

**Optimization**: Summarize old messages when context gets full.

```python
def maybe_summarize_messages(state: AgentState, context_threshold: int = 6000) -> AgentState:
    """Summarize old messages if context getting full"""
    
    current_tokens = sum(count_tokens(msg["content"]) for msg in state["messages"])
    
    if current_tokens > context_threshold:
        # Summarize first half of messages
        to_summarize = state["messages"][:len(state["messages"])//2]
        rest = state["messages"][len(state["messages"])//2:]
        
        summary_prompt = f"Summarize this conversation in 2-3 sentences:\n{json.dumps(to_summarize)}"
        summary = llm.invoke(summary_prompt).content
        
        new_messages = [
            {"role": "system", "content": f"Earlier conversation: {summary}"},
            *rest
        ]
        
        return {"messages": new_messages}
    
    return state
```

## Pattern 2: Long-Term Memory with Vector Storage

Store learned preferences and patterns in vector DB for retrieval:

```python
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

class LongTermMemory:
    def __init__(self, pinecone_index: str):
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index = self.pc.Index(pinecone_index)
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
    
    def store_memory(self, user_id: str, memory_text: str, memory_type: str):
        """Store learned fact about user"""
        
        # Embed memory
        embedding = self.encoder.encode(memory_text).tolist()
        
        # Store with metadata
        self.index.upsert(
            vectors=[{
                "id": f"{user_id}#{uuid.uuid4()}",
                "values": embedding,
                "metadata": {
                    "user_id": user_id,
                    "text": memory_text,
                    "type": memory_type,  # preference, pattern, constraint
                    "timestamp": datetime.now().isoformat()
                }
            }]
        )
    
    def retrieve_memories(self, user_id: str, query: str, top_k: int = 5) -> list:
        """Retrieve relevant memories for current context"""
        
        query_embedding = self.encoder.encode(query).tolist()
        
        results = self.index.query(
            vector=query_embedding,
            filter={"user_id": {"$eq": user_id}},
            top_k=top_k,
            include_metadata=True
        )
        
        return [match["metadata"]["text"] for match in results["matches"]]
    
    def update_preferences(self, user_id: str, observation: str):
        """Learn user preferences from interaction"""
        
        # Example observations:
        # "User prefers morning meetings at 9am"
        # "User never uses feature X"
        # "User gets confused by format Y, prefers format Z"
        
        self.store_memory(user_id, observation, "preference")

# Usage in agent
memory = LongTermMemory("user-memories")

def agent_with_memory(state: AgentState, user_id: str):
    # Retrieve relevant memories
    current_task = state["messages"][-1]["content"]
    memories = memory.retrieve_memories(user_id, current_task)
    
    # Inject into context
    if memories:
        memory_context = "Relevant past information about this user:\n" + "\n".join(
            f"- {m}" for m in memories
        )
        state["messages"].append({
            "role": "system",
            "content": memory_context
        })
    
    # Run agent normally
    response = llm_with_tools.invoke(state["messages"])
    
    # Learn from this interaction
    if response.successful:
        key_insight = extract_insight(state, response)
        memory.store_memory(user_id, key_insight, "pattern")
    
    return response
```

## Pattern 3: Episodic Memory for Error Recovery

Store specific past episodes to guide future decisions:

```python
class EpisodicMemory:
    def __init__(self, db_url: str):
        self.db = create_db_connection(db_url)
    
    def record_episode(self, user_id: str, goal: str, actions: list, outcome: str, lesson: str):
        """Store complete interaction episode"""
        
        self.db.execute("""
        INSERT INTO episodes (user_id, goal, actions, outcome, lesson, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, goal, json.dumps(actions), outcome, lesson, datetime.now()))
    
    def find_similar_episodes(self, user_id: str, current_goal: str, limit: int = 3):
        """Find past episodes similar to current situation"""
        
        # Could use vector search, or simple similarity on goal keywords
        results = self.db.execute("""
        SELECT goal, actions, outcome, lesson FROM episodes
        WHERE user_id = ? AND outcome = 'failed'
        ORDER BY similarity(goal, ?) DESC
        LIMIT ?
        """, (user_id, current_goal, limit))
        
        return results.fetchall()
    
    def learn_from_failure(self, user_id: str, goal: str, actions: list, error: str):
        """Extract lesson from failure"""
        
        # Use LLM to generate lesson
        lesson_prompt = f"""
        This agent tried to accomplish: {goal}
        Steps taken: {json.dumps(actions)}
        Failure: {error}
        
        What lesson should be learned to avoid this failure in future?
        (Keep to 1-2 sentences)
        """
        
        lesson = llm.invoke(lesson_prompt).content
        
        self.record_episode(user_id, goal, actions, "failed", lesson)
        
        return lesson

# Usage during agent execution
episodes = EpisodicMemory("postgresql://...")

def agent_with_recovery(state: AgentState, user_id: str):
    goal = state["current_goal"]
    
    # Check for similar past failures
    past_failures = episodes.find_similar_episodes(user_id, goal)
    
    if past_failures:
        # Inject lessons into context
        lessons = [f"- {ep[3]}" for ep in past_failures]
        state["messages"].append({
            "role": "system",
            "content": f"Lessons from past attempts:\n{chr(10).join(lessons)}"
        })
    
    # Execute agent
    result = run_agent_step(state)
    
    # If failed, learn
    if not result.success:
        lesson = episodes.learn_from_failure(
            user_id, goal,
            result.actions_taken,
            result.error
        )
        logger.info(f"Learned lesson: {lesson}")
```

## Pattern 4: Hierarchical Memory

For complex domains, organize memory hierarchically:

```python
class HierarchicalMemory:
    """
    Taxonomy:
    - User Level
      - Preferences (never share this, always encrypt)
      - History (past interactions)
    - Domain Level
      - Patterns (credit card fraud indicators)
      - Rules (regulatory constraints)
    - Global Level
      - Facts (business information)
      - Capabilities (what tools exist)
    """
    
    def __init__(self):
        self.user_memory = {}
        self.domain_memory = {}
        self.global_memory = {}
    
    def store_hierarchical(self, level: str, key: str, value: dict):
        if level == "user":
            self.user_memory[key] = value
        elif level == "domain":
            self.domain_memory[key] = value
        elif level == "global":
            self.global_memory[key] = value
    
    def retrieve_for_context(self, user_id: str, domain: str) -> dict:
        """Gather all relevant memory for an agent invocation"""
        
        context = {
            "user": self.user_memory.get(user_id, {}),
            "domain": self.domain_memory.get(domain, {}),
            "global": self.global_memory.get("facts", {})
        }
        
        return context
```

## Memory Management Strategies

**1. TTL (Time-To-Live)**
Memories degrade in importance over time. Recent observations matter more than old ones.

```python
def decay_memory_weight(memory, age_days: int) -> float:
    """Memory weights decay exponentially"""
    decay_factor = 0.95  # 5% decay per day
    return decay_factor ** age_days
```

**2. Pruning by Relevance**
Keep only the most relevant memories, discard low-value ones.

```python
def prune_memories(memories: list, keep_top_n: int = 100):
    """Keep only top N most relevant memories"""
    
    # Score each memory by relevance
    scored = [(mem, relevance_score(mem)) for mem in memories]
    
    # Keep top N
    return [mem for mem, score in sorted(scored, key=lambda x: x[1], reverse=True)[:keep_top_n]]
```

**3. Consolidation**
Periodically consolidate multiple memories into abstractions.

```python
def consolidate_memories(memories: list) -> str:
    """Merge related memories into summary"""
    
    consolidation_prompt = f"""
    Consolidate these related memories into a single abstract principle:
    {json.dumps(memories)}
    
    Example: Multiple observations about user always scheduling calls on Wednesdays
    consolidates to: "User prefers Wednesday for calls"
    """
    
    abstract = llm.invoke(consolidation_prompt).content
    return abstract
```

## Memory Privacy and Security

With long-term memory, user data persists. This creates compliance risks.

```python
class SecureMemory:
    def __init__(self, encryption_key: bytes):
        self.cipher = AES.new(encryption_key, AES.MODE_GCM())
    
    def store_sensitive_memory(self, user_id: str, memory_text: str):
        """Encrypt before storing"""
        
        # Encrypt the memory
        encrypted, tag = self.cipher.encrypt_and_digest(memory_text.encode())
        
        # Store encrypted
        self.db.execute("""
        INSERT INTO encrypted_memories (user_id, encrypted_data, tag, iv)
        VALUES (?, ?, ?, ?)
        """, (user_id, encrypted, tag, self.cipher.nonce))
    
    def retrieve_sensitive_memory(self, user_id: str, decryption_key: bytes):
        """Decrypt for use"""
        
        row = self.db.execute(
            "SELECT encrypted_data, tag, iv FROM encrypted_memories WHERE user_id = ?",
            (user_id,)
        ).fetchone()
        
        if not row:
            return None
        
        cipher = AES.new(decryption_key, AES.MODE_GCM(), nonce=row[2])
        decrypted = cipher.decrypt_and_verify(row[0], row[1])
        return decrypted.decode()
    
    def forget(self, user_id: str):
        """Delete all memory of user (GDPR right to be forgotten)"""
        
        self.db.execute("DELETE FROM encrypted_memories WHERE user_id = ?", (user_id,))
```

---

Memory is the difference between agents that improve with use and agents that start from scratch each time. Implement it thoughtfully from the start.
