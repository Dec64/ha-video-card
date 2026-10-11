import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { ChannelList, loadChannels, type Channel } from './channels';
import { ConfigError, isUuid, needsLookup, normalizeConfig, resolveSource } from './config';
import { VERSION } from './const';
import { getController, type ControllerCard, type StreamController } from './controller';
import { format, type PlaybackError } from './errors';
import { icon } from './icons';
import { readRemembered, writeRemembered } from './memory';
import type { PickerState } from './picker';
import { holdReason, LifecycleWatcher, type HoldReason } from './lifecycle';
import { PlaybackSession, type SessionStatus } from './session';
import { styles } from './styles';
import type { ResolvedConfig, StreamCardConfig, StreamRequest, StreamSource } from './types';

type UiState = 'preview' | 'empty' | 'ready' | 'connecting' | 'reconnecting' | 'playing' | 'error';

const CONTROLS_HIDE_MS = 4000;
const PREVIEW_HOSTS = new Set([
  'HUI-CARD-PREVIEW',
  'HUI-CARD-PICKER',
  'HUI-DIALOG-EDIT-CARD',
  'HUI-CARD-ELEMENT-EDITOR',
]);

/** Walks up through shadow roots looking for HA's card editor/picker. */
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
  private debugTimer?: ReturnType<typeof setInterval>;
  private inEditor = false;
  private fullscreen = false;
  private channels?: ChannelList;
  private channelState: PickerState | 'idle' = 'idle';
  private channelMessage?: string;
  private channelsPromise?: Promise<ChannelList | undefined>;
  private channelsKey?: string;
  private pickerOpen = false;
  private requestSeq = 0;
  /** A channel name or number is waiting for the channel list. */
  private lookupPending = false;
  /** Whether that pending channel should play once found; a stop clears it. */
  private lookupPlay = false;
  /** The controller's stop count for this target when this card last took a request or stop. */
  private stopGen?: number;

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
    this.applyRequest(req, true);
  }

  stopFromController(): void {
    this.wantPlaying = false;
    this.lookupPlay = false;
    this.stopGen = this.controller.stopCount(this.target);
    this.remember();
    this.evaluate();
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
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
    this.pickInitialRequest();
    // A stop button pressed while this card was off the page (a closed pop-up) still counts.
    if (this.stopGen !== undefined && this.stopGen !== this.controller.stopCount(this.target)) {
      this.stopFromController();
    }
    this.ensureChannels();
    if (this.config?.debug) this.debugTimer = setInterval(() => this.refresh(), 1000);
    this.evaluate();
  }

  override disconnectedCallback(): void {
    this.watcher.detach();
    this.controller.unregister(this);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
    clearInterval(this.debugTimer);
    clearTimeout(this.controlsTimer);
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
    if (pending) {
      this.applyRequest(pending, true);
      return;
    }
    if (this.request) return;
    const last = this.controller.lastFor(this.target);
    if (last) {
      this.applyRequest(last, this.config.autoplay);
      return;
    }
    // A channel this device left stopped comes back stopped.
    const saved = this.config.rememberChannel ? readRemembered(this.target) : undefined;
    if (saved) {
      const req = { channel: saved.channel, url: saved.url, title: saved.title };
      this.applyRequest(req, this.config.autoplay && saved.playing !== false);
      return;
    }
    if (this.config.defaultRequest)
      this.applyRequest(this.config.defaultRequest, this.config.autoplay);
  }

  private refresh(): void {
    this._ui++;
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
    this.source = { ...src, title: req.title ?? src.title };
    this.error = undefined;
    if (play) this.wantPlaying = true;
    this.remember();
    this.evaluate();
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
    const reason = holdReason({
      connected: this.isConnected,
      preview: this.isPreview,
      hasSource: !!this.source,
      wantPlaying: this.wantPlaying,
      intersecting: this.watcher.intersecting,
      pageVisible: this.watcher.pageVisible,
      screenAwake: this.watcher.screenAwake,
    });
    this.hold = reason;
    if (reason === null) {
      if (!this.session) this.startSession();
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
      buffer: this.config.buffer,
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
    if (s.state === 'playing') this.scheduleHideControls();
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
    const hadFocus = this.pickerHasFocus();
    this.pickerOpen = false;
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
    this.pickerOpen = !this.pickerOpen;
    if (this.pickerOpen) this.ensureChannels();
    this.showControls();
  };

  private closePicker = (e?: Event): void => {
    e?.stopPropagation();
    const hadFocus = this.pickerHasFocus();
    this.pickerOpen = false;
    this.refresh();
    if (hadFocus) this.restoreFocus();
  };

  private retryChannels = (e?: Event): void => {
    e?.stopPropagation();
    void this.ensureChannels(true);
  };

  private channelStep(delta: 1 | -1): void {
    const ch = this.channels?.neighbour(this.currentChannel?.id, delta);
    if (ch) this.playChannel(ch);
    this.showControls();
  }

  private channelUp = (e?: Event): void => {
    e?.stopPropagation();
    this.channelStep(1);
  };

  private channelDown = (e?: Event): void => {
    e?.stopPropagation();
    this.channelStep(-1);
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

  private onFrameClick = (): void => {
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
      if (this.status?.state === 'playing') {
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
    const frame = this.renderRoot.querySelector('.frame') as FsEl | null;
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
    if (this.fullscreen && !was) this.pickerOpen = false;
    this.refresh();
  };

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
    return this.source ? 'ready' : 'empty';
  }

  /** Snapshot for tests and the debug overlay. */
  get debugInfo() {
    const stats = this.session?.getStats();
    return {
      version: VERSION,
      ui: this.uiState,
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
      error: this.error,
      lastError: this.status?.lastError,
      channels: { state: this.channelState, count: this.channels?.size ?? 0 },
      pickerOpen: this.showPicker,
      stats,
    };
  }

  /** The picker shows when asked for, and on its own while nothing is selected. */
  private get showPicker(): boolean {
    if (!this.config?.channelList || this.isPreview || this.channelState === 'idle') return false;
    return this.pickerOpen || this.uiState === 'empty';
  }

  private renderPicker(ui: UiState, overlay: boolean) {
    return html`<stream-card-picker
      class=${overlay ? 'overlay' : 'panel'}
      .list=${this.channels}
      .state=${this.channelState === 'idle' ? 'loading' : this.channelState}
      .message=${this.channelMessage}
      .currentId=${this.currentChannel?.id}
      .closable=${ui !== 'empty'}
      @click=${(e: Event) => e.stopPropagation()}
      @channel-pick=${this.onPick}
      @picker-close=${this.closePicker}
      @picker-retry=${this.retryChannels}
    ></stream-card-picker>`;
  }

  protected override render(): TemplateResult {
    const ar = this.config?.aspectRatio ?? '16 / 9';
    const ui = this.uiState;
    const picker = this.showPicker;
    const playing = ui === 'playing';
    const controlsHidden = playing && !this.controlsVisible;
    return html`
      <ha-card>
        <div class="frame" data-state=${ui} style="aspect-ratio: ${ar}" @click=${this.onFrameClick}>
          <div class="video-host"></div>
          ${this.renderBadge(ui, controlsHidden)} ${this.renderCenter(ui)}
          ${
            this.status?.mutedByPolicy && !this.status.needsGesture
              ? html`<button class="pill unmute" @click=${this.unmute} aria-label="Unmute">
                  ${icon('volumeOff')} Tap to unmute
                </button>`
              : nothing
          }
          ${
            this.status?.notice && ui === 'playing'
              ? html`<div class="notice" role="status">${this.status.notice}</div>`
              : nothing
          }
          ${this.renderControls(ui, controlsHidden)}
          ${
            this.config?.debug && ui !== 'preview' && ui !== 'empty'
              ? html`<div class="debug">${this.debugText()}</div>`
              : nothing
          }
          ${picker && this.fullscreen ? this.renderPicker(ui, true) : nothing}
        </div>
        ${picker && !this.fullscreen ? this.renderPicker(ui, false) : nothing}
      </ha-card>
    `;
  }

  private renderBadge(ui: UiState, hidden: boolean) {
    const ch = this.currentChannel;
    const title = this.source?.title ?? ch?.name;
    if (!title && ui !== 'playing') return nothing;
    return html`<div class="badge ${hidden ? 'hidden' : ''}">
      ${ui === 'playing' ? html`<span class="live-dot" role="img" aria-label="Live"></span>` : nothing}
      ${ch?.logo ? html`<img class="badge-logo" src=${ch.logo} alt="" />` : nothing}
      ${ch?.number ? html`<span class="badge-num">${ch.number}</span>` : nothing}
      <span class="title">${title ?? 'Live'}</span>
    </div>`;
  }

  private renderCenter(ui: UiState) {
    switch (ui) {
      case 'preview':
        return html`<div class="layer dim">
          <span class="placeholder-icon">${icon('tv')}</span>
          <div class="message">Stream card · playback is off while editing</div>
          ${this.config ? html`<div class="message detail">target: ${this.target}</div>` : nothing}
        </div>`;
      case 'empty':
        return html`<div class="layer">
          <span class="placeholder-icon">${icon('tv')}</span>
          <div class="message">
            ${this.config?.channelList && !this.isPreview ? 'Choose a channel below' : 'Choose a channel'}
          </div>
        </div>`;
      case 'error':
        return html`<div class="layer dim" role="alert">
          <span class="error-icon">${icon('alert')}</span>
          <div class="message">${this.error?.message}</div>
          ${
            this.config?.debug && this.error?.detail
              ? html`<div class="message detail">${this.error.detail}</div>`
              : nothing
          }
          <div class="actions">
            ${
              this.source || this.request
                ? html`<button class="pill primary retry" @click=${this.play}>
                    ${icon('refresh')} Retry
                  </button>`
                : nothing
            }
            ${
              this.config?.channelList
                ? html`<button
                    class="pill channels"
                    @click=${this.togglePicker}
                    aria-expanded=${this.pickerOpen ? 'true' : 'false'}
                  >
                    ${icon('list')} Channels
                  </button>`
                : nothing
            }
          </div>
        </div>`;
      case 'connecting':
      case 'reconnecting': {
        if (this.status?.needsGesture) return this.renderPlayButton('Tap to play');
        const s = this.status;
        const text =
          ui === 'reconnecting' && s
            ? `Reconnecting… (attempt ${s.failures} of ${this.config?.maxReconnectAttempts ?? '?'})`
            : s?.buffering
              ? 'Buffering…'
              : 'Connecting…';
        return html`<div class="layer">
          <div class="spinner" role="progressbar" aria-label=${text}></div>
          <div class="message">${text}</div>
        </div>`;
      }
      case 'playing':
        if (this.status?.needsGesture) return this.renderPlayButton('Tap to play');
        // buffer: stable refilling its reserve after running dry.
        return this.status?.buffering
          ? html`<div class="layer">
              <div class="spinner" role="progressbar" aria-label="Buffering…"></div>
              <div class="message">Buffering…</div>
            </div>`
          : nothing;
      case 'ready': {
        const minutes = Math.round((this.config?.idleTimeoutMs ?? 0) / 60000);
        const why = this.idleStopped
          ? `Stopped after ${minutes} minute${minutes === 1 ? '' : 's'} without interaction`
          : undefined;
        return this.renderPlayButton(why);
      }
    }
  }

  private renderPlayButton(text?: string) {
    return html`<div class="layer ${text ? 'dim' : ''}">
      <button class="big-play" @click=${this.play} aria-label="Play">${icon('play')}</button>
      ${text ? html`<div class="message">${text}</div>` : nothing}
    </div>`;
  }

  private renderControls(ui: UiState, hidden: boolean) {
    // The error layer has its own Retry and Channels buttons in the middle.
    if (ui === 'preview' || ui === 'empty' || ui === 'error') return nothing;
    const active = ui === 'playing' || ui === 'connecting' || ui === 'reconnecting';
    const canStep = this.channelState === 'ready' && (this.channels?.size ?? 0) > 1;
    return html`<div class="controls ${hidden ? 'hidden' : ''}">
      ${
        active
          ? html`<button class="ctl-stop" @click=${this.stop} aria-label="Stop">
              ${icon('stop')}
            </button>`
          : nothing
      }
      ${
        canStep
          ? html`<button class="ctl-down" @click=${this.channelDown} aria-label="Previous channel">
                ${icon('chevronDown')}
              </button>
              <button class="ctl-up" @click=${this.channelUp} aria-label="Next channel">
                ${icon('chevronUp')}
              </button>`
          : nothing
      }
      ${
        this.config?.channelList
          ? html`<button
              class="ctl-channels"
              @click=${this.togglePicker}
              aria-label=${this.pickerOpen ? 'Hide channels' : 'Channels'}
              aria-expanded=${this.pickerOpen ? 'true' : 'false'}
            >
              ${icon('list')}
            </button>`
          : nothing
      }
      <button
        class="ctl-mute"
        @click=${this.toggleMute}
        aria-label=${this.effectiveMuted ? 'Unmute' : 'Mute'}
      >
        ${icon(this.effectiveMuted ? 'volumeOff' : 'volumeHigh')}
      </button>
      <button
        class="ctl-fullscreen"
        @click=${this.toggleFullscreen}
        aria-label=${this.fullscreen ? 'Exit full screen' : 'Full screen'}
      >
        ${icon(this.fullscreen ? 'fullscreenExit' : 'fullscreen')}
      </button>
    </div>`;
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
