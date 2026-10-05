import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import SourceBundleDialog from "../src/components/SourceBundleDialog.vue";
import {
  bindSourceBundle,
  sourceBundleText,
} from "../src/legacy/source-bundle.js";

const bundle = {
  root: "C:/project",
  filename: "project-source.md",
  content:
    "# Project sources\n\n## src/main.py\n\n```python\nprint('source')\n```",
  file_count: 1,
  total_bytes: 15,
  skipped: [{ path: ".env", reason: "秘密情報を含む可能性" }],
  truncated: false,
};

function response(value: object) {
  return { ok: true, json: async () => value };
}

describe("source bundle dialog", () => {
  let wrapper: ReturnType<typeof mount>;
  let ui: ReturnType<typeof bindSourceBundle>;
  let generation: number;
  let allowed: boolean;
  let fetchMock: ReturnType<typeof vi.fn>;
  let send: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;
  const originalClipboard = Object.getOwnPropertyDescriptor(
    navigator,
    "clipboard",
  );

  beforeEach(() => {
    generation = 1;
    allowed = true;
    document.body.innerHTML =
      '<button id="source-bundle-btn">まとめる</button>';
    wrapper = mount(SourceBundleDialog, { attachTo: document.body });
    fetchMock = vi.fn().mockResolvedValue(response(bundle));
    vi.stubGlobal("fetch", fetchMock);
    send = vi.fn().mockResolvedValue(undefined);
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    ui = bindSourceBundle({
      getSnapshot: () => ({
        current_file: "src/main.py",
        current_content: "unsaved source",
        generation,
      }),
      isCurrent: (value: number) => value === generation,
      canSend: () => allowed,
      send,
    });
  });

  afterEach(() => {
    ui.dispose();
    wrapper.unmount();
    document.body.innerHTML = "";
    if (originalClipboard)
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    else Reflect.deleteProperty(navigator, "clipboard");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function open() {
    document.getElementById("source-bundle-btn")!.click();
    await flushPromises();
  }

  it("collects the current buffer and shows source, counts, and skipped files", async () => {
    await open();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/workspace/source-bundle");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      current_file: "src/main.py",
      current_content: "unsaved source",
    });
    expect(wrapper.get("#source-bundle-root").text()).toBe(bundle.root);
    expect(wrapper.get("#source-bundle-summary").text()).toContain(
      "1 ファイル",
    );
    expect(wrapper.get("#source-bundle-skips-list").text()).toContain(".env");
    expect(
      (wrapper.get("#source-bundle-preview").element as HTMLTextAreaElement)
        .value,
    ).toBe(bundle.content);
    expect(
      wrapper.get("#source-bundle-send").attributes("disabled"),
    ).toBeDefined();
  });

  it("copies the full source with instructions and downloads the same text", async () => {
    await open();
    await wrapper
      .get("#source-bundle-instruction")
      .setValue("  エラーを直して  ");
    await wrapper.get("#source-bundle-copy").trigger("click");
    const expected = sourceBundleText(bundle, "エラーを直して");
    expect(writeText).toHaveBeenCalledWith(expected);
    let downloaded: Blob | undefined;
    const createObjectURL = vi.fn((value: Blob) => {
      downloaded = value;
      return "blob:test";
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        expect(this.download).toBe(bundle.filename);
        expect(this.href).toBe("blob:test");
      });
    vi.useFakeTimers();
    await wrapper.get("#source-bundle-download").trigger("click");
    expect(anchorClick).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    vi.useRealTimers();
    const reader = new FileReader();
    const text = new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
    });
    reader.readAsText(downloaded!);
    expect(await text).toBe(expected);
  });

  it("sends instructions and a file attachment without putting source into the message", async () => {
    await open();
    await wrapper.get("#source-bundle-instruction").setValue("エラーを直して");
    await wrapper.get("#source-bundle-send").trigger("click");
    expect(send).toHaveBeenCalledWith({
      message: "/copilot_simple エラーを直して",
      sourceBundle: { filename: bundle.filename, content: bundle.content },
      attachmentLabel: `${bundle.filename}（1 ファイル）`,
    });
    expect(wrapper.get("#source-bundle-modal").classes()).toContain("hidden");
  });

  it("checks the current Copilot availability again before sending", async () => {
    await open();
    await wrapper.get("#source-bundle-instruction").setValue("直して");
    allowed = false;
    await wrapper.get("#source-bundle-send").trigger("click");
    expect(send).not.toHaveBeenCalled();
    expect(
      wrapper.get("#source-bundle-send").attributes("disabled"),
    ).toBeDefined();
  });

  it("shows request errors and permits retry", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: "読めません" }),
    });
    await open();
    expect(wrapper.get("#source-bundle-status").text()).toContain("読めません");
    expect(
      wrapper.get("#source-bundle-copy").attributes("disabled"),
    ).toBeDefined();
    await wrapper.get("#source-bundle-refresh").trigger("click");
    await flushPromises();
    expect(wrapper.get("#source-bundle-status").text()).toContain(
      "準備ができました",
    );
  });

  it("discards a late response after the project changes", async () => {
    let release!: (value: object) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    document.getElementById("source-bundle-btn")!.click();
    generation++;
    ui.reset();
    release(response(bundle));
    await flushPromises();
    expect(wrapper.get("#source-bundle-modal").classes()).toContain("hidden");
    expect(
      (wrapper.get("#source-bundle-preview").element as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(
      wrapper.get("#source-bundle-copy").attributes("disabled"),
    ).toBeDefined();
  });

  it("marks truncated results and disables exports for an empty collection", async () => {
    fetchMock.mockResolvedValueOnce(response({ ...bundle, truncated: true }));
    await open();
    expect(wrapper.get("#source-bundle-warning").text()).toContain("上限");
    expect(wrapper.get("#source-bundle-warning").classes()).not.toContain(
      "hidden",
    );
    fetchMock.mockResolvedValueOnce(
      response({ ...bundle, file_count: 0, content: "" }),
    );
    await wrapper.get("#source-bundle-refresh").trigger("click");
    await flushPromises();
    expect(wrapper.get("#source-bundle-status").text()).toContain(
      "ソースがありません",
    );
    expect(
      wrapper.get("#source-bundle-download").attributes("disabled"),
    ).toBeDefined();
  });

  it("closes on Escape and returns focus to the project source button", async () => {
    await open();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.get("#source-bundle-modal").classes()).toContain("hidden");
    expect(document.activeElement?.id).toBe("source-bundle-btn");
  });
});
