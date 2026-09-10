// @__NO_SIDE_EFFECTS__
function Os(t) {
  const e = /* @__PURE__ */ Object.create(null);
  for (const s of t.split(",")) e[s] = 1;
  return (s) => s in e;
}
const K = {}, Qt = [], St = () => {
}, In = () => !1, Ge = (t) => t.charCodeAt(0) === 111 && t.charCodeAt(1) === 110 && // uppercase letter
(t.charCodeAt(2) > 122 || t.charCodeAt(2) < 97), Je = (t) => t.startsWith("onUpdate:"), Z = Object.assign, As = (t, e) => {
  const s = t.indexOf(e);
  s > -1 && t.splice(s, 1);
}, Li = Object.prototype.hasOwnProperty, D = (t, e) => Li.call(t, e), I = Array.isArray, Bt = (t) => Te(t) === "[object Map]", bs = (t) => Te(t) === "[object Set]", en = (t) => Te(t) === "[object Date]", M = (t) => typeof t == "function", J = (t) => typeof t == "string", Lt = (t) => typeof t == "symbol", W = (t) => t !== null && typeof t == "object", Rn = (t) => (W(t) || M(t)) && M(t.then) && M(t.catch), Ni = Object.prototype.toString, Te = (t) => Ni.call(t), $i = (t) => Te(t).slice(8, -1), Vi = (t) => Te(t) === "[object Object]", Ps = (t) => J(t) && t !== "NaN" && t[0] !== "-" && "" + parseInt(t, 10) === t, de = /* @__PURE__ */ Os(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), Ye = (t) => {
  const e = /* @__PURE__ */ Object.create(null);
  return ((s) => e[s] || (e[s] = t(s)));
}, Ui = /-\w/g, ct = Ye(
  (t) => t.replace(Ui, (e) => e.slice(1).toUpperCase())
), Ki = /\B([A-Z])/g, zt = Ye(
  (t) => t.replace(Ki, "-$1").toLowerCase()
), Fn = Ye((t) => t.charAt(0).toUpperCase() + t.slice(1)), rs = Ye(
  (t) => t ? `on${Fn(t)}` : ""
), Pt = (t, e) => !Object.is(t, e), os = (t, ...e) => {
  for (let s = 0; s < t.length; s++)
    t[s](...e);
}, Dn = (t, e, s, n = !1) => {
  Object.defineProperty(t, e, {
    configurable: !0,
    enumerable: !1,
    writable: n,
    value: s
  });
}, Wi = (t) => {
  const e = parseFloat(t);
  return isNaN(e) ? t : e;
};
let sn;
const ze = () => sn || (sn = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function Ms(t) {
  if (I(t)) {
    const e = {};
    for (let s = 0; s < t.length; s++) {
      const n = t[s], i = J(n) ? Gi(n) : Ms(n);
      if (i)
        for (const r in i)
          e[r] = i[r];
    }
    return e;
  } else if (J(t) || W(t))
    return t;
}
const Bi = /;(?![^(]*\))/g, qi = /:([^]+)/, ki = /\/\*[^]*?\*\//g;
function Gi(t) {
  const e = {};
  return t.replace(ki, "").split(Bi).forEach((s) => {
    if (s) {
      const n = s.split(qi);
      n.length > 1 && (e[n[0].trim()] = n[1].trim());
    }
  }), e;
}
function Is(t) {
  let e = "";
  if (J(t))
    e = t;
  else if (I(t))
    for (let s = 0; s < t.length; s++) {
      const n = Is(t[s]);
      n && (e += n + " ");
    }
  else if (W(t))
    for (const s in t)
      t[s] && (e += s + " ");
  return e.trim();
}
const Ji = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Yi = /* @__PURE__ */ Os(Ji);
function jn(t) {
  return !!t || t === "";
}
function zi(t, e) {
  if (t.length !== e.length) return !1;
  let s = !0;
  for (let n = 0; s && n < t.length; n++)
    s = Xe(t[n], e[n]);
  return s;
}
function nn(t, e) {
  if (t.size !== e.size) return !1;
  const s = Array.from(e), n = new Uint8Array(s.length);
  for (const i of t) {
    let r = -1;
    for (let o = 0; o < s.length; o++)
      if (!n[o] && Xe(i, s[o])) {
        r = o;
        break;
      }
    if (r < 0) return !1;
    n[r] = 1;
  }
  return !0;
}
function Xe(t, e) {
  if (t === e) return !0;
  let s = en(t), n = en(e);
  if (s || n)
    return s && n ? t.getTime() === e.getTime() : !1;
  if (s = Lt(t), n = Lt(e), s || n)
    return t === e;
  if (s = I(t), n = I(e), s || n)
    return s && n ? zi(t, e) : !1;
  if (s = W(t), n = W(e), s || n) {
    if (!s || !n)
      return !1;
    if (s = Bt(t), n = Bt(e), s || n || (s = bs(t), n = bs(e), s || n))
      return s && n ? nn(t, e) : !1;
    const i = Object.keys(t).length, r = Object.keys(e).length;
    if (i !== r)
      return !1;
    for (const o in t) {
      const l = t.hasOwnProperty(o), f = e.hasOwnProperty(o);
      if (l && !f || !l && f || !Xe(t[o], e[o]))
        return !1;
    }
  }
  return String(t) === String(e);
}
let X;
class Xi {
  // TODO isolatedDeclarations "__v_skip"
  constructor(e = !1) {
    this.detached = e, this._active = !0, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = !1, this._warnOnRun = !0, this.__v_skip = !0, !e && X && (X.active ? (this.parent = X, this.index = (X.scopes || (X.scopes = [])).push(
      this
    ) - 1) : (this._active = !1, this._warnOnRun = !1));
  }
  get active() {
    return this._active;
  }
  pause() {
    if (this._active) {
      this._isPaused = !0;
      let e, s;
      if (this.scopes) {
        const n = this.scopes.slice();
        for (e = 0, s = n.length; e < s; e++)
          n[e].pause();
      }
      for (e = 0, s = this.effects.length; e < s; e++)
        this.effects[e].pause();
    }
  }
  /**
   * Resumes the effect scope, including all child scopes and effects.
   */
  resume() {
    if (this._active && this._isPaused) {
      this._isPaused = !1;
      let e, s;
      if (this.scopes) {
        const i = this.scopes.slice();
        for (e = 0, s = i.length; e < s; e++)
          i[e].resume();
      }
      const n = this.effects.slice();
      for (e = 0, s = n.length; e < s; e++)
        n[e].resume();
    }
  }
  run(e) {
    if (this._active) {
      const s = X;
      try {
        return X = this, e();
      } finally {
        X = s;
      }
    }
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    ++this._on === 1 && (this.prevScope = X, X = this);
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    if (this._on > 0 && --this._on === 0) {
      if (X === this)
        X = this.prevScope;
      else {
        let e = X;
        for (; e; ) {
          if (e.prevScope === this) {
            e.prevScope = this.prevScope;
            break;
          }
          e = e.prevScope;
        }
      }
      this.prevScope = void 0;
    }
  }
  stop(e) {
    if (this._active) {
      this._active = !1;
      let s, n;
      for (s = 0, n = this.effects.length; s < n; s++)
        this.effects[s].stop();
      for (this.effects.length = 0, s = 0, n = this.cleanups.length; s < n; s++)
        this.cleanups[s]();
      if (this.cleanups.length = 0, this.scopes) {
        const i = this.scopes.slice();
        for (s = 0, n = i.length; s < n; s++)
          i[s].stop(!0);
        this.scopes.length = 0;
      }
      if (!this.detached && this.parent && !e) {
        const i = this.parent.scopes.pop();
        i && i !== this && (this.parent.scopes[this.index] = i, i.index = this.index);
      }
      this.parent = void 0;
    }
  }
}
function Zi() {
  return X;
}
let U;
const ls = /* @__PURE__ */ new WeakSet();
class Hn {
  constructor(e) {
    this.fn = e, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, X && (X.active ? X.effects.push(this) : this.flags &= -2);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, ls.has(this) && (ls.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Nn(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, rn(this), $n(this);
    const e = U, s = ft;
    U = this, ft = !0;
    try {
      return this.fn();
    } finally {
      Vn(this), U = e, ft = s, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let e = this.deps; e; e = e.nextDep)
        Ds(e);
      this.deps = this.depsTail = void 0, rn(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? ls.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    vs(this) && this.run();
  }
  get dirty() {
    return vs(this);
  }
}
let Ln = 0, pe, he;
function Nn(t, e = !1) {
  if (t.flags |= 8, e) {
    t.next = he, he = t;
    return;
  }
  t.next = pe, pe = t;
}
function Rs() {
  Ln++;
}
function Fs() {
  if (--Ln > 0)
    return;
  if (he) {
    let e = he;
    for (he = void 0; e; ) {
      const s = e.next;
      e.next = void 0, e.flags &= -9, e = s;
    }
  }
  let t;
  for (; pe; ) {
    let e = pe;
    for (pe = void 0; e; ) {
      const s = e.next;
      if (e.next = void 0, e.flags &= -9, e.flags & 1)
        try {
          e.trigger();
        } catch (n) {
          t || (t = n);
        }
      e = s;
    }
  }
  if (t) throw t;
}
function $n(t) {
  for (let e = t.deps; e; e = e.nextDep)
    e.version = -1, e.prevActiveLink = e.dep.activeLink, e.dep.activeLink = e;
}
function Vn(t) {
  let e, s = t.depsTail, n = s;
  for (; n; ) {
    const i = n.prevDep;
    n.version === -1 ? (n === s && (s = i), Ds(n), Qi(n)) : e = n, n.dep.activeLink = n.prevActiveLink, n.prevActiveLink = void 0, n = i;
  }
  t.deps = e, t.depsTail = s;
}
function vs(t) {
  for (let e = t.deps; e; e = e.nextDep)
    if (e.dep.version !== e.version || e.dep.computed && (Un(e.dep.computed) || e.dep.version !== e.version))
      return !0;
  return !!t._dirty;
}
function Un(t) {
  if (t.flags & 4 && !(t.flags & 16) || (t.flags &= -17, t.globalVersion === me) || (t.globalVersion = me, !t.isSSR && t.flags & 128 && (!t.deps && !t._dirty || !vs(t))))
    return;
  t.flags |= 2;
  const e = t.dep, s = U, n = ft;
  U = t, ft = !0;
  try {
    $n(t);
    const i = t.fn(t._value);
    (e.version === 0 || Pt(i, t._value)) && (t.flags |= 128, t._value = i, e.version++);
  } catch (i) {
    throw e.version++, i;
  } finally {
    U = s, ft = n, Vn(t), t.flags &= -3;
  }
}
function Ds(t, e = !1) {
  const { dep: s, prevSub: n, nextSub: i } = t;
  if (n && (n.nextSub = i, t.prevSub = void 0), i && (i.prevSub = n, t.nextSub = void 0), s.subs === t && (s.subs = n, !n && s.computed)) {
    s.computed.flags &= -5;
    for (let r = s.computed.deps; r; r = r.nextDep)
      Ds(r, !0);
  }
  !e && !--s.sc && s.map && s.map.delete(s.key);
}
function Qi(t) {
  const { prevDep: e, nextDep: s } = t;
  e && (e.nextDep = s, t.prevDep = void 0), s && (s.prevDep = e, t.nextDep = void 0);
}
let ft = !0;
const Kn = [];
function It() {
  Kn.push(ft), ft = !1;
}
function Rt() {
  const t = Kn.pop();
  ft = t === void 0 ? !0 : t;
}
function rn(t) {
  const { cleanup: e } = t;
  if (t.cleanup = void 0, e) {
    const s = U;
    U = void 0;
    try {
      e();
    } finally {
      U = s;
    }
  }
}
let me = 0;
class tr {
  constructor(e, s) {
    this.sub = e, this.dep = s, this.version = s.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class Wn {
  // TODO isolatedDeclarations "__v_skip"
  constructor(e) {
    this.computed = e, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = !0;
  }
  track(e) {
    if (!U || !ft || U === this.computed)
      return;
    let s = this.activeLink;
    if (s === void 0 || s.sub !== U)
      s = this.activeLink = new tr(U, this), U.deps ? (s.prevDep = U.depsTail, U.depsTail.nextDep = s, U.depsTail = s) : U.deps = U.depsTail = s, Bn(s);
    else if (s.version === -1 && (s.version = this.version, s.nextDep)) {
      const n = s.nextDep;
      n.prevDep = s.prevDep, s.prevDep && (s.prevDep.nextDep = n), s.prevDep = U.depsTail, s.nextDep = void 0, U.depsTail.nextDep = s, U.depsTail = s, U.deps === s && (U.deps = n);
    }
    return s;
  }
  trigger(e) {
    this.version++, me++, this.notify(e);
  }
  notify(e) {
    Rs();
    try {
      for (let s = this.subs; s; s = s.prevSub)
        s.sub.notify() && s.sub.dep.notify();
    } finally {
      Fs();
    }
  }
}
function Bn(t) {
  if (t.dep.sc++, t.sub.flags & 4) {
    const e = t.dep.computed;
    if (e && !t.dep.subs) {
      e.flags |= 20;
      for (let n = e.deps; n; n = n.nextDep)
        Bn(n);
    }
    const s = t.dep.subs;
    s !== t && (t.prevSub = s, s && (s.nextSub = t)), t.dep.subs = t;
  }
}
const ms = /* @__PURE__ */ new WeakMap(), qt = /* @__PURE__ */ Symbol(
  ""
), _s = /* @__PURE__ */ Symbol(
  ""
), _e = /* @__PURE__ */ Symbol(
  ""
);
function Q(t, e, s) {
  if (ft && U) {
    let n = ms.get(t);
    n || ms.set(t, n = /* @__PURE__ */ new Map());
    let i = n.get(s);
    i || (n.set(s, i = new Wn()), i.map = n, i.key = s), i.track();
  }
}
function Mt(t, e, s, n, i, r) {
  const o = ms.get(t);
  if (!o) {
    me++;
    return;
  }
  const l = (f) => {
    f && f.trigger();
  };
  if (Rs(), e === "clear")
    o.forEach(l);
  else {
    const f = I(t), p = f && Ps(s);
    if (f && s === "length") {
      const a = Number(n);
      o.forEach((h, C) => {
        (C === "length" || C === _e || !Lt(C) && C >= a) && l(h);
      });
    } else
      switch ((s !== void 0 || o.has(void 0)) && l(o.get(s)), p && l(o.get(_e)), e) {
        case "add":
          f ? p && l(o.get("length")) : (l(o.get(qt)), Bt(t) && l(o.get(_s)));
          break;
        case "delete":
          f || (l(o.get(qt)), Bt(t) && l(o.get(_s)));
          break;
        case "set":
          Bt(t) && l(o.get(qt));
          break;
      }
  }
  Fs();
}
function Xt(t) {
  const e = /* @__PURE__ */ N(t);
  return e === t ? e : (Q(e, "iterate", _e), /* @__PURE__ */ Tt(t) ? e : e.map(Jt));
}
function js(t) {
  return Q(t = /* @__PURE__ */ N(t), "iterate", _e), t;
}
function yt(t, e) {
  return /* @__PURE__ */ Gt(t) ? ye(/* @__PURE__ */ te(t) ? Jt(e) : e) : Jt(e);
}
const er = {
  __proto__: null,
  [Symbol.iterator]() {
    return cs(this, Symbol.iterator, (t) => yt(this, t));
  },
  concat(...t) {
    return Xt(this).concat(
      ...t.map((e) => I(e) ? Xt(e) : e)
    );
  },
  entries() {
    return cs(this, "entries", (t) => (t[1] = yt(this, t[1]), t));
  },
  every(t, e) {
    return Et(this, "every", t, e, void 0, arguments);
  },
  filter(t, e) {
    return Et(
      this,
      "filter",
      t,
      e,
      (s) => s.map((n) => yt(this, n)),
      arguments
    );
  },
  find(t, e) {
    return Et(
      this,
      "find",
      t,
      e,
      (s) => yt(this, s),
      arguments
    );
  },
  findIndex(t, e) {
    return Et(this, "findIndex", t, e, void 0, arguments);
  },
  findLast(t, e) {
    return Et(
      this,
      "findLast",
      t,
      e,
      (s) => yt(this, s),
      arguments
    );
  },
  findLastIndex(t, e) {
    return Et(this, "findLastIndex", t, e, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(t, e) {
    return Et(this, "forEach", t, e, void 0, arguments);
  },
  includes(...t) {
    return fs(this, "includes", t);
  },
  indexOf(...t) {
    return fs(this, "indexOf", t);
  },
  join(t) {
    return Xt(this).join(t);
  },
  // keys() iterator only reads `length`, no optimization required
  lastIndexOf(...t) {
    return fs(this, "lastIndexOf", t);
  },
  map(t, e) {
    return Et(this, "map", t, e, void 0, arguments);
  },
  pop() {
    return ce(this, "pop");
  },
  push(...t) {
    return ce(this, "push", t);
  },
  reduce(t, ...e) {
    return on(this, "reduce", t, e);
  },
  reduceRight(t, ...e) {
    return on(this, "reduceRight", t, e);
  },
  shift() {
    return ce(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(t, e) {
    return Et(this, "some", t, e, void 0, arguments);
  },
  splice(...t) {
    return ce(this, "splice", t);
  },
  toReversed() {
    return Xt(this).toReversed();
  },
  toSorted(t) {
    return Xt(this).toSorted(t);
  },
  toSpliced(...t) {
    return Xt(this).toSpliced(...t);
  },
  unshift(...t) {
    return ce(this, "unshift", t);
  },
  values() {
    return cs(this, "values", (t) => yt(this, t));
  }
};
function cs(t, e, s) {
  const n = js(t), i = n[e]();
  return n !== t && !/* @__PURE__ */ Tt(t) && (i._next = i.next, i.next = () => {
    const r = i._next();
    return r.done || (r.value = s(r.value)), r;
  }), i;
}
const sr = Array.prototype;
function Et(t, e, s, n, i, r) {
  const o = js(t), l = o !== t && !/* @__PURE__ */ Tt(t), f = o[e];
  if (f !== sr[e]) {
    const h = f.apply(t, r);
    return l ? Jt(h) : h;
  }
  let p = s;
  o !== t && (l ? p = function(h, C) {
    return s.call(this, yt(t, h), C, t);
  } : s.length > 2 && (p = function(h, C) {
    return s.call(this, h, C, t);
  }));
  const a = f.call(o, p, n);
  return l && i ? i(a) : a;
}
function on(t, e, s, n) {
  const i = js(t), r = i !== t && !/* @__PURE__ */ Tt(t);
  let o = s, l = !1;
  i !== t && (r ? (l = n.length === 0, o = function(p, a, h) {
    return l && (l = !1, p = yt(t, p)), s.call(this, p, yt(t, a), h, t);
  }) : s.length > 3 && (o = function(p, a, h) {
    return s.call(this, p, a, h, t);
  }));
  const f = i[e](o, ...n);
  return l ? yt(t, f) : f;
}
function fs(t, e, s) {
  const n = /* @__PURE__ */ N(t);
  Q(n, "iterate", _e);
  const i = n[e](...s);
  return (i === -1 || i === !1) && /* @__PURE__ */ $s(s[0]) ? (s[0] = /* @__PURE__ */ N(s[0]), n[e](...s)) : i;
}
function ce(t, e, s = []) {
  It(), Rs();
  const n = (/* @__PURE__ */ N(t))[e].apply(t, s);
  return Fs(), Rt(), n;
}
const nr = /* @__PURE__ */ Os("__proto__,__v_isRef,__isVue"), qn = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((t) => t !== "arguments" && t !== "caller").map((t) => Symbol[t]).filter(Lt)
);
function ir(t) {
  Lt(t) || (t = String(t));
  const e = /* @__PURE__ */ N(this);
  return Q(e, "has", t), e.hasOwnProperty(t);
}
class kn {
  constructor(e = !1, s = !1) {
    this._isReadonly = e, this._isShallow = s;
  }
  get(e, s, n) {
    if (s === "__v_skip") return e.__v_skip;
    const i = this._isReadonly, r = this._isShallow;
    if (s === "__v_isReactive")
      return !i;
    if (s === "__v_isReadonly")
      return i;
    if (s === "__v_isShallow")
      return r;
    if (s === "__v_raw")
      return n === (i ? r ? hr : zn : r ? Yn : Jn).get(e) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(e) === Object.getPrototypeOf(n) ? e : void 0;
    const o = I(e);
    if (!i) {
      let f;
      if (o && (f = er[s]))
        return f;
      if (s === "hasOwnProperty")
        return ir;
    }
    const l = Reflect.get(
      e,
      s,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      /* @__PURE__ */ it(e) ? e : n
    );
    if ((Lt(s) ? qn.has(s) : nr(s)) || (i || Q(e, "get", s), r))
      return l;
    if (/* @__PURE__ */ it(l)) {
      const f = o && Ps(s) ? l : l.value;
      return i && W(f) ? /* @__PURE__ */ xs(f) : f;
    }
    return W(l) ? i ? /* @__PURE__ */ xs(l) : /* @__PURE__ */ Ls(l) : l;
  }
}
class Gn extends kn {
  constructor(e = !1) {
    super(!1, e);
  }
  set(e, s, n, i) {
    let r = e[s];
    const o = I(e) && Ps(s);
    if (!this._isShallow) {
      const p = /* @__PURE__ */ Gt(r);
      if (!/* @__PURE__ */ Tt(n) && !/* @__PURE__ */ Gt(n) && (r = /* @__PURE__ */ N(r), n = /* @__PURE__ */ N(n)), !o && /* @__PURE__ */ it(r) && !/* @__PURE__ */ it(n))
        return p || (r.value = n), !0;
    }
    const l = o ? Number(s) < e.length : D(e, s), f = Reflect.set(
      e,
      s,
      n,
      /* @__PURE__ */ it(e) ? e : i
    );
    return e === /* @__PURE__ */ N(i) && f && (l ? Pt(n, r) && Mt(e, "set", s, n) : Mt(e, "add", s, n)), f;
  }
  deleteProperty(e, s) {
    const n = D(e, s);
    e[s];
    const i = Reflect.deleteProperty(e, s);
    return i && n && Mt(e, "delete", s, void 0), i;
  }
  has(e, s) {
    const n = Reflect.has(e, s);
    return (!Lt(s) || !qn.has(s)) && Q(e, "has", s), n;
  }
  ownKeys(e) {
    return Q(
      e,
      "iterate",
      I(e) ? "length" : qt
    ), Reflect.ownKeys(e);
  }
}
class rr extends kn {
  constructor(e = !1) {
    super(!0, e);
  }
  set(e, s) {
    return !0;
  }
  deleteProperty(e, s) {
    return !0;
  }
}
const or = /* @__PURE__ */ new Gn(), lr = /* @__PURE__ */ new rr(), cr = /* @__PURE__ */ new Gn(!0);
const ys = (t) => t, Fe = (t) => Reflect.getPrototypeOf(t);
function fr(t, e, s) {
  return function(...n) {
    const i = this.__v_raw, r = /* @__PURE__ */ N(i), o = Bt(r), l = t === "entries" || t === Symbol.iterator && o, f = t === "keys" && o, p = i[t](...n), a = s ? ys : e ? ye : Jt;
    return !e && Q(
      r,
      "iterate",
      f ? _s : qt
    ), Z(
      // inheriting all iterator properties
      Object.create(p),
      {
        // iterator protocol
        next() {
          const { value: h, done: C } = p.next();
          return C ? { value: h, done: C } : {
            value: l ? [a(h[0]), a(h[1])] : a(h),
            done: C
          };
        }
      }
    );
  };
}
function De(t) {
  return function(...e) {
    return t === "delete" ? !1 : t === "clear" ? void 0 : this;
  };
}
function ur(t, e) {
  const s = {
    get(i) {
      const r = this.__v_raw, o = /* @__PURE__ */ N(r), l = /* @__PURE__ */ N(i);
      t || (Pt(i, l) && Q(o, "get", i), Q(o, "get", l));
      const { has: f } = Fe(o), p = e ? ys : t ? ye : Jt;
      if (f.call(o, i))
        return p(r.get(i));
      if (f.call(o, l))
        return p(r.get(l));
      r !== o && r.get(i);
    },
    get size() {
      const i = this.__v_raw;
      return !t && Q(/* @__PURE__ */ N(i), "iterate", qt), i.size;
    },
    has(i) {
      const r = this.__v_raw, o = /* @__PURE__ */ N(r), l = /* @__PURE__ */ N(i);
      return t || (Pt(i, l) && Q(o, "has", i), Q(o, "has", l)), i === l ? r.has(i) : r.has(i) || r.has(l);
    },
    forEach(i, r) {
      const o = this, l = o.__v_raw, f = /* @__PURE__ */ N(l), p = e ? ys : t ? ye : Jt;
      return !t && Q(f, "iterate", qt), l.forEach((a, h) => i.call(r, p(a), p(h), o));
    }
  };
  return Z(
    s,
    t ? {
      add: De("add"),
      set: De("set"),
      delete: De("delete"),
      clear: De("clear")
    } : {
      add(i) {
        const r = /* @__PURE__ */ N(this), o = Fe(r), l = /* @__PURE__ */ N(i), f = !e && !/* @__PURE__ */ Tt(i) && !/* @__PURE__ */ Gt(i) ? l : i;
        return o.has.call(r, f) || Pt(i, f) && o.has.call(r, i) || Pt(l, f) && o.has.call(r, l) || (r.add(f), Mt(r, "add", f, f)), this;
      },
      set(i, r) {
        !e && !/* @__PURE__ */ Tt(r) && !/* @__PURE__ */ Gt(r) && (r = /* @__PURE__ */ N(r));
        const o = /* @__PURE__ */ N(this), { has: l, get: f } = Fe(o);
        let p = l.call(o, i);
        p || (i = /* @__PURE__ */ N(i), p = l.call(o, i));
        const a = f.call(o, i);
        return o.set(i, r), p ? Pt(r, a) && Mt(o, "set", i, r) : Mt(o, "add", i, r), this;
      },
      delete(i) {
        const r = /* @__PURE__ */ N(this), { has: o, get: l } = Fe(r);
        let f = o.call(r, i);
        f || (i = /* @__PURE__ */ N(i), f = o.call(r, i)), l && l.call(r, i);
        const p = r.delete(i);
        return f && Mt(r, "delete", i, void 0), p;
      },
      clear() {
        const i = /* @__PURE__ */ N(this), r = i.size !== 0, o = i.clear();
        return r && Mt(
          i,
          "clear",
          void 0,
          void 0
        ), o;
      }
    }
  ), [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ].forEach((i) => {
    s[i] = fr(i, t, e);
  }), s;
}
function Hs(t, e) {
  const s = ur(t, e);
  return (n, i, r) => i === "__v_isReactive" ? !t : i === "__v_isReadonly" ? t : i === "__v_raw" ? n : Reflect.get(
    D(s, i) && i in n ? s : n,
    i,
    r
  );
}
const ar = {
  get: /* @__PURE__ */ Hs(!1, !1)
}, dr = {
  get: /* @__PURE__ */ Hs(!1, !0)
}, pr = {
  get: /* @__PURE__ */ Hs(!0, !1)
};
const Jn = /* @__PURE__ */ new WeakMap(), Yn = /* @__PURE__ */ new WeakMap(), zn = /* @__PURE__ */ new WeakMap(), hr = /* @__PURE__ */ new WeakMap();
function gr(t) {
  switch (t) {
    case "Object":
    case "Array":
      return 1;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return 2;
    default:
      return 0;
  }
}
// @__NO_SIDE_EFFECTS__
function Ls(t) {
  return /* @__PURE__ */ Gt(t) ? t : Ns(
    t,
    !1,
    or,
    ar,
    Jn
  );
}
// @__NO_SIDE_EFFECTS__
function br(t) {
  return Ns(
    t,
    !1,
    cr,
    dr,
    Yn
  );
}
// @__NO_SIDE_EFFECTS__
function xs(t) {
  return Ns(
    t,
    !0,
    lr,
    pr,
    zn
  );
}
function Ns(t, e, s, n, i) {
  if (!W(t) || t.__v_raw && !(e && t.__v_isReactive) || t.__v_skip || !Object.isExtensible(t))
    return t;
  const r = i.get(t);
  if (r)
    return r;
  const o = gr($i(t));
  if (o === 0)
    return t;
  const l = new Proxy(
    t,
    o === 2 ? n : s
  );
  return i.set(t, l), l;
}
// @__NO_SIDE_EFFECTS__
function te(t) {
  return /* @__PURE__ */ Gt(t) ? /* @__PURE__ */ te(t.__v_raw) : !!(t && t.__v_isReactive);
}
// @__NO_SIDE_EFFECTS__
function Gt(t) {
  return !!(t && t.__v_isReadonly);
}
// @__NO_SIDE_EFFECTS__
function Tt(t) {
  return !!(t && t.__v_isShallow);
}
// @__NO_SIDE_EFFECTS__
function $s(t) {
  return t ? !!t.__v_raw : !1;
}
// @__NO_SIDE_EFFECTS__
function N(t) {
  const e = t && t.__v_raw;
  return e ? /* @__PURE__ */ N(e) : t;
}
function vr(t) {
  return !D(t, "__v_skip") && Object.isExtensible(t) && Dn(t, "__v_skip", !0), t;
}
const Jt = (t) => W(t) ? /* @__PURE__ */ Ls(t) : t, ye = (t) => W(t) ? /* @__PURE__ */ xs(t) : t;
// @__NO_SIDE_EFFECTS__
function it(t) {
  return t ? t.__v_isRef === !0 : !1;
}
function mr(t) {
  return /* @__PURE__ */ it(t) ? t.value : t;
}
const _r = {
  get: (t, e, s) => e === "__v_raw" ? t : mr(Reflect.get(t, e, s)),
  set: (t, e, s, n) => {
    const i = t[e];
    return /* @__PURE__ */ it(i) && !/* @__PURE__ */ it(s) ? (i.value = s, !0) : Reflect.set(t, e, s, n);
  }
};
function Xn(t) {
  return /* @__PURE__ */ te(t) ? t : new Proxy(t, _r);
}
class yr {
  constructor(e, s, n) {
    this.fn = e, this.setter = s, this._value = void 0, this.dep = new Wn(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = me - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !s, this.isSSR = n;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    U !== this)
      return Nn(this, !0), !0;
  }
  get value() {
    const e = this.dep.track();
    return Un(this), e && (e.version = this.dep.version), this._value;
  }
  set value(e) {
    this.setter && this.setter(e);
  }
}
// @__NO_SIDE_EFFECTS__
function xr(t, e, s = !1) {
  let n, i;
  return M(t) ? n = t : (n = t.get, i = t.set), new yr(n, i, s);
}
const je = {}, Ve = /* @__PURE__ */ new WeakMap();
let Wt;
function wr(t, e = !1, s = Wt) {
  if (s) {
    let n = Ve.get(s);
    n || Ve.set(s, n = []), n.push(t);
  }
}
function Cr(t, e, s = K) {
  const { immediate: n, deep: i, once: r, scheduler: o, augmentJob: l, call: f } = s, p = (O) => i ? O : /* @__PURE__ */ Tt(O) || i === !1 || i === 0 ? Ht(O, 1) : Ht(O);
  let a, h, C, S, j = !1, P = !1;
  if (/* @__PURE__ */ it(t) ? (h = () => t.value, j = /* @__PURE__ */ Tt(t)) : /* @__PURE__ */ te(t) ? (h = () => p(t), j = !0) : I(t) ? (P = !0, j = t.some((O) => /* @__PURE__ */ te(O) || /* @__PURE__ */ Tt(O)), h = () => t.map((O) => {
    if (/* @__PURE__ */ it(O))
      return O.value;
    if (/* @__PURE__ */ te(O))
      return p(O);
    if (M(O))
      return f ? f(O, 2) : O();
  })) : M(t) ? e ? h = f ? () => f(t, 2) : t : h = () => {
    if (C) {
      It();
      try {
        C();
      } finally {
        Rt();
      }
    }
    const O = Wt;
    Wt = a;
    try {
      return f ? f(t, 3, [S]) : t(S);
    } finally {
      Wt = O;
    }
  } : h = St, e && i) {
    const O = h, Y = i === !0 ? 1 / 0 : i;
    h = () => Ht(O(), Y);
  }
  const k = Zi(), B = () => {
    a.stop(), k && k.active && As(k.effects, a);
  };
  if (r && e) {
    const O = e;
    e = (...Y) => {
      const dt = O(...Y);
      return B(), dt;
    };
  }
  let F = P ? new Array(t.length).fill(je) : je;
  const H = (O) => {
    if (!(!(a.flags & 1) || !a.dirty && !O))
      if (e) {
        const Y = a.run();
        if (O || i || j || (P ? Y.some((dt, pt) => Pt(dt, F[pt])) : Pt(Y, F))) {
          C && C();
          const dt = Wt;
          Wt = a;
          try {
            const pt = [
              Y,
              // pass undefined as the old value when it's changed for the first time
              F === je ? void 0 : P && F[0] === je ? [] : F,
              S
            ];
            F = Y, f ? f(e, 3, pt) : (
              // @ts-expect-error
              e(...pt)
            );
          } finally {
            Wt = dt;
          }
        }
      } else
        a.run();
  };
  return l && l(H), a = new Hn(h), a.scheduler = o ? () => o(H, !1) : H, S = (O) => wr(O, !1, a), C = a.onStop = () => {
    const O = Ve.get(a);
    if (O) {
      if (f)
        f(O, 4);
      else
        for (const Y of O) Y();
      Ve.delete(a);
    }
  }, e ? n ? H(!0) : F = a.run() : o ? o(H.bind(null, !0), !0) : a.run(), B.pause = a.pause.bind(a), B.resume = a.resume.bind(a), B.stop = B, B;
}
function Ht(t, e = 1 / 0, s) {
  if (e <= 0 || !W(t) || t.__v_skip || (s = s || /* @__PURE__ */ new Map(), (s.get(t) || 0) >= e))
    return t;
  if (s.set(t, e), e--, /* @__PURE__ */ it(t))
    Ht(t.value, e, s);
  else if (I(t))
    for (let n = 0; n < t.length; n++)
      Ht(t[n], e, s);
  else if (bs(t) || Bt(t))
    t.forEach((n) => {
      Ht(n, e, s);
    });
  else if (Vi(t)) {
    for (const n in t)
      Ht(t[n], e, s);
    for (const n of Object.getOwnPropertySymbols(t))
      Object.prototype.propertyIsEnumerable.call(t, n) && Ht(t[n], e, s);
  }
  return t;
}
function Ee(t, e, s, n) {
  try {
    return n ? t(...n) : t();
  } catch (i) {
    Ze(i, e, s);
  }
}
function at(t, e, s, n) {
  if (M(t)) {
    const i = Ee(t, e, s, n);
    return i && Rn(i) && i.catch((r) => {
      Ze(r, e, s);
    }), i;
  }
  if (I(t)) {
    const i = [];
    for (let r = 0; r < t.length; r++)
      i.push(at(t[r], e, s, n));
    return i;
  }
}
function Ze(t, e, s, n = !0) {
  const i = e ? e.vnode : null, { errorHandler: r, throwUnhandledErrorInProduction: o } = e && e.appContext.config || K;
  if (e) {
    let l = e.parent;
    const f = e.proxy, p = `https://vuejs.org/error-reference/#runtime-${s}`;
    for (; l; ) {
      const a = l.ec;
      if (a) {
        for (let h = 0; h < a.length; h++)
          if (a[h](t, f, p) === !1)
            return;
      }
      l = l.parent;
    }
    if (r) {
      It(), Ee(r, null, 10, [
        t,
        f,
        p
      ]), Rt();
      return;
    }
  }
  Sr(t, s, i, n, o);
}
function Sr(t, e, s, n = !0, i = !1) {
  if (i)
    throw t;
  console.error(t);
}
const st = [];
let _t = -1;
const ee = [];
let jt = null, Zt = 0;
const Zn = /* @__PURE__ */ Promise.resolve();
let Ue = null;
function Qn(t) {
  const e = Ue || Zn;
  return t ? e.then(this ? t.bind(this) : t) : e;
}
function Tr(t) {
  let e = _t + 1, s = st.length;
  for (; e < s; ) {
    const n = e + s >>> 1, i = st[n], r = xe(i);
    r < t || r === t && i.flags & 2 ? e = n + 1 : s = n;
  }
  return e;
}
function Vs(t) {
  if (!(t.flags & 1)) {
    const e = xe(t), s = st[st.length - 1];
    !s || // fast path when the job id is larger than the tail
    !(t.flags & 2) && e >= xe(s) ? st.push(t) : st.splice(Tr(e), 0, t), t.flags |= 1, ti();
  }
}
function ti() {
  Ue || (Ue = Zn.then(si));
}
function Er(t) {
  if (!I(t))
    jt && t.id === -1 ? jt.splice(Zt + 1, 0, t) : t.flags & 1 || (ee.push(t), t.flags |= 1);
  else
    for (let e = 0; e < t.length; e++)
      ee.push(t[e]);
  ti();
}
function ln(t, e, s = _t + 1) {
  for (; s < st.length; s++) {
    const n = st[s];
    if (n && n.flags & 2) {
      if (t && n.id !== t.uid)
        continue;
      st.splice(s, 1), s--, n.flags & 4 && (n.flags &= -2), n(), n.flags & 4 || (n.flags &= -2);
    }
  }
}
function ei(t) {
  if (ee.length) {
    const e = [...new Set(ee)].sort(
      (s, n) => xe(s) - xe(n)
    );
    if (ee.length = 0, jt) {
      for (let s = 0; s < e.length; s++)
        jt.push(e[s]);
      return;
    }
    for (jt = e, Zt = 0; Zt < jt.length; Zt++) {
      const s = jt[Zt];
      s.flags & 4 && (s.flags &= -2), s.flags & 8 || s(), s.flags &= -2;
    }
    jt = null, Zt = 0;
  }
}
const xe = (t) => t.id == null ? t.flags & 2 ? -1 : 1 / 0 : t.id;
function si(t) {
  try {
    for (_t = 0; _t < st.length; _t++) {
      const e = st[_t];
      e && !(e.flags & 8) && (e.flags & 4 && (e.flags &= -2), Ee(
        e,
        e.i,
        e.i ? 15 : 14
      ), e.flags & 4 || (e.flags &= -2));
    }
  } finally {
    for (; _t < st.length; _t++) {
      const e = st[_t];
      e && (e.flags &= -2);
    }
    _t = -1, st.length = 0, ei(), Ue = null, (st.length || ee.length) && si();
  }
}
let Ct = null, ni = null;
function Ke(t) {
  const e = Ct;
  return Ct = t, ni = t && t.type.__scopeId || null, e;
}
function Or(t, e = Ct, s) {
  if (!e || t._n)
    return t;
  const n = (...i) => {
    n._d && mn(-1);
    const r = Ke(e), o = kt.length;
    let l;
    try {
      l = t(...i);
    } finally {
      for (let f = kt.length; f > o; f--) Ai();
      Ke(r), n._d && mn(1);
    }
    return l;
  };
  return n._n = !0, n._c = !0, n._d = !0, n;
}
function Ut(t, e, s, n) {
  const i = t.dirs, r = e && e.dirs;
  for (let o = 0; o < i.length; o++) {
    const l = i[o];
    r && (l.oldValue = r[o].value);
    let f = l.dir[n];
    f && (It(), at(f, s, 8, [
      t.el,
      l,
      t,
      e
    ]), Rt());
  }
}
function Ar(t, e) {
  if (nt) {
    let s = nt.provides;
    const n = nt.parent && nt.parent.provides;
    n === s && (s = nt.provides = Object.create(n)), s[t] = e;
  }
}
function Le(t, e, s = !1) {
  const n = Po();
  if (n || se) {
    let i = se ? se._context.provides : n ? n.parent == null || n.ce ? n.vnode.appContext && n.vnode.appContext.provides : n.parent.provides : void 0;
    if (i && t in i)
      return i[t];
    if (arguments.length > 1)
      return s && M(e) ? e.call(n && n.proxy) : e;
  }
}
const Pr = /* @__PURE__ */ Symbol.for("v-scx"), Mr = () => Le(Pr);
function us(t, e, s) {
  return ii(t, e, s);
}
function ii(t, e, s = K) {
  const { immediate: n, deep: i, flush: r, once: o } = s, l = Z({}, s), f = e && n || !e && r !== "post";
  let p;
  if (Se) {
    if (r === "sync") {
      const S = Mr();
      p = S.__watcherHandles || (S.__watcherHandles = []);
    } else if (!f) {
      const S = () => {
      };
      return S.stop = St, S.resume = St, S.pause = St, S;
    }
  }
  const a = nt;
  l.call = (S, j, P) => at(S, a, j, P);
  let h = !1;
  r === "post" ? l.scheduler = (S) => {
    rt(S, a && a.suspense);
  } : r !== "sync" && (h = !0, l.scheduler = (S, j) => {
    j ? S() : Vs(S);
  }), l.augmentJob = (S) => {
    e && (S.flags |= 4), h && (S.flags |= 2, a && (S.id = a.uid, S.i = a));
  };
  const C = Cr(t, e, l);
  return Se && (p ? p.push(C) : f && C()), C;
}
function Ir(t, e, s) {
  const n = this.proxy, i = J(t) ? t.includes(".") ? ri(n, t) : () => n[t] : t.bind(n, n);
  let r;
  M(e) ? r = e : (r = e.handler, s = e);
  const o = Oe(this), l = ii(i, r.bind(n), s);
  return o(), l;
}
function ri(t, e) {
  const s = e.split(".");
  return () => {
    let n = t;
    for (let i = 0; i < s.length && n; i++)
      n = n[s[i]];
    return n;
  };
}
const Rr = /* @__PURE__ */ Symbol("_vte"), Qe = (t) => t.__isTeleport, as = /* @__PURE__ */ Symbol("_leaveCb");
function Fr(t) {
  let e = t[0];
  if (t.length > 1) {
    for (const s of t)
      if (s.type !== Yt) {
        e = s;
        break;
      }
  }
  return e;
}
function oi(t) {
  if (!Ks(t))
    return Qe(t.type) && t.children ? Fr(t.children) : t;
  if (t.component)
    return t.component.subTree;
  const { shapeFlag: e, children: s } = t;
  if (s) {
    if (e & 16)
      return s[0];
    if (e & 32 && M(s.default))
      return s.default();
  }
}
function Us(t, e) {
  if (t.shapeFlag & 6 && t.component) {
    t.transition = e;
    const s = t.component.subTree;
    Us(
      Qe(s.type) && oi(s) || s,
      e
    );
  } else t.shapeFlag & 128 ? (t.ssContent.transition = e.clone(t.ssContent), t.ssFallback.transition = e.clone(t.ssFallback)) : t.transition = e;
}
// @__NO_SIDE_EFFECTS__
function Dr(t, e) {
  return M(t) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    Z({ name: t.name }, e, { setup: t })
  ) : t;
}
function li(t) {
  t.ids = [t.ids[0] + t.ids[2]++ + "-", 0, 0];
}
function cn(t, e) {
  let s;
  return !!((s = Object.getOwnPropertyDescriptor(t, e)) && !s.configurable);
}
const We = /* @__PURE__ */ new WeakMap();
function ge(t, e, s, n, i = !1) {
  if (I(t)) {
    t.forEach(
      (P, k) => ge(
        P,
        e && (I(e) ? e[k] : e),
        s,
        n,
        i
      )
    );
    return;
  }
  if (be(n) && !i) {
    n.shapeFlag & 512 && n.type.__asyncResolved && n.component.subTree.component && ge(t, e, s, n.component.subTree);
    return;
  }
  const r = n.shapeFlag & 4 ? Gs(n.component) : n.el, o = i ? null : r, { i: l, r: f } = t, p = e && e.r, a = l.refs === K ? l.refs = {} : l.refs, h = l.setupState, C = /* @__PURE__ */ N(h), S = h === K ? In : (P) => cn(a, P) ? !1 : D(C, P), j = (P, k) => !(k && cn(a, k));
  if (p != null && p !== f) {
    if (fn(e), J(p))
      a[p] = null, S(p) && (h[p] = null);
    else if (/* @__PURE__ */ it(p)) {
      const P = e;
      j(p, P.k) && (p.value = null), P.k && (a[P.k] = null);
    }
  }
  if (M(f))
    Ee(f, l, 12, [o, a]);
  else {
    const P = J(f), k = /* @__PURE__ */ it(f);
    if (P || k) {
      const B = () => {
        if (t.f) {
          const F = P ? S(f) ? h[f] : a[f] : j() || !t.k ? f.value : a[t.k];
          if (i)
            I(F) && As(F, r);
          else if (I(F))
            F.includes(r) || F.push(r);
          else if (P)
            a[f] = [r], S(f) && (h[f] = a[f]);
          else {
            const H = [r];
            j(f, t.k) && (f.value = H), t.k && (a[t.k] = H);
          }
        } else P ? (a[f] = o, S(f) && (h[f] = o)) : k && (j(f, t.k) && (f.value = o), t.k && (a[t.k] = o));
      };
      if (o) {
        const F = () => {
          B(), We.delete(t);
        };
        F.id = -1, We.set(t, F), rt(F, s);
      } else
        fn(t), B();
    }
  }
}
function fn(t) {
  const e = We.get(t);
  e && (e.flags |= 8, We.delete(t));
}
ze().requestIdleCallback;
ze().cancelIdleCallback;
const be = (t) => !!t.type.__asyncLoader, Ks = (t) => t.type.__isKeepAlive;
function jr(t, e) {
  ci(t, "a", e);
}
function Hr(t, e) {
  ci(t, "da", e);
}
function ci(t, e, s = nt) {
  const n = t.__wdc || (t.__wdc = () => {
    let i = s;
    for (; i; ) {
      if (i.isDeactivated)
        return;
      i = i.parent;
    }
    return t();
  });
  if (ts(e, n, s), s) {
    let i = s.parent;
    for (; i && i.parent; )
      Ks(i.parent.vnode) && Lr(n, e, s, i), i = i.parent;
  }
}
function Lr(t, e, s, n) {
  const i = ts(
    e,
    t,
    n,
    !0
    /* prepend */
  );
  fi(() => {
    As(n[e], i);
  }, s);
}
function ts(t, e, s = nt, n = !1) {
  if (s) {
    const i = s[t] || (s[t] = []), r = e.__weh || (e.__weh = (...o) => {
      It();
      const l = Oe(s), f = at(e, s, t, o);
      return l(), Rt(), f;
    });
    return n ? i.unshift(r) : i.push(r), r;
  }
}
const Ft = (t) => (e, s = nt) => {
  (!Se || t === "sp") && ts(t, (...n) => e(...n), s);
}, Nr = Ft("bm"), $r = Ft("m"), Vr = Ft(
  "bu"
), Ur = Ft("u"), Kr = Ft(
  "bum"
), fi = Ft("um"), Wr = Ft(
  "sp"
), Br = Ft("rtg"), qr = Ft("rtc");
function kr(t, e = nt) {
  ts("ec", t, e);
}
const Gr = /* @__PURE__ */ Symbol.for("v-ndc"), ws = (t) => t ? Ri(t) ? Gs(t) : ws(t.parent) : null, ve = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ Z(/* @__PURE__ */ Object.create(null), {
    $: (t) => t,
    $el: (t) => t.vnode.el,
    $data: (t) => t.data,
    $props: (t) => t.props,
    $attrs: (t) => t.attrs,
    $slots: (t) => t.slots,
    $refs: (t) => t.refs,
    $parent: (t) => ws(t.parent),
    $root: (t) => ws(t.root),
    $host: (t) => t.ce,
    $emit: (t) => t.emit,
    $options: (t) => ai(t),
    $forceUpdate: (t) => t.f || (t.f = () => {
      Vs(t.update);
    }),
    $nextTick: (t) => t.n || (t.n = Qn.bind(t.proxy)),
    $watch: (t) => Ir.bind(t)
  })
), ds = (t, e) => t !== K && !t.__isScriptSetup && D(t, e), Jr = {
  get({ _: t }, e) {
    if (e === "__v_skip")
      return !0;
    const { ctx: s, setupState: n, data: i, props: r, accessCache: o, type: l, appContext: f } = t;
    if (e[0] !== "$") {
      const C = o[e];
      if (C !== void 0)
        switch (C) {
          case 1:
            return n[e];
          case 2:
            return i[e];
          case 4:
            return s[e];
          case 3:
            return r[e];
        }
      else {
        if (ds(n, e))
          return o[e] = 1, n[e];
        if (i !== K && D(i, e))
          return o[e] = 2, i[e];
        if (D(r, e))
          return o[e] = 3, r[e];
        if (s !== K && D(s, e))
          return o[e] = 4, s[e];
        Cs && (o[e] = 0);
      }
    }
    const p = ve[e];
    let a, h;
    if (p)
      return e === "$attrs" && Q(t.attrs, "get", ""), p(t);
    if (
      // css module (injected by vue-loader)
      (a = l.__cssModules) && (a = a[e])
    )
      return a;
    if (s !== K && D(s, e))
      return o[e] = 4, s[e];
    if (
      // global properties
      h = f.config.globalProperties, D(h, e)
    )
      return h[e];
  },
  set({ _: t }, e, s) {
    const { data: n, setupState: i, ctx: r } = t;
    return ds(i, e) ? (i[e] = s, !0) : n !== K && D(n, e) ? (n[e] = s, !0) : D(t.props, e) || e[0] === "$" && e.slice(1) in t ? !1 : (r[e] = s, !0);
  },
  has({
    _: { data: t, setupState: e, accessCache: s, ctx: n, appContext: i, props: r, type: o }
  }, l) {
    let f;
    return !!(s[l] || t !== K && l[0] !== "$" && D(t, l) || ds(e, l) || D(r, l) || D(n, l) || D(ve, l) || D(i.config.globalProperties, l) || (f = o.__cssModules) && f[l]);
  },
  defineProperty(t, e, s) {
    return s.get != null ? t._.accessCache[e] = 0 : D(s, "value") && this.set(t, e, s.value, null), Reflect.defineProperty(t, e, s);
  }
};
function un(t) {
  return I(t) ? t.reduce(
    (e, s) => (e[s] = null, e),
    {}
  ) : t;
}
let Cs = !0;
function Yr(t) {
  const e = ai(t), s = t.proxy, n = t.ctx;
  Cs = !1, e.beforeCreate && an(e.beforeCreate, t, "bc");
  const {
    // state
    data: i,
    computed: r,
    methods: o,
    watch: l,
    provide: f,
    inject: p,
    // lifecycle
    created: a,
    beforeMount: h,
    mounted: C,
    beforeUpdate: S,
    updated: j,
    activated: P,
    deactivated: k,
    beforeDestroy: B,
    beforeUnmount: F,
    destroyed: H,
    unmounted: O,
    render: Y,
    renderTracked: dt,
    renderTriggered: pt,
    errorCaptured: Dt,
    serverPrefetch: Ae,
    // public API
    expose: Nt,
    inheritAttrs: ie,
    // assets
    components: Pe,
    directives: Me,
    filters: ns
  } = e;
  if (p && zr(p, n, null), o)
    for (const q in o) {
      const V = o[q];
      M(V) && (n[q] = V.bind(s));
    }
  if (i) {
    const q = i.call(s, s);
    W(q) && (t.data = /* @__PURE__ */ Ls(q));
  }
  if (Cs = !0, r)
    for (const q in r) {
      const V = r[q], $t = M(V) ? V.bind(s, s) : M(V.get) ? V.get.bind(s, s) : St, Ie = !M(V) && M(V.set) ? V.set.bind(s) : St, Vt = jo({
        get: $t,
        set: Ie
      });
      Object.defineProperty(n, q, {
        enumerable: !0,
        configurable: !0,
        get: () => Vt.value,
        set: (ht) => Vt.value = ht
      });
    }
  if (l)
    for (const q in l)
      ui(l[q], n, s, q);
  if (f) {
    const q = M(f) ? f.call(s) : f;
    Reflect.ownKeys(q).forEach((V) => {
      Ar(V, q[V]);
    });
  }
  a && an(a, t, "c");
  function tt(q, V) {
    I(V) ? V.forEach(($t) => q($t.bind(s))) : V && q(V.bind(s));
  }
  if (tt(Nr, h), tt($r, C), tt(Vr, S), tt(Ur, j), tt(jr, P), tt(Hr, k), tt(kr, Dt), tt(qr, dt), tt(Br, pt), tt(Kr, F), tt(fi, O), tt(Wr, Ae), I(Nt))
    if (Nt.length) {
      const q = t.exposed || (t.exposed = {});
      Nt.forEach((V) => {
        Object.defineProperty(q, V, {
          get: () => s[V],
          set: ($t) => s[V] = $t,
          enumerable: !0
        });
      });
    } else t.exposed || (t.exposed = {});
  Y && t.render === St && (t.render = Y), ie != null && (t.inheritAttrs = ie), Pe && (t.components = Pe), Me && (t.directives = Me), Ae && li(t);
}
function zr(t, e, s = St) {
  I(t) && (t = Ss(t));
  for (const n in t) {
    const i = t[n];
    let r;
    W(i) ? "default" in i ? r = Le(
      i.from || n,
      i.default,
      !0
    ) : r = Le(i.from || n) : r = Le(i), /* @__PURE__ */ it(r) ? Object.defineProperty(e, n, {
      enumerable: !0,
      configurable: !0,
      get: () => r.value,
      set: (o) => r.value = o
    }) : e[n] = r;
  }
}
function an(t, e, s) {
  at(
    I(t) ? t.map((n) => n.bind(e.proxy)) : t.bind(e.proxy),
    e,
    s
  );
}
function ui(t, e, s, n) {
  let i = n.includes(".") ? ri(s, n) : () => s[n];
  if (J(t)) {
    const r = e[t];
    M(r) && us(i, r);
  } else if (M(t))
    us(i, t.bind(s));
  else if (W(t))
    if (I(t))
      t.forEach((r) => ui(r, e, s, n));
    else {
      const r = M(t.handler) ? t.handler.bind(s) : e[t.handler];
      M(r) && us(i, r, t);
    }
}
function ai(t) {
  const e = t.type, { mixins: s, extends: n } = e, {
    mixins: i,
    optionsCache: r,
    config: { optionMergeStrategies: o }
  } = t.appContext, l = r.get(e);
  let f;
  return l ? f = l : !i.length && !s && !n ? f = e : (f = {}, i.length && i.forEach(
    (p) => Be(f, p, o, !0)
  ), Be(f, e, o)), W(e) && r.set(e, f), f;
}
function Be(t, e, s, n = !1) {
  const { mixins: i, extends: r } = e;
  r && Be(t, r, s, !0), i && i.forEach(
    (o) => Be(t, o, s, !0)
  );
  for (const o in e)
    if (!(n && o === "expose")) {
      const l = Xr[o] || s && s[o];
      t[o] = l ? l(t[o], e[o]) : e[o];
    }
  return t;
}
const Xr = {
  data: dn,
  props: pn,
  emits: pn,
  // objects
  methods: ue,
  computed: ue,
  // lifecycle
  beforeCreate: et,
  created: et,
  beforeMount: et,
  mounted: et,
  beforeUpdate: et,
  updated: et,
  beforeDestroy: et,
  beforeUnmount: et,
  destroyed: et,
  unmounted: et,
  activated: et,
  deactivated: et,
  errorCaptured: et,
  serverPrefetch: et,
  // assets
  components: ue,
  directives: ue,
  // watch
  watch: Qr,
  // provide / inject
  provide: dn,
  inject: Zr
};
function dn(t, e) {
  return e ? t ? function() {
    return Z(
      M(t) ? t.call(this, this) : t,
      M(e) ? e.call(this, this) : e
    );
  } : e : t;
}
function Zr(t, e) {
  return ue(Ss(t), Ss(e));
}
function Ss(t) {
  if (I(t)) {
    const e = {};
    for (let s = 0; s < t.length; s++)
      e[t[s]] = t[s];
    return e;
  }
  return t;
}
function et(t, e) {
  return t ? [...new Set([].concat(t, e))] : e;
}
function ue(t, e) {
  return t ? Z(/* @__PURE__ */ Object.create(null), t, e) : e;
}
function pn(t, e) {
  return t ? I(t) && I(e) ? [.../* @__PURE__ */ new Set([...t, ...e])] : Z(
    /* @__PURE__ */ Object.create(null),
    un(t),
    un(e ?? {})
  ) : e;
}
function Qr(t, e) {
  if (!t) return e;
  if (!e) return t;
  const s = Z(/* @__PURE__ */ Object.create(null), t);
  for (const n in e)
    s[n] = et(t[n], e[n]);
  return s;
}
function di() {
  return {
    app: null,
    config: {
      isNativeTag: In,
      performance: !1,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: void 0,
      warnHandler: void 0,
      compilerOptions: {}
    },
    mixins: [],
    components: {},
    directives: {},
    provides: /* @__PURE__ */ Object.create(null),
    optionsCache: /* @__PURE__ */ new WeakMap(),
    propsCache: /* @__PURE__ */ new WeakMap(),
    emitsCache: /* @__PURE__ */ new WeakMap()
  };
}
let to = 0;
function eo(t, e) {
  return function(n, i = null) {
    M(n) || (n = Z({}, n)), i != null && !W(i) && (i = null);
    const r = di(), o = /* @__PURE__ */ new WeakSet(), l = [];
    let f = !1;
    const p = r.app = {
      _uid: to++,
      _component: n,
      _props: i,
      _container: null,
      _context: r,
      _instance: null,
      version: Ho,
      get config() {
        return r.config;
      },
      set config(a) {
      },
      use(a, ...h) {
        return o.has(a) || (a && M(a.install) ? (o.add(a), a.install(p, ...h)) : M(a) && (o.add(a), a(p, ...h))), p;
      },
      mixin(a) {
        return r.mixins.includes(a) || r.mixins.push(a), p;
      },
      component(a, h) {
        return h ? (r.components[a] = h, p) : r.components[a];
      },
      directive(a, h) {
        return h ? (r.directives[a] = h, p) : r.directives[a];
      },
      mount(a, h, C) {
        if (!f) {
          const S = p._ceVNode || ut(n, i);
          return S.appContext = r, C === !0 ? C = "svg" : C === !1 && (C = void 0), t(S, a, C), f = !0, p._container = a, a.__vue_app__ = p, Gs(S.component);
        }
      },
      onUnmount(a) {
        l.push(a);
      },
      unmount() {
        f && (at(
          l,
          p._instance,
          16
        ), t(null, p._container), delete p._container.__vue_app__);
      },
      provide(a, h) {
        return r.provides[a] = h, p;
      },
      runWithContext(a) {
        const h = se;
        se = p;
        try {
          return a();
        } finally {
          se = h;
        }
      }
    };
    return p;
  };
}
let se = null;
const so = (t, e) => e === "modelValue" || e === "model-value" ? t.modelModifiers : t[`${e}Modifiers`] || t[`${ct(e)}Modifiers`] || t[`${zt(e)}Modifiers`];
function no(t, e, ...s) {
  if (t.isUnmounted) return;
  const n = t.vnode.props || K;
  let i = s;
  const r = e.startsWith("update:"), o = r && so(n, e.slice(7));
  o && (o.trim && (i = s.map((a) => J(a) ? a.trim() : a)), o.number && (i = i.map(Wi)));
  let l, f = n[l = rs(e)] || // also try camelCase event handler (#2249)
  n[l = rs(ct(e))];
  !f && r && (f = n[l = rs(zt(e))]), f && at(
    f,
    t,
    6,
    i
  );
  const p = n[l + "Once"];
  if (p) {
    if (!t.emitted)
      t.emitted = {};
    else if (t.emitted[l])
      return;
    t.emitted[l] = !0, at(
      p,
      t,
      6,
      i
    );
  }
}
const io = /* @__PURE__ */ new WeakMap();
function pi(t, e, s = !1) {
  const n = s ? io : e.emitsCache, i = n.get(t);
  if (i !== void 0)
    return i;
  const r = t.emits;
  let o = {}, l = !1;
  if (!M(t)) {
    const f = (p) => {
      const a = pi(p, e, !0);
      a && (l = !0, Z(o, a));
    };
    !s && e.mixins.length && e.mixins.forEach(f), t.extends && f(t.extends), t.mixins && t.mixins.forEach(f);
  }
  return !r && !l ? (W(t) && n.set(t, null), null) : (I(r) ? r.forEach((f) => o[f] = null) : Z(o, r), W(t) && n.set(t, o), o);
}
function es(t, e) {
  return !t || !Ge(e) ? !1 : (e = e.slice(2), e = e === "Once" ? e : e.replace(/Once$/, ""), D(t, e[0].toLowerCase() + e.slice(1)) || D(t, zt(e)) || D(t, e));
}
function hn(t) {
  const {
    type: e,
    vnode: s,
    proxy: n,
    withProxy: i,
    propsOptions: [r],
    slots: o,
    attrs: l,
    emit: f,
    render: p,
    renderCache: a,
    props: h,
    data: C,
    setupState: S,
    ctx: j,
    inheritAttrs: P
  } = t, k = Ke(t);
  let B, F;
  try {
    if (s.shapeFlag & 4) {
      const O = i || n, Y = O;
      B = wt(
        p.call(
          Y,
          O,
          a,
          h,
          S,
          C,
          j
        )
      ), F = l;
    } else {
      const O = e;
      B = wt(
        O.length > 1 ? O(
          h,
          { attrs: l, slots: o, emit: f }
        ) : O(
          h,
          null
        )
      ), F = e.props ? l : ro(l);
    }
  } catch (O) {
    kt.length = 0, Ze(O, t, 1), B = ut(Yt);
  }
  let H = B;
  if (F && P !== !1) {
    const O = Object.keys(F), { shapeFlag: Y } = H;
    O.length && Y & 7 && (r && O.some(Je) && (F = oo(
      F,
      r
    )), H = ne(H, F, !1, !0));
  }
  if (s.dirs && (H = ne(H, null, !1, !0), H.dirs = H.dirs ? H.dirs.concat(s.dirs) : s.dirs), s.transition) {
    const O = Qe(H.type) && oi(H) || H;
    Us(O, s.transition);
  }
  return B = H, Ke(k), B;
}
const ro = (t) => {
  let e;
  for (const s in t)
    (s === "class" || s === "style" || Ge(s)) && ((e || (e = {}))[s] = t[s]);
  return e;
}, oo = (t, e) => {
  const s = {};
  for (const n in t)
    (!Je(n) || !(n.slice(9) in e)) && (s[n] = t[n]);
  return s;
};
function lo(t, e, s) {
  const { props: n, children: i, component: r } = t, { props: o, children: l, patchFlag: f } = e, p = r.emitsOptions;
  if (e.dirs || e.transition)
    return !0;
  if (s && f >= 0) {
    if (f & 1024)
      return !0;
    if (f & 16)
      return n ? gn(n, o, p) : !!o;
    if (f & 8) {
      const a = e.dynamicProps;
      for (let h = 0; h < a.length; h++) {
        const C = a[h];
        if (hi(o, n, C) && !es(p, C))
          return !0;
      }
    }
  } else
    return (i || l) && (!l || !l.$stable) ? !0 : n === o ? !1 : n ? o ? gn(n, o, p) : !0 : !!o;
  return !1;
}
function gn(t, e, s) {
  const n = Object.keys(e);
  if (n.length !== Object.keys(t).length)
    return !0;
  for (let i = 0; i < n.length; i++) {
    const r = n[i];
    if (hi(e, t, r) && !es(s, r))
      return !0;
  }
  return !1;
}
function hi(t, e, s) {
  const n = t[s], i = e[s];
  return s === "style" && W(n) && W(i) ? !Xe(n, i) : n !== i;
}
function co({ vnode: t, parent: e, suspense: s }, n) {
  for (; e; ) {
    const i = e.subTree;
    if (i.suspense && i.suspense.activeBranch === t && (i.suspense.vnode.el = i.el = n, t = i), i === t)
      (t = e.vnode).el = n, e = e.parent;
    else
      break;
  }
  s && s.activeBranch === t && (s.vnode.el = n);
}
const gi = {}, bi = () => Object.create(gi), vi = (t) => Object.getPrototypeOf(t) === gi;
function fo(t, e, s, n = !1) {
  const i = {}, r = bi();
  t.propsDefaults = /* @__PURE__ */ Object.create(null), mi(t, e, i, r);
  for (const o in t.propsOptions[0])
    o in i || (i[o] = void 0);
  s ? t.props = n ? i : /* @__PURE__ */ br(i) : t.type.props ? t.props = i : t.props = r, t.attrs = r;
}
function uo(t, e, s, n) {
  const {
    props: i,
    attrs: r,
    vnode: { patchFlag: o }
  } = t, l = /* @__PURE__ */ N(i), [f] = t.propsOptions;
  let p = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    (n || o > 0) && !(o & 16)
  ) {
    if (o & 8) {
      const a = t.vnode.dynamicProps;
      for (let h = 0; h < a.length; h++) {
        let C = a[h];
        if (es(t.emitsOptions, C))
          continue;
        const S = e[C];
        if (f)
          if (D(r, C))
            S !== r[C] && (r[C] = S, p = !0);
          else {
            const j = ct(C);
            i[j] = Ts(
              f,
              l,
              j,
              S,
              t,
              !1
            );
          }
        else
          S !== r[C] && (r[C] = S, p = !0);
      }
    }
  } else {
    mi(t, e, i, r) && (p = !0);
    let a;
    for (const h in l)
      (!e || // for camelCase
      !D(e, h) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((a = zt(h)) === h || !D(e, a))) && (f ? s && // for camelCase
      (s[h] !== void 0 || // for kebab-case
      s[a] !== void 0) && (i[h] = Ts(
        f,
        l,
        h,
        void 0,
        t,
        !0
      )) : delete i[h]);
    if (r !== l)
      for (const h in r)
        (!e || !D(e, h)) && (delete r[h], p = !0);
  }
  p && Mt(t.attrs, "set", "");
}
function mi(t, e, s, n) {
  const [i, r] = t.propsOptions;
  let o = !1, l;
  if (e)
    for (let f in e) {
      if (de(f))
        continue;
      const p = e[f];
      let a;
      i && D(i, a = ct(f)) ? !r || !r.includes(a) ? s[a] = p : (l || (l = {}))[a] = p : es(t.emitsOptions, f) || (!(f in n) || p !== n[f]) && (n[f] = p, o = !0);
    }
  if (r) {
    const f = /* @__PURE__ */ N(s), p = l || K;
    for (let a = 0; a < r.length; a++) {
      const h = r[a];
      s[h] = Ts(
        i,
        f,
        h,
        p[h],
        t,
        !D(p, h)
      );
    }
  }
  return o;
}
function Ts(t, e, s, n, i, r) {
  const o = t[s];
  if (o != null) {
    const l = D(o, "default");
    if (l && n === void 0) {
      const f = o.default;
      if (o.type !== Function && !o.skipFactory && M(f)) {
        const { propsDefaults: p } = i;
        if (s in p)
          n = p[s];
        else {
          const a = Oe(i);
          n = p[s] = f.call(
            null,
            e
          ), a();
        }
      } else
        n = f;
      i.ce && i.ce._setProp(s, n);
    }
    o[
      0
      /* shouldCast */
    ] && (r && !l ? n = !1 : o[
      1
      /* shouldCastTrue */
    ] && (n === "" || n === zt(s)) && (n = !0));
  }
  return n;
}
const ao = /* @__PURE__ */ new WeakMap();
function _i(t, e, s = !1) {
  const n = s ? ao : e.propsCache, i = n.get(t);
  if (i)
    return i;
  const r = t.props, o = {}, l = [];
  let f = !1;
  if (!M(t)) {
    const a = (h) => {
      f = !0;
      const [C, S] = _i(h, e, !0);
      Z(o, C), S && l.push(...S);
    };
    !s && e.mixins.length && e.mixins.forEach(a), t.extends && a(t.extends), t.mixins && t.mixins.forEach(a);
  }
  if (!r && !f)
    return W(t) && n.set(t, Qt), Qt;
  if (I(r))
    for (let a = 0; a < r.length; a++) {
      const h = ct(r[a]);
      bn(h) && (o[h] = K);
    }
  else if (r)
    for (const a in r) {
      const h = ct(a);
      if (bn(h)) {
        const C = r[a], S = o[h] = I(C) || M(C) ? { type: C } : Z({}, C), j = S.type;
        let P = !1, k = !0;
        if (I(j))
          for (let B = 0; B < j.length; ++B) {
            const F = j[B], H = M(F) && F.name;
            if (H === "Boolean") {
              P = !0;
              break;
            } else H === "String" && (k = !1);
          }
        else
          P = M(j) && j.name === "Boolean";
        S[
          0
          /* shouldCast */
        ] = P, S[
          1
          /* shouldCastTrue */
        ] = k, (P || D(S, "default")) && l.push(h);
      }
    }
  const p = [o, l];
  return W(t) && n.set(t, p), p;
}
function bn(t) {
  return t[0] !== "$" && !de(t);
}
const Ws = (t) => t === "_" || t === "_ctx" || t === "$stable", Bs = (t) => I(t) ? t.map(wt) : [wt(t)], po = (t, e, s) => {
  if (e._n)
    return e;
  const n = Or((...i) => Bs(e(...i)), s);
  return n._c = !1, n;
}, yi = (t, e, s) => {
  const n = t._ctx;
  for (const i in t) {
    if (Ws(i)) continue;
    const r = t[i];
    if (M(r))
      e[i] = po(i, r, n);
    else if (r != null) {
      const o = Bs(r);
      e[i] = () => o;
    }
  }
}, xi = (t, e) => {
  const s = Bs(e);
  t.slots.default = () => s;
}, wi = (t, e, s) => {
  for (const n in e)
    (s || !Ws(n)) && (t[n] = e[n]);
}, ho = (t, e, s) => {
  const n = t.slots = bi();
  if (t.vnode.shapeFlag & 32) {
    const i = e._;
    i ? (wi(n, e, s), s && Dn(n, "_", i, !0)) : yi(e, n);
  } else e && xi(t, e);
}, go = (t, e, s) => {
  const { vnode: n, slots: i } = t;
  let r = !0, o = K;
  if (n.shapeFlag & 32) {
    const l = e._;
    l ? s && l === 1 ? r = !1 : wi(i, e, s) : (r = !e.$stable, yi(e, i)), o = e;
  } else e && (xi(t, e), o = { default: 1 });
  if (r)
    for (const l in i)
      !Ws(l) && o[l] == null && delete i[l];
}, rt = yo;
function bo(t) {
  return vo(t);
}
function vo(t, e) {
  const s = ze();
  s.__VUE__ = !0;
  const {
    insert: n,
    remove: i,
    patchProp: r,
    createElement: o,
    createText: l,
    createComment: f,
    setText: p,
    setElementText: a,
    parentNode: h,
    nextSibling: C,
    setScopeId: S = St,
    insertStaticContent: j
  } = t, P = (c, u, d, m = null, v = null, g = null, x = void 0, y = null, _ = !!u.dynamicChildren) => {
    if (c === u)
      return;
    c && !fe(c, u) && (m = Re(c), ht(c, v, g, !0), c = null), u.patchFlag === -2 && (_ = !1, u.dynamicChildren = null);
    const { type: b, ref: E, shapeFlag: w } = u;
    switch (b) {
      case ss:
        k(c, u, d, m);
        break;
      case Yt:
        B(c, u, d, m);
        break;
      case Ne:
        c == null && F(u, d, m, x);
        break;
      case xt:
        Pe(
          c,
          u,
          d,
          m,
          v,
          g,
          x,
          y,
          _
        );
        break;
      default:
        w & 1 ? Y(
          c,
          u,
          d,
          m,
          v,
          g,
          x,
          y,
          _
        ) : w & 6 ? Me(
          c,
          u,
          d,
          m,
          v,
          g,
          x,
          y,
          _
        ) : (w & 64 || w & 128) && b.process(
          c,
          u,
          d,
          m,
          v,
          g,
          x,
          y,
          _,
          oe
        );
    }
    E != null && v ? ge(E, c && c.ref, g, u || c, !u) : E == null && c && c.ref != null && ge(c.ref, null, g, c, !0);
  }, k = (c, u, d, m) => {
    if (c == null)
      n(
        u.el = l(u.children),
        d,
        m
      );
    else {
      const v = u.el = c.el;
      u.children !== c.children && p(v, u.children);
    }
  }, B = (c, u, d, m) => {
    c == null ? n(
      u.el = f(u.children || ""),
      d,
      m
    ) : u.el = c.el;
  }, F = (c, u, d, m) => {
    [c.el, c.anchor] = j(
      c.children,
      u,
      d,
      m,
      c.el,
      c.anchor
    );
  }, H = ({ el: c, anchor: u }, d, m) => {
    let v;
    for (; c && c !== u; )
      v = C(c), n(c, d, m), c = v;
    n(u, d, m);
  }, O = ({ el: c, anchor: u }) => {
    let d;
    for (; c && c !== u; )
      d = C(c), i(c), c = d;
    i(u);
  }, Y = (c, u, d, m, v, g, x, y, _) => {
    if (u.type === "svg" ? x = "svg" : u.type === "math" && (x = "mathml"), c == null)
      dt(
        u,
        d,
        m,
        v,
        g,
        x,
        y,
        _
      );
    else {
      const b = c.el && c.el._isVueCE ? c.el : null;
      try {
        b && b._beginPatch(), Ae(
          c,
          u,
          v,
          g,
          x,
          y,
          _
        );
      } finally {
        b && b._endPatch();
      }
    }
  }, dt = (c, u, d, m, v, g, x, y) => {
    let _, b;
    const { props: E, shapeFlag: w, transition: T, dirs: A } = c;
    if (_ = c.el = o(
      c.type,
      g,
      E && E.is,
      E
    ), w & 8 ? a(_, c.children) : w & 16 && Dt(
      c.children,
      _,
      null,
      m,
      v,
      ps(c, g),
      x,
      y
    ), A && Ut(c, null, m, "created"), pt(_, c, c.scopeId, x, m), E) {
      for (const $ in E)
        $ !== "value" && !de($) && r(_, $, null, E[$], g, m);
      "value" in E && r(_, "value", null, E.value, g), (b = E.onVnodeBeforeMount) && mt(b, m, c);
    }
    A && Ut(c, null, m, "beforeMount");
    const R = mo(v, T);
    R && T.beforeEnter(_), n(_, u, d), ((b = E && E.onVnodeMounted) || R || A) && rt(() => {
      b && mt(b, m, c), R && T.enter(_), A && Ut(c, null, m, "mounted");
    }, v);
  }, pt = (c, u, d, m, v) => {
    if (d && S(c, d), m)
      for (let g = 0; g < m.length; g++)
        S(c, m[g]);
    if (v) {
      let g = v.subTree;
      if (u === g || Ei(g.type) && (g.ssContent === u || g.ssFallback === u)) {
        const x = v.vnode;
        pt(
          c,
          x,
          x.scopeId,
          x.slotScopeIds,
          v.parent
        );
      }
    }
  }, Dt = (c, u, d, m, v, g, x, y, _ = 0) => {
    for (let b = _; b < c.length; b++) {
      const E = c[b] = y ? At(c[b]) : wt(c[b]);
      P(
        null,
        E,
        u,
        d,
        m,
        v,
        g,
        x,
        y
      );
    }
  }, Ae = (c, u, d, m, v, g, x) => {
    const y = u.el = c.el;
    let { patchFlag: _, dynamicChildren: b, dirs: E } = u;
    _ |= c.patchFlag & 16;
    const w = c.props || K, T = u.props || K;
    let A;
    if (d && Kt(d, !1), (A = T.onVnodeBeforeUpdate) && mt(A, d, u, c), E && Ut(u, c, d, "beforeUpdate"), d && Kt(d, !0), // #6385 the old vnode may be a user-wrapped non-isomorphic block
    // Force full diff when block metadata is unstable.
    b && (!c.dynamicChildren || c.dynamicChildren.length !== b.length) && (_ = 0, x = !1, b = null), (w.innerHTML && T.innerHTML == null || w.textContent && T.textContent == null) && a(y, ""), b ? Nt(
      c.dynamicChildren,
      b,
      y,
      d,
      m,
      ps(u, v),
      g
    ) : x || V(
      c,
      u,
      y,
      null,
      d,
      m,
      ps(u, v),
      g,
      !1
    ), _ > 0) {
      if (_ & 16)
        ie(y, w, T, d, v);
      else if (_ & 2 && w.class !== T.class && r(y, "class", null, T.class, v), _ & 4 && r(y, "style", w.style, T.style, v), _ & 8) {
        const R = u.dynamicProps;
        for (let $ = 0; $ < R.length; $++) {
          const L = R[$], G = w[L], z = T[L];
          (z !== G || L === "value") && r(y, L, G, z, v, d);
        }
      }
      _ & 1 && c.children !== u.children && a(y, u.children);
    } else !x && b == null && ie(y, w, T, d, v);
    ((A = T.onVnodeUpdated) || E) && rt(() => {
      A && mt(A, d, u, c), E && Ut(u, c, d, "updated");
    }, m);
  }, Nt = (c, u, d, m, v, g, x) => {
    for (let y = 0; y < u.length; y++) {
      const _ = c[y], b = u[y], E = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        _.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (_.type === xt || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !fe(_, b) || // - In the case of a component, it could contain anything.
        _.shapeFlag & 198) ? h(_.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          d
        )
      );
      P(
        _,
        b,
        E,
        null,
        m,
        v,
        g,
        x,
        !0
      );
    }
  }, ie = (c, u, d, m, v) => {
    if (u !== d) {
      if (u !== K)
        for (const g in u)
          !de(g) && !(g in d) && r(
            c,
            g,
            u[g],
            null,
            v,
            m
          );
      for (const g in d) {
        if (de(g)) continue;
        const x = d[g], y = u[g];
        x !== y && g !== "value" && r(c, g, y, x, v, m);
      }
      "value" in d && r(c, "value", u.value, d.value, v);
    }
  }, Pe = (c, u, d, m, v, g, x, y, _) => {
    const b = u.el = c ? c.el : l(""), E = u.anchor = c ? c.anchor : l("");
    let { patchFlag: w, dynamicChildren: T, slotScopeIds: A } = u;
    A && (y = y ? y.concat(A) : A), c == null ? (n(b, d, m), n(E, d, m), Dt(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      u.children || [],
      d,
      E,
      v,
      g,
      x,
      y,
      _
    )) : w > 0 && w & 64 && T && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    c.dynamicChildren && c.dynamicChildren.length === T.length ? (Nt(
      c.dynamicChildren,
      T,
      d,
      v,
      g,
      x,
      y
    ), // #2080 if the stable fragment has a key, it's a <template v-for> that may
    //  get moved around. Make sure all root level vnodes inherit el.
    // #2134 or if it's a component root, it may also get moved around
    // as the component is being moved.
    (u.key != null || v && u === v.subTree) && Ci(
      c,
      u,
      !0
      /* shallow */
    )) : V(
      c,
      u,
      d,
      E,
      v,
      g,
      x,
      y,
      _
    );
  }, Me = (c, u, d, m, v, g, x, y, _) => {
    u.slotScopeIds = y, c == null ? u.shapeFlag & 512 ? v.ctx.activate(
      u,
      d,
      m,
      x,
      _
    ) : ns(
      u,
      d,
      m,
      v,
      g,
      x,
      _
    ) : Ys(c, u, _);
  }, ns = (c, u, d, m, v, g, x) => {
    const y = c.component = Ao(
      c,
      m,
      v
    );
    if (Ks(c) && (y.ctx.renderer = oe), Mo(y, !1, x), y.asyncDep) {
      if (v && v.registerDep(y, tt, x), !c.el) {
        const _ = y.subTree = ut(Yt);
        B(null, _, u, d), c.placeholder = _.el;
      }
    } else
      tt(
        y,
        c,
        u,
        d,
        v,
        g,
        x
      );
  }, Ys = (c, u, d) => {
    const m = u.component = c.component;
    if (lo(c, u, d))
      if (m.asyncDep && !m.asyncResolved) {
        q(m, u, d);
        return;
      } else
        m.next = u, m.update();
    else
      u.el = c.el, m.vnode = u;
  }, tt = (c, u, d, m, v, g, x) => {
    const y = () => {
      if (c.isMounted) {
        let { next: w, bu: T, u: A, parent: R, vnode: $ } = c;
        {
          const bt = Si(c);
          if (bt) {
            w && (w.el = $.el, q(c, w, x)), bt.asyncDep.then(() => {
              rt(() => {
                c.isUnmounted || b();
              }, v);
            });
            return;
          }
        }
        let L = w, G;
        Kt(c, !1), w ? (w.el = $.el, q(c, w, x)) : w = $, T && os(T), (G = w.props && w.props.onVnodeBeforeUpdate) && mt(G, R, w, $), Kt(c, !0);
        const z = hn(c), gt = c.subTree;
        c.subTree = z, P(
          gt,
          z,
          // parent may have changed if it's in a teleport
          h(gt.el),
          // anchor may have changed if it's in a fragment
          Re(gt),
          c,
          v,
          g
        ), w.el = z.el, L === null && co(c, z.el), A && rt(A, v), (G = w.props && w.props.onVnodeUpdated) && rt(
          () => mt(G, R, w, $),
          v
        );
      } else {
        let w;
        const { el: T, props: A } = u, { bm: R, m: $, parent: L, root: G, type: z } = c, gt = be(u);
        Kt(c, !1), R && os(R), !gt && (w = A && A.onVnodeBeforeMount) && mt(w, L, u), Kt(c, !0);
        {
          G.ce && G.ce._hasShadowRoot() && G.ce._injectChildStyle(
            z,
            c.parent ? c.parent.type : void 0
          );
          const bt = c.subTree = hn(c);
          P(
            null,
            bt,
            d,
            m,
            c,
            v,
            g
          ), u.el = bt.el;
        }
        if ($ && rt($, v), !gt && (w = A && A.onVnodeMounted)) {
          const bt = u;
          rt(
            () => mt(w, L, bt),
            v
          );
        }
        (u.shapeFlag & 256 || L && be(L.vnode) && L.vnode.shapeFlag & 256) && c.a && rt(c.a, v), c.isMounted = !0, u = d = m = null;
      }
    };
    c.scope.on();
    const _ = c.effect = new Hn(y);
    c.scope.off();
    const b = c.update = _.run.bind(_), E = c.job = _.runIfDirty.bind(_);
    E.i = c, E.id = c.uid, _.scheduler = () => Vs(E), Kt(c, !0), b();
  }, q = (c, u, d) => {
    u.component = c;
    const m = c.vnode.props;
    c.vnode = u, c.next = null, uo(c, u.props, m, d), go(c, u.children, d), It(), ln(c), Rt();
  }, V = (c, u, d, m, v, g, x, y, _ = !1) => {
    const b = c && c.children, E = c ? c.shapeFlag : 0, w = u.children, { patchFlag: T, shapeFlag: A } = u;
    if (T > 0) {
      if (T & 128) {
        Ie(
          b,
          w,
          d,
          m,
          v,
          g,
          x,
          y,
          _
        );
        return;
      } else if (T & 256) {
        $t(
          b,
          w,
          d,
          m,
          v,
          g,
          x,
          y,
          _
        );
        return;
      }
    }
    A & 8 ? (E & 16 && re(b, v, g), w !== b && a(d, w)) : E & 16 ? A & 16 ? Ie(
      b,
      w,
      d,
      m,
      v,
      g,
      x,
      y,
      _
    ) : re(b, v, g, !0) : (E & 8 && a(d, ""), A & 16 && Dt(
      w,
      d,
      m,
      v,
      g,
      x,
      y,
      _
    ));
  }, $t = (c, u, d, m, v, g, x, y, _) => {
    c = c || Qt, u = u || Qt;
    const b = c.length, E = u.length, w = Math.min(b, E);
    let T;
    for (T = 0; T < w; T++) {
      const A = u[T] = _ ? At(u[T]) : wt(u[T]);
      P(
        c[T],
        A,
        d,
        null,
        v,
        g,
        x,
        y,
        _
      );
    }
    b > E ? re(
      c,
      v,
      g,
      !0,
      !1,
      w
    ) : Dt(
      u,
      d,
      m,
      v,
      g,
      x,
      y,
      _,
      w
    );
  }, Ie = (c, u, d, m, v, g, x, y, _) => {
    let b = 0;
    const E = u.length;
    let w = c.length - 1, T = E - 1;
    for (; b <= w && b <= T; ) {
      const A = c[b], R = u[b] = _ ? At(u[b]) : wt(u[b]);
      if (fe(A, R))
        P(
          A,
          R,
          d,
          null,
          v,
          g,
          x,
          y,
          _
        );
      else
        break;
      b++;
    }
    for (; b <= w && b <= T; ) {
      const A = c[w], R = u[T] = _ ? At(u[T]) : wt(u[T]);
      if (fe(A, R))
        P(
          A,
          R,
          d,
          null,
          v,
          g,
          x,
          y,
          _
        );
      else
        break;
      w--, T--;
    }
    if (b > w) {
      if (b <= T) {
        const A = T + 1, R = A < E ? u[A].el : m;
        for (; b <= T; )
          P(
            null,
            u[b] = _ ? At(u[b]) : wt(u[b]),
            d,
            R,
            v,
            g,
            x,
            y,
            _
          ), b++;
      }
    } else if (b > T)
      for (; b <= w; )
        ht(c[b], v, g, !0), b++;
    else {
      const A = b, R = b, $ = /* @__PURE__ */ new Map();
      for (b = R; b <= T; b++) {
        const ot = u[b] = _ ? At(u[b]) : wt(u[b]);
        ot.key != null && $.set(ot.key, b);
      }
      let L, G = 0;
      const z = T - R + 1;
      let gt = !1, bt = 0;
      const le = new Array(z);
      for (b = 0; b < z; b++) le[b] = 0;
      for (b = A; b <= w; b++) {
        const ot = c[b];
        if (G >= z) {
          ht(ot, v, g, !0);
          continue;
        }
        let vt;
        if (ot.key != null)
          vt = $.get(ot.key);
        else
          for (L = R; L <= T; L++)
            if (le[L - R] === 0 && fe(ot, u[L])) {
              vt = L;
              break;
            }
        vt === void 0 ? ht(ot, v, g, !0) : (le[vt - R] = b + 1, vt >= bt ? bt = vt : gt = !0, P(
          ot,
          u[vt],
          d,
          null,
          v,
          g,
          x,
          y,
          _
        ), G++);
      }
      const Zs = gt ? _o(le) : Qt;
      for (L = Zs.length - 1, b = z - 1; b >= 0; b--) {
        const ot = R + b, vt = u[ot], Qs = u[ot + 1], tn = ot + 1 < E ? (
          // #13559, #14173 fallback to el placeholder for unresolved async component
          Qs.el || Ti(Qs)
        ) : m;
        le[b] === 0 ? P(
          null,
          vt,
          d,
          tn,
          v,
          g,
          x,
          y,
          _
        ) : gt && (L < 0 || b !== Zs[L] ? Vt(vt, d, tn, 2) : L--);
      }
    }
  }, Vt = (c, u, d, m, v = null) => {
    const { el: g, type: x, transition: y, children: _, shapeFlag: b } = c;
    if (b & 6) {
      Vt(c.component.subTree, u, d, m);
      return;
    }
    if (b & 128) {
      c.suspense.move(u, d, m);
      return;
    }
    if (b & 64) {
      x.move(c, u, d, oe);
      return;
    }
    if (x === xt) {
      n(g, u, d);
      for (let w = 0; w < _.length; w++)
        Vt(_[w], u, d, m);
      n(c.anchor, u, d);
      return;
    }
    if (x === Ne) {
      H(c, u, d);
      return;
    }
    if (m !== 2 && b & 1 && y)
      if (m === 0)
        y.persisted && !g[as] ? n(g, u, d) : (y.beforeEnter(g), n(g, u, d), rt(() => y.enter(g), v));
      else {
        const { leave: w, delayLeave: T, afterLeave: A } = y, R = () => {
          c.ctx.isUnmounted ? i(g) : n(g, u, d);
        }, $ = () => {
          const L = g._isLeaving || !!g[as];
          g._isLeaving && g[as](
            !0
            /* cancelled */
          ), y.persisted && !L ? R() : w(g, () => {
            R(), A && A();
          });
        };
        T ? T(g, R, $) : $();
      }
    else
      n(g, u, d);
  }, ht = (c, u, d, m = !1, v = !1) => {
    const {
      type: g,
      props: x,
      ref: y,
      children: _,
      dynamicChildren: b,
      shapeFlag: E,
      patchFlag: w,
      dirs: T,
      cacheIndex: A,
      memo: R
    } = c;
    if (w === -2 && (v = !1), y != null && (It(), ge(y, null, d, c, !0), Rt()), A != null && (u.renderCache[A] = void 0), E & 256) {
      u.ctx.deactivate(c);
      return;
    }
    const $ = E & 1 && T, L = !be(c);
    let G;
    if (L && (G = x && x.onVnodeBeforeUnmount) && mt(G, u, c), E & 6)
      Hi(c.component, d, m);
    else {
      if (E & 128) {
        c.suspense.unmount(d, m);
        return;
      }
      $ && Ut(c, null, u, "beforeUnmount"), E & 64 ? c.type.remove(
        c,
        u,
        d,
        oe,
        m
      ) : b && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !b.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (g !== xt || w > 0 && w & 64) ? re(
        b,
        u,
        d,
        !1,
        !0
      ) : (g === xt && w & 384 || !v && E & 16) && re(_, u, d), m && zs(c);
    }
    const z = R != null && A == null;
    (L && (G = x && x.onVnodeUnmounted) || $ || z) && rt(() => {
      G && mt(G, u, c), $ && Ut(c, null, u, "unmounted"), z && (c.el = null);
    }, d);
  }, zs = (c) => {
    const { type: u, el: d, anchor: m, transition: v } = c;
    if (u === xt) {
      ji(d, m);
      return;
    }
    if (u === Ne) {
      O(c);
      return;
    }
    const g = () => {
      i(d), v && !v.persisted && v.afterLeave && v.afterLeave();
    };
    if (c.shapeFlag & 1 && v && !v.persisted) {
      const { leave: x, delayLeave: y } = v, _ = () => x(d, g);
      y ? y(c.el, g, _) : _();
    } else
      g();
  }, ji = (c, u) => {
    let d;
    for (; c !== u; )
      d = C(c), i(c), c = d;
    i(u);
  }, Hi = (c, u, d) => {
    const { bum: m, scope: v, job: g, subTree: x, um: y, m: _, a: b } = c;
    vn(_), vn(b), m && os(m), v.stop(), g && (g.flags |= 8, ht(x, c, u, d)), y && rt(y, u), rt(() => {
      c.isUnmounted = !0;
    }, u);
  }, re = (c, u, d, m = !1, v = !1, g = 0) => {
    for (let x = g; x < c.length; x++)
      ht(c[x], u, d, m, v);
  }, Re = (c) => {
    if (c.shapeFlag & 6)
      return Re(c.component.subTree);
    if (c.shapeFlag & 128)
      return c.suspense.next();
    const u = C(c.anchor || c.el), d = u && u[Rr];
    return d ? C(d) : u;
  };
  let is = !1;
  const Xs = (c, u, d) => {
    let m;
    c == null ? u._vnode && (ht(u._vnode, null, null, !0), m = u._vnode.component) : P(
      u._vnode || null,
      c,
      u,
      null,
      null,
      null,
      d
    ), u._vnode = c, is || (is = !0, ln(m), ei(), is = !1);
  }, oe = {
    p: P,
    um: ht,
    m: Vt,
    r: zs,
    mt: ns,
    mc: Dt,
    pc: V,
    pbc: Nt,
    n: Re,
    o: t
  };
  return {
    render: Xs,
    hydrate: void 0,
    createApp: eo(Xs)
  };
}
function ps({ type: t, props: e }, s) {
  return s === "svg" && t === "foreignObject" || s === "mathml" && t === "annotation-xml" && e && e.encoding && e.encoding.includes("html") ? void 0 : s;
}
function Kt({ effect: t, job: e }, s) {
  s ? (t.flags |= 32, e.flags |= 4) : (t.flags &= -33, e.flags &= -5);
}
function mo(t, e) {
  return (!t || t && !t.pendingBranch) && e && !e.persisted;
}
function Ci(t, e, s = !1) {
  const n = t.children, i = e.children;
  if (I(n) && I(i))
    for (let r = 0; r < n.length; r++) {
      const o = n[r];
      let l = i[r];
      l.shapeFlag & 1 && !l.dynamicChildren && ((l.patchFlag <= 0 || l.patchFlag === 32) && (l = i[r] = At(i[r]), l.el = o.el), !s && l.patchFlag !== -2 && Ci(o, l)), l.type === ss && (l.patchFlag === -1 && (l = i[r] = At(l)), l.el = o.el), l.type === Yt && !l.el && (l.el = o.el);
    }
}
function _o(t) {
  const e = t.slice(), s = [0];
  let n, i, r, o, l;
  const f = t.length;
  for (n = 0; n < f; n++) {
    const p = t[n];
    if (p !== 0) {
      if (i = s[s.length - 1], t[i] < p) {
        e[n] = i, s.push(n);
        continue;
      }
      for (r = 0, o = s.length - 1; r < o; )
        l = r + o >> 1, t[s[l]] < p ? r = l + 1 : o = l;
      p < t[s[r]] && (r > 0 && (e[n] = s[r - 1]), s[r] = n);
    }
  }
  for (r = s.length, o = s[r - 1]; r-- > 0; )
    s[r] = o, o = e[o];
  return s;
}
function Si(t) {
  const e = t.subTree.component;
  if (e)
    return e.asyncDep && !e.asyncResolved ? e : Si(e);
}
function vn(t) {
  if (t)
    for (let e = 0; e < t.length; e++)
      t[e].flags |= 8;
}
function Ti(t) {
  if (t.placeholder)
    return t.placeholder;
  const e = t.component;
  return e ? Ti(e.subTree) : null;
}
const Ei = (t) => t.__isSuspense;
function yo(t, e) {
  e && e.pendingBranch ? I(t) ? e.effects.push(...t) : e.effects.push(t) : Er(t);
}
const xt = /* @__PURE__ */ Symbol.for("v-fgt"), ss = /* @__PURE__ */ Symbol.for("v-txt"), Yt = /* @__PURE__ */ Symbol.for("v-cmt"), Ne = /* @__PURE__ */ Symbol.for("v-stc"), kt = [];
let lt = null;
function Oi(t = !1) {
  kt.push(lt = t ? null : []);
}
function Ai() {
  kt.pop(), lt = kt[kt.length - 1] || null;
}
let we = 1;
function mn(t, e = !1) {
  we += t, t < 0 && lt && e && (lt.hasOnce = !0);
}
function xo(t) {
  return t.dynamicChildren = we > 0 ? lt || Qt : null, Ai(), we > 0 && lt && lt.push(t), t;
}
function Pi(t, e, s, n, i, r) {
  return xo(
    qs(
      t,
      e,
      s,
      n,
      i,
      r,
      !0
    )
  );
}
function Mi(t) {
  return t ? t.__v_isVNode === !0 : !1;
}
function fe(t, e) {
  return t.type === e.type && t.key === e.key;
}
const Ii = ({ key: t }) => t ?? null, $e = ({
  ref: t,
  ref_key: e,
  ref_for: s
}) => (typeof t == "number" && (t = "" + t), t != null ? J(t) || /* @__PURE__ */ it(t) || M(t) ? { i: Ct, r: t, k: e, f: !!s } : t : null);
function qs(t, e = null, s = null, n = 0, i = null, r = t === xt ? 0 : 1, o = !1, l = !1) {
  const f = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: t,
    props: e,
    key: e && Ii(e),
    ref: e && $e(e),
    scopeId: ni,
    slotScopeIds: null,
    children: s,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetStart: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag: r,
    patchFlag: n,
    dynamicProps: i,
    dynamicChildren: null,
    appContext: null,
    ctx: Ct
  };
  return l ? (qe(f, s), r & 128 && t.normalize(f)) : s && (f.shapeFlag |= J(s) ? 8 : 16), we > 0 && // avoid a block node from tracking itself
  !o && // has current parent block
  lt && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (f.patchFlag > 0 || r & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  f.patchFlag !== 32 && lt.push(f), f;
}
const ut = wo;
function wo(t, e = null, s = null, n = 0, i = null, r = !1) {
  if ((!t || t === Gr) && (t = Yt), Mi(t)) {
    const l = ne(
      t,
      e,
      !0
      /* mergeRef: true */
    );
    return s && qe(l, s), we > 0 && !r && lt && (l.shapeFlag & 6 ? lt[lt.indexOf(t)] = l : lt.push(l)), l.patchFlag = -2, l;
  }
  if (Do(t) && (t = t.__vccOpts), e) {
    e = Co(e);
    let { class: l, style: f } = e;
    l && !J(l) && (e.class = Is(l)), W(f) && (/* @__PURE__ */ $s(f) && !I(f) && (f = Z({}, f)), e.style = Ms(f));
  }
  const o = J(t) ? 1 : Ei(t) ? 128 : Qe(t) ? 64 : W(t) ? 4 : M(t) ? 2 : 0;
  return qs(
    t,
    e,
    s,
    n,
    i,
    o,
    r,
    !0
  );
}
function Co(t) {
  return t ? /* @__PURE__ */ $s(t) || vi(t) ? Z({}, t) : t : null;
}
function ne(t, e, s = !1, n = !1) {
  const { props: i, ref: r, patchFlag: o, children: l, transition: f } = t, p = e ? To(i || {}, e) : i, a = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: t.type,
    props: p,
    key: p && Ii(p),
    ref: e && e.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      s && r ? I(r) ? r.concat($e(e)) : [r, $e(e)] : $e(e)
    ) : r,
    scopeId: t.scopeId,
    slotScopeIds: t.slotScopeIds,
    children: l,
    target: t.target,
    targetStart: t.targetStart,
    targetAnchor: t.targetAnchor,
    staticCount: t.staticCount,
    shapeFlag: t.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: e && t.type !== xt ? o === -1 ? 16 : o | 16 : o,
    dynamicProps: t.dynamicProps,
    dynamicChildren: t.dynamicChildren,
    appContext: t.appContext,
    dirs: t.dirs,
    transition: f,
    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: t.component,
    suspense: t.suspense,
    ssContent: t.ssContent && ne(t.ssContent),
    ssFallback: t.ssFallback && ne(t.ssFallback),
    placeholder: t.placeholder,
    el: t.el,
    anchor: t.anchor,
    ctx: t.ctx,
    ce: t.ce
  };
  return f && n && Us(
    a,
    f.clone(a)
  ), a;
}
function So(t = " ", e = 0) {
  return ut(ss, null, t, e);
}
function ks(t, e) {
  const s = ut(Ne, null, t);
  return s.staticCount = e, s;
}
function wt(t) {
  return t == null || typeof t == "boolean" ? ut(Yt) : I(t) ? ut(
    xt,
    null,
    // #3666, avoid reference pollution when reusing vnode
    t.slice()
  ) : Mi(t) ? At(t) : ut(ss, null, String(t));
}
function At(t) {
  return t.el === null && t.patchFlag !== -1 || t.memo ? t : ne(t);
}
function qe(t, e) {
  let s = 0;
  const { shapeFlag: n } = t;
  if (e == null)
    e = null;
  else if (I(e))
    s = 16;
  else if (typeof e == "object")
    if (n & 65) {
      const i = e.default;
      i && (i._c && (i._d = !1), qe(t, i()), i._c && (i._d = !0));
      return;
    } else {
      s = 32;
      const i = e._;
      !i && !vi(e) ? e._ctx = Ct : i === 3 && Ct && (Ct.slots._ === 1 ? e._ = 1 : (e._ = 2, t.patchFlag |= 1024));
    }
  else if (M(e)) {
    if (n & 65) {
      qe(t, { default: e });
      return;
    }
    e = { default: e, _ctx: Ct }, s = 32;
  } else
    e = String(e), n & 64 ? (s = 16, e = [So(e)]) : s = 8;
  t.children = e, t.shapeFlag |= s;
}
function To(...t) {
  const e = {};
  for (let s = 0; s < t.length; s++) {
    const n = t[s];
    for (const i in n)
      if (i === "class")
        e.class !== n.class && (e.class = Is([e.class, n.class]));
      else if (i === "style")
        e.style = Ms([e.style, n.style]);
      else if (Ge(i)) {
        const r = e[i], o = n[i];
        o && r !== o && !(I(r) && r.includes(o)) ? e[i] = r ? [].concat(r, o) : o : o == null && r == null && // mergeProps({ 'onUpdate:modelValue': undefined }) should not retain
        // the model listener.
        !Je(i) && (e[i] = o);
      } else i !== "" && (e[i] = n[i]);
  }
  return e;
}
function mt(t, e, s, n = null) {
  at(t, e, 7, [
    s,
    n
  ]);
}
const Eo = di();
let Oo = 0;
function Ao(t, e, s) {
  const n = t.type, i = (e ? e.appContext : t.appContext) || Eo, r = {
    uid: Oo++,
    vnode: t,
    type: n,
    parent: e,
    appContext: i,
    root: null,
    // to be immediately set
    next: null,
    subTree: null,
    // will be set synchronously right after creation
    effect: null,
    update: null,
    // will be set synchronously right after creation
    job: null,
    scope: new Xi(
      !0
      /* detached */
    ),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: e ? e.provides : Object.create(i.provides),
    ids: e ? e.ids : ["", 0, 0],
    accessCache: null,
    renderCache: [],
    // local resolved assets
    components: null,
    directives: null,
    // resolved props and emits options
    propsOptions: _i(n, i),
    emitsOptions: pi(n, i),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: K,
    // inheritAttrs
    inheritAttrs: n.inheritAttrs,
    // state
    ctx: K,
    data: K,
    props: K,
    attrs: K,
    slots: K,
    refs: K,
    setupState: K,
    setupContext: null,
    // suspense related
    suspense: s,
    suspenseId: s ? s.pendingId : 0,
    asyncDep: null,
    asyncResolved: !1,
    // lifecycle hooks
    // not using enums here because it results in computed properties
    isMounted: !1,
    isUnmounted: !1,
    isDeactivated: !1,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null
  };
  return r.ctx = { _: r }, r.root = e ? e.root : r, r.emit = no.bind(null, r), t.ce && t.ce(r), r;
}
let nt = null;
const Po = () => nt || Ct;
let ke, Ce;
{
  const t = ze(), e = (s, n) => {
    let i;
    return (i = t[s]) || (i = t[s] = []), i.push(n), (r) => {
      i.length > 1 ? i.forEach((o) => o(r)) : i[0](r);
    };
  };
  ke = e(
    "__VUE_INSTANCE_SETTERS__",
    (s) => nt = s
  ), Ce = e(
    "__VUE_SSR_SETTERS__",
    (s) => Se = s
  );
}
const Oe = (t) => {
  const e = nt;
  return ke(t), t.scope.on(), () => {
    t.scope.off(), ke(e);
  };
}, _n = () => {
  nt && nt.scope.off(), ke(null);
};
function Ri(t) {
  return t.vnode.shapeFlag & 4;
}
let Se = !1;
function Mo(t, e = !1, s = !1) {
  e && Ce(e);
  const { props: n, children: i } = t.vnode, r = Ri(t);
  fo(t, n, r, e), ho(t, i, s || e);
  const o = r ? Io(t, e) : void 0;
  return e && Ce(!1), o;
}
function Io(t, e) {
  const s = t.type;
  t.accessCache = /* @__PURE__ */ Object.create(null), t.proxy = new Proxy(t.ctx, Jr);
  const { setup: n } = s;
  if (n) {
    It();
    const i = t.setupContext = n.length > 1 ? Fo(t) : null, r = Oe(t), o = Ee(
      n,
      t,
      0,
      [
        t.props,
        i
      ]
    ), l = Rn(o);
    if (Rt(), r(), (l || t.sp) && !be(t) && li(t), l) {
      if (o.then(_n, _n), e)
        return o.then((f) => {
          Ce(!0);
          try {
            yn(t, f, e);
          } finally {
            Ce(!1);
          }
        }).catch((f) => {
          Ze(f, t, 0);
        });
      t.asyncDep = o;
    } else
      yn(t, o);
  } else
    Fi(t);
}
function yn(t, e, s) {
  M(e) ? t.type.__ssrInlineRender ? t.ssrRender = e : t.render = e : W(e) && (t.setupState = Xn(e)), Fi(t);
}
function Fi(t, e, s) {
  const n = t.type;
  t.render || (t.render = n.render || St);
  {
    const i = Oe(t);
    It();
    try {
      Yr(t);
    } finally {
      Rt(), i();
    }
  }
}
const Ro = {
  get(t, e) {
    return Q(t, "get", ""), t[e];
  }
};
function Fo(t) {
  const e = (s) => {
    t.exposed = s || {};
  };
  return {
    attrs: new Proxy(t.attrs, Ro),
    slots: t.slots,
    emit: t.emit,
    expose: e
  };
}
function Gs(t) {
  return t.exposed ? t.exposeProxy || (t.exposeProxy = new Proxy(Xn(vr(t.exposed)), {
    get(e, s) {
      if (s in e)
        return e[s];
      if (s in ve)
        return ve[s](t);
    },
    has(e, s) {
      return s in e || s in ve;
    }
  })) : t.proxy;
}
function Do(t) {
  return M(t) && "__vccOpts" in t;
}
const jo = (t, e) => /* @__PURE__ */ xr(t, e, Se), Ho = "3.5.42";
let Es;
const xn = typeof window < "u" && window.trustedTypes;
if (xn)
  try {
    Es = /* @__PURE__ */ xn.createPolicy("vue", {
      createHTML: (t) => t
    });
  } catch {
  }
const Di = Es ? (t) => Es.createHTML(t) : (t) => t, Lo = "http://www.w3.org/2000/svg", No = "http://www.w3.org/1998/Math/MathML", Ot = typeof document < "u" ? document : null, wn = Ot && /* @__PURE__ */ Ot.createElement("template"), $o = {
  insert: (t, e, s) => {
    e.insertBefore(t, s || null);
  },
  remove: (t) => {
    const e = t.parentNode;
    e && e.removeChild(t);
  },
  createElement: (t, e, s, n) => {
    const i = e === "svg" ? Ot.createElementNS(Lo, t) : e === "mathml" ? Ot.createElementNS(No, t) : s ? Ot.createElement(t, { is: s }) : Ot.createElement(t);
    return t === "select" && n && n.multiple != null && i.setAttribute("multiple", n.multiple), i;
  },
  createText: (t) => Ot.createTextNode(t),
  createComment: (t) => Ot.createComment(t),
  setText: (t, e) => {
    t.nodeValue = e;
  },
  setElementText: (t, e) => {
    t.textContent = e;
  },
  parentNode: (t) => t.parentNode,
  nextSibling: (t) => t.nextSibling,
  querySelector: (t) => Ot.querySelector(t),
  setScopeId(t, e) {
    t.setAttribute(e, "");
  },
  // __UNSAFE__
  // Reason: innerHTML.
  // Static content here can only come from compiled templates.
  // As long as the user only uses trusted templates, this is safe.
  insertStaticContent(t, e, s, n, i, r) {
    const o = s ? s.previousSibling : e.lastChild;
    if (i && (i === r || i.nextSibling))
      for (; e.insertBefore(i.cloneNode(!0), s), !(i === r || !(i = i.nextSibling)); )
        ;
    else {
      wn.innerHTML = Di(
        n === "svg" ? `<svg>${t}</svg>` : n === "mathml" ? `<math>${t}</math>` : t
      );
      const l = wn.content;
      if (n === "svg" || n === "mathml") {
        const f = l.firstChild;
        for (; f.firstChild; )
          l.appendChild(f.firstChild);
        l.removeChild(f);
      }
      e.insertBefore(l, s);
    }
    return [
      // first
      o ? o.nextSibling : e.firstChild,
      // last
      s ? s.previousSibling : e.lastChild
    ];
  }
}, Vo = /* @__PURE__ */ Symbol("_vtc");
function Uo(t, e, s) {
  const n = t[Vo];
  n && (e = (e ? [e, ...n] : [...n]).join(" ")), e == null ? t.removeAttribute("class") : s ? t.setAttribute("class", e) : t.className = e;
}
const Cn = /* @__PURE__ */ Symbol("_vod"), Ko = /* @__PURE__ */ Symbol("_vsh"), Wo = /* @__PURE__ */ Symbol(""), Bo = /(?:^|;)\s*display\s*:/;
function qo(t, e, s) {
  const n = t.style, i = J(s);
  let r = !1;
  if (s && !i) {
    if (e)
      if (J(e))
        for (const o of e.split(";")) {
          const l = o.slice(0, o.indexOf(":")).trim();
          s[l] == null && ae(n, l, "");
        }
      else
        for (const o in e)
          s[o] == null && ae(n, o, "");
    for (const o in s) {
      o === "display" && (r = !0);
      const l = s[o];
      l != null ? Go(
        t,
        o,
        !J(e) && e ? e[o] : void 0,
        l
      ) || ae(n, o, l) : ae(n, o, "");
    }
  } else if (i) {
    if (e !== s) {
      const o = n[Wo];
      o && (s += ";" + o), n.cssText = s, r = Bo.test(s);
    }
  } else e && t.removeAttribute("style");
  Cn in t && (t[Cn] = r ? n.display : "", t[Ko] && (n.display = "none"));
}
const He = /\s*!important$/;
function ae(t, e, s) {
  if (I(s))
    s.forEach((n) => ae(t, e, n));
  else if (s == null && (s = ""), e.startsWith("--"))
    He.test(s) ? t.setProperty(e, s.replace(He, ""), "important") : t.setProperty(e, s);
  else {
    const n = ko(t, e);
    He.test(s) ? t.setProperty(
      zt(n),
      s.replace(He, ""),
      "important"
    ) : t[n] = s;
  }
}
const Sn = ["Webkit", "Moz", "ms"], hs = {};
function ko(t, e) {
  const s = hs[e];
  if (s)
    return s;
  let n = ct(e);
  if (n !== "filter" && n in t)
    return hs[e] = n;
  n = Fn(n);
  for (let i = 0; i < Sn.length; i++) {
    const r = Sn[i] + n;
    if (r in t)
      return hs[e] = r;
  }
  return e;
}
function Go(t, e, s, n) {
  return t.tagName === "TEXTAREA" && (e === "width" || e === "height") && J(n) && s === n;
}
const Tn = "http://www.w3.org/1999/xlink";
function En(t, e, s, n, i, r = Yi(e)) {
  n && e.startsWith("xlink:") ? s == null ? t.removeAttributeNS(Tn, e.slice(6, e.length)) : t.setAttributeNS(Tn, e, s) : s == null || r && !jn(s) ? t.removeAttribute(e) : t.setAttribute(
    e,
    r ? "" : Lt(s) ? String(s) : s
  );
}
function On(t, e, s, n, i) {
  if (e === "innerHTML" || e === "textContent") {
    s != null && (t[e] = e === "innerHTML" ? Di(s) : s);
    return;
  }
  const r = t.tagName;
  if (e === "value" && r !== "PROGRESS" && // custom elements may use _value internally
  !r.includes("-")) {
    const l = r === "OPTION" ? t.getAttribute("value") || "" : t.value, f = s == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      t.type === "checkbox" ? "on" : ""
    ) : String(s);
    (l !== f || !("_value" in t)) && (t.value = f), s == null && t.removeAttribute(e), t._value = s;
    return;
  }
  let o = !1;
  if (s === "" || s == null) {
    const l = typeof t[e];
    l === "boolean" ? s = jn(s) : s == null && l === "string" ? (s = "", o = !0) : l === "number" && (s = 0, o = !0);
  }
  try {
    t[e] = s;
  } catch {
  }
  o && t.removeAttribute(i || e);
}
function Jo(t, e, s, n) {
  t.addEventListener(e, s, n);
}
function Yo(t, e, s, n) {
  t.removeEventListener(e, s, n);
}
const An = /* @__PURE__ */ Symbol("_vei");
function zo(t, e, s, n, i = null) {
  const r = t[An] || (t[An] = {}), o = r[e];
  if (n && o)
    o.value = n;
  else {
    const [l, f] = Qo(e);
    if (n) {
      const p = r[e] = sl(
        n,
        i
      );
      Jo(t, l, p, f);
    } else o && (Yo(t, l, o, f), r[e] = void 0);
  }
}
const Xo = /(Once|Passive|Capture)$/, Zo = /^on:?(?:Once|Passive|Capture)$/;
function Qo(t) {
  let e, s;
  for (; (s = t.match(Xo)) && !Zo.test(t); )
    e || (e = {}), t = t.slice(0, t.length - s[1].length), e[s[1].toLowerCase()] = !0;
  return [t[2] === ":" ? t.slice(3) : zt(t.slice(2)), e];
}
let gs = 0;
const tl = /* @__PURE__ */ Promise.resolve(), el = () => gs || (tl.then(() => gs = 0), gs = Date.now());
function sl(t, e) {
  const s = (n) => {
    if (!n._vts)
      n._vts = Date.now();
    else if (n._vts <= s.attached)
      return;
    const i = s.value;
    if (I(i)) {
      const r = n.stopImmediatePropagation;
      n.stopImmediatePropagation = () => {
        r.call(n), n._stopped = !0;
      };
      const o = i.slice(), l = [n];
      for (let f = 0; f < o.length && !n._stopped; f++) {
        const p = o[f];
        p && at(
          p,
          e,
          5,
          l
        );
      }
    } else
      at(
        i,
        e,
        5,
        [n]
      );
  };
  return s.value = t, s.attached = el(), s;
}
const Pn = (t) => t.charCodeAt(0) === 111 && t.charCodeAt(1) === 110 && // lowercase letter
t.charCodeAt(2) > 96 && t.charCodeAt(2) < 123, nl = (t, e, s, n, i, r) => {
  const o = i === "svg";
  e === "class" ? Uo(t, n, o) : e === "style" ? qo(t, s, n) : Ge(e) ? Je(e) || zo(t, e, s, n, r) : (e[0] === "." ? (e = e.slice(1), !0) : e[0] === "^" ? (e = e.slice(1), !1) : il(t, e, n, o)) ? (On(t, e, n), !t.tagName.includes("-") && (e === "value" || e === "checked" || e === "selected") && En(t, e, n, o, r, e !== "value")) : /* #11081 force set props for possible async custom element */ t._isVueCE && // #12408 check if it's declared prop or it's async custom element
  (rl(t, e) || // @ts-expect-error _def is private
  t._def.__asyncLoader && (/[A-Z]/.test(e) || !J(n))) ? On(t, ct(e), n, r, e) : (e === "true-value" ? t._trueValue = n : e === "false-value" && (t._falseValue = n), En(t, e, n, o));
};
function il(t, e, s, n) {
  if (n)
    return !!(e === "innerHTML" || e === "textContent" || e in t && Pn(e) && M(s));
  if (e === "spellcheck" || e === "draggable" || e === "translate" || e === "autocorrect" || e === "sandbox" && t.tagName === "IFRAME" || e === "form" || e === "list" && t.tagName === "INPUT" || e === "type" && t.tagName === "TEXTAREA")
    return !1;
  if (e === "width" || e === "height") {
    const i = t.tagName;
    if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE")
      return !1;
  }
  return Pn(e) && J(s) ? !1 : e in t;
}
function rl(t, e) {
  const s = (
    // @ts-expect-error _def is private
    t._def.props
  );
  if (!s)
    return !1;
  const n = ct(e);
  return Array.isArray(s) ? s.some((i) => ct(i) === n) : Object.keys(s).some((i) => ct(i) === n);
}
const ol = /* @__PURE__ */ Z({ patchProp: nl }, $o);
let Mn;
function ll() {
  return Mn || (Mn = bo(ol));
}
const cl = ((...t) => {
  const e = ll().createApp(...t), { mount: s } = e;
  return e.mount = (n) => {
    const i = ul(n);
    if (!i) return;
    const r = e._component;
    !M(r) && !r.render && !r.template && (r.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
    const o = s(i, !1, fl(i));
    return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), o;
  }, e;
});
function fl(t) {
  if (t instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && t instanceof MathMLElement)
    return "mathml";
}
function ul(t) {
  return J(t) ? document.querySelector(t) : t;
}
const Js = (t, e) => {
  const s = t.__vccOpts || t;
  for (const [n, i] of e)
    s[n] = i;
  return s;
}, al = {};
function dl(t, e) {
  return e[0] || (e[0] = ks('<div id="root-modal" class="hidden"><div id="root-dialog"><div class="root-head">ルートプロジェクト（作業対象フォルダ）を選ぶ</div><div id="root-places"></div><div id="root-drives"></div><div class="root-inputrow"><input id="root-input" type="text" spellcheck="false" placeholder="例: D:\\projects\\myapp（Enter で移動）"><button id="root-fav-btn" title="今表示しているフォルダをお気に入りに入れる／外す"> ☆ </button></div><ul id="root-dirlist"></ul><div class="root-hint hint"> フォルダをクリックで移動 ／ パス直接入力＋Enter でも移動。決定するとファイルブラウザが切替わり、新しい会話がそのフォルダで始まります。 </div><div class="root-actions"><button id="root-cancel">キャンセル</button><button id="root-ok" class="apply-btn">✓ このフォルダにする</button></div></div></div><div id="hist-modal" class="hidden"><div id="hist-dialog"><div class="root-head">🕰 保存履歴 — <span id="hist-file"></span></div><div id="hist-body"><ul id="hist-list"></ul><div id="hist-preview-wrap"><div id="hist-preview-head" class="hint"> 左の版を選ぶと内容が出ます。 </div><pre id="hist-preview"></pre></div></div><div class="root-hint hint"> 保存の直前の内容を残しています。戻すときは「今の内容」も履歴に積むので、戻し間違えてもやり直せます。 </div><div class="root-actions"><button id="hist-close">閉じる</button><button id="hist-restore" class="apply-btn" disabled> ↩ この版に戻す </button></div></div></div><div id="pick-modal" class="hidden"><div id="pick-dialog"><div class="root-head">参照するファイルを選ぶ</div><div id="pick-drives"></div><input id="pick-input" type="text" spellcheck="false" placeholder="例: C:\\Users\\you\\decks（Enter でフォルダへ移動）"><ul id="pick-list"></ul><div class="root-hint hint"> フォルダをクリックで移動 ／ ファイルをクリックで参照に追加します。 </div><div class="root-actions"><button id="pick-cancel">閉じる</button></div></div></div><div id="cf-modal" class="hidden"><div id="cf-dialog"><div class="root-head">📥 Confluence / Web から貼り付け</div><div class="root-hint hint"> Confluence のページをブラウザでコピー（Ctrl+C）してから「クリップボードから読込」、 または下の欄に Ctrl+V。リッチテキスト（HTML）で取れれば Markdown に変換して、 今開いているファイルのカーソル位置へ挿入します（画像は Confluence 上のURL参照のまま残ります）。 </div><div class="cf-actions"><button id="cf-read-btn" title="クリップボードを直接読み取る（ブラウザの許可が必要な場合あり）"> クリップボードから読込 </button><span id="cf-status" class="hint"></span></div><textarea id="cf-input" rows="10" spellcheck="false" placeholder="ここに貼り付け（Ctrl+V）…"></textarea><div class="root-actions"><button id="cf-cancel">閉じる</button><button id="cf-insert" class="apply-btn">✓ 変換して挿入</button></div></div></div><div id="sessions-modal" class="hidden"><div id="sessions-dialog"><div class="root-head">🗂 保存済みの会話</div><div class="root-hint hint"> クリックで会話を復元します（チャット表示＋エンジン文脈。ツール実行の詳細は失われ、 会話の本文だけが文脈として引き継がれます）。会話はターン確定ごとに自動保存されます。 </div><ul id="sessions-list"></ul><div class="root-actions"><button id="sessions-close" class="apply-btn">閉じる</button></div></div></div><div id="settings-modal" class="hidden"><div id="settings-dialog"><div class="root-head">設定</div><label class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>モデル / サーバ</b><span class="hint">以降の新しい会話に反映されます。</span></span><select id="settings-model"></select></label><label class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>ロード済みモデル</b><span class="hint">LM Studio でロード済みのモデルから選択（起動中のみ取得可）。</span></span><select id="settings-llm-model"></select></label><div class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>思考許容時間（秒）</b><span class="hint">AI が <code>&lt;think&gt;</code> で考え込める上限。超えると打ち切って結論生成に移ります。長くするほど1回の待ち時間が延びます（既定 90）。</span></span><span class="settings-inline"><input id="settings-think-budget" type="number" min="10" max="1800" step="10"><button id="settings-think-budget-save">保存</button><span id="settings-think-budget-status" class="hint"></span></span></div><div class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>コンテキスト長（トークン）</b><span class="hint">このサーバのモデル窓長。<b>0 で自動</b>（LM Studio の <code>meta.n_ctx</code> を取得）。リモートの LM Studio / llama-server は取れず 32768 と仮定するので、実際の窓長を手で入れると溢れ・無駄な切り詰めを防げます。変更するとこのサーバの会話は作り直されます。</span></span><span class="settings-inline"><input id="settings-context-length" type="number" min="0" max="2000000" step="1024" placeholder="0（自動）"><button id="settings-context-length-save">保存</button><span id="settings-context-length-status" class="hint"></span></span></div><label class="settings-row toggle"><input type="checkbox" id="settings-copilot"><span><b>Copilot 連携</b><span class="hint">オンにすると、エージェントが <code>ask_copilot</code> ツールで Microsoft Copilot に相談できます（PrayLight 経由）。</span></span></label><div class="settings-row" id="settings-copilot-controls"><button id="settings-copilot-open" title="Copilot にログインするためのブラウザを開く"> Copilotブラウザを開く（ログイン用） </button><span id="settings-copilot-status" class="hint"></span></div><div class="root-actions"><button id="settings-close" class="apply-btn">閉じる</button></div></div></div>', 6));
}
const pl = /* @__PURE__ */ Js(al, [["render", dl]]), hl = {};
function gl(t, e) {
  return e[0] || (e[0] = ks('<div class="brand">CodeWithPixie</div><button id="mode-btn" title="モード切替">…</button><button id="code-style-btn" class="code-only" title="Codeモードの進め方を切り替え"> 通常 </button><button id="root-project-btn" title="ルートプロジェクト（作業対象フォルダ）を変更"><span id="root-project-name">…</span></button><button id="places-btn" title="お気に入り・最近使ったフォルダへ移動"> ⭐ </button><div class="file-info"><button id="nav-back" class="nav-btn" title="前に開いていたファイルへ戻る (Alt+←)"> ◀ </button><button id="nav-fwd" class="nav-btn" title="進む (Alt+→)">▶</button><button id="recent-btn" class="nav-btn" title="最近開いたファイル (Ctrl+E)"> 🕘 </button><span id="current-file">（ファイル未選択）</span><button id="save-btn" title="保存 (Ctrl+S)">保存</button><span id="save-state"></span><button id="history-btn" title="このファイルの保存履歴から元に戻す"> 🕰 履歴 </button></div><div class="model-info"> model: <span id="model-name">…</span><span id="agent-status"></span></div><button id="settings-btn" title="設定（モデル）">設定</button>', 8));
}
const bl = /* @__PURE__ */ Js(hl, [["render", gl]]), vl = {}, ml = { id: "split" };
function _l(t, e) {
  return Oi(), Pi("main", ml, [...e[0] || (e[0] = [
    ks('<section id="left-pane"><div id="edit-area"><div id="editor"></div><div id="preview-divider" class="hidden" title="ドラッグでプレビューの幅を調整（ダブルクリックで等分に戻す）"></div><div id="preview" class="md hidden" aria-live="off"></div></div><div id="diff-overlay" class="hidden"><div id="diff-bar"><span id="diff-label">差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）</span><span id="diff-tabs"></span><span class="spacer"></span><button id="diff-close" class="hidden" title="差分表示を閉じる（承認の判断は右の承認バーで行う）"> ✕ 閉じる </button><button id="diff-approve-edit" class="apply-btn hidden" title="右ペインで編集した内容をそのまま書き込み、エージェントには完了済みと伝える"> ✓ 修正して承認 </button><button id="diff-apply" class="apply-btn">✓ 適用</button><button id="diff-cancel">キャンセル</button></div><div id="diff-editor"></div></div><div id="plan-overlay" class="hidden"><div id="plan-bar"><span id="plan-label">実行計画（承認するまでファイルは変更されません）</span><span class="spacer"></span><button id="plan-approve" class="apply-btn">✓ この計画で実行</button><button id="plan-reject">✕ 修正を依頼</button></div><div id="plan-body" class="md"></div></div><div id="left-toolbar"><button id="note-btn" class="note-only" title="選択行に付箋を貼る"> 付箋 </button><button id="preview-btn" title="Markdown プレビューを表示 (Ctrl+Shift+P)"> 👁 プレビュー </button><button id="richcopy-btn" disabled title="Markdown プレビュー表示中に使えます"> リッチコピー </button><span id="sel-info" class="hint">エージェントがファイルを直接編集します（破壊操作は承認制）。</span></div></section><div id="divider" title="ドラッグで幅を調整"></div><section id="right-pane"><div id="filemgr"><div class="section-head"><span>ファイル（ワークスペース）</span><span class="fm-actions"><button id="folder-btn" title="作業フォルダを変更"> フォルダ変更 </button><button id="refresh-btn" title="再読込">⟳</button><button id="new-file-btn" title="新規ファイル">ファイル追加</button><button id="new-folder-btn" title="新規フォルダ"> フォルダ追加 </button><button id="web2md-btn" class="note-only" title="URLのページをMarkdown化して web/ に保存する"> 🌐+ </button><button id="cf-btn" title="Confluence 等のページ（コピーしたHTML）をMarkdownに変換して挿入する"> 📥 貼付 </button></span><span class="search-row"><input id="file-search" type="search" placeholder="全文検索…"><span id="search-opts" class="hidden"><label title="大文字小文字を区別する（検索と置換で共通）"><input id="search-case" type="checkbox"> Aa </label><button id="replace-toggle" title="ヒットしたファイルをまとめて置換する"> 🔁 置換 </button></span></span></div><div id="replace-bar" class="hidden"><input id="replace-input" type="text" spellcheck="false" placeholder="置換後の文字列（そのまま入ります）"><div class="replace-actions"><button id="replace-preview-btn">👁 プレビュー</button><button id="replace-run-btn" class="apply-btn">✓ すべて置換</button><span id="replace-status" class="hint"></span></div><div id="replace-preview"></div></div><div id="root-bar"><span id="root-path" title="現在の作業フォルダ"></span><span id="files-trunc" class="hidden" title="巨大ワークスペースのため一覧を打ち切りました（目的のファイルは全文検索で探せます）">⚠ 一覧は先頭2万件まで</span></div><ul id="file-list"></ul><div id="search-results" class="hidden"></div></div><div id="v-divider" title="ドラッグでファイル欄の高さを調整（ダブルクリックで既定に戻す）"></div><div id="refmgr" class="note-only"><div class="section-head"><span>関連ファイル</span><span class="fm-actions"><button id="ref-add-btn" title="別ディレクトリのファイル（.pptx 等）を参照に追加"> ＋参照を追加 </button></span></div><ul id="ref-list"></ul><div id="ref-empty" class="hint"> ここにファイルをドラッグ、または「＋参照を追加」で紐付けます。 </div></div><div id="chat"><div class="section-head"><span>チャット</span><span class="fm-actions"><span id="session-info" class="hint code-only" title="この会話のセッションID"></span><button id="new-session-btn" class="code-only" title="新しい会話を開始（並行セッション）"> ＋新規会話 </button><button id="sessions-btn" class="code-only" title="保存済みの会話を一覧から復元する"> 🗂 会話 </button><button id="chat-clear-btn" class="note-only" title="この保存先の会話履歴を消去する"> 履歴を消去 </button></span></div><div id="messages"></div><div id="approval" class="hidden code-only"></div><div id="composer"><div id="chip-bar"><span id="sel-chip" class="chip hidden">選択テキスト添付</span></div><textarea id="chat-input" rows="3" placeholder="例）src/foo.py に入力値を検証する関数を追加して。テストも書いて実行して確認して。"></textarea><div class="composer-actions"><span class="hint">Ctrl+Enter で送信</span><button id="send-btn">送信</button></div><div id="copilot-bar" class="note-only"><button id="cp-bar-open-btn" title="デバッグ用ブラウザで Copilot を開く（そこで人が対話する）"> Copilotを開く </button><button id="cp-bar-import-btn" title="開いている Copilot の会話を取得してAIにまとめさせる（普段のブラウザでOK・Copilotタブを前面にしておく）"> ⬇ 会話を取り込んでまとめる </button><span id="cp-bar-status" class="hint"></span></div></div></div></section>', 3)
  ])]);
}
const yl = /* @__PURE__ */ Js(vl, [["render", _l]]), xl = { id: "topbar" }, wl = /* @__PURE__ */ Dr({
  __name: "App",
  setup(t) {
    return (e, s) => (Oi(), Pi(xt, null, [
      qs("header", xl, [
        ut(bl)
      ]),
      ut(yl),
      ut(pl)
    ], 64));
  }
});
cl(wl).mount("#app");
Qn(() => import("./app-IzngdCGH.js"));
