"""条件別フロー可視化（mdflow）のコアロジック。

NoteWithPixie/app/mdflow.py からの移植（Stage C）。二重実装。
統一（Python 共有カーネル化）まで NWP 側と両方を同期修正すること。

D:\\Workspace\\MdFlow の mdflow/{mapping,mermaid,frontmatter}.py からの移植
（PPT 関連の payload/pptx_io/upsert_preset は除外）。プレビュー描画は
static/js/mdflow.js が同じ仕様を JS で実装しており、正規表現・評価の意味論は
本モジュールと一致させること（乖離すると「プレビューでは描けるのに
/api/patch 検証では警告」というちぐはぐが起きる）。

仕様の要点:
- ```mermaid ブロック内の ``%% id: flow-login`` で図に ID を付ける。
- ```mdflow-mapping ブロック（YAML）に diagram / presets / style を書く::

      diagram: flow-login
      presets:
        管理者・正常:
          when: 'role == "admin" && error_count == 0'
          active_nodes: [A, B, D]
      style:
        active: 'fill:#ff9999,stroke:#333'

- ルール式は eval を使わず ast を安全に手評価する。サポート演算子は
  ``&& || ! == != < <= > >=`` のみ。識別子 ``true`` / ``false`` / ``null`` は
  JSON 風リテラルとして解決する（ctx にキーがあればそちらが優先）。それ以外の
  未定義識別子は None、型不一致比較は False。
- 選択状態は frontmatter の ``mdflow: selected: {図ID: プリセット名}`` が正。
"""
from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from typing import Any, Optional

import yaml

# --------------------------------------------------------------------------- #
# mdflow-mapping ブロック（移植元: mdflow/mapping.py）
# --------------------------------------------------------------------------- #

# static/js/mdflow.js の MAPPING_BLOCK_RE と同一パターン
_BLOCK_RE = re.compile(
    r"^```[ \t]*(?:yaml[ \t]+)?mdflow-mapping[ \t]*\n(.*?)^```",
    re.DOTALL | re.MULTILINE,
)

DEFAULT_ACTIVE_STYLE = "fill:#ff9999,stroke:#333,stroke-width:2px"
# 非アクティブノードの淡色化スタイル（ダークテーマ前提。控えめな灰色で埋没させる）
DEFAULT_INACTIVE_STYLE = "fill:#2a2a2a,stroke:#555,color:#888"


class RuleError(ValueError):
    """ルール式が不正・評価不能なときに送出."""


@dataclass
class Preset:
    name: str
    when: str = ""
    active_nodes: list[str] = field(default_factory=list)
    # エッジのハイライトは未実装（Mermaid の linkStyle が出現 index 指定で
    # 壊れやすいため見送り）。データとしてだけ受け付ける。
    active_edges: list[Any] = field(default_factory=list)


@dataclass
class Mapping:
    diagram_id: str
    presets: dict[str, Preset] = field(default_factory=dict)
    active_style: str = DEFAULT_ACTIVE_STYLE
    inactive_style: str = DEFAULT_INACTIVE_STYLE

    def preset_names(self) -> list[str]:
        return list(self.presets.keys())


def _iter_mapping_blocks(md_text: str):
    """(match, data|None, error|None) を mdflow-mapping ブロックごとに返す。

    YAML が壊れていても他のブロックの処理を止めない（error に理由を積む）。
    """
    for m in _BLOCK_RE.finditer(md_text):
        try:
            data = yaml.safe_load(m.group(1)) or {}
        except yaml.YAMLError as e:
            yield m, None, f"YAML 構文エラー: {e}"
            continue
        if not isinstance(data, dict):
            yield m, None, "YAML のトップレベルがマッピングではありません"
            continue
        yield m, data, None


def extract_mappings(md_text: str) -> list[Mapping]:
    """Markdown 本文からすべての mdflow-mapping ブロックを取り出す（壊れたものは無視）."""
    mappings: list[Mapping] = []
    for _m, data, err in _iter_mapping_blocks(md_text):
        if err is None:
            mappings.append(_parse_mapping(data))
    return mappings


def _parse_mapping(data: dict[str, Any]) -> Mapping:
    diagram_id = str(data.get("diagram", "") or "")
    presets: dict[str, Preset] = {}
    for name, spec in (data.get("presets") or {}).items():
        spec = spec or {}
        presets[str(name)] = Preset(
            name=str(name),
            when=str(spec.get("when", "") or ""),
            active_nodes=[str(x) for x in (spec.get("active_nodes") or [])],
            active_edges=list(spec.get("active_edges") or []),
        )
    style_data = data.get("style") or {}
    active_style = style_data.get("active", DEFAULT_ACTIVE_STYLE)
    inactive_style = style_data.get("inactive", DEFAULT_INACTIVE_STYLE)
    return Mapping(
        diagram_id=diagram_id,
        presets=presets,
        active_style=str(active_style),
        inactive_style=str(inactive_style),
    )


def find_mapping(mappings: list[Mapping], diagram_id: str) -> Optional[Mapping]:
    for mp in mappings:
        if mp.diagram_id == diagram_id:
            return mp
    return None


# --------------------------------------------------------------------------- #
# ルール式評価（安全な ast 手評価。移植元: mdflow/mapping.py）
# --------------------------------------------------------------------------- #
_ALLOWED_CMP = {
    ast.Eq: lambda a, b: a == b,
    ast.NotEq: lambda a, b: a != b,
    ast.Lt: lambda a, b: a < b,
    ast.LtE: lambda a, b: a <= b,
    ast.Gt: lambda a, b: a > b,
    ast.GtE: lambda a, b: a >= b,
}


def _normalize(expr: str) -> str:
    """C風演算子を Python 風に変換（!= を壊さないよう順序に注意）."""
    expr = expr.replace("&&", " and ").replace("||", " or ")
    expr = re.sub(r"!(?!=)", " not ", expr)  # ! だが != ではないもの
    return expr.strip()  # 先頭に not 等が来たときの unexpected indent を防ぐ


def evaluate(expr: str, conditions: dict[str, Any]) -> bool:
    """ルール式を条件辞書に対して評価する.

    未定義の識別子は None として扱い、比較は例外にせず False に倒す。
    ただし ``true`` / ``false`` / ``null`` は conditions になければ
    JSON 風リテラル（True / False / None）として解決する（conditions に
    同名キーがあればそちらを優先）。空文字の式は常に True（無条件プリセット）。
    """
    expr = (expr or "").strip()
    if not expr:
        return True
    try:
        tree = ast.parse(_normalize(expr), mode="eval")
    except SyntaxError as e:
        raise RuleError(f"ルール式の構文エラー: {expr!r} ({e})") from e
    return bool(_eval_node(tree.body, conditions))


def _eval_node(node: ast.AST, ctx: dict[str, Any]) -> Any:
    if isinstance(node, ast.BoolOp):
        vals = [_eval_node(v, ctx) for v in node.values]
        if isinstance(node.op, ast.And):
            return all(vals)
        return any(vals)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
        return not _eval_node(node.operand, ctx)
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, ctx)
        for op, comparator in zip(node.ops, node.comparators):
            right = _eval_node(comparator, ctx)
            fn = _ALLOWED_CMP.get(type(op))
            if fn is None:
                raise RuleError(f"未対応の比較演算子: {type(op).__name__}")
            try:
                if not fn(left, right):
                    return False
            except TypeError:
                return False  # 型不一致（None 比較など）は False に倒す
            left = right
        return True
    if isinstance(node, ast.Name):
        if node.id in ctx:
            return ctx[node.id]
        if node.id == "true":
            return True
        if node.id == "false":
            return False
        if node.id == "null":
            return None
        return None
    if isinstance(node, ast.Constant):
        return node.value
    raise RuleError(f"許可されていない式要素: {type(node).__name__}")


@dataclass
class Resolution:
    preset: str
    active_nodes: list[str]
    active_edges: list[Any]
    style: str
    inactive_style: str = DEFAULT_INACTIVE_STYLE


def resolve(
    mapping: Mapping,
    conditions: dict[str, Any],
    selected_preset: Optional[str] = None,
) -> Optional[Resolution]:
    """適用すべきプリセットを決定する.

    selected_preset があればそれを優先（Frontmatter の選択状態＝正）。
    無ければ presets を上から評価し、最初に when が真になったものを採用。
    """
    if selected_preset and selected_preset in mapping.presets:
        p = mapping.presets[selected_preset]
        return Resolution(
            p.name, p.active_nodes, p.active_edges, mapping.active_style, mapping.inactive_style
        )
    for p in mapping.presets.values():
        try:
            hit = evaluate(p.when, conditions)
        except RuleError:
            hit = False  # 壊れた式のプリセットは自動判定から外す（検証側で警告）
        if hit:
            return Resolution(
                p.name, p.active_nodes, p.active_edges, mapping.active_style, mapping.inactive_style
            )
    return None


# --------------------------------------------------------------------------- #
# Mermaid ブロック抽出・ノードID解析・非破壊スタイル注入（移植元: mdflow/mermaid.py）
# --------------------------------------------------------------------------- #

# ```mermaid ... ``` ブロック（インデントフェンス非対応・素直な形のみ）
_FENCE_RE = re.compile(
    r"^```[ \t]*mermaid[ \t]*\n(.*?)^```", re.DOTALL | re.MULTILINE
)
_ID_COMMENT_RE = re.compile(r"^\s*%%\s*id\s*:\s*(\S+)", re.MULTILINE)

# flowchart のノードID抽出用
_SHAPE_RE = re.compile(r"\b([A-Za-z_][\w-]*)\s*[\[\(\{]")
_ARROW_RE = re.compile(
    r"([A-Za-z_][\w-]*)\s*(?:-{2,3}>|-{2,3}|={2,3}>|-\.->|-\.-)\s*"
    r"(?:\|[^|]*\|\s*)?([A-Za-z_][\w-]*)"
)
_FLOWCHART_HEAD_RE = re.compile(r"^\s*(graph|flowchart)\b", re.IGNORECASE)

_RESERVED = {
    "graph", "flowchart", "subgraph", "end", "classDef", "class",
    "style", "linkStyle", "click", "direction", "TB", "TD", "BT", "LR", "RL",
}


@dataclass
class MermaidBlock:
    """Markdown 内の 1 つの mermaid コードブロック."""

    diagram_id: str
    code: str            # フェンス内の生コード（末尾スタイル注入前）
    start: int           # フェンス開始（```）の文字オフセット
    end: int             # フェンス終端（```）直後の文字オフセット
    index: int = 0       # 出現順（id が無いブロックの識別に使う）

    @property
    def label(self) -> str:
        return self.diagram_id or f"#{self.index}"


def extract_blocks(md_text: str) -> list[MermaidBlock]:
    """本文中のすべての mermaid ブロックを抽出する."""
    blocks: list[MermaidBlock] = []
    for i, m in enumerate(_FENCE_RE.finditer(md_text)):
        code = m.group(1)
        idm = _ID_COMMENT_RE.search(code)
        blocks.append(
            MermaidBlock(
                diagram_id=idm.group(1) if idm else "",
                code=code.rstrip("\n"),
                start=m.start(),
                end=m.end(),
                index=i,
            )
        )
    return blocks


def is_flowchart(code: str) -> bool:
    for line in code.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("%%"):
            continue
        return bool(_FLOWCHART_HEAD_RE.match(stripped))
    return False


def parse_node_ids(code: str) -> set[str]:
    """flowchart コードから宣言されているノードIDの集合を返す（ヒューリスティック）."""
    return set(node_ids_ordered(code))


def node_ids_ordered(code: str) -> list[str]:
    """ノードIDを初出順で返す."""
    seen: dict[str, None] = {}
    for line in code.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("%%"):
            continue
        for m in _ARROW_RE.finditer(stripped):
            for gid in (m.group(1), m.group(2)):
                if gid not in _RESERVED:
                    seen.setdefault(gid, None)
        for m in _SHAPE_RE.finditer(stripped):
            gid = m.group(1)
            if gid not in _RESERVED:
                seen.setdefault(gid, None)
    return list(seen.keys())


@dataclass
class InjectionResult:
    code: str                       # スタイル注入済みコード
    missing: list[str] = field(default_factory=list)  # 実在しない指定ID


def inject_style(
    code: str,
    active_nodes: list[str],
    style: str,
    *,
    class_name: str = "mdflowActive",
    validate: bool = True,
    inactive_style: str | None = None,
) -> InjectionResult:
    """末尾に classDef/class を付与してハイライトする（元コードは非破壊）.

    validate=True かつ flowchart のとき、実在しないノードIDは適用対象から除外し
    missing に積んで返す（呼び出し側で UI 警告に使う）。

    inactive_style を渡すと、flowchart かつ適用対象が1つ以上あるとき、
    非アクティブな実在ノード（初出順）に mdflowInactive クラスを追加で付与する。
    class 指定は後勝ちなので、mdflowActive の行より前に置く（同一ノードが両方に
    含まれることは無いが、念のため active を最後に評価させる順序にしている）。
    非アクティブなノードが無ければ inactive 側の行は出さない。
    """
    base = code.rstrip("\n")
    if not active_nodes:
        return InjectionResult(code=base, missing=[])

    missing: list[str] = []
    targets = list(dict.fromkeys(active_nodes))  # 重複除去・順序維持
    flowchart = is_flowchart(code)
    ordered_present = node_ids_ordered(code) if flowchart else []
    if validate and flowchart:
        present = set(ordered_present)
        applied = [n for n in targets if n in present]
        missing = [n for n in targets if n not in present]
        targets = applied

    if not targets:
        return InjectionResult(code=base, missing=missing)

    lines = [base, ""]
    if inactive_style and flowchart:
        active_set = set(targets)
        inactive_nodes = [n for n in ordered_present if n not in active_set]
        if inactive_nodes:
            lines.append(f"classDef mdflowInactive {inactive_style};")
            lines.append(f"class {','.join(inactive_nodes)} mdflowInactive;")
    lines.append(f"classDef {class_name} {style};")
    lines.append(f"class {','.join(targets)} {class_name};")
    return InjectionResult(code="\n".join(lines), missing=missing)


def block_by_id(blocks: list[MermaidBlock], diagram_id: str) -> Optional[MermaidBlock]:
    for b in blocks:
        if b.diagram_id == diagram_id:
            return b
    return None


# --------------------------------------------------------------------------- #
# YAML Frontmatter（選択状態＝単一ソースの正。移植元: mdflow/frontmatter.py）
# --------------------------------------------------------------------------- #

# static/js/mdflow.js の FM_RE と同一パターン（先頭の BOM も許容）
_FM_RE = re.compile(r"^﻿?---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n?", re.DOTALL)


def parse_frontmatter(md_text: str) -> tuple[dict[str, Any], str]:
    """(meta, body) を返す。Frontmatter が無い・壊れているときは ({}, 元テキスト)."""
    m = _FM_RE.match(md_text)
    if not m:
        return {}, md_text
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return {}, md_text
    if not isinstance(meta, dict):
        meta = {}
    return meta, md_text[m.end():]


def get_selected(meta: dict[str, Any]) -> dict[str, str]:
    """diagram_id -> 選択プリセット名 の辞書を返す."""
    sel = (meta.get("mdflow") or {}).get("selected") or {}
    if not isinstance(sel, dict):
        return {}
    return {str(k): str(v) for k, v in sel.items()}


# --------------------------------------------------------------------------- #
# 検証・要約（NoteWithPixie 向けの新規実装）
# --------------------------------------------------------------------------- #

def validate_document(md_text: str) -> list[str]:
    """文書全体の mdflow 整合性を検査し、警告文字列のリストを返す（例外を投げない）.

    /api/patch で AI の編集案の適用結果に掛け、差分プレビューに警告として出す用。
    検査項目: frontmatter YAML / mapping ブロック YAML / diagram ID の対応 /
    active_nodes の実在 / when 式のパース可否 / selected の指す図とプリセットの存在。
    """
    warnings: list[str] = []

    fm_match = _FM_RE.match(md_text)
    meta: dict[str, Any] = {}
    if fm_match:
        try:
            loaded = yaml.safe_load(fm_match.group(1)) or {}
            if isinstance(loaded, dict):
                meta = loaded
            else:
                warnings.append("frontmatter のトップレベルがマッピングではありません")
        except yaml.YAMLError as e:
            warnings.append(f"frontmatter の YAML 構文エラー: {e}")

    blocks = extract_blocks(md_text)
    mappings: list[Mapping] = []
    for i, (_m, data, err) in enumerate(_iter_mapping_blocks(md_text)):
        if err is not None:
            warnings.append(f"mdflow-mapping ブロック #{i + 1}: {err}")
            continue
        mp = _parse_mapping(data)
        mappings.append(mp)

        if not mp.diagram_id:
            warnings.append(f"mdflow-mapping ブロック #{i + 1}: diagram が指定されていません")
            continue
        block = block_by_id(blocks, mp.diagram_id)
        if block is None:
            warnings.append(
                f"mdflow-mapping: 図 '{mp.diagram_id}' に対応する mermaid ブロック"
                f"（%% id: {mp.diagram_id}）がありません"
            )
        present = parse_node_ids(block.code) if block else None
        for p in mp.presets.values():
            if p.when:
                try:
                    evaluate(p.when, {})
                except RuleError as e:
                    warnings.append(f"プリセット '{p.name}': {e}")
            if present is not None and block and is_flowchart(block.code):
                missing = [n for n in p.active_nodes if n not in present]
                if missing:
                    warnings.append(
                        f"プリセット '{p.name}': 図 '{mp.diagram_id}' に存在しない"
                        f"ノードID {', '.join(missing)}"
                    )

    for diagram_id, preset in get_selected(meta).items():
        mp = find_mapping(mappings, diagram_id)
        if mp is None:
            warnings.append(
                f"frontmatter selected: 図 '{diagram_id}' の mdflow-mapping がありません"
            )
        elif preset not in mp.presets:
            warnings.append(
                f"frontmatter selected: 図 '{diagram_id}' にプリセット '{preset}' がありません"
            )
    return warnings


def describe(md_text: str) -> str:
    """図・プリセット・選択状態の要約テキストを返す（エージェントの読み取りツール用）.

    小型モデルが生テキストから図構造を再導出しなくて済むよう、
    ノートの mermaid 図とその条件マッピングを整形して渡す。
    """
    meta, _body = parse_frontmatter(md_text)
    selected = get_selected(meta)
    blocks = extract_blocks(md_text)
    mappings = extract_mappings(md_text)

    if not blocks:
        return "このノートに mermaid 図はありません。"

    lines: list[str] = []
    for b in blocks:
        lines.append(f"## 図 {b.label}" + ("（flowchart）" if is_flowchart(b.code) else ""))
        nodes = node_ids_ordered(b.code)
        if nodes:
            lines.append(f"ノードID: {', '.join(nodes)}")
        mp = find_mapping(mappings, b.diagram_id) if b.diagram_id else None
        if mp is None:
            lines.append("条件マッピング: なし")
        else:
            sel = selected.get(b.diagram_id)
            lines.append(f"選択中プリセット: {sel if sel else '（条件で自動判定）'}")
            lines.append("プリセット:")
            for p in mp.presets.values():
                when = p.when or "（無条件）"
                lines.append(f"- {p.name}: when: {when} / active_nodes: [{', '.join(p.active_nodes)}]")
        lines.append("")

    warns = validate_document(md_text)
    if warns:
        lines.append("警告:")
        lines.extend(f"- {w}" for w in warns)
    return "\n".join(lines).rstrip("\n")
