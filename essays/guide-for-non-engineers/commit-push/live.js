const DATA = __DATA__;
const { P, car: CARD, loco: LOCOD } = DATA;
const K = { extrude, solidSvg, lineSvg, pathOf, iso, cylinder, towardViewer, depthOf };
const RAIL = makeRail(K, G, P);
const PATH = pathOf2(DATA.branch);
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector(`[data-part="${name}"]`);
const trainEl = part("train");
const gateBack = part("gate-back");
const gateFront = part("gate-front");
const armEl = part("signal-arm");
const cableEl = part("cable");
const readout = document.querySelector("[data-readout]");
const said = document.querySelector("[data-said]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const dark = matchMedia("(prefers-color-scheme: dark)");
dark.addEventListener("change", () => (document.body.dataset.theme = dark.matches ? "dark" : "light"));

const glide = (u) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;
const STEP = CARD.len + CARD.gap;
const queueS = (i) => DATA.gate.s - 2 - CARD.len / 2 - STEP * i;
const sharedS = (j) => DATA.stopS - STEP * j;

// ---------- state ----------
let vehicles, gate, signal, hook, merged, ids;
function fresh() {
  ids = 0;
  vehicles = [];
  gate = { open: 0 };
  signal = { up: 0 };
  hook = { z: DATA.hoist.z - 4 };
  merged = 0;
}
fresh();
const cars = () => vehicles.filter((v) => v.kind === "car" && !v.merged);
const local = () => cars().filter((v) => !v.shared);
const shared = () => cars().filter((v) => v.shared);

// ---------- tweens ----------
let clock = 0;
let tweens = [];
function tween(obj, key, to, dur, delay = 0) {
  tweens.push({ obj, key, to, dur: still.matches ? 0 : dur, t0: clock + (still.matches ? 0 : delay), from: null });
}
const busy = () => tweens.length > 0;
function stepTweens() {
  tweens = tweens.filter((t) => {
    if (clock < t.t0) return true;
    if (t.from === null) t.from = t.obj[t.key];
    const u = t.dur ? (clock - t.t0) / t.dur : 1;
    t.obj[t.key] = t.from + (t.to - t.from) * glide(u);
    return u < 1;
  });
}

// ---------- the four moves ----------
function commit() {
  if (busy() || merged || cars().length >= 4) return false;
  const i = local().length;
  const v = { id: ids++, kind: "car", s: DATA.hoist.s, dz: DATA.hoist.lift, alpha: 1, shared: false };
  vehicles.push(v);
  hook.z = DATA.hoist.z - 4;
  tween(hook, "z", 19.4 + DATA.hoist.lift, 0.01);
  tween(v, "dz", 0, 0.9, 0.05);
  tween(hook, "z", 19.4, 0.9, 0.05);
  tween(hook, "z", DATA.hoist.z - 4, 0.5, 1.0);
  tween(v, "s", queueS(i), 0.8, 1.05);
  announce(`commit saved on your machine · ${cars().length} saved, ${shared().length} shared`);
  return true;
}
function push() {
  const waiting = local();
  if (busy() || merged || !waiting.length) return false;
  const base = shared().length;
  tween(gate, "open", 1, 0.6);
  waiting.forEach((v, i) => tween(v, "s", sharedS(base + i), 1.3 + i * 0.12, 0.7));
  tween(gate, "open", 0, 0.6, 0.7 + 1.3 + waiting.length * 0.12 + 0.2);
  announce(`pushed ${waiting.length} commit${waiting.length > 1 ? "s" : ""} · now the team can see them`);
  return true;
}
function merge() {
  const train = shared();
  if (busy() || merged || !train.length) return false;
  const d = DATA.tailS - DATA.stopS;
  tween(signal, "up", 1, 0.6);
  train.forEach((v) => {
    v.merged = true;
    tween(v, "s", v.s + d, 2.8, 0.8);
  });
  tween(signal, "up", 0, 0.6, 3.8);
  merged = train.length;
  announce(`pull request approved · ${merged} commits merged into main`);
  return true;
}
function reset() {
  if (busy()) return false;
  const gone = vehicles.filter((v) => v.merged);
  gone.forEach((v) => tween(v, "alpha", 0, 0.6));
  setTimeout(() => {
    vehicles = vehicles.filter((v) => !v.merged);
    merged = 0;
    run();
  }, still.matches ? 0 : 700);
  return true;
}
const SCRIPT = [commit, commit, commit, push, commit, push, merge, reset];
let step = 0;
function next() {
  for (let tries = 0; tries < SCRIPT.length; tries++) {
    const move = SCRIPT[step];
    step = (step + 1) % SCRIPT.length;
    if (move()) break;
  }
  run();
}
function announce(text) {
  said.textContent = text;
}

// ---------- drawing ----------
const cache = new Map();
function vehicleSvg(v) {
  if (v.kind === "car" && !v.merged) v.shared = v.s > DATA.gate.s;
  const half = (v.kind === "loco" ? LOCOD : CARD).len / 2;
  const pose = PATH.pose(v.s, half);
  const key = `${v.kind}:${v.s.toFixed(2)}:${v.shared}`;
  let art = cache.get(v.id);
  if (!art || art.key !== key) {
    art = { key, pose, svg: v.kind === "loco" ? RAIL.loco(pose.x, pose.y + 0, pose.yaw) : RAIL.boxcar(pose.x, pose.y, pose.yaw, v.shared ? { tone: "hi" } : { tone: "hi", lit: true }) };
    cache.set(v.id, art);
  }
  const lift = v.dz ? ` transform="${translateAlong(P, [0, 0, v.dz])}"` : "";
  const fade = v.alpha < 1 ? ` opacity="${v.alpha.toFixed(3)}"` : "";
  return { depth: depthOf([pose.x, pose.y, 0], P), svg: `<g${lift}${fade}>${art.svg}</g>` };
}
let lastTrain = "";
function draw() {
  const html = vehicles.map(vehicleSvg).sort((a, b) => a.depth - b.depth).map((v) => v.svg).join("");
  if (html !== lastTrain) {
    trainEl.innerHTML = html;
    lastTrain = html;
  }
  const gateSvg = `<g transform="${translateAlong(P, [0, -DATA.gate.travel * gate.open, 0])}">${DATA.gate.svg}</g>`;
  const back = gate.open > 0.5;
  if (gateBack.dataset.on !== String(back)) {
    gateBack.innerHTML = back ? gateSvg : "";
    gateFront.innerHTML = back ? "" : gateSvg;
    gateBack.dataset.on = String(back);
  } else (back ? gateBack : gateFront).firstChild.setAttribute("transform", translateAlong(P, [0, -DATA.gate.travel * gate.open, 0]));

  const angle = signal.up * (Math.PI / 4);
  const [px, py, pz] = DATA.signal;
  const F = G.frameOf([px, py, pz], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const arm = [[-1.2, -1.1], [13, -1.1], [13, 1.1], [-1.2, 1.1]].map(([u, w]) => [u * c - w * s, u * s + w * c]);
  armEl.innerHTML =
    solidSvg(G.prismOf(F, arm, -0.4, 0.4, P), { tone: "hi", crease: "lo" }) +
    solidSvg(G.disc(-0.9, -0.4, 1.6, G.frameAlong([px, py, pz], [1, 0, 0]), P, { steps: 16 }), { tone: "mid" }) +
    dotsSvg([iso([px + 0.4, py, pz], P)], { size: 0.45 });

  const [hx, hy] = [DATA.hoist.x, DATA.y];
  cableEl.innerHTML = lineSvg(pathOf([iso([hx, hy, DATA.hoist.z], P), iso([hx, hy, hook.z], P)]), { tone: "mid" }) + dotsSvg([iso([hx, hy, hook.z], P)], { size: 0.6, tone: "hi" });

  const text = merged && busy() ? "review approved · merging" : merged ? `merged into main · ${merged} commit${merged > 1 ? "s" : ""}` : `${cars().length} saved · ${shared().length} shared`;
  if (readout.textContent !== text) readout.textContent = text;
}

// ---------- loop ----------
let frame = 0, last = 0, visible = false;
let touring = !still.matches, tourAt = 1.4, idleTimer = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (touring && !busy() && clock >= tourAt) {
    next();
    tourAt = clock + (SCRIPT[(step + SCRIPT.length - 1) % SCRIPT.length] === merge ? 6 : 1.7);
  }
  stepTweens();
  draw();
  frame = visible && (touring || busy()) ? requestAnimationFrame(tick) : 0;
}
function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}
function interact() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    tourAt = clock + 1.4;
    run();
  }, 12000);
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => {
  interact();
  next();
});
stage.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const move = { c: commit, p: push, m: merge, r: reset }[key];
  if (move || key === " " || key === "enter") {
    event.preventDefault();
    interact();
    if (move) move();
    else next();
    run();
  }
});
still.addEventListener("change", () => {
  touring = !still.matches;
  run();
});
draw();
if (window.self !== window.top) {
  const tell = () => window.parent.postMessage({ requestLoopHeight: Math.ceil(document.querySelector(".iso-page").getBoundingClientRect().height) }, "*");
  new ResizeObserver(tell).observe(document.querySelector(".iso-page"));
  tell();
}
