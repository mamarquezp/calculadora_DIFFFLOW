import { CAS, numToTeX, numToExpr } from "../casHelper.js";
import { step, paren, solveLinearCore } from "./helpers.js";

/**
 * Ecuación de Bernoulli:  dy/dx + P(x)·y = Q(x)·yⁿ   (n ≠ 0, 1)
 * Siguiendo los 7 pasos de clase:
 *   1. Identificar n, P(x) y Q(x)
 *   2. Dividir entre yⁿ
 *   3. Cambio de variable u = y^(1−n)
 *   4. Derivar: du/dx = (1−n) y^(−n) dy/dx
 *   5. Despejar y^(−n) dy/dx
 *   6. Reemplazar → ecuación lineal en u
 *   7. Resolver la lineal y regresar a y
 */

const CANDIDATE_N = [2, 3, 4, 5, -1, -2, -3, 1 / 2, -1 / 2, 1 / 3, 2 / 3, 3 / 2, 4 / 3, -1 / 3, 5 / 2];

/** Detecta n tal que f(x,y) = A(x)·y + B(x)·yⁿ. */
export function bernoulliForm(f) {
  for (const n of CANDIDATE_N) {
    const nExpr = numToExpr(n);
    // Separar por términos: los que van con y y los que van con yⁿ
    let A = [];
    let B = [];
    let ok = true;
    for (const t of CAS.terms(CAS.expand(f))) {
      const t1 = `(${t})/y`;
      const tn = `(${t})/y^(${nExpr})`;
      if (!CAS.dependsOn(t1, "y")) A.push(t1);
      else if (!CAS.dependsOn(tn, "y")) B.push(tn);
      else {
        ok = false;
        break;
      }
    }
    if (!ok || !B.length) continue;
    const Aexp = CAS.eliminate(A.join("+") || "0", "y");
    const Bexp = CAS.eliminate(B.join("+"), "y");
    if (CAS.isZero(Bexp, ["x"])) continue;
    if (!CAS.equal(f, `(${Aexp})*y + (${Bexp})*y^(${nExpr})`)) continue;
    return { n, nExpr, P: CAS.simplify(`-(${Aexp})`), Q: Bexp };
  }
  return null;
}

export function solveBernoulli(fo) {
  const bf = bernoulliForm(fo.f);
  if (!bf) throw new Error("La ecuación no tiene la forma de Bernoulli dy/dx + P(x)y = Q(x)yⁿ.");
  const { n, P, Q } = bf;
  const k = 1 - n; // 1 − n
  const kExpr = numToExpr(k);
  const nT = numToTeX(n);
  const kT = numToTeX(k);
  const negNT = numToTeX(-n);

  // Ecuación lineal en u:  du/dx + (1−n)P u = (1−n)Q
  const Pu = CAS.simplify(`(${kExpr})*(${P})`);
  const Qu = CAS.simplify(`(${kExpr})*(${Q})`);
  const core = solveLinearCore(Pu, Qu, "u");

  const yTeX = k === -1 ? `\\frac{1}{${core.solTeX}}` : `\\left(${core.solTeX}\\right)^{${numToTeX(1 / k)}}`;
  // y = u^(1/(1−n)) cuando queda limpio; si no, se deja y^(1−n) = u
  const generalSolutionLatex = k === -1 || k > 0 ? `y = ${yTeX}` : `y^{${kT}} = ${core.solTeX}`;

  const steps = [
    step(
      "Paso 1: Identificar n, P(x) y Q(x)",
      "Forma de Bernoulli",
      "Escribimos la ecuación como dy/dx + P(x)y = Q(x)yⁿ:",
      `\\frac{dy}{dx} + ${paren(CAS.tex(P))}y = ${paren(CAS.tex(Q))}y^{${nT}}`,
      `n = ${n}   |   P(x) = ${P}   |   Q(x) = ${Q}`
    ),
    step(
      "Paso 2: Dividir toda la ecuación entre yⁿ",
      "Preparación",
      `Multiplicamos por y^{${-n}} para dejar Q(x) solo:`,
      `y^{${negNT}}\\frac{dy}{dx} + ${paren(CAS.tex(P))}y^{${kT}} = ${CAS.tex(Q)}`
    ),
    step(
      "Paso 3: Cambio de variable u = y^(1−n)",
      "Sustitución",
      `Con n = ${n}, la sustitución es:`,
      `u = y^{1-n} = y^{${kT}}`
    ),
    step(
      "Paso 4: Derivar la sustitución",
      "Regla de la cadena",
      "Derivamos u respecto a x:",
      `\\frac{du}{dx} = (${kT})\\,y^{${negNT}}\\frac{dy}{dx}`
    ),
    step(
      "Paso 5: Despejar y^(−n) dy/dx",
      "Despeje",
      "Del paso anterior:",
      `y^{${negNT}}\\frac{dy}{dx} = \\frac{1}{${kT}}\\frac{du}{dx}`
    ),
    step(
      "Paso 6: Reemplazar en la ecuación del paso 2",
      "Linealización",
      `Sustituimos y multiplicamos por (1 − n) = ${k} para obtener una ecuación lineal en u:`,
      `\\frac{1}{${kT}}\\frac{du}{dx} + ${paren(CAS.tex(P))}u = ${CAS.tex(Q)} \\;\\Longrightarrow\\; ${core.texStd}`,
      "Ecuación lineal de primer orden en u(x)"
    ),
    step(
      "Paso 7: Resolver la lineal y regresar a y",
      "Factor integrante",
      `Factor integrante μ(x) = e^{∫${Pu} dx}; integramos y sustituimos u = y^{${k}}:`,
      `\\mu(x) = ${CAS.tex(core.mu)} \\;\\Longrightarrow\\; u = ${core.solTeX} \\;\\Longrightarrow\\; y = ${yTeX}`,
      "Solución general"
    ),
  ];

  return {
    methodTitle: `Ecuación de Bernoulli (n = ${n})`,
    block: "Bloque A • Primer Orden",
    generalSolutionLatex,
    validity: `u = y^{${kT}}`,
    steps,
    check: core.solExpr ? { kind: "explicit", y: `(${core.solExpr})^(1/(${kExpr}))` } : null,
  };
}
