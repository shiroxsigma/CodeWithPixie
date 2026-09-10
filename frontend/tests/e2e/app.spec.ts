import { expect, test } from "@playwright/test";

test("Vue shell boots the editor workspace", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/");

  await expect(page.locator("#topbar")).toContainText("CodeWithPixie");
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
