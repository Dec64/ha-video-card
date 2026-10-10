import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { ConfigError, normalizeConfig, resolveSource } from './config';
import { VERSION } from './const';
import { getController, type ControllerCard, type StreamController } from './controller';
import type { PlaybackError } from './errors';
import { icon } from './icons';
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
    if (this.request) this.applyRequest(this.request, this.wantPlaying);
    else if (this.isConnected) this.pickInitialRequest();
    this.refresh();
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
    return { dispatcharr_url: 'https://dispatcharr.example', output_profile: 1, target: 'tv' };
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
    if (changed.has('preview') || changed.has('editMode')) this.evaluate();
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
    const req = this.controller.lastFor(this.target) ?? this.config.defaultRequest;
    if (req) this.applyRequest(req, this.config.autoplay);
  }

  private refresh(): void {
    this._ui++;
  }

  private applyRequest(req: StreamRequest, play: boolean): void {
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
    this.evaluate();
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
    this.wantPlaying = false;
    this.idleStopped = true;
    this.evaluate();
    this.lastRelease = 'idle';
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
    if (this.request && !this.source) this.applyRequest(this.request, true);
    this.wantPlaying = true;
    this.evaluate();
  };

  private stop = (e?: Event): void => {
    e?.stopPropagation();
    this.wantPlaying = false;
    this.evaluate();
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
    this.fullscreen = !!root.fullscreenElement || (doc.webkitFullscreenElement ?? null) === this;
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
      muted: this.video.muted,
      mediaInfo: this.status?.mediaInfo,
      notice: this.status?.notice,
      error: this.error,
      lastError: this.status?.lastError,
      stats,
    };
  }

  protected override render(): TemplateResult {
    const ar = this.config?.aspectRatio ?? '16 / 9';
    const ui = this.uiState;
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
          ${this.config?.debug ? html`<div class="debug">${this.debugText()}</div>` : nothing}
        </div>
      </ha-card>
    `;
  }

  private renderBadge(ui: UiState, hidden: boolean) {
    const title = this.source?.title;
    if (!title && ui !== 'playing') return nothing;
    return html`<div class="badge ${hidden ? 'hidden' : ''}">
      ${ui === 'playing' ? html`<span class="live-dot" role="img" aria-label="Live"></span>` : nothing}
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
          <div class="message">Choose a channel</div>
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
          ${
            this.source || this.request
              ? html`<button class="pill primary retry" @click=${this.play}>
                  ${icon('refresh')} Retry
                </button>`
              : nothing
          }
        </div>`;
      case 'connecting':
      case 'reconnecting': {
        if (this.status?.needsGesture) return this.renderPlayButton('Tap to play');
        const s = this.status;
        const text =
          ui === 'reconnecting' && s
            ? `Reconnecting… (attempt ${s.failures} of ${this.config?.maxReconnectAttempts ?? '?'})`
            : 'Connecting…';
        return html`<div class="layer">
          <div class="spinner" role="progressbar" aria-label=${text}></div>
          <div class="message">${text}</div>
        </div>`;
      }
      case 'playing':
        return this.status?.needsGesture ? this.renderPlayButton('Tap to play') : nothing;
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
    if (ui === 'preview' || ui === 'empty') return nothing;
    const active = ui === 'playing' || ui === 'connecting' || ui === 'reconnecting';
    return html`<div class="controls ${hidden ? 'hidden' : ''}">
      ${
        active
          ? html`<button class="ctl-stop" @click=${this.stop} aria-label="Stop">
              ${icon('stop')}
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
      `muted ${d.muted}${d.mutedByPolicy ? ' (autoplay policy)' : ''}`,
    ];
    return lines.filter(Boolean).join('\n');
  }
}
