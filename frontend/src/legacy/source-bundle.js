import { postJSON } from "./api.js";
import { $ } from "./dom.js";

export function sourceBundleText(bundle, instruction = "") {
  const ask = instruction.trim();
  return ask ? `# 修正指示\n\n${ask}\n\n${bundle.content}` : bundle.content;
}

/** Vue が作成したダイアログへ接続する。フォルダ変更時は reset() で結果を破棄する。 */
export function bindSourceBundle({ getSnapshot, isCurrent, canSend, send }) {
  const modal = $("source-bundle-modal");
  const input = $("source-bundle-instruction");
  const preview = $("source-bundle-preview");
  const status = $("source-bundle-status");
  let bundle = null;
  let generation;
  let requestId = 0;
  let loading = false;
  let disposed = false;
  const listeners = [];
  const listen = (el, type, handler) => {
    el.addEventListener(type, handler);
    listeners.push(() => el.removeEventListener(type, handler));
  };

  function update() {
    const available = !loading && bundle?.file_count > 0 && isCurrent(generation);
    $("source-bundle-copy").disabled = !available;
    $("source-bundle-download").disabled = !available;
    $("source-bundle-send").disabled = !available || !input.value.trim() || !canSend();
    $("source-bundle-refresh").disabled = loading;
    preview.value = bundle ? sourceBundleText(bundle, input.value) : "";
  }

  function close() {
    modal.classList.add("hidden");
    $("source-bundle-btn").focus();
  }

  function reset() {
    requestId++;
    loading = false;
    bundle = null;
    generation = undefined;
    input.value = "";
    status.textContent = "";
    $("source-bundle-root").textContent = "";
    $("source-bundle-summary").textContent = "";
    $("source-bundle-skips-list").replaceChildren();
    $("source-bundle-skips").classList.add("hidden");
    $("source-bundle-warning").classList.add("hidden");
    modal.classList.add("hidden");
    update();
  }

  async function generate() {
    const snapshot = getSnapshot();
    const request = ++requestId;
    generation = snapshot.generation;
    loading = true;
    bundle = null;
    status.textContent = "ソースを収集中…";
    $("source-bundle-root").textContent = "";
    $("source-bundle-summary").textContent = "";
    $("source-bundle-warning").classList.add("hidden");
    $("source-bundle-skips").classList.add("hidden");
    update();
    try {
      const result = await postJSON("/api/workspace/source-bundle", {
        current_file: snapshot.current_file,
        current_content: snapshot.current_content,
      });
      if (disposed || request !== requestId) return;
      if (!isCurrent(snapshot.generation)) { reset(); return; }
      bundle = result;
      $("source-bundle-root").textContent = result.root;
      $("source-bundle-summary").textContent =
        `${result.file_count} ファイル・${Number(result.total_bytes).toLocaleString()} バイト`;
      const warning = $("source-bundle-warning");
      warning.textContent = result.truncated
        ? "サイズまたは件数の上限に達しました。一部のソースは含まれていません。"
        : "";
      warning.classList.toggle("hidden", !result.truncated);
      const skipped = result.skipped || [];
      $("source-bundle-skips").classList.toggle("hidden", !skipped.length);
      $("source-bundle-skips-summary").textContent = `除外されたファイル（${skipped.length}件）`;
      const list = $("source-bundle-skips-list");
      list.replaceChildren();
      for (const item of skipped) {
        const li = document.createElement("li");
        li.textContent = `${item.path}: ${item.reason}`;
        list.appendChild(li);
      }
      status.textContent = result.file_count ? "コピー・保存・送信の準備ができました。" : "まとめられるソースがありません。";
    } catch (e) {
      if (disposed || request !== requestId) return;
      if (!isCurrent(snapshot.generation)) { reset(); return; }
      status.textContent = "ソースをまとめられませんでした: " + e.message;
    } finally {
      if (!disposed && request === requestId) {
        loading = false;
        update();
      }
    }
  }

  function available() {
    if (bundle && !loading && isCurrent(generation) && bundle.file_count > 0) return true;
    update();
    return false;
  }

  async function copy() {
    if (!available()) return;
    try {
      await navigator.clipboard.writeText(sourceBundleText(bundle, input.value));
      status.textContent = "コピーしました。Copilot に貼り付けられます。";
    } catch {
      status.textContent = "コピーできませんでした。プレビューを選択してコピーするか、ファイルに保存してください。";
    }
  }

  function download() {
    if (!available()) return;
    const url = URL.createObjectURL(new Blob([sourceBundleText(bundle, input.value)], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = bundle.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "ファイルに保存しました。Copilot に添付できます。";
  }

  async function sendBundle() {
    if (!available()) return;
    update();
    if (!input.value.trim() || !canSend()) return;
    const submission = {
      message: "/copilot_simple " + input.value.trim(),
      sourceBundle: { filename: bundle.filename, content: bundle.content },
      attachmentLabel: `${bundle.filename}（${bundle.file_count} ファイル）`,
    };
    const sending = send(submission);
    close();
    await sending;
  }

  listen($("source-bundle-btn"), "click", () => {
    modal.classList.remove("hidden");
    input.focus();
    generate();
  });
  listen(input, "input", update);
  listen($("source-bundle-close"), "click", close);
  listen($("source-bundle-refresh"), "click", generate);
  listen($("source-bundle-copy"), "click", copy);
  listen($("source-bundle-download"), "click", download);
  listen($("source-bundle-send"), "click", sendBundle);
  listen(modal, "click", (event) => { if (event.target === modal) close(); });
  listen(window, "focus", update);
  listen(window, "keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      event.preventDefault();
      close();
    }
  });
  update();
  return { reset, update, dispose() { disposed = true; reset(); listeners.forEach(remove => remove()); } };
}
