// @__NO_SIDE_EFFECTS__
function Vs(t) {
  const e = /* @__PURE__ */ Object.create(null);
  for (const s of t.split(",")) e[s] = 1;
  return (s) => s in e;
}
const B = {}, ie = [], At = () => {
}, Kn = () => !1, rs = (t) => t.charCodeAt(0) === 111 && t.charCodeAt(1) === 110 && // uppercase letter
(t.charCodeAt(2) > 122 || t.charCodeAt(2) < 97), os = (t) => t.startsWith("onUpdate:"), et = Object.assign, Us = (t, e) => {
  const s = t.indexOf(e);
  s > -1 && t.splice(s, 1);
}, Xi = Object.prototype.hasOwnProperty, $ = (t, e) => Xi.call(t, e), P = Array.isArray, Wt = (t) => Re(t) === "[object Map]", ze = (t) => Re(t) === "[object Set]", an = (t) => Re(t) === "[object Date]", R = (t) => typeof t == "function", Y = (t) => typeof t == "string", It = (t) => typeof t == "symbol", V = (t) => t !== null && typeof t == "object", Wn = (t) => (V(t) || R(t)) && R(t.then) && R(t.catch), Bn = Object.prototype.toString, Re = (t) => Bn.call(t), Zi = (t) => Re(t).slice(8, -1), kn = (t) => Re(t) === "[object Object]", Ks = (t) => Y(t) && t !== "NaN" && t[0] !== "-" && "" + parseInt(t, 10) === t, _e = /* @__PURE__ */ Vs(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), ls = (t) => {
  const e = /* @__PURE__ */ Object.create(null);
  return ((s) => e[s] || (e[s] = t(s)));
}, Qi = /-\w/g, pt = ls(
  (t) => t.replace(Qi, (e) => e.slice(1).toUpperCase())
), tr = /\B([A-Z])/g, ee = ls(
  (t) => t.replace(tr, "-$1").toLowerCase()
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
}, er = (t) => {
  const e = parseFloat(t);
  return isNaN(e) ? t : e;
};
let dn;
const cs = () => dn || (dn = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function Ws(t) {
  if (P(t)) {
    const e = {};
    for (let s = 0; s < t.length; s++) {
      const n = t[s], i = Y(n) ? rr(n) : Ws(n);
      if (i)
        for (const r in i)
          e[r] = i[r];
    }
    return e;
  } else if (Y(t) || V(t))
    return t;
}
const sr = /;(?![^(]*\))/g, nr = /:([^]+)/, ir = /\/\*[^]*?\*\//g;
function rr(t) {
  const e = {};
  return t.replace(ir, "").split(sr).forEach((s) => {
    if (s) {
      const n = s.split(nr);
      n.length > 1 && (e[n[0].trim()] = n[1].trim());
    }
  }), e;
}
function ce(t) {
  let e = "";
  if (Y(t))
    e = t;
  else if (P(t))
    for (let s = 0; s < t.length; s++) {
      const n = ce(t[s]);
      n && (e += n + " ");
    }
  else if (V(t))
    for (const s in t)
      t[s] && (e += s + " ");
  return e.trim();
}
const or = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", lr = /* @__PURE__ */ Vs(or);
function Gn(t) {
  return !!t || t === "";
}
function cr(t, e) {
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
  if (s = P(t), n = P(e), s || n)
    return s && n ? cr(t, e) : !1;
  if (s = V(t), n = V(e), s || n) {
    if (!s || !n)
      return !1;
    if (s = Wt(t), n = Wt(e), s || n || (s = ze(t), n = ze(e), s || n))
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
const zn = (t) => !!(t && t.__v_isRef === !0), ye = (t) => Y(t) ? t : t == null ? "" : P(t) || V(t) && (t.toString === Bn || !R(t.toString)) ? zn(t) ? ye(t.value) : JSON.stringify(t, Yn, 2) : String(t), Yn = (t, e) => zn(e) ? Yn(t, e.value) : Wt(e) ? {
  [`Map(${e.size})`]: [...e.entries()].reduce(
    (s, [n, i], r) => (s[ys(n, r) + " =>"] = i, s),
    {}
  )
} : ze(e) ? {
  [`Set(${e.size})`]: [...e.values()].map((s) => ys(s))
} : It(e) ? ys(e) : V(e) && !P(e) && !kn(e) ? String(e) : e, ys = (t, e = "") => {
  var s;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    It(t) ? `Symbol(${(s = t.description) != null ? s : e})` : t
  );
};
let tt;
class fr {
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
function ur() {
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
let Zn = 0, xe, we;
function Qn(t, e = !1) {
  if (t.flags |= 8, e) {
    t.next = we, we = t;
    return;
  }
  t.next = xe, xe = t;
}
function Bs() {
  Zn++;
}
function ks() {
  if (--Zn > 0)
    return;
  if (we) {
    let e = we;
    for (we = void 0; e; ) {
      const s = e.next;
      e.next = void 0, e.flags &= -9, e = s;
    }
  }
  let t;
  for (; xe; ) {
    let e = xe;
    for (xe = void 0; e; ) {
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
    n.version === -1 ? (n === s && (s = i), qs(n), ar(n)) : e = n, n.dep.activeLink = n.prevActiveLink, n.prevActiveLink = void 0, n = i;
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
  if (t.flags & 4 && !(t.flags & 16) || (t.flags &= -17, t.globalVersion === Te) || (t.globalVersion = Te, !t.isSSR && t.flags & 128 && (!t.deps && !t._dirty || !Ms(t))))
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
function ar(t) {
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
let Te = 0;
class dr {
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
      s = this.activeLink = new dr(W, this), W.deps ? (s.prevDep = W.depsTail, W.depsTail.nextDep = s, W.depsTail = s) : W.deps = W.depsTail = s, ri(s);
    else if (s.version === -1 && (s.version = this.version, s.nextDep)) {
      const n = s.nextDep;
      n.prevDep = s.prevDep, s.prevDep && (s.prevDep.nextDep = n), s.prevDep = W.depsTail, s.nextDep = void 0, W.depsTail.nextDep = s, W.depsTail = s, W.deps === s && (W.deps = n);
    }
    return s;
  }
  trigger(e) {
    this.version++, Te++, this.notify(e);
  }
  notify(e) {
    Bs();
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
const Rs = /* @__PURE__ */ new WeakMap(), Xt = /* @__PURE__ */ Symbol(
  ""
), Fs = /* @__PURE__ */ Symbol(
  ""
), Oe = /* @__PURE__ */ Symbol(
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
    Te++;
    return;
  }
  const o = (f) => {
    f && f.trigger();
  };
  if (Bs(), e === "clear")
    l.forEach(o);
  else {
    const f = P(t), d = f && Ks(s);
    if (f && s === "length") {
      const a = Number(n);
      l.forEach((h, C) => {
        (C === "length" || C === Oe || !It(C) && C >= a) && o(h);
      });
    } else
      switch ((s !== void 0 || l.has(void 0)) && o(l.get(s)), d && o(l.get(Oe)), e) {
        case "add":
          f ? d && o(l.get("length")) : (o(l.get(Xt)), Wt(t) && o(l.get(Fs)));
          break;
        case "delete":
          f || (o(l.get(Xt)), Wt(t) && o(l.get(Fs)));
          break;
        case "set":
          Wt(t) && o(l.get(Xt));
          break;
      }
  }
  ks();
}
function se(t) {
  const e = /* @__PURE__ */ N(t);
  return e === t ? e : (st(e, "iterate", Oe), /* @__PURE__ */ gt(t) ? e : e.map(jt));
}
function us(t) {
  return st(t = /* @__PURE__ */ N(t), "iterate", Oe), t;
}
function Et(t, e) {
  return /* @__PURE__ */ Bt(t) ? fe(/* @__PURE__ */ Zt(t) ? jt(e) : e) : jt(e);
}
const pr = {
  __proto__: null,
  [Symbol.iterator]() {
    return ws(this, Symbol.iterator, (t) => Et(this, t));
  },
  concat(...t) {
    return se(this).concat(
      ...t.map((e) => P(e) ? se(e) : e)
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
    return se(this).join(t);
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
    return se(this).toReversed();
  },
  toSorted(t) {
    return se(this).toSorted(t);
  },
  toSpliced(...t) {
    return se(this).toSpliced(...t);
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
const hr = Array.prototype;
function Pt(t, e, s, n, i, r) {
  const l = us(t), o = l !== t && !/* @__PURE__ */ gt(t), f = l[e];
  if (f !== hr[e]) {
    const h = f.apply(t, r);
    return o ? jt(h) : h;
  }
  let d = s;
  l !== t && (o ? d = function(h, C) {
    return s.call(this, Et(t, h), C, t);
  } : s.length > 2 && (d = function(h, C) {
    return s.call(this, h, C, t);
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
  st(n, "iterate", Oe);
  const i = n[e](...s);
  return (i === -1 || i === !1) && /* @__PURE__ */ zs(s[0]) ? (s[0] = /* @__PURE__ */ N(s[0]), n[e](...s)) : i;
}
function ge(t, e, s = []) {
  Dt(), Bs();
  const n = (/* @__PURE__ */ N(t))[e].apply(t, s);
  return ks(), $t(), n;
}
const gr = /* @__PURE__ */ Vs("__proto__,__v_isRef,__isVue"), oi = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((t) => t !== "arguments" && t !== "caller").map((t) => Symbol[t]).filter(It)
);
function br(t) {
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
      return n === (i ? r ? Tr : ai : r ? ui : fi).get(e) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(e) === Object.getPrototypeOf(n) ? e : void 0;
    const l = P(e);
    if (!i) {
      let f;
      if (l && (f = pr[s]))
        return f;
      if (s === "hasOwnProperty")
        return br;
    }
    const o = Reflect.get(
      e,
      s,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      /* @__PURE__ */ lt(e) ? e : n
    );
    if ((It(s) ? oi.has(s) : gr(s)) || (i || st(e, "get", s), r))
      return o;
    if (/* @__PURE__ */ lt(o)) {
      const f = l && Ks(s) ? o : o.value;
      return i && V(f) ? /* @__PURE__ */ Ye(f) : f;
    }
    return V(o) ? i ? /* @__PURE__ */ Ye(o) : /* @__PURE__ */ Fe(o) : o;
  }
}
class ci extends li {
  constructor(e = !1) {
    super(!1, e);
  }
  set(e, s, n, i) {
    let r = e[s];
    const l = P(e) && Ks(s);
    if (!this._isShallow) {
      const d = /* @__PURE__ */ Bt(r);
      if (!/* @__PURE__ */ gt(n) && !/* @__PURE__ */ Bt(n) && (r = /* @__PURE__ */ N(r), n = /* @__PURE__ */ N(n)), !l && /* @__PURE__ */ lt(r) && !/* @__PURE__ */ lt(n))
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
      P(e) ? "length" : Xt
    ), Reflect.ownKeys(e);
  }
}
class mr extends li {
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
const vr = /* @__PURE__ */ new ci(), _r = /* @__PURE__ */ new mr(), yr = /* @__PURE__ */ new ci(!0);
const Ls = (t) => t, Ue = (t) => Reflect.getPrototypeOf(t);
function xr(t, e, s) {
  return function(...n) {
    const i = this.__v_raw, r = /* @__PURE__ */ N(i), l = Wt(r), o = t === "entries" || t === Symbol.iterator && l, f = t === "keys" && l, d = i[t](...n), a = s ? Ls : e ? fe : jt;
    return !e && st(
      r,
      "iterate",
      f ? Fs : Xt
    ), et(
      // inheriting all iterator properties
      Object.create(d),
      {
        // iterator protocol
        next() {
          const { value: h, done: C } = d.next();
          return C ? { value: h, done: C } : {
            value: o ? [a(h[0]), a(h[1])] : a(h),
            done: C
          };
        }
      }
    );
  };
}
function Ke(t) {
  return function(...e) {
    return t === "delete" ? !1 : t === "clear" ? void 0 : this;
  };
}
function wr(t, e) {
  const s = {
    get(i) {
      const r = this.__v_raw, l = /* @__PURE__ */ N(r), o = /* @__PURE__ */ N(i);
      t || (Ft(i, o) && st(l, "get", i), st(l, "get", o));
      const { has: f } = Ue(l), d = e ? Ls : t ? fe : jt;
      if (f.call(l, i))
        return d(r.get(i));
      if (f.call(l, o))
        return d(r.get(o));
      r !== l && r.get(i);
    },
    get size() {
      const i = this.__v_raw;
      return !t && st(/* @__PURE__ */ N(i), "iterate", Xt), i.size;
    },
    has(i) {
      const r = this.__v_raw, l = /* @__PURE__ */ N(r), o = /* @__PURE__ */ N(i);
      return t || (Ft(i, o) && st(l, "has", i), st(l, "has", o)), i === o ? r.has(i) : r.has(i) || r.has(o);
    },
    forEach(i, r) {
      const l = this, o = l.__v_raw, f = /* @__PURE__ */ N(o), d = e ? Ls : t ? fe : jt;
      return !t && st(f, "iterate", Xt), o.forEach((a, h) => i.call(r, d(a), d(h), l));
    }
  };
  return et(
    s,
    t ? {
      add: Ke("add"),
      set: Ke("set"),
      delete: Ke("delete"),
      clear: Ke("clear")
    } : {
      add(i) {
        const r = /* @__PURE__ */ N(this), l = Ue(r), o = /* @__PURE__ */ N(i), f = !e && !/* @__PURE__ */ gt(i) && !/* @__PURE__ */ Bt(i) ? o : i;
        return l.has.call(r, f) || Ft(i, f) && l.has.call(r, i) || Ft(o, f) && l.has.call(r, o) || (r.add(f), Lt(r, "add", f, f)), this;
      },
      set(i, r) {
        !e && !/* @__PURE__ */ gt(r) && !/* @__PURE__ */ Bt(r) && (r = /* @__PURE__ */ N(r));
        const l = /* @__PURE__ */ N(this), { has: o, get: f } = Ue(l);
        let d = o.call(l, i);
        d || (i = /* @__PURE__ */ N(i), d = o.call(l, i));
        const a = f.call(l, i);
        return l.set(i, r), d ? Ft(r, a) && Lt(l, "set", i, r) : Lt(l, "add", i, r), this;
      },
      delete(i) {
        const r = /* @__PURE__ */ N(this), { has: l, get: o } = Ue(r);
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
    s[i] = xr(i, t, e);
  }), s;
}
function Js(t, e) {
  const s = wr(t, e);
  return (n, i, r) => i === "__v_isReactive" ? !t : i === "__v_isReadonly" ? t : i === "__v_raw" ? n : Reflect.get(
    $(s, i) && i in n ? s : n,
    i,
    r
  );
}
const Cr = {
  get: /* @__PURE__ */ Js(!1, !1)
}, Sr = {
  get: /* @__PURE__ */ Js(!1, !0)
}, Er = {
  get: /* @__PURE__ */ Js(!0, !1)
};
const fi = /* @__PURE__ */ new WeakMap(), ui = /* @__PURE__ */ new WeakMap(), ai = /* @__PURE__ */ new WeakMap(), Tr = /* @__PURE__ */ new WeakMap();
function Or(t) {
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
function Fe(t) {
  return /* @__PURE__ */ Bt(t) ? t : Gs(
    t,
    !1,
    vr,
    Cr,
    fi
  );
}
// @__NO_SIDE_EFFECTS__
function Ar(t) {
  return Gs(
    t,
    !1,
    yr,
    Sr,
    ui
  );
}
// @__NO_SIDE_EFFECTS__
function Ye(t) {
  return Gs(
    t,
    !0,
    _r,
    Er,
    ai
  );
}
function Gs(t, e, s, n, i) {
  if (!V(t) || t.__v_raw && !(e && t.__v_isReactive) || t.__v_skip || !Object.isExtensible(t))
    return t;
  const r = i.get(t);
  if (r)
    return r;
  const l = Or(Zi(t));
  if (l === 0)
    return t;
  const o = new Proxy(
    t,
    l === 2 ? n : s
  );
  return i.set(t, o), o;
}
// @__NO_SIDE_EFFECTS__
function Zt(t) {
  return /* @__PURE__ */ Bt(t) ? /* @__PURE__ */ Zt(t.__v_raw) : !!(t && t.__v_isReactive);
}
// @__NO_SIDE_EFFECTS__
function Bt(t) {
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
function Ir(t) {
  return !$(t, "__v_skip") && Object.isExtensible(t) && Jn(t, "__v_skip", !0), t;
}
const jt = (t) => V(t) ? /* @__PURE__ */ Fe(t) : t, fe = (t) => V(t) ? /* @__PURE__ */ Ye(t) : t;
// @__NO_SIDE_EFFECTS__
function lt(t) {
  return t ? t.__v_isRef === !0 : !1;
}
function z(t) {
  return /* @__PURE__ */ lt(t) ? t.value : t;
}
const Pr = {
  get: (t, e, s) => e === "__v_raw" ? t : z(Reflect.get(t, e, s)),
  set: (t, e, s, n) => {
    const i = t[e];
    return /* @__PURE__ */ lt(i) && !/* @__PURE__ */ lt(s) ? (i.value = s, !0) : Reflect.set(t, e, s, n);
  }
};
function di(t) {
  return /* @__PURE__ */ Zt(t) ? t : new Proxy(t, Pr);
}
class Mr {
  constructor(e, s, n) {
    this.fn = e, this.setter = s, this._value = void 0, this.dep = new ii(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Te - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !s, this.isSSR = n;
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
function Rr(t, e, s = !1) {
  let n, i;
  return R(t) ? n = t : (n = t.get, i = t.set), new Mr(n, i, s);
}
const We = {}, Xe = /* @__PURE__ */ new WeakMap();
let Yt;
function Fr(t, e = !1, s = Yt) {
  if (s) {
    let n = Xe.get(s);
    n || Xe.set(s, n = []), n.push(t);
  }
}
function Lr(t, e, s = B) {
  const { immediate: n, deep: i, once: r, scheduler: l, augmentJob: o, call: f } = s, d = (A) => i ? A : /* @__PURE__ */ gt(A) || i === !1 || i === 0 ? Kt(A, 1) : Kt(A);
  let a, h, C, S, D = !1, E = !1;
  if (/* @__PURE__ */ lt(t) ? (h = () => t.value, D = /* @__PURE__ */ gt(t)) : /* @__PURE__ */ Zt(t) ? (h = () => d(t), D = !0) : P(t) ? (E = !0, D = t.some((A) => /* @__PURE__ */ Zt(A) || /* @__PURE__ */ gt(A)), h = () => t.map((A) => {
    if (/* @__PURE__ */ lt(A))
      return A.value;
    if (/* @__PURE__ */ Zt(A))
      return d(A);
    if (R(A))
      return f ? f(A, 2) : A();
  })) : R(t) ? e ? h = f ? () => f(t, 2) : t : h = () => {
    if (C) {
      Dt();
      try {
        C();
      } finally {
        $t();
      }
    }
    const A = Yt;
    Yt = a;
    try {
      return f ? f(t, 3, [S]) : t(S);
    } finally {
      Yt = A;
    }
  } : h = At, e && i) {
    const A = h, Z = i === !0 ? 1 / 0 : i;
    h = () => Kt(A(), Z);
  }
  const q = ur(), J = () => {
    a.stop(), q && q.active && Us(q.effects, a);
  };
  if (r && e) {
    const A = e;
    e = (...Z) => {
      const mt = A(...Z);
      return J(), mt;
    };
  }
  let L = E ? new Array(t.length).fill(We) : We;
  const j = (A) => {
    if (!(!(a.flags & 1) || !a.dirty && !A))
      if (e) {
        const Z = a.run();
        if (A || i || D || (E ? Z.some((mt, vt) => Ft(mt, L[vt])) : Ft(Z, L))) {
          C && C();
          const mt = Yt;
          Yt = a;
          try {
            const vt = [
              Z,
              // pass undefined as the old value when it's changed for the first time
              L === We ? void 0 : E && L[0] === We ? [] : L,
              S
            ];
            L = Z, f ? f(e, 3, vt) : (
              // @ts-expect-error
              e(...vt)
            );
          } finally {
            Yt = mt;
          }
        }
      } else
        a.run();
  };
  return o && o(j), a = new Xn(h), a.scheduler = l ? () => l(j, !1) : j, S = (A) => Fr(A, !1, a), C = a.onStop = () => {
    const A = Xe.get(a);
    if (A) {
      if (f)
        f(A, 4);
      else
        for (const Z of A) Z();
      Xe.delete(a);
    }
  }, e ? n ? j(!0) : L = a.run() : l ? l(j.bind(null, !0), !0) : a.run(), J.pause = a.pause.bind(a), J.resume = a.resume.bind(a), J.stop = J, J;
}
function Kt(t, e = 1 / 0, s) {
  if (e <= 0 || !V(t) || t.__v_skip || (s = s || /* @__PURE__ */ new Map(), (s.get(t) || 0) >= e))
    return t;
  if (s.set(t, e), e--, /* @__PURE__ */ lt(t))
    Kt(t.value, e, s);
  else if (P(t))
    for (let n = 0; n < t.length; n++)
      Kt(t[n], e, s);
  else if (ze(t) || Wt(t))
    t.forEach((n) => {
      Kt(n, e, s);
    });
  else if (kn(t)) {
    for (const n in t)
      Kt(t[n], e, s);
    for (const n of Object.getOwnPropertySymbols(t))
      Object.prototype.propertyIsEnumerable.call(t, n) && Kt(t[n], e, s);
  }
  return t;
}
function Le(t, e, s, n) {
  try {
    return n ? t(...n) : t();
  } catch (i) {
    as(i, e, s);
  }
}
function bt(t, e, s, n) {
  if (R(t)) {
    const i = Le(t, e, s, n);
    return i && Wn(i) && i.catch((r) => {
      as(r, e, s);
    }), i;
  }
  if (P(t)) {
    const i = [];
    for (let r = 0; r < t.length; r++)
      i.push(bt(t[r], e, s, n));
    return i;
  }
}
function as(t, e, s, n = !0) {
  const i = e ? e.vnode : null, { errorHandler: r, throwUnhandledErrorInProduction: l } = e && e.appContext.config || B;
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
      Dt(), Le(r, null, 10, [
        t,
        f,
        d
      ]), $t();
      return;
    }
  }
  Dr(t, s, i, n, l);
}
function Dr(t, e, s, n = !0, i = !1) {
  if (i)
    throw t;
  console.error(t);
}
const rt = [];
let St = -1;
const re = [];
let Ut = null, ne = 0;
const pi = /* @__PURE__ */ Promise.resolve();
let Ze = null;
function hi(t) {
  const e = Ze || pi;
  return t ? e.then(this ? t.bind(this) : t) : e;
}
function $r(t) {
  let e = St + 1, s = rt.length;
  for (; e < s; ) {
    const n = e + s >>> 1, i = rt[n], r = Ae(i);
    r < t || r === t && i.flags & 2 ? e = n + 1 : s = n;
  }
  return e;
}
function Ys(t) {
  if (!(t.flags & 1)) {
    const e = Ae(t), s = rt[rt.length - 1];
    !s || // fast path when the job id is larger than the tail
    !(t.flags & 2) && e >= Ae(s) ? rt.push(t) : rt.splice($r(e), 0, t), t.flags |= 1, gi();
  }
}
function gi() {
  Ze || (Ze = pi.then(mi));
}
function jr(t) {
  if (!P(t))
    Ut && t.id === -1 ? Ut.splice(ne + 1, 0, t) : t.flags & 1 || (re.push(t), t.flags |= 1);
  else
    for (let e = 0; e < t.length; e++)
      re.push(t[e]);
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
  if (re.length) {
    const e = [...new Set(re)].sort(
      (s, n) => Ae(s) - Ae(n)
    );
    if (re.length = 0, Ut) {
      for (let s = 0; s < e.length; s++)
        Ut.push(e[s]);
      return;
    }
    for (Ut = e, ne = 0; ne < Ut.length; ne++) {
      const s = Ut[ne];
      s.flags & 4 && (s.flags &= -2), s.flags & 8 || s(), s.flags &= -2;
    }
    Ut = null, ne = 0;
  }
}
const Ae = (t) => t.id == null ? t.flags & 2 ? -1 : 1 / 0 : t.id;
function mi(t) {
  try {
    for (St = 0; St < rt.length; St++) {
      const e = rt[St];
      e && !(e.flags & 8) && (e.flags & 4 && (e.flags &= -2), Le(
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
    St = -1, rt.length = 0, bi(), Ze = null, (rt.length || re.length) && mi();
  }
}
let Ot = null, vi = null;
function Qe(t) {
  const e = Ot;
  return Ot = t, vi = t && t.type.__scopeId || null, e;
}
function Hr(t, e = Ot, s) {
  if (!e || t._n)
    return t;
  const n = (...i) => {
    n._d && On(-1);
    const r = Qe(e), l = Qt.length;
    let o;
    try {
      o = t(...i);
    } finally {
      for (let f = Qt.length; f > l; f--) Ki();
      Qe(r), n._d && On(1);
    }
    return o;
  };
  return n._n = !0, n._c = !0, n._d = !0, n;
}
function Gt(t, e, s, n) {
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
function Nr(t, e) {
  if (ot) {
    let s = ot.provides;
    const n = ot.parent && ot.parent.provides;
    n === s && (s = ot.provides = Object.create(n)), s[t] = e;
  }
}
function ke(t, e, s = !1) {
  const n = No();
  if (n || oe) {
    let i = oe ? oe._context.provides : n ? n.parent == null || n.ce ? n.vnode.appContext && n.vnode.appContext.provides : n.parent.provides : void 0;
    if (i && t in i)
      return i[t];
    if (arguments.length > 1)
      return s && R(e) ? e.call(n && n.proxy) : e;
  }
}
const Vr = /* @__PURE__ */ Symbol.for("v-scx"), Ur = () => ke(Vr);
function Ss(t, e, s) {
  return _i(t, e, s);
}
function _i(t, e, s = B) {
  const { immediate: n, deep: i, flush: r, once: l } = s, o = et({}, s), f = e && n || !e && r !== "post";
  let d;
  if (Me) {
    if (r === "sync") {
      const S = Ur();
      d = S.__watcherHandles || (S.__watcherHandles = []);
    } else if (!f) {
      const S = () => {
      };
      return S.stop = At, S.resume = At, S.pause = At, S;
    }
  }
  const a = ot;
  o.call = (S, D, E) => bt(S, a, D, E);
  let h = !1;
  r === "post" ? o.scheduler = (S) => {
    ct(S, a && a.suspense);
  } : r !== "sync" && (h = !0, o.scheduler = (S, D) => {
    D ? S() : Ys(S);
  }), o.augmentJob = (S) => {
    e && (S.flags |= 4), h && (S.flags |= 2, a && (S.id = a.uid, S.i = a));
  };
  const C = Lr(t, e, o);
  return Me && (d ? d.push(C) : f && C()), C;
}
function Kr(t, e, s) {
  const n = this.proxy, i = Y(t) ? t.includes(".") ? yi(n, t) : () => n[t] : t.bind(n, n);
  let r;
  R(e) ? r = e : (r = e.handler, s = e);
  const l = De(this), o = _i(i, r.bind(n), s);
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
function Br(t) {
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
    return ds(t.type) && t.children ? Br(t.children) : t;
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
const ts = /* @__PURE__ */ new WeakMap();
function Ce(t, e, s, n, i = !1) {
  if (P(t)) {
    t.forEach(
      (E, q) => Ce(
        E,
        e && (P(e) ? e[q] : e),
        s,
        n,
        i
      )
    );
    return;
  }
  if (Se(n) && !i) {
    n.shapeFlag & 512 && n.type.__asyncResolved && n.component.subTree.component && Ce(t, e, s, n.component.subTree);
    return;
  }
  const r = n.shapeFlag & 4 ? sn(n.component) : n.el, l = i ? null : r, { i: o, r: f } = t, d = e && e.r, a = o.refs === B ? o.refs = {} : o.refs, h = o.setupState, C = /* @__PURE__ */ N(h), S = h === B ? Kn : (E) => mn(a, E) ? !1 : $(C, E), D = (E, q) => !(q && mn(a, q));
  if (d != null && d !== f) {
    if (vn(e), Y(d))
      a[d] = null, S(d) && (h[d] = null);
    else if (/* @__PURE__ */ lt(d)) {
      const E = e;
      D(d, E.k) && (d.value = null), E.k && (a[E.k] = null);
    }
  }
  if (R(f))
    Le(f, o, 12, [l, a]);
  else {
    const E = Y(f), q = /* @__PURE__ */ lt(f);
    if (E || q) {
      const J = () => {
        if (t.f) {
          const L = E ? S(f) ? h[f] : a[f] : D() || !t.k ? f.value : a[t.k];
          if (i)
            P(L) && Us(L, r);
          else if (P(L))
            L.includes(r) || L.push(r);
          else if (E)
            a[f] = [r], S(f) && (h[f] = a[f]);
          else {
            const j = [r];
            D(f, t.k) && (f.value = j), t.k && (a[t.k] = j);
          }
        } else E ? (a[f] = l, S(f) && (h[f] = l)) : q && (D(f, t.k) && (f.value = l), t.k && (a[t.k] = l));
      };
      if (l) {
        const L = () => {
          J(), ts.delete(t);
        };
        L.id = -1, ts.set(t, L), ct(L, s);
      } else
        vn(t), J();
    }
  }
}
function vn(t) {
  const e = ts.get(t);
  e && (e.flags |= 8, ts.delete(t));
}
cs().requestIdleCallback;
cs().cancelIdleCallback;
const Se = (t) => !!t.type.__asyncLoader, Qs = (t) => t.type.__isKeepAlive;
function kr(t, e) {
  Ci(t, "a", e);
}
function qr(t, e) {
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
      Qs(i.parent.vnode) && Jr(n, e, s, i), i = i.parent;
  }
}
function Jr(t, e, s, n) {
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
      const o = De(s), f = bt(e, s, t, l);
      return o(), $t(), f;
    });
    return n ? i.unshift(r) : i.push(r), r;
  }
}
const Nt = (t) => (e, s = ot) => {
  (!Me || t === "sp") && ps(t, (...n) => e(...n), s);
}, Gr = Nt("bm"), zr = Nt("m"), Yr = Nt(
  "bu"
), Xr = Nt("u"), Zr = Nt(
  "bum"
), Si = Nt("um"), Qr = Nt(
  "sp"
), to = Nt("rtg"), eo = Nt("rtc");
function so(t, e = ot) {
  ps("ec", t, e);
}
const no = /* @__PURE__ */ Symbol.for("v-ndc");
function io(t, e, s, n) {
  let i;
  const r = s, l = P(t);
  if (l || Y(t)) {
    const o = l && /* @__PURE__ */ Zt(t);
    let f = !1, d = !1;
    o && (f = !/* @__PURE__ */ gt(t), d = /* @__PURE__ */ Bt(t), t = us(t)), i = new Array(t.length);
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
const Ds = (t) => t ? qi(t) ? sn(t) : Ds(t.parent) : null, Ee = (
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
), Ts = (t, e) => t !== B && !t.__isScriptSetup && $(t, e), ro = {
  get({ _: t }, e) {
    if (e === "__v_skip")
      return !0;
    const { ctx: s, setupState: n, data: i, props: r, accessCache: l, type: o, appContext: f } = t;
    if (e[0] !== "$") {
      const C = l[e];
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
        if (Ts(n, e))
          return l[e] = 1, n[e];
        if (i !== B && $(i, e))
          return l[e] = 2, i[e];
        if ($(r, e))
          return l[e] = 3, r[e];
        if (s !== B && $(s, e))
          return l[e] = 4, s[e];
        $s && (l[e] = 0);
      }
    }
    const d = Ee[e];
    let a, h;
    if (d)
      return e === "$attrs" && st(t.attrs, "get", ""), d(t);
    if (
      // css module (injected by vue-loader)
      (a = o.__cssModules) && (a = a[e])
    )
      return a;
    if (s !== B && $(s, e))
      return l[e] = 4, s[e];
    if (
      // global properties
      h = f.config.globalProperties, $(h, e)
    )
      return h[e];
  },
  set({ _: t }, e, s) {
    const { data: n, setupState: i, ctx: r } = t;
    return Ts(i, e) ? (i[e] = s, !0) : n !== B && $(n, e) ? (n[e] = s, !0) : $(t.props, e) || e[0] === "$" && e.slice(1) in t ? !1 : (r[e] = s, !0);
  },
  has({
    _: { data: t, setupState: e, accessCache: s, ctx: n, appContext: i, props: r, type: l }
  }, o) {
    let f;
    return !!(s[o] || t !== B && o[0] !== "$" && $(t, o) || Ts(e, o) || $(r, o) || $(n, o) || $(Ee, o) || $(i.config.globalProperties, o) || (f = l.__cssModules) && f[o]);
  },
  defineProperty(t, e, s) {
    return s.get != null ? t._.accessCache[e] = 0 : $(s, "value") && this.set(t, e, s.value, null), Reflect.defineProperty(t, e, s);
  }
};
function _n(t) {
  return P(t) ? t.reduce(
    (e, s) => (e[s] = null, e),
    {}
  ) : t;
}
let $s = !0;
function oo(t) {
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
    mounted: C,
    beforeUpdate: S,
    updated: D,
    activated: E,
    deactivated: q,
    beforeDestroy: J,
    beforeUnmount: L,
    destroyed: j,
    unmounted: A,
    render: Z,
    renderTracked: mt,
    renderTriggered: vt,
    errorCaptured: Vt,
    serverPrefetch: $e,
    // public API
    expose: kt,
    inheritAttrs: ae,
    // assets
    components: je,
    directives: He,
    filters: bs
  } = e;
  if (d && lo(d, n, null), l)
    for (const G in l) {
      const K = l[G];
      R(K) && (n[G] = K.bind(s));
    }
  if (i) {
    const G = i.call(s, s);
    V(G) && (t.data = /* @__PURE__ */ Fe(G));
  }
  if ($s = !0, r)
    for (const G in r) {
      const K = r[G], qt = R(K) ? K.bind(s, s) : R(K.get) ? K.get.bind(s, s) : At, Ne = !R(K) && R(K.set) ? K.set.bind(s) : At, Jt = nn({
        get: qt,
        set: Ne
      });
      Object.defineProperty(n, G, {
        enumerable: !0,
        configurable: !0,
        get: () => Jt.value,
        set: (_t) => Jt.value = _t
      });
    }
  if (o)
    for (const G in o)
      Ei(o[G], n, s, G);
  if (f) {
    const G = R(f) ? f.call(s) : f;
    Reflect.ownKeys(G).forEach((K) => {
      Nr(K, G[K]);
    });
  }
  a && yn(a, t, "c");
  function nt(G, K) {
    P(K) ? K.forEach((qt) => G(qt.bind(s))) : K && G(K.bind(s));
  }
  if (nt(Gr, h), nt(zr, C), nt(Yr, S), nt(Xr, D), nt(kr, E), nt(qr, q), nt(so, Vt), nt(eo, mt), nt(to, vt), nt(Zr, L), nt(Si, A), nt(Qr, $e), P(kt))
    if (kt.length) {
      const G = t.exposed || (t.exposed = {});
      kt.forEach((K) => {
        Object.defineProperty(G, K, {
          get: () => s[K],
          set: (qt) => s[K] = qt,
          enumerable: !0
        });
      });
    } else t.exposed || (t.exposed = {});
  Z && t.render === At && (t.render = Z), ae != null && (t.inheritAttrs = ae), je && (t.components = je), He && (t.directives = He), $e && wi(t);
}
function lo(t, e, s = At) {
  P(t) && (t = js(t));
  for (const n in t) {
    const i = t[n];
    let r;
    V(i) ? "default" in i ? r = ke(
      i.from || n,
      i.default,
      !0
    ) : r = ke(i.from || n) : r = ke(i), /* @__PURE__ */ lt(r) ? Object.defineProperty(e, n, {
      enumerable: !0,
      configurable: !0,
      get: () => r.value,
      set: (l) => r.value = l
    }) : e[n] = r;
  }
}
function yn(t, e, s) {
  bt(
    P(t) ? t.map((n) => n.bind(e.proxy)) : t.bind(e.proxy),
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
    if (P(t))
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
    (d) => es(f, d, l, !0)
  ), es(f, e, l)), V(e) && r.set(e, f), f;
}
function es(t, e, s, n = !1) {
  const { mixins: i, extends: r } = e;
  r && es(t, r, s, !0), i && i.forEach(
    (l) => es(t, l, s, !0)
  );
  for (const l in e)
    if (!(n && l === "expose")) {
      const o = co[l] || s && s[l];
      t[l] = o ? o(t[l], e[l]) : e[l];
    }
  return t;
}
const co = {
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
  watch: uo,
  // provide / inject
  provide: xn,
  inject: fo
};
function xn(t, e) {
  return e ? t ? function() {
    return et(
      R(t) ? t.call(this, this) : t,
      R(e) ? e.call(this, this) : e
    );
  } : e : t;
}
function fo(t, e) {
  return me(js(t), js(e));
}
function js(t) {
  if (P(t)) {
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
  return t ? P(t) && P(e) ? [.../* @__PURE__ */ new Set([...t, ...e])] : et(
    /* @__PURE__ */ Object.create(null),
    _n(t),
    _n(e ?? {})
  ) : e;
}
function uo(t, e) {
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
      isNativeTag: Kn,
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
let ao = 0;
function po(t, e) {
  return function(n, i = null) {
    R(n) || (n = et({}, n)), i != null && !V(i) && (i = null);
    const r = Oi(), l = /* @__PURE__ */ new WeakSet(), o = [];
    let f = !1;
    const d = r.app = {
      _uid: ao++,
      _component: n,
      _props: i,
      _container: null,
      _context: r,
      _instance: null,
      version: ko,
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
      mount(a, h, C) {
        if (!f) {
          const S = d._ceVNode || at(n, i);
          return S.appContext = r, C === !0 ? C = "svg" : C === !1 && (C = void 0), t(S, a, C), f = !0, d._container = a, a.__vue_app__ = d, sn(S.component);
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
        const h = oe;
        oe = d;
        try {
          return a();
        } finally {
          oe = h;
        }
      }
    };
    return d;
  };
}
let oe = null;
const ho = (t, e) => e === "modelValue" || e === "model-value" ? t.modelModifiers : t[`${e}Modifiers`] || t[`${pt(e)}Modifiers`] || t[`${ee(e)}Modifiers`];
function go(t, e, ...s) {
  if (t.isUnmounted) return;
  const n = t.vnode.props || B;
  let i = s;
  const r = e.startsWith("update:"), l = r && ho(n, e.slice(7));
  l && (l.trim && (i = s.map((a) => Y(a) ? a.trim() : a)), l.number && (i = i.map(er)));
  let o, f = n[o = vs(e)] || // also try camelCase event handler (#2249)
  n[o = vs(pt(e))];
  !f && r && (f = n[o = vs(ee(e))]), f && bt(
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
const bo = /* @__PURE__ */ new WeakMap();
function Ai(t, e, s = !1) {
  const n = s ? bo : e.emitsCache, i = n.get(t);
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
  return !r && !o ? (V(t) && n.set(t, null), null) : (P(r) ? r.forEach((f) => l[f] = null) : et(l, r), V(t) && n.set(t, l), l);
}
function hs(t, e) {
  return !t || !rs(e) ? !1 : (e = e.slice(2), e = e === "Once" ? e : e.replace(/Once$/, ""), $(t, e[0].toLowerCase() + e.slice(1)) || $(t, ee(e)) || $(t, e));
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
    data: C,
    setupState: S,
    ctx: D,
    inheritAttrs: E
  } = t, q = Qe(t);
  let J, L;
  try {
    if (s.shapeFlag & 4) {
      const A = i || n, Z = A;
      J = Tt(
        d.call(
          Z,
          A,
          a,
          h,
          S,
          C,
          D
        )
      ), L = o;
    } else {
      const A = e;
      J = Tt(
        A.length > 1 ? A(
          h,
          { attrs: o, slots: l, emit: f }
        ) : A(
          h,
          null
        )
      ), L = e.props ? o : mo(o);
    }
  } catch (A) {
    Qt.length = 0, as(A, t, 1), J = at(Ht);
  }
  let j = J;
  if (L && E !== !1) {
    const A = Object.keys(L), { shapeFlag: Z } = j;
    A.length && Z & 7 && (r && A.some(os) && (L = vo(
      L,
      r
    )), j = ue(j, L, !1, !0));
  }
  if (s.dirs && (j = ue(j, null, !1, !0), j.dirs = j.dirs ? j.dirs.concat(s.dirs) : s.dirs), s.transition) {
    const A = ds(j.type) && xi(j) || j;
    Xs(A, s.transition);
  }
  return J = j, Qe(q), J;
}
const mo = (t) => {
  let e;
  for (const s in t)
    (s === "class" || s === "style" || rs(s)) && ((e || (e = {}))[s] = t[s]);
  return e;
}, vo = (t, e) => {
  const s = {};
  for (const n in t)
    (!os(n) || !(n.slice(9) in e)) && (s[n] = t[n]);
  return s;
};
function _o(t, e, s) {
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
        const C = a[h];
        if (Ii(l, n, C) && !hs(d, C))
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
function yo({ vnode: t, parent: e, suspense: s }, n) {
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
function xo(t, e, s, n = !1) {
  const i = {}, r = Mi();
  t.propsDefaults = /* @__PURE__ */ Object.create(null), Fi(t, e, i, r);
  for (const l in t.propsOptions[0])
    l in i || (i[l] = void 0);
  s ? t.props = n ? i : /* @__PURE__ */ Ar(i) : t.type.props ? t.props = i : t.props = r, t.attrs = r;
}
function wo(t, e, s, n) {
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
        let C = a[h];
        if (hs(t.emitsOptions, C))
          continue;
        const S = e[C];
        if (f)
          if ($(r, C))
            S !== r[C] && (r[C] = S, d = !0);
          else {
            const D = pt(C);
            i[D] = Hs(
              f,
              o,
              D,
              S,
              t,
              !1
            );
          }
        else
          S !== r[C] && (r[C] = S, d = !0);
      }
    }
  } else {
    Fi(t, e, i, r) && (d = !0);
    let a;
    for (const h in o)
      (!e || // for camelCase
      !$(e, h) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((a = ee(h)) === h || !$(e, a))) && (f ? s && // for camelCase
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
      if (_e(f))
        continue;
      const d = e[f];
      let a;
      i && $(i, a = pt(f)) ? !r || !r.includes(a) ? s[a] = d : (o || (o = {}))[a] = d : hs(t.emitsOptions, f) || (!(f in n) || d !== n[f]) && (n[f] = d, l = !0);
    }
  if (r) {
    const f = /* @__PURE__ */ N(s), d = o || B;
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
          const a = De(i);
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
    ] && (n === "" || n === ee(s)) && (n = !0));
  }
  return n;
}
const Co = /* @__PURE__ */ new WeakMap();
function Li(t, e, s = !1) {
  const n = s ? Co : e.propsCache, i = n.get(t);
  if (i)
    return i;
  const r = t.props, l = {}, o = [];
  let f = !1;
  if (!R(t)) {
    const a = (h) => {
      f = !0;
      const [C, S] = Li(h, e, !0);
      et(l, C), S && o.push(...S);
    };
    !s && e.mixins.length && e.mixins.forEach(a), t.extends && a(t.extends), t.mixins && t.mixins.forEach(a);
  }
  if (!r && !f)
    return V(t) && n.set(t, ie), ie;
  if (P(r))
    for (let a = 0; a < r.length; a++) {
      const h = pt(r[a]);
      En(h) && (l[h] = B);
    }
  else if (r)
    for (const a in r) {
      const h = pt(a);
      if (En(h)) {
        const C = r[a], S = l[h] = P(C) || R(C) ? { type: C } : et({}, C), D = S.type;
        let E = !1, q = !0;
        if (P(D))
          for (let J = 0; J < D.length; ++J) {
            const L = D[J], j = R(L) && L.name;
            if (j === "Boolean") {
              E = !0;
              break;
            } else j === "String" && (q = !1);
          }
        else
          E = R(D) && D.name === "Boolean";
        S[
          0
          /* shouldCast */
        ] = E, S[
          1
          /* shouldCastTrue */
        ] = q, (E || $(S, "default")) && o.push(h);
      }
    }
  const d = [l, o];
  return V(t) && n.set(t, d), d;
}
function En(t) {
  return t[0] !== "$" && !_e(t);
}
const tn = (t) => t === "_" || t === "_ctx" || t === "$stable", en = (t) => P(t) ? t.map(Tt) : [Tt(t)], So = (t, e, s) => {
  if (e._n)
    return e;
  const n = Hr((...i) => en(e(...i)), s);
  return n._c = !1, n;
}, Di = (t, e, s) => {
  const n = t._ctx;
  for (const i in t) {
    if (tn(i)) continue;
    const r = t[i];
    if (R(r))
      e[i] = So(i, r, n);
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
}, Eo = (t, e, s) => {
  const n = t.slots = Mi();
  if (t.vnode.shapeFlag & 32) {
    const i = e._;
    i ? (ji(n, e, s), s && Jn(n, "_", i, !0)) : Di(e, n);
  } else e && $i(t, e);
}, To = (t, e, s) => {
  const { vnode: n, slots: i } = t;
  let r = !0, l = B;
  if (n.shapeFlag & 32) {
    const o = e._;
    o ? s && o === 1 ? r = !1 : ji(i, e, s) : (r = !e.$stable, Di(e, i)), l = e;
  } else e && ($i(t, e), l = { default: 1 });
  if (r)
    for (const o in i)
      !tn(o) && l[o] == null && delete i[o];
}, ct = Mo;
function Oo(t) {
  return Ao(t);
}
function Ao(t, e) {
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
    nextSibling: C,
    setScopeId: S = At,
    insertStaticContent: D
  } = t, E = (c, u, p, v = null, m = null, g = null, x = void 0, y = null, _ = !!u.dynamicChildren) => {
    if (c === u)
      return;
    c && !be(c, u) && (v = Ve(c), _t(c, m, g, !0), c = null), u.patchFlag === -2 && (_ = !1, u.dynamicChildren = null);
    const { type: b, ref: O, shapeFlag: w } = u;
    switch (b) {
      case gs:
        q(c, u, p, v);
        break;
      case Ht:
        J(c, u, p, v);
        break;
      case qe:
        c == null && L(u, p, v, x);
        break;
      case dt:
        je(
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
        w & 1 ? Z(
          c,
          u,
          p,
          v,
          m,
          g,
          x,
          y,
          _
        ) : w & 6 ? He(
          c,
          u,
          p,
          v,
          m,
          g,
          x,
          y,
          _
        ) : (w & 64 || w & 128) && b.process(
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
    O != null && m ? Ce(O, c && c.ref, g, u || c, !u) : O == null && c && c.ref != null && Ce(c.ref, null, g, c, !0);
  }, q = (c, u, p, v) => {
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
  }, J = (c, u, p, v) => {
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
      m = C(c), n(c, p, v), c = m;
    n(u, p, v);
  }, A = ({ el: c, anchor: u }) => {
    let p;
    for (; c && c !== u; )
      p = C(c), i(c), c = p;
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
        b && b._beginPatch(), $e(
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
    const { props: O, shapeFlag: w, transition: T, dirs: I } = c;
    if (_ = c.el = l(
      c.type,
      g,
      O && O.is,
      O
    ), w & 8 ? a(_, c.children) : w & 16 && Vt(
      c.children,
      _,
      null,
      v,
      m,
      Os(c, g),
      x,
      y
    ), I && Gt(c, null, v, "created"), vt(_, c, c.scopeId, x, v), O) {
      for (const U in O)
        U !== "value" && !_e(U) && r(_, U, null, O[U], g, v);
      "value" in O && r(_, "value", null, O.value, g), (b = O.onVnodeBeforeMount) && Ct(b, v, c);
    }
    I && Gt(c, null, v, "beforeMount");
    const F = Io(m, T);
    F && T.beforeEnter(_), n(_, u, p), ((b = O && O.onVnodeMounted) || F || I) && ct(() => {
      b && Ct(b, v, c), F && T.enter(_), I && Gt(c, null, v, "mounted");
    }, m);
  }, vt = (c, u, p, v, m) => {
    if (p && S(c, p), v)
      for (let g = 0; g < v.length; g++)
        S(c, v[g]);
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
      const O = c[b] = y ? Rt(c[b]) : Tt(c[b]);
      E(
        null,
        O,
        u,
        p,
        v,
        m,
        g,
        x,
        y
      );
    }
  }, $e = (c, u, p, v, m, g, x) => {
    const y = u.el = c.el;
    let { patchFlag: _, dynamicChildren: b, dirs: O } = u;
    _ |= c.patchFlag & 16;
    const w = c.props || B, T = u.props || B;
    let I;
    if (p && zt(p, !1), (I = T.onVnodeBeforeUpdate) && Ct(I, p, u, c), O && Gt(u, c, p, "beforeUpdate"), p && zt(p, !0), // #6385 the old vnode may be a user-wrapped non-isomorphic block
    // Force full diff when block metadata is unstable.
    b && (!c.dynamicChildren || c.dynamicChildren.length !== b.length) && (_ = 0, x = !1, b = null), (w.innerHTML && T.innerHTML == null || w.textContent && T.textContent == null) && a(y, ""), b ? kt(
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
        ae(y, w, T, p, m);
      else if (_ & 2 && w.class !== T.class && r(y, "class", null, T.class, m), _ & 4 && r(y, "style", w.style, T.style, m), _ & 8) {
        const F = u.dynamicProps;
        for (let U = 0; U < F.length; U++) {
          const H = F[U], X = w[H], Q = T[H];
          (Q !== X || H === "value") && r(y, H, X, Q, m, p);
        }
      }
      _ & 1 && c.children !== u.children && a(y, u.children);
    } else !x && b == null && ae(y, w, T, p, m);
    ((I = T.onVnodeUpdated) || O) && ct(() => {
      I && Ct(I, p, u, c), O && Gt(u, c, p, "updated");
    }, v);
  }, kt = (c, u, p, v, m, g, x) => {
    for (let y = 0; y < u.length; y++) {
      const _ = c[y], b = u[y], O = (
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
      E(
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
  }, ae = (c, u, p, v, m) => {
    if (u !== p) {
      if (u !== B)
        for (const g in u)
          !_e(g) && !(g in p) && r(
            c,
            g,
            u[g],
            null,
            m,
            v
          );
      for (const g in p) {
        if (_e(g)) continue;
        const x = p[g], y = u[g];
        x !== y && g !== "value" && r(c, g, y, x, m, v);
      }
      "value" in p && r(c, "value", u.value, p.value, m);
    }
  }, je = (c, u, p, v, m, g, x, y, _) => {
    const b = u.el = c ? c.el : o(""), O = u.anchor = c ? c.anchor : o("");
    let { patchFlag: w, dynamicChildren: T, slotScopeIds: I } = u;
    I && (y = y ? y.concat(I) : I), c == null ? (n(b, p, v), n(O, p, v), Vt(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      u.children || [],
      p,
      O,
      m,
      g,
      x,
      y,
      _
    )) : w > 0 && w & 64 && T && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    c.dynamicChildren && c.dynamicChildren.length === T.length ? (kt(
      c.dynamicChildren,
      T,
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
      O,
      m,
      g,
      x,
      y,
      _
    );
  }, He = (c, u, p, v, m, g, x, y, _) => {
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
    const y = c.component = Ho(
      c,
      v,
      m
    );
    if (Qs(c) && (y.ctx.renderer = pe), Vo(y, !1, x), y.asyncDep) {
      if (m && m.registerDep(y, nt, x), !c.el) {
        const _ = y.subTree = at(Ht);
        J(null, _, u, p), c.placeholder = _.el;
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
    if (_o(c, u, p))
      if (v.asyncDep && !v.asyncResolved) {
        G(v, u, p);
        return;
      } else
        v.next = u, v.update();
    else
      u.el = c.el, v.vnode = u;
  }, nt = (c, u, p, v, m, g, x) => {
    const y = () => {
      if (c.isMounted) {
        let { next: w, bu: T, u: I, parent: F, vnode: U } = c;
        {
          const xt = Ni(c);
          if (xt) {
            w && (w.el = U.el, G(c, w, x)), xt.asyncDep.then(() => {
              ct(() => {
                c.isUnmounted || b();
              }, m);
            });
            return;
          }
        }
        let H = w, X;
        zt(c, !1), w ? (w.el = U.el, G(c, w, x)) : w = U, T && _s(T), (X = w.props && w.props.onVnodeBeforeUpdate) && Ct(X, F, w, U), zt(c, !0);
        const Q = Cn(c), yt = c.subTree;
        c.subTree = Q, E(
          yt,
          Q,
          // parent may have changed if it's in a teleport
          h(yt.el),
          // anchor may have changed if it's in a fragment
          Ve(yt),
          c,
          m,
          g
        ), w.el = Q.el, H === null && yo(c, Q.el), I && ct(I, m), (X = w.props && w.props.onVnodeUpdated) && ct(
          () => Ct(X, F, w, U),
          m
        );
      } else {
        let w;
        const { el: T, props: I } = u, { bm: F, m: U, parent: H, root: X, type: Q } = c, yt = Se(u);
        zt(c, !1), F && _s(F), !yt && (w = I && I.onVnodeBeforeMount) && Ct(w, H, u), zt(c, !0);
        {
          X.ce && X.ce._hasShadowRoot() && X.ce._injectChildStyle(
            Q,
            c.parent ? c.parent.type : void 0
          );
          const xt = c.subTree = Cn(c);
          E(
            null,
            xt,
            p,
            v,
            c,
            m,
            g
          ), u.el = xt.el;
        }
        if (U && ct(U, m), !yt && (w = I && I.onVnodeMounted)) {
          const xt = u;
          ct(
            () => Ct(w, H, xt),
            m
          );
        }
        (u.shapeFlag & 256 || H && Se(H.vnode) && H.vnode.shapeFlag & 256) && c.a && ct(c.a, m), c.isMounted = !0, u = p = v = null;
      }
    };
    c.scope.on();
    const _ = c.effect = new Xn(y);
    c.scope.off();
    const b = c.update = _.run.bind(_), O = c.job = _.runIfDirty.bind(_);
    O.i = c, O.id = c.uid, _.scheduler = () => Ys(O), zt(c, !0), b();
  }, G = (c, u, p) => {
    u.component = c;
    const v = c.vnode.props;
    c.vnode = u, c.next = null, wo(c, u.props, v, p), To(c, u.children, p), Dt(), bn(c), $t();
  }, K = (c, u, p, v, m, g, x, y, _ = !1) => {
    const b = c && c.children, O = c ? c.shapeFlag : 0, w = u.children, { patchFlag: T, shapeFlag: I } = u;
    if (T > 0) {
      if (T & 128) {
        Ne(
          b,
          w,
          p,
          v,
          m,
          g,
          x,
          y,
          _
        );
        return;
      } else if (T & 256) {
        qt(
          b,
          w,
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
    I & 8 ? (O & 16 && de(b, m, g), w !== b && a(p, w)) : O & 16 ? I & 16 ? Ne(
      b,
      w,
      p,
      v,
      m,
      g,
      x,
      y,
      _
    ) : de(b, m, g, !0) : (O & 8 && a(p, ""), I & 16 && Vt(
      w,
      p,
      v,
      m,
      g,
      x,
      y,
      _
    ));
  }, qt = (c, u, p, v, m, g, x, y, _) => {
    c = c || ie, u = u || ie;
    const b = c.length, O = u.length, w = Math.min(b, O);
    let T;
    for (T = 0; T < w; T++) {
      const I = u[T] = _ ? Rt(u[T]) : Tt(u[T]);
      E(
        c[T],
        I,
        p,
        null,
        m,
        g,
        x,
        y,
        _
      );
    }
    b > O ? de(
      c,
      m,
      g,
      !0,
      !1,
      w
    ) : Vt(
      u,
      p,
      v,
      m,
      g,
      x,
      y,
      _,
      w
    );
  }, Ne = (c, u, p, v, m, g, x, y, _) => {
    let b = 0;
    const O = u.length;
    let w = c.length - 1, T = O - 1;
    for (; b <= w && b <= T; ) {
      const I = c[b], F = u[b] = _ ? Rt(u[b]) : Tt(u[b]);
      if (be(I, F))
        E(
          I,
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
    for (; b <= w && b <= T; ) {
      const I = c[w], F = u[T] = _ ? Rt(u[T]) : Tt(u[T]);
      if (be(I, F))
        E(
          I,
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
      w--, T--;
    }
    if (b > w) {
      if (b <= T) {
        const I = T + 1, F = I < O ? u[I].el : v;
        for (; b <= T; )
          E(
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
    } else if (b > T)
      for (; b <= w; )
        _t(c[b], m, g, !0), b++;
    else {
      const I = b, F = b, U = /* @__PURE__ */ new Map();
      for (b = F; b <= T; b++) {
        const ft = u[b] = _ ? Rt(u[b]) : Tt(u[b]);
        ft.key != null && U.set(ft.key, b);
      }
      let H, X = 0;
      const Q = T - F + 1;
      let yt = !1, xt = 0;
      const he = new Array(Q);
      for (b = 0; b < Q; b++) he[b] = 0;
      for (b = I; b <= w; b++) {
        const ft = c[b];
        if (X >= Q) {
          _t(ft, m, g, !0);
          continue;
        }
        let wt;
        if (ft.key != null)
          wt = U.get(ft.key);
        else
          for (H = F; H <= T; H++)
            if (he[H - F] === 0 && be(ft, u[H])) {
              wt = H;
              break;
            }
        wt === void 0 ? _t(ft, m, g, !0) : (he[wt - F] = b + 1, wt >= xt ? xt = wt : yt = !0, E(
          ft,
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
      const cn = yt ? Po(he) : ie;
      for (H = cn.length - 1, b = Q - 1; b >= 0; b--) {
        const ft = F + b, wt = u[ft], fn = u[ft + 1], un = ft + 1 < O ? (
          // #13559, #14173 fallback to el placeholder for unresolved async component
          fn.el || Vi(fn)
        ) : v;
        he[b] === 0 ? E(
          null,
          wt,
          p,
          un,
          m,
          g,
          x,
          y,
          _
        ) : yt && (H < 0 || b !== cn[H] ? Jt(wt, p, un, 2) : H--);
      }
    }
  }, Jt = (c, u, p, v, m = null) => {
    const { el: g, type: x, transition: y, children: _, shapeFlag: b } = c;
    if (b & 6) {
      Jt(c.component.subTree, u, p, v);
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
      for (let w = 0; w < _.length; w++)
        Jt(_[w], u, p, v);
      n(c.anchor, u, p);
      return;
    }
    if (x === qe) {
      j(c, u, p);
      return;
    }
    if (v !== 2 && b & 1 && y)
      if (v === 0)
        y.persisted && !g[Es] ? n(g, u, p) : (y.beforeEnter(g), n(g, u, p), ct(() => y.enter(g), m));
      else {
        const { leave: w, delayLeave: T, afterLeave: I } = y, F = () => {
          c.ctx.isUnmounted ? i(g) : n(g, u, p);
        }, U = () => {
          const H = g._isLeaving || !!g[Es];
          g._isLeaving && g[Es](
            !0
            /* cancelled */
          ), y.persisted && !H ? F() : w(g, () => {
            F(), I && I();
          });
        };
        T ? T(g, F, U) : U();
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
      shapeFlag: O,
      patchFlag: w,
      dirs: T,
      cacheIndex: I,
      memo: F
    } = c;
    if (w === -2 && (m = !1), y != null && (Dt(), Ce(y, null, p, c, !0), $t()), I != null && (u.renderCache[I] = void 0), O & 256) {
      u.ctx.deactivate(c);
      return;
    }
    const U = O & 1 && T, H = !Se(c);
    let X;
    if (H && (X = x && x.onVnodeBeforeUnmount) && Ct(X, u, c), O & 6)
      Yi(c.component, p, v);
    else {
      if (O & 128) {
        c.suspense.unmount(p, v);
        return;
      }
      U && Gt(c, null, u, "beforeUnmount"), O & 64 ? c.type.remove(
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
      (g !== dt || w > 0 && w & 64) ? de(
        b,
        u,
        p,
        !1,
        !0
      ) : (g === dt && w & 384 || !m && O & 16) && de(_, u, p), v && on(c);
    }
    const Q = F != null && I == null;
    (H && (X = x && x.onVnodeUnmounted) || U || Q) && ct(() => {
      X && Ct(X, u, c), U && Gt(c, null, u, "unmounted"), Q && (c.el = null);
    }, p);
  }, on = (c) => {
    const { type: u, el: p, anchor: v, transition: m } = c;
    if (u === dt) {
      zi(p, v);
      return;
    }
    if (u === qe) {
      A(c);
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
  }, zi = (c, u) => {
    let p;
    for (; c !== u; )
      p = C(c), i(c), c = p;
    i(u);
  }, Yi = (c, u, p) => {
    const { bum: v, scope: m, job: g, subTree: x, um: y, m: _, a: b } = c;
    Tn(_), Tn(b), v && _s(v), m.stop(), g && (g.flags |= 8, _t(x, c, u, p)), y && ct(y, u), ct(() => {
      c.isUnmounted = !0;
    }, u);
  }, de = (c, u, p, v = !1, m = !1, g = 0) => {
    for (let x = g; x < c.length; x++)
      _t(c[x], u, p, v, m);
  }, Ve = (c) => {
    if (c.shapeFlag & 6)
      return Ve(c.component.subTree);
    if (c.shapeFlag & 128)
      return c.suspense.next();
    const u = C(c.anchor || c.el), p = u && u[Wr];
    return p ? C(p) : u;
  };
  let ms = !1;
  const ln = (c, u, p) => {
    let v;
    c == null ? u._vnode && (_t(u._vnode, null, null, !0), v = u._vnode.component) : E(
      u._vnode || null,
      c,
      u,
      null,
      null,
      null,
      p
    ), u._vnode = c, ms || (ms = !0, bn(v), bi(), ms = !1);
  }, pe = {
    p: E,
    um: _t,
    m: Jt,
    r: on,
    mt: bs,
    mc: Vt,
    pc: K,
    pbc: kt,
    n: Ve,
    o: t
  };
  return {
    render: ln,
    hydrate: void 0,
    createApp: po(ln)
  };
}
function Os({ type: t, props: e }, s) {
  return s === "svg" && t === "foreignObject" || s === "mathml" && t === "annotation-xml" && e && e.encoding && e.encoding.includes("html") ? void 0 : s;
}
function zt({ effect: t, job: e }, s) {
  s ? (t.flags |= 32, e.flags |= 4) : (t.flags &= -33, e.flags &= -5);
}
function Io(t, e) {
  return (!t || t && !t.pendingBranch) && e && !e.persisted;
}
function Hi(t, e, s = !1) {
  const n = t.children, i = e.children;
  if (P(n) && P(i))
    for (let r = 0; r < n.length; r++) {
      const l = n[r];
      let o = i[r];
      o.shapeFlag & 1 && !o.dynamicChildren && ((o.patchFlag <= 0 || o.patchFlag === 32) && (o = i[r] = Rt(i[r]), o.el = l.el), !s && o.patchFlag !== -2 && Hi(l, o)), o.type === gs && (o.patchFlag === -1 && (o = i[r] = Rt(o)), o.el = l.el), o.type === Ht && !o.el && (o.el = l.el);
    }
}
function Po(t) {
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
function Mo(t, e) {
  e && e.pendingBranch ? P(t) ? e.effects.push(...t) : e.effects.push(t) : jr(t);
}
const dt = /* @__PURE__ */ Symbol.for("v-fgt"), gs = /* @__PURE__ */ Symbol.for("v-txt"), Ht = /* @__PURE__ */ Symbol.for("v-cmt"), qe = /* @__PURE__ */ Symbol.for("v-stc"), Qt = [];
let ut = null;
function te(t = !1) {
  Qt.push(ut = t ? null : []);
}
function Ki() {
  Qt.pop(), ut = Qt[Qt.length - 1] || null;
}
let Ie = 1;
function On(t, e = !1) {
  Ie += t, t < 0 && ut && e && (ut.hasOnce = !0);
}
function Wi(t) {
  return t.dynamicChildren = Ie > 0 ? ut || ie : null, Ki(), Ie > 0 && ut && ut.push(t), t;
}
function le(t, e, s, n, i, r) {
  return Wi(
    M(
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
function Ro(t, e, s, n, i) {
  return Wi(
    at(
      t,
      e,
      s,
      n,
      i,
      !0
    )
  );
}
function Bi(t) {
  return t ? t.__v_isVNode === !0 : !1;
}
function be(t, e) {
  return t.type === e.type && t.key === e.key;
}
const ki = ({ key: t }) => t ?? null, Je = ({
  ref: t,
  ref_key: e,
  ref_for: s
}) => (typeof t == "number" && (t = "" + t), t != null ? Y(t) || /* @__PURE__ */ lt(t) || R(t) ? { i: Ot, r: t, k: e, f: !!s } : t : null);
function M(t, e = null, s = null, n = 0, i = null, r = t === dt ? 0 : 1, l = !1, o = !1) {
  const f = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: t,
    props: e,
    key: e && ki(e),
    ref: e && Je(e),
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
  return o ? (ns(f, s), r & 128 && t.normalize(f)) : s && (f.shapeFlag |= Y(s) ? 8 : 16), Ie > 0 && // avoid a block node from tracking itself
  !l && // has current parent block
  ut && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (f.patchFlag > 0 || r & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  f.patchFlag !== 32 && ut.push(f), f;
}
const at = Fo;
function Fo(t, e = null, s = null, n = 0, i = null, r = !1) {
  if ((!t || t === no) && (t = Ht), Bi(t)) {
    const o = ue(
      t,
      e,
      !0
      /* mergeRef: true */
    );
    return s && ns(o, s), Ie > 0 && !r && ut && (o.shapeFlag & 6 ? ut[ut.indexOf(t)] = o : ut.push(o)), o.patchFlag = -2, o;
  }
  if (Bo(t) && (t = t.__vccOpts), e) {
    e = Lo(e);
    let { class: o, style: f } = e;
    o && !Y(o) && (e.class = ce(o)), V(f) && (/* @__PURE__ */ zs(f) && !P(f) && (f = et({}, f)), e.style = Ws(f));
  }
  const l = Y(t) ? 1 : Ui(t) ? 128 : ds(t) ? 64 : V(t) ? 4 : R(t) ? 2 : 0;
  return M(
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
function Lo(t) {
  return t ? /* @__PURE__ */ zs(t) || Ri(t) ? et({}, t) : t : null;
}
function ue(t, e, s = !1, n = !1) {
  const { props: i, ref: r, patchFlag: l, children: o, transition: f } = t, d = e ? Do(i || {}, e) : i, a = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: t.type,
    props: d,
    key: d && ki(d),
    ref: e && e.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      s && r ? P(r) ? r.concat(Je(e)) : [r, Je(e)] : Je(e)
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
function Ge(t = " ", e = 0) {
  return at(gs, null, t, e);
}
function ss(t, e) {
  const s = at(qe, null, t);
  return s.staticCount = e, s;
}
function An(t = "", e = !1) {
  return e ? (te(), Ro(Ht, null, t)) : at(Ht, null, t);
}
function Tt(t) {
  return t == null || typeof t == "boolean" ? at(Ht) : P(t) ? at(
    dt,
    null,
    // #3666, avoid reference pollution when reusing vnode
    t.slice()
  ) : Bi(t) ? Rt(t) : at(gs, null, String(t));
}
function Rt(t) {
  return t.el === null && t.patchFlag !== -1 || t.memo ? t : ue(t);
}
function ns(t, e) {
  let s = 0;
  const { shapeFlag: n } = t;
  if (e == null)
    e = null;
  else if (P(e))
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
    e = String(e), n & 64 ? (s = 16, e = [Ge(e)]) : s = 8;
  t.children = e, t.shapeFlag |= s;
}
function Do(...t) {
  const e = {};
  for (let s = 0; s < t.length; s++) {
    const n = t[s];
    for (const i in n)
      if (i === "class")
        e.class !== n.class && (e.class = ce([e.class, n.class]));
      else if (i === "style")
        e.style = Ws([e.style, n.style]);
      else if (rs(i)) {
        const r = e[i], l = n[i];
        l && r !== l && !(P(r) && r.includes(l)) ? e[i] = r ? [].concat(r, l) : l : l == null && r == null && // mergeProps({ 'onUpdate:modelValue': undefined }) should not retain
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
const $o = Oi();
let jo = 0;
function Ho(t, e, s) {
  const n = t.type, i = (e ? e.appContext : t.appContext) || $o, r = {
    uid: jo++,
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
    scope: new fr(
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
    propsDefaults: B,
    // inheritAttrs
    inheritAttrs: n.inheritAttrs,
    // state
    ctx: B,
    data: B,
    props: B,
    attrs: B,
    slots: B,
    refs: B,
    setupState: B,
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
  return r.ctx = { _: r }, r.root = e ? e.root : r, r.emit = go.bind(null, r), t.ce && t.ce(r), r;
}
let ot = null;
const No = () => ot || Ot;
let is, Pe;
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
  ), Pe = e(
    "__VUE_SSR_SETTERS__",
    (s) => Me = s
  );
}
const De = (t) => {
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
let Me = !1;
function Vo(t, e = !1, s = !1) {
  e && Pe(e);
  const { props: n, children: i } = t.vnode, r = qi(t);
  xo(t, n, r, e), Eo(t, i, s || e);
  const l = r ? Uo(t, e) : void 0;
  return e && Pe(!1), l;
}
function Uo(t, e) {
  const s = t.type;
  t.accessCache = /* @__PURE__ */ Object.create(null), t.proxy = new Proxy(t.ctx, ro);
  const { setup: n } = s;
  if (n) {
    Dt();
    const i = t.setupContext = n.length > 1 ? Wo(t) : null, r = De(t), l = Le(
      n,
      t,
      0,
      [
        t.props,
        i
      ]
    ), o = Wn(l);
    if ($t(), r(), (o || t.sp) && !Se(t) && wi(t), o) {
      if (l.then(In, In), e)
        return l.then((f) => {
          Pe(!0);
          try {
            Pn(t, f, e);
          } finally {
            Pe(!1);
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
    const i = De(t);
    Dt();
    try {
      oo(t);
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
  return t.exposed ? t.exposeProxy || (t.exposeProxy = new Proxy(di(Ir(t.exposed)), {
    get(e, s) {
      if (s in e)
        return e[s];
      if (s in Ee)
        return Ee[s](t);
    },
    has(e, s) {
      return s in e || s in Ee;
    }
  })) : t.proxy;
}
function Bo(t) {
  return R(t) && "__vccOpts" in t;
}
const nn = (t, e) => /* @__PURE__ */ Rr(t, e, Me), ko = "3.5.42";
let Ns;
const Mn = typeof window < "u" && window.trustedTypes;
if (Mn)
  try {
    Ns = /* @__PURE__ */ Mn.createPolicy("vue", {
      createHTML: (t) => t
    });
  } catch {
  }
const Gi = Ns ? (t) => Ns.createHTML(t) : (t) => t, qo = "http://www.w3.org/2000/svg", Jo = "http://www.w3.org/1998/Math/MathML", Mt = typeof document < "u" ? document : null, Rn = Mt && /* @__PURE__ */ Mt.createElement("template"), Go = {
  insert: (t, e, s) => {
    e.insertBefore(t, s || null);
  },
  remove: (t) => {
    const e = t.parentNode;
    e && e.removeChild(t);
  },
  createElement: (t, e, s, n) => {
    const i = e === "svg" ? Mt.createElementNS(qo, t) : e === "mathml" ? Mt.createElementNS(Jo, t) : s ? Mt.createElement(t, { is: s }) : Mt.createElement(t);
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
}, zo = /* @__PURE__ */ Symbol("_vtc");
function Yo(t, e, s) {
  const n = t[zo];
  n && (e = (e ? [e, ...n] : [...n]).join(" ")), e == null ? t.removeAttribute("class") : s ? t.setAttribute("class", e) : t.className = e;
}
const Fn = /* @__PURE__ */ Symbol("_vod"), Xo = /* @__PURE__ */ Symbol("_vsh"), Zo = /* @__PURE__ */ Symbol(""), Qo = /(?:^|;)\s*display\s*:/;
function tl(t, e, s) {
  const n = t.style, i = Y(s);
  let r = !1;
  if (s && !i) {
    if (e)
      if (Y(e))
        for (const l of e.split(";")) {
          const o = l.slice(0, l.indexOf(":")).trim();
          s[o] == null && ve(n, o, "");
        }
      else
        for (const l in e)
          s[l] == null && ve(n, l, "");
    for (const l in s) {
      l === "display" && (r = !0);
      const o = s[l];
      o != null ? sl(
        t,
        l,
        !Y(e) && e ? e[l] : void 0,
        o
      ) || ve(n, l, o) : ve(n, l, "");
    }
  } else if (i) {
    if (e !== s) {
      const l = n[Zo];
      l && (s += ";" + l), n.cssText = s, r = Qo.test(s);
    }
  } else e && t.removeAttribute("style");
  Fn in t && (t[Fn] = r ? n.display : "", t[Xo] && (n.display = "none"));
}
const Be = /\s*!important$/;
function ve(t, e, s) {
  if (P(s))
    s.forEach((n) => ve(t, e, n));
  else if (s == null && (s = ""), e.startsWith("--"))
    Be.test(s) ? t.setProperty(e, s.replace(Be, ""), "important") : t.setProperty(e, s);
  else {
    const n = el(t, e);
    Be.test(s) ? t.setProperty(
      ee(n),
      s.replace(Be, ""),
      "important"
    ) : t[n] = s;
  }
}
const Ln = ["Webkit", "Moz", "ms"], As = {};
function el(t, e) {
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
function sl(t, e, s, n) {
  return t.tagName === "TEXTAREA" && (e === "width" || e === "height") && Y(n) && s === n;
}
const Dn = "http://www.w3.org/1999/xlink";
function $n(t, e, s, n, i, r = lr(e)) {
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
function nl(t, e, s, n) {
  t.addEventListener(e, s, n);
}
function il(t, e, s, n) {
  t.removeEventListener(e, s, n);
}
const Hn = /* @__PURE__ */ Symbol("_vei");
function rl(t, e, s, n, i = null) {
  const r = t[Hn] || (t[Hn] = {}), l = r[e];
  if (n && l)
    l.value = n;
  else {
    const [o, f] = cl(e);
    if (n) {
      const d = r[e] = al(
        n,
        i
      );
      nl(t, o, d, f);
    } else l && (il(t, o, l, f), r[e] = void 0);
  }
}
const ol = /(Once|Passive|Capture)$/, ll = /^on:?(?:Once|Passive|Capture)$/;
function cl(t) {
  let e, s;
  for (; (s = t.match(ol)) && !ll.test(t); )
    e || (e = {}), t = t.slice(0, t.length - s[1].length), e[s[1].toLowerCase()] = !0;
  return [t[2] === ":" ? t.slice(3) : ee(t.slice(2)), e];
}
let Is = 0;
const fl = /* @__PURE__ */ Promise.resolve(), ul = () => Is || (fl.then(() => Is = 0), Is = Date.now());
function al(t, e) {
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
  return s.value = t, s.attached = ul(), s;
}
const Nn = (t) => t.charCodeAt(0) === 111 && t.charCodeAt(1) === 110 && // lowercase letter
t.charCodeAt(2) > 96 && t.charCodeAt(2) < 123, dl = (t, e, s, n, i, r) => {
  const l = i === "svg";
  e === "class" ? Yo(t, n, l) : e === "style" ? tl(t, s, n) : rs(e) ? os(e) || rl(t, e, s, n, r) : (e[0] === "." ? (e = e.slice(1), !0) : e[0] === "^" ? (e = e.slice(1), !1) : pl(t, e, n, l)) ? (jn(t, e, n), !t.tagName.includes("-") && (e === "value" || e === "checked" || e === "selected") && $n(t, e, n, l, r, e !== "value")) : /* #11081 force set props for possible async custom element */ t._isVueCE && // #12408 check if it's declared prop or it's async custom element
  (hl(t, e) || // @ts-expect-error _def is private
  t._def.__asyncLoader && (/[A-Z]/.test(e) || !Y(n))) ? jn(t, pt(e), n, r, e) : (e === "true-value" ? t._trueValue = n : e === "false-value" && (t._falseValue = n), $n(t, e, n, l));
};
function pl(t, e, s, n) {
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
function hl(t, e) {
  const s = (
    // @ts-expect-error _def is private
    t._def.props
  );
  if (!s)
    return !1;
  const n = pt(e);
  return Array.isArray(s) ? s.some((i) => pt(i) === n) : Object.keys(s).some((i) => pt(i) === n);
}
const gl = /* @__PURE__ */ et({ patchProp: dl }, Go);
let Vn;
function bl() {
  return Vn || (Vn = Oo(gl));
}
const ml = ((...t) => {
  const e = bl().createApp(...t), { mount: s } = e;
  return e.mount = (n) => {
    const i = _l(n);
    if (!i) return;
    const r = e._component;
    !R(r) && !r.render && !r.template && (r.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
    const l = s(i, !1, vl(i));
    return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), l;
  }, e;
});
function vl(t) {
  if (t instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && t instanceof MathMLElement)
    return "mathml";
}
function _l(t) {
  return Y(t) ? document.querySelector(t) : t;
}
const yl = (t, e) => {
  const s = t.__vccOpts || t;
  for (const [n, i] of e)
    s[n] = i;
  return s;
}, xl = {};
function wl(t, e) {
  return e[0] || (e[0] = ss('<div id="root-modal" class="hidden"><div id="root-dialog"><div class="root-head">ルートプロジェクト（作業対象フォルダ）を選ぶ</div><div id="root-places"></div><div id="root-drives"></div><div class="root-inputrow"><input id="root-input" type="text" spellcheck="false" placeholder="例: D:\\projects\\myapp（Enter で移動）"><button id="root-fav-btn" title="今表示しているフォルダをお気に入りに入れる／外す"> ☆ </button></div><ul id="root-dirlist"></ul><div class="root-hint hint"> フォルダをクリックで移動 ／ パス直接入力＋Enter でも移動。決定するとファイルブラウザが切替わり、新しい会話がそのフォルダで始まります。 </div><div class="root-actions"><button id="root-cancel">キャンセル</button><button id="root-ok" class="apply-btn">✓ このフォルダにする</button></div></div></div><div id="hist-modal" class="hidden"><div id="hist-dialog"><div class="root-head">🕰 保存履歴 — <span id="hist-file"></span></div><div id="hist-body"><ul id="hist-list"></ul><div id="hist-preview-wrap"><div id="hist-preview-head" class="hint"> 左の版を選ぶと内容が出ます。 </div><pre id="hist-preview"></pre></div></div><div class="root-hint hint"> 保存の直前の内容を残しています。戻すときは「今の内容」も履歴に積むので、戻し間違えてもやり直せます。 </div><div class="root-actions"><button id="hist-close">閉じる</button><button id="hist-restore" class="apply-btn" disabled> ↩ この版に戻す </button></div></div></div><div id="pick-modal" class="hidden"><div id="pick-dialog"><div class="root-head">参照するファイルを選ぶ</div><div id="pick-drives"></div><input id="pick-input" type="text" spellcheck="false" placeholder="例: C:\\Users\\you\\decks（Enter でフォルダへ移動）"><ul id="pick-list"></ul><div class="root-hint hint"> フォルダをクリックで移動 ／ ファイルをクリックで参照に追加します。 </div><div class="root-actions"><button id="pick-cancel">閉じる</button></div></div></div><div id="cf-modal" class="hidden"><div id="cf-dialog"><div class="root-head">📥 Confluence / Web から貼り付け</div><div class="root-hint hint"> Confluence のページをブラウザでコピー（Ctrl+C）してから「クリップボードから読込」、 または下の欄に Ctrl+V。リッチテキスト（HTML）で取れれば Markdown に変換して、 今開いているファイルのカーソル位置へ挿入します（画像は Confluence 上のURL参照のまま残ります）。 </div><div class="cf-actions"><button id="cf-read-btn" title="クリップボードを直接読み取る（ブラウザの許可が必要な場合あり）"> クリップボードから読込 </button><span id="cf-status" class="hint"></span></div><textarea id="cf-input" rows="10" spellcheck="false" placeholder="ここに貼り付け（Ctrl+V）…"></textarea><div class="root-actions"><button id="cf-cancel">閉じる</button><button id="cf-insert" class="apply-btn">✓ 変換して挿入</button></div></div></div><div id="sessions-modal" class="hidden"><div id="sessions-dialog"><div class="root-head">🗂 保存済みの会話</div><div class="root-hint hint"> クリックで会話を復元します（チャット表示＋エンジン文脈。ツール実行の詳細は失われ、 会話の本文だけが文脈として引き継がれます）。会話はターン確定ごとに自動保存されます。 </div><ul id="sessions-list"></ul><div class="root-actions"><button id="sessions-close" class="apply-btn">閉じる</button></div></div></div><div id="settings-modal" class="hidden"><div id="settings-dialog"><div class="root-head">設定</div><label class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>モデル / サーバ</b><span class="hint">以降の新しい会話に反映されます。</span></span><select id="settings-model"></select></label><label class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>ロード済みモデル</b><span class="hint">LM Studio でロード済みのモデルから選択（起動中のみ取得可）。</span></span><select id="settings-llm-model"></select></label><div class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>思考許容時間（秒）</b><span class="hint">AI が <code>&lt;think&gt;</code> で考え込める上限。超えると打ち切って結論生成に移ります。長くするほど1回の待ち時間が延びます（既定 90）。</span></span><span class="settings-inline"><input id="settings-think-budget" type="number" min="10" max="1800" step="10"><button id="settings-think-budget-save">保存</button><span id="settings-think-budget-status" class="hint"></span></span></div><div class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px;"><span><b>コンテキスト長（トークン）</b><span class="hint">このサーバのモデル窓長。<b>0 で自動</b>（LM Studio の <code>meta.n_ctx</code> を取得）。リモートの LM Studio / llama-server は取れず 32768 と仮定するので、実際の窓長を手で入れると溢れ・無駄な切り詰めを防げます。変更するとこのサーバの会話は作り直されます。</span></span><span class="settings-inline"><input id="settings-context-length" type="number" min="0" max="2000000" step="1024" placeholder="0（自動）"><button id="settings-context-length-save">保存</button><span id="settings-context-length-status" class="hint"></span></span></div><label class="settings-row toggle"><input type="checkbox" id="settings-copilot"><span><b>Copilot 連携</b><span class="hint">オンにすると、エージェントが <code>ask_copilot</code> ツールで Microsoft Copilot に相談できます（PrayLight 経由）。</span></span></label><div class="settings-row" id="settings-copilot-controls"><button id="settings-copilot-open" title="Copilot にログインするためのブラウザを開く"> Copilotブラウザを開く（ログイン用） </button><span id="settings-copilot-status" class="hint"></span></div><div class="root-actions"><button id="settings-close" class="apply-btn">閉じる</button></div></div></div>', 6));
}
const Cl = /* @__PURE__ */ yl(xl, [["render", wl]]), k = /* @__PURE__ */ Fe({
  current: "chat",
  ready: !1,
  filesOpen: !1,
  currentFile: "",
  dirty: !1,
  connectionIssue: ""
});
function Ps(t) {
  k.current = t, t === "editor" && (k.filesOpen = !1), document.body.classList.toggle("view-chat", t === "chat"), document.body.classList.toggle("view-editor", t === "editor"), document.body.classList.toggle("chat-files-open", k.filesOpen), t === "editor" && requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
}
function Un() {
  k.filesOpen = !k.filesOpen, document.body.classList.toggle("chat-files-open", k.filesOpen), k.filesOpen ? requestAnimationFrame(
    () => document.getElementById("file-search")?.focus()
  ) : document.getElementById("chat-files-btn")?.focus();
}
function Yl(t, e) {
  k.currentFile = t || "", k.dirty = e;
}
function Xl(t) {
  k.connectionIssue = t;
}
function Zl() {
  k.ready = !0;
}
document.body.classList.add("view-chat");
document.addEventListener("keydown", (t) => {
  t.key !== "Escape" || !k.filesOpen || (t.preventDefault(), k.filesOpen = !1, document.body.classList.remove("chat-files-open"), document.getElementById("chat-files-btn")?.focus());
});
document.addEventListener("pointerdown", (t) => {
  if (!k.filesOpen) return;
  const e = t.target;
  e instanceof Element && (e.closest("#filemgr, #chat-files-btn") || (k.filesOpen = !1, document.body.classList.remove("chat-files-open")));
});
const Sl = {
  class: "view-switch",
  "aria-label": "表示切替"
}, El = ["aria-current"], Tl = ["aria-current"], Ol = { class: "edit-context-label" }, Al = {
  key: 0,
  class: "unsaved-dot",
  "aria-label": "未保存の変更あり"
}, Il = ["title"], Pl = /* @__PURE__ */ Zs({
  __name: "TopBar",
  setup(t) {
    function e() {
      document.getElementById("settings-btn")?.click();
    }
    return (s, n) => (te(), le(dt, null, [
      n[4] || (n[4] = M("div", { class: "brand" }, "CodeWithPixie", -1)),
      M("nav", Sl, [
        M("button", {
          id: "view-chat-btn",
          type: "button",
          "aria-current": z(k).current === "chat" ? "page" : void 0,
          class: ce({ active: z(k).current === "chat" }),
          onClick: n[0] || (n[0] = (i) => z(Ps)("chat"))
        }, " 会話 ", 10, El),
        M("button", {
          id: "view-editor-btn",
          type: "button",
          "aria-current": z(k).current === "editor" ? "page" : void 0,
          class: ce({ active: z(k).current === "editor" }),
          onClick: n[1] || (n[1] = (i) => z(Ps)("editor"))
        }, " 編集 ", 10, Tl)
      ]),
      M("button", {
        id: "edit-context-btn",
        type: "button",
        onClick: n[2] || (n[2] = (i) => z(Ps)("editor"))
      }, [
        M("span", Ol, ye(z(k).currentFile || "編集画面を開く"), 1),
        z(k).dirty ? (te(), le("span", Al, "● 未保存")) : An("", !0),
        n[3] || (n[3] = M("span", { "aria-hidden": "true" }, "↗", -1))
      ]),
      z(k).connectionIssue ? (te(), le("button", {
        key: 0,
        id: "connection-issue-btn",
        type: "button",
        title: z(k).connectionIssue,
        onClick: e
      }, " 接続を確認してください ", 8, Il)) : An("", !0),
      n[5] || (n[5] = ss('<button id="mode-btn" title="モード切替">…</button><button id="code-style-btn" class="code-only" title="Codeモードの進め方を切り替え"> 通常 </button><button id="root-project-btn" title="ルートプロジェクト（作業対象フォルダ）を変更"><span id="root-project-name">…</span></button><button id="places-btn" title="お気に入り・最近使ったフォルダへ移動"> ⭐ </button><div class="file-info"><button id="nav-back" class="nav-btn" title="前に開いていたファイルへ戻る (Alt+←)"> ◀ </button><button id="nav-fwd" class="nav-btn" title="進む (Alt+→)">▶</button><button id="recent-btn" class="nav-btn" title="最近開いたファイル (Ctrl+E)"> 🕘 </button><span id="current-file">（ファイル未選択）</span><button id="save-btn" title="保存 (Ctrl+S)">保存</button><span id="save-state"></span><button id="history-btn" title="このファイルの保存履歴から元に戻す"> 🕰 履歴 </button></div><div class="model-info"> model: <span id="model-name">…</span><span id="agent-status"></span></div><button id="settings-btn" title="設定（モデル）">設定</button>', 7))
    ], 64));
  }
});
function Ml() {
  const t = /* @__PURE__ */ Fe({
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
    state: /* @__PURE__ */ Ye(t),
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
const Rl = Ml();
async function Ql(t, e, s, n) {
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
      const C = l.split(/\r?\n\r?\n/);
      l = C.pop() || "";
      for (const S of C) {
        if (!s(e) || e.controller.signal.aborted) return;
        const D = S.split(/\r?\n/).filter((q) => q.startsWith("data:")).map((q) => q.slice(5).trimStart()).join(`
`);
        if (!D) continue;
        const E = JSON.parse(D);
        if (E.type === "error" && (f = E.text || "実行に失敗しました。"), await n(E), E.type === "done") {
          e.outcome = E.status, (E.status === "failed" || E.status === "limit_reached") && (f = {
            turn_timeout: "依頼全体の制限時間に達しました。",
            stream_timeout: "LLM応答の制限時間に達しました。",
            llm_calls_limit: "LLM呼び出し回数の上限に達しました。",
            tool_calls_limit: "ツール実行回数の上限に達しました。"
          }[E.reason] || E.reason || "実行に失敗しました。"), o = !0;
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
const Fl = { id: "split" }, Ll = { id: "right-pane" }, Dl = { id: "chat" }, $l = { class: "section-head" }, jl = { class: "fm-actions" }, Hl = ["aria-expanded"], Nl = { id: "chat-welcome" }, Vl = {
  class: "welcome-examples",
  "aria-label": "依頼の例"
}, Ul = ["onClick"], Kl = { id: "composer" }, Wl = { class: "composer-actions" }, Bl = ["title"], kl = ["disabled", "title"], ql = /* @__PURE__ */ Zs({
  __name: "WorkspaceShell",
  setup(t) {
    const { state: e, busy: s } = Rl, n = nn(
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
    return (l, o) => (te(), le("main", Fl, [
      o[18] || (o[18] = ss('<section id="left-pane"><div id="edit-area"><div id="editor"></div><div id="preview-divider" class="hidden" title="ドラッグでプレビューの幅を調整（ダブルクリックで等分に戻す）"></div><div id="preview" class="md hidden" aria-live="off"></div></div><div id="diff-overlay" class="hidden"><div id="diff-bar"><span id="diff-label">差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）</span><span id="diff-tabs"></span><span class="spacer"></span><button id="diff-close" class="hidden" title="差分表示を閉じる（承認の判断は右の承認バーで行う）"> ✕ 閉じる </button><button id="diff-approve-edit" class="apply-btn hidden" title="右ペインで編集した内容をそのまま書き込み、エージェントには完了済みと伝える"> ✓ 修正して承認 </button><button id="diff-apply" class="apply-btn">✓ 適用</button><button id="diff-cancel">キャンセル</button></div><div id="diff-editor"></div></div><div id="plan-overlay" class="hidden"><div id="plan-bar"><span id="plan-label">実行計画（承認するまでファイルは変更されません）</span><span class="spacer"></span><button id="plan-approve" class="apply-btn">✓ この計画で実行</button><button id="plan-reject">✕ 修正を依頼</button></div><div id="plan-body" class="md"></div></div><div id="left-toolbar"><button id="note-btn" class="note-only" title="選択行に付箋を貼る"> 付箋 </button><button id="preview-btn" title="Markdown プレビューを表示 (Ctrl+Shift+P)"> 👁 プレビュー </button><button id="richcopy-btn" disabled title="Markdown プレビュー表示中に使えます"> リッチコピー </button><span id="sel-info" class="hint">エージェントがファイルを直接編集します（破壊操作は承認制）。</span></div></section><div id="divider" title="ドラッグで幅を調整"></div>', 2)),
      M("section", Ll, [
        o[17] || (o[17] = ss('<div id="filemgr"><div class="section-head"><span>ファイル（ワークスペース）</span><span class="fm-actions"><button id="folder-btn" title="作業フォルダを変更"> フォルダ変更 </button><button id="refresh-btn" title="再読込">⟳</button><button id="new-file-btn" title="新規ファイル">ファイル追加</button><button id="new-folder-btn" title="新規フォルダ"> フォルダ追加 </button><button id="web2md-btn" class="note-only" title="URLのページをMarkdown化して web/ に保存する"> 🌐+ </button><button id="cf-btn" title="Confluence 等のページ（コピーしたHTML）をMarkdownに変換して挿入する"> 📥 貼付 </button></span><span class="search-row"><input id="file-search" type="search" placeholder="全文検索…"><span id="search-opts" class="hidden"><label title="大文字小文字を区別する（検索と置換で共通）"><input id="search-case" type="checkbox"> Aa </label><button id="replace-toggle" title="ヒットしたファイルをまとめて置換する"> 🔁 置換 </button></span></span></div><div id="replace-bar" class="hidden"><input id="replace-input" type="text" spellcheck="false" placeholder="置換後の文字列（そのまま入ります）"><div class="replace-actions"><button id="replace-preview-btn">👁 プレビュー</button><button id="replace-run-btn" class="apply-btn">✓ すべて置換</button><span id="replace-status" class="hint"></span></div><div id="replace-preview"></div></div><div id="root-bar"><span id="root-path" title="現在の作業フォルダ"></span><span id="files-trunc" class="hidden" title="巨大ワークスペースのため一覧を打ち切りました（目的のファイルは全文検索で探せます）">⚠ 一覧は先頭2万件まで</span></div><ul id="file-list"></ul><div id="search-results" class="hidden"></div></div><div id="v-divider" title="ドラッグでファイル欄の高さを調整（ダブルクリックで既定に戻す）"></div><div id="refmgr" class="note-only"><div class="section-head"><span>関連ファイル</span><span class="fm-actions"><button id="ref-add-btn" title="別ディレクトリのファイル（.pptx 等）を参照に追加"> ＋参照を追加 </button></span></div><ul id="ref-list"></ul><div id="ref-empty" class="hint"> ここにファイルをドラッグ、または「＋参照を追加」で紐付けます。 </div></div>', 3)),
        M("div", Dl, [
          M("div", $l, [
            o[5] || (o[5] = M("span", null, "チャット", -1)),
            M("span", jl, [
              M("button", {
                id: "chat-files-btn",
                type: "button",
                "aria-expanded": z(k).filesOpen,
                "aria-controls": "filemgr",
                onClick: o[0] || (o[0] = //@ts-ignore
                (...f) => z(Un) && z(Un)(...f))
              }, " ファイルを探す ", 8, Hl),
              o[1] || (o[1] = M("span", {
                id: "session-info",
                class: "hint code-only",
                title: "この会話のセッションID"
              }, null, -1)),
              o[2] || (o[2] = M("button", {
                id: "new-session-btn",
                class: "code-only",
                title: "新しい会話を開始（並行セッション）"
              }, " ＋新規会話 ", -1)),
              o[3] || (o[3] = M("button", {
                id: "sessions-btn",
                class: "code-only",
                title: "保存済みの会話を一覧から復元する"
              }, " 🗂 会話 ", -1)),
              o[4] || (o[4] = M("button", {
                id: "chat-clear-btn",
                class: "note-only",
                title: "この保存先の会話履歴を消去する"
              }, " 履歴を消去 ", -1))
            ])
          ]),
          M("div", Nl, [
            o[7] || (o[7] = M("div", {
              class: "welcome-mark",
              "aria-hidden": "true"
            }, "✦", -1)),
            o[8] || (o[8] = M("p", { class: "welcome-eyebrow" }, "CODE WITH PIXIE", -1)),
            o[9] || (o[9] = M("h1", null, "何から始めましょうか。", -1)),
            o[10] || (o[10] = M("p", { class: "welcome-copy" }, [
              Ge(" 考えを整理するところから、ファイルを直すところまで。"),
              M("br"),
              Ge("やりたいことを、そのまま話してください。 ")
            ], -1)),
            M("div", Vl, [
              (te(), le(dt, null, io(i, (f) => M("button", {
                key: f,
                type: "button",
                onClick: (d) => r(f)
              }, [
                Ge(ye(f), 1),
                o[6] || (o[6] = M("span", { "aria-hidden": "true" }, "↗", -1))
              ], 8, Ul)), 64))
            ])
          ]),
          o[15] || (o[15] = M("div", { id: "messages" }, null, -1)),
          o[16] || (o[16] = M("div", {
            id: "approval",
            class: "hidden code-only",
            role: "region",
            "aria-label": "承認が必要な操作"
          }, null, -1)),
          M("div", Kl, [
            o[12] || (o[12] = M("div", { id: "chip-bar" }, [
              M("span", {
                id: "sel-chip",
                class: "chip hidden"
              }, "選択テキスト添付")
            ], -1)),
            o[13] || (o[13] = M("textarea", {
              id: "chat-input",
              "aria-label": "メッセージ",
              rows: "3",
              placeholder: "相談したいこと、調べたいこと、変更したいことを入力…"
            }, null, -1)),
            M("div", Wl, [
              o[11] || (o[11] = M("span", { class: "hint" }, "Ctrl+Enter で送信", -1)),
              M("span", {
                role: "status",
                "aria-live": "polite",
                title: z(e).error
              }, ye(n.value), 9, Bl),
              M("button", {
                id: "send-btn",
                class: ce({ stop: z(s) }),
                disabled: !z(k).ready || z(e).phase === "stopping" || z(e).phase === "switching",
                title: z(s) ? "エージェントの実行を中断する" : ""
              }, ye(z(k).ready ? z(s) ? "停止" : "送信" : "準備中"), 11, kl)
            ]),
            o[14] || (o[14] = M("div", {
              id: "copilot-bar",
              class: "note-only"
            }, [
              M("button", {
                id: "cp-bar-open-btn",
                title: "デバッグ用ブラウザで Copilot を開く（そこで人が対話する）"
              }, " Copilotを開く "),
              M("button", {
                id: "cp-bar-import-btn",
                title: "開いている Copilot の会話を取得してAIにまとめさせる（普段のブラウザでOK・Copilotタブを前面にしておく）"
              }, " ⬇ 会話を取り込んでまとめる "),
              M("span", {
                id: "cp-bar-status",
                class: "hint"
              })
            ], -1))
          ])
        ])
      ])
    ]));
  }
}), Jl = { id: "topbar" }, Gl = /* @__PURE__ */ Zs({
  __name: "App",
  setup(t) {
    return (e, s) => (te(), le(dt, null, [
      M("header", Jl, [
        at(Pl)
      ]),
      at(ql),
      at(Cl)
    ], 64));
  }
});
ml(Gl).mount("#app");
hi(() => import("./app-CQ6TKQOJ.js"));
export {
  Zl as a,
  Ps as b,
  Rl as c,
  Yl as d,
  Ql as e,
  Xl as s,
  k as w
};
