# Interactive Study Hub

Use this reference when the requested Studio Modules include the unified interactive HTML. The bundled engine produces one dependency-free HTML file. It supports:

- expandable, searchable and zoomable mind maps with persisted nodes and camera state plus PNG/SVG export;
- editable flashcard libraries, recall/self-rating, filtering, saved progress and immutable checkpoints;
- four-option A-D MCQs in practice mode and optional timed exam mode;
- automatic and manual progress saving, explicit save/discard on in-app exit, attempt history, printable mistake notebook, complete JSON backup/restore, and optional readable HTML history archives.

The complete JSON backup is the recovery format. The HTML history archive contains history snapshots only and is an optional reading/merge format.

The bundled interface labels are English. Course content may use the source language, but a non-English interface requires a deliberate localisation pass and the same behavioural and mobile checks; the current builder does not provide automatic UI translation.

Knowledge content in nodes, cards, questions, answers and explanations must be grounded in the target book. An official syllabus may guide coverage, emphasis and assessment format, but must not supply facts absent from the book. Keep source locators and clear original-question labels concise; do not add generic protective disclaimers to learner-facing content.

## Directory and build contract

Keep the hub registry and source JSON inside the course reading folder. Build the single HTML there:

    python "<skill-dir>/scripts/build_study_hub.py" --registry "<course-dir>/study-hub.json" --output "<course-dir>/StudyHub.html"

The builder refuses to replace an existing HTML unless --overwrite is supplied. Before overwriting a delivered hub, preserve the previous file in the course backup area and keep its cloud file ID when updating in place is required.

The builder also writes OUTPUT.html.manifest.json with hashes, the storage namespace and chapter/module counts. It uses only the Python standard library.

## Registry

Course-level identifiers are persistence contracts:

- courseId identifies compatible complete backups.
- storageKey is the browser-local persistence namespace. Keep it unchanged across future chapter additions.
- contentVersion identifies the embedded content edition. Increase it when content changes.
- downloadPrefix is a safe filename prefix using letters, digits, period, underscore or hyphen.
- timeZone is the IANA time zone used for displayed timestamps and downloaded dates. Use the user’s chosen course time zone; the UTC value below is an example, not a regional preset.

The builder validates timeZone through Python's standard zoneinfo database. If the host does not provide the requested IANA zone, report the limitation and run the build in an environment with the relevant system time-zone data; do not silently install tzdata.

Each chapter can provide studio, questions, or both. A studio file can contain a mind-map root, cards, or both. Empty or missing content is omitted from that chapter's available modules. examDurationMinutes is optional; omit it to offer untimed practice only.

Registry example:

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

Relative input paths resolve from the registry directory. Chapter IDs accept letters, digits, period, underscore and hyphen, must start with a letter or digit, and must remain stable.

## Studio JSON

Mind-map node IDs and flashcard IDs must be unique within the chapter and stable across editions. pages always means Arabic-numbered printed source pages and is an array of positive integers. For Roman-numbered front matter, ebook locations, named sections or non-paginated sources, put the locator text in section (or subsection for questions) and use an empty pages array. Empty page arrays are also allowed for clearly marked original or personal material.

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

root may be omitted for a flashcard-only chapter. cards may be omitted or empty for a mind-map-only chapter. A node may include an optional string exam field.

## Node explanations and source indexes

For every newly authored node, provide a substantive `details` string and a verified `source` object. The short `summary` introduces the idea; `details` explains it in plain-text paragraphs, using only the target source. Explain the definition, mechanism, conditions, distinctions or worked reasoning that the source supports. Do not use generic learning instructions or neighbouring-node lists as a substitute for an explanation.

- `details`: non-empty plain text; separate paragraphs with `\n\n`. No HTML rendering.
- `source.title`: verified book/document title.
- `source.edition`: verified edition or frozen document revision.
- `source.pdfPages`: positive, one-based PDF **file** page numbers; use `[]` for non-PDF material.
- `source.url`: optional HTTP(S) URL or relative document path, such as `../book.pdf#page=18`. Use a frozen source link where possible. Links are opened only when the learner chooses them; the hub does not fetch sources automatically.

Keep `section` for the source section or other locator (including Markdown line ranges), and `pages` for **printed** page numbers. Verify the mapping between printed and PDF file pages against the document. Never infer a universal offset. Keep local book paths in the course data, not in the reusable skill.

The builder preserves older nodes without these fields; they continue to show the existing summary and locators. New nodes must include the full explanation and source index. Stable IDs and the storage key remain unchanged when enriching an existing map.

Interaction: single-click toggles a branch, double-click/double-tap opens details without toggling it, and Shift+Enter opens details from the keyboard. A leaf can also be opened with a single click or Enter. Escape closes the panel and returns focus. On narrow screens the panel is scrollable; changing nodes returns its content to the top.

## Question JSON

The bundled quiz renderer supports one answer chosen from exactly four string options: A, B, C and D. Do not represent multiple-select, free-response, matching or numeric-entry items as if they were supported. Extend and separately test the engine before using a new question type.

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

Optional string, list and map fields are normalised to empty values by the builder. Required fields are id, stem, options, answer, positive marks, and valid pages.

## Adding or revising chapters

1. Preserve courseId, storageKey, existing chapter IDs, node/card/question IDs and answer semantics.
2. Add or revise chapter source JSON, then update the registry. Increase contentVersion.
3. Build to a staging filename without --overwrite.
4. Test existing backup import and saved-session restoration as well as every new module.
5. Preserve the delivered HTML as a backup, then replace or upload the new version as requested. Verify bytes, name, MIME type and parent after a cloud write.

Drafts freeze the chapter content present when an attempt begins. History snapshots remain immutable. Stable IDs let mistake counts, old attempts and future content coexist predictably.

## Verification

At minimum:

- build succeeds and the manifest matches the registry;
- opening the HTML causes no console errors or network requests;
- each available tool opens for every chapter;
- mind-map state survives reload and both export buttons work;
- flashcard rating and quiz selection survive reload, save, resume and discard behave as labelled;
- quiz feedback is hidden during an unfinished exam;
- complete JSON backup round-trips maps, drafts, history, card edits and theme;
- duplicate history import does not inflate mistakes;
- history snapshot, mistake notebook and browser print output remain readable at desktop and 360 px width.

Browser tabs cannot show a custom three-choice dialog during a direct close. The hub automatically saves on visibility/page lifecycle events; its own Exit action provides Save and exit, Discard progress and Keep studying.
