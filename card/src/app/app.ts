import { html, nothing, svg, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { live } from 'lit/directives/live.js';
import type { Channel, ChannelList } from '../channels';
import type { GuideFeed, Programme } from '../epg';
import { icon } from '../icons';
import type { ResolvedConfig } from '../types';
import { renderCenter, settingsPanel } from '../ui/stage';
import type { CardActions, CardView } from '../ui/view';
import {
  after,
  favourites,
  filmSlots,
  frameTint,
  genre,
  groupLabel,
  headline,
  hm,
  kindOf,
  left,
  LITE,
  MIN,
  onAt,
  pct,
  programmes,
  shortName,
  sportSlots,
  tintOf,
  toggleFavourite,
  type Kind,
  type Slot,
} from './data';
export { appStyles } from './styles';
export { hostFor } from './host';

/**
 * The Live TV app (`chrome: app`): Lineup home ("On now"), Guide, Channels and the full-screen
 * Theatre, with a dock of tabs. `chrome: embed` is the Theatre's controls alone, for pages such as
 * FPL Home that choose the channel themselves.
 *
 * The card keeps owning playback. The one `<video>` lives in `.video-host` inside the stage,
 * which sits at the same place in this template in every view; CSS moves the stage between the
 * Lineup's hero, the Guide's preview and the full screen, so changing views never touches it.
 */

export type AppView = 'now' | 'guide' | 'channels' | 'full';

export interface AppHost {
  readonly el: HTMLElement;
  readonly config: ResolvedConfig;
  readonly list?: ChannelList;
  readonly guide?: GuideFeed;
  readonly current?: Channel;
  readonly video: HTMLVideoElement;
  /** The multiview grid while multiview is on. */
  readonly multiview?: HTMLElement;
  play(ch: Channel): void;
  refresh(): void;
  frameClick(): void;
  /** Shows the controls and restarts their hide timer. */
  wake(): void;
  deleteDigit(): void;
  handleKey(e: KeyboardEvent): void;
}

const ROW = 52;
const KINDS: Kind[] = ['sport', 'film', 'news', 'kids'];
const KIND_LABEL: Record<Kind, string> = {
  sport: 'Sports',
  film: 'Movies',
  news: 'News',
  kids: 'Kids',
  other: 'Other',
};
const LONG_PRESS_MS = 550;
/** A hero shorter than this opens the settings panel in full screen instead of over itself. */
const HERO_PANEL_MIN_PX = 360;
const SLEEP_MINUTES = [15, 30, 60];

const PLUS = svg`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>`;
const stop = (e: Event) => e.stopPropagation();
const mono = (s: string | undefined) => html`<span class="mono">${s}</span>`;

/** The household dash's app dock element (`household-app-dock`), as far as this card uses it. */
type HouseholdDock = HTMLElement & {
  folded?: boolean;
  sw?: boolean;
  render?: () => void;
  update?: () => void;
};

export class AppShell {
  view: AppView = 'now';
  private from: AppView = 'now';
  private guideGroup = '';
  private guideQuery = '';
  private guideSel?: { id: string; start?: number };
  private guideFirst = 0;
  private guideScrolled = false;
  private chGroup = '';
  private chQuery = '';
  private rail = false;
  private railGroup = '★';
  private railQuery = '';
  private keypad = false;
  private toastText = '';
  private toastTimer?: ReturnType<typeof setTimeout>;
  private zapId?: string;
  private zapCount = 0;
  private pressTimer?: ReturnType<typeof setTimeout>;
  private pressed = false;
  private pressOff?: () => void;
  private ambTimer?: ReturnType<typeof setInterval>;
  private readonly ambCanvas = document.createElement('canvas');
  private deepLinked = false;
  private resizeObs?: ResizeObserver;
  private dockTimer?: ReturnType<typeof setInterval>;
  private hidDock = false;

  constructor(private readonly host: AppHost) {}

  private get embed(): boolean {
    return this.host.config.chrome === 'embed';
  }

  // ---- lifecycle ----

  connect(): void {
    if (this.embed) return;
    this.fit();
    // HA and kiosk add-ons settle the layout after the card connects.
    for (const ms of [300, 1200, 3000]) setTimeout(this.fit, ms);
    window.addEventListener('resize', this.fit);
    document.addEventListener('keydown', this.onDocKey);
    this.resizeObs = new ResizeObserver(() => this.fit());
    this.resizeObs.observe(document.documentElement);
    this.resizeObs.observe(this.host.el);
    this.ambTimer = setInterval(this.sampleFrame, 2500);
    // The household app dock folds into a handle at the bottom; the app's own dock carries its
    // orb instead, so the handle hides while it's folded.
    this.dockTimer = setInterval(this.syncHouseholdDock, 600);
    this.host.el.addEventListener('pointerdown', this.foldHouseholdDock, true);
  }

  disconnect(): void {
    window.removeEventListener('resize', this.fit);
    document.removeEventListener('keydown', this.onDocKey);
    this.resizeObs?.disconnect();
    clearInterval(this.ambTimer);
    clearInterval(this.dockTimer);
    this.host.el.removeEventListener('pointerdown', this.foldHouseholdDock, true);
    this.releaseHouseholdDock();
  }

  /**
   * The card fills the window from its top edge down (the Live TV dashboard is one card).
   */
  private fit = (): void => {
    const el = this.host.el;
    const r = el.getBoundingClientRect();
    const top = Math.max(0, r.top);
    el.style.setProperty('--sc-app-h', `${Math.round(Math.max(420, window.innerHeight - top))}px`);
  };

  private householdDock(): HouseholdDock | null {
    return document.querySelector('household-app-dock');
  }

  /**
   * The household app dock (another card's element, on every page) folds into a handle at the
   * bottom. On this page the app's own dock carries its orb, so the handle hides while folded;
   * opened from the orb, the household dock takes the app dock's place until it folds again,
   * and a tap anywhere on the card folds it. Only while the card is on screen: leaving the page
   * hands the dock back to its own logic.
   */
  private syncHouseholdDock = (): void => {
    const d = this.householdDock();
    const card = this.host.el;
    const shown = card.isConnected && card.getClientRects().length > 0;
    if (!d || !shown) return this.releaseHouseholdDock();
    const open = d.folded === false;
    if (!open) {
      d.style.display = 'none';
      this.hidDock = true;
    } else if (this.hidDock) {
      d.style.display = '';
    }
    card.shadowRoot?.querySelector('ha-card')?.toggleAttribute('data-hd-open', open);
  };

  private releaseHouseholdDock(): void {
    this.host.el.shadowRoot?.querySelector('ha-card')?.removeAttribute('data-hd-open');
    if (!this.hidDock) return;
    this.hidDock = false;
    const d = this.householdDock();
    if (!d) return;
    d.style.display = '';
    d.update?.(); // shows or hides itself for the page we're on now
  }

  private openHouseholdDock = (e: Event): void => {
    e.stopPropagation();
    const d = this.householdDock();
    if (!d) return;
    d.folded = false;
    d.sw = false;
    d.render?.();
    this.syncHouseholdDock();
  };

  /** A tap on the card while the household dock is open folds it back into the app dock's orb. */
  private foldHouseholdDock = (): void => {
    const d = this.householdDock();
    if (!d || d.folded !== false || d.sw) return;
    d.folded = true;
    d.render?.();
    this.syncHouseholdDock();
  };

  /** Keys typed with nothing focused (the usual case on a desktop) go to the card. */
  private onDocKey = (e: KeyboardEvent): void => {
    const t = e.target as HTMLElement | null;
    if (t && t !== document.body && t !== document.documentElement) return;
    if (!this.host.el.isConnected || this.host.el.getBoundingClientRect().bottom < 0) return;
    this.host.handleKey(e);
  };

  /** Keys the app handles before the card's own (digits, arrows and M stay with the card). */
  key(e: KeyboardEvent): boolean {
    if (this.embed) return false;
    if (e.key === 'Escape') {
      if (this.keypad || this.rail) {
        this.keypad = this.rail = false;
      } else if (this.view === 'full') this.unfull();
      else if (this.view !== 'now') this.go('now');
      else return false;
      this.host.refresh();
      return true;
    }
    if (e.key === 'f' || e.key === 'F') {
      if (this.view === 'full') this.unfull();
      else this.full();
      return true;
    }
    if (e.key === 'g' || e.key === 'G') {
      this.go(this.view === 'guide' ? 'now' : 'guide');
      return true;
    }
    return false;
  }

  /** OK / Enter and the error layer's Channels button: the guide. */
  showGuide(): void {
    if (this.embed) return;
    if (this.view === 'full') this.rail = !this.rail;
    else this.go('guide');
    this.host.refresh();
  }

  // ---- navigation between views ----

  go(v: AppView): void {
    if (v === this.view) return;
    this.flip(() => {
      if (v === 'full') this.from = this.view === 'full' ? this.from : this.view;
      this.view = v;
      this.rail = this.keypad = false;
      if (v === 'guide') {
        this.guideScrolled = false;
        this.guideSel = undefined;
      }
    });
    if (v === 'full') this.host.wake();
  }

  full = (e?: Event): void => {
    e?.stopPropagation();
    this.go('full');
  };

  unfull = (e?: Event): void => {
    e?.stopPropagation();
    this.go(this.from === 'full' ? 'now' : this.from);
  };

  /**
   * Moves the picture between views with a FLIP: measure, change, measure, and animate the
   * difference, so full screen springs out of the hero and back into it.
   */
  private flip(change: () => void): void {
    const stage = this.stageEl();
    const a = stage?.getBoundingClientRect();
    change();
    this.host.refresh();
    if (!stage || !a || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    requestAnimationFrame(() => {
      const b = stage.getBoundingClientRect();
      if (!a.width || !b.width || stage.hidden) return;
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      const sx = a.width / b.width;
      const sy = a.height / b.height;
      if (Math.abs(dx) + Math.abs(dy) < 2 && Math.abs(sx - 1) < 0.01) return;
      stage.animate(
        [
          { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: '0 0', transform: 'none' },
        ],
        { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' },
      );
    });
  }

  private stageEl(): HTMLElement | null {
    return this.host.el.shadowRoot?.querySelector('.app-stage') ?? null;
  }

  // ---- small helpers ----

  private now(v: CardView): number {
    return v.now;
  }

  private progs(ch: Channel): Programme[] {
    return programmes(this.host.guide, ch);
  }

  private favs(): Channel[] {
    const l = this.host.list;
    return l ? favourites(l, this.host.config.target) : [];
  }

  private toast(text: string): void {
    this.toastText = text;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastText = '';
      this.host.refresh();
    }, 2200);
    this.host.refresh();
  }

  private toggleFav(ch: Channel): void {
    const l = this.host.list;
    if (!l) return;
    const on = toggleFavourite(l, this.host.config.target, ch);
    this.toast(
      on ? `${shortName(ch)} added to favourites` : `${shortName(ch)} removed from favourites`,
    );
  }

  /**
   * Long-press on a tile or row toggles the favourite; the click that follows is swallowed. A
   * finger that moves (a swipe along a rail, a scroll of the page) is never a long-press.
   */
  private pressStart = (ch: Channel) => (e: PointerEvent) => {
    if (e.button > 0) return;
    this.pressed = false;
    this.pressEnd();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const move = (m: PointerEvent) => {
      if (m.pointerId === e.pointerId && Math.hypot(m.clientX - x0, m.clientY - y0) > 8)
        this.pressEnd();
    };
    // A touch that turns into a pan ends in pointercancel; a mouse drag shows up as movement.
    const cancel = () => this.pressEnd();
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointercancel', cancel);
    this.pressOff = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointercancel', cancel);
    };
    this.pressTimer = setTimeout(() => {
      this.pressEnd();
      this.pressed = true;
      this.toggleFav(ch);
    }, LONG_PRESS_MS);
  };

  private pressEnd = (): void => {
    clearTimeout(this.pressTimer);
    this.pressOff?.();
    this.pressOff = undefined;
  };

  private tap(ch: Channel, thenFull = false) {
    return (e: Event) => {
      e.stopPropagation();
      if (this.pressed) {
        this.pressed = false;
        return;
      }
      this.host.play(ch);
      if (thenFull) this.go('full');
    };
  }

  private tint(ch: Channel): [string, string] {
    return tintOf(ch, () => this.host.refresh());
  }

  /** Every 2.5 s on the Lineup: two colours from the picture for the bias light behind it. */
  private sampleFrame = (): void => {
    if (LITE || this.view !== 'now' || document.hidden) return;
    const c = frameTint(this.host.video, this.ambCanvas);
    const stage = this.stageEl();
    if (!c || !stage) return;
    stage.style.setProperty('--a1', c[0]);
    stage.style.setProperty('--a2', c[1]);
  };

  private logoPlate(ch: Channel | undefined, cls = ''): TemplateResult | typeof nothing {
    if (!ch) return nothing;
    return html`<span class="lp ${cls}"
      >${
        ch.logo
          ? html`<img src=${ch.logo} alt=${shortName(ch)} decoding="async" />`
          : html`<span class="ini">${initials(ch.name)}</span>`
      }</span
    >`;
  }

  private live(): TemplateResult {
    return html`<span class="live">LIVE</span>`;
  }

  // ---- render ----

  render(v: CardView, a: CardActions): TemplateResult {
    const cur = this.host.current;
    if (cur && cur.id !== this.zapId) {
      if (this.zapId !== undefined) this.zapCount++;
      this.zapId = cur.id;
    }
    if (!this.deepLinked && this.host.list) this.deepLink();
    const mv = this.host.multiview;
    const view: AppView = this.embed ? 'full' : mv ? 'full' : this.view;
    const t = cur ? this.tint(cur) : undefined;
    const ar = this.host.config.aspectRatio;
    return html`<ha-card
      class="app ${LITE ? 'lite' : ''} ${this.embed ? 'embed' : ''}"
      data-view=${view}
      style=${this.embed ? `--sc-ar:${ar}` : ''}
    >
      <div class="app-body" @scroll=${this.onBodyScroll}>
        ${this.embed ? nothing : this.before(view, v, a)}
        <div
          class="app-stage"
          data-ui=${v.ui}
          ?hidden=${!!mv}
          style=${t && LITE ? `--a1:${t[0]};--a2:${t[1]}` : t ? `--t1:${t[0]};--t2:${t[1]}` : ''}
        >
          <div
            class="frame ${v.chrome ? '' : 'calm'}"
            data-state=${v.ui}
            tabindex="0"
            aria-label=${v.title ? `Live TV: ${v.title}` : 'Live TV'}
            @click=${this.onFrame(view)}
            @pointermove=${view === 'full' || this.embed ? this.onMove : nothing}
          >
            <div class="video-host"></div>
            ${this.overlay(view, v, a)}
          </div>
        </div>
        ${mv ? html`<div class="mvwrap">${mv}</div>` : nothing}
        ${this.embed ? nothing : this.after(view, v, a)}
      </div>
      ${this.embed || view === 'full' ? nothing : this.dock(view, a)}
      ${this.toastText ? html`<div class="toast glass" role="status">${this.toastText}</div>` : nothing}
    </ha-card>`;
  }

  private deepLink(): void {
    this.deepLinked = true;
    const q = new URLSearchParams(location.search);
    const view = q.get('view');
    if (view === 'guide' || view === 'channels' || view === 'full') this.view = view;
    const ref = q.get('channel');
    const ch = ref ? this.host.list?.find(ref) : undefined;
    if (ch) queueMicrotask(() => this.host.play(ch));
  }

  private lastMove = 0;
  /** Moving the mouse over the full-screen picture brings the controls back. */
  private onMove = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse' || e.timeStamp - this.lastMove < 400) return;
    this.lastMove = e.timeStamp;
    this.host.wake();
  };

  private onFrame = (view: AppView) => (e: Event) => {
    if ((e.target as HTMLElement).closest('button, input, .glass')) return;
    if (view === 'now' || view === 'guide') this.full();
    else this.host.frameClick();
  };

  private onBodyScroll = (e: Event): void => {
    const el = e.currentTarget as HTMLElement;
    el.classList.toggle('scrolled', el.scrollTop > 4);
  };

  // ---- the parts around the stage ----

  private before(view: AppView, v: CardView, a: CardActions): TemplateResult | typeof nothing {
    if (view === 'now') return this.band(v, 'On', 'now', this.sentence(v));
    if (view === 'channels') {
      const l = this.host.list;
      return this.band(
        v,
        'Channels',
        '',
        html`<b>${l?.size ?? 0}</b> channels · <b>${this.favs().length}</b> favourites · tap one to
          watch full screen`,
      );
    }
    void a;
    return nothing;
  }

  private after(view: AppView, v: CardView, a: CardActions): TemplateResult | typeof nothing {
    if (view === 'now') return html`${this.favTiles(v)}${this.rails(v)}`;
    if (view === 'guide') return this.guideParts(v, a);
    if (view === 'channels') return this.channelsPage(v);
    return nothing;
  }

  private band(v: CardView, a: string, em: string, p: TemplateResult): TemplateResult {
    const d = new Date(v.now);
    return html`<div class="band">
      <div>
        <span class="lab">Live TV</span>
        <h2>${a}${em ? html` <em>${em}</em>` : nothing}</h2>
        <p>${p}</p>
      </div>
      <div class="clock">
        ${hm(v.now)}<small
          >${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</small
        >
      </div>
    </div>`;
  }

  /** The fact sentence: tonight's live event, favourites on now, and the last channel. */
  private sentence(v: CardView): TemplateResult {
    const l = this.host.list;
    const at = this.now(v);
    const h = l ? headline(l, this.host.guide, at) : undefined;
    const liveFavs = this.favs().filter((c) => onAt(this.progs(c), at)).length;
    const last = v.previousChannel;
    const parts: TemplateResult[] = [];
    if (h) {
      const s = h.p.start ?? at;
      parts.push(
        s <= at
          ? html`<b>${h.p.title}</b> is live on ${shortName(h.ch)} ·
              <b>${left((h.p.end ?? at) - at)}</b> left`
          : html`<b>${h.p.title}</b> starts at <b>${hm(s)}</b> on ${shortName(h.ch)}`,
      );
    }
    if (liveFavs) parts.push(html`<b>${liveFavs}</b> favourites on`);
    if (last) parts.push(html`last watched <b>${shortName(last)}</b>`);
    if (!parts.length) return html`Pick a channel to start watching`;
    return html`${parts.map((p, i) => html`${i ? ' · ' : ''}${p}`)}`;
  }

  // ---- Lineup ----

  private thumb(ch: Channel, extra: TemplateResult | typeof nothing = nothing): TemplateResult {
    const [c1] = this.tint(ch);
    return html`<div class="th lt" style="--c1:${c1}">
      ${
        ch.logo
          ? html`<img src=${ch.logo} alt=${shortName(ch)} decoding="async" />`
          : html`<span class="ini big">${initials(ch.name)}</span>`
      }
      ${extra}
    </div>`;
  }

  /** A tile for what's on a channel now. */
  private nowTile(ch: Channel, v: CardView): TemplateResult {
    const at = this.now(v);
    const list = this.progs(ch);
    const p = onAt(list, at);
    const n = after(list, at);
    const on = ch.id === this.host.current?.id;
    return html`<button
      class="ttile press ${on ? 'on' : ''}"
      @click=${this.tap(ch)}
      @pointerdown=${this.pressStart(ch)}
      @pointerup=${this.pressEnd}
      @pointerleave=${this.pressEnd}
      @contextmenu=${(e: Event) => e.preventDefault()}
    >
      ${this.thumb(
        ch,
        html`${
          on
            ? html`<span class="wat glass"
                ><span class="eq"><i></i><i></i><i></i></span>Watching</span
              >`
            : nothing
        }
        ${p?.live ? html`<span class="lvc">LIVE</span>` : nothing}
        ${p ? html`<div class="bar tbar"><i style="width:${pct(p, at)}%"></i></div>` : nothing}`,
      )}
      <div class="tt">${p?.title ?? shortName(ch)}</div>
      <div class="ts">
        <span class="a">${shortName(ch)}${p?.end ? ` · ${left(p.end - at)} left` : ''}</span>
        ${n ? html`<span class="b">Then ${n.title} · ${hm(n.start ?? 0)}</span>` : nothing}
      </div>
    </button>`;
  }

  /** A tile for a programme later on. */
  private laterTile(s: Slot, v: CardView): TemplateResult {
    if ((s.p.start ?? 0) <= this.now(v)) return this.nowTile(s.ch, v);
    return html`<button
      class="ttile press"
      @click=${this.tap(s.ch)}
      @pointerdown=${this.pressStart(s.ch)}
      @pointerup=${this.pressEnd}
      @pointerleave=${this.pressEnd}
      @contextmenu=${(e: Event) => e.preventDefault()}
    >
      ${this.thumb(
        s.ch,
        html`<span class="when glass">${hm(s.p.start ?? 0)}</span>${
            s.p.live ? html`<span class="lvc left">LIVE</span>` : nothing
          }`,
      )}
      <div class="tt">${s.p.title}</div>
      <div class="ts"><span class="a">${shortName(s.ch)} · ${hm(s.p.start ?? 0)}</span></div>
    </button>`;
  }

  private favTiles(v: CardView): TemplateResult {
    const cur = this.host.current;
    const favs = this.favs().filter((c) => c.id !== cur?.id);
    const shown = favs.slice(0, 4);
    return html`<div class="favs">
      <div class="h">
        <span class="lab">Favourites · live</span><span class="lab">${favs.length} on now</span>
      </div>
      ${shown.map((c) => this.nowTile(c, v))}
      ${
        shown.length < 4
          ? html`<button class="ttile addfav press" @click=${() => this.go('channels')}>
              <div class="th add">${PLUS}</div>
              <div class="tt">Add a favourite</div>
              <div class="ts"><span class="a">long-press any channel</span></div>
            </button>`
          : nothing
      }
    </div>`;
  }

  private rails(v: CardView): TemplateResult {
    const l = this.host.list;
    if (!l) return html`<div class="rails"></div>`;
    const at = this.now(v);
    const sport = sportSlots(l, this.host.guide, at);
    const films = filmSlots(l, this.host.guide, at);
    const news = l.channels
      .filter((c) => kindOf(c) === 'news')
      .sort((x, y) => Number(this.favs().includes(y)) - Number(this.favs().includes(x)))
      .slice(0, 8);
    const recent = (v.recents ?? []).filter((c) => c.id !== this.host.current?.id).slice(0, 8);
    const rail = (title: string, note: string, tiles: TemplateResult[]) =>
      tiles.length
        ? html`<div class="railh">
              <h4>${title}</h4>
              <span class="lab">${note}</span>
            </div>
            <div class="railr">${tiles}</div>`
        : nothing;
    return html`<div class="rails">
      ${rail(
        'Sport',
        'now and next',
        sport.map((s) => this.laterTile(s, v)),
      )}
      ${rail(
        'Films tonight',
        films[0] ? `from ${hm(Math.max(films[0].p.start ?? at, at))}` : '',
        films.map((s) => this.laterTile(s, v)),
      )}
      ${rail(
        'News',
        'rolling',
        news.map((c) => this.nowTile(c, v)),
      )}
      ${
        recent.length > 1
          ? rail(
              'Recent',
              'on this device',
              recent.map((c) => this.nowTile(c, v)),
            )
          : nothing
      }
    </div>`;
  }

  // ---- Guide ----

  private guideChannels(): Channel[] {
    const l = this.host.list;
    if (!l) return [];
    const g = this.guideGroup;
    let chs = g === '★' ? this.favs() : g ? l.channels.filter((c) => kindOf(c) === g) : l.channels;
    const q = this.guideQuery.trim().toLowerCase();
    if (q) {
      chs = chs.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.number?.startsWith(q) ||
          this.progs(c).some((p) => p.title.toLowerCase().includes(q)),
      );
    }
    return chs;
  }

  private window(at: number): { w0: number; w1: number } {
    const half = 30 * MIN;
    const w0 = Math.floor((at - half) / half) * half;
    return { w0, w1: w0 + 14 * 60 * MIN };
  }

  private guideParts(v: CardView, a: CardActions): TemplateResult {
    return html`${this.detail(v, a)}${this.toolbar(v)}${this.grid(v)}`;
  }

  private selected(v: CardView): { ch?: Channel; p?: Programme } {
    const l = this.host.list;
    const sel = this.guideSel;
    const ch = (sel && l?.find(sel.id)) || this.host.current;
    if (!ch) return {};
    const list = this.progs(ch);
    const p =
      (sel?.start !== undefined ? list.find((x) => x.start === sel.start) : undefined) ??
      onAt(list, this.now(v));
    return { ch, p };
  }

  private detail(v: CardView, a: CardActions): TemplateResult {
    const { ch, p } = this.selected(v);
    const at = this.now(v);
    if (!ch)
      return html`<div class="det"><p class="muted">Pick a programme in the guide.</p></div>`;
    const list = this.progs(ch);
    const nowOn = !!p && (p.start ?? 0) <= at && (p.end ?? Infinity) > at;
    const later = list.filter((x) => (x.start ?? 0) >= (p?.end ?? at)).slice(0, 2);
    const watching = ch.id === this.host.current?.id;
    const fav = this.favs().includes(ch);
    const when = !p ? 'No guide' : nowOn ? 'Now' : hm(p.start ?? 0);
    return html`<div class="det">
      <div class="dh">
        <span class="lab">${when} · ${shortName(ch)}${ch.number ? ` · ${ch.number}` : ''}</span>
        ${nowOn || p?.live ? this.live() : nothing}
      </div>
      <h3>${p?.title ?? shortName(ch)}</h3>
      <div class="meta">
        ${[genre(p), p?.start && p.end ? `${hm(p.start)}–${hm(p.end)}` : ''].filter(Boolean).join(' · ')}
        ${p?.end && nowOn ? html` · <b>${left(p.end - at)} left</b>` : nothing}
        ${p?.start && !nowOn && p.start > at ? html` · in ${left(p.start - at)}` : nothing}
      </div>
      ${nowOn ? html`<div class="bar"><i style="width:${pct(p, at)}%"></i></div>` : nothing}
      ${p?.desc ? html`<p class="desc">${p.desc}</p>` : nothing}
      ${
        later.length
          ? html`<div class="then">
              ${later.map((x) => html`<div>${mono(hm(x.start ?? 0))}<span>${x.title}</span></div>`)}
            </div>`
          : nothing
      }
      <div class="acts">
        <button
          class="btn ${watching ? 'done' : 'pri'} press"
          ?disabled=${watching}
          @click=${() => this.host.play(ch)}
        >
          ${icon(watching ? 'tv' : 'play')} ${watching ? 'Watching' : 'Watch'}
        </button>
        <button
          class="btn press"
          aria-pressed=${fav ? 'true' : 'false'}
          @click=${() => this.toggleFav(ch)}
        >
          ${icon('star')} ${fav ? 'Favourite' : 'Add to favourites'}
        </button>
        ${
          a.multiview
            ? html`<button class="btn press" @click=${() => a.multiview?.()}>
                ${icon('grid')} Multiview
              </button>`
            : nothing
        }
      </div>
    </div>`;
  }

  /** A mouse wheel turns the chip row sideways: it has no scrollbar and only scrolls across. */
  private readonly chipWheel = (e: WheelEvent): void => {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const max = el.scrollWidth - el.clientWidth;
    const to = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
    if (to === el.scrollLeft) return;
    e.preventDefault();
    el.scrollLeft = to;
  };

  /** Mouse drag scrolls the chip row too; a drag never counts as a click on the chip under it. */
  private readonly chipDrag = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    if (el.scrollWidth <= el.clientWidth) return;
    const x0 = e.clientX;
    const s0 = el.scrollLeft;
    let moved = false;
    const move = (m: PointerEvent) => {
      const dx = m.clientX - x0;
      if (!moved && Math.abs(dx) < 5) return;
      moved = true;
      el.scrollLeft = s0 - dx;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!moved) return;
      const eat = (c: Event) => (c.stopPropagation(), c.preventDefault());
      el.addEventListener('click', eat, { capture: true, once: true });
      setTimeout(() => el.removeEventListener('click', eat, { capture: true }), 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  private chips(
    groups: string[],
    current: string,
    set: (g: string) => void,
    label: (g: string) => string = groupLabel,
  ): TemplateResult[] {
    // "Sky: Entertainment" and "Virgin: Entertainment" would both read "Entertainment".
    const short = groups.map(label);
    const name = (g: string, i: number) =>
      short.indexOf(short[i]) !== short.lastIndexOf(short[i]) ? g : short[i];
    return [
      html`<button
        class="gc"
        aria-pressed=${current === '' ? 'true' : 'false'}
        @click=${() => set('')}
      >
        All
      </button>`,
      html`<button
        class="gc"
        aria-pressed=${current === '★' ? 'true' : 'false'}
        @click=${() => set('★')}
      >
        ${icon('star')} Favourites
      </button>`,
      ...groups.map(
        (g, i) =>
          html`<button
            class="gc"
            aria-pressed=${current === g ? 'true' : 'false'}
            @click=${() => set(g)}
          >
            ${name(g, i)}
          </button>`,
      ),
    ];
  }

  private search(value: string, placeholder: string, set: (q: string) => void): TemplateResult {
    return html`<label class="search">
      ${icon('search')}
      <input
        type="search"
        .value=${live(value)}
        placeholder=${placeholder}
        aria-label=${placeholder}
        @input=${(e: Event) => set((e.target as HTMLInputElement).value)}
        @keydown=${stop}
      />
    </label>`;
  }

  private toolbar(v: CardView): TemplateResult {
    const at = this.now(v);
    const two = 120 * MIN;
    const marks = [1, 2, 3].map((i) => (Math.floor(at / two) + i) * two);
    return html`<div class="tool">
      <div class="jumps">
        <button class="gc" @click=${() => this.jump(at - 20 * MIN, v)}>Now</button>
        ${marks.map((m) => html`<button class="gc" @click=${() => this.jump(m - 10 * MIN, v)}>${hm(m)}</button>`)}
      </div>
      <div class="gchips" @wheel=${this.chipWheel} @pointerdown=${this.chipDrag}>
        ${this.chips(
          KINDS,
          this.guideGroup,
          (g) => {
            this.guideGroup = g;
            this.guideFirst = 0;
            this.host.refresh();
          },
          (k) => KIND_LABEL[k as Kind],
        )}
      </div>
      ${this.search(this.guideQuery, 'Search programmes', (q) => {
        this.guideQuery = q;
        this.guideFirst = 0;
        this.host.refresh();
      })}
    </div>`;
  }

  private gscroll(): HTMLElement | null {
    return this.host.el.shadowRoot?.querySelector('.gscroll') ?? null;
  }

  private px(): number {
    return this.host.el.clientWidth < 760 ? 4 : 5;
  }

  private nameW(): number {
    return this.host.el.clientWidth < 760 ? 120 : 196;
  }

  private jump(at: number, v: CardView): void {
    const g = this.gscroll();
    if (!g) return;
    const { w0 } = this.window(this.now(v));
    g.scrollTo({ left: Math.max(0, ((at - w0) / MIN) * this.px()), behavior: 'smooth' });
  }

  private onGridScroll = (e: Event): void => {
    const g = e.currentTarget as HTMLElement;
    const first = Math.max(0, Math.floor((g.scrollTop - 32) / ROW) - 4);
    if (first !== this.guideFirst) {
      this.guideFirst = first;
      this.host.refresh();
    }
    this.pin(g);
  };

  /**
   * A programme that started before the visible window keeps its title beside the channel
   * column; too narrow to read, it hides instead of showing a fragment.
   */
  private pin(g: HTMLElement): void {
    const x0 = g.scrollLeft + this.nameW();
    g.querySelectorAll<HTMLElement>('.cell').forEach((c) => {
      const l = c.offsetLeft;
      const w = c.offsetWidth;
      const sh = Math.max(0, x0 - l + 4);
      c.style.setProperty('--sh', `${Math.min(sh, w)}px`);
      c.classList.toggle('gone', w - sh < 56);
    });
    g.querySelectorAll<HTMLElement>('.ruler span:not(.nowtag)').forEach((r) =>
      r.classList.toggle('gone', r.offsetLeft < x0 + 2),
    );
  }

  private grid(v: CardView): TemplateResult {
    const at = this.now(v);
    const { w0, w1 } = this.window(at);
    const px = this.px();
    const nw = this.nameW();
    const x = (ms: number) => nw + ((ms - w0) / MIN) * px;
    const chs = this.guideChannels();
    const visible = Math.ceil((this.host.el.clientHeight || 900) / ROW) + 10;
    const first = Math.min(this.guideFirst, Math.max(0, chs.length - visible));
    const rows = chs.slice(first, first + visible);
    const width = x(w1);
    const marks: number[] = [];
    for (let m = w0; m < w1; m += 30 * MIN) if (Math.abs(m - at) > 9 * MIN) marks.push(m);
    const cur = this.host.current?.id;
    const sel = this.selected(v);
    const rowsT = rows.map((ch, i) => {
      const list = this.progs(ch).filter((p) => (p.end ?? Infinity) > w0 && (p.start ?? 0) < w1);
      return html`<div class="grow" style="top:${32 + (first + i) * ROW}px;width:${width}px">
        <button class="gname ${ch.id === cur ? 'on' : ''}" @click=${this.tap(ch)}>
          ${this.logoPlate(ch, 'sm')}
          <span class="gn"><span class="mono">${ch.number ?? ''}</span>${shortName(ch)}</span>
        </button>
        ${
          list.length
            ? list.map((p) => {
                const s = Math.max(p.start ?? w0, w0);
                const e = Math.min(p.end ?? w1, w1);
                const st = (p.end ?? 0) <= at ? 'past' : (p.start ?? 0) <= at ? 'now' : '';
                const on = sel.ch?.id === ch.id && sel.p === p;
                return html`<button
                  class="cell ${st} ${on ? 'sel' : ''}"
                  style="left:${x(s) + 2}px;width:${Math.max(8, ((e - s) / MIN) * px - 4)}px;${
                    st === 'now' ? `--p:${pct(p, at)}%` : ''
                  }"
                  @click=${() => {
                    this.guideSel = { id: ch.id, start: p.start };
                    this.host.refresh();
                  }}
                  @dblclick=${this.tap(ch)}
                >
                  <span class="cx"
                    ><small>${hm(p.start ?? 0)}${p.live ? ' · LIVE' : ''}</small>${
                      p.live ? html`<i class="lvd"></i>` : nothing
                    }${p.title}</span
                  >
                </button>`;
              })
            : html`<span class="cell empty" style="left:${x(w0) + 2}px;width:${x(w1) - x(w0) - 4}px"
                ><span class="cx">No guide for this channel</span></span
              >`
        }
      </div>`;
    });
    if (!this.guideScrolled) {
      this.guideScrolled = true;
      requestAnimationFrame(() => {
        const g = this.gscroll();
        if (!g) return;
        g.scrollLeft = Math.max(0, ((at - 20 * MIN - w0) / MIN) * px);
        this.pin(g);
      });
    } else {
      requestAnimationFrame(() => {
        const g = this.gscroll();
        if (g) this.pin(g);
      });
    }
    return html`<div class="grid">
      <div class="gscroll" @scroll=${this.onGridScroll}>
        <div class="gin" style="width:${width}px;height:${32 + chs.length * ROW + 160}px">
          <div class="ruler" style="width:${width}px">
            <i class="corner"></i>
            ${marks.map((m) => html`<span style="left:${x(m)}px">${hm(m)}</span>`)}
            <span class="nowtag" style="left:${x(at)}px">${hm(at)}</span>
          </div>
          ${rowsT}
          <div class="nowline" style="left:${x(at)}px"></div>
        </div>
      </div>
    </div>`;
  }

  // ---- Channels ----

  private channelsPage(v: CardView): TemplateResult {
    const l = this.host.list;
    const at = this.now(v);
    const g = this.chGroup;
    let chs = !l
      ? []
      : g === '★'
        ? this.favs()
        : g
          ? l.channels.filter((c) => c.group === g)
          : l.channels;
    const q = this.chQuery.trim().toLowerCase();
    if (q) chs = chs.filter((c) => c.name.toLowerCase().includes(q) || c.number?.startsWith(q));
    return html`<div class="bar2">
        ${this.search(this.chQuery, 'Search channels', (s) => {
          this.chQuery = s;
          this.host.refresh();
        })}
        <div class="gchips" @wheel=${this.chipWheel} @pointerdown=${this.chipDrag}>
          ${this.chips(l?.groups ?? [], g, (x) => {
            this.chGroup = x;
            this.host.refresh();
          })}
        </div>
      </div>
      <div class="cols">${chs.map((c) => this.row(c, at, true))}</div>`;
  }

  private row(ch: Channel, at: number, thenFull: boolean): TemplateResult {
    const list = this.progs(ch);
    const p = onAt(list, at);
    const n = after(list, at);
    const on = ch.id === this.host.current?.id;
    return html`<button
      class="row press ${on ? 'on' : ''}"
      @click=${this.tap(ch, thenFull)}
      @pointerdown=${this.pressStart(ch)}
      @pointerup=${this.pressEnd}
      @pointerleave=${this.pressEnd}
      @contextmenu=${(e: Event) => e.preventDefault()}
    >
      ${this.logoPlate(ch)}
      <span class="rm">
        <span class="nm"
          >${mono(ch.number)} ${shortName(ch)}
          ${on ? html`<span class="eq"><i></i><i></i><i></i></span>` : nothing}
          ${this.favs().includes(ch) ? html`<span class="fav">${icon('star')}</span>` : nothing}</span
        >
        <span class="pg">${p?.title ?? groupLabel(ch.group)}</span>
        ${p ? html`<span class="bar"><i style="width:${pct(p, at)}%"></i></span>` : nothing}
      </span>
      ${n ? html`<span class="nx">${mono(hm(n.start ?? 0))}${n.title}</span>` : nothing}
    </button>`;
  }

  // ---- the stage's overlays ----

  private overlay(view: AppView, v: CardView, a: CardActions): TemplateResult {
    const zap =
      this.zapCount && this.host.current
        ? keyed(this.zapCount, this.zapTpl(this.host.current))
        : nothing;
    if (this.embed) return html`${this.embedOverlay(v, a)}${renderCenter(v, a)}`;
    if (view === 'full') return html`${this.theatre(v, a)}${zap}`;
    if (view === 'guide') return html`${this.preview(v, a)}${zap}${this.numOsd(v)}`;
    return html`${this.hero(v, a)}${zap}${this.numOsd(v)}`;
  }

  private zapTpl(ch: Channel): TemplateResult {
    return html`<div class="zap" aria-hidden="true">
      ${ch.logo ? html`<img src=${ch.logo} alt="" />` : html`<b>${shortName(ch)}</b>`}
      <span>${ch.number ?? ''}</span>
    </div>`;
  }

  /** While digits are typed outside full screen: a small glass card naming the channel. */
  private numOsd(v: CardView): TemplateResult | typeof nothing {
    const e = v.numberEntry;
    if (!e?.digits) return nothing;
    const c = e.candidates[0];
    return html`<div class="numosd glass" role="status">
      <span class="d">${e.digits.padEnd(3, '–')}</span>
      ${
        c
          ? html`${this.logoPlate(c, 'sm')}<span class="nm"
                >${shortName(c)}<small>${onAt(this.progs(c), v.now)?.title ?? ''}</small></span
              >`
          : html`<span class="nm dim">No channel ${e.digits}</span>`
      }
    </div>`;
  }

  private nowLine(v: CardView): { p?: Programme; n?: Programme } {
    return { p: v.nowNext?.now, n: v.nowNext?.next };
  }

  private hero(v: CardView, a: CardActions): TemplateResult {
    const ch = v.channel;
    const { p, n } = this.nowLine(v);
    const at = this.now(v);
    const showInfo =
      v.ui === 'playing' || v.ui === 'ready' || v.ui === 'connecting' || v.ui === 'reconnecting';
    return html`${
      showInfo && ch
        ? html`<div class="over">
            <div class="r">
              <span class="idl"
                >${v.ui === 'playing' ? this.live() : nothing}${this.logoPlate(ch, 'xl')}${
                  ch.number ? html`<span class="lab">${ch.number}</span>` : nothing
                }</span
              >
              <span class="hb">
                ${
                  a.lastChannel && v.previousChannel
                    ? html`<button
                        class="glass press"
                        @click=${() => a.lastChannel?.()}
                        aria-label="Last channel"
                      >
                        ${icon('last')}
                      </button>`
                    : nothing
                }
                <button
                  class="glass press"
                  @click=${a.toggleMute}
                  aria-label=${v.muted ? 'Unmute' : 'Mute'}
                >
                  ${icon(v.muted ? 'volumeOff' : 'volumeHigh')}
                </button>
                ${this.settingsButton(v, a, 'glass press', true)}
                <button class="glass press" @click=${this.full} aria-label="Full screen">
                  ${icon('fullscreen')}
                </button>
              </span>
            </div>
            <div>
              <h3>${p?.title ?? shortName(ch)}</h3>
              <div class="meta">
                ${[genre(p), p?.start && p.end ? `${hm(p.start)}–${hm(p.end)}` : ''].filter(Boolean).join(' · ')}
                ${p?.end ? html` · <b>${left(p.end - at)} left</b>` : nothing}${n ? ` · then ${n.title}` : ''}
              </div>
              ${p ? html`<div class="bar"><i style="width:${pct(p, at)}%"></i></div>` : nothing}
            </div>
          </div>`
        : nothing
    }
    ${this.settingsWrap(v, a, 'at-hero')}
    ${v.ui === 'playing' && !v.mutedByPolicy && !v.needsGesture && !v.buffering ? nothing : renderCenter(v, a)}`;
  }

  /** The settings button (buffering, quality, audio…) wherever the app shows playback controls. */
  private settingsButton(
    v: CardView,
    a: CardActions,
    cls: string,
    hero = false,
  ): TemplateResult | typeof nothing {
    const s = v.settings;
    if (!s || !a.settings) return nothing;
    return html`<button
      class="${cls} set-btn"
      @click=${(e: Event) => {
        e.stopPropagation();
        // A phone's hero is too short for the panel: open it in full screen instead.
        const frame = (e.currentTarget as HTMLElement).closest('.frame');
        if (hero && !s.open && frame && frame.clientHeight < HERO_PANEL_MIN_PX) this.full();
        a.settings?.toggle(e);
      }}
      aria-pressed=${s.open ? 'true' : 'false'}
      aria-label="Settings"
      title="Playback settings"
    >
      ${icon('settings')}
    </button>`;
  }

  /** The shared settings panel, placed for the hero, the full screen or the embed. */
  private settingsWrap(
    v: CardView,
    a: CardActions,
    where: string,
  ): TemplateResult | typeof nothing {
    return v.settings?.open
      ? html`<div class="setwrap ${where}" @click=${stop}>${settingsPanel(v, a)}</div>`
      : nothing;
  }

  /** What the full screen's settings chip says: the quality playing, else the buffering mode. */
  private settingsLabel(v: CardView): string {
    const s = v.settings;
    const q = s?.quality;
    if (q) return q.choice === 'auto' ? `Auto${q.playing ? ` · ${q.playing}` : ''}` : q.choice;
    return s?.buffer === 'stable' ? 'Stable' : s?.buffer === 'low' ? 'Low delay' : 'Auto buffer';
  }

  private preview(v: CardView, a: CardActions): TemplateResult {
    const ch = v.channel;
    const { p } = this.nowLine(v);
    return html`${
      ch && (v.ui === 'playing' || v.ui === 'ready')
        ? html`<div class="tl">${v.ui === 'playing' ? this.live() : nothing}</div>
            <div class="pover">
              <div class="pt">
                <span class="idl"
                  >${this.logoPlate(ch, 'xl')}<span class="lab">${ch.number ?? ''}</span></span
                >
                <span class="t">${p?.title ?? shortName(ch)}</span>
              </div>
              <span class="hb">
                ${
                  a.lastChannel && v.previousChannel
                    ? html`<button
                        class="glass press"
                        @click=${() => a.lastChannel?.()}
                        aria-label="Last channel"
                      >
                        ${icon('last')}
                      </button>`
                    : nothing
                }
                <button
                  class="glass press"
                  @click=${a.toggleMute}
                  aria-label=${v.muted ? 'Unmute' : 'Mute'}
                >
                  ${icon(v.muted ? 'volumeOff' : 'volumeHigh')}
                </button>
                <button class="glass press" @click=${this.full} aria-label="Full screen">
                  ${icon('fullscreen')}
                </button>
              </span>
            </div>`
        : nothing
    }
    ${v.ui === 'playing' && !v.mutedByPolicy && !v.needsGesture && !v.buffering ? nothing : renderCenter(v, a)}`;
  }

  /** Full screen: ident top left, clock top right, one glass control bar along the bottom. */
  private theatre(v: CardView, a: CardActions): TemplateResult {
    const ch = v.channel;
    const { p, n } = this.nowLine(v);
    const at = this.now(v);
    const typing = v.numberEntry?.digits;
    const playingish = v.ui === 'playing' || v.ui === 'connecting' || v.ui === 'reconnecting';
    const s = v.settings;
    return html`<div class="scrim t"></div>
      <div class="scrim b"></div>
      ${
        ch && v.ui !== 'error'
          ? html`<div class="t-ident fade">
              <div class="row">
                ${this.logoPlate(ch, 'xl')}${ch.number ? html`<span class="lab">${ch.number}</span>` : nothing}${
                  v.ui === 'playing' ? this.live() : nothing
                }
              </div>
              <h3>${p?.title ?? shortName(ch)}</h3>
              <div class="meta">
                ${[genre(p), p?.start && p.end ? `${hm(p.start)}–${hm(p.end)}` : ''].filter(Boolean).join(' · ')}
                ${p?.end ? html` · <b>${left(p.end - at)} left</b>` : nothing}
              </div>
              ${p ? html`<div class="bar"><i style="width:${pct(p, at)}%"></i></div>` : nothing}
              ${n ? html`<div class="next"><span class="lab">Up next ${hm(n.start ?? 0)}</span>${n.title}</div>` : nothing}
            </div>`
          : nothing
      }
      <div class="tr fade">
        <div class="clock">${hm(at)}</div>
        <div class="chips">
          ${
            v.sleep
              ? html`<span class="chip glass">${icon('sleep')} Stops ${hm(v.sleep.endsAt)}</span>`
              : nothing
          }
          ${
            s && a.settings
              ? html`<button
                  class="chip glass press"
                  @click=${a.settings.toggle}
                  aria-expanded=${s.open ? 'true' : 'false'}
                  title="Playback settings"
                >
                  ${icon('settings')} ${this.settingsLabel(v)}
                </button>`
              : nothing
          }
        </div>
      </div>
      ${
        typing
          ? html`<div class="t-osd" role="status">
              <div class="d">
                ${typing}<span>${'_'.repeat(Math.max(0, 3 - typing.length))}</span>
              </div>
              <div class="m">
                ${
                  v.numberEntry?.candidates.length
                    ? v.numberEntry.candidates
                        .slice(0, 3)
                        .map((c) => `${c.number} ${shortName(c)}`)
                        .join(' · ')
                    : 'No channel with that number'
                }
              </div>
            </div>`
          : nothing
      }
      ${v.ui === 'error' ? nothing : this.controls(v, a, playingish)}
      ${this.rail ? this.railPanel(v) : nothing}
      ${this.keypad && a.pressDigit ? this.keypadPanel(a) : nothing}
      ${v.sleepMenuOpen ? this.sleepMenu(v, a, p) : nothing} ${this.settingsWrap(v, a, 'at-full')}
      <button class="dockpill glass press" @click=${this.unfull} aria-label="Show the dock">
        <span class="orb">${icon('tv')}</span><span class="t">Live TV</span>${icon('chevronUp')}
      </button>
      ${
        v.ui === 'playing' &&
        !v.mutedByPolicy &&
        !v.needsGesture &&
        !v.buffering &&
        !v.sleep?.warning
          ? nothing
          : renderCenter(v, a)
      }`;
  }

  private controls(v: CardView, a: CardActions, active: boolean): TemplateResult {
    const prev = v.previousChannel;
    const vol = Math.round((v.muted ? 0 : (v.volume ?? 1)) * 100);
    return html`<div class="t-ctl glass fade" @click=${stop}>
      ${
        a.lastChannel && prev
          ? html`<button
                class="cb wide press"
                @click=${() => a.lastChannel?.()}
                aria-label="Back to ${shortName(prev)}"
              >
                ${icon('last')}<span
                  >${shortName(prev)}<br /><small>${prev.number ?? ''}</small></span
                >
              </button>
              <span class="sep"></span>`
          : nothing
      }
      ${
        v.canStep
          ? html`<button class="cb press" @click=${a.channelDown} aria-label="Previous channel">
                ${icon('chevronDown')}
              </button>
              <button class="cb press" @click=${a.channelUp} aria-label="Next channel">
                ${icon('chevronUp')}
              </button>
              <span class="sep"></span>`
          : nothing
      }
      <button
        class="cb main press"
        @click=${active ? a.stop : a.play}
        aria-label=${active ? 'Stop' : 'Play'}
      >
        ${icon(active ? 'stop' : 'play')}
      </button>
      <span class="sep"></span>
      <div class="vol">
        <button class="cb press" @click=${a.toggleMute} aria-label=${v.muted ? 'Unmute' : 'Mute'}>
          ${icon(v.muted ? 'volumeOff' : vol < 50 ? 'volumeLow' : 'volumeHigh')}
        </button>
        ${
          a.setVolume
            ? html`<input
                class="vtrack"
                type="range"
                min="0"
                max="100"
                step="1"
                aria-label="Volume"
                .value=${live(String(vol))}
                style="--vol:${vol}%"
                @input=${(e: Event) => a.setVolume?.(Number((e.target as HTMLInputElement).value) / 100)}
              />`
            : nothing
        }
      </div>
      <span class="sep"></span>
      ${
        a.setSleep
          ? html`<button
              class="cb press"
              aria-pressed=${v.sleep || v.sleepMenuOpen ? 'true' : 'false'}
              @click=${a.toggleSleepMenu}
              aria-label="Sleep timer"
            >
              ${icon('sleep')}
            </button>`
          : nothing
      }
      ${
        a.pressDigit && !this.embed
          ? html`<button
              class="cb kpb press"
              aria-pressed=${this.keypad ? 'true' : 'false'}
              @click=${() => {
                this.keypad = !this.keypad;
                this.rail = false;
                this.host.refresh();
              }}
              aria-label="Keypad"
            >
              ${icon('keypad')}
            </button>`
          : nothing
      }
      ${
        a.multiview && !this.embed
          ? html`<button
              class="cb mvb press"
              @click=${() => a.multiview?.()}
              aria-label="Multiview"
            >
              ${icon('grid')}
            </button>`
          : nothing
      }
      ${
        v.hasGuide && !this.embed
          ? html`<button
              class="cb press"
              aria-pressed=${this.rail ? 'true' : 'false'}
              @click=${() => {
                this.rail = !this.rail;
                this.keypad = false;
                this.host.refresh();
              }}
              aria-label="Channels"
            >
              ${icon('list')}
            </button>`
          : nothing
      }
      ${this.settingsButton(v, a, 'cb press')}
      ${
        this.embed
          ? html`<button
              class="cb press"
              @click=${a.toggleFullscreen}
              aria-label=${v.fullscreen ? 'Exit full screen' : 'Full screen'}
            >
              ${icon(v.fullscreen ? 'fullscreenExit' : 'fullscreen')}
            </button>`
          : html`<button
              class="cb press"
              @click=${this.unfull}
              aria-label=${`Back to ${this.from === 'guide' ? 'the guide' : this.from === 'channels' ? 'channels' : 'On now'}`}
            >
              ${icon('fullscreenExit')}
            </button>`
      }
    </div>`;
  }

  private sleepMenu(v: CardView, a: CardActions, p: Programme | undefined): TemplateResult {
    const at = this.now(v);
    const set = (m: number) => (e: Event) => {
      e.stopPropagation();
      a.setSleep?.(m);
      a.toggleSleepMenu();
    };
    const left = v.sleep ? Math.ceil(v.sleep.remainingMs / MIN) : 0;
    const endMin = p?.end ? Math.ceil((p.end - at) / MIN) + 1 : 0;
    return html`<div class="menu glass" @click=${stop}>
      <span class="lab">Stop playing after</span>
      <div class="opts">
        <button aria-pressed=${!v.sleep ? 'true' : 'false'} @click=${set(0)}>Off</button>
        ${SLEEP_MINUTES.map(
          (m) =>
            html`<button
              aria-pressed=${v.sleep && Math.abs(left - m) <= 1 ? 'true' : 'false'}
              @click=${set(m)}
            >
              ${m === 60 ? '1 hour' : `${m} min`}
            </button>`,
        )}
        ${
          endMin > 1
            ? html`<button
                class="full"
                aria-pressed=${v.sleep && Math.abs(left - endMin) <= 1 ? 'true' : 'false'}
                @click=${set(endMin)}
              >
                End of programme<small>${p?.title} · ${hm(p?.end ?? 0)}</small>
              </button>`
            : nothing
        }
      </div>
    </div>`;
  }

  private keypadPanel(a: CardActions): TemplateResult {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '↵'];
    return html`<div class="kp glass" @click=${stop}>
      ${keys.map(
        (k) =>
          html`<button
            class="press"
            aria-label=${k === '⌫' ? 'Delete' : k === '↵' ? 'Tune' : k}
            @click=${() => {
              if (k === '⌫') this.host.deleteDigit();
              else if (k === '↵') {
                a.commitDigits?.();
                this.keypad = false;
              } else a.pressDigit?.(k);
              this.host.refresh();
            }}
          >
            ${k}
          </button>`,
      )}
    </div>`;
  }

  private railPanel(v: CardView): TemplateResult {
    const l = this.host.list;
    const at = this.now(v);
    const g = this.railGroup;
    let chs = !l
      ? []
      : g === '★'
        ? this.favs()
        : g
          ? l.channels.filter((c) => c.group === g)
          : l.channels;
    const q = this.railQuery.trim().toLowerCase();
    if (q) chs = chs.filter((c) => c.name.toLowerCase().includes(q) || c.number?.startsWith(q));
    return html`<div class="rail glass" @click=${stop}>
      <div class="hd">
        <h4>Channels</h4>
        <button
          class="x press"
          aria-label="Close"
          @click=${() => {
            this.rail = false;
            this.host.refresh();
          }}
        >
          ${icon('close')}
        </button>
      </div>
      ${this.search(this.railQuery, 'Search channels', (s) => {
        this.railQuery = s;
        this.host.refresh();
      })}
      <div class="gchips" @wheel=${this.chipWheel} @pointerdown=${this.chipDrag}>
        ${this.chips(l?.groups ?? [], g, (x) => {
          this.railGroup = x;
          this.host.refresh();
        })}
      </div>
      <div class="list">${chs.slice(0, 120).map((c) => this.row(c, at, false))}</div>
    </div>`;
  }

  /** `chrome: embed`: the control glass only, on tap, for pages that choose the channel. */
  private embedOverlay(v: CardView, a: CardActions): TemplateResult | typeof nothing {
    if (v.ui === 'preview' || v.ui === 'empty' || v.ui === 'error') return nothing;
    const active = v.ui === 'playing' || v.ui === 'connecting' || v.ui === 'reconnecting';
    return html`<div class="scrim b"></div>
      ${this.controls(v, a, active)}
      ${v.sleepMenuOpen ? this.sleepMenu(v, a, v.nowNext?.now) : nothing}
      ${this.settingsWrap(v, a, 'at-embed')}`;
  }

  // ---- dock ----

  private dock(view: AppView, a: CardActions): TemplateResult {
    const tabs: Array<[AppView | 'mv', Parameters<typeof icon>[0], string]> = [
      ['now', 'play', 'On now'],
      ['guide', 'list', 'Guide'],
      ['channels', 'star', 'Channels'],
    ];
    if (a.multiview) tabs.push(['mv', 'grid', 'Multiview']);
    return html`<nav class="cdock glass" aria-label="Live TV">
      <button class="orbw press" @click=${this.openHouseholdDock} aria-label="Household navigation">
        <span class="orb">${icon('tv')}</span><span class="t">Live TV</span>
      </button>
      ${tabs.map(
        ([k, i, label]) =>
          html`<button
            class="tab press ${k === view ? 'sel' : ''}"
            aria-current=${k === view ? 'page' : 'false'}
            @click=${() => {
              if (k === 'mv') a.multiview?.();
              else this.go(k);
            }}
          >
            ${icon(i)}<span>${label}</span>
          </button>`,
      )}
    </nav>`;
  }
}

function initials(name: string): string {
  return name
    .replace(/\b(hd|sd|fhd|uhd|4k)\b/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();
}
