# Sources, whole-book understanding and close chapter reading

## Sole knowledge source

The designated edition is the sole knowledge source and factual authority for Outline, CharpterReview and all learning modules. Allow only faithful summaries, necessary terminology explanations, relationships grounded in the book and necessary arithmetic. Do not fill gaps with external research, model knowledge, other textbooks or previous outputs. Prefer the book's examples. Original situations may apply its rules, with concise hypothetical assumptions and original-material labels, without adding real-world background facts.

Official material has a separate role: syllabus learning requirements, assessment format and chapter mappings only. It does not replace or extend the book's subject knowledge. Record edition conflicts or uncovered requirements in the production record and report them to the user. Do not insert conflict reports, protective disclaimers or tool limitations into learning materials.

## Source registration and page conventions

In the course's Studio.json, record `courseId`, book/subject title, source file location or cloud ID, edition, checksum, language, output location, chapter list and completed modules. Add official-document URLs and access dates, delivery IDs and verification results as needed. This record supports resuming work and updating the same resource; it must not contain tokens or sign-in details.

For each chapter, record at least `id`, original chapter number/title, `locatorType`, source range, split file path/ID and close-reading status. PDFs use `pdf-pages`, a 1-based inclusive original-file interval `[start,end]` and printed-page labels as strings. Markdown may use `markdown-lines` with 1-based line ranges. DOCX/EPUB may use section headings, paragraphs or anchors. Do not invent page numbers for non-paginated sources. Preserve Roman numerals, appendix labels and repeated printed numbers; do not assume one constant file-page offset throughout the book. After splitting a PDF, `localPage = originalFilePage - start + 1`; identify the page convention used in citations.

Prefer extractable PDF text with original page references. OCR scanned pages, then compare with the page images. Visually verify definitions inside images, table values, formula symbols, superscripts/subscripts and diagram relationships. Contents, PDF bookmarks and heading detection suggest boundaries but must be checked against actual first and last pages; avoid mistaking contents entries for body text. Without stable printed pagination in DOCX/EPUB, use headings, paragraphs or anchors. If a lossless split is unavailable, retain the original and a faithful chapter extract, recording the format difference.

## Whole-book scan

Inspect the preface and intended audience, complete contents, each chapter's body structure and concepts, key figures, chapter summaries and exercises, appendices and terminology. Ground the Outline in the book: what problem it addresses, each chapter's contribution, chapter relationships, sequence and prerequisites. Do not infer unstated author intentions or add external applications. Summarise by chapter; close reading of a few chapters does not establish whole-book coverage. Record exceptional pages and unread ranges in Studio.json or the verification record, and update coverage after resolving them.

Example PDF splitting plan:

```json
{
  "source": "Textbook.pdf",
  "segments": [
    {"id":"front","title":"Front matter","start":1,"end":3,"output":"_source/Front_Matter.pdf","printed_pages":"i-iii"},
    {"id":"1","title":"Foundations","start":4,"end":12,"output":"Chapter 01 - Foundations/Chapter_Source.pdf","printed_pages":"1-9"},
    {"id":"2","title":"Applications","start":13,"end":22,"output":"Chapter 02 - Applications/Chapter_Source.pdf","printed_pages":"10-19"}
  ]
}
```

`source` resolves relative to the plan's directory, or may be an authorised absolute source path. The plan may live in the course's `_studio/` directory. Pass the verified course output root separately via CLI `--output-root`; it is not accepted from the plan. All segment outputs resolve inside that root and must not escape it. Cover every physical page exactly once. Front/end matter may go in `_source/`. The helper does not guess boundaries, modify the source PDF or overwrite existing chapter files. Run `python scripts/split_pdf.py --plan PLAN.json --output-root READING_FOLDER --check` before generating with the same command without `--check`. If pypdf is missing, explain the needed capability and choose an installed equivalent; do not install dependencies silently.

For Markdown and other text splits, preserve heading levels and encoding, and register every paragraph by source line or section boundary. Check that concatenating the extracts reproduces the original, or explicitly record necessary wrapper differences. Verify first/last locators, complete coverage, absence of accidental duplication and working relative links. Adjust copied cross-chapter links or supply original-source locators while retaining the original unchanged.

## Official syllabus research

Search using book/course title, subject code, institution and target examination period. Prefer official syllabi, learning outcomes, assessment regulations, specimens/mock examinations, marking guidance and examiner reports. Distinguish publication date, applicable examination period and access date; the latest version may not apply to the user's examination.

For each official document, record name, institution, edition/effective period, direct URL, relevant pages/sections and extracted requirements. Map learning outcomes to book chapters. Identify added, removed or changed scope when a newer syllabus differs from an older textbook; do not silently change the book's facts.

Question formats and weights require applicable official evidence. A format in a specimen is an observation, not proof that every examination uses only that format. Select revision priorities from official outcomes or conceptual dependencies, but do not call them frequent or guaranteed examination topics without frequency evidence. If official materials cannot be found, retain search terms, official locations checked and unresolved items; do not repeatedly retry the same failed entry point.

## Close reading and traceable teaching

Create a knowledge inventory for each subsection. Suggested fields: `knowledgeId`, standard term, explanation, conditions/boundaries, logical relationships, source, official-outcome mapping, teaching priority and reason, confusions, application example and check method. Distinguish official requirements, conceptual foundations and teaching recommendations rather than presenting all priorities as official predictions.

For each concept, explain what it is, why, when it applies and how it differs from adjacent concepts only to the extent the book supports. Do not supply reasons or conditions absent from the book. Base comparisons on its definitions, conditions and examples, with traceable shared features, differences and boundaries. Counterexamples may demonstrate existing rules but must not introduce new facts.

The formula sheet records the book's symbol definitions/units, assumptions, input sources, derivations or interpretation, calculation steps, rounding/sign conventions and misuse. Fill only supported fields; do not add general conditions or rounding rules to complete a table. Necessary arithmetic may demonstrate a formula. State when a chapter has no formulas. Recalculate original numerical examples and mark them `Original example`.

Preserve standard terminology, expanded abbreviations, definitions and related terms from the book instead of substituting external definitions. Relationships need direction or meaning grounded in the book, such as depends on / produces / evaluates / contrasts with. Do not use meaningless connectors or expand the knowledge beyond the source.

Production order: knowledge inventory → coverage matrix → teaching explanation → supporting example → subsection check → closing practice. Map each important knowledge point to the requested slides/script, overview, map nodes, cards or questions. Mark unrequested modules `Not requested` and planned modules `Planned`; do not claim unfinished work is complete. Every minor detail need not become a question, but requested modules must not collectively omit important concepts or distinctions. Put sources in footnotes, metadata or answers. Narration should teach rather than repeatedly introduce what each textbook page says.
