"""engine_adapter の Note モードプロファイルのテスト（NWP tests/test_engine_adapter.py の移植）。

AWP（AnythingWithPixie）が隣に無い環境では bootstrap 依存のテストを skip する。
LLM 接続は不要（create_engine はバックエンドへ接続しない）。
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import config, engine_adapter, note_prompts  # noqa: E402

_AWP_SRC = config.AWP_SRC
needs_awp = pytest.mark.skipif(
    not (_AWP_SRC / "pixie_core" / "_api.py").exists(),
    reason=f"AnythingWithPixie が見つからない: {_AWP_SRC}",
)


# --- 静的 suffix（エンジン不要） ---

def test_note_system_suffix_contains_edit_protocol():
    """編集プロトコルの最重要文言が suffix に含まれること。

    これが崩れるとフロントの extractEdits → /api/patch → 差分反映が全滅する。"""
    sfx = engine_adapter.NOTE_SYSTEM_SUFFIX
    assert "```search" in sfx
    assert "```replace" in sfx
    assert "```apply" in sfx
    assert "unified diff" in sfx        # diff 禁止の指示
    assert "mdflow-mapping" in sfx      # mdflow 文法ガイド（常時静的注入）
    assert note_prompts.EDIT_PROTOCOL in sfx


def test_note_system_suffix_has_progressive_writing_guide():
    """長文書の段階執筆ガイド（骨子→セクションごと）が suffix に含まれること。

    ローカルモデルがトークン上限で出力を途切れさせ、進捗を全損する事故の対策。"""
    sfx = engine_adapter.NOTE_SYSTEM_SUFFIX
    assert "段階" in sfx
    assert "骨子" in sfx
    # ツールエラーの無限リトライを抑止する指示（kwargs バグ時の挙動が再発しても粘らない）
    assert "2回連続" in sfx


def test_note_tools_are_read_only_names():
    assert engine_adapter.NOTE_EXTENSION_TOOLS == frozenset(
        {"list_workspace", "read_note", "grep_workspace", "describe_flows"})
    assert engine_adapter.NOTE_TOOLS == engine_adapter.NOTE_EXTENSION_TOOLS | {"read_file"}


# --- Note ツール登録ラッパ（kwargs 署名バグの回帰テスト） ----------------------
# pixie_core のディスパッチ（tools.py の _execute_builtin_tool）は登録関数の署名を
# inspect して引数を検証する。**kwargs だけのラッパだと「必要な引数 'kwargs' が不足」
# というエラーが全呼び出しで出て、LLM が自己修正できず永遠にリトライしていた。

class _FakeCore:
    """register_tool の呼び出しを捕まえる pixie_core 替わりの骨組み。"""

    def __init__(self):
        self.registered = {}

    def register_tool(self, name, **_kw):
        def deco(fn):
            self.registered[name] = fn
            return fn
        return deco


def test_note_tool_impls_have_explicit_signatures():
    import inspect
    core = _FakeCore()
    engine_adapter._register_note_tools(core)
    # read 系4ツールだけが登録される（ask_copilot は pack="copilot" の既存登録を再利用）
    assert set(core.registered) == set(engine_adapter.NOTE_EXTENSION_TOOLS)
    for name, fn in core.registered.items():
        params = inspect.signature(fn).parameters
        assert "kwargs" not in params, f"{name} が **kwargs のまま（ディスパッチで必ず死ぬ）"
    # スキーマの引数名が署名に載っている
    assert "path" in inspect.signature(core.registered["read_note"]).parameters
    assert "query" in inspect.signature(core.registered["grep_workspace"]).parameters


def test_note_tool_dispatch_through_signature(tmp_path, monkeypatch):
    """pixie_core._execute_builtin_tool の流れ（署名で絞り func(**valid_args)）を
    再現し、実際に実行まで届くことを確かめる。"""
    import inspect
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    (tmp_path / "memo.md").write_text("# hello\n", encoding="utf-8")

    core = _FakeCore()
    engine_adapter._register_note_tools(core)

    def dispatch(fn, arguments: dict) -> str:
        sig = inspect.signature(fn)
        valid = {p: arguments[p] for p in sig.parameters if p in arguments}
        return fn(**valid)

    # 通常呼び出しが通る（旧バグなら「必要な引数 'kwargs' が不足」が返る）
    out = dispatch(core.registered["read_note"], {"path": "memo.md"})
    assert "# hello" in out

    # 必須引数の不足は LLM に修正可能なエラー文で返る（TypeError にならない）
    out = dispatch(core.registered["read_note"], {})
    assert "必須引数" in out

    # 無引数のツールは空辞書で動く
    out = dispatch(core.registered["list_workspace"], {})
    assert "memo.md" in out


# --- _guard（エンジン不要のユニットテスト） ---

class _GuardHarness:
    """NoteSession.__init__ を通さず _guard だけを検証するための骨組み。"""

    def __init__(self, allowed):
        self._allowed = frozenset(allowed)
        self._cancel = False
        self.events = []
        self._emit_event = self.events.append

    _guard = engine_adapter.NoteSession._guard


def _tc(name):
    return {"function": {"name": name, "arguments": "{}"}}


def test_guard_passes_allowed_and_rejects_others():
    h = _GuardHarness({"read_note", "list_workspace"})
    calls = [_tc("read_note"), _tc("write_file"), _tc("run_command")]
    approved, override = h._guard(calls, "")
    assert [c["function"]["name"] for c in approved] == ["read_note"]
    assert override is None
    assert len(h.events) == 2  # 却下2件がステータス通知される（CWP イベント形式）
    assert all(e["type"] == "status" and e["text"].startswith("警告:") for e in h.events)


def test_guard_all_rejected_returns_empty():
    h = _GuardHarness({"read_note"})
    approved, _ = h._guard([_tc("write_file")], "")
    assert approved == []


def test_guard_cancel_short_circuits():
    h = _GuardHarness({"read_note"})
    h._cancel = True
    approved, _ = h._guard([_tc("read_note")], "")
    assert approved == [] and h.events == []


# --- bootstrap 依存（AWP が隣にある場合のみ） ---

@needs_awp
def test_bootstrap_and_note_tools_registered():
    core = engine_adapter.bootstrap(_AWP_SRC)
    ver = tuple(int(x) for x in core.API_VERSION.split(".")[:2])
    assert ver >= (1, 4)

    # note の read 系4ツールが pack="note" で登録され、OpenAI tools 形式に引けること。
    # ask_copilot は CWP 既存の pack="copilot" 登録を再利用する（note パックでは登録しない）。
    from pixie_core import registry
    for name in engine_adapter.NOTE_EXTENSION_TOOLS:
        entry = registry.TOOL_REGISTRY.get(name)
        assert entry is not None, f"{name} が未登録"
        assert entry.get("pack") == "note", f"{name} の pack が note でない（コア集合へ混入の恐れ）"
    # read_file はAWP標準ツール。Noteでも未保存WorkspaceSnapshotを読めるよう提示集合へ加える。
    assert registry.TOOL_REGISTRY["read_file"].get("pack") is None
    copilot_entry = registry.TOOL_REGISTRY.get("ask_copilot")
    assert copilot_entry is not None
    assert copilot_entry.get("pack") == "copilot"

    from pixie_core.tools import registry_to_openai_tools
    names = sorted(engine_adapter.NOTE_TOOLS | {"ask_copilot"})
    got = {t["function"]["name"] for t in registry_to_openai_tools(names)}
    assert got == set(names)


@needs_awp
def test_note_tools_execute_through_real_dispatcher(tmp_path, monkeypatch):
    """本物の pixie_core ディスパッチで Note ツールが実行まで届くことの回帰テスト。
    旧実装（**kwargs ラッパ）では「必要な引数 'kwargs' が不足しています。」が
    全呼び出しで返り、エージェントが同じ呼び出しを永遠にリトライしていた。"""
    engine_adapter.bootstrap(_AWP_SRC)
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    (tmp_path / "memo.md").write_text("# hello\n", encoding="utf-8")

    from pixie_core.tools import execute_builtin_tool
    assert "# hello" in execute_builtin_tool("read_note", {"path": "memo.md"})
    assert "memo.md:1" in execute_builtin_tool("grep_workspace", {"query": "hello"})


@needs_awp
def test_note_session_engine_profile(tmp_path):
    engine_adapter.bootstrap(_AWP_SRC)
    session = engine_adapter.NoteSession(
        engine_adapter._core,
        {"base_url": "http://localhost:1/v1", "model": "test"},
        str(tmp_path), copilot_enabled=True,
    )
    ctx = session._engine.context
    assert ctx.fixed_tool_set == engine_adapter.NOTE_TOOLS | {"ask_copilot"}
    assert session._engine.profile.name == "note"
    assert session._engine.profile.active_packs == frozenset({"copilot"})
    # suffix がエンジンの system ビルダーに載っていること
    assert session._engine._system_builder is not None

    # copilot off → 次ターンの提示集合から外れる
    session.set_copilot(False)
    assert ctx.fixed_tool_set == engine_adapter.NOTE_TOOLS
    assert session._engine.profile.tool_set == engine_adapter.NOTE_TOOLS
    assert session._engine.profile.active_packs == frozenset()

    # NoteもCodeと同じ未保存バッファ／Workset経路を使う。
    (tmp_path / "memo.md").write_text("disk\n", encoding="utf-8")
    session.set_workspace_snapshot("memo.md", "unsaved\n")
    workset = session.build_workset("直して", "memo.md", [])
    target = next(item for item in workset["items"] if item["path"] == "memo.md")
    assert target["buffer"] is True and target["chars"] == len("unsaved\n")
