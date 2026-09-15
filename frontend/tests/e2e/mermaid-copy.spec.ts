import { expect, test } from "@playwright/test";

const testPath = "__e2e_mermaid_white_copy.md";
const source = "```mermaid\nflowchart LR\n  A[Start] --> B[Finish]\n```\n";

test("Mermaid の白背景コピーは白い PNG をクリップボードへ書き込む", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        write: async (items: unknown[]) => {
          (
            window as Window & { __mermaidClipboard?: unknown[] }
          ).__mermaidClipboard = items;
        },
      },
    });
  });

  const create = await page.request.post("/api/fs/create", {
    data: { path: testPath, kind: "file" },
  });
  expect(create.ok()).toBeTruthy();
  const write = await page.request.post("/api/file", {
    data: { path: testPath, content: source },
  });
  expect(write.ok()).toBeTruthy();

  try {
    await page.goto("/");
    await expect(page.locator("#editor .monaco-editor")).toBeVisible({
      timeout: 15_000,
    });
    await page.locator("#refresh-btn").click();
    const file = page.locator(`#file-list li[data-path="${testPath}"]`);
    await expect(file).toBeVisible();
    await file.click();
    await page.locator("#preview-btn").click();

    const diagram = page.locator(".mermaid-box").first();
    await expect(diagram.locator("svg")).toBeVisible({ timeout: 15_000 });
    await diagram.hover();
    const copyWhite = diagram.getByRole("button", { name: "白でコピー" });
    await expect(copyWhite).toBeVisible();
    await copyWhite.click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(
            (window as Window & { __mermaidClipboard?: unknown[] })
              .__mermaidClipboard,
          ),
        ),
      )
      .toBeTruthy();
    const firstPixel = await page.evaluate(async () => {
      const [item] = (
        window as Window & { __mermaidClipboard: ClipboardItem[] }
      ).__mermaidClipboard;
      const blob = await item.getType("image/png");
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("PNG could not be decoded"));
          image.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D context is unavailable");
        context.drawImage(image, 0, 0);
        return [...context.getImageData(0, 0, 1, 1).data];
      } finally {
        URL.revokeObjectURL(url);
      }
    });
    expect(firstPixel).toEqual([255, 255, 255, 255]);
  } finally {
    const deleted = await page.request.post("/api/fs/delete", {
      data: { path: testPath },
    });
    expect(deleted.ok()).toBeTruthy();
  }
});
