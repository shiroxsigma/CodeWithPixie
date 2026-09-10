<template>
  <!-- 作業フォルダ選択ダイアログ -->
  <div id="root-modal" class="hidden">
    <div id="root-dialog">
      <div class="root-head">ルートプロジェクト（作業対象フォルダ）を選ぶ</div>
      <!-- 行き先（⭐お気に入り / 🕘最近使った）。クリックで即移動する。 -->
      <div id="root-places"></div>
      <div id="root-drives"></div>
      <div class="root-inputrow">
        <input
          id="root-input"
          type="text"
          spellcheck="false"
          placeholder="例: D:\projects\myapp（Enter で移動）"
        />
        <button
          id="root-fav-btn"
          title="今表示しているフォルダをお気に入りに入れる／外す"
        >
          ☆
        </button>
      </div>
      <ul id="root-dirlist"></ul>
      <div class="root-hint hint">
        フォルダをクリックで移動 ／ パス直接入力＋Enter
        でも移動。決定するとファイルブラウザが切替わり、新しい会話がそのフォルダで始まります。
      </div>
      <div class="root-actions">
        <button id="root-cancel">キャンセル</button>
        <button id="root-ok" class="apply-btn">✓ このフォルダにする</button>
      </div>
    </div>
  </div>

  <!-- 保存履歴ダイアログ（ローカル履歴 .pixie_history から元に戻す）。
       UI 経由の保存・自動保存はエージェントのターン単位バックアップを通らないので、
       ここが「うっかり上書き」からの唯一の復路になる。 -->
  <div id="hist-modal" class="hidden">
    <div id="hist-dialog">
      <div class="root-head">🕰 保存履歴 — <span id="hist-file"></span></div>
      <div id="hist-body">
        <ul id="hist-list"></ul>
        <div id="hist-preview-wrap">
          <div id="hist-preview-head" class="hint">
            左の版を選ぶと内容が出ます。
          </div>
          <pre id="hist-preview"></pre>
        </div>
      </div>
      <div class="root-hint hint">
        保存の直前の内容を残しています。戻すときは「今の内容」も履歴に積むので、戻し間違えてもやり直せます。
      </div>
      <div class="root-actions">
        <button id="hist-close">閉じる</button>
        <button id="hist-restore" class="apply-btn" disabled>
          ↩ この版に戻す
        </button>
      </div>
    </div>
  </div>

  <!-- 関連ファイル選択ダイアログ（Note モード: 任意ディレクトリのファイルを参照に追加） -->
  <div id="pick-modal" class="hidden">
    <div id="pick-dialog">
      <div class="root-head">参照するファイルを選ぶ</div>
      <div id="pick-drives"></div>
      <input
        id="pick-input"
        type="text"
        spellcheck="false"
        placeholder="例: C:\Users\you\decks（Enter でフォルダへ移動）"
      />
      <ul id="pick-list"></ul>
      <div class="root-hint hint">
        フォルダをクリックで移動 ／ ファイルをクリックで参照に追加します。
      </div>
      <div class="root-actions">
        <button id="pick-cancel">閉じる</button>
      </div>
    </div>
  </div>

  <!-- Confluence / Web 貼り付けダイアログ（コピーしたHTML → Markdown 変換） -->
  <div id="cf-modal" class="hidden">
    <div id="cf-dialog">
      <div class="root-head">📥 Confluence / Web から貼り付け</div>
      <div class="root-hint hint">
        Confluence
        のページをブラウザでコピー（Ctrl+C）してから「クリップボードから読込」、
        または下の欄に Ctrl+V。リッチテキスト（HTML）で取れれば Markdown
        に変換して、 今開いているファイルのカーソル位置へ挿入します（画像は
        Confluence 上のURL参照のまま残ります）。
      </div>
      <div class="cf-actions">
        <button
          id="cf-read-btn"
          title="クリップボードを直接読み取る（ブラウザの許可が必要な場合あり）"
        >
          クリップボードから読込
        </button>
        <span id="cf-status" class="hint"></span>
      </div>
      <textarea
        id="cf-input"
        rows="10"
        spellcheck="false"
        placeholder="ここに貼り付け（Ctrl+V）…"
      ></textarea>
      <div class="root-actions">
        <button id="cf-cancel">閉じる</button>
        <button id="cf-insert" class="apply-btn">✓ 変換して挿入</button>
      </div>
    </div>
  </div>

  <!-- 保存済み会話（Code モード: ログとエンジン文脈を復元） -->
  <div id="sessions-modal" class="hidden">
    <div id="sessions-dialog">
      <div class="root-head">🗂 保存済みの会話</div>
      <div class="root-hint hint">
        クリックで会話を復元します（チャット表示＋エンジン文脈。ツール実行の詳細は失われ、
        会話の本文だけが文脈として引き継がれます）。会話はターン確定ごとに自動保存されます。
      </div>
      <ul id="sessions-list"></ul>
      <div class="root-actions">
        <button id="sessions-close" class="apply-btn">閉じる</button>
      </div>
    </div>
  </div>

  <!-- 設定ダイアログ（⚙️ モデル/サーバ・Copilot） -->
  <div id="settings-modal" class="hidden">
    <div id="settings-dialog">
      <div class="root-head">設定</div>
      <label
        class="settings-row"
        style="flex-direction: column; align-items: stretch; gap: 6px"
      >
        <span
          ><b>モデル / サーバ</b
          ><span class="hint">以降の新しい会話に反映されます。</span></span
        >
        <select id="settings-model"></select>
      </label>
      <label
        class="settings-row"
        style="flex-direction: column; align-items: stretch; gap: 6px"
      >
        <span
          ><b>ロード済みモデル</b
          ><span class="hint"
            >LM Studio でロード済みのモデルから選択（起動中のみ取得可）。</span
          ></span
        >
        <select id="settings-llm-model"></select>
      </label>
      <!-- label ではなく div: 中の「保存」ボタンを押したとき input へのフォーカス移動が起きないように -->
      <div
        class="settings-row"
        style="flex-direction: column; align-items: stretch; gap: 6px"
      >
        <span
          ><b>思考許容時間（秒）</b
          ><span class="hint"
            >AI が
            <code>&lt;think&gt;</code>
            で考え込める上限。超えると打ち切って結論生成に移ります。長くするほど1回の待ち時間が延びます（既定
            90）。</span
          ></span
        >
        <span class="settings-inline">
          <input
            id="settings-think-budget"
            type="number"
            min="10"
            max="1800"
            step="10"
          />
          <button id="settings-think-budget-save">保存</button>
          <span id="settings-think-budget-status" class="hint"></span>
        </span>
      </div>
      <div
        class="settings-row"
        style="flex-direction: column; align-items: stretch; gap: 6px"
      >
        <span
          ><b>コンテキスト長（トークン）</b
          ><span class="hint"
            >このサーバのモデル窓長。<b>0 で自動</b>（LM Studio の
            <code>meta.n_ctx</code> を取得）。リモートの LM Studio /
            llama-server は取れず 32768
            と仮定するので、実際の窓長を手で入れると溢れ・無駄な切り詰めを防げます。変更するとこのサーバの会話は作り直されます。</span
          ></span
        >
        <span class="settings-inline">
          <input
            id="settings-context-length"
            type="number"
            min="0"
            max="2000000"
            step="1024"
            placeholder="0（自動）"
          />
          <button id="settings-context-length-save">保存</button>
          <span id="settings-context-length-status" class="hint"></span>
        </span>
      </div>
      <label class="settings-row toggle">
        <input type="checkbox" id="settings-copilot" />
        <span>
          <b>Copilot 連携</b>
          <span class="hint"
            >オンにすると、エージェントが <code>ask_copilot</code> ツールで
            Microsoft Copilot に相談できます（PrayLight 経由）。</span
          >
        </span>
      </label>
      <div class="settings-row" id="settings-copilot-controls">
        <button
          id="settings-copilot-open"
          title="Copilot にログインするためのブラウザを開く"
        >
          Copilotブラウザを開く（ログイン用）
        </button>
        <span id="settings-copilot-status" class="hint"></span>
      </div>
      <div class="root-actions">
        <button id="settings-close" class="apply-btn">閉じる</button>
      </div>
    </div>
  </div>
</template>
