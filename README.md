# 🧚 CodeWithPixie

NoteWithPixie(NWP) の Web UI（FastAPI + Monaco）に、AnythingWithPixie(AWP) の
**自律コード修正エンジン**を載せたローカル Web アプリ。ブラウザで自然言語の指示を出すと、
エージェント（AWP の ReAct ループ）がワークスペース内のファイルを自分で読み・検索し、
**破壊操作（書き込み・コマンド実行）は承認ゲートを挟んで**自律的にコードを修正する。

NWP が「read 系のみ・人間がクリックで反映」の安全設計なのに対し、CWP は「エージェントが
直接 write／承認制」の自律設計。原則が逆なので**別プロジェクト**として分離している。

## 3プロジェクトの関係（Phase 2 進行中: pixie-core 境界を確立済み）

```
AnythingWithPixie/src/pixie_core.py   ← AWP が公開する UI 非依存の埋め込み API（安定境界）
  ├─ AnythingWithPixie（CLI）          … 既存の内部実装。将来この API を利用する側に寄せる余地
  └─ CodeWithPixie（本アプリ）= NWP フロント + pixie_core（自律 write）
NoteWithPixie（安全・読取専用の Web エディタ）  … 不変
```

- **CWP は AWP 内部（engine/main/registry…）に直接触れず、公開境界 `pixie_core` だけに依存**する。
  接点は「AWP/src を sys.path に前置して `import pixie_core` する」1点のみ（`app/engine_adapter.py`）。
- `pixie_core` は **AWP に追加した facade モジュール**（既存コード不変・AWP テストに影響なし）。
  `create_engine()` / `Engine.run_turn(output_fn, interactive_fn)` / `CancelTurn` / ツール分類を公開。
  起動時に `pixie_core.API_VERSION`（現在 `1.0`）を検証し、非互換を早期検知する。
- **pixie-core の「API 境界の確立」は完了**。engine 等を別パッケージへ物理移動する作業は Phase 2 の
  後続（下記 TODO 1）。境界 API を保てば CWP は無改修で追従できる。

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

- 作業対象フォルダは `workspace/`（`config.json` の `workspace_root` で変更）。
  **起動時に固定**され、実行中の切替は非対応（全セッション共通の作業対象）。
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
- 右: ファイルツリー＋全文検索、下にエージェントチャット。
- **承認バー**: 書き込み・コマンド実行など破壊操作の直前に、ツール名と**引数全文**を表示。
  「承認して実行」/「却下（＋別指示を入力）」を選べる。read 系・低リスク状態系は自動実行。
- **■ 中断**: 進行中ターンを協調キャンセル（承認待ちも解除）。

## 設計メモ（安全性）

- エージェントの書き込みは AWP のツールが行い、`os.chdir(workspace)` で作業対象を限定。
- 破壊操作は承認ゲート＋引数全文表示。AWP の編集前バックアップ（`.pixie_notes/backups/`）も併用。
- サーバは `127.0.0.1` バインド、Host/Origin 検証で外部ページからの API 叩きを拒否。
- ⚠ 現状 `run_command` は任意シェルを実行し得る（パス検査では守れない）。**承認時に必ずコマンド全文を確認**すること。

## アーキテクチャ

| ファイル | 役割 |
|---|---|
| `app/engine_adapter.py` | **AWP との唯一の接点**。`pixie_core` だけを import し、出力の SSE 分類・承認ブリッジ・協調キャンセル・変更検知という **Web 固有部分**を担う（エンジン構築とターン制御は `pixie_core` に委譲） |
| `pixie_core`（AWP 側）| AWP が公開する UI 非依存の埋め込み API。`create_engine()` / `Engine.run_turn()` / `CancelTurn` / ツール分類。AWP 内部への依存を1枚に集約した安定境界 |
| `app/main.py` | FastAPI。静的配信・ファイル API・SSE チャット・`/api/approve`・`/api/interrupt` |
| `app/files.py` | ワークスペース安全アクセス（表示・エディタ読み書き用） |
| `app/search.py` | ripgrep 全文検索 |
| `app/patch.py` | search/replace の3層ファジー適用（手動レビュー用・NWP 由来） |
| `app/config.py` | 設定（`CWP_*` / config.json） |
| `static/` | Monaco フロント（NWP のベンダリング/CSS を流用、UI は CWP 用に書き下ろし） |

### ターン1回の流れ
`POST /api/chat` → worker スレッドで `run_graph`（同期）を実行 → `output_fn` が
`loop.call_soon_threadsafe` で `asyncio.Queue` にイベントを積む → SSE で配信。
承認は `interactive_fn` が `threading.Event` で待機し、`POST /api/approve` が解放。

## Phase 2 進捗と残タスク

- [x] **pixie-core の API 境界確立**（`AnythingWithPixie/src/pixie_core.py`）。CWP は AWP 内部への
      散在依存をやめ、単一の安定境界にのみ依存するようになった（監査 Fable の最大 Major を解消）。
- [x] **マルチセッション化**（`pixie_core` API 1.1）。`registry` の `_state_board` / `_dynamic_max_chars`
      を ContextVar 化（PEP 562 の `__getattr__` で全参照を無改修のままコンテキスト別に）、並列ツール
      実行へ `copy_context()` で伝播。CWP は会話ごとに独立 Engine を持つ `SessionManager` を実装し、
      `/api/chat|approve|interrupt` は `session_id` でルーティング。別会話のターンは並行実行され、
      推論状態（state_board）はメモリ内で分離される。
      - ⚠ 制限: `cwd`（作業対象 workspace）はプロセス共有のため全セッション同一フォルダ。cwd 依存の
        永続ファイル（`.pixie_notes/state_board.json` 等）も共有され、同時運用では最後の保存が勝つ
        （メモリ内の推論は正しく分離）。作業対象別セッションは下記 TODO 5（cwd 抽象化）待ち。
      - LLM バックエンド（LM Studio 単一モデル）は事実上リクエストを直列処理するため、真の並列
        スループットはバックエンド側に律速される。分離の正しさ自体はそれとは独立。

残り（engine 深部に触れるため段階的に進める。各項目は AWP のテストを壊さないことを条件に着手）:

1. `pixie-core` の**物理切り出し**（engine 等を別パッケージへ移動。境界 API は維持するので CWP は無改修）。
2. 出力の**型付きイベント**再設計と、engine 内の直書き `print` 全廃（現状は stdout に逃がして握っている）。
4. `AppContext` を「実行設定(core)」と「UI 機能(app)」に分離。
5. 作業ディレクトリ/永続ストレージの**セッション別抽象化**（cwd 依存の解消）。
6. write の**物理サンドボックス**（現状は cwd 限定＋承認のみ）、権限 allowlist。

## AWP 依存メモ
- 参照境界: `../AnythingWithPixie/src/pixie_core.py`（`API_VERSION` と `Engine.run_turn` シグネチャに依存）。
- CWP は起動時に `pixie_core.API_VERSION`（`1.x`）とツール登録数を検証する（`app/engine_adapter.py`）。
- AWP を更新して境界 API を変えた場合は `pixie_core.API_VERSION` を上げ、本 README も更新すること。
