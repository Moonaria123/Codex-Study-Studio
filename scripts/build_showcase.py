"""Build the bilingual static showcase; no external assets or build dependencies."""

from pathlib import Path
from html import escape
import json

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "examples/ai-agents-tool-use"
REPO = "https://github.com/Moonaria123/Codex-Study-Studio"
CHAPTER = REPO + "/blob/main/examples/ai-agents-tool-use/Chapter%2004%20-%20Tool%20Use/"
YOUTUBE = "https://www.youtube.com/watch?v=aLF_IylZ3y8"

COPY = {
    "en": {
        "lang": "en", "other": "zh.html", "switch": "简体中文",
        "nav": ["Explore", "Workflow", "Install"],
        "eyebrow": "A SOURCE-AVAILABLE LEARNING WORKSPACE",
        "title": "Give your next book<br>a life beyond the page.",
        "intro": "Source-grounded lessons. Connected study tools. A place to keep learning. Turn a textbook into a complete Study Studio with two bilingual Codex skills.",
        "cta": "Try the live studio", "install": "Get the skills",
        "strip": ["English + 中文", "Free for noncommercial use", "Works offline", "Your records, exportable"],
        "demoLabel": "01 / THE OPEN LESSON", "demoTitle": "From intent to action.",
        "demoText": "Explore tool use in AI agents, adapted from Microsoft's MIT-licensed AI Agents for Beginners curriculum. Follow one source through every learning format.",
        "tiles": [("01", "See the connections", "Double-click a concept for its explanation and source index. Expand, search and return to your saved view.", "Open mind maps"), ("02", "Make it stick", "Recall the idea, reveal the answer and mark what needs another pass.", "Explore flashcards"), ("03", "Test your understanding", "Work through original questions, inspect explanations and revisit your mistakes.", "Try the practice quiz")],
        "counts": ["teaching slides", "knowledge-map nodes", "recall cards", "original questions"],
        "watchLabel": "02 / WATCH THE LESSON", "watchTitle": "A small window into the studio.",
        "watchText": "A 15-second excerpt from the narrated lesson, cut from the full teaching video. Press play for sound, or explore the complete source-linked materials below.",
        "download": "Download 15-second MP4", "full": "Watch the full lesson on YouTube", "gif": "View the animated preview",
        "workflowLabel": "03 / A TRACEABLE WORKFLOW", "workflowTitle": "From first read to confident recall.",
        "steps": [("Read & index", "Establish the edition, structure and source locations."), ("Map the goals", "Verify official learning requirements where applicable."), ("Review closely", "Build the chapter's concepts, distinctions and worked examples."), ("Create & connect", "Produce the requested modules and a single, lasting study hub.")],
        "libraryLabel": "04 / THE RESOURCE SHELF", "libraryTitle": "Open the work behind the demo.",
        "resources": [("Reading outline", "Outline.md"), ("Learning requirements", "Syllabus.md"), ("Chapter review", "CharpterReview.md"), ("Editable PowerPoint", "Lecture.pptx"), ("Slide PDF", "Lecture.pdf"), ("Narration script", "LectureScript.md"), ("Knowledge overview", "Knowledge_Overview.png"), ("Practice & answers", "Practice_and_Answers.pdf")],
        "installLabel": "05 / MAKE IT YOURS", "installTitle": "Choose your way in.",
        "installText": "English and Chinese packages are complete and independent. Install one or both. The bundled study-hub interface starts in English.",
        "methods": ["Ask Codex", "Download a ZIP", "Clone & install", "Bundled installer"],
        "prompt": "Use $skill-installer to install the skill from\nhttps://github.com/Moonaria123/Codex-Study-Studio/tree/main/skills/study-studio-en",
        "zipText": "Extract the skill folder into ~/.codex/skills/ or %USERPROFILE%\\.codex\\skills\\. Keep the folder containing SKILL.md intact.",
        "enZip": "English package", "zhZip": "Chinese package", "allMethods": "Full instructions for Windows, macOS and Linux →",
        "storageTitle": "Keep your learning with you.",
        "storageText": "The study hub stores progress in your browser. Export a complete JSON backup to move between devices or between this website and a downloaded HTML copy. Your map views, drafts, card edits and history travel together.",
        "footer": "Made by Moonaria123 · v1.0.0. Noncommercial use under PolyForm; commercial use outside its permissions requires written authorisation. Redistributed copies must retain the original author notice.", "licence": "Noncommercial licence", "source": "Source & attribution", "verify": "Verification record"
    },
    "zh": {
        "lang": "zh-CN", "other": "index.html", "switch": "English",
        "nav": ["体验样例", "工作流程", "安装技能"],
        "eyebrow": "源码公开的个人学习工作室",
        "title": "让下一本书，<br>成为学习的新起点。",
        "intro": "有出处的讲解、互相连接的学习工具、可以带走的学习记录。用中英文双版 Codex 技能，把一本教材变成完整的 Study Studio。",
        "cta": "体验交互学习网页", "install": "获取技能",
        "strip": ["English + 中文", "非商业用途免费", "可离线使用", "学习记录完整导出"],
        "demoLabel": "01 / 开放教材样例", "demoTitle": "从理解意图，到调用工具。",
        "demoText": "样例改编自 Microsoft 采用 MIT 许可的 AI Agents for Beginners 开放课程。以 AI Agent 工具调用为主题，看看同一份知识如何贯穿各种学习资源。",
        "tiles": [("01", "看见知识的联系", "双击节点查看详细释义与来源索引。展开、搜索知识导图，并保留原来的视图。", "体验知识导图"), ("02", "让知识留在记忆中", "先回想，再翻面查看答案；标记需要重温的概念。", "体验交互闪卡"), ("03", "检验自己的理解", "完成原创练习，阅读逐项解析，在错题本中回顾薄弱环节。", "体验原创测试")],
        "counts": ["教学幻灯片", "知识导图节点", "复习闪卡", "原创练习题"],
        "watchLabel": "02 / 观看教学片段", "watchTitle": "用 15 秒，走进学习工作室。",
        "watchText": "这段预览剪辑自完整的有声讲解视频。点击播放即可听取讲解，也可以继续查看下方带来源定位的完整资源。",
        "download": "下载 15 秒 MP4", "full": "在 YouTube 观看完整课程", "gif": "查看动态预览",
        "workflowLabel": "03 / 可追溯的制作流程", "workflowTitle": "从阅读，到理解，再到掌握。",
        "steps": [("读取与索引", "确认版本、章节结构和准确的原文位置。"), ("映射学习要求", "适用时核实官方考纲与学习成果。"), ("逐章精读", "整理概念、辨析、公式和有依据的例题。"), ("制作与连接", "按需生成资源，持续扩展同一个学习网页。")],
        "libraryLabel": "04 / 样例资源书架", "libraryTitle": "打开每一份真实产物。",
        "resources": [("阅读纲要", "Outline.md"), ("学习要求", "Syllabus.md"), ("章节精读评述", "CharpterReview.md"), ("可编辑 PowerPoint", "Lecture.pptx"), ("课件 PDF", "Lecture.pdf"), ("逐页讲稿", "LectureScript.md"), ("知识概览图", "Knowledge_Overview.png"), ("原创练习与答案", "Practice_and_Answers.pdf")],
        "installLabel": "05 / 开始你的学习工作室", "installTitle": "选择适合你的安装方式。",
        "installText": "中英文技能包均完整独立，可安装一个，也可同时安装。附带的学习网页界面初始为英文。",
        "methods": ["让 Codex 安装", "下载 ZIP", "克隆后安装", "内置安装脚本"],
        "prompt": "使用 $skill-installer 安装这个技能：\nhttps://github.com/Moonaria123/Codex-Study-Studio/tree/main/skills/study-studio-zh",
        "zipText": "将技能文件夹解压到 ~/.codex/skills/ 或 %USERPROFILE%\\.codex\\skills\\，保留含 SKILL.md 的完整文件夹。",
        "enZip": "英文技能包", "zhZip": "中文技能包", "allMethods": "查看 Windows、macOS 与 Linux 的完整安装说明 →",
        "storageTitle": "把学习记录带在身边。",
        "storageText": "学习网页将进度保存在当前浏览器中。导出完整 JSON 备份，即可在不同设备、在线网页和离线 HTML 之间迁移；导图视图、未完成练习、闪卡编辑和历史记录一并保留。",
        "footer": "由 Moonaria123 制作 · v1.0.0。按 PolyForm 许可供非商业使用；超出许可范围的商业使用须取得书面授权。再分发时须保留原作者声明。", "licence": "非商业使用许可", "source": "来源与署名", "verify": "验证记录"
    }
}


def build(language):
    c = COPY[language]
    readme = "README.md" if language == "en" else "README.zh-CN.md"
    skill_lang = "en" if language == "en" else "zh"
    tiles = "".join(f'<a class="tool-card" href="demo/StudyHub.html"><span class="card-no">{n}</span><h3>{t}</h3><p>{p}</p><span class="text-link">{a} <b>↗</b></span></a>' for n,t,p,a in c["tiles"])
    studio = json.loads((COURSE / "_studio/chapter-studio.json").read_text(encoding="utf-8"))
    slides = json.loads((COURSE / "_studio/slide-content.json").read_text(encoding="utf-8"))["slides"]
    questions = json.loads((COURSE / "_studio/chapter-questions.json").read_text(encoding="utf-8"))["questions"]
    def node_count(node):
        return 1 + sum(node_count(child) for child in node.get("children", []))
    counts = (len(slides), node_count(studio["root"]), len(studio["cards"]), len(questions))
    metrics = "".join(f'<div><strong>{n}</strong><span>{label}</span></div>' for n,label in zip(counts,c["counts"]))
    steps = "".join(f'<article><span class="step-no">0{i+1}</span><h3>{t}</h3><p>{p}</p></article>' for i,(t,p) in enumerate(c["steps"]))
    resources = "".join(f'<a href="{REPO}/blob/main/examples/ai-agents-tool-use/{file if file in ("Outline.md","Syllabus.md") else "Chapter%2004%20-%20Tool%20Use/" + file}"><span>{title}</span><small>{file.rsplit(".",1)[-1].upper()} ↗</small></a>' for title,file in c["resources"])
    page = f'''<!doctype html>
<html lang="{c['lang']}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Codex Study Studio turns source material into connected learning resources. English and Chinese skills, editable slides, narrated lessons and a portable study hub."><meta name="theme-color" content="#103e3c"><meta property="og:title" content="Codex Study Studio"><meta property="og:image" content="https://moonaria123.github.io/Codex-Study-Studio/assets/hero.png"><title>Codex Study Studio · {c['eyebrow']}</title><link rel="stylesheet" href="assets/site.css"></head>
<body><a class="skip" href="#main">Skip to content</a><header class="topbar"><a class="brand" href="index.html"><span class="brand-mark">s.</span><span>Codex <b>Study Studio</b></span></a><nav aria-label="Main navigation"><a href="#explore">{c['nav'][0]}</a><a href="#workflow">{c['nav'][1]}</a><a href="#install">{c['nav'][2]}</a><a class="language" href="{c['other']}" lang="{'zh-CN' if language == 'en' else 'en'}">{c['switch']}</a><a href="{REPO}" class="nav-github">GitHub ↗</a></nav></header>
<main id="main"><section class="hero"><div class="hero-copy"><p class="eyebrow">{c['eyebrow']}</p><h1>{c['title']}</h1><p class="lede">{c['intro']}</p><div class="actions"><a class="button primary" href="demo/StudyHub.html">{c['cta']} ↗</a><a class="button secondary" href="#install">{c['install']} ↓</a></div></div><figure class="hero-art"><img src="assets/hero.png" alt="Study Studio: an open book connected to knowledge maps, flashcards, slides and video" width="1672" height="941"><figcaption>ONE SOURCE. A COMPLETE LEARNING STUDIO.</figcaption></figure></section>
<div class="qualities">{''.join(f'<span>{s}</span>' for s in c['strip'])}</div>
<section id="explore" class="section"><div class="section-heading"><div><p class="eyebrow">{c['demoLabel']}</p><h2>{c['demoTitle']}</h2></div><p>{c['demoText']}</p></div><div class="tool-grid">{tiles}</div><div class="metrics">{metrics}</div></section>
<section id="watch" class="watch section"><div class="watch-copy"><p class="eyebrow">{c['watchLabel']}</p><h2>{c['watchTitle']}</h2><p>{c['watchText']}</p><div class="watch-links"><a href="{YOUTUBE}">{c['full']} ↗</a><a href="demo/Lecture_Preview_15s.mp4" download>{c['download']} ↓</a><a href="assets/preview.gif">{c['gif']} ↗</a></div></div><div class="video-frame"><video controls playsinline preload="metadata" poster="assets/preview-poster.png" aria-label="15-second AI agent tool-use teaching video"><source src="demo/Lecture_Preview_15s.mp4" type="video/mp4"><a href="demo/Lecture_Preview_15s.mp4">Download video</a></video><span class="video-tag">15 SEC / REAL LESSON EXCERPT</span></div></section>
<section id="workflow" class="section"><p class="eyebrow">{c['workflowLabel']}</p><h2>{c['workflowTitle']}</h2><div class="steps">{steps}</div></section>
<section id="resources" class="section shelf"><p class="eyebrow">{c['libraryLabel']}</p><h2>{c['libraryTitle']}</h2><div class="resource-grid">{resources}</div></section>
<section id="install" class="section"><div class="section-heading"><div><p class="eyebrow">{c['installLabel']}</p><h2>{c['installTitle']}</h2></div><p>{c['installText']}</p></div><div class="install-grid"><article><span class="card-no">01</span><h3>{c['methods'][0]}</h3><pre><code>{escape(c['prompt'])}</code></pre></article><article><span class="card-no">02</span><h3>{c['methods'][1]}</h3><p>{c['zipText']}</p><div class="zip-links"><a href="https://moonaria123.github.io/Codex-Study-Studio/downloads/study-studio-en.zip">{c['enZip']} ↓</a><a href="https://moonaria123.github.io/Codex-Study-Studio/downloads/study-studio-zh.zip">{c['zhZip']} ↓</a></div></article><article><span class="card-no">03</span><h3>{c['methods'][2]}</h3><pre><code>git clone {REPO}.git
cd Codex-Study-Studio
python scripts/install.py --language {skill_lang}</code></pre></article><article><span class="card-no">04</span><h3>{c['methods'][3]}</h3><pre><code>python3 "$CODEX_HOME/skills/.system/skill-installer/scripts/install-skill-from-github.py" \
  --repo Moonaria123/Codex-Study-Studio \
  --path skills/study-studio-{skill_lang}</code></pre><p class="small">{ 'Set CODEX_HOME first, or use the default-home commands in the full guide.' if language == 'en' else '先设置 CODEX_HOME，或使用完整指南中的默认目录命令。'}</p></article></div><a class="guide-link" href="{REPO}/blob/main/{readme}">{c['allMethods']}</a></section>
<aside class="records"><span class="record-symbol">↗</span><div><h2>{c['storageTitle']}</h2><p>{c['storageText']}</p></div><a class="button secondary" href="demo/StudyHub.html">Study Hub ↗</a></aside></main>
<footer><p>{c['footer']}</p><div><a href="{REPO}/blob/main/LICENSING.md">{c['licence']}</a><a href="{REPO}/blob/main/NOTICE.md">{c['source']}</a><a href="{REPO}/blob/main/verification/README.md">{c['verify']}</a><a href="{c['other']}">{c['switch']}</a></div></footer></body></html>'''
    (ROOT / "docs" / ("index.html" if language == "en" else "zh.html")).write_text(page, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    build("en")
    build("zh")
