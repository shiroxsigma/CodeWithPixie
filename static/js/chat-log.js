// ============================================================================
// 正本: PixieProject/shared/web/js/chat-log.js
// このファイルは shared/scripts/sync_web.py で各アプリ（NoteWithPixie /
// CodeWithPixie）の static/js/ へコピー配布される。アプリ側のコピーを直接
// 編集しないこと（次回 sync で上書きされる）。編集は必ずこの正本で行う。
// ============================================================================
// チャットログの共通 DOM 操作。#messages コンテナと .msg/.body/.tool-log の
// DOM 契約は両アプリ共通（index.html / style.css も共有）。

import { $ } from "./dom.js";
import { renderInto, renderPlain } from "./markdown.js";

/** 発言を1件追加して要素を返す。AI の返信だけ Markdown 整形する。 */
export function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  const body = document.createElement("div");
  body.className = "body";
  // 自分の発言は打った通りに見せる。整形するのは AI の返信だけ。
  if (role === "assistant") renderInto(body, text);
  else renderPlain(body, text);
  el.appendChild(body);
  $("messages").appendChild(el);
  scrollMessages();
  return el;
}

/** エージェントのツール実行ステータスを本文の上のログ枠に積む。 */
export function addToolStatus(el, text) {
  let log = el.querySelector(".tool-log");
  if (!log) {
    log = document.createElement("div");
    log.className = "tool-log";
    el.insertBefore(log, el.querySelector(".body"));
  }
  const line = document.createElement("div");
  line.className = "tool-status";
  line.textContent = text;
  log.appendChild(line);
  scrollMessages();
}

export function scrollMessages() { const m = $("messages"); m.scrollTop = m.scrollHeight; }
