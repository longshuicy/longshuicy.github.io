// Fig: the request/response loop as a restaurant with a dumbwaiter, in cutaway.
// Dining room upstairs = frontend (its menu buttons are the API), dumbwaiter shaft = network,
// kitchen = backend, pantry rack with its picker = database, the cloche lifting = the screen updating.
// Build: node build.mjs            -> request-loop.html (light, follows the reader's dark mode)
//        node build.mjs --audit    -> also proves the geometry
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LEG, SLOW, totalOf } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = process.env.ANATOMY_SKILL ?? join(homedir(), ".claude", "skills", "anatomy");
const load = (file) => import(pathToFileURL(join(SKILL, file)).href);
const k = await load("kit/iso-kit.mjs");
const G = await load("kit/lathe.mjs");
const A = await load("kit/audit.mjs");
const { kitScript } = await load("scripts/inline-kit.mjs");

const W = 600;
const H = 430;

const PLATE = { x: -164, y: -78, w: 324, d: 136, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

// The building: a back wall across the whole bench; on the left a closed block whose roof is the dining room,
// on the right an open kitchen and pantry at floor level, with the dumbwaiter shaft standing between them.
const WALL = { x: -96, y: -58, w: 192, d: 4, r: 0.6 };
const WALL_TOP = 100;
const FACE = WALL.y + WALL.d; // the wall's room-side face
const BLOCK = { x: -96, y: FACE, w: 68, d: 84, r: 1 };
const UP_TOP = 50; // the dining room's floor: the block's roof
const FLOOR = { x: 0, y: FACE, w: 96, d: 84, r: 1 };

// The dumbwaiter: an open shaft, a car on a cable over a pulley, and a counterweight behind.
const TOWER = { x: -26, y: -48, w: 24, d: 24 };
const TOWER_TOP = 108;
const CAR = { x: -23, y: -45, w: 18, d: 16, h: 18 };
// The car's floor at the kitchen, and upstairs level with the table and the conveyor (UP_TOP + 18.5 = TABLE_TOP).
const STOPS = [2, UP_TOP + 16.5];
const PULLEY = { x: -14, y: -43.1, z: 120, r: 7.4 };
const CW = { x: -20, y: -52.4, w: 12, d: 2.6, h: 10 };
const CW_LOW = 92; // the counterweight's bottom while the car is down

// Kitchen.
const COUNTER = { x: 4, y: FACE, w: 40, d: 15, r: 1 };
const RAIL_Z = 35;
const TICKET = { x: 22, y: FACE + 1.6, w: 7, d: 0.4, z0: 27.4, z1: 36 };
const BURNERS = [[14, -46], [30, -46]];

// Pantry.
const RACK = { x0: 50, x1: 92, y: FACE, d: 14 };
const SHELVES = [14, 26, 38];
const PICK = { x: 6, y: -37, w: 12, d: 8 };
const PICK_TRAVEL = 64;
const STOCK = { x: PICK.x + 2.4 + 0.5 + PICK_TRAVEL, y: -48, w: 7, d: 6, h: 5 };

// Dining room.
const TABLE = { x: -84, y: -46, w: 32, d: 26, r: 1.5 };
const TABLE_Z = UP_TOP + 16;
const TABLE_TOP = TABLE_Z + 2.5;
const LINE_Y = -34; // the conveyor's centre line, from the table into the car
const PLATE_AT = [-64, LINE_Y];
const MENU = { x: -82, y: -44, w: 6, d: 22, r: 1 };
const BUTTONS = [-40, -35.5, -31, -26.5];
const BELT = { x: TABLE.x + TABLE.w, y: LINE_Y - 5, w: -28 - TABLE.x - TABLE.w + 2, d: 10 };
const CHOSEN = 1;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners({ x: TOWER.x - 2, y: CW.y, w: TOWER.w + 4, d: TOWER.d + 8, r: 0 }, 0, PULLEY.z + PULLEY.r),
    ...k.boxCorners({ ...WALL, y: WALL.y - 1, d: WALL.d + 2 }, 0, WALL_TOP + 2),
  ],
  W,
  H,
  { pad: 20, azimuth: 56, elevation: 32 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const centreOf = (plan, z, h) => [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2];
const zUp = (x, y, z) => G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);

const R = A.recorder(P);
const record = R.solid;
const put = (name, ref, svg, shapes = [], rest = {}) => R.put({ name, at: ref, svg, shapes, ...rest });
function slab(name, plan, z, h, { tone = "mid", steps = 3, bevel = 0, crease, inner = "", extra = "", bias = 0, attrs } = {}) {
  const full = { r: 0.5, ...plan };
  const svg = S(k.slabOf(full, z, h, P, steps, bevel), { tone, crease, inner }) + extra;
  return put(name, centreOf(full, z, h), svg, [record(A.slab(full, z, h, { name }, steps))], { bias, attrs });
}
function cyl(name, cx, cy, r, z, h, { tone = "mid", steps = 24, bevel = 0, crease, inner = "", extra = "", bias = 0, attrs } = {}) {
  const svg = S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone, crease, inner }) + extra;
  return put(name, [cx, cy, z + h / 2], svg, [record(A.cylinder(cx, cy, r, z, h, { name }))], { bias, attrs });
}
// Closed outlines and edge-to-edge lines on the wall's room-side face.
const wallRect = (x0, x1, z0, z1, y = FACE + 0.02) => path3([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], true);
const wallLine = (a, b, y = FACE + 0.02) => path3([[a[0], y, a[1]], [b[0], y, b[1]]]);

// ---------- bench ----------
const back = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
k.corners(PLATE, 22).forEach(([x, y], index) => {
  cyl(`stand.foot${index}`, x, y, 7, -PLATE_H - FOOT_H, 1.6, { tone: "lo", steps: 28 });
  cyl(`stand.leg${index}`, x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, { steps: 28 });
});
{
  const screws = k.corners(PLATE, 10);
  const extra =
    L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }) +
    L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
    D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
  slab("stand.plinth", { ...PLATE }, -PLATE_H, PLATE_H, { steps: 8, bevel: 1.6, extra });
  const strip = { x: -140, y: PLATE.y + PLATE.d - 13, w: 180, d: 6, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [1.8, 3.4], P);
  slab("bench.ruler", strip, 0, 0.6, { tone: "lo", crease: "none", extra: L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) + D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }) });
  const label = { x: 64, y: PLATE.y + PLATE.d - 18, w: 46, d: 12, r: 1 };
  const rules = [[5, 38], [5, 30], [5, 22]].map(([a, b], i) => L(k.lineOnTop([label.x + a, label.y + 3.2 + i * 2.9], [label.x + b, label.y + 3.2 + i * 2.9], 0.8, P), { tone: "lo", free: true })).join("");
  slab("bench.label", label, 0, 0.8, { steps: 4, extra: L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }) + rules + D([at([label.x + label.w - 3.4, label.y + 3, 0.8]), at([label.x + label.w - 3.4, label.y + label.d - 3, 0.8])], { size: 0.45 }) });
}

// ---------- the building shell ----------
{
  const window = L(wallRect(-86, -40, 64, 92) + wallRect(-84, -42, 66, 90), { tone: "lo" }) + L(wallLine([-63, 66], [-63, 90]) + wallLine([-84, 78], [-42, 78]), { tone: "faint" });
  const seams = L([12, 28, 44].map((z) => k.sideSeam(WALL, z, P, 2)).join(""), { tone: "faint" });
  slab("wall", WALL, 0, WALL_TOP, { steps: 2, inner: seams, extra: window });
  slab("wall.cap", { x: WALL.x - 1, y: WALL.y - 1, w: WALL.w + 2, d: WALL.d + 2, r: 0.6 }, WALL_TOP, 2.4, { steps: 2, bevel: 0.4 });
  slab("window.sill", { x: -88, y: FACE, w: 50, d: 2.4, r: 0.4 }, 61.6, 1.6, { steps: 2 });
}
{
  // The block under the dining room: a closed storey with windows and a door on its two open faces.
  const front = BLOCK.y + BLOCK.d + 0.02;
  const side = BLOCK.x + BLOCK.w + 0.02;
  const onFront = (x0, x1, z0, z1) => path3([[x0, front, z0], [x1, front, z0], [x1, front, z1], [x0, front, z1]], true);
  const onSide = (y0, y1, z0, z1) => path3([[side, y0, z0], [side, y1, z0], [side, y1, z1], [side, y0, z1]], true);
  const openings = [onFront(-88, -72, 18, 38), onFront(-62, -48, 2, 34), onFront(-40, -32, 18, 38), onSide(-10, 14, 18, 38)].join("");
  const panes = [path3([[-80, front, 18], [-80, front, 38]]), path3([[-88, front, 28], [-72, front, 28]]), path3([[side, 2, 18], [side, 2, 38]])].join("");
  slab("block", BLOCK, 0, UP_TOP - 2, { steps: 2, inner: L(k.sideSeam(BLOCK, 8, P, 2), { tone: "faint" }), extra: L(openings, { tone: "lo" }) + L(panes, { tone: "faint" }) + D([at([-50, front, 18])], { size: 0.6 }) });
  slab("block.roof", { x: BLOCK.x, y: BLOCK.y, w: BLOCK.w, d: BLOCK.d, r: 1 }, UP_TOP - 2, 2, { steps: 2, bevel: 0.6 });
}
slab("floor.ground", FLOOR, 0, 2, { tone: "lo", steps: 2, crease: "faint", extra: L([24, 48, 72].map((x) => k.lineOnTop([x, FACE], [x, FLOOR.y + FLOOR.d], 2, P)).join(""), { tone: "faint" }) });

// ---------- the dumbwaiter shaft ----------
const posts = [[TOWER.x, TOWER.y], [TOWER.x + TOWER.w, TOWER.y], [TOWER.x, TOWER.y + TOWER.d], [TOWER.x + TOWER.w, TOWER.y + TOWER.d]];
slab("tower.base", { x: BLOCK.x + BLOCK.w, y: TOWER.y - 2, w: FLOOR.x - BLOCK.x - BLOCK.w, d: TOWER.d + 4, r: 0.4 }, 0, 2, { tone: "lo", steps: 2, bevel: 0.4 });
posts.forEach(([x, y], i) => {
  const plan = { x: x - 1.2, y: y - 1.2, w: 2.4, d: 2.4, r: 0.3 };
  slab(i === 0 ? "tower.postB" : `tower.postF${i}`, plan, 2, TOWER_TOP - 2, { steps: 2, inner: L([UP_TOP - 2, UP_TOP].map((z) => k.sideSeam(plan, z, P, 2)).join(""), { tone: "faint" }) });
});
slab("tower.braceB", { x: TOWER.x + 1.2, y: TOWER.y - 0.6, w: TOWER.w - 2.4, d: 1.2, r: 0.3 }, 80, 2, { tone: "lo", steps: 2 });
slab("tower.braceR", { x: TOWER.x + TOWER.w - 0.6, y: TOWER.y + 1.2, w: 1.2, d: TOWER.d - 2.4, r: 0.3 }, 80, 2, { tone: "lo", steps: 2 });
slab("tower.head", { x: TOWER.x - 2, y: TOWER.y - 2, w: TOWER.w + 4, d: TOWER.d + 4, r: 0.8 }, TOWER_TOP, 3, { steps: 2, bevel: 0.5, extra: D(posts.map(([x, y]) => at([x, y, TOWER_TOP + 3])), { size: 0.4 }) });
slab("tower.bracket", { x: PULLEY.x - 3, y: PULLEY.y - 2, w: 6, d: 4, r: 0.4 }, TOWER_TOP + 3, PULLEY.z - PULLEY.r - TOWER_TOP - 3, { steps: 2 });
{
  const F = G.frameAlong([PULLEY.x - 1.5, PULLEY.y, PULLEY.z], [1, 0, 0]);
  const svg = S(G.disc(0, 3, PULLEY.r, F, P), { tone: "hi", crease: "lo" }) + D(G.dotsOf(F, 3, PULLEY.r - 2, 6, P, { all: true }), { size: 0.4 }) + L(G.circleOf(F, 3, 1.4, P), { tone: "lo" });
  put("tower.pulley", [PULLEY.x, PULLEY.y, PULLEY.z], svg, [record(A.disc(F, 0, 3, PULLEY.r, { name: "tower.pulley" }))]);
}

// The car, its load and the counterweight are moved live; this is their markup at rest (z = 0).
const LOAD = [CAR.x + CAR.w / 2 + 1, LINE_Y];
function carSvg() {
  const base = { x: CAR.x, y: CAR.y, w: CAR.w, d: CAR.d, r: 0.8 };
  const backPanel = { x: CAR.x, y: CAR.y, w: CAR.w, d: 1.4, r: 0.3 };
  const sidePanel = { x: CAR.x, y: CAR.y + 1.4, w: 1.4, d: CAR.d - 1.4, r: 0.3 };
  return [
    S(k.slabOf(base, 0, 2, P, 2, 0.4), { tone: "hi", lit: true }),
    S(k.slabOf(backPanel, 2, CAR.h - 2, P, 2), { tone: "hi", lit: true, crease: "lo" }),
    S(k.slabOf(sidePanel, 2, CAR.h - 2, P, 2), { tone: "hi", lit: true, crease: "lo" }),
    `<g data-part="ticket-car">${ticketSvg(LOAD[0], 2)}</g>`,
    `<g data-part="dish-car" opacity="0">${dishSvg(LOAD, 2, false)}</g>`,
    S(k.slabOf(base, CAR.h, 1.4, P, 2, 0.4), { tone: "hi", lit: true, crease: "lo" }),
    D([at([PULLEY.x, PULLEY.y + PULLEY.r, CAR.h + 1.4])], { size: 0.55, tone: "hi" }),
  ].join("");
}
const cwSvg = () => S(k.slabOf({ x: CW.x, y: CW.y, w: CW.w, d: CW.d, r: 0.4 }, 0, CW.h, P, 2, 0.3), { tone: "lo" }) + D([at([PULLEY.x, CW.y + CW.d / 2, CW.h])], { size: 0.5 });

// ---------- kitchen: the backend ----------
slab("kitchen.counter", COUNTER, 2, 20, { steps: 2, inner: L(k.sideSeam(COUNTER, 8, P, 2), { tone: "faint" }), extra: L([17, 31].map((x) => path3([[x, COUNTER.y + COUNTER.d + 0.02, 2], [x, COUNTER.y + COUNTER.d + 0.02, 8]])).join(""), { tone: "faint" }) });
{
  const top = { x: COUNTER.x - 1, y: FACE, w: COUNTER.w + 2, d: COUNTER.d + 1, r: 0.8 };
  slab("kitchen.top", top, 22, 2, { steps: 2, bevel: 0.6, extra: L(BURNERS.map(([x, y]) => k.ring(x, y, 4.6, 24, P, 24) + k.ring(x, y, 2.6, 24, P, 18)).join(""), { tone: "lo" }) });
  const [pan, pot] = BURNERS;
  cyl("kitchen.pan", pan[0], pan[1], 4.2, 24, 3, { steps: 28, bevel: 0.4, extra: L(k.ring(pan[0], pan[1], 3.4, 27, P, 24), { tone: "faint" }) });
  slab("kitchen.handle", { x: pan[0] - 0.8, y: pan[1] + 4, w: 1.6, d: 8, r: 0.4 }, 25.4, 1, { steps: 2 });
  cyl("kitchen.pot", pot[0], pot[1], 4, 24, 6, { steps: 28, bevel: 0.4, inner: L(k.sideArc(pot[0], pot[1], 4, 27, P, 24), { tone: "faint" }) });
}
slab("kitchen.rail", { x: COUNTER.x + 2, y: FACE, w: COUNTER.w - 4, d: 1.6, r: 0.3 }, RAIL_Z, 1.4, { steps: 2, extra: D([at([COUNTER.x + 4, FACE + 1.6, RAIL_Z + 0.7]), at([COUNTER.x + COUNTER.w - 4, FACE + 1.6, RAIL_Z + 0.7])], { size: 0.4 }) });
{
  const t = TICKET;
  const y = t.y + t.d + 0.02;
  const lines = [0, 1, 2].map((i) => path3([[t.x + 1, y, t.z1 - 2 - i * 1.8], [t.x + t.w - 1.6 - i, y, t.z1 - 2 - i * 1.8]])).join("");
  const check = path3([[t.x + 1.4, y, t.z0 + 2.4], [t.x + 2.6, y, t.z0 + 1.2], [t.x + 5, y, t.z0 + 3.8]]);
  slab("kitchen.ticket", { x: t.x, y: t.y, w: t.w, d: t.d, r: 0.1 }, t.z0, t.z1 - t.z0, { tone: "hi", steps: 1, crease: "none", attrs: ` data-part="ticket-rail" opacity="0"`, extra: L(lines, { tone: "lo", free: true }) + `<g data-part="tick" opacity="0">${L(check, { tone: "mid", free: true })}</g>` });
}

// ---------- pantry: the database ----------
[RACK.x0, RACK.x1 - 2].forEach((x, i) => slab(`pantry.upright${i}`, { x, y: RACK.y, w: 2, d: RACK.d, r: 0.3 }, 2, 46, { steps: 2 }));
SHELVES.forEach((z, i) => slab(`pantry.shelf${i}`, { x: RACK.x0 + 2, y: RACK.y, w: RACK.x1 - RACK.x0 - 4, d: RACK.d, r: 0.3 }, z, 1.4, { steps: 2, bevel: 0.3 }));
{
  const rows = [
    [[56, "jar"], [63, "box"], [70, "jar"]],
    [[56, "box"], [64, "jar"], [71, "jar"], [79, "box"], [86, "jar"]],
    [[57, "jar"], [65, "box"], [74, "jar"], [81, "jar"], [87, "jar"]],
  ];
  rows.forEach((row, i) => {
    const z = SHELVES[i] + 1.4;
    row.forEach(([x, kind], j) => {
      if (kind === "jar") cyl(`pantry.jar${i}.${j}`, x, -47, 2.4, z, 5.4 + (j % 2), { tone: "hi", crease: "lo", steps: 20, extra: L(k.ring(x, -47, 1.6, z + 5.4 + (j % 2), P, 16), { tone: "faint" }) });
      else slab(`pantry.box${i}.${j}`, { x: x - 3, y: -50, w: 6, d: 6, r: 0.3 }, z, 6, { tone: "hi", crease: "lo", steps: 2 });
    });
  });
  slab("pantry.stock", { x: STOCK.x, y: STOCK.y, w: STOCK.w, d: STOCK.d, r: 0.3 }, SHELVES[0] + 1.4, STOCK.h, { tone: "hi", crease: "lo", steps: 2, attrs: ` data-part="stock"` });
}
slab("pantry.rail", { x: 3, y: PICK.y + 2.5, w: 90, d: 3, r: 0.5 }, 2, 1, { tone: "lo", steps: 2 });
[1.4, 93].forEach((x, i) => slab(`pantry.stop${i}`, { x, y: PICK.y + 1.5, w: 1.6, d: 5, r: 0.3 }, 2, 3, { steps: 2 }));
// The picker: a carriage with a mast and an arm that reaches the bottom shelf.
function pickerSvg() {
  const base = { x: PICK.x, y: PICK.y, w: PICK.w, d: PICK.d, r: 0.8 };
  const mast = { x: PICK.x, y: PICK.y + 1, w: 2.4, d: PICK.d - 2, r: 0.3 };
  const arm = { x: PICK.x + 2.4, y: STOCK.y - 1, w: 8, d: PICK.y - STOCK.y + 3, r: 0.3 };
  const wheels = [PICK.x + 2.5, PICK.x + PICK.w - 2.5].map((x) => S(G.disc(-0.5, 0.5, 1.5, G.frameAlong([x, PICK.y + PICK.d, 3.5], [0, 1, 0]), P, { steps: 16 }), { tone: "lo", crease: "none" })).join("");
  return [
    S(k.slabOf(base, 3, 3, P, 2, 0.4), { tone: "mid" }),
    wheels,
    S(k.slabOf(mast, 6, 16, P, 2), { tone: "mid" }),
    S(k.slabOf(arm, 22, 1.4, P, 2, 0.3), { tone: "mid" }),
    `<g data-part="picked" opacity="0">${S(k.slabOf({ x: arm.x + 0.5, y: STOCK.y, w: STOCK.w, d: STOCK.d, r: 0.3 }, 23.4, STOCK.h, P, 2), { tone: "hi", crease: "lo" })}</g>`,
  ].join("");
}

// ---------- dining room: the frontend, on the block's roof ----------
slab("dining.rug", { x: -94, y: -52, w: 46, d: 50, r: 1 }, UP_TOP, 0.4, { tone: "lo", steps: 2, crease: "none", extra: L(k.planOutline({ x: -91, y: -49, w: 40, d: 44, r: 0.6 }, UP_TOP + 0.4, P), { tone: "faint" }) });
k.corners(TABLE, 2.4).forEach(([x, y], i) => slab(`dining.leg${i}`, { x: x - 1.2, y: y - 1.2, w: 2.4, d: 2.4, r: 0.3 }, UP_TOP + 0.4, TABLE_Z - UP_TOP - 0.4, { steps: 2 }));
slab("dining.table", TABLE, TABLE_Z, TABLE_TOP - TABLE_Z, { steps: 3, bevel: 0.6 });
slab("dining.menu", MENU, TABLE_TOP, 1.4, { steps: 2, bevel: 0.3, extra: L(k.planOutline(k.insetPlan(MENU, 0.8), TABLE_TOP + 1.4, P, 2), { tone: "faint" }) });
BUTTONS.forEach((y, i) => cyl(`dining.button${i}`, MENU.x + 3, y, 1.5, TABLE_TOP + 1.4, 1.1, { tone: i === CHOSEN ? "hi" : "mid", crease: "lo", steps: 18, attrs: i === CHOSEN ? ` data-part="button"` : "" }));

// The conveyor: carries the order from the table into the car, and the dish from the car to the table.
{
  const top = TABLE_TOP;
  [BELT.x + 3, BELT.x + BELT.w - 4].forEach((x, i) => slab(`belt.leg${i}`, { x: x - 1.2, y: LINE_Y - 2.5, w: 2.4, d: 5, r: 0.3 }, UP_TOP + 0.4, top - 4 - UP_TOP - 0.4, { steps: 2 }));
  slab("belt.motor", { x: BELT.x + BELT.w - 12, y: LINE_Y - 3, w: 6, d: 6, r: 0.6 }, top - 9, 5, { steps: 2, bevel: 0.3, extra: L(k.sideSeam({ x: BELT.x + BELT.w - 12, y: LINE_Y - 3, w: 6, d: 6, r: 0.6 }, top - 6.5, P, 2), { tone: "faint" }) });
  const slats = `<g data-part="slats">${L(slatsAt(0), { tone: "faint" })}</g>`;
  slab("belt", { x: BELT.x, y: BELT.y, w: BELT.w, d: BELT.d, r: 0.8 }, top - 4, 4, { steps: 3, bevel: 0.4, inner: L(k.sideSeam({ x: BELT.x, y: BELT.y, w: BELT.w, d: BELT.d, r: 0.8 }, top - 1.4, P, 3), { tone: "faint" }), extra: slats + D([at([BELT.x + 1.6, BELT.y + 1.2, top]), at([BELT.x + BELT.w - 1.6, BELT.y + 1.2, top]), at([BELT.x + 1.6, BELT.y + BELT.d - 1.2, top]), at([BELT.x + BELT.w - 1.6, BELT.y + BELT.d - 1.2, top])], { size: 0.4 }) });
}
function slatsAt(phase) {
  const lines = [];
  const step = 2.6;
  for (let x = BELT.x + 3 + (((phase % step) + step) % step); x < BELT.x + BELT.w - 2.8; x += step) lines.push(k.lineOnTop([x, BELT.y + 2], [x, BELT.y + BELT.d - 2], TABLE_TOP, P));
  return lines.join("");
}
// What rides the belt: the order ticket and the covered dish, built where they rest and slid along x.
function ticketSvg(x, z = TABLE_TOP) {
  const t = { x: x - 3.5, y: LINE_Y - 4.5, w: 7, d: 9, r: 0.3 };
  return S(k.slabOf(t, z, 0.4, P, 2), { tone: "hi", crease: "none" }) + L([0, 1, 2].map((i) => k.lineOnTop([t.x + 1, t.y + 2 + i * 2.4], [t.x + t.w - 1.6 - i, t.y + 2 + i * 2.4], z + 0.4, P)).join(""), { tone: "lo", free: true });
}
function dishSvg([x, y], z, live = true) {
  const F = zUp(x, y, z + 0.9);
  const food = [[0, 3.6], [0.8, 3.4, 1], [1.8, 2.6, 1], [2.6, 1.2, 1]];
  const dome = [[0, 5.6], [0.8, 5.6], [2.6, 5, 1], [4.6, 3.4, 1], [6, 1.2, 1]];
  return (
    S(k.cylinder(x, y, 6.4, z, 0.9, P, 36, 0.4), { tone: "hi", crease: "lo" }) +
    L(k.ring(x, y, 4.4, z + 0.9, P, 32), { tone: "faint" }) +
    `<g${live ? ' data-part="food"' : ""}>${S(G.solidOf(food, F, P), { tone: "mid" })}</g>` +
    `<g${live ? ' data-part="cloche"' : ""}>${S(G.solidOf(dome, F, P), { tone: "hi", crease: "lo" })}${S(G.sphereOf([x, y, z + 0.9 + 6.9], 1.1, P), { tone: "mid" })}</g>`
  );
}
function chair(name, seat, back) {
  k.corners(seat, 1.4).forEach(([x, y], i) => slab(`${name}.leg${i}`, { x: x - 0.8, y: y - 0.8, w: 1.6, d: 1.6, r: 0.2 }, UP_TOP + 0.4, 9, { steps: 2 }));
  slab(`${name}.seat`, seat, UP_TOP + 9.4, 1.6, { steps: 2, bevel: 0.3 });
  slab(`${name}.back`, back, UP_TOP + 11, 12, { steps: 2, inner: L(k.sideSeam(back, UP_TOP + 19, P, 2), { tone: "faint" }) });
}
chair("dining.chairL", { x: -95, y: -40, w: 10, d: 12, r: 0.6 }, { x: -95, y: -40, w: 1.6, d: 12, r: 0.3 });
chair("dining.chairF", { x: -74, y: -16, w: 12, d: 10, r: 0.6 }, { x: -74, y: -7.6, w: 12, d: 1.6, r: 0.3 });

// ---------- order ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const firstOf = (test) => R.items.findIndex(test);
const lastOf = (test) => R.items.reduce((best, item, index) => (test(item) ? index : best), -1);
const carAt = firstOf((item) => item.name.startsWith("tower.postF"));
const pickerAt = lastOf((item) => (item.name.startsWith("pantry.") && !item.name.startsWith("pantry.stop")) || item.name.startsWith("kitchen."));
if (process.argv.includes("--order")) console.log(R.items.map((item, i) => `${i} ${item.name}`).filter((line) => /pantry|floor|kitchen/.test(line)).join("\n"));
// Riders slide along the belt between the table and the car: after the belt and the table, before the shaft's near post.
const ridersAt = Math.max(firstOf((item) => item.name === "belt"), firstOf((item) => item.name === "dining.table"), firstOf((item) => item.name === "dining.menu"));
if (ridersAt >= firstOf((item) => item.name === "tower.postF2")) console.warn("belt riders come after the shaft's near post");
if (process.argv.includes("--order")) console.log(R.items.map((item, i) => `${i} ${item.name}`).filter((l) => /tower|belt|dining.table|dining.menu|dining.button|block/.test(l)).join("\n"));
const riders = `<g data-part="ticket-belt" opacity="0">${ticketSvg(LOAD[0])}</g><g data-part="dish">${dishSvg(PLATE_AT, TABLE_TOP)}</g>`;
const groups = R.items.map((item, index) => {
  const before = index === carAt ? `<g data-part="counterweight">${cwSvg()}</g><g data-part="cables"></g><g data-part="car">${carSvg()}</g>` : "";
  const after = (index === pickerAt ? `<g data-part="picker">${pickerSvg()}</g>` : "") + (index === ridersAt ? riders : "");
  return `${before}<g data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>${after}`;
});

const LABEL =
  "A small restaurant on a bench. On the left, a dining room on the roof of a closed block: a table with a row of menu buttons and a covered plate, and a short conveyor belt from the table to the dumbwaiter. On the right at floor level, a kitchen counter with a pan and a pot, an order rail on the wall, and a pantry rack of jars and boxes with a picker on a floor rail. Between them, a dumbwaiter car runs up and down an open shaft on a cable over a pulley, balanced by a counterweight.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [...back, ...groups] });

const CSS = `
.iso-stage{cursor:pointer;touch-action:pan-y}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
html.embed{color-scheme:normal}
.embed body{background:transparent}
.embed .iso-page{width:100%;margin:0}
.embed .iso-figure{margin:0}
.rl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

const DATA = {
  P,
  stops: STOPS,
  pulley: PULLEY,
  cw: { x: PULLEY.x, y: CW.y + CW.d / 2, h: CW.h, low: CW_LOW },
  carTop: CAR.h + 1.4,
  cable: { x: PULLEY.x, carY: PULLEY.y + PULLEY.r },
  pickTravel: PICK_TRAVEL,
  cloche: 10,
  load: LOAD[0],
  plate: PLATE_AT[0],
  ticketFrom: BELT.x + 4,
  belt: { x: BELT.x, y: BELT.y, w: BELT.w, d: BELT.d, top: TABLE_TOP },
  slow: SLOW,
};
const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

const body =
  `<style>${CSS}</style>` +
  k.plateHtml({
    fig: "Live",
    title: "Request and response",
    hint: "Click or press space to order",
    readout: "ready · press a menu button",
    keys: [
      { mark: "lit", label: "The dumbwaiter, fed by the belt: the order goes in, the dish comes out" },
      { mark: "raised", label: "Upstairs = frontend, its buttons = the API, kitchen = backend, pantry = database" },
    ],
    caption: `Press a menu button and the order ticket rides the belt into the dumbwaiter and down to the kitchen, which checks it and, for some orders, sends the picker into the pantry. The dish rides back up and out along the belt to the table, and the cloche lifts: the screen updates. Upstairs only sees the menu and the dumbwaiter, never the kitchen. Typical times: ${LEG.out} ms each way, ${LEG.rules} ms of checks, ${LEG.db} ms for the database, played ${SLOW}× slower.`,
    body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Place an order: the request goes down to the kitchen and the response comes back up">${svg}</div><span class="rl-sr" aria-live="polite" data-said></span>`,
  });

const page = k
  .pageHtml({ title: "Request and response", theme: "light", body, script: kitScript() + model + live })
  .replace('<body class="iso" data-theme="light">', `<body class="iso" data-theme="light"><script>if(matchMedia("(prefers-color-scheme: dark)").matches)document.body.dataset.theme="dark";if(window.self!==window.top)document.documentElement.classList.add("embed")</script>`);
writeFileSync(join(HERE, "request-loop.html"), page);
console.log(`wrote request-loop.html · ${R.items.length} items · ${R.solids.length} solids · ${(page.length / 1024).toFixed(0)} KB · round trip ${totalOf(true)} ms`);

A.auditOrExit(R, P, {});
