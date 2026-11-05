# Rebuild the open-course demonstration

Run from the repository root. The skill itself does not require these media-production dependencies; they are used only to reproduce this example.

## Teaching content and study hub

The reviewed source extracts, course index and generator are included. The full upstream READMEs and third-party diagrams used during review are not published.

```sh
python examples/ai-agents-tool-use/_studio/validate_content.py
python skills/study-studio-en/scripts/build_study_hub.py --registry examples/ai-agents-tool-use/study-hub.json --output /your/staging/StudyHub.html
```

Build into a new staging location. The builder refuses an existing output unless `--overwrite` is explicitly supplied. Its local manifest records source paths; convert those to relative paths before publishing a manifest from your machine.

`author_demo.py` regenerates the reviewed data and foundation documents from the bundled extracts. Running it replaces those generated files and resets their production statuses, so use a separate copy when experimenting. Preserve the course, chapter, question and card IDs when updating a live course.

The map's detailed explanations live in `node-details.json`, keyed by the stable node IDs. `author_demo.py` includes them and adds frozen source links when generating `chapter-studio.json`. Check each explanation against the included source excerpts before rebuilding the hub.

## Media production used for this release

The release was produced on Windows with Python 3.12, `python-pptx`, ReportLab, Pillow, Microsoft PowerPoint, Windows Speech, FFmpeg and an existing Playwright/Edge installation. These dependencies are not installed automatically. The video uses Microsoft Zira (en-US).

```powershell
python scripts/media_build.py prepare --course ai-agents-tool-use
powershell -File scripts/media_windows.ps1 -Stage render -Course ai-agents-tool-use
powershell -File scripts/media_windows.ps1 -Stage audio -Course ai-agents-tool-use
node scripts/media_overview.cjs --course ai-agents-tool-use
python scripts/media_build.py assemble --course ai-agents-tool-use
python scripts/media_verify.py --course ai-agents-tool-use
```

Use a Python environment that already provides the named packages. The verifier additionally uses `pypdf`. `NODE_PATH` can point to an existing Playwright installation. Rendering intermediates remain under `_studio/render/`; deliverables go into the manifest's `chapter_dir`.

Review rendered slides, PDF pages, diagrams, video frames and narration before publishing a revision. Automated decoding does not establish pronunciation quality. Copy the final preview into `docs/demo/Lecture_Preview_15s.mp4` and the validated hub into `docs/demo/StudyHub.html`.

## Showcase and release packages

```sh
python scripts/build_showcase.py
python scripts/check_repository.py
python scripts/package_skills.py
```

The showcase reads the final sample counts from its content data. Skill ZIPs, a complete offline example ZIP and their SHA-256 checksums are written under `dist/`, outside the committed file set. Sample packaging uses Git's tracked-file list plus the named sample README and node-detail data; local source-review copies and rendering intermediates are excluded.
