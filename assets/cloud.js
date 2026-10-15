/* Lexicon cloud: accounts and progress sync through Supabase (Auth + REST), no libraries.
   Turned on when assets/config.js holds a Supabase URL and public (anon) key. */
(function () {
  'use strict';
  const C = window.LEXICON_CONFIG || {};
  const URL_ = String(C.supabaseUrl || '').replace(/\/+$/, '');
  const KEY = C.supabaseAnonKey || '';
  const SKEY = 'lexicon.session';
  let ses = null;
  try { ses = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { ses = null; }
  const keep = s => { ses = s; try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch (e) { /* */ } };

  class CloudError extends Error { constructor(msg, status, code) { super(msg); this.status = status; this.code = code; } }
  const human = (j, status) => {
    const m = (j && (j.msg || j.message || j.error_description || j.error)) || ('HTTP ' + status);
    const code = j && (j.error_code || j.code);
    if (/invalid login credentials/i.test(m)) return 'Wrong email or password.';
    if (/token has expired|otp.*(expired|invalid)|invalid.*token/i.test(m)) return 'That code is wrong or has expired. Ask for a new one.';
    if (/signups not allowed|user not found/i.test(m)) return 'There is no account with this email yet. Ask your teacher to add you.';
    if (/rate limit|too many|security purposes/i.test(m)) return 'Too many attempts. Wait a minute and try again.';
    if (/password should be at least|weak password/i.test(m) || code === 'weak_password') return 'Choose a longer password: at least 8 characters.';
    if (/email address not authorized/i.test(m)) return 'The site can’t send email to this address yet.';
    if (/same_password|should be different/i.test(m)) return 'That is already your password.';
    return m;
  };

  async function call(path, opts = {}, auth = true) {
    const headers = Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, opts.headers || {});
    if (auth && ses && ses.access_token) headers.Authorization = 'Bearer ' + ses.access_token;
    let r;
    try { r = await fetch(URL_ + path, Object.assign({}, opts, { headers })); }
    catch (e) { throw new CloudError('No connection to the server. Check your internet and try again.', 0, 'offline'); }
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = txt; }
    if (!r.ok) throw new CloudError(human(j, r.status), r.status, j && (j.error_code || j.code));
    return j;
  }
  const withSession = j => { if (j && j.access_token) keep({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, user: j.user }); return ses; };

  async function fresh() {
    if (!ses) return null;
    if (Date.now() < ses.expires_at - 60000) return ses;
    try { return withSession(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: ses.refresh_token }) }, false)); }
    catch (e) { if (e.status >= 400 && e.status < 500) keep(null); throw e; }
  }
  const authed = async (path, opts) => { await fresh(); try { return await call(path, opts); } catch (e) { if (e.status === 401) { ses && (ses.expires_at = 0); await fresh(); return call(path, opts); } throw e; } };

  const Cloud = {
    enabled: !!(URL_ && KEY),
    get user() { return ses && ses.user; },
    async session() { try { return await fresh(); } catch (e) { return e.code === 'offline' ? ses : null; } },
    async signIn(email, password) { return withSession(await call('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password }) }, false)); },
    /* 6-digit code by email; create=false refuses unknown emails */
    async sendCode(email, create) { await call('/auth/v1/otp', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), create_user: !!create }) }, false); },
    async verifyCode(email, token) { return withSession(await call('/auth/v1/verify', { method: 'POST', body: JSON.stringify({ type: 'email', email: email.trim().toLowerCase(), token: String(token).replace(/\D/g, '') }) }, false)); },
    async setPassword(password) { const u = await authed('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) }); if (ses) { ses.user = u; keep(ses); } return u; },
    async signOut() { try { await call('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* signed out locally anyway */ } keep(null); },
    async profile() { const r = await authed('/rest/v1/profiles?select=*&id=eq.' + ses.user.id); return r && r[0]; },
    async rename(name) { await authed('/rest/v1/profiles?id=eq.' + ses.user.id, { method: 'PATCH', body: JSON.stringify({ name }) }); },
    async bookCode() { return authed('/rest/v1/rpc/get_book_code', { method: 'POST', body: '{}' }); },
    async pull() { const r = await authed('/rest/v1/progress?select=data,updated_at&user_id=eq.' + ses.user.id); return r && r[0] ? r[0] : null; },
    async push(data) {
      await authed('/rest/v1/progress?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: ses.user.id, data, updated_at: new Date().toISOString() }) });
    },
    CloudError,
  };
  window.Cloud = Cloud;
})();
