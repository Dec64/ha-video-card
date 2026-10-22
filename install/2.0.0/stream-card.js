import { a as e, i as t, n, o as r, r as i } from "./stream-card-video-lock-8Ql6vIdM.js";
import { _ as a, a as o, c as s, d as c, f as l, g as u, h as d, i as f, l as p, m, n as h, o as g, p as ee, r as te, s as ne, t as _, u as re, v as ie } from "./stream-card-view-dN8VJ8Qm.js";
//#region src/const.ts
var v = "stream-card", ae = "Stream Card", y = "2.0.0", b = "__streamCard", x = "stream-card-power", S = class extends Error {
	constructor(...e) {
		super(...e), this.name = "ConfigError";
	}
}, oe = 6e4;
function C(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function w(e, t) {
	let n = e[t];
	if (n != null && n !== "") {
		if (typeof n != "string" && typeof n != "number") throw new S(`"${t}" must be text`);
		return String(n).trim();
	}
}
function T(e, t, n) {
	let r = e[t];
	if (r == null) return n;
	if (typeof r != "boolean") throw new S(`"${t}" must be true or false`);
	return r;
}
function E(e, t, n, r) {
	let i = e[t];
	if (i == null || i === "") return n;
	let a = typeof i == "string" ? Number(i) : i;
	if (typeof a != "number" || !Number.isFinite(a) || a < r) throw new S(`"${t}" must be a number of at least ${r}`);
	return a;
}
function D(e, t) {
	let n = e[t];
	return n == null || n === "" ? [] : (Array.isArray(n) ? n : [n]).map((e) => {
		if (typeof e != "string" && typeof e != "number") throw new S(`"${t}" must be a list of text`);
		return String(e).trim();
	}).filter(Boolean);
}
var se = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function O(e) {
	return se.test(e.trim());
}
function ce(e) {
	let t = e.trim();
	return !O(t) && (/\s/.test(t) || /^\d+$/.test(t));
}
function k(e) {
	let t;
	try {
		t = new URL(e);
	} catch {
		throw new S("\"dispatcharr_url\" must be a full URL, e.g. https://dispatcharr.example");
	}
	if (t.protocol !== "http:" && t.protocol !== "https:") throw new S("\"dispatcharr_url\" must start with http:// or https://");
	return e.replace(/\/+$/, "");
}
function le(e) {
	if (!e) return "16 / 9";
	let t = /^\s*(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)\s*$/.exec(e);
	if (t && Number(t[1]) > 0 && Number(t[2]) > 0) return `${t[1]} / ${t[2]}`;
	let n = Number(e);
	if (Number.isFinite(n) && n > 0) return String(n);
	throw new S("\"aspect_ratio\" must look like \"16:9\"");
}
function ue(e) {
	if (e === void 0 || e === "low" || e === "stable") return e ?? "low";
	throw new S("\"buffer\" must be \"low\" or \"stable\"");
}
function de(e, t, n) {
	let r = w(e, t);
	if (r !== void 0 && !/^\d+$/.test(r)) throw new S(`"${n}" must be the numeric ID of a Dispatcharr output profile`);
	return r;
}
function fe(e, t) {
	if (e == null || typeof e == "boolean") return {
		enabled: e === !0,
		maxTiles: 2,
		outputProfile: t
	};
	if (!C(e)) throw new S("\"multiview\" must be true, false or an object, e.g. { enabled: true }");
	let n = E(e, "max_tiles", 2, 2);
	if (!Number.isInteger(n) || n > 4) throw new S("\"max_tiles\" must be a whole number from 2 to 4");
	return {
		enabled: T(e, "enabled", !1),
		maxTiles: n,
		outputProfile: de(e, "output_profile", "multiview.output_profile") ?? t
	};
}
function pe(e) {
	if (!C(e)) throw new S("Card config must be an object");
	let t = e, n = w(t, "dispatcharr_url"), r = de(t, "output_profile", "output_profile"), i = w(t, "url_template") ?? "{base}/proxy/ts/stream/{channel}";
	if (!i.includes("{channel}")) throw new S("\"url_template\" must contain {channel}");
	let a = t.reconnect;
	if (a !== void 0 && !C(a)) throw new S("\"reconnect\" must be an object, e.g. { max_attempts: 5 }");
	let o = w(t, "m3u_url");
	if (o) try {
		new URL(o);
	} catch {
		throw new S("\"m3u_url\" must be a full URL");
	}
	let s = w(t, "epg_url");
	if (s) try {
		new URL(s);
	} catch {
		throw new S("\"epg_url\" must be a full URL");
	}
	let c = w(t, "guide") ?? "open";
	if (c !== "open" && c !== "closed" && c !== "off") throw new S("\"guide\" must be open, closed or off");
	let l = w(t, "channel"), u = w(t, "url"), d = w(t, "title"), f = l || u ? {
		channel: l,
		url: u,
		title: d
	} : void 0, p = {
		target: w(t, "target") ?? "default",
		dispatcharrUrl: n ? k(n) : void 0,
		outputProfile: r,
		urlTemplate: i,
		defaultRequest: f,
		autoplay: T(t, "autoplay", !0),
		muted: T(t, "muted", !1),
		aspectRatio: le(w(t, "aspect_ratio")),
		idleTimeoutMs: E(t, "idle_timeout", 0, 0) * oe,
		startTimeoutMs: E(t, "start_timeout", 20, 1) * 1e3,
		maxReconnectAttempts: a ? E(a, "max_attempts", 5, 0) : 5,
		debug: T(t, "debug", !1),
		channelList: T(t, "channel_list", !!(n || o)),
		m3uUrl: o ?? (n ? `${k(n)}/output/m3u` : void 0),
		channelGroups: D(t, "channel_groups"),
		favourites: D(t, "favourites"),
		rememberChannel: T(t, "remember_channel", !0),
		buffer: ue(w(t, "buffer")),
		epg: !1,
		epgUrl: s ?? (n ? `${k(n)}/output/epg?days=1` : void 0),
		guide: c,
		multiview: fe(t.multiview, r)
	};
	if (p.epg = T(t, "epg", p.channelList && !!p.epgUrl), p.epg && !p.channelList) throw new S("\"epg\" needs the channel list (\"channel_list\" can't be false)");
	if (p.epg && !p.epgUrl) throw new S("\"epg\" needs \"dispatcharr_url\" or \"epg_url\"");
	if (p.channelList && !p.m3uUrl) throw new S("\"channel_list\" needs \"dispatcharr_url\" or \"m3u_url\"");
	let m = f?.channel;
	return f && m && (!p.channelList || O(m)) && A(f, p), p;
}
function me(e) {
	let t = e.split(/[?#]/)[0].toLowerCase();
	return t.endsWith(".m3u8") || t.endsWith(".mp4") || t.endsWith(".webm") ? "native" : "mpegts";
}
function A(e, t) {
	if (e.url) {
		let t;
		try {
			t = new URL(e.url, document.baseURI);
		} catch {
			throw new S(`"${e.url}" is not a valid URL`);
		}
		return {
			url: t.href,
			type: e.type ?? me(t.href),
			title: e.title
		};
	}
	if (!e.channel) throw new S("Nothing to play: set \"channel\" or \"url\"");
	let n = String(e.channel).trim();
	if (!n || /[/?#\s]/.test(n)) throw new S(`"${n}" is not a valid channel ID`);
	if (t.urlTemplate.includes("{base}") && !t.dispatcharrUrl) throw new S("Set \"dispatcharr_url\" on the card to play channels");
	let r = t.urlTemplate.replaceAll("{base}", t.dispatcharrUrl ?? "").replaceAll("{channel}", encodeURIComponent(n)), i;
	try {
		i = new URL(r);
	} catch {
		throw new S(`"url_template" produced an invalid URL: ${r}`);
	}
	return t.outputProfile && !i.searchParams.has("output_profile") && i.searchParams.set("output_profile", t.outputProfile), {
		url: i.href,
		type: e.type ?? "mpegts",
		title: e.title,
		channel: n
	};
}
var he = /* @__PURE__ */ new Set([
	"play",
	"stop",
	"channel_up",
	"channel_down",
	"last_channel",
	"sleep",
	"volume",
	"mute",
	"unmute"
]);
function j(e) {
	let t = typeof e == "string" && e.trim() ? Number(e) : e;
	return typeof t == "number" && Number.isFinite(t) ? t : void 0;
}
function ge(e) {
	if (!C(e)) return;
	let t = (t) => {
		let n = e[t];
		if (typeof n == "string" && n.trim()) return n.trim();
		if (typeof n == "number") return String(n);
	}, n = t("action");
	if (n !== void 0 && !he.has(n)) return;
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
	if (i.action !== "play" || i.channel || i.url) {
		if (i.action === "sleep") {
			let t = j(e.sleep);
			if (t === void 0 || t < 0) return;
			i.sleep = t;
		}
		if (i.action === "volume") {
			let t = j(e.volume);
			if (t === void 0 || t < 0 || t > 100) return;
			i.volume = t;
		}
		return i;
	}
}
//#endregion
//#region src/memory.ts
var M = "stream-card:last:";
function N(e) {
	try {
		let t = localStorage.getItem(M + e);
		if (!t) return;
		let n = JSON.parse(t);
		return typeof n == "object" && n && (n.channel || n.url) ? n : void 0;
	} catch {
		return;
	}
}
function P(e, t) {
	try {
		localStorage.setItem(M + e, JSON.stringify(t));
	} catch {}
}
function _e(e) {
	let t = N(e);
	t?.playing && P(e, {
		...t,
		playing: !1
	});
}
//#endregion
//#region src/recents.ts
var F = "stream-card:recent:", I = (e) => e.channel ?? e.url;
function L(e) {
	try {
		let t = localStorage.getItem(F + e), n = t ? JSON.parse(t) : [];
		return Array.isArray(n) ? n.filter((e) => typeof e == "object" && !!e && !!I(e)) : [];
	} catch {
		return [];
	}
}
function ve(e, t) {
	let n = I(t), r = L(e);
	if (!n || r[0] && I(r[0]) === n) return r;
	let i = [{
		channel: t.channel,
		url: t.url,
		title: t.title
	}, ...r.filter((e) => I(e) !== n)].slice(0, 8);
	try {
		localStorage.setItem(F + e, JSON.stringify(i));
	} catch {}
	return i;
}
function R(e, t) {
	return L(e).find((e) => I(e) !== t);
}
//#endregion
//#region src/sleep-timer.ts
var z = "stream-card:sleep:", B = 6e4, V = 6e4, ye = 2 ** 31 - 1, be = class {
	constructor(e, t, n = () => Date.now()) {
		this.onExpire = e, this.onChange = t, this.now = n, this.timers = /* @__PURE__ */ new Map(), this.loaded = /* @__PURE__ */ new Set();
	}
	set(e, t) {
		this.load(e), t > 0 ? this.arm(e, this.now() + t * V) : this.cancel(e);
	}
	extend(e, t) {
		if (this.load(e), !(t > 0)) return;
		let n = this.timers.get(e);
		this.arm(e, Math.max(n?.endsAt ?? 0, this.now()) + t * V);
	}
	cancel(e) {
		this.load(e);
		let t = this.timers.get(e);
		t && clearTimeout(t.handle), this.timers.delete(e), this.save(e, void 0), t && this.onChange(e);
	}
	get(e) {
		this.load(e);
		let t = this.timers.get(e);
		if (!t) return;
		let n = Math.max(0, t.endsAt - this.now());
		return {
			endsAt: t.endsAt,
			remainingMs: n,
			warning: n <= B
		};
	}
	load(e) {
		if (this.loaded.has(e)) return;
		this.loaded.add(e);
		let t;
		try {
			let n = localStorage.getItem(z + e);
			t = n === null ? void 0 : Number(n);
		} catch {
			t = void 0;
		}
		t !== void 0 && Number.isFinite(t) && (t <= this.now() ? (this.save(e, void 0), this.onExpire(e)) : this.arm(e, t, !1));
	}
	arm(e, t, n = !0) {
		let r = this.timers.get(e);
		r && clearTimeout(r.handle);
		let i = { endsAt: t };
		this.timers.set(e, i), this.save(e, t), this.schedule(e, i), n && this.onChange(e);
	}
	schedule(e, t) {
		let n = t.endsAt - this.now();
		if (n <= 0) {
			this.timers.delete(e), this.save(e, void 0), this.onExpire(e);
			return;
		}
		let r = n > 6e4 ? n - B : n;
		t.handle = setTimeout(() => {
			this.timers.get(e) === t && (t.endsAt - this.now() > 0 && this.onChange(e), this.schedule(e, t));
		}, Math.min(r, ye));
	}
	save(e, t) {
		try {
			t === void 0 ? localStorage.removeItem(z + e) : localStorage.setItem(z + e, String(t));
		} catch {}
	}
}, H = "stream-card:volume";
function U(e) {
	return Number.isFinite(e) ? Math.min(1, Math.max(0, e)) : 1;
}
function xe() {
	try {
		let e = localStorage.getItem(H);
		if (e === null) return;
		let t = Number(e);
		return Number.isFinite(t) ? U(t) : void 0;
	} catch {
		return;
	}
}
function W(e) {
	try {
		localStorage.setItem(H, String(U(e)));
	} catch {}
}
var Se = class {
	constructor(e = window) {
		this.win = e, this.version = y, this.power = {
			screenOn: !0,
			screensaver: !1
		}, this.pending = /* @__PURE__ */ new Map(), this.stops = /* @__PURE__ */ new Map(), this.last = /* @__PURE__ */ new Map(), this.cards = /* @__PURE__ */ new Set(), this.installed = !1, this.sleep = new be((e) => this.stop(e), (e) => {
			for (let t of this.cards) t.target === e && t.sleepChanged();
		}), this.onLlCustom = (e) => {
			let t = e.detail;
			if (!t || !("stream_card" in t)) return;
			let n = ge(t.stream_card);
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
		let t = e.target ?? "default", n = e.action ?? "play";
		if (n === "stop") {
			this.stop(t);
			return;
		}
		if (n !== "play") {
			this.command({
				...e,
				target: t,
				action: n
			}), e.open && this.navigate(e.open);
			return;
		}
		let r = {
			...e,
			target: t
		};
		this.last.set(t, r);
		let i = [...this.cards].filter((e) => e.target === t && e.isLive);
		if (i.length) {
			this.pending.delete(t);
			for (let e of i) e.deliver(r);
		} else this.pending.set(t, {
			req: r,
			at: Date.now()
		});
		e.open && this.navigate(e.open);
	}
	command(e) {
		let { target: t } = e;
		if (e.action === "sleep") {
			this.setSleep(t, e.sleep ?? 0);
			return;
		}
		e.action === "volume" && e.volume !== void 0 && W(e.volume / 100);
		let n = [...this.cards].filter((e) => e.target === t && e.isLive);
		if (n.length) for (let t of n) t.command(e);
		else if (e.action === "last_channel") {
			let e = R(t, N(t)?.channel);
			e && this.request({
				...e,
				target: t,
				action: "play"
			});
		} else (e.action === "channel_up" || e.action === "channel_down") && this.pending.set(t, {
			req: e,
			at: Date.now()
		});
	}
	setSleep(e, t) {
		this.sleep.set(e, t);
	}
	extendSleep(e, t) {
		this.sleep.extend(e, t);
	}
	sleepFor(e) {
		return this.sleep.get(e);
	}
	take(e) {
		let t = this.pending.get(e);
		if (t && (this.pending.delete(e), !(Date.now() - t.at > 3e4))) return t.req;
	}
	lastFor(e) {
		return this.last.get(e);
	}
	stopCount(e) {
		return this.stops.get(e) ?? 0;
	}
	stop(e) {
		this.pending.delete(e), this.last.delete(e), this.stops.set(e, this.stopCount(e) + 1), _e(e), this.sleep.cancel(e);
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
		let t = (e) => `window.${b} && window.${b}.onFullyEvent(${JSON.stringify(e)})`;
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
		this.win.dispatchEvent(new CustomEvent(x, { detail: { ...this.power } }));
	}
};
function G(e = window) {
	let t = e, n = t[b];
	return n || (n = new Se(e), t[b] = n), n.install(), n;
}
//#endregion
//#region src/engines/native-engine.ts
var Ce = class {
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
}, we = async (e, { debug: t, buffer: n = "low" }) => {
	if (e === "native") return new Ce();
	let { MpegtsEngine: r } = await import("./stream-card-mpegts-engine-CZmWK9KL.js");
	return new r(t, n);
}, Te = {
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
	noVideo: "No picture in this stream: its video track is missing or uses a codec the player skips.",
	channelsFailed: "Couldn't load the channel list from Dispatcharr ({detail}). Check dispatcharr_url, or m3u_url if you set one.",
	channelNotFound: "No channel called \"{name}\" in the channel list.",
	noChannels: "The channel list is empty.",
	multiviewStruggling: "This device can't keep up with this many tiles. Use fewer tiles, or a lower-resolution output profile for multiview.",
	noGroupMatch: "None of the channel_groups match a Dispatcharr group. Groups in Dispatcharr: {groups}."
};
function K(e, t = {}) {
	return Te[e].replace(/\{(\w+)\}/g, (e, n) => String(t[n] ?? `{${n}}`));
}
var Ee = [
	[/^avc1|^avc3/i, "H.264"],
	[/^hvc1|^hev1/i, "HEVC (H.265)"],
	[/^av01/i, "AV1"],
	[/^mp4a\.40/i, "AAC"],
	[/^mp4a\.6b|^mp3/i, "MPEG audio (MP2/MP3)"],
	[/^ac-3/i, "AC-3 (Dolby Digital)"],
	[/^ec-3/i, "E-AC-3 (Dolby Digital Plus)"],
	[/^opus/i, "Opus"]
];
function q(e) {
	for (let [t, n] of Ee) if (t.test(e)) return n;
	return e;
}
function De() {
	let e = globalThis, t = e.MediaSource ?? e.ManagedMediaSource;
	return t ? (e) => t.isTypeSupported(e) : void 0;
}
function Oe(e, t = De()) {
	if (t) {
		if (e.videoCodec && !t(`video/mp4; codecs="${e.videoCodec}"`)) return {
			kind: "codec",
			message: K("codecVideo", { codec: q(e.videoCodec) }),
			detail: `video ${e.videoCodec} not supported`
		};
		if (e.audioCodec && !t(`audio/mp4; codecs="${e.audioCodec}"`)) return {
			kind: "codec",
			message: K("codecAudio", { codec: q(e.audioCodec) }),
			detail: `audio ${e.audioCodec} not supported`
		};
	}
}
function ke(e) {
	switch (e.kind) {
		case "network":
		case "stall":
		case "ended":
		case "media": return !0;
		case "http": return e.status === void 0 || e.status >= 500 || e.status === 408 || e.status === 429;
		default: return !1;
	}
}
function J(e, t = {}) {
	let n = {
		kind: e.kind,
		detail: e.detail,
		status: e.status
	};
	switch (e.kind) {
		case "cors": return {
			...n,
			message: K("cors")
		};
		case "network": return {
			...n,
			message: K("network")
		};
		case "http": return e.status === 404 ? {
			...n,
			message: K("http404")
		} : e.status === 401 || e.status === 403 ? {
			...n,
			message: K("httpDenied", { status: e.status })
		} : {
			...n,
			message: K("http", { status: e.status ?? "?" })
		};
		case "timeout": return {
			...n,
			message: K("timeout", { seconds: Math.round((t.startTimeoutMs ?? 0) / 1e3) })
		};
		case "codec": return e.codec && e.track ? {
			...n,
			message: K(e.track === "audio" ? "codecAudio" : "codecVideo", { codec: q(e.codec) })
		} : {
			...n,
			message: K("codec")
		};
		case "unsupported-device": return {
			...n,
			message: K("unsupportedDevice")
		};
		case "config": return {
			...n,
			message: K("config", { detail: e.detail })
		};
		case "stall":
		case "ended":
		case "media": return t.attempts ? {
			...n,
			message: K("gaveUp", { attempts: t.attempts })
		} : {
			...n,
			message: K("media")
		};
	}
}
async function Ae(e, t = 5e3) {
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
var je = [
	1e3,
	2e3,
	4e3,
	8e3,
	15e3
], Me = .3, Ne = 2e4;
function Pe(e) {
	let t = e.buffered, n = e.currentTime;
	for (let e = 0; e < t.length; e++) if (t.end(e) > n) return t.end(e) - Math.max(n, t.start(e));
	return 0;
}
function Fe(e) {
	let t = e.buffered;
	return t.length ? t.end(t.length - 1) : 0;
}
var Y = {
	sessions: 0,
	engines: 0
}, Ie = class {
	constructor(e, t, n) {
		this.video = e, this.source = t, this.opts = n, this.status = {
			state: "connecting",
			failures: 0,
			mutedByPolicy: !1,
			needsGesture: !1
		}, this.attemptId = 0, this.disposed = !1, this.gotData = !1, this.lastTime = -1, this.lastProgressAt = 0, this.playingSince = 0, this.holding = !1, this.holdIsStart = !1, this.holdStartedAt = 0, this.holdBufferedEnd = 0, this.createEngine = n.createEngine ?? we, this.diagnose = n.diagnose ?? Ae, Y.sessions++;
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
		this.gotData = !1, this.lastTime = -1, this.lastProgressAt = 0, this.playingSince = 0, this.holding = !1, this.update({
			state: this.status.failures > 0 ? "reconnecting" : "connecting",
			notice: void 0,
			retryAt: void 0
		});
		let t;
		try {
			t = await this.createEngine(this.source.type, {
				debug: !!this.opts.debug,
				buffer: this.opts.buffer
			});
		} catch (t) {
			this.fail(e, {
				kind: "media",
				detail: `could not load player: ${String(t)}`
			}, !1);
			return;
		}
		if (!this.isCurrent(e)) await t.destroy();
		else if (this.engine = t, Y.engines++, t.on((t) => this.onEngineEvent(e, t)), this.startTimer = setTimeout(() => {
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
			this.isCurrent(e) && (this.watchdog = setInterval(() => this.tick(e), 500), this.stable ? this.startHold(!0) : await this.play(e));
		}
	}
	get stable() {
		return this.opts.buffer === "stable" && this.source.type === "mpegts";
	}
	startHold(e) {
		this.holding = !0, this.holdIsStart = e, this.holdStartedAt = Date.now(), this.holdBufferedEnd = Fe(this.video), this.lastProgressAt = Date.now(), e || this.video.pause(), this.update({ buffering: !0 });
	}
	tickHolding(e) {
		let t = this.video, n = Date.now(), r = Fe(t);
		if (r > this.holdBufferedEnd + .01) this.holdBufferedEnd = r, this.lastProgressAt = n;
		else if (this.gotData && n - this.lastProgressAt > this.stallTimeoutMs) {
			this.handleFailure(e, {
				kind: "stall",
				detail: `no data for ${this.stallTimeoutMs} ms while buffering`
			});
			return;
		}
		let i = Pe(t);
		(i >= (this.holdIsStart ? 8 : 5) || i > 1 && n - this.holdStartedAt > Ne) && (this.holding = !1, this.lastTime = -1, this.lastProgressAt = n, this.update({ buffering: !1 }), this.play(e));
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
	setMuted(e) {
		this.opts.muted = e, this.video.muted = e || this.status.mutedByPolicy;
	}
	async resumeFromGesture(e) {
		let t = this.video;
		e && (this.opts.muted = !1, t.muted = !1, this.update({ mutedByPolicy: !1 }));
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
				let n = Oe(e);
				if (n) {
					this.terminal(n);
					return;
				}
			} else this.handleFailure(e, t.error);
		}
	}
	tick(e) {
		if (!this.isCurrent(e)) return;
		if (this.holding) {
			this.tickHolding(e);
			return;
		}
		let t = this.video, n = Date.now();
		if (this.stable && this.status.state === "playing" && !t.paused && Pe(t) < Me) {
			this.startHold(!1);
			return;
		}
		let r = t.currentTime;
		r === this.lastTime ? !t.paused && this.gotData && (this.lastProgressAt || (this.lastProgressAt = n), n - this.lastProgressAt > this.stallTimeoutMs && this.handleFailure(e, {
			kind: "stall",
			detail: `no progress for ${this.stallTimeoutMs} ms`
		})) : (this.lastTime >= 0 && r > this.lastTime && (this.lastProgressAt = n, this.status.state === "playing" ? !this.status.notice && this.source.type === "mpegts" && n - this.playingSince > 3e3 && this.video.videoWidth === 0 ? this.update({ notice: K("noVideo") }) : this.status.failures > 0 && n - this.playingSince > (this.opts.stableMs ?? 3e4) && this.update({ failures: 0 }) : (this.playingSince = n, this.update({ state: "playing" }))), this.lastTime = r, this.lastProgressAt || (this.lastProgressAt = n));
	}
	async handleFailure(e, t) {
		if (this.isCurrent(e)) {
			if (t.kind === "network" && !this.gotData) {
				this.teardownEngine();
				let n = await this.diagnose(this.source.url);
				if (!this.isCurrent(e)) return;
				if (n === "cors") {
					this.terminal(J({
						kind: "cors",
						detail: t.detail
					}));
					return;
				}
			}
			if (t.kind === "media" && this.status.mediaInfo) {
				let e = Oe(this.status.mediaInfo);
				if (e) {
					this.terminal(e);
					return;
				}
			}
			this.fail(e, t, ke(t));
		}
	}
	fail(e, t, n) {
		if (!this.isCurrent(e)) return;
		let r = this.status.failures + 1;
		if (this.teardownEngine(), !n) {
			this.terminal(J(t, { startTimeoutMs: this.opts.startTimeoutMs }));
			return;
		}
		if (r > this.opts.maxAttempts) {
			this.terminal(J(t, { attempts: r }));
			return;
		}
		let i = this.opts.backoffMs ?? je, a = i[Math.min(r - 1, i.length - 1)];
		this.update({
			state: "reconnecting",
			failures: r,
			retryAt: Date.now() + a,
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
		this.engine = void 0, e && (Y.engines--, e.destroy());
	}
	async destroy() {
		this.disposed || (this.teardownEngine(), this.disposed = !0, this.attemptId++, this.status = {
			...this.status,
			state: "stopped"
		}, Y.sessions--);
	}
	getStats() {
		return this.engine?.getStats(this.video);
	}
};
//#endregion
//#region src/lifecycle.ts
function Le(e) {
	return e.connected ? e.preview ? "preview" : e.hasSource ? e.wantPlaying ? e.pageVisible ? e.screenAwake ? e.intersecting ? null : "hidden" : "screen-off" : "page-hidden" : "stopped" : "no-source" : "disconnected";
}
var Re = [
	"pointerdown",
	"keydown",
	"wheel",
	"touchstart"
], ze = class {
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
			}, { threshold: [0, .01] }), this.io.observe(this.host)), document.addEventListener("visibilitychange", this.onVisibility), window.addEventListener("pagehide", this.onPageHide), window.addEventListener("pageshow", this.onVisibility), window.addEventListener(x, this.onPower);
			for (let e of Re) document.addEventListener(e, this.onActivity, {
				capture: !0,
				passive: !0
			});
		}
	}
	detach() {
		if (this.attached) {
			this.attached = !1, this.io?.disconnect(), this.io = void 0, document.removeEventListener("visibilitychange", this.onVisibility), window.removeEventListener("pagehide", this.onPageHide), window.removeEventListener("pageshow", this.onVisibility), window.removeEventListener(x, this.onPower);
			for (let e of Re) document.removeEventListener(e, this.onActivity, { capture: !0 });
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
}, Be = 2e3, Ve = class {
	constructor(e, t, n = () => !1, r = Be) {
		this.onCommit = e, this.onChange = t, this.isComplete = n, this.delayMs = r, this.digits = "";
	}
	press(e) {
		/^\d$/.test(e) && (this.digits += e, this.digits.length >= 5 || this.isComplete(this.digits) ? this.commit() : (this.restart(), this.onChange()));
	}
	delete() {
		this.digits && (this.digits = this.digits.slice(0, -1), this.digits ? this.restart() : clearTimeout(this.timer), this.onChange());
	}
	commit() {
		let e = this.digits;
		this.clear(), e && this.onCommit(e);
	}
	clear() {
		clearTimeout(this.timer), this.timer = void 0;
		let e = !!this.digits;
		this.digits = "", e && this.onChange();
	}
	restart() {
		clearTimeout(this.timer), this.timer = setTimeout(() => this.commit(), this.delayMs);
	}
}, He = a`
  :host {
    display: block;
  }
  ha-card {
    display: block;
    overflow: hidden;
    height: 100%;
    font-family: var(--sc-font);
    color: var(--sc-text);
  }
  .mono {
    font-family: var(--sc-mono);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  button {
    font: inherit;
    color: inherit;
    border: none;
    cursor: pointer;
    background: none;
    padding: 0;
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--sc-accent);
    outline-offset: 2px;
  }
  .stage[hidden] {
    display: none;
  }
  .stage {
    position: relative;
    container: stage / inline-size;
  }
  .stage:fullscreen {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: var(--sc-pic);
  }
  .stage:fullscreen .frame {
    aspect-ratio: auto !important;
    flex: 1;
  }
  .frame {
    position: relative;
    width: 100%;
    background: var(--sc-pic);
    color: var(--sc-pic-text);
    overflow: hidden;
    isolation: isolate;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
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
    background: var(--sc-pic);
  }
  .sheen {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.6) 0%,
      rgba(0, 0, 0, 0) 32%,
      rgba(0, 0, 0, 0) 60%,
      rgba(0, 0, 0, 0.72) 100%
    );
    transition: opacity 0.3s;
  }
  .glass {
    background: var(--sc-glass);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid var(--sc-glass-line);
  }
  .hidden {
    opacity: 0;
    pointer-events: none;
  }

  /* ---- logo plate ---- */
  .logo {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    overflow: hidden;
    background: var(--sc-logo-bg);
    color: #f4f5f7;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
  .logo img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 4px;
    object-fit: contain;
  }
  .logo img:not([hidden]) + .ini {
    visibility: hidden;
  }
  .logo img[hidden] {
    display: none;
  }

  /* ---- ident (top left) ---- */
  .ident {
    position: absolute;
    z-index: 2;
    top: 16px;
    left: 16px;
    right: 132px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    color: var(--sc-pic-text);
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.45);
    transition: opacity 0.3s;
    pointer-events: none;
  }
  .ident-logo {
    width: 52px;
    height: 52px;
    font-size: 18px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    text-shadow: none;
  }
  .ident-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .ident-line {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    min-width: 0;
  }
  .ident-line .title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ident-num {
    flex: none;
    font-weight: 700;
    color: var(--sc-pic-text-2);
  }
  .ident-now {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.12;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .ident-times {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
    font-size: 12px;
    color: var(--sc-pic-text-2);
  }
  .ident-times .bar {
    width: 160px;
  }
  .ident-next {
    display: none;
    font-size: 13px;
    color: var(--sc-text-2);
  }
  .bar {
    display: block;
    height: 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.22);
    overflow: hidden;
  }
  .bar > span {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: currentColor;
  }
  .ident-times .bar > span {
    background: #fff;
  }

  /* The tuning layer shows the channel in the middle; no need for it in the corner too. */
  .stage[data-ui='connecting'] .ident {
    opacity: 0;
  }
  /* ---- chips (top right) ---- */
  .chips-top {
    position: absolute;
    z-index: 2;
    top: 16px;
    right: 16px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    transition: opacity 0.3s;
    pointer-events: none;
  }
  .chip-top {
    height: 30px;
    padding: 0 12px;
    border-radius: 15px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .chip-top svg.icon {
    width: 16px;
    height: 16px;
  }
  .chip-top.live {
    font-size: 12px;
    font-weight: 750;
    letter-spacing: 0.1em;
  }
  .live-dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--sc-live);
    box-shadow: 0 0 0 3px rgba(255, 91, 79, 0.25);
    animation: pulse 2.4s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }

  /* ---- channel number OSD ---- */
  .osd {
    position: absolute;
    z-index: 2;
    left: 20px;
    bottom: 92px;
    display: flex;
    align-items: flex-end;
    gap: 16px;
    pointer-events: none;
    animation: osd-in 0.5s var(--sc-ease) both;
    text-shadow: 0 6px 40px rgba(0, 0, 0, 0.5);
  }
  .osd-number {
    font-size: clamp(56px, 13cqw, 120px);
    font-weight: 800;
    line-height: 0.82;
    letter-spacing: -0.06em;
  }
  .osd-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 4px;
  }
  .osd-label {
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--sc-pic-text-2);
  }
  .osd-name {
    font-size: clamp(16px, 3cqw, 22px);
    font-weight: 700;
  }
  .osd.typing {
    left: auto;
    right: 16px;
    top: 56px;
    bottom: auto;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    padding: 14px 20px;
    border-radius: 20px;
    background: var(--sc-glass);
    text-shadow: none;
  }
  .osd.typing .osd-number {
    letter-spacing: 0.04em;
    font-size: clamp(48px, 10cqw, 96px);
  }
  .osd .cursor {
    opacity: 0.35;
  }
  .osd-hint {
    font-size: 14px;
    color: var(--sc-pic-text-2);
  }
  @keyframes osd-in {
    from {
      opacity: 0;
      transform: translate3d(-24px, 0, 0);
    }
  }

  /* ---- state layers ---- */
  .layer {
    position: absolute;
    z-index: 1;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 20px;
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
  .layer.solid {
    background: #16181d;
  }
  .layer.edit {
    inset: 8px;
    border: 1.5px dashed rgba(255, 255, 255, 0.25);
    border-radius: calc(var(--sc-radius) - 4px);
    background: #16181d;
  }
  .edit-tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .tag {
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 8px;
    background: #24272e;
    color: #b2b7c1;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .message {
    max-width: 36em;
    font-size: 15px;
    line-height: 1.45;
    color: var(--sc-pic-text);
  }
  .message.big {
    font-size: 17px;
    font-weight: 650;
  }
  .message.sub {
    font-size: 13px;
    color: var(--sc-pic-text-2);
  }
  .message.detail {
    font-size: 12px;
    opacity: 0.75;
    font-family: var(--sc-mono);
    word-break: break-word;
  }
  .state-icon svg.icon {
    width: 34px;
    height: 34px;
  }
  .state-icon.warn {
    color: var(--sc-warn);
  }
  .state-icon.muted {
    color: #8f95a1;
  }
  .big-play {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--sc-glass);
    border: 1.5px solid rgba(255, 255, 255, 0.6);
    color: #fff;
  }
  .big-play svg.icon {
    width: 34px;
    height: 34px;
    margin-left: 4px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: var(--sc-target);
    padding: 0 18px;
    border-radius: calc(var(--sc-target) / 2);
    background: rgba(255, 255, 255, 0.12);
    color: var(--sc-pic-text);
    font-size: 14px;
    font-weight: 650;
  }
  .pill svg.icon {
    width: 18px;
    height: 18px;
  }
  /* Light on the always-dark picture, so it reads whatever the theme's primary colour is. */
  .pill.primary,
  .pill.light {
    background: #f4f5f7;
    color: #111318;
  }
  .pill.unmute {
    min-height: 52px;
    padding: 0 22px;
    font-size: 15px;
    background: rgba(14, 15, 18, 0.62);
    border: 1px solid rgba(255, 255, 255, 0.18);
  }
  .pill.unmute svg.icon {
    width: 22px;
    height: 22px;
  }
  .tuning-logo {
    width: 64px;
    height: 64px;
    border-radius: 14px;
    font-size: 22px;
  }
  .tuning-name {
    font-size: 17px;
    font-weight: 650;
  }
  .tuning-name .mono {
    opacity: 0.7;
  }
  .tuning-status {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tuning-status .message {
    font-size: 13px;
    color: var(--sc-pic-text-2);
  }
  .spinner {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.22);
    border-top-color: #fff;
    animation: spin 0.9s linear infinite;
  }
  .spinner.small {
    width: 16px;
    height: 16px;
    border-width: 2px;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  /* Keep centred content clear of the control bar floating along the bottom. */
  .frame[data-state='ready'] .layer,
  .frame[data-state='connecting'] .layer,
  .frame[data-state='reconnecting'] .layer {
    padding-bottom: 76px;
  }
  .notice {
    position: absolute;
    z-index: 2;
    left: 16px;
    right: 16px;
    top: 84px;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--sc-glass);
    pointer-events: none;
  }

  /* ---- control bar ---- */
  .controls {
    position: absolute;
    z-index: 3;
    left: 12px;
    right: 12px;
    bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--sc-pic-text);
    transition: opacity 0.3s;
  }
  .group {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 16px;
    background: var(--sc-glass);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid var(--sc-glass-line);
  }
  .group.sound {
    position: relative;
    margin-left: auto;
  }
  .upnext {
    flex: 1 1 auto;
    min-width: 0;
    height: calc(var(--sc-target) + 8px);
    box-sizing: border-box;
    gap: 10px;
    padding: 0 16px;
    font-size: 13px;
    color: var(--sc-pic-text-2);
  }
  .upnext.empty {
    visibility: hidden;
  }
  .upnext-label {
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    opacity: 0.8;
  }
  .upnext-time {
    font-weight: 700;
    color: var(--sc-pic-text);
  }
  .upnext-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ctl {
    width: var(--sc-target);
    height: var(--sc-target);
    border-radius: 12px;
    display: grid;
    place-items: center;
    flex: none;
    transition:
      background 0.15s,
      transform 0.15s var(--sc-ease);
  }
  .ctl:hover,
  .ctl.on {
    background: var(--sc-glass-hover);
  }
  .ctl:active {
    transform: scale(0.94);
  }
  .sep {
    flex: none;
    width: 1px;
    height: 24px;
    margin: 0 4px;
    background: rgba(255, 255, 255, 0.14);
  }
  .row-break {
    display: none;
  }
  .vol-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 96px;
    height: 4px;
    margin: 0 10px 0 2px;
    border-radius: 2px;
    background: linear-gradient(
      90deg,
      currentColor var(--vol),
      rgba(127, 127, 127, 0.4) var(--vol)
    );
    cursor: pointer;
  }
  .vol-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  }
  .vol-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border: 0;
    border-radius: 50%;
    background: #fff;
  }
  .sleep-menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    width: 260px;
    box-sizing: border-box;
    padding: 14px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: var(--sc-pic-text);
    background: rgba(14, 15, 18, 0.82);
  }
  .menu-label {
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--sc-pic-text-2);
  }
  .sleep-options {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }
  .sleep-option {
    height: 40px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 650;
    background: rgba(255, 255, 255, 0.1);
  }
  .sleep-option[aria-pressed='true'] {
    background: #fff;
    color: #111318;
  }

  /* Narrow cards: hide the "Next" line and drop the volume slider's width first. */
  @container stage (max-width: 760px) {
    .upnext {
      display: none;
    }
    .vol-slider {
      width: 72px;
    }
  }

  /* ---- phone / pop-up layout: ident and controls below the picture ---- */
  @container stage (max-width: 519px) {
    .stage:not(.fs):not(.tv) .ident {
      position: static;
      padding: 14px 16px 0;
      gap: 12px;
      color: var(--sc-text);
      text-shadow: none;
      opacity: 1;
      pointer-events: auto;
    }
    .stage:not(.fs):not(.tv) .ident-num {
      color: var(--sc-text-2);
    }
    .stage:not(.fs):not(.tv) .ident-now {
      font-size: 19px;
    }
    .stage:not(.fs):not(.tv) .ident-times {
      color: var(--sc-text-2);
    }
    .stage:not(.fs):not(.tv) .ident-times .bar {
      flex: 1;
      background: var(--sc-line);
    }
    .stage:not(.fs):not(.tv) .ident-times .bar > span {
      background: var(--sc-accent);
    }
    .stage:not(.fs):not(.tv) .ident-next {
      display: block;
    }
    .stage:not(.fs):not(.tv) .controls {
      position: relative;
      left: auto;
      right: auto;
      bottom: auto;
      flex-wrap: wrap;
      justify-content: space-between;
      row-gap: 12px;
      padding: 14px 16px 4px;
      color: var(--sc-text);
      opacity: 1;
      pointer-events: auto;
    }
    .stage:not(.fs):not(.tv) .group {
      display: contents;
    }
    /* The ident shows what's next instead. */
    .stage:not(.fs):not(.tv) .group.upnext {
      display: none;
    }
    .stage:not(.fs):not(.tv) .sep {
      display: none;
    }
    .stage:not(.fs):not(.tv) .ctl {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--sc-surface);
    }
    .stage:not(.fs):not(.tv) .ctl.on {
      background: color-mix(in srgb, var(--sc-accent) 20%, transparent);
      color: var(--sc-accent);
    }
    .stage:not(.fs):not(.tv) .ctl-stop {
      width: 64px;
      height: 64px;
      background: var(--sc-accent);
      color: var(--sc-on-accent);
    }
    /* Row 1: last, down, stop, up, sleep. Row 2: mute, volume, channels, multiview, full screen. */
    .ctl-last {
      order: 1;
    }
    .ctl-down {
      order: 2;
    }
    .ctl-stop {
      order: 3;
    }
    .ctl-up {
      order: 4;
    }
    .ctl-sleep {
      order: 5;
    }
    .stage:not(.fs):not(.tv) .row-break {
      display: block;
      order: 6;
      flex-basis: 100%;
      height: 0;
    }
    .ctl-mute {
      order: 7;
    }
    .vol-slider {
      order: 8;
    }
    .ctl-channels {
      order: 9;
    }
    .ctl-multiview {
      order: 10;
    }
    .ctl-fullscreen {
      order: 11;
    }
    .stage:not(.fs):not(.tv) .ctl-mute,
    .stage:not(.fs):not(.tv) .ctl-channels,
    .stage:not(.fs):not(.tv) .ctl-multiview,
    .stage:not(.fs):not(.tv) .ctl-fullscreen {
      width: 44px;
      height: 44px;
      background: none;
    }
    .stage:not(.fs):not(.tv) .vol-slider {
      flex: 1;
      width: auto;
      min-width: 60px;
    }
    .stage:not(.fs):not(.tv) .sleep-menu {
      right: 16px;
      bottom: calc(100% - 4px);
    }
    .stage:not(.fs):not(.tv) .frame[data-state] .layer {
      padding-bottom: 20px;
    }
    .stage:not(.fs):not(.tv) .osd {
      bottom: 16px;
    }
    .stage:not(.fs):not(.tv) .chips-top {
      top: 10px;
      right: 10px;
    }
  }

  /* ---- TV (HA Cast): nothing to tap, larger type, inside the 5% TV-safe area ---- */
  .stage.tv .ident {
    top: 5%;
    left: 5%;
    right: 30%;
    gap: 20px;
  }
  .stage.tv .ident-logo {
    width: 72px;
    height: 72px;
    border-radius: 14px;
    font-size: 26px;
  }
  .stage.tv .ident-line {
    font-size: 20px;
  }
  .stage.tv .ident-now {
    font-size: 36px;
  }
  .stage.tv .chips-top {
    top: 5%;
    right: 5%;
  }
  .stage.tv .osd {
    left: 5%;
    bottom: 16%;
  }
  .stage.tv .osd.typing {
    left: auto;
    right: 5%;
    top: 5%;
    bottom: auto;
  }
  .stage.tv .osd-hint {
    font-size: 16px;
  }
  .tv-hints {
    position: absolute;
    z-index: 2;
    left: 5%;
    right: 5%;
    bottom: 5%;
    display: flex;
    align-items: center;
    gap: 28px;
    font-size: 15px;
    color: var(--sc-pic-text-2);
    pointer-events: none;
  }
  .tv-hints > span {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .tv-hints .key {
    min-width: 34px;
    height: 34px;
    padding: 0 8px;
    box-sizing: border-box;
    border-radius: 8px;
    border: 1.5px solid rgba(255, 255, 255, 0.5);
    display: inline-grid;
    place-items: center;
    font-size: 14px;
    font-weight: 700;
  }
  .tv-clock {
    margin-left: auto;
    font-size: 22px;
    font-weight: 700;
    color: var(--sc-pic-text);
  }

  .debug {
    position: absolute;
    z-index: 4;
    top: 56px;
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
  stream-card-picker.panel {
    border-top: 1px solid var(--sc-line);
  }
  @media (prefers-reduced-motion: reduce) {
    .osd,
    .live-dot {
      animation: none;
    }
    .ctl {
      transition: none;
    }
  }
`, Ue = [
	s,
	a`
    ${ie(re)}
  `,
	He
], We = [
	0,
	15,
	30,
	60,
	90
], Ge = (e) => e.target.hidden = !1, Ke = (e) => e.target.hidden = !0;
function qe(e, t, n = "") {
	let r = e?.name ?? t ?? "";
	return d`<span class="logo ${n}" aria-hidden="true">
    ${e?.logo ? d`<img src=${e.logo} alt="" decoding="async" @load=${Ge} @error=${Ke} />` : m}
    <span class="ini">${o(r) || "▶"}</span>
  </span>`;
}
function Je(e, t = "") {
	return e === void 0 ? m : d`<span class="bar ${t}"><span style="width:${e.toFixed(1)}%"></span></span>`;
}
function Ye(e) {
	let t = e.channel, n = e.title ?? t?.name;
	if (!n && e.ui !== "playing" || e.ui === "preview" || e.ui === "empty") return m;
	let r = e.nowNext?.now, i = e.nowNext?.next;
	return d`<div class="ident ${e.chrome ? "" : "hidden"}">
    ${qe(t, n, "ident-logo")}
    <div class="ident-text">
      <div class="ident-line">
        ${t?.number ? d`<span class="ident-num mono">${t.number}</span>` : m}
        <span class="title">${n ?? "Live"}</span>
      </div>
      ${r ? d`<div class="ident-now">${r.title}</div>` : m}
      ${r?.start && r.end ? d`<div class="ident-times mono">
              <span>${h(r.start)}</span>${Je(ne(r, e.now))}<span
                >${h(r.end)}</span
              >
            </div>` : m}
      ${i ? d`<div class="ident-next">
              Next${i.start ? d` <span class="mono">${h(i.start)}</span>` : m}:
              ${i.title}
            </div>` : m}
    </div>
  </div>`;
}
function Xe(e) {
	return e.ui !== "playing" && !e.sleep || e.numberEntry?.digits ? m : d`<div class="chips-top ${e.chrome ? "" : "hidden"}">
    ${e.sleep && !e.sleep.warning ? d`<span class="glass chip-top sleep-chip">
            ${p("sleep")} Stops in <span class="mono">${g(e.sleep.remainingMs)}</span>
          </span>` : m}
    ${e.ui === "playing" ? d`<span class="glass chip-top live"
            ><span class="live-dot" role="img" aria-label="Live"></span>LIVE</span
          >` : m}
  </div>`;
}
function Ze(e) {
	let t = e.numberEntry;
	if (t?.digits) {
		let e = t.candidates.slice(0, 3).map((e) => _(e)).join(" · ");
		return d`<div class="osd typing" role="status" aria-label="Channel ${t.digits}">
      <span class="osd-number mono">${t.digits}<span class="cursor">_</span></span>
      <span class="osd-hint">${e || "No channel with that number"}</span>
    </div>`;
	}
	let n = e.channel;
	return !e.osd || !n?.number || e.ui === "connecting" || e.ui === "error" ? m : d`<div class="osd" aria-hidden="true">
    <span class="osd-number mono">${n.number}</span>
    <span class="osd-text">
      <span class="osd-label">Now on</span>
      <span class="osd-name">${n.name}</span>
    </span>
  </div>`;
}
function X(e, t) {
	return d`<div class="layer ${t ? "dim" : ""}">
    <button class="big-play" @click=${e.play} aria-label="Play">${p("play")}</button>
    ${t ? d`<div class="message">${t}</div>` : m}
  </div>`;
}
function Qe(e, t) {
	if (e.sleep?.warning && (e.ui === "playing" || e.ui === "reconnecting")) return d`<div class="layer dim sleep-warning" role="alert">
      <span class="state-icon">${p("sleep")}</span>
      <div class="message big">
        Stopping in <span class="mono">${te(e.sleep.remainingMs)}</span>
      </div>
      <div class="actions">
        ${t.setSleep ? d`<button class="pill light keep-watching" @click=${() => t.setSleep?.(0)}>
                Keep watching
              </button>` : m}
        ${t.extendSleep ? d`<button class="pill extend-sleep" @click=${() => t.extendSleep?.(30)}>
                +30 min
              </button>` : m}
      </div>
    </div>`;
	switch (e.ui) {
		case "preview": {
			let t = e.edit;
			return d`<div class="layer edit">
        <span class="state-icon muted">${p("tv")}</span>
        <div class="message">Playback is off while editing</div>
        ${t ? d`<div class="edit-tags">
                <span class="tag mono">target: ${t.target}</span>
                ${t.profile ? d`<span class="tag mono">profile ${t.profile}</span>` : m}
                ${t.favourites ? d`<span class="tag mono"
                        >${t.favourites} favourite${t.favourites === 1 ? "" : "s"}</span
                      >` : m}
              </div>` : m}
      </div>`;
		}
		case "empty": return d`<div class="layer">
        <span class="state-icon muted">${p("tv")}</span>
        <div class="message">${e.hasGuide ? "Choose a channel below" : "Choose a channel"}</div>
      </div>`;
		case "error": {
			let n = t.lastChannel && e.previousChannel ? e.previousChannel : void 0;
			return d`<div class="layer solid" role="alert">
        <span class="state-icon warn">${p("alert")}</span>
        <div class="message">${e.errorMessage}</div>
        ${e.errorDetail ? d`<div class="message detail">${e.errorDetail}</div>` : m}
        <div class="actions">
          ${n ? d`<button class="pill primary back-to" @click=${() => t.lastChannel?.()}>
                  Back to <span class="mono">${n.number ?? n.name}</span>
                </button>` : m}
          ${e.canRetry ? d`<button class="pill ${n ? "" : "primary"} retry" @click=${t.play}>
                  ${p("refresh")} Retry
                </button>` : m}
          ${e.hasGuide ? d`<button
                  class="pill channels"
                  @click=${t.toggleGuide}
                  aria-expanded=${e.guideOpen ? "true" : "false"}
                >
                  ${p("guide")} Channels
                </button>` : m}
        </div>
      </div>`;
		}
		case "connecting": {
			if (e.needsGesture) return X(t, "Tap to play");
			let n = e.channel, r = e.title ?? n?.name;
			return d`<div class="layer tuning">
        ${r ? qe(n, r, "tuning-logo") : m}
        ${r ? d`<div class="tuning-name">
                ${n?.number ? d`<span class="mono">${n.number}</span>` : m} ${r}
              </div>` : m}
        <div class="tuning-status">
          <span
            class="spinner small"
            role="progressbar"
            aria-label=${e.buffering ? "Buffering" : "Tuning"}
          ></span>
          <span class="message">${e.buffering ? "Buffering…" : "Tuning"}</span>
        </div>
      </div>`;
		}
		case "reconnecting": {
			if (e.needsGesture) return X(t, "Tap to play");
			let n = e.retryAt ? Math.max(0, Math.ceil((e.retryAt - e.now) / 1e3)) : 0;
			return d`<div class="layer dim">
        <span class="spinner" role="progressbar" aria-label="Reconnecting"></span>
        <div class="message big">Picture dropped. Reconnecting…</div>
        <div class="message sub mono">
          try ${e.failures} of ${e.maxAttempts}${n > 0 ? ` · next in ${n} s` : ""}
        </div>
      </div>`;
		}
		case "playing": return e.needsGesture ? X(t, "Tap to play") : e.mutedByPolicy ? d`<div class="layer">
          <button class="pill glass unmute" @click=${t.unmute} aria-label="Unmute">
            ${p("volumeOff")} Tap for sound
          </button>
        </div>` : e.buffering ? d`<div class="layer">
          <span class="spinner" role="progressbar" aria-label="Buffering"></span>
          <div class="message">Buffering…</div>
        </div>` : m;
		case "ready": return X(t, e.stoppedReason);
	}
}
function $e(e, t) {
	if (!e.sleepMenuOpen || !t.setSleep) return m;
	let n = e.sleep ? Math.ceil(e.sleep.remainingMs / 6e4) : 0;
	return d`<div class="glass sleep-menu" role="group" aria-label="Stop playing after">
    <span class="menu-label">Stop playing after</span>
    <div class="sleep-options">
      ${We.map((r) => {
		let i = r === 0 ? !e.sleep : We.includes(n) && n === r;
		return d`<button
          class="sleep-option"
          aria-pressed=${i ? "true" : "false"}
          @click=${(e) => {
			e.stopPropagation(), t.setSleep?.(r), t.toggleSleepMenu();
		}}
        >
          ${r === 0 ? "Off" : `${r}m`}
        </button>`;
	})}
    </div>
  </div>`;
}
function et(e, t) {
	if (e.ui === "preview" || e.ui === "empty" || e.ui === "error" || e.layout === "tv") return m;
	let n = e.ui === "playing" || e.ui === "connecting" || e.ui === "reconnecting", r = e.previousChannel, i = e.nowNext?.next, a = Math.round((e.muted ? 0 : e.volume ?? 1) * 100);
	return d`<div class="controls ${e.chrome ? "" : "hidden"}" @click=${tt}>
    <div class="group transport">
      ${n ? d`<button class="ctl ctl-stop" @click=${t.stop} aria-label="Stop">
              ${p("stop")}
            </button>` : m}
      ${t.lastChannel && r ? d`<button
              class="ctl ctl-last"
              @click=${() => t.lastChannel?.()}
              aria-label="Last channel: ${_(r)}"
              title="Last channel: ${_(r)}"
            >
              ${p("last")}
            </button>` : m}
      ${e.canStep ? d`<span class="sep" aria-hidden="true"></span>
              <button class="ctl ctl-down" @click=${t.channelDown} aria-label="Previous channel">
                ${p("chevronDown")}
              </button>
              <button class="ctl ctl-up" @click=${t.channelUp} aria-label="Next channel">
                ${p("chevronUp")}
              </button>` : m}
    </div>
    <div class="group upnext ${i ? "" : "empty"}">
      ${i ? d`<span class="upnext-label">Next</span>
              ${i.start ? d`<span class="mono upnext-time">${h(i.start)}</span>` : m}
              <span class="upnext-title">${i.title}</span>` : m}
    </div>
    <div class="group sound">
      <button class="ctl ctl-mute" @click=${t.toggleMute} aria-label=${e.muted ? "Unmute" : "Mute"}>
        ${p(e.muted ? "volumeOff" : a < 50 ? "volumeLow" : "volumeHigh")}
      </button>
      ${t.setVolume ? d`<input
              class="vol-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              aria-label="Volume"
              .value=${String(a)}
              style="--vol:${a}%"
              @input=${(e) => t.setVolume?.(Number(e.target.value) / 100)}
            />` : m}
      <span class="sep" aria-hidden="true"></span>
      ${t.setSleep ? d`<button
              class="ctl ctl-sleep ${e.sleep || e.sleepMenuOpen ? "on" : ""}"
              @click=${t.toggleSleepMenu}
              aria-label=${e.sleep ? `Sleep timer, ${g(e.sleep.remainingMs)} left` : "Sleep timer"}
              aria-expanded=${e.sleepMenuOpen ? "true" : "false"}
            >
              ${p("sleep")}
            </button>` : m}
      ${e.hasGuide ? d`<button
              class="ctl ctl-channels ${e.guideOpen ? "on" : ""}"
              @click=${t.toggleGuide}
              aria-label=${e.guideOpen ? "Hide channels" : "Channels"}
              aria-expanded=${e.guideOpen ? "true" : "false"}
            >
              ${p("guide")}
            </button>` : m}
      ${t.multiview ? d`<button
              class="ctl ctl-multiview"
              @click=${() => t.multiview?.()}
              aria-label="Multiview"
            >
              ${p("grid")}
            </button>` : m}
      <button
        class="ctl ctl-fullscreen"
        @click=${t.toggleFullscreen}
        aria-label=${e.fullscreen ? "Exit full screen" : "Full screen"}
      >
        ${p(e.fullscreen ? "fullscreenExit" : "fullscreen")}
      </button>
      ${$e(e, t)}
    </div>
  </div>`;
}
function tt(e) {
	e.stopPropagation();
}
function nt(e, t) {
	return e.layout !== "tv" || !e.chrome || e.ui === "preview" ? m : d`<div class="tv-hints" aria-hidden="true">
    ${t ? d`<span><span class="key">▲</span><span class="key">▼</span>Channel</span>
            <span><span class="key mono">0–9</span>Number</span>
            <span><span class="key">OK</span>Guide</span>
            <span><span class="key">BACK</span>Last channel</span>` : m}
    <span class="tv-clock mono">${h(e.now)}</span>
  </div>`;
}
//#endregion
//#region src/stream-card.ts
var Z, rt = 4e3, it = 2600, at = /* @__PURE__ */ new Set([
	"HUI-CARD-PREVIEW",
	"HUI-CARD-PICKER",
	"HUI-DIALOG-EDIT-CARD",
	"HUI-CARD-ELEMENT-EDITOR"
]), ot;
function st() {
	ot ?? (ot = import("./stream-card-picker-B-Mjx9qH.js").then(({ PICKER_TAG: e, StreamCardPicker: t }) => {
		customElements.get(e) || customElements.define(e, t);
	}));
}
function ct(e) {
	let t = e;
	for (let e = 0; t && e < 60; e++) {
		if (t instanceof Element && at.has(t.tagName)) return !0;
		t = t.parentNode ?? (t instanceof ShadowRoot ? t.host : null);
	}
	return !1;
}
var lt = class extends ee {
	constructor() {
		super(), this.wantPlaying = !1, this.hold = "disconnected", this.idleStopped = !1, this.controlsVisible = !0, this.inEditor = !1, this.fullscreen = !1, this.channelState = "idle", this.guideOpen = !1, this.overlayOpen = !1, this.sleepMenuOpen = !1, this.osdUntil = 0, this.osdPending = !1, this.keysSeen = !1, this.layout = f(), this.requestSeq = 0, this.lookupPending = !1, this.lookupPlay = !1, this.numbers = new Ve((e) => this.tuneNumber(e), () => this.refresh(), (e) => this.channels?.numberIsComplete(e) ?? !1), this.mvOn = !1, this.mvAllowed = !1, this.enterMultiview = async (e) => {
			if (e?.stopPropagation(), !this.multiviewAvailable || this.isPreview || this.mvOn) return;
			if (!this.mv) {
				let { defineMultiview: e, MULTIVIEW_TAG: t } = await import("./stream-card-multiview-iC1Ew4We.js");
				if (e({
					LitElement: ee,
					html: d,
					css: a,
					nothing: m,
					svg: u,
					PlaybackSession: Ie,
					icon: p,
					format: K
				}), !this.multiviewAvailable || this.isPreview || this.mvOn || this.mv) return;
				let n = document.createElement(t);
				n.resolve = (e) => this.tileItem(this.requestFor(e), e), n.addEventListener("multiview-exit", (e) => {
					let t = e.detail.item;
					this.exitMultiview(), t ? this.controller.request({
						...t.request,
						target: this.target
					}) : this.evaluate();
				}), n.addEventListener("picker-retry", () => void this.ensureChannels(!0)), this.mv = n, this.configureMultiview();
			}
			if (this.fullscreen) try {
				await document.exitFullscreen?.();
			} catch {}
			let t, n = this.request;
			if (this.source && n && !this.lookupPending) try {
				t = this.tileItem(n, this.currentChannel);
			} catch {
				t = void 0;
			}
			this.overlayOpen = !1, this.ensureChannels(), this.mv.open(t, this.effectiveMuted), this.mvOn = !0, this.mvAllowed = !1, this.evaluate();
		}, this.play = (e) => {
			e?.stopPropagation(), this.session && this.status?.needsGesture ? this.session.resumeFromGesture(this.status.mutedByPolicy) : (this.error = void 0, this.idleStopped = !1, this.stopGen = this.controller.stopCount(this.target), this.request && !this.source && this.applyRequest(this.request, !0), this.wantPlaying = !0, this.remember(), this.evaluate());
		}, this.onPick = (e) => {
			e.stopPropagation();
			let t = e.detail, n = this.guidePlacement, r = n === "overlay" || n === "below" && !this.guideOpen, i = r && this.pickerHasFocus();
			r && (this.overlayOpen = !1), this.playChannel(t), i && this.restoreFocus();
		}, this.togglePicker = (e) => {
			e?.stopPropagation();
			let t = this.uiState === "error" || this.guidePlacement === void 0;
			this.guideOverlays ? this.overlayOpen = t : this.guideOpen = t, t && (this.ensureChannels(), this.guideOverlays || this.updateComplete.then(() => this.renderRoot.querySelector("stream-card-picker")?.scrollIntoView({
				block: "nearest",
				behavior: "smooth"
			}))), this.showControls();
		}, this.closePicker = (e) => {
			e?.stopPropagation();
			let t = this.pickerHasFocus();
			this.guideOverlays ? this.overlayOpen = !1 : this.guideOpen = !1, this.refresh(), t && this.restoreFocus();
		}, this.retryChannels = (e) => {
			e?.stopPropagation(), this.ensureChannels(!0);
		}, this.channelUp = (e) => {
			e?.stopPropagation(), this.channelStep(1);
		}, this.channelDown = (e) => {
			e?.stopPropagation(), this.channelStep(-1);
		}, this.lastChannel = (e) => {
			e?.stopPropagation();
			let t = this.previousEntry;
			t && (this.controller.request({
				target: this.target,
				action: "play",
				channel: t.channel,
				url: t.url,
				title: t.title
			}), this.showControls());
		}, this.pressDigit = (e) => {
			this.channels && !this.isPreview && (this.numbers.press(e), this.showControls());
		}, this.clearDigits = () => this.numbers.clear(), this.commitDigits = () => this.numbers.commit(), this.deleteDigit = () => this.numbers.delete(), this.setVolume = (e) => {
			let t = U(e);
			this.video.volume = t, W(t), t > 0 && this.effectiveMuted && !this.status?.mutedByPolicy ? this.toggleMute() : this.refresh();
		}, this.setSleep = (e) => {
			this.controller.setSleep(this.target, e);
		}, this.extendSleep = (e) => {
			this.controller.extendSleep(this.target, e);
		}, this.keepWatching = () => this.setSleep(0), this.onKeyDown = (e) => {
			if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || this.isPreview) return;
			let t = e.composedPath();
			if (t.some((e) => e instanceof HTMLElement && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.tagName === "SELECT" || e.tagName === "STREAM-CARD-PICKER" || e.isContentEditable))) return;
			let n = !!this.numbers.digits, r = !0;
			/^\d$/.test(e.key) ? this.pressDigit(e.key) : e.key === "Enter" && n ? this.commitDigits() : e.key === "Enter" && !t.some((e) => e instanceof HTMLButtonElement) ? this.togglePicker() : e.key === "Escape" && n ? this.clearDigits() : e.key === "Backspace" ? n ? this.deleteDigit() : this.lastChannel() : e.key === "ArrowUp" || e.key === "PageUp" || e.key === "ChannelUp" ? this.channelUp() : e.key === "ArrowDown" || e.key === "PageDown" || e.key === "ChannelDown" ? this.channelDown() : e.key === "m" || e.key === "M" || e.key === "AudioVolumeMute" ? this.toggleMute() : e.key === "f" || e.key === "F" ? this.toggleFullscreen() : r = !1, r && e.preventDefault();
		}, this.stop = (e) => {
			e?.stopPropagation(), this.controller.stop(this.target);
		}, this.toggleMute = (e) => {
			e?.stopPropagation();
			let t = !this.effectiveMuted;
			this.video.muted = t, this.userMuted = t, !t && this.session?.status.mutedByPolicy && this.session.resumeFromGesture(!0), this.showControls(), this.refresh();
		}, this.unmute = (e) => {
			e?.stopPropagation(), this.userMuted = !1, this.session ? this.session.resumeFromGesture(!0) : this.video.muted = !1, this.refresh();
		}, this.toggleSleepMenu = (e) => {
			e?.stopPropagation(), this.sleepMenuOpen = !this.sleepMenuOpen, this.showControls();
		}, this.onKeySeen = () => {
			this.keysSeen || (this.keysSeen = !0, this.refresh());
		}, this.onFrameClick = () => {
			this.sleepMenuOpen ? (this.sleepMenuOpen = !1, this.showControls()) : this.status?.mutedByPolicy ? this.unmute() : this.controlsVisible && this.status?.state === "playing" ? (this.controlsVisible = !1, clearTimeout(this.controlsTimer), this.refresh()) : this.showControls();
		}, this.toggleFullscreen = async (e) => {
			e?.stopPropagation();
			let t = document, n = this.renderRoot.querySelector(".stage");
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
			let e = this.renderRoot, t = document, n = this.fullscreen;
			this.fullscreen = !!e.fullscreenElement || (t.webkitFullscreenElement ?? null) === this, this.fullscreen !== n && (this.overlayOpen = !1), this.refresh();
		}, this.nowNextFn = (e) => this.nowNext(e), this.preview = !1, this.editMode = !1, this._ui = 0, this.controller = G(), this.video = document.createElement("video"), this.video.playsInline = !0, this.video.setAttribute("playsinline", ""), this.video.setAttribute("webkit-playsinline", ""), this.video.preload = "none", this.video.controls = !1, this.video.muted = !0, this.video.volume = xe() ?? 1, this.video.disableRemotePlayback = !0, this.watcher = new ze(this, this.controller.power, () => this.evaluate(), () => this.onIdle());
	}
	setConfig(e) {
		let t = this.config?.target;
		this.config = pe(e), this.config.guide !== this.guideMode && (this.guideMode = this.config.guide, this.guideOpen = this.config.guide === "open"), t && t !== this.config.target && this.isConnected && (this.controller.unregister(this), this.controller.register(this));
		let n = this.channelListKey();
		n !== this.channelsKey && (this.channels = void 0, this.channelsPromise = void 0, this.channelState = "idle", this.channelsKey = n, this.isConnected && this.ensureChannels()), this.syncGuide(), this.mvOn && !this.multiviewAvailable && this.exitMultiview(), this.configureMultiview(), this.request ? this.applyRequest(this.request, this.lookupPending ? this.lookupPlay : this.wantPlaying) : this.isConnected && this.pickInitialRequest(), this.refresh();
	}
	static async getConfigForm() {
		return (await import("./stream-card-editor-form-hunu1pUw.js")).configForm;
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
		this.mvOn && this.exitMultiview(), this.applyRequest(e, !0);
	}
	stopFromController() {
		if (this.wantPlaying = !1, this.lookupPlay = !1, this.mvOn) {
			let e = this.exitMultiview();
			e && this.applyRequest(e.request, !1);
		}
		this.stopGen = this.controller.stopCount(this.target), this.numbers.clear(), this.remember(), this.evaluate();
	}
	command(e) {
		switch (e.action) {
			case "channel_up": return this.channelUp();
			case "channel_down": return this.channelDown();
			case "last_channel": return this.lastChannel();
			case "volume":
				e.volume !== void 0 && this.setVolume(e.volume / 100);
				return;
			case "mute":
				this.effectiveMuted || this.toggleMute();
				return;
			case "unmute":
				this.status?.mutedByPolicy ? this.userMuted = !1 : this.effectiveMuted && this.toggleMute();
				return;
		}
	}
	sleepChanged() {
		let e = this.sleep;
		e?.warning && this.isConnected && !this.sleepTicker ? this.sleepTicker = setInterval(() => this.sleepChanged(), 1e3) : !e?.warning && this.sleepTicker && (clearInterval(this.sleepTicker), this.sleepTicker = void 0), this.refresh();
	}
	get isPreview() {
		return this.preview || this.editMode || this.inEditor;
	}
	connectedCallback() {
		super.connectedCallback(), this.inEditor = ct(this), this.controller.register(this), this.watcher.attach(), this.addEventListener("keydown", this.onKeySeen), document.addEventListener("fullscreenchange", this.onFullscreenChange), document.addEventListener("webkitfullscreenchange", this.onFullscreenChange), this.pickInitialRequest(), this.stopGen !== void 0 && this.stopGen !== this.controller.stopCount(this.target) && this.stopFromController(), this.ensureChannels(), this.syncGuide(), this.config?.debug && (this.debugTimer = setInterval(() => this.refresh(), 1e3)), this.addEventListener("keydown", this.onKeyDown), this.sleepChanged(), this.evaluate();
	}
	disconnectedCallback() {
		this.watcher.detach(), this.controller.unregister(this), document.removeEventListener("fullscreenchange", this.onFullscreenChange), document.removeEventListener("webkitfullscreenchange", this.onFullscreenChange), clearInterval(this.debugTimer), clearTimeout(this.controlsTimer), this.syncGuide(), clearInterval(this.sleepTicker), this.sleepTicker = void 0, this.removeEventListener("keydown", this.onKeyDown), this.numbers.clear(), clearTimeout(this.tickTimer), this.removeEventListener("keydown", this.onKeySeen), super.disconnectedCallback(), this.evaluate();
	}
	firstUpdated() {
		this.renderRoot.querySelector(".video-host")?.appendChild(this.video);
	}
	updated(e) {
		(e.has("preview") || e.has("editMode")) && (!this.isPreview && this.lookupPending && this.request && this.applyRequest(this.request, this.lookupPlay), this.ensureChannels(), this.syncGuide(), this.evaluate());
	}
	channelListKey() {
		let e = this.config;
		if (e?.channelList && e.m3uUrl) return JSON.stringify([
			e.m3uUrl,
			e.channelGroups,
			e.favourites
		]);
	}
	ensureChannels(e = !1) {
		let t = this.config;
		if (!t?.channelList || !t.m3uUrl || this.isPreview) return Promise.resolve(void 0);
		if (st(), this.channelsPromise && !e) return this.channelsPromise;
		this.channelState = "loading", this.channelMessage = void 0, this.refresh();
		let n = this.channelListKey();
		return this.channelsPromise = l(t.m3uUrl, { force: e }).then((e) => {
			if (n === this.channelListKey()) return this.channels = new c(e, {
				groups: t.channelGroups,
				favourites: t.favourites
			}), this.channelState = "ready", this.channelMessage = this.channels.size ? void 0 : this.channels.total ? K("noGroupMatch", { groups: this.channels.allGroups.join(", ") }) : K("noChannels"), this.refresh(), this.channels;
		}, (e) => {
			n === this.channelListKey() && (this.channelState = "error", this.channelMessage = K("channelsFailed", { detail: e instanceof Error ? e.message : String(e) }), this.channelsPromise = void 0, this.refresh());
		}), this.channelsPromise;
	}
	syncGuide() {
		let e = this.config, t = this.isConnected && !this.isPreview && e?.epg ? e.epgUrl : void 0;
		this.guideUrl !== t && (this.guideUnsub?.(), this.guideUnsub = void 0, this.guide = void 0, this.guideUrl = t, t && import("./stream-card-epg-Bj6O2OjW.js").then(({ guideFeed: e }) => {
			this.guideUrl === t && (this.guide = e(t), this.guideUnsub = this.guide.subscribe(() => this.refresh()));
		}));
	}
	nowNext(e) {
		return e && this.guide ? this.guide.nowNext(e) : void 0;
	}
	get currentChannel() {
		return this.channels?.find(this.source?.channel ?? this.source?.url);
	}
	requestFor(e, t = {}) {
		return e.streamId ? {
			...t,
			channel: e.streamId,
			url: void 0,
			title: t.title ?? e.name
		} : {
			...t,
			url: e.url,
			channel: void 0,
			title: t.title ?? e.name
		};
	}
	pickInitialRequest() {
		if (!this.config) return;
		let e = this.controller.take(this.target);
		e && (e.action ?? "play") === "play" ? this.applyRequest(e, !0) : (this.pickStartingChannel(this.config), e && this.command(e));
	}
	pickStartingChannel(e) {
		if (this.request) return;
		let t = this.controller.lastFor(this.target);
		if (t) {
			this.applyRequest(t, e.autoplay);
			return;
		}
		let n = e.rememberChannel ? N(this.target) : void 0;
		if (n) {
			let t = {
				channel: n.channel,
				url: n.url,
				title: n.title
			};
			this.applyRequest(t, e.autoplay && n.playing !== !1);
		} else e.defaultRequest && this.applyRequest(e.defaultRequest, e.autoplay);
	}
	refresh() {
		this._ui++, this.mv && (this.mv.list = this.channels, this.mv.listState = this.channelState, this.mv.listMessage = this.channelMessage);
	}
	get multiviewAvailable() {
		return !!this.config?.multiview.enabled && this.config.channelList;
	}
	get tileConfig() {
		let e = this.config;
		return e && {
			...e,
			outputProfile: e.multiview.outputProfile
		};
	}
	tileItem(e, t) {
		let n = this.tileConfig;
		if (!n) return;
		let r = {
			channel: e.channel,
			url: e.url,
			type: e.type,
			title: e.title
		}, i = A(r, n);
		return {
			request: r,
			source: {
				...i,
				title: e.title ?? i.title
			},
			channel: t
		};
	}
	configureMultiview() {
		let e = this.mv, t = this.config;
		e && t && (e.maxTiles = t.multiview.maxTiles, e.settings = {
			startTimeoutMs: t.startTimeoutMs,
			maxAttempts: t.maxReconnectAttempts,
			debug: t.debug,
			buffer: t.buffer
		});
	}
	exitMultiview() {
		let e = this.mv;
		if (!e || !this.mvOn) return;
		let t = e.mainItem;
		return this.mvOn = !1, this.mvAllowed = !1, e.halt(), this.watcher.disarmIdle(), this.lastRelease = "multiview-exit", this.refresh(), t;
	}
	applyRequest(e, t) {
		if (!this.config) return;
		let n = ++this.requestSeq;
		this.stopGen = this.controller.stopCount(this.target);
		let r = e.channel;
		if (this.lookupPending = !1, r && !e.url && !O(r) && this.config.channelList) {
			if (this.request = e, this.idleStopped = !1, this.lookupPending = !0, this.lookupPlay = t, this.refresh(), this.isPreview) return;
			this.ensureChannels().then((t) => {
				if (n !== this.requestSeq) return;
				this.lookupPending = !1;
				let i = this.lookupPlay, a = t?.find(r);
				a ? this.applyResolved(this.requestFor(a, e), i) : t ? this.showRequestError(K("channelNotFound", { name: r })) : ce(r) ? this.showRequestError(this.channelMessage ?? K("channelNotFound", { name: r })) : this.applyResolved(e, i);
			});
		} else this.applyResolved(e, t);
	}
	showRequestError(e) {
		this.stopSession("config"), this.source = void 0, this.error = {
			kind: "config",
			message: e,
			detail: e
		}, this.wantPlaying = !1, this.refresh();
	}
	applyResolved(e, t) {
		if (!this.config) return;
		this.request = e, this.idleStopped = !1;
		let n;
		try {
			n = A(e, this.config);
		} catch (e) {
			this.stopSession("config"), this.source = void 0, this.error = {
				kind: "config",
				message: e instanceof S ? e.message : String(e),
				detail: String(e)
			}, this.wantPlaying = !1, this.refresh();
			return;
		}
		this.session && this.session.source.url !== n.url && this.stopSession("switch"), this.source?.url !== n.url && (this.osdPending = !0), this.source = {
			...n,
			title: e.title ?? n.title
		}, this.error = void 0, t && (this.wantPlaying = !0), this.isPreview || ve(this.target, this.recentEntry(e) ?? {}), this.remember(), this.evaluate();
	}
	recentEntry(e) {
		if (e && this.source) return this.source.channel ? {
			channel: this.source.channel,
			title: e.title
		} : {
			url: e.url,
			title: e.title
		};
	}
	remember() {
		let e = this.request;
		this.config?.rememberChannel && this.source && e && !this.isPreview && P(this.target, {
			channel: e.channel,
			url: e.url,
			title: e.title,
			playing: this.wantPlaying
		});
	}
	evaluate() {
		let e = this.mvOn ? this.mv : void 0, t = Le({
			connected: this.isConnected,
			preview: this.isPreview,
			hasSource: !!e || !!this.source,
			wantPlaying: !!e || this.wantPlaying,
			intersecting: this.watcher.intersecting,
			pageVisible: this.watcher.pageVisible,
			screenAwake: this.watcher.screenAwake
		});
		if (this.hold = t, e) {
			this.stopSession("multiview");
			let n = t === null;
			n !== this.mvAllowed && (this.mvAllowed = n, n && this.config && this.config.idleTimeoutMs > 0 ? this.watcher.armIdle(this.config.idleTimeoutMs) : n || this.watcher.disarmIdle()), e.setAllowed(n);
		} else t === null ? this.session || this.startSession() : this.session && this.stopSession(t);
		this.refresh();
	}
	startSession() {
		if (!this.source || !this.config) return;
		this.error = void 0;
		let e = new Ie(this.video, this.source, {
			startTimeoutMs: this.config.startTimeoutMs,
			maxAttempts: this.config.maxReconnectAttempts,
			muted: this.userMuted ?? this.config.muted,
			debug: this.config.debug,
			buffer: this.config.buffer,
			onStatus: (t) => this.onStatus(e, t)
		});
		this.session = e, this.status = e.status, this.showControls(), e.start(), this.config.idleTimeoutMs > 0 && this.watcher.armIdle(this.config.idleTimeoutMs);
	}
	stopSession(e) {
		let t = this.session;
		t && (this.session = void 0, this.status = void 0, this.lastRelease = e, this.watcher.disarmIdle(), t.destroy());
	}
	onStatus(e, t) {
		e === this.session && (this.status = t, t.state === "error" ? (this.error = t.error, this.wantPlaying = !1, this.stopSession("error"), this.evaluate()) : (t.state === "playing" && (this.scheduleHideControls(), this.osdPending && (this.osdPending = !1, this.osdUntil = Date.now() + it)), this.refresh()));
	}
	onIdle() {
		this.controller.stop(this.target), this.idleStopped = !0, this.lastRelease = "idle", this.refresh();
	}
	playChannel(e) {
		this.controller.request(this.requestFor(e, { target: this.target }));
	}
	pickerHasFocus() {
		return this.renderRoot.activeElement?.tagName === "STREAM-CARD-PICKER";
	}
	restoreFocus() {
		this.updateComplete.then(() => {
			(this.renderRoot.querySelector(".ctl-channels") ?? this.renderRoot.querySelector(".frame"))?.focus();
		});
	}
	channelStep(e) {
		if (!this.channels) {
			this.ensureChannels().then((t) => t && this.channelStep(e));
			return;
		}
		let t = this.channels.neighbour(this.currentChannel?.id, e);
		t && this.playChannel(t), this.showControls();
	}
	get currentKey() {
		return this.source?.channel ?? this.request?.url;
	}
	get recents() {
		let e = this.channels;
		return !e || this.isPreview ? [] : L(this.target).map((t) => e.find(t.channel ?? t.url)).filter((e) => !!e);
	}
	get previousEntry() {
		return this.isPreview ? void 0 : R(this.target, this.currentKey);
	}
	get previousChannel() {
		let e = this.previousEntry;
		return e ? this.channels?.find(e.channel ?? e.url) : void 0;
	}
	get numberEntry() {
		let e = this.numbers.digits;
		if (e) return {
			digits: e,
			candidates: this.channels?.numberMatches(e) ?? []
		};
	}
	tuneNumber(e) {
		let t = this.channels?.numberMatches(e, 1)[0];
		t?.number === e && this.playChannel(t);
	}
	get volume() {
		return this.video.volume;
	}
	get sleep() {
		return this.isPreview ? void 0 : this.controller.sleepFor(this.target);
	}
	navView() {
		return this.isPreview ? {} : {
			recents: this.channels ? this.recents : void 0,
			previousChannel: this.previousChannel,
			numberEntry: this.numberEntry,
			volume: this.volume,
			sleep: this.sleep
		};
	}
	navActions() {
		if (this.isPreview) return {};
		let e = this.channelState === "ready" && !!this.channels?.size;
		return {
			lastChannel: this.previousEntry ? this.lastChannel : void 0,
			pressDigit: e ? this.pressDigit : void 0,
			clearDigits: e ? this.clearDigits : void 0,
			commitDigits: e ? this.commitDigits : void 0,
			setVolume: this.setVolume,
			setSleep: this.setSleep,
			extendSleep: this.extendSleep
		};
	}
	get effectiveMuted() {
		return this.session ? this.video.muted : this.userMuted ?? this.config?.muted ?? !1;
	}
	showControls() {
		this.controlsVisible = !0, this.scheduleHideControls(), this.refresh();
	}
	scheduleHideControls() {
		clearTimeout(this.controlsTimer), this.controlsTimer = setTimeout(() => {
			this.status?.state === "playing" && !this.sleepMenuOpen && (this.controlsVisible = !1, this.refresh());
		}, rt);
	}
	multiviewAction() {
		return this.multiviewAvailable && !this.isPreview ? this.enterMultiview : void 0;
	}
	get uiState() {
		return this.isPreview ? "preview" : this.error ? "error" : this.session && this.status ? this.status.state === "error" || this.status.state === "stopped" ? "ready" : this.status.state : !this.source && this.lookupPending ? this.lookupPlay ? "connecting" : "ready" : this.source ? "ready" : "empty";
	}
	get debugInfo() {
		let e = this.session?.getStats();
		return {
			version: y,
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
			mutedByPolicy: this.status?.mutedByPolicy ?? !1,
			needsGesture: this.status?.needsGesture ?? !1,
			muted: this.effectiveMuted,
			mediaInfo: this.status?.mediaInfo,
			notice: this.status?.notice,
			buffering: this.status?.buffering ?? !1,
			error: this.error,
			lastError: this.status?.lastError,
			channels: {
				state: this.channelState,
				count: this.channels?.size ?? 0
			},
			pickerOpen: this.guidePlacement !== void 0,
			guide: this.guidePlacement ?? "hidden",
			volume: this.video.volume,
			sleep: this.sleep,
			typed: this.numbers.digits,
			multiview: this.mvOn ? this.mv?.debugInfo : void 0,
			stats: e
		};
	}
	get hasGuide() {
		return !!this.config?.channelList && !this.isPreview && this.channelState !== "idle";
	}
	get guideOverlays() {
		return this.fullscreen || this.layout === "tv" || this.config?.guide === "off";
	}
	get guidePlacement() {
		if (!this.hasGuide) return;
		let e = this.uiState === "empty";
		return this.guideOverlays ? this.overlayOpen || e ? "overlay" : void 0 : this.guideOpen || e ? "below" : void 0;
	}
	buildView() {
		let e = this.config, t = this.uiState, n = this.currentChannel, r = this.status, i = this.navView(), a = this.guidePlacement, o = Math.round((e?.idleTimeoutMs ?? 0) / 6e4);
		return {
			...i,
			ui: t,
			layout: this.layout,
			channel: n,
			title: this.source?.title ?? n?.name,
			nowNext: n && t !== "preview" ? this.nowNext(n) : void 0,
			chrome: !(t === "playing" && !this.controlsVisible),
			osd: Date.now() < this.osdUntil,
			muted: this.effectiveMuted,
			mutedByPolicy: !!r?.mutedByPolicy && !r.needsGesture,
			needsGesture: !!r?.needsGesture,
			buffering: !!r?.buffering,
			fullscreen: this.fullscreen,
			canStep: this.channelState === "ready" && (this.channels?.size ?? 0) > 1,
			hasGuide: this.hasGuide,
			guideOpen: a !== void 0,
			failures: r?.failures ?? 0,
			maxAttempts: e?.maxReconnectAttempts ?? 0,
			retryAt: r?.retryAt,
			canRetry: !!(this.source || this.request),
			errorMessage: this.error?.message,
			errorDetail: e?.debug ? this.error?.detail : void 0,
			stoppedReason: this.idleStopped ? `Stopped after ${o} minute${o === 1 ? "" : "s"} without interaction` : void 0,
			notice: t === "playing" ? r?.notice : void 0,
			debugText: e?.debug && t !== "preview" && t !== "empty" ? this.debugText() : void 0,
			sleepMenuOpen: this.sleepMenuOpen,
			edit: e ? {
				target: e.target,
				profile: e.outputProfile,
				favourites: e.favourites.length
			} : void 0,
			now: Date.now()
		};
	}
	buildActions() {
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
			multiview: this.multiviewAction()
		};
	}
	renderPicker(e, t, n) {
		return d`<stream-card-picker
      class=${n ? "overlay" : "panel"}
      .list=${this.channels}
      .state=${this.channelState === "idle" ? "loading" : this.channelState}
      .message=${this.channelMessage}
      .currentId=${this.currentChannel?.id}
      .closable=${e.ui !== "empty"}
      .recents=${e.recents ?? []}
      .nowNext=${this.nowNextFn}
      .now=${e.now}
      .numberEntry=${e.numberEntry}
      .pressDigit=${t.pressDigit}
      .clearDigits=${t.clearDigits}
      .layout=${e.layout}
      @click=${(e) => e.stopPropagation()}
      @channel-pick=${this.onPick}
      @picker-close=${this.closePicker}
      @picker-retry=${this.retryChannels}
    ></stream-card-picker>`;
	}
	render() {
		let e = this.config?.aspectRatio ?? "16 / 9", t = this.buildView(), n = this.buildActions(), r = this.guidePlacement, i = this.mvOn && this.mv && !this.isPreview ? this.mv : void 0;
		return this.scheduleTick(t), d`
      <ha-card class=${t.ui === "preview" ? "editing" : ""}>
        <div
          class="stage ${t.layout === "tv" ? "tv" : ""} ${t.fullscreen ? "fs" : ""}"
          data-layout=${t.layout}
          data-ui=${t.ui}
          ?hidden=${!!i}
        >
          <div
            class="frame"
            data-state=${t.ui}
            style="aspect-ratio: ${e}"
            tabindex="0"
            aria-label=${t.title ? `Stream card: ${t.title}` : "Stream card"}
            @click=${this.onFrameClick}
          >
            <div class="video-host"></div>
            ${t.ui !== "preview" && t.ui !== "empty" ? d`<div class="sheen ${t.chrome ? "" : "hidden"}"></div>` : m}
            ${Xe(t)} ${Ze(t)} ${Qe(t, n)}
            ${t.notice ? d`<div class="notice" role="status">${t.notice}</div>` : m}
            ${t.debugText ? d`<div class="debug">${t.debugText}</div>` : m}
            ${nt(t, this.keysSeen)}
            ${r === "overlay" ? this.renderPicker(t, n, !0) : m}
          </div>
          ${Ye(t)} ${et(t, n)}
        </div>
        ${r === "below" && !i ? this.renderPicker(t, n, !1) : m}
        ${i ?? m}
      </ha-card>
    `;
	}
	scheduleTick(e) {
		if (clearTimeout(this.tickTimer), !this.isConnected || e.ui === "preview") return;
		let t = e.ui === "reconnecting" && e.retryAt || e.sleep || e.osd, n = e.nowNext?.now || e.layout === "tv";
		(t || n) && (this.tickTimer = setTimeout(() => this.refresh(), t ? 1e3 : 3e4));
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
			`channels ${e.channels.state} (${e.channels.count})`,
			`muted ${e.muted}${e.mutedByPolicy ? " (autoplay policy)" : ""}`
		].filter(Boolean).join("\n");
	}
};
Z = lt, Z.styles = Ue, Z.properties = {
	preview: { type: Boolean },
	editMode: { type: Boolean },
	_ui: { state: !0 }
};
//#endregion
//#region src/index.ts
var Q = G();
Q.counters ?? (Q.counters = Y), customElements.get("stream-card") || customElements.define(v, lt);
var $ = window;
$.customCards = $.customCards ?? [], $.customCards.some((e) => e.type === "stream-card") || $.customCards.push({
	type: v,
	name: ae,
	description: "Plays Dispatcharr IPTV channels and releases the stream when it is hidden.",
	preview: !1,
	documentationURL: "https://github.com/Dec64/ha-video-card"
}), console.info(`%c STREAM-CARD %c ${y} `, "color:#fff;background:#1565c0;font-weight:700", "color:#1565c0;background:#fff");
//#endregion

//# sourceMappingURL=stream-card.js.map