# AI Agents for Beginners — Tool Use study outline

## Source and scope

Microsoft’s open course **AI Agents for Beginners**, revision `f09e94ffe170f8af6d3db7c42987bbe4db227723`, provides the source for this demonstration. The selected chapter is **04 — Tool Use Design Pattern**. Source references use Markdown line numbers; there are no invented printed pages.

The course overview introduces the fundamentals of building agents and presents each lesson as a topic that can be studied separately. It provides written lessons, videos, Python examples and further links. The selected lesson connects tool descriptions, model-generated calls, executable functions and returned results.

## Course index

The index preserves the provider’s lesson order. Reading coverage is explicit.

| Lesson | Original title | Curriculum locator | Coverage |
|---|---|---|---|
| 01 | [Intro to AI Agents and Agent Use Cases](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/01-intro-to-ai-agents/README.md) | README L98 | Index only |
| 02 | [Exploring AI Agentic Frameworks](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/02-explore-agentic-frameworks/README.md) | README L99 | Index only |
| 03 | [Understanding AI Agentic Design Patterns](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/03-agentic-design-patterns/README.md) | README L100 | Index only |
| 04 | [Tool Use Design Pattern](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md) | README L101 | Full README and its two explanatory diagrams read |
| 05 | [Agentic RAG](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/05-agentic-rag/README.md) | README L102 | Index only |
| 06 | [Building Trustworthy AI Agents](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/06-building-trustworthy-agents/README.md) | README L103 | Index only |
| 07 | [Planning Design Pattern](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/07-planning-design/README.md) | README L104 | Index only |
| 08 | [Multi-Agent Design Pattern](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/08-multi-agent/README.md) | README L105 | Index only |
| 09 | [Metacognition Design Pattern](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/09-metacognition/README.md) | README L106 | Index only |
| 10 | [AI Agents in Production](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/10-ai-agents-production/README.md) | README L107 | Index only |
| 11 | [Using Agentic Protocols (MCP, A2A and NLWeb)](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/11-agentic-protocols/README.md) | README L108 | Index only |
| 12 | [Context Engineering for AI Agents](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/12-context-engineering/README.md) | README L109 | Index only |
| 13 | [Managing Agentic Memory](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/13-agent-memory/README.md) | README L110 | Index only |
| 14 | [Exploring Microsoft Agent Framework](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/14-microsoft-agent-framework/README.md) | README L111 | Index only |
| 15 | [Building Computer Use Agents (CUA)](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/15-browser-use/README.md) | README L112 | Index only |
| 16 | [Deploying Scalable Agents](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/16-deploying-scalable-agents/README.md) | README L113 | Index only |
| 17 | [Creating Local AI Agents](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/17-creating-local-ai-agents/README.md) | README L114 | Index only |
| 18 | [Securing AI Agents](https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/18-securing-ai-agents/README.md) | README L115 | Index only |

## Selected chapter index

| Source section | Original lines | Main question | Learning resources |
|---|---|---|---|
| Introduction and learning goals | 5–25 | What should the learner be able to explain? | Syllabus; review goals |
| Pattern definition | 27–29 | What is a tool and how does an agent use one? | T-K01; S01 |
| Use cases | 31–39 | Which tasks benefit from external capabilities? | T-K02; S02 |
| Building blocks | 41–55 | Which implementation responsibilities must connect? | T-K03; S03 |
| Function/tool calling and time example | 59–202 | How do schema, call, execution, result and answer fit together? | T-K04–T-K05; S04–S05, S09–S10 |
| Framework and MCP examples | 204–266 | How can local and remote tools be exposed? | T-K06; S06 |
| Managed service example | 268–327 | How do tool categories, toolsets and threads differ? | T-K07; S07 |
| Trustworthy use | 329–333 | How should database access be restricted? | T-K08; S08 |
| Sample code, resources and navigation | 335–360 | Where does the provider direct further study? | Original upstream links |

## Knowledge connections and study route

1. Define the required capability and match it to a use case.
2. Describe it in a schema and provide its executable implementation.
3. Follow the message loop from request to call, result and final answer.
4. Place integration, validation and state management around that loop.
5. Distinguish local functions, remote MCP tools and the source’s managed-service example.
6. Apply the source’s restricted database-access recommendation.

These links follow the selected chapter’s concepts. The preceding course lesson is *Understanding AI Agentic Design Patterns*; the next is *Agentic RAG*, as linked by the chapter.

## Resources

- [Official lesson goals](Syllabus.md)
- [Chapter review](Chapter%2004%20-%20Tool%20Use/CharpterReview.md)
- [Source excerpts](Chapter%2004%20-%20Tool%20Use/Chapter_Source.md)
- [PowerPoint](Chapter%2004%20-%20Tool%20Use/Lecture.pptx)
- [Narration script](Chapter%2004%20-%20Tool%20Use/LectureScript.md)
- [Knowledge overview](Chapter%2004%20-%20Tool%20Use/Knowledge_Overview.svg)
- [Practice and answers](Chapter%2004%20-%20Tool%20Use/Practice_and_Answers.pdf)
- [Interactive StudyHub](StudyHub.html)
- [Source attribution](SOURCE.md) and [production manifest](Studio.json)
