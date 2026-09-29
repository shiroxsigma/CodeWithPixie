import { c as L, s as dt, a as Fi, b as cn, d as gs, w as Di, e as Oi } from "./main-BjxaNLi3.js";
class ee extends Error {
  constructor(t, n) {
    super(t), this.name = "ApiError", this.status = n;
  }
}
async function K(e, t) {
  let n;
  try {
    n = await fetch(e, t);
  } catch {
    throw new ee(`サーバに接続できません（${e}）`, 0);
  }
  if (!n.ok) {
    const s = await n.json().catch(() => ({}));
    throw new ee(s.detail || n.statusText || `HTTP ${n.status}`, n.status);
  }
  return n.json();
}
const se = (e) => K(e), T = (e, t) => K(e, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: t === void 0 ? void 0 : JSON.stringify(t)
});
async function z(e, t) {
  try {
    return await K(e, t);
  } catch (n) {
    alert("⚠️ " + n.message);
    return;
  }
}
const pe = globalThis.jsyaml || null, ws = () => pe !== null, Bi = "fill:#ff9999,stroke:#333,stroke-width:2px", Hi = "fill:#2a2a2a,stroke:#555,color:#888", Hn = /^```[ \t]*(?:yaml[ \t]+)?mdflow-mapping[ \t]*\n([\s\S]*?)^```/gm, vs = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/, ji = /^﻿?---[ \t]*\r?\n/, Wi = /^\s*%%\s*id\s*:\s*(\S+)/m;
function Ui(e) {
  const t = Wi.exec(e);
  return t ? t[1] : "";
}
function qi(e) {
  const t = [];
  let n = {}, s = e, i = 0;
  const o = vs.exec(e);
  if (o) {
    try {
      const u = pe ? pe.load(o[1]) : null;
      u && typeof u == "object" && !Array.isArray(u) ? n = u : u != null && t.push("frontmatter のトップレベルがマッピングではありません");
    } catch (u) {
      t.push(`frontmatter の YAML 構文エラー: ${u.message || u}`);
    }
    s = e.slice(o[0].length), i = o[0].length;
  }
  const a = (n.mdflow || {}).selected, c = {};
  if (a && typeof a == "object" && !Array.isArray(a))
    for (const [u, f] of Object.entries(a)) c[String(u)] = String(f);
  const d = [];
  if (pe) {
    Hn.lastIndex = 0;
    let u, f = 0;
    for (; (u = Hn.exec(s)) !== null; ) {
      f += 1;
      let w;
      try {
        w = pe.load(u[1]) || {};
      } catch (y) {
        t.push(`mdflow-mapping ブロック #${f}: YAML 構文エラー: ${y.message || y}`);
        continue;
      }
      if (typeof w != "object" || Array.isArray(w)) {
        t.push(`mdflow-mapping ブロック #${f}: YAML のトップレベルがマッピングではありません`);
        continue;
      }
      const m = [];
      for (const [y, b] of Object.entries(w.presets || {})) {
        const x = b || {};
        m.push({
          name: String(y),
          when: String(x.when ?? ""),
          activeNodes: (x.active_nodes || []).map(String)
        });
      }
      const h = w.style || {};
      d.push({
        diagramId: String(w.diagram ?? ""),
        presets: m,
        activeStyle: String(h.active ?? Bi),
        inactiveStyle: String(h.inactive ?? Hi)
      });
    }
  }
  return { meta: n, body: s, bodyOffset: i, selected: c, mappings: d, warnings: t };
}
function Vi(e, t) {
  return t && e.find((n) => n.diagramId === t) || null;
}
class ke extends Error {
}
function Ki(e) {
  const t = [];
  let n = 0;
  for (; n < e.length; ) {
    const s = e[n];
    if (/\s/.test(s)) {
      n += 1;
      continue;
    }
    const i = e.slice(n, n + 2);
    if (i === "&&" || i === "||") {
      t.push({ t: i }), n += 2;
      continue;
    }
    if (["==", "!=", "<=", ">="].includes(i)) {
      t.push({ t: "op", v: i }), n += 2;
      continue;
    }
    if (s === "<" || s === ">") {
      t.push({ t: "op", v: s }), n += 1;
      continue;
    }
    if (s === "!") {
      t.push({ t: "!" }), n += 1;
      continue;
    }
    if (s === "(" || s === ")") {
      t.push({ t: s }), n += 1;
      continue;
    }
    if (s === "'" || s === '"') {
      const a = e.indexOf(s, n + 1);
      if (a < 0) throw new ke(`文字列リテラルが閉じていません: ${e}`);
      t.push({ t: "lit", v: e.slice(n + 1, a) }), n = a + 1;
      continue;
    }
    let o = /^\d+(?:\.\d+)?/.exec(e.slice(n));
    if (o) {
      t.push({ t: "lit", v: parseFloat(o[0]) }), n += o[0].length;
      continue;
    }
    if (o = /^[A-Za-z_]\w*/.exec(e.slice(n)), o) {
      const a = o[0];
      a === "True" ? t.push({ t: "lit", v: !0 }) : a === "False" ? t.push({ t: "lit", v: !1 }) : a === "None" ? t.push({ t: "lit", v: null }) : t.push({ t: "name", v: a }), n += a.length;
      continue;
    }
    throw new ke(`ルール式に不正な文字 '${s}': ${e}`);
  }
  return t;
}
const Xe = (e) => typeof e == "number" || typeof e == "boolean";
function zi(e, t, n) {
  if (e === "==" || e === "!=") {
    const s = Xe(t) && Xe(n) ? Number(t) === Number(n) : t === n;
    return e === "==" ? s : !s;
  }
  if (Xe(t) && Xe(n))
    t = Number(t), n = Number(n);
  else if (!(typeof t == "string" && typeof n == "string")) return !1;
  return e === "<" ? t < n : e === "<=" ? t <= n : e === ">" ? t > n : t >= n;
}
function Gi(e, t) {
  if (e = (e || "").trim(), !e) return !0;
  const n = Ki(e);
  let s = 0;
  const i = () => n[s], o = () => n[s++];
  function a() {
    let m = c();
    for (; i()?.t === "||"; ) {
      o();
      const h = c();
      m = !!m || !!h;
    }
    return m;
  }
  function c() {
    let m = d();
    for (; i()?.t === "&&"; ) {
      o();
      const h = d();
      m = !!m && !!h;
    }
    return m;
  }
  function d() {
    return i()?.t === "!" ? (o(), !d()) : u();
  }
  function u() {
    let m = f();
    if (i()?.t !== "op") return m;
    let h = !0;
    for (; i()?.t === "op"; ) {
      const y = o().v, b = f();
      h && !zi(y, m, b) && (h = !1), m = b;
    }
    return h;
  }
  function f() {
    const m = o();
    if (!m) throw new ke(`ルール式が途中で終わっています: ${e}`);
    if (m.t === "lit") return m.v;
    if (m.t === "name")
      return t && Object.prototype.hasOwnProperty.call(t, m.v) ? t[m.v] : m.v === "true" ? !0 : m.v === "false" ? !1 : (m.v === "null", null);
    if (m.t === "(") {
      const h = a();
      if (o()?.t !== ")") throw new ke(`括弧が閉じていません: ${e}`);
      return h;
    }
    throw new ke(`ルール式の構文エラー: ${e}`);
  }
  const w = a();
  if (s !== n.length) throw new ke(`ルール式の構文エラー: ${e}`);
  return !!w;
}
function Yi(e, t, n) {
  if (n) {
    const s = e.presets.find((i) => i.name === n);
    if (s)
      return {
        name: s.name,
        activeNodes: s.activeNodes,
        style: e.activeStyle,
        inactiveStyle: e.inactiveStyle,
        auto: !1
      };
  }
  for (const s of e.presets) {
    let i = !1;
    try {
      i = Gi(s.when, t || {});
    } catch {
    }
    if (i)
      return {
        name: s.name,
        activeNodes: s.activeNodes,
        style: e.activeStyle,
        inactiveStyle: e.inactiveStyle,
        auto: !0
      };
  }
  return null;
}
const jn = /\b([A-Za-z_][\w-]*)\s*[\[({]/g, Wn = /([A-Za-z_][\w-]*)\s*(?:-{2,3}>|-{2,3}|={2,3}>|-\.->|-\.-)\s*(?:\|[^|]*\|\s*)?([A-Za-z_][\w-]*)/g, Zi = /^\s*(graph|flowchart)\b/i, Un = /* @__PURE__ */ new Set([
  "graph",
  "flowchart",
  "subgraph",
  "end",
  "classDef",
  "class",
  "style",
  "linkStyle",
  "click",
  "direction",
  "TB",
  "TD",
  "BT",
  "LR",
  "RL"
]);
function ys(e) {
  for (const t of e.split(`
`)) {
    const n = t.trim();
    if (!(!n || n.startsWith("%%")))
      return Zi.test(n);
  }
  return !1;
}
function Es(e) {
  const t = /* @__PURE__ */ new Set();
  for (const n of e.split(`
`)) {
    const s = n.trim();
    if (!s || s.startsWith("%%")) continue;
    Wn.lastIndex = 0;
    let i;
    for (; (i = Wn.exec(s)) !== null; )
      for (const o of [i[1], i[2]]) Un.has(o) || t.add(o);
    for (jn.lastIndex = 0; (i = jn.exec(s)) !== null; )
      Un.has(i[1]) || t.add(i[1]);
  }
  return [...t];
}
function Xi(e, t, n, s = "mdflowActive", i = null) {
  const o = e.replace(/\n+$/, "");
  if (!t?.length) return { code: o, missing: [] };
  let a = [], c = [...new Set(t)];
  const d = ys(e), u = d ? Es(e) : [];
  if (d) {
    const w = new Set(u);
    a = c.filter((m) => !w.has(m)), c = c.filter((m) => w.has(m));
  }
  if (!c.length) return { code: o, missing: a };
  const f = [o, ""];
  if (i && d) {
    const w = new Set(c), m = u.filter((h) => !w.has(h));
    m.length && (f.push(`classDef mdflowInactive ${i};`), f.push(`class ${m.join(",")} mdflowInactive;`));
  }
  return f.push(`classDef ${s} ${n};`), f.push(`class ${c.join(",")} ${s};`), { code: f.join(`
`), missing: a };
}
function qn(e) {
  return pe ? pe.dump(String(e), { lineWidth: -1 }).trim() : String(e);
}
function Ji(e) {
  const t = /^\s*(.+?):(?:\s|$)/.exec(e.replace(/\r$/, ""));
  if (!t) return null;
  let n = t[1].trim();
  const s = n[0];
  return (s === '"' || s === "'") && n.endsWith(s) && n.length >= 2 && (n = n.slice(1, -1)), n;
}
const Nt = (e) => /^\s*/.exec(e)[0].length;
function Qi(e, t, n) {
  const s = qn(t), i = n == null ? null : `${s}: ${qn(n)}`, o = vs.exec(e);
  if (!o) {
    if (i == null) return null;
    const v = e.startsWith("\uFEFF") ? 1 : 0;
    return { start: v, end: v, text: `---
mdflow:
  selected:
    ${i}
---
` };
  }
  const a = ji.exec(e)[0].length, c = o[1], d = [];
  let u = a;
  for (const v of c.split(`
`))
    d.push({ raw: v, start: u }), u += v.length + 1;
  const f = d.findIndex((v) => /^mdflow:\s*$/.test(v.raw.replace(/\r$/, "")));
  if (f < 0) {
    if (i == null) return null;
    const v = a + c.length;
    return { start: v, end: v, text: `
mdflow:
  selected:
    ${i}` };
  }
  let w = -1;
  for (let v = f + 1; v < d.length; v++) {
    const C = d[v].raw.replace(/\r$/, "");
    if (C.trim() && Nt(C) === 0) break;
    if (/^\s+selected:\s*$/.test(C)) {
      w = v;
      break;
    }
  }
  if (w < 0) {
    if (i == null) return null;
    const v = d[f].start + d[f].raw.length + 1;
    return { start: v, end: v, text: `  selected:
    ${i}
` };
  }
  const m = Nt(d[w].raw), h = " ".repeat(m + 2);
  let y = -1, b = null;
  for (let v = w + 1; v < d.length; v++) {
    const C = d[v].raw.replace(/\r$/, "");
    if (C.trim() && Nt(C) <= m) break;
    if (C.trim() && (b == null && (b = /^\s*/.exec(C)[0]), Ji(C) === t)) {
      y = v;
      break;
    }
  }
  if (y >= 0) {
    const v = d[y], C = v.raw.endsWith("\r");
    if (i == null) {
      const N = Math.min(v.start + v.raw.length + 1, a + c.length);
      return { start: v.start, end: N, text: "" };
    }
    const M = /^\s*/.exec(v.raw)[0];
    return { start: v.start, end: v.start + v.raw.length - (C ? 1 : 0), text: `${M}${i}` };
  }
  if (i == null) return null;
  const x = d[w].start + d[w].raw.length + 1;
  return { start: x, end: x, text: `${b ?? h}${i}
` };
}
const er = 2;
function bs(e) {
  return (e || "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "figure";
}
function tr(e, t) {
  const n = /^\s*%%\s*id\s*:\s*(\S+)/m.exec(e || "");
  return bs(n ? n[1] : `figure-${t + 1}`);
}
function nr(e) {
  const t = e.getAttribute("viewBox")?.trim().split(/[\s,]+/);
  if (t?.length === 4) {
    const s = parseFloat(t[2]), i = parseFloat(t[3]);
    if (Number.isFinite(s) && Number.isFinite(i) && s > 0 && i > 0) return { width: s, height: i };
  }
  const n = e.getBoundingClientRect();
  return { width: Math.max(1, n.width), height: Math.max(1, n.height) };
}
function sr(e) {
  return new Promise((t, n) => {
    const s = new Image();
    s.onload = () => t(s), s.onerror = () => n(new Error("SVG を画像として読み込めませんでした。")), s.src = e;
  });
}
async function xs(e, { scale: t = er, background: n = null } = {}) {
  const { width: s, height: i } = nr(e), o = e.cloneNode(!0);
  o.setAttribute("width", String(s)), o.setAttribute("height", String(i)), o.removeAttribute("style"), o.getAttribute("xmlns") || o.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const a = new XMLSerializer().serializeToString(o), c = URL.createObjectURL(new Blob([a], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const d = await sr(c), u = document.createElement("canvas");
    u.width = Math.max(1, Math.round(s * t)), u.height = Math.max(1, Math.round(i * t));
    const f = u.getContext("2d");
    return n && (f.fillStyle = n, f.fillRect(0, 0, u.width, u.height)), f.drawImage(d, 0, 0, u.width, u.height), await new Promise((w, m) => {
      u.toBlob(
        (h) => h ? w(h) : m(new Error("PNG に変換できませんでした。")),
        "image/png"
      );
    });
  } finally {
    URL.revokeObjectURL(c);
  }
}
function ir(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result).split(",", 2)[1] || ""), s.onerror = () => n(new Error("画像データを読めませんでした。")), s.readAsDataURL(e);
  });
}
async function Vn(e) {
  if (!navigator.clipboard?.write || typeof ClipboardItem > "u")
    throw new Error("このブラウザは画像のクリップボードコピーに対応していません。");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": e })]);
}
const rr = [
  ["((", "))"],
  ["{{", "}}"],
  ["[[", "]]"],
  ["([", "])"],
  ["[(", ")]"],
  ["[/", "/]"],
  ["[\\", "\\]"],
  [">", "]"],
  ["[", "]"],
  ["(", ")"],
  ["{", "}"]
], or = ["<==>", "<-.->", "<-->", "<->", "-.->", "-.-", "-->", "---", "==>", "===", "--x", "--o"], ks = [
  { open: "-.", closers: [[".->", "-.->"], [".-", "-.-"]] },
  { open: "--", closers: [["-->", "-->"], ["---", "---"], ["--x", "--x"], ["--o", "--o"]] },
  { open: "==", closers: [["==>", "==>"], ["===", "==="], ["==x", "==x"], ["==o", "==o"]] }
], ar = ks.flatMap((e) => e.closers.map(([t]) => t)), cr = /^\s*(?:flowchart(?:-elk)?|graph)(?:\s+[A-Za-z]{2})?\s*;?\s*(?:%%.*)?$/i, lr = /^\s*(classDef|class|style|linkStyle|click|direction|accTitle|accDescr|title)\b/i, dr = /^[A-Za-z0-9_\u0080-\uFFFF][A-Za-z0-9_.\-\u0080-\uFFFF]*/, ur = /^(\s*class\s+)([^\s;]+)(\s+.*)$/i, fr = /^(\s*style\s+)([^\s;,]+)(\s+.*)$/i, pr = /^(\s*linkStyle\s+)(\d+(?:\s*,\s*\d+)*)(\s+.*)$/i;
function ln(e) {
  const t = {
    supported: !0,
    reason: "",
    hasHeader: !1,
    statements: [],
    nodes: /* @__PURE__ */ new Map(),
    edges: [],
    indent: ""
  }, n = e.split(`
`);
  let s = 0;
  for (const i of n) {
    const o = s;
    s += i.length + 1;
    const a = o + i.length;
    if (!i.trim()) continue;
    if (/^\s*%%/.test(i)) {
      Qe(t, i, o, a);
      continue;
    }
    if (cr.test(i)) {
      t.hasHeader = !0, Qe(t, i, o, a);
      continue;
    }
    if (/^\s*(subgraph|end)\b/i.test(i))
      return t.supported = !1, t.reason = "subgraph を含む図は編集できません", t;
    if (lr.test(i)) {
      Qe(t, i, o, a);
      continue;
    }
    const c = gr(i, o, a);
    if (!c) {
      Qe(t, i, o, a);
      continue;
    }
    if (!t.indent && c.type !== "other" && (t.indent = c.indent), t.statements.push(c), c.type === "node")
      Kn(t, c.ref);
    else {
      c.refs.forEach((d) => Kn(t, d));
      for (let d = 0; d < c.arrows.length; d++)
        t.edges.push({
          from: c.refs[d].id,
          to: c.refs[d + 1].id,
          arrow: c.arrows[d],
          stmtIdx: t.statements.length - 1,
          indexInStmt: d
        });
    }
  }
  return t.supported && !t.hasHeader && (t.supported = !1, t.reason = "flowchart / graph 以外の図は編集できません"), t;
}
const Je = /* @__PURE__ */ new Map(), mr = 100;
function hr(e) {
  const t = Je.get(e);
  if (t) return t;
  const n = ln(e), s = { ok: n.supported, reason: n.reason };
  return Je.size >= mr && Je.clear(), Je.set(e, s), s;
}
function Qe(e, t, n, s) {
  const i = { type: "other", start: n, end: s, indent: Cs(t) };
  let o;
  (o = ur.exec(t)) ? i.cls = {
    ids: o[2].split(",").map((a) => a.trim()).filter(Boolean),
    span: { start: n + o[1].length, end: n + o[1].length + o[2].length }
  } : (o = fr.exec(t)) ? i.styleNode = o[2] : (o = pr.exec(t)) && (i.link = {
    indices: o[2].split(",").map((a) => parseInt(a, 10)),
    span: { start: n + o[1].length, end: n + o[1].length + o[2].length }
  }), e.statements.push(i);
}
function Cs(e) {
  const t = /^([ \t]*)/.exec(e);
  return t ? t[1] : "";
}
function gr(e, t, n, s) {
  const i = Cs(e), o = { pos: i.length }, a = () => {
    for (; o.pos < e.length && /\s/.test(e[o.pos]); ) o.pos++;
  }, c = () => t + o.pos;
  function d() {
    a();
    const x = dr.exec(e.slice(o.pos));
    if (!x) return null;
    let v = x[0];
    const C = v.search(/--|-\.|\.-/);
    if (C > 0 && (v = v.slice(0, C)), v = v.replace(/[-.]+$/, ""), !v) return null;
    const M = c();
    o.pos += v.length;
    const N = { id: v, span: { start: M, end: M + v.length }, def: null };
    for (const [I, P] of rr) {
      if (!e.startsWith(I, o.pos)) continue;
      const U = o.pos + I.length;
      let F = -1, le = !1, A = U;
      if (e[U] === '"') {
        le = !0, A = U + 1;
        let H = A;
        for (; H < e.length; ) {
          if (e[H] === "\\" && e[H + 1] === '"') {
            H += 2;
            continue;
          }
          if (e[H] === '"') {
            F = H;
            break;
          }
          H++;
        }
        if (F < 0 || !e.startsWith(P, F + 1)) return null;
      } else {
        const H = e.indexOf(P, U);
        if (H < 0) return null;
        F = H;
      }
      const G = F + (le ? 1 : 0) + P.length;
      let Q = G;
      const Ee = /^:::[A-Za-z0-9_-]+/.exec(e.slice(G));
      return Ee && (Q = G + Ee[0].length), N.def = {
        label: e.slice(A, F),
        quoted: le,
        shape: [I, P],
        cls: Ee ? Ee[0] : "",
        labelSpan: { start: t + A, end: t + F },
        span: { start: M, end: t + Q },
        raw: e.slice(M - t, Q)
      }, o.pos = Q, N.span = { start: M, end: t + Q }, N;
    }
    return N;
  }
  function u() {
    a();
    for (const x of or) {
      if (!e.startsWith(x, o.pos)) continue;
      const v = c();
      o.pos += x.length;
      const C = {
        text: x,
        mid: null,
        span: { start: v, end: c() },
        label: null,
        labelSpan: null,
        pipeSpan: null
      };
      if (a(), e[o.pos] === "|") {
        const M = e.indexOf("|", o.pos + 1);
        if (M < 0) return null;
        C.label = e.slice(o.pos + 1, M), C.pipeSpan = { start: c(), end: t + M + 1 }, C.labelSpan = { start: c() + 1, end: t + M }, o.pos = M + 1;
      }
      return C;
    }
    return f();
  }
  function f() {
    for (const x of ks) {
      if (!e.startsWith(x.open, o.pos)) continue;
      const v = c(), C = o.pos + x.open.length;
      let M = -1, N = "", I = "";
      for (let A = C; A < e.length && M < 0; A++)
        for (const [G, Q] of x.closers)
          if (e.startsWith(G, A)) {
            M = A, N = G, I = Q;
            break;
          }
      if (M < 0) continue;
      const P = e.slice(C, M);
      if (!P.trim()) continue;
      o.pos = M + N.length;
      const U = P.length - P.replace(/^\s+/, "").length, F = P.trim(), le = t + C + U;
      return {
        text: I,
        // mid があるものは「中置ラベル形式」。raw をそのまま書き戻せば見た目が保たれる。
        mid: { open: x.open, close: N },
        raw: e.slice(v - t, o.pos),
        span: { start: v, end: c() },
        label: F,
        labelSpan: { start: le, end: le + F.length },
        pipeSpan: null
      };
    }
    return null;
  }
  function w() {
    return a(), e[o.pos] === ";" && (o.pos++, a()), o.pos >= e.length || e.slice(o.pos).startsWith("%%");
  }
  const m = d();
  if (!m) return null;
  const h = u();
  if (!h)
    return w() ? { type: "node", start: t, end: n, indent: i, ref: m } : null;
  const y = [m], b = [h];
  for (; ; ) {
    const x = d();
    if (!x) return null;
    if (y.push(x), w()) break;
    const v = u();
    if (!v) return null;
    b.push(v);
  }
  return { type: "edge", start: t, end: n, indent: i, refs: y, arrows: b };
}
function Kn(e, t) {
  const n = e.nodes.get(t.id);
  if (!n) {
    e.nodes.set(t.id, {
      id: t.id,
      def: t.def,
      defs: t.def ? [t.def] : [],
      firstRef: t
    });
    return;
  }
  t.def && (n.def || (n.def = t.def), n.defs.push(t.def));
}
function Oe(e, t) {
  if (!e) return '" "';
  let n = e.replace(/"/g, "#quot;");
  const s = new Set(t.split(""));
  return (n.includes("|") || [...n].some((i) => s.has(i))) && (n = `"${n}"`), n;
}
function wr(e) {
  return (e || "").replace(/#quot;/g, '"').replace(/#124;/g, "|");
}
const vr = /<br\s*\/?>/gi;
function zn(e) {
  return wr(e).replace(vr, `
`);
}
function Rt(e) {
  return String(e ?? "").replace(/\r\n?/g, `
`).split(`
`).join("<br/>");
}
function Ls(e) {
  return String(e ?? "").replace(/"/g, "#quot;").replace(/\|/g, "#124;");
}
function yr(e) {
  return e.mid ? e.raw : e.text + (e.label != null ? `|${e.label}|` : "");
}
function Re(e) {
  return e.def ? e.def.raw : e.id;
}
function Er(e) {
  for (let t = 1; ; t++) {
    const n = `N${t}`;
    if (!e.has(n)) return n;
  }
}
function Ss(e, t) {
  const n = e.statements[e.statements.length - 1], s = e.indent || "";
  return n ? { at: n.end, prefix: `
` + s } : { at: 0, prefix: "" };
}
function br(e, t, n, s) {
  const i = e.nodes.get(n);
  if (!i) return [];
  const o = Ms(i);
  if (o.length)
    return bt(o.map((c) => ({
      start: c.labelSpan.start,
      end: c.labelSpan.end,
      text: c.quoted ? s.replace(/"/g, "#quot;") : Oe(s, c.shape[1])
    })));
  const a = i.firstRef;
  return [{ start: a.span.start, end: a.span.end, text: `${a.id}[${Oe(s, "]")}]` }];
}
function Ms(e) {
  return e.defs?.length ? e.defs : e.def ? [e.def] : [];
}
function xr(e, t, n, s, i) {
  const o = e.nodes.get(n);
  if (!o) return [];
  const a = Ms(o);
  if (!a.length) {
    const c = o.firstRef;
    return [{
      start: c.span.start,
      end: c.span.end,
      text: `${c.id}${s}${Oe(c.id, i)}${i}`
    }];
  }
  return a.every((c) => c.shape[0] === s && c.shape[1] === i) ? [] : bt(a.map((c) => ({
    start: c.span.start,
    end: c.span.end,
    text: `${n}${s}${c.quoted ? `"${c.label}"` : Oe(c.label, i)}${i}${c.cls || ""}`
  })));
}
function kr(e, t, n, s) {
  const i = e.edges[n];
  if (!i) return [];
  const o = i.arrow, a = Ls(s);
  return o.mid ? s.trim() ? s.includes("|") || ar.some((d) => s.includes(d)) || s !== s.trim() ? [{ start: o.span.start, end: o.span.end, text: `${o.text}|${a}|` }] : [{ start: o.labelSpan.start, end: o.labelSpan.end, text: a }] : [{ start: o.span.start, end: o.span.end, text: o.text }] : s.trim() ? o.labelSpan ? [{ start: o.labelSpan.start, end: o.labelSpan.end, text: a }] : [{ start: o.span.end, end: o.span.end, text: `|${a}|` }] : o.pipeSpan ? [{ start: o.pipeSpan.start, end: o.pipeSpan.end, text: "" }] : [];
}
function he(e, t) {
  return e[t.end] === `
` ? { start: t.start, end: t.end + 1, text: "" } : t.start > 0 && e[t.start - 1] === `
` ? { start: t.start - 1, end: t.end, text: "" } : { start: t.start, end: t.end, text: "" };
}
function dn(e, t, n, s = -1) {
  const i = [], o = /* @__PURE__ */ new Set();
  return e.arrows.forEach((a, c) => {
    if (!t.has(c)) return;
    const [d, u] = c === s ? [e.refs[c + 1], e.refs[c]] : [e.refs[c], e.refs[c + 1]];
    i.push(`${Re(d)} ${yr(a)} ${Re(u)}`), o.add(c), o.add(c + 1);
  }), e.refs.forEach((a, c) => {
    a.def && !o.has(c) && !(n && n.has(a.id)) && i.push(Re(a));
  }), i.map((a) => e.indent + a).join(`
`);
}
function bt(e) {
  const t = [...e].sort((s, i) => s.start - i.start || s.end - i.end), n = [];
  for (const s of t) {
    const i = n[n.length - 1];
    if (i && s.start < i.end) {
      i.end = Math.max(i.end, s.end), i.text += s.text;
      continue;
    }
    n.push({ ...s });
  }
  return n;
}
function $s(e, t, n) {
  if (!n.size) return [];
  const s = [...n], i = (a) => a - s.filter((c) => c < a).length, o = [];
  for (const a of e.statements) {
    if (!a.link) continue;
    const c = a.link.indices.filter((d) => !n.has(d)).map(i);
    if (!c.length) {
      o.push(he(t, a));
      continue;
    }
    c.join(",") !== a.link.indices.join(",") && o.push({ start: a.link.span.start, end: a.link.span.end, text: c.join(",") });
  }
  return o;
}
function Cr(e, t, n) {
  const s = [];
  for (const i of e.statements) {
    if (i.styleNode === n) {
      s.push(he(t, i));
      continue;
    }
    if (!i.cls || !i.cls.ids.includes(n)) continue;
    const o = i.cls.ids.filter((a) => a !== n);
    s.push(o.length ? { start: i.cls.span.start, end: i.cls.span.end, text: o.join(",") } : he(t, i));
  }
  return s;
}
function Lr(e, t, n) {
  const s = e.edges[n];
  if (!s) return [];
  const i = e.statements[s.stmtIdx], o = $s(e, t, /* @__PURE__ */ new Set([n]));
  if (i.arrows.length === 1)
    o.push(he(t, i));
  else {
    const a = /* @__PURE__ */ new Set();
    i.arrows.forEach((c, d) => {
      d !== s.indexInStmt && a.add(d);
    }), o.push({ start: i.start, end: i.end, text: dn(i, a, null) });
  }
  return bt(o);
}
function Sr(e, t, n, s) {
  const i = e.edges[n];
  if (!i || i.arrow.text === s) return [];
  const o = i.arrow;
  if (o.mid) {
    const a = o.label ? `|${o.label.replace(/\|/g, "#124;")}|` : "";
    return [{ start: o.span.start, end: o.span.end, text: s + a }];
  }
  return [{ start: o.span.start, end: o.span.end, text: s }];
}
function Mr(e, t, n) {
  const s = e.edges[n];
  if (!s) return [];
  const i = e.statements[s.stmtIdx], o = new Set(i.arrows.map((a, c) => c));
  return [{
    start: i.start,
    end: i.end,
    text: dn(i, o, null, s.indexInStmt)
  }];
}
function $r(e, t, { label: n = "新規ノード" } = {}) {
  const s = Er(e.nodes), { at: i, prefix: o } = Ss(e);
  return { edits: [{ start: i, end: i, text: `${o}${s}[${Oe(n, "]")}]` }], id: s };
}
function Tr(e, t, n, s, i = "") {
  const o = (d) => {
    const u = e.nodes.get(d);
    return u ? u.def ? u : { id: d, def: null } : { id: d, def: { raw: `${d}[新規ノード]` } };
  }, a = i ? `|${Ls(i)}|` : "", c = Ss(e);
  return {
    edits: [{
      start: c.at,
      end: c.at,
      text: `${c.prefix}${Re(o(n))} -->${a} ${Re(o(s))}`
    }]
  };
}
function _r(e, t, n) {
  const s = [], i = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Set();
  e.edges.forEach((a, c) => {
    if (!(a.from !== n && a.to !== n)) {
      if (o.add(c), !i.has(a.stmtIdx)) {
        const d = e.statements[a.stmtIdx];
        i.set(a.stmtIdx, new Set(d.arrows.map((u, f) => f)));
      }
      i.get(a.stmtIdx).delete(a.indexInStmt);
    }
  });
  for (const [a, c] of i) {
    const d = e.statements[a];
    if (d.arrows.length === 1) {
      s.push(he(t, d));
      continue;
    }
    const u = dn(d, c, /* @__PURE__ */ new Set([n]));
    s.push(u ? { start: d.start, end: d.end, text: u } : he(t, d));
  }
  for (const a of e.statements)
    a.type === "node" && a.ref.id === n && s.push(he(t, a));
  return s.push(...Cr(e, t, n)), s.push(...$s(e, t, o)), bt(s);
}
function Nr(e, t) {
  for (const n of e.statements)
    if (n.start <= t && t <= n.end) return { start: n.start, end: n.end };
  return null;
}
function Rr(e, t) {
  let n = e;
  for (const s of [...t].sort((i, o) => o.start - i.start))
    n = n.slice(0, s.start) + s.text + n.slice(s.end);
  return n;
}
function nt(e, t) {
  const n = (e || "").indexOf("flowchart-");
  if (n < 0) return null;
  let s = e.slice(n + 10);
  {
    const i = /^(.+)-(\d+)$/.exec(s);
    if (!i) return null;
    s = i[1];
  }
  for (; ; ) {
    if (t.has(s)) return s;
    const i = /^(.+)-\d+$/.exec(s);
    if (!i) return null;
    s = i[1];
  }
}
function st(e, t) {
  const n = t.nodes;
  let s = null, i = null, o = null;
  for (const c of e.classList || [])
    c.startsWith("LS-") && (s = c.slice(3)), c.startsWith("LE-") && (i = c.slice(3));
  if (!(s && i && n.has(s) && n.has(i))) {
    const c = /[LE]-(.+)-(\d+)$/.exec(e.id || "") || /[LE]_(.+)_(\d+)$/.exec(e.id || "");
    if (!c) return null;
    o = parseInt(c[2], 10);
    const d = c[1], u = [];
    for (let m = 1; m < d.length; m++) {
      const h = d[m - 1];
      if (h !== "-" && h !== "_") continue;
      const y = d.slice(0, m - 1), b = d.slice(m);
      y && b && n.has(y) && n.has(b) && u.push([y, b]);
    }
    const f = u.filter(([m, h]) => t.edges.some((y) => y.from === m && y.to === h)), w = f.length ? f : u;
    if (w.length !== 1) return null;
    [s, i] = w[0];
  }
  const a = [];
  return t.edges.forEach((c, d) => {
    c.from === s && c.to === i && a.push(d);
  }), a.length ? a.length === 1 || o == null ? a[0] : a[Math.min(o, a.length - 1)] : null;
}
const Ir = [
  ["-->", "実線 →"],
  ["---", "実線（矢印なし）"],
  ["-.->", "点線 →"],
  ["-.-", "点線（矢印なし）"],
  ["==>", "太線 →"],
  ["===", "太線（矢印なし）"],
  ["--o", "実線 ○"],
  ["--x", "実線 ×"],
  ["<-->", "実線 ←→"],
  ["<-.->", "点線 ←→"],
  ["<==>", "太線 ←→"]
], Ar = [
  ["[", "]", "□ 長方形"],
  ["(", ")", "▢ 角丸"],
  ["([", "])", "⬭ スタジアム"],
  ["[[", "]]", "▥ サブルーチン"],
  ["[(", ")]", "⛁ 円柱"],
  ["((", "))", "◯ 円"],
  ["{", "}", "◇ ひし形（判断）"],
  ["{{", "}}", "⬡ 六角形"],
  ["[/", "/]", "▱ 平行四辺形"],
  ["[\\", "\\]", "▰ 平行四辺形（逆）"],
  [">", "]", "▷ 旗"]
], It = "|", Pr = 'input, textarea, select, [contenteditable="true"], .monaco-editor';
function Fr(e, t, n = !1) {
  const s = e.querySelector(".mermaid-tools-status");
  s && (s.textContent = t, s.className = "mermaid-tools-status" + (n ? " error" : ""), setTimeout(() => {
    s.textContent === t && (s.textContent = "", s.className = "mermaid-tools-status");
  }, 6e3));
}
function Wt(e, t, n, s = null) {
  if (e.querySelector(":scope > .mermaid-editbar")) return null;
  const i = ln(t.src);
  if (!i.supported)
    return Fr(e, `⚠ この図は編集できません（${i.reason}）`, !0), n.onExit?.(), null;
  e.classList.add("mermaid-editing");
  const o = { selected: null, arrowPick: null, busy: !1 }, a = document.createElement("div");
  a.className = "mermaid-editbar";
  const c = (p, g, E) => {
    const k = document.createElement("button");
    return k.type = "button", k.textContent = p, k.title = g, k.addEventListener("click", E), a.appendChild(k), k;
  }, d = c("ラベル編集", "選択中のノード/矢印のラベルを編集", $i);
  c("➕ ノード", "ノードを追加（追加後にラベルを編集できます）", Ti);
  const u = c("➕ 矢印", "矢印を追加（始点→終点の順にノードをクリック）", _i), f = c("⇄ 反転", "選択中の矢印の向きを入れ替える", Ni), w = document.createElement("select");
  w.className = "mermaid-arrow-kind", w.title = "選択中の矢印の線種を変える";
  for (const [p, g] of Ir) {
    const E = document.createElement("option");
    E.value = p, E.textContent = g, w.appendChild(E);
  }
  w.addEventListener("change", Ri), a.appendChild(w);
  const m = document.createElement("select");
  m.className = "mermaid-node-shape", m.title = "選択中のノードの形状を変える";
  for (const [p, g, E] of Ar) {
    const k = document.createElement("option");
    k.value = p + It + g, k.textContent = E, m.appendChild(k);
  }
  m.addEventListener("change", Ii), a.appendChild(m);
  const h = c("削除", "選択中のノード/矢印を削除（Delete キーでも可。Ctrl+Z で戻せます）", Pn), y = document.createElement("span");
  y.className = "mermaid-edit-hint", a.appendChild(y), c("✓ 完了", "編集モードを終了（Esc でも可）", () => Te(!0)), e.appendChild(a);
  const b = (p) => {
    y.textContent = p;
  }, x = (p) => {
    if (![...w.options].some((g) => g.value === p)) {
      const g = document.createElement("option");
      g.value = p, g.textContent = p, w.appendChild(g);
    }
    w.value = p;
  }, v = (p) => {
    const [g, E] = p || ["[", "]"], k = g + It + E;
    if (![...m.options].some((S) => S.value === k)) {
      const S = document.createElement("option");
      S.value = k, S.textContent = `${g}…${E}`, m.appendChild(S);
    }
    m.value = k;
  }, C = () => {
    if (!n.reveal) return;
    const p = o.selected;
    if (!p) {
      n.reveal(null);
      return;
    }
    if (p.kind === "node") {
      const k = i.nodes.get(p.id), S = k?.def ? k.def.span : k?.firstRef?.span;
      n.reveal(S ? { line: Nr(i, S.start), focus: S } : null);
      return;
    }
    const g = i.edges[p.idx], E = g ? i.statements[g.stmtIdx] : null;
    n.reveal(g ? { line: E ? { start: E.start, end: E.end } : null, focus: g.arrow.span } : null);
  }, M = () => {
    const p = o.selected, g = p?.kind === "edge", E = p?.kind === "node";
    d.disabled = !p, h.disabled = !p, d.textContent = g ? "ラベル編集（矢印）" : "ラベル編集", f.classList.toggle("hidden", !g), w.classList.toggle("hidden", !g), m.classList.toggle("hidden", !E), u.classList.toggle("active", !!o.arrowPick), g && x(i.edges[p.idx]?.arrow.text || "-->"), E && v(i.nodes.get(p.id)?.def?.shape), o.arrowPick ? b(o.arrowPick.from ? `➕ 矢印: 始点 ${o.arrowPick.from} → 終点のノードをクリック（Escで中止）` : "➕ 矢印: 始点のノードをクリック（Escで中止）") : b(p ? p.kind === "node" ? `選択中: ノード ${p.id}（Delete で削除）` : "選択中: 矢印（Delete で削除）" : "クリック: 選択 ／ ダブルクリック: ラベル編集 ／ Esc: 終了"), C();
  };
  M();
  const N = () => {
    e.querySelectorAll(".selected").forEach((p) => p.classList.remove("selected")), o.selected = null;
  }, I = (p) => [...e.querySelectorAll("g[id*='flowchart-']")].find((g) => nt(g.id, i.nodes) === p) || null, P = (p) => [...e.querySelectorAll("path.flowchart-link")].find((g) => st(g, i) === p) || null, U = (p, g) => {
    N(), o.selected = { kind: "node", id: p }, (g || I(p))?.classList.add("selected"), M();
  }, F = (p, g) => {
    N(), o.selected = { kind: "edge", idx: p }, (g || P(p))?.classList.add("selected"), M();
  }, le = () => {
    const p = o.selected;
    if (!p) return null;
    if (p.kind === "node") return { kind: "node", id: p.id };
    const g = i.edges[p.idx];
    return g ? { kind: "edge", from: g.from, to: g.to } : null;
  }, A = (p, { editNodeId: g = null, selection: E } = {}) => {
    if (o.busy || !p || !p.length) return;
    o.busy = !0, n.applyEdits(t.src, p, {
      editNodeId: g,
      selection: E === void 0 ? le() : E
    }) || Te(!1);
  }, G = e.querySelector(":scope > .mermaid-canvas") || e, Q = (p, g) => {
    const E = G.getBoundingClientRect();
    return { x: p - E.left + G.scrollLeft, y: g - E.top + G.scrollTop };
  }, Ee = (p) => {
    const g = p.getBoundingClientRect(), E = Q(g.left, g.top);
    return { left: E.x, top: E.y, width: g.width, height: g.height };
  }, H = (p) => {
    try {
      const g = p.getTotalLength();
      if (!g) return null;
      const E = p.getPointAtLength(g / 2).matrixTransform(p.getScreenCTM());
      return { x: E.x, y: E.y };
    } catch {
      return null;
    }
  }, In = (p) => {
    if (!p) return { left: 8, top: 8, width: 180 };
    const g = Q(p.x, p.y);
    return { left: g.x - 90, top: g.y - 14, width: 180 };
  }, Mi = (p, g) => {
    const E = I(p), k = I(g);
    if (!E || !k) return { left: 8, top: 8, width: 180 };
    const S = E.getBoundingClientRect(), q = k.getBoundingClientRect();
    return In({
      x: (S.left + S.width / 2 + q.left + q.width / 2) / 2,
      y: (S.top + S.height / 2 + q.top + q.height / 2) / 2
    });
  }, $t = ({ left: p, top: g, width: E, value: k, placeholder: S }, q) => {
    e.querySelectorAll(".mermaid-inline-input").forEach((re) => re.remove());
    const _ = document.createElement("textarea");
    _.className = "mermaid-inline-input", _.rows = 1, _.value = k || "", S && (_.placeholder = S), _.style.left = `${Math.max(0, p)}px`, _.style.top = `${Math.max(0, g)}px`, _.style.width = `${Math.max(160, E)}px`, G.appendChild(_);
    const be = () => {
      _.style.height = "auto", _.style.height = `${_.scrollHeight}px`;
    };
    be(), _.focus(), _.select();
    let _e = !1;
    const _t = (re) => {
      if (_e) return;
      _e = !0;
      const Pi = _.value;
      _.remove(), re && q(Pi);
    };
    _.addEventListener("keydown", (re) => {
      re.stopPropagation(), re.key === "Enter" && !re.shiftKey ? (re.preventDefault(), _t(!0)) : re.key === "Escape" && _t(!1);
    }), _.addEventListener("input", be), _.addEventListener("blur", () => _t(!0));
  }, Tt = (p, g) => {
    const E = zn(i.nodes.get(g)?.def?.label ?? ""), k = Ee(p);
    $t({
      left: k.left,
      top: k.top,
      width: k.width + 24,
      value: E,
      placeholder: "ノードラベル（Shift+Enter で改行）"
    }, (S) => {
      S !== E && A(br(i, t.src, g, Rt(S)));
    });
  }, An = (p, g) => {
    const E = zn(i.edges[p]?.arrow?.label || ""), k = In(g ? H(g) : null);
    $t(
      { ...k, value: E, placeholder: "矢印ラベル（Shift+Enter で改行・空で削除）" },
      (S) => {
        S !== E && A(kr(i, t.src, p, Rt(S)));
      }
    );
  };
  function $i() {
    const p = o.selected;
    if (p)
      if (p.kind === "node") {
        const g = I(p.id);
        g && Tt(g, p.id);
      } else
        An(p.idx, P(p.idx));
  }
  function Ti() {
    const { edits: p, id: g } = $r(i, t.src, {});
    A(p, { editNodeId: g, selection: { kind: "node", id: g } });
  }
  function _i() {
    o.arrowPick = o.arrowPick ? null : {}, N(), M();
  }
  function Ni() {
    const p = o.selected;
    if (p?.kind !== "edge") return;
    const g = i.edges[p.idx];
    g && A(
      Mr(i, t.src, p.idx),
      { selection: { kind: "edge", from: g.to, to: g.from } }
    );
  }
  function Ri() {
    const p = o.selected;
    p?.kind === "edge" && A(Sr(i, t.src, p.idx, w.value));
  }
  function Ii() {
    const p = o.selected;
    if (p?.kind !== "node") return;
    const [g, E] = m.value.split(It);
    A(xr(i, t.src, p.id, g, E));
  }
  function Pn() {
    const p = o.selected;
    p && A(p.kind === "node" ? _r(i, t.src, p.id) : Lr(i, t.src, p.idx), { selection: null });
  }
  const Ai = (p) => {
    const g = p.getBoundingClientRect(), E = g.left + g.width / 2, k = g.top + g.height / 2;
    let S = null, q = 1 / 0;
    for (const _ of e.querySelectorAll("path.flowchart-link")) {
      const be = H(_);
      if (!be) continue;
      const _e = (be.x - E) ** 2 + (be.y - k) ** 2;
      _e < q && (q = _e, S = _);
    }
    return q < 1600 ? S : null;
  }, Fn = (p) => {
    const g = p.target.closest("path.flowchart-link");
    if (g) return g;
    const E = p.target.closest(".edgeLabel");
    return E ? Ai(E) : null;
  }, Dn = (p) => {
    if (p.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const g = p.target.closest("g[id*='flowchart-']");
    if (g) {
      const k = nt(g.id, i.nodes);
      if (!k) return;
      if (o.arrowPick) {
        if (!o.arrowPick.from)
          o.arrowPick = { from: k }, N(), g.classList.add("selected"), M();
        else {
          const S = o.arrowPick.from;
          o.arrowPick = null, N(), M(), $t(
            { ...Mi(S, k), value: "", placeholder: "矢印ラベル（空でも可・Shift+Enter で改行）" },
            (q) => A(
              Tr(i, t.src, S, k, Rt(q)).edits,
              { selection: { kind: "edge", from: S, to: k } }
            )
          );
        }
        return;
      }
      U(k, g);
      return;
    }
    const E = Fn(p);
    if (E) {
      const k = st(E, i);
      if (k != null) {
        F(k, E);
        return;
      }
      b("⚠️ この矢印はソースと対応付けできませんでした（特殊な記法の可能性）。");
      return;
    }
    !o.arrowPick && o.selected && (N(), M());
  }, On = (p) => {
    if (p.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const g = p.target.closest("g[id*='flowchart-']");
    if (g) {
      p.preventDefault();
      const S = nt(g.id, i.nodes);
      S && Tt(g, S);
      return;
    }
    const E = Fn(p);
    if (!E) return;
    const k = st(E, i);
    k != null && (p.preventDefault(), F(k, E), An(k, E));
  }, Bn = (p) => {
    if (!e.isConnected) {
      Te(!1);
      return;
    }
    if (!p.target?.closest?.(Pr)) {
      if (p.key === "Escape") {
        if (o.arrowPick) {
          o.arrowPick = null, N(), M();
          return;
        }
        Te(!0);
        return;
      }
      if ((p.key === "Delete" || p.key === "Backspace") && o.selected) {
        p.preventDefault(), Pn();
        return;
      }
      if ((p.ctrlKey || p.metaKey) && !p.altKey) {
        const g = p.key.toLowerCase();
        g === "z" && !p.shiftKey ? (p.preventDefault(), n.undo?.()) : (g === "y" || g === "z" && p.shiftKey) && (p.preventDefault(), n.redo?.());
      }
    }
  };
  e.addEventListener("click", Dn), e.addEventListener("dblclick", On), document.addEventListener("keydown", Bn);
  function Te(p) {
    e.removeEventListener("click", Dn), e.removeEventListener("dblclick", On), document.removeEventListener("keydown", Bn), e.classList.remove("mermaid-editing"), a.remove(), e.querySelectorAll(".mermaid-inline-input").forEach((g) => g.remove()), N(), n.reveal?.(null), p && n.onExit?.();
  }
  return s && requestAnimationFrame(() => {
    if (!e.isConnected || !a.isConnected) return;
    const p = s.selection;
    if (p?.kind === "node" && i.nodes.has(p.id))
      U(p.id);
    else if (p?.kind === "edge") {
      const g = i.edges.findIndex((E) => E.from === p.from && E.to === p.to);
      g >= 0 && F(g);
    }
    if (s.editNodeId) {
      const g = I(s.editNodeId);
      g && Tt(g, s.editNodeId);
    }
  }), () => Te(!1);
}
function Dr(e) {
  const t = e.split(`
`), n = [];
  let s = 0;
  for (const o of t)
    n.push(s), s += o.length + 1;
  const i = [];
  for (let o = 0; o < t.length; o++) {
    const a = /^\s*(`{3,}|~{3,})\s*mermaid\b/i.exec(t[o]);
    if (!a) continue;
    const c = a[1], d = n[o] + t[o].length + 1;
    for (let u = o + 1; u < t.length; u++) {
      const f = /^\s*(`{3,}|~{3,})\s*$/.exec(t[u]);
      if (!f || f[1][0] !== c[0] || f[1].length < c.length) continue;
      const w = n[u];
      i.push({ start: d, end: w, content: e.slice(d, w) }), o = u;
      break;
    }
  }
  return i;
}
function Gn(e, t) {
  if (e.content === t) return { ...e, indent: "", toRaw: (f) => f };
  const n = e.content.split(`
`), s = t.split(`
`);
  if (n.length !== s.length) return null;
  const i = [], o = [];
  let a = 0, c = 0, d = "";
  for (let f = 0; f < n.length; f++) {
    const w = n[f].endsWith("\r") ? n[f].slice(0, -1) : n[f], m = s[f];
    if (!w.endsWith(m)) return null;
    const h = w.slice(0, w.length - m.length);
    if (/\S/.test(h)) return null;
    h && !d && (d = h), i.push(a + h.length), o.push(c), a += n[f].length + 1, c += m.length + 1;
  }
  return { ...e, indent: d, toRaw: (f) => {
    let w = 0, m = o.length - 1;
    for (; w < m; ) {
      const h = w + m + 1 >> 1;
      o[h] <= f ? w = h : m = h - 1;
    }
    return i[w] + (f - o[w]);
  } };
}
function Ts(e, t, n = 0) {
  const s = Dr(e), i = s[n] ? Gn(s[n], t) : null;
  if (i) return i;
  for (const o of s) {
    const a = Gn(o, t);
    if (a) return a;
  }
  return null;
}
const j = window.markdownit ? window.markdownit({
  // html: false が最大の防御。AI の生成物と /api/web2md で取り込んだ外部ページを
  // innerHTML に入れる以上、生 HTML を通すわけにはいかない（<script> はエスケープされる）。
  // ここを true にするなら DOMPurify のベンダリングが必須になる。
  html: !1,
  linkify: !0,
  breaks: !1
}) : null, Ce = window.mermaid || null, Or = () => j !== null;
Ce && Ce.initialize({
  startOnLoad: !1,
  // 描画のタイミングはこちらが握る（renderInto の後）
  theme: "dark",
  // エディタが vs-dark なので図も暗色に揃える
  // securityLevel はラベルに埋め込まれた HTML の扱いを決める。strict なら
  // DOMPurify が onerror 等のハンドラを剥がす。AI の生成物を描く以上ここは緩められない。
  securityLevel: "strict",
  // ラベルは HTML（<foreignObject>）でなく SVG の <text> で描かせる。foreignObject を
  // 含む SVG を canvas に描くと canvas が汚染扱いになり、PNG 書き出し（🖼 保存 / 📋 コピー）
  // が "Tainted canvases may not be exported" で全滅するため。見た目の差はラベルの
  // 折返し規則が変わる程度。トップレベルの htmlLabels は旧形式だが、図種別ごとの
  // キーを知らない版への保険として両方置く。
  htmlLabels: !1,
  flowchart: { htmlLabels: !1 },
  class: { htmlLabels: !1 }
});
if (j) {
  const e = j.renderer.rules.link_open || ((s, i, o, a, c) => c.renderToken(s, i, o));
  j.renderer.rules.link_open = (s, i, o, a, c) => (s[i].attrSet("target", "_blank"), s[i].attrSet("rel", "noopener noreferrer"), e(s, i, o, a, c));
  const t = j.renderer.rules.image;
  j.renderer.rules.image = (s, i, o, a, c) => {
    const d = s[i].attrGet("src");
    return d && s[i].attrSet("src", Hr(d)), t(s, i, o, a, c);
  };
  const n = j.renderer.rules.fence;
  j.renderer.rules.fence = (s, i, o, a, c) => {
    const d = s[i];
    if (d.info.trim().toLowerCase() === "mermaid" && Ce)
      return `<pre class="mermaid-src"${Ae && d.map ? ` data-src-line="${d.map[0] + 1}" data-src-end="${d.map[1]}"` : ""}>
${At(d.content)}</pre>`;
    if (/^(?:yaml\s+)?mdflow-mapping$/i.test(d.info.trim())) {
      const u = /^diagram\s*:\s*(\S+)/m.exec(d.content);
      return `<details class="mdflow-mapping"><summary>⚙ ${u ? `条件マッピング: ${At(u[1])}` : "条件マッピング"}</summary><pre>${At(d.content)}</pre></details>`;
    }
    return n(s, i, o, a, c);
  }, j.inline.ruler.before("emphasis", "mark", (s, i) => {
    if (i || s.src.charCodeAt(s.pos) !== 61) return !1;
    const o = s.scanDelims(s.pos, !0);
    let a = o.length;
    if (a < 2) return !1;
    a % 2 && (s.push("text", "", 0).content = "=", a--);
    for (let c = 0; c < a; c += 2)
      s.push("text", "", 0).content = "==", s.delimiters.push({
        marker: 61,
        length: 0,
        token: s.tokens.length - 1,
        end: -1,
        open: o.can_open,
        close: o.can_close
      });
    return s.pos += o.length, !0;
  }), j.inline.ruler2.before("emphasis", "mark", (s) => {
    Yn(s, s.delimiters);
    for (const i of s.tokens_meta)
      i?.delimiters && Yn(s, i.delimiters);
    return !0;
  }), j.core.ruler.push("src_line", (s) => {
    if (Ae)
      for (const i of s.tokens)
        !i.map || i.nesting < 0 || i.type === "inline" || (i.attrSet("data-src-line", String(i.map[0] + 1)), i.attrSet("data-src-end", String(i.map[1])));
  });
}
function Yn(e, t) {
  const n = [];
  for (const s of t) {
    if (s.marker !== 61 || s.end === -1) continue;
    const i = t[s.end];
    let o = e.tokens[s.token];
    o.type = "mark_open", o.tag = "mark", o.nesting = 1, o.markup = "==", o.content = "", o = e.tokens[i.token], o.type = "mark_close", o.tag = "mark", o.nesting = -1, o.markup = "==", o.content = "";
    const a = e.tokens[i.token - 1];
    a?.type === "text" && a.content === "=" && n.push(i.token - 1);
  }
  for (; n.length; ) {
    const s = n.pop();
    let i = s + 1;
    for (; i < e.tokens.length && e.tokens[i].type === "mark_close"; ) i++;
    if (i--, s !== i) {
      const o = e.tokens[i];
      e.tokens[i] = e.tokens[s], e.tokens[s] = o;
    }
  }
}
let Ie = "", Ae = !1;
function Br(e) {
  Ie = e || "";
}
function Hr(e) {
  if (/^(https?:|data:|blob:|\/)/i.test(e)) return e;
  const t = [];
  for (const n of `${Ie}/${e}`.split("/"))
    if (!(!n || n === ".")) {
      if (n === "..") {
        t.pop();
        continue;
      }
      t.push(n);
    }
  return "/api/asset?path=" + encodeURIComponent(t.join("/"));
}
function At(e) {
  return e.replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}
let et = 0;
const Ne = /* @__PURE__ */ new Map(), jr = 50, ut = /* @__PURE__ */ new WeakMap(), Zn = /* @__PURE__ */ new WeakMap(), tt = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3], it = /* @__PURE__ */ new WeakMap();
function Wr(e, t) {
  return {
    get() {
      return it.get(e)?.get(t.index) || 1;
    },
    set(n) {
      let s = it.get(e);
      s || (s = /* @__PURE__ */ new Map(), it.set(e, s)), s.set(t.index, n);
    }
  };
}
function Ur(e) {
  it.delete(e);
}
function Pt(e, t) {
  const n = tt.findIndex((i) => i >= e - 1e-6), s = n < 0 ? tt.length - 1 : n;
  return tt[Math.min(tt.length - 1, Math.max(0, s + t))];
}
function _s(e, t) {
  const n = e.querySelector("svg"), s = e.__mermaidNatural;
  if (!n || !s) return;
  n.style.width = `${Math.round(s.w * t)}px`, n.style.height = `${Math.round(s.h * t)}px`, n.style.maxWidth = "none";
  const i = e.querySelector(".mermaid-zoom-label");
  i && (i.textContent = `${Math.round(t * 100)}%`);
}
function qr(e, t) {
  const n = document.createElement("span");
  n.className = "mermaid-zoom";
  const s = (a) => {
    t.set(a), _s(e, a);
  }, i = (a, c, d) => {
    const u = document.createElement("button");
    return u.type = "button", u.textContent = a, u.title = c, u.addEventListener("click", d), n.appendChild(u), u;
  };
  i("➖", "縮小（図の上で Ctrl+ホイールでも）", () => s(Pt(t.get(), -1)));
  const o = i("100%", "等倍に戻す", () => s(1));
  return o.className = "mermaid-zoom-label", i("➕", "拡大（図の上で Ctrl+ホイールでも）", () => s(Pt(t.get(), 1))), e.addEventListener("wheel", (a) => {
    a.ctrlKey && (a.preventDefault(), s(Pt(t.get(), a.deltaY < 0 ? 1 : -1)));
  }, { passive: !1 }), n;
}
function Vr(e, t) {
  Ne.size >= jr && Ne.delete(Ne.keys().next().value), Ne.set(e, t);
}
let Ut = null;
function Kr(e) {
  Ut = e;
}
let qt = null, Be = null;
function zr(e) {
  qt = e;
}
function Gr(e) {
  Be = e;
}
function Yr(e, t, n = null) {
  const s = tr(t.src, t.index || 0), i = document.createElement("div");
  i.className = "mermaid-tools";
  const o = document.createElement("span");
  o.className = "mermaid-tools-status";
  const a = async (f, w, m) => {
    const h = f.textContent;
    f.disabled = !0, f.textContent = "⏳", o.className = "mermaid-tools-status", o.textContent = "";
    try {
      o.textContent = await m() || w;
    } catch (y) {
      o.className = "mermaid-tools-status error", o.textContent = y?.message || String(y);
    } finally {
      f.disabled = !1, f.textContent = h;
      const y = o.textContent;
      setTimeout(() => {
        o.textContent === y && (o.textContent = "", o.className = "mermaid-tools-status");
      }, 6e3);
    }
  }, c = (f = Vt()) => xs(e.querySelector("svg"), { background: f });
  if (i.appendChild(o), n && e.__mermaidNatural && i.appendChild(qr(e, n)), t.editable && qt) {
    const { ok: f, reason: w } = hr(t.src), m = document.createElement("button");
    m.type = "button", m.title = f ? "この図を直接編集する（ノード/矢印の操作がMermaidソースへ反映される）" : `この図は直接編集できません（${w}）`, m.textContent = "編集", m.disabled = !f, f && m.addEventListener("click", () => qt(e, t)), i.appendChild(m);
  }
  if (Ut) {
    const f = document.createElement("button");
    f.type = "button", f.title = "PNG にしてワークスペースへ保存する（同じ図は同じ名前へ書き直す）", f.textContent = "保存", f.addEventListener("click", () => a(f, "保存しました", async () => `✓ ${await Ut(await c(), s)}`)), i.appendChild(f);
  }
  const d = document.createElement("button");
  d.type = "button", d.title = "PNG をクリップボードへコピーする", d.textContent = "コピー", d.addEventListener("click", () => a(d, "コピーしました", async () => (await Vn(await c()), "✓ コピーしました"))), i.appendChild(d);
  const u = document.createElement("button");
  return u.type = "button", u.title = "白背景のPNGをクリップボードへコピーする（資料や白いスライド向け）", u.textContent = "白でコピー", u.addEventListener("click", () => a(u, "白背景でコピーしました", async () => (await Vn(await c(Vt("white"))), "✓ 白背景でコピーしました"))), i.appendChild(u), i;
}
function Vt(e = "theme") {
  return e === "white" ? "#ffffff" : getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#1e1e2a";
}
function Xn(e, t = {}, n = null) {
  const s = document.createElement("div");
  s.className = "mermaid-box";
  const i = document.createElement("div");
  i.className = "mermaid-canvas", i.innerHTML = e, s.appendChild(i);
  const o = i.querySelector("svg"), a = o?.getAttribute("viewBox")?.trim().split(/[\s,]+/), c = a?.length === 4 ? parseFloat(a[2]) : NaN, d = a?.length === 4 ? parseFloat(a[3]) : NaN;
  return Number.isFinite(c) && Number.isFinite(d) && (s.__mermaidNatural = { w: c, h: d }), o && s.prepend(Yr(s, t, n)), _s(s, n ? n.get() : 1), Be && Be(s, t), s;
}
async function Zr(e, t, n) {
  if (!Ce) return;
  const s = n.mdflow || null, i = Zn.get(e) || /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map();
  Zn.set(e, o);
  let a = -1;
  for (const c of e.querySelectorAll("pre.mermaid-src")) {
    if (a += 1, ut.get(e) !== t) return;
    const d = c.textContent, u = s ? Xr(d, s) : null;
    let f = u ? u.injected : d;
    const w = (C) => {
      c.dataset.srcLine && (C.dataset.srcLine = c.dataset.srcLine), c.dataset.srcEnd && (C.dataset.srcEnd = c.dataset.srcEnd), C.__mermaidMeta = m, c.replaceWith(C), u && C.after(Jr(u, s));
    }, m = { src: d, index: a, editable: !!n.editable }, h = i.get(a);
    if (h && h.src === d && h.renderSrc === f) {
      h.meta.index = a, o.set(a, h), w(h.box), Be && Be(h.box, h.meta, !0);
      continue;
    }
    const y = (C) => (o.set(a, { src: d, renderSrc: f, box: C, meta: m }), C), b = Wr(e, m), x = Ne.get(f);
    if (x) {
      w(y(Xn(x, m, b)));
      continue;
    }
    let v;
    try {
      ({ svg: v } = await Ce.render(`pixie-mermaid-${et++}`, f));
    } catch (C) {
      if (document.getElementById(`dpixie-mermaid-${et - 1}`)?.remove(), u && f !== d)
        try {
          f = d, { svg: v } = await Ce.render(`pixie-mermaid-${et++}`, f);
        } catch {
          document.getElementById(`dpixie-mermaid-${et - 1}`)?.remove(), v = null;
        }
      else
        v = null;
      if (v == null) {
        c.classList.add("mermaid-error"), c.title = `Mermaid の構文エラー: ${C?.message || C}`;
        continue;
      }
    }
    if (Vr(f, v), ut.get(e) !== t) return;
    w(y(Xn(v, m, b)));
  }
}
function Xr(e, t) {
  if (!ws()) return null;
  const n = Ui(e), s = Vi(t.doc.mappings, n);
  if (!s || !s.presets.length) return null;
  const i = t.conditions.get(n) || "";
  let o = {}, a = !1;
  if (i.trim())
    try {
      const m = JSON.parse(i);
      m && typeof m == "object" && !Array.isArray(m) ? o = m : a = !0;
    } catch {
      a = !0;
    }
  const c = t.doc.selected[n] || null, d = Yi(s, a ? {} : o, c);
  let u = e, f = [];
  d && ({ code: u, missing: f } = Xi(
    e,
    d.activeNodes,
    d.style,
    "mdflowActive",
    d.inactiveStyle
  ));
  const w = {};
  if (ys(e)) {
    const m = new Set(Es(e));
    for (const h of s.presets) {
      const y = h.activeNodes.filter((b) => !m.has(b));
      y.length && (w[h.name] = y);
    }
  }
  return {
    diagramId: n,
    mapping: s,
    selectedName: c,
    resolution: d,
    condText: i,
    invalidCond: a,
    injected: u,
    missing: f,
    missingByPreset: w
  };
}
function Jr(e, t) {
  const n = document.createElement("div");
  n.className = "mdflow-presets", n.dataset.diagram = e.diagramId;
  const s = document.createElement("div");
  s.className = "mdflow-presets-title", s.textContent = "条件プリセット", n.appendChild(s);
  const i = document.createElement("ul"), o = document.createElement("li");
  o.className = "mdflow-preset-item mdflow-auto", o.dataset.preset = "", o.textContent = "（条件で自動判定）", e.selectedName || o.classList.add("selected"), i.appendChild(o);
  for (const c of e.mapping.presets) {
    const d = document.createElement("li");
    d.className = "mdflow-preset-item", d.dataset.preset = c.name;
    const u = c.when || "（無条件）", f = e.missingByPreset?.[c.name] || [], w = [`when: ${u}`, `active_nodes: ${c.activeNodes.join(", ")}`];
    f.length && w.push(`図に存在しないノードID: ${f.join(", ")}`), d.title = w.join(`
`);
    const m = document.createElement("div");
    m.className = "mdflow-preset-body";
    const h = document.createElement("div");
    h.className = "mdflow-preset-name";
    const y = document.createElement("span");
    if (y.textContent = c.name, h.appendChild(y), f.length) {
      const x = document.createElement("span");
      x.className = "mdflow-warn-badge", x.textContent = "⚠", h.appendChild(x);
    }
    if (e.selectedName === c.name && d.classList.add("selected"), !e.selectedName && e.resolution?.auto && e.resolution.name === c.name) {
      d.classList.add("auto-hit");
      const x = document.createElement("span");
      x.className = "mdflow-badge", x.textContent = "自動", h.appendChild(x);
    }
    m.appendChild(h);
    const b = document.createElement("span");
    b.className = "mdflow-when", b.textContent = u, m.appendChild(b), d.appendChild(m), i.appendChild(d);
  }
  if (n.appendChild(i), !e.resolution && !e.selectedName) {
    const c = document.createElement("div");
    c.className = "mdflow-note", c.textContent = "一致するプリセットがありません（ハイライトなし）", n.appendChild(c);
  }
  const a = document.createElement("input");
  return a.className = "mdflow-cond", a.type = "text", a.placeholder = '条件JSONで自動判定 例 {"role": "admin", "error_count": 0}', a.value = e.condText, a.spellcheck = !1, e.invalidCond && a.classList.add("invalid"), n.appendChild(a), t.focus && t.focus.diagramId === e.diagramId && requestAnimationFrame(() => {
    a.focus();
    try {
      a.setSelectionRange(t.focus.selStart, t.focus.selEnd);
    } catch {
    }
  }), n;
}
function Ke(e, t, n = {}) {
  if (!j) {
    e.classList.remove("md"), e.textContent = t;
    return;
  }
  e.classList.add("md");
  const s = Ie, i = Ae;
  n.assetBase != null && (Ie = n.assetBase || ""), Ae = !!n.sourceMap;
  try {
    e.innerHTML = j.render(t);
  } finally {
    n.assetBase != null && (Ie = s), Ae = i;
  }
  const o = (ut.get(e) || 0) + 1;
  return ut.set(e, o), Zr(e, o, n);
}
function Ns(e, t) {
  e.classList.remove("md"), e.textContent = t;
}
let xe = null;
function rt() {
  return typeof window.TurndownService == "function";
}
function Qr() {
  return rt() ? xe || (xe = new window.TurndownService({
    headingStyle: "atx",
    // # 見出し（アプリのノート記法と揃える）
    codeBlockStyle: "fenced",
    // ``` フェンス
    bulletListMarker: "-",
    emDelimiter: "_"
  }), window.turndownPluginGfm?.gfm && xe.use(window.turndownPluginGfm.gfm), xe.addRule("dropBrokenImg", {
    filter: (e) => e.nodeName === "IMG" && !e.getAttribute("src"),
    replacement: () => ""
  }), xe) : null;
}
function eo(e) {
  const t = Qr();
  if (!t) throw new Error("Turndown が未取得です（python -m pipenv run python scripts/fetch_turndown.py を実行してください）");
  return t.turndown(e);
}
const l = (e) => document.getElementById(e), to = 60;
let Kt = !0, Jn = null;
function Rs() {
  const e = l("messages");
  return e && e !== Jn && (Jn = e, e.addEventListener("scroll", () => {
    Kt = no(e);
  })), e;
}
function no(e) {
  return e.scrollHeight - e.scrollTop - e.clientHeight <= to;
}
function $(e, t, n = {}) {
  const s = document.createElement("div");
  s.className = "msg " + e;
  const i = document.createElement("div");
  return i.className = "body", e === "assistant" ? Ke(i, t, n) : Ns(i, t), s.appendChild(i), Rs().appendChild(s), X(e === "user"), s;
}
function Is(e, t) {
  if (!e || e.querySelector(".msg-del")) return;
  const n = document.createElement("button");
  n.className = "msg-del", n.type = "button", n.textContent = "削除", n.title = "この往復を削除（LLM の文脈からも消してコンテキストを節約する）", n.addEventListener("click", t), e.appendChild(n);
}
function so(e, t) {
  if (!e || e.querySelector(".msg-rollback")) return;
  const n = document.createElement("button");
  n.className = "msg-rollback", n.type = "button", n.textContent = "戻す", n.title = "このターンで変更されたファイルを、ターンの前の状態へ戻す（以降のターンで同じファイルに加えられた変更も巻き戻る）", n.addEventListener("click", t), e.appendChild(n);
}
function D(e, t, n = {}) {
  let s = e.querySelector(".tool-log");
  s || (s = document.createElement("div"), s.className = "tool-log", e.insertBefore(s, e.querySelector(".body")));
  const i = document.createElement("div");
  i.className = "tool-status", n.category && i.classList.add("status-" + n.category), n.tool && (i.dataset.tool = n.tool), i.textContent = t, s.appendChild(i), X();
}
function X(e = !1) {
  const t = Rs();
  t && (e && (Kt = !0), Kt && (t.scrollTop = t.scrollHeight));
}
function zt(e) {
  const t = e.indexOf("<think>");
  if (t < 0) return { think: "", visible: e };
  const n = e.lastIndexOf("</think>");
  return n < t ? { think: e.slice(t + 7), visible: e.slice(0, t) } : {
    think: e.slice(t + 7, n),
    visible: (e.slice(0, t) + e.slice(n + 8)).replace(/^\s+/, "")
  };
}
function As(e) {
  const t = e.split(`
`), n = [];
  let s = 0;
  for (const c of t)
    n.push(s), s += c.length + 1;
  const i = (c) => Math.min(e.length, n[c] + t[c].length), o = [];
  let a = 0;
  for (; a < t.length; ) {
    if (t[a].trim() !== "```search") {
      a++;
      continue;
    }
    const c = a, d = [];
    let u = 0, f = !1;
    for (a++; a < t.length; a++) {
      const h = t[a].trim();
      if (u === 0 && h === "```replace") {
        f = !0;
        break;
      }
      if (h === "```") {
        if (u > 0) {
          u--, d.push(t[a]);
          continue;
        }
        let y = a + 1;
        for (; y < t.length && t[y].trim() === ""; ) y++;
        if (y < t.length && t[y].trim() === "```replace") {
          f = !0, a = y;
          break;
        }
        d.push(t[a]);
        continue;
      }
      h.startsWith("```") && h.length > 3 && u++, d.push(t[a]);
    }
    if (!f) continue;
    const w = [];
    let m = -1;
    for (u = 0, a++; a < t.length; a++) {
      const h = t[a].trim();
      if (h === "```") {
        if (u > 0) {
          u--, w.push(t[a]);
          continue;
        }
        m = a, a++;
        break;
      }
      if (u === 0 && h === "```search") {
        m = a - 1;
        break;
      }
      h.startsWith("```") && h.length > 3 && u++, w.push(t[a]);
    }
    m < 0 || o.push({
      search: d.join(`
`),
      replace: w.join(`
`),
      start: n[c],
      end: i(m)
    });
  }
  return o;
}
function io(e) {
  return As(e).map(({ search: t, replace: n }) => ({ search: t, replace: n }));
}
function ro(e) {
  if (e = zt(e).visible, !e.trim()) return "";
  const t = [...e.matchAll(/```apply\s*\n([\s\S]*?)```/g)];
  if (t.length) return t[t.length - 1][1].replace(/\n$/, "");
  const n = [...e.matchAll(/```(?!diff\b|search\b|replace\b)[a-zA-Z]*\s*\n([\s\S]*?)```/g)];
  if (n.length) {
    const i = n[n.length - 1][1].replace(/\n$/, "");
    if (i.length >= e.trim().length * 0.6) return i;
  }
  const s = [...e.matchAll(/```diff\s*\n([\s\S]*?)```/g)];
  if (s.length) {
    const i = s[s.length - 1][1];
    if (i.length >= e.trim().length * 0.6) return oo(i);
  }
  return e.trim();
}
function oo(e) {
  return e.split(`
`).filter((t) => !/^(-|@@|---|\+\+\+)/.test(t)).map((t) => t.startsWith("+") || t.startsWith(" ") ? t.slice(1) : t).join(`
`).replace(/\n$/, "");
}
function ze() {
  return crypto.randomUUID && crypto.randomUUID() || "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
L.select(ze());
const r = {
  editor: null,
  monaco: null,
  currentFile: null,
  dirty: !1,
  savedVersionId: null,
  // 保存時点の model.getAlternativeVersionId()。ダーティ判定の基準
  saving: !1,
  savePromise: null,
  // 進行中の保存。切替前の待ち合わせに使う
  saveError: null,
  // 直近の保存失敗（ApiError）。成功でクリア
  baseMtime: null,
  // 開いた/最後に保存した時点のディスク mtime。保存時に送り返して
  // 「その間に外部で書き換わっていないか」を照合させる（409 で衝突）
  conflictDeclined: !1,
  // 衝突ダイアログで「上書きしない」を選んだ。自動保存を止める印
  // （止めないと2秒ごとに同じダイアログが出続ける）
  // --- ファイル移動履歴（Alt+←/→ と 🕘 最近開いたファイル）---
  navBack: [],
  // 戻れるパス（新しいものが末尾）
  navFwd: [],
  // 進めるパス（戻ったときだけ積まれる）
  navRecent: [],
  // 最近開いた順（MRU・重複なし）。ワークスペースを跨がない
  fsMap: /* @__PURE__ */ new Map(),
  // ツリー遅延読み込み: path → {path, type, size?, text?, loaded?}
  // （loaded は dir のみ: 子を取得済みか。未展开の dir は子が無い）
  treeTruncated: !1,
  // いずれかのディレクトリ一覧が上限で打ち切られた
  collapsedDirs: /* @__PURE__ */ new Set(),
  // 折りたたみ中のフォルダ
  knownDirs: /* @__PURE__ */ new Set(),
  // 既出のフォルダ。初出だけを閉じる（開いた状態の記憶を壊さない）
  changedPaths: /* @__PURE__ */ new Set(),
  // 直近ターンでエージェントが変更したファイル
  get streaming() {
    return L.busy.value;
  },
  assistantEl: null,
  // 進行中ターンのアシスタント吹き出し
  assistantUi: null,
  // beginAssistantStream のハンドル
  turnId: 0,
  // 進行中ターンのサーバ側 ID（turn イベント。0 = 文脈編集不可）
  compacted: null,
  // /compact の結果（compacted イベント）。ターン確定時に畳む
  get sessionId() {
    return L.state.sessionId;
  },
  set sessionId(e) {
    L.select(e, L.state.phase === "switching" ? L.active : void 0);
  },
  // 会話切替の完了まで送信をロックする。
  // --- モード（統合シェル）---
  mode: "code",
  // "code" | "note" | "plan"。GET /api/mode で起動時に取得
  features: {},
  // /api/mode の features フラグ（UI 出し分けの判定に使う）
  copilotEnabled: !1,
  // Copilot 連携（features.copilot / /api/copilot で同期）
  // --- Code モードの進め方（サブモード）---
  // "plan": まず実行計画を出させて承認してから実装（plan_first でサーバへ）
  // "normal": 従来どおり自律実装（破壊操作は承認制）
  codeStyle: localStorage.getItem("pixie.codeStyle") === "plan" ? "plan" : "normal",
  planExecNext: !1,
  // 一回限り: 次の送信は計画承認後の「実行フェーズ」（計画し直さない）
  // --- Plan モード専用 ---
  planText: "",
  // 直近の実行計画（承認時に Code モードへ渡す本文）。
  // ファイルには書かない: 承認して実行したら役目が終わるものなので、
  // ワークスペースに計画ファイルの残骸を増やさない。
  // --- Note モード専用（NWP 移植）---
  history: [],
  // chat history [{role, content}]（Note のみ。サーバ側サイドカーと同期）
  historyLoaded: !1,
  // 履歴を読めたか。読めていないのに保存すると履歴を消してしまう
  notes: [],
  // 付箋 [{line, text}]
  noteDecorations: null,
  // Monaco decorations collection（付箋グリフ）
  checkedFiles: /* @__PURE__ */ new Set(),
  // AI コンテキストに含めるファイル（Note/Code。再描画をまたいで保持）
  refs: [],
  // 現在ノートの関連ファイル [{path, external, name}]
  checkedRefs: /* @__PURE__ */ new Set(),
  // AI コンテキストに含める関連ファイル（refKey で識別）
  pendingTarget: null,
  // 反映先として追跡中の選択範囲（1つだけ）
  mdflowConditions: /* @__PURE__ */ new Map(),
  // 図ID → 条件JSON文字列。プレビュー再構築で input が
  // 作り直されるため、入力値はここが正（ファイル切替でクリア）
  diagramEditing: null
  // 直接編集中の mermaid 図 {src, index, restore, dispose}
}, R = () => r.mode === "note", Ge = () => r.mode === "plan", Pe = () => r.mode === "code";
let V = 0, ot = 0, ue = !1, ge = !1, Gt = !1;
const ao = {
  py: "python",
  pyi: "python",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  jsonc: "json",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  less: "less",
  md: "markdown",
  markdown: "markdown",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  ini: "ini",
  cfg: "ini",
  xml: "xml",
  sh: "shell",
  bash: "shell",
  ps1: "powershell",
  bat: "bat",
  cmd: "bat",
  sql: "sql",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  hpp: "cpp",
  cs: "csharp",
  java: "java",
  kt: "kotlin",
  go: "go",
  rs: "rust",
  rb: "ruby",
  php: "php",
  swift: "swift",
  scala: "scala",
  vue: "html",
  svelte: "html"
}, xt = (e) => (e.split(".").pop() || "").toLowerCase(), un = (e) => ao[xt(e)] || "plaintext", Ps = (e) => !!e && ["md", "markdown"].includes(xt(e)), co = () => "";
let Fs = /* @__PURE__ */ new Set([".pptx", ".docx", ".xlsx", ".pdf"]);
const fn = (e) => Fs.has("." + xt(e));
window.__monacoReady.then((e) => {
  r.monaco = e, r.editor = e.editor.create(l("editor"), {
    value: "",
    language: "plaintext",
    theme: "vs-dark",
    automaticLayout: !0,
    minimap: { enabled: !1 },
    fontSize: 13,
    glyphMargin: !1
    // Note モードでは applyModeUI が true に切り替える（付箋グリフ用）
  }), r.noteDecorations = r.editor.createDecorationsCollection(), Ct(), r.editor.onDidChangeModelContent(() => {
    zs(), En(), ni();
  }), r.editor.onDidScrollChange(() => ii()), r.editor.onDidChangeCursorSelection(di), r.editor.addCommand(e.KeyMod.CtrlCmd | e.KeyCode.KeyS, () => Zt()), r.editor.addCommand(
    e.KeyMod.CtrlCmd | e.KeyMod.Shift | e.KeyCode.KeyP,
    () => tn()
  ), r.editor.addCommand(e.KeyMod.Alt | e.KeyCode.LeftArrow, () => Xt()), r.editor.addCommand(e.KeyMod.Alt | e.KeyCode.RightArrow, () => Jt()), r.editor.addCommand(e.KeyMod.CtrlCmd | e.KeyCode.KeyE, () => Qt()), r.editor.onMouseDown((n) => {
    R() && n.target.type === e.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && ma(n.target.position.lineNumber);
  });
  const t = r.editor.getContainerDomNode();
  t.addEventListener("wheel", si, { passive: !0, capture: !0 }), t.addEventListener("paste", (n) => {
    if (!R()) return;
    const s = as(n.clipboardData);
    s && (n.preventDefault(), n.stopPropagation(), cs(s));
  }, !0), t.addEventListener("dragover", (n) => {
    R() && n.dataTransfer?.types?.includes("Files") && (n.preventDefault(), n.stopPropagation());
  }, !0), t.addEventListener("drop", (n) => {
    if (!R() || !n.dataTransfer?.files?.length) return;
    n.preventDefault(), n.stopPropagation();
    const s = as(n.dataTransfer);
    if (!s) {
      alert("⚠️ 貼り付けられるのは画像ファイルだけです。");
      return;
    }
    cs(s);
  }, !0), lo();
});
async function lo() {
  Kr(Jo), zr(ia), Gr(oa);
  try {
    await Ds(), pn(), await kt(), await W(), R() && await gn();
  } catch (e) {
    dt(e.message || "初期化中に問題が発生しました。設定を確認してください。");
  }
  try {
    ac(), Fi();
  } catch (e) {
    dt(e.message || "画面を準備できませんでした。設定を確認してください。");
  }
}
async function Ds() {
  try {
    Yt(await se("/api/mode"));
  } catch {
    Yt({ mode: "code", features: {} });
  }
}
const Fe = ["code", "plan", "note"], He = { code: "Code", plan: "Plan", note: "Note" };
function Yt(e) {
  r.mode = Fe.includes(e.mode) ? e.mode : "code", r.features = e.features || {}, Array.isArray(r.features.extract_exts) && (Fs = new Set(r.features.extract_exts)), r.copilotEnabled = !!r.features.copilot;
}
function pn() {
  const e = R(), t = l("mode-btn");
  for (const n of Fe)
    document.body.classList.toggle("mode-" + n, r.mode === n), t.classList.toggle("mode-" + n, r.mode === n);
  t.textContent = He[r.mode], t.title = `現在: ${He[r.mode]} モード（クリックで次のモードへ切替）`, Ge() || xi(), r.editor?.updateOptions({ glyphMargin: e }), di(), mn(), Os(), Ye();
}
function Os() {
  const e = l("code-style-btn"), t = r.codeStyle === "plan";
  e.textContent = t ? "計画を先に" : "通常", e.title = t ? "Codeモードの進め方: 計画を先に — まず実行計画を提示し、承認してから実装する（クリックで通常へ切替）" : "Codeモードの進め方: 通常 — エージェントが自律的に実装（破壊操作は承認制）。クリックで計画優先へ切替";
}
function uo() {
  r.codeStyle = r.codeStyle === "plan" ? "normal" : "plan", localStorage.setItem("pixie.codeStyle", r.codeStyle), Os(), $("system", r.codeStyle === "plan" ? "計画を先に: エージェントはまず実行計画を提示し、承認してから実装します。" : "通常: エージェントが自律的に実装します（破壊操作は従来どおり承認制）。");
}
function mn() {
  const e = !!r.copilotEnabled, t = l("copilot-bar");
  t && t.classList.toggle("hidden", !e);
  const n = l("settings-copilot-controls");
  n && n.classList.toggle("hidden", !e);
  const s = {
    note: "文章について相談したいことを入力…",
    plan: "進め方を相談したいことを入力…",
    code: "相談したいこと、調べたいこと、変更したいことを入力…"
  };
  l("chat-input").placeholder = s[r.mode];
}
function Bs() {
  r.notes = [], r.noteDecorations?.clear(), r.refs = [], r.checkedRefs.clear(), r.checkedFiles.clear(), r.pendingTarget?.coll && r.pendingTarget.coll.clear(), r.pendingTarget = null, r.mdflowConditions.clear(), r.history = [], r.historyLoaded = !1, l("sel-chip").classList.add("hidden"), ce(), qe();
}
async function fo() {
  const e = Fe[(Fe.indexOf(r.mode) + 1) % Fe.length];
  await hn(e, { confirm: !0 });
}
async function hn(e, t = {}) {
  if (r.streaming)
    return alert("⚠️ 実行中はモードを切り替えられません。中断してから切り替えてください。"), !1;
  if (e === r.mode) return !0;
  if (t.confirm && !confirm(`${He[e]} モードに切り替えますか？
（会話セッションはリセットされます）`)) return !1;
  const n = L.begin("switching");
  if (!n) return;
  let s = "";
  try {
    await St();
    let i;
    try {
      i = await T("/api/mode", { mode: e });
    } catch (o) {
      return s = o.message, alert("⚠️ モードを切り替えられません: " + o.message), !1;
    }
    return Yt(i), t.keepMessages || (l("messages").innerHTML = ""), l("approval").classList.add("hidden"), l("approval").innerHTML = "", r.assistantEl = null, r.sessionId = ze(), $e(), Bs(), pn(), await W(), R() ? (await gn(), r.currentFile && (await Sn(), await $n()), $("system", "Noteモードに切り替えました（読み取り専用エージェント・クリック反映）。")) : Ge() ? $("system", "Planモードに切り替えました（調べて実行計画を立てるだけ。承認するまでファイルは変更されません）。") : $("system", "Codeモードに切り替えました（自律エージェント・破壊操作は承認制）。"), !0;
  } catch (i) {
    return s = i.message, alert(i.message), !1;
  } finally {
    L.finish(n, s);
  }
}
async function gn() {
  r.history = [], r.historyLoaded = !1, l("messages").innerHTML = "";
  let e;
  try {
    e = await se("/api/chat/history");
  } catch (s) {
    D($("assistant", ""), `⚠️ 履歴を読み込めませんでした（${s.message}）。この保存先の履歴は、取り違えを防ぐため今回は保存しません。`);
    return;
  }
  let t = null, n = "";
  for (const s of e.messages || []) {
    r.history.push({ role: s.role, content: s.content });
    const i = $(s.role, s.content, { assetBase: Ze() });
    if (s.role === "user") {
      t = i, n = s.content;
      continue;
    }
    i._exchange = { userEl: t, userText: n }, Is(i, () => hi(i, 0)), t = null, n = "";
  }
  r.historyLoaded = !0;
}
async function wn() {
  if (r.historyLoaded)
    try {
      const e = await T("/api/chat/history", { messages: r.history });
      Array.isArray(e.messages) && (r.history = e.messages);
    } catch {
    }
}
async function po() {
  if (r.streaming) {
    alert("⚠️ 応答の生成中は履歴を消去できません。");
    return;
  }
  if (confirm("この保存先の会話履歴を消去しますか？")) {
    try {
      await K("/api/chat/history", { method: "DELETE" });
    } catch (e) {
      alert("⚠️ 履歴を消去できません: " + e.message);
      return;
    }
    r.history = [], r.historyLoaded = !0, l("messages").innerHTML = "";
  }
}
async function kt() {
  try {
    const e = await se("/api/status");
    dt(e.ready ? "" : e.error || "エンジンを起動できませんでした。設定を確認してください。");
    const t = e.ready ? e.model || "(未設定)" : "起動失敗";
    if (l("model-name").textContent = t.split(/[\\/]/).pop() || t, l("model-name").title = t, !e.ready) {
      l("agent-status").textContent = "  ⚠ " + (e.error || "engine not ready");
      return;
    }
    l("agent-status").textContent = "", Hs(e.workspace);
  } catch (e) {
    dt(e.message || "状態を取得できませんでした。設定を確認してください。"), l("model-name").textContent = "接続不可";
  }
}
function Hs(e) {
  if (!e) return;
  const t = l("root-path");
  t.textContent = e, t.title = e;
  const n = e.split(/[\\/]/).filter(Boolean).pop() || e;
  l("root-project-name").textContent = n || "(未設定)", l("root-project-btn").title = "ルートプロジェクト: " + e + "（クリックで変更）";
}
const vn = (e) => e.includes("/") ? e.slice(0, e.lastIndexOf("/")) : "";
function js(e, t) {
  const n = new Set((t.files || []).map((s) => s.path));
  for (const s of [...r.fsMap.keys()])
    vn(s) === e && !n.has(s) && mo(s);
  for (const s of t.files || []) {
    const i = r.fsMap.get(s.path);
    i ? (i.size = s.size, i.text = s.text) : r.fsMap.set(s.path, { ...s, loaded: s.type === "dir" ? !1 : void 0 });
  }
  for (const s of t.files || [])
    s.type === "dir" && !r.knownDirs.has(s.path) && (r.knownDirs.add(s.path), r.collapsedDirs.add(s.path));
  t.truncated && (r.treeTruncated = !0);
}
async function ft(e) {
  const t = V, n = await z("/api/files/list?path=" + encodeURIComponent(e || ""));
  return !n || t !== V ? !1 : (js(e, n), !0);
}
function mo(e) {
  for (const t of [...r.fsMap.keys()])
    (t === e || t.startsWith(e + "/")) && (r.fsMap.delete(t), r.checkedFiles.delete(t));
}
async function W() {
  const e = V;
  r.treeTruncated = !1;
  const t = await z("/api/files/list?path=");
  if (!(!t || e !== V)) {
    Hs(t.root), js("", t);
    for (const [n, s] of [...r.fsMap])
      s.type === "dir" && s.loaded && n && await ft(n);
    Ye();
  }
}
function ho(e) {
  if (!e) return !1;
  let t = "";
  for (const n of e.split("/"))
    if (t = t ? t + "/" + n : n, r.collapsedDirs.has(t)) return !0;
  return !1;
}
async function go(e) {
  const t = String(e || "").split("/");
  let n = "";
  for (const s of t.slice(0, -1)) {
    n = n ? n + "/" + s : s, r.fsMap.has(n) || await ft(vn(n));
    const i = r.fsMap.get(n);
    i && i.type === "dir" && !i.loaded && await ft(n) && (i.loaded = !0), r.collapsedDirs.delete(n);
  }
}
function Ye() {
  const e = l("file-list");
  e.innerHTML = "";
  const t = [...r.fsMap.values()].filter((n) => !ho(vn(n.path))).sort((n, s) => n.path < s.path ? -1 : n.path > s.path ? 1 : 0);
  for (const n of t) {
    const s = n.path.split("/"), i = document.createElement("li");
    i.dataset.path = n.path, i.dataset.type = n.type, i.style.paddingLeft = 8 + (s.length - 1) * 16 + "px", wo(i, n);
    const o = document.createElement("span"), a = document.createElement("span");
    if (a.className = "fname", a.textContent = s[s.length - 1], n.type === "dir")
      i.classList.add("dir"), o.textContent = r.collapsedDirs.has(n.path) ? "▸" : "▾", i.append(o, a), i.addEventListener("click", async () => {
        r.collapsedDirs.has(n.path) ? (r.collapsedDirs.delete(n.path), n.loaded || await ft(n.path) && (n.loaded = !0)) : r.collapsedDirs.add(n.path), Ye();
      });
    else {
      if (!Ge())
        if (n.text || fn(n.path)) {
          const c = document.createElement("input");
          c.type = "checkbox", c.title = n.text ? "チャットのコンテキストに含める" : "チャットのコンテキストに含める（テキスト抽出して同梱。/copilot では原本を Copilot に添付）", c.checked = r.checkedFiles.has(n.path), c.addEventListener("click", (d) => d.stopPropagation()), c.addEventListener("change", () => {
            c.checked ? r.checkedFiles.add(n.path) : r.checkedFiles.delete(n.path);
          }), i.appendChild(c);
        } else {
          const c = document.createElement("span");
          c.className = "cb-pad", i.appendChild(c);
        }
      if (o.textContent = n.text ? "" : co(n.path), a.title = n.text ? n.path : `${n.path}（クリックで既定アプリで開く）`, i.append(o, a), i.classList.toggle("active", n.path === r.currentFile), r.changedPaths.has(n.path)) {
        i.classList.add("changed");
        const c = document.createElement("span");
        c.className = "changed-badge", c.textContent = "● 変更", i.appendChild(c);
      }
      i.addEventListener("click", () => n.text ? ie(n.path) : Ks(n.path));
    }
    i.addEventListener("contextmenu", (c) => {
      c.preventDefault(), Eo(c, n);
    }), e.appendChild(i);
  }
  l("files-trunc").classList.toggle("hidden", !r.treeTruncated);
}
let te = null;
function wo(e, t) {
  e.draggable = !0, e.addEventListener("dragstart", (n) => {
    te = t.path, n.dataTransfer.setData("text/plain", t.path), n.dataTransfer.effectAllowed = "move", e.classList.add("dragging");
  }), e.addEventListener("dragend", () => {
    te = null, e.classList.remove("dragging"), document.querySelectorAll("#file-list li.drop-target").forEach((n) => n.classList.remove("drop-target"));
  }), t.type === "dir" && (e.addEventListener("dragover", (n) => {
    const s = te;
    s === null || s === t.path || t.path.startsWith(s + "/") || (n.preventDefault(), n.dataTransfer.dropEffect = "move", e.classList.add("drop-target"));
  }), e.addEventListener("dragleave", () => e.classList.remove("drop-target")), e.addEventListener("drop", (n) => {
    n.preventDefault(), n.stopPropagation(), e.classList.remove("drop-target");
    const s = n.dataTransfer.getData("text/plain") || te;
    s && s !== t.path && Vs(s, t.path);
  }));
}
function vo() {
  const e = l("file-list");
  e.addEventListener("dragover", (t) => {
    te !== null && (t.target.closest("li") || (t.preventDefault(), t.dataTransfer.dropEffect = "move", e.classList.add("drop-root")));
  }), e.addEventListener("dragleave", (t) => {
    e.contains(t.relatedTarget) || e.classList.remove("drop-root");
  }), e.addEventListener("drop", (t) => {
    if (e.classList.remove("drop-root"), t.target.closest("li")) return;
    t.preventDefault();
    const n = t.dataTransfer.getData("text/plain") || te;
    n && Vs(n, "");
  });
}
function je() {
  l("fs-menu")?.remove();
}
function yo(e, t, n) {
  je();
  const s = document.createElement("div");
  s.id = "fs-menu";
  for (const o of n) {
    const a = document.createElement("div");
    a.className = o.onClick ? "fs-menu-item" : "fs-menu-head", a.textContent = o.label, o.title && (a.title = o.title), o.onClick && a.addEventListener("click", () => {
      je(), o.onClick();
    }), s.appendChild(a);
  }
  s.style.left = "0px", s.style.top = "0px", document.body.appendChild(s);
  const i = s.getBoundingClientRect();
  return s.style.left = Math.max(4, Math.min(e, window.innerWidth - i.width - 4)) + "px", s.style.top = Math.max(4, Math.min(t, window.innerHeight - i.height - 4)) + "px", s;
}
function Ws(e, t) {
  const n = e.getBoundingClientRect();
  return yo(n.left, n.bottom + 4, t);
}
function Eo(e, t) {
  je();
  const n = document.createElement("div");
  n.id = "fs-menu";
  const s = (i, o) => {
    const a = document.createElement("div");
    a.className = "fs-menu-item", a.textContent = i, a.addEventListener("click", () => {
      je(), o();
    }), n.appendChild(a);
  };
  t.type === "dir" ? (s("中に新規ファイル", () => pt("file", t.path + "/")), s("中に新規フォルダ", () => pt("dir", t.path + "/"))) : t.text || s("↗ 既定のアプリで開く", () => Ks(t.path)), s("名前変更・移動", () => bo(t)), s("削除", () => xo(t)), n.style.left = e.pageX + "px", n.style.top = e.pageY + "px", document.body.appendChild(n);
}
async function yn(e, t) {
  try {
    return await T(e, t), !0;
  } catch (n) {
    return alert("⚠️ " + n.message), !1;
  }
}
async function pt(e, t = "") {
  const s = prompt(e === "dir" ? "新規フォルダ名（例: src/utils）" : "新規ファイル名（例: src/main.py）", t);
  if (!s || !s.trim() || s.trim() === t.trim()) return;
  const i = s.trim().replace(/\\/g, "/");
  await yn("/api/fs/create", { path: i, kind: e }) && (e === "dir" && r.collapsedDirs.delete(i), await W(), e === "file" && await ie(i));
}
async function bo(e) {
  const t = prompt("新しいパス（フォルダに入れるには src/名前.py のように）", e.path);
  !t || !t.trim() || t.trim() === e.path || await Us(e, t.trim().replace(/\\/g, "/"));
}
async function Us(e, t) {
  if (!t || t === e.path) return;
  if (e.type === "dir" && (t === e.path || t.startsWith(e.path + "/"))) {
    alert("⚠️ フォルダを自分自身の中へは移動できません。");
    return;
  }
  if (!await yn("/api/fs/rename", { src: e.path, dst: t })) return;
  const n = (s) => s === e.path ? t : e.type === "dir" && s.startsWith(e.path + "/") ? t + s.slice(e.path.length) : s;
  if (r.currentFile) {
    const s = n(r.currentFile);
    s !== r.currentFile && (r.currentFile = s, l("current-file").textContent = s, gs(s, r.dirty));
  }
  r.checkedFiles = new Set([...r.checkedFiles].map(n)), qs(n), await W();
}
function qs(e) {
  const t = (n) => {
    const s = [];
    for (const i of n) {
      const o = e(i);
      o && o !== s[s.length - 1] && s.push(o);
    }
    return s;
  };
  r.navBack = t(r.navBack), r.navFwd = t(r.navFwd), r.navRecent = [...new Set(t(r.navRecent))], Se();
}
async function Vs(e, t) {
  const n = r.fsMap.get(e);
  if (!n) return;
  const s = e.split("/").pop(), i = t ? t + "/" + s : s;
  i !== e && e.split("/").slice(0, -1).join("/") !== t && await Us(n, i);
}
async function xo(e) {
  confirm(`「${e.path}」を削除しますか？`) && await yn("/api/fs/delete", { path: e.path }) && (r.checkedFiles.delete(e.path), qs((t) => t === e.path ? null : t), r.currentFile === e.path && (r.currentFile = null, r.baseMtime = null, r.editor.setValue(""), Ct(), B(), l("current-file").textContent = "（ファイル未選択）", Me(), Se(), R() && (await Sn(), await $n())), await W());
}
async function Ks(e) {
  try {
    await T("/api/fs/open", { path: e });
  } catch (t) {
    alert("⚠️ 開けませんでした: " + t.message);
  }
}
async function ie(e, t, n = "push") {
  if (ue) return;
  const s = ++ot, i = V, o = r.editor.getModel(), a = o.getVersionId(), c = () => s === ot && i === V && !ue && r.editor.getModel() === o && o.getVersionId() === a;
  if (t || await St(), !c() || r.dirty && !t && !confirm("未保存の変更があります。破棄して開きますか？"))
    return;
  const d = await z("/api/file?path=" + encodeURIComponent(e));
  !d || !c() || (n === "push" && r.currentFile && r.currentFile !== e && (r.navBack.push(r.currentFile), r.navFwd.length = 0), Mo(e), r.currentFile = e, r.baseMtime = d.mtime ?? null, r.conflictDeclined = !1, r.mdflowConditions.clear(), ra(), Ur(l("preview")), r.monaco.editor.setModelLanguage(r.editor.getModel(), un(e)), r.editor.setValue(d.content), r.saveError = null, Ct(), B(), l("current-file").textContent = e, t || cn("editor"), Me(), Se(), xn(), await go(e), !(s !== ot || i !== V) && (Ye(), R() && (await Sn(), await $n())));
}
let Qn = null;
function Ct() {
  r.savedVersionId = r.editor.getModel().getAlternativeVersionId(), r.dirty = !1;
}
function zs() {
  r.currentFile && (r.dirty = r.editor.getModel().getAlternativeVersionId() !== r.savedVersionId, B());
}
function B(e) {
  const t = l("save-state");
  if (gs(r.currentFile, r.dirty), clearTimeout(Qn), t.classList.remove("save-error"), t.title = "", e === "saving") {
    t.textContent = "保存中…";
    return;
  }
  if (e === "saved") {
    t.textContent = "保存済", Qn = setTimeout(B, 1500);
    return;
  }
  if (r.saveError) {
    t.textContent = "⚠️ 保存失敗", t.classList.add("save-error"), t.title = r.saveError.message;
    return;
  }
  t.textContent = r.dirty ? "● 未保存" : "";
}
async function Lt() {
  if (Gt || ue) return !1;
  for (; r.savePromise; ) await r.savePromise;
  if (!r.currentFile || ue) return !1;
  r.savePromise = ko();
  try {
    return await r.savePromise;
  } finally {
    r.savePromise = null;
  }
}
async function ko() {
  const e = r.currentFile, t = r.editor.getValue(), n = r.editor.getModel().getAlternativeVersionId(), s = !r.fsMap.has(e), i = R();
  let o = null;
  i && (Mt(), o = r.notes.map((d) => ({ ...d }))), clearTimeout(We), r.saving = !0, B("saving");
  const a = r.currentFile === e ? r.baseMtime : null;
  let c;
  try {
    c = await T("/api/file", { path: e, content: t, base_mtime: a });
  } catch (d) {
    const u = d instanceof ee ? d : new ee(String(d), 0);
    if (u.status === 409) {
      const f = await Lo(e, t);
      if (f) c = f;
      else
        return r.conflictDeclined = !0, r.saveError = new ee(
          "外部の変更があるため保存を見送りました（保存ボタン／Ctrl+S でもう一度判断できます）。",
          409
        ), B(), !1;
    } else
      return r.saveError = u, B(), !1;
  } finally {
    r.saving = !1;
  }
  if (r.currentFile === e && (r.baseMtime = c?.mtime ?? r.baseMtime), r.currentFile === e && (r.savedVersionId = n, zs()), s && await W(), i)
    try {
      await Mn(e, o);
    } catch (d) {
      return r.saveError = new ee(`本文は保存しましたが、付箋の保存に失敗しました: ${d.message}`, 0), B(), !0;
    }
  return r.saveError = null, r.conflictDeclined = !1, B("saved"), !0;
}
function Zt() {
  return r.conflictDeclined = !1, Lt();
}
const Co = 2e3;
let We = null;
function En() {
  clearTimeout(We), !(ge || ue) && R() && (r.conflictDeclined || !r.currentFile || !r.dirty || (We = setTimeout(() => {
    if (r.dirty) {
      if (r.saving) {
        En();
        return;
      }
      Lt();
    }
  }, Co)));
}
async function St() {
  clearTimeout(We), !ge && R() && (r.conflictDeclined || r.currentFile && r.dirty && await Lt());
}
async function Lo(e, t) {
  if (!confirm(
    `⚠️ ${e} は、開いた後に別の場所（他のエディタ・エージェント）で変更されています。

［OK］ この内容で上書きする
　　　相手の変更は 🕰 履歴 から元に戻せます。

［キャンセル］ 上書きしない
　　　手元の内容はエディタに残ります。相手の変更を見てから決められます。`
  )) return null;
  try {
    return await T("/api/file", { path: e, content: t, base_mtime: null, force: !0 });
  } catch (s) {
    return r.saveError = s instanceof ee ? s : new ee(String(s), 0), B(), null;
  }
}
const So = 15;
function Mo(e) {
  r.navRecent = [e, ...r.navRecent.filter((t) => t !== e)].slice(0, So);
}
function $o() {
  r.navBack.length = 0, r.navFwd.length = 0, r.navRecent.length = 0, Se();
}
function Se() {
  l("nav-back").disabled = !r.navBack.length, l("nav-fwd").disabled = !r.navFwd.length, l("recent-btn").disabled = r.navRecent.length < 2, l("history-btn").disabled = !r.currentFile;
  const e = r.navBack[r.navBack.length - 1];
  l("nav-back").title = e ? `戻る: ${e} (Alt+←)` : "戻る (Alt+←)";
  const t = r.navFwd[r.navFwd.length - 1];
  l("nav-fwd").title = t ? `進む: ${t} (Alt+→)` : "進む (Alt+→)";
}
async function Gs(e, t) {
  if (!t.length) return;
  const n = t[t.length - 1], s = r.currentFile;
  await ie(n, !1, "none"), r.currentFile === n && (t.pop(), s && e.push(s), Se());
}
const Xt = () => Gs(r.navFwd, r.navBack), Jt = () => Gs(r.navBack, r.navFwd);
function Qt() {
  const e = r.navRecent.filter((t) => t !== r.currentFile).map((t) => ({ label: t, title: t, onClick: () => ie(t) }));
  e.length && Ws(l("recent-btn"), [{ label: "最近開いたファイル" }, ...e]);
}
let Ue = null;
async function To() {
  r.currentFile && (Ue = null, l("hist-file").textContent = r.currentFile, l("hist-preview").textContent = "", l("hist-preview-head").textContent = "左の版を選ぶと内容が出ます。", l("hist-restore").disabled = !0, l("hist-modal").classList.remove("hidden"), await _o());
}
function at() {
  l("hist-modal").classList.add("hidden");
}
async function _o() {
  const e = r.currentFile, t = await z("/api/history?path=" + encodeURIComponent(e)), n = l("hist-list");
  if (n.innerHTML = "", !!t) {
    if (!t.enabled) {
      n.innerHTML = "<li class='hint'>ローカル履歴は設定で無効になっています（history_enabled）。</li>";
      return;
    }
    if (!t.versions.length) {
      n.innerHTML = "<li class='hint'>まだ履歴がありません。次に保存したときから残ります。</li>";
      return;
    }
    for (const s of t.versions) {
      const i = document.createElement("li"), o = document.createElement("span");
      o.textContent = Ys(s.saved_at);
      const a = document.createElement("span");
      a.className = "hint", a.textContent = `${s.size.toLocaleString()} B`, i.append(o, a), i.addEventListener("click", () => No(e, s, i)), n.appendChild(i);
    }
  }
}
function Ys(e) {
  if (!e) return "(不明)";
  const t = new Date(e);
  if (isNaN(t)) return e;
  const n = (s) => String(s).padStart(2, "0");
  return `${t.getMonth() + 1}/${t.getDate()} ${n(t.getHours())}:${n(t.getMinutes())}:${n(t.getSeconds())}`;
}
async function No(e, t, n) {
  for (const i of l("hist-list").children) i.classList.remove("active");
  n.classList.add("active"), Ue = t.id, l("hist-restore").disabled = !0, l("hist-preview-head").textContent = "読み込み中…";
  const s = await z(
    `/api/history/file?path=${encodeURIComponent(e)}&version_id=${encodeURIComponent(t.id)}`
  );
  !s || Ue !== t.id || (l("hist-preview").textContent = s.content, l("hist-preview-head").textContent = `${Ys(t.saved_at)} の内容`, l("hist-restore").disabled = !1);
}
async function Ro() {
  const e = r.currentFile;
  if (!(!e || !Ue) && confirm(`${e} をこの版に戻します。
今の内容も履歴に積まれるので、戻し間違えてもやり直せます。`)) {
    try {
      await T("/api/history/restore", { path: e, version_id: Ue });
    } catch (t) {
      alert("⚠️ 復元に失敗: " + t.message);
      return;
    }
    at(), await ie(e, !0, "none"), B("saved");
  }
}
let O = { favorites: [], recent: [], current: "" };
async function Zs() {
  const e = await z("/api/workspace/places");
  return e && (O = e), O;
}
const Xs = (e) => O.favorites.some((t) => Io(t.path, e)), Io = (e, t) => String(e || "").replace(/[\\/]+$/, "").toLowerCase() === String(t || "").replace(/[\\/]+$/, "").toLowerCase();
async function Ao() {
  await Zs();
  const e = [], t = (n, s) => n.map((i) => ({
    label: `${s} ${i.name}${i.exists ? "" : "（見つかりません）"}`,
    title: i.path,
    onClick: i.exists ? () => Nn(i.path) : void 0
  }));
  O.favorites.length && e.push({ label: "お気に入り" }, ...t(O.favorites, "⭐")), O.recent.length && e.push({ label: "最近使ったフォルダ" }, ...t(O.recent, "🕘")), e.push({ label: "フォルダを選ぶ…", onClick: an }), !O.favorites.length && !O.recent.length && e.unshift({ label: "行き先はまだありません（フォルダを移動すると溜まります）" }), Ws(l("places-btn"), e);
}
function Js() {
  const e = l("root-places");
  e.innerHTML = "";
  const t = (n, s, i, o) => {
    if (!s.length) return;
    const a = document.createElement("div");
    a.className = "places-head", a.textContent = n, e.appendChild(a);
    for (const c of s) {
      const d = document.createElement("div");
      d.className = "place-row", c.exists || d.classList.add("missing");
      const u = document.createElement("button");
      u.className = "place-go", u.textContent = `${i} ${c.name}`, u.title = c.exists ? `${c.path}（クリックでここへ移動）` : `${c.path}（見つかりません）`, u.disabled = !c.exists, u.addEventListener("click", () => Nn(c.path));
      const f = document.createElement("button");
      f.className = "place-mini", f.textContent = "開く", f.title = "移動せずに中を見る", f.disabled = !c.exists, f.addEventListener("click", () => Le(c.path));
      const w = document.createElement("button");
      w.className = "place-mini", w.textContent = o ? "★" : "☆", w.title = o ? "お気に入りから外す" : "お気に入りに入れる", w.addEventListener("click", () => Qs(c.path, c.name)), d.append(u, f, w), e.appendChild(d);
    }
  };
  t("⭐ お気に入り", O.favorites, "⭐", !0), t("🕘 最近使ったフォルダ", O.recent, "🕘", !1), !O.favorites.length && !O.recent.length && (e.innerHTML = "<div class='hint'>よく使うフォルダは ☆ ボタンでお気に入りに入れておくと、次からここに出ます。</div>");
}
async function Qs(e, t) {
  if (e) {
    try {
      Xs(e) ? O = await K(
        "/api/workspace/favorites?path=" + encodeURIComponent(e),
        { method: "DELETE" }
      ) : O = await T("/api/workspace/favorites", { path: e, name: t || "" });
    } catch (n) {
      alert("⚠️ " + n.message);
      return;
    }
    Js(), bn();
  }
}
function bn() {
  const e = l("root-input").value.trim(), t = l("root-fav-btn"), n = !!e && Xs(e);
  t.textContent = n ? "★" : "☆", t.title = n ? "お気に入りから外す" : "このフォルダをお気に入りに入れる", t.disabled = !e;
}
const Po = 150, Fo = 600;
let es = null, ei = 0;
const J = () => !l("preview").classList.contains("hidden"), Ze = () => r.currentFile && r.currentFile.includes("/") ? r.currentFile.slice(0, r.currentFile.lastIndexOf("/")) : "";
function Me() {
  const e = Ps(r.currentFile);
  l("preview-btn").disabled = !e, l("preview-btn").title = e ? "Markdown プレビューを表示 (Ctrl+Shift+P)" : "Markdown ファイル（.md）を開いているときだけ使えます";
  const t = l("richcopy-btn");
  t.disabled = !(e && J()), t.title = e && J() ? "プレビューの内容をリッチテキスト（HTML）とMarkdownでコピー。Confluence 等に貼り付け可" : "Markdown プレビュー表示中に使えます", !e && J() && li();
}
function ti() {
  const e = r.editor.getValue();
  let t = e, n = 0;
  const s = {};
  if (R() && r.features.mdflow && ws())
    try {
      const i = qi(e);
      if (t = i.body, n = (e.slice(0, i.bodyOffset).match(/\n/g) || []).length, i.mappings.length) {
        s.mdflow = { doc: i, conditions: r.mdflowConditions };
        const o = document.activeElement;
        o?.classList?.contains("mdflow-cond") && (s.mdflow.focus = {
          diagramId: o.closest(".mdflow-presets")?.dataset.diagram,
          selStart: o.selectionStart,
          selEnd: o.selectionEnd
        });
      }
    } catch {
    }
  return { text: t, opts: s, lineOffset: n };
}
function xn() {
  if (!J()) return;
  Br(Ze());
  const { text: e, opts: t, lineOffset: n } = ti();
  t.editable = !0, t.sourceMap = !0, gt = n;
  const s = performance.now(), i = Ke(l("preview"), e, t);
  ii(), Promise.resolve(i).then(() => {
    ei = performance.now() - s;
  });
}
function Do() {
  l("preview").addEventListener("click", (e) => {
    const t = e.target.closest(".mdflow-preset-item");
    if (!t) return;
    const n = t.closest(".mdflow-presets")?.dataset.diagram;
    if (!n) return;
    const s = t.dataset.preset || null, i = Qi(r.editor.getValue(), n, s);
    if (!i) return;
    const o = r.editor.getModel(), a = r.monaco.Range.fromPositions(
      o.getPositionAt(i.start),
      o.getPositionAt(i.end)
    );
    r.editor.executeEdits("mdflow-select", [{ range: a, text: i.text }]);
  }), l("preview").addEventListener("input", (e) => {
    const t = e.target.closest(".mdflow-cond");
    if (!t) return;
    const n = t.closest(".mdflow-presets")?.dataset.diagram;
    n && (r.mdflowConditions.set(n, t.value), ni());
  });
}
function ni() {
  if (!J()) return;
  clearTimeout(es);
  const e = Math.min(
    Fo,
    Math.max(Po, Math.round(ei))
  );
  es = setTimeout(xn, e);
}
const Oo = 120;
let mt = "", ts = null;
function kn(e) {
  mt = e, clearTimeout(ts), ts = setTimeout(() => {
    mt = "";
  }, Oo);
}
const Bo = 200;
let ht = !1, ns = null;
function si() {
  ht = !0, clearTimeout(ns), ns = setTimeout(() => {
    ht = !1;
  }, Bo);
}
function ii() {
  if (ht || !J() || mt === "preview") return;
  const e = r.editor, t = e.getScrollHeight() - e.getLayoutInfo().height, n = t > 0 ? e.getScrollTop() / t : 0, s = l("preview");
  kn("editor"), s.scrollTop = n * (s.scrollHeight - s.clientHeight);
}
function Ho() {
  if (ht || !J() || mt === "editor" || !r.editor) return;
  const e = l("preview"), t = e.scrollHeight - e.clientHeight, n = t > 0 ? e.scrollTop / t : 0, s = r.editor;
  kn("preview"), s.setScrollTop(n * Math.max(0, s.getScrollHeight() - s.getLayoutInfo().height));
}
const jo = 80, Wo = 300;
let gt = 0, ss = null;
function Uo() {
  const e = r.editor, t = e?.getModel();
  if (!e || !t) return;
  const n = J() ? qo(t) : null;
  if (!n) {
    Cn();
    return;
  }
  const s = [{ range: n.lineRange, options: { className: "preview-src-hl-line", isWholeLine: !0 } }];
  n.textRange && s.push({ range: n.textRange, options: { className: "preview-src-hl" } }), r.previewHl ? r.previewHl.set(s) : r.previewHl = e.createDecorationsCollection(s), oi(t, n.textRange), kn("preview"), e.revealRangeInCenterIfOutsideViewport(n.textRange || n.lineRange, 1);
}
function Cn() {
  r.previewHl?.clear?.(), r.previewHl = null, ae = null, document.getElementById("mark-btn")?.classList.add("hidden");
}
function qo(e) {
  const t = window.getSelection?.();
  if (!t || t.isCollapsed || !t.rangeCount) return null;
  const n = t.getRangeAt(0), s = l("preview");
  if (!s.contains(n.commonAncestorContainer)) return null;
  const i = s.querySelectorAll("[data-src-line]"), o = is(n.startContainer) || i[0], a = is(n.endContainer) || i[i.length - 1] || o;
  if (!o || !a) return null;
  const c = en(e, Number(o.dataset.srcLine) + gt), d = Math.max(c, en(e, Number(a.dataset.srcEnd) + gt));
  if (!c) return null;
  const u = new r.monaco.Range(c, 1, d, e.getLineMaxColumn(d)), f = zo(n), w = f ? f.textContent : t.toString(), m = Vo(e, n, w);
  if (m) return m;
  const h = ri(e.getValueInRange(u), w);
  let y = null;
  if (h) {
    const b = e.getOffsetAt({ lineNumber: c, column: 1 });
    y = r.monaco.Range.fromPositions(
      e.getPositionAt(b + h.start),
      e.getPositionAt(b + h.end)
    );
  }
  return { lineRange: u, textRange: y };
}
function oe(e, t) {
  return (e?.nodeType === Node.ELEMENT_NODE ? e : e?.parentElement)?.closest(t) || null;
}
const is = (e) => oe(e, "[data-src-line]");
function Vo(e, t, n) {
  const s = oe(t.startContainer, ".mermaid-box"), i = oe(t.endContainer, ".mermaid-box");
  if (!s || s !== i) return null;
  const o = s.__mermaidMeta;
  if (!o?.src) return null;
  const a = ln(o.src);
  if (!a.supported) return null;
  let c = null;
  const d = oe(t.startContainer, "g[id*='flowchart-']"), u = oe(t.endContainer, "g[id*='flowchart-']");
  if (d && d === u) {
    const I = nt(d.id, a.nodes), P = I ? a.nodes.get(I) : null;
    c = P?.def?.labelSpan || P?.firstRef?.span || null;
  }
  if (!c) {
    const I = oe(t.startContainer, ".edgeLabel"), P = oe(t.endContainer, ".edgeLabel");
    if (I && I === P) {
      const U = Ko(s, I), F = U ? st(U, a) : null;
      c = F != null ? a.edges[F]?.arrow?.labelSpan : null;
    }
  }
  if (!c) return null;
  const f = Number(s.dataset.srcLine) + gt, w = en(e, f + 1);
  if (!w) return null;
  const m = e.getOffsetAt({ lineNumber: w, column: 1 }), h = o.src.slice(c.start, c.end), y = ri(h, n), b = m + c.start + (y?.start || 0), x = m + c.start + (y?.end ?? h.length), v = r.monaco.Range.fromPositions(
    e.getPositionAt(b),
    e.getPositionAt(x)
  ), C = v.startLineNumber, M = v.endLineNumber;
  return { lineRange: new r.monaco.Range(C, 1, M, e.getLineMaxColumn(M)), textRange: v };
}
function Ko(e, t) {
  const n = t.getBoundingClientRect(), s = n.left + n.width / 2, i = n.top + n.height / 2;
  let o = null, a = 1 / 0;
  for (const c of e.querySelectorAll("path.flowchart-link"))
    try {
      const d = c.getTotalLength();
      if (!d) continue;
      const u = c.getPointAtLength(d / 2).matrixTransform(c.getScreenCTM()), f = (u.x - s) ** 2 + (u.y - i) ** 2;
      f < a && (a = f, o = c);
    } catch {
    }
  return a < 1600 ? o : null;
}
function zo(e) {
  const t = oe(e.startContainer, "mark");
  return t && t === oe(e.endContainer, "mark") ? t : null;
}
function en(e, t) {
  return Number.isFinite(t) ? Math.min(Math.max(1, t), e.getLineCount()) : 0;
}
function ri(e, t) {
  const n = t.replace(/\s+/g, " ").trim();
  if (!n) return null;
  const s = e.indexOf(n);
  if (s >= 0) return { start: s, end: s + n.length };
  if (n.length > Wo) return null;
  const i = "[*_`~\\\\]*", o = i + "\\s+" + i;
  let a = "", c = !0;
  for (const d of n) {
    if (d === " ") {
      a += o, c = !0;
      continue;
    }
    a += (c ? "" : i) + d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), c = !1;
  }
  try {
    const d = new RegExp(a).exec(e);
    return d ? { start: d.index, end: d.index + d[0].length } : null;
  } catch {
    return null;
  }
}
let ae = null;
function Go() {
  let e = document.getElementById("mark-btn");
  return e || (e = document.createElement("button"), e.id = "mark-btn", e.className = "hidden", e.title = "選択したところを Markdown の ==マーカー== で塗る (Ctrl+Shift+H)", e.addEventListener("mousedown", (t) => t.preventDefault()), e.addEventListener("click", ai), document.body.appendChild(e), e);
}
function oi(e, t) {
  const n = Go(), s = t ? Yo() : null;
  if (!s) {
    ae = null, n.classList.add("hidden");
    return;
  }
  ae = { range: t, marked: Xo(e, t) }, n.textContent = ae.marked ? "🖍 マーカーを消す" : "🖍 マーカー", n.classList.remove("hidden"), Zo(n, s);
}
function Yo() {
  const e = window.getSelection?.();
  if (!e?.rangeCount) return null;
  const t = e.getRangeAt(0).getBoundingClientRect();
  if (!t.width && !t.height) return null;
  const n = l("preview").getBoundingClientRect();
  return t.bottom < n.top || t.top > n.bottom ? null : t;
}
function Zo(e, t) {
  const n = t.top - e.offsetHeight - 6;
  e.style.top = `${n < 4 ? t.bottom + 6 : n}px`, e.style.left = `${Math.max(4, Math.min(t.left, window.innerWidth - e.offsetWidth - 4))}px`;
}
function Xo(e, t) {
  const n = r.monaco.Range, s = e.getValueInRange(new n(
    t.startLineNumber,
    Math.max(1, t.startColumn - 2),
    t.startLineNumber,
    t.startColumn
  )), i = e.getValueInRange(new n(
    t.endLineNumber,
    t.endColumn,
    t.endLineNumber,
    t.endColumn + 2
  ));
  return s === "==" && i === "==";
}
function ai() {
  const e = r.editor, t = e?.getModel();
  if (!ae || !t) return;
  const n = r.monaco.Range, { range: s, marked: i } = ae, o = i ? [
    { range: new n(s.startLineNumber, s.startColumn - 2, s.startLineNumber, s.startColumn), text: "" },
    { range: new n(s.endLineNumber, s.endColumn, s.endLineNumber, s.endColumn + 2), text: "" }
  ] : [
    { range: n.fromPositions(s.getStartPosition()), text: "==" },
    { range: n.fromPositions(s.getEndPosition()), text: "==" }
  ];
  e.executeEdits("mark", o), Cn();
}
function ci(e) {
  l("preview").classList.toggle("hidden", !e), l("preview-divider").classList.toggle("hidden", !e), l("preview-btn").classList.toggle("active", e), e ? fc() : (l("editor").style.flex = "", Cn()), r.editor?.layout(), Me();
}
function li() {
  ci(!1);
}
async function Jo(e, t) {
  const n = r.currentFile || "", s = bs(yt(n).replace(/\.[^.]+$/, "")), i = await T("/api/image", {
    note: n,
    name: `${s}-${t}`,
    ext: "png",
    data_b64: await ir(e),
    overwrite: !0
  });
  return await W(), i.path;
}
function tn() {
  if (Ps(r.currentFile)) {
    if (!Or()) {
      alert(`⚠️ Markdown プレビューを使うには、先に次を実行してください:
python -m pipenv run python scripts/fetch_markdown_it.py`);
      return;
    }
    if (J()) {
      li();
      return;
    }
    ci(!0), xn();
  }
}
function rs(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result)), s.onerror = () => n(new Error("画像データを読み込めませんでした")), s.readAsDataURL(e);
  });
}
function Qo(e) {
  const t = (n, s) => e.querySelectorAll(n).forEach((i) => Object.assign(i.style, s));
  t("table", { borderCollapse: "collapse" }), t("th, td", { border: "1px solid #9aa0a6", padding: "4px 8px" }), t("th", { background: "#f1f3f4" }), t("pre", {
    background: "#f6f8fa",
    padding: "8px",
    borderRadius: "6px",
    fontFamily: "Consolas, 'Cascadia Code', monospace",
    fontSize: "12px",
    whiteSpace: "pre-wrap"
  }), t("code", { fontFamily: "Consolas, 'Cascadia Code', monospace", fontSize: "0.92em" }), t("blockquote", {
    borderLeft: "3px solid #cccccc",
    margin: "8px 0",
    padding: "2px 12px",
    color: "#555555"
  }), t("img", { maxWidth: "100%" }), t("h1, h2, h3, h4", { margin: "12px 0 6px" });
}
async function ea(e) {
  const t = e.cloneNode(!0);
  t.querySelectorAll(".mermaid-tools, .mdflow-presets, .mdflow-mapping, .mdflow-note").forEach((n) => n.remove());
  for (const n of t.querySelectorAll(".mermaid-box")) {
    const s = n.querySelector("svg");
    if (s)
      try {
        const i = await xs(s, { background: Vt() }), o = document.createElement("img");
        o.src = await rs(i), o.style.maxWidth = "100%", n.replaceWith(o);
      } catch {
      }
  }
  for (const n of t.querySelectorAll("img")) {
    const s = n.getAttribute("src") || "";
    if (s.startsWith("/api/asset"))
      try {
        const i = await fetch(s);
        if (!i.ok) continue;
        n.src = await rs(await i.blob());
      } catch {
      }
  }
  return Qo(t), `<div>${t.innerHTML}</div>`;
}
let Ft = !1;
async function ta() {
  if (!J() || Ft) return;
  const e = l("richcopy-btn"), t = e.textContent;
  Ft = !0, e.disabled = !0, e.textContent = "⏳";
  try {
    const { text: n } = ti(), s = await ea(l("preview"));
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([s], { type: "text/html" }),
      "text/plain": new Blob([n], { type: "text/plain" })
    })]), e.textContent = "✓ コピー済";
  } catch (n) {
    e.textContent = t, alert("⚠️ コピーできませんでした: " + (n?.message || n));
  } finally {
    Ft = !1, setTimeout(() => {
      e.textContent = t, Me();
    }, 1500);
  }
}
let fe = null;
function na() {
  const e = r.editor.getModel(), t = e.getOffsetAt(r.editor.getSelection().getStartPosition()), n = e.getValue().slice(0, t).replace(/[ \t]+$/, "");
  return !n.trim() || /\n\s*\n\s*$/.test(n) ? "" : /\n\s*$/.test(n) ? `
` : `

`;
}
function sa() {
  const e = l("cf-modal"), t = l("cf-input"), n = l("cf-status"), s = (o) => {
    n.textContent = o || "";
  };
  l("cf-btn").addEventListener("click", () => {
    fe = null, t.value = "", s(rt() ? "Confluence（または任意のWebページ）でコピー（Ctrl+C）してから「クリップボードから読込」、または下の欄に Ctrl+V。" : "⚠ Turndown 未取得: python -m pipenv run python scripts/fetch_turndown.py を実行するとHTML→Markdown変換が有効になります（未取得でもテキストはそのまま挿入できます）。"), e.classList.remove("hidden"), t.focus();
  });
  const i = () => e.classList.add("hidden");
  l("cf-cancel").addEventListener("click", i), e.addEventListener("click", (o) => {
    o.target === e && i();
  }), t.addEventListener("paste", (o) => {
    const a = o.clipboardData?.getData("text/html");
    !a || !rt() || (o.preventDefault(), fe = a, t.value = o.clipboardData?.getData("text/plain") || "", s("✓ リッチテキスト（HTML）で取得しました。「変換して挿入」でMarkdownになります（下の欄は確認用。欄を手で編集するとHTML側を無視して欄の内容を挿入します）。"));
  }), l("cf-read-btn").addEventListener("click", async () => {
    try {
      const o = await navigator.clipboard.read();
      for (const a of o) {
        if (a.types.includes("text/html") && rt()) {
          fe = await (await a.getType("text/html")).text(), t.value = a.types.includes("text/plain") ? await (await a.getType("text/plain")).text() : "", s("✓ クリップボードのHTMLを取得しました。");
          return;
        }
        if (a.types.includes("text/plain")) {
          fe = null, t.value = await (await a.getType("text/plain")).text(), s("プレーンテキストとして取得しました（そのまま挿入されます）。");
          return;
        }
      }
      s("クリップボードが空です。");
    } catch (o) {
      s("⚠ 読み込めませんでした: " + (o?.message || o) + "。下の欄へ Ctrl+V なら直接取れます。");
    }
  }), t.addEventListener("input", () => {
    fe = null;
  }), l("cf-insert").addEventListener("click", () => {
    if (!r.currentFile) {
      alert("先に挿入先のファイルを開いてください。");
      return;
    }
    let o;
    try {
      o = fe != null ? eo(fe) : t.value;
    } catch (a) {
      alert("⚠ 変換に失敗しました: " + a.message);
      return;
    }
    if (!o.trim()) {
      s("貼り付ける内容がありません。");
      return;
    }
    r.editor.executeEdits("confluence-paste", [{
      range: r.editor.getSelection(),
      text: na() + o.replace(/\s+$/, "") + `
`
    }]), r.editor.focus(), i();
  });
}
function ia(e, t) {
  r.diagramEditing?.dispose?.();
  const n = { src: t.src, index: t.index, box: e, restore: null, dispose: null };
  r.diagramEditing = n, n.dispose = Wt(e, t, nn(), null);
}
function ra() {
  r.diagramEditing?.dispose?.(), r.diagramEditing = null;
}
function oa(e, t, n = !1) {
  const s = r.diagramEditing;
  if (s) {
    if (n) {
      if (s.box !== e) return;
      s.index = t.index, e.querySelector(":scope > .mermaid-editbar") || (s.dispose?.(), s.dispose = Wt(e, t, nn(), s.restore));
      return;
    }
    s.index === t.index && (s.src !== t.src && (s.src = t.src, s.restore = null), s.dispose?.(), s.box = e, s.dispose = Wt(e, t, nn(), s.restore), s.restore && (s.restore = { ...s.restore, editNodeId: null }));
  }
}
function nn() {
  return {
    applyEdits(e, t, n = null) {
      const s = r.editor, i = s.getModel(), o = r.diagramEditing, a = Ts(i.getValue(), e, o?.index ?? 0);
      if (!a)
        return r.diagramEditing?.dispose?.(), r.diagramEditing = null, alert("⚠️ 図の位置を特定できませんでした（プレビューとエディタの内容が食い違っています）。編集モードを終了します。ファイルを開き直すと直ります。"), !1;
      const c = Rr(e, t), d = t.map((u) => ({
        range: r.monaco.Range.fromPositions(
          i.getPositionAt(a.start + a.toRaw(u.start)),
          i.getPositionAt(a.start + a.toRaw(u.end))
        ),
        // 字下げされたフェンス（リストの中の図など）は markdown-it が字下げを削って
        // 図に渡すので、書き戻す行にはその分を足し直す。newSrc は字下げ前のまま
        // 計算する（次の描画で来る meta.src と比べるのはそちら）。
        text: a.indent ? u.text.split(`
`).join(`
` + a.indent) : u.text
      }));
      return s.pushUndoStop(), s.executeEdits("mermaid-edit", d), s.pushUndoStop(), r.diagramEditing = {
        src: c,
        index: o?.index ?? 0,
        box: o?.box ?? null,
        restore: n,
        dispose: o?.dispose ?? null
      }, !0;
    },
    // 図の上での Ctrl+Z / Ctrl+Y。エディタにフォーカスが無くても効かせる。
    undo() {
      r.editor?.trigger("mermaid-edit", "undo", null);
    },
    redo() {
      r.editor?.trigger("mermaid-edit", "redo", null);
    },
    // 図で選択した要素に対応する Markdown を、エディタ側で反転表示してそこまでスクロールする
    // （「この図形はソースのどこ？」を探させない）。null で消す。
    reveal(e) {
      os(e);
    },
    onExit() {
      os(null), r.diagramEditing = null;
    }
  };
}
function os(e) {
  const t = r.editor, n = t?.getModel();
  if (!t || !n) return;
  const s = () => {
    r.diagramHl?.clear?.(), r.diagramHl = null;
  };
  if (!e) {
    s();
    return;
  }
  const i = r.diagramEditing, o = i ? Ts(n.getValue(), i.src, i.index ?? 0) : null;
  if (!o) {
    s();
    return;
  }
  const a = (f) => f ? r.monaco.Range.fromPositions(
    n.getPositionAt(o.start + o.toRaw(f.start)),
    n.getPositionAt(o.start + o.toRaw(f.end))
  ) : null, c = a(e.line), d = a(e.focus), u = [];
  if (c && u.push({ range: c, options: { className: "mermaid-src-hl-line", isWholeLine: !0 } }), d && u.push({ range: d, options: { className: "mermaid-src-hl" } }), !u.length) {
    s();
    return;
  }
  r.diagramHl ? r.diagramHl.set(u) : r.diagramHl = t.createDecorationsCollection(u), t.revealRangeInCenterIfOutsideViewport(
    d || c,
    0
    /* Smooth */
  );
}
let sn = null, ve = 0, ne = [];
function aa() {
  clearTimeout(sn), ve++, ne = [], Y(), sn = setTimeout(() => Ln(l("file-search").value), 250);
}
function ca() {
  ve++, clearTimeout(sn), l("file-search").value = "", ne = [], l("search-results").classList.add("hidden"), l("search-results").innerHTML = "", l("search-opts").classList.add("hidden"), l("replace-bar").classList.add("hidden"), l("replace-preview").innerHTML = "", l("replace-status").textContent = "", l("file-list").classList.remove("hidden");
}
async function Ln(e) {
  const t = ++ve, n = V, s = l("search-case").checked;
  ne = [], Y();
  const i = l("search-results"), o = l("file-list");
  if (!e.trim()) {
    ne = [], i.classList.add("hidden"), l("search-opts").classList.add("hidden"), l("replace-bar").classList.add("hidden"), o.classList.remove("hidden");
    return;
  }
  const a = new URLSearchParams({ q: e, case: s ? "true" : "false" }), c = await z("/api/search?" + a);
  if (!(!c || t !== ve || n !== V || e !== l("file-search").value || s !== l("search-case").checked)) {
    ne = [...new Set(c.results.map((d) => d.path))], i.innerHTML = "";
    for (const d of c.results) i.appendChild(la(d));
    c.results.length || (i.innerHTML = "<div class='hint'>該当なし</div>"), l("search-opts").classList.remove("hidden"), Y(), o.classList.add("hidden"), i.classList.remove("hidden");
  }
}
function la(e) {
  const t = document.createElement("div");
  t.className = "search-hit";
  const n = document.createElement("div");
  n.className = "loc", n.textContent = `${e.path}:${e.line}`, t.appendChild(n);
  const s = document.createElement("pre");
  s.className = "hit-body";
  const i = (o, a) => {
    const c = document.createElement("span");
    c.className = a, c.textContent = o === "" ? " " : o, s.appendChild(c);
  };
  for (const o of e.before || []) i(o, "ctx");
  i(e.text, "hit-line");
  for (const o of e.after || []) i(o, "ctx");
  return t.appendChild(s), t.addEventListener("click", async () => {
    await ie(e.path), r.editor.revealLineInCenter(e.line), r.editor.setPosition({ lineNumber: e.line, column: 1 }), r.editor.focus();
  }), t;
}
function da() {
  const e = l("replace-bar");
  e.classList.toggle("hidden"), e.classList.contains("hidden") || (Y(), l("replace-input").focus());
}
function Y(e) {
  l("replace-status").textContent = e !== void 0 ? e : `対象: ヒットした ${ne.length} ファイル`;
  const t = !ne.length || ge;
  l("replace-preview-btn").disabled = t, l("replace-run-btn").disabled = t;
}
async function Dt(e) {
  if (ge || ue) return;
  const t = l("file-search").value, n = l("replace-input").value, s = [...ne], i = l("search-case").checked, o = V, a = ve;
  if (!(!t.trim() || !ne.length) && !(!e && !confirm(
    `${ne.length} ファイルの「${t}」を「${n}」に置き換えます。

置換前の内容は 🕰 履歴 に残るので元に戻せます。実行しますか？`
  ))) {
    ge = !0, clearTimeout(We);
    try {
      if (!e && s.includes(r.currentFile)) {
        const h = r.currentFile;
        if (!(!r.dirty || await Lt()) || r.dirty || r.currentFile !== h) {
          Y("⚠️ 未保存の編集を保存できないため、置換を中止しました。");
          return;
        }
      }
      if (o !== V || a !== ve) {
        Y("検索対象が変わったため、置換を中止しました。");
        return;
      }
      const c = r.currentFile, d = r.editor.getModel(), u = d.getVersionId();
      Y(e ? "確認中…" : "置換中…");
      let f;
      try {
        Gt = !e, f = await T("/api/search/replace", {
          query: t,
          replace: n,
          paths: s,
          case: i,
          dry_run: e
        });
      } catch (h) {
        Y("⚠️ " + h.message);
        return;
      }
      ua(f);
      const w = f.total === 0 ? "置き換わる箇所がありません" : e ? `${f.changed_files} ファイル / ${f.total} 箇所が置き換わります` : `✓ ${f.changed_files} ファイル / ${f.total} 箇所を置換しました（🕰 履歴 から戻せます）`;
      if (e) {
        Y(w);
        return;
      }
      const m = f.files.map((h) => h.path);
      r.currentFile && m.includes(r.currentFile) && (!r.dirty && r.currentFile === c && r.editor.getModel() === d && d.getVersionId() === u && await ie(r.currentFile, !0, "none"), r.dirty && (r.conflictDeclined = !0, r.saveError = new ee("ディスクを置換しました。処理中の編集は保持しています。保存前に履歴で変更を確認してください。", 409), B())), await Ln(l("file-search").value), Y(w);
    } finally {
      Gt = !1, ge = !1, Y(l("replace-status").textContent), En();
    }
  }
}
function ua(e) {
  const t = l("replace-preview");
  t.innerHTML = "";
  for (const n of e.files) {
    const s = document.createElement("div");
    s.className = "rp-file", s.textContent = `${n.path}（${n.count} 箇所）`, t.appendChild(s);
    for (const i of n.samples) {
      const o = document.createElement("div");
      o.className = "rp-row";
      const a = document.createElement("div");
      a.className = "rp-before", a.textContent = `- ${i.before}`;
      const c = document.createElement("div");
      c.className = "rp-after", c.textContent = `+ ${i.after}`, o.append(a, c), t.appendChild(o);
    }
  }
}
function wt() {
  if (!r.editor) return "";
  const e = r.editor.getSelection();
  return r.editor.getModel().getValueInRange(e);
}
function fa() {
  return R() ? "テキストを選択してAIに送れます" : Ge() ? "計画モード：エージェントは調査だけを行い、ファイルは変更しません。" : "エージェントがファイルを直接編集します（破壊操作は承認制）。";
}
function di() {
  const e = wt().trim().length > 0;
  l("sel-chip").classList.toggle("hidden", !e), l("sel-info").textContent = e ? "選択中：AIに送れます" : fa();
}
async function Sn() {
  if (!r.currentFile) {
    r.notes = [], vt();
    return;
  }
  const e = await z("/api/notes?path=" + encodeURIComponent(r.currentFile));
  r.notes = e ? e.notes || [] : [], vt();
}
async function Mn(e = r.currentFile, t) {
  e && (t == null && (Mt(), t = r.notes), await K("/api/notes?path=" + encodeURIComponent(e), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t)
  }));
}
function Mt() {
  r.noteDecorations && r.notes.forEach((e, t) => {
    const n = r.noteDecorations.getRange(t);
    n && (e.line = n.startLineNumber);
  });
}
function vt() {
  const e = r.monaco, t = r.notes.map((n) => ({
    range: new e.Range(n.line, 1, n.line, 1),
    options: {
      isWholeLine: !0,
      glyphMarginClassName: "pixie-note-glyph",
      className: "pixie-note-line",
      glyphMarginHoverMessage: { value: n.text }
    }
  }));
  r.noteDecorations.set(t);
}
function pa() {
  Mt();
  const e = r.editor.getPosition().lineNumber, t = prompt("付箋メモ（例: ここをAIに膨らませてもらう）");
  t && (r.notes = r.notes.filter((n) => n.line !== e), r.notes.push({ line: e, text: t }), vt(), Mn().catch((n) => alert("⚠️ 付箋の保存に失敗しました: " + n.message)));
}
function ma(e) {
  Mt();
  const t = r.notes.find((s) => s.line === e), n = prompt("付箋メモ（空で削除）", t ? t.text : "");
  n !== null && (r.notes = r.notes.filter((s) => s.line !== e), n.trim() && r.notes.push({ line: e, text: n }), vt(), Mn().catch((s) => alert("⚠️ 付箋の保存に失敗しました: " + s.message)));
}
const ha = /* @__PURE__ */ new Set(
  ["md", "markdown", "txt", "py", "json", "yaml", "yml", "toml", "csv", "html", "css", "js", "ts"]
), de = (e) => (e.external ? "E:" : "I:") + e.path, yt = (e) => e.split(/[\\/]/).pop(), rn = (e) => ha.has(xt(e.path)), ui = (e) => fn(e.path);
async function $n() {
  if (!r.currentFile) {
    r.refs = [], qe();
    return;
  }
  const e = await z("/api/refs?path=" + encodeURIComponent(r.currentFile));
  r.refs = e ? e.refs || [] : [];
  const t = new Set(r.refs.map(de));
  for (const n of [...r.checkedRefs]) t.has(n) || r.checkedRefs.delete(n);
  qe();
}
async function fi() {
  r.currentFile && await z("/api/refs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: r.currentFile, refs: r.refs })
  });
}
async function on(e) {
  if (!r.currentFile) {
    alert("先にファイルを開いてください。");
    return;
  }
  r.refs.some((t) => de(t) === de(e)) || (r.refs.push(e), await fi(), qe());
}
async function ga(e) {
  const [t] = r.refs.splice(e, 1);
  t && r.checkedRefs.delete(de(t)), await fi(), qe();
}
async function wa(e) {
  try {
    await T(
      "/api/refs/open",
      { note: r.currentFile, path: e.path, external: !!e.external }
    );
  } catch (t) {
    alert("⚠️ 開けませんでした: " + t.message);
  }
}
function qe() {
  const e = l("ref-list"), t = l("ref-empty");
  if (e.innerHTML = "", !r.currentFile) {
    t.textContent = "ファイルを開くと関連ファイルを紐付けられます。", t.classList.remove("hidden");
    return;
  }
  if (!r.refs.length) {
    t.textContent = "ここにファイルをドラッグ、または「＋参照を追加」で紐付けます。", t.classList.remove("hidden");
    return;
  }
  t.classList.add("hidden"), r.refs.forEach((n, s) => {
    const i = document.createElement("li"), o = document.createElement("input");
    o.type = "checkbox", o.title = rn(n) ? "AIコンテキストに含める" : ui(n) ? "AIコンテキストに含める（サーバでテキスト抽出して同梱。/copilot では原本を Copilot に添付）" : "AIコンテキストに含める（この形式は Copilot 添付経路のみ有効）", o.checked = r.checkedRefs.has(de(n)), o.addEventListener("click", (u) => u.stopPropagation()), o.addEventListener("change", () => {
      o.checked ? r.checkedRefs.add(de(n)) : r.checkedRefs.delete(de(n));
    });
    const a = document.createElement("span");
    a.textContent = n.external ? "外部" : "";
    const c = document.createElement("span");
    c.className = "fname", c.textContent = n.name || yt(n.path), c.title = n.path + "（クリックで既定アプリで開く）", c.addEventListener("click", () => wa(n));
    const d = document.createElement("button");
    d.className = "ref-del", d.textContent = "×", d.title = "参照を外す", d.addEventListener("click", (u) => {
      u.stopPropagation(), ga(s);
    }), i.append(o, a, c, d), e.appendChild(i);
  });
}
function va(e) {
  const t = (e || "").split(/\r?\n/).find((s) => s && !s.startsWith("#"));
  if (!t || !/^file:/i.test(t)) return null;
  let n = decodeURIComponent(t.replace(/^file:\/\//i, ""));
  return /^\/[A-Za-z]:/.test(n) && (n = n.slice(1)), n.replace(/\\/g, "/");
}
function ya() {
  const e = l("refmgr");
  e.addEventListener("dragover", (t) => {
    t.preventDefault(), t.dataTransfer.dropEffect = "copy", e.classList.add("ref-drop");
  }), e.addEventListener("dragleave", (t) => {
    e.contains(t.relatedTarget) || e.classList.remove("ref-drop");
  }), e.addEventListener("drop", async (t) => {
    if (t.preventDefault(), t.stopPropagation(), e.classList.remove("ref-drop"), !r.currentFile) {
      alert("先にファイルを開いてください。");
      return;
    }
    if (te) {
      const s = r.fsMap.get(te);
      s && s.type === "file" ? await on({ path: te, external: !1, name: yt(te) }) : alert("フォルダは参照に追加できません。ファイルをドラッグしてください。");
      return;
    }
    const n = va(t.dataTransfer.getData("text/uri-list") || t.dataTransfer.getData("text/plain"));
    if (n) {
      await on({ path: n, external: !0, name: yt(n) });
      return;
    }
    t.dataTransfer.files && t.dataTransfer.files.length && alert(`ブラウザの制限でドラッグしたファイルの絶対パスを取得できません。
外部ファイルは「＋参照を追加」から選んでください。`);
  });
}
async function De(e) {
  const t = await z("/api/workspace/dirs?files=true&path=" + encodeURIComponent(e || ""));
  if (!t) return;
  l("pick-input").value = t.cwd || "";
  const n = l("pick-drives");
  n.innerHTML = "";
  for (const i of t.drives || []) {
    const o = document.createElement("button");
    o.textContent = i, o.classList.toggle("active", (t.cwd || "").toLowerCase().startsWith(i.toLowerCase().slice(0, 2))), o.addEventListener("click", () => De(i)), n.appendChild(o);
  }
  const s = l("pick-list");
  if (s.innerHTML = "", t.parent && t.parent !== t.cwd) {
    const i = document.createElement("li");
    i.textContent = "⬆ ..（上のフォルダへ）", i.addEventListener("click", () => De(t.parent)), s.appendChild(i);
  }
  for (const i of t.dirs || []) {
    const o = document.createElement("li");
    o.textContent = i.name, o.addEventListener("click", () => De(i.path)), s.appendChild(o);
  }
  for (const i of t.files || []) {
    const o = document.createElement("li");
    o.className = "pick-file", o.textContent = i.name, o.addEventListener("click", async () => {
      await on({ path: i.path.replace(/\\/g, "/"), external: !0, name: i.name }), ct();
    }), s.appendChild(o);
  }
}
function Ea() {
  if (!r.currentFile) {
    alert("先にファイルを開いてください。");
    return;
  }
  l("pick-modal").classList.remove("hidden"), De(l("root-path").textContent || "");
}
function ct() {
  l("pick-modal").classList.add("hidden");
}
const pi = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg"
};
function as(e) {
  for (const t of e?.files || [])
    if (t.type in pi) return t;
  return null;
}
function ba(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result).split(",", 2)[1] || ""), s.onerror = () => n(new Error("画像を読み込めませんでした")), s.readAsDataURL(e);
  });
}
async function cs(e) {
  if (!r.currentFile) {
    alert("⚠️ 画像を貼るには、先にファイルを開いて（または保存して）ください。");
    return;
  }
  let t;
  try {
    t = await T("/api/image", {
      note: r.currentFile,
      ext: pi[e.type],
      name: e.name || "",
      // D&D は元名を引き継ぐ。クリップボードは名前が無いので日時
      data_b64: await ba(e)
    });
  } catch (s) {
    alert("⚠️ 画像を保存できませんでした: " + s.message);
    return;
  }
  const n = t.rel.split("/").pop().replace(/\.[^.]+$/, "");
  r.editor.executeEdits("insert-image", [
    { range: r.editor.getSelection(), text: `![${n}](${t.rel})` }
  ]), r.editor.focus(), await W();
}
const xa = {
  prefill: (e) => `応答を待っています（prefill 中… ${e}s）`,
  thinking: (e) => `思考中… ${e}s`,
  generating: (e) => `ツール呼び出しを生成中… ${e}s`,
  tool: (e) => `ツールを実行中… ${e}s`,
  verify: (e) => `結果を検証中… ${e}s`
};
function ka(e) {
  let t = "", n = "prefill", s = performance.now();
  const i = document.createElement("div");
  i.className = "wait-indicator", i.innerHTML = '<span class="dots"><i></i><i></i><i></i></span><span class="wait-text"></span>';
  const o = i.querySelector(".wait-text"), a = () => {
    i.isConnected || e.insertBefore(i, e.querySelector(".body"));
  }, c = () => {
    if (!i.isConnected) return;
    const h = ((performance.now() - s) / 1e3).toFixed(1), y = xa[n] || ((b) => `${n}… ${b}s`);
    o.textContent = y(h);
  }, d = (h) => {
    h !== n && (n = h, s = performance.now()), a(), c(), X();
  }, u = performance.now();
  let f = null;
  const w = (h, y = !1) => {
    if (!h.trim()) return;
    f || (f = document.createElement("details"), f.className = "think-box", f.innerHTML = '<summary></summary><div class="think-body"></div>', e.insertBefore(f, e.querySelector(".body")));
    const b = ((performance.now() - u) / 1e3).toFixed(1);
    f.querySelector("summary").textContent = y ? `💭 思考ログ（${h.length}文字・${b}s）` : "💭 思考中…", f.querySelector(".think-body").textContent = h, y && (f.open = !1);
  };
  a(), c();
  const m = setInterval(() => {
    c(), X();
  }, 200);
  return {
    onToken(h) {
      t += h, i.remove();
      const { think: y, visible: b } = zt(t);
      w(y), Ns(e.querySelector(".body"), b), X();
    },
    /** エンジンのインジケータ（⏳ Prefill / 🧠 Thinking...）を待機表示のフェーズに反映する。 */
    setPhase: d,
    finish() {
      clearInterval(m), i.remove();
      const { think: h, visible: y } = zt(t);
      return w(h, !0), y.trim() && Ke(e.querySelector(".body"), y, { assetBase: Ze() }), y;
    }
  };
}
const Ca = [
  ["generating", ["Generating tool call"]],
  ["thinking", ["🧠", "Thinking..."]],
  ["prefill", ["⏳", "Prefill"]]
];
function La(e) {
  for (const [t, n] of Ca)
    if (n.some((s) => e.includes(s))) return t;
  return null;
}
async function Sa(e, t) {
  const n = wt(), s = [], i = [];
  for (const a of [...r.checkedFiles]) {
    let c = null;
    try {
      c = await K("/api/file?path=" + encodeURIComponent(a), { signal: t });
    } catch (d) {
      if (t?.aborted) throw d;
      if (alert("⚠️ " + d.message), d.status === 423) continue;
    }
    c && c.content != null && i.push({ path: a, content: c.content }), fn(a) && s.push(a);
  }
  const o = [];
  if (r.currentFile)
    for (let a = 0; a < r.refs.length; a++) {
      const c = r.refs[a];
      if (r.checkedRefs.has(de(c))) {
        if (rn(c) || ui(c)) {
          let d = null;
          try {
            d = await K(
              `/api/refs/read?note=${encodeURIComponent(r.currentFile)}&idx=${a}`,
              { signal: t }
            );
          } catch (u) {
            if (t?.aborted) throw u;
            if (alert("⚠️ " + u.message), u.status === 423) continue;
          }
          d && d.content != null && o.push({ path: c.path, content: d.content });
        }
        rn(c) || s.push(c.path);
      }
    }
  return {
    message: e,
    session_id: r.sessionId,
    // Note は単一セッション（サーバは無視するが契約上送る）
    selection: n,
    context_files: i,
    ref_texts: o,
    // ツリーでチェックしたファイルが 📎 関連ファイルにも登録されていると、同じパスが
    // 2回入って Copilot に二重アップロードされる。送る直前に一意化する。
    attach_files: [...new Set(s)],
    history: r.history,
    // 「このファイル」が指せるよう、開いているファイルを常に添える。
    // 未保存の編集も含めたいのでディスクではなくエディタの内容を送る。
    current_file: r.currentFile || "",
    current_content: r.currentFile ? r.editor.getValue() : ""
  };
}
const mi = {
  "/compact": "会話を要約して文脈を畳む。`/compact 認証まわり` のように残したい焦点を足せる",
  "/copilot": "エージェントが質問文を組み立てて Copilot に聞き、回答を精査して反映する",
  "/copilot_simple": "ローカル LLM を経由せず、打った文をそのまま Copilot へ1回質問する（選択範囲・チェック済みファイルは同梱、関連ファイルは添付される）",
  // 従来名。/copilot_simple と完全に同じ処理へ入る（サーバの COPILOT_DIRECT_COMMANDS）。
  "/copilot!": "`/copilot_simple` の別名（同じ動作）"
}, Tn = {
  "/help": { desc: "使えるコマンドの一覧を出す", run: () => $a() },
  "/context": { desc: "いまの文脈の量（メッセージ数・概算文字数）を見る", run: () => Ta() },
  "/undo": { desc: "直前の往復を削除する（🗑 と同じ）", run: () => _a() },
  "/clear": { desc: "会話をリセットする（Note は保存履歴も消す）", run: () => Na() },
  "/code": { desc: "Code モードへ切り替える", run: () => Ot("code") },
  "/note": { desc: "Note モードへ切り替える", run: () => Ot("note") },
  "/plan": { desc: "Plan モードへ切り替える", run: () => Ot("plan") }
};
async function Ot(e) {
  if (r.mode === e) {
    $("system", `既に ${He[e]} モードです。`);
    return;
  }
  await hn(e);
}
async function Ma(e) {
  const t = /^(\/\S+)(?:\s+([\s\S]*))?$/.exec(e);
  if (!t) return !1;
  const n = t[1].toLowerCase();
  if (n in mi) return !1;
  const s = Tn[n];
  return s ? ($("user", e), await s.run((t[2] || "").trim()), !0) : !1;
}
function $a() {
  const e = [
    ...Object.entries(mi),
    ...Object.entries(Tn).map(([t, n]) => [t, n.desc])
  ].map(([t, n]) => `| \`${t}\` | ${n} |`);
  $("assistant", [
    "### 使えるコマンド",
    "",
    "| コマンド | 説明 |",
    "|---|---|",
    ...e,
    "",
    "各返信の右上に出る 🗑 でも、その往復だけを文脈から消せます（回答が不要だったやりとりを残さないほど、続きの精度が保てます）。"
  ].join(`
`));
}
async function Ta() {
  let e;
  try {
    e = await se("/api/context?session_id=" + encodeURIComponent(r.sessionId));
  } catch (n) {
    $("error", "⚠ 文脈を取得できません: " + n.message);
    return;
  }
  if (!e.supported) {
    $("assistant", "このエンジンでは文脈量を測れません（pixie_core API 1.6 以上が必要です）。");
    return;
  }
  const t = [
    `### 🧠 いまの文脈（${He[e.mode] || e.mode} モード）`,
    "",
    `- メッセージ: **${e.messages}** 件`,
    `- 分量: **約 ${e.chars.toLocaleString()} 文字**`,
    `- モデル: ${e.model || "(未設定)"}`
  ];
  if (e.turns?.length) {
    const n = [...e.turns].sort((s, i) => i.chars - s.chars).slice(0, 5);
    t.push(
      "",
      "文脈を食っている往復（上位5件）:",
      "",
      "| 往復 | 分量 |",
      "|---|---|",
      ...n.map((s) => `| ${s.label || "(無題)"} | 約 ${s.chars.toLocaleString()} 文字 |`),
      "",
      "要らない往復は 🗑 で消せます。全体を畳むなら `/compact`。"
    );
  }
  $("assistant", t.join(`
`));
}
function _a() {
  const t = [...l("messages").children].reverse().find((s) => s.classList.contains("assistant") && s._exchange);
  if (!t) {
    $("system", "消せる往復がありません。");
    return;
  }
  const n = t.querySelector(".msg-del");
  n && n.click();
}
async function Na() {
  if (r.streaming) {
    alert("⚠️ 応答の生成中はリセットできません。");
    return;
  }
  const e = R() ? `
（保存されている会話履歴も消えます）` : "";
  if (!confirm("この会話をリセットしますか？" + e)) return;
  const t = L.begin("switching");
  if (!t) return;
  let n = "";
  try {
    try {
      await T("/api/session/clear", { session_id: r.sessionId });
    } catch (s) {
      n = s.message, alert("⚠️ リセットできません: " + s.message);
      return;
    }
    if (R())
      try {
        await K("/api/chat/history", { method: "DELETE" }), r.history = [], r.historyLoaded = !0;
      } catch (s) {
        n = s.message, alert("⚠️ 保存履歴を消せませんでした: " + s.message);
      }
    l("messages").innerHTML = "", r.assistantEl = null, r.sessionId = ze(), $e(), $("system", "🧹 会話をリセットしました。");
  } catch (s) {
    return n = s.message, alert(s.message), !1;
  } finally {
    L.finish(t, n);
  }
}
async function Ve() {
  if (!Di.ready || r.streaming) return;
  const e = l("chat-input"), t = e.value.trim();
  if (!t) return;
  const n = t.split(/\s/, 1)[0].toLowerCase();
  if (Object.hasOwn(Tn, n)) {
    await Ma(t) && (e.value = "");
    return;
  }
  const s = L.begin();
  if (!s) return;
  let i = "";
  try {
    const o = R(), a = Ge(), c = Pe() && r.codeStyle === "plan" && !r.planExecNext;
    r.planExecNext = !1;
    const d = o ? Ka() : null;
    let u;
    if (o)
      u = await Sa(t, s.controller.signal);
    else if (a) {
      const b = [];
      for (const x of [...r.checkedFiles]) {
        const v = await K("/api/file?path=" + encodeURIComponent(x), { signal: s.controller.signal });
        v && v.content != null && b.push({ path: x, content: v.content });
      }
      u = {
        message: t,
        session_id: r.sessionId,
        selection: wt(),
        current_file: r.currentFile || "",
        current_content: r.currentFile ? r.editor.getValue() : "",
        context_files: b
      };
    } else {
      const b = [];
      for (const x of [...r.checkedFiles]) {
        const v = await K("/api/file?path=" + encodeURIComponent(x), { signal: s.controller.signal });
        v && v.content != null && b.push({ path: x, content: v.content });
      }
      u = {
        message: t,
        session_id: r.sessionId,
        current_file: r.currentFile,
        current_content: r.currentFile ? r.editor.getValue() : "",
        selection: wt(),
        plan_first: c
      }, b.length && (u.context_files = b);
    }
    if (s.controller.signal.aborted || !L.current(s)) return;
    u.session_id = s.sessionId, e.value = "";
    const f = $("user", t);
    r.changedPaths.size && (r.changedPaths.clear(), Ye()), r.assistantEl = $("assistant", ""), r.turnId = 0, r.compacted = null, r.assistantEl._exchange = { userEl: f, userText: t }, r.assistantUi = ka(r.assistantEl);
    try {
      const b = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(u),
        signal: s.controller.signal
      });
      if (!b.ok) {
        const x = await b.json().catch(() => ({}));
        throw new Error(x.detail || `HTTP ${b.status}`);
      }
      L.phase(s, "running"), await Oi(b, s, L.current, async (x) => {
        L.current(s) && (x.type === "approval" && L.phase(s, "approval"), await Fa(x));
      });
    } catch (b) {
      s.controller.signal.aborted || (i = b.message, D(r.assistantEl, "⚠️ 実行失敗: " + b.message));
    }
    if (!L.current(s)) return;
    const w = s.controller.signal.aborted || s.outcome === "cancelled" || !!i, m = r.assistantEl, h = r.turnId, y = ls();
    o ? Pa(m, t, y, d, w) : (a || c) && !w && Aa(y), Pe() && !w && ja(t, y), r.compacted && m?.isConnected ? Ra(m, r.compacted) : m?.isConnected && (Is(m, () => hi(m, h)), Pe() && h && so(m, () => Ha(h)));
  } catch (o) {
    s.controller.signal.aborted || (i = o.message, $("error", o.message));
  } finally {
    await s.interruption, L.current(s) && (r.assistantUi && ls(), l("approval").classList.add("hidden"), l("approval").innerHTML = "", ye.length && ce(), L.finish(s, i));
  }
}
async function hi(e, t) {
  if (r.streaming) {
    alert("⚠️ 応答の生成中は削除できません。");
    return;
  }
  const n = e?._exchange, s = (n?.userText || "").replace(/\s+/g, " ").slice(0, 40);
  if (!confirm(`この往復を削除しますか？
「${s}${s.length >= 40 ? "…" : ""}」
（表示だけでなく AI の文脈からも消えます）`)) return;
  let i = !0;
  if (t)
    try {
      i = !!(await T(
        "/api/chat/turn/delete",
        { session_id: r.sessionId, turn_id: t }
      )).ok;
    } catch {
      i = !1;
    }
  if (R()) {
    const o = r.history.findIndex((a) => a.role === "user" && a.content === n?.userText);
    if (o >= 0) {
      const a = r.history[o + 1]?.role === "assistant" ? 2 : 1;
      r.history.splice(o, a), await wn();
    }
    if (!t)
      try {
        await T("/api/session/clear", { session_id: r.sessionId });
      } catch {
        i = !1;
      }
  }
  n?.userEl?.remove(), e.remove(), i || $("system", "⚠️ 表示からは消しましたが、AI の文脈からは消せませんでした（サーバ側の会話が既に入れ替わっています）。");
}
function Ra(e, t) {
  const n = l("messages");
  for (const i of [...n.children])
    i !== e && i.remove();
  const s = $(
    "system",
    `ここまでの会話（${t.before}件）を要約に畳みました（約${t.saved_chars.toLocaleString()}文字ぶんの文脈を解放）。`
  );
  n.insertBefore(s, e), R() && (r.history = [
    { role: "user", content: "（ここまでの会話は /compact で要約に置き換えました）" },
    { role: "assistant", content: t.summary }
  ], wn()), X(!0);
}
function Ia(e) {
  const t = /```plan[^\n]*\n([\s\S]*?)```/.exec(e || "");
  return t ? t[1].trim() : null;
}
function Aa(e) {
  let t = Ia(e);
  !t && /^\s*1[.)]\s/m.test(e || "") && (t = (e || "").trim()), t && bi(t);
}
function Pa(e, t, n, s, i) {
  if (r.history.push({ role: "user", content: t }), (n.trim() || !i) && r.history.push({ role: "assistant", content: n }), wn(), !e || !e.isConnected) return;
  const o = io(n);
  o.length ? qa(e, n, o) : !Ga(e, n, s) && n.trim() && za(e, n, s);
}
async function Fa(e) {
  switch (e.type) {
    case "token":
      e.text && r.assistantUi?.onToken(e.text);
      break;
    case "status": {
      const t = e.phase || La(e.text || "");
      if (t) {
        r.assistantUi?.setPhase(t);
        break;
      }
      D(r.assistantEl, e.text, { category: e.category, tool: e.tool });
      break;
    }
    case "turn":
      r.turnId = e.id || 0;
      break;
    case "compacted":
      r.compacted = e;
      break;
    case "approval":
      Oa(e);
      break;
    case "workset":
      Da(e.workset);
      break;
    case "files_changed":
      await wi(e.paths || []);
      break;
    case "turn_metrics": {
      const t = e.metrics || {}, n = Array.isArray(t.llm_calls) ? t.llm_calls.length : 0, s = Number(t.tool_calls || 0), i = Number(t.acceptance_retries || 0), o = [`LLM ${n}`, `tools ${s}`];
      t.exit_reason && o.push(t.exit_reason), i && o.push(`acceptance retry ${i}`), D(
        r.assistantEl,
        `Turn: ${o.join(" / ")}`,
        { category: "turn_metrics" }
      );
      break;
    }
    case "error":
      D(r.assistantEl, "⚠ " + e.text);
      break;
  }
}
function Da(e) {
  if (!e || !r.assistantEl) return;
  const t = e.items || [], n = e.omitted || [], s = {
    target: "対象",
    pinned: "ピン",
    caller: "呼出元",
    dependency: "依存",
    test: "テスト",
    spec: "文書",
    symbol: "シンボル",
    related: "関連"
  };
  D(
    r.assistantEl,
    `📚 Workset: ${t.length}件（自動追加 ${e.stats?.auto_added || 0}件）`
  ), t.slice(0, 16).forEach((i) => {
    const o = [];
    i.symbols?.length && o.push(`symbol ${i.symbols.length}`), i.sections?.length && o.push(`節 ${i.sections.length}`), i.requirements?.length && o.push(`要件 ${i.requirements.length}`), i.mermaid?.length && o.push(`Mermaid ${i.mermaid.length}`), D(
      r.assistantEl,
      `  ${s[i.role] || i.role}: ${i.path}` + (o.length ? `（${o.join(" / ")}）` : "")
    );
  }), t.length > 16 && D(r.assistantEl, `  …ほか ${t.length - 16}件`), n.slice(0, 8).forEach((i) => D(r.assistantEl, `  ⏭ 省略: ${i.path}（${i.reason}）`));
}
function ls() {
  const e = r.assistantUi?.finish() ?? "";
  return r.assistantEl && !e.trim() && !r.assistantEl.querySelector(".tool-log") && (r.assistantEl.remove(), r.assistantEl = null), r.assistantUi = null, e;
}
function Oa(e) {
  const t = l("approval");
  l("diff-approve-edit").disabled = !1, t.innerHTML = "", t.classList.remove("hidden");
  const n = document.createElement("h4");
  if (n.textContent = "⚠ エージェントが以下のツール実行を要求しています（承認が必要）", t.appendChild(n), e.changeset) {
    const u = document.createElement("div");
    u.className = "call";
    const f = (e.changeset.changes || []).length;
    u.textContent = `ChangeSet ${e.changeset.id || ""}：${f}ファイルを一括確認`, t.appendChild(u);
    const w = e.changeset.document_validation || {};
    for (const m of [
      ...e.changeset.errors || [],
      ...e.changeset.conflicts || [],
      ...w.errors || []
    ]) {
      const h = document.createElement("div");
      h.className = "call danger", h.textContent = "⚠ " + (m.path ? `${m.path}: ` : "") + (m.error || "base hash が現在内容と一致しません"), t.appendChild(h);
    }
    for (const m of w.warnings || []) {
      const h = document.createElement("div");
      h.className = "call", h.textContent = "ℹ " + (m.path ? `${m.path}: ` : "") + m.warning, t.appendChild(h);
    }
  }
  for (const u of e.calls) {
    const f = document.createElement("div");
    if (f.className = "call", u.needs_approval) {
      const h = document.createElement("span");
      h.className = "danger", h.textContent = "● 承認必須 ", f.appendChild(h);
    }
    const w = document.createElement("b");
    w.textContent = u.name;
    const m = u.args && Object.keys(u.args).length ? JSON.stringify(u.args, null, 2) : "(no args)";
    f.append(w, `
` + m), t.appendChild(f);
  }
  const s = e.changeset?.changes?.length ? e.changeset.changes : e.calls.filter((u) => u.preview).map((u) => u.preview), i = e.calls.length === 1 && s.length === 1 ? { id: e.id, path: s[0].path } : null;
  s.length && Za(s, i);
  const o = document.createElement("div");
  o.className = "row";
  const a = document.createElement("textarea");
  a.placeholder = "却下して別指示を出す場合はここに入力（任意）";
  const c = document.createElement("button");
  c.className = "btn-approve", c.textContent = "✓ 承認して実行", c.disabled = !!e.changeset && !e.changeset.ok, c.disabled && (c.title = "競合または検証エラーがあるため承認できません"), c.onclick = () => ds(e.id, !0, null);
  const d = document.createElement("button");
  d.className = "btn-reject", d.textContent = "✗ 却下", d.onclick = () => ds(e.id, !1, a.value.trim() || null), o.append(a, c, d), t.appendChild(o), X();
}
const Bt = /* @__PURE__ */ new WeakSet();
async function gi(e, t, n) {
  const s = L.active;
  if (!s || L.state.phase !== "approval") return;
  const i = l("approval");
  if (Bt.has(s)) return;
  Bt.add(s);
  const o = i.firstChild, a = [...i.querySelectorAll("button"), l("diff-approve-edit")], c = a.map((d) => d.disabled);
  a.forEach((d) => {
    d.disabled = !0;
  });
  try {
    if (await T(e, { ...t, session_id: s.sessionId }), !L.current(s) || s.controller.signal.aborted) return;
    D(r.assistantEl, n), i.firstChild === o && (i.classList.add("hidden"), i.innerHTML = "", ye.length && ce(), L.phase(s, "running"));
  } catch (d) {
    L.current(s) && !s.controller.signal.aborted && D(r.assistantEl, d.message);
  } finally {
    Bt.delete(s), L.current(s) && (i.firstChild === o || !i.firstChild) && a.forEach((d, u) => {
      d.disabled = c[u];
    });
  }
}
async function ds(e, t, n) {
  return gi(
    "/api/approve",
    { id: e, approve: t, override: n },
    t ? "✓ 承認しました。" : "✗ 却下しました。"
  );
}
async function wi(e) {
  D(r.assistantEl, "変更されたファイル: " + e.join(", "));
  for (const t of e) r.changedPaths.add(t);
  await W(), r.currentFile && e.includes(r.currentFile) && (r.dirty ? (r.conflictDeclined = !0, r.saveError = new ee("エージェントがファイルを更新しました。未保存の編集は保持しています。保存前に変更を確認してください。", 409), B()) : await ie(r.currentFile, !0));
}
async function Ba() {
  const e = L.stop();
  e && (Pe() && (e.interruption = (async () => {
    let t = !1;
    for (let n = 0; n < 10; n++) {
      const s = await K("/api/interrupt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: e.sessionId }),
        signal: AbortSignal.timeout(5e3)
      });
      if (!L.current(e)) return;
      if (s.stopped !== !1) {
        t = !0;
        break;
      }
    }
    await W(), L.current(e) && r.currentFile && !r.dirty && await ie(r.currentFile, !0, "none"), t || $("error", "停止を要求しましたが、処理の終了をまだ確認できません。ファイルの状態を確認してください。");
  })().catch((t) => {
    $("error", t.message);
  })), ye.length && ce());
}
async function Ha(e) {
  if (r.streaming) {
    alert("⚠️ 実行中です。中断してから巻き戻してください。");
    return;
  }
  if (confirm(`このターンの前の状態へファイルを戻しますか？
以降のターンで同じファイルに加えた変更も巻き戻ります。
（このターンより後に作られたファイルは消さずに残ります。）`))
    try {
      const t = await T("/api/rollback", { session_id: r.sessionId, turn_id: e });
      if (!t.ok) {
        $("system", "⚠️ 巻き戻せませんでした（スナップショット無し: 古すぎるか容量上限）。");
        return;
      }
      $("system", t.restored.length ? `${t.restored.length}件を巻き戻しました: ${t.restored.join(", ")}` : "戻す変更はありませんでした（既にターン前の内容と同じです）。"), t.restored.length && await wi(t.restored);
    } catch (t) {
      alert("⚠️ 巻き戻しに失敗しました: " + t.message);
    }
}
function vi(e) {
  if (r.streaming && !(e && L.current(e) && L.state.phase === "switching")) {
    alert("⚠️ 実行中です。中断してから新しい会話を開始してください。");
    return;
  }
  r.sessionId = ze(), l("messages").innerHTML = "", l("approval").classList.add("hidden"), ye.length && ce(), r.assistantEl = null, $("system", "新しい会話を開始しました（別セッション）。"), $e();
}
function ja(e, t) {
  T("/api/code-chat/log", { session_id: r.sessionId, user: e, assistant: t }).catch(() => {
  });
}
function Wa(e) {
  if (!e) return "";
  const t = Math.max(0, Date.now() / 1e3 - e);
  return t < 60 ? "たった今" : t < 3600 ? `${Math.floor(t / 60)}分前` : t < 86400 ? `${Math.floor(t / 3600)}時間前` : `${Math.floor(t / 86400)}日前`;
}
async function yi() {
  if (r.streaming) {
    alert("⚠️ 実行中です。中断してから開いてください。");
    return;
  }
  l("sessions-modal").classList.remove("hidden");
  const e = l("sessions-list");
  e.innerHTML = "";
  let t = [];
  try {
    t = (await se("/api/code-chat/sessions")).sessions || [];
  } catch (n) {
    const s = document.createElement("li");
    s.textContent = "⚠ 一覧を取得できませんでした: " + n.message, e.appendChild(s);
    return;
  }
  if (!t.length) {
    const n = document.createElement("li");
    n.className = "sess-empty", n.textContent = "保存済みの会話はまだありません（Code モードの会話はターンごとに自動保存されます）。", e.appendChild(n);
    return;
  }
  for (const n of t) {
    const s = document.createElement("li");
    n.session_id === r.sessionId && s.classList.add("current");
    const i = document.createElement("div");
    i.className = "sess-item";
    const o = document.createElement("div");
    o.className = "sess-title", o.textContent = n.title;
    const a = document.createElement("div");
    a.className = "sess-sub", a.textContent = `${Wa(n.updated_at)} ・ ${n.messages} メッセージ` + (n.session_id === r.sessionId ? " ・現在の会話" : ""), i.append(o, a);
    const c = document.createElement("button");
    c.type = "button", c.textContent = "削除", c.title = "この会話を削除", c.addEventListener("click", async (d) => {
      d.stopPropagation(), confirm(`「${n.title}」を削除しますか？`) && (await T("/api/code-chat/delete", { session_id: n.session_id }).catch(() => {
      }), yi());
    }), s.append(i, c), s.addEventListener("click", () => Ua(n.session_id)), e.appendChild(s);
  }
}
async function Ua(e) {
  const t = L.begin("switching");
  if (!t) return;
  let n = "";
  l("sessions-modal").classList.add("hidden");
  try {
    const s = await se("/api/code-chat/session?session_id=" + encodeURIComponent(e)), i = await T(
      "/api/code-chat/restore",
      { session_id: e, messages: s.messages }
    );
    L.finish(t), r.sessionId = e, $e(), l("messages").innerHTML = "";
    for (const o of s.messages || []) $(o.role, o.content, { assetBase: Ze() });
    $("system", i.ok ? "✓ 会話を復元しました（エンジンの文脈も引き継がれています。続きから話せます）。" : "✓ 会話の表示を復元しました（このエンジンでは文脈の復元は未対応です）。"), X(!0);
  } catch (s) {
    n = s.message, alert("⚠️ 会話を復元できませんでした: " + s.message);
  } finally {
    L.finish(t, n);
  }
}
function $e() {
  l("session-info").textContent = "session: " + r.sessionId.slice(0, 8);
}
function qa(e, t, n) {
  let s = "", i = 0;
  for (const c of As(t))
    s += t.slice(i, c.start) + "修正案（差分で確認）", i = c.end;
  s += t.slice(i), Ke(e.querySelector(".body"), s, { assetBase: Ze() });
  const o = document.createElement("div");
  o.className = "apply-actions";
  const a = document.createElement("button");
  a.className = "apply-btn", a.textContent = `▶ 差分で反映（${n.length}箇所）`, a.addEventListener("click", () => Va(n, e)), o.appendChild(a), e.appendChild(o), X();
}
async function Va(e, t) {
  const n = r.editor.getModel().getValue();
  let s;
  try {
    s = await T("/api/patch", { base: n, edits: e });
  } catch (a) {
    D(t, "⚠️ 適用計算に失敗: " + a.message);
    return;
  }
  if (s.results.forEach((a, c) => {
    a.ok ? a.method !== "exact" && D(t, `ℹ️ 修正${c + 1}: ${a.method} マッチで補正適用`) : D(t, `⚠️ 修正${c + 1}: ${a.error.split(`
`)[0]}`);
  }), s.applied === 0) {
    D(t, "⚠️ 適用できる修正がありませんでした。本文が変わっていないか確認してください。");
    return;
  }
  const i = s.mdflow_warnings || [];
  i.forEach((a) => D(t, `⚠️ mdflow: ${a}`));
  let o = `差分プレビュー：${s.applied}/${e.length} 箇所を適用（右は編集して調整可）`;
  i.length && (o += ` ⚠ mdflow: ${i.length}件の警告`), _n(n, s.content, (a) => {
    const c = r.editor.getModel();
    r.editor.executeEdits(
      "pixie-patch",
      [{ range: c.getFullModelRange(), text: a, forceMoveMarkers: !0 }]
    ), r.editor.focus();
  }, o);
}
function Ka() {
  r.pendingTarget?.coll && r.pendingTarget.coll.clear();
  const e = r.editor.getSelection();
  if (!e || e.isEmpty())
    return r.pendingTarget = null, null;
  const t = r.editor.createDecorationsCollection([
    { range: e, options: { className: "pixie-pending-target" } }
  ]);
  return r.pendingTarget = { file: r.currentFile, coll: t }, r.pendingTarget;
}
function za(e, t, n) {
  const s = document.createElement("div");
  s.className = "apply-actions";
  const i = document.createElement("button");
  i.className = "insert-btn", i.textContent = "▶ エディタへ反映", i.title = "このメッセージの提案を差分プレビューで確認してから反映する", i.addEventListener("click", () => Ei(ro(t), n)), s.appendChild(i), e.appendChild(s), X();
}
function Ga(e, t, n) {
  const s = [...t.matchAll(/```apply\s*\n([\s\S]*?)```/g)];
  if (!s.length) return !1;
  const i = s[s.length - 1][1].replace(/\n$/, "");
  e.querySelector(".body").textContent = t.replace(/```apply\s*\n[\s\S]*?```/g, "修正案（下のボックス参照）");
  const o = document.createElement("div");
  o.className = "apply-box", o.textContent = i;
  const a = document.createElement("div");
  a.className = "apply-actions";
  const c = document.createElement("button");
  return c.className = "apply-btn", c.textContent = "▶ 差分で反映", c.addEventListener("click", () => Ei(i, n)), a.appendChild(c), e.append(o, a), X(), !0;
}
function Ei(e, t) {
  const n = Ya(t), s = r.editor.getModel().getValueInRange(n);
  _n(s, e, (i) => {
    r.editor.executeEdits("pixie-apply", [{ range: n, text: i, forceMoveMarkers: !0 }]), t?.coll && t.coll.clear(), r.editor.focus();
  });
}
function Ya(e) {
  const t = r.editor.getModel();
  if (e?.coll && e.file === r.currentFile) {
    const n = e.coll.getRange(0);
    if (n) return n;
  }
  return t.getFullModelRange();
}
let Z = null, Et = null, ye = [], we = null;
function _n(e, t, n, s, i = {}) {
  cn("editor");
  const o = r.monaco;
  l("diff-label").textContent = s || "差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）", l("diff-overlay").classList.remove("hidden"), l("diff-apply").classList.toggle("hidden", !!i.approval), l("diff-cancel").classList.toggle("hidden", !!i.approval), l("diff-close").classList.toggle("hidden", !i.approval), Z || (Z = o.editor.createDiffEditor(l("diff-editor"), {
    theme: "vs-dark",
    automaticLayout: !0,
    renderSideBySide: !0,
    originalEditable: !1,
    readOnly: !1,
    minimap: { enabled: !1 },
    wordWrap: "on",
    fontSize: 14
  })), Z.updateOptions({ readOnly: !n && !i.editable });
  const a = i.lang || (r.currentFile ? un(r.currentFile) : "markdown"), c = o.editor.createModel(e, a), d = o.editor.createModel(t, a);
  Z.setModel({ original: c, modified: d }), Et = n ? () => {
    const u = Z.getModel().modified.getValue();
    ce(), n(u);
  } : null, Z.focus();
}
function ce() {
  if (l("diff-overlay").classList.add("hidden"), Et = null, ye = [], we = null, l("diff-tabs").innerHTML = "", l("diff-approve-edit").classList.add("hidden"), Z) {
    const e = Z.getModel();
    Z.setModel(null), e && (e.original.dispose(), e.modified.dispose());
  }
}
function Za(e, t = null) {
  ye = e, we = t, l("diff-approve-edit").classList.toggle("hidden", !t);
  const n = l("diff-tabs");
  n.innerHTML = "", e.length > 1 && e.forEach((s, i) => {
    const o = document.createElement("button");
    o.type = "button", o.textContent = (s.path || "").split("/").pop() || s.path, o.title = s.path, o.addEventListener("click", () => us(i)), n.appendChild(o);
  }), us(0);
}
function us(e) {
  const t = ye[e];
  t && ([...l("diff-tabs").children].forEach((n, s) => n.classList.toggle("active", s === e)), _n(
    t.before,
    t.after,
    null,
    `承認確認: ${t.path}（左＝現在 ／ 右＝書き込まれる内容${we ? "・右を編集して修正して承認できます" : ""}）`,
    { approval: !0, editable: !!we, lang: un(t.path || "") }
  ));
}
async function Xa(e, t, n) {
  return gi("/api/approve-edit", { id: e, path: t, content: n }, "✓ 修正して承認しました（編集内容を適用）。");
}
function bi(e) {
  cn("editor"), r.planText = e, Ke(l("plan-body"), e), l("plan-label").textContent = "実行計画（承認するまでファイルは変更されません）", l("plan-overlay").classList.remove("hidden");
}
function xi() {
  l("plan-overlay").classList.add("hidden"), l("plan-body").innerHTML = "", r.planText = "";
}
async function Ja() {
  const e = r.planText;
  if (!e) return;
  if (xi(), Pe()) {
    r.planExecNext = !0, $("system", "✓ 計画を承認しました。実装を開始します（書き込みは引き続き承認制）。"), l("chat-input").value = `以下の実行計画を承認しました。この計画のとおりに実装してください。計画から外れる変更が必要になったら、実行する前に知らせてください。

` + e, await Ve();
    return;
  }
  if (!await hn("code", { keepMessages: !0 })) {
    bi(e);
    return;
  }
  $("system", "計画を承認しました。Codeモードで実行します。"), l("chat-input").value = `以下の実行計画を承認しました。この計画のとおりに実装してください。計画から外れる変更が必要になったら、実行する前に知らせてください。

` + e, await Ve();
}
function fs() {
  l("plan-overlay").classList.add("hidden"), $("system", "✕ 計画の修正を依頼します。どこをどう直したいかチャットに書いてください。"), l("chat-input").focus();
}
async function Le(e) {
  const t = await z("/api/workspace/dirs?path=" + encodeURIComponent(e || ""));
  if (!t) return;
  l("root-input").value = t.cwd || "", bn();
  const n = l("root-drives");
  n.innerHTML = "";
  for (const i of t.drives || []) {
    const o = document.createElement("button");
    o.textContent = i, o.classList.toggle("active", (t.cwd || "").toLowerCase().startsWith(i.toLowerCase().slice(0, 2))), o.addEventListener("click", () => Le(i)), n.appendChild(o);
  }
  const s = l("root-dirlist");
  if (s.innerHTML = "", t.parent && t.parent !== t.cwd) {
    const i = document.createElement("li");
    i.textContent = "⬆ ..（上のフォルダへ）", i.addEventListener("click", () => Le(t.parent)), s.appendChild(i);
  }
  for (const i of t.dirs || []) {
    const o = document.createElement("li");
    o.textContent = i.name, o.addEventListener("click", () => Le(i.path)), s.appendChild(o);
  }
}
async function an() {
  l("root-modal").classList.remove("hidden"), await Zs(), Js(), await Le(l("root-path").textContent || "");
}
function lt() {
  l("root-modal").classList.add("hidden");
}
const Qa = () => Nn(l("root-input").value.trim());
async function Nn(e) {
  if (!e) return;
  if (ge) {
    alert("⚠️ 置換が完了してから作業フォルダを切り替えてください。");
    return;
  }
  if (r.streaming) {
    alert("⚠️ 実行中は作業フォルダを切り替えられません。");
    return;
  }
  const t = L.begin("switching");
  if (!t) return;
  let n = "", s;
  try {
    for (; r.savePromise; ) await r.savePromise;
    if (await St(), r.dirty && !confirm("未保存の変更があります。破棄して作業フォルダを切り替えますか？")) return;
    ue = !0, s = r.editor.getOption(r.monaco.editor.EditorOption.readOnly), r.editor.updateOptions({ readOnly: !0 }), V++, ot++, ve++;
    let i;
    try {
      i = await T("/api/workspace", { path: e });
    } catch (o) {
      n = o.message, alert("⚠️ フォルダ変更に失敗: " + o.message);
      return;
    }
    lt(), r.currentFile = null, r.baseMtime = null, $o(), ca(), r.collapsedDirs.clear(), r.knownDirs.clear(), r.changedPaths.clear(), r.saveError = null, r.editor.setValue(""), Ct(), B(), l("current-file").textContent = "（ファイル未選択）", Me(), Bs(), await Ds(), pn(), await kt(), await W(), R() ? (r.sessionId = ze(), $e(), l("approval").classList.add("hidden"), r.assistantEl = null, await gn()) : vi(t), $("system", "作業フォルダを変更: " + (i.workspace || e));
  } catch (i) {
    return n = i.message, alert(i.message), !1;
  } finally {
    ue = !1, s !== void 0 && r.editor.updateOptions({ readOnly: s }), L.finish(t, n);
  }
}
async function ec() {
  const e = prompt("Markdown にする URL（ログインが必要なページはブラウザで手動ログイン）");
  if (!e || !e.trim()) return;
  const t = l("web2md-btn");
  if (t) {
    t.disabled = !0, t.textContent = "⏳";
    try {
      const n = await (await fetch("/api/web2md", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: e.trim() })
      })).json();
      if (!n.ok) {
        alert(n.error);
        return;
      }
      await W(), await ie(n.path);
    } catch (n) {
      alert("エラー: " + n.message);
    } finally {
      t.disabled = !1, t.textContent = "🌐+";
    }
  }
}
function me(e) {
  const t = l("cp-bar-status");
  t && (t.textContent = e);
}
async function tc() {
  me("ブラウザを起動中…");
  try {
    const e = await (await fetch("/api/copilot/open", { method: "POST" })).json();
    me(e.ok ? "Copilot を開きました。ブラウザで対話してください。" : e.error);
  } catch (e) {
    me("エラー: " + e.message);
  }
}
async function nc() {
  if (r.streaming) return;
  const e = l("cp-bar-import-btn");
  e.disabled = !0, me("会話を取得中…");
  let t;
  try {
    t = await (await fetch("/api/copilot/read", { method: "POST" })).json();
  } catch (i) {
    me("エラー: " + i.message), e.disabled = !1;
    return;
  }
  if (e.disabled = !1, !t.ok) {
    me(t.error);
    return;
  }
  me("");
  const n = l("chat-input"), s = n.value.trim() || "以下は私が Microsoft Copilot と交わした会話ログです。内容を整理して、ノートとして残せる Markdown のまとめを作ってください。";
  n.value = s + `

---

# Copilot 会話ログ

` + t.transcript, await Ve();
}
async function sc() {
  l("settings-modal").classList.remove("hidden"), await Promise.all([
    ic(),
    Ci(),
    ki(),
    Li()
  ]);
}
async function ic() {
  const e = l("settings-model");
  if (!e) return;
  const t = await se("/api/servers").catch(() => ({ servers: [], active: 0 }));
  e.innerHTML = "", (t.servers || []).forEach((n, s) => {
    const i = document.createElement("option");
    i.value = s, i.textContent = `${n.name} — ${n.model || "(model?)"}`, s === t.active && (i.selected = !0), e.appendChild(i);
  }), e.onchange = async () => {
    try {
      await T("/api/settings", { active_server: Number(e.value) });
    } catch (n) {
      alert("⚠️ 設定を保存できません: " + n.message);
    }
    await Promise.all([Ci(), ki(), kt()]);
  };
}
async function ki() {
  const e = await se("/api/settings").catch(() => ({})), t = l("settings-think-budget");
  t && (e.think_budget_min != null && (t.min = e.think_budget_min), e.think_budget_max != null && (t.max = e.think_budget_max), e.think_budget_sec != null && (t.value = e.think_budget_sec), l("settings-think-budget-status").textContent = "");
  const n = l("settings-context-length");
  n && (e.context_length_min != null && (n.min = e.context_length_min), e.context_length_max != null && (n.max = e.context_length_max), e.context_length != null && (n.value = e.context_length || 0), l("settings-context-length-status").textContent = "");
}
async function ps() {
  const e = l("settings-think-budget"), t = l("settings-think-budget-status");
  t.textContent = "保存中…";
  try {
    const n = await T("/api/settings", { think_budget_sec: Number(e.value) });
    e.value = n.think_budget_sec, t.textContent = `✓ ${n.think_budget_sec} 秒にしました`;
  } catch (n) {
    t.textContent = "⚠ " + n.message;
  }
}
async function ms() {
  const e = l("settings-context-length"), t = l("settings-context-length-status");
  t.textContent = "保存中…";
  try {
    const n = await T("/api/settings", { context_length: Number(e.value) });
    e.value = n.context_length || 0, t.textContent = n.context_length ? `✓ ${n.context_length.toLocaleString()} トークンにしました（会話は作り直し）` : "✓ 自動（バックエンドの取得値）に戻しました";
  } catch (n) {
    t.textContent = "⚠ " + n.message;
  }
}
async function Ci() {
  const e = l("settings-llm-model");
  if (!e) return;
  e.innerHTML = "", e.disabled = !0;
  const t = document.createElement("option");
  t.textContent = "(取得中…)", e.appendChild(t);
  const n = await se("/api/models").catch(() => ({ models: [] })), s = n.models || [];
  if (e.innerHTML = "", e.onchange = null, !s.length) {
    const i = document.createElement("option");
    i.value = "", i.textContent = "(取得できません・LM Studio 起動中か確認)", e.appendChild(i), e.disabled = !0;
    return;
  }
  e.disabled = !1, s.forEach((i) => {
    const o = document.createElement("option");
    o.value = i, o.textContent = i.split("/").pop(), i === n.current && (o.selected = !0), e.appendChild(o);
  }), e.onchange = async () => {
    if (e.value) {
      try {
        await T("/api/settings", { model: e.value });
      } catch (i) {
        alert("⚠️ モデルを保存できません: " + i.message);
      }
      await kt();
    }
  };
}
function Ht() {
  l("settings-modal").classList.add("hidden");
}
async function Li() {
  const e = await se("/api/copilot").catch(() => ({}));
  l("settings-copilot").checked = !!e.enabled, r.copilotEnabled = !!e.enabled, mn();
  const t = [];
  e.enabled && t.push("オン"), e.script_ok ? e.python_ok ? e.enabled && t.push("PrayLight OK — 未ログインなら下のボタンでブラウザを開いてログイン") : t.push("⚠ PrayLight の .venv Python 未検出") : t.push("⚠ PrayLight 未検出: " + (e.praylight_dir || "?")), l("settings-copilot-status").textContent = t.join(" / ");
}
async function rc(e) {
  try {
    const t = await T("/api/copilot/enable", { enabled: l("settings-copilot").checked });
    r.copilotEnabled = !!t.enabled, mn();
  } catch (t) {
    alert("⚠️ 設定を保存できません: " + t.message), e.target.checked = !e.target.checked;
  }
  await Li();
}
async function oc() {
  l("settings-copilot-status").textContent = "起動中…";
  const e = await T("/api/copilot/open").catch(() => ({ ok: !1, error: "通信エラー" }));
  l("settings-copilot-status").textContent = e.ok ? "ブラウザを開きました。Copilot にログインしてください。" : e.error || "起動失敗";
}
function ac() {
  l("send-btn").addEventListener("click", () => r.streaming ? Ba() : Ve()), l("new-session-btn").addEventListener("click", vi), l("sessions-btn").addEventListener("click", yi), l("sessions-close").addEventListener("click", () => l("sessions-modal").classList.add("hidden")), l("sessions-modal").addEventListener("click", (e) => {
    e.target === l("sessions-modal") && l("sessions-modal").classList.add("hidden");
  }), $e(), Me(), l("save-btn").addEventListener("click", () => Zt()), l("preview-btn").addEventListener("click", tn), l("richcopy-btn").addEventListener("click", ta), l("preview").addEventListener("wheel", si, { passive: !0 }), l("preview").addEventListener("scroll", () => {
    Ho(), ae && oi(r.editor.getModel(), ae.range);
  }, { passive: !0 }), document.addEventListener("selectionchange", () => {
    clearTimeout(ss), ss = setTimeout(Uo, jo);
  }), Do(), sa(), l("refresh-btn").addEventListener("click", () => W()), l("file-search").addEventListener("input", aa), l("search-case").addEventListener("change", () => Ln(l("file-search").value)), l("replace-toggle").addEventListener("click", da), l("replace-preview-btn").addEventListener("click", () => Dt(!0)), l("replace-run-btn").addEventListener("click", () => Dt(!1)), l("replace-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Dt(!0));
  }), l("nav-back").addEventListener("click", Xt), l("nav-fwd").addEventListener("click", Jt), l("recent-btn").addEventListener("click", (e) => {
    e.stopPropagation(), Qt();
  }), l("history-btn").addEventListener("click", To), l("hist-close").addEventListener("click", at), l("hist-restore").addEventListener("click", Ro), l("hist-modal").addEventListener("click", (e) => {
    e.target === l("hist-modal") && at();
  }), Se(), l("mode-btn").addEventListener("click", fo), l("code-style-btn").addEventListener("click", uo), l("plan-approve").addEventListener("click", Ja), l("plan-reject").addEventListener("click", fs), l("note-btn").addEventListener("click", pa), l("chat-clear-btn").addEventListener("click", po), ya(), l("ref-add-btn").addEventListener("click", Ea), l("pick-cancel").addEventListener("click", ct), l("pick-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), De(l("pick-input").value.trim()));
  }), l("pick-modal").addEventListener("click", (e) => {
    e.target === l("pick-modal") && ct();
  }), l("diff-apply").addEventListener("click", () => {
    Et && Et();
  }), l("diff-cancel").addEventListener("click", ce), l("diff-close").addEventListener("click", ce), l("diff-approve-edit").addEventListener("click", () => {
    if (!we || !Z) return;
    const e = Z.getModel().modified.getValue();
    Xa(we.id, we.path, e);
  }), l("chat-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.ctrlKey || e.metaKey) && (e.preventDefault(), Ve());
  }), l("new-file-btn").addEventListener("click", () => pt("file")), l("new-folder-btn").addEventListener("click", () => pt("dir")), l("web2md-btn").addEventListener("click", ec), l("cp-bar-open-btn").addEventListener("click", tc), l("cp-bar-import-btn").addEventListener("click", nc), document.addEventListener("click", je), vo(), l("root-project-btn").addEventListener("click", an), l("folder-btn").addEventListener("click", an), l("root-cancel").addEventListener("click", lt), l("root-ok").addEventListener("click", Qa), l("places-btn").addEventListener("click", (e) => {
    e.stopPropagation(), Ao();
  }), l("root-fav-btn").addEventListener("click", () => {
    const e = l("root-input").value.trim();
    e && Qs(e);
  }), l("root-input").addEventListener("input", bn), l("root-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Le(l("root-input").value.trim()));
  }), l("root-modal").addEventListener("click", (e) => {
    e.target === l("root-modal") && lt();
  }), l("settings-btn").addEventListener("click", sc), l("settings-close").addEventListener("click", Ht), l("settings-think-budget-save").addEventListener("click", ps), l("settings-think-budget").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), ps());
  }), l("settings-context-length-save").addEventListener("click", ms), l("settings-context-length").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), ms());
  }), l("settings-copilot").addEventListener("change", rc), l("settings-copilot-open").addEventListener("click", oc), l("settings-modal").addEventListener("click", (e) => {
    e.target === l("settings-modal") && Ht();
  }), window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault(), Zt();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault(), tn();
      return;
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault(), e.key === "ArrowLeft" ? Xt() : Jt();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "e") {
      e.preventDefault(), Qt();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "h" && ae) {
      e.preventDefault(), ai();
      return;
    }
    e.key === "Escape" && !l("hist-modal").classList.contains("hidden") ? at() : e.key === "Escape" && !l("root-modal").classList.contains("hidden") ? lt() : e.key === "Escape" && !l("pick-modal").classList.contains("hidden") ? ct() : e.key === "Escape" && !l("cf-modal").classList.contains("hidden") ? l("cf-modal").classList.add("hidden") : e.key === "Escape" && !l("sessions-modal").classList.contains("hidden") ? l("sessions-modal").classList.add("hidden") : e.key === "Escape" && !l("settings-modal").classList.contains("hidden") ? Ht() : e.key === "Escape" && !l("diff-overlay").classList.contains("hidden") ? ce() : e.key === "Escape" && !l("plan-overlay").classList.contains("hidden") && fs();
  }), window.addEventListener("blur", () => {
    St();
  }), window.addEventListener("beforeunload", (e) => {
    r.dirty && (e.preventDefault(), e.returnValue = "");
  }), pc(), mc(), hc();
}
const cc = "pixie.splitRatio", lc = "pixie.previewRatio", dc = 320, uc = 160;
function Si({ divider: e, pane: t, container: n, min: s, key: i, after: o }) {
  const a = (f) => {
    const w = n.clientWidth - s - e.offsetWidth;
    t.style.flex = `0 0 ${Math.max(s, Math.min(f, Math.max(s, w)))}px`, r.editor?.layout(), o?.();
  }, c = () => {
    const f = Number(localStorage.getItem(i));
    f > 0 && f < 1 && a(n.clientWidth * f);
  };
  let d = !1;
  e.addEventListener("mousedown", (f) => {
    f.preventDefault(), d = !0, document.body.style.cursor = "col-resize";
  }), window.addEventListener("mouseup", () => {
    d && (d = !1, document.body.style.cursor = "", localStorage.setItem(
      i,
      String(t.getBoundingClientRect().width / n.clientWidth)
    ));
  }), window.addEventListener("mousemove", (f) => {
    d && a(f.clientX - n.getBoundingClientRect().left);
  }), e.addEventListener("dblclick", () => {
    t.style.flex = "", localStorage.removeItem(i), r.editor?.layout();
  });
  const u = () => {
    t.style.flex && a(t.getBoundingClientRect().width);
  };
  return window.addEventListener("resize", u), { restore: c, reclamp: u };
}
let Rn = null;
function fc() {
  Rn?.restore();
}
function pc() {
  const { restore: e } = Si({
    divider: l("divider"),
    pane: l("left-pane"),
    container: l("split"),
    min: dc,
    key: cc,
    // 左ペインが細くなるとプレビュー側が押し出される。エディタは固定幅（flex-shrink:0）
    // なので放っておくとプレビューが 0px に潰れる。現在幅を入れ直して再クランプする。
    after: () => {
      J() && Rn?.reclamp();
    }
  });
  e();
}
function mc() {
  Rn = Si({
    divider: l("preview-divider"),
    pane: l("editor"),
    container: l("edit-area"),
    min: uc,
    key: lc
  });
}
const jt = "pixie.filemgrHeight", hs = 80;
function hc() {
  const e = l("v-divider"), t = l("filemgr");
  if (!e || !t) return;
  const n = (o) => {
    t.style.flex = `0 0 ${o}px`, t.style.maxHeight = "none";
  }, s = Number(localStorage.getItem(jt));
  s >= hs && n(s);
  let i = !1;
  e.addEventListener("mousedown", (o) => {
    o.preventDefault(), i = !0, document.body.style.cursor = "row-resize";
  }), window.addEventListener("mouseup", () => {
    i && (i = !1, document.body.style.cursor = "", localStorage.setItem(jt, String(t.getBoundingClientRect().height)));
  }), window.addEventListener("mousemove", (o) => {
    if (!i) return;
    const a = t.getBoundingClientRect().top, c = l("right-pane").getBoundingClientRect().bottom - a - 220;
    n(Math.max(hs, Math.min(o.clientY - a, c)));
  }), e.addEventListener("dblclick", () => {
    t.style.flex = "", t.style.maxHeight = "", localStorage.removeItem(jt);
  });
}
