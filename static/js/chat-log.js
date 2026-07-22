// チャットログの共通 DOM 操作。#messages コンテナと .msg/.body/.tool-log の
// DOM 契約は両アプリ共通（index.html / style.css も共有）。

import { $ } from "./dom.js";
import { renderInto, renderPlain } from "./markdown.js";

// ---- スクロール追従（下端にいるときだけ追う）--------------------------------
// 一番下を見ている間はストリームに追従し、ユーザーが読み返すために上へスクロール
// したら追従を止める（勝手に下へ引き戻さない）。判定はスクロール操作の側で持つ:
// 追加後に測ると「増えた分だけ下端から離れた」ように見え、常に false になるため。

//: 下端とみなす許容誤差(px)。行の端数や padding で完全一致しないため少し余裕を持たせる。
const NEAR_BOTTOM_PX = 60;

let _stick = true;      // 追従するか
let _watched = null;    // scroll 監視を張り済みの #messages 要素

function _messages() {
  const m = $("messages");
  if (m && m !== _watched) {  // 初回（要素差し替え時も）に監視を張る
    _watched = m;
    m.addEventListener("scroll", () => { _stick = _atBottom(m); });
  }
  return m;
}

function _atBottom(m) {
  return m.scrollHeight - m.scrollTop - m.clientHeight <= NEAR_BOTTOM_PX;
}

/**
 * 発言を1件追加して要素を返す。AI の返信だけ Markdown 整形する。
 * opts はそのまま renderInto へ渡る（assetBase: 相対画像の解決基準。
 * チャットの画像は「今のノート目录」基準で呼ぶ側が渡す）。
 */
export function addMessage(role, text, opts = {}) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  const body = document.createElement("div");
  body.className = "body";
  // 自分の発言は打った通りに見せる。整形するのは AI の返信だけ。
  if (role === "assistant") renderInto(body, text, opts);
  else renderPlain(body, text);
  el.appendChild(body);
  _messages().appendChild(el);
  // 自分が送信した直後は読み返し位置に関わらず下端へ戻す（送信＝下端に用がある操作）。
  scrollMessages(role === "user");
  return el;
}

/**
 * 発言に「この往復を削除」ボタンを付ける（回答が不要だったやりとりの後始末）。
 *
 * ボタンは吹き出しの中に置く（外側のラッパを作らない）。#messages の直下は
 * .msg が並ぶだけ、という DOM 契約が既存コード（履歴の再描画・空箱の畳み込み・
 * スクロール追従）のあちこちの前提になっているため。
 */
export function addDeleteButton(el, onDelete) {
  if (!el || el.querySelector(".msg-del")) return;
  const btn = document.createElement("button");
  btn.className = "msg-del";
  btn.type = "button";
  btn.textContent = "🗑";
  btn.title = "この往復を削除（LLM の文脈からも消してコンテキストを節約する）";
  btn.addEventListener("click", onDelete);
  el.appendChild(btn);
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

/** 下端に追従中なら一番下までスクロールする。force=true で追従を再開して必ず下げる。 */
export function scrollMessages(force = false) {
  const m = _messages();
  if (!m) return;
  if (force) _stick = true;
  if (_stick) m.scrollTop = m.scrollHeight;
}
