import { a as e, i as t, n, o as r, r as i } from "./stream-card-video-lock-8Ql6vIdM.js";
import { C as a, S as o, T as s, _ as c, a as l, b as u, f as d, g as ee, h as f, i as p, l as m, m as te, n as ne, o as re, p as ie, r as ae, t as oe, v as h, w as g } from "./stream-card-view-eVPgQdpV.js";
//#region src/const.ts
var se = "stream-card", ce = "Stream Card", _ = "2.2.0-beta.1", v = "__streamCard", y = "stream-card-power", b = "stream-card-network", x = class extends Error {
	constructor(...e) {
		super(...e), this.name = "ConfigError";
	}
}, le = 6e4;
function S(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function C(e, t) {
	let n = e[t];
	if (n != null && n !== "") {
		if (typeof n != "string" && typeof n != "number") throw new x(`"${t}" must be text`);
		return String(n).trim();
	}
}
function w(e, t, n) {
	let r = e[t];
	if (r == null) return n;
	if (typeof r != "boolean") throw new x(`"${t}" must be true or false`);
	return r;
}
function T(e, t, n, r) {
	let i = e[t];
	if (i == null || i === "") return n;
	let a = typeof i == "string" ? Number(i) : i;
	if (typeof a != "number" || !Number.isFinite(a) || a < r) throw new x(`"${t}" must be a number of at least ${r}`);
	return a;
}
function ue(e, t) {
	let n = e[t];
	return n == null || n === "" ? [] : (Array.isArray(n) ? n : [n]).map((e) => {
		if (typeof e != "string" && typeof e != "number") throw new x(`"${t}" must be a list of text`);
		return String(e).trim();
	}).filter(Boolean);
}
var de = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function E(e) {
	return de.test(e.trim());
}
function fe(e) {
	let t = e.trim();
	return !E(t) && (/\s/.test(t) || /^\d+$/.test(t));
}
function pe(e) {
	let t;
	try {
		t = new URL(e);
	} catch {
		throw new x("\"dispatcharr_url\" must be a full URL, e.g. https://dispatcharr.example");
	}
	if (t.protocol !== "http:" && t.protocol !== "https:") throw new x("\"dispatcharr_url\" must start with http:// or https://");
	return e.replace(/\/+$/, "");
}
function me(e) {
	if (!e) return "16 / 9";
	let t = /^\s*(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)\s*$/.exec(e);
	if (t && Number(t[1]) > 0 && Number(t[2]) > 0) return `${t[1]} / ${t[2]}`;
	let n = Number(e);
	if (Number.isFinite(n) && n > 0) return String(n);
	throw new x("\"aspect_ratio\" must look like \"16:9\"");
}
function he(e) {
	if (e === void 0 || e === "auto" || e === "low" || e === "stable") return e ?? "auto";
	throw new x("\"buffer\" must be \"auto\", \"low\" or \"stable\"");
}
function D(e, t, n) {
	let r = C(e, t);
	if (r !== void 0 && !/^\d+$/.test(r)) throw new x(`"${n}" must be the numeric ID of a Dispatcharr output profile`);
	return r;
}
function ge(e, t) {
	if (e == null || typeof e == "boolean") return {
		enabled: e === !0,
		maxTiles: 2,
		outputProfile: t
	};
	if (!S(e)) throw new x("\"multiview\" must be true, false or an object, e.g. { enabled: true }");
	let n = T(e, "max_tiles", 2, 2);
	if (!Number.isInteger(n) || n > 4) throw new x("\"max_tiles\" must be a whole number from 2 to 4");
	return {
		enabled: w(e, "enabled", !1),
		maxTiles: n,
		outputProfile: D(e, "output_profile", "multiview.output_profile") ?? t
	};
}
var O = "Source";
function _e(e) {
	let t = /(\d{3,4})\s*p\b/i.exec(e);
	if (t) return Number(t[1]);
	if (/\b(4k|uhd)\b/i.test(e)) return 2160;
	if (/\b(2k|qhd)\b/i.test(e)) return 1440;
}
function ve(e, t) {
	if (e == null || Array.isArray(e) && !e.length) return [{
		name: O,
		outputProfile: t
	}];
	if (!Array.isArray(e)) throw new x("\"qualities\" must be a list, e.g. [{ name: 720p, output_profile: 12 }]");
	let n = [], r = /* @__PURE__ */ new Set([O.toLowerCase(), "auto"]);
	for (let t of e) {
		if (!S(t)) throw new x("Each of \"qualities\" needs a name and an output_profile");
		let e = C(t, "name"), i = D(t, "output_profile", "qualities.output_profile");
		if (!e || !i) throw new x("Each of \"qualities\" needs a name and an output_profile");
		if (r.has(e.toLowerCase())) throw new x(`"qualities" can't use the name "${e}" twice (Source and Auto are taken)`);
		r.add(e.toLowerCase());
		let a = t.height === void 0 ? _e(e) : T(t, "height", 0, 1);
		n.push({
			name: e,
			outputProfile: i,
			height: a
		});
	}
	return n.sort((e, t) => (t.height ?? 0) - (e.height ?? 0)), [{ name: O }, ...n];
}
function ye(e) {
	if (e !== void 0) {
		if (!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(e)) throw new x("\"switch_source\" must be an HA action such as rest_command.dispatcharr_next_stream");
		return e;
	}
}
function be(e) {
	if (!S(e)) throw new x("Card config must be an object");
	let t = e, n = C(t, "dispatcharr_url"), r = D(t, "output_profile", "output_profile"), i = C(t, "url_template") ?? "{base}/proxy/ts/stream/{channel}";
	if (!i.includes("{channel}")) throw new x("\"url_template\" must contain {channel}");
	let a = t.reconnect;
	if (a !== void 0 && !S(a)) throw new x("\"reconnect\" must be an object, e.g. { max_attempts: 5 }");
	let o = C(t, "m3u_url");
	if (o) try {
		new URL(o);
	} catch {
		throw new x("\"m3u_url\" must be a full URL");
	}
	let s = C(t, "epg_url");
	if (s) try {
		new URL(s);
	} catch {
		throw new x("\"epg_url\" must be a full URL");
	}
	let c = C(t, "chrome") ?? "standard";
	if (c !== "standard" && c !== "app" && c !== "embed") throw new x("\"chrome\" must be standard, app or embed");
	let l = C(t, "guide") ?? "open";
	if (l !== "open" && l !== "closed" && l !== "off") throw new x("\"guide\" must be open, closed or off");
	let u = C(t, "channel"), d = C(t, "url"), ee = C(t, "title"), f = u || d ? {
		channel: u,
		url: d,
		title: ee
	} : void 0, p = {
		target: C(t, "target") ?? "default",
		dispatcharrUrl: n ? pe(n) : void 0,
		outputProfile: r,
		urlTemplate: i,
		defaultRequest: f,
		autoplay: w(t, "autoplay", !0),
		muted: w(t, "muted", !1),
		aspectRatio: me(C(t, "aspect_ratio")),
		idleTimeoutMs: T(t, "idle_timeout", 0, 0) * le,
		startTimeoutMs: T(t, "start_timeout", 20, 1) * 1e3,
		maxReconnectAttempts: a ? T(a, "max_attempts", 5, 0) : 5,
		keepTrying: a ? w(a, "keep_trying", !1) : !1,
		pictureCheck: w(t, "picture_check", !0),
		switchSource: ye(C(t, "switch_source")),
		debug: w(t, "debug", !1),
		channelList: w(t, "channel_list", !!(n || o)),
		m3uUrl: o ?? (n ? `${pe(n)}/output/m3u` : void 0),
		channelGroups: ue(t, "channel_groups"),
		favourites: ue(t, "favourites"),
		rememberChannel: w(t, "remember_channel", !0),
		buffer: he(C(t, "buffer")),
		epg: !1,
		epgUrl: s ?? (n ? `${pe(n)}/output/epg?days=1` : void 0),
		guide: l,
		chrome: c,
		settings: w(t, "settings", !0),
		multiview: ge(t.multiview, r),
		qualities: ve(t.qualities, r)
	};
	if (p.qualities.length > 1 && (p.formatProfile = r), p.epg = w(t, "epg", p.channelList && !!p.epgUrl), p.epg && !p.channelList) throw new x("\"epg\" needs the channel list (\"channel_list\" can't be false)");
	if (p.epg && !p.epgUrl) throw new x("\"epg\" needs \"dispatcharr_url\" or \"epg_url\"");
	if (p.channelList && !p.m3uUrl) throw new x("\"channel_list\" needs \"dispatcharr_url\" or \"m3u_url\"");
	let m = f?.channel;
	return f && m && (!p.channelList || E(m)) && k(f, p), p;
}
function xe(e) {
	let t = e.split(/[?#]/)[0].toLowerCase();
	return t.endsWith(".m3u8") || t.endsWith(".mp4") || t.endsWith(".webm") ? "native" : "mpegts";
}
function k(e, t) {
	if (e.url) {
		let t;
		try {
			t = new URL(e.url, document.baseURI);
		} catch {
			throw new x(`"${e.url}" is not a valid URL`);
		}
		return {
			url: t.href,
			type: e.type ?? xe(t.href),
			title: e.title
		};
	}
	if (!e.channel) throw new x("Nothing to play: set \"channel\" or \"url\"");
	let n = String(e.channel).trim();
	if (!n || /[/?#\s]/.test(n)) throw new x(`"${n}" is not a valid channel ID`);
	if (t.urlTemplate.includes("{base}") && !t.dispatcharrUrl) throw new x("Set \"dispatcharr_url\" on the card to play channels");
	let r = t.urlTemplate.replaceAll("{base}", t.dispatcharrUrl ?? "").replaceAll("{channel}", encodeURIComponent(n)), i;
	try {
		i = new URL(r);
	} catch {
		throw new x(`"url_template" produced an invalid URL: ${r}`);
	}
	return t.outputProfile && !i.searchParams.has("output_profile") && i.searchParams.set("output_profile", t.outputProfile), {
		url: i.href,
		type: e.type ?? "mpegts",
		title: e.title,
		channel: n
	};
}
var Se = /* @__PURE__ */ new Set([
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
function Ce(e) {
	let t = typeof e == "string" && e.trim() ? Number(e) : e;
	return typeof t == "number" && Number.isFinite(t) ? t : void 0;
}
function we(e) {
	if (!S(e)) return;
	let t = (t) => {
		let n = e[t];
		if (typeof n == "string" && n.trim()) return n.trim();
		if (typeof n == "number") return String(n);
	}, n = t("action");
	if (n !== void 0 && !Se.has(n)) return;
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
			let t = Ce(e.sleep);
			if (t === void 0 || t < 0) return;
			i.sleep = t;
		}
		if (i.action === "volume") {
			let t = Ce(e.volume);
			if (t === void 0 || t < 0 || t > 100) return;
			i.volume = t;
		}
		return i;
	}
}
function Te(e) {
	try {
		let t = /\/proxy\/ts\/stream\/([^/?#]+)/.exec(new URL(e).pathname);
		return t ? decodeURIComponent(t[1]) : void 0;
	} catch {
		return;
	}
}
//#endregion
//#region src/memory.ts
var Ee = "stream-card:last:";
function A(e) {
	try {
		let t = localStorage.getItem(Ee + e);
		if (!t) return;
		let n = JSON.parse(t);
		return typeof n == "object" && n && (n.channel || n.url) ? n : void 0;
	} catch {
		return;
	}
}
function De(e, t) {
	try {
		localStorage.setItem(Ee + e, JSON.stringify(t));
	} catch {}
}
function Oe(e) {
	let t = A(e);
	t?.playing && De(e, {
		...t,
		playing: !1
	});
}
//#endregion
//#region src/recents.ts
var ke = "stream-card:recent:", j = (e) => e.channel ?? e.url;
function M(e) {
	try {
		let t = localStorage.getItem(ke + e), n = t ? JSON.parse(t) : [];
		return Array.isArray(n) ? n.filter((e) => typeof e == "object" && !!e && !!j(e)) : [];
	} catch {
		return [];
	}
}
function Ae(e, t) {
	let n = j(t), r = M(e);
	if (!n || r[0] && j(r[0]) === n) return r;
	let i = [{
		channel: t.channel,
		url: t.url,
		title: t.title
	}, ...r.filter((e) => j(e) !== n)].slice(0, 8);
	try {
		localStorage.setItem(ke + e, JSON.stringify(i));
	} catch {}
	return i;
}
function je(e, t) {
	return M(e).find((e) => j(e) !== t);
}
//#endregion
//#region src/sleep-timer.ts
var N = "stream-card:sleep:", Me = 6e4, Ne = 6e4, Pe = 2 ** 31 - 1, Fe = class {
	constructor(e, t, n = () => Date.now()) {
		this.onExpire = e, this.onChange = t, this.now = n, this.timers = /* @__PURE__ */ new Map(), this.loaded = /* @__PURE__ */ new Set();
	}
	set(e, t) {
		this.load(e), t > 0 ? this.arm(e, this.now() + t * Ne) : this.cancel(e);
	}
	extend(e, t) {
		if (this.load(e), !(t > 0)) return;
		let n = this.timers.get(e);
		this.arm(e, Math.max(n?.endsAt ?? 0, this.now()) + t * Ne);
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
			warning: n <= Me
		};
	}
	load(e) {
		if (this.loaded.has(e)) return;
		this.loaded.add(e);
		let t;
		try {
			let n = localStorage.getItem(N + e);
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
		let r = n > 6e4 ? n - Me : n;
		t.handle = setTimeout(() => {
			this.timers.get(e) === t && (t.endsAt - this.now() > 0 && this.onChange(e), this.schedule(e, t));
		}, Math.min(r, Pe));
	}
	save(e, t) {
		try {
			t === void 0 ? localStorage.removeItem(N + e) : localStorage.setItem(N + e, String(t));
		} catch {}
	}
}, Ie = "stream-card:volume";
function P(e) {
	return Number.isFinite(e) ? Math.min(1, Math.max(0, e)) : 1;
}
function Le() {
	try {
		let e = localStorage.getItem(Ie);
		if (e === null) return;
		let t = Number(e);
		return Number.isFinite(t) ? P(t) : void 0;
	} catch {
		return;
	}
}
function Re(e) {
	try {
		localStorage.setItem(Ie, String(P(e)));
	} catch {}
}
var ze = class {
	constructor(e = window) {
		this.win = e, this.version = _, this.power = {
			screenOn: !0,
			screensaver: !1
		}, this.pending = /* @__PURE__ */ new Map(), this.stops = /* @__PURE__ */ new Map(), this.last = /* @__PURE__ */ new Map(), this.cards = /* @__PURE__ */ new Set(), this.installed = !1, this.sleep = new Fe((e) => this.stop(e), (e) => {
			for (let t of this.cards) t.target === e && t.sleepChanged();
		}), this.onLlCustom = (e) => {
			let t = e.detail;
			if (!t || !("stream_card" in t)) return;
			let n = we(t.stream_card);
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
		e.action === "volume" && e.volume !== void 0 && Re(e.volume / 100);
		let n = [...this.cards].filter((e) => e.target === t && e.isLive);
		if (n.length) for (let t of n) t.command(e);
		else if (e.action === "last_channel") {
			let e = je(t, A(t)?.channel);
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
		this.pending.delete(e), this.last.delete(e), this.stops.set(e, this.stopCount(e) + 1), Oe(e), this.sleep.cancel(e);
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
		let t = (e) => `window.${v} && window.${v}.onFullyEvent(${JSON.stringify(e)})`;
		for (let n of [
			"screenOn",
			"screenOff",
			"onScreensaverStart",
			"onScreensaverStop",
			"networkReconnect"
		]) try {
			e.bind(n, t(n));
		} catch (e) {
			console.warn("[stream-card] Could not bind Fully Kiosk event", n, e);
		}
	}
	onFullyEvent(e) {
		if (e === "networkReconnect") this.win.dispatchEvent(new CustomEvent(b));
		else {
			if (e === "screenOn") this.power.screenOn = !0;
			else if (e === "screenOff") this.power.screenOn = !1;
			else if (e === "onScreensaverStart") this.power.screensaver = !0;
			else if (e === "onScreensaverStop") this.power.screensaver = !1;
			else return;
			this.win.dispatchEvent(new CustomEvent(y, { detail: { ...this.power } }));
		}
	}
};
function Be(e = window) {
	let t = e, n = t[v];
	return n || (n = new ze(e), t[v] = n), n.install(), n;
}
//#endregion
//#region src/engines/native-engine.ts
var Ve = class {
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
}, He = async (e, { debug: t, buffer: n = "auto" }) => {
	if (e === "native") return new Ve();
	let { MpegtsEngine: r } = await import("./stream-card-mpegts-engine-BRiGUfiI.js");
	return new r(t, n);
}, Ue = {
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
	pictureBlack: "The picture keeps going black, even after reconnecting (and switching source, if switch_source is set). The channel may be off air.",
	noVideo: "No picture in this stream: its video track is missing or uses a codec the player skips.",
	channelsFailed: "Couldn't load the channel list from Dispatcharr ({detail}). Check dispatcharr_url, or m3u_url if you set one.",
	channelNotFound: "No channel called \"{name}\" in the channel list.",
	noChannels: "The channel list is empty.",
	multiviewStruggling: "This device can't keep up with this many tiles. Use fewer tiles, or a lower-resolution output profile for multiview.",
	noGroupMatch: "None of the channel_groups match a Dispatcharr group. Groups in Dispatcharr: {groups}."
};
function F(e, t = {}) {
	return Ue[e].replace(/\{(\w+)\}/g, (e, n) => String(t[n] ?? `{${n}}`));
}
var We = [
	[/^avc1|^avc3/i, "H.264"],
	[/^hvc1|^hev1/i, "HEVC (H.265)"],
	[/^av01/i, "AV1"],
	[/^mp4a\.40/i, "AAC"],
	[/^mp4a\.6b|^mp3/i, "MPEG audio (MP2/MP3)"],
	[/^ac-3/i, "AC-3 (Dolby Digital)"],
	[/^ec-3/i, "E-AC-3 (Dolby Digital Plus)"],
	[/^opus/i, "Opus"]
];
function I(e) {
	for (let [t, n] of We) if (t.test(e)) return n;
	return e;
}
function Ge() {
	let e = globalThis, t = e.MediaSource ?? e.ManagedMediaSource;
	return t ? (e) => t.isTypeSupported(e) : void 0;
}
function Ke(e, t = Ge()) {
	if (t) {
		if (e.videoCodec && !t(`video/mp4; codecs="${e.videoCodec}"`)) return {
			kind: "codec",
			message: F("codecVideo", { codec: I(e.videoCodec) }),
			detail: `video ${e.videoCodec} not supported`
		};
		if (e.audioCodec && !t(`audio/mp4; codecs="${e.audioCodec}"`)) return {
			kind: "codec",
			message: F("codecAudio", { codec: I(e.audioCodec) }),
			detail: `audio ${e.audioCodec} not supported`
		};
	}
}
function qe(e) {
	switch (e.kind) {
		case "network":
		case "stall":
		case "ended":
		case "media": return !0;
		case "http": return e.status === void 0 || e.status >= 500 || e.status === 408 || e.status === 429;
		default: return !1;
	}
}
function L(e, t = {}) {
	let n = {
		kind: e.kind,
		detail: e.detail,
		status: e.status
	};
	switch (e.kind) {
		case "cors": return {
			...n,
			message: F("cors")
		};
		case "network": return {
			...n,
			message: F("network")
		};
		case "http": return e.status === 404 ? {
			...n,
			message: F("http404")
		} : e.status === 401 || e.status === 403 ? {
			...n,
			message: F("httpDenied", { status: e.status })
		} : {
			...n,
			message: F("http", { status: e.status ?? "?" })
		};
		case "timeout": return {
			...n,
			message: F("timeout", { seconds: Math.round((t.startTimeoutMs ?? 0) / 1e3) })
		};
		case "codec": return e.codec && e.track ? {
			...n,
			message: F(e.track === "audio" ? "codecAudio" : "codecVideo", { codec: I(e.codec) })
		} : {
			...n,
			message: F("codec")
		};
		case "unsupported-device": return {
			...n,
			message: F("unsupportedDevice")
		};
		case "config": return {
			...n,
			message: F("config", { detail: e.detail })
		};
		case "stall":
		case "ended":
		case "media": return t.attempts ? {
			...n,
			message: F("gaveUp", { attempts: t.attempts })
		} : {
			...n,
			message: F("media")
		};
	}
}
async function Je(e, t = 5e3) {
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
var Ye = 12e3, Xe = 15e3, R = 32, z = 18, Ze = .6, Qe = 16, $e = 40;
function et(e) {
	try {
		let t = e.getVideoPlaybackQuality?.();
		if (t) return t.totalVideoFrames;
	} catch {}
	let t = e.webkitDecodedFrameCount;
	return typeof t == "number" ? t : void 0;
}
var tt = class {
	constructor() {
		this.unavailable = !1;
	}
	sample(e) {
		if (this.unavailable) return null;
		try {
			if (this.ctx === void 0) {
				let e = document.createElement("canvas");
				e.width = R, e.height = z, this.ctx = e.getContext("2d", { willReadFrequently: !0 });
			}
			if (!this.ctx) return this.unavailable = !0, null;
			this.ctx.drawImage(e, 0, 0, R, z);
			let t = this.ctx.getImageData(0, 0, R, z).data, n = /* @__PURE__ */ new Uint8Array(576), r = 0, i = 0;
			for (let e = 0; e < n.length; e++) {
				let a = t[e * 4] * 77 + t[e * 4 + 1] * 150 + t[e * 4 + 2] * 29 >> 8;
				n[e] = a, r += a, a > i && (i = a);
			}
			return {
				luma: n,
				mean: r / n.length,
				max: i
			};
		} catch {
			return this.unavailable = !0, null;
		}
	}
};
function nt(e, t) {
	let n = 0;
	for (let r = 0; r < e.length; r++) n += Math.abs(e[r] - t[r]);
	return n / e.length;
}
var rt = class {
	constructor() {
		this.off = /* @__PURE__ */ new Set();
	}
	reset() {
		this.last = void 0, this.sameSince = this.blackSince = this.framesSince = this.frames = void 0;
	}
	check(e, t, n) {
		return t !== void 0 && t !== this.frames && (this.frames = t, this.framesSince = n), e && (e.mean < Qe && e.max < $e ? (this.blackSince ?? (this.blackSince = n), this.sameSince = void 0, this.last = void 0) : (this.blackSince = void 0, this.last && nt(this.last, e.luma) < Ze ? this.sameSince ?? (this.sameSince = n) : this.sameSince = void 0, this.last = e.luma)), !this.off.has("black") && this.blackSince !== void 0 && n - this.blackSince >= 15e3 ? "black" : !this.off.has("frozen") && (this.sameSince !== void 0 && n - this.sameSince >= 12e3 || this.framesSince !== void 0 && n - this.framesSince >= 12e3 && this.blackSince === void 0) ? "frozen" : null;
	}
}, B = "stream-card:quality-auto", V = 36e5, it = 24 * V, H = [
	V / 2,
	2 * V,
	8 * V
], at = {
	step: 0,
	until: 0,
	strikes: 0,
	since: 0
};
function U() {
	try {
		let e = localStorage.getItem(B);
		if (!e) return { ...at };
		let t = JSON.parse(e), n = (e) => typeof e == "number" && Number.isFinite(e) ? e : 0;
		return {
			step: Math.max(0, Math.round(n(t.step))),
			until: n(t.until),
			strikes: Math.max(0, n(t.strikes)),
			since: n(t.since)
		};
	} catch {
		return { ...at };
	}
}
function ot(e) {
	try {
		e.step === 0 && e.strikes === 0 ? localStorage.removeItem(B) : localStorage.setItem(B, JSON.stringify(e));
	} catch {}
}
function st(e, t, n, r) {
	let i = r - e.since > it, a = i ? 1 : e.strikes + 1, o = H[Math.min(a, H.length) - 1];
	return {
		step: Math.max(0, Math.min(n, t + 1)),
		until: r + o,
		strikes: a,
		since: i ? r : e.since
	};
}
function ct(e, t) {
	if (e.step === 0 || t < e.until) return e;
	let n = t - e.since > it ? 0 : e.strikes;
	return {
		...e,
		step: e.step - 1,
		until: t + H[0],
		strikes: n
	};
}
var lt = "stream-card:channel-info";
function ut() {
	try {
		let e = JSON.parse(localStorage.getItem(lt) ?? "{}");
		return e && typeof e == "object" && !Array.isArray(e) ? e : {};
	} catch {
		return {};
	}
}
function W(e) {
	let t = ut()[e];
	if (!t || typeof t != "object") return {};
	let n = {};
	return typeof t.h == "number" && t.h > 0 && (n.h = t.h), t.fmt === !0 && (n.fmt = !0), t.noSource === !0 && (n.noSource = !0), n;
}
function G(e, t) {
	let n = ut(), r = {
		...W(e),
		...t
	};
	delete n[e], n[e] = r;
	let i = Object.keys(n);
	for (let e of i.slice(0, Math.max(0, i.length - 300))) delete n[e];
	try {
		localStorage.setItem(lt, JSON.stringify(n));
	} catch {}
	return r;
}
function dt(e, t, n) {
	let r = t.h, i = e.map((e, t) => ({
		name: e.name,
		rung: t,
		outputProfile: e.outputProfile,
		height: e.height
	})).filter((e) => e.rung === 0 || !r || !e.height || e.height <= r * .9);
	return t.fmt && n && i[0] && (i[0] = {
		...i[0],
		outputProfile: n
	}), i;
}
function ft(e, t, n, r) {
	let i;
	i = t && t !== "auto" ? Math.max(0, e.findIndex((e) => e.name === t)) : n.step;
	let a = r.noSource && e.length > 1 ? 1 : 0;
	return Math.max(a, Math.min(i, e.length - 1));
}
var pt = 6e5;
function mt(e) {
	if (e.length < 5) return !1;
	let t = 0, n = 0;
	for (let r of e.slice(-5)) t += r.decoded, n += r.dropped;
	let r = Math.max(t, n);
	return r >= 100 && n / r > .2;
}
//#endregion
//#region src/session.ts
var ht = [
	1e3,
	2e3,
	4e3,
	8e3,
	15e3
], gt = 6e4, _t = 6e5, vt = /* @__PURE__ */ new Set([
	"network",
	"stall",
	"ended",
	"media",
	"http",
	"timeout"
]), yt = .3, K = [
	1.5,
	3,
	5,
	8,
	12
], bt = 1.05, xt = .95, St = 15;
function q(e) {
	return Math.max(0, Math.min(K.length - 1, Math.round(e ?? 0) || 0));
}
var Ct = 2e4;
function J(e) {
	let t = e.buffered, n = e.currentTime;
	for (let e = 0; e < t.length; e++) {
		if (t.end(e) <= n) continue;
		let r = Math.max(n, t.start(e)), i = t.end(e);
		for (let n = e + 1; n < t.length && t.start(n) - i <= 3; n++) i = t.end(n);
		return i - r;
	}
	return 0;
}
function wt(e) {
	let t = e.buffered, n = e.currentTime;
	for (let r = 0; r < t.length; r++) {
		let i;
		if (n < t.start(r)) i = t.start(r);
		else if (n <= t.end(r)) {
			if (t.end(r) - n >= .15 || r + 1 >= t.length) return !1;
			i = t.start(r + 1);
		} else continue;
		return i - n > 3.15 ? !1 : (e.currentTime = i + .01, !0);
	}
	return !1;
}
function Tt(e) {
	let t = e.buffered;
	return t.length ? t.end(t.length - 1) : 0;
}
var Y = {
	sessions: 0,
	engines: 0
}, Et = class {
	constructor(e, t, n) {
		this.video = e, this.source = t, this.opts = n, this.status = {
			state: "connecting",
			failures: 0,
			mutedByPolicy: !1,
			needsGesture: !1
		}, this.attemptId = 0, this.disposed = !1, this.gotData = !1, this.lastTime = -1, this.lastProgressAt = 0, this.playingSince = 0, this.holding = !1, this.holdIsStart = !1, this.holdStartedAt = 0, this.holdBufferedEnd = 0, this.sampler = new tt(), this.watch = new rt(), this.lastSampleAt = 0, this.pictureEvents = [], this.lastSwitchAt = 0, this.switching = !1, this.levelSince = Date.now(), this.rate = 1, this.frameSamples = [], this.lastFrameSampleAt = 0, this.dryRuns = [], this.struggled = !1, this.createEngine = n.createEngine ?? He, this.diagnose = n.diagnose ?? Je, this.level = q(n.autoLevel), Y.sessions++;
	}
	get buffer() {
		return this.opts.buffer ?? "low";
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
		this.gotData = !1, this.lastTime = -1, this.lastProgressAt = 0, this.playingSince = 0, this.holding = !1, this.watch.reset(), this.lastSampleAt = 0, this.resetFrameSamples(), this.setRate(1), this.video.muted = this.opts.muted || this.status.mutedByPolicy, this.update({
			state: this.status.failures > 0 ? "reconnecting" : "connecting",
			notice: void 0,
			retryAt: void 0,
			buffering: !1
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
			this.isCurrent(e) && (this.watchdog = setInterval(() => this.tick(e), 500), this.reserved ? this.startHold(!0) : await this.play(e));
		}
	}
	get reserved() {
		return (this.opts.buffer === "stable" || this.opts.buffer === "auto") && this.source.type === "mpegts";
	}
	get auto() {
		return this.opts.buffer === "auto" && this.source.type === "mpegts";
	}
	get startTarget() {
		return this.auto ? K[this.level] : 8;
	}
	get resumeTarget() {
		return this.auto ? K[this.level] : 5;
	}
	get autoInfo() {
		return this.auto ? {
			level: this.level,
			target: K[this.level],
			rate: this.rate
		} : void 0;
	}
	setRate(e) {
		if (this.rate !== e || this.video.playbackRate !== e) {
			this.rate = e;
			try {
				this.video.playbackRate = e;
			} catch {}
		}
	}
	setLevel(e, t) {
		let n = q(e);
		this.levelSince = Date.now(), n !== this.level && (this.level = n, this.opts.onAutoLevel?.(n), this.opts.onHealth?.("buffer-level", `${K[n]} s (${t})`));
	}
	commitRaise() {
		this.raisedFrom !== void 0 && (this.raisedFrom = void 0, this.levelSince = Date.now(), this.opts.onAutoLevel?.(this.level), this.opts.onHealth?.("buffer-level", `${K[this.level]} s (ran dry)`));
	}
	steer(e) {
		let t = this.video, n = K[this.level], r = J(t);
		if (r > n + St) {
			t.currentTime = t.currentTime + r - n, this.lastTime = -1;
			return;
		}
		let i = 1;
		r > n + 2 || this.rate > 1 && r > n + .5 ? i = bt : (r < n * .5 || this.rate < 1 && r < n * .9) && (i = xt), this.setRate(i), this.level > 0 && e - this.levelSince > 3e5 && this.setLevel(this.level - 1, "smooth for 5 min");
	}
	startHold(e) {
		if (this.holding = !0, this.holdIsStart = e, this.holdStartedAt = Date.now(), this.holdBufferedEnd = Tt(this.video), this.lastProgressAt = Date.now(), this.watch.reset(), this.resetFrameSamples(), !e && (this.video.pause(), this.setRate(1), this.opts.onHealth?.("buffering", "reserve ran dry"), this.auto && this.raisedFrom === void 0)) {
			let e = q(this.level + 1);
			e !== this.level && (this.raisedFrom = this.level, this.level = e);
		}
		this.update({ buffering: !e || this.gotData });
	}
	tickHolding(e) {
		let t = this.video, n = Date.now();
		!this.status.buffering && this.gotData && this.update({ buffering: !0 });
		let r = Tt(t);
		if (r > this.holdBufferedEnd + .01) this.holdBufferedEnd = r, this.lastProgressAt = n;
		else if (this.gotData && n - this.lastProgressAt > this.stallTimeoutMs) {
			this.handleFailure(e, {
				kind: "stall",
				detail: `no data for ${this.stallTimeoutMs} ms while buffering`
			});
			return;
		}
		let i = J(t), a = this.holdIsStart ? this.startTarget : this.resumeTarget, o = n - this.holdStartedAt > Ct;
		if (o && i <= 1 && r - t.currentTime > this.resumeTarget) t.currentTime = r - this.resumeTarget;
		else if (i >= a || i > 1 && o) {
			if (wt(t), !this.holdIsStart && (this.commitRaise(), this.dryRuns = [...this.dryRuns.filter((e) => n - e < pt), n], (!this.auto || this.level === K.length - 1) && this.dryRuns.length >= 3 && (this.struggle("running dry"), !this.isCurrent(e)))) return;
			this.holding = !1, this.lastTime = -1, this.lastProgressAt = n, this.update({ buffering: !1 }), this.play(e);
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
			if (t.type === "data") this.gotData = !0, this.lastProgressAt = Date.now();
			else if (t.type === "media-info") {
				let e = { ...t };
				delete e.type, this.update({ mediaInfo: e });
				let n = Ke(e);
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
		if (this.source.type === "mpegts" && !t.paused && wt(t)) return;
		if (this.reserved && this.status.state === "playing" && !t.paused && J(t) < yt) {
			this.startHold(!1);
			return;
		}
		if (this.auto && this.status.state === "playing" && !t.paused && this.steer(n), this.status.state === "playing" && !t.paused && (this.sampleFrames(n), !this.isCurrent(e))) return;
		let r = t.currentTime;
		r === this.lastTime ? (this.watch.reset(), !t.paused && this.gotData && (this.lastProgressAt || (this.lastProgressAt = n), n - this.lastProgressAt > this.stallTimeoutMs && this.handleFailure(e, {
			kind: "stall",
			detail: `no progress for ${this.stallTimeoutMs} ms`
		}))) : (this.lastTime >= 0 && r > this.lastTime && (this.lastProgressAt = n, this.status.state === "playing" ? !this.status.notice && this.source.type === "mpegts" && n - this.playingSince > 3e3 && this.video.videoWidth === 0 ? this.update({ notice: F("noVideo") }) : this.status.failures > 0 && n - this.playingSince > (this.opts.stableMs ?? 3e4) && this.update({ failures: 0 }) : (this.playingSince = n, this.update({ state: "playing" })), this.status.state === "playing" && this.pictureTick(e, n)), this.lastTime = r, this.lastProgressAt || (this.lastProgressAt = n));
	}
	resetFrameSamples() {
		this.frameSamples = [], this.lastFrames = void 0, this.lastFrameSampleAt = 0;
	}
	sampleFrames(e) {
		if (!this.opts.onStruggle || this.struggled || e - this.lastFrameSampleAt < 2e3) return;
		this.lastFrameSampleAt = e;
		let t = this.engine?.getStats(this.video);
		if (t?.decodedFrames === void 0) return;
		let n = {
			decoded: t.decodedFrames,
			dropped: t.droppedFrames ?? 0
		}, r = this.lastFrames;
		this.lastFrames = n, r && (this.frameSamples = [...this.frameSamples.slice(-4), {
			decoded: Math.max(0, n.decoded - r.decoded),
			dropped: Math.max(0, n.dropped - r.dropped)
		}], mt(this.frameSamples) && this.struggle("dropping frames"));
	}
	struggle(e) {
		!this.struggled && this.opts.onStruggle && (this.struggled = !0, this.opts.onStruggle(e));
	}
	pictureTick(e, t) {
		if (!this.opts.pictureCheck || this.switching || this.video.videoWidth === 0 || t - this.lastSampleAt < 2e3) return;
		this.lastSampleAt = t;
		let n = this.watch.check(this.sampler.sample(this.video), et(this.video), t);
		n && this.onPictureProblem(e, n);
	}
	async onPictureProblem(e, t) {
		let n = Date.now(), r = Math.round((t === "black" ? Xe : Ye) / 1e3);
		this.pictureEvents = this.pictureEvents.filter((e) => n - e < _t), this.pictureEvents.push(n);
		let i = this.pictureEvents.length;
		if (this.watch.reset(), this.opts.onHealth?.(t, `${r} s, step ${Math.min(i, 4)}`), i >= 4) this.watch.off.add(t), this.pictureEvents = [], this.opts.onHealth?.("check-paused", `${t} picture keeps coming back`), t === "black" && this.update({ notice: F("pictureBlack") });
		else {
			if (i === 2 && this.opts.switchSource && n - this.lastSwitchAt > 12e4) {
				this.lastSwitchAt = n, this.switching = !0;
				let r;
				try {
					r = await this.opts.switchSource(t);
				} catch {
					r = !1;
				}
				if (this.switching = !1, !this.isCurrent(e)) return;
				if (this.opts.onHealth?.(r ? "switch" : "switch-failed"), r) {
					this.watch.reset(), this.lastSampleAt = Date.now();
					return;
				}
			}
			this.fail(e, {
				kind: "stall",
				detail: `picture ${t} for ${r} s`
			}, !0);
		}
	}
	networkBack() {
		if (this.disposed) return;
		let e = this.attemptId;
		if (this.status.state === "reconnecting" && this.retryTimer) {
			this.teardownEngine(), this.opts.onHealth?.("network", "retrying now"), this.attempt();
			return;
		}
		let t = this.video;
		this.status.state === "playing" && !t.paused && this.lastProgressAt && Date.now() - this.lastProgressAt > 2e3 && (this.opts.onHealth?.("network", "stalled picture, reconnecting"), this.handleFailure(e, {
			kind: "stall",
			detail: "network came back while stalled"
		}));
	}
	async handleFailure(e, t) {
		if (this.isCurrent(e)) {
			if (t.kind === "network" && !this.gotData) {
				this.teardownEngine();
				let n = await this.diagnose(this.source.url);
				if (!this.isCurrent(e)) return;
				if (n === "cors") {
					this.terminal(L({
						kind: "cors",
						detail: t.detail
					}));
					return;
				}
			}
			if (t.kind === "media" && this.status.mediaInfo) {
				let e = Ke(this.status.mediaInfo);
				if (e) {
					this.terminal(e);
					return;
				}
			}
			this.fail(e, t, qe(t));
		}
	}
	fail(e, t, n) {
		if (!this.isCurrent(e)) return;
		let r = this.status.failures + 1;
		this.status.state === "playing" && this.opts.onBeforeReconnect?.(), this.raisedFrom !== void 0 && (this.level = this.raisedFrom, this.raisedFrom = void 0), this.teardownEngine();
		let i = !n || r > this.opts.maxAttempts, a = i && !!this.opts.keepTrying && vt.has(t.kind);
		if (i && !a) {
			this.opts.onHealth?.("gave-up", `${t.kind}: ${t.detail}`), this.terminal(n ? L(t, { attempts: r }) : L(t, { startTimeoutMs: this.opts.startTimeoutMs }));
			return;
		}
		let o = this.opts.backoffMs ?? ht, s = a ? gt : o[Math.min(r - 1, o.length - 1)];
		this.opts.onHealth?.(a ? "keep-trying" : "reconnect", `${t.kind}: ${t.detail}`), this.update({
			state: "reconnecting",
			failures: r,
			retryAt: Date.now() + s,
			lastError: `${t.kind}: ${t.detail}`
		}), this.retryTimer = setTimeout(() => {
			this.retryTimer = void 0, this.isCurrent(e) && this.attempt();
		}, s);
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
		this.disposed || (this.teardownEngine(), this.setRate(1), this.disposed = !0, this.attemptId++, this.status = {
			...this.status,
			state: "stopped"
		}, Y.sessions--);
	}
	getStats() {
		return this.engine?.getStats(this.video);
	}
}, Dt = "stream-card:health:", Ot = 864e5;
function kt(e) {
	try {
		let t = localStorage.getItem(Dt + e);
		if (!t) return [];
		let n = JSON.parse(t);
		return Array.isArray(n) ? n.filter((e) => !!e && typeof e == "object" && typeof e.t == "number" && typeof e.kind == "string") : [];
	} catch {
		return [];
	}
}
function At(e, t) {
	let n = [...kt(e), t].slice(-100);
	try {
		localStorage.setItem(Dt + e, JSON.stringify(n));
	} catch {}
	return n;
}
function jt(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) t - r.t <= Ot && n.set(r.kind, (n.get(r.kind) ?? 0) + 1);
	return n.size ? "24 h: " + [...n].map(([e, t]) => `${t} ${e}`).join(" · ") : "24 h: no trouble";
}
function Mt(e) {
	let t = new Date(e);
	return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function Nt(e, t) {
	return e.slice(-t).reverse().map((e) => `${Mt(e.t)} ${e.kind}${e.ch ? ` · ${e.ch}` : ""}${e.detail ? ` · ${e.detail}` : ""}`);
}
//#endregion
//#region src/lifecycle.ts
function Pt(e) {
	return e.connected ? e.preview ? "preview" : e.hasSource ? e.wantPlaying ? e.pageVisible ? e.screenAwake ? e.intersecting ? null : "hidden" : "screen-off" : "page-hidden" : "stopped" : "no-source" : "disconnected";
}
var Ft = [
	"pointerdown",
	"keydown",
	"wheel",
	"touchstart"
], It = class {
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
			}, { threshold: [0, .01] }), this.io.observe(this.host)), document.addEventListener("visibilitychange", this.onVisibility), window.addEventListener("pagehide", this.onPageHide), window.addEventListener("pageshow", this.onVisibility), window.addEventListener(y, this.onPower);
			for (let e of Ft) document.addEventListener(e, this.onActivity, {
				capture: !0,
				passive: !0
			});
		}
	}
	detach() {
		if (this.attached) {
			this.attached = !1, this.io?.disconnect(), this.io = void 0, document.removeEventListener("visibilitychange", this.onVisibility), window.removeEventListener("pagehide", this.onPageHide), window.removeEventListener("pageshow", this.onVisibility), window.removeEventListener(y, this.onPower);
			for (let e of Ft) document.removeEventListener(e, this.onActivity, { capture: !0 });
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
}, Lt = 2e3, Rt = class {
	constructor(e, t, n = () => !1, r = Lt) {
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
}, X = "stream-card:settings:", Z = "stream-card-settings";
function zt(e) {
	try {
		let t = localStorage.getItem(X + e);
		if (!t) return {};
		let n = JSON.parse(t);
		if (typeof n != "object" || !n) return {};
		let r = {};
		return (n.buffer === "auto" || n.buffer === "low" || n.buffer === "stable") && (r.buffer = n.buffer), typeof n.nowNext == "boolean" && (r.nowNext = n.nowNext), typeof n.stats == "boolean" && (r.stats = n.stats), typeof n.quality == "string" && n.quality && n.quality !== "auto" && (r.quality = n.quality), n.audio === "safe" && (r.audio = "safe"), r;
	} catch {
		return {};
	}
}
function Bt(e, t) {
	let n = Object.fromEntries(Object.entries(t).filter(([, e]) => e !== void 0));
	try {
		Object.keys(n).length ? localStorage.setItem(X + e, JSON.stringify(n)) : localStorage.removeItem(X + e);
	} catch {}
	window.dispatchEvent(new CustomEvent(Z, { detail: {
		target: e,
		settings: n
	} }));
}
var Vt = "stream-card:buffer-level";
function Ht() {
	try {
		let e = localStorage.getItem(Vt), t = e === null ? NaN : Number(e);
		return Number.isFinite(t) ? t : void 0;
	} catch {
		return;
	}
}
function Ut(e) {
	try {
		localStorage.setItem(Vt, String(e));
	} catch {}
}
//#endregion
//#region src/styles.ts
var Wt = g`
  :host {
    display: block;
  }
  /* When the dashboard makes the card taller than its content (a sections row next to a taller
     column, a theme's min-height), the picture takes the extra height, letterboxed like full
     screen, instead of leaving a bar of card background under it. */
  ha-card {
    display: flex;
    flex-direction: column;
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
  ha-card > * {
    flex: none;
  }
  .stage {
    position: relative;
    container: stage / inline-size;
    display: flex;
    flex-direction: column;
    flex: 1 0 auto;
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
    flex: 1 0 auto;
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
  .video-host canvas.still {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
  }
  .video-host canvas.still[hidden] {
    display: none;
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
    /* A bar that doesn't fit wraps upwards over the picture rather than pushing buttons (full
       screen among them) off the card, which clips them. */
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    color: var(--sc-pic-text);
    transition: opacity 0.3s;
  }
  .group {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 16px;
    background: var(--sc-glass);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid var(--sc-glass-line);
  }
  .group.transport {
    margin-right: auto;
  }
  .group.sound {
    position: relative;
  }
  .upnext {
    /* A zero basis, so a long title never wraps the bar; it shrinks and ellipsises instead. */
    flex: 1 1 0;
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
  .sleep-menu,
  .settings-panel {
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
  .settings-panel {
    width: 280px;
    max-width: calc(100cqw - 24px);
    /* A long Quality list must not run off the top of the picture: scroll inside instead. */
    max-height: max(200px, min(70vh, calc(100cqw * 9 / 16 - 90px)));
    overflow-y: auto;
    overscroll-behavior: contain;
    gap: 12px;
    z-index: 3;
  }
  .menu-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 24px;
  }
  .reset-settings {
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 650;
    color: var(--sc-pic-text);
    background: rgba(255, 255, 255, 0.12);
  }
  .setting {
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
  }
  .setting.toggle {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 36px;
    width: 100%;
  }
  .setting-name {
    font-size: 14px;
    font-weight: 650;
  }
  .setting-hint {
    font-size: 12px;
    color: var(--sc-pic-text-2);
  }
  .seg {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 3px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
  }
  .seg-option {
    height: 34px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 650;
  }
  .seg.wrap {
    grid-template-columns: repeat(4, 1fr);
  }
  .seg.wrap .seg-option {
    height: 30px;
    font-size: 12px;
  }
  .seg-option[aria-checked='true'] {
    background: #fff;
    color: #111318;
  }
  .switch {
    position: relative;
    flex: none;
    width: 42px;
    height: 24px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.2);
    transition: background 0.15s;
  }
  .switch::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s var(--sc-ease);
  }
  .setting[aria-checked='true'] .switch {
    background: var(--sc-accent);
  }
  .setting[aria-checked='true'] .switch::after {
    transform: translateX(18px);
  }

  /* Narrow cards: hide the "Next" line, then the volume slider (mute stays), so the floating
     bar fits on one row down to the phone layout, settings button included. */
  @container stage (max-width: 760px) {
    .upnext {
      display: none;
    }
    .vol-slider {
      width: 72px;
    }
  }
  @container stage (max-width: 679px) {
    .vol-slider,
    .sep {
      display: none;
    }
    /* Wall panels' 56 px targets don't fit in a card this narrow; 44 px is still finger-sized. */
    .controls {
      --sc-target: 44px;
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
    /* Row 1: last, down, stop, up, sleep. Row 2: mute, volume, channels, multiview, settings, full screen.
       Orders on row 2 are spaced so another button can slot in. */
    .stage:not(.fs):not(.tv) .ctl-last {
      order: 1;
    }
    .stage:not(.fs):not(.tv) .ctl-down {
      order: 2;
    }
    .stage:not(.fs):not(.tv) .ctl-stop {
      order: 3;
    }
    .stage:not(.fs):not(.tv) .ctl-up {
      order: 4;
    }
    .stage:not(.fs):not(.tv) .ctl-sleep {
      order: 5;
    }
    .stage:not(.fs):not(.tv) .row-break {
      display: block;
      order: 6;
      flex-basis: 100%;
      height: 0;
    }
    .stage:not(.fs):not(.tv) .ctl-mute {
      order: 7;
    }
    .stage:not(.fs):not(.tv) .vol-slider {
      order: 8;
    }
    .stage:not(.fs):not(.tv) .ctl-channels {
      order: 10;
    }
    .stage:not(.fs):not(.tv) .ctl-multiview {
      order: 12;
    }
    .stage:not(.fs):not(.tv) .ctl-settings {
      order: 13;
    }
    .stage:not(.fs):not(.tv) .ctl-fullscreen {
      order: 14;
    }
    .stage:not(.fs):not(.tv) .ctl-mute,
    .stage:not(.fs):not(.tv) .ctl-channels,
    .stage:not(.fs):not(.tv) .ctl-multiview,
    .stage:not(.fs):not(.tv) .ctl-settings,
    .stage:not(.fs):not(.tv) .ctl-fullscreen {
      width: 44px;
      height: 44px;
      background: none;
    }
    .stage:not(.fs):not(.tv) .vol-slider {
      display: block;
      flex: 1;
      width: auto;
      min-width: 60px;
    }
    .stage:not(.fs):not(.tv) .sleep-menu,
    .stage:not(.fs):not(.tv) .settings-panel {
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
  /* Full screen on a phone: the bar can take two rows, so the channel number sits above them. */
  @container stage (max-width: 519px) {
    .stage.fs .osd {
      bottom: 156px;
    }
    .stage.fs .frame[data-state] .layer {
      padding-bottom: 140px;
    }
  }
  /* Small phones: smaller buttons and no slider, so each row stays one row. */
  @container stage (max-width: 359px) {
    .stage:not(.fs):not(.tv) .controls {
      column-gap: 6px;
      padding: 12px 12px 4px;
    }
    .stage:not(.fs):not(.tv) .ctl {
      width: 44px;
      height: 44px;
    }
    .stage:not(.fs):not(.tv) .ctl-stop {
      width: 56px;
      height: 56px;
    }
    .stage:not(.fs):not(.tv) .vol-slider {
      display: none;
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
`, Gt = [
	d,
	g`
    ${s(te)}
  `,
	Wt
], Q, Kt = 4e3, qt = 2600, Jt = 1e4, Yt = /* @__PURE__ */ new Set([
	"HUI-CARD-PREVIEW",
	"HUI-CARD-PICKER",
	"HUI-DIALOG-EDIT-CARD",
	"HUI-CARD-ELEMENT-EDITOR"
]), Xt;
function Zt() {
	Xt ?? (Xt = import("./stream-card-picker-CcW1WrPp.js").then(({ PICKER_TAG: e, StreamCardPicker: t }) => {
		customElements.get(e) || customElements.define(e, t);
	}));
}
function Qt(e) {
	let t = e;
	for (let e = 0; t && e < 60; e++) {
		if (t instanceof Element && Yt.has(t.tagName)) return !0;
		t = t.parentNode ?? (t instanceof ShadowRoot ? t.host : null);
	}
	return !1;
}
var $t = class extends c {
	constructor() {
		super(), this.health = [], this.wantPlaying = !1, this.hold = "disconnected", this.idleStopped = !1, this.controlsVisible = !0, this.inEditor = !1, this.fullscreen = !1, this.channelState = "idle", this.guideOpen = !1, this.overlayOpen = !1, this.sleepMenuOpen = !1, this.settingsOpen = !1, this.deviceSettings = {}, this.osdUntil = 0, this.osdPending = !1, this.keysSeen = !1, this.layout = m(), this.requestSeq = 0, this.lookupPending = !1, this.lookupPlay = !1, this.numbers = new Rt((e) => this.tuneNumber(e), () => this.refresh(), (e) => this.channels?.numberIsComplete(e) ?? !1), this.mvOn = !1, this.mvAllowed = !1, this.enterMultiview = async (e) => {
			if (e?.stopPropagation(), !this.multiviewAvailable || this.isPreview || this.mvOn) return;
			if (!this.mv) {
				let { defineMultiview: e, MULTIVIEW_TAG: t } = await import("./stream-card-multiview-iC1Ew4We.js");
				if (e({
					LitElement: c,
					html: u,
					css: g,
					nothing: h,
					svg: o,
					PlaybackSession: Et,
					icon: ie,
					format: F
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
		}, this.switchSource = async () => {
			let e = this.config?.switchSource, t = this.source ? Te(this.source.url) : void 0, n = this.hassRef;
			if (!e || !t || typeof n?.callService != "function" || this.isPreview) return !1;
			let [r, i] = e.split("."), a;
			try {
				return await Promise.race([n.callService(r, i, { channel: t }), new Promise((e, t) => {
					a = setTimeout(() => t(/* @__PURE__ */ Error("timed out")), Jt);
				})]), !0;
			} catch (e) {
				return console.warn("[stream-card] switch_source failed", e), !1;
			} finally {
				clearTimeout(a);
			}
		}, this.onNetworkBack = () => {
			this.session?.networkBack();
		}, this.play = (e) => {
			e?.stopPropagation(), this.session && this.status?.needsGesture ? this.session.resumeFromGesture(this.status.mutedByPolicy) : (this.error = void 0, this.idleStopped = !1, this.stopGen = this.controller.stopCount(this.target), this.request && !this.source && this.applyRequest(this.request, !0), this.wantPlaying = !0, this.remember(), this.evaluate());
		}, this.onPick = (e) => {
			e.stopPropagation();
			let t = e.detail, n = this.guidePlacement, r = n === "overlay" || n === "below" && !this.guideOpen, i = r && this.pickerHasFocus();
			r && (this.overlayOpen = !1), this.playChannel(t), i && this.restoreFocus();
		}, this.togglePicker = (e) => {
			if (e?.stopPropagation(), this.app && !this.isPreview) {
				this.ensureChannels(), this.app.showGuide();
				return;
			}
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
			let t = P(e);
			this.video.volume = t, Re(t), t > 0 && this.effectiveMuted && !this.status?.mutedByPolicy ? this.toggleMute() : this.refresh();
		}, this.setSleep = (e) => {
			this.controller.setSleep(this.target, e);
		}, this.extendSleep = (e) => {
			this.controller.extendSleep(this.target, e);
		}, this.keepWatching = () => this.setSleep(0), this.onKeyDown = (e) => {
			if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || this.isPreview) return;
			let t = e.composedPath();
			if (t.some((e) => e instanceof HTMLElement && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.tagName === "SELECT" || e.tagName === "STREAM-CARD-PICKER" || e.isContentEditable))) return;
			if (this.app?.key(e)) {
				e.preventDefault();
				return;
			}
			let n = !!this.numbers.digits, r = !0;
			/^\d$/.test(e.key) ? this.pressDigit(e.key) : e.key === "Enter" && n ? this.commitDigits() : e.key === "Enter" && !t.some((e) => e instanceof HTMLButtonElement) ? this.togglePicker() : e.key === "Escape" && n ? this.clearDigits() : e.key === "Escape" && (this.settingsOpen || this.sleepMenuOpen) ? (this.settingsOpen = this.sleepMenuOpen = !1, this.showControls()) : e.key === "Backspace" ? n ? this.deleteDigit() : this.lastChannel() : e.key === "ArrowUp" || e.key === "PageUp" || e.key === "ChannelUp" ? this.channelUp() : e.key === "ArrowDown" || e.key === "PageDown" || e.key === "ChannelDown" ? this.channelDown() : e.key === "m" || e.key === "M" || e.key === "AudioVolumeMute" ? this.toggleMute() : e.key === "f" || e.key === "F" ? this.toggleFullscreen() : r = !1, r && e.preventDefault();
		}, this.stop = (e) => {
			e?.stopPropagation(), this.controller.stop(this.target);
		}, this.toggleMute = (e) => {
			e?.stopPropagation();
			let t = !this.effectiveMuted;
			this.video.muted = t, this.userMuted = t, !t && this.session?.status.mutedByPolicy ? this.session.resumeFromGesture(!0) : this.session?.setMuted(t), this.showControls(), this.refresh();
		}, this.unmute = (e) => {
			e?.stopPropagation(), this.userMuted = !1, this.session ? this.session.resumeFromGesture(!0) : this.video.muted = !1, this.refresh();
		}, this.toggleSleepMenu = (e) => {
			e?.stopPropagation(), this.sleepMenuOpen = !this.sleepMenuOpen, this.sleepMenuOpen && (this.settingsOpen = !1), this.showControls();
		}, this.toggleSettings = (e) => {
			e?.stopPropagation(), this.settingsOpen = !this.settingsOpen, this.settingsOpen && (this.sleepMenuOpen = !1), this.showControls();
		}, this.settingsActions = {
			toggle: this.toggleSettings,
			setBuffer: (e) => this.changeSettings({ buffer: e }),
			setNowNext: (e) => this.changeSettings({ nowNext: e }),
			setStats: (e) => this.changeSettings({ stats: e }),
			setQuality: (e) => this.changeSettings({ quality: e }),
			setAudio: (e) => this.changeSettings({ audio: e === "safe" ? "safe" : void 0 }),
			reset: () => this.config && Bt(this.config.target, {})
		}, this.onSettingsEvent = (e) => {
			let t = e.detail;
			if (!this.config || t.target !== this.config.target) return;
			let n = this.bufferMode;
			this.deviceSettings = t.settings, this.configureMultiview(), this.syncStatsTimer(), this.bufferMode !== n && this.session?.source.type === "mpegts" ? (this.stopSession("settings"), this.reresolve(), this.evaluate()) : this.qualityOn && this.restartForQuality("settings"), this.refresh();
		}, this.onKeySeen = () => {
			this.keysSeen || (this.keysSeen = !0, this.refresh());
		}, this.onFrameClick = () => {
			this.sleepMenuOpen || this.settingsOpen ? (this.sleepMenuOpen = !1, this.settingsOpen = !1, this.showControls()) : this.status?.mutedByPolicy ? this.unmute() : this.controlsVisible && this.status?.state === "playing" ? (this.controlsVisible = !1, clearTimeout(this.controlsTimer), this.refresh()) : this.showControls();
		}, this.toggleFullscreen = async (e) => {
			e?.stopPropagation();
			let t = document, n = this.renderRoot.querySelector(".stage, .app-stage");
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
		}, this.nowNextFn = (e) => this.nowNext(e), this.preview = !1, this.editMode = !1, this._ui = 0, this.controller = Be(), this.video = document.createElement("video"), this.video.playsInline = !0, this.video.setAttribute("playsinline", ""), this.video.setAttribute("webkit-playsinline", ""), this.video.preload = "none", this.video.controls = !1, this.video.muted = !0, this.video.volume = Le() ?? 1, this.video.disableRemotePlayback = !0, this.still = document.createElement("canvas"), this.still.className = "still", this.still.hidden = !0, this.watcher = new It(this, this.controller.power, () => this.evaluate(), () => this.onIdle());
	}
	setConfig(e) {
		let t = this.config?.target;
		this.config = be(e), this.deviceSettings = zt(this.config.target), this.health = kt(this.config.target), this.config.settings || (this.settingsOpen = !1), this.syncStatsTimer(), this.config.guide !== this.guideMode && (this.guideMode = this.config.guide, this.guideOpen = this.config.guide === "open"), t && t !== this.config.target && this.isConnected && (this.controller.unregister(this), this.controller.register(this));
		let n = this.channelListKey();
		n !== this.channelsKey && (this.channels = void 0, this.channelsPromise = void 0, this.channelState = "idle", this.channelsKey = n, this.isConnected && this.ensureChannels()), this.syncGuide(), this.syncApp(), this.mvOn && !this.multiviewAvailable && this.exitMultiview(), this.configureMultiview(), this.request ? this.applyRequest(this.request, this.lookupPending ? this.lookupPlay : this.wantPlaying) : this.isConnected && this.pickInitialRequest(), this.refresh();
	}
	static async getConfigForm() {
		return (await import("./stream-card-editor-form-DnjJoJK1.js")).configForm;
	}
	set hass(e) {
		this.hassRef = e;
	}
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
		super.connectedCallback(), this.inEditor = Qt(this), this.controller.register(this), this.watcher.attach(), this.addEventListener("keydown", this.onKeySeen), document.addEventListener("fullscreenchange", this.onFullscreenChange), document.addEventListener("webkitfullscreenchange", this.onFullscreenChange), this.pickInitialRequest(), this.stopGen !== void 0 && this.stopGen !== this.controller.stopCount(this.target) && this.stopFromController(), this.ensureChannels(), this.syncGuide(), window.addEventListener(Z, this.onSettingsEvent), window.addEventListener("online", this.onNetworkBack), window.addEventListener(b, this.onNetworkBack), this.config && (this.deviceSettings = zt(this.config.target)), this.syncStatsTimer(), this.addEventListener("keydown", this.onKeyDown), this.sleepChanged(), this.syncApp(), this.app?.connect(), this.evaluate();
	}
	disconnectedCallback() {
		this.watcher.detach(), this.controller.unregister(this), document.removeEventListener("fullscreenchange", this.onFullscreenChange), document.removeEventListener("webkitfullscreenchange", this.onFullscreenChange), window.removeEventListener(Z, this.onSettingsEvent), window.removeEventListener("online", this.onNetworkBack), window.removeEventListener(b, this.onNetworkBack), clearInterval(this.debugTimer), this.debugTimer = void 0, clearTimeout(this.controlsTimer), clearTimeout(this.zapTimer), this.zapTimer = void 0, this.syncGuide(), clearInterval(this.sleepTicker), this.sleepTicker = void 0, this.removeEventListener("keydown", this.onKeyDown), this.numbers.clear(), clearTimeout(this.tickTimer), this.removeEventListener("keydown", this.onKeySeen), this.app?.disconnect(), super.disconnectedCallback(), this.evaluate();
	}
	updated(e) {
		let t = this.renderRoot.querySelector(".video-host");
		t && this.video.parentNode !== t && t.append(this.video, this.still), (e.has("preview") || e.has("editMode")) && (!this.isPreview && this.lookupPending && this.request && this.applyRequest(this.request, this.lookupPlay), this.ensureChannels(), this.syncGuide(), this.syncApp(), this.evaluate());
	}
	syncApp() {
		let e = this.config?.chrome ?? "standard";
		e === "standard" ? delete this.dataset.chrome : (this.dataset.chrome = e, !(this.isPreview || this.app || this.appLoading) && (this.appLoading = import("./stream-card-app-b7qccnyz.js").then(({ AppShell: e, appStyles: t, hostFor: n }) => {
			a(this.renderRoot, [...Gt, t]), this.app = new e(n(this)), this.isConnected && this.app.connect(), this.refresh();
		})));
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
		if (Zt(), this.channelsPromise && !e) return this.channelsPromise;
		this.channelState = "loading", this.channelMessage = void 0, this.refresh();
		let n = this.channelListKey();
		return this.channelsPromise = ee(t.m3uUrl, { force: e }).then((e) => {
			if (n === this.channelListKey()) return this.channels = new f(e, {
				groups: t.channelGroups,
				favourites: t.favourites
			}), this.channelState = "ready", this.channelMessage = this.channels.size ? void 0 : this.channels.total ? F("noGroupMatch", { groups: this.channels.allGroups.join(", ") }) : F("noChannels"), this.refresh(), this.channels;
		}, (e) => {
			n === this.channelListKey() && (this.channelState = "error", this.channelMessage = F("channelsFailed", { detail: e instanceof Error ? e.message : String(e) }), this.channelsPromise = void 0, this.refresh());
		}), this.channelsPromise;
	}
	syncGuide() {
		let e = this.config, t = this.isConnected && !this.isPreview && e?.epg ? e.epgUrl : void 0;
		this.guideUrl !== t && (this.guideUnsub?.(), this.guideUnsub = void 0, this.guide = void 0, this.guideUrl = t, t && import("./stream-card-epg-BZbbO0oy.js").then(({ guideFeed: e }) => {
			this.guideUrl === t && (this.guide = e(t), this.guideUnsub = this.guide.subscribe(() => this.refresh()));
		}));
	}
	nowNext(e) {
		if (this.showNowNext) return e && this.guide ? this.guide.nowNext(e) : void 0;
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
		let n = e.rememberChannel ? A(this.target) : void 0;
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
		}, i = k(r, n);
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
			buffer: this.bufferMode
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
		if (this.lookupPending = !1, r && !e.url && !E(r) && this.config.channelList) {
			if (this.request = e, this.idleStopped = !1, this.lookupPending = !0, this.lookupPlay = t, this.refresh(), this.isPreview) return;
			this.ensureChannels().then((t) => {
				if (n !== this.requestSeq) return;
				this.lookupPending = !1;
				let i = this.lookupPlay, a = t?.find(r);
				a ? this.applyResolved(this.requestFor(a, e), i) : t ? this.showRequestError(F("channelNotFound", { name: r })) : fe(r) ? this.showRequestError(this.channelMessage ?? F("channelNotFound", { name: r })) : this.applyResolved(e, i);
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
			n = this.resolveWithQuality(e);
		} catch (e) {
			this.stopSession("config"), this.source = void 0, this.error = {
				kind: "config",
				message: e instanceof x ? e.message : String(e),
				detail: String(e)
			}, this.wantPlaying = !1, this.refresh();
			return;
		}
		this.session && this.session.source.url !== n.url ? this.stopSession("switch") : this.session && this.session.buffer !== this.bufferMode && this.stopSession("config"), this.source?.url !== n.url && (this.osdPending = !0), this.source = {
			...n,
			title: e.title ?? n.title
		}, this.error = void 0, t && (this.wantPlaying = !0), !this.isPreview && !this.zapTimer && Ae(this.target, this.recentEntry(e) ?? {}), this.remember(), this.evaluate();
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
		this.config?.rememberChannel && this.source && e && !this.isPreview && De(this.target, {
			channel: e.channel,
			url: e.url,
			title: e.title,
			playing: this.wantPlaying
		});
	}
	evaluate() {
		let e = this.mvOn ? this.mv : void 0, t = Pt({
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
		} else t === null ? !this.session && !this.zapTimer && this.startSession() : this.session && this.stopSession(t);
		this.refresh();
	}
	startSession() {
		if (!this.source || !this.config) return;
		this.error = void 0, this.maybeRaiseQuality();
		let e = this.quality, t = !!e && this.qualityAuto && e.index < e.opts.length - 1, n = new Et(this.video, this.source, {
			startTimeoutMs: this.config.startTimeoutMs,
			maxAttempts: this.config.maxReconnectAttempts,
			muted: this.userMuted ?? this.config.muted,
			debug: this.config.debug,
			buffer: this.bufferMode,
			pictureCheck: this.config.pictureCheck,
			switchSource: this.config.switchSource ? this.switchSource : void 0,
			keepTrying: this.config.keepTrying,
			autoLevel: Ht(),
			onAutoLevel: Ut,
			onHealth: (e, t) => {
				n === this.session && this.logHealth(e, t);
			},
			onBeforeReconnect: () => {
				n === this.session && this.holdLastFrame();
			},
			onStruggle: t ? (e) => {
				n === this.session && this.lowerQuality(e);
			} : void 0,
			onStatus: (e) => this.onStatus(n, e)
		});
		this.session = n, this.status = n.status, this.showControls(), n.start(), this.config.idleTimeoutMs > 0 && this.watcher.armIdle(this.config.idleTimeoutMs);
	}
	stopSession(e) {
		let t = this.session;
		t && (this.session = void 0, this.status = void 0, this.lastRelease = e, this.watcher.disarmIdle(), this.still.hidden = !0, t.destroy());
	}
	get qualityOn() {
		return (this.config?.qualities.length ?? 0) > 1;
	}
	get qualityAuto() {
		return this.qualityOn && !this.deviceSettings.quality;
	}
	resolveWithQuality(e) {
		let t = this.config;
		if (this.quality = void 0, !this.qualityOn || e.url || !e.channel) return k(e, t);
		let n = e.channel, r = W(n), i = dt(t.qualities, r, t.formatProfile);
		this.deviceSettings.audio === "safe" && t.formatProfile && i[0].rung === 0 && (i[0] = {
			...i[0],
			outputProfile: t.formatProfile
		});
		let a = ft(i, this.deviceSettings.quality, U(), r);
		return this.quality = {
			key: n,
			opts: i,
			index: a
		}, k(e, {
			...t,
			outputProfile: i[a].outputProfile
		});
	}
	reresolve() {
		let e = this.request;
		if (!e || !this.source || this.lookupPending) return !1;
		let t;
		try {
			t = this.resolveWithQuality(e);
		} catch {
			return !1;
		}
		let n = t.url !== this.source.url;
		return this.source = {
			...t,
			title: e.title ?? t.title
		}, n;
	}
	restartForQuality(e) {
		let t = !!this.session;
		this.reresolve() && t && (this.stopSession(e), this.evaluate());
	}
	maybeRaiseQuality() {
		if (!this.qualityAuto || !this.quality) return;
		let e = U(), t = ct(e, Date.now());
		if (t !== e && (ot(t), this.reresolve())) {
			let e = this.quality;
			this.logHealth("quality", `trying ${e?.opts[e.index].name ?? "higher"}`);
		}
	}
	lowerQuality(e) {
		let t = this.quality;
		if (!t || !this.qualityAuto) return;
		let n = st(U(), t.index, t.opts.length - 1, Date.now());
		ot(n), this.logHealth("quality", `${t.opts[Math.min(n.step, t.opts.length - 1)].name} (${e})`), this.restartForQuality("quality");
	}
	qualityOnStatus(e) {
		let t = this.quality;
		if (!t || t.index !== 0) return !1;
		let n = W(t.key), r = e.mediaInfo?.height;
		if (r && r !== n.h && e.state !== "error" && (G(t.key, { h: r }), this.quality = {
			...t,
			opts: dt(this.config.qualities, {
				...n,
				h: r
			}, this.config.formatProfile)
		}, this.quality.index = Math.min(t.index, this.quality.opts.length - 1)), e.state !== "error" || e.error?.kind !== "codec") return !1;
		let i = this.config;
		if (/audio/i.test(e.error.detail) && !/video/i.test(e.error.detail) && i.formatProfile && t.opts[0].outputProfile !== i.formatProfile && !n.fmt) G(t.key, {
			fmt: !0,
			...r ? { h: r } : {}
		}), this.logHealth("quality", `Source with safe audio (${e.error.detail})`);
		else if (!n.noSource && t.opts.length > 1) G(t.key, {
			noSource: !0,
			...r ? { h: r } : {}
		}), this.logHealth("quality", `Source can't play here (${e.error.detail})`);
		else return !1;
		return this.stopSession("quality"), this.reresolve(), this.evaluate(), !0;
	}
	logHealth(e, t) {
		if (!this.config) return;
		let n = this.source?.title ?? this.source?.channel;
		this.health = At(this.config.target, {
			t: Date.now(),
			kind: e,
			ch: n,
			detail: t
		});
	}
	holdLastFrame() {
		let e = this.video;
		if (e.videoWidth && e.videoHeight) try {
			let t = Math.min(1, 1280 / e.videoWidth);
			this.still.width = Math.round(e.videoWidth * t), this.still.height = Math.round(e.videoHeight * t), this.still.getContext("2d")?.drawImage(e, 0, 0, this.still.width, this.still.height), this.still.hidden = !1;
		} catch {
			this.still.hidden = !0;
		}
	}
	onStatus(e, t) {
		e === this.session && (this.qualityOnStatus(t) || (this.status = t, t.state === "error" ? (this.error = t.error, this.wantPlaying = !1, this.stopSession("error"), this.evaluate()) : (t.state === "playing" && (this.still.hidden = !0, this.scheduleHideControls(), this.osdPending && (this.osdPending = !1, this.osdUntil = Date.now() + qt)), this.refresh())));
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
		t && (clearTimeout(this.zapTimer), this.zapTimer = setTimeout(() => {
			this.zapTimer = void 0, !this.isPreview && this.source && Ae(this.target, this.recentEntry(this.request) ?? {}), this.evaluate();
		}, 800), this.playChannel(t)), this.showControls();
	}
	get currentKey() {
		return this.source?.channel ?? this.request?.url;
	}
	get recents() {
		let e = this.channels;
		return !e || this.isPreview ? [] : M(this.target).map((t) => e.find(t.channel ?? t.url)).filter((e) => !!e);
	}
	get previousEntry() {
		return this.isPreview ? void 0 : je(this.target, this.currentKey);
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
	get bufferMode() {
		return this.deviceSettings.buffer ?? this.config?.buffer ?? "auto";
	}
	get qualityView() {
		if (!this.qualityOn || !this.config) return;
		let e = this.quality, t = e ? e.opts.map((e) => e.name) : this.config.qualities.map((e) => e.name), n = this.deviceSettings.quality;
		return {
			choice: n && t.includes(n) ? n : n ? t[0] : "auto",
			options: t,
			playing: e ? e.opts[e.index].name : void 0
		};
	}
	get showNowNext() {
		return this.deviceSettings.nowNext ?? !0;
	}
	get showStats() {
		return this.deviceSettings.stats ?? this.config?.debug ?? !1;
	}
	changeSettings(e) {
		let t = this.config;
		if (!t) return;
		let n = {
			...this.deviceSettings,
			...e
		};
		n.buffer === t.buffer && (n.buffer = void 0), n.nowNext === !0 && (n.nowNext = void 0), n.stats === t.debug && (n.stats = void 0), n.quality === "auto" && (n.quality = void 0), Bt(t.target, n), this.showControls();
	}
	syncStatsTimer() {
		let e = this.showStats && this.isConnected;
		e && !this.debugTimer ? this.debugTimer = setInterval(() => this.refresh(), 1e3) : !e && this.debugTimer && (clearInterval(this.debugTimer), this.debugTimer = void 0);
	}
	showControls() {
		this.controlsVisible = !0, this.scheduleHideControls(), this.refresh();
	}
	scheduleHideControls() {
		clearTimeout(this.controlsTimer), this.controlsTimer = setTimeout(() => {
			this.status?.state === "playing" && !this.sleepMenuOpen && !this.settingsOpen && (this.controlsVisible = !1, this.refresh());
		}, Kt);
	}
	multiviewAction() {
		return this.multiviewAvailable && !this.isPreview ? this.enterMultiview : void 0;
	}
	get uiState() {
		return this.isPreview ? "preview" : this.error ? "error" : this.session && this.status ? this.status.state === "error" || this.status.state === "stopped" ? "ready" : this.status.state : !this.source && this.lookupPending ? this.lookupPlay ? "connecting" : "ready" : this.zapTimer && this.source && this.wantPlaying && this.hold === null ? "connecting" : this.source ? "ready" : "empty";
	}
	get debugInfo() {
		let e = this.session?.getStats();
		return {
			version: _,
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
			buffer: this.bufferMode,
			auto: this.session?.autoInfo,
			quality: this.quality ? {
				choice: this.deviceSettings.quality ?? "auto",
				playing: this.quality.opts[this.quality.index].name,
				profile: this.quality.opts[this.quality.index].outputProfile,
				options: this.quality.opts.map((e) => e.name),
				autoStep: U().step
			} : void 0,
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
			stillShown: !this.still.hidden,
			health: this.health.slice(-20),
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
			debugText: this.showStats && t !== "preview" && t !== "empty" ? this.debugText() : void 0,
			sleepMenuOpen: this.sleepMenuOpen,
			settings: e?.settings ? {
				open: this.settingsOpen,
				buffer: this.bufferMode,
				nowNext: e.epg ? this.showNowNext : void 0,
				stats: this.showStats,
				quality: this.qualityView,
				audio: this.qualityOn && e.formatProfile ? this.deviceSettings.audio ?? "original" : void 0,
				custom: Object.keys(this.deviceSettings).length > 0
			} : void 0,
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
			multiview: this.multiviewAction(),
			settings: this.config?.settings ? this.settingsActions : void 0
		};
	}
	renderPicker(e, t, n) {
		return u`<stream-card-picker
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
		return this.scheduleTick(t), this.app && !this.isPreview ? this.app.render(t, n) : u`
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
            ${t.ui !== "preview" && t.ui !== "empty" ? u`<div class="sheen ${t.chrome ? "" : "hidden"}"></div>` : h}
            ${ne(t)} ${l(t)} ${oe(t, n)}
            ${t.notice ? u`<div class="notice" role="status">${t.notice}</div>` : h}
            ${t.debugText ? u`<div class="debug">${t.debugText}</div>` : h}
            ${re(t, this.keysSeen)}
            ${r === "overlay" ? this.renderPicker(t, n, !0) : h}
          </div>
          ${p(t)} ${ae(t, n)}
        </div>
        ${r === "below" && !i ? this.renderPicker(t, n, !1) : h}
        ${i ?? h}
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
			e.quality ? `quality ${e.quality.playing}${e.quality.profile ? ` (profile ${e.quality.profile})` : ""} · ${e.quality.choice === "auto" ? `auto, step ${e.quality.autoStep}` : "pinned"}` : "",
			e.auto ? `auto · target ${e.auto.target} s (level ${e.auto.level}) · rate ${e.auto.rate}` : `buffer mode ${e.buffer}`,
			n ? `frames ${n.decodedFrames ?? "-"} · dropped ${n.droppedFrames ?? "-"}` : "",
			e.lastError ? `last error ${e.lastError}` : "",
			`channels ${e.channels.state} (${e.channels.count})`,
			`muted ${e.muted}${e.mutedByPolicy ? " (autoplay policy)" : ""}`,
			`health ${jt(this.health, Date.now())}`,
			...Nt(this.health, 3)
		].filter(Boolean).join("\n");
	}
};
Q = $t, Q.styles = Gt, Q.properties = {
	preview: { type: Boolean },
	editMode: { type: Boolean },
	_ui: { state: !0 }
};
//#endregion
//#region src/index.ts
var en = Be();
en.counters ?? (en.counters = Y), customElements.get("stream-card") || customElements.define(se, $t);
var $ = window;
$.customCards = $.customCards ?? [], $.customCards.some((e) => e.type === "stream-card") || $.customCards.push({
	type: se,
	name: ce,
	description: "Plays Dispatcharr IPTV channels and releases the stream when it is hidden.",
	preview: !1,
	documentationURL: "https://github.com/Dec64/ha-video-card"
}), console.info(`%c STREAM-CARD %c ${_} `, "color:#fff;background:#1565c0;font-weight:700", "color:#1565c0;background:#fff");
//#endregion

//# sourceMappingURL=stream-card.js.map