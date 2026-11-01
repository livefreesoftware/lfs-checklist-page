// The checklist's connection to Supabase (project lfs-sales, its own "checklist" schema only).
//
// The page was written against a small local server ("/api/list", "/api/save", ...). Instead of
// rewriting every call, this file answers those same requests from Supabase, so the rest of the
// code is unchanged. Only requests that start with /api/ are handled here; everything else goes
// to the network as normal.
//
// Everything is locked to Giles's signed-in account (row-level security in the checklist schema).
// Nothing here can read or write the sales app's tables: the client is pinned to the checklist schema.

(function () {
  const SUPABASE_URL = 'https://vwfofopeaouabvafhxvf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_vjRhsTu39RpkwXk4hwVNAg_E7wTSBJV';  // publishable key: safe in a page
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: 'checklist' },
    auth: { storageKey: 'lfs-checklist-auth' }
  });
  window.checklistDB = sb;

  const realFetch = window.fetch.bind(window);
  const ymd = d => new Date(d).toLocaleDateString('en-CA');                 // local date
  const hhmm = d => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const SETTING_DEFAULTS = { claude_enabled: false, confirm: true, daily_limit: 1, monthly_limit: 10, notifications: true, phone_access: false, auto_archive_days: 0 };
  const LOCKED = new Set(['claude_enabled', 'phone_access', 'pin']);       // not used in the online version

  // ---------------- Sign-in ----------------
  let sessionReady = null;
  function ensureSession() {
    if (!sessionReady) sessionReady = (async () => {
      const { data } = await sb.auth.getSession();
      if (data.session) return data.session;
      return showSignIn();
    })();
    return sessionReady;
  }
  function showSignIn() {
    return new Promise(resolve => {
      const layer = document.createElement('div');
      layer.className = 'overlay signin';
      layer.innerHTML = '<form class="modal" role="dialog" aria-modal="true" aria-labelledby="signinTitle" style="width:min(380px,100%)">'
        + '<h3 id="signinTitle">Sign in to your checklist</h3>'
        + '<p class="mnote" style="margin:0 0 12px">Use your Live Free Software account. Your list is saved in Supabase, so it\'s the same on every device you sign in on.</p>'
        + '<input type="email" name="email" autocomplete="username" placeholder="Email" required style="margin-bottom:8px">'
        + '<input type="password" name="password" autocomplete="current-password" placeholder="Password" required>'
        + '<p class="mnote signin-error" style="color:var(--danger)"></p>'
        + '<div class="mbtns"><button class="fbtn primary" type="submit">Sign in</button></div></form>';
      document.body.append(layer);
      const form = layer.querySelector('form');
      form.querySelectorAll('input').forEach(i => { i.style.cssText += ';width:100%;font:inherit;font-size:16px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text)'; });
      form.email.focus();
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const err = form.querySelector('.signin-error');
        err.textContent = 'Signing in…';
        const { data, error } = await sb.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
        if (error) { err.textContent = error.message === 'Invalid login credentials' ? 'That email and password don\'t match.' : error.message; return; }
        layer.remove();
        resolve(data.session);
      });
    });
  }
  window.checklistSignOut = async function () {
    await sb.auth.signOut();
    try { localStorage.removeItem('checklist'); localStorage.removeItem('checklist-base'); } catch {}
    location.reload();
  };

  // ---------------- Helpers ----------------
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  // Database errors come back as a normal reply; a network failure throws, like fetch, so the page's
  // offline catch-up still works
  function check(result) {
    if (result.error) {
      if (result.error.code || result.status >= 400) {
        const e = new Error(result.error.message);
        e.dbError = true;
        throw e;
      }
      throw new TypeError('Network error: ' + result.error.message);
    }
    return result.data;
  }
  async function getSettings() {
    const rows = check(await sb.from('settings').select('key, value'));
    const s = Object.assign({}, SETTING_DEFAULTS);
    for (const r of rows) if (!LOCKED.has(r.key)) s[r.key] = r.value;
    return s;
  }
  const setSetting = async (key, value) => check(await sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }));
  const delSetting = async key => check(await sb.from('settings').delete().eq('key', key));
  function backupLabel(b) {
    const t = new Date(b.taken_at);
    const h = b.hour;
    const h12 = (h % 12 || 12) + (h < 12 ? 'am' : 'pm');
    const wd = new Date(b.day + 'T12:00').toLocaleDateString('en-US', { weekday: 'short' });
    if (b.kind === 'before restore') return b.day + ' ' + hhmm(t).replace(':', '.') + ' before restore';
    if (b.kind === 'import') return b.day + ' ' + String(h).padStart(2, '0') + '.00 (' + wd + ' ' + h12 + ', imported)';
    return b.day + ' ' + String(h).padStart(2, '0') + '.00 (' + wd + ' ' + h12 + ')';
  }
  async function worklog() {
    const rows = check(await sb.from('work_sessions').select('id, day, started_at, ended_at, minutes, manual').order('started_at'));
    const days = {};
    for (const r of rows) {
      const d = days[r.day] = days[r.day] || { total_minutes: 0, sessions: [] };
      d.sessions.push({ id: r.id, start: r.started_at, end: r.ended_at, minutes: +r.minutes, manual: r.manual });
      d.total_minutes = Math.round((d.total_minutes + +r.minutes) * 10) / 10;
    }
    const run = check(await sb.from('settings').select('value').eq('key', 'stopwatch_running').maybeSingle());
    return { running: run ? run.value : null, days };
  }
  // A work session, split at local midnight so each part is filed under its own date
  async function addSpan(start, end, manual) {
    const rows = [];
    let a = new Date(start).getTime();
    const b = new Date(end).getTime();
    while (a < b) {
      const midnight = new Date(a);
      midnight.setHours(24, 0, 0, 0);
      const stop = Math.min(b, midnight.getTime());
      const minutes = Math.round((stop - a) / 6000) / 10;
      if (minutes > 0) rows.push({ day: ymd(a), started_at: new Date(a).toISOString(), ended_at: new Date(stop).toISOString(), minutes, manual: !!manual });
      a = stop;
    }
    if (rows.length) check(await sb.from('work_sessions').insert(rows));
  }

  // ---------------- The old local API, answered from Supabase ----------------
  async function route(path, opts = {}) {
    const url = new URL(path, 'https://checklist.local');  // only the path and query matter here
    const p = url.pathname;
    const q = url.searchParams;
    const method = (opts.method || 'GET').toUpperCase();
    const body = opts.body ? JSON.parse(opts.body) : {};
    await ensureSession();

    if (p.startsWith('/api/claude/')) return reply({ error: 'Claude features are turned off in this version of the checklist.' }, 403);
    if (p === '/api/title') return reply({ title: '' });

    if (p === '/api/version') {
      const row = check(await sb.from('list').select('version').eq('id', 'main').maybeSingle());
      return reply({ version: row ? row.version : 0 });
    }
    if (p === '/api/list') {
      const row = check(await sb.from('list').select('doc, version').eq('id', 'main').maybeSingle());
      return reply({ data: row ? row.doc : [], version: row ? row.version : 0 });
    }
    if (p === '/api/save') {
      const out = check(await sb.rpc('save_list', { new_doc: body.data, base_version: body.base || null }));
      if (out.conflict) return reply({ conflict: true, data: out.doc, version: out.version }, 409);
      return reply(out);
    }

    if (p === '/api/settings') {
      if (method === 'POST') for (const [k, v] of Object.entries(body)) if (k in SETTING_DEFAULTS && !LOCKED.has(k)) await setSetting(k, v);
      const s = await getSettings();
      return reply(Object.assign(s, { pin_set: false, has_key: false, lan_url: '', usage: { today: 0, month: 0, calls_today: 0, recent: [] } }));
    }

    if (p === '/api/done') {
      check(await sb.from('done_log').insert({ text: (body.text || '').trim(), tags: body.tags || [], day: ymd(Date.now()) }));
      return reply({ ok: true });
    }
    if (p === '/api/done-log') {
      const since = ymd(Date.now() - 420 * 864e5);
      const rows = check(await sb.from('done_log').select('day, done_at, text, tags').gte('day', since).order('done_at').limit(10000));
      const out = {};
      for (const r of rows) (out[r.day] = out[r.day] || []).push({ time: hhmm(r.done_at), text: r.text, tags: r.tags });
      return reply(out);
    }

    if (p === '/api/outreach') {
      if (method === 'POST') {
        const day = ymd(Date.now());
        const cur = check(await sb.from('outreach').select('*').eq('day', day).maybeSingle()) || { day, emails: 0, texts: 0, visits: 0 };
        if (['emails', 'texts', 'visits'].includes(body.kind)) cur[body.kind] = Math.max(0, cur[body.kind] + (+body.by || 1));
        check(await sb.from('outreach').upsert(cur));
      }
      const rows = check(await sb.from('outreach').select('*').order('day', { ascending: false }).limit(400));
      return reply(Object.fromEntries(rows.map(r => [r.day, { emails: r.emails, texts: r.texts, visits: r.visits }])));
    }

    if (p === '/api/delete') {
      check(await sb.from('deleted_items').insert({ item: body.item, path: (body.path || []).filter(Boolean) }));
      return reply({ ok: true });
    }
    if (p === '/api/deleted') {
      const rows = check(await sb.from('deleted_items').select('id, deleted_at, path, item').is('restored_at', null).order('deleted_at', { ascending: false }).limit(400));
      // "file" keeps the shape the page expects; it starts with the date and time like the old file names
      return reply(rows.map(r => ({ file: String(r.id), when: r.deleted_at, item: r.item, path: r.path })));
    }
    if (p === '/api/restore-deleted') {
      const rows = check(await sb.from('deleted_items').update({ restored_at: new Date().toISOString() }).eq('id', +body.file).is('restored_at', null).select('item, path'));
      return rows.length ? reply(rows[0]) : reply({ error: 'That deleted item wasn\'t found.' }, 404);
    }

    if (p === '/api/archive') {
      if (method === 'POST') {
        check(await sb.from('archive').insert((body.items || []).map(x => ({ item: x.item, path: (x.path || []).filter(Boolean) }))));
        return reply({ ok: true });
      }
      const rows = check(await sb.from('archive').select('archived_at, path, item').is('restored_at', null).order('archived_at', { ascending: false }).limit(400));
      return reply(rows.map(r => ({ time: ymd(r.archived_at) + ' ' + hhmm(r.archived_at), path: r.path, item: r.item })));
    }
    if (p === '/api/unarchive') {
      const rows = check(await sb.from('archive').select('id, path, item').is('restored_at', null).eq('item->>id', body.id).limit(1));
      if (!rows.length) return reply({ error: 'Not in the archive.' }, 404);
      check(await sb.from('archive').update({ restored_at: new Date().toISOString() }).eq('id', rows[0].id));
      return reply({ item: rows[0].item, path: rows[0].path });
    }

    if (p === '/api/backups') {
      const rows = check(await sb.from('backups').select('id, taken_at, day, hour, kind, size').order('day', { ascending: false }).order('hour', { ascending: false }).order('taken_at', { ascending: false }).limit(300));
      return reply(rows.map(b => ({ name: String(b.id), label: backupLabel(b), day: b.day, size: b.size, time: ymd(b.taken_at) + ' ' + hhmm(b.taken_at), mtime: +new Date(b.taken_at) })));
    }
    if (p === '/api/backup') {
      const row = check(await sb.from('backups').select('doc').eq('id', +q.get('name')).maybeSingle());
      return reply(row ? row.doc : null);
    }
    if (p === '/api/backup-snapshot') {
      const now = new Date();
      check(await sb.from('backups').insert({ day: ymd(now), hour: now.getHours(), kind: 'before restore', doc: body.data || [] }));
      return reply({ ok: true });
    }

    if (p === '/api/search') {
      const needle = (q.get('q') || '').toLowerCase().trim();
      if (needle.length < 2) return reply({ deleted: [], journal: [], archive: [] });
      const [del, arc, done] = await Promise.all([
        sb.from('deleted_items').select('id, path, item').is('restored_at', null).order('deleted_at', { ascending: false }).limit(400),
        sb.from('archive').select('archived_at, item').is('restored_at', null).order('archived_at', { ascending: false }).limit(400),
        sb.from('done_log').select('done_at, text').order('done_at', { ascending: false }).limit(3000)
      ]).then(rs => rs.map(check));
      const hit = x => JSON.stringify(x).toLowerCase().includes(needle);
      return reply({
        deleted: del.filter(d => hit(d.item)).slice(0, 30).map(d => ({ file: String(d.id), text: d.item.text || '', path: d.path })),
        archive: arc.filter(a => hit(a.item)).slice(0, 30).map(a => ({ id: a.item.id, text: a.item.text || '', time: ymd(a.archived_at) + ' ' + hhmm(a.archived_at) })),
        journal: done.filter(d => d.text.toLowerCase().includes(needle)).slice(0, 30).map(d => ymd(d.done_at) + ' ' + hhmm(d.done_at) + ': ' + d.text)
      });
    }

    if (p === '/api/worklog') {
      if (method === 'POST') {
        const log = await worklog();
        if (body.action === 'start' && !log.running) {
          await setSetting('stopwatch_running', { start: new Date().toISOString() });
        } else if (body.action === 'stop' && log.running) {
          const end = body.end ? new Date(body.end) : new Date();      // body.end may be a local time like 2026-10-30T19:14:00
          if (end > new Date(log.running.start)) await addSpan(log.running.start, end, false);
          await delSetting('stopwatch_running');
        } else if (body.action === 'add') {
          const minutes = Math.max(1, Math.min(1440, parseInt(body.minutes, 10) || 0));
          const end = new Date((body.day || ymd(Date.now())) + 'T17:00:00');
          await addSpan(new Date(end - minutes * 60000), end, true);
        } else if (body.action === 'delete') {
          let qb = sb.from('work_sessions').delete();
          qb = body.id ? qb.eq('id', body.id) : qb.eq('day', body.day).eq('started_at', body.start);
          check(await qb);
        }
      }
      return reply(await worklog());
    }

    return reply({ error: 'not found' }, 404);
  }

  window.fetch = function (input, opts) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.startsWith('/api/')) {
      return route(url, opts).catch(e => {
        if (e.dbError) return reply({ error: e.message }, 400);
        throw e;
      });
    }
    return realFetch(input, opts);
  };
})();
