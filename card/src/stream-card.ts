import { css, html, LitElement, nothing, svg, type PropertyValues, type TemplateResult } from 'lit';
import { ChannelList, loadChannels, type Channel } from './channels';
import type { GuideFeed } from './epg';
import { ConfigError, isUuid, needsLookup, normalizeConfig, resolveSource } from './config';
import { VERSION } from './const';
import { getController, type ControllerCard, type StreamController } from './controller';
import { format, type PlaybackError } from './errors';
import { icon } from './icons';
import { readRemembered, writeRemembered } from './memory';
import type { PickerState } from './picker';
import { holdReason, LifecycleWatcher, type HoldReason } from './lifecycle';
import { NumberEntry } from './number-entry';
import { previousRecent, pushRecent, readRecents, type RecentEntry } from './recents';
import { PlaybackSession, type SessionStatus } from './session';
import { readSettings, SETTINGS_EVENT, writeSettings, type DeviceSettings } from './settings';
import type { SleepState } from './sleep-timer';
import { styles } from './styles';
import type {
  BufferMode,
  ResolvedConfig,
  StreamCardConfig,
  StreamRequest,
  StreamSource,
} from './types';
import { clampVolume, readVolume, writeVolume } from './volume';
import {
  renderCenter,
  renderChips,
  renderControls,
  renderIdent,
  renderOsd,
  renderTvHints,
} from './ui/stage';
import {
  detectLayout,
  type CardActions,
  type CardView,
  type Layout,
  type NavActions,
  type NavView,
  type NowNext,
  type SettingsActions,
  type UiState,
} from './ui/view';
import type { StreamCardMultiview, TileItem } from './multiview';

const CONTROLS_HIDE_MS = 4000;
/** How long the big channel number stays up after a change. */
const OSD_MS = 2600;
/**
 * Channel up/down tunes once presses stop for this long. Each press releases the old stream at
 * once and shows the new channel, but only the one you land on opens a Dispatcharr connection.
 */
export const ZAP_SETTLE_MS = 800;
const PREVIEW_HOSTS = new Set([
  'HUI-CARD-PREVIEW',
  'HUI-CARD-PICKER',
  'HUI-DIALOG-EDIT-CARD',
  'HUI-CARD-ELEMENT-EDITOR',
]);

/** Walks up through shadow roots looking for HA's card editor/picker. */
/** The guide element is a lazy chunk, fetched alongside the channel list. */
let pickerLoading: Promise<unknown> | undefined;
function loadPicker(): void {
  pickerLoading ??= import('./picker').then(({ PICKER_TAG, StreamCardPicker }) => {
    if (!customElements.get(PICKER_TAG)) customElements.define(PICKER_TAG, StreamCardPicker);
  });
}

function insideEditor(el: Element): boolean {
  let node: Node | null = el;
  for (let i = 0; node && i < 60; i++) {
    if (node instanceof Element && PREVIEW_HOSTS.has(node.tagName)) return true;
    node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
  }
  return false;
}

export class StreamCard extends LitElement implements ControllerCard {
  static override styles = styles;

  static override properties = {
    preview: { type: Boolean },
    editMode: { type: Boolean },
    _ui: { state: true },
  };

  /** Set by HA on cards in the editor preview and in dashboard edit mode. */
  declare preview: boolean;
  declare editMode: boolean;
  declare private _ui: number;

  private config?: ResolvedConfig;
  private readonly controller: StreamController;
  private readonly video: HTMLVideoElement;
  private readonly watcher: LifecycleWatcher;
  private request?: StreamRequest;
  private source?: StreamSource;
  private session?: PlaybackSession;
  private status?: SessionStatus;
  private error?: PlaybackError;
  private wantPlaying = false;
  private hold: HoldReason | null = 'disconnected';
  private lastRelease?: string;
  private idleStopped = false;
  private userMuted?: boolean;
  private controlsVisible = true;
  private controlsTimer?: ReturnType<typeof setTimeout>;
  /** Set while channel up/down presses are settling; no session starts until it fires. */
  private zapTimer?: ReturnType<typeof setTimeout>;
  private debugTimer?: ReturnType<typeof setInterval>;
  private inEditor = false;
  private fullscreen = false;
  private channels?: ChannelList;
  private channelState: PickerState | 'idle' = 'idle';
  private channelMessage?: string;
  private channelsPromise?: Promise<ChannelList | undefined>;
  private channelsKey?: string;
  /** The guide under the picture is open (guide: open | closed). */
  private guideOpen = false;
  /** The guide over the picture is open (full screen, TV, guide: off). */
  private overlayOpen = false;
  private guideMode?: string;
  private sleepMenuOpen = false;
  private settingsOpen = false;
  /** This device's choices from the settings panel for this target (see settings.ts). */
  private deviceSettings: DeviceSettings = {};
  private osdUntil = 0;
  private osdPending = false;
  private tickTimer?: ReturnType<typeof setTimeout>;
  /** A key reached the card, so the TV layout shows remote-key hints. */
  private keysSeen = false;
  private readonly layout: Layout = detectLayout();
  private requestSeq = 0;
  /** A channel name or number is waiting for the channel list. */
  private lookupPending = false;
  /** Whether that pending channel should play once found; a stop clears it. */
  private lookupPlay = false;
  /** The controller's stop count for this target when this card last took a request or stop. */
  private stopGen?: number;
  /** The page-wide guide feed while `epg` is on and the card is live (never in edit mode). */
  private guide?: GuideFeed;
  private guideUnsub?: () => void;
  private guideUrl?: string;
  private readonly numbers = new NumberEntry(
    (digits) => this.tuneNumber(digits),
    () => this.refresh(),
    (digits) => this.channels?.numberIsComplete(digits) ?? false,
  );
  /** Repaints the sleep countdown once a second during its last minute. */
  private sleepTicker?: ReturnType<typeof setInterval>;
  /** The multiview grid, created on first use (a lazy chunk) and kept. */
  private mv?: StreamCardMultiview;
  /** Multiview is showing instead of the single picture. */
  private mvOn = false;
  /** Whether the grid was last allowed to hold streams (for the idle timer). */
  private mvAllowed = false;

  constructor() {
    super();
    this.preview = false;
    this.editMode = false;
    this._ui = 0;
    this.controller = getController();
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
    this.video.preload = 'none';
    this.video.controls = false;
    this.video.muted = true;
    this.video.volume = readVolume() ?? 1;
    (this.video as HTMLVideoElement & { disableRemotePlayback: boolean }).disableRemotePlayback =
      true;
    this.watcher = new LifecycleWatcher(
      this,
      this.controller.power,
      () => this.evaluate(),
      () => this.onIdle(),
    );
  }

  // ---- Home Assistant card API ----

  setConfig(raw: StreamCardConfig): void {
    const prevTarget = this.config?.target;
    this.config = normalizeConfig(raw);
    this.deviceSettings = readSettings(this.config.target);
    if (!this.config.settings) this.settingsOpen = false;
    this.syncStatsTimer();
    if (this.config.guide !== this.guideMode) {
      this.guideMode = this.config.guide;
      this.guideOpen = this.config.guide === 'open';
    }
    if (prevTarget && prevTarget !== this.config.target && this.isConnected) {
      this.controller.unregister(this);
      this.controller.register(this);
    }
    const key = this.channelListKey();
    if (key !== this.channelsKey) {
      this.channels = undefined;
      this.channelsPromise = undefined;
      this.channelState = 'idle';
      this.channelsKey = key;
      if (this.isConnected) this.ensureChannels();
    }
    this.syncGuide();
    if (this.mvOn && !this.multiviewAvailable) this.exitMultiview();
    this.configureMultiview();
    if (this.request) {
      this.applyRequest(this.request, this.lookupPending ? this.lookupPlay : this.wantPlaying);
    } else if (this.isConnected) this.pickInitialRequest();
    this.refresh();
  }

  /** HA's visual editor form; loaded only when the editor opens. */
  static async getConfigForm() {
    return (await import('./editor-form')).configForm;
  }

  set hass(_hass: unknown) {
    // Playback never depends on HA state, so ignoring hass keeps re-renders away from <video>.
  }

  getCardSize(): number {
    return 4;
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 3 };
  }

  static getStubConfig() {
    return { dispatcharr_url: 'https://dispatcharr.example', target: 'tv' };
  }

  // ---- ControllerCard ----

  get target(): string {
    return this.config?.target ?? 'default';
  }

  get isLive(): boolean {
    return this.isConnected && !this.isPreview;
  }

  deliver(req: StreamRequest): void {
    // A button for this target leaves multiview and plays full size.
    if (this.mvOn) this.exitMultiview();
    this.applyRequest(req, true);
  }

  stopFromController(): void {
    this.wantPlaying = false;
    this.lookupPlay = false;
    if (this.mvOn) {
      // Stop closes multiview; the tile with sound stays chosen, stopped.
      const item = this.exitMultiview();
      if (item) this.applyRequest(item.request, false);
    }
    this.stopGen = this.controller.stopCount(this.target);
    this.numbers.clear();
    this.remember();
    this.evaluate();
  }

  command(req: StreamRequest): void {
    switch (req.action) {
      case 'channel_up':
        return this.channelUp();
      case 'channel_down':
        return this.channelDown();
      case 'last_channel':
        return this.lastChannel();
      case 'volume':
        if (req.volume !== undefined) this.setVolume(req.volume / 100);
        return;
      case 'mute':
        if (!this.effectiveMuted) this.toggleMute();
        return;
      case 'unmute':
        // Unmuting without a tap would pause a stream the browser only allowed muted.
        if (this.status?.mutedByPolicy) this.userMuted = false;
        else if (this.effectiveMuted) this.toggleMute();
        return;
    }
  }

  sleepChanged(): void {
    const s = this.sleep;
    if (s?.warning && this.isConnected && !this.sleepTicker) {
      this.sleepTicker = setInterval(() => this.sleepChanged(), 1000);
    } else if (!s?.warning && this.sleepTicker) {
      clearInterval(this.sleepTicker);
      this.sleepTicker = undefined;
    }
    this.refresh();
  }

  // ---- lifecycle ----

  private get isPreview(): boolean {
    return this.preview || this.editMode || this.inEditor;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.inEditor = insideEditor(this);
    this.controller.register(this);
    this.watcher.attach();
    this.addEventListener('keydown', this.onKeySeen);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
    this.pickInitialRequest();
    // A stop button pressed while this card was off the page (a closed pop-up) still counts.
    if (this.stopGen !== undefined && this.stopGen !== this.controller.stopCount(this.target)) {
      this.stopFromController();
    }
    this.ensureChannels();
    this.syncGuide();
    window.addEventListener(SETTINGS_EVENT, this.onSettingsEvent);
    if (this.config) this.deviceSettings = readSettings(this.config.target);
    this.syncStatsTimer();
    this.addEventListener('keydown', this.onKeyDown);
    this.sleepChanged();
    this.evaluate();
  }

  override disconnectedCallback(): void {
    this.watcher.detach();
    this.controller.unregister(this);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
    window.removeEventListener(SETTINGS_EVENT, this.onSettingsEvent);
    clearInterval(this.debugTimer);
    this.debugTimer = undefined;
    clearTimeout(this.controlsTimer);
    clearTimeout(this.zapTimer);
    this.zapTimer = undefined;
    this.syncGuide();
    clearInterval(this.sleepTicker);
    this.sleepTicker = undefined;
    this.removeEventListener('keydown', this.onKeyDown);
    this.numbers.clear();
    clearTimeout(this.tickTimer);
    this.removeEventListener('keydown', this.onKeySeen);
    super.disconnectedCallback();
    this.evaluate();
  }

  protected override firstUpdated(): void {
    this.renderRoot.querySelector('.video-host')?.appendChild(this.video);
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('preview') || changed.has('editMode')) {
      // A name or number that arrived during edit mode is looked up now.
      if (!this.isPreview && this.lookupPending && this.request) {
        this.applyRequest(this.request, this.lookupPlay);
      }
      this.ensureChannels();
      this.syncGuide();
      this.evaluate();
    }
  }

  // ---- channel list ----

  private channelListKey(): string | undefined {
    const c = this.config;
    if (!c?.channelList || !c.m3uUrl) return undefined;
    return JSON.stringify([c.m3uUrl, c.channelGroups, c.favourites]);
  }

  /** Loads the channel list once (shared per page); resolves undefined if disabled or failed. */
  private ensureChannels(force = false): Promise<ChannelList | undefined> {
    const c = this.config;
    if (!c?.channelList || !c.m3uUrl || this.isPreview) return Promise.resolve(undefined);
    loadPicker();
    if (this.channelsPromise && !force) return this.channelsPromise;
    this.channelState = 'loading';
    this.channelMessage = undefined;
    this.refresh();
    const key = this.channelListKey();
    this.channelsPromise = loadChannels(c.m3uUrl, { force }).then(
      (all) => {
        if (key !== this.channelListKey()) return undefined;
        this.channels = new ChannelList(all, { groups: c.channelGroups, favourites: c.favourites });
        this.channelState = 'ready';
        this.channelMessage = this.channels.size
          ? undefined
          : this.channels.total
            ? format('noGroupMatch', { groups: this.channels.allGroups.join(', ') })
            : format('noChannels');
        this.refresh();
        return this.channels;
      },
      (err: unknown) => {
        if (key !== this.channelListKey()) return undefined;
        this.channelState = 'error';
        this.channelMessage = format('channelsFailed', {
          detail: err instanceof Error ? err.message : String(err),
        });
        this.channelsPromise = undefined;
        this.refresh();
        return undefined;
      },
    );
    return this.channelsPromise;
  }

  // ---- now/next ----

  /**
   * Subscribes to the guide while it's wanted; unsubscribing lets the feed stop downloading. The
   * guide code is a lazy chunk, so cards without `epg` never load it.
   */
  private syncGuide(): void {
    const c = this.config;
    const url = this.isConnected && !this.isPreview && c?.epg ? c.epgUrl : undefined;
    if (this.guideUrl === url) return;
    this.guideUnsub?.();
    this.guideUnsub = undefined;
    this.guide = undefined;
    this.guideUrl = url;
    if (!url) return;
    void import('./epg').then(({ guideFeed }) => {
      if (this.guideUrl !== url) return;
      this.guide = guideFeed(url);
      this.guideUnsub = this.guide.subscribe(() => this.refresh());
    });
  }

  /**
   * What's on a channel now and next, from Dispatcharr's guide. Undefined when `epg` is off, in
   * edit mode, before the guide loads, if it failed, or when the guide has nothing for the channel.
   * The card re-renders when guide data arrives and when a programme starts or ends.
   */
  nowNext(channel: Channel | undefined): NowNext | undefined {
    if (!this.showNowNext) return undefined;
    return channel && this.guide ? this.guide.nowNext(channel) : undefined;
  }

  /** The channel-list entry for what's playing, if the list has it. */
  private get currentChannel(): Channel | undefined {
    return this.channels?.find(this.source?.channel ?? this.source?.url);
  }

  private requestFor(ch: Channel, base: StreamRequest = {}): StreamRequest {
    return ch.streamId
      ? { ...base, channel: ch.streamId, url: undefined, title: base.title ?? ch.name }
      : { ...base, url: ch.url, channel: undefined, title: base.title ?? ch.name };
  }

  /** On connect: a button press waiting in the mailbox wins, then the target's last channel. */
  private pickInitialRequest(): void {
    if (!this.config) return;
    const pending = this.controller.take(this.target);
    if (pending && (pending.action ?? 'play') === 'play') {
      this.applyRequest(pending, true);
      return;
    }
    this.pickStartingChannel(this.config);
    // Channel up/down pressed while this card was off the page: step from where it starts,
    // before the card connects to that channel.
    if (pending) this.command(pending);
  }

  private pickStartingChannel(config: ResolvedConfig): void {
    if (this.request) return;
    const last = this.controller.lastFor(this.target);
    if (last) {
      this.applyRequest(last, config.autoplay);
      return;
    }
    // A channel this device left stopped comes back stopped.
    const saved = config.rememberChannel ? readRemembered(this.target) : undefined;
    if (saved) {
      const req = { channel: saved.channel, url: saved.url, title: saved.title };
      this.applyRequest(req, config.autoplay && saved.playing !== false);
      return;
    }
    if (config.defaultRequest) this.applyRequest(config.defaultRequest, config.autoplay);
  }

  private refresh(): void {
    this._ui++;
    if (this.mv) {
      this.mv.list = this.channels;
      this.mv.listState = this.channelState;
      this.mv.listMessage = this.channelMessage;
    }
  }

  // ---- multiview ----

  private get multiviewAvailable(): boolean {
    return !!this.config?.multiview.enabled && this.config.channelList;
  }

  /** Config for tile URLs: the card's, with the multiview output profile. */
  private get tileConfig(): ResolvedConfig | undefined {
    const c = this.config;
    return c && { ...c, outputProfile: c.multiview.outputProfile };
  }

  private tileItem(req: StreamRequest, channel?: Channel): TileItem | undefined {
    const cfg = this.tileConfig;
    if (!cfg) return undefined;
    const request = { channel: req.channel, url: req.url, type: req.type, title: req.title };
    const source = resolveSource(request, cfg);
    return { request, source: { ...source, title: req.title ?? source.title }, channel };
  }

  private configureMultiview(): void {
    const mv = this.mv;
    const c = this.config;
    if (!mv || !c) return;
    mv.maxTiles = c.multiview.maxTiles;
    mv.settings = {
      startTimeoutMs: c.startTimeoutMs,
      maxAttempts: c.maxReconnectAttempts,
      debug: c.debug,
      buffer: this.bufferMode,
    };
  }

  private enterMultiview = async (e?: Event): Promise<void> => {
    e?.stopPropagation();
    if (!this.multiviewAvailable || this.isPreview || this.mvOn) return;
    if (!this.mv) {
      const { defineMultiview, MULTIVIEW_TAG } = await import('./multiview');
      defineMultiview({ LitElement, html, css, nothing, svg, PlaybackSession, icon, format });
      if (!this.multiviewAvailable || this.isPreview || this.mvOn || this.mv) return;
      const mv = document.createElement(MULTIVIEW_TAG) as StreamCardMultiview;
      mv.resolve = (ch) => this.tileItem(this.requestFor(ch), ch)!;
      mv.addEventListener('multiview-exit', (ev) => {
        const item = (ev as CustomEvent<{ item?: TileItem }>).detail.item;
        this.exitMultiview();
        if (item) this.controller.request({ ...item.request, target: this.target });
        else this.evaluate();
      });
      mv.addEventListener('picker-retry', () => void this.ensureChannels(true));
      this.mv = mv;
      this.configureMultiview();
    }
    if (this.fullscreen) {
      try {
        await document.exitFullscreen?.();
      } catch {
        /* not in full screen after all */
      }
    }
    let first: TileItem | undefined;
    const req = this.request;
    if (this.source && req && !this.lookupPending) {
      try {
        first = this.tileItem(req, this.currentChannel);
      } catch {
        first = undefined;
      }
    }
    this.overlayOpen = false;
    this.ensureChannels();
    this.mv.open(first, this.effectiveMuted);
    this.mvOn = true;
    this.mvAllowed = false;
    this.evaluate();
  };

  /** Stops every tile and goes back to the single picture; returns the tile that had sound. */
  private exitMultiview(): TileItem | undefined {
    const mv = this.mv;
    if (!mv || !this.mvOn) return undefined;
    const item = mv.mainItem;
    this.mvOn = false;
    this.mvAllowed = false;
    mv.halt();
    this.watcher.disarmIdle();
    this.lastRelease = 'multiview-exit';
    this.refresh();
    return item;
  }

  private applyRequest(req: StreamRequest, play: boolean): void {
    if (!this.config) return;
    const seq = ++this.requestSeq;
    this.stopGen = this.controller.stopCount(this.target);
    const ref = req.channel;
    this.lookupPending = false;
    if (ref && !req.url && !isUuid(ref) && this.config.channelList) {
      // A channel name or number: find its stream ID in the channel list first. In edit mode
      // the list isn't loaded, so the lookup waits until edit mode ends (see updated()).
      this.request = req;
      this.idleStopped = false;
      this.lookupPending = true;
      this.lookupPlay = play;
      this.refresh();
      if (this.isPreview) return;
      void this.ensureChannels().then((list) => {
        if (seq !== this.requestSeq) return;
        this.lookupPending = false;
        const go = this.lookupPlay;
        const ch = list?.find(ref);
        if (ch) this.applyResolved(this.requestFor(ch, req), go);
        else if (list) this.showRequestError(format('channelNotFound', { name: ref }));
        // No list to look in: something shaped like a stream ID is tried as one.
        else if (!needsLookup(ref)) this.applyResolved(req, go);
        else this.showRequestError(this.channelMessage ?? format('channelNotFound', { name: ref }));
      });
      return;
    }
    this.applyResolved(req, play);
  }

  private showRequestError(message: string): void {
    this.stopSession('config');
    this.source = undefined;
    this.error = { kind: 'config', message, detail: message };
    this.wantPlaying = false;
    this.refresh();
  }

  private applyResolved(req: StreamRequest, play: boolean): void {
    if (!this.config) return;
    this.request = req;
    this.idleStopped = false;
    let src: StreamSource;
    try {
      src = resolveSource(req, this.config);
    } catch (err) {
      this.stopSession('config');
      this.source = undefined;
      this.error = {
        kind: 'config',
        message: err instanceof ConfigError ? err.message : String(err),
        detail: String(err),
      };
      this.wantPlaying = false;
      this.refresh();
      return;
    }
    if (this.session && this.session.source.url !== src.url) this.stopSession('switch');
    // The buffer mode (YAML or this device's choice) is fixed for a session's life; a new one
    // restarts the stream.
    else if (this.session && this.session.buffer !== this.bufferMode) this.stopSession('config');
    // The big number shows once the new channel's picture arrives (tuning has its own layer).
    if (this.source?.url !== src.url) this.osdPending = true;
    this.source = { ...src, title: req.title ?? src.title };
    this.error = undefined;
    if (play) this.wantPlaying = true;
    // Channels skipped past while zapping don't count as watched.
    if (!this.isPreview && !this.zapTimer) pushRecent(this.target, this.recentEntry(req) ?? {});
    this.remember();
    this.evaluate();
  }

  /** What recents store for a request: the resolved stream ID, or the full URL. */
  private recentEntry(req: StreamRequest | undefined): RecentEntry | undefined {
    if (!req || !this.source) return undefined;
    return this.source.channel
      ? { channel: this.source.channel, title: req.title }
      : { url: req.url, title: req.title };
  }

  /** Saves the current channel and play intent for this target on this device. */
  private remember(): void {
    const req = this.request;
    if (!this.config?.rememberChannel || !this.source || !req || this.isPreview) return;
    writeRemembered(this.target, {
      channel: req.channel,
      url: req.url,
      title: req.title,
      playing: this.wantPlaying,
    });
  }

  /** The single place that starts or stops playback. */
  private evaluate(): void {
    const mv = this.mvOn ? this.mv : undefined;
    const reason = holdReason({
      connected: this.isConnected,
      preview: this.isPreview,
      // Multiview always has something to show (at least an "Add a channel" tile).
      hasSource: !!mv || !!this.source,
      wantPlaying: !!mv || this.wantPlaying,
      intersecting: this.watcher.intersecting,
      pageVisible: this.watcher.pageVisible,
      screenAwake: this.watcher.screenAwake,
    });
    this.hold = reason;
    if (mv) {
      // The single picture never plays alongside the grid.
      this.stopSession('multiview');
      const allowed = reason === null;
      if (allowed !== this.mvAllowed) {
        this.mvAllowed = allowed;
        if (allowed && this.config && this.config.idleTimeoutMs > 0) {
          this.watcher.armIdle(this.config.idleTimeoutMs);
        } else if (!allowed) this.watcher.disarmIdle();
      }
      mv.setAllowed(allowed);
    } else if (reason === null) {
      if (!this.session && !this.zapTimer) this.startSession();
    } else if (this.session) {
      this.stopSession(reason);
    }
    this.refresh();
  }

  private startSession(): void {
    if (!this.source || !this.config) return;
    this.error = undefined;
    const session = new PlaybackSession(this.video, this.source, {
      startTimeoutMs: this.config.startTimeoutMs,
      maxAttempts: this.config.maxReconnectAttempts,
      muted: this.userMuted ?? this.config.muted,
      debug: this.config.debug,
      buffer: this.bufferMode,
      onStatus: (s) => this.onStatus(session, s),
    });
    this.session = session;
    this.status = session.status;
    this.showControls();
    session.start();
    if (this.config.idleTimeoutMs > 0) this.watcher.armIdle(this.config.idleTimeoutMs);
  }

  private stopSession(reason: string): void {
    const s = this.session;
    if (!s) return;
    this.session = undefined;
    this.status = undefined;
    this.lastRelease = reason;
    this.watcher.disarmIdle();
    void s.destroy();
  }

  private onStatus(session: PlaybackSession, s: SessionStatus): void {
    if (session !== this.session) return;
    this.status = s;
    if (s.state === 'error') {
      this.error = s.error;
      this.wantPlaying = false;
      this.stopSession('error');
      this.evaluate();
      return;
    }
    if (s.state === 'playing') {
      this.scheduleHideControls();
      if (this.osdPending) {
        this.osdPending = false;
        this.osdUntil = Date.now() + OSD_MS;
      }
    }
    this.refresh();
  }

  private onIdle(): void {
    // Like a stop button: a recreated card or a reload doesn't restart it either.
    this.controller.stop(this.target);
    this.idleStopped = true;
    this.lastRelease = 'idle';
    this.refresh();
  }

  // ---- user actions ----

  private play = (e?: Event): void => {
    e?.stopPropagation();
    if (this.session && this.status?.needsGesture) {
      void this.session.resumeFromGesture(this.status.mutedByPolicy);
      return;
    }
    this.error = undefined;
    this.idleStopped = false;
    this.stopGen = this.controller.stopCount(this.target);
    if (this.request && !this.source) this.applyRequest(this.request, true);
    this.wantPlaying = true;
    this.remember();
    this.evaluate();
  };

  private onPick = (e: Event): void => {
    e.stopPropagation();
    const ch = (e as CustomEvent<Channel>).detail;
    // The guide under the picture stays open for the next pick; one over the picture closes.
    const placement = this.guidePlacement;
    // ...as does one that was only showing because nothing was selected.
    const closing = placement === 'overlay' || (placement === 'below' && !this.guideOpen);
    const hadFocus = closing && this.pickerHasFocus();
    if (closing) this.overlayOpen = false;
    this.playChannel(ch);
    if (hadFocus) this.restoreFocus();
  };

  /** Plays a channel the way a button would, so the target's last channel follows it. */
  private playChannel(ch: Channel): void {
    this.controller.request(this.requestFor(ch, { target: this.target }));
  }

  private pickerHasFocus(): boolean {
    return (this.renderRoot as ShadowRoot).activeElement?.tagName === 'STREAM-CARD-PICKER';
  }

  /** The picker is about to disappear while focused: move focus to the Channels button. */
  private restoreFocus(): void {
    void this.updateComplete.then(() => {
      const target =
        this.renderRoot.querySelector<HTMLElement>('.ctl-channels') ??
        this.renderRoot.querySelector<HTMLElement>('.frame');
      target?.focus();
    });
  }

  private togglePicker = (e?: Event): void => {
    e?.stopPropagation();
    // From the error layer, "Channels" only ever opens the guide.
    const open = this.uiState === 'error' || this.guidePlacement === undefined;
    if (this.guideOverlays) this.overlayOpen = open;
    else this.guideOpen = open;
    if (open) {
      this.ensureChannels();
      if (!this.guideOverlays) {
        void this.updateComplete.then(() =>
          this.renderRoot
            .querySelector('stream-card-picker')
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
        );
      }
    }
    this.showControls();
  };

  private closePicker = (e?: Event): void => {
    e?.stopPropagation();
    const hadFocus = this.pickerHasFocus();
    if (this.guideOverlays) this.overlayOpen = false;
    else this.guideOpen = false;
    this.refresh();
    if (hadFocus) this.restoreFocus();
  };

  private retryChannels = (e?: Event): void => {
    e?.stopPropagation();
    void this.ensureChannels(true);
  };

  private channelStep(delta: 1 | -1): void {
    if (!this.channels) {
      // A remote press can come before the list is loaded.
      void this.ensureChannels().then((list) => list && this.channelStep(delta));
      return;
    }
    const ch = this.channels.neighbour(this.currentChannel?.id, delta);
    if (ch) {
      clearTimeout(this.zapTimer);
      this.zapTimer = setTimeout(() => {
        this.zapTimer = undefined;
        if (!this.isPreview && this.source) {
          pushRecent(this.target, this.recentEntry(this.request) ?? {});
        }
        this.evaluate();
      }, ZAP_SETTLE_MS);
      this.playChannel(ch);
    }
    this.showControls();
  }

  channelUp = (e?: Event): void => {
    e?.stopPropagation();
    this.channelStep(1);
  };

  channelDown = (e?: Event): void => {
    e?.stopPropagation();
    this.channelStep(-1);
  };

  // ---- channel navigation: recents, last channel, number entry, volume, sleep ----

  /** The key recents use for what's selected now. */
  private get currentKey(): string | undefined {
    return this.source?.channel ?? this.request?.url;
  }

  /** This device's recently watched channels for the target, newest first, current included. */
  get recents(): Channel[] {
    const list = this.channels;
    if (!list || this.isPreview) return [];
    return readRecents(this.target)
      .map((e) => list.find(e.channel ?? e.url))
      .filter((c): c is Channel => !!c);
  }

  private get previousEntry(): RecentEntry | undefined {
    return this.isPreview ? undefined : previousRecent(this.target, this.currentKey);
  }

  /** The channel "Last channel" goes back to. */
  get previousChannel(): Channel | undefined {
    const e = this.previousEntry;
    return e ? this.channels?.find(e.channel ?? e.url) : undefined;
  }

  /** Flips back to the previous channel, like a remote's Last/Recall key. */
  lastChannel = (e?: Event): void => {
    e?.stopPropagation();
    const prev = this.previousEntry;
    if (!prev) return;
    this.controller.request({
      target: this.target,
      action: 'play',
      channel: prev.channel,
      url: prev.url,
      title: prev.title,
    });
    this.showControls();
  };

  /** Digits typed so far and the channels they could become; undefined when not typing. */
  get numberEntry(): { digits: string; candidates: Channel[] } | undefined {
    const digits = this.numbers.digits;
    if (!digits) return undefined;
    return { digits, candidates: this.channels?.numberMatches(digits) ?? [] };
  }

  pressDigit = (d: string): void => {
    if (!this.channels || this.isPreview) return;
    this.numbers.press(d);
    this.showControls();
  };

  clearDigits = (): void => this.numbers.clear();

  commitDigits = (): void => this.numbers.commit();

  /** Deletes the last typed digit. */
  deleteDigit = (): void => this.numbers.delete();

  private tuneNumber(digits: string): void {
    const ch = this.channels?.numberMatches(digits, 1)[0];
    if (ch?.number === digits) this.playChannel(ch);
  }

  /** This device's volume, 0..1 (the mute button is separate). */
  get volume(): number {
    return this.video.volume;
  }

  /** Sets and remembers this device's volume. Raising it above 0 also unmutes. */
  setVolume = (v: number): void => {
    const vol = clampVolume(v);
    this.video.volume = vol;
    writeVolume(vol);
    if (vol > 0 && this.effectiveMuted && !this.status?.mutedByPolicy) this.toggleMute();
    else this.refresh();
  };

  get sleep(): SleepState | undefined {
    return this.isPreview ? undefined : this.controller.sleepFor(this.target);
  }

  /** Stops this target in `minutes` (0 cancels). Every card on the target shares the timer. */
  setSleep = (minutes: number): void => {
    this.controller.setSleep(this.target, minutes);
  };

  extendSleep = (minutes: number): void => {
    this.controller.extendSleep(this.target, minutes);
  };

  /** Cancels the sleep timer from its last-minute warning. */
  keepWatching = (): void => this.setSleep(0);

  /** Data the navigation controls render from. */
  navView(): NavView {
    if (this.isPreview) return {};
    const list = !!this.channels;
    return {
      recents: list ? this.recents : undefined,
      previousChannel: this.previousChannel,
      numberEntry: this.numberEntry,
      volume: this.volume,
      sleep: this.sleep,
    };
  }

  /** Callbacks for the navigation controls; ones that can't work now are left out. */
  navActions(): NavActions {
    if (this.isPreview) return {};
    const list = this.channelState === 'ready' && !!this.channels?.size;
    return {
      lastChannel: this.previousEntry ? this.lastChannel : undefined,
      pressDigit: list ? this.pressDigit : undefined,
      clearDigits: list ? this.clearDigits : undefined,
      commitDigits: list ? this.commitDigits : undefined,
      setVolume: this.setVolume,
      setSleep: this.setSleep,
      extendSleep: this.extendSleep,
    };
  }

  /** Remote and keyboard keys while focus is in the card (never in the picker or a text field). */
  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || this.isPreview) return;
    const path = e.composedPath();
    const inField = path.some(
      (n) =>
        n instanceof HTMLElement &&
        (n.tagName === 'INPUT' ||
          n.tagName === 'TEXTAREA' ||
          n.tagName === 'SELECT' ||
          n.tagName === 'STREAM-CARD-PICKER' ||
          n.isContentEditable),
    );
    if (inField) return;
    const typing = !!this.numbers.digits;
    let handled = true;
    if (/^\d$/.test(e.key)) this.pressDigit(e.key);
    else if (e.key === 'Enter' && typing) this.commitDigits();
    // OK on a remote opens the guide, unless a button has focus (Enter presses that button).
    else if (e.key === 'Enter' && !path.some((n) => n instanceof HTMLButtonElement))
      this.togglePicker();
    else if (e.key === 'Escape' && typing) this.clearDigits();
    else if (e.key === 'Escape' && (this.settingsOpen || this.sleepMenuOpen)) {
      this.settingsOpen = this.sleepMenuOpen = false;
      this.showControls();
    } else if (e.key === 'Backspace') {
      if (typing) this.deleteDigit();
      else this.lastChannel();
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ChannelUp') this.channelUp();
    else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ChannelDown')
      this.channelDown();
    else if (e.key === 'm' || e.key === 'M' || e.key === 'AudioVolumeMute') this.toggleMute();
    else if (e.key === 'f' || e.key === 'F') void this.toggleFullscreen();
    else handled = false;
    if (handled) e.preventDefault();
  };

  /** Stops the target like a stop button, so a recreated card or a reload stays stopped. */
  private stop = (e?: Event): void => {
    e?.stopPropagation();
    this.controller.stop(this.target);
  };

  /** What the mute button shows: the video's state while playing, else what the next play will use. */
  private get effectiveMuted(): boolean {
    return this.session ? this.video.muted : (this.userMuted ?? this.config?.muted ?? false);
  }

  private toggleMute = (e?: Event): void => {
    e?.stopPropagation();
    const muted = !this.effectiveMuted;
    this.video.muted = muted;
    this.userMuted = muted;
    if (!muted && this.session?.status.mutedByPolicy) void this.session.resumeFromGesture(true);
    this.showControls();
    this.refresh();
  };

  private unmute = (e?: Event): void => {
    e?.stopPropagation();
    this.userMuted = false;
    if (this.session) void this.session.resumeFromGesture(true);
    else this.video.muted = false;
    this.refresh();
  };

  private toggleSleepMenu = (e?: Event): void => {
    e?.stopPropagation();
    this.sleepMenuOpen = !this.sleepMenuOpen;
    if (this.sleepMenuOpen) this.settingsOpen = false;
    this.showControls();
  };

  // ---- settings panel ----

  /** The buffer mode in effect: this device's choice, else the card's YAML. */
  private get bufferMode(): BufferMode {
    return this.deviceSettings.buffer ?? this.config?.buffer ?? 'low';
  }

  private get showNowNext(): boolean {
    return this.deviceSettings.nowNext ?? true;
  }

  private get showStats(): boolean {
    return this.deviceSettings.stats ?? this.config?.debug ?? false;
  }

  private toggleSettings = (e?: Event): void => {
    e?.stopPropagation();
    this.settingsOpen = !this.settingsOpen;
    if (this.settingsOpen) this.sleepMenuOpen = false;
    this.showControls();
  };

  /** Saves a change for this target on this device; every card for the target applies it. */
  private changeSettings(patch: DeviceSettings): void {
    const c = this.config;
    if (!c) return;
    const next = { ...this.deviceSettings, ...patch };
    // A choice that matches the YAML isn't kept, so the card follows later YAML edits.
    if (next.buffer === c.buffer) next.buffer = undefined;
    if (next.nowNext === true) next.nowNext = undefined;
    if (next.stats === c.debug) next.stats = undefined;
    writeSettings(c.target, next);
    this.showControls();
  }

  private readonly settingsActions: SettingsActions = {
    toggle: this.toggleSettings,
    setBuffer: (buffer) => this.changeSettings({ buffer }),
    setNowNext: (nowNext) => this.changeSettings({ nowNext }),
    setStats: (stats) => this.changeSettings({ stats }),
    reset: () => this.config && writeSettings(this.config.target, {}),
  };

  private onSettingsEvent = (e: Event): void => {
    const d = (e as CustomEvent<{ target: string; settings: DeviceSettings }>).detail;
    if (!this.config || d.target !== this.config.target) return;
    const before = this.bufferMode;
    this.deviceSettings = d.settings;
    this.configureMultiview();
    this.syncStatsTimer();
    // The player's buffering is fixed when it starts, so a new mode needs a new connection:
    // the old one closes first (stopSession aborts its fetch), then evaluate() opens the next.
    if (this.bufferMode !== before && this.session?.source.type === 'mpegts') {
      this.stopSession('settings');
      this.evaluate();
    }
    this.refresh();
  };

  /** The stats overlay repaints every second while it shows. */
  private syncStatsTimer(): void {
    const want = this.showStats && this.isConnected;
    if (want && !this.debugTimer) this.debugTimer = setInterval(() => this.refresh(), 1000);
    else if (!want && this.debugTimer) {
      clearInterval(this.debugTimer);
      this.debugTimer = undefined;
    }
  }

  private onKeySeen = (): void => {
    if (this.keysSeen) return;
    this.keysSeen = true;
    this.refresh();
  };

  private onFrameClick = (): void => {
    if (this.sleepMenuOpen || this.settingsOpen) {
      this.sleepMenuOpen = false;
      this.settingsOpen = false;
      this.showControls();
      return;
    }
    if (this.status?.mutedByPolicy) {
      this.unmute();
      return;
    }
    if (this.controlsVisible && this.status?.state === 'playing') {
      this.controlsVisible = false;
      clearTimeout(this.controlsTimer);
      this.refresh();
    } else {
      this.showControls();
    }
  };

  private showControls(): void {
    this.controlsVisible = true;
    this.scheduleHideControls();
    this.refresh();
  }

  private scheduleHideControls(): void {
    clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => {
      if (this.status?.state === 'playing' && !this.sleepMenuOpen && !this.settingsOpen) {
        this.controlsVisible = false;
        this.refresh();
      }
    }, CONTROLS_HIDE_MS);
  }

  private toggleFullscreen = async (e?: Event): Promise<void> => {
    e?.stopPropagation();
    type FsDoc = Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => void;
    };
    type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };
    const doc = document as FsDoc;
    // The stage holds the picture, ident and controls, so they all follow it into full screen.
    const frame = this.renderRoot.querySelector('.stage') as FsEl | null;
    try {
      if (this.fullscreen) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else doc.webkitExitFullscreen?.();
        return;
      }
      if (frame?.requestFullscreen) await frame.requestFullscreen();
      else if (frame?.webkitRequestFullscreen) frame.webkitRequestFullscreen();
      else
        (
          this.video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }
        ).webkitEnterFullscreen?.();
    } catch (err) {
      console.warn('[stream-card] fullscreen failed', err);
    }
  };

  private onFullscreenChange = (): void => {
    const root = this.renderRoot as ShadowRoot;
    const doc = document as Document & { webkitFullscreenElement?: Element };
    const was = this.fullscreen;
    this.fullscreen = !!root.fullscreenElement || (doc.webkitFullscreenElement ?? null) === this;
    // Full screen is for the picture: an open channel panel doesn't follow it in.
    if (this.fullscreen !== was) this.overlayOpen = false;
    this.refresh();
  };

  // ---- hooks for the other 2.0 features ----

  /** Multiview: shown as a control-bar button only when this returns a function. */
  protected multiviewAction(): (() => void) | undefined {
    return this.multiviewAvailable && !this.isPreview ? this.enterMultiview : undefined;
  }

  // ---- rendering ----

  private get uiState(): UiState {
    if (this.isPreview) return 'preview';
    if (this.error) return 'error';
    if (this.session && this.status) {
      return this.status.state === 'error' || this.status.state === 'stopped'
        ? 'ready'
        : this.status.state;
    }
    if (!this.source && this.lookupPending) return this.lookupPlay ? 'connecting' : 'ready';
    if (this.zapTimer && this.source && this.wantPlaying && this.hold === null) return 'connecting';
    return this.source ? 'ready' : 'empty';
  }

  /** Snapshot for tests and the debug overlay. */
  get debugInfo() {
    const stats = this.session?.getStats();
    return {
      version: VERSION,
      ui: this.uiState,
      layout: this.layout,
      hold: this.hold,
      lastRelease: this.lastRelease,
      target: this.target,
      url: this.source?.url,
      title: this.source?.title,
      wantPlaying: this.wantPlaying,
      state: this.status?.state,
      failures: this.status?.failures ?? 0,
      mutedByPolicy: this.status?.mutedByPolicy ?? false,
      needsGesture: this.status?.needsGesture ?? false,
      muted: this.effectiveMuted,
      mediaInfo: this.status?.mediaInfo,
      notice: this.status?.notice,
      buffering: this.status?.buffering ?? false,
      buffer: this.bufferMode,
      error: this.error,
      lastError: this.status?.lastError,
      channels: { state: this.channelState, count: this.channels?.size ?? 0 },
      pickerOpen: this.guidePlacement !== undefined,
      guide: this.guidePlacement ?? 'hidden',
      volume: this.video.volume,
      sleep: this.sleep,
      typed: this.numbers.digits,
      multiview: this.mvOn ? this.mv?.debugInfo : undefined,
      stats,
    };
  }

  private get hasGuide(): boolean {
    return !!this.config?.channelList && !this.isPreview && this.channelState !== 'idle';
  }

  /** Over the picture in full screen, on a TV and with `guide: off`; otherwise under it. */
  private get guideOverlays(): boolean {
    return this.fullscreen || this.layout === 'tv' || this.config?.guide === 'off';
  }

  /** Where the guide shows now, if at all. It shows on its own while nothing is selected. */
  private get guidePlacement(): 'below' | 'overlay' | undefined {
    if (!this.hasGuide) return undefined;
    const empty = this.uiState === 'empty';
    if (this.guideOverlays) return this.overlayOpen || empty ? 'overlay' : undefined;
    return this.guideOpen || empty ? 'below' : undefined;
  }

  private buildView(): CardView {
    const c = this.config;
    const ui = this.uiState;
    const ch = this.currentChannel;
    const s = this.status;
    const nav = this.navView();
    const placement = this.guidePlacement;
    const idleMinutes = Math.round((c?.idleTimeoutMs ?? 0) / 60000);
    return {
      ...nav,
      ui,
      layout: this.layout,
      channel: ch,
      title: this.source?.title ?? ch?.name,
      nowNext: ch && ui !== 'preview' ? this.nowNext(ch) : undefined,
      chrome: !(ui === 'playing' && !this.controlsVisible),
      osd: Date.now() < this.osdUntil,
      muted: this.effectiveMuted,
      mutedByPolicy: !!s?.mutedByPolicy && !s.needsGesture,
      needsGesture: !!s?.needsGesture,
      buffering: !!s?.buffering,
      fullscreen: this.fullscreen,
      canStep: this.channelState === 'ready' && (this.channels?.size ?? 0) > 1,
      hasGuide: this.hasGuide,
      guideOpen: placement !== undefined,
      failures: s?.failures ?? 0,
      maxAttempts: c?.maxReconnectAttempts ?? 0,
      retryAt: s?.retryAt,
      canRetry: !!(this.source || this.request),
      errorMessage: this.error?.message,
      errorDetail: c?.debug ? this.error?.detail : undefined,
      stoppedReason: this.idleStopped
        ? `Stopped after ${idleMinutes} minute${idleMinutes === 1 ? '' : 's'} without interaction`
        : undefined,
      notice: ui === 'playing' ? s?.notice : undefined,
      debugText:
        this.showStats && ui !== 'preview' && ui !== 'empty' ? this.debugText() : undefined,
      sleepMenuOpen: this.sleepMenuOpen,
      settings: c?.settings
        ? {
            open: this.settingsOpen,
            buffer: this.bufferMode,
            nowNext: c.epg ? this.showNowNext : undefined,
            stats: this.showStats,
            custom: Object.keys(this.deviceSettings).length > 0,
          }
        : undefined,
      edit: c
        ? { target: c.target, profile: c.outputProfile, favourites: c.favourites.length }
        : undefined,
      now: Date.now(),
    };
  }

  private buildActions(): CardActions {
    return {
      ...this.navActions(),
      play: this.play,
      stop: this.stop,
      channelUp: this.channelUp,
      channelDown: this.channelDown,
      toggleMute: this.toggleMute,
      unmute: this.unmute,
      toggleFullscreen: this.toggleFullscreen,
      toggleGuide: this.togglePicker,
      toggleSleepMenu: this.toggleSleepMenu,
      multiview: this.multiviewAction(),
      settings: this.config?.settings ? this.settingsActions : undefined,
    };
  }

  private renderPicker(v: CardView, a: CardActions, overlay: boolean) {
    return html`<stream-card-picker
      class=${overlay ? 'overlay' : 'panel'}
      .list=${this.channels}
      .state=${this.channelState === 'idle' ? 'loading' : this.channelState}
      .message=${this.channelMessage}
      .currentId=${this.currentChannel?.id}
      .closable=${v.ui !== 'empty'}
      .recents=${v.recents ?? []}
      .nowNext=${this.nowNextFn}
      .now=${v.now}
      .numberEntry=${v.numberEntry}
      .pressDigit=${a.pressDigit}
      .clearDigits=${a.clearDigits}
      .layout=${v.layout}
      @click=${(e: Event) => e.stopPropagation()}
      @channel-pick=${this.onPick}
      @picker-close=${this.closePicker}
      @picker-retry=${this.retryChannels}
    ></stream-card-picker>`;
  }

  /** Stable reference, so the picker only re-renders tiles when something else changes. */
  private readonly nowNextFn = (ch: Channel): NowNext | undefined => this.nowNext(ch);

  protected override render(): TemplateResult {
    const ar = this.config?.aspectRatio ?? '16 / 9';
    const v = this.buildView();
    const a = this.buildActions();
    const placement = this.guidePlacement;
    const grid = this.mvOn && this.mv && !this.isPreview ? this.mv : undefined;
    this.scheduleTick(v);
    return html`
      <ha-card class=${v.ui === 'preview' ? 'editing' : ''}>
        <div
          class="stage ${v.layout === 'tv' ? 'tv' : ''} ${v.fullscreen ? 'fs' : ''}"
          data-layout=${v.layout}
          data-ui=${v.ui}
          ?hidden=${!!grid}
        >
          <div
            class="frame"
            data-state=${v.ui}
            style="aspect-ratio: ${ar}"
            tabindex="0"
            aria-label=${v.title ? `Stream card: ${v.title}` : 'Stream card'}
            @click=${this.onFrameClick}
          >
            <div class="video-host"></div>
            ${
              v.ui !== 'preview' && v.ui !== 'empty'
                ? html`<div class="sheen ${v.chrome ? '' : 'hidden'}"></div>`
                : nothing
            }
            ${renderChips(v)} ${renderOsd(v)} ${renderCenter(v, a)}
            ${v.notice ? html`<div class="notice" role="status">${v.notice}</div>` : nothing}
            ${v.debugText ? html`<div class="debug">${v.debugText}</div>` : nothing}
            ${renderTvHints(v, this.keysSeen)}
            ${placement === 'overlay' ? this.renderPicker(v, a, true) : nothing}
          </div>
          ${renderIdent(v)} ${renderControls(v, a)}
        </div>
        ${placement === 'below' && !grid ? this.renderPicker(v, a, false) : nothing}
        ${grid ?? nothing}
      </ha-card>
    `;
  }

  /**
   * Re-renders on a clock while something on screen counts: reconnect countdowns and the sleep
   * timer every second, programme progress bars every 30 s.
   */
  private scheduleTick(v: CardView): void {
    clearTimeout(this.tickTimer);
    if (!this.isConnected || v.ui === 'preview') return;
    const fast = (v.ui === 'reconnecting' && v.retryAt) || v.sleep || v.osd;
    const slow = v.nowNext?.now || v.layout === 'tv';
    if (!fast && !slow) return;
    this.tickTimer = setTimeout(() => this.refresh(), fast ? 1000 : 30_000);
  }

  private debugText(): string {
    const d = this.debugInfo;
    const mi = d.mediaInfo;
    const st = d.stats;
    const lines = [
      `stream-card ${d.version}`,
      `ui ${d.ui} · state ${d.state ?? '-'} · hold ${d.hold ?? 'none'}`,
      `last release ${d.lastRelease ?? '-'} · failures ${d.failures}`,
      mi
        ? `video ${mi.videoCodec ?? '-'} ${mi.width ?? '?'}x${mi.height ?? '?'} · audio ${mi.audioCodec ?? '-'}`
        : 'media -',
      st
        ? `${st.engine} · buffer ${st.bufferSeconds.toFixed(1)} s · ${st.speedKBps?.toFixed(0) ?? '-'} KB/s`
        : 'engine -',
      st ? `frames ${st.decodedFrames ?? '-'} · dropped ${st.droppedFrames ?? '-'}` : '',
      d.lastError ? `last error ${d.lastError}` : '',
      `channels ${d.channels.state} (${d.channels.count})`,
      `muted ${d.muted}${d.mutedByPolicy ? ' (autoplay policy)' : ''}`,
    ];
    return lines.filter(Boolean).join('\n');
  }
}
