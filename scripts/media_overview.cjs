// Render the vector overview and collect contact sheets without external assets.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const arg = process.argv.indexOf('--course');
  if (arg < 0 || !process.argv[arg+1]) throw new Error('Supply --course <example-directory>');
  const name=process.argv[arg+1];
  const course = path.isAbsolute(name) ? name : path.join(root, 'examples', name);
  const manifest=JSON.parse(fs.readFileSync(path.join(course,'_studio','slide-content.json'),'utf8'));
  if (!manifest.chapter_dir) throw new Error('Set chapter_dir in slide-content.json');
  const chapter = path.resolve(course, manifest.chapter_dir);
  const relativeChapter=path.relative(path.resolve(course),chapter);
  if (relativeChapter.startsWith('..'+path.sep) || relativeChapter==='..' || path.isAbsolute(relativeChapter)) throw new Error('chapter_dir must remain inside the selected course');
  const render = path.join(course, '_studio', 'render');
  const dimensions = JSON.parse(fs.readFileSync(path.join(render, 'overview-render.json'), 'utf8'));
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  const page = await browser.newPage({viewport:{width:dimensions.width,height:1000},deviceScaleFactor:1});
  const vector = fs.readFileSync(path.join(chapter,'Knowledge_Overview.svg'),'utf8');
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#103e3c}svg{display:block}</style></head><body>'+vector+'</body></html>');
  await page.screenshot({path:path.join(chapter,'Knowledge_Overview.png'), fullPage:true, timeout:15000});
  await browser.close();
  console.log(JSON.stringify({overview:dimensions}));
})().catch(err => { console.error(err); process.exit(1); });
