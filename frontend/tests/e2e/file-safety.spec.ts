import { expect, test, type Page, type Route } from "@playwright/test";

// Every API is intercepted: these tests never write to the user's workspace.
async function setup(page: Page, mode = "code") {
  const disk: Record<string, string> = { "a.txt": "old A", "b.txt": "old B" };
  const calls: { path: string; body: any }[] = [];
  let root = "C:/mock-workspace";
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const body = req.method() === "POST" ? req.postDataJSON() : null;
    calls.push({ path: url.pathname, body });
    let json: object = {};
    if (url.pathname === "/api/mode") json = { mode, features: {} };
    if (url.pathname === "/api/status")
      json = { ready: true, workspace: root, tools: 0 };
    if (url.pathname === "/api/files/list")
      json = {
        root,
        files: Object.keys(disk).map((path) => ({
          path,
          type: "file",
          text: true,
        })),
      };
    if (url.pathname === "/api/file") {
      const path = body?.path || url.searchParams.get("path")!;
      if (body) disk[path] = body.content;
      json = { content: disk[path], mtime: 1 };
    }
    if (url.pathname === "/api/search")
      json = {
        results: [
          {
            path: "a.txt",
            line: 1,
            text: disk["a.txt"],
            before: [],
            after: [],
          },
        ],
      };
    if (url.pathname === "/api/search/replace") {
      if (!body.dry_run)
        for (const path of body.paths)
          disk[path] = disk[path].replaceAll(body.query, body.replace);
      json = {
        total: 1,
        changed_files: 1,
        files: [{ path: "a.txt", count: 1, samples: [] }],
      };
    }
    if (url.pathname === "/api/workspace/places")
      json = { favorites: [], recent: [], current: root };
    if (url.pathname === "/api/workspace/dirs")
      json = { cwd: root, dirs: [], drives: [] };
    if (url.pathname === "/api/workspace") {
      root = body.path;
      json = { workspace: root };
    }
    await route.fulfill({ json });
  });
  page.on("dialog", (dialog) =>
    dialog.message().includes("別の場所") ? dialog.dismiss() : dialog.accept(),
  );
  await page.goto("/");
  await expect(page.locator('#file-list li[data-path="a.txt"]')).toBeVisible();
  await expect(page.locator("#editor .monaco-editor")).toBeVisible();
  return { disk, calls };
}

async function editorText(page: Page) {
  return page.evaluate(async () =>
    (await (window as any).__monacoReady).editor.getModels()[0].getValue(),
  );
}

async function edit(page: Page, text: string) {
  await page.evaluate(async (value) => {
    (await (window as any).__monacoReady).editor.getModels()[0].setValue(value);
  }, text);
}

async function open(page: Page, path = "a.txt") {
  await page.locator(`#file-list li[data-path="${path}"] .fname`).click();
  await expect(page.locator("#current-file")).toHaveText(path);
}

async function prepareReplace(page: Page) {
  await page.locator("#file-search").fill("old");
  await expect(page.locator("#search-results .search-hit")).toHaveCount(1);
  await page.locator("#replace-toggle").click();
  await page.locator("#replace-input").fill("new");
}

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function delayResponse(page: Page, pattern: string) {
  const gate = deferred();
  const arrived = deferred();
  const finished = deferred();
  await page.route(pattern, async (route: Route) => {
    arrived.release();
    await gate.promise;
    await route.fallback();
    finished.release();
  });
  return { gate, arrived, finished };
}

test("latest file selection wins when older reads finish late", async ({
  page,
}) => {
  await setup(page);
  const delayed = await delayResponse(page, "**/api/file?path=a.txt");
  await page.locator('#file-list li[data-path="a.txt"] .fname').click();
  await delayed.arrived.promise;
  await open(page, "b.txt");
  await edit(page, "B unsaved");
  const response = page.waitForResponse("**/api/file?path=a.txt");
  delayed.gate.release();
  await (await response).finished();
  await expect.poll(() => editorText(page)).toBe("B unsaved");
  await expect(page.locator("#current-file")).toHaveText("b.txt");
  await expect(page.locator("#save-state")).toContainText("未保存");
});

test("typing while a file is loading keeps the current buffer", async ({
  page,
}) => {
  await setup(page);
  await open(page);
  const delayed = await delayResponse(page, "**/api/file?path=b.txt");
  await page.locator('#file-list li[data-path="b.txt"] .fname').click();
  await delayed.arrived.promise;
  await edit(page, "A unsaved");
  const response = page.waitForResponse("**/api/file?path=b.txt");
  delayed.gate.release();
  await (await response).finished();
  await expect.poll(() => editorText(page)).toBe("A unsaved");
  await expect(page.locator("#current-file")).toHaveText("a.txt");
});

test("reads from the previous workspace cannot replace the new editor", async ({
  page,
}) => {
  await setup(page);
  const delayed = await delayResponse(page, "**/api/file?path=a.txt");
  await page.locator('#file-list li[data-path="a.txt"] .fname').click();
  await delayed.arrived.promise;
  await page.locator("#folder-btn").click();
  await expect(page.locator("#root-input")).toHaveValue("C:/mock-workspace");
  await page.locator("#root-input").fill("C:/other-mock-workspace");
  await page.locator("#root-ok").click();
  await expect(page.locator("#root-path")).toHaveText(
    "C:/other-mock-workspace",
  );
  await expect(page.locator("#send-btn")).toBeEnabled();
  await open(page, "b.txt");
  const response = page.waitForResponse("**/api/file?path=a.txt");
  delayed.gate.release();
  await (await response).finished();
  await expect.poll(() => editorText(page)).toBe("old B");
  await expect(page.locator("#current-file")).toHaveText("b.txt");
});

test("Code replacement saves dirty edits before replacing", async ({
  page,
}) => {
  const { disk, calls } = await setup(page);
  await open(page);
  await prepareReplace(page);
  await edit(page, "old A with unsaved edits");
  await page.locator("#replace-run-btn").click();
  await expect(page.locator("#replace-status")).toContainText("置換しました");
  expect(disk["a.txt"]).toBe("new A with unsaved edits");
  expect(
    calls
      .filter(
        (call) =>
          call.body && ["/api/file", "/api/search/replace"].includes(call.path),
      )
      .map((call) => call.path),
  ).toEqual(["/api/file", "/api/search/replace"]);
  await expect.poll(() => editorText(page)).toBe("new A with unsaved edits");
});

for (const mode of ["code", "note"])
  for (const status of [500, 409]) {
    test(`${mode} replacement stops when saving returns ${status}`, async ({
      page,
    }) => {
      const { disk, calls } = await setup(page, mode);
      await open(page);
      await prepareReplace(page);
      await page.route("**/api/file", (route) =>
        route.fulfill({ status, json: { detail: "save failed" } }),
      );
      await edit(page, "old A unsaved");
      await page.locator("#replace-run-btn").click();
      await expect(page.locator("#replace-status")).toContainText("置換を中止");
      expect(
        calls.filter((call) => call.path === "/api/search/replace"),
      ).toHaveLength(0);
      expect(disk["a.txt"]).toBe("old A");
      await expect.poll(() => editorText(page)).toBe("old A unsaved");
    });
  }

test("typing during replacement keeps edits and blocks automatic overwrites", async ({
  page,
}) => {
  const { disk } = await setup(page, "note");
  await open(page);
  await prepareReplace(page);
  const delayed = await delayResponse(page, "**/api/search/replace");
  await page.locator("#replace-run-btn").click();
  await delayed.arrived.promise;
  await edit(page, "old A with concurrent edits");
  delayed.gate.release();
  await expect(page.locator("#replace-status")).toContainText("置換しました");
  expect(disk["a.txt"]).toBe("new A");
  await expect.poll(() => editorText(page)).toBe("old A with concurrent edits");
  await expect(page.locator("#save-state")).toHaveAttribute(
    "title",
    /処理中の編集は保持/,
  );
});

test("late search responses cannot restore stale replacement targets", async ({
  page,
}) => {
  await setup(page);
  const delayed = await delayResponse(page, "**/api/search?q=old&case=false");
  await page.locator("#file-search").fill("old");
  await delayed.arrived.promise;
  await page.route("**/api/search?q=new&case=false", (route) =>
    route.fulfill({
      json: {
        results: [
          { path: "b.txt", line: 1, text: "new B", before: [], after: [] },
        ],
      },
    }),
  );
  await page.locator("#file-search").fill("new");
  await expect(page.locator("#search-results")).toContainText("b.txt");
  const response = page.waitForResponse("**/api/search?q=old&case=false");
  delayed.gate.release();
  await (await response).finished();
  await expect(page.locator("#search-results")).toContainText("b.txt");
  await expect(page.locator("#search-results")).not.toContainText("a.txt");
});

test("workspace switch blocks saving and editing until the response arrives", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await open(page);
  const delayed = await delayResponse(page, "**/api/workspace");
  await page.locator("#folder-btn").click();
  await page.locator("#root-input").fill("C:/other-mock-workspace");
  await page.locator("#root-ok").click();
  await delayed.arrived.promise;
  await page.evaluate(() =>
    (document.getElementById("save-btn") as HTMLButtonElement).click(),
  );
  expect(
    calls.filter((call) => call.path === "/api/file" && call.body),
  ).toHaveLength(0);
  expect(
    await page.evaluate(async () => {
      const monaco = await (window as any).__monacoReady;
      return monaco.editor
        .getEditors()[0]
        .getOption(monaco.editor.EditorOption.readOnly);
    }),
  ).toBe(true);
  delayed.gate.release();
  await expect(page.locator("#root-path")).toHaveText(
    "C:/other-mock-workspace",
  );
  await expect(page.locator("#send-btn")).toBeEnabled();
  expect(
    await page.evaluate(async () => {
      const monaco = await (window as any).__monacoReady;
      return monaco.editor
        .getEditors()[0]
        .getOption(monaco.editor.EditorOption.readOnly);
    }),
  ).toBe(false);
});

test("Code workspace switch waits for an in-flight manual save", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await open(page);
  await edit(page, "saved in original workspace");
  const delayed = await delayResponse(page, "**/api/file");
  await page.locator("#save-btn").click();
  await delayed.arrived.promise;
  await page.locator("#folder-btn").click();
  await page.locator("#root-input").fill("C:/other-mock-workspace");
  await page.locator("#root-ok").click();
  await expect(page.locator('[role="status"]')).toHaveText("会話切替中");
  expect(calls.filter((call) => call.path === "/api/workspace")).toHaveLength(
    0,
  );
  delayed.gate.release();
  await expect(page.locator("#root-path")).toHaveText(
    "C:/other-mock-workspace",
  );
  const writes = calls.filter(
    (call) =>
      call.path === "/api/workspace" ||
      (call.path === "/api/file" && call.body),
  );
  expect(writes.map((call) => call.path)).toEqual([
    "/api/file",
    "/api/workspace",
  ]);
});

for (const dirty of [false, true]) {
  test(`stopping refreshes committed files and ${dirty ? "preserves dirty" : "reloads clean"} editor`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("pixie.codeStyle", "normal");
      const original = window.fetch.bind(window);
      window.fetch = async (input, init) =>
        input === "/api/chat"
          ? new Response(new ReadableStream({ start() {} }), {
              headers: { "Content-Type": "text/event-stream" },
            })
          : original(input, init);
    });
    const { disk } = await setup(page);
    await open(page);
    if (dirty) await edit(page, "my unsaved edits");
    let attempts = 0;
    await page.route("**/api/interrupt", async (route) => {
      attempts++;
      if (attempts === 2) {
        disk["a.txt"] = "agent committed edit";
        disk["created.txt"] = "agent committed creation";
      }
      await route.fulfill({ json: { ok: true, stopped: attempts === 2 } });
    });
    await page.locator("#chat-input").fill("create and edit");
    await page.locator("#send-btn").click();
    await expect(page.locator('[role="status"]')).toHaveText("実行中");
    await page.locator("#send-btn").click();
    await expect(page.locator('[role="status"]')).toHaveText("中断しました");
    expect(attempts).toBe(2);
    await expect(
      page.locator('#file-list li[data-path="created.txt"]'),
    ).toBeVisible();
    await expect
      .poll(() => editorText(page))
      .toBe(dirty ? "my unsaved edits" : "agent committed edit");
    if (dirty)
      await expect(page.locator("#save-state")).toContainText("未保存");
  });
}
