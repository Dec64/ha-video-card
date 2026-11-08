//#region src/multiview.ts
var e = "stream-card-multiview";
function t(e) {
	return e.length < 2 ? !1 : e.slice(-2).every((e) => {
		let t = e.decoded + e.dropped;
		return t >= 30 && e.dropped / t > .25;
	});
}
var n = class {
	constructor() {
		let e = document.createElement("video");
		e.playsInline = !0, e.setAttribute("playsinline", ""), e.setAttribute("webkit-playsinline", ""), e.preload = "none", e.controls = !1, e.muted = !0, e.disableRemotePlayback = !0, this.video = e;
	}
};
function r(t) {
	customElements.get("stream-card-multiview") || customElements.define(e, i(t));
}
function i({ LitElement: e, html: r, css: i, nothing: a, svg: o, PlaybackSession: s, icon: c, format: l }) {
	var u;
	let d = (e) => o`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d=${e}></path></svg>`;
	return u = class extends e {
		constructor() {
			super(), this.settings = {
				startTimeoutMs: 2e4,
				maxAttempts: 5,
				debug: !1
			}, this.tiles = [], this.allowed = !1, this.slots = 2, this.audio = 0, this.soundOn = !0, this.fullscreen = !1, this.samples = [], this.struggling = !1, this.closePicker = (e) => {
				e?.stopPropagation(), this.pickFor = void 0, this.refresh();
			}, this.onPick = (e) => {
				e.stopPropagation();
				let t = this.pickFor;
				if (this.pickFor = void 0, t === void 0 || !this.resolve) return;
				let n = e.detail;
				try {
					this.setItem(t, this.resolve(n));
				} catch (e) {
					let n = e instanceof Error ? e.message : String(e), r = this.tile(t);
					this.stopTile(r), r.item = void 0, r.error = {
						kind: "config",
						message: n,
						detail: n
					}, this.refresh();
				}
			}, this.retryList = (e) => {
				e?.stopPropagation(), this.dispatchEvent(new CustomEvent("picker-retry"));
			}, this.toggleFullscreen = async (e) => {
				e.stopPropagation();
				try {
					this.fullscreen ? await document.exitFullscreen?.() : await this.requestFullscreen?.();
				} catch (e) {
					console.warn("[stream-card] fullscreen failed", e);
				}
			}, this.onFullscreenChange = () => {
				this.fullscreen = document.fullscreenElement === this, this.refresh();
			}, this.listState = "idle", this.maxTiles = 2, this._ui = 0;
		}
		open(e, t) {
			this.haltAll();
			for (let e of this.tiles) e.item = void 0, e.error = void 0;
			this.slots = Math.min(2, this.maxTiles), this.audio = 0, this.soundOn = !t, this.selected = void 0, this.resetStruggle(), e && (this.tile(0).item = e), this.pickFor = e ? void 0 : 0, this.sync();
		}
		setAllowed(e) {
			e !== this.allowed && (this.allowed = e, this.sync());
		}
		halt() {
			this.allowed = !1, this.haltAll(), this.refresh();
		}
		get mainItem() {
			return this.tiles[this.audio]?.item ?? this.tiles.find((e) => e.item)?.item;
		}
		get openCount() {
			return this.tiles.filter((e) => e.session).length;
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
				tiles: this.tiles.slice(0, this.slots).map((e) => ({
					url: e.item?.source.url,
					title: e.item?.source.title,
					state: e.status?.state,
					muted: e.session ? e.video.muted : void 0,
					error: e.error?.message
				}))
			};
		}
		tile(e) {
			for (; this.tiles.length <= e;) this.tiles.push(new n());
			return this.tiles[e];
		}
		refresh() {
			this._ui++;
		}
		tileMuted(e) {
			return !(this.soundOn && e === this.audio);
		}
		sync() {
			for (let e = 0; e < this.tiles.length; e++) {
				let t = this.tiles[e], n = this.allowed && e < this.slots && !!t.item && !t.error;
				n && !t.session ? this.startTile(e) : !n && t.session && this.stopTile(t);
			}
			this.allowed && this.openCount > 0 ? this.startSampler() : this.stopSampler(), this.refresh();
		}
		startTile(e) {
			let t = this.tile(e);
			if (!t.item) return;
			t.error = void 0, t.lastFrames = void 0;
			let n = new s(t.video, t.item.source, {
				startTimeoutMs: this.settings.startTimeoutMs,
				maxAttempts: this.settings.maxAttempts,
				muted: this.tileMuted(e),
				debug: this.settings.debug,
				buffer: this.settings.buffer,
				onStatus: (e) => this.onStatus(t, n, e)
			});
			t.session = n, t.status = n.status, n.start();
		}
		stopTile(e) {
			let t = e.session;
			e.session = void 0, e.status = void 0, e.lastFrames = void 0, t && t.destroy();
		}
		haltAll() {
			for (let e of this.tiles) this.stopTile(e);
			this.stopSampler();
		}
		onStatus(e, t, n) {
			e.session === t && (e.status = n, n.state === "error" ? (e.error = n.error, this.stopTile(e), this.sync()) : this.refresh());
		}
		setItem(e, t) {
			let n = this.tile(e);
			this.stopTile(n), n.item = t, n.error = void 0, this.resetStruggle(), t && !this.tiles[this.audio]?.item && this.moveSound(e), this.sync();
		}
		moveSound(e) {
			this.audio = e, this.tiles.forEach((e, t) => e.session?.setMuted(this.tileMuted(t)));
		}
		resetStruggle() {
			this.samples = [], this.struggling = !1;
			for (let e of this.tiles) e.lastFrames = void 0;
		}
		startSampler() {
			this.sampler || (this.sampler = setInterval(() => this.sample(), 2e3));
		}
		stopSampler() {
			clearInterval(this.sampler), this.sampler = void 0;
		}
		sample() {
			let e = {
				decoded: 0,
				dropped: 0
			};
			for (let t of this.tiles) {
				if (t.status?.state !== "playing") continue;
				let n = t.session?.getStats();
				if (n?.decodedFrames === void 0) continue;
				let r = {
					decoded: n.decodedFrames,
					dropped: n.droppedFrames ?? 0
				};
				t.lastFrames && (e.decoded += Math.max(0, r.decoded - t.lastFrames.decoded), e.dropped += Math.max(0, r.dropped - t.lastFrames.dropped)), t.lastFrames = r;
			}
			this.samples = [...this.samples.slice(-4), e], !this.struggling && t(this.samples) && (this.struggling = !0, this.refresh());
		}
		disconnectedCallback() {
			this.allowed = !1, this.haltAll(), document.removeEventListener("fullscreenchange", this.onFullscreenChange), super.disconnectedCallback();
		}
		connectedCallback() {
			super.connectedCallback(), document.addEventListener("fullscreenchange", this.onFullscreenChange);
		}
		updated(e) {
			this.renderRoot.querySelectorAll(".video-host").forEach((e) => {
				let t = this.tiles[Number(e.dataset.i)];
				t && t.video.parentElement !== e && e.appendChild(t.video);
			});
		}
		exit(e) {
			this.dispatchEvent(new CustomEvent("multiview-exit", { detail: { item: e } }));
		}
		setLayout(e) {
			if (e !== this.slots) {
				if (e < this.slots) {
					if (this.audio >= e && this.tiles[this.audio]?.item) {
						let t = this.tiles[this.audio], n = this.tile(e - 1);
						this.stopTile(n), this.stopTile(t), n.item = t.item, n.error = void 0, t.item = void 0, this.audio = e - 1;
					}
					for (let t = e; t < this.tiles.length; t++) this.stopTile(this.tiles[t]), this.tiles[t].item = void 0, this.tiles[t].error = void 0;
					this.audio >= e && (this.audio = 0), this.selected !== void 0 && this.selected >= e && (this.selected = void 0), this.pickFor !== void 0 && this.pickFor >= e && (this.pickFor = void 0);
				}
				this.slots = e, this.resetStruggle(), this.sync();
			}
		}
		onSound(e, t) {
			t.stopPropagation();
			let n = this.tiles[e];
			e === this.audio ? n?.status?.mutedByPolicy ? (this.soundOn = !0, n.session?.resumeFromGesture(!0)) : (this.soundOn = !this.soundOn, n?.session?.setMuted(this.tileMuted(e))) : (this.soundOn = !0, this.moveSound(e), n?.status?.mutedByPolicy && n.session?.resumeFromGesture(!0)), this.refresh();
		}
		onTileClick(e) {
			this.selected = this.selected === e ? void 0 : e, this.refresh();
		}
		openPicker(e, t) {
			t?.stopPropagation(), this.pickFor = e, this.selected = void 0, this.refresh();
		}
		retry(e, t) {
			t.stopPropagation();
			let n = this.tiles[e];
			n && (n.error = void 0, this.sync());
		}
		play(e, t) {
			t.stopPropagation(), this.tiles[e]?.session?.resumeFromGesture(!1);
		}
		removeTile(e, t) {
			if (t.stopPropagation(), this.selected = void 0, this.setItem(e, void 0), e === this.audio) {
				let e = this.tiles.findIndex((e, t) => t < this.slots && e.item);
				e >= 0 && this.moveSound(e);
			}
			this.refresh();
		}
		watchAlone(e, t) {
			t.stopPropagation(), this.exit(this.tiles[e]?.item);
		}
		render() {
			let e = this.openCount, t = this.maxTiles > 2 ? [2, this.maxTiles] : [];
			return r`
        <div class="bar">
          <span class="name">Multiview</span>
          <span class="count" role="status"
            >${e} Dispatcharr connection${e === 1 ? "" : "s"} open</span
          >
          <span class="grow"></span>
          ${t.map((e) => r`<button
                class="pill layout ${e === this.slots ? "on" : ""}"
                aria-pressed=${e === this.slots ? "true" : "false"}
                @click=${() => this.setLayout(e)}
              >
                ${e === 2 ? "2 × 1" : e === 3 ? "3 tiles" : "2 × 2"}
              </button>`)}
          <button
            class="pill icon-only fs"
            @click=${this.toggleFullscreen}
            aria-label=${this.fullscreen ? "Exit full screen" : "Full screen"}
          >
            ${c(this.fullscreen ? "fullscreenExit" : "fullscreen")}
          </button>
          <button class="pill exit" @click=${() => this.exit(this.mainItem)}>Exit</button>
        </div>
        ${this.struggling ? r`<div class="struggling" role="status">${l("multiviewStruggling")}</div>` : a}
        <div class="grid" data-slots=${this.slots}>
          ${Array.from({ length: this.slots }, (e, t) => this.renderTile(t))}
        </div>
        ${this.pickFor === void 0 ? a : this.renderPicker()}
      `;
		}
		renderPicker() {
			return r`<stream-card-picker
        class="overlay"
        .list=${this.list}
        .state=${this.listState === "idle" ? "loading" : this.listState}
        .message=${this.listMessage}
        .currentId=${this.tiles[this.pickFor ?? -1]?.item?.channel?.id}
        .closable=${!0}
        @click=${(e) => e.stopPropagation()}
        @channel-pick=${this.onPick}
        @picker-close=${this.closePicker}
        @picker-retry=${this.retryList}
      ></stream-card-picker>`;
		}
		renderTile(e) {
			let t = this.tile(e);
			if (!t.item) return r`<button
          class="tile add"
          data-i=${e}
          @click=${(t) => this.openPicker(e, t)}
        >
          <span class="add-icon">${d("M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z")}</span>
          <span class="add-title">Add a channel</span>
          <span class="add-detail"
            >${t.error?.message ?? "Opens another Dispatcharr connection"}</span
          >
        </button>`;
			let n = e === this.audio, i = t.item.channel, o = t.error ? "error" : t.status?.state ?? "stopped", s = this.selected === e, l = n ? this.soundOn && !t.status?.mutedByPolicy ? "Mute" : "Unmute" : "Move sound to this tile";
			return r`<div
        class="tile ${n ? "audio" : ""} ${s ? "selected" : ""}"
        data-i=${e}
        data-state=${o}
        @click=${() => this.onTileClick(e)}
      >
        <div class="video-host" data-i=${e}></div>
        ${this.renderTileState(e, t, o)}
        <button
          class="snd ${n && this.soundOn ? "on" : ""}"
          @click=${(t) => this.onSound(e, t)}
          aria-label=${l}
          aria-pressed=${n ? "true" : "false"}
        >
          ${c(n && this.soundOn && !t.status?.mutedByPolicy ? "volumeHigh" : "volumeOff")}
        </button>
        <div class="tag">
          ${i?.logo ? r`<img
                  class="logo"
                  src=${i.logo}
                  alt=""
                  @error=${(e) => e.target.hidden = !0}
                />` : a}
          ${i?.number ? r`<span class="num">${i.number}</span>` : a}
          <span class="title">${t.item.source.title ?? i?.name ?? "Live"}</span>
        </div>
        ${s ? r`<div class="actions">
                <button class="pill change" @click=${(t) => this.openPicker(e, t)}>
                  ${c("list")} Channel
                </button>
                <button class="pill alone" @click=${(t) => this.watchAlone(e, t)}>
                  ${d("M10,21V19H6.41L10.91,14.5L9.5,13.09L5,17.59V14H3V21H10M14.5,10.91L19,6.41V10H21V3H14V5H17.59L13.09,9.5L14.5,10.91Z")} Full size
                </button>
                <button class="pill remove" @click=${(t) => this.removeTile(e, t)}>
                  ${c("close")} Remove
                </button>
              </div>` : a}
      </div>`;
		}
		renderTileState(e, t, n) {
			return n === "error" ? r`<div class="layer dim" role="alert">
          <div class="message">${t.error?.message}</div>
          <button class="pill retry" @click=${(t) => this.retry(e, t)}>
            ${c("refresh")} Retry
          </button>
        </div>` : t.status?.needsGesture ? r`<div class="layer dim">
          <button class="big-play" @click=${(t) => this.play(e, t)} aria-label="Play">
            ${c("play")}
          </button>
        </div>` : n === "connecting" || n === "reconnecting" ? r`<div class="layer">
          <div class="spinner" role="progressbar" aria-label=${n === "reconnecting" ? "Reconnecting…" : "Connecting…"}></div>
        </div>` : a;
		}
	}, u.properties = {
		list: { attribute: !1 },
		listState: { attribute: !1 },
		listMessage: { attribute: !1 },
		maxTiles: { attribute: !1 },
		_ui: { state: !0 }
	}, u.styles = i`
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
    `, u;
}
//#endregion
export { e as MULTIVIEW_TAG, r as defineMultiview };

//# sourceMappingURL=stream-card-multiview-iC1Ew4We.js.map