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
  // ```mermaid の次が空行（実文書でよくある書き方）
  "先頭が空行": "\nflowchart TD\n    A --> B\n",
  // 中置ラベル・スタジアム形・<br/>・classDef が混ざった実物に近い図
  "中置ラベルの判定フロー":
    "flowchart TD\n    A([開始])\n    A --> MM{成立？<br/>C_R=1}\n"
    + "    MM -- No --> M1[位置特定不可]\n    MM -- Yes --> B{通信可能？}\n"
    + "    B -- No<br/>圏外 --> C[DL不可]\n"
    + "    classDef warn fill:#fdd,stroke:#b00;\n    class C warn;\n",
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

// ---- 中置ラベル記法 A-- ラベル -->B -------------------------------------------
// 実文書ではこの書き方が多い。読めないと行ごと「その他」に落ち、その行の辺も
// インライン定義（MM1[位置特定不可] 等）もGUIから見えなくなる。

t("中置ラベル: 辺として読める", () => {
  const m = parse("flowchart TD\n  A -- はい --> B\n");
  assert.equal(m.supported, true);
  assert.equal(m.edges.length, 1);
  assert.equal(m.edges[0].from, "A");
  assert.equal(m.edges[0].to, "B");
  assert.equal(m.edges[0].arrow.text, "-->");
  assert.equal(m.edges[0].arrow.label, "はい");
});

t("中置ラベル: 点線・太線・x/o も族ごとに読める", () => {
  const cases = [
    ["A -. ラベル .-> B", "-.->"], ["A -. ラベル .- B", "-.-"],
    ["A == ラベル ==> B", "==>"], ["A == ラベル === B", "==="],
    ["A -- ラベル --- B", "---"], ["A -- ラベル --x B", "--x"],
    ["A -- ラベル --o B", "--o"], ["A == ラベル ==x B", "==x"],
  ];
  for (const [line, kind] of cases) {
    const m = parse(`flowchart TD\n  ${line}\n`);
    assert.equal(m.edges.length, 1, line);
    assert.equal(m.edges[0].arrow.text, kind, line);
    assert.equal(m.edges[0].arrow.label, "ラベル", line);
  }
});

t("中置ラベル: 族をまたぐ組み合わせは辺にしない", () => {
  // `-- x ==>` は mermaid でも無効。読めない行は「その他」として温存される。
  const m = parse("flowchart TD\n  A -- ラベル ==> B\n");
  assert.equal(m.edges.length, 0);
  assert.equal(m.supported, true);
});

t("中置ラベル: 閉じが無い行・空ラベルは辺にしない", () => {
  assert.equal(parse("flowchart TD\n  A -- B\n").edges.length, 0);
  assert.equal(parse("flowchart TD\n  A -- --> B\n").edges.length, 0);
});

t("中置ラベル: ラベル内の - や <br/> で切れない", () => {
  const m = parse("flowchart TD\n  D -- 5xx Error<br/>②-1 --> E[異常]\n");
  assert.equal(m.edges.length, 1);
  assert.equal(m.edges[0].arrow.label, "5xx Error<br/>②-1");
  assert.equal(m.nodes.get("E").def.label, "異常");
});

t("中置ラベル: 素の矢印を先に採る（mermaid の字句解析と同じ）", () => {
  const m = parse("flowchart TD\n  A-->B\n  C---D\n");
  assert.equal(m.edges.length, 2);
  assert.equal(m.edges[0].arrow.text, "-->");
  assert.equal(m.edges[0].arrow.label, null);
  assert.equal(m.edges[1].arrow.text, "---");
});

t("中置ラベル: ラベル変更は記法を保つ", () => {
  const src = "flowchart TD\n  A -- はい --> B\n";
  const m = parse(src);
  const out = apply(src, M.editEdgeLabel(m, src, 0, "いいえ"));
  assert.equal(out, "flowchart TD\n  A -- いいえ --> B\n");
  assert.equal(parse(out).edges[0].arrow.label, "いいえ");
});

t("中置ラベル: 中置で書けない文字は |ラベル| 形式へ倒す", () => {
  const src = "flowchart TD\n  A -- はい --> B\n";
  const m = parse(src);
  const out = apply(src, M.editEdgeLabel(m, src, 0, "a|b"));
  assert.equal(out, "flowchart TD\n  A -->|a#124;b| B\n");
  assert.equal(parse(out).edges[0].arrow.label, "a#124;b");
  // ラベルに閉じ記号が入る場合も同じ（中置のままだとそこで切れてしまう）
  const out2 = apply(src, M.editEdgeLabel(parse(src), src, 0, "x-->y"));
  assert.equal(parse(out2).edges.length, 1);
  assert.equal(parse(out2).edges[0].to, "B");
});

t("中置ラベル: ラベルを空にすると素の矢印へ戻る", () => {
  const src = "flowchart TD\n  A -- はい --> B\n";
  const out = apply(src, M.editEdgeLabel(parse(src), src, 0, ""));
  assert.equal(out, "flowchart TD\n  A --> B\n");
});

t("中置ラベル: 線種の変更は |ラベル| 形式へ統一される", () => {
  const src = "flowchart TD\n  A -- はい --> B\n";
  const out = apply(src, M.setEdgeArrow(parse(src), src, 0, "<-->"));
  assert.equal(out, "flowchart TD\n  A <-->|はい| B\n");
  const m2 = parse(out);
  assert.equal(m2.edges[0].arrow.label, "はい");
  assert.equal(m2.edges[0].arrow.text, "<-->");
});

t("中置ラベル: 反転・削除で字面が保たれる", () => {
  const src = "flowchart TD\n  A -- はい --> B\n  B --> C\n";
  const rev = apply(src, M.reverseEdge(parse(src), src, 0));
  assert.equal(rev, "flowchart TD\n  B -- はい --> A\n  B --> C\n");
  const del = apply(src, M.deleteEdge(parse(src), src, 0));
  assert.equal(del, "flowchart TD\n  B --> C\n");
});

t("中置ラベル: チェインの途中でも読める", () => {
  const m = parse("flowchart TD\n  A -- x --> B -- y --> C\n");
  assert.equal(m.edges.length, 2);
  assert.equal(m.edges[1].from, "B");
  assert.equal(m.edges[1].arrow.label, "y");
});

// ---- スタジアム形 A([ラベル]) --------------------------------------------------

t("スタジアム形のノード定義を読める", () => {
  const src = "flowchart TD\n  A([開始])\n  A --> B\n";
  const m = parse(src);
  assert.equal(m.nodes.get("A").def.label, "開始");
  const out = apply(src, M.editNodeLabel(m, src, "A", "スタート"));
  assert.equal(out, "flowchart TD\n  A([スタート])\n  A --> B\n");
});

// ---- ```mermaid ブロックの特定（プレビュー ↔ エディタの対応付け） --------------

const DOC_LF = "# 見出し\n\n```mermaid\nflowchart TD\n  A --> B\n```\n\n本文\n";

t("findMermaidBlock: 素直な一致", () => {
  const src = "flowchart TD\n  A --> B\n";
  const b = M.findMermaidBlock(DOC_LF, src, 0);
  assert.ok(b);
  assert.equal(DOC_LF.slice(b.start + b.toRaw(0), b.start + b.toRaw(src.length)), src);
});

t("findMermaidBlock: CRLF のドキュメントでも対応が取れる", () => {
  const doc = DOC_LF.replace(/\n/g, "\r\n");
  const src = "flowchart TD\n  A --> B\n";
  const b = M.findMermaidBlock(doc, src, 0);
  assert.ok(b);
  // src 内の "A" の位置がドキュメント側の "A" を指すこと
  const i = src.indexOf("A --> B");
  assert.equal(doc.slice(b.start + b.toRaw(i), b.start + b.toRaw(i) + 7), "A --> B");
  assert.equal(b.indent, "");
});

t("findMermaidBlock: 先頭が空行の図（```mermaid の次が空行）", () => {
  // markdown-it の content は先頭の改行を含む。<pre> 経由で1つ落ちると
  // ここが一致しなくなり、GUI 編集が「図の位置を特定できません」で全滅する。
  const doc = "```mermaid\n\nflowchart TD\n  A --> B\n```\n";
  const src = "\nflowchart TD\n  A --> B\n";
  const b = M.findMermaidBlock(doc, src, 0);
  assert.ok(b);
  assert.equal(doc.slice(b.start, b.end), src);
  assert.equal(M.findMermaidBlock(doc, src.slice(1), 0), null);
});

t("findMermaidBlock: 字下げされたフェンス（リストの中の図）", () => {
  const doc = "- 項目\n\n    ```mermaid\n    flowchart TD\n      A --> B\n    ```\n";
  const src = "flowchart TD\n  A --> B\n";   // markdown-it は字下げを削って渡す
  const b = M.findMermaidBlock(doc, src, 0);
  assert.ok(b);
  assert.equal(b.indent, "    ");
  const i = src.indexOf("A --> B");
  assert.equal(doc.slice(b.start + b.toRaw(i), b.start + b.toRaw(i) + 7), "A --> B");
});

t("findMermaidBlock: 内容が違えば null（末尾一致の偶然で拾わない）", () => {
  assert.equal(M.findMermaidBlock(DOC_LF, "flowchart TD\n  A --> C\n", 0), null);
  assert.equal(M.findMermaidBlock(DOC_LF, "  A --> B\n", 0), null);
});

t("findMermaidBlock: 同じ内容の図が2枚あるときは index を優先", () => {
  const same = "flowchart TD\n  A --> B\n";
  const doc = "```mermaid\n" + same + "```\n\n```mermaid\n" + same + "```\n";
  const b0 = M.findMermaidBlock(doc, same, 0);
  const b1 = M.findMermaidBlock(doc, same, 1);
  assert.ok(b0.start < b1.start);
  assert.equal(doc.slice(b1.start, b1.end), same);
});

t("scanMermaidBlocks: ~~~ フェンス・長いフェンスも拾う", () => {
  const doc = "~~~mermaid\nflowchart TD\n~~~\n\n````mermaid\nflowchart LR\n````\n";
  const blocks = M.scanMermaidBlocks(doc);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].content, "flowchart TD\n");
  assert.equal(blocks[1].content, "flowchart LR\n");
});

// ---- 複数行ラベル（<br/>）------------------------------------------------------
// 3 行のラベルを直すのに `<br/>` を手打ちさせないための往復。入力欄では改行、
// ソースでは `<br/>` になる。

t("labelToInput / inputToLabel: <br/> と改行が往復する", () => {
  assert.equal(M.labelToInput("No<br/>③地図なし<br/>APIエラー"), "No\n③地図なし\nAPIエラー");
  assert.equal(M.labelToInput("a<br>b<BR />c"), "a\nb\nc");   // 表記ゆれも開く
  assert.equal(M.inputToLabel("No\n③地図なし\nAPIエラー"), "No<br/>③地図なし<br/>APIエラー");
  assert.equal(M.inputToLabel("a\r\nb"), "a<br/>b");          // CRLF も 1 個の <br/>
  assert.equal(M.inputToLabel(""), "");
  // #quot; のエスケープを二重にかけない
  assert.equal(M.labelToInput("a#quot;b"), 'a"b');
});

t("中置ラベル: <br/> 入りの矢印ラベルを編集できる（報告例）", () => {
  const src = "flowchart TD\n  G -- No<br/>③地図なし<br/>APIエラー --> H[Coverage不足]\n";
  const m = parse(src);
  assert.equal(m.supported, true);
  assert.equal(m.edges.length, 1);
  const shown = M.labelToInput(m.edges[0].arrow.label);
  assert.equal(shown, "No\n③地図なし\nAPIエラー");
  // 入力欄で 2 行に直して確定
  const edits = M.editEdgeLabel(m, src, 0, M.inputToLabel("はい\nOK"));
  assertNoOverlap(edits);
  assert.equal(apply(src, edits), "flowchart TD\n  G -- はい<br/>OK --> H[Coverage不足]\n");
});

t("複数行のノードラベル: <br/> のまま書き戻る", () => {
  const src = "flowchart TD\n  A[一行目] --> B[b]\n";
  const m = parse(src);
  const edits = M.editNodeLabel(m, src, "A", M.inputToLabel("一行目\n二行目"));
  assert.equal(apply(src, edits), "flowchart TD\n  A[一行目<br/>二行目] --> B[b]\n");
});

// ---- ノード形状の変更 ----------------------------------------------------------

t("setNodeShape: 長方形 → ひし形（報告例）", () => {
  const src = "flowchart TD\n  MOUTNG[TSR地図情報無効] --> G[判定]\n";
  const m = parse(src);
  const edits = M.setNodeShape(m, src, "MOUTNG", "{", "}");
  assertNoOverlap(edits);
  assert.equal(apply(src, edits), "flowchart TD\n  MOUTNG{TSR地図情報無効} --> G[判定]\n");
});

t("setNodeShape: 他の行からの参照・:::クラス・引用符を壊さない", () => {
  const src = 'flowchart TD\n  A["ラベル ]付き"]:::warn --> B[b]\n  B --> A\n  class A hot\n';
  const m = parse(src);
  const edits = M.setNodeShape(m, src, "A", "((", "))");
  const out = apply(src, edits);
  assert.ok(out.includes('A(("ラベル ]付き")):::warn'), out);
  assert.ok(out.includes("B --> A"), out);   // 裸の参照はそのまま
  assert.ok(out.includes("class A hot"), out);
});

t("setNodeShape: 閉じ記号と衝突するラベルは引用符で囲み直す", () => {
  const src = "flowchart TD\n  A[a/b] --> B[b]\n";
  const m = parse(src);
  // `[/ /]`（平行四辺形）の閉じ記号は `/]`。素のままだと A[/a/b/] が壊れる
  const out = apply(src, M.setNodeShape(m, src, "A", "[/", "/]"));
  assert.equal(out, 'flowchart TD\n  A[/"a/b"/] --> B[b]\n');
  assert.equal(parse(out).nodes.get("A").def.label, "a/b");
});

t("setNodeShape: 定義の無いノードは ID をラベルにして昇格する", () => {
  const src = "flowchart TD\n  A --> B[b]\n";
  const m = parse(src);
  const out = apply(src, M.setNodeShape(m, src, "A", "{", "}"));
  assert.equal(out, "flowchart TD\n  A{A} --> B[b]\n");
});

t("setNodeShape: 同じ形状なら編集なし / 未知のノードは空", () => {
  const src = "flowchart TD\n  A[a] --> B[b]\n";
  const m = parse(src);
  assert.deepEqual(M.setNodeShape(m, src, "A", "[", "]"), []);
  assert.deepEqual(M.setNodeShape(m, src, "ZZ", "{", "}"), []);
});

t("setNodeShape: 全形状を往復してもラベルが保たれる", () => {
  const shapes = [["[", "]"], ["(", ")"], ["([", "])"], ["[[", "]]"], ["[(", ")]"],
    ["((", "))"], ["{", "}"], ["{{", "}}"], ["[/", "/]"], ["[\\", "\\]"], [">", "]"]];
  for (const [open, close] of shapes) {
    const src = "flowchart TD\n  A[元のラベル] --> B[b]\n";
    const m = parse(src);
    const out = apply(src, M.setNodeShape(m, src, "A", open, close));
    const back = parse(out);
    assert.equal(back.supported, true, `${open}${close}: ${out}`);
    assert.equal(back.nodes.get("A").def.label, "元のラベル", out);
    assert.deepEqual(back.nodes.get("A").def.shape, [open, close], out);
  }
});

// ---- ソース位置の特定（クリック → エディタで反転表示）--------------------------

t("statementSpanAt: 選択した要素を含む文の範囲を返す", () => {
  const src = "flowchart TD\n  A[a] --> B[b]\n  B --> C[c]\n";
  const m = parse(src);
  const edgeStmt = m.statements[m.edges[1].stmtIdx];
  assert.equal(src.slice(edgeStmt.start, edgeStmt.end), "  B --> C[c]");
  const nodeA = m.nodes.get("A");
  const span = M.statementSpanAt(m, nodeA.def.span.start);
  assert.equal(src.slice(span.start, span.end), "  A[a] --> B[b]");
  assert.equal(M.statementSpanAt(m, src.length + 10), null);
});

console.log(`\n${pass} passed`);
