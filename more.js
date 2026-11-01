// Quality-of-life features for the checklist: toasts, multi-select, drag and drop, smart paste,
// autocomplete, date words, Move to / Jump to, right-click menu, cheat sheet, phone toolbar,
// start/end of day, search everywhere, saved searches, restore, archive, export/import, Claude previews.
// Uses the helpers in checklist.html.

(function () {
  const css = `
  .toasts { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 90; display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
  .toast { pointer-events: auto; background: #2a2d31; color: #fff; padding: 9px 14px; border-radius: 10px; font-size: 14px; box-shadow: 0 6px 20px rgba(0,0,0,.25); display: flex; gap: 14px; align-items: center; animation: tin .15s ease-out; }
  .toast button { border: 0; background: transparent; color: #8fd0ff; font: inherit; font-weight: 600; cursor: pointer; padding: 0; }
  @keyframes tin { from { opacity: 0; transform: translateY(8px); } }
  .bulk { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 80; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.18); padding: 6px; display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; max-width: calc(100vw - 24px); }
  .bulk span { padding: 6px 10px; font-size: 13px; color: var(--muted); }
  .bulk button { border: 0; background: transparent; color: var(--text); font: inherit; font-size: 13px; padding: 6px 10px; border-radius: 7px; cursor: pointer; }
  .bulk button:hover { background: var(--hover); }
  .drop-line { position: absolute; height: 2px; background: var(--accent); z-index: 40; pointer-events: none; border-radius: 1px; }
  .drop-line::before { content: ""; position: absolute; left: -4px; top: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  li.drop-into > .row { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 6px; }
  body.dragging, body.dragging * { cursor: grabbing !important; user-select: none; }
  li.drag-src { opacity: .4; }
  .ac { position: absolute; z-index: 60; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.14); padding: 4px; min-width: 160px; max-height: 220px; overflow: auto; font-size: 14px; }
  .ac div { padding: 5px 9px; border-radius: 5px; cursor: pointer; }
  .ac div.on, .ac div:hover { background: var(--hover); }
  .ac small { color: var(--muted); margin-left: 6px; }
  .picker { width: min(560px, 100%); }
  .picker .plist { max-height: 46vh; overflow: auto; margin-top: 8px; }
  .picker .pitem { padding: 7px 10px; border-radius: 7px; cursor: pointer; font-size: 14px; }
  .picker .pitem small { display: block; color: var(--muted); font-size: 12px; }
  .picker .pitem.on, .picker .pitem:hover { background: var(--hover); }
  .ctx { position: fixed; z-index: 70; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.16); padding: 5px; min-width: 210px; font-size: 14px; }
  .ctx button { display: flex; justify-content: space-between; gap: 16px; width: 100%; text-align: left; border: 0; background: transparent; color: var(--text); font: inherit; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
  .ctx button:hover { background: var(--hover); }
  .ctx button small { color: var(--muted); }
  .ctx button.claude { color: var(--claude); }
  .ctx hr { border: 0; border-top: 1px solid var(--line); margin: 4px 0; }
  .ctx .swatches { display: flex; gap: 6px; padding: 6px 10px; flex-wrap: wrap; }
  .ctx .swatches i { width: 18px; height: 18px; border-radius: 50%; cursor: pointer; border: 2px solid var(--bg); box-shadow: 0 0 0 1px var(--line); }
  .ctx .emojis { display: flex; flex-wrap: wrap; gap: 2px; padding: 4px 6px; }
  .ctx .emojis b { cursor: pointer; padding: 3px 4px; border-radius: 5px; font-weight: normal; }
  .ctx .emojis b:hover { background: var(--hover); }
  .sheet { columns: 2; column-gap: 28px; font-size: 13.5px; }
  .sheet div { break-inside: avoid; display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; border-bottom: 1px solid var(--line); }
  .sheet kbd { font: 12px ui-monospace, monospace; border: 1px solid var(--line); border-radius: 4px; padding: 0 5px; white-space: nowrap; }
  @media (max-width: 600px) { .sheet { columns: 1; } }
  .phonebar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 75; display: none; justify-content: space-around; background: var(--bg); border-top: 1px solid var(--line); padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); }
  .phonebar button { border: 0; background: transparent; color: var(--text); font-size: 20px; min-width: 44px; min-height: 44px; border-radius: 10px; }
  .phonebar button:active { background: var(--hover); }
  body.typing-touch .phonebar { display: flex; }
  @media (hover: none) { .check { width: 20px; height: 20px; } .bullet { width: 24px; height: 24px; } }
  .day-modal { width: min(620px, 100%); max-height: 86vh; overflow: auto; }
  .day-modal .drow { display: flex; gap: 8px; align-items: center; padding: 7px 4px; border-bottom: 1px solid var(--line); font-size: 14px; }
  .day-modal .drow > span { flex: 1; min-width: 0; }
  .day-modal .drow small { display: block; color: var(--muted); font-size: 12px; }
  .day-modal h4 { margin: 16px 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  .sbtn { border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit; font-size: 12px; padding: 3px 8px; border-radius: 6px; cursor: pointer; white-space: nowrap; }
  .sbtn:hover { border-color: var(--muted); }
  .sbtn.on { background: var(--accent); color: #fff; border-color: var(--accent); }
  .elsewhere { margin: 18px 0 0 -32px; padding: 12px 14px; border: 1px dashed var(--line); border-radius: 10px; font-size: 14px; }
  .elsewhere h4 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); display: flex; justify-content: space-between; align-items: center; }
  .elsewhere .erow { display: flex; gap: 8px; align-items: center; padding: 4px 0; }
  .elsewhere .erow span { flex: 1; min-width: 0; }
  .elsewhere .erow small { color: var(--muted); }
  .list-tools { display: flex; gap: 12px; margin: -10px 0 14px; font-size: 12.5px; }
  .list-tools button { border: 0; background: transparent; color: var(--muted); font: inherit; cursor: pointer; padding: 0; }
  .list-tools button:hover { color: var(--text); text-decoration: underline; }
  .filter-menu { position: fixed; z-index: 70; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.16); padding: 8px; width: 280px; font-size: 13px; }
  .filter-menu h5 { margin: 6px 4px 4px; font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: .05em; }
  .filter-menu .fchips { display: flex; flex-wrap: wrap; gap: 5px; }
  .filter-menu .chip { cursor: pointer; font-size: 12.5px; padding: 2px 9px; }
  .preview-list { max-height: 50vh; overflow: auto; margin: 8px 0; font-size: 14px; }
  .preview-list label { display: flex; gap: 8px; align-items: flex-start; padding: 5px 2px; border-bottom: 1px solid var(--line); }
  .preview-list label small { display: block; color: var(--muted); }
  .preview-list del { color: var(--muted); }
  @media print {
    .topbar, .help, .add-row, .ai-bar, .capture-wrap, .acts, .trash, .arrow, .when-tag, .focus, .settings, .toasts, .bulk, .phonebar, .list-tools, .elsewhere, #warning { display: none !important; }
    body { background: #fff; color: #000; }
    main { padding: 0 0 0 24px; max-width: none; }
    li.collapsed > ul { display: block !important; }
    .chip { border: 1px solid #ccc; background: none !important; color: #444 !important; }
  }`;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const isoIn = days => { const d = new Date(); d.setDate(d.getDate() + days); return d.toLocaleDateString('en-CA'); };
  const niceDate = iso => new Date(iso + 'T12:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

  function modal(html, cls = '') {
    const opener = document.activeElement;
    const layer = el('div', 'overlay');
    layer.innerHTML = '<div class="modal ' + cls + '" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.append(layer);
    const box = layer.firstChild;
    const h = box.querySelector('h3');
    if (h) { h.id = 'dlg' + Date.now(); box.setAttribute('aria-labelledby', h.id); }
    const close = () => { layer.remove(); if (opener && opener.focus && document.contains(opener)) opener.focus(); };
    layer.addEventListener('click', e => { if (e.target === layer) close(); });
    layer.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') trapTab(e, box);
    });
    setTimeout(() => { if (!box.contains(document.activeElement)) { const f = box.querySelector('input, textarea, button'); f && f.focus(); } }, 0);
    return { layer, box, close };
  }
  function trapTab(e, box) {
    const items = [...box.querySelectorAll('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  window.trapTab = trapTab;

  // ---------------- Toasts with Undo (4) ----------------
  const toasts = el('div', 'toasts');
  toasts.setAttribute('role', 'status');
  toasts.setAttribute('aria-live', 'polite');
  document.body.append(toasts);
  window.showToast = function (msg, opts = {}) {
    setStatus(msg);
    const t = el('div', 'toast');
    t.append(el('span', '', msg));
    if (opts.undo) {
      const b = el('button', '', 'Undo');
      b.addEventListener('click', () => { undo(); t.remove(); });
      t.append(b);
    }
    toasts.append(t);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(() => t.remove(), opts.undo ? 8000 : 3500);
  };

  // ---------------- Multi-select (7) ----------------
  const selected = new Set();
  let anchor = null;
  window.isSelected = id => selected.has(id);
  const bulk = el('div', 'bulk');
  bulk.setAttribute('role', 'toolbar');
  bulk.setAttribute('aria-label', 'Selected items');
  bulk.hidden = true;
  document.body.append(bulk);
  function refreshSelection() {
    document.querySelectorAll('#root li').forEach(li => li.classList.toggle('selected', selected.has(li.dataset.id)));
    bulk.hidden = !selected.size;
    if (!selected.size) return;
    bulk.innerHTML = '';
    bulk.append(el('span', '', selected.size + ' selected'));
    const add = (label, fn) => { const b = el('button', '', label); b.addEventListener('click', fn); bulk.append(b); };
    add('✓ Check off', () => bulkDo(it => markDone(it, !allDone()), 'Checked off'));
    add('💤 Snooze', e => snoozeMenu(e.target, [...selected]));
    add('➜ Move to…', () => window.openMoveTo([...selected]));
    add('# Tag', () => { const t = prompt('Tag to add (without #):'); if (t) bulkDo(it => { it.text = it.text.trim() + ' #' + t.replace(/^#/, '').replace(/\s+/g, '-'); }, 'Tagged'); });
    add('⇥ Indent', () => bulkIndent(1));
    add('⇤ Outdent', () => bulkIndent(-1));
    add('🗑 Delete', () => bulkDelete());
    add('✕', () => window.clearSelection());
  }
  const allDone = () => [...selected].every(id => { const r = find(id); return r && r.it.done; });
  function bulkDo(fn, label) {
    checkpoint();
    for (const id of selected) { const r = find(id); if (r) { fn(r.it); r.it.updated = Date.now(); } }
    render();
    save(true);
    toast(label + ' ' + selected.size + ' item' + (selected.size === 1 ? '' : 's'), { undo: true });
    refreshSelection();
  }
  function bulkIndent(dir) {
    checkpoint();
    const ids = visibleIds().filter(id => selected.has(id));
    for (const id of (dir > 0 ? ids : ids.reverse())) {
      const r = find(id);
      if (!r) continue;
      // In order, each item goes under the item above it, so a selected run ends up together
      if (dir > 0 && r.i > 0) {
        const prev = r.list[r.i - 1];
        if (prev.id === DUMP || prev.mirrorOf) continue;
        r.list.splice(r.i, 1);
        prev.children.push(r.it);
        prev.collapsed = false;
      } else if (dir < 0 && r.parent && r.parent.id !== zoomId) {
        const p = find(r.parent.id);
        r.list.splice(r.i, 1);
        p.list.splice(p.i + 1, 0, r.it);
      }
    }
    render();
    save(true);
    refreshSelection();
  }
  async function bulkDelete() {
    const n = selected.size;
    if (!confirm('Delete ' + n + ' item' + (n === 1 ? '' : 's') + '? They go to Deleted Items.')) return;
    checkpoint();
    for (const id of [...selected]) await deleteItem(id, { quiet: true });
    selected.clear();
    refreshSelection();
    toast('Deleted ' + n + ' items', { undo: true });
  }
  window.toggleSelect = function (id, range) {
    if (range && anchor) {
      const ids = visibleIds();
      const [a, b] = [ids.indexOf(anchor), ids.indexOf(id)].sort((x, y) => x - y);
      if (a >= 0 && b >= 0) ids.slice(a, b + 1).forEach(x => selected.add(x));
    } else {
      selected.has(id) ? selected.delete(id) : selected.add(id);
      anchor = id;
    }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    refreshSelection();
  };
  window.selectOnly = function (id) { selected.clear(); selected.add(id); anchor = id; refreshSelection(); };
  window.clearSelection = function () { if (!selected.size) return; selected.clear(); refreshSelection(); };
  document.addEventListener('keydown', e => {
    if (!selected.size || typing() || document.querySelector('.overlay:not([hidden])')) return;
    const ids = visibleIds();
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const cur = e.key === 'ArrowUp' ? ids.find(x => selected.has(x)) : [...ids].reverse().find(x => selected.has(x));
      const next = ids[ids.indexOf(cur) + (e.key === 'ArrowUp' ? -1 : 1)];
      if (!next) return;
      if (!e.shiftKey) selected.clear();
      selected.add(next);
      refreshSelection();
    } else if (e.key === 'Escape') { window.clearSelection(); }
    else if (e.key === 'Enter' && !mod) { e.preventDefault(); const id = [...selected][0]; window.clearSelection(); focusItem(id); }
    else if ((e.key === 'Enter' && mod) || e.key === ' ') { e.preventDefault(); bulkDo(it => markDone(it, !allDone()), 'Checked off'); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); bulkDelete(); }
    else if (e.key === 'Tab') { e.preventDefault(); bulkIndent(e.shiftKey ? -1 : 1); }
    else if (mod && e.key.toLowerCase() === 'm') { e.preventDefault(); window.openMoveTo([...selected]); }
    else if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); ids.forEach(x => selected.add(x)); refreshSelection(); }
  });
  document.addEventListener('mousedown', e => {
    if (selected.size && !e.target.closest('#root li, .bulk, .ctx, .overlay, .picker')) window.clearSelection();
  });

  // ---------------- Drag and drop by the bullet (8), mouse and touch ----------------
  let drag = null;
  const line = el('div', 'drop-line');
  line.hidden = true;
  document.body.append(line);
  document.addEventListener('pointerdown', e => {
    const bullet = e.target.closest('#root .bullet');
    if (!bullet || e.button !== 0) return;
    const li = bullet.closest('li');
    drag = { id: li.dataset.id, x: e.clientX, y: e.clientY, started: false, bullet, target: null };
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      drag.started = true;
      document.body.classList.add('dragging');
      const src = document.querySelector('li[data-id="' + drag.id + '"]');
      if (src) src.classList.add('drag-src');
    }
    e.preventDefault();
    document.querySelectorAll('.drop-into').forEach(x => x.classList.remove('drop-into'));
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const row = under && under.closest('#root li > .row');
    drag.target = null;
    line.hidden = true;
    if (!row) return;
    const li = row.parentElement;
    const id = li.dataset.id;
    if (id === drag.id || ancestors(id).some(a => a.id === drag.id)) return;
    const rect = row.getBoundingClientRect();
    const rel = (e.clientY - rect.top) / rect.height;
    const where = rel < 0.3 ? 'before' : rel > 0.7 ? 'after' : 'into';
    drag.target = { id, where };
    if (where === 'into') { li.classList.add('drop-into'); return; }
    const textLeft = (row.querySelector('.disp') || row).getBoundingClientRect().left;
    line.style.left = (textLeft + window.scrollX - 24) + 'px';
    line.style.width = (rect.right - textLeft + 24) + 'px';
    line.style.top = ((where === 'before' ? rect.top : rect.bottom) + window.scrollY - 1) + 'px';
    line.hidden = false;
  }, { passive: false });
  document.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    line.hidden = true;
    document.body.classList.remove('dragging');
    document.querySelectorAll('.drop-into, .drag-src').forEach(x => x.classList.remove('drop-into', 'drag-src'));
    if (!d.started) return;
    d.bullet.dataset.dragged = '1'; // stop the click that follows from zooming in
    setTimeout(() => delete d.bullet.dataset.dragged, 50);
    if (!d.target) return;
    const ids = selected.has(d.id) ? visibleIds().filter(x => selected.has(x)) : [d.id];
    moveItems(ids, d.target.id, d.target.where);
  });
  function moveItems(ids, targetId, where) {
    checkpoint();
    const moving = ids.map(id => find(id)).filter(Boolean).filter(r => !ids.some(o => o !== r.it.id && ancestors(r.it.id).some(a => a.id === o)));
    moving.forEach(r => { const x = find(r.it.id); x.list.splice(x.i, 1); });
    if (targetId === null) {
      const at = data.findIndex(x => x.id === DUMP);
      data.splice(at < 0 ? data.length : at, 0, ...moving.map(r => r.it));
    } else {
      const t = find(targetId);
      if (!t) return;
      if (where === 'into') { t.it.children.push(...moving.map(r => r.it)); t.it.collapsed = false; }
      else t.list.splice(t.i + (where === 'after' ? 1 : 0), 0, ...moving.map(r => r.it));
    }
    render();
    save(true);
    refreshSelection();
    toast('Moved ' + moving.length + ' item' + (moving.length === 1 ? '' : 's'), { undo: true });
  }

  // ---------------- Smart paste (1, 2, 5, 6) ----------------
  // Lines become items; indentation and bullets (-, *, •, 1., [ ]) become sub items
  function parseOutline(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
    const rows = lines.map(raw => {
      const ws = raw.match(/^[\t ]*/)[0];
      let indent = ws.replace(/\t/g, '    ').length;
      let t = raw.trim();
      let done = false, bulleted = false, heading = false;
      const h = t.match(/^(#{1,6})\s+/);
      if (h) { t = t.slice(h[0].length); heading = true; indent = (h[1].length - 1) * 2; }
      const b = t.match(/^([-*+•●◦▪‣–—]|\d+[.)]|[a-zA-Z][.)])\s+/);
      if (b) { t = t.slice(b[0].length); bulleted = true; }
      const c = t.match(/^\[( |x|X|~)\]\s*/);
      if (c) { done = c[1].toLowerCase() === 'x'; t = t.slice(c[0].length); bulleted = true; }
      return { indent, text: t, done, bulleted, heading };
    });
    // An unbulleted line followed by bullets at the same indent is their heading
    rows.forEach((r, i) => { if (r.bulleted && i > 0 && rows.slice(0, i).some(p => !p.bulleted && p.indent === r.indent)) r.indent += 1; });
    const root = [];
    const stack = [{ indent: -1, children: root }];
    for (const r of rows) {
      while (stack.length > 1 && stack[stack.length - 1].indent >= r.indent) stack.pop();
      const item = newItem(r.text);
      if (r.done) { item.done = true; item.doneAt = Date.now(); }
      stack[stack.length - 1].children.push(item);
      stack.push({ indent: r.indent, children: item.children });
    }
    return root;
  }
  window.parseOutline = parseOutline;
  let plainPaste = false;
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v') plainPaste = true; });

  window.smartPaste = function (e, id, textarea) {
    const text = e.clipboardData.getData('text/plain');
    const r = find(id);
    if (!r) return;
    const url = text.trim();
    if (/^https?:\/\/\S+$/.test(url) && !plainPaste) {
      // A lone link: paste it, then swap in the page's title when it arrives
      e.preventDefault();
      const a = textarea.selectionStart, b = textarea.selectionEnd;
      const placeholder = url;
      textarea.setRangeText(placeholder, a, b, 'end');
      r.it.text = textarea.value;
      save();
      if (online) fetch('/api/title?url=' + encodeURIComponent(url)).then(x => x.json()).then(out => {
        if (!out.title) return;
        const label = out.title.replace(/[\[\]]/g, '');
        r.it.text = r.it.text.replace(placeholder, '[' + label + '](' + url + ')');
        if (document.activeElement === textarea) textarea.value = r.it.text;
        render(document.activeElement === textarea ? id : null);
        save();
      }).catch(() => {});
      return;
    }
    if (!text.includes('\n') || plainPaste) {
      if (plainPaste) {
        e.preventDefault();
        textarea.setRangeText(text.replace(/\s*\n\s*/g, ' '), textarea.selectionStart, textarea.selectionEnd, 'end');
        r.it.text = textarea.value;
        save();
      }
      plainPaste = false;
      return;
    }
    e.preventDefault();
    const items = parseOutline(text);
    if (!items.length) return;
    checkpoint();
    let count = 0;
    (function c(l) { for (const x of l) { count++; c(x.children); } })(items);
    if (!r.it.text.trim() && !r.it.children.length) {
      // Pasting into an empty item: the list takes its place
      r.list.splice(r.i, 1, ...items);
    } else {
      // Pasting into an item with text: the list goes underneath it
      r.it.children.push(...items);
      r.it.collapsed = false;
    }
    render(items[items.length - 1].id);
    save(true);
    toast('Pasted ' + count + ' item' + (count === 1 ? '' : 's'), { undo: true });
  };

  // Brain Dump box: several lines = several items (structure kept)
  captureEl.addEventListener('paste', e => {
    const text = e.clipboardData.getData('text/plain');
    if (!text.includes('\n')) return;
    e.preventDefault();
    const items = parseOutline(text);
    checkpoint();
    const list = captureWhen === 'someday' ? ensureSomeday() : ensureToday();
    list.collapsed = false;
    list.children.push(...items);
    render();
    save(true);
    toast('Added ' + items.length + ' to ' + (captureWhen === 'someday' ? 'Someday' : 'Today'), { undo: true });
  });

  // ---------------- Autocomplete for #tags and @clients (17) ----------------
  const ac = el('div', 'ac');
  ac.hidden = true;
  document.body.append(ac);
  let acState = null;
  function knownTokens(kind) {
    const counts = {};
    (function walk(l) { for (const it of l) { const m = meta(it.text); for (const t of kind === '#' ? m.tags : m.clients) counts[t] = (counts[t] || 0) + 1; walk(it.children); } })(data);
    for (const t of kind === '#' ? ['today', 'revenue', 'outreach', 'deep', 'shallow', 'social', 'waiting', 'admin', 'morning', 'afternoon', 'evening'] : []) counts[t] = counts[t] || 0;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }
  window.autocomplete = function (textarea) {
    const before = textarea.value.slice(0, textarea.selectionStart);
    const m = before.match(/(?:^|\s)([#@])([\w-]*)$/);
    if (!m) return window.closeAutocomplete();
    const opts = knownTokens(m[1]).filter(([t]) => t.startsWith(m[2].toLowerCase()) && t !== m[2].toLowerCase()).slice(0, 8);
    if (!opts.length) return window.closeAutocomplete();
    acState = { textarea, kind: m[1], typed: m[2], opts, on: 0 };
    ac.innerHTML = '';
    opts.forEach(([t, n], i) => {
      const d = el('div', i === 0 ? 'on' : '', m[1] + t);
      if (n) d.append(el('small', '', n));
      d.addEventListener('mousedown', ev => { ev.preventDefault(); acState.on = i; pick(); });
      ac.append(d);
    });
    const r = textarea.getBoundingClientRect();
    ac.style.left = (r.left + window.scrollX + Math.min(r.width - 170, before.length * 7.5)) + 'px';
    ac.style.top = (r.bottom + window.scrollY + 2) + 'px';
    ac.hidden = false;
  };
  window.closeAutocomplete = () => { ac.hidden = true; acState = null; };
  function pick() {
    const s = acState;
    const t = s.textarea;
    const at = t.selectionStart;
    const word = s.opts[s.on][0];
    t.setRangeText(word.slice(s.typed.length) + ' ', at, at, 'end');
    t.dispatchEvent(new Event('input'));
    window.closeAutocomplete();
  }
  window.acKey = function (e) {
    if (!acState || ac.hidden) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      acState.on = (acState.on + (e.key === 'ArrowDown' ? 1 : -1) + acState.opts.length) % acState.opts.length;
      [...ac.children].forEach((d, i) => d.classList.toggle('on', i === acState.on));
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(); return true; }
    if (e.key === 'Escape') { e.preventDefault(); window.closeAutocomplete(); return true; }
    return false;
  };

  // ---------------- Date words (18): due:fri, due:tomorrow, due:+3, due:nov5 ----------------
  window.expandDates = function (text) {
    return text.replace(/\b(due|snooze):([a-z0-9+]+)\b/gi, (all, key, word) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(word)) return all;
      const iso = parseDateWord(word.toLowerCase());
      return iso ? key + ':' + iso : all;
    });
  };
  function parseDateWord(w) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    if (w === 'today') return isoIn(0);
    if (w === 'tomorrow' || w === 'tmr' || w === 'tom') return isoIn(1);
    if (/^\+\d+$/.test(w)) return isoIn(+w.slice(1));
    if (/^\+\d+w$/.test(w)) return isoIn(7 * parseInt(w.slice(1)));
    if (w === 'nextweek') { const n = (8 - d.getDay()) % 7 || 7; return isoIn(n); }
    const wd = days.indexOf(w.slice(0, 3));
    if (wd >= 0 && /^[a-z]+$/.test(w)) { const n = (wd - d.getDay() + 7) % 7 || 7; return isoIn(n); }
    const md = w.match(/^([a-z]{3})[a-z]*(\d{1,2})$/);
    if (md && months.indexOf(md[1]) >= 0) {
      const t = new Date(d.getFullYear(), months.indexOf(md[1]), +md[2], 12);
      if (t < d) t.setFullYear(t.getFullYear() + 1);
      return t.toLocaleDateString('en-CA');
    }
    return null;
  }

  // ---------------- Move to (10) and Jump to (22) picker ----------------
  function allPlaces() {
    const out = [];
    (function walk(l, path) {
      for (const it of l) {
        if (it.mirrorOf) continue;
        const label = it.id === DUMP ? 'Brain Dump' : meta(it.text).clean || (it.day ? it.text : '(untitled)');
        out.push({ id: it.id, label, path: path.join(' › '), it });
        walk(it.children, path.concat(label));
      }
    })(data, []);
    return out;
  }
  function picker(title, placeholder, onPick, opts = {}) {
    const m = modal('<h3>' + title + '</h3><input type="text" placeholder="' + placeholder + '"><div class="plist"></div>', 'picker');
    const input = m.box.querySelector('input');
    const listEl = m.box.querySelector('.plist');
    let rows = [], on = 0;
    function draw() {
      const q = input.value.toLowerCase().trim();
      rows = allPlaces().filter(p => !opts.exclude || !opts.exclude(p)).filter(p => !q || (p.label + ' ' + p.path).toLowerCase().includes(q)).slice(0, 60);
      if (opts.top && (!q || 'top level'.includes(q))) rows.unshift({ id: null, label: 'Top level of the Checklist', path: '' });
      on = 0;
      listEl.innerHTML = '';
      rows.forEach((p, i) => {
        const d = el('div', 'pitem' + (i === 0 ? ' on' : ''), p.label);
        if (p.path) d.append(el('small', '', p.path));
        d.addEventListener('click', () => { m.close(); onPick(p); });
        listEl.append(d);
      });
    }
    input.addEventListener('input', draw);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        on = Math.max(0, Math.min(rows.length - 1, on + (e.key === 'ArrowDown' ? 1 : -1)));
        [...listEl.children].forEach((d, i) => d.classList.toggle('on', i === on));
        listEl.children[on] && listEl.children[on].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && rows[on]) { e.preventDefault(); m.close(); onPick(rows[on]); }
    });
    draw();
    input.focus();
  }
  window.openMoveTo = function (ids) {
    const blocked = new Set(ids);
    picker('Move ' + (ids.length > 1 ? ids.length + ' items' : 'to…'), 'Type a section name…', p => moveItems(ids, p.id, 'into'), {
      top: true,
      exclude: p => blocked.has(p.id) || ancestors(p.id).some(a => blocked.has(a.id))
    });
  };
  function openJump() {
    picker('Jump to', 'Type to find any item…', p => {
      ancestors(p.id).forEach(a => { a.collapsed = false; });
      if (p.id === DUMP) return zoom(DUMP);
      p.it.children.length ? zoom(p.id) : reveal(p.id);
    });
  }
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); openJump(); }
  });

  // ---------------- Snooze (32) ----------------
  function snooze(ids, iso) {
    checkpoint();
    for (const id of ids) { const r = find(id); if (r) { r.it.snooze = iso; r.it.updated = Date.now(); if (r.it.doing) setDoing(id); } }
    render();
    save(true);
    toast((iso ? 'Snoozed until ' + niceDate(iso) : 'Unsnoozed'), { undo: true });
    window.clearSelection();
  }
  window.snoozeItems = snooze;
  function snoozeMenu(anchorEl, ids) {
    const nextMon = isoIn((8 - new Date().getDay()) % 7 || 7);
    menu(anchorEl, [
      ['Tomorrow', () => snooze(ids, isoIn(1)), niceDate(isoIn(1))],
      ['Next Monday', () => snooze(ids, nextMon), niceDate(nextMon)],
      ['In a week', () => snooze(ids, isoIn(7)), niceDate(isoIn(7))],
      ['In a month', () => snooze(ids, isoIn(30)), niceDate(isoIn(30))],
      ['Pick a date…', () => { const w = prompt('Snooze until (e.g. fri, nov12, +3, 2026-12-01):'); const iso = w && (parseDateWord(w.toLowerCase()) || (/^\d{4}-\d{2}-\d{2}$/.test(w) && w)); if (iso) snooze(ids, iso); }],
      ...(ids.some(id => { const r = find(id); return r && r.it.snooze; }) ? [['Unsnooze', () => snooze(ids, null)]] : [])
    ]);
  }
  // Snoozed counter next to "Hide done": click to show/hide snoozed items
  const snoozeBtn = el('button', 'pill', '');
  snoozeBtn.title = 'Show or hide snoozed items';
  document.getElementById('hideDone').after(snoozeBtn);
  snoozeBtn.addEventListener('click', () => { showSnoozed = !showSnoozed; render(); });

  // ---------------- Right-click menu (9, 10, 13, 14, 15, 44, 46, 51–53, 56, 58, 60) ----------------
  let ctx = null;
  function closeMenu(restore) {
    if (!ctx) return;
    ctx.remove();
    ctx = null;
    if (restore && menuOpener && document.contains(menuOpener)) menuOpener.focus();
  }
  let menuOpener = null;
  function menu(anchorOrEvent, entries) {
    closeMenu();
    menuOpener = document.activeElement;
    ctx = el('div', 'ctx');
    ctx.setAttribute('role', 'menu');
    for (const e of entries) {
      if (e === '-') { ctx.append(el('hr')); continue; }
      if (e instanceof HTMLElement) { ctx.append(e); continue; }
      const [label, fn, hint, cls] = e;
      const b = el('button', cls || '', label);
      b.setAttribute('role', 'menuitem');
      if (hint) b.append(el('small', '', hint));
      b.addEventListener('click', ev => { ev.stopPropagation(); closeMenu(); fn(ev); });
      ctx.append(b);
    }
    document.body.append(ctx);
    let x, y;
    if (anchorOrEvent.clientX !== undefined) { x = anchorOrEvent.clientX; y = anchorOrEvent.clientY; }
    else { const r = anchorOrEvent.getBoundingClientRect(); x = r.left; y = r.top - ctx.offsetHeight - 6; if (y < 0) y = r.bottom + 6; }
    ctx.style.left = Math.max(8, Math.min(x, innerWidth - ctx.offsetWidth - 8)) + 'px';
    ctx.style.top = Math.max(8, Math.min(y, innerHeight - ctx.offsetHeight - 8)) + 'px';
    if (anchorOrEvent.fromKeyboard) { const first = ctx.querySelector('button:not(.claude-only)'); first && first.focus(); }
  }
  document.addEventListener('click', e => { if (ctx && !ctx.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', e => {
    if (!ctx) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Arrow keys move through the menu
      e.preventDefault();
      const items = [...ctx.querySelectorAll('button')].filter(b => b.offsetParent !== null);
      const k = items.indexOf(document.activeElement);
      const next = items[(k + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
      next && next.focus();
    }
  });
  // The item menu also opens from the keyboard: the Menu key or Shift+F10 while editing an item
  document.addEventListener('keydown', e => {
    if (!(e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey))) return;
    const li = document.activeElement && document.activeElement.closest && document.activeElement.closest('#root li');
    if (!li) return;
    e.preventDefault();
    const r = li.querySelector('.row').getBoundingClientRect();
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 60, clientY: r.bottom });
    ev.fromKeyboard = true;
    li.querySelector('.row').dispatchEvent(ev);
  });

  document.addEventListener('contextmenu', e => {
    const li = e.target.closest('#root li');
    if (!li || e.target.closest('a')) return;
    e.preventDefault();
    const id = li.dataset.id;
    const r = find(id);
    if (!r) return;
    const it = r.it;
    const src = it.mirrorOf ? (find(it.mirrorOf) || r).it : it;
    if (selected.size > 1 && selected.has(id)) {
      return menu(e, [
        [selected.size + ' selected', () => {}],
        '-',
        ['Check off', () => bulkDo(x => markDone(x, true), 'Checked off')],
        ['Move to…', () => window.openMoveTo([...selected]), '⌘M'],
        ['Snooze…', ev => snoozeMenu(ev.target, [...selected])],
        ['Delete', () => bulkDelete(), '⌫']
      ]);
    }
    const swatches = el('div', 'swatches');
    for (const c of ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray', null]) {
      const i = el('i');
      i.style.background = c ? 'var(--c-' + c + ')' : 'transparent';
      i.title = c || 'No colour';
      i.addEventListener('click', () => { closeMenu(); checkpoint(); if (c) src.color = c; else delete src.color; render(); save(); });
      swatches.append(i);
    }
    const emojis = el('div', 'emojis');
    for (const em of ['⭐', '🔥', '💰', '📞', '✉️', '🏠', '💡', '⚠️', '✅', '📌', '🎯', '🛠', '📅', '❤️', '✕']) {
      const b = el('b', '', em);
      b.title = em === '✕' ? 'Plain bullet' : em;
      b.addEventListener('click', () => { closeMenu(); checkpoint(); if (em === '✕') delete src.icon; else src.icon = em; render(); save(); });
      emojis.append(b);
    }
    const allDoneHere = src.done && (function every(l) { return l.every(x => x.done && every(x.children)); })(it.children);
    const at = { clientX: e.clientX, clientY: e.clientY, fromKeyboard: e.fromKeyboard };
    menu(at, [
      ['Add a note', () => { if (src.note === undefined) src.note = ''; render(id); const n = document.querySelector('li[data-id="' + id + '"] > .row .note'); n && n.focus(); }, '⇧Enter'],
      ['Duplicate', () => { checkpoint(); const c = cloneItem(it); r.list.splice(r.i + 1, 0, c); render(c.id); save(); toast('Duplicated', { undo: true }); }, '⌘D'],
      ['Move to…', () => window.openMoveTo([id]), '⌘M'],
      ['Mirror in another place…', () => picker('Put a mirror of this item in…', 'Type a section name…', p => {
        checkpoint();
        const mirror = newItem('');
        mirror.mirrorOf = src.id;
        if (p.id === null) data.unshift(mirror); else { p.it.children.push(mirror); p.it.collapsed = false; }
        render(); save(); toast('Mirror added. Editing either one changes both.', { undo: true });
      }, { top: true })],
      ['Snooze…', ev => snoozeMenu(ev.target, [id])],
      '-',
      ['Colour', () => {}], swatches,
      ['Bullet icon', () => {}], emojis,
      '-',
      ['Expand everything here', () => { (function open(x) { x.collapsed = false; x.children.forEach(open); })(it); render(); save(); }],
      ['Collapse everything else', () => collapseOthers(id)],
      ['Select', () => window.selectOnly(id), 'Esc'],
      '-',
      ['Export or share this section…', () => openExport(it)],
      ['Print this section', () => printSection(it)],
      ...(allDoneHere ? [['Archive (finished)', () => archiveItems([id])]] : []),
      '-',
      ['✦ Clean up wording and duplicates', () => cleanUp(id), 'Claude', 'claude claude-only'],
      ['✦ Estimate times', () => estimateTimes(id), 'Claude', 'claude claude-only'],
      ['✦ Draft the email for this', () => writeEmail(src.id), 'Claude', 'claude claude-only'],
      '-',
      ['Delete', () => deleteItem(id), '']
    ]);
  });
  function collapseOthers(id) {
    const keep = new Set([id, ...ancestors(id).map(a => a.id)]);
    (function walk(l) { for (const x of l) { if (x.children.length) x.collapsed = !keep.has(x.id); walk(x.children); } })(currentList());
    render(); save();
  }

  // ---------------- Expand / collapse all (13) and list tools ----------------
  const tools = el('div', 'list-tools');
  const tool = (label, fn, title) => { const b = el('button', '', label); b.title = title || ''; b.addEventListener('click', fn); tools.append(b); return b; };
  tool('Expand all', () => { checkpoint(); (function open(l) { for (const x of l) { x.collapsed = false; open(x.children); } })(currentList()); render(); save(); });
  tool('Collapse all', () => { checkpoint(); (function shut(l) { for (const x of l) { if (x.children.length) x.collapsed = true; shut(x.children); } })(currentList()); render(); save(); });
  tool('Import…', () => openImport(), 'Bring in a Workflowy export or any pasted list');
  tool('Export…', () => openExport(null), 'Copy, download or print this page');
  tool('Print', () => window.print());
  tool('Shortcuts (?)', () => openSheet());
  titleEl.after(tools);

  // ---------------- Cheat sheet (41) ----------------
  const SHORTCUTS = [
    ['New item', 'Enter'], ['Note under item', '⇧ Enter'], ['Indent / outdent', 'Tab / ⇧Tab'], ['Check off', '⌘ Enter'],
    ['Undo / redo (everything)', '⌘Z / ⇧⌘Z'], ['Duplicate', '⌘D'], ['Move to…', '⌘M'], ['Jump to…', '⌘P'], ['Quick add', '⌘K'],
    ['Search', '/'], ['Move up / down', '⌘⇧↑ / ↓'], ['Collapse / expand', '⌘↑ / ⌘↓'], ['Zoom in / out', '⌥→ / ⌥←'],
    ['Bold / italic / highlight', '⌘B / ⌘I / ⌘⇧H'], ['Paste as one item', '⇧⌘V'], ['Select item', 'Esc'],
    ['Extend selection', '⇧↑ / ⇧↓ (after Esc)'], ['Select several', '⇧ or ⌘ click a bullet'], ['Act on selection', 'Space ⌫ Tab ⌘M'],
    ['Join with item above', '⌫ at start'], ['Drag to move', 'drag a bullet'], ['Item menu', 'right-click'], ['This sheet', '?']
  ];
  function openSheet() {
    const m = modal('<h3>Keyboard shortcuts</h3><div class="sheet"></div><p class="mnote">Type in items: #tag @client ~15m due:fri every:mon i:5 e:2 blocked-by:"task" **bold** *italic* ==highlight==</p>');
    const sheet = m.box.querySelector('.sheet');
    for (const [what, keys] of SHORTCUTS) { const d = el('div'); d.append(el('span', '', what), el('kbd', '', keys)); sheet.append(d); }
  }
  document.addEventListener('keydown', e => { if (e.key === '?' && !typing()) { e.preventDefault(); openSheet(); } });

  // ---------------- Phone toolbar (42) ----------------
  const bar = el('div', 'phonebar');
  const pbtn = (label, title, fn) => {
    const b = el('button', '', label);
    b.title = title;
    b.addEventListener('mousedown', e => e.preventDefault()); // keep the keyboard open
    b.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    b.addEventListener('touchend', e => { e.preventDefault(); fn(); });
    b.addEventListener('click', fn);
    bar.append(b);
  };
  const press = (key, extra = {}) => {
    const t = document.activeElement;
    if (t && t.classList.contains('text')) t.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, extra)));
  };
  pbtn('⇤', 'Outdent', () => press('Tab', { shiftKey: true }));
  pbtn('⇥', 'Indent', () => press('Tab'));
  pbtn('↑', 'Move up', () => press('ArrowUp', { metaKey: true, shiftKey: true }));
  pbtn('↓', 'Move down', () => press('ArrowDown', { metaKey: true, shiftKey: true }));
  pbtn('✓', 'Check off', () => press('Enter', { metaKey: true }));
  pbtn('＋', 'New item', () => press('Enter'));
  pbtn('⌄', 'Done typing', () => document.activeElement.blur());
  document.body.append(bar);
  const touch = matchMedia('(hover: none)').matches;
  document.addEventListener('focusin', e => { if (touch && e.target.classList.contains('text')) document.body.classList.add('typing-touch'); });
  document.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement.classList.contains('text')) document.body.classList.remove('typing-touch'); }, 100));

  // ---------------- Search everywhere (19), filters (20), saved searches (21) ----------------
  const filterBtn = el('button', 'pill', 'Filter');
  filterBtn.title = 'Filter by tag, client or status';
  searchEl.after(filterBtn);
  filterBtn.addEventListener('click', e => {
    e.stopPropagation();
    closeMenu();
    ctx = el('div', 'filter-menu');
    const group = (title, items) => {
      ctx.append(el('h5', '', title));
      const g = el('div', 'fchips');
      for (const [label, token, cls] of items) {
        const c = el('span', 'chip ' + (cls || ''), label);
        c.addEventListener('click', ev => {
          ev.stopPropagation();
          const words = searchEl.value.split(/\s+/).filter(Boolean);
          searchEl.value = words.includes(token) ? words.filter(w => w !== token).join(' ') : words.concat(token).join(' ');
          searchEl.dispatchEvent(new Event('input'));
        });
        g.append(c);
      }
      ctx.append(g);
    };
    group('Status', [['Overdue', 'is:overdue', 'overdue'], ['Due this week', 'is:week', 'soon'], ['Today', 'is:today', 't-today'], ['Doing', 'is:doing', 'doing'], ['Has a note', 'is:notes'], ['Snoozed', 'is:snoozed'], ['Open', 'is:open'], ['Done', 'is:done']]);
    const tags = {}, clients = {};
    (function walk(l) { for (const x of l) { const m = meta(x.text); m.tags.forEach(t => tags[t] = 1); m.clients.forEach(c => clients[c] = 1); walk(x.children); } })(data);
    if (Object.keys(tags).length) group('Tags', Object.keys(tags).sort().map(t => ['#' + t, '#' + t, 't-' + t]));
    if (Object.keys(clients).length) group('Clients', Object.keys(clients).sort().map(c => ['@' + c, '@' + c, 'client']));
    document.body.append(ctx);
    const r = filterBtn.getBoundingClientRect();
    ctx.style.left = Math.max(8, Math.min(r.left, innerWidth - 296)) + 'px';
    ctx.style.top = (r.bottom + 6) + 'px';
  });

  const elsewhere = el('div', 'elsewhere');
  elsewhere.hidden = true;
  document.querySelector('.add-row').after(elsewhere);
  let searchTimer = null;
  searchEl.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(searchElsewhere, 300); });
  async function searchElsewhere() {
    const q = searchEl.value.trim().toLowerCase();
    elsewhere.innerHTML = '';
    elsewhere.hidden = !q || viewMode !== null;
    if (elsewhere.hidden) return;
    const head = el('h4', '', 'Also found');
    const saveBtn = el('button', 'sbtn', '☆ Save this search');
    saveBtn.addEventListener('click', () => {
      const name = prompt('Name for this saved search (it appears in Views):', q);
      if (!name) return;
      const list = savedSearches();
      list.push({ name, q });
      try { localStorage.setItem('savedSearches', JSON.stringify(list)); } catch {}
      toast('Saved. Find it in the Views tab.');
    });
    head.append(saveBtn);
    elsewhere.append(head);
    let found = 0;
    // Brain Dump matches when you're on the Checklist page (and vice versa)
    const dump = find(DUMP);
    const here = zoomId === DUMP || (zoomId && ancestors(zoomId).some(a => a.id === DUMP));
    const pool = [];
    (function walk(l, inDumpTree) { for (const x of l) { const d = inDumpTree || x.id === DUMP; if (x.id !== DUMP && !x.day && x.id !== SOMEDAY && d !== here && itemMatches(x)) pool.push(x); walk(x.children, d); } })(data, false);
    for (const x of pool.slice(0, 15)) {
      found++;
      const row = el('div', 'erow');
      row.append(el('span', '', meta(x.text).clean), el('small', '', here ? 'Checklist' : 'Brain Dump'));
      const go = el('button', 'sbtn', 'Show');
      go.addEventListener('click', () => { searchEl.value = ''; query = ''; reveal(x.id); elsewhere.hidden = true; });
      row.append(go);
      elsewhere.append(row);
    }
    if (online && parseQuery(q).words.length) {
      const res = await (await fetch('/api/search?q=' + encodeURIComponent(parseQuery(q).words.join(' ')))).json();
      for (const d of res.deleted) {
        found++;
        const row = el('div', 'erow');
        row.append(el('span', '', meta(d.text).clean), el('small', '', 'Deleted'));
        const b = el('button', 'sbtn', 'Restore');
        b.addEventListener('click', () => restoreDeleted(d.file).then(searchElsewhere));
        row.append(b);
        elsewhere.append(row);
      }
      for (const a of res.archive) {
        found++;
        const row = el('div', 'erow');
        row.append(el('span', '', meta(a.text).clean), el('small', '', 'Archived ' + a.time.slice(0, 10)));
        const b = el('button', 'sbtn', 'Restore');
        b.addEventListener('click', () => unarchive(a.id).then(searchElsewhere));
        row.append(b);
        elsewhere.append(row);
      }
      for (const j of res.journal.slice(0, 10)) {
        found++;
        const row = el('div', 'erow');
        row.append(el('span', '', j.replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}: /, '')), el('small', '', 'Done ' + j.slice(0, 10)));
        elsewhere.append(row);
      }
    }
    if (!found) elsewhere.append(el('div', 'erow', 'Nothing in the Brain Dump, Deleted Items, Archive or Done Journal.'));
  }
  const savedSearches = () => { try { return JSON.parse(localStorage.getItem('savedSearches')) || []; } catch { return []; } };

  // ---------------- Restore deleted (24), archive (56, 57), backups (25) ----------------
  async function restoreDeleted(file) {
    const hit = await post('/api/restore-deleted', { file });
    if (hit.error) return alert(hit.error);
    checkpoint();
    const item = hit.item;
    if (find(item.id)) (function fresh(x) { x.id = uid(); x.children.forEach(fresh); })(item);
    putBack(item, hit.path);
    toast('Restored "' + meta(item.text).clean.slice(0, 40) + '"', { undo: true });
  }
  // Put an item back where it was (by the names of the sections it was under), or in today's Brain Dump
  function putBack(item, path) {
    let list = data, ok = true;
    for (const name of path || []) {
      const next = list.find(x => x.text === name);
      if (!next) { ok = false; break; }
      list = next.children;
    }
    if (!ok || !(path || []).length) list = path && path.length ? ensureToday().children : data;
    list.push(item);
    render();
    save(true);
  }
  async function archiveItems(ids) {
    const items = ids.map(id => find(id)).filter(Boolean).map(r => ({ item: r.it, path: ancestors(r.it.id).map(a => a.text) }));
    if (!items.length) return;
    if (online) await post('/api/archive', { items });
    checkpoint();
    for (const x of items) { const r = find(x.item.id); if (r) r.list.splice(r.i, 1); }
    render();
    save(true);
    toast('Archived ' + items.length + ' section' + (items.length === 1 ? '' : 's') + '. Find them in Views › Archive.');
  }
  async function unarchive(id) {
    const hit = await post('/api/unarchive', { id });
    if (hit.error) return alert(hit.error);
    checkpoint();
    if (find(hit.item.id)) (function fresh(x) { x.id = uid(); x.children.forEach(fresh); })(hit.item);
    putBack(hit.item, hit.path);
    toast('Restored from the archive', { undo: true });
  }

  // Auto-archive (57): finished items older than the number of days set in Settings
  window.afterLoad = async function () {
    renderSnoozeBtn();
    maybeStartOfDay();
    const days = +settings.auto_archive_days || 0;
    if (!online || !days) return;
    const cutoff = Date.now() - days * 864e5;
    const old = [];
    (function walk(l) {
      for (const x of l) {
        if (x.done && x.doneAt && x.doneAt < cutoff && !x.day && x.id !== SOMEDAY && x.id !== DUMP && (function all(c) { return c.every(y => y.done && all(y.children)); })(x.children)) old.push(x.id);
        else walk(x.children);
      }
    })(data);
    if (old.length) { await archiveItems(old); toast('Archived ' + old.length + ' finished items older than ' + days + ' days'); }
  };
  function renderSnoozeBtn() {
    let n = 0;
    (function walk(l) { for (const x of l) { if (isSnoozed(x)) n++; walk(x.children); } })(data);
    snoozeBtn.hidden = !n;
    snoozeBtn.textContent = (showSnoozed ? 'Hide ' : '') + '💤 ' + n;
    snoozeBtn.classList.toggle('on', showSnoozed);
  }
  const baseRender = render;
  // Keep the snooze counter and selection highlight fresh after every redraw
  window.render = render = function (...args) { const out = baseRender(...args); renderSnoozeBtn(); return out; };

  // ---------------- Export (58), print (60), import (59) ----------------
  function toMarkdown(items, depth = 0) {
    return items.flatMap(x => {
      const src = x.mirrorOf ? (find(x.mirrorOf) || { it: x }).it : x;
      return [('  '.repeat(depth)) + '- [' + (src.done ? 'x' : ' ') + '] ' + src.text]
        .concat(src.note ? ['  '.repeat(depth + 1) + '> ' + src.note.replace(/\n/g, ' ')] : [])
        .concat(toMarkdown(x.children, depth + 1));
    });
  }
  function openExport(item) {
    const items = item ? [item] : currentList().filter(x => x.id !== DUMP);
    const title = item ? meta(item.text).clean : (zoomId ? meta(find(zoomId).it.text).clean : 'Checklist');
    const md = toMarkdown(items).join('\n');
    const plain = md.replace(/^(\s*)- \[[ x]\] /gm, '$1• ');
    const m = modal('<h3>Export: ' + esc(title) + '</h3><textarea readonly></textarea>'
      + '<div class="mbtns"><button class="fbtn" data-x="plain">Copy as plain list</button><button class="fbtn" data-x="copy">Copy Markdown</button>'
      + '<button class="fbtn" data-x="dl">Download .md</button><button class="fbtn primary" data-x="print">Print / PDF</button></div>');
    const ta = m.box.querySelector('textarea');
    ta.value = md;
    m.box.querySelector('[data-x=copy]').onclick = () => navigator.clipboard.writeText(md).then(() => toast('Copied'));
    m.box.querySelector('[data-x=plain]').onclick = () => navigator.clipboard.writeText(plain).then(() => toast('Copied'));
    m.box.querySelector('[data-x=dl]').onclick = () => {
      const a = el('a');
      a.href = URL.createObjectURL(new Blob(['# ' + title + '\n\n' + md + '\n'], { type: 'text/markdown' }));
      a.download = title.replace(/[^\w -]/g, '').slice(0, 60) + '.md';
      a.click();
    };
    m.box.querySelector('[data-x=print]').onclick = () => { m.close(); item ? printSection(item) : window.print(); };
  }
  function printSection(item) {
    const w = window.open('', '_blank');
    if (!w) return alert('Allow pop-ups to print a section.');
    const rows = (function html(l) {
      return '<ul>' + l.map(x => { const s = x.mirrorOf ? (find(x.mirrorOf) || { it: x }).it : x; return '<li>' + (s.done ? '☑' : '☐') + ' ' + esc(meta(s.text).clean) + (s.note ? '<div class=n>' + esc(s.note) + '</div>' : '') + html(x.children) + '</li>'; }).join('') + '</ul>';
    })(item.children);
    w.document.write('<!doctype html><meta charset=utf-8><title>' + esc(meta(item.text).clean) + '</title><style>body{font:15px/1.6 -apple-system,sans-serif;padding:32px;color:#222}ul{list-style:none;padding-left:22px}li{margin:3px 0}.n{color:#777;font-size:13px;margin-left:20px}</style><h1>'
      + esc(meta(item.text).clean) + '</h1>' + rows + '<script>print()<\/script>');
    w.document.close();
  }
  function openImport() {
    const m = modal('<h3>Import a list</h3><p class="mnote">Paste a Workflowy export (plain text or OPML), a Markdown or bulleted list, or choose a file. Indented lines become sub items. It goes into the page you\'re on.</p>'
      + '<textarea placeholder="Paste here…"></textarea><input type="file" accept=".txt,.md,.opml,.xml" style="margin-top:8px">'
      + '<div class="mbtns"><button class="fbtn" data-x="cancel">Cancel</button><button class="fbtn primary" data-x="go">Import</button></div>');
    const ta = m.box.querySelector('textarea');
    m.box.querySelector('input[type=file]').addEventListener('change', e => { const f = e.target.files[0]; if (f) f.text().then(t => { ta.value = t; }); });
    m.box.querySelector('[data-x=cancel]').onclick = m.close;
    m.box.querySelector('[data-x=go]').onclick = () => {
      const text = ta.value.trim();
      if (!text) return;
      let items;
      if (/<opml[\s>]/i.test(text)) {
        const doc = new DOMParser().parseFromString(text, 'text/xml');
        const conv = node => [...node.children].filter(n => n.tagName === 'outline').map(n => {
          const it = newItem(n.getAttribute('text') || '');
          if (n.getAttribute('_complete') === 'true') { it.done = true; it.doneAt = Date.now(); }
          if (n.getAttribute('_note')) it.note = n.getAttribute('_note');
          it.children = conv(n);
          return it;
        });
        items = conv(doc.querySelector('body') || doc.documentElement);
      } else items = parseOutline(text);
      if (!items.length) return alert('Nothing to import.');
      checkpoint();
      const list = currentList();
      const at = list.findIndex(x => x.id === DUMP);
      list.splice(at < 0 ? list.length : at, 0, ...items);
      m.close();
      render();
      save(true);
      let n = 0;
      (function c(l) { for (const x of l) { n++; c(x.children); } })(items);
      toast('Imported ' + n + ' items', { undo: true });
    };
  }

  // ---------------- Start of day (33) and wrap-up (34) ----------------
  function dayRows(m, title, items, buttons) {
    if (!items.length) return;
    m.box.append(el('h4', '', title + ' (' + items.length + ')'));
    for (const x of items) {
      const row = el('div', 'drow');
      const s = el('span', '', meta(x.text).clean || '(untitled)');
      const where = ancestors(x.id).map(a => a.id === DUMP ? 'Brain Dump' : a.text).filter(Boolean).join(' › ');
      if (where) s.append(el('small', '', where));
      row.append(s);
      for (const [label, fn] of buttons) {
        const b = el('button', 'sbtn', label);
        b.addEventListener('click', () => { fn(x); row.style.opacity = .35; row.querySelectorAll('button').forEach(z => { z.disabled = true; }); });
        row.append(b);
      }
      m.box.append(row);
    }
  }
  const openTasks = pred => {
    const out = [];
    (function walk(l) { for (const x of l) { if (!x.done && !x.mirrorOf && !x.day && x.id !== SOMEDAY && x.id !== DUMP && !x.children.length && x.text.trim() && pred(x)) out.push(x); walk(x.children); } })(data);
    return out;
  };
  const toSomeday = x => { const r = find(x.id); if (!r) return; r.list.splice(r.i, 1); ensureSomeday().children.push(x); render(); save(); };
  function openStartOfDay(auto) {
    const today = ensureToday();
    const rolled = today.children.filter(x => !x.done && x.created && x.created < new Date().setHours(0, 0, 0, 0));
    const due = openTasks(x => { const d = meta(x.text).due; return d && daysUntil(d) <= 0; });
    const tagged = openTasks(x => meta(x.text).tags.includes('today') && !due.includes(x));
    const fresh = today.children.filter(x => !x.done && !rolled.includes(x));
    if (auto && !rolled.length && !due.length && !tagged.length) return;
    const m = modal('<h3>Good ' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening') + '. Here\'s today.</h3><p class="mnote">Keep what matters today; push the rest.</p>', 'day-modal');
    const keep = [['Keep', () => {}], ['Tomorrow', x => snooze([x.id], isoIn(1))], ['Someday', toSomeday], ['Delete', x => deleteItem(x.id, { quiet: true })]];
    dayRows(m, 'Left over from before', rolled, keep);
    dayRows(m, 'Due today or overdue', due, keep);
    dayRows(m, 'Tagged #today', tagged, keep);
    dayRows(m, 'Already in today\'s Brain Dump', fresh, keep);
    if (!rolled.length && !due.length && !tagged.length && !fresh.length) m.box.append(el('p', 'mnote', 'Nothing waiting. Add things in the Brain Dump.'));
    const go = el('div', 'mbtns');
    const b = el('button', 'fbtn primary', 'Start my day');
    b.onclick = () => { m.close(); toast('Have a good one.'); };
    go.append(b);
    m.box.append(go);
  }
  function maybeStartOfDay() {
    let toured = null;
    try { toured = localStorage.getItem('toured'); } catch {}
    if (!toured && viewMode === null) {
      try { localStorage.setItem('startOfDay', todayKey()); } catch {}
      return setTimeout(startTour, 500);
    }
    let last = null;
    try { last = localStorage.getItem('startOfDay'); } catch {}
    if (last === todayKey() || viewMode !== null) return;
    try { localStorage.setItem('startOfDay', todayKey()); } catch {}
    setTimeout(() => openStartOfDay(true), 400);
  }
  function openWrapUp() {
    const today = ensureToday();
    const m = modal('<h3>Wrap up the day</h3>', 'day-modal');
    const doneToday = [];
    (function walk(l) { for (const x of l) { if (x.done && x.doneAt && x.doneAt >= new Date().setHours(0, 0, 0, 0)) doneToday.push(x); walk(x.children); } })(data);
    m.box.append(el('p', 'mnote', doneToday.length ? 'You checked off ' + doneToday.length + ' thing' + (doneToday.length === 1 ? '' : 's') + ' today. Nice work.' : 'Nothing checked off today. Tomorrow\'s a new one.'));
    if (doneToday.length) { m.box.append(el('h4', '', 'Done today')); doneToday.slice(0, 20).forEach(x => m.box.append(el('div', 'drow', '✓ ' + meta(x.text).clean))); }
    const left = today.children.filter(x => !x.done).concat(openTasks(x => meta(x.text).tags.includes('today')));
    dayRows(m, 'Still open', left, [['Tomorrow', x => snooze([x.id], isoIn(1))], ['Someday', toSomeday]]);
    const go = el('div', 'mbtns');
    const all = el('button', 'fbtn', 'Move all to tomorrow');
    all.onclick = () => { snooze(left.map(x => x.id), isoIn(1)); m.close(); };
    const fin = el('button', 'fbtn primary', 'Done for today');
    fin.onclick = m.close;
    go.append(all, fin);
    m.box.append(go);
  }
  window.openStartOfDay = openStartOfDay;
  window.openWrapUp = openWrapUp;
  const aiBar = document.querySelector('.ai-bar');
  const dayBtn = el('button', 'ai-btn', '☀ Start of day');
  dayBtn.addEventListener('click', () => openStartOfDay(false));
  const wrapBtn = el('button', 'ai-btn', '☾ Wrap up the day');
  wrapBtn.addEventListener('click', openWrapUp);
  aiBar.prepend(dayBtn, wrapBtn);

  // ---------------- Claude extras with previews (51–54) ----------------
  // A before/after list you approve; nothing changes until you press Apply
  window.confirmPreview = function (title, rows, opts = {}) {
    return new Promise(resolve => {
      const m = modal('<h3>' + esc(title) + '</h3><p class="mnote">' + (opts.note || 'Untick anything you don\'t want, then Apply.') + '</p><div class="preview-list"></div>'
        + '<div class="mbtns"><button class="fbtn" data-x="cancel">Cancel</button><button class="fbtn primary" data-x="go">Apply</button></div>');
      const listEl = m.box.querySelector('.preview-list');
      const boxes = rows.map(r => {
        const lab = el('label');
        const cb = el('input');
        cb.type = 'checkbox';
        cb.checked = true;
        const body = el('span');
        body.innerHTML = r.html;
        lab.append(cb, body);
        listEl.append(lab);
        return cb;
      });
      if (!rows.length) listEl.append(el('p', 'mnote', 'Claude didn\'t suggest any changes.'));
      m.box.querySelector('[data-x=cancel]').onclick = () => { m.close(); resolve(null); };
      m.box.querySelector('[data-x=go]').onclick = () => { m.close(); resolve(rows.filter((r, i) => boxes[i].checked)); };
    });
  };
  async function cleanUp(id) {
    const out = await askClaude('cleanup', { item_id: id });
    if (!out) return;
    const rows = (out.edits || []).filter(e => find(e.item_id)).map(e => ({ kind: 'edit', e, html: '<del>' + esc(find(e.item_id).it.text) + '</del><br>' + esc(e.text) }))
      .concat((out.duplicates || []).filter(d => find(d.keep_id) && find(d.remove_id)).map(d => ({ kind: 'dup', d, html: 'Remove duplicate: <b>' + esc(meta(find(d.remove_id).it.text).clean) + '</b><small>keeps: ' + esc(meta(find(d.keep_id).it.text).clean) + '</small>' })));
    const ok = await window.confirmPreview('Clean up', rows);
    if (!ok || !ok.length) return;
    checkpoint();
    for (const r of ok) {
      if (r.kind === 'edit') { const x = find(r.e.item_id); if (x) x.it.text = r.e.text; }
      else { await deleteItem(r.d.remove_id, { quiet: true }); }
    }
    render(); save(true);
    toast('Applied ' + ok.length + ' change' + (ok.length === 1 ? '' : 's'), { undo: true });
  }
  async function estimateTimes(id) {
    const items = [];
    (function walk(x) { if (!x.done && !x.children.length && x.text.trim() && !meta(x.text).est) items.push({ id: x.id, text: meta(x.text).clean }); x.children.forEach(walk); })(find(id).it);
    if (!items.length) return toast('Everything here already has a time estimate');
    const out = await askClaude('estimate', { item_id: id, items });
    if (!out) return;
    const fmt = n => n >= 60 && n % 60 === 0 ? '~' + n / 60 + 'h' : '~' + n + 'm';
    const rows = (out.estimates || []).filter(e => find(e.item_id)).map(e => ({ e, html: esc(meta(find(e.item_id).it.text).clean) + ' <b>' + fmt(e.minutes) + '</b>' }));
    const ok = await window.confirmPreview('Time estimates', rows);
    if (!ok || !ok.length) return;
    checkpoint();
    for (const r of ok) { const x = find(r.e.item_id); if (x) x.it.text = x.it.text.trim() + ' ' + fmt(r.e.minutes); }
    render(); save(true);
    toast('Added ' + ok.length + ' estimates', { undo: true });
  }
  async function writeEmail(id) {
    const out = await askClaude('email', { item_id: id });
    if (!out) return;
    const m = modal('<h3>Email draft</h3><p class="mnote">Only a draft: nothing is sent. Edit it, then copy it or open it in Mail.</p>'
      + '<input type="text" data-x="to" placeholder="To"><input type="text" data-x="subject" placeholder="Subject" style="margin-top:8px"><textarea data-x="body" style="min-height:220px;margin-top:8px"></textarea>'
      + '<div class="mbtns"><button class="fbtn" data-x="copy">Copy</button><button class="fbtn" data-x="note">Save as note on the item</button><button class="fbtn primary" data-x="mail">Open in Mail</button></div>');
    const f = k => m.box.querySelector('[data-x=' + k + ']');
    f('to').value = out.to || '';
    f('subject').value = out.subject || '';
    f('body').value = out.body || '';
    f('copy').onclick = () => navigator.clipboard.writeText('Subject: ' + f('subject').value + '\n\n' + f('body').value).then(() => toast('Copied'));
    f('note').onclick = () => { const r = find(id); if (r) { r.it.note = ((r.it.note || '') + '\n\nEmail draft: ' + f('subject').value + '\n' + f('body').value).trim(); render(); save(); toast('Saved under the item'); } m.close(); };
    f('mail').onclick = () => { location.href = 'mailto:' + encodeURIComponent(f('to').value) + '?subject=' + encodeURIComponent(f('subject').value) + '&body=' + encodeURIComponent(f('body').value); };
  }

  // ---------------- First-time tour ----------------
  const TOUR = [
    ['.tabs', 'Three places', 'The <b>Checklist</b> is your main list. <b>Brain Dump</b> is for getting things out of your head (Today or Someday). <b>Views</b> sorts everything for you: top by impact, deadlines, Kanban and more.'],
    ['#root', 'Your list', 'Type an item and press <b>Enter</b>. <b>Tab</b> makes it a sub to-do. Add details right in the text: <b>#tag</b>, <b>@client</b>, <b>~15m</b>, <b>due:fri</b>, <b>every:mon</b>. They turn into tidy chips.'],
    ['#root', 'Right-click anything', 'Right-click an item for notes, snooze, colours, Move to, mirror, archive and more. Drag a bullet to move it. <b>⌘Z</b> undoes anything, even pastes.'],
    ['#search', 'Find things', 'Search covers everything, including deleted and archived items. <b>Filter</b> shows overdue, this week, a tag or a client.'],
    ['#saveDot', 'Always saved', 'Green means everything is saved to Supabase, so it\'s the same on every device you sign in on. If it turns red, your changes are kept on this device and upload as soon as you\'re back online.'],
    ['.list-tools', 'That\'s it', 'Press <b>?</b> any time for every shortcut. You can replay this tour from <b>Settings</b>, where you can also sign out.']
  ];
  const tourCss = `
  .tour-ring { position: fixed; z-index: 95; border-radius: 10px; box-shadow: 0 0 0 4px var(--accent), 0 0 0 9999px rgba(0,0,0,.45); pointer-events: none; }
  .tour-tip { position: fixed; z-index: 96; width: min(340px, calc(100vw - 32px)); background: var(--bg); color: var(--text); border-radius: 12px; padding: 16px; box-shadow: 0 12px 40px rgba(0,0,0,.3); font-size: 14px; line-height: 1.5; }
  .tour-tip h4 { margin: 0 0 6px; font-size: 16px; }
  .tour-tip p { margin: 0; }
  .tour-tip .tbtns { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; }
  .tour-tip .tbtns span { color: var(--muted); font-size: 12px; }`;
  document.head.append(Object.assign(document.createElement('style'), { textContent: tourCss }));
  function startTour() {
    if (viewMode !== null || zoomId) { location.hash = '#/'; setTimeout(startTour, 300); return; }
    let step = 0;
    const ring = el('div', 'tour-ring');
    const tip = el('div', 'tour-tip');
    tip.setAttribute('role', 'dialog');
    tip.setAttribute('aria-modal', 'true');
    tip.setAttribute('aria-live', 'polite');
    document.body.append(ring, tip);
    const end = () => { ring.remove(); tip.remove(); document.removeEventListener('keydown', keys, true); try { localStorage.setItem('toured', '1'); } catch {} };
    function show() {
      const [sel, title, body] = TOUR[step];
      const target = document.querySelector(sel);
      const r = target ? target.getBoundingClientRect() : { left: innerWidth / 2, top: 100, width: 0, height: 0, bottom: 100 };
      const h = Math.min(r.height, 220);
      ring.style.cssText = 'left:' + (r.left - 6) + 'px;top:' + (r.top - 6) + 'px;width:' + (r.width + 12) + 'px;height:' + (h + 12) + 'px';
      tip.innerHTML = '<h4></h4><p></p><div class="tbtns"><span></span><div><button class="sbtn" data-t="skip">Skip</button> <button class="sbtn on" data-t="next"></button></div></div>';
      tip.querySelector('h4').textContent = title;
      tip.querySelector('p').innerHTML = body;
      tip.querySelector('span').textContent = (step + 1) + ' of ' + TOUR.length;
      tip.querySelector('[data-t=next]').textContent = step === TOUR.length - 1 ? 'Done' : 'Next';
      tip.querySelector('[data-t=skip]').onclick = end;
      tip.querySelector('[data-t=next]').onclick = () => { step++; step < TOUR.length ? show() : end(); };
      const below = r.top + h + 20;
      tip.style.left = Math.max(16, Math.min(r.left, innerWidth - tip.offsetWidth - 16)) + 'px';
      tip.style.top = (below + tip.offsetHeight < innerHeight ? below : Math.max(16, r.top - tip.offsetHeight - 20)) + 'px';
      tip.querySelector('[data-t=next]').focus();
    }
    function keys(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); tip.querySelector('[data-t=next]').click(); }
      else if (e.key === 'ArrowLeft' && step > 0) { e.preventDefault(); step--; show(); }
      else if (e.key === 'Tab') trapTab(e, tip);
    }
    document.addEventListener('keydown', keys, true);
    show();
  }
  window.startTour = startTour;
  tool('Tour', () => startTour(), 'A one-minute tour of the checklist');

  // ---------------- More views: recent, deleted, archive, backups, saved searches (21, 23, 24, 25) ----------------
  function vrowEl(text, sub, buttons) {
    const r = el('div', 'vrow');
    const t = el('div', 'vtext', text);
    if (sub) t.append(el('span', 'vpath', sub));
    r.append(t);
    for (const [label, fn] of buttons) { const b = el('button', 'vbtn', label); b.addEventListener('click', fn); r.append(b); }
    return r;
  }
  window.extraViews = () => [
    ['recent', 'Recently edited', c => {
      c.append(el('h1', 'vtitle', 'Recently edited'), el('p', 'vsub', 'The 40 items you changed most recently.'));
      const all = [];
      (function walk(l) { for (const x of l) { if (x.id !== DUMP && !x.day && x.id !== SOMEDAY && x.text.trim()) all.push(x); walk(x.children); } })(data);
      const box = el('div', 'vlist');
      all.sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 40).forEach(x => box.append(vrowEl(meta(x.text).clean, new Date(x.updated).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' · ' + ancestors(x.id).map(a => a.id === DUMP ? 'Brain Dump' : a.text).filter(Boolean).join(' › '), [['Show', () => reveal(x.id)]])));
      c.append(box);
    }],
    ['deleted', 'Deleted', async c => {
      c.append(el('h1', 'vtitle', 'Deleted items'), el('p', 'vsub', 'Everything you deleted. Restore puts it back where it was.'));
      if (!online) return c.append(el('div', 'vempty', 'Needs the checklist server.'));
      const box = el('div', 'vlist');
      c.append(box);
      const list = await (await fetch('/api/deleted')).json();
      if (!list.length) box.append(el('div', 'vempty', 'Nothing deleted.'));
      list.forEach(d => box.append(vrowEl(meta(d.item.text).clean || '(untitled)', d.file.slice(0, 16).replace(/(\d{4}-\d{2}-\d{2}) (\d{2})-(\d{2})/, '$1 $2:$3') + (d.path.length ? ' · was under ' + d.path.join(' › ') : '') + (d.item.children.length ? ' · ' + countAll(d.item) + ' sub items' : ''),
        [['Restore', () => restoreDeleted(d.file).then(render)]])));
    }],
    ['archive', 'Archive', async c => {
      c.append(el('h1', 'vtitle', 'Archive'), el('p', 'vsub', 'Finished sections you archived (right-click a finished item › Archive). Also saved as Saved Items/Archive.md.'));
      if (!online) return c.append(el('div', 'vempty', 'Needs the checklist server.'));
      const box = el('div', 'vlist');
      c.append(box);
      const list = await (await fetch('/api/archive')).json();
      if (!list.length) box.append(el('div', 'vempty', 'The archive is empty.'));
      list.forEach(a => box.append(vrowEl(meta(a.item.text).clean, 'Archived ' + a.time + (a.path.length ? ' · from ' + a.path.join(' › ') : ''), [['Restore', () => unarchive(a.item.id).then(render)]])));
    }],
    ['backups', 'Backups', async c => {
      c.append(el('h1', 'vtitle', 'Backups'), el('p', 'vsub', 'A copy of your whole list every hour you work, filed in Saved Items/Backups by year, month and day. Preview one, then restore it if you need to. Your current list is saved first, so restoring can be undone.'));
      if (!online) return c.append(el('div', 'vempty', 'Needs the checklist server.'));
      const box = el('div', 'vlist');
      const pv = el('pre');
      pv.style.cssText = 'margin-left:-32px;white-space:pre-wrap;font-size:13px;background:var(--hover);padding:12px;border-radius:10px;max-height:50vh;overflow:auto';
      pv.hidden = true;
      c.append(box, pv);
      const list = await (await fetch('/api/backups')).json();
      // Grouped by day, newest first; each backup is named with its date, hour and weekday
      let lastDay = null;
      list.forEach(b => {
        if (b.day !== lastDay) {
          lastDay = b.day;
          const h = el('h3', 'vsub', b.day ? new Date(b.day + 'T12:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Other');
          h.style.margin = '18px 0 4px -32px';
          box.append(h);
        }
        box.append(vrowEl(b.label, 'saved ' + b.time + ' · ' + Math.round(b.size / 1024) + ' KB · Backups/' + b.name.split('/').slice(0, -1).join(' › '), [
        ['Download', async () => {
          const d = await (await fetch('/api/backup?name=' + encodeURIComponent(b.name))).json();
          window.checklistDownload('Checklist backup ' + b.label + '.json', JSON.stringify(d, null, 2), 'application/json');
        }],
        ['Preview', async () => { const d = await (await fetch('/api/backup?name=' + encodeURIComponent(b.name))).json(); pv.textContent = toMarkdown(d || []).join('\n'); pv.hidden = false; pv.scrollIntoView({ behavior: 'smooth' }); }],
        ['Restore this version', async () => {
          if (!confirm('Replace your whole list with the version from ' + b.label + '?\n\nYour current list is saved as a backup first, and you can also press Undo.')) return;
          const d = await (await fetch('/api/backup?name=' + encodeURIComponent(b.name))).json();
          if (!Array.isArray(d)) return alert('That backup could not be read.');
          await post('/api/backup-snapshot', { data });
          checkpoint();
          data = d;
          ensureDump();
          save(true);
          zoom(null);
          toast('Restored the ' + b.label + ' version', { undo: true });
        }]
      ]));
      });
    }],
    ...savedSearches().map((s, i) => ['saved' + i, '☆ ' + s.name, c => {
      c.append(el('h1', 'vtitle', s.name), el('p', 'vsub', 'Saved search: ' + s.q));
      const keep = query;
      query = s.q.toLowerCase();
      const hits = [];
      (function walk(l) { for (const x of l) { if (x.id !== DUMP && !x.day && x.id !== SOMEDAY && x.text.trim() && itemMatches(x)) hits.push(x); walk(x.children); } })(data);
      query = keep;
      const box = el('div', 'vlist');
      if (!hits.length) box.append(el('div', 'vempty', 'Nothing matches right now.'));
      hits.forEach(x => box.append(vrowEl(meta(x.text).clean, ancestors(x.id).map(a => a.id === DUMP ? 'Brain Dump' : a.text).filter(Boolean).join(' › '), [['Show', () => reveal(x.id)]])));
      const del = el('button', 'vbtn', 'Remove this saved search');
      del.style.margin = '14px 0 0 -32px';
      del.onclick = () => { const l = savedSearches(); l.splice(i, 1); try { localStorage.setItem('savedSearches', JSON.stringify(l)); } catch {} location.hash = '#/views'; };
      c.append(box, del);
    }])
  ];
})();
