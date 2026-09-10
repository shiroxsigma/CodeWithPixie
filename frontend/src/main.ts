import { createApp } from "vue";
import TopBar from "./components/TopBar.vue";

const mountPoint = document.querySelector("#vue-topbar");

if (mountPoint) {
  createApp(TopBar).mount(mountPoint);
}

// The existing controller is loaded only after Vue has created the DOM nodes it
// binds to. Feature modules will move behind typed Vue components incrementally.
const legacyControllerUrl = "/static/js/app.js";
void import(/* @vite-ignore */ legacyControllerUrl);
