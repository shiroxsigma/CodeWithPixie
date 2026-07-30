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

// ---- 実際に出回る書き方（ここが厳しすぎると図が丸ごと編集不可になる） ----------

const REAL_WORLD = {
  "基本の flowchart": "flowchart TD\n    A[開始] --> B{条件?}\n    B -->|Yes| C[処理]\n    B -->|No| D[終了]\n",
  "graph + セミコロン": "graph TD;\n    A-->B;\n    B-->C;\n",
  "ヘッダ行に末尾コメント": "flowchart TD %% メインフロー\n    A --> B\n",
  "ヘッダ行にセミコロン": "flowchart TD;\n    A --> B\n",
  "flowchart-elk": "flowchart-elk LR\n    A --> B\n",
  "mermaid frontmatter": "---\ntitle: 図\n---\nflowchart TD\n    A --> B\n",
  "init ディレクティブ": "%%{init: {'theme':'dark'}}%%\nflowchart TD\n    A --> B\n",
  "mdflow の id コメント": "%% id: flow1\nflowchart TD\n    A[a] --> B[b]\n",
  "direction 行": "flowchart\n    direction LR\n    A --> B\n",
  "末尾に改行なし": "flowchart TD\n    A --> B",
};

for (const [name, src] of Object.entries(REAL_WORLD)) {
  t(`編集できる: ${name}`, () => {
    const r = M.diagramEditability(src);
    assert.equal(r.ok, true, r.reason);
    const m = parse(src);
    assert.ok(m.edges.length >= 1, `辺が拾えていない: ${JSON.stringify([...m.nodes.keys()])}`);
  });
}

t("セミコロン付きの辺もラベル編集できる", () => {
  const src = "graph TD;\n    A-->B;\n";
  const out = apply(src, M.editEdgeLabel(parse(src), src, 0, "yes"));
  assert.equal(out, "graph TD;\n    A-->|yes|B;\n");
});

t("セミコロン付きのノードもラベル編集できる", () => {
  const src = "graph TD;\n    A[a];\n";
  const out = apply(src, M.editNodeLabel(parse(src), src, "A", "b"));
  assert.equal(out, "graph TD;\n    A[b];\n");
});

// 編集の結果が「また編集できる図」であること。壊れた出力を作っていないかの安全網。
const OPS = {
  "ノードのラベル変更": (m, src) => M.editNodeLabel(m, src, [...m.nodes.keys()][0], "新ラベル"),
  "辺のラベル変更": (m, src) => M.editEdgeLabel(m, src, 0, "ラベル"),
  "ノード追加": (m, src) => M.addNode(m, src, {}).edits,
  "辺追加": (m, src) => {
    const ids = [...m.nodes.keys()];
    return M.addEdge(m, src, ids[0], ids[ids.length - 1], "x").edits;
  },
  "辺の反転": (m, src) => M.reverseEdge(m, src, 0),
  "線種の変更": (m, src) => M.setEdgeArrow(m, src, 0, "-.->"),
  "辺の削除": (m, src) => M.deleteEdge(m, src, 0),
  "ノードの削除": (m, src) => M.deleteNode(m, src, [...m.nodes.keys()][0]),
};

for (const [name, src] of Object.entries(REAL_WORLD)) {
  for (const [op, run] of Object.entries(OPS)) {
    t(`${op}のあとも編集できる図のまま: ${name}`, () => {
      const m = parse(src);
      const edits = run(m, src);
      assertNoOverlap(edits);
      const out = apply(src, edits);
      const again = M.diagramEditability(out);
      assert.equal(again.ok, true, `${again.reason}\n--- 出力 ---\n${out}`);
    });
  }
}

// ---- SVG id とモデルの対応付け（resolveNodeId / resolveEdgeIndex） -------------
// mermaid のバージョンで id 形式が揺れる。v11 は図IDを前置し辺は _ 区切り
// （pixie-mermaid-0-flowchart-A-0 / pixie-mermaid-0-L_A_B_0）。旧形式は
// flowchart-A-0 / L-A-B-0 + LS-/LE- クラス。両対応であることを固定する。

const NODESET = (...ids) => new Map(ids.map((id) => [id, { id }]));

t("resolveNodeId: 旧形式", () => {
  assert.equal(M.resolveNodeId("flowchart-A-0", NODESET("A")), "A");
});

t("resolveNodeId: v11 の図ID前置形式", () => {
  assert.equal(M.resolveNodeId("pixie-mermaid-0-flowchart-A-0", NODESET("A")), "A");
});

t("resolveNodeId: ハイフン入りノードID", () => {
  assert.equal(M.resolveNodeId("pixie-mermaid-12-flowchart-my-node-3", NODESET("my-node")), "my-node");
});

t("resolveNodeId: A-1 と A が共存しても長い方を優先", () => {
  assert.equal(M.resolveNodeId("flowchart-A-1-0", NODESET("A", "A-1")), "A-1");
  assert.equal(M.resolveNodeId("flowchart-A-1", NODESET("A", "A-1")), "A");
});

t("resolveNodeId: ノードID自体が flowchart- を含む", () => {
  assert.equal(
    M.resolveNodeId("pixie-mermaid-0-flowchart-flowchart-A-0", NODESET("flowchart-A")),
    "flowchart-A");
});

t("resolveNodeId: 日本語ノードID", () => {
  assert.equal(M.resolveNodeId("pixie-mermaid-0-flowchart-開始-0", NODESET("開始")), "開始");
});

t("resolveNodeId: 対応しない id は null", () => {
  assert.equal(M.resolveNodeId("", NODESET("A")), null);
  assert.equal(M.resolveNodeId("pixie-mermaid-0", NODESET("A")), null);
  assert.equal(M.resolveNodeId("flowchart-X-0", NODESET("A")), null);
});

const EDGE_MODEL = (src) => parse(src);
const pathOf = (id, cls = "") => ({ id, classList: cls ? cls.split(" ") : [] });

t("resolveEdgeIndex: v11 の L_A_B_0 形式", () => {
  const m = EDGE_MODEL("flowchart TD\n  A --> B\n  B --> C\n");
  assert.equal(M.resolveEdgeIndex(pathOf("pixie-mermaid-0-L_A_B_0"), m), 0);
  assert.equal(M.resolveEdgeIndex(pathOf("pixie-mermaid-0-L_B_C_0"), m), 1);
});

t("resolveEdgeIndex: 旧形式 L-A-B-0", () => {
  const m = EDGE_MODEL("flowchart TD\n  A --> B\n");
  assert.equal(M.resolveEdgeIndex(pathOf("L-A-B-0"), m), 0);
});

t("resolveEdgeIndex: LS-/LE- クラスが最優先", () => {
  const m = EDGE_MODEL("flowchart TD\n  A --> B\n  B --> C\n");
  assert.equal(M.resolveEdgeIndex(pathOf("junk", "flowchart-link LS-B LE-C"), m), 1);
});

t("resolveEdgeIndex: _ 入りノードIDでも実在する辺で解決", () => {
  // L_A_B_C_0 は A/B_C とも A_B/C とも読める。モデルに実在する辺（A_B --> C）を選ぶ
  const m = EDGE_MODEL("flowchart TD\n  A_B --> C\n  A[a]\n  B_C[b]\n");
  assert.equal(M.resolveEdgeIndex(pathOf("pixie-mermaid-0-L_A_B_C_0"), m), 0);
});

t("resolveEdgeIndex: 曖昧（両方実在）なら誤選択せず null", () => {
  // A --> B_C と A_B --> C が両方あると DOM id はどちらも L_A_B_C_n。
  // 取り違えて削除する事故より選択不能のほうが安全（Fable レビュー指摘）。
  const m = EDGE_MODEL("flowchart TD\n  A --> B_C\n  A_B --> C\n");
  assert.equal(M.resolveEdgeIndex(pathOf("pixie-mermaid-0-L_A_B_C_0"), m), null);
});

t("resolveEdgeIndex: 平行辺は pairIdx で選ぶ", () => {
  const m = EDGE_MODEL("flowchart TD\n  A -->|x| B\n  A -->|y| B\n");
  assert.equal(M.resolveEdgeIndex(pathOf("pixie-mermaid-0-L_A_B_0"), m), 0);
  assert.equal(M.resolveEdgeIndex(pathOf("pixie-mermaid-0-L_A_B_1"), m), 1);
});

console.log(`\n${pass} passed`);
