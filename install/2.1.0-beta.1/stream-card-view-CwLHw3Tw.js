//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, l, { is: u, defineProperty: d, getOwnPropertyDescriptor: ee, getOwnPropertyNames: te, getOwnPropertySymbols: ne, getPrototypeOf: re } = Object, f = globalThis, p = f.trustedTypes, ie = p ? p.emptyScript : "", ae = f.reactiveElementPolyfillSupport, m = (e, t) => e, h = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ie : null;
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
}, g = (e, t) => !u(e, t), oe = {
	attribute: !0,
	type: String,
	converter: h,
	reflect: !1,
	useDefault: !1,
	hasChanged: g
};
(l = Symbol).metadata ?? (l.metadata = Symbol("metadata")), f.litPropertyMetadata ?? (f.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var _ = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ?? (this.l = [])).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = oe) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && d(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = ee(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? oe;
	}
	static _$Ei() {
		if (this.hasOwnProperty(m("elementProperties"))) return;
		let e = re(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(m("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(m("properties"))) {
			let e = this.properties, t = [...te(e), ...ne(e)];
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
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
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
		return s(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? h : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? h : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ?? (n = a.getPropertyOptions(e)), !((n.hasChanged ?? g)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
_.elementStyles = [], _.shadowRootOptions = { mode: "open" }, _[m("elementProperties")] = /* @__PURE__ */ new Map(), _[m("finalized")] = /* @__PURE__ */ new Map(), ae?.({ ReactiveElement: _ }), (f.reactiveElementVersions ?? (f.reactiveElementVersions = [])).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var v = globalThis, y = (e) => e, b = v.trustedTypes, x = b ? b.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, S = "$lit$", C = `lit$${Math.random().toFixed(9).slice(2)}$`, w = "?" + C, se = `<${w}>`, T = document, E = () => T.createComment(""), D = (e) => e === null || typeof e != "object" && typeof e != "function", O = Array.isArray, ce = (e) => O(e) || typeof e?.[Symbol.iterator] == "function", k = "[ 	\n\f\r]", A = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, j = /-->/g, M = />/g, N = RegExp(`>|${k}(?:([^\\s"'>=/]+)(${k}*=${k}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), P = /'/g, F = /"/g, I = /^(?:script|style|textarea|title)$/i, L = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), le = L(1), R = L(2), z = Symbol.for("lit-noChange"), B = Symbol.for("lit-nothing"), V = /* @__PURE__ */ new WeakMap(), H = T.createTreeWalker(T, 129);
function U(e, t) {
	if (!O(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return x === void 0 ? t : x.createHTML(t);
}
var ue = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = A;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === A ? c[1] === "!--" ? o = j : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = N) : (I.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = N) : o = M : o === N ? c[0] === ">" ? (o = i ?? A, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? N : c[3] === "\"" ? F : P) : o === F || o === P ? o = N : o === j || o === M ? o = A : (o = N, i = void 0);
		let d = o === N && e[t + 1].startsWith("/>") ? " " : "";
		a += o === A ? n + se : l >= 0 ? (r.push(s), n.slice(0, l) + S + n.slice(l) + C + d) : n + C + (l === -2 ? t : d);
	}
	return [U(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, W = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ue(t, n);
		if (this.el = e.createElement(l, r), H.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = H.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(S)) {
					let t = u[o++], n = i.getAttribute(e).split(C), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? fe : r[1] === "?" ? pe : r[1] === "@" ? me : q
					}), i.removeAttribute(e);
				} else e.startsWith(C) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (I.test(i.tagName)) {
					let e = i.textContent.split(C), t = e.length - 1;
					if (t > 0) {
						i.textContent = b ? b.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], E()), H.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], E());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === w) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(C, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += C.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = T.createElement("template");
		return n.innerHTML = e, n;
	}
};
function G(e, t, n = e, r) {
	if (t === z) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = D(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ?? (n._$Co = []))[r] = i), i !== void 0 && (t = G(e, i._$AS(e, t.values), i, r)), t;
}
var de = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? T).importNode(t, !0);
		H.currentNode = r;
		let i = H.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new K(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new he(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = H.nextNode(), a++);
		}
		return H.currentNode = T, r;
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
		this.type = 2, this._$AH = B, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = G(this, e, t), D(e) ? e === B || e == null || e === "" ? (this._$AH !== B && this._$AR(), this._$AH = B) : e !== this._$AH && e !== z && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ce(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== B && D(this._$AH) ? this._$AA.nextSibling.data = e : this.T(T.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = W.createElement(U(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new de(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = V.get(e.strings);
		return t === void 0 && V.set(e.strings, t = new W(e)), t;
	}
	k(t) {
		O(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(E()), this.O(E()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = y(e).nextSibling;
			y(e).remove(), e = t;
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
		this.type = 1, this._$AH = B, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = B;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = G(this, e, t, 0), a = !D(e) || e !== this._$AH && e !== z, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = G(this, r[n + o], t, o), s === z && (s = this._$AH[o]), a || (a = !D(s) || s !== this._$AH[o]), s === B ? e = B : e !== B && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === B ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, fe = class extends q {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === B ? void 0 : e;
	}
}, pe = class extends q {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== B);
	}
}, me = class extends q {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = G(this, e, t, 0) ?? B) === z) return;
		let n = this._$AH, r = e === B && n !== B || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== B && (n === B || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, he = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		G(this, e);
	}
}, ge = v.litHtmlPolyfillSupport;
ge?.(W, K), (v.litHtmlVersions ?? (v.litHtmlVersions = [])).push("3.3.3");
var _e = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new K(t.insertBefore(E(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, J = globalThis, Y = class extends _ {
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
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = _e(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return z;
	}
};
Y._$litElement$ = !0, Y.finalized = !0, J.litElementHydrateSupport?.({ LitElement: Y });
var ve = J.litElementPolyfillSupport;
ve?.({ LitElement: Y }), (J.litElementVersions ?? (J.litElementVersions = [])).push("4.2.2");
//#endregion
//#region src/channels.ts
var ye = /([\w-]+)="([^"]*)"/g, be = /\/proxy\/ts\/stream\/([^/?#]+)/;
function xe(e) {
	let t = {}, n = !1, r = -1;
	for (let t = 0; t < e.length; t++) {
		let i = e[t];
		if (i === "\"") n = !n;
		else if (i === "," && !n) {
			r = t;
			break;
		}
	}
	let i = r >= 0 ? e.slice(0, r) : e;
	for (let e of i.matchAll(ye)) t[e[1].toLowerCase()] = e[2];
	return {
		attrs: t,
		name: r >= 0 ? e.slice(r + 1).trim() : ""
	};
}
function Se(e) {
	let t = e.replace(/^\uFEFF/, "").split(/\r?\n/), n = [], r;
	for (let e of t) {
		let t = e.trim();
		if (!t) continue;
		if (t.startsWith("#EXTINF")) {
			r = xe(t);
			continue;
		}
		if (t.startsWith("#") || !r) continue;
		let { attrs: i, name: a } = r;
		r = void 0;
		let o = be.exec(t)?.[1];
		n.push({
			id: o ? decodeURIComponent(o) : t,
			streamId: o ? decodeURIComponent(o) : void 0,
			url: t,
			name: a || i["tvg-name"] || o || t,
			number: i["tvg-chno"] || i["channel-number"] || void 0,
			group: i["group-title"] || void 0,
			logo: i["tvg-logo"] || void 0,
			tvgId: i["tvg-id"] || void 0
		});
	}
	return n;
}
var X = (e) => e.trim().toLocaleLowerCase();
function Ce(e, t) {
	let n = e.number === void 0 ? NaN : Number(e.number), r = t.number === void 0 ? NaN : Number(t.number);
	return !Number.isNaN(n) && !Number.isNaN(r) && n !== r ? n - r : !Number.isNaN(n) && Number.isNaN(r) ? -1 : Number.isNaN(n) && !Number.isNaN(r) ? 1 : e.name.localeCompare(t.name);
}
var we = class {
	constructor(e, t = {}) {
		this.all = e;
		let n = (t.groups ?? []).map(X), r = (e) => !n.length || n.includes(X(e.group ?? ""));
		this.channels = e.filter(r).sort(Ce);
		let i = /* @__PURE__ */ new Set(), a = [];
		for (let t of e) t.group && r(t) && !i.has(t.group) && (i.add(t.group), a.push(t.group));
		n.length && a.sort((e, t) => n.indexOf(X(e)) - n.indexOf(X(t))), this.groups = a, this.favourites = (t.favourites ?? []).map((e) => this.find(e)).filter((e) => !!e);
	}
	get size() {
		return this.channels.length;
	}
	get total() {
		return this.all.length;
	}
	get allGroups() {
		return [...new Set(this.all.map((e) => e.group).filter((e) => !!e))];
	}
	find(e) {
		if (!e) return;
		let t = e.trim(), n = X(t);
		return this.all.find((e) => e.id === t || e.streamId === t) ?? this.all.find((e) => e.number !== void 0 && e.number === t) ?? this.all.find((e) => X(e.name) === n);
	}
	neighbour(e, t) {
		let n = this.channels;
		if (!n.length) return;
		let r = e ? n.findIndex((t) => t.id === e || t.streamId === e) : -1;
		return r < 0 ? t > 0 ? n[0] : n[n.length - 1] : n[(r + t + n.length) % n.length];
	}
	numberMatches(e, t = 5) {
		if (!/^\d+$/.test(e)) return [];
		let n = this.all.find((t) => t.number === e), r = this.channels.filter((t) => t !== n && (t.number ?? "").startsWith(e));
		return (n ? [n, ...r] : r).slice(0, t);
	}
	numberIsComplete(e) {
		let t = !1;
		for (let n of this.all) if (n.number === e) t = !0;
		else if (n.number?.startsWith(e)) return !1;
		return t;
	}
	filter(e, t) {
		let n = t === "★" ? this.favourites : t ? this.channels.filter((e) => e.group === t) : this.channels, r = X(e);
		return r ? n.filter((e) => X(e.name).includes(r) || (e.number ?? "").startsWith(r)) : n;
	}
}, Z = /* @__PURE__ */ new Map(), Te = 6e5, Q = 15e3, $ = class extends Error {
	constructor(...e) {
		super(...e), this.name = "ChannelListError";
	}
};
function Ee(e, { force: t = !1 } = {}) {
	let n = Z.get(e);
	if (n && !t && Date.now() - n.at < Te) return n.promise;
	let r = (async () => {
		let t = new AbortController(), n = setTimeout(() => t.abort(), Q);
		try {
			let n = await fetch(e, {
				cache: "no-store",
				signal: t.signal
			});
			if (!n.ok) throw new $(`HTTP ${n.status}`);
			return Se(await n.text());
		} catch (e) {
			throw e instanceof $ ? e : t.signal.aborted ? new $(`no answer in ${Q / 1e3} s`) : new $(`network error: ${e instanceof Error ? e.message : e}`);
		} finally {
			clearTimeout(n);
		}
	})();
	return Z.set(e, {
		at: Date.now(),
		promise: r
	}), r.catch(() => {
		Z.get(e)?.promise === r && Z.delete(e);
	}), r;
}
//#endregion
//#region src/icons.ts
var De = {
	play: {
		d: "M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z",
		fill: !0
	},
	stop: {
		d: "M8.5 6h7A2.5 2.5 0 0 1 18 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 15.5v-7A2.5 2.5 0 0 1 8.5 6z",
		fill: !0
	},
	last: { d: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5" },
	chevronUp: { d: "M6 15l6-6 6 6" },
	chevronDown: { d: "M6 9l6 6 6-6" },
	volumeHigh: { d: "M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" },
	volumeLow: { d: "M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7" },
	volumeOff: { d: "M11 5L6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6" },
	sleep: { d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" },
	fullscreen: { d: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" },
	fullscreenExit: { d: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" },
	guide: { d: "M4 6h16M4 12h16M4 18h10" },
	settings: { d: "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4" },
	grid: { d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
	multiview: { d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
	list: { d: "M4 6h16M4 12h16M4 18h10" },
	search: { d: "M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM20 20l-3.5-3.5" },
	keypad: {
		d: "M6 5h.01M12 5h.01M18 5h.01M6 11h.01M12 11h.01M18 11h.01M6 17h.01M12 17h.01M18 17h.01M12 22h.01",
		heavy: !0
	},
	backspace: { d: "M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM17 9l-5 5M12 9l5 5" },
	close: { d: "M6 6l12 12M18 6L6 18" },
	alert: { d: "M12 3l9.5 17h-19zM12 10v4M12 17h.01" },
	refresh: { d: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" },
	tv: { d: "M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM8 3l4 3 4-3" },
	clock: { d: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3 2" },
	star: {
		d: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
		fill: !0
	}
}, Oe = (e) => {
	let t = De[e];
	return R`<svg class=${t.fill ? "icon fill" : t.heavy ? "icon heavy" : "icon"} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d=${t.d}></path></svg>`;
}, ke = "\n  svg.icon {\n    width: 22px;\n    height: 22px;\n    flex: none;\n    fill: none;\n    stroke: currentColor;\n    stroke-width: 1.9;\n    stroke-linecap: round;\n    stroke-linejoin: round;\n  }\n  svg.icon.fill {\n    fill: currentColor;\n    stroke: none;\n  }\n  svg.icon.heavy {\n    stroke-width: 3.2;\n  }\n", Ae = o`
  :host {
    --sc-font: var(
      --stream-card-font,
      var(
        --ha-font-family-body,
        var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif)
      )
    );
    --sc-mono: var(
      --stream-card-mono-font,
      ui-monospace,
      'SF Mono',
      'Roboto Mono',
      Menlo,
      Consolas,
      monospace
    );
    --sc-card: var(--ha-card-background, var(--card-background-color, #1b1d23));
    --sc-text: var(--primary-text-color, #eceef2);
    --sc-text-2: var(--secondary-text-color, #b2b7c1);
    --sc-accent: var(--stream-card-accent, var(--primary-color, #41b4f6));
    --sc-on-accent: var(--stream-card-on-accent, var(--text-primary-color, #fff));
    --sc-line: var(--divider-color, rgba(127, 127, 127, 0.2));
    --sc-surface: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
    --sc-surface-2: rgba(127, 127, 127, 0.2);
    /* Selected chips: a tint of the accent with the theme's text on it, readable in any theme. */
    --sc-accent-soft: rgba(127, 127, 127, 0.2);
    --sc-radius: var(--ha-card-border-radius, 12px);
    --sc-warn: var(--error-color, #ff8a80);
    --sc-fav: #f5b83d;
    --sc-logo-bg: var(--stream-card-logo-background, #1c1c1c);
    /* The picture area: always dark. */
    --sc-pic: #07080a;
    --sc-pic-text: #f4f5f7;
    --sc-pic-text-2: rgba(255, 255, 255, 0.75);
    --sc-glass: rgba(14, 15, 18, 0.55);
    --sc-glass-line: rgba(255, 255, 255, 0.1);
    --sc-glass-hover: rgba(255, 255, 255, 0.12);
    --sc-live: #ff5b4f;
    --sc-ease: cubic-bezier(0.16, 1, 0.3, 1);
    /* Touch targets: 44 px, 56 px on wall panels. */
    --sc-target: 44px;
  }
  @supports (color: color-mix(in srgb, red, blue)) {
    :host {
      --sc-surface: color-mix(in srgb, var(--sc-text) 7%, var(--sc-card));
      --sc-surface-2: color-mix(in srgb, var(--sc-text) 13%, var(--sc-card));
      --sc-accent-soft: color-mix(in srgb, var(--sc-accent) 24%, var(--sc-card));
    }
  }
  @media (pointer: coarse) and (min-width: 900px) {
    :host {
      --sc-target: 56px;
    }
  }
`;
//#endregion
//#region src/ui/view.ts
function je(e) {
	return e.replace(/\b(hd|sd|fhd|uhd|4k)\b/gi, "").trim().split(/\s+/).slice(0, 2).map((e) => e.charAt(0)).join("").toUpperCase();
}
function Me(e, t) {
	if (!(!e?.start || !e.end || e.end <= e.start)) return Math.max(0, Math.min(100, (t - e.start) / (e.end - e.start) * 100));
}
function Ne(e) {
	return new Date(e).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit"
	});
}
function Pe(e) {
	let t = Math.max(0, Math.ceil(e / 1e3));
	return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
function Fe(e) {
	let t = Math.max(0, Math.ceil(e / 6e4));
	return t >= 60 ? `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, "0")}m` : `${t}m`;
}
function Ie(e) {
	return e ? e.number ? `${e.number} ${e.name}` : e.name : "";
}
function Le(e = navigator.userAgent) {
	return /CrKey|GoogleTV|Android TV|AFT[A-Z]|SMART-TV|Tizen|Web0S/i.test(e) ? "tv" : "standard";
}
//#endregion
export { o as _, je as a, Ae as c, we as d, Ee as f, R as g, le as h, Le as i, Oe as l, B as m, Ne as n, Fe as o, Y as p, Pe as r, Me as s, Ie as t, ke as u, a as v };

//# sourceMappingURL=stream-card-view-CwLHw3Tw.js.map