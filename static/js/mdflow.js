// 条件別フロー可視化（mdflow）のクライアント側コアロジック。
//
// app/mdflow.py と同じ仕様の JS 実装。正規表現・評価の意味論はサーバ側と
// 一致させること（乖離すると「プレビューでは描けるのに /api/patch 検証では
// 警告」というちぐはぐが起きる）。DOM 構築は markdown.js 側、ここは純ロジック。
//
// YAML の解釈は js-yaml（UMD、scripts/fetch_js_yaml.py でベンダリング）。
// 未取得なら available() が false になり、mdflow 機能だけが静かに落ちる。

const jsyaml = globalThis.jsyaml || null;  // ブラウザでは window.jsyaml と同じ

/** js-yaml がベンダリング済みで mdflow 機能が使えるか。 */
export const available = () => jsyaml !== null;

export const DEFAULT_ACTIVE_STYLE = "fill:#ff9999,stroke:#333,stroke-width:2px";
// 非アクティブノードの淡色化スタイル（ダークテーマ前提。控えめな灰色で埋没させる）。
// app/mdflow.py の DEFAULT_INACTIVE_STYLE と同一値。
export const DEFAULT_INACTIVE_STYLE = "fill:#2a2a2a,stroke:#555,color:#888";

// app/mdflow.py の _BLOCK_RE / _FM_RE / _ID_COMMENT_RE と同一パターン
const MAPPING_BLOCK_RE = /^```[ \t]*(?:yaml[ \t]+)?mdflow-mapping[ \t]*\n([\s\S]*?)^```/gm;
const FM_RE = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;
const FM_OPEN_RE = /^﻿?---[ \t]*\r?\n/;
const ID_COMMENT_RE = /^\s*%%\s*id\s*:\s*(\S+)/m;

/** mermaid ソースから %% id: を読み取る（無ければ ""）。 */
export function diagramIdOf(code) {
  const m = ID_COMMENT_RE.exec(code);
  return m ? m[1] : "";
}

// ---- 文書のパース -----------------------------------------------------------

/**
 * Markdown 全文から frontmatter と mdflow-mapping を取り出す。
 * @returns {{meta: object, body: string, bodyOffset: number,
 *            selected: Object<string,string>, mappings: Array, warnings: string[]}}
 * mappings: [{diagramId, presets: [{name, when, activeNodes}], activeStyle, inactiveStyle}]
 * （presets は定義順の配列 — 自動判定が「上から最初に真」なので順序が意味を持つ）
 */
export function parseDocument(text) {
  const warnings = [];
  let meta = {};
  let body = text;
  let bodyOffset = 0;

  const fm = FM_RE.exec(text);
  if (fm) {
    try {
      const loaded = jsyaml ? jsyaml.load(fm[1]) : null;
      if (loaded && typeof loaded === "object" && !Array.isArray(loaded)) meta = loaded;
      else if (loaded != null) warnings.push("frontmatter のトップレベルがマッピングではありません");
    } catch (e) {
      warnings.push(`frontmatter の YAML 構文エラー: ${e.message || e}`);
    }
    body = text.slice(fm[0].length);
    bodyOffset = fm[0].length;
  }

  const selRaw = (meta.mdflow || {}).selected;
  const selected = {};
  if (selRaw && typeof selRaw === "object" && !Array.isArray(selRaw)) {
    for (const [k, v] of Object.entries(selRaw)) selected[String(k)] = String(v);
  }

  const mappings = [];
  if (jsyaml) {
    MAPPING_BLOCK_RE.lastIndex = 0;
    let m;
    let i = 0;
    while ((m = MAPPING_BLOCK_RE.exec(body)) !== null) {
      i += 1;
      let data;
      try {
        data = jsyaml.load(m[1]) || {};
      } catch (e) {
        warnings.push(`mdflow-mapping ブロック #${i}: YAML 構文エラー: ${e.message || e}`);
        continue;
      }
      if (typeof data !== "object" || Array.isArray(data)) {
        warnings.push(`mdflow-mapping ブロック #${i}: YAML のトップレベルがマッピングではありません`);
        continue;
      }
      const presets = [];
      for (const [name, specRaw] of Object.entries(data.presets || {})) {
        const spec = specRaw || {};
        presets.push({
          name: String(name),
          when: String(spec.when ?? ""),
          activeNodes: (spec.active_nodes || []).map(String),
        });
      }
      const styleData = data.style || {};
      mappings.push({
        diagramId: String(data.diagram ?? ""),
        presets,
        activeStyle: String(styleData.active ?? DEFAULT_ACTIVE_STYLE),
        inactiveStyle: String(styleData.inactive ?? DEFAULT_INACTIVE_STYLE),
      });
    }
  }
  return { meta, body, bodyOffset, selected, mappings, warnings };
}

/** diagramId に対応する mapping を返す（無ければ null）。 */
export function findMapping(mappings, diagramId) {
  if (!diagramId) return null;
  return mappings.find((mp) => mp.diagramId === diagramId) || null;
}

// ---- ルール式評価 -----------------------------------------------------------
// Python 側は C 風演算子を Python 風に正規化して ast を手評価する。
// こちらは C 風のまま再帰下降で評価するが、意味論は合わせる:
// - `!` は Python の not に正規化される都合で比較より弱い（`!x == 1` は `!(x == 1)`）
// - 未定義識別子は null、型不一致の大小比較は false
// - True/False/None は Python 定数。true/false/null は JSON 風リテラルとして解決する
//   （conditions にキーがあればそちらが優先。app/mdflow.py の true/false/null 規則と一致）

export class RuleError extends Error {}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) { i += 1; continue; }
    const two = expr.slice(i, i + 2);
    if (two === "&&" || two === "||") { tokens.push({ t: two }); i += 2; continue; }
    if (["==", "!=", "<=", ">="].includes(two)) { tokens.push({ t: "op", v: two }); i += 2; continue; }
    if (c === "<" || c === ">") { tokens.push({ t: "op", v: c }); i += 1; continue; }
    if (c === "!") { tokens.push({ t: "!" }); i += 1; continue; }
    if (c === "(" || c === ")") { tokens.push({ t: c }); i += 1; continue; }
    if (c === "'" || c === '"') {
      const end = expr.indexOf(c, i + 1);
      if (end < 0) throw new RuleError(`文字列リテラルが閉じていません: ${expr}`);
      tokens.push({ t: "lit", v: expr.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    let m = /^\d+(?:\.\d+)?/.exec(expr.slice(i));
    if (m) { tokens.push({ t: "lit", v: parseFloat(m[0]) }); i += m[0].length; continue; }
    m = /^[A-Za-z_]\w*/.exec(expr.slice(i));
    if (m) {
      const w = m[0];
      if (w === "True") tokens.push({ t: "lit", v: true });
      else if (w === "False") tokens.push({ t: "lit", v: false });
      else if (w === "None") tokens.push({ t: "lit", v: null });
      else tokens.push({ t: "name", v: w });
      i += w.length;
      continue;
    }
    throw new RuleError(`ルール式に不正な文字 '${c}': ${expr}`);
  }
  return tokens;
}

const isNumLike = (x) => typeof x === "number" || typeof x === "boolean";

function compare(op, a, b) {
  if (op === "==" || op === "!=") {
    // Python は bool を int として比較する（True == 1）。それ以外は型不一致で不一致。
    const eq = isNumLike(a) && isNumLike(b) ? Number(a) === Number(b) : a === b;
    return op === "==" ? eq : !eq;
  }
  // 大小比較は数値同士・文字列同士のみ。None 混じり等は Python の TypeError → false と同じ。
  if (isNumLike(a) && isNumLike(b)) { a = Number(a); b = Number(b); }
  else if (!(typeof a === "string" && typeof b === "string")) return false;
  if (op === "<") return a < b;
  if (op === "<=") return a <= b;
  if (op === ">") return a > b;
  return a >= b;
}

/**
 * ルール式を条件オブジェクトに対して評価する。空文字は常に true（無条件）。
 * 構文エラーは RuleError を投げる。
 */
export function evalWhen(expr, conditions) {
  expr = (expr || "").trim();
  if (!expr) return true;
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseOr() {
    let v = parseAnd();
    while (peek()?.t === "||") { next(); const r = parseAnd(); v = Boolean(v) || Boolean(r); }
    return v;
  }
  function parseAnd() {
    let v = parseNot();
    while (peek()?.t === "&&") { next(); const r = parseNot(); v = Boolean(v) && Boolean(r); }
    return v;
  }
  function parseNot() {
    if (peek()?.t === "!") { next(); return !parseNot(); }
    return parseCmp();
  }
  function parseCmp() {
    let left = parseAtom();
    if (peek()?.t !== "op") return left;
    // Python 同様の連鎖比較（a < b < c）。一つでも偽なら false
    let result = true;
    while (peek()?.t === "op") {
      const op = next().v;
      const right = parseAtom();
      if (result && !compare(op, left, right)) result = false;
      left = right;
    }
    return result;
  }
  function parseAtom() {
    const tk = next();
    if (!tk) throw new RuleError(`ルール式が途中で終わっています: ${expr}`);
    if (tk.t === "lit") return tk.v;
    if (tk.t === "name") {
      // ctx（conditions）にキーがあれば最優先。無ければ true/false/null を
      // JSON 風リテラルとして解決し、それ以外の未定義識別子は null（app/mdflow.py と同じ規則）
      if (conditions && Object.prototype.hasOwnProperty.call(conditions, tk.v)) {
        return conditions[tk.v];
      }
      if (tk.v === "true") return true;
      if (tk.v === "false") return false;
      if (tk.v === "null") return null;
      return null;
    }
    if (tk.t === "(") {
      const v = parseOr();
      if (next()?.t !== ")") throw new RuleError(`括弧が閉じていません: ${expr}`);
      return v;
    }
    throw new RuleError(`ルール式の構文エラー: ${expr}`);
  }

  const result = parseOr();
  if (pos !== tokens.length) throw new RuleError(`ルール式の構文エラー: ${expr}`);
  return Boolean(result);
}

/**
 * 適用すべきプリセットを決定する。selectedName（frontmatter の選択＝正）を最優先、
 * 無ければ定義順に when を評価して最初に真になったもの。どれも無ければ null。
 * @returns {{name, activeNodes, style, inactiveStyle, auto: boolean}|null}
 *          auto=true は自動判定で決まった印
 */
export function resolvePreset(mapping, conditions, selectedName) {
  if (selectedName) {
    const p = mapping.presets.find((x) => x.name === selectedName);
    if (p) {
      return {
        name: p.name, activeNodes: p.activeNodes,
        style: mapping.activeStyle, inactiveStyle: mapping.inactiveStyle, auto: false,
      };
    }
  }
  for (const p of mapping.presets) {
    let hit = false;
    try { hit = evalWhen(p.when, conditions || {}); } catch { /* 壊れた式は自動判定から外す */ }
    if (hit) {
      return {
        name: p.name, activeNodes: p.activeNodes,
        style: mapping.activeStyle, inactiveStyle: mapping.inactiveStyle, auto: true,
      };
    }
  }
  return null;
}

// ---- Mermaid ノードID解析・非破壊スタイル注入 --------------------------------
// app/mdflow.py の _SHAPE_RE / _ARROW_RE / _RESERVED と同一パターン

const SHAPE_RE = /\b([A-Za-z_][\w-]*)\s*[\[({]/g;
const ARROW_RE = /([A-Za-z_][\w-]*)\s*(?:-{2,3}>|-{2,3}|={2,3}>|-\.->|-\.-)\s*(?:\|[^|]*\|\s*)?([A-Za-z_][\w-]*)/g;
const FLOWCHART_HEAD_RE = /^\s*(graph|flowchart)\b/i;

const RESERVED = new Set([
  "graph", "flowchart", "subgraph", "end", "classDef", "class",
  "style", "linkStyle", "click", "direction", "TB", "TD", "BT", "LR", "RL",
]);

export function isFlowchart(code) {
  for (const line of code.split("\n")) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("%%")) continue;
    return FLOWCHART_HEAD_RE.test(stripped);
  }
  return false;
}

/** flowchart コードからノードIDを初出順で返す（ヒューリスティック）。 */
export function nodeIdsOrdered(code) {
  const seen = new Set();
  for (const line of code.split("\n")) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("%%")) continue;
    ARROW_RE.lastIndex = 0;
    let m;
    while ((m = ARROW_RE.exec(stripped)) !== null) {
      for (const gid of [m[1], m[2]]) if (!RESERVED.has(gid)) seen.add(gid);
    }
    SHAPE_RE.lastIndex = 0;
    while ((m = SHAPE_RE.exec(stripped)) !== null) {
      if (!RESERVED.has(m[1])) seen.add(m[1]);
    }
  }
  return [...seen];
}

/**
 * 末尾に classDef/class を付与してハイライトする（元コードは非破壊）。
 * flowchart のとき実在しないノードIDは除外して missing に返す（UI 警告用）。
 *
 * inactiveStyle を渡すと、flowchart かつ適用対象が1つ以上あるとき、非アクティブな
 * 実在ノード（初出順）に mdflowInactive クラスを追加で付与する（mdflowActive の行
 * より前に置く）。app/mdflow.py の inject_style と出力形式を一致させること。
 * @returns {{code: string, missing: string[]}}
 */
export function injectStyle(code, activeNodes, style, className = "mdflowActive", inactiveStyle = null) {
  const base = code.replace(/\n+$/, "");
  if (!activeNodes?.length) return { code: base, missing: [] };

  let missing = [];
  let targets = [...new Set(activeNodes)];  // 重複除去・順序維持
  const flowchart = isFlowchart(code);
  const orderedPresent = flowchart ? nodeIdsOrdered(code) : [];
  if (flowchart) {
    const present = new Set(orderedPresent);
    missing = targets.filter((n) => !present.has(n));
    targets = targets.filter((n) => present.has(n));
  }
  if (!targets.length) return { code: base, missing };

  const lines = [base, ""];
  if (inactiveStyle && flowchart) {
    const activeSet = new Set(targets);
    const inactiveNodes = orderedPresent.filter((n) => !activeSet.has(n));
    if (inactiveNodes.length) {
      lines.push(`classDef mdflowInactive ${inactiveStyle};`);
      lines.push(`class ${inactiveNodes.join(",")} mdflowInactive;`);
    }
  }
  lines.push(`classDef ${className} ${style};`);
  lines.push(`class ${targets.join(",")} ${className};`);
  return { code: lines.join("\n"), missing };
}

// ---- frontmatter selected の最小編集 -----------------------------------------
// クリックでプリセットを選んだとき、frontmatter の mdflow.selected だけを
// 行単位で書き換える編集（範囲と置換文字列）を計算する。js-yaml の全体 dump は
// 使わない（コメント消失・キー並び替えで差分が汚れる）。編集の適用は呼び出し側が
// Monaco の executeEdits で行う（undo スタックに乗り、Ctrl+Z で選択が戻る）。

/** YAML の 1 スカラーとして安全な表現にする（必要なときだけ引用が付く）。 */
function yamlScalar(s) {
  if (!jsyaml) return String(s);
  return jsyaml.dump(String(s), { lineWidth: -1 }).trim();
}

/** 行のキー部分を取り出して比較する（"key": / 'key': / key: を同一視）。 */
function keyOfLine(line) {
  const m = /^\s*(.+?):(?:\s|$)/.exec(line.replace(/\r$/, ""));
  if (!m) return null;
  let key = m[1].trim();
  const q = key[0];
  if ((q === '"' || q === "'") && key.endsWith(q) && key.length >= 2) key = key.slice(1, -1);
  return key;
}

const indentOf = (line) => /^\s*/.exec(line)[0].length;

/**
 * frontmatter の mdflow.selected を書き換える最小編集を計算する。
 * @param {string} text ノート全文
 * @param {string} diagramId 図 ID
 * @param {?string} preset プリセット名。null なら選択解除（＝自動判定に戻す）
 * @returns {?{start: number, end: number, text: string}} 文字オフセットの編集。不要なら null
 */
export function selectedEdit(text, diagramId, preset) {
  const key = yamlScalar(diagramId);
  const entry = preset == null ? null : `${key}: ${yamlScalar(preset)}`;

  const fm = FM_RE.exec(text);
  if (!fm) {
    if (entry == null) return null;  // 解除対象がそもそも無い
    const bom = text.startsWith("﻿") ? 1 : 0;
    return { start: bom, end: bom, text: `---\nmdflow:\n  selected:\n    ${entry}\n---\n` };
  }

  // frontmatter 本文の各行を（開始オフセット付きで）並べる
  const prefixLen = FM_OPEN_RE.exec(text)[0].length;
  const fmBody = fm[1];
  const lines = [];
  let off = prefixLen;
  for (const raw of fmBody.split("\n")) {
    lines.push({ raw, start: off });
    off += raw.length + 1;
  }

  const mdflowIdx = lines.findIndex((l) => /^mdflow:\s*$/.test(l.raw.replace(/\r$/, "")));
  if (mdflowIdx < 0) {
    if (entry == null) return null;
    // frontmatter 末尾（閉じ --- の手前）に mdflow ブロックごと追記
    const insertAt = prefixLen + fmBody.length;
    return { start: insertAt, end: insertAt, text: `\nmdflow:\n  selected:\n    ${entry}` };
  }

  // mdflow: 配下から selected: を探す（トップレベルの次キーが来たら打ち切り）
  let selectedIdx = -1;
  for (let i = mdflowIdx + 1; i < lines.length; i++) {
    const raw = lines[i].raw.replace(/\r$/, "");
    if (raw.trim() && indentOf(raw) === 0) break;
    if (/^\s+selected:\s*$/.test(raw)) { selectedIdx = i; break; }
  }
  if (selectedIdx < 0) {
    if (entry == null) return null;
    const insertAt = lines[mdflowIdx].start + lines[mdflowIdx].raw.length + 1;
    return { start: insertAt, end: insertAt, text: `  selected:\n    ${entry}\n` };
  }

  // selected: 配下から対象図の行を探す
  const selIndent = indentOf(lines[selectedIdx].raw);
  const childIndentStr = " ".repeat(selIndent + 2);
  let entryIdx = -1;
  let childIndent = null;
  for (let i = selectedIdx + 1; i < lines.length; i++) {
    const raw = lines[i].raw.replace(/\r$/, "");
    if (raw.trim() && indentOf(raw) <= selIndent) break;
    if (!raw.trim()) continue;
    if (childIndent == null) childIndent = /^\s*/.exec(raw)[0];
    if (keyOfLine(raw) === diagramId) { entryIdx = i; break; }
  }

  if (entryIdx >= 0) {
    const l = lines[entryIdx];
    const hasCr = l.raw.endsWith("\r");
    if (entry == null) {
      // 行ごと削除（末尾の改行も含める）。selected: が空になっても YAML 上は null で無害
      const end = Math.min(l.start + l.raw.length + 1, prefixLen + fmBody.length);
      return { start: l.start, end, text: "" };
    }
    const indent = /^\s*/.exec(l.raw)[0];
    return { start: l.start, end: l.start + l.raw.length - (hasCr ? 1 : 0), text: `${indent}${entry}` };
  }

  if (entry == null) return null;
  const insertAt = lines[selectedIdx].start + lines[selectedIdx].raw.length + 1;
  return { start: insertAt, end: insertAt, text: `${childIndent ?? childIndentStr}${entry}\n` };
}
