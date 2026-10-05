import { expect, test, type Page } from "@playwright/test";

const source =
  "# Project sources\n\n## src/main.py\n\n```python\nprint('full source')\n```";

async function setup(page: Page, copilot = true) {
  const chat: Record<string, unknown>[] = [];
  const bundles: Record<string, unknown>[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.method() === "POST" ? request.postDataJSON() : null;
    let json: object = {};
    if (url.pathname === "/api/mode")
      json = { mode: "code", features: { copilot } };
    if (url.pathname === "/api/status")
      json = { ready: true, workspace: "C:/project", tools: 0 };
    if (url.pathname === "/api/files/list")
      json = {
        root: "C:/project",
        files: [{ path: "src/main.py", type: "file", text: true }],
      };
    if (url.pathname === "/api/file")
      json = { content: "print('saved')", mtime: 1 };
    if (url.pathname === "/api/workspace/source-bundle") {
      bundles.push(body);
      json = {
        root: "C:/project",
        filename: "project-source.md",
        content: source,
        file_count: 1,
        total_bytes: source.length,
        skipped: [{ path: ".env", reason: "秘密情報" }],
        truncated: false,
      };
    }
    if (url.pathname === "/api/chat") {
      chat.push(body);
      return route.fulfill({
        contentType: "text/event-stream",
        body: 'data: {"type":"token","text":"Copilot mock response"}\n\ndata: {"type":"done","status":"completed"}\n\n',
      });
    }
    await route.fulfill({ json });
  });
  await page.goto("/");
  await expect(page.locator("#source-bundle-btn")).toBeEnabled();
  return { chat, bundles };
}

test("bundles the current unsaved buffer and sends an attachment while preserving the draft", async ({
  page,
}) => {
  const { chat, bundles } = await setup(page);
  await page.locator("#view-editor-btn").click();
  await page.locator('#file-list li[data-path="src/main.py"]').click();
  await expect(page.locator("#current-file")).toContainText("src/main.py");
  await page.evaluate(async () => {
    const monaco = await (window as any).__monacoReady;
    monaco.editor.getModels()[0].setValue("print('unsaved')");
  });
  await page.locator("#chat-input").fill("別の相談の下書き");
  await page.locator("#source-bundle-btn").click();
  await expect(page.locator("#source-bundle-preview")).toHaveValue(source);
  expect(bundles[0]).toEqual({
    current_file: "src/main.py",
    current_content: "print('unsaved')",
  });
  await expect(page.locator("#source-bundle-skips-summary")).toContainText(
    "1件",
  );
  await expect(page.locator("#source-bundle-send")).toBeDisabled();
  await page
    .locator("#source-bundle-instruction")
    .fill("読み込みのエラーを直して");
  await page.locator("#source-bundle-send").click();
  await expect.poll(() => chat.length).toBe(1);
  expect(chat[0]).toEqual({
    message: "/copilot_simple 読み込みのエラーを直して",
    session_id: expect.any(String),
    source_bundle: { filename: "project-source.md", content: source },
  });
  await expect(page.locator("#source-bundle-modal")).toBeHidden();
  await expect(page.locator("#chat-input")).toHaveValue("別の相談の下書き");
  await expect(page.locator("#messages")).toContainText(
    "添付: project-source.md（1 ファイル）",
  );
  await expect(page.locator("#messages")).toContainText(
    "Copilot mock response",
  );
  await expect(page.locator("#messages")).not.toContainText("full source");
});

test("downloads source with instructions on mobile without requiring Copilot", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  const { chat } = await setup(page, false);
  await page.locator("#source-bundle-btn").click();
  await expect(page.locator("#source-bundle-preview")).toHaveValue(source);
  await page
    .locator("#source-bundle-instruction")
    .fill("動作を説明してください");
  await expect(page.locator("#source-bundle-preview")).toHaveValue(
    "# 修正指示\n\n動作を説明してください\n\n" + source,
  );
  await expect(page.locator("#source-bundle-send")).toBeDisabled();
  const downloadEvent = page.waitForEvent("download");
  await page.locator("#source-bundle-download").click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("project-source.md");
  expect(chat).toHaveLength(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(page.locator("#source-bundle-modal")).toBeHidden();
  await expect(page.locator("#source-bundle-btn")).toBeFocused();
});
