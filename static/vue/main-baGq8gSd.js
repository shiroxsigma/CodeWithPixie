// @__NO_SIDE_EFFECTS__
function Ds(t) {
  const e = /* @__PURE__ */ Object.create(null);
  for (const s of t.split(",")) e[s] = 1;
  return (s) => s in e;
}
const W = {}, ee = [], Tt = () => {
}, Dn = () => !1, Ze = (t) => t.charCodeAt(0) === 111 && t.charCodeAt(1) === 110 && // uppercase letter
(t.charCodeAt(2) > 122 || t.charCodeAt(2) < 97), Qe = (t) => t.startsWith("onUpdate:"), Q = Object.assign, Ls = (t, e) => {
  const s = t.indexOf(e);
  s > -1 && t.splice(s, 1);
}, qi = Object.prototype.hasOwnProperty, L = (t, e) => qi.call(t, e), P = Array.isArray, Nt = (t) => Ae(t) === "[object Map]", We = (t) => Ae(t) === "[object Set]", rn = (t) => Ae(t) === "[object Date]", I = (t) => typeof t == "function", J = (t) => typeof t == "string", Ot = (t) => typeof t == "symbol", V = (t) => t !== null && typeof t == "object", Ln = (t) => (V(t) || I(t)) && I(t.then) && I(t.catch), jn = Object.prototype.toString, Ae = (t) => jn.call(t), Ji = (t) => Ae(t).slice(8, -1), Hn = (t) => Ae(t) === "[object Object]", js = (t) => J(t) && t !== "NaN" && t[0] !== "-" && "" + parseInt(t, 10) === t, he = /* @__PURE__ */ Ds(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), ts = (t) => {
  const e = /* @__PURE__ */ Object.create(null);
  return ((s) => e[s] || (e[s] = t(s)));
}, Gi = /-\w/g, ft = ts(
  (t) => t.replace(Gi, (e) => e.slice(1).toUpperCase())
), Yi = /\B([A-Z])/g, Zt = ts(
  (t) => t.replace(Yi, "-$1").toLowerCase()
), $n = ts((t) => t.charAt(0).toUpperCase() + t.slice(1)), ds = ts(
  (t) => t ? `on${$n(t)}` : ""
), It = (t, e) => !Object.is(t, e), ps = (t, ...e) => {
  for (let s = 0; s < t.length; s++)
    t[s](...e);
}, Nn = (t, e, s, n = !1) => {
  Object.defineProperty(t, e, {
    configurable: !0,
    enumerable: !1,
    writable: n,
    value: s
  });
}, zi = (t) => {
  const e = parseFloat(t);
  return isNaN(e) ? t : e;
};
let on;
const es = () => on || (on = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function Hs(t) {
  if (P(t)) {
    const e = {};
    for (let s = 0; s < t.length; s++) {
      const n = t[s], i = J(n) ? tr(n) : Hs(n);
      if (i)
        for (const r in i)
          e[r] = i[r];
    }
    return e;
  } else if (J(t) || V(t))
    return t;
}
const Xi = /;(?![^(]*\))/g, Zi = /:([^]+)/, Qi = /\/\*[^]*?\*\//g;
function tr(t) {
  const e = {};
  return t.replace(Qi, "").split(Xi).forEach((s) => {
    if (s) {
      const n = s.split(Zi);
      n.length > 1 && (e[n[0].trim()] = n[1].trim());
    }
  }), e;
}
function ss(t) {
  let e = "";
  if (J(t))
    e = t;
  else if (P(t))
    for (let s = 0; s < t.length; s++) {
      const n = ss(t[s]);
      n && (e += n + " ");
    }
  else if (V(t))
    for (const s in t)
      t[s] && (e += s + " ");
  return e.trim();
}
const er = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", sr = /* @__PURE__ */ Ds(er);
function Vn(t) {
  return !!t || t === "";
}
function nr(t, e) {
  if (t.length !== e.length) return !1;
  let s = !0;
  for (let n = 0; s && n < t.length; n++)
    s = ns(t[n], e[n]);
  return s;
}
function ln(t, e) {
  if (t.size !== e.size) return !1;
  const s = Array.from(e), n = new Uint8Array(s.length);
  for (const i of t) {
    let r = -1;
    for (let o = 0; o < s.length; o++)
      if (!n[o] && ns(i, s[o])) {
        r = o;
        break;
      }
    if (r < 0) return !1;
    n[r] = 1;
  }
  return !0;
}
function ns(t, e) {
  if (t === e) return !0;
  let s = rn(t), n = rn(e);
  if (s || n)
    return s && n ? t.getTime() === e.getTime() : !1;
  if (s = Ot(t), n = Ot(e), s || n)
    return t === e;
  if (s = P(t), n = P(e), s || n)
    return s && n ? nr(t, e) : !1;
  if (s = V(t), n = V(e), s || n) {
    if (!s || !n)
      return !1;
    if (s = Nt(t), n = Nt(e), s || n || (s = We(t), n = We(e), s || n))
      return s && n ? ln(t, e) : !1;
    const i = Object.keys(t).length, r = Object.keys(e).length;
    if (i !== r)
      return !1;
    for (const o in t) {
      const l = t.hasOwnProperty(o), f = e.hasOwnProperty(o);
      if (l && !f || !l && f || !ns(t[o], e[o]))
        return !1;
    }
  }
  return String(t) === String(e);
}
const Un = (t) => !!(t && t.__v_isRef === !0), Cs = (t) => J(t) ? t : t == null ? "" : P(t) || V(t) && (t.toString === jn || !I(t.toString)) ? Un(t) ? Cs(t.value) : JSON.stringify(t, Kn, 2) : String(t), Kn = (t, e) => Un(e) ? Kn(t, e.value) : Nt(e) ? {
  [`Map(${e.size})`]: [...e.entries()].reduce(
    (s, [n, i], r) => (s[hs(n, r) + " =>"] = i, s),
    {}
  )
} : We(e) ? {
  [`Set(${e.size})`]: [...e.values()].map((s) => hs(s))
} : Ot(e) ? hs(e) : V(e) && !P(e) && !Hn(e) ? String(e) : e, hs = (t, e = "") => {
  var s;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    Ot(t) ? `Symbol(${(s = t.description) != null ? s : e})` : t
  );
};
let Z;
class ir {
  // TODO isolatedDeclarations "__v_skip"
  constructor(e = !1) {
    this.detached = e, this._active = !0, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = !1, this._warnOnRun = !0, this.__v_skip = !0, !e && Z && (Z.active ? (this.parent = Z, this.index = (Z.scopes || (Z.scopes = [])).push(
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
      const s = Z;
      try {
        return Z = this, e();
      } finally {
        Z = s;
      }
    }
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    ++this._on === 1 && (this.prevScope = Z, Z = this);
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    if (this._on > 0 && --this._on === 0) {
      if (Z === this)
        Z = this.prevScope;
      else {
        let e = Z;
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
function rr() {
  return Z;
}
let K;
const gs = /* @__PURE__ */ new WeakSet();
class Wn {
  constructor(e) {
    this.fn = e, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, Z && (Z.active ? Z.effects.push(this) : this.flags &= -2);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, gs.has(this) && (gs.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || kn(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, cn(this), qn(this);
    const e = K, s = ut;
    K = this, ut = !0;
    try {
      return this.fn();
    } finally {
      Jn(this), K = e, ut = s, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let e = this.deps; e; e = e.nextDep)
        Vs(e);
      this.deps = this.depsTail = void 0, cn(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? gs.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    Ts(this) && this.run();
  }
  get dirty() {
    return Ts(this);
  }
}
let Bn = 0, ge, be;
function kn(t, e = !1) {
  if (t.flags |= 8, e) {
    t.next = be, be = t;
    return;
  }
  t.next = ge, ge = t;
}
function $s() {
  Bn++;
}
function Ns() {
  if (--Bn > 0)
    return;
  if (be) {
    let e = be;
    for (be = void 0; e; ) {
      const s = e.next;
      e.next = void 0, e.flags &= -9, e = s;
    }
  }
  let t;
  for (; ge; ) {
    let e = ge;
    for (ge = void 0; e; ) {
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
function qn(t) {
  for (let e = t.deps; e; e = e.nextDep)
    e.version = -1, e.prevActiveLink = e.dep.activeLink, e.dep.activeLink = e;
}
function Jn(t) {
  let e, s = t.depsTail, n = s;
  for (; n; ) {
    const i = n.prevDep;
    n.version === -1 ? (n === s && (s = i), Vs(n), or(n)) : e = n, n.dep.activeLink = n.prevActiveLink, n.prevActiveLink = void 0, n = i;
  }
  t.deps = e, t.depsTail = s;
}
function Ts(t) {
  for (let e = t.deps; e; e = e.nextDep)
    if (e.dep.version !== e.version || e.dep.computed && (Gn(e.dep.computed) || e.dep.version !== e.version))
      return !0;
  return !!t._dirty;
}
function Gn(t) {
  if (t.flags & 4 && !(t.flags & 16) || (t.flags &= -17, t.globalVersion === xe) || (t.globalVersion = xe, !t.isSSR && t.flags & 128 && (!t.deps && !t._dirty || !Ts(t))))
    return;
  t.flags |= 2;
  const e = t.dep, s = K, n = ut;
  K = t, ut = !0;
  try {
    qn(t);
    const i = t.fn(t._value);
    (e.version === 0 || It(i, t._value)) && (t.flags |= 128, t._value = i, e.version++);
  } catch (i) {
    throw e.version++, i;
  } finally {
    K = s, ut = n, Jn(t), t.flags &= -3;
  }
}
function Vs(t, e = !1) {
  const { dep: s, prevSub: n, nextSub: i } = t;
  if (n && (n.nextSub = i, t.prevSub = void 0), i && (i.prevSub = n, t.nextSub = void 0), s.subs === t && (s.subs = n, !n && s.computed)) {
    s.computed.flags &= -5;
    for (let r = s.computed.deps; r; r = r.nextDep)
      Vs(r, !0);
  }
  !e && !--s.sc && s.map && s.map.delete(s.key);
}
function or(t) {
  const { prevDep: e, nextDep: s } = t;
  e && (e.nextDep = s, t.prevDep = void 0), s && (s.prevDep = e, t.nextDep = void 0);
}
let ut = !0;
const Yn = [];
function Ft() {
  Yn.push(ut), ut = !1;
}
function Dt() {
  const t = Yn.pop();
  ut = t === void 0 ? !0 : t;
}
function cn(t) {
  const { cleanup: e } = t;
  if (t.cleanup = void 0, e) {
    const s = K;
    K = void 0;
    try {
      e();
    } finally {
      K = s;
    }
  }
}
let xe = 0;
class lr {
  constructor(e, s) {
    this.sub = e, this.dep = s, this.version = s.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class zn {
  // TODO isolatedDeclarations "__v_skip"
  constructor(e) {
    this.computed = e, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = !0;
  }
  track(e) {
    if (!K || !ut || K === this.computed)
      return;
    let s = this.activeLink;
    if (s === void 0 || s.sub !== K)
      s = this.activeLink = new lr(K, this), K.deps ? (s.prevDep = K.depsTail, K.depsTail.nextDep = s, K.depsTail = s) : K.deps = K.depsTail = s, Xn(s);
    else if (s.version === -1 && (s.version = this.version, s.nextDep)) {
      const n = s.nextDep;
      n.prevDep = s.prevDep, s.prevDep && (s.prevDep.nextDep = n), s.prevDep = K.depsTail, s.nextDep = void 0, K.depsTail.nextDep = s, K.depsTail = s, K.deps === s && (K.deps = n);
    }
    return s;
  }
  trigger(e) {
    this.version++, xe++, this.notify(e);
  }
  notify(e) {
    $s();
    try {
      for (let s = this.subs; s; s = s.prevSub)
        s.sub.notify() && s.sub.dep.notify();
    } finally {
      Ns();
    }
  }
}
function Xn(t) {
  if (t.dep.sc++, t.sub.flags & 4) {
    const e = t.dep.computed;
    if (e && !t.dep.subs) {
      e.flags |= 20;
      for (let n = e.deps; n; n = n.nextDep)
        Xn(n);
    }
    const s = t.dep.subs;
    s !== t && (t.prevSub = s, s && (s.nextSub = t)), t.dep.subs = t;
  }
}
const Es = /* @__PURE__ */ new WeakMap(), Jt = /* @__PURE__ */ Symbol(
  ""
), Os = /* @__PURE__ */ Symbol(
  ""
), we = /* @__PURE__ */ Symbol(
  ""
);
function tt(t, e, s) {
  if (ut && K) {
    let n = Es.get(t);
    n || Es.set(t, n = /* @__PURE__ */ new Map());
    let i = n.get(s);
    i || (n.set(s, i = new zn()), i.map = n, i.key = s), i.track();
  }
}
function Rt(t, e, s, n, i, r) {
  const o = Es.get(t);
  if (!o) {
    xe++;
    return;
  }
  const l = (f) => {
    f && f.trigger();
  };
  if ($s(), e === "clear")
    o.forEach(l);
  else {
    const f = P(t), p = f && js(s);
    if (f && s === "length") {
      const a = Number(n);
      o.forEach((h, S) => {
        (S === "length" || S === we || !Ot(S) && S >= a) && l(h);
      });
    } else
      switch ((s !== void 0 || o.has(void 0)) && l(o.get(s)), p && l(o.get(we)), e) {
        case "add":
          f ? p && l(o.get("length")) : (l(o.get(Jt)), Nt(t) && l(o.get(Os)));
          break;
        case "delete":
          f || (l(o.get(Jt)), Nt(t) && l(o.get(Os)));
          break;
        case "set":
          Nt(t) && l(o.get(Jt));
          break;
      }
  }
  Ns();
}
function Qt(t) {
  const e = /* @__PURE__ */ $(t);
  return e === t ? e : (tt(e, "iterate", we), /* @__PURE__ */ Et(t) ? e : e.map(zt));
}
function Us(t) {
  return tt(t = /* @__PURE__ */ $(t), "iterate", we), t;
}
function xt(t, e) {
  return /* @__PURE__ */ Yt(t) ? Se(/* @__PURE__ */ se(t) ? zt(e) : e) : zt(e);
}
const cr = {
  __proto__: null,
  [Symbol.iterator]() {
    return bs(this, Symbol.iterator, (t) => xt(this, t));
  },
  concat(...t) {
    return Qt(this).concat(
      ...t.map((e) => P(e) ? Qt(e) : e)
    );
  },
  entries() {
    return bs(this, "entries", (t) => (t[1] = xt(this, t[1]), t));
  },
  every(t, e) {
    return At(this, "every", t, e, void 0, arguments);
  },
  filter(t, e) {
    return At(
      this,
      "filter",
      t,
      e,
      (s) => s.map((n) => xt(this, n)),
      arguments
    );
  },
  find(t, e) {
    return At(
      this,
      "find",
      t,
      e,
      (s) => xt(this, s),
      arguments
    );
  },
  findIndex(t, e) {
    return At(this, "findIndex", t, e, void 0, arguments);
  },
  findLast(t, e) {
    return At(
      this,
      "findLast",
      t,
      e,
      (s) => xt(this, s),
      arguments
    );
  },
  findLastIndex(t, e) {
    return At(this, "findLastIndex", t, e, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(t, e) {
    return At(this, "forEach", t, e, void 0, arguments);
  },
  includes(...t) {
    return ms(this, "includes", t);
  },
  indexOf(...t) {
    return ms(this, "indexOf", t);
  },
  join(t) {
    return Qt(this).join(t);
  },
  // keys() iterator only reads `length`, no optimization required
  lastIndexOf(...t) {
    return ms(this, "lastIndexOf", t);
  },
  map(t, e) {
    return At(this, "map", t, e, void 0, arguments);
  },
  pop() {
    return ue(this, "pop");
  },
  push(...t) {
    return ue(this, "push", t);
  },
  reduce(t, ...e) {
    return fn(this, "reduce", t, e);
  },
  reduceRight(t, ...e) {
    return fn(this, "reduceRight", t, e);
  },
  shift() {
    return ue(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(t, e) {
    return At(this, "some", t, e, void 0, arguments);
  },
  splice(...t) {
    return ue(this, "splice", t);
  },
  toReversed() {
    return Qt(this).toReversed();
  },
  toSorted(t) {
    return Qt(this).toSorted(t);
  },
  toSpliced(...t) {
    return Qt(this).toSpliced(...t);
  },
  unshift(...t) {
    return ue(this, "unshift", t);
  },
  values() {
    return bs(this, "values", (t) => xt(this, t));
  }
};
function bs(t, e, s) {
  const n = Us(t), i = n[e]();
  return n !== t && !/* @__PURE__ */ Et(t) && (i._next = i.next, i.next = () => {
    const r = i._next();
    return r.done || (r.value = s(r.value)), r;
  }), i;
}
const fr = Array.prototype;
function At(t, e, s, n, i, r) {
  const o = Us(t), l = o !== t && !/* @__PURE__ */ Et(t), f = o[e];
  if (f !== fr[e]) {
    const h = f.apply(t, r);
    return l ? zt(h) : h;
  }
  let p = s;
  o !== t && (l ? p = function(h, S) {
    return s.call(this, xt(t, h), S, t);
  } : s.length > 2 && (p = function(h, S) {
    return s.call(this, h, S, t);
  }));
  const a = f.call(o, p, n);
  return l && i ? i(a) : a;
}
function fn(t, e, s, n) {
  const i = Us(t), r = i !== t && !/* @__PURE__ */ Et(t);
  let o = s, l = !1;
  i !== t && (r ? (l = n.length === 0, o = function(p, a, h) {
    return l && (l = !1, p = xt(t, p)), s.call(this, p, xt(t, a), h, t);
  }) : s.length > 3 && (o = function(p, a, h) {
    return s.call(this, p, a, h, t);
  }));
  const f = i[e](o, ...n);
  return l ? xt(t, f) : f;
}
function ms(t, e, s) {
  const n = /* @__PURE__ */ $(t);
  tt(n, "iterate", we);
  const i = n[e](...s);
  return (i === -1 || i === !1) && /* @__PURE__ */ Bs(s[0]) ? (s[0] = /* @__PURE__ */ $(s[0]), n[e](...s)) : i;
}
function ue(t, e, s = []) {
  Ft(), $s();
  const n = (/* @__PURE__ */ $(t))[e].apply(t, s);
  return Ns(), Dt(), n;
}
const ur = /* @__PURE__ */ Ds("__proto__,__v_isRef,__isVue"), Zn = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((t) => t !== "arguments" && t !== "caller").map((t) => Symbol[t]).filter(Ot)
);
function ar(t) {
  Ot(t) || (t = String(t));
  const e = /* @__PURE__ */ $(this);
  return tt(e, "has", t), e.hasOwnProperty(t);
}
class Qn {
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
      return n === (i ? r ? xr : ni : r ? si : ei).get(e) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(e) === Object.getPrototypeOf(n) ? e : void 0;
    const o = P(e);
    if (!i) {
      let f;
      if (o && (f = cr[s]))
        return f;
      if (s === "hasOwnProperty")
        return ar;
    }
    const l = Reflect.get(
      e,
      s,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      /* @__PURE__ */ rt(e) ? e : n
    );
    if ((Ot(s) ? Zn.has(s) : ur(s)) || (i || tt(e, "get", s), r))
      return l;
    if (/* @__PURE__ */ rt(l)) {
      const f = o && js(s) ? l : l.value;
      return i && V(f) ? /* @__PURE__ */ Be(f) : f;
    }
    return V(l) ? i ? /* @__PURE__ */ Be(l) : /* @__PURE__ */ is(l) : l;
  }
}
class ti extends Qn {
  constructor(e = !1) {
    super(!1, e);
  }
  set(e, s, n, i) {
    let r = e[s];
    const o = P(e) && js(s);
    if (!this._isShallow) {
      const p = /* @__PURE__ */ Yt(r);
      if (!/* @__PURE__ */ Et(n) && !/* @__PURE__ */ Yt(n) && (r = /* @__PURE__ */ $(r), n = /* @__PURE__ */ $(n)), !o && /* @__PURE__ */ rt(r) && !/* @__PURE__ */ rt(n))
        return p || (r.value = n), !0;
    }
    const l = o ? Number(s) < e.length : L(e, s), f = Reflect.set(
      e,
      s,
      n,
      /* @__PURE__ */ rt(e) ? e : i
    );
    return e === /* @__PURE__ */ $(i) && f && (l ? It(n, r) && Rt(e, "set", s, n) : Rt(e, "add", s, n)), f;
  }
  deleteProperty(e, s) {
    const n = L(e, s);
    e[s];
    const i = Reflect.deleteProperty(e, s);
    return i && n && Rt(e, "delete", s, void 0), i;
  }
  has(e, s) {
    const n = Reflect.has(e, s);
    return (!Ot(s) || !Zn.has(s)) && tt(e, "has", s), n;
  }
  ownKeys(e) {
    return tt(
      e,
      "iterate",
      P(e) ? "length" : Jt
    ), Reflect.ownKeys(e);
  }
}
class dr extends Qn {
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
const pr = /* @__PURE__ */ new ti(), hr = /* @__PURE__ */ new dr(), gr = /* @__PURE__ */ new ti(!0);
const As = (t) => t, je = (t) => Reflect.getPrototypeOf(t);
function br(t, e, s) {
  return function(...n) {
    const i = this.__v_raw, r = /* @__PURE__ */ $(i), o = Nt(r), l = t === "entries" || t === Symbol.iterator && o, f = t === "keys" && o, p = i[t](...n), a = s ? As : e ? Se : zt;
    return !e && tt(
      r,
      "iterate",
      f ? Os : Jt
    ), Q(
      // inheriting all iterator properties
      Object.create(p),
      {
        // iterator protocol
        next() {
          const { value: h, done: S } = p.next();
          return S ? { value: h, done: S } : {
            value: l ? [a(h[0]), a(h[1])] : a(h),
            done: S
          };
        }
      }
    );
  };
}
function He(t) {
  return function(...e) {
    return t === "delete" ? !1 : t === "clear" ? void 0 : this;
  };
}
function mr(t, e) {
  const s = {
    get(i) {
      const r = this.__v_raw, o = /* @__PURE__ */ $(r), l = /* @__PURE__ */ $(i);
      t || (It(i, l) && tt(o, "get", i), tt(o, "get", l));
      const { has: f } = je(o), p = e ? As : t ? Se : zt;
      if (f.call(o, i))
        return p(r.get(i));
      if (f.call(o, l))
        return p(r.get(l));
      r !== o && r.get(i);
    },
    get size() {
      const i = this.__v_raw;
      return !t && tt(/* @__PURE__ */ $(i), "iterate", Jt), i.size;
    },
    has(i) {
      const r = this.__v_raw, o = /* @__PURE__ */ $(r), l = /* @__PURE__ */ $(i);
      return t || (It(i, l) && tt(o, "has", i), tt(o, "has", l)), i === l ? r.has(i) : r.has(i) || r.has(l);
    },
    forEach(i, r) {
      const o = this, l = o.__v_raw, f = /* @__PURE__ */ $(l), p = e ? As : t ? Se : zt;
      return !t && tt(f, "iterate", Jt), l.forEach((a, h) => i.call(r, p(a), p(h), o));
    }
  };
  return Q(
    s,
    t ? {
      add: He("add"),
      set: He("set"),
      delete: He("delete"),
      clear: He("clear")
    } : {
      add(i) {
        const r = /* @__PURE__ */ $(this), o = je(r), l = /* @__PURE__ */ $(i), f = !e && !/* @__PURE__ */ Et(i) && !/* @__PURE__ */ Yt(i) ? l : i;
        return o.has.call(r, f) || It(i, f) && o.has.call(r, i) || It(l, f) && o.has.call(r, l) || (r.add(f), Rt(r, "add", f, f)), this;
      },
      set(i, r) {
        !e && !/* @__PURE__ */ Et(r) && !/* @__PURE__ */ Yt(r) && (r = /* @__PURE__ */ $(r));
        const o = /* @__PURE__ */ $(this), { has: l, get: f } = je(o);
        let p = l.call(o, i);
        p || (i = /* @__PURE__ */ $(i), p = l.call(o, i));
        const a = f.call(o, i);
        return o.set(i, r), p ? It(r, a) && Rt(o, "set", i, r) : Rt(o, "add", i, r), this;
      },
      delete(i) {
        const r = /* @__PURE__ */ $(this), { has: o, get: l } = je(r);
        let f = o.call(r, i);
        f || (i = /* @__PURE__ */ $(i), f = o.call(r, i)), l && l.call(r, i);
        const p = r.delete(i);
        return f && Rt(r, "delete", i, void 0), p;
      },
      clear() {
        const i = /* @__PURE__ */ $(this), r = i.size !== 0, o = i.clear();
        return r && Rt(
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
    s[i] = br(i, t, e);
  }), s;
}
function Ks(t, e) {
  const s = mr(t, e);
  return (n, i, r) => i === "__v_isReactive" ? !t : i === "__v_isReadonly" ? t : i === "__v_raw" ? n : Reflect.get(
    L(s, i) && i in n ? s : n,
    i,
    r
  );
}
const vr = {
  get: /* @__PURE__ */ Ks(!1, !1)
}, _r = {
  get: /* @__PURE__ */ Ks(!1, !0)
}, yr = {
  get: /* @__PURE__ */ Ks(!0, !1)
};
const ei = /* @__PURE__ */ new WeakMap(), si = /* @__PURE__ */ new WeakMap(), ni = /* @__PURE__ */ new WeakMap(), xr = /* @__PURE__ */ new WeakMap();
function wr(t) {
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
function is(t) {
  return /* @__PURE__ */ Yt(t) ? t : Ws(
    t,
    !1,
    pr,
    vr,
    ei
  );
}
// @__NO_SIDE_EFFECTS__
function Sr(t) {
  return Ws(
    t,
    !1,
    gr,
    _r,
    si
  );
}
// @__NO_SIDE_EFFECTS__
function Be(t) {
  return Ws(
    t,
    !0,
    hr,
    yr,
    ni
  );
}
function Ws(t, e, s, n, i) {
  if (!V(t) || t.__v_raw && !(e && t.__v_isReactive) || t.__v_skip || !Object.isExtensible(t))
    return t;
  const r = i.get(t);
  if (r)
    return r;
  const o = wr(Ji(t));
  if (o === 0)
    return t;
  const l = new Proxy(
    t,
    o === 2 ? n : s
  );
  return i.set(t, l), l;
}
// @__NO_SIDE_EFFECTS__
function se(t) {
  return /* @__PURE__ */ Yt(t) ? /* @__PURE__ */ se(t.__v_raw) : !!(t && t.__v_isReactive);
}
// @__NO_SIDE_EFFECTS__
function Yt(t) {
  return !!(t && t.__v_isReadonly);
}
// @__NO_SIDE_EFFECTS__
function Et(t) {
  return !!(t && t.__v_isShallow);
}
// @__NO_SIDE_EFFECTS__
function Bs(t) {
  return t ? !!t.__v_raw : !1;
}
// @__NO_SIDE_EFFECTS__
function $(t) {
  const e = t && t.__v_raw;
  return e ? /* @__PURE__ */ $(e) : t;
}
function Cr(t) {
  return !L(t, "__v_skip") && Object.isExtensible(t) && Nn(t, "__v_skip", !0), t;
}
const zt = (t) => V(t) ? /* @__PURE__ */ is(t) : t, Se = (t) => V(t) ? /* @__PURE__ */ Be(t) : t;
// @__NO_SIDE_EFFECTS__
function rt(t) {
  return t ? t.__v_isRef === !0 : !1;
}
function kt(t) {
  return /* @__PURE__ */ rt(t) ? t.value : t;
}
const Tr = {
  get: (t, e, s) => e === "__v_raw" ? t : kt(Reflect.get(t, e, s)),
  set: (t, e, s, n) => {
    const i = t[e];
    return /* @__PURE__ */ rt(i) && !/* @__PURE__ */ rt(s) ? (i.value = s, !0) : Reflect.set(t, e, s, n);
  }
};
function ii(t) {
  return /* @__PURE__ */ se(t) ? t : new Proxy(t, Tr);
}
class Er {
  constructor(e, s, n) {
    this.fn = e, this.setter = s, this._value = void 0, this.dep = new zn(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = xe - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !s, this.isSSR = n;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    K !== this)
      return kn(this, !0), !0;
  }
  get value() {
    const e = this.dep.track();
    return Gn(this), e && (e.version = this.dep.version), this._value;
  }
  set value(e) {
    this.setter && this.setter(e);
  }
}
// @__NO_SIDE_EFFECTS__
function Or(t, e, s = !1) {
  let n, i;
  return I(t) ? n = t : (n = t.get, i = t.set), new Er(n, i, s);
}
const $e = {}, ke = /* @__PURE__ */ new WeakMap();
let qt;
function Ar(t, e = !1, s = qt) {
  if (s) {
    let n = ke.get(s);
    n || ke.set(s, n = []), n.push(t);
  }
}
function Mr(t, e, s = W) {
  const { immediate: n, deep: i, once: r, scheduler: o, augmentJob: l, call: f } = s, p = (A) => i ? A : /* @__PURE__ */ Et(A) || i === !1 || i === 0 ? $t(A, 1) : $t(A);
  let a, h, S, C, D = !1, T = !1;
  if (/* @__PURE__ */ rt(t) ? (h = () => t.value, D = /* @__PURE__ */ Et(t)) : /* @__PURE__ */ se(t) ? (h = () => p(t), D = !0) : P(t) ? (T = !0, D = t.some((A) => /* @__PURE__ */ se(A) || /* @__PURE__ */ Et(A)), h = () => t.map((A) => {
    if (/* @__PURE__ */ rt(A))
      return A.value;
    if (/* @__PURE__ */ se(A))
      return p(A);
    if (I(A))
      return f ? f(A, 2) : A();
  })) : I(t) ? e ? h = f ? () => f(t, 2) : t : h = () => {
    if (S) {
      Ft();
      try {
        S();
      } finally {
        Dt();
      }
    }
    const A = qt;
    qt = a;
    try {
      return f ? f(t, 3, [C]) : t(C);
    } finally {
      qt = A;
    }
  } : h = Tt, e && i) {
    const A = h, Y = i === !0 ? 1 / 0 : i;
    h = () => $t(A(), Y);
  }
  const B = rr(), k = () => {
    a.stop(), B && B.active && Ls(B.effects, a);
  };
  if (r && e) {
    const A = e;
    e = (...Y) => {
      const pt = A(...Y);
      return k(), pt;
    };
  }
  let F = T ? new Array(t.length).fill($e) : $e;
  const j = (A) => {
    if (!(!(a.flags & 1) || !a.dirty && !A))
      if (e) {
        const Y = a.run();
        if (A || i || D || (T ? Y.some((pt, ht) => It(pt, F[ht])) : It(Y, F))) {
          S && S();
          const pt = qt;
          qt = a;
          try {
            const ht = [
              Y,
              // pass undefined as the old value when it's changed for the first time
              F === $e ? void 0 : T && F[0] === $e ? [] : F,
              C
            ];
            F = Y, f ? f(e, 3, ht) : (
              // @ts-expect-error
              e(...ht)
            );
          } finally {
            qt = pt;
          }
        }
      } else
        a.run();
  };
  return l && l(j), a = new Wn(h), a.scheduler = o ? () => o(j, !1) : j, C = (A) => Ar(A, !1, a), S = a.onStop = () => {
    const A = ke.get(a);
    if (A) {
      if (f)
        f(A, 4);
      else
        for (const Y of A) Y();
      ke.delete(a);
    }
  }, e ? n ? j(!0) : F = a.run() : o ? o(j.bind(null, !0), !0) : a.run(), k.pause = a.pause.bind(a), k.resume = a.resume.bind(a), k.stop = k, k;
}
function $t(t, e = 1 / 0, s) {
  if (e <= 0 || !V(t) || t.__v_skip || (s = s || /* @__PURE__ */ new Map(), (s.get(t) || 0) >= e))
    return t;
  if (s.set(t, e), e--, /* @__PURE__ */ rt(t))
    $t(t.value, e, s);
  else if (P(t))
    for (let n = 0; n < t.length; n++)
      $t(t[n], e, s);
  else if (We(t) || Nt(t))
    t.forEach((n) => {
      $t(n, e, s);
    });
  else if (Hn(t)) {
    for (const n in t)
      $t(t[n], e, s);
    for (const n of Object.getOwnPropertySymbols(t))
      Object.prototype.propertyIsEnumerable.call(t, n) && $t(t[n], e, s);
  }
  return t;
}
function Me(t, e, s, n) {
  try {
    return n ? t(...n) : t();
  } catch (i) {
    rs(i, e, s);
  }
}
function dt(t, e, s, n) {
  if (I(t)) {
    const i = Me(t, e, s, n);
    return i && Ln(i) && i.catch((r) => {
      rs(r, e, s);
    }), i;
  }
  if (P(t)) {
    const i = [];
    for (let r = 0; r < t.length; r++)
      i.push(dt(t[r], e, s, n));
    return i;
  }
}
function rs(t, e, s, n = !0) {
  const i = e ? e.vnode : null, { errorHandler: r, throwUnhandledErrorInProduction: o } = e && e.appContext.config || W;
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
      Ft(), Me(r, null, 10, [
        t,
        f,
        p
      ]), Dt();
      return;
    }
  }
  Pr(t, s, i, n, o);
}
function Pr(t, e, s, n = !0, i = !1) {
  if (i)
    throw t;
  console.error(t);
}
const nt = [];
let yt = -1;
const ne = [];
let Ht = null, te = 0;
const ri = /* @__PURE__ */ Promise.resolve();
let qe = null;
function oi(t) {
  const e = qe || ri;
  return t ? e.then(this ? t.bind(this) : t) : e;
}
function Ir(t) {
  let e = yt + 1, s = nt.length;
  for (; e < s; ) {
    const n = e + s >>> 1, i = nt[n], r = Ce(i);
    r < t || r === t && i.flags & 2 ? e = n + 1 : s = n;
  }
  return e;
}
function ks(t) {
  if (!(t.flags & 1)) {
    const e = Ce(t), s = nt[nt.length - 1];
    !s || // fast path when the job id is larger than the tail
    !(t.flags & 2) && e >= Ce(s) ? nt.push(t) : nt.splice(Ir(e), 0, t), t.flags |= 1, li();
  }
}
function li() {
  qe || (qe = ri.then(fi));
}
function Rr(t) {
  if (!P(t))
    Ht && t.id === -1 ? Ht.splice(te + 1, 0, t) : t.flags & 1 || (ne.push(t), t.flags |= 1);
  else
    for (let e = 0; e < t.length; e++)
      ne.push(t[e]);
  li();
}
function un(t, e, s = yt + 1) {
  for (; s < nt.length; s++) {
    const n = nt[s];
    if (n && n.flags & 2) {
      if (t && n.id !== t.uid)
        continue;
      nt.splice(s, 1), s--, n.flags & 4 && (n.flags &= -2), n(), n.flags & 4 || (n.flags &= -2);
    }
  }
}
function ci(t) {
  if (ne.length) {
    const e = [...new Set(ne)].sort(
      (s, n) => Ce(s) - Ce(n)
    );
    if (ne.length = 0, Ht) {
      for (let s = 0; s < e.length; s++)
        Ht.push(e[s]);
      return;
    }
    for (Ht = e, te = 0; te < Ht.length; te++) {
      const s = Ht[te];
      s.flags & 4 && (s.flags &= -2), s.flags & 8 || s(), s.flags &= -2;
    }
    Ht = null, te = 0;
  }
}
const Ce = (t) => t.id == null ? t.flags & 2 ? -1 : 1 / 0 : t.id;
function fi(t) {
  try {
    for (yt = 0; yt < nt.length; yt++) {
      const e = nt[yt];
      e && !(e.flags & 8) && (e.flags & 4 && (e.flags &= -2), Me(
        e,
        e.i,
        e.i ? 15 : 14
      ), e.flags & 4 || (e.flags &= -2));
    }
  } finally {
    for (; yt < nt.length; yt++) {
      const e = nt[yt];
      e && (e.flags &= -2);
    }
    yt = -1, nt.length = 0, ci(), qe = null, (nt.length || ne.length) && fi();
  }
}
let Ct = null, ui = null;
function Je(t) {
  const e = Ct;
  return Ct = t, ui = t && t.type.__scopeId || null, e;
}
function Fr(t, e = Ct, s) {
  if (!e || t._n)
    return t;
  const n = (...i) => {
    n._d && xn(-1);
    const r = Je(e), o = Gt.length;
    let l;
    try {
      l = t(...i);
    } finally {
      for (let f = Gt.length; f > o; f--) ji();
      Je(r), n._d && xn(1);
    }
    return l;
  };
  return n._n = !0, n._c = !0, n._d = !0, n;
}
function Wt(t, e, s, n) {
  const i = t.dirs, r = e && e.dirs;
  for (let o = 0; o < i.length; o++) {
    const l = i[o];
    r && (l.oldValue = r[o].value);
    let f = l.dir[n];
    f && (Ft(), dt(f, s, 8, [
      t.el,
      l,
      t,
      e
    ]), Dt());
  }
}
function Dr(t, e) {
  if (it) {
    let s = it.provides;
    const n = it.parent && it.parent.provides;
    n === s && (s = it.provides = Object.create(n)), s[t] = e;
  }
}
function Ve(t, e, s = !1) {
  const n = Do();
  if (n || ie) {
    let i = ie ? ie._context.provides : n ? n.parent == null || n.ce ? n.vnode.appContext && n.vnode.appContext.provides : n.parent.provides : void 0;
    if (i && t in i)
      return i[t];
    if (arguments.length > 1)
      return s && I(e) ? e.call(n && n.proxy) : e;
  }
}
const Lr = /* @__PURE__ */ Symbol.for("v-scx"), jr = () => Ve(Lr);
function vs(t, e, s) {
  return ai(t, e, s);
}
function ai(t, e, s = W) {
  const { immediate: n, deep: i, flush: r, once: o } = s, l = Q({}, s), f = e && n || !e && r !== "post";
  let p;
  if (Oe) {
    if (r === "sync") {
      const C = jr();
      p = C.__watcherHandles || (C.__watcherHandles = []);
    } else if (!f) {
      const C = () => {
      };
      return C.stop = Tt, C.resume = Tt, C.pause = Tt, C;
    }
  }
  const a = it;
  l.call = (C, D, T) => dt(C, a, D, T);
  let h = !1;
  r === "post" ? l.scheduler = (C) => {
    ot(C, a && a.suspense);
  } : r !== "sync" && (h = !0, l.scheduler = (C, D) => {
    D ? C() : ks(C);
  }), l.augmentJob = (C) => {
    e && (C.flags |= 4), h && (C.flags |= 2, a && (C.id = a.uid, C.i = a));
  };
  const S = Mr(t, e, l);
  return Oe && (p ? p.push(S) : f && S()), S;
}
function Hr(t, e, s) {
  const n = this.proxy, i = J(t) ? t.includes(".") ? di(n, t) : () => n[t] : t.bind(n, n);
  let r;
  I(e) ? r = e : (r = e.handler, s = e);
  const o = Pe(this), l = ai(i, r.bind(n), s);
  return o(), l;
}
function di(t, e) {
  const s = e.split(".");
  return () => {
    let n = t;
    for (let i = 0; i < s.length && n; i++)
      n = n[s[i]];
    return n;
  };
}
const $r = /* @__PURE__ */ Symbol("_vte"), os = (t) => t.__isTeleport, _s = /* @__PURE__ */ Symbol("_leaveCb");
function Nr(t) {
  let e = t[0];
  if (t.length > 1) {
    for (const s of t)
      if (s.type !== Xt) {
        e = s;
        break;
      }
  }
  return e;
}
function pi(t) {
  if (!Js(t))
    return os(t.type) && t.children ? Nr(t.children) : t;
  if (t.component)
    return t.component.subTree;
  const { shapeFlag: e, children: s } = t;
  if (s) {
    if (e & 16)
      return s[0];
    if (e & 32 && I(s.default))
      return s.default();
  }
}
function qs(t, e) {
  if (t.shapeFlag & 6 && t.component) {
    t.transition = e;
    const s = t.component.subTree;
    qs(
      os(s.type) && pi(s) || s,
      e
    );
  } else t.shapeFlag & 128 ? (t.ssContent.transition = e.clone(t.ssContent), t.ssFallback.transition = e.clone(t.ssFallback)) : t.transition = e;
}
// @__NO_SIDE_EFFECTS__
function hi(t, e) {
  return I(t) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    Q({ name: t.name }, e, { setup: t })
  ) : t;
}
function gi(t) {
  t.ids = [t.ids[0] + t.ids[2]++ + "-", 0, 0];
}
function an(t, e) {
  let s;
  return !!((s = Object.getOwnPropertyDescriptor(t, e)) && !s.configurable);
}
const Ge = /* @__PURE__ */ new WeakMap();
function me(t, e, s, n, i = !1) {
  if (P(t)) {
    t.forEach(
      (T, B) => me(
        T,
        e && (P(e) ? e[B] : e),
        s,
        n,
        i
      )
    );
    return;
  }
  if (ve(n) && !i) {
    n.shapeFlag & 512 && n.type.__asyncResolved && n.component.subTree.component && me(t, e, s, n.component.subTree);
    return;
  }
  const r = n.shapeFlag & 4 ? zs(n.component) : n.el, o = i ? null : r, { i: l, r: f } = t, p = e && e.r, a = l.refs === W ? l.refs = {} : l.refs, h = l.setupState, S = /* @__PURE__ */ $(h), C = h === W ? Dn : (T) => an(a, T) ? !1 : L(S, T), D = (T, B) => !(B && an(a, B));
  if (p != null && p !== f) {
    if (dn(e), J(p))
      a[p] = null, C(p) && (h[p] = null);
    else if (/* @__PURE__ */ rt(p)) {
      const T = e;
      D(p, T.k) && (p.value = null), T.k && (a[T.k] = null);
    }
  }
  if (I(f))
    Me(f, l, 12, [o, a]);
  else {
    const T = J(f), B = /* @__PURE__ */ rt(f);
    if (T || B) {
      const k = () => {
        if (t.f) {
          const F = T ? C(f) ? h[f] : a[f] : D() || !t.k ? f.value : a[t.k];
          if (i)
            P(F) && Ls(F, r);
          else if (P(F))
            F.includes(r) || F.push(r);
          else if (T)
            a[f] = [r], C(f) && (h[f] = a[f]);
          else {
            const j = [r];
            D(f, t.k) && (f.value = j), t.k && (a[t.k] = j);
          }
        } else T ? (a[f] = o, C(f) && (h[f] = o)) : B && (D(f, t.k) && (f.value = o), t.k && (a[t.k] = o));
      };
      if (o) {
        const F = () => {
          k(), Ge.delete(t);
        };
        F.id = -1, Ge.set(t, F), ot(F, s);
      } else
        dn(t), k();
    }
  }
}
function dn(t) {
  const e = Ge.get(t);
  e && (e.flags |= 8, Ge.delete(t));
}
es().requestIdleCallback;
es().cancelIdleCallback;
const ve = (t) => !!t.type.__asyncLoader, Js = (t) => t.type.__isKeepAlive;
function Vr(t, e) {
  bi(t, "a", e);
}
function Ur(t, e) {
  bi(t, "da", e);
}
function bi(t, e, s = it) {
  const n = t.__wdc || (t.__wdc = () => {
    let i = s;
    for (; i; ) {
      if (i.isDeactivated)
        return;
      i = i.parent;
    }
    return t();
  });
  if (ls(e, n, s), s) {
    let i = s.parent;
    for (; i && i.parent; )
      Js(i.parent.vnode) && Kr(n, e, s, i), i = i.parent;
  }
}
function Kr(t, e, s, n) {
  const i = ls(
    e,
    t,
    n,
    !0
    /* prepend */
  );
  mi(() => {
    Ls(n[e], i);
  }, s);
}
function ls(t, e, s = it, n = !1) {
  if (s) {
    const i = s[t] || (s[t] = []), r = e.__weh || (e.__weh = (...o) => {
      Ft();
      const l = Pe(s), f = dt(e, s, t, o);
      return l(), Dt(), f;
    });
    return n ? i.unshift(r) : i.push(r), r;
  }
}
const Lt = (t) => (e, s = it) => {
  (!Oe || t === "sp") && ls(t, (...n) => e(...n), s);
}, Wr = Lt("bm"), Br = Lt("m"), kr = Lt(
  "bu"
), qr = Lt("u"), Jr = Lt(
  "bum"
), mi = Lt("um"), Gr = Lt(
  "sp"
), Yr = Lt("rtg"), zr = Lt("rtc");
function Xr(t, e = it) {
  ls("ec", t, e);
}
const Zr = /* @__PURE__ */ Symbol.for("v-ndc"), Ms = (t) => t ? Vi(t) ? zs(t) : Ms(t.parent) : null, _e = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ Q(/* @__PURE__ */ Object.create(null), {
    $: (t) => t,
    $el: (t) => t.vnode.el,
    $data: (t) => t.data,
    $props: (t) => t.props,
    $attrs: (t) => t.attrs,
    $slots: (t) => t.slots,
    $refs: (t) => t.refs,
    $parent: (t) => Ms(t.parent),
    $root: (t) => Ms(t.root),
    $host: (t) => t.ce,
    $emit: (t) => t.emit,
    $options: (t) => _i(t),
    $forceUpdate: (t) => t.f || (t.f = () => {
      ks(t.update);
    }),
    $nextTick: (t) => t.n || (t.n = oi.bind(t.proxy)),
    $watch: (t) => Hr.bind(t)
  })
), ys = (t, e) => t !== W && !t.__isScriptSetup && L(t, e), Qr = {
  get({ _: t }, e) {
    if (e === "__v_skip")
      return !0;
    const { ctx: s, setupState: n, data: i, props: r, accessCache: o, type: l, appContext: f } = t;
    if (e[0] !== "$") {
      const S = o[e];
      if (S !== void 0)
        switch (S) {
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
        if (ys(n, e))
          return o[e] = 1, n[e];
        if (i !== W && L(i, e))
          return o[e] = 2, i[e];
        if (L(r, e))
          return o[e] = 3, r[e];
        if (s !== W && L(s, e))
          return o[e] = 4, s[e];
        Ps && (o[e] = 0);
      }
    }
    const p = _e[e];
    let a, h;
    if (p)
      return e === "$attrs" && tt(t.attrs, "get", ""), p(t);
    if (
      // css module (injected by vue-loader)
      (a = l.__cssModules) && (a = a[e])
    )
      return a;
    if (s !== W && L(s, e))
      return o[e] = 4, s[e];
    if (
      // global properties
      h = f.config.globalProperties, L(h, e)
    )
      return h[e];
  },
  set({ _: t }, e, s) {
    const { data: n, setupState: i, ctx: r } = t;
    return ys(i, e) ? (i[e] = s, !0) : n !== W && L(n, e) ? (n[e] = s, !0) : L(t.props, e) || e[0] === "$" && e.slice(1) in t ? !1 : (r[e] = s, !0);
  },
  has({
    _: { data: t, setupState: e, accessCache: s, ctx: n, appContext: i, props: r, type: o }
  }, l) {
    let f;
    return !!(s[l] || t !== W && l[0] !== "$" && L(t, l) || ys(e, l) || L(r, l) || L(n, l) || L(_e, l) || L(i.config.globalProperties, l) || (f = o.__cssModules) && f[l]);
  },
  defineProperty(t, e, s) {
    return s.get != null ? t._.accessCache[e] = 0 : L(s, "value") && this.set(t, e, s.value, null), Reflect.defineProperty(t, e, s);
  }
};
function pn(t) {
  return P(t) ? t.reduce(
    (e, s) => (e[s] = null, e),
    {}
  ) : t;
}
let Ps = !0;
function to(t) {
  const e = _i(t), s = t.proxy, n = t.ctx;
  Ps = !1, e.beforeCreate && hn(e.beforeCreate, t, "bc");
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
    mounted: S,
    beforeUpdate: C,
    updated: D,
    activated: T,
    deactivated: B,
    beforeDestroy: k,
    beforeUnmount: F,
    destroyed: j,
    unmounted: A,
    render: Y,
    renderTracked: pt,
    renderTriggered: ht,
    errorCaptured: jt,
    serverPrefetch: Ie,
    // public API
    expose: Vt,
    inheritAttrs: oe,
    // assets
    components: Re,
    directives: Fe,
    filters: us
  } = e;
  if (p && eo(p, n, null), o)
    for (const q in o) {
      const U = o[q];
      I(U) && (n[q] = U.bind(s));
    }
  if (i) {
    const q = i.call(s, s);
    V(q) && (t.data = /* @__PURE__ */ is(q));
  }
  if (Ps = !0, r)
    for (const q in r) {
      const U = r[q], Ut = I(U) ? U.bind(s, s) : I(U.get) ? U.get.bind(s, s) : Tt, De = !I(U) && I(U.set) ? U.set.bind(s) : Tt, Kt = Xs({
        get: Ut,
        set: De
      });
      Object.defineProperty(n, q, {
        enumerable: !0,
        configurable: !0,
        get: () => Kt.value,
        set: (gt) => Kt.value = gt
      });
    }
  if (l)
    for (const q in l)
      vi(l[q], n, s, q);
  if (f) {
    const q = I(f) ? f.call(s) : f;
    Reflect.ownKeys(q).forEach((U) => {
      Dr(U, q[U]);
    });
  }
  a && hn(a, t, "c");
  function et(q, U) {
    P(U) ? U.forEach((Ut) => q(Ut.bind(s))) : U && q(U.bind(s));
  }
  if (et(Wr, h), et(Br, S), et(kr, C), et(qr, D), et(Vr, T), et(Ur, B), et(Xr, jt), et(zr, pt), et(Yr, ht), et(Jr, F), et(mi, A), et(Gr, Ie), P(Vt))
    if (Vt.length) {
      const q = t.exposed || (t.exposed = {});
      Vt.forEach((U) => {
        Object.defineProperty(q, U, {
          get: () => s[U],
          set: (Ut) => s[U] = Ut,
          enumerable: !0
        });
      });
    } else t.exposed || (t.exposed = {});
  Y && t.render === Tt && (t.render = Y), oe != null && (t.inheritAttrs = oe), Re && (t.components = Re), Fe && (t.directives = Fe), Ie && gi(t);
}
function eo(t, e, s = Tt) {
  P(t) && (t = Is(t));
  for (const n in t) {
    const i = t[n];
    let r;
    V(i) ? "default" in i ? r = Ve(
      i.from || n,
      i.default,
      !0
    ) : r = Ve(i.from || n) : r = Ve(i), /* @__PURE__ */ rt(r) ? Object.defineProperty(e, n, {
      enumerable: !0,
      configurable: !0,
      get: () => r.value,
      set: (o) => r.value = o
    }) : e[n] = r;
  }
}
function hn(t, e, s) {
  dt(
    P(t) ? t.map((n) => n.bind(e.proxy)) : t.bind(e.proxy),
    e,
    s
  );
}
function vi(t, e, s, n) {
  let i = n.includes(".") ? di(s, n) : () => s[n];
  if (J(t)) {
    const r = e[t];
    I(r) && vs(i, r);
  } else if (I(t))
    vs(i, t.bind(s));
  else if (V(t))
    if (P(t))
      t.forEach((r) => vi(r, e, s, n));
    else {
      const r = I(t.handler) ? t.handler.bind(s) : e[t.handler];
      I(r) && vs(i, r, t);
    }
}
function _i(t) {
  const e = t.type, { mixins: s, extends: n } = e, {
    mixins: i,
    optionsCache: r,
    config: { optionMergeStrategies: o }
  } = t.appContext, l = r.get(e);
  let f;
  return l ? f = l : !i.length && !s && !n ? f = e : (f = {}, i.length && i.forEach(
    (p) => Ye(f, p, o, !0)
  ), Ye(f, e, o)), V(e) && r.set(e, f), f;
}
function Ye(t, e, s, n = !1) {
  const { mixins: i, extends: r } = e;
  r && Ye(t, r, s, !0), i && i.forEach(
    (o) => Ye(t, o, s, !0)
  );
  for (const o in e)
    if (!(n && o === "expose")) {
      const l = so[o] || s && s[o];
      t[o] = l ? l(t[o], e[o]) : e[o];
    }
  return t;
}
const so = {
  data: gn,
  props: bn,
  emits: bn,
  // objects
  methods: de,
  computed: de,
  // lifecycle
  beforeCreate: st,
  created: st,
  beforeMount: st,
  mounted: st,
  beforeUpdate: st,
  updated: st,
  beforeDestroy: st,
  beforeUnmount: st,
  destroyed: st,
  unmounted: st,
  activated: st,
  deactivated: st,
  errorCaptured: st,
  serverPrefetch: st,
  // assets
  components: de,
  directives: de,
  // watch
  watch: io,
  // provide / inject
  provide: gn,
  inject: no
};
function gn(t, e) {
  return e ? t ? function() {
    return Q(
      I(t) ? t.call(this, this) : t,
      I(e) ? e.call(this, this) : e
    );
  } : e : t;
}
function no(t, e) {
  return de(Is(t), Is(e));
}
function Is(t) {
  if (P(t)) {
    const e = {};
    for (let s = 0; s < t.length; s++)
      e[t[s]] = t[s];
    return e;
  }
  return t;
}
function st(t, e) {
  return t ? [...new Set([].concat(t, e))] : e;
}
function de(t, e) {
  return t ? Q(/* @__PURE__ */ Object.create(null), t, e) : e;
}
function bn(t, e) {
  return t ? P(t) && P(e) ? [.../* @__PURE__ */ new Set([...t, ...e])] : Q(
    /* @__PURE__ */ Object.create(null),
    pn(t),
    pn(e ?? {})
  ) : e;
}
function io(t, e) {
  if (!t) return e;
  if (!e) return t;
  const s = Q(/* @__PURE__ */ Object.create(null), t);
  for (const n in e)
    s[n] = st(t[n], e[n]);
  return s;
}
function yi() {
  return {
    app: null,
    config: {
      isNativeTag: Dn,
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
let ro = 0;
function oo(t, e) {
  return function(n, i = null) {
    I(n) || (n = Q({}, n)), i != null && !V(i) && (i = null);
    const r = yi(), o = /* @__PURE__ */ new WeakSet(), l = [];
    let f = !1;
    const p = r.app = {
      _uid: ro++,
      _component: n,
      _props: i,
      _container: null,
      _context: r,
      _instance: null,
      version: Vo,
      get config() {
        return r.config;
      },
      set config(a) {
      },
      use(a, ...h) {
        return o.has(a) || (a && I(a.install) ? (o.add(a), a.install(p, ...h)) : I(a) && (o.add(a), a(p, ...h))), p;
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
      mount(a, h, S) {
        if (!f) {
          const C = p._ceVNode || at(n, i);
          return C.appContext = r, S === !0 ? S = "svg" : S === !1 && (S = void 0), t(C, a, S), f = !0, p._container = a, a.__vue_app__ = p, zs(C.component);
        }
      },
      onUnmount(a) {
        l.push(a);
      },
      unmount() {
        f && (dt(
          l,
          p._instance,
          16
        ), t(null, p._container), delete p._container.__vue_app__);
      },
      provide(a, h) {
        return r.provides[a] = h, p;
      },
      runWithContext(a) {
        const h = ie;
        ie = p;
        try {
          return a();
        } finally {
          ie = h;
        }
      }
    };
    return p;
  };
}
let ie = null;
const lo = (t, e) => e === "modelValue" || e === "model-value" ? t.modelModifiers : t[`${e}Modifiers`] || t[`${ft(e)}Modifiers`] || t[`${Zt(e)}Modifiers`];
function co(t, e, ...s) {
  if (t.isUnmounted) return;
  const n = t.vnode.props || W;
  let i = s;
  const r = e.startsWith("update:"), o = r && lo(n, e.slice(7));
  o && (o.trim && (i = s.map((a) => J(a) ? a.trim() : a)), o.number && (i = i.map(zi)));
  let l, f = n[l = ds(e)] || // also try camelCase event handler (#2249)
  n[l = ds(ft(e))];
  !f && r && (f = n[l = ds(Zt(e))]), f && dt(
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
    t.emitted[l] = !0, dt(
      p,
      t,
      6,
      i
    );
  }
}
const fo = /* @__PURE__ */ new WeakMap();
function xi(t, e, s = !1) {
  const n = s ? fo : e.emitsCache, i = n.get(t);
  if (i !== void 0)
    return i;
  const r = t.emits;
  let o = {}, l = !1;
  if (!I(t)) {
    const f = (p) => {
      const a = xi(p, e, !0);
      a && (l = !0, Q(o, a));
    };
    !s && e.mixins.length && e.mixins.forEach(f), t.extends && f(t.extends), t.mixins && t.mixins.forEach(f);
  }
  return !r && !l ? (V(t) && n.set(t, null), null) : (P(r) ? r.forEach((f) => o[f] = null) : Q(o, r), V(t) && n.set(t, o), o);
}
function cs(t, e) {
  return !t || !Ze(e) ? !1 : (e = e.slice(2), e = e === "Once" ? e : e.replace(/Once$/, ""), L(t, e[0].toLowerCase() + e.slice(1)) || L(t, Zt(e)) || L(t, e));
}
function mn(t) {
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
    data: S,
    setupState: C,
    ctx: D,
    inheritAttrs: T
  } = t, B = Je(t);
  let k, F;
  try {
    if (s.shapeFlag & 4) {
      const A = i || n, Y = A;
      k = St(
        p.call(
          Y,
          A,
          a,
          h,
          C,
          S,
          D
        )
      ), F = l;
    } else {
      const A = e;
      k = St(
        A.length > 1 ? A(
          h,
          { attrs: l, slots: o, emit: f }
        ) : A(
          h,
          null
        )
      ), F = e.props ? l : uo(l);
    }
  } catch (A) {
    Gt.length = 0, rs(A, t, 1), k = at(Xt);
  }
  let j = k;
  if (F && T !== !1) {
    const A = Object.keys(F), { shapeFlag: Y } = j;
    A.length && Y & 7 && (r && A.some(Qe) && (F = ao(
      F,
      r
    )), j = re(j, F, !1, !0));
  }
  if (s.dirs && (j = re(j, null, !1, !0), j.dirs = j.dirs ? j.dirs.concat(s.dirs) : s.dirs), s.transition) {
    const A = os(j.type) && pi(j) || j;
    qs(A, s.transition);
  }
  return k = j, Je(B), k;
}
const uo = (t) => {
  let e;
  for (const s in t)
    (s === "class" || s === "style" || Ze(s)) && ((e || (e = {}))[s] = t[s]);
  return e;
}, ao = (t, e) => {
  const s = {};
  for (const n in t)
    (!Qe(n) || !(n.slice(9) in e)) && (s[n] = t[n]);
  return s;
};
function po(t, e, s) {
  const { props: n, children: i, component: r } = t, { props: o, children: l, patchFlag: f } = e, p = r.emitsOptions;
  if (e.dirs || e.transition)
    return !0;
  if (s && f >= 0) {
    if (f & 1024)
      return !0;
    if (f & 16)
      return n ? vn(n, o, p) : !!o;
    if (f & 8) {
      const a = e.dynamicProps;
      for (let h = 0; h < a.length; h++) {
        const S = a[h];
        if (wi(o, n, S) && !cs(p, S))
          return !0;
      }
    }
  } else
    return (i || l) && (!l || !l.$stable) ? !0 : n === o ? !1 : n ? o ? vn(n, o, p) : !0 : !!o;
  return !1;
}
function vn(t, e, s) {
  const n = Object.keys(e);
  if (n.length !== Object.keys(t).length)
    return !0;
  for (let i = 0; i < n.length; i++) {
    const r = n[i];
    if (wi(e, t, r) && !cs(s, r))
      return !0;
  }
  return !1;
}
function wi(t, e, s) {
  const n = t[s], i = e[s];
  return s === "style" && V(n) && V(i) ? !ns(n, i) : n !== i;
}
function ho({ vnode: t, parent: e, suspense: s }, n) {
  for (; e; ) {
    const i = e.subTree;
    if (i.suspense && i.suspense.activeBranch === t && (i.suspense.vnode.el = i.el = n, t = i), i === t)
      (t = e.vnode).el = n, e = e.parent;
    else
      break;
  }
  s && s.activeBranch === t && (s.vnode.el = n);
}
const Si = {}, Ci = () => Object.create(Si), Ti = (t) => Object.getPrototypeOf(t) === Si;
function go(t, e, s, n = !1) {
  const i = {}, r = Ci();
  t.propsDefaults = /* @__PURE__ */ Object.create(null), Ei(t, e, i, r);
  for (const o in t.propsOptions[0])
    o in i || (i[o] = void 0);
  s ? t.props = n ? i : /* @__PURE__ */ Sr(i) : t.type.props ? t.props = i : t.props = r, t.attrs = r;
}
function bo(t, e, s, n) {
  const {
    props: i,
    attrs: r,
    vnode: { patchFlag: o }
  } = t, l = /* @__PURE__ */ $(i), [f] = t.propsOptions;
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
        let S = a[h];
        if (cs(t.emitsOptions, S))
          continue;
        const C = e[S];
        if (f)
          if (L(r, S))
            C !== r[S] && (r[S] = C, p = !0);
          else {
            const D = ft(S);
            i[D] = Rs(
              f,
              l,
              D,
              C,
              t,
              !1
            );
          }
        else
          C !== r[S] && (r[S] = C, p = !0);
      }
    }
  } else {
    Ei(t, e, i, r) && (p = !0);
    let a;
    for (const h in l)
      (!e || // for camelCase
      !L(e, h) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((a = Zt(h)) === h || !L(e, a))) && (f ? s && // for camelCase
      (s[h] !== void 0 || // for kebab-case
      s[a] !== void 0) && (i[h] = Rs(
        f,
        l,
        h,
        void 0,
        t,
        !0
      )) : delete i[h]);
    if (r !== l)
      for (const h in r)
        (!e || !L(e, h)) && (delete r[h], p = !0);
  }
  p && Rt(t.attrs, "set", "");
}
function Ei(t, e, s, n) {
  const [i, r] = t.propsOptions;
  let o = !1, l;
  if (e)
    for (let f in e) {
      if (he(f))
        continue;
      const p = e[f];
      let a;
      i && L(i, a = ft(f)) ? !r || !r.includes(a) ? s[a] = p : (l || (l = {}))[a] = p : cs(t.emitsOptions, f) || (!(f in n) || p !== n[f]) && (n[f] = p, o = !0);
    }
  if (r) {
    const f = /* @__PURE__ */ $(s), p = l || W;
    for (let a = 0; a < r.length; a++) {
      const h = r[a];
      s[h] = Rs(
        i,
        f,
        h,
        p[h],
        t,
        !L(p, h)
      );
    }
  }
  return o;
}
function Rs(t, e, s, n, i, r) {
  const o = t[s];
  if (o != null) {
    const l = L(o, "default");
    if (l && n === void 0) {
      const f = o.default;
      if (o.type !== Function && !o.skipFactory && I(f)) {
        const { propsDefaults: p } = i;
        if (s in p)
          n = p[s];
        else {
          const a = Pe(i);
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
    ] && (n === "" || n === Zt(s)) && (n = !0));
  }
  return n;
}
const mo = /* @__PURE__ */ new WeakMap();
function Oi(t, e, s = !1) {
  const n = s ? mo : e.propsCache, i = n.get(t);
  if (i)
    return i;
  const r = t.props, o = {}, l = [];
  let f = !1;
  if (!I(t)) {
    const a = (h) => {
      f = !0;
      const [S, C] = Oi(h, e, !0);
      Q(o, S), C && l.push(...C);
    };
    !s && e.mixins.length && e.mixins.forEach(a), t.extends && a(t.extends), t.mixins && t.mixins.forEach(a);
  }
  if (!r && !f)
    return V(t) && n.set(t, ee), ee;
  if (P(r))
    for (let a = 0; a < r.length; a++) {
      const h = ft(r[a]);
      _n(h) && (o[h] = W);
    }
  else if (r)
    for (const a in r) {
      const h = ft(a);
      if (_n(h)) {
        const S = r[a], C = o[h] = P(S) || I(S) ? { type: S } : Q({}, S), D = C.type;
        let T = !1, B = !0;
        if (P(D))
          for (let k = 0; k < D.length; ++k) {
            const F = D[k], j = I(F) && F.name;
            if (j === "Boolean") {
              T = !0;
              break;
            } else j === "String" && (B = !1);
          }
        else
          T = I(D) && D.name === "Boolean";
        C[
          0
          /* shouldCast */
        ] = T, C[
          1
          /* shouldCastTrue */
        ] = B, (T || L(C, "default")) && l.push(h);
      }
    }
  const p = [o, l];
  return V(t) && n.set(t, p), p;
}
function _n(t) {
  return t[0] !== "$" && !he(t);
}
const Gs = (t) => t === "_" || t === "_ctx" || t === "$stable", Ys = (t) => P(t) ? t.map(St) : [St(t)], vo = (t, e, s) => {
  if (e._n)
    return e;
  const n = Fr((...i) => Ys(e(...i)), s);
  return n._c = !1, n;
}, Ai = (t, e, s) => {
  const n = t._ctx;
  for (const i in t) {
    if (Gs(i)) continue;
    const r = t[i];
    if (I(r))
      e[i] = vo(i, r, n);
    else if (r != null) {
      const o = Ys(r);
      e[i] = () => o;
    }
  }
}, Mi = (t, e) => {
  const s = Ys(e);
  t.slots.default = () => s;
}, Pi = (t, e, s) => {
  for (const n in e)
    (s || !Gs(n)) && (t[n] = e[n]);
}, _o = (t, e, s) => {
  const n = t.slots = Ci();
  if (t.vnode.shapeFlag & 32) {
    const i = e._;
    i ? (Pi(n, e, s), s && Nn(n, "_", i, !0)) : Ai(e, n);
  } else e && Mi(t, e);
}, yo = (t, e, s) => {
  const { vnode: n, slots: i } = t;
  let r = !0, o = W;
  if (n.shapeFlag & 32) {
    const l = e._;
    l ? s && l === 1 ? r = !1 : Pi(i, e, s) : (r = !e.$stable, Ai(e, i)), o = e;
  } else e && (Mi(t, e), o = { default: 1 });
  if (r)
    for (const l in i)
      !Gs(l) && o[l] == null && delete i[l];
}, ot = To;
function xo(t) {
  return wo(t);
}
function wo(t, e) {
  const s = es();
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
    nextSibling: S,
    setScopeId: C = Tt,
    insertStaticContent: D
  } = t, T = (c, u, d, v = null, m = null, g = null, x = void 0, y = null, _ = !!u.dynamicChildren) => {
    if (c === u)
      return;
    c && !ae(c, u) && (v = Le(c), gt(c, m, g, !0), c = null), u.patchFlag === -2 && (_ = !1, u.dynamicChildren = null);
    const { type: b, ref: O, shapeFlag: w } = u;
    switch (b) {
      case fs:
        B(c, u, d, v);
        break;
      case Xt:
        k(c, u, d, v);
        break;
      case Ue:
        c == null && F(u, d, v, x);
        break;
      case wt:
        Re(
          c,
          u,
          d,
          v,
          m,
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
          v,
          m,
          g,
          x,
          y,
          _
        ) : w & 6 ? Fe(
          c,
          u,
          d,
          v,
          m,
          g,
          x,
          y,
          _
        ) : (w & 64 || w & 128) && b.process(
          c,
          u,
          d,
          v,
          m,
          g,
          x,
          y,
          _,
          ce
        );
    }
    O != null && m ? me(O, c && c.ref, g, u || c, !u) : O == null && c && c.ref != null && me(c.ref, null, g, c, !0);
  }, B = (c, u, d, v) => {
    if (c == null)
      n(
        u.el = l(u.children),
        d,
        v
      );
    else {
      const m = u.el = c.el;
      u.children !== c.children && p(m, u.children);
    }
  }, k = (c, u, d, v) => {
    c == null ? n(
      u.el = f(u.children || ""),
      d,
      v
    ) : u.el = c.el;
  }, F = (c, u, d, v) => {
    [c.el, c.anchor] = D(
      c.children,
      u,
      d,
      v,
      c.el,
      c.anchor
    );
  }, j = ({ el: c, anchor: u }, d, v) => {
    let m;
    for (; c && c !== u; )
      m = S(c), n(c, d, v), c = m;
    n(u, d, v);
  }, A = ({ el: c, anchor: u }) => {
    let d;
    for (; c && c !== u; )
      d = S(c), i(c), c = d;
    i(u);
  }, Y = (c, u, d, v, m, g, x, y, _) => {
    if (u.type === "svg" ? x = "svg" : u.type === "math" && (x = "mathml"), c == null)
      pt(
        u,
        d,
        v,
        m,
        g,
        x,
        y,
        _
      );
    else {
      const b = c.el && c.el._isVueCE ? c.el : null;
      try {
        b && b._beginPatch(), Ie(
          c,
          u,
          m,
          g,
          x,
          y,
          _
        );
      } finally {
        b && b._endPatch();
      }
    }
  }, pt = (c, u, d, v, m, g, x, y) => {
    let _, b;
    const { props: O, shapeFlag: w, transition: E, dirs: M } = c;
    if (_ = c.el = o(
      c.type,
      g,
      O && O.is,
      O
    ), w & 8 ? a(_, c.children) : w & 16 && jt(
      c.children,
      _,
      null,
      v,
      m,
      xs(c, g),
      x,
      y
    ), M && Wt(c, null, v, "created"), ht(_, c, c.scopeId, x, v), O) {
      for (const N in O)
        N !== "value" && !he(N) && r(_, N, null, O[N], g, v);
      "value" in O && r(_, "value", null, O.value, g), (b = O.onVnodeBeforeMount) && _t(b, v, c);
    }
    M && Wt(c, null, v, "beforeMount");
    const R = So(m, E);
    R && E.beforeEnter(_), n(_, u, d), ((b = O && O.onVnodeMounted) || R || M) && ot(() => {
      b && _t(b, v, c), R && E.enter(_), M && Wt(c, null, v, "mounted");
    }, m);
  }, ht = (c, u, d, v, m) => {
    if (d && C(c, d), v)
      for (let g = 0; g < v.length; g++)
        C(c, v[g]);
    if (m) {
      let g = m.subTree;
      if (u === g || Di(g.type) && (g.ssContent === u || g.ssFallback === u)) {
        const x = m.vnode;
        ht(
          c,
          x,
          x.scopeId,
          x.slotScopeIds,
          m.parent
        );
      }
    }
  }, jt = (c, u, d, v, m, g, x, y, _ = 0) => {
    for (let b = _; b < c.length; b++) {
      const O = c[b] = y ? Pt(c[b]) : St(c[b]);
      T(
        null,
        O,
        u,
        d,
        v,
        m,
        g,
        x,
        y
      );
    }
  }, Ie = (c, u, d, v, m, g, x) => {
    const y = u.el = c.el;
    let { patchFlag: _, dynamicChildren: b, dirs: O } = u;
    _ |= c.patchFlag & 16;
    const w = c.props || W, E = u.props || W;
    let M;
    if (d && Bt(d, !1), (M = E.onVnodeBeforeUpdate) && _t(M, d, u, c), O && Wt(u, c, d, "beforeUpdate"), d && Bt(d, !0), // #6385 the old vnode may be a user-wrapped non-isomorphic block
    // Force full diff when block metadata is unstable.
    b && (!c.dynamicChildren || c.dynamicChildren.length !== b.length) && (_ = 0, x = !1, b = null), (w.innerHTML && E.innerHTML == null || w.textContent && E.textContent == null) && a(y, ""), b ? Vt(
      c.dynamicChildren,
      b,
      y,
      d,
      v,
      xs(u, m),
      g
    ) : x || U(
      c,
      u,
      y,
      null,
      d,
      v,
      xs(u, m),
      g,
      !1
    ), _ > 0) {
      if (_ & 16)
        oe(y, w, E, d, m);
      else if (_ & 2 && w.class !== E.class && r(y, "class", null, E.class, m), _ & 4 && r(y, "style", w.style, E.style, m), _ & 8) {
        const R = u.dynamicProps;
        for (let N = 0; N < R.length; N++) {
          const H = R[N], G = w[H], z = E[H];
          (z !== G || H === "value") && r(y, H, G, z, m, d);
        }
      }
      _ & 1 && c.children !== u.children && a(y, u.children);
    } else !x && b == null && oe(y, w, E, d, m);
    ((M = E.onVnodeUpdated) || O) && ot(() => {
      M && _t(M, d, u, c), O && Wt(u, c, d, "updated");
    }, v);
  }, Vt = (c, u, d, v, m, g, x) => {
    for (let y = 0; y < u.length; y++) {
      const _ = c[y], b = u[y], O = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        _.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (_.type === wt || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !ae(_, b) || // - In the case of a component, it could contain anything.
        _.shapeFlag & 198) ? h(_.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          d
        )
      );
      T(
        _,
        b,
        O,
        null,
        v,
        m,
        g,
        x,
        !0
      );
    }
  }, oe = (c, u, d, v, m) => {
    if (u !== d) {
      if (u !== W)
        for (const g in u)
          !he(g) && !(g in d) && r(
            c,
            g,
            u[g],
            null,
            m,
            v
          );
      for (const g in d) {
        if (he(g)) continue;
        const x = d[g], y = u[g];
        x !== y && g !== "value" && r(c, g, y, x, m, v);
      }
      "value" in d && r(c, "value", u.value, d.value, m);
    }
  }, Re = (c, u, d, v, m, g, x, y, _) => {
    const b = u.el = c ? c.el : l(""), O = u.anchor = c ? c.anchor : l("");
    let { patchFlag: w, dynamicChildren: E, slotScopeIds: M } = u;
    M && (y = y ? y.concat(M) : M), c == null ? (n(b, d, v), n(O, d, v), jt(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      u.children || [],
      d,
      O,
      m,
      g,
      x,
      y,
      _
    )) : w > 0 && w & 64 && E && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    c.dynamicChildren && c.dynamicChildren.length === E.length ? (Vt(
      c.dynamicChildren,
      E,
      d,
      m,
      g,
      x,
      y
    ), // #2080 if the stable fragment has a key, it's a <template v-for> that may
    //  get moved around. Make sure all root level vnodes inherit el.
    // #2134 or if it's a component root, it may also get moved around
    // as the component is being moved.
    (u.key != null || m && u === m.subTree) && Ii(
      c,
      u,
      !0
      /* shallow */
    )) : U(
      c,
      u,
      d,
      O,
      m,
      g,
      x,
      y,
      _
    );
  }, Fe = (c, u, d, v, m, g, x, y, _) => {
    u.slotScopeIds = y, c == null ? u.shapeFlag & 512 ? m.ctx.activate(
      u,
      d,
      v,
      x,
      _
    ) : us(
      u,
      d,
      v,
      m,
      g,
      x,
      _
    ) : Zs(c, u, _);
  }, us = (c, u, d, v, m, g, x) => {
    const y = c.component = Fo(
      c,
      v,
      m
    );
    if (Js(c) && (y.ctx.renderer = ce), Lo(y, !1, x), y.asyncDep) {
      if (m && m.registerDep(y, et, x), !c.el) {
        const _ = y.subTree = at(Xt);
        k(null, _, u, d), c.placeholder = _.el;
      }
    } else
      et(
        y,
        c,
        u,
        d,
        m,
        g,
        x
      );
  }, Zs = (c, u, d) => {
    const v = u.component = c.component;
    if (po(c, u, d))
      if (v.asyncDep && !v.asyncResolved) {
        q(v, u, d);
        return;
      } else
        v.next = u, v.update();
    else
      u.el = c.el, v.vnode = u;
  }, et = (c, u, d, v, m, g, x) => {
    const y = () => {
      if (c.isMounted) {
        let { next: w, bu: E, u: M, parent: R, vnode: N } = c;
        {
          const mt = Ri(c);
          if (mt) {
            w && (w.el = N.el, q(c, w, x)), mt.asyncDep.then(() => {
              ot(() => {
                c.isUnmounted || b();
              }, m);
            });
            return;
          }
        }
        let H = w, G;
        Bt(c, !1), w ? (w.el = N.el, q(c, w, x)) : w = N, E && ps(E), (G = w.props && w.props.onVnodeBeforeUpdate) && _t(G, R, w, N), Bt(c, !0);
        const z = mn(c), bt = c.subTree;
        c.subTree = z, T(
          bt,
          z,
          // parent may have changed if it's in a teleport
          h(bt.el),
          // anchor may have changed if it's in a fragment
          Le(bt),
          c,
          m,
          g
        ), w.el = z.el, H === null && ho(c, z.el), M && ot(M, m), (G = w.props && w.props.onVnodeUpdated) && ot(
          () => _t(G, R, w, N),
          m
        );
      } else {
        let w;
        const { el: E, props: M } = u, { bm: R, m: N, parent: H, root: G, type: z } = c, bt = ve(u);
        Bt(c, !1), R && ps(R), !bt && (w = M && M.onVnodeBeforeMount) && _t(w, H, u), Bt(c, !0);
        {
          G.ce && G.ce._hasShadowRoot() && G.ce._injectChildStyle(
            z,
            c.parent ? c.parent.type : void 0
          );
          const mt = c.subTree = mn(c);
          T(
            null,
            mt,
            d,
            v,
            c,
            m,
            g
          ), u.el = mt.el;
        }
        if (N && ot(N, m), !bt && (w = M && M.onVnodeMounted)) {
          const mt = u;
          ot(
            () => _t(w, H, mt),
            m
          );
        }
        (u.shapeFlag & 256 || H && ve(H.vnode) && H.vnode.shapeFlag & 256) && c.a && ot(c.a, m), c.isMounted = !0, u = d = v = null;
      }
    };
    c.scope.on();
    const _ = c.effect = new Wn(y);
    c.scope.off();
    const b = c.update = _.run.bind(_), O = c.job = _.runIfDirty.bind(_);
    O.i = c, O.id = c.uid, _.scheduler = () => ks(O), Bt(c, !0), b();
  }, q = (c, u, d) => {
    u.component = c;
    const v = c.vnode.props;
    c.vnode = u, c.next = null, bo(c, u.props, v, d), yo(c, u.children, d), Ft(), un(c), Dt();
  }, U = (c, u, d, v, m, g, x, y, _ = !1) => {
    const b = c && c.children, O = c ? c.shapeFlag : 0, w = u.children, { patchFlag: E, shapeFlag: M } = u;
    if (E > 0) {
      if (E & 128) {
        De(
          b,
          w,
          d,
          v,
          m,
          g,
          x,
          y,
          _
        );
        return;
      } else if (E & 256) {
        Ut(
          b,
          w,
          d,
          v,
          m,
          g,
          x,
          y,
          _
        );
        return;
      }
    }
    M & 8 ? (O & 16 && le(b, m, g), w !== b && a(d, w)) : O & 16 ? M & 16 ? De(
      b,
      w,
      d,
      v,
      m,
      g,
      x,
      y,
      _
    ) : le(b, m, g, !0) : (O & 8 && a(d, ""), M & 16 && jt(
      w,
      d,
      v,
      m,
      g,
      x,
      y,
      _
    ));
  }, Ut = (c, u, d, v, m, g, x, y, _) => {
    c = c || ee, u = u || ee;
    const b = c.length, O = u.length, w = Math.min(b, O);
    let E;
    for (E = 0; E < w; E++) {
      const M = u[E] = _ ? Pt(u[E]) : St(u[E]);
      T(
        c[E],
        M,
        d,
        null,
        m,
        g,
        x,
        y,
        _
      );
    }
    b > O ? le(
      c,
      m,
      g,
      !0,
      !1,
      w
    ) : jt(
      u,
      d,
      v,
      m,
      g,
      x,
      y,
      _,
      w
    );
  }, De = (c, u, d, v, m, g, x, y, _) => {
    let b = 0;
    const O = u.length;
    let w = c.length - 1, E = O - 1;
    for (; b <= w && b <= E; ) {
      const M = c[b], R = u[b] = _ ? Pt(u[b]) : St(u[b]);
      if (ae(M, R))
        T(
          M,
          R,
          d,
          null,
          m,
          g,
          x,
          y,
          _
        );
      else
        break;
      b++;
    }
    for (; b <= w && b <= E; ) {
      const M = c[w], R = u[E] = _ ? Pt(u[E]) : St(u[E]);
      if (ae(M, R))
        T(
          M,
          R,
          d,
          null,
          m,
          g,
          x,
          y,
          _
        );
      else
        break;
      w--, E--;
    }
    if (b > w) {
      if (b <= E) {
        const M = E + 1, R = M < O ? u[M].el : v;
        for (; b <= E; )
          T(
            null,
            u[b] = _ ? Pt(u[b]) : St(u[b]),
            d,
            R,
            m,
            g,
            x,
            y,
            _
          ), b++;
      }
    } else if (b > E)
      for (; b <= w; )
        gt(c[b], m, g, !0), b++;
    else {
      const M = b, R = b, N = /* @__PURE__ */ new Map();
      for (b = R; b <= E; b++) {
        const lt = u[b] = _ ? Pt(u[b]) : St(u[b]);
        lt.key != null && N.set(lt.key, b);
      }
      let H, G = 0;
      const z = E - R + 1;
      let bt = !1, mt = 0;
      const fe = new Array(z);
      for (b = 0; b < z; b++) fe[b] = 0;
      for (b = M; b <= w; b++) {
        const lt = c[b];
        if (G >= z) {
          gt(lt, m, g, !0);
          continue;
        }
        let vt;
        if (lt.key != null)
          vt = N.get(lt.key);
        else
          for (H = R; H <= E; H++)
            if (fe[H - R] === 0 && ae(lt, u[H])) {
              vt = H;
              break;
            }
        vt === void 0 ? gt(lt, m, g, !0) : (fe[vt - R] = b + 1, vt >= mt ? mt = vt : bt = !0, T(
          lt,
          u[vt],
          d,
          null,
          m,
          g,
          x,
          y,
          _
        ), G++);
      }
      const en = bt ? Co(fe) : ee;
      for (H = en.length - 1, b = z - 1; b >= 0; b--) {
        const lt = R + b, vt = u[lt], sn = u[lt + 1], nn = lt + 1 < O ? (
          // #13559, #14173 fallback to el placeholder for unresolved async component
          sn.el || Fi(sn)
        ) : v;
        fe[b] === 0 ? T(
          null,
          vt,
          d,
          nn,
          m,
          g,
          x,
          y,
          _
        ) : bt && (H < 0 || b !== en[H] ? Kt(vt, d, nn, 2) : H--);
      }
    }
  }, Kt = (c, u, d, v, m = null) => {
    const { el: g, type: x, transition: y, children: _, shapeFlag: b } = c;
    if (b & 6) {
      Kt(c.component.subTree, u, d, v);
      return;
    }
    if (b & 128) {
      c.suspense.move(u, d, v);
      return;
    }
    if (b & 64) {
      x.move(c, u, d, ce);
      return;
    }
    if (x === wt) {
      n(g, u, d);
      for (let w = 0; w < _.length; w++)
        Kt(_[w], u, d, v);
      n(c.anchor, u, d);
      return;
    }
    if (x === Ue) {
      j(c, u, d);
      return;
    }
    if (v !== 2 && b & 1 && y)
      if (v === 0)
        y.persisted && !g[_s] ? n(g, u, d) : (y.beforeEnter(g), n(g, u, d), ot(() => y.enter(g), m));
      else {
        const { leave: w, delayLeave: E, afterLeave: M } = y, R = () => {
          c.ctx.isUnmounted ? i(g) : n(g, u, d);
        }, N = () => {
          const H = g._isLeaving || !!g[_s];
          g._isLeaving && g[_s](
            !0
            /* cancelled */
          ), y.persisted && !H ? R() : w(g, () => {
            R(), M && M();
          });
        };
        E ? E(g, R, N) : N();
      }
    else
      n(g, u, d);
  }, gt = (c, u, d, v = !1, m = !1) => {
    const {
      type: g,
      props: x,
      ref: y,
      children: _,
      dynamicChildren: b,
      shapeFlag: O,
      patchFlag: w,
      dirs: E,
      cacheIndex: M,
      memo: R
    } = c;
    if (w === -2 && (m = !1), y != null && (Ft(), me(y, null, d, c, !0), Dt()), M != null && (u.renderCache[M] = void 0), O & 256) {
      u.ctx.deactivate(c);
      return;
    }
    const N = O & 1 && E, H = !ve(c);
    let G;
    if (H && (G = x && x.onVnodeBeforeUnmount) && _t(G, u, c), O & 6)
      ki(c.component, d, v);
    else {
      if (O & 128) {
        c.suspense.unmount(d, v);
        return;
      }
      N && Wt(c, null, u, "beforeUnmount"), O & 64 ? c.type.remove(
        c,
        u,
        d,
        ce,
        v
      ) : b && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !b.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (g !== wt || w > 0 && w & 64) ? le(
        b,
        u,
        d,
        !1,
        !0
      ) : (g === wt && w & 384 || !m && O & 16) && le(_, u, d), v && Qs(c);
    }
    const z = R != null && M == null;
    (H && (G = x && x.onVnodeUnmounted) || N || z) && ot(() => {
      G && _t(G, u, c), N && Wt(c, null, u, "unmounted"), z && (c.el = null);
    }, d);
  }, Qs = (c) => {
    const { type: u, el: d, anchor: v, transition: m } = c;
    if (u === wt) {
      Bi(d, v);
      return;
    }
    if (u === Ue) {
      A(c);
      return;
    }
    const g = () => {
      i(d), m && !m.persisted && m.afterLeave && m.afterLeave();
    };
    if (c.shapeFlag & 1 && m && !m.persisted) {
      const { leave: x, delayLeave: y } = m, _ = () => x(d, g);
      y ? y(c.el, g, _) : _();
    } else
      g();
  }, Bi = (c, u) => {
    let d;
    for (; c !== u; )
      d = S(c), i(c), c = d;
    i(u);
  }, ki = (c, u, d) => {
    const { bum: v, scope: m, job: g, subTree: x, um: y, m: _, a: b } = c;
    yn(_), yn(b), v && ps(v), m.stop(), g && (g.flags |= 8, gt(x, c, u, d)), y && ot(y, u), ot(() => {
      c.isUnmounted = !0;
    }, u);
  }, le = (c, u, d, v = !1, m = !1, g = 0) => {
    for (let x = g; x < c.length; x++)
      gt(c[x], u, d, v, m);
  }, Le = (c) => {
    if (c.shapeFlag & 6)
      return Le(c.component.subTree);
    if (c.shapeFlag & 128)
      return c.suspense.next();
    const u = S(c.anchor || c.el), d = u && u[$r];
    return d ? S(d) : u;
  };
  let as = !1;
  const tn = (c, u, d) => {
    let v;
    c == null ? u._vnode && (gt(u._vnode, null, null, !0), v = u._vnode.component) : T(
      u._vnode || null,
      c,
      u,
      null,
      null,
      null,
      d
    ), u._vnode = c, as || (as = !0, un(v), ci(), as = !1);
  }, ce = {
    p: T,
    um: gt,
    m: Kt,
    r: Qs,
    mt: us,
    mc: jt,
    pc: U,
    pbc: Vt,
    n: Le,
    o: t
  };
  return {
    render: tn,
    hydrate: void 0,
    createApp: oo(tn)
  };
}
function xs({ type: t, props: e }, s) {
  return s === "svg" && t === "foreignObject" || s === "mathml" && t === "annotation-xml" && e && e.encoding && e.encoding.includes("html") ? void 0 : s;
}
function Bt({ effect: t, job: e }, s) {
  s ? (t.flags |= 32, e.flags |= 4) : (t.flags &= -33, e.flags &= -5);
}
function So(t, e) {
  return (!t || t && !t.pendingBranch) && e && !e.persisted;
}
function Ii(t, e, s = !1) {
  const n = t.children, i = e.children;
  if (P(n) && P(i))
    for (let r = 0; r < n.length; r++) {
      const o = n[r];
      let l = i[r];
      l.shapeFlag & 1 && !l.dynamicChildren && ((l.patchFlag <= 0 || l.patchFlag === 32) && (l = i[r] = Pt(i[r]), l.el = o.el), !s && l.patchFlag !== -2 && Ii(o, l)), l.type === fs && (l.patchFlag === -1 && (l = i[r] = Pt(l)), l.el = o.el), l.type === Xt && !l.el && (l.el = o.el);
    }
}
function Co(t) {
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
function Ri(t) {
  const e = t.subTree.component;
  if (e)
    return e.asyncDep && !e.asyncResolved ? e : Ri(e);
}
function yn(t) {
  if (t)
    for (let e = 0; e < t.length; e++)
      t[e].flags |= 8;
}
function Fi(t) {
  if (t.placeholder)
    return t.placeholder;
  const e = t.component;
  return e ? Fi(e.subTree) : null;
}
const Di = (t) => t.__isSuspense;
function To(t, e) {
  e && e.pendingBranch ? P(t) ? e.effects.push(...t) : e.effects.push(t) : Rr(t);
}
const wt = /* @__PURE__ */ Symbol.for("v-fgt"), fs = /* @__PURE__ */ Symbol.for("v-txt"), Xt = /* @__PURE__ */ Symbol.for("v-cmt"), Ue = /* @__PURE__ */ Symbol.for("v-stc"), Gt = [];
let ct = null;
function Li(t = !1) {
  Gt.push(ct = t ? null : []);
}
function ji() {
  Gt.pop(), ct = Gt[Gt.length - 1] || null;
}
let Te = 1;
function xn(t, e = !1) {
  Te += t, t < 0 && ct && e && (ct.hasOnce = !0);
}
function Eo(t) {
  return t.dynamicChildren = Te > 0 ? ct || ee : null, ji(), Te > 0 && ct && ct.push(t), t;
}
function Hi(t, e, s, n, i, r) {
  return Eo(
    X(
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
function $i(t) {
  return t ? t.__v_isVNode === !0 : !1;
}
function ae(t, e) {
  return t.type === e.type && t.key === e.key;
}
const Ni = ({ key: t }) => t ?? null, Ke = ({
  ref: t,
  ref_key: e,
  ref_for: s
}) => (typeof t == "number" && (t = "" + t), t != null ? J(t) || /* @__PURE__ */ rt(t) || I(t) ? { i: Ct, r: t, k: e, f: !!s } : t : null);
function X(t, e = null, s = null, n = 0, i = null, r = t === wt ? 0 : 1, o = !1, l = !1) {
  const f = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: t,
    props: e,
    key: e && Ni(e),
    ref: e && Ke(e),
    scopeId: ui,
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
  return l ? (ze(f, s), r & 128 && t.normalize(f)) : s && (f.shapeFlag |= J(s) ? 8 : 16), Te > 0 && // avoid a block node from tracking itself
  !o && // has current parent block
  ct && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (f.patchFlag > 0 || r & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  f.patchFlag !== 32 && ct.push(f), f;
}
const at = Oo;
function Oo(t, e = null, s = null, n = 0, i = null, r = !1) {
  if ((!t || t === Zr) && (t = Xt), $i(t)) {
    const l = re(
      t,
      e,
      !0
      /* mergeRef: true */
    );
    return s && ze(l, s), Te > 0 && !r && ct && (l.shapeFlag & 6 ? ct[ct.indexOf(t)] = l : ct.push(l)), l.patchFlag = -2, l;
  }
  if (No(t) && (t = t.__vccOpts), e) {
    e = Ao(e);
    let { class: l, style: f } = e;
    l && !J(l) && (e.class = ss(l)), V(f) && (/* @__PURE__ */ Bs(f) && !P(f) && (f = Q({}, f)), e.style = Hs(f));
  }
  const o = J(t) ? 1 : Di(t) ? 128 : os(t) ? 64 : V(t) ? 4 : I(t) ? 2 : 0;
  return X(
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
function Ao(t) {
  return t ? /* @__PURE__ */ Bs(t) || Ti(t) ? Q({}, t) : t : null;
}
function re(t, e, s = !1, n = !1) {
  const { props: i, ref: r, patchFlag: o, children: l, transition: f } = t, p = e ? Po(i || {}, e) : i, a = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: t.type,
    props: p,
    key: p && Ni(p),
    ref: e && e.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      s && r ? P(r) ? r.concat(Ke(e)) : [r, Ke(e)] : Ke(e)
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
    patchFlag: e && t.type !== wt ? o === -1 ? 16 : o | 16 : o,
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
    ssContent: t.ssContent && re(t.ssContent),
    ssFallback: t.ssFallback && re(t.ssFallback),
    placeholder: t.placeholder,
    el: t.el,
    anchor: t.anchor,
    ctx: t.ctx,
    ce: t.ce
  };
  return f && n && qs(
    a,
    f.clone(a)
  ), a;
}
function Mo(t = " ", e = 0) {
  return at(fs, null, t, e);
}
function ye(t, e) {
  const s = at(Ue, null, t);
  return s.staticCount = e, s;
}
function St(t) {
  return t == null || typeof t == "boolean" ? at(Xt) : P(t) ? at(
    wt,
    null,
    // #3666, avoid reference pollution when reusing vnode
    t.slice()
  ) : $i(t) ? Pt(t) : at(fs, null, String(t));
}
function Pt(t) {
  return t.el === null && t.patchFlag !== -1 || t.memo ? t : re(t);
}
function ze(t, e) {
  let s = 0;
  const { shapeFlag: n } = t;
  if (e == null)
    e = null;
  else if (P(e))
    s = 16;
  else if (typeof e == "object")
    if (n & 65) {
      const i = e.default;
      i && (i._c && (i._d = !1), ze(t, i()), i._c && (i._d = !0));
      return;
    } else {
      s = 32;
      const i = e._;
      !i && !Ti(e) ? e._ctx = Ct : i === 3 && Ct && (Ct.slots._ === 1 ? e._ = 1 : (e._ = 2, t.patchFlag |= 1024));
    }
  else if (I(e)) {
    if (n & 65) {
      ze(t, { default: e });
      return;
    }
    e = { default: e, _ctx: Ct }, s = 32;
  } else
    e = String(e), n & 64 ? (s = 16, e = [Mo(e)]) : s = 8;
  t.children = e, t.shapeFlag |= s;
}
function Po(...t) {
  const e = {};
  for (let s = 0; s < t.length; s++) {
    const n = t[s];
    for (const i in n)
      if (i === "class")
        e.class !== n.class && (e.class = ss([e.class, n.class]));
      else if (i === "style")
        e.style = Hs([e.style, n.style]);
      else if (Ze(i)) {
        const r = e[i], o = n[i];
        o && r !== o && !(P(r) && r.includes(o)) ? e[i] = r ? [].concat(r, o) : o : o == null && r == null && // mergeProps({ 'onUpdate:modelValue': undefined }) should not retain
        // the model listener.
        !Qe(i) && (e[i] = o);
      } else i !== "" && (e[i] = n[i]);
  }
  return e;
}
function _t(t, e, s, n = null) {
  dt(t, e, 7, [
    s,
    n
  ]);
}
const Io = yi();
let Ro = 0;
function Fo(t, e, s) {
  const n = t.type, i = (e ? e.appContext : t.appContext) || Io, r = {
    uid: Ro++,
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
    scope: new ir(
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
    propsOptions: Oi(n, i),
    emitsOptions: xi(n, i),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: W,
    // inheritAttrs
    inheritAttrs: n.inheritAttrs,
    // state
    ctx: W,
    data: W,
    props: W,
    attrs: W,
    slots: W,
    refs: W,
    setupState: W,
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
  return r.ctx = { _: r }, r.root = e ? e.root : r, r.emit = co.bind(null, r), t.ce && t.ce(r), r;
}
let it = null;
const Do = () => it || Ct;
let Xe, Ee;
{
  const t = es(), e = (s, n) => {
    let i;
    return (i = t[s]) || (i = t[s] = []), i.push(n), (r) => {
      i.length > 1 ? i.forEach((o) => o(r)) : i[0](r);
    };
  };
  Xe = e(
    "__VUE_INSTANCE_SETTERS__",
    (s) => it = s
  ), Ee = e(
    "__VUE_SSR_SETTERS__",
    (s) => Oe = s
  );
}
const Pe = (t) => {
  const e = it;
  return Xe(t), t.scope.on(), () => {
    t.scope.off(), Xe(e);
  };
}, wn = () => {
  it && it.scope.off(), Xe(null);
};
function Vi(t) {
  return t.vnode.shapeFlag & 4;
}
let Oe = !1;
function Lo(t, e = !1, s = !1) {
  e && Ee(e);
  const { props: n, children: i } = t.vnode, r = Vi(t);
  go(t, n, r, e), _o(t, i, s || e);
  const o = r ? jo(t, e) : void 0;
  return e && Ee(!1), o;
}
function jo(t, e) {
  const s = t.type;
  t.accessCache = /* @__PURE__ */ Object.create(null), t.proxy = new Proxy(t.ctx, Qr);
  const { setup: n } = s;
  if (n) {
    Ft();
    const i = t.setupContext = n.length > 1 ? $o(t) : null, r = Pe(t), o = Me(
      n,
      t,
      0,
      [
        t.props,
        i
      ]
    ), l = Ln(o);
    if (Dt(), r(), (l || t.sp) && !ve(t) && gi(t), l) {
      if (o.then(wn, wn), e)
        return o.then((f) => {
          Ee(!0);
          try {
            Sn(t, f, e);
          } finally {
            Ee(!1);
          }
        }).catch((f) => {
          rs(f, t, 0);
        });
      t.asyncDep = o;
    } else
      Sn(t, o);
  } else
    Ui(t);
}
function Sn(t, e, s) {
  I(e) ? t.type.__ssrInlineRender ? t.ssrRender = e : t.render = e : V(e) && (t.setupState = ii(e)), Ui(t);
}
function Ui(t, e, s) {
  const n = t.type;
  t.render || (t.render = n.render || Tt);
  {
    const i = Pe(t);
    Ft();
    try {
      to(t);
    } finally {
      Dt(), i();
    }
  }
}
const Ho = {
  get(t, e) {
    return tt(t, "get", ""), t[e];
  }
};
function $o(t) {
  const e = (s) => {
    t.exposed = s || {};
  };
  return {
    attrs: new Proxy(t.attrs, Ho),
    slots: t.slots,
    emit: t.emit,
    expose: e
  };
}
function zs(t) {
  return t.exposed ? t.exposeProxy || (t.exposeProxy = new Proxy(ii(Cr(t.exposed)), {
    get(e, s) {
      if (s in e)
        return e[s];
      if (s in _e)
        return _e[s](t);
    },
    has(e, s) {
      return s in e || s in _e;
    }
  })) : t.proxy;
}
function No(t) {
  return I(t) && "__vccOpts" in t;
}
const Xs = (t, e) => /* @__PURE__ */ Or(t, e, Oe), Vo = "3.5.42";
let Fs;
const Cn = typeof window < "u" && window.trustedTypes;
if (Cn)
  try {
    Fs = /* @__PURE__ */ Cn.createPolicy("vue", {
      createHTML: (t) => t
    });
  } catch {
  }
const Ki = Fs ? (t) => Fs.createHTML(t) : (t) => t, Uo = "http://www.w3.org/2000/svg", Ko = "http://www.w3.org/1998/Math/MathML", Mt = typeof document < "u" ? document : null, Tn = Mt && /* @__PURE__ */ Mt.createElement("template"), Wo = {
  insert: (t, e, s) => {
    e.insertBefore(t, s || null);
  },
  remove: (t) => {
    const e = t.parentNode;
    e && e.removeChild(t);
  },
  createElement: (t, e, s, n) => {
    const i = e === "svg" ? Mt.createElementNS(Uo, t) : e === "mathml" ? Mt.createElementNS(Ko, t) : s ? Mt.createElement(t, { is: s }) : Mt.createElement(t);
    return t === "select" && n && n.multiple != null && i.setAttribute("multiple", n.multiple), i;
  },
  createText: (t) => Mt.createTextNode(t),
  createComment: (t) => Mt.createComment(t),
  setText: (t, e) => {
    t.nodeValue = e;
  },
  setElementText: (t, e) => {
    t.textContent = e;
  },
  parentNode: (t) => t.parentNode,
  nextSibling: (t) => t.nextSibling,
  querySelector: (t) => Mt.querySelector(t),
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
      Tn.innerHTML = Ki(
        n === "svg" ? `<svg>${t}</svg>` : n === "mathml" ? `<math>${t}</math>` : t
      );
      const l = Tn.content;
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
}, Bo = /* @__PURE__ */ Symbol("_vtc");
function ko(t, e, s) {
  const n = t[Bo];
  n && (e = (e ? [e, ...n] : [...n]).join(" ")), e == null ? t.removeAttribute("class") : s ? t.setAttribute("class", e) : t.className = e;
}
const En = /* @__PURE__ */ Symbol("_vod"), qo = /* @__PURE__ */ Symbol("_vsh"), Jo = /* @__PURE__ */ Symbol(""), Go = /(?:^|;)\s*display\s*:/;
function Yo(t, e, s) {
  const n = t.style, i = J(s);
  let r = !1;
  if (s && !i) {
    if (e)
      if (J(e))
        for (const o of e.split(";")) {
          const l = o.slice(0, o.indexOf(":")).trim();
          s[l] == null && pe(n, l, "");
        }
      else
        for (const o in e)
          s[o] == null && pe(n, o, "");
    for (const o in s) {
      o === "display" && (r = !0);
      const l = s[o];
      l != null ? Xo(
        t,
        o,
        !J(e) && e ? e[o] : void 0,
        l
      ) || pe(n, o, l) : pe(n, o, "");
    }
  } else if (i) {
    if (e !== s) {
      const o = n[Jo];
      o && (s += ";" + o), n.cssText = s, r = Go.test(s);
    }
  } else e && t.removeAttribute("style");
  En in t && (t[En] = r ? n.display : "", t[qo] && (n.display = "none"));
}
const Ne = /\s*!important$/;
function pe(t, e, s) {
  if (P(s))
    s.forEach((n) => pe(t, e, n));
  else if (s == null && (s = ""), e.startsWith("--"))
    Ne.test(s) ? t.setProperty(e, s.replace(Ne, ""), "important") : t.setProperty(e, s);
  else {
    const n = zo(t, e);
    Ne.test(s) ? t.setProperty(
      Zt(n),
      s.replace(Ne, ""),
      "important"
    ) : t[n] = s;
  }
}
const On = ["Webkit", "Moz", "ms"], ws = {};
function zo(t, e) {
  const s = ws[e];
  if (s)
    return s;
  let n = ft(e);
  if (n !== "filter" && n in t)
    return ws[e] = n;
  n = $n(n);
  for (let i = 0; i < On.length; i++) {
    const r = On[i] + n;
    if (r in t)
      return ws[e] = r;
  }
  return e;
}
function Xo(t, e, s, n) {
  return t.tagName === "TEXTAREA" && (e === "width" || e === "height") && J(n) && s === n;
}
const An = "http://www.w3.org/1999/xlink";
function Mn(t, e, s, n, i, r = sr(e)) {
  n && e.startsWith("xlink:") ? s == null ? t.removeAttributeNS(An, e.slice(6, e.length)) : t.setAttributeNS(An, e, s) : s == null || r && !Vn(s) ? t.removeAttribute(e) : t.setAttribute(
    e,
    r ? "" : Ot(s) ? String(s) : s
  );
}
function Pn(t, e, s, n, i) {
  if (e === "innerHTML" || e === "textContent") {
    s != null && (t[e] = e === "innerHTML" ? Ki(s) : s);
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
    l === "boolean" ? s = Vn(s) : s == null && l === "string" ? (s = "", o = !0) : l === "number" && (s = 0, o = !0);
  }
  try {
    t[e] = s;
  } catch {
  }
  o && t.removeAttribute(i || e);
}
function Zo(t, e, s, n) {
  t.addEventListener(e, s, n);
}
function Qo(t, e, s, n) {
  t.removeEventListener(e, s, n);
}
const In = /* @__PURE__ */ Symbol("_vei");
function tl(t, e, s, n, i = null) {
  const r = t[In] || (t[In] = {}), o = r[e];
  if (n && o)
    o.value = n;
  else {
    const [l, f] = nl(e);
    if (n) {
      const p = r[e] = ol(
        n,
        i
      );
      Zo(t, l, p, f);
    } else o && (Qo(t, l, o, f), r[e] = void 0);
  }
}
const el = /(Once|Passive|Capture)$/, sl = /^on:?(?:Once|Passive|Capture)$/;
function nl(t) {
  let e, s;
  for (; (s = t.match(el)) && !sl.test(t); )
    e || (e = {}), t = t.slice(0, t.length - s[1].length), e[s[1].toLowerCase()] = !0;
  return [t[2] === ":" ? t.slice(3) : Zt(t.slice(2)), e];
}
let Ss = 0;
const il = /* @__PURE__ */ Promise.resolve(), rl = () => Ss || (il.then(() => Ss = 0), Ss = Date.now());
function ol(t, e) {
  const s = (n) => {
    if (!n._vts)
      n._vts = Date.now();
    else if (n._vts <= s.attached)
      return;
    const i = s.value;
    if (P(i)) {
      const r = n.stopImmediatePropagation;
      n.stopImmediatePropagation = () => {
        r.call(n), n._stopped = !0;
      };
      const o = i.slice(), l = [n];
      for (let f = 0; f < o.length && !n._stopped; f++) {
        const p = o[f];
        p && dt(
          p,
          e,
          5,
          l
        );
      }
    } else
      dt(
        i,
        e,
        5,
        [n]
      );
  };
  return s.value = t, s.attached = rl(), s;
}
const Rn = (t) => t.charCodeAt(0) === 111 && t.charCodeAt(1) === 110 && // lowercase letter
t.charCodeAt(2) > 96 && t.charCodeAt(2) < 123, ll = (t, e, s, n, i, r) => {
  const o = i === "svg";
  e === "class" ? ko(t, n, o) : e === "style" ? Yo(t, s, n) : Ze(e) ? Qe(e) || tl(t, e, s, n, r) : (e[0] === "." ? (e = e.slice(1), !0) : e[0] === "^" ? (e = e.slice(1), !1) : cl(t, e, n, o)) ? (Pn(t, e, n), !t.tagName.includes("-") && (e === "value" || e === "checked" || e === "selected") && Mn(t, e, n, o, r, e !== "value")) : /* #11081 force set props for possible async custom element */ t._isVueCE && // #12408 check if it's declared prop or it's async custom element
  (fl(t, e) || // @ts-expect-error _def is private
  t._def.__asyncLoader && (/[A-Z]/.test(e) || !J(n))) ? Pn(t, ft(e), n, r, e) : (e === "true-value" ? t._trueValue = n : e === "false-value" && (t._falseValue = n), Mn(t, e, n, o));
};
function cl(t, e, s, n) {
  if (n)
    return !!(e === "innerHTML" || e === "textContent" || e in t && Rn(e) && I(s));
  if (e === "spellcheck" || e === "draggable" || e === "translate" || e === "autocorrect" || e === "sandbox" && t.tagName === "IFRAME" || e === "form" || e === "list" && t.tagName === "INPUT" || e === "type" && t.tagName === "TEXTAREA")
    return !1;
  if (e === "width" || e === "height") {
    const i = t.tagName;
    if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE")
      return !1;
  }
  return Rn(e) && J(s) ? !1 : e in t;
}
function fl(t, e) {
  const s = (
    // @ts-expect-error _def is private
    t._def.props
  );
  if (!s)
    return !1;
  const n = ft(e);
  return Array.isArray(s) ? s.some((i) => ft(i) === n) : Object.keys(s).some((i) => ft(i) === n);
}
const ul = /* @__PURE__ */ Q({ patchProp: ll }, Wo);
let Fn;
function al() {
  return Fn || (Fn = xo(ul));
}
const dl = ((...t) => {
  const e = al().createApp(...t), { mount: s } = e;
  return e.mount = (n) => {
    const i = hl(n);
    if (!i) return;
    const r = e._component;
    !I(r) && !r.render && !r.template && (r.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
    const o = s(i, !1, pl(i));
    return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), o;
  }, e;
});
function pl(t) {
  if (t instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && t instanceof MathMLElement)
    return "mathml";
}
function hl(t) {
  return J(t) ? document.querySelector(t) : t;
}
const Wi = (t, e) => {
  const s = t.__vccOpts || t;
  for (const [n, i] of e)
    s[n] = i;
  return s;
}, gl = {};
function bl(t, e) {
  return e[0] || (e[0] = ye('<div id="root-modal" class="hidden"><div id="root-dialog"><div class="root-head">ルートプロジェクト（作業対象フォルダ）を選ぶ</div><div id="root-places"></div><div id="root-drives"></div><div class="root-inputrow"><input id="root-input" type="text" spellcheck="false" placeholder="例: D:\\projects\\myapp（Enter で移動）"><button id="root-fav-btn" title="今表示しているフォルダをお気に入りに入れる／外す"> ☆ </button></div><ul id="root-dirlist"></ul><div class="root-hint hint"> フォルダをクリックで移動 ／ パス直接入力＋Enter でも移動。決定するとファイルブラウザが切替わり、新しい会話がそのフォルダで始まります。 </div><div class="root-actions"><button id="root-cancel">キャンセル</button><button id="root-ok" class="apply-btn">✓ このフォルダにする</button></div></div></div><div id="hist-modal" class="hidden"><div id="hist-dialog"><div class="root-head">🕰 保存履歴 — <span id="hist-file"></span></div><div id="hist-body"><ul id="hist-list"></ul><div id="hist-preview-wrap"><div id="hist-preview-head" class="hint"> 左の版を選ぶと内容が出ます。 </div><pre id="hist-preview"></pre></div></div><div class="root-hint hint"> 保存の直前の内容を残しています。戻すときは「今の内容」も履歴に積むので、戻し間違えてもやり直せます。 </div><div class="root-actions"><button id="hist-close">閉じる</button><button id="hist-restore" class="apply-btn" disabled> ↩ この版に戻す </button></div></div></div><div id="pick-modal" class="hidden"><div id="pick-dialog"><div class="root-head">参照するファイルを選ぶ</div><div id="pick-drives"></div><input id="pick-input" type="text" spellcheck="false" placeholder="例: C:\\Users\\you\\decks（Enter でフォルダへ移動）"><ul id="pick-list"></ul><div class="root-hint hint"> フォルダをクリックで移動 ／ ファイルをクリックで参照に追加します。 </div><div class="root-actions"><button id="pick-cancel">閉じる</button></div></div></div><div id="cf-modal" class="hidden"><div id="cf-dialog"><div class="root-head">📥 Confluence / Web から貼り付け</div><div class="root-hint hint"> Confluence のページをブラウザでコピー（Ctrl+C）してから「クリップボードから読込」、 または下の欄に Ctrl+V。リッチテキスト（HTML）で取れれば Markdown に変換して、 今開いているファイルのカーソル位置へ挿入します（画像は Confluence 上のURL参照のまま残ります）。 </div><div class="cf-actions"><button id="cf-read-btn" title="クリップボードを直接読み取る（ブラウザの許可が必要な場合あり）"> クリップボードから読込 </button><span id="cf-status" class="hint"></span></div><textarea id="cf-input" rows="10" spellcheck="false" placeholder="ここに貼り付け（Ctrl+V）…"></textarea><div class="root-actions"><button id="cf-cancel">閉じる</button><button id="cf-insert" class="apply-btn">✓ 変換して挿入</button></div></div></div><div id="sessions-modal" class="hidden"><div id="sessions-dialog"><div class="root-head">🗂 保存済みの会話</div><div class="root-hint hint"> クリックで会話を復元します（チャット表示＋エンジン文脈。ツール実行の詳細は失われ、 会話の本文だけが文脈として引き継がれます）。会話はターン確定ごとに自動保存されます。 </div><ul id="sessions-list"></ul><div class="root-actions"><button id="sessions-close" class="apply-btn">閉じる</button></div></div></div><div id="settings-modal" class="hidden"><div id="settings-dialog"><div class="root-head">設定</div><label class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>モデル / サーバ</b><span class="hint">以降の新しい会話に反映されます。</span></span><select id="settings-model"></select></label><label class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>ロード済みモデル</b><span class="hint">LM Studio でロード済みのモデルから選択（起動中のみ取得可）。</span></span><select id="settings-llm-model"></select></label><div class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>思考許容時間（秒）</b><span class="hint">AI が <code>&lt;think&gt;</code> で考え込める上限。超えると打ち切って結論生成に移ります。長くするほど1回の待ち時間が延びます（既定 90）。</span></span><span class="settings-inline"><input id="settings-think-budget" type="number" min="10" max="1800" step="10"><button id="settings-think-budget-save">保存</button><span id="settings-think-budget-status" class="hint"></span></span></div><div class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>コンテキスト長（トークン）</b><span class="hint">このサーバのモデル窓長。<b>0 で自動</b>（LM Studio の <code>meta.n_ctx</code> を取得）。リモートの LM Studio / llama-server は取れず 32768 と仮定するので、実際の窓長を手で入れると溢れ・無駄な切り詰めを防げます。変更するとこのサーバの会話は作り直されます。</span></span><span class="settings-inline"><input id="settings-context-length" type="number" min="0" max="2000000" step="1024" placeholder="0（自動）"><button id="settings-context-length-save">保存</button><span id="settings-context-length-status" class="hint"></span></span></div><label class="settings-row toggle"><input type="checkbox" id="settings-copilot"><span><b>Copilot 連携</b><span class="hint">オンにすると、エージェントが <code>ask_copilot</code> ツールで Microsoft Copilot に相談できます（PrayLight 経由）。</span></span></label><div class="settings-row" id="settings-copilot-controls"><button id="settings-copilot-open" title="Copilot にログインするためのブラウザを開く"> Copilotブラウザを開く（ログイン用） </button><span id="settings-copilot-status" class="hint"></span></div><div class="root-actions"><button id="settings-close" class="apply-btn">閉じる</button></div></div></div>', 6));
}
const ml = /* @__PURE__ */ Wi(gl, [["render", bl]]), vl = {};
function _l(t, e) {
  return e[0] || (e[0] = ye('<div class="brand">CodeWithPixie</div><button id="mode-btn" title="モード切替">…</button><button id="code-style-btn" class="code-only" title="Codeモードの進め方を切り替え"> 通常 </button><button id="root-project-btn" title="ルートプロジェクト（作業対象フォルダ）を変更"><span id="root-project-name">…</span></button><button id="places-btn" title="お気に入り・最近使ったフォルダへ移動"> ⭐ </button><div class="file-info"><button id="nav-back" class="nav-btn" title="前に開いていたファイルへ戻る (Alt+←)"> ◀ </button><button id="nav-fwd" class="nav-btn" title="進む (Alt+→)">▶</button><button id="recent-btn" class="nav-btn" title="最近開いたファイル (Ctrl+E)"> 🕘 </button><span id="current-file">（ファイル未選択）</span><button id="save-btn" title="保存 (Ctrl+S)">保存</button><span id="save-state"></span><button id="history-btn" title="このファイルの保存履歴から元に戻す"> 🕰 履歴 </button></div><div class="model-info"> model: <span id="model-name">…</span><span id="agent-status"></span></div><button id="settings-btn" title="設定（モデル）">設定</button>', 8));
}
const yl = /* @__PURE__ */ Wi(vl, [["render", _l]]);
function xl() {
  const t = /* @__PURE__ */ is({
    sessionId: "",
    phase: "idle",
    error: ""
  });
  let e = null;
  const s = Xs(
    () => ["switching", "sending", "running", "approval", "stopping"].includes(
      t.phase
    )
  );
  function n(i) {
    return e === i && t.sessionId === i.sessionId;
  }
  return {
    state: /* @__PURE__ */ Be(t),
    busy: s,
    select(i, r) {
      if (r && n(r) && t.phase === "switching") {
        r.sessionId = i, t.sessionId = i;
        return;
      }
      if (s.value) throw new Error("実行中は会話を切り替えられません。");
      e = null, t.sessionId = i, t.phase = "idle", t.error = "";
    },
    begin(i = "sending") {
      return s.value ? null : (e = {
        sessionId: t.sessionId,
        controller: new AbortController()
      }, t.phase = i, t.error = "", e);
    },
    current: n,
    get active() {
      return e;
    },
    phase(i, r) {
      n(i) && !i.controller.signal.aborted && (t.phase = r);
    },
    stop() {
      return !e || !s.value ? null : (t.phase = "stopping", e.controller.abort(), e);
    },
    finish(i, r = "") {
      n(i) && (t.error = r, t.phase = i.controller.signal.aborted || i.outcome === "cancelled" ? "cancelled" : i.outcome === "limit_reached" ? "limited" : r ? "failed" : "completed", e = null);
    }
  };
}
const wl = xl();
async function Dl(t, e, s, n) {
  if (!t.body) throw new Error("応答ストリームがありません。");
  const i = t.body.getReader(), r = new TextDecoder();
  let o = "", l = !1, f = "";
  const p = () => {
    i.cancel().catch(() => {
    });
  };
  e.controller.signal.addEventListener("abort", p, { once: !0 });
  try {
    for (; !l; ) {
      if (!s(e) || e.controller.signal.aborted) return;
      const { value: a, done: h } = await i.read();
      if (!s(e) || e.controller.signal.aborted) return;
      o += r.decode(a, { stream: !h });
      const S = o.split(/\r?\n\r?\n/);
      o = S.pop() || "";
      for (const C of S) {
        if (!s(e) || e.controller.signal.aborted) return;
        const D = C.split(/\r?\n/).filter((B) => B.startsWith("data:")).map((B) => B.slice(5).trimStart()).join(`
`);
        if (!D) continue;
        const T = JSON.parse(D);
        if (T.type === "error" && (f = T.text || "実行に失敗しました。"), await n(T), T.type === "done") {
          e.outcome = T.status, (T.status === "failed" || T.status === "limit_reached") && (f = {
            turn_timeout: "依頼全体の制限時間に達しました。",
            stream_timeout: "LLM応答の制限時間に達しました。",
            llm_calls_limit: "LLM呼び出し回数の上限に達しました。",
            tool_calls_limit: "ツール実行回数の上限に達しました。"
          }[T.reason] || T.reason || "実行に失敗しました。"), l = !0;
          break;
        }
      }
      if (h) break;
    }
    if (f) throw new Error(f);
    if (!l) throw new Error("完了通知を受信する前に接続が切れました。");
  } finally {
    e.controller.signal.removeEventListener("abort", p), await i.cancel().catch(() => {
    }), i.releaseLock();
  }
}
const Sl = { id: "split" }, Cl = { id: "right-pane" }, Tl = { id: "chat" }, El = { id: "composer" }, Ol = { class: "composer-actions" }, Al = ["title"], Ml = ["disabled", "title"], Pl = /* @__PURE__ */ hi({
  __name: "WorkspaceShell",
  setup(t) {
    const { state: e, busy: s } = wl, n = Xs(
      () => ({
        idle: "",
        switching: "会話切替中",
        sending: "送信中",
        running: "実行中",
        approval: "承認待ち",
        stopping: "中断中",
        completed: "完了",
        cancelled: "中断しました",
        limited: "実行上限に達しました",
        failed: "失敗"
      })[e.phase]
    );
    return (i, r) => (Li(), Hi("main", Sl, [
      r[6] || (r[6] = ye('<section id="left-pane"><div id="edit-area"><div id="editor"></div><div id="preview-divider" class="hidden" title="ドラッグでプレビューの幅を調整（ダブルクリックで等分に戻す）"></div><div id="preview" class="md hidden" aria-live="off"></div></div><div id="diff-overlay" class="hidden"><div id="diff-bar"><span id="diff-label">差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）</span><span id="diff-tabs"></span><span class="spacer"></span><button id="diff-close" class="hidden" title="差分表示を閉じる（承認の判断は右の承認バーで行う）"> ✕ 閉じる </button><button id="diff-approve-edit" class="apply-btn hidden" title="右ペインで編集した内容をそのまま書き込み、エージェントには完了済みと伝える"> ✓ 修正して承認 </button><button id="diff-apply" class="apply-btn">✓ 適用</button><button id="diff-cancel">キャンセル</button></div><div id="diff-editor"></div></div><div id="plan-overlay" class="hidden"><div id="plan-bar"><span id="plan-label">実行計画（承認するまでファイルは変更されません）</span><span class="spacer"></span><button id="plan-approve" class="apply-btn">✓ この計画で実行</button><button id="plan-reject">✕ 修正を依頼</button></div><div id="plan-body" class="md"></div></div><div id="left-toolbar"><button id="note-btn" class="note-only" title="選択行に付箋を貼る"> 付箋 </button><button id="preview-btn" title="Markdown プレビューを表示 (Ctrl+Shift+P)"> 👁 プレビュー </button><button id="richcopy-btn" disabled title="Markdown プレビュー表示中に使えます"> リッチコピー </button><span id="sel-info" class="hint">エージェントがファイルを直接編集します（破壊操作は承認制）。</span></div></section><div id="divider" title="ドラッグで幅を調整"></div>', 2)),
      X("section", Cl, [
        r[5] || (r[5] = ye('<div id="filemgr"><div class="section-head"><span>ファイル（ワークスペース）</span><span class="fm-actions"><button id="folder-btn" title="作業フォルダを変更"> フォルダ変更 </button><button id="refresh-btn" title="再読込">⟳</button><button id="new-file-btn" title="新規ファイル">ファイル追加</button><button id="new-folder-btn" title="新規フォルダ"> フォルダ追加 </button><button id="web2md-btn" class="note-only" title="URLのページをMarkdown化して web/ に保存する"> 🌐+ </button><button id="cf-btn" title="Confluence 等のページ（コピーしたHTML）をMarkdownに変換して挿入する"> 📥 貼付 </button></span><span class="search-row"><input id="file-search" type="search" placeholder="全文検索…"><span id="search-opts" class="hidden"><label title="大文字小文字を区別する（検索と置換で共通）"><input id="search-case" type="checkbox"> Aa </label><button id="replace-toggle" title="ヒットしたファイルをまとめて置換する"> 🔁 置換 </button></span></span></div><div id="replace-bar" class="hidden"><input id="replace-input" type="text" spellcheck="false" placeholder="置換後の文字列（そのまま入ります）"><div class="replace-actions"><button id="replace-preview-btn">👁 プレビュー</button><button id="replace-run-btn" class="apply-btn">✓ すべて置換</button><span id="replace-status" class="hint"></span></div><div id="replace-preview"></div></div><div id="root-bar"><span id="root-path" title="現在の作業フォルダ"></span><span id="files-trunc" class="hidden" title="巨大ワークスペースのため一覧を打ち切りました（目的のファイルは全文検索で探せます）">⚠ 一覧は先頭2万件まで</span></div><ul id="file-list"></ul><div id="search-results" class="hidden"></div></div><div id="v-divider" title="ドラッグでファイル欄の高さを調整（ダブルクリックで既定に戻す）"></div><div id="refmgr" class="note-only"><div class="section-head"><span>関連ファイル</span><span class="fm-actions"><button id="ref-add-btn" title="別ディレクトリのファイル（.pptx 等）を参照に追加"> ＋参照を追加 </button></span></div><ul id="ref-list"></ul><div id="ref-empty" class="hint"> ここにファイルをドラッグ、または「＋参照を追加」で紐付けます。 </div></div>', 3)),
        X("div", Tl, [
          r[4] || (r[4] = ye('<div class="section-head"><span>チャット</span><span class="fm-actions"><span id="session-info" class="hint code-only" title="この会話のセッションID"></span><button id="new-session-btn" class="code-only" title="新しい会話を開始（並行セッション）"> ＋新規会話 </button><button id="sessions-btn" class="code-only" title="保存済みの会話を一覧から復元する"> 🗂 会話 </button><button id="chat-clear-btn" class="note-only" title="この保存先の会話履歴を消去する"> 履歴を消去 </button></span></div><div id="messages"></div><div id="approval" class="hidden code-only"></div>', 3)),
          X("div", El, [
            r[1] || (r[1] = X("div", { id: "chip-bar" }, [
              X("span", {
                id: "sel-chip",
                class: "chip hidden"
              }, "選択テキスト添付")
            ], -1)),
            r[2] || (r[2] = X("textarea", {
              id: "chat-input",
              rows: "3",
              placeholder: "例）src/foo.py に入力値を検証する関数を追加して。テストも書いて実行して確認して。"
            }, null, -1)),
            X("div", Ol, [
              r[0] || (r[0] = X("span", { class: "hint" }, "Ctrl+Enter で送信", -1)),
              X("span", {
                role: "status",
                "aria-live": "polite",
                title: kt(e).error
              }, Cs(n.value), 9, Al),
              X("button", {
                id: "send-btn",
                class: ss({ stop: kt(s) }),
                disabled: kt(e).phase === "stopping" || kt(e).phase === "switching",
                title: kt(s) ? "エージェントの実行を中断する" : ""
              }, Cs(kt(s) ? "停止" : "送信"), 11, Ml)
            ]),
            r[3] || (r[3] = X("div", {
              id: "copilot-bar",
              class: "note-only"
            }, [
              X("button", {
                id: "cp-bar-open-btn",
                title: "デバッグ用ブラウザで Copilot を開く（そこで人が対話する）"
              }, " Copilotを開く "),
              X("button", {
                id: "cp-bar-import-btn",
                title: "開いている Copilot の会話を取得してAIにまとめさせる（普段のブラウザでOK・Copilotタブを前面にしておく）"
              }, " ⬇ 会話を取り込んでまとめる "),
              X("span", {
                id: "cp-bar-status",
                class: "hint"
              })
            ], -1))
          ])
        ])
      ])
    ]));
  }
}), Il = { id: "topbar" }, Rl = /* @__PURE__ */ hi({
  __name: "App",
  setup(t) {
    return (e, s) => (Li(), Hi(wt, null, [
      X("header", Il, [
        at(yl)
      ]),
      at(Pl),
      at(ml)
    ], 64));
  }
});
dl(Rl).mount("#app");
oi(() => import("./app-ChIjI0rN.js"));
export {
  Dl as a,
  wl as c
};
