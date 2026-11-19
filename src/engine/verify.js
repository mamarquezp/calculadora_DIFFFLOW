import { CAS } from "./casHelper.js";

/**
 * verify.js — Comprobación independiente de la solución obtenida.
 *
 * - Solución explícita y(x): se sustituye y, y', y'', y''' en la ecuación original
 *   y se evalúa el residuo en puntos aleatorios (con constantes C aleatorias).
 * - Solución implícita G(x,y) = C: se comprueba que dG sea proporcional a
 *   M dx + N dy, es decir  G_x·N − G_y·M = 0.
 */

const CONSTS = ["C", "C1", "C2", "C3"];
const rnd = () => 0.55 + Math.random() * 1.8;

export function verifySolution(parsed, check, fo) {
  if (!check) return null;
  try {
    if (check.kind === "implicit") return verifyImplicit(check.G, fo);
    if (check.kind === "explicit") return verifyExplicit(parsed, check.y);
  } catch {
    return null;
  }
  return null;
}

function verifyImplicit(G, fo) {
  const Gx = CAS.diff(G, "x");
  const Gy = CAS.diff(G, "y");
  const expr = `(${Gx})*(${fo.N}) - (${Gy})*(${fo.M})`;
  const scale = `abs((${Gx})*(${fo.N})) + abs((${Gy})*(${fo.M}))`;
  return residualTest(expr, scale, ["x", "y"]);
}

function verifyExplicit(parsed, y) {
  const order = parsed.order;
  const derivs = [y];
  for (let k = 1; k <= order; k++) derivs.push(CAS.diff(derivs[k - 1], "x"));
  const map = { y: derivs[0], Dy: derivs[1] };
  if (order >= 2) map.Dyy = derivs[2];
  if (order >= 3) map.Dyyy = derivs[3];

  let F = parsed.F;
  if (parsed.form === "differential") F = `(${parsed.M}) + (${parsed.N})*Dy`;
  const vars = ["x", ...CONSTS];
  const fy = CAS.fn(derivs[0], vars);
  const fds = derivs.map((d) => CAS.fn(d, vars));
  const fF = CAS.fn(F, ["x", "y", "Dy", "Dyy", "Dyyy"]);

  let valid = 0;
  let maxRel = 0;
  for (let i = 0; i < 60 && valid < 8; i++) {
    const args = [rnd(), ...CONSTS.map(() => rnd())];
    const vals = fds.map((f) => f(...args));
    while (vals.length < 4) vals.push(0);
    if (!vals.every(Number.isFinite) || !Number.isFinite(fy(...args))) continue;
    const r = fF(args[0], ...vals);
    if (!Number.isFinite(r)) continue;
    const scale = Math.max(1, ...vals.map(Math.abs));
    valid++;
    maxRel = Math.max(maxRel, Math.abs(r) / scale);
  }
  if (valid < 3) return null;
  return { ok: maxRel < 1e-6, points: valid, residual: maxRel };
}

function residualTest(expr, scaleExpr, vars) {
  let valid = 0;
  let maxRel = 0;
  for (let i = 0; i < 80 && valid < 8; i++) {
    const p = Object.fromEntries(vars.map((v) => [v, rnd()]));
    const r = CAS.evalAt(expr, p);
    const s = CAS.evalAt(scaleExpr, p);
    if (!Number.isFinite(r) || !Number.isFinite(s)) continue;
    valid++;
    maxRel = Math.max(maxRel, Math.abs(r) / Math.max(1, s));
  }
  if (valid < 3) return null;
  return { ok: maxRel < 1e-6, points: valid, residual: maxRel };
}
