# Studio module production

Read this reference when producing chapter-level teaching materials, videos, knowledge overviews, or printable practice sets. Treat `CharpterReview.md` and the relevant source chapter as the content authority. Use `Syllabus.md` to prioritise assessed outcomes, not to invent coverage that is absent from the source.

The designated book edition is the sole source of knowledge and the final factual authority. The chapter review is a traceable derivative, not an independent source. Recheck inherited content against the book. Do not enrich explanations with web facts, other textbooks, model knowledge, extra theory or speculative interpretation. Official material controls assessment-format and learning-requirement metadata only. Explain reasons, conditions and relationships only to the extent supported by the book. Original cases and questions may vary numbers or hypothetical conditions to apply book rules; they must not add unsupported real-world facts.

## Shared teaching contract

Build every module around the chapter's subsection sequence and knowledge relationships. Teach the ideas first; examples support an explanation and do not become the narrative spine.

For each substantive subsection:

1. State the concept or learning outcome in the source terminology.
2. Explain what it means, how it works, and why it matters.
3. Separate related or easily confused concepts and state the decision rule that distinguishes them.
4. Demonstrate a short, concrete case, calculation, diagram, or counterexample where it improves understanding.
5. Identify the examination cue, common error, or limitation when the official syllabus or evidence supports one.
6. Check understanding with a short question and an answer or explanation.

Place substantial worked questions after the knowledge sequence as the chapter close. Give learners thinking time before revealing answers in video. Show formulas, substitutions, units, reasoning and interpretation rather than only the result.

Use source page references on slides, notes, review documents and questions. Keep them as unobtrusive footnotes or metadata. Do not repeatedly speak page numbers or narrate the organisation of the source. Do not insert protective statements such as for reference only, no guarantee, or verify independently into any generated learning material. Actual extraction gaps, tooling limitations or evidence conflicts belong in production records and the user-facing delivery message. Preserve conditions and boundaries that the book itself teaches; these are knowledge, not disclaimers.

Clearly distinguish:

- source definitions, cases, exercises and calculations;
- adaptations of source material;
- author-created classroom illustrations and original questions.

Never imply that an original question, chapter allocation or practice weighting is official. Preserve official terminology and spelling. Define acronyms on first use and use the same term consistently across the review, slides, script, video, overview and practice set.

Follow the established course language or the user's explicit choice; for a new general book with no language preference, retain its principal language and official examination terminology. Keep the requested language consistent across slides, narration and subtitles. Do not silently translate or bilingualise a course with an explicit language requirement. The bundled hub’s English interface does not determine the language of teaching content.

## Lecture presentation

Create one editable presentation per chapter. Derive it from a structured slide manifest rather than treating the presentation file as the only source of truth. Give each slide a stable ID and capture at least:

- part and subsection;
- slide kind: teaching, distinction, worked example, mini-check, answer, recap or closing practice;
- title and visible content;
- knowledge-point IDs from `CharpterReview.md`;
- source locator and origin label;
- speaker script segments;
- optional table, diagram or formula;
- optional thinking-pause duration.

Arrange the deck in this order:

1. chapter learning map and outcomes;
2. subsection-by-subsection teaching;
3. concise recap or comparison where relationships need synthesis;
4. closing original or adapted practice, with question and answer on separate slides.

A typical teaching slide should express one coherent idea or distinction. Keep visible text scannable and put the full teaching explanation in speaker notes and the script. Use tables for comparisons, processes for sequences, and labelled diagrams for causal or structural relationships. A diagram must communicate a relationship; decorative arrows and unrelated stock imagery do not count.

Put a short source line in a consistent footer. Show `Author-created question`, `Author-created illustration`, `Adapted from ...`, or the equivalent where provenance could otherwise be mistaken. Keep answers off the question slide.

### Presentation acceptance

- Every in-scope subsection and important `CharpterReview.md` knowledge point maps to at least one teaching slide.
- Definitions, formulas, tables and terminology agree with the source.
- Important distinctions receive explicit comparison, not incidental mention.
- Teaching content precedes closing practice; examples have not displaced the knowledge sequence.
- Speaker notes exist for every narrated slide and correspond to the visible slide.
- The presentation opens successfully, remains editable, and has no clipped, overlapping or unreadably small text after rendering.
- Rendered slides are inspected at representative dense, formula, table, question and answer pages; for a short deck, inspect every slide.

## Lecture script

Create one Markdown script per chapter using the stable slide IDs. For each slide include the subsection/source locator, knowledge points, visible slide content, origin label where needed, narration and pause instruction.

Write as a lecturer teaching a learner. Explain the reasoning between statements, give compact examples at the point of need, and tell the learner how to distinguish a tempting wrong interpretation. Avoid merely reading bullets or describing what the textbook contains. Page references belong in the reference field and usually stay out of narration.

The script and presentation must be generated from, or reconciled against, the same slide manifest. Reconstruct the intended narration from the manifest during validation and compare it with the script so late edits cannot silently diverge.

For closing questions, use a question slide, an explicit pause, then a separate answer slide. The answer narration should model a reusable solving method: identify the requirement, select the relevant rule or formula, apply it, verify the result and interpret it in context.

### Script acceptance

- The narration teaches every visible concept and never contradicts the slide.
- It uses natural connected speech and precise terminology, without repeated defensive statements or source indexing.
- Each case is short enough to illuminate the concept and is labelled accurately.
- Mini-checks and closing practice include complete answers and explanations.
- Formula narration states variables and units; worked calculations show intermediate steps.
- Automated scans for missing slide IDs, untranslated fragments, repeated provenance language and unexplained acronyms are followed by a human semantic review.

## Teaching video

Produce videos only after presentation and script content pass review. Render the final slides, then synthesise or record audio per script segment. Measure the real audio duration and build the video and subtitle timeline from those measurements. Do not estimate subtitle timing from word count when measured audio exists.

Recommended reusable pipeline:

1. Freeze the slide manifest and render each slide to an image.
2. Hash each slide image, narration segment, voice configuration and timing inputs.
3. Reuse cached audio and per-slide video only when all relevant fingerprints still match.
4. Generate audio per segment so isolated pronunciation or wording can be corrected without rebuilding the whole chapter.
5. Add small natural gaps between segments and a short hold at each slide end.
6. Insert explicit silent thinking periods after questions or calculations; reveal the answer on the next slide.
7. Generate subtitles from the exact spoken text and measured segment boundaries, then burn them in or package them as requested.
8. Concatenate verified per-slide clips and emit chapter/slide markers plus a render manifest.

Use a natural, clear voice appropriate to the user’s requested language and locale; do not preset an accent. Confirm important specialist terms, abbreviations, symbols and numbers by listening. Signal statistics and successful decoding do not prove acceptable pronunciation.

Derive video part boundaries and duration from the user’s requirements, content density and natural subsection boundaries. Do not preset a part count or duration, or stretch narration merely to reach a target.

Subtitles should use the requested language and be faithful to the narration, normally no more than two lines at a time, and must not cover formulas or essential content. Prefer sentence or clause boundaries; avoid flashes that are too short to read. Keep answer subtitles out of the thinking pause.

### Video acceptance

- All slides appear once, in manifest order, with complete audio and synchronized subtitles.
- Actual durations meet the requested bounds and are reported from media metadata.
- Question pauses have the declared duration and the answer begins only afterward.
- Every output fully decodes; audio is present, intelligible and free of unexpected clipping or prolonged silence.
- Captions reconstruct the narration, fit the caption area and use the requested language.
- Inspect representative frames from the beginning, middle, end, dense slides, formulas, questions and answers; inspect a sample from every part.
- Listen to samples containing technical terms, numbers and transitions. Record any pronunciation limitation rather than claiming subjective quality from automated checks alone.

## Detailed knowledge overview

Create one overview per chapter as an original, information-dense visual summary. Deliver a scalable/vector version where practical and a high-resolution image for convenient viewing. Build text and geometry programmatically or with editable design elements; do not rely on image-generated lettering.

The overview should make the chapter's conceptual architecture visible. Organise it by major subsections and use a small number of purposeful visual forms, such as:

- hierarchy for classifications;
- flow for processes or lifecycles;
- comparison matrix for confusable concepts;
- formula panel with variable definitions;
- cause-and-effect chain for drivers and outcomes;
- callouts for exam cues and common pitfalls.

Use icons as navigation aids, not as substitutes for concepts. Every connector must have a clear semantic meaning. Keep examples subordinate to the principle they explain. Use short phrases and preserve source terminology; move detailed prose to `CharpterReview.md`.

### Overview acceptance

- All major subsections and core examination distinctions are represented.
- Text is selectable or otherwise sourced from the reviewed content, spelled correctly and readable at the intended output size.
- No node, label, connector or panel is clipped or overlaps after rendering.
- Formulas, arrows, grouping and legends communicate the intended relationships accurately.
- The image remains legible on a common desktop display and when zoomed; large posters may require section-level crops for visual QA.
- Vector and raster versions contain the same content.

## Printable practice set and reference answers

Research the current official assessment format before designing an examination-style set. Prefer official syllabi, examination regulations, specimen papers and answering guidance. Record the source URLs, publication or access date, and what each source actually establishes. A specimen establishes observed style; it does not prove chapter weighting unless the official material says so.

Create original questions that cover the chapter's important knowledge points, assessment outcomes, distinctions, common confusions, formulas and interpretation skills. Use the question forms evidenced by the official materials: these may include direct selection, statement combinations, scenario groups, calculations or written responses. Do not default to multiple-choice questions merely because the current reference project used them.

Derive question count, marks and pacing from the user’s request and the verified official format where applicable. Without an applicable official format, choose a practice design that fits the source coverage and learning objectives. Label teaching-design choices as such rather than presenting them as an official chapter blueprint.

Each item should include:

- stable ID, topic, subsection and printed source pages;
- provenance label such as `Author-created question`;
- scenario and statements when applicable;
- marks and expected time where supported;
- correct answer or marking guide;
- explanation of the governing concept;
- calculation/reasoning steps;
- analysis of tempting alternatives when the format has options;
- exam tip or common pitfall where useful.

Cover the important content matrix rather than distributing questions evenly by accident. Avoid trivia, ambiguous wording, unsupported assumptions and distractors that are wrong only by grammatical trick. Calculations must use sufficient data, consistent units and a uniquely defensible result.

Lay out the PDF as a usable paper followed by a clearly separated answer section, unless the user requests interleaved answers. Include navigation, page numbers and readable source references. Keep questions from splitting awkwardly where possible; allow long explanations to flow across pages rather than leaving a mostly blank page.

### Practice acceptance

- A coverage matrix maps every question to chapter knowledge points and official learning outcomes where available.
- Independent content review verifies every answer, calculation, mark allocation and source locator against the source chapter.
- All original/adapted material is labelled; no practice distribution is presented as official without evidence.
- The generated PDF text matches the reviewed question source data.
- Render every PDF page and inspect it for clipping, orphan headings, unusable page breaks and unreadably small text.
- Confirm the file opens, page count is plausible, fonts render, and question and answer sections are complete.

## Rebuilds and delivery

Keep reviewed content data, manifests and rendering code separate from generated deliverables. A change to terminology, answer keys, formulas or source references must invalidate affected downstream artifacts. Reuse unchanged slide renders, audio and video clips by content hash; do not skip semantic QA merely because a cached build succeeded.

Before replacing an existing delivery, compare filenames, versions and content hashes. Preserve the previous version in the agreed backup location when requested, update in place only when a stable link is part of the contract, and read back remote filename, type, size and parent after upload or move. A successful upload does not establish content correctness; carry forward the local validation evidence and delivery receipt separately.
