// Rolling stock and track geometry, shared by the build (static parts) and the page (moving parts).
// k is the iso kit, G the lathe module; both are passed in so this file runs in Node and in the page.
export const GAUGE = 8;
export const RAIL_TOP = 3.5;
export const CAR = { len: 16, gap: 2 };
export const LOCO = { len: 18 };

export function makeRail(k, G, P) {
  const rot = ([x, y], c, s) => [x * c - y * s, x * s + y * c];
  const ringAt = (cx, cy, yaw, hx, hy, chamfer = 0) => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const local = chamfer
      ? [[-hx + chamfer, -hy], [hx - chamfer, -hy], [hx, -hy + chamfer], [hx, hy - chamfer], [hx - chamfer, hy], [-hx + chamfer, hy], [-hx, hy - chamfer], [-hx, -hy + chamfer]]
      : [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]];
    return local.map((p) => {
      const [x, y] = rot(p, c, s);
      return [cx + x, cy + y];
    });
  };
  const box = (cx, cy, yaw, hx, hy, z, h, style, chamfer = 0.6, bevel = 0) => k.solidSvg(k.extrude(ringAt(cx, cy, yaw, hx, hy, chamfer), z, h, P, { bevel }), style);
  const local = (cx, cy, yaw) => (u, v, z) => [cx + Math.cos(yaw) * u - Math.sin(yaw) * v, cy + Math.sin(yaw) * u + Math.cos(yaw) * v, z];
  const line = (points, style) => k.lineSvg(k.pathOf(points.map((p) => k.iso(p, P))), style);
  const loop = (points, style) => k.lineSvg(k.pathOf(points.map((p) => k.iso(p, P)), true), style);
  const [vx, vy] = k.towardViewer(P);

  function wheels(cx, cy, yaw, axles) {
    const at = local(cx, cy, yaw);
    const axle = [-Math.sin(yaw), Math.cos(yaw), 0];
    const near = axle[0] * vx + axle[1] * vy > 0 ? 1 : -1;
    const set = (side) =>
      axles
        .map((u) => {
          const F = G.frameAlong(at(u, side * (GAUGE / 2), RAIL_TOP + 2), axle);
          return k.solidSvg(G.disc(-0.6, 0.6, 2, F, P, { steps: 20 }), { tone: "lo", crease: "none" });
        })
        .join("");
    return { far: set(-near), near: set(near), nearSide: near };
  }

  // A boxcar: underframe, wheels, body with a sliding door, a ribbed roof and couplers.
  function boxcar(cx, cy, yaw, { tone = "hi", lit = false } = {}) {
    const half = CAR.len / 2;
    const at = local(cx, cy, yaw);
    const w = wheels(cx, cy, yaw, [-half + 3.5, half - 3.5]);
    const side = w.nearSide * 5.02;
    const ribs = [];
    for (let u = -half + 2.6; u < half - 1; u += 2.7) ribs.push([at(u, -5.6, 19.2), at(u, 5.6, 19.2)]);
    return [
      w.far,
      box(cx, cy, yaw, half - 1, 4.2, 7.6, 1.4, { tone: "lo" }),
      ...[-1, 1].map((end) => box(...at(end * (half + 0.4), 0, 0).slice(0, 2), yaw, 1, 1.2, 7.8, 1, { tone: "mid" }, 0.3)),
      w.near,
      box(cx, cy, yaw, half, 5, 9, 9, { tone, lit, crease: lit ? "lo" : "faint" }, 0.6),
      loop([at(-3, side, 10.4), at(3, side, 10.4), at(3, side, 16.8), at(-3, side, 16.8)], { tone: lit ? "mid" : "lo" }),
      line([at(0, side, 10.4), at(0, side, 16.8)], { tone: "faint" }),
      box(cx, cy, yaw, half + 0.6, 5.6, 18, 1.2, { tone, lit, crease: "lo" }, 0.6, 0.4),
      ribs.map((r) => line(r, { tone: "faint" })).join(""),
    ].join("");
  }

  // The team's locomotive: long hood in front, cab at the back, a stack on the hood.
  function loco(cx, cy, yaw) {
    const half = LOCO.len / 2;
    const at = local(cx, cy, yaw);
    const w = wheels(cx, cy, yaw, [-half + 3.5, half - 3.5]);
    const [hx, hy] = at(2.5, 0, 0);
    const [kx, ky] = at(-5.5, 0, 0);
    const [sx, sy] = at(6, 0, 0);
    const side = w.nearSide * 5.02;
    return [
      w.far,
      box(cx, cy, yaw, half - 1, 4.2, 7.6, 1.4, { tone: "lo" }),
      ...[-1, 1].map((end) => box(...at(end * (half + 0.4), 0, 0).slice(0, 2), yaw, 1, 1.2, 7.8, 1, { tone: "mid" }, 0.3)),
      w.near,
      box(cx, cy, yaw, half, 5.4, 9, 1.6, { tone: "mid" }, 0.5, 0.3),
      box(kx, ky, yaw, 3.5, 5, 10.6, 11, { tone: "hi" }, 0.5),
      loop([at(-7.6, side, 15.5), at(-3.4, side, 15.5), at(-3.4, side, 19.5), at(-7.6, side, 19.5)], { tone: "lo" }),
      box(kx, ky, yaw, 4.2, 5.7, 21.6, 1.2, { tone: "mid", crease: "lo" }, 0.5, 0.4),
      box(hx, hy, yaw, 6.5, 3.8, 10.6, 6.6, { tone: "hi" }, 0.8),
      [-1, 1].map((v) => line([at(-2, v * 3.8, 13.9), at(9, v * 3.8, 13.9)], { tone: "faint" })).join(""),
      k.solidSvg(k.cylinder(sx, sy, 1, 17.2, 2.6, P, 16), { tone: "mid" }),
    ].join("");
  }

  return { boxcar, loco, ringAt, box, local, line, loop };
}

// A path on the floor as a polyline with arc lengths.
export function pathOf2(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const total = lengths[lengths.length - 1];
  const at = (s) => {
    const t = Math.min(total, Math.max(0, s));
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < t) i++;
    const share = (t - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
    return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * share, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * share];
  };
  // A vehicle centred at s rides on two bogies; its yaw is the line between them.
  const pose = (s, half) => {
    const a = at(s - half + 3.5);
    const b = at(s + half - 3.5);
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, yaw: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  };
  return { points, lengths, total, at, pose };
}
