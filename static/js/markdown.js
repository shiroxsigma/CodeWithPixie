// Markdown 描画。チャットの返信とエディタのプレビューで同じレンダラを共有する。
//
// markdown-it / mermaid はどちらも UMD ビルドなので index.html の <script> で
// window に載る。scripts/fetch_*.py でベンダリングしていなければ undefined になるので、
// その場合は静かに機能を落とす（Monaco と違い、無くても編集はできる）。

import * as mdflow from "./mdflow.js";

const md = window.markdownit
  ? window.markdownit({
      // html: false が最大の防御。AI の生成物と /api/web2md で取り込んだ外部ページを
      // innerHTML に入れる以上、生 HTML を通すわけにはいかない（<script> はエスケープされる）。
      // ここを true にするなら DOMPurify のベンダリングが必須になる。
      html: false,
      linkify: true,
      breaks: false,
    })
  : null;

const mermaid = window.mermaid || null;

/** ベンダリング済みで Markdown 描画が使えるか。 */
export const available = () => md !== null;

if (mermaid) {
  mermaid.initialize({
    startOnLoad: false,   // 描画のタイミングはこちらが握る（renderInto の後）
    theme: "dark",        // エディタが vs-dark なので図も暗色に揃える
    // securityLevel はラベルに埋め込まれた HTML の扱いを決める。strict なら
    // DOMPurify が onerror 等のハンドラを剥がす。AI の生成物を描く以上ここは緩められない。
    securityLevel: "strict",
  });
}

if (md) {
  // リンクは既定のブラウザで新規タブに開く。ローカルアプリなので、
  // リンクを踏んでエディタのページ自体が遷移してしまうと編集中の内容を失う。
  const defaultLinkOpen =
    md.renderer.rules.link_open ||
    ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer");
    return defaultLinkOpen(tokens, idx, opts, env, self);
  };

  // 画像: ノートに書かれた相対パス（images/foo.png 等）はブラウザからは見えないので、
  // ワークスペース内を配信する /api/asset へ書き換える。http(s)/data はそのまま通す。
  const defaultImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const src = tokens[idx].attrGet("src");
    if (src) tokens[idx].attrSet("src", resolveAssetSrc(src));
    return defaultImage(tokens, idx, opts, env, self);
  };

  // ```mermaid フェンスは図の器として出しておき、描画は renderInto の後で非同期に行う
  // （mermaid.render が Promise を返すため、markdown-it の同期レンダラ内では完結しない）。
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    if (token.info.trim().toLowerCase() === "mermaid" && mermaid) {
      // 中身は escapeHtml 相当で入れる。描画失敗時はこのテキストがそのまま見える。
      return `<pre class="mermaid-src">${escapeHtml(token.content)}</pre>`;
    }
    // mdflow-mapping（条件マッピング定義）は生 YAML を見せず折りたたむ。
    // テキストが正であることの透明性のため、開けばソースは見える。
    if (/^(?:yaml\s+)?mdflow-mapping$/i.test(token.info.trim())) {
      const dm = /^diagram\s*:\s*(\S+)/m.exec(token.content);
      const label = dm ? `条件マッピング: ${escapeHtml(dm[1])}` : "条件マッピング";
      return `<details class="mdflow-mapping"><summary>⚙ ${label}</summary>`
        + `<pre>${escapeHtml(token.content)}</pre></details>`;
    }
    return defaultFence(tokens, idx, opts, env, self);
  };
}

// 相対画像パスの解決基準（現在ノートのディレクトリ、ワークスペース相対）。
// レンダラ本体は markdown-it に組み込まれていて呼び出しごとに引数を足せないため、
// モジュール状態として持ち、app.js が描画前に setAssetBase で更新する。
let assetBase = "";

/** 相対画像パスの基準ディレクトリを設定する（"" ならワークスペースのルート）。 */
export function setAssetBase(dir) {
  assetBase = dir || "";
}

function resolveAssetSrc(src) {
  // 外部 URL・データ URL・ルート相対はそのまま（プレビューに書き換える理由がない）
  if (/^(https?:|data:|blob:|\/)/i.test(src)) return src;
  // ノートのディレクトリ基準で ./ ../ を畳み、ワークスペース相対パスにする。
  // 畳んだ結果ルートより上に出る分は捨てる（サーバ側 safe_path でも拒否される）。
  const parts = [];
  for (const seg of `${assetBase}/${src}`.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") { parts.pop(); continue; }
    parts.push(seg);
  }
  return "/api/asset?path=" + encodeURIComponent(parts.join("/"));
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 図ごとに一意な id が要る（mermaid が SVG 内部の参照に使う）
let mermaidSeq = 0;

// ソース → SVG のキャッシュ。プレビューは打鍵のたびに描き直すので、
// 中身の変わっていない図まで mermaid.render に掛けるとちらつくうえ重い。
const svgCache = new Map();
const SVG_CACHE_MAX = 50;

// 要素ごとの描画世代。renderInto が呼ばれるたびに進める。非同期の描画が
// 戻ってきたとき世代が古ければ、既に作り直された DOM なので捨てる。
const generation = new WeakMap();

function putSvg(src, svg) {
  if (svgCache.size >= SVG_CACHE_MAX) svgCache.delete(svgCache.keys().next().value);
  svgCache.set(src, svg);
}

function toBox(svg) {
  const box = document.createElement("div");
  box.className = "mermaid-box";
  box.innerHTML = svg;  // mermaid が securityLevel:'strict' で生成した SVG

  // mermaid は svg に width="100%" と inline の max-width:<自然幅> を付ける。
  // その結果、狭い枠では図全体が縮尺され（1098px の図が 360px の枠で 1/3 に潰れる）、
  // ラベルが読めなくなる。自然幅を明示して縮小を止め、溢れる分は .mermaid-box 側で
  // 横スクロールさせる。CSS で width:auto にしてはいけない — viewBox しか持たない
  // SVG は幅 auto だと既定の 300px になり、かえって小さくなる。
  const el = box.querySelector("svg");
  const vb = el?.getAttribute("viewBox")?.trim().split(/[\s,]+/);
  if (vb?.length === 4 && Number.isFinite(parseFloat(vb[2]))) {
    el.style.width = `${parseFloat(vb[2])}px`;
    el.style.maxWidth = "none";
  }
  return box;
}

/**
 * el 配下の .mermaid-src を図に差し替える。非同期。
 * 失敗した図はソースのまま残し、理由を添える（黙って消さない）。
 * ctx（renderInto の opts.mdflow）があるときは、条件マッピングの選択に応じて
 * classDef を注入したソースで描き、図の直下にプリセットリストを差し込む。
 */
async function renderMermaid(el, gen, ctx) {
  if (!mermaid) return;
  for (const block of el.querySelectorAll("pre.mermaid-src")) {
    const src = block.textContent;
    const flow = ctx ? prepareFlow(src, ctx) : null;
    // svgCache のキーは注入済みソース。プリセットを切り替えるとキーが変わるので、
    // プリセットごとの SVG が自然に別エントリとしてキャッシュされる。
    let renderSrc = flow ? flow.injected : src;

    const finish = (box) => {
      block.replaceWith(box);
      if (flow) box.after(buildPresetList(flow, ctx));
    };

    const cached = svgCache.get(renderSrc);
    if (cached) { finish(toBox(cached)); continue; }

    let svg;
    try {
      ({ svg } = await mermaid.render(`pixie-mermaid-${mermaidSeq++}`, renderSrc));
    } catch (e) {
      document.getElementById(`dpixie-mermaid-${mermaidSeq - 1}`)?.remove();
      // 注入済みソースで失敗したら素のソースで再挑戦する。flowchart 以外に
      // class 文を注入した場合など、ハイライトは諦めても図は出したい。
      if (flow && renderSrc !== src) {
        try {
          renderSrc = src;
          ({ svg } = await mermaid.render(`pixie-mermaid-${mermaidSeq++}`, renderSrc));
        } catch (e2) {
          document.getElementById(`dpixie-mermaid-${mermaidSeq - 1}`)?.remove();
          svg = null;
        }
      } else {
        svg = null;
      }
      if (svg == null) {
        // 書きかけ・構文エラーは普通に起きる。ソースを残したまま理由だけ出す。
        block.classList.add("mermaid-error");
        block.title = `Mermaid の構文エラー: ${e?.message || e}`;
        continue;
      }
    }
    putSvg(renderSrc, svg);
    // await の間に描き直されていたら、この block は既に捨てられた DOM
    if (generation.get(el) !== gen) return;
    finish(toBox(svg));
  }
}

// ---- mdflow（条件別フロー可視化）のプレビュー統合 -----------------------------
// パース・評価・注入の本体は mdflow.js（app/mdflow.py と同仕様）。ここは
// mermaid ブロック1つぶんの描画準備と、図の直下に出すプリセットリストの DOM 構築。

/** mermaid ソース1つに対する mdflow の適用内容を組み立てる（対象外なら null）。 */
function prepareFlow(src, ctx) {
  if (!mdflow.available()) return null;
  const diagramId = mdflow.diagramIdOf(src);
  const mapping = mdflow.findMapping(ctx.doc.mappings, diagramId);
  if (!mapping || !mapping.presets.length) return null;

  const condText = ctx.conditions.get(diagramId) || "";
  let conditions = {};
  let invalidCond = false;
  if (condText.trim()) {
    try {
      const parsed = JSON.parse(condText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) conditions = parsed;
      else invalidCond = true;
    } catch {
      invalidCond = true;
    }
  }

  const selectedName = ctx.doc.selected[diagramId] || null;
  const resolution = mdflow.resolvePreset(mapping, invalidCond ? {} : conditions, selectedName);
  let injected = src;
  let missing = [];
  if (resolution) {
    ({ code: injected, missing } = mdflow.injectStyle(
      src, resolution.activeNodes, resolution.style, "mdflowActive", resolution.inactiveStyle
    ));
  }

  // プリセットごとの「図に存在しないノードID」（⚠ バッジ用）。flowchart 以外は
  // ノードID抽出がヒューリスティックで誤検知しやすいため判定しない。
  const missingByPreset = {};
  if (mdflow.isFlowchart(src)) {
    const present = new Set(mdflow.nodeIdsOrdered(src));
    for (const p of mapping.presets) {
      const miss = p.activeNodes.filter((n) => !present.has(n));
      if (miss.length) missingByPreset[p.name] = miss;
    }
  }

  return {
    diagramId, mapping, selectedName, resolution, condText, invalidCond, injected, missing,
    missingByPreset,
  };
}

/**
 * 図の直下に出す条件プリセットのリストを組み立てる。
 * クリック・入力のハンドラは付けない — DOM は打鍵のたびに作り直されるため、
 * app.js が #preview への委譲リスナーで data-diagram / data-preset を拾う。
 * テキストは全て textContent 経由（プリセット名は AI の生成物になりうる）。
 */
function buildPresetList(flow, ctx) {
  const wrap = document.createElement("div");
  wrap.className = "mdflow-presets";
  wrap.dataset.diagram = flow.diagramId;

  const title = document.createElement("div");
  title.className = "mdflow-presets-title";
  title.textContent = "条件プリセット";
  wrap.appendChild(title);

  const ul = document.createElement("ul");

  // 「（条件で自動判定）」= 選択解除。frontmatter の selected を消し、when 評価に任せる
  const autoLi = document.createElement("li");
  autoLi.className = "mdflow-preset-item mdflow-auto";
  autoLi.dataset.preset = "";
  autoLi.textContent = "（条件で自動判定）";
  if (!flow.selectedName) autoLi.classList.add("selected");
  ul.appendChild(autoLi);

  for (const p of flow.mapping.presets) {
    const li = document.createElement("li");
    li.className = "mdflow-preset-item";
    li.dataset.preset = p.name;

    const whenText = p.when || "（無条件）";
    const missingIds = flow.missingByPreset?.[p.name] || [];
    const titleLines = [`when: ${whenText}`, `active_nodes: ${p.activeNodes.join(", ")}`];
    if (missingIds.length) titleLines.push(`図に存在しないノードID: ${missingIds.join(", ")}`);
    li.title = titleLines.join("\n");

    // 1行目: 名前（＋自動/警告バッジ） / 2行目: when 式。textContent 経由で組み立てる
    // （プリセット名・when は AI の生成物になりうるので innerHTML は使わない）。
    const body = document.createElement("div");
    body.className = "mdflow-preset-body";

    const nameRow = document.createElement("div");
    nameRow.className = "mdflow-preset-name";
    const nameText = document.createElement("span");
    nameText.textContent = p.name;
    nameRow.appendChild(nameText);

    if (missingIds.length) {
      const warnBadge = document.createElement("span");
      warnBadge.className = "mdflow-warn-badge";
      warnBadge.textContent = "⚠";
      nameRow.appendChild(warnBadge);
    }

    if (flow.selectedName === p.name) li.classList.add("selected");
    if (!flow.selectedName && flow.resolution?.auto && flow.resolution.name === p.name) {
      li.classList.add("auto-hit");
      const badge = document.createElement("span");
      badge.className = "mdflow-badge";
      badge.textContent = "自動";
      nameRow.appendChild(badge);
    }
    body.appendChild(nameRow);

    const whenEl = document.createElement("span");
    whenEl.className = "mdflow-when";
    whenEl.textContent = whenText;
    body.appendChild(whenEl);

    li.appendChild(body);
    ul.appendChild(li);
  }
  wrap.appendChild(ul);

  if (!flow.resolution && !flow.selectedName) {
    const note = document.createElement("div");
    note.className = "mdflow-note";
    note.textContent = "一致するプリセットがありません（ハイライトなし）";
    wrap.appendChild(note);
  }

  const input = document.createElement("input");
  input.className = "mdflow-cond";
  input.type = "text";
  input.placeholder = '条件JSONで自動判定 例 {"role": "admin", "error_count": 0}';
  input.value = flow.condText;
  input.spellcheck = false;
  if (flow.invalidCond) input.classList.add("invalid");
  wrap.appendChild(input);

  // 再レンダで input が作り直され、打鍵中のフォーカスが飛ぶ。app.js が描画前に
  // 記録したフォーカス位置（ctx.focus）をここで復元する。
  if (ctx.focus && ctx.focus.diagramId === flow.diagramId) {
    requestAnimationFrame(() => {
      input.focus();
      try { input.setSelectionRange(ctx.focus.selStart, ctx.focus.selEnd); } catch { /* 値が短くなった等 */ }
    });
  }
  return wrap;
}

/**
 * text を Markdown として el に描画する。
 * ベンダリングが無ければ textContent に落とす（呼び出し側は分岐しなくてよい）。
 * mermaid 図は描画が非同期なので、少し遅れて図に差し替わる。
 * opts.mdflow（{doc, conditions, focus?}）を渡すと、条件マッピングのある図は
 * 選択プリセットでハイライトされ、直下にプリセットリストが付く（エディタの
 * プレビュー専用。チャットの描画は従来どおり opts なしで呼ぶ）。
 */
export function renderInto(el, text, opts = {}) {
  if (!md) {
    el.classList.remove("md");
    el.textContent = text;
    return;
  }
  el.classList.add("md");  // .md が付いた要素だけ pre-wrap をやめる（style.css 参照）
  el.innerHTML = md.render(text);
  const gen = (generation.get(el) || 0) + 1;
  generation.set(el, gen);
  renderMermaid(el, gen, opts.mdflow || null);
}

/** 生テキストとして描画する。ストリーミング中など、まだ Markdown が完成していない段階用。 */
export function renderPlain(el, text) {
  el.classList.remove("md");
  el.textContent = text;
}
