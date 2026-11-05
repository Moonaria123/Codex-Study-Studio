#!/usr/bin/env python3
"""Build a portable Study Studio learning hub from a course registry."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ASSET_DIR = Path(__file__).resolve().parents[1] / "assets" / "study-hub"
CHAPTER_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$")
SAFE_PREFIX = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$")
LETTERS = {"A", "B", "C", "D"}
RESERVED_IDS = {"__proto__", "prototype", "constructor"}


class BuildError(ValueError):
    pass


def fail(message: str) -> None:
    raise BuildError(message)


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"Input file does not exist: {path}")
    except json.JSONDecodeError as exc:
        fail(f"Invalid JSON in {path}: line {exc.lineno}, column {exc.colno}")


def require_text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(f"{label} must be a non-empty string.")
    return value.strip()


def require_id(value: Any, label: str) -> str:
    result = require_text(value, label)
    if result in RESERVED_IDS:
        fail(f"{label} uses a reserved identifier.")
    return result


def pages(value: Any, label: str) -> list[int]:
    if not isinstance(value, list) or any(not isinstance(item, int) or isinstance(item, bool) or item <= 0 for item in value):
        fail(f"{label} must be an array of positive printed page numbers.")
    return value


def strings(value: Any, label: str) -> list[str]:
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        fail(f"{label} must be an array of strings.")
    return value


def string_map(value: Any, label: str) -> dict[str, str]:
    if not isinstance(value, dict) or any(not isinstance(key, str) or not isinstance(item, str) for key, item in value.items()):
        fail(f"{label} must be an object whose values are strings.")
    return value


def source_url(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value or value != value.strip() or any(ord(char) < 32 for char in value):
        fail(f"{label} must be a non-empty URL without surrounding whitespace or control characters.")
    if value.startswith(("//", "\\\\")) or "\\" in value:
        fail(f"{label} must be an http(s) URL or a relative document path.")
    try:
        parsed = urlsplit(value)
    except ValueError as exc:
        fail(f"{label} is malformed: {exc}")
    if parsed.scheme:
        if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
            fail(f"{label} must use http or https.")
    elif parsed.netloc or not parsed.path or parsed.path.startswith("/"):
        fail(f"{label} must be a relative document path.")
    return value


def node_source(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        fail(f"{label} must be an object.")
    result: dict[str, Any] = {
        "title": require_text(value.get("title"), f"{label}.title"),
        "edition": require_text(value.get("edition"), f"{label}.edition"),
        "pdfPages": pages(value.get("pdfPages"), f"{label}.pdfPages"),
    }
    if value.get("url") is not None:
        result["url"] = source_url(value["url"], f"{label}.url")
    return result


def validate_node(node: Any, label: str, seen: set[str]) -> dict[str, Any]:
    if not isinstance(node, dict):
        fail(f"{label} must be an object.")
    node_id = require_id(node.get("id"), f"{label}.id")
    if node_id in seen:
        fail(f"Duplicate mind-map node id: {node_id}")
    seen.add(node_id)
    children = node.get("children", [])
    if not isinstance(children, list):
        fail(f"{label}.children must be an array.")
    result = {
        "id": node_id,
        "label": require_text(node.get("label"), f"{label}.label"),
        "summary": str(node.get("summary", "")),
        "section": str(node.get("section", "")),
        "pages": pages(node.get("pages", []), f"{label}.pages"),
        "children": [validate_node(child, f"{label}.children[{index}]", seen) for index, child in enumerate(children)],
    }
    if node.get("exam") is not None:
        result["exam"] = str(node["exam"])
    if node.get("details") is not None:
        result["details"] = require_text(node["details"], f"{label}.details")
    if node.get("source") is not None:
        result["source"] = node_source(node["source"], f"{label}.source")
    return result


def normalize_card(card: Any, label: str) -> dict[str, Any]:
    if not isinstance(card, dict):
        fail(f"{label} must be an object.")
    return {
        "id": require_id(card.get("id"), f"{label}.id"),
        "section": str(card.get("section", "")),
        "topic": str(card.get("topic", "")),
        "question": require_text(card.get("question"), f"{label}.question"),
        "answer": require_text(card.get("answer"), f"{label}.answer"),
        "hint": str(card.get("hint", "")),
        "explanation": str(card.get("explanation", "")),
        "pitfall": str(card.get("pitfall", "")),
        "pages": pages(card.get("pages", []), f"{label}.pages"),
        "kind": str(card.get("kind", "")),
    }


def normalize_question(question: Any, label: str) -> dict[str, Any]:
    if not isinstance(question, dict):
        fail(f"{label} must be an object.")
    options = string_map(question.get("options"), f"{label}.options")
    if set(options) != LETTERS:
        fail(f"{label}.options must contain exactly A, B, C and D.")
    answer = require_text(question.get("answer"), f"{label}.answer")
    if answer not in LETTERS:
        fail(f"{label}.answer must be A, B, C or D.")
    marks = question.get("marks", 1)
    if not isinstance(marks, (int, float)) or isinstance(marks, bool) or not math.isfinite(marks) or marks <= 0:
        fail(f"{label}.marks must be a positive number.")
    return {
        "id": require_id(question.get("id"), f"{label}.id"),
        "number": question.get("number"),
        "marks": marks,
        "topic": str(question.get("topic", "")),
        "subsection": str(question.get("subsection", "")),
        "pages": pages(question.get("pages", []), f"{label}.pages"),
        "learning_objectives": strings(question.get("learning_objectives", []), f"{label}.learning_objectives"),
        "knowledge_points": strings(question.get("knowledge_points", []), f"{label}.knowledge_points"),
        "format": str(question.get("format", "mcq")),
        "difficulty": str(question.get("difficulty", "")),
        "scenario_id": question.get("scenario_id"),
        "scenario_title": question.get("scenario_title"),
        "scenario": question.get("scenario"),
        "stem": require_text(question.get("stem"), f"{label}.stem"),
        "statements": strings(question.get("statements", []), f"{label}.statements"),
        "options": options,
        "answer": answer,
        "explanation": str(question.get("explanation", "")),
        "option_analysis": string_map(question.get("option_analysis", {}), f"{label}.option_analysis"),
        "steps": strings(question.get("steps", []), f"{label}.steps"),
        "exam_tip": str(question.get("exam_tip", "")),
        "pitfall": str(question.get("pitfall", "")),
        "original": bool(question.get("original", False)),
    }


def unique_ids(items: list[dict[str, Any]], label: str) -> None:
    ids = [item["id"] for item in items]
    if len(ids) != len(set(ids)):
        fail(f"{label} contains duplicate IDs.")


def optional_path(registry_dir: Path, entry: dict[str, Any], key: str) -> Path | None:
    value = entry.get(key)
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        fail(f"chapters[].{key} must be a relative or absolute path string.")
    return (registry_dir / value).resolve()


def load_course(registry_path: Path) -> tuple[dict[str, Any], list[Path]]:
    registry = read_json(registry_path)
    if not isinstance(registry, dict) or registry.get("schema") != 1:
        fail("Registry schema must be 1.")
    course_id = require_id(registry.get("courseId"), "courseId")
    storage_key = require_text(registry.get("storageKey"), "storageKey")
    prefix = require_text(registry.get("downloadPrefix"), "downloadPrefix")
    if not SAFE_PREFIX.fullmatch(prefix):
        fail("downloadPrefix may contain only letters, digits, period, underscore and hyphen.")
    chapters_value = registry.get("chapters")
    if not isinstance(chapters_value, list) or not chapters_value:
        fail("chapters must be a non-empty array.")
    time_zone = require_text(registry.get("timeZone", "UTC"), "timeZone")
    try:
        ZoneInfo(time_zone)
    except ZoneInfoNotFoundError:
        fail(f"timeZone is not a recognised IANA time zone: {time_zone}")
    data: dict[str, Any] = {
        "schema": 1,
        "moduleId": course_id,
        "courseTitle": require_text(registry.get("courseTitle"), "courseTitle"),
        "courseSubtitle": str(registry.get("courseSubtitle", "")),
        "contentVersion": require_text(registry.get("contentVersion"), "contentVersion"),
        "storageKey": storage_key,
        "downloadPrefix": prefix,
        "timeZone": time_zone,
        "chapters": [],
    }
    inputs = [registry_path]
    chapter_ids: set[str] = set()
    for index, entry in enumerate(chapters_value):
        label = f"chapters[{index}]"
        if not isinstance(entry, dict):
            fail(f"{label} must be an object.")
        chapter_id = require_id(entry.get("id"), f"{label}.id")
        if not CHAPTER_ID.fullmatch(chapter_id) or chapter_id in chapter_ids:
            fail(f"{label}.id is invalid or duplicated: {chapter_id}")
        chapter_ids.add(chapter_id)
        studio_path = optional_path(registry_path.parent, entry, "studio")
        questions_path = optional_path(registry_path.parent, entry, "questions")
        studio = read_json(studio_path) if studio_path else {}
        question_data = read_json(questions_path) if questions_path else {}
        if studio_path:
            inputs.append(studio_path)
        if questions_path:
            inputs.append(questions_path)
        for source, source_label in ((studio, "studio"), (question_data, "questions")):
            if not isinstance(source, dict):
                fail(f"{label}.{source_label} file must contain an object.")
            if source and str(source.get("chapter")) != chapter_id:
                fail(f"{label}.{source_label} chapter does not match id {chapter_id}.")
        title = entry.get("title") or studio.get("title") or question_data.get("title")
        title = require_text(title, f"{label}.title")
        cards_raw = studio.get("cards", [])
        questions_raw = question_data.get("questions", [])
        if not isinstance(cards_raw, list) or not isinstance(questions_raw, list):
            fail(f"{label} cards and questions must be arrays.")
        cards = [normalize_card(item, f"{label}.cards[{i}]") for i, item in enumerate(cards_raw)]
        questions = [normalize_question(item, f"{label}.questions[{i}]") for i, item in enumerate(questions_raw)]
        unique_ids(cards, f"{label}.cards")
        unique_ids(questions, f"{label}.questions")
        root = studio.get("root")
        root = validate_node(root, f"{label}.root", set()) if root is not None else None
        modules = []
        if root:
            modules.append("mindmap")
        if cards:
            modules.append("flashcards")
        if questions:
            modules.append("quiz")
        if not modules:
            fail(f"{label} does not provide a mind map, flashcards or questions.")
        exam_minutes = entry.get("examDurationMinutes")
        if exam_minutes is not None and (not isinstance(exam_minutes, (int, float)) or isinstance(exam_minutes, bool) or not math.isfinite(exam_minutes) or exam_minutes <= 0):
            fail(f"{label}.examDurationMinutes must be a positive number or omitted.")
        data["chapters"].append({
            "id": chapter_id,
            "number": entry.get("number", studio.get("chapter", question_data.get("chapter", chapter_id))),
            "title": title,
            "root": root,
            "cards": cards,
            "questions": questions,
            "modules": modules,
            "examDurationMinutes": exam_minutes,
            "downloadPrefix": prefix,
        })
    return data, inputs


def script_safe(source: str) -> str:
    return re.sub(r"</script", r"<\/script", source, flags=re.IGNORECASE)


def token(value: str) -> str:
    return html.escape(value, quote=True)


def build(registry_path: Path, output: Path, overwrite: bool) -> dict[str, Any]:
    if output.suffix.lower() not in {".html", ".htm"}:
        fail("Output must use an .html or .htm extension.")
    manifest_path = output.with_suffix(output.suffix + ".manifest.json")
    if (output.exists() or manifest_path.exists()) and not overwrite:
        fail(f"Output already exists: {output}. Use --overwrite to replace it.")
    data, inputs = load_course(registry_path)
    required_assets = [
        "hub_template.html", "hub.css", "mindmap.css", "flashcards.css", "quiz.css",
        "mindmap.js", "flashcards.js", "quiz.js", "history_archive.js", "hub.js",
    ]
    missing = [name for name in required_assets if not (ASSET_DIR / name).is_file()]
    if missing:
        fail("Missing Study Hub assets: " + ", ".join(missing))
    protected = {path.resolve() for path in inputs}
    protected.update((ASSET_DIR / name).resolve() for name in required_assets)
    if output.resolve() in protected or manifest_path.resolve() in protected:
        fail("Output and manifest must be distinct from the registry, chapter inputs and bundled assets.")
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    css = "\n".join((ASSET_DIR / name).read_text(encoding="utf-8") for name in ("hub.css", "mindmap.css", "flashcards.css", "quiz.css"))
    modules = "\n".join("<script>\n" + script_safe((ASSET_DIR / name).read_text(encoding="utf-8")) + "\n</script>" for name in ("mindmap.js", "flashcards.js", "quiz.js", "history_archive.js"))
    app = script_safe((ASSET_DIR / "hub.js").read_text(encoding="utf-8"))
    template = (ASSET_DIR / "hub_template.html").read_text(encoding="utf-8")
    replacements = {
        "__CSS__": css,
        "__DATA__": payload,
        "__MODULES__": modules,
        "__APP__": app,
        "__DESCRIPTION__": token(f"{data['courseTitle']} learning hub with mind maps, flashcards, quizzes, saved progress, history and a mistake notebook."),
        "__DOCUMENT_TITLE__": token(f"{data['courseTitle']} · Study Hub"),
        "__HOME_LABEL__": token(f"{data['courseTitle']} home"),
        "__COURSE_SUBTITLE__": token(data["courseSubtitle"]),
        "__COURSE_TITLE__": token(data["courseTitle"]),
    }
    template_markers = set(re.findall(r"__[A-Z][A-Z0-9_]*__", template))
    unknown = sorted(template_markers - replacements.keys())
    missing = sorted(replacements.keys() - template_markers)
    if unknown or missing:
        fail("Template marker mismatch. Unknown: " + ", ".join(unknown) + "; missing: " + ", ".join(missing))
    content = re.sub(r"__[A-Z][A-Z0-9_]*__", lambda match: replacements[match.group(0)], template)
    output.parent.mkdir(parents=True, exist_ok=True)
    content_bytes = content.encode("utf-8")
    manifest = {
        "schema": 1,
        "file": output.name,
        "size": len(content_bytes),
        "sha256": hashlib.sha256(content_bytes).hexdigest(),
        "courseId": data["moduleId"],
        "storageKey": data["storageKey"],
        "contentVersion": data["contentVersion"],
        "chapters": [{"id": c["id"], "modules": c["modules"], "cards": len(c["cards"]), "questions": len(c["questions"])} for c in data["chapters"]],
        "inputs": [{"file": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in inputs],
    }
    temporary_files: list[Path] = []
    try:
        with tempfile.NamedTemporaryFile("wb", dir=output.parent, prefix=output.name + ".", suffix=".tmp", delete=False) as handle:
            handle.write(content_bytes)
            html_temp = Path(handle.name)
        temporary_files.append(html_temp)
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="", dir=output.parent, prefix=manifest_path.name + ".", suffix=".tmp", delete=False) as handle:
            handle.write(json.dumps(manifest, ensure_ascii=False, indent=2))
            manifest_temp = Path(handle.name)
        temporary_files.append(manifest_temp)
        os.replace(html_temp, output)
        temporary_files.remove(html_temp)
        os.replace(manifest_temp, manifest_path)
        temporary_files.remove(manifest_temp)
    finally:
        for temporary in temporary_files:
            try:
                temporary.unlink()
            except FileNotFoundError:
                pass
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", required=True, type=Path, help="Course registry JSON.")
    parser.add_argument("--output", required=True, type=Path, help="Destination HTML file.")
    parser.add_argument("--overwrite", action="store_true", help="Replace an existing output file.")
    args = parser.parse_args()
    try:
        manifest = build(args.registry.resolve(), args.output.resolve(), args.overwrite)
    except (BuildError, OSError) as exc:
        print(f"build_study_hub: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({key: value for key, value in manifest.items() if key != "inputs"}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
