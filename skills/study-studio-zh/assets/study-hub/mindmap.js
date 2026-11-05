(function () {
  'use strict';

  window.HubModules.mindmap = { mount };

  function mount(api) {
    const container = api.container;
    const chapter = api.chapter;
    const chapterNumber = chapter.number ?? chapter.id;
    const NS = 'http://www.w3.org/2000/svg';
    const controller = new AbortController();
    const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal: controller.signal });
    const S = (name, attrs = {}, value) => {
      const element = document.createElementNS(NS, name);
      for (const [key, item] of Object.entries(attrs)) element.setAttribute(key, String(item));
      if (value != null) element.textContent = String(value);
      return element;
    };
    const string = value => Array.isArray(value) ? value.join('; ') : value == null ? '' : String(value);
    const app = document.createElement('section');
    app.className = 'mm-app';
    // This markup is static. All chapter content is assigned through textContent.
    app.innerHTML = `
      <header class="mm-header">
        <p class="mm-eyebrow" id="mm-chapter-label"></p><h2 class="mm-title" id="mm-title"></h2>
        <div class="mm-tools">
          <div class="mm-search-group"><label for="mm-search" class="mm-sr-only">Search concepts</label><input id="mm-search" type="search" placeholder="Search concepts…" autocomplete="off"><button id="mm-search-previous" type="button" aria-label="Previous search match">‹</button><button id="mm-search-next" type="button" aria-label="Next search match">›</button></div>
          <div class="mm-tool-group"><button id="mm-expand-all" type="button">Expand all</button><button id="mm-collapse-all" type="button">Collapse all</button><button id="mm-fit-view" type="button">Fit</button><button id="mm-zoom-out" type="button" aria-label="Zoom out">−</button><span id="mm-zoom-level" class="mm-zoom-level">100%</span><button id="mm-zoom-in" type="button" aria-label="Zoom in">+</button></div>
          <details class="mm-export-menu" id="mm-export-menu"><summary>Export</summary><div class="mm-export-box"><label><input id="mm-export-all" type="checkbox"> Include the full tree</label><div class="mm-tool-group"><button id="mm-export-png" type="button">Download PNG</button><button id="mm-export-svg" type="button">Download SVG</button></div><p>Exports include the complete visible diagram, regardless of zoom or pan. Full tree also includes collapsed branches.</p></div></details>
        </div>
        <div class="mm-status-row"><span id="mm-status" role="status" aria-live="polite"></span><span id="mm-search-status" role="status" aria-live="polite"></span></div>
      </header>
      <div class="mm-workspace"><div class="mm-stage" id="mm-stage"><svg id="mm-svg" class="mm-map-svg" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Chapter mind map. Drag to pan; wheel or pinch to zoom." tabindex="0"><g id="mm-scene"></g></svg><div class="mm-hint-strip">Drag to pan · Single-click to expand · Double-click for details · Shift+Enter for details · F to fit</div></div>
      <aside id="mm-details" class="mm-details-panel" aria-labelledby="mm-detail-title" hidden><div class="mm-details-heading"><h3 id="mm-detail-title" tabindex="-1"></h3><button id="mm-close-details" type="button" aria-label="Close concept details">×</button></div><p id="mm-detail-summary" class="mm-detail-summary"></p><section id="mm-detail-explanation-wrap"><h4>Detailed explanation</h4><p id="mm-detail-explanation"></p></section><section id="mm-detail-exam-wrap"><h4>Exam focus</h4><p id="mm-detail-exam"></p></section><section class="mm-source"><h4>Source index</h4><p id="mm-detail-source"></p><a id="mm-detail-source-link" target="_blank" rel="noopener noreferrer" hidden>Open source</a></section></aside></div>`;
    container.append(app);
    const $ = id => app.querySelector('#mm-' + id);
    const svg = $('svg'), scene = $('scene'), stage = $('stage');
    $('title').textContent = chapter.title;
    $('chapter-label').textContent = `Chapter ${chapterNumber} · Knowledge map`;

    const nodes = new Map(), parents = new Map(), branches = new Map(), defaults = new Set();
    function index(node, parent = null, depth = 0, branch = -1) {
      if (!node || typeof node.id !== 'string' || !node.id || nodes.has(node.id)) throw Error('Every concept needs a unique text ID.');
      nodes.set(node.id, node); parents.set(node.id, parent); branches.set(node.id, branch);
      if (depth < 2) defaults.add(node.id);
      for (const [position, child] of (node.children || []).entries()) index(child, node.id, depth + 1, depth === 0 ? position : branch);
    }
    try { index(chapter.root); } catch (error) {
      $('status').textContent = error.message;
      api.notify(error.message);
      const errorState = { schema: 1, expandedIds: [], camera: { x: 0, y: 0, z: 1 }, selectedId: null, detailsOpen: false, search: { query: '', matchIndex: -1 }, exportAll: false };
      api.onChange(errorState);
      return { getState: () => structuredClone(errorState), getReport: () => null, destroy() { controller.abort(); app.remove(); } };
    }

    const saved = api.state && typeof api.state === 'object' ? api.state : {};
    const expanded = new Set(Array.isArray(saved.expandedIds) ? saved.expandedIds.filter(id => nodes.has(id)) : defaults);
    const hasSavedCamera = saved.camera && ['x', 'y', 'z'].every(key => Number.isFinite(saved.camera[key])) && saved.camera.z >= .02 && saved.camera.z <= 3.5;
    let camera = hasSavedCamera ? { x: saved.camera.x, y: saved.camera.y, z: saved.camera.z } : { x: 0, y: 0, z: 1 };
    let selected = nodes.has(saved.selectedId) ? saved.selectedId : null;
    let detailsOpen = !!saved.detailsOpen && !!selected;
    let query = typeof saved.search?.query === 'string' ? saved.search.query : '';
    let searchQuery = query.trim().toLocaleLowerCase(), matches = [], matchIndex = -1;
    let light = document.body.classList.contains('light'), model = null, destroyed = false, observer = null, initialFrame = null, lastSize = null;
    let needsInitialFit = !hasSavedCamera;
    const timers = new Set(), objectUrls = new Set(), pointers = new Map();
    const DOUBLE_TAP_MS = 280;
    let pendingTap = null;
    const measure = document.createElement('canvas').getContext('2d');
    const WIDTH = 286, GAP = 94, ROW = 22, PAD = 48;
    const palette = ['#81aef5', '#b49aef', '#71c6b1', '#e8b577', '#e394a8', '#8cc8df'];
    $('search').value = query;
    $('export-all').checked = !!saved.exportAll;

    function getState() {
      return { schema: 1, expandedIds: [...expanded], camera: { ...camera }, selectedId: selected, detailsOpen,
        search: { query, matchIndex }, exportAll: $('export-all').checked };
    }
    function changed() { if (!destroyed) api.onChange(getState()); }
    function status(message, notify = false) { if (!destroyed) { $('status').textContent = message; if (notify) api.notify(message); } }
    function size() { const r = stage.getBoundingClientRect(); return { width: r.width, height: r.height }; }
    function rememberSize() { lastSize = size(); }
    const colour = id => branches.get(id) < 0 ? (light ? '#4776a5' : '#a7bfdf') : palette[branches.get(id) % palette.length];
    function wrap(label) {
      measure.font = '600 16px Arial';
      const limit = WIDTH - 48, lines = []; let line = '';
      for (const token of string(label).split(/\s+/)) {
        if (!token) continue;
        const next = line ? line + ' ' + token : token;
        if (measure.measureText(next).width <= limit) { line = next; continue; }
        if (line) { lines.push(line); line = ''; }
        if (measure.measureText(token).width <= limit) { line = token; continue; }
        for (const character of token) { if (measure.measureText(line + character).width > limit) { lines.push(line); line = ''; } line += character; }
      }
      if (line) lines.push(line);
      return lines.length ? lines : ['Untitled concept'];
    }
    function layout(all = false) {
      const entries = [], links = []; let maxDepth = 0;
      function build(node, depth) {
        const lines = wrap(node.label), height = Math.max(62, lines.length * 22 + 30);
        const children = (all || expanded.has(node.id) ? node.children || [] : []).map(child => build(child, depth + 1));
        const total = children.reduce((sum, child) => sum + child.span, 0) + Math.max(0, children.length - 1) * ROW;
        return { node, depth, lines, height, children, span: Math.max(height, total) };
      }
      const tree = build(chapter.root, 0);
      function place(item, top) {
        const entry = { ...item, x: PAD + item.depth * (WIDTH + GAP), y: top + (item.span - item.height) / 2, w: WIDTH, h: item.height };
        entries.push(entry); maxDepth = Math.max(maxDepth, item.depth);
        const total = item.children.reduce((sum, child) => sum + child.span, 0) + Math.max(0, item.children.length - 1) * ROW;
        let next = top + (item.span - total) / 2;
        for (const child of item.children) { links.push({ from: entry, to: place(child, next) }); next += child.span + ROW; }
        return entry;
      }
      place(tree, PAD);
      return { entries, links, width: PAD * 2 + (maxDepth + 1) * WIDTH + maxDepth * GAP, height: tree.span + PAD * 2 };
    }
    function createScene(value, interactive) {
      const group = S('g');
      for (const link of value.links) {
        const x1 = link.from.x + WIDTH, y1 = link.from.y + link.from.h / 2, x2 = link.to.x, y2 = link.to.y + link.to.h / 2;
        group.append(S('path', { d: `M ${x1} ${y1} C ${x1 + GAP * .55} ${y1}, ${x2 - GAP * .55} ${y2}, ${x2} ${y2}`, fill: 'none', stroke: colour(link.to.node.id), 'stroke-width': 2, opacity: light ? .65 : .7 }));
      }
      for (const item of value.entries) {
        const id = item.node.id, c = colour(id), isMatch = searchQuery && matches.includes(id), groupNode = S('g', { 'data-node-id': id });
        const hasChildren = !!item.node.children?.length;
        if (interactive) {
          groupNode.setAttribute('tabindex', '0'); groupNode.setAttribute('role', 'button');
          groupNode.setAttribute('aria-label', `${item.node.label}${hasChildren ? ', ' + (expanded.has(id) ? 'expanded' : 'collapsed') : ''}. Single-click to expand or collapse; double-click or press Shift+Enter for details.`);
          if (hasChildren) groupNode.setAttribute('aria-expanded', String(expanded.has(id)));
        }
        groupNode.append(S('rect', { x: item.x, y: item.y, width: WIDTH, height: item.h, rx: 13, fill: light ? '#ffffff' : '#252c37', stroke: isMatch ? '#ecb85d' : selected === id ? (light ? '#244a70' : '#e3edff') : c, 'stroke-width': isMatch || selected === id ? 3 : 1.4 }));
        groupNode.append(S('rect', { x: item.x + 1, y: item.y + 12, width: 4, height: item.h - 24, rx: 2, fill: c }));
        const label = S('text', { x: item.x + 18, y: item.y + 25, fill: light ? '#20354b' : '#f0f3f8', 'font-family': 'Arial, Helvetica, sans-serif', 'font-size': 16, 'font-weight': 600 });
        item.lines.forEach((line, index) => label.append(S('tspan', { x: item.x + 18, dy: index ? 22 : 0 }, line)));
        groupNode.append(label);
        if (hasChildren) groupNode.append(S('text', { x: item.x + WIDTH - 17, y: item.y + item.h / 2 + 5, fill: c, 'font-family': 'Arial, Helvetica, sans-serif', 'font-size': 18, 'text-anchor': 'middle', 'font-weight': 700 }, expanded.has(id) || (!interactive && item.children.length) ? '−' : '+'));
        group.append(groupNode);
      }
      return group;
    }
    function applyCamera() { scene.setAttribute('transform', `translate(${camera.x} ${camera.y}) scale(${camera.z})`); $('zoom-level').textContent = `${Math.round(camera.z * 100)}%`; }
    function draw() {
      model = layout(); scene.replaceChildren(...createScene(model, true).childNodes); applyCamera(); rememberSize();
      status(`${model.entries.length} of ${nodes.size} concepts visible`);
      $('search-previous').disabled = !matches.length; $('search-next').disabled = !matches.length;
    }
    function fit(save = true) {
      const r = size(); if (!model || r.width <= 0 || r.height <= 0) return;
      needsInitialFit = false;
      camera.z = Math.max(.02, Math.min(1.15, (r.width - 40) / model.width, (r.height - 50) / model.height));
      camera.x = (r.width - model.width * camera.z) / 2; camera.y = (r.height - model.height * camera.z) / 2;
      applyCamera(); if (save) changed();
    }
    function zoomAt(factor, x, y) {
      const next = Math.max(.02, Math.min(3.5, camera.z * factor)), ratio = next / camera.z;
      camera = { z: next, x: x - (x - camera.x) * ratio, y: y - (y - camera.y) * ratio }; applyCamera(); changed();
    }
    function zoomCentre(factor) { const r = size(); zoomAt(factor, r.width / 2, r.height / 2); }
    function focusNode(id) {
      const element = [...scene.querySelectorAll('[data-node-id]')].find(candidate => candidate.dataset.nodeId === id);
      if (!element) return false;
      element.focus({ preventScroll: true }); return true;
    }
    function safeSourceUrl(value) {
      if (typeof value !== 'string' || !value || value !== value.trim() || /[\u0000-\u001f\\]/.test(value) || value.startsWith('/') || value.startsWith('#') || value.startsWith('?')) return '';
      try {
        const parsed = new URL(value, document.baseURI);
        if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) return '';
        if (parsed.protocol === 'file:' && /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(value)) return '';
        return parsed.href;
      } catch (_error) { return ''; }
    }
    function showDetails(id, focus = false) {
      const changedSelection = selected !== id;
      const node = nodes.get(id); selected = id; detailsOpen = true; $('details').hidden = false;
      $('detail-title').textContent = node.label; $('detail-summary').textContent = string(node.summary);
      const explanation = string(node.details);
      $('detail-explanation-wrap').hidden = !explanation; $('detail-explanation').textContent = explanation;
      $('detail-exam-wrap').hidden = !node.exam; $('detail-exam').textContent = string(node.exam);
      const source = node.source && typeof node.source === 'object' ? node.source : {};
      const parts = [`Chapter ${chapterNumber}`];
      if (source.title) parts.push(string(source.title));
      if (source.edition) parts.push(string(source.edition));
      if (node.section) parts.push('Section / locator ' + string(node.section));
      if (node.pages?.length) parts.push('Printed pages ' + node.pages.join(', '));
      if (source.pdfPages?.length) parts.push('PDF file pages ' + source.pdfPages.join(', '));
      $('detail-source').textContent = parts.join(' · ');
      const href = safeSourceUrl(source.url), link = $('detail-source-link');
      link.hidden = !href; if (href) link.href = href; else link.removeAttribute('href');
      if (changedSelection) $('details').scrollTop = 0;
      if (focus) $('detail-title').focus({ preventScroll: true });
    }
    function closeDetails() {
      detailsOpen = false; $('details').hidden = true; rememberSize(); changed();
      let target = selected;
      while (target && !focusNode(target)) target = parents.get(target);
      if (!target) svg.focus({ preventScroll: true });
    }
    function locate(id, horizontal = .5) {
      let parent = parents.get(id); while (parent) { expanded.add(parent); parent = parents.get(parent); }
      showDetails(id); draw();
      const node = model.entries.find(item => item.node.id === id), r = size(), mobile = app.getBoundingClientRect().width <= 760;
      camera.z = Math.min(1.1, Math.max(.9, camera.z)); if (r.width < 400) camera.z = Math.min(camera.z, Math.max(.02, (r.width - 36) / WIDTH));
      camera.x = r.width * (mobile ? .5 : horizontal) - (node.x + WIDTH / 2) * camera.z;
      camera.y = r.height * (mobile ? .28 : .5) - (node.y + node.h / 2) * camera.z;
      applyCamera(); changed();
    }
    function activate(id, keyboard = false) {
      if (!nodes.get(id).children?.length) { openDetails(id); return; }
      if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
      draw(); changed(); if (keyboard) focusNode(id);
    }
    function openDetails(id) {
      showDetails(id); draw(); changed(); $('detail-title').focus({ preventScroll: true });
    }
    function flushPendingTap(run = false) {
      if (!pendingTap) return;
      clearTimeout(pendingTap.timer); timers.delete(pendingTap.timer);
      const value = pendingTap; pendingTap = null;
      if (run) activate(value.id);
    }
    function handleTap(id) {
      if (pendingTap?.id === id) { flushPendingTap(); openDetails(id); return; }
      flushPendingTap(true);
      const timer = setTimeout(() => { timers.delete(timer); if (pendingTap?.timer === timer) { pendingTap = null; activate(id); } }, DOUBLE_TAP_MS);
      timers.add(timer); pendingTap = { id, timer };
    }
    function computeMatches() { matches = searchQuery ? [...nodes.values()].filter(node => (string(node.label) + ' ' + string(node.summary) + ' ' + string(node.section)).toLocaleLowerCase().includes(searchQuery)).map(node => node.id) : []; }
    function searchStatus() { $('search-status').textContent = searchQuery ? (matches.length ? `Match ${matchIndex + 1} of ${matches.length}` : 'No matching concepts') : ''; }
    function search() {
      query = $('search').value; searchQuery = query.trim().toLocaleLowerCase(); computeMatches(); matchIndex = matches.length ? 0 : -1;
      if (matches.length) {
        for (const id of matches) { let parent = parents.get(id); while (parent) { expanded.add(parent); parent = parents.get(parent); } }
        locate(matches[0]);
      } else { draw(); changed(); }
      searchStatus();
    }
    function cycleMatch(delta) { if (!matches.length) return; matchIndex = (matchIndex + delta + matches.length) % matches.length; locate(matches[matchIndex]); searchStatus(); }

    let gesture = null;
    function beginGesture() {
      const values = [...pointers.values()];
      if (values.length >= 2) { flushPendingTap(); const [a, b] = values; gesture = { kind: 'pinch', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y), camera: { ...camera }, moved: true }; }
      else if (values.length) { const p = values[0]; gesture = { kind: 'pan', x: p.x, y: p.y, camera: { ...camera }, target: p.target, moved: !!gesture?.moved }; }
      else gesture = null;
    }
    listen(svg, 'pointerdown', event => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      const target = event.target.closest('[data-node-id]')?.dataset.nodeId; if (target) event.preventDefault();
      const r = svg.getBoundingClientRect(); pointers.set(event.pointerId, { x: event.clientX - r.left, y: event.clientY - r.top, target });
      svg.setPointerCapture(event.pointerId); beginGesture(); svg.classList.add('mm-dragging');
    });
    listen(svg, 'pointermove', event => {
      if (!pointers.has(event.pointerId) || !gesture) return;
      const r = svg.getBoundingClientRect(), point = pointers.get(event.pointerId); point.x = event.clientX - r.left; point.y = event.clientY - r.top;
      if (gesture.kind === 'pinch') {
        const [a, b] = [...pointers.values()], x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
        const next = Math.max(.02, Math.min(3.5, gesture.camera.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, gesture.distance))), ratio = next / gesture.camera.z;
        camera = { z: next, x: x - (gesture.x - gesture.camera.x) * ratio, y: y - (gesture.y - gesture.camera.y) * ratio };
      } else {
        const dx = point.x - gesture.x, dy = point.y - gesture.y; if (Math.hypot(dx, dy) > 5) { gesture.moved = true; flushPendingTap(); }
        camera.x = gesture.camera.x + dx; camera.y = gesture.camera.y + dy;
      }
      applyCamera(); changed();
    });
    function endPointer(event, cancelled = false) {
      if (!pointers.has(event.pointerId)) return;
      if (cancelled) flushPendingTap();
      const id = !cancelled && gesture?.kind === 'pan' && !gesture.moved ? gesture.target : null;
      pointers.delete(event.pointerId); if (pointers.size) beginGesture(); else { gesture = null; svg.classList.remove('mm-dragging'); }
      if (id) handleTap(id); else changed();
    }
    listen(svg, 'pointerup', event => endPointer(event)); listen(svg, 'pointercancel', event => endPointer(event, true));
    listen(svg, 'wheel', event => { event.preventDefault(); flushPendingTap(); const r = svg.getBoundingClientRect(); zoomAt(Math.exp(-event.deltaY * .0015), event.clientX - r.left, event.clientY - r.top); }, { passive: false });
    listen(svg, 'keydown', event => {
      const id = event.target.closest('[data-node-id]')?.dataset.nodeId; if (!id) return;
      if (event.key === 'Enter' && event.shiftKey) { event.preventDefault(); event.stopPropagation(); flushPendingTap(); openDetails(id); }
      else if (['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); if (nodes.get(id).children?.length) activate(id, true); else openDetails(id); }
      else if (['ArrowLeft', 'ArrowRight'].includes(event.key) && nodes.get(id).children?.length) {
        event.preventDefault(); event.stopPropagation(); if (event.key === 'ArrowRight') expanded.add(id); else expanded.delete(id);
        draw(); changed(); focusNode(id);
      }
    });
    listen(app, 'keydown', event => {
      if (event.key === 'Escape') { flushPendingTap(); closeDetails(); $('export-menu').open = false; return; }
      if (event.target.closest('input,select,textarea,button,summary')) return;
      if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomCentre(1.2); }
      else if (event.key === '-') { event.preventDefault(); zoomCentre(1 / 1.2); }
      else if (event.key.toLowerCase() === 'f') { event.preventDefault(); fit(); }
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault(); camera.x += event.key === 'ArrowLeft' ? 50 : event.key === 'ArrowRight' ? -50 : 0;
        camera.y += event.key === 'ArrowUp' ? 50 : event.key === 'ArrowDown' ? -50 : 0; applyCamera(); changed();
      }
    });

    function exported(all) {
      const value = layout(all), root = S('svg', { xmlns: NS, width: Math.ceil(value.width), height: Math.ceil(value.height), viewBox: `0 0 ${value.width} ${value.height}` });
      root.append(S('title', {}, `${chapter.title} — Chapter ${chapterNumber}`), S('rect', { width: value.width, height: value.height, fill: light ? '#f4f7fb' : '#181b20' }), createScene(value, false));
      return { xml: new XMLSerializer().serializeToString(root), width: Math.ceil(value.width), height: Math.ceil(value.height), count: value.entries.length };
    }
    function makeUrl(blob) { const url = URL.createObjectURL(blob); objectUrls.add(url); return url; }
    function revoke(url) { URL.revokeObjectURL(url); objectUrls.delete(url); }
    function download(blob, name) {
      if (destroyed) return;
      const url = makeUrl(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = name; app.append(anchor); anchor.click(); anchor.remove();
      const timer = setTimeout(() => { revoke(url); timers.delete(timer); }, 10000); timers.add(timer);
    }
    async function exportMap(format) {
      const all = $('export-all').checked, value = exported(all), name = `${chapter.downloadPrefix || 'Study'}_Chapter_${chapterNumber}_Mind_Map_${all ? 'Full_Tree' : 'Visible_Branches'}`;
      try {
        if (format === 'svg') { download(new Blob([value.xml], { type: 'image/svg+xml;charset=utf-8' }), name + '.svg'); status(`SVG exported: ${value.count} concepts · ${value.width} × ${value.height} viewBox.`, true); return; }
        $('export-png').disabled = true; status('Preparing complete diagram…');
        const scale = Math.min(2, 16000 / value.width, 16000 / value.height, Math.sqrt(40000000 / (value.width * value.height)));
        const width = Math.max(1, Math.floor(value.width * scale)), height = Math.max(1, Math.floor(value.height * scale));
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d', { alpha: false }); if (!context) throw Error('Canvas is unavailable.');
        const url = makeUrl(new Blob([value.xml], { type: 'image/svg+xml;charset=utf-8' }));
        try {
          const image = new Image(); image.src = url; await image.decode(); if (destroyed) return;
          context.drawImage(image, 0, 0, width, height);
          const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(Error('PNG encoding failed.')), 'image/png'));
          if (destroyed) return;
          download(blob, name + '.png'); status(`PNG exported: ${width} × ${height} pixels · ${value.count} concepts.`, true);
        } finally { revoke(url); canvas.width = 1; canvas.height = 1; }
      } catch (error) { if (!destroyed) status(`Export could not finish: ${error.message} Try SVG for the full diagram.`, true); }
      finally { if (!destroyed) $('export-png').disabled = false; }
    }

    listen($('expand-all'), 'click', () => { for (const id of nodes.keys()) expanded.add(id); draw(); fit(); });
    listen($('collapse-all'), 'click', () => { expanded.clear(); expanded.add(chapter.root.id); draw(); fit(); });
    listen($('fit-view'), 'click', () => fit()); listen($('zoom-in'), 'click', () => zoomCentre(1.2)); listen($('zoom-out'), 'click', () => zoomCentre(1 / 1.2));
    listen($('close-details'), 'click', closeDetails);
    listen($('search'), 'input', search);
    listen($('search'), 'keydown', event => { if (event.key === 'Enter') { event.preventDefault(); cycleMatch(event.shiftKey ? -1 : 1); } });
    listen($('search-previous'), 'click', () => cycleMatch(-1)); listen($('search-next'), 'click', () => cycleMatch(1));
    listen($('export-all'), 'change', changed); listen($('export-svg'), 'click', () => exportMap('svg')); listen($('export-png'), 'click', () => exportMap('png'));
    function themeChanged() { const next = document.body.classList.contains('light'); if (next !== light) { light = next; draw(); } }
    listen(window, 'hub-theme-change', themeChanged); listen(document, 'hub-theme-change', themeChanged);

    // Restore derived search highlights without reopening branches or relocating the saved view.
    computeMatches(); matchIndex = matches.length ? Math.max(0, Math.min(matches.length - 1, Number.isInteger(saved.search?.matchIndex) ? saved.search.matchIndex : 0)) : -1;
    if (detailsOpen) showDetails(selected);
    draw(); searchStatus();
    if (!hasSavedCamera) fit(false);
    changed();
    if (!hasSavedCamera && (stage.clientWidth === 0 || stage.clientHeight === 0)) {
      initialFrame = requestAnimationFrame(() => { initialFrame = null; if (!destroyed) fit(); });
    }
    observer = new ResizeObserver(() => {
      if (destroyed) return;
      const next = size();
      if (needsInitialFit && next.width > 0 && next.height > 0) { fit(); lastSize = next; return; }
      // Keep the world point at the centre stable when the host's available space changes.
      if (lastSize && lastSize.width > 0 && lastSize.height > 0 && next.width > 0 && next.height > 0 && (Math.abs(next.width - lastSize.width) > .5 || Math.abs(next.height - lastSize.height) > .5)) {
        camera.x += (next.width - lastSize.width) / 2; camera.y += (next.height - lastSize.height) / 2; applyCamera(); changed();
      }
      lastSize = next;
    });
    observer.observe(stage);

    return {
      getState,
      getReport: () => null,
      destroy() {
        if (destroyed) return;
        destroyed = true; controller.abort(); observer?.disconnect();
        if (initialFrame != null) cancelAnimationFrame(initialFrame);
        flushPendingTap(); for (const timer of timers) clearTimeout(timer); timers.clear();
        for (const url of objectUrls) URL.revokeObjectURL(url); objectUrls.clear();
        for (const id of pointers.keys()) if (svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
        pointers.clear(); app.remove();
      }
    };
  }
})();
