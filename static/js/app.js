// CodeWithPixie フロント（統合シェル）。左=Monaco エディタ / 右=ファイルツリー + チャット。
// Code モード: エージェント(AWP エンジン)が SSE で token/status/approval/files_changed を流す。
//   破壊操作は approval イベントで承認バーを出し、POST /api/approve で解放する。
// Note モード: read 専用エージェント。応答の search/replace 提案を extractEdits で拾い、
//   POST /api/patch → Monaco DiffEditor プレビュー → 人間のクリックで反映する（NWP 移植）。
// Plan モード: read 専用エージェントに実行計画だけを立てさせる。```plan フェンスを左ペインの
//   計画ビューに出し、承認したら Code モードへ切り替えてその計画を最初の指示として送る。
// モードは GET /api/mode（ワークスペース随伴の last_mode）。body.mode-note / mode-code /
//   mode-plan で出し分け。
import { ApiError, getJSON, jsonFetch, postJSON, tryJSON } from "./api.js";
import {
  available as mdAvailable, pngBackground, renderInto, renderPlain, setAssetBase,
  setDiagramEditor, setDiagramSaver, setOnDiagramRendered,
} from "./markdown.js";
import { blobToBase64, sanitizeName, svgToPngBlob } from "./mermaid-export.js";
import { available as cfAvailable, htmlToMarkdown } from "./confluence.js";
import * as mermaidEdit from "./mermaid-edit.js";
import * as mdflow from "./mdflow.js";
import { $ } from "./dom.js";
import { addDeleteButton, addMessage, addToolStatus, scrollMessages } from "./chat-log.js";
import { splitThink, scanEditBlocks, extractEdits, extractProposed } from "./edit-blocks.js";

function newSessionId() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    ("s-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
}

const state = {
  editor: null,
  monaco: null,
  currentFile: null,
  dirty: false,
  savedVersionId: null,     // 保存時点の model.getAlternativeVersionId()。ダーティ判定の基準
  saving: false,
  savePromise: null,        // 進行中の保存。切替前の待ち合わせに使う
  saveError: null,          // 直近の保存失敗（ApiError）。成功でクリア
  fsEntries: [],            // /api/files の結果 [{path, type, size?, text?}]
  collapsedDirs: new Set(), // 折りたたみ中のフォルダ
  knownDirs: new Set(),     // 既出のフォルダ。初出だけを閉じる（開いた状態の記憶を壊さない）
  changedPaths: new Set(),  // 直近ターンでエージェントが変更したファイル
  streaming: false,
  abort: null,
  assistantEl: null,        // 進行中ターンのアシスタント吹き出し
  assistantUi: null,        // beginAssistantStream のハンドル
  turnId: 0,                // 進行中ターンのサーバ側 ID（turn イベント。0 = 文脈編集不可）
  compacted: null,          // /compact の結果（compacted イベント）。ターン確定時に畳む
  sessionId: newSessionId(),  // このタブ/会話のセッション。並行セッションはサーバ側で分離される。

  // --- モード（統合シェル）---
  mode: "code",             // "code" | "note" | "plan"。GET /api/mode で起動時に取得
  features: {},             // /api/mode の features フラグ（UI 出し分けの判定に使う）
  copilotEnabled: false,    // Copilot 連携（features.copilot / /api/copilot で同期）

  // --- Code モードの進め方（サブモード）---
  // "plan": まず実行計画を出させて承認してから実装（plan_first でサーバへ）
  // "normal": 従来どおり自律実装（破壊操作は承認制）
  codeStyle: localStorage.getItem("pixie.codeStyle") === "plan" ? "plan" : "normal",
  planExecNext: false,      // 一回限り: 次の送信は計画承認後の「実行フェーズ」（計画し直さない）

  // --- Plan モード専用 ---
  planText: "",             // 直近の実行計画（承認時に Code モードへ渡す本文）。
                            // ファイルには書かない: 承認して実行したら役目が終わるものなので、
                            // ワークスペースに計画ファイルの残骸を増やさない。

  // --- Note モード専用（NWP 移植）---
  history: [],              // chat history [{role, content}]（Note のみ。サーバ側サイドカーと同期）
  historyLoaded: false,     // 履歴を読めたか。読めていないのに保存すると履歴を消してしまう
  notes: [],                // 付箋 [{line, text}]
  noteDecorations: null,    // Monaco decorations collection（付箋グリフ）
  checkedFiles: new Set(),  // AI コンテキストに含めるファイル（再描画をまたいで保持）
  refs: [],                 // 現在ノートの関連ファイル [{path, external, name}]
  checkedRefs: new Set(),   // AI コンテキストに含める関連ファイル（refKey で識別）
  pendingTarget: null,      // 反映先として追跡中の選択範囲（1つだけ）
  mdflowConditions: new Map(),  // 図ID → 条件JSON文字列。プレビュー再構築で input が
                                // 作り直されるため、入力値はここが正（ファイル切替でクリア）
  diagramEditing: null,         // 直接編集中の mermaid 図 {src, focusNodeId}（再入場のキー）
};

const isNote = () => state.mode === "note";
const isPlan = () => state.mode === "plan";
const isCode = () => state.mode === "code";

// 拡張子 → Monaco 言語 ID
const LANG = {
  py: "python", pyi: "python", js: "javascript", jsx: "javascript", mjs: "javascript",
  cjs: "javascript", ts: "typescript", tsx: "typescript", json: "json", jsonc: "json",
  html: "html", htm: "html", css: "css", scss: "scss", less: "less", md: "markdown",
  markdown: "markdown", yaml: "yaml", yml: "yaml", toml: "ini", ini: "ini", cfg: "ini",
  xml: "xml", sh: "shell", bash: "shell", ps1: "powershell", bat: "bat", cmd: "bat",
  sql: "sql", c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp", cs: "csharp",
  java: "java", kt: "kotlin", go: "go", rs: "rust", rb: "ruby", php: "php",
  swift: "swift", scala: "scala", vue: "html", svelte: "html",
};
const extOf = (path) => (path.split(".").pop() || "").toLowerCase();
const langFor = (path) => LANG[extOf(path)] || "plaintext";
const isMarkdown = (path) => !!path && ["md", "markdown"].includes(extOf(path));

// エディタでは開けないファイル（画像・PDF 等）のアイコン
const FILE_ICONS = { png: "🖼", jpg: "🖼", jpeg: "🖼", gif: "🖼", svg: "🖼", webp: "🖼", ico: "🖼",
                     pdf: "📕", pptx: "📊", docx: "📝", xlsx: "📈", zip: "🗜", exe: "⚙" };
const fileIcon = (path) => FILE_ICONS[extOf(path)] || "📎";

/** サーバがテキスト抽出できる拡張子（pptx/docx 等）。/api/mode の features.extract_exts で
    上書きされる。ハードコードのフォールバックを持つのは、取得が失敗してもチェックボックスの
    説明が嘘にならないようにするため。 */
let extractExts = new Set([".pptx", ".docx", ".xlsx", ".pdf"]);
const isExtractPath = (path) => extractExts.has("." + extOf(path));

// ---- 初期化 ----
window.__monacoReady.then((monaco) => {
  state.monaco = monaco;
  state.editor = monaco.editor.create($("editor"), {
    value: "",
    language: "plaintext",
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    glyphMargin: false,  // Note モードでは applyModeUI が true に切り替える（付箋グリフ用）
  });
  state.noteDecorations = state.editor.createDecorationsCollection();
  markClean();

  state.editor.onDidChangeModelContent(() => { refreshDirty(); scheduleAutosave(); schedulePreview(); });
  state.editor.onDidScrollChange(() => syncPreviewScroll());
  state.editor.onDidChangeCursorSelection(updateSelectionChip);
  // エディタ内は Monaco がキーを握るので addCommand が要る（エディタ外は window 側で拾う）。
  state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveFile());
  state.editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => togglePreview());
  // グリフ（付箋）クリックで編集（Note モードのみ。Code モードは glyphMargin 自体が無い）
  state.editor.onMouseDown((e) => {
    if (isNote() && e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
      editNoteAt(e.target.position.lineNumber);
    }
  });

  // 画像の貼り付け（Ctrl+V）とドロップ（Note モードのみ）。capture で Monaco 内部の
  // リスナより先に拾い、画像のときだけ横取りする（テキストは従来どおり Monaco に任せる）。
  const editorNode = state.editor.getContainerDomNode();
  editorNode.addEventListener("paste", (e) => {
    if (!isNote()) return;
    const file = imageFileFrom(e.clipboardData);
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    insertImage(file);
  }, true);
  editorNode.addEventListener("dragover", (e) => {
    if (!isNote()) return;
    // OS からのファイルドラッグ中は files がまだ読めないので types で判定する。
    if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  editorNode.addEventListener("drop", (e) => {
    if (!isNote()) return;
    if (!e.dataTransfer?.files?.length) return;  // アプリ内のテキスト D&D は Monaco へ
    // OS からのファイルドロップはここで必ず止める。素通しするとブラウザが
    // そのファイルへページ遷移してしまい、編集中の内容を失う。
    e.preventDefault();
    e.stopPropagation();
    const file = imageFileFrom(e.dataTransfer);
    if (!file) { alert("⚠️ 貼り付けられるのは画像ファイルだけです。"); return; }
    insertImage(file);
  }, true);

  init();
});

async function init() {
  // 図の書き出しはレンダラ（markdown.js）から呼ばれるが、保存先とファイル一覧の更新は
  // アプリ側の都合なので実装をここで注入する。**最初の描画より前**に登録すること —
  // loadHistory() が復元するチャットにも図は含まれ、toBox はバーを組むときに
  // 登録済みかどうかを見る（未登録なら保存ボタンを出さない）。
  setDiagramSaver(saveDiagramPng);
  // mermaid 図の直接編集（✏️ 編集ボタン → 編集モード。ソース変化→再描画で再入場）
  setDiagramEditor(openDiagramEditor);
  setOnDiagramRendered(onDiagramRendered);
  await loadMode();
  applyModeUI();
  await loadStatus();
  await loadFileList();
  if (isNote()) await loadHistory();
  bindUI();
}

// ---- モード（統合シェル: 📝 Note / 🛠 Code） ---------------------------------
async function loadMode() {
  try {
    setModeState(await getJSON("/api/mode"));
  } catch {
    setModeState({ mode: "code", features: {} });  // 取得失敗は Code に倒す（既存機能側）
  }
}

const MODES = ["code", "plan", "note"];  // モードバッジのクリックで循環する順
const MODE_LABEL = { code: "🛠 Code", plan: "📋 Plan", note: "📝 Note" };

function setModeState(m) {
  state.mode = MODES.includes(m.mode) ? m.mode : "code";  // 未知の値は Code に倒す
  state.features = m.features || {};
  if (Array.isArray(state.features.extract_exts)) {
    extractExts = new Set(state.features.extract_exts);
  }
  state.copilotEnabled = !!state.features.copilot;  // Copilot UI の出し分けに使う
}

/** モードに応じた見た目の唯一の反映点。body クラス・バッジ・エディタオプションを揃える。 */
function applyModeUI() {
  const note = isNote();
  const btn = $("mode-btn");
  for (const m of MODES) {
    document.body.classList.toggle("mode-" + m, state.mode === m);
    btn.classList.toggle("mode-" + m, state.mode === m);
  }
  btn.textContent = MODE_LABEL[state.mode];
  btn.title = `現在: ${MODE_LABEL[state.mode]} モード（クリックで次のモードへ切替）`;
  if (!isPlan()) closePlanView();  // 計画ビューは Plan モードの持ち物
  state.editor?.updateOptions({ glyphMargin: note });  // 付箋グリフの余白
  updateSelectionChip();  // #sel-info の文言と選択チップ（両モード共通）
  applyCopilotVisibility();  // Copilot バー・placeholder の /copilot 案内はトグル次第
  updateCodeStyleBtn();  // Code モードの進め方（📋計画を先に/⚡通常）ボタン
  renderFileTree();  // コンテキストのチェックボックス有無が変わる
}

/** Code モードの進め方トグル（plan-first / normal）。.code-only なので Code モードでのみ見える。 */
function updateCodeStyleBtn() {
  const btn = $("code-style-btn");
  const planFirst = state.codeStyle === "plan";
  btn.textContent = planFirst ? "📋 計画を先に" : "⚡ 通常";
  btn.title = planFirst
    ? "Code モードの進め方: 📋 計画を先に — まず実行計画を提示し、承認してから実装する（クリックで「⚡ 通常」へ切替）"
    : "Code モードの進め方: ⚡ 通常 — エージェントが自律的に実装（破壊操作は承認制）。クリックで「📋 計画を先に」へ切替";
}

function toggleCodeStyle() {
  state.codeStyle = state.codeStyle === "plan" ? "normal" : "plan";
  localStorage.setItem("pixie.codeStyle", state.codeStyle);
  updateCodeStyleBtn();
  addMessage("system", state.codeStyle === "plan"
    ? "📋 計画を先に: エージェントはまず実行計画を提示し、承認してから実装します。"
    : "⚡ 通常: エージェントが自律的に実装します（破壊操作は従来どおり承認制）。");
}

// Copilot 関連 UI の出し分け（NWP と同じ規則）。バーは .note-only だけでは足りない:
// Copilot 連携がオフなら Note モードでも出さない（押しても必ずエラーになるボタンを出さない）。
function applyCopilotVisibility() {
  const on = !!state.copilotEnabled;
  const bar = $("copilot-bar");
  if (bar) bar.classList.toggle("hidden", !on);
  const ctl = $("settings-copilot-controls");
  if (ctl) ctl.classList.toggle("hidden", !on);
  // placeholder もここで決める。/copilot は Copilot 連携がオンのときだけ通る経路なので、
  // オフのまま案内すると「書いてもエラーになる使い方」を教えることになる。
  // モードとトグルの両方で文言が変わるため、applyModeUI からもここを通す。
  const hint = on
    ? "\n（先頭に /copilot と書くと、これまでの調査をまとめて Copilot に質問し、回答を反映します。"
      + "/copilot! なら組み立てずにそのまま直接質問）"
    : "";
  const PLACEHOLDER = {
    note: "例）左の選択部分を、チェックした資料を参考にもう少し技術的な表現に。",
    plan: "例）設定画面にダークモードの切替を足したい。まず調べて実行計画を立てて。",
    code: "例）src/foo.py に入力値を検証する関数を追加して。テストも書いて実行して確認して。",
  };
  $("chat-input").placeholder = PLACEHOLDER[state.mode] + hint + "\n（/help でコマンド一覧）";
}

/** Note モード固有の一時状態を捨てる（モード切替・ワークスペース切替時）。 */
function clearNoteState() {
  state.notes = [];
  state.noteDecorations?.clear();
  state.refs = [];
  state.checkedRefs.clear();
  state.checkedFiles.clear();
  if (state.pendingTarget?.coll) state.pendingTarget.coll.clear();
  state.pendingTarget = null;
  state.mdflowConditions.clear();
  state.history = [];
  state.historyLoaded = false;
  $("sel-chip").classList.add("hidden");
  closeDiffPreview();
  renderRefList();
}

/** モードバッジのクリック: Code → Plan → Note → Code と循環する。
    3モードになったのでトグルでは足りない。メニューを出すより、常時表示のバッジを
    押すたびに次へ進む方が「今どのモードか」を見失わずに済む。 */
async function cycleMode() {
  const next = MODES[(MODES.indexOf(state.mode) + 1) % MODES.length];
  await switchMode(next, { confirm: true });
}

/**
 * モードを切り替える（サーバ側のセッションもリセットされる）。
 * opts.confirm: 確認ダイアログを出す（承認フローからの自動切替では出さない）。
 * opts.keepMessages: チャットログを残す（計画承認 → Code の流れは会話の続きとして見せたい）。
 * 戻り値: 切り替えられたか。
 */
async function switchMode(next, opts = {}) {
  if (state.streaming) { alert("⚠️ 実行中はモードを切り替えられません。中断してから切り替えてください。"); return false; }
  if (next === state.mode) return true;
  if (opts.confirm &&
      !confirm(`${MODE_LABEL[next]} モードに切り替えますか？\n（会話セッションはリセットされます）`)) return false;
  // 自動保存は Note でしか動かない。Note から抜けると予約が宙に浮くので、
  // まだ Note のうちに確定させる（タイマーもここで落ちる）。
  await flushAutosave();
  let m;
  try {
    m = await postJSON("/api/mode", { mode: next });
  } catch (e) {
    alert("⚠️ モードを切り替えられません: " + e.message);
    return false;
  }
  setModeState(m);
  // 旧モードの会話表示・承認バーを持ち越さない（サーバ側もセッションリセット済み）。
  // 計画の承認から Code へ移るときだけはログを残す（何を承認した流れなのかが読めるように）。
  if (!opts.keepMessages) $("messages").innerHTML = "";
  $("approval").classList.add("hidden");
  $("approval").innerHTML = "";
  state.assistantEl = null;
  state.sessionId = newSessionId();
  updateSessionInfo();
  clearNoteState();
  applyModeUI();
  await loadFileList();
  if (isNote()) {
    await loadHistory();  // Note の履歴はワークスペースのサイドカーから復元
    if (state.currentFile) { await loadNotes(); await loadRefs(); }
    addMessage("system", "📝 Note モードに切り替えました（読み取り専用エージェント・クリック反映）。");
  } else if (isPlan()) {
    addMessage("system", "📋 Plan モードに切り替えました"
      + "（調べて実行計画を立てるだけ。承認するまでファイルは変更されません）。");
  } else {
    addMessage("system", "🛠 Code モードに切り替えました（自律エージェント・破壊操作は承認制）。");
  }
  return true;
}

// ---- 会話履歴の永続化（Note モードのみ） -------------------------------------
// 履歴はワークスペース直下の .pixie_chat.json（サーバ側サイドカー）に置く。
// localStorage ではなくサーバに置くのは、付箋・関連ファイルと同じく
// 「ワークスペースを切り替えたら履歴も切り替わる」を自然に成立させるため。
// Code モードはセッション制（エンジン内文脈が正）なのでこの経路は使わない。

/** サーバの履歴を state に読み込み、チャット欄に再描画する。 */
async function loadHistory() {
  state.history = [];
  state.historyLoaded = false;
  $("messages").innerHTML = "";
  let r;
  try {
    r = await getJSON("/api/chat/history");
  } catch (e) {
    // 読めなくてもチャット自体は使える。ただし「空の履歴」として保存してしまうと
    // サーバに残っている本物の履歴を上書きして消すので、保存は止める。
    addToolStatus(addMessage("assistant", ""), `⚠️ 履歴を読み込めませんでした（${e.message}）。`
      + "この保存先の履歴は、取り違えを防ぐため今回は保存しません。");
    return;
  }
  let lastUserEl = null, lastUserText = "";
  for (const m of r.messages || []) {
    state.history.push({ role: m.role, content: m.content });
    // 履歴の中の ![](images/...) は現在のノートディレクトリ基準で解決する
    const el = addMessage(m.role, m.content, { assetBase: currentDir() });
    if (m.role === "user") { lastUserEl = el; lastUserText = m.content; continue; }
    // 復元した履歴にも 🗑 を付ける。turn ID は無い（この往復を積んだセッションはもう
    // 無い）ので 0 を渡す — deleteExchange が Note 用の経路（履歴から消して再シード）へ落ちる。
    el._exchange = { userEl: lastUserEl, userText: lastUserText };
    addDeleteButton(el, () => deleteExchange(el, 0));
    lastUserEl = null; lastUserText = "";
  }
  state.historyLoaded = true;
}

/** state.history をサーバへ保存する。トリミングはサーバ側で行う。 */
async function saveHistory() {
  if (!state.historyLoaded) return;  // 読めていない履歴を上書きしない（loadHistory 参照）
  try {
    const r = await postJSON("/api/chat/history", { messages: state.history });
    // サーバが 100 件に切り詰めた結果を採り込む。捨てると state.history だけが
    // 際限なく伸び、毎回の /api/chat に巨大な配列を送り続けることになる。
    if (Array.isArray(r.messages)) state.history = r.messages;
  } catch { /* 保存できなくても進行中の会話は壊さない */ }
}

async function clearHistory() {
  // 生成中に消すと、終了時に state.history へ push された1往復だけが復活する
  if (state.streaming) { alert("⚠️ 応答の生成中は履歴を消去できません。"); return; }
  if (!confirm("この保存先の会話履歴を消去しますか？")) return;
  try {
    await jsonFetch("/api/chat/history", { method: "DELETE" });
  } catch (e) {
    alert("⚠️ 履歴を消去できません: " + e.message);
    return;
  }
  state.history = [];
  state.historyLoaded = true;  // 消去できた＝サーバの状態は分かっている
  $("messages").innerHTML = "";
}

// ---- ステータス / モデル ----
async function loadStatus() {
  try {
    const s = await getJSON("/api/status");
    $("model-name").textContent = s.ready ? (s.model || "(unset)") : "起動失敗";
    if (!s.ready) {
      $("agent-status").textContent = "  ⚠ " + (s.error || "engine not ready");
      return;
    }
    $("agent-status").textContent = `  ・${s.tools} tools`;
    renderRootPath(s.workspace);
  } catch {
    $("model-name").textContent = "接続不可";
  }
}

function renderRootPath(root) {
  if (!root) return;
  const el = $("root-path");
  el.textContent = root;
  el.title = root;
  const base = root.split(/[\\/]/).filter(Boolean).pop() || root;
  $("root-project-name").textContent = base || "(未設定)";
  $("root-project-btn").title = "ルートプロジェクト: " + root + "（クリックで変更）";
}

// ---- ファイルツリー ----
async function loadFileList() {
  const r = await tryJSON("/api/files");
  if (!r) return;
  state.fsEntries = r.files;
  renderRootPath(r.root);
  // フォルダは既定で閉じた状態にする（深い階層が全部開いていると目的のファイルが埋もれる）。
  // 「初めて見るフォルダだけ」閉じるので、ユーザーが開いたフォルダは再読込でも開いたまま。
  for (const f of r.files) {
    if (f.type !== "dir" || state.knownDirs.has(f.path)) continue;
    state.knownDirs.add(f.path);
    state.collapsedDirs.add(f.path);
  }
  // 消えたファイルはコンテキストのチェック集合からも掃除する（Note モード）
  const alive = new Set(r.files.filter((f) => f.type === "file").map((f) => f.path));
  for (const p of [...state.checkedFiles]) if (!alive.has(p)) state.checkedFiles.delete(p);
  renderFileTree();
}

// 祖先フォルダのどれかが折りたたまれていたら非表示
function isHiddenByCollapse(parentPath) {
  if (!parentPath) return false;
  let cur = "";
  for (const part of parentPath.split("/")) {
    cur = cur ? cur + "/" + part : part;
    if (state.collapsedDirs.has(cur)) return true;
  }
  return false;
}

/** 指定パスの祖先フォルダを開く（閉じた木の中に開いたファイルが埋もれないように）。 */
function revealInTree(path) {
  const parts = String(path || "").split("/");
  let cur = "";
  for (const part of parts.slice(0, -1)) {
    cur = cur ? cur + "/" + part : part;
    state.collapsedDirs.delete(cur);
  }
}

function renderFileTree() {
  const ul = $("file-list");
  ul.innerHTML = "";
  for (const f of state.fsEntries) {
    const parts = f.path.split("/");
    if (isHiddenByCollapse(parts.slice(0, -1).join("/"))) continue;

    const li = document.createElement("li");
    li.dataset.path = f.path;
    li.dataset.type = f.type;
    li.style.paddingLeft = 8 + (parts.length - 1) * 16 + "px";
    setupDragDrop(li, f);

    const icon = document.createElement("span");
    const name = document.createElement("span");
    name.className = "fname";
    name.textContent = parts[parts.length - 1];

    if (f.type === "dir") {
      li.classList.add("dir");
      icon.textContent = state.collapsedDirs.has(f.path) ? "📁" : "📂";
      li.append(icon, name);
      li.addEventListener("click", () => {
        if (state.collapsedDirs.has(f.path)) state.collapsedDirs.delete(f.path);
        else state.collapsedDirs.add(f.path);
        renderFileTree();
      });
    } else {
      // Note モード: text と extract はチェックで AI 文脈に入れられる（extract はサーバで
      // Markdown 化）。画像などはテキスト化の手段が無いのでダミーで位置だけ揃える。
      if (isNote()) {
        if (f.text || isExtractPath(f.path)) {
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.title = f.text
            ? "チャットのコンテキストに含める"
            : "チャットのコンテキストに含める（テキスト抽出して同梱）";
          cb.checked = state.checkedFiles.has(f.path);
          cb.addEventListener("click", (ev) => ev.stopPropagation());
          cb.addEventListener("change", () => {
            if (cb.checked) state.checkedFiles.add(f.path);
            else state.checkedFiles.delete(f.path);
          });
          li.appendChild(cb);
        } else {
          const pad = document.createElement("span");
          pad.className = "cb-pad";  // チェックボックス分の位置を揃えるダミー
          li.appendChild(pad);
        }
      }
      // エディタは テキスト/コード 専用。それ以外（画像・PDF 等）は OS の既定アプリに任せる。
      icon.textContent = f.text ? "📄" : fileIcon(f.path);
      name.title = f.text ? f.path : `${f.path}（クリックで既定アプリで開く）`;
      li.append(icon, name);
      li.classList.toggle("active", f.path === state.currentFile);
      if (state.changedPaths.has(f.path)) {
        li.classList.add("changed");
        const badge = document.createElement("span");
        badge.className = "changed-badge";
        badge.textContent = "● 変更";
        li.appendChild(badge);
      }
      li.addEventListener("click", () => (f.text ? openFile(f.path) : openWithOS(f.path)));
    }
    li.addEventListener("contextmenu", (e) => { e.preventDefault(); openFsMenu(e, f); });
    ul.appendChild(li);
  }
}

// ドラッグ&ドロップ: ファイル/フォルダをフォルダへ移動。ルート（一覧の余白）へ落とすと最上位へ。
let _dragging = null;  // dragover 中は getData が空になるブラウザがあるため保持しておく

function setupDragDrop(li, entry) {
  li.draggable = true;
  li.addEventListener("dragstart", (e) => {
    _dragging = entry.path;
    e.dataTransfer.setData("text/plain", entry.path);
    e.dataTransfer.effectAllowed = "move";
    li.classList.add("dragging");
  });
  li.addEventListener("dragend", () => {
    _dragging = null;
    li.classList.remove("dragging");
    document.querySelectorAll("#file-list li.drop-target").forEach((x) => x.classList.remove("drop-target"));
  });

  if (entry.type !== "dir") return;  // ドロップ先はフォルダのみ（ルートは ul が受ける）
  li.addEventListener("dragover", (e) => {
    const src = _dragging;
    if (src === null || src === entry.path) return;
    if (entry.path.startsWith(src + "/")) return;  // 自分の子孫の中へは不可
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    li.classList.add("drop-target");
  });
  li.addEventListener("dragleave", () => li.classList.remove("drop-target"));
  li.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    li.classList.remove("drop-target");
    const src = e.dataTransfer.getData("text/plain") || _dragging;
    if (src && src !== entry.path) moveIntoDir(src, entry.path);
  });
}

// 一覧の余白（ul）へのドロップ = 最上位フォルダへ移動。一度だけ結線する。
function setupRootDrop() {
  const ul = $("file-list");
  ul.addEventListener("dragover", (e) => {
    if (_dragging === null) return;
    if (e.target.closest("li")) return;  // li 上は各 li のハンドラに任せる
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    ul.classList.add("drop-root");
  });
  ul.addEventListener("dragleave", (e) => {
    if (!ul.contains(e.relatedTarget)) ul.classList.remove("drop-root");
  });
  ul.addEventListener("drop", (e) => {
    ul.classList.remove("drop-root");
    if (e.target.closest("li")) return;
    e.preventDefault();
    const src = e.dataTransfer.getData("text/plain") || _dragging;
    if (src) moveIntoDir(src, "");  // ルートへ
  });
}

// --- 右クリックメニュー ---
function closeFsMenu() { $("fs-menu")?.remove(); }

function openFsMenu(e, entry) {
  closeFsMenu();
  const menu = document.createElement("div");
  menu.id = "fs-menu";
  const add = (label, fn) => {
    const it = document.createElement("div");
    it.className = "fs-menu-item";
    it.textContent = label;
    it.addEventListener("click", () => { closeFsMenu(); fn(); });
    menu.appendChild(it);
  };
  if (entry.type === "dir") {
    add("📄 中に新規ファイル", () => createEntry("file", entry.path + "/"));
    add("📁 中に新規フォルダ", () => createEntry("dir", entry.path + "/"));
  } else if (!entry.text) {
    add("↗ 既定のアプリで開く", () => openWithOS(entry.path));
  }
  add("✏️ 名前変更・移動", () => renameEntry(entry));
  add("🗑️ 削除", () => deleteEntry(entry));
  menu.style.left = e.pageX + "px";
  menu.style.top = e.pageY + "px";
  document.body.appendChild(menu);
}

// --- ファイル操作 ---
async function fsPost(url, body) {
  try {
    await postJSON(url, body);
    return true;
  } catch (err) {
    alert("⚠️ " + err.message);
    return false;
  }
}

async function createEntry(kind, prefix = "") {
  const label = kind === "dir" ? "新規フォルダ名（例: src/utils）" : "新規ファイル名（例: src/main.py）";
  const name = prompt(label, prefix);
  if (!name || !name.trim() || name.trim() === prefix.trim()) return;
  const path = name.trim().replace(/\\/g, "/");
  if (!(await fsPost("/api/fs/create", { path, kind }))) return;
  if (kind === "dir") state.collapsedDirs.delete(path);
  await loadFileList();
  if (kind === "file") await openFile(path);
}

async function renameEntry(entry) {
  const dst = prompt("新しいパス（フォルダに入れるには src/名前.py のように）", entry.path);
  if (!dst || !dst.trim() || dst.trim() === entry.path) return;
  await moveEntry(entry, dst.trim().replace(/\\/g, "/"));
}

// entry を新パス dst へ移動/改名し、開いているファイルを追従させる。
// rename と drag&drop の共通処理。
async function moveEntry(entry, dst) {
  if (!dst || dst === entry.path) return;
  if (entry.type === "dir" && (dst === entry.path || dst.startsWith(entry.path + "/"))) {
    alert("⚠️ フォルダを自分自身の中へは移動できません。");
    return;
  }
  if (!(await fsPost("/api/fs/rename", { src: entry.path, dst }))) return;
  const remap = (p) => {
    if (p === entry.path) return dst;
    if (entry.type === "dir" && p.startsWith(entry.path + "/")) return dst + p.slice(entry.path.length);
    return p;
  };
  if (state.currentFile) {
    const np = remap(state.currentFile);
    if (np !== state.currentFile) { state.currentFile = np; $("current-file").textContent = np; }
  }
  state.checkedFiles = new Set([...state.checkedFiles].map(remap));  // Note のチェックを追従
  await loadFileList();
}

// ドロップ先フォルダ（空文字＝ルート）へ entry を移動する。
async function moveIntoDir(srcPath, dstDir) {
  const entry = state.fsEntries.find((f) => f.path === srcPath);
  if (!entry) return;
  const base = srcPath.split("/").pop();
  const dst = dstDir ? dstDir + "/" + base : base;
  if (dst === srcPath) return;                                       // 既に同じ場所
  if (srcPath.split("/").slice(0, -1).join("/") === dstDir) return;  // 親が変わらない
  await moveEntry(entry, dst);
}

async function deleteEntry(entry) {
  if (!confirm(`「${entry.path}」を削除しますか？`)) return;
  if (!(await fsPost("/api/fs/delete", { path: entry.path }))) return;
  state.checkedFiles.delete(entry.path);
  if (state.currentFile === entry.path) {
    state.currentFile = null;
    state.editor.setValue("");
    markClean();
    renderSaveState();
    $("current-file").textContent = "（ファイル未選択）";
    updatePreviewAvailability();
    if (isNote()) { await loadNotes(); await loadRefs(); }  // 前ファイルの付箋・参照を消す
  }
  await loadFileList();
}

/** ワークスペース内のファイルを OS の既定アプリで開く（画像や PDF はエディタでは開けない）。 */
async function openWithOS(path) {
  try {
    await postJSON("/api/fs/open", { path });
  } catch (e) {
    alert("⚠️ 開けませんでした: " + e.message);
  }
}

async function openFile(path, force) {
  // force はエージェント変更の再読込など「捨てると決めた」経路なので flush しない。
  if (!force) await flushAutosave();
  // Note モードで flush してもまだ dirty なら、それは保存に失敗している。
  if (state.dirty && !force && path !== state.currentFile) {
    if (!confirm("未保存の変更があります。破棄して開きますか？")) return;
  }
  const r = await tryJSON("/api/file?path=" + encodeURIComponent(path));
  if (!r) return;  // 読めなかったら現在の内容を壊さずに留まる
  state.currentFile = path;
  state.mdflowConditions.clear();  // 条件JSONは図IDに紐づくのでノートをまたがない
  state.monaco.editor.setModelLanguage(state.editor.getModel(), langFor(path));
  state.editor.setValue(r.content);
  state.saveError = null;
  markClean();
  renderSaveState();
  $("current-file").textContent = path;
  updatePreviewAvailability();
  renderPreview();  // setValue でも更新はされるが、150ms 待たずに新ファイルを映す
  revealInTree(path);  // 既定は閉じた木なので、開いたファイルの祖先だけ開いて見せる
  renderFileTree();
  if (isNote()) { await loadNotes(); await loadRefs(); }  // 付箋・関連ファイルはノートに随伴
}

// ---- 保存 ----
// ダーティ判定は Monaco の alternativeVersionId を基準にする。単なる「編集された」
// フラグだと Undo で内容を戻しても未保存のままになるが、この ID は Undo/Redo で
// 元の値に戻るので「保存時と同じ内容か」を正しく表せる。
// 自動保存は Note モードのみ（理由は scheduleAutosave のコメント）。
let saveStateTimer = null;

function markClean() {
  state.savedVersionId = state.editor.getModel().getAlternativeVersionId();
  state.dirty = false;
}

function refreshDirty() {
  if (!state.currentFile) return;
  state.dirty = state.editor.getModel().getAlternativeVersionId() !== state.savedVersionId;
  renderSaveState();
}

/** 保存インジケータの唯一の描画点。state から表示を決める。 */
function renderSaveState(transient) {
  const el = $("save-state");
  clearTimeout(saveStateTimer);
  el.classList.remove("save-error");
  el.title = "";

  if (transient === "saving") { el.textContent = "保存中…"; return; }
  if (transient === "saved") {
    el.textContent = "保存済";
    saveStateTimer = setTimeout(renderSaveState, 1500);  // 1.5秒で状態表示へ戻す
    return;
  }
  if (state.saveError) {
    el.textContent = "⚠️ 保存失敗";
    el.classList.add("save-error");
    el.title = state.saveError.message;
    return;
  }
  el.textContent = state.dirty ? "● 未保存" : "";
}

async function saveFile() {
  // 進行中の保存があれば、その完了を待ってから判断する。
  while (state.savePromise) await state.savePromise;
  if (!state.currentFile) return false;
  state.savePromise = doSave();
  try {
    return await state.savePromise;
  } finally {
    state.savePromise = null;
  }
}

/** 実際の保存。await をまたぐ値は全てここで固定してから使う。 */
async function doSave() {
  // path・内容は await の前に確定させる。await 後に state を読み直すと、その間に
  // ファイルが切り替わっていた場合、A の内容を B のキーで保存してしまう。
  const path = state.currentFile;
  const content = state.editor.getValue();
  const versionAtSave = state.editor.getModel().getAlternativeVersionId();
  const isNew = !state.fsEntries.some((f) => f.path === path);
  // 付箋は本文と一緒にスナップショットして保存する（Note モードのみ）
  const noteMode = isNote();
  let notesAtSave = null;
  if (noteMode) {
    syncNotesFromDecorations();
    notesAtSave = state.notes.map((n) => ({ ...n }));
  }

  clearTimeout(autosaveTimer);  // 今保存するので、予約済みの自動保存は用済み
  state.saving = true;
  renderSaveState("saving");
  try {
    await postJSON("/api/file", { path, content });
  } catch (e) {
    // 保存できていない。ダーティのまま残す（clean にすると変更が消えたことに気付けない）。
    state.saveError = e instanceof ApiError ? e : new ApiError(String(e), 0);
    renderSaveState();
    return false;
  } finally {
    state.saving = false;
  }

  // 保存中にファイルが切り替わっていたら、今バッファに載っている別ファイルの基準を書き換えない。
  if (state.currentFile === path) {
    state.savedVersionId = versionAtSave;
    refreshDirty();  // 保存中に編集されていれば、ここで未保存へ戻る
  }
  if (isNew) await loadFileList();

  // 付箋は本文とは別のサイドカー。ここで失敗しても本文は保存できているので、
  // 「保存失敗」と一括りにせず、何が起きたかが分かる文言にする。
  if (noteMode) {
    try {
      await persistNotes(path, notesAtSave);
    } catch (e) {
      state.saveError = new ApiError(`本文は保存しましたが、付箋の保存に失敗しました: ${e.message}`, 0);
      renderSaveState();
      return true;
    }
  }
  state.saveError = null;
  renderSaveState("saved");
  return true;
}

// ---- 自動保存（NWP 移植・Note モード限定） -----------------------------------
// 打鍵が落ち着いてから保存する。CWP の saveFile はファイル未選択なら黙って false を
// 返す（NWP と違い名前を尋ねない）ので、「書き始めて2秒後に prompt が飛び出す」ことはない。
//
// Code モードでは自動保存しない。Code のエージェントはワークスペースのファイルを直接
// 書き換え、完了時に files_changed で知らせてくる。デバウンス中の2秒やターン実行中に
// 自動保存が走ると、エージェントが書いた新しい内容を、エディタに載ったままの古い
// バッファで黙って踏み潰す。踏み潰しは Undo でも戻せない（ディスク側が壊れる）ので、
// 「エージェントが書き手にならない Note モードだけ」という安全側に倒している。
// Code モードの未保存は従来どおり ● 未保存表示・破棄確認・beforeunload で守る。
const AUTOSAVE_DELAY_MS = 2000;
let autosaveTimer = null;

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  if (!isNote()) return;
  if (!state.currentFile || !state.dirty) return;
  autosaveTimer = setTimeout(() => {
    if (!state.dirty) return;                          // 2秒の間に Ctrl+S で保存済みかもしれない
    if (state.saving) { scheduleAutosave(); return; }  // 保存中なら捨てずに予約し直す
    saveFile();
  }, AUTOSAVE_DELAY_MS);
}

/** 保留中の自動保存を今すぐ確定する。ファイル切替・作業フォルダ変更・モード切替・
    タブ離脱の直前に呼ぶ。Code モードでは自動保存自体が無いので何もしない。 */
async function flushAutosave() {
  clearTimeout(autosaveTimer);
  if (!isNote()) return;
  if (state.currentFile && state.dirty) await saveFile();
}

// ---- Markdown プレビュー ----
// 既定は非表示。Markdown ファイルを開いているときだけ使える（コードには意味がない）。
const PREVIEW_DEBOUNCE_MS = 150;
let previewTimer = null;

const isPreviewOpen = () => !$("preview").classList.contains("hidden");

/** 現在ファイルのディレクトリ（ワークスペース相対、ルートなら ""）。
    画像の相対パス（images/foo.png）の解決基準 — プレビューとチャット描画で共用する。 */
const currentDir = () => (state.currentFile && state.currentFile.includes("/"))
  ? state.currentFile.slice(0, state.currentFile.lastIndexOf("/")) : "";

function updatePreviewAvailability() {
  const ok = isMarkdown(state.currentFile);
  $("preview-btn").disabled = !ok;
  $("preview-btn").title = ok
    ? "Markdown プレビューを表示 (Ctrl+Shift+P)"
    : "Markdown ファイル（.md）を開いているときだけ使えます";
  // リッチコピーは「プレビューが出ている間」だけ意味がある（コピー元がプレビューDOMのため）
  const rc = $("richcopy-btn");
  rc.disabled = !(ok && isPreviewOpen());
  rc.title = (ok && isPreviewOpen())
    ? "プレビューの内容をリッチテキスト（HTML）とMarkdownでコピー。Confluence 等に貼り付け可"
    : "Markdown プレビュー表示中に使えます";
  if (!ok && isPreviewOpen()) closePreview();
}

/**
 * プレビューが描画する本文（frontmatter 剥がし＋mdflow のオプション組み立て）。
 * renderPreview（描画）と copyRichPreview（text/plain 側のコピー内容）で共有する —
 * 「見えているもの」がコピーされることを保証するため。
 */
function previewSource() {
  const value = state.editor.getValue();
  let text = value;
  const opts = {};
  // mdflow は Note モードのみ（features.mdflow）。js-yaml 未取得なら available()=false。
  if (isNote() && state.features.mdflow && mdflow.available()) {
    try {
      const doc = mdflow.parseDocument(value);
      // frontmatter はプレビューに出さない（markdown-it は --- を hr や
      // setext 見出しとして誤描画する）。mdflow の有無に関わらず剥がす。
      text = doc.body;
      if (doc.mappings.length) {
        opts.mdflow = { doc, conditions: state.mdflowConditions };
        // 条件JSON入力へ打鍵中なら、再構築後にフォーカスを戻すための位置を記録
        const active = document.activeElement;
        if (active?.classList?.contains("mdflow-cond")) {
          opts.mdflow.focus = {
            diagramId: active.closest(".mdflow-presets")?.dataset.diagram,
            selStart: active.selectionStart,
            selEnd: active.selectionEnd,
          };
        }
      }
    } catch { /* mdflow のパースに失敗しても従来のプレビューは出す */ }
  }
  return { text, opts };
}

function renderPreview() {
  if (!isPreviewOpen()) return;
  // 画像の相対パス（images/foo.png）は現在ファイルのディレクトリ基準で解決させる
  setAssetBase(currentDir());
  const { text, opts } = previewSource();
  opts.editable = true;  // プレビューの図だけ ✏️ 直接編集の対象（チャットは対象外）
  renderInto($("preview"), text, opts);
  syncPreviewScroll();
}

// ---- mdflow: プレビュー内の条件プリセット操作（Note モード） ------------------
// リストの DOM は打鍵のたびに作り直される（markdown.js）ので、ハンドラは
// #preview への委譲で1回だけ登録する（bindUI から呼ばれる）。
function bindMdflowUI() {
  // プリセットのクリック → frontmatter の mdflow.selected を最小編集で書き換える。
  // 以降は通常の編集と同じ経路（dirty → プレビュー再描画）に乗り、undo スタックにも乗る。
  $("preview").addEventListener("click", (e) => {
    const item = e.target.closest(".mdflow-preset-item");
    if (!item) return;
    const diagramId = item.closest(".mdflow-presets")?.dataset.diagram;
    if (!diagramId) return;
    const preset = item.dataset.preset || null;  // "" = （条件で自動判定）
    const edit = mdflow.selectedEdit(state.editor.getValue(), diagramId, preset);
    if (!edit) return;  // 例: 自動判定を選んだが selected が元々無い
    const model = state.editor.getModel();
    const range = state.monaco.Range.fromPositions(
      model.getPositionAt(edit.start), model.getPositionAt(edit.end));
    state.editor.executeEdits("mdflow-select", [{ range, text: edit.text }]);
  });
  // 条件JSONの入力 → state を正として再評価。JSON が不正な間は評価をスキップし、
  // 入力欄の .invalid 表示だけ変わる（markdown.js 側で判定）。
  $("preview").addEventListener("input", (e) => {
    const input = e.target.closest(".mdflow-cond");
    if (!input) return;
    const diagramId = input.closest(".mdflow-presets")?.dataset.diagram;
    if (!diagramId) return;
    state.mdflowConditions.set(diagramId, input.value);
    schedulePreview();
  });
}

function schedulePreview() {
  if (!isPreviewOpen()) return;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, PREVIEW_DEBOUNCE_MS);
}

// エディタのスクロール位置に比率で追従させる。行単位の対応付けは重いので、まず比率で足りるかを見る。
function syncPreviewScroll() {
  if (!isPreviewOpen()) return;
  const ed = state.editor;
  const max = ed.getScrollHeight() - ed.getLayoutInfo().height;
  const ratio = max > 0 ? ed.getScrollTop() / max : 0;
  const pv = $("preview");
  pv.scrollTop = ratio * (pv.scrollHeight - pv.clientHeight);
}

/** プレビューの表示/非表示（仕切りも道連れ・幅の記憶を復元/解除する）。 */
function setPreviewVisible(on) {
  $("preview").classList.toggle("hidden", !on);
  $("preview-divider").classList.toggle("hidden", !on);
  $("preview-btn").classList.toggle("active", on);
  // 閉じるときはエディタの固定幅を外す。付けたままだと、プレビューが消えた分の
  // 幅がどこにも配分されず編集エリアの右側が空白のまま残る。
  if (on) restorePreviewSplit(); else $("editor").style.flex = "";
  state.editor?.layout();
  updatePreviewAvailability();  // リッチコピーボタンの有効状態がプレビュー開閉に連動する
}

function closePreview() {
  setPreviewVisible(false);
}

/**
 * mermaid 図の PNG をワークスペースへ保存する（markdown.js の 🖼 保存が呼ぶ）。
 *
 * 保存先は貼り付け画像と同じ `<ノートのディレクトリ>/images/`（POST /api/image）。
 * ファイル名は「ノート名-図ID」で決まるので、図を直して保存し直すと**同じファイルへ
 * 上書き**される（overwrite: true）。図1枚につきファイル1個に保つため — 日時で
 * 名付けたり -2 -3 と増やしたりすると、ノートに貼ったリンクが古い図を指し続ける。
 * 戻り値の相対パスは図のバーに出す。
 */
async function saveDiagramPng(blob, id) {
  const note = state.currentFile || "";
  const stem = sanitizeName(baseName(note).replace(/\.[^.]+$/, "")) || "diagram";
  const r = await postJSON("/api/image", {
    note,
    name: `${stem}-${id}`,
    ext: "png",
    data_b64: await blobToBase64(blob),
    overwrite: true,
  });
  await loadFileList();  // 保存した画像をファイルツリーに出す
  return r.path;
}

function togglePreview() {
  if (!isMarkdown(state.currentFile)) return;
  if (!mdAvailable()) {
    alert("⚠️ Markdown プレビューを使うには、先に次を実行してください:\n"
          + "python -m pipenv run python scripts/fetch_markdown_it.py");
    return;
  }
  if (isPreviewOpen()) { closePreview(); return; }
  setPreviewVisible(true);
  renderPreview();
  // automaticLayout: true なので Monaco 側の再計算は自動で追従する
}

// ---- リッチコピー（プレビュー → Confluence 等への貼り付け用） ----------------
// プレビューの描画済みDOMを、よそへ貼っても壊れない形（画像はbase64インライン、
// mermaid は PNG 化、見た目は最小限のインラインスタイル）に整え、text/html と
// text/plain（Markdown 本文）の2形式でクリップボードへ載せる。Confluence の
// エディタは Markdown の直貼り対応が不完全なので、HTML 側が実体になる。

/** Blob → data URL（ヘッダ込みの完全な "data:..." 文字列）。 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("画像データを読み込めませんでした"));
    r.readAsDataURL(blob);
  });
}

/** ペースト先（Confluence/Word 等）は白地前提なので、自前のダークテーマCSSに
    依存しない最小限の見た目をインラインスタイルで付ける。 */
function styleForPaste(root) {
  const each = (sel, styles) =>
    root.querySelectorAll(sel).forEach((el) => Object.assign(el.style, styles));
  each("table", { borderCollapse: "collapse" });
  each("th, td", { border: "1px solid #9aa0a6", padding: "4px 8px" });
  each("th", { background: "#f1f3f4" });
  each("pre", {
    background: "#f6f8fa", padding: "8px", borderRadius: "6px",
    fontFamily: "Consolas, 'Cascadia Code', monospace", fontSize: "12px",
    whiteSpace: "pre-wrap",
  });
  each("code", { fontFamily: "Consolas, 'Cascadia Code', monospace", fontSize: "0.92em" });
  each("blockquote", {
    borderLeft: "3px solid #cccccc", margin: "8px 0", padding: "2px 12px", color: "#555555",
  });
  each("img", { maxWidth: "100%" });
  each("h1, h2, h3, h4", { margin: "12px 0 6px" });
}

/** プレビューDOMのコピーを、貼り付け用に加工したHTML文字列にする（非同期）。 */
async function buildClipboardHtml(previewEl) {
  const clone = previewEl.cloneNode(true);
  // 描画専用UI（書き出しバー・条件プリセット・条件マッピングの折りたたみ）は文書の内容で
  // ないので外す。描画失敗中の mermaid ソース（.mermaid-error）は本文扱いで残す。
  clone.querySelectorAll(".mermaid-tools, .mdflow-presets, .mdflow-mapping, .mdflow-note")
    .forEach((n) => n.remove());

  // mermaid 図 → PNG（data URL）。Confluence はインラインSVGを受け付けないが、
  // 画像化したものなら添付として入る。失敗した図はSVGのまま残す（最悪消えるだけ）。
  for (const box of clone.querySelectorAll(".mermaid-box")) {
    const svg = box.querySelector("svg");
    if (!svg) continue;
    try {
      const blob = await svgToPngBlob(svg, { background: pngBackground() });
      const img = document.createElement("img");
      img.src = await blobToDataUrl(blob);
      img.style.maxWidth = "100%";
      box.replaceWith(img);
    } catch { /* PNG 化できなければ SVG のまま（貼付先で消える可能性がある） */ }
  }

  // ワークスペース画像（/api/asset?...）はローカルサーバでしか解決できない →
  // base64 を埋め込む。http(s)/data はそのまま貼付先から参照できる。
  for (const img of clone.querySelectorAll("img")) {
    const src = img.getAttribute("src") || "";
    if (!src.startsWith("/api/asset")) continue;
    try {
      const resp = await fetch(src);
      if (!resp.ok) continue;
      img.src = await blobToDataUrl(await resp.blob());
    } catch { /* 取得失敗はリンクのまま（貼付先では切れる） */ }
  }

  styleForPaste(clone);
  return `<div>${clone.innerHTML}</div>`;
}

let richCopyBusy = false;

/** プレビューの内容を「リッチテキスト＋Markdown」の2形式でクリップボードへコピーする。 */
async function copyRichPreview() {
  if (!isPreviewOpen() || richCopyBusy) return;
  const btn = $("richcopy-btn");
  const orig = btn.textContent;
  richCopyBusy = true;
  btn.disabled = true;
  btn.textContent = "⏳";
  try {
    const { text } = previewSource();
    const html = await buildClipboardHtml($("preview"));
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([text], { type: "text/plain" }),
    })]);
    btn.textContent = "✓ コピー済";
  } catch (e) {
    btn.textContent = orig;
    alert("⚠️ コピーできませんでした: " + (e?.message || e));
  } finally {
    richCopyBusy = false;
    setTimeout(() => { btn.textContent = orig; updatePreviewAvailability(); }, 1500);
  }
}

// ---- Confluence / Web からの貼り付け（HTML → Markdown 変換） ------------------
// Confluence のページをブラウザでコピー（Ctrl+C）するとクリップボードに
// text/html が入る。それを Turndown（static/js/confluence.js、要ベンダリング）で
// Markdown にして、エディタのカーソル位置へ挿入する。認証もAPIも要らない往復の片側。

let cfPendingHtml = null;  // 貼り付け/読込で捕まえたHTML。null = プレーンテキストのみ

/** 挿入位置の直前に必要な改行（空文書なら ""、文中なら "\n\n" 等）。 */
function pasteSeparator() {
  const model = state.editor.getModel();
  const offset = model.getOffsetAt(state.editor.getSelection().getStartPosition());
  const before = model.getValue().slice(0, offset).replace(/[ \t]+$/, "");
  if (!before.trim()) return "";              // 文書の先頭
  if (/\n\s*\n\s*$/.test(before)) return "";  // 既に空行がある
  if (/\n\s*$/.test(before)) return "\n";     // 改行1つ → もう1つ足して段落を分ける
  return "\n\n";                              // 行の途中
}

function bindConfluenceUI() {
  const modal = $("cf-modal");
  const input = $("cf-input");
  const status = $("cf-status");
  const setStatus = (t) => { status.textContent = t || ""; };

  $("cf-btn").addEventListener("click", () => {
    cfPendingHtml = null;
    input.value = "";
    setStatus(cfAvailable()
      ? "Confluence（または任意のWebページ）でコピー（Ctrl+C）してから「クリップボードから読込」、または下の欄に Ctrl+V。"
      : "⚠ Turndown 未取得: python -m pipenv run python scripts/fetch_turndown.py を実行するとHTML→Markdown変換が有効になります（未取得でもテキストはそのまま挿入できます）。");
    modal.classList.remove("hidden");
    input.focus();
  });
  const close = () => modal.classList.add("hidden");
  $("cf-cancel").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  // 下の欄への Ctrl+V: クリップボードにHTMLがあれば横取りして覚えておく。
  // textarea の既定の貼り付けはプレーンテキストしか入れず、表などの構造が失われるため。
  input.addEventListener("paste", (e) => {
    const html = e.clipboardData?.getData("text/html");
    if (!html || !cfAvailable()) return;  // テキストのみの貼り付けは既定動作に任せる
    e.preventDefault();
    cfPendingHtml = html;
    input.value = e.clipboardData?.getData("text/plain") || "";
    setStatus("✓ リッチテキスト（HTML）で取得しました。「変換して挿入」でMarkdownになります（下の欄は確認用。欄を手で編集するとHTML側を無視して欄の内容を挿入します）。");
  });

  // クリップボードの直接読み込み（ボタン）。ブラウザの許可プロンプトが出ることがある。
  $("cf-read-btn").addEventListener("click", async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes("text/html") && cfAvailable()) {
          cfPendingHtml = await (await item.getType("text/html")).text();
          input.value = item.types.includes("text/plain")
            ? await (await item.getType("text/plain")).text() : "";
          setStatus("✓ クリップボードのHTMLを取得しました。");
          return;
        }
        if (item.types.includes("text/plain")) {
          cfPendingHtml = null;
          input.value = await (await item.getType("text/plain")).text();
          setStatus("プレーンテキストとして取得しました（そのまま挿入されます）。");
          return;
        }
      }
      setStatus("クリップボードが空です。");
    } catch (e) {
      setStatus("⚠ 読み込めませんでした: " + (e?.message || e) + "。下の欄へ Ctrl+V なら直接取れます。");
    }
  });

  // textarea を手で編集したら、捕まえていたHTMLとは食い違うのでHTML側を捨てる。
  input.addEventListener("input", () => { cfPendingHtml = null; });

  $("cf-insert").addEventListener("click", () => {
    if (!state.currentFile) { alert("先に挿入先のファイルを開いてください。"); return; }
    let text;
    try {
      text = cfPendingHtml != null ? htmlToMarkdown(cfPendingHtml) : input.value;
    } catch (e) {
      alert("⚠ 変換に失敗しました: " + e.message);
      return;
    }
    if (!text.trim()) { setStatus("貼り付ける内容がありません。"); return; }
    state.editor.executeEdits("confluence-paste", [{
      range: state.editor.getSelection(),
      text: pasteSeparator() + text.replace(/\s+$/, "") + "\n",
    }]);
    state.editor.focus();
    close();
  });
}

// ---- Mermaid 図の直接編集（プレビュー操作 → ソースの最小編集 → executeEdits） ----
// state.diagramEditing = {src, focusNodeId} が編集中の図（src = mermaid ブロックの内容）。
// 編集を適用するとエディタ内容が変わってプレビューが再描画され、onDiagramRendered が
// 新しい src をキーに編集モードへ再入場する（1操作 = 1ターン分の差分、undo 可能）。

function openDiagramEditor(box, meta) {
  state.diagramEditing = { src: meta.src, focusNodeId: null };
  mermaidEdit.enterEditMode(box, meta, mermaidEditApi(), null);
}

function onDiagramRendered(box, meta) {
  const ed = state.diagramEditing;
  if (!ed || ed.src !== meta.src) return;
  mermaidEdit.enterEditMode(box, meta, mermaidEditApi(), ed.focusNodeId);
  ed.focusNodeId = null;
}

function mermaidEditApi() {
  return {
    applyEdits(src, edits, focusNodeId = null) {
      const editor = state.editor;
      const model = editor.getModel();
      const block = findMermaidBlock(model.getValue(), src);
      if (!block) {
        state.diagramEditing = null;
        alert("⚠️ 対応する図が見つかりません（内容が外部で変わった可能性）。編集モードを終了します。");
        return false;
      }
      const newSrc = mermaidEdit.applyEditsToText(src, edits);
      const ranges = edits.map((e) => ({
        range: state.monaco.Range.fromPositions(
          model.getPositionAt(block.toRaw(e.start)),
          model.getPositionAt(block.toRaw(e.end))),
        text: e.text,
      }));
      editor.executeEdits("mermaid-edit", ranges);
      state.diagramEditing = { src: newSrc, focusNodeId };
      editor.focus();
      return true;
    },
    onExit() { state.diagramEditing = null; },
  };
}

/** ドキュメント内の ```mermaid ブロックを走査する（markdown-it の fence と同じ取り方:
    内容はフェンス行の間の改行込み、閉じフェンスは同じ文字で開きと同じ長さ以上）。 */
function scanMermaidBlocks(doc) {
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

/** src（描画に使われた mermaid ソース）に一致するブロックを探す。
    戻り値の toRaw(i) は src 内オフセットをドキュメントオフセットへ変換する。
    markdown-it は入力を \n に正規化するがエディタは \r\n を保持しうるので、その分だけずらす。 */
function findMermaidBlock(doc, src) {
  for (const b of scanMermaidBlocks(doc)) {
    if (b.content === src) return { ...b, toRaw: (i) => i };
    if (!b.content.includes("\r")) continue;
    let norm = "";
    const map = [];
    for (let i = 0; i < b.content.length; i++) {
      if (b.content[i] === "\r" && b.content[i + 1] === "\n") continue;
      map.push(i);
      norm += b.content[i];
    }
    map.push(b.content.length);
    if (norm === src) return { ...b, toRaw: (i) => map[i] };
  }
  return null;
}

// ---- 全文検索 ----
let searchTimer = null;
function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch($("file-search").value), 250);
}

async function runSearch(q) {
  const box = $("search-results");
  const list = $("file-list");
  if (!q.trim()) { box.classList.add("hidden"); list.classList.remove("hidden"); return; }
  const r = await tryJSON("/api/search?q=" + encodeURIComponent(q));
  if (!r) return;
  box.innerHTML = "";
  for (const hit of r.results) {
    const div = document.createElement("div");
    div.className = "search-hit";
    const loc = document.createElement("span");
    loc.className = "loc";
    loc.textContent = `${hit.path}:${hit.line}`;
    div.append(loc, " " + hit.text);
    div.addEventListener("click", async () => {
      await openFile(hit.path);
      state.editor.revealLineInCenter(hit.line);
      state.editor.setPosition({ lineNumber: hit.line, column: 1 });
      state.editor.focus();
    });
    box.appendChild(div);
  }
  if (!r.results.length) box.innerHTML = "<div class='hint'>該当なし</div>";
  list.classList.add("hidden");
  box.classList.remove("hidden");
}

// ---- 選択テキスト（Note モード: チップ表示 + 送信ペイロード） -----------------
function getSelection() {
  // エディタ未ロードでも呼ばれる（applyModeUI → updateSelectionChip は Monaco の
  // 読み込み完了前に走りうる）。落とさず「選択なし」を返す。
  if (!state.editor) return "";
  const sel = state.editor.getSelection();
  return state.editor.getModel().getValueInRange(sel);
}

/** 選択が無いときの #sel-info の文言（モードで違う）。applyModeUI と共用。 */
function selInfoIdleText() {
  if (isNote()) return "テキストを選択してAIに送れます";
  if (isPlan()) return "計画モード：エージェントは調査だけを行い、ファイルは変更しません。";
  return "エージェントがファイルを直接編集します（破壊操作は承認制）。";
}

// 選択テキストの添付は両モード共通。Code モードでも「この関数を直して」の「この」を
// 選択範囲で示せる（送信時に /api/chat の selection として渡る）。
function updateSelectionChip() {
  const has = getSelection().trim().length > 0;
  $("sel-chip").classList.toggle("hidden", !has);
  $("sel-info").textContent = has ? "選択中：AIに送れます" : selInfoIdleText();
}

// ---- 付箋（インラインコメント。Note モード） ----------------------------------
async function loadNotes() {
  if (!state.currentFile) { state.notes = []; renderNotes(); return; }
  const r = await tryJSON("/api/notes?path=" + encodeURIComponent(state.currentFile));
  // 失敗しても前のファイルの付箋を残さない。残すと次の保存でそれを
  // 「今開いているファイルの付箋」として書き込んでしまう。
  state.notes = r ? (r.notes || []) : [];
  renderNotes();
}

/**
 * 付箋を保存する。path / notes を省略すると現在ファイルの現在の付箋を保存する。
 * doSave からは「await をまたぐ前に採ったスナップショット」を明示的に渡す。
 * 失敗は呼び出し側の表示に載せたいので、握らず伝播させる。
 */
async function persistNotes(path = state.currentFile, notes) {
  if (!path) return;
  if (notes == null) {
    syncNotesFromDecorations();
    notes = state.notes;
  }
  await jsonFetch("/api/notes?path=" + encodeURIComponent(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notes),
  });
}

// Monaco は編集に合わせてデコレーションを自動で移動する。その現在位置を
// state.notes に読み戻すことで、行の挿入・削除に付箋を追従させる。
// state.notes[i] とデコレーション collection の index は同順で対応する。
function syncNotesFromDecorations() {
  if (!state.noteDecorations) return;
  state.notes.forEach((n, i) => {
    const r = state.noteDecorations.getRange(i);
    if (r) n.line = r.startLineNumber;
  });
}

function renderNotes() {
  const m = state.monaco;
  const decos = state.notes.map((n) => ({
    range: new m.Range(n.line, 1, n.line, 1),
    options: {
      isWholeLine: true,
      glyphMarginClassName: "pixie-note-glyph",
      className: "pixie-note-line",
      glyphMarginHoverMessage: { value: "📌 " + n.text },
    },
  }));
  state.noteDecorations.set(decos);
}

function addNote() {
  syncNotesFromDecorations();  // 既存付箋の現在位置を確定してから追加する
  const line = state.editor.getPosition().lineNumber;
  const text = prompt("付箋メモ（例: ここをAIに膨らませてもらう）");
  if (!text) return;
  state.notes = state.notes.filter((n) => n.line !== line);
  state.notes.push({ line, text });
  renderNotes();
  persistNotes().catch((e) => alert("⚠️ 付箋の保存に失敗しました: " + e.message));
}

function editNoteAt(line) {
  syncNotesFromDecorations();  // クリック行と付箋の現在位置を一致させてから照合
  const existing = state.notes.find((n) => n.line === line);
  const text = prompt("付箋メモ（空で削除）", existing ? existing.text : "");
  if (text === null) return;   // キャンセル時は変更しない
  state.notes = state.notes.filter((n) => n.line !== line);
  if (text.trim()) state.notes.push({ line, text });
  renderNotes();
  persistNotes().catch((e) => alert("⚠️ 付箋の保存に失敗しました: " + e.message));
}

// ---- 関連ファイル参照（Note モード: 別ディレクトリの .pptx 等を紐付ける）--------
// テキストとして AI 文脈に流せる拡張子（フロント側の目安。読み出しはサーバが検証する）
const REF_TEXT_EXTS = new Set(
  ["md", "markdown", "txt", "py", "json", "yaml", "yml", "toml", "csv", "html", "css", "js", "ts"]
);
const refKey = (r) => (r.external ? "E:" : "I:") + r.path;
const baseName = (p) => p.split(/[\\/]/).pop();

const isTextRef = (r) => REF_TEXT_EXTS.has(extOf(r.path));
/** サーバ側で Markdown 抽出して文脈に流せる参照か（Office 文書・PDF）。 */
const isExtractableRef = (r) => isExtractPath(r.path);

async function loadRefs() {
  if (!state.currentFile) { state.refs = []; renderRefList(); return; }
  const r = await tryJSON("/api/refs?path=" + encodeURIComponent(state.currentFile));
  // 失敗時に前のファイルの参照を残さない理由は loadNotes と同じ
  state.refs = r ? (r.refs || []) : [];
  const alive = new Set(state.refs.map(refKey));  // 消えた参照のチェックを掃除
  for (const k of [...state.checkedRefs]) if (!alive.has(k)) state.checkedRefs.delete(k);
  renderRefList();
}

async function saveRefs() {
  if (!state.currentFile) return;
  await tryJSON("/api/refs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: state.currentFile, refs: state.refs }),
  });
}

async function addRef(ref) {
  if (!state.currentFile) { alert("先にファイルを開いてください。"); return; }
  if (state.refs.some((r) => refKey(r) === refKey(ref))) return;  // 重複は無視
  state.refs.push(ref);
  await saveRefs();
  renderRefList();
}

async function removeRef(i) {
  const [r] = state.refs.splice(i, 1);
  if (r) state.checkedRefs.delete(refKey(r));
  await saveRefs();
  renderRefList();
}

async function openRef(r) {
  try {
    await postJSON("/api/refs/open",
      { note: state.currentFile, path: r.path, external: !!r.external });
  } catch (e) {
    alert("⚠️ 開けませんでした: " + e.message);
  }
}

function renderRefList() {
  const ul = $("ref-list");
  const empty = $("ref-empty");
  ul.innerHTML = "";
  if (!state.currentFile) {
    empty.textContent = "ファイルを開くと関連ファイルを紐付けられます。";
    empty.classList.remove("hidden");
    return;
  }
  if (!state.refs.length) {
    empty.textContent = "ここにファイルをドラッグ、または「＋参照を追加」で紐付けます。";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  state.refs.forEach((r, i) => {
    const li = document.createElement("li");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.title = isTextRef(r)
      ? "AIコンテキストに含める"
      : isExtractableRef(r)
        ? "AIコンテキストに含める（サーバでテキスト抽出して同梱）"
        : "AIコンテキストに含める（この形式は Copilot 添付経路のみ有効）";
    cb.checked = state.checkedRefs.has(refKey(r));
    cb.addEventListener("click", (e) => e.stopPropagation());
    cb.addEventListener("change", () => {
      if (cb.checked) state.checkedRefs.add(refKey(r));
      else state.checkedRefs.delete(refKey(r));
    });
    const icon = document.createElement("span");
    icon.textContent = r.external ? "🔗" : "📄";  // 外部=🔗 / ワークスペース内=📄
    const name = document.createElement("span");
    name.className = "fname";
    name.textContent = r.name || baseName(r.path);
    name.title = r.path + "（クリックで既定アプリで開く）";
    name.addEventListener("click", () => openRef(r));
    const del = document.createElement("button");
    del.className = "ref-del";
    del.textContent = "×";
    del.title = "参照を外す";
    del.addEventListener("click", (e) => { e.stopPropagation(); removeRef(i); });
    li.append(cb, icon, name, del);
    ul.appendChild(li);
  });
}

// file:///C:/a/b.pptx → C:/a/b.pptx（OS ドラッグで uri-list が取れた場合のみ）
function fileUriToPath(uriList) {
  const line = (uriList || "").split(/\r?\n/).find((l) => l && !l.startsWith("#"));
  if (!line || !/^file:/i.test(line)) return null;
  let u = decodeURIComponent(line.replace(/^file:\/\//i, ""));
  if (/^\/[A-Za-z]:/.test(u)) u = u.slice(1);  // Windows: /C:/… → C:/…
  return u.replace(/\\/g, "/");
}

function setupRefDrop() {
  const zone = $("refmgr");
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    zone.classList.add("ref-drop");
  });
  zone.addEventListener("dragleave", (e) => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove("ref-drop");
  });
  zone.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove("ref-drop");
    if (!state.currentFile) { alert("先にファイルを開いてください。"); return; }

    // 1) アプリ内ファイルツリーからのドラッグ（ワークスペース相対パスが確実に取れる）
    if (_dragging) {
      const ent = state.fsEntries.find((f) => f.path === _dragging);
      if (ent && ent.type === "file") {
        await addRef({ path: _dragging, external: false, name: baseName(_dragging) });
      } else {
        alert("フォルダは参照に追加できません。ファイルをドラッグしてください。");
      }
      return;
    }
    // 2) OS エクスプローラからのドラッグ（絶対パスが取れる場合のみ）
    const p = fileUriToPath(e.dataTransfer.getData("text/uri-list") ||
                            e.dataTransfer.getData("text/plain"));
    if (p) {
      await addRef({ path: p, external: true, name: baseName(p) });
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      alert("ブラウザの制限でドラッグしたファイルの絶対パスを取得できません。\n" +
            "外部ファイルは「＋参照を追加」から選んでください。");
    }
  });
}

// ---- 関連ファイル選択ダイアログ（任意ディレクトリのファイルを参照に追加）--------
async function browsePick(path) {
  const r = await tryJSON("/api/workspace/dirs?files=true&path=" + encodeURIComponent(path || ""));
  if (!r) return;
  $("pick-input").value = r.cwd || "";

  const drives = $("pick-drives");
  drives.innerHTML = "";
  for (const d of r.drives || []) {
    const b = document.createElement("button");
    b.textContent = d;
    b.classList.toggle("active", (r.cwd || "").toLowerCase().startsWith(d.toLowerCase().slice(0, 2)));
    b.addEventListener("click", () => browsePick(d));
    drives.appendChild(b);
  }

  const ul = $("pick-list");
  ul.innerHTML = "";
  if (r.parent && r.parent !== r.cwd) {
    const li = document.createElement("li");
    li.textContent = "⬆ ..（上のフォルダへ）";
    li.addEventListener("click", () => browsePick(r.parent));
    ul.appendChild(li);
  }
  for (const d of r.dirs || []) {
    const li = document.createElement("li");
    li.textContent = "📁 " + d.name;
    li.addEventListener("click", () => browsePick(d.path));
    ul.appendChild(li);
  }
  for (const f of (r.files || [])) {
    const li = document.createElement("li");
    li.className = "pick-file";
    li.textContent = "📄 " + f.name;
    li.addEventListener("click", async () => {
      await addRef({ path: f.path.replace(/\\/g, "/"), external: true, name: f.name });
      closePickModal();
    });
    ul.appendChild(li);
  }
}

function openPickModal() {
  if (!state.currentFile) { alert("先にファイルを開いてください。"); return; }
  $("pick-modal").classList.remove("hidden");
  browsePick($("root-path").textContent || "");  // 現在のワークスペースから開始
}

function closePickModal() { $("pick-modal").classList.add("hidden"); }

// ---- 画像の貼り付け（Note モード: クリップボード / ドラッグ&ドロップ）----------
// 画像は「ファイルと同じ階層の images/」にサーバが保存し、本文には相対パスで
// ![](images/xxx.png) を挿す。ノートを images/ ごとフォルダ移動しても切れない。

// サーバ側 IMAGE_EXTS と対で維持する（ここに無い形式はアップロード前に弾く）
const IMAGE_MIME_EXT = {
  "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif",
  "image/webp": "webp", "image/bmp": "bmp", "image/svg+xml": "svg",
};

/** DataTransfer（clipboardData / dataTransfer）から最初の画像ファイルを取り出す。 */
function imageFileFrom(dt) {
  for (const f of dt?.files || []) {
    if (f.type in IMAGE_MIME_EXT) return f;
  }
  return null;
}

/** File → base64（dataURL の先頭 "data:...;base64," を剥がした本体）。 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] || "");
    reader.onerror = () => reject(new Error("画像を読み込めませんでした"));
    reader.readAsDataURL(file);
  });
}

/** 画像をサーバに保存し、カーソル位置（選択範囲）に ![](...) を挿入する。 */
async function insertImage(file) {
  if (!state.currentFile) {
    // 保存先ディレクトリが決まらない。テキストと違い黙って落とすと「貼れない」に見える
    alert("⚠️ 画像を貼るには、先にファイルを開いて（または保存して）ください。");
    return;
  }
  let r;
  try {
    r = await postJSON("/api/image", {
      note: state.currentFile,
      ext: IMAGE_MIME_EXT[file.type],
      name: file.name || "",   // D&D は元名を引き継ぐ。クリップボードは名前が無いので日時
      data_b64: await fileToBase64(file),
    });
  } catch (e) {
    alert("⚠️ 画像を保存できませんでした: " + e.message);
    return;
  }
  const alt = r.rel.split("/").pop().replace(/\.[^.]+$/, "");
  state.editor.executeEdits("insert-image", [
    { range: state.editor.getSelection(), text: `![${alt}](${r.rel})` },
  ]);
  state.editor.focus();
  await loadFileList();  // 生えた images/ フォルダをツリーに反映する
}

// ---- メッセージ描画 ----
// addMessage / addToolStatus / scrollMessages は shared/web/js/chat-log.js へ移動（import 済み）。

// 応答ストリームの表示管理。エージェントは prefill → 思考 → ツール実行 を何周もするので、
// 待機インジケータは「今どの段階か」を出し続け、本文トークンが来たら引っ込める。
// （本文が出たあと次のステップが始まったら、また出す。）
const PHASE_LABEL = {
  prefill: (sec) => `応答を待っています（prefill 中… ${sec}s）`,
  thinking: (sec) => `思考中… ${sec}s`,
};

function beginAssistantStream(el) {
  let raw = "";                          // 本文トークンの蓄積
  let phase = "prefill";
  let phaseStart = performance.now();    // 経過秒はフェーズごとに測る（通算だと何を待っているか分からない）

  const wait = document.createElement("div");
  wait.className = "wait-indicator";
  wait.innerHTML = `<span class="dots"><i></i><i></i><i></i></span><span class="wait-text"></span>`;
  const waitText = wait.querySelector(".wait-text");

  const showWait = () => {
    if (!wait.isConnected) el.insertBefore(wait, el.querySelector(".body"));
  };
  const paint = () => {
    if (!wait.isConnected) return;
    const sec = ((performance.now() - phaseStart) / 1000).toFixed(1);
    waitText.textContent = PHASE_LABEL[phase](sec);
  };
  const setPhase = (p) => {
    if (p !== phase) { phase = p; phaseStart = performance.now(); }
    showWait();
    paint();
    scrollMessages();
  };

  // 思考（<think>）は本文と混ぜず、折りたたみに入れる（NWP と同じ見せ方・同じ .think-box）。
  // 読みたい人だけ開ける。整形はしない（モデルが吐いたままを見せたい）。
  const startedAt = performance.now();
  let thinkBox = null;
  const showThink = (think, done = false) => {
    if (!think.trim()) return;
    if (!thinkBox) {
      thinkBox = document.createElement("details");
      thinkBox.className = "think-box";
      thinkBox.innerHTML = '<summary></summary><div class="think-body"></div>';
      el.insertBefore(thinkBox, el.querySelector(".body"));
    }
    const sec = ((performance.now() - startedAt) / 1000).toFixed(1);
    thinkBox.querySelector("summary").textContent =
      done ? `💭 思考ログ（${think.length}文字・${sec}s）` : "💭 思考中…";
    thinkBox.querySelector(".think-body").textContent = think;
    if (done) thinkBox.open = false;
  };

  showWait();
  paint();
  const timer = setInterval(() => { paint(); scrollMessages(); }, 200);

  return {
    onToken(t) {
      raw += t;
      wait.remove();  // 本文が出ている間は待機表示は不要
      // 思考は折りたたみへ、本文だけを吹き出しに出す。ストリーミング中の本文は生テキスト
      // のまま（トークンごとに Markdown を組み直すと重いうえ、閉じていないフェンスが
      // 崩れて見える）。整形は finish() で一度だけ行う。
      const { think, visible } = splitThink(raw);
      showThink(think);
      renderPlain(el.querySelector(".body"), visible);
      scrollMessages();
    },
    /** エンジンのインジケータ（⏳ Prefill / 🧠 Thinking...）を待機表示のフェーズに反映する。 */
    setPhase,
    finish() {
      clearInterval(timer);
      wait.remove();
      // <think>...</think>（qwen 系が content に混ぜる形式）は表示・履歴・差分反映の
      // 対象から外す。無ければ splitThink は素通しなので Code モードにも無害。
      const { think, visible } = splitThink(raw);
      showThink(think, true);   // 完了したら折りたたむ
      // 本文が出揃ったのでここで一度だけ Markdown へ。assetBase は「今のノートの
      // ディレクトリ」を明示する（モジュール共通の基準は最後にプレビューしたディレクトリで止まるため）
      if (visible.trim()) renderInto(el.querySelector(".body"), visible, { assetBase: currentDir() });
      return visible;
    },
  };
}

// ---- チャット送信（SSE） ----
// engine_adapter が status に回すインジケータ（本文でもツールログでもない）。
// ログ枠に積むと "⏳ Prefill... / ✅ Prefill: 8.4s / 🧠 Thinking..." が毎ステップ流れて
// 肝心のツール実行行が埋もれるので、待機インジケータのフェーズ表示に振り替える。
const PHASE_HINTS = [
  ["thinking", ["🧠", "Thinking..."]],
  ["prefill", ["⏳", "Prefill"]],
];

/** status テキストがインジケータならフェーズ名、違えば null。 */
function phaseOf(text) {
  for (const [phase, hints] of PHASE_HINTS) {
    if (hints.some((h) => text.includes(h))) return phase;
  }
  return null;
}

/** Note モードの送信ペイロード（選択・チェック済みコンテキスト・関連ファイル・履歴）。 */
async function buildNotePayload(msg) {
  const selection = getSelection();
  const context_files = [];
  for (const p of [...state.checkedFiles]) {
    // 抽出失敗（壊れた pptx 等）は tryJSON が理由を alert してそのファイルだけ抜く。
    // content: undefined のまま送ると /api/chat 側のバリデーションで丸ごと 422 になる。
    const r = await tryJSON("/api/file?path=" + encodeURIComponent(p));
    if (r && r.content != null) context_files.push({ path: p, content: r.content });
  }
  // チェック済みの関連ファイル: テキストと抽出可能な形式（pptx/docx 等）は内容を文脈へ、
  // それ以外のバイナリは絶対パスを Copilot 添付へ
  const ref_texts = [];
  const attach_files = [];
  if (state.currentFile) {
    for (let i = 0; i < state.refs.length; i++) {
      const r = state.refs[i];
      if (!state.checkedRefs.has(refKey(r))) continue;
      if (isTextRef(r) || isExtractableRef(r)) {
        const rr = await tryJSON(
          `/api/refs/read?note=${encodeURIComponent(state.currentFile)}&idx=${i}`);
        if (rr && rr.content != null) ref_texts.push({ path: r.path, content: rr.content });
      } else {
        attach_files.push(r.path);
      }
    }
  }
  return {
    message: msg,
    session_id: state.sessionId,   // Note は単一セッション（サーバは無視するが契約上送る）
    selection, context_files, ref_texts, attach_files,
    history: state.history,
    // 「このファイル」が指せるよう、開いているファイルを常に添える。
    // 未保存の編集も含めたいのでディスクではなくエディタの内容を送る。
    current_file: state.currentFile || "",
    current_content: state.currentFile ? state.editor.getValue() : "",
  };
}

// ---- スラッシュコマンド -------------------------------------------------------
// 会話の文脈は放っておくと膨らみ、古い側からエンジンに切り捨てられる（＝最初に決めた
// 前提が静かに消える）。それを人が能動的に管理できるようにするための入り口。
// 「サーバへ送るコマンド」と「ブラウザで完結するコマンド」を分けて持つ。

//: サーバ（/api/chat）が解釈するコマンド。ここでは素通しし、説明だけ /help に載せる。
const SERVER_COMMANDS = {
  "/compact": "会話を要約して文脈を畳む。`/compact 認証まわり` のように残したい焦点を足せる",
  "/copilot": "エージェントが質問文を組み立てて Copilot に聞き、回答を精査して反映する",
  "/copilot!": "エージェントを介さず Copilot へ直接1回質問する（速いが文脈も反映も無い）",
};

//: ブラウザ側で完結するコマンド。run(引数) を呼んで終わり（サーバへは送らない）。
const LOCAL_COMMANDS = {
  "/help": { desc: "使えるコマンドの一覧を出す", run: () => showHelp() },
  "/context": { desc: "いまの文脈の量（メッセージ数・概算文字数）を見る", run: () => showContext() },
  "/undo": { desc: "直前の往復を削除する（🗑 と同じ）", run: () => undoLastExchange() },
  "/clear": { desc: "会話をリセットする（Note は保存履歴も消す）", run: () => clearConversation() },
  "/code": { desc: "Code モードへ切り替える", run: () => switchModeCommand("code") },
  "/note": { desc: "Note モードへ切り替える", run: () => switchModeCommand("note") },
  "/plan": { desc: "Plan モードへ切り替える", run: () => switchModeCommand("plan") },
};

/** モード切替コマンド。バッジのクリック（cycleMode）と違い確認は出さない
    — コマンドを打った時点で「そのモードへ行きたい」は明示されているため。 */
async function switchModeCommand(next) {
  if (state.mode === next) {
    addMessage("system", `既に ${MODE_LABEL[next]} モードです。`);
    return;
  }
  await switchMode(next);
}

/**
 * 入力がローカル完結のコマンドなら実行して true を返す。
 *
 * 知らない "/..." は**コマンド扱いしない**（false を返して普通のメッセージとして送る）。
 * 「/api/chat のバグを直して」のような、スラッシュで始まるだけの依頼を拒まないため。
 */
async function runLocalCommand(text) {
  const m = /^(\/\S+)(?:\s+([\s\S]*))?$/.exec(text);
  if (!m) return false;
  const name = m[1].toLowerCase();
  if (name in SERVER_COMMANDS) return false;  // サーバが解釈する（通常の送信経路へ）
  const cmd = LOCAL_COMMANDS[name];
  if (!cmd) return false;
  addMessage("user", text);  // 何をしたかがログに残るよう、打った通りを出す
  await cmd.run((m[2] || "").trim());
  return true;
}

function showHelp() {
  const rows = [
    ...Object.entries(SERVER_COMMANDS),
    ...Object.entries(LOCAL_COMMANDS).map(([k, v]) => [k, v.desc]),
  ].map(([name, desc]) => `| \`${name}\` | ${desc} |`);
  addMessage("assistant", [
    "### 使えるコマンド", "",
    "| コマンド | 説明 |", "|---|---|", ...rows, "",
    "各返信の右上に出る 🗑 でも、その往復だけを文脈から消せます"
    + "（回答が不要だったやりとりを残さないほど、続きの精度が保てます）。",
  ].join("\n"));
}

async function showContext() {
  let r;
  try {
    r = await getJSON("/api/context?session_id=" + encodeURIComponent(state.sessionId));
  } catch (e) {
    addMessage("error", "⚠ 文脈を取得できません: " + e.message);
    return;
  }
  if (!r.supported) {
    addMessage("assistant", "このエンジンでは文脈量を測れません"
      + "（pixie_core API 1.6 以上が必要です）。");
    return;
  }
  const lines = [
    `### 🧠 いまの文脈（${MODE_LABEL[r.mode] || r.mode} モード）`, "",
    `- メッセージ: **${r.messages}** 件`,
    `- 分量: **約 ${r.chars.toLocaleString()} 文字**`,
    `- モデル: ${r.model || "(未設定)"}`,
  ];
  if (r.turns?.length) {
    const top = [...r.turns].sort((a, b) => b.chars - a.chars).slice(0, 5);
    lines.push("", "文脈を食っている往復（上位5件）:", "", "| 往復 | 分量 |", "|---|---|",
      ...top.map(t => `| ${t.label || "(無題)"} | 約 ${t.chars.toLocaleString()} 文字 |`),
      "", "要らない往復は 🗑 で消せます。全体を畳むなら `/compact`。");
  }
  addMessage("assistant", lines.join("\n"));
}

/** 直前の往復を消す（/undo）。表示に残っている最後のアシスタント発言が対象。 */
function undoLastExchange() {
  const msgs = [...$("messages").children].reverse();
  const target = msgs.find(el => el.classList.contains("assistant") && el._exchange);
  if (!target) { addMessage("system", "消せる往復がありません。"); return; }
  const btn = target.querySelector(".msg-del");
  if (btn) btn.click();  // 削除の実装は1本（🗑）に寄せる
}

/** 会話を丸ごとリセットする（/clear）。 */
async function clearConversation() {
  if (state.streaming) { alert("⚠️ 応答の生成中はリセットできません。"); return; }
  const extra = isNote() ? "\n（保存されている会話履歴も消えます）" : "";
  if (!confirm("この会話をリセットしますか？" + extra)) return;
  try {
    await postJSON("/api/session/clear", { session_id: state.sessionId });
  } catch (e) {
    alert("⚠️ リセットできません: " + e.message);
    return;
  }
  if (isNote()) {
    try {
      await jsonFetch("/api/chat/history", { method: "DELETE" });
      state.history = [];
      state.historyLoaded = true;
    } catch (e) {
      alert("⚠️ 保存履歴を消せませんでした: " + e.message);
    }
  }
  $("messages").innerHTML = "";
  state.assistantEl = null;
  state.sessionId = newSessionId();  // Code は以降のターンを新しいセッションで始める
  updateSessionInfo();
  addMessage("system", "🧹 会話をリセットしました。");
}

async function sendChat() {
  if (state.streaming) return;
  const input = $("chat-input");
  const msg = input.value.trim();
  if (!msg) return;

  // ローカル完結のスラッシュコマンド（/help・/undo 等）はここで処理して終わり。
  // サーバへ送るコマンド（/compact・/copilot）は通常の送信経路に乗る。
  if (await runLocalCommand(msg)) { input.value = ""; return; }

  const note = isNote();
  const plan = isPlan();
  // Code モード plan-first サブモード: このターンは「計画フェーズ」（読み取り専用で計画だけ出す）。
  // 計画承認直後の実行フェーズ（approvePlan が planExecNext を立てる）は除外する。
  const codePlan = isCode() && state.codeStyle === "plan" && !state.planExecNext;
  state.planExecNext = false;
  // 反映先の追跡は「送信時の選択範囲」。以降の編集にデコレーションで追随する。
  const applyTarget = note ? trackApplyTarget() : null;
  let body;
  if (note) {
    body = await buildNotePayload(msg);
  } else if (plan) {
    // Plan もサーバ側で note_prompts.build_user_text を通るので、開いているファイルは
    // 本文込みで渡す（未保存の編集を前提にした計画を立てさせるため）。
    body = { message: msg, session_id: state.sessionId, selection: getSelection(),
             current_file: state.currentFile || "",
             current_content: state.currentFile ? state.editor.getValue() : "" };
  } else {
    body = { message: msg, session_id: state.sessionId, current_file: state.currentFile,
             selection: getSelection(), plan_first: codePlan };
  }

  input.value = "";
  const userEl = addMessage("user", msg);
  // 変更バッジは直近ターンのもの。新しいターンを始めたら畳む。
  if (state.changedPaths.size) { state.changedPaths.clear(); renderFileTree(); }

  state.assistantEl = addMessage("assistant", "");
  state.turnId = 0;         // turn イベントで埋まる（来なければ文脈編集は無いターン）
  state.compacted = null;
  // 削除は「1往復」が単位なので、アシスタントの吹き出しから相方のユーザー発言を辿れるようにする。
  state.assistantEl._exchange = { userEl, userText: msg };
  state.assistantUi = beginAssistantStream(state.assistantEl);
  setStreaming(true);
  state.abort = new AbortController();

  let resp;
  try {
    resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: state.abort.signal,
    });
  } catch (e) {
    finishStream();
    addMessage("error", "送信失敗: " + e.message);
    return;
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    finishStream();
    addMessage("error", resp.status === 409
      ? "エージェントは実行中です。"
      : "⚠ " + (err.detail || `HTTP ${resp.status}`));
    return;
  }

  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop();
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        let ev;
        try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
        handleEvent(ev);
      }
    }
  } catch (e) {
    if (state.abort?.signal.aborted) addToolStatus(state.assistantEl, "⏹ 中断しました。");
    else addToolStatus(state.assistantEl, "⚠️ ストリーム中断: " + e.message);
  }
  const cancelled = !!state.abort?.signal.aborted;
  const assistantEl = state.assistantEl;  // finishStream が空箱を畳む前に確保
  const turnId = state.turnId;
  const visible = finishStream();
  if (note) noteAfterTurn(assistantEl, msg, visible, applyTarget, cancelled);
  else if ((plan || codePlan) && !cancelled) planAfterTurn(visible);
  if (state.compacted && assistantEl?.isConnected) collapseToSummary(assistantEl, state.compacted);
  else if (assistantEl?.isConnected) {
    // 往復が確定してから削除ボタンを付ける（生成中に消せると文脈と表示がずれる）。
    addDeleteButton(assistantEl, () => deleteExchange(assistantEl, turnId));
  }
}

/**
 * 1往復（ユーザー発言＋アシスタントの返信）を消す。
 *
 * 消すのは表示だけではない — LLM の文脈からも外すのが目的（それがこの機能の存在理由）。
 * 経路はモードで違う:
 *   Code / Plan … サーバのセッションが文脈の正。turn ID を渡して該当ターンだけ外す。
 *   Note      … 保存履歴（.pixie_chat.json）が文脈の正。そこから消して保存し直し、
 *               turn ID が無い（＝サーバ再起動前の履歴）ときはセッションを捨てて
 *               次ターンで新しい履歴から復元させる。
 */
async function deleteExchange(assistantEl, turnId) {
  if (state.streaming) { alert("⚠️ 応答の生成中は削除できません。"); return; }
  const ex = assistantEl?._exchange;
  const label = (ex?.userText || "").replace(/\s+/g, " ").slice(0, 40);
  if (!confirm(`この往復を削除しますか？\n「${label}${label.length >= 40 ? "…" : ""}」\n`
    + "（表示だけでなく AI の文脈からも消えます）")) return;

  let contextCleared = true;
  if (turnId) {
    try {
      const r = await postJSON("/api/chat/turn/delete",
        { session_id: state.sessionId, turn_id: turnId });
      contextCleared = !!r.ok;
    } catch { contextCleared = false; }
  }
  if (isNote()) {
    // 保存履歴からも消す。内容で照合するのは、サーバのトリミングや再読込で
    // 配列そのものが作り直されるため（index も参照も当てにならない）。
    const i = state.history.findIndex(m => m.role === "user" && m.content === ex?.userText);
    if (i >= 0) {
      const n = (state.history[i + 1]?.role === "assistant") ? 2 : 1;
      state.history.splice(i, n);
      await saveHistory();
    }
    if (!turnId) {
      // この履歴を積んだセッションが既に無い / ID が分からない。エンジン内の文脈を捨てて、
      // 次のターンで消したあとの履歴からシードし直させる。
      try { await postJSON("/api/session/clear", { session_id: state.sessionId }); }
      catch { contextCleared = false; }
    }
  }
  ex?.userEl?.remove();
  assistantEl.remove();
  if (!contextCleared) {
    addMessage("system", "⚠️ 表示からは消しましたが、AI の文脈からは消せませんでした"
      + "（サーバ側の会話が既に入れ替わっています）。");
  }
}

/** /compact の後始末: チャット欄を要約1件に畳む（表示と文脈を一致させる）。 */
function collapseToSummary(assistantEl, info) {
  const box = $("messages");
  for (const el of [...box.children]) {
    if (el !== assistantEl) el.remove();
  }
  const head = addMessage("system",
    `🗜 ここまでの会話（${info.before} 件）を要約に畳みました（約 ${info.saved_chars.toLocaleString()} 文字ぶんの文脈を解放）。`);
  box.insertBefore(head, assistantEl);
  if (isNote()) {
    // Note は保存履歴が表示の正。次に開いたときも要約だけが残るようにする。
    state.history = [
      { role: "user", content: "（ここまでの会話は /compact で要約に置き換えました）" },
      { role: "assistant", content: info.summary },
    ];
    saveHistory();
  }
  scrollMessages(true);
}

/** ```plan フェンスの中身を取り出す。無ければ null。 */
function extractPlan(text) {
  const m = /```plan[^\n]*\n([\s\S]*?)```/.exec(text || "");
  return m ? m[1].trim() : null;
}

/** Plan モードのターン確定処理: 計画が出ていれば左ペインの承認ビューへ載せる。 */
function planAfterTurn(visible) {
  // フェンスが基本形。ただしフェンスを付け忘れるモデルもあるので、番号付きリストが
  // 立っていれば本文全体を計画とみなす（承認前に必ず人が読むので、拾いすぎても害はない。
  // 逆に取り逃がすと「計画は出たのに承認ボタンが出ない」で機能が死んで見える）。
  let planText = extractPlan(visible);
  if (!planText && /^\s*1[.)]\s/m.test(visible || "")) planText = (visible || "").trim();
  if (!planText) return;
  openPlanView(planText);
}

/** Note モードのターン確定処理: 履歴の永続化と差分反映トリガー（NWP 移植）。 */
function noteAfterTurn(assistantEl, message, visible, applyTarget, cancelled) {
  state.history.push({ role: "user", content: message });
  // キャンセル直後で本文が空なら、空のアシスタント発言を履歴に残さない
  if (visible.trim() || !cancelled) state.history.push({ role: "assistant", content: visible });
  saveHistory();  // 1往復ぶんが確定したところで永続化（ストリーミング中は書かない）

  if (!assistantEl || !assistantEl.isConnected) return;  // 空応答で畳まれた吹き出しには付けない
  // トリガー優先順: search/replace ペア（部分編集）→ ```apply（全置換）→ 汎用挿入
  const edits = extractEdits(visible);
  if (edits.length) {
    renderPatchAction(assistantEl, visible, edits);
  } else {
    const hasApply = renderApplyBlock(assistantEl, visible, applyTarget);
    if (!hasApply && visible.trim()) addInsertAction(assistantEl, visible, applyTarget);
  }
}

function handleEvent(ev) {
  switch (ev.type) {
    case "token":
      // text 欠落のイベントで文字列 "undefined" を本文へ混ぜない（search ブロックが壊れる）
      if (ev.text) state.assistantUi?.onToken(ev.text);
      break;
    case "status": {
      const phase = phaseOf(ev.text);
      if (phase) { state.assistantUi?.setPhase(phase); break; }
      // ツール実行行・システム行はログ枠へ。エンジンはツール完了時にこの行を出すので、
      // 直後に次の ⏳ Prefill が来てフェーズは勝手に進む（ここでは触らない）。
      addToolStatus(state.assistantEl, ev.text);
      break;
    }
    case "turn":
      // このターンがサーバ側で何番目の往復か。削除（🗑）のときにこの ID を渡す。
      state.turnId = ev.id || 0;
      break;
    case "compacted":
      state.compacted = ev;  // 畳むのはターン確定後（本文を出し切ってから）
      break;
    case "approval":
      renderApproval(ev);
      break;
    case "files_changed":
      onFilesChanged(ev.paths);
      break;
    case "error":
      addToolStatus(state.assistantEl, "⚠ " + ev.text);
      break;
    case "done":
      break;
  }
}

function finishStream() {
  const visible = state.assistantUi?.finish() ?? "";
  // 送信そのものが失敗したターンでは、本文もツールログも無い空の吹き出しが残る。
  // 直後にエラー吹き出しを出すので、空箱は畳んでおく。
  if (state.assistantEl && !visible.trim() && !state.assistantEl.querySelector(".tool-log")) {
    state.assistantEl.remove();
    state.assistantEl = null;
  }
  setStreaming(false);
  return visible;  // Note モードのターン確定処理（履歴・差分反映）が使う
}

function setStreaming(on) {
  state.streaming = on;
  const btn = $("send-btn");
  if (on) {
    btn.textContent = "⏹ 停止";
    btn.classList.add("stop");
    btn.title = "エージェントの実行を中断する";
  } else {
    btn.textContent = "送信";
    btn.classList.remove("stop");
    btn.title = "";
    state.abort = null;
    state.assistantUi = null;
  }
}

// ---- 承認バー ----
function renderApproval(ev) {
  const box = $("approval");
  box.innerHTML = "";
  box.classList.remove("hidden");
  const h = document.createElement("h4");
  h.textContent = "⚠ エージェントが以下のツール実行を要求しています（承認が必要）";
  box.appendChild(h);

  for (const c of ev.calls) {
    const div = document.createElement("div");
    div.className = "call";
    if (c.needs_approval) {
      const flag = document.createElement("span");
      flag.className = "danger";
      flag.textContent = "● 承認必須 ";
      div.appendChild(flag);
    }
    const name = document.createElement("b");
    name.textContent = c.name;
    // run_command / write 系は引数全文を必ず表示（監査指摘）。
    const args = c.args && Object.keys(c.args).length ? JSON.stringify(c.args, null, 2) : "(no args)";
    div.append(name, "\n" + args);
    box.appendChild(div);
  }

  const row = document.createElement("div");
  row.className = "row";
  const ta = document.createElement("textarea");
  ta.placeholder = "却下して別指示を出す場合はここに入力（任意）";
  const approve = document.createElement("button");
  approve.className = "btn-approve";
  approve.textContent = "✓ 承認して実行";
  approve.onclick = () => resolveApproval(ev.id, true, null);
  const reject = document.createElement("button");
  reject.className = "btn-reject";
  reject.textContent = "✗ 却下";
  reject.onclick = () => resolveApproval(ev.id, false, ta.value.trim() || null);
  row.append(ta, approve, reject);
  box.appendChild(row);
  scrollMessages();
}

async function resolveApproval(id, approve, override) {
  $("approval").classList.add("hidden");
  $("approval").innerHTML = "";
  if (state.assistantEl) {
    addToolStatus(state.assistantEl, approve ? "✓ 承認しました。" : "✗ 却下しました。");
  }
  await postJSON("/api/approve", { id, approve, override, session_id: state.sessionId })
    .catch((e) => addToolStatus(state.assistantEl, "⚠️ 承認を送れませんでした: " + e.message));
}

// ---- 変更ファイル反映 ----
async function onFilesChanged(paths) {
  addToolStatus(state.assistantEl, "📝 変更されたファイル: " + paths.join(", "));
  state.changedPaths = new Set(paths);
  await loadFileList();
  // 開いているファイルが変更された場合はライブ再読込（未保存なら確認）。
  if (state.currentFile && paths.includes(state.currentFile)) {
    if (!state.dirty) {
      await openFile(state.currentFile, true);
    } else if (confirm(`${state.currentFile} がエージェントに変更されました。エディタの未保存分を破棄して再読込しますか？`)) {
      await openFile(state.currentFile, true);
    }
  }
}

async function interrupt() {
  // Note / Plan セッションは SessionManager 管理外（単一セッション）。fetch の中断で
  // SSE ジェネレータの finally が協調キャンセルを送るので、それに任せる。
  if (isCode()) await postJSON("/api/interrupt", { session_id: state.sessionId }).catch(() => {});
  if (state.abort) state.abort.abort();
}

function newSession() {
  if (state.streaming) { alert("⚠️ 実行中です。中断してから新しい会話を開始してください。"); return; }
  state.sessionId = newSessionId();
  $("messages").innerHTML = "";
  $("approval").classList.add("hidden");
  state.assistantEl = null;
  addMessage("system", "新しい会話を開始しました（別セッション）。");
  updateSessionInfo();
}

function updateSessionInfo() {
  $("session-info").textContent = "session: " + state.sessionId.slice(0, 8);
}

// ---- 差分反映（Note モード: search/replace → /api/patch → Diff プレビュー）------

// 部分編集の提案：ボタンを付け、押下でサーバ計算 → 差分プレビュー → 適用。
function renderPatchAction(el, text, edits) {
  // フェンスを畳んでから Markdown 化する。順序が逆だと search/replace の中身が
  // コードブロックとして本文に展開されてしまう。畳む範囲は抽出と同じ走査で決める
  // （regex だと入れ子フェンスで範囲がずれる）。
  let folded = "";
  let pos = 0;
  for (const b of scanEditBlocks(text)) {
    folded += text.slice(pos, b.start) + "📝 修正案（差分で確認）";
    pos = b.end;
  }
  folded += text.slice(pos);
  renderInto(el.querySelector(".body"), folded, { assetBase: currentDir() });
  const actions = document.createElement("div");
  actions.className = "apply-actions";
  const btn = document.createElement("button");
  btn.className = "apply-btn";
  btn.textContent = `▶ 差分で反映（${edits.length}箇所）`;
  btn.addEventListener("click", () => reflectViaPatch(edits, el));
  actions.appendChild(btn);
  el.appendChild(actions);
  scrollMessages();
}

// search/replace 編集を文書全体に対してサーバで計算し、差分プレビューへ。
async function reflectViaPatch(edits, msgEl) {
  const base = state.editor.getModel().getValue();
  let r;
  try {
    r = await postJSON("/api/patch", { base, edits });
  } catch (e) {
    addToolStatus(msgEl, "⚠️ 適用計算に失敗: " + e.message);
    return;
  }
  // 失敗した編集はステータス行で知らせる（ヒント付き）
  r.results.forEach((res, i) => {
    if (!res.ok) addToolStatus(msgEl, `⚠️ 修正${i + 1}: ${res.error.split("\n")[0]}`);
    else if (res.method !== "exact") addToolStatus(msgEl, `ℹ️ 修正${i + 1}: ${res.method} マッチで補正適用`);
  });
  if (r.applied === 0) {
    addToolStatus(msgEl, "⚠️ 適用できる修正がありませんでした。本文が変わっていないか確認してください。");
    return;
  }
  // mdflow の整合性警告（この編集で新たに増えた分だけサーバが返す）。
  // ブロックはしない — 差分プレビューで内容を見て採否を決めてもらう。
  const mdflowWarns = r.mdflow_warnings || [];
  mdflowWarns.forEach((w) => addToolStatus(msgEl, `⚠️ mdflow: ${w}`));
  let label = `差分プレビュー：${r.applied}/${edits.length} 箇所を適用（右は編集して調整可）`;
  if (mdflowWarns.length) label += ` ⚠ mdflow: ${mdflowWarns.length}件の警告`;
  openDiffPreview(base, r.content, (finalText) => {
    const model = state.editor.getModel();
    state.editor.executeEdits("pixie-patch",
      [{ range: model.getFullModelRange(), text: finalText, forceMoveMarkers: true }]);
    state.editor.focus();  // ダーティ化は onDidChangeModelContent → refreshDirty が拾う
  }, label);
}

// 送信時の選択範囲をデコレーションとして記録。以降の編集に追随する。
function trackApplyTarget() {
  if (state.pendingTarget?.coll) state.pendingTarget.coll.clear();  // 前回のハイライトを消す
  const sel = state.editor.getSelection();
  if (!sel || sel.isEmpty()) { state.pendingTarget = null; return null; }
  const coll = state.editor.createDecorationsCollection([
    { range: sel, options: { className: "pixie-pending-target" } },
  ]);
  state.pendingTarget = { file: state.currentFile, coll };
  return state.pendingTarget;
}

// 全アシスタントメッセージに付く汎用トリガー。本文を左エディタへ挿入/置換する。
function addInsertAction(el, text, target) {
  const actions = document.createElement("div");
  actions.className = "apply-actions";
  const btn = document.createElement("button");
  btn.className = "insert-btn";
  btn.textContent = "▶ エディタへ反映";
  btn.title = "このメッセージの提案を差分プレビューで確認してから反映する";
  btn.addEventListener("click", () => reflectViaDiff(extractProposed(text), target));
  actions.appendChild(btn);
  el.appendChild(actions);
  scrollMessages();
}

// ```apply ブロックを抽出して「反映」ボタンを付ける。付けたら true。
function renderApplyBlock(el, text, target) {
  const matches = [...text.matchAll(/```apply\s*\n([\s\S]*?)```/g)];
  if (!matches.length) return false;
  const replacement = matches[matches.length - 1][1].replace(/\n$/, "");

  // 本文中の apply フェンスは重複表示になるので置き換える
  el.querySelector(".body").textContent =
    text.replace(/```apply\s*\n[\s\S]*?```/g, "📝 修正案（下のボックス参照）");

  const box = document.createElement("div");
  box.className = "apply-box";
  box.textContent = replacement;
  const actions = document.createElement("div");
  actions.className = "apply-actions";
  const btn = document.createElement("button");
  btn.className = "apply-btn";
  btn.textContent = "▶ 差分で反映";
  btn.addEventListener("click", () => reflectViaDiff(replacement, target));
  actions.appendChild(btn);
  el.append(box, actions);
  scrollMessages();
  return true;
}

// 反映の入口：差分プレビュー（現在 vs 提案）を開き、確認後に適用する。
function reflectViaDiff(proposed, target) {
  const range = resolveTargetRange(target);
  const base = state.editor.getModel().getValueInRange(range);
  openDiffPreview(base, proposed, (finalText) => {
    state.editor.executeEdits("pixie-apply", [{ range, text: finalText, forceMoveMarkers: true }]);
    if (target?.coll) target.coll.clear();
    state.editor.focus();  // ダーティ化は onDidChangeModelContent → refreshDirty が拾う
  });
}

// 反映先の範囲：送信時に選択があればその範囲、無ければ全文。
function resolveTargetRange(target) {
  const model = state.editor.getModel();
  if (target?.coll && target.file === state.currentFile) {
    const r = target.coll.getRange(0);
    if (r) return r;
  }
  return model.getFullModelRange();
}

// --- 差分プレビュー オーバーレイ（Monaco DiffEditor）---
let diffEditor = null;
let diffApplyFn = null;

function openDiffPreview(base, proposed, onApply, label) {
  const m = state.monaco;
  $("diff-label").textContent = label || "差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）";
  $("diff-overlay").classList.remove("hidden");
  if (!diffEditor) {
    diffEditor = m.editor.createDiffEditor($("diff-editor"), {
      theme: "vs-dark", automaticLayout: true, renderSideBySide: true,
      originalEditable: false, readOnly: false,
      minimap: { enabled: false }, wordWrap: "on", fontSize: 14,
    });
  }
  // 現在ファイルの言語でハイライトする（Note の md 以外への提案でも読める）
  const lang = state.currentFile ? langFor(state.currentFile) : "markdown";
  const original = m.editor.createModel(base, lang);
  const modified = m.editor.createModel(proposed, lang);
  diffEditor.setModel({ original, modified });
  diffApplyFn = () => {
    const finalText = diffEditor.getModel().modified.getValue();
    closeDiffPreview();
    onApply(finalText);
  };
  diffEditor.focus();
}

function closeDiffPreview() {
  $("diff-overlay").classList.add("hidden");
  diffApplyFn = null;
  if (diffEditor) {
    const models = diffEditor.getModel();
    diffEditor.setModel(null);
    if (models) { models.original.dispose(); models.modified.dispose(); }
  }
}

// --- 実行計画ビュー オーバーレイ（Plan モード） -------------------------------
// 「承認付きの事前計画」の承認 UI。エージェント側には書き込みツールを提示していないので、
// ここで承認するまでファイルは1字も変わらない（＝この画面が唯一の実行への入口）。

function openPlanView(planText) {
  state.planText = planText;
  renderInto($("plan-body"), planText);   // 計画は Markdown（番号付きリスト）で書かせている
  $("plan-label").textContent = "実行計画（承認するまでファイルは変更されません）";
  $("plan-overlay").classList.remove("hidden");
}

function closePlanView() {
  $("plan-overlay").classList.add("hidden");
  $("plan-body").innerHTML = "";
  state.planText = "";  // 計画はこのビューの持ち物。閉じたら残さない
}

/** [✓ この計画で実行]: 計画をそのまま実行指示として送る。
    Code モード（plan-first サブモード）なら同じセッションで実行フェーズへ、
    Plan モードなら Code モードへ切り替えてから送る。 */
async function approvePlan() {
  const planText = state.planText;  // closePlanView が消すので先に控える
  if (!planText) return;
  closePlanView();
  if (isCode()) {
    // plan-first サブモード: モード切替は不要。次の送信だけ計画フェーズから外し、
    // 同じセッションの続き（フルツール）で実行させる。
    state.planExecNext = true;
    addMessage("system", "✓ 計画を承認しました。実装を開始します（書き込みは引き続き承認制）。");
    $("chat-input").value =
      "以下の実行計画を承認しました。この計画のとおりに実装してください。"
      + "計画から外れる変更が必要になったら、実行する前に知らせてください。\n\n" + planText;
    await sendChat();
    return;
  }
  // 確認ダイアログは出さない（このボタン自体が確認であり、二段確認は承認の意味を薄める）。
  const ok = await switchMode("code", { keepMessages: true });
  if (!ok) { openPlanView(planText); return; }  // 切替に失敗したら計画は消さずに戻す
  addMessage("system", "✓ 計画を承認しました。🛠 Code モードで実行します。");
  // 送信は通常のチャット経路に乗せる（ユーザー発言として履歴にも残り、中断もできる）。
  $("chat-input").value =
    "以下の実行計画を承認しました。この計画のとおりに実装してください。"
    + "計画から外れる変更が必要になったら、実行する前に知らせてください。\n\n" + planText;
  await sendChat();
}

/** [✕ 修正を依頼]: 計画は保持したままチャットへ戻る（Plan モードのまま次のターン）。 */
function rejectPlan() {
  $("plan-overlay").classList.add("hidden");  // planText は残す（練り直しの土台）
  addMessage("system", "✕ 計画の修正を依頼します。どこをどう直したいかチャットに書いてください。");
  $("chat-input").focus();
}

// ---- 作業フォルダ選択（フォルダ移動） ----
async function browseDirs(path) {
  const r = await tryJSON("/api/workspace/dirs?path=" + encodeURIComponent(path || ""));
  if (!r) return;
  $("root-input").value = r.cwd || "";

  // ドライブボタン（Windows）
  const drives = $("root-drives");
  drives.innerHTML = "";
  for (const d of r.drives || []) {
    const b = document.createElement("button");
    b.textContent = d;
    b.classList.toggle("active", (r.cwd || "").toLowerCase().startsWith(d.toLowerCase().slice(0, 2)));
    b.addEventListener("click", () => browseDirs(d));
    drives.appendChild(b);
  }

  // サブフォルダ一覧（先頭に「.. 上へ」）
  const list = $("root-dirlist");
  list.innerHTML = "";
  if (r.parent && r.parent !== r.cwd) {
    const up = document.createElement("li");
    up.textContent = "⬆ ..（上のフォルダへ）";
    up.addEventListener("click", () => browseDirs(r.parent));
    list.appendChild(up);
  }
  for (const d of r.dirs || []) {
    const li = document.createElement("li");
    li.textContent = "📁 " + d.name;
    li.addEventListener("click", () => browseDirs(d.path));
    list.appendChild(li);
  }
}

function openRootModal() {
  $("root-modal").classList.remove("hidden");
  browseDirs($("root-path").textContent || "");
}

function closeRootModal() { $("root-modal").classList.add("hidden"); }

async function chooseWorkspace() {
  const path = $("root-input").value.trim();
  if (!path) return;
  if (state.streaming) { alert("⚠️ 実行中は作業フォルダを切り替えられません。"); return; }
  await flushAutosave();  // 切替後は別ワークスペース。保留中の保存はここで確定させる
  if (state.dirty && !confirm("未保存の変更があります。破棄して作業フォルダを切り替えますか？")) return;
  let r;
  try {
    r = await postJSON("/api/workspace", { path });
  } catch (e) {
    alert("⚠️ フォルダ変更に失敗: " + e.message);
    return;
  }
  closeRootModal();
  // 前のワークスペースに紐づく状態をリセットする
  state.currentFile = null;
  state.collapsedDirs.clear();
  state.knownDirs.clear();  // 別ワークスペースの木なので「既定で閉じる」判定もやり直す
  state.changedPaths.clear();
  state.saveError = null;
  state.editor.setValue("");
  markClean();
  renderSaveState();
  $("current-file").textContent = "（ファイル未選択）";
  updatePreviewAvailability();
  clearNoteState();  // 付箋・参照・履歴・反映先は前ワークスペースのもの
  await loadMode();  // モードはワークスペース随伴（last_mode）。切替先のものに追従する
  applyModeUI();
  await loadStatus();
  await loadFileList();
  if (isNote()) {
    state.sessionId = newSessionId();
    updateSessionInfo();
    $("approval").classList.add("hidden");
    state.assistantEl = null;
    await loadHistory();  // Note の履歴もワークスペースに紐づく。切替先のものを読み直す
  } else {
    newSession();  // 新しい作業フォルダで新しい会話を開始
  }
  addMessage("system", "作業フォルダを変更: " + (r.workspace || path));
}

// URL のページを Markdown 化して web/ に保存（🌐+）。Note モード専用。
async function importUrlAsMarkdown() {
  const url = prompt("Markdown にする URL（ログインが必要なページはブラウザで手動ログイン）");
  if (!url || !url.trim()) return;
  const btn = $("web2md-btn");
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = "⏳";
  try {
    const r = await (await fetch("/api/web2md", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    })).json();
    if (!r.ok) { alert(r.error); return; }
    await loadFileList();
    await openFile(r.path);
  } catch (e) {
    alert("エラー: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "🌐+";
  }
}

// ---- Copilot 取り込みバー（Note モード。人がブラウザで対話 → 会話を取り込んでまとめる）----
// 設定モーダルの Copilot 操作（#copilot-open-btn / #copilot-status）とは別系統。id 衝突を避けて
// バー側は #cp-bar-* を使う。NWP の openCopilot / importCopilotChat の移植。
function setCopilotBarStatus(text) {
  const el = $("cp-bar-status");
  if (el) el.textContent = text;
}

async function openCopilotFromBar() {
  setCopilotBarStatus("ブラウザを起動中…");
  try {
    const r = await (await fetch("/api/copilot/open", { method: "POST" })).json();
    setCopilotBarStatus(r.ok ? "Copilot を開きました。ブラウザで対話してください。" : r.error);
  } catch (e) {
    setCopilotBarStatus("エラー: " + e.message);
  }
}

async function importCopilotChat() {
  if (state.streaming) return;
  const btn = $("cp-bar-import-btn");
  btn.disabled = true;
  setCopilotBarStatus("会話を取得中…");
  let r;
  try {
    r = await (await fetch("/api/copilot/read", { method: "POST" })).json();
  } catch (e) {
    setCopilotBarStatus("エラー: " + e.message);
    btn.disabled = false;
    return;
  }
  btn.disabled = false;
  if (!r.ok) { setCopilotBarStatus(r.error); return; }
  setCopilotBarStatus("");

  // 入力欄に指示があればそれを優先。無ければ既定の「まとめて」指示。
  const input = $("chat-input");
  const instruction = input.value.trim()
    || "以下は私が Microsoft Copilot と交わした会話ログです。内容を整理して、ノートとして残せる Markdown のまとめを作ってください。";
  input.value = instruction + "\n\n---\n\n# Copilot 会話ログ\n\n" + r.transcript;
  await sendChat();  // CWP の sendChat は入力欄から読む（NWP は引数渡し）
}

// ---- 設定（モデル/サーバ） ----
async function openSettings() {
  const data = await getJSON("/api/servers").catch(() => ({ servers: [], active: 0 }));
  const sel = $("settings-model");
  sel.innerHTML = "";
  (data.servers || []).forEach((s, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${s.name} — ${s.model || "(model?)"}`;
    if (i === data.active) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = async () => {
    try {
      await postJSON("/api/settings", { active_server: Number(sel.value) });
    } catch (e) {
      alert("⚠️ 設定を保存できません: " + e.message);
    }
    await loadModelOptions();  // サーバが変わればモデル一覧も切り替わる
    await loadContextLength();  // コンテキスト長はサーバ単位なので切替先の値を出す
    await loadStatus();
  };
  await loadModelOptions();
  await loadThinkBudget();
  await loadContextLength();
  await refreshCopilot();
  $("settings-modal").classList.remove("hidden");
}

// 思考許容時間（deep 思考の <think> 上限秒）。保存すると実行中のセッションにも即反映される
// （セッションは作り直さないので会話文脈は保たれる）。
async function loadThinkBudget() {
  const inp = $("settings-think-budget");
  if (!inp) return;
  const s = await getJSON("/api/settings").catch(() => ({}));
  if (s.think_budget_min != null) inp.min = s.think_budget_min;
  if (s.think_budget_max != null) inp.max = s.think_budget_max;
  if (s.think_budget_sec != null) inp.value = s.think_budget_sec;
  $("settings-think-budget-status").textContent = "";
}

async function saveThinkBudget() {
  const inp = $("settings-think-budget");
  const st = $("settings-think-budget-status");
  st.textContent = "保存中…";
  try {
    const r = await postJSON("/api/settings", { think_budget_sec: Number(inp.value) });
    inp.value = r.think_budget_sec;
    st.textContent = `✓ ${r.think_budget_sec} 秒にしました`;
  } catch (e) {
    st.textContent = "⚠ " + e.message;
  }
}

// コンテキスト長（トークン）。アクティブサーバに紐づく。0=自動（バックエンドの取得値）。
// 変更するとそのサーバのセッションは作り直され、新しい n_ctx で切り詰め判定が動く。
async function loadContextLength() {
  const inp = $("settings-context-length");
  if (!inp) return;
  const s = await getJSON("/api/settings").catch(() => ({}));
  if (s.context_length_min != null) inp.min = s.context_length_min;
  if (s.context_length_max != null) inp.max = s.context_length_max;
  if (s.context_length != null) inp.value = s.context_length || 0;
  $("settings-context-length-status").textContent = "";
}

async function saveContextLength() {
  const inp = $("settings-context-length");
  const st = $("settings-context-length-status");
  st.textContent = "保存中…";
  try {
    const r = await postJSON("/api/settings", { context_length: Number(inp.value) });
    inp.value = r.context_length || 0;
    st.textContent = r.context_length
      ? `✓ ${r.context_length.toLocaleString()} トークンにしました（会話は作り直し）`
      : "✓ 自動（バックエンドの取得値）に戻しました";
  } catch (e) {
    st.textContent = "⚠ " + e.message;
  }
}

// LM Studio の /v1/models からロード済みモデル一覧を取得して選択ドロップダウンに並べる。
// サーバ未起動・モデル未ロード時は案内表示にフォールバック。
async function loadModelOptions() {
  const sel = $("settings-llm-model");
  if (!sel) return;
  const r = await getJSON("/api/models").catch(() => ({ models: [] }));
  const models = r.models || [];
  sel.innerHTML = "";
  sel.onchange = null;
  if (!models.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(取得できません・LM Studio 起動中か確認)";
    sel.appendChild(opt);
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  models.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;  // LM Studio は /v1/models の id（フルパス）でないとロード失敗する
    opt.textContent = m.split("/").pop();  // 見やすさ: 最後のファイル名部分を表示
    if (m === r.current) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = async () => {
    if (!sel.value) return;
    try {
      await postJSON("/api/settings", { model: sel.value });
    } catch (e) {
      alert("⚠️ モデルを保存できません: " + e.message);
    }
    await loadStatus();
  };
}

function closeSettings() { $("settings-modal").classList.add("hidden"); }

async function refreshCopilot() {
  const c = await getJSON("/api/copilot").catch(() => ({}));
  $("settings-copilot").checked = !!c.enabled;
  state.copilotEnabled = !!c.enabled;
  applyCopilotVisibility();
  const parts = [];
  if (c.enabled) parts.push("オン");
  if (!c.script_ok) parts.push("⚠ PrayLight 未検出: " + (c.praylight_dir || "?"));
  else if (!c.python_ok) parts.push("⚠ PrayLight の .venv Python 未検出");
  else if (c.enabled) parts.push("PrayLight OK — 未ログインなら下のボタンでブラウザを開いてログイン");
  $("settings-copilot-status").textContent = parts.join(" / ");
}

async function toggleCopilot(e) {
  try {
    const r = await postJSON("/api/copilot/enable", { enabled: $("settings-copilot").checked });
    state.copilotEnabled = !!r.enabled;
    applyCopilotVisibility();
  } catch (err) {
    alert("⚠️ 設定を保存できません: " + err.message);
    e.target.checked = !e.target.checked;  // 設定できたように見せない
  }
  await refreshCopilot();
}

async function openCopilotBrowser() {
  $("settings-copilot-status").textContent = "起動中…";
  const r = await postJSON("/api/copilot/open").catch(() => ({ ok: false, error: "通信エラー" }));
  $("settings-copilot-status").textContent = r.ok
    ? "ブラウザを開きました。Copilot にログインしてください。"
    : (r.error || "起動失敗");
}

// ---- UI バインド ----
function bindUI() {
  $("send-btn").addEventListener("click", () => (state.streaming ? interrupt() : sendChat()));
  $("new-session-btn").addEventListener("click", newSession);
  updateSessionInfo();
  updatePreviewAvailability();
  $("save-btn").addEventListener("click", () => saveFile());  // MouseEvent を引数に渡さない
  $("preview-btn").addEventListener("click", togglePreview);
  $("richcopy-btn").addEventListener("click", copyRichPreview);
  bindMdflowUI();
  bindConfluenceUI();
  $("refresh-btn").addEventListener("click", () => loadFileList());
  $("file-search").addEventListener("input", onSearch);
  // モードバッジ（🛠 Code → 📋 Plan → 📝 Note の循環）
  $("mode-btn").addEventListener("click", cycleMode);
  // Code モードの進め方（📋 計画を先に / ⚡ 通常）トグル
  $("code-style-btn").addEventListener("click", toggleCodeStyle);
  // 実行計画の承認 / 修正依頼（Plan モード）
  $("plan-approve").addEventListener("click", approvePlan);
  $("plan-reject").addEventListener("click", rejectPlan);
  // Note モード（付箋・履歴・関連ファイル・差分プレビュー）
  $("note-btn").addEventListener("click", addNote);
  $("chat-clear-btn").addEventListener("click", clearHistory);
  setupRefDrop();
  $("ref-add-btn").addEventListener("click", openPickModal);
  $("pick-cancel").addEventListener("click", closePickModal);
  $("pick-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); browsePick($("pick-input").value.trim()); }
  });
  $("pick-modal").addEventListener("click", (e) => {
    if (e.target === $("pick-modal")) closePickModal();  // 背景クリックで閉じる
  });
  // 差分プレビューの確定/キャンセル（Esc でもキャンセル）
  $("diff-apply").addEventListener("click", () => { if (diffApplyFn) diffApplyFn(); });
  $("diff-cancel").addEventListener("click", closeDiffPreview);
  $("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendChat(); }
  });
  // ファイル操作
  $("new-file-btn").addEventListener("click", () => createEntry("file"));
  $("new-folder-btn").addEventListener("click", () => createEntry("dir"));
  $("web2md-btn").addEventListener("click", importUrlAsMarkdown);
  $("cp-bar-open-btn").addEventListener("click", openCopilotFromBar);
  $("cp-bar-import-btn").addEventListener("click", importCopilotChat);
  document.addEventListener("click", closeFsMenu);
  setupRootDrop();
  // ルートプロジェクト（作業フォルダ）変更
  $("root-project-btn").addEventListener("click", openRootModal);
  $("folder-btn").addEventListener("click", openRootModal);
  $("root-cancel").addEventListener("click", closeRootModal);
  $("root-ok").addEventListener("click", chooseWorkspace);
  $("root-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); browseDirs($("root-input").value.trim()); }
  });
  $("root-modal").addEventListener("click", (e) => {
    if (e.target === $("root-modal")) closeRootModal();  // 背景クリックで閉じる
  });
  // 設定（モデル・Copilot）
  $("settings-btn").addEventListener("click", openSettings);
  $("settings-close").addEventListener("click", closeSettings);
  $("settings-think-budget-save").addEventListener("click", saveThinkBudget);
  $("settings-think-budget").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); saveThinkBudget(); }
  });
  $("settings-context-length-save").addEventListener("click", saveContextLength);
  $("settings-context-length").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); saveContextLength(); }
  });
  $("settings-copilot").addEventListener("change", toggleCopilot);
  $("settings-copilot-open").addEventListener("click", openCopilotBrowser);
  $("settings-modal").addEventListener("click", (e) => {
    if (e.target === $("settings-modal")) closeSettings();
  });

  window.addEventListener("keydown", (e) => {
    // Ctrl/Cmd+S はエディタ外（チャット入力・ツリー・モーダル）でも保存にする。
    // エディタ内は Monaco の addCommand が先に拾うのでここには来ない。
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault();  // ブラウザの「ページを保存」を止める
      saveFile();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      togglePreview();
      return;
    }
    if (e.key === "Escape" && !$("root-modal").classList.contains("hidden")) closeRootModal();
    else if (e.key === "Escape" && !$("pick-modal").classList.contains("hidden")) closePickModal();
    else if (e.key === "Escape" && !$("cf-modal").classList.contains("hidden")) $("cf-modal").classList.add("hidden");
    else if (e.key === "Escape" && !$("settings-modal").classList.contains("hidden")) closeSettings();
    else if (e.key === "Escape" && !$("diff-overlay").classList.contains("hidden")) closeDiffPreview();
    // Esc は「修正を依頼」と同じ扱い（計画は捨てずに引っ込めるだけ）
    else if (e.key === "Escape" && !$("plan-overlay").classList.contains("hidden")) rejectPlan();
  });

  // 別ウィンドウへ移るときに保留中の自動保存を確定させる（Note モードのみ動く）。
  window.addEventListener("blur", () => { flushAutosave(); });

  // 未保存のままタブを閉じる経路を塞ぐ。Note は自動保存が効くので通常ここまで来ないが、
  // 保存に失敗したときと、自動保存の無い Code モードでは、ここが最後の砦になる。
  window.addEventListener("beforeunload", (e) => {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = "";  // 一部ブラウザは returnValue を見る
  });

  setupDivider();
  setupPreviewDivider();
  setupVDivider();
}

//: 左右の分割位置は px ではなく比率で覚える（ウィンドウ幅が変わっても配分が保たれる）。
const SPLIT_RATIO_KEY = "pixie.splitRatio";      // #split に対する左ペインの割合
const PREVIEW_RATIO_KEY = "pixie.previewRatio";  // #edit-area に対するエディタの割合

//: #left-pane / #right-pane の min-width（style.css と一致させること）。
const PANE_MIN_W = 320;
//: エディタ／プレビューそれぞれに残す最小幅。
const EDIT_MIN_W = 160;

/**
 * 左右ドラッグの共通実装。仕切りの前にあるペインへ inline の固定幅を書き込む。
 *
 * 可動域から**仕切り自身の幅を引く**のが要点。引かないと右端で合計幅がコンテナを
 * 数 px 超え、min-width で守られた両ペインの代わりに仕切りが 0px まで潰されて
 * 二度と掴めなくなる（style.css 側の flex-shrink:0 と合わせて二重に防ぐ）。
 *
 * @param opts.divider 仕切り要素 / opts.pane 幅を与える側（仕切りの左）
 * @param opts.container 2ペインを収める flex コンテナ
 * @param opts.min 両側に残す最小幅(px) / opts.key 比率の保存キー
 * @param opts.after 反映後に呼ぶ処理（入れ子の分割を追従させる用）
 */
function bindHDivider({ divider, pane, container, min, key, after }) {
  const apply = (px) => {
    // 仕切りが display:none のときは offsetWidth が 0 になるので実測でよい。
    const max = container.clientWidth - min - divider.offsetWidth;
    pane.style.flex = `0 0 ${Math.max(min, Math.min(px, Math.max(min, max)))}px`;
    state.editor?.layout();
    after?.();
  };
  const restore = () => {
    const r = Number(localStorage.getItem(key));
    if (r > 0 && r < 1) apply(container.clientWidth * r);
  };

  let dragging = false;
  divider.addEventListener("mousedown", (e) => {
    e.preventDefault();  // ドラッグ中にテキスト選択が走らないように
    dragging = true;
    document.body.style.cursor = "col-resize";
  });
  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = "";
    localStorage.setItem(key,
      String(pane.getBoundingClientRect().width / container.clientWidth));
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    apply(e.clientX - container.getBoundingClientRect().left);
  });
  divider.addEventListener("dblclick", () => {
    pane.style.flex = "";  // スタイルシートの既定（等分 / 55%）へ戻す
    localStorage.removeItem(key);
    state.editor?.layout();
  });
  // ウィンドウが狭くなると保存済みの幅が可動域を外れる（反対側が min を割る）。
  // 現在幅を入れ直すと apply が clamp してくれる。
  const reclamp = () => { if (pane.style.flex) apply(pane.getBoundingClientRect().width); };
  window.addEventListener("resize", reclamp);
  return { restore, reclamp };
}

let _previewSplit = null;  // プレビュー仕切りの操作口（開いたときに幅を復元する）

/** プレビューを開いたときに、記憶している分割比を復元する。 */
function restorePreviewSplit() {
  _previewSplit?.restore();
}

/** 左ペイン（エディタ）とチャット欄の境界。 */
function setupDivider() {
  const { restore } = bindHDivider({
    divider: $("divider"), pane: $("left-pane"), container: $("split"),
    min: PANE_MIN_W, key: SPLIT_RATIO_KEY,
    // 左ペインが細くなるとプレビュー側が押し出される。エディタは固定幅（flex-shrink:0）
    // なので放っておくとプレビューが 0px に潰れる。現在幅を入れ直して再クランプする。
    after: () => { if (isPreviewOpen()) _previewSplit?.reclamp(); },
  });
  restore();
}

/** エディタと Markdown プレビューの境界（プレビュー表示中のみ有効）。 */
function setupPreviewDivider() {
  _previewSplit = bindHDivider({
    divider: $("preview-divider"), pane: $("editor"), container: $("edit-area"),
    min: EDIT_MIN_W, key: PREVIEW_RATIO_KEY,
  });
  // 復元は「プレビューを開いたとき」に行う（閉じている間はエディタが全幅）。
}

//: ファイル欄の高さ（px）の保存キー。作業フォルダをまたいで同じ使い勝手にしたいので
//  ワークスペース別にはしない。
const FILEMGR_H_KEY = "pixie.filemgrHeight";
const FILEMGR_MIN_H = 80;

/** ファイル欄とチャット欄の境界を上下ドラッグで調整する（ダブルクリックで既定に戻す）。 */
function setupVDivider() {
  const divider = $("v-divider");
  const filemgr = $("filemgr");
  if (!divider || !filemgr) return;

  const apply = (px) => {
    // inline で書くのは、スタイルシート側の max-height:40% に勝たせるため。
    filemgr.style.flex = `0 0 ${px}px`;
    filemgr.style.maxHeight = "none";
  };
  const saved = Number(localStorage.getItem(FILEMGR_H_KEY));
  if (saved >= FILEMGR_MIN_H) apply(saved);

  let dragging = false;
  divider.addEventListener("mousedown", (e) => {
    e.preventDefault();  // ドラッグ中にテキスト選択が走らないように
    dragging = true;
    document.body.style.cursor = "row-resize";
  });
  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = "";
    localStorage.setItem(FILEMGR_H_KEY, String(filemgr.getBoundingClientRect().height));
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const top = filemgr.getBoundingClientRect().top;
    // チャット側にも最低限の高さを残す（送信欄が潰れると操作不能になる）
    const maxH = $("right-pane").getBoundingClientRect().bottom - top - 220;
    apply(Math.max(FILEMGR_MIN_H, Math.min(e.clientY - top, maxH)));
  });
  divider.addEventListener("dblclick", () => {
    filemgr.style.flex = "";
    filemgr.style.maxHeight = "";      // スタイルシートの既定（40%）へ戻す
    localStorage.removeItem(FILEMGR_H_KEY);
  });
}
