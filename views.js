// The Views tab: dashboards built from the checklist (ideas 01, 02, 07–13, 31–33, 36, 38–41, 59, 63, 68).
// Uses the helpers in checklist.html (data, meta, score, markDone, reveal, ...). Nothing here uses Claude.

(function () {
  const css = `
  .vnav { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 22px -32px; }
  .vnav button { border: 1px solid var(--line); background: var(--bg); color: var(--muted); font: inherit; font-size: 13px; padding: 5px 11px; border-radius: 16px; cursor: pointer; }
  .vnav button.on { background: var(--text); border-color: var(--text); color: var(--bg); }
  .vtitle { font-size: 26px; font-weight: 700; margin: 0 0 4px -32px; }
  .vsub { color: var(--muted); margin: 0 0 18px -32px; font-size: 14px; }
  .vlist { margin-left: -32px; }
  .vrow { display: flex; align-items: flex-start; gap: 10px; padding: 7px 10px; border-radius: 8px; }
  .vrow:hover { background: var(--hover); }
  .vrow .vtext { flex: 1; min-width: 0; cursor: pointer; }
  .vrow .vpath { display: block; font-size: 12px; color: var(--muted); }
  .vrow.big .vtext { font-size: 17px; font-weight: 600; }
  .vrow .score { font-size: 11px; color: var(--muted); flex: none; margin-top: 3px; }
  .vbtn { border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit; font-size: 12px; padding: 3px 9px; border-radius: 6px; cursor: pointer; flex: none; }
  .vbtn:hover { border-color: var(--muted); }
  .vbtn.on { background: var(--accent); border-color: var(--accent); color: #fff; }
  .vempty { color: var(--muted); padding: 10px; margin-left: -32px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-left: -32px; }
  .kan { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-left: -32px; }
  .box { border: 1px solid var(--line); border-radius: 12px; padding: 12px; min-width: 0; }
  .box h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); display: flex; justify-content: space-between; }
  .box .vrow { padding: 6px; }
  .card { border: 1px solid var(--line); border-radius: 8px; padding: 8px; margin-bottom: 6px; font-size: 13.5px; background: var(--bg); }
  .card .cbtns { display: flex; gap: 4px; margin-top: 6px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-left: -32px; }
  .big-num { font-size: 34px; font-weight: 700; line-height: 1.1; }
  .bars { display: flex; align-items: flex-end; gap: 6px; height: 110px; margin-top: 8px; }
  .bars div { flex: 1; text-align: center; font-size: 11px; color: var(--muted); display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }
  .bars span { display: block; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 2px; margin-bottom: 4px; }
  .heat { display: grid; grid-template-rows: repeat(7, 11px); grid-auto-flow: column; gap: 3px; margin-top: 8px; }
  .heat i { width: 11px; height: 11px; border-radius: 2px; background: var(--hover); }
  .heat i.l1 { background: #c6e6bf; } .heat i.l2 { background: #8fcc82; } .heat i.l3 { background: #4f9e43; } .heat i.l4 { background: #2f6b2a; }
  .funnel div { margin: 5px 0; font-size: 13px; }
  .funnel span { display: inline-block; height: 14px; background: #577249; border-radius: 3px; vertical-align: middle; margin-right: 8px; min-width: 3px; }
  .counter { display: flex; align-items: center; justify-content: space-between; margin: 6px 0; font-size: 14px; }
  .counter b { font-variant-numeric: tabular-nums; }
  .tagcloud { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 16px -32px; }
  .tagcloud .chip { cursor: pointer; font-size: 13px; padding: 2px 10px; }
  .tagcloud .chip.sel { outline: 2px solid var(--accent); }
  details.more { margin-left: -32px; margin-top: 10px; }
  details.more summary { cursor: pointer; color: var(--muted); font-size: 14px; padding: 6px 10px; }
  details.more .vlist { margin-left: 0; }
  @media (max-width: 700px) { .grid2, .kan { grid-template-columns: 1fr; } .vnav, .vtitle, .vsub, .vlist, .grid2, .kan, .stats, .tagcloud, details.more, .vempty { margin-left: -20px; } }`;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

  const VIEWS = [
    ['today', 'Today'], ['impact', 'Top by impact'], ['pareto', 'Top 20%'], ['thirty', 'If I only had 30 min'],
    ['energy', 'Energy'], ['eisenhower', 'Urgent / important'], ['kanban', 'Kanban'], ['deadlines', 'Deadlines'],
    ['tags', 'Tags & clients'], ['blocked', 'Blocked'], ['stale', 'Stale'], ['duplicates', 'Duplicates'],
    ['stats', 'Stats'], ['review', 'Weekly review']
  ];
  let thirtyBudget = 30, energyMode = 'deep', selectedTag = null;
  let doneLog = {}, outreach = {};

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ymd = d => d.toLocaleDateString('en-CA');
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };

  // Every open to-do (leaf items), with its parsed tags and where it lives
  function tasks(includeDone = false) {
    const out = [];
    (function walk(list, path, inToday) {
      for (const it of list) {
        const container = it.id === DUMP || it.id === SOMEDAY || it.day;
        if (it.children.length || container) {
          walk(it.children, it.id === DUMP ? path : path.concat(it.text), inToday || it.day === todayKey());
        } else if (it.text.trim() && (includeDone || !it.done) && !it.mirrorOf && !isSnoozed(it)) {
          const m = meta(it.text);
          out.push({ it, m, path, inToday: !!inToday, s: score(m) });
        }
      }
    })(data, [], false);
    return out;
  }
  const isUrgent = t => t.m.tags.includes('today') || t.inToday || (t.m.due && daysUntil(t.m.due) <= 2);
  const isImportant = t => t.m.impact >= 4 || t.m.tags.includes('revenue');

  function row(t, opts = {}) {
    const r = el('div', 'vrow' + (opts.big ? ' big' : ''));
    const box = el('input', 'check');
    box.type = 'checkbox';
    box.checked = t.it.done;
    box.addEventListener('change', () => { markDone(t.it, box.checked); save(); render(); });
    const txt = el('div', 'vtext', t.m.clean || t.it.text);
    txt.title = 'Show in the list';
    txt.addEventListener('click', () => reveal(t.it.id));
    if (t.path.length) txt.append(el('span', 'vpath', t.path.filter(Boolean).join(' › ')));
    r.append(box, txt);
    const chips = renderChips(t.it);
    if (chips) r.append(chips);
    if (opts.score) r.append(el('span', 'score', 'score ' + t.s));
    for (const [label, fn] of opts.buttons || []) {
      const b = el('button', 'vbtn', label);
      b.addEventListener('click', fn);
      r.append(b);
    }
    return r;
  }
  function list(items, opts) {
    const box = el('div', 'vlist');
    if (!items.length) return el('div', 'vempty', opts && opts.empty || 'Nothing here right now.');
    items.forEach(t => box.append(row(t, opts)));
    return box;
  }
  const byScore = (a, b) => b.s - a.s;

  const RENDER = {
    today(c) {
      // Idea 33: top 3 only, the rest folded away
      const all = tasks();
      const picks = new Set(plan && plan.date === todayKey() ? (plan.top3 || []).map(p => p.item_id) : []);
      const today = all.filter(t => isUrgent(t) || t.it.doing || picks.has(t.it.id)).sort(byScore);
      head(c, 'Today', 'Your top 3 for today, from #today tags, today\'s Brain Dump, things due within 2 days, and Claude\'s picks. Ranked by impact.');
      if (!today.length) {
        c.append(el('div', 'vempty', 'Nothing marked for today. Here are your 3 highest-impact tasks instead:'));
        return c.append(list(all.sort(byScore).slice(0, 3), { big: true }));
      }
      c.append(list(today.slice(0, 3), { big: true }));
      const rest = today.slice(3);
      // Time-of-day sections (idea 36): tag items #morning, #afternoon or #evening
      const slots = [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']];
      if (rest.some(t => slots.some(([k]) => t.m.tags.includes(k)))) {
        for (const [k, label] of slots.concat([['', 'Anytime']])) {
          const group = rest.filter(t => k ? t.m.tags.includes(k) : !slots.some(([x]) => t.m.tags.includes(x)));
          if (!group.length) continue;
          c.append(el('h3', 'vsub', label));
          c.append(list(group));
        }
      } else if (rest.length) {
        const more = el('details', 'more');
        more.append(el('summary', '', rest.length + ' more for today'), list(rest));
        c.append(more);
      }
      const wrap = el('button', 'vbtn', '☾ Wrap up the day');
      wrap.style.margin = '18px 0 0 -32px';
      wrap.addEventListener('click', () => window.openWrapUp && window.openWrapUp());
      c.append(wrap);
    },
    impact(c) {
      head(c, 'Top by impact', 'Sorted by impact ÷ effort, with #revenue work counted double. Set them with i:1–5 and e:1–5 (both default to 3).');
      c.append(list(tasks().sort(byScore), { score: true }));
    },
    pareto(c) {
      const r = tasks().sort(byScore);
      head(c, 'Top 20%', 'The few tasks most likely to bring in money. Do these before anything else.');
      c.append(list(r.slice(0, Math.max(1, Math.ceil(r.length * 0.2))), { score: true }));
    },
    thirty(c) {
      head(c, 'If I only had ' + thirtyBudget + ' minutes', 'The highest-impact tasks that fit. Add time estimates like ~15m or ~2h (no estimate counts as 30 minutes).');
      c.append(choice([[15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours']], thirtyBudget, v => { thirtyBudget = v; render(); }));
      let left = thirtyBudget;
      const fit = [];
      for (const t of tasks().filter(t => !isBlocked(t.m)).sort(byScore)) {
        const need = t.m.est || 30;
        if (need <= left) { fit.push(t); left -= need; }
      }
      c.append(list(fit, { empty: 'Nothing fits. Try a bigger time slot or add estimates.' }));
    },
    energy(c) {
      head(c, 'Match your energy', 'Tag tasks #deep (needs focus), #shallow (easy) or #social (calls, visits, messages).');
      c.append(choice([['deep', 'Focused'], ['shallow', 'Tired'], ['social', 'Chatty']], energyMode, v => { energyMode = v; render(); }));
      c.append(list(tasks().filter(t => t.m.tags.includes(energyMode)).sort(byScore), { empty: 'No tasks tagged #' + energyMode + ' yet.' }));
    },
    eisenhower(c) {
      head(c, 'Urgent / important', 'Urgent: #today, today\'s Brain Dump or due within 2 days. Important: impact 4–5 (i:4) or #revenue.');
      const q = { 'Do first': [], 'Schedule': [], 'Delegate': [], 'Drop': [] };
      for (const t of tasks()) {
        const u = isUrgent(t), i = isImportant(t);
        q[u && i ? 'Do first' : i ? 'Schedule' : u ? 'Delegate' : 'Drop'].push(t);
      }
      const grid = el('div', 'grid2');
      for (const [name, items] of Object.entries(q)) {
        const b = el('div', 'box');
        const h = el('h3', '', name);
        h.append(el('span', '', items.length));
        b.append(h);
        items.sort(byScore).forEach(t => b.append(row(t)));
        grid.append(b);
      }
      c.append(grid);
    },
    kanban(c) {
      head(c, 'Kanban', 'Waiting = tagged #waiting or blocked. Done = checked off in the last 7 days.');
      const all = tasks(true);
      const weekAgo = Date.now() - 7 * dayMs;
      const cols = {
        Backlog: all.filter(t => !t.it.done && !t.it.doing && !t.m.tags.includes('waiting') && !isBlocked(t.m)),
        Doing: all.filter(t => !t.it.done && t.it.doing),
        Waiting: all.filter(t => !t.it.done && !t.it.doing && (t.m.tags.includes('waiting') || isBlocked(t.m))),
        Done: all.filter(t => t.it.done && (t.it.doneAt || 0) > weekAgo)
      };
      const k = el('div', 'kan');
      for (const [name, items] of Object.entries(cols)) {
        const b = el('div', 'box');
        const h = el('h3', '', name);
        h.append(el('span', '', items.length));
        b.append(h);
        for (const t of items.sort(byScore).slice(0, 40)) {
          const card = el('div', 'card', t.m.clean);
          card.title = 'Click to show in the list';
          card.addEventListener('click', e => { if (e.target === card) reveal(t.it.id); });
          const btns = el('div', 'cbtns');
          const btn = (label, fn) => { const x = el('button', 'vbtn', label); x.addEventListener('click', fn); btns.append(x); };
          if (name === 'Backlog' || name === 'Waiting') btn('Start', () => setDoing(t.it.id));
          if (name === 'Doing') btn('Pause', () => setDoing(t.it.id));
          if (name !== 'Done') btn('Done', () => { markDone(t.it, true); save(); render(); });
          else btn('Undo', () => { markDone(t.it, false); save(); render(); });
          card.append(btns);
          b.append(card);
        }
        k.append(b);
      }
      c.append(k);
    },
    deadlines(c) {
      head(c, 'Deadlines', 'Everything with a due date, soonest first. Add one with due:2026-11-02.');
      c.append(list(tasks().filter(t => t.m.due).sort((a, b) => a.m.due.localeCompare(b.m.due)), { empty: 'No due dates yet.' }));
    },
    tags(c) {
      head(c, 'Tags & clients', 'Click a tag to see its tasks. Clients (@name) also get a read-only progress page you can show them.');
      const all = tasks(true);
      const counts = {};
      for (const t of all) for (const x of [...t.m.tags.map(g => '#' + g), ...t.m.clients.map(g => '@' + g)]) counts[x] = (counts[x] || 0) + 1;
      const cloud = el('div', 'tagcloud');
      Object.keys(counts).sort().forEach(k => {
        const chip = el('span', 'chip ' + (k[0] === '#' ? 't-' + k.slice(1) : 'client') + (k === selectedTag ? ' sel' : ''), k + ' ' + counts[k]);
        chip.addEventListener('click', () => { selectedTag = selectedTag === k ? null : k; render(); });
        cloud.append(chip);
      });
      if (!Object.keys(counts).length) return c.append(el('div', 'vempty', 'No #tags or @clients yet. Type them into any item.'));
      c.append(cloud);
      if (!selectedTag) return;
      const name = selectedTag.slice(1);
      const hits = all.filter(t => selectedTag[0] === '#' ? t.m.tags.includes(name) : t.m.clients.includes(name));
      if (selectedTag[0] === '@' && !window.CHECKLIST_EMBED) {
        const link = el('a', 'vbtn', 'Open the client progress page for @' + name);
        link.href = 'client.html?c=' + encodeURIComponent(name);
        link.target = '_blank';
        link.style.cssText = 'display:inline-block;margin:0 0 12px -32px;text-decoration:none';
        c.append(link);
      }
      c.append(list(hits.sort((a, b) => a.it.done - b.it.done || b.s - a.s)));
    },
    blocked(c) {
      head(c, 'Blocked', 'Tasks waiting on another open task (blocked-by:"task text"). They come back once that task is checked off.');
      c.append(list(tasks().filter(t => isBlocked(t.m)), { empty: 'Nothing is blocked.' }));
    },
    stale(c) {
      head(c, 'Stale', 'Open tasks nobody has touched in 7+ days. Do it, delegate it, or delete it.');
      const stale = tasks().filter(t => isStale(t.it)).sort((a, b) => a.it.updated - b.it.updated);
      c.append(list(stale, {
        empty: 'Nothing stale. Nice.',
        buttons: []
      }));
      c.querySelectorAll('.vrow').forEach((r, n) => {
        const t = stale[n];
        const add = (label, fn) => { const b = el('button', 'vbtn', label); b.addEventListener('click', fn); r.append(b); };
        add('Do it', () => setDoing(t.it.id));
        add('Keep (snooze 7 days)', () => { t.it.updated = Date.now(); save(); render(); });
        add('Delete', () => deleteItem(t.it.id).then(render));
      });
    },
    duplicates(c) {
      head(c, 'Possible duplicates', 'Open tasks that say almost the same thing. Delete one to tidy up (it goes to Deleted Items).');
      const words = s => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2));
      const jac = (a, b) => { const i = [...a].filter(x => b.has(x)).length; return i / ((a.size + b.size - i) || 1); };
      const t = tasks().map(x => Object.assign(x, { w: words(x.m.clean) })).filter(x => x.w.size);
      const pairs = [];
      for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (jac(t[i].w, t[j].w) >= 0.6) pairs.push([t[i], t[j]]);
      if (!pairs.length) return c.append(el('div', 'vempty', 'No duplicates found.'));
      for (const [a, b] of pairs) {
        const box = el('div', 'box');
        box.style.marginLeft = '-32px';
        box.style.marginBottom = '10px';
        box.append(row(a, { buttons: [['Delete this one', () => deleteItem(a.it.id).then(render)]] }),
          row(b, { buttons: [['Delete this one', () => deleteItem(b.it.id).then(render)]] }));
        c.append(box);
      }
    },
    stats(c) {
      head(c, 'Stats', 'Streaks, what you got done, outreach and your sales pipeline.');
      const s = el('div', 'stats');
      const card = (title) => { const b = el('div', 'box'); b.append(el('h3', '', title)); s.append(b); return b; };

      // Streaks (idea 38)
      // Days in a row up to today (a streak stays alive until today is over)
      const streak = test => {
        const has = d => (doneLog[daysAgo(d)] || []).some(test);
        let d = has(0) ? 0 : 1, n = 0;
        while (has(d) && d < 1000) { n++; d++; }
        return n;
      };
      const any = streak(() => true);
      const rev = streak(x => (x.tags || []).includes('revenue') || /#revenue/i.test(x.text));
      const sb = card('Streak');
      sb.append(el('div', 'big-num', any + ' day' + (any === 1 ? '' : 's')), el('div', 'vpath', 'in a row with something checked off'),
        el('div', 'big-num', rev), el('div', 'vpath', 'days in a row with a #revenue task done'));

      // Weekly bar chart (idea 39)
      const wb = card('Done per day (last 7 days)');
      const bars = el('div', 'bars');
      const week = [...Array(7)].map((_, i) => daysAgo(6 - i));
      const max = Math.max(1, ...week.map(d => (doneLog[d] || []).length));
      for (const d of week) {
        const n = (doneLog[d] || []).length;
        const col = el('div');
        const bar = el('span');
        bar.style.height = (n / max * 80) + 'px';
        col.append(el('b', '', n || ''), bar, el('span', '', new Date(d + 'T12:00').toLocaleDateString([], { weekday: 'short' })));
        col.lastChild.style.cssText = 'background:none;height:auto;margin:0';
        bars.append(col);
      }
      wb.append(bars);

      // Heat map, last 16 weeks (idea 41)
      const hb = card('Activity (16 weeks)');
      const heat = el('div', 'heat');
      const start = new Date();
      start.setDate(start.getDate() - 7 * 16 + 1 - start.getDay());
      for (let d = new Date(start); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const n = (doneLog[ymd(d)] || []).length;
        const cell = el('i', n ? 'l' + Math.min(4, Math.ceil(n / 2)) : '');
        cell.title = ymd(d) + ': ' + n + ' done';
        heat.append(cell);
      }
      hb.append(heat);

      // Totals (idea 02)
      const all = tasks();
      const mins = all.reduce((a, t) => a + (t.m.est || 0), 0);
      const tb = card('Open work');
      tb.append(el('div', 'big-num', all.length), el('div', 'vpath', 'open tasks · ' + (mins / 60).toFixed(1) + ' hours estimated'),
        el('div', '', all.filter(t => t.m.tags.includes('revenue')).length + ' tagged #revenue · ' + all.filter(t => !t.m.est).length + ' without a time estimate'));

      // Outreach counter (idea 59)
      const ob = card('Outreach today');
      const goal = { emails: 10, texts: 10, visits: 3 };
      const today = outreach[todayKey()] || { emails: 0, texts: 0, visits: 0 };
      for (const kind of Object.keys(goal)) {
        const line = el('div', 'counter');
        line.append(el('span', '', kind[0].toUpperCase() + kind.slice(1)), el('b', '', (today[kind] || 0) + ' / ' + goal[kind]));
        const btns = el('span');
        for (const by of [-1, 1]) {
          const b = el('button', 'vbtn', by > 0 ? '+1' : '−');
          b.addEventListener('click', async () => {
            outreach = await (await fetch('/api/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, by }) })).json();
            render();
          });
          btns.append(b);
        }
        line.append(btns);
        ob.append(line);
      }

      // Revenue funnel from pipeline sections (ideas 40, 53)
      const fb = card('Sales pipeline');
      const stages = ['Prospects', 'Pitched', 'Replied', 'Building', 'Live', 'Billing'];
      const counts = stages.map(name => {
        let n = 0;
        (function walk(l) { for (const it of l) { if (meta(it.text).clean.toLowerCase() === name.toLowerCase()) n += it.children.filter(x => !x.done).length; walk(it.children); } })(data);
        return n;
      });
      const fmax = Math.max(1, ...counts);
      const fun = el('div', 'funnel');
      stages.forEach((name, i) => {
        const line = el('div');
        const bar = el('span');
        bar.style.width = (counts[i] / fmax * 140) + 'px';
        line.append(bar, document.createTextNode(name + ': ' + counts[i]));
        fun.append(line);
      });
      fb.append(fun);
      if (!counts.some(Boolean)) fb.append(el('div', 'vpath', 'Add the "Sales pipeline" template (under the list) to start tracking.'));
      c.append(s);
    },
    review(c) {
      // Weekly review (idea 32), built from your own data so it costs nothing
      head(c, 'Weekly review', 'What you finished, what slipped and what to drop, from the last 7 days.');
      const week = [...Array(7)].map((_, i) => daysAgo(i));
      const done = week.flatMap(d => (doneLog[d] || []).map(x => Object.assign({ day: d }, x)));
      const all = tasks();
      const slipped = all.filter(t => t.m.due && daysUntil(t.m.due) < 0);
      const drop = all.filter(t => isStale(t.it));
      const grid = el('div', 'grid2');
      const box = (title, n) => { const b = el('div', 'box'); const h = el('h3', '', title); h.append(el('span', '', n)); b.append(h); grid.append(b); return b; };
      const wins = box('Finished this week', done.length);
      done.slice(-15).reverse().forEach(x => wins.append(el('div', 'vrow', x.text)));
      if (!done.length) wins.append(el('div', 'vpath', 'Nothing checked off yet this week.'));
      const sl = box('Slipped (overdue)', slipped.length);
      slipped.forEach(t => sl.append(row(t)));
      const dr = box('Consider dropping (stale)', drop.length);
      drop.slice(0, 10).forEach(t => dr.append(row(t)));
      const top = box('Next week\'s top 5', Math.min(5, all.length));
      all.sort(byScore).slice(0, 5).forEach(t => top.append(row(t)));
      c.append(grid);
      // The Done Journal, grouped by day, as a file (it used to live in Saved Items)
      const dj = el('button', 'vbtn', '⬇ Download Done Journal');
      dj.style.margin = '16px 0 0 -32px';
      dj.addEventListener('click', () => {
        const lines = ['# Done Journal', '', 'Everything you checked off, grouped by day.', ''];
        for (const day of Object.keys(doneLog).sort().reverse()) {
          lines.push('## ' + new Date(day + 'T12:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), '');
          for (const x of doneLog[day]) lines.push('- ' + x.time + ': ' + x.text);
          lines.push('');
        }
        window.checklistDownload && window.checklistDownload('Done Journal ' + todayKey() + '.md', lines.join('\n'), 'text/markdown');
      });
      c.append(dj);
    }
  };

  function head(c, title, sub) {
    c.append(el('h1', 'vtitle', title), el('p', 'vsub', sub));
  }
  function choice(options, current, onPick) {
    const bar = el('div', 'vnav');
    for (const [value, label] of options) {
      const b = el('button', value === current ? 'on' : '', label);
      b.addEventListener('click', () => onPick(value));
      bar.append(b);
    }
    return bar;
  }

  let loadedLogs = 0;
  window.renderViews = function (container, mode) {
    // Extra views (recent, deleted, archive, backups, saved searches) come from more.js
    const extra = window.extraViews ? window.extraViews() : [];
    const all = VIEWS.concat(extra.map(([k, label]) => [k, label]));
    const renderers = Object.assign({}, RENDER, Object.fromEntries(extra.map(([k, , fn]) => [k, fn])));
    // A view can carry an argument, like day/2026-10-30
    let [name, arg] = mode.split('/');
    if (!renderers[name]) name = 'today';
    container.innerHTML = '';
    container.append(choice(all, name, v => { location.hash = '#/views/' + v; }));
    renderers[name](container, arg);
    // Done log and outreach live on the server; refresh them now and then
    if (online && (name === 'stats' || name === 'review') && Date.now() - loadedLogs > 3000) {
      loadedLogs = Date.now();
      Promise.all([fetch('/api/done-log').then(r => r.json()), fetch('/api/outreach').then(r => r.json())])
        .then(([d, o]) => { doneLog = d; outreach = o; if (viewMode === mode) render(); })
        .catch(() => {});
    }
  };
})();
