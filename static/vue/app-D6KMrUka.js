import { c as S, a as Mi } from "./main-BlekoFb2.js";
class oe extends Error {
  constructor(t, n) {
    super(t), this.name = "ApiError", this.status = n;
  }
}
async function q(e, t) {
  let n;
  try {
    n = await fetch(e, t);
  } catch {
    throw new oe(`サーバに接続できません（${e}）`, 0);
  }
  if (!n.ok) {
    const s = await n.json().catch(() => ({}));
    throw new oe(s.detail || n.statusText || `HTTP ${n.status}`, n.status);
  }
  return n.json();
}
const ee = (e) => q(e), _ = (e, t) => q(e, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: t === void 0 ? void 0 : JSON.stringify(t)
});
async function K(e, t) {
  try {
    return await q(e, t);
  } catch (n) {
    alert("⚠️ " + n.message);
    return;
  }
}
const de = globalThis.jsyaml || null, as = () => de !== null, $i = "fill:#ff9999,stroke:#333,stroke-width:2px", _i = "fill:#2a2a2a,stroke:#555,color:#888", Nn = /^```[ \t]*(?:yaml[ \t]+)?mdflow-mapping[ \t]*\n([\s\S]*?)^```/gm, cs = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/, Ti = /^﻿?---[ \t]*\r?\n/, Ni = /^\s*%%\s*id\s*:\s*(\S+)/m;
function Ri(e) {
  const t = Ni.exec(e);
  return t ? t[1] : "";
}
function Ii(e) {
  const t = [];
  let n = {}, s = e, i = 0;
  const r = cs.exec(e);
  if (r) {
    try {
      const u = de ? de.load(r[1]) : null;
      u && typeof u == "object" && !Array.isArray(u) ? n = u : u != null && t.push("frontmatter のトップレベルがマッピングではありません");
    } catch (u) {
      t.push(`frontmatter の YAML 構文エラー: ${u.message || u}`);
    }
    s = e.slice(r[0].length), i = r[0].length;
  }
  const a = (n.mdflow || {}).selected, c = {};
  if (a && typeof a == "object" && !Array.isArray(a))
    for (const [u, f] of Object.entries(a)) c[String(u)] = String(f);
  const d = [];
  if (de) {
    Nn.lastIndex = 0;
    let u, f = 0;
    for (; (u = Nn.exec(s)) !== null; ) {
      f += 1;
      let w;
      try {
        w = de.load(u[1]) || {};
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
        activeStyle: String(h.active ?? $i),
        inactiveStyle: String(h.inactive ?? _i)
      });
    }
  }
  return { meta: n, body: s, bodyOffset: i, selected: c, mappings: d, warnings: t };
}
function Ai(e, t) {
  return t && e.find((n) => n.diagramId === t) || null;
}
class ve extends Error {
}
function Pi(e) {
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
      if (a < 0) throw new ve(`文字列リテラルが閉じていません: ${e}`);
      t.push({ t: "lit", v: e.slice(n + 1, a) }), n = a + 1;
      continue;
    }
    let r = /^\d+(?:\.\d+)?/.exec(e.slice(n));
    if (r) {
      t.push({ t: "lit", v: parseFloat(r[0]) }), n += r[0].length;
      continue;
    }
    if (r = /^[A-Za-z_]\w*/.exec(e.slice(n)), r) {
      const a = r[0];
      a === "True" ? t.push({ t: "lit", v: !0 }) : a === "False" ? t.push({ t: "lit", v: !1 }) : a === "None" ? t.push({ t: "lit", v: null }) : t.push({ t: "name", v: a }), n += a.length;
      continue;
    }
    throw new ve(`ルール式に不正な文字 '${s}': ${e}`);
  }
  return t;
}
const ze = (e) => typeof e == "number" || typeof e == "boolean";
function Di(e, t, n) {
  if (e === "==" || e === "!=") {
    const s = ze(t) && ze(n) ? Number(t) === Number(n) : t === n;
    return e === "==" ? s : !s;
  }
  if (ze(t) && ze(n))
    t = Number(t), n = Number(n);
  else if (!(typeof t == "string" && typeof n == "string")) return !1;
  return e === "<" ? t < n : e === "<=" ? t <= n : e === ">" ? t > n : t >= n;
}
function Fi(e, t) {
  if (e = (e || "").trim(), !e) return !0;
  const n = Pi(e);
  let s = 0;
  const i = () => n[s], r = () => n[s++];
  function a() {
    let m = c();
    for (; i()?.t === "||"; ) {
      r();
      const h = c();
      m = !!m || !!h;
    }
    return m;
  }
  function c() {
    let m = d();
    for (; i()?.t === "&&"; ) {
      r();
      const h = d();
      m = !!m && !!h;
    }
    return m;
  }
  function d() {
    return i()?.t === "!" ? (r(), !d()) : u();
  }
  function u() {
    let m = f();
    if (i()?.t !== "op") return m;
    let h = !0;
    for (; i()?.t === "op"; ) {
      const y = r().v, b = f();
      h && !Di(y, m, b) && (h = !1), m = b;
    }
    return h;
  }
  function f() {
    const m = r();
    if (!m) throw new ve(`ルール式が途中で終わっています: ${e}`);
    if (m.t === "lit") return m.v;
    if (m.t === "name")
      return t && Object.prototype.hasOwnProperty.call(t, m.v) ? t[m.v] : m.v === "true" ? !0 : m.v === "false" ? !1 : (m.v === "null", null);
    if (m.t === "(") {
      const h = a();
      if (r()?.t !== ")") throw new ve(`括弧が閉じていません: ${e}`);
      return h;
    }
    throw new ve(`ルール式の構文エラー: ${e}`);
  }
  const w = a();
  if (s !== n.length) throw new ve(`ルール式の構文エラー: ${e}`);
  return !!w;
}
function Bi(e, t, n) {
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
      i = Fi(s.when, t || {});
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
const Rn = /\b([A-Za-z_][\w-]*)\s*[\[({]/g, In = /([A-Za-z_][\w-]*)\s*(?:-{2,3}>|-{2,3}|={2,3}>|-\.->|-\.-)\s*(?:\|[^|]*\|\s*)?([A-Za-z_][\w-]*)/g, Hi = /^\s*(graph|flowchart)\b/i, An = /* @__PURE__ */ new Set([
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
function ls(e) {
  for (const t of e.split(`
`)) {
    const n = t.trim();
    if (!(!n || n.startsWith("%%")))
      return Hi.test(n);
  }
  return !1;
}
function ds(e) {
  const t = /* @__PURE__ */ new Set();
  for (const n of e.split(`
`)) {
    const s = n.trim();
    if (!s || s.startsWith("%%")) continue;
    In.lastIndex = 0;
    let i;
    for (; (i = In.exec(s)) !== null; )
      for (const r of [i[1], i[2]]) An.has(r) || t.add(r);
    for (Rn.lastIndex = 0; (i = Rn.exec(s)) !== null; )
      An.has(i[1]) || t.add(i[1]);
  }
  return [...t];
}
function Oi(e, t, n, s = "mdflowActive", i = null) {
  const r = e.replace(/\n+$/, "");
  if (!t?.length) return { code: r, missing: [] };
  let a = [], c = [...new Set(t)];
  const d = ls(e), u = d ? ds(e) : [];
  if (d) {
    const w = new Set(u);
    a = c.filter((m) => !w.has(m)), c = c.filter((m) => w.has(m));
  }
  if (!c.length) return { code: r, missing: a };
  const f = [r, ""];
  if (i && d) {
    const w = new Set(c), m = u.filter((h) => !w.has(h));
    m.length && (f.push(`classDef mdflowInactive ${i};`), f.push(`class ${m.join(",")} mdflowInactive;`));
  }
  return f.push(`classDef ${s} ${n};`), f.push(`class ${c.join(",")} ${s};`), { code: f.join(`
`), missing: a };
}
function Pn(e) {
  return de ? de.dump(String(e), { lineWidth: -1 }).trim() : String(e);
}
function ji(e) {
  const t = /^\s*(.+?):(?:\s|$)/.exec(e.replace(/\r$/, ""));
  if (!t) return null;
  let n = t[1].trim();
  const s = n[0];
  return (s === '"' || s === "'") && n.endsWith(s) && n.length >= 2 && (n = n.slice(1, -1)), n;
}
const Lt = (e) => /^\s*/.exec(e)[0].length;
function Wi(e, t, n) {
  const s = Pn(t), i = n == null ? null : `${s}: ${Pn(n)}`, r = cs.exec(e);
  if (!r) {
    if (i == null) return null;
    const v = e.startsWith("\uFEFF") ? 1 : 0;
    return { start: v, end: v, text: `---
mdflow:
  selected:
    ${i}
---
` };
  }
  const a = Ti.exec(e)[0].length, c = r[1], d = [];
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
    const L = d[v].raw.replace(/\r$/, "");
    if (L.trim() && Lt(L) === 0) break;
    if (/^\s+selected:\s*$/.test(L)) {
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
  const m = Lt(d[w].raw), h = " ".repeat(m + 2);
  let y = -1, b = null;
  for (let v = w + 1; v < d.length; v++) {
    const L = d[v].raw.replace(/\r$/, "");
    if (L.trim() && Lt(L) <= m) break;
    if (L.trim() && (b == null && (b = /^\s*/.exec(L)[0]), ji(L) === t)) {
      y = v;
      break;
    }
  }
  if (y >= 0) {
    const v = d[y], L = v.raw.endsWith("\r");
    if (i == null) {
      const N = Math.min(v.start + v.raw.length + 1, a + c.length);
      return { start: v.start, end: N, text: "" };
    }
    const M = /^\s*/.exec(v.raw)[0];
    return { start: v.start, end: v.start + v.raw.length - (L ? 1 : 0), text: `${M}${i}` };
  }
  if (i == null) return null;
  const x = d[w].start + d[w].raw.length + 1;
  return { start: x, end: x, text: `${b ?? h}${i}
` };
}
const Ui = 2;
function us(e) {
  return (e || "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "figure";
}
function qi(e, t) {
  const n = /^\s*%%\s*id\s*:\s*(\S+)/m.exec(e || "");
  return us(n ? n[1] : `figure-${t + 1}`);
}
function Ki(e) {
  const t = e.getAttribute("viewBox")?.trim().split(/[\s,]+/);
  if (t?.length === 4) {
    const s = parseFloat(t[2]), i = parseFloat(t[3]);
    if (Number.isFinite(s) && Number.isFinite(i) && s > 0 && i > 0) return { width: s, height: i };
  }
  const n = e.getBoundingClientRect();
  return { width: Math.max(1, n.width), height: Math.max(1, n.height) };
}
function Vi(e) {
  return new Promise((t, n) => {
    const s = new Image();
    s.onload = () => t(s), s.onerror = () => n(new Error("SVG を画像として読み込めませんでした。")), s.src = e;
  });
}
async function fs(e, { scale: t = Ui, background: n = null } = {}) {
  const { width: s, height: i } = Ki(e), r = e.cloneNode(!0);
  r.setAttribute("width", String(s)), r.setAttribute("height", String(i)), r.removeAttribute("style"), r.getAttribute("xmlns") || r.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const a = new XMLSerializer().serializeToString(r), c = URL.createObjectURL(new Blob([a], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const d = await Vi(c), u = document.createElement("canvas");
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
function zi(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result).split(",", 2)[1] || ""), s.onerror = () => n(new Error("画像データを読めませんでした。")), s.readAsDataURL(e);
  });
}
async function Dn(e) {
  if (!navigator.clipboard?.write || typeof ClipboardItem > "u")
    throw new Error("このブラウザは画像のクリップボードコピーに対応していません。");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": e })]);
}
const Gi = [
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
], Yi = ["<==>", "<-.->", "<-->", "<->", "-.->", "-.-", "-->", "---", "==>", "===", "--x", "--o"], ps = [
  { open: "-.", closers: [[".->", "-.->"], [".-", "-.-"]] },
  { open: "--", closers: [["-->", "-->"], ["---", "---"], ["--x", "--x"], ["--o", "--o"]] },
  { open: "==", closers: [["==>", "==>"], ["===", "==="], ["==x", "==x"], ["==o", "==o"]] }
], Zi = ps.flatMap((e) => e.closers.map(([t]) => t)), Xi = /^\s*(?:flowchart(?:-elk)?|graph)(?:\s+[A-Za-z]{2})?\s*;?\s*(?:%%.*)?$/i, Ji = /^\s*(classDef|class|style|linkStyle|click|direction|accTitle|accDescr|title)\b/i, Qi = /^[A-Za-z0-9_\u0080-\uFFFF][A-Za-z0-9_.\-\u0080-\uFFFF]*/, er = /^(\s*class\s+)([^\s;]+)(\s+.*)$/i, tr = /^(\s*style\s+)([^\s;,]+)(\s+.*)$/i, nr = /^(\s*linkStyle\s+)(\d+(?:\s*,\s*\d+)*)(\s+.*)$/i;
function Qt(e) {
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
    const r = s;
    s += i.length + 1;
    const a = r + i.length;
    if (!i.trim()) continue;
    if (/^\s*%%/.test(i)) {
      Ye(t, i, r, a);
      continue;
    }
    if (Xi.test(i)) {
      t.hasHeader = !0, Ye(t, i, r, a);
      continue;
    }
    if (/^\s*(subgraph|end)\b/i.test(i))
      return t.supported = !1, t.reason = "subgraph を含む図は編集できません", t;
    if (Ji.test(i)) {
      Ye(t, i, r, a);
      continue;
    }
    const c = rr(i, r, a);
    if (!c) {
      Ye(t, i, r, a);
      continue;
    }
    if (!t.indent && c.type !== "other" && (t.indent = c.indent), t.statements.push(c), c.type === "node")
      Fn(t, c.ref);
    else {
      c.refs.forEach((d) => Fn(t, d));
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
const Ge = /* @__PURE__ */ new Map(), sr = 100;
function ir(e) {
  const t = Ge.get(e);
  if (t) return t;
  const n = Qt(e), s = { ok: n.supported, reason: n.reason };
  return Ge.size >= sr && Ge.clear(), Ge.set(e, s), s;
}
function Ye(e, t, n, s) {
  const i = { type: "other", start: n, end: s, indent: ms(t) };
  let r;
  (r = er.exec(t)) ? i.cls = {
    ids: r[2].split(",").map((a) => a.trim()).filter(Boolean),
    span: { start: n + r[1].length, end: n + r[1].length + r[2].length }
  } : (r = tr.exec(t)) ? i.styleNode = r[2] : (r = nr.exec(t)) && (i.link = {
    indices: r[2].split(",").map((a) => parseInt(a, 10)),
    span: { start: n + r[1].length, end: n + r[1].length + r[2].length }
  }), e.statements.push(i);
}
function ms(e) {
  const t = /^([ \t]*)/.exec(e);
  return t ? t[1] : "";
}
function rr(e, t, n, s) {
  const i = ms(e), r = { pos: i.length }, a = () => {
    for (; r.pos < e.length && /\s/.test(e[r.pos]); ) r.pos++;
  }, c = () => t + r.pos;
  function d() {
    a();
    const x = Qi.exec(e.slice(r.pos));
    if (!x) return null;
    let v = x[0];
    const L = v.search(/--|-\.|\.-/);
    if (L > 0 && (v = v.slice(0, L)), v = v.replace(/[-.]+$/, ""), !v) return null;
    const M = c();
    r.pos += v.length;
    const N = { id: v, span: { start: M, end: M + v.length }, def: null };
    for (const [I, P] of Gi) {
      if (!e.startsWith(I, r.pos)) continue;
      const j = r.pos + I.length;
      let D = -1, re = !1, A = j;
      if (e[j] === '"') {
        re = !0, A = j + 1;
        let H = A;
        for (; H < e.length; ) {
          if (e[H] === "\\" && e[H + 1] === '"') {
            H += 2;
            continue;
          }
          if (e[H] === '"') {
            D = H;
            break;
          }
          H++;
        }
        if (D < 0 || !e.startsWith(P, D + 1)) return null;
      } else {
        const H = e.indexOf(P, j);
        if (H < 0) return null;
        D = H;
      }
      const z = D + (re ? 1 : 0) + P.length;
      let X = z;
      const he = /^:::[A-Za-z0-9_-]+/.exec(e.slice(z));
      return he && (X = z + he[0].length), N.def = {
        label: e.slice(A, D),
        quoted: re,
        shape: [I, P],
        cls: he ? he[0] : "",
        labelSpan: { start: t + A, end: t + D },
        span: { start: M, end: t + X },
        raw: e.slice(M - t, X)
      }, r.pos = X, N.span = { start: M, end: t + X }, N;
    }
    return N;
  }
  function u() {
    a();
    for (const x of Yi) {
      if (!e.startsWith(x, r.pos)) continue;
      const v = c();
      r.pos += x.length;
      const L = {
        text: x,
        mid: null,
        span: { start: v, end: c() },
        label: null,
        labelSpan: null,
        pipeSpan: null
      };
      if (a(), e[r.pos] === "|") {
        const M = e.indexOf("|", r.pos + 1);
        if (M < 0) return null;
        L.label = e.slice(r.pos + 1, M), L.pipeSpan = { start: c(), end: t + M + 1 }, L.labelSpan = { start: c() + 1, end: t + M }, r.pos = M + 1;
      }
      return L;
    }
    return f();
  }
  function f() {
    for (const x of ps) {
      if (!e.startsWith(x.open, r.pos)) continue;
      const v = c(), L = r.pos + x.open.length;
      let M = -1, N = "", I = "";
      for (let A = L; A < e.length && M < 0; A++)
        for (const [z, X] of x.closers)
          if (e.startsWith(z, A)) {
            M = A, N = z, I = X;
            break;
          }
      if (M < 0) continue;
      const P = e.slice(L, M);
      if (!P.trim()) continue;
      r.pos = M + N.length;
      const j = P.length - P.replace(/^\s+/, "").length, D = P.trim(), re = t + L + j;
      return {
        text: I,
        // mid があるものは「中置ラベル形式」。raw をそのまま書き戻せば見た目が保たれる。
        mid: { open: x.open, close: N },
        raw: e.slice(v - t, r.pos),
        span: { start: v, end: c() },
        label: D,
        labelSpan: { start: re, end: re + D.length },
        pipeSpan: null
      };
    }
    return null;
  }
  function w() {
    return a(), e[r.pos] === ";" && (r.pos++, a()), r.pos >= e.length || e.slice(r.pos).startsWith("%%");
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
function Fn(e, t) {
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
function Ae(e, t) {
  if (!e) return '" "';
  let n = e.replace(/"/g, "#quot;");
  const s = new Set(t.split(""));
  return (n.includes("|") || [...n].some((i) => s.has(i))) && (n = `"${n}"`), n;
}
function or(e) {
  return (e || "").replace(/#quot;/g, '"').replace(/#124;/g, "|");
}
const ar = /<br\s*\/?>/gi;
function Bn(e) {
  return or(e).replace(ar, `
`);
}
function Ct(e) {
  return String(e ?? "").replace(/\r\n?/g, `
`).split(`
`).join("<br/>");
}
function hs(e) {
  return String(e ?? "").replace(/"/g, "#quot;").replace(/\|/g, "#124;");
}
function cr(e) {
  return e.mid ? e.raw : e.text + (e.label != null ? `|${e.label}|` : "");
}
function $e(e) {
  return e.def ? e.def.raw : e.id;
}
function lr(e) {
  for (let t = 1; ; t++) {
    const n = `N${t}`;
    if (!e.has(n)) return n;
  }
}
function gs(e, t) {
  const n = e.statements[e.statements.length - 1], s = e.indent || "";
  return n ? { at: n.end, prefix: `
` + s } : { at: 0, prefix: "" };
}
function dr(e, t, n, s) {
  const i = e.nodes.get(n);
  if (!i) return [];
  const r = ws(i);
  if (r.length)
    return gt(r.map((c) => ({
      start: c.labelSpan.start,
      end: c.labelSpan.end,
      text: c.quoted ? s.replace(/"/g, "#quot;") : Ae(s, c.shape[1])
    })));
  const a = i.firstRef;
  return [{ start: a.span.start, end: a.span.end, text: `${a.id}[${Ae(s, "]")}]` }];
}
function ws(e) {
  return e.defs?.length ? e.defs : e.def ? [e.def] : [];
}
function ur(e, t, n, s, i) {
  const r = e.nodes.get(n);
  if (!r) return [];
  const a = ws(r);
  if (!a.length) {
    const c = r.firstRef;
    return [{
      start: c.span.start,
      end: c.span.end,
      text: `${c.id}${s}${Ae(c.id, i)}${i}`
    }];
  }
  return a.every((c) => c.shape[0] === s && c.shape[1] === i) ? [] : gt(a.map((c) => ({
    start: c.span.start,
    end: c.span.end,
    text: `${n}${s}${c.quoted ? `"${c.label}"` : Ae(c.label, i)}${i}${c.cls || ""}`
  })));
}
function fr(e, t, n, s) {
  const i = e.edges[n];
  if (!i) return [];
  const r = i.arrow, a = hs(s);
  return r.mid ? s.trim() ? s.includes("|") || Zi.some((d) => s.includes(d)) || s !== s.trim() ? [{ start: r.span.start, end: r.span.end, text: `${r.text}|${a}|` }] : [{ start: r.labelSpan.start, end: r.labelSpan.end, text: a }] : [{ start: r.span.start, end: r.span.end, text: r.text }] : s.trim() ? r.labelSpan ? [{ start: r.labelSpan.start, end: r.labelSpan.end, text: a }] : [{ start: r.span.end, end: r.span.end, text: `|${a}|` }] : r.pipeSpan ? [{ start: r.pipeSpan.start, end: r.pipeSpan.end, text: "" }] : [];
}
function fe(e, t) {
  return e[t.end] === `
` ? { start: t.start, end: t.end + 1, text: "" } : t.start > 0 && e[t.start - 1] === `
` ? { start: t.start - 1, end: t.end, text: "" } : { start: t.start, end: t.end, text: "" };
}
function en(e, t, n, s = -1) {
  const i = [], r = /* @__PURE__ */ new Set();
  return e.arrows.forEach((a, c) => {
    if (!t.has(c)) return;
    const [d, u] = c === s ? [e.refs[c + 1], e.refs[c]] : [e.refs[c], e.refs[c + 1]];
    i.push(`${$e(d)} ${cr(a)} ${$e(u)}`), r.add(c), r.add(c + 1);
  }), e.refs.forEach((a, c) => {
    a.def && !r.has(c) && !(n && n.has(a.id)) && i.push($e(a));
  }), i.map((a) => e.indent + a).join(`
`);
}
function gt(e) {
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
function vs(e, t, n) {
  if (!n.size) return [];
  const s = [...n], i = (a) => a - s.filter((c) => c < a).length, r = [];
  for (const a of e.statements) {
    if (!a.link) continue;
    const c = a.link.indices.filter((d) => !n.has(d)).map(i);
    if (!c.length) {
      r.push(fe(t, a));
      continue;
    }
    c.join(",") !== a.link.indices.join(",") && r.push({ start: a.link.span.start, end: a.link.span.end, text: c.join(",") });
  }
  return r;
}
function pr(e, t, n) {
  const s = [];
  for (const i of e.statements) {
    if (i.styleNode === n) {
      s.push(fe(t, i));
      continue;
    }
    if (!i.cls || !i.cls.ids.includes(n)) continue;
    const r = i.cls.ids.filter((a) => a !== n);
    s.push(r.length ? { start: i.cls.span.start, end: i.cls.span.end, text: r.join(",") } : fe(t, i));
  }
  return s;
}
function mr(e, t, n) {
  const s = e.edges[n];
  if (!s) return [];
  const i = e.statements[s.stmtIdx], r = vs(e, t, /* @__PURE__ */ new Set([n]));
  if (i.arrows.length === 1)
    r.push(fe(t, i));
  else {
    const a = /* @__PURE__ */ new Set();
    i.arrows.forEach((c, d) => {
      d !== s.indexInStmt && a.add(d);
    }), r.push({ start: i.start, end: i.end, text: en(i, a, null) });
  }
  return gt(r);
}
function hr(e, t, n, s) {
  const i = e.edges[n];
  if (!i || i.arrow.text === s) return [];
  const r = i.arrow;
  if (r.mid) {
    const a = r.label ? `|${r.label.replace(/\|/g, "#124;")}|` : "";
    return [{ start: r.span.start, end: r.span.end, text: s + a }];
  }
  return [{ start: r.span.start, end: r.span.end, text: s }];
}
function gr(e, t, n) {
  const s = e.edges[n];
  if (!s) return [];
  const i = e.statements[s.stmtIdx], r = new Set(i.arrows.map((a, c) => c));
  return [{
    start: i.start,
    end: i.end,
    text: en(i, r, null, s.indexInStmt)
  }];
}
function wr(e, t, { label: n = "新規ノード" } = {}) {
  const s = lr(e.nodes), { at: i, prefix: r } = gs(e);
  return { edits: [{ start: i, end: i, text: `${r}${s}[${Ae(n, "]")}]` }], id: s };
}
function vr(e, t, n, s, i = "") {
  const r = (d) => {
    const u = e.nodes.get(d);
    return u ? u.def ? u : { id: d, def: null } : { id: d, def: { raw: `${d}[新規ノード]` } };
  }, a = i ? `|${hs(i)}|` : "", c = gs(e);
  return {
    edits: [{
      start: c.at,
      end: c.at,
      text: `${c.prefix}${$e(r(n))} -->${a} ${$e(r(s))}`
    }]
  };
}
function yr(e, t, n) {
  const s = [], i = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set();
  e.edges.forEach((a, c) => {
    if (!(a.from !== n && a.to !== n)) {
      if (r.add(c), !i.has(a.stmtIdx)) {
        const d = e.statements[a.stmtIdx];
        i.set(a.stmtIdx, new Set(d.arrows.map((u, f) => f)));
      }
      i.get(a.stmtIdx).delete(a.indexInStmt);
    }
  });
  for (const [a, c] of i) {
    const d = e.statements[a];
    if (d.arrows.length === 1) {
      s.push(fe(t, d));
      continue;
    }
    const u = en(d, c, /* @__PURE__ */ new Set([n]));
    s.push(u ? { start: d.start, end: d.end, text: u } : fe(t, d));
  }
  for (const a of e.statements)
    a.type === "node" && a.ref.id === n && s.push(fe(t, a));
  return s.push(...pr(e, t, n)), s.push(...vs(e, t, r)), gt(s);
}
function Er(e, t) {
  for (const n of e.statements)
    if (n.start <= t && t <= n.end) return { start: n.start, end: n.end };
  return null;
}
function br(e, t) {
  let n = e;
  for (const s of [...t].sort((i, r) => r.start - i.start))
    n = n.slice(0, s.start) + s.text + n.slice(s.end);
  return n;
}
function Je(e, t) {
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
function Qe(e, t) {
  const n = t.nodes;
  let s = null, i = null, r = null;
  for (const c of e.classList || [])
    c.startsWith("LS-") && (s = c.slice(3)), c.startsWith("LE-") && (i = c.slice(3));
  if (!(s && i && n.has(s) && n.has(i))) {
    const c = /[LE]-(.+)-(\d+)$/.exec(e.id || "") || /[LE]_(.+)_(\d+)$/.exec(e.id || "");
    if (!c) return null;
    r = parseInt(c[2], 10);
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
  }), a.length ? a.length === 1 || r == null ? a[0] : a[Math.min(r, a.length - 1)] : null;
}
const xr = [
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
], kr = [
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
], St = "|", Lr = 'input, textarea, select, [contenteditable="true"], .monaco-editor';
function Cr(e, t, n = !1) {
  const s = e.querySelector(".mermaid-tools-status");
  s && (s.textContent = t, s.className = "mermaid-tools-status" + (n ? " error" : ""), setTimeout(() => {
    s.textContent === t && (s.textContent = "", s.className = "mermaid-tools-status");
  }, 6e3));
}
function Pt(e, t, n, s = null) {
  if (e.querySelector(":scope > .mermaid-editbar")) return null;
  const i = Qt(t.src);
  if (!i.supported)
    return Cr(e, `⚠ この図は編集できません（${i.reason}）`, !0), n.onExit?.(), null;
  e.classList.add("mermaid-editing");
  const r = { selected: null, arrowPick: null, busy: !1 }, a = document.createElement("div");
  a.className = "mermaid-editbar";
  const c = (p, g, E) => {
    const k = document.createElement("button");
    return k.type = "button", k.textContent = p, k.title = g, k.addEventListener("click", E), a.appendChild(k), k;
  }, d = c("ラベル編集", "選択中のノード/矢印のラベルを編集", yi);
  c("➕ ノード", "ノードを追加（追加後にラベルを編集できます）", Ei);
  const u = c("➕ 矢印", "矢印を追加（始点→終点の順にノードをクリック）", bi), f = c("⇄ 反転", "選択中の矢印の向きを入れ替える", xi), w = document.createElement("select");
  w.className = "mermaid-arrow-kind", w.title = "選択中の矢印の線種を変える";
  for (const [p, g] of xr) {
    const E = document.createElement("option");
    E.value = p, E.textContent = g, w.appendChild(E);
  }
  w.addEventListener("change", ki), a.appendChild(w);
  const m = document.createElement("select");
  m.className = "mermaid-node-shape", m.title = "選択中のノードの形状を変える";
  for (const [p, g, E] of kr) {
    const k = document.createElement("option");
    k.value = p + St + g, k.textContent = E, m.appendChild(k);
  }
  m.addEventListener("change", Li), a.appendChild(m);
  const h = c("削除", "選択中のノード/矢印を削除（Delete キーでも可。Ctrl+Z で戻せます）", Sn), y = document.createElement("span");
  y.className = "mermaid-edit-hint", a.appendChild(y), c("✓ 完了", "編集モードを終了（Esc でも可）", () => Ce(!0)), e.appendChild(a);
  const b = (p) => {
    y.textContent = p;
  }, x = (p) => {
    if (![...w.options].some((g) => g.value === p)) {
      const g = document.createElement("option");
      g.value = p, g.textContent = p, w.appendChild(g);
    }
    w.value = p;
  }, v = (p) => {
    const [g, E] = p || ["[", "]"], k = g + St + E;
    if (![...m.options].some((C) => C.value === k)) {
      const C = document.createElement("option");
      C.value = k, C.textContent = `${g}…${E}`, m.appendChild(C);
    }
    m.value = k;
  }, L = () => {
    if (!n.reveal) return;
    const p = r.selected;
    if (!p) {
      n.reveal(null);
      return;
    }
    if (p.kind === "node") {
      const k = i.nodes.get(p.id), C = k?.def ? k.def.span : k?.firstRef?.span;
      n.reveal(C ? { line: Er(i, C.start), focus: C } : null);
      return;
    }
    const g = i.edges[p.idx], E = g ? i.statements[g.stmtIdx] : null;
    n.reveal(g ? { line: E ? { start: E.start, end: E.end } : null, focus: g.arrow.span } : null);
  }, M = () => {
    const p = r.selected, g = p?.kind === "edge", E = p?.kind === "node";
    d.disabled = !p, h.disabled = !p, d.textContent = g ? "ラベル編集（矢印）" : "ラベル編集", f.classList.toggle("hidden", !g), w.classList.toggle("hidden", !g), m.classList.toggle("hidden", !E), u.classList.toggle("active", !!r.arrowPick), g && x(i.edges[p.idx]?.arrow.text || "-->"), E && v(i.nodes.get(p.id)?.def?.shape), r.arrowPick ? b(r.arrowPick.from ? `➕ 矢印: 始点 ${r.arrowPick.from} → 終点のノードをクリック（Escで中止）` : "➕ 矢印: 始点のノードをクリック（Escで中止）") : b(p ? p.kind === "node" ? `選択中: ノード ${p.id}（Delete で削除）` : "選択中: 矢印（Delete で削除）" : "クリック: 選択 ／ ダブルクリック: ラベル編集 ／ Esc: 終了"), L();
  };
  M();
  const N = () => {
    e.querySelectorAll(".selected").forEach((p) => p.classList.remove("selected")), r.selected = null;
  }, I = (p) => [...e.querySelectorAll("g[id*='flowchart-']")].find((g) => Je(g.id, i.nodes) === p) || null, P = (p) => [...e.querySelectorAll("path.flowchart-link")].find((g) => Qe(g, i) === p) || null, j = (p, g) => {
    N(), r.selected = { kind: "node", id: p }, (g || I(p))?.classList.add("selected"), M();
  }, D = (p, g) => {
    N(), r.selected = { kind: "edge", idx: p }, (g || P(p))?.classList.add("selected"), M();
  }, re = () => {
    const p = r.selected;
    if (!p) return null;
    if (p.kind === "node") return { kind: "node", id: p.id };
    const g = i.edges[p.idx];
    return g ? { kind: "edge", from: g.from, to: g.to } : null;
  }, A = (p, { editNodeId: g = null, selection: E } = {}) => {
    if (r.busy || !p || !p.length) return;
    r.busy = !0, n.applyEdits(t.src, p, {
      editNodeId: g,
      selection: E === void 0 ? re() : E
    }) || Ce(!1);
  }, z = e.querySelector(":scope > .mermaid-canvas") || e, X = (p, g) => {
    const E = z.getBoundingClientRect();
    return { x: p - E.left + z.scrollLeft, y: g - E.top + z.scrollTop };
  }, he = (p) => {
    const g = p.getBoundingClientRect(), E = X(g.left, g.top);
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
  }, Ln = (p) => {
    if (!p) return { left: 8, top: 8, width: 180 };
    const g = X(p.x, p.y);
    return { left: g.x - 90, top: g.y - 14, width: 180 };
  }, vi = (p, g) => {
    const E = I(p), k = I(g);
    if (!E || !k) return { left: 8, top: 8, width: 180 };
    const C = E.getBoundingClientRect(), W = k.getBoundingClientRect();
    return Ln({
      x: (C.left + C.width / 2 + W.left + W.width / 2) / 2,
      y: (C.top + C.height / 2 + W.top + W.height / 2) / 2
    });
  }, bt = ({ left: p, top: g, width: E, value: k, placeholder: C }, W) => {
    e.querySelectorAll(".mermaid-inline-input").forEach((te) => te.remove());
    const T = document.createElement("textarea");
    T.className = "mermaid-inline-input", T.rows = 1, T.value = k || "", C && (T.placeholder = C), T.style.left = `${Math.max(0, p)}px`, T.style.top = `${Math.max(0, g)}px`, T.style.width = `${Math.max(160, E)}px`, z.appendChild(T);
    const ge = () => {
      T.style.height = "auto", T.style.height = `${T.scrollHeight}px`;
    };
    ge(), T.focus(), T.select();
    let Se = !1;
    const kt = (te) => {
      if (Se) return;
      Se = !0;
      const Si = T.value;
      T.remove(), te && W(Si);
    };
    T.addEventListener("keydown", (te) => {
      te.stopPropagation(), te.key === "Enter" && !te.shiftKey ? (te.preventDefault(), kt(!0)) : te.key === "Escape" && kt(!1);
    }), T.addEventListener("input", ge), T.addEventListener("blur", () => kt(!0));
  }, xt = (p, g) => {
    const E = Bn(i.nodes.get(g)?.def?.label ?? ""), k = he(p);
    bt({
      left: k.left,
      top: k.top,
      width: k.width + 24,
      value: E,
      placeholder: "ノードラベル（Shift+Enter で改行）"
    }, (C) => {
      C !== E && A(dr(i, t.src, g, Ct(C)));
    });
  }, Cn = (p, g) => {
    const E = Bn(i.edges[p]?.arrow?.label || ""), k = Ln(g ? H(g) : null);
    bt(
      { ...k, value: E, placeholder: "矢印ラベル（Shift+Enter で改行・空で削除）" },
      (C) => {
        C !== E && A(fr(i, t.src, p, Ct(C)));
      }
    );
  };
  function yi() {
    const p = r.selected;
    if (p)
      if (p.kind === "node") {
        const g = I(p.id);
        g && xt(g, p.id);
      } else
        Cn(p.idx, P(p.idx));
  }
  function Ei() {
    const { edits: p, id: g } = wr(i, t.src, {});
    A(p, { editNodeId: g, selection: { kind: "node", id: g } });
  }
  function bi() {
    r.arrowPick = r.arrowPick ? null : {}, N(), M();
  }
  function xi() {
    const p = r.selected;
    if (p?.kind !== "edge") return;
    const g = i.edges[p.idx];
    g && A(
      gr(i, t.src, p.idx),
      { selection: { kind: "edge", from: g.to, to: g.from } }
    );
  }
  function ki() {
    const p = r.selected;
    p?.kind === "edge" && A(hr(i, t.src, p.idx, w.value));
  }
  function Li() {
    const p = r.selected;
    if (p?.kind !== "node") return;
    const [g, E] = m.value.split(St);
    A(ur(i, t.src, p.id, g, E));
  }
  function Sn() {
    const p = r.selected;
    p && A(p.kind === "node" ? yr(i, t.src, p.id) : mr(i, t.src, p.idx), { selection: null });
  }
  const Ci = (p) => {
    const g = p.getBoundingClientRect(), E = g.left + g.width / 2, k = g.top + g.height / 2;
    let C = null, W = 1 / 0;
    for (const T of e.querySelectorAll("path.flowchart-link")) {
      const ge = H(T);
      if (!ge) continue;
      const Se = (ge.x - E) ** 2 + (ge.y - k) ** 2;
      Se < W && (W = Se, C = T);
    }
    return W < 1600 ? C : null;
  }, Mn = (p) => {
    const g = p.target.closest("path.flowchart-link");
    if (g) return g;
    const E = p.target.closest(".edgeLabel");
    return E ? Ci(E) : null;
  }, $n = (p) => {
    if (p.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const g = p.target.closest("g[id*='flowchart-']");
    if (g) {
      const k = Je(g.id, i.nodes);
      if (!k) return;
      if (r.arrowPick) {
        if (!r.arrowPick.from)
          r.arrowPick = { from: k }, N(), g.classList.add("selected"), M();
        else {
          const C = r.arrowPick.from;
          r.arrowPick = null, N(), M(), bt(
            { ...vi(C, k), value: "", placeholder: "矢印ラベル（空でも可・Shift+Enter で改行）" },
            (W) => A(
              vr(i, t.src, C, k, Ct(W)).edits,
              { selection: { kind: "edge", from: C, to: k } }
            )
          );
        }
        return;
      }
      j(k, g);
      return;
    }
    const E = Mn(p);
    if (E) {
      const k = Qe(E, i);
      if (k != null) {
        D(k, E);
        return;
      }
      b("⚠️ この矢印はソースと対応付けできませんでした（特殊な記法の可能性）。");
      return;
    }
    !r.arrowPick && r.selected && (N(), M());
  }, _n = (p) => {
    if (p.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const g = p.target.closest("g[id*='flowchart-']");
    if (g) {
      p.preventDefault();
      const C = Je(g.id, i.nodes);
      C && xt(g, C);
      return;
    }
    const E = Mn(p);
    if (!E) return;
    const k = Qe(E, i);
    k != null && (p.preventDefault(), D(k, E), Cn(k, E));
  }, Tn = (p) => {
    if (!e.isConnected) {
      Ce(!1);
      return;
    }
    if (!p.target?.closest?.(Lr)) {
      if (p.key === "Escape") {
        if (r.arrowPick) {
          r.arrowPick = null, N(), M();
          return;
        }
        Ce(!0);
        return;
      }
      if ((p.key === "Delete" || p.key === "Backspace") && r.selected) {
        p.preventDefault(), Sn();
        return;
      }
      if ((p.ctrlKey || p.metaKey) && !p.altKey) {
        const g = p.key.toLowerCase();
        g === "z" && !p.shiftKey ? (p.preventDefault(), n.undo?.()) : (g === "y" || g === "z" && p.shiftKey) && (p.preventDefault(), n.redo?.());
      }
    }
  };
  e.addEventListener("click", $n), e.addEventListener("dblclick", _n), document.addEventListener("keydown", Tn);
  function Ce(p) {
    e.removeEventListener("click", $n), e.removeEventListener("dblclick", _n), document.removeEventListener("keydown", Tn), e.classList.remove("mermaid-editing"), a.remove(), e.querySelectorAll(".mermaid-inline-input").forEach((g) => g.remove()), N(), n.reveal?.(null), p && n.onExit?.();
  }
  return s && requestAnimationFrame(() => {
    if (!e.isConnected || !a.isConnected) return;
    const p = s.selection;
    if (p?.kind === "node" && i.nodes.has(p.id))
      j(p.id);
    else if (p?.kind === "edge") {
      const g = i.edges.findIndex((E) => E.from === p.from && E.to === p.to);
      g >= 0 && D(g);
    }
    if (s.editNodeId) {
      const g = I(s.editNodeId);
      g && xt(g, s.editNodeId);
    }
  }), () => Ce(!1);
}
function Sr(e) {
  const t = e.split(`
`), n = [];
  let s = 0;
  for (const r of t)
    n.push(s), s += r.length + 1;
  const i = [];
  for (let r = 0; r < t.length; r++) {
    const a = /^\s*(`{3,}|~{3,})\s*mermaid\b/i.exec(t[r]);
    if (!a) continue;
    const c = a[1], d = n[r] + t[r].length + 1;
    for (let u = r + 1; u < t.length; u++) {
      const f = /^\s*(`{3,}|~{3,})\s*$/.exec(t[u]);
      if (!f || f[1][0] !== c[0] || f[1].length < c.length) continue;
      const w = n[u];
      i.push({ start: d, end: w, content: e.slice(d, w) }), r = u;
      break;
    }
  }
  return i;
}
function Hn(e, t) {
  if (e.content === t) return { ...e, indent: "", toRaw: (f) => f };
  const n = e.content.split(`
`), s = t.split(`
`);
  if (n.length !== s.length) return null;
  const i = [], r = [];
  let a = 0, c = 0, d = "";
  for (let f = 0; f < n.length; f++) {
    const w = n[f].endsWith("\r") ? n[f].slice(0, -1) : n[f], m = s[f];
    if (!w.endsWith(m)) return null;
    const h = w.slice(0, w.length - m.length);
    if (/\S/.test(h)) return null;
    h && !d && (d = h), i.push(a + h.length), r.push(c), a += n[f].length + 1, c += m.length + 1;
  }
  return { ...e, indent: d, toRaw: (f) => {
    let w = 0, m = r.length - 1;
    for (; w < m; ) {
      const h = w + m + 1 >> 1;
      r[h] <= f ? w = h : m = h - 1;
    }
    return i[w] + (f - r[w]);
  } };
}
function ys(e, t, n = 0) {
  const s = Sr(e), i = s[n] ? Hn(s[n], t) : null;
  if (i) return i;
  for (const r of s) {
    const a = Hn(r, t);
    if (a) return a;
  }
  return null;
}
const O = window.markdownit ? window.markdownit({
  // html: false が最大の防御。AI の生成物と /api/web2md で取り込んだ外部ページを
  // innerHTML に入れる以上、生 HTML を通すわけにはいかない（<script> はエスケープされる）。
  // ここを true にするなら DOMPurify のベンダリングが必須になる。
  html: !1,
  linkify: !0,
  breaks: !1
}) : null, Ee = window.mermaid || null, Mr = () => O !== null;
Ee && Ee.initialize({
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
if (O) {
  const e = O.renderer.rules.link_open || ((s, i, r, a, c) => c.renderToken(s, i, r));
  O.renderer.rules.link_open = (s, i, r, a, c) => (s[i].attrSet("target", "_blank"), s[i].attrSet("rel", "noopener noreferrer"), e(s, i, r, a, c));
  const t = O.renderer.rules.image;
  O.renderer.rules.image = (s, i, r, a, c) => {
    const d = s[i].attrGet("src");
    return d && s[i].attrSet("src", _r(d)), t(s, i, r, a, c);
  };
  const n = O.renderer.rules.fence;
  O.renderer.rules.fence = (s, i, r, a, c) => {
    const d = s[i];
    if (d.info.trim().toLowerCase() === "mermaid" && Ee)
      return `<pre class="mermaid-src"${Te && d.map ? ` data-src-line="${d.map[0] + 1}" data-src-end="${d.map[1]}"` : ""}>
${Mt(d.content)}</pre>`;
    if (/^(?:yaml\s+)?mdflow-mapping$/i.test(d.info.trim())) {
      const u = /^diagram\s*:\s*(\S+)/m.exec(d.content);
      return `<details class="mdflow-mapping"><summary>⚙ ${u ? `条件マッピング: ${Mt(u[1])}` : "条件マッピング"}</summary><pre>${Mt(d.content)}</pre></details>`;
    }
    return n(s, i, r, a, c);
  }, O.inline.ruler.before("emphasis", "mark", (s, i) => {
    if (i || s.src.charCodeAt(s.pos) !== 61) return !1;
    const r = s.scanDelims(s.pos, !0);
    let a = r.length;
    if (a < 2) return !1;
    a % 2 && (s.push("text", "", 0).content = "=", a--);
    for (let c = 0; c < a; c += 2)
      s.push("text", "", 0).content = "==", s.delimiters.push({
        marker: 61,
        length: 0,
        token: s.tokens.length - 1,
        end: -1,
        open: r.can_open,
        close: r.can_close
      });
    return s.pos += r.length, !0;
  }), O.inline.ruler2.before("emphasis", "mark", (s) => {
    On(s, s.delimiters);
    for (const i of s.tokens_meta)
      i?.delimiters && On(s, i.delimiters);
    return !0;
  }), O.core.ruler.push("src_line", (s) => {
    if (Te)
      for (const i of s.tokens)
        !i.map || i.nesting < 0 || i.type === "inline" || (i.attrSet("data-src-line", String(i.map[0] + 1)), i.attrSet("data-src-end", String(i.map[1])));
  });
}
function On(e, t) {
  const n = [];
  for (const s of t) {
    if (s.marker !== 61 || s.end === -1) continue;
    const i = t[s.end];
    let r = e.tokens[s.token];
    r.type = "mark_open", r.tag = "mark", r.nesting = 1, r.markup = "==", r.content = "", r = e.tokens[i.token], r.type = "mark_close", r.tag = "mark", r.nesting = -1, r.markup = "==", r.content = "";
    const a = e.tokens[i.token - 1];
    a?.type === "text" && a.content === "=" && n.push(i.token - 1);
  }
  for (; n.length; ) {
    const s = n.pop();
    let i = s + 1;
    for (; i < e.tokens.length && e.tokens[i].type === "mark_close"; ) i++;
    if (i--, s !== i) {
      const r = e.tokens[i];
      e.tokens[i] = e.tokens[s], e.tokens[s] = r;
    }
  }
}
let _e = "", Te = !1;
function $r(e) {
  _e = e || "";
}
function _r(e) {
  if (/^(https?:|data:|blob:|\/)/i.test(e)) return e;
  const t = [];
  for (const n of `${_e}/${e}`.split("/"))
    if (!(!n || n === ".")) {
      if (n === "..") {
        t.pop();
        continue;
      }
      t.push(n);
    }
  return "/api/asset?path=" + encodeURIComponent(t.join("/"));
}
function Mt(e) {
  return e.replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}
let Ze = 0;
const Me = /* @__PURE__ */ new Map(), Tr = 50, rt = /* @__PURE__ */ new WeakMap(), jn = /* @__PURE__ */ new WeakMap(), Xe = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3], et = /* @__PURE__ */ new WeakMap();
function Nr(e, t) {
  return {
    get() {
      return et.get(e)?.get(t.index) || 1;
    },
    set(n) {
      let s = et.get(e);
      s || (s = /* @__PURE__ */ new Map(), et.set(e, s)), s.set(t.index, n);
    }
  };
}
function Rr(e) {
  et.delete(e);
}
function $t(e, t) {
  const n = Xe.findIndex((i) => i >= e - 1e-6), s = n < 0 ? Xe.length - 1 : n;
  return Xe[Math.min(Xe.length - 1, Math.max(0, s + t))];
}
function Es(e, t) {
  const n = e.querySelector("svg"), s = e.__mermaidNatural;
  if (!n || !s) return;
  n.style.width = `${Math.round(s.w * t)}px`, n.style.height = `${Math.round(s.h * t)}px`, n.style.maxWidth = "none";
  const i = e.querySelector(".mermaid-zoom-label");
  i && (i.textContent = `${Math.round(t * 100)}%`);
}
function Ir(e, t) {
  const n = document.createElement("span");
  n.className = "mermaid-zoom";
  const s = (a) => {
    t.set(a), Es(e, a);
  }, i = (a, c, d) => {
    const u = document.createElement("button");
    return u.type = "button", u.textContent = a, u.title = c, u.addEventListener("click", d), n.appendChild(u), u;
  };
  i("➖", "縮小（図の上で Ctrl+ホイールでも）", () => s($t(t.get(), -1)));
  const r = i("100%", "等倍に戻す", () => s(1));
  return r.className = "mermaid-zoom-label", i("➕", "拡大（図の上で Ctrl+ホイールでも）", () => s($t(t.get(), 1))), e.addEventListener("wheel", (a) => {
    a.ctrlKey && (a.preventDefault(), s($t(t.get(), a.deltaY < 0 ? 1 : -1)));
  }, { passive: !1 }), n;
}
function Ar(e, t) {
  Me.size >= Tr && Me.delete(Me.keys().next().value), Me.set(e, t);
}
let Dt = null;
function Pr(e) {
  Dt = e;
}
let Ft = null, Pe = null;
function Dr(e) {
  Ft = e;
}
function Fr(e) {
  Pe = e;
}
function Br(e, t, n = null) {
  const s = qi(t.src, t.index || 0), i = document.createElement("div");
  i.className = "mermaid-tools";
  const r = document.createElement("span");
  r.className = "mermaid-tools-status";
  const a = async (f, w, m) => {
    const h = f.textContent;
    f.disabled = !0, f.textContent = "⏳", r.className = "mermaid-tools-status", r.textContent = "";
    try {
      r.textContent = await m() || w;
    } catch (y) {
      r.className = "mermaid-tools-status error", r.textContent = y?.message || String(y);
    } finally {
      f.disabled = !1, f.textContent = h;
      const y = r.textContent;
      setTimeout(() => {
        r.textContent === y && (r.textContent = "", r.className = "mermaid-tools-status");
      }, 6e3);
    }
  }, c = (f = Bt()) => fs(e.querySelector("svg"), { background: f });
  if (i.appendChild(r), n && e.__mermaidNatural && i.appendChild(Ir(e, n)), t.editable && Ft) {
    const { ok: f, reason: w } = ir(t.src), m = document.createElement("button");
    m.type = "button", m.title = f ? "この図を直接編集する（ノード/矢印の操作がMermaidソースへ反映される）" : `この図は直接編集できません（${w}）`, m.textContent = "編集", m.disabled = !f, f && m.addEventListener("click", () => Ft(e, t)), i.appendChild(m);
  }
  if (Dt) {
    const f = document.createElement("button");
    f.type = "button", f.title = "PNG にしてワークスペースへ保存する（同じ図は同じ名前へ書き直す）", f.textContent = "保存", f.addEventListener("click", () => a(f, "保存しました", async () => `✓ ${await Dt(await c(), s)}`)), i.appendChild(f);
  }
  const d = document.createElement("button");
  d.type = "button", d.title = "PNG をクリップボードへコピーする", d.textContent = "コピー", d.addEventListener("click", () => a(d, "コピーしました", async () => (await Dn(await c()), "✓ コピーしました"))), i.appendChild(d);
  const u = document.createElement("button");
  return u.type = "button", u.title = "白背景のPNGをクリップボードへコピーする（資料や白いスライド向け）", u.textContent = "白でコピー", u.addEventListener("click", () => a(u, "白背景でコピーしました", async () => (await Dn(await c(Bt("white"))), "✓ 白背景でコピーしました"))), i.appendChild(u), i;
}
function Bt(e = "theme") {
  return e === "white" ? "#ffffff" : getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#1e1e2a";
}
function Wn(e, t = {}, n = null) {
  const s = document.createElement("div");
  s.className = "mermaid-box";
  const i = document.createElement("div");
  i.className = "mermaid-canvas", i.innerHTML = e, s.appendChild(i);
  const r = i.querySelector("svg"), a = r?.getAttribute("viewBox")?.trim().split(/[\s,]+/), c = a?.length === 4 ? parseFloat(a[2]) : NaN, d = a?.length === 4 ? parseFloat(a[3]) : NaN;
  return Number.isFinite(c) && Number.isFinite(d) && (s.__mermaidNatural = { w: c, h: d }), r && s.prepend(Br(s, t, n)), Es(s, n ? n.get() : 1), Pe && Pe(s, t), s;
}
async function Hr(e, t, n) {
  if (!Ee) return;
  const s = n.mdflow || null, i = jn.get(e) || /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  jn.set(e, r);
  let a = -1;
  for (const c of e.querySelectorAll("pre.mermaid-src")) {
    if (a += 1, rt.get(e) !== t) return;
    const d = c.textContent, u = s ? Or(d, s) : null;
    let f = u ? u.injected : d;
    const w = (L) => {
      c.dataset.srcLine && (L.dataset.srcLine = c.dataset.srcLine), c.dataset.srcEnd && (L.dataset.srcEnd = c.dataset.srcEnd), L.__mermaidMeta = m, c.replaceWith(L), u && L.after(jr(u, s));
    }, m = { src: d, index: a, editable: !!n.editable }, h = i.get(a);
    if (h && h.src === d && h.renderSrc === f) {
      h.meta.index = a, r.set(a, h), w(h.box), Pe && Pe(h.box, h.meta, !0);
      continue;
    }
    const y = (L) => (r.set(a, { src: d, renderSrc: f, box: L, meta: m }), L), b = Nr(e, m), x = Me.get(f);
    if (x) {
      w(y(Wn(x, m, b)));
      continue;
    }
    let v;
    try {
      ({ svg: v } = await Ee.render(`pixie-mermaid-${Ze++}`, f));
    } catch (L) {
      if (document.getElementById(`dpixie-mermaid-${Ze - 1}`)?.remove(), u && f !== d)
        try {
          f = d, { svg: v } = await Ee.render(`pixie-mermaid-${Ze++}`, f);
        } catch {
          document.getElementById(`dpixie-mermaid-${Ze - 1}`)?.remove(), v = null;
        }
      else
        v = null;
      if (v == null) {
        c.classList.add("mermaid-error"), c.title = `Mermaid の構文エラー: ${L?.message || L}`;
        continue;
      }
    }
    if (Ar(f, v), rt.get(e) !== t) return;
    w(y(Wn(v, m, b)));
  }
}
function Or(e, t) {
  if (!as()) return null;
  const n = Ri(e), s = Ai(t.doc.mappings, n);
  if (!s || !s.presets.length) return null;
  const i = t.conditions.get(n) || "";
  let r = {}, a = !1;
  if (i.trim())
    try {
      const m = JSON.parse(i);
      m && typeof m == "object" && !Array.isArray(m) ? r = m : a = !0;
    } catch {
      a = !0;
    }
  const c = t.doc.selected[n] || null, d = Bi(s, a ? {} : r, c);
  let u = e, f = [];
  d && ({ code: u, missing: f } = Oi(
    e,
    d.activeNodes,
    d.style,
    "mdflowActive",
    d.inactiveStyle
  ));
  const w = {};
  if (ls(e)) {
    const m = new Set(ds(e));
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
function jr(e, t) {
  const n = document.createElement("div");
  n.className = "mdflow-presets", n.dataset.diagram = e.diagramId;
  const s = document.createElement("div");
  s.className = "mdflow-presets-title", s.textContent = "条件プリセット", n.appendChild(s);
  const i = document.createElement("ul"), r = document.createElement("li");
  r.className = "mdflow-preset-item mdflow-auto", r.dataset.preset = "", r.textContent = "（条件で自動判定）", e.selectedName || r.classList.add("selected"), i.appendChild(r);
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
function je(e, t, n = {}) {
  if (!O) {
    e.classList.remove("md"), e.textContent = t;
    return;
  }
  e.classList.add("md");
  const s = _e, i = Te;
  n.assetBase != null && (_e = n.assetBase || ""), Te = !!n.sourceMap;
  try {
    e.innerHTML = O.render(t);
  } finally {
    n.assetBase != null && (_e = s), Te = i;
  }
  const r = (rt.get(e) || 0) + 1;
  return rt.set(e, r), Hr(e, r, n);
}
function bs(e, t) {
  e.classList.remove("md"), e.textContent = t;
}
let we = null;
function tt() {
  return typeof window.TurndownService == "function";
}
function Wr() {
  return tt() ? we || (we = new window.TurndownService({
    headingStyle: "atx",
    // # 見出し（アプリのノート記法と揃える）
    codeBlockStyle: "fenced",
    // ``` フェンス
    bulletListMarker: "-",
    emDelimiter: "_"
  }), window.turndownPluginGfm?.gfm && we.use(window.turndownPluginGfm.gfm), we.addRule("dropBrokenImg", {
    filter: (e) => e.nodeName === "IMG" && !e.getAttribute("src"),
    replacement: () => ""
  }), we) : null;
}
function Ur(e) {
  const t = Wr();
  if (!t) throw new Error("Turndown が未取得です（python -m pipenv run python scripts/fetch_turndown.py を実行してください）");
  return t.turndown(e);
}
const l = (e) => document.getElementById(e), qr = 60;
let Ht = !0, Un = null;
function xs() {
  const e = l("messages");
  return e && e !== Un && (Un = e, e.addEventListener("scroll", () => {
    Ht = Kr(e);
  })), e;
}
function Kr(e) {
  return e.scrollHeight - e.scrollTop - e.clientHeight <= qr;
}
function $(e, t, n = {}) {
  const s = document.createElement("div");
  s.className = "msg " + e;
  const i = document.createElement("div");
  return i.className = "body", e === "assistant" ? je(i, t, n) : bs(i, t), s.appendChild(i), xs().appendChild(s), Y(e === "user"), s;
}
function ks(e, t) {
  if (!e || e.querySelector(".msg-del")) return;
  const n = document.createElement("button");
  n.className = "msg-del", n.type = "button", n.textContent = "削除", n.title = "この往復を削除（LLM の文脈からも消してコンテキストを節約する）", n.addEventListener("click", t), e.appendChild(n);
}
function Vr(e, t) {
  if (!e || e.querySelector(".msg-rollback")) return;
  const n = document.createElement("button");
  n.className = "msg-rollback", n.type = "button", n.textContent = "戻す", n.title = "このターンで変更されたファイルを、ターンの前の状態へ戻す（以降のターンで同じファイルに加えられた変更も巻き戻る）", n.addEventListener("click", t), e.appendChild(n);
}
function F(e, t, n = {}) {
  let s = e.querySelector(".tool-log");
  s || (s = document.createElement("div"), s.className = "tool-log", e.insertBefore(s, e.querySelector(".body")));
  const i = document.createElement("div");
  i.className = "tool-status", n.category && i.classList.add("status-" + n.category), n.tool && (i.dataset.tool = n.tool), i.textContent = t, s.appendChild(i), Y();
}
function Y(e = !1) {
  const t = xs();
  t && (e && (Ht = !0), Ht && (t.scrollTop = t.scrollHeight));
}
function Ot(e) {
  const t = e.indexOf("<think>");
  if (t < 0) return { think: "", visible: e };
  const n = e.lastIndexOf("</think>");
  return n < t ? { think: e.slice(t + 7), visible: e.slice(0, t) } : {
    think: e.slice(t + 7, n),
    visible: (e.slice(0, t) + e.slice(n + 8)).replace(/^\s+/, "")
  };
}
function Ls(e) {
  const t = e.split(`
`), n = [];
  let s = 0;
  for (const c of t)
    n.push(s), s += c.length + 1;
  const i = (c) => Math.min(e.length, n[c] + t[c].length), r = [];
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
    m < 0 || r.push({
      search: d.join(`
`),
      replace: w.join(`
`),
      start: n[c],
      end: i(m)
    });
  }
  return r;
}
function zr(e) {
  return Ls(e).map(({ search: t, replace: n }) => ({ search: t, replace: n }));
}
function Gr(e) {
  if (e = Ot(e).visible, !e.trim()) return "";
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
    if (i.length >= e.trim().length * 0.6) return Yr(i);
  }
  return e.trim();
}
function Yr(e) {
  return e.split(`
`).filter((t) => !/^(-|@@|---|\+\+\+)/.test(t)).map((t) => t.startsWith("+") || t.startsWith(" ") ? t.slice(1) : t).join(`
`).replace(/\n$/, "");
}
function We() {
  return crypto.randomUUID && crypto.randomUUID() || "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
S.select(We());
const o = {
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
    return S.busy.value;
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
    return S.state.sessionId;
  },
  set sessionId(e) {
    S.select(e, S.state.phase === "switching" ? S.active : void 0);
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
}, R = () => o.mode === "note", Ue = () => o.mode === "plan", Ne = () => o.mode === "code", Zr = {
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
}, wt = (e) => (e.split(".").pop() || "").toLowerCase(), tn = (e) => Zr[wt(e)] || "plaintext", Cs = (e) => !!e && ["md", "markdown"].includes(wt(e)), Xr = () => "";
let Ss = /* @__PURE__ */ new Set([".pptx", ".docx", ".xlsx", ".pdf"]);
const nn = (e) => Ss.has("." + wt(e));
window.__monacoReady.then((e) => {
  o.monaco = e, o.editor = e.editor.create(l("editor"), {
    value: "",
    language: "plaintext",
    theme: "vs-dark",
    automaticLayout: !0,
    minimap: { enabled: !1 },
    fontSize: 13,
    glyphMargin: !1
    // Note モードでは applyModeUI が true に切り替える（付箋グリフ用）
  }), o.noteDecorations = o.editor.createDecorationsCollection(), yt(), o.editor.onDidChangeModelContent(() => {
    Fs(), Bs(), zs();
  }), o.editor.onDidScrollChange(() => Ys()), o.editor.onDidChangeCursorSelection(ti), o.editor.addCommand(e.KeyMod.CtrlCmd | e.KeyCode.KeyS, () => Wt()), o.editor.addCommand(
    e.KeyMod.CtrlCmd | e.KeyMod.Shift | e.KeyCode.KeyP,
    () => zt()
  ), o.editor.addCommand(e.KeyMod.Alt | e.KeyCode.LeftArrow, () => Ut()), o.editor.addCommand(e.KeyMod.Alt | e.KeyCode.RightArrow, () => qt()), o.editor.addCommand(e.KeyMod.CtrlCmd | e.KeyCode.KeyE, () => Kt()), o.editor.onMouseDown((n) => {
    R() && n.target.type === e.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && sa(n.target.position.lineNumber);
  });
  const t = o.editor.getContainerDomNode();
  t.addEventListener("wheel", Gs, { passive: !0, capture: !0 }), t.addEventListener("paste", (n) => {
    if (!R()) return;
    const s = Jn(n.clipboardData);
    s && (n.preventDefault(), n.stopPropagation(), Qn(s));
  }, !0), t.addEventListener("dragover", (n) => {
    R() && n.dataTransfer?.types?.includes("Files") && (n.preventDefault(), n.stopPropagation());
  }, !0), t.addEventListener("drop", (n) => {
    if (!R() || !n.dataTransfer?.files?.length) return;
    n.preventDefault(), n.stopPropagation();
    const s = Jn(n.dataTransfer);
    if (!s) {
      alert("⚠️ 貼り付けられるのは画像ファイルだけです。");
      return;
    }
    Qn(s);
  }, !0), Jr();
});
async function Jr() {
  Pr(jo), Dr(zo), Fr(Yo), await Ms(), sn(), await vt(), await V(), R() && await an(), Za();
}
async function Ms() {
  try {
    jt(await ee("/api/mode"));
  } catch {
    jt({ mode: "code", features: {} });
  }
}
const Re = ["code", "plan", "note"], De = { code: "Code", plan: "Plan", note: "Note" };
function jt(e) {
  o.mode = Re.includes(e.mode) ? e.mode : "code", o.features = e.features || {}, Array.isArray(o.features.extract_exts) && (Ss = new Set(o.features.extract_exts)), o.copilotEnabled = !!o.features.copilot;
}
function sn() {
  const e = R(), t = l("mode-btn");
  for (const n of Re)
    document.body.classList.toggle("mode-" + n, o.mode === n), t.classList.toggle("mode-" + n, o.mode === n);
  t.textContent = De[o.mode], t.title = `現在: ${De[o.mode]} モード（クリックで次のモードへ切替）`, Ue() || pi(), o.editor?.updateOptions({ glyphMargin: e }), ti(), rn(), $s(), qe();
}
function $s() {
  const e = l("code-style-btn"), t = o.codeStyle === "plan";
  e.textContent = t ? "計画を先に" : "通常", e.title = t ? "Codeモードの進め方: 計画を先に — まず実行計画を提示し、承認してから実装する（クリックで通常へ切替）" : "Codeモードの進め方: 通常 — エージェントが自律的に実装（破壊操作は承認制）。クリックで計画優先へ切替";
}
function Qr() {
  o.codeStyle = o.codeStyle === "plan" ? "normal" : "plan", localStorage.setItem("pixie.codeStyle", o.codeStyle), $s(), $("system", o.codeStyle === "plan" ? "計画を先に: エージェントはまず実行計画を提示し、承認してから実装します。" : "通常: エージェントが自律的に実装します（破壊操作は従来どおり承認制）。");
}
function rn() {
  const e = !!o.copilotEnabled, t = l("copilot-bar");
  t && t.classList.toggle("hidden", !e);
  const n = l("settings-copilot-controls");
  n && n.classList.toggle("hidden", !e);
  const s = e ? `
（先頭に /copilot と書くと、これまでの調査をまとめて Copilot に質問し、回答を反映します。/copilot_simple ならローカル LLM を経由せず、そのまま直接質問）` : "", i = {
    note: "例）左の選択部分を、チェックした資料を参考にもう少し技術的な表現に。",
    plan: "例）設定画面にダークモードの切替を足したい。まず調べて実行計画を立てて。",
    code: "例）src/foo.py に入力値を検証する関数を追加して。テストも書いて実行して確認して。"
  };
  l("chat-input").placeholder = i[o.mode] + s + `
（/help でコマンド一覧）`;
}
function _s() {
  o.notes = [], o.noteDecorations?.clear(), o.refs = [], o.checkedRefs.clear(), o.checkedFiles.clear(), o.pendingTarget?.coll && o.pendingTarget.coll.clear(), o.pendingTarget = null, o.mdflowConditions.clear(), o.history = [], o.historyLoaded = !1, l("sel-chip").classList.add("hidden"), ie(), He();
}
async function eo() {
  const e = Re[(Re.indexOf(o.mode) + 1) % Re.length];
  await on(e, { confirm: !0 });
}
async function on(e, t = {}) {
  if (o.streaming)
    return alert("⚠️ 実行中はモードを切り替えられません。中断してから切り替えてください。"), !1;
  if (e === o.mode) return !0;
  if (t.confirm && !confirm(`${De[e]} モードに切り替えますか？
（会話セッションはリセットされます）`)) return !1;
  const n = S.begin("switching");
  if (!n) return;
  let s = "";
  try {
    await Ke();
    let i;
    try {
      i = await _("/api/mode", { mode: e });
    } catch (r) {
      return s = r.message, alert("⚠️ モードを切り替えられません: " + r.message), !1;
    }
    return jt(i), t.keepMessages || (l("messages").innerHTML = ""), l("approval").classList.add("hidden"), l("approval").innerHTML = "", o.assistantEl = null, o.sessionId = We(), Le(), _s(), sn(), await V(), R() ? (await an(), o.currentFile && (await wn(), await yn()), $("system", "Noteモードに切り替えました（読み取り専用エージェント・クリック反映）。")) : Ue() ? $("system", "Planモードに切り替えました（調べて実行計画を立てるだけ。承認するまでファイルは変更されません）。") : $("system", "Codeモードに切り替えました（自律エージェント・破壊操作は承認制）。"), !0;
  } catch (i) {
    return s = i.message, alert(i.message), !1;
  } finally {
    S.finish(n, s);
  }
}
async function an() {
  o.history = [], o.historyLoaded = !1, l("messages").innerHTML = "";
  let e;
  try {
    e = await ee("/api/chat/history");
  } catch (s) {
    F($("assistant", ""), `⚠️ 履歴を読み込めませんでした（${s.message}）。この保存先の履歴は、取り違えを防ぐため今回は保存しません。`);
    return;
  }
  let t = null, n = "";
  for (const s of e.messages || []) {
    o.history.push({ role: s.role, content: s.content });
    const i = $(s.role, s.content, { assetBase: Ve() });
    if (s.role === "user") {
      t = i, n = s.content;
      continue;
    }
    i._exchange = { userEl: t, userText: n }, ks(i, () => oi(i, 0)), t = null, n = "";
  }
  o.historyLoaded = !0;
}
async function cn() {
  if (o.historyLoaded)
    try {
      const e = await _("/api/chat/history", { messages: o.history });
      Array.isArray(e.messages) && (o.history = e.messages);
    } catch {
    }
}
async function to() {
  if (o.streaming) {
    alert("⚠️ 応答の生成中は履歴を消去できません。");
    return;
  }
  if (confirm("この保存先の会話履歴を消去しますか？")) {
    try {
      await q("/api/chat/history", { method: "DELETE" });
    } catch (e) {
      alert("⚠️ 履歴を消去できません: " + e.message);
      return;
    }
    o.history = [], o.historyLoaded = !0, l("messages").innerHTML = "";
  }
}
async function vt() {
  try {
    const e = await ee("/api/status");
    if (l("model-name").textContent = e.ready ? e.model || "(unset)" : "起動失敗", !e.ready) {
      l("agent-status").textContent = "  ⚠ " + (e.error || "engine not ready");
      return;
    }
    l("agent-status").textContent = `  ・${e.tools} tools`, Ts(e.workspace);
  } catch {
    l("model-name").textContent = "接続不可";
  }
}
function Ts(e) {
  if (!e) return;
  const t = l("root-path");
  t.textContent = e, t.title = e;
  const n = e.split(/[\\/]/).filter(Boolean).pop() || e;
  l("root-project-name").textContent = n || "(未設定)", l("root-project-btn").title = "ルートプロジェクト: " + e + "（クリックで変更）";
}
const ln = (e) => e.includes("/") ? e.slice(0, e.lastIndexOf("/")) : "";
function Ns(e, t) {
  const n = new Set((t.files || []).map((s) => s.path));
  for (const s of [...o.fsMap.keys()])
    ln(s) === e && !n.has(s) && no(s);
  for (const s of t.files || []) {
    const i = o.fsMap.get(s.path);
    i ? (i.size = s.size, i.text = s.text) : o.fsMap.set(s.path, { ...s, loaded: s.type === "dir" ? !1 : void 0 });
  }
  for (const s of t.files || [])
    s.type === "dir" && !o.knownDirs.has(s.path) && (o.knownDirs.add(s.path), o.collapsedDirs.add(s.path));
  t.truncated && (o.treeTruncated = !0);
}
async function ot(e) {
  const t = await K("/api/files/list?path=" + encodeURIComponent(e || ""));
  return t ? (Ns(e, t), !0) : !1;
}
function no(e) {
  for (const t of [...o.fsMap.keys()])
    (t === e || t.startsWith(e + "/")) && (o.fsMap.delete(t), o.checkedFiles.delete(t));
}
async function V() {
  o.treeTruncated = !1;
  const e = await K("/api/files/list?path=");
  if (e) {
    Ts(e.root), Ns("", e);
    for (const [t, n] of [...o.fsMap])
      n.type === "dir" && n.loaded && t && await ot(t);
    qe();
  }
}
function so(e) {
  if (!e) return !1;
  let t = "";
  for (const n of e.split("/"))
    if (t = t ? t + "/" + n : n, o.collapsedDirs.has(t)) return !0;
  return !1;
}
async function io(e) {
  const t = String(e || "").split("/");
  let n = "";
  for (const s of t.slice(0, -1)) {
    n = n ? n + "/" + s : s, o.fsMap.has(n) || await ot(ln(n));
    const i = o.fsMap.get(n);
    i && i.type === "dir" && !i.loaded && await ot(n) && (i.loaded = !0), o.collapsedDirs.delete(n);
  }
}
function qe() {
  const e = l("file-list");
  e.innerHTML = "";
  const t = [...o.fsMap.values()].filter((n) => !so(ln(n.path))).sort((n, s) => n.path < s.path ? -1 : n.path > s.path ? 1 : 0);
  for (const n of t) {
    const s = n.path.split("/"), i = document.createElement("li");
    i.dataset.path = n.path, i.dataset.type = n.type, i.style.paddingLeft = 8 + (s.length - 1) * 16 + "px", ro(i, n);
    const r = document.createElement("span"), a = document.createElement("span");
    if (a.className = "fname", a.textContent = s[s.length - 1], n.type === "dir")
      i.classList.add("dir"), r.textContent = o.collapsedDirs.has(n.path) ? "▸" : "▾", i.append(r, a), i.addEventListener("click", async () => {
        o.collapsedDirs.has(n.path) ? (o.collapsedDirs.delete(n.path), n.loaded || await ot(n.path) && (n.loaded = !0)) : o.collapsedDirs.add(n.path), qe();
      });
    else {
      if (!Ue())
        if (n.text || nn(n.path)) {
          const c = document.createElement("input");
          c.type = "checkbox", c.title = n.text ? "チャットのコンテキストに含める" : "チャットのコンテキストに含める（テキスト抽出して同梱。/copilot では原本を Copilot に添付）", c.checked = o.checkedFiles.has(n.path), c.addEventListener("click", (d) => d.stopPropagation()), c.addEventListener("change", () => {
            c.checked ? o.checkedFiles.add(n.path) : o.checkedFiles.delete(n.path);
          }), i.appendChild(c);
        } else {
          const c = document.createElement("span");
          c.className = "cb-pad", i.appendChild(c);
        }
      if (r.textContent = n.text ? "" : Xr(n.path), a.title = n.text ? n.path : `${n.path}（クリックで既定アプリで開く）`, i.append(r, a), i.classList.toggle("active", n.path === o.currentFile), o.changedPaths.has(n.path)) {
        i.classList.add("changed");
        const c = document.createElement("span");
        c.className = "changed-badge", c.textContent = "● 変更", i.appendChild(c);
      }
      i.addEventListener("click", () => n.text ? Q(n.path) : Ds(n.path));
    }
    i.addEventListener("contextmenu", (c) => {
      c.preventDefault(), co(c, n);
    }), e.appendChild(i);
  }
  l("files-trunc").classList.toggle("hidden", !o.treeTruncated);
}
let J = null;
function ro(e, t) {
  e.draggable = !0, e.addEventListener("dragstart", (n) => {
    J = t.path, n.dataTransfer.setData("text/plain", t.path), n.dataTransfer.effectAllowed = "move", e.classList.add("dragging");
  }), e.addEventListener("dragend", () => {
    J = null, e.classList.remove("dragging"), document.querySelectorAll("#file-list li.drop-target").forEach((n) => n.classList.remove("drop-target"));
  }), t.type === "dir" && (e.addEventListener("dragover", (n) => {
    const s = J;
    s === null || s === t.path || t.path.startsWith(s + "/") || (n.preventDefault(), n.dataTransfer.dropEffect = "move", e.classList.add("drop-target"));
  }), e.addEventListener("dragleave", () => e.classList.remove("drop-target")), e.addEventListener("drop", (n) => {
    n.preventDefault(), n.stopPropagation(), e.classList.remove("drop-target");
    const s = n.dataTransfer.getData("text/plain") || J;
    s && s !== t.path && Ps(s, t.path);
  }));
}
function oo() {
  const e = l("file-list");
  e.addEventListener("dragover", (t) => {
    J !== null && (t.target.closest("li") || (t.preventDefault(), t.dataTransfer.dropEffect = "move", e.classList.add("drop-root")));
  }), e.addEventListener("dragleave", (t) => {
    e.contains(t.relatedTarget) || e.classList.remove("drop-root");
  }), e.addEventListener("drop", (t) => {
    if (e.classList.remove("drop-root"), t.target.closest("li")) return;
    t.preventDefault();
    const n = t.dataTransfer.getData("text/plain") || J;
    n && Ps(n, "");
  });
}
function Fe() {
  l("fs-menu")?.remove();
}
function ao(e, t, n) {
  Fe();
  const s = document.createElement("div");
  s.id = "fs-menu";
  for (const r of n) {
    const a = document.createElement("div");
    a.className = r.onClick ? "fs-menu-item" : "fs-menu-head", a.textContent = r.label, r.title && (a.title = r.title), r.onClick && a.addEventListener("click", () => {
      Fe(), r.onClick();
    }), s.appendChild(a);
  }
  s.style.left = "0px", s.style.top = "0px", document.body.appendChild(s);
  const i = s.getBoundingClientRect();
  return s.style.left = Math.max(4, Math.min(e, window.innerWidth - i.width - 4)) + "px", s.style.top = Math.max(4, Math.min(t, window.innerHeight - i.height - 4)) + "px", s;
}
function Rs(e, t) {
  const n = e.getBoundingClientRect();
  return ao(n.left, n.bottom + 4, t);
}
function co(e, t) {
  Fe();
  const n = document.createElement("div");
  n.id = "fs-menu";
  const s = (i, r) => {
    const a = document.createElement("div");
    a.className = "fs-menu-item", a.textContent = i, a.addEventListener("click", () => {
      Fe(), r();
    }), n.appendChild(a);
  };
  t.type === "dir" ? (s("中に新規ファイル", () => at("file", t.path + "/")), s("中に新規フォルダ", () => at("dir", t.path + "/"))) : t.text || s("↗ 既定のアプリで開く", () => Ds(t.path)), s("名前変更・移動", () => lo(t)), s("削除", () => uo(t)), n.style.left = e.pageX + "px", n.style.top = e.pageY + "px", document.body.appendChild(n);
}
async function dn(e, t) {
  try {
    return await _(e, t), !0;
  } catch (n) {
    return alert("⚠️ " + n.message), !1;
  }
}
async function at(e, t = "") {
  const s = prompt(e === "dir" ? "新規フォルダ名（例: src/utils）" : "新規ファイル名（例: src/main.py）", t);
  if (!s || !s.trim() || s.trim() === t.trim()) return;
  const i = s.trim().replace(/\\/g, "/");
  await dn("/api/fs/create", { path: i, kind: e }) && (e === "dir" && o.collapsedDirs.delete(i), await V(), e === "file" && await Q(i));
}
async function lo(e) {
  const t = prompt("新しいパス（フォルダに入れるには src/名前.py のように）", e.path);
  !t || !t.trim() || t.trim() === e.path || await Is(e, t.trim().replace(/\\/g, "/"));
}
async function Is(e, t) {
  if (!t || t === e.path) return;
  if (e.type === "dir" && (t === e.path || t.startsWith(e.path + "/"))) {
    alert("⚠️ フォルダを自分自身の中へは移動できません。");
    return;
  }
  if (!await dn("/api/fs/rename", { src: e.path, dst: t })) return;
  const n = (s) => s === e.path ? t : e.type === "dir" && s.startsWith(e.path + "/") ? t + s.slice(e.path.length) : s;
  if (o.currentFile) {
    const s = n(o.currentFile);
    s !== o.currentFile && (o.currentFile = s, l("current-file").textContent = s);
  }
  o.checkedFiles = new Set([...o.checkedFiles].map(n)), As(n), await V();
}
function As(e) {
  const t = (n) => {
    const s = [];
    for (const i of n) {
      const r = e(i);
      r && r !== s[s.length - 1] && s.push(r);
    }
    return s;
  };
  o.navBack = t(o.navBack), o.navFwd = t(o.navFwd), o.navRecent = [...new Set(t(o.navRecent))], xe();
}
async function Ps(e, t) {
  const n = o.fsMap.get(e);
  if (!n) return;
  const s = e.split("/").pop(), i = t ? t + "/" + s : s;
  i !== e && e.split("/").slice(0, -1).join("/") !== t && await Is(n, i);
}
async function uo(e) {
  confirm(`「${e.path}」を削除しますか？`) && await dn("/api/fs/delete", { path: e.path }) && (o.checkedFiles.delete(e.path), As((t) => t === e.path ? null : t), o.currentFile === e.path && (o.currentFile = null, o.baseMtime = null, o.editor.setValue(""), yt(), U(), l("current-file").textContent = "（ファイル未選択）", ke(), xe(), R() && (await wn(), await yn())), await V());
}
async function Ds(e) {
  try {
    await _("/api/fs/open", { path: e });
  } catch (t) {
    alert("⚠️ 開けませんでした: " + t.message);
  }
}
async function Q(e, t, n = "push") {
  if (t || await Ke(), o.dirty && !t && e !== o.currentFile && !confirm("未保存の変更があります。破棄して開きますか？"))
    return;
  const s = await K("/api/file?path=" + encodeURIComponent(e));
  s && (n === "push" && o.currentFile && o.currentFile !== e && (o.navBack.push(o.currentFile), o.navFwd.length = 0), go(e), o.currentFile = e, o.baseMtime = s.mtime ?? null, o.conflictDeclined = !1, o.mdflowConditions.clear(), Go(), Rr(l("preview")), o.monaco.editor.setModelLanguage(o.editor.getModel(), tn(e)), o.editor.setValue(s.content), o.saveError = null, yt(), U(), l("current-file").textContent = e, ke(), xe(), pn(), await io(e), qe(), R() && (await wn(), await yn()));
}
let qn = null;
function yt() {
  o.savedVersionId = o.editor.getModel().getAlternativeVersionId(), o.dirty = !1;
}
function Fs() {
  o.currentFile && (o.dirty = o.editor.getModel().getAlternativeVersionId() !== o.savedVersionId, U());
}
function U(e) {
  const t = l("save-state");
  if (clearTimeout(qn), t.classList.remove("save-error"), t.title = "", e === "saving") {
    t.textContent = "保存中…";
    return;
  }
  if (e === "saved") {
    t.textContent = "保存済", qn = setTimeout(U, 1500);
    return;
  }
  if (o.saveError) {
    t.textContent = "⚠️ 保存失敗", t.classList.add("save-error"), t.title = o.saveError.message;
    return;
  }
  t.textContent = o.dirty ? "● 未保存" : "";
}
async function un() {
  for (; o.savePromise; ) await o.savePromise;
  if (!o.currentFile) return !1;
  o.savePromise = fo();
  try {
    return await o.savePromise;
  } finally {
    o.savePromise = null;
  }
}
async function fo() {
  const e = o.currentFile, t = o.editor.getValue(), n = o.editor.getModel().getAlternativeVersionId(), s = !o.fsMap.has(e), i = R();
  let r = null;
  i && (Et(), r = o.notes.map((d) => ({ ...d }))), clearTimeout(ct), o.saving = !0, U("saving");
  const a = o.currentFile === e ? o.baseMtime : null;
  let c;
  try {
    c = await _("/api/file", { path: e, content: t, base_mtime: a });
  } catch (d) {
    const u = d instanceof oe ? d : new oe(String(d), 0);
    if (u.status === 409) {
      const f = await mo(e, t);
      if (f) c = f;
      else
        return o.conflictDeclined = !0, o.saveError = new oe(
          "外部の変更があるため保存を見送りました（保存ボタン／Ctrl+S でもう一度判断できます）。",
          409
        ), U(), !1;
    } else
      return o.saveError = u, U(), !1;
  } finally {
    o.saving = !1;
  }
  if (o.currentFile === e && (o.baseMtime = c?.mtime ?? o.baseMtime), o.currentFile === e && (o.savedVersionId = n, Fs()), s && await V(), i)
    try {
      await vn(e, r);
    } catch (d) {
      return o.saveError = new oe(`本文は保存しましたが、付箋の保存に失敗しました: ${d.message}`, 0), U(), !0;
    }
  return o.saveError = null, o.conflictDeclined = !1, U("saved"), !0;
}
function Wt() {
  return o.conflictDeclined = !1, un();
}
const po = 2e3;
let ct = null;
function Bs() {
  clearTimeout(ct), R() && (o.conflictDeclined || !o.currentFile || !o.dirty || (ct = setTimeout(() => {
    if (o.dirty) {
      if (o.saving) {
        Bs();
        return;
      }
      un();
    }
  }, po)));
}
async function Ke() {
  clearTimeout(ct), R() && (o.conflictDeclined || o.currentFile && o.dirty && await un());
}
async function mo(e, t) {
  if (!confirm(
    `⚠️ ${e} は、開いた後に別の場所（他のエディタ・エージェント）で変更されています。

［OK］ この内容で上書きする
　　　相手の変更は 🕰 履歴 から元に戻せます。

［キャンセル］ 上書きしない
　　　手元の内容はエディタに残ります。相手の変更を見てから決められます。`
  )) return null;
  try {
    return await _("/api/file", { path: e, content: t, base_mtime: null, force: !0 });
  } catch (s) {
    return o.saveError = s instanceof oe ? s : new oe(String(s), 0), U(), null;
  }
}
const ho = 15;
function go(e) {
  o.navRecent = [e, ...o.navRecent.filter((t) => t !== e)].slice(0, ho);
}
function wo() {
  o.navBack.length = 0, o.navFwd.length = 0, o.navRecent.length = 0, xe();
}
function xe() {
  l("nav-back").disabled = !o.navBack.length, l("nav-fwd").disabled = !o.navFwd.length, l("recent-btn").disabled = o.navRecent.length < 2, l("history-btn").disabled = !o.currentFile;
  const e = o.navBack[o.navBack.length - 1];
  l("nav-back").title = e ? `戻る: ${e} (Alt+←)` : "戻る (Alt+←)";
  const t = o.navFwd[o.navFwd.length - 1];
  l("nav-fwd").title = t ? `進む: ${t} (Alt+→)` : "進む (Alt+→)";
}
async function Hs(e, t) {
  if (!t.length) return;
  const n = t[t.length - 1], s = o.currentFile;
  await Q(n, !1, "none"), o.currentFile === n && (t.pop(), s && e.push(s), xe());
}
const Ut = () => Hs(o.navFwd, o.navBack), qt = () => Hs(o.navBack, o.navFwd);
function Kt() {
  const e = o.navRecent.filter((t) => t !== o.currentFile).map((t) => ({ label: t, title: t, onClick: () => Q(t) }));
  e.length && Rs(l("recent-btn"), [{ label: "最近開いたファイル" }, ...e]);
}
let Be = null;
async function vo() {
  o.currentFile && (Be = null, l("hist-file").textContent = o.currentFile, l("hist-preview").textContent = "", l("hist-preview-head").textContent = "左の版を選ぶと内容が出ます。", l("hist-restore").disabled = !0, l("hist-modal").classList.remove("hidden"), await yo());
}
function nt() {
  l("hist-modal").classList.add("hidden");
}
async function yo() {
  const e = o.currentFile, t = await K("/api/history?path=" + encodeURIComponent(e)), n = l("hist-list");
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
      const i = document.createElement("li"), r = document.createElement("span");
      r.textContent = Os(s.saved_at);
      const a = document.createElement("span");
      a.className = "hint", a.textContent = `${s.size.toLocaleString()} B`, i.append(r, a), i.addEventListener("click", () => Eo(e, s, i)), n.appendChild(i);
    }
  }
}
function Os(e) {
  if (!e) return "(不明)";
  const t = new Date(e);
  if (isNaN(t)) return e;
  const n = (s) => String(s).padStart(2, "0");
  return `${t.getMonth() + 1}/${t.getDate()} ${n(t.getHours())}:${n(t.getMinutes())}:${n(t.getSeconds())}`;
}
async function Eo(e, t, n) {
  for (const i of l("hist-list").children) i.classList.remove("active");
  n.classList.add("active"), Be = t.id, l("hist-restore").disabled = !0, l("hist-preview-head").textContent = "読み込み中…";
  const s = await K(
    `/api/history/file?path=${encodeURIComponent(e)}&version_id=${encodeURIComponent(t.id)}`
  );
  !s || Be !== t.id || (l("hist-preview").textContent = s.content, l("hist-preview-head").textContent = `${Os(t.saved_at)} の内容`, l("hist-restore").disabled = !1);
}
async function bo() {
  const e = o.currentFile;
  if (!(!e || !Be) && confirm(`${e} をこの版に戻します。
今の内容も履歴に積まれるので、戻し間違えてもやり直せます。`)) {
    try {
      await _("/api/history/restore", { path: e, version_id: Be });
    } catch (t) {
      alert("⚠️ 復元に失敗: " + t.message);
      return;
    }
    nt(), await Q(e, !0, "none"), U("saved");
  }
}
let B = { favorites: [], recent: [], current: "" };
async function js() {
  const e = await K("/api/workspace/places");
  return e && (B = e), B;
}
const Ws = (e) => B.favorites.some((t) => xo(t.path, e)), xo = (e, t) => String(e || "").replace(/[\\/]+$/, "").toLowerCase() === String(t || "").replace(/[\\/]+$/, "").toLowerCase();
async function ko() {
  await js();
  const e = [], t = (n, s) => n.map((i) => ({
    label: `${s} ${i.name}${i.exists ? "" : "（見つかりません）"}`,
    title: i.path,
    onClick: i.exists ? () => xn(i.path) : void 0
  }));
  B.favorites.length && e.push({ label: "お気に入り" }, ...t(B.favorites, "⭐")), B.recent.length && e.push({ label: "最近使ったフォルダ" }, ...t(B.recent, "🕘")), e.push({ label: "フォルダを選ぶ…", onClick: Jt }), !B.favorites.length && !B.recent.length && e.unshift({ label: "行き先はまだありません（フォルダを移動すると溜まります）" }), Rs(l("places-btn"), e);
}
function Us() {
  const e = l("root-places");
  e.innerHTML = "";
  const t = (n, s, i, r) => {
    if (!s.length) return;
    const a = document.createElement("div");
    a.className = "places-head", a.textContent = n, e.appendChild(a);
    for (const c of s) {
      const d = document.createElement("div");
      d.className = "place-row", c.exists || d.classList.add("missing");
      const u = document.createElement("button");
      u.className = "place-go", u.textContent = `${i} ${c.name}`, u.title = c.exists ? `${c.path}（クリックでここへ移動）` : `${c.path}（見つかりません）`, u.disabled = !c.exists, u.addEventListener("click", () => xn(c.path));
      const f = document.createElement("button");
      f.className = "place-mini", f.textContent = "開く", f.title = "移動せずに中を見る", f.disabled = !c.exists, f.addEventListener("click", () => be(c.path));
      const w = document.createElement("button");
      w.className = "place-mini", w.textContent = r ? "★" : "☆", w.title = r ? "お気に入りから外す" : "お気に入りに入れる", w.addEventListener("click", () => qs(c.path, c.name)), d.append(u, f, w), e.appendChild(d);
    }
  };
  t("⭐ お気に入り", B.favorites, "⭐", !0), t("🕘 最近使ったフォルダ", B.recent, "🕘", !1), !B.favorites.length && !B.recent.length && (e.innerHTML = "<div class='hint'>よく使うフォルダは ☆ ボタンでお気に入りに入れておくと、次からここに出ます。</div>");
}
async function qs(e, t) {
  if (e) {
    try {
      Ws(e) ? B = await q(
        "/api/workspace/favorites?path=" + encodeURIComponent(e),
        { method: "DELETE" }
      ) : B = await _("/api/workspace/favorites", { path: e, name: t || "" });
    } catch (n) {
      alert("⚠️ " + n.message);
      return;
    }
    Us(), fn();
  }
}
function fn() {
  const e = l("root-input").value.trim(), t = l("root-fav-btn"), n = !!e && Ws(e);
  t.textContent = n ? "★" : "☆", t.title = n ? "お気に入りから外す" : "このフォルダをお気に入りに入れる", t.disabled = !e;
}
const Lo = 150, Co = 600;
let Kn = null, Ks = 0;
const Z = () => !l("preview").classList.contains("hidden"), Ve = () => o.currentFile && o.currentFile.includes("/") ? o.currentFile.slice(0, o.currentFile.lastIndexOf("/")) : "";
function ke() {
  const e = Cs(o.currentFile);
  l("preview-btn").disabled = !e, l("preview-btn").title = e ? "Markdown プレビューを表示 (Ctrl+Shift+P)" : "Markdown ファイル（.md）を開いているときだけ使えます";
  const t = l("richcopy-btn");
  t.disabled = !(e && Z()), t.title = e && Z() ? "プレビューの内容をリッチテキスト（HTML）とMarkdownでコピー。Confluence 等に貼り付け可" : "Markdown プレビュー表示中に使えます", !e && Z() && ei();
}
function Vs() {
  const e = o.editor.getValue();
  let t = e, n = 0;
  const s = {};
  if (R() && o.features.mdflow && as())
    try {
      const i = Ii(e);
      if (t = i.body, n = (e.slice(0, i.bodyOffset).match(/\n/g) || []).length, i.mappings.length) {
        s.mdflow = { doc: i, conditions: o.mdflowConditions };
        const r = document.activeElement;
        r?.classList?.contains("mdflow-cond") && (s.mdflow.focus = {
          diagramId: r.closest(".mdflow-presets")?.dataset.diagram,
          selStart: r.selectionStart,
          selEnd: r.selectionEnd
        });
      }
    } catch {
    }
  return { text: t, opts: s, lineOffset: n };
}
function pn() {
  if (!Z()) return;
  $r(Ve());
  const { text: e, opts: t, lineOffset: n } = Vs();
  t.editable = !0, t.sourceMap = !0, ut = n;
  const s = performance.now(), i = je(l("preview"), e, t);
  Ys(), Promise.resolve(i).then(() => {
    Ks = performance.now() - s;
  });
}
function So() {
  l("preview").addEventListener("click", (e) => {
    const t = e.target.closest(".mdflow-preset-item");
    if (!t) return;
    const n = t.closest(".mdflow-presets")?.dataset.diagram;
    if (!n) return;
    const s = t.dataset.preset || null, i = Wi(o.editor.getValue(), n, s);
    if (!i) return;
    const r = o.editor.getModel(), a = o.monaco.Range.fromPositions(
      r.getPositionAt(i.start),
      r.getPositionAt(i.end)
    );
    o.editor.executeEdits("mdflow-select", [{ range: a, text: i.text }]);
  }), l("preview").addEventListener("input", (e) => {
    const t = e.target.closest(".mdflow-cond");
    if (!t) return;
    const n = t.closest(".mdflow-presets")?.dataset.diagram;
    n && (o.mdflowConditions.set(n, t.value), zs());
  });
}
function zs() {
  if (!Z()) return;
  clearTimeout(Kn);
  const e = Math.min(
    Co,
    Math.max(Lo, Math.round(Ks))
  );
  Kn = setTimeout(pn, e);
}
const Mo = 120;
let lt = "", Vn = null;
function mn(e) {
  lt = e, clearTimeout(Vn), Vn = setTimeout(() => {
    lt = "";
  }, Mo);
}
const $o = 200;
let dt = !1, zn = null;
function Gs() {
  dt = !0, clearTimeout(zn), zn = setTimeout(() => {
    dt = !1;
  }, $o);
}
function Ys() {
  if (dt || !Z() || lt === "preview") return;
  const e = o.editor, t = e.getScrollHeight() - e.getLayoutInfo().height, n = t > 0 ? e.getScrollTop() / t : 0, s = l("preview");
  mn("editor"), s.scrollTop = n * (s.scrollHeight - s.clientHeight);
}
function _o() {
  if (dt || !Z() || lt === "editor" || !o.editor) return;
  const e = l("preview"), t = e.scrollHeight - e.clientHeight, n = t > 0 ? e.scrollTop / t : 0, s = o.editor;
  mn("preview"), s.setScrollTop(n * Math.max(0, s.getScrollHeight() - s.getLayoutInfo().height));
}
const To = 80, No = 300;
let ut = 0, Gn = null;
function Ro() {
  const e = o.editor, t = e?.getModel();
  if (!e || !t) return;
  const n = Z() ? Io(t) : null;
  if (!n) {
    hn();
    return;
  }
  const s = [{ range: n.lineRange, options: { className: "preview-src-hl-line", isWholeLine: !0 } }];
  n.textRange && s.push({ range: n.textRange, options: { className: "preview-src-hl" } }), o.previewHl ? o.previewHl.set(s) : o.previewHl = e.createDecorationsCollection(s), Xs(t, n.textRange), mn("preview"), e.revealRangeInCenterIfOutsideViewport(n.textRange || n.lineRange, 1);
}
function hn() {
  o.previewHl?.clear?.(), o.previewHl = null, se = null, document.getElementById("mark-btn")?.classList.add("hidden");
}
function Io(e) {
  const t = window.getSelection?.();
  if (!t || t.isCollapsed || !t.rangeCount) return null;
  const n = t.getRangeAt(0), s = l("preview");
  if (!s.contains(n.commonAncestorContainer)) return null;
  const i = s.querySelectorAll("[data-src-line]"), r = Yn(n.startContainer) || i[0], a = Yn(n.endContainer) || i[i.length - 1] || r;
  if (!r || !a) return null;
  const c = Vt(e, Number(r.dataset.srcLine) + ut), d = Math.max(c, Vt(e, Number(a.dataset.srcEnd) + ut));
  if (!c) return null;
  const u = new o.monaco.Range(c, 1, d, e.getLineMaxColumn(d)), f = Do(n), w = f ? f.textContent : t.toString(), m = Ao(e, n, w);
  if (m) return m;
  const h = Zs(e.getValueInRange(u), w);
  let y = null;
  if (h) {
    const b = e.getOffsetAt({ lineNumber: c, column: 1 });
    y = o.monaco.Range.fromPositions(
      e.getPositionAt(b + h.start),
      e.getPositionAt(b + h.end)
    );
  }
  return { lineRange: u, textRange: y };
}
function ne(e, t) {
  return (e?.nodeType === Node.ELEMENT_NODE ? e : e?.parentElement)?.closest(t) || null;
}
const Yn = (e) => ne(e, "[data-src-line]");
function Ao(e, t, n) {
  const s = ne(t.startContainer, ".mermaid-box"), i = ne(t.endContainer, ".mermaid-box");
  if (!s || s !== i) return null;
  const r = s.__mermaidMeta;
  if (!r?.src) return null;
  const a = Qt(r.src);
  if (!a.supported) return null;
  let c = null;
  const d = ne(t.startContainer, "g[id*='flowchart-']"), u = ne(t.endContainer, "g[id*='flowchart-']");
  if (d && d === u) {
    const I = Je(d.id, a.nodes), P = I ? a.nodes.get(I) : null;
    c = P?.def?.labelSpan || P?.firstRef?.span || null;
  }
  if (!c) {
    const I = ne(t.startContainer, ".edgeLabel"), P = ne(t.endContainer, ".edgeLabel");
    if (I && I === P) {
      const j = Po(s, I), D = j ? Qe(j, a) : null;
      c = D != null ? a.edges[D]?.arrow?.labelSpan : null;
    }
  }
  if (!c) return null;
  const f = Number(s.dataset.srcLine) + ut, w = Vt(e, f + 1);
  if (!w) return null;
  const m = e.getOffsetAt({ lineNumber: w, column: 1 }), h = r.src.slice(c.start, c.end), y = Zs(h, n), b = m + c.start + (y?.start || 0), x = m + c.start + (y?.end ?? h.length), v = o.monaco.Range.fromPositions(
    e.getPositionAt(b),
    e.getPositionAt(x)
  ), L = v.startLineNumber, M = v.endLineNumber;
  return { lineRange: new o.monaco.Range(L, 1, M, e.getLineMaxColumn(M)), textRange: v };
}
function Po(e, t) {
  const n = t.getBoundingClientRect(), s = n.left + n.width / 2, i = n.top + n.height / 2;
  let r = null, a = 1 / 0;
  for (const c of e.querySelectorAll("path.flowchart-link"))
    try {
      const d = c.getTotalLength();
      if (!d) continue;
      const u = c.getPointAtLength(d / 2).matrixTransform(c.getScreenCTM()), f = (u.x - s) ** 2 + (u.y - i) ** 2;
      f < a && (a = f, r = c);
    } catch {
    }
  return a < 1600 ? r : null;
}
function Do(e) {
  const t = ne(e.startContainer, "mark");
  return t && t === ne(e.endContainer, "mark") ? t : null;
}
function Vt(e, t) {
  return Number.isFinite(t) ? Math.min(Math.max(1, t), e.getLineCount()) : 0;
}
function Zs(e, t) {
  const n = t.replace(/\s+/g, " ").trim();
  if (!n) return null;
  const s = e.indexOf(n);
  if (s >= 0) return { start: s, end: s + n.length };
  if (n.length > No) return null;
  const i = "[*_`~\\\\]*", r = i + "\\s+" + i;
  let a = "", c = !0;
  for (const d of n) {
    if (d === " ") {
      a += r, c = !0;
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
let se = null;
function Fo() {
  let e = document.getElementById("mark-btn");
  return e || (e = document.createElement("button"), e.id = "mark-btn", e.className = "hidden", e.title = "選択したところを Markdown の ==マーカー== で塗る (Ctrl+Shift+H)", e.addEventListener("mousedown", (t) => t.preventDefault()), e.addEventListener("click", Js), document.body.appendChild(e), e);
}
function Xs(e, t) {
  const n = Fo(), s = t ? Bo() : null;
  if (!s) {
    se = null, n.classList.add("hidden");
    return;
  }
  se = { range: t, marked: Oo(e, t) }, n.textContent = se.marked ? "🖍 マーカーを消す" : "🖍 マーカー", n.classList.remove("hidden"), Ho(n, s);
}
function Bo() {
  const e = window.getSelection?.();
  if (!e?.rangeCount) return null;
  const t = e.getRangeAt(0).getBoundingClientRect();
  if (!t.width && !t.height) return null;
  const n = l("preview").getBoundingClientRect();
  return t.bottom < n.top || t.top > n.bottom ? null : t;
}
function Ho(e, t) {
  const n = t.top - e.offsetHeight - 6;
  e.style.top = `${n < 4 ? t.bottom + 6 : n}px`, e.style.left = `${Math.max(4, Math.min(t.left, window.innerWidth - e.offsetWidth - 4))}px`;
}
function Oo(e, t) {
  const n = o.monaco.Range, s = e.getValueInRange(new n(
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
function Js() {
  const e = o.editor, t = e?.getModel();
  if (!se || !t) return;
  const n = o.monaco.Range, { range: s, marked: i } = se, r = i ? [
    { range: new n(s.startLineNumber, s.startColumn - 2, s.startLineNumber, s.startColumn), text: "" },
    { range: new n(s.endLineNumber, s.endColumn, s.endLineNumber, s.endColumn + 2), text: "" }
  ] : [
    { range: n.fromPositions(s.getStartPosition()), text: "==" },
    { range: n.fromPositions(s.getEndPosition()), text: "==" }
  ];
  e.executeEdits("mark", r), hn();
}
function Qs(e) {
  l("preview").classList.toggle("hidden", !e), l("preview-divider").classList.toggle("hidden", !e), l("preview-btn").classList.toggle("active", e), e ? tc() : (l("editor").style.flex = "", hn()), o.editor?.layout(), ke();
}
function ei() {
  Qs(!1);
}
async function jo(e, t) {
  const n = o.currentFile || "", s = us(mt(n).replace(/\.[^.]+$/, "")), i = await _("/api/image", {
    note: n,
    name: `${s}-${t}`,
    ext: "png",
    data_b64: await zi(e),
    overwrite: !0
  });
  return await V(), i.path;
}
function zt() {
  if (Cs(o.currentFile)) {
    if (!Mr()) {
      alert(`⚠️ Markdown プレビューを使うには、先に次を実行してください:
python -m pipenv run python scripts/fetch_markdown_it.py`);
      return;
    }
    if (Z()) {
      ei();
      return;
    }
    Qs(!0), pn();
  }
}
function Zn(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result)), s.onerror = () => n(new Error("画像データを読み込めませんでした")), s.readAsDataURL(e);
  });
}
function Wo(e) {
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
async function Uo(e) {
  const t = e.cloneNode(!0);
  t.querySelectorAll(".mermaid-tools, .mdflow-presets, .mdflow-mapping, .mdflow-note").forEach((n) => n.remove());
  for (const n of t.querySelectorAll(".mermaid-box")) {
    const s = n.querySelector("svg");
    if (s)
      try {
        const i = await fs(s, { background: Bt() }), r = document.createElement("img");
        r.src = await Zn(i), r.style.maxWidth = "100%", n.replaceWith(r);
      } catch {
      }
  }
  for (const n of t.querySelectorAll("img")) {
    const s = n.getAttribute("src") || "";
    if (s.startsWith("/api/asset"))
      try {
        const i = await fetch(s);
        if (!i.ok) continue;
        n.src = await Zn(await i.blob());
      } catch {
      }
  }
  return Wo(t), `<div>${t.innerHTML}</div>`;
}
let _t = !1;
async function qo() {
  if (!Z() || _t) return;
  const e = l("richcopy-btn"), t = e.textContent;
  _t = !0, e.disabled = !0, e.textContent = "⏳";
  try {
    const { text: n } = Vs(), s = await Uo(l("preview"));
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([s], { type: "text/html" }),
      "text/plain": new Blob([n], { type: "text/plain" })
    })]), e.textContent = "✓ コピー済";
  } catch (n) {
    e.textContent = t, alert("⚠️ コピーできませんでした: " + (n?.message || n));
  } finally {
    _t = !1, setTimeout(() => {
      e.textContent = t, ke();
    }, 1500);
  }
}
let le = null;
function Ko() {
  const e = o.editor.getModel(), t = e.getOffsetAt(o.editor.getSelection().getStartPosition()), n = e.getValue().slice(0, t).replace(/[ \t]+$/, "");
  return !n.trim() || /\n\s*\n\s*$/.test(n) ? "" : /\n\s*$/.test(n) ? `
` : `

`;
}
function Vo() {
  const e = l("cf-modal"), t = l("cf-input"), n = l("cf-status"), s = (r) => {
    n.textContent = r || "";
  };
  l("cf-btn").addEventListener("click", () => {
    le = null, t.value = "", s(tt() ? "Confluence（または任意のWebページ）でコピー（Ctrl+C）してから「クリップボードから読込」、または下の欄に Ctrl+V。" : "⚠ Turndown 未取得: python -m pipenv run python scripts/fetch_turndown.py を実行するとHTML→Markdown変換が有効になります（未取得でもテキストはそのまま挿入できます）。"), e.classList.remove("hidden"), t.focus();
  });
  const i = () => e.classList.add("hidden");
  l("cf-cancel").addEventListener("click", i), e.addEventListener("click", (r) => {
    r.target === e && i();
  }), t.addEventListener("paste", (r) => {
    const a = r.clipboardData?.getData("text/html");
    !a || !tt() || (r.preventDefault(), le = a, t.value = r.clipboardData?.getData("text/plain") || "", s("✓ リッチテキスト（HTML）で取得しました。「変換して挿入」でMarkdownになります（下の欄は確認用。欄を手で編集するとHTML側を無視して欄の内容を挿入します）。"));
  }), l("cf-read-btn").addEventListener("click", async () => {
    try {
      const r = await navigator.clipboard.read();
      for (const a of r) {
        if (a.types.includes("text/html") && tt()) {
          le = await (await a.getType("text/html")).text(), t.value = a.types.includes("text/plain") ? await (await a.getType("text/plain")).text() : "", s("✓ クリップボードのHTMLを取得しました。");
          return;
        }
        if (a.types.includes("text/plain")) {
          le = null, t.value = await (await a.getType("text/plain")).text(), s("プレーンテキストとして取得しました（そのまま挿入されます）。");
          return;
        }
      }
      s("クリップボードが空です。");
    } catch (r) {
      s("⚠ 読み込めませんでした: " + (r?.message || r) + "。下の欄へ Ctrl+V なら直接取れます。");
    }
  }), t.addEventListener("input", () => {
    le = null;
  }), l("cf-insert").addEventListener("click", () => {
    if (!o.currentFile) {
      alert("先に挿入先のファイルを開いてください。");
      return;
    }
    let r;
    try {
      r = le != null ? Ur(le) : t.value;
    } catch (a) {
      alert("⚠ 変換に失敗しました: " + a.message);
      return;
    }
    if (!r.trim()) {
      s("貼り付ける内容がありません。");
      return;
    }
    o.editor.executeEdits("confluence-paste", [{
      range: o.editor.getSelection(),
      text: Ko() + r.replace(/\s+$/, "") + `
`
    }]), o.editor.focus(), i();
  });
}
function zo(e, t) {
  o.diagramEditing?.dispose?.();
  const n = { src: t.src, index: t.index, box: e, restore: null, dispose: null };
  o.diagramEditing = n, n.dispose = Pt(e, t, Gt(), null);
}
function Go() {
  o.diagramEditing?.dispose?.(), o.diagramEditing = null;
}
function Yo(e, t, n = !1) {
  const s = o.diagramEditing;
  if (s) {
    if (n) {
      if (s.box !== e) return;
      s.index = t.index, e.querySelector(":scope > .mermaid-editbar") || (s.dispose?.(), s.dispose = Pt(e, t, Gt(), s.restore));
      return;
    }
    s.index === t.index && (s.src !== t.src && (s.src = t.src, s.restore = null), s.dispose?.(), s.box = e, s.dispose = Pt(e, t, Gt(), s.restore), s.restore && (s.restore = { ...s.restore, editNodeId: null }));
  }
}
function Gt() {
  return {
    applyEdits(e, t, n = null) {
      const s = o.editor, i = s.getModel(), r = o.diagramEditing, a = ys(i.getValue(), e, r?.index ?? 0);
      if (!a)
        return o.diagramEditing?.dispose?.(), o.diagramEditing = null, alert("⚠️ 図の位置を特定できませんでした（プレビューとエディタの内容が食い違っています）。編集モードを終了します。ファイルを開き直すと直ります。"), !1;
      const c = br(e, t), d = t.map((u) => ({
        range: o.monaco.Range.fromPositions(
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
      return s.pushUndoStop(), s.executeEdits("mermaid-edit", d), s.pushUndoStop(), o.diagramEditing = {
        src: c,
        index: r?.index ?? 0,
        box: r?.box ?? null,
        restore: n,
        dispose: r?.dispose ?? null
      }, !0;
    },
    // 図の上での Ctrl+Z / Ctrl+Y。エディタにフォーカスが無くても効かせる。
    undo() {
      o.editor?.trigger("mermaid-edit", "undo", null);
    },
    redo() {
      o.editor?.trigger("mermaid-edit", "redo", null);
    },
    // 図で選択した要素に対応する Markdown を、エディタ側で反転表示してそこまでスクロールする
    // （「この図形はソースのどこ？」を探させない）。null で消す。
    reveal(e) {
      Xn(e);
    },
    onExit() {
      Xn(null), o.diagramEditing = null;
    }
  };
}
function Xn(e) {
  const t = o.editor, n = t?.getModel();
  if (!t || !n) return;
  const s = () => {
    o.diagramHl?.clear?.(), o.diagramHl = null;
  };
  if (!e) {
    s();
    return;
  }
  const i = o.diagramEditing, r = i ? ys(n.getValue(), i.src, i.index ?? 0) : null;
  if (!r) {
    s();
    return;
  }
  const a = (f) => f ? o.monaco.Range.fromPositions(
    n.getPositionAt(r.start + r.toRaw(f.start)),
    n.getPositionAt(r.start + r.toRaw(f.end))
  ) : null, c = a(e.line), d = a(e.focus), u = [];
  if (c && u.push({ range: c, options: { className: "mermaid-src-hl-line", isWholeLine: !0 } }), d && u.push({ range: d, options: { className: "mermaid-src-hl" } }), !u.length) {
    s();
    return;
  }
  o.diagramHl ? o.diagramHl.set(u) : o.diagramHl = t.createDecorationsCollection(u), t.revealRangeInCenterIfOutsideViewport(
    d || c,
    0
    /* Smooth */
  );
}
let Yt = null, ae = [];
function Zo() {
  clearTimeout(Yt), Yt = setTimeout(() => gn(l("file-search").value), 250);
}
function Xo() {
  clearTimeout(Yt), l("file-search").value = "", ae = [], l("search-results").classList.add("hidden"), l("search-results").innerHTML = "", l("search-opts").classList.add("hidden"), l("replace-bar").classList.add("hidden"), l("replace-preview").innerHTML = "", l("replace-status").textContent = "", l("file-list").classList.remove("hidden");
}
async function gn(e) {
  const t = l("search-results"), n = l("file-list");
  if (!e.trim()) {
    ae = [], t.classList.add("hidden"), l("search-opts").classList.add("hidden"), l("replace-bar").classList.add("hidden"), n.classList.remove("hidden");
    return;
  }
  const s = new URLSearchParams({ q: e, case: l("search-case").checked ? "true" : "false" }), i = await K("/api/search?" + s);
  if (i) {
    ae = [...new Set(i.results.map((r) => r.path))], t.innerHTML = "";
    for (const r of i.results) t.appendChild(Jo(r));
    i.results.length || (t.innerHTML = "<div class='hint'>該当なし</div>"), l("search-opts").classList.remove("hidden"), ye(), n.classList.add("hidden"), t.classList.remove("hidden");
  }
}
function Jo(e) {
  const t = document.createElement("div");
  t.className = "search-hit";
  const n = document.createElement("div");
  n.className = "loc", n.textContent = `${e.path}:${e.line}`, t.appendChild(n);
  const s = document.createElement("pre");
  s.className = "hit-body";
  const i = (r, a) => {
    const c = document.createElement("span");
    c.className = a, c.textContent = r === "" ? " " : r, s.appendChild(c);
  };
  for (const r of e.before || []) i(r, "ctx");
  i(e.text, "hit-line");
  for (const r of e.after || []) i(r, "ctx");
  return t.appendChild(s), t.addEventListener("click", async () => {
    await Q(e.path), o.editor.revealLineInCenter(e.line), o.editor.setPosition({ lineNumber: e.line, column: 1 }), o.editor.focus();
  }), t;
}
function Qo() {
  const e = l("replace-bar");
  e.classList.toggle("hidden"), e.classList.contains("hidden") || (ye(), l("replace-input").focus());
}
function ye(e) {
  l("replace-status").textContent = e !== void 0 ? e : `対象: ヒットした ${ae.length} ファイル`;
  const t = !ae.length;
  l("replace-preview-btn").disabled = t, l("replace-run-btn").disabled = t;
}
async function Tt(e) {
  const t = l("file-search").value, n = l("replace-input").value;
  if (!t.trim() || !ae.length) return;
  if (!e) {
    if (!confirm(
      `${ae.length} ファイルの「${t}」を「${n}」に置き換えます。

置換前の内容は 🕰 履歴 に残るので元に戻せます。実行しますか？`
    )) return;
    await Ke();
  }
  ye(e ? "確認中…" : "置換中…");
  let s;
  try {
    s = await _("/api/search/replace", {
      query: t,
      replace: n,
      paths: ae,
      case: l("search-case").checked,
      dry_run: e
    });
  } catch (a) {
    ye("⚠️ " + a.message);
    return;
  }
  ea(s);
  const i = s.total === 0 ? "置き換わる箇所がありません" : e ? `${s.changed_files} ファイル / ${s.total} 箇所が置き換わります` : `✓ ${s.changed_files} ファイル / ${s.total} 箇所を置換しました（🕰 履歴 から戻せます）`;
  if (e) {
    ye(i);
    return;
  }
  const r = s.files.map((a) => a.path);
  o.currentFile && r.includes(o.currentFile) && await Q(o.currentFile, !0, "none"), await gn(l("file-search").value), ye(i);
}
function ea(e) {
  const t = l("replace-preview");
  t.innerHTML = "";
  for (const n of e.files) {
    const s = document.createElement("div");
    s.className = "rp-file", s.textContent = `${n.path}（${n.count} 箇所）`, t.appendChild(s);
    for (const i of n.samples) {
      const r = document.createElement("div");
      r.className = "rp-row";
      const a = document.createElement("div");
      a.className = "rp-before", a.textContent = `- ${i.before}`;
      const c = document.createElement("div");
      c.className = "rp-after", c.textContent = `+ ${i.after}`, r.append(a, c), t.appendChild(r);
    }
  }
}
function ft() {
  if (!o.editor) return "";
  const e = o.editor.getSelection();
  return o.editor.getModel().getValueInRange(e);
}
function ta() {
  return R() ? "テキストを選択してAIに送れます" : Ue() ? "計画モード：エージェントは調査だけを行い、ファイルは変更しません。" : "エージェントがファイルを直接編集します（破壊操作は承認制）。";
}
function ti() {
  const e = ft().trim().length > 0;
  l("sel-chip").classList.toggle("hidden", !e), l("sel-info").textContent = e ? "選択中：AIに送れます" : ta();
}
async function wn() {
  if (!o.currentFile) {
    o.notes = [], pt();
    return;
  }
  const e = await K("/api/notes?path=" + encodeURIComponent(o.currentFile));
  o.notes = e ? e.notes || [] : [], pt();
}
async function vn(e = o.currentFile, t) {
  e && (t == null && (Et(), t = o.notes), await q("/api/notes?path=" + encodeURIComponent(e), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t)
  }));
}
function Et() {
  o.noteDecorations && o.notes.forEach((e, t) => {
    const n = o.noteDecorations.getRange(t);
    n && (e.line = n.startLineNumber);
  });
}
function pt() {
  const e = o.monaco, t = o.notes.map((n) => ({
    range: new e.Range(n.line, 1, n.line, 1),
    options: {
      isWholeLine: !0,
      glyphMarginClassName: "pixie-note-glyph",
      className: "pixie-note-line",
      glyphMarginHoverMessage: { value: n.text }
    }
  }));
  o.noteDecorations.set(t);
}
function na() {
  Et();
  const e = o.editor.getPosition().lineNumber, t = prompt("付箋メモ（例: ここをAIに膨らませてもらう）");
  t && (o.notes = o.notes.filter((n) => n.line !== e), o.notes.push({ line: e, text: t }), pt(), vn().catch((n) => alert("⚠️ 付箋の保存に失敗しました: " + n.message)));
}
function sa(e) {
  Et();
  const t = o.notes.find((s) => s.line === e), n = prompt("付箋メモ（空で削除）", t ? t.text : "");
  n !== null && (o.notes = o.notes.filter((s) => s.line !== e), n.trim() && o.notes.push({ line: e, text: n }), pt(), vn().catch((s) => alert("⚠️ 付箋の保存に失敗しました: " + s.message)));
}
const ia = /* @__PURE__ */ new Set(
  ["md", "markdown", "txt", "py", "json", "yaml", "yml", "toml", "csv", "html", "css", "js", "ts"]
), ce = (e) => (e.external ? "E:" : "I:") + e.path, mt = (e) => e.split(/[\\/]/).pop(), Zt = (e) => ia.has(wt(e.path)), ni = (e) => nn(e.path);
async function yn() {
  if (!o.currentFile) {
    o.refs = [], He();
    return;
  }
  const e = await K("/api/refs?path=" + encodeURIComponent(o.currentFile));
  o.refs = e ? e.refs || [] : [];
  const t = new Set(o.refs.map(ce));
  for (const n of [...o.checkedRefs]) t.has(n) || o.checkedRefs.delete(n);
  He();
}
async function si() {
  o.currentFile && await K("/api/refs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: o.currentFile, refs: o.refs })
  });
}
async function Xt(e) {
  if (!o.currentFile) {
    alert("先にファイルを開いてください。");
    return;
  }
  o.refs.some((t) => ce(t) === ce(e)) || (o.refs.push(e), await si(), He());
}
async function ra(e) {
  const [t] = o.refs.splice(e, 1);
  t && o.checkedRefs.delete(ce(t)), await si(), He();
}
async function oa(e) {
  try {
    await _(
      "/api/refs/open",
      { note: o.currentFile, path: e.path, external: !!e.external }
    );
  } catch (t) {
    alert("⚠️ 開けませんでした: " + t.message);
  }
}
function He() {
  const e = l("ref-list"), t = l("ref-empty");
  if (e.innerHTML = "", !o.currentFile) {
    t.textContent = "ファイルを開くと関連ファイルを紐付けられます。", t.classList.remove("hidden");
    return;
  }
  if (!o.refs.length) {
    t.textContent = "ここにファイルをドラッグ、または「＋参照を追加」で紐付けます。", t.classList.remove("hidden");
    return;
  }
  t.classList.add("hidden"), o.refs.forEach((n, s) => {
    const i = document.createElement("li"), r = document.createElement("input");
    r.type = "checkbox", r.title = Zt(n) ? "AIコンテキストに含める" : ni(n) ? "AIコンテキストに含める（サーバでテキスト抽出して同梱。/copilot では原本を Copilot に添付）" : "AIコンテキストに含める（この形式は Copilot 添付経路のみ有効）", r.checked = o.checkedRefs.has(ce(n)), r.addEventListener("click", (u) => u.stopPropagation()), r.addEventListener("change", () => {
      r.checked ? o.checkedRefs.add(ce(n)) : o.checkedRefs.delete(ce(n));
    });
    const a = document.createElement("span");
    a.textContent = n.external ? "外部" : "";
    const c = document.createElement("span");
    c.className = "fname", c.textContent = n.name || mt(n.path), c.title = n.path + "（クリックで既定アプリで開く）", c.addEventListener("click", () => oa(n));
    const d = document.createElement("button");
    d.className = "ref-del", d.textContent = "×", d.title = "参照を外す", d.addEventListener("click", (u) => {
      u.stopPropagation(), ra(s);
    }), i.append(r, a, c, d), e.appendChild(i);
  });
}
function aa(e) {
  const t = (e || "").split(/\r?\n/).find((s) => s && !s.startsWith("#"));
  if (!t || !/^file:/i.test(t)) return null;
  let n = decodeURIComponent(t.replace(/^file:\/\//i, ""));
  return /^\/[A-Za-z]:/.test(n) && (n = n.slice(1)), n.replace(/\\/g, "/");
}
function ca() {
  const e = l("refmgr");
  e.addEventListener("dragover", (t) => {
    t.preventDefault(), t.dataTransfer.dropEffect = "copy", e.classList.add("ref-drop");
  }), e.addEventListener("dragleave", (t) => {
    e.contains(t.relatedTarget) || e.classList.remove("ref-drop");
  }), e.addEventListener("drop", async (t) => {
    if (t.preventDefault(), t.stopPropagation(), e.classList.remove("ref-drop"), !o.currentFile) {
      alert("先にファイルを開いてください。");
      return;
    }
    if (J) {
      const s = o.fsMap.get(J);
      s && s.type === "file" ? await Xt({ path: J, external: !1, name: mt(J) }) : alert("フォルダは参照に追加できません。ファイルをドラッグしてください。");
      return;
    }
    const n = aa(t.dataTransfer.getData("text/uri-list") || t.dataTransfer.getData("text/plain"));
    if (n) {
      await Xt({ path: n, external: !0, name: mt(n) });
      return;
    }
    t.dataTransfer.files && t.dataTransfer.files.length && alert(`ブラウザの制限でドラッグしたファイルの絶対パスを取得できません。
外部ファイルは「＋参照を追加」から選んでください。`);
  });
}
async function Ie(e) {
  const t = await K("/api/workspace/dirs?files=true&path=" + encodeURIComponent(e || ""));
  if (!t) return;
  l("pick-input").value = t.cwd || "";
  const n = l("pick-drives");
  n.innerHTML = "";
  for (const i of t.drives || []) {
    const r = document.createElement("button");
    r.textContent = i, r.classList.toggle("active", (t.cwd || "").toLowerCase().startsWith(i.toLowerCase().slice(0, 2))), r.addEventListener("click", () => Ie(i)), n.appendChild(r);
  }
  const s = l("pick-list");
  if (s.innerHTML = "", t.parent && t.parent !== t.cwd) {
    const i = document.createElement("li");
    i.textContent = "⬆ ..（上のフォルダへ）", i.addEventListener("click", () => Ie(t.parent)), s.appendChild(i);
  }
  for (const i of t.dirs || []) {
    const r = document.createElement("li");
    r.textContent = i.name, r.addEventListener("click", () => Ie(i.path)), s.appendChild(r);
  }
  for (const i of t.files || []) {
    const r = document.createElement("li");
    r.className = "pick-file", r.textContent = i.name, r.addEventListener("click", async () => {
      await Xt({ path: i.path.replace(/\\/g, "/"), external: !0, name: i.name }), st();
    }), s.appendChild(r);
  }
}
function la() {
  if (!o.currentFile) {
    alert("先にファイルを開いてください。");
    return;
  }
  l("pick-modal").classList.remove("hidden"), Ie(l("root-path").textContent || "");
}
function st() {
  l("pick-modal").classList.add("hidden");
}
const ii = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg"
};
function Jn(e) {
  for (const t of e?.files || [])
    if (t.type in ii) return t;
  return null;
}
function da(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result).split(",", 2)[1] || ""), s.onerror = () => n(new Error("画像を読み込めませんでした")), s.readAsDataURL(e);
  });
}
async function Qn(e) {
  if (!o.currentFile) {
    alert("⚠️ 画像を貼るには、先にファイルを開いて（または保存して）ください。");
    return;
  }
  let t;
  try {
    t = await _("/api/image", {
      note: o.currentFile,
      ext: ii[e.type],
      name: e.name || "",
      // D&D は元名を引き継ぐ。クリップボードは名前が無いので日時
      data_b64: await da(e)
    });
  } catch (s) {
    alert("⚠️ 画像を保存できませんでした: " + s.message);
    return;
  }
  const n = t.rel.split("/").pop().replace(/\.[^.]+$/, "");
  o.editor.executeEdits("insert-image", [
    { range: o.editor.getSelection(), text: `![${n}](${t.rel})` }
  ]), o.editor.focus(), await V();
}
const ua = {
  prefill: (e) => `応答を待っています（prefill 中… ${e}s）`,
  thinking: (e) => `思考中… ${e}s`,
  tool: (e) => `ツールを実行中… ${e}s`,
  verify: (e) => `結果を検証中… ${e}s`
};
function fa(e) {
  let t = "", n = "prefill", s = performance.now();
  const i = document.createElement("div");
  i.className = "wait-indicator", i.innerHTML = '<span class="dots"><i></i><i></i><i></i></span><span class="wait-text"></span>';
  const r = i.querySelector(".wait-text"), a = () => {
    i.isConnected || e.insertBefore(i, e.querySelector(".body"));
  }, c = () => {
    if (!i.isConnected) return;
    const h = ((performance.now() - s) / 1e3).toFixed(1), y = ua[n] || ((b) => `${n}… ${b}s`);
    r.textContent = y(h);
  }, d = (h) => {
    h !== n && (n = h, s = performance.now()), a(), c(), Y();
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
    c(), Y();
  }, 200);
  return {
    onToken(h) {
      t += h, i.remove();
      const { think: y, visible: b } = Ot(t);
      w(y), bs(e.querySelector(".body"), b), Y();
    },
    /** エンジンのインジケータ（⏳ Prefill / 🧠 Thinking...）を待機表示のフェーズに反映する。 */
    setPhase: d,
    finish() {
      clearInterval(m), i.remove();
      const { think: h, visible: y } = Ot(t);
      return w(h, !0), y.trim() && je(e.querySelector(".body"), y, { assetBase: Ve() }), y;
    }
  };
}
const pa = [
  ["thinking", ["🧠", "Thinking..."]],
  ["prefill", ["⏳", "Prefill"]]
];
function ma(e) {
  for (const [t, n] of pa)
    if (n.some((s) => e.includes(s))) return t;
  return null;
}
async function ha(e, t) {
  const n = ft(), s = [], i = [];
  for (const a of [...o.checkedFiles]) {
    let c = null;
    try {
      c = await q("/api/file?path=" + encodeURIComponent(a), { signal: t });
    } catch (d) {
      if (t?.aborted) throw d;
      if (alert("⚠️ " + d.message), d.status === 423) continue;
    }
    c && c.content != null && i.push({ path: a, content: c.content }), nn(a) && s.push(a);
  }
  const r = [];
  if (o.currentFile)
    for (let a = 0; a < o.refs.length; a++) {
      const c = o.refs[a];
      if (o.checkedRefs.has(ce(c))) {
        if (Zt(c) || ni(c)) {
          let d = null;
          try {
            d = await q(
              `/api/refs/read?note=${encodeURIComponent(o.currentFile)}&idx=${a}`,
              { signal: t }
            );
          } catch (u) {
            if (t?.aborted) throw u;
            if (alert("⚠️ " + u.message), u.status === 423) continue;
          }
          d && d.content != null && r.push({ path: c.path, content: d.content });
        }
        Zt(c) || s.push(c.path);
      }
    }
  return {
    message: e,
    session_id: o.sessionId,
    // Note は単一セッション（サーバは無視するが契約上送る）
    selection: n,
    context_files: i,
    ref_texts: r,
    // ツリーでチェックしたファイルが 📎 関連ファイルにも登録されていると、同じパスが
    // 2回入って Copilot に二重アップロードされる。送る直前に一意化する。
    attach_files: [...new Set(s)],
    history: o.history,
    // 「このファイル」が指せるよう、開いているファイルを常に添える。
    // 未保存の編集も含めたいのでディスクではなくエディタの内容を送る。
    current_file: o.currentFile || "",
    current_content: o.currentFile ? o.editor.getValue() : ""
  };
}
const ri = {
  "/compact": "会話を要約して文脈を畳む。`/compact 認証まわり` のように残したい焦点を足せる",
  "/copilot": "エージェントが質問文を組み立てて Copilot に聞き、回答を精査して反映する",
  "/copilot_simple": "ローカル LLM を経由せず、打った文をそのまま Copilot へ1回質問する（選択範囲・チェック済みファイルは同梱、関連ファイルは添付される）",
  // 従来名。/copilot_simple と完全に同じ処理へ入る（サーバの COPILOT_DIRECT_COMMANDS）。
  "/copilot!": "`/copilot_simple` の別名（同じ動作）"
}, En = {
  "/help": { desc: "使えるコマンドの一覧を出す", run: () => wa() },
  "/context": { desc: "いまの文脈の量（メッセージ数・概算文字数）を見る", run: () => va() },
  "/undo": { desc: "直前の往復を削除する（🗑 と同じ）", run: () => ya() },
  "/clear": { desc: "会話をリセットする（Note は保存履歴も消す）", run: () => Ea() },
  "/code": { desc: "Code モードへ切り替える", run: () => Nt("code") },
  "/note": { desc: "Note モードへ切り替える", run: () => Nt("note") },
  "/plan": { desc: "Plan モードへ切り替える", run: () => Nt("plan") }
};
async function Nt(e) {
  if (o.mode === e) {
    $("system", `既に ${De[e]} モードです。`);
    return;
  }
  await on(e);
}
async function ga(e) {
  const t = /^(\/\S+)(?:\s+([\s\S]*))?$/.exec(e);
  if (!t) return !1;
  const n = t[1].toLowerCase();
  if (n in ri) return !1;
  const s = En[n];
  return s ? ($("user", e), await s.run((t[2] || "").trim()), !0) : !1;
}
function wa() {
  const e = [
    ...Object.entries(ri),
    ...Object.entries(En).map(([t, n]) => [t, n.desc])
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
async function va() {
  let e;
  try {
    e = await ee("/api/context?session_id=" + encodeURIComponent(o.sessionId));
  } catch (n) {
    $("error", "⚠ 文脈を取得できません: " + n.message);
    return;
  }
  if (!e.supported) {
    $("assistant", "このエンジンでは文脈量を測れません（pixie_core API 1.6 以上が必要です）。");
    return;
  }
  const t = [
    `### 🧠 いまの文脈（${De[e.mode] || e.mode} モード）`,
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
function ya() {
  const t = [...l("messages").children].reverse().find((s) => s.classList.contains("assistant") && s._exchange);
  if (!t) {
    $("system", "消せる往復がありません。");
    return;
  }
  const n = t.querySelector(".msg-del");
  n && n.click();
}
async function Ea() {
  if (o.streaming) {
    alert("⚠️ 応答の生成中はリセットできません。");
    return;
  }
  const e = R() ? `
（保存されている会話履歴も消えます）` : "";
  if (!confirm("この会話をリセットしますか？" + e)) return;
  const t = S.begin("switching");
  if (!t) return;
  let n = "";
  try {
    try {
      await _("/api/session/clear", { session_id: o.sessionId });
    } catch (s) {
      n = s.message, alert("⚠️ リセットできません: " + s.message);
      return;
    }
    if (R())
      try {
        await q("/api/chat/history", { method: "DELETE" }), o.history = [], o.historyLoaded = !0;
      } catch (s) {
        n = s.message, alert("⚠️ 保存履歴を消せませんでした: " + s.message);
      }
    l("messages").innerHTML = "", o.assistantEl = null, o.sessionId = We(), Le(), $("system", "🧹 会話をリセットしました。");
  } catch (s) {
    return n = s.message, alert(s.message), !1;
  } finally {
    S.finish(t, n);
  }
}
async function Oe() {
  if (o.streaming) return;
  const e = l("chat-input"), t = e.value.trim();
  if (!t) return;
  const n = t.split(/\s/, 1)[0].toLowerCase();
  if (Object.hasOwn(En, n)) {
    await ga(t) && (e.value = "");
    return;
  }
  const s = S.begin();
  if (!s) return;
  let i = "";
  try {
    const r = R(), a = Ue(), c = Ne() && o.codeStyle === "plan" && !o.planExecNext;
    o.planExecNext = !1;
    const d = r ? Pa() : null;
    let u;
    if (r)
      u = await ha(t, s.controller.signal);
    else if (a) {
      const b = [];
      for (const x of [...o.checkedFiles]) {
        const v = await q("/api/file?path=" + encodeURIComponent(x), { signal: s.controller.signal });
        v && v.content != null && b.push({ path: x, content: v.content });
      }
      u = {
        message: t,
        session_id: o.sessionId,
        selection: ft(),
        current_file: o.currentFile || "",
        current_content: o.currentFile ? o.editor.getValue() : "",
        context_files: b
      };
    } else {
      const b = [];
      for (const x of [...o.checkedFiles]) {
        const v = await q("/api/file?path=" + encodeURIComponent(x), { signal: s.controller.signal });
        v && v.content != null && b.push({ path: x, content: v.content });
      }
      u = {
        message: t,
        session_id: o.sessionId,
        current_file: o.currentFile,
        current_content: o.currentFile ? o.editor.getValue() : "",
        selection: ft(),
        plan_first: c
      }, b.length && (u.context_files = b);
    }
    if (s.controller.signal.aborted || !S.current(s)) return;
    u.session_id = s.sessionId, e.value = "";
    const f = $("user", t);
    o.changedPaths.size && (o.changedPaths.clear(), qe()), o.assistantEl = $("assistant", ""), o.turnId = 0, o.compacted = null, o.assistantEl._exchange = { userEl: f, userText: t }, o.assistantUi = fa(o.assistantEl);
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
      S.phase(s, "running"), await Mi(b, s, S.current, async (x) => {
        S.current(s) && (x.type === "approval" && S.phase(s, "approval"), await Ca(x));
      });
    } catch (b) {
      s.controller.signal.aborted || (i = b.message, F(o.assistantEl, "⚠️ 実行失敗: " + b.message));
    }
    if (!S.current(s)) return;
    const w = s.controller.signal.aborted || s.outcome === "cancelled" || !!i, m = o.assistantEl, h = o.turnId, y = es();
    r ? La(m, t, y, d, w) : (a || c) && !w && ka(y), Ne() && !w && Ta(t, y), o.compacted && m?.isConnected ? ba(m, o.compacted) : m?.isConnected && (ks(m, () => oi(m, h)), Ne() && h && Vr(m, () => _a(h)));
  } catch (r) {
    s.controller.signal.aborted || (i = r.message, $("error", r.message));
  } finally {
    await s.interruption, S.current(s) && (o.assistantUi && es(), l("approval").classList.add("hidden"), l("approval").innerHTML = "", me.length && ie(), S.finish(s, i));
  }
}
async function oi(e, t) {
  if (o.streaming) {
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
      i = !!(await _(
        "/api/chat/turn/delete",
        { session_id: o.sessionId, turn_id: t }
      )).ok;
    } catch {
      i = !1;
    }
  if (R()) {
    const r = o.history.findIndex((a) => a.role === "user" && a.content === n?.userText);
    if (r >= 0) {
      const a = o.history[r + 1]?.role === "assistant" ? 2 : 1;
      o.history.splice(r, a), await cn();
    }
    if (!t)
      try {
        await _("/api/session/clear", { session_id: o.sessionId });
      } catch {
        i = !1;
      }
  }
  n?.userEl?.remove(), e.remove(), i || $("system", "⚠️ 表示からは消しましたが、AI の文脈からは消せませんでした（サーバ側の会話が既に入れ替わっています）。");
}
function ba(e, t) {
  const n = l("messages");
  for (const i of [...n.children])
    i !== e && i.remove();
  const s = $(
    "system",
    `ここまでの会話（${t.before}件）を要約に畳みました（約${t.saved_chars.toLocaleString()}文字ぶんの文脈を解放）。`
  );
  n.insertBefore(s, e), R() && (o.history = [
    { role: "user", content: "（ここまでの会話は /compact で要約に置き換えました）" },
    { role: "assistant", content: t.summary }
  ], cn()), Y(!0);
}
function xa(e) {
  const t = /```plan[^\n]*\n([\s\S]*?)```/.exec(e || "");
  return t ? t[1].trim() : null;
}
function ka(e) {
  let t = xa(e);
  !t && /^\s*1[.)]\s/m.test(e || "") && (t = (e || "").trim()), t && fi(t);
}
function La(e, t, n, s, i) {
  if (o.history.push({ role: "user", content: t }), (n.trim() || !i) && o.history.push({ role: "assistant", content: n }), cn(), !e || !e.isConnected) return;
  const r = zr(n);
  r.length ? Ia(e, n, r) : !Fa(e, n, s) && n.trim() && Da(e, n, s);
}
async function Ca(e) {
  switch (e.type) {
    case "token":
      e.text && o.assistantUi?.onToken(e.text);
      break;
    case "status": {
      const t = e.phase || ma(e.text || "");
      if (t) {
        o.assistantUi?.setPhase(t);
        break;
      }
      F(o.assistantEl, e.text, { category: e.category, tool: e.tool });
      break;
    }
    case "turn":
      o.turnId = e.id || 0;
      break;
    case "compacted":
      o.compacted = e;
      break;
    case "approval":
      Ma(e);
      break;
    case "workset":
      Sa(e.workset);
      break;
    case "files_changed":
      await ci(e.paths || []);
      break;
    case "turn_metrics": {
      const t = e.metrics || {}, n = Array.isArray(t.llm_calls) ? t.llm_calls.length : 0, s = Number(t.tool_calls || 0), i = Number(t.acceptance_retries || 0), r = [`LLM ${n}`, `tools ${s}`];
      t.exit_reason && r.push(t.exit_reason), i && r.push(`acceptance retry ${i}`), F(
        o.assistantEl,
        `Turn: ${r.join(" / ")}`,
        { category: "turn_metrics" }
      );
      break;
    }
    case "error":
      F(o.assistantEl, "⚠ " + e.text);
      break;
  }
}
function Sa(e) {
  if (!e || !o.assistantEl) return;
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
  F(
    o.assistantEl,
    `📚 Workset: ${t.length}件（自動追加 ${e.stats?.auto_added || 0}件）`
  ), t.slice(0, 16).forEach((i) => {
    const r = [];
    i.symbols?.length && r.push(`symbol ${i.symbols.length}`), i.sections?.length && r.push(`節 ${i.sections.length}`), i.requirements?.length && r.push(`要件 ${i.requirements.length}`), i.mermaid?.length && r.push(`Mermaid ${i.mermaid.length}`), F(
      o.assistantEl,
      `  ${s[i.role] || i.role}: ${i.path}` + (r.length ? `（${r.join(" / ")}）` : "")
    );
  }), t.length > 16 && F(o.assistantEl, `  …ほか ${t.length - 16}件`), n.slice(0, 8).forEach((i) => F(o.assistantEl, `  ⏭ 省略: ${i.path}（${i.reason}）`));
}
function es() {
  const e = o.assistantUi?.finish() ?? "";
  return o.assistantEl && !e.trim() && !o.assistantEl.querySelector(".tool-log") && (o.assistantEl.remove(), o.assistantEl = null), o.assistantUi = null, e;
}
function Ma(e) {
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
  s.length && Ha(s, i);
  const r = document.createElement("div");
  r.className = "row";
  const a = document.createElement("textarea");
  a.placeholder = "却下して別指示を出す場合はここに入力（任意）";
  const c = document.createElement("button");
  c.className = "btn-approve", c.textContent = "✓ 承認して実行", c.disabled = !!e.changeset && !e.changeset.ok, c.disabled && (c.title = "競合または検証エラーがあるため承認できません"), c.onclick = () => ts(e.id, !0, null);
  const d = document.createElement("button");
  d.className = "btn-reject", d.textContent = "✗ 却下", d.onclick = () => ts(e.id, !1, a.value.trim() || null), r.append(a, c, d), t.appendChild(r), Y();
}
const Rt = /* @__PURE__ */ new WeakSet();
async function ai(e, t, n) {
  const s = S.active;
  if (!s || S.state.phase !== "approval") return;
  const i = l("approval");
  if (Rt.has(s)) return;
  Rt.add(s);
  const r = i.firstChild, a = [...i.querySelectorAll("button"), l("diff-approve-edit")], c = a.map((d) => d.disabled);
  a.forEach((d) => {
    d.disabled = !0;
  });
  try {
    if (await _(e, { ...t, session_id: s.sessionId }), !S.current(s) || s.controller.signal.aborted) return;
    F(o.assistantEl, n), i.firstChild === r && (i.classList.add("hidden"), i.innerHTML = "", me.length && ie(), S.phase(s, "running"));
  } catch (d) {
    S.current(s) && !s.controller.signal.aborted && F(o.assistantEl, d.message);
  } finally {
    Rt.delete(s), S.current(s) && (i.firstChild === r || !i.firstChild) && a.forEach((d, u) => {
      d.disabled = c[u];
    });
  }
}
async function ts(e, t, n) {
  return ai(
    "/api/approve",
    { id: e, approve: t, override: n },
    t ? "✓ 承認しました。" : "✗ 却下しました。"
  );
}
async function ci(e) {
  F(o.assistantEl, "変更されたファイル: " + e.join(", ")), o.changedPaths = new Set(e), await V(), o.currentFile && e.includes(o.currentFile) && (o.dirty ? confirm(`${o.currentFile} がエージェントに変更されました。エディタの未保存分を破棄して再読込しますか？`) && await Q(o.currentFile, !0) : await Q(o.currentFile, !0));
}
async function $a() {
  const e = S.stop();
  e && (Ne() && (e.interruption = q("/api/interrupt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: e.sessionId }),
    signal: AbortSignal.timeout(5e3)
  }).catch((t) => {
    $("error", t.message);
  })), me.length && ie());
}
async function _a(e) {
  if (o.streaming) {
    alert("⚠️ 実行中です。中断してから巻き戻してください。");
    return;
  }
  if (confirm(`このターンの前の状態へファイルを戻しますか？
以降のターンで同じファイルに加えた変更も巻き戻ります。
（このターンより後に作られたファイルは消さずに残ります。）`))
    try {
      const t = await _("/api/rollback", { session_id: o.sessionId, turn_id: e });
      if (!t.ok) {
        $("system", "⚠️ 巻き戻せませんでした（スナップショット無し: 古すぎるか容量上限）。");
        return;
      }
      $("system", t.restored.length ? `${t.restored.length}件を巻き戻しました: ${t.restored.join(", ")}` : "戻す変更はありませんでした（既にターン前の内容と同じです）。"), t.restored.length && await ci(t.restored);
    } catch (t) {
      alert("⚠️ 巻き戻しに失敗しました: " + t.message);
    }
}
function li(e) {
  if (o.streaming && !(e && S.current(e) && S.state.phase === "switching")) {
    alert("⚠️ 実行中です。中断してから新しい会話を開始してください。");
    return;
  }
  o.sessionId = We(), l("messages").innerHTML = "", l("approval").classList.add("hidden"), me.length && ie(), o.assistantEl = null, $("system", "新しい会話を開始しました（別セッション）。"), Le();
}
function Ta(e, t) {
  _("/api/code-chat/log", { session_id: o.sessionId, user: e, assistant: t }).catch(() => {
  });
}
function Na(e) {
  if (!e) return "";
  const t = Math.max(0, Date.now() / 1e3 - e);
  return t < 60 ? "たった今" : t < 3600 ? `${Math.floor(t / 60)}分前` : t < 86400 ? `${Math.floor(t / 3600)}時間前` : `${Math.floor(t / 86400)}日前`;
}
async function di() {
  if (o.streaming) {
    alert("⚠️ 実行中です。中断してから開いてください。");
    return;
  }
  l("sessions-modal").classList.remove("hidden");
  const e = l("sessions-list");
  e.innerHTML = "";
  let t = [];
  try {
    t = (await ee("/api/code-chat/sessions")).sessions || [];
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
    n.session_id === o.sessionId && s.classList.add("current");
    const i = document.createElement("div");
    i.className = "sess-item";
    const r = document.createElement("div");
    r.className = "sess-title", r.textContent = n.title;
    const a = document.createElement("div");
    a.className = "sess-sub", a.textContent = `${Na(n.updated_at)} ・ ${n.messages} メッセージ` + (n.session_id === o.sessionId ? " ・現在の会話" : ""), i.append(r, a);
    const c = document.createElement("button");
    c.type = "button", c.textContent = "削除", c.title = "この会話を削除", c.addEventListener("click", async (d) => {
      d.stopPropagation(), confirm(`「${n.title}」を削除しますか？`) && (await _("/api/code-chat/delete", { session_id: n.session_id }).catch(() => {
      }), di());
    }), s.append(i, c), s.addEventListener("click", () => Ra(n.session_id)), e.appendChild(s);
  }
}
async function Ra(e) {
  const t = S.begin("switching");
  if (!t) return;
  let n = "";
  l("sessions-modal").classList.add("hidden");
  try {
    const s = await ee("/api/code-chat/session?session_id=" + encodeURIComponent(e)), i = await _(
      "/api/code-chat/restore",
      { session_id: e, messages: s.messages }
    );
    S.finish(t), o.sessionId = e, Le(), l("messages").innerHTML = "";
    for (const r of s.messages || []) $(r.role, r.content, { assetBase: Ve() });
    $("system", i.ok ? "✓ 会話を復元しました（エンジンの文脈も引き継がれています。続きから話せます）。" : "✓ 会話の表示を復元しました（このエンジンでは文脈の復元は未対応です）。"), Y(!0);
  } catch (s) {
    n = s.message, alert("⚠️ 会話を復元できませんでした: " + s.message);
  } finally {
    S.finish(t, n);
  }
}
function Le() {
  l("session-info").textContent = "session: " + o.sessionId.slice(0, 8);
}
function Ia(e, t, n) {
  let s = "", i = 0;
  for (const c of Ls(t))
    s += t.slice(i, c.start) + "修正案（差分で確認）", i = c.end;
  s += t.slice(i), je(e.querySelector(".body"), s, { assetBase: Ve() });
  const r = document.createElement("div");
  r.className = "apply-actions";
  const a = document.createElement("button");
  a.className = "apply-btn", a.textContent = `▶ 差分で反映（${n.length}箇所）`, a.addEventListener("click", () => Aa(n, e)), r.appendChild(a), e.appendChild(r), Y();
}
async function Aa(e, t) {
  const n = o.editor.getModel().getValue();
  let s;
  try {
    s = await _("/api/patch", { base: n, edits: e });
  } catch (a) {
    F(t, "⚠️ 適用計算に失敗: " + a.message);
    return;
  }
  if (s.results.forEach((a, c) => {
    a.ok ? a.method !== "exact" && F(t, `ℹ️ 修正${c + 1}: ${a.method} マッチで補正適用`) : F(t, `⚠️ 修正${c + 1}: ${a.error.split(`
`)[0]}`);
  }), s.applied === 0) {
    F(t, "⚠️ 適用できる修正がありませんでした。本文が変わっていないか確認してください。");
    return;
  }
  const i = s.mdflow_warnings || [];
  i.forEach((a) => F(t, `⚠️ mdflow: ${a}`));
  let r = `差分プレビュー：${s.applied}/${e.length} 箇所を適用（右は編集して調整可）`;
  i.length && (r += ` ⚠ mdflow: ${i.length}件の警告`), bn(n, s.content, (a) => {
    const c = o.editor.getModel();
    o.editor.executeEdits(
      "pixie-patch",
      [{ range: c.getFullModelRange(), text: a, forceMoveMarkers: !0 }]
    ), o.editor.focus();
  }, r);
}
function Pa() {
  o.pendingTarget?.coll && o.pendingTarget.coll.clear();
  const e = o.editor.getSelection();
  if (!e || e.isEmpty())
    return o.pendingTarget = null, null;
  const t = o.editor.createDecorationsCollection([
    { range: e, options: { className: "pixie-pending-target" } }
  ]);
  return o.pendingTarget = { file: o.currentFile, coll: t }, o.pendingTarget;
}
function Da(e, t, n) {
  const s = document.createElement("div");
  s.className = "apply-actions";
  const i = document.createElement("button");
  i.className = "insert-btn", i.textContent = "▶ エディタへ反映", i.title = "このメッセージの提案を差分プレビューで確認してから反映する", i.addEventListener("click", () => ui(Gr(t), n)), s.appendChild(i), e.appendChild(s), Y();
}
function Fa(e, t, n) {
  const s = [...t.matchAll(/```apply\s*\n([\s\S]*?)```/g)];
  if (!s.length) return !1;
  const i = s[s.length - 1][1].replace(/\n$/, "");
  e.querySelector(".body").textContent = t.replace(/```apply\s*\n[\s\S]*?```/g, "修正案（下のボックス参照）");
  const r = document.createElement("div");
  r.className = "apply-box", r.textContent = i;
  const a = document.createElement("div");
  a.className = "apply-actions";
  const c = document.createElement("button");
  return c.className = "apply-btn", c.textContent = "▶ 差分で反映", c.addEventListener("click", () => ui(i, n)), a.appendChild(c), e.append(r, a), Y(), !0;
}
function ui(e, t) {
  const n = Ba(t), s = o.editor.getModel().getValueInRange(n);
  bn(s, e, (i) => {
    o.editor.executeEdits("pixie-apply", [{ range: n, text: i, forceMoveMarkers: !0 }]), t?.coll && t.coll.clear(), o.editor.focus();
  });
}
function Ba(e) {
  const t = o.editor.getModel();
  if (e?.coll && e.file === o.currentFile) {
    const n = e.coll.getRange(0);
    if (n) return n;
  }
  return t.getFullModelRange();
}
let G = null, ht = null, me = [], pe = null;
function bn(e, t, n, s, i = {}) {
  const r = o.monaco;
  l("diff-label").textContent = s || "差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）", l("diff-overlay").classList.remove("hidden"), l("diff-apply").classList.toggle("hidden", !!i.approval), l("diff-cancel").classList.toggle("hidden", !!i.approval), l("diff-close").classList.toggle("hidden", !i.approval), G || (G = r.editor.createDiffEditor(l("diff-editor"), {
    theme: "vs-dark",
    automaticLayout: !0,
    renderSideBySide: !0,
    originalEditable: !1,
    readOnly: !1,
    minimap: { enabled: !1 },
    wordWrap: "on",
    fontSize: 14
  })), G.updateOptions({ readOnly: !n && !i.editable });
  const a = i.lang || (o.currentFile ? tn(o.currentFile) : "markdown"), c = r.editor.createModel(e, a), d = r.editor.createModel(t, a);
  G.setModel({ original: c, modified: d }), ht = n ? () => {
    const u = G.getModel().modified.getValue();
    ie(), n(u);
  } : null, G.focus();
}
function ie() {
  if (l("diff-overlay").classList.add("hidden"), ht = null, me = [], pe = null, l("diff-tabs").innerHTML = "", l("diff-approve-edit").classList.add("hidden"), G) {
    const e = G.getModel();
    G.setModel(null), e && (e.original.dispose(), e.modified.dispose());
  }
}
function Ha(e, t = null) {
  me = e, pe = t, l("diff-approve-edit").classList.toggle("hidden", !t);
  const n = l("diff-tabs");
  n.innerHTML = "", e.length > 1 && e.forEach((s, i) => {
    const r = document.createElement("button");
    r.type = "button", r.textContent = (s.path || "").split("/").pop() || s.path, r.title = s.path, r.addEventListener("click", () => ns(i)), n.appendChild(r);
  }), ns(0);
}
function ns(e) {
  const t = me[e];
  t && ([...l("diff-tabs").children].forEach((n, s) => n.classList.toggle("active", s === e)), bn(
    t.before,
    t.after,
    null,
    `承認確認: ${t.path}（左＝現在 ／ 右＝書き込まれる内容${pe ? "・右を編集して修正して承認できます" : ""}）`,
    { approval: !0, editable: !!pe, lang: tn(t.path || "") }
  ));
}
async function Oa(e, t, n) {
  return ai("/api/approve-edit", { id: e, path: t, content: n }, "✓ 修正して承認しました（編集内容を適用）。");
}
function fi(e) {
  o.planText = e, je(l("plan-body"), e), l("plan-label").textContent = "実行計画（承認するまでファイルは変更されません）", l("plan-overlay").classList.remove("hidden");
}
function pi() {
  l("plan-overlay").classList.add("hidden"), l("plan-body").innerHTML = "", o.planText = "";
}
async function ja() {
  const e = o.planText;
  if (!e) return;
  if (pi(), Ne()) {
    o.planExecNext = !0, $("system", "✓ 計画を承認しました。実装を開始します（書き込みは引き続き承認制）。"), l("chat-input").value = `以下の実行計画を承認しました。この計画のとおりに実装してください。計画から外れる変更が必要になったら、実行する前に知らせてください。

` + e, await Oe();
    return;
  }
  if (!await on("code", { keepMessages: !0 })) {
    fi(e);
    return;
  }
  $("system", "計画を承認しました。Codeモードで実行します。"), l("chat-input").value = `以下の実行計画を承認しました。この計画のとおりに実装してください。計画から外れる変更が必要になったら、実行する前に知らせてください。

` + e, await Oe();
}
function ss() {
  l("plan-overlay").classList.add("hidden"), $("system", "✕ 計画の修正を依頼します。どこをどう直したいかチャットに書いてください。"), l("chat-input").focus();
}
async function be(e) {
  const t = await K("/api/workspace/dirs?path=" + encodeURIComponent(e || ""));
  if (!t) return;
  l("root-input").value = t.cwd || "", fn();
  const n = l("root-drives");
  n.innerHTML = "";
  for (const i of t.drives || []) {
    const r = document.createElement("button");
    r.textContent = i, r.classList.toggle("active", (t.cwd || "").toLowerCase().startsWith(i.toLowerCase().slice(0, 2))), r.addEventListener("click", () => be(i)), n.appendChild(r);
  }
  const s = l("root-dirlist");
  if (s.innerHTML = "", t.parent && t.parent !== t.cwd) {
    const i = document.createElement("li");
    i.textContent = "⬆ ..（上のフォルダへ）", i.addEventListener("click", () => be(t.parent)), s.appendChild(i);
  }
  for (const i of t.dirs || []) {
    const r = document.createElement("li");
    r.textContent = i.name, r.addEventListener("click", () => be(i.path)), s.appendChild(r);
  }
}
async function Jt() {
  l("root-modal").classList.remove("hidden"), await js(), Us(), await be(l("root-path").textContent || "");
}
function it() {
  l("root-modal").classList.add("hidden");
}
const Wa = () => xn(l("root-input").value.trim());
async function xn(e) {
  if (!e) return;
  if (o.streaming) {
    alert("⚠️ 実行中は作業フォルダを切り替えられません。");
    return;
  }
  const t = S.begin("switching");
  if (!t) return;
  let n = "";
  try {
    if (await Ke(), o.dirty && !confirm("未保存の変更があります。破棄して作業フォルダを切り替えますか？")) return;
    let s;
    try {
      s = await _("/api/workspace", { path: e });
    } catch (i) {
      n = i.message, alert("⚠️ フォルダ変更に失敗: " + i.message);
      return;
    }
    it(), o.currentFile = null, o.baseMtime = null, wo(), Xo(), o.collapsedDirs.clear(), o.knownDirs.clear(), o.changedPaths.clear(), o.saveError = null, o.editor.setValue(""), yt(), U(), l("current-file").textContent = "（ファイル未選択）", ke(), _s(), await Ms(), sn(), await vt(), await V(), R() ? (o.sessionId = We(), Le(), l("approval").classList.add("hidden"), o.assistantEl = null, await an()) : li(t), $("system", "作業フォルダを変更: " + (s.workspace || e));
  } catch (s) {
    return n = s.message, alert(s.message), !1;
  } finally {
    S.finish(t, n);
  }
}
async function Ua() {
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
      await V(), await Q(n.path);
    } catch (n) {
      alert("エラー: " + n.message);
    } finally {
      t.disabled = !1, t.textContent = "🌐+";
    }
  }
}
function ue(e) {
  const t = l("cp-bar-status");
  t && (t.textContent = e);
}
async function qa() {
  ue("ブラウザを起動中…");
  try {
    const e = await (await fetch("/api/copilot/open", { method: "POST" })).json();
    ue(e.ok ? "Copilot を開きました。ブラウザで対話してください。" : e.error);
  } catch (e) {
    ue("エラー: " + e.message);
  }
}
async function Ka() {
  if (o.streaming) return;
  const e = l("cp-bar-import-btn");
  e.disabled = !0, ue("会話を取得中…");
  let t;
  try {
    t = await (await fetch("/api/copilot/read", { method: "POST" })).json();
  } catch (i) {
    ue("エラー: " + i.message), e.disabled = !1;
    return;
  }
  if (e.disabled = !1, !t.ok) {
    ue(t.error);
    return;
  }
  ue("");
  const n = l("chat-input"), s = n.value.trim() || "以下は私が Microsoft Copilot と交わした会話ログです。内容を整理して、ノートとして残せる Markdown のまとめを作ってください。";
  n.value = s + `

---

# Copilot 会話ログ

` + t.transcript, await Oe();
}
async function Va() {
  l("settings-modal").classList.remove("hidden"), await Promise.all([
    za(),
    hi(),
    mi(),
    gi()
  ]);
}
async function za() {
  const e = l("settings-model");
  if (!e) return;
  const t = await ee("/api/servers").catch(() => ({ servers: [], active: 0 }));
  e.innerHTML = "", (t.servers || []).forEach((n, s) => {
    const i = document.createElement("option");
    i.value = s, i.textContent = `${n.name} — ${n.model || "(model?)"}`, s === t.active && (i.selected = !0), e.appendChild(i);
  }), e.onchange = async () => {
    try {
      await _("/api/settings", { active_server: Number(e.value) });
    } catch (n) {
      alert("⚠️ 設定を保存できません: " + n.message);
    }
    await Promise.all([hi(), mi(), vt()]);
  };
}
async function mi() {
  const e = await ee("/api/settings").catch(() => ({})), t = l("settings-think-budget");
  t && (e.think_budget_min != null && (t.min = e.think_budget_min), e.think_budget_max != null && (t.max = e.think_budget_max), e.think_budget_sec != null && (t.value = e.think_budget_sec), l("settings-think-budget-status").textContent = "");
  const n = l("settings-context-length");
  n && (e.context_length_min != null && (n.min = e.context_length_min), e.context_length_max != null && (n.max = e.context_length_max), e.context_length != null && (n.value = e.context_length || 0), l("settings-context-length-status").textContent = "");
}
async function is() {
  const e = l("settings-think-budget"), t = l("settings-think-budget-status");
  t.textContent = "保存中…";
  try {
    const n = await _("/api/settings", { think_budget_sec: Number(e.value) });
    e.value = n.think_budget_sec, t.textContent = `✓ ${n.think_budget_sec} 秒にしました`;
  } catch (n) {
    t.textContent = "⚠ " + n.message;
  }
}
async function rs() {
  const e = l("settings-context-length"), t = l("settings-context-length-status");
  t.textContent = "保存中…";
  try {
    const n = await _("/api/settings", { context_length: Number(e.value) });
    e.value = n.context_length || 0, t.textContent = n.context_length ? `✓ ${n.context_length.toLocaleString()} トークンにしました（会話は作り直し）` : "✓ 自動（バックエンドの取得値）に戻しました";
  } catch (n) {
    t.textContent = "⚠ " + n.message;
  }
}
async function hi() {
  const e = l("settings-llm-model");
  if (!e) return;
  e.innerHTML = "", e.disabled = !0;
  const t = document.createElement("option");
  t.textContent = "(取得中…)", e.appendChild(t);
  const n = await ee("/api/models").catch(() => ({ models: [] })), s = n.models || [];
  if (e.innerHTML = "", e.onchange = null, !s.length) {
    const i = document.createElement("option");
    i.value = "", i.textContent = "(取得できません・LM Studio 起動中か確認)", e.appendChild(i), e.disabled = !0;
    return;
  }
  e.disabled = !1, s.forEach((i) => {
    const r = document.createElement("option");
    r.value = i, r.textContent = i.split("/").pop(), i === n.current && (r.selected = !0), e.appendChild(r);
  }), e.onchange = async () => {
    if (e.value) {
      try {
        await _("/api/settings", { model: e.value });
      } catch (i) {
        alert("⚠️ モデルを保存できません: " + i.message);
      }
      await vt();
    }
  };
}
function It() {
  l("settings-modal").classList.add("hidden");
}
async function gi() {
  const e = await ee("/api/copilot").catch(() => ({}));
  l("settings-copilot").checked = !!e.enabled, o.copilotEnabled = !!e.enabled, rn();
  const t = [];
  e.enabled && t.push("オン"), e.script_ok ? e.python_ok ? e.enabled && t.push("PrayLight OK — 未ログインなら下のボタンでブラウザを開いてログイン") : t.push("⚠ PrayLight の .venv Python 未検出") : t.push("⚠ PrayLight 未検出: " + (e.praylight_dir || "?")), l("settings-copilot-status").textContent = t.join(" / ");
}
async function Ga(e) {
  try {
    const t = await _("/api/copilot/enable", { enabled: l("settings-copilot").checked });
    o.copilotEnabled = !!t.enabled, rn();
  } catch (t) {
    alert("⚠️ 設定を保存できません: " + t.message), e.target.checked = !e.target.checked;
  }
  await gi();
}
async function Ya() {
  l("settings-copilot-status").textContent = "起動中…";
  const e = await _("/api/copilot/open").catch(() => ({ ok: !1, error: "通信エラー" }));
  l("settings-copilot-status").textContent = e.ok ? "ブラウザを開きました。Copilot にログインしてください。" : e.error || "起動失敗";
}
function Za() {
  l("send-btn").addEventListener("click", () => o.streaming ? $a() : Oe()), l("new-session-btn").addEventListener("click", li), l("sessions-btn").addEventListener("click", di), l("sessions-close").addEventListener("click", () => l("sessions-modal").classList.add("hidden")), l("sessions-modal").addEventListener("click", (e) => {
    e.target === l("sessions-modal") && l("sessions-modal").classList.add("hidden");
  }), Le(), ke(), l("save-btn").addEventListener("click", () => Wt()), l("preview-btn").addEventListener("click", zt), l("richcopy-btn").addEventListener("click", qo), l("preview").addEventListener("wheel", Gs, { passive: !0 }), l("preview").addEventListener("scroll", () => {
    _o(), se && Xs(o.editor.getModel(), se.range);
  }, { passive: !0 }), document.addEventListener("selectionchange", () => {
    clearTimeout(Gn), Gn = setTimeout(Ro, To);
  }), So(), Vo(), l("refresh-btn").addEventListener("click", () => V()), l("file-search").addEventListener("input", Zo), l("search-case").addEventListener("change", () => gn(l("file-search").value)), l("replace-toggle").addEventListener("click", Qo), l("replace-preview-btn").addEventListener("click", () => Tt(!0)), l("replace-run-btn").addEventListener("click", () => Tt(!1)), l("replace-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Tt(!0));
  }), l("nav-back").addEventListener("click", Ut), l("nav-fwd").addEventListener("click", qt), l("recent-btn").addEventListener("click", (e) => {
    e.stopPropagation(), Kt();
  }), l("history-btn").addEventListener("click", vo), l("hist-close").addEventListener("click", nt), l("hist-restore").addEventListener("click", bo), l("hist-modal").addEventListener("click", (e) => {
    e.target === l("hist-modal") && nt();
  }), xe(), l("mode-btn").addEventListener("click", eo), l("code-style-btn").addEventListener("click", Qr), l("plan-approve").addEventListener("click", ja), l("plan-reject").addEventListener("click", ss), l("note-btn").addEventListener("click", na), l("chat-clear-btn").addEventListener("click", to), ca(), l("ref-add-btn").addEventListener("click", la), l("pick-cancel").addEventListener("click", st), l("pick-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Ie(l("pick-input").value.trim()));
  }), l("pick-modal").addEventListener("click", (e) => {
    e.target === l("pick-modal") && st();
  }), l("diff-apply").addEventListener("click", () => {
    ht && ht();
  }), l("diff-cancel").addEventListener("click", ie), l("diff-close").addEventListener("click", ie), l("diff-approve-edit").addEventListener("click", () => {
    if (!pe || !G) return;
    const e = G.getModel().modified.getValue();
    Oa(pe.id, pe.path, e);
  }), l("chat-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.ctrlKey || e.metaKey) && (e.preventDefault(), Oe());
  }), l("new-file-btn").addEventListener("click", () => at("file")), l("new-folder-btn").addEventListener("click", () => at("dir")), l("web2md-btn").addEventListener("click", Ua), l("cp-bar-open-btn").addEventListener("click", qa), l("cp-bar-import-btn").addEventListener("click", Ka), document.addEventListener("click", Fe), oo(), l("root-project-btn").addEventListener("click", Jt), l("folder-btn").addEventListener("click", Jt), l("root-cancel").addEventListener("click", it), l("root-ok").addEventListener("click", Wa), l("places-btn").addEventListener("click", (e) => {
    e.stopPropagation(), ko();
  }), l("root-fav-btn").addEventListener("click", () => {
    const e = l("root-input").value.trim();
    e && qs(e);
  }), l("root-input").addEventListener("input", fn), l("root-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), be(l("root-input").value.trim()));
  }), l("root-modal").addEventListener("click", (e) => {
    e.target === l("root-modal") && it();
  }), l("settings-btn").addEventListener("click", Va), l("settings-close").addEventListener("click", It), l("settings-think-budget-save").addEventListener("click", is), l("settings-think-budget").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), is());
  }), l("settings-context-length-save").addEventListener("click", rs), l("settings-context-length").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), rs());
  }), l("settings-copilot").addEventListener("change", Ga), l("settings-copilot-open").addEventListener("click", Ya), l("settings-modal").addEventListener("click", (e) => {
    e.target === l("settings-modal") && It();
  }), window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault(), Wt();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault(), zt();
      return;
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault(), e.key === "ArrowLeft" ? Ut() : qt();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "e") {
      e.preventDefault(), Kt();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "h" && se) {
      e.preventDefault(), Js();
      return;
    }
    e.key === "Escape" && !l("hist-modal").classList.contains("hidden") ? nt() : e.key === "Escape" && !l("root-modal").classList.contains("hidden") ? it() : e.key === "Escape" && !l("pick-modal").classList.contains("hidden") ? st() : e.key === "Escape" && !l("cf-modal").classList.contains("hidden") ? l("cf-modal").classList.add("hidden") : e.key === "Escape" && !l("sessions-modal").classList.contains("hidden") ? l("sessions-modal").classList.add("hidden") : e.key === "Escape" && !l("settings-modal").classList.contains("hidden") ? It() : e.key === "Escape" && !l("diff-overlay").classList.contains("hidden") ? ie() : e.key === "Escape" && !l("plan-overlay").classList.contains("hidden") && ss();
  }), window.addEventListener("blur", () => {
    Ke();
  }), window.addEventListener("beforeunload", (e) => {
    o.dirty && (e.preventDefault(), e.returnValue = "");
  }), nc(), sc(), ic();
}
const Xa = "pixie.splitRatio", Ja = "pixie.previewRatio", Qa = 320, ec = 160;
function wi({ divider: e, pane: t, container: n, min: s, key: i, after: r }) {
  const a = (f) => {
    const w = n.clientWidth - s - e.offsetWidth;
    t.style.flex = `0 0 ${Math.max(s, Math.min(f, Math.max(s, w)))}px`, o.editor?.layout(), r?.();
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
    t.style.flex = "", localStorage.removeItem(i), o.editor?.layout();
  });
  const u = () => {
    t.style.flex && a(t.getBoundingClientRect().width);
  };
  return window.addEventListener("resize", u), { restore: c, reclamp: u };
}
let kn = null;
function tc() {
  kn?.restore();
}
function nc() {
  const { restore: e } = wi({
    divider: l("divider"),
    pane: l("left-pane"),
    container: l("split"),
    min: Qa,
    key: Xa,
    // 左ペインが細くなるとプレビュー側が押し出される。エディタは固定幅（flex-shrink:0）
    // なので放っておくとプレビューが 0px に潰れる。現在幅を入れ直して再クランプする。
    after: () => {
      Z() && kn?.reclamp();
    }
  });
  e();
}
function sc() {
  kn = wi({
    divider: l("preview-divider"),
    pane: l("editor"),
    container: l("edit-area"),
    min: ec,
    key: Ja
  });
}
const At = "pixie.filemgrHeight", os = 80;
function ic() {
  const e = l("v-divider"), t = l("filemgr");
  if (!e || !t) return;
  const n = (r) => {
    t.style.flex = `0 0 ${r}px`, t.style.maxHeight = "none";
  }, s = Number(localStorage.getItem(At));
  s >= os && n(s);
  let i = !1;
  e.addEventListener("mousedown", (r) => {
    r.preventDefault(), i = !0, document.body.style.cursor = "row-resize";
  }), window.addEventListener("mouseup", () => {
    i && (i = !1, document.body.style.cursor = "", localStorage.setItem(At, String(t.getBoundingClientRect().height)));
  }), window.addEventListener("mousemove", (r) => {
    if (!i) return;
    const a = t.getBoundingClientRect().top, c = l("right-pane").getBoundingClientRect().bottom - a - 220;
    n(Math.max(os, Math.min(r.clientY - a, c)));
  }), e.addEventListener("dblclick", () => {
    t.style.flex = "", t.style.maxHeight = "", localStorage.removeItem(At);
  });
}
