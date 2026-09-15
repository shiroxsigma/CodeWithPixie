<script setup lang="ts">
import { computed } from "vue";
import { chatRuntime } from "../chat/runtime";

const { state: chat, busy } = chatRuntime;
const phaseLabel = computed(
  () =>
    ({
      idle: "",
      switching: "会話切替中",
      sending: "送信中",
      running: "実行中",
      approval: "承認待ち",
      stopping: "中断中",
      completed: "完了",
      cancelled: "中断しました",
      limited: "実行上限に達しました",
      failed: "失敗",
    })[chat.phase],
);
</script>

<template>
  <main id="split">
    <!-- 左：コードエディタ -->
    <section id="left-pane">
      <!-- 編集エリア。Markdown プレビュー表示時だけ横2分割になる（既定はエディタのみ）。 -->
      <div id="edit-area">
        <div id="editor"></div>
        <div
          id="preview-divider"
          class="hidden"
          title="ドラッグでプレビューの幅を調整（ダブルクリックで等分に戻す）"
        ></div>
        <div id="preview" class="md hidden" aria-live="off"></div>
      </div>

      <!-- 差分プレビュー（Note モードの反映前確認）。左=現在 / 右=提案（右は編集可）。
           #left-pane を丸ごと覆うので、プレビュー表示中でも差分だけが見える。 -->
      <div id="diff-overlay" class="hidden">
        <div id="diff-bar">
          <span id="diff-label"
            >差分プレビュー：左＝現在 ／ 右＝提案（右は編集して調整可）</span
          >
          <span id="diff-tabs"></span>
          <span class="spacer"></span>
          <button
            id="diff-close"
            class="hidden"
            title="差分表示を閉じる（承認の判断は右の承認バーで行う）"
          >
            ✕ 閉じる
          </button>
          <button
            id="diff-approve-edit"
            class="apply-btn hidden"
            title="右ペインで編集した内容をそのまま書き込み、エージェントには完了済みと伝える"
          >
            ✓ 修正して承認
          </button>
          <button id="diff-apply" class="apply-btn">✓ 適用</button>
          <button id="diff-cancel">キャンセル</button>
        </div>
        <div id="diff-editor"></div>
      </div>

      <!-- 実行計画（Plan モード）。承認するまでファイルは1字も変わらない（エージェントに
           書き込みツールを提示していない）。承認すると Code モードへ切り替えて、この計画を
           最初の指示として実行させる。#left-pane を覆うのは差分プレビューと同じ理由。 -->
      <div id="plan-overlay" class="hidden">
        <div id="plan-bar">
          <span id="plan-label"
            >実行計画（承認するまでファイルは変更されません）</span
          >
          <span class="spacer"></span>
          <button id="plan-approve" class="apply-btn">✓ この計画で実行</button>
          <button id="plan-reject">✕ 修正を依頼</button>
        </div>
        <div id="plan-body" class="md"></div>
      </div>

      <div id="left-toolbar">
        <button id="note-btn" class="note-only" title="選択行に付箋を貼る">
          付箋
        </button>
        <button
          id="preview-btn"
          title="Markdown プレビューを表示 (Ctrl+Shift+P)"
        >
          👁 プレビュー
        </button>
        <button
          id="richcopy-btn"
          disabled
          title="Markdown プレビュー表示中に使えます"
        >
          リッチコピー
        </button>
        <span id="sel-info" class="hint"
          >エージェントがファイルを直接編集します（破壊操作は承認制）。</span
        >
      </div>
    </section>

    <div id="divider" title="ドラッグで幅を調整"></div>

    <!-- 右：ファイルツリー & チャット -->
    <section id="right-pane">
      <div id="filemgr">
        <div class="section-head">
          <span>ファイル（ワークスペース）</span>
          <span class="fm-actions">
            <button id="folder-btn" title="作業フォルダを変更">
              フォルダ変更
            </button>
            <button id="refresh-btn" title="再読込">⟳</button>
            <button id="new-file-btn" title="新規ファイル">ファイル追加</button>
            <button id="new-folder-btn" title="新規フォルダ">
              フォルダ追加
            </button>
            <button
              id="web2md-btn"
              class="note-only"
              title="URLのページをMarkdown化して web/ に保存する"
            >
              🌐+
            </button>
            <button
              id="cf-btn"
              title="Confluence 等のページ（コピーしたHTML）をMarkdownに変換して挿入する"
            >
              📥 貼付
            </button>
          </span>
          <!-- 検索欄はヘッダの2行目に回す。右ペインは狭いので、見出し・操作ボタンと
               同じ行に並べると幅が足りずボタンの文字が折り返す。 -->
          <span class="search-row">
            <input id="file-search" type="search" placeholder="全文検索…" />
            <span id="search-opts" class="hidden">
              <label title="大文字小文字を区別する（検索と置換で共通）">
                <input id="search-case" type="checkbox" /> Aa
              </label>
              <button
                id="replace-toggle"
                title="ヒットしたファイルをまとめて置換する"
              >
                🔁 置換
              </button>
            </span>
          </span>
        </div>
        <!-- 一括置換。検索でヒットしたファイルだけが対象（一覧に出ていないファイルは
             巻き込まない）。まずプレビューで件数を確かめてから実行する。 -->
        <div id="replace-bar" class="hidden">
          <input
            id="replace-input"
            type="text"
            spellcheck="false"
            placeholder="置換後の文字列（そのまま入ります）"
          />
          <div class="replace-actions">
            <button id="replace-preview-btn">👁 プレビュー</button>
            <button id="replace-run-btn" class="apply-btn">✓ すべて置換</button>
            <span id="replace-status" class="hint"></span>
          </div>
          <div id="replace-preview"></div>
        </div>
        <div id="root-bar">
          <span id="root-path" title="現在の作業フォルダ"></span>
          <span
            id="files-trunc"
            class="hidden"
            title="巨大ワークスペースのため一覧を打ち切りました（目的のファイルは全文検索で探せます）"
            >⚠ 一覧は先頭2万件まで</span
          >
        </div>
        <ul id="file-list"></ul>
        <div id="search-results" class="hidden"></div>
      </div>

      <!-- ファイル欄とチャット欄の高さを調整するハンドル -->
      <div
        id="v-divider"
        title="ドラッグでファイル欄の高さを調整（ダブルクリックで既定に戻す）"
      ></div>

      <!-- 関連ファイル（Note モードのみ）: 別ディレクトリの .pptx 等をノートに紐付ける -->
      <div id="refmgr" class="note-only">
        <div class="section-head">
          <span>関連ファイル</span>
          <span class="fm-actions">
            <button
              id="ref-add-btn"
              title="別ディレクトリのファイル（.pptx 等）を参照に追加"
            >
              ＋参照を追加
            </button>
          </span>
        </div>
        <ul id="ref-list"></ul>
        <div id="ref-empty" class="hint">
          ここにファイルをドラッグ、または「＋参照を追加」で紐付けます。
        </div>
      </div>

      <div id="chat">
        <div class="section-head">
          <span>チャット</span>
          <span class="fm-actions">
            <span
              id="session-info"
              class="hint code-only"
              title="この会話のセッションID"
            ></span>
            <button
              id="new-session-btn"
              class="code-only"
              title="新しい会話を開始（並行セッション）"
            >
              ＋新規会話
            </button>
            <button
              id="sessions-btn"
              class="code-only"
              title="保存済みの会話を一覧から復元する"
            >
              🗂 会話
            </button>
            <button
              id="chat-clear-btn"
              class="note-only"
              title="この保存先の会話履歴を消去する"
            >
              履歴を消去
            </button>
          </span>
        </div>
        <div id="messages"></div>
        <div id="approval" class="hidden code-only"></div>
        <div id="composer">
          <!-- 選択テキスト添付は両モード共通（Code でも「この関数を直して」が効く） -->
          <div id="chip-bar">
            <span id="sel-chip" class="chip hidden">選択テキスト添付</span>
          </div>
          <textarea
            id="chat-input"
            rows="3"
            placeholder="例）src/foo.py に入力値を検証する関数を追加して。テストも書いて実行して確認して。"
          ></textarea>
          <div class="composer-actions">
            <span class="hint">Ctrl+Enter で送信</span>
            <span role="status" aria-live="polite" :title="chat.error">{{
              phaseLabel
            }}</span>
            <button
              id="send-btn"
              :class="{ stop: busy }"
              :disabled="
                chat.phase === 'stopping' || chat.phase === 'switching'
              "
              :title="busy ? 'エージェントの実行を中断する' : ''"
            >
              {{ busy ? "停止" : "送信" }}
            </button>
          </div>
          <!-- Copilot 取り込みバー（Note モード専用。設定モーダル側の #copilot-* とは別 id） -->
          <div id="copilot-bar" class="note-only">
            <button
              id="cp-bar-open-btn"
              title="デバッグ用ブラウザで Copilot を開く（そこで人が対話する）"
            >
              Copilotを開く
            </button>
            <button
              id="cp-bar-import-btn"
              title="開いている Copilot の会話を取得してAIにまとめさせる（普段のブラウザでOK・Copilotタブを前面にしておく）"
            >
              ⬇ 会話を取り込んでまとめる
            </button>
            <span id="cp-bar-status" class="hint"></span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
