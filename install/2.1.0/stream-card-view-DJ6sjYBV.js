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
})(e) : e, l, { is: u, defineProperty: d, getOwnPropertyDescriptor: ee, getOwnPropertyNames: te, getOwnPropertySymbols: ne, getPrototypeOf: re } = Object, f = globalThis, ie = f.trustedTypes, ae = ie ? ie.emptyScript : "", oe = f.reactiveElementPolyfillSupport, p = (e, t) => e, m = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ae : null;
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
}, h = (e, t) => !u(e, t), g = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	useDefault: !1,
	hasChanged: h
};
(l = Symbol).metadata ?? (l.metadata = Symbol("metadata")), f.litPropertyMetadata ?? (f.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var _ = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ?? (this.l = [])).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = g) {
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
		return this.elementProperties.get(e) ?? g;
	}
	static _$Ei() {
		if (this.hasOwnProperty(p("elementProperties"))) return;
		let e = re(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(p("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(p("properties"))) {
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
			let i = (n.converter?.toAttribute === void 0 ? m : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? m : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ?? (n = a.getPropertyOptions(e)), !((n.hasChanged ?? h)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
_.elementStyles = [], _.shadowRootOptions = { mode: "open" }, _[p("elementProperties")] = /* @__PURE__ */ new Map(), _[p("finalized")] = /* @__PURE__ */ new Map(), oe?.({ ReactiveElement: _ }), (f.reactiveElementVersions ?? (f.reactiveElementVersions = [])).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var v = globalThis, y = (e) => e, b = v.trustedTypes, x = b ? b.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, S = "$lit$", C = `lit$${Math.random().toFixed(9).slice(2)}$`, w = "?" + C, se = `<${w}>`, T = document, E = () => T.createComment(""), D = (e) => e === null || typeof e != "object" && typeof e != "function", O = Array.isArray, ce = (e) => O(e) || typeof e?.[Symbol.iterator] == "function", k = "[ 	\n\f\r]", A = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, le = /-->/g, ue = />/g, j = RegExp(`>|${k}(?:([^\\s"'>=/]+)(${k}*=${k}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), de = /'/g, fe = /"/g, pe = /^(?:script|style|textarea|title)$/i, me = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), M = me(1), N = me(2), P = Symbol.for("lit-noChange"), F = Symbol.for("lit-nothing"), I = /* @__PURE__ */ new WeakMap(), L = T.createTreeWalker(T, 129);
function R(e, t) {
	if (!O(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return x === void 0 ? t : x.createHTML(t);
}
var z = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = A;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === A ? c[1] === "!--" ? o = le : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = j) : (pe.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = j) : o = ue : o === j ? c[0] === ">" ? (o = i ?? A, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? j : c[3] === "\"" ? fe : de) : o === fe || o === de ? o = j : o === le || o === ue ? o = A : (o = j, i = void 0);
		let d = o === j && e[t + 1].startsWith("/>") ? " " : "";
		a += o === A ? n + se : l >= 0 ? (r.push(s), n.slice(0, l) + S + n.slice(l) + C + d) : n + C + (l === -2 ? t : d);
	}
	return [R(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, B = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = z(t, n);
		if (this.el = e.createElement(l, r), L.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = L.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(S)) {
					let t = u[o++], n = i.getAttribute(e).split(C), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? W : r[1] === "?" ? ge : r[1] === "@" ? _e : U
					}), i.removeAttribute(e);
				} else e.startsWith(C) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (pe.test(i.tagName)) {
					let e = i.textContent.split(C), t = e.length - 1;
					if (t > 0) {
						i.textContent = b ? b.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], E()), L.nextNode(), c.push({
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
function V(e, t, n = e, r) {
	if (t === P) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = D(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ?? (n._$Co = []))[r] = i), i !== void 0 && (t = V(e, i._$AS(e, t.values), i, r)), t;
}
var he = class {
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
		L.currentNode = r;
		let i = L.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new H(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new ve(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = L.nextNode(), a++);
		}
		return L.currentNode = T, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, H = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = F, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = V(this, e, t), D(e) ? e === F || e == null || e === "" ? (this._$AH !== F && this._$AR(), this._$AH = F) : e !== this._$AH && e !== P && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ce(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== F && D(this._$AH) ? this._$AA.nextSibling.data = e : this.T(T.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = B.createElement(R(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new he(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = I.get(e.strings);
		return t === void 0 && I.set(e.strings, t = new B(e)), t;
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
}, U = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = F, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = F;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = V(this, e, t, 0), a = !D(e) || e !== this._$AH && e !== P, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = V(this, r[n + o], t, o), s === P && (s = this._$AH[o]), a || (a = !D(s) || s !== this._$AH[o]), s === F ? e = F : e !== F && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === F ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, W = class extends U {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === F ? void 0 : e;
	}
}, ge = class extends U {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== F);
	}
}, _e = class extends U {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = V(this, e, t, 0) ?? F) === P) return;
		let n = this._$AH, r = e === F && n !== F || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== F && (n === F || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, ve = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		V(this, e);
	}
}, ye = {
	M: S,
	P: C,
	A: w,
	C: 1,
	L: z,
	R: he,
	D: ce,
	V,
	I: H,
	H: U,
	N: ge,
	U: _e,
	B: W,
	F: ve
}, be = v.litHtmlPolyfillSupport;
be?.(B, H), (v.litHtmlVersions ?? (v.litHtmlVersions = [])).push("3.3.3");
var xe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new H(t.insertBefore(E(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, G = globalThis, K = class extends _ {
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
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = xe(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return P;
	}
};
K._$litElement$ = !0, K.finalized = !0, G.litElementHydrateSupport?.({ LitElement: K });
var Se = G.litElementPolyfillSupport;
Se?.({ LitElement: K }), (G.litElementVersions ?? (G.litElementVersions = [])).push("4.2.2");
//#endregion
//#region src/channels.ts
var Ce = /([\w-]+)="([^"]*)"/g, we = /\/proxy\/ts\/stream\/([^/?#]+)/;
function Te(e) {
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
	for (let e of i.matchAll(Ce)) t[e[1].toLowerCase()] = e[2];
	return {
		attrs: t,
		name: r >= 0 ? e.slice(r + 1).trim() : ""
	};
}
function Ee(e) {
	let t = e.replace(/^\uFEFF/, "").split(/\r?\n/), n = [], r;
	for (let e of t) {
		let t = e.trim();
		if (!t) continue;
		if (t.startsWith("#EXTINF")) {
			r = Te(t);
			continue;
		}
		if (t.startsWith("#") || !r) continue;
		let { attrs: i, name: a } = r;
		r = void 0;
		let o = we.exec(t)?.[1];
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
var q = (e) => e.trim().toLocaleLowerCase();
function De(e, t) {
	let n = e.number === void 0 ? NaN : Number(e.number), r = t.number === void 0 ? NaN : Number(t.number);
	return !Number.isNaN(n) && !Number.isNaN(r) && n !== r ? n - r : !Number.isNaN(n) && Number.isNaN(r) ? -1 : Number.isNaN(n) && !Number.isNaN(r) ? 1 : e.name.localeCompare(t.name);
}
var Oe = class {
	constructor(e, t = {}) {
		this.all = e;
		let n = (t.groups ?? []).map(q), r = (e) => !n.length || n.includes(q(e.group ?? ""));
		this.channels = e.filter(r).sort(De);
		let i = /* @__PURE__ */ new Set(), a = [];
		for (let t of e) t.group && r(t) && !i.has(t.group) && (i.add(t.group), a.push(t.group));
		n.length && a.sort((e, t) => n.indexOf(q(e)) - n.indexOf(q(t))), this.groups = a, this.favourites = (t.favourites ?? []).map((e) => this.find(e)).filter((e) => !!e);
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
		let t = e.trim(), n = q(t);
		return this.all.find((e) => e.id === t || e.streamId === t) ?? this.all.find((e) => e.number !== void 0 && e.number === t) ?? this.all.find((e) => q(e.name) === n);
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
		let n = t === "★" ? this.favourites : t ? this.channels.filter((e) => e.group === t) : this.channels, r = q(e);
		return r ? n.filter((e) => q(e.name).includes(r) || (e.number ?? "").startsWith(r)) : n;
	}
}, J = /* @__PURE__ */ new Map(), ke = 6e5, Ae = 15e3, Y = class extends Error {
	constructor(...e) {
		super(...e), this.name = "ChannelListError";
	}
};
function je(e, { force: t = !1 } = {}) {
	let n = J.get(e);
	if (n && !t && Date.now() - n.at < ke) return n.promise;
	let r = (async () => {
		let t = new AbortController(), n = setTimeout(() => t.abort(), Ae);
		try {
			let n = await fetch(e, {
				cache: "no-store",
				signal: t.signal
			});
			if (!n.ok) throw new Y(`HTTP ${n.status}`);
			return Ee(await n.text());
		} catch (e) {
			throw e instanceof Y ? e : t.signal.aborted ? new Y(`no answer in ${Ae / 1e3} s`) : new Y(`network error: ${e instanceof Error ? e.message : e}`);
		} finally {
			clearTimeout(n);
		}
	})();
	return J.set(e, {
		at: Date.now(),
		promise: r
	}), r.catch(() => {
		J.get(e)?.promise === r && J.delete(e);
	}), r;
}
//#endregion
//#region src/icons.ts
var Me = {
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
}, X = (e) => {
	let t = Me[e];
	return N`<svg class=${t.fill ? "icon fill" : t.heavy ? "icon heavy" : "icon"} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d=${t.d}></path></svg>`;
}, Ne = "\n  svg.icon {\n    width: 22px;\n    height: 22px;\n    flex: none;\n    fill: none;\n    stroke: currentColor;\n    stroke-width: 1.9;\n    stroke-linecap: round;\n    stroke-linejoin: round;\n  }\n  svg.icon.fill {\n    fill: currentColor;\n    stroke: none;\n  }\n  svg.icon.heavy {\n    stroke-width: 3.2;\n  }\n", Pe = o`
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
function Fe(e) {
	return e.replace(/\b(hd|sd|fhd|uhd|4k)\b/gi, "").trim().split(/\s+/).slice(0, 2).map((e) => e.charAt(0)).join("").toUpperCase();
}
function Ie(e, t) {
	if (!(!e?.start || !e.end || e.end <= e.start)) return Math.max(0, Math.min(100, (t - e.start) / (e.end - e.start) * 100));
}
function Z(e) {
	return new Date(e).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit"
	});
}
function Le(e) {
	let t = Math.max(0, Math.ceil(e / 1e3));
	return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
function Re(e) {
	let t = Math.max(0, Math.ceil(e / 6e4));
	return t >= 60 ? `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, "0")}m` : `${t}m`;
}
function Q(e) {
	return e ? e.number ? `${e.number} ${e.name}` : e.name : "";
}
function ze(e = navigator.userAgent) {
	return /CrKey|GoogleTV|Android TV|AFT[A-Z]|SMART-TV|Tizen|Web0S/i.test(e) ? "tv" : "standard";
}
//#endregion
//#region src/ui/stage.ts
var Be = [
	0,
	15,
	30,
	60,
	90
], Ve = (e) => e.target.hidden = !1, He = (e) => e.target.hidden = !0;
function Ue(e, t, n = "") {
	let r = e?.name ?? t ?? "";
	return M`<span class="logo ${n}" aria-hidden="true">
    ${e?.logo ? M`<img src=${e.logo} alt="" decoding="async" @load=${Ve} @error=${He} />` : F}
    <span class="ini">${Fe(r) || "▶"}</span>
  </span>`;
}
function We(e, t = "") {
	return e === void 0 ? F : M`<span class="bar ${t}"><span style="width:${e.toFixed(1)}%"></span></span>`;
}
function Ge(e) {
	let t = e.channel, n = e.title ?? t?.name;
	if (!n && e.ui !== "playing" || e.ui === "preview" || e.ui === "empty") return F;
	let r = e.nowNext?.now, i = e.nowNext?.next;
	return M`<div class="ident ${e.chrome ? "" : "hidden"}">
    ${Ue(t, n, "ident-logo")}
    <div class="ident-text">
      <div class="ident-line">
        ${t?.number ? M`<span class="ident-num mono">${t.number}</span>` : F}
        <span class="title">${n ?? "Live"}</span>
      </div>
      ${r ? M`<div class="ident-now">${r.title}</div>` : F}
      ${r?.start && r.end ? M`<div class="ident-times mono">
              <span>${Z(r.start)}</span>${We(Ie(r, e.now))}<span
                >${Z(r.end)}</span
              >
            </div>` : F}
      ${i ? M`<div class="ident-next">
              Next${i.start ? M` <span class="mono">${Z(i.start)}</span>` : F}:
              ${i.title}
            </div>` : F}
    </div>
  </div>`;
}
function Ke(e) {
	return e.ui !== "playing" && !e.sleep || e.numberEntry?.digits ? F : M`<div class="chips-top ${e.chrome ? "" : "hidden"}">
    ${e.sleep && !e.sleep.warning ? M`<span class="glass chip-top sleep-chip">
            ${X("sleep")} Stops in <span class="mono">${Re(e.sleep.remainingMs)}</span>
          </span>` : F}
    ${e.ui === "playing" ? M`<span class="glass chip-top live"
            ><span class="live-dot" role="img" aria-label="Live"></span>LIVE</span
          >` : F}
  </div>`;
}
function qe(e) {
	let t = e.numberEntry;
	if (t?.digits) {
		let e = t.candidates.slice(0, 3).map((e) => Q(e)).join(" · ");
		return M`<div class="osd typing" role="status" aria-label="Channel ${t.digits}">
      <span class="osd-number mono">${t.digits}<span class="cursor">_</span></span>
      <span class="osd-hint">${e || "No channel with that number"}</span>
    </div>`;
	}
	let n = e.channel;
	return !e.osd || !n?.number || e.ui === "connecting" || e.ui === "error" ? F : M`<div class="osd" aria-hidden="true">
    <span class="osd-number mono">${n.number}</span>
    <span class="osd-text">
      <span class="osd-label">Now on</span>
      <span class="osd-name">${n.name}</span>
    </span>
  </div>`;
}
function $(e, t) {
	return M`<div class="layer ${t ? "dim" : ""}">
    <button class="big-play" @click=${e.play} aria-label="Play">${X("play")}</button>
    ${t ? M`<div class="message">${t}</div>` : F}
  </div>`;
}
function Je(e, t) {
	if (e.sleep?.warning && (e.ui === "playing" || e.ui === "reconnecting")) return M`<div class="layer dim sleep-warning" role="alert">
      <span class="state-icon">${X("sleep")}</span>
      <div class="message big">
        Stopping in <span class="mono">${Le(e.sleep.remainingMs)}</span>
      </div>
      <div class="actions">
        ${t.setSleep ? M`<button class="pill light keep-watching" @click=${() => t.setSleep?.(0)}>
                Keep watching
              </button>` : F}
        ${t.extendSleep ? M`<button class="pill extend-sleep" @click=${() => t.extendSleep?.(30)}>
                +30 min
              </button>` : F}
      </div>
    </div>`;
	switch (e.ui) {
		case "preview": {
			let t = e.edit;
			return M`<div class="layer edit">
        <span class="state-icon muted">${X("tv")}</span>
        <div class="message">Playback is off while editing</div>
        ${t ? M`<div class="edit-tags">
                <span class="tag mono">target: ${t.target}</span>
                ${t.profile ? M`<span class="tag mono">profile ${t.profile}</span>` : F}
                ${t.favourites ? M`<span class="tag mono"
                        >${t.favourites} favourite${t.favourites === 1 ? "" : "s"}</span
                      >` : F}
              </div>` : F}
      </div>`;
		}
		case "empty": return M`<div class="layer">
        <span class="state-icon muted">${X("tv")}</span>
        <div class="message">${e.hasGuide ? "Choose a channel below" : "Choose a channel"}</div>
      </div>`;
		case "error": {
			let n = t.lastChannel && e.previousChannel ? e.previousChannel : void 0;
			return M`<div class="layer solid" role="alert">
        <span class="state-icon warn">${X("alert")}</span>
        <div class="message">${e.errorMessage}</div>
        ${e.errorDetail ? M`<div class="message detail">${e.errorDetail}</div>` : F}
        <div class="actions">
          ${n ? M`<button class="pill primary back-to" @click=${() => t.lastChannel?.()}>
                  Back to <span class="mono">${n.number ?? n.name}</span>
                </button>` : F}
          ${e.canRetry ? M`<button class="pill ${n ? "" : "primary"} retry" @click=${t.play}>
                  ${X("refresh")} Retry
                </button>` : F}
          ${e.hasGuide ? M`<button
                  class="pill channels"
                  @click=${t.toggleGuide}
                  aria-expanded=${e.guideOpen ? "true" : "false"}
                >
                  ${X("guide")} Channels
                </button>` : F}
        </div>
      </div>`;
		}
		case "connecting": {
			if (e.needsGesture) return $(t, "Tap to play");
			let n = e.channel, r = e.title ?? n?.name;
			return M`<div class="layer tuning">
        ${r ? Ue(n, r, "tuning-logo") : F}
        ${r ? M`<div class="tuning-name">
                ${n?.number ? M`<span class="mono">${n.number}</span>` : F} ${r}
              </div>` : F}
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
			if (e.needsGesture) return $(t, "Tap to play");
			let n = e.retryAt ? Math.max(0, Math.ceil((e.retryAt - e.now) / 1e3)) : 0;
			return M`<div class="layer dim">
        <span class="spinner" role="progressbar" aria-label="Reconnecting"></span>
        <div class="message big">Picture dropped. Reconnecting…</div>
        <div class="message sub mono">
          try ${e.failures} of ${e.maxAttempts}${n > 0 ? ` · next in ${n} s` : ""}
        </div>
      </div>`;
		}
		case "playing": return e.needsGesture ? $(t, "Tap to play") : e.mutedByPolicy ? M`<div class="layer">
          <button class="pill glass unmute" @click=${t.unmute} aria-label="Unmute">
            ${X("volumeOff")} Tap for sound
          </button>
        </div>` : e.buffering ? M`<div class="layer">
          <span class="spinner" role="progressbar" aria-label="Buffering"></span>
          <div class="message">Buffering…</div>
        </div>` : F;
		case "ready": return $(t, e.stoppedReason);
	}
}
function Ye(e, t) {
	if (!e.sleepMenuOpen || !t.setSleep) return F;
	let n = e.sleep ? Math.ceil(e.sleep.remainingMs / 6e4) : 0;
	return M`<div class="glass sleep-menu" role="group" aria-label="Stop playing after">
    <span class="menu-label">Stop playing after</span>
    <div class="sleep-options">
      ${Be.map((r) => M`<button
          class="sleep-option"
          aria-pressed=${(r === 0 ? !e.sleep : Be.includes(n) && n === r) ? "true" : "false"}
          @click=${(e) => {
		e.stopPropagation(), t.setSleep?.(r), t.toggleSleepMenu();
	}}
        >
          ${r === 0 ? "Off" : `${r}m`}
        </button>`)}
    </div>
  </div>`;
}
function Xe(e, t) {
	let n = e.settings, r = t.settings;
	if (!n?.open || !r) return F;
	let i = (e, t) => M`<button
      class="seg-option buffer-${e}"
      role="radio"
      aria-checked=${n.buffer === e ? "true" : "false"}
      @click=${() => r.setBuffer(e)}
    >
      ${t}
    </button>`, a = (e, t, n, r) => M`<button
      class="setting toggle ${e}"
      role="switch"
      aria-checked=${n ? "true" : "false"}
      @click=${() => r(!n)}
    >
      <span class="setting-name">${t}</span>
      <span class="switch" aria-hidden="true"></span>
    </button>`;
	return M`<div class="glass menu settings-panel" role="group" aria-label="Settings">
    <div class="menu-head">
      <span class="menu-label">On this device</span>
      ${n.custom ? M`<button
              class="reset-settings"
              @click=${() => r.reset()}
              title="Use the dashboard's settings"
            >
              Reset
            </button>` : F}
    </div>
    <div class="setting">
      <span class="setting-name">Buffering</span>
      <div class="seg" role="radiogroup" aria-label="Buffering">
        ${i("low", "Low delay")} ${i("stable", "Stable")}
      </div>
      <span class="setting-hint">
        ${n.buffer === "stable" ? "Smoother on slow devices, a few seconds behind" : "Starts fast, stays close to live"}
      </span>
    </div>
    ${n.nowNext === void 0 ? F : a("set-nownext", "Now and next", n.nowNext, r.setNowNext)}
    ${a("set-stats", "Stats overlay", n.stats, r.setStats)}
  </div>`;
}
function Ze(e, t) {
	if (e.ui === "preview" || e.ui === "empty" || e.ui === "error" || e.layout === "tv") return F;
	let n = e.ui === "playing" || e.ui === "connecting" || e.ui === "reconnecting", r = e.previousChannel, i = e.nowNext?.next, a = Math.round((e.muted ? 0 : e.volume ?? 1) * 100);
	return M`<div class="controls ${e.chrome ? "" : "hidden"}" @click=${Qe}>
    <div class="group transport">
      ${n ? M`<button class="ctl ctl-stop" @click=${t.stop} aria-label="Stop">
              ${X("stop")}
            </button>` : F}
      ${t.lastChannel && r ? M`<button
              class="ctl ctl-last"
              @click=${() => t.lastChannel?.()}
              aria-label="Last channel: ${Q(r)}"
              title="Last channel: ${Q(r)}"
            >
              ${X("last")}
            </button>` : F}
      ${e.canStep ? M`<span class="sep" aria-hidden="true"></span>
              <button class="ctl ctl-down" @click=${t.channelDown} aria-label="Previous channel">
                ${X("chevronDown")}
              </button>
              <button class="ctl ctl-up" @click=${t.channelUp} aria-label="Next channel">
                ${X("chevronUp")}
              </button>` : F}
      <span class="row-break" aria-hidden="true"></span>
    </div>
    <div class="group upnext ${i ? "" : "empty"}">
      ${i ? M`<span class="upnext-label">Next</span>
              ${i.start ? M`<span class="mono upnext-time">${Z(i.start)}</span>` : F}
              <span class="upnext-title">${i.title}</span>` : F}
    </div>
    <div class="group sound">
      <button class="ctl ctl-mute" @click=${t.toggleMute} aria-label=${e.muted ? "Unmute" : "Mute"}>
        ${X(e.muted ? "volumeOff" : a < 50 ? "volumeLow" : "volumeHigh")}
      </button>
      ${t.setVolume ? M`<input
              class="vol-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              aria-label="Volume"
              .value=${String(a)}
              style="--vol:${a}%"
              @input=${(e) => t.setVolume?.(Number(e.target.value) / 100)}
            />` : F}
      <span class="sep" aria-hidden="true"></span>
      ${t.setSleep ? M`<button
              class="ctl ctl-sleep ${e.sleep || e.sleepMenuOpen ? "on" : ""}"
              @click=${t.toggleSleepMenu}
              aria-label=${e.sleep ? `Sleep timer, ${Re(e.sleep.remainingMs)} left` : "Sleep timer"}
              aria-expanded=${e.sleepMenuOpen ? "true" : "false"}
            >
              ${X("sleep")}
            </button>` : F}
      ${e.hasGuide ? M`<button
              class="ctl ctl-channels ${e.guideOpen ? "on" : ""}"
              @click=${t.toggleGuide}
              aria-label=${e.guideOpen ? "Hide channels" : "Channels"}
              aria-expanded=${e.guideOpen ? "true" : "false"}
            >
              ${X("guide")}
            </button>` : F}
      ${t.multiview ? M`<button
              class="ctl ctl-multiview"
              @click=${() => t.multiview?.()}
              aria-label="Multiview"
            >
              ${X("grid")}
            </button>` : F}
      ${e.settings && t.settings ? M`<button
              class="ctl ctl-settings ${e.settings.open ? "on" : ""}"
              @click=${t.settings.toggle}
              aria-label="Settings"
              aria-expanded=${e.settings.open ? "true" : "false"}
            >
              ${X("settings")}
            </button>` : F}
      <button
        class="ctl ctl-fullscreen"
        @click=${t.toggleFullscreen}
        aria-label=${e.fullscreen ? "Exit full screen" : "Full screen"}
      >
        ${X(e.fullscreen ? "fullscreenExit" : "fullscreen")}
      </button>
      ${Ye(e, t)} ${Xe(e, t)}
    </div>
  </div>`;
}
function Qe(e) {
	e.stopPropagation();
}
function $e(e, t) {
	return e.layout !== "tv" || !e.chrome || e.ui === "preview" ? F : M`<div class="tv-hints" aria-hidden="true">
    ${t ? M`<span><span class="key">▲</span><span class="key">▼</span>Channel</span>
            <span><span class="key mono">0–9</span>Number</span>
            <span><span class="key">OK</span>Guide</span>
            <span><span class="key">BACK</span>Last channel</span>` : F}
    <span class="tv-clock mono">${Z(e.now)}</span>
  </div>`;
}
//#endregion
export { s as C, N as S, a as T, K as _, qe as a, M as b, Q as c, Ie as d, Pe as f, je as g, Oe as h, Ge as i, ze as l, Ne as m, Ke as n, $e as o, X as p, Ze as r, Xe as s, Je as t, Fe as u, F as v, o as w, ye as x, P as y };

//# sourceMappingURL=stream-card-view-DJ6sjYBV.js.map