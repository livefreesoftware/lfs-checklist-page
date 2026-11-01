// Time features: a work stopwatch (time worked per day, averages), a Day view (what was added, due
// and finished on any date) and an Incomplete view (every open task by the day you wrote it down).
// Uses the helpers in checklist.html and more.js. Nothing here uses Claude.

(function () {
  const css = `
  .watch { font-variant-numeric: tabular-nums; }
  .watch.on { background: #e5484d; border-color: #e5484d; color: #fff; }
  .watch.on::before { content: "● "; animation: pulse 1.2s infinite; }
  .daynav { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 18px -32px; }
  .daynav .dtitle { font-size: 26px; font-weight: 700; min-width: 0; margin: 0 6px; }
  .daynav input[type=date] { font: inherit; font-size: 13px; padding: 4px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--text); }
  .tsec { margin: 22px 0 6px -32px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .tsec .sbtn { text-transform: none; letter-spacing: 0; }
  .vrow .when-at { flex: none; font-size: 12px; color: var(--muted); margin-top: 3px; font-variant-numeric: tabular-nums; }
  .age { flex: none; font-size: 11.5px; padding: 1px 8px; border-radius: 10px; margin-top: 3px; white-space: nowrap; }
  .age.fresh { background: #e3f1e0; color: #2f6b2a; }
  .age.week { background: #fff1d6; color: #8a5a00; }
  .age.old { background: #fbe4e2; color: #b3352c; }
  .tcards { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin: 0 0 18px -32px; }
  .tcard { border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
  .tcard b { display: block; font-size: 24px; line-height: 1.2; font-variant-numeric: tabular-nums; }
  .tcard span { font-size: 12.5px; color: var(--muted); }
  .hbars { display: flex; align-items: flex-end; gap: 5px; height: 140px; margin: 6px 0 0 -32px; padding-bottom: 34px; position: relative; }
  .hbars div { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; font-size: 11px; color: var(--muted); cursor: pointer; position: relative; }
  .hbars span { width: 100%; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 2px; }
  .hbars div.today span { background: #e5484d; }
  .hbars em { position: absolute; bottom: -30px; font-style: normal; text-align: center; line-height: 1.2; white-space: pre-line; }
  .hbars b { font-weight: 600; color: var(--text); margin-bottom: 3px; font-size: 11px; }
  .hbars .avgline { position: absolute; left: 0; right: 0; height: 0; display: block; flex: none; cursor: default; border-top: 2px dashed color-mix(in srgb, var(--text) 35%, transparent); pointer-events: none; }
  .avgline small { position: absolute; right: 0; top: -17px; font-size: 11px; color: var(--muted); background: var(--bg); padding: 0 4px; white-space: nowrap; }
  .sessions .vrow { font-size: 14px; }`;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ymd = d => new Date(d).toLocaleDateString('en-CA');
  const dayName = iso => new Date(iso + 'T12:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const shortDay = iso => new Date(iso + 'T12:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const clock = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + n); return ymd(d); };
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
  const hms = secs => { secs = Math.floor(secs); return Math.floor(secs / 3600) + ':' + String(Math.floor(secs / 60) % 60).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0'); };
  function hm(minutes) {
    minutes = Math.round(minutes);
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return h ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm';
  }
  function daysAgoLabel(ms) {
    const n = Math.round((new Date(ymd(Date.now()) + 'T12:00') - new Date(ymd(ms) + 'T12:00')) / 864e5);
    return n === 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago';
  }
  const ageDays = ms => Math.round((new Date(ymd(Date.now()) + 'T12:00') - new Date(ymd(ms) + 'T12:00')) / 864e5);

  // ---------------- Stopwatch ----------------
  // Sessions are filed by date on the server: { running: {start} | null, days: { '2026-10-30': { total_minutes, sessions } } }
  let worklog = { running: null, days: {} };
  const watchBtn = document.getElementById('watchBtn');
  const running = () => worklog.running;

  // Minutes worked per day: the saved totals, plus the running session (split at midnight) counted live
  function minutesByDay() {
    const out = {};
    for (const [day, info] of Object.entries(worklog.days || {})) out[day] = info.total_minutes || 0;
    const r = running();
    if (r) {
      let a = new Date(r.start).getTime();
      const b = Date.now();
      while (a < b) {
        const midnight = new Date(a);
        midnight.setHours(24, 0, 0, 0);
        const stop = Math.min(b, midnight.getTime());
        const k = ymd(a);
        out[k] = (out[k] || 0) + (stop - a) / 60000;
        a = stop;
      }
    }
    return out;
  }
  window.minutesWorked = day => minutesByDay()[day] || 0;

  function showWatch() {
    const r = running();
    const today = window.minutesWorked(todayKey());
    watchBtn.classList.toggle('on', !!r);
    if (r) {
      // Running: today's total ticks up every second (this session is in the tooltip)
      const session = Math.floor((Date.now() - new Date(r.start)) / 1000);
      watchBtn.textContent = hms(today * 60);
      watchBtn.title = 'Today: ' + hms(today * 60) + ' · this session: ' + hms(session) + ' (since ' + clock(new Date(r.start)) + '). Click to stop.';
    } else {
      watchBtn.textContent = today >= 1 ? '⏱ ' + hm(today) : '⏱ Start';
      watchBtn.title = (today >= 1 ? hm(today) + ' worked today. ' : '') + 'Click to start the work stopwatch.';
    }
    watchBtn.setAttribute('aria-label', watchBtn.title);
    // Any "worked today" numbers on screen (Work time, Day view) tick along too
    document.querySelectorAll('[data-live-day]').forEach(e => {
      const m = window.minutesWorked(e.dataset.liveDay);
      e.textContent = r ? hms(m * 60) : hm(m);
    });
    watchBtn.setAttribute('aria-pressed', String(!!r));
  }
  async function loadWorklog() {
    if (!online) return;
    try { worklog = await (await fetch('/api/worklog')).json(); } catch {}
    showWatch();
    // Views that show work time are drawn again once the log has arrived
    if (viewMode && /^(worktime|day)/.test(viewMode)) render();
  }
  watchBtn.addEventListener('click', async () => {
    if (!online) return alert('Open the checklist with Start Checklist.command to use the stopwatch.');
    const wasRunning = !!running();
    worklog = await post('/api/worklog', { action: wasRunning ? 'stop' : 'start' });
    showWatch();
    toast(wasRunning ? 'Stopped. ' + hm(window.minutesWorked(todayKey())) + ' worked today.' : 'Stopwatch started');
    if (viewMode && viewMode.startsWith('worktime')) render();
  });
  setInterval(showWatch, 1000);

  // Turn "6:30pm", "18:30" or "6pm" into a time on the session's start day (or the day after)
  function parseClock(text, startIso) {
    const m = String(text || '').trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!m) return null;
    let h = +m[1];
    const min = +(m[2] || 0);
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    if (h > 23 || min > 59) return null;
    const start = new Date(startIso);
    const end = new Date(start);
    end.setHours(h, min, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1);
    return end;
  }
  // If the stopwatch was left running for over 10 hours, ask when you actually stopped
  async function checkForgotten() {
    const r = running();
    if (!r || Date.now() - new Date(r.start) < 10 * 3600 * 1000) return;
    const since = new Date(r.start).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    const answer = prompt('Your stopwatch has been running since ' + since + '. Forgot to stop it?\n\n'
      + 'Type the time you stopped (like 6:30pm), or leave it blank to keep it running.');
    if (!answer) return;
    const end = parseClock(answer, r.start);
    if (!end || end > new Date()) return alert('Couldn\'t read that time. Try something like 6:30pm.');
    // Local time, the same way the server writes it (not UTC)
    const local = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    worklog = await post('/api/worklog', { action: 'stop', end: local });
    showWatch();
    toast('Stopped at ' + clock(end));
  }

  // ---------------- Shared bits for the views ----------------
  function openItems() {
    const out = [];
    (function walk(list, path) {
      for (const it of list) {
        const container = it.id === DUMP || it.id === SOMEDAY || it.day;
        if (container || it.children.length) walk(it.children, it.id === DUMP ? ['Brain Dump'] : path.concat(it.text));
        if (!container && !it.mirrorOf && it.text.trim() && !it.done && !it.children.length) out.push({ it, path });
      }
    })(data, []);
    return out;
  }
  function allItems() {
    const out = [];
    (function walk(list, path) {
      for (const it of list) {
        const container = it.id === DUMP || it.id === SOMEDAY || it.day;
        if (!container && !it.mirrorOf && it.text.trim()) out.push({ it, path });
        walk(it.children, it.id === DUMP ? ['Brain Dump'] : path.concat(it.text));
      }
    })(data, []);
    return out;
  }
  function itemRow({ it, path }, right) {
    const r = el('div', 'vrow');
    const box = el('input', 'check');
    box.type = 'checkbox';
    box.checked = it.done;
    box.setAttribute('aria-label', 'Done: ' + meta(it.text).clean);
    box.addEventListener('change', () => { checkpoint(); markDone(it, box.checked); save(); render(); });
    const txt = el('div', 'vtext', meta(it.text).clean || it.text);
    txt.title = 'Show in the list';
    txt.addEventListener('click', () => reveal(it.id));
    if (path.length) txt.append(el('span', 'vpath', path.filter(Boolean).join(' › ')));
    r.append(box, txt);
    const chips = renderChips(it);
    if (chips) { chips.style.order = 0; chips.style.flexBasis = 'auto'; chips.style.padding = 0; r.append(chips); }
    for (const x of right || []) r.append(x);
    return r;
  }
  const section = (c, title, extra) => { const h = el('div', 'tsec', title); if (extra) h.append(extra); c.append(h); };
  const btn = (label, fn) => { const b = el('button', 'sbtn', label); b.addEventListener('click', fn); return b; };

  // ---------------- Day view ----------------
  function dayView(c, arg) {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : todayKey();
    const go = d => { location.hash = '#/views/day/' + d; };
    const nav = el('div', 'daynav');
    nav.append(btn('◀', () => go(addDays(day, -1))), el('span', 'dtitle', dayName(day)), btn('▶', () => go(addDays(day, 1))));
    if (day !== todayKey()) nav.append(btn('Today', () => go(todayKey())));
    const pickDate = el('input');
    pickDate.type = 'date';
    pickDate.value = day;
    pickDate.setAttribute('aria-label', 'Pick a day');
    pickDate.addEventListener('change', () => pickDate.value && go(pickDate.value));
    nav.append(pickDate);
    nav.append(btn('⬇ Day note', () => download(dayName(day).replace(/,/g, '') + ' (' + day + ').md', dayNote(day), 'text/markdown')));
    c.append(nav);

    const startOf = new Date(day + 'T00:00:00').getTime(), endOf = startOf + 864e5;
    const all = allItems();
    const brainDay = (find(DUMP) && find(DUMP).it.children.find(d => d.day === day)) || null;

    // Cards: work time, added, finished
    const worked = window.minutesWorked(day);
    const added = all.filter(x => x.it.created >= startOf && x.it.created < endOf);
    const finished = all.filter(x => x.it.done && x.it.doneAt >= startOf && x.it.doneAt < endOf);
    const cards = el('div', 'tcards');
    for (const [n, label] of [[hm(worked), 'worked'], [added.length, 'written down'], [finished.length, 'finished']]) {
      const k = el('div', 'tcard');
      const big = el('b', '', n);
      if (label === 'worked') big.dataset.liveDay = day;
      k.append(big, el('span', '', label));
      cards.append(k);
    }
    c.append(cards);

    // To do on this day: due that day, snoozed until that day, or in that day's Brain Dump list
    const todo = all.filter(x => !x.it.done && (meta(x.it.text).due === day || x.it.snooze === day || (brainDay && brainDay.children.includes(x.it))));
    section(c, 'To do on this day (' + todo.length + ')');
    if (todo.length) todo.forEach(x => c.append(itemRow(x)));
    else c.append(el('div', 'vempty', 'Nothing due, snoozed to, or in the Brain Dump for this day.'));

    section(c, 'Written down this day (' + added.length + ')');
    if (added.length) {
      added.sort((a, b) => a.it.done - b.it.done || a.it.created - b.it.created)
        .forEach(x => c.append(itemRow(x, [el('span', 'when-at', clock(x.it.created))])));
    } else c.append(el('div', 'vempty', 'Nothing was added on this day.'));

    section(c, 'Finished this day (' + finished.length + ')');
    if (finished.length) finished.sort((a, b) => a.it.doneAt - b.it.doneAt).forEach(x => c.append(itemRow(x, [el('span', 'when-at', clock(x.it.doneAt))])));
    else c.append(el('div', 'vempty', 'Nothing was checked off on this day.'));
  }

  // Saves a file to Downloads (used by the Work Log and Day note buttons)
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  // The same note the Mac version used to save in Saved Items/Days
  function dayNote(day) {
    const startOf = new Date(day + 'T00:00:00').getTime(), endOf = startOf + 864e5;
    const all = allItems();
    const where = x => x.path.filter(Boolean).join(' > ');
    const added = all.filter(x => x.it.created >= startOf && x.it.created < endOf).sort((a, b) => a.it.created - b.it.created);
    const finished = all.filter(x => x.it.done && x.it.doneAt >= startOf && x.it.doneAt < endOf).sort((a, b) => a.it.doneAt - b.it.doneAt);
    const todo = all.filter(x => !x.it.done && (meta(x.it.text).due === day || x.it.snooze === day));
    const info = worklog.days[day] || { total_minutes: 0, sessions: [] };
    const lines = ['# ' + new Date(day + 'T12:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), '',
      '**Worked:** ' + hm(window.minutesWorked(day)) + ' · **Written down:** ' + added.length + ' · **Finished:** ' + finished.length, '', '## Work sessions'];
    lines.push(...(info.sessions.length ? info.sessions.map(s => '- ' + clock(new Date(s.start)) + ' to ' + clock(new Date(s.end)) + ' (' + hm(s.minutes) + ')') : ['- none']));
    lines.push('', '## To do this day', ...(todo.length ? todo.map(x => '- [ ] ' + meta(x.it.text).clean) : ['- nothing due']));
    lines.push('', '## Written down', ...(added.length ? added.map(x => '- [' + (x.it.done ? 'x' : ' ') + '] ' + clock(x.it.created) + ', ' + meta(x.it.text).clean + (where(x) ? ' (' + where(x) + ')' : '')) : ['- nothing']));
    lines.push('', '## Finished', ...(finished.length ? finished.map(x => '- [x] ' + clock(x.it.doneAt) + ', ' + meta(x.it.text).clean + (where(x) ? ' (' + where(x) + ')' : '')) : ['- nothing']));
    return lines.join('\n') + '\n';
  }
  window.checklistDownload = download;

  // ---------------- Incomplete tasks, by the day you wrote them down ----------------
  let oldestFirst = false;
  function ageChip(ms) {
    const n = ageDays(ms);
    return el('span', 'age ' + (n < 3 ? 'fresh' : n < 7 ? 'week' : 'old'), n === 0 ? 'added today' : n === 1 ? '1 day old' : n + ' days old');
  }
  function incompleteView(c) {
    c.append(el('h1', 'vtitle', 'Incomplete tasks'), el('p', 'vsub', 'Everything still open, grouped by the day you wrote it down. Green is under 3 days old, amber under a week, red a week or more.'));
    const open = openItems().filter(x => x.it.created);
    if (!open.length) return c.append(el('div', 'vempty', 'Nothing open. Everything is done!'));
    const ages = open.map(x => ageDays(x.it.created));
    const cards = el('div', 'tcards');
    for (const [n, label] of [[open.length, 'open tasks'], [Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) + 'd', 'average age'],
      [Math.max(...ages) + 'd', 'oldest'], [ages.filter(a => a >= 7).length, 'a week or older']]) {
      const k = el('div', 'tcard');
      k.append(el('b', '', n), el('span', '', label));
      cards.append(k);
    }
    c.append(cards);
    const toggle = btn(oldestFirst ? 'Show newest first' : 'Show oldest first', () => { oldestFirst = !oldestFirst; render(); });
    toggle.style.marginLeft = '-32px';
    c.append(toggle);

    const groups = {};
    for (const x of open) (groups[ymd(x.it.created)] = groups[ymd(x.it.created)] || []).push(x);
    const days = Object.keys(groups).sort();
    if (!oldestFirst) days.reverse();
    for (const day of days) {
      const items = groups[day].sort((a, b) => a.it.created - b.it.created);
      section(c, shortDay(day) + ' · ' + daysAgoLabel(new Date(day + 'T12:00').getTime()) + ' · ' + items.length + ' open', btn('Open this day', () => { location.hash = '#/views/day/' + day; }));
      items.forEach(x => c.append(itemRow(x, [el('span', 'when-at', clock(x.it.created)), ageChip(x.it.created)])));
    }
  }

  // ---------------- Work time ----------------
  function workView(c) {
    c.append(el('h1', 'vtitle', 'Work time'), el('p', 'vsub', 'From the ⏱ stopwatch in the top bar. Averages only count days you worked.'));
    const byDay = minutesByDay();
    const today = todayKey();
    const lastN = n => [...Array(n)].map((_, i) => addDays(today, -i));
    const worked = days => days.map(d => byDay[d] || 0).filter(m => m > 0);
    const avg = list => list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    const monday = (() => { const d = new Date(today + 'T12:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); })();
    const week = lastN(7).filter(d => d >= monday);
    const allDays = Object.keys(byDay).filter(d => byDay[d] > 0);
    const best = allDays.sort((a, b) => byDay[b] - byDay[a])[0];

    const cards = el('div', 'tcards');
    for (const [n, label] of [
      [hm(byDay[today] || 0), 'today' + (running() ? ' (running)' : '')],
      [hm(week.reduce((a, d) => a + (byDay[d] || 0), 0)), 'this week (since Monday)'],
      [hm(avg(worked(lastN(7)))), 'average, last 7 days'],
      [hm(avg(worked(lastN(30)))), 'average, last 30 days'],
      [worked(lastN(30)).length, 'days worked in the last 30'],
      [best ? hm(byDay[best]) : '–', best ? 'best day (' + shortDay(best) + ')' : 'best day']
    ]) {
      const k = el('div', 'tcard');
      const big = el('b', '', n);
      if (label.startsWith('today')) big.dataset.liveDay = today;
      k.append(big, el('span', '', label));
      cards.append(k);
    }
    c.append(cards);

    // Last 14 days as bars, with a dashed line for the 30-day average
    const dl = btn('⬇ Download Work Log (CSV)', () => {
      const rows = [['date', 'weekday', 'start', 'end', 'minutes', 'hours', 'added by hand']];
      for (const [day, info] of Object.entries(worklog.days).sort()) {
        for (const s of info.sessions) {
          rows.push([day, new Date(day + 'T12:00').toLocaleDateString('en-US', { weekday: 'long' }), clock(new Date(s.start)), clock(new Date(s.end)), s.minutes, (s.minutes / 60).toFixed(2), s.manual ? 'yes' : '']);
        }
      }
      download('Work Log ' + today + '.csv', rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',')).join('\n'), 'text/csv');
    });
    dl.style.marginLeft = '-32px';
    c.append(dl);
    section(c, 'Last 14 days');
    const days = lastN(14).reverse();
    const max = Math.max(60, ...days.map(d => byDay[d] || 0));
    const bars = el('div', 'hbars');
    for (const d of days) {
      const m = byDay[d] || 0;
      const col = el('div', d === today ? 'today' : '');
      col.title = shortDay(d) + ': ' + hm(m) + ' · click to open the day';
      col.addEventListener('click', () => { location.hash = '#/views/day/' + d; });
      const bar = el('span');
      bar.style.height = (m / max * 100) + 'px';
      col.append(el('b', '', m >= 1 ? (m / 60).toFixed(1) + 'h' : ''), bar,
        el('em', '', new Date(d + 'T12:00').toLocaleDateString([], { weekday: 'short' }) + '\n' + new Date(d + 'T12:00').getDate()));
      bars.append(col);
    }
    const a30 = avg(worked(lastN(30)));
    if (a30) {
      const line = el('div', 'avgline');
      line.style.bottom = (34 + a30 / max * 100) + 'px';
      line.append(el('small', '', 'avg ' + hm(a30)));
      bars.append(line);
    }
    c.append(bars);

    // Average by weekday
    section(c, 'Average by weekday (last 8 weeks)');
    const wk = el('div', 'tcards');
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    names.forEach((name, i) => {
      const list = lastN(56).filter(d => (new Date(d + 'T12:00').getDay() + 6) % 7 === i).map(d => byDay[d] || 0).filter(m => m > 0);
      const k = el('div', 'tcard');
      k.append(el('b', '', list.length ? hm(avg(list)) : '–'), el('span', '', name + (list.length ? ' · ' + list.length + ' days' : '')));
      wk.append(k);
    });
    c.append(wk);

    // Today's sessions (filed under today's date), with fixes for mistakes
    const todays = ((worklog.days[today] || {}).sessions || []).slice();
    if (running()) todays.push({ start: running().start, end: null });
    section(c, 'Sessions today', btn('+ Add time you forgot', async () => {
      const m = prompt('How many minutes to add to today? (e.g. 45)');
      const minutes = parseInt(m, 10);
      if (!minutes || minutes < 1) return;
      worklog = await post('/api/worklog', { action: 'add', day: today, minutes });
      showWatch();
      render();
      toast('Added ' + hm(minutes) + ' to today');
    }));
    const box = el('div', 'sessions');
    if (!todays.length) box.append(el('div', 'vempty', 'No sessions yet today. Press ⏱ Start in the top bar when you begin work.'));
    for (const s of todays) {
      const end = s.end ? new Date(s.end) : null;
      const mins = s.minutes || ((end || new Date()) - new Date(s.start)) / 60000;
      const r = el('div', 'vrow');
      r.append(el('div', 'vtext', clock(new Date(s.start)) + ' – ' + (end ? clock(end) : 'now (running)') + (s.manual ? ' (added by hand)' : '')), el('span', 'when-at', hm(mins)));
      if (end) r.append(btn('Remove', async () => {
        if (!confirm('Remove this session (' + hm(mins) + ')?')) return;
        worklog = await post('/api/worklog', { action: 'delete', id: s.id, day: today, start: s.start });
        showWatch();
        render();
      }));
      box.append(r);
    }
    c.append(box);
  }

  // ---------------- Register the views and buttons ----------------
  const prevExtra = window.extraViews || (() => []);
  window.extraViews = () => [
    ['day', 'Day', dayView],
    ['incomplete', 'Incomplete', incompleteView],
    ['worktime', 'Work time', workView],
    ...prevExtra()
  ];
  const tools = document.querySelector('.list-tools');
  if (tools) {
    const dayBtn = el('button', '', 'Day view');
    dayBtn.title = 'Open today\'s Day view';
    dayBtn.addEventListener('click', () => { location.hash = '#/views/day/' + todayKey(); });
    const incBtn = el('button', '', 'Incomplete');
    incBtn.title = 'Every open task by the day you wrote it down';
    incBtn.addEventListener('click', () => { location.hash = '#/views/incomplete'; });
    tools.prepend(dayBtn, incBtn);
  }

  const prevAfterLoad = window.afterLoad;
  window.afterLoad = async function () {
    if (prevAfterLoad) await prevAfterLoad();
    await loadWorklog();
    checkForgotten();
  };
  // Refresh the stopwatch when you come back to the page (it may have been changed in another tab)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadWorklog(); });
})();
