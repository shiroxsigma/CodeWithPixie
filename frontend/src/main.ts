import { createApp, nextTick } from "vue";
import App from "./App.vue";

createApp(App).mount("#app");

// The controller starts only after Vue has created the DOM nodes it binds to.
// Its feature modules now live in this Vite source tree and can be converted to
// typed composables incrementally without maintaining a second frontend build.
void nextTick(() => import("./legacy/app.js"));
