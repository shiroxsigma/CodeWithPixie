# 🧚 CodeWithPixie

NoteWithPixie(NWP) の Web UI（FastAPI + Monaco）に、AnythingWithPixie(AWP) の
**自律コード修正エンジン**を載せたローカル Web アプリ。ブラウザで自然言語の指示を出すと、
エージェント（AWP の ReAct ループ）がワークスペース内のファイルを自分で読み・検索し、
**破壊操作（書き込み・コマンド実行）は承認ゲートを挟んで**自律的にコードを修正する。

NWP が「read 系のみ・人間がクリックで反映」の安全設計なのに対し、CWP は「エージェントが
直接 write／承認制」の自律設計。原則が逆なので**別プロジェクト**として分離している。

## 3プロジェクトの関係（Phase 2: pixie-core を物理パッケージ化済み）

```
AnythingWithPixie/src/pixie_core/     ← AWP のコア engine 群を収めた本物のパッケージ（UI 非依存の埋め込みAPI）
  ├─ AnythingWithPixie（CLI）          … main.py 等は src/ の互換シム経由でフラット import を継続
  └─ CodeWithPixie（本アプリ）= NWP フロント + pixie_core（自律 write）
NoteWithPixie（安全・読取専用の Web エディタ）  … 不変
```

- **CWP は AWP 内部に直接触れず、公開境界 `pixie_core` だけに依存**する。接点は
  「AWP/src を sys.path に前置して `import pixie_core` する」1点のみ（`app/engine_adapter.py`）。
- `pixie_core` は engine/tools/state/registry/config 等14モジュールを収めた **`src/pixie_core/` パッケージ**。
  `create_engine()` / `Engine.run_turn(output_fn, interactive_fn)` / `CancelTurn` / ツール分類 /
  履歴編集（`history_drop` / `history_replace`）/ `API_VERSION`(1.6) を公開。
- AWP の CLI・テストは `src/<name>.py` の **sys.modules エイリアスシム**でフラット import を維持
  （モジュール同一性を保持）。この物理移動で **CWP・NWP・AWP いずれも挙動不変**（AWP は 394 テストがグリーン）。

## セットアップ

前提: **LM Studio** で OpenAI 互換サーバを起動しモデルをロード（例 `http://localhost:1234/v1`）。
コード編集用途なので function calling 対応のコーダー系モデル推奨（qwen2.5-coder 等）。

```bat
:: 1) 依存インストール（pipenv, in-project venv）
python -m pipenv install

:: 2) 設定（LM Studio の base_url / model を自分の環境に合わせる）
copy config.json.example config.json

:: 3) 起動  ->  http://127.0.0.1:8770
run.bat
```

- **ルートプロジェクト**（作業対象フォルダ）は既定 `workspace/`（`config.json` の `workspace_root`）。
  **起動後もトップバーのフォルダ表示や 📂 ボタンから実行中に変更できる**（`POST /api/workspace`）。
  変更すると以降の新しい会話はそのフォルダで始まり、ファイルブラウザも追従する。既存の会話は
  作成時のフォルダを保持する（会話ごとに別プロジェクトを並行して扱える）。
  複数の会話（セッション）は「＋新規会話」やタブごとに並行して持てる（`session_id` で分離）。
- 起動失敗の理由は起動ログと `GET /api/status` で確認できる。

## 設定（`CWP_*` / config.json）

| キー | 既定 | 説明 |
|---|---|---|
| `awp_src` | `../AnythingWithPixie/src` | AWP エンジンの場所（sys.path に前置） |
| `workspace_root` | `./workspace` | エージェントの作業対象＝cwd＝サンドボックス |
| `servers[]` | LM Studio 単一 | AWP と同形式の接続先リスト（先頭を使用） |
| `host` / `port` | `127.0.0.1` / `8770` | ローカルバインド |
| `approval_timeout` | `0`（無期限） | 承認待ちのタイムアウト秒 |

## 使い方 / UI

- 左: Monaco コードエディタ（拡張子から言語自動判定）。エージェントの書き込み後は自動でライブ再読込。
  - 保存は `Ctrl+S`（エディタ内外どちら でも効く）。保存状態は `● 未保存 / 保存中… / 保存済 / ⚠️ 保存失敗`
    で表示（失敗は消えずに残り、hover で理由が出る）。未保存のままタブを閉じようとすると警告。
  - **👁 プレビュー** (`Ctrl+Shift+P`): Markdown ファイルを開いているときだけ有効。エディタと横並び、
    スクロール追従つき。mermaid 図も描画する。**間の仕切りをドラッグで左右に動かせる**
    （ダブルクリックで等分に戻す）。
- **仕切り（3本）**: エディタ⇔プレビュー、エディタ⇔チャット欄（左右）、ファイル欄⇔チャット欄（上下）。
  いずれもドラッグで調整、ダブルクリックで既定に戻る。左右の2本は**比率**で localStorage に
  覚えるので、ウィンドウ幅が変わっても配分が保たれる。
- **mermaid 図の画像出力**: 図に hover すると右上に `🖼 保存` / `📋 コピー` が出る
  （プレビューとチャットの両方）。PNG（2倍解像度・エディタの背景色を敷く）にして、
  ワークスペースの `images/` へ保存するか、クリップボードへ載せる。
  - ファイル名は「ノート名-図ID」。図IDは mermaid ソース先頭の `%% id: 図ID`、
    無ければ文書内の通し番号（`figure-1`）。**同じ図を直して保存し直すと同じファイルへ
    上書き**される — 日時で名付けると、ノートに貼った `![](images/…)` が古い図を指し続けるため。
  - mdflow のプリセットを切り替えた状態は、見えているとおりに書き出される。
- **画像の貼り付け**（Note モード）: エディタへ画像を **Ctrl+V / ドラッグ&ドロップ** すると
  `<ノートと同じ階層>/images/` に保存され、カーソル位置に `![](images/xxx.png)` が入る。
  プレビューとチャット（今のノート基準）にそのまま描画される（配信は `/api/asset`）。
- **Confluence / Web との往復**（認証不要のクリップボード経由）:
  - **📋 リッチコピー**（プレビュー表示中のみ）: プレビューの内容を**リッチテキスト（HTML）と
    Markdown の2形式**でクリップボードへ載せる。Confluence のエディタに貼ると見出し・表・
    コードブロックが維持される（Confluence はMarkdown直貼りの対応が不完全なのでHTML側が実体）。
    ワークスペース画像は base64 で埋め込み、**mermaid 図は PNG 化して貼る**
    （Confluence は mermaid を描画できないため）。
  - **📥 貼付**（ファイル欄の右上）: Confluence のページをブラウザでコピー（Ctrl+C）してから
    「クリップボードから読込」（またはダイアログの欄に Ctrl+V）すると、HTML を **Markdown に
    変換**して開いているファイルのカーソル位置へ挿入する。turndown のベンダリングが要る
    （下「Markdown 描画のベンダリング」参照。未取得でもテキストはそのまま挿入できる）。
    画像は Confluence 上のURL参照のまま残る（ログインユーザーには見える）。
- 右: ファイルツリー＋全文検索、下にエージェントチャット。
  - ツリーは階層表示（📂 クリックで折りたたみ）。**ドラッグ&ドロップで移動**（一覧の余白へ落とすと最上位へ）、
    **右クリックで新規作成・名前変更/移動・削除**。
  - 画像・PDF などエディタで開けないファイルも一覧に出て、クリックで **OS の既定アプリ**で開く。
  - 検索ヒットをクリックすると該当行へジャンプする。
  - エージェントが変更したファイルには `● 変更` バッジが付く（次のターンで消える）。
- **チャット**: 返信は **Markdown 描画**（コードブロック・表・mermaid 図）。応答待ちは
  `prefill 中… / 思考中…` のインジケータで、ツール実行ログは本文とは別枠に積まれる。
- **承認バー**: 書き込み・コマンド実行など破壊操作の直前に、ツール名と**引数全文**を表示。
  「承認して実行」/「却下（＋別指示を入力）」を選べる。read 系・低リスク状態系は自動実行。
- **⏹ 停止**: 実行中は送信ボタンが停止に変わり、進行中ターンを協調キャンセル（承認待ちも解除）。
- **⚙️ 設定**: モデル/サーバの選択、**Copilot 連携の on/off**。
- **📂 フォルダ**: 作業フォルダを切替（会話ごとに別フォルダを扱える）。

> NWP と違い**自動保存は入れていない**。エージェントが同じファイルを直接書き換えるため、
> 打鍵2秒後の自動保存はエージェントの編集を黙って踏み潰しうる。保存は明示的に `Ctrl+S`。

### Markdown 描画のベンダリング
チャットの Markdown 描画とプレビューは `markdown-it` / `mermaid` の UMD ビルドを使う。未取得なら
その機能だけが無効化される（編集・チャット自体は動く）。取得はどれも1回きり:

```bash
python -m pipenv run python scripts/fetch_markdown_it.py
python -m pipenv run python scripts/fetch_mermaid.py
python -m pipenv run python scripts/fetch_turndown.py   # 「📥 貼付」のHTML→Markdown変換（turndown）用
```

### Copilot 連携（任意）
⚙️ 設定でオンにすると、エージェントに `ask_copilot` ツールが提示され、設計判断やライブラリ用法などを
Microsoft Copilot（Web版）に相談できる（[PrayLight](../PrayLight) 経由の subprocess）。
- 事前に PrayLight で `python start_browser.py` を実行し、開いたブラウザで Copilot にログインしておく
  （⚙️ 設定の「🕊️ Copilot ブラウザを開く」からも起動可能）。
- 設定: `copilot_enabled`（既定 false）、`praylight_dir`（既定 `../PrayLight`）、`praylight_python`、`copilot_timeout`。
- 実装: AWP コアは無改修。CWP が起動時に `pixie_core.register_tool(pack="copilot")` で ask_copilot を
  登録し、on の会話だけ `context.active_packs={"copilot"}` にして提示する（off の会話には出ない）。

#### `/copilot`（組み立て → 質問 → 反映）
メッセージの先頭に `/copilot` と書くと、1ターンが3フェーズになる（`app/copilot_flow.py`）:

1. **組み立て** — エージェントが、これまでの会話と開いているファイルを踏まえ、必要なら
   read_file / grep_search で裏を取ったうえで、**自己完結した質問文**を組み立てる
   （Copilot にはワークスペースが見えないので、関連コードは本文に貼らせる）。
   出力は ````copilot-question フェンス1つ。
2. **質問** — その質問文を Copilot へ送る。質問文と回答はチャットに残る。
3. **反映** — 回答を同じセッションへ戻し、実物と突き合わせて採否を判断させ、
   採用分をコードへ反映させる。反映のされ方はモード次第（Code=編集ツール＋承認、
   Note/Plan=編集ブロック → 差分プレビュー）。

3フェーズは同一セッション・同一ロックで走るので、Copilot とのやりとりは会話履歴に残り、
以降のターンの文脈としても効く。組み立ての間だけ `ask_copilot` ツールは伏せる（二重質問防止）。

組み立てを挟まず素で聞きたいときは **`/copilot!`**（旧 `/copilot` の挙動）。
回答は表示するだけでコードには反映されない。

## コンテキスト管理（会話の文脈を人が減らす）

会話が伸びると LLM の文脈が埋まり、エンジンは**古い側から勝手に切り捨てる**（＝最初に決めた
前提が静かに消える）。何が消えるかを人が決められるようにするための機能。Code / Note / Plan の
どのモードでも同じように効く。

- **🗑 この往復を削除** — 各返信の右上（hover で出る）。回答が不要だったやりとりを
  **表示からも LLM の文脈からも**消す。ツール実行の結果ごと消えるので、
  「巨大なファイルを読ませたが役に立たなかった」ターンほど効く。
  他の往復のツール結果・ホワイトボードには触らない（`pixie_core` API 1.6 の外科的削除）。
- **`/compact [焦点]`** — 会話を「目的・決定事項・分かった事実・やったこと・残り」の
  引き継ぎメモに要約し、履歴をそれ1件に差し替える。逐語は失われるが決定事項は残るので、
  そのまま続きを話せる。`/compact 認証まわり` のように残したい焦点を足せる。

### スラッシュコマンド

| コマンド | 何をするか |
|---|---|
| `/help` | コマンド一覧（チャットに表示） |
| `/context` | いまの文脈の量（件数・概算文字数・文脈を食っている往復の上位5件） |
| `/compact [焦点]` | 会話を要約して文脈を畳む |
| `/undo` | 直前の往復を削除（🗑 と同じ） |
| `/clear` | 会話をリセット（Note は保存履歴も消す） |
| `/code` `/note` `/plan` | モード切替（バッジのクリックと同じ。狙ったモードへ一発で） |
| `/copilot` `/copilot!` | 上記の Copilot 連携 |

`/help` `/undo` などブラウザで完結するものは `static/js/app.js` の `LOCAL_COMMANDS`、
`/compact` `/copilot` などエージェントを動かすものは `POST /api/chat` の先頭で分岐する。
**知らない `/...` はコマンド扱いしない**（`/api/chat のバグを直して` のような依頼を拒まないため）。

### 実装メモ（ターン境界の持ち方）
削除の単位は「ユーザーから見た1往復」なので、境界は `run_turn` ではなく `_turn_stream`
（＝1回の HTTP チャット要求）で開閉する — `/copilot` のように1往復の中で `run_turn` が
2回走る経路があるため。往復は**index ではなくメッセージオブジェクトの同一性**で覚える
（`app/engine_adapter.py` の `HistoryOps`）: エンジンの自動トリムが古い側を落とすと
index は後からずれ、別の往復を消してしまうため。ターン ID は SSE の最初のイベント
（`{"type":"turn","id":n}`）でフロントへ渡す。

## 設計メモ（安全性）

- エージェントの書き込みは AWP のツールが行い、パスはセッションのルートプロジェクト基準に
  絶対化して作業対象を限定（`os.chdir` は使わない＝セッション別フォルダ・cwd 非依存）。
- 破壊操作は承認ゲート＋引数全文表示。AWP の編集前バックアップ（`.pixie_notes/backups/`）も併用。
- サーバは `127.0.0.1` バインド、Host/Origin 検証で外部ページからの API 叩きを拒否。
- ⚠ 現状 `run_command` は任意シェルを実行し得る（パス検査では守れない）。**承認時に必ずコマンド全文を確認**すること。

## アーキテクチャ

| ファイル | 役割 |
|---|---|
| `app/engine_adapter.py` | **AWP との唯一の接点**。`pixie_core` だけを import し、出力の SSE 分類・承認ブリッジ・協調キャンセル・変更検知という **Web 固有部分**を担う（エンジン構築とターン制御は `pixie_core` に委譲） |
| `pixie_core`（AWP 側）| AWP が公開する UI 非依存の埋め込み API。`create_engine()` / `Engine.run_turn()` / `CancelTurn` / ツール分類。AWP 内部への依存を1枚に集約した安定境界 |
| `app/main.py` | FastAPI。静的配信・ファイル API・SSE チャット・`/api/approve`・`/api/interrupt`・文脈操作（`/api/chat/turn/delete`・`/api/context`・`/api/session/clear`） |
| `app/compact.py` | `/compact`（会話の要約 → 履歴の差し替え）|
| `app/files.py` | ワークスペース安全アクセス（表示・エディタ読み書き用） |
| `app/search.py` | ripgrep 全文検索 |
| `app/patch.py` | search/replace の3層ファジー適用（手動レビュー用・NWP 由来） |
| `app/config.py` | 設定（`CWP_*` / config.json） |
| `static/js/app.js` | フロント本体（ツリー・エディタ・保存・プレビュー・チャット・承認バー） |
| `static/js/api.js` | バックエンド呼び出しの共通ラッパ。4xx/5xx を `ApiError` にして握り潰さない（NWP 由来） |
| `static/js/markdown.js` | markdown-it / mermaid 描画。チャット返信とプレビューで共用（NWP 由来） |
| `static/js/mermaid-export.js` | 描画済み SVG → PNG 変換とクリップボード。保存先の決定は app.js が `setDiagramSaver` で注入する |
| `static/js/confluence.js` | 「📥 貼付」の HTML→Markdown 変換（turndown + GFM プラグインの UMD。未取得なら縮退） |
| `static/vendor/` | Monaco / markdown-it / mermaid / turndown（`scripts/fetch_*.py` で取得） |

### ターン1回の流れ
`POST /api/chat` → worker スレッドで `run_graph`（同期）を実行 → `output_fn` が
`loop.call_soon_threadsafe` で `asyncio.Queue` にイベントを積む → SSE で配信。
承認は `interactive_fn` が `threading.Event` で待機し、`POST /api/approve` が解放。

## Phase 2 進捗と残タスク

- [x] **pixie-core の API 境界確立**（`AnythingWithPixie/src/pixie_core/`）。CWP は AWP 内部への
      散在依存をやめ、単一の安定境界にのみ依存するようになった（監査 Fable の最大 Major を解消）。
- [x] **マルチセッション化**（`pixie_core` API 1.1）。`registry` の `_state_board` / `_dynamic_max_chars`
      を ContextVar 化（PEP 562 の `__getattr__` で全参照を無改修のままコンテキスト別に）、並列ツール
      実行へ `copy_context()` で伝播。CWP は会話ごとに独立 Engine を持つ `SessionManager` を実装し、
      `/api/chat|approve|interrupt` は `session_id` でルーティング。別会話のターンは並行実行され、
      推論状態（state_board）はメモリ内で分離される。
      - 当初あった「cwd がプロセス共有で全セッション同一フォルダ」の制限は、次項 #4（セッション別
        workspace）で解消済み（会話ごとに別ルートプロジェクトを扱える）。
      - LLM バックエンド（LM Studio 単一モデル）は事実上リクエストを直列処理するため、真の並列
        スループットはバックエンド側に律速される。分離の正しさ自体はそれとは独立。

- [x] **セッション別 workspace（cwd 依存の解消）**。`os.chdir` を廃止し、workspace を ContextVar 化
      （pixie_core API 1.2）。engine のディスパッチ境界でツール引数の相対パスをセッション workspace
      基準に絶対化（承認/バックアップ/shadow検証/実行が同一絶対パスを見る）。CWP は作業フォルダを
      実行中に切替でき（📂）、会話ごとに別フォルダを扱える。プロセス cwd を変えないので開いている
      フォルダの削除・移動も可能。UI に **⚙️ 設定（モデル/サーバ選択）** を追加。
- [x] **pixie-core の物理パッケージ化**。engine 群を `src/pixie_core/` パッケージへ物理移動し、
      `src/<name>.py` を sys.modules エイリアスシムにして AWP CLI・テストを無改修で維持。CWP も無改修。
      `paths.get_app_root()` の `__file__` 逆算補正、遅延 `__init__`（循環回避）、facade の CLI 依存の遅延化を含む。
      安全網テスト `tests/test_packaging_identity.py` 追加、AWP 394 passed。
      - フォローアップ（未実施）: パッケージ内 import を相対化して**真の自己完結**にする（`config`/`state`/`tools` 等
        の一般名が sys.modules で衝突するリスクの根絶・将来の `pip install` 化）。シムは恒久の互換層として残す。

残り（engine 深部に触れるため段階的に進める。各項目は AWP のテストを壊さないことを条件に着手）:

1. 出力の**型付きイベント**再設計と、engine 内の直書き `print` 全廃（現状は stdout に逃がして握っている）。
4. `AppContext` を「実行設定(core)」と「UI 機能(app)」に分離。
5. 作業ディレクトリ/永続ストレージの**セッション別抽象化**（cwd 依存の解消）。
6. write の**物理サンドボックス**（現状は cwd 限定＋承認のみ）、権限 allowlist。

## AWP 依存メモ
- 参照境界: `../AnythingWithPixie/src/pixie_core.py`（`API_VERSION` と `Engine.run_turn` シグネチャに依存）。
- CWP は起動時に `pixie_core.API_VERSION`（`1.x`）とツール登録数を検証する（`app/engine_adapter.py`）。
  **1.4 以上が必須**（Note の固定ツールプロファイル）。**1.6 以上でコンテキスト管理が有効**になる
  （往復の削除・`/compact`。1.6 未満では機能が無効化されるだけで、それ以外は従来どおり動く）。
- AWP を更新して境界 API を変えた場合は `pixie_core.API_VERSION` を上げ、本 README も更新すること。
