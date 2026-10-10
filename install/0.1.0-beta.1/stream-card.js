import { a as e, i as t, n, o as r, r as i } from "./stream-card-video-lock-8Ql6vIdM.js";
//#region src/const.ts
var a = "stream-card", o = "Stream Card", s = "0.1.0-beta.1", c = "__streamCard", l = "stream-card-power", u = class extends Error {
	constructor(...e) {
		super(...e), this.name = "ConfigError";
	}
}, d = 6e4;
function f(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function p(e, t) {
	let n = e[t];
	if (n != null && n !== "") {
		if (typeof n != "string" && typeof n != "number") throw new u(`"${t}" must be text`);
		return String(n).trim();
	}
}
function m(e, t, n) {
	let r = e[t];
	if (r == null) return n;
	if (typeof r != "boolean") throw new u(`"${t}" must be true or false`);
	return r;
}
function h(e, t, n, r) {
	let i = e[t];
	if (i == null || i === "") return n;
	let a = typeof i == "string" ? Number(i) : i;
	if (typeof a != "number" || !Number.isFinite(a) || a < r) throw new u(`"${t}" must be a number of at least ${r}`);
	return a;
}
function ee(e) {
	let t;
	try {
		t = new URL(e);
	} catch {
		throw new u("\"dispatcharr_url\" must be a full URL, e.g. https://dispatcharr.example");
	}
	if (t.protocol !== "http:" && t.protocol !== "https:") throw new u("\"dispatcharr_url\" must start with http:// or https://");
	return e.replace(/\/+$/, "");
}
function te(e) {
	if (!e) return "16 / 9";
	let t = /^\s*(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)\s*$/.exec(e);
	if (t && Number(t[1]) > 0 && Number(t[2]) > 0) return `${t[1]} / ${t[2]}`;
	let n = Number(e);
	if (Number.isFinite(n) && n > 0) return String(n);
	throw new u("\"aspect_ratio\" must look like \"16:9\"");
}
function g(e) {
	if (!f(e)) throw new u("Card config must be an object");
	let t = e, n = p(t, "dispatcharr_url"), r = p(t, "output_profile");
	if (r !== void 0 && !/^\d+$/.test(r)) throw new u("\"output_profile\" must be the numeric ID of a Dispatcharr output profile");
	let i = p(t, "url_template") ?? "{base}/proxy/ts/stream/{channel}";
	if (!i.includes("{channel}")) throw new u("\"url_template\" must contain {channel}");
	let a = t.reconnect;
	if (a !== void 0 && !f(a)) throw new u("\"reconnect\" must be an object, e.g. { max_attempts: 5 }");
	let o = p(t, "channel"), s = p(t, "url"), c = p(t, "title"), l = o || s ? {
		channel: o,
		url: s,
		title: c
	} : void 0, g = {
		target: p(t, "target") ?? "default",
		dispatcharrUrl: n ? ee(n) : void 0,
		outputProfile: r,
		urlTemplate: i,
		defaultRequest: l,
		autoplay: m(t, "autoplay", !0),
		muted: m(t, "muted", !1),
		aspectRatio: te(p(t, "aspect_ratio")),
		idleTimeoutMs: h(t, "idle_timeout", 0, 0) * d,
		startTimeoutMs: h(t, "start_timeout", 20, 1) * 1e3,
		maxReconnectAttempts: a ? h(a, "max_attempts", 5, 0) : 5,
		debug: m(t, "debug", !1)
	};
	return l?.channel && re(l, g), g;
}
function ne(e) {
	let t = e.split(/[?#]/)[0].toLowerCase();
	return t.endsWith(".m3u8") || t.endsWith(".mp4") || t.endsWith(".webm") ? "native" : "mpegts";
}
function re(e, t) {
	if (e.url) {
		let t;
		try {
			t = new URL(e.url, document.baseURI);
		} catch {
			throw new u(`"${e.url}" is not a valid URL`);
		}
		return {
			url: t.href,
			type: e.type ?? ne(t.href),
			title: e.title
		};
	}
	if (!e.channel) throw new u("Nothing to play: set \"channel\" or \"url\"");
	let n = String(e.channel).trim();
	if (!n || /[/?#\s]/.test(n)) throw new u(`"${n}" is not a valid channel ID`);
	if (t.urlTemplate.includes("{base}") && !t.dispatcharrUrl) throw new u("Set \"dispatcharr_url\" on the card to play channels");
	let r = t.urlTemplate.replaceAll("{base}", t.dispatcharrUrl ?? "").replaceAll("{channel}", encodeURIComponent(n)), i;
	try {
		i = new URL(r);
	} catch {
		throw new u(`"url_template" produced an invalid URL: ${r}`);
	}
	return t.outputProfile && !i.searchParams.has("output_profile") && i.searchParams.set("output_profile", t.outputProfile), {
		url: i.href,
		type: e.type ?? "mpegts",
		title: e.title,
		channel: n
	};
}
function ie(e) {
	if (!f(e)) return;
	let t = (t) => {
		let n = e[t];
		if (typeof n == "string" && n.trim()) return n.trim();
		if (typeof n == "number") return String(n);
	}, n = t("action");
	if (n !== void 0 && n !== "play" && n !== "stop") return;
	let r = t("type");
	if (r !== void 0 && r !== "mpegts" && r !== "native") return;
	let i = {
		target: t("target"),
		action: n ?? "play",
		channel: t("channel"),
		url: t("url"),
		type: r,
		title: t("title"),
		open: t("open")
	};
	if (i.action !== "play" || i.channel || i.url) return i;
}
var ae = class {
	constructor(e = window) {
		this.win = e, this.version = s, this.power = {
			screenOn: !0,
			screensaver: !1
		}, this.pending = /* @__PURE__ */ new Map(), this.last = /* @__PURE__ */ new Map(), this.cards = /* @__PURE__ */ new Set(), this.installed = !1, this.onLlCustom = (e) => {
			let t = e.detail;
			if (!t || !("stream_card" in t)) return;
			let n = ie(t.stream_card);
			n ? this.request(n) : console.warn("[stream-card] Ignoring a button with an invalid stream_card block:", t);
		};
	}
	install() {
		this.installed || (this.installed = !0, this.win.addEventListener("ll-custom", this.onLlCustom), this.bindFully());
	}
	uninstall() {
		this.installed && (this.installed = !1, this.win.removeEventListener("ll-custom", this.onLlCustom));
	}
	register(e) {
		this.cards.add(e);
	}
	unregister(e) {
		this.cards.delete(e);
	}
	request(e) {
		let t = e.target ?? "default";
		if (e.action === "stop") {
			this.stop(t);
			return;
		}
		let n = {
			...e,
			target: t
		};
		this.last.set(t, n);
		let r = [...this.cards].filter((e) => e.target === t && e.isLive);
		if (r.length) {
			this.pending.delete(t);
			for (let e of r) e.deliver(n);
		} else this.pending.set(t, {
			req: n,
			at: Date.now()
		});
		e.open && this.navigate(e.open);
	}
	take(e) {
		let t = this.pending.get(e);
		if (t && (this.pending.delete(e), !(Date.now() - t.at > 3e4))) return t.req;
	}
	lastFor(e) {
		return this.last.get(e);
	}
	stop(e) {
		this.pending.delete(e), this.last.delete(e);
		for (let t of this.cards) t.target === e && t.stopFromController();
	}
	navigate(e) {
		let t = this.win.location, n;
		if (e.startsWith("#")) {
			if (t.hash === e) return;
			n = t.href.split("#")[0] + e;
		} else n = e;
		this.win.history.pushState(null, "", n), this.win.dispatchEvent(new CustomEvent("location-changed", {
			detail: { replace: !1 },
			bubbles: !0,
			composed: !0
		}));
	}
	bindFully() {
		let e = this.win.fully;
		if (!e || typeof e.bind != "function") return;
		let t = (e) => `window.${c} && window.${c}.onFullyEvent(${JSON.stringify(e)})`;
		for (let n of [
			"screenOn",
			"screenOff",
			"onScreensaverStart",
			"onScreensaverStop"
		]) try {
			e.bind(n, t(n));
		} catch (e) {
			console.warn("[stream-card] Could not bind Fully Kiosk event", n, e);
		}
	}
	onFullyEvent(e) {
		if (e === "screenOn") this.power.screenOn = !0;
		else if (e === "screenOff") this.power.screenOn = !1;
		else if (e === "onScreensaverStart") this.power.screensaver = !0;
		else if (e === "onScreensaverStop") this.power.screensaver = !1;
		else return;
		this.win.dispatchEvent(new CustomEvent(l, { detail: { ...this.power } }));
	}
};
function oe(e = window) {
	let t = e, n = t[c];
	return n || (n = new ae(e), t[c] = n), n.install(), n;
}
//#endregion
//#region src/engines/native-engine.ts
var se = class {
	constructor() {
		this.kind = "native", this.emitter = new r(), this.destroyed = !1, this.gotData = !1, this.cleanup = [];
	}
	on(e) {
		return this.emitter.on(e);
	}
	async load(e, t) {
		if (this.destroyed) return;
		if (t.url.split(/[?#]/)[0].toLowerCase().endsWith(".m3u8") && !e.canPlayType("application/vnd.apple.mpegurl")) throw new i({
			kind: "unsupported-device",
			detail: "native HLS not available in this browser"
		});
		this.video = e;
		let n = (t, n) => {
			e.addEventListener(t, n), this.cleanup.push(() => e.removeEventListener(t, n));
		}, r = () => {
			this.gotData || (this.gotData = !0, this.emitter.emit({ type: "data" }));
		};
		n("loadeddata", r), n("progress", r), n("loadedmetadata", () => {
			r(), this.emitter.emit({
				type: "media-info",
				hasVideo: e.videoWidth > 0,
				width: e.videoWidth,
				height: e.videoHeight
			});
		}), n("ended", () => this.emitter.emit({
			type: "error",
			error: {
				kind: "ended",
				detail: "Stream ended"
			}
		})), n("error", () => {
			let t = e.error;
			if (!t || t.code === MediaError.MEDIA_ERR_ABORTED) return;
			let n = `MediaError ${t.code}${t.message ? `: ${t.message}` : ""}`, r = t.code === MediaError.MEDIA_ERR_NETWORK ? "network" : t.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ? "codec" : "media";
			this.emitter.emit({
				type: "error",
				error: {
					kind: r,
					detail: n
				}
			});
		}), e.src = t.url, e.load();
	}
	async destroy() {
		if (!this.destroyed) {
			this.destroyed = !0, this.emitter.clear();
			for (let e of this.cleanup.splice(0)) e();
			this.video && e(this.video), this.video = void 0;
		}
	}
	getStats(e) {
		let n = e.getVideoPlaybackQuality?.();
		return {
			engine: "native",
			bufferSeconds: t(e),
			decodedFrames: n?.totalVideoFrames,
			droppedFrames: n?.droppedVideoFrames
		};
	}
}, ce = async (e, { debug: t }) => {
	if (e === "native") return new se();
	let { MpegtsEngine: n } = await import("./stream-card-mpegts-engine-rPTAqmmc.js");
	return new n(t);
}, le = {
	cors: "Dispatcharr blocked this page's request (CORS). Check that nothing in front of Dispatcharr removes its Access-Control-Allow-Origin header.",
	network: "Can't reach Dispatcharr. Check dispatcharr_url and that this device can reach it.",
	http404: "Dispatcharr doesn't know this channel (404). Check the channel ID.",
	httpDenied: "Dispatcharr refused the stream ({status}). Check Dispatcharr's network access settings for streams.",
	http: "Dispatcharr returned an error ({status}).",
	timeout: "No data from Dispatcharr after {seconds} s. If an output profile is set, check its ffmpeg command works for this channel.",
	codecAudio: "This device can't play {codec} audio. Use a Dispatcharr output profile that converts audio to AAC.",
	codecVideo: "This device can't play {codec} video. Use a Dispatcharr output profile that converts video to H.264.",
	codec: "This device can't play this stream's format.",
	unsupportedDevice: "This browser can't play live MPEG-TS streams (no Media Source Extensions).",
	gaveUp: "The stream kept dropping. Stopped after {attempts} attempts.",
	media: "The player hit an error it could not recover from.",
	config: "{detail}",
	noVideo: "No picture in this stream: its video track is missing or uses a codec the player skips."
};
function _(e, t = {}) {
	return le[e].replace(/\{(\w+)\}/g, (e, n) => String(t[n] ?? `{${n}}`));
}
var ue = [
	[/^avc1|^avc3/i, "H.264"],
	[/^hvc1|^hev1/i, "HEVC (H.265)"],
	[/^av01/i, "AV1"],
	[/^mp4a\.40/i, "AAC"],
	[/^mp4a\.6b|^mp3/i, "MPEG audio (MP2/MP3)"],
	[/^ac-3/i, "AC-3 (Dolby Digital)"],
	[/^ec-3/i, "E-AC-3 (Dolby Digital Plus)"],
	[/^opus/i, "Opus"]
];
function v(e) {
	for (let [t, n] of ue) if (t.test(e)) return n;
	return e;
}
function de() {
	let e = globalThis, t = e.MediaSource ?? e.ManagedMediaSource;
	return t ? (e) => t.isTypeSupported(e) : void 0;
}
function fe(e, t = de()) {
	if (t) {
		if (e.videoCodec && !t(`video/mp4; codecs="${e.videoCodec}"`)) return {
			kind: "codec",
			message: _("codecVideo", { codec: v(e.videoCodec) }),
			detail: `video ${e.videoCodec} not supported`
		};
		if (e.audioCodec && !t(`audio/mp4; codecs="${e.audioCodec}"`)) return {
			kind: "codec",
			message: _("codecAudio", { codec: v(e.audioCodec) }),
			detail: `audio ${e.audioCodec} not supported`
		};
	}
}
function pe(e) {
	switch (e.kind) {
		case "network":
		case "stall":
		case "ended":
		case "media": return !0;
		case "http": return e.status === void 0 || e.status >= 500 || e.status === 408 || e.status === 429;
		default: return !1;
	}
}
function y(e, t = {}) {
	let n = {
		kind: e.kind,
		detail: e.detail,
		status: e.status
	};
	switch (e.kind) {
		case "cors": return {
			...n,
			message: _("cors")
		};
		case "network": return {
			...n,
			message: _("network")
		};
		case "http": return e.status === 404 ? {
			...n,
			message: _("http404")
		} : e.status === 401 || e.status === 403 ? {
			...n,
			message: _("httpDenied", { status: e.status })
		} : {
			...n,
			message: _("http", { status: e.status ?? "?" })
		};
		case "timeout": return {
			...n,
			message: _("timeout", { seconds: Math.round((t.startTimeoutMs ?? 0) / 1e3) })
		};
		case "codec": return e.codec && e.track ? {
			...n,
			message: _(e.track === "audio" ? "codecAudio" : "codecVideo", { codec: v(e.codec) })
		} : {
			...n,
			message: _("codec")
		};
		case "unsupported-device": return {
			...n,
			message: _("unsupportedDevice")
		};
		case "config": return {
			...n,
			message: _("config", { detail: e.detail })
		};
		case "stall":
		case "ended":
		case "media": return t.attempts ? {
			...n,
			message: _("gaveUp", { attempts: t.attempts })
		} : {
			...n,
			message: _("media")
		};
	}
}
async function me(e, t = 5e3) {
	let n = new AbortController(), r = setTimeout(() => n.abort(), t);
	try {
		return await fetch(e, {
			mode: "no-cors",
			signal: n.signal,
			cache: "no-store"
		}), "cors";
	} catch {
		return "unreachable";
	} finally {
		clearTimeout(r), n.abort();
	}
}
//#endregion
//#region src/session.ts
var he = [
	1e3,
	2e3,
	4e3,
	8e3,
	15e3
], b = {
	sessions: 0,
	engines: 0
}, ge = class {
	constructor(e, t, n) {
		this.video = e, this.source = t, this.opts = n, this.status = {
			state: "connecting",
			failures: 0,
			mutedByPolicy: !1,
			needsGesture: !1
		}, this.attemptId = 0, this.disposed = !1, this.gotData = !1, this.lastTime = -1, this.lastProgressAt = 0, this.playingSince = 0, this.createEngine = n.createEngine ?? ce, this.diagnose = n.diagnose ?? me, b.sessions++;
	}
	get stallTimeoutMs() {
		return this.opts.stallTimeoutMs ?? 8e3;
	}
	start() {
		this.attempt();
	}
	update(e) {
		this.status = {
			...this.status,
			...e
		}, this.disposed || this.opts.onStatus(this.status);
	}
	isCurrent(e) {
		return !this.disposed && e === this.attemptId;
	}
	async attempt() {
		let e = ++this.attemptId;
		this.gotData = !1, this.lastTime = -1, this.lastProgressAt = 0, this.playingSince = 0, this.update({
			state: this.status.failures > 0 ? "reconnecting" : "connecting",
			notice: void 0
		});
		let t;
		try {
			t = await this.createEngine(this.source.type, { debug: !!this.opts.debug });
		} catch (t) {
			this.fail(e, {
				kind: "media",
				detail: `could not load player: ${String(t)}`
			}, !1);
			return;
		}
		if (!this.isCurrent(e)) await t.destroy();
		else if (this.engine = t, b.engines++, t.on((t) => this.onEngineEvent(e, t)), this.startTimer = setTimeout(() => {
			this.isCurrent(e) && !this.gotData && this.fail(e, {
				kind: "timeout",
				detail: "no data before start timeout"
			}, !1);
		}, this.opts.startTimeoutMs), await n(this.video), this.isCurrent(e)) {
			try {
				await t.load(this.video, this.source);
			} catch (t) {
				let n = t instanceof i ? t.error : {
					kind: "media",
					detail: String(t)
				};
				this.handleFailure(e, n);
				return;
			}
			this.isCurrent(e) && (this.watchdog = setInterval(() => this.tick(e), 500), await this.play(e));
		}
	}
	async play(e) {
		let t = this.video;
		t.muted = this.opts.muted || this.status.mutedByPolicy;
		try {
			await t.play(), this.isCurrent(e) && this.update({ needsGesture: !1 });
		} catch (n) {
			if (!this.isCurrent(e)) return;
			let r = n?.name;
			if (r === "NotAllowedError" && !t.muted) {
				t.muted = !0, this.update({ mutedByPolicy: !0 });
				try {
					await t.play();
					return;
				} catch {}
			}
			r === "NotAllowedError" && this.update({ needsGesture: !0 });
		}
	}
	async resumeFromGesture(e) {
		let t = this.video;
		e && (t.muted = !1, this.update({ mutedByPolicy: !1 }));
		try {
			await t.play(), this.update({ needsGesture: !1 });
		} catch {}
	}
	onEngineEvent(e, t) {
		if (this.isCurrent(e)) {
			if (t.type === "data") this.gotData = !0;
			else if (t.type === "media-info") {
				let e = { ...t };
				delete e.type, this.update({ mediaInfo: e });
				let n = fe(e);
				if (n) {
					this.terminal(n);
					return;
				}
			} else this.handleFailure(e, t.error);
		}
	}
	tick(e) {
		if (!this.isCurrent(e)) return;
		let t = this.video, n = Date.now(), r = t.currentTime;
		r === this.lastTime ? !t.paused && this.gotData && (this.lastProgressAt || (this.lastProgressAt = n), n - this.lastProgressAt > this.stallTimeoutMs && this.handleFailure(e, {
			kind: "stall",
			detail: `no progress for ${this.stallTimeoutMs} ms`
		})) : (this.lastTime >= 0 && r > this.lastTime && (this.lastProgressAt = n, this.status.state === "playing" ? !this.status.notice && this.source.type === "mpegts" && n - this.playingSince > 3e3 && this.video.videoWidth === 0 ? this.update({ notice: _("noVideo") }) : this.status.failures > 0 && n - this.playingSince > (this.opts.stableMs ?? 3e4) && this.update({ failures: 0 }) : (this.playingSince = n, this.update({ state: "playing" }))), this.lastTime = r, this.lastProgressAt || (this.lastProgressAt = n));
	}
	async handleFailure(e, t) {
		if (this.isCurrent(e)) {
			if (t.kind === "network" && !this.gotData) {
				this.teardownEngine();
				let n = await this.diagnose(this.source.url);
				if (!this.isCurrent(e)) return;
				if (n === "cors") {
					this.terminal(y({
						kind: "cors",
						detail: t.detail
					}));
					return;
				}
			}
			if (t.kind === "media" && this.status.mediaInfo) {
				let e = fe(this.status.mediaInfo);
				if (e) {
					this.terminal(e);
					return;
				}
			}
			this.fail(e, t, pe(t));
		}
	}
	fail(e, t, n) {
		if (!this.isCurrent(e)) return;
		let r = this.status.failures + 1;
		if (this.teardownEngine(), !n) {
			this.terminal(y(t, { startTimeoutMs: this.opts.startTimeoutMs }));
			return;
		}
		if (r > this.opts.maxAttempts) {
			this.terminal(y(t, { attempts: r }));
			return;
		}
		let i = this.opts.backoffMs ?? he, a = i[Math.min(r - 1, i.length - 1)];
		this.update({
			state: "reconnecting",
			failures: r,
			lastError: `${t.kind}: ${t.detail}`
		}), this.retryTimer = setTimeout(() => {
			this.isCurrent(e) && this.attempt();
		}, a);
	}
	terminal(e) {
		this.teardownEngine(), this.attemptId++, this.update({
			state: "error",
			error: e,
			lastError: `${e.kind}: ${e.detail}`
		});
	}
	clearTimers() {
		clearTimeout(this.startTimer), clearTimeout(this.retryTimer), clearInterval(this.watchdog), this.startTimer = this.retryTimer = this.watchdog = void 0;
	}
	teardownEngine() {
		this.clearTimers();
		let e = this.engine;
		this.engine = void 0, e && (b.engines--, e.destroy());
	}
	async destroy() {
		this.disposed || (this.teardownEngine(), this.disposed = !0, this.attemptId++, this.status = {
			...this.status,
			state: "stopped"
		}, b.sessions--);
	}
	getStats() {
		return this.engine?.getStats(this.video);
	}
}, x = globalThis, S = x.ShadowRoot && (x.ShadyCSS === void 0 || x.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, C = Symbol(), _e = /* @__PURE__ */ new WeakMap(), ve = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== C) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (S && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = _e.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && _e.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, ye = (e) => new ve(typeof e == "string" ? e : e + "", void 0, C), be = (e, ...t) => new ve(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, C), xe = (e, t) => {
	if (S) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = x.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, Se = S ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return ye(t);
})(e) : e, Ce, { is: we, defineProperty: Te, getOwnPropertyDescriptor: Ee, getOwnPropertyNames: De, getOwnPropertySymbols: Oe, getPrototypeOf: ke } = Object, w = globalThis, T = w.trustedTypes, Ae = T ? T.emptyScript : "", je = w.reactiveElementPolyfillSupport, E = (e, t) => e, D = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? Ae : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, Me = (e, t) => !we(e, t), Ne = {
	attribute: !0,
	type: String,
	converter: D,
	reflect: !1,
	useDefault: !1,
	hasChanged: Me
};
(Ce = Symbol).metadata ?? (Ce.metadata = Symbol("metadata")), w.litPropertyMetadata ?? (w.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var O = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ?? (this.l = [])).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = Ne) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && Te(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = Ee(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? Ne;
	}
	static _$Ei() {
		if (this.hasOwnProperty(E("elementProperties"))) return;
		let e = ke(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(E("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(E("properties"))) {
			let e = this.properties, t = [...De(e), ...Oe(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(Se(e));
		} else e !== void 0 && t.push(Se(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return xe(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? D : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? D : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ?? (n = a.getPropertyOptions(e)), !((n.hasChanged ?? Me)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
O.elementStyles = [], O.shadowRootOptions = { mode: "open" }, O[E("elementProperties")] = /* @__PURE__ */ new Map(), O[E("finalized")] = /* @__PURE__ */ new Map(), je?.({ ReactiveElement: O }), (w.reactiveElementVersions ?? (w.reactiveElementVersions = [])).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var k = globalThis, A = (e) => e, j = k.trustedTypes, Pe = j ? j.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, Fe = "$lit$", M = `lit$${Math.random().toFixed(9).slice(2)}$`, Ie = "?" + M, Le = `<${Ie}>`, N = document, P = () => N.createComment(""), F = (e) => e === null || typeof e != "object" && typeof e != "function", I = Array.isArray, Re = (e) => I(e) || typeof e?.[Symbol.iterator] == "function", L = "[ 	\n\f\r]", R = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ze = /-->/g, Be = />/g, z = RegExp(`>|${L}(?:([^\\s"'>=/]+)(${L}*=${L}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Ve = /'/g, He = /"/g, Ue = /^(?:script|style|textarea|title)$/i, We = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), B = We(1), Ge = We(2), V = Symbol.for("lit-noChange"), H = Symbol.for("lit-nothing"), Ke = /* @__PURE__ */ new WeakMap(), U = N.createTreeWalker(N, 129);
function qe(e, t) {
	if (!I(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return Pe === void 0 ? t : Pe.createHTML(t);
}
var Je = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = R;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === R ? c[1] === "!--" ? o = ze : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = z) : (Ue.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = z) : o = Be : o === z ? c[0] === ">" ? (o = i ?? R, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? z : c[3] === "\"" ? He : Ve) : o === He || o === Ve ? o = z : o === ze || o === Be ? o = R : (o = z, i = void 0);
		let d = o === z && e[t + 1].startsWith("/>") ? " " : "";
		a += o === R ? n + Le : l >= 0 ? (r.push(s), n.slice(0, l) + Fe + n.slice(l) + M + d) : n + M + (l === -2 ? t : d);
	}
	return [qe(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, W = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Je(t, n);
		if (this.el = e.createElement(l, r), U.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = U.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(Fe)) {
					let t = u[o++], n = i.getAttribute(e).split(M), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Xe : r[1] === "?" ? Ze : r[1] === "@" ? Qe : q
					}), i.removeAttribute(e);
				} else e.startsWith(M) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Ue.test(i.tagName)) {
					let e = i.textContent.split(M), t = e.length - 1;
					if (t > 0) {
						i.textContent = j ? j.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], P()), U.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], P());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === Ie) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(M, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += M.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = N.createElement("template");
		return n.innerHTML = e, n;
	}
};
function G(e, t, n = e, r) {
	if (t === V) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = F(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ?? (n._$Co = []))[r] = i), i !== void 0 && (t = G(e, i._$AS(e, t.values), i, r)), t;
}
var Ye = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? N).importNode(t, !0);
		U.currentNode = r;
		let i = U.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new K(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new $e(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = U.nextNode(), a++);
		}
		return U.currentNode = N, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, K = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = H, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = G(this, e, t), F(e) ? e === H || e == null || e === "" ? (this._$AH !== H && this._$AR(), this._$AH = H) : e !== this._$AH && e !== V && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? Re(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== H && F(this._$AH) ? this._$AA.nextSibling.data = e : this.T(N.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = W.createElement(qe(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ye(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Ke.get(e.strings);
		return t === void 0 && Ke.set(e.strings, t = new W(e)), t;
	}
	k(t) {
		I(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(P()), this.O(P()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = A(e).nextSibling;
			A(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, q = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = H, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = H;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = G(this, e, t, 0), a = !F(e) || e !== this._$AH && e !== V, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = G(this, r[n + o], t, o), s === V && (s = this._$AH[o]), a || (a = !F(s) || s !== this._$AH[o]), s === H ? e = H : e !== H && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === H ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Xe = class extends q {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === H ? void 0 : e;
	}
}, Ze = class extends q {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== H);
	}
}, Qe = class extends q {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = G(this, e, t, 0) ?? H) === V) return;
		let n = this._$AH, r = e === H && n !== H || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== H && (n === H || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, $e = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		G(this, e);
	}
}, et = k.litHtmlPolyfillSupport;
et?.(W, K), (k.litHtmlVersions ?? (k.litHtmlVersions = [])).push("3.3.3");
var tt = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new K(t.insertBefore(P(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, J = globalThis, Y = class extends O {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		var e;
		let t = super.createRenderRoot();
		return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = tt(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return V;
	}
};
Y._$litElement$ = !0, Y.finalized = !0, J.litElementHydrateSupport?.({ LitElement: Y });
var nt = J.litElementPolyfillSupport;
nt?.({ LitElement: Y }), (J.litElementVersions ?? (J.litElementVersions = [])).push("4.2.2");
//#endregion
//#region src/icons.ts
var rt = {
	play: "M8,5.14V19.14L19,12.14L8,5.14Z",
	stop: "M18,18H6V6H18V18Z",
	volumeHigh: "M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z",
	volumeOff: "M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z",
	fullscreen: "M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z",
	fullscreenExit: "M14,14H19V16H16V19H14V14M5,14H10V19H8V16H5V14M8,5H10V10H5V8H8V5M19,8V10H14V5H16V8H19Z",
	alert: "M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z",
	refresh: "M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z",
	tv: "M21,17H3V5H21M21,3H3A2,2 0 0,0 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5A2,2 0 0,0 21,3Z"
}, X = (e) => Ge`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d=${rt[e]}></path></svg>`;
//#endregion
//#region src/lifecycle.ts
function it(e) {
	return e.connected ? e.preview ? "preview" : e.hasSource ? e.wantPlaying ? e.pageVisible ? e.screenAwake ? e.intersecting ? null : "hidden" : "screen-off" : "page-hidden" : "stopped" : "no-source" : "disconnected";
}
var at = [
	"pointerdown",
	"keydown",
	"wheel",
	"touchstart"
], ot = class {
	constructor(e, t, n, r) {
		this.host = e, this.power = t, this.onChange = n, this.onIdle = r, this.pageVisible = !0, this.screenAwake = !0, this.idleMs = 0, this.idleArmed = !1, this.attached = !1, this.onVisibility = () => {
			let e = document.visibilityState !== "hidden";
			e !== this.pageVisible && (this.pageVisible = e, this.onChange());
		}, this.onPageHide = () => {
			this.pageVisible = !1, this.onChange();
		}, this.onPower = () => {
			let e = this.power.screenOn && !this.power.screensaver;
			e !== this.screenAwake && (this.screenAwake = e, this.onChange());
		}, this.onActivity = () => {
			this.idleArmed && this.restartIdle();
		}, this.intersecting = typeof IntersectionObserver > "u";
	}
	attach() {
		if (!this.attached) {
			this.attached = !0, this.pageVisible = document.visibilityState !== "hidden", this.screenAwake = this.power.screenOn && !this.power.screensaver, typeof IntersectionObserver < "u" && (this.intersecting = !1, this.io = new IntersectionObserver((e) => {
				let t = e[e.length - 1];
				if (!t) return;
				let n = t.isIntersecting && t.intersectionRatio > 0;
				n !== this.intersecting && (this.intersecting = n, this.onChange());
			}, { threshold: [0, .01] }), this.io.observe(this.host)), document.addEventListener("visibilitychange", this.onVisibility), window.addEventListener("pagehide", this.onPageHide), window.addEventListener("pageshow", this.onVisibility), window.addEventListener(l, this.onPower);
			for (let e of at) document.addEventListener(e, this.onActivity, {
				capture: !0,
				passive: !0
			});
		}
	}
	detach() {
		if (this.attached) {
			this.attached = !1, this.io?.disconnect(), this.io = void 0, document.removeEventListener("visibilitychange", this.onVisibility), window.removeEventListener("pagehide", this.onPageHide), window.removeEventListener("pageshow", this.onVisibility), window.removeEventListener(l, this.onPower);
			for (let e of at) document.removeEventListener(e, this.onActivity, { capture: !0 });
			this.disarmIdle();
		}
	}
	armIdle(e) {
		this.idleMs = e, this.idleArmed = e > 0, this.restartIdle();
	}
	disarmIdle() {
		this.idleArmed = !1, clearTimeout(this.idleTimer), this.idleTimer = void 0;
	}
	restartIdle() {
		clearTimeout(this.idleTimer), this.idleTimer = void 0, this.idleArmed && (this.idleTimer = setTimeout(() => {
			this.idleArmed = !1, this.onIdle();
		}, this.idleMs));
	}
}, st = be`
  :host {
    display: block;
  }
  ha-card {
    display: block;
    overflow: hidden;
    height: 100%;
  }
  .frame {
    position: relative;
    width: 100%;
    background: #000;
    color: #fff;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, sans-serif));
  }
  .frame:fullscreen {
    aspect-ratio: auto !important;
    width: 100%;
    height: 100%;
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
    gap: 12px;
    padding: 16px;
    box-sizing: border-box;
    text-align: center;
    pointer-events: none;
  }
  .layer > * {
    pointer-events: auto;
  }
  .layer.dim {
    background: rgba(0, 0, 0, 0.55);
  }
  .message {
    max-width: 36em;
    font-size: 14px;
    line-height: 1.4;
    color: #f2f2f2;
  }
  .message.detail {
    font-size: 12px;
    opacity: 0.75;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    word-break: break-word;
  }
  .error-icon svg {
    width: 40px;
    height: 40px;
    fill: var(--error-color, #ef5350);
  }
  .placeholder-icon svg {
    width: 48px;
    height: 48px;
    fill: rgba(255, 255, 255, 0.6);
  }
  button {
    font: inherit;
    color: inherit;
    border: none;
    cursor: pointer;
    background: none;
    padding: 0;
  }
  button:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 2px;
  }
  .big-play {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    border: 2px solid rgba(255, 255, 255, 0.85);
    display: grid;
    place-items: center;
  }
  .big-play svg {
    width: 40px;
    height: 40px;
    fill: #fff;
    margin-left: 4px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 14px;
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.35);
    font-size: 14px;
  }
  .pill svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
  .pill.primary {
    background: rgba(0, 0, 0, 0.75);
    border-color: rgba(255, 255, 255, 0.85);
    font-weight: 500;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 4px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .badge {
    position: absolute;
    top: 10px;
    left: 10px;
    max-width: calc(100% - 20px);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.6);
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 0.3s;
  }
  .live-dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e53935;
  }
  .unmute {
    position: absolute;
    left: 10px;
    bottom: 10px;
  }
  .notice {
    position: absolute;
    left: 10px;
    right: 10px;
    top: 44px;
    font-size: 13px;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.65);
    pointer-events: none;
  }
  .controls {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: flex;
    gap: 6px;
    transition: opacity 0.3s;
  }
  .controls button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    display: grid;
    place-items: center;
  }
  .controls svg {
    width: 24px;
    height: 24px;
    fill: #fff;
  }
  .hidden {
    opacity: 0;
    pointer-events: none;
  }
  .debug {
    position: absolute;
    top: 8px;
    right: 8px;
    max-width: 60%;
    max-height: 45%;
    overflow: hidden;
    padding: 6px 8px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.7);
    color: #b9f6ca;
    font:
      11px/1.35 ui-monospace,
      Menlo,
      Consolas,
      monospace;
    white-space: pre-wrap;
    word-break: break-all;
    pointer-events: none;
    text-align: left;
  }
`, Z, ct = 4e3, lt = /* @__PURE__ */ new Set([
	"HUI-CARD-PREVIEW",
	"HUI-CARD-PICKER",
	"HUI-DIALOG-EDIT-CARD",
	"HUI-CARD-ELEMENT-EDITOR"
]);
function ut(e) {
	let t = e;
	for (let e = 0; t && e < 60; e++) {
		if (t instanceof Element && lt.has(t.tagName)) return !0;
		t = t.parentNode ?? (t instanceof ShadowRoot ? t.host : null);
	}
	return !1;
}
var dt = class extends Y {
	constructor() {
		super(), this.wantPlaying = !1, this.hold = "disconnected", this.idleStopped = !1, this.controlsVisible = !0, this.inEditor = !1, this.fullscreen = !1, this.play = (e) => {
			e?.stopPropagation(), this.session && this.status?.needsGesture ? this.session.resumeFromGesture(this.status.mutedByPolicy) : (this.error = void 0, this.idleStopped = !1, this.request && !this.source && this.applyRequest(this.request, !0), this.wantPlaying = !0, this.evaluate());
		}, this.stop = (e) => {
			e?.stopPropagation(), this.wantPlaying = !1, this.evaluate();
		}, this.toggleMute = (e) => {
			e?.stopPropagation();
			let t = !this.effectiveMuted;
			this.video.muted = t, this.userMuted = t, !t && this.session?.status.mutedByPolicy && this.session.resumeFromGesture(!0), this.showControls(), this.refresh();
		}, this.unmute = (e) => {
			e?.stopPropagation(), this.userMuted = !1, this.session ? this.session.resumeFromGesture(!0) : this.video.muted = !1, this.refresh();
		}, this.onFrameClick = () => {
			this.status?.mutedByPolicy ? this.unmute() : this.controlsVisible && this.status?.state === "playing" ? (this.controlsVisible = !1, clearTimeout(this.controlsTimer), this.refresh()) : this.showControls();
		}, this.toggleFullscreen = async (e) => {
			e?.stopPropagation();
			let t = document, n = this.renderRoot.querySelector(".frame");
			try {
				if (this.fullscreen) {
					t.exitFullscreen ? await t.exitFullscreen() : t.webkitExitFullscreen?.();
					return;
				}
				n?.requestFullscreen ? await n.requestFullscreen() : n?.webkitRequestFullscreen ? n.webkitRequestFullscreen() : this.video.webkitEnterFullscreen?.();
			} catch (e) {
				console.warn("[stream-card] fullscreen failed", e);
			}
		}, this.onFullscreenChange = () => {
			let e = this.renderRoot, t = document;
			this.fullscreen = !!e.fullscreenElement || (t.webkitFullscreenElement ?? null) === this, this.refresh();
		}, this.preview = !1, this.editMode = !1, this._ui = 0, this.controller = oe(), this.video = document.createElement("video"), this.video.playsInline = !0, this.video.setAttribute("playsinline", ""), this.video.setAttribute("webkit-playsinline", ""), this.video.preload = "none", this.video.controls = !1, this.video.muted = !0, this.video.disableRemotePlayback = !0, this.watcher = new ot(this, this.controller.power, () => this.evaluate(), () => this.onIdle());
	}
	setConfig(e) {
		let t = this.config?.target;
		this.config = g(e), t && t !== this.config.target && this.isConnected && (this.controller.unregister(this), this.controller.register(this)), this.request ? this.applyRequest(this.request, this.wantPlaying) : this.isConnected && this.pickInitialRequest(), this.refresh();
	}
	set hass(e) {}
	getCardSize() {
		return 4;
	}
	getGridOptions() {
		return {
			columns: 12,
			rows: "auto",
			min_columns: 3
		};
	}
	static getStubConfig() {
		return {
			dispatcharr_url: "https://dispatcharr.example",
			output_profile: 1,
			target: "tv"
		};
	}
	get target() {
		return this.config?.target ?? "default";
	}
	get isLive() {
		return this.isConnected && !this.isPreview;
	}
	deliver(e) {
		this.applyRequest(e, !0);
	}
	stopFromController() {
		this.wantPlaying = !1, this.evaluate();
	}
	get isPreview() {
		return this.preview || this.editMode || this.inEditor;
	}
	connectedCallback() {
		super.connectedCallback(), this.inEditor = ut(this), this.controller.register(this), this.watcher.attach(), document.addEventListener("fullscreenchange", this.onFullscreenChange), document.addEventListener("webkitfullscreenchange", this.onFullscreenChange), this.pickInitialRequest(), this.config?.debug && (this.debugTimer = setInterval(() => this.refresh(), 1e3)), this.evaluate();
	}
	disconnectedCallback() {
		this.watcher.detach(), this.controller.unregister(this), document.removeEventListener("fullscreenchange", this.onFullscreenChange), document.removeEventListener("webkitfullscreenchange", this.onFullscreenChange), clearInterval(this.debugTimer), clearTimeout(this.controlsTimer), super.disconnectedCallback(), this.evaluate();
	}
	firstUpdated() {
		this.renderRoot.querySelector(".video-host")?.appendChild(this.video);
	}
	updated(e) {
		(e.has("preview") || e.has("editMode")) && this.evaluate();
	}
	pickInitialRequest() {
		if (!this.config) return;
		let e = this.controller.take(this.target);
		if (e) {
			this.applyRequest(e, !0);
			return;
		}
		if (this.request) return;
		let t = this.controller.lastFor(this.target) ?? this.config.defaultRequest;
		t && this.applyRequest(t, this.config.autoplay);
	}
	refresh() {
		this._ui++;
	}
	applyRequest(e, t) {
		if (!this.config) return;
		this.request = e, this.idleStopped = !1;
		let n;
		try {
			n = re(e, this.config);
		} catch (e) {
			this.stopSession("config"), this.source = void 0, this.error = {
				kind: "config",
				message: e instanceof u ? e.message : String(e),
				detail: String(e)
			}, this.wantPlaying = !1, this.refresh();
			return;
		}
		this.session && this.session.source.url !== n.url && this.stopSession("switch"), this.source = {
			...n,
			title: e.title ?? n.title
		}, this.error = void 0, t && (this.wantPlaying = !0), this.evaluate();
	}
	evaluate() {
		let e = it({
			connected: this.isConnected,
			preview: this.isPreview,
			hasSource: !!this.source,
			wantPlaying: this.wantPlaying,
			intersecting: this.watcher.intersecting,
			pageVisible: this.watcher.pageVisible,
			screenAwake: this.watcher.screenAwake
		});
		this.hold = e, e === null ? this.session || this.startSession() : this.session && this.stopSession(e), this.refresh();
	}
	startSession() {
		if (!this.source || !this.config) return;
		this.error = void 0;
		let e = new ge(this.video, this.source, {
			startTimeoutMs: this.config.startTimeoutMs,
			maxAttempts: this.config.maxReconnectAttempts,
			muted: this.userMuted ?? this.config.muted,
			debug: this.config.debug,
			onStatus: (t) => this.onStatus(e, t)
		});
		this.session = e, this.status = e.status, this.showControls(), e.start(), this.config.idleTimeoutMs > 0 && this.watcher.armIdle(this.config.idleTimeoutMs);
	}
	stopSession(e) {
		let t = this.session;
		t && (this.session = void 0, this.status = void 0, this.lastRelease = e, this.watcher.disarmIdle(), t.destroy());
	}
	onStatus(e, t) {
		e === this.session && (this.status = t, t.state === "error" ? (this.error = t.error, this.wantPlaying = !1, this.stopSession("error"), this.evaluate()) : (t.state === "playing" && this.scheduleHideControls(), this.refresh()));
	}
	onIdle() {
		this.wantPlaying = !1, this.idleStopped = !0, this.evaluate(), this.lastRelease = "idle";
	}
	get effectiveMuted() {
		return this.session ? this.video.muted : this.userMuted ?? this.config?.muted ?? !1;
	}
	showControls() {
		this.controlsVisible = !0, this.scheduleHideControls(), this.refresh();
	}
	scheduleHideControls() {
		clearTimeout(this.controlsTimer), this.controlsTimer = setTimeout(() => {
			this.status?.state === "playing" && (this.controlsVisible = !1, this.refresh());
		}, ct);
	}
	get uiState() {
		return this.isPreview ? "preview" : this.error ? "error" : this.session && this.status ? this.status.state === "error" || this.status.state === "stopped" ? "ready" : this.status.state : this.source ? "ready" : "empty";
	}
	get debugInfo() {
		let e = this.session?.getStats();
		return {
			version: s,
			ui: this.uiState,
			hold: this.hold,
			lastRelease: this.lastRelease,
			target: this.target,
			url: this.source?.url,
			title: this.source?.title,
			wantPlaying: this.wantPlaying,
			state: this.status?.state,
			failures: this.status?.failures ?? 0,
			mutedByPolicy: this.status?.mutedByPolicy ?? !1,
			needsGesture: this.status?.needsGesture ?? !1,
			muted: this.effectiveMuted,
			mediaInfo: this.status?.mediaInfo,
			notice: this.status?.notice,
			error: this.error,
			lastError: this.status?.lastError,
			stats: e
		};
	}
	render() {
		let e = this.config?.aspectRatio ?? "16 / 9", t = this.uiState, n = t === "playing" && !this.controlsVisible;
		return B`
      <ha-card>
        <div class="frame" data-state=${t} style="aspect-ratio: ${e}" @click=${this.onFrameClick}>
          <div class="video-host"></div>
          ${this.renderBadge(t, n)} ${this.renderCenter(t)}
          ${this.status?.mutedByPolicy && !this.status.needsGesture ? B`<button class="pill unmute" @click=${this.unmute} aria-label="Unmute">
                  ${X("volumeOff")} Tap to unmute
                </button>` : H}
          ${this.status?.notice && t === "playing" ? B`<div class="notice" role="status">${this.status.notice}</div>` : H}
          ${this.renderControls(t, n)}
          ${this.config?.debug && t !== "preview" && t !== "empty" ? B`<div class="debug">${this.debugText()}</div>` : H}
        </div>
      </ha-card>
    `;
	}
	renderBadge(e, t) {
		let n = this.source?.title;
		return !n && e !== "playing" ? H : B`<div class="badge ${t ? "hidden" : ""}">
      ${e === "playing" ? B`<span class="live-dot" role="img" aria-label="Live"></span>` : H}
      <span class="title">${n ?? "Live"}</span>
    </div>`;
	}
	renderCenter(e) {
		switch (e) {
			case "preview": return B`<div class="layer dim">
          <span class="placeholder-icon">${X("tv")}</span>
          <div class="message">Stream card · playback is off while editing</div>
          ${this.config ? B`<div class="message detail">target: ${this.target}</div>` : H}
        </div>`;
			case "empty": return B`<div class="layer">
          <span class="placeholder-icon">${X("tv")}</span>
          <div class="message">Choose a channel</div>
        </div>`;
			case "error": return B`<div class="layer dim" role="alert">
          <span class="error-icon">${X("alert")}</span>
          <div class="message">${this.error?.message}</div>
          ${this.config?.debug && this.error?.detail ? B`<div class="message detail">${this.error.detail}</div>` : H}
          ${this.source || this.request ? B`<button class="pill primary retry" @click=${this.play}>
                  ${X("refresh")} Retry
                </button>` : H}
        </div>`;
			case "connecting":
			case "reconnecting": {
				if (this.status?.needsGesture) return this.renderPlayButton("Tap to play");
				let t = this.status, n = e === "reconnecting" && t ? `Reconnecting… (attempt ${t.failures} of ${this.config?.maxReconnectAttempts ?? "?"})` : "Connecting…";
				return B`<div class="layer">
          <div class="spinner" role="progressbar" aria-label=${n}></div>
          <div class="message">${n}</div>
        </div>`;
			}
			case "playing": return this.status?.needsGesture ? this.renderPlayButton("Tap to play") : H;
			case "ready": {
				let e = Math.round((this.config?.idleTimeoutMs ?? 0) / 6e4), t = this.idleStopped ? `Stopped after ${e} minute${e === 1 ? "" : "s"} without interaction` : void 0;
				return this.renderPlayButton(t);
			}
		}
	}
	renderPlayButton(e) {
		return B`<div class="layer ${e ? "dim" : ""}">
      <button class="big-play" @click=${this.play} aria-label="Play">${X("play")}</button>
      ${e ? B`<div class="message">${e}</div>` : H}
    </div>`;
	}
	renderControls(e, t) {
		return e === "preview" || e === "empty" ? H : B`<div class="controls ${t ? "hidden" : ""}">
      ${e === "playing" || e === "connecting" || e === "reconnecting" ? B`<button class="ctl-stop" @click=${this.stop} aria-label="Stop">
              ${X("stop")}
            </button>` : H}
      <button
        class="ctl-mute"
        @click=${this.toggleMute}
        aria-label=${this.effectiveMuted ? "Unmute" : "Mute"}
      >
        ${X(this.effectiveMuted ? "volumeOff" : "volumeHigh")}
      </button>
      <button
        class="ctl-fullscreen"
        @click=${this.toggleFullscreen}
        aria-label=${this.fullscreen ? "Exit full screen" : "Full screen"}
      >
        ${X(this.fullscreen ? "fullscreenExit" : "fullscreen")}
      </button>
    </div>`;
	}
	debugText() {
		let e = this.debugInfo, t = e.mediaInfo, n = e.stats;
		return [
			`stream-card ${e.version}`,
			`ui ${e.ui} · state ${e.state ?? "-"} · hold ${e.hold ?? "none"}`,
			`last release ${e.lastRelease ?? "-"} · failures ${e.failures}`,
			t ? `video ${t.videoCodec ?? "-"} ${t.width ?? "?"}x${t.height ?? "?"} · audio ${t.audioCodec ?? "-"}` : "media -",
			n ? `${n.engine} · buffer ${n.bufferSeconds.toFixed(1)} s · ${n.speedKBps?.toFixed(0) ?? "-"} KB/s` : "engine -",
			n ? `frames ${n.decodedFrames ?? "-"} · dropped ${n.droppedFrames ?? "-"}` : "",
			e.lastError ? `last error ${e.lastError}` : "",
			`muted ${e.muted}${e.mutedByPolicy ? " (autoplay policy)" : ""}`
		].filter(Boolean).join("\n");
	}
};
Z = dt, Z.styles = st, Z.properties = {
	preview: { type: Boolean },
	editMode: { type: Boolean },
	_ui: { state: !0 }
};
//#endregion
//#region src/index.ts
var Q = oe();
Q.counters ?? (Q.counters = b), customElements.get("stream-card") || customElements.define(a, dt);
var $ = window;
$.customCards = $.customCards ?? [], $.customCards.some((e) => e.type === "stream-card") || $.customCards.push({
	type: a,
	name: o,
	description: "Plays Dispatcharr IPTV channels and releases the stream when it is hidden.",
	preview: !1,
	documentationURL: "https://github.com/Dec64/ha-video-card"
}), console.info(`%c STREAM-CARD %c ${s} `, "color:#fff;background:#1565c0;font-weight:700", "color:#1565c0;background:#fff");
//#endregion

//# sourceMappingURL=stream-card.js.map