# CodeWithPixie 作業引き継ぎ

更新日: 2026-08-17

## プロジェクト概要

CodeWithPixie は、FastAPI と Monaco Editor を使ったローカルWeb IDEである。
AnythingWithPixie の `pixie_core` をエージェントエンジンとして利用し、LM Studioの
OpenAI互換APIへ接続する。

主なモード:

- Code: エージェントがコードを調査・変更する。破壊的操作には承認ゲートがある。
- Note: 読み取り専用エージェントが修正案を提示し、人間が差分を確認して反映する。
- Plan: 読み取り専用で調査し、実行計画だけを作成する。

主要ファイル:

- `app/main.py`: FastAPI、API、セッション、SSEチャット
- `app/engine_adapter.py`: `pixie_core` 接続、承認、中断、ストリーム分類
- `static/js/app.js`: Monaco、プレビュー、チャット、Mermaid連携
- `static/js/markdown.js`: Markdown／Mermaid描画
- `static/js/mermaid-edit.js`: Mermaidフローチャート編集

## Markdownプレビューの仕組み

- Markdownファイルでのみ利用できる。
- Monacoの変更後、150〜600msのdebounceを挟んで再描画する。
- Markdownはmarkdown-it、図はMermaidで描画する。
- Mermaid SVGはソース単位でキャッシュする。
- エディタとプレビューのスクロールは全体のスクロール比率で同期する。
- Markdownブロックには `data-src-line` / `data-src-end` を付け、プレビュー上の選択を
  エディタのソース位置へ対応付ける。

## Mermaid文字選択の修正

### 症状

Mermaid図内の文字を選択すると、エディタ側で別の同名文字がハイライトされることがあった。

### 原因

1. Mermaidコードフェンスに付けたソース行情報が、SVGの `.mermaid-box` への置換時に失われていた。
2. 図全体のソースから選択文字を単純検索していたため、同じ文字が複数あると最初の一致を選んでいた。

### 修正内容

- `static/js/markdown.js`
  - Mermaidコードフェンスへ `data-src-line` / `data-src-end` を明示出力。
  - SVGへ置換した後の `.mermaid-box` に行情報を引き継ぐ。
  - Mermaidソースと図番号を含むmeta情報を `.mermaid-box` に保持。
- `static/js/app.js`
  - 選択したSVGノードのDOM IDをMermaidのnode IDへ解決。
  - `parseFlowchart()` の `labelSpan` を使い、対象ノードのラベル範囲内だけを検索。
  - 矢印ラベルは最寄りの辺パスからedge indexを解決。
  - 厳密に文字範囲を特定できない場合、文書内の別文字へ誤爆せず対象ラベル全体へフォールバック。

確認済み:

- JavaScript構文チェック成功
- Mermaid編集テスト: 180件成功
- 関連pytest: 6件成功
- Git作業ツリーは確認時点でクリーン

## GitHub

- リポジトリ: `https://github.com/shiroxsigma/CodeWithPixie.git`
- ブランチ: `feat/richcopy-base`
- push済みコミット: `174ffd0`
- upstream: `origin/feat/richcopy-base`

## ローカルLLM接続の診断

### 現在の状態

- CWP: `http://127.0.0.1:8771`
- LM Studio: `http://localhost:1234/v1`
- CWP `/api/status`: `ready: true`
- エンジン登録ツール数: 43
- 現在のワークスペース: `D:\Workspace\md2spec`
- 現在のactive server: index 1
- 現在のモデル:
  `huihui-qwen3.6-35b-a3b-claude-4.7-opus-abliterated-mtp`
- context length: 74240
- think budget: 90秒

接続、モデル一覧取得、CWPエンジン初期化までは正常。

### 実際に確認された問題

現在のモデルへ直接 `/v1/chat/completions` を送ると、通常回答でもツール要求でも本文を返さず、
生成枠を `reasoning_content` だけで消費し、`finish_reason: length` で終了した。

ツール呼び出しを `required` にすると、LM StudioがHTTP 400を返した。

```text
Unexpected empty grammar stack after accepting piece
```

比較した別モデルでも以下を確認した。

- `qwen/qwen3.6-27b`: reasoningだけを生成し続け、ツール要求はタイムアウト。
- `lfm2.5-8b-a1b@q8_0`: 通常チャットでHTTP 500。ツール要求では「ツールを呼ぶべき」と
  reasoningに書くが、実際の `tool_calls` を出さず生成上限へ到達。

したがって、CWPとLM Studioのネットワーク接続障害ではない。LM Studio側のモデル、
Chat Template、Reasoning Parser、Tool Grammar、Speculative Decodingの組み合わせが疑わしい。

現在モデルの応答にはdraft token統計が含まれており、Speculative Decodingが有効になっている
可能性が高い。

### 設定上の注意

`config.json` のserver index 0はモデル名が次のようになっている。

```json
"model": "lfm2.5-8b-a1b"
```

一方、LM Studioの `/v1/models` が返したIDは次の形式だった。

```text
lfm2.5-8b-a1b@q5_k_m
lfm2.5-8b-a1b@q8_0
```

server index 0へ切り替える場合は、正確なモデルIDへ直す必要がある。

## 次に行うこと

1. LM StudioでDraft Model／Speculative Decodingを無効化する。
2. モデルをすべてアンロードし、Native Tool Use対応モデルを1つだけロードする。
3. カスタムChat TemplateとReasoning Parserをいったん既定値へ戻す。
4. LM Studio単体でツール呼び出しをテストする。
5. 合格条件として以下を確認する。

```text
finish_reason: tool_calls
message.tool_calls: 1件以上
```

6. 動作したモデルの正確なIDを `config.json` に設定する。
7. CWPを再起動し、新規会話を作る。既存セッションは作成時のモデルに固定される。

## 参考

- LM Studio Tool Use:
  https://lmstudio.ai/docs/developer/openai-compat/tools
- LM Studio Speculative Decoding:
  https://lmstudio.ai/docs/app/advanced/speculative-decoding

