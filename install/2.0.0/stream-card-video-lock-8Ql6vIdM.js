//#region src/engines/emitter.ts
var e = class {
	constructor() {
		this.listeners = /* @__PURE__ */ new Set();
	}
	on(e) {
		return this.listeners.add(e), () => this.listeners.delete(e);
	}
	emit(e) {
		for (let t of [...this.listeners]) try {
			t(e);
		} catch (e) {
			console.error("[stream-card] engine listener failed", e);
		}
	}
	clear() {
		this.listeners.clear();
	}
}, t = class extends Error {
	constructor(e) {
		super(e.detail), this.error = e;
	}
};
function n(e) {
	let t = e.buffered;
	for (let n = 0; n < t.length; n++) if (t.start(n) <= e.currentTime + .1 && t.end(n) >= e.currentTime) return Math.max(0, t.end(n) - e.currentTime);
	return 0;
}
function r(e) {
	try {
		e.pause();
	} catch {}
	e.removeAttribute("src");
	try {
		e.srcObject = null;
	} catch {}
	try {
		e.load();
	} catch {}
}
//#endregion
//#region src/engines/video-lock.ts
var i = /* @__PURE__ */ new WeakMap();
function a(e, t) {
	let n = i.get(e) ?? Promise.resolve(), r = Promise.all([n, t]).then(() => void 0);
	i.set(e, r), r.then(() => {
		i.get(e) === r && i.delete(e);
	});
}
function o(e) {
	return i.get(e) ?? Promise.resolve();
}
//#endregion
export { r as a, n as i, o as n, e as o, t as r, a as t };

//# sourceMappingURL=stream-card-video-lock-8Ql6vIdM.js.map