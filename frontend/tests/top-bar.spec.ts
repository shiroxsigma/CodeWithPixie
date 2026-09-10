import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TopBar from "../src/components/TopBar.vue";

describe("TopBar", () => {
  it("keeps the controller integration points", () => {
    const wrapper = mount(TopBar);

    for (const id of [
      "mode-btn",
      "code-style-btn",
      "root-project-btn",
      "current-file",
      "save-btn",
      "model-name",
      "settings-btn",
    ]) {
      expect(wrapper.find(`#${id}`).exists(), id).toBe(true);
    }
  });
});
