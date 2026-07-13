// CodeWithPixie フロント。左=Monaco コードエディタ / 右=ファイルツリー + エージェントチャット。
// エージェント(AWP エンジン)が SSE で token/status/approval/files_changed を流す。
// 破壊操作は approval イベントで承認バーを出し、POST /api/approve で解放する。

const $ = (id) => document.getElementById(id);

function newSessionId() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    ("s-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
}

const state = {
  editor: null,
  monaco: null,
  currentFile: null,
  dirty: false,
  streaming: false,
  abort: null,
  assistantEl: null,
  sessionId: newSessionId(),  // このタブ/会話のセッション。並行セッションはサーバ側で分離される。
};

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
function langFor(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  return LANG[ext] || "plaintext";
}

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
  });
  state.editor.onDidChangeModelContent(() => {
    if (state.currentFile) setDirty(true);
  });
  init();
});

async function init() {
  await loadStatus();
  await loadFileList();
  bindUI();
}

// ---- ステータス / モデル ----
async function loadStatus() {
  try {
    const s = await fetch("/api/status").then((r) => r.json());
    $("model-name").textContent = s.ready ? (s.model || "(unset)") : "起動失敗";
    if (!s.ready) {
      $("agent-status").textContent = "  ⚠ " + (s.error || "engine not ready");
    } else {
      $("agent-status").textContent = `  ・${s.tools} tools`;
      $("root-path").textContent = s.workspace;
      $("root-path").title = s.workspace;
    }
  } catch (e) {
    $("model-name").textContent = "接続不可";
  }
}

// ---- ファイルツリー ----
async function loadFileList(changedSet) {
  const data = await fetch("/api/files").then((r) => r.json());
  const ul = $("file-list");
  ul.innerHTML = "";
  for (const f of data.files) {
    const li = document.createElement("li");
    li.className = f.type === "dir" ? "dir" : "file";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = (f.type === "dir" ? "📁 " : "📄 ") + f.path;
    li.appendChild(name);
    if (changedSet && changedSet.has(f.path)) {
      li.classList.add("changed");
      const b = document.createElement("span");
      b.className = "changed-badge";
      b.textContent = "● 変更";
      li.appendChild(b);
    }
    if (f.type === "file") {
      li.onclick = () => openFile(f.path);
      if (f.path === state.currentFile) li.classList.add("active");
    }
    ul.appendChild(li);
  }
}

async function openFile(path, force) {
  if (state.dirty && !force && path !== state.currentFile) {
    if (!confirm("未保存の変更があります。破棄して開きますか？")) return;
  }
  const data = await fetch("/api/file?path=" + encodeURIComponent(path)).then((r) => r.json());
  if (data.detail) { alert(data.detail); return; }
  state.currentFile = path;
  state.monaco.editor.setModelLanguage(state.editor.getModel(), langFor(path));
  state.editor.setValue(data.content);
  setDirty(false);
  $("current-file").textContent = path;
  loadFileList();
}

function setDirty(d) {
  state.dirty = d;
  $("save-state").textContent = d ? "● 未保存" : "";
}

async function saveFile() {
  if (!state.currentFile) return;
  const r = await fetch("/api/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: state.currentFile, content: state.editor.getValue() }),
  }).then((r) => r.json());
  if (r.ok) setDirty(false);
  else alert("保存失敗: " + (r.detail || "unknown"));
}

// ---- 全文検索 ----
let searchTimer = null;
function onSearch() {
  clearTimeout(searchTimer);
  const q = $("file-search").value.trim();
  const box = $("search-results");
  if (!q) { box.classList.add("hidden"); $("file-list").classList.remove("hidden"); return; }
  searchTimer = setTimeout(async () => {
    const data = await fetch("/api/search?q=" + encodeURIComponent(q)).then((r) => r.json());
    box.innerHTML = "";
    for (const hit of data.results) {
      const div = document.createElement("div");
      div.className = "search-hit";
      div.textContent = `${hit.path}:${hit.line}  ${hit.text}`;
      div.onclick = () => openFile(hit.path);
      box.appendChild(div);
    }
    if (!data.results.length) box.innerHTML = "<div class='hint'>該当なし</div>";
    box.classList.remove("hidden");
    $("file-list").classList.add("hidden");
  }, 250);
}

// ---- メッセージ描画 ----
function addMsg(cls, text) {
  const el = document.createElement("div");
  el.className = "msg " + cls;
  el.textContent = text;
  $("messages").appendChild(el);
  $("messages").scrollTop = $("messages").scrollHeight;
  return el;
}

// ---- チャット送信（SSE） ----
async function sendChat() {
  if (state.streaming) return;
  const input = $("chat-input");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  addMsg("user", "🧑 " + msg);
  state.assistantEl = null;
  setStreaming(true);

  state.abort = new AbortController();
  let resp;
  try {
    resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, session_id: state.sessionId }),
      signal: state.abort.signal,
    });
  } catch (e) {
    addMsg("error", "送信失敗: " + e); setStreaming(false); return;
  }
  if (resp.status === 409) { addMsg("error", "エージェントは実行中です。"); setStreaming(false); return; }
  if (!resp.ok) { addMsg("error", "HTTP " + resp.status); setStreaming(false); return; }

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
        const payload = line.slice(5).trim();
        let ev; try { ev = JSON.parse(payload); } catch { continue; }
        handleEvent(ev);
      }
    }
  } catch (e) {
    if (!state.abort.signal.aborted) addMsg("error", "ストリーム中断: " + e);
  }
  setStreaming(false);
}

function handleEvent(ev) {
  switch (ev.type) {
    case "token":
      if (!state.assistantEl) state.assistantEl = addMsg("assistant", "🧚 ");
      state.assistantEl.textContent += ev.text;
      $("messages").scrollTop = $("messages").scrollHeight;
      break;
    case "status":
      addMsg("status", ev.text);
      state.assistantEl = null; // 次の本文は新しい吹き出しに
      break;
    case "approval":
      renderApproval(ev);
      break;
    case "files_changed":
      onFilesChanged(ev.paths);
      break;
    case "error":
      addMsg("error", "⚠ " + ev.text);
      break;
    case "done":
      break;
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
    // run_command / write 系は引数全文を必ず表示（監査指摘）。
    const args = c.args && Object.keys(c.args).length ? JSON.stringify(c.args, null, 2) : "(no args)";
    const flag = c.needs_approval ? '<span class="danger">● 承認必須</span> ' : "";
    div.innerHTML = flag + "<b>" + escapeHtml(c.name) + "</b>\n" + escapeHtml(args);
    box.appendChild(div);
  }

  const row = document.createElement("div");
  row.className = "row";
  const ta = document.createElement("textarea");
  ta.placeholder = "却下して別指示を出す場合はここに入力（任意）";
  const approve = document.createElement("button");
  approve.className = "btn-approve"; approve.textContent = "✓ 承認して実行";
  const reject = document.createElement("button");
  reject.className = "btn-reject"; reject.textContent = "✗ 却下";
  approve.onclick = () => resolveApproval(ev.id, true, null);
  reject.onclick = () => resolveApproval(ev.id, false, ta.value.trim() || null);
  row.appendChild(ta); row.appendChild(approve); row.appendChild(reject);
  box.appendChild(row);
}

async function resolveApproval(id, approve, override) {
  $("approval").classList.add("hidden");
  $("approval").innerHTML = "";
  await fetch("/api/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, approve, override, session_id: state.sessionId }),
  }).catch(() => {});
}

// ---- 変更ファイル反映 ----
async function onFilesChanged(paths) {
  addMsg("status", "📝 変更されたファイル: " + paths.join(", "));
  await loadFileList(new Set(paths));
  // 開いているファイルが変更された場合はライブ再読込（未保存なら確認）。
  if (state.currentFile && paths.includes(state.currentFile)) {
    if (!state.dirty) {
      await openFile(state.currentFile, true);
    } else if (confirm(`${state.currentFile} がエージェントに変更されました。エディタの未保存分を破棄して再読込しますか？`)) {
      await openFile(state.currentFile, true);
    }
  }
}

function setStreaming(on) {
  state.streaming = on;
  $("send-btn").disabled = on;
  $("interrupt-btn").classList.toggle("hidden", !on);
  if (!on) { state.abort = null; state.assistantEl = null; }
}

async function interrupt() {
  await fetch("/api/interrupt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: state.sessionId }),
  }).catch(() => {});
  if (state.abort) state.abort.abort();
}

function newSession() {
  if (state.streaming) { alert("実行中です。中断してから新しい会話を開始してください。"); return; }
  state.sessionId = newSessionId();
  $("messages").innerHTML = "";
  $("approval").classList.add("hidden");
  addMsg("status", "🆕 新しい会話を開始しました（別セッション）。");
  updateSessionInfo();
}

function updateSessionInfo() {
  $("session-info").textContent = "session: " + state.sessionId.slice(0, 8);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

// ---- UI バインド ----
function bindUI() {
  $("send-btn").onclick = sendChat;
  $("new-session-btn").onclick = newSession;
  $("interrupt-btn").onclick = interrupt;
  updateSessionInfo();
  $("save-btn").onclick = saveFile;
  $("refresh-btn").onclick = () => loadFileList();
  $("file-search").oninput = onSearch;
  $("chat-input").addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); sendChat(); }
  });
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "s" || e.key === "S")) { e.preventDefault(); saveFile(); }
  });
  $("new-file-btn").onclick = () => createFs("file");
  $("new-folder-btn").onclick = () => createFs("dir");
  setupDivider();
}

async function createFs(kind) {
  const path = prompt(kind === "dir" ? "新規フォルダのパス:" : "新規ファイルのパス:");
  if (!path) return;
  const r = await fetch("/api/fs/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, kind }),
  }).then((r) => r.json());
  if (r.ok) { await loadFileList(); if (kind === "file") openFile(path, true); }
  else alert("作成失敗: " + (r.detail || "unknown"));
}

function setupDivider() {
  const divider = $("divider"), left = $("left-pane"), split = $("split");
  let dragging = false;
  divider.addEventListener("mousedown", () => { dragging = true; document.body.style.cursor = "col-resize"; });
  window.addEventListener("mouseup", () => { dragging = false; document.body.style.cursor = ""; });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = split.getBoundingClientRect();
    const w = e.clientX - rect.left;
    if (w > 200 && w < rect.width - 260) left.style.flex = `0 0 ${w}px`;
  });
}
