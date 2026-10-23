import { _ as e, a as t, c as n, h as r, l as i, m as a, p as o, s, t as c, u as l, v as u } from "./stream-card-view-CwLHw3Tw.js";
//#region src/picker.ts
var d, f = "stream-card-picker", p = 300, m = "\0recent", h = class extends o {
	constructor() {
		super(), this.failedLogos = /* @__PURE__ */ new Set(), this.onLogoError = (e) => {
			let t = e.target.getAttribute("src");
			t && !this.failedLogos.has(t) && (this.failedLogos.add(t), this.requestUpdate());
		}, this.onSearch = (e) => {
			this._query = e.target.value;
		}, this.onSearchKey = (e) => {
			if (e.key === "Escape" && this._query) {
				e.stopPropagation(), this._query = "", e.target.value = "";
				return;
			}
			if (e.stopPropagation(), e.key !== "Enter" || !this.list) return;
			let t = this.results()[0];
			t && this.pick(t);
		}, this.state = "loading", this.closable = !1, this.recents = [], this.now = Date.now(), this.layout = "standard", this._query = "", this._keypad = !1;
	}
	get group() {
		return this._group === void 0 ? this.recents.length ? m : "" : this._group === m && !this.recents.length ? "" : this._group;
	}
	results() {
		let e = this.list;
		return e ? this.group === m ? this._query ? e.filter(this._query, "") : this.recents : e.filter(this._query, this.group) : [];
	}
	pick(e) {
		this._group = this.group, this.dispatchEvent(new CustomEvent("channel-pick", {
			detail: e,
			bubbles: !0,
			composed: !0
		}));
	}
	fire(e) {
		this.dispatchEvent(new CustomEvent(e, {
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		return r`
      <div class="head">
        <label class="search">
          ${i("search")}
          <input
            type="search"
            placeholder=${this.list?.size ? `Search ${this.list.size} channels` : "Search channels"}
            aria-label="Search channels"
            .value=${this._query}
            @input=${this.onSearch}
            @keydown=${this.onSearchKey}
          />
        </label>
        ${this.pressDigit ? r`<button
                class="keypad-toggle"
                aria-pressed=${this._keypad ? "true" : "false"}
                aria-label="Number keypad"
                @click=${() => {
			this._keypad = !this._keypad, this._keypad || this.clearDigits?.();
		}}
              >
                ${i("keypad")}<span class="kp-label mono">123</span>
              </button>` : a}
        ${this.closable ? r`<button
                class="close"
                aria-label="Close channel list"
                @click=${() => this.fire("picker-close")}
              >
                ${i("close")}
              </button>` : a}
      </div>
      ${this._keypad && this.pressDigit ? this.renderKeypad() : a} ${this.renderBody()}
    `;
	}
	renderKeypad() {
		let e = this.numberEntry, t = e?.digits ?? "", n = t ? e?.candidates.length ? e.candidates.slice(0, 3).map((e) => c(e)).join(" · ") : "No channel with that number" : "Type a number and it tunes.";
		return r`<div class="keypad">
      <div class="keypad-read">
        <span class="label">Type a channel number</span>
        <span class="typed mono" aria-live="polite">${t || "_"}</span>
        <span class="typed-hint">${n}</span>
      </div>
      <div class="keys" role="group" aria-label="Number keypad">
        ${[
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"0"
		].map((e) => r`<button
              class="key mono"
              aria-label="Digit ${e}"
              @click=${() => this.pressDigit?.(e)}
            >
              ${e}
            </button>`)}
        <button
          class="key"
          aria-label="Clear digits"
          ?disabled=${!t}
          @click=${() => this.clearDigits?.()}
        >
          ${i("backspace")}
        </button>
      </div>
    </div>`;
	}
	renderTile(e, n) {
		let o = this.nowNext?.(e)?.now, c = s(o, this.now), l = e.id === this.currentId;
		return r`<button
      class="tile"
      aria-current=${l ? "true" : a}
      aria-label=${e.number ? `${e.number} ${e.name}` : e.name}
      @click=${() => this.pick(e)}
    >
      <span class="tile-head">
        <span class="plate" aria-hidden="true">
          ${e.logo ? r`<img
                  class=${this.failedLogos.has(e.logo) ? "logo missing" : "logo"}
                  src=${e.logo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  @error=${this.onLogoError}
                />` : a}
          <span class="initials">${t(e.name)}</span>
        </span>
        <span class="tile-text">
          ${e.number ? r`<span class="num mono">${e.number}</span>` : a}
          <span class="name">${e.name}</span>
        </span>
        ${n.has(e.id) ? r`<span class="fav" title="Favourite">${i("star")}</span>` : a}
      </span>
      ${o ? r`<span class="prog">
              <span class="prog-title">${l ? `Watching · ${o.title}` : o.title}</span>
              ${c === void 0 ? a : r`<span class="bar"><span style="width:${c.toFixed(1)}%"></span></span>`}
            </span>` : a}
    </button>`;
	}
	renderBody() {
		if (this.state === "loading") return r`<div class="status" role="status">Loading channels…</div>`;
		if (this.state === "error") return r`<div class="status" role="alert">
        ${this.message}<br />
        <button class="retry" @click=${() => this.fire("picker-retry")}>Try again</button>
      </div>`;
		let e = this.list;
		if (!e || !e.size) return r`<div class="status">${this.message}</div>`;
		let t = [];
		this.recents.length && t.push([m, "Recent"]), e.favourites.length && t.push(["★", "★ Favourites"]), t.push(["", "All"]);
		for (let n of e.groups) t.push([n, n]);
		let n = this.group, i = this.results(), o = i.slice(0, p), s = new Set(e.favourites.map((e) => e.id));
		return r`
      ${t.length > 2 || e.favourites.length || this.recents.length ? r`<div class="chips" role="group" aria-label="Channel groups">
              ${t.map(([e, t]) => r`<button
                    class="chip"
                    aria-pressed=${(!this._query || e !== m) && n === e ? "true" : "false"}
                    @click=${() => this._group = e}
                  >
                    ${t}
                  </button>`)}
            </div>` : a}
      ${o.length ? r`<div class="grid" role="group" aria-label="Channels">
              ${o.map((e) => this.renderTile(e, s))}
            </div>` : r`<div class="status">No channels match “${this._query}”.</div>`}
      ${i.length > o.length ? r`<div class="status">
              Showing ${o.length} of ${i.length}. Search to narrow the list.
            </div>` : a}
    `;
	}
};
d = h, d.properties = {
	list: { attribute: !1 },
	state: { type: String },
	message: { type: String },
	currentId: {
		type: String,
		attribute: "current-id"
	},
	closable: { type: Boolean },
	recents: { attribute: !1 },
	nowNext: { attribute: !1 },
	now: { attribute: !1 },
	numberEntry: { attribute: !1 },
	pressDigit: { attribute: !1 },
	clearDigits: { attribute: !1 },
	layout: {
		type: String,
		reflect: !0
	},
	_query: { state: !0 },
	_group: { state: !0 },
	_keypad: { state: !0 }
}, d.styles = [
	n,
	e`
      ${u(l)}
    `,
	e`
      :host {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px;
        box-sizing: border-box;
        color: var(--sc-text);
        /* Same order as ha-card, so the panel matches the rest of the card under any theme. */
        background: var(--sc-card);
        font-family: var(--sc-font);
        min-height: 0;
        /* A long row of group chips must scroll, not widen the card (and with it the picture). */
        contain: inline-size;
        container: guide / inline-size;
      }
      :host(.overlay) {
        position: absolute;
        inset: 0;
        z-index: 5;
        color: var(--sc-pic-text);
        background: rgba(10, 11, 14, 0.92);
        --sc-surface: rgba(255, 255, 255, 0.08);
        --sc-surface-2: rgba(255, 255, 255, 0.14);
        --sc-text-2: rgba(255, 255, 255, 0.72);
        --sc-line: rgba(255, 255, 255, 0.14);
      }
      :host([layout='tv']) {
        padding: 5% 5% 4%;
      }
      .mono {
        font-family: var(--sc-mono);
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
      }
      .head {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .search {
        flex: 1;
        min-width: 0;
        height: 44px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 14px;
        border-radius: 12px;
        background: var(--sc-surface);
        color: var(--sc-text-2);
      }
      .search svg.icon {
        width: 18px;
        height: 18px;
      }
      input[type='search'] {
        flex: 1;
        min-width: 0;
        height: 100%;
        border: 0;
        padding: 0;
        background: transparent;
        color: var(--sc-text);
        font: inherit;
        font-size: 15px;
        outline: none;
      }
      :host(.overlay) input[type='search'] {
        color: var(--sc-pic-text);
      }
      .search:focus-within {
        outline: 2px solid var(--sc-accent);
        outline-offset: 2px;
      }
      button {
        font: inherit;
        color: inherit;
        cursor: pointer;
        border: none;
        background: none;
        padding: 0;
      }
      button:focus-visible {
        outline: 2px solid var(--sc-accent);
        outline-offset: 2px;
      }
      .close,
      .keypad-toggle {
        flex: none;
        height: 44px;
        min-width: 44px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: var(--sc-surface);
        color: var(--sc-text-2);
      }
      .keypad-toggle {
        padding: 0 14px;
        font-size: 13.5px;
        font-weight: 600;
      }
      .keypad-toggle[aria-pressed='true'],
      .chip[aria-pressed='true'] {
        background: var(--sc-accent-soft);
        box-shadow: inset 0 0 0 1.5px var(--sc-accent);
        color: var(--sc-text);
        font-weight: 650;
      }
      .keypad-toggle svg.icon,
      .close svg.icon {
        width: 18px;
        height: 18px;
      }
      .keypad {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        align-items: center;
        padding: 16px;
        border-radius: 14px;
        background: var(--sc-surface);
      }
      .keypad-read {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 180px;
      }
      .label {
        font-size: 11px;
        font-weight: 650;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--sc-text-2);
      }
      .typed {
        font-size: 52px;
        font-weight: 800;
        letter-spacing: 0.06em;
        line-height: 1;
      }
      .typed-hint {
        font-size: 13px;
        color: var(--sc-text-2);
      }
      .keys {
        flex: 1 1 300px;
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 8px;
      }
      .key {
        height: 48px;
        border-radius: 12px;
        background: var(--sc-surface-2);
        font-size: 18px;
        font-weight: 700;
        display: grid;
        place-items: center;
      }
      .chips {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: none;
        padding-bottom: 2px;
      }
      .chips::-webkit-scrollbar {
        display: none;
      }
      /* A mouse wheel can't scroll sideways, so mouse users get a thin scrollbar. */
      @media (hover: hover) and (pointer: fine) {
        .chips {
          scrollbar-width: thin;
          padding-bottom: 6px;
        }
        .chips::-webkit-scrollbar {
          display: block;
          height: 6px;
        }
      }
      .chip {
        flex: none;
        height: 36px;
        padding: 0 14px;
        border-radius: 18px;
        font-size: 13.5px;
        font-weight: 550;
        white-space: nowrap;
        background: var(--sc-surface);
        color: var(--sc-text-2);
      }
      .chip:hover {
        color: var(--sc-text);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
        gap: 10px;
        overflow-y: auto;
        overscroll-behavior: contain;
        max-height: var(--stream-card-picker-max-height, min(60vh, 460px));
        padding: 2px;
        align-content: start;
        grid-auto-rows: max-content;
      }
      :host(.overlay) .grid {
        max-height: none;
        flex: 1;
      }
      .tile {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        min-height: 64px;
        box-sizing: border-box;
        border-radius: 14px;
        text-align: left;
        background: var(--sc-surface);
        border: 1.5px solid transparent;
        transition:
          background 0.15s,
          transform 0.25s var(--sc-ease);
      }
      .tile:hover {
        background: var(--sc-surface-2);
      }
      @media (hover: hover) {
        .tile:hover {
          transform: translateY(-2px);
        }
      }
      .tile[aria-current='true'] {
        border-color: var(--sc-accent);
        background: var(--sc-surface-2);
      }
      .tile-head {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .tile-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
      }
      .plate {
        position: relative;
        flex: none;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        overflow: hidden;
        display: grid;
        place-items: center;
        /* IPTV logos are mostly drawn for dark backgrounds (white text), so give them one. */
        background: var(--sc-logo-bg);
        color: #f4f5f7;
        font-weight: 800;
        font-size: 14px;
        letter-spacing: -0.03em;
      }
      .logo {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 3px;
        object-fit: contain;
      }
      .logo.missing {
        display: none;
      }
      .logo:not(.missing) + .initials {
        visibility: hidden;
      }
      .num {
        font-size: 12px;
        font-weight: 700;
        color: var(--sc-text-2);
      }
      .name {
        font-size: 14.5px;
        font-weight: 650;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fav svg.icon {
        width: 16px;
        height: 16px;
        color: var(--sc-fav);
      }
      .prog {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .prog-title {
        font-size: 13px;
        color: var(--sc-text-2);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bar {
        display: block;
        height: 3px;
        border-radius: 2px;
        background: var(--sc-line);
        overflow: hidden;
      }
      .bar > span {
        display: block;
        height: 100%;
        background: var(--sc-text-2);
      }
      .tile[aria-current='true'] .bar > span {
        background: var(--sc-accent);
      }
      .status {
        padding: 16px 4px;
        font-size: 14px;
        text-align: center;
        color: var(--sc-text-2);
      }
      .status button {
        margin-top: 10px;
        padding: 10px 18px;
        border-radius: 22px;
        font-weight: 650;
        background: var(--sc-accent-soft);
        box-shadow: inset 0 0 0 1.5px var(--sc-accent);
      }
      /* Phones and pop-ups: one channel per row. */
      @container guide (max-width: 479px) {
        :host {
          padding: 14px 12px 12px;
          gap: 12px;
        }
        .grid {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .tile {
          padding: 10px 12px;
          gap: 6px;
        }
        .keypad-toggle .kp-label {
          display: none;
        }
        .keys {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      /* Wall panels: bigger targets for arm's-length taps. */
      @media (pointer: coarse) and (min-width: 900px) {
        .chip {
          height: 44px;
          padding: 0 18px;
          font-size: 15px;
        }
        .tile {
          min-height: 88px;
        }
        .key {
          height: 56px;
        }
      }
      :host([layout='tv']) .tile {
        min-height: 110px;
        font-size: 17px;
      }
      :host([layout='tv']) .name {
        font-size: 17px;
      }
      @media (prefers-reduced-motion: reduce) {
        .tile {
          transition: none;
        }
      }
    `
];
//#endregion
export { f as PICKER_TAG, h as StreamCardPicker };

//# sourceMappingURL=stream-card-picker-BNWjV-p-.js.map