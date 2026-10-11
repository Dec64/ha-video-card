import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { FAVOURITES, type Channel, type ChannelList } from './channels';
import { icon } from './icons';

export const PICKER_TAG = 'stream-card-picker';

/** Most tiles rendered at once; more than this asks for a narrower search. */
const MAX_TILES = 300;

export type PickerState = 'loading' | 'error' | 'ready';

/** "Sports Live HD" → "SL": a stand-in for a missing logo. */
function initials(name: string): string {
  const words = name
    .replace(/\b(hd|sd|fhd|uhd|4k)\b/gi, '')
    .trim()
    .split(/\s+/);
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();
}

/**
 * Channel browser: search, group chips and a grid of logo tiles. Fires `channel-pick`
 * (detail: Channel), `picker-close` and `picker-retry`; it never plays anything itself.
 */
export class StreamCardPicker extends LitElement {
  static override properties = {
    list: { attribute: false },
    state: { type: String },
    message: { type: String },
    currentId: { type: String, attribute: 'current-id' },
    closable: { type: Boolean },
    _query: { state: true },
    _group: { state: true },
  };

  declare list?: ChannelList;
  declare state: PickerState;
  declare message?: string;
  declare currentId?: string;
  declare closable: boolean;
  declare private _query: string;
  declare private _group: string;

  constructor() {
    super();
    this.state = 'loading';
    this.closable = false;
    this._query = '';
    this._group = '';
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

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px 12px;
      box-sizing: border-box;
      color: var(--primary-text-color, #212121);
      /* Same order as ha-card, so the panel matches the rest of the card under any theme. */
      background: var(--ha-card-background, var(--card-background-color, #fff));
      font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, sans-serif));
      min-height: 0;
      /* A long row of group chips must scroll, not widen the card (and with it the picture). */
      contain: inline-size;
    }
    :host(.overlay) {
      position: absolute;
      inset: 0;
      z-index: 3;
      color: #fff;
      background: rgba(0, 0, 0, 0.92);
    }
    .head {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    input[type='search'] {
      flex: 1;
      min-width: 0;
      height: 40px;
      padding: 0 12px;
      border-radius: 20px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: inherit;
      font: inherit;
      font-size: 15px;
    }
    :host(.overlay) input[type='search'] {
      border-color: rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.1);
    }
    button {
      font: inherit;
      color: inherit;
      cursor: pointer;
      border: none;
      background: none;
      padding: 0;
    }
    button:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: 2px;
    }
    .close {
      flex: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
    }
    :host(.overlay) .close {
      background: rgba(255, 255, 255, 0.15);
    }
    .close svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }
    .chips {
      display: flex;
      gap: 6px;
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
      height: 32px;
      padding: 0 12px;
      border-radius: 16px;
      font-size: 13px;
      white-space: nowrap;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
    }
    :host(.overlay) .chip {
      background: rgba(255, 255, 255, 0.12);
    }
    .chip[aria-pressed='true'] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 28%, transparent);
      box-shadow: inset 0 0 0 1.5px var(--primary-color, #03a9f4);
      font-weight: 600;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
      gap: 8px;
      overflow-y: auto;
      overscroll-behavior: contain;
      max-height: var(--stream-card-picker-max-height, min(60vh, 440px));
      padding: 2px;
    }
    :host(.overlay) .grid {
      max-height: none;
      flex: 1;
    }
    .grid {
      align-content: start;
      grid-auto-rows: max-content;
    }
    .tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-height: 92px;
      padding: 8px 6px;
      border-radius: 12px;
      text-align: center;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border: 2px solid transparent;
    }
    :host(.overlay) .tile {
      background: rgba(255, 255, 255, 0.08);
    }
    .tile[aria-current='true'] {
      border-color: var(--primary-color, #03a9f4);
    }
    .logo {
      width: 72px;
      height: 40px;
      object-fit: contain;
      /* IPTV logos are mostly drawn for dark backgrounds (white text), so give them one. */
      box-sizing: border-box;
      padding: 3px 5px;
      border-radius: 6px;
      background: var(--stream-card-logo-background, #1c1c1c);
    }
    .logo.missing {
      display: none;
    }
    .initials {
      width: 72px;
      height: 40px;
      border-radius: 6px;
      display: grid;
      place-items: center;
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 0.5px;
      opacity: 0.75;
      background: var(--divider-color, rgba(0, 0, 0, 0.08));
    }
    .logo:not(.missing) + .initials {
      display: none;
    }
    .name {
      font-size: 13px;
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }
    .num {
      font-size: 11px;
      opacity: 0.7;
    }
    .status {
      padding: 16px 4px;
      font-size: 14px;
      text-align: center;
      opacity: 0.85;
    }
    .status button {
      margin-top: 10px;
      padding: 8px 16px;
      border-radius: 18px;
      font-weight: 600;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 28%, transparent);
      box-shadow: inset 0 0 0 1.5px var(--primary-color, #03a9f4);
    }
  `;

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
    if (e.key !== 'Enter' || !this.list) return;
    const first = this.list.filter(this._query, this._group)[0];
    if (first) this.pick(first);
  };

  private pick(c: Channel): void {
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
        <input
          type="search"
          placeholder="Search channels"
          aria-label="Search channels"
          .value=${this._query}
          @input=${this.onSearch}
          @keydown=${this.onSearchKey}
        />
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
      ${this.renderBody()}
    `;
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
    const chips: Array<[string, string]> = [['', 'All']];
    if (list.favourites.length) chips.push([FAVOURITES, '★ Favourites']);
    for (const g of list.groups) chips.push([g, g]);
    const results = list.filter(this._query, this._group);
    const shown = results.slice(0, MAX_TILES);
    return html`
      ${
        chips.length > 2 || list.favourites.length
          ? html`<div class="chips" role="group" aria-label="Channel groups">
              ${chips.map(
                ([value, label]) =>
                  html`<button
                    class="chip"
                    aria-pressed=${this._group === value ? 'true' : 'false'}
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
              ${shown.map(
                (c) =>
                  html`<button
                    class="tile"
                    aria-current=${c.id === this.currentId ? 'true' : nothing}
                    aria-label=${c.number ? `${c.number} ${c.name}` : c.name}
                    @click=${() => this.pick(c)}
                  >
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
                    <span class="initials" aria-hidden="true">${initials(c.name)}</span>
                    <span class="name">${c.name}</span>
                    ${c.number ? html`<span class="num">${c.number}</span>` : nothing}
                  </button>`,
              )}
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
