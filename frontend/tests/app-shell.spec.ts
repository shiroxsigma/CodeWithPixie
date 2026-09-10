import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import App from "../src/App.vue";

describe("App shell", () => {
  it("renders the editor, file manager, chat, and dialogs exactly once", () => {
    const wrapper = mount(App, { attachTo: document.body });

    for (const id of [
      "topbar",
      "editor",
      "filemgr",
      "file-list",
      "chat",
      "messages",
      "root-modal",
      "settings-modal",
    ]) {
      expect(document.querySelectorAll(`#${id}`), id).toHaveLength(1);
    }

    wrapper.unmount();
  });
});
