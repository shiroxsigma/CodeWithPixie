import { reactive } from "vue";

export type WorkspaceView = "chat" | "editor";

export const workspaceView = reactive({
  current: "chat" as WorkspaceView,
  ready: false,
  filesOpen: false,
  currentFile: "",
  dirty: false,
  connectionIssue: "",
});

export function showView(view: WorkspaceView) {
  workspaceView.current = view;
  if (view === "editor") workspaceView.filesOpen = false;
  document.body.classList.toggle("view-chat", view === "chat");
  document.body.classList.toggle("view-editor", view === "editor");
  document.body.classList.toggle("chat-files-open", workspaceView.filesOpen);
  if (view === "editor") {
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }
}

export function toggleChatFiles() {
  workspaceView.filesOpen = !workspaceView.filesOpen;
  document.body.classList.toggle("chat-files-open", workspaceView.filesOpen);
  if (workspaceView.filesOpen) {
    requestAnimationFrame(() =>
      document.getElementById("file-search")?.focus(),
    );
  } else {
    document.getElementById("chat-files-btn")?.focus();
  }
}

export function setEditorContext(path: string | null, dirty: boolean) {
  workspaceView.currentFile = path || "";
  workspaceView.dirty = dirty;
}

export function setConnectionIssue(detail: string) {
  workspaceView.connectionIssue = detail;
}

export function setControllerReady() {
  workspaceView.ready = true;
}

// Apply the entry view before the legacy controller finishes loading Monaco.
document.body.classList.add("view-chat");

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !workspaceView.filesOpen) return;
  event.preventDefault();
  workspaceView.filesOpen = false;
  document.body.classList.remove("chat-files-open");
  document.getElementById("chat-files-btn")?.focus();
});

document.addEventListener("pointerdown", (event) => {
  if (!workspaceView.filesOpen) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("#filemgr, #chat-files-btn")) return;
  workspaceView.filesOpen = false;
  document.body.classList.remove("chat-files-open");
});
