import Decimal from "decimal.js";
import { type SecurityEvent } from "@chainova/shared";

/**
 * Lightweight online time-series anomaly detection (no heavy ML libs).
 *
 * We track per-sender streaming mean/variance of value_wei and counts per minute.
 * - z-score on value
 * - EWMA on tx/min rate
 *
 * This is designed for near-real-time monitoring and explainability.
 */

export interface SenderStats {
  n: number;
  mean: Decimal;
  m2: Decimal; // sum of squares of differences from mean (Welford)
  ewmaRate: number; // smoothed tx/min
  lastMinute: number;
  minuteCount: number;
}

export class TimeSeriesState {
  private bySender = new Map<string, SenderStats>();

  update(e: SecurityEvent): { valueZScore?: number; rateEwma?: number; minuteCount: number } {
    const sender = e.sender.toLowerCase();
    const minute = Math.floor(e.timestamp / 60);

    const v = new Decimal(e.value);

    let st = this.bySender.get(sender);
    if (!st) {
      st = {
        n: 0,
        mean: new Decimal(0),
        m2: new Decimal(0),
        ewmaRate: 0,
        lastMinute: minute,
        minuteCount: 0,
      };
      this.bySender.set(sender, st);
    }

    // Minute bucket counter (for rate)
    if (minute !== st.lastMinute) {
      // finalize previous minute into EWMA
      const alpha = 0.3;
      st.ewmaRate = alpha * st.minuteCount + (1 - alpha) * st.ewmaRate;
      st.lastMinute = minute;
      st.minuteCount = 0;
    }
    st.minuteCount += 1;

    // Welford update for value statistics
    st.n += 1;
    const delta = v.minus(st.mean);
    st.mean = st.mean.plus(delta.div(st.n));
    const delta2 = v.minus(st.mean);
    st.m2 = st.m2.plus(delta.times(delta2));

    let z: number | undefined;
    if (st.n >= 30) {
      const variance = st.m2.div(st.n - 1);
      const std = variance.sqrt();
      if (!std.isZero()) {
        z = Number(v.minus(st.mean).div(std).toString());
      }
    }

    return { valueZScore: z, rateEwma: st.ewmaRate, minuteCount: st.minuteCount };
  }
}
