// Minimal stand-ins for the parts of Home Assistant and Bubble Card the card talks to.
(() => {
  const popups = [];

  /** A Bubble Card >= 3.2.4 style pop-up: its shell is detached from the DOM while closed. */
  class FakePopup {
    constructor(hash, card) {
      this.hash = hash;
      this.shell = document.createElement('div');
      this.shell.className = 'popup';
      this.shell.dataset.hash = hash;
      this.shell.appendChild(card);
      this.card = card;
      this.sync();
    }
    get open() {
      return this.shell.isConnected;
    }
    sync() {
      const want = location.hash === this.hash;
      if (want && !this.open) document.getElementById('popups').appendChild(this.shell);
      if (!want && this.open) requestAnimationFrame(() => this.shell.remove());
    }
  }
  const syncAll = () => popups.forEach((p) => p.sync());
  for (const e of ['location-changed', 'popstate', 'hashchange'])
    window.addEventListener(e, syncAll);

  window.harness = {
    async load(path = '/local/stream-card/stream-card.js') {
      await import(path);
      await customElements.whenDefined('stream-card');
    },
    /** Creates a card. where: 'page' (default) or a pop-up hash like '#tv'. */
    mount(config, { where = 'page', id } = {}) {
      const card = document.createElement('stream-card');
      if (id) card.id = id;
      card.setConfig({ type: 'custom:stream-card', ...config });
      card.hass = { states: {} };
      if (where === 'page') {
        document.getElementById('view').appendChild(card);
      } else {
        popups.push(new FakePopup(where, card));
      }
      return card;
    },
    /** A dashboard button using HA's fire-dom-event action. */
    button(label, streamCard) {
      const b = document.createElement('button');
      b.className = 'action';
      b.textContent = label;
      b.addEventListener('click', () =>
        b.dispatchEvent(
          new CustomEvent('ll-custom', {
            detail: { action: 'fire-dom-event', stream_card: streamCard },
            bubbles: true,
            composed: true,
          }),
        ),
      );
      document.getElementById('buttons').appendChild(b);
      return b;
    },
    closePopup() {
      history.pushState(null, '', location.pathname + location.search);
      window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
    },
    openHash(hash) {
      history.pushState(null, '', location.pathname + location.search + hash);
      window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
    },
    setPageVisibility(state) {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
      Object.defineProperty(document, 'hidden', { value: state === 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    },
    /** Fake Fully Kiosk JS interface; must be installed before the card bundle loads. */
    installFully() {
      const bound = {};
      window.fully = { bind: (event, code) => (bound[event] = code) };
      window.__fullyBound = bound;
    },
    fullyEmit(event) {
      // Fully runs bound code with eval-like semantics.
      new Function(window.__fullyBound[event])();
    },
    info(sel = 'stream-card') {
      const card =
        document.querySelector(sel) ?? popups.map((p) => p.card).find((c) => c.matches(sel));
      return card ? JSON.parse(JSON.stringify(card.debugInfo)) : null;
    },
    cardIn(sel) {
      return document.querySelector(sel) ?? popups.map((p) => p.card).find((c) => c.matches(sel));
    },
    counters() {
      return { ...window.__streamCard.counters };
    },
  };
})();
