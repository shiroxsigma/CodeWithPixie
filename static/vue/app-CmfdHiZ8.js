import { c as T, w as Oi, a as pn, s as pt, b as Hi, d as mn, e as xs, f as ji } from "./main-BmAFdeT6.js";
class Wi {
  lifecycle = !1;
  committed = "";
  active = null;
  get text() {
    return this.committed + (this.active?.text || "");
  }
  start(t) {
    this.active && (this.committed += this.active.text), this.lifecycle = !0, this.active = { id: t, text: "" };
  }
  append(t) {
    this.active ? this.active.text += t : (!this.lifecycle || t.trim()) && (this.committed += t);
  }
  end(t, n, s = !1) {
    if (!this.active || this.active.id !== t) return "";
    const i = this.active.text;
    return this.active = null, n && !s ? i : (this.committed += i, "");
  }
}
class se extends Error {
  constructor(t, n) {
    super(t), this.name = "ApiError", this.status = n;
  }
}
async function J(e, t) {
  let n;
  try {
    n = await fetch(e, t);
  } catch {
    throw new se(`サーバに接続できません（${e}）`, 0);
  }
  if (!n.ok) {
    const s = await n.json().catch(() => ({}));
    throw new se(s.detail || n.statusText || `HTTP ${n.status}`, n.status);
  }
  return n.json();
}
const oe = (e) => J(e), A = (e, t) => J(e, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: t === void 0 ? void 0 : JSON.stringify(t)
});
async function G(e, t) {
  try {
    return await J(e, t);
  } catch (n) {
    alert("⚠️ " + n.message);
    return;
  }
}
const l = (e) => document.getElementById(e);
function Pt(e, t = "") {
  const n = t.trim();
  return n ? `# 修正指示

${n}

${e.content}` : e.content;
}
function Ui({ getSnapshot: e, isCurrent: t, canSend: n, send: s }) {
  const i = l("source-bundle-modal"), r = l("source-bundle-instruction"), a = l("source-bundle-preview"), c = l("source-bundle-status");
  let d = null, u, f = 0, h = !1, p = !1;
  const g = [], y = (S, $, F) => {
    S.addEventListener($, F), g.push(() => S.removeEventListener($, F));
  };
  function E() {
    const S = !h && d?.file_count > 0 && t(u);
    l("source-bundle-copy").disabled = !S, l("source-bundle-download").disabled = !S, l("source-bundle-send").disabled = !S || !r.value.trim() || !n(), l("source-bundle-refresh").disabled = h, a.value = d ? Pt(d, r.value) : "";
  }
  function L() {
    i.classList.add("hidden"), l("source-bundle-btn").focus();
  }
  function v() {
    f++, h = !1, d = null, u = void 0, r.value = "", c.textContent = "", l("source-bundle-root").textContent = "", l("source-bundle-summary").textContent = "", l("source-bundle-skips-list").replaceChildren(), l("source-bundle-skips").classList.add("hidden"), l("source-bundle-warning").classList.add("hidden"), i.classList.add("hidden"), E();
  }
  async function b() {
    const S = e(), $ = ++f;
    u = S.generation, h = !0, d = null, c.textContent = "ソースを収集中…", l("source-bundle-root").textContent = "", l("source-bundle-summary").textContent = "", l("source-bundle-warning").classList.add("hidden"), l("source-bundle-skips").classList.add("hidden"), E();
    try {
      const F = await A("/api/workspace/source-bundle", {
        current_file: S.current_file,
        current_content: S.current_content
      });
      if (p || $ !== f) return;
      if (!t(S.generation)) {
        v();
        return;
      }
      d = F, l("source-bundle-root").textContent = F.root, l("source-bundle-summary").textContent = `${F.file_count} ファイル・${Number(F.total_bytes).toLocaleString()} バイト`;
      const k = l("source-bundle-warning");
      k.textContent = F.truncated ? "サイズまたは件数の上限に達しました。一部のソースは含まれていません。" : "", k.classList.toggle("hidden", !F.truncated);
      const I = F.skipped || [];
      l("source-bundle-skips").classList.toggle("hidden", !I.length), l("source-bundle-skips-summary").textContent = `除外されたファイル（${I.length}件）`;
      const B = l("source-bundle-skips-list");
      B.replaceChildren();
      for (const U of I) {
        const j = document.createElement("li");
        j.textContent = `${U.path}: ${U.reason}`, B.appendChild(j);
      }
      c.textContent = F.file_count ? "コピー・保存・送信の準備ができました。" : "まとめられるソースがありません。";
    } catch (F) {
      if (p || $ !== f) return;
      if (!t(S.generation)) {
        v();
        return;
      }
      c.textContent = "ソースをまとめられませんでした: " + F.message;
    } finally {
      !p && $ === f && (h = !1, E());
    }
  }
  function C() {
    return d && !h && t(u) && d.file_count > 0 ? !0 : (E(), !1);
  }
  async function _() {
    if (C())
      try {
        await navigator.clipboard.writeText(Pt(d, r.value)), c.textContent = "コピーしました。Copilot に貼り付けられます。";
      } catch {
        c.textContent = "コピーできませんでした。プレビューを選択してコピーするか、ファイルに保存してください。";
      }
  }
  function P() {
    if (!C()) return;
    const S = URL.createObjectURL(new Blob([Pt(d, r.value)], { type: "text/markdown;charset=utf-8" })), $ = document.createElement("a");
    $.href = S, $.download = d.filename, document.body.appendChild($), $.click(), $.remove(), setTimeout(() => URL.revokeObjectURL(S), 1e3), c.textContent = "ファイルに保存しました。Copilot に添付できます。";
  }
  async function D() {
    if (!C() || (E(), !r.value.trim() || !n())) return;
    const S = {
      message: "/copilot_simple " + r.value.trim(),
      sourceBundle: { filename: d.filename, content: d.content },
      attachmentLabel: `${d.filename}（${d.file_count} ファイル）`
    }, $ = s(S);
    L(), await $;
  }
  return y(l("source-bundle-btn"), "click", () => {
    i.classList.remove("hidden"), r.focus(), b();
  }), y(r, "input", E), y(l("source-bundle-close"), "click", L), y(l("source-bundle-refresh"), "click", b), y(l("source-bundle-copy"), "click", _), y(l("source-bundle-download"), "click", P), y(l("source-bundle-send"), "click", D), y(i, "click", (S) => {
    S.target === i && L();
  }), y(window, "focus", E), y(window, "keydown", (S) => {
    S.key === "Escape" && !i.classList.contains("hidden") && (S.preventDefault(), L());
  }), E(), { reset: v, update: E, dispose() {
    p = !0, v(), g.forEach((S) => S());
  } };
}
const me = globalThis.jsyaml || null, Es = () => me !== null, qi = "fill:#ff9999,stroke:#333,stroke-width:2px", Vi = "fill:#2a2a2a,stroke:#555,color:#888", Vn = /^```[ \t]*(?:yaml[ \t]+)?mdflow-mapping[ \t]*\n([\s\S]*?)^```/gm, ks = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/, Ki = /^﻿?---[ \t]*\r?\n/, zi = /^\s*%%\s*id\s*:\s*(\S+)/m;
function Gi(e) {
  const t = zi.exec(e);
  return t ? t[1] : "";
}
function Yi(e) {
  const t = [];
  let n = {}, s = e, i = 0;
  const r = ks.exec(e);
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
    Vn.lastIndex = 0;
    let u, f = 0;
    for (; (u = Vn.exec(s)) !== null; ) {
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
      for (const [y, E] of Object.entries(h.presets || {})) {
        const L = E || {};
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
        activeStyle: String(g.active ?? qi),
        inactiveStyle: String(g.inactive ?? Vi)
      });
    }
  }
  return { meta: n, body: s, bodyOffset: i, selected: c, mappings: d, warnings: t };
}
function Zi(e, t) {
  return t && e.find((n) => n.diagramId === t) || null;
}
class ke extends Error {
}
function Xi(e) {
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
const et = (e) => typeof e == "number" || typeof e == "boolean";
function Ji(e, t, n) {
  if (e === "==" || e === "!=") {
    const s = et(t) && et(n) ? Number(t) === Number(n) : t === n;
    return e === "==" ? s : !s;
  }
  if (et(t) && et(n))
    t = Number(t), n = Number(n);
  else if (!(typeof t == "string" && typeof n == "string")) return !1;
  return e === "<" ? t < n : e === "<=" ? t <= n : e === ">" ? t > n : t >= n;
}
function Qi(e, t) {
  if (e = (e || "").trim(), !e) return !0;
  const n = Xi(e);
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
      const y = r().v, E = f();
      g && !Ji(y, p, E) && (g = !1), p = E;
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
function er(e, t, n) {
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
      i = Qi(s.when, t || {});
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
const Kn = /\b([A-Za-z_][\w-]*)\s*[\[({]/g, zn = /([A-Za-z_][\w-]*)\s*(?:-{2,3}>|-{2,3}|={2,3}>|-\.->|-\.-)\s*(?:\|[^|]*\|\s*)?([A-Za-z_][\w-]*)/g, tr = /^\s*(graph|flowchart)\b/i, Gn = /* @__PURE__ */ new Set([
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
function Cs(e) {
  for (const t of e.split(`
`)) {
    const n = t.trim();
    if (!(!n || n.startsWith("%%")))
      return tr.test(n);
  }
  return !1;
}
function Ls(e) {
  const t = /* @__PURE__ */ new Set();
  for (const n of e.split(`
`)) {
    const s = n.trim();
    if (!s || s.startsWith("%%")) continue;
    zn.lastIndex = 0;
    let i;
    for (; (i = zn.exec(s)) !== null; )
      for (const r of [i[1], i[2]]) Gn.has(r) || t.add(r);
    for (Kn.lastIndex = 0; (i = Kn.exec(s)) !== null; )
      Gn.has(i[1]) || t.add(i[1]);
  }
  return [...t];
}
function nr(e, t, n, s = "mdflowActive", i = null) {
  const r = e.replace(/\n+$/, "");
  if (!t?.length) return { code: r, missing: [] };
  let a = [], c = [...new Set(t)];
  const d = Cs(e), u = d ? Ls(e) : [];
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
function Yn(e) {
  return me ? me.dump(String(e), { lineWidth: -1 }).trim() : String(e);
}
function sr(e) {
  const t = /^\s*(.+?):(?:\s|$)/.exec(e.replace(/\r$/, ""));
  if (!t) return null;
  let n = t[1].trim();
  const s = n[0];
  return (s === '"' || s === "'") && n.endsWith(s) && n.length >= 2 && (n = n.slice(1, -1)), n;
}
const Ft = (e) => /^\s*/.exec(e)[0].length;
function ir(e, t, n) {
  const s = Yn(t), i = n == null ? null : `${s}: ${Yn(n)}`, r = ks.exec(e);
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
  const a = Ki.exec(e)[0].length, c = r[1], d = [];
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
    if (b.trim() && Ft(b) === 0) break;
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
  const p = Ft(d[h].raw), g = " ".repeat(p + 2);
  let y = -1, E = null;
  for (let v = h + 1; v < d.length; v++) {
    const b = d[v].raw.replace(/\r$/, "");
    if (b.trim() && Ft(b) <= p) break;
    if (b.trim() && (E == null && (E = /^\s*/.exec(b)[0]), sr(b) === t)) {
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
  return { start: L, end: L, text: `${E ?? g}${i}
` };
}
const rr = 2;
function Ss(e) {
  return (e || "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "figure";
}
function or(e, t) {
  const n = /^\s*%%\s*id\s*:\s*(\S+)/m.exec(e || "");
  return Ss(n ? n[1] : `figure-${t + 1}`);
}
function ar(e) {
  const t = e.getAttribute("viewBox")?.trim().split(/[\s,]+/);
  if (t?.length === 4) {
    const s = parseFloat(t[2]), i = parseFloat(t[3]);
    if (Number.isFinite(s) && Number.isFinite(i) && s > 0 && i > 0) return { width: s, height: i };
  }
  const n = e.getBoundingClientRect();
  return { width: Math.max(1, n.width), height: Math.max(1, n.height) };
}
function cr(e) {
  return new Promise((t, n) => {
    const s = new Image();
    s.onload = () => t(s), s.onerror = () => n(new Error("SVG を画像として読み込めませんでした。")), s.src = e;
  });
}
async function Ms(e, { scale: t = rr, background: n = null } = {}) {
  const { width: s, height: i } = ar(e), r = e.cloneNode(!0);
  r.setAttribute("width", String(s)), r.setAttribute("height", String(i)), r.removeAttribute("style"), r.getAttribute("xmlns") || r.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const a = new XMLSerializer().serializeToString(r), c = URL.createObjectURL(new Blob([a], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const d = await cr(c), u = document.createElement("canvas");
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
function lr(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result).split(",", 2)[1] || ""), s.onerror = () => n(new Error("画像データを読めませんでした。")), s.readAsDataURL(e);
  });
}
async function Zn(e) {
  if (!navigator.clipboard?.write || typeof ClipboardItem > "u")
    throw new Error("このブラウザは画像のクリップボードコピーに対応していません。");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": e })]);
}
const dr = [
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
], ur = ["<==>", "<-.->", "<-->", "<->", "-.->", "-.-", "-->", "---", "==>", "===", "--x", "--o"], _s = [
  { open: "-.", closers: [[".->", "-.->"], [".-", "-.-"]] },
  { open: "--", closers: [["-->", "-->"], ["---", "---"], ["--x", "--x"], ["--o", "--o"]] },
  { open: "==", closers: [["==>", "==>"], ["===", "==="], ["==x", "==x"], ["==o", "==o"]] }
], fr = _s.flatMap((e) => e.closers.map(([t]) => t)), pr = /^\s*(?:flowchart(?:-elk)?|graph)(?:\s+[A-Za-z]{2})?\s*;?\s*(?:%%.*)?$/i, mr = /^\s*(classDef|class|style|linkStyle|click|direction|accTitle|accDescr|title)\b/i, hr = /^[A-Za-z0-9_\u0080-\uFFFF][A-Za-z0-9_.\-\u0080-\uFFFF]*/, gr = /^(\s*class\s+)([^\s;]+)(\s+.*)$/i, wr = /^(\s*style\s+)([^\s;,]+)(\s+.*)$/i, vr = /^(\s*linkStyle\s+)(\d+(?:\s*,\s*\d+)*)(\s+.*)$/i;
function hn(e) {
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
      nt(t, i, r, a);
      continue;
    }
    if (pr.test(i)) {
      t.hasHeader = !0, nt(t, i, r, a);
      continue;
    }
    if (/^\s*(subgraph|end)\b/i.test(i))
      return t.supported = !1, t.reason = "subgraph を含む図は編集できません", t;
    if (mr.test(i)) {
      nt(t, i, r, a);
      continue;
    }
    const c = xr(i, r, a);
    if (!c) {
      nt(t, i, r, a);
      continue;
    }
    if (!t.indent && c.type !== "other" && (t.indent = c.indent), t.statements.push(c), c.type === "node")
      Xn(t, c.ref);
    else {
      c.refs.forEach((d) => Xn(t, d));
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
const tt = /* @__PURE__ */ new Map(), yr = 100;
function br(e) {
  const t = tt.get(e);
  if (t) return t;
  const n = hn(e), s = { ok: n.supported, reason: n.reason };
  return tt.size >= yr && tt.clear(), tt.set(e, s), s;
}
function nt(e, t, n, s) {
  const i = { type: "other", start: n, end: s, indent: $s(t) };
  let r;
  (r = gr.exec(t)) ? i.cls = {
    ids: r[2].split(",").map((a) => a.trim()).filter(Boolean),
    span: { start: n + r[1].length, end: n + r[1].length + r[2].length }
  } : (r = wr.exec(t)) ? i.styleNode = r[2] : (r = vr.exec(t)) && (i.link = {
    indices: r[2].split(",").map((a) => parseInt(a, 10)),
    span: { start: n + r[1].length, end: n + r[1].length + r[2].length }
  }), e.statements.push(i);
}
function $s(e) {
  const t = /^([ \t]*)/.exec(e);
  return t ? t[1] : "";
}
function xr(e, t, n, s) {
  const i = $s(e), r = { pos: i.length }, a = () => {
    for (; r.pos < e.length && /\s/.test(e[r.pos]); ) r.pos++;
  }, c = () => t + r.pos;
  function d() {
    a();
    const L = hr.exec(e.slice(r.pos));
    if (!L) return null;
    let v = L[0];
    const b = v.search(/--|-\.|\.-/);
    if (b > 0 && (v = v.slice(0, b)), v = v.replace(/[-.]+$/, ""), !v) return null;
    const C = c();
    r.pos += v.length;
    const _ = { id: v, span: { start: C, end: C + v.length }, def: null };
    for (const [P, D] of dr) {
      if (!e.startsWith(P, r.pos)) continue;
      const S = r.pos + P.length;
      let $ = -1, F = !1, k = S;
      if (e[S] === '"') {
        F = !0, k = S + 1;
        let j = k;
        for (; j < e.length; ) {
          if (e[j] === "\\" && e[j + 1] === '"') {
            j += 2;
            continue;
          }
          if (e[j] === '"') {
            $ = j;
            break;
          }
          j++;
        }
        if ($ < 0 || !e.startsWith(D, $ + 1)) return null;
      } else {
        const j = e.indexOf(D, S);
        if (j < 0) return null;
        $ = j;
      }
      const I = $ + (F ? 1 : 0) + D.length;
      let B = I;
      const U = /^:::[A-Za-z0-9_-]+/.exec(e.slice(I));
      return U && (B = I + U[0].length), _.def = {
        label: e.slice(k, $),
        quoted: F,
        shape: [P, D],
        cls: U ? U[0] : "",
        labelSpan: { start: t + k, end: t + $ },
        span: { start: C, end: t + B },
        raw: e.slice(C - t, B)
      }, r.pos = B, _.span = { start: C, end: t + B }, _;
    }
    return _;
  }
  function u() {
    a();
    for (const L of ur) {
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
    for (const L of _s) {
      if (!e.startsWith(L.open, r.pos)) continue;
      const v = c(), b = r.pos + L.open.length;
      let C = -1, _ = "", P = "";
      for (let k = b; k < e.length && C < 0; k++)
        for (const [I, B] of L.closers)
          if (e.startsWith(I, k)) {
            C = k, _ = I, P = B;
            break;
          }
      if (C < 0) continue;
      const D = e.slice(b, C);
      if (!D.trim()) continue;
      r.pos = C + _.length;
      const S = D.length - D.replace(/^\s+/, "").length, $ = D.trim(), F = t + b + S;
      return {
        text: P,
        // mid があるものは「中置ラベル形式」。raw をそのまま書き戻せば見た目が保たれる。
        mid: { open: L.open, close: _ },
        raw: e.slice(v - t, r.pos),
        span: { start: v, end: c() },
        label: $,
        labelSpan: { start: F, end: F + $.length },
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
  const y = [p], E = [g];
  for (; ; ) {
    const L = d();
    if (!L) return null;
    if (y.push(L), h()) break;
    const v = u();
    if (!v) return null;
    E.push(v);
  }
  return { type: "edge", start: t, end: n, indent: i, refs: y, arrows: E };
}
function Xn(e, t) {
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
function je(e, t) {
  if (!e) return '" "';
  let n = e.replace(/"/g, "#quot;");
  const s = new Set(t.split(""));
  return (n.includes("|") || [...n].some((i) => s.has(i))) && (n = `"${n}"`), n;
}
function Er(e) {
  return (e || "").replace(/#quot;/g, '"').replace(/#124;/g, "|");
}
const kr = /<br\s*\/?>/gi;
function Jn(e) {
  return Er(e).replace(kr, `
`);
}
function Dt(e) {
  return String(e ?? "").replace(/\r\n?/g, `
`).split(`
`).join("<br/>");
}
function Ts(e) {
  return String(e ?? "").replace(/"/g, "#quot;").replace(/\|/g, "#124;");
}
function Cr(e) {
  return e.mid ? e.raw : e.text + (e.label != null ? `|${e.label}|` : "");
}
function Pe(e) {
  return e.def ? e.def.raw : e.id;
}
function Lr(e) {
  for (let t = 1; ; t++) {
    const n = `N${t}`;
    if (!e.has(n)) return n;
  }
}
function Ns(e, t) {
  const n = e.statements[e.statements.length - 1], s = e.indent || "";
  return n ? { at: n.end, prefix: `
` + s } : { at: 0, prefix: "" };
}
function Sr(e, t, n, s) {
  const i = e.nodes.get(n);
  if (!i) return [];
  const r = Rs(i);
  if (r.length)
    return Ct(r.map((c) => ({
      start: c.labelSpan.start,
      end: c.labelSpan.end,
      text: c.quoted ? s.replace(/"/g, "#quot;") : je(s, c.shape[1])
    })));
  const a = i.firstRef;
  return [{ start: a.span.start, end: a.span.end, text: `${a.id}[${je(s, "]")}]` }];
}
function Rs(e) {
  return e.defs?.length ? e.defs : e.def ? [e.def] : [];
}
function Mr(e, t, n, s, i) {
  const r = e.nodes.get(n);
  if (!r) return [];
  const a = Rs(r);
  if (!a.length) {
    const c = r.firstRef;
    return [{
      start: c.span.start,
      end: c.span.end,
      text: `${c.id}${s}${je(c.id, i)}${i}`
    }];
  }
  return a.every((c) => c.shape[0] === s && c.shape[1] === i) ? [] : Ct(a.map((c) => ({
    start: c.span.start,
    end: c.span.end,
    text: `${n}${s}${c.quoted ? `"${c.label}"` : je(c.label, i)}${i}${c.cls || ""}`
  })));
}
function _r(e, t, n, s) {
  const i = e.edges[n];
  if (!i) return [];
  const r = i.arrow, a = Ts(s);
  return r.mid ? s.trim() ? s.includes("|") || fr.some((d) => s.includes(d)) || s !== s.trim() ? [{ start: r.span.start, end: r.span.end, text: `${r.text}|${a}|` }] : [{ start: r.labelSpan.start, end: r.labelSpan.end, text: a }] : [{ start: r.span.start, end: r.span.end, text: r.text }] : s.trim() ? r.labelSpan ? [{ start: r.labelSpan.start, end: r.labelSpan.end, text: a }] : [{ start: r.span.end, end: r.span.end, text: `|${a}|` }] : r.pipeSpan ? [{ start: r.pipeSpan.start, end: r.pipeSpan.end, text: "" }] : [];
}
function ge(e, t) {
  return e[t.end] === `
` ? { start: t.start, end: t.end + 1, text: "" } : t.start > 0 && e[t.start - 1] === `
` ? { start: t.start - 1, end: t.end, text: "" } : { start: t.start, end: t.end, text: "" };
}
function gn(e, t, n, s = -1) {
  const i = [], r = /* @__PURE__ */ new Set();
  return e.arrows.forEach((a, c) => {
    if (!t.has(c)) return;
    const [d, u] = c === s ? [e.refs[c + 1], e.refs[c]] : [e.refs[c], e.refs[c + 1]];
    i.push(`${Pe(d)} ${Cr(a)} ${Pe(u)}`), r.add(c), r.add(c + 1);
  }), e.refs.forEach((a, c) => {
    a.def && !r.has(c) && !(n && n.has(a.id)) && i.push(Pe(a));
  }), i.map((a) => e.indent + a).join(`
`);
}
function Ct(e) {
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
function Is(e, t, n) {
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
function $r(e, t, n) {
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
function Tr(e, t, n) {
  const s = e.edges[n];
  if (!s) return [];
  const i = e.statements[s.stmtIdx], r = Is(e, t, /* @__PURE__ */ new Set([n]));
  if (i.arrows.length === 1)
    r.push(ge(t, i));
  else {
    const a = /* @__PURE__ */ new Set();
    i.arrows.forEach((c, d) => {
      d !== s.indexInStmt && a.add(d);
    }), r.push({ start: i.start, end: i.end, text: gn(i, a, null) });
  }
  return Ct(r);
}
function Nr(e, t, n, s) {
  const i = e.edges[n];
  if (!i || i.arrow.text === s) return [];
  const r = i.arrow;
  if (r.mid) {
    const a = r.label ? `|${r.label.replace(/\|/g, "#124;")}|` : "";
    return [{ start: r.span.start, end: r.span.end, text: s + a }];
  }
  return [{ start: r.span.start, end: r.span.end, text: s }];
}
function Rr(e, t, n) {
  const s = e.edges[n];
  if (!s) return [];
  const i = e.statements[s.stmtIdx], r = new Set(i.arrows.map((a, c) => c));
  return [{
    start: i.start,
    end: i.end,
    text: gn(i, r, null, s.indexInStmt)
  }];
}
function Ir(e, t, { label: n = "新規ノード" } = {}) {
  const s = Lr(e.nodes), { at: i, prefix: r } = Ns(e);
  return { edits: [{ start: i, end: i, text: `${r}${s}[${je(n, "]")}]` }], id: s };
}
function Ar(e, t, n, s, i = "") {
  const r = (d) => {
    const u = e.nodes.get(d);
    return u ? u.def ? u : { id: d, def: null } : { id: d, def: { raw: `${d}[新規ノード]` } };
  }, a = i ? `|${Ts(i)}|` : "", c = Ns(e);
  return {
    edits: [{
      start: c.at,
      end: c.at,
      text: `${c.prefix}${Pe(r(n))} -->${a} ${Pe(r(s))}`
    }]
  };
}
function Pr(e, t, n) {
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
    const u = gn(d, c, /* @__PURE__ */ new Set([n]));
    s.push(u ? { start: d.start, end: d.end, text: u } : ge(t, d));
  }
  for (const a of e.statements)
    a.type === "node" && a.ref.id === n && s.push(ge(t, a));
  return s.push(...$r(e, t, n)), s.push(...Is(e, t, r)), Ct(s);
}
function Fr(e, t) {
  for (const n of e.statements)
    if (n.start <= t && t <= n.end) return { start: n.start, end: n.end };
  return null;
}
function Dr(e, t) {
  let n = e;
  for (const s of [...t].sort((i, r) => r.start - i.start))
    n = n.slice(0, s.start) + s.text + n.slice(s.end);
  return n;
}
function rt(e, t) {
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
function ot(e, t) {
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
      const y = d.slice(0, p - 1), E = d.slice(p);
      y && E && n.has(y) && n.has(E) && u.push([y, E]);
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
const Br = [
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
], Or = [
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
], Bt = "|", Hr = 'input, textarea, select, [contenteditable="true"], .monaco-editor';
function jr(e, t, n = !1) {
  const s = e.querySelector(".mermaid-tools-status");
  s && (s.textContent = t, s.className = "mermaid-tools-status" + (n ? " error" : ""), setTimeout(() => {
    s.textContent === t && (s.textContent = "", s.className = "mermaid-tools-status");
  }, 6e3));
}
function zt(e, t, n, s = null) {
  if (e.querySelector(":scope > .mermaid-editbar")) return null;
  const i = hn(t.src);
  if (!i.supported)
    return jr(e, `⚠ この図は編集できません（${i.reason}）`, !0), n.onExit?.(), null;
  e.classList.add("mermaid-editing");
  const r = { selected: null, arrowPick: null, busy: !1 }, a = document.createElement("div");
  a.className = "mermaid-editbar";
  const c = (m, w, x) => {
    const M = document.createElement("button");
    return M.type = "button", M.textContent = m, M.title = w, M.addEventListener("click", x), a.appendChild(M), M;
  }, d = c("ラベル編集", "選択中のノード/矢印のラベルを編集", Ni);
  c("➕ ノード", "ノードを追加（追加後にラベルを編集できます）", Ri);
  const u = c("➕ 矢印", "矢印を追加（始点→終点の順にノードをクリック）", Ii), f = c("⇄ 反転", "選択中の矢印の向きを入れ替える", Ai), h = document.createElement("select");
  h.className = "mermaid-arrow-kind", h.title = "選択中の矢印の線種を変える";
  for (const [m, w] of Br) {
    const x = document.createElement("option");
    x.value = m, x.textContent = w, h.appendChild(x);
  }
  h.addEventListener("change", Pi), a.appendChild(h);
  const p = document.createElement("select");
  p.className = "mermaid-node-shape", p.title = "選択中のノードの形状を変える";
  for (const [m, w, x] of Or) {
    const M = document.createElement("option");
    M.value = m + Bt + w, M.textContent = x, p.appendChild(M);
  }
  p.addEventListener("change", Fi), a.appendChild(p);
  const g = c("削除", "選択中のノード/矢印を削除（Delete キーでも可。Ctrl+Z で戻せます）", Hn), y = document.createElement("span");
  y.className = "mermaid-edit-hint", a.appendChild(y), c("✓ 完了", "編集モードを終了（Esc でも可）", () => Ne(!0)), e.appendChild(a);
  const E = (m) => {
    y.textContent = m;
  }, L = (m) => {
    if (![...h.options].some((w) => w.value === m)) {
      const w = document.createElement("option");
      w.value = m, w.textContent = m, h.appendChild(w);
    }
    h.value = m;
  }, v = (m) => {
    const [w, x] = m || ["[", "]"], M = w + Bt + x;
    if (![...p.options].some((N) => N.value === M)) {
      const N = document.createElement("option");
      N.value = M, N.textContent = `${w}…${x}`, p.appendChild(N);
    }
    p.value = M;
  }, b = () => {
    if (!n.reveal) return;
    const m = r.selected;
    if (!m) {
      n.reveal(null);
      return;
    }
    if (m.kind === "node") {
      const M = i.nodes.get(m.id), N = M?.def ? M.def.span : M?.firstRef?.span;
      n.reveal(N ? { line: Fr(i, N.start), focus: N } : null);
      return;
    }
    const w = i.edges[m.idx], x = w ? i.statements[w.stmtIdx] : null;
    n.reveal(w ? { line: x ? { start: x.start, end: x.end } : null, focus: w.arrow.span } : null);
  }, C = () => {
    const m = r.selected, w = m?.kind === "edge", x = m?.kind === "node";
    d.disabled = !m, g.disabled = !m, d.textContent = w ? "ラベル編集（矢印）" : "ラベル編集", f.classList.toggle("hidden", !w), h.classList.toggle("hidden", !w), p.classList.toggle("hidden", !x), u.classList.toggle("active", !!r.arrowPick), w && L(i.edges[m.idx]?.arrow.text || "-->"), x && v(i.nodes.get(m.id)?.def?.shape), r.arrowPick ? E(r.arrowPick.from ? `➕ 矢印: 始点 ${r.arrowPick.from} → 終点のノードをクリック（Escで中止）` : "➕ 矢印: 始点のノードをクリック（Escで中止）") : E(m ? m.kind === "node" ? `選択中: ノード ${m.id}（Delete で削除）` : "選択中: 矢印（Delete で削除）" : "クリック: 選択 ／ ダブルクリック: ラベル編集 ／ Esc: 終了"), b();
  };
  C();
  const _ = () => {
    e.querySelectorAll(".selected").forEach((m) => m.classList.remove("selected")), r.selected = null;
  }, P = (m) => [...e.querySelectorAll("g[id*='flowchart-']")].find((w) => rt(w.id, i.nodes) === m) || null, D = (m) => [...e.querySelectorAll("path.flowchart-link")].find((w) => ot(w, i) === m) || null, S = (m, w) => {
    _(), r.selected = { kind: "node", id: m }, (w || P(m))?.classList.add("selected"), C();
  }, $ = (m, w) => {
    _(), r.selected = { kind: "edge", idx: m }, (w || D(m))?.classList.add("selected"), C();
  }, F = () => {
    const m = r.selected;
    if (!m) return null;
    if (m.kind === "node") return { kind: "node", id: m.id };
    const w = i.edges[m.idx];
    return w ? { kind: "edge", from: w.from, to: w.to } : null;
  }, k = (m, { editNodeId: w = null, selection: x } = {}) => {
    if (r.busy || !m || !m.length) return;
    r.busy = !0, n.applyEdits(t.src, m, {
      editNodeId: w,
      selection: x === void 0 ? F() : x
    }) || Ne(!1);
  }, I = e.querySelector(":scope > .mermaid-canvas") || e, B = (m, w) => {
    const x = I.getBoundingClientRect();
    return { x: m - x.left + I.scrollLeft, y: w - x.top + I.scrollTop };
  }, U = (m) => {
    const w = m.getBoundingClientRect(), x = B(w.left, w.top);
    return { left: x.x, top: x.y, width: w.width, height: w.height };
  }, j = (m) => {
    try {
      const w = m.getTotalLength();
      if (!w) return null;
      const x = m.getPointAtLength(w / 2).matrixTransform(m.getScreenCTM());
      return { x: x.x, y: x.y };
    } catch {
      return null;
    }
  }, Qe = (m) => {
    if (!m) return { left: 8, top: 8, width: 180 };
    const w = B(m.x, m.y);
    return { left: w.x - 90, top: w.y - 14, width: 180 };
  }, Te = (m, w) => {
    const x = P(m), M = P(w);
    if (!x || !M) return { left: 8, top: 8, width: 180 };
    const N = x.getBoundingClientRect(), Z = M.getBoundingClientRect();
    return Qe({
      x: (N.left + N.width / 2 + Z.left + Z.width / 2) / 2,
      y: (N.top + N.height / 2 + Z.top + Z.height / 2) / 2
    });
  }, Rt = ({ left: m, top: w, width: x, value: M, placeholder: N }, Z) => {
    e.querySelectorAll(".mermaid-inline-input").forEach((ce) => ce.remove());
    const O = document.createElement("textarea");
    O.className = "mermaid-inline-input", O.rows = 1, O.value = M || "", N && (O.placeholder = N), O.style.left = `${Math.max(0, m)}px`, O.style.top = `${Math.max(0, w)}px`, O.style.width = `${Math.max(160, x)}px`, I.appendChild(O);
    const xe = () => {
      O.style.height = "auto", O.style.height = `${O.scrollHeight}px`;
    };
    xe(), O.focus(), O.select();
    let Re = !1;
    const At = (ce) => {
      if (Re) return;
      Re = !0;
      const Bi = O.value;
      O.remove(), ce && Z(Bi);
    };
    O.addEventListener("keydown", (ce) => {
      ce.stopPropagation(), ce.key === "Enter" && !ce.shiftKey ? (ce.preventDefault(), At(!0)) : ce.key === "Escape" && At(!1);
    }), O.addEventListener("input", xe), O.addEventListener("blur", () => At(!0));
  }, It = (m, w) => {
    const x = Jn(i.nodes.get(w)?.def?.label ?? ""), M = U(m);
    Rt({
      left: M.left,
      top: M.top,
      width: M.width + 24,
      value: x,
      placeholder: "ノードラベル（Shift+Enter で改行）"
    }, (N) => {
      N !== x && k(Sr(i, t.src, w, Dt(N)));
    });
  }, On = (m, w) => {
    const x = Jn(i.edges[m]?.arrow?.label || ""), M = Qe(w ? j(w) : null);
    Rt(
      { ...M, value: x, placeholder: "矢印ラベル（Shift+Enter で改行・空で削除）" },
      (N) => {
        N !== x && k(_r(i, t.src, m, Dt(N)));
      }
    );
  };
  function Ni() {
    const m = r.selected;
    if (m)
      if (m.kind === "node") {
        const w = P(m.id);
        w && It(w, m.id);
      } else
        On(m.idx, D(m.idx));
  }
  function Ri() {
    const { edits: m, id: w } = Ir(i, t.src, {});
    k(m, { editNodeId: w, selection: { kind: "node", id: w } });
  }
  function Ii() {
    r.arrowPick = r.arrowPick ? null : {}, _(), C();
  }
  function Ai() {
    const m = r.selected;
    if (m?.kind !== "edge") return;
    const w = i.edges[m.idx];
    w && k(
      Rr(i, t.src, m.idx),
      { selection: { kind: "edge", from: w.to, to: w.from } }
    );
  }
  function Pi() {
    const m = r.selected;
    m?.kind === "edge" && k(Nr(i, t.src, m.idx, h.value));
  }
  function Fi() {
    const m = r.selected;
    if (m?.kind !== "node") return;
    const [w, x] = p.value.split(Bt);
    k(Mr(i, t.src, m.id, w, x));
  }
  function Hn() {
    const m = r.selected;
    m && k(m.kind === "node" ? Pr(i, t.src, m.id) : Tr(i, t.src, m.idx), { selection: null });
  }
  const Di = (m) => {
    const w = m.getBoundingClientRect(), x = w.left + w.width / 2, M = w.top + w.height / 2;
    let N = null, Z = 1 / 0;
    for (const O of e.querySelectorAll("path.flowchart-link")) {
      const xe = j(O);
      if (!xe) continue;
      const Re = (xe.x - x) ** 2 + (xe.y - M) ** 2;
      Re < Z && (Z = Re, N = O);
    }
    return Z < 1600 ? N : null;
  }, jn = (m) => {
    const w = m.target.closest("path.flowchart-link");
    if (w) return w;
    const x = m.target.closest(".edgeLabel");
    return x ? Di(x) : null;
  }, Wn = (m) => {
    if (m.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const w = m.target.closest("g[id*='flowchart-']");
    if (w) {
      const M = rt(w.id, i.nodes);
      if (!M) return;
      if (r.arrowPick) {
        if (!r.arrowPick.from)
          r.arrowPick = { from: M }, _(), w.classList.add("selected"), C();
        else {
          const N = r.arrowPick.from;
          r.arrowPick = null, _(), C(), Rt(
            { ...Te(N, M), value: "", placeholder: "矢印ラベル（空でも可・Shift+Enter で改行）" },
            (Z) => k(
              Ar(i, t.src, N, M, Dt(Z)).edits,
              { selection: { kind: "edge", from: N, to: M } }
            )
          );
        }
        return;
      }
      S(M, w);
      return;
    }
    const x = jn(m);
    if (x) {
      const M = ot(x, i);
      if (M != null) {
        $(M, x);
        return;
      }
      E("⚠️ この矢印はソースと対応付けできませんでした（特殊な記法の可能性）。");
      return;
    }
    !r.arrowPick && r.selected && (_(), C());
  }, Un = (m) => {
    if (m.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const w = m.target.closest("g[id*='flowchart-']");
    if (w) {
      m.preventDefault();
      const N = rt(w.id, i.nodes);
      N && It(w, N);
      return;
    }
    const x = jn(m);
    if (!x) return;
    const M = ot(x, i);
    M != null && (m.preventDefault(), $(M, x), On(M, x));
  }, qn = (m) => {
    if (!e.isConnected) {
      Ne(!1);
      return;
    }
    if (!m.target?.closest?.(Hr)) {
      if (m.key === "Escape") {
        if (r.arrowPick) {
          r.arrowPick = null, _(), C();
          return;
        }
        Ne(!0);
        return;
      }
      if ((m.key === "Delete" || m.key === "Backspace") && r.selected) {
        m.preventDefault(), Hn();
        return;
      }
      if ((m.ctrlKey || m.metaKey) && !m.altKey) {
        const w = m.key.toLowerCase();
        w === "z" && !m.shiftKey ? (m.preventDefault(), n.undo?.()) : (w === "y" || w === "z" && m.shiftKey) && (m.preventDefault(), n.redo?.());
      }
    }
  };
  e.addEventListener("click", Wn), e.addEventListener("dblclick", Un), document.addEventListener("keydown", qn);
  function Ne(m) {
    e.removeEventListener("click", Wn), e.removeEventListener("dblclick", Un), document.removeEventListener("keydown", qn), e.classList.remove("mermaid-editing"), a.remove(), e.querySelectorAll(".mermaid-inline-input").forEach((w) => w.remove()), _(), n.reveal?.(null), m && n.onExit?.();
  }
  return s && requestAnimationFrame(() => {
    if (!e.isConnected || !a.isConnected) return;
    const m = s.selection;
    if (m?.kind === "node" && i.nodes.has(m.id))
      S(m.id);
    else if (m?.kind === "edge") {
      const w = i.edges.findIndex((x) => x.from === m.from && x.to === m.to);
      w >= 0 && $(w);
    }
    if (s.editNodeId) {
      const w = P(s.editNodeId);
      w && It(w, s.editNodeId);
    }
  }), () => Ne(!1);
}
function Wr(e) {
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
function Qn(e, t) {
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
function As(e, t, n = 0) {
  const s = Wr(e), i = s[n] ? Qn(s[n], t) : null;
  if (i) return i;
  for (const r of s) {
    const a = Qn(r, t);
    if (a) return a;
  }
  return null;
}
const z = window.markdownit ? window.markdownit({
  // html: false が最大の防御。AI の生成物と /api/web2md で取り込んだ外部ページを
  // innerHTML に入れる以上、生 HTML を通すわけにはいかない（<script> はエスケープされる）。
  // ここを true にするなら DOMPurify のベンダリングが必須になる。
  html: !1,
  linkify: !0,
  breaks: !1
}) : null, Ce = window.mermaid || null, Ur = () => z !== null;
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
if (z) {
  const e = z.renderer.rules.link_open || ((s, i, r, a, c) => c.renderToken(s, i, r));
  z.renderer.rules.link_open = (s, i, r, a, c) => (s[i].attrSet("target", "_blank"), s[i].attrSet("rel", "noopener noreferrer"), e(s, i, r, a, c));
  const t = z.renderer.rules.image;
  z.renderer.rules.image = (s, i, r, a, c) => {
    const d = s[i].attrGet("src");
    return d && s[i].attrSet("src", Vr(d)), t(s, i, r, a, c);
  };
  const n = z.renderer.rules.fence;
  z.renderer.rules.fence = (s, i, r, a, c) => {
    const d = s[i];
    if (d.info.trim().toLowerCase() === "mermaid" && Ce)
      return `<pre class="mermaid-src"${De && d.map ? ` data-src-line="${d.map[0] + 1}" data-src-end="${d.map[1]}"` : ""}>
${Ot(d.content)}</pre>`;
    if (/^(?:yaml\s+)?mdflow-mapping$/i.test(d.info.trim())) {
      const u = /^diagram\s*:\s*(\S+)/m.exec(d.content);
      return `<details class="mdflow-mapping"><summary>⚙ ${u ? `条件マッピング: ${Ot(u[1])}` : "条件マッピング"}</summary><pre>${Ot(d.content)}</pre></details>`;
    }
    return n(s, i, r, a, c);
  }, z.inline.ruler.before("emphasis", "mark", (s, i) => {
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
  }), z.inline.ruler2.before("emphasis", "mark", (s) => {
    es(s, s.delimiters);
    for (const i of s.tokens_meta)
      i?.delimiters && es(s, i.delimiters);
    return !0;
  }), z.core.ruler.push("src_line", (s) => {
    if (De)
      for (const i of s.tokens)
        !i.map || i.nesting < 0 || i.type === "inline" || (i.attrSet("data-src-line", String(i.map[0] + 1)), i.attrSet("data-src-end", String(i.map[1])));
  });
}
function es(e, t) {
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
let Fe = "", De = !1;
function qr(e) {
  Fe = e || "";
}
function Vr(e) {
  if (/^(https?:|data:|blob:|\/)/i.test(e)) return e;
  const t = [];
  for (const n of `${Fe}/${e}`.split("/"))
    if (!(!n || n === ".")) {
      if (n === "..") {
        t.pop();
        continue;
      }
      t.push(n);
    }
  return "/api/asset?path=" + encodeURIComponent(t.join("/"));
}
function Ot(e) {
  return e.replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}
let st = 0;
const Ie = /* @__PURE__ */ new Map(), Kr = 50, mt = /* @__PURE__ */ new WeakMap(), ts = /* @__PURE__ */ new WeakMap(), it = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3], at = /* @__PURE__ */ new WeakMap();
function zr(e, t) {
  return {
    get() {
      return at.get(e)?.get(t.index) || 1;
    },
    set(n) {
      let s = at.get(e);
      s || (s = /* @__PURE__ */ new Map(), at.set(e, s)), s.set(t.index, n);
    }
  };
}
function Gr(e) {
  at.delete(e);
}
function Ht(e, t) {
  const n = it.findIndex((i) => i >= e - 1e-6), s = n < 0 ? it.length - 1 : n;
  return it[Math.min(it.length - 1, Math.max(0, s + t))];
}
function Ps(e, t) {
  const n = e.querySelector("svg"), s = e.__mermaidNatural;
  if (!n || !s) return;
  n.style.width = `${Math.round(s.w * t)}px`, n.style.height = `${Math.round(s.h * t)}px`, n.style.maxWidth = "none";
  const i = e.querySelector(".mermaid-zoom-label");
  i && (i.textContent = `${Math.round(t * 100)}%`);
}
function Yr(e, t) {
  const n = document.createElement("span");
  n.className = "mermaid-zoom";
  const s = (a) => {
    t.set(a), Ps(e, a);
  }, i = (a, c, d) => {
    const u = document.createElement("button");
    return u.type = "button", u.textContent = a, u.title = c, u.addEventListener("click", d), n.appendChild(u), u;
  };
  i("➖", "縮小（図の上で Ctrl+ホイールでも）", () => s(Ht(t.get(), -1)));
  const r = i("100%", "等倍に戻す", () => s(1));
  return r.className = "mermaid-zoom-label", i("➕", "拡大（図の上で Ctrl+ホイールでも）", () => s(Ht(t.get(), 1))), e.addEventListener("wheel", (a) => {
    a.ctrlKey && (a.preventDefault(), s(Ht(t.get(), a.deltaY < 0 ? 1 : -1)));
  }, { passive: !1 }), n;
}
function Zr(e, t) {
  Ie.size >= Kr && Ie.delete(Ie.keys().next().value), Ie.set(e, t);
}
let Gt = null;
function Xr(e) {
  Gt = e;
}
let Yt = null, We = null;
function Jr(e) {
  Yt = e;
}
function Qr(e) {
  We = e;
}
function eo(e, t, n = null) {
  const s = or(t.src, t.index || 0), i = document.createElement("div");
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
  }, c = (f = Zt()) => Ms(e.querySelector("svg"), { background: f });
  if (i.appendChild(r), n && e.__mermaidNatural && i.appendChild(Yr(e, n)), t.editable && Yt) {
    const { ok: f, reason: h } = br(t.src), p = document.createElement("button");
    p.type = "button", p.title = f ? "この図を直接編集する（ノード/矢印の操作がMermaidソースへ反映される）" : `この図は直接編集できません（${h}）`, p.textContent = "編集", p.disabled = !f, f && p.addEventListener("click", () => Yt(e, t)), i.appendChild(p);
  }
  if (Gt) {
    const f = document.createElement("button");
    f.type = "button", f.title = "PNG にしてワークスペースへ保存する（同じ図は同じ名前へ書き直す）", f.textContent = "保存", f.addEventListener("click", () => a(f, "保存しました", async () => `✓ ${await Gt(await c(), s)}`)), i.appendChild(f);
  }
  const d = document.createElement("button");
  d.type = "button", d.title = "PNG をクリップボードへコピーする", d.textContent = "コピー", d.addEventListener("click", () => a(d, "コピーしました", async () => (await Zn(await c()), "✓ コピーしました"))), i.appendChild(d);
  const u = document.createElement("button");
  return u.type = "button", u.title = "白背景のPNGをクリップボードへコピーする（資料や白いスライド向け）", u.textContent = "白でコピー", u.addEventListener("click", () => a(u, "白背景でコピーしました", async () => (await Zn(await c(Zt("white"))), "✓ 白背景でコピーしました"))), i.appendChild(u), i;
}
function Zt(e = "theme") {
  return e === "white" ? "#ffffff" : getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#1e1e2a";
}
function ns(e, t = {}, n = null) {
  const s = document.createElement("div");
  s.className = "mermaid-box";
  const i = document.createElement("div");
  i.className = "mermaid-canvas", i.innerHTML = e, s.appendChild(i);
  const r = i.querySelector("svg"), a = r?.getAttribute("viewBox")?.trim().split(/[\s,]+/), c = a?.length === 4 ? parseFloat(a[2]) : NaN, d = a?.length === 4 ? parseFloat(a[3]) : NaN;
  return Number.isFinite(c) && Number.isFinite(d) && (s.__mermaidNatural = { w: c, h: d }), r && s.prepend(eo(s, t, n)), Ps(s, n ? n.get() : 1), We && We(s, t), s;
}
async function to(e, t, n) {
  if (!Ce) return;
  const s = n.mdflow || null, i = ts.get(e) || /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  ts.set(e, r);
  let a = -1;
  for (const c of e.querySelectorAll("pre.mermaid-src")) {
    if (a += 1, mt.get(e) !== t) return;
    const d = c.textContent, u = s ? no(d, s) : null;
    let f = u ? u.injected : d;
    const h = (b) => {
      c.dataset.srcLine && (b.dataset.srcLine = c.dataset.srcLine), c.dataset.srcEnd && (b.dataset.srcEnd = c.dataset.srcEnd), b.__mermaidMeta = p, c.replaceWith(b), u && b.after(so(u, s));
    }, p = { src: d, index: a, editable: !!n.editable }, g = i.get(a);
    if (g && g.src === d && g.renderSrc === f) {
      g.meta.index = a, r.set(a, g), h(g.box), We && We(g.box, g.meta, !0);
      continue;
    }
    const y = (b) => (r.set(a, { src: d, renderSrc: f, box: b, meta: p }), b), E = zr(e, p), L = Ie.get(f);
    if (L) {
      h(y(ns(L, p, E)));
      continue;
    }
    let v;
    try {
      ({ svg: v } = await Ce.render(`pixie-mermaid-${st++}`, f));
    } catch (b) {
      if (document.getElementById(`dpixie-mermaid-${st - 1}`)?.remove(), u && f !== d)
        try {
          f = d, { svg: v } = await Ce.render(`pixie-mermaid-${st++}`, f);
        } catch {
          document.getElementById(`dpixie-mermaid-${st - 1}`)?.remove(), v = null;
        }
      else
        v = null;
      if (v == null) {
        c.classList.add("mermaid-error"), c.title = `Mermaid の構文エラー: ${b?.message || b}`;
        continue;
      }
    }
    if (Zr(f, v), mt.get(e) !== t) return;
    h(y(ns(v, p, E)));
  }
}
function no(e, t) {
  if (!Es()) return null;
  const n = Gi(e), s = Zi(t.doc.mappings, n);
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
  const c = t.doc.selected[n] || null, d = er(s, a ? {} : r, c);
  let u = e, f = [];
  d && ({ code: u, missing: f } = nr(
    e,
    d.activeNodes,
    d.style,
    "mdflowActive",
    d.inactiveStyle
  ));
  const h = {};
  if (Cs(e)) {
    const p = new Set(Ls(e));
    for (const g of s.presets) {
      const y = g.activeNodes.filter((E) => !p.has(E));
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
function so(e, t) {
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
    const E = document.createElement("span");
    E.className = "mdflow-when", E.textContent = u, p.appendChild(E), d.appendChild(p), i.appendChild(d);
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
function Ge(e, t, n = {}) {
  if (!z) {
    e.classList.remove("md"), e.textContent = t;
    return;
  }
  e.classList.add("md");
  const s = Fe, i = De;
  n.assetBase != null && (Fe = n.assetBase || ""), De = !!n.sourceMap;
  try {
    e.innerHTML = z.render(t);
  } finally {
    n.assetBase != null && (Fe = s), De = i;
  }
  const r = (mt.get(e) || 0) + 1;
  return mt.set(e, r), to(e, r, n);
}
function Xt(e, t) {
  e.classList.remove("md"), e.textContent = t;
}
let Ee = null;
function ct() {
  return typeof window.TurndownService == "function";
}
function io() {
  return ct() ? Ee || (Ee = new window.TurndownService({
    headingStyle: "atx",
    // # 見出し（アプリのノート記法と揃える）
    codeBlockStyle: "fenced",
    // ``` フェンス
    bulletListMarker: "-",
    emDelimiter: "_"
  }), window.turndownPluginGfm?.gfm && Ee.use(window.turndownPluginGfm.gfm), Ee.addRule("dropBrokenImg", {
    filter: (e) => e.nodeName === "IMG" && !e.getAttribute("src"),
    replacement: () => ""
  }), Ee) : null;
}
function ro(e) {
  const t = io();
  if (!t) throw new Error("Turndown が未取得です（python -m pipenv run python scripts/fetch_turndown.py を実行してください）");
  return t.turndown(e);
}
const oo = 60;
let Jt = !0, ss = null;
function Fs() {
  const e = l("messages");
  return e && e !== ss && (ss = e, e.addEventListener("scroll", () => {
    Jt = ao(e);
  })), e;
}
function ao(e) {
  return e.scrollHeight - e.scrollTop - e.clientHeight <= oo;
}
function R(e, t, n = {}) {
  const s = document.createElement("div");
  s.className = "msg " + e;
  const i = document.createElement("div");
  return i.className = "body", e === "assistant" ? Ge(i, t, n) : Xt(i, t), s.appendChild(i), Fs().appendChild(s), X(e === "user"), s;
}
function Ds(e, t) {
  if (!e || e.querySelector(".msg-del")) return;
  const n = document.createElement("button");
  n.className = "msg-del", n.type = "button", n.textContent = "削除", n.title = "この往復を削除（LLM の文脈からも消してコンテキストを節約する）", n.addEventListener("click", t), e.appendChild(n);
}
function co(e, t) {
  if (!e || e.querySelector(".msg-rollback")) return;
  const n = document.createElement("button");
  n.className = "msg-rollback", n.type = "button", n.textContent = "戻す", n.title = "このターンで変更されたファイルを、ターンの前の状態へ戻す（以降のターンで同じファイルに加えられた変更も巻き戻る）", n.addEventListener("click", t), e.appendChild(n);
}
function W(e, t, n = {}) {
  if (!e || !t) return;
  let s = e.querySelector(".tool-log");
  s || (s = document.createElement("div"), s.className = "tool-log", e.insertBefore(s, e.querySelector(".body")));
  const i = document.createElement("div");
  i.className = "tool-status", n.category && i.classList.add("status-" + n.category), n.tool && (i.dataset.tool = n.tool), i.textContent = t, s.appendChild(i), X();
}
function lo(e, t) {
  if (!e || !t.trim()) return;
  let n = e.querySelector(".progress-log");
  n || (n = document.createElement("details"), n.className = "progress-log", n.appendChild(document.createElement("summary")), e.insertBefore(n, e.querySelector(".body")));
  const s = document.createElement("div");
  s.className = "progress-status", s.textContent = t, n.appendChild(s), n.querySelector("summary").textContent = `作業の経過（${n.querySelectorAll(".progress-status").length}件）`, X();
}
function X(e = !1) {
  const t = Fs();
  t && (e && (Jt = !0), Jt && (t.scrollTop = t.scrollHeight));
}
function Ae(e) {
  const t = e.indexOf("<think>");
  if (t < 0) return { think: "", visible: e };
  const n = e.lastIndexOf("</think>");
  return n < t ? { think: e.slice(t + 7), visible: e.slice(0, t) } : {
    think: e.slice(t + 7, n),
    visible: (e.slice(0, t) + e.slice(n + 8)).replace(/^\s+/, "")
  };
}
function Bs(e) {
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
function uo(e) {
  return Bs(e).map(({ search: t, replace: n }) => ({ search: t, replace: n }));
}
function fo(e) {
  if (e = Ae(e).visible, !e.trim()) return "";
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
    if (i.length >= e.trim().length * 0.6) return po(i);
  }
  return e.trim();
}
function po(e) {
  return e.split(`
`).filter((t) => !/^(-|@@|---|\+\+\+)/.test(t)).map((t) => t.startsWith("+") || t.startsWith(" ") ? t.slice(1) : t).join(`
`).replace(/\n$/, "");
}
function Ye() {
  return crypto.randomUUID && crypto.randomUUID() || "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
T.select(Ye());
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
    return T.busy.value;
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
    return T.state.sessionId;
  },
  set sessionId(e) {
    T.select(e, T.state.phase === "switching" ? T.active : void 0);
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
}, H = () => o.mode === "note", Ze = () => o.mode === "plan", Be = () => o.mode === "code";
let q = 0, lt = 0, ne = !1, we = !1, Qt = !1, Lt = null;
Oi(() => [pn.ready, T.busy.value], () => Lt?.update());
const mo = {
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
}, St = (e) => (e.split(".").pop() || "").toLowerCase(), wn = (e) => mo[St(e)] || "plaintext", Os = (e) => !!e && ["md", "markdown"].includes(St(e)), ho = () => "";
let Hs = /* @__PURE__ */ new Set([".pptx", ".docx", ".xlsx", ".pdf"]);
const vn = (e) => Hs.has("." + St(e));
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
  }), o.noteDecorations = o.editor.createDecorationsCollection(), _t(), o.editor.onDidChangeModelContent(() => {
    Xs(), Sn(), oi();
  }), o.editor.onDidScrollChange(() => ci()), o.editor.onDidChangeCursorSelection(mi), o.editor.addCommand(e.KeyMod.CtrlCmd | e.KeyCode.KeyS, () => tn()), o.editor.addCommand(
    e.KeyMod.CtrlCmd | e.KeyMod.Shift | e.KeyCode.KeyP,
    () => an()
  ), o.editor.addCommand(e.KeyMod.Alt | e.KeyCode.LeftArrow, () => nn()), o.editor.addCommand(e.KeyMod.Alt | e.KeyCode.RightArrow, () => sn()), o.editor.addCommand(e.KeyMod.CtrlCmd | e.KeyCode.KeyE, () => rn()), o.editor.onMouseDown((n) => {
    H() && n.target.type === e.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && ba(n.target.position.lineNumber);
  });
  const t = o.editor.getContainerDomNode();
  t.addEventListener("wheel", ai, { passive: !0, capture: !0 }), t.addEventListener("paste", (n) => {
    if (!H()) return;
    const s = fs(n.clipboardData);
    s && (n.preventDefault(), n.stopPropagation(), ps(s));
  }, !0), t.addEventListener("dragover", (n) => {
    H() && n.dataTransfer?.types?.includes("Files") && (n.preventDefault(), n.stopPropagation());
  }, !0), t.addEventListener("drop", (n) => {
    if (!H() || !n.dataTransfer?.files?.length) return;
    n.preventDefault(), n.stopPropagation();
    const s = fs(n.dataTransfer);
    if (!s) {
      alert("⚠️ 貼り付けられるのは画像ファイルだけです。");
      return;
    }
    ps(s);
  }, !0), go();
});
async function go() {
  Xr(ia), Jr(da), Qr(fa);
  try {
    await js(), yn(), await Mt(), await Y(), H() && await En();
  } catch (e) {
    pt(e.message || "初期化中に問題が発生しました。設定を確認してください。");
  }
  try {
    pc(), Hi();
  } catch (e) {
    pt(e.message || "画面を準備できませんでした。設定を確認してください。");
  }
}
async function js() {
  try {
    en(await oe("/api/mode"));
  } catch {
    en({ mode: "code", features: {} });
  }
}
const Oe = ["code", "plan", "note"], Ue = { code: "Code", plan: "Plan", note: "Note" };
function en(e) {
  o.mode = Oe.includes(e.mode) ? e.mode : "code", o.features = e.features || {}, Array.isArray(o.features.extract_exts) && (Hs = new Set(o.features.extract_exts)), o.copilotEnabled = !!o.features.copilot;
}
function yn() {
  const e = H(), t = l("mode-btn");
  for (const n of Oe)
    document.body.classList.toggle("mode-" + n, o.mode === n), t.classList.toggle("mode-" + n, o.mode === n);
  t.textContent = Ue[o.mode], t.title = `現在: ${Ue[o.mode]} モード（クリックで次のモードへ切替）`, Ze() || Si(), o.editor?.updateOptions({ glyphMargin: e }), mi(), bn(), Ws(), Xe();
}
function Ws() {
  const e = l("code-style-btn"), t = o.codeStyle === "plan";
  e.textContent = t ? "計画を先に" : "通常", e.title = t ? "Codeモードの進め方: 計画を先に — まず実行計画を提示し、承認してから実装する（クリックで通常へ切替）" : "Codeモードの進め方: 通常 — エージェントが自律的に実装（破壊操作は承認制）。クリックで計画優先へ切替";
}
function wo() {
  o.codeStyle = o.codeStyle === "plan" ? "normal" : "plan", localStorage.setItem("pixie.codeStyle", o.codeStyle), Ws(), R("system", o.codeStyle === "plan" ? "計画を先に: エージェントはまず実行計画を提示し、承認してから実装します。" : "通常: エージェントが自律的に実装します（破壊操作は従来どおり承認制）。");
}
function bn() {
  Lt?.update();
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
function Us() {
  o.notes = [], o.noteDecorations?.clear(), o.refs = [], o.checkedRefs.clear(), o.checkedFiles.clear(), o.pendingTarget?.coll && o.pendingTarget.coll.clear(), o.pendingTarget = null, o.mdflowConditions.clear(), o.history = [], o.historyLoaded = !1, l("sel-chip").classList.add("hidden"), ue(), ze();
}
async function vo() {
  const e = Oe[(Oe.indexOf(o.mode) + 1) % Oe.length];
  await xn(e, { confirm: !0 });
}
async function xn(e, t = {}) {
  if (o.streaming)
    return alert("⚠️ 実行中はモードを切り替えられません。中断してから切り替えてください。"), !1;
  if (e === o.mode) return !0;
  if (t.confirm && !confirm(`${Ue[e]} モードに切り替えますか？
（会話セッションはリセットされます）`)) return !1;
  const n = T.begin("switching");
  if (!n) return;
  let s = "";
  try {
    await Tt();
    let i;
    try {
      i = await A("/api/mode", { mode: e });
    } catch (r) {
      return s = r.message, alert("⚠️ モードを切り替えられません: " + r.message), !1;
    }
    return en(i), t.keepMessages || (l("messages").innerHTML = ""), l("approval").classList.add("hidden"), l("approval").innerHTML = "", o.assistantEl = null, o.sessionId = Ye(), $e(), Us(), yn(), await Y(), H() ? (await En(), o.currentFile && (await Rn(), await An()), R("system", "Noteモードに切り替えました（読み取り専用エージェント・クリック反映）。")) : Ze() ? R("system", "Planモードに切り替えました（調べて実行計画を立てるだけ。承認するまでファイルは変更されません）。") : R("system", "Codeモードに切り替えました（自律エージェント・破壊操作は承認制）。"), !0;
  } catch (i) {
    return s = i.message, alert(i.message), !1;
  } finally {
    T.finish(n, s);
  }
}
async function En() {
  o.history = [], o.historyLoaded = !1, l("messages").innerHTML = "";
  let e;
  try {
    e = await oe("/api/chat/history");
  } catch (s) {
    W(R("assistant", ""), `⚠️ 履歴を読み込めませんでした（${s.message}）。この保存先の履歴は、取り違えを防ぐため今回は保存しません。`);
    return;
  }
  let t = null, n = "";
  for (const s of e.messages || []) {
    o.history.push({ role: s.role, content: s.content });
    const i = R(s.role, s.content, { assetBase: Je() });
    if (s.role === "user") {
      t = i, n = s.content;
      continue;
    }
    i._exchange = { userEl: t, userText: n }, Ds(i, () => yi(i, 0)), t = null, n = "";
  }
  o.historyLoaded = !0;
}
async function kn() {
  if (o.historyLoaded)
    try {
      const e = await A("/api/chat/history", { messages: o.history });
      Array.isArray(e.messages) && (o.history = e.messages);
    } catch {
    }
}
async function yo() {
  if (o.streaming) {
    alert("⚠️ 応答の生成中は履歴を消去できません。");
    return;
  }
  if (confirm("この保存先の会話履歴を消去しますか？")) {
    try {
      await J("/api/chat/history", { method: "DELETE" });
    } catch (e) {
      alert("⚠️ 履歴を消去できません: " + e.message);
      return;
    }
    o.history = [], o.historyLoaded = !0, l("messages").innerHTML = "";
  }
}
async function Mt() {
  try {
    const e = await oe("/api/status");
    pt(e.ready ? "" : e.error || "エンジンを起動できませんでした。設定を確認してください。");
    const t = e.ready ? e.model || "(未設定)" : "起動失敗";
    if (l("model-name").textContent = t.split(/[\\/]/).pop() || t, l("model-name").title = t, !e.ready) {
      l("agent-status").textContent = "  ⚠ " + (e.error || "engine not ready");
      return;
    }
    l("agent-status").textContent = "", qs(e.workspace);
  } catch (e) {
    pt(e.message || "状態を取得できませんでした。設定を確認してください。"), l("model-name").textContent = "接続不可";
  }
}
function qs(e) {
  if (!e) return;
  const t = l("root-path");
  t.textContent = e, t.title = e;
  const n = e.split(/[\\/]/).filter(Boolean).pop() || e;
  l("root-project-name").textContent = n || "(未設定)", l("root-project-btn").title = "ルートプロジェクト: " + e + "（クリックで変更）";
}
const Cn = (e) => e.includes("/") ? e.slice(0, e.lastIndexOf("/")) : "";
function Vs(e, t) {
  const n = new Set((t.files || []).map((s) => s.path));
  for (const s of [...o.fsMap.keys()])
    Cn(s) === e && !n.has(s) && bo(s);
  for (const s of t.files || []) {
    const i = o.fsMap.get(s.path);
    i ? (i.size = s.size, i.text = s.text) : o.fsMap.set(s.path, { ...s, loaded: s.type === "dir" ? !1 : void 0 });
  }
  for (const s of t.files || [])
    s.type === "dir" && !o.knownDirs.has(s.path) && (o.knownDirs.add(s.path), o.collapsedDirs.add(s.path));
  t.truncated && (o.treeTruncated = !0);
}
async function ht(e) {
  const t = q, n = await G("/api/files/list?path=" + encodeURIComponent(e || ""));
  return !n || t !== q ? !1 : (Vs(e, n), !0);
}
function bo(e) {
  for (const t of [...o.fsMap.keys()])
    (t === e || t.startsWith(e + "/")) && (o.fsMap.delete(t), o.checkedFiles.delete(t));
}
async function Y() {
  const e = q;
  o.treeTruncated = !1;
  const t = await G("/api/files/list?path=");
  if (!(!t || e !== q)) {
    qs(t.root), Vs("", t);
    for (const [n, s] of [...o.fsMap])
      s.type === "dir" && s.loaded && n && await ht(n);
    Xe();
  }
}
function xo(e) {
  if (!e) return !1;
  let t = "";
  for (const n of e.split("/"))
    if (t = t ? t + "/" + n : n, o.collapsedDirs.has(t)) return !0;
  return !1;
}
async function Eo(e) {
  const t = String(e || "").split("/");
  let n = "";
  for (const s of t.slice(0, -1)) {
    n = n ? n + "/" + s : s, o.fsMap.has(n) || await ht(Cn(n));
    const i = o.fsMap.get(n);
    i && i.type === "dir" && !i.loaded && await ht(n) && (i.loaded = !0), o.collapsedDirs.delete(n);
  }
}
function Xe() {
  const e = l("file-list");
  e.innerHTML = "";
  const t = [...o.fsMap.values()].filter((n) => !xo(Cn(n.path))).sort((n, s) => n.path < s.path ? -1 : n.path > s.path ? 1 : 0);
  for (const n of t) {
    const s = n.path.split("/"), i = document.createElement("li");
    i.dataset.path = n.path, i.dataset.type = n.type, i.style.paddingLeft = 8 + (s.length - 1) * 16 + "px", ko(i, n);
    const r = document.createElement("span"), a = document.createElement("span");
    if (a.className = "fname", a.textContent = s[s.length - 1], n.type === "dir")
      i.classList.add("dir"), r.textContent = o.collapsedDirs.has(n.path) ? "▸" : "▾", i.append(r, a), i.addEventListener("click", async () => {
        o.collapsedDirs.has(n.path) ? (o.collapsedDirs.delete(n.path), n.loaded || await ht(n.path) && (n.loaded = !0)) : o.collapsedDirs.add(n.path), Xe();
      });
    else {
      if (!Ze())
        if (n.text || vn(n.path)) {
          const c = document.createElement("input");
          c.type = "checkbox", c.title = n.text ? "チャットのコンテキストに含める" : "チャットのコンテキストに含める（テキスト抽出して同梱。/copilot では原本を Copilot に添付）", c.checked = o.checkedFiles.has(n.path), c.addEventListener("click", (d) => d.stopPropagation()), c.addEventListener("change", () => {
            c.checked ? o.checkedFiles.add(n.path) : o.checkedFiles.delete(n.path);
          }), i.appendChild(c);
        } else {
          const c = document.createElement("span");
          c.className = "cb-pad", i.appendChild(c);
        }
      if (r.textContent = n.text ? "" : ho(n.path), a.title = n.text ? n.path : `${n.path}（クリックで既定アプリで開く）`, i.append(r, a), i.classList.toggle("active", n.path === o.currentFile), o.changedPaths.has(n.path)) {
        i.classList.add("changed");
        const c = document.createElement("span");
        c.className = "changed-badge", c.textContent = "● 変更", i.appendChild(c);
      }
      i.addEventListener("click", () => n.text ? ae(n.path) : Zs(n.path));
    }
    i.addEventListener("contextmenu", (c) => {
      c.preventDefault(), So(c, n);
    }), e.appendChild(i);
  }
  l("files-trunc").classList.toggle("hidden", !o.treeTruncated);
}
let ie = null;
function ko(e, t) {
  e.draggable = !0, e.addEventListener("dragstart", (n) => {
    ie = t.path, n.dataTransfer.setData("text/plain", t.path), n.dataTransfer.effectAllowed = "move", e.classList.add("dragging");
  }), e.addEventListener("dragend", () => {
    ie = null, e.classList.remove("dragging"), document.querySelectorAll("#file-list li.drop-target").forEach((n) => n.classList.remove("drop-target"));
  }), t.type === "dir" && (e.addEventListener("dragover", (n) => {
    const s = ie;
    s === null || s === t.path || t.path.startsWith(s + "/") || (n.preventDefault(), n.dataTransfer.dropEffect = "move", e.classList.add("drop-target"));
  }), e.addEventListener("dragleave", () => e.classList.remove("drop-target")), e.addEventListener("drop", (n) => {
    n.preventDefault(), n.stopPropagation(), e.classList.remove("drop-target");
    const s = n.dataTransfer.getData("text/plain") || ie;
    s && s !== t.path && Ys(s, t.path);
  }));
}
function Co() {
  const e = l("file-list");
  e.addEventListener("dragover", (t) => {
    ie !== null && (t.target.closest("li") || (t.preventDefault(), t.dataTransfer.dropEffect = "move", e.classList.add("drop-root")));
  }), e.addEventListener("dragleave", (t) => {
    e.contains(t.relatedTarget) || e.classList.remove("drop-root");
  }), e.addEventListener("drop", (t) => {
    if (e.classList.remove("drop-root"), t.target.closest("li")) return;
    t.preventDefault();
    const n = t.dataTransfer.getData("text/plain") || ie;
    n && Ys(n, "");
  });
}
function qe() {
  l("fs-menu")?.remove();
}
function Lo(e, t, n) {
  qe();
  const s = document.createElement("div");
  s.id = "fs-menu";
  for (const r of n) {
    const a = document.createElement("div");
    a.className = r.onClick ? "fs-menu-item" : "fs-menu-head", a.textContent = r.label, r.title && (a.title = r.title), r.onClick && a.addEventListener("click", () => {
      qe(), r.onClick();
    }), s.appendChild(a);
  }
  s.style.left = "0px", s.style.top = "0px", document.body.appendChild(s);
  const i = s.getBoundingClientRect();
  return s.style.left = Math.max(4, Math.min(e, window.innerWidth - i.width - 4)) + "px", s.style.top = Math.max(4, Math.min(t, window.innerHeight - i.height - 4)) + "px", s;
}
function Ks(e, t) {
  const n = e.getBoundingClientRect();
  return Lo(n.left, n.bottom + 4, t);
}
function So(e, t) {
  qe();
  const n = document.createElement("div");
  n.id = "fs-menu";
  const s = (i, r) => {
    const a = document.createElement("div");
    a.className = "fs-menu-item", a.textContent = i, a.addEventListener("click", () => {
      qe(), r();
    }), n.appendChild(a);
  };
  t.type === "dir" ? (s("中に新規ファイル", () => gt("file", t.path + "/")), s("中に新規フォルダ", () => gt("dir", t.path + "/"))) : t.text || s("↗ 既定のアプリで開く", () => Zs(t.path)), s("名前変更・移動", () => Mo(t)), s("削除", () => _o(t)), n.style.left = e.pageX + "px", n.style.top = e.pageY + "px", document.body.appendChild(n);
}
async function Ln(e, t) {
  try {
    return await A(e, t), !0;
  } catch (n) {
    return alert("⚠️ " + n.message), !1;
  }
}
async function gt(e, t = "") {
  const s = prompt(e === "dir" ? "新規フォルダ名（例: src/utils）" : "新規ファイル名（例: src/main.py）", t);
  if (!s || !s.trim() || s.trim() === t.trim()) return;
  const i = s.trim().replace(/\\/g, "/");
  await Ln("/api/fs/create", { path: i, kind: e }) && (e === "dir" && o.collapsedDirs.delete(i), await Y(), e === "file" && await ae(i));
}
async function Mo(e) {
  const t = prompt("新しいパス（フォルダに入れるには src/名前.py のように）", e.path);
  !t || !t.trim() || t.trim() === e.path || await zs(e, t.trim().replace(/\\/g, "/"));
}
async function zs(e, t) {
  if (!t || t === e.path) return;
  if (e.type === "dir" && (t === e.path || t.startsWith(e.path + "/"))) {
    alert("⚠️ フォルダを自分自身の中へは移動できません。");
    return;
  }
  if (!await Ln("/api/fs/rename", { src: e.path, dst: t })) return;
  const n = (s) => s === e.path ? t : e.type === "dir" && s.startsWith(e.path + "/") ? t + s.slice(e.path.length) : s;
  if (o.currentFile) {
    const s = n(o.currentFile);
    s !== o.currentFile && (o.currentFile = s, l("current-file").textContent = s, xs(s, o.dirty));
  }
  o.checkedFiles = new Set([...o.checkedFiles].map(n)), Gs(n), await Y();
}
function Gs(e) {
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
async function Ys(e, t) {
  const n = o.fsMap.get(e);
  if (!n) return;
  const s = e.split("/").pop(), i = t ? t + "/" + s : s;
  i !== e && e.split("/").slice(0, -1).join("/") !== t && await zs(n, i);
}
async function _o(e) {
  confirm(`「${e.path}」を削除しますか？`) && await Ln("/api/fs/delete", { path: e.path }) && (o.checkedFiles.delete(e.path), Gs((t) => t === e.path ? null : t), o.currentFile === e.path && (o.currentFile = null, o.baseMtime = null, o.editor.setValue(""), _t(), K(), l("current-file").textContent = "（ファイル未選択）", _e(), Me(), H() && (await Rn(), await An())), await Y());
}
async function Zs(e) {
  try {
    await A("/api/fs/open", { path: e });
  } catch (t) {
    alert("⚠️ 開けませんでした: " + t.message);
  }
}
async function ae(e, t, n = "push") {
  if (ne) return;
  const s = ++lt, i = q, r = o.editor.getModel(), a = r.getVersionId(), c = () => s === lt && i === q && !ne && o.editor.getModel() === r && r.getVersionId() === a;
  if (t || await Tt(), !c() || o.dirty && !t && !confirm("未保存の変更があります。破棄して開きますか？"))
    return;
  const d = await G("/api/file?path=" + encodeURIComponent(e));
  !d || !c() || (n === "push" && o.currentFile && o.currentFile !== e && (o.navBack.push(o.currentFile), o.navFwd.length = 0), Io(e), o.currentFile = e, o.baseMtime = d.mtime ?? null, o.conflictDeclined = !1, o.mdflowConditions.clear(), ua(), Gr(l("preview")), o.monaco.editor.setModelLanguage(o.editor.getModel(), wn(e)), o.editor.setValue(d.content), o.saveError = null, _t(), K(), l("current-file").textContent = e, t || mn("editor"), _e(), Me(), _n(), await Eo(e), !(s !== lt || i !== q) && (Xe(), H() && (await Rn(), await An())));
}
let is = null;
function _t() {
  o.savedVersionId = o.editor.getModel().getAlternativeVersionId(), o.dirty = !1;
}
function Xs() {
  o.currentFile && (o.dirty = o.editor.getModel().getAlternativeVersionId() !== o.savedVersionId, K());
}
function K(e) {
  const t = l("save-state");
  if (xs(o.currentFile, o.dirty), clearTimeout(is), t.classList.remove("save-error"), t.title = "", e === "saving") {
    t.textContent = "保存中…";
    return;
  }
  if (e === "saved") {
    t.textContent = "保存済", is = setTimeout(K, 1500);
    return;
  }
  if (o.saveError) {
    t.textContent = "⚠️ 保存失敗", t.classList.add("save-error"), t.title = o.saveError.message;
    return;
  }
  t.textContent = o.dirty ? "● 未保存" : "";
}
async function $t() {
  if (Qt || ne) return !1;
  for (; o.savePromise; ) await o.savePromise;
  if (!o.currentFile || ne) return !1;
  o.savePromise = $o();
  try {
    return await o.savePromise;
  } finally {
    o.savePromise = null;
  }
}
async function $o() {
  const e = o.currentFile, t = o.editor.getValue(), n = o.editor.getModel().getAlternativeVersionId(), s = !o.fsMap.has(e), i = H();
  let r = null;
  i && (Nt(), r = o.notes.map((d) => ({ ...d }))), clearTimeout(Ve), o.saving = !0, K("saving");
  const a = o.currentFile === e ? o.baseMtime : null;
  let c;
  try {
    c = await A("/api/file", { path: e, content: t, base_mtime: a });
  } catch (d) {
    const u = d instanceof se ? d : new se(String(d), 0);
    if (u.status === 409) {
      const f = await No(e, t);
      if (f) c = f;
      else
        return o.conflictDeclined = !0, o.saveError = new se(
          "外部の変更があるため保存を見送りました（保存ボタン／Ctrl+S でもう一度判断できます）。",
          409
        ), K(), !1;
    } else
      return o.saveError = u, K(), !1;
  } finally {
    o.saving = !1;
  }
  if (o.currentFile === e && (o.baseMtime = c?.mtime ?? o.baseMtime), o.currentFile === e && (o.savedVersionId = n, Xs()), s && await Y(), i)
    try {
      await In(e, r);
    } catch (d) {
      return o.saveError = new se(`本文は保存しましたが、付箋の保存に失敗しました: ${d.message}`, 0), K(), !0;
    }
  return o.saveError = null, o.conflictDeclined = !1, K("saved"), !0;
}
function tn() {
  return o.conflictDeclined = !1, $t();
}
const To = 2e3;
let Ve = null;
function Sn() {
  clearTimeout(Ve), !(we || ne) && H() && (o.conflictDeclined || !o.currentFile || !o.dirty || (Ve = setTimeout(() => {
    if (o.dirty) {
      if (o.saving) {
        Sn();
        return;
      }
      $t();
    }
  }, To)));
}
async function Tt() {
  clearTimeout(Ve), !we && H() && (o.conflictDeclined || o.currentFile && o.dirty && await $t());
}
async function No(e, t) {
  if (!confirm(
    `⚠️ ${e} は、開いた後に別の場所（他のエディタ・エージェント）で変更されています。

［OK］ この内容で上書きする
　　　相手の変更は 🕰 履歴 から元に戻せます。

［キャンセル］ 上書きしない
　　　手元の内容はエディタに残ります。相手の変更を見てから決められます。`
  )) return null;
  try {
    return await A("/api/file", { path: e, content: t, base_mtime: null, force: !0 });
  } catch (s) {
    return o.saveError = s instanceof se ? s : new se(String(s), 0), K(), null;
  }
}
const Ro = 15;
function Io(e) {
  o.navRecent = [e, ...o.navRecent.filter((t) => t !== e)].slice(0, Ro);
}
function Ao() {
  o.navBack.length = 0, o.navFwd.length = 0, o.navRecent.length = 0, Me();
}
function Me() {
  l("nav-back").disabled = !o.navBack.length, l("nav-fwd").disabled = !o.navFwd.length, l("recent-btn").disabled = o.navRecent.length < 2, l("history-btn").disabled = !o.currentFile;
  const e = o.navBack[o.navBack.length - 1];
  l("nav-back").title = e ? `戻る: ${e} (Alt+←)` : "戻る (Alt+←)";
  const t = o.navFwd[o.navFwd.length - 1];
  l("nav-fwd").title = t ? `進む: ${t} (Alt+→)` : "進む (Alt+→)";
}
async function Js(e, t) {
  if (!t.length) return;
  const n = t[t.length - 1], s = o.currentFile;
  await ae(n, !1, "none"), o.currentFile === n && (t.pop(), s && e.push(s), Me());
}
const nn = () => Js(o.navFwd, o.navBack), sn = () => Js(o.navBack, o.navFwd);
function rn() {
  const e = o.navRecent.filter((t) => t !== o.currentFile).map((t) => ({ label: t, title: t, onClick: () => ae(t) }));
  e.length && Ks(l("recent-btn"), [{ label: "最近開いたファイル" }, ...e]);
}
let Ke = null;
async function Po() {
  o.currentFile && (Ke = null, l("hist-file").textContent = o.currentFile, l("hist-preview").textContent = "", l("hist-preview-head").textContent = "左の版を選ぶと内容が出ます。", l("hist-restore").disabled = !0, l("hist-modal").classList.remove("hidden"), await Fo());
}
function dt() {
  l("hist-modal").classList.add("hidden");
}
async function Fo() {
  const e = o.currentFile, t = await G("/api/history?path=" + encodeURIComponent(e)), n = l("hist-list");
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
      r.textContent = Qs(s.saved_at);
      const a = document.createElement("span");
      a.className = "hint", a.textContent = `${s.size.toLocaleString()} B`, i.append(r, a), i.addEventListener("click", () => Do(e, s, i)), n.appendChild(i);
    }
  }
}
function Qs(e) {
  if (!e) return "(不明)";
  const t = new Date(e);
  if (isNaN(t)) return e;
  const n = (s) => String(s).padStart(2, "0");
  return `${t.getMonth() + 1}/${t.getDate()} ${n(t.getHours())}:${n(t.getMinutes())}:${n(t.getSeconds())}`;
}
async function Do(e, t, n) {
  for (const i of l("hist-list").children) i.classList.remove("active");
  n.classList.add("active"), Ke = t.id, l("hist-restore").disabled = !0, l("hist-preview-head").textContent = "読み込み中…";
  const s = await G(
    `/api/history/file?path=${encodeURIComponent(e)}&version_id=${encodeURIComponent(t.id)}`
  );
  !s || Ke !== t.id || (l("hist-preview").textContent = s.content, l("hist-preview-head").textContent = `${Qs(t.saved_at)} の内容`, l("hist-restore").disabled = !1);
}
async function Bo() {
  const e = o.currentFile;
  if (!(!e || !Ke) && confirm(`${e} をこの版に戻します。
今の内容も履歴に積まれるので、戻し間違えてもやり直せます。`)) {
    try {
      await A("/api/history/restore", { path: e, version_id: Ke });
    } catch (t) {
      alert("⚠️ 復元に失敗: " + t.message);
      return;
    }
    dt(), await ae(e, !0, "none"), K("saved");
  }
}
let V = { favorites: [], recent: [], current: "" };
async function ei() {
  const e = await G("/api/workspace/places");
  return e && (V = e), V;
}
const ti = (e) => V.favorites.some((t) => Oo(t.path, e)), Oo = (e, t) => String(e || "").replace(/[\\/]+$/, "").toLowerCase() === String(t || "").replace(/[\\/]+$/, "").toLowerCase();
async function Ho() {
  await ei();
  const e = [], t = (n, s) => n.map((i) => ({
    label: `${s} ${i.name}${i.exists ? "" : "（見つかりません）"}`,
    title: i.path,
    onClick: i.exists ? () => Dn(i.path) : void 0
  }));
  V.favorites.length && e.push({ label: "お気に入り" }, ...t(V.favorites, "⭐")), V.recent.length && e.push({ label: "最近使ったフォルダ" }, ...t(V.recent, "🕘")), e.push({ label: "フォルダを選ぶ…", onClick: fn }), !V.favorites.length && !V.recent.length && e.unshift({ label: "行き先はまだありません（フォルダを移動すると溜まります）" }), Ks(l("places-btn"), e);
}
function ni() {
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
      u.className = "place-go", u.textContent = `${i} ${c.name}`, u.title = c.exists ? `${c.path}（クリックでここへ移動）` : `${c.path}（見つかりません）`, u.disabled = !c.exists, u.addEventListener("click", () => Dn(c.path));
      const f = document.createElement("button");
      f.className = "place-mini", f.textContent = "開く", f.title = "移動せずに中を見る", f.disabled = !c.exists, f.addEventListener("click", () => Se(c.path));
      const h = document.createElement("button");
      h.className = "place-mini", h.textContent = r ? "★" : "☆", h.title = r ? "お気に入りから外す" : "お気に入りに入れる", h.addEventListener("click", () => si(c.path, c.name)), d.append(u, f, h), e.appendChild(d);
    }
  };
  t("⭐ お気に入り", V.favorites, "⭐", !0), t("🕘 最近使ったフォルダ", V.recent, "🕘", !1), !V.favorites.length && !V.recent.length && (e.innerHTML = "<div class='hint'>よく使うフォルダは ☆ ボタンでお気に入りに入れておくと、次からここに出ます。</div>");
}
async function si(e, t) {
  if (e) {
    try {
      ti(e) ? V = await J(
        "/api/workspace/favorites?path=" + encodeURIComponent(e),
        { method: "DELETE" }
      ) : V = await A("/api/workspace/favorites", { path: e, name: t || "" });
    } catch (n) {
      alert("⚠️ " + n.message);
      return;
    }
    ni(), Mn();
  }
}
function Mn() {
  const e = l("root-input").value.trim(), t = l("root-fav-btn"), n = !!e && ti(e);
  t.textContent = n ? "★" : "☆", t.title = n ? "お気に入りから外す" : "このフォルダをお気に入りに入れる", t.disabled = !e;
}
const jo = 150, Wo = 600;
let rs = null, ii = 0;
const te = () => !l("preview").classList.contains("hidden"), Je = () => o.currentFile && o.currentFile.includes("/") ? o.currentFile.slice(0, o.currentFile.lastIndexOf("/")) : "";
function _e() {
  const e = Os(o.currentFile);
  l("preview-btn").disabled = !e, l("preview-btn").title = e ? "Markdown プレビューを表示 (Ctrl+Shift+P)" : "Markdown ファイル（.md）を開いているときだけ使えます";
  const t = l("richcopy-btn");
  t.disabled = !(e && te()), t.title = e && te() ? "プレビューの内容をリッチテキスト（HTML）とMarkdownでコピー。Confluence 等に貼り付け可" : "Markdown プレビュー表示中に使えます", !e && te() && pi();
}
function ri() {
  const e = o.editor.getValue();
  let t = e, n = 0;
  const s = {};
  if (H() && o.features.mdflow && Es())
    try {
      const i = Yi(e);
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
function _n() {
  if (!te()) return;
  qr(Je());
  const { text: e, opts: t, lineOffset: n } = ri();
  t.editable = !0, t.sourceMap = !0, yt = n;
  const s = performance.now(), i = Ge(l("preview"), e, t);
  ci(), Promise.resolve(i).then(() => {
    ii = performance.now() - s;
  });
}
function Uo() {
  l("preview").addEventListener("click", (e) => {
    const t = e.target.closest(".mdflow-preset-item");
    if (!t) return;
    const n = t.closest(".mdflow-presets")?.dataset.diagram;
    if (!n) return;
    const s = t.dataset.preset || null, i = ir(o.editor.getValue(), n, s);
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
    n && (o.mdflowConditions.set(n, t.value), oi());
  });
}
function oi() {
  if (!te()) return;
  clearTimeout(rs);
  const e = Math.min(
    Wo,
    Math.max(jo, Math.round(ii))
  );
  rs = setTimeout(_n, e);
}
const qo = 120;
let wt = "", os = null;
function $n(e) {
  wt = e, clearTimeout(os), os = setTimeout(() => {
    wt = "";
  }, qo);
}
const Vo = 200;
let vt = !1, as = null;
function ai() {
  vt = !0, clearTimeout(as), as = setTimeout(() => {
    vt = !1;
  }, Vo);
}
function ci() {
  if (vt || !te() || wt === "preview") return;
  const e = o.editor, t = e.getScrollHeight() - e.getLayoutInfo().height, n = t > 0 ? e.getScrollTop() / t : 0, s = l("preview");
  $n("editor"), s.scrollTop = n * (s.scrollHeight - s.clientHeight);
}
function Ko() {
  if (vt || !te() || wt === "editor" || !o.editor) return;
  const e = l("preview"), t = e.scrollHeight - e.clientHeight, n = t > 0 ? e.scrollTop / t : 0, s = o.editor;
  $n("preview"), s.setScrollTop(n * Math.max(0, s.getScrollHeight() - s.getLayoutInfo().height));
}
const zo = 80, Go = 300;
let yt = 0, cs = null;
function Yo() {
  const e = o.editor, t = e?.getModel();
  if (!e || !t) return;
  const n = te() ? Zo(t) : null;
  if (!n) {
    Tn();
    return;
  }
  const s = [{ range: n.lineRange, options: { className: "preview-src-hl-line", isWholeLine: !0 } }];
  n.textRange && s.push({ range: n.textRange, options: { className: "preview-src-hl" } }), o.previewHl ? o.previewHl.set(s) : o.previewHl = e.createDecorationsCollection(s), di(t, n.textRange), $n("preview"), e.revealRangeInCenterIfOutsideViewport(n.textRange || n.lineRange, 1);
}
function Tn() {
  o.previewHl?.clear?.(), o.previewHl = null, de = null, document.getElementById("mark-btn")?.classList.add("hidden");
}
function Zo(e) {
  const t = window.getSelection?.();
  if (!t || t.isCollapsed || !t.rangeCount) return null;
  const n = t.getRangeAt(0), s = l("preview");
  if (!s.contains(n.commonAncestorContainer)) return null;
  const i = s.querySelectorAll("[data-src-line]"), r = ls(n.startContainer) || i[0], a = ls(n.endContainer) || i[i.length - 1] || r;
  if (!r || !a) return null;
  const c = on(e, Number(r.dataset.srcLine) + yt), d = Math.max(c, on(e, Number(a.dataset.srcEnd) + yt));
  if (!c) return null;
  const u = new o.monaco.Range(c, 1, d, e.getLineMaxColumn(d)), f = Qo(n), h = f ? f.textContent : t.toString(), p = Xo(e, n, h);
  if (p) return p;
  const g = li(e.getValueInRange(u), h);
  let y = null;
  if (g) {
    const E = e.getOffsetAt({ lineNumber: c, column: 1 });
    y = o.monaco.Range.fromPositions(
      e.getPositionAt(E + g.start),
      e.getPositionAt(E + g.end)
    );
  }
  return { lineRange: u, textRange: y };
}
function le(e, t) {
  return (e?.nodeType === Node.ELEMENT_NODE ? e : e?.parentElement)?.closest(t) || null;
}
const ls = (e) => le(e, "[data-src-line]");
function Xo(e, t, n) {
  const s = le(t.startContainer, ".mermaid-box"), i = le(t.endContainer, ".mermaid-box");
  if (!s || s !== i) return null;
  const r = s.__mermaidMeta;
  if (!r?.src) return null;
  const a = hn(r.src);
  if (!a.supported) return null;
  let c = null;
  const d = le(t.startContainer, "g[id*='flowchart-']"), u = le(t.endContainer, "g[id*='flowchart-']");
  if (d && d === u) {
    const P = rt(d.id, a.nodes), D = P ? a.nodes.get(P) : null;
    c = D?.def?.labelSpan || D?.firstRef?.span || null;
  }
  if (!c) {
    const P = le(t.startContainer, ".edgeLabel"), D = le(t.endContainer, ".edgeLabel");
    if (P && P === D) {
      const S = Jo(s, P), $ = S ? ot(S, a) : null;
      c = $ != null ? a.edges[$]?.arrow?.labelSpan : null;
    }
  }
  if (!c) return null;
  const f = Number(s.dataset.srcLine) + yt, h = on(e, f + 1);
  if (!h) return null;
  const p = e.getOffsetAt({ lineNumber: h, column: 1 }), g = r.src.slice(c.start, c.end), y = li(g, n), E = p + c.start + (y?.start || 0), L = p + c.start + (y?.end ?? g.length), v = o.monaco.Range.fromPositions(
    e.getPositionAt(E),
    e.getPositionAt(L)
  ), b = v.startLineNumber, C = v.endLineNumber;
  return { lineRange: new o.monaco.Range(b, 1, C, e.getLineMaxColumn(C)), textRange: v };
}
function Jo(e, t) {
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
function Qo(e) {
  const t = le(e.startContainer, "mark");
  return t && t === le(e.endContainer, "mark") ? t : null;
}
function on(e, t) {
  return Number.isFinite(t) ? Math.min(Math.max(1, t), e.getLineCount()) : 0;
}
function li(e, t) {
  const n = t.replace(/\s+/g, " ").trim();
  if (!n) return null;
  const s = e.indexOf(n);
  if (s >= 0) return { start: s, end: s + n.length };
  if (n.length > Go) return null;
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
function ea() {
  let e = document.getElementById("mark-btn");
  return e || (e = document.createElement("button"), e.id = "mark-btn", e.className = "hidden", e.title = "選択したところを Markdown の ==マーカー== で塗る (Ctrl+Shift+H)", e.addEventListener("mousedown", (t) => t.preventDefault()), e.addEventListener("click", ui), document.body.appendChild(e), e);
}
function di(e, t) {
  const n = ea(), s = t ? ta() : null;
  if (!s) {
    de = null, n.classList.add("hidden");
    return;
  }
  de = { range: t, marked: sa(e, t) }, n.textContent = de.marked ? "🖍 マーカーを消す" : "🖍 マーカー", n.classList.remove("hidden"), na(n, s);
}
function ta() {
  const e = window.getSelection?.();
  if (!e?.rangeCount) return null;
  const t = e.getRangeAt(0).getBoundingClientRect();
  if (!t.width && !t.height) return null;
  const n = l("preview").getBoundingClientRect();
  return t.bottom < n.top || t.top > n.bottom ? null : t;
}
function na(e, t) {
  const n = t.top - e.offsetHeight - 6;
  e.style.top = `${n < 4 ? t.bottom + 6 : n}px`, e.style.left = `${Math.max(4, Math.min(t.left, window.innerWidth - e.offsetWidth - 4))}px`;
}
function sa(e, t) {
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
function ui() {
  const e = o.editor, t = e?.getModel();
  if (!de || !t) return;
  const n = o.monaco.Range, { range: s, marked: i } = de, r = i ? [
    { range: new n(s.startLineNumber, s.startColumn - 2, s.startLineNumber, s.startColumn), text: "" },
    { range: new n(s.endLineNumber, s.endColumn, s.endLineNumber, s.endColumn + 2), text: "" }
  ] : [
    { range: n.fromPositions(s.getStartPosition()), text: "==" },
    { range: n.fromPositions(s.getEndPosition()), text: "==" }
  ];
  e.executeEdits("mark", r), Tn();
}
function fi(e) {
  l("preview").classList.toggle("hidden", !e), l("preview-divider").classList.toggle("hidden", !e), l("preview-btn").classList.toggle("active", e), e ? vc() : (l("editor").style.flex = "", Tn()), o.editor?.layout(), _e();
}
function pi() {
  fi(!1);
}
async function ia(e, t) {
  const n = o.currentFile || "", s = Ss(Et(n).replace(/\.[^.]+$/, "")), i = await A("/api/image", {
    note: n,
    name: `${s}-${t}`,
    ext: "png",
    data_b64: await lr(e),
    overwrite: !0
  });
  return await Y(), i.path;
}
function an() {
  if (Os(o.currentFile)) {
    if (!Ur()) {
      alert(`⚠️ Markdown プレビューを使うには、先に次を実行してください:
python -m pipenv run python scripts/fetch_markdown_it.py`);
      return;
    }
    if (te()) {
      pi();
      return;
    }
    fi(!0), _n();
  }
}
function ds(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result)), s.onerror = () => n(new Error("画像データを読み込めませんでした")), s.readAsDataURL(e);
  });
}
function ra(e) {
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
async function oa(e) {
  const t = e.cloneNode(!0);
  t.querySelectorAll(".mermaid-tools, .mdflow-presets, .mdflow-mapping, .mdflow-note").forEach((n) => n.remove());
  for (const n of t.querySelectorAll(".mermaid-box")) {
    const s = n.querySelector("svg");
    if (s)
      try {
        const i = await Ms(s, { background: Zt() }), r = document.createElement("img");
        r.src = await ds(i), r.style.maxWidth = "100%", n.replaceWith(r);
      } catch {
      }
  }
  for (const n of t.querySelectorAll("img")) {
    const s = n.getAttribute("src") || "";
    if (s.startsWith("/api/asset"))
      try {
        const i = await fetch(s);
        if (!i.ok) continue;
        n.src = await ds(await i.blob());
      } catch {
      }
  }
  return ra(t), `<div>${t.innerHTML}</div>`;
}
let jt = !1;
async function aa() {
  if (!te() || jt) return;
  const e = l("richcopy-btn"), t = e.textContent;
  jt = !0, e.disabled = !0, e.textContent = "⏳";
  try {
    const { text: n } = ri(), s = await oa(l("preview"));
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([s], { type: "text/html" }),
      "text/plain": new Blob([n], { type: "text/plain" })
    })]), e.textContent = "✓ コピー済";
  } catch (n) {
    e.textContent = t, alert("⚠️ コピーできませんでした: " + (n?.message || n));
  } finally {
    jt = !1, setTimeout(() => {
      e.textContent = t, _e();
    }, 1500);
  }
}
let pe = null;
function ca() {
  const e = o.editor.getModel(), t = e.getOffsetAt(o.editor.getSelection().getStartPosition()), n = e.getValue().slice(0, t).replace(/[ \t]+$/, "");
  return !n.trim() || /\n\s*\n\s*$/.test(n) ? "" : /\n\s*$/.test(n) ? `
` : `

`;
}
function la() {
  const e = l("cf-modal"), t = l("cf-input"), n = l("cf-status"), s = (r) => {
    n.textContent = r || "";
  };
  l("cf-btn").addEventListener("click", () => {
    pe = null, t.value = "", s(ct() ? "Confluence（または任意のWebページ）でコピー（Ctrl+C）してから「クリップボードから読込」、または下の欄に Ctrl+V。" : "⚠ Turndown 未取得: python -m pipenv run python scripts/fetch_turndown.py を実行するとHTML→Markdown変換が有効になります（未取得でもテキストはそのまま挿入できます）。"), e.classList.remove("hidden"), t.focus();
  });
  const i = () => e.classList.add("hidden");
  l("cf-cancel").addEventListener("click", i), e.addEventListener("click", (r) => {
    r.target === e && i();
  }), t.addEventListener("paste", (r) => {
    const a = r.clipboardData?.getData("text/html");
    !a || !ct() || (r.preventDefault(), pe = a, t.value = r.clipboardData?.getData("text/plain") || "", s("✓ リッチテキスト（HTML）で取得しました。「変換して挿入」でMarkdownになります（下の欄は確認用。欄を手で編集するとHTML側を無視して欄の内容を挿入します）。"));
  }), l("cf-read-btn").addEventListener("click", async () => {
    try {
      const r = await navigator.clipboard.read();
      for (const a of r) {
        if (a.types.includes("text/html") && ct()) {
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
      r = pe != null ? ro(pe) : t.value;
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
      text: ca() + r.replace(/\s+$/, "") + `
`
    }]), o.editor.focus(), i();
  });
}
function da(e, t) {
  o.diagramEditing?.dispose?.();
  const n = { src: t.src, index: t.index, box: e, restore: null, dispose: null };
  o.diagramEditing = n, n.dispose = zt(e, t, cn(), null);
}
function ua() {
  o.diagramEditing?.dispose?.(), o.diagramEditing = null;
}
function fa(e, t, n = !1) {
  const s = o.diagramEditing;
  if (s) {
    if (n) {
      if (s.box !== e) return;
      s.index = t.index, e.querySelector(":scope > .mermaid-editbar") || (s.dispose?.(), s.dispose = zt(e, t, cn(), s.restore));
      return;
    }
    s.index === t.index && (s.src !== t.src && (s.src = t.src, s.restore = null), s.dispose?.(), s.box = e, s.dispose = zt(e, t, cn(), s.restore), s.restore && (s.restore = { ...s.restore, editNodeId: null }));
  }
}
function cn() {
  return {
    applyEdits(e, t, n = null) {
      const s = o.editor, i = s.getModel(), r = o.diagramEditing, a = As(i.getValue(), e, r?.index ?? 0);
      if (!a)
        return o.diagramEditing?.dispose?.(), o.diagramEditing = null, alert("⚠️ 図の位置を特定できませんでした（プレビューとエディタの内容が食い違っています）。編集モードを終了します。ファイルを開き直すと直ります。"), !1;
      const c = Dr(e, t), d = t.map((u) => ({
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
      us(e);
    },
    onExit() {
      us(null), o.diagramEditing = null;
    }
  };
}
function us(e) {
  const t = o.editor, n = t?.getModel();
  if (!t || !n) return;
  const s = () => {
    o.diagramHl?.clear?.(), o.diagramHl = null;
  };
  if (!e) {
    s();
    return;
  }
  const i = o.diagramEditing, r = i ? As(n.getValue(), i.src, i.index ?? 0) : null;
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
let ln = null, ye = 0, re = [];
function pa() {
  clearTimeout(ln), ye++, re = [], Q(), ln = setTimeout(() => Nn(l("file-search").value), 250);
}
function ma() {
  ye++, clearTimeout(ln), l("file-search").value = "", re = [], l("search-results").classList.add("hidden"), l("search-results").innerHTML = "", l("search-opts").classList.add("hidden"), l("replace-bar").classList.add("hidden"), l("replace-preview").innerHTML = "", l("replace-status").textContent = "", l("file-list").classList.remove("hidden");
}
async function Nn(e) {
  const t = ++ye, n = q, s = l("search-case").checked;
  re = [], Q();
  const i = l("search-results"), r = l("file-list");
  if (!e.trim()) {
    re = [], i.classList.add("hidden"), l("search-opts").classList.add("hidden"), l("replace-bar").classList.add("hidden"), r.classList.remove("hidden");
    return;
  }
  const a = new URLSearchParams({ q: e, case: s ? "true" : "false" }), c = await G("/api/search?" + a);
  if (!(!c || t !== ye || n !== q || e !== l("file-search").value || s !== l("search-case").checked)) {
    re = [...new Set(c.results.map((d) => d.path))], i.innerHTML = "";
    for (const d of c.results) i.appendChild(ha(d));
    c.results.length || (i.innerHTML = "<div class='hint'>該当なし</div>"), l("search-opts").classList.remove("hidden"), Q(), r.classList.add("hidden"), i.classList.remove("hidden");
  }
}
function ha(e) {
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
    await ae(e.path), o.editor.revealLineInCenter(e.line), o.editor.setPosition({ lineNumber: e.line, column: 1 }), o.editor.focus();
  }), t;
}
function ga() {
  const e = l("replace-bar");
  e.classList.toggle("hidden"), e.classList.contains("hidden") || (Q(), l("replace-input").focus());
}
function Q(e) {
  l("replace-status").textContent = e !== void 0 ? e : `対象: ヒットした ${re.length} ファイル`;
  const t = !re.length || we;
  l("replace-preview-btn").disabled = t, l("replace-run-btn").disabled = t;
}
async function Wt(e) {
  if (we || ne) return;
  const t = l("file-search").value, n = l("replace-input").value, s = [...re], i = l("search-case").checked, r = q, a = ye;
  if (!(!t.trim() || !re.length) && !(!e && !confirm(
    `${re.length} ファイルの「${t}」を「${n}」に置き換えます。

置換前の内容は 🕰 履歴 に残るので元に戻せます。実行しますか？`
  ))) {
    we = !0, clearTimeout(Ve);
    try {
      if (!e && s.includes(o.currentFile)) {
        const g = o.currentFile;
        if (!(!o.dirty || await $t()) || o.dirty || o.currentFile !== g) {
          Q("⚠️ 未保存の編集を保存できないため、置換を中止しました。");
          return;
        }
      }
      if (r !== q || a !== ye) {
        Q("検索対象が変わったため、置換を中止しました。");
        return;
      }
      const c = o.currentFile, d = o.editor.getModel(), u = d.getVersionId();
      Q(e ? "確認中…" : "置換中…");
      let f;
      try {
        Qt = !e, f = await A("/api/search/replace", {
          query: t,
          replace: n,
          paths: s,
          case: i,
          dry_run: e
        });
      } catch (g) {
        Q("⚠️ " + g.message);
        return;
      }
      wa(f);
      const h = f.total === 0 ? "置き換わる箇所がありません" : e ? `${f.changed_files} ファイル / ${f.total} 箇所が置き換わります` : `✓ ${f.changed_files} ファイル / ${f.total} 箇所を置換しました（🕰 履歴 から戻せます）`;
      if (e) {
        Q(h);
        return;
      }
      const p = f.files.map((g) => g.path);
      o.currentFile && p.includes(o.currentFile) && (!o.dirty && o.currentFile === c && o.editor.getModel() === d && d.getVersionId() === u && await ae(o.currentFile, !0, "none"), o.dirty && (o.conflictDeclined = !0, o.saveError = new se("ディスクを置換しました。処理中の編集は保持しています。保存前に履歴で変更を確認してください。", 409), K())), await Nn(l("file-search").value), Q(h);
    } finally {
      Qt = !1, we = !1, Q(l("replace-status").textContent), Sn();
    }
  }
}
function wa(e) {
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
function bt() {
  if (!o.editor) return "";
  const e = o.editor.getSelection();
  return o.editor.getModel().getValueInRange(e);
}
function va() {
  return H() ? "テキストを選択してAIに送れます" : Ze() ? "計画モード：エージェントは調査だけを行い、ファイルは変更しません。" : "エージェントがファイルを直接編集します（破壊操作は承認制）。";
}
function mi() {
  const e = bt().trim().length > 0;
  l("sel-chip").classList.toggle("hidden", !e), l("sel-info").textContent = e ? "選択中：AIに送れます" : va();
}
async function Rn() {
  if (!o.currentFile) {
    o.notes = [], xt();
    return;
  }
  const e = await G("/api/notes?path=" + encodeURIComponent(o.currentFile));
  o.notes = e ? e.notes || [] : [], xt();
}
async function In(e = o.currentFile, t) {
  e && (t == null && (Nt(), t = o.notes), await J("/api/notes?path=" + encodeURIComponent(e), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t)
  }));
}
function Nt() {
  o.noteDecorations && o.notes.forEach((e, t) => {
    const n = o.noteDecorations.getRange(t);
    n && (e.line = n.startLineNumber);
  });
}
function xt() {
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
function ya() {
  Nt();
  const e = o.editor.getPosition().lineNumber, t = prompt("付箋メモ（例: ここをAIに膨らませてもらう）");
  t && (o.notes = o.notes.filter((n) => n.line !== e), o.notes.push({ line: e, text: t }), xt(), In().catch((n) => alert("⚠️ 付箋の保存に失敗しました: " + n.message)));
}
function ba(e) {
  Nt();
  const t = o.notes.find((s) => s.line === e), n = prompt("付箋メモ（空で削除）", t ? t.text : "");
  n !== null && (o.notes = o.notes.filter((s) => s.line !== e), n.trim() && o.notes.push({ line: e, text: n }), xt(), In().catch((s) => alert("⚠️ 付箋の保存に失敗しました: " + s.message)));
}
const xa = /* @__PURE__ */ new Set(
  ["md", "markdown", "txt", "py", "json", "yaml", "yml", "toml", "csv", "html", "css", "js", "ts"]
), fe = (e) => (e.external ? "E:" : "I:") + e.path, Et = (e) => e.split(/[\\/]/).pop(), dn = (e) => xa.has(St(e.path)), hi = (e) => vn(e.path);
async function An() {
  if (!o.currentFile) {
    o.refs = [], ze();
    return;
  }
  const e = await G("/api/refs?path=" + encodeURIComponent(o.currentFile));
  o.refs = e ? e.refs || [] : [];
  const t = new Set(o.refs.map(fe));
  for (const n of [...o.checkedRefs]) t.has(n) || o.checkedRefs.delete(n);
  ze();
}
async function gi() {
  o.currentFile && await G("/api/refs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: o.currentFile, refs: o.refs })
  });
}
async function un(e) {
  if (!o.currentFile) {
    alert("先にファイルを開いてください。");
    return;
  }
  o.refs.some((t) => fe(t) === fe(e)) || (o.refs.push(e), await gi(), ze());
}
async function Ea(e) {
  const [t] = o.refs.splice(e, 1);
  t && o.checkedRefs.delete(fe(t)), await gi(), ze();
}
async function ka(e) {
  try {
    await A(
      "/api/refs/open",
      { note: o.currentFile, path: e.path, external: !!e.external }
    );
  } catch (t) {
    alert("⚠️ 開けませんでした: " + t.message);
  }
}
function ze() {
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
    r.type = "checkbox", r.title = dn(n) ? "AIコンテキストに含める" : hi(n) ? "AIコンテキストに含める（サーバでテキスト抽出して同梱。/copilot では原本を Copilot に添付）" : "AIコンテキストに含める（この形式は Copilot 添付経路のみ有効）", r.checked = o.checkedRefs.has(fe(n)), r.addEventListener("click", (u) => u.stopPropagation()), r.addEventListener("change", () => {
      r.checked ? o.checkedRefs.add(fe(n)) : o.checkedRefs.delete(fe(n));
    });
    const a = document.createElement("span");
    a.textContent = n.external ? "外部" : "";
    const c = document.createElement("span");
    c.className = "fname", c.textContent = n.name || Et(n.path), c.title = n.path + "（クリックで既定アプリで開く）", c.addEventListener("click", () => ka(n));
    const d = document.createElement("button");
    d.className = "ref-del", d.textContent = "×", d.title = "参照を外す", d.addEventListener("click", (u) => {
      u.stopPropagation(), Ea(s);
    }), i.append(r, a, c, d), e.appendChild(i);
  });
}
function Ca(e) {
  const t = (e || "").split(/\r?\n/).find((s) => s && !s.startsWith("#"));
  if (!t || !/^file:/i.test(t)) return null;
  let n = decodeURIComponent(t.replace(/^file:\/\//i, ""));
  return /^\/[A-Za-z]:/.test(n) && (n = n.slice(1)), n.replace(/\\/g, "/");
}
function La() {
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
    if (ie) {
      const s = o.fsMap.get(ie);
      s && s.type === "file" ? await un({ path: ie, external: !1, name: Et(ie) }) : alert("フォルダは参照に追加できません。ファイルをドラッグしてください。");
      return;
    }
    const n = Ca(t.dataTransfer.getData("text/uri-list") || t.dataTransfer.getData("text/plain"));
    if (n) {
      await un({ path: n, external: !0, name: Et(n) });
      return;
    }
    t.dataTransfer.files && t.dataTransfer.files.length && alert(`ブラウザの制限でドラッグしたファイルの絶対パスを取得できません。
外部ファイルは「＋参照を追加」から選んでください。`);
  });
}
async function He(e) {
  const t = await G("/api/workspace/dirs?files=true&path=" + encodeURIComponent(e || ""));
  if (!t) return;
  l("pick-input").value = t.cwd || "";
  const n = l("pick-drives");
  n.innerHTML = "";
  for (const i of t.drives || []) {
    const r = document.createElement("button");
    r.textContent = i, r.classList.toggle("active", (t.cwd || "").toLowerCase().startsWith(i.toLowerCase().slice(0, 2))), r.addEventListener("click", () => He(i)), n.appendChild(r);
  }
  const s = l("pick-list");
  if (s.innerHTML = "", t.parent && t.parent !== t.cwd) {
    const i = document.createElement("li");
    i.textContent = "⬆ ..（上のフォルダへ）", i.addEventListener("click", () => He(t.parent)), s.appendChild(i);
  }
  for (const i of t.dirs || []) {
    const r = document.createElement("li");
    r.textContent = i.name, r.addEventListener("click", () => He(i.path)), s.appendChild(r);
  }
  for (const i of t.files || []) {
    const r = document.createElement("li");
    r.className = "pick-file", r.textContent = i.name, r.addEventListener("click", async () => {
      await un({ path: i.path.replace(/\\/g, "/"), external: !0, name: i.name }), ut();
    }), s.appendChild(r);
  }
}
function Sa() {
  if (!o.currentFile) {
    alert("先にファイルを開いてください。");
    return;
  }
  l("pick-modal").classList.remove("hidden"), He(l("root-path").textContent || "");
}
function ut() {
  l("pick-modal").classList.add("hidden");
}
const wi = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg"
};
function fs(e) {
  for (const t of e?.files || [])
    if (t.type in wi) return t;
  return null;
}
function Ma(e) {
  return new Promise((t, n) => {
    const s = new FileReader();
    s.onload = () => t(String(s.result).split(",", 2)[1] || ""), s.onerror = () => n(new Error("画像を読み込めませんでした")), s.readAsDataURL(e);
  });
}
async function ps(e) {
  if (!o.currentFile) {
    alert("⚠️ 画像を貼るには、先にファイルを開いて（または保存して）ください。");
    return;
  }
  let t;
  try {
    t = await A("/api/image", {
      note: o.currentFile,
      ext: wi[e.type],
      name: e.name || "",
      // D&D は元名を引き継ぐ。クリップボードは名前が無いので日時
      data_b64: await Ma(e)
    });
  } catch (s) {
    alert("⚠️ 画像を保存できませんでした: " + s.message);
    return;
  }
  const n = t.rel.split("/").pop().replace(/\.[^.]+$/, "");
  o.editor.executeEdits("insert-image", [
    { range: o.editor.getSelection(), text: `![${n}](${t.rel})` }
  ]), o.editor.focus(), await Y();
}
const _a = {
  prefill: (e) => `応答を待っています… ${e}s`,
  thinking: (e) => `思考中… ${e}s`,
  generating: (e) => `ツール呼び出しを生成中… ${e}s`,
  tool: (e) => `ツールを実行中… ${e}s`,
  approval: (e) => `承認を待っています… ${e}s`,
  verify: (e) => `結果を検証中… ${e}s`,
  responding: (e) => `回答を生成中… ${e}s`
};
function $a(e, t = !0) {
  const n = new Wi();
  let s = "", i = 0, r = "prefill", a = performance.now();
  const c = document.createElement("div");
  c.className = "wait-indicator", c.innerHTML = '<span class="dots"><i></i><i></i><i></i></span><span class="wait-text"></span>';
  const d = c.querySelector(".wait-text"), u = l("chat-activity");
  u && u.replaceChildren();
  const f = document.createElement("div");
  f.className = "activity-report";
  let h = "", p = !1, g = null, y = 0, E = 0;
  const L = "LLM全呼び出しの生成トークン数 ÷ 生成時間（思考・ツール呼び出しの生成を含む）", v = "受信した文字数 ÷ 3でトークン数を概算し、ストリームの受信時間で割った推定値。ツール実行・応答待ちの時間を除外します。", b = () => {
    let k = e.querySelector(".response-speed");
    k || (k = document.createElement("div"), k.className = "response-speed", e.appendChild(k)), k.textContent = h, k.title = p ? L : v;
  }, C = () => {
    c.isConnected || (u || e).prepend(c);
  }, _ = () => {
    if (!c.isConnected) return;
    const k = ((performance.now() - a) / 1e3).toFixed(1), I = _a[r] || ((U) => `${r}… ${U}s`), B = ((performance.now() - D) / 1e3).toFixed(1);
    d.textContent = I(k) + (i ? ` / LLM ${i}回目` : "") + ` / 全体 ${B}s` + (h ? ` / ${h}` : ""), d.title = p ? L : v;
  }, P = (k) => {
    k !== r && (r = k, a = performance.now(), g = null), C(), _(), X();
  }, D = performance.now();
  let S = null;
  const $ = (k, I = !1) => {
    if (!k.trim()) return;
    S || (S = document.createElement("details"), S.className = "think-box", S.innerHTML = '<summary></summary><div class="think-body"></div>', e.insertBefore(S, e.querySelector(".body")));
    const B = ((performance.now() - D) / 1e3).toFixed(1);
    S.querySelector("summary").textContent = I ? `💭 思考ログ（${k.length}文字・${B}s）` : "💭 思考中…", S.querySelector(".think-body").textContent = k, I && (S.open = !1);
  };
  C(), _();
  const F = setInterval(() => {
    _(), X();
  }, 200);
  return {
    onResponseStart(k) {
      n.start(k.response_id), i += 1, a = performance.now(), g = null, P("prefill");
    },
    onResponseEnd(k) {
      const I = n.end(k.response_id, k.progress, k.interrupted);
      if (I) {
        const { think: j, visible: Qe } = Ae(I);
        j && (s += j + `
`);
        const Te = Qe.trim();
        lo(e, Te), f.textContent = Te, Te && !f.isConnected && (u || e).appendChild(f);
      }
      const { think: B, visible: U } = Ae(n.text);
      $(s + B), Xt(e.querySelector(".body"), U), P(k.has_tool_calls ? "tool" : "verify");
    },
    onToken(k) {
      if (n.append(k), k.trim() && P("responding"), k.trim() && t && !p) {
        const U = performance.now();
        g !== null && (y += [...k].length, E += U - g), g = U, h = E >= 100 ? `推定 ${(y / 3 * 1e3 / E).toFixed(1)} tokens/sec` : "速度を計測中…", _();
      }
      const { think: I, visible: B } = Ae(n.text);
      $(s + I), Xt(e.querySelector(".body"), B), X();
    },
    /** エンジンのインジケータ（⏳ Prefill / 🧠 Thinking...）を待機表示のフェーズに反映する。 */
    setPhase: P,
    setSpeed(k) {
      p = !0, h = k, _(), b();
    },
    finish() {
      clearInterval(F), c.remove(), h === "速度を計測中…" && (h = "速度: 計測データなし"), h && b(), u && (u.textContent = h);
      const { think: k, visible: I } = Ae(n.text);
      return $(s + k, !0), I.trim() && Ge(e.querySelector(".body"), I, { assetBase: Je() }), I;
    }
  };
}
const Ta = [
  ["generating", ["Generating tool call"]],
  ["thinking", ["🧠", "Thinking..."]],
  ["prefill", ["⏳", "Prefill"]]
];
function Na(e) {
  for (const [t, n] of Ta)
    if (n.some((s) => e.includes(s))) return t;
  return null;
}
async function Ra(e, t) {
  const n = bt(), s = [], i = [];
  for (const a of [...o.checkedFiles]) {
    let c = null;
    try {
      c = await J("/api/file?path=" + encodeURIComponent(a), { signal: t });
    } catch (d) {
      if (t?.aborted) throw d;
      if (alert("⚠️ " + d.message), d.status === 423) continue;
    }
    c && c.content != null && i.push({ path: a, content: c.content }), vn(a) && s.push(a);
  }
  const r = [];
  if (o.currentFile)
    for (let a = 0; a < o.refs.length; a++) {
      const c = o.refs[a];
      if (o.checkedRefs.has(fe(c))) {
        if (dn(c) || hi(c)) {
          let d = null;
          try {
            d = await J(
              `/api/refs/read?note=${encodeURIComponent(o.currentFile)}&idx=${a}`,
              { signal: t }
            );
          } catch (u) {
            if (t?.aborted) throw u;
            if (alert("⚠️ " + u.message), u.status === 423) continue;
          }
          d && d.content != null && r.push({ path: c.path, content: d.content });
        }
        dn(c) || s.push(c.path);
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
const vi = {
  "/compact": "会話を要約して文脈を畳む。`/compact 認証まわり` のように残したい焦点を足せる",
  "/copilot": "エージェントが質問文を組み立てて Copilot に聞き、回答を精査して反映する",
  "/copilot_simple": "ローカル LLM を経由せず、打った文をそのまま Copilot へ1回質問する（選択範囲・チェック済みファイルは同梱、関連ファイルは添付される）",
  // 従来名。/copilot_simple と完全に同じ処理へ入る（サーバの COPILOT_DIRECT_COMMANDS）。
  "/copilot!": "`/copilot_simple` の別名（同じ動作）"
}, Pn = {
  "/help": { desc: "使えるコマンドの一覧を出す", run: () => Aa() },
  "/context": { desc: "いまの文脈の量（メッセージ数・概算文字数）を見る", run: () => Pa() },
  "/undo": { desc: "直前の往復を削除する（🗑 と同じ）", run: () => Fa() },
  "/clear": { desc: "会話をリセットする（Note は保存履歴も消す）", run: () => Da() },
  "/code": { desc: "Code モードへ切り替える", run: () => Ut("code") },
  "/note": { desc: "Note モードへ切り替える", run: () => Ut("note") },
  "/plan": { desc: "Plan モードへ切り替える", run: () => Ut("plan") }
};
async function Ut(e) {
  if (o.mode === e) {
    R("system", `既に ${Ue[e]} モードです。`);
    return;
  }
  await xn(e);
}
async function Ia(e) {
  const t = /^(\/\S+)(?:\s+([\s\S]*))?$/.exec(e);
  if (!t) return !1;
  const n = t[1].toLowerCase();
  if (n in vi) return !1;
  const s = Pn[n];
  return s ? (R("user", e), await s.run((t[2] || "").trim()), !0) : !1;
}
function Aa() {
  const e = [
    ...Object.entries(vi),
    ...Object.entries(Pn).map(([t, n]) => [t, n.desc])
  ].map(([t, n]) => `| \`${t}\` | ${n} |`);
  R("assistant", [
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
async function Pa() {
  let e;
  try {
    e = await oe("/api/context?session_id=" + encodeURIComponent(o.sessionId));
  } catch (n) {
    R("error", "⚠ 文脈を取得できません: " + n.message);
    return;
  }
  if (!e.supported) {
    R("assistant", "このエンジンでは文脈量を測れません（pixie_core API 1.6 以上が必要です）。");
    return;
  }
  const t = [
    `### 🧠 いまの文脈（${Ue[e.mode] || e.mode} モード）`,
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
  R("assistant", t.join(`
`));
}
function Fa() {
  const t = [...l("messages").children].reverse().find((s) => s.classList.contains("assistant") && s._exchange);
  if (!t) {
    R("system", "消せる往復がありません。");
    return;
  }
  const n = t.querySelector(".msg-del");
  n && n.click();
}
async function Da() {
  if (o.streaming) {
    alert("⚠️ 応答の生成中はリセットできません。");
    return;
  }
  const e = H() ? `
（保存されている会話履歴も消えます）` : "";
  if (!confirm("この会話をリセットしますか？" + e)) return;
  const t = T.begin("switching");
  if (!t) return;
  let n = "";
  try {
    try {
      await A("/api/session/clear", { session_id: o.sessionId });
    } catch (s) {
      n = s.message, alert("⚠️ リセットできません: " + s.message);
      return;
    }
    if (H())
      try {
        await J("/api/chat/history", { method: "DELETE" }), o.history = [], o.historyLoaded = !0;
      } catch (s) {
        n = s.message, alert("⚠️ 保存履歴を消せませんでした: " + s.message);
      }
    l("messages").innerHTML = "", o.assistantEl = null, o.sessionId = Ye(), $e(), R("system", "🧹 会話をリセットしました。");
  } catch (s) {
    return n = s.message, alert(s.message), !1;
  } finally {
    T.finish(t, n);
  }
}
async function Le(e) {
  if (!pn.ready || o.streaming) return;
  const t = e?.sourceBundle;
  if (t && (!o.copilotEnabled || ne)) return;
  const n = l("chat-input"), s = t ? e.message.trim() : n.value.trim();
  if (!s) return;
  const i = s.split(/\s/, 1)[0].toLowerCase();
  if (Object.hasOwn(Pn, i)) {
    await Ia(s) && (n.value = "");
    return;
  }
  const r = T.begin();
  if (!r) return;
  let a = "";
  try {
    const c = !t && H(), d = !t && Ze(), u = !t && Be() && o.codeStyle === "plan" && !o.planExecNext;
    t || (o.planExecNext = !1);
    const f = c ? Ja() : null;
    let h;
    if (t)
      h = { message: s, session_id: o.sessionId, source_bundle: t };
    else if (c)
      h = await Ra(s, r.controller.signal);
    else if (d) {
      const b = [];
      for (const C of [...o.checkedFiles]) {
        const _ = await J("/api/file?path=" + encodeURIComponent(C), { signal: r.controller.signal });
        _ && _.content != null && b.push({ path: C, content: _.content });
      }
      h = {
        message: s,
        session_id: o.sessionId,
        selection: bt(),
        current_file: o.currentFile || "",
        current_content: o.currentFile ? o.editor.getValue() : "",
        context_files: b
      };
    } else {
      const b = [];
      for (const C of [...o.checkedFiles]) {
        const _ = await J("/api/file?path=" + encodeURIComponent(C), { signal: r.controller.signal });
        _ && _.content != null && b.push({ path: C, content: _.content });
      }
      h = {
        message: s,
        session_id: o.sessionId,
        current_file: o.currentFile,
        current_content: o.currentFile ? o.editor.getValue() : "",
        selection: bt(),
        plan_first: u,
        autonomous: !u && !!l("autonomous-check")?.checked,
        verification_command: !u && l("autonomous-check")?.checked && l("verification-command")?.value.trim() || ""
      }, b.length && (h.context_files = b);
    }
    if (r.controller.signal.aborted || !T.current(r)) return;
    h.session_id = r.sessionId, t || (n.value = "");
    const p = t ? `${s}

添付: ${e.attachmentLabel || t.filename}` : s, g = R("user", p);
    o.changedPaths.size && (o.changedPaths.clear(), Xe()), o.assistantEl = R("assistant", ""), o.turnId = 0, o.compacted = null, o.assistantEl._exchange = { userEl: g, userText: p }, o.assistantUi = $a(o.assistantEl, !/^\/copilot/i.test(s) && !t);
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
      T.phase(r, "running"), await ji(b, r, T.current, async (C) => {
        T.current(r) && (C.type === "approval" && T.phase(r, "approval"), await Wa(C));
      });
    } catch (b) {
      r.controller.signal.aborted || (a = b.message, W(o.assistantEl, "⚠️ 実行失敗: " + b.message));
    }
    if (!T.current(r)) return;
    const y = r.controller.signal.aborted || r.outcome === "cancelled" || !!a, E = o.assistantEl, L = o.turnId, v = ms();
    c ? ja(E, s, v, f, y) : (d || u) && !y && Ha(v), Be() && !y && za(p, v), o.compacted && E?.isConnected ? Ba(E, o.compacted) : E?.isConnected && (Ds(E, () => yi(E, L)), Be() && L && co(E, () => Ka(L)));
  } catch (c) {
    r.controller.signal.aborted || (a = c.message, R("error", c.message));
  } finally {
    await r.interruption, T.current(r) && (o.assistantUi && ms(), l("approval").classList.add("hidden"), l("approval").innerHTML = "", be.length && ue(), T.finish(r, a));
  }
}
async function yi(e, t) {
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
      i = !!(await A(
        "/api/chat/turn/delete",
        { session_id: o.sessionId, turn_id: t }
      )).ok;
    } catch {
      i = !1;
    }
  if (H()) {
    const r = o.history.findIndex((a) => a.role === "user" && a.content === n?.userText);
    if (r >= 0) {
      const a = o.history[r + 1]?.role === "assistant" ? 2 : 1;
      o.history.splice(r, a), await kn();
    }
    if (!t)
      try {
        await A("/api/session/clear", { session_id: o.sessionId });
      } catch {
        i = !1;
      }
  }
  n?.userEl?.remove(), e.remove(), i || R("system", "⚠️ 表示からは消しましたが、AI の文脈からは消せませんでした（サーバ側の会話が既に入れ替わっています）。");
}
function Ba(e, t) {
  const n = l("messages");
  for (const i of [...n.children])
    i !== e && i.remove();
  const s = R(
    "system",
    `ここまでの会話（${t.before}件）を要約に畳みました（約${t.saved_chars.toLocaleString()}文字ぶんの文脈を解放）。`
  );
  n.insertBefore(s, e), H() && (o.history = [
    { role: "user", content: "（ここまでの会話は /compact で要約に置き換えました）" },
    { role: "assistant", content: t.summary }
  ], kn()), X(!0);
}
function Oa(e) {
  const t = /```plan[^\n]*\n([\s\S]*?)```/.exec(e || "");
  return t ? t[1].trim() : null;
}
function Ha(e) {
  let t = Oa(e);
  !t && /^\s*1[.)]\s/m.test(e || "") && (t = (e || "").trim()), t && Li(t);
}
function ja(e, t, n, s, i) {
  if (o.history.push({ role: "user", content: t }), (n.trim() || !i) && o.history.push({ role: "assistant", content: n }), kn(), !e || !e.isConnected) return;
  const r = uo(n);
  r.length ? Za(e, n, r) : !ec(e, n, s) && n.trim() && Qa(e, n, s);
}
async function Wa(e) {
  switch (e.type) {
    case "response_start":
      o.assistantUi?.onResponseStart(e);
      break;
    case "response_end":
      o.assistantUi?.onResponseEnd(e);
      break;
    case "token":
      e.text && o.assistantUi?.onToken(e.text);
      break;
    case "status": {
      if (e.category === "command") {
        o.assistantUi?.setPhase(e.phase === "running" ? "tool" : "verify"), W(o.assistantEl, e.text || "", e);
        break;
      }
      const t = e.phase || Na(e.text || "");
      if (t) {
        o.assistantUi?.setPhase(t);
        break;
      }
      W(o.assistantEl, e.text, { category: e.category, tool: e.tool });
      break;
    }
    case "turn":
      o.turnId = e.id || 0;
      break;
    case "compacted":
      o.compacted = e;
      break;
    case "approval":
      qa(e);
      break;
    case "workset":
      Ua(e.workset);
      break;
    case "files_changed":
      await xi(e.paths || []);
      break;
    case "turn_metrics": {
      const t = e.metrics || {}, n = Array.isArray(t.llm_calls) ? t.llm_calls.length : 0, s = Number(t.tool_calls || 0), i = Number(t.acceptance_retries || 0), r = [`LLM ${n}`, `tools ${s}`], a = Array.isArray(t.llm_calls) ? t.llm_calls : [], c = (u) => a.reduce((f, h) => f + (Number(h[u]) || 0), 0), d = a.filter((u) => Number(u.decode_tokens) > 0 && Number(u.decode_ms) > 0);
      if (d.length) {
        const u = d.reduce((p, g) => p + Number(g.decode_tokens), 0), f = d.reduce((p, g) => p + Number(g.decode_ms), 0), h = `${(u * 1e3 / f).toFixed(1)} tokens/sec`;
        r.push(h), o.assistantUi?.setSpeed(h);
      }
      if (a.length) {
        r.push(`LLM時間 ${c("wall_sec").toFixed(1)}秒`), a.some((h) => h.time_to_first_token != null) && r.push(`最初の生成データ待ち ${c("time_to_first_token").toFixed(1)}秒`), a.some((h) => h.prefill_sec != null) && r.push(`入力処理 ${c("prefill_sec").toFixed(1)}秒`), d.length && r.push(`生成 ${(c("decode_ms") / 1e3).toFixed(1)}秒`), r.push(a.some((h) => h.thinking_sec != null) ? `思考 ${c("thinking_sec").toFixed(1)}秒` : "思考 計測なし"), t.tool_wall_sec != null && r.push(`ツール実行 ${Number(t.tool_wall_sec).toFixed(1)}秒`);
        const u = c("prompt_tokens"), f = c("cache_tokens");
        u + f > 0 && r.push(`キャッシュ ${Math.round(100 * f / (u + f))}%`);
      }
      t.exit_reason && r.push(t.exit_reason), i && r.push(`acceptance retry ${i}`), W(
        o.assistantEl,
        `Turn: ${r.join(" / ")}`,
        { category: "turn_metrics" }
      );
      break;
    }
    case "error":
      W(o.assistantEl, "⚠ " + e.text);
      break;
  }
}
function Ua(e) {
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
  W(
    o.assistantEl,
    `📚 Workset: ${t.length}件（自動追加 ${e.stats?.auto_added || 0}件）`
  ), t.slice(0, 16).forEach((i) => {
    const r = [];
    i.symbols?.length && r.push(`symbol ${i.symbols.length}`), i.sections?.length && r.push(`節 ${i.sections.length}`), i.requirements?.length && r.push(`要件 ${i.requirements.length}`), i.mermaid?.length && r.push(`Mermaid ${i.mermaid.length}`), W(
      o.assistantEl,
      `  ${s[i.role] || i.role}: ${i.path}` + (r.length ? `（${r.join(" / ")}）` : "")
    );
  }), t.length > 16 && W(o.assistantEl, `  …ほか ${t.length - 16}件`), n.slice(0, 8).forEach((i) => W(o.assistantEl, `  ⏭ 省略: ${i.path}（${i.reason}）`));
}
function ms() {
  const e = o.assistantUi?.finish() ?? "";
  return o.assistantEl && !e.trim() && !o.assistantEl.querySelector(".tool-log, .progress-log") && (o.assistantEl.remove(), o.assistantEl = null), o.assistantUi = null, e;
}
function qa(e) {
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
  s.length && nc(s, i);
  const r = document.createElement("div");
  r.className = "row";
  const a = document.createElement("textarea");
  a.placeholder = "却下して別指示を出す場合はここに入力（任意）";
  const c = document.createElement("button");
  c.className = "btn-approve", c.textContent = "✓ 承認して実行", c.disabled = !!e.changeset && !e.changeset.ok, c.disabled && (c.title = "競合または検証エラーがあるため承認できません"), c.onclick = () => hs(e.id, !0, null);
  const d = document.createElement("button");
  d.className = "btn-reject", d.textContent = "✗ 却下", d.onclick = () => hs(e.id, !1, a.value.trim() || null), r.append(a, c, d), t.appendChild(r), X();
}
const qt = /* @__PURE__ */ new WeakSet();
async function bi(e, t, n) {
  const s = T.active;
  if (!s || T.state.phase !== "approval") return;
  const i = l("approval");
  if (qt.has(s)) return;
  qt.add(s);
  const r = i.firstChild, a = [...i.querySelectorAll("button"), l("diff-approve-edit")], c = a.map((d) => d.disabled);
  a.forEach((d) => {
    d.disabled = !0;
  });
  try {
    if (await A(e, { ...t, session_id: s.sessionId }), !T.current(s) || s.controller.signal.aborted) return;
    W(o.assistantEl, n), i.firstChild === r && (i.classList.add("hidden"), i.innerHTML = "", be.length && ue(), T.phase(s, "running"));
  } catch (d) {
    T.current(s) && !s.controller.signal.aborted && W(o.assistantEl, d.message);
  } finally {
    qt.delete(s), T.current(s) && (i.firstChild === r || !i.firstChild) && a.forEach((d, u) => {
      d.disabled = c[u];
    });
  }
}
async function hs(e, t, n) {
  return bi(
    "/api/approve",
    { id: e, approve: t, override: n },
    t ? "✓ 承認しました。" : "✗ 却下しました。"
  );
}
async function xi(e) {
  W(o.assistantEl, "変更されたファイル: " + e.join(", "));
  for (const t of e) o.changedPaths.add(t);
  await Y(), o.currentFile && e.includes(o.currentFile) && (o.dirty ? (o.conflictDeclined = !0, o.saveError = new se("エージェントがファイルを更新しました。未保存の編集は保持しています。保存前に変更を確認してください。", 409), K()) : await ae(o.currentFile, !0));
}
async function Va() {
  const e = T.stop();
  e && (Be() && (e.interruption = (async () => {
    let t = !1;
    for (let n = 0; n < 10; n++) {
      const s = await J("/api/interrupt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: e.sessionId }),
        signal: AbortSignal.timeout(5e3)
      });
      if (!T.current(e)) return;
      if (s.stopped !== !1) {
        t = !0;
        break;
      }
    }
    await Y(), T.current(e) && o.currentFile && !o.dirty && await ae(o.currentFile, !0, "none"), t || R("error", "停止を要求しましたが、処理の終了をまだ確認できません。ファイルの状態を確認してください。");
  })().catch((t) => {
    R("error", t.message);
  })), be.length && ue());
}
async function Ka(e) {
  if (o.streaming) {
    alert("⚠️ 実行中です。中断してから巻き戻してください。");
    return;
  }
  if (confirm(`このターンの前の状態へファイルを戻しますか？
以降のターンで同じファイルに加えた変更も巻き戻ります。
（このターンより後に作られたファイルは消さずに残ります。）`))
    try {
      const t = await A("/api/rollback", { session_id: o.sessionId, turn_id: e });
      if (!t.ok) {
        R("system", "⚠️ 巻き戻せませんでした（スナップショット無し: 古すぎるか容量上限）。");
        return;
      }
      R("system", t.restored.length ? `${t.restored.length}件を巻き戻しました: ${t.restored.join(", ")}` : "戻す変更はありませんでした（既にターン前の内容と同じです）。"), t.restored.length && await xi(t.restored);
    } catch (t) {
      alert("⚠️ 巻き戻しに失敗しました: " + t.message);
    }
}
function Ei(e) {
  if (o.streaming && !(e && T.current(e) && T.state.phase === "switching")) {
    alert("⚠️ 実行中です。中断してから新しい会話を開始してください。");
    return;
  }
  o.sessionId = Ye(), l("autonomous-check") && (l("autonomous-check").checked = !1), l("verification-command") && (l("verification-command").value = ""), l("messages").innerHTML = "", l("approval").classList.add("hidden"), be.length && ue(), o.assistantEl = null, R("system", "新しい会話を開始しました（別セッション）。"), $e();
}
function za(e, t) {
  A("/api/code-chat/log", { session_id: o.sessionId, user: e, assistant: t }).catch(() => {
  });
}
function Ga(e) {
  if (!e) return "";
  const t = Math.max(0, Date.now() / 1e3 - e);
  return t < 60 ? "たった今" : t < 3600 ? `${Math.floor(t / 60)}分前` : t < 86400 ? `${Math.floor(t / 3600)}時間前` : `${Math.floor(t / 86400)}日前`;
}
async function ki() {
  if (o.streaming) {
    alert("⚠️ 実行中です。中断してから開いてください。");
    return;
  }
  l("sessions-modal").classList.remove("hidden");
  const e = l("sessions-list");
  e.innerHTML = "";
  let t = [];
  try {
    t = (await oe("/api/code-chat/sessions")).sessions || [];
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
    a.className = "sess-sub", a.textContent = `${Ga(n.updated_at)} ・ ${n.messages} メッセージ` + (n.session_id === o.sessionId ? " ・現在の会話" : ""), i.append(r, a);
    const c = document.createElement("button");
    c.type = "button", c.textContent = "削除", c.title = "この会話を削除", c.addEventListener("click", async (d) => {
      d.stopPropagation(), confirm(`「${n.title}」を削除しますか？`) && (await A("/api/code-chat/delete", { session_id: n.session_id }).catch(() => {
      }), ki());
    }), s.append(i, c), s.addEventListener("click", () => Ya(n.session_id)), e.appendChild(s);
  }
}
async function Ya(e) {
  const t = T.begin("switching");
  if (!t) return;
  let n = "";
  l("sessions-modal").classList.add("hidden");
  try {
    const s = await oe("/api/code-chat/session?session_id=" + encodeURIComponent(e)), i = await A(
      "/api/code-chat/restore",
      { session_id: e, messages: s.messages }
    );
    T.finish(t), o.sessionId = e, $e(), l("messages").innerHTML = "";
    for (const r of s.messages || []) R(r.role, r.content, { assetBase: Je() });
    R("system", i.ok ? "✓ 会話を復元しました（エンジンの文脈も引き継がれています。続きから話せます）。" : "✓ 会話の表示を復元しました（このエンジンでは文脈の復元は未対応です）。"), X(!0);
  } catch (s) {
    n = s.message, alert("⚠️ 会話を復元できませんでした: " + s.message);
  } finally {
    T.finish(t, n);
  }
}
function $e() {
  l("session-info").textContent = "session: " + o.sessionId.slice(0, 8);
}
function Za(e, t, n) {
  let s = "", i = 0;
  for (const c of Bs(t))
    s += t.slice(i, c.start) + "修正案（差分で確認）", i = c.end;
  s += t.slice(i), Ge(e.querySelector(".body"), s, { assetBase: Je() });
  const r = document.createElement("div");
  r.className = "apply-actions";
  const a = document.createElement("button");
  a.className = "apply-btn", a.textContent = `▶ 差分で反映（${n.length}箇所）`, a.addEventListener("click", () => Xa(n, e)), r.appendChild(a), e.appendChild(r), X();
}
async function Xa(e, t) {
  const n = o.editor.getModel().getValue();
  let s;
  try {
    s = await A("/api/patch", { base: n, edits: e });
  } catch (a) {
    W(t, "⚠️ 適用計算に失敗: " + a.message);
    return;
  }
  if (s.results.forEach((a, c) => {
    a.ok ? a.method !== "exact" && W(t, `ℹ️ 修正${c + 1}: ${a.method} マッチで補正適用`) : W(t, `⚠️ 修正${c + 1}: ${a.error.split(`
`)[0]}`);
  }), s.applied === 0) {
    W(t, "⚠️ 適用できる修正がありませんでした。本文が変わっていないか確認してください。");
    return;
  }
  const i = s.mdflow_warnings || [];
  i.forEach((a) => W(t, `⚠️ mdflow: ${a}`));
  let r = `差分プレビュー：${s.applied}/${e.length} 箇所を適用（右は編集して調整可）`;
  i.length && (r += ` ⚠ mdflow: ${i.length}件の警告`), Fn(n, s.content, (a) => {
    const c = o.editor.getModel();
    o.editor.executeEdits(
      "pixie-patch",
      [{ range: c.getFullModelRange(), text: a, forceMoveMarkers: !0 }]
    ), o.editor.focus();
  }, r);
}
function Ja() {
  o.pendingTarget?.coll && o.pendingTarget.coll.clear();
  const e = o.editor.getSelection();
  if (!e || e.isEmpty())
    return o.pendingTarget = null, null;
  const t = o.editor.createDecorationsCollection([
    { range: e, options: { className: "pixie-pending-target" } }
  ]);
  return o.pendingTarget = { file: o.currentFile, coll: t }, o.pendingTarget;
}
function Qa(e, t, n) {
  const s = document.createElement("div");
  s.className = "apply-actions";
  const i = document.createElement("button");
  i.className = "insert-btn", i.textContent = "▶ エディタへ反映", i.title = "このメッセージの提案を差分プレビューで確認してから反映する", i.addEventListener("click", () => Ci(fo(t), n)), s.appendChild(i), e.appendChild(s), X();
}
function ec(e, t, n) {
  const s = [...t.matchAll(/```apply\s*\n([\s\S]*?)```/g)];
  if (!s.length) return !1;
  const i = s[s.length - 1][1].replace(/\n$/, "");
  e.querySelector(".body").textContent = t.replace(/```apply\s*\n[\s\S]*?```/g, "修正案（下のボックス参照）");
  const r = document.createElement("div");
  r.className = "apply-box", r.textContent = i;
  const a = document.createElement("div");
  a.className = "apply-actions";
  const c = document.createElement("button");
  return c.className = "apply-btn", c.textContent = "▶ 差分で反映", c.addEventListener("click", () => Ci(i, n)), a.appendChild(c), e.append(r, a), X(), !0;
}
function Ci(e, t) {
  const n = tc(t), s = o.editor.getModel().getValueInRange(n);
  Fn(s, e, (i) => {
    o.editor.executeEdits("pixie-apply", [{ range: n, text: i, forceMoveMarkers: !0 }]), t?.coll && t.coll.clear(), o.editor.focus();
  });
}
function tc(e) {
  const t = o.editor.getModel();
  if (e?.coll && e.file === o.currentFile) {
    const n = e.coll.getRange(0);
    if (n) return n;
  }
  return t.getFullModelRange();
}
let ee = null, kt = null, be = [], ve = null;
function Fn(e, t, n, s, i = {}) {
  mn("editor");
  const r = o.monaco;
  l("diff-label").textContent = s || "差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）", l("diff-overlay").classList.remove("hidden"), l("diff-apply").classList.toggle("hidden", !!i.approval), l("diff-cancel").classList.toggle("hidden", !!i.approval), l("diff-close").classList.toggle("hidden", !i.approval), ee || (ee = r.editor.createDiffEditor(l("diff-editor"), {
    theme: "vs-dark",
    automaticLayout: !0,
    renderSideBySide: !0,
    originalEditable: !1,
    readOnly: !1,
    minimap: { enabled: !1 },
    wordWrap: "on",
    fontSize: 14
  })), ee.updateOptions({ readOnly: !n && !i.editable });
  const a = i.lang || (o.currentFile ? wn(o.currentFile) : "markdown"), c = r.editor.createModel(e, a), d = r.editor.createModel(t, a);
  ee.setModel({ original: c, modified: d }), kt = n ? () => {
    const u = ee.getModel().modified.getValue();
    ue(), n(u);
  } : null, ee.focus();
}
function ue() {
  if (l("diff-overlay").classList.add("hidden"), kt = null, be = [], ve = null, l("diff-tabs").innerHTML = "", l("diff-approve-edit").classList.add("hidden"), ee) {
    const e = ee.getModel();
    ee.setModel(null), e && (e.original.dispose(), e.modified.dispose());
  }
}
function nc(e, t = null) {
  be = e, ve = t, l("diff-approve-edit").classList.toggle("hidden", !t);
  const n = l("diff-tabs");
  n.innerHTML = "", e.length > 1 && e.forEach((s, i) => {
    const r = document.createElement("button");
    r.type = "button", r.textContent = (s.path || "").split("/").pop() || s.path, r.title = s.path, r.addEventListener("click", () => gs(i)), n.appendChild(r);
  }), gs(0);
}
function gs(e) {
  const t = be[e];
  t && ([...l("diff-tabs").children].forEach((n, s) => n.classList.toggle("active", s === e)), Fn(
    t.before,
    t.after,
    null,
    `承認確認: ${t.path}（左＝現在 ／ 右＝書き込まれる内容${ve ? "・右を編集して修正して承認できます" : ""}）`,
    { approval: !0, editable: !!ve, lang: wn(t.path || "") }
  ));
}
async function sc(e, t, n) {
  return bi("/api/approve-edit", { id: e, path: t, content: n }, "✓ 修正して承認しました（編集内容を適用）。");
}
function Li(e) {
  mn("editor"), o.planText = e, Ge(l("plan-body"), e), l("plan-label").textContent = "実行計画（承認するまでファイルは変更されません）", l("plan-overlay").classList.remove("hidden");
}
function Si() {
  l("plan-overlay").classList.add("hidden"), l("plan-body").innerHTML = "", o.planText = "";
}
async function ic() {
  const e = o.planText;
  if (!e) return;
  if (Si(), Be()) {
    o.planExecNext = !0, R("system", "✓ 計画を承認しました。実装を開始します（書き込みは引き続き承認制）。"), l("chat-input").value = `以下の実行計画を承認しました。この計画のとおりに実装してください。計画から外れる変更が必要になったら、実行する前に知らせてください。

` + e, await Le();
    return;
  }
  if (!await xn("code", { keepMessages: !0 })) {
    Li(e);
    return;
  }
  R("system", "計画を承認しました。Codeモードで実行します。"), l("chat-input").value = `以下の実行計画を承認しました。この計画のとおりに実装してください。計画から外れる変更が必要になったら、実行する前に知らせてください。

` + e, await Le();
}
function ws() {
  l("plan-overlay").classList.add("hidden"), R("system", "✕ 計画の修正を依頼します。どこをどう直したいかチャットに書いてください。"), l("chat-input").focus();
}
async function Se(e) {
  const t = await G("/api/workspace/dirs?path=" + encodeURIComponent(e || ""));
  if (!t) return;
  l("root-input").value = t.cwd || "", Mn();
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
async function fn() {
  l("root-modal").classList.remove("hidden"), await ei(), ni(), await Se(l("root-path").textContent || "");
}
function ft() {
  l("root-modal").classList.add("hidden");
}
const rc = () => Dn(l("root-input").value.trim());
async function Dn(e) {
  if (!e) return;
  if (we) {
    alert("⚠️ 置換が完了してから作業フォルダを切り替えてください。");
    return;
  }
  if (o.streaming) {
    alert("⚠️ 実行中は作業フォルダを切り替えられません。");
    return;
  }
  const t = T.begin("switching");
  if (!t) return;
  let n = "", s;
  try {
    for (; o.savePromise; ) await o.savePromise;
    if (await Tt(), o.dirty && !confirm("未保存の変更があります。破棄して作業フォルダを切り替えますか？")) return;
    ne = !0, s = o.editor.getOption(o.monaco.editor.EditorOption.readOnly), o.editor.updateOptions({ readOnly: !0 }), q++, Lt?.reset(), lt++, ye++;
    let i;
    try {
      i = await A("/api/workspace", { path: e });
    } catch (r) {
      n = r.message, alert("⚠️ フォルダ変更に失敗: " + r.message);
      return;
    }
    ft(), o.currentFile = null, o.baseMtime = null, Ao(), ma(), o.collapsedDirs.clear(), o.knownDirs.clear(), o.changedPaths.clear(), o.saveError = null, o.editor.setValue(""), _t(), K(), l("current-file").textContent = "（ファイル未選択）", _e(), Us(), await js(), yn(), await Mt(), await Y(), H() ? (o.sessionId = Ye(), $e(), l("approval").classList.add("hidden"), o.assistantEl = null, await En()) : Ei(t), R("system", "作業フォルダを変更: " + (i.workspace || e));
  } catch (i) {
    return n = i.message, alert(i.message), !1;
  } finally {
    ne = !1, s !== void 0 && o.editor.updateOptions({ readOnly: s }), T.finish(t, n);
  }
}
async function oc() {
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
      await Y(), await ae(n.path);
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
async function ac() {
  he("ブラウザを起動中…");
  try {
    const e = await (await fetch("/api/copilot/open", { method: "POST" })).json();
    he(e.ok ? "Copilot を開きました。ブラウザで対話してください。" : e.error);
  } catch (e) {
    he("エラー: " + e.message);
  }
}
async function cc() {
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
async function lc() {
  l("settings-modal").classList.remove("hidden"), await Promise.all([
    dc(),
    _i(),
    Mi(),
    $i()
  ]);
}
async function dc() {
  const e = l("settings-model");
  if (!e) return;
  const t = await oe("/api/servers").catch(() => ({ servers: [], active: 0 }));
  e.innerHTML = "", (t.servers || []).forEach((n, s) => {
    const i = document.createElement("option");
    i.value = s, i.textContent = `${n.name} — ${n.model || "(model?)"}`, s === t.active && (i.selected = !0), e.appendChild(i);
  }), e.onchange = async () => {
    try {
      await A("/api/settings", { active_server: Number(e.value) });
    } catch (n) {
      alert("⚠️ 設定を保存できません: " + n.message);
    }
    await Promise.all([_i(), Mi(), Mt()]);
  };
}
async function Mi() {
  const e = await oe("/api/settings").catch(() => ({})), t = l("settings-think-budget");
  t && (e.think_budget_min != null && (t.min = e.think_budget_min), e.think_budget_max != null && (t.max = e.think_budget_max), e.think_budget_sec != null && (t.value = e.think_budget_sec), l("settings-think-budget-status").textContent = "");
  const n = l("settings-context-length");
  n && (e.context_length_min != null && (n.min = e.context_length_min), e.context_length_max != null && (n.max = e.context_length_max), e.context_length != null && (n.value = e.context_length || 0), l("settings-context-length-status").textContent = "");
}
async function vs() {
  const e = l("settings-think-budget"), t = l("settings-think-budget-status");
  t.textContent = "保存中…";
  try {
    const n = await A("/api/settings", { think_budget_sec: Number(e.value) });
    e.value = n.think_budget_sec, t.textContent = `✓ ${n.think_budget_sec} 秒にしました`;
  } catch (n) {
    t.textContent = "⚠ " + n.message;
  }
}
async function ys() {
  const e = l("settings-context-length"), t = l("settings-context-length-status");
  t.textContent = "保存中…";
  try {
    const n = await A("/api/settings", { context_length: Number(e.value) });
    e.value = n.context_length || 0, t.textContent = n.context_length ? `✓ ${n.context_length.toLocaleString()} トークンにしました（会話は作り直し）` : "✓ 自動（バックエンドの取得値）に戻しました";
  } catch (n) {
    t.textContent = "⚠ " + n.message;
  }
}
async function _i() {
  const e = l("settings-llm-model");
  if (!e) return;
  e.innerHTML = "", e.disabled = !0;
  const t = document.createElement("option");
  t.textContent = "(取得中…)", e.appendChild(t);
  const n = await oe("/api/models").catch(() => ({ models: [] })), s = n.models || [];
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
        await A("/api/settings", { model: e.value });
      } catch (i) {
        alert("⚠️ モデルを保存できません: " + i.message);
      }
      await Mt();
    }
  };
}
function Vt() {
  l("settings-modal").classList.add("hidden");
}
async function $i() {
  const e = await oe("/api/copilot").catch(() => ({}));
  l("settings-copilot").checked = !!e.enabled, o.copilotEnabled = !!e.enabled, bn();
  const t = [];
  e.enabled && t.push("オン"), e.script_ok ? e.python_ok ? e.enabled && t.push("PrayLight OK — 未ログインなら下のボタンでブラウザを開いてログイン") : t.push("⚠ PrayLight の .venv Python 未検出") : t.push("⚠ PrayLight 未検出: " + (e.praylight_dir || "?")), l("settings-copilot-status").textContent = t.join(" / ");
}
async function uc(e) {
  try {
    const t = await A("/api/copilot/enable", { enabled: l("settings-copilot").checked });
    o.copilotEnabled = !!t.enabled, bn();
  } catch (t) {
    alert("⚠️ 設定を保存できません: " + t.message), e.target.checked = !e.target.checked;
  }
  await $i();
}
async function fc() {
  l("settings-copilot-status").textContent = "起動中…";
  const e = await A("/api/copilot/open").catch(() => ({ ok: !1, error: "通信エラー" }));
  l("settings-copilot-status").textContent = e.ok ? "ブラウザを開きました。Copilot にログインしてください。" : e.error || "起動失敗";
}
function pc() {
  Lt = Ui({
    getSnapshot: () => ({
      current_file: o.currentFile || "",
      current_content: o.currentFile ? o.editor.getValue() : null,
      generation: q
    }),
    isCurrent: (e) => e === q && !ne,
    canSend: () => pn.ready && !o.streaming && o.copilotEnabled && !ne,
    send: (e) => Le(e)
  }), l("send-btn").addEventListener("click", () => o.streaming ? Va() : Le()), l("new-session-btn").addEventListener("click", Ei), l("sessions-btn").addEventListener("click", ki), l("sessions-close").addEventListener("click", () => l("sessions-modal").classList.add("hidden")), l("sessions-modal").addEventListener("click", (e) => {
    e.target === l("sessions-modal") && l("sessions-modal").classList.add("hidden");
  }), $e(), _e(), l("save-btn").addEventListener("click", () => tn()), l("preview-btn").addEventListener("click", an), l("richcopy-btn").addEventListener("click", aa), l("preview").addEventListener("wheel", ai, { passive: !0 }), l("preview").addEventListener("scroll", () => {
    Ko(), de && di(o.editor.getModel(), de.range);
  }, { passive: !0 }), document.addEventListener("selectionchange", () => {
    clearTimeout(cs), cs = setTimeout(Yo, zo);
  }), Uo(), la(), l("refresh-btn").addEventListener("click", () => Y()), l("autonomous-check").addEventListener("change", async () => {
    const e = l("autonomous-check"), t = l("verification-command");
    if (!e.checked || t.value.trim()) return;
    const n = q, s = o.sessionId, i = await G("/api/workspace/verification-command");
    i && n === q && s === o.sessionId && e.checked && !t.value.trim() && !o.streaming && (t.value = i.command || "");
  }), l("file-search").addEventListener("input", pa), l("search-case").addEventListener("change", () => Nn(l("file-search").value)), l("replace-toggle").addEventListener("click", ga), l("replace-preview-btn").addEventListener("click", () => Wt(!0)), l("replace-run-btn").addEventListener("click", () => Wt(!1)), l("replace-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Wt(!0));
  }), l("nav-back").addEventListener("click", nn), l("nav-fwd").addEventListener("click", sn), l("recent-btn").addEventListener("click", (e) => {
    e.stopPropagation(), rn();
  }), l("history-btn").addEventListener("click", Po), l("hist-close").addEventListener("click", dt), l("hist-restore").addEventListener("click", Bo), l("hist-modal").addEventListener("click", (e) => {
    e.target === l("hist-modal") && dt();
  }), Me(), l("mode-btn").addEventListener("click", vo), l("code-style-btn").addEventListener("click", wo), l("plan-approve").addEventListener("click", ic), l("plan-reject").addEventListener("click", ws), l("note-btn").addEventListener("click", ya), l("chat-clear-btn").addEventListener("click", yo), La(), l("ref-add-btn").addEventListener("click", Sa), l("pick-cancel").addEventListener("click", ut), l("pick-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), He(l("pick-input").value.trim()));
  }), l("pick-modal").addEventListener("click", (e) => {
    e.target === l("pick-modal") && ut();
  }), l("diff-apply").addEventListener("click", () => {
    kt && kt();
  }), l("diff-cancel").addEventListener("click", ue), l("diff-close").addEventListener("click", ue), l("diff-approve-edit").addEventListener("click", () => {
    if (!ve || !ee) return;
    const e = ee.getModel().modified.getValue();
    sc(ve.id, ve.path, e);
  }), l("chat-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.ctrlKey || e.metaKey) && (e.preventDefault(), Le());
  }), l("new-file-btn").addEventListener("click", () => gt("file")), l("new-folder-btn").addEventListener("click", () => gt("dir")), l("web2md-btn").addEventListener("click", oc), l("cp-bar-open-btn").addEventListener("click", ac), l("cp-bar-import-btn").addEventListener("click", cc), document.addEventListener("click", qe), Co(), l("root-project-btn").addEventListener("click", fn), l("folder-btn").addEventListener("click", fn), l("root-cancel").addEventListener("click", ft), l("root-ok").addEventListener("click", rc), l("places-btn").addEventListener("click", (e) => {
    e.stopPropagation(), Ho();
  }), l("root-fav-btn").addEventListener("click", () => {
    const e = l("root-input").value.trim();
    e && si(e);
  }), l("root-input").addEventListener("input", Mn), l("root-input").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), Se(l("root-input").value.trim()));
  }), l("root-modal").addEventListener("click", (e) => {
    e.target === l("root-modal") && ft();
  }), l("settings-btn").addEventListener("click", lc), l("settings-close").addEventListener("click", Vt), l("settings-think-budget-save").addEventListener("click", vs), l("settings-think-budget").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), vs());
  }), l("settings-context-length-save").addEventListener("click", ys), l("settings-context-length").addEventListener("keydown", (e) => {
    e.key === "Enter" && (e.preventDefault(), ys());
  }), l("settings-copilot").addEventListener("change", uc), l("settings-copilot-open").addEventListener("click", fc), l("settings-modal").addEventListener("click", (e) => {
    e.target === l("settings-modal") && Vt();
  }), window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault(), tn();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault(), an();
      return;
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault(), e.key === "ArrowLeft" ? nn() : sn();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "e") {
      e.preventDefault(), rn();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "h" && de) {
      e.preventDefault(), ui();
      return;
    }
    e.key === "Escape" && !l("hist-modal").classList.contains("hidden") ? dt() : e.key === "Escape" && !l("root-modal").classList.contains("hidden") ? ft() : e.key === "Escape" && !l("pick-modal").classList.contains("hidden") ? ut() : e.key === "Escape" && !l("cf-modal").classList.contains("hidden") ? l("cf-modal").classList.add("hidden") : e.key === "Escape" && !l("sessions-modal").classList.contains("hidden") ? l("sessions-modal").classList.add("hidden") : e.key === "Escape" && !l("settings-modal").classList.contains("hidden") ? Vt() : e.key === "Escape" && !l("diff-overlay").classList.contains("hidden") ? ue() : e.key === "Escape" && !l("plan-overlay").classList.contains("hidden") && ws();
  }), window.addEventListener("blur", () => {
    Tt();
  }), window.addEventListener("beforeunload", (e) => {
    o.dirty && (e.preventDefault(), e.returnValue = "");
  }), yc(), bc(), xc();
}
const mc = "pixie.splitRatio", hc = "pixie.previewRatio", gc = 320, wc = 160;
function Ti({ divider: e, pane: t, container: n, min: s, key: i, after: r }) {
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
let Bn = null;
function vc() {
  Bn?.restore();
}
function yc() {
  const { restore: e } = Ti({
    divider: l("divider"),
    pane: l("left-pane"),
    container: l("split"),
    min: gc,
    key: mc,
    // 左ペインが細くなるとプレビュー側が押し出される。エディタは固定幅（flex-shrink:0）
    // なので放っておくとプレビューが 0px に潰れる。現在幅を入れ直して再クランプする。
    after: () => {
      te() && Bn?.reclamp();
    }
  });
  e();
}
function bc() {
  Bn = Ti({
    divider: l("preview-divider"),
    pane: l("editor"),
    container: l("edit-area"),
    min: wc,
    key: hc
  });
}
const Kt = "pixie.filemgrHeight", bs = 80;
function xc() {
  const e = l("v-divider"), t = l("filemgr");
  if (!e || !t) return;
  const n = (r) => {
    t.style.flex = `0 0 ${r}px`, t.style.maxHeight = "none";
  }, s = Number(localStorage.getItem(Kt));
  s >= bs && n(s);
  let i = !1;
  e.addEventListener("mousedown", (r) => {
    r.preventDefault(), i = !0, document.body.style.cursor = "row-resize";
  }), window.addEventListener("mouseup", () => {
    i && (i = !1, document.body.style.cursor = "", localStorage.setItem(Kt, String(t.getBoundingClientRect().height)));
  }), window.addEventListener("mousemove", (r) => {
    if (!i) return;
    const a = t.getBoundingClientRect().top, c = l("right-pane").getBoundingClientRect().bottom - a - 220;
    n(Math.max(bs, Math.min(r.clientY - a, c)));
  }), e.addEventListener("dblclick", () => {
    t.style.flex = "", t.style.maxHeight = "", localStorage.removeItem(Kt);
  });
}
