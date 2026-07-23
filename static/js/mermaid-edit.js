// Mermaid フローチャートの双方向編集: プレビュー上の図を直接操作（ノードのラベル編集・
// 追加・削除、矢印の追加・削除・ラベル編集）し、その変更を **Mermaid ソースへの最小編集**
// としてエディタに反映する（mdflow のプリセットクリックと同じ「プレビュー操作 →
// ソースの最小編集 → executeEdits → 再描画」パターン）。
//
// 設計:
// - parseFlowchart(src) がソースを行ベースで解析し、ノード/辺/文の**位置情報(span)**付き
//   モデルを作る。編集操作はそのモデルから {start,end,text} の編集列を返すだけ（純粋関数）。
// - DOM 操作（クリック→選択→編集）は enterEditMode が担い、編集の適用は app.js が注入する
//   api.applyEdits 経由（Meraco の executeEdits = undo 可能・差分プレビュー不要の直接編集）。
// - 適用後エディタの内容変更でプレビューが再描画され、app.js が編集モードへ再入場する
//   （markdown.js の setOnDiagramRendered フック）。
//
// 対応範囲（サブセット）: flowchart/graph ヘッダ、ノード定義（よく使う形）、
// 辺（--> --- -.-> -.- ==> === --x --o とその双向、|ラベル| 付き）、チェイン記法、
// classDef/class/style/%% コメント等のパススルー。subgraph は非対応（図全体が編集不可表示）。
// パースできない行は「その他」として温存する（その行内の辺は編集できないが他は編集可）。

// ---- ノード形状（開き/閉じの対。長いものを先に試す） --------------------------
const SHAPES = [
  ["((", "))"], ["{{", "}}"], ["[[", "]]"], ["[(", ")]"], ["[/", "/]"], ["[\\", "\\]"],
  [">", "]"], ["[", "]"], ["(", ")"], ["{", "}"],
];

// ---- 矢印記法（長いものを先に試す） -------------------------------------------
const ARROWS = ["<==>", "<-.->", "<-->", "<->", "-.->", "-.-", "-->", "---", "==>", "===", "--x", "--o"];

const HEADER_RE = /^\s*(flowchart|graph)\s*(TD|TB|BT|LR|RL)?\s*$/i;
const PASSTHROUGH_RE = /^\s*(classDef|class|style|linkStyle|click|direction|accTitle|accDescr|title)\b/i;
const ID_RE = /^[A-Za-z0-9_\u0080-\uFFFF][A-Za-z0-9_.\-\u0080-\uFFFF]*/;

/**
 * フローチャートソースを解析する。
 * 戻り値: { supported, reason?, hasHeader, statements, nodes, edges, indent }
 * - statements: [{type:"node"|"edge"|"other", start, end, indent, refs?, arrows?}]
 *   （start/end は src 内の絶対オフセット。end は行末の \n を含まない）
 * - nodes: Map<id, {id, def, firstRef}>（def: {label, labelSpan, span, raw, quoted, shape}）
 * - edges: [{from, to, arrow, stmtIdx, indexInStmt}]
 */
export function parseFlowchart(src) {
  const model = {
    supported: true, reason: "", hasHeader: false,
    statements: [], nodes: new Map(), edges: [], indent: "",
  };
  const lines = src.split("\n");
  let offset = 0;
  for (const line of lines) {
    const start = offset;
    offset += line.length + 1; // "\n" 込み
    const end = start + line.length;
    if (!line.trim()) continue;
    if (/^\s*%%/.test(line)) { pushOther(model, line, start, end); continue; }
    if (HEADER_RE.test(line)) { model.hasHeader = true; pushOther(model, line, start, end); continue; }
    if (/^\s*(subgraph|end)\b/i.test(line)) {
      model.supported = false;
      model.reason = "subgraph を含む図は編集できません";
      return model;
    }
    if (PASSTHROUGH_RE.test(line)) { pushOther(model, line, start, end); continue; }

    const stmt = parseEdgeOrNode(line, start, end, model);
    if (!stmt) { pushOther(model, line, start, end); continue; }
    if (!model.indent && stmt.type !== "other") model.indent = stmt.indent;
    model.statements.push(stmt);
    if (stmt.type === "node") {
      registerRef(model, stmt.ref);
    } else {
      stmt.refs.forEach((r) => registerRef(model, r));
      for (let i = 0; i < stmt.arrows.length; i++) {
        model.edges.push({
          from: stmt.refs[i].id, to: stmt.refs[i + 1].id,
          arrow: stmt.arrows[i], stmtIdx: model.statements.length - 1, indexInStmt: i,
        });
      }
    }
  }
  return model;
}

function pushOther(model, line, start, end) {
  model.statements.push({ type: "other", start, end, indent: leadingWs(line) });
}

function leadingWs(line) {
  const m = /^([ \t]*)/.exec(line);
  return m ? m[1] : "";
}

/** 1行をノード文または辺（チェイン）文として解析。ダメなら null（呼び出し側で other 扱い）。 */
function parseEdgeOrNode(line, lineStart, lineEnd, model) {
  const indent = leadingWs(line);
  const s = { text: line, pos: indent.length };

  const skipWs = () => { while (s.pos < line.length && /\s/.test(line[s.pos])) s.pos++; };
  const abs = () => lineStart + s.pos;

  function parseRef() {
    skipWs();
    const m = ID_RE.exec(line.slice(s.pos));
    if (!m) return null;
    let id = m[0].replace(/[-.]+$/, ""); // 末尾の - や . は矢印の一部混入なので削る
    if (!id) return null;
    const idStart = abs();
    s.pos += id.length;
    const ref = { id, span: { start: idStart, end: idStart + id.length }, def: null };
    // 形状 + ラベル
    for (const [open, close] of SHAPES) {
      if (!line.startsWith(open, s.pos)) continue;
      const labelStart = s.pos + open.length;
      let labelEnd = -1, quoted = false, contentStart = labelStart;
      if (line[labelStart] === '"') {
        quoted = true; contentStart = labelStart + 1;
        let i = contentStart;
        while (i < line.length) {
          if (line[i] === "\\" && line[i + 1] === '"') { i += 2; continue; }
          if (line[i] === '"') { labelEnd = i; break; }
          i++;
        }
        if (labelEnd < 0) return null;
        if (!line.startsWith(close, labelEnd + 1)) return null;
      } else {
        const ci = line.indexOf(close, labelStart);
        if (ci < 0) return null;
        labelEnd = ci;
      }
      const defEnd = labelEnd + (quoted ? 1 : 0) + close.length;
      let rawEnd = defEnd;
      // :::className 修飾はそのまま保持（ラベル編集の span には影響しない）
      const cls = /^:::[A-Za-z0-9_-]+/.exec(line.slice(defEnd));
      if (cls) rawEnd = defEnd + cls[0].length;
      ref.def = {
        label: line.slice(contentStart, labelEnd),
        quoted,
        shape: [open, close],
        labelSpan: { start: lineStart + contentStart, end: lineStart + labelEnd },
        span: { start: idStart, end: lineStart + rawEnd },
        raw: line.slice(idStart - lineStart, rawEnd),
      };
      s.pos = rawEnd; // rawEnd は行頭基準の相対オフセット（s.pos も同じ基準）
      ref.span = { start: idStart, end: lineStart + rawEnd };
      return ref;
    }
    return ref;
  }

  function parseArrow() {
    skipWs();
    for (const a of ARROWS) {
      if (!line.startsWith(a, s.pos)) continue;
      const aStart = abs();
      s.pos += a.length;
      const arrow = { text: a, span: { start: aStart, end: abs() }, label: null, labelSpan: null, pipeSpan: null };
      skipWs();
      if (line[s.pos] === "|") {
        const closeIdx = line.indexOf("|", s.pos + 1);
        if (closeIdx < 0) return null;
        arrow.label = line.slice(s.pos + 1, closeIdx);
        arrow.pipeSpan = { start: abs(), end: lineStart + closeIdx + 1 };
        arrow.labelSpan = { start: abs() + 1, end: lineStart + closeIdx };
        s.pos = closeIdx + 1;
      }
      return arrow;
    }
    return null;
  }

  const first = parseRef();
  if (!first) return null;
  const arrow1 = parseArrow();
  if (!arrow1) {
    // ノード単独文（行末、または %% コメントのみ許容）
    skipWs();
    if (s.pos < line.length && !line.slice(s.pos).startsWith("%%")) return null;
    return { type: "node", start: lineStart, end: lineEnd, indent, ref: first };
  }
  // 辺チェイン: ref (arrow ref)*
  const refs = [first];
  const arrows = [arrow1];
  for (;;) {
    const r = parseRef();
    if (!r) return null;
    refs.push(r);
    skipWs();
    if (s.pos >= line.length || line.slice(s.pos).startsWith("%%")) break;
    const a = parseArrow();
    if (!a) return null;
    arrows.push(a);
  }
  return { type: "edge", start: lineStart, end: lineEnd, indent, refs, arrows };
}

function registerRef(model, ref) {
  const existing = model.nodes.get(ref.id);
  if (!existing) {
    model.nodes.set(ref.id, { id: ref.id, def: ref.def, firstRef: ref });
  } else if (ref.def && !existing.def) {
    existing.def = ref.def;
  }
}

// ---- 編集操作（どれも {start,end,text}[] を返す純粋関数） ----------------------

/** ラベルに使うテキストの Escape。closer はその形状の閉じ記号（"))" 等）。 */
function serLabel(label, closer) {
  let t = label.replace(/"/g, "#quot;");
  // 閉じ記号の構成文字や | が混ざると構文が壊れるので引用符で囲む
  const bad = new Set(closer.split(""));
  if (t.includes("|") || [...t].some((ch) => bad.has(ch))) t = `"${t}"`;
  return t;
}

function serArrow(arrow) {
  return arrow.text + (arrow.label != null ? `|${arrow.label}|` : "");
}

function serRef(ref) {
  return ref.def ? ref.def.raw : ref.id;
}

/** 次の空きノードID（N1, N2, ...）。 */
export function nextFreeId(nodes) {
  for (let n = 1; ; n++) {
    const id = `N${n}`;
    if (!nodes.has(id)) return id;
  }
}

/** 追記位置: 最終文末の後ろ（改行の次）＋その図の標準インデント。文が1つもなければ先頭。 */
function appendInfo(model, src) {
  const last = model.statements[model.statements.length - 1];
  const indent = model.indent || "";
  if (!last) return { at: 0, prefix: "" };
  const at = last.end;
  return { at, prefix: "\n" + indent };
}

/** ノードラベルの変更。定義が無い（裸のID参照だけ）ノードは [ラベル] を付けて定義に昇格。 */
export function editNodeLabel(model, src, nodeId, newLabel) {
  const node = model.nodes.get(nodeId);
  if (!node) return [];
  if (node.def) {
    const close = node.def.shape[1];
    const text = node.def.quoted
      ? newLabel.replace(/"/g, "#quot;")
      : serLabel(newLabel, close);
    return [{ start: node.def.labelSpan.start, end: node.def.labelSpan.end, text }];
  }
  const r = node.firstRef;
  return [{ start: r.span.start, end: r.span.end, text: `${r.id}[${serLabel(newLabel, "]")}]` }];
}

/** 辺ラベルの設定（空文字はラベル削除）。 */
export function editEdgeLabel(model, src, edgeIdx, newLabel) {
  const edge = model.edges[edgeIdx];
  if (!edge) return [];
  const arrow = edge.arrow;
  if (!newLabel.trim()) {
    if (arrow.pipeSpan) return [{ start: arrow.pipeSpan.start, end: arrow.pipeSpan.end, text: "" }];
    return [];
  }
  const esc = newLabel.replace(/\|/g, "#124;");
  if (arrow.labelSpan) return [{ start: arrow.labelSpan.start, end: arrow.labelSpan.end, text: esc }];
  return [{ start: arrow.span.end, end: arrow.span.end, text: `|${esc}|` }];
}

/** 行削除用の span（ trailing newline を含めて消す。最終行なら直前の改行を消す）。 */
function lineDeleteSpan(src, stmt) {
  if (src[stmt.end] === "\n") return { start: stmt.start, end: stmt.end + 1, text: "" };
  if (stmt.start > 0 && src[stmt.start - 1] === "\n") return { start: stmt.start - 1, end: stmt.end, text: "" };
  return { start: stmt.start, end: stmt.end, text: "" };
}

/** 辺チェイン文から一部の辺を除いた置き換えテキストを作る。 */
function rebuildChain(stmt, keepArrowIdx, dropNodeIds) {
  const lines = [];
  const used = new Set();
  stmt.arrows.forEach((a, i) => {
    if (!keepArrowIdx.has(i)) return;
    lines.push(`${serRef(stmt.refs[i])} ${serArrow(a)} ${serRef(stmt.refs[i + 1])}`);
    used.add(i); used.add(i + 1);
  });
  // 辺から外れたがインライン定義を持つノードは、定義だけ独立した行で残す
  stmt.refs.forEach((r, i) => {
    if (r.def && !used.has(i) && !(dropNodeIds && dropNodeIds.has(r.id))) {
      lines.push(serRef(r));
    }
  });
  return lines.map((l) => stmt.indent + l).join("\n");
}

/** 辺を1本削除（チェインの一部なら残りで再構成）。 */
export function deleteEdge(model, src, edgeIdx) {
  const edge = model.edges[edgeIdx];
  if (!edge) return [];
  const stmt = model.statements[edge.stmtIdx];
  if (stmt.arrows.length === 1) return [lineDeleteSpan(src, stmt)];
  const keep = new Set();
  stmt.arrows.forEach((_, i) => { if (i !== edge.indexInStmt) keep.add(i); });
  return [{ start: stmt.start, end: stmt.end, text: rebuildChain(stmt, keep, null) }];
}

/** ノードを追加して {edits, id} を返す。 */
export function addNode(model, src, { label = "新規ノード" } = {}) {
  const id = nextFreeId(model.nodes);
  const headerEdits = [];
  let base = src;
  if (!model.hasHeader) {
    headerEdits.push({ start: 0, end: 0, text: "flowchart TD\n" });
    base = "flowchart TD\n" + src; // 追記位置の再計算用
  }
  const m2 = model.hasHeader ? model : parseFlowchart(base);
  const { at, prefix } = appendInfo(m2, base);
  return { edits: [...headerEdits, { start: at, end: at, text: `${prefix}${id}[${serLabel(label, "]")}]` }], id };
}

/** 辺を追加（存在しないノードIDは既定ラベル付きで同時に定義）。 */
export function addEdge(model, src, from, to, label = "") {
  const headerEdits = [];
  let m2 = model;
  let base = src;
  if (!model.hasHeader) {
    headerEdits.push({ start: 0, end: 0, text: "flowchart TD\n" });
    base = "flowchart TD\n" + src;
    m2 = parseFlowchart(base);
  }
  const refFor = (id) => {
    const n = m2.nodes.get(id);
    if (n) return n.def ? n : { id, def: null };
    return { id, def: { raw: `${id}[新規ノード]` } };
  };
  const lbl = label ? `|${label.replace(/\|/g, "#124;")}|` : "";
  const info = appendInfo(m2, base);
  return {
    edits: [...headerEdits, {
      start: info.at, end: info.at,
      text: `${info.prefix}${serRef(refFor(from))} -->${lbl} ${serRef(refFor(to))}`,
    }],
  };
}

/** ノードを削除（そのノードに接続する辺もまとめて削除）。 */
export function deleteNode(model, src, nodeId) {
  const edits = [];
  const byStmt = new Map(); // stmtIdx -> 残す辺の index 集合（undefined = 未計算）
  model.edges.forEach((e, i) => {
    if (e.from !== nodeId && e.to !== nodeId) return;
    if (!byStmt.has(e.stmtIdx)) {
      const stmt = model.statements[e.stmtIdx];
      byStmt.set(e.stmtIdx, new Set(stmt.arrows.map((_, k) => k)));
    }
    byStmt.get(e.stmtIdx).delete(e.indexInStmt);
  });
  for (const [stmtIdx, keep] of byStmt) {
    const stmt = model.statements[stmtIdx];
    if (stmt.arrows.length === 1) {
      edits.push(lineDeleteSpan(src, stmt));
      continue;
    }
    // 残る辺で再構成。何も残らない（全辺が削除対象）なら行ごと消す。
    // 削除対象ノード以外のインライン定義は rebuildChain が独立行で救出する。
    const text = rebuildChain(stmt, keep, new Set([nodeId]));
    edits.push(text
      ? { start: stmt.start, end: stmt.end, text }
      : lineDeleteSpan(src, stmt));
  }
  // ノード単独定義文（A[label] だけの行）
  const node = model.nodes.get(nodeId);
  if (node?.def) {
    const defStmt = model.statements.find(
      (s) => s.type === "node" && s.ref.id === nodeId && s.ref.def === node.def);
    if (defStmt) edits.push(lineDeleteSpan(src, defStmt));
  }
  edits.sort((a, b) => a.start - b.start);
  return edits;
}

/** {start,end,text} 編集列をテキストに適用（検証・テスト・新ソース算出用）。 */
export function applyEditsToText(text, edits) {
  let out = text;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}

// ---- SVG とモデルの対応付け ----------------------------------------------------
// mermaid v11 はノードを <g id="flowchart-<nodeId>-<n>">、辺を <path class="flowchart-link">
// で描く（辺の id は L-<from>-<to>-<n> 系、class に LS-/LE- が入る場合あり）。
// nodeId に - や数字が含まれうるので、既知のノードID集合で照合して曖昧さを潰す。

/** DOM ノードID（flowchart-A-3 形式）からモデルの nodeId を引く。 */
export function resolveNodeId(domId, nodes) {
  const m = /^flowchart-(.+)-(\d+)$/.exec(domId || "");
  if (!m) return null;
  let cand = m[1];
  for (;;) {
    if (nodes.has(cand)) return cand;
    const m2 = /^(.+)-\d+$/.exec(cand);
    if (!m2) return null;
    cand = m2[1];
  }
}

/** 辺パス要素からモデルの辺 index を引く。class の LS-/LE- 優先、ダメなら id を分割。 */
export function resolveEdgeIndex(pathEl, model) {
  const ids = model.nodes;
  let from = null, to = null, pairIdx = null;
  for (const c of pathEl.classList || []) {
    if (c.startsWith("LS-")) from = c.slice(3);
    if (c.startsWith("LE-")) to = c.slice(3);
  }
  if (!(from && to && ids.has(from) && ids.has(to))) {
    // id 例: L-A-B-0 / E-A-B-2（先頭に diagram 接頭辞が付く版もある）
    const m = /[LE]-(.+)-(\d+)$/.exec(pathEl.id || "");
    if (!m) return null;
    pairIdx = parseInt(m[2], 10);
    const mid = m[1];
    let found = null;
    for (let i = 1; i < mid.length && !found; i++) {
      const sep = mid[i - 1];
      if (sep !== "-" && sep !== "_") continue;
      const a = mid.slice(0, i - 1), b = mid.slice(i);
      if (a && b && ids.has(a) && ids.has(b)) found = [a, b];
    }
    if (!found) return null;
    [from, to] = found;
  }
  const matches = [];
  model.edges.forEach((e, i) => { if (e.from === from && e.to === to) matches.push(i); });
  if (!matches.length) return null;
  if (matches.length === 1 || pairIdx == null) return matches[0];
  return matches[Math.min(pairIdx, matches.length - 1)];
}

// ---- 編集モードの DOM ----------------------------------------------------------

/**
 * box（.mermaid-box）を編集モードにする。meta = {src, index, editable}。
 * api = { applyEdits(src, edits, focusNodeId) -> bool, onExit() }（app.js が注入）。
 * focusNodeId: 再入場時にすぐラベル編集を開くノード（➕ノード直後用）。
 */
export function enterEditMode(box, meta, api, focusNodeId = null) {
  if (box.querySelector(":scope > .mermaid-editbar")) return; // 既に入っている
  const model = parseFlowchart(meta.src);
  if (!model.supported) {
    alert(`⚠️ この図は編集できません（${model.reason}）。ソースを直接編集してください。`);
    api.onExit?.();
    return;
  }
  if (!model.edges.length && !model.nodes.size) {
    alert("⚠️ この図には編集できるノード/矢印がありません。");
    api.onExit?.();
    return;
  }
  box.classList.add("mermaid-editing");

  const state = { selected: null, arrowPick: null, busy: false };

  // --- ツールバー ---
  const bar = document.createElement("div");
  bar.className = "mermaid-editbar";
  const mkBtn = (label, title, act) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.title = title;
    b.addEventListener("click", act);
    bar.appendChild(b);
    return b;
  };
  const labelBtn = mkBtn("✏️ ラベル", "選択中のノード/矢印のラベルを編集", onLabelBtn);
  const addNodeBtn = mkBtn("➕ ノード", "ノードを追加（追加後にラベルを編集できます）", onAddNode);
  const addEdgeBtn = mkBtn("➕ 矢印", "矢印を追加（始点→終点の順にノードをクリック）", onAddEdge);
  const delBtn = mkBtn("🗑 削除", "選択中のノード/矢印を削除（エディタで Ctrl+Z すれば戻せます）", onDelete);
  const edgeInput = document.createElement("input");
  edgeInput.className = "mermaid-edge-label hidden";
  edgeInput.type = "text";
  edgeInput.placeholder = "矢印ラベル（Enterで確定・空でも可）";
  bar.appendChild(edgeInput);
  const hint = document.createElement("span");
  hint.className = "mermaid-edit-hint";
  bar.appendChild(hint);
  mkBtn("✓ 完了", "編集モードを終了", () => teardown(true));
  box.appendChild(bar);

  const setHint = (t) => { hint.textContent = t; };
  const updateBar = () => {
    const s = state.selected;
    labelBtn.disabled = !s;
    delBtn.disabled = !s;
    labelBtn.textContent = s?.kind === "edge" ? "✏️ ラベル(矢印)" : "✏️ ラベル";
    if (state.arrowPick) {
      setHint(state.arrowPick.from
        ? `➕ 矢印: 始点 ${state.arrowPick.from} → 終点のノードをクリック（Escで中止）`
        : "➕ 矢印: 始点のノードをクリック（Escで中止）");
    } else {
      setHint(s
        ? (s.kind === "node" ? `選択中: ノード ${s.id}` : "選択中: 矢印")
        : "クリック: 選択 ／ ダブルクリック: ラベル編集");
    }
  };
  updateBar();

  // --- 選択 ---
  const clearSelection = () => {
    box.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
    state.selected = null;
  };
  const nodeGById = (id) => [...box.querySelectorAll("g[id^='flowchart-']")]
    .find((g) => resolveNodeId(g.id, model.nodes) === id) || null;
  const selectNode = (id, g) => {
    clearSelection();
    state.selected = { kind: "node", id };
    (g || nodeGById(id))?.classList.add("selected");
    updateBar();
  };
  const selectEdge = (idx, pathEl) => {
    clearSelection();
    state.selected = { kind: "edge", idx };
    pathEl?.classList.add("selected");
    updateBar();
  };

  // --- コミット（app.js 経由でエディタに適用 → 再描画 → 再入場） ---
  const commit = (edits, focusId = null) => {
    if (state.busy || !edits || !edits.length) return;
    state.busy = true;
    const ok = api.applyEdits(meta.src, edits, focusId);
    if (!ok) teardown(false);
    // 成功時: エディタ変更 → プレビュー再描画でこの box は差し替わり、
    // app.js のフックが新しい box で enterEditMode を呼び直す。
  };

  // --- ノードラベルのインライン編集 ---
  const openNodeEditor = (g, id) => {
    const node = model.nodes.get(id);
    const cur = node?.def?.label ?? "";
    const input = document.createElement("input");
    input.className = "mermaid-node-input";
    input.type = "text";
    const r = g.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    input.style.left = `${r.left - br.left + box.scrollLeft}px`;
    input.style.top = `${r.top - br.top + box.scrollTop}px`;
    input.style.width = `${Math.max(140, r.width + 24)}px`;
    input.value = cur;
    box.appendChild(input);
    input.focus();
    input.select();
    let closed = false;
    const finish = (applyIt) => {
      if (closed) return;
      closed = true;
      const v = input.value;
      input.remove();
      if (applyIt && v !== cur) commit(editNodeLabel(model, meta.src, id, v));
    };
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") finish(true);
      else if (e.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));
  };

  // --- 矢印ラベル入力（ツールバー内） ---
  let edgeInputDone = null;
  const openEdgeInput = (initial, onDone) => {
    edgeInputDone = onDone;
    edgeInput.classList.remove("hidden");
    edgeInput.value = initial || "";
    edgeInput.focus();
    edgeInput.select();
  };
  const closeEdgeInput = (commitIt) => {
    if (edgeInput.classList.contains("hidden")) return;
    const v = edgeInput.value;
    const cb = edgeInputDone;
    edgeInputDone = null;
    edgeInput.classList.add("hidden");
    if (commitIt && cb) cb(v);
  };
  edgeInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") closeEdgeInput(true);
    else if (e.key === "Escape") closeEdgeInput(false);
  });
  edgeInput.addEventListener("blur", () => closeEdgeInput(true));

  // --- ボタンハンドラ ---
  function onLabelBtn() {
    const s = state.selected;
    if (!s) return;
    if (s.kind === "node") {
      const g = nodeGById(s.id);
      if (g) openNodeEditor(g, s.id);
    } else {
      const edge = model.edges[s.idx];
      const cur = (edge?.arrow?.label || "").replace(/#124;/g, "|");
      openEdgeInput(cur, (v) => {
        commit(editEdgeLabel(model, meta.src, s.idx, v));
      });
    }
  }
  function onAddNode() {
    const { edits, id } = addNode(model, meta.src, {});
    commit(edits, id); // 再入場後にそのノードのラベル編集を自動で開く
  }
  function onAddEdge() {
    state.arrowPick = state.arrowPick ? null : {};
    clearSelection();
    updateBar();
  }
  function onDelete() {
    const s = state.selected;
    if (!s) return;
    if (s.kind === "node") commit(deleteNode(model, meta.src, s.id));
    else commit(deleteEdge(model, meta.src, s.idx));
  }

  // --- SVG クリック（委譲） ---
  const nearestPath = (labelEl) => {
    const lr = labelEl.getBoundingClientRect();
    const cx = lr.left + lr.width / 2, cy = lr.top + lr.height / 2;
    let best = null, bestD = Infinity;
    for (const p of box.querySelectorAll("path.flowchart-link")) {
      try {
        const len = p.getTotalLength();
        if (!len) continue;
        const sp = p.getPointAtLength(len / 2).matrixTransform(p.getScreenCTM());
        const d = (sp.x - cx) ** 2 + (sp.y - cy) ** 2;
        if (d < bestD) { bestD = d; best = p; }
      } catch { /* 描画直後等で測れないものは無視 */ }
    }
    return bestD < 40 * 40 ? best : null;
  };

  const onClick = (e) => {
    if (e.target.closest(".mermaid-editbar, .mermaid-node-input")) return;
    const g = e.target.closest("g[id^='flowchart-']");
    if (g) {
      const id = resolveNodeId(g.id, model.nodes);
      if (!id) return;
      if (state.arrowPick) {
        if (!state.arrowPick.from) {
          state.arrowPick = { from: id };
          clearSelection();
          g.classList.add("selected");
          updateBar();
        } else {
          const from = state.arrowPick.from;
          state.arrowPick = null;
          clearSelection();
          updateBar();
          if (from === id) { setHint("始点と終点が同じです。やり直してください。"); return; }
          openEdgeInput("", (label) => {
            const { edits } = addEdge(model, meta.src, from, id, label);
            commit(edits);
          });
        }
        return;
      }
      selectNode(id, g);
      return;
    }
    const path = e.target.closest("path.flowchart-link");
    const labelEl = path ? null : e.target.closest(".edgeLabel");
    const p = path || (labelEl ? nearestPath(labelEl) : null);
    if (p) {
      const idx = resolveEdgeIndex(p, model);
      if (idx != null) { selectEdge(idx, p); return; }
      setHint("⚠️ この矢印はソースと対応付けできませんでした（特殊な記法の可能性）。");
    }
  };
  const onDblClick = (e) => {
    const g = e.target.closest("g[id^='flowchart-']");
    if (!g) return;
    e.preventDefault();
    const id = resolveNodeId(g.id, model.nodes);
    if (id) openNodeEditor(g, id);
  };
  const onKeydown = (e) => {
    if (e.key !== "Escape") return;
    if (state.arrowPick) { state.arrowPick = null; clearSelection(); updateBar(); return; }
    teardown(true);
  };
  box.addEventListener("click", onClick);
  box.addEventListener("dblclick", onDblClick);
  box.addEventListener("keydown", onKeydown);

  function teardown(notify) {
    box.removeEventListener("click", onClick);
    box.removeEventListener("dblclick", onDblClick);
    box.removeEventListener("keydown", onKeydown);
    box.classList.remove("mermaid-editing");
    bar.remove();
    box.querySelectorAll(".mermaid-node-input").forEach((el) => el.remove());
    if (notify) api.onExit?.();
  }

  // ➕ノードの直後など、再入場時にすぐラベル編集を開く
  if (focusNodeId) {
    const g = nodeGById(focusNodeId);
    if (g) { selectNode(focusNodeId, g); openNodeEditor(g, focusNodeId); }
  }
}
