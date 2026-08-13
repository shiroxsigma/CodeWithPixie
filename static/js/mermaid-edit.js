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
  ["((", "))"], ["{{", "}}"], ["[[", "]]"], ["([", "])"], ["[(", ")]"], ["[/", "/]"],
  ["[\\", "\\]"], [">", "]"], ["[", "]"], ["(", ")"], ["{", "}"],
];

// ---- 矢印記法（長いものを先に試す） -------------------------------------------
const ARROWS = ["<==>", "<-.->", "<-->", "<->", "-.->", "-.-", "-->", "---", "==>", "===", "--x", "--o"];

// 中置ラベル記法 `A-- ラベル -->B`（`A-. ラベル .->B` / `A== ラベル ==>B` も同じ形）。
// |ラベル| 形式と意味は同じで、実文書ではこちらのほうがよく使われる。開き記号ごとに
// 許す閉じ記号は決まっていて、族をまたぐ組み合わせ（`-- x ==>`）は mermaid でも無効。
// kind は「同じ意味の素の矢印」＝ラベルを外したときに残す記法。
const MID_FORMS = [
  { open: "-.", closers: [[".->", "-.->"], [".-", "-.-"]] },
  { open: "--", closers: [["-->", "-->"], ["---", "---"], ["--x", "--x"], ["--o", "--o"]] },
  { open: "==", closers: [["==>", "==>"], ["===", "==="], ["==x", "==x"], ["==o", "==o"]] },
];
// 中置ラベルの中に現れると、そこで矢印が閉じたと読まれてしまう記号（族を問わない）。
const MID_CLOSERS = MID_FORMS.flatMap((f) => f.closers.map(([c]) => c));

// ヘッダ行。`graph TD;` `flowchart TD %% コメント` `flowchart-elk LR` まで許す
// （ここを厳しくすると図が丸ごと編集不可になる。方向は2文字なので {2} で足りる）。
const HEADER_RE = /^\s*(?:flowchart(?:-elk)?|graph)(?:\s+[A-Za-z]{2})?\s*;?\s*(?:%%.*)?$/i;
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

// 判定はソースだけで決まるので覚えておく。プレビューは打鍵のたびに描き直され、
// 図1枚ごとに ✏️ ボタンの出し分けでこれを呼ぶ（＝毎回の全文パースになる）。
const editabilityMemo = new Map();
const EDITABILITY_MEMO_MAX = 100;

/** 図が直接編集の対象か。markdown.js が ✏️ ボタンの出し分け（と理由の表示）に使う。 */
export function diagramEditability(src) {
  const hit = editabilityMemo.get(src);
  if (hit) return hit;
  const model = parseFlowchart(src);
  const r = { ok: model.supported, reason: model.reason };
  if (editabilityMemo.size >= EDITABILITY_MEMO_MAX) editabilityMemo.clear();
  editabilityMemo.set(src, r);
  return r;
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
    // ノードIDには - や . を含めてよいので、ID_RE は矢印の頭まで一緒に飲み込む
    // （`C---D` が丸ごと1つのIDになる）。矢印の書き出しで切り、末尾に残った
    // - や . も削る。`my-node` のような普通のIDは切られない。
    let id = m[0];
    const cut = id.search(/--|-\.|\.-/);
    if (cut > 0) id = id.slice(0, cut);
    id = id.replace(/[-.]+$/, "");
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
      // :::className 修飾はそのまま保持（ラベル編集の span には影響しない）。
      // 形状の変更は定義を丸ごと組み直すので、そのとき書き戻せるよう別に控える。
      const cls = /^:::[A-Za-z0-9_-]+/.exec(line.slice(defEnd));
      if (cls) rawEnd = defEnd + cls[0].length;
      ref.def = {
        label: line.slice(contentStart, labelEnd),
        quoted,
        shape: [open, close],
        cls: cls ? cls[0] : "",
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
      const arrow = {
        text: a, mid: null, span: { start: aStart, end: abs() },
        label: null, labelSpan: null, pipeSpan: null,
      };
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
    return parseMidArrow();
  }

  /**
   * 中置ラベル記法。素の矢印（ARROWS）が1つも当たらなかったときだけ試す
   * ——「長いものから素の矢印を優先」は mermaid 自身の字句解析と同じ順序なので、
   * `A--x---B` のような紛らわしい書き方でも mermaid と同じ読み方になる。
   * 閉じ記号は同じ族の中から、左端で当たったもの（同位置なら長いもの）を採る。
   */
  function parseMidArrow() {
    for (const form of MID_FORMS) {
      if (!line.startsWith(form.open, s.pos)) continue;
      const aStart = abs();
      const textStart = s.pos + form.open.length;
      let at = -1, close = "", kind = "";
      for (let i = textStart; i < line.length && at < 0; i++) {
        for (const [c, k] of form.closers) {
          if (line.startsWith(c, i)) { at = i; close = c; kind = k; break; }
        }
      }
      if (at < 0) continue;              // 閉じが無い（`A -- B` 等）→ 辺ではない
      const rawLabel = line.slice(textStart, at);
      if (!rawLabel.trim()) continue;    // `-- -->` は成立させない（素の矢印の書き損じ）
      s.pos = at + close.length;
      const lead = rawLabel.length - rawLabel.replace(/^\s+/, "").length;
      const label = rawLabel.trim();
      const labelStart = lineStart + textStart + lead;
      return {
        text: kind,
        // mid があるものは「中置ラベル形式」。raw をそのまま書き戻せば見た目が保たれる。
        mid: { open: form.open, close },
        raw: line.slice(aStart - lineStart, s.pos),
        span: { start: aStart, end: abs() },
        label,
        labelSpan: { start: labelStart, end: labelStart + label.length },
        pipeSpan: null,
      };
    }
    return null;
  }

  /** 文の終わり（行末 or %% コメント）か。手前の `;` は読み飛ばす。 */
  function atStatementEnd() {
    skipWs();
    if (line[s.pos] === ";") { s.pos++; skipWs(); }
    return s.pos >= line.length || line.slice(s.pos).startsWith("%%");
  }

  const first = parseRef();
  if (!first) return null;
  const arrow1 = parseArrow();
  if (!arrow1) {
    // ノード単独文（行末、`;`、または %% コメントのみ許容）
    if (!atStatementEnd()) return null;
    return { type: "node", start: lineStart, end: lineEnd, indent, ref: first };
  }
  // 辺チェイン: ref (arrow ref)*
  const refs = [first];
  const arrows = [arrow1];
  for (;;) {
    const r = parseRef();
    if (!r) return null;
    refs.push(r);
    if (atStatementEnd()) break;
    const a = parseArrow();
    if (!a) return null;
    arrows.push(a);
  }
  return { type: "edge", start: lineStart, end: lineEnd, indent, refs, arrows };
}

// 同じノードの定義は 1 図に何度でも書ける（`A[x] --> B` と `A[x] --> C` の両方）。
// mermaid は後の定義も読むので、ラベルや形状を変えるときは**全部**直さないと
// 「変えたのに図が変わらない」ことになる。def は最初のもの（表示用）、
// defs は編集対象の全定義。
function registerRef(model, ref) {
  const existing = model.nodes.get(ref.id);
  if (!existing) {
    model.nodes.set(ref.id, {
      id: ref.id, def: ref.def, defs: ref.def ? [ref.def] : [], firstRef: ref,
    });
    return;
  }
  if (!ref.def) return;
  if (!existing.def) existing.def = ref.def;
  existing.defs.push(ref.def);
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

// mermaid のラベルの改行は `<br/>`（`<br>` / `<br />` も同じ）。入力欄では本物の
// 改行として見せ、ソースへ戻すときに畳む —— これが無いと 3 行のラベルを直すのに
// `<br/>` を手打ちすることになり、事実上「編集できない」状態になる。
const BR_RE = /<br\s*\/?>/gi;

/** ソースのラベル → 入力欄に出すテキスト（`<br/>` を改行に開く）。 */
export function labelToInput(label) {
  return decodeLabel(label).replace(BR_RE, "\n");
}

/** 入力欄のテキスト → ソースのラベル（改行を `<br/>` に畳む）。 */
export function inputToLabel(text) {
  return String(text ?? "").replace(/\r\n?/g, "\n").split("\n").join("<br/>");
}

/**
 * 辺ラベルをソースの表記へ戻す（decodeLabel の逆）。
 * `|` はラベルの閉じ記号、`"` は mermaid の字句解析で文字列の始まりになるので、
 * どちらも実体参照風の表記に逃がす。ノードラベルは serLabel が同じ役目を負う。
 * これが無いと、入力欄に開いた `#quot;` が確定のたびに生の `"` へ落ちて戻らない。
 */
function escEdgeLabel(text) {
  return String(text ?? "").replace(/"/g, "#quot;").replace(/\|/g, "#124;");
}

function serArrow(arrow) {
  // 中置ラベル記法は元の字面をそのまま返す（`A-- No -->B` を |No| 形式に
  // 化けさせない。辺の削除・反転はこの関数で行を組み直すため）。
  if (arrow.mid) return arrow.raw;
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
  const defs = nodeDefs(node);
  if (defs.length) {
    // 定義が複数あるときは全部そろえる（1つだけ直すとソースが食い違い、
    // mermaid は後の定義を採るので見た目が変わらない）。
    return normalizeEdits(defs.map((d) => ({
      start: d.labelSpan.start, end: d.labelSpan.end,
      text: d.quoted ? newLabel.replace(/"/g, "#quot;") : serLabel(newLabel, d.shape[1]),
    })));
  }
  const r = node.firstRef;
  return [{ start: r.span.start, end: r.span.end, text: `${r.id}[${serLabel(newLabel, "]")}]` }];
}

/** そのノードの全定義（古い形の model でも壊れないよう def からも拾う）。 */
function nodeDefs(node) {
  if (node.defs?.length) return node.defs;
  return node.def ? [node.def] : [];
}

/**
 * ノードの形状を変える（[] → {} など）。ラベル・:::クラス・他の行からの参照はそのまま。
 * 定義を持たない（裸のID参照だけの）ノードは、ID をラベルにして定義へ昇格させる
 * —— mermaid は定義の無いノードのラベルに ID をそのまま使うので、こうすると見た目が変わらない。
 */
export function setNodeShape(model, src, nodeId, open, close) {
  const node = model.nodes.get(nodeId);
  if (!node) return [];
  const defs = nodeDefs(node);
  if (!defs.length) {
    const r = node.firstRef;
    return [{
      start: r.span.start, end: r.span.end,
      text: `${r.id}${open}${serLabel(r.id, close)}${close}`,
    }];
  }
  if (defs.every((d) => d.shape[0] === open && d.shape[1] === close)) return [];
  // ラベルはソース上の字面のまま持ち回る（#quot; 等のエスケープを二重にかけない）。
  // 元が引用符付きならそのまま囲み直し、素のままなら新しい閉じ記号に対して
  // 囲む必要があるかを serLabel に判定させる（`[/ /]` は / が閉じ記号の一部）。
  // 定義が複数あるときは全部そろえる（editNodeLabel と同じ理由）。
  return normalizeEdits(defs.map((d) => ({
    start: d.span.start, end: d.span.end,
    text: `${nodeId}${open}${d.quoted ? `"${d.label}"` : serLabel(d.label, close)}${close}${d.cls || ""}`,
  })));
}

/** 辺ラベルの設定（空文字はラベル削除）。 */
export function editEdgeLabel(model, src, edgeIdx, newLabel) {
  const edge = model.edges[edgeIdx];
  if (!edge) return [];
  const arrow = edge.arrow;
  const esc = escEdgeLabel(newLabel);
  if (arrow.mid) {
    // 中置ラベルを空にするときは矢印ごと素の記法へ戻す（`-- -->` は構文エラー）。
    if (!newLabel.trim()) {
      return [{ start: arrow.span.start, end: arrow.span.end, text: arrow.text }];
    }
    // 中置のまま書けない文字（| と閉じ記号）が入るときだけ |ラベル| 形式へ倒す。
    const breaks = newLabel.includes("|")
      || MID_CLOSERS.some((c) => newLabel.includes(c))
      || newLabel !== newLabel.trim();
    if (!breaks) return [{ start: arrow.labelSpan.start, end: arrow.labelSpan.end, text: esc }];
    return [{ start: arrow.span.start, end: arrow.span.end, text: `${arrow.text}|${esc}|` }];
  }
  if (!newLabel.trim()) {
    if (arrow.pipeSpan) return [{ start: arrow.pipeSpan.start, end: arrow.pipeSpan.end, text: "" }];
    return [];
  }
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
  const a = edge.arrow;
  // 中置ラベル記法（`A-- No -->B`）には <--> のような双向記法の対応形が無い。
  // 記法を変えるときは |ラベル| 形式へ統一する（mermaid 上の意味は変わらない）。
  if (a.mid) {
    const lbl = a.label ? `|${a.label.replace(/\|/g, "#124;")}|` : "";
    return [{ start: a.span.start, end: a.span.end, text: arrowText + lbl }];
  }
  return [{ start: a.span.start, end: a.span.end, text: arrowText }];
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
  const lbl = label ? `|${escEdgeLabel(label)}|` : "";
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

/** pos を含む文の範囲。選択中の要素がソースのどの行かをエディタ側で示すのに使う。 */
export function statementSpanAt(model, pos) {
  for (const s of model.statements) {
    if (s.start <= pos && pos <= s.end) return { start: s.start, end: s.end };
  }
  return null;
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
// mermaid はノードを <g id="[<図ID>-]flowchart-<nodeId>-<n>">、辺を
// <path class="flowchart-link"> で描く。id の形式はバージョンで揺れる:
//   - ノード: flowchart-A-0（旧） / pixie-mermaid-3-flowchart-A-0（v11 は図IDを前置）
//   - 辺: L-A-B-0 + LS-/LE- クラス（旧） / <図ID>-L_A_B_0（v11 は _ 区切り・クラス無し）
// どちらの形式も受ける。nodeId に - や _ や数字が含まれうるので、既知のノードID集合で
// 照合して曖昧さを潰す。セレクタは id*='flowchart-'（前方一致だと前置形式を取りこぼす）。

/** DOM ノードID（[図ID-]flowchart-A-3 形式）からモデルの nodeId を引く。 */
export function resolveNodeId(domId, nodes) {
  // 最初の "flowchart-" 以降が本体（前置の図IDは捨てる）。ノードID自体に
  // "flowchart-" が含まれる場合も、残り全体を候補にして下の照合ループで解決する。
  const at = (domId || "").indexOf("flowchart-");
  if (at < 0) return null;
  let cand = domId.slice(at + "flowchart-".length);
  {
    const m = /^(.+)-(\d+)$/.exec(cand);
    if (!m) return null;
    cand = m[1];
  }
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
    // id 例: L-A-B-0（旧）/ L_A_B_0（v11）。どちらも diagram 接頭辞が付く版がある。
    const m = /[LE]-(.+)-(\d+)$/.exec(pathEl.id || "")
      || /[LE]_(.+)_(\d+)$/.exec(pathEl.id || "");
    if (!m) return null;
    pairIdx = parseInt(m[2], 10);
    const mid = m[1];
    // ノードIDに - や _ が含まれると分割が一意に決まらない（A_B_C は A/B_C とも
    // A_B/C とも読める）。全分割を列挙し「モデルに実在する辺」を持つものだけ残す。
    // それでも複数残ったら null（誤った辺を選択・削除するより選択不能のほうが安全）。
    const splits = [];
    for (let i = 1; i < mid.length; i++) {
      const sep = mid[i - 1];
      if (sep !== "-" && sep !== "_") continue;
      const a = mid.slice(0, i - 1), b = mid.slice(i);
      if (a && b && ids.has(a) && ids.has(b)) splits.push([a, b]);
    }
    const real = splits.filter(([a, b]) => model.edges.some((e) => e.from === a && e.to === b));
    const pick = real.length ? real : splits;
    if (pick.length !== 1) return null;
    [from, to] = pick[0];
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

// ノード形状セレクタの選択肢（SHAPES の部分集合＋表示名）。ここに無い形状の
// ノードを選んだときは setNodeShapeChoice が「そのまま見せる」項目を足す。
const SHAPE_CHOICES = [
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
  [">", "]", "▷ 旗"],
];
// select の値は文字列しか持てないので、開き/閉じを 1 本の値に詰める。区切りは
// 形状記号に現れない文字であること（"|" はどの形状にも使われていない）。
const SHAPE_SEP = "|";

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
  const labelBtn = mkBtn("ラベル編集", "選択中のノード/矢印のラベルを編集", onLabelBtn);
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
  const shapeSel = document.createElement("select");
  shapeSel.className = "mermaid-node-shape";
  shapeSel.title = "選択中のノードの形状を変える";
  for (const [open, close, text] of SHAPE_CHOICES) {
    const o = document.createElement("option");
    o.value = open + SHAPE_SEP + close;
    o.textContent = text;
    shapeSel.appendChild(o);
  }
  shapeSel.addEventListener("change", onShapeKind);
  bar.appendChild(shapeSel);
  const delBtn = mkBtn("削除", "選択中のノード/矢印を削除（Delete キーでも可。Ctrl+Z で戻せます）", onDelete);
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
  /** 同上（形状）。定義の無いノードは mermaid の既定＝長方形として見せる。 */
  const setNodeShapeChoice = (shape) => {
    const [open, close] = shape || ["[", "]"];
    const value = open + SHAPE_SEP + close;
    if (![...shapeSel.options].some((o) => o.value === value)) {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = `${open}…${close}`;
      shapeSel.appendChild(o);
    }
    shapeSel.value = value;
  };
  /**
   * 選択中の要素がソースのどこかをエディタ側へ知らせる（app.js が反転表示＋スクロール）。
   * line = 直す対象の文全体、focus = その中の字面（ノード定義 / 矢印そのもの）。
   * 図をクリックしたときに「Markdown のどこを触ればよいか」が一目で分かるようにする。
   */
  const revealSelection = () => {
    if (!api.reveal) return;
    const s = state.selected;
    if (!s) { api.reveal(null); return; }
    if (s.kind === "node") {
      const n = model.nodes.get(s.id);
      const focus = n?.def ? n.def.span : n?.firstRef?.span;
      api.reveal(focus ? { line: statementSpanAt(model, focus.start), focus } : null);
      return;
    }
    const e = model.edges[s.idx];
    const stmt = e ? model.statements[e.stmtIdx] : null;
    api.reveal(e
      ? { line: stmt ? { start: stmt.start, end: stmt.end } : null, focus: e.arrow.span }
      : null);
  };
  const updateBar = () => {
    const s = state.selected;
    const isEdge = s?.kind === "edge";
    const isNode = s?.kind === "node";
    labelBtn.disabled = !s;
    delBtn.disabled = !s;
    labelBtn.textContent = isEdge ? "ラベル編集（矢印）" : "ラベル編集";
    revBtn.classList.toggle("hidden", !isEdge);
    arrowSel.classList.toggle("hidden", !isEdge);
    shapeSel.classList.toggle("hidden", !isNode);
    addEdgeBtn.classList.toggle("active", !!state.arrowPick);
    if (isEdge) setArrowKind(model.edges[s.idx]?.arrow.text || "-->");
    if (isNode) setNodeShapeChoice(model.nodes.get(s.id)?.def?.shape);
    if (state.arrowPick) {
      setHint(state.arrowPick.from
        ? `➕ 矢印: 始点 ${state.arrowPick.from} → 終点のノードをクリック（Escで中止）`
        : "➕ 矢印: 始点のノードをクリック（Escで中止）");
    } else {
      setHint(s
        ? (s.kind === "node" ? `選択中: ノード ${s.id}（Delete で削除）` : "選択中: 矢印（Delete で削除）")
        : "クリック: 選択 ／ ダブルクリック: ラベル編集 ／ Esc: 終了");
    }
    // 選択が変わるところは必ずここを通るので、ソースの反転表示もまとめて追従させる。
    revealSelection();
  };
  updateBar();

  // --- 選択 ---
  const clearSelection = () => {
    box.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
    state.selected = null;
  };
  const nodeGById = (id) => [...box.querySelectorAll("g[id*='flowchart-']")]
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

  // --- 位置合わせ ---
  // 横スクロールするのは box ではなく内側の .mermaid-canvas（バーを sticky にするため
  // 分離した）。入力欄はその中に置くので、座標もこの枠の内容座標へ直す。
  const canvas = box.querySelector(":scope > .mermaid-canvas") || box;
  const toBoxXY = (x, y) => {
    const br = canvas.getBoundingClientRect();
    return { x: x - br.left + canvas.scrollLeft, y: y - br.top + canvas.scrollTop };
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
  // textarea なのは複数行ラベル（ソース上の `<br/>`）を改行のまま見せて直せるようにするため。
  // Enter=確定 / Shift+Enter=改行 —— 1行ラベルでの操作感（Enter で確定）を変えない。
  const openInlineInput = ({ left, top, width, value, placeholder }, onCommit) => {
    box.querySelectorAll(".mermaid-inline-input").forEach((el) => el.remove());
    const input = document.createElement("textarea");
    input.className = "mermaid-inline-input";
    input.rows = 1;
    input.value = value || "";
    if (placeholder) input.placeholder = placeholder;
    input.style.left = `${Math.max(0, left)}px`;
    input.style.top = `${Math.max(0, top)}px`;
    input.style.width = `${Math.max(160, width)}px`;
    canvas.appendChild(input);
    // 行数に合わせて高さを追従（スクロールバーを出さずに全行見せる）
    const fit = () => {
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight}px`;
    };
    fit();
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
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finish(true); }
      else if (e.key === "Escape") finish(false);
    });
    input.addEventListener("input", fit);
    input.addEventListener("blur", () => finish(true));
  };

  const openNodeEditor = (g, id) => {
    const cur = labelToInput(model.nodes.get(id)?.def?.label ?? "");
    const r = rectOf(g);
    openInlineInput({
      left: r.left, top: r.top, width: r.width + 24, value: cur,
      placeholder: "ノードラベル（Shift+Enter で改行）",
    }, (v) => {
      if (v !== cur) commit(editNodeLabel(model, meta.src, id, inputToLabel(v)));
    });
  };

  const openEdgeLabelEditor = (idx, pathEl) => {
    const cur = labelToInput(model.edges[idx]?.arrow?.label || "");
    const at = anchorAt(pathEl ? pathMid(pathEl) : null);
    openInlineInput(
      { ...at, value: cur, placeholder: "矢印ラベル（Shift+Enter で改行・空で削除）" },
      (v) => { if (v !== cur) commit(editEdgeLabel(model, meta.src, idx, inputToLabel(v))); });
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
  function onShapeKind() {
    const s = state.selected;
    if (s?.kind !== "node") return;
    const [open, close] = shapeSel.value.split(SHAPE_SEP);
    commit(setNodeShape(model, meta.src, s.id, open, close));
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
    const g = e.target.closest("g[id*='flowchart-']");
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
            { ...midOfNodes(from, id), value: "", placeholder: "矢印ラベル（空でも可・Shift+Enter で改行）" },
            (label) => commit(addEdge(model, meta.src, from, id, inputToLabel(label)).edits,
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
    const g = e.target.closest("g[id*='flowchart-']");
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
    api.reveal?.(null);  // エディタ側の反転表示も消す（編集モードを出たら残さない）
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

// ---- ドキュメント内の ```mermaid ブロックの特定 --------------------------------
// プレビューに描かれている図（markdown-it が渡してきた content）が、エディタの
// ドキュメントのどの範囲に対応するかを決める。ここを外すと編集は一切適用できない
// （「図の位置を特定できませんでした」で編集モードが畳まれる）ので、markdown-it の
// 取り方との食い違い —— 改行コードとフェンスの字下げ —— を吸収する。

/** ドキュメント内の ```mermaid ブロックを走査する（markdown-it の fence と同じ取り方:
    内容はフェンス行の間の改行込み、閉じフェンスは同じ文字で開きと同じ長さ以上）。 */
export function scanMermaidBlocks(doc) {
  const lines = doc.split("\n");
  const lineStarts = [];
  let off = 0;
  for (const line of lines) { lineStarts.push(off); off += line.length + 1; }
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*(`{3,}|~{3,})\s*mermaid\b/i.exec(lines[i]);
    if (!m) continue;
    const fence = m[1];
    const contentStart = lineStarts[i] + lines[i].length + 1;
    for (let j = i + 1; j < lines.length; j++) {
      const cm = /^\s*(`{3,}|~{3,})\s*$/.exec(lines[j]);
      if (!cm || cm[1][0] !== fence[0] || cm[1].length < fence.length) continue;
      const contentEnd = lineStarts[j];  // 末尾 \n を含む（markdown-it の token.content と一致）
      blocks.push({ start: contentStart, end: contentEnd, content: doc.slice(contentStart, contentEnd) });
      i = j;
      break;
    }
  }
  return blocks;
}

/**
 * ブロックの内容が src と一致するか見て、一致すればオフセット変換付きで返す。
 * ドキュメント側と src 側の差は行単位でしか出ない:
 *   - エディタは \r\n を保つが markdown-it は \n に正規化する
 *   - フェンスが字下げされていると markdown-it は各行の字下げを削って content にする
 * どちらも「ドキュメント側の行の末尾が src 側の行と一致し、その手前は空白だけ」に
 * なるので、行ごとに突き合わせて対応表を作る（markdown-it の字下げ規則そのものを
 * 再現しなくてよい）。戻り値の toRaw(i) は src 内オフセット→ブロック内オフセット、
 * indent は削られていた字下げ（書き戻す行に足し直す分）。
 */
export function matchMermaidBlock(b, src) {
  if (b.content === src) return { ...b, indent: "", toRaw: (i) => i };
  const rawLines = b.content.split("\n");
  const srcLines = src.split("\n");
  if (rawLines.length !== srcLines.length) return null;
  const rawStart = [];   // src の各行頭に対応するブロック内オフセット
  const srcStart = [];
  let rawOff = 0, srcOff = 0, indent = "";
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i].endsWith("\r") ? rawLines[i].slice(0, -1) : rawLines[i];
    const line = srcLines[i];
    if (!raw.endsWith(line)) return null;
    const pre = raw.slice(0, raw.length - line.length);
    if (/\S/.test(pre)) return null;   // 末尾一致が偶然なだけ（内容が違う）
    if (pre && !indent) indent = pre;
    rawStart.push(rawOff + pre.length);
    srcStart.push(srcOff);
    rawOff += rawLines[i].length + 1;
    srcOff += line.length + 1;
  }
  const toRaw = (i) => {
    let lo = 0, hi = srcStart.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (srcStart[mid] <= i) lo = mid; else hi = mid - 1;
    }
    return rawStart[lo] + (i - srcStart[lo]);
  };
  return { ...b, indent, toRaw };
}

/** src（描画に使われた mermaid ソース）に一致するブロックを探す。
    index（プレビュー内で何枚目の図か）と一致するブロックを最優先する — 同じ内容の
    図が複数あるとき、先頭のブロックを黙って書き換えてしまわないため。 */
export function findMermaidBlock(doc, src, index = 0) {
  const blocks = scanMermaidBlocks(doc);
  const at = blocks[index] ? matchMermaidBlock(blocks[index], src) : null;
  if (at) return at;
  // フェンスの数え方が markdown-it と食い違った場合の保険（内容一致で最初の1つ）
  for (const b of blocks) {
    const m = matchMermaidBlock(b, src);
    if (m) return m;
  }
  return null;
}
