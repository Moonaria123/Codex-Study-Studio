(function () {
  'use strict';

  const LETTERS = ['A', 'B', 'C', 'D'];
  const copy = value => JSON.parse(JSON.stringify(value));
  const asText = value => value == null ? '' : String(value);
  const array = value => Array.isArray(value) ? value : [];

  function mount(api) {
    const container = api.container;
    const questions = array(api.chapter.questions);
    const examMinutes = Number(api.chapter.examDurationMinutes);
    const EXAM_MS = Number.isFinite(examMinutes) && examMinutes > 0 ? Math.round(examMinutes * 60 * 1000) : null;
    const examLabel = EXAM_MS ? timeText(EXAM_MS) : '';
    const byId = new Map(questions.map(question => [question.id, question]));
    const allIds = questions.map(question => question.id);
    let destroyed = false;
    let pending = false;
    let expiryRequested = false;
    let timer = null;
    let initialTick = null;
    const announced = new Set();

    function node(tag, text, className) {
      const element = document.createElement(tag);
      if (text != null) element.textContent = asText(text);
      if (className) element.className = className;
      return element;
    }

    function button(text, action, className) {
      const element = node('button', text, className || 'qz-button');
      element.type = 'button';
      element.dataset.action = action;
      return element;
    }

    function elapsed() {
      const value = Number(api.getElapsedMs());
      return Number.isFinite(value) && value >= 0 ? value : 0;
    }

    function uniqueValid(ids, allowed) {
      return [...new Set(array(ids).filter(id => typeof id === 'string' && allowed.has(id)))];
    }

    function normalise(saved) {
      const input = saved && typeof saved === 'object' ? saved : {};
      const subsetIds = uniqueValid(input.subsetIds, byId);
      const available = subsetIds.length ? subsetIds : allIds;
      const allowed = new Set(available);
      const order = uniqueValid(input.order, allowed);
      available.forEach(id => { if (!order.includes(id)) order.push(id); });
      const mode = EXAM_MS && !subsetIds.length && input.mode === 'exam' ? 'exam' : 'practice';
      const answers = {};
      const checked = {};
      const flags = {};
      order.forEach(id => {
        if (input.answers && LETTERS.includes(input.answers[id])) answers[id] = input.answers[id];
        if (mode === 'practice' && answers[id] && input.checked && input.checked[id] === true) checked[id] = true;
        if ((Array.isArray(input.flags) && input.flags.includes(id)) || (input.flags && input.flags[id] === true)) flags[id] = true;
      });
      const requestedId = input.currentId || input.currentID || input.currentQuestion;
      const currentId = order.includes(requestedId) ? requestedId : order[0] || null;
      const baseline = Number.isFinite(input.examBaselineMs) && input.examBaselineMs >= 0 ? input.examBaselineMs : elapsed();
      return {
        schema: 1,
        mode,
        subsetIds,
        order,
        currentId,
        answers,
        checked,
        flags,
        navFilter: ['all', 'unanswered', 'flagged'].includes(input.navFilter) ? input.navFilter : 'all',
        examBaselineMs: mode === 'exam' ? baseline : null,
        timeExpired: mode === 'exam' && (input.timeExpired === true || elapsed() >= baseline + EXAM_MS),
        submitted: input.submitted === true
      };
    }

    let state = normalise(api.state);

    function save() {
      if (!destroyed) api.onChange(copy(state));
    }

    function getState() {
      return copy(state);
    }

    function getReport() {
      const items = state.order.map(id => {
        const question = byId.get(id);
        const selected = state.answers[id] || null;
        const correct = selected === null ? null : selected === question.answer;
        return {
          itemId: id,
          topic: asText(question.topic),
          section: asText(question.subsection),
          pages: copy(array(question.pages)),
          question: asText(question.stem),
          scenario: question.scenario == null ? null : asText(question.scenario),
          scenarioTitle: question.scenario_title == null ? null : asText(question.scenario_title),
          statements: copy(array(question.statements)),
          options: Object.fromEntries(LETTERS.map(letter => [letter, asText(question.options[letter])])),
          selected,
          correct,
          correctAnswer: question.answer,
          explanation: asText(question.explanation),
          optionAnalysis: Object.fromEntries(LETTERS.map(letter => [letter, asText((question.option_analysis || {})[letter])])),
          steps: copy(array(question.steps)),
          examTip: asText(question.exam_tip),
          pitfall: asText(question.pitfall),
          marks: question.marks,
          earned: correct ? question.marks : 0
        };
      });
      const earned = items.reduce((sum, item) => sum + item.earned, 0);
      const max = items.reduce((sum, item) => sum + item.marks, 0);
      return {
        mode: state.mode,
        scoreLabel: `${earned} / ${max} marks`,
        earned,
        max,
        answered: items.filter(item => item.selected !== null).length,
        correct: items.filter(item => item.correct === true).length,
        total: items.length,
        items
      };
    }

    function source(question) {
      const pages = array(question.pages).join(', ');
      return `Chapter ${api.chapter.number || api.chapter.id}${question.subsection ? ' · Source section / locator ' + asText(question.subsection) : ''}${pages ? ' · Printed ' + (array(question.pages).length === 1 ? 'page ' : 'pages ') + pages : ''}`;
    }

    function timeText(ms) {
      const seconds = Math.max(0, Math.ceil(ms / 1000));
      return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }

    function remainingMs() {
      return state.mode === 'exam' ? Math.max(0, state.examBaselineMs + EXAM_MS - elapsed()) : null;
    }

    function clockUpdate() {
      const clock = container.querySelector('#qz-clock');
      if (!clock) return;
      const remaining = remainingMs();
      clock.textContent = remaining === null ? 'Untimed practice' : `${timeText(remaining)} remaining`;
      clock.classList.toggle('qz-urgent', remaining !== null && remaining <= 300000);
    }

    function guard() {
      if (destroyed || pending || state.submitted || state.timeExpired) return false;
      if (state.mode === 'exam' && remainingMs() <= 0) {
        tick();
        return false;
      }
      return true;
    }

    function feedback(question) {
      const selected = state.answers[question.id];
      const correct = selected === question.answer;
      const section = node('section', null, 'qz-feedback');
      section.id = 'qz-feedback';
      section.setAttribute('aria-labelledby', 'qz-feedback-heading');
      const heading = node('h3', correct ? `Correct · ${question.marks}/${question.marks} marks` : `Incorrect · 0/${question.marks} marks`, correct ? 'qz-good-text' : 'qz-bad-text');
      heading.id = 'qz-feedback-heading';
      heading.tabIndex = -1;
      section.append(heading, node('p', `Your answer: ${selected}. Correct answer: ${question.answer}.`), node('p', question.explanation, 'qz-prose'));
      const analyses = node('ul', null, 'qz-analysis-list');
      LETTERS.forEach(letter => {
        const item = node('li');
        item.append(node('strong', `${letter} — ${letter === question.answer ? 'correct' : 'incorrect'}: `), node('span', (question.option_analysis || {})[letter]));
        analyses.append(item);
      });
      section.append(node('h4', 'Why each option is right or wrong'), analyses);
      function part(title, content, ordered) {
        if (!content || (Array.isArray(content) && !content.length)) return;
        section.append(node('h4', title));
        if (Array.isArray(content)) {
          const list = node(ordered ? 'ol' : 'ul', null, 'qz-detail-list');
          content.forEach(text => list.append(node('li', text)));
          section.append(list);
        } else section.append(node('p', content, 'qz-prose'));
      }
      part('Worked steps', question.steps, true);
      part('Common pitfall', question.pitfall);
      part('Exam technique', question.exam_tip);
      part('Knowledge points', question.knowledge_points);
      part('Learning objectives', question.learning_objectives);
      section.append(node('p', source(question), 'qz-source'));
      return section;
    }

    function render() {
      if (destroyed) return;
      const wrap = node('section', null, 'qz-module');
      wrap.id = 'qz-module';
      const answered = state.order.filter(id => state.answers[id]).length;
      const marked = state.order.filter(id => state.flags[id]).length;
      const maximum = state.order.reduce((sum, id) => sum + byId.get(id).marks, 0);
      const bar = node('div', null, 'qz-toolbar');
      const modeLabel = node('label', 'Mode ', 'qz-mode-label');
      const mode = node('select');
      mode.id = 'qz-mode';
      mode.dataset.action = 'qz-mode';
      mode.setAttribute('aria-label', 'Quiz mode');
      [['practice', 'Practice'], ...(EXAM_MS ? [['exam', 'Exam · ' + examLabel]] : [])].forEach(([value, title]) => {
        const option = node('option', title);
        option.value = value;
        option.selected = value === state.mode;
        option.disabled = value === 'exam' && state.subsetIds.length > 0;
        mode.append(option);
      });
      mode.disabled = pending || state.submitted || state.timeExpired || state.subsetIds.length > 0;
      modeLabel.append(mode);
      const clock = node('span', '', 'qz-clock');
      clock.id = 'qz-clock';
      clock.setAttribute('role', 'timer');
      clock.setAttribute('aria-live', 'off');
      const submitButton = button('Submit and record', 'qz-submit', 'qz-button qz-primary');
      submitButton.id = 'qz-submit';
      submitButton.disabled = pending || state.submitted;
      bar.append(modeLabel, clock, submitButton);
      wrap.append(bar);
      const intro = state.subsetIds.length ? `${state.order.length} questions · ${maximum} marks · Wrong-only practice · Untimed` : `${state.order.length} questions · ${maximum} marks`;
      wrap.append(node('p', intro, 'qz-summary'), node('p', state.mode === 'exam' ? 'Answers and explanations stay hidden until you submit. The clock uses active study time and resumes from your saved position.' : 'Choose an answer, then check it to see the teaching feedback. Checked answers are locked for this attempt.', 'qz-instructions'));
      const status = node('p', `${answered}/${state.order.length} answered · ${state.order.length - answered} unanswered · ${marked} flagged`, 'qz-progress-text');
      status.id = 'qz-progress-text';
      wrap.append(status);
      const progress = node('progress');
      progress.id = 'qz-progress';
      progress.max = state.order.length || 1;
      progress.value = answered;
      progress.setAttribute('aria-label', 'Questions answered');
      wrap.append(progress);
      if (state.timeExpired) wrap.append(node('p', 'Time has expired. Your saved answers are being recorded.', 'qz-expired'));
      if (state.submitted) wrap.append(node('p', 'Attempt submitted. Your results are available in the attempt history.', 'qz-completed'));

      const layout = node('div', null, 'qz-layout');
      const navigator = node('nav', null, 'qz-navigator');
      navigator.setAttribute('aria-label', 'Question navigator');
      navigator.append(node('h3', 'Questions'));
      const filterLabel = node('label', 'Show ', 'qz-filter-label');
      const filter = node('select');
      filter.id = 'qz-nav-filter';
      filter.dataset.action = 'qz-filter';
      [['all', 'All questions'], ['unanswered', 'Unanswered'], ['flagged', 'Flagged']].forEach(([value, title]) => {
        const option = node('option', title);
        option.value = value;
        option.selected = state.navFilter === value;
        filter.append(option);
      });
      filterLabel.append(filter);
      navigator.append(filterLabel);
      const grid = node('div', null, 'qz-grid');
      grid.id = 'qz-question-grid';
      const visible = state.order.filter(id => state.navFilter === 'all' || (state.navFilter === 'flagged' ? state.flags[id] : !state.answers[id]));
      visible.forEach(id => {
        const question = byId.get(id);
        const jump = button(null, 'qz-jump', 'qz-jump');
        jump.id = `qz-nav-${question.number}`;
        jump.dataset.questionId = id;
        jump.append(node('span', question.number), node('span', state.flags[id] ? 'F' : state.answers[id] ? '✓' : '·', 'qz-nav-status'));
        jump.classList.toggle('qz-answered', !!state.answers[id]);
        jump.classList.toggle('qz-flagged', !!state.flags[id]);
        if (state.currentId === id) jump.setAttribute('aria-current', 'step');
        jump.setAttribute('aria-label', `Question ${question.number}, ${state.answers[id] ? 'answered' : 'unanswered'}${state.flags[id] ? ', flagged' : ''}`);
        grid.append(jump);
      });
      navigator.append(grid);
      if (!visible.length) navigator.append(node('p', 'No questions match this filter.', 'qz-empty-filter'));
      navigator.append(node('p', '✓ Answered · F Flagged. The outline marks your current question.', 'qz-legend'));
      layout.append(navigator);

      const question = byId.get(state.currentId);
      const article = node('article', null, 'qz-question');
      article.id = 'qz-question';
      const position = state.order.indexOf(state.currentId);
      const heading = node('h2', `Question ${question.number}`);
      heading.id = 'qz-question-heading';
      heading.tabIndex = -1;
      article.setAttribute('aria-labelledby', heading.id);
      const headingRow = node('div', null, 'qz-heading-row');
      headingRow.append(heading, node('span', `${question.marks} ${question.marks === 1 ? 'mark' : 'marks'}`, 'qz-mark'));
      article.append(headingRow, node('p', `${position + 1} of ${state.order.length} in this attempt · ${question.difficulty || ''}`, 'qz-position'), node('p', question.topic, 'qz-topic'));
      if (question.scenario) {
        const scenario = node('section', null, 'qz-scenario');
        scenario.id = 'qz-scenario';
        scenario.append(node('h3', question.scenario_title || 'Shared scenario'), node('p', question.scenario, 'qz-prose'));
        article.append(scenario);
      }
      const stem = node('p', question.stem, 'qz-stem');
      stem.id = 'qz-stem';
      article.append(stem);
      if (array(question.statements).length) {
        const statements = node('ol', null, 'qz-statements');
        statements.id = 'qz-statements';
        statements.type = 'I';
        question.statements.forEach(statement => statements.append(node('li', statement)));
        article.append(statements);
      }
      const revealed = state.mode === 'practice' && state.checked[question.id] === true;
      const locked = pending || state.submitted || state.timeExpired || revealed;
      const fieldset = node('fieldset', null, 'qz-options');
      fieldset.id = 'qz-options';
      fieldset.disabled = locked;
      fieldset.append(node('legend', 'Choose one best answer'));
      LETTERS.forEach(letter => {
        const label = node('label', null, 'qz-option');
        const input = node('input');
        input.type = 'radio';
        input.name = 'qz-answer';
        input.id = `qz-option-${letter}`;
        input.value = letter;
        input.checked = state.answers[question.id] === letter;
        input.dataset.action = 'qz-answer';
        label.htmlFor = input.id;
        label.classList.toggle('qz-selected', input.checked);
        label.classList.toggle('qz-correct-option', revealed && letter === question.answer);
        label.classList.toggle('qz-wrong-option', revealed && input.checked && letter !== question.answer);
        const content = node('span', question.options[letter], 'qz-option-text');
        if (revealed && (letter === question.answer || input.checked)) content.append(node('span', letter === question.answer ? `Correct answer${input.checked ? ' · your choice' : ''}` : 'Your choice', 'qz-choice-tag'));
        label.append(input, node('strong', `${letter}.`, 'qz-letter'), content);
        fieldset.append(label);
      });
      article.append(fieldset);
      const actions = node('div', null, 'qz-actions');
      if (state.mode === 'practice') {
        const check = button('Check answer', 'qz-check', 'qz-button qz-primary');
        check.id = 'qz-check';
        check.disabled = locked || !state.answers[question.id];
        actions.append(check);
      }
      const clear = button('Clear answer', 'qz-clear');
      clear.id = 'qz-clear';
      clear.disabled = locked || !state.answers[question.id];
      const flag = button(state.flags[question.id] ? 'Remove flag' : 'Flag for review', 'qz-flag');
      flag.id = 'qz-flag';
      flag.setAttribute('aria-pressed', String(!!state.flags[question.id]));
      flag.disabled = pending || state.submitted || state.timeExpired;
      actions.append(clear, flag);
      article.append(actions);
      if (revealed) {
        article.append(node('p', 'This answer is checked and locked for this attempt.', 'qz-locked'), feedback(question));
      }
      article.append(node('p', source(question) + (question.original ? ' · Original practice question' : ''), 'qz-source'));
      const navigation = node('div', null, 'qz-navigation');
      const previous = button('Previous', 'qz-previous');
      previous.id = 'qz-previous';
      previous.disabled = position <= 0 || pending;
      const next = button('Next', 'qz-next');
      next.id = 'qz-next';
      next.disabled = position >= state.order.length - 1 || pending;
      navigation.append(previous, node('span', `${position + 1} / ${state.order.length}`, 'qz-navigation-position'), next);
      article.append(navigation);
      layout.append(article);
      wrap.append(layout);
      container.replaceChildren(wrap);
      clockUpdate();
    }

    function focus(selector) {
      const element = container.querySelector(selector);
      const reveal = selector === '#qz-question-heading' || selector === '#qz-feedback-heading';
      if (element) element.focus({ preventScroll: !reveal });
    }

    function navigate(id) {
      if (destroyed || pending || !state.order.includes(id)) return;
      if (state.mode === 'exam' && !state.submitted && remainingMs() <= 0) { tick(); return; }
      state.currentId = id;
      save();
      render();
      focus('#qz-question-heading');
    }

    async function submit(timedOut) {
      if (destroyed || state.submitted || (pending && !timedOut)) return;
      if (!timedOut && state.mode === 'exam' && remainingMs() <= 0) { tick(); return; }
      const unanswered = state.order.filter(id => !state.answers[id]).length;
      if (!timedOut && unanswered) {
        pending = true;
        render();
        let approved = false;
        try {
          approved = await api.confirm({ title: 'Submit with unanswered questions?', message: `${unanswered} ${unanswered === 1 ? 'question is' : 'questions are'} unanswered and will earn zero marks. Submit this attempt and record the results?`, confirmLabel: 'Submit and record' });
        } catch (_) {
          if (!destroyed) api.notify('The submission confirmation could not be opened. Please try again.');
        }
        if (destroyed || state.submitted) return;
        pending = false;
        if (!approved) { render(); focus('#qz-submit'); return; }
        if (state.mode === 'exam' && remainingMs() <= 0) { tick(); return; }
      }
      if (destroyed || state.submitted) return;
      pending = false;
      if (timedOut) state.timeExpired = true;
      state.submitted = true;
      save();
      render();
      if (timedOut) api.notify('Time expired. Your saved answers have been submitted automatically.');
      try {
        await api.onComplete(getReport());
      } catch (_) {
        if (!destroyed) {
          state.submitted = false;
          save();
          render();
          api.notify('The attempt could not be recorded. Your answers are retained; please submit again.');
        }
      }
    }

    function tick() {
      if (destroyed || state.submitted || state.mode !== 'exam') return;
      const remaining = remainingMs();
      clockUpdate();
      if (remaining <= 0 && !expiryRequested) {
        expiryRequested = true;
        state.timeExpired = true;
        save();
        void submit(true);
        return;
      }
      for (const threshold of [300000, 60000]) {
        if (remaining > 0 && remaining <= threshold && !announced.has(threshold)) {
          announced.add(threshold);
          api.notify(`${timeText(remaining)} remaining in this exam attempt.`);
        }
      }
    }

    async function switchMode(nextMode) {
      if (!guard() || state.subsetIds.length || !['practice', 'exam'].includes(nextMode) || nextMode === state.mode) { render(); return; }
      if (Object.keys(state.answers).length || Object.keys(state.flags).length) {
        pending = true;
        render();
        let approved = false;
        try {
          approved = await api.confirm({ title: 'Start a different mode?', message: 'Changing mode starts a new attempt and clears the answers, checks and flags in this draft. Existing history is unchanged.', confirmLabel: 'Change mode and restart' });
        } catch (_) {
          if (!destroyed) api.notify('The mode confirmation could not be opened. Please try again.');
        }
        if (destroyed || state.submitted) return;
        pending = false;
        if (!approved) { render(); focus('#qz-mode'); return; }
        if (state.mode === 'exam' && remainingMs() <= 0) { tick(); return; }
      }
      api.onRestart();
      state.mode = nextMode;
      state.answers = {};
      state.checked = {};
      state.flags = {};
      state.currentId = state.order[0];
      state.navFilter = 'all';
      state.examBaselineMs = nextMode === 'exam' ? elapsed() : null;
      state.timeExpired = false;
      expiryRequested = false;
      announced.clear();
      save();
      render();
      focus('#qz-question-heading');
      api.notify(nextMode === 'exam' ? `Exam started. You have ${examLabel} of active study time.` : 'Untimed practice started.');
    }

    function onClick(event) {
      const target = event.target.closest('button[data-action]');
      if (!target || !container.contains(target) || target.disabled) return;
      const action = target.dataset.action;
      if (action === 'qz-submit') { void submit(state.timeExpired); return; }
      if (action === 'qz-jump') { navigate(target.dataset.questionId); return; }
      const position = state.order.indexOf(state.currentId);
      if (action === 'qz-previous') { if (position > 0) navigate(state.order[position - 1]); return; }
      if (action === 'qz-next') { if (position < state.order.length - 1) navigate(state.order[position + 1]); return; }
      if (!guard()) return;
      const id = state.currentId;
      if (action === 'qz-flag') {
        if (state.flags[id]) delete state.flags[id]; else state.flags[id] = true;
        save(); render(); focus('#qz-flag');
      } else if (action === 'qz-clear' && !state.checked[id]) {
        delete state.answers[id];
        save(); render(); focus('#qz-option-A');
      } else if (action === 'qz-check' && state.mode === 'practice' && state.answers[id] && !state.checked[id]) {
        state.checked[id] = true;
        save(); render(); focus('#qz-feedback-heading');
      }
    }

    function onChange(event) {
      const target = event.target;
      if (target.dataset.action === 'qz-mode') { void switchMode(target.value); return; }
      if (target.dataset.action === 'qz-filter') {
        state.navFilter = ['all', 'unanswered', 'flagged'].includes(target.value) ? target.value : 'all';
        save(); render(); focus('#qz-nav-filter');
        return;
      }
      if (target.dataset.action !== 'qz-answer') return;
      if (!guard() || state.checked[state.currentId] || !LETTERS.includes(target.value)) { render(); return; }
      state.answers[state.currentId] = target.value;
      save(); render(); focus(`#qz-option-${target.value}`);
    }

    const validData = questions.length > 0 && byId.size === questions.length && questions.every(question => typeof question.id === 'string' && LETTERS.includes(question.answer) && [1, 2].includes(question.marks) && question.options && LETTERS.every(letter => typeof question.options[letter] === 'string') && typeof question.stem === 'string');
    if (!validData) {
      container.replaceChildren(node('p', 'The chapter questions could not be loaded. Return to the study hub and reopen this chapter.', 'qz-error'));
      return { getState, getReport: () => null, destroy() { destroyed = true; } };
    }

    container.addEventListener('click', onClick);
    container.addEventListener('change', onChange);
    save();
    render();
    timer = window.setInterval(tick, 500);
    initialTick = window.setTimeout(tick, 0);
    return {
      getState,
      getReport,
      destroy() {
        destroyed = true;
        window.clearInterval(timer);
        window.clearTimeout(initialTick);
        container.removeEventListener('click', onClick);
        container.removeEventListener('change', onChange);
      }
    };
  }

  window.HubModules.quiz = { mount };
}());
