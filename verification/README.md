# Release verification

This record distinguishes source checks, executable checks and production limits. The public example uses Microsoft's **AI Agents for Beginners: Tool Use Design Pattern**, with the exact source revision recorded in its [Studio.json](../examples/ai-agents-tool-use/Studio.json).

## New repository baseline: v1.0.0

The new public repository starts a separate release sequence at **v1.0.0** on 5 November 2026. Its learning runtime, chapter data and media are preserved from legacy commit `4ac1034000d4151bc9cfbdc611f794a396fe0a8e`. The changes concern publication identity, licensing notices, packaging and verification documentation. This new v1.0.0 is not the legacy MIT release with the same tag name. See [LICENSING.md](../LICENSING.md) for existing rights and third-party licences.

Each skill ZIP includes `LICENSE`, `LICENSING.md` and a self-contained `NOTICE.md`. The example ZIP includes `PROJECT-LICENSE.txt`, `LICENSING.md`, `PROJECT-NOTICE.md` and Microsoft's separate MIT notice. The release check requires every archive to retain the original author's `Required Notice:` line. Current local checks are recorded in [relaunch-v1.0.0.json](relaunch-v1.0.0.json).

**Historical evidence below:** the inherited reports and version numbers describe work on the former repository, now named `Codex-Study-Studio-private`. Their original contents are retained for traceability; they do not establish the new repository's deployment, access settings or release status.

## Skill package scope

Both language packages are self-contained, include the current PolyForm Noncommercial licence and bilingual licensing policy, and share the same Python helpers and browser runtime. The installed source skill and both distributed packages were checked for course-specific and personal presets. Fixed examination targets, fixed question counts, fixed video lengths, prescribed narration accents and a personal example time zone were removed. Source and delivery language, duration, question format and course goals follow the current task. The bundled English interface is documented as an implementation property; it does not prescribe the subject or teaching language.

The installed skill was backed up before each runtime update. Its original invocation name was preserved. Existing node IDs and course storage identities are retained; learning records are not migrated or removed.

## Node explanations and source indexes (legacy v1.1.0)

Every node in the public example now includes a substantive explanation and a source index tied to the frozen course revision. Double-click, touchscreen double-tap or Shift+Enter opens the detail panel. Single-click still expands or collapses branches; long explanations scroll on desktop and mobile. Sources render as plain text and are only opened when the learner follows a link.

The builder validates optional `details` and `source` fields while accepting older course files. Older nodes fall back to their summary and locator. The skill authoring guidance requires the full explanation and source index for new nodes. The release includes both language skills, an offline example archive and SHA-256 checksums.

## Licensing change (legacy v1.2.0)

The legacy v1.2.0 distribution adopted PolyForm Noncommercial on 5 November 2026. At that time, the root, both language packages and installed skill carried identical licence and policy files. Microsoft's MIT notice and earlier release artefacts retained their original terms. The MIT detection in the initial deployment report describes the legacy MIT release. The [legacy licensing checks](licensing-v1.2.0.json) and v1.2.0 tag belong to that former repository, not this new v1.0.0 release sequence. No learning runtime or course data changed in that licensing release. Current downloads are listed on the [download page](../docs/downloads/README.md).

## Runtime repair

History export mixed `dateStyle`/`timeStyle` with `timeZoneName`, an unsupported `Intl.DateTimeFormat` option combination. Removing the conflicting option restores HTML history export. The archive retains its course time-zone label and exact timestamps. Nine export/parse cases across the three packages and three time zones passed. The browser regression additionally exercises the exported history file and complete JSON recovery.

## Reproducible checks

```sh
python scripts/check_repository.py
python scripts/test_node_details.py
python examples/ai-agents-tool-use/_studio/validate_content.py
node scripts/qa_node_details.cjs
node scripts/qa_hub.cjs
node scripts/qa_showcase.cjs
```

The Python commands use the standard library. The browser checks need an existing Playwright installation and a compatible browser; set `BROWSER_CHANNEL=msedge` where appropriate. No dependency is installed by these scripts. Source-content and media evidence are retained separately from browser results.

## Production limits

- This is one selected lesson, plus the course index and provider learning goals. It is not a whole-course reading or certification course.
- Narration is locally synthesised with Microsoft Zira, an **en-US** voice. No subjective pronunciation or listening approval is claimed.
- The public demo uses selected, attributed source extracts and original layouts, questions and teaching examples. Linked third-party materials are not reproduced.
- The full lesson is [public on YouTube](https://www.youtube.com/watch?v=aLF_IylZ3y8), with uploaded English subtitles and ten chapter timestamps. Studio reports that clickable external description links require one-time channel verification. The 15-second MP4 and GIF remain directly available from the showcase.
- Progress is browser-local. Moving between the hosted hub and a downloaded file requires complete JSON export/import.

## Executed results

- [YouTube publication](youtube-publication.json): Public visibility, matching full-lesson title, successful playback, English subtitle track, 720p availability and ten clickable time links were verified in Chrome. The original file lasts 356.080408 seconds; YouTube's Studio list displays 5:57 while its watch player displays 5:56.
- [Public deployment](deployment.json): the public repository, MIT detection, Pages HTTPS, twelve byte-identical hosted assets and release downloads, owner permissions, branch protection and secret scanning were checked against GitHub and the live URLs. The initial package CI and Pages deployment both completed successfully.
- [Package audit](skill-package-audit.json): three skill entrypoints validated; six Python files, fifteen JavaScript files and twenty-seven internal links checked; shared runtimes identical.
- [Node-detail verification](node-details.json): five builder tests and eighteen focused browser checks passed, covering double-click/double-tap, plain-text rendering, source links, legacy fallback, single-click cancellation, keyboard focus, saved state and mobile scrolling. Both language runtimes and the installed runtime match.
- [Hub functional regression](hub-qa.json): nineteen groups passed on the v1.1.0 example, including map export, editing, quiz lifecycle, immutable history, mistake counts, full JSON recovery, rejected invalid imports, printing and 360 px layouts. The report records the exact delivered HTML hash and source lesson ID 4.
- [Initial chapter identity](hub-identity-qa.json): retained historical evidence from v1.0.0. The current full regression above supersedes this earlier targeted run.
- [Media verification](media-verification.json): ten slide pages and six practice pages; a 356.080-second narrated lesson; an exact 15-second H.264/AAC excerpt; a 150-frame, 15-second GIF. Full video decoding and source/script consistency checks passed.
- [Media timeline](media-manifest.json): captions use measured per-segment audio durations; the practice question includes a five-second thinking pause before its solution.
- [Bilingual showcase](showcase-qa.json): nineteen checks cover loaded assets, contents navigation, language switching, 1366 px and 360 px layouts, mobile navigation and Chinese heading wrapping, video identity, an exact fifteen-second duration and playback seeking.

The source excerpt retains one whitespace-only line from the frozen upstream text. It is intentional source preservation; other staged text is checked for trailing whitespace with CRLF recognised as a line ending.

Local scratch files, raw source-review copies and rendering intermediates are excluded from the repository.

## Historical repository access

The legacy deployment report recorded a public repository with Moonaria123 as its sole listed administrator, protection against main-branch force pushes and deletion, resolved-conversation requirements, a read-only Actions token and secret scanning/push protection. These are historical observations, not verification of the new repository's settings. GitHub manages the Pages HTTPS certificate; no private key or authentication token is included in this repository.
