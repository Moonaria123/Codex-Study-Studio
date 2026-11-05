(function () {
  'use strict';
  const SCHEMA = 'study-studio-history-v1';
  const MARKER = 'study-studio-history-data';
  const list = value => Array.isArray(value) ? value : [];
  const text = value => value == null ? '' : String(value);
  const escape = value => text(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const paragraph = value => `<p>${escape(value)}</p>`;

  function validateEnvelope(value) {
    if (!plain(value) || value.schema !== SCHEMA || typeof value.moduleId !== 'string' || !value.moduleId.trim() || (value.courseTitle !== undefined && typeof value.courseTitle !== 'string') || (value.timeZone !== undefined && typeof value.timeZone !== 'string') || typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt)) || !Array.isArray(value.history) || !value.history.every(plain)) {
      throw new Error('Unsupported history archive structure.');
    }
    return value;
  }

  function duration(value) {
    const seconds = Math.floor(Math.max(0, Number(value) || 0) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const rest = seconds % 60;
    return `${hours ? hours + 'h ' : ''}${minutes}m ${String(rest).padStart(2, '0')}s`;
  }

  function date(value, timeZone) {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('en-GB', { timeZone, dateStyle: 'medium', timeStyle: 'short' }) : text(value);
  }

  function itemHTML(item, index, record, sealed) {
    const flash = record.kind === 'flashcards';
    const options = plain(item.options) ? Object.entries(item.options) : [];
    const selected = item.selected == null ? (flash ? 'Not rated' : 'Unanswered') : flash ? item.selected === 'known' ? 'Known' : item.selected === 'review' ? 'Needs review' : text(item.selected) : text(item.selected);
    let html = `<article class="ha-item"><h3>${index + 1}. ${escape(item.itemId)}${item.topic ? ' · ' + escape(item.topic) : ''}</h3>`;
    html += `<p class="ha-meta">${escape(item.marks)} ${Number(item.marks) === 1 ? 'mark' : 'marks'} · Source section / locator ${escape(item.section || 'not supplied')} · Printed pages ${escape(list(item.pages).join(', ') || 'not supplied')}</p>`;
    if (item.scenario) html += `<section class="ha-scenario"><h4>${escape(item.scenarioTitle || 'Shared scenario')}</h4>${paragraph(item.scenario)}</section>`;
    html += `<p class="ha-question">${escape(item.question)}</p>`;
    if (list(item.statements).length) html += `<ol type="I" class="ha-statements">${item.statements.map(statement => `<li>${escape(statement)}</li>`).join('')}</ol>`;
    if (options.length) html += `<ul class="ha-options">${options.map(([key, value]) => `<li><strong>${escape(key)}.</strong> ${escape(value)}</li>`).join('')}</ul>`;
    html += `<p class="ha-selected"><strong>${flash ? 'Your self-rating' : 'Your answer'}:</strong> ${escape(selected)}</p>`;
    if (sealed) {
      html += '<p class="ha-sealed">Assessment feedback is hidden until this exam session is submitted in the Study Hub.</p>';
    } else {
      const verdict = flash ? item.selected == null ? 'Not rated' : 'Self-assessed: ' + selected : item.correct === true ? 'Correct' : item.correct === false ? 'Incorrect' : 'Unanswered';
      html += `<p class="ha-verdict"><strong>${escape(verdict)}</strong> · ${escape(item.earned)} / ${escape(item.marks)} ${flash ? 'self-assessed marks' : 'marks'}</p>`;
      html += `<section class="ha-feedback"><h4>${flash ? 'Answer' : 'Correct answer'}</h4>${paragraph(item.correctAnswer)}`;
      if (item.explanation) html += '<h4>Explanation</h4>' + paragraph(item.explanation);
      if (plain(item.optionAnalysis) && Object.keys(item.optionAnalysis).length) {
        html += `<h4>Option analysis</h4><ul>${Object.entries(item.optionAnalysis).map(([key, value]) => `<li><strong>${escape(key)}:</strong> ${escape(value)}</li>`).join('')}</ul>`;
      }
      if (list(item.steps).length) html += `<h4>Worked steps</h4><ol>${item.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol>`;
      if (item.pitfall) html += '<h4>Common pitfall</h4>' + paragraph(item.pitfall);
      if (item.examTip) html += '<h4>Exam technique</h4>' + paragraph(item.examTip);
      html += '</section>';
    }
    return html + '</article>';
  }

  function makeHTML({ moduleId, courseTitle, timeZone, history, sealedSessionIds, exportedAt } = {}) {
    const payload = validateEnvelope({ schema: SCHEMA, moduleId, courseTitle: text(courseTitle) || 'Study course', timeZone: text(timeZone) || 'UTC', exportedAt: exportedAt || new Date().toISOString(), history });
    const sealedIds = new Set(sealedSessionIds || []);
    const chapters = [...new Set(history.map(record => text(record.chapterId)))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    const completed = history.filter(record => record.status === 'completed').length;
    const paused = history.filter(record => record.status === 'paused').length;
    const records = history.map((record, index) => {
      const sealed = record.mode === 'exam' && record.status === 'paused' && sealedIds.has(record.sessionId);
      const flash = record.kind === 'flashcards';
      const tool = flash ? 'Flashcards' : 'Quiz';
      const score = sealed ? 'Score hidden until submission' : `${escape(record.earned)} / ${escape(record.max)} ${flash ? 'self-assessed marks' : 'marks'}`;
      const status = record.status === 'completed' ? 'Completed' : 'Saved checkpoint';
      let html = `<details class="ha-attempt" data-chapter="${escape(record.chapterId)}" data-tool="${escape(record.kind)}"><summary><span class="ha-attempt-title">Record ${index + 1} · Chapter ${escape(record.chapterId)} · ${tool}</span><span class="ha-attempt-meta">${escape(date(record.recordedAt, payload.timeZone))} · ${status} · ${score} · ${escape(duration(record.elapsedMs))}</span></summary><div class="ha-attempt-body">`;
      html += `<h2>${escape(record.chapterTitle || 'Chapter ' + record.chapterId)}</h2><p>${tool} · ${escape(record.mode)} · ${status} · ${escape(record.answered)} / ${escape(record.total)} answered · ${escape(duration(record.elapsedMs))} active study time</p>`;
      if (sealed) html += '<p class="ha-sealed"><strong>Unsubmitted exam session.</strong> Scores, correctness, answers and explanations remain hidden. Return to the Study Hub to resume or submit this session.</p>';
      else html += `<p class="ha-score"><strong>${flash ? 'Self-assessed score' : 'Score'}: ${score}</strong></p>`;
      if (flash) html += '<p class="ha-meta">Flashcard scores record your own Known / Needs review ratings; they are self-assessments.</p>';
      html += `<p class="ha-meta">Record ID: ${escape(record.id)} · Session ID: ${escape(record.sessionId)}</p>`;
      html += list(record.items).map((item, itemIndex) => itemHTML(item, itemIndex, record, sealed)).join('');
      return html + '</div></details>';
    }).join('');
    const json = JSON.stringify(payload).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escape(payload.courseTitle)} · Study history archive</title>
<style>
:root{color-scheme:light;--ink:#152438;--muted:#52667d;--line:#cdd8e3;--accent:#165a89;--panel:#f2f6fa}*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:16px/1.65 system-ui,-apple-system,Segoe UI,sans-serif;overflow-wrap:anywhere}main{max-width:1100px;margin:auto;padding:32px 24px}h1,h2,h3,h4{line-height:1.3}h1{font-size:clamp(1.8rem,4vw,2.8rem);margin:0 0 .6rem}h2{font-size:1.4rem}h3{font-size:1.1rem}h4{font-size:1rem;margin:1.1rem 0 .3rem}p{white-space:pre-wrap;margin:.6rem 0}.ha-eyebrow{color:var(--accent);font-weight:700;letter-spacing:.08em;text-transform:uppercase}.ha-meta,.ha-attempt-meta{color:var(--muted);font-size:.9rem}.ha-stats{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}.ha-stat{flex:1 1 150px;padding:16px;background:var(--panel);border:1px solid var(--line);border-radius:10px}.ha-stat strong{display:block;font-size:1.5rem}.ha-controls{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:20px 0}.ha-controls label{display:flex;gap:8px;align-items:center}.ha-controls select,.ha-controls button{font:inherit;min-height:44px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;color:var(--ink);background:#fff;max-width:100%}.ha-controls button{cursor:pointer}.ha-controls button:hover{border-color:var(--accent)}button:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}.ha-attempt{border:1px solid var(--line);border-radius:12px;margin:16px 0;overflow:hidden}.ha-attempt>summary{padding:18px;background:var(--panel);cursor:pointer}.ha-attempt-title{font-weight:700}.ha-attempt-meta{display:block;margin-top:5px}.ha-attempt-body{padding:20px}.ha-item{border-top:1px solid var(--line);padding:18px 0}.ha-item:first-of-type{margin-top:20px}.ha-question{font-weight:650}.ha-scenario,.ha-feedback{background:var(--panel);border-radius:8px;padding:14px;margin:14px 0}.ha-scenario h4{margin-top:0}.ha-statements{padding-left:2.4rem;list-style-type:upper-roman}.ha-options{list-style:none;padding-left:0}.ha-options li{padding:9px 12px;border:1px solid var(--line);border-radius:7px;margin:7px 0}li{white-space:pre-wrap;margin:.4rem 0}.ha-selected{font-weight:500}.ha-score{font-size:1.15rem}.ha-sealed{padding:12px 15px;border-left:4px solid #a87000;background:#fff6dc}.ha-footer{margin-top:28px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}[hidden]{display:none!important}@media(max-width:480px){main{padding:22px 14px}.ha-attempt-body{padding:14px}.ha-attempt>summary{padding:14px}.ha-controls label{flex:1 1 100%}.ha-controls select{flex:1;min-width:0}.ha-stat{flex-basis:120px}}@media print{body{font-size:10pt}main{max-width:none;padding:0}.ha-controls,.ha-screen-note{display:none!important}.ha-attempt{border:0;border-radius:0;break-before:page}.ha-attempt>summary{padding:0 0 12px;background:#fff}.ha-attempt-body{padding:0}.ha-attempt::details-content{content-visibility:visible}.ha-item{break-inside:auto}.ha-item h3,.ha-item h4,.ha-question{break-after:avoid}.ha-options li,.ha-statements li{break-inside:avoid}.ha-scenario,.ha-feedback{background:#fff;border:1px solid #ccc}.ha-stats{margin:12px 0}.ha-stat{padding:8px}.ha-footer{font-size:8pt}}
</style></head><body><main>
<p class="ha-eyebrow">${escape(payload.courseTitle)}</p><h1>Study history archive</h1>
<p>Exported ${escape(date(payload.exportedAt, payload.timeZone))} · ${escape(moduleId)}</p>
<p class="ha-screen-note">Read your saved work below, or use the Study Hub's import action to add these history records. This archive contains history snapshots; resume unfinished sessions in the Study Hub.</p>
<div class="ha-stats"><div class="ha-stat"><strong>${history.length}</strong>History records</div><div class="ha-stat"><strong>${completed}</strong>Completed records</div><div class="ha-stat"><strong>${paused}</strong>Saved checkpoints</div><div class="ha-stat"><strong>${chapters.length}</strong>Chapters</div></div>
<div class="ha-controls"><label for="ha-chapter">Chapter <select id="ha-chapter"><option value="all">All chapters</option>${chapters.map(chapter => `<option value="${escape(chapter)}">Chapter ${escape(chapter)}</option>`).join('')}</select></label><label for="ha-tool">Tool <select id="ha-tool"><option value="all">All tools</option><option value="quiz">Quiz</option><option value="flashcards">Flashcards</option></select></label><button id="ha-expand" type="button">Expand all</button><button id="ha-collapse" type="button">Collapse all</button><button id="ha-print" type="button">Print / Save PDF</button></div>
<p id="ha-count" class="ha-meta" role="status" aria-live="polite">${history.length} records shown</p>
<div id="ha-records">${records || '<p>No history records were included in this export.</p>'}</div>
<p class="ha-footer">Question content, answers, ratings and source pages are preserved within each recorded snapshot. Dates use the course time zone: ${escape(payload.timeZone)}. Importing this archive does not require executing its scripts.</p>
</main>
<script type="application/json" id="${MARKER}">${json}</script>
<script>(function(){'use strict';const records=Array.from(document.querySelectorAll('.ha-attempt'));const chapter=document.getElementById('ha-chapter'),tool=document.getElementById('ha-tool');function filter(){let count=0;records.forEach(record=>{record.hidden=(chapter.value!=='all'&&record.dataset.chapter!==chapter.value)||(tool.value!=='all'&&record.dataset.tool!==tool.value);if(!record.hidden)count++;});document.getElementById('ha-count').textContent=count+' records shown';}chapter.addEventListener('change',filter);tool.addEventListener('change',filter);document.getElementById('ha-expand').addEventListener('click',()=>records.forEach(record=>{if(!record.hidden)record.open=true}));document.getElementById('ha-collapse').addEventListener('click',()=>records.forEach(record=>{if(!record.hidden)record.open=false}));document.getElementById('ha-print').addEventListener('click',()=>window.print());let printStates=null;window.addEventListener('beforeprint',()=>{printStates=records.map(record=>record.open);records.forEach(record=>{if(!record.hidden)record.open=true});});window.addEventListener('afterprint',()=>{if(printStates)records.forEach((record,index)=>{record.open=printStates[index]});printStates=null;});}());</script>
</body></html>`;
  }

  function parseHTML(html) {
    if (typeof html !== 'string' || !html.trim()) throw new Error('Choose a non-empty history HTML archive.');
    const tags = /<!--[\s\S]*?(?:-->|$)|<([A-Za-z][A-Za-z0-9:-]*)\b((?:[^'"<>]|"[^"]*"|'[^']*')*)>/g;
    let match;
    let markerCount = 0;
    let raw = null;
    while ((match = tags.exec(html))) {
      if (!match[1]) continue;
      const tag = match[1].toLowerCase();
      const attributes = [];
      const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      let attribute;
      while ((attribute = attributePattern.exec(match[2]))) attributes.push([attribute[1].toLowerCase(), attribute[2] ?? attribute[3] ?? attribute[4] ?? '']);
      const ids = attributes.filter(([name]) => name === 'id');
      const isMarker = ids.some(([, value]) => value === MARKER);
      if (isMarker) {
        markerCount++;
        if (markerCount > 1 || ids.length !== 1) throw new Error('The archive contains duplicate history markers.');
        const types = attributes.filter(([name]) => name === 'type');
        if (tag !== 'script' || types.length !== 1 || types[0][1].toLowerCase().trim() !== 'application/json') throw new Error('The history marker must contain application/json data.');
      }
      // Raw-text elements are skipped as text; no imported element is created or executed.
      if (['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes'].includes(tag)) {
        const closing = new RegExp('</' + tag + '\\s*>', 'gi');
        closing.lastIndex = tags.lastIndex;
        const end = closing.exec(html);
        if (!end) {
          if (isMarker) throw new Error('The history data element is incomplete.');
          break;
        }
        if (isMarker) raw = html.slice(tags.lastIndex, end.index);
        tags.lastIndex = closing.lastIndex;
      }
    }
    if (markerCount !== 1 || raw === null) throw new Error('No Study Studio history data marker was found.');
    let payload;
    try { payload = JSON.parse(raw); } catch (_) { throw new Error('The history archive contains invalid JSON.'); }
    return validateEnvelope(payload);
  }

  window.HubArchive = { makeHTML, parseHTML };
}());
