// HTML → Markdown 変換（Confluence / Web からの貼り付け用）。
//
// Turndown（+ GFM プラグイン）のブラウザビルドを使う。どちらも window 直下に載る
// （window.TurndownService / window.turndownPluginGfm）。ベンダリングは
// scripts/fetch_turndown.py — 未取得なら available()=false になり、呼び出し側
// （app.js の貼り付けダイアログ）は「テキストをそのまま挿入」へ縮退する。

let td = null;  // 一度作ったら使い回す（Turndown インスタンスは再利用可）

/** ベンダリング済みでHTML→Markdown変換が使えるか。 */
export function available() {
  return typeof window.TurndownService === "function";
}

function converter() {
  if (!available()) return null;
  if (td) return td;
  td = new window.TurndownService({
    headingStyle: "atx",       // # 見出し（アプリのノート記法と揃える）
    codeBlockStyle: "fenced",  // ``` フェンス
    bulletListMarker: "-",
    emDelimiter: "_",
  });
  // GFM プラグイン: 表・打ち消し線・タスクリスト。コアの Turndown は表を
  // 生のテキストへ落として構造を壊すので、Confluence の表には必須。
  if (window.turndownPluginGfm?.gfm) td.use(window.turndownPluginGfm.gfm);
  // src の無い <img>（Confluence の絵文字マクロ等が壊れた残骸）は空文字にする。
  td.addRule("dropBrokenImg", {
    filter: (node) => node.nodeName === "IMG" && !node.getAttribute("src"),
    replacement: () => "",
  });
  return td;
}

/**
 * HTML 文字列を Markdown に変換する。
 * Turndown 未取得なら例外（呼び出し側は available() で事前に避けられる）。
 */
export function htmlToMarkdown(html) {
  const t = converter();
  if (!t) throw new Error("Turndown が未取得です（python -m pipenv run python scripts/fetch_turndown.py を実行してください）");
  return t.turndown(html);
}
