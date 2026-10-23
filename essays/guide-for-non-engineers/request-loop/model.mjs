// The request/response loop as a timeline, in real milliseconds.
// Typical numbers for a web app talking to a server in the same region:
// each network leg about 40 ms, the backend's own checks about 12 ms,
// a database lookup about 30 ms, and the browser repainting about 6 ms.
export const LEG = { out: 40, rules: 12, db: 30, back: 40, paint: 6 };

// The figure plays the loop slowed down by this factor, so 1 ms reads as 30 ms on screen.
export const SLOW = 30;

export function timeline(useDb) {
  const steps = [
    ["out", LEG.out],
    ["rules", LEG.rules],
    ...(useDb ? [["db", LEG.db]] : []),
    ["back", LEG.back],
    ["paint", LEG.paint],
  ];
  let at = 0;
  return steps.map(([name, length]) => {
    const step = { name, from: at, to: at + length };
    at += length;
    return step;
  });
}

export const totalOf = (useDb) => timeline(useDb).at(-1).to;

export function phaseAt(ms, useDb) {
  const steps = timeline(useDb);
  if (ms < 0) return { name: "idle", share: 0, ms: 0 };
  for (const step of steps) if (ms < step.to) return { name: step.name, share: (ms - step.from) / (step.to - step.from), ms };
  return { name: "done", share: 1, ms: steps.at(-1).to };
}

const WORDS = {
  idle: "ready · press a menu button",
  out: "request going down",
  rules: "backend checking the order",
  db: "database lookup in the pantry",
  back: "response coming up",
  paint: "screen updating",
};

export function readoutOf(phase, useDb) {
  if (phase.name === "done") return `screen updated · ${totalOf(useDb)} ms round trip${useDb ? "" : " · no database"}`;
  if (phase.name === "idle") return WORDS.idle;
  return `${WORDS[phase.name]} · ${Math.floor(phase.ms)} ms`;
}
