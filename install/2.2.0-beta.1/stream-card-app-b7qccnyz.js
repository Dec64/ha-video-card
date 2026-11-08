import { S as e, b as t, p as n, s as r, t as i, v as a, w as o, x as s, y as c } from "./stream-card-view-eVPgQdpV.js";
//#region node_modules/lit-html/directive.js
var l = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, u = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), d = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, { I: f } = s, p = (e) => e.strings === void 0, m = {}, h = (e, t = m) => e._$AH = t, g = u(class extends d {
	constructor() {
		super(...arguments), this.key = a;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (h(e), this.key = t), n;
	}
}), _ = u(class extends d {
	constructor(e) {
		if (super(e), e.type !== l.PROPERTY && e.type !== l.ATTRIBUTE && e.type !== l.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!p(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === c || t === a) return t;
		let n = e.element, r = e.name;
		if (e.type === l.PROPERTY) {
			if (t === n[r]) return c;
		} else if (e.type === l.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return c;
		} else if (e.type === l.ATTRIBUTE && n.getAttribute(r) === t + "") return c;
		return h(e), t;
	}
}), v = 6e4;
function y(e) {
	if (!e) return "";
	let t = e.indexOf(": ");
	return t > 0 && t < e.length - 2 ? e.slice(t + 2) : e;
}
function b(e) {
	return e.name.replace(/\s+(HD|UHD|FHD|SD|4K)$/i, "").trim() || e.name;
}
function x(e, t) {
	return e?.programmes(t) ?? [];
}
function S(e, t) {
	return e.find((e) => (e.start ?? 0) <= t && (e.end === void 0 || e.end > t));
}
function C(e, t) {
	return e.find((e) => (e.start ?? 0) > t);
}
function w(e, t) {
	return e?.start === void 0 || e.end === void 0 || e.end <= e.start ? 0 : Math.max(0, Math.min(100, (t - e.start) / (e.end - e.start) * 100));
}
function T(e) {
	let t = Math.max(0, Math.ceil(e / v));
	if (t < 60) return `${t} min`;
	let n = t % 60;
	return `${Math.floor(t / 60)} h${n ? ` ${n} m` : ""}`;
}
function E(e) {
	let t = new Date(e);
	return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function D(e) {
	if (!e?.cats?.length) return "";
	let [t, n] = e.cats;
	return /^movies?$/i.test(t) ? n ? `Film · ${n}` : "Film" : n && !/^(entertainment|sports?)$/i.test(n) ? n : n || t;
}
function O(e) {
	let t = `${e.group ?? ""} ${e.name}`;
	return /sport|football|golf|racing|tnt|dazn|eurosport/i.test(t) ? "sport" : /movie|cinema|film/i.test(t) ? "film" : /news|bloomberg|cnbc|parliament/i.test(t) ? "news" : /kid|child|cartoon|nick|disney|cbeebies|cbbc/i.test(t) ? "kids" : "other";
}
var k = (e, t) => /^movies?$/i.test(e.cats?.[0] ?? "") || O(t) === "film" && (e.end ?? 0) - (e.start ?? 0) >= 45e5, A = /sports? news|stories|greatest|revisited|retro|classics?|highlights|magazine|show$/i;
function j(e, t, n, r, i) {
	let a = [];
	for (let i of e.channels) for (let e of x(t, i)) (e.end ?? Infinity) <= n + 3e5 || r(e, i) && a.push({
		ch: i,
		p: e
	});
	a.sort((e, t) => Math.max(e.p.start ?? 0, n) - Math.max(t.p.start ?? 0, n) || Number(!!t.p.live) - Number(!!e.p.live) || Number(e.ch.number ?? 1e9) - Number(t.ch.number ?? 1e9));
	let o = /* @__PURE__ */ new Set();
	return a.filter((e) => {
		let t = e.p.title.toLowerCase();
		return !o.has(t) && (o.add(t), !0);
	}).slice(0, i);
}
function M(e, t, n) {
	let r = n + 360 * v;
	return j(e, t, n, (e, t) => (e.start ?? 0) < r && (O(t) === "sport" || /^sports?$/i.test(e.cats?.[0] ?? "")) && (!!e.live || !A.test(e.title)), 8);
}
function ee(e, t, n) {
	let r = n + 420 * v;
	return j(e, t, n, (e, t) => k(e, t) && (e.start ?? 0) >= n - 12e5 && (e.start ?? 0) < r, 8);
}
function te(e, t, n) {
	let r = n + 600 * v;
	return j(e, t, n, (e, t) => !!e.live && O(t) === "sport" && (e.start ?? 0) < r && (e.end ?? 0) - (e.start ?? 0) >= 54e5, 1)[0];
}
var N = (e) => `stream-card:favourites:${e}`;
function P(e) {
	try {
		let t = JSON.parse(localStorage.getItem(N(e)) ?? "null");
		return {
			add: t?.add ?? [],
			remove: t?.remove ?? []
		};
	} catch {
		return {
			add: [],
			remove: []
		};
	}
}
function F(e, t) {
	let n = P(t), r = e.favourites.filter((e) => !n.remove.includes(e.id));
	for (let t of n.add) {
		let n = e.find(t);
		n && !r.includes(n) && r.push(n);
	}
	return r;
}
function ne(e, t, n) {
	let r = P(t), i = F(e, t).includes(n);
	r.add = r.add.filter((e) => e !== n.id), r.remove = r.remove.filter((e) => e !== n.id);
	let a = e.favourites.includes(n);
	i && a && r.remove.push(n.id), !i && !a && r.add.push(n.id);
	try {
		r.add.length || r.remove.length ? localStorage.setItem(N(t), JSON.stringify(r)) : localStorage.removeItem(N(t));
	} catch {}
	return !i;
}
var I = /* @__PURE__ */ new Map();
function L(e) {
	let t = 0;
	for (let n of e) t = t * 31 + n.charCodeAt(0) >>> 0;
	let n = t % 360;
	return [`hsl(${n} 70% 55%)`, `hsl(${(n + 40) % 360} 60% 45%)`];
}
function R(e, t) {
	let n = e.logo;
	if (!n) return L(e.name);
	let r = I.get(n);
	if (Array.isArray(r)) return r;
	if (r === void 0) {
		let e = new Image();
		e.crossOrigin = "anonymous", I.set(n, new Promise((r) => {
			e.onload = () => {
				I.set(n, z(e)), r(), t();
			}, e.onerror = () => {
				I.set(n, null), r();
			};
		})), e.src = n;
	}
	return L(e.name);
}
function z(e) {
	try {
		let t = document.createElement("canvas");
		t.width = t.height = 24;
		let n = t.getContext("2d", { willReadFrequently: !0 });
		if (!n) return null;
		n.drawImage(e, 0, 0, 24, 24);
		let r = n.getImageData(0, 0, 24, 24).data, i = /* @__PURE__ */ new Map();
		for (let e = 0; e < r.length; e += 4) {
			let [t, n, a, o] = [
				r[e],
				r[e + 1],
				r[e + 2],
				r[e + 3]
			];
			if (o < 128) continue;
			let s = Math.max(t, n, a);
			if (s < 40 || s - Math.min(t, n, a) < 40) continue;
			let c = B(t, n, a), l = Math.round(c / 30) % 12, u = i.get(l) ?? {
				n: 0,
				r: 0,
				g: 0,
				b: 0
			};
			u.n++, u.r += t, u.g += n, u.b += a, i.set(l, u);
		}
		let a = [...i.values()].sort((e, t) => t.n - e.n);
		if (!a.length) return null;
		let o = (e) => `rgb(${Math.round(e.r / e.n)} ${Math.round(e.g / e.n)} ${Math.round(e.b / e.n)})`;
		return [o(a[0]), o(a[1] ?? a[0])];
	} catch {
		return null;
	}
}
function B(e, t, n) {
	let r = Math.max(e, t, n), i = r - Math.min(e, t, n) || 1;
	return ((r === e ? (t - n) / i % 6 : r === t ? (n - e) / i + 2 : (e - t) / i + 4) * 60 + 360) % 360;
}
function V(e, t) {
	if (e.readyState < 2 || !e.videoWidth) return null;
	try {
		t.width = 8, t.height = 4;
		let n = t.getContext("2d", { willReadFrequently: !0 });
		if (!n) return null;
		n.drawImage(e, 0, 0, 8, 4);
		let r = n.getImageData(0, 0, 8, 4).data, i = (e) => {
			let t = 0, n = 0, i = 0;
			for (let a = 0; a < 4; a++) for (let o = e; o < e + 4; o++) {
				let e = (a * 8 + o) * 4;
				t += r[e], n += r[e + 1], i += r[e + 2];
			}
			let a = Math.min(2.2, 220 / Math.max(40, Math.max(t, n, i) / 16));
			return `rgb(${Math.round(t / 16 * a)} ${Math.round(n / 16 * a)} ${Math.round(i / 16 * a)})`;
		};
		return [i(0), i(4)];
	} catch {
		return null;
	}
}
var H = typeof navigator < "u" && ((navigator.deviceMemory ?? 8) <= 2 || /KF[A-Z]{2,6}\b|Silk|Kindle/.test(navigator.userAgent)) || !1, U = o`
  :host([data-chrome='app']) {
    display: block;
    height: var(--sc-app-h, 100dvh);
  }
  ha-card.app {
    --ground: #0b0d12;
    --surface: rgba(255, 255, 255, 0.035);
    --surface-2: rgba(255, 255, 255, 0.06);
    --hair: rgba(255, 255, 255, 0.075);
    --text: #eef1f6;
    --muted: #9aa3b2;
    --faint: #848c9a;
    --tv: var(--stream-card-accent, #60a5fa);
    --tv-soft: color-mix(in srgb, var(--tv) 16%, transparent);
    --on-accent: #06101f;
    --live: #ff6b5e;
    --info: #7ee0d2;
    --glass: rgba(16, 18, 24, 0.62);
    --glass-solid: rgba(26, 29, 39, 0.95);
    --glass-muted: rgba(255, 255, 255, 0.76);
    --f-display: var(--stream-card-display-font, 'Outfit', var(--sc-font));
    --f-body: var(--stream-card-body-font, 'Figtree', var(--sc-font));
    --f-mono: var(--stream-card-mono-font, 'JetBrains Mono', var(--sc-mono));
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --exit: cubic-bezier(0.4, 0, 1, 1);
    position: relative;
    height: 100%;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: var(--ground);
    color: var(--text);
    font-family: var(--f-body);
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    container: app / inline-size;
    display: block;
  }
  ha-card.app.embed {
    height: auto;
    border-radius: var(--sc-radius);
    background: #000;
  }
  .app button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
  }
  .app button:focus-visible,
  .app [tabindex]:focus-visible {
    outline: 2px solid var(--info);
    outline-offset: 2px;
  }
  .app .mono {
    font-family: var(--f-mono);
  }
  .app .lab {
    font-family: var(--f-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--faint);
    font-weight: 500;
  }
  .app b {
    font-weight: 600;
    color: var(--text);
  }
  .app svg.icon {
    width: 22px;
    height: 22px;
  }
  .app .press {
    transition: transform 0.09s var(--ease);
  }
  .app .press:active {
    transform: scale(0.96);
  }

  /* glass */
  .app .glass {
    position: relative;
    border: 0;
    background: var(--glass);
    -webkit-backdrop-filter: blur(22px) saturate(160%);
    backdrop-filter: blur(22px) saturate(160%);
    color: #fff;
    box-shadow:
      0 10px 40px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  .app .glass::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.25px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.62),
      rgba(255, 255, 255, 0.1) 38%,
      rgba(255, 255, 255, 0.04) 62%,
      rgba(255, 255, 255, 0.3)
    );
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  .app.lite .glass {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: var(--glass-solid);
  }

  /* shared bits */
  .app .live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--f-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    font-weight: 500;
    color: #fff;
    padding: 4px 9px;
    border-radius: 99px;
    background: rgba(255, 107, 94, 0.18);
    box-shadow: inset 0 0 0 1px rgba(255, 107, 94, 0.45);
    line-height: 1.2;
  }
  .app .live::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--live);
    animation: sc-pulse 2.4s ease-in-out infinite;
  }
  @keyframes sc-pulse {
    50% {
      opacity: 0.35;
    }
  }
  .app .bar {
    display: block;
    height: 3px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.16);
    overflow: hidden;
  }
  .app .bar i {
    display: block;
    height: 100%;
    background: var(--tv);
    border-radius: inherit;
    transition: width 0.24s var(--ease);
  }
  .app .eq {
    display: inline-flex;
    gap: 2px;
    align-items: flex-end;
    height: 12px;
  }
  .app .eq i {
    width: 3px;
    background: var(--tv);
    border-radius: 1px;
    animation: sc-eq 1s ease-in-out infinite;
  }
  .app .eq i:nth-child(2) {
    animation-delay: -0.4s;
  }
  .app .eq i:nth-child(3) {
    animation-delay: -0.7s;
  }
  @keyframes sc-eq {
    0%,
    100% {
      height: 4px;
    }
    50% {
      height: 12px;
    }
  }
  .app.lite .eq i {
    animation: none;
    height: 8px;
  }

  /* logo plates */
  .app .lp {
    display: grid;
    place-items: center;
    min-width: 64px;
    max-width: 96px;
    height: 40px;
    border-radius: 10px;
    background: #15171d;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
    padding: 6px 8px;
    flex: none;
    box-sizing: border-box;
  }
  .app .lp img {
    display: block;
    max-width: 100%;
    max-height: 28px;
    object-fit: contain;
  }
  .app .lp .ini {
    font-family: var(--f-display);
    font-weight: 500;
    font-size: 14px;
  }
  .app .lp.sm {
    min-width: 54px;
    max-width: 84px;
    height: 34px;
    padding: 5px 7px;
    border-radius: 9px;
  }
  .app .lp.sm img {
    max-height: 24px;
  }
  .app .lp.xl {
    min-width: 0;
    max-width: none;
    height: 34px;
    background: none;
    box-shadow: none;
    padding: 0;
    display: block;
  }
  .app .lp.xl img {
    height: 100%;
    width: auto;
    max-width: 150px;
    max-height: none;
    filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45));
  }

  /* ---------- body and views ---------- */
  .app-body {
    position: absolute;
    inset: 0;
    /* Up and down only: the bias light and edge-to-edge rails reach past the sides, and on a
       phone that let the whole page slide sideways. Rails and favourites scroll on their own. */
    overflow: hidden auto;
    scrollbar-width: none;
    box-sizing: border-box;
  }
  .app-body::-webkit-scrollbar {
    display: none;
  }
  .app[data-view='now'] .app-body,
  .app[data-view='channels'] .app-body {
    padding: 30px 36px 200px;
    -webkit-mask: linear-gradient(#000 calc(100% - 248px), transparent calc(100% - 168px));
    mask: linear-gradient(#000 calc(100% - 248px), transparent calc(100% - 168px));
  }
  .app[data-view='now'] .app-body {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    grid-template-areas: 'band band' 'stage favs' 'rails rails';
    column-gap: 18px;
    align-content: start;
  }
  .app[data-view='guide'] .app-body {
    display: grid;
    grid-template-columns: minmax(0, 9fr) minmax(0, 8fr);
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas: 'stage det' 'tool tool' 'grid grid';
    gap: 18px;
    padding: 28px 36px 0;
    overflow: hidden;
  }
  .app[data-view='channels'] .app-body {
    display: block;
  }
  .app[data-view='channels'] .app-stage {
    display: none;
  }
  .app[data-view='full'] .app-body {
    overflow: hidden;
  }

  /* the stage in each view */
  .app-stage {
    grid-area: stage;
    position: relative;
    display: block;
    z-index: 1;
  }
  .app-stage .frame {
    position: relative;
    width: 100%;
    background: #000;
    overflow: hidden;
    isolation: isolate;
    color: #fff;
    outline: none;
  }
  .app-stage .video-host,
  .app-stage video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .app-stage video {
    object-fit: contain;
    background: #000;
  }
  .app[data-view='now'] .app-stage .frame,
  .app[data-view='guide'] .app-stage .frame {
    aspect-ratio: 16 / 9;
    border-radius: 22px;
    cursor: zoom-in;
  }
  .app[data-view='guide'] .app-stage .frame {
    border-radius: 20px;
  }
  .app[data-view='full'] .app-stage {
    position: absolute;
    inset: 0;
    z-index: 5;
  }
  .app[data-view='full'] .app-stage .frame {
    height: 100%;
  }
  .app.embed .app-body {
    position: relative;
    inset: auto;
    overflow: visible;
    padding: 0;
  }
  .app.embed .app-stage {
    position: relative;
    inset: auto;
  }
  .app.embed .app-stage .frame {
    height: auto;
    aspect-ratio: var(--sc-ar, 16 / 9);
  }
  .app.embed .app-stage .frame:fullscreen {
    aspect-ratio: auto;
  }
  .app-stage[hidden] {
    display: none;
  }
  .app-stage:fullscreen {
    background: #000;
  }
  .app-stage:fullscreen .frame {
    height: 100%;
    aspect-ratio: auto;
    border-radius: 0;
  }
  .app .mvwrap {
    position: absolute;
    inset: 0;
    z-index: 6;
    background: #000;
    display: flex;
  }
  .app .mvwrap > * {
    flex: 1;
  }

  /* bias light: the picture's colours spill onto the wall behind it */
  .app[data-view='now'] .app-stage::before {
    content: '';
    position: absolute;
    left: -6%;
    top: -14%;
    width: 112%;
    height: 128%;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(55% 55% at 30% 40%, var(--a1, var(--t1, transparent)), transparent 70%),
      radial-gradient(50% 55% at 75% 72%, var(--a2, var(--t2, transparent)), transparent 70%);
    filter: blur(60px);
    opacity: 0.45;
    animation: sc-amb 10s ease-in-out infinite alternate;
    transition: background 0.8s;
  }
  @keyframes sc-amb {
    to {
      transform: translate(1.5%, 2%) scale(1.04);
      opacity: 0.55;
    }
  }
  .app.lite[data-view='now'] .app-stage::before {
    filter: none;
    opacity: 0.16;
    animation: none;
  }

  /* ---------- band ---------- */
  .band {
    grid-area: band;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    margin-bottom: 22px;
  }
  .band h2 {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 52px;
    letter-spacing: -0.035em;
    line-height: 1;
    margin: 8px 0 10px;
  }
  .band h2 em {
    font-style: normal;
    color: var(--tv);
  }
  .band p {
    margin: 0;
    color: var(--muted);
    font-size: 16px;
  }
  .band .clock {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 46px;
    letter-spacing: -0.03em;
    line-height: 1;
    text-align: right;
    font-variant-numeric: tabular-nums;
    flex: none;
  }
  .band .clock small {
    display: block;
    font-family: var(--f-mono);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--faint);
    margin-top: 8px;
  }

  /* ---------- hero overlay ---------- */
  .app .over {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px 22px;
    background: linear-gradient(
      rgba(0, 0, 0, 0.35),
      transparent 30%,
      transparent 50%,
      rgba(0, 0, 0, 0.78)
    );
    pointer-events: none;
  }
  .app .over > *,
  .app .pover > * {
    pointer-events: auto;
  }
  .app .over .r {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
  }
  .app .idl {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .app .idl .lp.xl {
    height: 26px;
  }
  .app .idl .lab {
    color: rgba(255, 255, 255, 0.8);
  }
  .app .over h3 {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 38px;
    letter-spacing: -0.03em;
    margin: 6px 0 4px;
    line-height: 1;
  }
  .app .over .meta {
    color: rgba(255, 255, 255, 0.78);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .app .over .bar {
    margin-top: 12px;
    max-width: 360px;
  }
  .app .hb {
    display: flex;
    gap: 6px;
  }
  .app .hb button {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: grid;
    place-items: center;
  }

  /* guide preview overlay */
  .app .tl {
    position: absolute;
    left: 16px;
    top: 16px;
    z-index: 2;
    display: flex;
    gap: 8px;
  }
  .app .pover {
    position: absolute;
    inset: auto 0 0 0;
    padding: 18px 20px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.72));
    z-index: 2;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    pointer-events: none;
  }
  .app .pover .pt {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .app .pover .t {
    font-family: var(--f-display);
    font-weight: 500;
    font-size: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ---------- favourites and tiles ---------- */
  .favs {
    grid-area: favs;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
    contain: size;
    position: relative;
    z-index: 1;
  }
  .favs .h {
    grid-column: 1/-1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .favs .ttile {
    min-height: 0;
  }
  .favs .ttile .th {
    flex: 1 1 0;
    aspect-ratio: auto;
    min-height: 0;
  }
  .ttile {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    -webkit-touch-callout: none;
    user-select: none;
  }
  .ttile .th {
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: 14px;
    overflow: hidden;
    background: #000;
    box-shadow: 0 0 0 1px var(--hair);
  }
  .ttile.on .th {
    box-shadow: 0 0 0 2px var(--tv);
  }
  .ttile .th .tbar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    border-radius: 0;
    height: 3px;
  }
  .ttile .tt {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ttile .ts {
    font-size: 12px;
    color: var(--faint);
    font-family: var(--f-mono);
    margin-top: -6px;
    position: relative;
    overflow: hidden;
    height: 1.4em;
    line-height: 1.4em;
    font-variant-numeric: tabular-nums;
  }
  .ttile .ts span {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition:
      transform 0.24s var(--ease),
      opacity 0.24s;
  }
  .ttile .ts .b {
    position: absolute;
    inset: 0;
    opacity: 0;
    transform: translateY(100%);
    color: var(--muted);
  }
  @media (hover: hover) {
    .ttile:hover .ts .a {
      opacity: 0;
      transform: translateY(-100%);
    }
    .ttile:hover .ts .b {
      opacity: 1;
      transform: none;
    }
    .ttile:hover .th.lt img {
      transform: scale(1.04);
    }
  }
  .ttile:focus-visible .ts .a {
    opacity: 0;
    transform: translateY(-100%);
  }
  .ttile:focus-visible .ts .b {
    opacity: 1;
    transform: none;
  }
  .th.lt {
    display: grid;
    place-items: center;
    background:
      radial-gradient(
        110% 90% at 28% 18%,
        color-mix(in srgb, var(--c1) 34%, transparent),
        transparent 62%
      ),
      linear-gradient(160deg, #181b23, #0d0f14);
  }
  .th.lt img {
    max-width: 54%;
    max-height: 40%;
    object-fit: contain;
    filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.55));
    transition: transform 0.24s var(--ease);
  }
  .th .ini.big {
    font-family: var(--f-display);
    font-size: 30px;
    font-weight: 300;
  }
  .th.add {
    display: grid;
    place-items: center;
    background: var(--surface);
    color: var(--muted);
  }
  .th .wat {
    position: absolute;
    left: 8px;
    top: 8px;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--f-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    padding: 4px 9px;
    border-radius: 99px;
  }
  .th .when {
    position: absolute;
    right: 8px;
    top: 8px;
    z-index: 2;
    font-family: var(--f-mono);
    font-size: 11px;
    padding: 4px 9px;
    border-radius: 99px;
  }
  .lvc {
    position: absolute;
    right: 8px;
    top: 8px;
    z-index: 2;
    font-family: var(--f-mono);
    font-size: 10px;
    letter-spacing: 0.12em;
    padding: 3px 8px;
    border-radius: 99px;
    background: var(--live);
    color: #fff;
  }
  .lvc.left {
    right: auto;
    left: 8px;
  }

  /* rails */
  .rails {
    grid-area: rails;
  }
  .railh {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 30px 0 12px;
  }
  .railh h4 {
    margin: 0;
    font-family: var(--f-display);
    font-weight: 500;
    font-size: 20px;
    letter-spacing: -0.01em;
  }
  .railr {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: calc((100% - 3 * 14px) / 4);
    gap: 14px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    padding: 2px;
    margin: -2px;
  }
  .railr::-webkit-scrollbar {
    display: none;
  }
  .railr > * {
    scroll-snap-align: start;
  }

  /* ---------- guide ---------- */
  .det {
    grid-area: det;
    background: var(--surface);
    border: 1px solid var(--hair);
    border-radius: 20px;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    font-variant-numeric: tabular-nums;
  }
  .det .dh {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .det h3 {
    font-family: var(--f-display);
    font-weight: 500;
    font-size: 28px;
    letter-spacing: -0.02em;
    margin: 10px 0 4px;
    line-height: 1.1;
  }
  .det .meta {
    color: var(--muted);
    font-size: 14px;
  }
  .det .bar {
    margin-top: 14px;
  }
  .det .desc {
    color: var(--muted);
    font-size: 14px;
    margin: 12px 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .det .then {
    display: grid;
    gap: 2px;
    margin-top: 12px;
  }
  .det .then div {
    display: grid;
    grid-template-columns: 52px 1fr;
    font-size: 13px;
    color: var(--muted);
    padding: 3px 0;
  }
  .det .then .mono {
    color: var(--faint);
  }
  .det .acts {
    display: flex;
    gap: 8px;
    margin-top: auto;
    padding-top: 16px;
    flex-wrap: wrap;
  }
  .app .btn {
    height: 44px;
    padding: 0 16px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    background: var(--surface-2);
    color: var(--text);
  }
  .app .btn svg.icon {
    width: 18px;
    height: 18px;
  }
  .app .btn.pri {
    background: var(--tv);
    color: var(--on-accent);
  }
  .app .btn.done {
    background: rgba(126, 224, 210, 0.14);
    color: var(--info);
    box-shadow: inset 0 0 0 1px rgba(126, 224, 210, 0.4);
  }
  .app .btn[aria-pressed='true'] svg {
    color: #f5b83d;
  }
  .app .btn[disabled] {
    cursor: default;
  }
  .tool {
    grid-area: tool;
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }
  .tool .jumps {
    display: flex;
    gap: 6px;
    flex: none;
  }
  .app .gchips {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    min-width: 0;
    flex: 1;
    -webkit-mask: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
    mask: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
  }
  .app .gchips::-webkit-scrollbar {
    display: none;
  }
  .app .gc {
    height: 34px;
    padding: 0 13px;
    border-radius: 99px;
    font-size: 13px;
    font-weight: 500;
    background: var(--surface-2);
    color: var(--muted);
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
  }
  .app .gc[aria-pressed='true'] {
    background: var(--tv);
    color: var(--on-accent);
  }
  .app .gc svg.icon {
    width: 14px;
    height: 14px;
  }
  .app .search {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    border-radius: 14px;
    padding: 0 14px;
    background: var(--surface-2);
    color: var(--faint);
    font-size: 14px;
    flex: none;
    width: 260px;
    box-sizing: border-box;
  }
  .app .search svg.icon {
    width: 18px;
    height: 18px;
  }
  .app .search input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: none;
    color: var(--text);
    font: inherit;
  }
  .app .search input::placeholder {
    color: var(--faint);
  }
  .app .search:focus-within {
    box-shadow: inset 0 0 0 2px var(--tv);
  }
  .grid {
    grid-area: grid;
    position: relative;
    border-radius: 18px 18px 0 0;
    border: 1px solid var(--hair);
    border-bottom: 0;
    background: var(--surface);
    overflow: hidden;
    -webkit-mask: linear-gradient(#000 calc(100% - 190px), transparent calc(100% - 110px));
    mask: linear-gradient(#000 calc(100% - 190px), transparent calc(100% - 110px));
  }
  .gscroll {
    position: absolute;
    inset: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  }
  .gin {
    position: relative;
  }
  .ruler {
    position: sticky;
    top: 0;
    z-index: 4;
    height: 32px;
    background: #12151c;
    border-bottom: 1px solid var(--hair);
  }
  .ruler .corner {
    position: sticky;
    left: 0;
    top: 0;
    display: block;
    width: var(--nw, 196px);
    height: 31px;
    background: #12151c;
    border-right: 1px solid var(--hair);
    z-index: 6;
  }
  .ruler span {
    position: absolute;
    top: 9px;
    font-family: var(--f-mono);
    font-size: 11px;
    color: var(--faint);
    transform: translateX(6px);
  }
  .ruler span::before {
    content: '';
    position: absolute;
    left: -6px;
    top: -9px;
    height: 32px;
    width: 1px;
    background: var(--hair);
  }
  .ruler span.gone {
    visibility: hidden;
  }
  .ruler .nowtag {
    top: 6px;
    z-index: 5;
    transform: translateX(-50%);
    color: #fff;
    background: var(--live);
    padding: 1px 6px;
    border-radius: 6px;
  }
  .ruler .nowtag::before {
    display: none;
  }
  .grow {
    position: absolute;
    left: 0;
    height: 52px;
    border-bottom: 1px solid var(--hair);
    box-sizing: border-box;
  }
  .app .gname {
    position: sticky;
    left: 0;
    z-index: 3;
    width: var(--nw, 196px);
    height: 51px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    background: #12151c;
    border-right: 1px solid var(--hair);
    font-size: 13px;
    font-weight: 600;
    text-align: left;
    box-sizing: border-box;
  }
  .app .gname .gn {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .app .gname .mono {
    color: var(--faint);
    font-weight: 400;
    font-size: 11px;
    display: block;
  }
  .app .gname.on {
    box-shadow: inset 3px 0 0 var(--tv);
  }
  .cell {
    position: absolute;
    top: 5px;
    height: 41px;
    border-radius: 10px;
    padding: 5px 10px !important;
    background: var(--surface-2) !important;
    font-size: 13px;
    overflow: clip;
    white-space: nowrap;
    text-align: left;
    color: var(--text);
    box-sizing: border-box;
    display: block;
    line-height: 1.35;
  }
  .cell small {
    display: block;
    font-family: var(--f-mono);
    font-size: 10px;
    color: var(--faint);
    letter-spacing: 0.04em;
  }
  .cell .cx {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-left: var(--sh, 0px);
    transition: opacity 0.16s;
  }
  .cell.gone .cx {
    opacity: 0;
  }
  .cell.past {
    opacity: 0.45;
  }
  .cell.now {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--tv) 20%, transparent) var(--p),
      rgba(255, 255, 255, 0.075) var(--p)
    ) !important;
  }
  .cell.sel {
    box-shadow: inset 0 0 0 2px var(--tv);
  }
  .cell.empty {
    color: var(--faint);
    background: none !important;
  }
  .cell .lvd {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--live);
    margin-right: 6px;
    vertical-align: 1px;
  }
  .nowline {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--live);
    z-index: 2;
    pointer-events: none;
  }

  /* ---------- channels ---------- */
  .bar2 {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
  }
  .bar2 .search {
    width: 340px;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px 14px;
  }
  .app .row {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    padding: 9px 8px;
    border-radius: 14px;
    text-align: left;
    -webkit-touch-callout: none;
    user-select: none;
  }
  .cols .row {
    background: var(--surface);
    border: 1px solid var(--hair);
  }
  .app .row:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  .app .row.on {
    background: var(--tv-soft);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tv) 45%, transparent);
  }
  .app .row .lp {
    width: 76px;
    min-width: 0;
    max-width: none;
  }
  .app .row .rm {
    display: grid;
    min-width: 0;
  }
  .app .row .nm {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
  }
  .app .row .nm .mono {
    font-size: 12px;
    color: var(--glass-muted);
    font-weight: 400;
  }
  .app .row .fav svg {
    width: 12px;
    height: 12px;
    color: #f5b83d;
  }
  .app .row .pg {
    font-size: 13px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 1px 0 6px;
  }
  .app .row .bar {
    height: 2px;
  }
  .app .row .nx {
    font-size: 12px;
    color: var(--faint);
    text-align: right;
    white-space: nowrap;
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .app .row .nx .mono {
    display: block;
    color: var(--glass-muted);
  }

  /* ---------- theatre ---------- */
  .app .scrim {
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
    transition: opacity 0.24s var(--ease);
    z-index: 2;
  }
  .app .scrim.t {
    top: 0;
    height: 300px;
    background: linear-gradient(rgba(5, 6, 10, 0.78), rgba(5, 6, 10, 0.35) 55%, transparent);
  }
  .app .scrim.b {
    bottom: 0;
    height: 220px;
    background: linear-gradient(transparent, rgba(5, 6, 10, 0.7));
  }
  .app .fade {
    transition:
      opacity 0.24s var(--ease),
      transform 0.24s var(--ease);
  }
  .app .frame.calm .fade,
  .app .frame.calm .scrim,
  .app .frame.calm .dockpill {
    opacity: 0;
    pointer-events: none;
  }
  .app .frame.calm .fade {
    transform: translateY(8px);
  }
  .app .frame.calm .t-ctl {
    transform: translate(-50%, 10px);
  }
  .app[data-view='full'] .frame.calm {
    cursor: none;
  }
  .app .t-ident {
    position: absolute;
    left: 48px;
    top: 40px;
    width: min(560px, calc(100% - 96px));
    z-index: 3;
  }
  .app .t-ident .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0;
  }
  .app .t-ident .row:hover {
    background: none;
  }
  .app .t-ident .row .lab {
    color: var(--glass-muted);
  }
  .app .t-ident h3 {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 56px;
    line-height: 1;
    letter-spacing: -0.03em;
    margin: 18px 0 10px;
    text-wrap: balance;
  }
  .app .t-ident .meta {
    color: var(--glass-muted);
    font-size: 16px;
    font-variant-numeric: tabular-nums;
  }
  .app .t-ident .bar {
    margin: 16px 0 14px;
    width: 340px;
    max-width: 100%;
  }
  .app .t-ident .next {
    display: flex;
    gap: 12px;
    align-items: baseline;
    font-size: 16px;
    color: var(--glass-muted);
  }
  .app .t-ident .next .lab {
    color: var(--glass-muted);
  }
  .app .tr {
    position: absolute;
    right: 40px;
    top: 36px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    z-index: 3;
  }
  .app .tr .clock {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 46px;
    letter-spacing: -0.03em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .app .tr .chips {
    display: flex;
    gap: 8px;
  }
  .app .chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 13px;
    border-radius: 99px;
    font-size: 13px;
    font-weight: 500;
  }
  .app .chip svg.icon {
    width: 16px;
    height: 16px;
  }
  .app .t-ctl {
    position: absolute;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    height: 68px;
    padding: 0 10px;
    border-radius: 24px;
    z-index: 4;
    max-width: calc(100% - 24px);
    box-sizing: border-box;
  }
  .app .cb {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    color: #fff;
    position: relative;
    flex: none;
  }
  .app .cb:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .app .cb[aria-pressed='true'] {
    background: var(--tv-soft);
    color: var(--tv);
  }
  .app .cb.wide {
    width: auto;
    padding: 0 14px;
    display: flex;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    align-items: center;
  }
  .app .cb.wide span {
    line-height: 1.2;
    text-align: left;
    white-space: nowrap;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .app .cb.wide small {
    color: var(--glass-muted);
    font-size: 12px;
    font-family: var(--f-mono);
  }
  .app .cb.main {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #fff;
    color: #0b0d12;
  }
  .app .sep {
    width: 1px;
    height: 30px;
    background: rgba(255, 255, 255, 0.14);
    margin: 0 6px;
    flex: none;
  }
  .app .vol {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 8px 0 0;
  }
  .app .vtrack {
    -webkit-appearance: none;
    appearance: none;
    width: 96px;
    height: 4px;
    border-radius: 4px;
    background: linear-gradient(90deg, #fff var(--vol), rgba(255, 255, 255, 0.2) var(--vol));
    margin: 0;
    cursor: pointer;
  }
  .app .vtrack::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  .app .vtrack::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border: 0;
    border-radius: 50%;
    background: #fff;
  }
  @keyframes sc-in {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
  }
  .app .rail {
    position: absolute;
    right: 20px;
    top: 20px;
    bottom: 110px;
    width: 400px;
    max-width: calc(100% - 40px);
    border-radius: 26px;
    padding: 18px 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: sc-in 0.42s var(--ease);
    z-index: 6;
    box-sizing: border-box;
  }
  .app .rail .hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 6px;
  }
  .app .rail .hd h4 {
    margin: 0;
    font-family: var(--f-display);
    font-weight: 500;
    font-size: 20px;
  }
  .app .rail .search {
    width: auto;
    background: rgba(255, 255, 255, 0.07);
  }
  .app .rail .gchips {
    flex: none;
  }
  .app .rail .gc:not([aria-pressed='true']) {
    background: rgba(255, 255, 255, 0.07);
    color: var(--glass-muted);
  }
  .app .rail .list {
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0 -4px;
    padding: 0 4px;
    scrollbar-width: none;
  }
  .app .rail .row {
    grid-template-columns: 64px minmax(0, 1fr) auto;
  }
  .app .rail .row .lp {
    width: 64px;
  }
  .app .x {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.08);
  }
  .app .t-osd {
    position: absolute;
    right: 48px;
    top: 130px;
    text-align: right;
    animation: sc-in 0.24s var(--ease);
    z-index: 4;
  }
  .app .t-osd .d {
    font-family: var(--f-display);
    font-weight: 200;
    font-size: 120px;
    line-height: 0.9;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
  }
  .app .t-osd .d span {
    opacity: 0.35;
  }
  .app .t-osd .m {
    color: var(--glass-muted);
    font-size: 15px;
    margin-top: 8px;
  }
  .app .kp {
    position: absolute;
    right: 20px;
    bottom: 110px;
    width: 252px;
    padding: 12px;
    border-radius: 24px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    animation: sc-in 0.24s var(--ease);
    z-index: 6;
    box-sizing: border-box;
  }
  .app .kp button {
    height: 56px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.07);
    font-family: var(--f-display);
    font-size: 24px;
    font-weight: 300;
  }
  .app .kp button:hover {
    background: rgba(255, 255, 255, 0.14);
  }
  .app .menu {
    position: absolute;
    bottom: 108px;
    left: 50%;
    padding: 14px;
    border-radius: 22px;
    width: 300px;
    transform: translateX(30px);
    animation: sc-in 0.24s var(--ease);
    z-index: 6;
    box-sizing: border-box;
  }
  .app .menu .lab {
    display: block;
    margin: 2px 4px 10px;
    color: var(--glass-muted);
  }
  .app .menu .opts {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  .app .menu .opts button {
    min-height: 46px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.07);
    font-size: 14px;
    font-weight: 500;
    padding: 6px 10px;
  }
  .app .menu .opts button[aria-pressed='true'] {
    background: var(--tv);
    color: var(--on-accent);
  }
  .app .menu .opts button.full {
    grid-column: 1/-1;
  }
  .app .menu .opts small {
    display: block;
    font-size: 11px;
    font-family: var(--f-mono);
    opacity: 0.75;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* The settings panel, laid over the picture: under the chips in full screen, under the
     hero's buttons on On now, above the control bar in the embed. It scrolls inside when the
     picture is shorter than the panel (a long Quality list on a phone). */
  .app .setwrap {
    position: absolute;
    inset: 0;
    z-index: 6;
    pointer-events: none;
  }
  .app .setwrap .settings-panel {
    position: absolute;
    right: 40px;
    top: 130px;
    bottom: auto;
    left: auto;
    transform: none;
    width: min(300px, calc(100% - 32px));
    max-height: calc(100% - 150px);
    pointer-events: auto;
  }
  .app .setwrap.at-hero .settings-panel {
    right: 16px;
    top: 74px;
    max-height: calc(100% - 90px);
  }
  .app .setwrap.at-embed .settings-panel {
    right: 16px;
    top: 16px;
    max-height: calc(100% - 110px);
  }
  .app .dockpill {
    position: absolute;
    right: 18px;
    bottom: 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 58px;
    padding: 0 16px 0 7px;
    border-radius: 99px;
    z-index: 4;
    transition: opacity 0.24s var(--ease);
  }
  .app .orb {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: radial-gradient(
      circle at 35% 30%,
      color-mix(in srgb, var(--tv) 45%, #fff),
      var(--tv) 55%,
      color-mix(in srgb, var(--tv) 70%, #000)
    );
    color: var(--on-accent);
    box-shadow: 0 0 18px color-mix(in srgb, var(--tv) 50%, transparent);
    flex: none;
  }
  .app .dockpill .t,
  .app .cdock .orbw .t {
    white-space: nowrap;
    font-family: var(--f-mono);
    font-size: 12px;
    letter-spacing: 0.06em;
  }

  /* zap ident and number entry */
  .app .zap {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    pointer-events: none;
    background: radial-gradient(40% 50% at 50% 50%, rgba(0, 0, 0, 0.45), transparent 70%);
    animation: sc-zap 0.9s var(--ease) both;
  }
  .app .zap img {
    height: 56px;
    width: auto;
    max-width: 46%;
    object-fit: contain;
    filter: drop-shadow(0 6px 24px rgba(0, 0, 0, 0.6));
  }
  .app .zap b {
    font-family: var(--f-display);
    font-weight: 300;
    font-size: 40px;
  }
  .app .zap span {
    font-family: var(--f-mono);
    font-size: 12px;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.8);
  }
  @keyframes sc-zap {
    0% {
      opacity: 0;
      transform: scale(0.94);
    }
    18% {
      opacity: 1;
      transform: none;
    }
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: scale(1.02);
    }
  }
  .app .numosd {
    position: absolute;
    right: 18px;
    top: 18px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 18px 12px 16px;
    border-radius: 18px;
    animation: sc-in 0.24s var(--spring);
  }
  .app .numosd .d {
    font-family: var(--f-mono);
    font-size: 26px;
    letter-spacing: 0.12em;
  }
  .app .numosd .nm {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.25;
  }
  .app .numosd .nm small {
    display: block;
    font-weight: 400;
    color: var(--muted);
    font-size: 12px;
  }
  .app .numosd .dim {
    color: var(--muted);
  }
  .app .toast {
    position: absolute;
    left: 50%;
    top: 28px;
    transform: translateX(-50%);
    padding: 10px 16px;
    border-radius: 99px;
    font-size: 14px;
    font-weight: 500;
    z-index: 40;
    animation: sc-in 0.24s var(--ease);
  }

  /* the card's state layers (tuning, errors) inside the app's frames */
  .app .frame .layer {
    z-index: 3;
  }
  /* The zap ident and the app's own ident name the channel; tuning keeps only its spinner. */
  .app .layer.tuning .tuning-logo,
  .app .layer.tuning .tuning-name {
    display: none;
  }
  .app .layer.tuning .tuning-status {
    transform: translateY(56px);
  }
  .app[data-view='full'] .layer.tuning .tuning-status {
    transform: translateY(84px);
  }

  /* ---------- dock ---------- */
  .app .cdock {
    position: absolute;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    height: 72px;
    padding: 0 10px 0 9px;
    border-radius: 99px;
    z-index: 30;
    animation: sc-dock 0.5s var(--spring);
  }
  /* The household dock, opened from the orb, stands in for the app dock until it folds. */
  .app[data-hd-open] .cdock,
  .app[data-hd-open] .dockpill {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  }
  @keyframes sc-dock {
    from {
      opacity: 0;
      translate: 0 16px;
      scale: 0.92;
    }
  }
  .app .cdock .orbw {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-right: 12px;
    margin-right: 4px;
    border-right: 1px solid rgba(255, 255, 255, 0.14) !important;
    height: 44px;
  }
  .app .cdock .tab {
    white-space: nowrap;
    height: 52px;
    padding: 0 16px;
    border-radius: 99px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--glass-muted);
  }
  .app .cdock .tab.sel {
    color: #fff;
    background: color-mix(in srgb, var(--tv) 20%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--tv) 50%, transparent),
      0 6px 20px color-mix(in srgb, var(--tv) 25%, transparent);
  }

  /* ---------- embed (FPL Home) ---------- */
  .app.embed .t-ctl {
    bottom: 18px;
    height: 60px;
  }
  .app.embed .cb {
    width: 46px;
    height: 46px;
  }
  .app.embed .cb.main {
    width: 50px;
    height: 50px;
  }

  /* ---------- narrow screens (phones) ---------- */
  @container app (max-width: 760px) {
    .app[data-view='now'] .app-body,
    .app[data-view='channels'] .app-body {
      padding: 20px 16px 170px;
    }
    .app[data-view='now'] .app-body {
      display: block;
    }
    .band {
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .band h2 {
      font-size: 36px;
    }
    .band p {
      font-size: 14px;
    }
    .band .clock {
      font-size: 30px;
    }
    .app .over h3 {
      font-size: 24px;
    }
    .app .over {
      padding: 14px;
    }
    .app .over .meta {
      font-size: 12px;
    }
    .app .hb button {
      width: 40px;
      height: 40px;
    }
    .favs {
      contain: none;
      margin-top: 18px;
      grid-template-columns: none;
      grid-template-rows: none;
      grid-auto-flow: column;
      grid-auto-columns: 200px;
      gap: 14px;
      overflow-x: auto;
      scrollbar-width: none;
      scroll-snap-type: x mandatory;
      padding-top: 30px;
    }
    .favs .h {
      grid-column: auto;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }
    .favs .ttile {
      min-height: auto;
      scroll-snap-align: start;
    }
    .favs .ttile .th {
      flex: none;
      aspect-ratio: 16 / 9;
    }
    .railr {
      grid-auto-columns: 200px;
    }
    .app[data-view='guide'] .app-body {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto auto minmax(0, 1fr);
      grid-template-areas: 'stage' 'det' 'tool' 'grid';
      padding: 12px 12px 0;
      gap: 10px;
    }
    .det {
      padding: 12px 14px;
    }
    .det h3 {
      font-size: 20px;
      margin: 6px 0 2px;
    }
    .det .desc,
    .det .then {
      display: none;
    }
    .det .acts {
      padding-top: 10px;
    }
    .tool {
      flex-wrap: wrap;
      gap: 8px;
    }
    .tool .jumps {
      display: none;
    }
    .app .search,
    .bar2 .search {
      width: 100%;
    }
    .gin {
      --nw: 120px;
    }
    .gname .lp {
      display: none;
    }
    .bar2 {
      flex-direction: column;
      align-items: stretch;
    }
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
    .app .t-ident {
      left: 18px;
      top: 18px;
    }
    .app .t-ident h3 {
      font-size: 30px;
      margin: 10px 0 6px;
    }
    .app .t-ident .meta,
    .app .t-ident .next {
      font-size: 13px;
    }
    .app .tr {
      right: 16px;
      top: 16px;
    }
    .app .tr .clock {
      font-size: 28px;
    }
    .app .tr .chips {
      display: none;
    }
    .app .t-ctl {
      bottom: 86px;
      height: 58px;
      gap: 0;
      padding: 0 6px;
    }
    .app .cb {
      width: 42px;
      height: 42px;
    }
    .app .cb.main {
      width: 46px;
      height: 46px;
    }
    .app .cb.wide span,
    .app .t-ctl .cb.kpb,
    .app .t-ctl .cb.mvb,
    .app .vtrack,
    .app .t-ctl .sep {
      display: none;
    }
    .app .cb.wide {
      padding: 0 9px;
    }
    .app .dockpill {
      left: 16px;
      right: 16px;
      bottom: 16px;
      justify-content: center;
    }
    .app .cdock {
      left: 12px;
      right: 12px;
      bottom: 16px;
      transform: none;
      height: 64px;
      justify-content: space-around;
      padding: 0 8px;
    }
    .app .cdock .orbw {
      border: 0 !important;
      padding: 0;
      margin: 0;
    }
    .app .cdock .orbw .t,
    .app .cdock .tab span {
      display: none;
    }
    .app .cdock .tab {
      width: 48px;
      height: 48px;
      padding: 0;
      justify-content: center;
    }
    .app .rail,
    .app .kp {
      right: 10px;
      left: 10px;
      width: auto;
      bottom: 156px;
    }
    .app .menu {
      left: 10px;
      right: 10px;
      width: auto;
      transform: none;
      bottom: 156px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .app .zap {
      animation-duration: 0.01ms;
    }
    .app[data-view='now'] .app-stage::before,
    .app .live::before,
    .app .eq i {
      animation: none;
    }
  }
`;
//#endregion
//#region src/app/host.ts
function W(e) {
	let t = e;
	return {
		el: e,
		video: t.video,
		get config() {
			return t.config;
		},
		get list() {
			return t.channels;
		},
		get guide() {
			return t.guide;
		},
		get current() {
			return t.currentChannel;
		},
		get multiview() {
			return t.mvOn ? t.mv : void 0;
		},
		play: (e) => t.playChannel(e),
		refresh: () => t.refresh(),
		frameClick: () => t.onFrameClick(),
		wake: () => t.showControls(),
		deleteDigit: () => t.deleteDigit(),
		handleKey: (e) => t.onKeyDown(e)
	};
}
//#endregion
//#region src/app/app.ts
var G = 52, K = [
	"sport",
	"film",
	"news",
	"kids"
], q = {
	sport: "Sports",
	film: "Movies",
	news: "News",
	kids: "Kids",
	other: "Other"
}, J = 550, Y = 360, X = [
	15,
	30,
	60
], re = e`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>`, Z = (e) => e.stopPropagation(), Q = (e) => t`<span class="mono">${e}</span>`, ie = class {
	constructor(e) {
		this.host = e, this.view = "now", this.from = "now", this.guideGroup = "", this.guideQuery = "", this.guideFirst = 0, this.guideScrolled = !1, this.chGroup = "", this.chQuery = "", this.rail = !1, this.railGroup = "★", this.railQuery = "", this.keypad = !1, this.toastText = "", this.zapCount = 0, this.pressed = !1, this.ambCanvas = document.createElement("canvas"), this.deepLinked = !1, this.hidDock = !1, this.fit = () => {
			let e = this.host.el, t = e.getBoundingClientRect(), n = Math.max(0, t.top);
			e.style.setProperty("--sc-app-h", `${Math.round(Math.max(420, window.innerHeight - n))}px`);
		}, this.syncHouseholdDock = () => {
			let e = this.householdDock(), t = this.host.el, n = t.isConnected && t.getClientRects().length > 0;
			if (!e || !n) return this.releaseHouseholdDock();
			let r = e.folded === !1;
			r ? this.hidDock && (e.style.display = "") : (e.style.display = "none", this.hidDock = !0), t.shadowRoot?.querySelector("ha-card")?.toggleAttribute("data-hd-open", r);
		}, this.openHouseholdDock = (e) => {
			e.stopPropagation();
			let t = this.householdDock();
			t && (t.folded = !1, t.sw = !1, t.render?.(), this.syncHouseholdDock());
		}, this.foldHouseholdDock = () => {
			let e = this.householdDock();
			e && e.folded === !1 && !e.sw && (e.folded = !0, e.render?.(), this.syncHouseholdDock());
		}, this.onDocKey = (e) => {
			let t = e.target;
			t && t !== document.body && t !== document.documentElement || !this.host.el.isConnected || this.host.el.getBoundingClientRect().bottom < 0 || this.host.handleKey(e);
		}, this.full = (e) => {
			e?.stopPropagation(), this.go("full");
		}, this.unfull = (e) => {
			e?.stopPropagation(), this.go(this.from === "full" ? "now" : this.from);
		}, this.pressStart = (e) => (t) => {
			if (t.button > 0) return;
			this.pressed = !1, this.pressEnd();
			let n = t.clientX, r = t.clientY, i = (e) => {
				e.pointerId === t.pointerId && Math.hypot(e.clientX - n, e.clientY - r) > 8 && this.pressEnd();
			}, a = () => this.pressEnd();
			window.addEventListener("pointermove", i, { passive: !0 }), window.addEventListener("pointercancel", a), this.pressOff = () => {
				window.removeEventListener("pointermove", i), window.removeEventListener("pointercancel", a);
			}, this.pressTimer = setTimeout(() => {
				this.pressEnd(), this.pressed = !0, this.toggleFav(e);
			}, J);
		}, this.pressEnd = () => {
			clearTimeout(this.pressTimer), this.pressOff?.(), this.pressOff = void 0;
		}, this.sampleFrame = () => {
			if (H || this.view !== "now" || document.hidden) return;
			let e = V(this.host.video, this.ambCanvas), t = this.stageEl();
			e && t && (t.style.setProperty("--a1", e[0]), t.style.setProperty("--a2", e[1]));
		}, this.lastMove = 0, this.onMove = (e) => {
			e.pointerType !== "mouse" || e.timeStamp - this.lastMove < 400 || (this.lastMove = e.timeStamp, this.host.wake());
		}, this.onFrame = (e) => (t) => {
			t.target.closest("button, input, .glass") || (e === "now" || e === "guide" ? this.full() : this.host.frameClick());
		}, this.onBodyScroll = (e) => {
			let t = e.currentTarget;
			t.classList.toggle("scrolled", t.scrollTop > 4);
		}, this.chipWheel = (e) => {
			let t = e.currentTarget;
			if (t.scrollWidth <= t.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
			let n = t.scrollWidth - t.clientWidth, r = Math.max(0, Math.min(n, t.scrollLeft + e.deltaY));
			r !== t.scrollLeft && (e.preventDefault(), t.scrollLeft = r);
		}, this.chipDrag = (e) => {
			if (e.pointerType !== "mouse" || e.button !== 0) return;
			let t = e.currentTarget;
			if (t.scrollWidth <= t.clientWidth) return;
			let n = e.clientX, r = t.scrollLeft, i = !1, a = (e) => {
				let a = e.clientX - n;
				!i && Math.abs(a) < 5 || (i = !0, t.scrollLeft = r - a);
			}, o = () => {
				if (window.removeEventListener("pointermove", a), window.removeEventListener("pointerup", o), !i) return;
				let e = (e) => (e.stopPropagation(), e.preventDefault());
				t.addEventListener("click", e, {
					capture: !0,
					once: !0
				}), setTimeout(() => t.removeEventListener("click", e, { capture: !0 }), 0);
			};
			window.addEventListener("pointermove", a), window.addEventListener("pointerup", o);
		}, this.onGridScroll = (e) => {
			let t = e.currentTarget, n = Math.max(0, Math.floor((t.scrollTop - 32) / G) - 4);
			n !== this.guideFirst && (this.guideFirst = n, this.host.refresh()), this.pin(t);
		};
	}
	get embed() {
		return this.host.config.chrome === "embed";
	}
	connect() {
		if (!this.embed) {
			this.fit();
			for (let e of [
				300,
				1200,
				3e3
			]) setTimeout(this.fit, e);
			window.addEventListener("resize", this.fit), document.addEventListener("keydown", this.onDocKey), this.resizeObs = new ResizeObserver(() => this.fit()), this.resizeObs.observe(document.documentElement), this.resizeObs.observe(this.host.el), this.ambTimer = setInterval(this.sampleFrame, 2500), this.dockTimer = setInterval(this.syncHouseholdDock, 600), this.host.el.addEventListener("pointerdown", this.foldHouseholdDock, !0);
		}
	}
	disconnect() {
		window.removeEventListener("resize", this.fit), document.removeEventListener("keydown", this.onDocKey), this.resizeObs?.disconnect(), clearInterval(this.ambTimer), clearInterval(this.dockTimer), this.host.el.removeEventListener("pointerdown", this.foldHouseholdDock, !0), this.releaseHouseholdDock();
	}
	householdDock() {
		return document.querySelector("household-app-dock");
	}
	releaseHouseholdDock() {
		if (this.host.el.shadowRoot?.querySelector("ha-card")?.removeAttribute("data-hd-open"), !this.hidDock) return;
		this.hidDock = !1;
		let e = this.householdDock();
		e && (e.style.display = "", e.update?.());
	}
	key(e) {
		if (this.embed) return !1;
		if (e.key === "Escape") {
			if (this.keypad || this.rail) this.keypad = this.rail = !1;
			else if (this.view === "full") this.unfull();
			else if (this.view !== "now") this.go("now");
			else return !1;
			return this.host.refresh(), !0;
		}
		return e.key === "f" || e.key === "F" ? (this.view === "full" ? this.unfull() : this.full(), !0) : e.key === "g" || e.key === "G" ? (this.go(this.view === "guide" ? "now" : "guide"), !0) : !1;
	}
	showGuide() {
		this.embed || (this.view === "full" ? this.rail = !this.rail : this.go("guide"), this.host.refresh());
	}
	go(e) {
		e !== this.view && (this.flip(() => {
			e === "full" && (this.from = this.view === "full" ? this.from : this.view), this.view = e, this.rail = this.keypad = !1, e === "guide" && (this.guideScrolled = !1, this.guideSel = void 0);
		}), e === "full" && this.host.wake());
	}
	flip(e) {
		let t = this.stageEl(), n = t?.getBoundingClientRect();
		e(), this.host.refresh(), t && n && !matchMedia("(prefers-reduced-motion: reduce)").matches && requestAnimationFrame(() => {
			let e = t.getBoundingClientRect();
			if (!n.width || !e.width || t.hidden) return;
			let r = n.left - e.left, i = n.top - e.top, a = n.width / e.width, o = n.height / e.height;
			Math.abs(r) + Math.abs(i) < 2 && Math.abs(a - 1) < .01 || t.animate([{
				transformOrigin: "0 0",
				transform: `translate(${r}px, ${i}px) scale(${a}, ${o})`
			}, {
				transformOrigin: "0 0",
				transform: "none"
			}], {
				duration: 420,
				easing: "cubic-bezier(.16,1,.3,1)"
			});
		});
	}
	stageEl() {
		return this.host.el.shadowRoot?.querySelector(".app-stage") ?? null;
	}
	now(e) {
		return e.now;
	}
	progs(e) {
		return x(this.host.guide, e);
	}
	favs() {
		let e = this.host.list;
		return e ? F(e, this.host.config.target) : [];
	}
	toast(e) {
		this.toastText = e, clearTimeout(this.toastTimer), this.toastTimer = setTimeout(() => {
			this.toastText = "", this.host.refresh();
		}, 2200), this.host.refresh();
	}
	toggleFav(e) {
		let t = this.host.list;
		if (!t) return;
		let n = ne(t, this.host.config.target, e);
		this.toast(n ? `${b(e)} added to favourites` : `${b(e)} removed from favourites`);
	}
	tap(e, t = !1) {
		return (n) => {
			n.stopPropagation(), this.pressed ? this.pressed = !1 : (this.host.play(e), t && this.go("full"));
		};
	}
	tint(e) {
		return R(e, () => this.host.refresh());
	}
	logoPlate(e, n = "") {
		return e ? t`<span class="lp ${n}"
      >${e.logo ? t`<img src=${e.logo} alt=${b(e)} decoding="async" />` : t`<span class="ini">${$(e.name)}</span>`}</span
    >` : a;
	}
	live() {
		return t`<span class="live">LIVE</span>`;
	}
	render(e, n) {
		let r = this.host.current;
		r && r.id !== this.zapId && (this.zapId !== void 0 && this.zapCount++, this.zapId = r.id), !this.deepLinked && this.host.list && this.deepLink();
		let i = this.host.multiview, o = this.embed || i ? "full" : this.view, s = r ? this.tint(r) : void 0, c = this.host.config.aspectRatio;
		return t`<ha-card
      class="app ${H ? "lite" : ""} ${this.embed ? "embed" : ""}"
      data-view=${o}
      style=${this.embed ? `--sc-ar:${c}` : ""}
    >
      <div class="app-body" @scroll=${this.onBodyScroll}>
        ${this.embed ? a : this.before(o, e, n)}
        <div
          class="app-stage"
          data-ui=${e.ui}
          ?hidden=${!!i}
          style=${s && H ? `--a1:${s[0]};--a2:${s[1]}` : s ? `--t1:${s[0]};--t2:${s[1]}` : ""}
        >
          <div
            class="frame ${e.chrome ? "" : "calm"}"
            data-state=${e.ui}
            tabindex="0"
            aria-label=${e.title ? `Live TV: ${e.title}` : "Live TV"}
            @click=${this.onFrame(o)}
            @pointermove=${o === "full" || this.embed ? this.onMove : a}
          >
            <div class="video-host"></div>
            ${this.overlay(o, e, n)}
          </div>
        </div>
        ${i ? t`<div class="mvwrap">${i}</div>` : a}
        ${this.embed ? a : this.after(o, e, n)}
      </div>
      ${this.embed || o === "full" ? a : this.dock(o, n)}
      ${this.toastText ? t`<div class="toast glass" role="status">${this.toastText}</div>` : a}
    </ha-card>`;
	}
	deepLink() {
		this.deepLinked = !0;
		let e = new URLSearchParams(location.search), t = e.get("view");
		(t === "guide" || t === "channels" || t === "full") && (this.view = t);
		let n = e.get("channel"), r = n ? this.host.list?.find(n) : void 0;
		r && queueMicrotask(() => this.host.play(r));
	}
	before(e, n, r) {
		if (e === "now") return this.band(n, "On", "now", this.sentence(n));
		if (e === "channels") {
			let e = this.host.list;
			return this.band(n, "Channels", "", t`<b>${e?.size ?? 0}</b> channels · <b>${this.favs().length}</b> favourites · tap one to
          watch full screen`);
		}
		return a;
	}
	after(e, n, r) {
		return e === "now" ? t`${this.favTiles(n)}${this.rails(n)}` : e === "guide" ? this.guideParts(n, r) : e === "channels" ? this.channelsPage(n) : a;
	}
	band(e, n, r, i) {
		let o = new Date(e.now);
		return t`<div class="band">
      <div>
        <span class="lab">Live TV</span>
        <h2>${n}${r ? t` <em>${r}</em>` : a}</h2>
        <p>${i}</p>
      </div>
      <div class="clock">
        ${E(e.now)}<small
          >${o.toLocaleDateString(void 0, {
			weekday: "short",
			day: "numeric",
			month: "short"
		})}</small
        >
      </div>
    </div>`;
	}
	sentence(e) {
		let n = this.host.list, r = this.now(e), i = n ? te(n, this.host.guide, r) : void 0, a = this.favs().filter((e) => S(this.progs(e), r)).length, o = e.previousChannel, s = [];
		if (i) {
			let e = i.p.start ?? r;
			s.push(e <= r ? t`<b>${i.p.title}</b> is live on ${b(i.ch)} ·
              <b>${T((i.p.end ?? r) - r)}</b> left` : t`<b>${i.p.title}</b> starts at <b>${E(e)}</b> on ${b(i.ch)}`);
		}
		return a && s.push(t`<b>${a}</b> favourites on`), o && s.push(t`last watched <b>${b(o)}</b>`), s.length ? t`${s.map((e, n) => t`${n ? " · " : ""}${e}`)}` : t`Pick a channel to start watching`;
	}
	thumb(e, n = a) {
		let [r] = this.tint(e);
		return t`<div class="th lt" style="--c1:${r}">
      ${e.logo ? t`<img src=${e.logo} alt=${b(e)} decoding="async" />` : t`<span class="ini big">${$(e.name)}</span>`}
      ${n}
    </div>`;
	}
	nowTile(e, n) {
		let r = this.now(n), i = this.progs(e), o = S(i, r), s = C(i, r), c = e.id === this.host.current?.id;
		return t`<button
      class="ttile press ${c ? "on" : ""}"
      @click=${this.tap(e)}
      @pointerdown=${this.pressStart(e)}
      @pointerup=${this.pressEnd}
      @pointerleave=${this.pressEnd}
      @contextmenu=${(e) => e.preventDefault()}
    >
      ${this.thumb(e, t`${c ? t`<span class="wat glass"
                ><span class="eq"><i></i><i></i><i></i></span>Watching</span
              >` : a}
        ${o?.live ? t`<span class="lvc">LIVE</span>` : a}
        ${o ? t`<div class="bar tbar"><i style="width:${w(o, r)}%"></i></div>` : a}`)}
      <div class="tt">${o?.title ?? b(e)}</div>
      <div class="ts">
        <span class="a">${b(e)}${o?.end ? ` · ${T(o.end - r)} left` : ""}</span>
        ${s ? t`<span class="b">Then ${s.title} · ${E(s.start ?? 0)}</span>` : a}
      </div>
    </button>`;
	}
	laterTile(e, n) {
		return (e.p.start ?? 0) <= this.now(n) ? this.nowTile(e.ch, n) : t`<button
      class="ttile press"
      @click=${this.tap(e.ch)}
      @pointerdown=${this.pressStart(e.ch)}
      @pointerup=${this.pressEnd}
      @pointerleave=${this.pressEnd}
      @contextmenu=${(e) => e.preventDefault()}
    >
      ${this.thumb(e.ch, t`<span class="when glass">${E(e.p.start ?? 0)}</span>${e.p.live ? t`<span class="lvc left">LIVE</span>` : a}`)}
      <div class="tt">${e.p.title}</div>
      <div class="ts"><span class="a">${b(e.ch)} · ${E(e.p.start ?? 0)}</span></div>
    </button>`;
	}
	favTiles(e) {
		let n = this.host.current, r = this.favs().filter((e) => e.id !== n?.id), i = r.slice(0, 4);
		return t`<div class="favs">
      <div class="h">
        <span class="lab">Favourites · live</span><span class="lab">${r.length} on now</span>
      </div>
      ${i.map((t) => this.nowTile(t, e))}
      ${i.length < 4 ? t`<button class="ttile addfav press" @click=${() => this.go("channels")}>
              <div class="th add">${re}</div>
              <div class="tt">Add a favourite</div>
              <div class="ts"><span class="a">long-press any channel</span></div>
            </button>` : a}
    </div>`;
	}
	rails(e) {
		let n = this.host.list;
		if (!n) return t`<div class="rails"></div>`;
		let r = this.now(e), i = M(n, this.host.guide, r), o = ee(n, this.host.guide, r), s = n.channels.filter((e) => O(e) === "news").sort((e, t) => Number(this.favs().includes(t)) - Number(this.favs().includes(e))).slice(0, 8), c = (e.recents ?? []).filter((e) => e.id !== this.host.current?.id).slice(0, 8), l = (e, n, r) => r.length ? t`<div class="railh">
              <h4>${e}</h4>
              <span class="lab">${n}</span>
            </div>
            <div class="railr">${r}</div>` : a;
		return t`<div class="rails">
      ${l("Sport", "now and next", i.map((t) => this.laterTile(t, e)))}
      ${l("Films tonight", o[0] ? `from ${E(Math.max(o[0].p.start ?? r, r))}` : "", o.map((t) => this.laterTile(t, e)))}
      ${l("News", "rolling", s.map((t) => this.nowTile(t, e)))}
      ${c.length > 1 ? l("Recent", "on this device", c.map((t) => this.nowTile(t, e))) : a}
    </div>`;
	}
	guideChannels() {
		let e = this.host.list;
		if (!e) return [];
		let t = this.guideGroup, n = t === "★" ? this.favs() : t ? e.channels.filter((e) => O(e) === t) : e.channels, r = this.guideQuery.trim().toLowerCase();
		return r && (n = n.filter((e) => e.name.toLowerCase().includes(r) || e.number?.startsWith(r) || this.progs(e).some((e) => e.title.toLowerCase().includes(r)))), n;
	}
	window(e) {
		let t = 30 * v, n = Math.floor((e - t) / t) * t;
		return {
			w0: n,
			w1: n + 840 * v
		};
	}
	guideParts(e, n) {
		return t`${this.detail(e, n)}${this.toolbar(e)}${this.grid(e)}`;
	}
	selected(e) {
		let t = this.host.list, n = this.guideSel, r = n && t?.find(n.id) || this.host.current;
		if (!r) return {};
		let i = this.progs(r);
		return {
			ch: r,
			p: (n?.start === void 0 ? void 0 : i.find((e) => e.start === n.start)) ?? S(i, this.now(e))
		};
	}
	detail(e, r) {
		let { ch: i, p: o } = this.selected(e), s = this.now(e);
		if (!i) return t`<div class="det"><p class="muted">Pick a programme in the guide.</p></div>`;
		let c = this.progs(i), l = !!o && (o.start ?? 0) <= s && (o.end ?? Infinity) > s, u = c.filter((e) => (e.start ?? 0) >= (o?.end ?? s)).slice(0, 2), d = i.id === this.host.current?.id, f = this.favs().includes(i), p = o ? l ? "Now" : E(o.start ?? 0) : "No guide";
		return t`<div class="det">
      <div class="dh">
        <span class="lab">${p} · ${b(i)}${i.number ? ` · ${i.number}` : ""}</span>
        ${l || o?.live ? this.live() : a}
      </div>
      <h3>${o?.title ?? b(i)}</h3>
      <div class="meta">
        ${[D(o), o?.start && o.end ? `${E(o.start)}–${E(o.end)}` : ""].filter(Boolean).join(" · ")}
        ${o?.end && l ? t` · <b>${T(o.end - s)} left</b>` : a}
        ${o?.start && !l && o.start > s ? t` · in ${T(o.start - s)}` : a}
      </div>
      ${l ? t`<div class="bar"><i style="width:${w(o, s)}%"></i></div>` : a}
      ${o?.desc ? t`<p class="desc">${o.desc}</p>` : a}
      ${u.length ? t`<div class="then">
              ${u.map((e) => t`<div>${Q(E(e.start ?? 0))}<span>${e.title}</span></div>`)}
            </div>` : a}
      <div class="acts">
        <button
          class="btn ${d ? "done" : "pri"} press"
          ?disabled=${d}
          @click=${() => this.host.play(i)}
        >
          ${n(d ? "tv" : "play")} ${d ? "Watching" : "Watch"}
        </button>
        <button
          class="btn press"
          aria-pressed=${f ? "true" : "false"}
          @click=${() => this.toggleFav(i)}
        >
          ${n("star")} ${f ? "Favourite" : "Add to favourites"}
        </button>
        ${r.multiview ? t`<button class="btn press" @click=${() => r.multiview?.()}>
                ${n("grid")} Multiview
              </button>` : a}
      </div>
    </div>`;
	}
	chips(e, r, i, a = y) {
		let o = e.map(a), s = (e, t) => o.indexOf(o[t]) === o.lastIndexOf(o[t]) ? o[t] : e;
		return [
			t`<button
        class="gc"
        aria-pressed=${r === "" ? "true" : "false"}
        @click=${() => i("")}
      >
        All
      </button>`,
			t`<button
        class="gc"
        aria-pressed=${r === "★" ? "true" : "false"}
        @click=${() => i("★")}
      >
        ${n("star")} Favourites
      </button>`,
			...e.map((e, n) => t`<button
            class="gc"
            aria-pressed=${r === e ? "true" : "false"}
            @click=${() => i(e)}
          >
            ${s(e, n)}
          </button>`)
		];
	}
	search(e, r, i) {
		return t`<label class="search">
      ${n("search")}
      <input
        type="search"
        .value=${_(e)}
        placeholder=${r}
        aria-label=${r}
        @input=${(e) => i(e.target.value)}
        @keydown=${Z}
      />
    </label>`;
	}
	toolbar(e) {
		let n = this.now(e), r = 120 * v, i = [
			1,
			2,
			3
		].map((e) => (Math.floor(n / r) + e) * r);
		return t`<div class="tool">
      <div class="jumps">
        <button class="gc" @click=${() => this.jump(n - 20 * v, e)}>Now</button>
        ${i.map((n) => t`<button class="gc" @click=${() => this.jump(n - 10 * v, e)}>${E(n)}</button>`)}
      </div>
      <div class="gchips" @wheel=${this.chipWheel} @pointerdown=${this.chipDrag}>
        ${this.chips(K, this.guideGroup, (e) => {
			this.guideGroup = e, this.guideFirst = 0, this.host.refresh();
		}, (e) => q[e])}
      </div>
      ${this.search(this.guideQuery, "Search programmes", (e) => {
			this.guideQuery = e, this.guideFirst = 0, this.host.refresh();
		})}
    </div>`;
	}
	gscroll() {
		return this.host.el.shadowRoot?.querySelector(".gscroll") ?? null;
	}
	px() {
		return this.host.el.clientWidth < 760 ? 4 : 5;
	}
	nameW() {
		return this.host.el.clientWidth < 760 ? 120 : 196;
	}
	jump(e, t) {
		let n = this.gscroll();
		if (!n) return;
		let { w0: r } = this.window(this.now(t));
		n.scrollTo({
			left: Math.max(0, (e - r) / v * this.px()),
			behavior: "smooth"
		});
	}
	pin(e) {
		let t = e.scrollLeft + this.nameW();
		e.querySelectorAll(".cell").forEach((e) => {
			let n = e.offsetLeft, r = e.offsetWidth, i = Math.max(0, t - n + 4);
			e.style.setProperty("--sh", `${Math.min(i, r)}px`), e.classList.toggle("gone", r - i < 56);
		}), e.querySelectorAll(".ruler span:not(.nowtag)").forEach((e) => e.classList.toggle("gone", e.offsetLeft < t + 2));
	}
	grid(e) {
		let n = this.now(e), { w0: r, w1: i } = this.window(n), o = this.px(), s = this.nameW(), c = (e) => s + (e - r) / v * o, l = this.guideChannels(), u = Math.ceil((this.host.el.clientHeight || 900) / G) + 10, d = Math.min(this.guideFirst, Math.max(0, l.length - u)), f = l.slice(d, d + u), p = c(i), m = [];
		for (let e = r; e < i; e += 30 * v) Math.abs(e - n) > 54e4 && m.push(e);
		let h = this.host.current?.id, g = this.selected(e), _ = f.map((e, s) => {
			let l = this.progs(e).filter((e) => (e.end ?? Infinity) > r && (e.start ?? 0) < i);
			return t`<div class="grow" style="top:${32 + (d + s) * G}px;width:${p}px">
        <button class="gname ${e.id === h ? "on" : ""}" @click=${this.tap(e)}>
          ${this.logoPlate(e, "sm")}
          <span class="gn"><span class="mono">${e.number ?? ""}</span>${b(e)}</span>
        </button>
        ${l.length ? l.map((s) => {
				let l = Math.max(s.start ?? r, r), u = Math.min(s.end ?? i, i), d = (s.end ?? 0) <= n ? "past" : (s.start ?? 0) <= n ? "now" : "", f = g.ch?.id === e.id && g.p === s;
				return t`<button
                  class="cell ${d} ${f ? "sel" : ""}"
                  style="left:${c(l) + 2}px;width:${Math.max(8, (u - l) / v * o - 4)}px;${d === "now" ? `--p:${w(s, n)}%` : ""}"
                  @click=${() => {
					this.guideSel = {
						id: e.id,
						start: s.start
					}, this.host.refresh();
				}}
                  @dblclick=${this.tap(e)}
                >
                  <span class="cx"
                    ><small>${E(s.start ?? 0)}${s.live ? " · LIVE" : ""}</small>${s.live ? t`<i class="lvd"></i>` : a}${s.title}</span
                  >
                </button>`;
			}) : t`<span class="cell empty" style="left:${c(r) + 2}px;width:${c(i) - c(r) - 4}px"
                ><span class="cx">No guide for this channel</span></span
              >`}
      </div>`;
		});
		return this.guideScrolled ? requestAnimationFrame(() => {
			let e = this.gscroll();
			e && this.pin(e);
		}) : (this.guideScrolled = !0, requestAnimationFrame(() => {
			let e = this.gscroll();
			e && (e.scrollLeft = Math.max(0, (n - 20 * v - r) / v * o), this.pin(e));
		})), t`<div class="grid">
      <div class="gscroll" @scroll=${this.onGridScroll}>
        <div class="gin" style="width:${p}px;height:${32 + l.length * G + 160}px">
          <div class="ruler" style="width:${p}px">
            <i class="corner"></i>
            ${m.map((e) => t`<span style="left:${c(e)}px">${E(e)}</span>`)}
            <span class="nowtag" style="left:${c(n)}px">${E(n)}</span>
          </div>
          ${_}
          <div class="nowline" style="left:${c(n)}px"></div>
        </div>
      </div>
    </div>`;
	}
	channelsPage(e) {
		let n = this.host.list, r = this.now(e), i = this.chGroup, a = n ? i === "★" ? this.favs() : i ? n.channels.filter((e) => e.group === i) : n.channels : [], o = this.chQuery.trim().toLowerCase();
		return o && (a = a.filter((e) => e.name.toLowerCase().includes(o) || e.number?.startsWith(o))), t`<div class="bar2">
        ${this.search(this.chQuery, "Search channels", (e) => {
			this.chQuery = e, this.host.refresh();
		})}
        <div class="gchips" @wheel=${this.chipWheel} @pointerdown=${this.chipDrag}>
          ${this.chips(n?.groups ?? [], i, (e) => {
			this.chGroup = e, this.host.refresh();
		})}
        </div>
      </div>
      <div class="cols">${a.map((e) => this.row(e, r, !0))}</div>`;
	}
	row(e, r, i) {
		let o = this.progs(e), s = S(o, r), c = C(o, r), l = e.id === this.host.current?.id;
		return t`<button
      class="row press ${l ? "on" : ""}"
      @click=${this.tap(e, i)}
      @pointerdown=${this.pressStart(e)}
      @pointerup=${this.pressEnd}
      @pointerleave=${this.pressEnd}
      @contextmenu=${(e) => e.preventDefault()}
    >
      ${this.logoPlate(e)}
      <span class="rm">
        <span class="nm"
          >${Q(e.number)} ${b(e)}
          ${l ? t`<span class="eq"><i></i><i></i><i></i></span>` : a}
          ${this.favs().includes(e) ? t`<span class="fav">${n("star")}</span>` : a}</span
        >
        <span class="pg">${s?.title ?? y(e.group)}</span>
        ${s ? t`<span class="bar"><i style="width:${w(s, r)}%"></i></span>` : a}
      </span>
      ${c ? t`<span class="nx">${Q(E(c.start ?? 0))}${c.title}</span>` : a}
    </button>`;
	}
	overlay(e, n, r) {
		let o = this.zapCount && this.host.current ? g(this.zapCount, this.zapTpl(this.host.current)) : a;
		return this.embed ? t`${this.embedOverlay(n, r)}${i(n, r)}` : e === "full" ? t`${this.theatre(n, r)}${o}` : e === "guide" ? t`${this.preview(n, r)}${o}${this.numOsd(n)}` : t`${this.hero(n, r)}${o}${this.numOsd(n)}`;
	}
	zapTpl(e) {
		return t`<div class="zap" aria-hidden="true">
      ${e.logo ? t`<img src=${e.logo} alt="" />` : t`<b>${b(e)}</b>`}
      <span>${e.number ?? ""}</span>
    </div>`;
	}
	numOsd(e) {
		let n = e.numberEntry;
		if (!n?.digits) return a;
		let r = n.candidates[0];
		return t`<div class="numosd glass" role="status">
      <span class="d">${n.digits.padEnd(3, "–")}</span>
      ${r ? t`${this.logoPlate(r, "sm")}<span class="nm"
                >${b(r)}<small>${S(this.progs(r), e.now)?.title ?? ""}</small></span
              >` : t`<span class="nm dim">No channel ${n.digits}</span>`}
    </div>`;
	}
	nowLine(e) {
		return {
			p: e.nowNext?.now,
			n: e.nowNext?.next
		};
	}
	hero(e, r) {
		let o = e.channel, { p: s, n: c } = this.nowLine(e), l = this.now(e), u = e.ui === "playing" || e.ui === "ready" || e.ui === "connecting" || e.ui === "reconnecting";
		return t`${u && o ? t`<div class="over">
            <div class="r">
              <span class="idl"
                >${e.ui === "playing" ? this.live() : a}${this.logoPlate(o, "xl")}${o.number ? t`<span class="lab">${o.number}</span>` : a}</span
              >
              <span class="hb">
                ${r.lastChannel && e.previousChannel ? t`<button
                        class="glass press"
                        @click=${() => r.lastChannel?.()}
                        aria-label="Last channel"
                      >
                        ${n("last")}
                      </button>` : a}
                <button
                  class="glass press"
                  @click=${r.toggleMute}
                  aria-label=${e.muted ? "Unmute" : "Mute"}
                >
                  ${n(e.muted ? "volumeOff" : "volumeHigh")}
                </button>
                ${this.settingsButton(e, r, "glass press", !0)}
                <button class="glass press" @click=${this.full} aria-label="Full screen">
                  ${n("fullscreen")}
                </button>
              </span>
            </div>
            <div>
              <h3>${s?.title ?? b(o)}</h3>
              <div class="meta">
                ${[D(s), s?.start && s.end ? `${E(s.start)}–${E(s.end)}` : ""].filter(Boolean).join(" · ")}
                ${s?.end ? t` · <b>${T(s.end - l)} left</b>` : a}${c ? ` · then ${c.title}` : ""}
              </div>
              ${s ? t`<div class="bar"><i style="width:${w(s, l)}%"></i></div>` : a}
            </div>
          </div>` : a}
    ${this.settingsWrap(e, r, "at-hero")}
    ${e.ui === "playing" && !e.mutedByPolicy && !e.needsGesture && !e.buffering ? a : i(e, r)}`;
	}
	settingsButton(e, r, i, o = !1) {
		let s = e.settings;
		return !s || !r.settings ? a : t`<button
      class="${i} set-btn"
      @click=${(e) => {
			e.stopPropagation();
			let t = e.currentTarget.closest(".frame");
			o && !s.open && t && t.clientHeight < Y && this.full(), r.settings?.toggle(e);
		}}
      aria-pressed=${s.open ? "true" : "false"}
      aria-label="Settings"
      title="Playback settings"
    >
      ${n("settings")}
    </button>`;
	}
	settingsWrap(e, n, i) {
		return e.settings?.open ? t`<div class="setwrap ${i}" @click=${Z}>${r(e, n)}</div>` : a;
	}
	settingsLabel(e) {
		let t = e.settings, n = t?.quality;
		return n ? n.choice === "auto" ? `Auto${n.playing ? ` · ${n.playing}` : ""}` : n.choice : t?.buffer === "stable" ? "Stable" : t?.buffer === "low" ? "Low delay" : "Auto buffer";
	}
	preview(e, r) {
		let o = e.channel, { p: s } = this.nowLine(e);
		return t`${o && (e.ui === "playing" || e.ui === "ready") ? t`<div class="tl">${e.ui === "playing" ? this.live() : a}</div>
            <div class="pover">
              <div class="pt">
                <span class="idl"
                  >${this.logoPlate(o, "xl")}<span class="lab">${o.number ?? ""}</span></span
                >
                <span class="t">${s?.title ?? b(o)}</span>
              </div>
              <span class="hb">
                ${r.lastChannel && e.previousChannel ? t`<button
                        class="glass press"
                        @click=${() => r.lastChannel?.()}
                        aria-label="Last channel"
                      >
                        ${n("last")}
                      </button>` : a}
                <button
                  class="glass press"
                  @click=${r.toggleMute}
                  aria-label=${e.muted ? "Unmute" : "Mute"}
                >
                  ${n(e.muted ? "volumeOff" : "volumeHigh")}
                </button>
                <button class="glass press" @click=${this.full} aria-label="Full screen">
                  ${n("fullscreen")}
                </button>
              </span>
            </div>` : a}
    ${e.ui === "playing" && !e.mutedByPolicy && !e.needsGesture && !e.buffering ? a : i(e, r)}`;
	}
	theatre(e, r) {
		let o = e.channel, { p: s, n: c } = this.nowLine(e), l = this.now(e), u = e.numberEntry?.digits, d = e.ui === "playing" || e.ui === "connecting" || e.ui === "reconnecting", f = e.settings;
		return t`<div class="scrim t"></div>
      <div class="scrim b"></div>
      ${o && e.ui !== "error" ? t`<div class="t-ident fade">
              <div class="row">
                ${this.logoPlate(o, "xl")}${o.number ? t`<span class="lab">${o.number}</span>` : a}${e.ui === "playing" ? this.live() : a}
              </div>
              <h3>${s?.title ?? b(o)}</h3>
              <div class="meta">
                ${[D(s), s?.start && s.end ? `${E(s.start)}–${E(s.end)}` : ""].filter(Boolean).join(" · ")}
                ${s?.end ? t` · <b>${T(s.end - l)} left</b>` : a}
              </div>
              ${s ? t`<div class="bar"><i style="width:${w(s, l)}%"></i></div>` : a}
              ${c ? t`<div class="next"><span class="lab">Up next ${E(c.start ?? 0)}</span>${c.title}</div>` : a}
            </div>` : a}
      <div class="tr fade">
        <div class="clock">${E(l)}</div>
        <div class="chips">
          ${e.sleep ? t`<span class="chip glass">${n("sleep")} Stops ${E(e.sleep.endsAt)}</span>` : a}
          ${f && r.settings ? t`<button
                  class="chip glass press"
                  @click=${r.settings.toggle}
                  aria-expanded=${f.open ? "true" : "false"}
                  title="Playback settings"
                >
                  ${n("settings")} ${this.settingsLabel(e)}
                </button>` : a}
        </div>
      </div>
      ${u ? t`<div class="t-osd" role="status">
              <div class="d">
                ${u}<span>${"_".repeat(Math.max(0, 3 - u.length))}</span>
              </div>
              <div class="m">
                ${e.numberEntry?.candidates.length ? e.numberEntry.candidates.slice(0, 3).map((e) => `${e.number} ${b(e)}`).join(" · ") : "No channel with that number"}
              </div>
            </div>` : a}
      ${e.ui === "error" ? a : this.controls(e, r, d)}
      ${this.rail ? this.railPanel(e) : a}
      ${this.keypad && r.pressDigit ? this.keypadPanel(r) : a}
      ${e.sleepMenuOpen ? this.sleepMenu(e, r, s) : a} ${this.settingsWrap(e, r, "at-full")}
      <button class="dockpill glass press" @click=${this.unfull} aria-label="Show the dock">
        <span class="orb">${n("tv")}</span><span class="t">Live TV</span>${n("chevronUp")}
      </button>
      ${e.ui === "playing" && !e.mutedByPolicy && !e.needsGesture && !e.buffering && !e.sleep?.warning ? a : i(e, r)}`;
	}
	controls(e, r, i) {
		let o = e.previousChannel, s = Math.round((e.muted ? 0 : e.volume ?? 1) * 100);
		return t`<div class="t-ctl glass fade" @click=${Z}>
      ${r.lastChannel && o ? t`<button
                class="cb wide press"
                @click=${() => r.lastChannel?.()}
                aria-label="Back to ${b(o)}"
              >
                ${n("last")}<span
                  >${b(o)}<br /><small>${o.number ?? ""}</small></span
                >
              </button>
              <span class="sep"></span>` : a}
      ${e.canStep ? t`<button class="cb press" @click=${r.channelDown} aria-label="Previous channel">
                ${n("chevronDown")}
              </button>
              <button class="cb press" @click=${r.channelUp} aria-label="Next channel">
                ${n("chevronUp")}
              </button>
              <span class="sep"></span>` : a}
      <button
        class="cb main press"
        @click=${i ? r.stop : r.play}
        aria-label=${i ? "Stop" : "Play"}
      >
        ${n(i ? "stop" : "play")}
      </button>
      <span class="sep"></span>
      <div class="vol">
        <button class="cb press" @click=${r.toggleMute} aria-label=${e.muted ? "Unmute" : "Mute"}>
          ${n(e.muted ? "volumeOff" : s < 50 ? "volumeLow" : "volumeHigh")}
        </button>
        ${r.setVolume ? t`<input
                class="vtrack"
                type="range"
                min="0"
                max="100"
                step="1"
                aria-label="Volume"
                .value=${_(String(s))}
                style="--vol:${s}%"
                @input=${(e) => r.setVolume?.(Number(e.target.value) / 100)}
              />` : a}
      </div>
      <span class="sep"></span>
      ${r.setSleep ? t`<button
              class="cb press"
              aria-pressed=${e.sleep || e.sleepMenuOpen ? "true" : "false"}
              @click=${r.toggleSleepMenu}
              aria-label="Sleep timer"
            >
              ${n("sleep")}
            </button>` : a}
      ${r.pressDigit && !this.embed ? t`<button
              class="cb kpb press"
              aria-pressed=${this.keypad ? "true" : "false"}
              @click=${() => {
			this.keypad = !this.keypad, this.rail = !1, this.host.refresh();
		}}
              aria-label="Keypad"
            >
              ${n("keypad")}
            </button>` : a}
      ${r.multiview && !this.embed ? t`<button
              class="cb mvb press"
              @click=${() => r.multiview?.()}
              aria-label="Multiview"
            >
              ${n("grid")}
            </button>` : a}
      ${e.hasGuide && !this.embed ? t`<button
              class="cb press"
              aria-pressed=${this.rail ? "true" : "false"}
              @click=${() => {
			this.rail = !this.rail, this.keypad = !1, this.host.refresh();
		}}
              aria-label="Channels"
            >
              ${n("list")}
            </button>` : a}
      ${this.settingsButton(e, r, "cb press")}
      ${this.embed ? t`<button
              class="cb press"
              @click=${r.toggleFullscreen}
              aria-label=${e.fullscreen ? "Exit full screen" : "Full screen"}
            >
              ${n(e.fullscreen ? "fullscreenExit" : "fullscreen")}
            </button>` : t`<button
              class="cb press"
              @click=${this.unfull}
              aria-label=${`Back to ${this.from === "guide" ? "the guide" : this.from === "channels" ? "channels" : "On now"}`}
            >
              ${n("fullscreenExit")}
            </button>`}
    </div>`;
	}
	sleepMenu(e, n, r) {
		let i = this.now(e), o = (e) => (t) => {
			t.stopPropagation(), n.setSleep?.(e), n.toggleSleepMenu();
		}, s = e.sleep ? Math.ceil(e.sleep.remainingMs / v) : 0, c = r?.end ? Math.ceil((r.end - i) / v) + 1 : 0;
		return t`<div class="menu glass" @click=${Z}>
      <span class="lab">Stop playing after</span>
      <div class="opts">
        <button aria-pressed=${e.sleep ? "false" : "true"} @click=${o(0)}>Off</button>
        ${X.map((n) => t`<button
              aria-pressed=${e.sleep && Math.abs(s - n) <= 1 ? "true" : "false"}
              @click=${o(n)}
            >
              ${n === 60 ? "1 hour" : `${n} min`}
            </button>`)}
        ${c > 1 ? t`<button
                class="full"
                aria-pressed=${e.sleep && Math.abs(s - c) <= 1 ? "true" : "false"}
                @click=${o(c)}
              >
                End of programme<small>${r?.title} · ${E(r?.end ?? 0)}</small>
              </button>` : a}
      </div>
    </div>`;
	}
	keypadPanel(e) {
		return t`<div class="kp glass" @click=${Z}>
      ${[
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"⌫",
			"0",
			"↵"
		].map((n) => t`<button
            class="press"
            aria-label=${n === "⌫" ? "Delete" : n === "↵" ? "Tune" : n}
            @click=${() => {
			n === "⌫" ? this.host.deleteDigit() : n === "↵" ? (e.commitDigits?.(), this.keypad = !1) : e.pressDigit?.(n), this.host.refresh();
		}}
          >
            ${n}
          </button>`)}
    </div>`;
	}
	railPanel(e) {
		let r = this.host.list, i = this.now(e), a = this.railGroup, o = r ? a === "★" ? this.favs() : a ? r.channels.filter((e) => e.group === a) : r.channels : [], s = this.railQuery.trim().toLowerCase();
		return s && (o = o.filter((e) => e.name.toLowerCase().includes(s) || e.number?.startsWith(s))), t`<div class="rail glass" @click=${Z}>
      <div class="hd">
        <h4>Channels</h4>
        <button
          class="x press"
          aria-label="Close"
          @click=${() => {
			this.rail = !1, this.host.refresh();
		}}
        >
          ${n("close")}
        </button>
      </div>
      ${this.search(this.railQuery, "Search channels", (e) => {
			this.railQuery = e, this.host.refresh();
		})}
      <div class="gchips" @wheel=${this.chipWheel} @pointerdown=${this.chipDrag}>
        ${this.chips(r?.groups ?? [], a, (e) => {
			this.railGroup = e, this.host.refresh();
		})}
      </div>
      <div class="list">${o.slice(0, 120).map((e) => this.row(e, i, !1))}</div>
    </div>`;
	}
	embedOverlay(e, n) {
		if (e.ui === "preview" || e.ui === "empty" || e.ui === "error") return a;
		let r = e.ui === "playing" || e.ui === "connecting" || e.ui === "reconnecting";
		return t`<div class="scrim b"></div>
      ${this.controls(e, n, r)}
      ${e.sleepMenuOpen ? this.sleepMenu(e, n, e.nowNext?.now) : a}
      ${this.settingsWrap(e, n, "at-embed")}`;
	}
	dock(e, r) {
		let i = [
			[
				"now",
				"play",
				"On now"
			],
			[
				"guide",
				"list",
				"Guide"
			],
			[
				"channels",
				"star",
				"Channels"
			]
		];
		return r.multiview && i.push([
			"mv",
			"grid",
			"Multiview"
		]), t`<nav class="cdock glass" aria-label="Live TV">
      <button class="orbw press" @click=${this.openHouseholdDock} aria-label="Household navigation">
        <span class="orb">${n("tv")}</span><span class="t">Live TV</span>
      </button>
      ${i.map(([i, a, o]) => t`<button
            class="tab press ${i === e ? "sel" : ""}"
            aria-current=${i === e ? "page" : "false"}
            @click=${() => {
			i === "mv" ? r.multiview?.() : this.go(i);
		}}
          >
            ${n(a)}<span>${o}</span>
          </button>`)}
    </nav>`;
	}
};
function $(e) {
	return e.replace(/\b(hd|sd|fhd|uhd|4k)\b/gi, "").trim().split(/\s+/).slice(0, 2).map((e) => e.charAt(0)).join("").toUpperCase();
}
//#endregion
export { ie as AppShell, U as appStyles, W as hostFor };

//# sourceMappingURL=stream-card-app-b7qccnyz.js.map