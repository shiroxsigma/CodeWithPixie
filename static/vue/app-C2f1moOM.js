import { c as $, w as Oi, a as dn, s as dt, b as Hi, d as un, e as ys, f as ji } from "./main-DeV90tDn.js";
class ne extends Error {
  constructor(t, n) {
    super(t), this.name = "ApiError", this.status = n;
  }
}
async function Z(e, t) {
  let n;
  try {
    n = await fetch(e, t);
  } catch {
    throw new ne(`サーバに接続できません（${e}）`, 0);
  }
  if (!n.ok) {
    const s = await n.json().catch(() => ({}));
    throw new ne(s.detail || n.statusText || `HTTP ${n.status}`, n.status);
  }
  return n.json();
}
const re = (e) => Z(e), R = (e, t) => Z(e, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: t === void 0 ? void 0 : JSON.stringify(t)
});
async function z(e, t) {
  try {
    return await Z(e, t);
  } catch (n) {
    alert("⚠️ " + n.message);
    return;
  }
}
const l = (e) => document.getElementById(e);
function Rt(e, t = "") {
  const n = t.trim();
  return n ? `# 修正指示

${n}

${e.content}` : e.content;
}
function Wi({ getSnapshot: e, isCurrent: t, canSend: n, send: s }) {
  const i = l("source-bundle-modal"), r = l("source-bundle-instruction"), a = l("source-bundle-preview"), c = l("source-bundle-status");
  let d = null, u, f = 0, h = !1, p = !1;
  const g = [], y = (E, M, I) => {
    E.addEventListener(M, I), g.push(() => E.removeEventListener(M, I));
  };
  function k() {
    const E = !h && d?.file_count > 0 && t(u);
    l("source-bundle-copy").disabled = !E, l("source-bundle-download").disabled = !E, l("source-bundle-send").disabled = !E || !r.value.trim() || !n(), l("source-bundle-refresh").disabled = h, a.value = d ? Rt(d, r.value) : "";
  }
  function L() {
    i.classList.add("hidden"), l("source-bundle-btn").focus();
  }
  function v() {
    f++, h = !1, d = null, u = void 0, r.value = "", c.textContent = "", l("source-bundle-root").textContent = "", l("source-bundle-summary").textContent = "", l("source-bundle-skips-list").replaceChildren(), l("source-bundle-skips").classList.add("hidden"), l("source-bundle-warning").classList.add("hidden"), i.classList.add("hidden"), k();
  }
  async function b() {
    const E = e(), M = ++f;
    u = E.generation, h = !0, d = null, c.textContent = "ソースを収集中…", l("source-bundle-root").textContent = "", l("source-bundle-summary").textContent = "", l("source-bundle-warning").classList.add("hidden"), l("source-bundle-skips").classList.add("hidden"), k();
    try {
      const I = await R("/api/workspace/source-bundle", {
        current_file: E.current_file,
        current_content: E.current_content
      });
      if (p || M !== f) return;
      if (!t(E.generation)) {
        v();
        return;
      }
      d = I, l("source-bundle-root").textContent = I.root, l("source-bundle-summary").textContent = `${I.file_count} ファイル・${Number(I.total_bytes).toLocaleString()} バイト`;
      const P = l("source-bundle-warning");
      P.textContent = I.truncated ? "サイズまたは件数の上限に達しました。一部のソースは含まれていません。" : "", P.classList.toggle("hidden", !I.truncated);
      const W = I.skipped || [];
      l("source-bundle-skips").classList.toggle("hidden", !W.length), l("source-bundle-skips-summary").textContent = `除外されたファイル（${W.length}件）`;
      const V = l("source-bundle-skips-list");
      V.replaceChildren();
      for (const ae of W) {
        const H = document.createElement("li");
        H.textContent = `${ae.path}: ${ae.reason}`, V.appendChild(H);
      }
      c.textContent = I.file_count ? "コピー・保存・送信の準備ができました。" : "まとめられるソースがありません。";
    } catch (I) {
      if (p || M !== f) return;
      if (!t(E.generation)) {
        v();
        return;
      }
      c.textContent = "ソースをまとめられませんでした: " + I.message;
    } finally {
      !p && M === f && (h = !1, k());
    }
  }
  function C() {
    return d && !h && t(u) && d.file_count > 0 ? !0 : (k(), !1);
  }
  async function _() {
    if (C())
      try {
        await navigator.clipboard.writeText(Rt(d, r.value)), c.textContent = "コピーしました。Copilot に貼り付けられます。";
      } catch {
        c.textContent = "コピーできませんでした。プレビューを選択してコピーするか、ファイルに保存してください。";
      }
  }
  function A() {
    if (!C()) return;
    const E = URL.createObjectURL(new Blob([Rt(d, r.value)], { type: "text/markdown;charset=utf-8" })), M = document.createElement("a");
    M.href = E, M.download = d.filename, document.body.appendChild(M), M.click(), M.remove(), setTimeout(() => URL.revokeObjectURL(E), 1e3), c.textContent = "ファイルに保存しました。Copilot に添付できます。";
  }
  async function F() {
    if (!C() || (k(), !r.value.trim() || !n())) return;
    const E = {
      message: "/copilot_simple " + r.value.trim(),
      sourceBundle: { filename: d.filename, content: d.content },
      attachmentLabel: `${d.filename}（${d.file_count} ファイル）`
    }, M = s(E);
    L(), await M;
  }
  return y(l("source-bundle-btn"), "click", () => {
    i.classList.remove("hidden"), r.focus(), b();
  }), y(r, "input", k), y(l("source-bundle-close"), "click", L), y(l("source-bundle-refresh"), "click", b), y(l("source-bundle-copy"), "click", _), y(l("source-bundle-download"), "click", A), y(l("source-bundle-send"), "click", F), y(i, "click", (E) => {
    E.target === i && L();
  }), y(window, "focus", k), y(window, "keydown", (E) => {
    E.key === "Escape" && !i.classList.contains("hidden") && (E.preventDefault(), L());
  }), k(), { reset: v, update: k, dispose() {
    p = !0, v(), g.forEach((E) => E());
  } };
}
const me = globalThis.jsyaml || null, bs = () => me !== null, Ui = "fill:#ff9999,stroke:#333,stroke-width:2px", qi = "fill:#2a2a2a,stroke:#555,color:#888", Un = /^```[ \t]*(?:yaml[ \t]+)?mdflow-mapping[ \t]*\n([\s\S]*?)^```/gm, Es = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/, Vi = /^﻿?---[ \t]*\r?\n/, Ki = /^\s*%%\s*id\s*:\s*(\S+)/m;
function zi(e) {
  const t = Ki.exec(e);
  return t ? t[1] : "";
}
function Gi(e) {
  const t = [];
  let n = {}, s = e, i = 0;
  const r = Es.exec(e);
  if (r) {
    try {
      const u = me ? me.load(r[1]) : null;
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
  if (me) {
    Un.lastIndex = 0;
    let u, f = 0;
    for (; (u = Un.exec(s)) !== null; ) {
      f += 1;
      let h;
      try {
        h = me.load(u[1]) || {};
      } catch (y) {
        t.push(`mdflow-mapping ブロック #${f}: YAML 構文エラー: ${y.message || y}`);
        continue;
      }
      if (typeof h != "object" || Array.isArray(h)) {
        t.push(`mdflow-mapping ブロック #${f}: YAML のトップレベルがマッピングではありません`);
        continue;
      }
      const p = [];
      for (const [y, k] of Object.entries(h.presets || {})) {
        const L = k || {};
        p.push({
          name: String(y),
          when: String(L.when ?? ""),
          activeNodes: (L.active_nodes || []).map(String)
        });
      }
      const g = h.style || {};
      d.push({
        diagramId: String(h.diagram ?? ""),
        presets: p,
        activeStyle: String(g.active ?? Ui),
        inactiveStyle: String(g.inactive ?? qi)
      });
    }
  }
  return { meta: n, body: s, bodyOffset: i, selected: c, mappings: d, warnings: t };
}
function Yi(e, t) {
  return t && e.find((n) => n.diagramId === t) || null;
}
class ke extends Error {
}
function Zi(e) {
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
    throw new ke(`ルール式に不正な文字 '${s}': ${e}`);
  }
  return t;
}
const Xe = (e) => typeof e == "number" || typeof e == "boolean";
function Xi(e, t, n) {
  if (e === "==" || e === "!=") {
    const s = Xe(t) && Xe(n) ? Number(t) === Number(n) : t === n;
    return e === "==" ? s : !s;
  }
  if (Xe(t) && Xe(n))
    t = Number(t), n = Number(n);
  else if (!(typeof t == "string" && typeof n == "string")) return !1;
  return e === "<" ? t < n : e === "<=" ? t <= n : e === ">" ? t > n : t >= n;
}
function Ji(e, t) {
  if (e = (e || "").trim(), !e) return !0;
  const n = Zi(e);
  let s = 0;
  const i = () => n[s], r = () => n[s++];
  function a() {
    let p = c();
    for (; i()?.t === "||"; ) {
      r();
      const g = c();
      p = !!p || !!g;
    }
    return p;
  }
  function c() {
    let p = d();
    for (; i()?.t === "&&"; ) {
      r();
      const g = d();
      p = !!p && !!g;
    }
    return p;
  }
  function d() {
    return i()?.t === "!" ? (r(), !d()) : u();
  }
  function u() {
    let p = f();
    if (i()?.t !== "op") return p;
    let g = !0;
    for (; i()?.t === "op"; ) {
      const y = r().v, k = f();
      g && !Xi(y, p, k) && (g = !1), p = k;
    }
    return g;
  }
  function f() {
    const p = r();
    if (!p) throw new ke(`ルール式が途中で終わっています: ${e}`);
    if (p.t === "lit") return p.v;
    if (p.t === "name")
      return t && Object.prototype.hasOwnProperty.call(t, p.v) ? t[p.v] : p.v === "true" ? !0 : p.v === "false" ? !1 : (p.v === "null", null);
    if (p.t === "(") {
      const g = a();
      if (r()?.t !== ")") throw new ke(`括弧が閉じていません: ${e}`);
      return g;
    }
    throw new ke(`ルール式の構文エラー: ${e}`);
  }
  const h = a();
  if (s !== n.length) throw new ke(`ルール式の構文エラー: ${e}`);
  return !!h;
}
function Qi(e, t, n) {
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
      i = Ji(s.when, t || {});
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
const qn = /\b([A-Za-z_][\w-]*)\s*[\[({]/g, Vn = /([A-Za-z_][\w-]*)\s*(?:-{2,3}>|-{2,3}|={2,3}>|-\.->|-\.-)\s*(?:\|[^|]*\|\s*)?([A-Za-z_][\w-]*)/g, er = /^\s*(graph|flowchart)\b/i, Kn = /* @__PURE__ */ new Set([
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
function xs(e) {
  for (const t of e.split(`
`)) {
    const n = t.trim();
    if (!(!n || n.startsWith("%%")))
      return er.test(n);
  }
  return !1;
}
function ks(e) {
  const t = /* @__PURE__ */ new Set();
  for (const n of e.split(`
`)) {
    const s = n.trim();
    if (!s || s.startsWith("%%")) continue;
    Vn.lastIndex = 0;
    let i;
    for (; (i = Vn.exec(s)) !== null; )
      for (const r of [i[1], i[2]]) Kn.has(r) || t.add(r);
    for (qn.lastIndex = 0; (i = qn.exec(s)) !== null; )
      Kn.has(i[1]) || t.add(i[1]);
  }
  return [...t];
}
function tr(e, t, n, s = "mdflowActive", i = null) {
  const r = e.replace(/\n+$/, "");
  if (!t?.length) return { code: r, missing: [] };
  let a = [], c = [...new Set(t)];
  const d = xs(e), u = d ? ks(e) : [];
  if (d) {
    const h = new Set(u);
    a = c.filter((p) => !h.has(p)), c = c.filter((p) => h.has(p));
  }
  if (!c.length) return { code: r, missing: a };
  const f = [r, ""];
  if (i && d) {
    const h = new Set(c), p = u.filter((g) => !h.has(g));
    p.length && (f.push(`classDef mdflowInactive ${i};`), f.push(`class ${p.join(",")} mdflowInactive;`));
  }
  return f.push(`classDef ${s} ${n};`), f.push(`class ${c.join(",")} ${s};`), { code: f.join(`
`), missing: a };
}
function zn(e) {
  return me ? me.dump(String(e), { lineWidth: -1 }).trim() : String(e);
}
function nr(e) {
  const t = /^\s*(.+?):(?:\s|$)/.exec(e.replace(/\r$/, ""));
  if (!t) return null;
  let n = t[1].trim();
  const s = n[0];
  return (s === '"' || s === "'") && n.endsWith(s) && n.length >= 2 && (n = n.slice(1, -1)), n;
}
const It = (e) => /^\s*/.exec(e)[0].length;
function sr(e, t, n) {
  const s = zn(t), i = n == null ? null : `${s}: ${zn(n)}`, r = Es.exec(e);
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
  const a = Vi.exec(e)[0].length, c = r[1], d = [];
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
  let h = -1;
  for (let v = f + 1; v < d.length; v++) {
    const b = d[v].raw.replace(/\r$/, "");
    if (b.trim() && It(b) === 0) break;
    if (/^\s+selected:\s*$/.test(b)) {
      h = v;
      break;
    }
  }
  if (h < 0) {
    if (i == null) return null;
    const v = d[f].start + d[f].raw.length + 1;
    return { start: v, end: v, text: `  selected:
    ${i}
` };
  }
  const p = It(d[h].raw), g = " ".repeat(p + 2);
  let y = -1, k = null;
  for (let v = h + 1; v < d.length; v++) {
    const b = d[v].raw.replace(/\r$/, "");
    if (b.trim() && It(b) <= p) break;
    if (b.trim() && (k == null && (k = /^\s*/.exec(b)[0]), nr(b) === t)) {
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
  const L = d[h].start + d[h].raw.length + 1;
  return { start: L, end: L, text: `${k ?? g}${i}
` };
}
const ir = 2;
function Cs(e) {
  return (e || "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "figure";
}
function rr(e, t) {
  const n = /^\s*%%\s*id\s*:\s*(\S+)/m.exec(e || "");
  return Cs(n ? n[1] : `figure-${t + 1}`);
}
function or(e) {
  const t = e.getAttribute("viewBox")?.trim().split(/[\s,]+/);
  if (t?.length === 4) {
    const s = parseFloat(t[2]), i = parseFloat(t[3]);
    if (Number.isFinite(s) && Number.isFinite(i) && s > 0 && i > 0) return { width: s, height: i };
  }
  const n = e.getBoundingClientRect();
  return { width: Math.max(1, n.width), height: Math.max(1, n.height) };
}
function ar(e) {
  return new Promise((t, n) => {
    const s = new Image();
    s.onload = () => t(s), s.onerror = () => n(new Error("SVG を画像として読み込めませんでした。")), s.src = e;
  });
}
async function Ls(e, { scale: t = ir, background: n = null } = {}) {
  const { width: s, height: i } = or(e), r = e.cloneNode(!0);
  r.setAttribute("width", String(s)), r.setAttribute("height", String(i)), r.removeAttribute("style"), r.getAttribute("xmlns") || r.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const a = new XMLSerializer().serializeToString(r), c = URL.createObjectURL(new Blob([a], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const d = await ar(c), u = document.createElement("canvas");
    u.width = Math.max(1, Math.round(s * t)), u.height = Math.max(1, Math.round(i * t));
    const f = u.getContext("2d");
    return n && (f.fillStyle = n, f.fillRect(0, 0, u.width, u.height)), f.drawImage(d, 0, 0, u.width, u.height), await new Promise((h, p) => {
      u.toBlob(
        (g) => g ? h(g) : p(new Error("PNG に変換できませんでした。")),
        "image/png"
      );
    });
  } finally {
    URL.revokeObjectURL(c);
  }
}
function cr(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result).split(",", 2)[1] || ""), s.onerror = () => n(new Error("画像データを読めませんでした。")), s.readAsDataURL(e);
  });
}
async function Gn(e) {
  if (!navigator.clipboard?.write || typeof ClipboardItem > "u")
    throw new Error("このブラウザは画像のクリップボードコピーに対応していません。");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": e })]);
}
const lr = [
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
], dr = ["<==>", "<-.->", "<-->", "<->", "-.->", "-.-", "-->", "---", "==>", "===", "--x", "--o"], Ss = [
  { open: "-.", closers: [[".->", "-.->"], [".-", "-.-"]] },
  { open: "--", closers: [["-->", "-->"], ["---", "---"], ["--x", "--x"], ["--o", "--o"]] },
  { open: "==", closers: [["==>", "==>"], ["===", "==="], ["==x", "==x"], ["==o", "==o"]] }
], ur = Ss.flatMap((e) => e.closers.map(([t]) => t)), fr = /^\s*(?:flowchart(?:-elk)?|graph)(?:\s+[A-Za-z]{2})?\s*;?\s*(?:%%.*)?$/i, pr = /^\s*(classDef|class|style|linkStyle|click|direction|accTitle|accDescr|title)\b/i, mr = /^[A-Za-z0-9_\u0080-\uFFFF][A-Za-z0-9_.\-\u0080-\uFFFF]*/, hr = /^(\s*class\s+)([^\s;]+)(\s+.*)$/i, gr = /^(\s*style\s+)([^\s;,]+)(\s+.*)$/i, wr = /^(\s*linkStyle\s+)(\d+(?:\s*,\s*\d+)*)(\s+.*)$/i;
function fn(e) {
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
      Qe(t, i, r, a);
      continue;
    }
    if (fr.test(i)) {
      t.hasHeader = !0, Qe(t, i, r, a);
      continue;
    }
    if (/^\s*(subgraph|end)\b/i.test(i))
      return t.supported = !1, t.reason = "subgraph を含む図は編集できません", t;
    if (pr.test(i)) {
      Qe(t, i, r, a);
      continue;
    }
    const c = br(i, r, a);
    if (!c) {
      Qe(t, i, r, a);
      continue;
    }
    if (!t.indent && c.type !== "other" && (t.indent = c.indent), t.statements.push(c), c.type === "node")
      Yn(t, c.ref);
    else {
      c.refs.forEach((d) => Yn(t, d));
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
const Je = /* @__PURE__ */ new Map(), vr = 100;
function yr(e) {
  const t = Je.get(e);
  if (t) return t;
  const n = fn(e), s = { ok: n.supported, reason: n.reason };
  return Je.size >= vr && Je.clear(), Je.set(e, s), s;
}
function Qe(e, t, n, s) {
  const i = { type: "other", start: n, end: s, indent: Ms(t) };
  let r;
  (r = hr.exec(t)) ? i.cls = {
    ids: r[2].split(",").map((a) => a.trim()).filter(Boolean),
    span: { start: n + r[1].length, end: n + r[1].length + r[2].length }
  } : (r = gr.exec(t)) ? i.styleNode = r[2] : (r = wr.exec(t)) && (i.link = {
    indices: r[2].split(",").map((a) => parseInt(a, 10)),
    span: { start: n + r[1].length, end: n + r[1].length + r[2].length }
  }), e.statements.push(i);
}
function Ms(e) {
  const t = /^([ \t]*)/.exec(e);
  return t ? t[1] : "";
}
function br(e, t, n, s) {
  const i = Ms(e), r = { pos: i.length }, a = () => {
    for (; r.pos < e.length && /\s/.test(e[r.pos]); ) r.pos++;
  }, c = () => t + r.pos;
  function d() {
    a();
    const L = mr.exec(e.slice(r.pos));
    if (!L) return null;
    let v = L[0];
    const b = v.search(/--|-\.|\.-/);
    if (b > 0 && (v = v.slice(0, b)), v = v.replace(/[-.]+$/, ""), !v) return null;
    const C = c();
    r.pos += v.length;
    const _ = { id: v, span: { start: C, end: C + v.length }, def: null };
    for (const [A, F] of lr) {
      if (!e.startsWith(A, r.pos)) continue;
      const E = r.pos + A.length;
      let M = -1, I = !1, P = E;
      if (e[E] === '"') {
        I = !0, P = E + 1;
        let H = P;
        for (; H < e.length; ) {
          if (e[H] === "\\" && e[H + 1] === '"') {
            H += 2;
            continue;
          }
          if (e[H] === '"') {
            M = H;
            break;
          }
          H++;
        }
        if (M < 0 || !e.startsWith(F, M + 1)) return null;
      } else {
        const H = e.indexOf(F, E);
        if (H < 0) return null;
        M = H;
      }
      const W = M + (I ? 1 : 0) + F.length;
      let V = W;
      const ae = /^:::[A-Za-z0-9_-]+/.exec(e.slice(W));
      return ae && (V = W + ae[0].length), _.def = {
        label: e.slice(P, M),
        quoted: I,
        shape: [A, F],
        cls: ae ? ae[0] : "",
        labelSpan: { start: t + P, end: t + M },
        span: { start: C, end: t + V },
        raw: e.slice(C - t, V)
      }, r.pos = V, _.span = { start: C, end: t + V }, _;
    }
    return _;
  }
  function u() {
    a();
    for (const L of dr) {
      if (!e.startsWith(L, r.pos)) continue;
      const v = c();
      r.pos += L.length;
      const b = {
        text: L,
        mid: null,
        span: { start: v, end: c() },
        label: null,
        labelSpan: null,
        pipeSpan: null
      };
      if (a(), e[r.pos] === "|") {
        const C = e.indexOf("|", r.pos + 1);
        if (C < 0) return null;
        b.label = e.slice(r.pos + 1, C), b.pipeSpan = { start: c(), end: t + C + 1 }, b.labelSpan = { start: c() + 1, end: t + C }, r.pos = C + 1;
      }
      return b;
    }
    return f();
  }
  function f() {
    for (const L of Ss) {
      if (!e.startsWith(L.open, r.pos)) continue;
      const v = c(), b = r.pos + L.open.length;
      let C = -1, _ = "", A = "";
      for (let P = b; P < e.length && C < 0; P++)
        for (const [W, V] of L.closers)
          if (e.startsWith(W, P)) {
            C = P, _ = W, A = V;
            break;
          }
      if (C < 0) continue;
      const F = e.slice(b, C);
      if (!F.trim()) continue;
      r.pos = C + _.length;
      const E = F.length - F.replace(/^\s+/, "").length, M = F.trim(), I = t + b + E;
      return {
        text: A,
        // mid があるものは「中置ラベル形式」。raw をそのまま書き戻せば見た目が保たれる。
        mid: { open: L.open, close: _ },
        raw: e.slice(v - t, r.pos),
        span: { start: v, end: c() },
        label: M,
        labelSpan: { start: I, end: I + M.length },
        pipeSpan: null
      };
    }
    return null;
  }
  function h() {
    return a(), e[r.pos] === ";" && (r.pos++, a()), r.pos >= e.length || e.slice(r.pos).startsWith("%%");
  }
  const p = d();
  if (!p) return null;
  const g = u();
  if (!g)
    return h() ? { type: "node", start: t, end: n, indent: i, ref: p } : null;
  const y = [p], k = [g];
  for (; ; ) {
    const L = d();
    if (!L) return null;
    if (y.push(L), h()) break;
    const v = u();
    if (!v) return null;
    k.push(v);
  }
  return { type: "edge", start: t, end: n, indent: i, refs: y, arrows: k };
}
function Yn(e, t) {
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
function Er(e) {
  return (e || "").replace(/#quot;/g, '"').replace(/#124;/g, "|");
}
const xr = /<br\s*\/?>/gi;
function Zn(e) {
  return Er(e).replace(xr, `
`);
}
function At(e) {
  return String(e ?? "").replace(/\r\n?/g, `
`).split(`
`).join("<br/>");
}
function _s(e) {
  return String(e ?? "").replace(/"/g, "#quot;").replace(/\|/g, "#124;");
}
function kr(e) {
  return e.mid ? e.raw : e.text + (e.label != null ? `|${e.label}|` : "");
}
function Ie(e) {
  return e.def ? e.def.raw : e.id;
}
function Cr(e) {
  for (let t = 1; ; t++) {
    const n = `N${t}`;
    if (!e.has(n)) return n;
  }
}
function $s(e, t) {
  const n = e.statements[e.statements.length - 1], s = e.indent || "";
  return n ? { at: n.end, prefix: `
` + s } : { at: 0, prefix: "" };
}
function Lr(e, t, n, s) {
  const i = e.nodes.get(n);
  if (!i) return [];
  const r = Ts(i);
  if (r.length)
    return Et(r.map((c) => ({
      start: c.labelSpan.start,
      end: c.labelSpan.end,
      text: c.quoted ? s.replace(/"/g, "#quot;") : Oe(s, c.shape[1])
    })));
  const a = i.firstRef;
  return [{ start: a.span.start, end: a.span.end, text: `${a.id}[${Oe(s, "]")}]` }];
}
function Ts(e) {
  return e.defs?.length ? e.defs : e.def ? [e.def] : [];
}
function Sr(e, t, n, s, i) {
  const r = e.nodes.get(n);
  if (!r) return [];
  const a = Ts(r);
  if (!a.length) {
    const c = r.firstRef;
    return [{
      start: c.span.start,
      end: c.span.end,
      text: `${c.id}${s}${Oe(c.id, i)}${i}`
    }];
  }
  return a.every((c) => c.shape[0] === s && c.shape[1] === i) ? [] : Et(a.map((c) => ({
    start: c.span.start,
    end: c.span.end,
    text: `${n}${s}${c.quoted ? `"${c.label}"` : Oe(c.label, i)}${i}${c.cls || ""}`
  })));
}
function Mr(e, t, n, s) {
  const i = e.edges[n];
  if (!i) return [];
  const r = i.arrow, a = _s(s);
  return r.mid ? s.trim() ? s.includes("|") || ur.some((d) => s.includes(d)) || s !== s.trim() ? [{ start: r.span.start, end: r.span.end, text: `${r.text}|${a}|` }] : [{ start: r.labelSpan.start, end: r.labelSpan.end, text: a }] : [{ start: r.span.start, end: r.span.end, text: r.text }] : s.trim() ? r.labelSpan ? [{ start: r.labelSpan.start, end: r.labelSpan.end, text: a }] : [{ start: r.span.end, end: r.span.end, text: `|${a}|` }] : r.pipeSpan ? [{ start: r.pipeSpan.start, end: r.pipeSpan.end, text: "" }] : [];
}
function ge(e, t) {
  return e[t.end] === `
` ? { start: t.start, end: t.end + 1, text: "" } : t.start > 0 && e[t.start - 1] === `
` ? { start: t.start - 1, end: t.end, text: "" } : { start: t.start, end: t.end, text: "" };
}
function pn(e, t, n, s = -1) {
  const i = [], r = /* @__PURE__ */ new Set();
  return e.arrows.forEach((a, c) => {
    if (!t.has(c)) return;
    const [d, u] = c === s ? [e.refs[c + 1], e.refs[c]] : [e.refs[c], e.refs[c + 1]];
    i.push(`${Ie(d)} ${kr(a)} ${Ie(u)}`), r.add(c), r.add(c + 1);
  }), e.refs.forEach((a, c) => {
    a.def && !r.has(c) && !(n && n.has(a.id)) && i.push(Ie(a));
  }), i.map((a) => e.indent + a).join(`
`);
}
function Et(e) {
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
function Ns(e, t, n) {
  if (!n.size) return [];
  const s = [...n], i = (a) => a - s.filter((c) => c < a).length, r = [];
  for (const a of e.statements) {
    if (!a.link) continue;
    const c = a.link.indices.filter((d) => !n.has(d)).map(i);
    if (!c.length) {
      r.push(ge(t, a));
      continue;
    }
    c.join(",") !== a.link.indices.join(",") && r.push({ start: a.link.span.start, end: a.link.span.end, text: c.join(",") });
  }
  return r;
}
function _r(e, t, n) {
  const s = [];
  for (const i of e.statements) {
    if (i.styleNode === n) {
      s.push(ge(t, i));
      continue;
    }
    if (!i.cls || !i.cls.ids.includes(n)) continue;
    const r = i.cls.ids.filter((a) => a !== n);
    s.push(r.length ? { start: i.cls.span.start, end: i.cls.span.end, text: r.join(",") } : ge(t, i));
  }
  return s;
}
function $r(e, t, n) {
  const s = e.edges[n];
  if (!s) return [];
  const i = e.statements[s.stmtIdx], r = Ns(e, t, /* @__PURE__ */ new Set([n]));
  if (i.arrows.length === 1)
    r.push(ge(t, i));
  else {
    const a = /* @__PURE__ */ new Set();
    i.arrows.forEach((c, d) => {
      d !== s.indexInStmt && a.add(d);
    }), r.push({ start: i.start, end: i.end, text: pn(i, a, null) });
  }
  return Et(r);
}
function Tr(e, t, n, s) {
  const i = e.edges[n];
  if (!i || i.arrow.text === s) return [];
  const r = i.arrow;
  if (r.mid) {
    const a = r.label ? `|${r.label.replace(/\|/g, "#124;")}|` : "";
    return [{ start: r.span.start, end: r.span.end, text: s + a }];
  }
  return [{ start: r.span.start, end: r.span.end, text: s }];
}
function Nr(e, t, n) {
  const s = e.edges[n];
  if (!s) return [];
  const i = e.statements[s.stmtIdx], r = new Set(i.arrows.map((a, c) => c));
  return [{
    start: i.start,
    end: i.end,
    text: pn(i, r, null, s.indexInStmt)
  }];
}
function Rr(e, t, { label: n = "新規ノード" } = {}) {
  const s = Cr(e.nodes), { at: i, prefix: r } = $s(e);
  return { edits: [{ start: i, end: i, text: `${r}${s}[${Oe(n, "]")}]` }], id: s };
}
function Ir(e, t, n, s, i = "") {
  const r = (d) => {
    const u = e.nodes.get(d);
    return u ? u.def ? u : { id: d, def: null } : { id: d, def: { raw: `${d}[新規ノード]` } };
  }, a = i ? `|${_s(i)}|` : "", c = $s(e);
  return {
    edits: [{
      start: c.at,
      end: c.at,
      text: `${c.prefix}${Ie(r(n))} -->${a} ${Ie(r(s))}`
    }]
  };
}
function Ar(e, t, n) {
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
      s.push(ge(t, d));
      continue;
    }
    const u = pn(d, c, /* @__PURE__ */ new Set([n]));
    s.push(u ? { start: d.start, end: d.end, text: u } : ge(t, d));
  }
  for (const a of e.statements)
    a.type === "node" && a.ref.id === n && s.push(ge(t, a));
  return s.push(..._r(e, t, n)), s.push(...Ns(e, t, r)), Et(s);
}
function Pr(e, t) {
  for (const n of e.statements)
    if (n.start <= t && t <= n.end) return { start: n.start, end: n.end };
  return null;
}
function Fr(e, t) {
  let n = e;
  for (const s of [...t].sort((i, r) => r.start - i.start))
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
  let s = null, i = null, r = null;
  for (const c of e.classList || [])
    c.startsWith("LS-") && (s = c.slice(3)), c.startsWith("LE-") && (i = c.slice(3));
  if (!(s && i && n.has(s) && n.has(i))) {
    const c = /[LE]-(.+)-(\d+)$/.exec(e.id || "") || /[LE]_(.+)_(\d+)$/.exec(e.id || "");
    if (!c) return null;
    r = parseInt(c[2], 10);
    const d = c[1], u = [];
    for (let p = 1; p < d.length; p++) {
      const g = d[p - 1];
      if (g !== "-" && g !== "_") continue;
      const y = d.slice(0, p - 1), k = d.slice(p);
      y && k && n.has(y) && n.has(k) && u.push([y, k]);
    }
    const f = u.filter(([p, g]) => t.edges.some((y) => y.from === p && y.to === g)), h = f.length ? f : u;
    if (h.length !== 1) return null;
    [s, i] = h[0];
  }
  const a = [];
  return t.edges.forEach((c, d) => {
    c.from === s && c.to === i && a.push(d);
  }), a.length ? a.length === 1 || r == null ? a[0] : a[Math.min(r, a.length - 1)] : null;
}
const Dr = [
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
], Br = [
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
], Pt = "|", Or = 'input, textarea, select, [contenteditable="true"], .monaco-editor';
function Hr(e, t, n = !1) {
  const s = e.querySelector(".mermaid-tools-status");
  s && (s.textContent = t, s.className = "mermaid-tools-status" + (n ? " error" : ""), setTimeout(() => {
    s.textContent === t && (s.textContent = "", s.className = "mermaid-tools-status");
  }, 6e3));
}
function qt(e, t, n, s = null) {
  if (e.querySelector(":scope > .mermaid-editbar")) return null;
  const i = fn(t.src);
  if (!i.supported)
    return Hr(e, `⚠ この図は編集できません（${i.reason}）`, !0), n.onExit?.(), null;
  e.classList.add("mermaid-editing");
  const r = { selected: null, arrowPick: null, busy: !1 }, a = document.createElement("div");
  a.className = "mermaid-editbar";
  const c = (m, w, x) => {
    const S = document.createElement("button");
    return S.type = "button", S.textContent = m, S.title = w, S.addEventListener("click", x), a.appendChild(S), S;
  }, d = c("ラベル編集", "選択中のノード/矢印のラベルを編集", Ni);
  c("➕ ノード", "ノードを追加（追加後にラベルを編集できます）", Ri);
  const u = c("➕ 矢印", "矢印を追加（始点→終点の順にノードをクリック）", Ii), f = c("⇄ 反転", "選択中の矢印の向きを入れ替える", Ai), h = document.createElement("select");
  h.className = "mermaid-arrow-kind", h.title = "選択中の矢印の線種を変える";
  for (const [m, w] of Dr) {
    const x = document.createElement("option");
    x.value = m, x.textContent = w, h.appendChild(x);
  }
  h.addEventListener("change", Pi), a.appendChild(h);
  const p = document.createElement("select");
  p.className = "mermaid-node-shape", p.title = "選択中のノードの形状を変える";
  for (const [m, w, x] of Br) {
    const S = document.createElement("option");
    S.value = m + Pt + w, S.textContent = x, p.appendChild(S);
  }
  p.addEventListener("change", Fi), a.appendChild(p);
  const g = c("削除", "選択中のノード/矢印を削除（Delete キーでも可。Ctrl+Z で戻せます）", Bn), y = document.createElement("span");
  y.className = "mermaid-edit-hint", a.appendChild(y), c("✓ 完了", "編集モードを終了（Esc でも可）", () => Te(!0)), e.appendChild(a);
  const k = (m) => {
    y.textContent = m;
  }, L = (m) => {
    if (![...h.options].some((w) => w.value === m)) {
      const w = document.createElement("option");
      w.value = m, w.textContent = m, h.appendChild(w);
    }
    h.value = m;
  }, v = (m) => {
    const [w, x] = m || ["[", "]"], S = w + Pt + x;
    if (![...p.options].some((T) => T.value === S)) {
      const T = document.createElement("option");
      T.value = S, T.textContent = `${w}…${x}`, p.appendChild(T);
    }
    p.value = S;
  }, b = () => {
    if (!n.reveal) return;
    const m = r.selected;
    if (!m) {
      n.reveal(null);
      return;
    }
    if (m.kind === "node") {
      const S = i.nodes.get(m.id), T = S?.def ? S.def.span : S?.firstRef?.span;
      n.reveal(T ? { line: Pr(i, T.start), focus: T } : null);
      return;
    }
    const w = i.edges[m.idx], x = w ? i.statements[w.stmtIdx] : null;
    n.reveal(w ? { line: x ? { start: x.start, end: x.end } : null, focus: w.arrow.span } : null);
  }, C = () => {
    const m = r.selected, w = m?.kind === "edge", x = m?.kind === "node";
    d.disabled = !m, g.disabled = !m, d.textContent = w ? "ラベル編集（矢印）" : "ラベル編集", f.classList.toggle("hidden", !w), h.classList.toggle("hidden", !w), p.classList.toggle("hidden", !x), u.classList.toggle("active", !!r.arrowPick), w && L(i.edges[m.idx]?.arrow.text || "-->"), x && v(i.nodes.get(m.id)?.def?.shape), r.arrowPick ? k(r.arrowPick.from ? `➕ 矢印: 始点 ${r.arrowPick.from} → 終点のノードをクリック（Escで中止）` : "➕ 矢印: 始点のノードをクリック（Escで中止）") : k(m ? m.kind === "node" ? `選択中: ノード ${m.id}（Delete で削除）` : "選択中: 矢印（Delete で削除）" : "クリック: 選択 ／ ダブルクリック: ラベル編集 ／ Esc: 終了"), b();
  };
  C();
  const _ = () => {
    e.querySelectorAll(".selected").forEach((m) => m.classList.remove("selected")), r.selected = null;
  }, A = (m) => [...e.querySelectorAll("g[id*='flowchart-']")].find((w) => nt(w.id, i.nodes) === m) || null, F = (m) => [...e.querySelectorAll("path.flowchart-link")].find((w) => st(w, i) === m) || null, E = (m, w) => {
    _(), r.selected = { kind: "node", id: m }, (w || A(m))?.classList.add("selected"), C();
  }, M = (m, w) => {
    _(), r.selected = { kind: "edge", idx: m }, (w || F(m))?.classList.add("selected"), C();
  }, I = () => {
    const m = r.selected;
    if (!m) return null;
    if (m.kind === "node") return { kind: "node", id: m.id };
    const w = i.edges[m.idx];
    return w ? { kind: "edge", from: w.from, to: w.to } : null;
  }, P = (m, { editNodeId: w = null, selection: x } = {}) => {
    if (r.busy || !m || !m.length) return;
    r.busy = !0, n.applyEdits(t.src, m, {
      editNodeId: w,
      selection: x === void 0 ? I() : x
    }) || Te(!1);
  }, W = e.querySelector(":scope > .mermaid-canvas") || e, V = (m, w) => {
    const x = W.getBoundingClientRect();
    return { x: m - x.left + W.scrollLeft, y: w - x.top + W.scrollTop };
  }, ae = (m) => {
    const w = m.getBoundingClientRect(), x = V(w.left, w.top);
    return { left: x.x, top: x.y, width: w.width, height: w.height };
  }, H = (m) => {
    try {
      const w = m.getTotalLength();
      if (!w) return null;
      const x = m.getPointAtLength(w / 2).matrixTransform(m.getScreenCTM());
      return { x: x.x, y: x.y };
    } catch {
      return null;
    }
  }, Fn = (m) => {
    if (!m) return { left: 8, top: 8, width: 180 };
    const w = V(m.x, m.y);
    return { left: w.x - 90, top: w.y - 14, width: 180 };
  }, Ti = (m, w) => {
    const x = A(m), S = A(w);
    if (!x || !S) return { left: 8, top: 8, width: 180 };
    const T = x.getBoundingClientRect(), Y = S.getBoundingClientRect();
    return Fn({
      x: (T.left + T.width / 2 + Y.left + Y.width / 2) / 2,
      y: (T.top + T.height / 2 + Y.top + Y.height / 2) / 2
    });
  }, $t = ({ left: m, top: w, width: x, value: S, placeholder: T }, Y) => {
    e.querySelectorAll(".mermaid-inline-input").forEach((ce) => ce.remove());
    const D = document.createElement("textarea");
    D.className = "mermaid-inline-input", D.rows = 1, D.value = S || "", T && (D.placeholder = T), D.style.left = `${Math.max(0, m)}px`, D.style.top = `${Math.max(0, w)}px`, D.style.width = `${Math.max(160, x)}px`, W.appendChild(D);
    const Ee = () => {
      D.style.height = "auto", D.style.height = `${D.scrollHeight}px`;
    };
    Ee(), D.focus(), D.select();
    let Ne = !1;
    const Nt = (ce) => {
      if (Ne) return;
      Ne = !0;
      const Bi = D.value;
      D.remove(), ce && Y(Bi);
    };
    D.addEventListener("keydown", (ce) => {
      ce.stopPropagation(), ce.key === "Enter" && !ce.shiftKey ? (ce.preventDefault(), Nt(!0)) : ce.key === "Escape" && Nt(!1);
    }), D.addEventListener("input", Ee), D.addEventListener("blur", () => Nt(!0));
  }, Tt = (m, w) => {
    const x = Zn(i.nodes.get(w)?.def?.label ?? ""), S = ae(m);
    $t({
      left: S.left,
      top: S.top,
      width: S.width + 24,
      value: x,
      placeholder: "ノードラベル（Shift+Enter で改行）"
    }, (T) => {
      T !== x && P(Lr(i, t.src, w, At(T)));
    });
  }, Dn = (m, w) => {
    const x = Zn(i.edges[m]?.arrow?.label || ""), S = Fn(w ? H(w) : null);
    $t(
      { ...S, value: x, placeholder: "矢印ラベル（Shift+Enter で改行・空で削除）" },
      (T) => {
        T !== x && P(Mr(i, t.src, m, At(T)));
      }
    );
  };
  function Ni() {
    const m = r.selected;
    if (m)
      if (m.kind === "node") {
        const w = A(m.id);
        w && Tt(w, m.id);
      } else
        Dn(m.idx, F(m.idx));
  }
  function Ri() {
    const { edits: m, id: w } = Rr(i, t.src, {});
    P(m, { editNodeId: w, selection: { kind: "node", id: w } });
  }
  function Ii() {
    r.arrowPick = r.arrowPick ? null : {}, _(), C();
  }
  function Ai() {
    const m = r.selected;
    if (m?.kind !== "edge") return;
    const w = i.edges[m.idx];
    w && P(
      Nr(i, t.src, m.idx),
      { selection: { kind: "edge", from: w.to, to: w.from } }
    );
  }
  function Pi() {
    const m = r.selected;
    m?.kind === "edge" && P(Tr(i, t.src, m.idx, h.value));
  }
  function Fi() {
    const m = r.selected;
    if (m?.kind !== "node") return;
    const [w, x] = p.value.split(Pt);
    P(Sr(i, t.src, m.id, w, x));
  }
  function Bn() {
    const m = r.selected;
    m && P(m.kind === "node" ? Ar(i, t.src, m.id) : $r(i, t.src, m.idx), { selection: null });
  }
  const Di = (m) => {
    const w = m.getBoundingClientRect(), x = w.left + w.width / 2, S = w.top + w.height / 2;
    let T = null, Y = 1 / 0;
    for (const D of e.querySelectorAll("path.flowchart-link")) {
      const Ee = H(D);
      if (!Ee) continue;
      const Ne = (Ee.x - x) ** 2 + (Ee.y - S) ** 2;
      Ne < Y && (Y = Ne, T = D);
    }
    return Y < 1600 ? T : null;
  }, On = (m) => {
    const w = m.target.closest("path.flowchart-link");
    if (w) return w;
    const x = m.target.closest(".edgeLabel");
    return x ? Di(x) : null;
  }, Hn = (m) => {
    if (m.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const w = m.target.closest("g[id*='flowchart-']");
    if (w) {
      const S = nt(w.id, i.nodes);
      if (!S) return;
      if (r.arrowPick) {
        if (!r.arrowPick.from)
          r.arrowPick = { from: S }, _(), w.classList.add("selected"), C();
        else {
          const T = r.arrowPick.from;
          r.arrowPick = null, _(), C(), $t(
            { ...Ti(T, S), value: "", placeholder: "矢印ラベル（空でも可・Shift+Enter で改行）" },
            (Y) => P(
              Ir(i, t.src, T, S, At(Y)).edits,
              { selection: { kind: "edge", from: T, to: S } }
            )
          );
        }
        return;
      }
      E(S, w);
      return;
    }
    const x = On(m);
    if (x) {
      const S = st(x, i);
      if (S != null) {
        M(S, x);
        return;
      }
      k("⚠️ この矢印はソースと対応付けできませんでした（特殊な記法の可能性）。");
      return;
    }
    !r.arrowPick && r.selected && (_(), C());
  }, jn = (m) => {
    if (m.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const w = m.target.closest("g[id*='flowchart-']");
    if (w) {
      m.preventDefault();
      const T = nt(w.id, i.nodes);
      T && Tt(w, T);
      return;
    }
    const x = On(m);
    if (!x) return;
    const S = st(x, i);
    S != null && (m.preventDefault(), M(S, x), Dn(S, x));
  }, Wn = (m) => {
    if (!e.isConnected) {
      Te(!1);
      return;
    }
    if (!m.target?.closest?.(Or)) {
      if (m.key === "Escape") {
        if (r.arrowPick) {
          r.arrowPick = null, _(), C();
          return;
        }
        Te(!0);
        return;
      }
      if ((m.key === "Delete" || m.key === "Backspace") && r.selected) {
        m.preventDefault(), Bn();
        return;
      }
      if ((m.ctrlKey || m.metaKey) && !m.altKey) {
        const w = m.key.toLowerCase();
        w === "z" && !m.shiftKey ? (m.preventDefault(), n.undo?.()) : (w === "y" || w === "z" && m.shiftKey) && (m.preventDefault(), n.redo?.());
      }
    }
  };
  e.addEventListener("click", Hn), e.addEventListener("dblclick", jn), document.addEventListener("keydown", Wn);
  function Te(m) {
    e.removeEventListener("click", Hn), e.removeEventListener("dblclick", jn), document.removeEventListener("keydown", Wn), e.classList.remove("mermaid-editing"), a.remove(), e.querySelectorAll(".mermaid-inline-input").forEach((w) => w.remove()), _(), n.reveal?.(null), m && n.onExit?.();
  }
  return s && requestAnimationFrame(() => {
    if (!e.isConnected || !a.isConnected) return;
    const m = s.selection;
    if (m?.kind === "node" && i.nodes.has(m.id))
      E(m.id);
    else if (m?.kind === "edge") {
      const w = i.edges.findIndex((x) => x.from === m.from && x.to === m.to);
      w >= 0 && M(w);
    }
    if (s.editNodeId) {
      const w = A(s.editNodeId);
      w && Tt(w, s.editNodeId);
    }
  }), () => Te(!1);
}
function jr(e) {
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
      const h = n[u];
      i.push({ start: d, end: h, content: e.slice(d, h) }), r = u;
      break;
    }
  }
  return i;
}
function Xn(e, t) {
  if (e.content === t) return { ...e, indent: "", toRaw: (f) => f };
  const n = e.content.split(`
`), s = t.split(`
`);
  if (n.length !== s.length) return null;
  const i = [], r = [];
  let a = 0, c = 0, d = "";
  for (let f = 0; f < n.length; f++) {
    const h = n[f].endsWith("\r") ? n[f].slice(0, -1) : n[f], p = s[f];
    if (!h.endsWith(p)) return null;
    const g = h.slice(0, h.length - p.length);
    if (/\S/.test(g)) return null;
    g && !d && (d = g), i.push(a + g.length), r.push(c), a += n[f].length + 1, c += p.length + 1;
  }
  return { ...e, indent: d, toRaw: (f) => {
    let h = 0, p = r.length - 1;
    for (; h < p; ) {
      const g = h + p + 1 >> 1;
      r[g] <= f ? h = g : p = g - 1;
    }
    return i[h] + (f - r[h]);
  } };
}
function Rs(e, t, n = 0) {
  const s = jr(e), i = s[n] ? Xn(s[n], t) : null;
  if (i) return i;
  for (const r of s) {
    const a = Xn(r, t);
    if (a) return a;
  }
  return null;
}
const K = window.markdownit ? window.markdownit({
  // html: false が最大の防御。AI の生成物と /api/web2md で取り込んだ外部ページを
  // innerHTML に入れる以上、生 HTML を通すわけにはいかない（<script> はエスケープされる）。
  // ここを true にするなら DOMPurify のベンダリングが必須になる。
  html: !1,
  linkify: !0,
  breaks: !1
}) : null, Ce = window.mermaid || null, Wr = () => K !== null;
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
if (K) {
  const e = K.renderer.rules.link_open || ((s, i, r, a, c) => c.renderToken(s, i, r));
  K.renderer.rules.link_open = (s, i, r, a, c) => (s[i].attrSet("target", "_blank"), s[i].attrSet("rel", "noopener noreferrer"), e(s, i, r, a, c));
  const t = K.renderer.rules.image;
  K.renderer.rules.image = (s, i, r, a, c) => {
    const d = s[i].attrGet("src");
    return d && s[i].attrSet("src", qr(d)), t(s, i, r, a, c);
  };
  const n = K.renderer.rules.fence;
  K.renderer.rules.fence = (s, i, r, a, c) => {
    const d = s[i];
    if (d.info.trim().toLowerCase() === "mermaid" && Ce)
      return `<pre class="mermaid-src"${Pe && d.map ? ` data-src-line="${d.map[0] + 1}" data-src-end="${d.map[1]}"` : ""}>
${Ft(d.content)}</pre>`;
    if (/^(?:yaml\s+)?mdflow-mapping$/i.test(d.info.trim())) {
      const u = /^diagram\s*:\s*(\S+)/m.exec(d.content);
      return `<details class="mdflow-mapping"><summary>⚙ ${u ? `条件マッピング: ${Ft(u[1])}` : "条件マッピング"}</summary><pre>${Ft(d.content)}</pre></details>`;
    }
    return n(s, i, r, a, c);
  }, K.inline.ruler.before("emphasis", "mark", (s, i) => {
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
  }), K.inline.ruler2.before("emphasis", "mark", (s) => {
    Jn(s, s.delimiters);
    for (const i of s.tokens_meta)
      i?.delimiters && Jn(s, i.delimiters);
    return !0;
  }), K.core.ruler.push("src_line", (s) => {
    if (Pe)
      for (const i of s.tokens)
        !i.map || i.nesting < 0 || i.type === "inline" || (i.attrSet("data-src-line", String(i.map[0] + 1)), i.attrSet("data-src-end", String(i.map[1])));
  });
}
function Jn(e, t) {
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
let Ae = "", Pe = !1;
function Ur(e) {
  Ae = e || "";
}
function qr(e) {
  if (/^(https?:|data:|blob:|\/)/i.test(e)) return e;
  const t = [];
  for (const n of `${Ae}/${e}`.split("/"))
    if (!(!n || n === ".")) {
      if (n === "..") {
        t.pop();
        continue;
      }
      t.push(n);
    }
  return "/api/asset?path=" + encodeURIComponent(t.join("/"));
}
function Ft(e) {
  return e.replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}
let et = 0;
const Re = /* @__PURE__ */ new Map(), Vr = 50, ut = /* @__PURE__ */ new WeakMap(), Qn = /* @__PURE__ */ new WeakMap(), tt = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3], it = /* @__PURE__ */ new WeakMap();
function Kr(e, t) {
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
function zr(e) {
  it.delete(e);
}
function Dt(e, t) {
  const n = tt.findIndex((i) => i >= e - 1e-6), s = n < 0 ? tt.length - 1 : n;
  return tt[Math.min(tt.length - 1, Math.max(0, s + t))];
}
function Is(e, t) {
  const n = e.querySelector("svg"), s = e.__mermaidNatural;
  if (!n || !s) return;
  n.style.width = `${Math.round(s.w * t)}px`, n.style.height = `${Math.round(s.h * t)}px`, n.style.maxWidth = "none";
  const i = e.querySelector(".mermaid-zoom-label");
  i && (i.textContent = `${Math.round(t * 100)}%`);
}
function Gr(e, t) {
  const n = document.createElement("span");
  n.className = "mermaid-zoom";
  const s = (a) => {
    t.set(a), Is(e, a);
  }, i = (a, c, d) => {
    const u = document.createElement("button");
    return u.type = "button", u.textContent = a, u.title = c, u.addEventListener("click", d), n.appendChild(u), u;
  };
  i("➖", "縮小（図の上で Ctrl+ホイールでも）", () => s(Dt(t.get(), -1)));
  const r = i("100%", "等倍に戻す", () => s(1));
  return r.className = "mermaid-zoom-label", i("➕", "拡大（図の上で Ctrl+ホイールでも）", () => s(Dt(t.get(), 1))), e.addEventListener("wheel", (a) => {
    a.ctrlKey && (a.preventDefault(), s(Dt(t.get(), a.deltaY < 0 ? 1 : -1)));
  }, { passive: !1 }), n;
}
function Yr(e, t) {
  Re.size >= Vr && Re.delete(Re.keys().next().value), Re.set(e, t);
}
let Vt = null;
function Zr(e) {
  Vt = e;
}
let Kt = null, He = null;
function Xr(e) {
  Kt = e;
}
function Jr(e) {
  He = e;
}
function Qr(e, t, n = null) {
  const s = rr(t.src, t.index || 0), i = document.createElement("div");
  i.className = "mermaid-tools";
  const r = document.createElement("span");
  r.className = "mermaid-tools-status";
  const a = async (f, h, p) => {
    const g = f.textContent;
    f.disabled = !0, f.textContent = "⏳", r.className = "mermaid-tools-status", r.textContent = "";
    try {
      r.textContent = await p() || h;
    } catch (y) {
      r.className = "mermaid-tools-status error", r.textContent = y?.message || String(y);
    } finally {
      f.disabled = !1, f.textContent = g;
      const y = r.textContent;
      setTimeout(() => {
        r.textContent === y && (r.textContent = "", r.className = "mermaid-tools-status");
      }, 6e3);
    }
  }, c = (f = zt()) => Ls(e.querySelector("svg"), { background: f });
  if (i.appendChild(r), n && e.__mermaidNatural && i.appendChild(Gr(e, n)), t.editable && Kt) {
    const { ok: f, reason: h } = yr(t.src), p = document.createElement("button");
    p.type = "button", p.title = f ? "この図を直接編集する（ノード/矢印の操作がMermaidソースへ反映される）" : `この図は直接編集できません（${h}）`, p.textContent = "編集", p.disabled = !f, f && p.addEventListener("click", () => Kt(e, t)), i.appendChild(p);
  }
  if (Vt) {
    const f = document.createElement("button");
    f.type = "button", f.title = "PNG にしてワークスペースへ保存する（同じ図は同じ名前へ書き直す）", f.textContent = "保存", f.addEventListener("click", () => a(f, "保存しました", async () => `✓ ${await Vt(await c(), s)}`)), i.appendChild(f);
  }
  const d = document.createElement("button");
  d.type = "button", d.title = "PNG をクリップボードへコピーする", d.textContent = "コピー", d.addEventListener("click", () => a(d, "コピーしました", async () => (await Gn(await c()), "✓ コピーしました"))), i.appendChild(d);
  const u = document.createElement("button");
  return u.type = "button", u.title = "白背景のPNGをクリップボードへコピーする（資料や白いスライド向け）", u.textContent = "白でコピー", u.addEventListener("click", () => a(u, "白背景でコピーしました", async () => (await Gn(await c(zt("white"))), "✓ 白背景でコピーしました"))), i.appendChild(u), i;
}
function zt(e = "theme") {
  return e === "white" ? "#ffffff" : getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#1e1e2a";
}
function es(e, t = {}, n = null) {
  const s = document.createElement("div");
  s.className = "mermaid-box";
  const i = document.createElement("div");
  i.className = "mermaid-canvas", i.innerHTML = e, s.appendChild(i);
  const r = i.querySelector("svg"), a = r?.getAttribute("viewBox")?.trim().split(/[\s,]+/), c = a?.length === 4 ? parseFloat(a[2]) : NaN, d = a?.length === 4 ? parseFloat(a[3]) : NaN;
  return Number.isFinite(c) && Number.isFinite(d) && (s.__mermaidNatural = { w: c, h: d }), r && s.prepend(Qr(s, t, n)), Is(s, n ? n.get() : 1), He && He(s, t), s;
}
async function eo(e, t, n) {
  if (!Ce) return;
  const s = n.mdflow || null, i = Qn.get(e) || /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  Qn.set(e, r);
  let a = -1;
  for (const c of e.querySelectorAll("pre.mermaid-src")) {
    if (a += 1, ut.get(e) !== t) return;
    const d = c.textContent, u = s ? to(d, s) : null;
    let f = u ? u.injected : d;
    const h = (b) => {
      c.dataset.srcLine && (b.dataset.srcLine = c.dataset.srcLine), c.dataset.srcEnd && (b.dataset.srcEnd = c.dataset.srcEnd), b.__mermaidMeta = p, c.replaceWith(b), u && b.after(no(u, s));
    }, p = { src: d, index: a, editable: !!n.editable }, g = i.get(a);
    if (g && g.src === d && g.renderSrc === f) {
      g.meta.index = a, r.set(a, g), h(g.box), He && He(g.box, g.meta, !0);
      continue;
    }
    const y = (b) => (r.set(a, { src: d, renderSrc: f, box: b, meta: p }), b), k = Kr(e, p), L = Re.get(f);
    if (L) {
      h(y(es(L, p, k)));
      continue;
    }
    let v;
    try {
      ({ svg: v } = await Ce.render(`pixie-mermaid-${et++}`, f));
    } catch (b) {
      if (document.getElementById(`dpixie-mermaid-${et - 1}`)?.remove(), u && f !== d)
        try {
          f = d, { svg: v } = await Ce.render(`pixie-mermaid-${et++}`, f);
        } catch {
          document.getElementById(`dpixie-mermaid-${et - 1}`)?.remove(), v = null;
        }
      else
        v = null;
      if (v == null) {
        c.classList.add("mermaid-error"), c.title = `Mermaid の構文エラー: ${b?.message || b}`;
        continue;
      }
    }
    if (Yr(f, v), ut.get(e) !== t) return;
    h(y(es(v, p, k)));
  }
}
function to(e, t) {
  if (!bs()) return null;
  const n = zi(e), s = Yi(t.doc.mappings, n);
  if (!s || !s.presets.length) return null;
  const i = t.conditions.get(n) || "";
  let r = {}, a = !1;
  if (i.trim())
    try {
      const p = JSON.parse(i);
      p && typeof p == "object" && !Array.isArray(p) ? r = p : a = !0;
    } catch {
      a = !0;
    }
  const c = t.doc.selected[n] || null, d = Qi(s, a ? {} : r, c);
  let u = e, f = [];
  d && ({ code: u, missing: f } = tr(
    e,
    d.activeNodes,
    d.style,
    "mdflowActive",
    d.inactiveStyle
  ));
  const h = {};
  if (xs(e)) {
    const p = new Set(ks(e));
    for (const g of s.presets) {
      const y = g.activeNodes.filter((k) => !p.has(k));
      y.length && (h[g.name] = y);
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
    missingByPreset: h
  };
}
function no(e, t) {
  const n = document.createElement("div");
  n.className = "mdflow-presets", n.dataset.diagram = e.diagramId;
  const s = document.createElement("div");
  s.className = "mdflow-presets-title", s.textContent = "条件プリセット", n.appendChild(s);
  const i = document.createElement("ul"), r = document.createElement("li");
  r.className = "mdflow-preset-item mdflow-auto", r.dataset.preset = "", r.textContent = "（条件で自動判定）", e.selectedName || r.classList.add("selected"), i.appendChild(r);
  for (const c of e.mapping.presets) {
    const d = document.createElement("li");
    d.className = "mdflow-preset-item", d.dataset.preset = c.name;
    const u = c.when || "（無条件）", f = e.missingByPreset?.[c.name] || [], h = [`when: ${u}`, `active_nodes: ${c.activeNodes.join(", ")}`];
    f.length && h.push(`図に存在しないノードID: ${f.join(", ")}`), d.title = h.join(`
`);
    const p = document.createElement("div");
    p.className = "mdflow-preset-body";
    const g = document.createElement("div");
    g.className = "mdflow-preset-name";
    const y = document.createElement("span");
    if (y.textContent = c.name, g.appendChild(y), f.length) {
      const L = document.createElement("span");
      L.className = "mdflow-warn-badge", L.textContent = "⚠", g.appendChild(L);
    }
    if (e.selectedName === c.name && d.classList.add("selected"), !e.selectedName && e.resolution?.auto && e.resolution.name === c.name) {
      d.classList.add("auto-hit");
      const L = document.createElement("span");
      L.className = "mdflow-badge", L.textContent = "自動", g.appendChild(L);
    }
    p.appendChild(g);
    const k = document.createElement("span");
    k.className = "mdflow-when", k.textContent = u, p.appendChild(k), d.appendChild(p), i.appendChild(d);
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
  if (!K) {
    e.classList.remove("md"), e.textContent = t;
    return;
  }
  e.classList.add("md");
  const s = Ae, i = Pe;
  n.assetBase != null && (Ae = n.assetBase || ""), Pe = !!n.sourceMap;
  try {
    e.innerHTML = K.render(t);
  } finally {
    n.assetBase != null && (Ae = s), Pe = i;
  }
  const r = (ut.get(e) || 0) + 1;
  return ut.set(e, r), eo(e, r, n);
}
function As(e, t) {
  e.classList.remove("md"), e.textContent = t;
}
let xe = null;
function rt() {
  return typeof window.TurndownService == "function";
}
function so() {
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
function io(e) {
  const t = so();
  if (!t) throw new Error("Turndown が未取得です（python -m pipenv run python scripts/fetch_turndown.py を実行してください）");
  return t.turndown(e);
}
const ro = 60;
let Gt = !0, ts = null;
function Ps() {
  const e = l("messages");
  return e && e !== ts && (ts = e, e.addEventListener("scroll", () => {
    Gt = oo(e);
  })), e;
}
function oo(e) {
  return e.scrollHeight - e.scrollTop - e.clientHeight <= ro;
}
function N(e, t, n = {}) {
  const s = document.createElement("div");
  s.className = "msg " + e;
  const i = document.createElement("div");
  return i.className = "body", e === "assistant" ? Ke(i, t, n) : As(i, t), s.appendChild(i), Ps().appendChild(s), Q(e === "user"), s;
}
function Fs(e, t) {
  if (!e || e.querySelector(".msg-del")) return;
  const n = document.createElement("button");
  n.className = "msg-del", n.type = "button", n.textContent = "削除", n.title = "この往復を削除（LLM の文脈からも消してコンテキストを節約する）", n.addEventListener("click", t), e.appendChild(n);
}
function ao(e, t) {
  if (!e || e.querySelector(".msg-rollback")) return;
  const n = document.createElement("button");
  n.className = "msg-rollback", n.type = "button", n.textContent = "戻す", n.title = "このターンで変更されたファイルを、ターンの前の状態へ戻す（以降のターンで同じファイルに加えられた変更も巻き戻る）", n.addEventListener("click", t), e.appendChild(n);
}
function O(e, t, n = {}) {
  let s = e.querySelector(".tool-log");
  s || (s = document.createElement("div"), s.className = "tool-log", e.insertBefore(s, e.querySelector(".body")));
  const i = document.createElement("div");
  i.className = "tool-status", n.category && i.classList.add("status-" + n.category), n.tool && (i.dataset.tool = n.tool), i.textContent = t, s.appendChild(i), Q();
}
function Q(e = !1) {
  const t = Ps();
  t && (e && (Gt = !0), Gt && (t.scrollTop = t.scrollHeight));
}
function Yt(e) {
  const t = e.indexOf("<think>");
  if (t < 0) return { think: "", visible: e };
  const n = e.lastIndexOf("</think>");
  return n < t ? { think: e.slice(t + 7), visible: e.slice(0, t) } : {
    think: e.slice(t + 7, n),
    visible: (e.slice(0, t) + e.slice(n + 8)).replace(/^\s+/, "")
  };
}
function Ds(e) {
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
      const g = t[a].trim();
      if (u === 0 && g === "```replace") {
        f = !0;
        break;
      }
      if (g === "```") {
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
      g.startsWith("```") && g.length > 3 && u++, d.push(t[a]);
    }
    if (!f) continue;
    const h = [];
    let p = -1;
    for (u = 0, a++; a < t.length; a++) {
      const g = t[a].trim();
      if (g === "```") {
        if (u > 0) {
          u--, h.push(t[a]);
          continue;
        }
        p = a, a++;
        break;
      }
      if (u === 0 && g === "```search") {
        p = a - 1;
        break;
      }
      g.startsWith("```") && g.length > 3 && u++, h.push(t[a]);
    }
    p < 0 || r.push({
      search: d.join(`
`),
      replace: h.join(`
`),
      start: n[c],
      end: i(p)
    });
  }
  return r;
}
function co(e) {
  return Ds(e).map(({ search: t, replace: n }) => ({ search: t, replace: n }));
}
function lo(e) {
  if (e = Yt(e).visible, !e.trim()) return "";
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
    if (i.length >= e.trim().length * 0.6) return uo(i);
  }
  return e.trim();
}
function uo(e) {
  return e.split(`
`).filter((t) => !/^(-|@@|---|\+\+\+)/.test(t)).map((t) => t.startsWith("+") || t.startsWith(" ") ? t.slice(1) : t).join(`
`).replace(/\n$/, "");
}
function ze() {
  return crypto.randomUUID && crypto.randomUUID() || "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
$.select(ze());
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
    return $.busy.value;
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
    return $.state.sessionId;
  },
  set sessionId(e) {
    $.select(e, $.state.phase === "switching" ? $.active : void 0);
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
}, B = () => o.mode === "note", Ge = () => o.mode === "plan", Fe = () => o.mode === "code";
let j = 0, ot = 0, te = !1, we = !1, Zt = !1, xt = null;
Oi(() => [dn.ready, $.busy.value], () => xt?.update());
const fo = {
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
}, kt = (e) => (e.split(".").pop() || "").toLowerCase(), mn = (e) => fo[kt(e)] || "plaintext", Bs = (e) => !!e && ["md", "markdown"].includes(kt(e)), po = () => "";
let Os = /* @__PURE__ */ new Set([".pptx", ".docx", ".xlsx", ".pdf"]);
const hn = (e) => Os.has("." + kt(e));
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
  }), o.noteDecorations = o.editor.createDecorationsCollection(), Lt(), o.editor.onDidChangeModelContent(() => {
    Zs(), kn(), ri();
  }), o.editor.onDidScrollChange(() => ai()), o.editor.onDidChangeCursorSelection(pi), o.editor.addCommand(e.KeyMod.CtrlCmd | e.KeyCode.KeyS, () => Jt()), o.editor.addCommand(
    e.KeyMod.CtrlCmd | e.KeyMod.Shift | e.KeyCode.KeyP,
    () => sn()
  ), o.editor.addCommand(e.KeyMod.Alt | e.KeyCode.LeftArrow, () => Qt()), o.editor.addCommand(e.KeyMod.Alt | e.KeyCode.RightArrow, () => en()), o.editor.addCommand(e.KeyMod.CtrlCmd | e.KeyCode.KeyE, () => tn()), o.editor.onMouseDown((n) => {
    B() && n.target.type === e.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && va(n.target.position.lineNumber);
  });
  const t = o.editor.getContainerDomNode();
  t.addEventListener("wheel", oi, { passive: !0, capture: !0 }), t.addEventListener("paste", (n) => {
    if (!B()) return;
    const s = ds(n.clipboardData);
    s && (n.preventDefault(), n.stopPropagation(), us(s));
  }, !0), t.addEventListener("dragover", (n) => {
    B() && n.dataTransfer?.types?.includes("Files") && (n.preventDefault(), n.stopPropagation());
  }, !0), t.addEventListener("drop", (n) => {
    if (!B() || !n.dataTransfer?.files?.length) return;
    n.preventDefault(), n.stopPropagation();
    const s = ds(n.dataTransfer);
    if (!s) {
      alert("⚠️ 貼り付けられるのは画像ファイルだけです。");
      return;
    }
    us(s);
  }, !0), mo();
});
async function mo() {
  Zr(na), Xr(ca), Jr(da);
  try {
    await Hs(), gn(), await Ct(), await G(), B() && await yn();
  } catch (e) {
    dt(e.message || "初期化中に問題が発生しました。設定を確認してください。");
  }
  try {
    uc(), Hi();
  } catch (e) {
    dt(e.message || "画面を準備できませんでした。設定を確認してください。");
  }
}
async function Hs() {
  try {
    Xt(await re("/api/mode"));
  } catch {
    Xt({ mode: "code", features: {} });
  }
}
const De = ["code", "plan", "note"], je = { code: "Code", plan: "Plan", note: "Note" };
function Xt(e) {
  o.mode = De.includes(e.mode) ? e.mode : "code", o.features = e.features || {}, Array.isArray(o.features.extract_exts) && (Os = new Set(o.features.extract_exts)), o.copilotEnabled = !!o.features.copilot;
}
function gn() {
  const e = B(), t = l("mode-btn");
  for (const n of De)
    document.body.classList.toggle("mode-" + n, o.mode === n), t.classList.toggle("mode-" + n, o.mode === n);
  t.textContent = je[o.mode], t.title = `現在: ${je[o.mode]} モード（クリックで次のモードへ切替）`, Ge() || Li(), o.editor?.updateOptions({ glyphMargin: e }), pi(), wn(), js(), Ye();
}
function js() {
  const e = l("code-style-btn"), t = o.codeStyle === "plan";
  e.textContent = t ? "計画を先に" : "通常", e.title = t ? "Codeモードの進め方: 計画を先に — まず実行計画を提示し、承認してから実装する（クリックで通常へ切替）" : "Codeモードの進め方: 通常 — エージェントが自律的に実装（破壊操作は承認制）。クリックで計画優先へ切替";
}
function ho() {
  o.codeStyle = o.codeStyle === "plan" ? "normal" : "plan", localStorage.setItem("pixie.codeStyle", o.codeStyle), js(), N("system", o.codeStyle === "plan" ? "計画を先に: エージェントはまず実行計画を提示し、承認してから実装します。" : "通常: エージェントが自律的に実装します（破壊操作は従来どおり承認制）。");
}
function wn() {
  xt?.update();
  const e = !!o.copilotEnabled, t = l("copilot-bar");
  t && t.classList.toggle("hidden", !e);
  const n = l("settings-copilot-controls");
  n && n.classList.toggle("hidden", !e);
  const s = {
    note: "文章について相談したいことを入力…",
    plan: "進め方を相談したいことを入力…",
    code: "相談したいこと、調べたいこと、変更したいことを入力…"
  };
  l("chat-input").placeholder = s[o.mode];
}
function Ws() {
  o.notes = [], o.noteDecorations?.clear(), o.refs = [], o.checkedRefs.clear(), o.checkedFiles.clear(), o.pendingTarget?.coll && o.pendingTarget.coll.clear(), o.pendingTarget = null, o.mdflowConditions.clear(), o.history = [], o.historyLoaded = !1, l("sel-chip").classList.add("hidden"), ue(), Ve();
}
async function go() {
  const e = De[(De.indexOf(o.mode) + 1) % De.length];
  await vn(e, { confirm: !0 });
}
async function vn(e, t = {}) {
  if (o.streaming)
    return alert("⚠️ 実行中はモードを切り替えられません。中断してから切り替えてください。"), !1;
  if (e === o.mode) return !0;
  if (t.confirm && !confirm(`${je[e]} モードに切り替えますか？
（会話セッションはリセットされます）`)) return !1;
  const n = $.begin("switching");
  if (!n) return;
  let s = "";
  try {
    await Mt();
    let i;
    try {
      i = await R("/api/mode", { mode: e });
    } catch (r) {
      return s = r.message, alert("⚠️ モードを切り替えられません: " + r.message), !1;
    }
    return Xt(i), t.keepMessages || (l("messages").innerHTML = ""), l("approval").classList.add("hidden"), l("approval").innerHTML = "", o.assistantEl = null, o.sessionId = ze(), $e(), Ws(), gn(), await G(), B() ? (await yn(), o.currentFile && (await $n(), await Nn()), N("system", "Noteモードに切り替えました（読み取り専用エージェント・クリック反映）。")) : Ge() ? N("system", "Planモードに切り替えました（調べて実行計画を立てるだけ。承認するまでファイルは変更されません）。") : N("system", "Codeモードに切り替えました（自律エージェント・破壊操作は承認制）。"), !0;
  } catch (i) {
    return s = i.message, alert(i.message), !1;
  } finally {
    $.finish(n, s);
  }
}
async function yn() {
  o.history = [], o.historyLoaded = !1, l("messages").innerHTML = "";
  let e;
  try {
    e = await re("/api/chat/history");
  } catch (s) {
    O(N("assistant", ""), `⚠️ 履歴を読み込めませんでした（${s.message}）。この保存先の履歴は、取り違えを防ぐため今回は保存しません。`);
    return;
  }
  let t = null, n = "";
  for (const s of e.messages || []) {
    o.history.push({ role: s.role, content: s.content });
    const i = N(s.role, s.content, { assetBase: Ze() });
    if (s.role === "user") {
      t = i, n = s.content;
      continue;
    }
    i._exchange = { userEl: t, userText: n }, Fs(i, () => vi(i, 0)), t = null, n = "";
  }
  o.historyLoaded = !0;
}
async function bn() {
  if (o.historyLoaded)
    try {
      const e = await R("/api/chat/history", { messages: o.history });
      Array.isArray(e.messages) && (o.history = e.messages);
    } catch {
    }
}
async function wo() {
  if (o.streaming) {
    alert("⚠️ 応答の生成中は履歴を消去できません。");
    return;
  }
  if (confirm("この保存先の会話履歴を消去しますか？")) {
    try {
      await Z("/api/chat/history", { method: "DELETE" });
    } catch (e) {
      alert("⚠️ 履歴を消去できません: " + e.message);
      return;
    }
    o.history = [], o.historyLoaded = !0, l("messages").innerHTML = "";
  }
}
async function Ct() {
  try {
    const e = await re("/api/status");
    dt(e.ready ? "" : e.error || "エンジンを起動できませんでした。設定を確認してください。");
    const t = e.ready ? e.model || "(未設定)" : "起動失敗";
    if (l("model-name").textContent = t.split(/[\\/]/).pop() || t, l("model-name").title = t, !e.ready) {
      l("agent-status").textContent = "  ⚠ " + (e.error || "engine not ready");
      return;
    }
    l("agent-status").textContent = "", Us(e.workspace);
  } catch (e) {
    dt(e.message || "状態を取得できませんでした。設定を確認してください。"), l("model-name").textContent = "接続不可";
  }
}
function Us(e) {
  if (!e) return;
  const t = l("root-path");
  t.textContent = e, t.title = e;
  const n = e.split(/[\\/]/).filter(Boolean).pop() || e;
  l("root-project-name").textContent = n || "(未設定)", l("root-project-btn").title = "ルートプロジェクト: " + e + "（クリックで変更）";
}
const En = (e) => e.includes("/") ? e.slice(0, e.lastIndexOf("/")) : "";
function qs(e, t) {
  const n = new Set((t.files || []).map((s) => s.path));
  for (const s of [...o.fsMap.keys()])
    En(s) === e && !n.has(s) && vo(s);
  for (const s of t.files || []) {
    const i = o.fsMap.get(s.path);
    i ? (i.size = s.size, i.text = s.text) : o.fsMap.set(s.path, { ...s, loaded: s.type === "dir" ? !1 : void 0 });
  }
  for (const s of t.files || [])
    s.type === "dir" && !o.knownDirs.has(s.path) && (o.knownDirs.add(s.path), o.collapsedDirs.add(s.path));
  t.truncated && (o.treeTruncated = !0);
}
async function ft(e) {
  const t = j, n = await z("/api/files/list?path=" + encodeURIComponent(e || ""));
  return !n || t !== j ? !1 : (qs(e, n), !0);
}
function vo(e) {
  for (const t of [...o.fsMap.keys()])
    (t === e || t.startsWith(e + "/")) && (o.fsMap.delete(t), o.checkedFiles.delete(t));
}
async function G() {
  const e = j;
  o.treeTruncated = !1;
  const t = await z("/api/files/list?path=");
  if (!(!t || e !== j)) {
    Us(t.root), qs("", t);
    for (const [n, s] of [...o.fsMap])
      s.type === "dir" && s.loaded && n && await ft(n);
    Ye();
  }
}
function yo(e) {
  if (!e) return !1;
  let t = "";
  for (const n of e.split("/"))
    if (t = t ? t + "/" + n : n, o.collapsedDirs.has(t)) return !0;
  return !1;
}
async function bo(e) {
  const t = String(e || "").split("/");
  let n = "";
  for (const s of t.slice(0, -1)) {
    n = n ? n + "/" + s : s, o.fsMap.has(n) || await ft(En(n));
    const i = o.fsMap.get(n);
    i && i.type === "dir" && !i.loaded && await ft(n) && (i.loaded = !0), o.collapsedDirs.delete(n);
  }
}
function Ye() {
  const e = l("file-list");
  e.innerHTML = "";
  const t = [...o.fsMap.values()].filter((n) => !yo(En(n.path))).sort((n, s) => n.path < s.path ? -1 : n.path > s.path ? 1 : 0);
  for (const n of t) {
    const s = n.path.split("/"), i = document.createElement("li");
    i.dataset.path = n.path, i.dataset.type = n.type, i.style.paddingLeft = 8 + (s.length - 1) * 16 + "px", Eo(i, n);
    const r = document.createElement("span"), a = document.createElement("span");
    if (a.className = "fname", a.textContent = s[s.length - 1], n.type === "dir")
      i.classList.add("dir"), r.textContent = o.collapsedDirs.has(n.path) ? "▸" : "▾", i.append(r, a), i.addEventListener("click", async () => {
        o.collapsedDirs.has(n.path) ? (o.collapsedDirs.delete(n.path), n.loaded || await ft(n.path) && (n.loaded = !0)) : o.collapsedDirs.add(n.path), Ye();
      });
    else {
      if (!Ge())
        if (n.text || hn(n.path)) {
          const c = document.createElement("input");
          c.type = "checkbox", c.title = n.text ? "チャットのコンテキストに含める" : "チャットのコンテキストに含める（テキスト抽出して同梱。/copilot では原本を Copilot に添付）", c.checked = o.checkedFiles.has(n.path), c.addEventListener("click", (d) => d.stopPropagation()), c.addEventListener("change", () => {
            c.checked ? o.checkedFiles.add(n.path) : o.checkedFiles.delete(n.path);
          }), i.appendChild(c);
        } else {
          const c = document.createElement("span");
          c.className = "cb-pad", i.appendChild(c);
        }
      if (r.textContent = n.text ? "" : po(n.path), a.title = n.text ? n.path : `${n.path}（クリックで既定アプリで開く）`, i.append(r, a), i.classList.toggle("active", n.path === o.currentFile), o.changedPaths.has(n.path)) {
        i.classList.add("changed");
        const c = document.createElement("span");
        c.className = "changed-badge", c.textContent = "● 変更", i.appendChild(c);
      }
      i.addEventListener("click", () => n.text ? oe(n.path) : Ys(n.path));
    }
    i.addEventListener("contextmenu", (c) => {
      c.preventDefault(), Co(c, n);
    }), e.appendChild(i);
  }
  l("files-trunc").classList.toggle("hidden", !o.treeTruncated);
}
let se = null;
function Eo(e, t) {
  e.draggable = !0, e.addEventListener("dragstart", (n) => {
    se = t.path, n.dataTransfer.setData("text/plain", t.path), n.dataTransfer.effectAllowed = "move", e.classList.add("dragging");
  }), e.addEventListener("dragend", () => {
    se = null, e.classList.remove("dragging"), document.querySelectorAll("#file-list li.drop-target").forEach((n) => n.classList.remove("drop-target"));
  }), t.type === "dir" && (e.addEventListener("dragover", (n) => {
    const s = se;
    s === null || s === t.path || t.path.startsWith(s + "/") || (n.preventDefault(), n.dataTransfer.dropEffect = "move", e.classList.add("drop-target"));
  }), e.addEventListener("dragleave", () => e.classList.remove("drop-target")), e.addEventListener("drop", (n) => {
    n.preventDefault(), n.stopPropagation(), e.classList.remove("drop-target");
    const s = n.dataTransfer.getData("text/plain") || se;
    s && s !== t.path && Gs(s, t.path);
  }));
}
function xo() {
  const e = l("file-list");
  e.addEventListener("dragover", (t) => {
    se !== null && (t.target.closest("li") || (t.preventDefault(), t.dataTransfer.dropEffect = "move", e.classList.add("drop-root")));
  }), e.addEventListener("dragleave", (t) => {
    e.contains(t.relatedTarget) || e.classList.remove("drop-root");
  }), e.addEventListener("drop", (t) => {
    if (e.classList.remove("drop-root"), t.target.closest("li")) return;
    t.preventDefault();
    const n = t.dataTransfer.getData("text/plain") || se;
    n && Gs(n, "");
  });
}
function We() {
  l("fs-menu")?.remove();
}
function ko(e, t, n) {
  We();
  const s = document.createElement("div");
  s.id = "fs-menu";
  for (const r of n) {
    const a = document.createElement("div");
    a.className = r.onClick ? "fs-menu-item" : "fs-menu-head", a.textContent = r.label, r.title && (a.title = r.title), r.onClick && a.addEventListener("click", () => {
      We(), r.onClick();
    }), s.appendChild(a);
  }
  s.style.left = "0px", s.style.top = "0px", document.body.appendChild(s);
  const i = s.getBoundingClientRect();
  return s.style.left = Math.max(4, Math.min(e, window.innerWidth - i.width - 4)) + "px", s.style.top = Math.max(4, Math.min(t, window.innerHeight - i.height - 4)) + "px", s;
}
function Vs(e, t) {
  const n = e.getBoundingClientRect();
  return ko(n.left, n.bottom + 4, t);
}
function Co(e, t) {
  We();
  const n = document.createElement("div");
  n.id = "fs-menu";
  const s = (i, r) => {
    const a = document.createElement("div");
    a.className = "fs-menu-item", a.textContent = i, a.addEventListener("click", () => {
      We(), r();
    }), n.appendChild(a);
  };
  t.type === "dir" ? (s("中に新規ファイル", () => pt("file", t.path + "/")), s("中に新規フォルダ", () => pt("dir", t.path + "/"))) : t.text || s("↗ 既定のアプリで開く", () => Ys(t.path)), s("名前変更・移動", () => Lo(t)), s("削除", () => So(t)), n.style.left = e.pageX + "px", n.style.top = e.pageY + "px", document.body.appendChild(n);
}
async function xn(e, t) {
  try {
    return await R(e, t), !0;
  } catch (n) {
    return alert("⚠️ " + n.message), !1;
  }
}
async function pt(e, t = "") {
  const s = prompt(e === "dir" ? "新規フォルダ名（例: src/utils）" : "新規ファイル名（例: src/main.py）", t);
  if (!s || !s.trim() || s.trim() === t.trim()) return;
  const i = s.trim().replace(/\\/g, "/");
  await xn("/api/fs/create", { path: i, kind: e }) && (e === "dir" && o.collapsedDirs.delete(i), await G(), e === "file" && await oe(i));
}
async function Lo(e) {
  const t = prompt("新しいパス（フォルダに入れるには src/名前.py のように）", e.path);
  !t || !t.trim() || t.trim() === e.path || await Ks(e, t.trim().replace(/\\/g, "/"));
}
async function Ks(e, t) {
  if (!t || t === e.path) return;
  if (e.type === "dir" && (t === e.path || t.startsWith(e.path + "/"))) {
    alert("⚠️ フォルダを自分自身の中へは移動できません。");
    return;
  }
  if (!await xn("/api/fs/rename", { src: e.path, dst: t })) return;
  const n = (s) => s === e.path ? t : e.type === "dir" && s.startsWith(e.path + "/") ? t + s.slice(e.path.length) : s;
  if (o.currentFile) {
    const s = n(o.currentFile);
    s !== o.currentFile && (o.currentFile = s, l("current-file").textContent = s, ys(s, o.dirty));
  }
  o.checkedFiles = new Set([...o.checkedFiles].map(n)), zs(n), await G();
}
function zs(e) {
  const t = (n) => {
    const s = [];
    for (const i of n) {
      const r = e(i);
      r && r !== s[s.length - 1] && s.push(r);
    }
    return s;
  };
  o.navBack = t(o.navBack), o.navFwd = t(o.navFwd), o.navRecent = [...new Set(t(o.navRecent))], Me();
}
async function Gs(e, t) {
  const n = o.fsMap.get(e);
  if (!n) return;
  const s = e.split("/").pop(), i = t ? t + "/" + s : s;
  i !== e && e.split("/").slice(0, -1).join("/") !== t && await Ks(n, i);
}
async function So(e) {
  confirm(`「${e.path}」を削除しますか？`) && await xn("/api/fs/delete", { path: e.path }) && (o.checkedFiles.delete(e.path), zs((t) => t === e.path ? null : t), o.currentFile === e.path && (o.currentFile = null, o.baseMtime = null, o.editor.setValue(""), Lt(), q(), l("current-file").textContent = "（ファイル未選択）", _e(), Me(), B() && (await $n(), await Nn())), await G());
}
async function Ys(e) {
  try {
    await R("/api/fs/open", { path: e });
  } catch (t) {
    alert("⚠️ 開けませんでした: " + t.message);
  }
}
async function oe(e, t, n = "push") {
  if (te) return;
  const s = ++ot, i = j, r = o.editor.getModel(), a = r.getVersionId(), c = () => s === ot && i === j && !te && o.editor.getModel() === r && r.getVersionId() === a;
  if (t || await Mt(), !c() || o.dirty && !t && !confirm("未保存の変更があります。破棄して開きますか？"))
    return;
  const d = await z("/api/file?path=" + encodeURIComponent(e));
  !d || !c() || (n === "push" && o.currentFile && o.currentFile !== e && (o.navBack.push(o.currentFile), o.navFwd.length = 0), No(e), o.currentFile = e, o.baseMtime = d.mtime ?? null, o.conflictDeclined = !1, o.mdflowConditions.clear(), la(), zr(l("preview")), o.monaco.editor.setModelLanguage(o.editor.getModel(), mn(e)), o.editor.setValue(d.content), o.saveError = null, Lt(), q(), l("current-file").textContent = e, t || un("editor"), _e(), Me(), Ln(), await bo(e), !(s !== ot || i !== j) && (Ye(), B() && (await $n(), await Nn())));
}
let ns = null;
function Lt() {
  o.savedVersionId = o.editor.getModel().getAlternativeVersionId(), o.dirty = !1;
}
function Zs() {
  o.currentFile && (o.dirty = o.editor.getModel().getAlternativeVersionId() !== o.savedVersionId, q());
}
function q(e) {
  const t = l("save-state");
  if (ys(o.currentFile, o.dirty), clearTimeout(ns), t.classList.remove("save-error"), t.title = "", e === "saving") {
    t.textContent = "保存中…";
    return;
  }
  if (e === "saved") {
    t.textContent = "保存済", ns = setTimeout(q, 1500);
    return;
  }
  if (o.saveError) {
    t.textContent = "⚠️ 保存失敗", t.classList.add("save-error"), t.title = o.saveError.message;
    return;
  }
  t.textContent = o.dirty ? "● 未保存" : "";
}
async function St() {
  if (Zt || te) return !1;
  for (; o.savePromise; ) await o.savePromise;
  if (!o.currentFile || te) return !1;
  o.savePromise = Mo();
  try {
    return await o.savePromise;
  } finally {
    o.savePromise = null;
  }
}
async function Mo() {
  const e = o.currentFile, t = o.editor.getValue(), n = o.editor.getModel().getAlternativeVersionId(), s = !o.fsMap.has(e), i = B();
  let r = null;
  i && (_t(), r = o.notes.map((d) => ({ ...d }))), clearTimeout(Ue), o.saving = !0, q("saving");
  const a = o.currentFile === e ? o.baseMtime : null;
  let c;
  try {
    c = await R("/api/file", { path: e, content: t, base_mtime: a });
  } catch (d) {
    const u = d instanceof ne ? d : new ne(String(d), 0);
    if (u.status === 409) {
      const f = await $o(e, t);
      if (f) c = f;
      else
        return o.conflictDeclined = !0, o.saveError = new ne(
          "外部の変更があるため保存を見送りました（保存ボタン／Ctrl+S でもう一度判断できます）。",
          409
        ), q(), !1;
    } else
      return o.saveError = u, q(), !1;
  } finally {
    o.saving = !1;
  }
  if (o.currentFile === e && (o.baseMtime = c?.mtime ?? o.baseMtime), o.currentFile === e && (o.savedVersionId = n, Zs()), s && await G(), i)
    try {
      await Tn(e, r);
    } catch (d) {
      return o.saveError = new ne(`本文は保存しましたが、付箋の保存に失敗しました: ${d.message}`, 0), q(), !0;
    }
  return o.saveError = null, o.conflictDeclined = !1, q("saved"), !0;
}
function Jt() {
  return o.conflictDeclined = !1, St();
}
const _o = 2e3;
let Ue = null;
function kn() {
  clearTimeout(Ue), !(we || te) && B() && (o.conflictDeclined || !o.currentFile || !o.dirty || (Ue = setTimeout(() => {
    if (o.dirty) {
      if (o.saving) {
        kn();
        return;
      }
      St();
    }
  }, _o)));
}
async function Mt() {
  clearTimeout(Ue), !we && B() && (o.conflictDeclined || o.currentFile && o.dirty && await St());
}
async function $o(e, t) {
  if (!confirm(
    `⚠️ ${e} は、開いた後に別の場所（他のエディタ・エージェント）で変更されています。

［OK］ この内容で上書きする
　　　相手の変更は 🕰 履歴 から元に戻せます。

［キャンセル］ 上書きしない
　　　手元の内容はエディタに残ります。相手の変更を見てから決められます。`
  )) return null;
  try {
    return await R("/api/file", { path: e, content: t, base_mtime: null, force: !0 });
  } catch (s) {
    return o.saveError = s instanceof ne ? s : new ne(String(s), 0), q(), null;
  }
}
const To = 15;
function No(e) {
  o.navRecent = [e, ...o.navRecent.filter((t) => t !== e)].slice(0, To);
}
function Ro() {
  o.navBack.length = 0, o.navFwd.length = 0, o.navRecent.length = 0, Me();
}
function Me() {
  l("nav-back").disabled = !o.navBack.length, l("nav-fwd").disabled = !o.navFwd.length, l("recent-btn").disabled = o.navRecent.length < 2, l("history-btn").disabled = !o.currentFile;
  const e = o.navBack[o.navBack.length - 1];
  l("nav-back").title = e ? `戻る: ${e} (Alt+←)` : "戻る (Alt+←)";
  const t = o.navFwd[o.navFwd.length - 1];
  l("nav-fwd").title = t ? `進む: ${t} (Alt+→)` : "進む (Alt+→)";
}
async function Xs(e, t) {
  if (!t.length) return;
  const n = t[t.length - 1], s = o.currentFile;
  await oe(n, !1, "none"), o.currentFile === n && (t.pop(), s && e.push(s), Me());
}
const Qt = () => Xs(o.navFwd, o.navBack), en = () => Xs(o.navBack, o.navFwd);
function tn() {
  const e = o.navRecent.filter((t) => t !== o.currentFile).map((t) => ({ label: t, title: t, onClick: () => oe(t) }));
  e.length && Vs(l("recent-btn"), [{ label: "最近開いたファイル" }, ...e]);
}
let qe = null;
async function Io() {
  o.currentFile && (qe = null, l("hist-file").textContent = o.currentFile, l("hist-preview").textContent = "", l("hist-preview-head").textContent = "左の版を選ぶと内容が出ます。", l("hist-restore").disabled = !0, l("hist-modal").classList.remove("hidden"), await Ao());
}
function at() {
  l("hist-modal").classList.add("hidden");
}
async function Ao() {
  const e = o.currentFile, t = await z("/api/history?path=" + encodeURIComponent(e)), n = l("hist-list");
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
      r.textContent = Js(s.saved_at);
      const a = document.createElement("span");
      a.className = "hint", a.textContent = `${s.size.toLocaleString()} B`, i.append(r, a), i.addEventListener("click", () => Po(e, s, i)), n.appendChild(i);
    }
  }
}
function Js(e) {
  if (!e) return "(不明)";
  const t = new Date(e);
  if (isNaN(t)) return e;
  const n = (s) => String(s).padStart(2, "0");
  return `${t.getMonth() + 1}/${t.getDate()} ${n(t.getHours())}:${n(t.getMinutes())}:${n(t.getSeconds())}`;
}
async function Po(e, t, n) {
  for (const i of l("hist-list").children) i.classList.remove("active");
  n.classList.add("active"), qe = t.id, l("hist-restore").disabled = !0, l("hist-preview-head").textContent = "読み込み中…";
  const s = await z(
    `/api/history/file?path=${encodeURIComponent(e)}&version_id=${encodeURIComponent(t.id)}`
  );
  !s || qe !== t.id || (l("hist-preview").textContent = s.content, l("hist-preview-head").textContent = `${Js(t.saved_at)} の内容`, l("hist-restore").disabled = !1);
}
async function Fo() {
  const e = o.currentFile;
  if (!(!e || !qe) && confirm(`${e} をこの版に戻します。
今の内容も履歴に積まれるので、戻し間違えてもやり直せます。`)) {
    try {
      await R("/api/history/restore", { path: e, version_id: qe });
    } catch (t) {
      alert("⚠️ 復元に失敗: " + t.message);
      return;
    }
    at(), await oe(e, !0, "none"), q("saved");
  }
}
let U = { favorites: [], recent: [], current: "" };
async function Qs() {
  const e = await z("/api/workspace/places");
  return e && (U = e), U;
}
const ei = (e) => U.favorites.some((t) => Do(t.path, e)), Do = (e, t) => String(e || "").replace(/[\\/]+$/, "").toLowerCase() === String(t || "").replace(/[\\/]+$/, "").toLowerCase();
async function Bo() {
  await Qs();
  const e = [], t = (n, s) => n.map((i) => ({
    label: `${s} ${i.name}${i.exists ? "" : "（見つかりません）"}`,
    title: i.path,
    onClick: i.exists ? () => An(i.path) : void 0
  }));
  U.favorites.length && e.push({ label: "お気に入り" }, ...t(U.favorites, "⭐")), U.recent.length && e.push({ label: "最近使ったフォルダ" }, ...t(U.recent, "🕘")), e.push({ label: "フォルダを選ぶ…", onClick: ln }), !U.favorites.length && !U.recent.length && e.unshift({ label: "行き先はまだありません（フォルダを移動すると溜まります）" }), Vs(l("places-btn"), e);
}
function ti() {
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
      u.className = "place-go", u.textContent = `${i} ${c.name}`, u.title = c.exists ? `${c.path}（クリックでここへ移動）` : `${c.path}（見つかりません）`, u.disabled = !c.exists, u.addEventListener("click", () => An(c.path));
      const f = document.createElement("button");
      f.className = "place-mini", f.textContent = "開く", f.title = "移動せずに中を見る", f.disabled = !c.exists, f.addEventListener("click", () => Se(c.path));
      const h = document.createElement("button");
      h.className = "place-mini", h.textContent = r ? "★" : "☆", h.title = r ? "お気に入りから外す" : "お気に入りに入れる", h.addEventListener("click", () => ni(c.path, c.name)), d.append(u, f, h), e.appendChild(d);
    }
  };
  t("⭐ お気に入り", U.favorites, "⭐", !0), t("🕘 最近使ったフォルダ", U.recent, "🕘", !1), !U.favorites.length && !U.recent.length && (e.innerHTML = "<div class='hint'>よく使うフォルダは ☆ ボタンでお気に入りに入れておくと、次からここに出ます。</div>");
}
async function ni(e, t) {
  if (e) {
    try {
      ei(e) ? U = await Z(
        "/api/workspace/favorites?path=" + encodeURIComponent(e),
        { method: "DELETE" }
      ) : U = await R("/api/workspace/favorites", { path: e, name: t || "" });
    } catch (n) {
      alert("⚠️ " + n.message);
      return;
    }
    ti(), Cn();
  }
}
function Cn() {
  const e = l("root-input").value.trim(), t = l("root-fav-btn"), n = !!e && ei(e);
  t.textContent = n ? "★" : "☆", t.title = n ? "お気に入りから外す" : "このフォルダをお気に入りに入れる", t.disabled = !e;
}
const Oo = 150, Ho = 600;
let ss = null, si = 0;
const ee = () => !l("preview").classList.contains("hidden"), Ze = () => o.currentFile && o.currentFile.includes("/") ? o.currentFile.slice(0, o.currentFile.lastIndexOf("/")) : "";
function _e() {
  const e = Bs(o.currentFile);
  l("preview-btn").disabled = !e, l("preview-btn").title = e ? "Markdown プレビューを表示 (Ctrl+Shift+P)" : "Markdown ファイル（.md）を開いているときだけ使えます";
  const t = l("richcopy-btn");
  t.disabled = !(e && ee()), t.title = e && ee() ? "プレビューの内容をリッチテキスト（HTML）とMarkdownでコピー。Confluence 等に貼り付け可" : "Markdown プレビュー表示中に使えます", !e && ee() && fi();
}
function ii() {
  const e = o.editor.getValue();
  let t = e, n = 0;
  const s = {};
  if (B() && o.features.mdflow && bs())
    try {
      const i = Gi(e);
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
function Ln() {
  if (!ee()) return;
  Ur(Ze());
  const { text: e, opts: t, lineOffset: n } = ii();
  t.editable = !0, t.sourceMap = !0, gt = n;
  const s = performance.now(), i = Ke(l("preview"), e, t);
  ai(), Promise.resolve(i).then(() => {
    si = performance.now() - s;
  });
}
function jo() {
  l("preview").addEventListener("click", (e) => {
    const t = e.target.closest(".mdflow-preset-item");
    if (!t) return;
    const n = t.closest(".mdflow-presets")?.dataset.diagram;
    if (!n) return;
    const s = t.dataset.preset || null, i = sr(o.editor.getValue(), n, s);
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
    n && (o.mdflowConditions.set(n, t.value), ri());
  });
}
function ri() {
  if (!ee()) return;
  clearTimeout(ss);
  const e = Math.min(
    Ho,
    Math.max(Oo, Math.round(si))
  );
  ss = setTimeout(Ln, e);
}
const Wo = 120;
let mt = "", is = null;
function Sn(e) {
  mt = e, clearTimeout(is), is = setTimeout(() => {
    mt = "";
  }, Wo);
}
const Uo = 200;
let ht = !1, rs = null;
function oi() {
  ht = !0, clearTimeout(rs), rs = setTimeout(() => {
    ht = !1;
  }, Uo);
}
function ai() {
  if (ht || !ee() || mt === "preview") return;
  const e = o.editor, t = e.getScrollHeight() - e.getLayoutInfo().height, n = t > 0 ? e.getScrollTop() / t : 0, s = l("preview");
  Sn("editor"), s.scrollTop = n * (s.scrollHeight - s.clientHeight);
}
function qo() {
  if (ht || !ee() || mt === "editor" || !o.editor) return;
  const e = l("preview"), t = e.scrollHeight - e.clientHeight, n = t > 0 ? e.scrollTop / t : 0, s = o.editor;
  Sn("preview"), s.setScrollTop(n * Math.max(0, s.getScrollHeight() - s.getLayoutInfo().height));
}
const Vo = 80, Ko = 300;
let gt = 0, os = null;
function zo() {
  const e = o.editor, t = e?.getModel();
  if (!e || !t) return;
  const n = ee() ? Go(t) : null;
  if (!n) {
    Mn();
    return;
  }
  const s = [{ range: n.lineRange, options: { className: "preview-src-hl-line", isWholeLine: !0 } }];
  n.textRange && s.push({ range: n.textRange, options: { className: "preview-src-hl" } }), o.previewHl ? o.previewHl.set(s) : o.previewHl = e.createDecorationsCollection(s), li(t, n.textRange), Sn("preview"), e.revealRangeInCenterIfOutsideViewport(n.textRange || n.lineRange, 1);
}
function Mn() {
  o.previewHl?.clear?.(), o.previewHl = null, de = null, document.getElementById("mark-btn")?.classList.add("hidden");
}
function Go(e) {
  const t = window.getSelection?.();
  if (!t || t.isCollapsed || !t.rangeCount) return null;
  const n = t.getRangeAt(0), s = l("preview");
  if (!s.contains(n.commonAncestorContainer)) return null;
  const i = s.querySelectorAll("[data-src-line]"), r = as(n.startContainer) || i[0], a = as(n.endContainer) || i[i.length - 1] || r;
  if (!r || !a) return null;
  const c = nn(e, Number(r.dataset.srcLine) + gt), d = Math.max(c, nn(e, Number(a.dataset.srcEnd) + gt));
  if (!c) return null;
  const u = new o.monaco.Range(c, 1, d, e.getLineMaxColumn(d)), f = Xo(n), h = f ? f.textContent : t.toString(), p = Yo(e, n, h);
  if (p) return p;
  const g = ci(e.getValueInRange(u), h);
  let y = null;
  if (g) {
    const k = e.getOffsetAt({ lineNumber: c, column: 1 });
    y = o.monaco.Range.fromPositions(
      e.getPositionAt(k + g.start),
      e.getPositionAt(k + g.end)
    );
  }
  return { lineRange: u, textRange: y };
}
function le(e, t) {
  return (e?.nodeType === Node.ELEMENT_NODE ? e : e?.parentElement)?.closest(t) || null;
}
const as = (e) => le(e, "[data-src-line]");
function Yo(e, t, n) {
  const s = le(t.startContainer, ".mermaid-box"), i = le(t.endContainer, ".mermaid-box");
  if (!s || s !== i) return null;
  const r = s.__mermaidMeta;
  if (!r?.src) return null;
  const a = fn(r.src);
  if (!a.supported) return null;
  let c = null;
  const d = le(t.startContainer, "g[id*='flowchart-']"), u = le(t.endContainer, "g[id*='flowchart-']");
  if (d && d === u) {
    const A = nt(d.id, a.nodes), F = A ? a.nodes.get(A) : null;
    c = F?.def?.labelSpan || F?.firstRef?.span || null;
  }
  if (!c) {
    const A = le(t.startContainer, ".edgeLabel"), F = le(t.endContainer, ".edgeLabel");
    if (A && A === F) {
      const E = Zo(s, A), M = E ? st(E, a) : null;
      c = M != null ? a.edges[M]?.arrow?.labelSpan : null;
    }
  }
  if (!c) return null;
  const f = Number(s.dataset.srcLine) + gt, h = nn(e, f + 1);
  if (!h) return null;
  const p = e.getOffsetAt({ lineNumber: h, column: 1 }), g = r.src.slice(c.start, c.end), y = ci(g, n), k = p + c.start + (y?.start || 0), L = p + c.start + (y?.end ?? g.length), v = o.monaco.Range.fromPositions(
    e.getPositionAt(k),
    e.getPositionAt(L)
  ), b = v.startLineNumber, C = v.endLineNumber;
  return { lineRange: new o.monaco.Range(b, 1, C, e.getLineMaxColumn(C)), textRange: v };
}
function Zo(e, t) {
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
function Xo(e) {
  const t = le(e.startContainer, "mark");
  return t && t === le(e.endContainer, "mark") ? t : null;
}
function nn(e, t) {
  return Number.isFinite(t) ? Math.min(Math.max(1, t), e.getLineCount()) : 0;
}
function ci(e, t) {
  const n = t.replace(/\s+/g, " ").trim();
  if (!n) return null;
  const s = e.indexOf(n);
  if (s >= 0) return { start: s, end: s + n.length };
  if (n.length > Ko) return null;
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
let de = null;
function Jo() {
  let e = document.getElementById("mark-btn");
  return e || (e = document.createElement("button"), e.id = "mark-btn", e.className = "hidden", e.title = "選択したところを Markdown の ==マーカー== で塗る (Ctrl+Shift+H)", e.addEventListener("mousedown", (t) => t.preventDefault()), e.addEventListener("click", di), document.body.appendChild(e), e);
}
function li(e, t) {
  const n = Jo(), s = t ? Qo() : null;
  if (!s) {
    de = null, n.classList.add("hidden");
    return;
  }
  de = { range: t, marked: ta(e, t) }, n.textContent = de.marked ? "🖍 マーカーを消す" : "🖍 マーカー", n.classList.remove("hidden"), ea(n, s);
}
function Qo() {
  const e = window.getSelection?.();
  if (!e?.rangeCount) return null;
  const t = e.getRangeAt(0).getBoundingClientRect();
  if (!t.width && !t.height) return null;
  const n = l("preview").getBoundingClientRect();
  return t.bottom < n.top || t.top > n.bottom ? null : t;
}
function ea(e, t) {
  const n = t.top - e.offsetHeight - 6;
  e.style.top = `${n < 4 ? t.bottom + 6 : n}px`, e.style.left = `${Math.max(4, Math.min(t.left, window.innerWidth - e.offsetWidth - 4))}px`;
}
function ta(e, t) {
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
function di() {
  const e = o.editor, t = e?.getModel();
  if (!de || !t) return;
  const n = o.monaco.Range, { range: s, marked: i } = de, r = i ? [
    { range: new n(s.startLineNumber, s.startColumn - 2, s.startLineNumber, s.startColumn), text: "" },
    { range: new n(s.endLineNumber, s.endColumn, s.endLineNumber, s.endColumn + 2), text: "" }
  ] : [
    { range: n.fromPositions(s.getStartPosition()), text: "==" },
    { range: n.fromPositions(s.getEndPosition()), text: "==" }
  ];
  e.executeEdits("mark", r), Mn();
}
function ui(e) {
  l("preview").classList.toggle("hidden", !e), l("preview-divider").classList.toggle("hidden", !e), l("preview-btn").classList.toggle("active", e), e ? gc() : (l("editor").style.flex = "", Mn()), o.editor?.layout(), _e();
}
function fi() {
  ui(!1);
}
async function na(e, t) {
  const n = o.currentFile || "", s = Cs(yt(n).replace(/\.[^.]+$/, "")), i = await R("/api/image", {
    note: n,
    name: `${s}-${t}`,
    ext: "png",
    data_b64: await cr(e),
    overwrite: !0
  });
  return await G(), i.path;
}
function sn() {
  if (Bs(o.currentFile)) {
    if (!Wr()) {
      alert(`⚠️ Markdown プレビューを使うには、先に次を実行してください:
python -m pipenv run python scripts/fetch_markdown_it.py`);
      return;
    }
    if (ee()) {
      fi();
      return;
    }
    ui(!0), Ln();
  }
}
function cs(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result)), s.onerror = () => n(new Error("画像データを読み込めませんでした")), s.readAsDataURL(e);
  });
}
function sa(e) {
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
async function ia(e) {
  const t = e.cloneNode(!0);
  t.querySelectorAll(".mermaid-tools, .mdflow-presets, .mdflow-mapping, .mdflow-note").forEach((n) => n.remove());
  for (const n of t.querySelectorAll(".mermaid-box")) {
    const s = n.querySelector("svg");
    if (s)
      try {
        const i = await Ls(s, { background: zt() }), r = document.createElement("img");
        r.src = await cs(i), r.style.maxWidth = "100%", n.replaceWith(r);
      } catch {
      }
  }
  for (const n of t.querySelectorAll("img")) {
    const s = n.getAttribute("src") || "";
    if (s.startsWith("/api/asset"))
      try {
        const i = await fetch(s);
        if (!i.ok) continue;
        n.src = await cs(await i.blob());
      } catch {
      }
  }
  return sa(t), `<div>${t.innerHTML}</div>`;
}
let Bt = !1;
async function ra() {
  if (!ee() || Bt) return;
  const e = l("richcopy-btn"), t = e.textContent;
  Bt = !0, e.disabled = !0, e.textContent = "⏳";
  try {
    const { text: n } = ii(), s = await ia(l("preview"));
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([s], { type: "text/html" }),
      "text/plain": new Blob([n], { type: "text/plain" })
    })]), e.textContent = "✓ コピー済";
  } catch (n) {
    e.textContent = t, alert("⚠️ コピーできませんでした: " + (n?.message || n));
  } finally {
    Bt = !1, setTimeout(() => {
      e.textContent = t, _e();
    }, 1500);
  }
}
let pe = null;
function oa() {
  const e = o.editor.getModel(), t = e.getOffsetAt(o.editor.getSelection().getStartPosition()), n = e.getValue().slice(0, t).replace(/[ \t]+$/, "");
  return !n.trim() || /\n\s*\n\s*$/.test(n) ? "" : /\n\s*$/.test(n) ? `
` : `

`;
}
function aa() {
  const e = l("cf-modal"), t = l("cf-input"), n = l("cf-status"), s = (r) => {
    n.textContent = r || "";
  };
  l("cf-btn").addEventListener("click", () => {
    pe = null, t.value = "", s(rt() ? "Confluence（または任意のWebページ）でコピー（Ctrl+C）してから「クリップボードから読込」、または下の欄に Ctrl+V。" : "⚠ Turndown 未取得: python -m pipenv run python scripts/fetch_turndown.py を実行するとHTML→Markdown変換が有効になります（未取得でもテキストはそのまま挿入できます）。"), e.classList.remove("hidden"), t.focus();
  });
  const i = () => e.classList.add("hidden");
  l("cf-cancel").addEventListener("click", i), e.addEventListener("click", (r) => {
    r.target === e && i();
  }), t.addEventListener("paste", (r) => {
    const a = r.clipboardData?.getData("text/html");
    !a || !rt() || (r.preventDefault(), pe = a, t.value = r.clipboardData?.getData("text/plain") || "", s("✓ リッチテキスト（HTML）で取得しました。「変換して挿入」でMarkdownになります（下の欄は確認用。欄を手で編集するとHTML側を無視して欄の内容を挿入します）。"));
  }), l("cf-read-btn").addEventListener("click", async () => {
    try {
      const r = await navigator.clipboard.read();
      for (const a of r) {
        if (a.types.includes("text/html") && rt()) {
          pe = await (await a.getType("text/html")).text(), t.value = a.types.includes("text/plain") ? await (await a.getType("text/plain")).text() : "", s("✓ クリップボードのHTMLを取得しました。");
          return;
        }
        if (a.types.includes("text/plain")) {
          pe = null, t.value = await (await a.getType("text/plain")).text(), s("プレーンテキストとして取得しました（そのまま挿入されます）。");
          return;
        }
      }
      s("クリップボードが空です。");
    } catch (r) {
      s("⚠ 読み込めませんでした: " + (r?.message || r) + "。下の欄へ Ctrl+V なら直接取れます。");
    }
  }), t.addEventListener("input", () => {
    pe = null;
  }), l("cf-insert").addEventListener("click", () => {
    if (!o.currentFile) {
      alert("先に挿入先のファイルを開いてください。");
      return;
    }
    let r;
    try {
      r = pe != null ? io(pe) : t.value;
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
      text: oa() + r.replace(/\s+$/, "") + `
`
    }]), o.editor.focus(), i();
  });
}
function ca(e, t) {
  o.diagramEditing?.dispose?.();
  const n = { src: t.src, index: t.index, box: e, restore: null, dispose: null };
  o.diagramEditing = n, n.dispose = qt(e, t, rn(), null);
}
function la() {
  o.diagramEditing?.dispose?.(), o.diagramEditing = null;
}
function da(e, t, n = !1) {
  const s = o.diagramEditing;
  if (s) {
    if (n) {
      if (s.box !== e) return;
      s.index = t.index, e.querySelector(":scope > .mermaid-editbar") || (s.dispose?.(), s.dispose = qt(e, t, rn(), s.restore));
      return;
    }
    s.index === t.index && (s.src !== t.src && (s.src = t.src, s.restore = null), s.dispose?.(), s.box = e, s.dispose = qt(e, t, rn(), s.restore), s.restore && (s.restore = { ...s.restore, editNodeId: null }));
  }
}
function rn() {
  return {
    applyEdits(e, t, n = null) {
      const s = o.editor, i = s.getModel(), r = o.diagramEditing, a = Rs(i.getValue(), e, r?.index ?? 0);
      if (!a)
        return o.diagramEditing?.dispose?.(), o.diagramEditing = null, alert("⚠️ 図の位置を特定できませんでした（プレビューとエディタの内容が食い違っています）。編集モードを終了します。ファイルを開き直すと直ります。"), !1;
      const c = Fr(e, t), d = t.map((u) => ({
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
      ls(e);
    },
    onExit() {
      ls(null), o.diagramEditing = null;
    }
  };
}
function ls(e) {
  const t = o.editor, n = t?.getModel();
  if (!t || !n) return;
  const s = () => {
    o.diagramHl?.clear?.(), o.diagramHl = null;
  };
  if (!e) {
    s();
    return;
  }
  const i = o.diagramEditing, r = i ? Rs(n.getValue(), i.src, i.index ?? 0) : null;
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
let on = null, ye = 0, ie = [];
function ua() {
  clearTimeout(on), ye++, ie = [], X(), on = setTimeout(() => _n(l("file-search").value), 250);
}
function fa() {
  ye++, clearTimeout(on), l("file-search").value = "", ie = [], l("search-results").classList.add("hidden"), l("search-results").innerHTML = "", l("search-opts").classList.add("hidden"), l("replace-bar").classList.add("hidden"), l("replace-preview").innerHTML = "", l("replace-status").textContent = "", l("file-list").classList.remove("hidden");
}
async function _n(e) {
  const t = ++ye, n = j, s = l("search-case").checked;
  ie = [], X();
  const i = l("search-results"), r = l("file-list");
  if (!e.trim()) {
    ie = [], i.classList.add("hidden"), l("search-opts").classList.add("hidden"), l("replace-bar").classList.add("hidden"), r.classList.remove("hidden");
    return;
  }
  const a = new URLSearchParams({ q: e, case: s ? "true" : "false" }), c = await z("/api/search?" + a);
  if (!(!c || t !== ye || n !== j || e !== l("file-search").value || s !== l("search-case").checked)) {
    ie = [...new Set(c.results.map((d) => d.path))], i.innerHTML = "";
    for (const d of c.results) i.appendChild(pa(d));
    c.results.length || (i.innerHTML = "<div class='hint'>該当なし</div>"), l("search-opts").classList.remove("hidden"), X(), r.classList.add("hidden"), i.classList.remove("hidden");
  }
}
function pa(e) {
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
    await oe(e.path), o.editor.revealLineInCenter(e.line), o.editor.setPosition({ lineNumber: e.line, column: 1 }), o.editor.focus();
  }), t;
}
function ma() {
  const e = l("replace-bar");
  e.classList.toggle("hidden"), e.classList.contains("hidden") || (X(), l("replace-input").focus());
}
function X(e) {
  l("replace-status").textContent = e !== void 0 ? e : `対象: ヒットした ${ie.length} ファイル`;
  const t = !ie.length || we;
  l("replace-preview-btn").disabled = t, l("replace-run-btn").disabled = t;
}
async function Ot(e) {
  if (we || te) return;
  const t = l("file-search").value, n = l("replace-input").value, s = [...ie], i = l("search-case").checked, r = j, a = ye;
  if (!(!t.trim() || !ie.length) && !(!e && !confirm(
    `${ie.length} ファイルの「${t}」を「${n}」に置き換えます。

置換前の内容は 🕰 履歴 に残るので元に戻せます。実行しますか？`
  ))) {
    we = !0, clearTimeout(Ue);
    try {
      if (!e && s.includes(o.currentFile)) {
        const g = o.currentFile;
        if (!(!o.dirty || await St()) || o.dirty || o.currentFile !== g) {
          X("⚠️ 未保存の編集を保存できないため、置換を中止しました。");
          return;
        }
      }
      if (r !== j || a !== ye) {
        X("検索対象が変わったため、置換を中止しました。");
        return;
      }
      const c = o.currentFile, d = o.editor.getModel(), u = d.getVersionId();
      X(e ? "確認中…" : "置換中…");
      let f;
      try {
        Zt = !e, f = await R("/api/search/replace", {
          query: t,
          replace: n,
          paths: s,
          case: i,
          dry_run: e
        });
      } catch (g) {
        X("⚠️ " + g.message);
        return;
      }
      ha(f);
      const h = f.total === 0 ? "置き換わる箇所がありません" : e ? `${f.changed_files} ファイル / ${f.total} 箇所が置き換わります` : `✓ ${f.changed_files} ファイル / ${f.total} 箇所を置換しました（🕰 履歴 から戻せます）`;
      if (e) {
        X(h);
        return;
      }
      const p = f.files.map((g) => g.path);
      o.currentFile && p.includes(o.currentFile) && (!o.dirty && o.currentFile === c && o.editor.getModel() === d && d.getVersionId() === u && await oe(o.currentFile, !0, "none"), o.dirty && (o.conflictDeclined = !0, o.saveError = new ne("ディスクを置換しました。処理中の編集は保持しています。保存前に履歴で変更を確認してください。", 409), q())), await _n(l("file-search").value), X(h);
    } finally {
      Zt = !1, we = !1, X(l("replace-status").textContent), kn();
    }
  }
}
function ha(e) {
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
function wt() {
  if (!o.editor) return "";
  const e = o.editor.getSelection();
  return o.editor.getModel().getValueInRange(e);
}
function ga() {
  return B() ? "テキストを選択してAIに送れます" : Ge() ? "計画モード：エージェントは調査だけを行い、ファイルは変更しません。" : "エージェントがファイルを直接編集します（破壊操作は承認制）。";
}
function pi() {
  const e = wt().trim().length > 0;
  l("sel-chip").classList.toggle("hidden", !e), l("sel-info").textContent = e ? "選択中：AIに送れます" : ga();
}
async function $n() {
  if (!o.currentFile) {
    o.notes = [], vt();
    return;
  }
  const e = await z("/api/notes?path=" + encodeURIComponent(o.currentFile));
  o.notes = e ? e.notes || [] : [], vt();
}
async function Tn(e = o.currentFile, t) {
  e && (t == null && (_t(), t = o.notes), await Z("/api/notes?path=" + encodeURIComponent(e), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t)
  }));
}
function _t() {
  o.noteDecorations && o.notes.forEach((e, t) => {
    const n = o.noteDecorations.getRange(t);
    n && (e.line = n.startLineNumber);
  });
}
function vt() {
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
function wa() {
  _t();
  const e = o.editor.getPosition().lineNumber, t = prompt("付箋メモ（例: ここをAIに膨らませてもらう）");
  t && (o.notes = o.notes.filter((n) => n.line !== e), o.notes.push({ line: e, text: t }), vt(), Tn().catch((n) => alert("⚠️ 付箋の保存に失敗しました: " + n.message)));
}
function va(e) {
  _t();
  const t = o.notes.find((s) => s.line === e), n = prompt("付箋メモ（空で削除）", t ? t.text : "");
  n !== null && (o.notes = o.notes.filter((s) => s.line !== e), n.trim() && o.notes.push({ line: e, text: n }), vt(), Tn().catch((s) => alert("⚠️ 付箋の保存に失敗しました: " + s.message)));
}
const ya = /* @__PURE__ */ new Set(
  ["md", "markdown", "txt", "py", "json", "yaml", "yml", "toml", "csv", "html", "css", "js", "ts"]
), fe = (e) => (e.external ? "E:" : "I:") + e.path, yt = (e) => e.split(/[\\/]/).pop(), an = (e) => ya.has(kt(e.path)), mi = (e) => hn(e.path);
async function Nn() {
  if (!o.currentFile) {
    o.refs = [], Ve();
    return;
  }
  const e = await z("/api/refs?path=" + encodeURIComponent(o.currentFile));
  o.refs = e ? e.refs || [] : [];
  const t = new Set(o.refs.map(fe));
  for (const n of [...o.checkedRefs]) t.has(n) || o.checkedRefs.delete(n);
  Ve();
}
async function hi() {
  o.currentFile && await z("/api/refs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: o.currentFile, refs: o.refs })
  });
}
async function cn(e) {
  if (!o.currentFile) {
    alert("先にファイルを開いてください。");
    return;
  }
  o.refs.some((t) => fe(t) === fe(e)) || (o.refs.push(e), await hi(), Ve());
}
async function ba(e) {
  const [t] = o.refs.splice(e, 1);
  t && o.checkedRefs.delete(fe(t)), await hi(), Ve();
}
async function Ea(e) {
  try {
    await R(
      "/api/refs/open",
      { note: o.currentFile, path: e.path, external: !!e.external }
    );
  } catch (t) {
    alert("⚠️ 開けませんでした: " + t.message);
  }
}
function Ve() {
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
    r.type = "checkbox", r.title = an(n) ? "AIコンテキストに含める" : mi(n) ? "AIコンテキストに含める（サーバでテキスト抽出して同梱。/copilot では原本を Copilot に添付）" : "AIコンテキストに含める（この形式は Copilot 添付経路のみ有効）", r.checked = o.checkedRefs.has(fe(n)), r.addEventListener("click", (u) => u.stopPropagation()), r.addEventListener("change", () => {
      r.checked ? o.checkedRefs.add(fe(n)) : o.checkedRefs.delete(fe(n));
    });
    const a = document.createElement("span");
    a.textContent = n.external ? "外部" : "";
    const c = document.createElement("span");
    c.className = "fname", c.textContent = n.name || yt(n.path), c.title = n.path + "（クリックで既定アプリで開く）", c.addEventListener("click", () => Ea(n));
    const d = document.createElement("button");
    d.className = "ref-del", d.textContent = "×", d.title = "参照を外す", d.addEventListener("click", (u) => {
      u.stopPropagation(), ba(s);
    }), i.append(r, a, c, d), e.appendChild(i);
  });
}
function xa(e) {
  const t = (e || "").split(/\r?\n/).find((s) => s && !s.startsWith("#"));
  if (!t || !/^file:/i.test(t)) return null;
  let n = decodeURIComponent(t.replace(/^file:\/\//i, ""));
  return /^\/[A-Za-z]:/.test(n) && (n = n.slice(1)), n.replace(/\\/g, "/");
}
function ka() {
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
    if (se) {
      const s = o.fsMap.get(se);
      s && s.type === "file" ? await cn({ path: se, external: !1, name: yt(se) }) : alert("フォルダは参照に追加できません。ファイルをドラッグしてください。");
      return;
    }
    const n = xa(t.dataTransfer.getData("text/uri-list") || t.dataTransfer.getData("text/plain"));
    if (n) {
      await cn({ path: n, external: !0, name: yt(n) });
      return;
    }
    t.dataTransfer.files && t.dataTransfer.files.length && alert(`ブラウザの制限でドラッグしたファイルの絶対パスを取得できません。
外部ファイルは「＋参照を追加」から選んでください。`);
  });
}
async function Be(e) {
  const t = await z("/api/workspace/dirs?files=true&path=" + encodeURIComponent(e || ""));
  if (!t) return;
  l("pick-input").value = t.cwd || "";
  const n = l("pick-drives");
  n.innerHTML = "";
  for (const i of t.drives || []) {
    const r = document.createElement("button");
    r.textContent = i, r.classList.toggle("active", (t.cwd || "").toLowerCase().startsWith(i.toLowerCase().slice(0, 2))), r.addEventListener("click", () => Be(i)), n.appendChild(r);
  }
  const s = l("pick-list");
  if (s.innerHTML = "", t.parent && t.parent !== t.cwd) {
    const i = document.createElement("li");
    i.textContent = "⬆ ..（上のフォルダへ）", i.addEventListener("click", () => Be(t.parent)), s.appendChild(i);
  }
  for (const i of t.dirs || []) {
    const r = document.createElement("li");
    r.textContent = i.name, r.addEventListener("click", () => Be(i.path)), s.appendChild(r);
  }
  for (const i of t.files || []) {
    const r = document.createElement("li");
    r.className = "pick-file", r.textContent = i.name, r.addEventListener("click", async () => {
      await cn({ path: i.path.replace(/\\/g, "/"), external: !0, name: i.name }), ct();
    }), s.appendChild(r);
  }
}
function Ca() {
  if (!o.currentFile) {
    alert("先にファイルを開いてください。");
    return;
  }
  l("pick-modal").classList.remove("hidden"), Be(l("root-path").textContent || "");
}
function ct() {
  l("pick-modal").classList.add("hidden");
}
const gi = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg"
};
function ds(e) {
  for (const t of e?.files || [])
    if (t.type in gi) return t;
  return null;
}
function La(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result).split(",", 2)[1] || ""), s.onerror = () => n(new Error("画像を読み込めませんでした")), s.readAsDataURL(e);
  });
}
async function us(e) {
  if (!o.currentFile) {
    alert("⚠️ 画像を貼るには、先にファイルを開いて（または保存して）ください。");
    return;
  }
  let t;
  try {
    t = await R("/api/image", {
      note: o.currentFile,
      ext: gi[e.type],
      name: e.name || "",
      // D&D は元名を引き継ぐ。クリップボードは名前が無いので日時
      data_b64: await La(e)
    });
  } catch (s) {
    alert("⚠️ 画像を保存できませんでした: " + s.message);
    return;
  }
  const n = t.rel.split("/").pop().replace(/\.[^.]+$/, "");
  o.editor.executeEdits("insert-image", [
    { range: o.editor.getSelection(), text: `![${n}](${t.rel})` }
  ]), o.editor.focus(), await G();
}
const Sa = {
  prefill: (e) => `応答を待っています… ${e}s`,
  thinking: (e) => `思考中… ${e}s`,
  generating: (e) => `ツール呼び出しを生成中… ${e}s`,
  tool: (e) => `ツールを実行中… ${e}s`,
  verify: (e) => `結果を検証中… ${e}s`,
  responding: (e) => `回答を生成中… ${e}s`
};
function Ma(e, t = !0) {
  let n = "", s = "prefill", i = performance.now();
  const r = document.createElement("div");
  r.className = "wait-indicator", r.innerHTML = '<span class="dots"><i></i><i></i><i></i></span><span class="wait-text"></span>';
  const a = r.querySelector(".wait-text"), c = l("chat-activity");
  c && c.replaceChildren();
  let d = "", u = !1, f = null, h = 0, p = 0;
  const g = "LLM全呼び出しの生成トークン数 ÷ 生成時間（思考・ツール呼び出しの生成を含む）", y = "受信した文字数 ÷ 3でトークン数を概算し、ストリームの受信時間で割った推定値。ツール実行・応答待ちの時間を除外します。", k = () => {
    let E = e.querySelector(".response-speed");
    E || (E = document.createElement("div"), E.className = "response-speed", e.appendChild(E)), E.textContent = d, E.title = u ? g : y;
  }, L = () => {
    r.isConnected || (c || e).prepend(r);
  }, v = () => {
    if (!r.isConnected) return;
    const E = ((performance.now() - i) / 1e3).toFixed(1), M = Sa[s] || ((I) => `${s}… ${I}s`);
    a.textContent = M(E) + (d ? ` / ${d}` : ""), a.title = u ? g : y;
  }, b = (E) => {
    E !== s && (s = E, i = performance.now(), f = null), L(), v(), Q();
  }, C = performance.now();
  let _ = null;
  const A = (E, M = !1) => {
    if (!E.trim()) return;
    _ || (_ = document.createElement("details"), _.className = "think-box", _.innerHTML = '<summary></summary><div class="think-body"></div>', e.insertBefore(_, e.querySelector(".body")));
    const I = ((performance.now() - C) / 1e3).toFixed(1);
    _.querySelector("summary").textContent = M ? `💭 思考ログ（${E.length}文字・${I}s）` : "💭 思考中…", _.querySelector(".think-body").textContent = E, M && (_.open = !1);
  };
  L(), v();
  const F = setInterval(() => {
    v(), Q();
  }, 200);
  return {
    onToken(E) {
      if (n += E, b("responding"), t && !u) {
        const P = performance.now();
        f !== null && (h += [...E].length, p += P - f), f = P, d = p >= 100 ? `推定 ${(h / 3 * 1e3 / p).toFixed(1)} tokens/sec` : "速度を計測中…", v();
      }
      const { think: M, visible: I } = Yt(n);
      A(M), As(e.querySelector(".body"), I), Q();
    },
    /** エンジンのインジケータ（⏳ Prefill / 🧠 Thinking...）を待機表示のフェーズに反映する。 */
    setPhase: b,
    setSpeed(E) {
      u = !0, d = E, v(), k();
    },
    finish() {
      clearInterval(F), r.remove(), d === "速度を計測中…" && (d = "速度: 計測データなし"), d && k(), c && (c.textContent = d);
      const { think: E, visible: M } = Yt(n);
      return A(E, !0), M.trim() && Ke(e.querySelector(".body"), M, { assetBase: Ze() }), M;
    }
  };
}
const _a = [
  ["generating", ["Generating tool call"]],
  ["thinking", ["🧠", "Thinking..."]],
  ["prefill", ["⏳", "Prefill"]]
];
function $a(e) {
  for (const [t, n] of _a)
    if (n.some((s) => e.includes(s))) return t;
  return null;
}
async function Ta(e, t) {
  const n = wt(), s = [], i = [];
  for (const a of [...o.checkedFiles]) {
    let c = null;
    try {
      c = await Z("/api/file?path=" + encodeURIComponent(a), { signal: t });
    } catch (d) {
      if (t?.aborted) throw d;
      if (alert("⚠️ " + d.message), d.status === 423) continue;
    }
    c && c.content != null && i.push({ path: a, content: c.content }), hn(a) && s.push(a);
  }
  const r = [];
  if (o.currentFile)
    for (let a = 0; a < o.refs.length; a++) {
      const c = o.refs[a];
      if (o.checkedRefs.has(fe(c))) {
        if (an(c) || mi(c)) {
          let d = null;
          try {
            d = await Z(
              `/api/refs/read?note=${encodeURIComponent(o.currentFile)}&idx=${a}`,
              { signal: t }
            );
          } catch (u) {
            if (t?.aborted) throw u;
            if (alert("⚠️ " + u.message), u.status === 423) continue;
          }
          d && d.content != null && r.push({ path: c.path, content: d.content });
        }
        an(c) || s.push(c.path);
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
const wi = {
  "/compact": "会話を要約して文脈を畳む。`/compact 認証まわり` のように残したい焦点を足せる",
  "/copilot": "エージェントが質問文を組み立てて Copilot に聞き、回答を精査して反映する",
  "/copilot_simple": "ローカル LLM を経由せず、打った文をそのまま Copilot へ1回質問する（選択範囲・チェック済みファイルは同梱、関連ファイルは添付される）",
  // 従来名。/copilot_simple と完全に同じ処理へ入る（サーバの COPILOT_DIRECT_COMMANDS）。
  "/copilot!": "`/copilot_simple` の別名（同じ動作）"
}, Rn = {
  "/help": { desc: "使えるコマンドの一覧を出す", run: () => Ra() },
  "/context": { desc: "いまの文脈の量（メッセージ数・概算文字数）を見る", run: () => Ia() },
  "/undo": { desc: "直前の往復を削除する（🗑 と同じ）", run: () => Aa() },
  "/clear": { desc: "会話をリセットする（Note は保存履歴も消す）", run: () => Pa() },
  "/code": { desc: "Code モードへ切り替える", run: () => Ht("code") },
  "/note": { desc: "Note モードへ切り替える", run: () => Ht("note") },
  "/plan": { desc: "Plan モードへ切り替える", run: () => Ht("plan") }
};
async function Ht(e) {
  if (o.mode === e) {
    N("system", `既に ${je[e]} モードです。`);
    return;
  }
  await vn(e);
}
async function Na(e) {
  const t = /^(\/\S+)(?:\s+([\s\S]*))?$/.exec(e);
  if (!t) return !1;
  const n = t[1].toLowerCase();
  if (n in wi) return !1;
  const s = Rn[n];
  return s ? (N("user", e), await s.run((t[2] || "").trim()), !0) : !1;
}
function Ra() {
  const e = [
    ...Object.entries(wi),
    ...Object.entries(Rn).map(([t, n]) => [t, n.desc])
  ].map(([t, n]) => `| \`${t}\` | ${n} |`);
  N("assistant", [
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
async function Ia() {
  let e;
  try {
    e = await re("/api/context?session_id=" + encodeURIComponent(o.sessionId));
  } catch (n) {
    N("error", "⚠ 文脈を取得できません: " + n.message);
    return;
  }
  if (!e.supported) {
    N("assistant", "このエンジンでは文脈量を測れません（pixie_core API 1.6 以上が必要です）。");
    return;
  }
  const t = [
    `### 🧠 いまの文脈（${je[e.mode] || e.mode} モード）`,
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
  N("assistant", t.join(`
`));
}
function Aa() {
  const t = [...l("messages").children].reverse().find((s) => s.classList.contains("assistant") && s._exchange);
  if (!t) {
    N("system", "消せる往復がありません。");
    return;
  }
  const n = t.querySelector(".msg-del");
  n && n.click();
}
async function Pa() {
  if (o.streaming) {
    alert("⚠️ 応答の生成中はリセットできません。");
    return;
  }
  const e = B() ? `
（保存されている会話履歴も消えます）` : "";
  if (!confirm("この会話をリセットしますか？" + e)) return;
  const t = $.begin("switching");
  if (!t) return;
  let n = "";
  try {
    try {
      await R("/api/session/clear", { session_id: o.sessionId });
    } catch (s) {
      n = s.message, alert("⚠️ リセットできません: " + s.message);
      return;
    }
    if (B())
      try {
        await Z("/api/chat/history", { method: "DELETE" }), o.history = [], o.historyLoaded = !0;
      } catch (s) {
        n = s.message, alert("⚠️ 保存履歴を消せませんでした: " + s.message);
      }
    l("messages").innerHTML = "", o.assistantEl = null, o.sessionId = ze(), $e(), N("system", "🧹 会話をリセットしました。");
  } catch (s) {
    return n = s.message, alert(s.message), !1;
  } finally {
    $.finish(t, n);
  }
}
async function Le(e) {
  if (!dn.ready || o.streaming) return;
  const t = e?.sourceBundle;
  if (t && (!o.copilotEnabled || te)) return;
  const n = l("chat-input"), s = t ? e.message.trim() : n.value.trim();
  if (!s) return;
  const i = s.split(/\s/, 1)[0].toLowerCase();
  if (Object.hasOwn(Rn, i)) {
    await Na(s) && (n.value = "");
    return;
  }
  const r = $.begin();
  if (!r) return;
  let a = "";
  try {
    const c = !t && B(), d = !t && Ge(), u = !t && Fe() && o.codeStyle === "plan" && !o.planExecNext;
    t || (o.planExecNext = !1);
    const f = c ? Za() : null;
    let h;
    if (t)
      h = { message: s, session_id: o.sessionId, source_bundle: t };
    else if (c)
      h = await Ta(s, r.controller.signal);
    else if (d) {
      const b = [];
      for (const C of [...o.checkedFiles]) {
        const _ = await Z("/api/file?path=" + encodeURIComponent(C), { signal: r.controller.signal });
        _ && _.content != null && b.push({ path: C, content: _.content });
      }
      h = {
        message: s,
        session_id: o.sessionId,
        selection: wt(),
        current_file: o.currentFile || "",
        current_content: o.currentFile ? o.editor.getValue() : "",
        context_files: b
      };
    } else {
      const b = [];
      for (const C of [...o.checkedFiles]) {
        const _ = await Z("/api/file?path=" + encodeURIComponent(C), { signal: r.controller.signal });
        _ && _.content != null && b.push({ path: C, content: _.content });
      }
      h = {
        message: s,
        session_id: o.sessionId,
        current_file: o.currentFile,
        current_content: o.currentFile ? o.editor.getValue() : "",
        selection: wt(),
        plan_first: u,
        autonomous: !u && !!l("autonomous-check")?.checked,
        verification_command: !u && l("autonomous-check")?.checked && l("verification-command")?.value.trim() || ""
      }, b.length && (h.context_files = b);
    }
    if (r.controller.signal.aborted || !$.current(r)) return;
    h.session_id = r.sessionId, t || (n.value = "");
    const p = t ? `${s}

添付: ${e.attachmentLabel || t.filename}` : s, g = N("user", p);
    o.changedPaths.size && (o.changedPaths.clear(), Ye()), o.assistantEl = N("assistant", ""), o.turnId = 0, o.compacted = null, o.assistantEl._exchange = { userEl: g, userText: p }, o.assistantUi = Ma(o.assistantEl, !/^\/copilot/i.test(s) && !t);
    try {
      const b = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(h),
        signal: r.controller.signal
      });
      if (!b.ok) {
        const C = await b.json().catch(() => ({}));
        throw new Error(C.detail || `HTTP ${b.status}`);
      }
      $.phase(r, "running"), await ji(b, r, $.current, async (C) => {
        $.current(r) && (C.type === "approval" && $.phase(r, "approval"), await Ha(C));
      });
    } catch (b) {
      r.controller.signal.aborted || (a = b.message, O(o.assistantEl, "⚠️ 実行失敗: " + b.message));
    }
    if (!$.current(r)) return;
    const y = r.controller.signal.aborted || r.outcome === "cancelled" || !!a, k = o.assistantEl, L = o.turnId, v = fs();
    c ? Oa(k, s, v, f, y) : (d || u) && !y && Ba(v), Fe() && !y && Va(p, v), o.compacted && k?.isConnected ? Fa(k, o.compacted) : k?.isConnected && (Fs(k, () => vi(k, L)), Fe() && L && ao(k, () => qa(L)));
  } catch (c) {
    r.controller.signal.aborted || (a = c.message, N("error", c.message));
  } finally {
    await r.interruption, $.current(r) && (o.assistantUi && fs(), l("approval").classList.add("hidden"), l("approval").innerHTML = "", be.length && ue(), $.finish(r, a));
  }
}
async function vi(e, t) {
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
      i = !!(await R(
        "/api/chat/turn/delete",
        { session_id: o.sessionId, turn_id: t }
      )).ok;
    } catch {
      i = !1;
    }
  if (B()) {
    const r = o.history.findIndex((a) => a.role === "user" && a.content === n?.userText);
    if (r >= 0) {
      const a = o.history[r + 1]?.role === "assistant" ? 2 : 1;
      o.history.splice(r, a), await bn();
    }
    if (!t)
      try {
        await R("/api/session/clear", { session_id: o.sessionId });
      } catch {
        i = !1;
      }
  }
  n?.userEl?.remove(), e.remove(), i || N("system", "⚠️ 表示からは消しましたが、AI の文脈からは消せませんでした（サーバ側の会話が既に入れ替わっています）。");
}
function Fa(e, t) {
  const n = l("messages");
  for (const i of [...n.children])
    i !== e && i.remove();
  const s = N(
    "system",
    `ここまでの会話（${t.before}件）を要約に畳みました（約${t.saved_chars.toLocaleString()}文字ぶんの文脈を解放）。`
  );
  n.insertBefore(s, e), B() && (o.history = [
    { role: "user", content: "（ここまでの会話は /compact で要約に置き換えました）" },
    { role: "assistant", content: t.summary }
  ], bn()), Q(!0);
}
function Da(e) {
  const t = /```plan[^\n]*\n([\s\S]*?)```/.exec(e || "");
  return t ? t[1].trim() : null;
}
function Ba(e) {
  let t = Da(e);
  !t && /^\s*1[.)]\s/m.test(e || "") && (t = (e || "").trim()), t && Ci(t);
}
function Oa(e, t, n, s, i) {
  if (o.history.push({ role: "user", content: t }), (n.trim() || !i) && o.history.push({ role: "assistant", content: n }), bn(), !e || !e.isConnected) return;
  const r = co(n);
  r.length ? Ga(e, n, r) : !Ja(e, n, s) && n.trim() && Xa(e, n, s);
}
async function Ha(e) {
  switch (e.type) {
    case "token":
      e.text && o.assistantUi?.onToken(e.text);
      break;
    case "status": {
      if (e.category === "command") {
        o.assistantUi?.setPhase(e.phase === "running" ? "tool" : "verify"), O(o.assistantEl, e.text || "", e);
        break;
      }
      const t = e.phase || $a(e.text || "");
      if (t) {
        o.assistantUi?.setPhase(t);
        break;
      }
      O(o.assistantEl, e.text, { category: e.category, tool: e.tool });
      break;
    }
    case "turn":
      o.turnId = e.id || 0;
      break;
    case "compacted":
      o.compacted = e;
      break;
    case "approval":
      Wa(e);
      break;
    case "workset":
      ja(e.workset);
      break;
    case "files_changed":
      await bi(e.paths || []);
      break;
    case "turn_metrics": {
      const t = e.metrics || {}, n = Array.isArray(t.llm_calls) ? t.llm_calls.length : 0, s = Number(t.tool_calls || 0), i = Number(t.acceptance_retries || 0), r = [`LLM ${n}`, `tools ${s}`], a = Array.isArray(t.llm_calls) ? t.llm_calls : [], c = (u) => a.reduce((f, h) => f + (Number(h[u]) || 0), 0), d = a.filter((u) => Number(u.decode_tokens) > 0 && Number(u.decode_ms) > 0);
      if (d.length) {
        const u = d.reduce((p, g) => p + Number(g.decode_tokens), 0), f = d.reduce((p, g) => p + Number(g.decode_ms), 0), h = `${(u * 1e3 / f).toFixed(1)} tokens/sec`;
        r.push(h), o.assistantUi?.setSpeed(h);
      }
      if (a.length) {
        r.push(`LLM時間 ${c("wall_sec").toFixed(1)}秒`), r.push(`応答待ち ${c("prefill_sec").toFixed(1)}秒`), r.push(`推論 ${c("thinking_sec").toFixed(1)}秒`);
        const u = c("prompt_tokens"), f = c("cache_tokens");
        u + f > 0 && r.push(`キャッシュ ${Math.round(100 * f / (u + f))}%`);
      }
      t.exit_reason && r.push(t.exit_reason), i && r.push(`acceptance retry ${i}`), O(
        o.assistantEl,
        `Turn: ${r.join(" / ")}`,
        { category: "turn_metrics" }
      );
      break;
    }
    case "error":
      O(o.assistantEl, "⚠ " + e.text);
      break;
  }
}
function ja(e) {
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
  O(
    o.assistantEl,
    `📚 Workset: ${t.length}件（自動追加 ${e.stats?.auto_added || 0}件）`
  ), t.slice(0, 16).forEach((i) => {
    const r = [];
    i.symbols?.length && r.push(`symbol ${i.symbols.length}`), i.sections?.length && r.push(`節 ${i.sections.length}`), i.requirements?.length && r.push(`要件 ${i.requirements.length}`), i.mermaid?.length && r.push(`Mermaid ${i.mermaid.length}`), O(
      o.assistantEl,
      `  ${s[i.role] || i.role}: ${i.path}` + (r.length ? `（${r.join(" / ")}）` : "")
    );
  }), t.length > 16 && O(o.assistantEl, `  …ほか ${t.length - 16}件`), n.slice(0, 8).forEach((i) => O(o.assistantEl, `  ⏭ 省略: ${i.path}（${i.reason}）`));
}
function fs() {
  const e = o.assistantUi?.finish() ?? "";
  return o.assistantEl && !e.trim() && !o.assistantEl.querySelector(".tool-log") && (o.assistantEl.remove(), o.assistantEl = null), o.assistantUi = null, e;
}
function Wa(e) {
  const t = l("approval");
  l("diff-approve-edit").disabled = !1, t.innerHTML = "", t.classList.remove("hidden");
  const n = document.createElement("h4");
  if (n.textContent = "⚠ エージェントが以下のツール実行を要求しています（承認が必要）", t.appendChild(n), e.changeset) {
    const u = document.createElement("div");
    u.className = "call";
    const f = (e.changeset.changes || []).length;
    u.textContent = `ChangeSet ${e.changeset.id || ""}：${f}ファイルを一括確認`, t.appendChild(u);
    const h = e.changeset.document_validation || {};
    for (const p of [
      ...e.changeset.errors || [],
      ...e.changeset.conflicts || [],
      ...h.errors || []
    ]) {
      const g = document.createElement("div");
      g.className = "call danger", g.textContent = "⚠ " + (p.path ? `${p.path}: ` : "") + (p.error || "base hash が現在内容と一致しません"), t.appendChild(g);
    }
    for (const p of h.warnings || []) {
      const g = document.createElement("div");
      g.className = "call", g.textContent = "ℹ " + (p.path ? `${p.path}: ` : "") + p.warning, t.appendChild(g);
    }
  }
  for (const u of e.calls) {
    const f = document.createElement("div");
    if (f.className = "call", u.needs_approval) {
      const g = document.createElement("span");
      g.className = "danger", g.textContent = "● 承認必須 ", f.appendChild(g);
    }
    const h = document.createElement("b");
    h.textContent = u.name;
    const p = u.args && Object.keys(u.args).length ? JSON.stringify(u.args, null, 2) : "(no args)";
    f.append(h, `
` + p), t.appendChild(f);
  }
  const s = e.changeset?.changes?.length ? e.changeset.changes : e.calls.filter((u) => u.preview).map((u) => u.preview), i = e.calls.length === 1 && s.length === 1 ? { id: e.id, path: s[0].path } : null;
  s.length && ec(s, i);
  const r = document.createElement("div");
  r.className = "row";
  const a = document.createElement("textarea");
  a.placeholder = "却下して別指示を出す場合はここに入力（任意）";
  const c = document.createElement("button");
  c.className = "btn-approve", c.textContent = "✓ 承認して実行", c.disabled = !!e.changeset && !e.changeset.ok, c.disabled && (c.title = "競合または検証エラーがあるため承認できません"), c.onclick = () => ps(e.id, !0, null);
  const d = document.createElement("button");
  d.className = "btn-reject", d.textContent = "✗ 却下", d.onclick = () => ps(e.id, !1, a.value.trim() || null), r.append(a, c, d), t.appendChild(r), Q();
}
const jt = /* @__PURE__ */ new WeakSet();
async function yi(e, t, n) {
  const s = $.active;
  if (!s || $.state.phase !== "approval") return;
  const i = l("approval");
  if (jt.has(s)) return;
  jt.add(s);
  const r = i.firstChild, a = [...i.querySelectorAll("button"), l("diff-approve-edit")], c = a.map((d) => d.disabled);
  a.forEach((d) => {
    d.disabled = !0;
  });
  try {
    if (await R(e, { ...t, session_id: s.sessionId }), !$.current(s) || s.controller.signal.aborted) return;
    O(o.assistantEl, n), i.firstChild === r && (i.classList.add("hidden"), i.innerHTML = "", be.length && ue(), $.phase(s, "running"));
  } catch (d) {
    $.current(s) && !s.controller.signal.aborted && O(o.assistantEl, d.message);
  } finally {
    jt.delete(s), $.current(s) && (i.firstChild === r || !i.firstChild) && a.forEach((d, u) => {
      d.disabled = c[u];
    });
  }
}
async function ps(e, t, n) {
  return yi(
    "/api/approve",
    { id: e, approve: t, override: n },
    t ? "✓ 承認しました。" : "✗ 却下しました。"
  );
}
async function bi(e) {
  O(o.assistantEl, "変更されたファイル: " + e.join(", "));
  for (const t of e) o.changedPaths.add(t);
  await G(), o.currentFile && e.includes(o.currentFile) && (o.dirty ? (o.conflictDeclined = !0, o.saveError = new ne("エージェントがファイルを更新しました。未保存の編集は保持しています。保存前に変更を確認してください。", 409), q()) : await oe(o.currentFile, !0));
}
async function Ua() {
  const e = $.stop();
  e && (Fe() && (e.interruption = (async () => {
    let t = !1;
    for (let n = 0; n < 10; n++) {
      const s = await Z("/api/interrupt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: e.sessionId }),
        signal: AbortSignal.timeout(5e3)
      });
      if (!$.current(e)) return;
      if (s.stopped !== !1) {
        t = !0;
        break;
      }
    }
    await G(), $.current(e) && o.currentFile && !o.dirty && await oe(o.currentFile, !0, "none"), t || N("error", "停止を要求しましたが、処理の終了をまだ確認できません。ファイルの状態を確認してください。");
  })().catch((t) => {
    N("error", t.message);
  })), be.length && ue());
}
async function qa(e) {
  if (o.streaming) {
    alert("⚠️ 実行中です。中断してから巻き戻してください。");
    return;
  }
  if (confirm(`このターンの前の状態へファイルを戻しますか？
以降のターンで同じファイルに加えた変更も巻き戻ります。
（このターンより後に作られたファイルは消さずに残ります。）`))
    try {
      const t = await R("/api/rollback", { session_id: o.sessionId, turn_id: e });
      if (!t.ok) {
        N("system", "⚠️ 巻き戻せませんでした（スナップショット無し: 古すぎるか容量上限）。");
        return;
      }
      N("system", t.restored.length ? `${t.restored.length}件を巻き戻しました: ${t.restored.join(", ")}` : "戻す変更はありませんでした（既にターン前の内容と同じです）。"), t.restored.length && await bi(t.restored);
    } catch (t) {
      alert("⚠️ 巻き戻しに失敗しました: " + t.message);
    }
}
function Ei(e) {
  if (o.streaming && !(e && $.current(e) && $.state.phase === "switching")) {
    alert("⚠️ 実行中です。中断してから新しい会話を開始してください。");
    return;
  }
  o.sessionId = ze(), l("autonomous-check") && (l("autonomous-check").checked = !1), l("verification-command") && (l("verification-command").value = ""), l("messages").innerHTML = "", l("approval").classList.add("hidden"), be.length && ue(), o.assistantEl = null, N("system", "新しい会話を開始しました（別セッション）。"), $e();
}
function Va(e, t) {
  R("/api/code-chat/log", { session_id: o.sessionId, user: e, assistant: t }).catch(() => {
  });
}
function Ka(e) {
  if (!e) return "";
  const t = Math.max(0, Date.now() / 1e3 - e);
  return t < 60 ? "たった今" : t < 3600 ? `${Math.floor(t / 60)}分前` : t < 86400 ? `${Math.floor(t / 3600)}時間前` : `${Math.floor(t / 86400)}日前`;
}
async function xi() {
  if (o.streaming) {
    alert("⚠️ 実行中です。中断してから開いてください。");
    return;
  }
  l("sessions-modal").classList.remove("hidden");
  const e = l("sessions-list");
  e.innerHTML = "";
  let t = [];
  try {
    t = (await re("/api/code-chat/sessions")).sessions || [];
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
    a.className = "sess-sub", a.textContent = `${Ka(n.updated_at)} ・ ${n.messages} メッセージ` + (n.session_id === o.sessionId ? " ・現在の会話" : ""), i.append(r, a);
    const c = document.createElement("button");
    c.type = "button", c.textContent = "削除", c.title = "この会話を削除", c.addEventListener("click", async (d) => {
      d.stopPropagation(), confirm(`「${n.title}」を削除しますか？`) && (await R("/api/code-chat/delete", { session_id: n.session_id }).catch(() => {
      }), xi());
    }), s.append(i, c), s.addEventListener("click", () => za(n.session_id)), e.appendChild(s);
  }
}
async function za(e) {
  const t = $.begin("switching");
  if (!t) return;
  let n = "";
  l("sessions-modal").classList.add("hidden");
  try {
    const s = await re("/api/code-chat/session?session_id=" + encodeURIComponent(e)), i = await R(
      "/api/code-chat/restore",
      { session_id: e, messages: s.messages }
    );
    $.finish(t), o.sessionId = e, $e(), l("messages").innerHTML = "";
    for (const r of s.messages || []) N(r.role, r.content, { assetBase: Ze() });
    N("system", i.ok ? "✓ 会話を復元しました（エンジンの文脈も引き継がれています。続きから話せます）。" : "✓ 会話の表示を復元しました（このエンジンでは文脈の復元は未対応です）。"), Q(!0);
  } catch (s) {
    n = s.message, alert("⚠️ 会話を復元できませんでした: " + s.message);
  } finally {
    $.finish(t, n);
  }
}
function $e() {
  l("session-info").textContent = "session: " + o.sessionId.slice(0, 8);
}
function Ga(e, t, n) {
  let s = "", i = 0;
  for (const c of Ds(t))
    s += t.slice(i, c.start) + "修正案（差分で確認）", i = c.end;
  s += t.slice(i), Ke(e.querySelector(".body"), s, { assetBase: Ze() });
  const r = document.createElement("div");
  r.className = "apply-actions";
  const a = document.createElement("button");
  a.className = "apply-btn", a.textContent = `▶ 差分で反映（${n.length}箇所）`, a.addEventListener("click", () => Ya(n, e)), r.appendChild(a), e.appendChild(r), Q();
}
async function Ya(e, t) {
  const n = o.editor.getModel().getValue();
  let s;
  try {
    s = await R("/api/patch", { base: n, edits: e });
  } catch (a) {
    O(t, "⚠️ 適用計算に失敗: " + a.message);
    return;
  }
  if (s.results.forEach((a, c) => {
    a.ok ? a.method !== "exact" && O(t, `ℹ️ 修正${c + 1}: ${a.method} マッチで補正適用`) : O(t, `⚠️ 修正${c + 1}: ${a.error.split(`
`)[0]}`);
  }), s.applied === 0) {
    O(t, "⚠️ 適用できる修正がありませんでした。本文が変わっていないか確認してください。");
    return;
  }
  const i = s.mdflow_warnings || [];
  i.forEach((a) => O(t, `⚠️ mdflow: ${a}`));
  let r = `差分プレビュー：${s.applied}/${e.length} 箇所を適用（右は編集して調整可）`;
  i.length && (r += ` ⚠ mdflow: ${i.length}件の警告`), In(n, s.content, (a) => {
    const c = o.editor.getModel();
    o.editor.executeEdits(
      "pixie-patch",
      [{ range: c.getFullModelRange(), text: a, forceMoveMarkers: !0 }]
    ), o.editor.focus();
  }, r);
}
function Za() {
  o.pendingTarget?.coll && o.pendingTarget.coll.clear();
  const e = o.editor.getSelection();
  if (!e || e.isEmpty())
    return o.pendingTarget = null, null;
  const t = o.editor.createDecorationsCollection([
    { range: e, options: { className: "pixie-pending-target" } }
  ]);
  return o.pendingTarget = { file: o.currentFile, coll: t }, o.pendingTarget;
}
function Xa(e, t, n) {
  const s = document.createElement("div");
  s.className = "apply-actions";
  const i = document.createElement("button");
  i.className = "insert-btn", i.textContent = "▶ エディタへ反映", i.title = "このメッセージの提案を差分プレビューで確認してから反映する", i.addEventListener("click", () => ki(lo(t), n)), s.appendChild(i), e.appendChild(s), Q();
}
function Ja(e, t, n) {
  const s = [...t.matchAll(/```apply\s*\n([\s\S]*?)```/g)];
  if (!s.length) return !1;
  const i = s[s.length - 1][1].replace(/\n$/, "");
  e.querySelector(".body").textContent = t.replace(/```apply\s*\n[\s\S]*?```/g, "修正案（下のボックス参照）");
  const r = document.createElement("div");
  r.className = "apply-box", r.textContent = i;
  const a = document.createElement("div");
  a.className = "apply-actions";
  const c = document.createElement("button");
  return c.className = "apply-btn", c.textContent = "▶ 差分で反映", c.addEventListener("click", () => ki(i, n)), a.appendChild(c), e.append(r, a), Q(), !0;
}
function ki(e, t) {
  const n = Qa(t), s = o.editor.getModel().getValueInRange(n);
  In(s, e, (i) => {
    o.editor.executeEdits("pixie-apply", [{ range: n, text: i, forceMoveMarkers: !0 }]), t?.coll && t.coll.clear(), o.editor.focus();
  });
}
function Qa(e) {
  const t = o.editor.getModel();
  if (e?.coll && e.file === o.currentFile) {
    const n = e.coll.getRange(0);
    if (n) return n;
  }
  return t.getFullModelRange();
}
let J = null, bt = null, be = [], ve = null;
function In(e, t, n, s, i = {}) {
  un("editor");
  const r = o.monaco;
  l("diff-label").textContent = s || "差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）", l("diff-overlay").classList.remove("hidden"), l("diff-apply").classList.toggle("hidden", !!i.approval), l("diff-cancel").classList.toggle("hidden", !!i.approval), l("diff-close").classList.toggle("hidden", !i.approval), J || (J = r.editor.createDiffEditor(l("diff-editor"), {
    theme: "vs-dark",
    automaticLayout: !0,
    renderSideBySide: !0,
    originalEditable: !1,
    readOnly: !1,
    minimap: { enabled: !1 },
    wordWrap: "on",
    fontSize: 14
  })), J.updateOptions({ readOnly: !n && !i.editable });
  const a = i.lang || (o.currentFile ? mn(o.currentFile) : "markdown"), c = r.editor.createModel(e, a), d = r.editor.createModel(t, a);
  J.setModel({ original: c, modified: d }), bt = n ? () => {
    const u = J.getModel().modified.getValue();
    ue(), n(u);
  } : null, J.focus();
}
function ue() {
  if (l("diff-overlay").classList.add("hidden"), bt = null, be = [], ve = null, l("diff-tabs").innerHTML = "", l("diff-approve-edit").classList.add("hidden"), J) {
    const e = J.getModel();
    J.setModel(null), e && (e.original.dispose(), e.modified.dispose());
  }
}
function ec(e, t = null) {
  be = e, ve = t, l("diff-approve-edit").classList.toggle("hidden", !t);
  const n = l("diff-tabs");
  n.innerHTML = "", e.length > 1 && e.forEach((s, i) => {
    const r = document.createElement("button");
    r.type = "button", r.textContent = (s.path || "").split("/").pop() || s.path, r.title = s.path, r.addEventListener("click", () => ms(i)), n.appendChild(r);
  }), ms(0);
}
function ms(e) {
  const t = be[e];
  t && ([...l("diff-tabs").children].forEach((n, s) => n.classList.toggle("active", s === e)), In(
    t.before,
    t.after,
    null,
    `承認確認: ${t.path}（左＝現在 ／ 右＝書き込まれる内容${ve ? "・右を編集して修正して承認できます" : ""}）`,
    { approval: !0, editable: !!ve, lang: mn(t.path || "") }
  ));
}
async function tc(e, t, n) {
  return yi("/api/approve-edit", { id: e, path: t, content: n }, "✓ 修正して承認しました（編集内容を適用）。");
}
function Ci(e) {
  un("editor"), o.planText = e, Ke(l("plan-body"), e), l("plan-label").textContent = "実行計画（承認するまでファイルは変更されません）", l("plan-overlay").classList.remove("hidden");
}
function Li() {
  l("plan-overlay").classList.add("hidden"), l("plan-body").innerHTML = "", o.planText = "";
}
async function nc() {
  const e = o.planText;
  if (!e) return;
  if (Li(), Fe()) {
    o.planExecNext = !0, N("system", "✓ 計画を承認しました。実装を開始します（書き込みは引き続き承認制）。"), l("chat-input").value = `以下の実行計画を承認しました。この計画のとおりに実装してください。計画から外れる変更が必要になったら、実行する前に知らせてください。

` + e, await Le();
    return;
  }
  if (!await vn("code", { keepMessages: !0 })) {
    Ci(e);
    return;
  }
  N("system", "計画を承認しました。Codeモードで実行します。"), l("chat-input").value = `以下の実行計画を承認しました。この計画のとおりに実装してください。計画から外れる変更が必要になったら、実行する前に知らせてください。

` + e, await Le();
}
function hs() {
  l("plan-overlay").classList.add("hidden"), N("system", "✕ 計画の修正を依頼します。どこをどう直したいかチャットに書いてください。"), l("chat-input").focus();
}
async function Se(e) {
  const t = await z("/api/workspace/dirs?path=" + encodeURIComponent(e || ""));
  if (!t) return;
  l("root-input").value = t.cwd || "", Cn();
  const n = l("root-drives");
  n.innerHTML = "";
  for (const i of t.drives || []) {
    const r = document.createElement("button");
    r.textContent = i, r.classList.toggle("active", (t.cwd || "").toLowerCase().startsWith(i.toLowerCase().slice(0, 2))), r.addEventListener("click", () => Se(i)), n.appendChild(r);
  }
  const s = l("root-dirlist");
  if (s.innerHTML = "", t.parent && t.parent !== t.cwd) {
    const i = document.createElement("li");
    i.textContent = "⬆ ..（上のフォルダへ）", i.addEventListener("click", () => Se(t.parent)), s.appendChild(i);
  }
  for (const i of t.dirs || []) {
    const r = document.createElement("li");
    r.textContent = i.name, r.addEventListener("click", () => Se(i.path)), s.appendChild(r);
  }
}
async function ln() {
  l("root-modal").classList.remove("hidden"), await Qs(), ti(), await Se(l("root-path").textContent || "");
}
function lt() {
  l("root-modal").classList.add("hidden");
}
const sc = () => An(l("root-input").value.trim());
async function An(e) {
  if (!e) return;
  if (we) {
    alert("⚠️ 置換が完了してから作業フォルダを切り替えてください。");
    return;
  }
  if (o.streaming) {
    alert("⚠️ 実行中は作業フォルダを切り替えられません。");
    return;
  }
  const t = $.begin("switching");
  if (!t) return;
  let n = "", s;
  try {
    for (; o.savePromise; ) await o.savePromise;
    if (await Mt(), o.dirty && !confirm("未保存の変更があります。破棄して作業フォルダを切り替えますか？")) return;
    te = !0, s = o.editor.getOption(o.monaco.editor.EditorOption.readOnly), o.editor.updateOptions({ readOnly: !0 }), j++, xt?.reset(), ot++, ye++;
    let i;
    try {
      i = await R("/api/workspace", { path: e });
    } catch (r) {
      n = r.message, alert("⚠️ フォルダ変更に失敗: " + r.message);
      return;
    }
    lt(), o.currentFile = null, o.baseMtime = null, Ro(), fa(), o.collapsedDirs.clear(), o.knownDirs.clear(), o.changedPaths.clear(), o.saveError = null, o.editor.setValue(""), Lt(), q(), l("current-file").textContent = "（ファイル未選択）", _e(), Ws(), await Hs(), gn(), await Ct(), await G(), B() ? (o.sessionId = ze(), $e(), l("approval").classList.add("hidden"), o.assistantEl = null, await yn()) : Ei(t), N("system", "作業フォルダを変更: " + (i.workspace || e));
  } catch (i) {
    return n = i.message, alert(i.message), !1;
  } finally {
    te = !1, s !== void 0 && o.editor.updateOptions({ readOnly: s }), $.finish(t, n);
  }
}
async function ic() {
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
      await G(), await oe(n.path);
    } catch (n) {
      alert("エラー: " + n.message);
    } finally {
      t.disabled = !1, t.textContent = "🌐+";
    }
  }
}
function he(e) {
  const t = l("cp-bar-status");
  t && (t.textContent = e);
}
async function rc() {
  he("ブラウザを起動中…");
  try {
    const e = await (await fetch("/api/copilot/open", { method: "POST" })).json();
    he(e.ok ? "Copilot を開きました。ブラウザで対話してください。" : e.error);
  } catch (e) {
    he("エラー: " + e.message);
  }
}
async function oc() {
  if (o.streaming) return;
  const e = l("cp-bar-import-btn");
  e.disabled = !0, he("会話を取得中…");
  let t;
  try {
    t = await (await fetch("/api/copilot/read", { method: "POST" })).json();
  } catch (i) {
    he("エラー: " + i.message), e.disabled = !1;
    return;
  }
  if (e.disabled = !1, !t.ok) {
    he(t.error);
    return;
  }
  he("");
  const n = l("chat-input"), s = n.value.trim() || "以下は私が Microsoft Copilot と交わした会話ログです。内容を整理して、ノートとして残せる Markdown のまとめを作ってください。";
  n.value = s + `

---

# Copilot 会話ログ

` + t.transcript, await Le();
}
async function ac() {
  l("settings-modal").classList.remove("hidden"), await Promise.all([
    cc(),
    Mi(),
    Si(),
    _i()
  ]);
}
async function cc() {
  const e = l("settings-model");
  if (!e) return;
  const t = await re("/api/servers").catch(() => ({ servers: [], active: 0 }));
  e.innerHTML = "", (t.servers || []).forEach((n, s) => {
    const i = document.createElement("option");
    i.value = s, i.textContent = `${n.name} — ${n.model || "(model?)"}`, s === t.active && (i.selected = !0), e.appendChild(i);
  }), e.onchange = async () => {
    try {
      await R("/api/settings", { active_server: Number(e.value) });
    } catch (n) {
      alert("⚠️ 設定を保存できません: " + n.message);
    }
    await Promise.all([Mi(), Si(), Ct()]);
  };
}
async function Si() {
  const e = await re("/api/settings").catch(() => ({})), t = l("settings-think-budget");
  t && (e.think_budget_min != null && (t.min = e.think_budget_min), e.think_budget_max != null && (t.max = e.think_budget_max), e.think_budget_sec != null && (t.value = e.think_budget_sec), l("settings-think-budget-status").textContent = "");
  const n = l("settings-context-length");
  n && (e.context_length_min != null && (n.min = e.context_length_min), e.context_length_max != null && (n.max = e.context_length_max), e.context_length != null && (n.value = e.context_length || 0), l("settings-context-length-status").textContent = "");
}
async function gs() {
  const e = l("settings-think-budget"), t = l("settings-think-budget-status");
  t.textContent = "保存中…";
  try {
    const n = await R("/api/settings", { think_budget_sec: Number(e.value) });
    e.value = n.think_budget_sec, t.textContent = `✓ ${n.think_budget_sec} 秒にしました`;
  } catch (n) {
    t.textContent = "⚠ " + n.message;
  }
}
async function ws() {
  const e = l("settings-context-length"), t = l("settings-context-length-status");
  t.textContent = "保存中…";
  try {
    const n = await R("/api/settings", { context_length: Number(e.value) });
    e.value = n.context_length || 0, t.textContent = n.context_length ? `✓ ${n.context_length.toLocaleString()} トークンにしました（会話は作り直し）` : "✓ 自動（バックエンドの取得値）に戻しました";
  } catch (n) {
    t.textContent = "⚠ " + n.message;
  }
}
async function Mi() {
  const e = l("settings-llm-model");
  if (!e) return;
  e.innerHTML = "", e.disabled = !0;
  const t = document.createElement("option");
  t.textContent = "(取得中…)", e.appendChild(t);
  const n = await re("/api/models").catch(() => ({ models: [] })), s = n.models || [];
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
        await R("/api/settings", { model: e.value });
      } catch (i) {
        alert("⚠️ モデルを保存できません: " + i.message);
      }
      await Ct();
    }
  };
}
function Wt() {
  l("settings-modal").classList.add("hidden");
}
async function _i() {
  const e = await re("/api/copilot").catch(() => ({}));
  l("settings-copilot").checked = !!e.enabled, o.copilotEnabled = !!e.enabled, wn();
  const t = [];
  e.enabled && t.push("オン"), e.script_ok ? e.python_ok ? e.enabled && t.push("PrayLight OK — 未ログインなら下のボタンでブラウザを開いてログイン") : t.push("⚠ PrayLight の .venv Python 未検出") : t.push("⚠ PrayLight 未検出: " + (e.praylight_dir || "?")), l("settings-copilot-status").textContent = t.join(" / ");
}
async function lc(e) {
  try {
    const t = await R("/api/copilot/enable", { enabled: l("settings-copilot").checked });
    o.copilotEnabled = !!t.enabled, wn();
  } catch (t) {
    alert("⚠️ 設定を保存できません: " + t.message), e.target.checked = !e.target.checked;
  }
  await _i();
}
async function dc() {
  l("settings-copilot-status").textContent = "起動中…";
  const e = await R("/api/copilot/open").catch(() => ({ ok: !1, error: "通信エラー" }));
  l("settings-copilot-status").textContent = e.ok ? "ブラウザを開きました。Copilot にログインしてください。" : e.error || "起動失敗";
}
function uc() {
  xt = Wi({
    getSnapshot: () => ({
      current_file: o.currentFile || "",
      current_content: o.currentFile ? o.editor.getValue() : null,
      generation: j
    }),
    isCurrent: (e) => e === j && !te,
    canSend: () => dn.ready && !o.streaming && o.copilotEnabled && !te,
    send: (e) => Le(e)
  }), l("send-btn").addEventListener("click", () => o.streaming ? Ua() : Le()), l("new-session-btn").addEventListener("click", Ei), l("sessions-btn").addEventListener("click", xi), l("sessions-close").addEventListener("click", () => l("sessions-modal").classList.add("hidden")), l("sessions-modal").addEventListener("click", (e) => {
    e.target === l("sessions-modal") && l("sessions-modal").classList.add("hidden");
  }), $e(), _e(), l("save-btn").addEventListener("click", () => Jt()), l("preview-btn").addEventListener("click", sn), l("richcopy-btn").addEventListener("click", ra), l("preview").addEventListener("wheel", oi, { passive: !0 }), l("preview").addEventListener("scroll", () => {
    qo(), de && li(o.editor.getModel(), de.range);
  }, { passive: !0 }), document.addEventListener("selectionchange", () => {
    clearTimeout(os), os = setTimeout(zo, Vo);
  }), jo(), aa(), l("refresh-btn").addEventListener("click", () => G()), l("autonomous-check").addEventListener("change", async () => {
    const e = l("autonomous-check"), t = l("verification-command");
    if (!e.checked || t.value.trim()) return;
    const n = j, s = o.sessionId, i = await z("/api/workspace/verification-command");
    i && n === j && s === o.sessionId && e.checked && !t.value.trim() && !o.streaming && (t.value = i.command || "");
  }), l("file-search").addEventListener("input", ua), l("search-case").addEventListener("change", () => _n(l("file-search").value)), l("replace-toggle").addEventListener("click", ma), l("replace-preview-btn").addEventListener("click", () => Ot(!0)), l("replace-run-btn").addEventListener("click", () => Ot(!1)), l("replace-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Ot(!0));
  }), l("nav-back").addEventListener("click", Qt), l("nav-fwd").addEventListener("click", en), l("recent-btn").addEventListener("click", (e) => {
    e.stopPropagation(), tn();
  }), l("history-btn").addEventListener("click", Io), l("hist-close").addEventListener("click", at), l("hist-restore").addEventListener("click", Fo), l("hist-modal").addEventListener("click", (e) => {
    e.target === l("hist-modal") && at();
  }), Me(), l("mode-btn").addEventListener("click", go), l("code-style-btn").addEventListener("click", ho), l("plan-approve").addEventListener("click", nc), l("plan-reject").addEventListener("click", hs), l("note-btn").addEventListener("click", wa), l("chat-clear-btn").addEventListener("click", wo), ka(), l("ref-add-btn").addEventListener("click", Ca), l("pick-cancel").addEventListener("click", ct), l("pick-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Be(l("pick-input").value.trim()));
  }), l("pick-modal").addEventListener("click", (e) => {
    e.target === l("pick-modal") && ct();
  }), l("diff-apply").addEventListener("click", () => {
    bt && bt();
  }), l("diff-cancel").addEventListener("click", ue), l("diff-close").addEventListener("click", ue), l("diff-approve-edit").addEventListener("click", () => {
    if (!ve || !J) return;
    const e = J.getModel().modified.getValue();
    tc(ve.id, ve.path, e);
  }), l("chat-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.ctrlKey || e.metaKey) && (e.preventDefault(), Le());
  }), l("new-file-btn").addEventListener("click", () => pt("file")), l("new-folder-btn").addEventListener("click", () => pt("dir")), l("web2md-btn").addEventListener("click", ic), l("cp-bar-open-btn").addEventListener("click", rc), l("cp-bar-import-btn").addEventListener("click", oc), document.addEventListener("click", We), xo(), l("root-project-btn").addEventListener("click", ln), l("folder-btn").addEventListener("click", ln), l("root-cancel").addEventListener("click", lt), l("root-ok").addEventListener("click", sc), l("places-btn").addEventListener("click", (e) => {
    e.stopPropagation(), Bo();
  }), l("root-fav-btn").addEventListener("click", () => {
    const e = l("root-input").value.trim();
    e && ni(e);
  }), l("root-input").addEventListener("input", Cn), l("root-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Se(l("root-input").value.trim()));
  }), l("root-modal").addEventListener("click", (e) => {
    e.target === l("root-modal") && lt();
  }), l("settings-btn").addEventListener("click", ac), l("settings-close").addEventListener("click", Wt), l("settings-think-budget-save").addEventListener("click", gs), l("settings-think-budget").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), gs());
  }), l("settings-context-length-save").addEventListener("click", ws), l("settings-context-length").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), ws());
  }), l("settings-copilot").addEventListener("change", lc), l("settings-copilot-open").addEventListener("click", dc), l("settings-modal").addEventListener("click", (e) => {
    e.target === l("settings-modal") && Wt();
  }), window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault(), Jt();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault(), sn();
      return;
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault(), e.key === "ArrowLeft" ? Qt() : en();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "e") {
      e.preventDefault(), tn();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "h" && de) {
      e.preventDefault(), di();
      return;
    }
    e.key === "Escape" && !l("hist-modal").classList.contains("hidden") ? at() : e.key === "Escape" && !l("root-modal").classList.contains("hidden") ? lt() : e.key === "Escape" && !l("pick-modal").classList.contains("hidden") ? ct() : e.key === "Escape" && !l("cf-modal").classList.contains("hidden") ? l("cf-modal").classList.add("hidden") : e.key === "Escape" && !l("sessions-modal").classList.contains("hidden") ? l("sessions-modal").classList.add("hidden") : e.key === "Escape" && !l("settings-modal").classList.contains("hidden") ? Wt() : e.key === "Escape" && !l("diff-overlay").classList.contains("hidden") ? ue() : e.key === "Escape" && !l("plan-overlay").classList.contains("hidden") && hs();
  }), window.addEventListener("blur", () => {
    Mt();
  }), window.addEventListener("beforeunload", (e) => {
    o.dirty && (e.preventDefault(), e.returnValue = "");
  }), wc(), vc(), yc();
}
const fc = "pixie.splitRatio", pc = "pixie.previewRatio", mc = 320, hc = 160;
function $i({ divider: e, pane: t, container: n, min: s, key: i, after: r }) {
  const a = (f) => {
    const h = n.clientWidth - s - e.offsetWidth;
    t.style.flex = `0 0 ${Math.max(s, Math.min(f, Math.max(s, h)))}px`, o.editor?.layout(), r?.();
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
let Pn = null;
function gc() {
  Pn?.restore();
}
function wc() {
  const { restore: e } = $i({
    divider: l("divider"),
    pane: l("left-pane"),
    container: l("split"),
    min: mc,
    key: fc,
    // 左ペインが細くなるとプレビュー側が押し出される。エディタは固定幅（flex-shrink:0）
    // なので放っておくとプレビューが 0px に潰れる。現在幅を入れ直して再クランプする。
    after: () => {
      ee() && Pn?.reclamp();
    }
  });
  e();
}
function vc() {
  Pn = $i({
    divider: l("preview-divider"),
    pane: l("editor"),
    container: l("edit-area"),
    min: hc,
    key: pc
  });
}
const Ut = "pixie.filemgrHeight", vs = 80;
function yc() {
  const e = l("v-divider"), t = l("filemgr");
  if (!e || !t) return;
  const n = (r) => {
    t.style.flex = `0 0 ${r}px`, t.style.maxHeight = "none";
  }, s = Number(localStorage.getItem(Ut));
  s >= vs && n(s);
  let i = !1;
  e.addEventListener("mousedown", (r) => {
    r.preventDefault(), i = !0, document.body.style.cursor = "row-resize";
  }), window.addEventListener("mouseup", () => {
    i && (i = !1, document.body.style.cursor = "", localStorage.setItem(Ut, String(t.getBoundingClientRect().height)));
  }), window.addEventListener("mousemove", (r) => {
    if (!i) return;
    const a = t.getBoundingClientRect().top, c = l("right-pane").getBoundingClientRect().bottom - a - 220;
    n(Math.max(vs, Math.min(r.clientY - a, c)));
  }), e.addEventListener("dblclick", () => {
    t.style.flex = "", t.style.maxHeight = "", localStorage.removeItem(Ut);
  });
}
