"""Verify generated media against a reviewed course manifest without network calls."""
import argparse
import hashlib
import json
import shutil
import subprocess

from PIL import Image
from pptx import Presentation
from pypdf import PdfReader

import media_build as media


def require(condition, message):
    if not condition:
        raise ValueError(message)


def probe(path):
    command = shutil.which("ffprobe")
    require(command, "ffprobe must be on PATH")
    result = subprocess.run([command, "-v", "error", "-show_entries",
                             "format=duration,size:stream=codec_name,width,height,sample_rate,channels",
                             "-of", "json", str(path)], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--course", required=True)
    args = parser.parse_args()
    media.configure(args.course)
    data = media.COURSE_DATA
    timeline = json.loads((media.BUILD / "media-manifest.json").read_text(encoding="utf-8"))
    deck = Presentation(media.CHAPTER / "Lecture.pptx")
    script = (media.CHAPTER / "LectureScript.md").read_text(encoding="utf-8")
    require(len(deck.slides) == len(data["slides"]), "Slide count differs from manifest")
    for i, item in enumerate(data["slides"]):
        require(item["narration"] in deck.slides[i].notes_slide.notes_text_frame.text,
                f"Speaker notes do not match {item['id']}")
        require(item["narration"] in script, f"Script does not match {item['id']}")
        spoken = " ".join(s["text"] for s in timeline["slides"][i]["audio_segments"])
        require(spoken.split() == item["narration"].split(), f"Spoken segments differ for {item['id']}")
    lecture = probe(media.CHAPTER / "Lecture.mp4")
    preview = probe(media.CHAPTER / "Lecture_Preview_15s.mp4")
    require(abs(float(preview["format"]["duration"]) - 15) < 0.04, "Preview is not 15 seconds")
    for name, metadata in [("Lecture.mp4", lecture), ("Lecture_Preview_15s.mp4", preview)]:
        require(any(s.get("codec_name") == "aac" for s in metadata["streams"]), f"No AAC audio in {name}")
        subprocess.run([media.ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-i",
                        str(media.CHAPTER / name), "-f", "null", "-"], check=True)
    require((media.CHAPTER / "Lecture_Preview_15s.mp4").read_bytes() ==
            (media.ASSETS / "preview.mp4").read_bytes(), "Homepage preview differs from selected course")
    gif = Image.open(media.ASSETS / "preview.gif")
    duration = frames = 0
    while True:
        duration += gif.info.get("duration", 0)
        frames += 1
        try:
            gif.seek(gif.tell() + 1)
        except EOFError:
            break
    require(duration == 15000, "GIF duration is not 15 seconds")
    require((media.ASSETS / "preview.gif").stat().st_size < 8_000_000, "GIF exceeds the preview budget")
    question_data = media.load("chapter-questions.json")
    practice = PdfReader(media.CHAPTER / "Practice_and_Answers.pdf")
    practice_text = "\n".join(p.extract_text() for p in practice.pages)
    for item in question_data["questions"]:
        require(item["id"] in practice_text, f"Missing question {item['id']} in practice PDF")
    result = {
        "course_id": data["courseId"], "title": data["title"],
        "slide_manifest_sha256": hashlib.sha256((media.COURSE / "_studio" / "slide-content.json").read_bytes()).hexdigest(),
        "slide_count": len(deck.slides),
        "lecture_pdf_pages": len(PdfReader(media.CHAPTER / "Lecture.pdf").pages),
        "practice_questions": len(question_data["questions"]),
        "practice_pdf_pages": len(practice.pages),
        "all_speaker_notes_match": True, "all_script_narrations_match": True,
        "all_spoken_segments_match": True, "full_decode_exit_code": 0,
        "lecture": lecture, "preview": preview,
        "gif_frames": frames, "gif_duration_ms": duration,
        "gif_size_bytes": (media.ASSETS / "preview.gif").stat().st_size,
        "thinking_pauses": [{"id": s["id"], "seconds": s["thinking_pause_seconds"]} for s in timeline["slides"] if s["thinking_pause_seconds"]],
        "voice": "Microsoft Zira Desktop (en-US)",
        "auditory_review": "Not performed; signal and decode checks do not establish pronunciation quality.",
        "files": {p.name: {"bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                  for p in media.CHAPTER.iterdir() if p.suffix.lower() in [".mp4", ".pdf", ".pptx", ".svg", ".png", ".srt"]}
    }
    media.write_json(media.BUILD / "media-verification.json", result)
    print(json.dumps({k: v for k, v in result.items() if k != "files"}, indent=2))


if __name__ == "__main__":
    main()
