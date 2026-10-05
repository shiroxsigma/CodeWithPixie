<script setup lang="ts">
import { workspaceView, showView } from "../ui/view";

function openSettings() {
  document.getElementById("settings-btn")?.click();
}
</script>

<template>
  <div class="brand">CodeWithPixie</div>
  <nav class="view-switch" aria-label="表示切替">
    <button
      id="view-chat-btn"
      type="button"
      :aria-current="workspaceView.current === 'chat' ? 'page' : undefined"
      :class="{ active: workspaceView.current === 'chat' }"
      @click="showView('chat')"
    >
      会話
    </button>
    <button
      id="view-editor-btn"
      type="button"
      :aria-current="workspaceView.current === 'editor' ? 'page' : undefined"
      :class="{ active: workspaceView.current === 'editor' }"
      @click="showView('editor')"
    >
      編集
    </button>
  </nav>
  <button id="edit-context-btn" type="button" @click="showView('editor')">
    <span class="edit-context-label">{{
      workspaceView.currentFile || "編集画面を開く"
    }}</span>
    <span
      v-if="workspaceView.dirty"
      class="unsaved-dot"
      aria-label="未保存の変更あり"
      >● 未保存</span
    >
    <span aria-hidden="true">↗</span>
  </button>
  <button
    v-if="workspaceView.connectionIssue"
    id="connection-issue-btn"
    type="button"
    :title="workspaceView.connectionIssue"
    @click="openSettings"
  >
    接続を確認してください
  </button>
  <button id="mode-btn" title="モード切替">…</button>
  <button
    id="code-style-btn"
    class="code-only"
    title="Codeモードの進め方を切り替え"
  >
    通常
  </button>
  <button
    id="root-project-btn"
    title="ルートプロジェクト（作業対象フォルダ）を変更"
  >
    <span id="root-project-name">…</span>
  </button>
  <button id="places-btn" title="お気に入り・最近使ったフォルダへ移動">
    ⭐
  </button>
  <button
    id="source-bundle-btn"
    type="button"
    title="このプロジェクトのソースをまとめてコピー・保存・Copilotに送信"
    :disabled="!workspaceView.ready"
  >
    ソースをまとめる
  </button>
  <div class="file-info">
    <button
      id="nav-back"
      class="nav-btn"
      title="前に開いていたファイルへ戻る (Alt+←)"
    >
      ◀
    </button>
    <button id="nav-fwd" class="nav-btn" title="進む (Alt+→)">▶</button>
    <button id="recent-btn" class="nav-btn" title="最近開いたファイル (Ctrl+E)">
      🕘
    </button>
    <span id="current-file">（ファイル未選択）</span>
    <button id="save-btn" title="保存 (Ctrl+S)">保存</button>
    <span id="save-state"></span>
    <button id="history-btn" title="このファイルの保存履歴から元に戻す">
      🕰 履歴
    </button>
  </div>
  <div class="model-info">
    model: <span id="model-name">…</span><span id="agent-status"></span>
  </div>
  <button id="settings-btn" title="設定（モデル）">設定</button>
</template>
