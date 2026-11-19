import { CAS, numToTeX } from "../casHelper.js";
import { polyRoots, rootsTeX, rootsKind } from "../polyRoots.js";
import { step, paren, polyTeX, variationOfParameters } from "./helpers.js";
import { combineBasis } from "./constantCoeff.js";

/**
 * Cauchy-Euler:  a x² y'' + b x y' + c y = g(x)   (también orden 3)
 *   1. Proponer y = x^m  →  y' = m x^{m−1},  y'' = m(m−1) x^{m−2}
 *   2. Ecuación auxiliar  a m(m−1) + b m + c = 0
 *   3. Raíces → y_c (x^m, x^m ln x, x^α cos(β ln x) …)
 *   4. Si g ≠ 0: forma estándar y variación de parámetros → y_p
 */

/** Coeficientes (ascendentes) del polinomio auxiliar Σ c_k · m(m−1)…(m−k+1). */
function auxiliaryCoeffs(cs) {
  let total = [0];
  const mulLinear = (p, shift) => {
    // p(m)·(m − shift)
    const out = new Array(p.length + 1).fill(0);
    p.forEach((c, i) => {
      out[i + 1] += c;
      out[i] -= shift * c;
    });
    return out;
  };
  cs.forEach((c, k) => {
    let p = [1];
    for (let j = 0; j < k; j++) p = mulLinear(p, j);
    p = p.map((v) => v * c);
    const len = Math.max(total.length, p.length);
    total = Array.from({ length: len }, (_, i) => (total[i] || 0) + (p[i] || 0));
  });
  return total;
}

/** Σ c_k·body(k) en LaTeX, de mayor a menor k, con signos limpios. */
function signedTerms(cs, body) {
  const out = [];
  for (let k = cs.length - 1; k >= 0; k--) {
    const c = cs[k];
    if (Math.abs(c) < 1e-12) continue;
    const b = body(k);
    const abs = Math.abs(c);
    const coef = abs === 1 && b ? "" : numToTeX(abs);
    const sign = c < 0 ? "-" : out.length ? "+" : "";
    out.push(`${sign} ${coef}${b}`.trim());
  }
  return out.join(" ");
}

const xPowTeX = (mTeX) => (mTeX === "0" ? "" : mTeX === "1" ? "x" : `x^{${mTeX}}`);
const lnPow = (j) => (j === 0 ? "" : j === 1 ? "\\ln x" : `(\\ln x)^{${j}}`);
const coefLn = (bTeX) => (bTeX === "1" ? "\\ln x" : `${bTeX}\\ln x`);

export function eulerBasis(roots) {
  const basis = [];
  for (const r of roots) {
    for (let j = 0; j < r.mult; j++) {
      const lj = j === 0 ? "" : `*log(x)^${j}`;
      if (r.im === 0) {
        basis.push({
          expr: `x^(${r.reExpr})${lj}`,
          tex: `${xPowTeX(r.reTeX)}${j ? " " : ""}${lnPow(j)}` || "1",
        });
      } else {
        const xa = r.re === 0 ? "" : `x^(${r.reExpr})*`;
        basis.push({ expr: `${xa}cos((${r.imExpr})*log(x))${lj}`, tex: `${xPowTeX(r.reTeX)}${lnPow(j)}\\cos(${coefLn(r.imTeX)})` });
        basis.push({ expr: `${xa}sin((${r.imExpr})*log(x))${lj}`, tex: `${xPowTeX(r.reTeX)}${lnPow(j)}\\sin(${coefLn(r.imTeX)})` });
      }
    }
  }
  return basis;
}

export function solveCauchyEuler(lin, cs) {
  const n = lin.order;
  const aux = auxiliaryCoeffs(cs);
  const roots = polyRoots(aux);
  const basis = eulerBasis(roots);
  const yc = combineBasis(basis);
  const auxTeX = polyTeX(aux, "m");
  const falling = ["1", "m", "m(m-1)", "m(m-1)(m-2)"];
  const auxRaw = signedTerms(cs, (k) => (k > 0 ? falling[k] : ""));

  const yDerivs = ["y = x^{m}", "y' = mx^{m-1}", "y'' = m(m-1)x^{m-2}", "y''' = m(m-1)(m-2)x^{m-3}"].slice(0, n + 1);
  const steps = [
    step(
      "Paso 1: Reconocer la estructura de Cauchy-Euler",
      "Identificación",
      "Cada derivada y⁽ᵏ⁾ está multiplicada por una constante por xᵏ:",
      `${signedTerms(cs, (k) => `${k ? xPowTeX(String(k)) : ""}y${"'".repeat(k)}`)} = ${lin.isHomogeneous ? "0" : CAS.tex(lin.g)}`,
      cs.map((c, k) => `c${k} = ${c}`).join("  |  ")
    ),
    step(
      "Paso 2: Proponer y = x^m",
      "Sustitución",
      "Para x > 0 sustituimos y = x^m y sus derivadas; todas las potencias se vuelven x^m:",
      `${yDerivs.join(",\\; ")}`
    ),
    step(
      "Paso 3: Ecuación auxiliar y raíces",
      "Ecuación auxiliar",
      `Dividimos entre x^m y simplificamos. Caso: ${rootsKind(roots)}.`,
      `${auxRaw} = 0 \\;\\Longrightarrow\\; ${auxTeX} = 0 \\;\\Longrightarrow\\; ${rootsTeX(roots, "m")}`,
      rootsKind(roots)
    ),
    step(
      "Paso 4: Solución complementaria y_c",
      "Solución homogénea",
      "Raíz real m → x^m; raíz repetida → x^m, x^m ln x; par α ± βi → x^α cos(β ln x), x^α sin(β ln x):",
      `y_c = ${yc.tex}`
    ),
  ];

  if (lin.isHomogeneous) {
    return {
      methodTitle: "Ecuación de Cauchy-Euler (Homogénea)",
      block: "Bloque B • Orden Superior",
      generalSolutionLatex: `y = ${yc.tex}`,
      validity: "x > 0",
      steps,
      parts: [{ label: "Raíces", latex: rootsTeX(roots, "m") }],
      check: { kind: "explicit", y: yc.expr },
    };
  }

  // No homogénea: variación de parámetros sobre la forma estándar
  const vp = variationOfParameters(
    basis.map((b) => b.expr),
    lin.coeffs[n],
    lin.coeffs[n - 1],
    lin.g,
    1
  );
  const ypTeX = CAS.tex(vp.yp);
  steps.push(
    step(
      "Paso 5: Forma estándar y Wronskiano",
      "Variación de parámetros",
      `Dividimos entre ${CAS.tex(lin.coeffs[n]) === "1" ? "el coeficiente principal" : `${lin.coeffs[n]}`} para obtener f(x) y calculamos W(y_1, …, y_${n}):`,
      `f(x) = ${CAS.tex(vp.f)} \\qquad W = ${CAS.tex(vp.W)}`
    ),
    step(
      "Paso 6: Calcular u_k' y u_k",
      "Regla de Cramer",
      n === 2 ? "u₁' = −y₂ f/W,  u₂' = y₁ f/W; luego integramos:" : "u_k' = W_k f / W; luego integramos:",
      `\\begin{gathered}${vp.uPrimes
        .map((u, i) => `u_{${i + 1}}' = ${CAS.tex(u)} \\;\\Rightarrow\\; u_{${i + 1}} = ${CAS.tex(vp.us[i])}`)
        .join(" \\\\ ")}\\end{gathered}`
    ),
    step(
      "Paso 7: Solución particular y_p",
      "Solución particular",
      "y_p = u₁y₁ + u₂y₂ (+ u₃y₃):",
      `y_p = ${ypTeX}`
    ),
    step(
      "Paso 8: Solución general y = y_c + y_p",
      "Resultado",
      "Sumamos la parte homogénea y la particular:",
      `y = ${yc.tex} + ${paren(ypTeX)}`
    )
  );
  return {
    methodTitle: "Ecuación de Cauchy-Euler (No Homogénea)",
    block: "Bloque B • Orden Superior",
    generalSolutionLatex: `y = ${yc.tex} ${ypTeX.startsWith("-") ? "" : "+ "}${ypTeX}`,
    validity: "x > 0",
    steps,
    parts: [
      { label: "y_c", latex: yc.tex },
      { label: "y_p", latex: ypTeX },
    ],
    check: { kind: "explicit", y: `${yc.expr} + (${vp.yp})` },
  };
}
