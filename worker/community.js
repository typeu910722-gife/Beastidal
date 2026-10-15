// Cloudflare Worker for the online message stele (optional; see docs/COMMUNITY.md).
// Serves the static game from ./dist as before, plus a tiny JSON API backed by D1:
//   GET  /api/stele                 the latest 60 posts
//   POST /api/stele                 { t, w, who } — a phrase from comms.js's lists; 3 a day per device
//   POST /api/stele/:id/resonate    one resonance per device per post
// Posts use only the game's set phrases, so there is no free text to moderate. Posts with a banned word are shown
// as removed once they are a day old, exactly as in the offline game.
import { validPost, banned } from '../dist/comms.js';

const DAY_MS = 86400000;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
const resident = device => {
  let h = 0;
  for (const ch of device) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 'No.' + String(100 + (h % 9000)).padStart(4, '0');
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (req.method === 'OPTIONS')
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type, X-Device'
        }
      });
    const device = (req.headers.get('X-Device') || '').slice(0, 40);
    if (!/^[0-9a-f]{8,40}$/.test(device)) return json({ error: 'device' }, 400);
    const now = Date.now();
    if (url.pathname === '/api/stele' && req.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, who, t, w, at, (SELECT COUNT(*) FROM resonance r WHERE r.post = p.id) AS res FROM posts p ORDER BY at DESC LIMIT 60'
      ).all();
      return json({
        posts: results.map(p => ({
          id: 'o' + p.id,
          who: p.who,
          t: p.t,
          w: p.w,
          at: p.at,
          res: p.res,
          removed: banned(p.w) && now - p.at > DAY_MS
        }))
      });
    }
    if (url.pathname === '/api/stele' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (!validPost(body.t, body.w)) return json({ error: 'phrase' }, 400);
      const today = await env.DB.prepare('SELECT COUNT(*) AS n FROM posts WHERE device = ? AND at > ?')
        .bind(device, now - DAY_MS)
        .first();
      if (today.n >= 3) return json({ error: 'limit' }, 429);
      const r = await env.DB.prepare('INSERT INTO posts (device, who, t, w, at) VALUES (?, ?, ?, ?, ?)')
        .bind(device, resident(device), body.t, body.w, now)
        .run();
      return json({ ok: true, id: 'o' + r.meta.last_row_id });
    }
    const m = url.pathname.match(/^\/api\/stele\/o(\d+)\/resonate$/);
    if (m && req.method === 'POST') {
      await env.DB.prepare('INSERT OR IGNORE INTO resonance (post, device) VALUES (?, ?)')
        .bind(Number(m[1]), device)
        .run();
      return json({ ok: true });
    }
    return json({ error: 'not found' }, 404);
  }
};
