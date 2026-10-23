// Fig: commit vs push as a model railway yard.
// Your fenced yard = your machine. Each commit is a car lowered into the yard; it waits behind the gate.
// Push opens the gate and the cars roll out to the team's siding, where everyone can see them.
// A reviewed pull request clears the signal and the train runs through the turnout onto the main line.
// Build: node build.mjs   -> commit-push.html (light, follows the reader's dark mode)
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CAR, GAUGE, LOCO, RAIL_TOP, makeRail, pathOf2 } from "./vehicles.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = process.env.ANATOMY_SKILL ?? join(homedir(), ".claude", "skills", "anatomy");
const load = (file) => import(pathToFileURL(join(SKILL, file)).href);
const k = await load("kit/iso-kit.mjs");
const G = await load("kit/lathe.mjs");
const { kitScript } = await load("scripts/inline-kit.mjs");

const W = 600;
const H = 268;
const PLATE = { x: -184, y: -60, w: 368, d: 114, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

const BRANCH_Y = -18;
const MAIN_Y = 28;
const X0 = -176;
const X1 = 180;
const GATE_X = -70;
const HOIST_X = -152;
const SIGNAL = [8, -31];
const FAR_FENCE_Y = -38;
const NEAR_FENCE_Y = -3;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [HOIST_X, -36, 46], [HOIST_X, 2, 46], [SIGNAL[0], SIGNAL[1], 38]],
  W,
  H,
  { pad: 18, azimuth: 74, elevation: 32 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const R = makeRail(k, G, P);

// The branch: straight past the yard and the siding, then a turnout onto the main line.
const BRANCH = G.fillet([[X0, BRANCH_Y, 0], [16, BRANCH_Y, 0], [46, MAIN_Y, 0], [X1, MAIN_Y, 0]], 22, 14).map(([x, y]) => [x, y]);
const PATH = pathOf2(BRANCH);
const sAtX = (x) => x - X0;
const MERGE_FROM = PATH.lengths[PATH.points.findIndex(([, y]) => y > MAIN_Y - 0.01)];

// ---------- track ----------
function strip(points, a, b) {
  const normals = points.map((p, i) => {
    const q = points[Math.min(points.length - 1, i + 1)];
    const o = points[Math.max(0, i - 1)];
    const dx = q[0] - o[0];
    const dy = q[1] - o[1];
    const n = Math.hypot(dx, dy) || 1;
    return [-dy / n, dx / n];
  });
  const side = (off) => points.map((p, i) => [p[0] + normals[i][0] * off, p[1] + normals[i][1] * off]);
  return [...side(a), ...side(b).reverse()];
}
function track(points, { from = 0, to = Infinity } = {}) {
  const path = pathOf2(points);
  const cut = [];
  const end = Math.min(to, path.total);
  for (let s = from; s < end; s += 3) cut.push(path.at(s));
  cut.push(path.at(end));
  const ballast = S(k.extrude(strip(cut, -8, 8), 0, 1.4, P, { convex: false }), { tone: "lo", crease: "faint" });
  const sleepers = [];
  for (let s = from + 3; s < end - 1; s += 6) {
    const { x, y, yaw } = path.pose(s, 7);
    sleepers.push(R.box(x, y, yaw, 1.2, 7, 1.4, 0.9, { tone: "lo", crease: "none" }, 0.3));
  }
  const rails = [-1, 1].map((side) => S(k.extrude(strip(cut, side * GAUGE / 2 - 0.6, side * GAUGE / 2 + 0.6), 2.3, RAIL_TOP - 2.3, P, { convex: false }), { tone: "mid", crease: "faint" })).join("");
  return { ballast, sleepers: sleepers.join(""), rails };
}
const MAIN = track([[X0, MAIN_Y], [X1, MAIN_Y]]);
const SIDING = track(BRANCH, { to: MERGE_FROM + 6 });

function bufferStop(x, y, facing) {
  const out = [R.box(x, y, 0, 2.5, 6, RAIL_TOP, 7, { tone: "mid" }, 0.5, 0.4)];
  out.push(R.box(x + facing * 3.4, y, 0, 1, 5.4, RAIL_TOP + 3.2, 2.6, { tone: "mid" }, 0.3));
  for (const v of [-3.6, 3.6]) {
    const F = G.frameAlong([x + facing * 4.4, y + v, RAIL_TOP + 4.5], [facing, 0, 0]);
    out.push(S(G.disc(0, 1.4, 1.3, F, P, { steps: 16 }), { tone: "hi", crease: "none" }));
  }
  return out.join("");
}

// ---------- bench ----------
const back = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
  back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
{
  const screws = k.corners(PLATE, 10);
  back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  back.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  back.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }), D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -150, y: PLATE.y + PLATE.d - 13, w: 220, d: 6, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [1.8, 3.4], P);
  back.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }), L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  back.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
  const label = { x: 96, y: PLATE.y + PLATE.d - 18, w: 46, d: 12, r: 1 };
  back.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "mid" }), L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
  [[5, 38], [5, 30], [5, 22]].forEach(([a, b], i) => back.push(L(k.lineOnTop([label.x + a, label.y + 3.2 + i * 2.9], [label.x + b, label.y + 3.2 + i * 2.9], 0.8, P), { tone: "lo", free: true })));
  back.push(D([at([label.x + label.w - 3.4, label.y + 3, 0.8]), at([label.x + label.w - 3.4, label.y + label.d - 3, 0.8])], { size: 0.45 }));
}
// The yard's floor: a darker gravel pad marks "your machine".
{
  const yard = { x: X0 - 2, y: FAR_FENCE_Y + 1, w: GATE_X - X0 + 2, d: NEAR_FENCE_Y - FAR_FENCE_Y - 2, r: 2 };
  back.push(S(k.slabOf(yard, 0, 0.5, P, 3), { tone: "lo", crease: "none" }));
}
back.push(MAIN.ballast, SIDING.ballast, MAIN.sleepers, SIDING.sleepers, MAIN.rails, SIDING.rails);
back.push(bufferStop(X0 - 3, BRANCH_Y, 1), bufferStop(X0 - 3, MAIN_Y, 1), bufferStop(X1 + 3, MAIN_Y, -1));

// ---------- fences ----------
function fence(y, x0, x1, h, { tone = "mid" } = {}) {
  const out = [];
  const posts = [];
  for (let x = x0; x <= x1 + 0.01; x += 12) posts.push(x);
  if (posts[posts.length - 1] < x1 - 2) posts.push(x1);
  for (const z of [h * 0.35, h * 0.8]) out.push(S(k.slabOf({ x: x0, y: y - 0.5, w: x1 - x0, d: 1, r: 0.3 }, z, 1.1, P, 2), { tone: "lo", crease: "none" }));
  for (const x of posts) out.push(S(k.slabOf({ x: x - 0.9, y: y - 0.9, w: 1.8, d: 1.8, r: 0.4 }, 0, h, P, 2), { tone }), D([at([x, y, h])], { size: 0.35 }));
  return out.join("");
}
back.push(fence(FAR_FENCE_Y, X0, GATE_X - 4, 14));
const nearFence = fence(NEAR_FENCE_Y, X0, GATE_X - 4, 7);

// ---------- the gate: a rolling gate across the yard's exit ----------
const GATE = { x: GATE_X - 1, w: 2, y: -30, d: 24, h: 15 };
back.push(S(k.slabOf({ x: GATE_X - 2.5, y: -56, w: 5, d: 52, r: 0.8 }, 0, 0.8, P, 2), { tone: "lo", crease: "none" }));
back.push(S(k.slabOf({ x: GATE_X - 2, y: -5, w: 4, d: 4, r: 0.6 }, 0, 18, P, 2, 0.4), { tone: "mid" }));
function gateSvg() {
  const plan = { x: GATE.x, y: GATE.y, w: GATE.w, d: GATE.d, r: 0.4 };
  const bars = [];
  for (let y = GATE.y + 3; y < GATE.y + GATE.d - 1; y += 3) bars.push(path3([[GATE.x + GATE.w + 0.01, y, 2.2], [GATE.x + GATE.w + 0.01, y, GATE.h - 1.4]]));
  const frame = path3([[GATE.x + GATE.w + 0.01, GATE.y + 1.2, 2.2], [GATE.x + GATE.w + 0.01, GATE.y + GATE.d - 1.2, 2.2], [GATE.x + GATE.w + 0.01, GATE.y + GATE.d - 1.2, GATE.h - 1.4], [GATE.x + GATE.w + 0.01, GATE.y + 1.2, GATE.h - 1.4]], true);
  const wheels = [GATE.y + 3, GATE.y + GATE.d - 3].map((y) => S(G.disc(-0.5, 0.5, 1.6, G.frameAlong([GATE_X, y, 1.6], [1, 0, 0]), P, { steps: 16 }), { tone: "lo", crease: "none" })).join("");
  return wheels + S(k.slabOf(plan, 0.8, GATE.h - 0.8, P, 2), { tone: "mid", crease: "faint" }) + L(frame, { tone: "lo" }) + L(bars.join(""), { tone: "faint" });
}

// ---------- the hoist: a gantry that lowers each new car into the yard ----------
const HOIST = { back: -34, front: 0, beam: 44 };
const hoistBack = [
  S(k.slabOf({ x: HOIST_X - 3, y: HOIST.back - 3, w: 6, d: 6, r: 0.8 }, 0, 1.4, P, 2), { tone: "lo" }),
  S(k.slabOf({ x: HOIST_X - 1.4, y: HOIST.back - 1.4, w: 2.8, d: 2.8, r: 0.5 }, 1.4, HOIST.beam - 1.4, P, 2), { tone: "mid" }),
].join("");
const hoistBeam = [
  S(k.slabOf({ x: HOIST_X - 1.8, y: HOIST.back - 2, w: 3.6, d: HOIST.front - HOIST.back + 4, r: 0.5 }, HOIST.beam, 3, P, 2, 0.4), { tone: "mid" }),
  D([at([HOIST_X, HOIST.back, HOIST.beam + 3]), at([HOIST_X, HOIST.front, HOIST.beam + 3])], { size: 0.4 }),
  S(k.slabOf({ x: HOIST_X - 3, y: BRANCH_Y - 2.5, w: 6, d: 5, r: 0.6 }, HOIST.beam - 3.2, 3.2, P, 2), { tone: "hi", crease: "lo" }),
].join("");
const hoistFront = [
  S(k.slabOf({ x: HOIST_X - 3, y: HOIST.front - 3, w: 6, d: 6, r: 0.8 }, 0, 1.4, P, 2), { tone: "lo" }),
  S(k.slabOf({ x: HOIST_X - 1.4, y: HOIST.front - 1.4, w: 2.8, d: 2.8, r: 0.5 }, 1.4, HOIST.beam - 1.4, P, 2), { tone: "mid" }),
].join("");
back.push(hoistBack);

// ---------- the signal: the reviewer clears it when the pull request is approved ----------
{
  const [x, y] = SIGNAL;
  back.push(S(k.slabOf({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0.8 }, 0, 2, P, 2, 0.4), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 0.9, 2, 34, P, 16), { tone: "mid", crease: "none" }));
  back.push(S(k.cylinder(x, y, 1.4, 36, 1.4, P, 16), { tone: "mid" }));
  back.push(L([10, 18, 26].map((z) => k.sideArc(x, y, 0.9, z, P, 12)).join(""), { tone: "faint" }));
}
const SIGNAL_PIVOT = [SIGNAL[0] + 1.6, SIGNAL[1], 31];


// ---------- the main line: the team's train, with its locomotive at the head ----------
// Merged cars couple onto its tail, so the train only ever grows backwards from the head.
const MAIN_HEAD = X1 - 2 - LOCO.len / 2;
const MAIN_CARS = [MAIN_HEAD - LOCO.len / 2 - CAR.gap - CAR.len / 2];
MAIN_CARS.push(MAIN_CARS[0] - CAR.len - CAR.gap);
const mainCars = [...MAIN_CARS.map((x) => R.boxcar(x, MAIN_Y, 0, { tone: "mid" })), R.loco(MAIN_HEAD, MAIN_Y, 0)].join("");
const MAIN_STRAIGHT = PATH.points.findIndex(([, y]) => y > MAIN_Y - 0.01);
const sOnMain = (x) => PATH.lengths[MAIN_STRAIGHT] + (x - PATH.points[MAIN_STRAIGHT][0]);

const LABEL =
  "A model railway on a bench. At the back left, a fenced yard with a hoist and a rolling gate; a siding runs out of the gate past a signal, then curves through a turnout onto the main line at the front, where the team's train stands with its locomotive at the head. New cars are lowered into the yard and wait behind the gate until it opens.";
const svg = k.figureSvg({
  width: W,
  height: H,
  label: LABEL,
  body: [
    ...back,
    `<g data-part="gate-back"></g>`,
    `<g data-part="train"></g>`,
    `<g data-part="gate-front"></g>`,
    `<g data-part="signal-arm"></g>`,
    hoistBeam,
    `<g data-part="cable"></g>`,
    nearFence,
    hoistFront,
    mainCars,
  ],
});

const CSS = `
.iso-stage{cursor:pointer;touch-action:pan-y}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
html.embed{color-scheme:normal}
.embed body{background:transparent}
.embed .iso-page{width:100%;margin:0}
.embed .iso-figure{margin:0}
.cp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

const gateHalf = GATE.x + GATE.w / 2;
const DATA = {
  P,
  branch: BRANCH.map((p) => p.map((v) => Math.round(v * 1000) / 1000)),
  y: BRANCH_Y,
  gate: { s: sAtX(GATE_X), travel: 26, svg: gateSvg() },
  hoist: { s: sAtX(HOIST_X), x: HOIST_X, z: HOIST.beam - 3.2, lift: 28 },
  stopS: sAtX(2) - CAR.len / 2,
  tailS: sOnMain(MAIN_CARS[1] - CAR.len - CAR.gap),
  car: CAR,
  loco: LOCO,
  signal: SIGNAL_PIVOT,
  gateX: gateHalf,
};
const strip2 = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const latheSource = readFileSync(join(SKILL, "kit", "lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { frameAlong, frameOf, disc, prismOf };})();\n`;
const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

const body =
  `<style>${CSS}</style>` +
  k.plateHtml({
    fig: "Live",
    title: "Commit, push, merge",
    hint: "Click for the next step · C · P · M",
    readout: "0 saved · 0 shared",
    keys: [
      { mark: "lit", label: "Commits saved only on your machine: inside your yard, nobody else sees them" },
      { mark: "raised", label: "Pushed commits: out on the shared siding, where the team can see them" },
      { mark: "dim", label: "Main: the team's train and its locomotive, the work already merged" },
    ],
    caption:
      "Each commit lowers a car into your fenced yard. The cars wait behind the gate, however many you make, until you push: then the gate rolls back and they all go out together to the team's siding. They stay on that branch until a reviewer approves the pull request; the signal clears and the cars roll through the turnout and couple onto the back of the team's train on main.",
    body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Railway yard: press C to commit, P to push, M to merge after review, or click for the next step">${svg}</div><span class="cp-sr" aria-live="polite" data-said></span>`,
  });

const page = k
  .pageHtml({ title: "Commit, push, merge", theme: "light", body, script: kitScript() + latheScript + strip2("vehicles.mjs") + live })
  .replace('<body class="iso" data-theme="light">', `<body class="iso" data-theme="light"><script>if(matchMedia("(prefers-color-scheme: dark)").matches)document.body.dataset.theme="dark";if(window.self!==window.top)document.documentElement.classList.add("embed")</script>`);
writeFileSync(join(HERE, "commit-push.html"), page);
console.log(`wrote commit-push.html · ${(page.length / 1024).toFixed(0)} KB · path ${PATH.total.toFixed(1)} · merge from s ${MERGE_FROM.toFixed(1)}`);
