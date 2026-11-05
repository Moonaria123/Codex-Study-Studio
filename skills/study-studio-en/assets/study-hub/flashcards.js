(function () {
  'use strict';

  const TEXT_FIELDS = ['section', 'topic', 'kind', 'question', 'answer', 'hint', 'explanation', 'pitfall'];
  const RATINGS = new Set(['known', 'review']);
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const copy = value => JSON.parse(JSON.stringify(value));
  const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
  const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 160 && !['__proto__', 'constructor', 'prototype'].includes(value);

  function cleanCard(value) {
    if (!isObject(value) || !validId(value.id)) throw new Error('Each card needs a valid ID.');
    const card = {id: value.id};
    for (const field of TEXT_FIELDS) {
      if (value[field] != null && typeof value[field] !== 'string') throw new Error('Card fields must be plain text.');
      card[field] = (value[field] || '').trim();
      if (card[field].length > 20000) throw new Error('A card field exceeds 20,000 characters.');
    }
    if (!card.question || !card.answer) throw new Error('Each card needs a question and an answer.');
    card.kind = card.kind || 'Definition';
    const pages = value.pages == null ? [] : value.pages;
    if (!Array.isArray(pages) || pages.length > 200 || pages.some(page => !Number.isInteger(page) || page < 1 || page > 100000)) {
      throw new Error('Printed page numbers must be positive integers.');
    }
    card.pages = [...new Set(pages)];
    return card;
  }

  function cleanCards(values) {
    if (!Array.isArray(values) || values.length > 5000) throw new Error('A library must contain at most 5,000 cards.');
    const cards = values.map(cleanCard);
    if (new Set(cards.map(card => card.id)).size !== cards.length) throw new Error('Card IDs must be unique.');
    return cards;
  }

  window.HubModules = window.HubModules || {};
  window.HubModules.flashcards = {
    mount(api) {
      const container = api.container;
      const originals = cleanCards(api.chapter.cards);
      const originalMap = new Map(originals.map(card => [card.id, card]));
      const chapterId = String(api.chapter.id == null ? api.chapter.number : api.chapter.id);
      const listeners = [];
      let alive = true;
      let completing = false;
      let pending = false;
      let editingId = null;
      let editorReturnFocus = null;
      let libraryChanged = false;
      const urls = new Set();
      const emptyLibrary = () => ({schema: 1, overrides: {}, custom: [], hidden: []});

      function normaliseLibrary(value) {
        if (!isObject(value)) return emptyLibrary();
        const result = emptyLibrary();
        result.custom = cleanCards(value.custom || []);
        if (originals.length + result.custom.length > 5000) throw new Error('Original and custom cards together must not exceed 5,000 cards.');
        if (result.custom.some(card => originalMap.has(card.id))) throw new Error('Custom IDs conflict with original cards.');
        if (isObject(value.overrides)) {
          for (const [id, candidate] of Object.entries(value.overrides)) {
            if (!originalMap.has(id)) continue;
            const card = cleanCard(candidate);
            if (card.id !== id) throw new Error('An edited card has a mismatched ID.');
            result.overrides[id] = card;
          }
        }
        const ids = new Set([...originalMap.keys(), ...result.custom.map(card => card.id)]);
        result.hidden = [...new Set((Array.isArray(value.hidden) ? value.hidden : []).filter(id => ids.has(id)))];
        return result;
      }

      let library;
      let libraryNotice = '';
      try {
        library = normaliseLibrary(typeof api.getLibrary === 'function' ? api.getLibrary() : null);
      } catch (error) {
        library = emptyLibrary();
        libraryNotice = 'The saved card library could not be read. Original cards are available; the saved library has not been overwritten.';
      }
      const canEdit = typeof api.getLibrary === 'function' && typeof api.saveLibrary === 'function';
      function libraryCards() {
        return originals.map(card => own(library.overrides, card.id) ? library.overrides[card.id] : card).concat(library.custom);
      }
      function activeLibrary() {
        const hidden = new Set(library.hidden);
        return libraryCards().filter(card => !hidden.has(card.id));
      }
      function freshState(subsetIds) {
        const available = activeLibrary();
        const allowed = new Set(available.map(card => card.id));
        const subset = [...new Set((Array.isArray(subsetIds) ? subsetIds : []).filter(id => allowed.has(id)))];
        const subsetSet = new Set(subset);
        const cards = subset.length ? available.filter(card => subsetSet.has(card.id)) : available;
        return {schema: 1, attemptCards: copy(cards), order: cards.map(card => card.id), currentId: cards[0]?.id || null,
          index: 0, flipped: false, hint: false, explanationOpen: false, ratings: {},
          filters: {section: 'all', kind: 'all', review: false}, subsetIds: subset};
      }
      function normaliseState(raw) {
        const result = freshState(raw?.subsetIds);
        if (!isObject(raw)) return result;
        // Freeze the attempt's content independently of future library changes.
        if (Array.isArray(raw.attemptCards)) {
          try { result.attemptCards = cleanCards(raw.attemptCards); }
          catch (_) { libraryNotice = 'The saved attempt could not be fully restored. Current library cards are ready.'; return result; }
        }
        const ids = new Set(result.attemptCards.map(card => card.id));
        const subset = [...new Set((Array.isArray(raw.subsetIds) ? raw.subsetIds : []).filter(id => ids.has(id)))];
        result.subsetIds = subset;
        if (subset.length) {
          const limited = new Set(subset);
          result.attemptCards = result.attemptCards.filter(card => limited.has(card.id));
        }
        const included = new Set(result.attemptCards.map(card => card.id));
        result.order = [...new Set((Array.isArray(raw.order) ? raw.order : []).filter(id => included.has(id)))];
        for (const card of result.attemptCards) if (!result.order.includes(card.id)) result.order.push(card.id);
        if (isObject(raw.ratings)) for (const [id, value] of Object.entries(raw.ratings)) {
          if (included.has(id) && RATINGS.has(value)) result.ratings[id] = value;
        }
        const filters = isObject(raw.filters) ? raw.filters : {};
        result.filters = {
          section: typeof filters.section === 'string' ? filters.section : 'all',
          kind: typeof filters.kind === 'string' ? filters.kind : 'all', review: filters.review === true
        };
        const current = raw.currentId || raw.current;
        result.currentId = included.has(current) ? current : result.order[Number.isInteger(raw.index) ? raw.index : 0] || result.order[0] || null;
        result.flipped = raw.flipped === true;
        result.hint = raw.hint === true;
        result.explanationOpen = raw.explanationOpen === true;
        return result;
      }
      let state = normaliseState(api.state);

      container.innerHTML = `<section class="fc-root" aria-label="Active recall flashcards">
        <header class="fc-heading"><div><p class="fc-eyebrow">Active recall · self-assessment</p><h2>Flashcards</h2><p class="fc-subtitle"></p></div><button type="button" class="fc-primary" data-action="fc-finish">Finish and record</button></header>
        <div class="fc-library-notice" role="status" hidden></div>
        <div class="fc-toolbar">
          <label>Section<select data-action="fc-section" aria-label="Filter flashcards by section"></select></label>
          <label>Type<select data-action="fc-kind" aria-label="Filter flashcards by type"></select></label>
          <label class="fc-check"><input type="checkbox" data-action="fc-review-filter">Needs review only</label>
          <details class="fc-manage"><summary>Manage library</summary><div class="fc-manage-options">
            <p>Library changes apply to your next session or after Restart. This attempt keeps its current card content.</p>
            <button type="button" data-action="fc-add">Add card</button><button type="button" data-action="fc-edit">Edit current card</button>
            <button type="button" data-action="fc-hide">Hide current card</button><button type="button" data-action="fc-restore">Restore original cards</button>
            <button type="button" data-action="fc-export">Download library JSON</button><button type="button" data-action="fc-import">Import library JSON</button>
          </div></details>
        </div>
        <p class="fc-status" role="status" aria-live="polite"></p>
        <div class="fc-summary"><span class="fc-position"></span><div class="fc-counts"><span>Got it <strong class="fc-known-count">0</strong></span><span>Review <strong class="fc-review-count">0</strong></span><span>Unrated <strong class="fc-unrated-count">0</strong></span></div></div>
        <progress class="fc-progress" aria-label="Cards self-assessed in this attempt" max="1" value="0"></progress>
        <section class="fc-empty" hidden><h3>No cards in this selection</h3><p class="fc-empty-message"></p><button type="button" data-action="fc-clear-filters">Clear filters</button></section>
        <article class="fc-card" tabindex="0" aria-describedby="fc-keyboard-help">
          <div class="fc-card-meta"><span class="fc-source-top"></span><span class="fc-rating-badge">Not rated</span></div>
          <div class="fc-front"><h3 class="fc-question"></h3><p class="fc-hint" hidden></p></div>
          <div class="fc-back" hidden><p class="fc-topic"></p><p class="fc-answer"></p>
            <details class="fc-explanation"><summary>Explanation, common pitfall and source</summary><p class="fc-explanation-text"></p><h4>Common pitfall</h4><p class="fc-pitfall"></p><p class="fc-source"></p></details>
          </div>
          <div class="fc-card-actions"><span class="fc-flip-guidance"></span><div><button type="button" data-action="fc-hint">Hint</button><button type="button" data-action="fc-flip">Show answer</button></div></div>
        </article>
        <div class="fc-navigation"><button type="button" data-action="fc-previous">← Previous</button><div class="fc-rating-actions"><button type="button" class="fc-review" data-action="fc-rate-review">Need review · 1</button><button type="button" class="fc-known" data-action="fc-rate-known">Got it · 2</button></div><button type="button" data-action="fc-next">Next →</button></div>
        <div class="fc-secondary"><button type="button" data-action="fc-clear-rating">Mark current card unrated</button><button type="button" data-action="fc-shuffle">Shuffle</button><button type="button" data-action="fc-restart">Restart</button></div>
        <p class="fc-help" id="fc-keyboard-help">Space: flip · Left / Right: navigate · 1 / 2: assess after revealing · H: hint.<br>Counts and reports cover every card in this attempt, including cards outside the current filters. Each card is counted once.</p>
        <dialog class="fc-editor" aria-labelledby="fc-editor-title"><form class="fc-editor-form">
          <div class="fc-editor-heading"><h3 id="fc-editor-title">Add a card</h3><button type="button" data-action="fc-editor-close" aria-label="Close card editor">×</button></div>
          <p>These library changes will apply to a new session or after Restart.</p>
          <div class="fc-form-grid"><label>Section<input name="section" maxlength="120"></label><label>Type<input name="kind" maxlength="120" placeholder="Definition"></label></div>
          <label>Topic<input name="topic" maxlength="500"></label><label>Question<textarea name="question" rows="3" maxlength="20000" required></textarea></label>
          <label>Answer<textarea name="answer" rows="4" maxlength="20000" required></textarea></label><label>Hint<textarea name="hint" rows="2" maxlength="20000"></textarea></label>
          <label>Explanation<textarea name="explanation" rows="3" maxlength="20000"></textarea></label><label>Common pitfall<textarea name="pitfall" rows="2" maxlength="20000"></textarea></label>
          <label>Printed pages, separated by commas<input name="pages" placeholder="8, 9"></label><p class="fc-editor-error" role="alert"></p>
          <div class="fc-editor-actions"><button type="button" data-action="fc-editor-cancel">Cancel</button><button type="submit" class="fc-primary">Save to library</button></div>
        </form></dialog><input class="fc-import-file" type="file" accept=".json,application/json" hidden>
      </section>`;
      const root = container.querySelector('.fc-root');
      const $ = selector => root.querySelector(selector);
      const action = name => $(`[data-action="fc-${name}"]`);
      const on = (element, name, handler, options) => {
        element.addEventListener(name, handler, options);
        listeners.push(() => element.removeEventListener(name, handler, options));
      };
      $('.fc-subtitle').textContent = `Chapter ${chapterId} · ${api.chapter.title}`;
      function message(text) { if (alive) $('.fc-status').textContent = text; }
      function resetFace() { state.flipped = false; state.hint = false; state.explanationOpen = false; }
      function attemptMap() { return new Map(state.attemptCards.map(card => [card.id, card])); }
      function orderedCards() { const map = attemptMap(); return state.order.map(id => map.get(id)).filter(Boolean); }
      function selection() {
        return orderedCards().filter(card => (state.filters.section === 'all' || card.section === state.filters.section)
          && (state.filters.kind === 'all' || card.kind === state.filters.kind)
          && (!state.filters.review || state.ratings[card.id] === 'review'));
      }
      function current() { return selection().find(card => card.id === state.currentId) || null; }
      function counts() {
        const cards = orderedCards();
        const known = cards.filter(card => state.ratings[card.id] === 'known').length;
        const review = cards.filter(card => state.ratings[card.id] === 'review').length;
        return {known, review, total: cards.length, answered: known + review, unrated: cards.length - known - review};
      }
      function setOptions(select, values, selected, label) {
        select.replaceChildren();
        for (const value of ['all', ...values]) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value === 'all' ? label : value || 'Unspecified';
          select.append(option);
        }
        select.value = values.includes(selected) ? selected : 'all';
        return select.value;
      }
      function sourceText(card) {
        return `Chapter ${chapterId}${card.section ? ' · Source section / locator ' + card.section : ''}${card.pages.length ? ' · Printed pages ' + card.pages.join(', ') : card.section ? '' : ' · No source locator supplied'}`;
      }
      function render() {
        if (!alive) return;
        const all = orderedCards();
        state.filters.section = setOptions(action('section'), [...new Set(all.map(card => card.section))].sort((a, b) => a.localeCompare(b, 'en', {numeric: true})), state.filters.section, 'All sections');
        state.filters.kind = setOptions(action('kind'), [...new Set(all.map(card => card.kind))].sort(), state.filters.kind, 'All types');
        action('review-filter').checked = state.filters.review;
        const list = selection();
        if (!list.some(card => card.id === state.currentId)) {
          state.currentId = list[0]?.id || null;
          resetFace();
        }
        state.index = Math.max(0, state.order.indexOf(state.currentId));
        const card = current();
        const number = counts();
        $('.fc-position').textContent = card ? `Card ${list.findIndex(item => item.id === card.id) + 1} of ${list.length} shown · ${number.total} in attempt` : `0 shown · ${number.total} in attempt`;
        $('.fc-known-count').textContent = number.known;
        $('.fc-review-count').textContent = number.review;
        $('.fc-unrated-count').textContent = number.unrated;
        $('.fc-progress').max = Math.max(1, number.total);
        $('.fc-progress').value = number.answered;
        $('.fc-card').hidden = !card;
        $('.fc-empty').hidden = !!card;
        $('.fc-empty-message').textContent = number.total ? 'No attempt cards match these filters. Clear filters to continue; your ratings are retained.' : 'The library has no available cards. Add a card or restore originals, then restart.';
        action('finish').disabled = !number.total || completing;
        for (const name of ['previous', 'next', 'flip', 'hint']) action(name).disabled = !card;
        for (const name of ['rate-review', 'rate-known']) action(name).disabled = !card || !state.flipped || completing;
        action('clear-rating').disabled = !card || !RATINGS.has(state.ratings[card.id]);
        for (const name of ['add', 'restore', 'import']) action(name).disabled = !canEdit || pending;
        for (const name of ['edit', 'hide']) action(name).disabled = !canEdit || !card || pending;
        action('shuffle').disabled = number.total < 2 || pending;
        action('restart').disabled = pending;
        const notice = libraryChanged ? 'Library changes are saved. This attempt retains its original content; restart or begin a new session to use the changes.' : libraryNotice;
        $('.fc-library-notice').hidden = !notice;
        $('.fc-library-notice').textContent = notice;
        if (!card) return;
        const rating = state.ratings[card.id];
        $('.fc-source-top').textContent = `${card.section ? 'Section ' + card.section : 'Custom card'} · ${card.kind} · ${card.id}`;
        $('.fc-rating-badge').textContent = rating === 'known' ? 'Got it' : rating === 'review' ? 'Needs review' : 'Not rated';
        $('.fc-front').hidden = state.flipped;
        $('.fc-back').hidden = !state.flipped;
        $('.fc-question').textContent = card.question;
        $('.fc-hint').textContent = state.hint ? card.hint : '';
        $('.fc-hint').hidden = !state.hint || !card.hint;
        $('.fc-topic').textContent = state.flipped ? card.topic : '';
        $('.fc-answer').textContent = state.flipped ? card.answer : '';
        $('.fc-explanation-text').textContent = state.flipped ? card.explanation : '';
        $('.fc-pitfall').textContent = state.flipped ? card.pitfall : '';
        $('.fc-pitfall').hidden = !card.pitfall;
        $('.fc-explanation h4').hidden = !card.pitfall;
        $('.fc-source').textContent = state.flipped ? sourceText(card) : '';
        $('.fc-explanation').open = state.flipped && state.explanationOpen;
        action('hint').hidden = state.flipped;
        action('hint').disabled = !card.hint;
        action('hint').textContent = state.hint ? 'Hide hint' : 'Hint';
        action('flip').textContent = state.flipped ? 'Show question' : 'Show answer';
        action('hide').textContent = originalMap.has(card.id) ? 'Hide current original' : 'Delete current custom card';
        $('.fc-flip-guidance').textContent = state.flipped ? 'Assess your recall, then move on.' : 'Recall the answer before revealing it.';
        $('.fc-card').setAttribute('aria-label', state.flipped ? 'Answer side. Press Space to show the question.' : 'Question side. Press Space to reveal the answer.');
      }
      function getState() { return copy(state); }
      function change(text) {
        if (!alive) return;
        render();
        api.onChange(getState());
        if (text) message(text);
      }
      function getReport() {
        const number = counts();
        return {mode: 'self-assessment', scoreLabel: 'Self-assessed recall', earned: number.known, max: number.total,
          answered: number.answered, correct: number.known, total: number.total,
          items: orderedCards().map(card => {
            const selected = RATINGS.has(state.ratings[card.id]) ? state.ratings[card.id] : null;
            return {itemId: card.id, topic: card.topic, section: card.section, pages: [...card.pages], question: card.question,
              scenario: null, scenarioTitle: null, statements: [], options: {}, selected,
              correct: selected == null ? null : selected === 'known', correctAnswer: card.answer,
              explanation: card.explanation, optionAnalysis: {}, steps: [], examTip: '', pitfall: card.pitfall,
              marks: 1, earned: selected === 'known' ? 1 : 0};
          })};
      }
      function focusCard() { if (current()) $('.fc-card').focus({preventScroll: true}); }
      function flip() {
        if (!current() || completing || pending) return;
        state.flipped = !state.flipped;
        state.explanationOpen = false;
        change(state.flipped ? 'Answer revealed. Choose Need review or Got it.' : 'Question side. Recall before revealing.');
      }
      function hint() {
        if (!current()?.hint || state.flipped || pending) return;
        state.hint = !state.hint;
        change();
      }
      function move(delta) {
        const list = selection();
        if (!list.length || completing || pending) return;
        const index = list.findIndex(card => card.id === state.currentId);
        state.currentId = list[(index + delta + list.length) % list.length].id;
        resetFace();
        change();
        focusCard();
      }
      function rate(value) {
        const card = current();
        if (!card || !state.flipped || completing || pending) return;
        const before = selection();
        const index = before.findIndex(item => item.id === card.id);
        state.ratings[card.id] = value;
        const after = selection();
        const next = before[(index + 1) % before.length]?.id;
        state.currentId = after.some(item => item.id === next) ? next : after[Math.min(index, after.length - 1)]?.id || null;
        resetFace();
        change(value === 'known' ? 'Marked Got it. Each card counts once.' : 'Marked Needs review. Each card counts once.');
        focusCard();
      }
      async function confirmAction(title, messageText, confirmLabel, callback) {
        if (pending || completing || !alive) return;
        $('.fc-manage').open = false;
        pending = true;
        render();
        try {
          const approved = await api.confirm({title, message: messageText, confirmLabel});
          if (approved && alive) await callback();
        } catch (error) { message(error.message || 'The action could not be completed.'); }
        finally { pending = false; if (alive) render(); }
      }
      async function finish() {
        if (completing || pending || !state.order.length) return;
        const number = counts();
        const complete = async () => {
          if (!alive) return;
          completing = true;
          render();
          try { await api.onComplete(getReport()); }
          catch (error) { message(error.message || 'The attempt could not be recorded. Try again.'); }
          finally { completing = false; if (alive) render(); }
        };
        if (number.unrated) await confirmAction('Finish with unrated cards?', `${number.unrated} of ${number.total} cards are still unrated. The record will include them as unanswered. Scores are self-assessed.`, 'Finish and record', complete);
        else await complete();
      }
      function closeEditor() {
        if ($('.fc-editor').open) $('.fc-editor').close();
        if (editorReturnFocus?.isConnected) editorReturnFocus.focus();
      }
      function openEditor(edit) {
        if (!canEdit || pending || completing) return;
        const selected = edit ? current() : null;
        if (edit && !selected) return;
        const card = selected ? libraryCards().find(item => item.id === selected.id) || selected : null;
        editingId = card?.id || null;
        editorReturnFocus = document.activeElement;
        $('#fc-editor-title').textContent = card ? 'Edit library card' : 'Add a library card';
        for (const field of TEXT_FIELDS) $('.fc-editor-form').elements.namedItem(field).value = card ? card[field] : field === 'kind' ? 'Definition' : '';
        $('.fc-editor-form').elements.namedItem('pages').value = card ? card.pages.join(', ') : '';
        $('.fc-editor-error').textContent = '';
        $('.fc-manage').open = false;
        $('.fc-editor').showModal();
        $('.fc-editor-form').elements.namedItem('question').focus();
      }
      async function saveLibrary(next) {
        const cleaned = normaliseLibrary(next);
        const result = await api.saveLibrary(copy(cleaned));
        if (result === false) throw new Error('The library could not be saved. Your current attempt is unchanged.');
        if (!alive) return false;
        library = cleaned;
        libraryChanged = true;
        render();
        return true;
      }
      async function saveEditor(event) {
        event.preventDefault();
        if (pending || !canEdit) return;
        try {
          const form = $('.fc-editor-form');
          const pageText = form.elements.namedItem('pages').value.trim();
          if (pageText && !/^\d+(\s*,\s*\d+)*$/.test(pageText)) throw new Error('Use page numbers separated by commas.');
          const card = {id: editingId || `custom-c${chapterId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, pages: pageText ? pageText.split(',').map(Number) : []};
          for (const field of TEXT_FIELDS) card[field] = form.elements.namedItem(field).value;
          const cleaned = cleanCard(card);
          const next = copy(library);
          if (originalMap.has(cleaned.id)) next.overrides[cleaned.id] = cleaned;
          else {
            const index = next.custom.findIndex(item => item.id === cleaned.id);
            if (index < 0) next.custom.push(cleaned); else next.custom[index] = cleaned;
          }
          next.hidden = next.hidden.filter(id => id !== cleaned.id);
          pending = true;
          $('.fc-editor-form button[type="submit"]').disabled = true;
          if (await saveLibrary(next)) { closeEditor(); message('Saved to your library. Restart or start a new session to use the revised cards.'); }
        } catch (error) { if (alive) $('.fc-editor-error').textContent = error.message; }
        finally { pending = false; if (alive) { $('.fc-editor-form button[type="submit"]').disabled = false; render(); } }
      }
      function hideCard() {
        const card = current();
        if (!card || !canEdit) return;
        const original = originalMap.has(card.id);
        confirmAction(original ? 'Hide this library card?' : 'Delete this custom library card?', 'This changes future sessions and does not remove the card from this attempt or earlier records. Download a library backup first if you need one.', original ? 'Hide card' : 'Delete custom card', async () => {
          const next = copy(library);
          if (original) next.hidden = [...new Set([...next.hidden, card.id])];
          else { next.custom = next.custom.filter(item => item.id !== card.id); next.hidden = next.hidden.filter(id => id !== card.id); }
          await saveLibrary(next);
          message('Library updated. This attempt and its ratings are unchanged.');
        });
      }
      function exportLibrary() {
        const payload = {schema: 'study-studio-flashcard-library-v1', chapter: chapterId, title: api.chapter.title,
          exported_at: new Date().toISOString(), cards: copy(libraryCards()), hidden_ids: [...library.hidden]};
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}));
        urls.add(url);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${api.chapter.downloadPrefix || 'Study'}_Chapter${chapterId}_Flashcard_Library.json`;
        anchor.hidden = true;
        root.append(anchor);
        anchor.click();
        anchor.remove();
        $('.fc-manage').open = false;
        message('Library backup downloaded. Answer progress and historical records are managed separately by the Study Hub.');
      }
      async function importLibrary(file) {
        if (!file || !canEdit || pending || completing) return;
        try {
          if (file.size > 15000000) throw new Error('Choose a JSON file no larger than 15 MB.');
          const payload = JSON.parse(await file.text());
          if (!alive) return;
          if (!isObject(payload) || !['study-studio-flashcard-library-v1', 'study-studio-flashcard-deck-v1'].includes(payload.schema) || String(payload.chapter) !== chapterId) {
            throw new Error('Choose a flashcard library or deck backup for this chapter.');
          }
          const cards = cleanCards(payload.cards);
          if (!cards.length) throw new Error('The imported library is empty.');
          const ids = new Set(cards.map(card => card.id));
          const hidden = payload.hidden_ids || [];
          if (!Array.isArray(hidden) || hidden.some(id => !ids.has(id))) throw new Error('Hidden card IDs are invalid.');
          const next = emptyLibrary();
          for (const card of cards) {
            if (originalMap.has(card.id)) next.overrides[card.id] = card; else next.custom.push(card);
          }
          next.hidden = [...new Set([...hidden, ...originals.filter(card => !ids.has(card.id)).map(card => card.id)])];
          await confirmAction('Replace your card library?', `Import ${cards.length} cards and replace local library edits and custom cards? This attempt and past records stay unchanged. Imported ratings are not applied. Original cards remain recoverable.`, 'Import library', async () => {
            await saveLibrary(next);
            message('Library imported. Restart or start a new session to use it.');
          });
        } catch (error) { message('Import not applied: ' + error.message); }
        finally { if (alive) $('.fc-import-file').value = ''; }
      }

      on(action('flip'), 'click', flip);
      on(action('hint'), 'click', hint);
      on(action('previous'), 'click', () => move(-1));
      on(action('next'), 'click', () => move(1));
      on(action('rate-known'), 'click', () => rate('known'));
      on(action('rate-review'), 'click', () => rate('review'));
      on(action('finish'), 'click', finish);
      on(action('clear-rating'), 'click', () => {
        const card = current();
        if (!card || completing || pending) return;
        delete state.ratings[card.id];
        change('Self-assessment removed for this card.');
      });
      for (const name of ['section', 'kind']) on(action(name), 'change', event => {
        state.filters[name] = event.target.value;
        resetFace();
        change();
      });
      on(action('review-filter'), 'change', event => { state.filters.review = event.target.checked; resetFace(); change(); });
      on(action('clear-filters'), 'click', () => { state.filters = {section: 'all', kind: 'all', review: false}; resetFace(); change(); });
      on(action('shuffle'), 'click', () => confirmAction('Shuffle this attempt?', 'Randomise card order and start at the first shuffled card? Existing self-assessments will be retained.', 'Shuffle', () => {
        for (let index = state.order.length - 1; index > 0; index--) {
          const random = Math.floor(Math.random() * (index + 1));
          [state.order[index], state.order[random]] = [state.order[random], state.order[index]];
        }
        state.currentId = null;
        resetFace();
        change('Cards shuffled; self-assessments retained.');
      }));
      on(action('restart'), 'click', () => confirmAction('Restart this attempt?', 'Clear current self-assessments and filters, return to original card order, and load the current library. Earlier records and library changes are retained.', 'Restart', async () => {
        if (typeof api.onRestart === 'function') await api.onRestart();
        if (!alive) return;
        state = freshState(state.subsetIds);
        libraryChanged = false;
        change('Restarted in original order using the current library.');
        focusCard();
      }));
      on(action('add'), 'click', () => openEditor(false));
      on(action('edit'), 'click', () => openEditor(true));
      on(action('hide'), 'click', hideCard);
      on(action('restore'), 'click', () => {
        if (!canEdit) return;
        confirmAction('Restore original library cards?', 'Remove edits to original cards and unhide them. Custom cards remain. This attempt and earlier records are unchanged.', 'Restore originals', async () => {
          const next = copy(library);
          next.overrides = {};
          next.hidden = next.hidden.filter(id => !originalMap.has(id));
          await saveLibrary(next);
          message('Original library cards restored. Restart or start a new session to use them.');
        });
      });
      on(action('export'), 'click', exportLibrary);
      on(action('import'), 'click', () => { $('.fc-manage').open = false; $('.fc-import-file').click(); });
      on($('.fc-import-file'), 'change', event => importLibrary(event.target.files[0]));
      on(action('editor-close'), 'click', closeEditor);
      on(action('editor-cancel'), 'click', closeEditor);
      on($('.fc-editor'), 'cancel', event => { event.preventDefault(); if (!pending) closeEditor(); });
      on($('.fc-editor-form'), 'submit', saveEditor);
      on($('.fc-explanation'), 'toggle', () => {
        if (!state.flipped || state.explanationOpen === $('.fc-explanation').open) return;
        state.explanationOpen = $('.fc-explanation').open;
        api.onChange(getState());
      });
      on($('.fc-card'), 'click', event => { if (!event.target.closest('button,details,a,input,textarea,select')) flip(); });
      on(root, 'keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || pending || completing || $('.fc-editor').open || event.target.closest('input,textarea,select,button,summary,a,[contenteditable="true"]')) return;
        if (event.key === ' ') { event.preventDefault(); flip(); }
        else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
        else if (event.key === '1') { event.preventDefault(); rate('review'); }
        else if (event.key === '2') { event.preventDefault(); rate('known'); }
        else if (event.key.toLowerCase() === 'h') { event.preventDefault(); hint(); }
      });
      render();
      api.onChange(getState());
      return {
        getState,
        getReport,
        destroy() {
          alive = false;
          for (const remove of listeners) remove();
          for (const url of urls) URL.revokeObjectURL(url);
          urls.clear();
          if ($('.fc-editor').open) $('.fc-editor').close();
          container.replaceChildren();
        }
      };
    }
  };
})();
