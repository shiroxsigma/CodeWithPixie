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
//
// **flowchart/graph ヘッダの無い図（sequenceDiagram 等）は編集不可**として弾く
// （それらは行の意味がまるで違うので、辺やノードとして誤って解釈すると図が壊れる）。
// 判定は diagramEditability(src) が返し、markdown.js が ✏️ ボタンの出し分けに使う。
//
// class/style/linkStyle は「参照の整合」まで面倒を見る: ノードを消せばそれを指す
// class/style から取り除き、辺を消せば linkStyle の番号を詰め直す（残すと mermaid が
// 図ごと描画エラーにする）。

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

// パススルー行のうち、ノード/辺への「参照」を持つもの。削除時に参照を直すため
// 対象部分の span を取る（class の後に空白必須なので classDef は誤マッチしない）。
const CLASS_STMT_RE = /^(\s*class\s+)([^\s;]+)(\s+.*)$/i;
const STYLE_STMT_RE = /^(\s*style\s+)([^\s;,]+)(\s+.*)$/i;
const LINKSTYLE_STMT_RE = /^(\s*linkStyle\s+)(\d+(?:\s*,\s*\d+)*)(\s+.*)$/i;

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
  // ヘッダが無いものは flowchart ではない（sequenceDiagram / classDiagram / pie 等）。
  // それらの行をノード文・辺文として解釈すると図を壊すので、丸ごと編集対象外にする。
  if (model.supported && !model.hasHeader) {
    model.supported = false;
    model.reason = "flowchart / graph 以外の図は編集できません";
  }
  return model;
}

/** 図が直接編集の対象か。markdown.js が ✏️ ボタンの出し分け（と理由の表示）に使う。 */
export function diagramEditability(src) {
  const model = parseFlowchart(src);
  return { ok: model.supported, reason: model.reason };
}

/** パススルー行。class / style / linkStyle はノード・辺への参照部分も控えておく。 */
function pushOther(model, line, start, end) {
  const stmt = { type: "other", start, end, indent: leadingWs(line) };
  let m;
  if ((m = CLASS_STMT_RE.exec(line))) {
    stmt.cls = {
      ids: m[2].split(",").map((x) => x.trim()).filter(Boolean),
      span: { start: start + m[1].length, end: start + m[1].length + m[2].length },
    };
  } else if ((m = STYLE_STMT_RE.exec(line))) {
    stmt.styleNode = m[2];
  } else if ((m = LINKSTYLE_STMT_RE.exec(line))) {
    stmt.link = {
      indices: m[2].split(",").map((x) => parseInt(x, 10)),
      span: { start: start + m[1].length, end: start + m[1].length + m[2].length },
    };
  }
  model.statements.push(stmt);
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
  // 空ラベルは A[] という構文エラーになる。空白1つで「ラベル無しの箱」にする。
  if (!label) return '" "';
  let t = label.replace(/"/g, "#quot;");
  // 閉じ記号の構成文字や | が混ざると構文が壊れるので引用符で囲む
  const bad = new Set(closer.split(""));
  if (t.includes("|") || [...t].some((ch) => bad.has(ch))) t = `"${t}"`;
  return t;
}

/** ソース上のエスケープを人が読む形に戻す（入力欄へ出すとき用。serLabel の逆）。 */
export function decodeLabel(label) {
  return (label || "").replace(/#quot;/g, '"').replace(/#124;/g, "|");
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

/**
 * 辺チェイン文から一部の辺を除いた置き換えテキストを作る。
 * swapArrowIdx を渡すとその辺だけ始点・終点を入れ替える（矢印の反転）。
 */
function rebuildChain(stmt, keepArrowIdx, dropNodeIds, swapArrowIdx = -1) {
  const lines = [];
  const used = new Set();
  stmt.arrows.forEach((a, i) => {
    if (!keepArrowIdx.has(i)) return;
    const [from, to] = i === swapArrowIdx
      ? [stmt.refs[i + 1], stmt.refs[i]]
      : [stmt.refs[i], stmt.refs[i + 1]];
    lines.push(`${serRef(from)} ${serArrow(a)} ${serRef(to)}`);
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

/**
 * 重なり合う編集をまとめる（Monaco の executeEdits は範囲の重複を許さない）。
 * 行削除どうしは末尾の改行の取り合いで隣接・重複しうる。
 */
function normalizeEdits(edits) {
  const sorted = [...edits].sort((a, b) => a.start - b.start || a.end - b.end);
  const out = [];
  for (const e of sorted) {
    const prev = out[out.length - 1];
    if (prev && e.start < prev.end) {
      prev.end = Math.max(prev.end, e.end);
      prev.text += e.text;
      continue;
    }
    out.push({ ...e });
  }
  return out;
}

/**
 * 辺を消したぶん linkStyle の番号を詰め直す編集。
 * mermaid の linkStyle は「ソースに現れた順の辺番号」を指すので、辺を1本消すと
 * それより後ろの番号が全部ずれる。放っておくと範囲外を指して図ごと描画エラーになる。
 */
function linkStyleEdits(model, src, removed) {
  if (!removed.size) return [];
  const gone = [...removed];
  const shift = (i) => i - gone.filter((r) => r < i).length;
  const edits = [];
  for (const stmt of model.statements) {
    if (!stmt.link) continue;
    const kept = stmt.link.indices.filter((i) => !removed.has(i)).map(shift);
    if (!kept.length) { edits.push(lineDeleteSpan(src, stmt)); continue; }
    if (kept.join(",") === stmt.link.indices.join(",")) continue;
    edits.push({ start: stmt.link.span.start, end: stmt.link.span.end, text: kept.join(",") });
  }
  return edits;
}

/** 消したノードを指す class / style 文の後始末（参照が空になった行は消す）。 */
function nodeRefEdits(model, src, nodeId) {
  const edits = [];
  for (const stmt of model.statements) {
    if (stmt.styleNode === nodeId) { edits.push(lineDeleteSpan(src, stmt)); continue; }
    if (!stmt.cls || !stmt.cls.ids.includes(nodeId)) continue;
    const kept = stmt.cls.ids.filter((id) => id !== nodeId);
    edits.push(kept.length
      ? { start: stmt.cls.span.start, end: stmt.cls.span.end, text: kept.join(",") }
      : lineDeleteSpan(src, stmt));
  }
  return edits;
}

/** 辺を1本削除（チェインの一部なら残りで再構成）。 */
export function deleteEdge(model, src, edgeIdx) {
  const edge = model.edges[edgeIdx];
  if (!edge) return [];
  const stmt = model.statements[edge.stmtIdx];
  const edits = linkStyleEdits(model, src, new Set([edgeIdx]));
  if (stmt.arrows.length === 1) {
    edits.push(lineDeleteSpan(src, stmt));
  } else {
    const keep = new Set();
    stmt.arrows.forEach((_, i) => { if (i !== edge.indexInStmt) keep.add(i); });
    edits.push({ start: stmt.start, end: stmt.end, text: rebuildChain(stmt, keep, null) });
  }
  return normalizeEdits(edits);
}

/** 矢印の記法を差し替える（--> を -.-> にする等。ラベルはそのまま）。 */
export function setEdgeArrow(model, src, edgeIdx, arrowText) {
  const edge = model.edges[edgeIdx];
  if (!edge || edge.arrow.text === arrowText) return [];
  return [{ start: edge.arrow.span.start, end: edge.arrow.span.end, text: arrowText }];
}

/** 矢印の向きを反転する（始点と終点を入れ替える。ラベル・記法は保つ）。 */
export function reverseEdge(model, src, edgeIdx) {
  const edge = model.edges[edgeIdx];
  if (!edge) return [];
  const stmt = model.statements[edge.stmtIdx];
  const keep = new Set(stmt.arrows.map((_, i) => i));
  return [{
    start: stmt.start, end: stmt.end,
    text: rebuildChain(stmt, keep, null, edge.indexInStmt),
  }];
}

// parseFlowchart はヘッダの無いソースを supported=false で弾くので、
// 以下の追加系は「flowchart/graph ヘッダがある」前提で書いてよい。

/** ノードを追加して {edits, id} を返す。 */
export function addNode(model, src, { label = "新規ノード" } = {}) {
  const id = nextFreeId(model.nodes);
  const { at, prefix } = appendInfo(model, src);
  return { edits: [{ start: at, end: at, text: `${prefix}${id}[${serLabel(label, "]")}]` }], id };
}

/** 辺を追加（存在しないノードIDは既定ラベル付きで同時に定義）。 */
export function addEdge(model, src, from, to, label = "") {
  const refFor = (id) => {
    const n = model.nodes.get(id);
    if (n) return n.def ? n : { id, def: null };
    return { id, def: { raw: `${id}[新規ノード]` } };
  };
  const lbl = label ? `|${label.replace(/\|/g, "#124;")}|` : "";
  const info = appendInfo(model, src);
  return {
    edits: [{
      start: info.at, end: info.at,
      text: `${info.prefix}${serRef(refFor(from))} -->${lbl} ${serRef(refFor(to))}`,
    }],
  };
}

/** ノードを削除（そのノードに接続する辺もまとめて削除）。 */
export function deleteNode(model, src, nodeId) {
  const edits = [];
  const byStmt = new Map(); // stmtIdx -> 残す辺の index 集合（undefined = 未計算）
  const removedEdges = new Set();  // 消える辺の通し番号（linkStyle の詰め直し用）
  model.edges.forEach((e, i) => {
    if (e.from !== nodeId && e.to !== nodeId) return;
    removedEdges.add(i);
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
  // ノード単独文（A[label] や A だけの行）
  for (const s of model.statements) {
    if (s.type === "node" && s.ref.id === nodeId) edits.push(lineDeleteSpan(src, s));
  }
  // 消えたノード・辺を指す class / style / linkStyle の後始末
  edits.push(...nodeRefEdits(model, src, nodeId));
  edits.push(...linkStyleEdits(model, src, removedEdges));
  return normalizeEdits(edits);
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

// 矢印の線種セレクタに出す選択肢（ARROWS の部分集合。ここに無い記法が選択されたら
// setArrowKind が「そのまま見せる」項目を足すので、値が消えることはない）。
const ARROW_CHOICES = [
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
  ["<==>", "太線 ←→"],
];

// キー入力を横取りしてはいけない相手（エディタ本体・各種入力欄）。Delete が
// Monaco の文字削除ではなくノード削除になってしまう事故を防ぐ。
const TYPING_TARGET = 'input, textarea, select, [contenteditable="true"], .monaco-editor';

/** 図のバー（.mermaid-tools-status）へ短いメッセージを出す。alert でモーダルを挟まない。 */
function notifyInBox(box, msg, isError = false) {
  const st = box.querySelector(".mermaid-tools-status");
  if (!st) return;
  st.textContent = msg;
  st.className = "mermaid-tools-status" + (isError ? " error" : "");
  setTimeout(() => {
    if (st.textContent !== msg) return;
    st.textContent = "";
    st.className = "mermaid-tools-status";
  }, 6000);
}

/**
 * box（.mermaid-box）を編集モードにする。meta = {src, index, editable}。
 * api = { applyEdits(src, edits, restore) -> bool, onExit() }（app.js が注入）。
 * restore = {selection, editNodeId}: 再描画をまたいで選択を戻すための情報
 * （selection はノードなら {kind:"node", id}、矢印なら {kind:"edge", from, to}）。
 *
 * 戻り値は「この box の編集モードを黙って畳む」関数。プレビューが再描画されると
 * この box は DOM から外れるので、app.js は入り直す前にこれを呼んで後始末する
 * （document に付けたキー listener がここでしか外せない）。
 */
export function enterEditMode(box, meta, api, restore = null) {
  if (box.querySelector(":scope > .mermaid-editbar")) return null; // 既に入っている
  const model = parseFlowchart(meta.src);
  if (!model.supported) {
    // 通常は markdown.js が ✏️ を無効化しているので、ここへは来ない（保険）。
    notifyInBox(box, `⚠ この図は編集できません（${model.reason}）`, true);
    api.onExit?.();
    return null;
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
  mkBtn("➕ ノード", "ノードを追加（追加後にラベルを編集できます）", onAddNode);
  const addEdgeBtn = mkBtn("➕ 矢印", "矢印を追加（始点→終点の順にノードをクリック）", onAddEdge);
  const revBtn = mkBtn("⇄ 反転", "選択中の矢印の向きを入れ替える", onReverse);
  const arrowSel = document.createElement("select");
  arrowSel.className = "mermaid-arrow-kind";
  arrowSel.title = "選択中の矢印の線種を変える";
  for (const [value, text] of ARROW_CHOICES) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = text;
    arrowSel.appendChild(o);
  }
  arrowSel.addEventListener("change", onArrowKind);
  bar.appendChild(arrowSel);
  const delBtn = mkBtn("🗑 削除", "選択中のノード/矢印を削除（Delete キーでも可。Ctrl+Z で戻せます）", onDelete);
  const hint = document.createElement("span");
  hint.className = "mermaid-edit-hint";
  bar.appendChild(hint);
  mkBtn("✓ 完了", "編集モードを終了（Esc でも可）", () => teardown(true));
  box.appendChild(bar);

  const setHint = (t) => { hint.textContent = t; };
  /** 想定外の記法でもセレクタの表示が空にならないようにする。 */
  const setArrowKind = (text) => {
    if (![...arrowSel.options].some((o) => o.value === text)) {
      const o = document.createElement("option");
      o.value = text;
      o.textContent = text;
      arrowSel.appendChild(o);
    }
    arrowSel.value = text;
  };
  const updateBar = () => {
    const s = state.selected;
    const isEdge = s?.kind === "edge";
    labelBtn.disabled = !s;
    delBtn.disabled = !s;
    labelBtn.textContent = isEdge ? "✏️ ラベル(矢印)" : "✏️ ラベル";
    revBtn.classList.toggle("hidden", !isEdge);
    arrowSel.classList.toggle("hidden", !isEdge);
    addEdgeBtn.classList.toggle("active", !!state.arrowPick);
    if (isEdge) setArrowKind(model.edges[s.idx]?.arrow.text || "-->");
    if (state.arrowPick) {
      setHint(state.arrowPick.from
        ? `➕ 矢印: 始点 ${state.arrowPick.from} → 終点のノードをクリック（Escで中止）`
        : "➕ 矢印: 始点のノードをクリック（Escで中止）");
    } else {
      setHint(s
        ? (s.kind === "node" ? `選択中: ノード ${s.id}（Delete で削除）` : "選択中: 矢印（Delete で削除）")
        : "クリック: 選択 ／ ダブルクリック: ラベル編集 ／ Esc: 終了");
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
  const edgePathByIdx = (idx) => [...box.querySelectorAll("path.flowchart-link")]
    .find((p) => resolveEdgeIndex(p, model) === idx) || null;
  const selectNode = (id, g) => {
    clearSelection();
    state.selected = { kind: "node", id };
    (g || nodeGById(id))?.classList.add("selected");
    updateBar();
  };
  const selectEdge = (idx, pathEl) => {
    clearSelection();
    state.selected = { kind: "edge", idx };
    (pathEl || edgePathByIdx(idx))?.classList.add("selected");
    updateBar();
  };

  // --- コミット（app.js 経由でエディタに適用 → 再描画 → 再入場） ---
  /** 今の選択を「再描画後でも引ける鍵」にする（index は編集でずれるので使わない）。 */
  const selKey = () => {
    const s = state.selected;
    if (!s) return null;
    if (s.kind === "node") return { kind: "node", id: s.id };
    const e = model.edges[s.idx];
    return e ? { kind: "edge", from: e.from, to: e.to } : null;
  };
  const commit = (edits, { editNodeId = null, selection } = {}) => {
    if (state.busy || !edits || !edits.length) return;
    state.busy = true;
    const ok = api.applyEdits(meta.src, edits, {
      editNodeId,
      selection: selection === undefined ? selKey() : selection,
    });
    if (!ok) teardown(false);
    // 成功時: エディタ変更 → プレビュー再描画でこの box は差し替わり、
    // app.js のフックが新しい box で enterEditMode を呼び直す。
  };

  // --- 位置合わせ（box は overflow スクロールするので内容座標へ直す） ---
  const toBoxXY = (x, y) => {
    const br = box.getBoundingClientRect();
    return { x: x - br.left + box.scrollLeft, y: y - br.top + box.scrollTop };
  };
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    const p = toBoxXY(r.left, r.top);
    return { left: p.x, top: p.y, width: r.width, height: r.height };
  };
  /** 辺パスの中点（画面座標）。描画直後などで測れなければ null。 */
  const pathMid = (p) => {
    try {
      const len = p.getTotalLength();
      if (!len) return null;
      const pt = p.getPointAtLength(len / 2).matrixTransform(p.getScreenCTM());
      return { x: pt.x, y: pt.y };
    } catch {
      return null;
    }
  };
  const anchorAt = (screenPt) => {
    if (!screenPt) return { left: 8, top: 8, width: 180 };
    const p = toBoxXY(screenPt.x, screenPt.y);
    return { left: p.x - 90, top: p.y - 14, width: 180 };
  };
  /** 2ノードの中間（矢印追加でラベルを訊くときの表示位置）。 */
  const midOfNodes = (aId, bId) => {
    const ga = nodeGById(aId), gb = nodeGById(bId);
    if (!ga || !gb) return { left: 8, top: 8, width: 180 };
    const ra = ga.getBoundingClientRect(), rb = gb.getBoundingClientRect();
    return anchorAt({
      x: (ra.left + ra.width / 2 + rb.left + rb.width / 2) / 2,
      y: (ra.top + ra.height / 2 + rb.top + rb.height / 2) / 2,
    });
  };

  // --- インライン入力（ノードラベルも矢印ラベルも同じ見た目・同じ操作） ---
  const openInlineInput = ({ left, top, width, value, placeholder }, onCommit) => {
    box.querySelectorAll(".mermaid-inline-input").forEach((el) => el.remove());
    const input = document.createElement("input");
    input.className = "mermaid-inline-input";
    input.type = "text";
    input.style.left = `${Math.max(0, left)}px`;
    input.style.top = `${Math.max(0, top)}px`;
    input.style.width = `${Math.max(140, width)}px`;
    input.value = value || "";
    if (placeholder) input.placeholder = placeholder;
    box.appendChild(input);
    input.focus();
    input.select();
    let closed = false;
    const finish = (applyIt) => {
      if (closed) return;
      closed = true;
      const v = input.value;
      input.remove();
      if (applyIt) onCommit(v);
    };
    // 入力中のキーは編集モードのショートカット（Esc/Delete）へ渡さない
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") finish(true);
      else if (e.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));
  };

  const openNodeEditor = (g, id) => {
    const cur = decodeLabel(model.nodes.get(id)?.def?.label ?? "");
    const r = rectOf(g);
    openInlineInput({ left: r.left, top: r.top, width: r.width + 24, value: cur }, (v) => {
      if (v !== cur) commit(editNodeLabel(model, meta.src, id, v));
    });
  };

  const openEdgeLabelEditor = (idx, pathEl) => {
    const cur = decodeLabel(model.edges[idx]?.arrow?.label || "");
    const at = anchorAt(pathEl ? pathMid(pathEl) : null);
    openInlineInput(
      { ...at, value: cur, placeholder: "矢印ラベル（Enterで確定・空で削除）" },
      (v) => { if (v !== cur) commit(editEdgeLabel(model, meta.src, idx, v)); });
  };

  // --- ボタンハンドラ ---
  function onLabelBtn() {
    const s = state.selected;
    if (!s) return;
    if (s.kind === "node") {
      const g = nodeGById(s.id);
      if (g) openNodeEditor(g, s.id);
    } else {
      openEdgeLabelEditor(s.idx, edgePathByIdx(s.idx));
    }
  }
  function onAddNode() {
    const { edits, id } = addNode(model, meta.src, {});
    // 追加したノードを選択し、再入場後にそのラベル編集を自動で開く
    commit(edits, { editNodeId: id, selection: { kind: "node", id } });
  }
  function onAddEdge() {
    state.arrowPick = state.arrowPick ? null : {};
    clearSelection();
    updateBar();
  }
  function onReverse() {
    const s = state.selected;
    if (s?.kind !== "edge") return;
    const e = model.edges[s.idx];
    if (!e) return;
    commit(reverseEdge(model, meta.src, s.idx),
      { selection: { kind: "edge", from: e.to, to: e.from } });
  }
  function onArrowKind() {
    const s = state.selected;
    if (s?.kind !== "edge") return;
    commit(setEdgeArrow(model, meta.src, s.idx, arrowSel.value));
  }
  function onDelete() {
    const s = state.selected;
    if (!s) return;
    commit(s.kind === "node"
      ? deleteNode(model, meta.src, s.id)
      : deleteEdge(model, meta.src, s.idx), { selection: null });
  }

  // --- SVG クリック（委譲） ---
  const nearestPath = (labelEl) => {
    const lr = labelEl.getBoundingClientRect();
    const cx = lr.left + lr.width / 2, cy = lr.top + lr.height / 2;
    let best = null, bestD = Infinity;
    for (const p of box.querySelectorAll("path.flowchart-link")) {
      const sp = pathMid(p);
      if (!sp) continue;
      const d = (sp.x - cx) ** 2 + (sp.y - cy) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    return bestD < 40 * 40 ? best : null;
  };
  /** クリック位置から辺のパス要素を引く（ラベルをクリックしたときは最寄りの線）。 */
  const pathFromEvent = (e) => {
    const path = e.target.closest("path.flowchart-link");
    if (path) return path;
    const labelEl = e.target.closest(".edgeLabel");
    return labelEl ? nearestPath(labelEl) : null;
  };

  const onClick = (e) => {
    if (e.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
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
          // 始点と終点が同じでもよい（mermaid は自己ループを描ける）
          const from = state.arrowPick.from;
          state.arrowPick = null;
          clearSelection();
          updateBar();
          openInlineInput(
            { ...midOfNodes(from, id), value: "", placeholder: "矢印ラベル（空でも可）" },
            (label) => commit(addEdge(model, meta.src, from, id, label).edits,
              { selection: { kind: "edge", from, to: id } }));
        }
        return;
      }
      selectNode(id, g);
      return;
    }
    const p = pathFromEvent(e);
    if (p) {
      const idx = resolveEdgeIndex(p, model);
      if (idx != null) { selectEdge(idx, p); return; }
      setHint("⚠️ この矢印はソースと対応付けできませんでした（特殊な記法の可能性）。");
      return;
    }
    // 図の余白をクリックしたら選択解除（選びっぱなしで Delete を押す事故を減らす）
    if (!state.arrowPick && state.selected) { clearSelection(); updateBar(); }
  };
  const onDblClick = (e) => {
    if (e.target.closest(".mermaid-editbar, .mermaid-inline-input")) return;
    const g = e.target.closest("g[id^='flowchart-']");
    if (g) {
      e.preventDefault();
      const id = resolveNodeId(g.id, model.nodes);
      if (id) openNodeEditor(g, id);
      return;
    }
    const p = pathFromEvent(e);
    if (!p) return;
    const idx = resolveEdgeIndex(p, model);
    if (idx == null) return;
    e.preventDefault();
    selectEdge(idx, p);
    openEdgeLabelEditor(idx, p);
  };
  // キーは document で拾う。.mermaid-box はフォーカスを持たないので box に付けると
  // 届かない（Esc も Delete も効かなくなる）。代わりに入力欄・エディタ上では見送る。
  const onKeydown = (e) => {
    // 再描画で捨てられた box に残った listener は自分で降りる（保険。通常は
    // app.js が新しい図へ入り直す前に、戻り値の dispose を呼んで外す）。
    if (!box.isConnected) { teardown(false); return; }
    if (e.target?.closest?.(TYPING_TARGET)) return;
    if (e.key === "Escape") {
      if (state.arrowPick) { state.arrowPick = null; clearSelection(); updateBar(); return; }
      teardown(true);
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && state.selected) {
      e.preventDefault();
      onDelete();
      return;
    }
    // 図の上に居るあいだ Ctrl+Z / Ctrl+Y をエディタへ中継する（GUI 操作の取り消し）。
    // 編集を適用してもフォーカスはエディタへ移さないので、ここで拾わないと届かない。
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); api.undo?.(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); api.redo?.(); }
    }
  };
  box.addEventListener("click", onClick);
  box.addEventListener("dblclick", onDblClick);
  document.addEventListener("keydown", onKeydown);

  function teardown(notify) {
    box.removeEventListener("click", onClick);
    box.removeEventListener("dblclick", onDblClick);
    document.removeEventListener("keydown", onKeydown);
    box.classList.remove("mermaid-editing");
    bar.remove();
    box.querySelectorAll(".mermaid-inline-input").forEach((el) => el.remove());
    clearSelection();
    if (notify) api.onExit?.();
  }

  // 再入場時の復帰（選択の維持と、➕ノード直後のラベル編集）。この時点では box は
  // まだ DOM に入っていない＝位置が測れないので、次フレームまで待つ。
  if (restore) {
    requestAnimationFrame(() => {
      if (!box.isConnected || !bar.isConnected) return;
      const sel = restore.selection;
      if (sel?.kind === "node" && model.nodes.has(sel.id)) {
        selectNode(sel.id);
      } else if (sel?.kind === "edge") {
        const idx = model.edges.findIndex((e) => e.from === sel.from && e.to === sel.to);
        if (idx >= 0) selectEdge(idx);
      }
      if (restore.editNodeId) {
        const g = nodeGById(restore.editNodeId);
        if (g) openNodeEditor(g, restore.editNodeId);
      }
    });
  }

  return () => teardown(false);
}
