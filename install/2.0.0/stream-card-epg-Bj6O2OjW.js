//#region src/epg.ts
var e = 72e5, t = 3e5, n = 6e4, r = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*(?:([+-])(\d{2}):?(\d{2}))?/;
function i(e) {
	let t = e ? r.exec(e.trim()) : null;
	if (t) return Date.UTC(+t[1], t[2] - 1, +t[3], +t[4], +t[5], +(t[6] ?? 0)) - (t[7] ? (t[7] === "-" ? -1 : 1) * (t[8] * 60 + +t[9]) * 6e4 : 0);
}
var a = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: "\"",
	apos: "'"
};
function o(e) {
	return e.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (e, t) => {
		if (t[0] === "#") {
			let n = t[1] === "x" || t[1] === "X" ? parseInt(t.slice(2), 16) : parseInt(t.slice(1));
			return Number.isFinite(n) ? String.fromCodePoint(n) : e;
		}
		return a[t.toLowerCase()] ?? e;
	});
}
var s = /([\w-]+)\s*=\s*"([^"]*)"/g, c = /<title\b[^>]*>([\s\S]*?)<\/title>/, l = "<programme", u = "</programme>", d = class {
	constructor(e = Date.now()) {
		this.from = e, this.buf = "", this.byChannel = /* @__PURE__ */ new Map();
	}
	push(e) {
		this.buf += e;
		let t = 0;
		for (;;) {
			let e = this.buf.indexOf(l, t);
			if (e < 0) {
				t = Math.max(t, this.buf.length - 10);
				break;
			}
			let n = this.buf.indexOf(u, e);
			if (n < 0) {
				t = e;
				break;
			}
			this.programme(this.buf.slice(e, n)), t = n + 12;
		}
		this.buf = this.buf.slice(t);
	}
	programme(e) {
		let t = e.indexOf(">");
		if (t < 0) return;
		let n = {};
		for (let r of e.slice(10, t).matchAll(s)) n[r[1]] = r[2];
		let r = n.channel === void 0 ? void 0 : o(n.channel), a = i(n.start), l = i(n.stop);
		if (!r || a === void 0 || l !== void 0 && l <= this.from || a >= this.from + 432e5) return;
		let u = o((c.exec(e.slice(t + 1))?.[1] ?? "").replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")).trim();
		if (!u) return;
		let d = this.byChannel.get(r);
		d || this.byChannel.set(r, d = []), d.push({
			title: u,
			start: a,
			end: l
		});
	}
	finish() {
		this.buf = "";
		for (let [t, n] of this.byChannel) {
			var e;
			n.sort((e, t) => e.start - t.start);
			for (let t = 0; t < n.length; t++) (e = n[t]).end ?? (e.end = n[t + 1]?.start);
			let r = n.filter((e) => e.end === void 0 || e.end > this.from);
			this.byChannel.set(t, r.slice(0, 8));
		}
		return this.byChannel;
	}
};
function f(e, t) {
	if (!e?.length) return;
	let n = e.findIndex((e) => e.end === void 0 || e.end > t);
	if (n < 0) return;
	let r = e[n];
	return r.start !== void 0 && r.start > t ? { next: r } : {
		now: r,
		next: e[n + 1]
	};
}
function p(e) {
	return e.tvgId ?? e.number;
}
var m = class extends Error {
	constructor(...e) {
		super(...e), this.name = "GuideError";
	}
};
async function h(e, t) {
	let n = await fetch(e, {
		cache: "no-store",
		signal: t
	});
	if (!n.ok) throw new m(`HTTP ${n.status}`);
	let r = new d();
	if (!n.body) return r.push(await n.text()), r.finish();
	let i = n.body.getReader(), a = new TextDecoder();
	for (;;) {
		let { done: e, value: t } = await i.read();
		if (e) break;
		r.push(a.decode(t, { stream: !0 }));
	}
	return r.push(a.decode()), r.finish();
}
var g = class {
	constructor(n) {
		this.url = n, this.loadedAt = 0, this.failedAt = 0, this.listeners = /* @__PURE__ */ new Set(), this.onVisible = () => {
			document.visibilityState === "visible" && this.tick();
		}, this.tick = () => {
			if (clearTimeout(this.timer), this.timer = void 0, !this.listeners.size) return;
			let n = Date.now(), r = this.failedAt ? n - this.failedAt >= t : !this.data || n - this.loadedAt >= e;
			r && !this.abort && document.visibilityState !== "hidden" && this.load();
			let i = r ? Infinity : this.failedAt ? this.failedAt + t : this.loadedAt + e, a = Math.min(this.nextBoundary(n) ?? Infinity, i);
			a !== Infinity && (this.timer = setTimeout(() => {
				this.notify(), this.tick();
			}, Math.max(1e3, a - n)));
		};
	}
	get loaded() {
		return !!this.data;
	}
	nowNext(e, t = Date.now()) {
		let n = p(e);
		return n === void 0 ? void 0 : f(this.data?.get(n), t);
	}
	subscribe(e) {
		return this.listeners.add(e), this.listeners.size === 1 && document.addEventListener("visibilitychange", this.onVisible), this.tick(), () => {
			this.listeners.delete(e) && !this.listeners.size && (document.removeEventListener("visibilitychange", this.onVisible), clearTimeout(this.timer), this.timer = void 0, this.abort?.abort(), this.abort = void 0);
		};
	}
	notify() {
		for (let e of [...this.listeners]) e();
	}
	nextBoundary(e) {
		let t;
		for (let n of this.data?.values() ?? []) {
			let { now: r, next: i } = f(n, e) ?? {};
			for (let n of [r?.end, i?.start]) n !== void 0 && n > e && (t === void 0 || n < t) && (t = n);
		}
		return t;
	}
	async load() {
		let e = new AbortController();
		this.abort = e;
		let t = setTimeout(() => e.abort(), n);
		try {
			let t = await h(this.url, e.signal);
			if (this.abort !== e) return;
			this.data = t, this.loadedAt = Date.now(), this.failedAt = 0, this.lastError = void 0;
		} catch (t) {
			if (this.abort !== e) return;
			this.failedAt = Date.now(), this.lastError = t instanceof m ? t.message : e.signal.aborted ? `no answer in ${n / 1e3} s` : `network error: ${t instanceof Error ? t.message : t}`;
		} finally {
			clearTimeout(t), this.abort === e && (this.abort = void 0);
		}
		this.notify(), this.tick();
	}
}, _ = /* @__PURE__ */ new Map();
function v(e) {
	let t = _.get(e);
	return t || _.set(e, t = new g(e)), t;
}
//#endregion
export { v as guideFeed };

//# sourceMappingURL=stream-card-epg-Bj6O2OjW.js.map