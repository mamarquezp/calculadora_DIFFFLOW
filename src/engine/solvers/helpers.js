import { CAS, rationalize, numToTeX } from "../casHelper.js";

/**
 * helpers.js — Piezas reutilizadas por varios métodos:
 *  - step(): estructura de un paso de la trazabilidad
 *  - solveLinearCore(): y' + P(x)y = Q(x) por factor integrante (Lineal y Bernoulli)
 *  - variationOfParameters(): y_p por variación de parámetros (orden 2 y 3)
 *  - polyTeX(): polinomio característico/auxiliar en LaTeX
 */

export function step(title, badge, description, latex, footer = "") {
  return { title, badge, description, latex, footer };
}

/** Envuelve en paréntesis si la expresión LaTeX tiene sumas/restas. */
export function paren(t) {
  const s = String(t).trim();
  return /[+-]/.test(s.replace(/^-/, "").replace(/\{[^{}]*\}/g, "")) ? `\\left(${s}\\right)` : s;
}

/**
 * Resuelve dv/dx + P(x)·v = Q(x) (v = y ó u). Devuelve las piezas para mostrar.
 */
export function solveLinearCore(P, Q, dep = "y") {
  const intP = CAS.integrateStrict(P, "x");
  const mu = CAS.expOf(intP);
  const muQ = CAS.simplify(`(${mu})*(${Q})`);
  const { result: I, ok } = CAS.integrate(muQ, "x");
  const particular = ok ? CAS.simplify(`(${I})/(${mu})`) : null;
  const homog = CAS.simplify(`1/(${mu})`);
  const solExpr = ok ? CAS.simplify(`(${I})/(${mu})`) + ` + C*(${homog})` : null;
  let solTeX;
  if (ok) {
    const combined = CAS.tex(`(${particular}) + C*(${homog})`);
    solTeX = combined;
  } else {
    solTeX = `\\frac{1}{${CAS.tex(mu)}}\\left(\\int ${paren(CAS.tex(muQ))}\\,dx + C\\right)`;
  }
  return {
    intP,
    mu,
    muQ,
    integral: I,
    integralOk: ok,
    solExpr, // expresión con constante C (para verificar)
    solTeX,
    dep,
    texStd: `\\frac{d${dep}}{dx} + ${paren(CAS.tex(P))}${dep} = ${CAS.tex(Q)}`,
  };
}

/** Polinomio en LaTeX a partir de coeficientes numéricos ascendentes. */
export function polyTeX(coeffs, v = "r") {
  const parts = [];
  for (let k = coeffs.length - 1; k >= 0; k--) {
    const c = coeffs[k];
    if (Math.abs(c) < 1e-12) continue;
    const abs = Math.abs(c);
    const cTeX = numToTeX(abs);
    const pow = k === 0 ? "" : k === 1 ? v : `${v}^{${k}}`;
    const body = k === 0 ? cTeX : cTeX === "1" ? pow : `${cTeX}${pow}`;
    const sign = c < 0 ? "-" : "+";
    parts.push(parts.length === 0 ? (c < 0 ? `-${body}` : body) : ` ${sign} ${body}`);
  }
  return parts.join("") || "0";
}

/** Determinante simbólico (n ≤ 3) por cofactores. */
function det(m) {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return `(${m[0][0]})*(${m[1][1]}) - (${m[0][1]})*(${m[1][0]})`;
  const terms = [];
  for (let j = 0; j < n; j++) {
    const minor = m.slice(1).map((row) => row.filter((_, k) => k !== j));
    terms.push(`${j % 2 === 0 ? "+" : "-"}(${m[0][j]})*(${det(minor)})`);
  }
  return terms.join("");
}

/**
 * Variación de parámetros para L(y) = g(x) con base {y_1,…,y_n} de la homogénea.
 * @param basis    expresiones y_k
 * @param lead     coeficiente principal a_n(x)
 * @param next     coeficiente a_{n-1}(x) (para la fórmula de Abel)
 * @param g        término independiente
 * @param x0       punto para fijar la constante de Abel (0 en coef. constantes, 1 en Cauchy-Euler)
 */
export function variationOfParameters(basis, lead, next, g, x0 = 0) {
  const n = basis.length;
  const rows = [basis];
  for (let i = 1; i < n; i++) rows.push(rows[i - 1].map((y) => CAS.diff(y, "x")));

  // Wronskiano: determinante simbólico, simplificado con la fórmula de Abel
  const Wraw = det(rows);
  let W = CAS.simplify(Wraw);
  try {
    const p = CAS.simplify(`(${next})/(${lead})`);
    const abelExp = CAS.expOf(`-(${CAS.integrateStrict(p, "x")})`);
    const K = CAS.evalAt(`(${Wraw})/(${abelExp})`, { x: x0 });
    // K puede ser racional (p/q) o la raíz de un racional (p. ej. √3/2)
    const r = rationalize(K, 500);
    const r2 = rationalize(K * K, 500);
    const Kexpr = r ? `(${r.p}/${r.q})` : r2 ? `${K < 0 ? "-" : ""}sqrt(${r2.p}/${r2.q})` : null;
    if (Kexpr) {
      const cand = CAS.simplify(`${Kexpr}*(${abelExp})`);
      if (CAS.equal(cand, Wraw, ["x"])) W = cand;
    }
  } catch {
    /* se queda el determinante simplificado */
  }
  if (CAS.isZero(W, ["x"])) throw new Error("El Wronskiano es 0: las soluciones no son linealmente independientes.");

  const f = CAS.simplify(`(${g})/(${lead})`);
  const uPrimes = [];
  const us = [];
  for (let k = 0; k < n; k++) {
    // W_k: columna k reemplazada por (0, …, 0, 1)
    const mk = rows.map((row, i) => row.map((v, j) => (j === k ? (i === n - 1 ? "1" : "0") : v)));
    const Wk = CAS.simplify(det(mk));
    const up = CAS.simplify(`(${f})*(${Wk})/(${W})`);
    const { result, ok } = CAS.integrate(up, "x");
    if (!ok) {
      throw new Error(
        `Variación de parámetros: la integral ∫ ${up} dx no tiene primitiva elemental, no se puede expresar y_p en forma cerrada.`
      );
    }
    uPrimes.push(up);
    us.push(result);
  }
  const yp = CAS.simplify(us.map((u, k) => `(${u})*(${basis[k]})`).join("+"));
  return { W, f, uPrimes, us, yp };
}

/** Aplica el operador L(y) = Σ a_k y^(k) a una expresión. */
export function applyL(coeffs, expr) {
  let d = expr;
  const parts = [];
  coeffs.forEach((a, k) => {
    if (k > 0) d = CAS.diff(d, "x");
    if (!CAS.isZero(a, ["x"])) parts.push(`(${a})*(${d})`);
  });
  return parts.join("+") || "0";
}
