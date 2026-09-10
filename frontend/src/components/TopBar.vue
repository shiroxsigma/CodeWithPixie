<template>
  <div class="brand">CodeWithPixie</div>
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
