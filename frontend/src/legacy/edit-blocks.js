// AI 応答テキストの編集プロトコル解析（純粋関数のみ・DOM/状態非依存）。
// システムプロンプト（app/note_prompts.py の EDIT_PROTOCOL）が指示する
// ```search/```replace・```apply ブロックの抽出と、<think> 分離。

/**
 * <think>...</think>（qwen 系のインライン思考）を本文から分離する。
 *
 * 思考が本文に混ざったまま反映処理へ流れると、AI の独り言や engine の内部指示の
 * 引用がそのまま文書へ書き込まれる。実際にそれが起きたので、次の2つを許容する:
 *   - <think> が応答の先頭でない（前に飾り文字などが付いた）場合
 *   - </think> が無いまま応答が終わった場合（思考時間の上限などで打ち切られたとき）
 * 閉じが無ければ <think> 以降は**すべて思考**とみなす（本文として採用しない）。
 */
export function splitThink(s) {
  const open = s.indexOf("<think>");
  if (open < 0) return { think: "", visible: s };
  const close = s.lastIndexOf("</think>");
  if (close < open) return { think: s.slice(open + 7), visible: s.slice(0, open) };
  return {
    think: s.slice(open + 7, close),
    visible: (s.slice(0, open) + s.slice(close + 8)).replace(/^\s+/, ""),
  };
}

/**
 * ```search / ```replace ペアを位置情報付きで走査する。
 * 入れ子フェンス（中身に ``` を含むコードブロック）と閉じ省略形に対応。
 * regex 一発ではなく行走査なのは、入れ子で範囲がずれるため。
 */
export function scanEditBlocks(text) {
  const lines = text.split("\n");
  const starts = [];
  let off = 0;
  for (const l of lines) { starts.push(off); off += l.length + 1; }
  const lineEnd = (idx) => Math.min(text.length, starts[idx] + lines[idx].length);

  const pairs = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() !== "```search") { i++; continue; }
    const startLine = i;
    const search = [];
    let depth = 0, hasReplace = false;
    for (i++; i < lines.length; i++) {
      const t = lines[i].trim();
      if (depth === 0 && t === "```replace") { hasReplace = true; break; }  // 閉じ省略形
      if (t === "```") {
        if (depth > 0) { depth--; search.push(lines[i]); continue; }
        // depth 0 の裸フェンス: 直後（空行を挟んでよい）が ```replace なら search の終端
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") j++;
        if (j < lines.length && lines[j].trim() === "```replace") { hasReplace = true; i = j; break; }
        search.push(lines[i]);  // それ以外は中身の一部とみなす
        continue;
      }
      if (t.startsWith("```") && t.length > 3) depth++;
      search.push(lines[i]);
    }
    if (!hasReplace) continue;  // 対になる ```replace が無ければ捨てる（従来同様）
    const replace = [];
    let endLine = -1;
    depth = 0;
    for (i++; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t === "```") {
        if (depth > 0) { depth--; replace.push(lines[i]); continue; }
        endLine = i; i++;  // depth 0 の裸フェンス = ペアの終端
        break;
      }
      if (depth === 0 && t === "```search") { endLine = i - 1; break; }  // 閉じ省略で次ペア開始
      if (t.startsWith("```") && t.length > 3) depth++;
      replace.push(lines[i]);
    }
    if (endLine < 0) continue;  // 終端が見つからない（出力打ち切り等）ペアは採用しない
    pairs.push({
      search: search.join("\n"),
      replace: replace.join("\n"),
      start: starts[startLine],
      end: lineEnd(endLine),
    });
  }
  return pairs;
}

/** ```search / ```replace のペアを順に抽出する。 */
export function extractEdits(text) {
  return scanEditBlocks(text).map(({ search, replace }) => ({ search, replace }));
}

/**
 * メッセージ本文から「反映すべき提案テキスト」を取り出す。
 * 優先: ```apply → 本文の大半を占める一般フェンス → ```diff を復元 → 本文そのまま。
 */
export function extractProposed(text) {
  // 思考は絶対に文書へ入れない。呼び出し側が分離済みでも二重に守る（安いので）。
  text = splitThink(text).visible;
  if (!text.trim()) return "";
  const apply = [...text.matchAll(/```apply\s*\n([\s\S]*?)```/g)];
  if (apply.length) return apply[apply.length - 1][1].replace(/\n$/, "");
  // 「修正版はこちら: ```...```」のように、フェンスが実質メッセージ全体である場合のみ
  // 中身を提案として採用する。長い文書に埋め込まれた小さなコード片を拾うと
  // 文書全体が失われるため、占有率が低いフェンスは無視して本文全体を使う。
  const fence = [...text.matchAll(/```(?!diff\b|search\b|replace\b)[a-zA-Z]*\s*\n([\s\S]*?)```/g)];
  if (fence.length) {
    const last = fence[fence.length - 1][1].replace(/\n$/, "");
    if (last.length >= text.trim().length * 0.6) return last;
  }
  const diff = [...text.matchAll(/```diff\s*\n([\s\S]*?)```/g)];
  if (diff.length) {
    const last = diff[diff.length - 1][1];
    if (last.length >= text.trim().length * 0.6) return diffToAfter(last);
  }
  return text.trim();
}

/** モデルが万一 unified diff を返した場合のベストエフォート復元（修正後テキスト）。 */
export function diffToAfter(block) {
  return block.split("\n")
    .filter((l) => !/^(-|@@|---|\+\+\+)/.test(l))          // 削除行・ヘッダを落とす
    .map((l) => (l.startsWith("+") || l.startsWith(" ") ? l.slice(1) : l))
    .join("\n").replace(/\n$/, "");
}
