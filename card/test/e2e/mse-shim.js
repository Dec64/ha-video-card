// Stand-in for Media Source Extensions in browsers without H.264/AAC (Playwright's Chromium).
// mpegts.js still fetches, demuxes and remuxes the real stream; the shim accepts the fMP4
// segments and simulates playback: buffered time grows with each media segment, currentTime
// follows wall-clock up to the buffered end. That is enough to test connections, stalls,
// reconnects and UI states. Real decoding is covered by the REAL_CODECS=1 run in Chrome.
//
// Knobs (set before the card loads):
//   window.__mseShimCodecs = ['avc1', 'mp4a']   codec prefixes this "device" supports
//   window.__mseShimBlockUnmuted = true          play() with sound rejects (autoplay policy)
//   window.__mseShimAppendMs = 600               each append takes this long (a slow device)
(() => {
  if (window.__mseShimInstalled) return;
  window.__mseShimInstalled = true;

  const codecs = () => window.__mseShimCodecs ?? ['avc1', 'mp4a'];
  const isTypeSupported = (mime) => {
    const m = /codecs\s*=\s*"?([^"]+)"?/i.exec(mime);
    if (!/^(video|audio)\/mp4/i.test(mime)) return false;
    if (!m) return true;
    return m[1]
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .every((c) => codecs().some((p) => c.startsWith(p)));
  };

  class FakeTimeRanges {
    constructor(r) {
      this._r = r;
    }
    get length() {
      return this._r.length;
    }
    start(i) {
      return this._r[i][0];
    }
    end(i) {
      return this._r[i][1];
    }
  }

  const boxType = (data) => {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data.buffer ?? data);
    return String.fromCharCode(u8[4], u8[5], u8[6], u8[7]);
  };

  class FakeSourceBuffer extends EventTarget {
    constructor(ms, mime) {
      super();
      this.ms = ms;
      this.mime = mime;
      this.updating = false;
      this.mode = 'segments';
      this.timestampOffset = 0;
      this.appendWindowStart = 0;
      this.appendWindowEnd = Infinity;
      this._start = 0;
      this._end = 0;
      this._firstMediaAt = 0;
    }
    get buffered() {
      return new FakeTimeRanges(this._end > this._start ? [[this._start, this._end]] : []);
    }
    _async(fn) {
      if (this.updating) throw new DOMException('SourceBuffer is updating', 'InvalidStateError');
      this.updating = true;
      this.dispatchEvent(new Event('updatestart'));
      setTimeout(() => {
        fn();
        this.updating = false;
        this.dispatchEvent(new Event('update'));
        this.dispatchEvent(new Event('updateend'));
        this.ms._onBufferChange();
      }, window.__mseShimAppendMs ?? 0);
    }
    appendBuffer(data) {
      if (this.ms.readyState !== 'open') throw new DOMException('closed', 'InvalidStateError');
      const type = boxType(data);
      this._async(() => {
        if (type !== 'moof') return; // init segment
        const now = performance.now();
        if (!this._firstMediaAt) this._firstMediaAt = now;
        // Live model: everything that has arrived plays in real time, plus a 1 s lead.
        this._end = Math.max(this._end, (now - this._firstMediaAt) / 1000 + 1);
      });
    }
    remove(start, end) {
      this._async(() => {
        if (start <= this._start) this._start = Math.max(this._start, Math.min(end, this._end));
      });
    }
    abort() {}
    changeType() {}
  }

  class FakeMediaSource extends EventTarget {
    static isTypeSupported(mime) {
      return isTypeSupported(mime);
    }
    constructor() {
      super();
      this.readyState = 'closed';
      this.duration = NaN;
      this.sourceBuffers = [];
      this.activeSourceBuffers = [];
      this._el = null;
    }
    addSourceBuffer(mime) {
      if (this.readyState !== 'open') throw new DOMException('not open', 'InvalidStateError');
      if (!isTypeSupported(mime))
        throw new DOMException(`Unsupported ${mime}`, 'NotSupportedError');
      const sb = new FakeSourceBuffer(this, mime);
      this.sourceBuffers.push(sb);
      this.activeSourceBuffers.push(sb);
      return sb;
    }
    removeSourceBuffer(sb) {
      this.sourceBuffers = this.sourceBuffers.filter((s) => s !== sb);
      this.activeSourceBuffers = this.activeSourceBuffers.filter((s) => s !== sb);
    }
    endOfStream() {
      this.readyState = 'ended';
      this.dispatchEvent(new Event('sourceended'));
    }
    setLiveSeekableRange() {}
    clearLiveSeekableRange() {}
    _bufferedEnd() {
      if (!this.sourceBuffers.length) return 0;
      return Math.min(...this.sourceBuffers.map((s) => s._end));
    }
    _bufferedStart() {
      if (!this.sourceBuffers.length) return 0;
      return Math.max(...this.sourceBuffers.map((s) => s._start));
    }
    _onBufferChange() {
      if (this._el) state(this._el)._onBuffer();
    }
  }

  window.MediaSource = FakeMediaSource;
  try {
    delete window.ManagedMediaSource;
  } catch {
    window.ManagedMediaSource = undefined;
  }

  const urls = new Map();
  let urlSeq = 0;
  const origCreate = URL.createObjectURL.bind(URL);
  const origRevoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (obj) => {
    if (obj instanceof FakeMediaSource) {
      const u = `blob:${location.origin}/fake-ms-${++urlSeq}`;
      urls.set(u, obj);
      return u;
    }
    return origCreate(obj);
  };
  URL.revokeObjectURL = (u) => (urls.has(u) ? urls.delete(u) : origRevoke(u));

  // ---- media element emulation, only while a FakeMediaSource is attached ----
  const proto = HTMLMediaElement.prototype;
  const orig = {};
  for (const k of [
    'src',
    'srcObject',
    'currentTime',
    'paused',
    'readyState',
    'buffered',
    'duration',
    'playbackRate',
  ]) {
    orig[k] = Object.getOwnPropertyDescriptor(proto, k);
  }
  let lastTap = -Infinity;
  for (const e of ['pointerdown', 'click', 'keydown']) {
    window.addEventListener(e, (ev) => ev.isTrusted && (lastTap = performance.now()), true);
  }
  const origPlay = proto.play;
  const origPause = proto.pause;
  const origLoad = proto.load;
  const origRemoveAttribute = Element.prototype.removeAttribute;
  const states = new WeakMap();
  const active = new Set();

  function state(el) {
    let s = states.get(el);
    if (!s) {
      s = {
        el,
        ms: null,
        src: '',
        base: 0,
        startedAt: 0,
        paused: true,
        rate: 1,
        waiting: false,
        metadata: false,
        frames: 0,
        now() {
          if (!this.ms) return 0;
          let t = this.base;
          if (!this.paused && this.startedAt)
            t += ((performance.now() - this.startedAt) / 1000) * this.rate;
          return Math.min(t, Math.max(this.base, this.ms._bufferedEnd()));
        },
        _onBuffer() {
          if (!this.ms) return;
          if (!this.metadata && this.ms._bufferedEnd() > 0) {
            this.metadata = true;
            fire(this.el, 'loadedmetadata');
            fire(this.el, 'loadeddata');
            fire(this.el, 'canplay');
          }
        },
      };
      states.set(el, s);
    }
    return s;
  }
  const fire = (el, name) => el.dispatchEvent(new Event(name));

  function attach(el, ms, url) {
    detach(el);
    const s = state(el);
    s.ms = ms;
    s.src = url;
    s.base = 0;
    s.startedAt = 0;
    s.metadata = false;
    s.waiting = false;
    ms._el = el;
    active.add(s);
    setTimeout(() => {
      if (s.ms !== ms) return;
      ms.readyState = 'open';
      ms.dispatchEvent(new Event('sourceopen'));
    }, 0);
  }
  function detach(el) {
    const s = states.get(el);
    if (!s || !s.ms) return false;
    const ms = s.ms;
    s.ms = null;
    s.src = '';
    s.paused = true;
    ms._el = null;
    active.delete(s);
    if (ms.readyState !== 'closed') {
      ms.readyState = 'closed';
      ms.dispatchEvent(new Event('sourceclose'));
    }
    return true;
  }
  const fake = (el) => !!states.get(el)?.ms;

  Object.defineProperty(proto, 'src', {
    configurable: true,
    get() {
      return fake(this) ? state(this).src : orig.src.get.call(this);
    },
    set(v) {
      const ms = urls.get(v);
      if (ms) {
        attach(this, ms, v);
        return;
      }
      detach(this);
      orig.src.set.call(this, v);
    },
  });
  Object.defineProperty(proto, 'srcObject', {
    configurable: true,
    get() {
      return fake(this) ? state(this).ms : orig.srcObject.get.call(this);
    },
    set(v) {
      if (v instanceof FakeMediaSource) {
        attach(this, v, '');
        return;
      }
      detach(this);
      orig.srcObject.set.call(this, v);
    },
  });
  Object.defineProperty(proto, 'currentTime', {
    configurable: true,
    get() {
      return fake(this) ? state(this).now() : orig.currentTime.get.call(this);
    },
    set(v) {
      if (!fake(this)) {
        orig.currentTime.set.call(this, v);
        return;
      }
      const s = state(this);
      s.base = v;
      if (!s.paused) s.startedAt = performance.now();
    },
  });
  Object.defineProperty(proto, 'paused', {
    configurable: true,
    get() {
      return fake(this) ? state(this).paused : orig.paused.get.call(this);
    },
  });
  Object.defineProperty(proto, 'playbackRate', {
    configurable: true,
    get() {
      return fake(this) ? state(this).rate : orig.playbackRate.get.call(this);
    },
    set(v) {
      if (!fake(this)) {
        orig.playbackRate.set.call(this, v);
        return;
      }
      const s = state(this);
      s.base = s.now();
      if (!s.paused) s.startedAt = performance.now();
      s.rate = v;
    },
  });
  Object.defineProperty(proto, 'readyState', {
    configurable: true,
    get() {
      if (!fake(this)) return orig.readyState.get.call(this);
      const s = state(this);
      const ahead = s.ms._bufferedEnd() - s.now();
      return ahead > 0.1 ? 4 : s.metadata ? 1 : 0;
    },
  });
  Object.defineProperty(proto, 'buffered', {
    configurable: true,
    get() {
      if (!fake(this)) return orig.buffered.get.call(this);
      const s = state(this);
      const end = s.ms._bufferedEnd();
      const start = s.ms._bufferedStart();
      return new FakeTimeRanges(end > start ? [[start, end]] : []);
    },
  });
  Object.defineProperty(proto, 'duration', {
    configurable: true,
    get() {
      return fake(this) ? Infinity : orig.duration.get.call(this);
    },
  });
  for (const [k, v] of [
    ['videoWidth', 320],
    ['videoHeight', 180],
  ]) {
    const d = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, k);
    Object.defineProperty(HTMLVideoElement.prototype, k, {
      configurable: true,
      get() {
        if (!fake(this)) return d.get.call(this);
        const s = state(this);
        const hasVideo = s.ms.sourceBuffers.some((b) => /^video\//i.test(b.mime) && b._end > 0);
        return hasVideo ? v : 0;
      },
    });
  }
  proto.play = function () {
    if (!fake(this)) return origPlay.call(this);
    // Like Chrome: unmuted autoplay needs a user gesture (a real tap in the last second).
    const gesture = performance.now() - lastTap < 1000;
    if (window.__mseShimBlockUnmuted && !this.muted && !gesture) {
      return Promise.reject(new DOMException('play() needs a user gesture', 'NotAllowedError'));
    }
    const s = state(this);
    if (s.paused) {
      s.base = s.now();
      s.paused = false;
      s.startedAt = performance.now();
      fire(this, 'play');
    }
    return Promise.resolve();
  };
  proto.pause = function () {
    if (!fake(this)) return origPause.call(this);
    const s = state(this);
    if (!s.paused) {
      s.base = s.now();
      s.paused = true;
      fire(this, 'pause');
    }
  };
  proto.load = function () {
    detach(this);
    return origLoad.call(this);
  };
  Element.prototype.removeAttribute = function (name) {
    if (this instanceof HTMLMediaElement && String(name).toLowerCase() === 'src') detach(this);
    return origRemoveAttribute.call(this, name);
  };
  const origQ = HTMLVideoElement.prototype.getVideoPlaybackQuality;
  HTMLVideoElement.prototype.getVideoPlaybackQuality = function () {
    if (!fake(this)) return origQ.call(this);
    return { totalVideoFrames: Math.floor(state(this).now() * 25), droppedVideoFrames: 0 };
  };

  // Playback clock: timeupdate / waiting / playing events.
  setInterval(() => {
    for (const s of active) {
      if (!s.ms || s.paused) continue;
      const ahead = s.ms._bufferedEnd() - s.now();
      if (ahead <= 0.05 && !s.waiting) {
        s.waiting = true;
        fire(s.el, 'waiting');
      } else if (ahead > 0.05 && (s.waiting || !s.playingFired)) {
        s.waiting = false;
        s.playingFired = true;
        fire(s.el, 'playing');
      }
      fire(s.el, 'timeupdate');
    }
  }, 250);

  window.__mseShim = { active: () => active.size };
})();
