import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pixie.codeStyle", "normal");
    const original = window.fetch.bind(window);
    (window as any).chatRequests = [];
    window.fetch = async (input, init) => {
      if (input === "/api/chat") {
        (window as any).chatRequests.push(JSON.parse(init!.body as string));
        return new Response(
          new ReadableStream({
            start(controller) {
              (window as any).chatStream = controller;
            },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        );
      }
      return original(input, init);
    };
    (window as any).emitChat = (event: object) => {
      (window as any).chatStream.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
      );
    };
  });
  await page.route("**/api/mode", (route) =>
    route.fulfill({ json: { mode: "code", features: {} } }),
  );
  await page.route("**/api/code-chat/log", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.goto("/");
  await expect(page.locator("#editor .monaco-editor")).toBeVisible({
    timeout: 15_000,
  });
});

test("unexpected EOF shows failure and the next turn can complete", async ({
  page,
}) => {
  await page.locator("#chat-input").fill("first");
  await page.locator("#send-btn").click();
  await expect(page.locator('[role="status"]')).toHaveText("実行中");
  await page.evaluate(() => {
    (window as any).emitChat({ type: "token", text: "partial" });
    (window as any).chatStream.close();
  });
  await expect(page.locator('[role="status"]')).toHaveText("失敗");
  await expect(page.locator("#send-btn")).toHaveText("送信");
  await page.locator("#chat-input").fill("second");
  await page.locator("#send-btn").click();
  await expect(page.locator('[role="status"]')).toHaveText("実行中");
  await page.evaluate(() => {
    (window as any).emitChat({ type: "token", text: "complete" });
    (window as any).emitChat({ type: "done" });
  });
  await expect(page.locator('[role="status"]')).toHaveText("完了");
});

test("failed approval remains available for retry", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/approve", (route) => {
    attempts++;
    return route.fulfill(
      attempts === 1
        ? { status: 500, json: { detail: "retry approval" } }
        : { json: { ok: true } },
    );
  });
  await page.locator("#chat-input").fill("approval");
  await page.locator("#send-btn").click();
  await expect(page.locator('[role="status"]')).toHaveText("実行中");
  await page.evaluate(() =>
    (window as any).emitChat({ type: "approval", id: "approval-1", calls: [] }),
  );
  await expect(page.locator('[role="status"]')).toHaveText("承認待ち");
  await page.locator("#approval .btn-approve").click();
  await expect(page.locator("#messages")).toContainText("retry approval");
  await expect(page.locator("#approval .btn-approve")).toBeEnabled();
  await page.locator("#approval .btn-approve").click();
  await expect(page.locator("#approval")).toBeHidden();
  await expect(page.locator('[role="status"]')).toHaveText("実行中");
  await page.evaluate(() => (window as any).emitChat({ type: "done" }));
  await expect(page.locator('[role="status"]')).toHaveText("完了");
});

test("stop cancels the reader and addresses the original conversation", async ({
  page,
}) => {
  let interrupted = "";
  await page.route("**/api/interrupt", (route) => {
    interrupted = route.request().postDataJSON().session_id;
    return route.fulfill({ json: { ok: true } });
  });
  await page.locator("#chat-input").fill("stop");
  await page.locator("#send-btn").click();
  await expect(page.locator('[role="status"]')).toHaveText("実行中");
  const session = await page.evaluate(
    () => (window as any).chatRequests[0].session_id,
  );
  await page.locator("#send-btn").click();
  await expect(page.locator('[role="status"]')).toHaveText("中断しました");
  await expect(page.locator("#send-btn")).toBeEnabled();
  expect(interrupted).toBe(session);
});

test("restoring a conversation blocks sending until its history is ready", async ({
  page,
}) => {
  let release!: () => void;
  const waitForRestore = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/code-chat/sessions", (route) =>
    route.fulfill({
      json: {
        sessions: [
          {
            session_id: "restored-session",
            title: "Saved conversation",
            updated_at: "2026-09-12",
            messages: 1,
          },
        ],
      },
    }),
  );
  await page.route("**/api/code-chat/session?*", (route) =>
    route.fulfill({
      json: { messages: [{ role: "assistant", content: "restored history" }] },
    }),
  );
  await page.route("**/api/code-chat/restore", async (route) => {
    await waitForRestore;
    await route.fulfill({ json: { ok: true } });
  });
  await page.locator("#sessions-btn").click();
  await page.getByText("Saved conversation", { exact: true }).click();
  await expect(page.locator('[role="status"]')).toHaveText("会話切替中");
  await expect(page.locator("#send-btn")).toBeDisabled();
  await page.locator("#chat-input").fill("continue");
  await page.locator("#chat-input").press("Control+Enter");
  expect(await page.evaluate(() => (window as any).chatRequests.length)).toBe(
    0,
  );
  release();
  await expect(page.locator("#messages")).toContainText("restored history");
  await expect(page.locator("#send-btn")).toBeEnabled();
  await page.locator("#send-btn").click();
  await expect(page.locator('[role="status"]')).toHaveText("実行中");
  expect(
    await page.evaluate(() => (window as any).chatRequests[0].session_id),
  ).toBe("restored-session");
  await page.evaluate(() => (window as any).emitChat({ type: "done" }));
  await expect(page.locator('[role="status"]')).toHaveText("完了");
});
