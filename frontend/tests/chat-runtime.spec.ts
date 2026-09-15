import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import {
  chatRuntime,
  createChatRuntime,
  consumeChatStream,
} from "../src/chat/runtime";
import WorkspaceShell from "../src/components/WorkspaceShell.vue";

function setup() {
  const runtime = createChatRuntime();
  runtime.select("first");
  return { runtime, run: runtime.begin()! };
}
function response(...chunks: string[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) =>
          controller.enqueue(new TextEncoder().encode(chunk)),
        );
        controller.close();
      },
    }),
  );
}

describe("chat lifecycle", () => {
  it("locks sending preparation and conversation selection", () => {
    const { runtime, run } = setup();
    expect(runtime.busy.value).toBe(true);
    expect(runtime.begin()).toBeNull();
    expect(() => runtime.select("second")).toThrow();
    runtime.finish(run);
    runtime.select("second");
    expect(runtime.state.sessionId).toBe("second");
  });

  it("ignores old completion and phase updates after switching", () => {
    const { runtime, run } = setup();
    runtime.finish(run);
    runtime.select("second");
    runtime.begin();
    runtime.finish(run, "old error");
    runtime.phase(run, "approval");
    expect(runtime.state.phase).toBe("sending");
    expect(runtime.state.error).toBe("");
  });

  it("aborts immediately and prevents approval from undoing cancellation", () => {
    const { runtime, run } = setup();
    runtime.stop();
    expect(run.controller.signal.aborted).toBe(true);
    runtime.phase(run, "running");
    expect(runtime.state.phase).toBe("stopping");
    runtime.finish(run);
    expect(runtime.state.phase).toBe("cancelled");
    expect(runtime.busy.value).toBe(false);
  });

  it("renders Vue controls from lifecycle state", async () => {
    chatRuntime.select("ui");
    const wrapper = mount(WorkspaceShell);
    const run = chatRuntime.begin()!;
    await nextTick();
    expect(wrapper.get("#send-btn").text()).toBe("停止");
    chatRuntime.phase(run, "approval");
    await nextTick();
    expect(wrapper.get('[role="status"]').text()).toBe("承認待ち");
    chatRuntime.stop();
    await nextTick();
    expect(wrapper.get("#send-btn").attributes("disabled")).toBeDefined();
    chatRuntime.finish(run);
    await nextTick();
    expect(wrapper.get("#send-btn").text()).toBe("送信");
    expect(wrapper.get("#send-btn").attributes("disabled")).toBeUndefined();
    wrapper.unmount();
  });
});

describe("chat stream", () => {
  it("parses chunk boundaries and awaits file refresh before completion", async () => {
    const { runtime, run } = setup();
    const events: string[] = [];
    await consumeChatStream(
      response(
        'data: {"type":"files_',
        'changed"}\r\n\r\ndata: {"type":"done"}\r\n\r\n',
      ),
      run,
      runtime.current,
      async (event) => {
        await Promise.resolve();
        events.push(event.type);
      },
    );
    expect(events).toEqual(["files_changed", "done"]);
  });

  it("rejects EOF without done, allowing the UI to show failure", async () => {
    const { runtime, run } = setup();
    await expect(
      consumeChatStream(
        response('data: {"type":"token","text":"partial"}\n\n'),
        run,
        runtime.current,
        vi.fn(),
      ),
    ).rejects.toThrow("完了通知");
  });

  it("does not treat an error followed by done as success", async () => {
    const { runtime, run } = setup();
    await expect(
      consumeChatStream(
        response(
          'data: {"type":"error","text":"failed"}\n\ndata: {"type":"done"}\n\n',
        ),
        run,
        runtime.current,
        vi.fn(),
      ),
    ).rejects.toThrow("failed");
  });

  it("releases a pending reader when stopped", async () => {
    const { runtime, run } = setup();
    const cancel = vi.fn();
    const onEvent = vi.fn();
    const reading = consumeChatStream(
      new Response(new ReadableStream({ cancel })),
      run,
      runtime.current,
      onEvent,
    );
    runtime.stop();
    await reading;
    expect(cancel).toHaveBeenCalledOnce();
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("drops a late chunk from the previous conversation", async () => {
    const { runtime, run } = setup();
    let stream!: ReadableStreamDefaultController;
    const onEvent = vi.fn();
    const reading = consumeChatStream(
      new Response(
        new ReadableStream({
          start(controller) {
            stream = controller;
          },
        }),
      ),
      run,
      runtime.current,
      onEvent,
    );
    runtime.finish(run);
    runtime.select("second");
    runtime.begin();
    stream.enqueue(
      new TextEncoder().encode('data: {"type":"token","text":"old"}\n\n'),
    );
    await reading;
    expect(onEvent).not.toHaveBeenCalled();
    expect(runtime.state.phase).toBe("sending");
  });
});
