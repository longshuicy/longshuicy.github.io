const DATA = __DATA__;
const { P, stops, pulley, cw, cable } = DATA;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector(`[data-part="${name}"]`);
const car = part("car");
const counterweight = part("counterweight");
const cables = part("cables");
const ticketCar = part("ticket-car");
const dishCar = part("dish-car");
const ticketRail = part("ticket-rail");
const tickMark = part("tick");
const picker = part("picker");
const picked = part("picked");
const stock = part("stock");
const button = part("button");
const cloche = part("cloche");
const ticketBelt = part("ticket-belt");
const dish = part("dish");
const slats = part("slats");
const food = part("food");
const readout = document.querySelector("[data-readout]");
const said = document.querySelector("[data-said]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const dark = matchMedia("(prefers-color-scheme: dark)");
dark.addEventListener("change", () => (document.body.dataset.theme = dark.matches ? "dark" : "light"));

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const glide = (u) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;
const follow = (value, target, dt, seconds, calm) => (calm ? target : value + (target - value) * (1 - Math.exp(-dt / seconds)));

// Eased display values, so nothing pops between phases.
const shown = { ticketCar: 0, dishCar: 0, ticketBelt: 0, dish: 1, ticketRail: 0, tick: 0, picked: 0, stock: 1, lift: 1, food: 1 };
let beltPhase = 0;
let request = null; // { at, db }
let nextDb = true;
let clock = 0, last = 0, frame = 0, visible = false;
let touring = !still.matches, tourAt = 1.4, idleTimer = 0;
const msOf = () => (request ? ((clock - request.at) * 1000) / DATA.slow : -1);

function send(db = nextDb) {
  if (request && phaseAt(msOf(), request.db).name !== "done") return;
  nextDb = !db;
  request = { at: clock, db };
  if (still.matches) request.at = clock - (totalOf(db) * DATA.slow) / 1000;
  run();
}

// The belt's slats, redrawn as it runs (the same lines the build draws at rest).
function slatsAt(phase) {
  const b = DATA.belt;
  const step = 2.6;
  const lines = [];
  for (let x = b.x + 3 + (((phase % step) + step) % step); x < b.x + b.w - 2.8; x += step) lines.push(lineOnTop([x, b.y + 2], [x, b.y + b.d - 2], b.top, P));
  return lines.join("");
}

// Each network leg has two stretches: the belt between the table and the car, and the shaft.
const BELT_SHARE = 0.35;
function targets(phase) {
  const n = phase.name;
  const u = phase.share;
  const after = (names) => names.includes(n);
  const fresh = !request;
  const top = stops[1];
  const span = stops[1] - stops[0];
  // Order out: along the belt into the car, then down the shaft.
  const onBeltOut = n === "out" && u < BELT_SHARE;
  const shaftOut = n === "out" ? glide((u - BELT_SHARE) / (1 - BELT_SHARE)) : 0;
  // Dish back: up the shaft, then along the belt to the table.
  const shaftBack = n === "back" ? glide(u / (1 - BELT_SHARE)) : 0;
  const onBeltBack = n === "back" && u >= 1 - BELT_SHARE;
  const served = after(["paint", "done"]) || fresh;
  return {
    carZ: n === "out" ? top - span * shaftOut : after(["rules", "db"]) ? stops[0] : n === "back" ? stops[0] + span * shaftBack : top,
    ticketBelt: onBeltOut ? 1 : 0,
    ticketX: DATA.ticketFrom + (DATA.load - DATA.ticketFrom) * glide(u / BELT_SHARE),
    ticketCar: n === "out" && !onBeltOut ? 1 : 0,
    dishCar: n === "back" && !onBeltBack ? 1 : 0,
    dish: onBeltBack || served ? 1 : 0,
    dishX: onBeltBack ? DATA.load + (DATA.plate - DATA.load) * glide((u - (1 - BELT_SHARE)) / BELT_SHARE) : DATA.plate,
    belt: onBeltOut ? 1 : onBeltBack ? -1 : 0,
    ticketRail: fresh || n === "out" ? 0 : 1,
    tick: n === "rules" ? smoothstep(0.3, 0.9, u) : after(["db", "back", "paint", "done"]) ? 1 : 0,
    pick: n === "db" ? (u < 0.45 ? glide(u / 0.45) : u < 0.55 ? 1 : 1 - glide((u - 0.55) / 0.45)) : 0,
    picked: request && request.db && (n === "db" ? u > 0.42 : after(["back", "paint", "done"])) ? 1 : 0,
    stock: request && request.db && (n === "db" ? u > 0.42 : after(["back", "paint", "done"])) ? 0 : 1,
    lift: n === "back" ? 0 : 1,
    food: 1,
    press: request ? Math.max(0, 1 - Math.abs(msOf() - 2) / 5) : 0,
  };
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  let phase = request ? phaseAt(msOf(), request.db) : { name: "idle", share: 0, ms: 0 };
  if (touring && clock >= tourAt && (!request || phase.name === "done")) {
    send();
    tourAt = clock + (totalOf(request.db) * DATA.slow) / 1000 + 3;
    phase = phaseAt(msOf(), request.db);
  }
  const t = targets(phase);

  car.setAttribute("transform", translateAlong(P, [0, 0, t.carZ]));
  const cwZ = cw.low - (t.carZ - stops[0]);
  counterweight.setAttribute("transform", translateAlong(P, [0, 0, cwZ]));
  const rim = (y) => iso([cable.x, y, pulley.z], P);
  cables.innerHTML = lineSvg(pathOf([rim(cable.carY), iso([cable.x, cable.carY, t.carZ + DATA.carTop], P)]) + pathOf([rim(cw.y), iso([cw.x, cw.y, cwZ + cw.h], P)]), { tone: "mid" });

  let moving = false;
  // Hand-offs between the belt and the car are instant swaps of two identical drawings in the same place.
  for (const key of ["ticketCar", "dishCar", "ticketBelt"]) shown[key] = t[key];
  if (t.dish && !shown.dish) shown.dish = 1;
  if (shown.dish < 0.05) shown.lift = t.lift; // an eaten dish resets its cloche out of sight
  for (const key of ["dish", "ticketRail", "tick", "picked", "stock", "lift", "food"]) {
    const next = follow(shown[key], t[key], dt, key === "lift" ? 0.18 : 0.12, calm);
    shown[key] = Math.abs(next - t[key]) < 1e-3 ? t[key] : next;
    if (shown[key] !== t[key]) moving = true;
  }
  ticketCar.setAttribute("opacity", shown.ticketCar.toFixed(3));
  ticketBelt.setAttribute("opacity", shown.ticketBelt.toFixed(3));
  ticketBelt.setAttribute("transform", translateAlong(P, [t.ticketX - DATA.load, 0, 0]));
  dish.setAttribute("opacity", shown.dish.toFixed(3));
  dish.setAttribute("transform", translateAlong(P, [t.dishX - DATA.plate, 0, 0]));
  if (t.belt && !calm) {
    beltPhase += t.belt * dt * 30;
    slats.innerHTML = lineSvg(slatsAt(beltPhase), { tone: "faint" });
  }
  dishCar.setAttribute("opacity", shown.dishCar.toFixed(3));
  ticketRail.setAttribute("opacity", shown.ticketRail.toFixed(3));
  tickMark.setAttribute("opacity", shown.tick.toFixed(3));
  picked.setAttribute("opacity", shown.picked.toFixed(3));
  stock.setAttribute("opacity", shown.stock.toFixed(3));
  food.setAttribute("opacity", shown.food.toFixed(3));
  picker.setAttribute("transform", translateAlong(P, [DATA.pickTravel * t.pick, 0, 0]));
  cloche.setAttribute("transform", translateAlong(P, [0, 0, DATA.cloche * shown.lift]));
  button.setAttribute("transform", translateAlong(P, [0, 0, -0.7 * t.press]));

  const text = request ? readoutOf(phase, request.db) : readoutOf({ name: "idle" });
  if (readout.textContent !== text) readout.textContent = text;
  if (request && phase.name === "done" && said.dataset.for !== String(request.at)) {
    said.dataset.for = String(request.at);
    said.textContent = text;
  }

  const inFlight = request && phase.name !== "done";
  frame = visible && (touring || inFlight || moving) ? requestAnimationFrame(tick) : 0;
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
  }, 9000);
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => {
  interact();
  send();
});
stage.addEventListener("keydown", (event) => {
  if (event.key !== " " && event.key !== "Enter") return;
  event.preventDefault();
  interact();
  send();
});
still.addEventListener("change", () => {
  touring = !still.matches;
  run();
});
if (window.self !== window.top) {
  const tell = () => window.parent.postMessage({ requestLoopHeight: Math.ceil(document.querySelector(".iso-page").getBoundingClientRect().height) }, "*");
  new ResizeObserver(tell).observe(document.querySelector(".iso-page"));
  tell();
}
