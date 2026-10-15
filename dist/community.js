// 0.48: the optional online stele. With CONFIG.communityUrl set (the Cloudflare Worker in worker/community.js),
// real players' posts appear on the stele and yours are shared. Off by default; any failure falls back silently to
// the simulated residents (comms.js), so offline and download builds play the same.
import { validPost } from './comms.js?v=0.61.5';

const DEVICE_KEY = 'beastidal-device-v1';
let sessionId = null;
function deviceId(storage) {
  try {
    let id = storage.getItem(DEVICE_KEY);
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
      storage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    // no storage (private mode): a random id for this session; the server only accepts hex ids
    return (sessionId ??= Array.from(crypto.getRandomValues(new Uint8Array(12)), b =>
      b.toString(16).padStart(2, '0')
    ).join(''));
  }
}
export class Community {
  constructor({ url = '', fetchImpl = (...a) => fetch(...a), storage = globalThis.localStorage, timeout = 6000 } = {}) {
    this.url = url.replace(/\/$/, '');
    this.fetch = fetchImpl;
    this.storage = storage;
    this.timeout = timeout;
  }
  get enabled() {
    return !!this.url;
  }
  async call(path, opts = {}) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null,
      timer = ctl && setTimeout(() => ctl.abort(), this.timeout);
    try {
      const res = await this.fetch(this.url + path, {
        ...opts,
        signal: ctl?.signal,
        headers: { 'Content-Type': 'application/json', 'X-Device': deviceId(this.storage), ...(opts.headers || {}) }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  // Recent posts by other players: [{ id, who, t, w, day, res, removed }] (only known phrases are kept).
  async list() {
    if (!this.enabled) return [];
    const data = await this.call('/api/stele');
    return (data.posts || []).filter(p => validPost(p.t, p.w) || p.t === 'metoo');
  }
  async post(t, w, who) {
    if (!this.enabled || !validPost(t, w)) return null;
    return this.call('/api/stele', { method: 'POST', body: JSON.stringify({ t, w, who }) });
  }
  async resonate(id) {
    if (!this.enabled) return null;
    return this.call('/api/stele/' + encodeURIComponent(id) + '/resonate', { method: 'POST' });
  }
}
