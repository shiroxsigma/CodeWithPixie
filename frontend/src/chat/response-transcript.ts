/** Keep model whitespace intact while removing completed work reports. */
export class ResponseTranscript {
  private lifecycle = false;
  private committed = "";
  private active: { id: number; text: string } | null = null;

  get text(): string {
    return this.committed + (this.active?.text || "");
  }

  start(id: number): void {
    // If a server omits an end event, retain the partial answer.
    if (this.active) this.committed += this.active.text;
    this.lifecycle = true;
    this.active = { id, text: "" };
  }

  append(text: string): void {
    if (this.active) this.active.text += text;
    else if (!this.lifecycle || text.trim()) this.committed += text;
  }

  end(id: number, progress: boolean, interrupted = false): string {
    if (!this.active || this.active.id !== id) return "";
    const text = this.active.text;
    this.active = null;
    if (progress && !interrupted) return text;
    this.committed += text;
    return "";
  }
}
