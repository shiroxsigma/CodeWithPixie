// @__NO_SIDE_EFFECTS__
function Vs(t) {
  const e = /* @__PURE__ */ Object.create(null);
  for (const s of t.split(",")) e[s] = 1;
  return (s) => s in e;
}
const q = {}, re = [], At = () => {
}, Bn = () => !1, rs = (t) => t.charCodeAt(0) === 111 && t.charCodeAt(1) === 110 && // uppercase letter
(t.charCodeAt(2) > 122 || t.charCodeAt(2) < 97), os = (t) => t.startsWith("onUpdate:"), et = Object.assign, Us = (t, e) => {
  const s = t.indexOf(e);
  s > -1 && t.splice(s, 1);
}, Zi = Object.prototype.hasOwnProperty, $ = (t, e) => Zi.call(t, e), M = Array.isArray, Kt = (t) => Le(t) === "[object Map]", Ye = (t) => Le(t) === "[object Set]", an = (t) => Le(t) === "[object Date]", R = (t) => typeof t == "function", Y = (t) => typeof t == "string", It = (t) => typeof t == "symbol", V = (t) => t !== null && typeof t == "object", Kn = (t) => (V(t) || R(t)) && R(t.then) && R(t.catch), Wn = Object.prototype.toString, Le = (t) => Wn.call(t), Qi = (t) => Le(t).slice(8, -1), kn = (t) => Le(t) === "[object Object]", Bs = (t) => Y(t) && t !== "NaN" && t[0] !== "-" && "" + parseInt(t, 10) === t, ye = /* @__PURE__ */ Vs(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), ls = (t) => {
  const e = /* @__PURE__ */ Object.create(null);
  return ((s) => e[s] || (e[s] = t(s)));
}, tr = /-\w/g, pt = ls(
  (t) => t.replace(tr, (e) => e.slice(1).toUpperCase())
), er = /\B([A-Z])/g, se = ls(
  (t) => t.replace(er, "-$1").toLowerCase()
), qn = ls((t) => t.charAt(0).toUpperCase() + t.slice(1)), vs = ls(
  (t) => t ? `on${qn(t)}` : ""
), Ft = (t, e) => !Object.is(t, e), _s = (t, ...e) => {
  for (let s = 0; s < t.length; s++)
    t[s](...e);
}, Jn = (t, e, s, n = !1) => {
  Object.defineProperty(t, e, {
    configurable: !0,
    enumerable: !1,
    writable: n,
    value: s
  });
}, sr = (t) => {
  const e = parseFloat(t);
  return isNaN(e) ? t : e;
};
let dn;
const cs = () => dn || (dn = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function Ks(t) {
  if (M(t)) {
    const e = {};
    for (let s = 0; s < t.length; s++) {
      const n = t[s], i = Y(n) ? or(n) : Ks(n);
      if (i)
        for (const r in i)
          e[r] = i[r];
    }
    return e;
  } else if (Y(t) || V(t))
    return t;
}
const nr = /;(?![^(]*\))/g, ir = /:([^]+)/, rr = /\/\*[^]*?\*\//g;
function or(t) {
  const e = {};
  return t.replace(rr, "").split(nr).forEach((s) => {
    if (s) {
      const n = s.split(ir);
      n.length > 1 && (e[n[0].trim()] = n[1].trim());
    }
  }), e;
}
function ce(t) {
  let e = "";
  if (Y(t))
    e = t;
  else if (M(t))
    for (let s = 0; s < t.length; s++) {
      const n = ce(t[s]);
      n && (e += n + " ");
    }
  else if (V(t))
    for (const s in t)
      t[s] && (e += s + " ");
  return e.trim();
}
const lr = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", cr = /* @__PURE__ */ Vs(lr);
function Gn(t) {
  return !!t || t === "";
}
function fr(t, e) {
  if (t.length !== e.length) return !1;
  let s = !0;
  for (let n = 0; s && n < t.length; n++)
    s = fs(t[n], e[n]);
  return s;
}
function pn(t, e) {
  if (t.size !== e.size) return !1;
  const s = Array.from(e), n = new Uint8Array(s.length);
  for (const i of t) {
    let r = -1;
    for (let l = 0; l < s.length; l++)
      if (!n[l] && fs(i, s[l])) {
        r = l;
        break;
      }
    if (r < 0) return !1;
    n[r] = 1;
  }
  return !0;
}
function fs(t, e) {
  if (t === e) return !0;
  let s = an(t), n = an(e);
  if (s || n)
    return s && n ? t.getTime() === e.getTime() : !1;
  if (s = It(t), n = It(e), s || n)
    return t === e;
  if (s = M(t), n = M(e), s || n)
    return s && n ? fr(t, e) : !1;
  if (s = V(t), n = V(e), s || n) {
    if (!s || !n)
      return !1;
    if (s = Kt(t), n = Kt(e), s || n || (s = Ye(t), n = Ye(e), s || n))
      return s && n ? pn(t, e) : !1;
    const i = Object.keys(t).length, r = Object.keys(e).length;
    if (i !== r)
      return !1;
    for (const l in t) {
      const o = t.hasOwnProperty(l), f = e.hasOwnProperty(l);
      if (o && !f || !o && f || !fs(t[l], e[l]))
        return !1;
    }
  }
  return String(t) === String(e);
}
const zn = (t) => !!(t && t.__v_isRef === !0), xe = (t) => Y(t) ? t : t == null ? "" : M(t) || V(t) && (t.toString === Wn || !R(t.toString)) ? zn(t) ? xe(t.value) : JSON.stringify(t, Yn, 2) : String(t), Yn = (t, e) => zn(e) ? Yn(t, e.value) : Kt(e) ? {
  [`Map(${e.size})`]: [...e.entries()].reduce(
    (s, [n, i], r) => (s[ys(n, r) + " =>"] = i, s),
    {}
  )
} : Ye(e) ? {
  [`Set(${e.size})`]: [...e.values()].map((s) => ys(s))
} : It(e) ? ys(e) : V(e) && !M(e) && !kn(e) ? String(e) : e, ys = (t, e = "") => {
  var s;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    It(t) ? `Symbol(${(s = t.description) != null ? s : e})` : t
  );
};
let tt;
class ur {
  // TODO isolatedDeclarations "__v_skip"
  constructor(e = !1) {
    this.detached = e, this._active = !0, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = !1, this._warnOnRun = !0, this.__v_skip = !0, !e && tt && (tt.active ? (this.parent = tt, this.index = (tt.scopes || (tt.scopes = [])).push(
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
      const s = tt;
      try {
        return tt = this, e();
      } finally {
        tt = s;
      }
    }
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    ++this._on === 1 && (this.prevScope = tt, tt = this);
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    if (this._on > 0 && --this._on === 0) {
      if (tt === this)
        tt = this.prevScope;
      else {
        let e = tt;
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
function ar() {
  return tt;
}
let W;
const xs = /* @__PURE__ */ new WeakSet();
class Xn {
  constructor(e) {
    this.fn = e, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, tt && (tt.active ? tt.effects.push(this) : this.flags &= -2);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, xs.has(this) && (xs.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Qn(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, hn(this), ti(this);
    const e = W, s = ht;
    W = this, ht = !0;
    try {
      return this.fn();
    } finally {
      ei(this), W = e, ht = s, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let e = this.deps; e; e = e.nextDep)
        qs(e);
      this.deps = this.depsTail = void 0, hn(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? xs.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    Ms(this) && this.run();
  }
  get dirty() {
    return Ms(this);
  }
}
let Zn = 0, we, Ce;
function Qn(t, e = !1) {
  if (t.flags |= 8, e) {
    t.next = Ce, Ce = t;
    return;
  }
  t.next = we, we = t;
}
function Ws() {
  Zn++;
}
function ks() {
  if (--Zn > 0)
    return;
  if (Ce) {
    let e = Ce;
    for (Ce = void 0; e; ) {
      const s = e.next;
      e.next = void 0, e.flags &= -9, e = s;
    }
  }
  let t;
  for (; we; ) {
    let e = we;
    for (we = void 0; e; ) {
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
function ti(t) {
  for (let e = t.deps; e; e = e.nextDep)
    e.version = -1, e.prevActiveLink = e.dep.activeLink, e.dep.activeLink = e;
}
function ei(t) {
  let e, s = t.depsTail, n = s;
  for (; n; ) {
    const i = n.prevDep;
    n.version === -1 ? (n === s && (s = i), qs(n), dr(n)) : e = n, n.dep.activeLink = n.prevActiveLink, n.prevActiveLink = void 0, n = i;
  }
  t.deps = e, t.depsTail = s;
}
function Ms(t) {
  for (let e = t.deps; e; e = e.nextDep)
    if (e.dep.version !== e.version || e.dep.computed && (si(e.dep.computed) || e.dep.version !== e.version))
      return !0;
  return !!t._dirty;
}
function si(t) {
  if (t.flags & 4 && !(t.flags & 16) || (t.flags &= -17, t.globalVersion === Oe) || (t.globalVersion = Oe, !t.isSSR && t.flags & 128 && (!t.deps && !t._dirty || !Ms(t))))
    return;
  t.flags |= 2;
  const e = t.dep, s = W, n = ht;
  W = t, ht = !0;
  try {
    ti(t);
    const i = t.fn(t._value);
    (e.version === 0 || Ft(i, t._value)) && (t.flags |= 128, t._value = i, e.version++);
  } catch (i) {
    throw e.version++, i;
  } finally {
    W = s, ht = n, ei(t), t.flags &= -3;
  }
}
function qs(t, e = !1) {
  const { dep: s, prevSub: n, nextSub: i } = t;
  if (n && (n.nextSub = i, t.prevSub = void 0), i && (i.prevSub = n, t.nextSub = void 0), s.subs === t && (s.subs = n, !n && s.computed)) {
    s.computed.flags &= -5;
    for (let r = s.computed.deps; r; r = r.nextDep)
      qs(r, !0);
  }
  !e && !--s.sc && s.map && s.map.delete(s.key);
}
function dr(t) {
  const { prevDep: e, nextDep: s } = t;
  e && (e.nextDep = s, t.prevDep = void 0), s && (s.prevDep = e, t.nextDep = void 0);
}
let ht = !0;
const ni = [];
function Dt() {
  ni.push(ht), ht = !1;
}
function $t() {
  const t = ni.pop();
  ht = t === void 0 ? !0 : t;
}
function hn(t) {
  const { cleanup: e } = t;
  if (t.cleanup = void 0, e) {
    const s = W;
    W = void 0;
    try {
      e();
    } finally {
      W = s;
    }
  }
}
let Oe = 0;
class pr {
  constructor(e, s) {
    this.sub = e, this.dep = s, this.version = s.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class ii {
  // TODO isolatedDeclarations "__v_skip"
  constructor(e) {
    this.computed = e, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = !0;
  }
  track(e) {
    if (!W || !ht || W === this.computed)
      return;
    let s = this.activeLink;
    if (s === void 0 || s.sub !== W)
      s = this.activeLink = new pr(W, this), W.deps ? (s.prevDep = W.depsTail, W.depsTail.nextDep = s, W.depsTail = s) : W.deps = W.depsTail = s, ri(s);
    else if (s.version === -1 && (s.version = this.version, s.nextDep)) {
      const n = s.nextDep;
      n.prevDep = s.prevDep, s.prevDep && (s.prevDep.nextDep = n), s.prevDep = W.depsTail, s.nextDep = void 0, W.depsTail.nextDep = s, W.depsTail = s, W.deps === s && (W.deps = n);
    }
    return s;
  }
  trigger(e) {
    this.version++, Oe++, this.notify(e);
  }
  notify(e) {
    Ws();
    try {
      for (let s = this.subs; s; s = s.prevSub)
        s.sub.notify() && s.sub.dep.notify();
    } finally {
      ks();
    }
  }
}
function ri(t) {
  if (t.dep.sc++, t.sub.flags & 4) {
    const e = t.dep.computed;
    if (e && !t.dep.subs) {
      e.flags |= 20;
      for (let n = e.deps; n; n = n.nextDep)
        ri(n);
    }
    const s = t.dep.subs;
    s !== t && (t.prevSub = s, s && (s.nextSub = t)), t.dep.subs = t;
  }
}
const Rs = /* @__PURE__ */ new WeakMap(), Zt = /* @__PURE__ */ Symbol(
  ""
), Fs = /* @__PURE__ */ Symbol(
  ""
), Ae = /* @__PURE__ */ Symbol(
  ""
);
function st(t, e, s) {
  if (ht && W) {
    let n = Rs.get(t);
    n || Rs.set(t, n = /* @__PURE__ */ new Map());
    let i = n.get(s);
    i || (n.set(s, i = new ii()), i.map = n, i.key = s), i.track();
  }
}
function Lt(t, e, s, n, i, r) {
  const l = Rs.get(t);
  if (!l) {
    Oe++;
    return;
  }
  const o = (f) => {
    f && f.trigger();
  };
  if (Ws(), e === "clear")
    l.forEach(o);
  else {
    const f = M(t), d = f && Bs(s);
    if (f && s === "length") {
      const a = Number(n);
      l.forEach((h, S) => {
        (S === "length" || S === Ae || !It(S) && S >= a) && o(h);
      });
    } else
      switch ((s !== void 0 || l.has(void 0)) && o(l.get(s)), d && o(l.get(Ae)), e) {
        case "add":
          f ? d && o(l.get("length")) : (o(l.get(Zt)), Kt(t) && o(l.get(Fs)));
          break;
        case "delete":
          f || (o(l.get(Zt)), Kt(t) && o(l.get(Fs)));
          break;
        case "set":
          Kt(t) && o(l.get(Zt));
          break;
      }
  }
  ks();
}
function ne(t) {
  const e = /* @__PURE__ */ N(t);
  return e === t ? e : (st(e, "iterate", Ae), /* @__PURE__ */ gt(t) ? e : e.map(jt));
}
function us(t) {
  return st(t = /* @__PURE__ */ N(t), "iterate", Ae), t;
}
function Et(t, e) {
  return /* @__PURE__ */ kt(t) ? fe(/* @__PURE__ */ Qt(t) ? jt(e) : e) : jt(e);
}
const hr = {
  __proto__: null,
  [Symbol.iterator]() {
    return ws(this, Symbol.iterator, (t) => Et(this, t));
  },
  concat(...t) {
    return ne(this).concat(
      ...t.map((e) => M(e) ? ne(e) : e)
    );
  },
  entries() {
    return ws(this, "entries", (t) => (t[1] = Et(this, t[1]), t));
  },
  every(t, e) {
    return Pt(this, "every", t, e, void 0, arguments);
  },
  filter(t, e) {
    return Pt(
      this,
      "filter",
      t,
      e,
      (s) => s.map((n) => Et(this, n)),
      arguments
    );
  },
  find(t, e) {
    return Pt(
      this,
      "find",
      t,
      e,
      (s) => Et(this, s),
      arguments
    );
  },
  findIndex(t, e) {
    return Pt(this, "findIndex", t, e, void 0, arguments);
  },
  findLast(t, e) {
    return Pt(
      this,
      "findLast",
      t,
      e,
      (s) => Et(this, s),
      arguments
    );
  },
  findLastIndex(t, e) {
    return Pt(this, "findLastIndex", t, e, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(t, e) {
    return Pt(this, "forEach", t, e, void 0, arguments);
  },
  includes(...t) {
    return Cs(this, "includes", t);
  },
  indexOf(...t) {
    return Cs(this, "indexOf", t);
  },
  join(t) {
    return ne(this).join(t);
  },
  // keys() iterator only reads `length`, no optimization required
  lastIndexOf(...t) {
    return Cs(this, "lastIndexOf", t);
  },
  map(t, e) {
    return Pt(this, "map", t, e, void 0, arguments);
  },
  pop() {
    return ge(this, "pop");
  },
  push(...t) {
    return ge(this, "push", t);
  },
  reduce(t, ...e) {
    return gn(this, "reduce", t, e);
  },
  reduceRight(t, ...e) {
    return gn(this, "reduceRight", t, e);
  },
  shift() {
    return ge(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(t, e) {
    return Pt(this, "some", t, e, void 0, arguments);
  },
  splice(...t) {
    return ge(this, "splice", t);
  },
  toReversed() {
    return ne(this).toReversed();
  },
  toSorted(t) {
    return ne(this).toSorted(t);
  },
  toSpliced(...t) {
    return ne(this).toSpliced(...t);
  },
  unshift(...t) {
    return ge(this, "unshift", t);
  },
  values() {
    return ws(this, "values", (t) => Et(this, t));
  }
};
function ws(t, e, s) {
  const n = us(t), i = n[e]();
  return n !== t && !/* @__PURE__ */ gt(t) && (i._next = i.next, i.next = () => {
    const r = i._next();
    return r.done || (r.value = s(r.value)), r;
  }), i;
}
const gr = Array.prototype;
function Pt(t, e, s, n, i, r) {
  const l = us(t), o = l !== t && !/* @__PURE__ */ gt(t), f = l[e];
  if (f !== gr[e]) {
    const h = f.apply(t, r);
    return o ? jt(h) : h;
  }
  let d = s;
  l !== t && (o ? d = function(h, S) {
    return s.call(this, Et(t, h), S, t);
  } : s.length > 2 && (d = function(h, S) {
    return s.call(this, h, S, t);
  }));
  const a = f.call(l, d, n);
  return o && i ? i(a) : a;
}
function gn(t, e, s, n) {
  const i = us(t), r = i !== t && !/* @__PURE__ */ gt(t);
  let l = s, o = !1;
  i !== t && (r ? (o = n.length === 0, l = function(d, a, h) {
    return o && (o = !1, d = Et(t, d)), s.call(this, d, Et(t, a), h, t);
  }) : s.length > 3 && (l = function(d, a, h) {
    return s.call(this, d, a, h, t);
  }));
  const f = i[e](l, ...n);
  return o ? Et(t, f) : f;
}
function Cs(t, e, s) {
  const n = /* @__PURE__ */ N(t);
  st(n, "iterate", Ae);
  const i = n[e](...s);
  return (i === -1 || i === !1) && /* @__PURE__ */ zs(s[0]) ? (s[0] = /* @__PURE__ */ N(s[0]), n[e](...s)) : i;
}
function ge(t, e, s = []) {
  Dt(), Ws();
  const n = (/* @__PURE__ */ N(t))[e].apply(t, s);
  return ks(), $t(), n;
}
const br = /* @__PURE__ */ Vs("__proto__,__v_isRef,__isVue"), oi = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((t) => t !== "arguments" && t !== "caller").map((t) => Symbol[t]).filter(It)
);
function mr(t) {
  It(t) || (t = String(t));
  const e = /* @__PURE__ */ N(this);
  return st(e, "has", t), e.hasOwnProperty(t);
}
class li {
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
      return n === (i ? r ? Or : ai : r ? ui : fi).get(e) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(e) === Object.getPrototypeOf(n) ? e : void 0;
    const l = M(e);
    if (!i) {
      let f;
      if (l && (f = hr[s]))
        return f;
      if (s === "hasOwnProperty")
        return mr;
    }
    const o = Reflect.get(
      e,
      s,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      /* @__PURE__ */ lt(e) ? e : n
    );
    if ((It(s) ? oi.has(s) : br(s)) || (i || st(e, "get", s), r))
      return o;
    if (/* @__PURE__ */ lt(o)) {
      const f = l && Bs(s) ? o : o.value;
      return i && V(f) ? /* @__PURE__ */ Xe(f) : f;
    }
    return V(o) ? i ? /* @__PURE__ */ Xe(o) : /* @__PURE__ */ De(o) : o;
  }
}
class ci extends li {
  constructor(e = !1) {
    super(!1, e);
  }
  set(e, s, n, i) {
    let r = e[s];
    const l = M(e) && Bs(s);
    if (!this._isShallow) {
      const d = /* @__PURE__ */ kt(r);
      if (!/* @__PURE__ */ gt(n) && !/* @__PURE__ */ kt(n) && (r = /* @__PURE__ */ N(r), n = /* @__PURE__ */ N(n)), !l && /* @__PURE__ */ lt(r) && !/* @__PURE__ */ lt(n))
        return d || (r.value = n), !0;
    }
    const o = l ? Number(s) < e.length : $(e, s), f = Reflect.set(
      e,
      s,
      n,
      /* @__PURE__ */ lt(e) ? e : i
    );
    return e === /* @__PURE__ */ N(i) && f && (o ? Ft(n, r) && Lt(e, "set", s, n) : Lt(e, "add", s, n)), f;
  }
  deleteProperty(e, s) {
    const n = $(e, s);
    e[s];
    const i = Reflect.deleteProperty(e, s);
    return i && n && Lt(e, "delete", s, void 0), i;
  }
  has(e, s) {
    const n = Reflect.has(e, s);
    return (!It(s) || !oi.has(s)) && st(e, "has", s), n;
  }
  ownKeys(e) {
    return st(
      e,
      "iterate",
      M(e) ? "length" : Zt
    ), Reflect.ownKeys(e);
  }
}
class vr extends li {
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
const _r = /* @__PURE__ */ new ci(), yr = /* @__PURE__ */ new vr(), xr = /* @__PURE__ */ new ci(!0);
const Ls = (t) => t, Ke = (t) => Reflect.getPrototypeOf(t);
function wr(t, e, s) {
  return function(...n) {
    const i = this.__v_raw, r = /* @__PURE__ */ N(i), l = Kt(r), o = t === "entries" || t === Symbol.iterator && l, f = t === "keys" && l, d = i[t](...n), a = s ? Ls : e ? fe : jt;
    return !e && st(
      r,
      "iterate",
      f ? Fs : Zt
    ), et(
      // inheriting all iterator properties
      Object.create(d),
      {
        // iterator protocol
        next() {
          const { value: h, done: S } = d.next();
          return S ? { value: h, done: S } : {
            value: o ? [a(h[0]), a(h[1])] : a(h),
            done: S
          };
        }
      }
    );
  };
}
function We(t) {
  return function(...e) {
    return t === "delete" ? !1 : t === "clear" ? void 0 : this;
  };
}
function Cr(t, e) {
  const s = {
    get(i) {
      const r = this.__v_raw, l = /* @__PURE__ */ N(r), o = /* @__PURE__ */ N(i);
      t || (Ft(i, o) && st(l, "get", i), st(l, "get", o));
      const { has: f } = Ke(l), d = e ? Ls : t ? fe : jt;
      if (f.call(l, i))
        return d(r.get(i));
      if (f.call(l, o))
        return d(r.get(o));
      r !== l && r.get(i);
    },
    get size() {
      const i = this.__v_raw;
      return !t && st(/* @__PURE__ */ N(i), "iterate", Zt), i.size;
    },
    has(i) {
      const r = this.__v_raw, l = /* @__PURE__ */ N(r), o = /* @__PURE__ */ N(i);
      return t || (Ft(i, o) && st(l, "has", i), st(l, "has", o)), i === o ? r.has(i) : r.has(i) || r.has(o);
    },
    forEach(i, r) {
      const l = this, o = l.__v_raw, f = /* @__PURE__ */ N(o), d = e ? Ls : t ? fe : jt;
      return !t && st(f, "iterate", Zt), o.forEach((a, h) => i.call(r, d(a), d(h), l));
    }
  };
  return et(
    s,
    t ? {
      add: We("add"),
      set: We("set"),
      delete: We("delete"),
      clear: We("clear")
    } : {
      add(i) {
        const r = /* @__PURE__ */ N(this), l = Ke(r), o = /* @__PURE__ */ N(i), f = !e && !/* @__PURE__ */ gt(i) && !/* @__PURE__ */ kt(i) ? o : i;
        return l.has.call(r, f) || Ft(i, f) && l.has.call(r, i) || Ft(o, f) && l.has.call(r, o) || (r.add(f), Lt(r, "add", f, f)), this;
      },
      set(i, r) {
        !e && !/* @__PURE__ */ gt(r) && !/* @__PURE__ */ kt(r) && (r = /* @__PURE__ */ N(r));
        const l = /* @__PURE__ */ N(this), { has: o, get: f } = Ke(l);
        let d = o.call(l, i);
        d || (i = /* @__PURE__ */ N(i), d = o.call(l, i));
        const a = f.call(l, i);
        return l.set(i, r), d ? Ft(r, a) && Lt(l, "set", i, r) : Lt(l, "add", i, r), this;
      },
      delete(i) {
        const r = /* @__PURE__ */ N(this), { has: l, get: o } = Ke(r);
        let f = l.call(r, i);
        f || (i = /* @__PURE__ */ N(i), f = l.call(r, i)), o && o.call(r, i);
        const d = r.delete(i);
        return f && Lt(r, "delete", i, void 0), d;
      },
      clear() {
        const i = /* @__PURE__ */ N(this), r = i.size !== 0, l = i.clear();
        return r && Lt(
          i,
          "clear",
          void 0,
          void 0
        ), l;
      }
    }
  ), [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ].forEach((i) => {
    s[i] = wr(i, t, e);
  }), s;
}
function Js(t, e) {
  const s = Cr(t, e);
  return (n, i, r) => i === "__v_isReactive" ? !t : i === "__v_isReadonly" ? t : i === "__v_raw" ? n : Reflect.get(
    $(s, i) && i in n ? s : n,
    i,
    r
  );
}
const Sr = {
  get: /* @__PURE__ */ Js(!1, !1)
}, Er = {
  get: /* @__PURE__ */ Js(!1, !0)
}, Tr = {
  get: /* @__PURE__ */ Js(!0, !1)
};
const fi = /* @__PURE__ */ new WeakMap(), ui = /* @__PURE__ */ new WeakMap(), ai = /* @__PURE__ */ new WeakMap(), Or = /* @__PURE__ */ new WeakMap();
function Ar(t) {
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
function De(t) {
  return /* @__PURE__ */ kt(t) ? t : Gs(
    t,
    !1,
    _r,
    Sr,
    fi
  );
}
// @__NO_SIDE_EFFECTS__
function Ir(t) {
  return Gs(
    t,
    !1,
    xr,
    Er,
    ui
  );
}
// @__NO_SIDE_EFFECTS__
function Xe(t) {
  return Gs(
    t,
    !0,
    yr,
    Tr,
    ai
  );
}
function Gs(t, e, s, n, i) {
  if (!V(t) || t.__v_raw && !(e && t.__v_isReactive) || t.__v_skip || !Object.isExtensible(t))
    return t;
  const r = i.get(t);
  if (r)
    return r;
  const l = Ar(Qi(t));
  if (l === 0)
    return t;
  const o = new Proxy(
    t,
    l === 2 ? n : s
  );
  return i.set(t, o), o;
}
// @__NO_SIDE_EFFECTS__
function Qt(t) {
  return /* @__PURE__ */ kt(t) ? /* @__PURE__ */ Qt(t.__v_raw) : !!(t && t.__v_isReactive);
}
// @__NO_SIDE_EFFECTS__
function kt(t) {
  return !!(t && t.__v_isReadonly);
}
// @__NO_SIDE_EFFECTS__
function gt(t) {
  return !!(t && t.__v_isShallow);
}
// @__NO_SIDE_EFFECTS__
function zs(t) {
  return t ? !!t.__v_raw : !1;
}
// @__NO_SIDE_EFFECTS__
function N(t) {
  const e = t && t.__v_raw;
  return e ? /* @__PURE__ */ N(e) : t;
}
function Pr(t) {
  return !$(t, "__v_skip") && Object.isExtensible(t) && Jn(t, "__v_skip", !0), t;
}
const jt = (t) => V(t) ? /* @__PURE__ */ De(t) : t, fe = (t) => V(t) ? /* @__PURE__ */ Xe(t) : t;
// @__NO_SIDE_EFFECTS__
function lt(t) {
  return t ? t.__v_isRef === !0 : !1;
}
function k(t) {
  return /* @__PURE__ */ lt(t) ? t.value : t;
}
const Mr = {
  get: (t, e, s) => e === "__v_raw" ? t : k(Reflect.get(t, e, s)),
  set: (t, e, s, n) => {
    const i = t[e];
    return /* @__PURE__ */ lt(i) && !/* @__PURE__ */ lt(s) ? (i.value = s, !0) : Reflect.set(t, e, s, n);
  }
};
function di(t) {
  return /* @__PURE__ */ Qt(t) ? t : new Proxy(t, Mr);
}
class Rr {
  constructor(e, s, n) {
    this.fn = e, this.setter = s, this._value = void 0, this.dep = new ii(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Oe - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !s, this.isSSR = n;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    W !== this)
      return Qn(this, !0), !0;
  }
  get value() {
    const e = this.dep.track();
    return si(this), e && (e.version = this.dep.version), this._value;
  }
  set value(e) {
    this.setter && this.setter(e);
  }
}
// @__NO_SIDE_EFFECTS__
function Fr(t, e, s = !1) {
  let n, i;
  return R(t) ? n = t : (n = t.get, i = t.set), new Rr(n, i, s);
}
const ke = {}, Ze = /* @__PURE__ */ new WeakMap();
let Xt;
function Lr(t, e = !1, s = Xt) {
  if (s) {
    let n = Ze.get(s);
    n || Ze.set(s, n = []), n.push(t);
  }
}
function Dr(t, e, s = q) {
  const { immediate: n, deep: i, once: r, scheduler: l, augmentJob: o, call: f } = s, d = (I) => i ? I : /* @__PURE__ */ gt(I) || i === !1 || i === 0 ? Bt(I, 1) : Bt(I);
  let a, h, S, E, D = !1, T = !1;
  if (/* @__PURE__ */ lt(t) ? (h = () => t.value, D = /* @__PURE__ */ gt(t)) : /* @__PURE__ */ Qt(t) ? (h = () => d(t), D = !0) : M(t) ? (T = !0, D = t.some((I) => /* @__PURE__ */ Qt(I) || /* @__PURE__ */ gt(I)), h = () => t.map((I) => {
    if (/* @__PURE__ */ lt(I))
      return I.value;
    if (/* @__PURE__ */ Qt(I))
      return d(I);
    if (R(I))
      return f ? f(I, 2) : I();
  })) : R(t) ? e ? h = f ? () => f(t, 2) : t : h = () => {
    if (S) {
      Dt();
      try {
        S();
      } finally {
        $t();
      }
    }
    const I = Xt;
    Xt = a;
    try {
      return f ? f(t, 3, [E]) : t(E);
    } finally {
      Xt = I;
    }
  } : h = At, e && i) {
    const I = h, Z = i === !0 ? 1 / 0 : i;
    h = () => Bt(I(), Z);
  }
  const J = ar(), G = () => {
    a.stop(), J && J.active && Us(J.effects, a);
  };
  if (r && e) {
    const I = e;
    e = (...Z) => {
      const mt = I(...Z);
      return G(), mt;
    };
  }
  let L = T ? new Array(t.length).fill(ke) : ke;
  const j = (I) => {
    if (!(!(a.flags & 1) || !a.dirty && !I))
      if (e) {
        const Z = a.run();
        if (I || i || D || (T ? Z.some((mt, vt) => Ft(mt, L[vt])) : Ft(Z, L))) {
          S && S();
          const mt = Xt;
          Xt = a;
          try {
            const vt = [
              Z,
              // pass undefined as the old value when it's changed for the first time
              L === ke ? void 0 : T && L[0] === ke ? [] : L,
              E
            ];
            L = Z, f ? f(e, 3, vt) : (
              // @ts-expect-error
              e(...vt)
            );
          } finally {
            Xt = mt;
          }
        }
      } else
        a.run();
  };
  return o && o(j), a = new Xn(h), a.scheduler = l ? () => l(j, !1) : j, E = (I) => Lr(I, !1, a), S = a.onStop = () => {
    const I = Ze.get(a);
    if (I) {
      if (f)
        f(I, 4);
      else
        for (const Z of I) Z();
      Ze.delete(a);
    }
  }, e ? n ? j(!0) : L = a.run() : l ? l(j.bind(null, !0), !0) : a.run(), G.pause = a.pause.bind(a), G.resume = a.resume.bind(a), G.stop = G, G;
}
function Bt(t, e = 1 / 0, s) {
  if (e <= 0 || !V(t) || t.__v_skip || (s = s || /* @__PURE__ */ new Map(), (s.get(t) || 0) >= e))
    return t;
  if (s.set(t, e), e--, /* @__PURE__ */ lt(t))
    Bt(t.value, e, s);
  else if (M(t))
    for (let n = 0; n < t.length; n++)
      Bt(t[n], e, s);
  else if (Ye(t) || Kt(t))
    t.forEach((n) => {
      Bt(n, e, s);
    });
  else if (kn(t)) {
    for (const n in t)
      Bt(t[n], e, s);
    for (const n of Object.getOwnPropertySymbols(t))
      Object.prototype.propertyIsEnumerable.call(t, n) && Bt(t[n], e, s);
  }
  return t;
}
function $e(t, e, s, n) {
  try {
    return n ? t(...n) : t();
  } catch (i) {
    as(i, e, s);
  }
}
function bt(t, e, s, n) {
  if (R(t)) {
    const i = $e(t, e, s, n);
    return i && Kn(i) && i.catch((r) => {
      as(r, e, s);
    }), i;
  }
  if (M(t)) {
    const i = [];
    for (let r = 0; r < t.length; r++)
      i.push(bt(t[r], e, s, n));
    return i;
  }
}
function as(t, e, s, n = !0) {
  const i = e ? e.vnode : null, { errorHandler: r, throwUnhandledErrorInProduction: l } = e && e.appContext.config || q;
  if (e) {
    let o = e.parent;
    const f = e.proxy, d = `https://vuejs.org/error-reference/#runtime-${s}`;
    for (; o; ) {
      const a = o.ec;
      if (a) {
        for (let h = 0; h < a.length; h++)
          if (a[h](t, f, d) === !1)
            return;
      }
      o = o.parent;
    }
    if (r) {
      Dt(), $e(r, null, 10, [
        t,
        f,
        d
      ]), $t();
      return;
    }
  }
  $r(t, s, i, n, l);
}
function $r(t, e, s, n = !0, i = !1) {
  if (i)
    throw t;
  console.error(t);
}
const rt = [];
let St = -1;
const oe = [];
let Ut = null, ie = 0;
const pi = /* @__PURE__ */ Promise.resolve();
let Qe = null;
function hi(t) {
  const e = Qe || pi;
  return t ? e.then(this ? t.bind(this) : t) : e;
}
function jr(t) {
  let e = St + 1, s = rt.length;
  for (; e < s; ) {
    const n = e + s >>> 1, i = rt[n], r = Ie(i);
    r < t || r === t && i.flags & 2 ? e = n + 1 : s = n;
  }
  return e;
}
function Ys(t) {
  if (!(t.flags & 1)) {
    const e = Ie(t), s = rt[rt.length - 1];
    !s || // fast path when the job id is larger than the tail
    !(t.flags & 2) && e >= Ie(s) ? rt.push(t) : rt.splice(jr(e), 0, t), t.flags |= 1, gi();
  }
}
function gi() {
  Qe || (Qe = pi.then(mi));
}
function Hr(t) {
  if (!M(t))
    Ut && t.id === -1 ? Ut.splice(ie + 1, 0, t) : t.flags & 1 || (oe.push(t), t.flags |= 1);
  else
    for (let e = 0; e < t.length; e++)
      oe.push(t[e]);
  gi();
}
function bn(t, e, s = St + 1) {
  for (; s < rt.length; s++) {
    const n = rt[s];
    if (n && n.flags & 2) {
      if (t && n.id !== t.uid)
        continue;
      rt.splice(s, 1), s--, n.flags & 4 && (n.flags &= -2), n(), n.flags & 4 || (n.flags &= -2);
    }
  }
}
function bi(t) {
  if (oe.length) {
    const e = [...new Set(oe)].sort(
      (s, n) => Ie(s) - Ie(n)
    );
    if (oe.length = 0, Ut) {
      for (let s = 0; s < e.length; s++)
        Ut.push(e[s]);
      return;
    }
    for (Ut = e, ie = 0; ie < Ut.length; ie++) {
      const s = Ut[ie];
      s.flags & 4 && (s.flags &= -2), s.flags & 8 || s(), s.flags &= -2;
    }
    Ut = null, ie = 0;
  }
}
const Ie = (t) => t.id == null ? t.flags & 2 ? -1 : 1 / 0 : t.id;
function mi(t) {
  try {
    for (St = 0; St < rt.length; St++) {
      const e = rt[St];
      e && !(e.flags & 8) && (e.flags & 4 && (e.flags &= -2), $e(
        e,
        e.i,
        e.i ? 15 : 14
      ), e.flags & 4 || (e.flags &= -2));
    }
  } finally {
    for (; St < rt.length; St++) {
      const e = rt[St];
      e && (e.flags &= -2);
    }
    St = -1, rt.length = 0, bi(), Qe = null, (rt.length || oe.length) && mi();
  }
}
let Ot = null, vi = null;
function ts(t) {
  const e = Ot;
  return Ot = t, vi = t && t.type.__scopeId || null, e;
}
function Nr(t, e = Ot, s) {
  if (!e || t._n)
    return t;
  const n = (...i) => {
    n._d && On(-1);
    const r = ts(e), l = te.length;
    let o;
    try {
      o = t(...i);
    } finally {
      for (let f = te.length; f > l; f--) Bi();
      ts(r), n._d && On(1);
    }
    return o;
  };
  return n._n = !0, n._c = !0, n._d = !0, n;
}
function zt(t, e, s, n) {
  const i = t.dirs, r = e && e.dirs;
  for (let l = 0; l < i.length; l++) {
    const o = i[l];
    r && (o.oldValue = r[l].value);
    let f = o.dir[n];
    f && (Dt(), bt(f, s, 8, [
      t.el,
      o,
      t,
      e
    ]), $t());
  }
}
function Vr(t, e) {
  if (ot) {
    let s = ot.provides;
    const n = ot.parent && ot.parent.provides;
    n === s && (s = ot.provides = Object.create(n)), s[t] = e;
  }
}
function Je(t, e, s = !1) {
  const n = Vo();
  if (n || le) {
    let i = le ? le._context.provides : n ? n.parent == null || n.ce ? n.vnode.appContext && n.vnode.appContext.provides : n.parent.provides : void 0;
    if (i && t in i)
      return i[t];
    if (arguments.length > 1)
      return s && R(e) ? e.call(n && n.proxy) : e;
  }
}
const Ur = /* @__PURE__ */ Symbol.for("v-scx"), Br = () => Je(Ur);
function Ss(t, e, s) {
  return _i(t, e, s);
}
function _i(t, e, s = q) {
  const { immediate: n, deep: i, flush: r, once: l } = s, o = et({}, s), f = e && n || !e && r !== "post";
  let d;
  if (Fe) {
    if (r === "sync") {
      const E = Br();
      d = E.__watcherHandles || (E.__watcherHandles = []);
    } else if (!f) {
      const E = () => {
      };
      return E.stop = At, E.resume = At, E.pause = At, E;
    }
  }
  const a = ot;
  o.call = (E, D, T) => bt(E, a, D, T);
  let h = !1;
  r === "post" ? o.scheduler = (E) => {
    ct(E, a && a.suspense);
  } : r !== "sync" && (h = !0, o.scheduler = (E, D) => {
    D ? E() : Ys(E);
  }), o.augmentJob = (E) => {
    e && (E.flags |= 4), h && (E.flags |= 2, a && (E.id = a.uid, E.i = a));
  };
  const S = Dr(t, e, o);
  return Fe && (d ? d.push(S) : f && S()), S;
}
function Kr(t, e, s) {
  const n = this.proxy, i = Y(t) ? t.includes(".") ? yi(n, t) : () => n[t] : t.bind(n, n);
  let r;
  R(e) ? r = e : (r = e.handler, s = e);
  const l = je(this), o = _i(i, r.bind(n), s);
  return l(), o;
}
function yi(t, e) {
  const s = e.split(".");
  return () => {
    let n = t;
    for (let i = 0; i < s.length && n; i++)
      n = n[s[i]];
    return n;
  };
}
const Wr = /* @__PURE__ */ Symbol("_vte"), ds = (t) => t.__isTeleport, Es = /* @__PURE__ */ Symbol("_leaveCb");
function kr(t) {
  let e = t[0];
  if (t.length > 1) {
    for (const s of t)
      if (s.type !== Ht) {
        e = s;
        break;
      }
  }
  return e;
}
function xi(t) {
  if (!Qs(t))
    return ds(t.type) && t.children ? kr(t.children) : t;
  if (t.component)
    return t.component.subTree;
  const { shapeFlag: e, children: s } = t;
  if (s) {
    if (e & 16)
      return s[0];
    if (e & 32 && R(s.default))
      return s.default();
  }
}
function Xs(t, e) {
  if (t.shapeFlag & 6 && t.component) {
    t.transition = e;
    const s = t.component.subTree;
    Xs(
      ds(s.type) && xi(s) || s,
      e
    );
  } else t.shapeFlag & 128 ? (t.ssContent.transition = e.clone(t.ssContent), t.ssFallback.transition = e.clone(t.ssFallback)) : t.transition = e;
}
// @__NO_SIDE_EFFECTS__
function Zs(t, e) {
  return R(t) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    et({ name: t.name }, e, { setup: t })
  ) : t;
}
function wi(t) {
  t.ids = [t.ids[0] + t.ids[2]++ + "-", 0, 0];
}
function mn(t, e) {
  let s;
  return !!((s = Object.getOwnPropertyDescriptor(t, e)) && !s.configurable);
}
const es = /* @__PURE__ */ new WeakMap();
function Se(t, e, s, n, i = !1) {
  if (M(t)) {
    t.forEach(
      (T, J) => Se(
        T,
        e && (M(e) ? e[J] : e),
        s,
        n,
        i
      )
    );
    return;
  }
  if (Ee(n) && !i) {
    n.shapeFlag & 512 && n.type.__asyncResolved && n.component.subTree.component && Se(t, e, s, n.component.subTree);
    return;
  }
  const r = n.shapeFlag & 4 ? sn(n.component) : n.el, l = i ? null : r, { i: o, r: f } = t, d = e && e.r, a = o.refs === q ? o.refs = {} : o.refs, h = o.setupState, S = /* @__PURE__ */ N(h), E = h === q ? Bn : (T) => mn(a, T) ? !1 : $(S, T), D = (T, J) => !(J && mn(a, J));
  if (d != null && d !== f) {
    if (vn(e), Y(d))
      a[d] = null, E(d) && (h[d] = null);
    else if (/* @__PURE__ */ lt(d)) {
      const T = e;
      D(d, T.k) && (d.value = null), T.k && (a[T.k] = null);
    }
  }
  if (R(f))
    $e(f, o, 12, [l, a]);
  else {
    const T = Y(f), J = /* @__PURE__ */ lt(f);
    if (T || J) {
      const G = () => {
        if (t.f) {
          const L = T ? E(f) ? h[f] : a[f] : D() || !t.k ? f.value : a[t.k];
          if (i)
            M(L) && Us(L, r);
          else if (M(L))
            L.includes(r) || L.push(r);
          else if (T)
            a[f] = [r], E(f) && (h[f] = a[f]);
          else {
            const j = [r];
            D(f, t.k) && (f.value = j), t.k && (a[t.k] = j);
          }
        } else T ? (a[f] = l, E(f) && (h[f] = l)) : J && (D(f, t.k) && (f.value = l), t.k && (a[t.k] = l));
      };
      if (l) {
        const L = () => {
          G(), es.delete(t);
        };
        L.id = -1, es.set(t, L), ct(L, s);
      } else
        vn(t), G();
    }
  }
}
function vn(t) {
  const e = es.get(t);
  e && (e.flags |= 8, es.delete(t));
}
cs().requestIdleCallback;
cs().cancelIdleCallback;
const Ee = (t) => !!t.type.__asyncLoader, Qs = (t) => t.type.__isKeepAlive;
function qr(t, e) {
  Ci(t, "a", e);
}
function Jr(t, e) {
  Ci(t, "da", e);
}
function Ci(t, e, s = ot) {
  const n = t.__wdc || (t.__wdc = () => {
    let i = s;
    for (; i; ) {
      if (i.isDeactivated)
        return;
      i = i.parent;
    }
    return t();
  });
  if (ps(e, n, s), s) {
    let i = s.parent;
    for (; i && i.parent; )
      Qs(i.parent.vnode) && Gr(n, e, s, i), i = i.parent;
  }
}
function Gr(t, e, s, n) {
  const i = ps(
    e,
    t,
    n,
    !0
    /* prepend */
  );
  Si(() => {
    Us(n[e], i);
  }, s);
}
function ps(t, e, s = ot, n = !1) {
  if (s) {
    const i = s[t] || (s[t] = []), r = e.__weh || (e.__weh = (...l) => {
      Dt();
      const o = je(s), f = bt(e, s, t, l);
      return o(), $t(), f;
    });
    return n ? i.unshift(r) : i.push(r), r;
  }
}
const Nt = (t) => (e, s = ot) => {
  (!Fe || t === "sp") && ps(t, (...n) => e(...n), s);
}, zr = Nt("bm"), Yr = Nt("m"), Xr = Nt(
  "bu"
), Zr = Nt("u"), Qr = Nt(
  "bum"
), Si = Nt("um"), to = Nt(
  "sp"
), eo = Nt("rtg"), so = Nt("rtc");
function no(t, e = ot) {
  ps("ec", t, e);
}
const io = /* @__PURE__ */ Symbol.for("v-ndc");
function ro(t, e, s, n) {
  let i;
  const r = s, l = M(t);
  if (l || Y(t)) {
    const o = l && /* @__PURE__ */ Qt(t);
    let f = !1, d = !1;
    o && (f = !/* @__PURE__ */ gt(t), d = /* @__PURE__ */ kt(t), t = us(t)), i = new Array(t.length);
    for (let a = 0, h = t.length; a < h; a++)
      i[a] = e(
        f ? d ? fe(jt(t[a])) : jt(t[a]) : t[a],
        a,
        void 0,
        r
      );
  } else if (typeof t == "number") {
    i = new Array(t);
    for (let o = 0; o < t; o++)
      i[o] = e(o + 1, o, void 0, r);
  } else if (V(t))
    if (t[Symbol.iterator])
      i = Array.from(
        t,
        (o, f) => e(o, f, void 0, r)
      );
    else {
      const o = Object.keys(t);
      i = new Array(o.length);
      for (let f = 0, d = o.length; f < d; f++) {
        const a = o[f];
        i[f] = e(t[a], a, f, r);
      }
    }
  else
    i = [];
  return i;
}
const Ds = (t) => t ? qi(t) ? sn(t) : Ds(t.parent) : null, Te = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ et(/* @__PURE__ */ Object.create(null), {
    $: (t) => t,
    $el: (t) => t.vnode.el,
    $data: (t) => t.data,
    $props: (t) => t.props,
    $attrs: (t) => t.attrs,
    $slots: (t) => t.slots,
    $refs: (t) => t.refs,
    $parent: (t) => Ds(t.parent),
    $root: (t) => Ds(t.root),
    $host: (t) => t.ce,
    $emit: (t) => t.emit,
    $options: (t) => Ti(t),
    $forceUpdate: (t) => t.f || (t.f = () => {
      Ys(t.update);
    }),
    $nextTick: (t) => t.n || (t.n = hi.bind(t.proxy)),
    $watch: (t) => Kr.bind(t)
  })
), Ts = (t, e) => t !== q && !t.__isScriptSetup && $(t, e), oo = {
  get({ _: t }, e) {
    if (e === "__v_skip")
      return !0;
    const { ctx: s, setupState: n, data: i, props: r, accessCache: l, type: o, appContext: f } = t;
    if (e[0] !== "$") {
      const S = l[e];
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
        if (Ts(n, e))
          return l[e] = 1, n[e];
        if (i !== q && $(i, e))
          return l[e] = 2, i[e];
        if ($(r, e))
          return l[e] = 3, r[e];
        if (s !== q && $(s, e))
          return l[e] = 4, s[e];
        $s && (l[e] = 0);
      }
    }
    const d = Te[e];
    let a, h;
    if (d)
      return e === "$attrs" && st(t.attrs, "get", ""), d(t);
    if (
      // css module (injected by vue-loader)
      (a = o.__cssModules) && (a = a[e])
    )
      return a;
    if (s !== q && $(s, e))
      return l[e] = 4, s[e];
    if (
      // global properties
      h = f.config.globalProperties, $(h, e)
    )
      return h[e];
  },
  set({ _: t }, e, s) {
    const { data: n, setupState: i, ctx: r } = t;
    return Ts(i, e) ? (i[e] = s, !0) : n !== q && $(n, e) ? (n[e] = s, !0) : $(t.props, e) || e[0] === "$" && e.slice(1) in t ? !1 : (r[e] = s, !0);
  },
  has({
    _: { data: t, setupState: e, accessCache: s, ctx: n, appContext: i, props: r, type: l }
  }, o) {
    let f;
    return !!(s[o] || t !== q && o[0] !== "$" && $(t, o) || Ts(e, o) || $(r, o) || $(n, o) || $(Te, o) || $(i.config.globalProperties, o) || (f = l.__cssModules) && f[o]);
  },
  defineProperty(t, e, s) {
    return s.get != null ? t._.accessCache[e] = 0 : $(s, "value") && this.set(t, e, s.value, null), Reflect.defineProperty(t, e, s);
  }
};
function _n(t) {
  return M(t) ? t.reduce(
    (e, s) => (e[s] = null, e),
    {}
  ) : t;
}
let $s = !0;
function lo(t) {
  const e = Ti(t), s = t.proxy, n = t.ctx;
  $s = !1, e.beforeCreate && yn(e.beforeCreate, t, "bc");
  const {
    // state
    data: i,
    computed: r,
    methods: l,
    watch: o,
    provide: f,
    inject: d,
    // lifecycle
    created: a,
    beforeMount: h,
    mounted: S,
    beforeUpdate: E,
    updated: D,
    activated: T,
    deactivated: J,
    beforeDestroy: G,
    beforeUnmount: L,
    destroyed: j,
    unmounted: I,
    render: Z,
    renderTracked: mt,
    renderTriggered: vt,
    errorCaptured: Vt,
    serverPrefetch: He,
    // public API
    expose: qt,
    inheritAttrs: ae,
    // assets
    components: Ne,
    directives: Ve,
    filters: bs
  } = e;
  if (d && co(d, n, null), l)
    for (const z in l) {
      const K = l[z];
      R(K) && (n[z] = K.bind(s));
    }
  if (i) {
    const z = i.call(s, s);
    V(z) && (t.data = /* @__PURE__ */ De(z));
  }
  if ($s = !0, r)
    for (const z in r) {
      const K = r[z], Jt = R(K) ? K.bind(s, s) : R(K.get) ? K.get.bind(s, s) : At, Ue = !R(K) && R(K.set) ? K.set.bind(s) : At, Gt = nn({
        get: Jt,
        set: Ue
      });
      Object.defineProperty(n, z, {
        enumerable: !0,
        configurable: !0,
        get: () => Gt.value,
        set: (_t) => Gt.value = _t
      });
    }
  if (o)
    for (const z in o)
      Ei(o[z], n, s, z);
  if (f) {
    const z = R(f) ? f.call(s) : f;
    Reflect.ownKeys(z).forEach((K) => {
      Vr(K, z[K]);
    });
  }
  a && yn(a, t, "c");
  function nt(z, K) {
    M(K) ? K.forEach((Jt) => z(Jt.bind(s))) : K && z(K.bind(s));
  }
  if (nt(zr, h), nt(Yr, S), nt(Xr, E), nt(Zr, D), nt(qr, T), nt(Jr, J), nt(no, Vt), nt(so, mt), nt(eo, vt), nt(Qr, L), nt(Si, I), nt(to, He), M(qt))
    if (qt.length) {
      const z = t.exposed || (t.exposed = {});
      qt.forEach((K) => {
        Object.defineProperty(z, K, {
          get: () => s[K],
          set: (Jt) => s[K] = Jt,
          enumerable: !0
        });
      });
    } else t.exposed || (t.exposed = {});
  Z && t.render === At && (t.render = Z), ae != null && (t.inheritAttrs = ae), Ne && (t.components = Ne), Ve && (t.directives = Ve), He && wi(t);
}
function co(t, e, s = At) {
  M(t) && (t = js(t));
  for (const n in t) {
    const i = t[n];
    let r;
    V(i) ? "default" in i ? r = Je(
      i.from || n,
      i.default,
      !0
    ) : r = Je(i.from || n) : r = Je(i), /* @__PURE__ */ lt(r) ? Object.defineProperty(e, n, {
      enumerable: !0,
      configurable: !0,
      get: () => r.value,
      set: (l) => r.value = l
    }) : e[n] = r;
  }
}
function yn(t, e, s) {
  bt(
    M(t) ? t.map((n) => n.bind(e.proxy)) : t.bind(e.proxy),
    e,
    s
  );
}
function Ei(t, e, s, n) {
  let i = n.includes(".") ? yi(s, n) : () => s[n];
  if (Y(t)) {
    const r = e[t];
    R(r) && Ss(i, r);
  } else if (R(t))
    Ss(i, t.bind(s));
  else if (V(t))
    if (M(t))
      t.forEach((r) => Ei(r, e, s, n));
    else {
      const r = R(t.handler) ? t.handler.bind(s) : e[t.handler];
      R(r) && Ss(i, r, t);
    }
}
function Ti(t) {
  const e = t.type, { mixins: s, extends: n } = e, {
    mixins: i,
    optionsCache: r,
    config: { optionMergeStrategies: l }
  } = t.appContext, o = r.get(e);
  let f;
  return o ? f = o : !i.length && !s && !n ? f = e : (f = {}, i.length && i.forEach(
    (d) => ss(f, d, l, !0)
  ), ss(f, e, l)), V(e) && r.set(e, f), f;
}
function ss(t, e, s, n = !1) {
  const { mixins: i, extends: r } = e;
  r && ss(t, r, s, !0), i && i.forEach(
    (l) => ss(t, l, s, !0)
  );
  for (const l in e)
    if (!(n && l === "expose")) {
      const o = fo[l] || s && s[l];
      t[l] = o ? o(t[l], e[l]) : e[l];
    }
  return t;
}
const fo = {
  data: xn,
  props: wn,
  emits: wn,
  // objects
  methods: me,
  computed: me,
  // lifecycle
  beforeCreate: it,
  created: it,
  beforeMount: it,
  mounted: it,
  beforeUpdate: it,
  updated: it,
  beforeDestroy: it,
  beforeUnmount: it,
  destroyed: it,
  unmounted: it,
  activated: it,
  deactivated: it,
  errorCaptured: it,
  serverPrefetch: it,
  // assets
  components: me,
  directives: me,
  // watch
  watch: ao,
  // provide / inject
  provide: xn,
  inject: uo
};
function xn(t, e) {
  return e ? t ? function() {
    return et(
      R(t) ? t.call(this, this) : t,
      R(e) ? e.call(this, this) : e
    );
  } : e : t;
}
function uo(t, e) {
  return me(js(t), js(e));
}
function js(t) {
  if (M(t)) {
    const e = {};
    for (let s = 0; s < t.length; s++)
      e[t[s]] = t[s];
    return e;
  }
  return t;
}
function it(t, e) {
  return t ? [...new Set([].concat(t, e))] : e;
}
function me(t, e) {
  return t ? et(/* @__PURE__ */ Object.create(null), t, e) : e;
}
function wn(t, e) {
  return t ? M(t) && M(e) ? [.../* @__PURE__ */ new Set([...t, ...e])] : et(
    /* @__PURE__ */ Object.create(null),
    _n(t),
    _n(e ?? {})
  ) : e;
}
function ao(t, e) {
  if (!t) return e;
  if (!e) return t;
  const s = et(/* @__PURE__ */ Object.create(null), t);
  for (const n in e)
    s[n] = it(t[n], e[n]);
  return s;
}
function Oi() {
  return {
    app: null,
    config: {
      isNativeTag: Bn,
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
let po = 0;
function ho(t, e) {
  return function(n, i = null) {
    R(n) || (n = et({}, n)), i != null && !V(i) && (i = null);
    const r = Oi(), l = /* @__PURE__ */ new WeakSet(), o = [];
    let f = !1;
    const d = r.app = {
      _uid: po++,
      _component: n,
      _props: i,
      _container: null,
      _context: r,
      _instance: null,
      version: qo,
      get config() {
        return r.config;
      },
      set config(a) {
      },
      use(a, ...h) {
        return l.has(a) || (a && R(a.install) ? (l.add(a), a.install(d, ...h)) : R(a) && (l.add(a), a(d, ...h))), d;
      },
      mixin(a) {
        return r.mixins.includes(a) || r.mixins.push(a), d;
      },
      component(a, h) {
        return h ? (r.components[a] = h, d) : r.components[a];
      },
      directive(a, h) {
        return h ? (r.directives[a] = h, d) : r.directives[a];
      },
      mount(a, h, S) {
        if (!f) {
          const E = d._ceVNode || ft(n, i);
          return E.appContext = r, S === !0 ? S = "svg" : S === !1 && (S = void 0), t(E, a, S), f = !0, d._container = a, a.__vue_app__ = d, sn(E.component);
        }
      },
      onUnmount(a) {
        o.push(a);
      },
      unmount() {
        f && (bt(
          o,
          d._instance,
          16
        ), t(null, d._container), delete d._container.__vue_app__);
      },
      provide(a, h) {
        return r.provides[a] = h, d;
      },
      runWithContext(a) {
        const h = le;
        le = d;
        try {
          return a();
        } finally {
          le = h;
        }
      }
    };
    return d;
  };
}
let le = null;
const go = (t, e) => e === "modelValue" || e === "model-value" ? t.modelModifiers : t[`${e}Modifiers`] || t[`${pt(e)}Modifiers`] || t[`${se(e)}Modifiers`];
function bo(t, e, ...s) {
  if (t.isUnmounted) return;
  const n = t.vnode.props || q;
  let i = s;
  const r = e.startsWith("update:"), l = r && go(n, e.slice(7));
  l && (l.trim && (i = s.map((a) => Y(a) ? a.trim() : a)), l.number && (i = i.map(sr)));
  let o, f = n[o = vs(e)] || // also try camelCase event handler (#2249)
  n[o = vs(pt(e))];
  !f && r && (f = n[o = vs(se(e))]), f && bt(
    f,
    t,
    6,
    i
  );
  const d = n[o + "Once"];
  if (d) {
    if (!t.emitted)
      t.emitted = {};
    else if (t.emitted[o])
      return;
    t.emitted[o] = !0, bt(
      d,
      t,
      6,
      i
    );
  }
}
const mo = /* @__PURE__ */ new WeakMap();
function Ai(t, e, s = !1) {
  const n = s ? mo : e.emitsCache, i = n.get(t);
  if (i !== void 0)
    return i;
  const r = t.emits;
  let l = {}, o = !1;
  if (!R(t)) {
    const f = (d) => {
      const a = Ai(d, e, !0);
      a && (o = !0, et(l, a));
    };
    !s && e.mixins.length && e.mixins.forEach(f), t.extends && f(t.extends), t.mixins && t.mixins.forEach(f);
  }
  return !r && !o ? (V(t) && n.set(t, null), null) : (M(r) ? r.forEach((f) => l[f] = null) : et(l, r), V(t) && n.set(t, l), l);
}
function hs(t, e) {
  return !t || !rs(e) ? !1 : (e = e.slice(2), e = e === "Once" ? e : e.replace(/Once$/, ""), $(t, e[0].toLowerCase() + e.slice(1)) || $(t, se(e)) || $(t, e));
}
function Cn(t) {
  const {
    type: e,
    vnode: s,
    proxy: n,
    withProxy: i,
    propsOptions: [r],
    slots: l,
    attrs: o,
    emit: f,
    render: d,
    renderCache: a,
    props: h,
    data: S,
    setupState: E,
    ctx: D,
    inheritAttrs: T
  } = t, J = ts(t);
  let G, L;
  try {
    if (s.shapeFlag & 4) {
      const I = i || n, Z = I;
      G = Tt(
        d.call(
          Z,
          I,
          a,
          h,
          E,
          S,
          D
        )
      ), L = o;
    } else {
      const I = e;
      G = Tt(
        I.length > 1 ? I(
          h,
          { attrs: o, slots: l, emit: f }
        ) : I(
          h,
          null
        )
      ), L = e.props ? o : vo(o);
    }
  } catch (I) {
    te.length = 0, as(I, t, 1), G = ft(Ht);
  }
  let j = G;
  if (L && T !== !1) {
    const I = Object.keys(L), { shapeFlag: Z } = j;
    I.length && Z & 7 && (r && I.some(os) && (L = _o(
      L,
      r
    )), j = ue(j, L, !1, !0));
  }
  if (s.dirs && (j = ue(j, null, !1, !0), j.dirs = j.dirs ? j.dirs.concat(s.dirs) : s.dirs), s.transition) {
    const I = ds(j.type) && xi(j) || j;
    Xs(I, s.transition);
  }
  return G = j, ts(J), G;
}
const vo = (t) => {
  let e;
  for (const s in t)
    (s === "class" || s === "style" || rs(s)) && ((e || (e = {}))[s] = t[s]);
  return e;
}, _o = (t, e) => {
  const s = {};
  for (const n in t)
    (!os(n) || !(n.slice(9) in e)) && (s[n] = t[n]);
  return s;
};
function yo(t, e, s) {
  const { props: n, children: i, component: r } = t, { props: l, children: o, patchFlag: f } = e, d = r.emitsOptions;
  if (e.dirs || e.transition)
    return !0;
  if (s && f >= 0) {
    if (f & 1024)
      return !0;
    if (f & 16)
      return n ? Sn(n, l, d) : !!l;
    if (f & 8) {
      const a = e.dynamicProps;
      for (let h = 0; h < a.length; h++) {
        const S = a[h];
        if (Ii(l, n, S) && !hs(d, S))
          return !0;
      }
    }
  } else
    return (i || o) && (!o || !o.$stable) ? !0 : n === l ? !1 : n ? l ? Sn(n, l, d) : !0 : !!l;
  return !1;
}
function Sn(t, e, s) {
  const n = Object.keys(e);
  if (n.length !== Object.keys(t).length)
    return !0;
  for (let i = 0; i < n.length; i++) {
    const r = n[i];
    if (Ii(e, t, r) && !hs(s, r))
      return !0;
  }
  return !1;
}
function Ii(t, e, s) {
  const n = t[s], i = e[s];
  return s === "style" && V(n) && V(i) ? !fs(n, i) : n !== i;
}
function xo({ vnode: t, parent: e, suspense: s }, n) {
  for (; e; ) {
    const i = e.subTree;
    if (i.suspense && i.suspense.activeBranch === t && (i.suspense.vnode.el = i.el = n, t = i), i === t)
      (t = e.vnode).el = n, e = e.parent;
    else
      break;
  }
  s && s.activeBranch === t && (s.vnode.el = n);
}
const Pi = {}, Mi = () => Object.create(Pi), Ri = (t) => Object.getPrototypeOf(t) === Pi;
function wo(t, e, s, n = !1) {
  const i = {}, r = Mi();
  t.propsDefaults = /* @__PURE__ */ Object.create(null), Fi(t, e, i, r);
  for (const l in t.propsOptions[0])
    l in i || (i[l] = void 0);
  s ? t.props = n ? i : /* @__PURE__ */ Ir(i) : t.type.props ? t.props = i : t.props = r, t.attrs = r;
}
function Co(t, e, s, n) {
  const {
    props: i,
    attrs: r,
    vnode: { patchFlag: l }
  } = t, o = /* @__PURE__ */ N(i), [f] = t.propsOptions;
  let d = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    (n || l > 0) && !(l & 16)
  ) {
    if (l & 8) {
      const a = t.vnode.dynamicProps;
      for (let h = 0; h < a.length; h++) {
        let S = a[h];
        if (hs(t.emitsOptions, S))
          continue;
        const E = e[S];
        if (f)
          if ($(r, S))
            E !== r[S] && (r[S] = E, d = !0);
          else {
            const D = pt(S);
            i[D] = Hs(
              f,
              o,
              D,
              E,
              t,
              !1
            );
          }
        else
          E !== r[S] && (r[S] = E, d = !0);
      }
    }
  } else {
    Fi(t, e, i, r) && (d = !0);
    let a;
    for (const h in o)
      (!e || // for camelCase
      !$(e, h) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((a = se(h)) === h || !$(e, a))) && (f ? s && // for camelCase
      (s[h] !== void 0 || // for kebab-case
      s[a] !== void 0) && (i[h] = Hs(
        f,
        o,
        h,
        void 0,
        t,
        !0
      )) : delete i[h]);
    if (r !== o)
      for (const h in r)
        (!e || !$(e, h)) && (delete r[h], d = !0);
  }
  d && Lt(t.attrs, "set", "");
}
function Fi(t, e, s, n) {
  const [i, r] = t.propsOptions;
  let l = !1, o;
  if (e)
    for (let f in e) {
      if (ye(f))
        continue;
      const d = e[f];
      let a;
      i && $(i, a = pt(f)) ? !r || !r.includes(a) ? s[a] = d : (o || (o = {}))[a] = d : hs(t.emitsOptions, f) || (!(f in n) || d !== n[f]) && (n[f] = d, l = !0);
    }
  if (r) {
    const f = /* @__PURE__ */ N(s), d = o || q;
    for (let a = 0; a < r.length; a++) {
      const h = r[a];
      s[h] = Hs(
        i,
        f,
        h,
        d[h],
        t,
        !$(d, h)
      );
    }
  }
  return l;
}
function Hs(t, e, s, n, i, r) {
  const l = t[s];
  if (l != null) {
    const o = $(l, "default");
    if (o && n === void 0) {
      const f = l.default;
      if (l.type !== Function && !l.skipFactory && R(f)) {
        const { propsDefaults: d } = i;
        if (s in d)
          n = d[s];
        else {
          const a = je(i);
          n = d[s] = f.call(
            null,
            e
          ), a();
        }
      } else
        n = f;
      i.ce && i.ce._setProp(s, n);
    }
    l[
      0
      /* shouldCast */
    ] && (r && !o ? n = !1 : l[
      1
      /* shouldCastTrue */
    ] && (n === "" || n === se(s)) && (n = !0));
  }
  return n;
}
const So = /* @__PURE__ */ new WeakMap();
function Li(t, e, s = !1) {
  const n = s ? So : e.propsCache, i = n.get(t);
  if (i)
    return i;
  const r = t.props, l = {}, o = [];
  let f = !1;
  if (!R(t)) {
    const a = (h) => {
      f = !0;
      const [S, E] = Li(h, e, !0);
      et(l, S), E && o.push(...E);
    };
    !s && e.mixins.length && e.mixins.forEach(a), t.extends && a(t.extends), t.mixins && t.mixins.forEach(a);
  }
  if (!r && !f)
    return V(t) && n.set(t, re), re;
  if (M(r))
    for (let a = 0; a < r.length; a++) {
      const h = pt(r[a]);
      En(h) && (l[h] = q);
    }
  else if (r)
    for (const a in r) {
      const h = pt(a);
      if (En(h)) {
        const S = r[a], E = l[h] = M(S) || R(S) ? { type: S } : et({}, S), D = E.type;
        let T = !1, J = !0;
        if (M(D))
          for (let G = 0; G < D.length; ++G) {
            const L = D[G], j = R(L) && L.name;
            if (j === "Boolean") {
              T = !0;
              break;
            } else j === "String" && (J = !1);
          }
        else
          T = R(D) && D.name === "Boolean";
        E[
          0
          /* shouldCast */
        ] = T, E[
          1
          /* shouldCastTrue */
        ] = J, (T || $(E, "default")) && o.push(h);
      }
    }
  const d = [l, o];
  return V(t) && n.set(t, d), d;
}
function En(t) {
  return t[0] !== "$" && !ye(t);
}
const tn = (t) => t === "_" || t === "_ctx" || t === "$stable", en = (t) => M(t) ? t.map(Tt) : [Tt(t)], Eo = (t, e, s) => {
  if (e._n)
    return e;
  const n = Nr((...i) => en(e(...i)), s);
  return n._c = !1, n;
}, Di = (t, e, s) => {
  const n = t._ctx;
  for (const i in t) {
    if (tn(i)) continue;
    const r = t[i];
    if (R(r))
      e[i] = Eo(i, r, n);
    else if (r != null) {
      const l = en(r);
      e[i] = () => l;
    }
  }
}, $i = (t, e) => {
  const s = en(e);
  t.slots.default = () => s;
}, ji = (t, e, s) => {
  for (const n in e)
    (s || !tn(n)) && (t[n] = e[n]);
}, To = (t, e, s) => {
  const n = t.slots = Mi();
  if (t.vnode.shapeFlag & 32) {
    const i = e._;
    i ? (ji(n, e, s), s && Jn(n, "_", i, !0)) : Di(e, n);
  } else e && $i(t, e);
}, Oo = (t, e, s) => {
  const { vnode: n, slots: i } = t;
  let r = !0, l = q;
  if (n.shapeFlag & 32) {
    const o = e._;
    o ? s && o === 1 ? r = !1 : ji(i, e, s) : (r = !e.$stable, Di(e, i)), l = e;
  } else e && ($i(t, e), l = { default: 1 });
  if (r)
    for (const o in i)
      !tn(o) && l[o] == null && delete i[o];
}, ct = Ro;
function Ao(t) {
  return Io(t);
}
function Io(t, e) {
  const s = cs();
  s.__VUE__ = !0;
  const {
    insert: n,
    remove: i,
    patchProp: r,
    createElement: l,
    createText: o,
    createComment: f,
    setText: d,
    setElementText: a,
    parentNode: h,
    nextSibling: S,
    setScopeId: E = At,
    insertStaticContent: D
  } = t, T = (c, u, p, v = null, m = null, g = null, x = void 0, y = null, _ = !!u.dynamicChildren) => {
    if (c === u)
      return;
    c && !be(c, u) && (v = Be(c), _t(c, m, g, !0), c = null), u.patchFlag === -2 && (_ = !1, u.dynamicChildren = null);
    const { type: b, ref: A, shapeFlag: C } = u;
    switch (b) {
      case gs:
        J(c, u, p, v);
        break;
      case Ht:
        G(c, u, p, v);
        break;
      case Ge:
        c == null && L(u, p, v, x);
        break;
      case dt:
        Ne(
          c,
          u,
          p,
          v,
          m,
          g,
          x,
          y,
          _
        );
        break;
      default:
        C & 1 ? Z(
          c,
          u,
          p,
          v,
          m,
          g,
          x,
          y,
          _
        ) : C & 6 ? Ve(
          c,
          u,
          p,
          v,
          m,
          g,
          x,
          y,
          _
        ) : (C & 64 || C & 128) && b.process(
          c,
          u,
          p,
          v,
          m,
          g,
          x,
          y,
          _,
          pe
        );
    }
    A != null && m ? Se(A, c && c.ref, g, u || c, !u) : A == null && c && c.ref != null && Se(c.ref, null, g, c, !0);
  }, J = (c, u, p, v) => {
    if (c == null)
      n(
        u.el = o(u.children),
        p,
        v
      );
    else {
      const m = u.el = c.el;
      u.children !== c.children && d(m, u.children);
    }
  }, G = (c, u, p, v) => {
    c == null ? n(
      u.el = f(u.children || ""),
      p,
      v
    ) : u.el = c.el;
  }, L = (c, u, p, v) => {
    [c.el, c.anchor] = D(
      c.children,
      u,
      p,
      v,
      c.el,
      c.anchor
    );
  }, j = ({ el: c, anchor: u }, p, v) => {
    let m;
    for (; c && c !== u; )
      m = S(c), n(c, p, v), c = m;
    n(u, p, v);
  }, I = ({ el: c, anchor: u }) => {
    let p;
    for (; c && c !== u; )
      p = S(c), i(c), c = p;
    i(u);
  }, Z = (c, u, p, v, m, g, x, y, _) => {
    if (u.type === "svg" ? x = "svg" : u.type === "math" && (x = "mathml"), c == null)
      mt(
        u,
        p,
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
        b && b._beginPatch(), He(
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
  }, mt = (c, u, p, v, m, g, x, y) => {
    let _, b;
    const { props: A, shapeFlag: C, transition: O, dirs: P } = c;
    if (_ = c.el = l(
      c.type,
      g,
      A && A.is,
      A
    ), C & 8 ? a(_, c.children) : C & 16 && Vt(
      c.children,
      _,
      null,
      v,
      m,
      Os(c, g),
      x,
      y
    ), P && zt(c, null, v, "created"), vt(_, c, c.scopeId, x, v), A) {
      for (const U in A)
        U !== "value" && !ye(U) && r(_, U, null, A[U], g, v);
      "value" in A && r(_, "value", null, A.value, g), (b = A.onVnodeBeforeMount) && Ct(b, v, c);
    }
    P && zt(c, null, v, "beforeMount");
    const F = Po(m, O);
    F && O.beforeEnter(_), n(_, u, p), ((b = A && A.onVnodeMounted) || F || P) && ct(() => {
      b && Ct(b, v, c), F && O.enter(_), P && zt(c, null, v, "mounted");
    }, m);
  }, vt = (c, u, p, v, m) => {
    if (p && E(c, p), v)
      for (let g = 0; g < v.length; g++)
        E(c, v[g]);
    if (m) {
      let g = m.subTree;
      if (u === g || Ui(g.type) && (g.ssContent === u || g.ssFallback === u)) {
        const x = m.vnode;
        vt(
          c,
          x,
          x.scopeId,
          x.slotScopeIds,
          m.parent
        );
      }
    }
  }, Vt = (c, u, p, v, m, g, x, y, _ = 0) => {
    for (let b = _; b < c.length; b++) {
      const A = c[b] = y ? Rt(c[b]) : Tt(c[b]);
      T(
        null,
        A,
        u,
        p,
        v,
        m,
        g,
        x,
        y
      );
    }
  }, He = (c, u, p, v, m, g, x) => {
    const y = u.el = c.el;
    let { patchFlag: _, dynamicChildren: b, dirs: A } = u;
    _ |= c.patchFlag & 16;
    const C = c.props || q, O = u.props || q;
    let P;
    if (p && Yt(p, !1), (P = O.onVnodeBeforeUpdate) && Ct(P, p, u, c), A && zt(u, c, p, "beforeUpdate"), p && Yt(p, !0), // #6385 the old vnode may be a user-wrapped non-isomorphic block
    // Force full diff when block metadata is unstable.
    b && (!c.dynamicChildren || c.dynamicChildren.length !== b.length) && (_ = 0, x = !1, b = null), (C.innerHTML && O.innerHTML == null || C.textContent && O.textContent == null) && a(y, ""), b ? qt(
      c.dynamicChildren,
      b,
      y,
      p,
      v,
      Os(u, m),
      g
    ) : x || K(
      c,
      u,
      y,
      null,
      p,
      v,
      Os(u, m),
      g,
      !1
    ), _ > 0) {
      if (_ & 16)
        ae(y, C, O, p, m);
      else if (_ & 2 && C.class !== O.class && r(y, "class", null, O.class, m), _ & 4 && r(y, "style", C.style, O.style, m), _ & 8) {
        const F = u.dynamicProps;
        for (let U = 0; U < F.length; U++) {
          const H = F[U], X = C[H], Q = O[H];
          (Q !== X || H === "value") && r(y, H, X, Q, m, p);
        }
      }
      _ & 1 && c.children !== u.children && a(y, u.children);
    } else !x && b == null && ae(y, C, O, p, m);
    ((P = O.onVnodeUpdated) || A) && ct(() => {
      P && Ct(P, p, u, c), A && zt(u, c, p, "updated");
    }, v);
  }, qt = (c, u, p, v, m, g, x) => {
    for (let y = 0; y < u.length; y++) {
      const _ = c[y], b = u[y], A = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        _.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (_.type === dt || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !be(_, b) || // - In the case of a component, it could contain anything.
        _.shapeFlag & 198) ? h(_.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          p
        )
      );
      T(
        _,
        b,
        A,
        null,
        v,
        m,
        g,
        x,
        !0
      );
    }
  }, ae = (c, u, p, v, m) => {
    if (u !== p) {
      if (u !== q)
        for (const g in u)
          !ye(g) && !(g in p) && r(
            c,
            g,
            u[g],
            null,
            m,
            v
          );
      for (const g in p) {
        if (ye(g)) continue;
        const x = p[g], y = u[g];
        x !== y && g !== "value" && r(c, g, y, x, m, v);
      }
      "value" in p && r(c, "value", u.value, p.value, m);
    }
  }, Ne = (c, u, p, v, m, g, x, y, _) => {
    const b = u.el = c ? c.el : o(""), A = u.anchor = c ? c.anchor : o("");
    let { patchFlag: C, dynamicChildren: O, slotScopeIds: P } = u;
    P && (y = y ? y.concat(P) : P), c == null ? (n(b, p, v), n(A, p, v), Vt(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      u.children || [],
      p,
      A,
      m,
      g,
      x,
      y,
      _
    )) : C > 0 && C & 64 && O && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    c.dynamicChildren && c.dynamicChildren.length === O.length ? (qt(
      c.dynamicChildren,
      O,
      p,
      m,
      g,
      x,
      y
    ), // #2080 if the stable fragment has a key, it's a <template v-for> that may
    //  get moved around. Make sure all root level vnodes inherit el.
    // #2134 or if it's a component root, it may also get moved around
    // as the component is being moved.
    (u.key != null || m && u === m.subTree) && Hi(
      c,
      u,
      !0
      /* shallow */
    )) : K(
      c,
      u,
      p,
      A,
      m,
      g,
      x,
      y,
      _
    );
  }, Ve = (c, u, p, v, m, g, x, y, _) => {
    u.slotScopeIds = y, c == null ? u.shapeFlag & 512 ? m.ctx.activate(
      u,
      p,
      v,
      x,
      _
    ) : bs(
      u,
      p,
      v,
      m,
      g,
      x,
      _
    ) : rn(c, u, _);
  }, bs = (c, u, p, v, m, g, x) => {
    const y = c.component = No(
      c,
      v,
      m
    );
    if (Qs(c) && (y.ctx.renderer = pe), Uo(y, !1, x), y.asyncDep) {
      if (m && m.registerDep(y, nt, x), !c.el) {
        const _ = y.subTree = ft(Ht);
        G(null, _, u, p), c.placeholder = _.el;
      }
    } else
      nt(
        y,
        c,
        u,
        p,
        m,
        g,
        x
      );
  }, rn = (c, u, p) => {
    const v = u.component = c.component;
    if (yo(c, u, p))
      if (v.asyncDep && !v.asyncResolved) {
        z(v, u, p);
        return;
      } else
        v.next = u, v.update();
    else
      u.el = c.el, v.vnode = u;
  }, nt = (c, u, p, v, m, g, x) => {
    const y = () => {
      if (c.isMounted) {
        let { next: C, bu: O, u: P, parent: F, vnode: U } = c;
        {
          const xt = Ni(c);
          if (xt) {
            C && (C.el = U.el, z(c, C, x)), xt.asyncDep.then(() => {
              ct(() => {
                c.isUnmounted || b();
              }, m);
            });
            return;
          }
        }
        let H = C, X;
        Yt(c, !1), C ? (C.el = U.el, z(c, C, x)) : C = U, O && _s(O), (X = C.props && C.props.onVnodeBeforeUpdate) && Ct(X, F, C, U), Yt(c, !0);
        const Q = Cn(c), yt = c.subTree;
        c.subTree = Q, T(
          yt,
          Q,
          // parent may have changed if it's in a teleport
          h(yt.el),
          // anchor may have changed if it's in a fragment
          Be(yt),
          c,
          m,
          g
        ), C.el = Q.el, H === null && xo(c, Q.el), P && ct(P, m), (X = C.props && C.props.onVnodeUpdated) && ct(
          () => Ct(X, F, C, U),
          m
        );
      } else {
        let C;
        const { el: O, props: P } = u, { bm: F, m: U, parent: H, root: X, type: Q } = c, yt = Ee(u);
        Yt(c, !1), F && _s(F), !yt && (C = P && P.onVnodeBeforeMount) && Ct(C, H, u), Yt(c, !0);
        {
          X.ce && X.ce._hasShadowRoot() && X.ce._injectChildStyle(
            Q,
            c.parent ? c.parent.type : void 0
          );
          const xt = c.subTree = Cn(c);
          T(
            null,
            xt,
            p,
            v,
            c,
            m,
            g
          ), u.el = xt.el;
        }
        if (U && ct(U, m), !yt && (C = P && P.onVnodeMounted)) {
          const xt = u;
          ct(
            () => Ct(C, H, xt),
            m
          );
        }
        (u.shapeFlag & 256 || H && Ee(H.vnode) && H.vnode.shapeFlag & 256) && c.a && ct(c.a, m), c.isMounted = !0, u = p = v = null;
      }
    };
    c.scope.on();
    const _ = c.effect = new Xn(y);
    c.scope.off();
    const b = c.update = _.run.bind(_), A = c.job = _.runIfDirty.bind(_);
    A.i = c, A.id = c.uid, _.scheduler = () => Ys(A), Yt(c, !0), b();
  }, z = (c, u, p) => {
    u.component = c;
    const v = c.vnode.props;
    c.vnode = u, c.next = null, Co(c, u.props, v, p), Oo(c, u.children, p), Dt(), bn(c), $t();
  }, K = (c, u, p, v, m, g, x, y, _ = !1) => {
    const b = c && c.children, A = c ? c.shapeFlag : 0, C = u.children, { patchFlag: O, shapeFlag: P } = u;
    if (O > 0) {
      if (O & 128) {
        Ue(
          b,
          C,
          p,
          v,
          m,
          g,
          x,
          y,
          _
        );
        return;
      } else if (O & 256) {
        Jt(
          b,
          C,
          p,
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
    P & 8 ? (A & 16 && de(b, m, g), C !== b && a(p, C)) : A & 16 ? P & 16 ? Ue(
      b,
      C,
      p,
      v,
      m,
      g,
      x,
      y,
      _
    ) : de(b, m, g, !0) : (A & 8 && a(p, ""), P & 16 && Vt(
      C,
      p,
      v,
      m,
      g,
      x,
      y,
      _
    ));
  }, Jt = (c, u, p, v, m, g, x, y, _) => {
    c = c || re, u = u || re;
    const b = c.length, A = u.length, C = Math.min(b, A);
    let O;
    for (O = 0; O < C; O++) {
      const P = u[O] = _ ? Rt(u[O]) : Tt(u[O]);
      T(
        c[O],
        P,
        p,
        null,
        m,
        g,
        x,
        y,
        _
      );
    }
    b > A ? de(
      c,
      m,
      g,
      !0,
      !1,
      C
    ) : Vt(
      u,
      p,
      v,
      m,
      g,
      x,
      y,
      _,
      C
    );
  }, Ue = (c, u, p, v, m, g, x, y, _) => {
    let b = 0;
    const A = u.length;
    let C = c.length - 1, O = A - 1;
    for (; b <= C && b <= O; ) {
      const P = c[b], F = u[b] = _ ? Rt(u[b]) : Tt(u[b]);
      if (be(P, F))
        T(
          P,
          F,
          p,
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
    for (; b <= C && b <= O; ) {
      const P = c[C], F = u[O] = _ ? Rt(u[O]) : Tt(u[O]);
      if (be(P, F))
        T(
          P,
          F,
          p,
          null,
          m,
          g,
          x,
          y,
          _
        );
      else
        break;
      C--, O--;
    }
    if (b > C) {
      if (b <= O) {
        const P = O + 1, F = P < A ? u[P].el : v;
        for (; b <= O; )
          T(
            null,
            u[b] = _ ? Rt(u[b]) : Tt(u[b]),
            p,
            F,
            m,
            g,
            x,
            y,
            _
          ), b++;
      }
    } else if (b > O)
      for (; b <= C; )
        _t(c[b], m, g, !0), b++;
    else {
      const P = b, F = b, U = /* @__PURE__ */ new Map();
      for (b = F; b <= O; b++) {
        const ut = u[b] = _ ? Rt(u[b]) : Tt(u[b]);
        ut.key != null && U.set(ut.key, b);
      }
      let H, X = 0;
      const Q = O - F + 1;
      let yt = !1, xt = 0;
      const he = new Array(Q);
      for (b = 0; b < Q; b++) he[b] = 0;
      for (b = P; b <= C; b++) {
        const ut = c[b];
        if (X >= Q) {
          _t(ut, m, g, !0);
          continue;
        }
        let wt;
        if (ut.key != null)
          wt = U.get(ut.key);
        else
          for (H = F; H <= O; H++)
            if (he[H - F] === 0 && be(ut, u[H])) {
              wt = H;
              break;
            }
        wt === void 0 ? _t(ut, m, g, !0) : (he[wt - F] = b + 1, wt >= xt ? xt = wt : yt = !0, T(
          ut,
          u[wt],
          p,
          null,
          m,
          g,
          x,
          y,
          _
        ), X++);
      }
      const cn = yt ? Mo(he) : re;
      for (H = cn.length - 1, b = Q - 1; b >= 0; b--) {
        const ut = F + b, wt = u[ut], fn = u[ut + 1], un = ut + 1 < A ? (
          // #13559, #14173 fallback to el placeholder for unresolved async component
          fn.el || Vi(fn)
        ) : v;
        he[b] === 0 ? T(
          null,
          wt,
          p,
          un,
          m,
          g,
          x,
          y,
          _
        ) : yt && (H < 0 || b !== cn[H] ? Gt(wt, p, un, 2) : H--);
      }
    }
  }, Gt = (c, u, p, v, m = null) => {
    const { el: g, type: x, transition: y, children: _, shapeFlag: b } = c;
    if (b & 6) {
      Gt(c.component.subTree, u, p, v);
      return;
    }
    if (b & 128) {
      c.suspense.move(u, p, v);
      return;
    }
    if (b & 64) {
      x.move(c, u, p, pe);
      return;
    }
    if (x === dt) {
      n(g, u, p);
      for (let C = 0; C < _.length; C++)
        Gt(_[C], u, p, v);
      n(c.anchor, u, p);
      return;
    }
    if (x === Ge) {
      j(c, u, p);
      return;
    }
    if (v !== 2 && b & 1 && y)
      if (v === 0)
        y.persisted && !g[Es] ? n(g, u, p) : (y.beforeEnter(g), n(g, u, p), ct(() => y.enter(g), m));
      else {
        const { leave: C, delayLeave: O, afterLeave: P } = y, F = () => {
          c.ctx.isUnmounted ? i(g) : n(g, u, p);
        }, U = () => {
          const H = g._isLeaving || !!g[Es];
          g._isLeaving && g[Es](
            !0
            /* cancelled */
          ), y.persisted && !H ? F() : C(g, () => {
            F(), P && P();
          });
        };
        O ? O(g, F, U) : U();
      }
    else
      n(g, u, p);
  }, _t = (c, u, p, v = !1, m = !1) => {
    const {
      type: g,
      props: x,
      ref: y,
      children: _,
      dynamicChildren: b,
      shapeFlag: A,
      patchFlag: C,
      dirs: O,
      cacheIndex: P,
      memo: F
    } = c;
    if (C === -2 && (m = !1), y != null && (Dt(), Se(y, null, p, c, !0), $t()), P != null && (u.renderCache[P] = void 0), A & 256) {
      u.ctx.deactivate(c);
      return;
    }
    const U = A & 1 && O, H = !Ee(c);
    let X;
    if (H && (X = x && x.onVnodeBeforeUnmount) && Ct(X, u, c), A & 6)
      Xi(c.component, p, v);
    else {
      if (A & 128) {
        c.suspense.unmount(p, v);
        return;
      }
      U && zt(c, null, u, "beforeUnmount"), A & 64 ? c.type.remove(
        c,
        u,
        p,
        pe,
        v
      ) : b && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !b.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (g !== dt || C > 0 && C & 64) ? de(
        b,
        u,
        p,
        !1,
        !0
      ) : (g === dt && C & 384 || !m && A & 16) && de(_, u, p), v && on(c);
    }
    const Q = F != null && P == null;
    (H && (X = x && x.onVnodeUnmounted) || U || Q) && ct(() => {
      X && Ct(X, u, c), U && zt(c, null, u, "unmounted"), Q && (c.el = null);
    }, p);
  }, on = (c) => {
    const { type: u, el: p, anchor: v, transition: m } = c;
    if (u === dt) {
      Yi(p, v);
      return;
    }
    if (u === Ge) {
      I(c);
      return;
    }
    const g = () => {
      i(p), m && !m.persisted && m.afterLeave && m.afterLeave();
    };
    if (c.shapeFlag & 1 && m && !m.persisted) {
      const { leave: x, delayLeave: y } = m, _ = () => x(p, g);
      y ? y(c.el, g, _) : _();
    } else
      g();
  }, Yi = (c, u) => {
    let p;
    for (; c !== u; )
      p = S(c), i(c), c = p;
    i(u);
  }, Xi = (c, u, p) => {
    const { bum: v, scope: m, job: g, subTree: x, um: y, m: _, a: b } = c;
    Tn(_), Tn(b), v && _s(v), m.stop(), g && (g.flags |= 8, _t(x, c, u, p)), y && ct(y, u), ct(() => {
      c.isUnmounted = !0;
    }, u);
  }, de = (c, u, p, v = !1, m = !1, g = 0) => {
    for (let x = g; x < c.length; x++)
      _t(c[x], u, p, v, m);
  }, Be = (c) => {
    if (c.shapeFlag & 6)
      return Be(c.component.subTree);
    if (c.shapeFlag & 128)
      return c.suspense.next();
    const u = S(c.anchor || c.el), p = u && u[Wr];
    return p ? S(p) : u;
  };
  let ms = !1;
  const ln = (c, u, p) => {
    let v;
    c == null ? u._vnode && (_t(u._vnode, null, null, !0), v = u._vnode.component) : T(
      u._vnode || null,
      c,
      u,
      null,
      null,
      null,
      p
    ), u._vnode = c, ms || (ms = !0, bn(v), bi(), ms = !1);
  }, pe = {
    p: T,
    um: _t,
    m: Gt,
    r: on,
    mt: bs,
    mc: Vt,
    pc: K,
    pbc: qt,
    n: Be,
    o: t
  };
  return {
    render: ln,
    hydrate: void 0,
    createApp: ho(ln)
  };
}
function Os({ type: t, props: e }, s) {
  return s === "svg" && t === "foreignObject" || s === "mathml" && t === "annotation-xml" && e && e.encoding && e.encoding.includes("html") ? void 0 : s;
}
function Yt({ effect: t, job: e }, s) {
  s ? (t.flags |= 32, e.flags |= 4) : (t.flags &= -33, e.flags &= -5);
}
function Po(t, e) {
  return (!t || t && !t.pendingBranch) && e && !e.persisted;
}
function Hi(t, e, s = !1) {
  const n = t.children, i = e.children;
  if (M(n) && M(i))
    for (let r = 0; r < n.length; r++) {
      const l = n[r];
      let o = i[r];
      o.shapeFlag & 1 && !o.dynamicChildren && ((o.patchFlag <= 0 || o.patchFlag === 32) && (o = i[r] = Rt(i[r]), o.el = l.el), !s && o.patchFlag !== -2 && Hi(l, o)), o.type === gs && (o.patchFlag === -1 && (o = i[r] = Rt(o)), o.el = l.el), o.type === Ht && !o.el && (o.el = l.el);
    }
}
function Mo(t) {
  const e = t.slice(), s = [0];
  let n, i, r, l, o;
  const f = t.length;
  for (n = 0; n < f; n++) {
    const d = t[n];
    if (d !== 0) {
      if (i = s[s.length - 1], t[i] < d) {
        e[n] = i, s.push(n);
        continue;
      }
      for (r = 0, l = s.length - 1; r < l; )
        o = r + l >> 1, t[s[o]] < d ? r = o + 1 : l = o;
      d < t[s[r]] && (r > 0 && (e[n] = s[r - 1]), s[r] = n);
    }
  }
  for (r = s.length, l = s[r - 1]; r-- > 0; )
    s[r] = l, l = e[l];
  return s;
}
function Ni(t) {
  const e = t.subTree.component;
  if (e)
    return e.asyncDep && !e.asyncResolved ? e : Ni(e);
}
function Tn(t) {
  if (t)
    for (let e = 0; e < t.length; e++)
      t[e].flags |= 8;
}
function Vi(t) {
  if (t.placeholder)
    return t.placeholder;
  const e = t.component;
  return e ? Vi(e.subTree) : null;
}
const Ui = (t) => t.__isSuspense;
function Ro(t, e) {
  e && e.pendingBranch ? M(t) ? e.effects.push(...t) : e.effects.push(t) : Hr(t);
}
const dt = /* @__PURE__ */ Symbol.for("v-fgt"), gs = /* @__PURE__ */ Symbol.for("v-txt"), Ht = /* @__PURE__ */ Symbol.for("v-cmt"), Ge = /* @__PURE__ */ Symbol.for("v-stc"), te = [];
let at = null;
function Wt(t = !1) {
  te.push(at = t ? null : []);
}
function Bi() {
  te.pop(), at = te[te.length - 1] || null;
}
let Pe = 1;
function On(t, e = !1) {
  Pe += t, t < 0 && at && e && (at.hasOnce = !0);
}
function Ki(t) {
  return t.dynamicChildren = Pe > 0 ? at || re : null, Bi(), Pe > 0 && at && at.push(t), t;
}
function ee(t, e, s, n, i, r) {
  return Ki(
    w(
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
function Fo(t, e, s, n, i) {
  return Ki(
    ft(
      t,
      e,
      s,
      n,
      i,
      !0
    )
  );
}
function Wi(t) {
  return t ? t.__v_isVNode === !0 : !1;
}
function be(t, e) {
  return t.type === e.type && t.key === e.key;
}
const ki = ({ key: t }) => t ?? null, ze = ({
  ref: t,
  ref_key: e,
  ref_for: s
}) => (typeof t == "number" && (t = "" + t), t != null ? Y(t) || /* @__PURE__ */ lt(t) || R(t) ? { i: Ot, r: t, k: e, f: !!s } : t : null);
function w(t, e = null, s = null, n = 0, i = null, r = t === dt ? 0 : 1, l = !1, o = !1) {
  const f = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: t,
    props: e,
    key: e && ki(e),
    ref: e && ze(e),
    scopeId: vi,
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
    ctx: Ot
  };
  return o ? (ns(f, s), r & 128 && t.normalize(f)) : s && (f.shapeFlag |= Y(s) ? 8 : 16), Pe > 0 && // avoid a block node from tracking itself
  !l && // has current parent block
  at && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (f.patchFlag > 0 || r & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  f.patchFlag !== 32 && at.push(f), f;
}
const ft = Lo;
function Lo(t, e = null, s = null, n = 0, i = null, r = !1) {
  if ((!t || t === io) && (t = Ht), Wi(t)) {
    const o = ue(
      t,
      e,
      !0
      /* mergeRef: true */
    );
    return s && ns(o, s), Pe > 0 && !r && at && (o.shapeFlag & 6 ? at[at.indexOf(t)] = o : at.push(o)), o.patchFlag = -2, o;
  }
  if (ko(t) && (t = t.__vccOpts), e) {
    e = Do(e);
    let { class: o, style: f } = e;
    o && !Y(o) && (e.class = ce(o)), V(f) && (/* @__PURE__ */ zs(f) && !M(f) && (f = et({}, f)), e.style = Ks(f));
  }
  const l = Y(t) ? 1 : Ui(t) ? 128 : ds(t) ? 64 : V(t) ? 4 : R(t) ? 2 : 0;
  return w(
    t,
    e,
    s,
    n,
    i,
    l,
    r,
    !0
  );
}
function Do(t) {
  return t ? /* @__PURE__ */ zs(t) || Ri(t) ? et({}, t) : t : null;
}
function ue(t, e, s = !1, n = !1) {
  const { props: i, ref: r, patchFlag: l, children: o, transition: f } = t, d = e ? $o(i || {}, e) : i, a = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: t.type,
    props: d,
    key: d && ki(d),
    ref: e && e.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      s && r ? M(r) ? r.concat(ze(e)) : [r, ze(e)] : ze(e)
    ) : r,
    scopeId: t.scopeId,
    slotScopeIds: t.slotScopeIds,
    children: o,
    target: t.target,
    targetStart: t.targetStart,
    targetAnchor: t.targetAnchor,
    staticCount: t.staticCount,
    shapeFlag: t.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: e && t.type !== dt ? l === -1 ? 16 : l | 16 : l,
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
    ssContent: t.ssContent && ue(t.ssContent),
    ssFallback: t.ssFallback && ue(t.ssFallback),
    placeholder: t.placeholder,
    el: t.el,
    anchor: t.anchor,
    ctx: t.ctx,
    ce: t.ce
  };
  return f && n && Xs(
    a,
    f.clone(a)
  ), a;
}
function ve(t = " ", e = 0) {
  return ft(gs, null, t, e);
}
function Me(t, e) {
  const s = ft(Ge, null, t);
  return s.staticCount = e, s;
}
function An(t = "", e = !1) {
  return e ? (Wt(), Fo(Ht, null, t)) : ft(Ht, null, t);
}
function Tt(t) {
  return t == null || typeof t == "boolean" ? ft(Ht) : M(t) ? ft(
    dt,
    null,
    // #3666, avoid reference pollution when reusing vnode
    t.slice()
  ) : Wi(t) ? Rt(t) : ft(gs, null, String(t));
}
function Rt(t) {
  return t.el === null && t.patchFlag !== -1 || t.memo ? t : ue(t);
}
function ns(t, e) {
  let s = 0;
  const { shapeFlag: n } = t;
  if (e == null)
    e = null;
  else if (M(e))
    s = 16;
  else if (typeof e == "object")
    if (n & 65) {
      const i = e.default;
      i && (i._c && (i._d = !1), ns(t, i()), i._c && (i._d = !0));
      return;
    } else {
      s = 32;
      const i = e._;
      !i && !Ri(e) ? e._ctx = Ot : i === 3 && Ot && (Ot.slots._ === 1 ? e._ = 1 : (e._ = 2, t.patchFlag |= 1024));
    }
  else if (R(e)) {
    if (n & 65) {
      ns(t, { default: e });
      return;
    }
    e = { default: e, _ctx: Ot }, s = 32;
  } else
    e = String(e), n & 64 ? (s = 16, e = [ve(e)]) : s = 8;
  t.children = e, t.shapeFlag |= s;
}
function $o(...t) {
  const e = {};
  for (let s = 0; s < t.length; s++) {
    const n = t[s];
    for (const i in n)
      if (i === "class")
        e.class !== n.class && (e.class = ce([e.class, n.class]));
      else if (i === "style")
        e.style = Ks([e.style, n.style]);
      else if (rs(i)) {
        const r = e[i], l = n[i];
        l && r !== l && !(M(r) && r.includes(l)) ? e[i] = r ? [].concat(r, l) : l : l == null && r == null && // mergeProps({ 'onUpdate:modelValue': undefined }) should not retain
        // the model listener.
        !os(i) && (e[i] = l);
      } else i !== "" && (e[i] = n[i]);
  }
  return e;
}
function Ct(t, e, s, n = null) {
  bt(t, e, 7, [
    s,
    n
  ]);
}
const jo = Oi();
let Ho = 0;
function No(t, e, s) {
  const n = t.type, i = (e ? e.appContext : t.appContext) || jo, r = {
    uid: Ho++,
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
    scope: new ur(
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
    propsOptions: Li(n, i),
    emitsOptions: Ai(n, i),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: q,
    // inheritAttrs
    inheritAttrs: n.inheritAttrs,
    // state
    ctx: q,
    data: q,
    props: q,
    attrs: q,
    slots: q,
    refs: q,
    setupState: q,
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
  return r.ctx = { _: r }, r.root = e ? e.root : r, r.emit = bo.bind(null, r), t.ce && t.ce(r), r;
}
let ot = null;
const Vo = () => ot || Ot;
let is, Re;
{
  const t = cs(), e = (s, n) => {
    let i;
    return (i = t[s]) || (i = t[s] = []), i.push(n), (r) => {
      i.length > 1 ? i.forEach((l) => l(r)) : i[0](r);
    };
  };
  is = e(
    "__VUE_INSTANCE_SETTERS__",
    (s) => ot = s
  ), Re = e(
    "__VUE_SSR_SETTERS__",
    (s) => Fe = s
  );
}
const je = (t) => {
  const e = ot;
  return is(t), t.scope.on(), () => {
    t.scope.off(), is(e);
  };
}, In = () => {
  ot && ot.scope.off(), is(null);
};
function qi(t) {
  return t.vnode.shapeFlag & 4;
}
let Fe = !1;
function Uo(t, e = !1, s = !1) {
  e && Re(e);
  const { props: n, children: i } = t.vnode, r = qi(t);
  wo(t, n, r, e), To(t, i, s || e);
  const l = r ? Bo(t, e) : void 0;
  return e && Re(!1), l;
}
function Bo(t, e) {
  const s = t.type;
  t.accessCache = /* @__PURE__ */ Object.create(null), t.proxy = new Proxy(t.ctx, oo);
  const { setup: n } = s;
  if (n) {
    Dt();
    const i = t.setupContext = n.length > 1 ? Wo(t) : null, r = je(t), l = $e(
      n,
      t,
      0,
      [
        t.props,
        i
      ]
    ), o = Kn(l);
    if ($t(), r(), (o || t.sp) && !Ee(t) && wi(t), o) {
      if (l.then(In, In), e)
        return l.then((f) => {
          Re(!0);
          try {
            Pn(t, f, e);
          } finally {
            Re(!1);
          }
        }).catch((f) => {
          as(f, t, 0);
        });
      t.asyncDep = l;
    } else
      Pn(t, l);
  } else
    Ji(t);
}
function Pn(t, e, s) {
  R(e) ? t.type.__ssrInlineRender ? t.ssrRender = e : t.render = e : V(e) && (t.setupState = di(e)), Ji(t);
}
function Ji(t, e, s) {
  const n = t.type;
  t.render || (t.render = n.render || At);
  {
    const i = je(t);
    Dt();
    try {
      lo(t);
    } finally {
      $t(), i();
    }
  }
}
const Ko = {
  get(t, e) {
    return st(t, "get", ""), t[e];
  }
};
function Wo(t) {
  const e = (s) => {
    t.exposed = s || {};
  };
  return {
    attrs: new Proxy(t.attrs, Ko),
    slots: t.slots,
    emit: t.emit,
    expose: e
  };
}
function sn(t) {
  return t.exposed ? t.exposeProxy || (t.exposeProxy = new Proxy(di(Pr(t.exposed)), {
    get(e, s) {
      if (s in e)
        return e[s];
      if (s in Te)
        return Te[s](t);
    },
    has(e, s) {
      return s in e || s in Te;
    }
  })) : t.proxy;
}
function ko(t) {
  return R(t) && "__vccOpts" in t;
}
const nn = (t, e) => /* @__PURE__ */ Fr(t, e, Fe), qo = "3.5.42";
let Ns;
const Mn = typeof window < "u" && window.trustedTypes;
if (Mn)
  try {
    Ns = /* @__PURE__ */ Mn.createPolicy("vue", {
      createHTML: (t) => t
    });
  } catch {
  }
const Gi = Ns ? (t) => Ns.createHTML(t) : (t) => t, Jo = "http://www.w3.org/2000/svg", Go = "http://www.w3.org/1998/Math/MathML", Mt = typeof document < "u" ? document : null, Rn = Mt && /* @__PURE__ */ Mt.createElement("template"), zo = {
  insert: (t, e, s) => {
    e.insertBefore(t, s || null);
  },
  remove: (t) => {
    const e = t.parentNode;
    e && e.removeChild(t);
  },
  createElement: (t, e, s, n) => {
    const i = e === "svg" ? Mt.createElementNS(Jo, t) : e === "mathml" ? Mt.createElementNS(Go, t) : s ? Mt.createElement(t, { is: s }) : Mt.createElement(t);
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
    const l = s ? s.previousSibling : e.lastChild;
    if (i && (i === r || i.nextSibling))
      for (; e.insertBefore(i.cloneNode(!0), s), !(i === r || !(i = i.nextSibling)); )
        ;
    else {
      Rn.innerHTML = Gi(
        n === "svg" ? `<svg>${t}</svg>` : n === "mathml" ? `<math>${t}</math>` : t
      );
      const o = Rn.content;
      if (n === "svg" || n === "mathml") {
        const f = o.firstChild;
        for (; f.firstChild; )
          o.appendChild(f.firstChild);
        o.removeChild(f);
      }
      e.insertBefore(o, s);
    }
    return [
      // first
      l ? l.nextSibling : e.firstChild,
      // last
      s ? s.previousSibling : e.lastChild
    ];
  }
}, Yo = /* @__PURE__ */ Symbol("_vtc");
function Xo(t, e, s) {
  const n = t[Yo];
  n && (e = (e ? [e, ...n] : [...n]).join(" ")), e == null ? t.removeAttribute("class") : s ? t.setAttribute("class", e) : t.className = e;
}
const Fn = /* @__PURE__ */ Symbol("_vod"), Zo = /* @__PURE__ */ Symbol("_vsh"), Qo = /* @__PURE__ */ Symbol(""), tl = /(?:^|;)\s*display\s*:/;
function el(t, e, s) {
  const n = t.style, i = Y(s);
  let r = !1;
  if (s && !i) {
    if (e)
      if (Y(e))
        for (const l of e.split(";")) {
          const o = l.slice(0, l.indexOf(":")).trim();
          s[o] == null && _e(n, o, "");
        }
      else
        for (const l in e)
          s[l] == null && _e(n, l, "");
    for (const l in s) {
      l === "display" && (r = !0);
      const o = s[l];
      o != null ? nl(
        t,
        l,
        !Y(e) && e ? e[l] : void 0,
        o
      ) || _e(n, l, o) : _e(n, l, "");
    }
  } else if (i) {
    if (e !== s) {
      const l = n[Qo];
      l && (s += ";" + l), n.cssText = s, r = tl.test(s);
    }
  } else e && t.removeAttribute("style");
  Fn in t && (t[Fn] = r ? n.display : "", t[Zo] && (n.display = "none"));
}
const qe = /\s*!important$/;
function _e(t, e, s) {
  if (M(s))
    s.forEach((n) => _e(t, e, n));
  else if (s == null && (s = ""), e.startsWith("--"))
    qe.test(s) ? t.setProperty(e, s.replace(qe, ""), "important") : t.setProperty(e, s);
  else {
    const n = sl(t, e);
    qe.test(s) ? t.setProperty(
      se(n),
      s.replace(qe, ""),
      "important"
    ) : t[n] = s;
  }
}
const Ln = ["Webkit", "Moz", "ms"], As = {};
function sl(t, e) {
  const s = As[e];
  if (s)
    return s;
  let n = pt(e);
  if (n !== "filter" && n in t)
    return As[e] = n;
  n = qn(n);
  for (let i = 0; i < Ln.length; i++) {
    const r = Ln[i] + n;
    if (r in t)
      return As[e] = r;
  }
  return e;
}
function nl(t, e, s, n) {
  return t.tagName === "TEXTAREA" && (e === "width" || e === "height") && Y(n) && s === n;
}
const Dn = "http://www.w3.org/1999/xlink";
function $n(t, e, s, n, i, r = cr(e)) {
  n && e.startsWith("xlink:") ? s == null ? t.removeAttributeNS(Dn, e.slice(6, e.length)) : t.setAttributeNS(Dn, e, s) : s == null || r && !Gn(s) ? t.removeAttribute(e) : t.setAttribute(
    e,
    r ? "" : It(s) ? String(s) : s
  );
}
function jn(t, e, s, n, i) {
  if (e === "innerHTML" || e === "textContent") {
    s != null && (t[e] = e === "innerHTML" ? Gi(s) : s);
    return;
  }
  const r = t.tagName;
  if (e === "value" && r !== "PROGRESS" && // custom elements may use _value internally
  !r.includes("-")) {
    const o = r === "OPTION" ? t.getAttribute("value") || "" : t.value, f = s == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      t.type === "checkbox" ? "on" : ""
    ) : String(s);
    (o !== f || !("_value" in t)) && (t.value = f), s == null && t.removeAttribute(e), t._value = s;
    return;
  }
  let l = !1;
  if (s === "" || s == null) {
    const o = typeof t[e];
    o === "boolean" ? s = Gn(s) : s == null && o === "string" ? (s = "", l = !0) : o === "number" && (s = 0, l = !0);
  }
  try {
    t[e] = s;
  } catch {
  }
  l && t.removeAttribute(i || e);
}
function il(t, e, s, n) {
  t.addEventListener(e, s, n);
}
function rl(t, e, s, n) {
  t.removeEventListener(e, s, n);
}
const Hn = /* @__PURE__ */ Symbol("_vei");
function ol(t, e, s, n, i = null) {
  const r = t[Hn] || (t[Hn] = {}), l = r[e];
  if (n && l)
    l.value = n;
  else {
    const [o, f] = fl(e);
    if (n) {
      const d = r[e] = dl(
        n,
        i
      );
      il(t, o, d, f);
    } else l && (rl(t, o, l, f), r[e] = void 0);
  }
}
const ll = /(Once|Passive|Capture)$/, cl = /^on:?(?:Once|Passive|Capture)$/;
function fl(t) {
  let e, s;
  for (; (s = t.match(ll)) && !cl.test(t); )
    e || (e = {}), t = t.slice(0, t.length - s[1].length), e[s[1].toLowerCase()] = !0;
  return [t[2] === ":" ? t.slice(3) : se(t.slice(2)), e];
}
let Is = 0;
const ul = /* @__PURE__ */ Promise.resolve(), al = () => Is || (ul.then(() => Is = 0), Is = Date.now());
function dl(t, e) {
  const s = (n) => {
    if (!n._vts)
      n._vts = Date.now();
    else if (n._vts <= s.attached)
      return;
    const i = s.value;
    if (M(i)) {
      const r = n.stopImmediatePropagation;
      n.stopImmediatePropagation = () => {
        r.call(n), n._stopped = !0;
      };
      const l = i.slice(), o = [n];
      for (let f = 0; f < l.length && !n._stopped; f++) {
        const d = l[f];
        d && bt(
          d,
          e,
          5,
          o
        );
      }
    } else
      bt(
        i,
        e,
        5,
        [n]
      );
  };
  return s.value = t, s.attached = al(), s;
}
const Nn = (t) => t.charCodeAt(0) === 111 && t.charCodeAt(1) === 110 && // lowercase letter
t.charCodeAt(2) > 96 && t.charCodeAt(2) < 123, pl = (t, e, s, n, i, r) => {
  const l = i === "svg";
  e === "class" ? Xo(t, n, l) : e === "style" ? el(t, s, n) : rs(e) ? os(e) || ol(t, e, s, n, r) : (e[0] === "." ? (e = e.slice(1), !0) : e[0] === "^" ? (e = e.slice(1), !1) : hl(t, e, n, l)) ? (jn(t, e, n), !t.tagName.includes("-") && (e === "value" || e === "checked" || e === "selected") && $n(t, e, n, l, r, e !== "value")) : /* #11081 force set props for possible async custom element */ t._isVueCE && // #12408 check if it's declared prop or it's async custom element
  (gl(t, e) || // @ts-expect-error _def is private
  t._def.__asyncLoader && (/[A-Z]/.test(e) || !Y(n))) ? jn(t, pt(e), n, r, e) : (e === "true-value" ? t._trueValue = n : e === "false-value" && (t._falseValue = n), $n(t, e, n, l));
};
function hl(t, e, s, n) {
  if (n)
    return !!(e === "innerHTML" || e === "textContent" || e in t && Nn(e) && R(s));
  if (e === "spellcheck" || e === "draggable" || e === "translate" || e === "autocorrect" || e === "sandbox" && t.tagName === "IFRAME" || e === "form" || e === "list" && t.tagName === "INPUT" || e === "type" && t.tagName === "TEXTAREA")
    return !1;
  if (e === "width" || e === "height") {
    const i = t.tagName;
    if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE")
      return !1;
  }
  return Nn(e) && Y(s) ? !1 : e in t;
}
function gl(t, e) {
  const s = (
    // @ts-expect-error _def is private
    t._def.props
  );
  if (!s)
    return !1;
  const n = pt(e);
  return Array.isArray(s) ? s.some((i) => pt(i) === n) : Object.keys(s).some((i) => pt(i) === n);
}
const bl = /* @__PURE__ */ et({ patchProp: pl }, zo);
let Vn;
function ml() {
  return Vn || (Vn = Ao(bl));
}
const vl = ((...t) => {
  const e = ml().createApp(...t), { mount: s } = e;
  return e.mount = (n) => {
    const i = yl(n);
    if (!i) return;
    const r = e._component;
    !R(r) && !r.render && !r.template && (r.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
    const l = s(i, !1, _l(i));
    return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), l;
  }, e;
});
function _l(t) {
  if (t instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && t instanceof MathMLElement)
    return "mathml";
}
function yl(t) {
  return Y(t) ? document.querySelector(t) : t;
}
const zi = (t, e) => {
  const s = t.__vccOpts || t;
  for (const [n, i] of e)
    s[n] = i;
  return s;
}, xl = {};
function wl(t, e) {
  return e[0] || (e[0] = Me('<div id="root-modal" class="hidden"><div id="root-dialog"><div class="root-head">ルートプロジェクト（作業対象フォルダ）を選ぶ</div><div id="root-places"></div><div id="root-drives"></div><div class="root-inputrow"><input id="root-input" type="text" spellcheck="false" placeholder="例: D:\\projects\\myapp（Enter で移動）"><button id="root-fav-btn" title="今表示しているフォルダをお気に入りに入れる／外す"> ☆ </button></div><ul id="root-dirlist"></ul><div class="root-hint hint"> フォルダをクリックで移動 ／ パス直接入力＋Enter でも移動。決定するとファイルブラウザが切替わり、新しい会話がそのフォルダで始まります。 </div><div class="root-actions"><button id="root-cancel">キャンセル</button><button id="root-ok" class="apply-btn">✓ このフォルダにする</button></div></div></div><div id="hist-modal" class="hidden"><div id="hist-dialog"><div class="root-head">🕰 保存履歴 — <span id="hist-file"></span></div><div id="hist-body"><ul id="hist-list"></ul><div id="hist-preview-wrap"><div id="hist-preview-head" class="hint"> 左の版を選ぶと内容が出ます。 </div><pre id="hist-preview"></pre></div></div><div class="root-hint hint"> 保存の直前の内容を残しています。戻すときは「今の内容」も履歴に積むので、戻し間違えてもやり直せます。 </div><div class="root-actions"><button id="hist-close">閉じる</button><button id="hist-restore" class="apply-btn" disabled> ↩ この版に戻す </button></div></div></div><div id="pick-modal" class="hidden"><div id="pick-dialog"><div class="root-head">参照するファイルを選ぶ</div><div id="pick-drives"></div><input id="pick-input" type="text" spellcheck="false" placeholder="例: C:\\Users\\you\\decks（Enter でフォルダへ移動）"><ul id="pick-list"></ul><div class="root-hint hint"> フォルダをクリックで移動 ／ ファイルをクリックで参照に追加します。 </div><div class="root-actions"><button id="pick-cancel">閉じる</button></div></div></div><div id="cf-modal" class="hidden"><div id="cf-dialog"><div class="root-head">📥 Confluence / Web から貼り付け</div><div class="root-hint hint"> Confluence のページをブラウザでコピー（Ctrl+C）してから「クリップボードから読込」、 または下の欄に Ctrl+V。リッチテキスト（HTML）で取れれば Markdown に変換して、 今開いているファイルのカーソル位置へ挿入します（画像は Confluence 上のURL参照のまま残ります）。 </div><div class="cf-actions"><button id="cf-read-btn" title="クリップボードを直接読み取る（ブラウザの許可が必要な場合あり）"> クリップボードから読込 </button><span id="cf-status" class="hint"></span></div><textarea id="cf-input" rows="10" spellcheck="false" placeholder="ここに貼り付け（Ctrl+V）…"></textarea><div class="root-actions"><button id="cf-cancel">閉じる</button><button id="cf-insert" class="apply-btn">✓ 変換して挿入</button></div></div></div><div id="sessions-modal" class="hidden"><div id="sessions-dialog"><div class="root-head">🗂 保存済みの会話</div><div class="root-hint hint"> クリックで会話を復元します（チャット表示＋エンジン文脈。ツール実行の詳細は失われ、 会話の本文だけが文脈として引き継がれます）。会話はターン確定ごとに自動保存されます。 </div><ul id="sessions-list"></ul><div class="root-actions"><button id="sessions-close" class="apply-btn">閉じる</button></div></div></div><div id="settings-modal" class="hidden"><div id="settings-dialog"><div class="root-head">設定</div><label class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>モデル / サーバ</b><span class="hint">以降の新しい会話に反映されます。</span></span><select id="settings-model"></select></label><label class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>ロード済みモデル</b><span class="hint">LM Studio でロード済みのモデルから選択（起動中のみ取得可）。</span></span><select id="settings-llm-model"></select></label><div class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>思考許容時間（秒）</b><span class="hint">AI が <code>&lt;think&gt;</code> で考え込める上限。超えると打ち切って結論生成に移ります。長くするほど1回の待ち時間が延びます（既定 90）。</span></span><span class="settings-inline"><input id="settings-think-budget" type="number" min="10" max="1800" step="10"><button id="settings-think-budget-save">保存</button><span id="settings-think-budget-status" class="hint"></span></span></div><div class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>コンテキスト長（トークン）</b><span class="hint">このサーバのモデル窓長。<b>0 で自動</b>（LM Studio の <code>meta.n_ctx</code> を取得）。リモートの LM Studio / llama-server は取れず 32768 と仮定するので、実際の窓長を手で入れると溢れ・無駄な切り詰めを防げます。変更するとこのサーバの会話は作り直されます。</span></span><span class="settings-inline"><input id="settings-context-length" type="number" min="0" max="2000000" step="1024" placeholder="0（自動）"><button id="settings-context-length-save">保存</button><span id="settings-context-length-status" class="hint"></span></span></div><label class="settings-row toggle"><input type="checkbox" id="settings-copilot"><span><b>Copilot 連携</b><span class="hint">オンにすると、エージェントが <code>ask_copilot</code> ツールで Microsoft Copilot に相談できます（PrayLight 経由）。</span></span></label><div class="settings-row" id="settings-copilot-controls"><button id="settings-copilot-open" title="Copilot にログインするためのブラウザを開く"> Copilotブラウザを開く（ログイン用） </button><span id="settings-copilot-status" class="hint"></span></div><div class="root-actions"><button id="settings-close" class="apply-btn">閉じる</button></div></div></div>', 6));
}
const Cl = /* @__PURE__ */ zi(xl, [["render", wl]]), B = /* @__PURE__ */ De({
  current: "chat",
  ready: !1,
  filesOpen: !1,
  currentFile: "",
  dirty: !1,
  connectionIssue: ""
});
function Ps(t) {
  B.current = t, t === "editor" && (B.filesOpen = !1), document.body.classList.toggle("view-chat", t === "chat"), document.body.classList.toggle("view-editor", t === "editor"), document.body.classList.toggle("chat-files-open", B.filesOpen), t === "editor" && requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
}
function Un() {
  B.filesOpen = !B.filesOpen, document.body.classList.toggle("chat-files-open", B.filesOpen), B.filesOpen ? requestAnimationFrame(
    () => document.getElementById("file-search")?.focus()
  ) : document.getElementById("chat-files-btn")?.focus();
}
function rc(t, e) {
  B.currentFile = t || "", B.dirty = e;
}
function oc(t) {
  B.connectionIssue = t;
}
function lc() {
  B.ready = !0;
}
document.body.classList.add("view-chat");
document.addEventListener("keydown", (t) => {
  t.key !== "Escape" || !B.filesOpen || (t.preventDefault(), B.filesOpen = !1, document.body.classList.remove("chat-files-open"), document.getElementById("chat-files-btn")?.focus());
});
document.addEventListener("pointerdown", (t) => {
  if (!B.filesOpen) return;
  const e = t.target;
  e instanceof Element && (e.closest("#filemgr, #chat-files-btn") || (B.filesOpen = !1, document.body.classList.remove("chat-files-open")));
});
const Sl = {
  class: "view-switch",
  "aria-label": "表示切替"
}, El = ["aria-current"], Tl = ["aria-current"], Ol = { class: "edit-context-label" }, Al = {
  key: 0,
  class: "unsaved-dot",
  "aria-label": "未保存の変更あり"
}, Il = ["title"], Pl = ["disabled"], Ml = /* @__PURE__ */ Zs({
  __name: "TopBar",
  setup(t) {
    function e() {
      document.getElementById("settings-btn")?.click();
    }
    return (s, n) => (Wt(), ee(dt, null, [
      n[4] || (n[4] = w("div", { class: "brand" }, "CodeWithPixie", -1)),
      w("nav", Sl, [
        w("button", {
          id: "view-chat-btn",
          type: "button",
          "aria-current": k(B).current === "chat" ? "page" : void 0,
          class: ce({ active: k(B).current === "chat" }),
          onClick: n[0] || (n[0] = (i) => k(Ps)("chat"))
        }, " 会話 ", 10, El),
        w("button", {
          id: "view-editor-btn",
          type: "button",
          "aria-current": k(B).current === "editor" ? "page" : void 0,
          class: ce({ active: k(B).current === "editor" }),
          onClick: n[1] || (n[1] = (i) => k(Ps)("editor"))
        }, " 編集 ", 10, Tl)
      ]),
      w("button", {
        id: "edit-context-btn",
        type: "button",
        onClick: n[2] || (n[2] = (i) => k(Ps)("editor"))
      }, [
        w("span", Ol, xe(k(B).currentFile || "編集画面を開く"), 1),
        k(B).dirty ? (Wt(), ee("span", Al, "● 未保存")) : An("", !0),
        n[3] || (n[3] = w("span", { "aria-hidden": "true" }, "↗", -1))
      ]),
      k(B).connectionIssue ? (Wt(), ee("button", {
        key: 0,
        id: "connection-issue-btn",
        type: "button",
        title: k(B).connectionIssue,
        onClick: e
      }, " 接続を確認してください ", 8, Il)) : An("", !0),
      n[5] || (n[5] = Me('<button id="mode-btn" title="モード切替">…</button><button id="code-style-btn" class="code-only" title="Codeモードの進め方を切り替え"> 通常 </button><button id="root-project-btn" title="ルートプロジェクト（作業対象フォルダ）を変更"><span id="root-project-name">…</span></button><button id="places-btn" title="お気に入り・最近使ったフォルダへ移動"> ⭐ </button>', 4)),
      w("button", {
        id: "source-bundle-btn",
        type: "button",
        title: "このプロジェクトのソースをまとめてコピー・保存・Copilotに送信",
        disabled: !k(B).ready
      }, " ソースをまとめる ", 8, Pl),
      n[6] || (n[6] = Me('<div class="file-info"><button id="nav-back" class="nav-btn" title="前に開いていたファイルへ戻る (Alt+←)"> ◀ </button><button id="nav-fwd" class="nav-btn" title="進む (Alt+→)">▶</button><button id="recent-btn" class="nav-btn" title="最近開いたファイル (Ctrl+E)"> 🕘 </button><span id="current-file">（ファイル未選択）</span><button id="save-btn" title="保存 (Ctrl+S)">保存</button><span id="save-state"></span><button id="history-btn" title="このファイルの保存履歴から元に戻す"> 🕰 履歴 </button></div><div class="model-info"> model: <span id="model-name">…</span><span id="agent-status"></span></div><button id="settings-btn" title="設定（モデル）">設定</button>', 3))
    ], 64));
  }
});
function Rl() {
  const t = /* @__PURE__ */ De({
    sessionId: "",
    phase: "idle",
    error: ""
  });
  let e = null;
  const s = nn(
    () => ["switching", "sending", "running", "approval", "stopping"].includes(
      t.phase
    )
  );
  function n(i) {
    return e === i && t.sessionId === i.sessionId;
  }
  return {
    state: /* @__PURE__ */ Xe(t),
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
const Fl = Rl();
async function cc(t, e, s, n) {
  if (!t.body) throw new Error("応答ストリームがありません。");
  const i = t.body.getReader(), r = new TextDecoder();
  let l = "", o = !1, f = "";
  const d = () => {
    i.cancel().catch(() => {
    });
  };
  e.controller.signal.addEventListener("abort", d, { once: !0 });
  try {
    for (; !o; ) {
      if (!s(e) || e.controller.signal.aborted) return;
      const { value: a, done: h } = await i.read();
      if (!s(e) || e.controller.signal.aborted) return;
      l += r.decode(a, { stream: !h });
      const S = l.split(/\r?\n\r?\n/);
      l = S.pop() || "";
      for (const E of S) {
        if (!s(e) || e.controller.signal.aborted) return;
        const D = E.split(/\r?\n/).filter((J) => J.startsWith("data:")).map((J) => J.slice(5).trimStart()).join(`
`);
        if (!D) continue;
        const T = JSON.parse(D);
        if (T.type === "error" && (f = T.text || "実行に失敗しました。"), await n(T), T.type === "done") {
          e.outcome = T.status, (T.status === "failed" || T.status === "limit_reached") && (f = {
            turn_timeout: "依頼全体の制限時間に達しました。",
            stream_timeout: "LLM応答の制限時間に達しました。",
            llm_calls_limit: "LLM呼び出し回数の上限に達しました。",
            tool_calls_limit: "ツール実行回数の上限に達しました。"
          }[T.reason] || T.reason || "実行に失敗しました。"), o = !0;
          break;
        }
      }
      if (h) break;
    }
    if (f) throw new Error(f);
    if (!o) throw new Error("完了通知を受信する前に接続が切れました。");
  } finally {
    e.controller.signal.removeEventListener("abort", d), await i.cancel().catch(() => {
    }), i.releaseLock();
  }
}
const Ll = { id: "split" }, Dl = { id: "right-pane" }, $l = { id: "chat" }, jl = { class: "section-head" }, Hl = { class: "fm-actions" }, Nl = ["aria-expanded"], Vl = { id: "chat-welcome" }, Ul = {
  class: "welcome-examples",
  "aria-label": "依頼の例"
}, Bl = ["onClick"], Kl = { id: "composer" }, Wl = { class: "code-only autonomy-controls" }, kl = { title: "プロジェクト内の編集と、指定した検証コマンドを自動で繰り返します" }, ql = ["disabled"], Jl = ["disabled"], Gl = { class: "composer-actions" }, zl = ["title"], Yl = ["disabled", "title"], Xl = /* @__PURE__ */ Zs({
  __name: "WorkspaceShell",
  setup(t) {
    const { state: e, busy: s } = Fl, n = nn(
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
    ), i = [
      "このプロジェクトの構成を教えて",
      "変更したい機能の実装場所を探して",
      "小さな改善を一緒に進めたい"
    ];
    function r(l) {
      const o = document.getElementById(
        "chat-input"
      );
      o && (o.value.trim() || (o.value = l), o.focus());
    }
    return (l, o) => (Wt(), ee("main", Ll, [
      o[20] || (o[20] = Me('<section id="left-pane"><div id="edit-area"><div id="editor"></div><div id="preview-divider" class="hidden" title="ドラッグでプレビューの幅を調整（ダブルクリックで等分に戻す）"></div><div id="preview" class="md hidden" aria-live="off"></div></div><div id="diff-overlay" class="hidden"><div id="diff-bar"><span id="diff-label">差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）</span><span id="diff-tabs"></span><span class="spacer"></span><button id="diff-close" class="hidden" title="差分表示を閉じる（承認の判断は右の承認バーで行う）"> ✕ 閉じる </button><button id="diff-approve-edit" class="apply-btn hidden" title="右ペインで編集した内容をそのまま書き込み、エージェントには完了済みと伝える"> ✓ 修正して承認 </button><button id="diff-apply" class="apply-btn">✓ 適用</button><button id="diff-cancel">キャンセル</button></div><div id="diff-editor"></div></div><div id="plan-overlay" class="hidden"><div id="plan-bar"><span id="plan-label">実行計画（承認するまでファイルは変更されません）</span><span class="spacer"></span><button id="plan-approve" class="apply-btn">✓ この計画で実行</button><button id="plan-reject">✕ 修正を依頼</button></div><div id="plan-body" class="md"></div></div><div id="left-toolbar"><button id="note-btn" class="note-only" title="選択行に付箋を貼る"> 付箋 </button><button id="preview-btn" title="Markdown プレビューを表示 (Ctrl+Shift+P)"> 👁 プレビュー </button><button id="richcopy-btn" disabled title="Markdown プレビュー表示中に使えます"> リッチコピー </button><span id="sel-info" class="hint">エージェントがファイルを直接編集します（破壊操作は承認制）。</span></div></section><div id="divider" title="ドラッグで幅を調整"></div>', 2)),
      w("section", Dl, [
        o[19] || (o[19] = Me('<div id="filemgr"><div class="section-head"><span>ファイル（ワークスペース）</span><span class="fm-actions"><button id="folder-btn" title="作業フォルダを変更"> フォルダ変更 </button><button id="refresh-btn" title="再読込">⟳</button><button id="new-file-btn" title="新規ファイル">ファイル追加</button><button id="new-folder-btn" title="新規フォルダ"> フォルダ追加 </button><button id="web2md-btn" class="note-only" title="URLのページをMarkdown化して web/ に保存する"> 🌐+ </button><button id="cf-btn" title="Confluence 等のページ（コピーしたHTML）をMarkdownに変換して挿入する"> 📥 貼付 </button></span><span class="search-row"><input id="file-search" type="search" placeholder="全文検索…"><span id="search-opts" class="hidden"><label title="大文字小文字を区別する（検索と置換で共通）"><input id="search-case" type="checkbox"> Aa </label><button id="replace-toggle" title="ヒットしたファイルをまとめて置換する"> 🔁 置換 </button></span></span></div><div id="replace-bar" class="hidden"><input id="replace-input" type="text" spellcheck="false" placeholder="置換後の文字列（そのまま入ります）"><div class="replace-actions"><button id="replace-preview-btn">👁 プレビュー</button><button id="replace-run-btn" class="apply-btn">✓ すべて置換</button><span id="replace-status" class="hint"></span></div><div id="replace-preview"></div></div><div id="root-bar"><span id="root-path" title="現在の作業フォルダ"></span><span id="files-trunc" class="hidden" title="巨大ワークスペースのため一覧を打ち切りました（目的のファイルは全文検索で探せます）">⚠ 一覧は先頭2万件まで</span></div><ul id="file-list"></ul><div id="search-results" class="hidden"></div></div><div id="v-divider" title="ドラッグでファイル欄の高さを調整（ダブルクリックで既定に戻す）"></div><div id="refmgr" class="note-only"><div class="section-head"><span>関連ファイル</span><span class="fm-actions"><button id="ref-add-btn" title="別ディレクトリのファイル（.pptx 等）を参照に追加"> ＋参照を追加 </button></span></div><ul id="ref-list"></ul><div id="ref-empty" class="hint"> ここにファイルをドラッグ、または「＋参照を追加」で紐付けます。 </div></div>', 3)),
        w("div", $l, [
          w("div", jl, [
            o[5] || (o[5] = w("span", null, "チャット", -1)),
            w("span", Hl, [
              w("button", {
                id: "chat-files-btn",
                type: "button",
                "aria-expanded": k(B).filesOpen,
                "aria-controls": "filemgr",
                onClick: o[0] || (o[0] = //@ts-ignore
                (...f) => k(Un) && k(Un)(...f))
              }, " ファイルを探す ", 8, Nl),
              o[1] || (o[1] = w("span", {
                id: "session-info",
                class: "hint code-only",
                title: "この会話のセッションID"
              }, null, -1)),
              o[2] || (o[2] = w("button", {
                id: "new-session-btn",
                class: "code-only",
                title: "新しい会話を開始（並行セッション）"
              }, " ＋新規会話 ", -1)),
              o[3] || (o[3] = w("button", {
                id: "sessions-btn",
                class: "code-only",
                title: "保存済みの会話を一覧から復元する"
              }, " 🗂 会話 ", -1)),
              o[4] || (o[4] = w("button", {
                id: "chat-clear-btn",
                class: "note-only",
                title: "この保存先の会話履歴を消去する"
              }, " 履歴を消去 ", -1))
            ])
          ]),
          w("div", Vl, [
            o[7] || (o[7] = w("div", {
              class: "welcome-mark",
              "aria-hidden": "true"
            }, "✦", -1)),
            o[8] || (o[8] = w("p", { class: "welcome-eyebrow" }, "CODE WITH PIXIE", -1)),
            o[9] || (o[9] = w("h1", null, "何から始めましょうか。", -1)),
            o[10] || (o[10] = w("p", { class: "welcome-copy" }, [
              ve(" 考えを整理するところから、ファイルを直すところまで。"),
              w("br"),
              ve("やりたいことを、そのまま話してください。 ")
            ], -1)),
            w("div", Ul, [
              (Wt(), ee(dt, null, ro(i, (f) => w("button", {
                key: f,
                type: "button",
                onClick: (d) => r(f)
              }, [
                ve(xe(f), 1),
                o[6] || (o[6] = w("span", { "aria-hidden": "true" }, "↗", -1))
              ], 8, Bl)), 64))
            ])
          ]),
          o[17] || (o[17] = w("div", { id: "messages" }, null, -1)),
          o[18] || (o[18] = w("div", {
            id: "approval",
            class: "hidden code-only",
            role: "region",
            "aria-label": "承認が必要な操作"
          }, null, -1)),
          w("div", Kl, [
            o[13] || (o[13] = w("div", {
              id: "chat-activity",
              "aria-live": "polite"
            }, null, -1)),
            w("div", Wl, [
              w("label", kl, [
                w("input", {
                  id: "autonomous-check",
                  type: "checkbox",
                  disabled: k(s)
                }, null, 8, ql),
                o[11] || (o[11] = ve(" 自走（編集を自動適用） ", -1))
              ]),
              w("input", {
                id: "verification-command",
                type: "text",
                "aria-label": "自走で繰り返す検証コマンド",
                placeholder: "検証コマンドを入力（自動検出できませんでした）",
                disabled: k(s)
              }, null, 8, Jl)
            ]),
            o[14] || (o[14] = w("div", { id: "chip-bar" }, [
              w("span", {
                id: "sel-chip",
                class: "chip hidden"
              }, "選択テキスト添付")
            ], -1)),
            o[15] || (o[15] = w("textarea", {
              id: "chat-input",
              "aria-label": "メッセージ",
              rows: "3",
              placeholder: "相談したいこと、調べたいこと、変更したいことを入力…"
            }, null, -1)),
            w("div", Gl, [
              o[12] || (o[12] = w("span", { class: "hint" }, "Ctrl+Enter で送信", -1)),
              w("span", {
                role: "status",
                "aria-live": "polite",
                title: k(e).error
              }, xe(n.value), 9, zl),
              w("button", {
                id: "send-btn",
                class: ce({ stop: k(s) }),
                disabled: !k(B).ready || k(e).phase === "stopping" || k(e).phase === "switching",
                title: k(s) ? "エージェントの実行を中断する" : ""
              }, xe(k(B).ready ? k(s) ? "停止" : "送信" : "準備中"), 11, Yl)
            ]),
            o[16] || (o[16] = w("div", {
              id: "copilot-bar",
              class: "note-only"
            }, [
              w("button", {
                id: "cp-bar-open-btn",
                title: "デバッグ用ブラウザで Copilot を開く（そこで人が対話する）"
              }, " Copilotを開く "),
              w("button", {
                id: "cp-bar-import-btn",
                title: "開いている Copilot の会話を取得してAIにまとめさせる（普段のブラウザでOK・Copilotタブを前面にしておく）"
              }, " ⬇ 会話を取り込んでまとめる "),
              w("span", {
                id: "cp-bar-status",
                class: "hint"
              })
            ], -1))
          ])
        ])
      ])
    ]));
  }
}), Zl = {}, Ql = {
  id: "source-bundle-modal",
  class: "hidden"
};
function tc(t, e) {
  return Wt(), ee("div", Ql, [...e[0] || (e[0] = [
    w("section", {
      id: "source-bundle-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "source-bundle-title"
    }, [
      w("div", {
        class: "root-head",
        id: "source-bundle-title"
      }, " プロジェクトのソースをまとめる "),
      w("div", {
        id: "source-bundle-root",
        class: "hint"
      }),
      w("p", { class: "hint source-bundle-hint" }, " 保存済みのソースを収集し、開いているファイルには現在の編集内容を含めます。 修正指示を添えてコピー・保存するか、ファイルとして Copilot に送信できます。 "),
      w("div", {
        id: "source-bundle-summary",
        "aria-live": "polite"
      }),
      w("div", {
        id: "source-bundle-warning",
        class: "hidden"
      }),
      w("details", {
        id: "source-bundle-skips",
        class: "hidden"
      }, [
        w("summary", { id: "source-bundle-skips-summary" }, "除外されたファイル"),
        w("ul", { id: "source-bundle-skips-list" })
      ]),
      w("label", { for: "source-bundle-instruction" }, "修正指示（コピー・保存は省略可）"),
      w("textarea", {
        id: "source-bundle-instruction",
        rows: "3",
        maxlength: "12000",
        placeholder: "例: 読み込み時のエラーを調べて、修正コードをファイルごとに提案してください"
      }),
      w("label", { for: "source-bundle-preview" }, "まとめた内容"),
      w("textarea", {
        id: "source-bundle-preview",
        readonly: "",
        spellcheck: "false",
        "aria-label": "まとめたソースのプレビュー"
      }),
      w("div", {
        id: "source-bundle-status",
        class: "hint",
        "aria-live": "polite"
      }),
      w("div", { class: "hint" }, " Copilot への送信には修正指示と、設定の「Copilot 連携」が必要です。 "),
      w("div", { class: "root-actions source-bundle-actions" }, [
        w("button", {
          id: "source-bundle-close",
          type: "button"
        }, "閉じる"),
        w("button", {
          id: "source-bundle-refresh",
          type: "button"
        }, "作り直す"),
        w("button", {
          id: "source-bundle-copy",
          type: "button",
          disabled: ""
        }, "コピー"),
        w("button", {
          id: "source-bundle-download",
          type: "button",
          disabled: ""
        }, " ファイルに保存 "),
        w("button", {
          id: "source-bundle-send",
          type: "button",
          class: "apply-btn",
          disabled: ""
        }, " Copilotに送信 ")
      ])
    ], -1)
  ])]);
}
const ec = /* @__PURE__ */ zi(Zl, [["render", tc]]), sc = { id: "topbar" }, nc = /* @__PURE__ */ Zs({
  __name: "App",
  setup(t) {
    return (e, s) => (Wt(), ee(dt, null, [
      w("header", sc, [
        ft(Ml)
      ]),
      ft(Xl),
      ft(Cl),
      ft(ec)
    ], 64));
  }
});
vl(nc).mount("#app");
hi(() => import("./app-CmfdHiZ8.js"));
export {
  B as a,
  lc as b,
  Fl as c,
  Ps as d,
  rc as e,
  cc as f,
  oc as s,
  Ss as w
};
