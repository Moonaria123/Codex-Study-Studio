# AI Agents: Tool Use in Practice — lecture script

Adapted from Microsoft AI Agents for Beginners. Copyright (c) Microsoft Corporation. MIT License.

Source: https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md

## S01 — Give your agent tools

**Source:** Microsoft AI Agents for Beginners, Tool Use, lines 27–61

**Visible content**

- Tools are executable code: functions or external API calls.
- The model selects a tool and supplies arguments.
- Execution produces a result the model can use.

**Narration**

An AI agent can extend its capabilities by using tools. A tool might be a small function, such as a calculator, or an API call to an external service. The model generates a function call that identifies the tool and its arguments. The function then runs, and its result returns to the model. Keep those responsibilities clear: selecting a tool, executing its code, and composing the response are separate steps.

## S02 — Start with the task

**Source:** Microsoft AI Agents for Beginners, Tool Use, lines 31–39

**Visible content**

- Retrieve current information from APIs or databases.
- Execute code, generate reports or run simulations.
- Automate workflows and support customer queries.
- Use editing and evaluation tools for content.

**Narration**

The lesson groups tool use around tasks that need interaction with external systems. Information retrieval can query an API or database. Code execution can support calculations, reports or simulations. Workflow automation connects several operations, while support agents can interact with customer systems or knowledge bases. Content tools can check, summarise or evaluate text. Begin with the task, then identify which tool capability it requires.

## S03 — Build six connected components

**Source:** Microsoft AI Agents for Beginners, Tool Use, lines 41–55

**Visible content**

- Schemas + execution logic describe and invoke tools.
- Message handling + integration connect the steps.
- Validation + state management keep interactions consistent.

**Narration**

A working tool-use design needs more than a function description. Schemas define what is available. Execution logic decides how and when a tool is invoked. Message handling connects user inputs, model responses, calls and results. Integration connects the actual tools. Error handling and validation deal with failures, parameters and unexpected responses. State management preserves context and earlier interactions across turns. These are six distinct responsibilities, even when a framework provides several of them together.

## S04 — Write the tool’s contract

**Source:** Microsoft AI Agents for Beginners, Tool Use, lines 63–108

**Visible content**

- Name: get_current_time
- Purpose: get the current time in a location.
- Parameter: location, a required string.
- A schema describes the function; code implements it.

**Narration**

The source illustrates a time lookup tool. Its schema gives the name get current time, explains its purpose, and describes a location parameter. That parameter is a string and is required. This description helps the model construct a request. It does not execute the lookup. Developers still need a model that supports function calling, the function descriptions, and the implementation of every function they expose.

## S05 — Close the function-call loop

**Source:** Microsoft AI Agents for Beginners, Tool Use, lines 61–192

**Visible content**

- Send the request and available function descriptions.
- Receive a function name and arguments.
- Execute the function; return its matching tool result.
- Let the model use that result to answer.

**Narration**

Follow the complete loop. Send the user request and the available function descriptions to the model. The model can return a function name and arguments. Your application executes the corresponding function. The result is sent back to the model, which uses it to respond. In the source example, a call identifier links the function output to its call. A returned tool call is an intermediate request to run code; it is not yet the answer to the user.

## S06 — Connect local and remote tools

**Source:** Microsoft AI Agents for Beginners, Tool Use, lines 208–245

**Visible content**

- Decorated functions can become tools with generated schemas.
- A framework can handle the model–tool message exchange.
- An MCP server publishes tools and their schemas.
- Remote-tool queries are sent to that server.

**Narration**

The lesson shows two ways to connect tools. With Microsoft Agent Framework, decorated Python functions can be serialised into schemas, and the framework handles the exchange between the model and the code. Tools may also come from a server using the Model Context Protocol, or MCP. The framework reads the server’s tool schemas and offers those tools alongside local ones. When a remote tool is used, the generated query is sent to that server.

## S07 — Match tools to information or action

**Source:** Microsoft AI Agents for Beginners, Tool Use, lines 268–291

**Visible content**

- Knowledge tools include search and file retrieval.
- Action tools include function calling and code interpretation.
- A toolset groups available tools.
- Threads retain the conversation’s message history.

**Narration**

The source’s managed-service example groups tools into two categories. Knowledge tools include search and file retrieval. Action tools include function calling and code interpretation. A toolset makes multiple tools available together, while threads keep the history of a conversation. The service example also handles tool invocation and responses on the server. Keep the toolset and the thread distinct: one organises capabilities; the other retains messages.

## S08 — Bound database access

**Source:** Microsoft AI Agents for Beginners, Tool Use, lines 329–333

**Visible content**

- Generated SQL can create injection or tampering risks.
- Configure restricted, read-only database access.
- Assign a read-only SELECT role where applicable.
- Use a secure execution environment.

**Narration**

Tools can touch real systems, so their permissions matter. The lesson highlights risks from model-generated SQL, including injection and database tampering. It recommends restricting database access to read-only operations and, for the database services it names, assigning a read-only select role. It also describes a secure environment and a read-only analytical database or warehouse. The implementation decision is concrete: the application’s database access should match the restricted reading task.

## S09 — What should the application do next?

**Source:** Microsoft AI Agents for Beginners, Tool Use, lines 61–192

**Visible content**

- User asks for the current time in a city.
- Model returns get_current_time with location arguments.
- Is this already the final answer?
- Name the next two steps before revealing the solution.

**Narration**

Consider this original question based on the source’s time lookup. A user asks for the current time in a city. The model returns the function name get current time and the location arguments. Has the user’s question already been answered? Name the next two application steps before revealing the solution.

**Thinking pause:** 5 seconds before the answer.

## S10 — Execute. Return. Then answer.

**Source:** Microsoft AI Agents for Beginners, Tool Use, lines 45–192

**Visible content**

- Execute get_current_time using the supplied location.
- Send its result back with the matching call identifier.
- Let the model use the result to produce the final answer.
- The tool call and the tool result are different messages.

**Narration**

The tool call is not yet the final answer. First, execute the selected function with the supplied location. Next, return its result to the model, preserving the call identifier used in the source example. The model can then use that result to answer the user. Recall the larger design: describe tools clearly, connect execution and messages, preserve state, and validate inputs and results.
