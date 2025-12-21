import { type SecurityEvent } from "@chainova/shared";

export class BatchManager {
  private buffer: SecurityEvent[] = [];
  private lastFlush = Date.now();

  constructor(
    private opts: { maxEvents: number; maxMs: number },
    private onFlush: (events: SecurityEvent[]) => Promise<void>
  ) {}

  add(e: SecurityEvent) {
    this.buffer.push(e);
  }

  async tick() {
    const now = Date.now();
    const dueByCount = this.buffer.length >= this.opts.maxEvents;
    const dueByTime = this.buffer.length > 0 && now - this.lastFlush >= this.opts.maxMs;

    if (!dueByCount && !dueByTime) return;

    const batch = this.buffer.splice(0, this.buffer.length);
    this.lastFlush = now;
    await this.onFlush(batch);
  }
}
