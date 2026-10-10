import { a as e, i as t, o as n, r, t as i } from "./stream-card-video-lock-8Ql6vIdM.js";
//#region src/engines/fetch-loader.ts
var a = {
	idle: 0,
	connecting: 1,
	buffering: 2,
	error: 3,
	complete: 4
}, o = {
	exception: "Exception",
	httpStatus: "HttpStatusCodeInvalid",
	earlyEof: "EarlyEof"
}, s = /* @__PURE__ */ new WeakMap();
function c(e) {
	let t = s.get(e);
	return t || (t = l(e.BaseLoader), s.set(e, t)), t;
}
function l(e) {
	return class extends e {
		constructor(e, t) {
			super("immediate-abort-fetch-loader"), this.seekHandler = e, this.config = t, this.aborted = !1, this.received = 0, this.contentLength = null, this._needStash = !0, t.onLoaderCreated?.(this);
		}
		destroy() {
			this.isWorking() && this.abort(), super.destroy();
		}
		open(e, t) {
			let n = this.seekHandler.getConfig(e.url, t), r = new Headers(), i = (e) => {
				if (e && typeof e == "object") for (let [t, n] of Object.entries(e)) r.append(t, n);
			};
			i(n.headers), i(this.config.headers), this.ctrl = new AbortController(), this._status = a.connecting;
			let s = {
				method: "GET",
				headers: r,
				mode: e.cors === !1 ? "same-origin" : "cors",
				cache: "default",
				credentials: e.withCredentials ? "include" : "same-origin",
				referrerPolicy: this.config.referrerPolicy ?? "no-referrer-when-downgrade",
				signal: this.ctrl.signal
			};
			fetch(n.url, s).then((e) => {
				if (this.aborted) {
					e.body?.cancel().catch(() => void 0);
					return;
				}
				if (!e.ok) {
					this._status = a.error, this.onError?.(o.httpStatus, {
						code: e.status,
						msg: e.statusText
					});
					return;
				}
				e.redirected && e.url !== n.url && this.onURLRedirect?.(this.seekHandler.removeURLParameters(e.url));
				let r = e.headers.get("Content-Length");
				if (r !== null && (this.contentLength = parseInt(r, 10), this.contentLength && this.onContentLengthKnown?.(this.contentLength)), !e.body) this._status = a.error, this.onError?.(o.exception, {
					code: -1,
					msg: "Response has no body"
				});
				else return this._status = a.buffering, this.reader = e.body.getReader(), this.pump(this.reader, t.from);
			}).catch((e) => this.fail(e));
		}
		async pump(e, t) {
			for (;;) {
				let { done: n, value: r } = await e.read();
				if (this.aborted) return;
				if (n) {
					this.contentLength !== null && this.received < this.contentLength ? (this._status = a.error, this.onError?.(o.earlyEof, {
						code: -1,
						msg: "Fetch stream ended early"
					})) : (this._status = a.complete, this.onComplete?.(t, t + this.received - 1));
					return;
				}
				let i = r.byteOffset === 0 && r.byteLength === r.buffer.byteLength ? r.buffer : r.buffer.slice(r.byteOffset, r.byteOffset + r.byteLength), s = t + this.received;
				this.received += i.byteLength, this.onDataArrival?.(i, s, this.received);
			}
		}
		fail(e) {
			if (this.aborted) {
				this._status = a.complete;
				return;
			}
			this._status = a.error;
			let t = e instanceof Error ? e.message : String(e), n = this.received > 0 ? o.earlyEof : o.exception;
			this.onError?.(n, {
				code: -1,
				msg: t
			});
		}
		abort() {
			if (!this.aborted) {
				this.aborted = !0;
				try {
					this.reader?.cancel().catch(() => void 0);
				} catch {}
				try {
					this.ctrl?.abort();
				} catch {}
				(this._status === a.connecting || this._status === a.buffering) && (this._status = a.complete);
			}
		}
	};
}
//#endregion
//#region src/engines/load-mpegts.ts
var u = "mpegts-1.8.2.js", d;
function f() {
	let e = window;
	return e.mpegts ? Promise.resolve(e.mpegts) : (d ?? (d = new Promise((t, n) => {
		let r = document.createElement("script");
		r.src = new URL(u, import.meta.url).href, r.async = !0, r.onload = () => {
			e.mpegts ? t(e.mpegts) : n(/* @__PURE__ */ Error(`${r.src} did not define window.mpegts`));
		}, r.onerror = () => {
			d = void 0, r.remove(), n(/* @__PURE__ */ Error(`Could not load ${r.src}`));
		}, document.head.appendChild(r);
	})), d);
}
//#endregion
//#region src/engines/mpegts-engine.ts
var p = {
	enableWorker: !1,
	isLive: !0,
	enableStashBuffer: !0,
	stashInitialSize: 262144,
	liveBufferLatencyChasing: !0,
	liveBufferLatencyMaxLatency: 6,
	liveBufferLatencyMinRemain: 1.5,
	autoCleanupSourceBuffer: !0,
	autoCleanupMaxBackwardDuration: 30,
	autoCleanupMinBackwardDuration: 15,
	lazyLoad: !1,
	statisticsInfoReportInterval: 1e3
}, m = !1;
function h(e) {
	try {
		return e.isSupported() && e.getFeatureList().mseLivePlayback;
	} catch {
		return !1;
	}
}
function g(e, t, n) {
	let r = `${e}/${t}${n?.msg ? `: ${n.msg}` : ""}`;
	if (e === "NetworkError") return t === "HttpStatusCodeInvalid" ? {
		kind: "http",
		status: n?.code,
		detail: r
	} : t === "UnrecoverableEarlyEof" ? {
		kind: "ended",
		detail: r
	} : {
		kind: "network",
		detail: r
	};
	if (e === "MediaError") {
		let e = /(audio|video)\/mp4;\s*codecs="?([^"')\s]+)/i.exec(n?.msg ?? "");
		return t === "MediaMSEError" && e && /unsupported|not supported/i.test(n?.msg ?? "") ? {
			kind: "codec",
			detail: r,
			track: e[1].toLowerCase(),
			codec: e[2]
		} : t === "CodecUnsupported" || t === "FormatUnsupported" ? {
			kind: "codec",
			detail: r
		} : {
			kind: "media",
			detail: r
		};
	}
	return {
		kind: "media",
		detail: r
	};
}
var _ = class {
	constructor(e = !1) {
		this.debug = e, this.kind = "mpegts", this.emitter = new n(), this.destroyed = !1, this.gotData = !1, this.speed = 0, this.loaders = /* @__PURE__ */ new Set();
	}
	on(e) {
		return this.emitter.on(e);
	}
	async load(e, t) {
		if (this.destroyed) return;
		let n;
		try {
			n = await f();
		} catch (e) {
			throw new r({
				kind: "media",
				detail: `player library: ${String(e)}`
			});
		}
		if (this.destroyed) return;
		if (!h(n)) throw new r({
			kind: "unsupported-device",
			detail: "mpegts.js: MediaSource / ManagedMediaSource live playback not available"
		});
		(!m || this.debug) && (m = !0, n.LoggingControl.applyConfig({
			enableAll: !1,
			enableError: !0,
			enableWarn: this.debug,
			enableInfo: this.debug
		}));
		let i = n.createPlayer({
			type: "mpegts",
			isLive: !0,
			url: t.url,
			cors: !0
		}, {
			...p,
			customLoader: c(n),
			onLoaderCreated: (e) => this.loaders.add(e)
		});
		this.player = i, this.video = e;
		let a = n.Events;
		i.on(a.ERROR, (e, t, n) => {
			this.emitter.emit({
				type: "error",
				error: g(e, t, n)
			});
		}), i.on(a.MEDIA_INFO, (e) => {
			this.markData(), this.emitter.emit({
				type: "media-info",
				videoCodec: e.videoCodec,
				audioCodec: e.audioCodec,
				hasVideo: e.hasVideo,
				hasAudio: e.hasAudio,
				width: e.width,
				height: e.height,
				fps: e.fps
			});
		}), i.on(a.STATISTICS_INFO, (e) => {
			this.speed = e.speed ?? 0, this.speed > 0 && this.markData();
		}), i.on(a.LOADING_COMPLETE, () => {
			this.emitter.emit({
				type: "error",
				error: {
					kind: "ended",
					detail: "Stream ended"
				}
			});
		}), i.attachMediaElement(e), i.load();
	}
	markData() {
		this.gotData || (this.gotData = !0, this.emitter.emit({ type: "data" }));
	}
	async destroy() {
		if (this.destroyed) return;
		this.destroyed = !0, this.emitter.clear();
		for (let e of this.loaders) e.abort();
		this.loaders.clear();
		let t = this.player, n = this.video;
		this.player = void 0, this.video = void 0, n?.pause();
		let r = new Promise((r) => {
			setTimeout(() => {
				if (t) for (let e of [
					() => t.pause(),
					() => t.unload(),
					() => t.detachMediaElement(),
					() => t.destroy()
				]) try {
					e();
				} catch {}
				n && e(n), r();
			}, 0);
		});
		n && i(n, r), await r;
	}
	getStats(e) {
		let n = e.getVideoPlaybackQuality?.();
		return {
			engine: "mpegts",
			bufferSeconds: t(e),
			decodedFrames: n?.totalVideoFrames,
			droppedFrames: n?.droppedVideoFrames,
			speedKBps: this.speed
		};
	}
};
//#endregion
export { _ as MpegtsEngine };

//# sourceMappingURL=stream-card-mpegts-engine-rPTAqmmc.js.map