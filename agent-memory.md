# Memory systems for LLM coding agents: architectures for persistent knowledge

**LLM-based coding agents are evolving from stateless assistants to knowledge-accumulating systems that remember codebases, learn patterns, and collaborate across sessions.** The critical enabler is memory architecture—how agents persist information beyond their context windows. Recent research has converged on hierarchical memory systems combining fast working memory with persistent external storage, while multi-agent collaboration increasingly relies on shared memory pools and blackboard architectures. This report synthesizes actionable strategies for building "memory bank" systems that enable knowledge accumulation and multi-agent coordination over project lifetimes.

## Memory architecture fundamentals: from RAG to agentic memory

The foundation of agent memory rests on extending Retrieval-Augmented Generation (RAG) from read-only knowledge retrieval to read-write memory operations. Modern memory-augmented agents implement a **hierarchical tiered architecture** inspired by computer operating systems, treating the LLM's context window like RAM while using external storage as disk.

The dominant architecture pattern separates memory into distinct tiers. **Working memory** holds the current context window—immediate conversation, active task state, and recently accessed information. **Long-term memory** resides in external stores (vector databases, knowledge graphs, relational databases) and requires explicit retrieval. The key insight from MemGPT/Letta is that the LLM itself can manage memory transitions through designated tool calls like `core_memory_append`, `archival_memory_insert`, and `conversation_search`.

Beyond storage location, memory differs by **information type**. Episodic memory stores specific past events with temporal context ("the debugging session where we fixed the authentication bug"), while semantic memory holds general facts without temporal binding ("the codebase uses React 18 with TypeScript"). A February 2025 position paper argues that episodic memory is the "missing piece" for long-term LLM agents—enabling them to learn from experience rather than treating each interaction as independent.

Vector databases like Pinecone, Weaviate, Chroma, and FAISS handle embedding-based semantic search, but structured knowledge graphs increasingly complement them for relationship reasoning. **Graphiti** (from Zep AI) builds temporally-aware knowledge graphs with Neo4j, supporting hybrid retrieval through semantic embeddings plus BM25 plus graph traversal. For codebases, this enables queries like "what functions call the payment processor and were modified in the last sprint"—combining semantic meaning, structural relationships, and temporal metadata.

## Recent research advances: six papers reshaping agent memory

Analysis of six January 2025 arXiv papers reveals converging innovations in lightweight memory construction, multi-agent coordination, and self-evolving systems.

**Chain-of-Memory (arXiv:2601.14287)** challenges the assumption that complex memory structures justify their cost. The authors demonstrate that expensive graph/tree construction yields negligible accuracy improvements while dramatically increasing overhead. Their paradigm shift: **lightweight construction paired with sophisticated utilization**. Rather than pre-structuring memory, CoM organizes retrieved fragments into coherent inference paths at query time through adaptive truncation and dynamic evolution. This aligns well with code reasoning, where tracing execution paths mirrors how developers think through logic.

**FAME (arXiv:2601.14735)** addresses the deployment challenge for stateful agents in serverless environments. FaaS platforms are inherently stateless, creating friction for agents requiring persistent memory. FAME introduces automated memory persistence using DynamoDB for session state and S3 for tool output caching, achieving **13x latency reduction** and **88% fewer input tokens** compared to monolithic approaches. The architecture decomposes agents into Planner/Actor/Evaluator components orchestrated via AWS Step Functions, with memory automatically injected across function invocations.

**LSTM-MAS (arXiv:2601.11913)** maps multi-agent system design onto LSTM architecture principles. Four specialized agents—Worker (input gate), Filter (forget gate), Judge (cell state), and Manager (output gate)—process long contexts through a chain structure. The **Judge Agent** performs explicit conflict resolution, comparing answers from different workers and arbitrating to prevent error accumulation. This pattern directly applies to coding agents where inconsistent documentation, outdated comments, or conflicting requirements require arbitration. The system achieved **40-120% improvements** over baselines on long-context benchmarks and scales to 1.5M+ tokens.

**EvoFSM (arXiv:2601.09465)** introduces controllable self-evolution using finite state machines. Unlike free-form agent rewrites that cause instability and instruction drift, EvoFSM constrains optimization to atomic FSM operations guided by a critic mechanism. The **Experience Pool** stores successful trajectories as reusable priors and failure patterns as constraints—directly applicable to coding agents remembering what debugging strategies worked and which deprecated APIs to avoid. The flow/skill decomposition separates task planning from implementation, enabling agents to safely evolve workflows without catastrophic behavior changes.

**PEARL (arXiv:2601.11957)** demonstrates external memory modules for preference learning through a "Strategy Hub" that stores interpretable decision rules. While focused on calendar management, the pattern generalizes to coding agents learning user coding styles, preferred libraries, and project conventions through progressive refinement.

## Practical implementation patterns: what production systems actually do

**MemGPT/Letta** remains the most influential open-source implementation, treating memory management as an operating system problem. The architecture includes Core Memory (in-context editable blocks for persona and user info), Recall Memory (searchable conversation history), and Archival Memory (vector database for long-term storage). Critically, the LLM manages its own memory through tool calls—creating an "illusion of unlimited memory" within fixed context windows. The framework now supports multi-agent configurations with shared memory blocks.

**LangChain has deprecated** its legacy memory modules in favor of LangGraph's checkpointing and stores system. The modern approach uses thread-scoped checkpointing for short-term memory and LangGraph Stores for cross-thread long-term persistence. The LangMem toolkit provides procedural, episodic, and semantic memory abstractions. For multi-agent systems, LangGraph's state management uses TypedDict objects that flow between nodes, with reducers defining how concurrent writes merge.

**LlamaIndex** emphasizes composable memory through primary (immediate chat context) and secondary (long-term vector memory) sources. The Memory class supports configurable token limits with chat_history_token_ratio controlling the balance. Integration with Mem0 enables fact extraction across sessions, while persistent storage uses `index.storage_context.persist()` to survive restarts.

**Cursor's context management** reveals how production coding assistants handle codebase memory. The system uses AST-aware chunking, Merkle tree synchronization for efficient delta detection, server-side embeddings, and Turbopuffer vector search. Context assembly retrieves file paths and line ranges via semantic similarity, then reads content locally. Key patterns include partial file reading (starting with 250 lines, extending as needed), @-references for manual context injection, and .cursorignore for excluding irrelevant content.

**MCP (Model Context Protocol) memory servers** are emerging as the interoperability layer for agent memory. The official @modelcontextprotocol/server-memory implements a knowledge graph architecture with entities (nodes with observations), relations (directed connections), and tools for creation, search, and retrieval. System prompts instruct agents to begin interactions by retrieving the knowledge graph and continuously update observations. This enables cross-session persistence through a standardized protocol rather than framework-specific implementations.

**Claude's memory architecture** takes a deliberately simple approach: file-based markdown storage in CLAUDE.md files. The hierarchy includes global user preferences (~/.claude/CLAUDE.md), project-specific context (project root), and workspace settings. Rather than RAG or vector search, Claude loads entire curated memory into its 200K token context. The design philosophy prioritizes transparency (memory is editable text), version control compatibility, and user curation over automated management.

## Multi-agent memory collaboration: patterns for coordinated systems

Multi-agent coding systems—architect agents, coder agents, reviewer agents working together—require sophisticated memory coordination. Four dominant patterns have emerged.

**Shared memory pools** provide centralized repositories all agents access. LangGraph implements this through TypedDict state objects flowing between nodes, with reducers handling concurrent updates. CrewAI combines ChromaDB for short-term RAG, SQLite for cross-session persistence, and entity memory for tracking code components. The challenge is conflict resolution when agents write contradictory information.

**Blackboard architectures** enable coordination without direct agent communication. A central agent posts requests to a shared workspace; autonomous subordinate agents volunteer to respond based on their capabilities. Research on LbMAS (Blackboard-based LLM Multi-Agent Systems) shows **13-57% improvement** over master-slave paradigms. The pattern excels when the coordinator doesn't know all agent capabilities upfront—agents self-select for tasks they can handle.

**Message passing with persistent context** supports explicit handoffs between agents. LangGraph's Swarm library implements this through Command objects that update shared state and route to the next agent atomically. Context can be filtered or summarized during handoff to manage token budgets. Memory inheritance patterns ensure successor agents build on predecessors' work rather than starting cold.

**Federated memory systems** distribute memory across agent instances with selective sharing. A two-tier architecture maintains private memory (visible only to originating agent) and shared memory (selectively accessible). Provenance attributes track contributing agents, accessed resources, and timestamps for retrospective permission checks. This pattern enables cross-organization collaboration without full data exposure.

For coding agent teams, the recommended shared state includes requirements, architecture decisions, implementation files, review comments, test results, and **decision history**. The last element is critical—storing not just what was decided but why enables future agents to understand context rather than relitigating decisions.

## Knowledge accumulation for codebases: solving the cold-start problem

Every coding agent session faces the cold-start problem: complete unfamiliarity with a codebase that human developers would understand intimately. Three strategies address this.

**Pre-analysis and structured access** synthesizes information about every symbol, file, and directory before the agent engages. The DevRamp approach exposes this via MCP—queries by symbol or file return purpose, semantics, and patterns. Agents begin each task with a deliberate exploration phase, building mental models rapidly rather than discovering structure through trial and error.

**Decision history tracking** preserves the "why" behind architectural choices. Context engineering for multi-agent code assistants layers role-specific prompts, project context (CLAUDE.md), task-specific instructions, and relevant code snippets. When a future agent asks why the codebase uses a particular pattern, the decision history provides authoritative answers rather than requiring archaeological inference.

**Learning from feedback loops** incorporates code review comments, test results, and build logs. Letta Code's `/init` command triggers deep research forming memories about patterns and conventions, then rewrites memory blocks based on outcomes. The system tracks which debugging strategies succeeded, which API versions are compatible, and which patterns the codebase follows. This accumulated context survives session boundaries, enabling agents to improve over project lifetimes.

## Solo developer context: optimizing for single-user workflows

For individual developers using coding agents across sessions, specific patterns maximize value. The memory hierarchy should include:

- **Session memory**: Current conversation and active file context (volatile)
- **Project memory**: Codebase conventions, architecture decisions, component relationships (persistent per-project)  
- **User memory**: Coding preferences, frequently used patterns, toolchain configurations (persistent across projects)

**Practical implementation** combines MCP memory servers for cross-session persistence, project-root CLAUDE.md files for conventions documentation, and vector-indexed codebase search. The agent should automatically load project memory at session start, update it based on significant decisions during work, and compress completed sessions into retrievable episodic memories.

**Key patterns** for solo developers:

- Store successful debugging strategies with context ("fixed authentication timeout by increasing connection pool size")
- Track dependency decisions and their rationale ("chose React Query over SWR because of mutation handling")
- Maintain a living architecture document the agent updates as it learns the codebase
- Use explicit checkpoints for complex multi-step tasks enabling recovery from interruptions

## State of the art: what works, what doesn't, what's next

**What works well**: Hierarchical memory with working/long-term separation; vector search for semantic code retrieval; knowledge graphs for relationship reasoning; LLM-managed memory through tool calls; MCP as interoperability layer; explicit experience storage for learning from outcomes.

**Current limitations**: Memory consistency at scale lacks principled models—agents can write contradictory information. Context window limits still constrain reasoning over large codebases. LLM-based memory writes introduce hallucination risk. Retrieval quality depends heavily on chunking and embedding strategies. Synchronization overhead adds latency in distributed systems.

**Open problems**: 
- **Cache sharing protocols** for semantic artifact reuse across agents don't exist
- **Memory access semantics** (read-only, append-only, read-write permissions) lack standardization
- **Consistency models** from distributed systems don't map cleanly to semantic state
- **Forgetting policies** for what to retain versus discard remain heuristic
- **Cross-agent memory** coordination needs richer primitives than message passing

## Actionable strategies for building a coding agent memory bank

Based on this synthesis, a practical memory bank system for coding agents should implement:

1. **Tiered storage**: Working memory in context, recall memory in searchable conversation history, archival memory in vector database, knowledge graph for relationships

2. **Dual indexing**: Vector embeddings for semantic search plus structured knowledge graph for relationship queries—hybrid retrieval combining both

3. **Experience accumulation**: Store (situation, action, outcome) tuples from debugging, code review, and build cycles; retrieve relevant experiences when facing similar situations

4. **Decision journaling**: Persist architectural decisions with rationale in retrievable format; enable future agents to query "why does the codebase do X"

5. **MCP-based persistence**: Use standardized memory servers for cross-session durability; enable tool-based memory operations the LLM can invoke

6. **Lightweight construction**: Following Chain-of-Memory's insight, invest in sophisticated retrieval and utilization rather than expensive pre-structuring

7. **Multi-agent coordination**: For collaborative systems, implement shared state with explicit reducers for concurrent writes; use blackboard patterns when agent capabilities vary

The field is rapidly evolving from simple RAG to Memory-Augmented Generation (MAG) systems treating memory as a first-class architectural component. The most effective coding agent memory systems will combine the OS-inspired tiered approach of MemGPT, the lightweight-construction philosophy of Chain-of-Memory, the experience accumulation of EvoFSM, and the multi-agent coordination patterns emerging from LangGraph and blackboard architectures.