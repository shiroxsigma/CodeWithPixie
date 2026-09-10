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
  expect(pageErrors).toEqual([]);
});
