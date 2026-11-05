// Focused browser regression for mind-map node details and source indexes.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const builder = path.join(root, 'skills/study-studio-en/scripts/build_study_hub.py');
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const channel = process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : '');

(async () => {
  const temporaryRoot = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(temporaryRoot, 'study-studio-node-details-'));
  let browser;
  try {
    const studio = {
      chapter: '1', title: 'Detail test', cards: [],
      root: {
        id: 'root', label: 'Root concept', summary: 'Root summary', details: ['First paragraph.', 'Literal <img src=x onerror=alert(1)> text.', ...Array(40).fill('Further source-grounded explanation.')].join('\n\n'), section: '1.1', pages: [10],
        source: { title: 'Reference Book', edition: 'Fourth edition', pdfPages: [18], url: 'source.pdf#page=18' },
        children: [{ id: 'legacy', label: 'Legacy leaf', summary: 'Legacy summary', section: '1.2', pages: [11], children: [] }]
      }
    };
    const registry = { schema: 1, courseId: 'node-detail-test', courseTitle: 'Node detail test', courseSubtitle: 'QA', contentVersion: '1', storageKey: 'node-detail.test.v1', downloadPrefix: 'NodeDetail', timeZone: 'UTC', chapters: [{ id: '1', number: 1, studio: 'studio.json' }] };
    await fs.writeFile(path.join(directory, 'studio.json'), JSON.stringify(studio));
    await fs.writeFile(path.join(directory, 'registry.json'), JSON.stringify(registry));
    const output = path.join(directory, 'hub.html');
    const built = spawnSync(python, [builder, '--registry', path.join(directory, 'registry.json'), '--output', output], { encoding: 'utf8' });
    assert.equal(built.status, 0, built.stderr || built.stdout);

    browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const errors = [], externalRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!['file:', 'blob:', 'data:'].includes(new URL(request.url()).protocol)) externalRequests.push(request.url()); });
    await page.goto(pathToFileURL(output).href);
    await page.click('#open-mindmap');
    await page.click('#chapter-mindmap-1');

    const rootNode = page.locator('[data-node-id="root"]');
    const expandedBefore = await rootNode.getAttribute('aria-expanded');
    await rootNode.dblclick();
    assert.equal(await page.locator('#mm-details').isVisible(), true);
    assert.equal(await page.locator('#mm-detail-title').textContent(), 'Root concept');
    assert.match(await page.locator('#mm-detail-explanation').textContent(), /Literal <img/);
    assert.equal(await page.locator('#mm-details img').count(), 0, 'Node details created executable markup');
    assert.match(await page.locator('#mm-detail-source').textContent(), /Reference Book · Fourth edition · Section \/ locator 1\.1 · Printed pages 10 · PDF file pages 18/);
    assert.match(await page.locator('#mm-detail-source-link').getAttribute('href'), /source\.pdf#page=18$/);
    assert.equal(await page.locator('[data-node-id="root"]').getAttribute('aria-expanded'), expandedBefore, 'Double-click changed branch expansion');

    await page.locator('#mm-details').evaluate(element => { element.scrollTop = element.scrollHeight; });
    assert.ok(await page.locator('#mm-details').evaluate(element => element.scrollTop > 0));
    await page.locator('[data-node-id="legacy"]').press('Shift+Enter');
    assert.equal(await page.locator('#mm-detail-title').textContent(), 'Legacy leaf');
    assert.equal(await page.locator('#mm-details').evaluate(element => element.scrollTop), 0, 'New node details retained the previous scroll position');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mm-details').isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.nodeId), 'legacy');
    await page.locator('[data-node-id="root"]').dblclick();
    await page.click('#mm-close-details');
    await page.locator('[data-node-id="root"]').press('ArrowLeft');
    assert.equal(await page.locator('#mm-details').isVisible(), false, 'ArrowLeft opened node details');
    assert.equal(await page.locator('[data-node-id="root"]').getAttribute('aria-expanded'), 'false');
    await page.locator('[data-node-id="root"]').press('ArrowRight');
    assert.equal(await page.locator('#mm-details').isVisible(), false, 'ArrowRight opened node details');
    assert.equal(await page.locator('[data-node-id="root"]').getAttribute('aria-expanded'), 'true');
    await page.locator('[data-node-id="legacy"]').dblclick();
    assert.equal(await page.locator('#mm-detail-title').textContent(), 'Legacy leaf');
    assert.equal(await page.locator('#mm-detail-summary').textContent(), 'Legacy summary');
    assert.equal(await page.locator('#mm-detail-explanation-wrap').isVisible(), false);
    assert.match(await page.locator('#mm-detail-source').textContent(), /Section \/ locator 1\.2 · Printed pages 11/);
    assert.equal(await page.locator('#mm-detail-source-link').isVisible(), false);
    await page.click('#mm-close-details');

    await page.locator('[data-node-id="root"]').click();
    await page.locator('#mm-svg').dispatchEvent('wheel', { deltaY: 100 });
    await page.waitForTimeout(330);
    assert.equal(await page.locator('[data-node-id="root"]').getAttribute('aria-expanded'), expandedBefore, 'Wheel did not cancel a pending single-click');
    await page.locator('[data-node-id="root"]').click();
    await page.waitForTimeout(330);
    assert.notEqual(await page.locator('[data-node-id="root"]').getAttribute('aria-expanded'), expandedBefore, 'Single-click did not toggle branch expansion');
    await page.locator('[data-node-id="root"]').press('Enter');
    assert.equal(await page.locator('[data-node-id="legacy"]').count(), 1);
    await page.locator('[data-node-id="legacy"]').press('Enter');
    assert.equal(await page.locator('#mm-detail-title').textContent(), 'Legacy leaf');
    assert.equal(await page.locator('#mm-detail-summary').textContent(), 'Legacy summary');

    await page.locator('[data-node-id="root"]').press('ArrowLeft');
    assert.equal(await page.locator('#mm-detail-title').textContent(), 'Legacy leaf', 'Collapsing an ancestor replaced the open node details');
    assert.equal(await page.locator('[data-node-id="legacy"]').count(), 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.nodeId), 'root', 'Closing hidden child details did not focus the nearest visible ancestor');

    await page.locator('[data-node-id="root"]').press('ArrowRight');
    await page.locator('[data-node-id="legacy"]').press('Shift+Enter');
    await page.locator('[data-node-id="root"]').press('ArrowLeft');
    await page.reload();
    await page.click('#open-mindmap');
    await page.click('#chapter-mindmap-1');
    assert.equal(await page.locator('#mm-detail-title').textContent(), 'Legacy leaf', 'Hidden child details were not restored');
    assert.equal(await page.locator('[data-node-id="legacy"]').count(), 0);
    await page.locator('#mm-detail-title').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.nodeId), 'root', 'Restored hidden child details did not fall back to the visible ancestor');

    await page.locator('[data-node-id="root"]').press('Shift+Enter');
    assert.equal(await page.locator('#mm-detail-title').textContent(), 'Root concept');
    await page.reload();
    await page.click('#open-mindmap');
    await page.click('#chapter-mindmap-1');
    assert.equal(await page.locator('#mm-details').isVisible(), true, 'Open details were not restored');
    assert.equal(await page.locator('#mm-detail-title').textContent(), 'Root concept');
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, [], 'Source link loaded without an explicit user action');

    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const touch = await touchContext.newPage();
    await touch.goto(pathToFileURL(output).href);
    await touch.click('#open-mindmap');
    await touch.click('#chapter-mindmap-1');
    const touchRoot = touch.locator('[data-node-id="root"]');
    const touchExpanded = await touchRoot.getAttribute('aria-expanded');
    const box = await touchRoot.boundingBox();
    assert.ok(box);
    await touch.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await touch.waitForTimeout(80);
    await touch.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await touch.locator('#mm-detail-title').textContent(), 'Root concept');
    assert.equal(await touch.locator('[data-node-id="root"]').getAttribute('aria-expanded'), touchExpanded);
    const mobilePanel = await touch.locator('#mm-details').evaluate(element => ({ height: element.clientHeight, bottom: Math.round(element.getBoundingClientRect().bottom), viewport: innerHeight }));
    assert.ok(mobilePanel.height >= 300, `Mobile details panel is only ${mobilePanel.height}px high`);
    assert.ok(Math.abs(mobilePanel.bottom - mobilePanel.viewport) <= 1, 'Mobile details panel is not fixed to the viewport bottom');
    const mobileScreenshot = path.join(directory, 'node-details-mobile.png');
    await touch.screenshot({ path: mobileScreenshot });
    assert.ok((await fs.stat(mobileScreenshot)).size > 10000, 'Mobile details screenshot was not created');
    await touchContext.close();
    console.log(JSON.stringify({ status: 'PASS', checks: 18, mobilePanelHeight: mobilePanel.height, browser: browser.version() }));
  } finally {
    if (browser) await browser.close();
    const cleanupTarget = await fs.realpath(directory);
    const relativeTarget = path.relative(temporaryRoot, cleanupTarget);
    const safeTarget = relativeTarget && !path.isAbsolute(relativeTarget) && !relativeTarget.startsWith(`..${path.sep}`) && !relativeTarget.includes(path.sep) && path.basename(cleanupTarget).startsWith('study-studio-node-details-');
    if (!safeTarget) throw new Error(`Refusing to remove unexpected test directory: ${cleanupTarget}`);
    await fs.rm(cleanupTarget, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
