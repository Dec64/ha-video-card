import type { css, html, LitElement, nothing, PropertyValues, svg, TemplateResult } from 'lit';
import type { Channel, ChannelList } from './channels';
import type { format, PlaybackError } from './errors';
import type { icon } from './icons';
import type { PickerState } from './picker';
import type { PlaybackSession, SessionStatus } from './session';
import type { StreamRequest, StreamSource } from './types';

export const MULTIVIEW_TAG = 'stream-card-multiview';

/** What a tile plays: the request (for handing back to the card), its URL and its channel. */
export interface TileItem {
  request: StreamRequest;
  source: StreamSource;
  channel?: Channel;
}

export interface TileSettings {
  startTimeoutMs: number;
  maxAttempts: number;
  debug: boolean;
}

/** Turns a picked channel into what a tile plays; throws an Error with a user message. */
export type TileResolver = (ch: Channel) => TileItem;

/** Decoded and dropped frame counts since the previous sample, summed over playing tiles. */
export interface FrameSample {
  decoded: number;
  dropped: number;
}

/**
 * True when the last two samples both dropped more than a quarter of their frames: the device
 * can't decode this many streams at once (Fire HD 8 hardware decoders run out, and the
 * software fallback can't keep up). Two in a row so one hiccup doesn't count.
 */
export function isStruggling(samples: FrameSample[]): boolean {
  if (samples.length < 2) return false;
  return samples.slice(-2).every((s) => {
    const total = s.decoded + s.dropped;
    return total >= 30 && s.dropped / total > 0.25;
  });
}

const SAMPLE_MS = 2000;

/** One grid cell: its own <video>, created once, and at most one session on it. */
class Tile {
  readonly video: HTMLVideoElement;
  item?: TileItem;
  session?: PlaybackSession;
  status?: SessionStatus;
  error?: PlaybackError;
  lastFrames?: { decoded: number; dropped: number };

  constructor() {
    const v = document.createElement('video');
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.preload = 'none';
    v.controls = false;
    v.muted = true;
    (v as HTMLVideoElement & { disableRemotePlayback: boolean }).disableRemotePlayback = true;
    this.video = v;
  }
}

/**
 * What the grid borrows from the card's bundle. Importing these here would make the build
 * split Lit and the session code out of stream-card.js into a shared chunk; borrowing them
 * keeps the entry whole and this chunk small.
 */
export interface MultiviewDeps {
  LitElement: typeof LitElement;
  html: typeof html;
  css: typeof css;
  nothing: typeof nothing;
  svg: typeof svg;
  PlaybackSession: typeof PlaybackSession;
  icon: typeof icon;
  format: typeof format;
}

export type StreamCardMultiview = InstanceType<ReturnType<typeof createMultiview>>;

export function defineMultiview(deps: MultiviewDeps): void {
  if (!customElements.get(MULTIVIEW_TAG))
    customElements.define(MULTIVIEW_TAG, createMultiview(deps));
}

/**
 * The multiview grid: 2–4 tiles, each its own Dispatcharr connection, one of them with sound.
 * The card decides whether the grid may hold streams (`setAllowed`, from its `evaluate()`);
 * the grid only starts tiles while allowed and stops every tile synchronously when not.
 * Fires `multiview-exit` (detail: { item?: TileItem }) to go back to the single picture.
 */
function createMultiview({
  LitElement,
  html,
  css,
  nothing,
  svg,
  PlaybackSession,
  icon,
  format,
}: MultiviewDeps) {
  // Icons only the grid uses (Material Design Icons, Apache 2.0) stay out of the entry chunk.
  const PLUS = 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z';
  const EXPAND =
    'M10,21V19H6.41L10.91,14.5L9.5,13.09L5,17.59V14H3V21H10M14.5,10.91L19,6.41V10H21V3H14V5H17.59L13.09,9.5L14.5,10.91Z';
  const own = (d: string) =>
    svg`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d=${d}></path></svg>`;

  return class StreamCardMultiview extends LitElement {
    static override properties = {
      list: { attribute: false },
      listState: { attribute: false },
      listMessage: { attribute: false },
      maxTiles: { attribute: false },
      _ui: { state: true },
    };

    declare list?: ChannelList;
    declare listState: PickerState | 'idle';
    declare listMessage?: string;
    declare maxTiles: number;
    declare private _ui: number;

    settings: TileSettings = { startTimeoutMs: 20_000, maxAttempts: 5, debug: false };
    resolve?: TileResolver;

    private readonly tiles: Tile[] = [];
    private allowed = false;
    private slots = 2;
    private audio = 0;
    private soundOn = true;
    private selected?: number;
    private pickFor?: number;
    private fullscreen = false;
    private samples: FrameSample[] = [];
    private struggling = false;
    private sampler?: ReturnType<typeof setInterval>;

    constructor() {
      super();
      this.listState = 'idle';
      this.maxTiles = 2;
      this._ui = 0;
    }

    // ---- called by the card ----

    /** Starts multiview with `first` in the first tile, holding the sound. */
    open(first: TileItem | undefined, muted: boolean): void {
      this.haltAll();
      for (const t of this.tiles) {
        t.item = undefined;
        t.error = undefined;
      }
      this.slots = Math.min(2, this.maxTiles);
      this.audio = 0;
      this.soundOn = !muted;
      this.selected = undefined;
      this.resetStruggle();
      if (first) this.tile(0).item = first;
      // Nothing to show yet: open the channel picker for the first tile.
      this.pickFor = first ? undefined : 0;
      this.sync();
    }

    /** Whether tiles may hold streams. False stops every tile at once. */
    setAllowed(allowed: boolean): void {
      if (allowed === this.allowed) return;
      this.allowed = allowed;
      this.sync();
    }

    /** Stops every tile now (the card is leaving multiview). */
    halt(): void {
      this.allowed = false;
      this.haltAll();
      this.refresh();
    }

    /** The tile to carry back to the single picture: the one with sound, else the first. */
    get mainItem(): TileItem | undefined {
      return this.tiles[this.audio]?.item ?? this.tiles.find((t) => t.item)?.item;
    }

    /** Tiles holding a Dispatcharr connection right now. */
    get openCount(): number {
      return this.tiles.filter((t) => t.session).length;
    }

    get debugInfo() {
      return {
        allowed: this.allowed,
        slots: this.slots,
        audio: this.audio,
        soundOn: this.soundOn,
        open: this.openCount,
        struggling: this.struggling,
        pickFor: this.pickFor,
        tiles: this.tiles.slice(0, this.slots).map((t) => ({
          url: t.item?.source.url,
          title: t.item?.source.title,
          state: t.status?.state,
          muted: t.session ? t.video.muted : undefined,
          error: t.error?.message,
        })),
      };
    }

    // ---- tiles ----

    private tile(i: number): Tile {
      while (this.tiles.length <= i) this.tiles.push(new Tile());
      return this.tiles[i];
    }

    private refresh(): void {
      this._ui++;
    }

    private tileMuted(i: number): boolean {
      return !(this.soundOn && i === this.audio);
    }

    /** Starts or stops each tile to match `allowed`; never two sessions on one tile. */
    private sync(): void {
      for (let i = 0; i < this.tiles.length; i++) {
        const t = this.tiles[i];
        const want = this.allowed && i < this.slots && !!t.item && !t.error;
        if (want && !t.session) this.startTile(i);
        else if (!want && t.session) this.stopTile(t);
      }
      if (this.allowed && this.openCount > 0) this.startSampler();
      else this.stopSampler();
      this.refresh();
    }

    private startTile(i: number): void {
      const t = this.tile(i);
      if (!t.item) return;
      t.error = undefined;
      t.lastFrames = undefined;
      const session = new PlaybackSession(t.video, t.item.source, {
        startTimeoutMs: this.settings.startTimeoutMs,
        maxAttempts: this.settings.maxAttempts,
        muted: this.tileMuted(i),
        debug: this.settings.debug,
        onStatus: (s) => this.onStatus(t, session, s),
      });
      t.session = session;
      t.status = session.status;
      session.start();
    }

    private stopTile(t: Tile): void {
      const s = t.session;
      t.session = undefined;
      t.status = undefined;
      t.lastFrames = undefined;
      if (s) void s.destroy();
    }

    private haltAll(): void {
      for (const t of this.tiles) this.stopTile(t);
      this.stopSampler();
    }

    private onStatus(t: Tile, session: PlaybackSession, s: SessionStatus): void {
      if (t.session !== session) return;
      t.status = s;
      if (s.state === 'error') {
        // Only this tile stops; the others keep playing.
        t.error = s.error;
        this.stopTile(t);
        this.sync();
        return;
      }
      this.refresh();
    }

    private setItem(i: number, item: TileItem | undefined): void {
      const t = this.tile(i);
      this.stopTile(t);
      t.item = item;
      t.error = undefined;
      this.resetStruggle();
      if (item && !this.tiles[this.audio]?.item) this.moveSound(i);
      this.sync();
    }

    private moveSound(i: number): void {
      this.audio = i;
      this.tiles.forEach((t, n) => t.session?.setMuted(this.tileMuted(n)));
    }

    // ---- frame-drop sampling (decoder overload) ----

    private resetStruggle(): void {
      this.samples = [];
      this.struggling = false;
      for (const t of this.tiles) t.lastFrames = undefined;
    }

    private startSampler(): void {
      if (this.sampler) return;
      this.sampler = setInterval(() => this.sample(), SAMPLE_MS);
    }

    private stopSampler(): void {
      clearInterval(this.sampler);
      this.sampler = undefined;
    }

    private sample(): void {
      const sum: FrameSample = { decoded: 0, dropped: 0 };
      for (const t of this.tiles) {
        if (t.status?.state !== 'playing') continue;
        const st = t.session?.getStats();
        if (st?.decodedFrames === undefined) continue;
        const now = { decoded: st.decodedFrames, dropped: st.droppedFrames ?? 0 };
        if (t.lastFrames) {
          sum.decoded += Math.max(0, now.decoded - t.lastFrames.decoded);
          sum.dropped += Math.max(0, now.dropped - t.lastFrames.dropped);
        }
        t.lastFrames = now;
      }
      this.samples = [...this.samples.slice(-4), sum];
      if (!this.struggling && isStruggling(this.samples)) {
        this.struggling = true;
        this.refresh();
      }
    }

    // ---- element lifecycle ----

    override disconnectedCallback(): void {
      // The card's evaluate() stops tiles too; this makes sure a detached grid never plays.
      this.allowed = false;
      this.haltAll();
      document.removeEventListener('fullscreenchange', this.onFullscreenChange);
      super.disconnectedCallback();
    }

    override connectedCallback(): void {
      super.connectedCallback();
      document.addEventListener('fullscreenchange', this.onFullscreenChange);
    }

    protected override updated(_changed: PropertyValues): void {
      // Each tile's <video> lives outside Lit's templates, so re-renders never touch playback.
      this.renderRoot.querySelectorAll<HTMLElement>('.video-host').forEach((host) => {
        const t = this.tiles[Number(host.dataset.i)];
        if (t && t.video.parentElement !== host) host.appendChild(t.video);
      });
    }

    // ---- user actions ----

    private exit(item: TileItem | undefined): void {
      this.dispatchEvent(new CustomEvent('multiview-exit', { detail: { item } }));
    }

    private setLayout(slots: number): void {
      if (slots === this.slots) return;
      if (slots < this.slots) {
        // Keep the tile with sound: move it into the remaining slots if it would be dropped.
        if (this.audio >= slots && this.tiles[this.audio]?.item) {
          const keep = this.tiles[this.audio];
          const into = this.tile(slots - 1);
          this.stopTile(into);
          this.stopTile(keep);
          into.item = keep.item;
          into.error = undefined;
          keep.item = undefined;
          this.audio = slots - 1;
        }
        for (let i = slots; i < this.tiles.length; i++) {
          this.stopTile(this.tiles[i]);
          this.tiles[i].item = undefined;
          this.tiles[i].error = undefined;
        }
        if (this.audio >= slots) this.audio = 0;
        if (this.selected !== undefined && this.selected >= slots) this.selected = undefined;
        if (this.pickFor !== undefined && this.pickFor >= slots) this.pickFor = undefined;
      }
      this.slots = slots;
      this.resetStruggle();
      this.sync();
    }

    private onSound(i: number, e: Event): void {
      e.stopPropagation();
      const t = this.tiles[i];
      if (i === this.audio) {
        // The tile with sound: its button mutes and unmutes.
        if (t?.status?.mutedByPolicy) {
          this.soundOn = true;
          void t.session?.resumeFromGesture(true);
        } else {
          this.soundOn = !this.soundOn;
          t?.session?.setMuted(this.tileMuted(i));
        }
      } else {
        this.soundOn = true;
        this.moveSound(i);
        // A tap is a gesture, so a browser that blocked sound lets it through now.
        if (t?.status?.mutedByPolicy) void t.session?.resumeFromGesture(true);
      }
      this.refresh();
    }

    private onTileClick(i: number): void {
      this.selected = this.selected === i ? undefined : i;
      this.refresh();
    }

    private openPicker(i: number, e?: Event): void {
      e?.stopPropagation();
      this.pickFor = i;
      this.selected = undefined;
      this.refresh();
    }

    private closePicker = (e?: Event): void => {
      e?.stopPropagation();
      this.pickFor = undefined;
      this.refresh();
    };

    private onPick = (e: Event): void => {
      e.stopPropagation();
      const i = this.pickFor;
      this.pickFor = undefined;
      if (i === undefined || !this.resolve) return;
      const ch = (e as CustomEvent<Channel>).detail;
      try {
        this.setItem(i, this.resolve(ch));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const t = this.tile(i);
        this.stopTile(t);
        t.item = undefined;
        t.error = { kind: 'config', message, detail: message };
        this.refresh();
      }
    };

    private retryList = (e?: Event): void => {
      e?.stopPropagation();
      this.dispatchEvent(new CustomEvent('picker-retry'));
    };

    private retry(i: number, e: Event): void {
      e.stopPropagation();
      const t = this.tiles[i];
      if (!t) return;
      t.error = undefined;
      this.sync();
    }

    private play(i: number, e: Event): void {
      e.stopPropagation();
      void this.tiles[i]?.session?.resumeFromGesture(false);
    }

    private removeTile(i: number, e: Event): void {
      e.stopPropagation();
      this.selected = undefined;
      this.setItem(i, undefined);
      if (i === this.audio) {
        const next = this.tiles.findIndex((t, n) => n < this.slots && t.item);
        if (next >= 0) this.moveSound(next);
      }
      this.refresh();
    }

    private watchAlone(i: number, e: Event): void {
      e.stopPropagation();
      this.exit(this.tiles[i]?.item);
    }

    private toggleFullscreen = async (e: Event): Promise<void> => {
      e.stopPropagation();
      try {
        if (this.fullscreen) await document.exitFullscreen?.();
        else await this.requestFullscreen?.();
      } catch (err) {
        console.warn('[stream-card] fullscreen failed', err);
      }
    };

    private onFullscreenChange = (): void => {
      this.fullscreen = document.fullscreenElement === (this as Element);
      this.refresh();
    };

    // ---- rendering ----

    protected override render(): TemplateResult {
      const open = this.openCount;
      const layouts = this.maxTiles > 2 ? [2, this.maxTiles] : [];
      return html`
        <div class="bar">
          <span class="name">Multiview</span>
          <span class="count" role="status"
            >${open} Dispatcharr connection${open === 1 ? '' : 's'} open</span
          >
          <span class="grow"></span>
          ${layouts.map(
            (n) =>
              html`<button
                class="pill layout ${n === this.slots ? 'on' : ''}"
                aria-pressed=${n === this.slots ? 'true' : 'false'}
                @click=${() => this.setLayout(n)}
              >
                ${n === 2 ? '2 × 1' : n === 3 ? '3 tiles' : '2 × 2'}
              </button>`,
          )}
          <button
            class="pill icon-only fs"
            @click=${this.toggleFullscreen}
            aria-label=${this.fullscreen ? 'Exit full screen' : 'Full screen'}
          >
            ${icon(this.fullscreen ? 'fullscreenExit' : 'fullscreen')}
          </button>
          <button class="pill exit" @click=${() => this.exit(this.mainItem)}>Exit</button>
        </div>
        ${
          this.struggling
            ? html`<div class="struggling" role="status">${format('multiviewStruggling')}</div>`
            : nothing
        }
        <div class="grid" data-slots=${this.slots}>
          ${Array.from({ length: this.slots }, (_, i) => this.renderTile(i))}
        </div>
        ${this.pickFor !== undefined ? this.renderPicker() : nothing}
      `;
    }

    private renderPicker() {
      return html`<stream-card-picker
        class="overlay"
        .list=${this.list}
        .state=${this.listState === 'idle' ? 'loading' : this.listState}
        .message=${this.listMessage}
        .currentId=${this.tiles[this.pickFor ?? -1]?.item?.channel?.id}
        .closable=${true}
        @click=${(e: Event) => e.stopPropagation()}
        @channel-pick=${this.onPick}
        @picker-close=${this.closePicker}
        @picker-retry=${this.retryList}
      ></stream-card-picker>`;
    }

    private renderTile(i: number) {
      const t = this.tile(i);
      if (!t.item) {
        return html`<button
          class="tile add"
          data-i=${i}
          @click=${(e: Event) => this.openPicker(i, e)}
        >
          <span class="add-icon">${own(PLUS)}</span>
          <span class="add-title">Add a channel</span>
          <span class="add-detail"
            >${t.error?.message ?? 'Opens another Dispatcharr connection'}</span
          >
        </button>`;
      }
      const audio = i === this.audio;
      const ch = t.item.channel;
      const state = t.error ? 'error' : (t.status?.state ?? 'stopped');
      const sel = this.selected === i;
      const soundLabel = audio
        ? this.soundOn && !t.status?.mutedByPolicy
          ? 'Mute'
          : 'Unmute'
        : 'Move sound to this tile';
      return html`<div
        class="tile ${audio ? 'audio' : ''} ${sel ? 'selected' : ''}"
        data-i=${i}
        data-state=${state}
        @click=${() => this.onTileClick(i)}
      >
        <div class="video-host" data-i=${i}></div>
        ${this.renderTileState(i, t, state)}
        <button
          class="snd ${audio && this.soundOn ? 'on' : ''}"
          @click=${(e: Event) => this.onSound(i, e)}
          aria-label=${soundLabel}
          aria-pressed=${audio ? 'true' : 'false'}
        >
          ${icon(audio && this.soundOn && !t.status?.mutedByPolicy ? 'volumeHigh' : 'volumeOff')}
        </button>
        <div class="tag">
          ${
            ch?.logo
              ? html`<img
                  class="logo"
                  src=${ch.logo}
                  alt=""
                  @error=${(e: Event) => ((e.target as HTMLElement).hidden = true)}
                />`
              : nothing
          }
          ${ch?.number ? html`<span class="num">${ch.number}</span>` : nothing}
          <span class="title">${t.item.source.title ?? ch?.name ?? 'Live'}</span>
        </div>
        ${
          sel
            ? html`<div class="actions">
                <button class="pill change" @click=${(e: Event) => this.openPicker(i, e)}>
                  ${icon('list')} Channel
                </button>
                <button class="pill alone" @click=${(e: Event) => this.watchAlone(i, e)}>
                  ${own(EXPAND)} Full size
                </button>
                <button class="pill remove" @click=${(e: Event) => this.removeTile(i, e)}>
                  ${icon('close')} Remove
                </button>
              </div>`
            : nothing
        }
      </div>`;
    }

    private renderTileState(i: number, t: Tile, state: string) {
      if (state === 'error') {
        return html`<div class="layer dim" role="alert">
          <div class="message">${t.error?.message}</div>
          <button class="pill retry" @click=${(e: Event) => this.retry(i, e)}>
            ${icon('refresh')} Retry
          </button>
        </div>`;
      }
      if (t.status?.needsGesture) {
        return html`<div class="layer dim">
          <button class="big-play" @click=${(e: Event) => this.play(i, e)} aria-label="Play">
            ${icon('play')}
          </button>
        </div>`;
      }
      if (state === 'connecting' || state === 'reconnecting') {
        const text = state === 'reconnecting' ? 'Reconnecting…' : 'Connecting…';
        return html`<div class="layer">
          <div class="spinner" role="progressbar" aria-label=${text}></div>
        </div>`;
      }
      return nothing;
    }

    static override styles = css`
      :host {
        display: block;
        position: relative;
        background: #111318;
        color: #eceef2;
        padding: 12px;
        box-sizing: border-box;
        container-type: inline-size;
        font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, sans-serif));
        --mv-accent: var(--primary-color, #41b4f6);
      }
      :host(:fullscreen) {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
      }
      button {
        font: inherit;
        color: inherit;
        border: 0;
        background: none;
        padding: 0;
        cursor: pointer;
      }
      svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
        flex: none;
      }
      .bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        min-height: 44px;
        margin-bottom: 10px;
      }
      .name {
        font-size: 17px;
        font-weight: 600;
      }
      .count {
        font-size: 12px;
        padding: 5px 10px;
        border-radius: 8px;
        background: #24272e;
        color: #b2b7c1;
        font-variant-numeric: tabular-nums;
      }
      .grow {
        flex: 1;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 44px;
        padding: 0 14px;
        border-radius: 12px;
        background: #24272e;
        font-size: 14px;
        font-weight: 600;
      }
      .pill.icon-only {
        min-width: 44px;
        padding: 0;
        justify-content: center;
      }
      .pill.on {
        background: var(--mv-accent);
        color: var(--text-primary-color, #06131c);
      }
      .struggling {
        margin-bottom: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(229, 72, 77, 0.18);
        color: #ffd7d8;
        font-size: 14px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      :host(:fullscreen) .grid {
        flex: 1;
        grid-auto-rows: minmax(0, 1fr);
      }
      @container (max-width: 520px) {
        .grid {
          grid-template-columns: minmax(0, 1fr);
        }
      }
      .tile {
        position: relative;
        aspect-ratio: 16 / 9;
        border-radius: 12px;
        overflow: hidden;
        background: #000;
        border: 2px solid transparent;
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }
      :host(:fullscreen) .tile {
        aspect-ratio: auto;
      }
      .tile.audio {
        border-color: var(--mv-accent);
      }
      .tile.add {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        background: #16181d;
        border: 2px dashed rgba(255, 255, 255, 0.2);
        text-align: center;
        padding: 12px;
      }
      .add-icon {
        display: grid;
        place-items: center;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #24272e;
      }
      .add-title {
        font-size: 15px;
        font-weight: 600;
      }
      .add-detail {
        font-size: 13px;
        color: #b2b7c1;
      }
      .video-host,
      .video-host video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .video-host video {
        object-fit: contain;
        background: #000;
      }
      .layer {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 12px;
        text-align: center;
      }
      .layer.dim {
        background: rgba(0, 0, 0, 0.6);
      }
      .message {
        font-size: 14px;
        max-width: 34em;
      }
      .spinner {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.25);
        border-top-color: #fff;
        animation: spin 0.9s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .big-play {
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        color: #000;
      }
      .big-play svg {
        width: 36px;
        height: 36px;
      }
      .snd {
        position: absolute;
        top: 8px;
        right: 8px;
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: rgba(14, 15, 18, 0.6);
      }
      .snd.on {
        background: var(--mv-accent);
        color: var(--text-primary-color, #06131c);
      }
      .tag {
        position: absolute;
        left: 8px;
        bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: calc(100% - 16px);
        height: 36px;
        padding: 0 12px 0 4px;
        border-radius: 12px;
        background: rgba(14, 15, 18, 0.65);
        font-size: 13.5px;
        font-weight: 600;
        box-sizing: border-box;
      }
      .tag .logo[hidden] {
        display: none;
      }
      .tag .logo {
        width: 28px;
        height: 28px;
        object-fit: contain;
        border-radius: 8px;
        background: #2a2d34;
      }
      .tag .num {
        opacity: 0.7;
        font-variant-numeric: tabular-nums;
      }
      .tag .title {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .tile:not(:has(.logo:not([hidden]))) .tag {
        padding-left: 12px;
      }
      .actions {
        position: absolute;
        inset: auto 8px 52px 8px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }
      .actions .pill {
        background: rgba(36, 39, 46, 0.92);
      }
      stream-card-picker.overlay {
        position: absolute;
        inset: 0;
        z-index: 2;
      }
    `;
  };
}
