# 🧚 CodeWithPixie

NoteWithPixie(NWP) の Web UI（FastAPI + Monaco）に、AnythingWithPixie(AWP) の
**自律コード修正エンジン**を載せたローカル Web アプリ。ブラウザで自然言語の指示を出すと、
エージェント（AWP の ReAct ループ）がワークスペース内のファイルを自分で読み・検索し、
**破壊操作（書き込み・コマンド実行）は承認ゲートを挟んで**自律的にコードを修正する。

NWP が「read 系のみ・人間がクリックで反映」の安全設計なのに対し、CWP は「エージェントが
直接 write／承認制」の自律設計。原則が逆なので**別プロジェクト**として分離している。

## 3プロジェクトの関係（現状 = Phase 1）

```
AnythingWithPixie（CLI・エンジン本体）
  └─ src/ の engine.run_graph を CWP が sys.path 経由で直接呼ぶ（AWP は無変更）
NoteWithPixie（安全・読取専用の Web エディタ）      … 不変
CodeWithPixie（本アプリ）= NWP フロント + AWP エンジン（自律 write）
```

- **エンジンは AWP を「アダプタ経由で呼ぶ」**方式（`app/engine_adapter.py` に AWP との結合を1枚に閉じ込め）。
  pixie-core パッケージの切り出しは **Phase 2（未着手・下記 TODO）**。
- 参照している AWP のコミット/日付を更新したら、下の「AWP 依存メモ」も更新すること。

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
  **起動時に固定**され、実行中の切替は非対応（1プロセス1セッション）。
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

## アーキテクチャ（Phase 1）

| ファイル | 役割 |
|---|---|
| `app/engine_adapter.py` | **AWP との結合を閉じ込めた中核**。AppContext/AgentState 構築、`run_graph` 駆動、出力の SSE 分類、承認、協調キャンセル、変更検知 |
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

## Phase 2 TODO（本アプリのスコープ外・未着手）

将来 `pixie-core` パッケージへ昇格させる際に解くべき課題（AWP コードの調査で判明した壁）:

1. `pixie-core` の物理切り出し（engine 等を UI 非依存パッケージ化し、AWP・CWP が両方依存）。
2. マルチセッション化（`registry` のプロセスグローバル `_state_board` / `_dynamic_max_chars` の除去）。
3. 出力の型付きイベント再設計と、engine 内の直書き `print` 全廃（現状は stdout に逃がして握っている）。
4. `AppContext` を「実行設定(core)」と「UI 機能(app)」に分離。
5. 作業ディレクトリ/永続ストレージのセッション別抽象化（cwd 依存の解消）。
6. write の物理サンドボックス（現状は cwd 限定＋承認のみ）、権限 allowlist。

## AWP 依存メモ
- 参照エンジン: `../AnythingWithPixie/src`（`engine.run_graph` シグネチャに依存）。
- AWP を更新した際は、`app/engine_adapter.py` のスモーク（起動時の import・ツール登録数）で疎通を確認すること。
