// ============================================================================
// 正本: PixieProject/shared/web/js/dom.js
// このファイルは shared/scripts/sync_web.py で各アプリ（NoteWithPixie /
// CodeWithPixie）の static/js/ へコピー配布される。アプリ側のコピーを直接
// 編集しないこと（次回 sync で上書きされる）。編集は必ずこの正本で行う。
// ============================================================================
// 最小の DOM ヘルパー。

export const $ = (id) => document.getElementById(id);
