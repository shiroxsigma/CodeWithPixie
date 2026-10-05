import { describe, expect, it } from "vitest";
import { ResponseTranscript } from "../src/chat/response-transcript";

describe("response transcript", () => {
  it("moves reports out of the answer and ignores separators between requests", () => {
    const transcript = new ResponseTranscript();
    transcript.start(1);
    transcript.append("まず構造を確認します。\n\n");
    expect(transcript.end(1, true)).toBe("まず構造を確認します。\n\n");
    transcript.append("\n\n\n");
    transcript.start(2);
    transcript.append("README.mdを読みます。");
    transcript.end(2, true);
    transcript.append("\n");
    transcript.start(3);
    transcript.append("# プロジェクト概要\n\nC++の推論エンジンです。\n");
    transcript.end(3, false);
    transcript.append("\n\n");
    expect(transcript.text).toBe(
      "# プロジェクト概要\n\nC++の推論エンジンです。\n",
    );
  });

  it("preserves every character of edit blocks including newline-only tokens", () => {
    const transcript = new ResponseTranscript();
    const edits = "```search\n\nold\n```\n\n```replace\n\nnew\n```\n";
    transcript.start(1);
    for (const char of edits) transcript.append(char);
    transcript.end(1, false);
    expect(transcript.text).toBe(edits);
  });

  it("keeps interrupted replies and concatenates output-limit continuations", () => {
    const transcript = new ResponseTranscript();
    transcript.start(1);
    transcript.append("説明します。\n\n続き");
    expect(transcript.end(1, true, true)).toBe("");
    transcript.start(2);
    transcript.append("です。");
    expect(transcript.text).toBe("説明します。\n\n続きです。");
  });

  it("does not drop content when a boundary is missing or mismatched", () => {
    const transcript = new ResponseTranscript();
    transcript.start(1);
    transcript.append("partial");
    expect(transcript.end(7, true)).toBe("");
    transcript.start(2);
    transcript.append(" answer");
    expect(transcript.text).toBe("partial answer");
  });

  it("retains legacy streams without response boundaries verbatim", () => {
    const transcript = new ResponseTranscript();
    transcript.append("\nfirst\n\n");
    transcript.append("second\n");
    expect(transcript.text).toBe("\nfirst\n\nsecond\n");
  });
});
