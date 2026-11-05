# Source excerpts — Tool Use Design Pattern

Microsoft **AI Agents for Beginners**, lesson 04. Copyright (c) Microsoft Corporation. [MIT License](../_source/MICROSOFT-MIT-LICENSE.txt).

Revision: `f09e94ffe170f8af6d3db7c42987bbe4db227723`. The excerpts below preserve the original text in each stated range. They are selected source passages, not a continuous reproduction of the whole lesson. Images, logos, video embeds, external resource lists and deployment code are not reproduced.

## Original lines 5–67

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L5-L67)

# Tool Use Design Pattern

Tools are interesting because they allow AI agents to have a broader range of capabilities. Instead of the agent having a limited set of actions it can perform, by adding a tool, the agent can now perform a wide range of actions. In this chapter, we will look at the Tool Use Design Pattern, which describes how AI agents can use specific tools to achieve their goals.

## Introduction

In this lesson, we're looking to answer the following questions:

- What is the tool use design pattern?
- What are the use cases it can be applied to?
- What are the elements/building blocks needed to implement the design pattern?
- What are the special considerations for using the Tool Use Design Pattern to build trustworthy AI agents?

## Learning Goals

After completing this lesson, you will be able to:

- Define the Tool Use Design Pattern and its purpose.
- Identify use cases where the Tool Use Design Pattern is applicable.
- Understand the key elements needed to implement the design pattern.
- Recognize considerations for ensuring trustworthiness in AI agents using this design pattern.

## What is the Tool Use Design Pattern?

The **Tool Use Design Pattern** focuses on giving LLMs the ability to interact with external tools to achieve specific goals. Tools are code that can be executed by an agent to perform actions. A tool can be a simple function such as a calculator, or an API call to a third-party service such as stock price lookup or weather forecast. In the context of AI agents, tools are designed to be executed by agents in response to **model-generated function calls**.

## What are the use cases it can be applied to?

AI Agents can leverage tools to complete complex tasks, retrieve information, or make decisions. The tool use design pattern is often used in scenarios requiring dynamic interaction with external systems, such as databases, web services, or code interpreters. This ability is useful for a number of different use cases including:

- **Dynamic Information Retrieval:** Agents can query external APIs or databases to fetch up-to-date data (e.g., querying a SQLite database for data analysis, fetching stock prices or weather information).
- **Code Execution and Interpretation:** Agents can execute code or scripts to solve mathematical problems, generate reports, or perform simulations.
- **Workflow Automation:** Automating repetitive or multi-step workflows by integrating tools like task schedulers, email services, or data pipelines.
- **Customer Support:** Agents can interact with CRM systems, ticketing platforms, or knowledge bases to resolve user queries.
- **Content Generation and Editing:** Agents can leverage tools like grammar checkers, text summarizers, or content safety evaluators to assist with content creation tasks.

## What are the elements/building blocks needed to implement the tool use design pattern?

These building blocks allow the AI agent to perform a wide range of tasks. Let's look at the key elements needed to implement the Tool Use Design Pattern:

- **Function/Tool Schemas**: Detailed definitions of available tools, including function name, purpose, required parameters, and expected outputs. These schemas enable the LLM to understand what tools are available and how to construct valid requests.

- **Function Execution Logic**: Governs how and when tools are invoked based on the user’s intent and conversation context. This may include planner modules, routing mechanisms, or conditional flows that determine tool usage dynamically.

- **Message Handling System**: Components that manage the conversational flow between user inputs, LLM responses, tool calls, and tool outputs.

- **Tool Integration Framework**: Infrastructure that connects the agent to various tools, whether they are simple functions or complex external services.

- **Error Handling & Validation**: Mechanisms to handle failures in tool execution, validate parameters, and manage unexpected responses.

- **State Management**: Tracks conversation context, previous tool interactions, and persistent data to ensure consistency across multi-turn interactions.

Next, let's look at Function/Tool Calling in more detail.
 
### Function/Tool Calling

Function calling is the primary way we enable Large Language Models (LLMs) to interact with tools. You will often see 'Function' and 'Tool' used interchangeably because 'functions' (blocks of reusable code) are the 'tools' agents use to carry out tasks. In order for a function's code to be invoked, an LLM must compare the users request against the functions description. To do this a schema containing the descriptions of all the available functions is sent to the LLM. The LLM then selects the most appropriate function for the task and returns its name and arguments. The selected function is invoked, it's response is sent back to the LLM, which uses the information to respond to the users request.

For developers to implement function calling for agents, you will need:

1. An LLM model that supports function calling
2. A schema containing function descriptions
3. The code for each function described
## Original lines 84–108

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L84-L108)

1. **Create a Function Schema**:

    Next we will define a JSON schema that contains the function name, description of what the function does, and the names and descriptions of the function parameters.
    We will then take this schema and pass it to the client created previously, along with the users request to find the time in San Francisco. What's important to note is that a **tool call** is what is returned, **not** the final answer to the question. As mentioned earlier, the LLM returns the name of the function it selected for the task, and the arguments that will be passed to it.

    ```python
    # Function description for the model to read (Responses API flat tool format)
    tools = [
        {
            "type": "function",
            "name": "get_current_time",
            "description": "Get the current time in a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city name, e.g. San Francisco",
                    },
                },
                "required": ["location"],
            },
        }
    ]
    ```
## Original lines 124–126

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L124-L126)

    # The Responses API returns tool calls as function_call items in response.output.
    # Append them to the conversation so the model has full context on the next turn.
    messages += response.output
## Original lines 138–141

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L138-L141)

1. **The function code required to carry out the task:**

    Now that the LLM has chosen which function needs to be run the code that carries out the task needs to be implemented and executed.
    We can implement the code to get the current time in Python. We will also need to write the code to extract the name and arguments from the response_message to get the final result.
## Original lines 163–180

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L163-L180)

    # Handle function calls
    tool_calls = [item for item in response.output if item.type == "function_call"]
    if tool_calls:
        for tool_call in tool_calls:
            if tool_call.name == "get_current_time":

                function_args = json.loads(tool_call.arguments)

                time_response = get_current_time(
                    location=function_args.get("location")
                )

                # Return the tool result as a function_call_output item
                messages.append({
                    "type": "function_call_output",
                    "call_id": tool_call.call_id,
                    "output": time_response,
                })
## Original lines 184–192

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L184-L192)

    # Second API call: Get the final response from the model
    final_response = client.responses.create(
        model=deployment_name,
        input=messages,
        tools=tools,
        store=False,
    )

    return final_response.output_text
## Original lines 208–210

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L208-L210)

### Microsoft Agent Framework

<a href="https://learn.microsoft.com/azure/ai-services/agents/overview" target="_blank">Microsoft Agent Framework</a> is an open-source AI framework for building AI agents. It simplifies the process of using function calling by allowing you to define tools as Python functions with the `@tool` decorator. The framework handles the back-and-forth communication between the model and your code. It also provides access to pre-built tools like File Search and Code Interpreter through `FoundryChatClient`.
## Original lines 216–216

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L216-L216)

In the Microsoft Agent Framework, tools are defined as decorated functions. We can convert the `get_current_time` function we saw earlier into a tool by using the `@tool` decorator. The framework will automatically serialize the function and its parameters, creating the schema to send to the LLM.
## Original lines 241–245

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L241-L245)

#### Tools from an MCP server

Tools do not have to be functions in your own code. A server that speaks the Model Context Protocol (MCP, covered in [Lesson 11](../11-agentic-protocols/README.md)) publishes its tools together with their schemas, and the framework can load them the same way it serializes a decorated function. `MCPStreamableHTTPTool` connects to such a server over HTTP, reads the tool schemas, and offers them to the model next to any local tools.

The example below uses the web search server hosted by <a href="https://keenable.ai" target="_blank">Keenable</a>. It is free to use without an account or API key (requests are rate limited per IP), so the only credentials you need are the ones for your model. As with any remote tool, the queries the model writes are sent to that server.
## Original lines 268–291

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L268-L291)

### Microsoft Foundry Agent Service

<a href="https://learn.microsoft.com/azure/ai-services/agents/overview" target="_blank">Microsoft Foundry Agent Service</a> is a newer agentic framework that is designed to empower developers to securely build, deploy, and scale high-quality, and extensible AI agents without needing to manage the underlying compute and storage resources. It is particularly useful for enterprise applications since it is a fully managed service with enterprise grade security.

When compared to developing with the LLM API directly, Microsoft Foundry Agent Service provides some advantages, including:

- Automatic tool calling – no need to parse a tool call, invoke the tool, and handle the response; all of this is now done server-side
- Securely managed data – instead of managing your own conversation state, you can rely on threads to store all the information you need
- Out-of-the-box tools – Tools that you can use to interact with your data sources, such as Bing, Azure AI Search, and Azure Functions.

The tools available in Microsoft Foundry Agent Service can be divided into two categories:

1. Knowledge Tools:
    - <a href="https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/bing-grounding?tabs=python&pivots=overview" target="_blank">Grounding with Bing Search</a>
    - <a href="https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/file-search?tabs=python&pivots=overview" target="_blank">File Search</a>
    - <a href="https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/azure-ai-search?tabs=azurecli%2Cpython&pivots=overview-azure-ai-search" target="_blank">Azure AI Search</a>

2. Action Tools:
    - <a href="https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/function-calling?tabs=python&pivots=overview" target="_blank">Function Calling</a>
    - <a href="https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/code-interpreter?tabs=python&pivots=overview" target="_blank">Code Interpreter</a>
    - <a href="https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/openapi-spec?tabs=python&pivots=overview" target="_blank">OpenAPI defined tools</a>
    - <a href="https://learn.microsoft.com/azure/ai-services/agents/how-to/tools/azure-functions?pivots=overview" target="_blank">Azure Functions</a>

The Agent Service allows us to be able to use these tools together as a `toolset`. It also utilizes `threads` which keep track of the history of messages from a particular conversation.
## Original lines 329–333

[Upstream locator](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L329-L333)

## What are the special considerations for using the Tool Use Design Pattern to build trustworthy AI agents?

A common concern with SQL dynamically generated by LLMs is security, particularly the risk of SQL injection or malicious actions, such as dropping or tampering with the database. While these concerns are valid, they can be effectively mitigated by properly configuring database access permissions. For most databases this involves configuring the database as read-only. For database services like PostgreSQL or Azure SQL, the app should be assigned a read-only (SELECT) role.

Running the app in a secure environment further enhances protection. In enterprise scenarios, data is typically extracted and transformed from operational systems into a read-only database or data warehouse with a user-friendly schema. This approach ensures that the data is secure, optimized for performance and accessibility, and that the app has restricted, read-only access.
