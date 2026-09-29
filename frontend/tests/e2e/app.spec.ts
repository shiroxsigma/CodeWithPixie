import { expect, test } from "@playwright/test";

test("Vue shell boots the editor workspace", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/");

  await expect(page.locator("#topbar")).toContainText("CodeWithPixie");
  await expect(page.locator("#chat")).toBeVisible();
  await expect(page.locator("#chat-welcome")).toBeVisible();
  await page.locator("#view-editor-btn").click();
  await expect(page.locator("#left-pane")).toBeVisible();
  await expect(page.locator("#filemgr")).toBeVisible();
  await expect(page.locator("#chat")).toBeVisible();
  await expect(page.locator("#editor .monaco-editor")).toBeVisible({
    timeout: 15_000,
  });

  const rightTop = await page
    .locator("#right-pane")
    .evaluate((el) => el.getBoundingClientRect().top);
  await page.locator("#preview").evaluate((el) => {
    el.classList.remove("hidden");
    el.innerHTML = `<div style="height: 4000px">long markdown</div>`;
    el.scrollTop = 3000;
  });
  const rightTopAfterPreviewScroll = await page
    .locator("#right-pane")
    .evaluate((el) => el.getBoundingClientRect().top);

  expect(rightTopAfterPreviewScroll).toBe(rightTop);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    await page.evaluate(() => window.innerHeight),
  );
  expect(pageErrors).toEqual([]);
});

test("welcome examples prepare the composer and the file drawer works on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/");
  await expect(page.locator("#chat-welcome")).toBeVisible();
  await page
    .getByRole("button", { name: "このプロジェクトの構成を教えて" })
    .click();
  await expect(page.locator("#chat-input")).toHaveValue(
    "このプロジェクトの構成を教えて",
  );
  await page
    .getByRole("button", { name: "小さな改善を一緒に進めたい" })
    .click();
  await expect(page.locator("#chat-input")).toHaveValue(
    "このプロジェクトの構成を教えて",
  );
  await page.locator("#chat-files-btn").click();
  await expect(page.locator("#filemgr")).toBeVisible();
  await expect(page.locator("#chat-files-btn")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator("#file-search")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#filemgr")).toBeHidden();
  await expect(page.locator("#chat-files-btn")).toBeFocused();
  await page.locator("#chat-files-btn").click();
  await page.locator(".brand").click();
  await expect(page.locator("#filemgr")).toBeHidden();
  await page.locator("#view-editor-btn").click();
  await expect(page.locator("#editor .monaco-editor")).toBeVisible();
  await expect(page.locator("#chat-input")).toHaveValue(
    "このプロジェクトの構成を教えて",
  );
  await page.locator("#view-chat-btn").click();
  await expect(page.locator("#chat-input")).toHaveValue(
    "このプロジェクトの構成を教えて",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("a startup issue is visible from chat and opens settings", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: { ready: false, error: "model could not start" },
    }),
  );
  await page.goto("/");
  const issue = page.locator("#connection-issue-btn");
  await expect(issue).toBeVisible();
  await expect(issue).toHaveText("接続を確認してください");
  await expect(issue).toHaveAttribute("title", "model could not start");
  await issue.click();
  await expect(page.locator("#settings-modal")).toBeVisible();
});

test("sending waits until the workspace has finished loading", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/files/list?*", async (route) => {
    await gate;
    await route.fulfill({ json: { root: "C:/test", files: [] } });
  });
  let sent = 0;
  await page.route("**/api/chat", (route) => {
    sent++;
    return route.fulfill({
      contentType: "text/event-stream",
      body: 'data: {"type":"done","status":"completed"}\n\n',
    });
  });
  await page.goto("/");
  await expect(page.locator("#send-btn")).toBeDisabled();
  await page.locator("#chat-input").fill("hello");
  await page.locator("#chat-input").press("Control+Enter");
  expect(sent).toBe(0);
  release();
  await expect(page.locator("#send-btn")).toBeEnabled();
  await page.locator("#send-btn").click();
  await expect.poll(() => sent).toBe(1);
});
