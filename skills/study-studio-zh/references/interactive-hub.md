# 交互式 Study Hub

请求包含统一交互 HTML 时使用本参考文件。附带引擎生成一个不依赖外部资源的 HTML 文件，支持：

- 可展开、搜索、缩放的思维导图，持久保存节点和视图状态，导出 PNG／SVG；
- 可编辑闪卡库、回忆／自评、筛选、保存进度和不可变检查点；
- A–D 四选一题，练习模式和可选的限时考试模式；
- 自动／手动保存，页内退出时明确保存／放弃，作答历史，可打印错题本，完整 JSON 备份／恢复，以及可选的 HTML 历史归档。

完整 JSON 备份是恢复格式。HTML 历史归档仅含历史快照，是附加的阅读／合并格式。

附带界面标签为英文。课程内容可以采用原书语言，但其他界面语言需要专门本地化，并执行同样的行为和移动端检查；当前构建器不自动翻译界面。

导图、卡片、题目、答案与解释必须以目标原书为依据。官方考纲可以指导覆盖、重点和考试形式，但不能补充书中没有的事实。来源定位和原创题标识保持简短；学习内容不加入泛化的保护性声明。

## 目录与构建约定

将网页注册表和源 JSON 放在课程阅读目录内，在该目录构建唯一 HTML：

    python "<skill-dir>/scripts/build_study_hub.py" --registry "<course-dir>/study-hub.json" --output "<course-dir>/StudyHub.html"

除非传入 `--overwrite`，构建器拒绝替换已有 HTML。覆盖已交付网页前，先在课程备份区保留旧文件；需要原地更新时保留网盘文件 ID。

构建器还生成 `OUTPUT.html.manifest.json`，记录校验值、存储命名空间和章节／模块数量。它仅使用 Python 标准库。

## 注册表

课程级标识是持久化约定：

- `courseId` 标识可兼容的完整备份。
- `storageKey` 是浏览器本地存储命名空间；后续增加章节时保持不变。
- `contentVersion` 标识内嵌内容版本；内容变化时递增。
- `downloadPrefix` 是安全文件名前缀，仅含字母、数字、点、下划线或连字符。
- `timeZone` 是显示时间戳和下载日期所用的 IANA 时区；采用用户选择的课程时区，下文的 UTC 仅为示例，不是地域预设。

构建器通过 Python 标准 `zoneinfo` 数据库校验 `timeZone`。若宿主缺少指定 IANA 时区，报告限制，并在具备相应系统时区数据的环境构建；不要默默安装 tzdata。

每章可以提供 `studio`、`questions` 或两者。studio 文件可以包含导图 `root`、`cards` 或两者。缺失或空内容不显示为该章可用模块。`examDurationMinutes` 可省略；省略时只提供不限时练习。

注册表示例（英文示例课程数据；字段名属于固定接口）：

```json
{
  "schema": 1,
  "courseId": "sample-biology",
  "courseTitle": "Foundations of Biology",
  "courseSubtitle": "SAMPLE COURSE",
  "contentVersion": "2026-11-01.1",
  "storageKey": "study-studio.sample-biology.v1",
  "downloadPrefix": "Biology",
  "timeZone": "UTC",
  "chapters": [
    {
      "id": "1",
      "number": 1,
      "title": "Cells",
      "studio": "Chapter 01/chapter-studio.json",
      "questions": "Chapter 01/chapter-questions.json"
    }
  ]
}
```

相对输入路径从注册表所在目录解析。章节 ID 可含字母、数字、点、下划线和连字符，须以字母或数字开头，并保持稳定。

## Studio JSON

导图节点 ID 和闪卡 ID 在章内唯一，跨版本稳定。`pages` 始终指阿拉伯数字印刷页码，是正整数数组。对于罗马数字前言、电子书位置、命名章节或无分页来源，将定位文字写入 `section`（题目使用 `subsection`），`pages` 使用空数组。明确标记的原创或个人材料也可以使用空页码数组。

```json
{
  "chapter": "1",
  "title": "Cells",
  "root": {
    "id": "c1-root",
    "label": "Cells",
    "summary": "Cells are the basic structural and functional units of life.",
    "section": "1",
    "pages": [3],
    "children": [
      {
        "id": "c1-membrane",
        "label": "Cell membrane",
        "summary": "A selectively permeable boundary.",
        "section": "1.1",
        "pages": [4],
        "children": []
      }
    ]
  },
  "cards": [
    {
      "id": "C1F01",
      "section": "1.1",
      "topic": "Cell membrane",
      "question": "What is selective permeability?",
      "answer": "It permits some substances to cross more readily than others.",
      "hint": "Think about controlled movement.",
      "explanation": "Membrane composition and transport proteins affect passage.",
      "pitfall": "Selective does not mean completely impermeable.",
      "pages": [4],
      "kind": "Definition"
    }
  ]
}
```

仅闪卡的章节可以省略 `root`；仅导图的章节可以省略 `cards` 或将其留空。导图节点还可以有可选字符串字段 `exam`。

## 节点释义与来源索引

为每个新制作的节点提供有实质内容的 `details` 字符串，以及核实过的 `source` 对象。`summary` 用于简要引入，`details` 用纯文本分段解释知识，唯一依据是目标原书。讲清原书支持的定义、机制、条件、区别或推理步骤，不能用通用学习指令、相邻节点列表代替详细释义。

- `details`：非空纯文本，段落以 `\n\n` 分隔，不渲染 HTML。
- `source.title`：核实过的书籍／文档标题。
- `source.edition`：核实过的版本或固定文档修订。
- `source.pdfPages`：从 1 开始的正整数 PDF **文件页序**；非 PDF 材料使用 `[]`。
- `source.url`：可选 HTTP(S) 网址或相对文档路径，例如 `../book.pdf#page=18`；尽量链接固定版本。来源只在学习者主动点击时打开，网页不自动抓取。

`section` 继续存放小节或其他来源定位（包括 Markdown 行号范围），`pages` 继续存放**印刷页码**。必须对照文档核实印刷页与 PDF 文件页的映射，不能预设通用偏移量。本地原书路径只写入对应课程数据，不写入通用技能。

构建器兼容没有这些字段的旧节点，仍可显示原摘要和来源定位；新制作的节点应包含完整释义与来源索引。扩充既有导图时保留节点 ID 和存储键。

交互方式：单击切换分支，双击／触屏双击打开详情且不切换分支，键盘 Shift+Enter 打开详情。叶节点也可单击或 Enter 打开。Escape 关闭并归还焦点；窄屏详情可滚动，切换节点时回到详情顶部。

## 题目 JSON

附带测验引擎仅支持从恰好四个字符串选项 A、B、C、D 中选择一个答案。不能将多选、自由作答、匹配或数值填空伪装成已支持类型。使用新题型前须扩展引擎并单独测试。

```json
{
  "chapter": "1",
  "title": "Cells",
  "questions": [
    {
      "id": "C1Q01",
      "number": 1,
      "marks": 1,
      "topic": "Cell membrane",
      "subsection": "1.1",
      "pages": [4],
      "learning_objectives": ["LO1"],
      "knowledge_points": ["Selective permeability"],
      "format": "mcq",
      "difficulty": "Foundation",
      "scenario_id": null,
      "scenario_title": null,
      "scenario": null,
      "stem": "Which statement best describes selective permeability?",
      "statements": [],
      "options": {
        "A": "Every substance crosses at the same rate.",
        "B": "No substance can cross.",
        "C": "Some substances cross more readily than others.",
        "D": "Only water can cross."
      },
      "answer": "C",
      "explanation": "A selectively permeable membrane controls relative ease of passage.",
      "option_analysis": {
        "A": "This removes selectivity.",
        "B": "This describes impermeability.",
        "C": "This is the defining idea.",
        "D": "Many substances besides water can cross."
      },
      "steps": ["Identify the meaning of selective.", "Choose the option describing different permeability."],
      "exam_tip": "Distinguish selective permeability from total blockage.",
      "pitfall": "Do not equate selective with water-only.",
      "original": true
    }
  ]
}
```

可选字符串、列表和映射字段由构建器规范为空值。必填字段为 `id`、`stem`、`options`、`answer`、正数 `marks` 和合法 `pages`。

## 添加或修订章节

1. 保留 `courseId`、`storageKey`、既有章节 ID、节点／卡片／题目 ID 和答案语义。
2. 增加或修改章节源 JSON，再更新注册表，递增 `contentVersion`。
3. 构建到暂存文件名，不使用 `--overwrite`。
4. 除新模块外，还测试既有备份导入和已保存进度恢复。
5. 备份已交付 HTML，按请求替换或上传新版。网盘写入后检查字节大小、名称、MIME 和父目录。

草稿冻结作答开始时的章节内容。历史快照保持不可变。稳定 ID 使错题计数、过去作答和未来内容可预测地共存。

## 验证

至少检查：

- 构建成功，清单与注册表一致；
- 打开 HTML 无控制台错误及网络请求；
- 每章每个可用工具均能打开；
- 导图状态跨刷新保留，两种导出按钮均工作；
- 闪卡自评和题目选择跨刷新保留，保存、继续、放弃与标签一致；
- 未完成考试时隐藏反馈；
- 完整 JSON 备份往返恢复导图、草稿、历史、卡片编辑和主题；
- 重复导入历史不增加错题次数；
- 历史快照、错题本和打印内容在桌面及 360 px 宽度下可读。

直接关闭标签页时，浏览器不能显示自定义三选项弹窗。网页通过可见性／页面生命周期事件自动保存；网页自身的退出操作提供 Save and exit、Discard progress 和 Keep studying。
