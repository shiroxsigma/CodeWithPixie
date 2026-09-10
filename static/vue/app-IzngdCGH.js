class re extends Error {
  constructor(t, n) {
    super(t), this.name = "ApiError", this.status = n;
  }
}
async function se(e, t) {
  let n;
  try {
    n = await fetch(e, t);
  } catch {
    throw new re(`サーバに接続できません（${e}）`, 0);
  }
  if (!n.ok) {
    const s = await n.json().catch(() => ({}));
    throw new re(s.detail || n.statusText || `HTTP ${n.status}`, n.status);
  }
  return n.json();
}
const J = (e) => se(e), M = (e, t) => se(e, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: t === void 0 ? void 0 : JSON.stringify(t)
});
async function B(e, t) {
  try {
    return await se(e, t);
  } catch (n) {
    alert("⚠️ " + n.message);
    return;
  }
}
const le = globalThis.jsyaml || null, ns = () => le !== null, Li = "fill:#ff9999,stroke:#333,stroke-width:2px", Ci = "fill:#2a2a2a,stroke:#555,color:#888", $n = /^```[ \t]*(?:yaml[ \t]+)?mdflow-mapping[ \t]*\n([\s\S]*?)^```/gm, ss = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/, Si = /^﻿?---[ \t]*\r?\n/, Mi = /^\s*%%\s*id\s*:\s*(\S+)/m;
function $i(e) {
  const t = Mi.exec(e);
  return t ? t[1] : "";
}
function _i(e) {
  const t = [];
  let n = {}, s = e, i = 0;
  const o = ss.exec(e);
  if (o) {
    try {
      const u = le ? le.load(o[1]) : null;
      u && typeof u == "object" && !Array.isArray(u) ? n = u : u != null && t.push("frontmatter のトップレベルがマッピングではありません");
    } catch (u) {
      t.push(`frontmatter の YAML 構文エラー: ${u.message || u}`);
    }
    s = e.slice(o[0].length), i = o[0].length;
  }
  const a = (n.mdflow || {}).selected, c = {};
  if (a && typeof a == "object" && !Array.isArray(a))
    for (const [u, p] of Object.entries(a)) c[String(u)] = String(p);
  const d = [];
  if (le) {
    $n.lastIndex = 0;
    let u, p = 0;
    for (; (u = $n.exec(s)) !== null; ) {
      p += 1;
      let g;
      try {
        g = le.load(u[1]) || {};
      } catch (y) {
        t.push(`mdflow-mapping ブロック #${p}: YAML 構文エラー: ${y.message || y}`);
        continue;
      }
      if (typeof g != "object" || Array.isArray(g)) {
        t.push(`mdflow-mapping ブロック #${p}: YAML のトップレベルがマッピングではありません`);
        continue;
      }
      const m = [];
      for (const [y, L] of Object.entries(g.presets || {})) {
        const x = L || {};
        m.push({
          name: String(y),
          when: String(x.when ?? ""),
          activeNodes: (x.active_nodes || []).map(String)
        });
      }
      const h = g.style || {};
      d.push({
        diagramId: String(g.diagram ?? ""),
        presets: m,
        activeStyle: String(h.active ?? Li),
        inactiveStyle: String(h.inactive ?? Ci)
      });
    }
  }
  return { meta: n, body: s, bodyOffset: i, selected: c, mappings: d, warnings: t };
}
function Ti(e, t) {
  return t && e.find((n) => n.diagramId === t) || null;
}
class ge extends Error {
}
function Ni(e) {
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
      if (a < 0) throw new ge(`文字列リテラルが閉じていません: ${e}`);
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
    throw new ge(`ルール式に不正な文字 '${s}': ${e}`);
  }
  return t;
}
const Ve = (e) => typeof e == "number" || typeof e == "boolean";
function Ri(e, t, n) {
  if (e === "==" || e === "!=") {
    const s = Ve(t) && Ve(n) ? Number(t) === Number(n) : t === n;
    return e === "==" ? s : !s;
  }
  if (Ve(t) && Ve(n))
    t = Number(t), n = Number(n);
  else if (!(typeof t == "string" && typeof n == "string")) return !1;
  return e === "<" ? t < n : e === "<=" ? t <= n : e === ">" ? t > n : t >= n;
}
function Ii(e, t) {
  if (e = (e || "").trim(), !e) return !0;
  const n = Ni(e);
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
    let m = p();
    if (i()?.t !== "op") return m;
    let h = !0;
    for (; i()?.t === "op"; ) {
      const y = o().v, L = p();
      h && !Ri(y, m, L) && (h = !1), m = L;
    }
    return h;
  }
  function p() {
    const m = o();
    if (!m) throw new ge(`ルール式が途中で終わっています: ${e}`);
    if (m.t === "lit") return m.v;
    if (m.t === "name")
      return t && Object.prototype.hasOwnProperty.call(t, m.v) ? t[m.v] : m.v === "true" ? !0 : m.v === "false" ? !1 : (m.v === "null", null);
    if (m.t === "(") {
      const h = a();
      if (o()?.t !== ")") throw new ge(`括弧が閉じていません: ${e}`);
      return h;
    }
    throw new ge(`ルール式の構文エラー: ${e}`);
  }
  const g = a();
  if (s !== n.length) throw new ge(`ルール式の構文エラー: ${e}`);
  return !!g;
}
function Ai(e, t, n) {
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
      i = Ii(s.when, t || {});
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
const _n = /\b([A-Za-z_][\w-]*)\s*[\[({]/g, Tn = /([A-Za-z_][\w-]*)\s*(?:-{2,3}>|-{2,3}|={2,3}>|-\.->|-\.-)\s*(?:\|[^|]*\|\s*)?([A-Za-z_][\w-]*)/g, Pi = /^\s*(graph|flowchart)\b/i, Nn = /* @__PURE__ */ new Set([
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
function is(e) {
  for (const t of e.split(`
`)) {
    const n = t.trim();
    if (!(!n || n.startsWith("%%")))
      return Pi.test(n);
  }
  return !1;
}
function rs(e) {
  const t = /* @__PURE__ */ new Set();
  for (const n of e.split(`
`)) {
    const s = n.trim();
    if (!s || s.startsWith("%%")) continue;
    Tn.lastIndex = 0;
    let i;
    for (; (i = Tn.exec(s)) !== null; )
      for (const o of [i[1], i[2]]) Nn.has(o) || t.add(o);
    for (_n.lastIndex = 0; (i = _n.exec(s)) !== null; )
      Nn.has(i[1]) || t.add(i[1]);
  }
  return [...t];
}
function Di(e, t, n, s = "mdflowActive", i = null) {
  const o = e.replace(/\n+$/, "");
  if (!t?.length) return { code: o, missing: [] };
  let a = [], c = [...new Set(t)];
  const d = is(e), u = d ? rs(e) : [];
  if (d) {
    const g = new Set(u);
    a = c.filter((m) => !g.has(m)), c = c.filter((m) => g.has(m));
  }
  if (!c.length) return { code: o, missing: a };
  const p = [o, ""];
  if (i && d) {
    const g = new Set(c), m = u.filter((h) => !g.has(h));
    m.length && (p.push(`classDef mdflowInactive ${i};`), p.push(`class ${m.join(",")} mdflowInactive;`));
  }
  return p.push(`classDef ${s} ${n};`), p.push(`class ${c.join(",")} ${s};`), { code: p.join(`
`), missing: a };
}
function Rn(e) {
  return le ? le.dump(String(e), { lineWidth: -1 }).trim() : String(e);
}
function Fi(e) {
  const t = /^\s*(.+?):(?:\s|$)/.exec(e.replace(/\r$/, ""));
  if (!t) return null;
  let n = t[1].trim();
  const s = n[0];
  return (s === '"' || s === "'") && n.endsWith(s) && n.length >= 2 && (n = n.slice(1, -1)), n;
}
const kt = (e) => /^\s*/.exec(e)[0].length;
function Bi(e, t, n) {
  const s = Rn(t), i = n == null ? null : `${s}: ${Rn(n)}`, o = ss.exec(e);
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
  const a = Si.exec(e)[0].length, c = o[1], d = [];
  let u = a;
  for (const v of c.split(`
`))
    d.push({ raw: v, start: u }), u += v.length + 1;
  const p = d.findIndex((v) => /^mdflow:\s*$/.test(v.raw.replace(/\r$/, "")));
  if (p < 0) {
    if (i == null) return null;
    const v = a + c.length;
    return { start: v, end: v, text: `
mdflow:
  selected:
    ${i}` };
  }
  let g = -1;
  for (let v = p + 1; v < d.length; v++) {
    const b = d[v].raw.replace(/\r$/, "");
    if (b.trim() && kt(b) === 0) break;
    if (/^\s+selected:\s*$/.test(b)) {
      g = v;
      break;
    }
  }
  if (g < 0) {
    if (i == null) return null;
    const v = d[p].start + d[p].raw.length + 1;
    return { start: v, end: v, text: `  selected:
    ${i}
` };
  }
  const m = kt(d[g].raw), h = " ".repeat(m + 2);
  let y = -1, L = null;
  for (let v = g + 1; v < d.length; v++) {
    const b = d[v].raw.replace(/\r$/, "");
    if (b.trim() && kt(b) <= m) break;
    if (b.trim() && (L == null && (L = /^\s*/.exec(b)[0]), Fi(b) === t)) {
      y = v;
      break;
    }
  }
  if (y >= 0) {
    const v = d[y], b = v.raw.endsWith("\r");
    if (i == null) {
      const _ = Math.min(v.start + v.raw.length + 1, a + c.length);
      return { start: v.start, end: _, text: "" };
    }
    const C = /^\s*/.exec(v.raw)[0];
    return { start: v.start, end: v.start + v.raw.length - (b ? 1 : 0), text: `${C}${i}` };
  }
  if (i == null) return null;
  const x = d[g].start + d[g].raw.length + 1;
  return { start: x, end: x, text: `${L ?? h}${i}
` };
}
const Hi = 2;
function os(e) {
  return (e || "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "figure";
}
function Oi(e, t) {
  const n = /^\s*%%\s*id\s*:\s*(\S+)/m.exec(e || "");
  return os(n ? n[1] : `figure-${t + 1}`);
}
function ji(e) {
  const t = e.getAttribute("viewBox")?.trim().split(/[\s,]+/);
  if (t?.length === 4) {
    const s = parseFloat(t[2]), i = parseFloat(t[3]);
    if (Number.isFinite(s) && Number.isFinite(i) && s > 0 && i > 0) return { width: s, height: i };
  }
  const n = e.getBoundingClientRect();
  return { width: Math.max(1, n.width), height: Math.max(1, n.height) };
}
function Wi(e) {
  return new Promise((t, n) => {
    const s = new Image();
    s.onload = () => t(s), s.onerror = () => n(new Error("SVG を画像として読み込めませんでした。")), s.src = e;
  });
}
async function as(e, { scale: t = Hi, background: n = null } = {}) {
  const { width: s, height: i } = ji(e), o = e.cloneNode(!0);
  o.setAttribute("width", String(s)), o.setAttribute("height", String(i)), o.removeAttribute("style"), o.getAttribute("xmlns") || o.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const a = new XMLSerializer().serializeToString(o), c = URL.createObjectURL(new Blob([a], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const d = await Wi(c), u = document.createElement("canvas");
    u.width = Math.max(1, Math.round(s * t)), u.height = Math.max(1, Math.round(i * t));
    const p = u.getContext("2d");
    return n && (p.fillStyle = n, p.fillRect(0, 0, u.width, u.height)), p.drawImage(d, 0, 0, u.width, u.height), await new Promise((g, m) => {
      u.toBlob(
        (h) => h ? g(h) : m(new Error("PNG に変換できませんでした。")),
        "image/png"
      );
    });
  } finally {
    URL.revokeObjectURL(c);
  }
}
function Ui(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result).split(",", 2)[1] || ""), s.onerror = () => n(new Error("画像データを読めませんでした。")), s.readAsDataURL(e);
  });
}
async function qi(e) {
  if (!navigator.clipboard?.write || typeof ClipboardItem > "u")
    throw new Error("このブラウザは画像のクリップボードコピーに対応していません。");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": e })]);
}
const Ki = [
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
], Vi = ["<==>", "<-.->", "<-->", "<->", "-.->", "-.-", "-->", "---", "==>", "===", "--x", "--o"], cs = [
  { open: "-.", closers: [[".->", "-.->"], [".-", "-.-"]] },
  { open: "--", closers: [["-->", "-->"], ["---", "---"], ["--x", "--x"], ["--o", "--o"]] },
  { open: "==", closers: [["==>", "==>"], ["===", "==="], ["==x", "==x"], ["==o", "==o"]] }
], zi = cs.flatMap((e) => e.closers.map(([t]) => t)), Gi = /^\s*(?:flowchart(?:-elk)?|graph)(?:\s+[A-Za-z]{2})?\s*;?\s*(?:%%.*)?$/i, Yi = /^\s*(classDef|class|style|linkStyle|click|direction|accTitle|accDescr|title)\b/i, Zi = /^[A-Za-z0-9_\u0080-\uFFFF][A-Za-z0-9_.\-\u0080-\uFFFF]*/, Xi = /^(\s*class\s+)([^\s;]+)(\s+.*)$/i, Ji = /^(\s*style\s+)([^\s;,]+)(\s+.*)$/i, Qi = /^(\s*linkStyle\s+)(\d+(?:\s*,\s*\d+)*)(\s+.*)$/i;
function Xt(e) {
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
      Ge(t, i, o, a);
      continue;
    }
    if (Gi.test(i)) {
      t.hasHeader = !0, Ge(t, i, o, a);
      continue;
    }
    if (/^\s*(subgraph|end)\b/i.test(i))
      return t.supported = !1, t.reason = "subgraph を含む図は編集できません", t;
    if (Yi.test(i)) {
      Ge(t, i, o, a);
      continue;
    }
    const c = nr(i, o, a);
    if (!c) {
      Ge(t, i, o, a);
      continue;
    }
    if (!t.indent && c.type !== "other" && (t.indent = c.indent), t.statements.push(c), c.type === "node")
      In(t, c.ref);
    else {
      c.refs.forEach((d) => In(t, d));
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
const ze = /* @__PURE__ */ new Map(), er = 100;
function tr(e) {
  const t = ze.get(e);
  if (t) return t;
  const n = Xt(e), s = { ok: n.supported, reason: n.reason };
  return ze.size >= er && ze.clear(), ze.set(e, s), s;
}
function Ge(e, t, n, s) {
  const i = { type: "other", start: n, end: s, indent: ls(t) };
  let o;
  (o = Xi.exec(t)) ? i.cls = {
    ids: o[2].split(",").map((a) => a.trim()).filter(Boolean),
    span: { start: n + o[1].length, end: n + o[1].length + o[2].length }
  } : (o = Ji.exec(t)) ? i.styleNode = o[2] : (o = Qi.exec(t)) && (i.link = {
    indices: o[2].split(",").map((a) => parseInt(a, 10)),
    span: { start: n + o[1].length, end: n + o[1].length + o[2].length }
  }), e.statements.push(i);
}
function ls(e) {
  const t = /^([ \t]*)/.exec(e);
  return t ? t[1] : "";
}
function nr(e, t, n, s) {
  const i = ls(e), o = { pos: i.length }, a = () => {
    for (; o.pos < e.length && /\s/.test(e[o.pos]); ) o.pos++;
  }, c = () => t + o.pos;
  function d() {
    a();
    const x = Zi.exec(e.slice(o.pos));
    if (!x) return null;
    let v = x[0];
    const b = v.search(/--|-\.|\.-/);
    if (b > 0 && (v = v.slice(0, b)), v = v.replace(/[-.]+$/, ""), !v) return null;
    const C = c();
    o.pos += v.length;
    const _ = { id: v, span: { start: C, end: C + v.length }, def: null };
    for (const [T, P] of Ki) {
      if (!e.startsWith(T, o.pos)) continue;
      const j = o.pos + T.length;
      let D = -1, ie = !1, A = j;
      if (e[j] === '"') {
        ie = !0, A = j + 1;
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
      const K = D + (ie ? 1 : 0) + P.length;
      let Y = K;
      const pe = /^:::[A-Za-z0-9_-]+/.exec(e.slice(K));
      return pe && (Y = K + pe[0].length), _.def = {
        label: e.slice(A, D),
        quoted: ie,
        shape: [T, P],
        cls: pe ? pe[0] : "",
        labelSpan: { start: t + A, end: t + D },
        span: { start: C, end: t + Y },
        raw: e.slice(C - t, Y)
      }, o.pos = Y, _.span = { start: C, end: t + Y }, _;
    }
    return _;
  }
  function u() {
    a();
    for (const x of Vi) {
      if (!e.startsWith(x, o.pos)) continue;
      const v = c();
      o.pos += x.length;
      const b = {
        text: x,
        mid: null,
        span: { start: v, end: c() },
        label: null,
        labelSpan: null,
        pipeSpan: null
      };
      if (a(), e[o.pos] === "|") {
        const C = e.indexOf("|", o.pos + 1);
        if (C < 0) return null;
        b.label = e.slice(o.pos + 1, C), b.pipeSpan = { start: c(), end: t + C + 1 }, b.labelSpan = { start: c() + 1, end: t + C }, o.pos = C + 1;
      }
      return b;
    }
    return p();
  }
  function p() {
    for (const x of cs) {
      if (!e.startsWith(x.open, o.pos)) continue;
      const v = c(), b = o.pos + x.open.length;
      let C = -1, _ = "", T = "";
      for (let A = b; A < e.length && C < 0; A++)
        for (const [K, Y] of x.closers)
          if (e.startsWith(K, A)) {
            C = A, _ = K, T = Y;
            break;
          }
      if (C < 0) continue;
      const P = e.slice(b, C);
      if (!P.trim()) continue;
      o.pos = C + _.length;
      const j = P.length - P.replace(/^\s+/, "").length, D = P.trim(), ie = t + b + j;
      return {
        text: T,
        // mid があるものは「中置ラベル形式」。raw をそのまま書き戻せば見た目が保たれる。
        mid: { open: x.open, close: _ },
        raw: e.slice(v - t, o.pos),
        span: { start: v, end: c() },
        label: D,
        labelSpan: { start: ie, end: ie + D.length },
        pipeSpan: null
      };
    }
    return null;
  }
  function g() {
    return a(), e[o.pos] === ";" && (o.pos++, a()), o.pos >= e.length || e.slice(o.pos).startsWith("%%");
  }
  const m = d();
  if (!m) return null;
  const h = u();
  if (!h)
    return g() ? { type: "node", start: t, end: n, indent: i, ref: m } : null;
  const y = [m], L = [h];
  for (; ; ) {
    const x = d();
    if (!x) return null;
    if (y.push(x), g()) break;
    const v = u();
    if (!v) return null;
    L.push(v);
  }
  return { type: "edge", start: t, end: n, indent: i, refs: y, arrows: L };
}
function In(e, t) {
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
function Ie(e, t) {
  if (!e) return '" "';
  let n = e.replace(/"/g, "#quot;");
  const s = new Set(t.split(""));
  return (n.includes("|") || [...n].some((i) => s.has(i))) && (n = `"${n}"`), n;
}
function sr(e) {
  return (e || "").replace(/#quot;/g, '"').replace(/#124;/g, "|");
}
const ir = /<br\s*\/?>/gi;
function An(e) {
  return sr(e).replace(ir, `
`);
}
function Lt(e) {
  return String(e ?? "").replace(/\r\n?/g, `
`).split(`
`).join("<br/>");
}
function ds(e) {
  return String(e ?? "").replace(/"/g, "#quot;").replace(/\|/g, "#124;");
}
function rr(e) {
  return e.mid ? e.raw : e.text + (e.label != null ? `|${e.label}|` : "");
}
function Me(e) {
  return e.def ? e.def.raw : e.id;
}
function or(e) {
  for (let t = 1; ; t++) {
    const n = `N${t}`;
    if (!e.has(n)) return n;
  }
}
function us(e, t) {
  const n = e.statements[e.statements.length - 1], s = e.indent || "";
  return n ? { at: n.end, prefix: `
` + s } : { at: 0, prefix: "" };
}
function ar(e, t, n, s) {
  const i = e.nodes.get(n);
  if (!i) return [];
  const o = fs(i);
  if (o.length)
    return ht(o.map((c) => ({
      start: c.labelSpan.start,
      end: c.labelSpan.end,
      text: c.quoted ? s.replace(/"/g, "#quot;") : Ie(s, c.shape[1])
    })));
  const a = i.firstRef;
  return [{ start: a.span.start, end: a.span.end, text: `${a.id}[${Ie(s, "]")}]` }];
}
function fs(e) {
  return e.defs?.length ? e.defs : e.def ? [e.def] : [];
}
function cr(e, t, n, s, i) {
  const o = e.nodes.get(n);
  if (!o) return [];
  const a = fs(o);
  if (!a.length) {
    const c = o.firstRef;
    return [{
      start: c.span.start,
      end: c.span.end,
      text: `${c.id}${s}${Ie(c.id, i)}${i}`
    }];
  }
  return a.every((c) => c.shape[0] === s && c.shape[1] === i) ? [] : ht(a.map((c) => ({
    start: c.span.start,
    end: c.span.end,
    text: `${n}${s}${c.quoted ? `"${c.label}"` : Ie(c.label, i)}${i}${c.cls || ""}`
  })));
}
function lr(e, t, n, s) {
  const i = e.edges[n];
  if (!i) return [];
  const o = i.arrow, a = ds(s);
  return o.mid ? s.trim() ? s.includes("|") || zi.some((d) => s.includes(d)) || s !== s.trim() ? [{ start: o.span.start, end: o.span.end, text: `${o.text}|${a}|` }] : [{ start: o.labelSpan.start, end: o.labelSpan.end, text: a }] : [{ start: o.span.start, end: o.span.end, text: o.text }] : s.trim() ? o.labelSpan ? [{ start: o.labelSpan.start, end: o.labelSpan.end, text: a }] : [{ start: o.span.end, end: o.span.end, text: `|${a}|` }] : o.pipeSpan ? [{ start: o.pipeSpan.start, end: o.pipeSpan.end, text: "" }] : [];
}
function ue(e, t) {
  return e[t.end] === `
` ? { start: t.start, end: t.end + 1, text: "" } : t.start > 0 && e[t.start - 1] === `
` ? { start: t.start - 1, end: t.end, text: "" } : { start: t.start, end: t.end, text: "" };
}
function Jt(e, t, n, s = -1) {
  const i = [], o = /* @__PURE__ */ new Set();
  return e.arrows.forEach((a, c) => {
    if (!t.has(c)) return;
    const [d, u] = c === s ? [e.refs[c + 1], e.refs[c]] : [e.refs[c], e.refs[c + 1]];
    i.push(`${Me(d)} ${rr(a)} ${Me(u)}`), o.add(c), o.add(c + 1);
  }), e.refs.forEach((a, c) => {
    a.def && !o.has(c) && !(n && n.has(a.id)) && i.push(Me(a));
  }), i.map((a) => e.indent + a).join(`
`);
}
function ht(e) {
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
function ps(e, t, n) {
  if (!n.size) return [];
  const s = [...n], i = (a) => a - s.filter((c) => c < a).length, o = [];
  for (const a of e.statements) {
    if (!a.link) continue;
    const c = a.link.indices.filter((d) => !n.has(d)).map(i);
    if (!c.length) {
      o.push(ue(t, a));
      continue;
    }
    c.join(",") !== a.link.indices.join(",") && o.push({ start: a.link.span.start, end: a.link.span.end, text: c.join(",") });
  }
  return o;
}
function dr(e, t, n) {
  const s = [];
  for (const i of e.statements) {
    if (i.styleNode === n) {
      s.push(ue(t, i));
      continue;
    }
    if (!i.cls || !i.cls.ids.includes(n)) continue;
    const o = i.cls.ids.filter((a) => a !== n);
    s.push(o.length ? { start: i.cls.span.start, end: i.cls.span.end, text: o.join(",") } : ue(t, i));
  }
  return s;
}
function ur(e, t, n) {
  const s = e.edges[n];
  if (!s) return [];
  const i = e.statements[s.stmtIdx], o = ps(e, t, /* @__PURE__ */ new Set([n]));
  if (i.arrows.length === 1)
    o.push(ue(t, i));
  else {
    const a = /* @__PURE__ */ new Set();
    i.arrows.forEach((c, d) => {
      d !== s.indexInStmt && a.add(d);
    }), o.push({ start: i.start, end: i.end, text: Jt(i, a, null) });
  }
  return ht(o);
}
function fr(e, t, n, s) {
  const i = e.edges[n];
  if (!i || i.arrow.text === s) return [];
  const o = i.arrow;
  if (o.mid) {
    const a = o.label ? `|${o.label.replace(/\|/g, "#124;")}|` : "";
    return [{ start: o.span.start, end: o.span.end, text: s + a }];
  }
  return [{ start: o.span.start, end: o.span.end, text: s }];
}
function pr(e, t, n) {
  const s = e.edges[n];
  if (!s) return [];
  const i = e.statements[s.stmtIdx], o = new Set(i.arrows.map((a, c) => c));
  return [{
    start: i.start,
    end: i.end,
    text: Jt(i, o, null, s.indexInStmt)
  }];
}
function mr(e, t, { label: n = "新規ノード" } = {}) {
  const s = or(e.nodes), { at: i, prefix: o } = us(e);
  return { edits: [{ start: i, end: i, text: `${o}${s}[${Ie(n, "]")}]` }], id: s };
}
function hr(e, t, n, s, i = "") {
  const o = (d) => {
    const u = e.nodes.get(d);
    return u ? u.def ? u : { id: d, def: null } : { id: d, def: { raw: `${d}[新規ノード]` } };
  }, a = i ? `|${ds(i)}|` : "", c = us(e);
  return {
    edits: [{
      start: c.at,
      end: c.at,
      text: `${c.prefix}${Me(o(n))} -->${a} ${Me(o(s))}`
    }]
  };
}
function gr(e, t, n) {
  const s = [], i = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Set();
  e.edges.forEach((a, c) => {
    if (!(a.from !== n && a.to !== n)) {
      if (o.add(c), !i.has(a.stmtIdx)) {
        const d = e.statements[a.stmtIdx];
        i.set(a.stmtIdx, new Set(d.arrows.map((u, p) => p)));
      }
      i.get(a.stmtIdx).delete(a.indexInStmt);
    }
  });
  for (const [a, c] of i) {
    const d = e.statements[a];
    if (d.arrows.length === 1) {
      s.push(ue(t, d));
      continue;
    }
    const u = Jt(d, c, /* @__PURE__ */ new Set([n]));
    s.push(u ? { start: d.start, end: d.end, text: u } : ue(t, d));
  }
  for (const a of e.statements)
    a.type === "node" && a.ref.id === n && s.push(ue(t, a));
  return s.push(...dr(e, t, n)), s.push(...ps(e, t, o)), ht(s);
}
function wr(e, t) {
  for (const n of e.statements)
    if (n.start <= t && t <= n.end) return { start: n.start, end: n.end };
  return null;
}
function vr(e, t) {
  let n = e;
  for (const s of [...t].sort((i, o) => o.start - i.start))
    n = n.slice(0, s.start) + s.text + n.slice(s.end);
  return n;
}
function Xe(e, t) {
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
function Je(e, t) {
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
      const y = d.slice(0, m - 1), L = d.slice(m);
      y && L && n.has(y) && n.has(L) && u.push([y, L]);
    }
    const p = u.filter(([m, h]) => t.edges.some((y) => y.from === m && y.to === h)), g = p.length ? p : u;
    if (g.length !== 1) return null;
    [s, i] = g[0];
  }
  const a = [];
  return t.edges.forEach((c, d) => {
    c.from === s && c.to === i && a.push(d);
  }), a.length ? a.length === 1 || o == null ? a[0] : a[Math.min(o, a.length - 1)] : null;
}
const yr = [
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
], Er = [
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
], Ct = "|", xr = 'input, textarea, select, [contenteditable="true"], .monaco-editor';
function br(e, t, n = !1) {
  const s = e.querySelector(".mermaid-tools-status");
  s && (s.textContent = t, s.className = "mermaid-tools-status" + (n ? " error" : ""), setTimeout(() => {
    s.textContent === t && (s.textContent = "", s.className = "mermaid-tools-status");
  }, 6e3));
}
function At(e, t, n, s = null) {
  if (e.querySelector(":scope > .mermaid-editbar")) return null;
  const i = Xt(t.src);
  if (!i.supported)
    return br(e, `⚠ この図は編集できません（${i.reason}）`, !0), n.onExit?.(), null;
  e.classList.add("mermaid-editing");
  const o = { selected: null, arrowPick: null, busy: !1 }, a = document.createElement("div");
  a.className = "mermaid-editbar";
  const c = (f, w, E) => {
    const k = document.createElement("button");
    return k.type = "button", k.textContent = f, k.title = w, k.addEventListener("click", E), a.appendChild(k), k;
  }, d = c("ラベル編集", "選択中のノード/矢印のラベルを編集", gi);
  c("➕ ノード", "ノードを追加（追加後にラベルを編集できます）", wi);
  const u = c("➕ 矢印", "矢印を追加（始点→終点の順にノードをクリック）", vi), p = c("⇄ 反転", "選択中の矢印の向きを入れ替える", yi), g = document.createElement("select");
  g.className = "mermaid-arrow-kind", g.title = "選択中の矢印の線種を変える";
  for (const [f, w] of yr) {
    const E = document.createElement("option");
    E.value = f, E.textContent = w, g.appendChild(E);
  }
  g.addEventListener("change", Ei), a.appendChild(g);
  const m = document.createElement("select");
  m.className = "mermaid-node-shape", m.title = "選択中のノードの形状を変える";
  for (const [f, w, E] of Er) {
    const k = document.createElement("option");
    k.value = f + Ct + w, k.textContent = E, m.appendChild(k);
  }
  m.addEventListener("change", xi), a.appendChild(m);
  const h = c("削除", "選択中のノード/矢印を削除（Delete キーでも可。Ctrl+Z で戻せます）", kn), y = document.createElement("span");
  y.className = "mermaid-edit-hint", a.appendChild(y), c("✓ 完了", "編集モードを終了（Esc でも可）", () => Le(!0)), e.appendChild(a);
  const L = (f) => {
    y.textContent = f;
  }, x = (f) => {
    if (![...g.options].some((w) => w.value === f)) {
      const w = document.createElement("option");
      w.value = f, w.textContent = f, g.appendChild(w);
    }
    g.value = f;
  }, v = (f) => {
    const [w, E] = f || ["[", "]"], k = w + Ct + E;
    if (![...m.options].some((S) => S.value === k)) {
      const S = document.createElement("option");
      S.value = k, S.textContent = `${w}…${E}`, m.appendChild(S);
    }
    m.value = k;
  }, b = () => {
    if (!n.reveal) return;
    const f = o.selected;
    if (!f) {
      n.reveal(null);
      return;
    }
    if (f.kind === "node") {
      const k = i.nodes.get(f.id), S = k?.def ? k.def.span : k?.firstRef?.span;
      n.reveal(S ? { line: wr(i, S.start), focus: S } : null);
      return;
    }
    const w = i.edges[f.idx], E = w ? i.statements[w.stmtIdx] : null;
    n.reveal(w ? { line: E ? { start: E.start, end: E.end } : null, focus: w.arrow.span } : null);
  }, C = () => {
    const f = o.selected, w = f?.kind === "edge", E = f?.kind === "node";
    d.disabled = !f, h.disabled = !f, d.textContent = w ? "ラベル編集（矢印）" : "ラベル編集", p.classList.toggle("hidden", !w), g.classList.toggle("hidden", !w), m.classList.toggle("hidden", !E), u.classList.toggle("active", !!o.arrowPick), w && x(i.edges[f.idx]?.arrow.text || "-->"), E && v(i.nodes.get(f.id)?.def?.shape), o.arrowPick ? L(o.arrowPick.from ? `➕ 矢印: 始点 ${o.arrowPick.from} → 終点のノードをクリック（Escで中止）` : "➕ 矢印: 始点のノードをクリック（Escで中止）") : L(f ? f.kind === "node" ? `選択中: ノード ${f.id}（Delete で削除）` : "選択中: 矢印（Delete で削除）" : "クリック: 選択 ／ ダブルクリック: ラベル編集 ／ Esc: 終了"), b();
  };
  C();
  const _ = () => {
    e.querySelectorAll(".selected").forEach((f) => f.classList.remove("selected")), o.selected = null;
  }, T = (f) => [...e.querySelectorAll("g[id*='flowchart-']")].find((w) => Xe(w.id, i.nodes) === f) || null, P = (f) => [...e.querySelectorAll("path.flowchart-link")].find((w) => Je(w, i) === f) || null, j = (f, w) => {
    _(), o.selected = { kind: "node", id: f }, (w || T(f))?.classList.add("selected"), C();
  }, D = (f, w) => {
    _(), o.selected = { kind: "edge", idx: f }, (w || P(f))?.classList.add("selected"), C();
  }, ie = () => {
    const f = o.selected;
    if (!f) return null;
    if (f.kind === "node") return { kind: "node", id: f.id };
    const w = i.edges[f.idx];
    return w ? { kind: "edge", from: w.from, to: w.to } : null;
  }, A = (f, { editNodeId: w = null, selection: E } = {}) => {
    if (o.busy || !f || !f.length) return;
    o.busy = !0, n.applyEdits(t.src, f, {
      editNodeId: w,
      selection: E === void 0 ? ie() : E
    }) || Le(!1);
  }, K = e.querySelector(":scope > .mermaid-canvas") || e, Y = (f, w) => {
    const E = K.getBoundingClientRect();
    return { x: f - E.left + K.scrollLeft, y: w - E.top + K.scrollTop };
  }, pe = (f) => {
    const w = f.getBoundingClientRect(), E = Y(w.left, w.top);
    return { left: E.x, top: E.y, width: w.width, height: w.height };
  }, H = (f) => {
    try {
      const w = f.getTotalLength();
      if (!w) return null;
      const E = f.getPointAtLength(w / 2).matrixTransform(f.getScreenCTM());
      return { x: E.x, y: E.y };
    } catch {
      return null;
    }
  }, xn = (f) => {
    if (!f) return { left: 8, top: 8, width: 180 };
    const w = Y(f.x, f.y);
    return { left: w.x - 90, top: w.y - 14, width: 180 };
  }, hi = (f, w) => {
    const E = T(f), k = T(w);
    if (!E || !k) return { left: 8, top: 8, width: 180 };
    const S = E.getBoundingClientRect(), W = k.getBoundingClientRect();
    return xn({
      x: (S.left + S.width / 2 + W.left + W.width / 2) / 2,
      y: (S.top + S.height / 2 + W.top + W.height / 2) / 2
    });
  }, Et = ({ left: f, top: w, width: E, value: k, placeholder: S }, W) => {
    e.querySelectorAll(".mermaid-inline-input").forEach((Q) => Q.remove());
    const N = document.createElement("textarea");
    N.className = "mermaid-inline-input", N.rows = 1, N.value = k || "", S && (N.placeholder = S), N.style.left = `${Math.max(0, f)}px`, N.style.top = `${Math.max(0, w)}px`, N.style.width = `${Math.max(160, E)}px`, K.appendChild(N);
    const me = () => {
      N.style.height = "auto", N.style.height = `${N.scrollHeight}px`;
    };
    me(), N.focus(), N.select();
    let Ce = !1;
    const bt = (Q) => {
      if (Ce) return;
      Ce = !0;
      const ki = N.value;
      N.remove(), Q && W(ki);
    };
    N.addEventListener("keydown", (Q) => {
      Q.stopPropagation(), Q.key === "Enter" && !Q.shiftKey ? (Q.preventDefault(), bt(!0)) : Q.key === "Escape" && bt(!1);
    }), N.addEventListener("input", me), N.addEventListener("blur", () => bt(!0));
  }, xt = (f, w) => {
    const E = An(i.nodes.get(w)?.def?.label ?? ""), k = pe(f);
    Et({
      left: k.left,
      top: k.top,
      width: k.width + 24,
      value: E,
      placeholder: "ノードラベル（Shift+Enter で改行）"
    }, (S) => {
      S !== E && A(ar(i, t.src, w, Lt(S)));
    });
  }, bn = (f, w) => {
    const E = An(i.edges[f]?.arrow?.label || ""), k = xn(w ? H(w) : null);
    Et(
      { ...k, value: E, placeholder: "矢印ラベル（Shift+Enter で改行・空で削除）" },
      (S) => {
        S !== E && A(lr(i, t.src, f, Lt(S)));
      }
    );
  };
  function gi() {
    const f = o.selected;
    if (f)
      if (f.kind === "node") {
        const w = T(f.id);
        w && xt(w, f.id);
      } else
        bn(f.idx, P(f.idx));
  }
  function wi() {
    const { edits: f, id: w } = mr(i, t.src, {});
    A(f, { editNodeId: w, selection: { kind: "node", id: w } });
  }
  function vi() {
    o.arrowPick = o.arrowPick ? null : {}, _(), C();
  }
  function yi() {
    const f = o.selected;
    if (f?.kind !== "edge") return;
    const w = i.edges[f.idx];
    w && A(
      pr(i, t.src, f.idx),
      { selection: { kind: "edge", from: w.to, to: w.from } }
    );
  }
  function Ei() {
    const f = o.selected;
    f?.kind === "edge" && A(fr(i, t.src, f.idx, g.value));
  }
  function xi() {
    const f = o.selected;
    if (f?.kind !== "node") return;
    const [w, E] = m.value.split(Ct);
    A(cr(i, t.src, f.id, w, E));
  }
  function kn() {
    const f = o.selected;
    f && A(f.kind === "node" ? gr(i, t.src, f.id) : ur(i, t.src, f.idx), { selection: null });
  }
  const bi = (f) => {
    const w = f.getBoundingClientRect(), E = w.left + w.width / 2, k = w.top + w.height / 2;
    let S = null, W = 1 / 0;
    for (const N of e.querySelectorAll("path.flowchart-link")) {
      const me = H(N);
      if (!me) continue;
      const Ce = (me.x - E) ** 2 + (me.y - k) ** 2;
      Ce < W && (W = Ce, S = N);
    }
    return W < 1600 ? S : null;
  }, Ln = (f) => {
    const w = f.target.closest("path.flowchart-link");
    if (w) return w;
    const E = f.target.closest(".edgeLabel");
    return E ? bi(E) : null;
  }, Cn = (f) => {
    if (f.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const w = f.target.closest("g[id*='flowchart-']");
    if (w) {
      const k = Xe(w.id, i.nodes);
      if (!k) return;
      if (o.arrowPick) {
        if (!o.arrowPick.from)
          o.arrowPick = { from: k }, _(), w.classList.add("selected"), C();
        else {
          const S = o.arrowPick.from;
          o.arrowPick = null, _(), C(), Et(
            { ...hi(S, k), value: "", placeholder: "矢印ラベル（空でも可・Shift+Enter で改行）" },
            (W) => A(
              hr(i, t.src, S, k, Lt(W)).edits,
              { selection: { kind: "edge", from: S, to: k } }
            )
          );
        }
        return;
      }
      j(k, w);
      return;
    }
    const E = Ln(f);
    if (E) {
      const k = Je(E, i);
      if (k != null) {
        D(k, E);
        return;
      }
      L("⚠️ この矢印はソースと対応付けできませんでした（特殊な記法の可能性）。");
      return;
    }
    !o.arrowPick && o.selected && (_(), C());
  }, Sn = (f) => {
    if (f.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const w = f.target.closest("g[id*='flowchart-']");
    if (w) {
      f.preventDefault();
      const S = Xe(w.id, i.nodes);
      S && xt(w, S);
      return;
    }
    const E = Ln(f);
    if (!E) return;
    const k = Je(E, i);
    k != null && (f.preventDefault(), D(k, E), bn(k, E));
  }, Mn = (f) => {
    if (!e.isConnected) {
      Le(!1);
      return;
    }
    if (!f.target?.closest?.(xr)) {
      if (f.key === "Escape") {
        if (o.arrowPick) {
          o.arrowPick = null, _(), C();
          return;
        }
        Le(!0);
        return;
      }
      if ((f.key === "Delete" || f.key === "Backspace") && o.selected) {
        f.preventDefault(), kn();
        return;
      }
      if ((f.ctrlKey || f.metaKey) && !f.altKey) {
        const w = f.key.toLowerCase();
        w === "z" && !f.shiftKey ? (f.preventDefault(), n.undo?.()) : (w === "y" || w === "z" && f.shiftKey) && (f.preventDefault(), n.redo?.());
      }
    }
  };
  e.addEventListener("click", Cn), e.addEventListener("dblclick", Sn), document.addEventListener("keydown", Mn);
  function Le(f) {
    e.removeEventListener("click", Cn), e.removeEventListener("dblclick", Sn), document.removeEventListener("keydown", Mn), e.classList.remove("mermaid-editing"), a.remove(), e.querySelectorAll(".mermaid-inline-input").forEach((w) => w.remove()), _(), n.reveal?.(null), f && n.onExit?.();
  }
  return s && requestAnimationFrame(() => {
    if (!e.isConnected || !a.isConnected) return;
    const f = s.selection;
    if (f?.kind === "node" && i.nodes.has(f.id))
      j(f.id);
    else if (f?.kind === "edge") {
      const w = i.edges.findIndex((E) => E.from === f.from && E.to === f.to);
      w >= 0 && D(w);
    }
    if (s.editNodeId) {
      const w = T(s.editNodeId);
      w && xt(w, s.editNodeId);
    }
  }), () => Le(!1);
}
function kr(e) {
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
      const p = /^\s*(`{3,}|~{3,})\s*$/.exec(t[u]);
      if (!p || p[1][0] !== c[0] || p[1].length < c.length) continue;
      const g = n[u];
      i.push({ start: d, end: g, content: e.slice(d, g) }), o = u;
      break;
    }
  }
  return i;
}
function Pn(e, t) {
  if (e.content === t) return { ...e, indent: "", toRaw: (p) => p };
  const n = e.content.split(`
`), s = t.split(`
`);
  if (n.length !== s.length) return null;
  const i = [], o = [];
  let a = 0, c = 0, d = "";
  for (let p = 0; p < n.length; p++) {
    const g = n[p].endsWith("\r") ? n[p].slice(0, -1) : n[p], m = s[p];
    if (!g.endsWith(m)) return null;
    const h = g.slice(0, g.length - m.length);
    if (/\S/.test(h)) return null;
    h && !d && (d = h), i.push(a + h.length), o.push(c), a += n[p].length + 1, c += m.length + 1;
  }
  return { ...e, indent: d, toRaw: (p) => {
    let g = 0, m = o.length - 1;
    for (; g < m; ) {
      const h = g + m + 1 >> 1;
      o[h] <= p ? g = h : m = h - 1;
    }
    return i[g] + (p - o[g]);
  } };
}
function ms(e, t, n = 0) {
  const s = kr(e), i = s[n] ? Pn(s[n], t) : null;
  if (i) return i;
  for (const o of s) {
    const a = Pn(o, t);
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
}) : null, ve = window.mermaid || null, Lr = () => O !== null;
ve && ve.initialize({
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
  const e = O.renderer.rules.link_open || ((s, i, o, a, c) => c.renderToken(s, i, o));
  O.renderer.rules.link_open = (s, i, o, a, c) => (s[i].attrSet("target", "_blank"), s[i].attrSet("rel", "noopener noreferrer"), e(s, i, o, a, c));
  const t = O.renderer.rules.image;
  O.renderer.rules.image = (s, i, o, a, c) => {
    const d = s[i].attrGet("src");
    return d && s[i].attrSet("src", Sr(d)), t(s, i, o, a, c);
  };
  const n = O.renderer.rules.fence;
  O.renderer.rules.fence = (s, i, o, a, c) => {
    const d = s[i];
    if (d.info.trim().toLowerCase() === "mermaid" && ve)
      return `<pre class="mermaid-src"${_e && d.map ? ` data-src-line="${d.map[0] + 1}" data-src-end="${d.map[1]}"` : ""}>
${St(d.content)}</pre>`;
    if (/^(?:yaml\s+)?mdflow-mapping$/i.test(d.info.trim())) {
      const u = /^diagram\s*:\s*(\S+)/m.exec(d.content);
      return `<details class="mdflow-mapping"><summary>⚙ ${u ? `条件マッピング: ${St(u[1])}` : "条件マッピング"}</summary><pre>${St(d.content)}</pre></details>`;
    }
    return n(s, i, o, a, c);
  }, O.inline.ruler.before("emphasis", "mark", (s, i) => {
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
  }), O.inline.ruler2.before("emphasis", "mark", (s) => {
    Dn(s, s.delimiters);
    for (const i of s.tokens_meta)
      i?.delimiters && Dn(s, i.delimiters);
    return !0;
  }), O.core.ruler.push("src_line", (s) => {
    if (_e)
      for (const i of s.tokens)
        !i.map || i.nesting < 0 || i.type === "inline" || (i.attrSet("data-src-line", String(i.map[0] + 1)), i.attrSet("data-src-end", String(i.map[1])));
  });
}
function Dn(e, t) {
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
let $e = "", _e = !1;
function Cr(e) {
  $e = e || "";
}
function Sr(e) {
  if (/^(https?:|data:|blob:|\/)/i.test(e)) return e;
  const t = [];
  for (const n of `${$e}/${e}`.split("/"))
    if (!(!n || n === ".")) {
      if (n === "..") {
        t.pop();
        continue;
      }
      t.push(n);
    }
  return "/api/asset?path=" + encodeURIComponent(t.join("/"));
}
function St(e) {
  return e.replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}
let Ye = 0;
const Se = /* @__PURE__ */ new Map(), Mr = 50, it = /* @__PURE__ */ new WeakMap(), Fn = /* @__PURE__ */ new WeakMap(), Ze = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3], Qe = /* @__PURE__ */ new WeakMap();
function $r(e, t) {
  return {
    get() {
      return Qe.get(e)?.get(t.index) || 1;
    },
    set(n) {
      let s = Qe.get(e);
      s || (s = /* @__PURE__ */ new Map(), Qe.set(e, s)), s.set(t.index, n);
    }
  };
}
function _r(e) {
  Qe.delete(e);
}
function Mt(e, t) {
  const n = Ze.findIndex((i) => i >= e - 1e-6), s = n < 0 ? Ze.length - 1 : n;
  return Ze[Math.min(Ze.length - 1, Math.max(0, s + t))];
}
function hs(e, t) {
  const n = e.querySelector("svg"), s = e.__mermaidNatural;
  if (!n || !s) return;
  n.style.width = `${Math.round(s.w * t)}px`, n.style.height = `${Math.round(s.h * t)}px`, n.style.maxWidth = "none";
  const i = e.querySelector(".mermaid-zoom-label");
  i && (i.textContent = `${Math.round(t * 100)}%`);
}
function Tr(e, t) {
  const n = document.createElement("span");
  n.className = "mermaid-zoom";
  const s = (a) => {
    t.set(a), hs(e, a);
  }, i = (a, c, d) => {
    const u = document.createElement("button");
    return u.type = "button", u.textContent = a, u.title = c, u.addEventListener("click", d), n.appendChild(u), u;
  };
  i("➖", "縮小（図の上で Ctrl+ホイールでも）", () => s(Mt(t.get(), -1)));
  const o = i("100%", "等倍に戻す", () => s(1));
  return o.className = "mermaid-zoom-label", i("➕", "拡大（図の上で Ctrl+ホイールでも）", () => s(Mt(t.get(), 1))), e.addEventListener("wheel", (a) => {
    a.ctrlKey && (a.preventDefault(), s(Mt(t.get(), a.deltaY < 0 ? 1 : -1)));
  }, { passive: !1 }), n;
}
function Nr(e, t) {
  Se.size >= Mr && Se.delete(Se.keys().next().value), Se.set(e, t);
}
let Pt = null;
function Rr(e) {
  Pt = e;
}
let Dt = null, Ae = null;
function Ir(e) {
  Dt = e;
}
function Ar(e) {
  Ae = e;
}
function Pr(e, t, n = null) {
  const s = Oi(t.src, t.index || 0), i = document.createElement("div");
  i.className = "mermaid-tools";
  const o = document.createElement("span");
  o.className = "mermaid-tools-status";
  const a = async (u, p, g) => {
    const m = u.textContent;
    u.disabled = !0, u.textContent = "⏳", o.className = "mermaid-tools-status", o.textContent = "";
    try {
      o.textContent = await g() || p;
    } catch (h) {
      o.className = "mermaid-tools-status error", o.textContent = h?.message || String(h);
    } finally {
      u.disabled = !1, u.textContent = m;
      const h = o.textContent;
      setTimeout(() => {
        o.textContent === h && (o.textContent = "", o.className = "mermaid-tools-status");
      }, 6e3);
    }
  }, c = () => as(e.querySelector("svg"), { background: gs() });
  if (i.appendChild(o), n && e.__mermaidNatural && i.appendChild(Tr(e, n)), t.editable && Dt) {
    const { ok: u, reason: p } = tr(t.src), g = document.createElement("button");
    g.type = "button", g.title = u ? "この図を直接編集する（ノード/矢印の操作がMermaidソースへ反映される）" : `この図は直接編集できません（${p}）`, g.textContent = "編集", g.disabled = !u, u && g.addEventListener("click", () => Dt(e, t)), i.appendChild(g);
  }
  if (Pt) {
    const u = document.createElement("button");
    u.type = "button", u.title = "PNG にしてワークスペースへ保存する（同じ図は同じ名前へ書き直す）", u.textContent = "保存", u.addEventListener("click", () => a(u, "保存しました", async () => `✓ ${await Pt(await c(), s)}`)), i.appendChild(u);
  }
  const d = document.createElement("button");
  return d.type = "button", d.title = "PNG をクリップボードへコピーする", d.textContent = "コピー", d.addEventListener("click", () => a(d, "コピーしました", async () => (await qi(await c()), "✓ コピーしました"))), i.appendChild(d), i;
}
function gs() {
  return getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#1e1e2a";
}
function Bn(e, t = {}, n = null) {
  const s = document.createElement("div");
  s.className = "mermaid-box";
  const i = document.createElement("div");
  i.className = "mermaid-canvas", i.innerHTML = e, s.appendChild(i);
  const o = i.querySelector("svg"), a = o?.getAttribute("viewBox")?.trim().split(/[\s,]+/), c = a?.length === 4 ? parseFloat(a[2]) : NaN, d = a?.length === 4 ? parseFloat(a[3]) : NaN;
  return Number.isFinite(c) && Number.isFinite(d) && (s.__mermaidNatural = { w: c, h: d }), o && s.prepend(Pr(s, t, n)), hs(s, n ? n.get() : 1), Ae && Ae(s, t), s;
}
async function Dr(e, t, n) {
  if (!ve) return;
  const s = n.mdflow || null, i = Fn.get(e) || /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map();
  Fn.set(e, o);
  let a = -1;
  for (const c of e.querySelectorAll("pre.mermaid-src")) {
    if (a += 1, it.get(e) !== t) return;
    const d = c.textContent, u = s ? Fr(d, s) : null;
    let p = u ? u.injected : d;
    const g = (b) => {
      c.dataset.srcLine && (b.dataset.srcLine = c.dataset.srcLine), c.dataset.srcEnd && (b.dataset.srcEnd = c.dataset.srcEnd), b.__mermaidMeta = m, c.replaceWith(b), u && b.after(Br(u, s));
    }, m = { src: d, index: a, editable: !!n.editable }, h = i.get(a);
    if (h && h.src === d && h.renderSrc === p) {
      h.meta.index = a, o.set(a, h), g(h.box), Ae && Ae(h.box, h.meta, !0);
      continue;
    }
    const y = (b) => (o.set(a, { src: d, renderSrc: p, box: b, meta: m }), b), L = $r(e, m), x = Se.get(p);
    if (x) {
      g(y(Bn(x, m, L)));
      continue;
    }
    let v;
    try {
      ({ svg: v } = await ve.render(`pixie-mermaid-${Ye++}`, p));
    } catch (b) {
      if (document.getElementById(`dpixie-mermaid-${Ye - 1}`)?.remove(), u && p !== d)
        try {
          p = d, { svg: v } = await ve.render(`pixie-mermaid-${Ye++}`, p);
        } catch {
          document.getElementById(`dpixie-mermaid-${Ye - 1}`)?.remove(), v = null;
        }
      else
        v = null;
      if (v == null) {
        c.classList.add("mermaid-error"), c.title = `Mermaid の構文エラー: ${b?.message || b}`;
        continue;
      }
    }
    if (Nr(p, v), it.get(e) !== t) return;
    g(y(Bn(v, m, L)));
  }
}
function Fr(e, t) {
  if (!ns()) return null;
  const n = $i(e), s = Ti(t.doc.mappings, n);
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
  const c = t.doc.selected[n] || null, d = Ai(s, a ? {} : o, c);
  let u = e, p = [];
  d && ({ code: u, missing: p } = Di(
    e,
    d.activeNodes,
    d.style,
    "mdflowActive",
    d.inactiveStyle
  ));
  const g = {};
  if (is(e)) {
    const m = new Set(rs(e));
    for (const h of s.presets) {
      const y = h.activeNodes.filter((L) => !m.has(L));
      y.length && (g[h.name] = y);
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
    missing: p,
    missingByPreset: g
  };
}
function Br(e, t) {
  const n = document.createElement("div");
  n.className = "mdflow-presets", n.dataset.diagram = e.diagramId;
  const s = document.createElement("div");
  s.className = "mdflow-presets-title", s.textContent = "条件プリセット", n.appendChild(s);
  const i = document.createElement("ul"), o = document.createElement("li");
  o.className = "mdflow-preset-item mdflow-auto", o.dataset.preset = "", o.textContent = "（条件で自動判定）", e.selectedName || o.classList.add("selected"), i.appendChild(o);
  for (const c of e.mapping.presets) {
    const d = document.createElement("li");
    d.className = "mdflow-preset-item", d.dataset.preset = c.name;
    const u = c.when || "（無条件）", p = e.missingByPreset?.[c.name] || [], g = [`when: ${u}`, `active_nodes: ${c.activeNodes.join(", ")}`];
    p.length && g.push(`図に存在しないノードID: ${p.join(", ")}`), d.title = g.join(`
`);
    const m = document.createElement("div");
    m.className = "mdflow-preset-body";
    const h = document.createElement("div");
    h.className = "mdflow-preset-name";
    const y = document.createElement("span");
    if (y.textContent = c.name, h.appendChild(y), p.length) {
      const x = document.createElement("span");
      x.className = "mdflow-warn-badge", x.textContent = "⚠", h.appendChild(x);
    }
    if (e.selectedName === c.name && d.classList.add("selected"), !e.selectedName && e.resolution?.auto && e.resolution.name === c.name) {
      d.classList.add("auto-hit");
      const x = document.createElement("span");
      x.className = "mdflow-badge", x.textContent = "自動", h.appendChild(x);
    }
    m.appendChild(h);
    const L = document.createElement("span");
    L.className = "mdflow-when", L.textContent = u, m.appendChild(L), d.appendChild(m), i.appendChild(d);
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
function Oe(e, t, n = {}) {
  if (!O) {
    e.classList.remove("md"), e.textContent = t;
    return;
  }
  e.classList.add("md");
  const s = $e, i = _e;
  n.assetBase != null && ($e = n.assetBase || ""), _e = !!n.sourceMap;
  try {
    e.innerHTML = O.render(t);
  } finally {
    n.assetBase != null && ($e = s), _e = i;
  }
  const o = (it.get(e) || 0) + 1;
  return it.set(e, o), Dr(e, o, n);
}
function ws(e, t) {
  e.classList.remove("md"), e.textContent = t;
}
let he = null;
function et() {
  return typeof window.TurndownService == "function";
}
function Hr() {
  return et() ? he || (he = new window.TurndownService({
    headingStyle: "atx",
    // # 見出し（アプリのノート記法と揃える）
    codeBlockStyle: "fenced",
    // ``` フェンス
    bulletListMarker: "-",
    emDelimiter: "_"
  }), window.turndownPluginGfm?.gfm && he.use(window.turndownPluginGfm.gfm), he.addRule("dropBrokenImg", {
    filter: (e) => e.nodeName === "IMG" && !e.getAttribute("src"),
    replacement: () => ""
  }), he) : null;
}
function Or(e) {
  const t = Hr();
  if (!t) throw new Error("Turndown が未取得です（python -m pipenv run python scripts/fetch_turndown.py を実行してください）");
  return t.turndown(e);
}
const l = (e) => document.getElementById(e), jr = 60;
let Ft = !0, Hn = null;
function vs() {
  const e = l("messages");
  return e && e !== Hn && (Hn = e, e.addEventListener("scroll", () => {
    Ft = Wr(e);
  })), e;
}
function Wr(e) {
  return e.scrollHeight - e.scrollTop - e.clientHeight <= jr;
}
function $(e, t, n = {}) {
  const s = document.createElement("div");
  s.className = "msg " + e;
  const i = document.createElement("div");
  return i.className = "body", e === "assistant" ? Oe(i, t, n) : ws(i, t), s.appendChild(i), vs().appendChild(s), z(e === "user"), s;
}
function ys(e, t) {
  if (!e || e.querySelector(".msg-del")) return;
  const n = document.createElement("button");
  n.className = "msg-del", n.type = "button", n.textContent = "削除", n.title = "この往復を削除（LLM の文脈からも消してコンテキストを節約する）", n.addEventListener("click", t), e.appendChild(n);
}
function Ur(e, t) {
  if (!e || e.querySelector(".msg-rollback")) return;
  const n = document.createElement("button");
  n.className = "msg-rollback", n.type = "button", n.textContent = "戻す", n.title = "このターンで変更されたファイルを、ターンの前の状態へ戻す（以降のターンで同じファイルに加えられた変更も巻き戻る）", n.addEventListener("click", t), e.appendChild(n);
}
function R(e, t, n = {}) {
  let s = e.querySelector(".tool-log");
  s || (s = document.createElement("div"), s.className = "tool-log", e.insertBefore(s, e.querySelector(".body")));
  const i = document.createElement("div");
  i.className = "tool-status", n.category && i.classList.add("status-" + n.category), n.tool && (i.dataset.tool = n.tool), i.textContent = t, s.appendChild(i), z();
}
function z(e = !1) {
  const t = vs();
  t && (e && (Ft = !0), Ft && (t.scrollTop = t.scrollHeight));
}
function Bt(e) {
  const t = e.indexOf("<think>");
  if (t < 0) return { think: "", visible: e };
  const n = e.lastIndexOf("</think>");
  return n < t ? { think: e.slice(t + 7), visible: e.slice(0, t) } : {
    think: e.slice(t + 7, n),
    visible: (e.slice(0, t) + e.slice(n + 8)).replace(/^\s+/, "")
  };
}
function Es(e) {
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
    let u = 0, p = !1;
    for (a++; a < t.length; a++) {
      const h = t[a].trim();
      if (u === 0 && h === "```replace") {
        p = !0;
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
          p = !0, a = y;
          break;
        }
        d.push(t[a]);
        continue;
      }
      h.startsWith("```") && h.length > 3 && u++, d.push(t[a]);
    }
    if (!p) continue;
    const g = [];
    let m = -1;
    for (u = 0, a++; a < t.length; a++) {
      const h = t[a].trim();
      if (h === "```") {
        if (u > 0) {
          u--, g.push(t[a]);
          continue;
        }
        m = a, a++;
        break;
      }
      if (u === 0 && h === "```search") {
        m = a - 1;
        break;
      }
      h.startsWith("```") && h.length > 3 && u++, g.push(t[a]);
    }
    m < 0 || o.push({
      search: d.join(`
`),
      replace: g.join(`
`),
      start: n[c],
      end: i(m)
    });
  }
  return o;
}
function qr(e) {
  return Es(e).map(({ search: t, replace: n }) => ({ search: t, replace: n }));
}
function Kr(e) {
  if (e = Bt(e).visible, !e.trim()) return "";
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
    if (i.length >= e.trim().length * 0.6) return Vr(i);
  }
  return e.trim();
}
function Vr(e) {
  return e.split(`
`).filter((t) => !/^(-|@@|---|\+\+\+)/.test(t)).map((t) => t.startsWith("+") || t.startsWith(" ") ? t.slice(1) : t).join(`
`).replace(/\n$/, "");
}
function je() {
  return crypto.randomUUID && crypto.randomUUID() || "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
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
  streaming: !1,
  abort: null,
  assistantEl: null,
  // 進行中ターンのアシスタント吹き出し
  assistantUi: null,
  // beginAssistantStream のハンドル
  turnId: 0,
  // 進行中ターンのサーバ側 ID（turn イベント。0 = 文脈編集不可）
  compacted: null,
  // /compact の結果（compacted イベント）。ターン確定時に畳む
  sessionId: je(),
  // このタブ/会話のセッション。並行セッションはサーバ側で分離される。
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
}, I = () => r.mode === "note", We = () => r.mode === "plan", Te = () => r.mode === "code", zr = {
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
}, gt = (e) => (e.split(".").pop() || "").toLowerCase(), Qt = (e) => zr[gt(e)] || "plaintext", xs = (e) => !!e && ["md", "markdown"].includes(gt(e)), Gr = () => "";
let bs = /* @__PURE__ */ new Set([".pptx", ".docx", ".xlsx", ".pdf"]);
const en = (e) => bs.has("." + gt(e));
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
  }), r.noteDecorations = r.editor.createDecorationsCollection(), vt(), r.editor.onDidChangeModelContent(() => {
    Is(), As(), Us();
  }), r.editor.onDidScrollChange(() => Ks()), r.editor.onDidChangeCursorSelection(Xs), r.editor.addCommand(e.KeyMod.CtrlCmd | e.KeyCode.KeyS, () => Ot()), r.editor.addCommand(
    e.KeyMod.CtrlCmd | e.KeyMod.Shift | e.KeyCode.KeyP,
    () => Kt()
  ), r.editor.addCommand(e.KeyMod.Alt | e.KeyCode.LeftArrow, () => jt()), r.editor.addCommand(e.KeyMod.Alt | e.KeyCode.RightArrow, () => Wt()), r.editor.addCommand(e.KeyMod.CtrlCmd | e.KeyCode.KeyE, () => Ut()), r.editor.onMouseDown((n) => {
    I() && n.target.type === e.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && ea(n.target.position.lineNumber);
  });
  const t = r.editor.getContainerDomNode();
  t.addEventListener("wheel", qs, { passive: !0, capture: !0 }), t.addEventListener("paste", (n) => {
    if (!I()) return;
    const s = Gn(n.clipboardData);
    s && (n.preventDefault(), n.stopPropagation(), Yn(s));
  }, !0), t.addEventListener("dragover", (n) => {
    I() && n.dataTransfer?.types?.includes("Files") && (n.preventDefault(), n.stopPropagation());
  }, !0), t.addEventListener("drop", (n) => {
    if (!I() || !n.dataTransfer?.files?.length) return;
    n.preventDefault(), n.stopPropagation();
    const s = Gn(n.dataTransfer);
    if (!s) {
      alert("⚠️ 貼り付けられるのは画像ファイルだけです。");
      return;
    }
    Yn(s);
  }, !0), Yr();
});
async function Yr() {
  Rr(Bo), Ir(qo), Ar(Vo), await ks(), tn(), await wt(), await q(), I() && await rn(), za();
}
async function ks() {
  try {
    Ht(await J("/api/mode"));
  } catch {
    Ht({ mode: "code", features: {} });
  }
}
const Ne = ["code", "plan", "note"], Pe = { code: "Code", plan: "Plan", note: "Note" };
function Ht(e) {
  r.mode = Ne.includes(e.mode) ? e.mode : "code", r.features = e.features || {}, Array.isArray(r.features.extract_exts) && (bs = new Set(r.features.extract_exts)), r.copilotEnabled = !!r.features.copilot;
}
function tn() {
  const e = I(), t = l("mode-btn");
  for (const n of Ne)
    document.body.classList.toggle("mode-" + n, r.mode === n), t.classList.toggle("mode-" + n, r.mode === n);
  t.textContent = Pe[r.mode], t.title = `現在: ${Pe[r.mode]} モード（クリックで次のモードへ切替）`, We() || di(), r.editor?.updateOptions({ glyphMargin: e }), Xs(), nn(), Ls(), Ue();
}
function Ls() {
  const e = l("code-style-btn"), t = r.codeStyle === "plan";
  e.textContent = t ? "計画を先に" : "通常", e.title = t ? "Codeモードの進め方: 計画を先に — まず実行計画を提示し、承認してから実装する（クリックで通常へ切替）" : "Codeモードの進め方: 通常 — エージェントが自律的に実装（破壊操作は承認制）。クリックで計画優先へ切替";
}
function Zr() {
  r.codeStyle = r.codeStyle === "plan" ? "normal" : "plan", localStorage.setItem("pixie.codeStyle", r.codeStyle), Ls(), $("system", r.codeStyle === "plan" ? "計画を先に: エージェントはまず実行計画を提示し、承認してから実装します。" : "通常: エージェントが自律的に実装します（破壊操作は従来どおり承認制）。");
}
function nn() {
  const e = !!r.copilotEnabled, t = l("copilot-bar");
  t && t.classList.toggle("hidden", !e);
  const n = l("settings-copilot-controls");
  n && n.classList.toggle("hidden", !e);
  const s = e ? `
（先頭に /copilot と書くと、これまでの調査をまとめて Copilot に質問し、回答を反映します。/copilot_simple ならローカル LLM を経由せず、そのまま直接質問）` : "", i = {
    note: "例）左の選択部分を、チェックした資料を参考にもう少し技術的な表現に。",
    plan: "例）設定画面にダークモードの切替を足したい。まず調べて実行計画を立てて。",
    code: "例）src/foo.py に入力値を検証する関数を追加して。テストも書いて実行して確認して。"
  };
  l("chat-input").placeholder = i[r.mode] + s + `
（/help でコマンド一覧）`;
}
function Cs() {
  r.notes = [], r.noteDecorations?.clear(), r.refs = [], r.checkedRefs.clear(), r.checkedFiles.clear(), r.pendingTarget?.coll && r.pendingTarget.coll.clear(), r.pendingTarget = null, r.mdflowConditions.clear(), r.history = [], r.historyLoaded = !1, l("sel-chip").classList.add("hidden"), ne(), Be();
}
async function Xr() {
  const e = Ne[(Ne.indexOf(r.mode) + 1) % Ne.length];
  await sn(e, { confirm: !0 });
}
async function sn(e, t = {}) {
  if (r.streaming)
    return alert("⚠️ 実行中はモードを切り替えられません。中断してから切り替えてください。"), !1;
  if (e === r.mode) return !0;
  if (t.confirm && !confirm(`${Pe[e]} モードに切り替えますか？
（会話セッションはリセットされます）`)) return !1;
  await qe();
  let n;
  try {
    n = await M("/api/mode", { mode: e });
  } catch (s) {
    return alert("⚠️ モードを切り替えられません: " + s.message), !1;
  }
  return Ht(n), t.keepMessages || (l("messages").innerHTML = ""), l("approval").classList.add("hidden"), l("approval").innerHTML = "", r.assistantEl = null, r.sessionId = je(), be(), Cs(), tn(), await q(), I() ? (await rn(), r.currentFile && (await hn(), await wn()), $("system", "Noteモードに切り替えました（読み取り専用エージェント・クリック反映）。")) : We() ? $("system", "Planモードに切り替えました（調べて実行計画を立てるだけ。承認するまでファイルは変更されません）。") : $("system", "Codeモードに切り替えました（自律エージェント・破壊操作は承認制）。"), !0;
}
async function rn() {
  r.history = [], r.historyLoaded = !1, l("messages").innerHTML = "";
  let e;
  try {
    e = await J("/api/chat/history");
  } catch (s) {
    R($("assistant", ""), `⚠️ 履歴を読み込めませんでした（${s.message}）。この保存先の履歴は、取り違えを防ぐため今回は保存しません。`);
    return;
  }
  let t = null, n = "";
  for (const s of e.messages || []) {
    r.history.push({ role: s.role, content: s.content });
    const i = $(s.role, s.content, { assetBase: Ke() });
    if (s.role === "user") {
      t = i, n = s.content;
      continue;
    }
    i._exchange = { userEl: t, userText: n }, ys(i, () => si(i, 0)), t = null, n = "";
  }
  r.historyLoaded = !0;
}
async function on() {
  if (r.historyLoaded)
    try {
      const e = await M("/api/chat/history", { messages: r.history });
      Array.isArray(e.messages) && (r.history = e.messages);
    } catch {
    }
}
async function Jr() {
  if (r.streaming) {
    alert("⚠️ 応答の生成中は履歴を消去できません。");
    return;
  }
  if (confirm("この保存先の会話履歴を消去しますか？")) {
    try {
      await se("/api/chat/history", { method: "DELETE" });
    } catch (e) {
      alert("⚠️ 履歴を消去できません: " + e.message);
      return;
    }
    r.history = [], r.historyLoaded = !0, l("messages").innerHTML = "";
  }
}
async function wt() {
  try {
    const e = await J("/api/status");
    if (l("model-name").textContent = e.ready ? e.model || "(unset)" : "起動失敗", !e.ready) {
      l("agent-status").textContent = "  ⚠ " + (e.error || "engine not ready");
      return;
    }
    l("agent-status").textContent = `  ・${e.tools} tools`, Ss(e.workspace);
  } catch {
    l("model-name").textContent = "接続不可";
  }
}
function Ss(e) {
  if (!e) return;
  const t = l("root-path");
  t.textContent = e, t.title = e;
  const n = e.split(/[\\/]/).filter(Boolean).pop() || e;
  l("root-project-name").textContent = n || "(未設定)", l("root-project-btn").title = "ルートプロジェクト: " + e + "（クリックで変更）";
}
const an = (e) => e.includes("/") ? e.slice(0, e.lastIndexOf("/")) : "";
function Ms(e, t) {
  const n = new Set((t.files || []).map((s) => s.path));
  for (const s of [...r.fsMap.keys()])
    an(s) === e && !n.has(s) && Qr(s);
  for (const s of t.files || []) {
    const i = r.fsMap.get(s.path);
    i ? (i.size = s.size, i.text = s.text) : r.fsMap.set(s.path, { ...s, loaded: s.type === "dir" ? !1 : void 0 });
  }
  for (const s of t.files || [])
    s.type === "dir" && !r.knownDirs.has(s.path) && (r.knownDirs.add(s.path), r.collapsedDirs.add(s.path));
  t.truncated && (r.treeTruncated = !0);
}
async function rt(e) {
  const t = await B("/api/files/list?path=" + encodeURIComponent(e || ""));
  return t ? (Ms(e, t), !0) : !1;
}
function Qr(e) {
  for (const t of [...r.fsMap.keys()])
    (t === e || t.startsWith(e + "/")) && (r.fsMap.delete(t), r.checkedFiles.delete(t));
}
async function q() {
  r.treeTruncated = !1;
  const e = await B("/api/files/list?path=");
  if (e) {
    Ss(e.root), Ms("", e);
    for (const [t, n] of [...r.fsMap])
      n.type === "dir" && n.loaded && t && await rt(t);
    Ue();
  }
}
function eo(e) {
  if (!e) return !1;
  let t = "";
  for (const n of e.split("/"))
    if (t = t ? t + "/" + n : n, r.collapsedDirs.has(t)) return !0;
  return !1;
}
async function to(e) {
  const t = String(e || "").split("/");
  let n = "";
  for (const s of t.slice(0, -1)) {
    n = n ? n + "/" + s : s, r.fsMap.has(n) || await rt(an(n));
    const i = r.fsMap.get(n);
    i && i.type === "dir" && !i.loaded && await rt(n) && (i.loaded = !0), r.collapsedDirs.delete(n);
  }
}
function Ue() {
  const e = l("file-list");
  e.innerHTML = "";
  const t = [...r.fsMap.values()].filter((n) => !eo(an(n.path))).sort((n, s) => n.path < s.path ? -1 : n.path > s.path ? 1 : 0);
  for (const n of t) {
    const s = n.path.split("/"), i = document.createElement("li");
    i.dataset.path = n.path, i.dataset.type = n.type, i.style.paddingLeft = 8 + (s.length - 1) * 16 + "px", no(i, n);
    const o = document.createElement("span"), a = document.createElement("span");
    if (a.className = "fname", a.textContent = s[s.length - 1], n.type === "dir")
      i.classList.add("dir"), o.textContent = r.collapsedDirs.has(n.path) ? "▸" : "▾", i.append(o, a), i.addEventListener("click", async () => {
        r.collapsedDirs.has(n.path) ? (r.collapsedDirs.delete(n.path), n.loaded || await rt(n.path) && (n.loaded = !0)) : r.collapsedDirs.add(n.path), Ue();
      });
    else {
      if (!We())
        if (n.text || en(n.path)) {
          const c = document.createElement("input");
          c.type = "checkbox", c.title = n.text ? "チャットのコンテキストに含める" : "チャットのコンテキストに含める（テキスト抽出して同梱。/copilot では原本を Copilot に添付）", c.checked = r.checkedFiles.has(n.path), c.addEventListener("click", (d) => d.stopPropagation()), c.addEventListener("change", () => {
            c.checked ? r.checkedFiles.add(n.path) : r.checkedFiles.delete(n.path);
          }), i.appendChild(c);
        } else {
          const c = document.createElement("span");
          c.className = "cb-pad", i.appendChild(c);
        }
      if (o.textContent = n.text ? "" : Gr(n.path), a.title = n.text ? n.path : `${n.path}（クリックで既定アプリで開く）`, i.append(o, a), i.classList.toggle("active", n.path === r.currentFile), r.changedPaths.has(n.path)) {
        i.classList.add("changed");
        const c = document.createElement("span");
        c.className = "changed-badge", c.textContent = "● 変更", i.appendChild(c);
      }
      i.addEventListener("click", () => n.text ? X(n.path) : Rs(n.path));
    }
    i.addEventListener("contextmenu", (c) => {
      c.preventDefault(), ro(c, n);
    }), e.appendChild(i);
  }
  l("files-trunc").classList.toggle("hidden", !r.treeTruncated);
}
let Z = null;
function no(e, t) {
  e.draggable = !0, e.addEventListener("dragstart", (n) => {
    Z = t.path, n.dataTransfer.setData("text/plain", t.path), n.dataTransfer.effectAllowed = "move", e.classList.add("dragging");
  }), e.addEventListener("dragend", () => {
    Z = null, e.classList.remove("dragging"), document.querySelectorAll("#file-list li.drop-target").forEach((n) => n.classList.remove("drop-target"));
  }), t.type === "dir" && (e.addEventListener("dragover", (n) => {
    const s = Z;
    s === null || s === t.path || t.path.startsWith(s + "/") || (n.preventDefault(), n.dataTransfer.dropEffect = "move", e.classList.add("drop-target"));
  }), e.addEventListener("dragleave", () => e.classList.remove("drop-target")), e.addEventListener("drop", (n) => {
    n.preventDefault(), n.stopPropagation(), e.classList.remove("drop-target");
    const s = n.dataTransfer.getData("text/plain") || Z;
    s && s !== t.path && Ns(s, t.path);
  }));
}
function so() {
  const e = l("file-list");
  e.addEventListener("dragover", (t) => {
    Z !== null && (t.target.closest("li") || (t.preventDefault(), t.dataTransfer.dropEffect = "move", e.classList.add("drop-root")));
  }), e.addEventListener("dragleave", (t) => {
    e.contains(t.relatedTarget) || e.classList.remove("drop-root");
  }), e.addEventListener("drop", (t) => {
    if (e.classList.remove("drop-root"), t.target.closest("li")) return;
    t.preventDefault();
    const n = t.dataTransfer.getData("text/plain") || Z;
    n && Ns(n, "");
  });
}
function De() {
  l("fs-menu")?.remove();
}
function io(e, t, n) {
  De();
  const s = document.createElement("div");
  s.id = "fs-menu";
  for (const o of n) {
    const a = document.createElement("div");
    a.className = o.onClick ? "fs-menu-item" : "fs-menu-head", a.textContent = o.label, o.title && (a.title = o.title), o.onClick && a.addEventListener("click", () => {
      De(), o.onClick();
    }), s.appendChild(a);
  }
  s.style.left = "0px", s.style.top = "0px", document.body.appendChild(s);
  const i = s.getBoundingClientRect();
  return s.style.left = Math.max(4, Math.min(e, window.innerWidth - i.width - 4)) + "px", s.style.top = Math.max(4, Math.min(t, window.innerHeight - i.height - 4)) + "px", s;
}
function $s(e, t) {
  const n = e.getBoundingClientRect();
  return io(n.left, n.bottom + 4, t);
}
function ro(e, t) {
  De();
  const n = document.createElement("div");
  n.id = "fs-menu";
  const s = (i, o) => {
    const a = document.createElement("div");
    a.className = "fs-menu-item", a.textContent = i, a.addEventListener("click", () => {
      De(), o();
    }), n.appendChild(a);
  };
  t.type === "dir" ? (s("中に新規ファイル", () => ot("file", t.path + "/")), s("中に新規フォルダ", () => ot("dir", t.path + "/"))) : t.text || s("↗ 既定のアプリで開く", () => Rs(t.path)), s("名前変更・移動", () => oo(t)), s("削除", () => ao(t)), n.style.left = e.pageX + "px", n.style.top = e.pageY + "px", document.body.appendChild(n);
}
async function cn(e, t) {
  try {
    return await M(e, t), !0;
  } catch (n) {
    return alert("⚠️ " + n.message), !1;
  }
}
async function ot(e, t = "") {
  const s = prompt(e === "dir" ? "新規フォルダ名（例: src/utils）" : "新規ファイル名（例: src/main.py）", t);
  if (!s || !s.trim() || s.trim() === t.trim()) return;
  const i = s.trim().replace(/\\/g, "/");
  await cn("/api/fs/create", { path: i, kind: e }) && (e === "dir" && r.collapsedDirs.delete(i), await q(), e === "file" && await X(i));
}
async function oo(e) {
  const t = prompt("新しいパス（フォルダに入れるには src/名前.py のように）", e.path);
  !t || !t.trim() || t.trim() === e.path || await _s(e, t.trim().replace(/\\/g, "/"));
}
async function _s(e, t) {
  if (!t || t === e.path) return;
  if (e.type === "dir" && (t === e.path || t.startsWith(e.path + "/"))) {
    alert("⚠️ フォルダを自分自身の中へは移動できません。");
    return;
  }
  if (!await cn("/api/fs/rename", { src: e.path, dst: t })) return;
  const n = (s) => s === e.path ? t : e.type === "dir" && s.startsWith(e.path + "/") ? t + s.slice(e.path.length) : s;
  if (r.currentFile) {
    const s = n(r.currentFile);
    s !== r.currentFile && (r.currentFile = s, l("current-file").textContent = s);
  }
  r.checkedFiles = new Set([...r.checkedFiles].map(n)), Ts(n), await q();
}
function Ts(e) {
  const t = (n) => {
    const s = [];
    for (const i of n) {
      const o = e(i);
      o && o !== s[s.length - 1] && s.push(o);
    }
    return s;
  };
  r.navBack = t(r.navBack), r.navFwd = t(r.navFwd), r.navRecent = [...new Set(t(r.navRecent))], Ee();
}
async function Ns(e, t) {
  const n = r.fsMap.get(e);
  if (!n) return;
  const s = e.split("/").pop(), i = t ? t + "/" + s : s;
  i !== e && e.split("/").slice(0, -1).join("/") !== t && await _s(n, i);
}
async function ao(e) {
  confirm(`「${e.path}」を削除しますか？`) && await cn("/api/fs/delete", { path: e.path }) && (r.checkedFiles.delete(e.path), Ts((t) => t === e.path ? null : t), r.currentFile === e.path && (r.currentFile = null, r.baseMtime = null, r.editor.setValue(""), vt(), U(), l("current-file").textContent = "（ファイル未選択）", xe(), Ee(), I() && (await hn(), await wn())), await q());
}
async function Rs(e) {
  try {
    await M("/api/fs/open", { path: e });
  } catch (t) {
    alert("⚠️ 開けませんでした: " + t.message);
  }
}
async function X(e, t, n = "push") {
  if (t || await qe(), r.dirty && !t && e !== r.currentFile && !confirm("未保存の変更があります。破棄して開きますか？"))
    return;
  const s = await B("/api/file?path=" + encodeURIComponent(e));
  s && (n === "push" && r.currentFile && r.currentFile !== e && (r.navBack.push(r.currentFile), r.navFwd.length = 0), po(e), r.currentFile = e, r.baseMtime = s.mtime ?? null, r.conflictDeclined = !1, r.mdflowConditions.clear(), Ko(), _r(l("preview")), r.monaco.editor.setModelLanguage(r.editor.getModel(), Qt(e)), r.editor.setValue(s.content), r.saveError = null, vt(), U(), l("current-file").textContent = e, xe(), Ee(), un(), await to(e), Ue(), I() && (await hn(), await wn()));
}
let On = null;
function vt() {
  r.savedVersionId = r.editor.getModel().getAlternativeVersionId(), r.dirty = !1;
}
function Is() {
  r.currentFile && (r.dirty = r.editor.getModel().getAlternativeVersionId() !== r.savedVersionId, U());
}
function U(e) {
  const t = l("save-state");
  if (clearTimeout(On), t.classList.remove("save-error"), t.title = "", e === "saving") {
    t.textContent = "保存中…";
    return;
  }
  if (e === "saved") {
    t.textContent = "保存済", On = setTimeout(U, 1500);
    return;
  }
  if (r.saveError) {
    t.textContent = "⚠️ 保存失敗", t.classList.add("save-error"), t.title = r.saveError.message;
    return;
  }
  t.textContent = r.dirty ? "● 未保存" : "";
}
async function ln() {
  for (; r.savePromise; ) await r.savePromise;
  if (!r.currentFile) return !1;
  r.savePromise = co();
  try {
    return await r.savePromise;
  } finally {
    r.savePromise = null;
  }
}
async function co() {
  const e = r.currentFile, t = r.editor.getValue(), n = r.editor.getModel().getAlternativeVersionId(), s = !r.fsMap.has(e), i = I();
  let o = null;
  i && (yt(), o = r.notes.map((d) => ({ ...d }))), clearTimeout(at), r.saving = !0, U("saving");
  const a = r.currentFile === e ? r.baseMtime : null;
  let c;
  try {
    c = await M("/api/file", { path: e, content: t, base_mtime: a });
  } catch (d) {
    const u = d instanceof re ? d : new re(String(d), 0);
    if (u.status === 409) {
      const p = await uo(e, t);
      if (p) c = p;
      else
        return r.conflictDeclined = !0, r.saveError = new re(
          "外部の変更があるため保存を見送りました（保存ボタン／Ctrl+S でもう一度判断できます）。",
          409
        ), U(), !1;
    } else
      return r.saveError = u, U(), !1;
  } finally {
    r.saving = !1;
  }
  if (r.currentFile === e && (r.baseMtime = c?.mtime ?? r.baseMtime), r.currentFile === e && (r.savedVersionId = n, Is()), s && await q(), i)
    try {
      await gn(e, o);
    } catch (d) {
      return r.saveError = new re(`本文は保存しましたが、付箋の保存に失敗しました: ${d.message}`, 0), U(), !0;
    }
  return r.saveError = null, r.conflictDeclined = !1, U("saved"), !0;
}
function Ot() {
  return r.conflictDeclined = !1, ln();
}
const lo = 2e3;
let at = null;
function As() {
  clearTimeout(at), I() && (r.conflictDeclined || !r.currentFile || !r.dirty || (at = setTimeout(() => {
    if (r.dirty) {
      if (r.saving) {
        As();
        return;
      }
      ln();
    }
  }, lo)));
}
async function qe() {
  clearTimeout(at), I() && (r.conflictDeclined || r.currentFile && r.dirty && await ln());
}
async function uo(e, t) {
  if (!confirm(
    `⚠️ ${e} は、開いた後に別の場所（他のエディタ・エージェント）で変更されています。

［OK］ この内容で上書きする
　　　相手の変更は 🕰 履歴 から元に戻せます。

［キャンセル］ 上書きしない
　　　手元の内容はエディタに残ります。相手の変更を見てから決められます。`
  )) return null;
  try {
    return await M("/api/file", { path: e, content: t, base_mtime: null, force: !0 });
  } catch (s) {
    return r.saveError = s instanceof re ? s : new re(String(s), 0), U(), null;
  }
}
const fo = 15;
function po(e) {
  r.navRecent = [e, ...r.navRecent.filter((t) => t !== e)].slice(0, fo);
}
function mo() {
  r.navBack.length = 0, r.navFwd.length = 0, r.navRecent.length = 0, Ee();
}
function Ee() {
  l("nav-back").disabled = !r.navBack.length, l("nav-fwd").disabled = !r.navFwd.length, l("recent-btn").disabled = r.navRecent.length < 2, l("history-btn").disabled = !r.currentFile;
  const e = r.navBack[r.navBack.length - 1];
  l("nav-back").title = e ? `戻る: ${e} (Alt+←)` : "戻る (Alt+←)";
  const t = r.navFwd[r.navFwd.length - 1];
  l("nav-fwd").title = t ? `進む: ${t} (Alt+→)` : "進む (Alt+→)";
}
async function Ps(e, t) {
  if (!t.length) return;
  const n = t[t.length - 1], s = r.currentFile;
  await X(n, !1, "none"), r.currentFile === n && (t.pop(), s && e.push(s), Ee());
}
const jt = () => Ps(r.navFwd, r.navBack), Wt = () => Ps(r.navBack, r.navFwd);
function Ut() {
  const e = r.navRecent.filter((t) => t !== r.currentFile).map((t) => ({ label: t, title: t, onClick: () => X(t) }));
  e.length && $s(l("recent-btn"), [{ label: "最近開いたファイル" }, ...e]);
}
let Fe = null;
async function ho() {
  r.currentFile && (Fe = null, l("hist-file").textContent = r.currentFile, l("hist-preview").textContent = "", l("hist-preview-head").textContent = "左の版を選ぶと内容が出ます。", l("hist-restore").disabled = !0, l("hist-modal").classList.remove("hidden"), await go());
}
function tt() {
  l("hist-modal").classList.add("hidden");
}
async function go() {
  const e = r.currentFile, t = await B("/api/history?path=" + encodeURIComponent(e)), n = l("hist-list");
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
      o.textContent = Ds(s.saved_at);
      const a = document.createElement("span");
      a.className = "hint", a.textContent = `${s.size.toLocaleString()} B`, i.append(o, a), i.addEventListener("click", () => wo(e, s, i)), n.appendChild(i);
    }
  }
}
function Ds(e) {
  if (!e) return "(不明)";
  const t = new Date(e);
  if (isNaN(t)) return e;
  const n = (s) => String(s).padStart(2, "0");
  return `${t.getMonth() + 1}/${t.getDate()} ${n(t.getHours())}:${n(t.getMinutes())}:${n(t.getSeconds())}`;
}
async function wo(e, t, n) {
  for (const i of l("hist-list").children) i.classList.remove("active");
  n.classList.add("active"), Fe = t.id, l("hist-restore").disabled = !0, l("hist-preview-head").textContent = "読み込み中…";
  const s = await B(
    `/api/history/file?path=${encodeURIComponent(e)}&version_id=${encodeURIComponent(t.id)}`
  );
  !s || Fe !== t.id || (l("hist-preview").textContent = s.content, l("hist-preview-head").textContent = `${Ds(t.saved_at)} の内容`, l("hist-restore").disabled = !1);
}
async function vo() {
  const e = r.currentFile;
  if (!(!e || !Fe) && confirm(`${e} をこの版に戻します。
今の内容も履歴に積まれるので、戻し間違えてもやり直せます。`)) {
    try {
      await M("/api/history/restore", { path: e, version_id: Fe });
    } catch (t) {
      alert("⚠️ 復元に失敗: " + t.message);
      return;
    }
    tt(), await X(e, !0, "none"), U("saved");
  }
}
let F = { favorites: [], recent: [], current: "" };
async function Fs() {
  const e = await B("/api/workspace/places");
  return e && (F = e), F;
}
const Bs = (e) => F.favorites.some((t) => yo(t.path, e)), yo = (e, t) => String(e || "").replace(/[\\/]+$/, "").toLowerCase() === String(t || "").replace(/[\\/]+$/, "").toLowerCase();
async function Eo() {
  await Fs();
  const e = [], t = (n, s) => n.map((i) => ({
    label: `${s} ${i.name}${i.exists ? "" : "（見つかりません）"}`,
    title: i.path,
    onClick: i.exists ? () => yn(i.path) : void 0
  }));
  F.favorites.length && e.push({ label: "お気に入り" }, ...t(F.favorites, "⭐")), F.recent.length && e.push({ label: "最近使ったフォルダ" }, ...t(F.recent, "🕘")), e.push({ label: "フォルダを選ぶ…", onClick: Zt }), !F.favorites.length && !F.recent.length && e.unshift({ label: "行き先はまだありません（フォルダを移動すると溜まります）" }), $s(l("places-btn"), e);
}
function Hs() {
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
      u.className = "place-go", u.textContent = `${i} ${c.name}`, u.title = c.exists ? `${c.path}（クリックでここへ移動）` : `${c.path}（見つかりません）`, u.disabled = !c.exists, u.addEventListener("click", () => yn(c.path));
      const p = document.createElement("button");
      p.className = "place-mini", p.textContent = "開く", p.title = "移動せずに中を見る", p.disabled = !c.exists, p.addEventListener("click", () => ye(c.path));
      const g = document.createElement("button");
      g.className = "place-mini", g.textContent = o ? "★" : "☆", g.title = o ? "お気に入りから外す" : "お気に入りに入れる", g.addEventListener("click", () => Os(c.path, c.name)), d.append(u, p, g), e.appendChild(d);
    }
  };
  t("⭐ お気に入り", F.favorites, "⭐", !0), t("🕘 最近使ったフォルダ", F.recent, "🕘", !1), !F.favorites.length && !F.recent.length && (e.innerHTML = "<div class='hint'>よく使うフォルダは ☆ ボタンでお気に入りに入れておくと、次からここに出ます。</div>");
}
async function Os(e, t) {
  if (e) {
    try {
      Bs(e) ? F = await se(
        "/api/workspace/favorites?path=" + encodeURIComponent(e),
        { method: "DELETE" }
      ) : F = await M("/api/workspace/favorites", { path: e, name: t || "" });
    } catch (n) {
      alert("⚠️ " + n.message);
      return;
    }
    Hs(), dn();
  }
}
function dn() {
  const e = l("root-input").value.trim(), t = l("root-fav-btn"), n = !!e && Bs(e);
  t.textContent = n ? "★" : "☆", t.title = n ? "お気に入りから外す" : "このフォルダをお気に入りに入れる", t.disabled = !e;
}
const xo = 150, bo = 600;
let jn = null, js = 0;
const G = () => !l("preview").classList.contains("hidden"), Ke = () => r.currentFile && r.currentFile.includes("/") ? r.currentFile.slice(0, r.currentFile.lastIndexOf("/")) : "";
function xe() {
  const e = xs(r.currentFile);
  l("preview-btn").disabled = !e, l("preview-btn").title = e ? "Markdown プレビューを表示 (Ctrl+Shift+P)" : "Markdown ファイル（.md）を開いているときだけ使えます";
  const t = l("richcopy-btn");
  t.disabled = !(e && G()), t.title = e && G() ? "プレビューの内容をリッチテキスト（HTML）とMarkdownでコピー。Confluence 等に貼り付け可" : "Markdown プレビュー表示中に使えます", !e && G() && Zs();
}
function Ws() {
  const e = r.editor.getValue();
  let t = e, n = 0;
  const s = {};
  if (I() && r.features.mdflow && ns())
    try {
      const i = _i(e);
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
function un() {
  if (!G()) return;
  Cr(Ke());
  const { text: e, opts: t, lineOffset: n } = Ws();
  t.editable = !0, t.sourceMap = !0, dt = n;
  const s = performance.now(), i = Oe(l("preview"), e, t);
  Ks(), Promise.resolve(i).then(() => {
    js = performance.now() - s;
  });
}
function ko() {
  l("preview").addEventListener("click", (e) => {
    const t = e.target.closest(".mdflow-preset-item");
    if (!t) return;
    const n = t.closest(".mdflow-presets")?.dataset.diagram;
    if (!n) return;
    const s = t.dataset.preset || null, i = Bi(r.editor.getValue(), n, s);
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
    n && (r.mdflowConditions.set(n, t.value), Us());
  });
}
function Us() {
  if (!G()) return;
  clearTimeout(jn);
  const e = Math.min(
    bo,
    Math.max(xo, Math.round(js))
  );
  jn = setTimeout(un, e);
}
const Lo = 120;
let ct = "", Wn = null;
function fn(e) {
  ct = e, clearTimeout(Wn), Wn = setTimeout(() => {
    ct = "";
  }, Lo);
}
const Co = 200;
let lt = !1, Un = null;
function qs() {
  lt = !0, clearTimeout(Un), Un = setTimeout(() => {
    lt = !1;
  }, Co);
}
function Ks() {
  if (lt || !G() || ct === "preview") return;
  const e = r.editor, t = e.getScrollHeight() - e.getLayoutInfo().height, n = t > 0 ? e.getScrollTop() / t : 0, s = l("preview");
  fn("editor"), s.scrollTop = n * (s.scrollHeight - s.clientHeight);
}
function So() {
  if (lt || !G() || ct === "editor" || !r.editor) return;
  const e = l("preview"), t = e.scrollHeight - e.clientHeight, n = t > 0 ? e.scrollTop / t : 0, s = r.editor;
  fn("preview"), s.setScrollTop(n * Math.max(0, s.getScrollHeight() - s.getLayoutInfo().height));
}
const Mo = 80, $o = 300;
let dt = 0, qn = null;
function _o() {
  const e = r.editor, t = e?.getModel();
  if (!e || !t) return;
  const n = G() ? To(t) : null;
  if (!n) {
    pn();
    return;
  }
  const s = [{ range: n.lineRange, options: { className: "preview-src-hl-line", isWholeLine: !0 } }];
  n.textRange && s.push({ range: n.textRange, options: { className: "preview-src-hl" } }), r.previewHl ? r.previewHl.set(s) : r.previewHl = e.createDecorationsCollection(s), zs(t, n.textRange), fn("preview"), e.revealRangeInCenterIfOutsideViewport(n.textRange || n.lineRange, 1);
}
function pn() {
  r.previewHl?.clear?.(), r.previewHl = null, te = null, document.getElementById("mark-btn")?.classList.add("hidden");
}
function To(e) {
  const t = window.getSelection?.();
  if (!t || t.isCollapsed || !t.rangeCount) return null;
  const n = t.getRangeAt(0), s = l("preview");
  if (!s.contains(n.commonAncestorContainer)) return null;
  const i = s.querySelectorAll("[data-src-line]"), o = Kn(n.startContainer) || i[0], a = Kn(n.endContainer) || i[i.length - 1] || o;
  if (!o || !a) return null;
  const c = qt(e, Number(o.dataset.srcLine) + dt), d = Math.max(c, qt(e, Number(a.dataset.srcEnd) + dt));
  if (!c) return null;
  const u = new r.monaco.Range(c, 1, d, e.getLineMaxColumn(d)), p = Io(n), g = p ? p.textContent : t.toString(), m = No(e, n, g);
  if (m) return m;
  const h = Vs(e.getValueInRange(u), g);
  let y = null;
  if (h) {
    const L = e.getOffsetAt({ lineNumber: c, column: 1 });
    y = r.monaco.Range.fromPositions(
      e.getPositionAt(L + h.start),
      e.getPositionAt(L + h.end)
    );
  }
  return { lineRange: u, textRange: y };
}
function ee(e, t) {
  return (e?.nodeType === Node.ELEMENT_NODE ? e : e?.parentElement)?.closest(t) || null;
}
const Kn = (e) => ee(e, "[data-src-line]");
function No(e, t, n) {
  const s = ee(t.startContainer, ".mermaid-box"), i = ee(t.endContainer, ".mermaid-box");
  if (!s || s !== i) return null;
  const o = s.__mermaidMeta;
  if (!o?.src) return null;
  const a = Xt(o.src);
  if (!a.supported) return null;
  let c = null;
  const d = ee(t.startContainer, "g[id*='flowchart-']"), u = ee(t.endContainer, "g[id*='flowchart-']");
  if (d && d === u) {
    const T = Xe(d.id, a.nodes), P = T ? a.nodes.get(T) : null;
    c = P?.def?.labelSpan || P?.firstRef?.span || null;
  }
  if (!c) {
    const T = ee(t.startContainer, ".edgeLabel"), P = ee(t.endContainer, ".edgeLabel");
    if (T && T === P) {
      const j = Ro(s, T), D = j ? Je(j, a) : null;
      c = D != null ? a.edges[D]?.arrow?.labelSpan : null;
    }
  }
  if (!c) return null;
  const p = Number(s.dataset.srcLine) + dt, g = qt(e, p + 1);
  if (!g) return null;
  const m = e.getOffsetAt({ lineNumber: g, column: 1 }), h = o.src.slice(c.start, c.end), y = Vs(h, n), L = m + c.start + (y?.start || 0), x = m + c.start + (y?.end ?? h.length), v = r.monaco.Range.fromPositions(
    e.getPositionAt(L),
    e.getPositionAt(x)
  ), b = v.startLineNumber, C = v.endLineNumber;
  return { lineRange: new r.monaco.Range(b, 1, C, e.getLineMaxColumn(C)), textRange: v };
}
function Ro(e, t) {
  const n = t.getBoundingClientRect(), s = n.left + n.width / 2, i = n.top + n.height / 2;
  let o = null, a = 1 / 0;
  for (const c of e.querySelectorAll("path.flowchart-link"))
    try {
      const d = c.getTotalLength();
      if (!d) continue;
      const u = c.getPointAtLength(d / 2).matrixTransform(c.getScreenCTM()), p = (u.x - s) ** 2 + (u.y - i) ** 2;
      p < a && (a = p, o = c);
    } catch {
    }
  return a < 1600 ? o : null;
}
function Io(e) {
  const t = ee(e.startContainer, "mark");
  return t && t === ee(e.endContainer, "mark") ? t : null;
}
function qt(e, t) {
  return Number.isFinite(t) ? Math.min(Math.max(1, t), e.getLineCount()) : 0;
}
function Vs(e, t) {
  const n = t.replace(/\s+/g, " ").trim();
  if (!n) return null;
  const s = e.indexOf(n);
  if (s >= 0) return { start: s, end: s + n.length };
  if (n.length > $o) return null;
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
let te = null;
function Ao() {
  let e = document.getElementById("mark-btn");
  return e || (e = document.createElement("button"), e.id = "mark-btn", e.className = "hidden", e.title = "選択したところを Markdown の ==マーカー== で塗る (Ctrl+Shift+H)", e.addEventListener("mousedown", (t) => t.preventDefault()), e.addEventListener("click", Gs), document.body.appendChild(e), e);
}
function zs(e, t) {
  const n = Ao(), s = t ? Po() : null;
  if (!s) {
    te = null, n.classList.add("hidden");
    return;
  }
  te = { range: t, marked: Fo(e, t) }, n.textContent = te.marked ? "🖍 マーカーを消す" : "🖍 マーカー", n.classList.remove("hidden"), Do(n, s);
}
function Po() {
  const e = window.getSelection?.();
  if (!e?.rangeCount) return null;
  const t = e.getRangeAt(0).getBoundingClientRect();
  if (!t.width && !t.height) return null;
  const n = l("preview").getBoundingClientRect();
  return t.bottom < n.top || t.top > n.bottom ? null : t;
}
function Do(e, t) {
  const n = t.top - e.offsetHeight - 6;
  e.style.top = `${n < 4 ? t.bottom + 6 : n}px`, e.style.left = `${Math.max(4, Math.min(t.left, window.innerWidth - e.offsetWidth - 4))}px`;
}
function Fo(e, t) {
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
function Gs() {
  const e = r.editor, t = e?.getModel();
  if (!te || !t) return;
  const n = r.monaco.Range, { range: s, marked: i } = te, o = i ? [
    { range: new n(s.startLineNumber, s.startColumn - 2, s.startLineNumber, s.startColumn), text: "" },
    { range: new n(s.endLineNumber, s.endColumn, s.endLineNumber, s.endColumn + 2), text: "" }
  ] : [
    { range: n.fromPositions(s.getStartPosition()), text: "==" },
    { range: n.fromPositions(s.getEndPosition()), text: "==" }
  ];
  e.executeEdits("mark", o), pn();
}
function Ys(e) {
  l("preview").classList.toggle("hidden", !e), l("preview-divider").classList.toggle("hidden", !e), l("preview-btn").classList.toggle("active", e), e ? Ja() : (l("editor").style.flex = "", pn()), r.editor?.layout(), xe();
}
function Zs() {
  Ys(!1);
}
async function Bo(e, t) {
  const n = r.currentFile || "", s = os(pt(n).replace(/\.[^.]+$/, "")), i = await M("/api/image", {
    note: n,
    name: `${s}-${t}`,
    ext: "png",
    data_b64: await Ui(e),
    overwrite: !0
  });
  return await q(), i.path;
}
function Kt() {
  if (xs(r.currentFile)) {
    if (!Lr()) {
      alert(`⚠️ Markdown プレビューを使うには、先に次を実行してください:
python -m pipenv run python scripts/fetch_markdown_it.py`);
      return;
    }
    if (G()) {
      Zs();
      return;
    }
    Ys(!0), un();
  }
}
function Vn(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result)), s.onerror = () => n(new Error("画像データを読み込めませんでした")), s.readAsDataURL(e);
  });
}
function Ho(e) {
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
async function Oo(e) {
  const t = e.cloneNode(!0);
  t.querySelectorAll(".mermaid-tools, .mdflow-presets, .mdflow-mapping, .mdflow-note").forEach((n) => n.remove());
  for (const n of t.querySelectorAll(".mermaid-box")) {
    const s = n.querySelector("svg");
    if (s)
      try {
        const i = await as(s, { background: gs() }), o = document.createElement("img");
        o.src = await Vn(i), o.style.maxWidth = "100%", n.replaceWith(o);
      } catch {
      }
  }
  for (const n of t.querySelectorAll("img")) {
    const s = n.getAttribute("src") || "";
    if (s.startsWith("/api/asset"))
      try {
        const i = await fetch(s);
        if (!i.ok) continue;
        n.src = await Vn(await i.blob());
      } catch {
      }
  }
  return Ho(t), `<div>${t.innerHTML}</div>`;
}
let $t = !1;
async function jo() {
  if (!G() || $t) return;
  const e = l("richcopy-btn"), t = e.textContent;
  $t = !0, e.disabled = !0, e.textContent = "⏳";
  try {
    const { text: n } = Ws(), s = await Oo(l("preview"));
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([s], { type: "text/html" }),
      "text/plain": new Blob([n], { type: "text/plain" })
    })]), e.textContent = "✓ コピー済";
  } catch (n) {
    e.textContent = t, alert("⚠️ コピーできませんでした: " + (n?.message || n));
  } finally {
    $t = !1, setTimeout(() => {
      e.textContent = t, xe();
    }, 1500);
  }
}
let ce = null;
function Wo() {
  const e = r.editor.getModel(), t = e.getOffsetAt(r.editor.getSelection().getStartPosition()), n = e.getValue().slice(0, t).replace(/[ \t]+$/, "");
  return !n.trim() || /\n\s*\n\s*$/.test(n) ? "" : /\n\s*$/.test(n) ? `
` : `

`;
}
function Uo() {
  const e = l("cf-modal"), t = l("cf-input"), n = l("cf-status"), s = (o) => {
    n.textContent = o || "";
  };
  l("cf-btn").addEventListener("click", () => {
    ce = null, t.value = "", s(et() ? "Confluence（または任意のWebページ）でコピー（Ctrl+C）してから「クリップボードから読込」、または下の欄に Ctrl+V。" : "⚠ Turndown 未取得: python -m pipenv run python scripts/fetch_turndown.py を実行するとHTML→Markdown変換が有効になります（未取得でもテキストはそのまま挿入できます）。"), e.classList.remove("hidden"), t.focus();
  });
  const i = () => e.classList.add("hidden");
  l("cf-cancel").addEventListener("click", i), e.addEventListener("click", (o) => {
    o.target === e && i();
  }), t.addEventListener("paste", (o) => {
    const a = o.clipboardData?.getData("text/html");
    !a || !et() || (o.preventDefault(), ce = a, t.value = o.clipboardData?.getData("text/plain") || "", s("✓ リッチテキスト（HTML）で取得しました。「変換して挿入」でMarkdownになります（下の欄は確認用。欄を手で編集するとHTML側を無視して欄の内容を挿入します）。"));
  }), l("cf-read-btn").addEventListener("click", async () => {
    try {
      const o = await navigator.clipboard.read();
      for (const a of o) {
        if (a.types.includes("text/html") && et()) {
          ce = await (await a.getType("text/html")).text(), t.value = a.types.includes("text/plain") ? await (await a.getType("text/plain")).text() : "", s("✓ クリップボードのHTMLを取得しました。");
          return;
        }
        if (a.types.includes("text/plain")) {
          ce = null, t.value = await (await a.getType("text/plain")).text(), s("プレーンテキストとして取得しました（そのまま挿入されます）。");
          return;
        }
      }
      s("クリップボードが空です。");
    } catch (o) {
      s("⚠ 読み込めませんでした: " + (o?.message || o) + "。下の欄へ Ctrl+V なら直接取れます。");
    }
  }), t.addEventListener("input", () => {
    ce = null;
  }), l("cf-insert").addEventListener("click", () => {
    if (!r.currentFile) {
      alert("先に挿入先のファイルを開いてください。");
      return;
    }
    let o;
    try {
      o = ce != null ? Or(ce) : t.value;
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
      text: Wo() + o.replace(/\s+$/, "") + `
`
    }]), r.editor.focus(), i();
  });
}
function qo(e, t) {
  r.diagramEditing?.dispose?.();
  const n = { src: t.src, index: t.index, box: e, restore: null, dispose: null };
  r.diagramEditing = n, n.dispose = At(e, t, Vt(), null);
}
function Ko() {
  r.diagramEditing?.dispose?.(), r.diagramEditing = null;
}
function Vo(e, t, n = !1) {
  const s = r.diagramEditing;
  if (s) {
    if (n) {
      if (s.box !== e) return;
      s.index = t.index, e.querySelector(":scope > .mermaid-editbar") || (s.dispose?.(), s.dispose = At(e, t, Vt(), s.restore));
      return;
    }
    s.index === t.index && (s.src !== t.src && (s.src = t.src, s.restore = null), s.dispose?.(), s.box = e, s.dispose = At(e, t, Vt(), s.restore), s.restore && (s.restore = { ...s.restore, editNodeId: null }));
  }
}
function Vt() {
  return {
    applyEdits(e, t, n = null) {
      const s = r.editor, i = s.getModel(), o = r.diagramEditing, a = ms(i.getValue(), e, o?.index ?? 0);
      if (!a)
        return r.diagramEditing?.dispose?.(), r.diagramEditing = null, alert("⚠️ 図の位置を特定できませんでした（プレビューとエディタの内容が食い違っています）。編集モードを終了します。ファイルを開き直すと直ります。"), !1;
      const c = vr(e, t), d = t.map((u) => ({
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
      zn(e);
    },
    onExit() {
      zn(null), r.diagramEditing = null;
    }
  };
}
function zn(e) {
  const t = r.editor, n = t?.getModel();
  if (!t || !n) return;
  const s = () => {
    r.diagramHl?.clear?.(), r.diagramHl = null;
  };
  if (!e) {
    s();
    return;
  }
  const i = r.diagramEditing, o = i ? ms(n.getValue(), i.src, i.index ?? 0) : null;
  if (!o) {
    s();
    return;
  }
  const a = (p) => p ? r.monaco.Range.fromPositions(
    n.getPositionAt(o.start + o.toRaw(p.start)),
    n.getPositionAt(o.start + o.toRaw(p.end))
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
let zt = null, oe = [];
function zo() {
  clearTimeout(zt), zt = setTimeout(() => mn(l("file-search").value), 250);
}
function Go() {
  clearTimeout(zt), l("file-search").value = "", oe = [], l("search-results").classList.add("hidden"), l("search-results").innerHTML = "", l("search-opts").classList.add("hidden"), l("replace-bar").classList.add("hidden"), l("replace-preview").innerHTML = "", l("replace-status").textContent = "", l("file-list").classList.remove("hidden");
}
async function mn(e) {
  const t = l("search-results"), n = l("file-list");
  if (!e.trim()) {
    oe = [], t.classList.add("hidden"), l("search-opts").classList.add("hidden"), l("replace-bar").classList.add("hidden"), n.classList.remove("hidden");
    return;
  }
  const s = new URLSearchParams({ q: e, case: l("search-case").checked ? "true" : "false" }), i = await B("/api/search?" + s);
  if (i) {
    oe = [...new Set(i.results.map((o) => o.path))], t.innerHTML = "";
    for (const o of i.results) t.appendChild(Yo(o));
    i.results.length || (t.innerHTML = "<div class='hint'>該当なし</div>"), l("search-opts").classList.remove("hidden"), we(), n.classList.add("hidden"), t.classList.remove("hidden");
  }
}
function Yo(e) {
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
    await X(e.path), r.editor.revealLineInCenter(e.line), r.editor.setPosition({ lineNumber: e.line, column: 1 }), r.editor.focus();
  }), t;
}
function Zo() {
  const e = l("replace-bar");
  e.classList.toggle("hidden"), e.classList.contains("hidden") || (we(), l("replace-input").focus());
}
function we(e) {
  l("replace-status").textContent = e !== void 0 ? e : `対象: ヒットした ${oe.length} ファイル`;
  const t = !oe.length;
  l("replace-preview-btn").disabled = t, l("replace-run-btn").disabled = t;
}
async function _t(e) {
  const t = l("file-search").value, n = l("replace-input").value;
  if (!t.trim() || !oe.length) return;
  if (!e) {
    if (!confirm(
      `${oe.length} ファイルの「${t}」を「${n}」に置き換えます。

置換前の内容は 🕰 履歴 に残るので元に戻せます。実行しますか？`
    )) return;
    await qe();
  }
  we(e ? "確認中…" : "置換中…");
  let s;
  try {
    s = await M("/api/search/replace", {
      query: t,
      replace: n,
      paths: oe,
      case: l("search-case").checked,
      dry_run: e
    });
  } catch (a) {
    we("⚠️ " + a.message);
    return;
  }
  Xo(s);
  const i = s.total === 0 ? "置き換わる箇所がありません" : e ? `${s.changed_files} ファイル / ${s.total} 箇所が置き換わります` : `✓ ${s.changed_files} ファイル / ${s.total} 箇所を置換しました（🕰 履歴 から戻せます）`;
  if (e) {
    we(i);
    return;
  }
  const o = s.files.map((a) => a.path);
  r.currentFile && o.includes(r.currentFile) && await X(r.currentFile, !0, "none"), await mn(l("file-search").value), we(i);
}
function Xo(e) {
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
function ut() {
  if (!r.editor) return "";
  const e = r.editor.getSelection();
  return r.editor.getModel().getValueInRange(e);
}
function Jo() {
  return I() ? "テキストを選択してAIに送れます" : We() ? "計画モード：エージェントは調査だけを行い、ファイルは変更しません。" : "エージェントがファイルを直接編集します（破壊操作は承認制）。";
}
function Xs() {
  const e = ut().trim().length > 0;
  l("sel-chip").classList.toggle("hidden", !e), l("sel-info").textContent = e ? "選択中：AIに送れます" : Jo();
}
async function hn() {
  if (!r.currentFile) {
    r.notes = [], ft();
    return;
  }
  const e = await B("/api/notes?path=" + encodeURIComponent(r.currentFile));
  r.notes = e ? e.notes || [] : [], ft();
}
async function gn(e = r.currentFile, t) {
  e && (t == null && (yt(), t = r.notes), await se("/api/notes?path=" + encodeURIComponent(e), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t)
  }));
}
function yt() {
  r.noteDecorations && r.notes.forEach((e, t) => {
    const n = r.noteDecorations.getRange(t);
    n && (e.line = n.startLineNumber);
  });
}
function ft() {
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
function Qo() {
  yt();
  const e = r.editor.getPosition().lineNumber, t = prompt("付箋メモ（例: ここをAIに膨らませてもらう）");
  t && (r.notes = r.notes.filter((n) => n.line !== e), r.notes.push({ line: e, text: t }), ft(), gn().catch((n) => alert("⚠️ 付箋の保存に失敗しました: " + n.message)));
}
function ea(e) {
  yt();
  const t = r.notes.find((s) => s.line === e), n = prompt("付箋メモ（空で削除）", t ? t.text : "");
  n !== null && (r.notes = r.notes.filter((s) => s.line !== e), n.trim() && r.notes.push({ line: e, text: n }), ft(), gn().catch((s) => alert("⚠️ 付箋の保存に失敗しました: " + s.message)));
}
const ta = /* @__PURE__ */ new Set(
  ["md", "markdown", "txt", "py", "json", "yaml", "yml", "toml", "csv", "html", "css", "js", "ts"]
), ae = (e) => (e.external ? "E:" : "I:") + e.path, pt = (e) => e.split(/[\\/]/).pop(), Gt = (e) => ta.has(gt(e.path)), Js = (e) => en(e.path);
async function wn() {
  if (!r.currentFile) {
    r.refs = [], Be();
    return;
  }
  const e = await B("/api/refs?path=" + encodeURIComponent(r.currentFile));
  r.refs = e ? e.refs || [] : [];
  const t = new Set(r.refs.map(ae));
  for (const n of [...r.checkedRefs]) t.has(n) || r.checkedRefs.delete(n);
  Be();
}
async function Qs() {
  r.currentFile && await B("/api/refs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: r.currentFile, refs: r.refs })
  });
}
async function Yt(e) {
  if (!r.currentFile) {
    alert("先にファイルを開いてください。");
    return;
  }
  r.refs.some((t) => ae(t) === ae(e)) || (r.refs.push(e), await Qs(), Be());
}
async function na(e) {
  const [t] = r.refs.splice(e, 1);
  t && r.checkedRefs.delete(ae(t)), await Qs(), Be();
}
async function sa(e) {
  try {
    await M(
      "/api/refs/open",
      { note: r.currentFile, path: e.path, external: !!e.external }
    );
  } catch (t) {
    alert("⚠️ 開けませんでした: " + t.message);
  }
}
function Be() {
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
    o.type = "checkbox", o.title = Gt(n) ? "AIコンテキストに含める" : Js(n) ? "AIコンテキストに含める（サーバでテキスト抽出して同梱。/copilot では原本を Copilot に添付）" : "AIコンテキストに含める（この形式は Copilot 添付経路のみ有効）", o.checked = r.checkedRefs.has(ae(n)), o.addEventListener("click", (u) => u.stopPropagation()), o.addEventListener("change", () => {
      o.checked ? r.checkedRefs.add(ae(n)) : r.checkedRefs.delete(ae(n));
    });
    const a = document.createElement("span");
    a.textContent = n.external ? "外部" : "";
    const c = document.createElement("span");
    c.className = "fname", c.textContent = n.name || pt(n.path), c.title = n.path + "（クリックで既定アプリで開く）", c.addEventListener("click", () => sa(n));
    const d = document.createElement("button");
    d.className = "ref-del", d.textContent = "×", d.title = "参照を外す", d.addEventListener("click", (u) => {
      u.stopPropagation(), na(s);
    }), i.append(o, a, c, d), e.appendChild(i);
  });
}
function ia(e) {
  const t = (e || "").split(/\r?\n/).find((s) => s && !s.startsWith("#"));
  if (!t || !/^file:/i.test(t)) return null;
  let n = decodeURIComponent(t.replace(/^file:\/\//i, ""));
  return /^\/[A-Za-z]:/.test(n) && (n = n.slice(1)), n.replace(/\\/g, "/");
}
function ra() {
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
    if (Z) {
      const s = r.fsMap.get(Z);
      s && s.type === "file" ? await Yt({ path: Z, external: !1, name: pt(Z) }) : alert("フォルダは参照に追加できません。ファイルをドラッグしてください。");
      return;
    }
    const n = ia(t.dataTransfer.getData("text/uri-list") || t.dataTransfer.getData("text/plain"));
    if (n) {
      await Yt({ path: n, external: !0, name: pt(n) });
      return;
    }
    t.dataTransfer.files && t.dataTransfer.files.length && alert(`ブラウザの制限でドラッグしたファイルの絶対パスを取得できません。
外部ファイルは「＋参照を追加」から選んでください。`);
  });
}
async function Re(e) {
  const t = await B("/api/workspace/dirs?files=true&path=" + encodeURIComponent(e || ""));
  if (!t) return;
  l("pick-input").value = t.cwd || "";
  const n = l("pick-drives");
  n.innerHTML = "";
  for (const i of t.drives || []) {
    const o = document.createElement("button");
    o.textContent = i, o.classList.toggle("active", (t.cwd || "").toLowerCase().startsWith(i.toLowerCase().slice(0, 2))), o.addEventListener("click", () => Re(i)), n.appendChild(o);
  }
  const s = l("pick-list");
  if (s.innerHTML = "", t.parent && t.parent !== t.cwd) {
    const i = document.createElement("li");
    i.textContent = "⬆ ..（上のフォルダへ）", i.addEventListener("click", () => Re(t.parent)), s.appendChild(i);
  }
  for (const i of t.dirs || []) {
    const o = document.createElement("li");
    o.textContent = i.name, o.addEventListener("click", () => Re(i.path)), s.appendChild(o);
  }
  for (const i of t.files || []) {
    const o = document.createElement("li");
    o.className = "pick-file", o.textContent = i.name, o.addEventListener("click", async () => {
      await Yt({ path: i.path.replace(/\\/g, "/"), external: !0, name: i.name }), nt();
    }), s.appendChild(o);
  }
}
function oa() {
  if (!r.currentFile) {
    alert("先にファイルを開いてください。");
    return;
  }
  l("pick-modal").classList.remove("hidden"), Re(l("root-path").textContent || "");
}
function nt() {
  l("pick-modal").classList.add("hidden");
}
const ei = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg"
};
function Gn(e) {
  for (const t of e?.files || [])
    if (t.type in ei) return t;
  return null;
}
function aa(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result).split(",", 2)[1] || ""), s.onerror = () => n(new Error("画像を読み込めませんでした")), s.readAsDataURL(e);
  });
}
async function Yn(e) {
  if (!r.currentFile) {
    alert("⚠️ 画像を貼るには、先にファイルを開いて（または保存して）ください。");
    return;
  }
  let t;
  try {
    t = await M("/api/image", {
      note: r.currentFile,
      ext: ei[e.type],
      name: e.name || "",
      // D&D は元名を引き継ぐ。クリップボードは名前が無いので日時
      data_b64: await aa(e)
    });
  } catch (s) {
    alert("⚠️ 画像を保存できませんでした: " + s.message);
    return;
  }
  const n = t.rel.split("/").pop().replace(/\.[^.]+$/, "");
  r.editor.executeEdits("insert-image", [
    { range: r.editor.getSelection(), text: `![${n}](${t.rel})` }
  ]), r.editor.focus(), await q();
}
const ca = {
  prefill: (e) => `応答を待っています（prefill 中… ${e}s）`,
  thinking: (e) => `思考中… ${e}s`,
  tool: (e) => `ツールを実行中… ${e}s`,
  verify: (e) => `結果を検証中… ${e}s`
};
function la(e) {
  let t = "", n = "prefill", s = performance.now();
  const i = document.createElement("div");
  i.className = "wait-indicator", i.innerHTML = '<span class="dots"><i></i><i></i><i></i></span><span class="wait-text"></span>';
  const o = i.querySelector(".wait-text"), a = () => {
    i.isConnected || e.insertBefore(i, e.querySelector(".body"));
  }, c = () => {
    if (!i.isConnected) return;
    const h = ((performance.now() - s) / 1e3).toFixed(1), y = ca[n] || ((L) => `${n}… ${L}s`);
    o.textContent = y(h);
  }, d = (h) => {
    h !== n && (n = h, s = performance.now()), a(), c(), z();
  }, u = performance.now();
  let p = null;
  const g = (h, y = !1) => {
    if (!h.trim()) return;
    p || (p = document.createElement("details"), p.className = "think-box", p.innerHTML = '<summary></summary><div class="think-body"></div>', e.insertBefore(p, e.querySelector(".body")));
    const L = ((performance.now() - u) / 1e3).toFixed(1);
    p.querySelector("summary").textContent = y ? `💭 思考ログ（${h.length}文字・${L}s）` : "💭 思考中…", p.querySelector(".think-body").textContent = h, y && (p.open = !1);
  };
  a(), c();
  const m = setInterval(() => {
    c(), z();
  }, 200);
  return {
    onToken(h) {
      t += h, i.remove();
      const { think: y, visible: L } = Bt(t);
      g(y), ws(e.querySelector(".body"), L), z();
    },
    /** エンジンのインジケータ（⏳ Prefill / 🧠 Thinking...）を待機表示のフェーズに反映する。 */
    setPhase: d,
    finish() {
      clearInterval(m), i.remove();
      const { think: h, visible: y } = Bt(t);
      return g(h, !0), y.trim() && Oe(e.querySelector(".body"), y, { assetBase: Ke() }), y;
    }
  };
}
const da = [
  ["thinking", ["🧠", "Thinking..."]],
  ["prefill", ["⏳", "Prefill"]]
];
function ua(e) {
  for (const [t, n] of da)
    if (n.some((s) => e.includes(s))) return t;
  return null;
}
async function fa(e) {
  const t = ut(), n = [], s = [];
  for (const o of [...r.checkedFiles]) {
    let a = null;
    try {
      a = await se("/api/file?path=" + encodeURIComponent(o));
    } catch (c) {
      if (alert("⚠️ " + c.message), c.status === 423) continue;
    }
    a && a.content != null && s.push({ path: o, content: a.content }), en(o) && n.push(o);
  }
  const i = [];
  if (r.currentFile)
    for (let o = 0; o < r.refs.length; o++) {
      const a = r.refs[o];
      if (r.checkedRefs.has(ae(a))) {
        if (Gt(a) || Js(a)) {
          let c = null;
          try {
            c = await se(
              `/api/refs/read?note=${encodeURIComponent(r.currentFile)}&idx=${o}`
            );
          } catch (d) {
            if (alert("⚠️ " + d.message), d.status === 423) continue;
          }
          c && c.content != null && i.push({ path: a.path, content: c.content });
        }
        Gt(a) || n.push(a.path);
      }
    }
  return {
    message: e,
    session_id: r.sessionId,
    // Note は単一セッション（サーバは無視するが契約上送る）
    selection: t,
    context_files: s,
    ref_texts: i,
    // ツリーでチェックしたファイルが 📎 関連ファイルにも登録されていると、同じパスが
    // 2回入って Copilot に二重アップロードされる。送る直前に一意化する。
    attach_files: [...new Set(n)],
    history: r.history,
    // 「このファイル」が指せるよう、開いているファイルを常に添える。
    // 未保存の編集も含めたいのでディスクではなくエディタの内容を送る。
    current_file: r.currentFile || "",
    current_content: r.currentFile ? r.editor.getValue() : ""
  };
}
const ti = {
  "/compact": "会話を要約して文脈を畳む。`/compact 認証まわり` のように残したい焦点を足せる",
  "/copilot": "エージェントが質問文を組み立てて Copilot に聞き、回答を精査して反映する",
  "/copilot_simple": "ローカル LLM を経由せず、打った文をそのまま Copilot へ1回質問する（選択範囲・チェック済みファイルは同梱、関連ファイルは添付される）",
  // 従来名。/copilot_simple と完全に同じ処理へ入る（サーバの COPILOT_DIRECT_COMMANDS）。
  "/copilot!": "`/copilot_simple` の別名（同じ動作）"
}, ni = {
  "/help": { desc: "使えるコマンドの一覧を出す", run: () => ma() },
  "/context": { desc: "いまの文脈の量（メッセージ数・概算文字数）を見る", run: () => ha() },
  "/undo": { desc: "直前の往復を削除する（🗑 と同じ）", run: () => ga() },
  "/clear": { desc: "会話をリセットする（Note は保存履歴も消す）", run: () => wa() },
  "/code": { desc: "Code モードへ切り替える", run: () => Tt("code") },
  "/note": { desc: "Note モードへ切り替える", run: () => Tt("note") },
  "/plan": { desc: "Plan モードへ切り替える", run: () => Tt("plan") }
};
async function Tt(e) {
  if (r.mode === e) {
    $("system", `既に ${Pe[e]} モードです。`);
    return;
  }
  await sn(e);
}
async function pa(e) {
  const t = /^(\/\S+)(?:\s+([\s\S]*))?$/.exec(e);
  if (!t) return !1;
  const n = t[1].toLowerCase();
  if (n in ti) return !1;
  const s = ni[n];
  return s ? ($("user", e), await s.run((t[2] || "").trim()), !0) : !1;
}
function ma() {
  const e = [
    ...Object.entries(ti),
    ...Object.entries(ni).map(([t, n]) => [t, n.desc])
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
async function ha() {
  let e;
  try {
    e = await J("/api/context?session_id=" + encodeURIComponent(r.sessionId));
  } catch (n) {
    $("error", "⚠ 文脈を取得できません: " + n.message);
    return;
  }
  if (!e.supported) {
    $("assistant", "このエンジンでは文脈量を測れません（pixie_core API 1.6 以上が必要です）。");
    return;
  }
  const t = [
    `### 🧠 いまの文脈（${Pe[e.mode] || e.mode} モード）`,
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
function ga() {
  const t = [...l("messages").children].reverse().find((s) => s.classList.contains("assistant") && s._exchange);
  if (!t) {
    $("system", "消せる往復がありません。");
    return;
  }
  const n = t.querySelector(".msg-del");
  n && n.click();
}
async function wa() {
  if (r.streaming) {
    alert("⚠️ 応答の生成中はリセットできません。");
    return;
  }
  const e = I() ? `
（保存されている会話履歴も消えます）` : "";
  if (confirm("この会話をリセットしますか？" + e)) {
    try {
      await M("/api/session/clear", { session_id: r.sessionId });
    } catch (t) {
      alert("⚠️ リセットできません: " + t.message);
      return;
    }
    if (I())
      try {
        await se("/api/chat/history", { method: "DELETE" }), r.history = [], r.historyLoaded = !0;
      } catch (t) {
        alert("⚠️ 保存履歴を消せませんでした: " + t.message);
      }
    l("messages").innerHTML = "", r.assistantEl = null, r.sessionId = je(), be(), $("system", "🧹 会話をリセットしました。");
  }
}
async function He() {
  if (r.streaming) return;
  const e = l("chat-input"), t = e.value.trim();
  if (!t) return;
  if (await pa(t)) {
    e.value = "";
    return;
  }
  const n = I(), s = We(), i = Te() && r.codeStyle === "plan" && !r.planExecNext;
  r.planExecNext = !1;
  const o = n ? Ra() : null;
  let a;
  if (n)
    a = await fa(t);
  else if (s) {
    const x = [];
    for (const v of [...r.checkedFiles]) {
      const b = await B("/api/file?path=" + encodeURIComponent(v));
      b && b.content != null && x.push({ path: v, content: b.content });
    }
    a = {
      message: t,
      session_id: r.sessionId,
      selection: ut(),
      current_file: r.currentFile || "",
      current_content: r.currentFile ? r.editor.getValue() : "",
      context_files: x
    };
  } else {
    const x = [];
    for (const v of [...r.checkedFiles]) {
      const b = await B("/api/file?path=" + encodeURIComponent(v));
      b && b.content != null && x.push({ path: v, content: b.content });
    }
    a = {
      message: t,
      session_id: r.sessionId,
      current_file: r.currentFile,
      current_content: r.currentFile ? r.editor.getValue() : "",
      selection: ut(),
      plan_first: i
    }, x.length && (a.context_files = x);
  }
  e.value = "";
  const c = $("user", t);
  r.changedPaths.size && (r.changedPaths.clear(), Ue()), r.assistantEl = $("assistant", ""), r.turnId = 0, r.compacted = null, r.assistantEl._exchange = { userEl: c, userText: t }, r.assistantUi = la(r.assistantEl), ii(!0), r.abort = new AbortController();
  let d;
  try {
    d = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(a),
      signal: r.abort.signal
    });
  } catch (x) {
    Nt(), $("error", "送信失敗: " + x.message);
    return;
  }
  if (!d.ok) {
    const x = await d.json().catch(() => ({}));
    Nt(), $("error", d.status === 409 ? "エージェントは実行中です。" : "⚠ " + (x.detail || `HTTP ${d.status}`));
    return;
  }
  const u = d.body.getReader(), p = new TextDecoder();
  let g = "";
  try {
    for (; ; ) {
      const { value: x, done: v } = await u.read();
      if (v) break;
      g += p.decode(x, { stream: !0 });
      const b = g.split(`

`);
      g = b.pop();
      for (const C of b) {
        const _ = C.trim();
        if (!_.startsWith("data:")) continue;
        let T;
        try {
          T = JSON.parse(_.slice(5).trim());
        } catch {
          continue;
        }
        await ba(T);
      }
    }
  } catch (x) {
    r.abort?.signal.aborted ? R(r.assistantEl, "⏹ 中断しました。") : R(r.assistantEl, "⚠️ ストリーム中断: " + x.message);
  }
  const m = !!r.abort?.signal.aborted, h = r.assistantEl, y = r.turnId, L = Nt();
  n ? xa(h, t, L, o, m) : (s || i) && !m && Ea(L), Te() && !m && Ma(t, L), r.compacted && h?.isConnected ? va(h, r.compacted) : h?.isConnected && (ys(h, () => si(h, y)), Te() && y && Ur(h, () => Sa(y)));
}
async function si(e, t) {
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
      i = !!(await M(
        "/api/chat/turn/delete",
        { session_id: r.sessionId, turn_id: t }
      )).ok;
    } catch {
      i = !1;
    }
  if (I()) {
    const o = r.history.findIndex((a) => a.role === "user" && a.content === n?.userText);
    if (o >= 0) {
      const a = r.history[o + 1]?.role === "assistant" ? 2 : 1;
      r.history.splice(o, a), await on();
    }
    if (!t)
      try {
        await M("/api/session/clear", { session_id: r.sessionId });
      } catch {
        i = !1;
      }
  }
  n?.userEl?.remove(), e.remove(), i || $("system", "⚠️ 表示からは消しましたが、AI の文脈からは消せませんでした（サーバ側の会話が既に入れ替わっています）。");
}
function va(e, t) {
  const n = l("messages");
  for (const i of [...n.children])
    i !== e && i.remove();
  const s = $(
    "system",
    `ここまでの会話（${t.before}件）を要約に畳みました（約${t.saved_chars.toLocaleString()}文字ぶんの文脈を解放）。`
  );
  n.insertBefore(s, e), I() && (r.history = [
    { role: "user", content: "（ここまでの会話は /compact で要約に置き換えました）" },
    { role: "assistant", content: t.summary }
  ], on()), z(!0);
}
function ya(e) {
  const t = /```plan[^\n]*\n([\s\S]*?)```/.exec(e || "");
  return t ? t[1].trim() : null;
}
function Ea(e) {
  let t = ya(e);
  !t && /^\s*1[.)]\s/m.test(e || "") && (t = (e || "").trim()), t && li(t);
}
function xa(e, t, n, s, i) {
  if (r.history.push({ role: "user", content: t }), (n.trim() || !i) && r.history.push({ role: "assistant", content: n }), on(), !e || !e.isConnected) return;
  const o = qr(n);
  o.length ? Ta(e, n, o) : !Aa(e, n, s) && n.trim() && Ia(e, n, s);
}
async function ba(e) {
  switch (e.type) {
    case "token":
      e.text && r.assistantUi?.onToken(e.text);
      break;
    case "status": {
      const t = e.phase || ua(e.text || "");
      if (t) {
        r.assistantUi?.setPhase(t);
        break;
      }
      R(r.assistantEl, e.text, { category: e.category, tool: e.tool });
      break;
    }
    case "turn":
      r.turnId = e.id || 0;
      break;
    case "compacted":
      r.compacted = e;
      break;
    case "approval":
      La(e);
      break;
    case "workset":
      ka(e.workset);
      break;
    case "files_changed":
      await ri(e.paths || []);
      break;
    case "turn_metrics": {
      const t = e.metrics || {}, n = Array.isArray(t.llm_calls) ? t.llm_calls.length : 0, s = Number(t.tool_calls || 0), i = Number(t.acceptance_retries || 0), o = [`LLM ${n}`, `tools ${s}`];
      t.exit_reason && o.push(t.exit_reason), i && o.push(`acceptance retry ${i}`), R(
        r.assistantEl,
        `Turn: ${o.join(" / ")}`,
        { category: "turn_metrics" }
      );
      break;
    }
    case "error":
      R(r.assistantEl, "⚠ " + e.text);
      break;
  }
}
function ka(e) {
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
  R(
    r.assistantEl,
    `📚 Workset: ${t.length}件（自動追加 ${e.stats?.auto_added || 0}件）`
  ), t.slice(0, 16).forEach((i) => {
    const o = [];
    i.symbols?.length && o.push(`symbol ${i.symbols.length}`), i.sections?.length && o.push(`節 ${i.sections.length}`), i.requirements?.length && o.push(`要件 ${i.requirements.length}`), i.mermaid?.length && o.push(`Mermaid ${i.mermaid.length}`), R(
      r.assistantEl,
      `  ${s[i.role] || i.role}: ${i.path}` + (o.length ? `（${o.join(" / ")}）` : "")
    );
  }), t.length > 16 && R(r.assistantEl, `  …ほか ${t.length - 16}件`), n.slice(0, 8).forEach((i) => R(r.assistantEl, `  ⏭ 省略: ${i.path}（${i.reason}）`));
}
function Nt() {
  const e = r.assistantUi?.finish() ?? "";
  return r.assistantEl && !e.trim() && !r.assistantEl.querySelector(".tool-log") && (r.assistantEl.remove(), r.assistantEl = null), ii(!1), e;
}
function ii(e) {
  r.streaming = e;
  const t = l("send-btn");
  e ? (t.textContent = "停止", t.classList.add("stop"), t.title = "エージェントの実行を中断する") : (t.textContent = "送信", t.classList.remove("stop"), t.title = "", r.abort = null, r.assistantUi = null);
}
function La(e) {
  const t = l("approval");
  t.innerHTML = "", t.classList.remove("hidden");
  const n = document.createElement("h4");
  if (n.textContent = "⚠ エージェントが以下のツール実行を要求しています（承認が必要）", t.appendChild(n), e.changeset) {
    const u = document.createElement("div");
    u.className = "call";
    const p = (e.changeset.changes || []).length;
    u.textContent = `ChangeSet ${e.changeset.id || ""}：${p}ファイルを一括確認`, t.appendChild(u);
    const g = e.changeset.document_validation || {};
    for (const m of [
      ...e.changeset.errors || [],
      ...e.changeset.conflicts || [],
      ...g.errors || []
    ]) {
      const h = document.createElement("div");
      h.className = "call danger", h.textContent = "⚠ " + (m.path ? `${m.path}: ` : "") + (m.error || "base hash が現在内容と一致しません"), t.appendChild(h);
    }
    for (const m of g.warnings || []) {
      const h = document.createElement("div");
      h.className = "call", h.textContent = "ℹ " + (m.path ? `${m.path}: ` : "") + m.warning, t.appendChild(h);
    }
  }
  for (const u of e.calls) {
    const p = document.createElement("div");
    if (p.className = "call", u.needs_approval) {
      const h = document.createElement("span");
      h.className = "danger", h.textContent = "● 承認必須 ", p.appendChild(h);
    }
    const g = document.createElement("b");
    g.textContent = u.name;
    const m = u.args && Object.keys(u.args).length ? JSON.stringify(u.args, null, 2) : "(no args)";
    p.append(g, `
` + m), t.appendChild(p);
  }
  const s = e.changeset?.changes?.length ? e.changeset.changes : e.calls.filter((u) => u.preview).map((u) => u.preview), i = e.calls.length === 1 && s.length === 1 ? { id: e.id, path: s[0].path } : null;
  s.length && Da(s, i);
  const o = document.createElement("div");
  o.className = "row";
  const a = document.createElement("textarea");
  a.placeholder = "却下して別指示を出す場合はここに入力（任意）";
  const c = document.createElement("button");
  c.className = "btn-approve", c.textContent = "✓ 承認して実行", c.disabled = !!e.changeset && !e.changeset.ok, c.disabled && (c.title = "競合または検証エラーがあるため承認できません"), c.onclick = () => Zn(e.id, !0, null);
  const d = document.createElement("button");
  d.className = "btn-reject", d.textContent = "✗ 却下", d.onclick = () => Zn(e.id, !1, a.value.trim() || null), o.append(a, c, d), t.appendChild(o), z();
}
async function Zn(e, t, n) {
  l("approval").classList.add("hidden"), l("approval").innerHTML = "", ke.length && ne(), r.assistantEl && R(r.assistantEl, t ? "✓ 承認しました。" : "✗ 却下しました。"), await M("/api/approve", { id: e, approve: t, override: n, session_id: r.sessionId }).catch((s) => R(r.assistantEl, "⚠️ 承認を送れませんでした: " + s.message));
}
async function ri(e) {
  R(r.assistantEl, "変更されたファイル: " + e.join(", ")), r.changedPaths = new Set(e), await q(), r.currentFile && e.includes(r.currentFile) && (r.dirty ? confirm(`${r.currentFile} がエージェントに変更されました。エディタの未保存分を破棄して再読込しますか？`) && await X(r.currentFile, !0) : await X(r.currentFile, !0));
}
async function Ca() {
  Te() && await M("/api/interrupt", { session_id: r.sessionId }).catch(() => {
  }), r.abort && r.abort.abort(), ke.length && ne();
}
async function Sa(e) {
  if (r.streaming) {
    alert("⚠️ 実行中です。中断してから巻き戻してください。");
    return;
  }
  if (confirm(`このターンの前の状態へファイルを戻しますか？
以降のターンで同じファイルに加えた変更も巻き戻ります。
（このターンより後に作られたファイルは消さずに残ります。）`))
    try {
      const t = await M("/api/rollback", { session_id: r.sessionId, turn_id: e });
      if (!t.ok) {
        $("system", "⚠️ 巻き戻せませんでした（スナップショット無し: 古すぎるか容量上限）。");
        return;
      }
      $("system", t.restored.length ? `${t.restored.length}件を巻き戻しました: ${t.restored.join(", ")}` : "戻す変更はありませんでした（既にターン前の内容と同じです）。"), t.restored.length && await ri(t.restored);
    } catch (t) {
      alert("⚠️ 巻き戻しに失敗しました: " + t.message);
    }
}
function oi() {
  if (r.streaming) {
    alert("⚠️ 実行中です。中断してから新しい会話を開始してください。");
    return;
  }
  r.sessionId = je(), l("messages").innerHTML = "", l("approval").classList.add("hidden"), ke.length && ne(), r.assistantEl = null, $("system", "新しい会話を開始しました（別セッション）。"), be();
}
function Ma(e, t) {
  M("/api/code-chat/log", { session_id: r.sessionId, user: e, assistant: t }).catch(() => {
  });
}
function $a(e) {
  if (!e) return "";
  const t = Math.max(0, Date.now() / 1e3 - e);
  return t < 60 ? "たった今" : t < 3600 ? `${Math.floor(t / 60)}分前` : t < 86400 ? `${Math.floor(t / 3600)}時間前` : `${Math.floor(t / 86400)}日前`;
}
async function ai() {
  if (r.streaming) {
    alert("⚠️ 実行中です。中断してから開いてください。");
    return;
  }
  l("sessions-modal").classList.remove("hidden");
  const e = l("sessions-list");
  e.innerHTML = "";
  let t = [];
  try {
    t = (await J("/api/code-chat/sessions")).sessions || [];
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
    a.className = "sess-sub", a.textContent = `${$a(n.updated_at)} ・ ${n.messages} メッセージ` + (n.session_id === r.sessionId ? " ・現在の会話" : ""), i.append(o, a);
    const c = document.createElement("button");
    c.type = "button", c.textContent = "削除", c.title = "この会話を削除", c.addEventListener("click", async (d) => {
      d.stopPropagation(), confirm(`「${n.title}」を削除しますか？`) && (await M("/api/code-chat/delete", { session_id: n.session_id }).catch(() => {
      }), ai());
    }), s.append(i, c), s.addEventListener("click", () => _a(n.session_id)), e.appendChild(s);
  }
}
async function _a(e) {
  l("sessions-modal").classList.add("hidden");
  try {
    const t = await J("/api/code-chat/session?session_id=" + encodeURIComponent(e)), n = await M(
      "/api/code-chat/restore",
      { session_id: e, messages: t.messages }
    );
    r.sessionId = e, be(), l("messages").innerHTML = "";
    for (const s of t.messages || []) $(s.role, s.content, { assetBase: Ke() });
    $("system", n.ok ? "✓ 会話を復元しました（エンジンの文脈も引き継がれています。続きから話せます）。" : "✓ 会話の表示を復元しました（このエンジンでは文脈の復元は未対応です）。"), z(!0);
  } catch (t) {
    alert("⚠️ 会話を復元できませんでした: " + t.message);
  }
}
function be() {
  l("session-info").textContent = "session: " + r.sessionId.slice(0, 8);
}
function Ta(e, t, n) {
  let s = "", i = 0;
  for (const c of Es(t))
    s += t.slice(i, c.start) + "修正案（差分で確認）", i = c.end;
  s += t.slice(i), Oe(e.querySelector(".body"), s, { assetBase: Ke() });
  const o = document.createElement("div");
  o.className = "apply-actions";
  const a = document.createElement("button");
  a.className = "apply-btn", a.textContent = `▶ 差分で反映（${n.length}箇所）`, a.addEventListener("click", () => Na(n, e)), o.appendChild(a), e.appendChild(o), z();
}
async function Na(e, t) {
  const n = r.editor.getModel().getValue();
  let s;
  try {
    s = await M("/api/patch", { base: n, edits: e });
  } catch (a) {
    R(t, "⚠️ 適用計算に失敗: " + a.message);
    return;
  }
  if (s.results.forEach((a, c) => {
    a.ok ? a.method !== "exact" && R(t, `ℹ️ 修正${c + 1}: ${a.method} マッチで補正適用`) : R(t, `⚠️ 修正${c + 1}: ${a.error.split(`
`)[0]}`);
  }), s.applied === 0) {
    R(t, "⚠️ 適用できる修正がありませんでした。本文が変わっていないか確認してください。");
    return;
  }
  const i = s.mdflow_warnings || [];
  i.forEach((a) => R(t, `⚠️ mdflow: ${a}`));
  let o = `差分プレビュー：${s.applied}/${e.length} 箇所を適用（右は編集して調整可）`;
  i.length && (o += ` ⚠ mdflow: ${i.length}件の警告`), vn(n, s.content, (a) => {
    const c = r.editor.getModel();
    r.editor.executeEdits(
      "pixie-patch",
      [{ range: c.getFullModelRange(), text: a, forceMoveMarkers: !0 }]
    ), r.editor.focus();
  }, o);
}
function Ra() {
  r.pendingTarget?.coll && r.pendingTarget.coll.clear();
  const e = r.editor.getSelection();
  if (!e || e.isEmpty())
    return r.pendingTarget = null, null;
  const t = r.editor.createDecorationsCollection([
    { range: e, options: { className: "pixie-pending-target" } }
  ]);
  return r.pendingTarget = { file: r.currentFile, coll: t }, r.pendingTarget;
}
function Ia(e, t, n) {
  const s = document.createElement("div");
  s.className = "apply-actions";
  const i = document.createElement("button");
  i.className = "insert-btn", i.textContent = "▶ エディタへ反映", i.title = "このメッセージの提案を差分プレビューで確認してから反映する", i.addEventListener("click", () => ci(Kr(t), n)), s.appendChild(i), e.appendChild(s), z();
}
function Aa(e, t, n) {
  const s = [...t.matchAll(/```apply\s*\n([\s\S]*?)```/g)];
  if (!s.length) return !1;
  const i = s[s.length - 1][1].replace(/\n$/, "");
  e.querySelector(".body").textContent = t.replace(/```apply\s*\n[\s\S]*?```/g, "修正案（下のボックス参照）");
  const o = document.createElement("div");
  o.className = "apply-box", o.textContent = i;
  const a = document.createElement("div");
  a.className = "apply-actions";
  const c = document.createElement("button");
  return c.className = "apply-btn", c.textContent = "▶ 差分で反映", c.addEventListener("click", () => ci(i, n)), a.appendChild(c), e.append(o, a), z(), !0;
}
function ci(e, t) {
  const n = Pa(t), s = r.editor.getModel().getValueInRange(n);
  vn(s, e, (i) => {
    r.editor.executeEdits("pixie-apply", [{ range: n, text: i, forceMoveMarkers: !0 }]), t?.coll && t.coll.clear(), r.editor.focus();
  });
}
function Pa(e) {
  const t = r.editor.getModel();
  if (e?.coll && e.file === r.currentFile) {
    const n = e.coll.getRange(0);
    if (n) return n;
  }
  return t.getFullModelRange();
}
let V = null, mt = null, ke = [], fe = null;
function vn(e, t, n, s, i = {}) {
  const o = r.monaco;
  l("diff-label").textContent = s || "差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）", l("diff-overlay").classList.remove("hidden"), l("diff-apply").classList.toggle("hidden", !!i.approval), l("diff-cancel").classList.toggle("hidden", !!i.approval), l("diff-close").classList.toggle("hidden", !i.approval), V || (V = o.editor.createDiffEditor(l("diff-editor"), {
    theme: "vs-dark",
    automaticLayout: !0,
    renderSideBySide: !0,
    originalEditable: !1,
    readOnly: !1,
    minimap: { enabled: !1 },
    wordWrap: "on",
    fontSize: 14
  })), V.updateOptions({ readOnly: !n && !i.editable });
  const a = i.lang || (r.currentFile ? Qt(r.currentFile) : "markdown"), c = o.editor.createModel(e, a), d = o.editor.createModel(t, a);
  V.setModel({ original: c, modified: d }), mt = n ? () => {
    const u = V.getModel().modified.getValue();
    ne(), n(u);
  } : null, V.focus();
}
function ne() {
  if (l("diff-overlay").classList.add("hidden"), mt = null, ke = [], fe = null, l("diff-tabs").innerHTML = "", l("diff-approve-edit").classList.add("hidden"), V) {
    const e = V.getModel();
    V.setModel(null), e && (e.original.dispose(), e.modified.dispose());
  }
}
function Da(e, t = null) {
  ke = e, fe = t, l("diff-approve-edit").classList.toggle("hidden", !t);
  const n = l("diff-tabs");
  n.innerHTML = "", e.length > 1 && e.forEach((s, i) => {
    const o = document.createElement("button");
    o.type = "button", o.textContent = (s.path || "").split("/").pop() || s.path, o.title = s.path, o.addEventListener("click", () => Xn(i)), n.appendChild(o);
  }), Xn(0);
}
function Xn(e) {
  const t = ke[e];
  t && ([...l("diff-tabs").children].forEach((n, s) => n.classList.toggle("active", s === e)), vn(
    t.before,
    t.after,
    null,
    `承認確認: ${t.path}（左＝現在 ／ 右＝書き込まれる内容${fe ? "・右を編集して修正して承認できます" : ""}）`,
    { approval: !0, editable: !!fe, lang: Qt(t.path || "") }
  ));
}
async function Fa(e, t, n) {
  l("approval").classList.add("hidden"), l("approval").innerHTML = "", ne(), r.assistantEl && R(r.assistantEl, "✓ 修正して承認しました（編集内容を適用）。"), await M("/api/approve-edit", { id: e, path: t, content: n, session_id: r.sessionId }).catch((s) => R(r.assistantEl, "⚠️ 修正内容を適用できませんでした: " + s.message));
}
function li(e) {
  r.planText = e, Oe(l("plan-body"), e), l("plan-label").textContent = "実行計画（承認するまでファイルは変更されません）", l("plan-overlay").classList.remove("hidden");
}
function di() {
  l("plan-overlay").classList.add("hidden"), l("plan-body").innerHTML = "", r.planText = "";
}
async function Ba() {
  const e = r.planText;
  if (!e) return;
  if (di(), Te()) {
    r.planExecNext = !0, $("system", "✓ 計画を承認しました。実装を開始します（書き込みは引き続き承認制）。"), l("chat-input").value = `以下の実行計画を承認しました。この計画のとおりに実装してください。計画から外れる変更が必要になったら、実行する前に知らせてください。

` + e, await He();
    return;
  }
  if (!await sn("code", { keepMessages: !0 })) {
    li(e);
    return;
  }
  $("system", "計画を承認しました。Codeモードで実行します。"), l("chat-input").value = `以下の実行計画を承認しました。この計画のとおりに実装してください。計画から外れる変更が必要になったら、実行する前に知らせてください。

` + e, await He();
}
function Jn() {
  l("plan-overlay").classList.add("hidden"), $("system", "✕ 計画の修正を依頼します。どこをどう直したいかチャットに書いてください。"), l("chat-input").focus();
}
async function ye(e) {
  const t = await B("/api/workspace/dirs?path=" + encodeURIComponent(e || ""));
  if (!t) return;
  l("root-input").value = t.cwd || "", dn();
  const n = l("root-drives");
  n.innerHTML = "";
  for (const i of t.drives || []) {
    const o = document.createElement("button");
    o.textContent = i, o.classList.toggle("active", (t.cwd || "").toLowerCase().startsWith(i.toLowerCase().slice(0, 2))), o.addEventListener("click", () => ye(i)), n.appendChild(o);
  }
  const s = l("root-dirlist");
  if (s.innerHTML = "", t.parent && t.parent !== t.cwd) {
    const i = document.createElement("li");
    i.textContent = "⬆ ..（上のフォルダへ）", i.addEventListener("click", () => ye(t.parent)), s.appendChild(i);
  }
  for (const i of t.dirs || []) {
    const o = document.createElement("li");
    o.textContent = i.name, o.addEventListener("click", () => ye(i.path)), s.appendChild(o);
  }
}
async function Zt() {
  l("root-modal").classList.remove("hidden"), await Fs(), Hs(), await ye(l("root-path").textContent || "");
}
function st() {
  l("root-modal").classList.add("hidden");
}
const Ha = () => yn(l("root-input").value.trim());
async function yn(e) {
  if (!e) return;
  if (r.streaming) {
    alert("⚠️ 実行中は作業フォルダを切り替えられません。");
    return;
  }
  if (await qe(), r.dirty && !confirm("未保存の変更があります。破棄して作業フォルダを切り替えますか？")) return;
  let t;
  try {
    t = await M("/api/workspace", { path: e });
  } catch (n) {
    alert("⚠️ フォルダ変更に失敗: " + n.message);
    return;
  }
  st(), r.currentFile = null, r.baseMtime = null, mo(), Go(), r.collapsedDirs.clear(), r.knownDirs.clear(), r.changedPaths.clear(), r.saveError = null, r.editor.setValue(""), vt(), U(), l("current-file").textContent = "（ファイル未選択）", xe(), Cs(), await ks(), tn(), await wt(), await q(), I() ? (r.sessionId = je(), be(), l("approval").classList.add("hidden"), r.assistantEl = null, await rn()) : oi(), $("system", "作業フォルダを変更: " + (t.workspace || e));
}
async function Oa() {
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
      await q(), await X(n.path);
    } catch (n) {
      alert("エラー: " + n.message);
    } finally {
      t.disabled = !1, t.textContent = "🌐+";
    }
  }
}
function de(e) {
  const t = l("cp-bar-status");
  t && (t.textContent = e);
}
async function ja() {
  de("ブラウザを起動中…");
  try {
    const e = await (await fetch("/api/copilot/open", { method: "POST" })).json();
    de(e.ok ? "Copilot を開きました。ブラウザで対話してください。" : e.error);
  } catch (e) {
    de("エラー: " + e.message);
  }
}
async function Wa() {
  if (r.streaming) return;
  const e = l("cp-bar-import-btn");
  e.disabled = !0, de("会話を取得中…");
  let t;
  try {
    t = await (await fetch("/api/copilot/read", { method: "POST" })).json();
  } catch (i) {
    de("エラー: " + i.message), e.disabled = !1;
    return;
  }
  if (e.disabled = !1, !t.ok) {
    de(t.error);
    return;
  }
  de("");
  const n = l("chat-input"), s = n.value.trim() || "以下は私が Microsoft Copilot と交わした会話ログです。内容を整理して、ノートとして残せる Markdown のまとめを作ってください。";
  n.value = s + `

---

# Copilot 会話ログ

` + t.transcript, await He();
}
async function Ua() {
  l("settings-modal").classList.remove("hidden"), await Promise.all([
    qa(),
    fi(),
    ui(),
    pi()
  ]);
}
async function qa() {
  const e = l("settings-model");
  if (!e) return;
  const t = await J("/api/servers").catch(() => ({ servers: [], active: 0 }));
  e.innerHTML = "", (t.servers || []).forEach((n, s) => {
    const i = document.createElement("option");
    i.value = s, i.textContent = `${n.name} — ${n.model || "(model?)"}`, s === t.active && (i.selected = !0), e.appendChild(i);
  }), e.onchange = async () => {
    try {
      await M("/api/settings", { active_server: Number(e.value) });
    } catch (n) {
      alert("⚠️ 設定を保存できません: " + n.message);
    }
    await Promise.all([fi(), ui(), wt()]);
  };
}
async function ui() {
  const e = await J("/api/settings").catch(() => ({})), t = l("settings-think-budget");
  t && (e.think_budget_min != null && (t.min = e.think_budget_min), e.think_budget_max != null && (t.max = e.think_budget_max), e.think_budget_sec != null && (t.value = e.think_budget_sec), l("settings-think-budget-status").textContent = "");
  const n = l("settings-context-length");
  n && (e.context_length_min != null && (n.min = e.context_length_min), e.context_length_max != null && (n.max = e.context_length_max), e.context_length != null && (n.value = e.context_length || 0), l("settings-context-length-status").textContent = "");
}
async function Qn() {
  const e = l("settings-think-budget"), t = l("settings-think-budget-status");
  t.textContent = "保存中…";
  try {
    const n = await M("/api/settings", { think_budget_sec: Number(e.value) });
    e.value = n.think_budget_sec, t.textContent = `✓ ${n.think_budget_sec} 秒にしました`;
  } catch (n) {
    t.textContent = "⚠ " + n.message;
  }
}
async function es() {
  const e = l("settings-context-length"), t = l("settings-context-length-status");
  t.textContent = "保存中…";
  try {
    const n = await M("/api/settings", { context_length: Number(e.value) });
    e.value = n.context_length || 0, t.textContent = n.context_length ? `✓ ${n.context_length.toLocaleString()} トークンにしました（会話は作り直し）` : "✓ 自動（バックエンドの取得値）に戻しました";
  } catch (n) {
    t.textContent = "⚠ " + n.message;
  }
}
async function fi() {
  const e = l("settings-llm-model");
  if (!e) return;
  e.innerHTML = "", e.disabled = !0;
  const t = document.createElement("option");
  t.textContent = "(取得中…)", e.appendChild(t);
  const n = await J("/api/models").catch(() => ({ models: [] })), s = n.models || [];
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
        await M("/api/settings", { model: e.value });
      } catch (i) {
        alert("⚠️ モデルを保存できません: " + i.message);
      }
      await wt();
    }
  };
}
function Rt() {
  l("settings-modal").classList.add("hidden");
}
async function pi() {
  const e = await J("/api/copilot").catch(() => ({}));
  l("settings-copilot").checked = !!e.enabled, r.copilotEnabled = !!e.enabled, nn();
  const t = [];
  e.enabled && t.push("オン"), e.script_ok ? e.python_ok ? e.enabled && t.push("PrayLight OK — 未ログインなら下のボタンでブラウザを開いてログイン") : t.push("⚠ PrayLight の .venv Python 未検出") : t.push("⚠ PrayLight 未検出: " + (e.praylight_dir || "?")), l("settings-copilot-status").textContent = t.join(" / ");
}
async function Ka(e) {
  try {
    const t = await M("/api/copilot/enable", { enabled: l("settings-copilot").checked });
    r.copilotEnabled = !!t.enabled, nn();
  } catch (t) {
    alert("⚠️ 設定を保存できません: " + t.message), e.target.checked = !e.target.checked;
  }
  await pi();
}
async function Va() {
  l("settings-copilot-status").textContent = "起動中…";
  const e = await M("/api/copilot/open").catch(() => ({ ok: !1, error: "通信エラー" }));
  l("settings-copilot-status").textContent = e.ok ? "ブラウザを開きました。Copilot にログインしてください。" : e.error || "起動失敗";
}
function za() {
  l("send-btn").addEventListener("click", () => r.streaming ? Ca() : He()), l("new-session-btn").addEventListener("click", oi), l("sessions-btn").addEventListener("click", ai), l("sessions-close").addEventListener("click", () => l("sessions-modal").classList.add("hidden")), l("sessions-modal").addEventListener("click", (e) => {
    e.target === l("sessions-modal") && l("sessions-modal").classList.add("hidden");
  }), be(), xe(), l("save-btn").addEventListener("click", () => Ot()), l("preview-btn").addEventListener("click", Kt), l("richcopy-btn").addEventListener("click", jo), l("preview").addEventListener("wheel", qs, { passive: !0 }), l("preview").addEventListener("scroll", () => {
    So(), te && zs(r.editor.getModel(), te.range);
  }, { passive: !0 }), document.addEventListener("selectionchange", () => {
    clearTimeout(qn), qn = setTimeout(_o, Mo);
  }), ko(), Uo(), l("refresh-btn").addEventListener("click", () => q()), l("file-search").addEventListener("input", zo), l("search-case").addEventListener("change", () => mn(l("file-search").value)), l("replace-toggle").addEventListener("click", Zo), l("replace-preview-btn").addEventListener("click", () => _t(!0)), l("replace-run-btn").addEventListener("click", () => _t(!1)), l("replace-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), _t(!0));
  }), l("nav-back").addEventListener("click", jt), l("nav-fwd").addEventListener("click", Wt), l("recent-btn").addEventListener("click", (e) => {
    e.stopPropagation(), Ut();
  }), l("history-btn").addEventListener("click", ho), l("hist-close").addEventListener("click", tt), l("hist-restore").addEventListener("click", vo), l("hist-modal").addEventListener("click", (e) => {
    e.target === l("hist-modal") && tt();
  }), Ee(), l("mode-btn").addEventListener("click", Xr), l("code-style-btn").addEventListener("click", Zr), l("plan-approve").addEventListener("click", Ba), l("plan-reject").addEventListener("click", Jn), l("note-btn").addEventListener("click", Qo), l("chat-clear-btn").addEventListener("click", Jr), ra(), l("ref-add-btn").addEventListener("click", oa), l("pick-cancel").addEventListener("click", nt), l("pick-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Re(l("pick-input").value.trim()));
  }), l("pick-modal").addEventListener("click", (e) => {
    e.target === l("pick-modal") && nt();
  }), l("diff-apply").addEventListener("click", () => {
    mt && mt();
  }), l("diff-cancel").addEventListener("click", ne), l("diff-close").addEventListener("click", ne), l("diff-approve-edit").addEventListener("click", () => {
    if (!fe || !V) return;
    const e = V.getModel().modified.getValue();
    Fa(fe.id, fe.path, e);
  }), l("chat-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.ctrlKey || e.metaKey) && (e.preventDefault(), He());
  }), l("new-file-btn").addEventListener("click", () => ot("file")), l("new-folder-btn").addEventListener("click", () => ot("dir")), l("web2md-btn").addEventListener("click", Oa), l("cp-bar-open-btn").addEventListener("click", ja), l("cp-bar-import-btn").addEventListener("click", Wa), document.addEventListener("click", De), so(), l("root-project-btn").addEventListener("click", Zt), l("folder-btn").addEventListener("click", Zt), l("root-cancel").addEventListener("click", st), l("root-ok").addEventListener("click", Ha), l("places-btn").addEventListener("click", (e) => {
    e.stopPropagation(), Eo();
  }), l("root-fav-btn").addEventListener("click", () => {
    const e = l("root-input").value.trim();
    e && Os(e);
  }), l("root-input").addEventListener("input", dn), l("root-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), ye(l("root-input").value.trim()));
  }), l("root-modal").addEventListener("click", (e) => {
    e.target === l("root-modal") && st();
  }), l("settings-btn").addEventListener("click", Ua), l("settings-close").addEventListener("click", Rt), l("settings-think-budget-save").addEventListener("click", Qn), l("settings-think-budget").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Qn());
  }), l("settings-context-length-save").addEventListener("click", es), l("settings-context-length").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), es());
  }), l("settings-copilot").addEventListener("change", Ka), l("settings-copilot-open").addEventListener("click", Va), l("settings-modal").addEventListener("click", (e) => {
    e.target === l("settings-modal") && Rt();
  }), window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault(), Ot();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault(), Kt();
      return;
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault(), e.key === "ArrowLeft" ? jt() : Wt();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "e") {
      e.preventDefault(), Ut();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "h" && te) {
      e.preventDefault(), Gs();
      return;
    }
    e.key === "Escape" && !l("hist-modal").classList.contains("hidden") ? tt() : e.key === "Escape" && !l("root-modal").classList.contains("hidden") ? st() : e.key === "Escape" && !l("pick-modal").classList.contains("hidden") ? nt() : e.key === "Escape" && !l("cf-modal").classList.contains("hidden") ? l("cf-modal").classList.add("hidden") : e.key === "Escape" && !l("sessions-modal").classList.contains("hidden") ? l("sessions-modal").classList.add("hidden") : e.key === "Escape" && !l("settings-modal").classList.contains("hidden") ? Rt() : e.key === "Escape" && !l("diff-overlay").classList.contains("hidden") ? ne() : e.key === "Escape" && !l("plan-overlay").classList.contains("hidden") && Jn();
  }), window.addEventListener("blur", () => {
    qe();
  }), window.addEventListener("beforeunload", (e) => {
    r.dirty && (e.preventDefault(), e.returnValue = "");
  }), Qa(), ec(), tc();
}
const Ga = "pixie.splitRatio", Ya = "pixie.previewRatio", Za = 320, Xa = 160;
function mi({ divider: e, pane: t, container: n, min: s, key: i, after: o }) {
  const a = (p) => {
    const g = n.clientWidth - s - e.offsetWidth;
    t.style.flex = `0 0 ${Math.max(s, Math.min(p, Math.max(s, g)))}px`, r.editor?.layout(), o?.();
  }, c = () => {
    const p = Number(localStorage.getItem(i));
    p > 0 && p < 1 && a(n.clientWidth * p);
  };
  let d = !1;
  e.addEventListener("mousedown", (p) => {
    p.preventDefault(), d = !0, document.body.style.cursor = "col-resize";
  }), window.addEventListener("mouseup", () => {
    d && (d = !1, document.body.style.cursor = "", localStorage.setItem(
      i,
      String(t.getBoundingClientRect().width / n.clientWidth)
    ));
  }), window.addEventListener("mousemove", (p) => {
    d && a(p.clientX - n.getBoundingClientRect().left);
  }), e.addEventListener("dblclick", () => {
    t.style.flex = "", localStorage.removeItem(i), r.editor?.layout();
  });
  const u = () => {
    t.style.flex && a(t.getBoundingClientRect().width);
  };
  return window.addEventListener("resize", u), { restore: c, reclamp: u };
}
let En = null;
function Ja() {
  En?.restore();
}
function Qa() {
  const { restore: e } = mi({
    divider: l("divider"),
    pane: l("left-pane"),
    container: l("split"),
    min: Za,
    key: Ga,
    // 左ペインが細くなるとプレビュー側が押し出される。エディタは固定幅（flex-shrink:0）
    // なので放っておくとプレビューが 0px に潰れる。現在幅を入れ直して再クランプする。
    after: () => {
      G() && En?.reclamp();
    }
  });
  e();
}
function ec() {
  En = mi({
    divider: l("preview-divider"),
    pane: l("editor"),
    container: l("edit-area"),
    min: Xa,
    key: Ya
  });
}
const It = "pixie.filemgrHeight", ts = 80;
function tc() {
  const e = l("v-divider"), t = l("filemgr");
  if (!e || !t) return;
  const n = (o) => {
    t.style.flex = `0 0 ${o}px`, t.style.maxHeight = "none";
  }, s = Number(localStorage.getItem(It));
  s >= ts && n(s);
  let i = !1;
  e.addEventListener("mousedown", (o) => {
    o.preventDefault(), i = !0, document.body.style.cursor = "row-resize";
  }), window.addEventListener("mouseup", () => {
    i && (i = !1, document.body.style.cursor = "", localStorage.setItem(It, String(t.getBoundingClientRect().height)));
  }), window.addEventListener("mousemove", (o) => {
    if (!i) return;
    const a = t.getBoundingClientRect().top, c = l("right-pane").getBoundingClientRect().bottom - a - 220;
    n(Math.max(ts, Math.min(o.clientY - a, c)));
  }), e.addEventListener("dblclick", () => {
    t.style.flex = "", t.style.maxHeight = "", localStorage.removeItem(It);
  });
}
