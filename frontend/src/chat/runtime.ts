import { computed, reactive, readonly } from "vue";

export type ChatPhase =
  | "idle"
  | "switching"
  | "sending"
  | "running"
  | "approval"
  | "stopping"
  | "completed"
  | "cancelled"
  | "limited"
  | "failed";
export interface ChatRun {
  sessionId: string;
  controller: AbortController;
  interruption?: Promise<unknown>;
  outcome?: string;
}

export function createChatRuntime() {
  const state = reactive({
    sessionId: "",
    phase: "idle" as ChatPhase,
    error: "",
  });
  let active: ChatRun | null = null;
  const busy = computed(() =>
    ["switching", "sending", "running", "approval", "stopping"].includes(
      state.phase,
    ),
  );
  function current(run: ChatRun) {
    return active === run && state.sessionId === run.sessionId;
  }
  return {
    state: readonly(state),
    busy,
    select(sessionId: string, switching?: ChatRun) {
      if (switching && current(switching) && state.phase === "switching") {
        switching.sessionId = sessionId;
        state.sessionId = sessionId;
        return;
      }
      if (busy.value) throw new Error("実行中は会話を切り替えられません。");
      active = null;
      state.sessionId = sessionId;
      state.phase = "idle";
      state.error = "";
    },
    begin(phase: "sending" | "switching" = "sending"): ChatRun | null {
      if (busy.value) return null;
      active = {
        sessionId: state.sessionId,
        controller: new AbortController(),
      };
      state.phase = phase;
      state.error = "";
      return active;
    },
    current,
    get active() {
      return active;
    },
    phase(run: ChatRun, phase: "running" | "approval") {
      if (current(run) && !run.controller.signal.aborted) state.phase = phase;
    },
    stop() {
      if (!active || !busy.value) return null;
      state.phase = "stopping";
      active.controller.abort();
      return active;
    },
    finish(run: ChatRun, error = "") {
      if (!current(run)) return;
      state.error = error;
      state.phase =
        run.controller.signal.aborted || run.outcome === "cancelled"
          ? "cancelled"
          : run.outcome === "limit_reached"
            ? "limited"
            : error
              ? "failed"
              : "completed";
      active = null;
    },
  };
}

export const chatRuntime = createChatRuntime();

export async function consumeChatStream(
  response: Response,
  run: ChatRun,
  current: (run: ChatRun) => boolean,
  onEvent: (event: Record<string, any>) => Promise<void>,
) {
  if (!response.body) throw new Error("応答ストリームがありません。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  let serverError = "";
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  run.controller.signal.addEventListener("abort", cancel, { once: true });
  try {
    while (!completed) {
      if (!current(run) || run.controller.signal.aborted) return;
      const { value, done } = await reader.read();
      if (!current(run) || run.controller.signal.aborted) return;
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || "";
      for (const frame of frames) {
        if (!current(run) || run.controller.signal.aborted) return;
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        const event = JSON.parse(data);
        if (event.type === "error")
          serverError = event.text || "実行に失敗しました。";
        await onEvent(event);
        if (event.type === "done") {
          run.outcome = event.status;
          if (event.status === "failed" || event.status === "limit_reached") {
            const reasons: Record<string, string> = {
              turn_timeout: "依頼全体の制限時間に達しました。",
              stream_timeout: "LLM応答の制限時間に達しました。",
              llm_calls_limit: "LLM呼び出し回数の上限に達しました。",
              tool_calls_limit: "ツール実行回数の上限に達しました。",
            };
            serverError =
              reasons[event.reason] || event.reason || "実行に失敗しました。";
          }
          completed = true;
          break;
        }
      }
      if (done) break;
    }
    if (serverError) throw new Error(serverError);
    if (!completed) throw new Error("完了通知を受信する前に接続が切れました。");
  } finally {
    run.controller.signal.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
