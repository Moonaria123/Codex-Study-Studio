# Tool Use Design Pattern — Chapter review

## Source and goals

Microsoft **AI Agents for Beginners**, lesson 04, revision `f09e94ffe170f8af6d3db7c42987bbe4db227723`. [Source chapter](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md). Copyright (c) Microsoft Corporation; MIT License. References are original Markdown lines. The four official lesson goals are mapped in [Syllabus](../Syllabus.md).

## Conceptual framework

The user supplies a task. The model receives descriptions of available tools and may request one by name and arguments. Executable code performs the operation. The result returns to the model, which uses it in the response. Message handling, integration, validation and retained state support this loop.

## Section-by-section knowledge

| Knowledge ID | Concept | Teaching explanation | Source |
|---|---|---|---|
| T-K01 | Tool Use Design Pattern | Tools are executable functions or API calls used in response to model-generated function calls. | [L27–29](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L27-L29) |
| T-K02 | Use cases | The chapter lists dynamic retrieval, code execution, workflow automation, customer support, and content generation/editing. | [L31–39](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L31-L39) |
| T-K03 | Implementation building blocks | Schemas, execution logic, message handling, integration, error handling/validation, and state management have distinct roles. | [L41–55](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L41-L55) |
| T-K04 | Function schema | Describe name, purpose, required parameters and expected outputs; the example requires a location string. | [L45–108](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L45-L108) |
| T-K05 | Function-call loop | The model selects name and arguments; code runs; the matching result returns; the model uses it to answer. | [L59–192](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L59-L192) |
| T-K06 | Local and MCP tools | A framework can serialise decorated functions; an MCP server publishes tools and schemas for remote use. | [L208–245](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L208-L245) |
| T-K07 | Service capabilities and state | The service example distinguishes knowledge/action tools, groups tools into toolsets, and keeps messages in threads. | [L268–291](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L268-L291) |
| T-K08 | Restricted database access | For generated SQL, configure read-only access, assign a SELECT role where applicable, and use a secure environment. | [L329–333](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L329-L333) |

### 1. Pattern and use cases

The pattern gives a model access to capabilities implemented as code. A calculator is a simple function example; an API call can connect to an external service. The chapter’s use cases concern interacting with systems: retrieving changing information, executing code, automating workflows, supporting customers, and assisting content work. Select the capability according to the task. Source: L27–39.

### 2. Six building blocks

**Schemas** describe what can be called. **Execution logic** governs invocation. **Message handling** manages the flow between user input, model response, tool call and tool output. **Integration** connects the tools. **Error handling and validation** deal with failures, parameters and unexpected responses. **State management** retains context, earlier tool interactions and persistent data. Source: L41–55.

### 3. Function calling

The developer needs a function-calling model, function descriptions and function implementations. In the source’s time example, `get_current_time` takes a required `location` string. The model returns a call containing the function name and arguments. The application extracts those arguments and executes the function. A `function_call_output` returns its result with the matching `call_id`, and the next model response supplies the user-facing answer. Source: L59–192.

**Original example — Trace the handoff.** A user asks for a city’s current time. The model requests `get_current_time` with that city as `location`. The application has received a request to run code. It must execute the function, return its matching result, and let the model use the result. No current time value is invented in this example. Source: L61, L84–108, L163–192.

**Mini-check:** Does a schema replace the implementation? **Answer:** No. The source separately requires the schema and the function code. Source: L63–67.

### 4. Framework, MCP and managed service

The framework example serialises decorated Python functions into schemas and handles their message exchange with the model. An MCP server publishes remote tools and their schemas; the framework can offer them alongside local tools. Queries sent to a remote tool reach that server. Source: L208–245.

The managed-service example names **knowledge tools**, including search and file retrieval, and **action tools**, including function calling and code interpretation. A **toolset** groups tools, while a **thread** holds a conversation’s message history. Source: L268–291.

### 5. Trustworthy database use

The source highlights injection and tampering risks from generated SQL. It recommends restricted read-only access, a read-only SELECT role for the named database services, and a secure environment. It also describes read-only analytical databases or warehouses separated from operational sources. Source: L329–333.

**Original example — Reading access.** An agent’s task is to answer questions by reading a database. The source’s recommendation maps that task to read-only permissions; database-administration privileges are outside that described reading configuration. Source: L331–333.

## Distinctions

| Concepts | Decisive difference | Source |
|---|---|---|
| Schema / implementation | A schema describes the callable capability; code performs its work. | L63–67, L84–108, L138–173 |
| Tool call / tool result | A call requests execution; a result contains the function’s returned information. | L61, L163–180 |
| Tool call / final answer | The selected function and arguments precede execution and the final model response. | L87, L184–192 |
| Execution logic / message handling | One governs invocation; the other manages conversational flow. | L47–49 |
| Local function / remote MCP tool | The former is supplied in local code; the latter is published with its schema by a server. | L216–245 |
| Toolset / thread | The toolset groups capabilities; the thread retains message history. | L291 |
| Knowledge / action tools | File/search retrieval and function/code execution are placed in separate source categories. | L278–289 |

## Formula sheet and terminology

This chapter has no mathematical formulas. Its key structures are function schemas and message sequences.

| Term | Meaning in this chapter |
|---|---|
| LLM | Large Language Model; the model chooses among described functions. |
| Function/tool schema | Description of a function’s purpose and callable inputs, with expected output information in the general contract. |
| Arguments | Values passed to the selected function. |
| `call_id` | Identifier copied into the returned output in the source example. |
| MCP | Model Context Protocol; servers publish tools and their schemas. |
| Toolset | Group of tools available together in the service example. |
| Thread | Conversation message history in that example. |
| Read-only SELECT role | The source’s database access recommendation for its reading use case. |

Source: L45, L61–67, L169–180, L243, L291, L331.

## Coverage matrix

| Knowledge ID | PPT/script slides | Overview/map ID | Flashcards | Practice |
|---|---|---|---|---|
| T-K01 | S01 | T-K01 | T-F01 | T-Q01 |
| T-K02 | S02 | T-K02 | T-F02 | T-Q05 |
| T-K03 | S03, S10 | T-K03 | T-F03 | T-Q06 |
| T-K04 | S04, S09–S10 | T-K04 | T-F04 | T-Q02 |
| T-K05 | S01, S04–S05, S09–S10 | T-K05 | T-F05–T-F07 | T-Q03–T-Q04 |
| T-K06 | S06 | T-K06 | T-F08–T-F09 | T-Q07 |
| T-K07 | S07 | T-K07 | T-F10–T-F11 | T-Q08–T-Q09 |
| T-K08 | S08 | T-K08 | T-F12 | T-Q10 |

Review the map’s responsibilities, retrieve the twelve cards, then complete the ten original questions. Use the explanations to identify which part of the request–call–result–answer sequence needs more work.
