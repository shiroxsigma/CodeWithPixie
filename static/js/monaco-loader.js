// ============================================================================
// 正本: PixieProject/shared/web/js/monaco-loader.js
// このファイルは shared/scripts/sync_web.py で各アプリ（NoteWithPixie /
// CodeWithPixie）の static/js/ へコピー配布される。アプリ側のコピーを直接
// 編集しないこと（次回 sync で上書きされる）。編集は必ずこの正本で行う。
// ============================================================================
// Monaco の AMD ローダを読み込む。ローカルにベンダリングした vs を優先し、
// 無ければ CDN にフォールバックする。読み込み完了を window.__monacoReady で公開。
(function () {
  const CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src + "/loader.js";
      s.onload = () => resolve(src);
      s.onerror = () => reject(src);
      document.head.appendChild(s);
    });
  }

  function bootstrap(vsPath) {
    return new Promise((resolve) => {
      window.require.config({ paths: { vs: vsPath } });
      window.require(["vs/editor/editor.main"], () => resolve(window.monaco));
    });
  }

  window.__monacoReady = loadScript(window.__MONACO_VS__)
    .catch(() => loadScript(CDN))
    .then((vs) => bootstrap(vs));
})();
