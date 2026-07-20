// CodeWithPixie フロント（統合シェル）。左=Monaco エディタ / 右=ファイルツリー + チャット。
// Code モード: エージェント(AWP エンジン)が SSE で token/status/approval/files_changed を流す。
//   破壊操作は approval イベントで承認バーを出し、POST /api/approve で解放する。
// Note モード: read 専用エージェント。応答の search/replace 提案を extractEdits で拾い、
//   POST /api/patch → Monaco DiffEditor プレビュー → 人間のクリックで反映する（NWP 移植）。
// モードは GET /api/mode（ワークスペース随伴の last_mode）。body.mode-note / mode-code で出し分け。
import { ApiError, getJSON, jsonFetch, postJSON, tryJSON } from "./api.js";
import { available as mdAvailable, renderInto, renderPlain, setAssetBase } from "./markdown.js";
import * as mdflow from "./mdflow.js";
import { $ } from "./dom.js";
import { addMessage, addToolStatus, scrollMessages } from "./chat-log.js";
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
  changedPaths: new Set(),  // 直近ターンでエージェントが変更したファイル
  streaming: false,
  abort: null,
  assistantEl: null,        // 進行中ターンのアシスタント吹き出し
  assistantUi: null,        // beginAssistantStream のハンドル
  sessionId: newSessionId(),  // このタブ/会話のセッション。並行セッションはサーバ側で分離される。

  // --- モード（統合シェル）---
  mode: "code",             // "code" | "note"。GET /api/mode で起動時に取得
  features: {},             // /api/mode の features フラグ（UI 出し分けの判定に使う）

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
};

const isNote = () => state.mode === "note";

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

  state.editor.onDidChangeModelContent(() => { refreshDirty(); schedulePreview(); });
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

function setModeState(m) {
  state.mode = m.mode === "note" ? "note" : "code";
  state.features = m.features || {};
  if (Array.isArray(state.features.extract_exts)) {
    extractExts = new Set(state.features.extract_exts);
  }
}

/** モードに応じた見た目の唯一の反映点。body クラス・バッジ・エディタオプションを揃える。 */
function applyModeUI() {
  const note = isNote();
  document.body.classList.toggle("mode-note", note);
  document.body.classList.toggle("mode-code", !note);
  const btn = $("mode-btn");
  btn.textContent = note ? "📝 Note" : "🛠 Code";
  btn.classList.toggle("mode-note", note);
  btn.classList.toggle("mode-code", !note);
  btn.title = `現在: ${note ? "Note" : "Code"} モード（クリックで切替）`;
  state.editor?.updateOptions({ glyphMargin: note });  // 付箋グリフの余白
  $("sel-info").textContent = note
    ? "テキストを選択してAIに送れます"
    : "エージェントがファイルを直接編集します（破壊操作は承認制）。";
  $("chat-input").placeholder = note
    ? "例）左の選択部分を、チェックした資料を参考にもう少し技術的な表現に。"
    : "例）src/foo.py に入力値を検証する関数を追加して。テストも書いて実行して確認して。";
  renderFileTree();  // コンテキストのチェックボックス有無が変わる
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

async function toggleMode() {
  if (state.streaming) { alert("⚠️ 実行中はモードを切り替えられません。中断してから切り替えてください。"); return; }
  const next = isNote() ? "code" : "note";
  const label = next === "note" ? "📝 Note" : "🛠 Code";
  if (!confirm(`${label} モードに切り替えますか？\n（会話セッションはリセットされます）`)) return;
  let m;
  try {
    m = await postJSON("/api/mode", { mode: next });
  } catch (e) {
    alert("⚠️ モードを切り替えられません: " + e.message);
    return;
  }
  setModeState(m);
  // 旧モードの会話表示・承認バーを持ち越さない（サーバ側もセッションリセット済み）
  $("messages").innerHTML = "";
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
  } else {
    addMessage("system", "🛠 Code モードに切り替えました（自律エージェント・破壊操作は承認制）。");
  }
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
  for (const m of r.messages || []) {
    state.history.push({ role: m.role, content: m.content });
    addMessage(m.role, m.content);
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
  renderFileTree();
  if (isNote()) { await loadNotes(); await loadRefs(); }  // 付箋・関連ファイルはノートに随伴
}

// ---- 保存 ----
// ダーティ判定は Monaco の alternativeVersionId を基準にする。単なる「編集された」
// フラグだと Undo で内容を戻しても未保存のままになるが、この ID は Undo/Redo で
// 元の値に戻るので「保存時と同じ内容か」を正しく表せる。
// NWP と違い自動保存は入れない: エージェントが同じファイルを直接書き換えるため、
// 打鍵2秒後の自動保存はエージェントの編集を黙って踏み潰しうる。
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

// ---- Markdown プレビュー ----
// 既定は非表示。Markdown ファイルを開いているときだけ使える（コードには意味がない）。
const PREVIEW_DEBOUNCE_MS = 150;
let previewTimer = null;

const isPreviewOpen = () => !$("preview").classList.contains("hidden");

function updatePreviewAvailability() {
  const ok = isMarkdown(state.currentFile);
  $("preview-btn").disabled = !ok;
  $("preview-btn").title = ok
    ? "Markdown プレビューを表示 (Ctrl+Shift+P)"
    : "Markdown ファイル（.md）を開いているときだけ使えます";
  if (!ok && isPreviewOpen()) closePreview();
}

function renderPreview() {
  if (!isPreviewOpen()) return;
  // 画像の相対パス（images/foo.png）は現在ファイルのディレクトリ基準で解決させる
  const dir = state.currentFile?.includes("/")
    ? state.currentFile.slice(0, state.currentFile.lastIndexOf("/")) : "";
  setAssetBase(dir);

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

function closePreview() {
  $("preview").classList.add("hidden");
  $("preview-btn").classList.remove("active");
}

function togglePreview() {
  if (!isMarkdown(state.currentFile)) return;
  if (!mdAvailable()) {
    alert("⚠️ Markdown プレビューを使うには、先に次を実行してください:\n"
          + "python -m pipenv run python scripts/fetch_markdown_it.py");
    return;
  }
  if (isPreviewOpen()) { closePreview(); return; }
  $("preview").classList.remove("hidden");
  $("preview-btn").classList.add("active");
  renderPreview();
  // automaticLayout: true なので Monaco 側の再計算は自動で追従する
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
  const sel = state.editor.getSelection();
  return state.editor.getModel().getValueInRange(sel);
}

function updateSelectionChip() {
  if (!isNote()) return;  // Code モードの #sel-info は固定文言（applyModeUI が管理）
  const has = getSelection().trim().length > 0;
  $("sel-chip").classList.toggle("hidden", !has);
  $("sel-info").textContent = has ? "選択中：AIに送れます" : "テキストを選択してAIに送れます";
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

  showWait();
  paint();
  const timer = setInterval(() => { paint(); scrollMessages(); }, 200);

  return {
    onToken(t) {
      raw += t;
      wait.remove();  // 本文が出ている間は待機表示は不要
      // ストリーミング中は生テキストのまま。トークンごとに Markdown を組み直すと
      // 重いうえ、閉じていないフェンスが崩れて見える。整形は finish() で一度だけ行う。
      renderPlain(el.querySelector(".body"), raw);
      scrollMessages();
    },
    /** エンジンのインジケータ（⏳ Prefill / 🧠 Thinking...）を待機表示のフェーズに反映する。 */
    setPhase,
    finish() {
      clearInterval(timer);
      wait.remove();
      // 本文先頭の <think>...</think>（qwen 系が content に混ぜる形式）は表示・履歴・
      // 差分反映の対象から外す。無ければ splitThink は素通しなので Code モードにも無害。
      const { visible } = splitThink(raw);
      // 本文が出揃ったのでここで一度だけ Markdown へ
      if (visible.trim()) renderInto(el.querySelector(".body"), visible);
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

async function sendChat() {
  if (state.streaming) return;
  const input = $("chat-input");
  const msg = input.value.trim();
  if (!msg) return;

  const note = isNote();
  // 反映先の追跡は「送信時の選択範囲」。以降の編集にデコレーションで追随する。
  const applyTarget = note ? trackApplyTarget() : null;
  const body = note
    ? await buildNotePayload(msg)
    : { message: msg, session_id: state.sessionId, current_file: state.currentFile };

  input.value = "";
  addMessage("user", msg);
  // 変更バッジは直近ターンのもの。新しいターンを始めたら畳む。
  if (state.changedPaths.size) { state.changedPaths.clear(); renderFileTree(); }

  state.assistantEl = addMessage("assistant", "");
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
  const visible = finishStream();
  if (note) noteAfterTurn(assistantEl, msg, visible, applyTarget, cancelled);
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
      state.assistantUi?.onToken(ev.text);
      break;
    case "status": {
      const phase = phaseOf(ev.text);
      if (phase) { state.assistantUi?.setPhase(phase); break; }
      // ツール実行行・システム行はログ枠へ。エンジンはツール完了時にこの行を出すので、
      // 直後に次の ⏳ Prefill が来てフェーズは勝手に進む（ここでは触らない）。
      addToolStatus(state.assistantEl, ev.text);
      break;
    }
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
  // Note セッションは SessionManager 管理外（単一セッション）。fetch の中断で
  // SSE ジェネレータの finally が協調キャンセルを送るので、それに任せる。
  if (!isNote()) await postJSON("/api/interrupt", { session_id: state.sessionId }).catch(() => {});
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
  renderInto(el.querySelector(".body"), folded);
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
    await loadStatus();
  };
  await loadModelOptions();
  await refreshCopilot();
  $("settings-modal").classList.remove("hidden");
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
  const parts = [];
  if (c.enabled) parts.push("オン");
  if (!c.script_ok) parts.push("⚠ PrayLight 未検出: " + (c.praylight_dir || "?"));
  else if (!c.python_ok) parts.push("⚠ PrayLight の .venv Python 未検出");
  else if (c.enabled) parts.push("PrayLight OK — 未ログインなら下のボタンでブラウザを開いてログイン");
  $("copilot-status").textContent = parts.join(" / ");
}

async function toggleCopilot(e) {
  try {
    await postJSON("/api/copilot/enable", { enabled: $("settings-copilot").checked });
  } catch (err) {
    alert("⚠️ 設定を保存できません: " + err.message);
    e.target.checked = !e.target.checked;  // 設定できたように見せない
  }
  await refreshCopilot();
}

async function openCopilotBrowser() {
  $("copilot-status").textContent = "起動中…";
  const r = await postJSON("/api/copilot/open").catch(() => ({ ok: false, error: "通信エラー" }));
  $("copilot-status").textContent = r.ok
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
  bindMdflowUI();
  $("refresh-btn").addEventListener("click", () => loadFileList());
  $("file-search").addEventListener("input", onSearch);
  // モードバッジ（📝 Note / 🛠 Code）
  $("mode-btn").addEventListener("click", toggleMode);
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
  $("settings-copilot").addEventListener("change", toggleCopilot);
  $("copilot-open-btn").addEventListener("click", openCopilotBrowser);
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
    else if (e.key === "Escape" && !$("settings-modal").classList.contains("hidden")) closeSettings();
    else if (e.key === "Escape" && !$("diff-overlay").classList.contains("hidden")) closeDiffPreview();
  });

  // 未保存のままタブを閉じる経路を塞ぐ（自動保存が無いぶん、ここが最後の砦になる）。
  window.addEventListener("beforeunload", (e) => {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = "";  // 一部ブラウザは returnValue を見る
  });

  setupDivider();
}

function setupDivider() {
  const divider = $("divider");
  const left = $("left-pane");
  let dragging = false;
  divider.addEventListener("mousedown", () => { dragging = true; document.body.style.cursor = "col-resize"; });
  window.addEventListener("mouseup", () => { dragging = false; document.body.style.cursor = ""; });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const total = $("split").clientWidth;
    const w = Math.max(320, Math.min(e.clientX, total - 320));
    left.style.flex = `0 0 ${w}px`;
    state.editor.layout();
  });
}
