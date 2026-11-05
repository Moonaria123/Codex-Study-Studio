#!/usr/bin/env python3
"""Focused standard-library tests for mind-map node detail validation."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / "skills/study-studio-en/scripts/build_study_hub.py"
SPEC = importlib.util.spec_from_file_location("study_hub_builder", BUILDER)
builder = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(builder)


def node(**updates):
    value = {
        "id": "root",
        "label": "Root concept",
        "summary": "Short summary",
        "section": "1.2",
        "pages": [10],
        "children": [],
    }
    value.update(updates)
    return value


class NodeDetailsTests(unittest.TestCase):
    def test_details_and_source_survive_validation(self):
        value = node(
            details="First paragraph.\n\nSecond paragraph with <unsafe-looking> text.",
            source={"title": "Book", "edition": "4th edition", "pdfPages": [18, 19], "url": "../Book.pdf#page=18"},
        )
        result = builder.validate_node(value, "root", set())
        self.assertEqual(result["details"], value["details"])
        self.assertEqual(result["source"], value["source"])

    def test_legacy_node_remains_valid(self):
        result = builder.validate_node(node(), "root", set())
        self.assertNotIn("details", result)
        self.assertNotIn("source", result)

    def test_invalid_detail_and_source_shapes_are_rejected(self):
        invalid = [
            node(details=7),
            node(details="   "),
            node(source=[]),
            node(source={"title": "Book", "edition": "4th edition", "pdfPages": [0]}),
            node(source={"title": "", "edition": "4th edition", "pdfPages": [1]}),
        ]
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(builder.BuildError):
                builder.validate_node(value, "root", set())

    def test_source_url_allowlist(self):
        valid = ["https://example.test/book.pdf#page=2", "http://example.test/book", "../book.pdf#page=2", "sources/book.pdf"]
        invalid = ["javascript:alert(1)", "data:text/html,boom", "file:///tmp/book.pdf", "//example.test/book", "/book.pdf", "#page=2", "C:\\book.pdf", " book.pdf", "book.pdf\n", "https://[bad"]
        for value in valid:
            with self.subTest(valid=value):
                self.assertEqual(builder.source_url(value, "source.url"), value)
        for value in invalid:
            with self.subTest(invalid=value), self.assertRaises(builder.BuildError):
                builder.source_url(value, "source.url")

    def test_full_build_embeds_normalized_details(self):
        with tempfile.TemporaryDirectory(prefix="study-studio-node-details-") as directory:
            root = Path(directory)
            studio = {"chapter": "1", "title": "Chapter", "root": node(details="Detailed text", source={"title": "Book", "edition": "4th", "pdfPages": [18]}), "cards": []}
            (root / "studio.json").write_text(json.dumps(studio), encoding="utf-8")
            registry = {"schema": 1, "courseId": "test", "courseTitle": "Test", "contentVersion": "1", "storageKey": "test.v1", "downloadPrefix": "Test", "timeZone": "UTC", "chapters": [{"id": "1", "studio": "studio.json"}]}
            registry_path = root / "registry.json"
            registry_path.write_text(json.dumps(registry), encoding="utf-8")
            output = root / "hub.html"
            builder.build(registry_path, output, False)
            content = output.read_text(encoding="utf-8")
            self.assertIn('"details":"Detailed text"', content)
            self.assertIn('"pdfPages":[18]', content)


if __name__ == "__main__":
    unittest.main()
