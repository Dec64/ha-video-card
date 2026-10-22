import { css, html, LitElement, nothing, unsafeCSS, type TemplateResult } from 'lit';
import { FAVOURITES, type Channel, type ChannelList } from './channels';
import { icon, iconStyles } from './icons';
import { tokens } from './ui/theme';
import { channelLabel, initials, progress, type Layout, type NowNext } from './ui/view';

export const PICKER_TAG = 'stream-card-picker';

/** Most tiles rendered at once; more than this asks for a narrower search. */
const MAX_TILES = 300;

/** The Recent tab's key; can't clash with a group name from the playlist. */
const RECENT = '\u0000recent';

export type PickerState = 'loading' | 'error' | 'ready';

/**
 * The channel guide: search, a number keypad, tabs (Recent, ★ Favourites, All, groups) and a
 * grid of channel tiles with what's on now. Fires `channel-pick` (detail: Channel),
 * `picker-close` and `picker-retry`; it never plays anything itself.
 */
export class StreamCardPicker extends LitElement {
  static override properties = {
    list: { attribute: false },
    state: { type: String },
    message: { type: String },
    currentId: { type: String, attribute: 'current-id' },
    closable: { type: Boolean },
    recents: { attribute: false },
    nowNext: { attribute: false },
    now: { attribute: false },
    numberEntry: { attribute: false },
    pressDigit: { attribute: false },
    clearDigits: { attribute: false },
    layout: { type: String, reflect: true },
    _query: { state: true },
    _group: { state: true },
    _keypad: { state: true },
  };

  declare list?: ChannelList;
  declare state: PickerState;
  declare message?: string;
  declare currentId?: string;
  declare closable: boolean;
  /** Most recent first, from the navigation features. Empty hides the Recent tab. */
  declare recents: Channel[];
  declare nowNext?: (ch: Channel) => NowNext | undefined;
  declare now: number;
  declare numberEntry?: { digits: string; candidates: Channel[] };
  /** Set when number entry is available; shows the keypad button. */
  declare pressDigit?: (d: string) => void;
  declare clearDigits?: () => void;
  declare layout: Layout;
  declare private _query: string;
  /** The tab picked by hand; undefined = Recent when there are recents, else All. */
  declare private _group?: string;
  declare private _keypad: boolean;

  constructor() {
    super();
    this.state = 'loading';
    this.closable = false;
    this.recents = [];
    this.now = Date.now();
    this.layout = 'standard';
    this._query = '';
    this._keypad = false;
  }

  /** Logo URLs that failed to load. Tiles are reused as the filter changes, so this is kept
   * per URL rather than as a class on whichever <img> happened to fail. */
  private readonly failedLogos = new Set<string>();

  private onLogoError = (e: Event) => {
    const src = (e.target as HTMLImageElement).getAttribute('src');
    if (src && !this.failedLogos.has(src)) {
      this.failedLogos.add(src);
      this.requestUpdate();
    }
  };

  static override styles = [
    tokens,
    css`
      ${unsafeCSS(iconStyles)}
    `,
    css`
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
    `,
  ];

  private get group(): string {
    if (this._group !== undefined) {
      if (this._group === RECENT && !this.recents.length) return '';
      return this._group;
    }
    return this.recents.length ? RECENT : '';
  }

  private onSearch = (e: Event) => {
    this._query = (e.target as HTMLInputElement).value;
  };

  private onSearchKey = (e: KeyboardEvent) => {
    // Escape clears the search first; only an empty box lets it through (Bubble closes on it).
    if (e.key === 'Escape' && this._query) {
      e.stopPropagation();
      this._query = '';
      (e.target as HTMLInputElement).value = '';
      return;
    }
    // Typing in the search box is never a channel number for the card's keyboard handling.
    e.stopPropagation();
    if (e.key !== 'Enter' || !this.list) return;
    const first = this.results()[0];
    if (first) this.pick(first);
  };

  private results(): Channel[] {
    const list = this.list;
    if (!list) return [];
    if (this.group === RECENT) {
      // A search on Recent looks through every channel.
      return this._query ? list.filter(this._query, '') : this.recents;
    }
    return list.filter(this._query, this.group);
  }

  private pick(c: Channel): void {
    // Keep the tab: a pick adds to Recent, which mustn't pull the view over to it.
    this._group = this.group;
    this.dispatchEvent(
      new CustomEvent('channel-pick', { detail: c, bubbles: true, composed: true }),
    );
  }

  private fire(name: string): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    return html`
      <div class="head">
        <label class="search">
          ${icon('search')}
          <input
            type="search"
            placeholder=${this.list?.size ? `Search ${this.list.size} channels` : 'Search channels'}
            aria-label="Search channels"
            .value=${this._query}
            @input=${this.onSearch}
            @keydown=${this.onSearchKey}
          />
        </label>
        ${
          this.pressDigit
            ? html`<button
                class="keypad-toggle"
                aria-pressed=${this._keypad ? 'true' : 'false'}
                aria-label="Number keypad"
                @click=${() => {
                  this._keypad = !this._keypad;
                  if (!this._keypad) this.clearDigits?.();
                }}
              >
                ${icon('keypad')}<span class="kp-label mono">123</span>
              </button>`
            : nothing
        }
        ${
          this.closable
            ? html`<button
                class="close"
                aria-label="Close channel list"
                @click=${() => this.fire('picker-close')}
              >
                ${icon('close')}
              </button>`
            : nothing
        }
      </div>
      ${this._keypad && this.pressDigit ? this.renderKeypad() : nothing} ${this.renderBody()}
    `;
  }

  private renderKeypad(): TemplateResult {
    const entry = this.numberEntry;
    const digits = entry?.digits ?? '';
    const hint = digits
      ? entry?.candidates.length
        ? entry.candidates
            .slice(0, 3)
            .map((c) => channelLabel(c))
            .join(' · ')
        : 'No channel with that number'
      : 'Type a number and it tunes.';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    return html`<div class="keypad">
      <div class="keypad-read">
        <span class="label">Type a channel number</span>
        <span class="typed mono" aria-live="polite">${digits || '_'}</span>
        <span class="typed-hint">${hint}</span>
      </div>
      <div class="keys" role="group" aria-label="Number keypad">
        ${keys.map(
          (k) =>
            html`<button
              class="key mono"
              aria-label="Digit ${k}"
              @click=${() => this.pressDigit?.(k)}
            >
              ${k}
            </button>`,
        )}
        <button
          class="key"
          aria-label="Clear digits"
          ?disabled=${!digits}
          @click=${() => this.clearDigits?.()}
        >
          ${icon('backspace')}
        </button>
      </div>
    </div>`;
  }

  private renderTile(c: Channel, favs: Set<string>): TemplateResult {
    const nn = this.nowNext?.(c);
    const now = nn?.now;
    const pct = progress(now, this.now);
    const current = c.id === this.currentId;
    return html`<button
      class="tile"
      aria-current=${current ? 'true' : nothing}
      aria-label=${c.number ? `${c.number} ${c.name}` : c.name}
      @click=${() => this.pick(c)}
    >
      <span class="tile-head">
        <span class="plate" aria-hidden="true">
          ${
            c.logo
              ? html`<img
                  class=${this.failedLogos.has(c.logo) ? 'logo missing' : 'logo'}
                  src=${c.logo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  @error=${this.onLogoError}
                />`
              : nothing
          }
          <span class="initials">${initials(c.name)}</span>
        </span>
        <span class="tile-text">
          ${c.number ? html`<span class="num mono">${c.number}</span>` : nothing}
          <span class="name">${c.name}</span>
        </span>
        ${favs.has(c.id) ? html`<span class="fav" title="Favourite">${icon('star')}</span>` : nothing}
      </span>
      ${
        now
          ? html`<span class="prog">
              <span class="prog-title">${current ? `Watching · ${now.title}` : now.title}</span>
              ${
                pct !== undefined
                  ? html`<span class="bar"><span style="width:${pct.toFixed(1)}%"></span></span>`
                  : nothing
              }
            </span>`
          : nothing
      }
    </button>`;
  }

  private renderBody() {
    if (this.state === 'loading')
      return html`<div class="status" role="status">Loading channels…</div>`;
    if (this.state === 'error') {
      return html`<div class="status" role="alert">
        ${this.message}<br />
        <button class="retry" @click=${() => this.fire('picker-retry')}>Try again</button>
      </div>`;
    }
    const list = this.list;
    if (!list || !list.size) return html`<div class="status">${this.message}</div>`;
    const chips: Array<[string, string]> = [];
    if (this.recents.length) chips.push([RECENT, 'Recent']);
    if (list.favourites.length) chips.push([FAVOURITES, '★ Favourites']);
    chips.push(['', 'All']);
    for (const g of list.groups) chips.push([g, g]);
    const group = this.group;
    const results = this.results();
    const shown = results.slice(0, MAX_TILES);
    const favs = new Set(list.favourites.map((c) => c.id));
    return html`
      ${
        chips.length > 2 || list.favourites.length || this.recents.length
          ? html`<div class="chips" role="group" aria-label="Channel groups">
              ${chips.map(
                ([value, label]) =>
                  html`<button
                    class="chip"
                    aria-pressed=${!this._query || value !== RECENT ? (group === value ? 'true' : 'false') : 'false'}
                    @click=${() => (this._group = value)}
                  >
                    ${label}
                  </button>`,
              )}
            </div>`
          : nothing
      }
      ${
        shown.length
          ? html`<div class="grid" role="group" aria-label="Channels">
              ${shown.map((c) => this.renderTile(c, favs))}
            </div>`
          : html`<div class="status">No channels match “${this._query}”.</div>`
      }
      ${
        results.length > shown.length
          ? html`<div class="status">
              Showing ${shown.length} of ${results.length}. Search to narrow the list.
            </div>`
          : nothing
      }
    `;
  }
}
