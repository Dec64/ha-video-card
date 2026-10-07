/*
 * stream-probe-card: Phase 0 test card for ha-stream-card.
 * Not the real card. It plays a Dispatcharr TS stream with mpegts.js and logs
 * every lifecycle signal (connect, disconnect, visibility, pop-up hash, Fully
 * events) so we can see which ones fire when a Bubble pop-up closes, the screen
 * turns off, or a cast session ends, and whether Dispatcharr releases the stream.
 *
 * Card config:
 *   type: custom:stream-probe-card
 *   target: probe            # name used by buttons (fire-dom-event)
 *   url: https://...         # optional default stream (needed for HA Cast)
 *   autoplay: true           # start when the card appears (default true)
 *   teardown: all            # all | disconnect-only | none (baseline to see leaks)
 *   show_log: true
 *
 * Button (any card with tap_action):
 *   tap_action:
 *     action: fire-dom-event
 *     stream_probe:
 *       target: probe
 *       url: https://.../proxy/ts/stream/<uuid>
 *       open: "#stream-test"   # optional: opens this Bubble pop-up
 */
(() => {
  const VERSION = '0.1.0';
  const MPEGTS_SRC = 'https://cdn.jsdelivr.net/npm/mpegts.js@1.8.0/dist/mpegts.js';
  const LOG_KEY = 'streamProbe.log';
  const MAX_LINES = 400;

  // ---------- shared, page-level state (survives the card being removed) ----------
  const G = (window.__streamProbe = window.__streamProbe || {
    pending: {},          // target -> { url, at }
    instances: new Set(),
    seq: 0,
    lines: [],
  });
  try { G.lines = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { G.lines = G.lines || []; }

  function log(msg) {
    const line = `${new Date().toISOString().slice(11, 23)} ${msg}`;
    G.lines.push(line);
    if (G.lines.length > MAX_LINES) G.lines.splice(0, G.lines.length - MAX_LINES);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(G.lines)); } catch {}
    console.info('[stream-probe]', msg);
    G.instances.forEach((c) => c._renderLog());
  }

  function loadMpegts() {
    if (window.mpegts) return Promise.resolve(window.mpegts);
    if (!G.mpegtsPromise) {
      G.mpegtsPromise = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = MPEGTS_SRC;
        s.onload = () => res(window.mpegts);
        s.onerror = () => { G.mpegtsPromise = null; rej(new Error('could not load mpegts.js')); };
        document.head.appendChild(s);
      });
    }
    return G.mpegtsPromise;
  }

  function navigate(path) {
    history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
  }

  // ---------- page-level listeners (registered once, before any card exists) ----------
  if (!G.listening) {
    G.listening = true;
    window.addEventListener('ll-custom', (ev) => {
      const req = ev.detail && ev.detail.stream_probe;
      if (!req) return;
      const target = req.target || 'probe';
      G.pending[target] = { url: req.url, at: Date.now() };
      const live = [...G.instances].filter((c) => c._target === target && c.isConnected);
      log(`button: target=${target} url=${req.url ? req.url.slice(-12) : '(none)'} mounted_cards=${live.length} open=${req.open || '-'}`);
      live.forEach((c) => c._takePending('button'));
      if (req.open) navigate(req.open);
    });
    window.addEventListener('location-changed', () => log(`location-changed → ${location.pathname}${location.hash}`));
    window.addEventListener('hashchange', () => log(`hashchange → ${location.hash || '(none)'}`));
    document.addEventListener('visibilitychange', () => {
      log(`page visibility: ${document.visibilityState}`);
      G.instances.forEach((c) => c._onSignal('visibility', document.visibilityState === 'visible'));
    });
    window.addEventListener('pagehide', () => { log('pagehide'); G.instances.forEach((c) => c._onSignal('pagehide', false)); });
    window.addEventListener('pageshow', () => log('pageshow'));
    if (window.fully && typeof window.fully.bind === 'function') {
      const map = { screenOff: false, screenOn: true, onScreensaverStart: false, onScreensaverStop: true };
      Object.keys(map).forEach((evt) => {
        try { window.fully.bind(evt, `window.dispatchEvent(new CustomEvent('stream-probe-fully',{detail:'${evt}'}))`); } catch (e) { log(`fully.bind(${evt}) failed: ${e.message}`); }
      });
      window.addEventListener('stream-probe-fully', (e) => {
        log(`Fully event: ${e.detail}`);
        G.instances.forEach((c) => c._onSignal(`fully:${e.detail}`, map[e.detail]));
      });
      log('Fully Kiosk JS API found; screen/screensaver events bound');
    }
    log(`stream-probe-card ${VERSION} loaded (${navigator.userAgent.slice(0, 80)})`);
  }

  // ---------- the card ----------
  class StreamProbeCard extends HTMLElement {
    constructor() {
      super();
      this._id = ++G.seq;
      this._player = null;
      this._url = null;
      this._playing = false;
      this.attachShadow({ mode: 'open' });
      log(`#${this._id} constructed`);
    }

    setConfig(config) {
      this._config = { autoplay: true, teardown: 'all', show_log: true, target: 'probe', ...config };
      this._target = this._config.target;
      this._build();
    }

    set hass(_h) { /* deliberately ignored: HA pushes this on every state change */ }

    getCardSize() { return 8; }

    get _isEditor() {
      // Lovelace editor previews must never open a stream
      let n = this;
      while (n) {
        if (n.localName === 'hui-card-preview' || n.localName === 'hui-card-element-editor') return true;
        n = n.parentNode || n.host;
      }
      return false;
    }

    _build() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; }
          ha-card { padding:12px; }
          video { width:100%; aspect-ratio:16/9; background:#000; border-radius:8px; display:block; }
          .bar { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0; align-items:center; }
          button { padding:8px 12px; border-radius:8px; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--primary-text-color); font-size:14px; }
          .state { font:12px monospace; color:var(--secondary-text-color); }
          pre { font:11px/1.3 monospace; max-height:220px; overflow:auto; white-space:pre-wrap; margin:0; padding:8px; border-radius:8px; background:var(--secondary-background-color); color:var(--primary-text-color); }
        </style>
        <ha-card>
          <video playsinline muted></video>
          <div class="bar">
            <button id="play">Play</button><button id="stop">Stop</button><button id="unmute">Unmute</button>
            <button id="clear">Clear log</button>
            <span class="state" id="state">idle</span>
          </div>
          ${this._config.show_log ? '<pre id="log"></pre>' : ''}
        </ha-card>`;
      this._video = this.shadowRoot.querySelector('video');
      this._video.disableRemotePlayback = true;
      const $ = (id) => this.shadowRoot.getElementById(id);
      $('play').onclick = () => this._start('Play button');
      $('stop').onclick = () => this._stop('Stop button');
      $('unmute').onclick = () => { this._video.muted = false; this._video.play().catch(() => {}); };
      $('clear').onclick = () => { G.lines = []; try { localStorage.removeItem(LOG_KEY); } catch {} G.instances.forEach((c) => c._renderLog()); };
      this._video.addEventListener('playing', () => { this._playing = true; this._setState('playing'); log(`#${this._id} first frame / playing (muted=${this._video.muted})`); });
      this._video.addEventListener('waiting', () => log(`#${this._id} buffering`));
      this._video.addEventListener('error', () => log(`#${this._id} video error ${this._video.error && this._video.error.code}`));
      this._renderLog();
    }

    connectedCallback() {
      G.instances.add(this);
      log(`#${this._id} connected (target=${this._target}${this._isEditor ? ', editor preview' : ''})`);
      if (!this._io) {
        this._io = new IntersectionObserver((entries) => {
          const e = entries[entries.length - 1];
          log(`#${this._id} IntersectionObserver: ${e.isIntersecting ? 'visible' : 'hidden'} (ratio ${e.intersectionRatio.toFixed(2)})`);
          this._onSignal('intersection', e.isIntersecting);
        }, { threshold: [0, 0.05] });
      }
      this._io.observe(this);
      if (!this._takePending('connect') && this._config && this._config.url && this._config.autoplay) this._start('connect (config url)');
    }

    disconnectedCallback() {
      log(`#${this._id} disconnected`);
      if (this._io) this._io.disconnect();
      G.instances.delete(this);
      if (this._config.teardown !== 'none') this._stop('disconnected');
    }

    _takePending(why) {
      const p = G.pending[this._target];
      if (!p) return false;
      delete G.pending[this._target];
      log(`#${this._id} picked up pending request (${why}, waited ${Date.now() - p.at} ms)`);
      this._url = p.url;
      this._start(why);
      return true;
    }

    _onSignal(name, visible) {
      if (visible === undefined) return;
      if (!visible && this._config.teardown === 'all' && this._player) this._stop(name);
      if (visible && !this._player && !this._starting && this._url && this._config.autoplay && this.isConnected && document.visibilityState === 'visible') this._start(`${name} (resume)`);
    }

    async _start(reason) {
      if (this._isEditor) { log(`#${this._id} editor preview: not starting`); return; }
      const url = this._url || this._config.url;
      if (!url) { log(`#${this._id} no url to play`); return; }
      this._url = url;
      if (this._starting) { log(`#${this._id} already starting, ignoring (${reason})`); return; }
      this._starting = true;
      if (this._player) await this._stop('restart');
      this._setState('loading');
      log(`#${this._id} start (${reason}) …${url.slice(-12)}`);
      try {
        const m = await loadMpegts();
        if (!this.isConnected) { log(`#${this._id} removed while loading; not starting`); this._setState('stopped'); return; }
        if (!m.isSupported()) { log(`#${this._id} mpegts.js unsupported on this device (no MSE/MMS)`); this._setState('unsupported'); return; }
        const p = m.createPlayer({ type: 'mpegts', isLive: true, url }, { enableWorker: true, lazyLoad: false, liveBufferLatencyChasing: true, autoCleanupSourceBuffer: true });
        p.on(m.Events.MEDIA_INFO, (mi) => log(`#${this._id} media: video=${mi.videoCodec} audio=${mi.audioCodec || 'none'} ${mi.width}x${mi.height}`));
        p.on(m.Events.ERROR, (t, d) => { log(`#${this._id} mpegts error ${t}/${d}`); this._setState('error'); });
        p.attachMediaElement(this._video);
        p.load();
        this._player = p;
        this._starting = false;
        this._autoplay(p);
      } catch (e) {
        log(`#${this._id} start failed: ${e.message}`);
        this._setState('error');
      } finally {
        this._starting = false;
      }
    }

    async _autoplay(p) {
      this._video.muted = false;
      try { await this._video.play(); log(`#${this._id} play() with sound OK`); }
      catch (e) {
        if (this._player !== p) return; // stopped meanwhile
        log(`#${this._id} play() with sound refused (${e.name}), trying muted`);
        this._video.muted = true;
        await this._video.play().catch((e2) => { if (this._player === p) log(`#${this._id} muted play failed: ${e2.name}`); });
      }
    }

    async _stop(reason) {
      const p = this._player;
      if (!p) return;
      this._player = null;
      this._playing = false;
      try { p.pause(); p.unload(); p.detachMediaElement(); p.destroy(); } catch (e) { log(`#${this._id} teardown error ${e.message}`); }
      this._video.removeAttribute('src');
      this._video.load();
      this._setState('stopped');
      log(`#${this._id} STOPPED + released (${reason})`);
    }

    _setState(s) { const el = this.shadowRoot.getElementById('state'); if (el) el.textContent = `#${this._id} ${s}`; }

    _renderLog() {
      const el = this.shadowRoot && this.shadowRoot.getElementById('log');
      if (!el) return;
      el.textContent = G.lines.slice(-120).join('\n');
      el.scrollTop = el.scrollHeight;
    }
  }

  if (!customElements.get('stream-probe-card')) customElements.define('stream-probe-card', StreamProbeCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'stream-probe-card', name: 'Stream probe (test)', description: 'Phase 0 lifecycle and playback probe' });
})();
