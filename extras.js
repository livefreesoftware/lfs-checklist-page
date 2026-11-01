// Extras for the checklist: settings, themes, confetti, focus mode, voice capture, quick add,
// templates, notes/screenshot capture and phone swipes (ideas 14, 17–20, 25, 37, 43–46, 53–55).
// Uses the helpers in checklist.html. Only the notes/screenshot box uses Claude (and asks first).

(function () {
  const css = `
  .overlay { position: fixed; inset: 0; z-index: 50; background: color-mix(in srgb, var(--bg) 96%, transparent); display: grid; place-items: center; padding: 24px; }
  .overlay[hidden] { display: none; }
  .focus-card { width: min(720px, 100%); text-align: center; }
  .focus-card .ftask { font-size: clamp(26px, 5vw, 44px); font-weight: 700; line-height: 1.2; margin: 0 0 12px; }
  .focus-card .fpath, .focus-card .fnext { color: var(--muted); margin: 0 0 8px; }
  .focus-card .ftimer { font-size: 64px; font-variant-numeric: tabular-nums; font-weight: 300; margin: 28px 0 18px; }
  .focus-card .fbtns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .fbtn { border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit; font-size: 15px; padding: 10px 18px; border-radius: 10px; cursor: pointer; }
  .fbtn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .modal { width: min(560px, 100%); background: var(--bg); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,.18); padding: 18px; }
  .modal h3 { margin: 0 0 10px; }
  .modal input[type=text], .modal textarea { width: 100%; font: inherit; font-size: 17px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--text); outline: 0; }
  .modal textarea { font-size: 14px; min-height: 160px; resize: vertical; }
  .modal input:focus, .modal textarea:focus { border-color: var(--accent); }
  .modal .mnote { color: var(--muted); font-size: 13px; margin: 8px 0 0; }
  .modal .mbtns { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
  .modal .drop { border: 2px dashed var(--line); border-radius: 10px; padding: 14px; text-align: center; color: var(--muted); font-size: 13px; margin-top: 10px; }
  .modal .drop img { max-width: 100%; max-height: 180px; border-radius: 6px; }
  .confetti { position: fixed; top: -12px; width: 8px; height: 12px; z-index: 99; pointer-events: none; animation: fall 2.2s linear forwards; }
  @keyframes fall { to { transform: translateY(105vh) rotate(600deg); } }
  .mic { position: absolute; right: 196px; top: 50%; transform: translateY(-50%); border: 0; background: transparent; cursor: pointer; font-size: 17px; padding: 4px 6px; border-radius: 6px; color: var(--muted); }
  .mic:hover { background: var(--bg); color: var(--text); }
  .mic.on { color: #d9534f; animation: pulse 1s infinite; }
  @keyframes pulse { 50% { opacity: .4; } }
  @media (max-width: 600px) { .mic { right: 8px; top: 8px; transform: none; } }
  .add-row { display: flex; gap: 14px; align-items: center; }
  .tpl-menu { position: absolute; z-index: 30; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.12); padding: 6px; min-width: 260px; }
  .tpl-menu button { display: block; width: 100%; text-align: left; border: 0; background: transparent; color: var(--text); font: inherit; font-size: 14px; padding: 7px 10px; border-radius: 6px; cursor: pointer; }
  .tpl-menu button small { display: block; color: var(--muted); font-size: 12px; }
  .tpl-menu button:hover { background: var(--hover); }
  .row.swiping { transition: none; }`;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
  };
  const isoIn = days => { const d = new Date(); d.setDate(d.getDate() + days); return d.toLocaleDateString('en-CA'); };

  // ---- Look: theme (43), density (46), confetti (44) ----
  function applyLook() {
    const theme = store.get('theme', '');
    if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
    document.body.classList.toggle('compact', store.get('density', '') === 'compact');
    document.documentElement.style.setProperty('--font-size', store.get('fontSize', '15') + 'px');
  }
  applyLook();

  window.celebrate = function () {
    if (store.get('confetti', '1') !== '1' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#577249', '#3C1A2C', '#d68910', '#2e86c1', '#e5793b'];
    for (let i = 0; i < 50; i++) {
      const p = el('div', 'confetti');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.4 + 's';
      document.body.append(p);
      setTimeout(() => p.remove(), 2800);
    }
  };

  // ---- Settings panel ----
  const panel = document.getElementById('settings');
  const $ = id => document.getElementById(id);
  document.getElementById('settingsBtn').addEventListener('click', e => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { window.renderSettings(); if (online) loadSettings(); }
  });
  document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && e.target.id !== 'settingsBtn') panel.hidden = true; });

  window.renderSettings = function () {
    $('setNotify').checked = settings.notifications !== false;
    $('setTheme').value = store.get('theme', '');
    $('setDensity').value = store.get('density', '');
    $('setConfetti').checked = store.get('confetti', '1') === '1';
    $('setHideTokens').checked = store.get('hideTokens', '1') !== '0';
    $('setFont').value = store.get('fontSize', '15');
    $('setArchive').value = String(settings.auto_archive_days || 0);
  };

  $('setNotify').addEventListener('change', () => saveSettings({ notifications: $('setNotify').checked }));
  $('setHideTokens').addEventListener('change', () => { store.set('hideTokens', $('setHideTokens').checked ? '1' : '0'); hideTokens = $('setHideTokens').checked; render(); });
  $('setFont').addEventListener('input', () => { store.set('fontSize', $('setFont').value); applyLook(); });
  $('setArchive').addEventListener('change', () => saveSettings({ auto_archive_days: +$('setArchive').value }));
  $('setTheme').addEventListener('change', () => { store.set('theme', $('setTheme').value); applyLook(); });
  // One-click light / dark in the top bar (the brand theme counts as light)
  const themeBtn = $('themeBtn');
  function isDark() {
    const t = store.get('theme', '');
    return t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function showThemeBtn() {
    themeBtn.textContent = isDark() ? '☀' : '☾';
    themeBtn.title = isDark() ? 'Switch to light mode' : 'Switch to dark mode';
  }
  themeBtn.addEventListener('click', () => {
    store.set('theme', isDark() ? 'light' : 'dark');
    applyLook();
    showThemeBtn();
    $('setTheme').value = store.get('theme', '');
  });
  $('setTheme').addEventListener('change', showThemeBtn);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', showThemeBtn);
  showThemeBtn();
  $('setDensity').addEventListener('change', () => { store.set('density', $('setDensity').value); applyLook(); });
  $('setConfetti').addEventListener('change', () => store.set('confetti', $('setConfetti').checked ? '1' : '0'));

  // ---- Focus mode (37): one task, big text, done button, 25-minute timer ----
  const focusLayer = el('div', 'overlay');
  focusLayer.hidden = true;
  focusLayer.setAttribute('role', 'dialog');
  focusLayer.setAttribute('aria-modal', 'true');
  focusLayer.setAttribute('aria-label', 'Focus mode');
  focusLayer.addEventListener('keydown', e => { if (e.key === 'Tab' && window.trapTab) window.trapTab(e, focusLayer); });
  document.body.append(focusLayer);
  let timer = null, left = 25 * 60, focusId = null;

  // Time in focus mode counts toward the item's "spent" time; each full 25 minutes is a 🍅
  function closeFocus() {
    const r = focusId && find(focusId);
    if (r && timer) { stopClock(r.it); save(); }
    clearInterval(timer); timer = null; focusLayer.hidden = true; focusId = null;
    render();
  }
  window.openFocus = function (id) {
    const r = find(id);
    if (!r) return;
    focusId = id;
    left = 25 * 60;
    clearInterval(timer);
    timer = null;
    const m = meta(r.it.text);
    const next = r.it.children.find(c => /^next:/i.test(c.text));
    const dod = r.it.children.find(c => /^done:/i.test(c.text));
    focusLayer.innerHTML = '';
    const card = el('div', 'focus-card');
    card.append(el('p', 'fpath', ancestors(id).map(a => a.text).filter(Boolean).join(' › ')), el('h1', 'ftask', m.clean || r.it.text));
    if (next) card.append(el('p', 'fnext', 'Next: ' + next.text.replace(/^next:\s*/i, '')));
    if (dod) card.append(el('p', 'fnext', 'Done when: ' + dod.text.replace(/^done:\s*/i, '')));
    const clock = el('div', 'ftimer', '25:00');
    const show = () => { clock.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'); };
    const btns = el('div', 'fbtns');
    const start = el('button', 'fbtn', 'Start 25 min');
    start.addEventListener('click', () => {
      if (timer) { clearInterval(timer); timer = null; stopClock(r.it); save(); start.textContent = 'Resume'; return; }
      start.textContent = 'Pause';
      r.it.doingSince = Date.now();
      timer = setInterval(() => {
        left--;
        show();
        if (left <= 0) {
          clearInterval(timer); timer = null; start.textContent = 'Start again'; left = 25 * 60;
          stopClock(r.it);
          r.it.pomos = (r.it.pomos || 0) + 1;
          save();
          clock.textContent = 'Time for a break';
          try { new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=').play(); } catch {}
        }
      }, 1000);
    });
    const done = el('button', 'fbtn primary', 'Done ✓');
    done.addEventListener('click', () => { clearInterval(timer); timer = null; markDone(r.it, true); save(); closeFocus(); });
    const close = el('button', 'fbtn', 'Close (Esc)');
    close.addEventListener('click', closeFocus);
    btns.append(start, done, close);
    card.append(clock, btns);
    focusLayer.append(card);
    focusLayer.hidden = false;
    start.focus();
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !focusLayer.hidden) closeFocus(); });

  // ---- Copy for Claude Code (20): a ready-made prompt, free ----
  window.copyForClaude = async function (id) {
    const r = find(id);
    if (!r) return;
    const m = meta(r.it.text);
    const steps = r.it.children.filter(c => !c.done).map(c => '- ' + c.text);
    const prompt = 'Task: ' + m.clean
      + (ancestors(id).length ? '\nPart of: ' + ancestors(id).map(a => a.text).filter(Boolean).join(' > ') : '')
      + (m.tags.length ? '\nTags: ' + m.tags.join(', ') : '')
      + (m.est ? '\nEstimate: ' + m.est + ' min' : '')
      + (m.due ? '\nDue: ' + m.due : '')
      + (steps.length ? '\nOpen steps:\n' + steps.join('\n') : '')
      + '\n\nShow me a short checklist first and wait for my go-ahead if this is more than 3 steps.'
      + '\nWhen you finish, check it off with:\npython3 "/Users/gilescollins/Desktop/Live Free Software/Live Free Software Checklist/add_task.py" --done "'
      + m.clean.slice(0, 40).replace(/"/g, '') + '"';
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus('Copied. Paste it into Claude Code.');
    } catch {
      window.prompt('Copy this prompt:', prompt);
    }
  };

  // ---- Voice capture (14): speak, get tasks ----
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Speech) {
    const mic = el('button', 'mic', '🎙');
    mic.setAttribute('aria-label', 'Speak your brain dump');
    mic.title = 'Speak your brain dump. Say "next" between tasks.';
    mic.tabIndex = -1;
    document.getElementById('captureWrap').append(mic);
    let rec = null;
    mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new Speech();
      rec.continuous = true;
      rec.interimResults = true;
      let heard = '';
      rec.onresult = e => {
        heard = [...e.results].map(x => x[0].transcript).join(' ');
        captureEl.value = heard;
      };
      rec.onend = () => {
        mic.classList.remove('on');
        rec = null;
        const parts = heard.split(/\bnext\b|\band then\b/i).map(x => x.trim()).filter(Boolean);
        if (!parts.length) return;
        const list = captureWhen === 'someday' ? ensureSomeday() : ensureToday();
        list.collapsed = false;
        for (const p of parts) list.children.push(newItem(p[0].toUpperCase() + p.slice(1)));
        captureEl.value = '';
        render();
        save();
        setStatus('Added ' + parts.length + ' from voice');
      };
      rec.onerror = () => { mic.classList.remove('on'); rec = null; setStatus('Voice capture stopped'); };
      rec.start();
      mic.classList.add('on');
      setStatus('Listening… click the mic again to stop');
    });
  }

  // ---- Quick add (18): Cmd/Ctrl+K from anywhere, #tag files it under a matching section ----
  const quick = el('div', 'overlay');
  quick.hidden = true;
  quick.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Quick add"><h3>Quick add</h3><input type="text" placeholder="Add a task… #revenue files it under a section called Revenue">'
    + '<p class="mnote">Enter adds it. A #tag that matches a section name files it there; anything else goes to today\'s Brain Dump. Esc closes.</p></div>';
  document.body.append(quick);
  const qInput = quick.querySelector('input');
  const norm = s => meta(s).clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  function quickTarget(text) {
    for (const tag of meta(text).tags) {
      let hit = null;
      (function walk(l) { for (const it of l) { if (!hit && it.id !== DUMP && norm(it.text) === tag.replace(/[^a-z0-9]/g, '')) hit = it; if (!hit) walk(it.children); } })(data);
      if (hit) return hit;
    }
    return /\bsomeday\b/i.test(text) ? ensureSomeday() : ensureToday();
  }
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      quick.hidden = false;
      qInput.value = '';
      qInput.focus();
    } else if (e.key === 'Escape' && !quick.hidden) {
      quick.hidden = true;
    }
  });
  quick.addEventListener('click', e => { if (e.target === quick) quick.hidden = true; });
  qInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !qInput.value.trim()) return;
    const text = qInput.value.trim();
    const target = quickTarget(text);
    target.children.push(newItem(text));
    target.collapsed = false;
    quick.hidden = true;
    render();
    save();
    setStatus('Added to ' + (target.day ? 'today\'s Brain Dump' : meta(target.text).clean || 'the list'));
  });

  // ---- Templates (25, 53, 54, 55, 56, 58) ----
  const TEMPLATES = [
    ['New client mockup', 'Ask for the client\'s name, then 8 steps with follow-ups', () => {
      const name = prompt('Client or business name?');
      if (!name) return null;
      const tag = '@' + name.toLowerCase().replace(/\W+/g, '-');
      const it = newItem(name + ' – website mockup ' + tag + ' #revenue i:5');
      it.children = ['Research the business and competitors ~30m', 'Pull brand colors, fonts and logo ~15m', 'Draft the site structure ~30m',
        'Build the mockup #deep ~2h', 'Add the intro survey section ~30m', 'Write the cold email ~20m',
        'Follow up (3 days) #outreach due:' + isoIn(3), 'Follow up (7 days) #outreach due:' + isoIn(7)].map(s => newItem(s + ' ' + tag));
      return [it];
    }],
    ['Client sub-list', 'Mockup, email, follow-up date, result', () => {
      const name = prompt('Client name?');
      if (!name) return null;
      const tag = '@' + name.toLowerCase().replace(/\W+/g, '-');
      const it = newItem(name + ' ' + tag);
      it.children = ['Mockup', 'Cold email sent', 'Follow up due:' + isoIn(3), 'Result'].map(s => newItem(s + ' ' + tag));
      return [it];
    }],
    ['Follow-ups after a pitch', '3-day and 7-day follow-ups with due dates', () => {
      const name = prompt('Who did you pitch?');
      if (!name) return null;
      const tag = '@' + name.toLowerCase().replace(/\W+/g, '-');
      return [newItem('Follow up with ' + name + ' (3 day) ' + tag + ' #outreach #revenue i:4 due:' + isoIn(3)),
        newItem('Follow up with ' + name + ' (7 day) ' + tag + ' #outreach #revenue i:3 due:' + isoIn(7))];
    }],
    ['Sales pipeline', 'Prospects › Pitched › Replied › Building › Live › Billing', () => {
      const it = newItem('Sales pipeline');
      it.children = ['Prospects', 'Pitched', 'Replied', 'Building', 'Live', 'Billing'].map(s => newItem(s));
      return [it];
    }],
    ['Backlink batch', '5 directory submissions, logged and checked', () => {
      const it = newItem('Backlink batch #seo');
      it.children = ['Pick 5 directories ~15m', 'Submit listings (same name, address, phone) ~30m', 'Log the URLs and status ~10m',
        'Check they are indexed due:' + isoIn(7)].map(s => newItem(s + ' #seo'));
      return [it];
    }],
    ['P&L check (Mon + Wed)', 'Update the P&L sheet twice a week', () => {
      const d = new Date();
      const next = wd => { const x = new Date(d); x.setDate(d.getDate() + ((wd - d.getDay() + 7) % 7 || 7)); return x.toLocaleDateString('en-CA'); };
      return [newItem('Update P&L sheet (Mon) #admin ~15m due:' + next(1)), newItem('Update P&L sheet (Wed) #admin ~15m due:' + next(3))];
    }]
  ];
  const addRow = document.querySelector('.add-row');
  const tplBtn = el('button', '', '');
  tplBtn.id = 'tplBtn';
  tplBtn.innerHTML = '<span>⧉</span>Template';
  tplBtn.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:6px;border:0;background:transparent;color:var(--muted);font:inherit;cursor:pointer;padding:2px 0';
  addRow.append(tplBtn);
  let menu = null;
  tplBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (menu) { menu.remove(); menu = null; return; }
    menu = el('div', 'tpl-menu');
    for (const [name, desc, make] of TEMPLATES) {
      const b = el('button', '', name);
      b.append(el('small', '', desc));
      b.addEventListener('click', () => {
        menu.remove(); menu = null;
        const items = make();
        if (!items) return;
        currentList().push(...items);
        render(items[0].id);
        save();
      });
      menu.append(b);
    }
    const r = tplBtn.getBoundingClientRect();
    menu.style.left = (r.left + window.scrollX) + 'px';
    menu.style.top = (r.bottom + window.scrollY + 4) + 'px';
    document.body.append(menu);
  });
  document.addEventListener('click', () => { if (menu) { menu.remove(); menu = null; } });

  // ---- Notes or screenshot -> tasks (17, 19). Uses Claude, so it asks first ----
  const notes = el('div', 'overlay');
  notes.hidden = true;
  notes.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Notes or screenshot to tasks"><h3>Notes or screenshot → tasks</h3>'
    + '<textarea placeholder="Paste meeting notes, a call summary or an email here…"></textarea>'
    + '<div class="drop">…or paste (⌘V) or drop a screenshot here</div>'
    + '<p class="mnote">Claude pulls out the to-dos and puts them in the Brain Dump. This uses Claude (about 1–3 cents).</p>'
    + '<div class="mbtns"><button class="fbtn" data-x="cancel">Cancel</button><button class="fbtn primary" data-x="go">Make tasks</button></div></div>';
  document.body.append(notes);
  const nText = notes.querySelector('textarea');
  const nDrop = notes.querySelector('.drop');
  let nImage = null;
  function takeImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 4.5 * 1024 * 1024) return alert('That image is too big (over 4.5 MB).');
    const reader = new FileReader();
    reader.onload = () => {
      nImage = { type: file.type, data: String(reader.result).split(',')[1] };
      nDrop.innerHTML = '';
      nDrop.append(Object.assign(document.createElement('img'), { src: reader.result }));
    };
    reader.readAsDataURL(file);
  }
  notes.addEventListener('paste', e => { const f = [...e.clipboardData.files][0]; if (f) { e.preventDefault(); takeImage(f); } });
  nDrop.addEventListener('dragover', e => e.preventDefault());
  nDrop.addEventListener('drop', e => { e.preventDefault(); takeImage(e.dataTransfer.files[0]); });
  notes.querySelector('[data-x=cancel]').addEventListener('click', () => { notes.hidden = true; });
  notes.querySelector('[data-x=go]').addEventListener('click', async () => {
    if (!nText.value.trim() && !nImage) return alert('Paste some notes or a screenshot first.');
    if (await captureFromNotes(nText.value, nImage)) notes.hidden = true;
  });
  window.openNotesCapture = function () {
    nText.value = '';
    nImage = null;
    nDrop.textContent = '…or paste (⌘V) or drop a screenshot here';
    notes.hidden = false;
    nText.focus();
  };

  // ---- Phone swipes (45): right = check off, left = snooze to tomorrow ----
  let sx = 0, sy = 0, srow = null;
  document.addEventListener('touchstart', e => {
    srow = e.target.closest && e.target.closest('#root .row');
    if (!srow) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!srow) return;
    const dx = e.touches[0].clientX - sx;
    if (Math.abs(dx) > Math.abs(e.touches[0].clientY - sy)) srow.style.transform = 'translateX(' + dx * 0.6 + 'px)';
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!srow) return;
    const row = srow;
    srow = null;
    row.style.transform = '';
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) < 90 || Math.abs(e.changedTouches[0].clientY - sy) > 60) return;
    const r = find(row.parentElement.dataset.id);
    if (!r || r.it.day || r.it.id === SOMEDAY) return;
    if (dx > 0) {
      markDone(r.it, true);
      setStatus('Checked off');
    } else {
      r.it.snooze = isoIn(1);
      r.it.updated = Date.now();
      setStatus('Snoozed until tomorrow');
    }
    render();
    save();
  });
})();
