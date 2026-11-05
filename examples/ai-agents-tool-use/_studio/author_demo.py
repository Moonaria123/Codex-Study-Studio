"""Build source-grounded learning inputs for the AI-agent tool-use showcase."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
CHAPTER = ROOT / 'Chapter 04 - Tool Use'
COMMIT = 'f09e94ffe170f8af6d3db7c42987bbe4db227723'
BASE = f'https://github.com/microsoft/ai-agents-for-beginners/blob/{COMMIT}'
LESSON = BASE + '/04-tool-use/README.md'
DATE = '2026-11-02'

def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + '\n', encoding='utf-8')

def dump(path, value):
    write(path, json.dumps(value, ensure_ascii=False, indent=2))

def loc(a, b):
    return f'Microsoft AI Agents for Beginners, Tool Use, lines {a}–{b}'

def visual(layout, *nodes):
    return {'layout': layout, 'nodes': [{'title': title, 'text': text} for title, text in nodes]}

slides = []
def slide(number, title, kicker, bullets, narration, source_range, kids, slug, picture, **extra):
    a,b=source_range
    slides.append({'id':f'S{number:02}', 'title':title, 'kicker':kicker, 'bullets':bullets, 'narration':narration, 'source':loc(a,b), 'source_url':f'{LESSON}#L{a}-L{b}', 'knowledge_ids':kids, 'visual':slug, 'visual_data':picture, **extra})

slide(1,'Give your agent tools','TOOL USE / FROM LANGUAGE TO ACTION',[
    'Tools are executable code: functions or external API calls.',
    'The model selects a tool and supplies arguments.',
    'Execution produces a result the model can use.'
], 'An AI agent can extend its capabilities by using tools. A tool might be a small function, such as a calculator, or an API call to an external service. The model generates a function call that identifies the tool and its arguments. The function then runs, and its result returns to the model. Keep those responsibilities clear: selecting a tool, executing its code, and composing the response are separate steps.',(27,61),['T-K01','T-K05'],'pattern',visual('flow',('Model','Select a tool and its arguments'),('Tool code','Execute the requested function'),('Model response','Use the returned result')))
slide(2,'Start with the task','01 / WHERE TOOL USE FITS',[
    'Retrieve current information from APIs or databases.',
    'Execute code, generate reports or run simulations.',
    'Automate workflows and support customer queries.',
    'Use editing and evaluation tools for content.'
], 'The lesson groups tool use around tasks that need interaction with external systems. Information retrieval can query an API or database. Code execution can support calculations, reports or simulations. Workflow automation connects several operations, while support agents can interact with customer systems or knowledge bases. Content tools can check, summarise or evaluate text. Begin with the task, then identify which tool capability it requires.',(31,39),['T-K02'],'use-cases',visual('compare',('Retrieve','APIs and databases'),('Execute','Code, reports and simulations'),('Coordinate','Workflows and customer support'),('Edit','Content checking and evaluation')))
slide(3,'Build six connected components','02 / AGENT IMPLEMENTATION',[
    'Schemas + execution logic describe and invoke tools.',
    'Message handling + integration connect the steps.',
    'Validation + state management keep interactions consistent.'
], 'A working tool-use design needs more than a function description. Schemas define what is available. Execution logic decides how and when a tool is invoked. Message handling connects user inputs, model responses, calls and results. Integration connects the actual tools. Error handling and validation deal with failures, parameters and unexpected responses. State management preserves context and earlier interactions across turns. These are six distinct responsibilities, even when a framework provides several of them together.',(41,55),['T-K03'],'building-blocks',visual('stack',('Describe + invoke','Schemas and function execution logic'),('Connect','Message handling and tool integration'),('Validate + remember','Error handling and state management')))
slide(4,'Write the tool’s contract','03 / FUNCTION SCHEMA',[
    'Name: get_current_time',
    'Purpose: get the current time in a location.',
    'Parameter: location, a required string.',
    'A schema describes the function; code implements it.'
], 'The source illustrates a time lookup tool. Its schema gives the name get current time, explains its purpose, and describes a location parameter. That parameter is a string and is required. This description helps the model construct a request. It does not execute the lookup. Developers still need a model that supports function calling, the function descriptions, and the implementation of every function they expose.',(63,108),['T-K04','T-K05'],'tool-schema',visual('schema',('name','get_current_time'),('description','Get the current time in a given location'),('parameters','location: string · required')))
slide(5,'Close the function-call loop','04 / REQUEST → CALL → RESULT → ANSWER',[
    'Send the request and available function descriptions.',
    'Receive a function name and arguments.',
    'Execute the function; return its matching tool result.',
    'Let the model use that result to answer.'
], 'Follow the complete loop. Send the user request and the available function descriptions to the model. The model can return a function name and arguments. Your application executes the corresponding function. The result is sent back to the model, which uses it to respond. In the source example, a call identifier links the function output to its call. A returned tool call is an intermediate request to run code; it is not yet the answer to the user.',(61,192),['T-K05'],'call-lifecycle',visual('flow',('Request + schemas','Provide intent and available capabilities'),('Function call','Receive name and arguments'),('Matching result','Execute code and return the call result'),('Final answer','Let the model use the returned information')))
slide(6,'Connect local and remote tools','05 / FRAMEWORKS AND MCP',[
    'Decorated functions can become tools with generated schemas.',
    'A framework can handle the model–tool message exchange.',
    'An MCP server publishes tools and their schemas.',
    'Remote-tool queries are sent to that server.'
], 'The lesson shows two ways to connect tools. With Microsoft Agent Framework, decorated Python functions can be serialised into schemas, and the framework handles the exchange between the model and the code. Tools may also come from a server using the Model Context Protocol, or MCP. The framework reads the server’s tool schemas and offers those tools alongside local ones. When a remote tool is used, the generated query is sent to that server.',(208,245),['T-K06'],'framework-and-mcp',visual('compare',('Local function','Function → generated schema → model'),('MCP server','Published tools and schemas → framework'),('Remote query','The query is sent to the tool server')))
slide(7,'Match tools to information or action','06 / MANAGED AGENT SERVICE',[
    'Knowledge tools include search and file retrieval.',
    'Action tools include function calling and code interpretation.',
    'A toolset groups available tools.',
    'Threads retain the conversation’s message history.'
], 'The source’s managed-service example groups tools into two categories. Knowledge tools include search and file retrieval. Action tools include function calling and code interpretation. A toolset makes multiple tools available together, while threads keep the history of a conversation. The service example also handles tool invocation and responses on the server. Keep the toolset and the thread distinct: one organises capabilities; the other retains messages.',(268,291),['T-K07'],'knowledge-and-action',visual('compare',('Knowledge tools','Search and file retrieval'),('Action tools','Function calls and code interpretation'),('Toolset / thread','Available capabilities / message history')))
slide(8,'Bound database access','07 / TRUSTWORTHY TOOL USE',[
    'Generated SQL can create injection or tampering risks.',
    'Configure restricted, read-only database access.',
    'Assign a read-only SELECT role where applicable.',
    'Use a secure execution environment.'
], 'Tools can touch real systems, so their permissions matter. The lesson highlights risks from model-generated SQL, including injection and database tampering. It recommends restricting database access to read-only operations and, for the database services it names, assigning a read-only select role. It also describes a secure environment and a read-only analytical database or warehouse. The implementation decision is concrete: the application’s database access should match the restricted reading task.',(329,333),['T-K08'],'read-only-security',visual('flow',('Generated SQL','Recognise injection and tampering risks'),('Restricted role','Read-only SELECT access'),('Protected execution','Secure environment and read-only data')))
slide(9,'What should the application do next?','ORIGINAL QUESTION / FOLLOW THE CALL',[
    'User asks for the current time in a city.',
    'Model returns get_current_time with location arguments.',
    'Is this already the final answer?',
    'Name the next two steps before revealing the solution.'
], 'Consider this original question based on the source’s time lookup. A user asks for the current time in a city. The model returns the function name get current time and the location arguments. Has the user’s question already been answered? Name the next two application steps before revealing the solution.',(61,192),['T-K04','T-K05'],'worked-question',visual('question',('Received','get_current_time(location = city)'),('Your decision','What must happen before the final answer?')),thinking_seconds=5)
slide(10,'Execute. Return. Then answer.','ORIGINAL QUESTION / SOLUTION',[
    'Execute get_current_time using the supplied location.',
    'Send its result back with the matching call identifier.',
    'Let the model use the result to produce the final answer.',
    'The tool call and the tool result are different messages.'
], 'The tool call is not yet the final answer. First, execute the selected function with the supplied location. Next, return its result to the model, preserving the call identifier used in the source example. The model can then use that result to answer the user. Recall the larger design: describe tools clearly, connect execution and messages, preserve state, and validate inputs and results.',(45,192),['T-K03','T-K04','T-K05'],'worked-answer',visual('flow',('Execute','Run the selected function with its arguments'),('Return','Attach the result to the matching call'),('Answer','Use the returned information')))

dump(ROOT/'_studio/slide-content.json',{'schema':1,'courseId':'study-studio-ai-agents-tool-use','title':'AI Agents: Tool Use in Practice','subtitle':'From a function schema to a grounded response','chapter_dir':CHAPTER.name,'language':'en-GB','source_title':'AI Agents for Beginners — Tool Use Design Pattern','source_short_title':'Microsoft AI Agents · Tool Use','source_url':LESSON,'source_commit':COMMIT,'license_file':'_source/MICROSOFT-MIT-LICENSE.txt','attribution':'Adapted from Microsoft AI Agents for Beginners. Copyright (c) Microsoft Corporation. MIT License.','slides':slides})

cardspec=[
('T-K01','Tool use','What is a tool in this design pattern?','Executable code, such as a function or an external API call, that an agent can use to perform an action.','Think of a capability implemented in code.','The model generates a function call; the corresponding code carries out the task.',27,29),
('T-K02','Use cases','Name two use cases for the Tool Use Design Pattern.','Examples include dynamic information retrieval, code execution, workflow automation, customer support, and content generation or editing.','The source groups five kinds of task.','Choose tools according to the task’s need to interact with external systems.',31,39),
('T-K03','Six building blocks','What are the six implementation building blocks?','Schemas; execution logic; message handling; tool integration; error handling and validation; state management.','Describe, invoke, connect, validate, remember.','Each addresses a different responsibility in the tool-use interaction.',41,55),
('T-K04','Schemas','What should a function/tool schema describe?','The tool’s name, purpose, required parameters and expected outputs.','It is a description of an available capability.','The source’s time-tool schema names get_current_time and requires a location string.',45,108),
('T-K05','Model capability','What three things are needed to implement function calling?','A model that supports function calling, function descriptions in a schema, and the code for every described function.','Capability, contract, implementation.','A schema alone cannot perform the function’s work.',63,67),
('T-K05','Function call','What does the model return when it selects a function?','The selected function’s name and arguments.','The call is an intermediate step.','The application executes the function, returns the result, and obtains the model’s response.',61,87),
('T-K05','Call/result matching','How does the source example connect a function result to its call?','The function_call_output includes the tool call’s call_id.','Retain the identifier.','The output contains the executed function’s result and the matching call identifier.',163,180),
('T-K06','Framework tools','How does the framework example turn a local function into a tool?','It uses a decorated Python function and serialises the function and its parameters into a schema.','The lesson illustrates an @tool decorator.','The framework also handles the back-and-forth model–code exchange.',208,216),
('T-K06','MCP','What does an MCP server publish for tool use?','Tools together with their schemas.','MCP means Model Context Protocol.','A framework can read those schemas and offer the remote tools alongside local ones; generated remote queries go to that server.',241,245),
('T-K07','Tool categories','Which categories of tools does the managed-service example identify?','Knowledge tools, such as search and file retrieval; and action tools, such as function calling and code interpretation.','Separate information access from the named action capabilities.','These are the categories used in the source’s service example.',278,289),
('T-K07','Toolset and thread','How do a toolset and a thread differ in the service example?','A toolset groups tools; a thread keeps the history of messages in a conversation.','Capabilities versus conversation history.','Grouping tools does not itself provide the conversation record.',291,291),
('T-K08','Read-only access','What database-access configuration does the lesson recommend for generated SQL?','Restricted, read-only access; a read-only SELECT role for the named database services, with a secure environment.','Make the access permissions match a reading task.','The recommendation addresses injection or tampering concerns by restricting what the application can do.',329,333),
]
cards=[]
for i,(kid,topic,question,answer,hint,explanation,a,b) in enumerate(cardspec,1):
    cards.append({'id':f'T-F{i:02}','knowledge_ids':[kid],'section':loc(a,b),'topic':topic,'question':question,'answer':answer,'hint':hint,'explanation':explanation,'pitfall':'','pages':[],'kind':'Concept'})

node_details=json.loads((ROOT/'_studio/node-details.json').read_text(encoding='utf-8'))
def node(id,label,summary,a,b,children=None):
    return {'id':id,'label':label,'summary':summary,'details':node_details[id],
            'source':{'title':'Microsoft AI Agents for Beginners — Tool Use Design Pattern',
                      'edition':f'Revision {COMMIT}', 'pdfPages':[], 'url':f'{LESSON}#L{a}-L{b}'},
            'section':loc(a,b),'pages':[],'children':children or []}
tree=node('T-root','Agent tool use','Describe a capability, select a function, execute it and return its result.',27,333,[
    node('T-K01','Executable capabilities','Tools are functions or API calls invoked in response to model-generated calls.',27,29),
    node('T-K02','Choose the use case','Information retrieval, code, workflows, support and content tasks.',31,39),
    node('T-K03','Six building blocks','The implementation combines distinct responsibilities.',41,55,[
        node('T-schema-exec','Describe + invoke','Schemas describe tools; execution logic governs invocation.',45,47),
        node('T-message-integrate','Connect','Message handling manages flow; integration connects the tools.',49,51),
        node('T-validation-state','Validate + retain','Handle failures and parameters; preserve context and earlier interactions.',53,55),
    ]),
    node('T-K04','Tool contract','Name, purpose, required parameters and expected output; the time example requires location.',45,108),
    node('T-K05','Function-call loop','A tool call is not the final user answer.',61,192,[
        node('T-call','Select','The model returns the selected function name and arguments.',61,87),
        node('T-execute','Execute','The application invokes the function’s code.',138,173),
        node('T-return','Return','Send the result with its matching call_id, then obtain the answer.',175,192),
    ]),
    node('T-K06','Local + remote tools','Frameworks can expose local functions and tools from an MCP server.',208,245,[
        node('T-local','Local function','A decorated function can be serialised to a schema.',208,216),
        node('T-mcp','MCP server','Publishes tools and schemas; remote queries go to the server.',241,245),
    ]),
    node('T-K07','Managed service','The source groups knowledge and action tools; toolsets group capabilities and threads retain messages.',268,291),
    node('T-K08','Read-only boundary','Restrict generated-SQL database access and use a secure environment.',329,333),
])
dump(ROOT/'_studio/chapter-studio.json',{'chapter':'4','title':'Tool Use Design Pattern','root':tree,'cards':cards})

questions=[]
def q(number,kids,topic,stem,options,answer,explanation,analysis,steps,a,b):
    questions.append({'id':f'T-Q{number:02}','number':number,'marks':1,'topic':topic,'subsection':loc(a,b),'pages':[],'learning_objectives':['LO-T04' if 'T-K08' in kids else 'LO-T02' if kids==['T-K02'] else 'LO-T01' if kids==['T-K01'] else 'LO-T03'],'knowledge_points':kids,'format':'mcq','difficulty':'Application' if number in [3,4,7,10] else 'Foundation','scenario_id':None,'scenario_title':None,'scenario':None,'stem':stem,'statements':[],'options':dict(zip('ABCD',options)),'answer':answer,'explanation':explanation,'option_analysis':dict(zip('ABCD',analysis)),'steps':steps,'exam_tip':'','pitfall':'','original':True})
q(1,['T-K01'],'Tool definition','Which option best describes a tool in the source’s design pattern?',['Only a sentence in the system prompt','A final answer already written by the model','Executable code such as a function or an API call','A replacement for all conversation messages'],'C','A tool is code that can be executed to perform actions, including simple functions and external API calls.',['A description can explain a tool, but it is not the executable capability.','A final answer is distinct from the tool.','This matches the source definition.','The pattern still needs message handling.'],['Identify the executable capability.'],27,29)
q(2,['T-K04'],'Function schema','In the source’s get_current_time schema, which input is required?',['call_id as a city name','location as a string','A completed final answer','A database administrator password'],'B','The source’s function schema defines location as a string and lists it as required.',['call_id matches calls and results; it is not the location parameter.','This matches the schema.','The answer is produced after the tool interaction.','This is not a parameter of the illustrated tool.'],['Read the parameters and required list.'],84,108)
q(3,['T-K05'],'Original scenario','An agent returns a function name and location arguments for a time lookup. What should the application do next?',['Display the function name as the current time','Skip execution and invent the tool result','Delete the conversation context','Execute the selected function with those arguments'],'D','Original scenario: the returned call requests execution. The function’s result must then be returned to the model.',['The function name is not the requested information.','The source requires executing the function.','The example preserves messages for the next turn.','This is the next step in the source’s loop.'],['Distinguish a tool call from a final answer.','Invoke the function.'],61,173)
q(4,['T-K05'],'Result matching','Which field links the function_call_output to its corresponding function call in the source example?',['call_id','The slide number','The course title','The function description alone'],'A','The returned function_call_output copies the tool call’s call_id.',['This is the matching identifier in the example.','Slides are not part of the source call protocol.','The course title is unrelated to matching.','The description explains the tool; it does not identify this call.'],['Inspect the returned output message.'],175,180)
q(5,['T-K02'],'Use cases','Which source use case fits an agent coordinating a scheduler and an email service in a repetitive process?',['A standalone time lookup','Workflow automation','Function-schema naming alone','Conversation history storage'],'B','Original scenario: the source describes workflow automation as integrating tools such as schedulers, email services or data pipelines.',['This does not describe the coordinated process in the question.','This matches the source use case.','Naming alone does not carry out the process.','Retaining messages is a separate responsibility.'],['Identify the multi-step or repetitive process.','Match it to the source use case.'],33,39)
q(6,['T-K03'],'Validation','Which building block validates parameters and manages unexpected tool responses?',['Course navigation','Tool naming alone','Error handling and validation','The lesson’s video thumbnail'],'C','The source explicitly assigns failures, parameter validation and unexpected responses to this building block.',['Navigation is outside the listed runtime responsibilities.','A name alone does not perform validation.','This matches the source.','The thumbnail is a learning resource, not runtime validation.'],['Identify the handling responsibility.'],53,53)
q(7,['T-K06'],'Remote tools','What does the MCP server provide for the framework to load?',['Tools together with their schemas','Only a final response for every possible request','A guarantee that every query remains local','A replacement for the model’s task selection'],'A','An MCP server publishes tools and their schemas, which the framework can offer alongside local tools.',['This matches the source description.','Published tools still need to be selected and used.','The source says remote-tool queries are sent to that server.','The agent still decides when to call available tools.'],['Identify what is published.','Separate tool availability from execution.'],241,245)
q(8,['T-K07'],'Service categories','Which pairing matches the source’s managed-service tool categories?',['Code Interpreter = knowledge; File Search = action','Every tool belongs only to a thread','Function Calling = knowledge; search = action','File Search = knowledge; Code Interpreter = action'],'D','File Search appears under knowledge tools; Code Interpreter appears under action tools.',['This reverses the listed categories.','A thread keeps message history; it is not a category.','This reverses the listed categories.','Both entries match the source list.'],['Read each source category.'],278,289)
q(9,['T-K07'],'State and capabilities','Which statement correctly distinguishes a toolset from a thread?',['A thread groups tools; a toolset stores messages','A toolset groups tools; a thread retains conversation history','Both mean the final model answer','Neither is used by the source’s service example'],'B','The source says tools can be used together as a toolset and threads track the message history of a conversation.',['This reverses their roles.','This matches the stated roles.','Neither term means the final answer.','Both are named in the example.'],['Separate available capabilities from message history.'],291,291)
q(10,['T-K08'],'Original access scenario','An agent is intended to answer questions by reading a database. Which access arrangement follows the lesson’s recommendation?',['Give it permission to drop tables so every request succeeds','Use unrestricted database administration access','Assign restricted read-only access, such as a SELECT role','Rely on the tool’s name instead of database permissions'],'C','Original scenario: the lesson recommends read-only database configuration and a read-only SELECT role for the named database services.',['Dropping tables exceeds the source’s reading boundary.','Unrestricted administration conflicts with the recommendation.','This implements the stated restricted reading access.','Naming is not the permission configuration described.'],['Identify the intended reading task.','Apply the source’s restricted access recommendation.'],329,333)
dump(ROOT/'_studio/chapter-questions.json',{'chapter':'4','title':'Tool Use Design Pattern','questions':questions})
dump(ROOT/'study-hub.json',{'schema':1,'courseId':'study-studio-ai-agents-tool-use','courseTitle':'AI Agents: Tool Use in Practice','courseSubtitle':'MICROSOFT AI AGENTS FOR BEGINNERS · OPEN COURSE SAMPLE','contentVersion':DATE+'.1','storageKey':'study-studio.ai-agents-tool-use.v1','downloadPrefix':'AgentToolUse','timeZone':'UTC','chapters':[{'id':'4','number':4,'title':'Tool Use Design Pattern','studio':'_studio/chapter-studio.json','questions':'_studio/chapter-questions.json'}]})

excerpts=json.loads((ROOT/'_source/selected-excerpts.json').read_text(encoding='utf-8'))
source_parts=[]
for part in excerpts:
    source_parts.append(f"## Original lines {part['start']}–{part['end']}\n\n[Upstream locator]({LESSON}#L{part['start']}-L{part['end']})\n\n{part['text']}")
write(CHAPTER/'Chapter_Source.md',f'''# Source excerpts — Tool Use Design Pattern

Microsoft **AI Agents for Beginners**, lesson 04. Copyright (c) Microsoft Corporation. [MIT License](../_source/MICROSOFT-MIT-LICENSE.txt).

Revision: `{COMMIT}`. The excerpts below preserve the original text in each stated range. They are selected source passages, not a continuous reproduction of the whole lesson. Images, logos, video embeds, external resource lists and deployment code are not reproduced.

{chr(10).join(source_parts)}
''')

index=json.loads((ROOT/'_source/curriculum-index.json').read_text(encoding='utf-8'))
index_rows=[]
for item in index:
    status='Full README and its two explanatory diagrams read' if item['number']=='04' else 'Index only'
    index_rows.append(f"| {item['number']} | [{item['title']}]({BASE}/{item['path']}) | README L{item['line']} | {status} |")
write(ROOT/'Outline.md',f'''# AI Agents for Beginners — Tool Use study outline

## Source and scope

Microsoft’s open course **AI Agents for Beginners**, revision `{COMMIT}`, provides the source for this demonstration. The selected chapter is **04 — Tool Use Design Pattern**. Source references use Markdown line numbers; there are no invented printed pages.

The course overview introduces the fundamentals of building agents and presents each lesson as a topic that can be studied separately. It provides written lessons, videos, Python examples and further links. The selected lesson connects tool descriptions, model-generated calls, executable functions and returned results.

## Course index

The index preserves the provider’s lesson order. Reading coverage is explicit.

| Lesson | Original title | Curriculum locator | Coverage |
|---|---|---|---|
{chr(10).join(index_rows)}

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
''')

write(ROOT/'Syllabus.md',f'''# Tool Use — Official lesson goals

## Applicability

Provider: Microsoft. Course: **AI Agents for Beginners**. Lesson: **04 — Tool Use Design Pattern**. Source revision: `{COMMIT}`. Checked: {DATE}. This is non-examination study of an open course.

## Official evidence

| Source | What it establishes | Direct locator |
|---|---|---|
| Lesson learning goals | Four stated learning goals for this chapter | [README L18–25]({LESSON}#L18-L25) |
| Course overview | Lessons cover the fundamentals of building agents and each covers its own topic | [Course README L50–56]({BASE}/README.md#L50-L56) |
| Lesson contents | Written lesson, short video, Python examples and further resources | [Course README L87–91]({BASE}/README.md#L87-L91) |

## Learning-goal mapping

These local IDs organise the sample; they are not qualification codes.

| ID | Provider goal, accurately summarised | Knowledge IDs |
|---|---|---|
| LO-T01 | Define the Tool Use Design Pattern and its purpose. | T-K01 |
| LO-T02 | Identify applicable use cases. | T-K02 |
| LO-T03 | Understand the key implementation elements. | T-K03–T-K07 |
| LO-T04 | Recognise considerations for trustworthy agent tool use. | T-K08 |

## Practice design

This sample uses ten original single-answer questions, one practice mark each, with untimed study. These are sample teaching choices. The official goals above determine coverage; the generated questions and distribution are authored for this demonstration.

## Study priorities

The function-call loop is the central implementation sequence. Distinguish a function description from executable code, a tool call from a final answer, and a toolset from a conversation thread. Apply the source’s read-only database permissions to the reading tasks it discusses.
''')

knowledge=[
('T-K01','Tool Use Design Pattern','Tools are executable functions or API calls used in response to model-generated function calls.',27,29,'S01','T-F01','T-Q01'),
('T-K02','Use cases','The chapter lists dynamic retrieval, code execution, workflow automation, customer support, and content generation/editing.',31,39,'S02','T-F02','T-Q05'),
('T-K03','Implementation building blocks','Schemas, execution logic, message handling, integration, error handling/validation, and state management have distinct roles.',41,55,'S03, S10','T-F03','T-Q06'),
('T-K04','Function schema','Describe name, purpose, required parameters and expected outputs; the example requires a location string.',45,108,'S04, S09–S10','T-F04','T-Q02'),
('T-K05','Function-call loop','The model selects name and arguments; code runs; the matching result returns; the model uses it to answer.',59,192,'S01, S04–S05, S09–S10','T-F05–T-F07','T-Q03–T-Q04'),
('T-K06','Local and MCP tools','A framework can serialise decorated functions; an MCP server publishes tools and schemas for remote use.',208,245,'S06','T-F08–T-F09','T-Q07'),
('T-K07','Service capabilities and state','The service example distinguishes knowledge/action tools, groups tools into toolsets, and keeps messages in threads.',268,291,'S07','T-F10–T-F11','T-Q08–T-Q09'),
('T-K08','Restricted database access','For generated SQL, configure read-only access, assign a SELECT role where applicable, and use a secure environment.',329,333,'S08','T-F12','T-Q10'),
]
knowledge_rows='\n'.join(f'| {id} | {term} | {text} | [L{a}–{b}]({LESSON}#L{a}-L{b}) |' for id,term,text,a,b,*_ in knowledge)
coverage_rows='\n'.join(f'| {id} | {slides_} | {id} | {cards_} | {questions_} |' for id,term,text,a,b,slides_,cards_,questions_ in knowledge)
write(CHAPTER/'CharpterReview.md',f'''# Tool Use Design Pattern — Chapter review

## Source and goals

Microsoft **AI Agents for Beginners**, lesson 04, revision `{COMMIT}`. [Source chapter]({LESSON}). Copyright (c) Microsoft Corporation; MIT License. References are original Markdown lines. The four official lesson goals are mapped in [Syllabus](../Syllabus.md).

## Conceptual framework

The user supplies a task. The model receives descriptions of available tools and may request one by name and arguments. Executable code performs the operation. The result returns to the model, which uses it in the response. Message handling, integration, validation and retained state support this loop.

## Section-by-section knowledge

| Knowledge ID | Concept | Teaching explanation | Source |
|---|---|---|---|
{knowledge_rows}

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
{coverage_rows}

Review the map’s responsibilities, retrieve the twelve cards, then complete the ten original questions. Use the explanations to identify which part of the request–call–result–answer sequence needs more work.
''')

write(ROOT/'SOURCE.md',f'''# Source and attribution

This demonstration adapts **Microsoft, AI Agents for Beginners**, chapter **04 — Tool Use Design Pattern**, under the MIT License.

- [Upstream repository](https://github.com/microsoft/ai-agents-for-beginners)
- [Frozen chapter]({LESSON}) at commit `{COMMIT}`
- [Upstream MIT License]({BASE}/LICENSE)
- [Included Microsoft copyright and permission notice](_source/MICROSOFT-MIT-LICENSE.txt)
- Copyright (c) Microsoft Corporation.
- Checked: {DATE}.

The course is an open educational resource for agent development. This sample covers the selected chapter’s pattern, use cases, building blocks, function-call sequence, framework/MCP integration, managed-service categories and database permissions. The chapter README and its two explanatory diagrams were read; other chapter bodies, linked notebooks, videos and external documentation are outside this reading scope.

Public [source excerpts](Chapter%2004%20-%20Tool%20Use/Chapter_Source.md) retain the original text in stated ranges. The generated review, slide organisation, original questions and diagram layouts are adaptations. The samples use no source logos, source photographs, video thumbnails or copied diagram artwork. Raw source READMEs and the viewed diagrams remain local production evidence and are excluded from publication.

The teaching materials describe the frozen chapter’s design and examples. No service credentials are included. The chapter’s provider calls are not executed by this sample. Exact hashes, coverage and production decisions are in [Studio.json](Studio.json) and [_studio/CONTENT_VALIDATION.md](_studio/CONTENT_VALIDATION.md).
''')

dump(ROOT/'Studio.json',{'schema':1,'courseId':'study-studio-ai-agents-tool-use','title':'AI Agents: Tool Use in Practice','language':'en-GB','version':DATE+'.1','timeZone':'UTC',
 'source':{'title':'AI Agents for Beginners — Tool Use Design Pattern','institution':'Microsoft','kind':'open agent-development course','repository':'https://github.com/microsoft/ai-agents-for-beginners','commit':COMMIT,'url':LESSON,'licence':'MIT','copyright':'Copyright (c) Microsoft Corporation.','licenceFile':'_source/MICROSOFT-MIT-LICENSE.txt','checked':DATE,'sha256':json.loads((ROOT/'_source/original-sha256.json').read_text(encoding='utf-8'))},
 'scope':{'curriculumOverview':'overview and complete 18-lesson index read','wholeCourseRead':False,'selectedLessonRead':'README lines 1–360, functioncalling-diagram.png and agent-service-in-action.jpg','notebooksVideosExternalDocs':'not read or executed','publicExcerpts':[[p['start'],p['end']] for p in excerpts]},
 'chapters':[{'id':'4','number':4,'upstreamLesson':'04','title':'Tool Use Design Pattern','locatorType':'markdown-lines','originalRange':[1,360],'printedPages':None,'sourcePath':'Chapter 04 - Tool Use/Chapter_Source.md','reviewPath':'Chapter 04 - Tool Use/CharpterReview.md','closeReadingStatus':'complete for selected README and two explanatory diagrams','knowledgePoints':8,'flashcards':12,'originalQuestions':10,'slides':10}],
 'modules':{'outline':'authored','syllabus':'authored: four provider goals','chapterReview':'authored','hubData':'authored','slidesAndNarrationData':'authored','PowerPoint':'pending media production','video':'pending media production','overview':'pending media production','practicePDF':'pending media production','StudyHub':'pending build and browser validation'},
 'productionNotes':['The sample teaches the design and source-described examples, not a runnable provider integration.','The source has a syntactically joined CodeInterpreterTool()toolset.add(...) expression at L321 and an illustrative function body with ellipsis at L227; those implementation snippets are not executed or repaired.','Source diagrams include vendor marks and older framework visuals; they were inspected as evidence but are not copied into the showcase.','No third-party remote tool service was contacted.','The full curriculum has not been read; the complete index provides navigation only.'],
 'delivery':{'publicRepository':'https://github.com/Moonaria123/Codex-Study-Studio','studyHub':'StudyHub.html'}})
write(ROOT/'_studio/CONTENT_VALIDATION.md',f'''# Content validation — {DATE}

## Evidence and scope

Source: Microsoft AI Agents for Beginners, commit `{COMMIT}`, MIT. The entire selected 360-line README, its two explanatory diagrams, and the course overview/18-lesson index were read. External links, notebooks and videos were not used as additional knowledge sources. The teaching outputs are source-grounded summaries and original questions, not a claim of whole-course coverage.

## Decisions

- All eight knowledge IDs map to original Markdown ranges; there are no invented printed pages.
- The chapter has no mathematical formulas. No extra mathematical or security framework was added.
- The schema/call/execution/result/final-answer distinction follows the source text and its message example.
- Source framework/managed-service descriptions are tied to the frozen reading. No claim is made that their SDK snippets ran or represent newly tested APIs.
- The source implementation snippets include an ellipsis and a syntactically joined statement at L321. Those snippets are not run, silently fixed or promoted as executable sample code.
- The two source diagrams were visually checked but not reused. They contain vendor marks and older framework imagery. All showcase diagrams are original layouts derived from the reviewed text.
- No remote MCP server, paid provider or database was called. The source’s provider setup and remote-service availability claims were not treated as execution authority.
- Raw READMEs and source diagram images are local evidence only. Public selected excerpts and source hashes preserve traceability.

## Teaching checks

Ten slides, twelve flashcards and ten original four-option questions share stable source references. Questions include one declared correct choice, an explanation, option analysis and reasoning steps. The original time-lookup example invents no current time. The read-only example is hypothetical and applies only the source’s stated access arrangement.

## Remaining delivery checks

Media rendering, narration listening, subtitle timing and StudyHub browser behaviour are validated separately. Pending fields in Studio.json are updated only when those checks run.
''')

def walk(node):
    yield node
    for child in node['children']:
        yield from walk(child)

if __name__=='__main__':
    print(json.dumps({'slides':len(slides),'narration_words':sum(len(s['narration'].split()) for s in slides),'map_nodes':len(list(walk(tree))),'cards':len(cards),'questions':len(questions),'course_index':len(index)}))
