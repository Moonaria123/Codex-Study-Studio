// Exercise the delivered hub in fresh browser contexts; no user profile is opened.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const input = path.resolve(process.argv[2] || path.join(root, 'examples/ai-agents-tool-use/StudyHub.html'));
const output = path.resolve(process.env.QA_OUTPUT || path.join(root, 'verification/hub-qa'));
const identityOnly = process.env.QA_SCOPE === 'identity';
const resultFile = path.join(root, identityOnly ? 'verification/hub-identity-qa.json' : 'verification/hub-qa.json');
const channel = process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : '');
const evidence = { status: 'RUNNING', input: path.relative(root, input).replaceAll('\\', '/'), channel: channel || 'chromium', checks: [], errors: [], externalRequests: [] };
let browser, currentPage;
const pass = (name, details) => { evidence.checks.push({ name, status: 'PASS', ...(details ? { details } : {}) }); console.log(`PASS ${name}`); };
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

async function trackedPage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => evidence.errors.push(error.message));
  page.on('request', request => { if (!['file:', 'blob:', 'data:'].includes(new URL(request.url()).protocol)) evidence.externalRequests.push(request.url()); });
  await page.goto(pathToFileURL(input).href);
  await page.waitForSelector('#open-mindmap');
  return page;
}
async function state(page) {
  return page.evaluate(() => { const data = JSON.parse(document.getElementById('hub-content').textContent); return JSON.parse(localStorage.getItem(data.storageKey)); });
}
async function settle(page) { await page.waitForTimeout(220); }
async function home(page) { await page.click('#nav-home'); }
async function open(page, kind) { await page.click(`#open-${kind}`); await page.click(`#chapter-${kind}-4`); }
async function resume(page, kind) { await page.locator(`[data-draft-key="${kind}:4"] button`).click(); }
async function exit(page, decision = 'save', target = '#nav-home') { await page.click(target); await page.click(`#hub-exit-${decision}`); }
async function download(page, selector, name) {
  const event = page.waitForEvent('download');
  await page.click(selector);
  const item = await event;
  const file = path.join(output, name);
  await item.saveAs(file);
  return { file, bytes: await fs.readFile(file), suggestedFilename: item.suggestedFilename() };
}
async function checkLayout(page, label) {
  const geometry = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(geometry.document <= geometry.width + 1, `${label} overflows: ${JSON.stringify(geometry)}`);
  await page.screenshot({ path: path.join(output, `${label}.png`), fullPage: true });
  pass(label, geometry);
}
async function rejectImport(page, contents, label) {
  const before = canonical(await state(page));
  await page.locator('#hub-import-file').setInputFiles({ name: `${label}.json`, mimeType: 'application/json', buffer: Buffer.from(contents) });
  await page.waitForFunction(() => document.querySelector('#hub-import-file').value === '');
  await page.waitForFunction(() => document.querySelector('#hub-toast').textContent.startsWith('Import was not applied:'));
  assert.equal(canonical(await state(page)), before, `${label} changed stored state`);
  assert.equal(await page.locator('#hub-dialog[open]').count(), 0);
  assert.equal(await page.evaluate(() => Object.prototype.qaPolluted), undefined);
  pass(`reject-${label}-without-state-change`);
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = currentPage = await trackedPage(context);
  evidence.inputSha256 = createHash('sha256').update(await fs.readFile(input)).digest('hex');
  evidence.chapterId = '4';
  if (identityOnly) {
    const chapter = await page.evaluate(() => JSON.parse(document.querySelector('#hub-content').textContent).chapters[0]);
    assert.equal(chapter.id, '4');
    assert.equal(chapter.number, 4);
    await open(page, 'mindmap');
    assert.match(await page.locator('.hub-session-bar h1').textContent(), /Chapter 4/);
    await page.click('#mm-expand-all');
    await home(page);
    pass('chapter-4-map-identity');
    await open(page, 'flashcards');
    assert.match(await page.locator('.hub-session-bar h1').textContent(), /Chapter 4/);
    await page.click('[data-action="fc-flip"]');
    await page.click('[data-action="fc-rate-known"]');
    await exit(page);
    pass('chapter-4-flashcard-identity-and-save');
    await open(page, 'quiz');
    assert.match(await page.locator('.hub-session-bar h1').textContent(), /Chapter 4/);
    await page.check('#qz-option-C');
    await exit(page);
    await page.reload();
    await resume(page, 'quiz');
    assert.equal(await page.locator('#qz-option-C').isChecked(), true);
    await exit(page, 'save', '#nav-data');
    pass('chapter-4-quiz-reload-and-resume');
    const original = await state(page);
    assert.deepEqual(Object.keys(original.maps), ['4']);
    assert.deepEqual(Object.keys(original.drafts).sort(), ['flashcards:4', 'quiz:4']);
    assert.ok(original.history.every(record => record.chapterId === '4'));
    const backup = await download(page, '#hub-export-data', 'chapter-4-backup.json');
    const newContext = await browser.newContext({ acceptDownloads: true });
    const restored = currentPage = await trackedPage(newContext);
    await restored.click('#nav-data');
    await restored.locator('#hub-import-file').setInputFiles(backup.file);
    await restored.click('#hub-confirm-yes');
    await restored.waitForFunction(() => document.querySelector('#hub-toast').textContent.includes('Study data restored'));
    assert.equal(canonical(await state(restored)), canonical(original));
    pass('chapter-4-records-and-backup-round-trip');
    assert.deepEqual(evidence.errors, []);
    assert.deepEqual(evidence.externalRequests, []);
    pass('no-browser-errors-or-network-requests');
    evidence.status = 'PASS';
    evidence.browserVersion = browser.version();
    evidence.finishedAt = new Date().toISOString();
    await fs.writeFile(resultFile, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ status: 'PASS', checks: evidence.checks.length, scope: 'chapter-4-identity' }));
    return;
  }
  assert.equal(await page.locator('.hub-tile').count(), 3);
  assert.match(await page.title(), /^AI Agents:/);
  pass('three-module-home');
  await page.screenshot({ path: path.join(output, 'home-desktop.png'), fullPage: true });

  await open(page, 'mindmap');
  await page.click('#mm-expand-all');
  await page.click('#mm-zoom-in');
  await settle(page);
  const mapBefore = (await state(page)).maps['4'];
  assert.ok(mapBefore.expandedIds.length >= 5);
  assert.ok(mapBefore.camera.z > 0);
  await page.locator('#mm-export-menu summary').click();
  const svg = await download(page, '#mm-export-svg', 'map-export.svg');
  assert.match(svg.bytes.toString('utf8'), /<svg/);
  assert.ok(svg.bytes.toString('utf8').includes('Tool Use Design Pattern'), 'Map export omitted the chapter title');
  if (!await page.locator('#mm-export-png').isVisible()) await page.locator('#mm-export-menu summary').click();
  const png = await download(page, '#mm-export-png', 'map-export.png');
  assert.equal(png.bytes.subarray(1, 4).toString(), 'PNG');
  await home(page);
  await page.reload();
  await open(page, 'mindmap');
  await settle(page);
  const mapAfter = (await state(page)).maps['4'];
  assert.deepEqual(mapAfter.expandedIds, mapBefore.expandedIds);
  assert.equal(mapAfter.camera.z, mapBefore.camera.z);
  assert.equal(mapAfter.camera.x, mapBefore.camera.x);
  assert.equal(mapAfter.camera.y, mapBefore.camera.y);
  await page.screenshot({ path: path.join(output, 'map-desktop.png'), fullPage: true });
  pass('map-expand-zoom-reload-and-png-svg-download', { expanded: mapBefore.expandedIds.length, svgBytes: svg.bytes.length, pngBytes: png.bytes.length });
  await home(page);

  await open(page, 'flashcards');
  const originalQuestion = await page.locator('.fc-question').textContent();
  await page.locator('.fc-manage summary').click();
  await page.click('[data-action="fc-edit"]');
  const editedQuestion = `${originalQuestion} (QA library edit)`;
  await page.locator('.fc-editor [name="question"]').fill(editedQuestion);
  await page.locator('.fc-editor button[type="submit"]').click();
  await page.waitForSelector('.fc-editor[open]', { state: 'hidden' });
  assert.equal(await page.locator('.fc-question').textContent(), originalQuestion, 'Editing the library changed the active frozen attempt');
  await page.click('[data-action="fc-flip"]');
  await page.click('[data-action="fc-rate-review"]');
  await page.click('#hub-save-progress');
  await page.reload();
  await resume(page, 'flashcards');
  let stored = await state(page);
  assert.equal(stored.drafts['flashcards:4'].state.ratings['T-F01'], 'review');
  assert.equal(stored.libraries['4'].overrides['T-F01'].question, editedQuestion);
  await exit(page);
  const flashSnapshot = (await state(page)).history.find(r => r.kind === 'flashcards');
  assert.equal(flashSnapshot.items[0].question, originalQuestion);
  const flashFrozen = canonical(flashSnapshot);
  await open(page, 'flashcards');
  await page.click('#hub-confirm-yes');
  assert.equal(await page.locator('.fc-question').textContent(), editedQuestion);
  await page.click('[data-action="fc-flip"]');
  await page.click('[data-action="fc-rate-known"]');
  await exit(page);
  assert.equal(canonical((await state(page)).history.find(r => r.id === flashSnapshot.id)), flashFrozen);
  pass('flashcard-edit-rating-reload-and-frozen-old-snapshot');

  await open(page, 'quiz');
  assert.equal(await page.locator('#qz-mode option').count(), 1, 'This sample should offer untimed practice only');
  await page.check('#qz-option-A');
  await page.click('#qz-check');
  assert.match(await page.locator('#qz-feedback').textContent(), /incorrect/i);
  await exit(page, 'cancel');
  assert.equal(await page.locator('#qz-option-A').isChecked(), true);
  await page.click('#hub-save-progress');
  await page.click('#hub-save-progress');
  const quizId = (await state(page)).drafts['quiz:4'].id;
  await exit(page);
  await resume(page, 'quiz');
  assert.equal(await page.locator('#qz-option-A').isChecked(), true);
  await exit(page);
  await page.click('#nav-mistakes');
  let mistake = page.locator('.mistake-entry').filter({ has: page.locator('[data-item-id="T-Q01"]') });
  assert.match(await mistake.locator('.verdict').first().textContent(), /in 1 attempt/);
  assert.equal((await state(page)).history.filter(r => r.sessionId === quizId && r.status === 'paused').length, 2);
  pass('quiz-keep-studying-save-resume-and-checkpoint-deduplication');
  await home(page);
  await resume(page, 'quiz');
  await page.click('#qz-next');
  await page.check('#qz-option-B');
  await page.click('#qz-check');
  await page.click('#qz-submit');
  await page.click('#hub-confirm-yes');
  await page.waitForSelector('.snapshot-item');
  stored = await state(page);
  const completed = stored.history.find(r => r.sessionId === quizId && r.status === 'completed');
  assert.equal(completed.earned, 1);
  assert.equal(completed.max, 10);
  assert.equal(completed.answered, 2);
  assert.ok(completed.elapsedMs > 0);
  assert.equal(completed.items[0].correctAnswer, 'C');
  assert.equal(completed.items[0].selected, 'A');
  assert.ok(completed.items[0].explanation.length > 30);
  const quizFrozen = canonical(completed);
  await page.screenshot({ path: path.join(output, 'history-desktop.png'), fullPage: true });
  await page.click('#nav-mistakes');
  mistake = page.locator('.mistake-entry').filter({ has: page.locator('[data-item-id="T-Q01"]') });
  assert.match(await mistake.locator('.verdict').first().textContent(), /in 1 attempt/);
  await home(page);
  await open(page, 'quiz');
  await page.check('#qz-option-A');
  await page.click('#qz-check');
  await page.click('#qz-submit');
  await page.click('#hub-confirm-yes');
  await page.waitForSelector('.snapshot-item');
  await page.click('#nav-mistakes');
  mistake = page.locator('.mistake-entry').filter({ has: page.locator('[data-item-id="T-Q01"]') });
  assert.match(await mistake.locator('.verdict').first().textContent(), /in 2 attempts/);
  assert.equal(canonical((await state(page)).history.find(r => r.id === completed.id)), quizFrozen);
  pass('completed-score-time-snapshot-and-two-independent-mistake-attempts');

  await home(page);
  await open(page, 'quiz');
  await page.check('#qz-option-D');
  await exit(page, 'discard');
  assert.equal((await state(page)).drafts['quiz:4'], undefined);
  assert.equal(canonical((await state(page)).history.find(r => r.id === completed.id)), quizFrozen);
  await open(page, 'quiz');
  assert.equal(await page.locator('#qz-options input:checked').count(), 0);
  await page.check('#qz-option-C');
  await exit(page);
  pass('discard-only-removes-draft-and-next-session-is-fresh');

  await page.click('#hub-theme');
  await settle(page);
  await page.click('#nav-data');
  const backup = await download(page, '#hub-export-data', 'study-backup.json');
  const history = await download(page, '#hub-export-history', 'history-archive.html');
  const beforeExport = await state(page);
  const exported = JSON.parse(backup.bytes.toString('utf8'));
  for (const key of ['maps', 'drafts', 'history', 'libraries', 'settings']) assert.equal(canonical(exported[key]), canonical(beforeExport[key]));
  const restoredContext = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const restored = currentPage = await trackedPage(restoredContext);
  assert.equal(await restored.evaluate(() => localStorage.length), 0);
  await restored.click('#nav-data');
  await restored.locator('#hub-import-file').setInputFiles(backup.file);
  await restored.click('#hub-confirm-yes');
  await restored.waitForFunction(() => document.querySelector('#hub-toast').textContent.includes('Study data restored'));
  assert.equal(canonical(await state(restored)), canonical(beforeExport));
  pass('complete-json-backup-fresh-context-round-trip', { histories: beforeExport.history.length, drafts: Object.keys(beforeExport.drafts).length, bytes: backup.bytes.length });

  const beforeDuplicate = canonical(await state(restored));
  await restored.locator('#hub-import-history-file').setInputFiles(history.file);
  await restored.waitForFunction(() => document.querySelector('#hub-toast').textContent.includes('already present'));
  assert.equal(canonical(await state(restored)), beforeDuplicate);
  pass('duplicate-html-history-import-does-not-inflate-records');
  const foreign = { ...exported, moduleId: 'different-course' };
  await rejectImport(restored, JSON.stringify(foreign), 'foreign-course');
  const malicious = JSON.stringify(exported).replace('"maps":', '"__proto__":{"qaPolluted":true},"maps":');
  await rejectImport(restored, malicious, 'prototype-key');
  await rejectImport(restored, '{"schema":', 'malformed-json');
  const invalidSnapshot = JSON.parse(JSON.stringify(exported));
  invalidSnapshot.history[0].items[0].marks = -1;
  await rejectImport(restored, JSON.stringify(invalidSnapshot), 'invalid-snapshot');

  await restored.setViewportSize({ width: 360, height: 800 });
  await home(restored);
  await checkLayout(restored, 'home-360');
  await open(restored, 'mindmap');
  await checkLayout(restored, 'map-360');
  await home(restored);
  await resume(restored, 'flashcards');
  assert.equal((await state(restored)).libraries['4'].overrides['T-F01'].question, editedQuestion);
  await checkLayout(restored, 'flashcards-360');
  await exit(restored);
  await resume(restored, 'quiz');
  assert.equal(await restored.locator('#qz-option-C').isChecked(), true);
  await checkLayout(restored, 'quiz-360');
  await exit(restored, 'save', '#nav-mistakes');
  await checkLayout(restored, 'mistakes-360');
  await restored.evaluate(() => { window.__qaPrintCalls = 0; window.print = () => { window.__qaPrintCalls += 1; }; });
  await restored.click('#hub-print-mistakes');
  assert.equal(await restored.evaluate(() => window.__qaPrintCalls), 1);
  await restored.emulateMedia({ media: 'print' });
  assert.equal(await restored.locator('.hub-header').isVisible(), false);
  assert.equal(await restored.locator('.print-heading').isVisible(), true);
  assert.equal(await restored.locator('.snapshot-explanation').count() > 0, true);
  await restored.pdf({ path: path.join(output, 'mistake-notebook.pdf'), format: 'A4', printBackground: true });
  await restored.screenshot({ path: path.join(output, 'mistakes-print.png'), fullPage: true });
  pass('native-print-action-and-print-css-pdf-with-full-explanations');

  assert.deepEqual(evidence.errors, []);
  assert.deepEqual(evidence.externalRequests, []);
  pass('no-browser-errors-or-network-requests');
  evidence.status = 'PASS';
  evidence.browserVersion = browser.version();
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(resultFile, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ status: evidence.status, checks: evidence.checks.length, output: path.relative(root, output).replaceAll('\\', '/') }));
})().catch(async error => {
  evidence.status = 'FAIL'; evidence.failure = { message: error.message.replaceAll(root, '<repository>') };
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(resultFile, JSON.stringify(evidence, null, 2) + '\n');
  if (currentPage) await currentPage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
  console.error(error); process.exitCode = 1;
}).finally(async () => { if (browser) await browser.close(); });
