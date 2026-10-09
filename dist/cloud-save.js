// Optional Google sign-in + Google Drive (appDataFolder) save sync.
// Nothing here loads or contacts Google until the player chooses to sign in, so guest play stays fully offline.
// Token sources, in order:
//  1. window.BeastidalNative.googleAuth — supplied by a native shell (Steam/Electron, Android) that runs the
//     OAuth flow in the system browser, because Google blocks sign-in inside embedded webviews.
//  2. Google Identity Services token client in the browser (web build, PWA, Trusted Web Activity).
const ACCOUNT_KEY = 'beastidal-account-v1';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE = 'https://www.googleapis.com/drive/v3/files',
  UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export class CloudError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

let gisPromise = null;
function loadGis() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisPromise = null;
      reject(new CloudError('無法連線到 Google，請確認網路。', 'offline'));
    };
    document.head.append(s);
  });
  return gisPromise;
}

export class CloudSave {
  constructor({
    config,
    storage = globalThis.localStorage,
    fetchImpl = (...a) => fetch(...a),
    native = () => globalThis.BeastidalNative?.googleAuth
  }) {
    this.config = config;
    this.storage = storage;
    this.fetch = fetchImpl;
    this.native = native;
    this.token = null;
    this.expires = 0;
    this.fileId = null;
    this.queue = Promise.resolve();
    try {
      this.account = JSON.parse(storage.getItem(ACCOUNT_KEY) || 'null');
    } catch {
      this.account = null;
    }
  }
  // Each save slot is its own Drive file; slot 1 keeps the original file name.
  fileName() {
    const slot = this.slot || 1;
    return slot === 1 ? this.config.driveFileName : this.config.driveFileName.replace(/\.json$/, `-slot${slot}.json`);
  }
  setSlot(slot) {
    if (slot !== this.slot) this.fileId = null;
    this.slot = slot;
  }
  get configured() {
    return !!(this.native() || this.config.googleClientId);
  }
  get signedIn() {
    return !!this.account;
  }
  get connected() {
    return !!this.token && Date.now() < this.expires;
  }
  scopes() {
    return [this.config.driveScope, 'openid', 'email', 'profile'].join(' ');
  }

  async requestToken(interactive) {
    const native = this.native();
    if (native) {
      const r = await native.getToken({
        interactive,
        scopes: this.scopes().split(' '),
        loginHint: this.account?.email
      });
      if (!r?.accessToken) throw new CloudError('Google 登入已取消。', 'cancelled');
      return { token: r.accessToken, expiresIn: r.expiresIn || 3600 };
    }
    if (!this.config.googleClientId) throw new CloudError('此版本尚未設定 Google 登入。', 'unconfigured');
    await loadGis();
    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: this.config.googleClientId,
        scope: this.scopes(),
        login_hint: this.account?.email,
        callback: r =>
          r.error
            ? reject(
                new CloudError(
                  r.error === 'access_denied'
                    ? '你拒絕了 Google Drive 權限，雲端存檔未啟用。'
                    : 'Google 登入失敗：' + r.error,
                  r.error
                )
              )
            : resolve({ token: r.access_token, expiresIn: +r.expires_in || 3600 }),
        error_callback: e =>
          reject(
            new CloudError(
              e?.type === 'popup_closed'
                ? 'Google 登入視窗已關閉。'
                : e?.type === 'popup_failed_to_open'
                  ? '瀏覽器擋下了登入視窗，請允許彈出視窗。'
                  : 'Google 登入失敗。',
              e?.type || 'error'
            )
          )
      });
      client.requestAccessToken({ prompt: interactive && !this.account ? 'select_account' : '' });
    });
  }
  async ensureToken(interactive = false) {
    if (this.connected) return this.token;
    const r = await this.requestToken(interactive);
    this.token = r.token;
    this.expires = Date.now() + (r.expiresIn - 60) * 1000;
    return this.token;
  }

  // Signs in (or reconnects a remembered account) and returns the profile.
  async signIn({ interactive = true } = {}) {
    await this.ensureToken(interactive);
    const info = await this.api('https://www.googleapis.com/oauth2/v3/userinfo');
    if (this.account && this.account.id !== info.sub) this.fileId = null;
    this.account = { id: info.sub, email: info.email || '', name: info.name || info.email || 'Google 帳號' };
    this.storage.setItem(ACCOUNT_KEY, JSON.stringify(this.account));
    return this.account;
  }
  async signOut() {
    const token = this.token;
    this.token = null;
    this.expires = 0;
    this.fileId = null;
    this.account = null;
    this.storage.removeItem(ACCOUNT_KEY);
    try {
      const native = this.native();
      if (native?.signOut) await native.signOut();
      else if (token && globalThis.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
    } catch {}
  }

  async api(url, opts = {}, retry = true) {
    const token = await this.ensureToken(false);
    let res;
    try {
      res = await this.fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + token } });
    } catch {
      throw new CloudError('無法連線到 Google Drive，進度仍保存在此裝置。', 'offline');
    }
    if (res.status === 401 && retry) {
      this.token = null;
      return this.api(url, opts, false);
    }
    if (!res.ok) {
      const code = res.status === 403 ? 'forbidden' : res.status === 404 ? 'missing' : 'http';
      throw new CloudError(`Google Drive 回應錯誤（${res.status}）。`, code);
    }
    return (res.headers.get?.('content-type') || '').includes('json') ? res.json() : res.text();
  }

  async remoteInfo() {
    const q = encodeURIComponent(`name='${this.fileName()}' and trashed=false`);
    const r = await this.api(
      `${DRIVE}?spaces=appDataFolder&q=${q}&orderBy=modifiedTime desc&fields=files(id,modifiedTime,appProperties)`
    );
    const f = r.files?.[0];
    if (!f) {
      this.fileId = null;
      return null;
    }
    this.fileId = f.id;
    return { id: f.id, savedAt: +f.appProperties?.savedAt || Date.parse(f.modifiedTime) || 0 };
  }
  async download() {
    const info = await this.remoteInfo();
    if (!info) return null;
    const text = await this.api(`${DRIVE}/${info.id}?alt=media`);
    const data = typeof text === 'string' ? JSON.parse(text) : text;
    if (data?.format !== 'beastidal-save' || !data.state) throw new CloudError('雲端存檔格式無法辨識。', 'corrupt');
    return { state: data.state, savedAt: +data.savedAt || info.savedAt };
  }
  // Uploads are serialised so two autosaves never race each other.
  upload(state, savedAt) {
    const run = () => this.uploadNow(state, savedAt);
    this.queue = this.queue.then(run, run);
    return this.queue;
  }
  async uploadNow(state, savedAt) {
    if (this.fileId === null) await this.remoteInfo();
    const boundary = 'beastidal' + Math.random().toString(36).slice(2);
    const meta = {
      name: this.fileName(),
      mimeType: 'application/json',
      appProperties: { savedAt: String(savedAt) }
    };
    if (!this.fileId) meta.parents = ['appDataFolder'];
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ format: 'beastidal-save', version: 1, savedAt, state })}\r\n--${boundary}--`;
    const url = this.fileId
      ? `${UPLOAD}/${this.fileId}?uploadType=multipart&fields=id`
      : `${UPLOAD}?uploadType=multipart&fields=id`;
    let r;
    try {
      r = await this.api(url, {
        method: this.fileId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
        body
      });
    } catch (e) {
      if (e.code === 'missing') {
        this.fileId = null;
        return this.uploadNow(state, savedAt);
      }
      throw e;
    }
    this.fileId = r.id;
    return savedAt;
  }
}
