/* Minimal FSRS-6 scheduler (default parameters from the published FSRS-6 spec).
   Grades: 1=Again 2=Hard 3=Good 4=Easy.  Times in days (floating). */
(function (root) {
  const W = [0.2123, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796,
             1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
  const DECAY = -W[20];
  const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  const retrievability = (t, s) => Math.pow(1 + FACTOR * t / s, DECAY);
  const interval = (s, r) => Math.max(1, Math.round(s / FACTOR * (Math.pow(r, 1 / DECAY) - 1)));
  const initS = g => Math.max(0.1, W[g - 1]);
  const initD = g => clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);
  function nextD(d, g) {
    const dd = -W[6] * (g - 3);
    const d1 = d + dd * (10 - d) / 9;
    return clamp(W[7] * initD(4) + (1 - W[7]) * d1, 1, 10);
  }
  function nextRecallS(d, s, r, g) {
    const hard = g === 2 ? W[15] : 1, easy = g === 4 ? W[16] : 1;
    return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy);
  }
  function nextForgetS(d, s, r) {
    const n = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
    return Math.max(0.1, Math.min(n, s));
  }
  function sameDayS(s, g) { return s * Math.exp(W[17] * (g - 3 + W[18])) * Math.pow(s, -W[19]); }

  /* card: {s,d,last(days),reps,lapses}   now: days (float)   returns new card + due (days) */
  function review(card, g, now, retention) {
    retention = retention || 0.9;
    const c = Object.assign({}, card);
    if (!c.s) {                                 // first ever review
      c.s = initS(g); c.d = initD(g); c.reps = 1; c.lapses = g === 1 ? 1 : 0;
    } else {
      const t = Math.max(0, now - c.last);
      if (t < 1) {                              // same-day (short-term) review
        let s2 = sameDayS(c.s, g);
        if (g >= 3) s2 = Math.max(s2, c.s);
        c.s = s2; c.d = nextD(c.d, g);
      } else {
        const r = retrievability(t, c.s);
        c.s = g === 1 ? nextForgetS(c.d, c.s, r) : nextRecallS(c.d, c.s, r, g);
        c.d = nextD(c.d, g);
      }
      c.reps = (c.reps || 0) + 1;
      if (g === 1) c.lapses = (c.lapses || 0) + 1;
    }
    c.last = now;
    // scheduling: short steps after Again/Hard when the card is still young
    let ivDays;
    if (g === 1) ivDays = 1 / 1440 * 5;               // 5 minutes
    else if (g === 2 && (c.reps <= 2 || c.s < 1)) ivDays = 1 / 1440 * 10;
    else ivDays = Math.max(1, interval(c.s, retention));
    c.due = now + ivDays;
    return c;
  }
  root.FSRS = { W, retrievability, interval, review, initS, initD };
  if (typeof module !== 'undefined') module.exports = root.FSRS;
})(typeof window !== 'undefined' ? window : globalThis);
