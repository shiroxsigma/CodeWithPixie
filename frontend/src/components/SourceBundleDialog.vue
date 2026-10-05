<template>
  <div id="source-bundle-modal" class="hidden">
    <section
      id="source-bundle-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-bundle-title"
    >
      <div class="root-head" id="source-bundle-title">
        プロジェクトのソースをまとめる
      </div>
      <div id="source-bundle-root" class="hint"></div>
      <p class="hint source-bundle-hint">
        保存済みのソースを収集し、開いているファイルには現在の編集内容を含めます。
        修正指示を添えてコピー・保存するか、ファイルとして Copilot
        に送信できます。
      </p>
      <div id="source-bundle-summary" aria-live="polite"></div>
      <div id="source-bundle-warning" class="hidden"></div>
      <details id="source-bundle-skips" class="hidden">
        <summary id="source-bundle-skips-summary">除外されたファイル</summary>
        <ul id="source-bundle-skips-list"></ul>
      </details>
      <label for="source-bundle-instruction"
        >修正指示（コピー・保存は省略可）</label
      >
      <textarea
        id="source-bundle-instruction"
        rows="3"
        maxlength="12000"
        placeholder="例: 読み込み時のエラーを調べて、修正コードをファイルごとに提案してください"
      ></textarea>
      <label for="source-bundle-preview">まとめた内容</label>
      <textarea
        id="source-bundle-preview"
        readonly
        spellcheck="false"
        aria-label="まとめたソースのプレビュー"
      ></textarea>
      <div id="source-bundle-status" class="hint" aria-live="polite"></div>
      <div class="hint">
        Copilot への送信には修正指示と、設定の「Copilot 連携」が必要です。
      </div>
      <div class="root-actions source-bundle-actions">
        <button id="source-bundle-close" type="button">閉じる</button>
        <button id="source-bundle-refresh" type="button">作り直す</button>
        <button id="source-bundle-copy" type="button" disabled>コピー</button>
        <button id="source-bundle-download" type="button" disabled>
          ファイルに保存
        </button>
        <button
          id="source-bundle-send"
          type="button"
          class="apply-btn"
          disabled
        >
          Copilotに送信
        </button>
      </div>
    </section>
  </div>
</template>
