// Validate both public landing pages through an isolated loopback HTTP server.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const output = path.join(root, 'verification/showcase-qa');
const resultFile = path.join(root, 'verification/showcase-qa.json');
const channel = process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : '');
const result = { status: 'RUNNING', channel: channel || 'chromium', checks: [], errors: [], failedResources: [], externalRequests: [] };
let browser, server, page;
const pass = (name, details) => { result.checks.push({ name, status: 'PASS', ...(details ? { details } : {}) }); console.log(`PASS ${name}`); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

async function startServer() {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.json': 'application/json' };
  server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(docs, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(docs + path.sep)) { res.writeHead(403).end(); return; }
      const stat = await fs.stat(file);
      if (!stat.isFile()) { res.writeHead(404).end(); return; }
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      const start = range ? Number(range[1]) : 0;
      const end = range && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
      if (start > end) { res.writeHead(416).end(); return; }
      res.writeHead(range ? 206 : 200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Content-Length': end - start + 1,
        'Accept-Ranges': 'bytes',
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${stat.size}` } : {}),
      });
      if (req.method === 'HEAD') res.end(); else createReadStream(file, { start, end }).pipe(res);
    } catch (_) { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}/`;
}

async function checkLocalReferences(base, name) {
  const references = await page.evaluate(() => {
    const values = [];
    for (const [selector, attribute] of [['a[href]', 'href'], ['img[src]', 'src'], ['source[src]', 'src'], ['link[href]', 'href'], ['script[src]', 'src'], ['video[poster]', 'poster']]) {
      for (const item of document.querySelectorAll(selector)) values.push(item.getAttribute(attribute));
    }
    return [...new Set(values)];
  });
  let count = 0;
  for (const reference of references) {
    if (reference.startsWith('#')) {
      assert.ok(await page.locator(reference).count(), `${name}: missing anchor ${reference}`);
    } else if (!/^[a-z][a-z\d+.-]*:/i.test(reference)) {
      const url = new URL(reference, base + name);
      const file = path.resolve(docs, '.' + decodeURIComponent(url.pathname));
      assert.ok(file.startsWith(docs + path.sep), 'Reference leaves the published docs directory');
      assert.ok((await fs.stat(file)).isFile(), `${name}: missing local asset ${reference}`);
      count += 1;
    }
  }
  pass(`${name}-local-assets-and-anchor-targets`, { localReferences: count });
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const base = await startServer();
  browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) result.failedResources.push({ path: new URL(response.url()).pathname, status: response.status() }); });
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol) && url.origin !== new URL(base).origin) result.externalRequests.push(url.origin + url.pathname); });
  const clip = path.join(docs, 'demo/Lecture_Preview_15s.mp4');
  const sourceClip = path.join(root, 'examples/ai-agents-tool-use/Chapter 04 - Tool Use/Lecture_Preview_15s.mp4');
  result.stylesheetSha256 = sha(await fs.readFile(path.join(docs, 'assets/site.css')));
  assert.equal(sha(await fs.readFile(clip)), sha(await fs.readFile(sourceClip)), 'Published preview differs from the current AI-agent lesson clip');
  result.videoSha256 = sha(await fs.readFile(clip));
  pass('published-video-matches-agent-lesson');
  for (const name of ['index.html', 'zh.html']) {
    const lang = name === 'index.html' ? 'en' : 'zh-CN';
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(base + name);
    assert.equal(await page.locator('html').getAttribute('lang'), lang);
    await page.waitForFunction(() => { const image = document.querySelector('.hero-art img'); return image?.complete && image.naturalWidth > 1000; });
    const hero = await page.locator('.hero-art img').evaluate(image => ({ width: image.naturalWidth, height: image.naturalHeight }));
    pass(`${name}-hero-loaded`, hero);
    await checkLocalReferences(base, name);
    for (const anchor of ['explore', 'workflow', 'install']) {
      await page.locator(`nav a[href="#${anchor}"]`).click();
      await page.waitForFunction(id => { const box = document.getElementById(id).getBoundingClientRect(); return location.hash === '#' + id && box.top < innerHeight && box.bottom > 0; }, anchor);
    }
    pass(`${name}-contents-navigation`);
    await page.goto(base + name);
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.viewport + 1);
    await page.screenshot({ path: path.join(output, name === 'index.html' ? 'english-desktop.png' : 'chinese-desktop.png'), fullPage: true });
    await page.screenshot({ path: path.join(output, name === 'index.html' ? 'english-desktop-first-screen.png' : 'chinese-desktop-first-screen.png') });
    pass(`${name}-desktop-layout`, dimensions);
    await page.waitForFunction(() => { const video = document.querySelector('video'); return video?.readyState >= 1 && Number.isFinite(video.duration); });
    const media = await page.locator('video').evaluate(video => ({ duration: video.duration, width: video.videoWidth, height: video.videoHeight, error: video.error?.message || null }));
    assert.ok(Math.abs(media.duration - 15) <= 0.1, `Expected 15s preview, received ${media.duration}`);
    assert.equal(media.error, null);
    assert.ok(media.width >= 640 && media.height >= 360);
    await page.locator('video').evaluate(video => { video.currentTime = 7.5; });
    await page.waitForFunction(() => { const video = document.querySelector('video'); return !video.seeking && video.readyState >= 2; });
    await page.locator('video').screenshot({ path: path.join(output, name === 'index.html' ? 'video-frame-english.png' : 'video-frame-chinese.png') });
    pass(`${name}-15-second-video-metadata-and-seek`, media);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(base + name);
    await page.waitForFunction(() => document.querySelector('.hero-art img').complete);
    const mobile = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(mobile.scroll <= mobile.viewport + 1, `${name}: mobile horizontal overflow`);
    const navigationLines = await page.locator('nav a').evaluateAll(links => links.map(link => {
      const range = document.createRange();
      range.selectNodeContents(link);
      return { text: link.textContent, lines: new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size };
    }));
    assert.ok(navigationLines.every(link => link.lines === 1), `${name}: mobile navigation text wraps`);
    pass(`${name}-360-navigation-single-line-labels`, { links: navigationLines });
    if (lang === 'zh-CN') {
      const titleLines = await page.locator('.hero h1').evaluate(title => {
        const lines = new Map();
        const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          for (let i = 0; i < node.length; i += 1) {
            const range = document.createRange();
            range.setStart(node, i); range.setEnd(node, i + 1);
            const top = Math.round(range.getBoundingClientRect().top);
            lines.set(top, (lines.get(top) || '') + node.textContent[i]);
          }
        }
        return [...lines.values()];
      });
      assert.equal(titleLines.length, 2, 'Chinese mobile heading should retain its two intended lines');
      assert.ok(titleLines.at(-1).trim().length > 2, 'Chinese mobile heading has an orphaned ending');
      pass('zh.html-360-heading-no-orphan', { lines: titleLines });
    }
    await page.screenshot({ path: path.join(output, name === 'index.html' ? 'english-360.png' : 'chinese-360.png'), fullPage: true });
    await page.screenshot({ path: path.join(output, name === 'index.html' ? 'english-360-first-screen.png' : 'chinese-360-first-screen.png') });
    pass(`${name}-360-layout`, mobile);
    await page.locator('nav a.language').click();
    assert.equal(await page.locator('html').getAttribute('lang'), lang === 'en' ? 'zh-CN' : 'en');
    pass(`${name}-language-switch`);
    result[name] = { sha256: sha(await fs.readFile(path.join(docs, name))) };
  }
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.failedResources, []);
  assert.deepEqual(result.externalRequests, []);
  pass('no-script-errors-missing-resources-or-external-network');
  result.status = 'PASS';
  result.browserVersion = browser.version();
  result.finishedAt = new Date().toISOString();
  await fs.writeFile(resultFile, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', checks: result.checks.length }));
})().catch(async error => {
  result.status = 'FAIL';
  result.failure = error.message.replaceAll(root, '<repository>');
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(resultFile, JSON.stringify(result, null, 2) + '\n');
  if (page) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
  console.error(error.message); process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
