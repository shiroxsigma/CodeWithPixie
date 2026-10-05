import { expect, test } from "@playwright/test";

test("activity stays above the input and measured generation speed survives completion", async ({ page }) => {
  await page.locator("#chat-input").fill("speed check");
  await page.locator("#send-btn").click();
  await expect(page.locator("#composer .wait-indicator")).toContainText("応答を待っています");
  await expect(page.locator("#messages .wait-indicator")).toHaveCount(0);
  await page.evaluate(() => {
    (window as any).emitChat({ type: "status", phase: "thinking" });
  });
  await expect(page.locator("#chat-activity")).toContainText("思考中");
  await page.evaluate(() => {
    (window as any).emitChat({ type: "token", text: "answer" });
  });
  await expect(page.locator("#chat-activity")).toContainText("回答を生成中");
  await page.evaluate(() => {
    (window as any).emitChat({ type: "turn_metrics", metrics: { llm_calls: [
      { decode_tokens: 100, decode_ms: 2000 },
      { decode_tokens: 200, decode_ms: 1000 },
      { decode_tokens: null, decode_ms: null },
    ] } });
    (window as any).emitChat({ type: "done" });
  });
  await expect(page.locator("#chat-activity")).toHaveText("100.0 tokens/sec");
  await expect(page.locator("#messages .response-speed")).toHaveText("100.0 tokens/sec");
  await expect(page.locator("#composer .wait-indicator")).toHaveCount(0);
  await page.locator("#chat-input").fill("next");
  await page.locator("#send-btn").click();
  await expect(page.locator("#chat-activity")).not.toContainText("tokens/sec");
  await page.evaluate(() => (window as any).emitChat({ type: "done" }));
  await expect(page.locator("#chat-activity")).toBeEmpty();
});

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
  await expect(page.locator("#editor .monaco-editor")).toBeAttached({
    timeout: 15_000,
  });
  await expect(page.locator("#chat-welcome")).toBeVisible();
});

test("switching views preserves the running conversation and composer", async ({
  page,
}) => {
  await page.locator("#chat-input").fill("first");
  await page.locator("#send-btn").click();
  await expect(page.locator('[role="status"]')).toHaveText("実行中");
  const original = page.locator("#messages");
  await page.locator("#view-editor-btn").click();
  await expect(page.locator("#editor .monaco-editor")).toBeVisible();
  await page.locator("#view-chat-btn").click();
  await page.evaluate(() => {
    (window as any).emitChat({ type: "token", text: "still running" });
    (window as any).emitChat({ type: "done" });
  });
  await expect(original).toContainText("still running");
  await expect(page.locator('[role="status"]')).toHaveText("完了");
  await page.locator("#chat-input").fill("draft");
  await page.locator("#view-editor-btn").click();
  await page.locator("#view-chat-btn").click();
  await expect(page.locator("#chat-input")).toHaveValue("draft");
});

test("autonomous permission and verification command apply to the selected conversation", async ({
  page,
}) => {
  await page.locator("#autonomous-check").check();
  await page.locator("#verification-command").fill("python -m pytest -q");
  await page.locator("#chat-input").fill("修正して検証");
  await page.locator("#send-btn").click();
  await expect(page.locator('[role="status"]')).toHaveText("実行中");
  const sent = await page.evaluate(() => (window as any).chatRequests[0]);
  expect(sent.autonomous).toBe(true);
  expect(sent.verification_command).toBe("python -m pytest -q");
  await expect(page.locator("#autonomous-check")).toBeDisabled();
  await expect(page.locator("#verification-command")).toBeDisabled();
  await page.evaluate(() => {
    (window as any).emitChat({
      type: "status",
      category: "command",
      phase: "running",
      text: "Command started: pytest",
    });
  });
  await expect(page.locator(".wait-text")).toContainText("ツールを実行中");
  await expect(page.locator("#messages")).toContainText(
    "Command started: pytest",
  );
  await page.evaluate(() => {
    (window as any).emitChat({
      type: "status",
      category: "command",
      phase: "finished",
      text: "Command finished: exit 0",
    });
    (window as any).emitChat({ type: "done", status: "completed" });
  });
  await expect(page.locator('[role="status"]')).toHaveText("完了");
  await page.locator("#new-session-btn").click();
  await expect(page.locator("#autonomous-check")).not.toBeChecked();
  await expect(page.locator("#verification-command")).toHaveValue("");
});

test("mobile approval keeps the diff and decision controls together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  let decision: boolean | undefined;
  await page.route("**/api/approve", (route) => {
    decision = route.request().postDataJSON().approve;
    return route.fulfill({ json: { ok: true } });
  });
  await page.locator("#chat-input").fill("change a file");
  await page.locator("#send-btn").click();
  await page.evaluate(() =>
    (window as any).emitChat({
      type: "approval",
      id: "mobile-approval",
      calls: [
        {
          name: "write_file",
          args: { path: "demo.txt" },
          needs_approval: true,
          preview: { path: "demo.txt", before: "before", after: "after" },
        },
      ],
    }),
  );
  await expect(page.locator("#diff-overlay")).toBeVisible();
  await expect(page.locator("#approval .btn-reject")).toBeVisible();
  await expect(page.locator("#send-btn")).toBeVisible();
  await page.locator("#approval .btn-reject").click();
  await expect.poll(() => decision).toBe(false);
  await page.evaluate(() => (window as any).emitChat({ type: "done" }));
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

test("tool argument generation replaces the thinking indicator", async ({
  page,
}) => {
  await page.locator("#chat-input").fill("create project");
  await page.locator("#send-btn").click();
  await expect(page.locator('[role="status"]')).toHaveText("実行中");
  await page.evaluate(() =>
    (window as any).emitChat({ type: "status", phase: "thinking" }),
  );
  await expect(page.locator(".wait-text")).toContainText("思考中");
  await page.evaluate(() =>
    (window as any).emitChat({ type: "status", phase: "generating" }),
  );
  await expect(page.locator(".wait-text")).toContainText(
    "ツール呼び出しを生成中",
  );
  // Older servers may omit the structured phase metadata.
  await page.evaluate(() => {
    (window as any).emitChat({ type: "status", phase: "thinking" });
    (window as any).emitChat({
      type: "status",
      text: "[System] Generating tool call...",
    });
  });
  await expect(page.locator(".wait-text")).toContainText(
    "ツール呼び出しを生成中",
  );
  await page.evaluate(() => (window as any).emitChat({ type: "done" }));
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
