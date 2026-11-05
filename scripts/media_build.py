"""Build editable teaching media from a reviewed course slide manifest.

Requires python-pptx, reportlab and Pillow. Rendering/audio use the companion
Windows PowerShell script; video assembly uses FFmpeg. No network services.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import re
import shutil
import subprocess
import textwrap
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
COURSE = CHAPTER = BUILD = None
COURSE_DATA = {}
ASSETS = ROOT / "docs" / "assets"
BG, PANEL, INK, MUTED = "103E3C", "1C4F4B", "F5F1E8", "B7CCC4"
MINT, ORANGE = "86E4BF", "F4A57E"
FONT = "Arial"


def configure(course):
    """Select a reviewed course without embedding subject knowledge in the renderer."""
    global COURSE, CHAPTER, BUILD, COURSE_DATA
    candidate = Path(course)
    COURSE = candidate.resolve() if candidate.is_absolute() else (ROOT / "examples" / candidate).resolve()
    COURSE_DATA = load("slide-content.json")
    chapter_dir = COURSE_DATA.get("chapter_dir")
    if not chapter_dir:
        chapters = [p for p in COURSE.iterdir() if p.is_dir() and p.name.startswith("Chapter ")]
        if len(chapters) != 1:
            raise ValueError("Set chapter_dir in slide-content.json")
        chapter_dir = chapters[0].name
    CHAPTER = (COURSE / chapter_dir).resolve()
    if not CHAPTER.is_relative_to(COURSE):
        raise ValueError("chapter_dir must remain inside the selected course")
    BUILD = COURSE / "_studio" / "render"


def load(name):
    return json.loads((COURSE / "_studio" / name).read_text(encoding="utf-8-sig"))


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def colour(value):
    return RGBColor.from_string(value)


def box(slide, x, y, w, h, fill=PANEL, radius=True, line=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
                                  Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = colour(fill)
    shape.line.fill.background() if not line else None
    if line:
        shape.line.color.rgb = colour(line)
    if radius:
        shape.adjustments[0] = 0.12
    return shape


def text(slide, value, x, y, w, h, size=22, fill=INK, bold=False, align=PP_ALIGN.LEFT):
    shape = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = shape.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.015)
    tf.margin_top = tf.margin_bottom = Inches(0.01)
    for index, line in enumerate(str(value).split("\n")):
        p = tf.paragraphs[0] if index == 0 else tf.add_paragraph()
        p.text = line
        p.font.name, p.font.size, p.font.bold = FONT, Pt(size), bold
        p.font.color.rgb = colour(fill)
        p.alignment = align
        p.space_after = Pt(7)
    return shape


def line(slide, x1, y1, x2, y2, fill=MINT, width=2):
    s = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    s.line.color.rgb, s.line.width = colour(fill), Pt(width)
    return s


def circle(slide, label, x, y, size=0.72, fill=MINT, ink=BG, font=20):
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(size), Inches(size))
    s.fill.solid()
    s.fill.fore_color.rgb = colour(fill)
    s.line.fill.background()
    tf = s.text_frame
    tf.margin_left = tf.margin_right = Inches(0.01)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text, p.font.name, p.font.size, p.font.bold = label, FONT, Pt(font), True
    p.alignment, p.font.color.rgb = PP_ALIGN.CENTER, colour(ink)


def formula_card(slide, formula, caption, y=3.0, accent=MINT, size=28):
    box(slide, 7.1, y, 5.45, 1.27)
    text(slide, formula, 7.35, y+0.23, 4.96, 0.58, size=size, fill=accent, bold=True, align=PP_ALIGN.CENTER)
    text(slide, caption, 7.2, y+1.46, 5.23, 0.8, size=17, fill=MUTED, align=PP_ALIGN.CENTER)


def render_visual(slide, item, index):
    """Render reviewed semantic nodes; the renderer adds no subject knowledge."""
    diagram = item.get("visual_data")
    if not diagram:
        diagram = {"layout": "stack", "nodes": [{"title": str(i+1), "text": v} for i,v in enumerate(item.get("bullets", []))]}
    layout = diagram.get("layout", "stack")
    nodes = diagram.get("nodes", [])
    if layout == "question":
        circle(slide, "?", 9.05, 3.05, 1.4, MINT, font=46)
        for j,node in enumerate(nodes[:2]):
            text(slide, node.get("title", ""), 7.3, 4.75+j*.7, 5.2, .4, 20, INK, True, PP_ALIGN.CENTER)
            text(slide, node.get("text", ""), 7.3, 5.18+j*.7, 5.2, .45, 15, MUTED, False, PP_ALIGN.CENTER)
        return
    if layout == "compare" and len(nodes) == 2:
        for j,node in enumerate(nodes):
            xx = 7.15+j*2.77
            box(slide, xx, 2.95, 2.58, 2.85)
            text(slide, node.get("title", ""), xx+.18, 3.2, 2.22, .7, 20, MINT if j==0 else ORANGE, True)
            text(slide, node.get("text", ""), xx+.18, 4.1, 2.22, 1.35, 17, INK)
        return
    if not nodes:
        raise ValueError(f"Slide {item['id']} has no visual nodes")
    if len(nodes) > 4:
        raise ValueError("A slide diagram supports at most four reviewed nodes")
    step = min(1.16, 3.75/len(nodes))
    for j,node in enumerate(nodes):
        yy = 2.60+j*step
        box(slide, 7.15, yy, 5.35, step-.12)
        text(slide, f"{j+1:02d}", 7.4, yy+.16, .5, .4, 19, MINT if j%2==0 else ORANGE, True)
        title = node.get("title", "")
        detail = node.get("text", "")
        text(slide, title, 8.08, yy+.10, 4.1, .32, 15 if len(nodes)==4 else 17, INK, True)
        text(slide, detail, 8.08, yy+.41, 4.08, step-.50, 12.5 if len(detail)>55 else 14, MUTED)
        if layout == "flow" and j < len(nodes)-1:
            line(slide, 9.8, yy+step-.13, 9.8, yy+step-.02, MINT, 2)
            line(slide, 9.74, yy+step-.08, 9.8, yy+step-.02, MINT, 2)
            line(slide, 9.86, yy+step-.08, 9.8, yy+step-.02, MINT, 2)


def normalise_source(value):
    return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)


def deck(data):
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333333), Inches(7.5)
    for i, item in enumerate(data["slides"]):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        slide.background.fill.solid()
        slide.background.fill.fore_color.rgb = colour(BG)
        box(slide, .65, .46, .12, .22, fill=ORANGE, radius=False)
        text(slide, "CODEX STUDY STUDIO", .91, .43, 6, .30, 12, MUTED, True)
        text(slide, f"{i+1:02d} / {len(data['slides']):02d}", 11.25, .43, 1.4, .3, 12, MUTED, True, PP_ALIGN.RIGHT)
        kicker = item.get("kicker", data.get("source_short_title", data["title"]))
        text(slide, kicker.upper(), .65, 1.02, 12.0, .33, 12.5, MINT, True)
        text(slide, item["title"], .65, 1.48, 12.0, .95, 31 if len(item["title"]) > 44 else 36, INK, True)
        bullets = item.get("bullets", [])
        bullet_y = 2.73
        available = 3.37
        step = available / max(len(bullets), 1)
        for j, bullet in enumerate(bullets):
            box(slide, .68, bullet_y+j*step+.11, .055, .32, fill=MINT, radius=False)
            size = 20 if len(str(bullet)) > 95 else 22
            text(slide, bullet, .94, bullet_y+j*step, 5.7, step-.1, size, INK)
        line(slide, 6.77, 2.7, 6.77, 6.08, "37645D", 1)
        render_visual(slide, item, i)
        source = normalise_source(item.get("source", data.get("source_short_title", data["title"])))
        if len(source) > 145:
            source = source[:142] + "…"
        text(slide, source, .65, 6.38, 11.5, .35, 10.4, MUTED)
        text(slide, item["id"], 11.55, 6.38, 1.1, .35, 10.4, MUTED, align=PP_ALIGN.RIGHT)
        box(slide, .65, 7.36, 12.0*(i+1)/len(data["slides"]), .025, fill=MINT, radius=False)
        notes = item["narration"] + "\n\nSource: " + normalise_source(item.get("source", ""))
        notes += "\n" + item.get("source_url", "") + "\n" + data.get("attribution", "")
        if i == len(data["slides"])-1 and data.get("license_file"):
            license_path = (COURSE/data["license_file"]).resolve()
            if not license_path.is_relative_to(COURSE):
                raise ValueError("license_file must remain inside the selected course")
            notes += "\n\n" + license_path.read_text(encoding="utf-8")
        slide.notes_slide.notes_text_frame.text = notes
    prs.save(CHAPTER / "Lecture.pptx")


def caption_segments(narration):
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z])", narration.strip())
    chunks = []
    for sentence in sentences:
        lines = textwrap.wrap(sentence, width=52, break_long_words=False, break_on_hyphens=False)
        chunks.extend(" ".join(lines[i:i+2]) for i in range(0,len(lines),2))
    if " ".join(chunks).split() != narration.split():
        raise ValueError("Caption splitting changed the narration")
    return chunks


def script_and_audio_plan(data):
    plan = []
    script = [f"# {data['title']} — lecture script", "", data.get("attribution", ""), "", f"Source: {data.get('source_url','')}", ""]
    for i, item in enumerate(data["slides"]):
        script += [f"## {item['id']} — {item['title']}", "", f"**Source:** {normalise_source(item.get('source',''))}", "", "**Visible content**", ""]
        script.extend("- " + str(b) for b in item.get("bullets", []))
        script += ["", "**Narration**", "", item["narration"], ""]
        pause = float(item.get("thinking_seconds", item.get("pause_seconds", item.get("thinking_pause_seconds", 0))))
        if pause:
            script += [f"**Thinking pause:** {pause:g} seconds before the answer.", ""]
        clips = []
        for j, value in enumerate(caption_segments(item["narration"])):
            clips.append({"text": value, "wav": f"audio/slide-{i+1:02d}-{j+1:02d}.wav"})
        plan.append({"id": item["id"], "index": i+1, "title": item["title"], "pause_seconds": pause, "clips": clips})
    (CHAPTER / "LectureScript.md").write_text("\n".join(script), encoding="utf-8")
    write_json(BUILD / "audio-plan.json", {"voice": "Microsoft Zira Desktop", "locale": "en-US", "rate": -1, "slides": plan})


def practice_pdf():
    data = load("chapter-questions.json")
    questions = data["questions"]
    font_dir = Path("C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("Arial", str(font_dir / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(font_dir / "arialbd.ttf")))
    pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold")
    styles = getSampleStyleSheet()
    for key in ("Normal", "BodyText", "Title", "Heading1", "Heading2"):
        styles[key].fontName = "Arial-Bold" if key.startswith("Heading") or key == "Title" else "Arial"
        styles[key].textColor = colors.HexColor("#" + BG)
    styles["Normal"].fontSize, styles["Normal"].leading = 10.5, 15
    styles["Title"].fontSize, styles["Title"].leading = 27, 33
    styles["Heading2"].fontSize, styles["Heading2"].leading = 13, 18
    tiny = ParagraphStyle("source", parent=styles["Normal"], fontSize=8, leading=11, textColor=colors.HexColor("#526D67"))
    story = [Paragraph(html.escape(COURSE_DATA['title']), styles["Title"]), Paragraph("Original practice &amp; worked answers", styles["Heading2"]), Spacer(1, 7*mm), Paragraph(f"{len(questions)} original single-answer questions · {html.escape(COURSE_DATA.get('source_short_title',''))}", styles["Normal"]), Spacer(1, 4*mm), Paragraph("Choose one answer for each question. The answer section explains the reasoning and the alternatives.", styles["Normal"]), Spacer(1, 8*mm)]
    for i,q in enumerate(questions):
        block = [Paragraph(f"{i+1:02d} · {html.escape(q['stem'])}", styles["Heading2"])]
        for letter,value in q["options"].items():
            block += [Paragraph(f"<b>{letter}.</b> {html.escape(value)}", styles["Normal"]), Spacer(1, 2*mm)]
        block += [Paragraph(f"Original question · {html.escape(q['id'])} · Source: {html.escape(q.get('subsection',''))}", tiny), Spacer(1, 6*mm)]
        story.append(KeepTogether(block))
    story += [PageBreak(), Paragraph("Answers & reasoning", styles["Title"]), Spacer(1, 7*mm)]
    for i,q in enumerate(questions):
        block=[Paragraph(f"{i+1:02d} · Answer {q['answer']}", styles["Heading2"]), Paragraph(html.escape(q["explanation"]), styles["Normal"]), Spacer(1, 2*mm)]
        for step in q.get("steps", []):
            block.append(Paragraph("• " + html.escape(step), styles["Normal"]))
        for letter,value in q.get("option_analysis", {}).items():
            block.append(Paragraph(f"<b>{letter}:</b> {html.escape(value)}", tiny))
        block += [Paragraph("Source: " + html.escape(q.get("subsection", "")), tiny), Spacer(1, 6*mm)]
        story.append(KeepTogether(block))
    def footer(canvas, document):
        canvas.setStrokeColor(colors.HexColor("#C7D7D0")); canvas.line(19*mm, 17*mm, 191*mm, 17*mm)
        canvas.setFillColor(colors.HexColor("#526D67")); canvas.setFont("Arial", 8)
        canvas.drawString(19*mm, 12*mm, "CODEX STUDY STUDIO · " + COURSE_DATA.get('source_short_title', COURSE_DATA['title'])[:78])
        canvas.drawRightString(191*mm, 12*mm, str(document.page))
    SimpleDocTemplate(str(CHAPTER/"Practice_and_Answers.pdf"), pagesize=(210*mm,297*mm), rightMargin=19*mm,leftMargin=19*mm,topMargin=19*mm,bottomMargin=23*mm).build(story,onFirstPage=footer,onLaterPages=footer)


def overview():
    data = load("chapter-studio.json")
    root = data.get("root", {})
    cards = []
    def visit(node, group):
        if node.get("children"):
            for child in node["children"]:
                visit(child, group or node.get("label", ""))
        else:
            cards.append((node, group))
    for node in root.get("children", []):
        visit(node, "")
    if not cards:
        raise ValueError("Knowledge overview requires reviewed nodes")
    flow = COURSE_DATA.get("overview_flow", [])
    if not flow:
        flow = next((s["visual_data"]["nodes"] for s in COURSE_DATA["slides"] if s.get("visual_data", {}).get("layout") == "flow"), [])
    flow = flow[:4]
    ch = max(228, max(110 + len(textwrap.wrap(n.get("label", ""), 43))*31 + len(textwrap.wrap(n.get("summary", ""), 62))*27 + 42 for n,_ in cards))
    rows = math.ceil(len(cards)/2)
    card_top = 470 if flow else 280
    height = card_top + rows*(ch+24)+85
    title = COURSE_DATA.get("overview_title", COURSE_DATA["title"])
    title_size = 49 if len(title)<=50 else 40
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="{height}" viewBox="0 0 1600 {height}"><rect width="1600" height="{height}" fill="#{BG}"/>', '<style>text{font-family:Arial,sans-serif}</style>', f'<text x="80" y="72" font-size="20" font-weight="700" fill="#{MINT}">CODEX STUDY STUDIO / KNOWLEDGE OVERVIEW</text>', f'<text x="80" y="145" font-size="{title_size}" font-weight="700" fill="#{INK}">{html.escape(title)}</text>', f'<text x="80" y="195" font-size="24" fill="#{MUTED}">{html.escape(COURSE_DATA.get("source_short_title", ""))}</text>']
    for i,node in enumerate(flow):
        width=(1440-40*(len(flow)-1))/len(flow); x=80+i*(width+40)
        svg.append(f'<rect x="{x}" y="255" width="{width}" height="146" rx="15" fill="#{PANEL}"/>')
        svg.append(f'<text x="{x+22}" y="292" font-size="16" font-weight="700" fill="#{ORANGE}">{i+1:02d}</text>')
        for j,value in enumerate(textwrap.wrap(node.get("title", ""),24)):
            svg.append(f'<text x="{x+22}" y="{330+j*30}" font-size="24" font-weight="700" fill="#{INK}">{html.escape(value)}</text>')
        if i<len(flow)-1:
            svg.append(f'<path d="M{x+width+7} 326h26m-9 -8 9 8-9 8" fill="none" stroke="#{MINT}" stroke-width="3"/>')
    for i,(node,group) in enumerate(cards):
        x=80+(i%2)*736;y=card_top+(i//2)*(ch+24)
        svg.append(f'<rect x="{x}" y="{y}" width="704" height="{ch}" rx="18" fill="#{PANEL}"/>')
        label=f"{node['id']}" + (f" / {group}" if group else "")
        svg.append(f'<text x="{x+26}" y="{y+37}" font-size="16" fill="#{ORANGE}" font-weight="700">{html.escape(label[:65])}</text>')
        title_lines=textwrap.wrap(node.get("label", ""),43)
        for j,value in enumerate(title_lines):
            svg.append(f'<text x="{x+26}" y="{y+80+j*31}" font-size="27" fill="#{INK}" font-weight="700">{html.escape(value)}</text>')
        yy=y+101+len(title_lines)*31
        for j,value in enumerate(textwrap.wrap(node.get("summary", ""),62)):
            svg.append(f'<text x="{x+26}" y="{yy+j*27}" font-size="21" fill="#{MUTED}">{html.escape(value)}</text>')
        for j,value in enumerate(textwrap.wrap(node.get("section", ""),92)):
            svg.append(f'<text x="{x+26}" y="{y+ch-35+j*17}" font-size="13" fill="#{MINT}">{html.escape(value)}</text>')
    svg.append(f'<text x="80" y="{height-38}" font-size="16" fill="#{MUTED}">{html.escape(COURSE_DATA.get("attribution", ""))}</text></svg>')
    (CHAPTER/"Knowledge_Overview.svg").write_text("\n".join(svg),encoding="utf-8")
    write_json(BUILD/"overview-render.json",{"width":1600,"height":height,"knowledge_cards":len(cards)})


def timestamp(t):
    ms=round(t*1000); h,ms=divmod(ms,3600000); m,ms=divmod(ms,60000); s,ms=divmod(ms,1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def ffmpeg_bin():
    found=shutil.which("ffmpeg.exe")
    if not found:
        found=shutil.which("ffmpeg")
    if not found:
        raise RuntimeError("FFmpeg must be installed and on PATH")
    return found


def run(args):
    subprocess.run([str(x) for x in args],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)


def assemble():
    ffmpeg=ffmpeg_bin()
    plan=json.loads((BUILD/"audio-plan.json").read_text(encoding="utf-8"))
    (BUILD/"clips").mkdir(exist_ok=True)
    srt,manifest=[],[]; cursor=0.0
    for item in plan["slides"]:
        chunks=[]; caps=[]; local=0.20; params=None
        for clip in item["clips"]:
            with wave.open(str(BUILD/clip["wav"]),"rb") as reader:
                if params is None:
                    params=reader.getparams()
                    chunks.append(b"\0"*round(params.framerate*.20)*params.sampwidth*params.nchannels)
                elif reader.getparams()[:3] != params[:3]:
                    raise RuntimeError("Audio formats differ")
                raw=reader.readframes(reader.getnframes())
                dur=reader.getnframes()/reader.getframerate()
            chunks.append(raw)
            caps.append((local,local+dur,clip["text"]))
            local+=dur
            chunks.append(b"\0"*round(params.framerate*.12)*params.sampwidth*params.nchannels)
            local+=.12
        end_hold=.55+item["pause_seconds"]
        chunks.append(b"\0"*round(params.framerate*end_hold)*params.sampwidth*params.nchannels)
        local+=end_hold
        # Round each scene to a whole frame so concat and subtitle clocks agree.
        frames=math.ceil(local*30); total=frames/30
        chunks.append(b"\0"*round(params.framerate*(total-local))*params.sampwidth*params.nchannels)
        audio=BUILD/"audio"/f"slide-{item['index']:02d}.wav"
        with wave.open(str(audio),"wb") as writer:
            writer.setparams(params);writer.writeframes(b"".join(chunks))
        local_srt=[]
        for start,end,words in caps:
            caption="\n".join(textwrap.wrap(words,54,break_long_words=False,break_on_hyphens=False))
            if len(caption.splitlines())>2:
                raise RuntimeError("Caption exceeds two lines")
            local_srt.append(f"{len(local_srt)+1}\n{timestamp(start)} --> {timestamp(end)}\n{caption}\n")
            srt.append(f"{len(srt)+1}\n{timestamp(cursor+start)} --> {timestamp(cursor+end)}\n{caption}\n")
        sub=BUILD/f"slide-{item['index']:02d}.srt"
        sub.write_text("\n".join(local_srt),encoding="utf-8")
        image=BUILD/"slides"/f"Slide{item['index']}.PNG"
        if not image.exists():
            raise FileNotFoundError(image)
        clip_path=BUILD/"clips"/f"slide-{item['index']:02d}.mp4"
        # Relative subtitle path avoids FFmpeg's Windows drive-letter escaping.
        vf=f"scale=1280:720,subtitles=slide-{item['index']:02d}.srt:force_style='FontName=Arial,FontSize=11.5,PrimaryColour=&H00E8F1F5,OutlineColour=&H003C3E10,BorderStyle=3,Outline=1,MarginV=9',fade=t=in:st=0:d=0.3"
        subprocess.run([ffmpeg,"-hide_banner","-loglevel","error","-y","-loop","1","-framerate","30","-i",str(image),"-i",str(audio),"-vf",vf,"-c:v","libx264","-preset","fast","-crf","21","-pix_fmt","yuv420p","-c:a","aac","-b:a","160k","-t",f"{total:.6f}","-movflags","+faststart",str(clip_path)],check=True,cwd=BUILD)
        manifest.append({"id":item["id"],"start":round(cursor,6),"duration":total,"thinking_pause_seconds":item["pause_seconds"],"audio_segments":[{"text":v,"start":round(cursor+a,6),"end":round(cursor+b,6)} for a,b,v in caps],"slide_sha256":hashlib.sha256(image.read_bytes()).hexdigest()})
        cursor+=total
        print(f"Rendered {item['id']}: {total:.2f}s",flush=True)
    (CHAPTER/"Lecture.srt").write_text("\n".join(srt),encoding="utf-8")
    concat=BUILD/"concat.txt"
    concat.write_text("\n".join(f"file 'clips/slide-{s['index']:02d}.mp4'" for s in plan["slides"]),encoding="utf-8")
    run([ffmpeg,"-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",concat,"-c","copy","-movflags","+faststart",CHAPTER/"Lecture.mp4"])
    # This is a contiguous, exactly 15-second excerpt from the finished lecture.
    pause_indices=[i for i,s in enumerate(manifest[:-1]) if s['thinking_pause_seconds']>0]
    answer_index=pause_indices[-1]+1 if pause_indices else min(1,len(manifest)-1)
    excerpt_start=max(0,manifest[answer_index]["start"]-2)
    preview=CHAPTER/"Lecture_Preview_15s.mp4"
    run([ffmpeg,"-hide_banner","-loglevel","error","-y","-ss",excerpt_start,"-i",CHAPTER/"Lecture.mp4","-t","15","-c:v","libx264","-preset","fast","-crf","20","-c:a","aac","-b:a","160k","-movflags","+faststart",preview])
    run([ffmpeg,"-hide_banner","-loglevel","error","-y","-i",preview,"-filter_complex","fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3","-loop","0",ASSETS/"preview.gif"])
    shutil.copyfile(preview,ASSETS/"preview.mp4")
    run([ffmpeg,"-hide_banner","-loglevel","error","-y","-ss","3","-i",preview,"-frames:v","1",ASSETS/"preview-poster.png"])
    write_json(BUILD/"media-manifest.json",{"voice":"Microsoft Zira Desktop","voice_locale":"en-US","narration_source":"../slide-content.json","duration_seconds":round(cursor,6),"preview_start_seconds":round(excerpt_start,6),"preview_duration_seconds":15,"caption_timing":"Measured per-caption WAV durations; 30 fps scene rounding", "slides":manifest})


def main():
    parser=argparse.ArgumentParser();parser.add_argument("stage",choices=["prepare","assemble"]);parser.add_argument("--course",required=True,help="Example directory name or absolute course path");args=parser.parse_args()
    configure(args.course)
    for p in (CHAPTER,BUILD,BUILD/"audio",ASSETS):p.mkdir(parents=True,exist_ok=True)
    if args.stage=="prepare":
        data=load("slide-content.json");deck(data);script_and_audio_plan(data);practice_pdf();overview()
        print(json.dumps({"slides":len(data["slides"]),"narration_words":sum(len(s["narration"].split()) for s in data["slides"]),"chapter":str(CHAPTER)}))
    else:assemble()


if __name__=="__main__":main()
