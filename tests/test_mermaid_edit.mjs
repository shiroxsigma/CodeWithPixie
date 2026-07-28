// static/js/mermaid-edit.js の純粋関数（パーサ＋編集列の生成）のテスト。
// DOM に触らない部分だけを対象にしているので node だけで動く。
// pytest からは tests/test_mermaid_edit_js.py が呼ぶ（node が無ければ skip）。
//
//   node tests/test_mermaid_edit.mjs

import assert from "node:assert/strict";
import * as M from "../static/js/mermaid-edit.js";

let pass = 0;
const t = (name, fn) => {
  try {
    fn();
    pass++;
    console.log("ok   " + name);
  } catch (e) {
    console.log("FAIL " + name + "\n     " + (e && e.message));
    process.exitCode = 1;
  }
};

const apply = (src, edits) => M.applyEditsToText(src, edits);
const parse = (src) => M.parseFlowchart(src);

/** 編集列が重なっていないこと（Monaco の executeEdits は重複範囲を受け付けない）。 */
const assertNoOverlap = (edits) => {
  const s = [...edits].sort((a, b) => a.start - b.start);
  for (let i = 1; i < s.length; i++) {
    assert.ok(s[i].start >= s[i - 1].end, `overlap: ${JSON.stringify(s)}`);
  }
};

// ---- 編集できる図かどうかの判定 ----------------------------------------------

t("flowchart 以外の図は編集不可", () => {
  const r = M.diagramEditability("sequenceDiagram\n  A->>B: hi\n");
  assert.equal(r.ok, false);
  assert.match(r.reason, /flowchart/);
});

t("subgraph を含む図は編集不可", () => {
  const r = M.diagramEditability("flowchart TD\n  subgraph s\n  A --> B\n  end\n");
  assert.equal(r.ok, false);
  assert.match(r.reason, /subgraph/);
});

t("素の flowchart は編集可", () => {
  assert.equal(M.diagramEditability("flowchart TD\n  A[a] --> B[b]\n").ok, true);
});

t("中身の無い flowchart も編集可（ノード追加の起点になる）", () => {
  assert.equal(M.diagramEditability("flowchart TD\n").ok, true);
});

// ---- 削除に伴う参照の後始末 ---------------------------------------------------

t("辺を消すと linkStyle の番号が詰まる", () => {
  const src = "flowchart TD\n  A --> B\n  B --> C\n  C --> D\n  linkStyle 0,2 stroke:red\n";
  const edits = M.deleteEdge(parse(src), src, 1); // B --> C を消す
  assertNoOverlap(edits);
  const out = apply(src, edits);
  assert.match(out, /linkStyle 0,1 stroke:red/);
  assert.ok(!out.includes("B --> C"), out);
});

t("linkStyle が消した辺だけを指していたら行ごと消える", () => {
  const src = "flowchart TD\n  A --> B\n  B --> C\n  linkStyle 1 stroke:red\n";
  const out = apply(src, M.deleteEdge(parse(src), src, 1));
  assert.ok(!out.includes("linkStyle"), out);
});

t("ノードを消すと class / style / linkStyle の参照も片づく", () => {
  const src = "flowchart TD\n  A[a] --> B[b]\n  A --> C[c]\n"
    + "  classDef hot fill:#f00;\n  class A,C hot;\n  style A fill:#eee\n"
    + "  linkStyle 1 stroke:red\n";
  const edits = M.deleteNode(parse(src), src, "A");
  assertNoOverlap(edits);
  const out = apply(src, edits);
  assert.match(out, /class C hot;/);            // 参照から A だけ落ちる
  assert.ok(!out.includes("style A"), out);      // A の style 行は消える
  assert.ok(!out.includes("linkStyle"), out);    // 指していた辺が消えたので行ごと消える
  assert.ok(!out.includes("A[a]"), out);
});

t("classDef は class 文として誤解釈されない", () => {
  const src = "flowchart TD\n  A[a] --> B[b]\n  classDef hot fill:#f00;\n";
  const out = apply(src, M.deleteNode(parse(src), src, "A"));
  assert.match(out, /classDef hot fill:#f00;/);
});

t("チェインの真ん中のノードを消すと残りが再構成される", () => {
  const src = "flowchart TD\n  A[a] --> B[b] --> C[c]\n";
  const out = apply(src, M.deleteNode(parse(src), src, "B"));
  assert.ok(!out.includes("B"), out);
  assert.match(out, /A\[a\]/);
  assert.match(out, /C\[c\]/);
});

t("最終行に参照があっても編集範囲が重ならない", () => {
  const src = "flowchart TD\n  A[a] --> B[b]\n  class A hot;";
  const edits = M.deleteNode(parse(src), src, "A");
  assertNoOverlap(edits);
  apply(src, edits);
});

// ---- 矢印の線種・向き ---------------------------------------------------------

t("矢印の線種を差し替える", () => {
  const src = "flowchart TD\n  A --> B\n";
  assert.equal(apply(src, M.setEdgeArrow(parse(src), src, 0, "-.->")),
    "flowchart TD\n  A -.-> B\n");
});

t("線種の差し替えはラベルを保つ", () => {
  const src = "flowchart TD\n  A -->|yes| B\n";
  assert.equal(apply(src, M.setEdgeArrow(parse(src), src, 0, "==>")),
    "flowchart TD\n  A ==>|yes| B\n");
});

t("矢印を反転する（ラベルと線種は保つ）", () => {
  const src = "flowchart TD\n  A[a] -.->|yes| B[b]\n";
  assert.equal(apply(src, M.reverseEdge(parse(src), src, 0)),
    "flowchart TD\n  B[b] -.->|yes| A[a]\n");
});

t("チェインのうち1本だけ反転する", () => {
  const src = "flowchart TD\n  A --> B --> C\n";
  assert.equal(apply(src, M.reverseEdge(parse(src), src, 0)),
    "flowchart TD\n  B --> A\n  B --> C\n");
});

// ---- 追加 ---------------------------------------------------------------------

t("ノード追加は空きIDを選んで末尾に足す", () => {
  const src = "flowchart TD\n  N1[a] --> B[b]\n";
  const { edits, id } = M.addNode(parse(src), src, {});
  assert.equal(id, "N2");
  assert.match(apply(src, edits), /\n {2}N2\[新規ノード\]\n$/);
});

t("辺追加は既存ノードの定義をそのまま使う", () => {
  const src = "flowchart TD\n  A[a]\n  B[b]\n";
  const out = apply(src, M.addEdge(parse(src), src, "A", "B", "yes").edits);
  assert.match(out, /\n {2}A\[a\] -->\|yes\| B\[b\]\n$/);
});

t("自己ループを足せる", () => {
  const src = "flowchart TD\n  A[a]\n";
  const out = apply(src, M.addEdge(parse(src), src, "A", "A", "").edits);
  assert.match(out, /A\[a\] --> A\[a\]/);
});

// ---- ラベル -------------------------------------------------------------------

t("空ラベルにしても構文エラーにならない", () => {
  const src = "flowchart TD\n  A[a]\n";
  assert.equal(apply(src, M.editNodeLabel(parse(src), src, "A", "")),
    'flowchart TD\n  A[" "]\n');
});

t("ラベルのエスケープを往復できる", () => {
  const src = "flowchart TD\n  A[a] -->|x| B[b]\n";
  const out = apply(src, M.editNodeLabel(parse(src), src, "A", 'say "hi"'));
  assert.match(out, /A\[say #quot;hi#quot;\]/);
  assert.equal(M.decodeLabel("say #quot;hi#quot;"), 'say "hi"');
  assert.equal(M.decodeLabel("a#124;b"), "a|b");
});

t("辺ラベルを空にすると削除される", () => {
  const src = "flowchart TD\n  A -->|yes| B\n";
  assert.equal(apply(src, M.editEdgeLabel(parse(src), src, 0, "")),
    "flowchart TD\n  A --> B\n");
});

console.log(`\n${pass} passed`);
