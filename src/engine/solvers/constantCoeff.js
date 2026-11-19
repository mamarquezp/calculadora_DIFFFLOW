import { CAS, numToTeX, numToExpr, rationalize } from "../casHelper.js";
import { polyRoots, rootsTeX, rootsKind } from "../polyRoots.js";
import { step, paren, polyTeX, variationOfParameters, applyL } from "./helpers.js";

/**
 * Orden superior con coeficientes constantes:
 *   a_n y⁽ⁿ⁾ + … + a_1 y' + a_0 y = g(x)
 *
 * Homogénea:     y = e^{rx} → ecuación característica → raíces → y_c
 * No homogénea:  y = y_c + y_p, con y_p por
 *   - Coeficientes indeterminados (con el aniquilador de g(x)), o
 *   - Variación de parámetros (Wronskiano).
 */

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "K", "L", "P", "Q", "R", "S"];

/** Texto LaTeX de r·x (r como LaTeX), p. ej. 2x, -x, x, \left(-1+\sqrt2\right)x */
function coefX(rTeX, xTeX = "x") {
  if (rTeX === "1") return xTeX;
  if (rTeX === "-1") return `-${xTeX}`;
  if (/[+]|\s-\s/.test(rTeX)) return `\\left(${rTeX}\\right)${xTeX}`;
  return `${rTeX}${xTeX}`;
}

/** Potencia x^j en LaTeX */
const xPow = (j, base = "x") => (j === 0 ? "" : j === 1 ? base : `${base}^{${j}}`);

/** Construye la base de soluciones a partir de las raíces características. */
export function constantBasis(roots) {
  const basis = [];
  for (const r of roots) {
    for (let j = 0; j < r.mult; j++) {
      const xj = j === 0 ? "1" : `x^${j}`;
      if (r.im === 0) {
        const ex = r.re === 0 ? "" : `e^{${coefX(r.reTeX)}}`;
        basis.push({
          expr: r.re === 0 ? xj : `${xj}*e^((${r.reExpr})*x)`,
          tex: [xPow(j), ex].filter(Boolean).join(" ") || "1",
        });
      } else {
        const ex = r.re === 0 ? "" : `e^{${coefX(r.reTeX)}}`;
        const arg = coefX(r.imTeX);
        const expPart = r.re === 0 ? "" : `*e^((${r.reExpr})*x)`;
        basis.push({
          expr: `${xj}${expPart}*cos((${r.imExpr})*x)`,
          tex: `${xPow(j)}${ex}\\cos(${arg})`,
        });
        basis.push({
          expr: `${xj}${expPart}*sin((${r.imExpr})*x)`,
          tex: `${xPow(j)}${ex}\\sin(${arg})`,
        });
      }
    }
  }
  return basis;
}

export function combineBasis(basis) {
  return {
    tex: basis.map((b, i) => `C_{${i + 1}}${b.tex === "1" ? "" : ` ${b.tex}`}`).join(" + "),
    expr: basis.map((b, i) => `C${i + 1}*(${b.expr})`).join("+"),
  };
}

/** Parte homogénea: ecuación característica, raíces y y_c. */
export function homogeneousPart(lin) {
  const a = lin.coeffs.map((c) => CAS.toNumber(c));
  const roots = polyRoots(a);
  const basis = constantBasis(roots);
  const yc = combineBasis(basis);
  const n = lin.order;
  const charTeX = polyTeX(a, "r");
  const derivTeX = ["e^{rx}", "re^{rx}", "r^{2}e^{rx}", "r^{3}e^{rx}"].slice(0, n + 1);

  const steps = [
    step(
      "Paso 1: Proponer y = e^{rx}",
      "Sustitución",
      `Sustituimos y = e^{rx} y sus derivadas (${derivTeX.slice(1).map((_, k) => "y" + "'".repeat(k + 1)).join(", ")}) en la ecuación homogénea L(y) = 0:`,
      `y = e^{rx},\\; ${derivTeX
        .slice(1)
        .map((d, k) => `y${"'".repeat(k + 1)} = ${d}`)
        .join(",\\; ")} \\;\\Longrightarrow\\; \\left(${charTeX}\\right)e^{rx} = 0`,
      "Como e^{rx} ≠ 0, dividimos entre e^{rx}"
    ),
    step(
      "Paso 2: Ecuación característica y sus raíces",
      "Ecuación auxiliar",
      `Resolvemos la ecuación característica. Caso: ${rootsKind(roots)}.`,
      `${charTeX} = 0 \\;\\Longrightarrow\\; ${rootsTeX(roots, "r")}`,
      rootsKind(roots)
    ),
    step(
      "Paso 3: Solución complementaria y_c",
      "Superposición",
      ycRuleText(roots),
      `y_c = ${yc.tex}`
    ),
  ];
  return { roots, basis, yc, steps, charTeX, a };
}

function ycRuleText(roots) {
  const rules = [];
  if (roots.some((r) => r.im === 0 && r.mult === 1)) rules.push("raíz real simple r → e^{rx}");
  if (roots.some((r) => r.im === 0 && r.mult > 1)) rules.push("raíz repetida r → e^{rx}, xe^{rx}, …");
  if (roots.some((r) => r.im !== 0)) rules.push("par complejo α ± βi → e^{αx}cos βx, e^{αx}sin βx");
  return `Cada raíz aporta soluciones linealmente independientes (${rules.join("; ")}):`;
}

export function solveConstantHomogeneous(lin) {
  const h = homogeneousPart(lin);
  return {
    methodTitle: "Homogénea con Coeficientes Constantes",
    block: "Bloque B • Orden Superior",
    generalSolutionLatex: `y = ${h.yc.tex}`,
    validity: `\\text{${rootsKind(h.roots)}}`,
    steps: h.steps,
    parts: [{ label: "Raíces", latex: rootsTeX(h.roots, "r") }],
    check: { kind: "explicit", y: h.yc.expr },
  };
}

// ---------------------------------------------------------------------------
// Coeficientes indeterminados
// ---------------------------------------------------------------------------

/**
 * Analiza g(x) como suma de términos  p(x)·e^{ax}·{cos bx | sin bx}.
 * Devuelve grupos {a, b, deg} o null si g no tiene esa forma.
 */
export function analyzeForcing(g) {
  const groups = new Map();
  const terms = CAS.terms(CAS.expand(g));
  for (const t of terms) {
    if (/log|tan|sec|csc|cot|sqrt|abs|asin|acos|atan|sinh|cosh/.test(t)) return null;
    let a = 0;
    let b = 0;
    let trigCount = 0;
    const polyFactors = [];
    for (const fac of CAS.factors(t)) {
      const expM = fac.match(/^e\^\(?(.+?)\)?$/);
      const trigM = fac.match(/^(sin|cos)\((.+)\)$/);
      if (expM) {
        const arg = expM[1];
        const slope = CAS.diff(arg, "x");
        if (CAS.dependsOn(slope, "x", ["x"])) return null;
        a += CAS.toNumber(slope);
        polyFactors.push(`e^(${CAS.sub(arg, { x: 0 })})`); // constante e^{c}
      } else if (trigM) {
        trigCount++;
        const slope = CAS.diff(trigM[2], "x");
        if (CAS.dependsOn(slope, "x", ["x"]) || !CAS.isZero(CAS.sub(trigM[2], { x: 0 }), ["x"])) return null;
        b = Math.abs(CAS.toNumber(slope));
      } else if (/sin|cos|e\^/.test(fac)) {
        return null; // potencias de trig, e^{x²}, etc.
      } else {
        polyFactors.push(fac);
      }
    }
    if (trigCount > 1) return null;
    // La parte restante debe ser un polinomio en x
    const poly = polyFactors.join("*") || "1";
    let d = poly;
    let deg = -1;
    for (let k = 0; k <= 8; k++) {
      if (CAS.isZero(d, ["x"])) {
        deg = k - 1;
        break;
      }
      d = CAS.diff(d, "x");
    }
    if (deg < 0) return null;
    const key = `${a}|${b}`;
    const prev = groups.get(key);
    groups.set(key, { a, b, deg: Math.max(deg, prev ? prev.deg : 0) });
  }
  return [...groups.values()];
}

/** Multiplicidad de α + βi como raíz característica. */
function multiplicity(roots, a, b) {
  const r = roots.find((r) => Math.abs(r.re - a) < 1e-9 && Math.abs(Math.abs(r.im) - b) < 1e-9);
  return r ? r.mult : 0;
}

function annihilatorTeX(groups) {
  return groups
    .map(({ a, b, deg }) => {
      const pow = deg + 1 > 1 ? `^{${deg + 1}}` : "";
      if (b === 0) {
        if (a === 0) return `D${pow}`;
        return `(D ${a > 0 ? "-" : "+"} ${numToTeX(Math.abs(a))})${pow}`;
      }
      const lin = -2 * a;
      const c0 = a * a + b * b;
      const mid = lin === 0 ? "" : ` ${lin > 0 ? "+" : "-"} ${numToTeX(Math.abs(lin))}D`;
      return `(D^{2}${mid} + ${numToTeX(c0)})${pow}`;
    })
    .join("");
}

/** Resuelve un sistema lineal (mínimos cuadrados) por eliminación gaussiana. */
function leastSquares(A, y) {
  const n = A[0].length;
  const M = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) =>
      A.reduce((s, row, k) => s + row[i] * (j < n ? row[j] : y[k]), 0)
    )
  );
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) throw new Error("Sistema singular al calcular los coeficientes indeterminados.");
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const fct = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= fct * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

export function undeterminedCoefficients(lin, h) {
  const groups = analyzeForcing(lin.g);
  if (!groups) {
    throw new Error(
      `g(x) = ${lin.g} no es una combinación de polinomios, exponenciales e^{ax} y senos/cosenos: el método de coeficientes indeterminados no aplica. Usa Variación de Parámetros.`
    );
  }
  // Construir la propuesta y_p con la regla de multiplicidad (x^s)
  const trial = []; // {expr, tex}
  const notes = [];
  for (const { a, b, deg } of groups) {
    const s = multiplicity(h.roots, a, b);
    if (s > 0) notes.push(`${b === 0 ? `e^{${coefX(numToTeX(a))}}` : `e^{${coefX(numToTeX(a))}}\\cos ${coefX(numToTeX(b))}`} ya aparece en y_c → se multiplica por x^{${s}}`);
    const expE = a === 0 ? "" : `*e^((${numToExpr(a)})*x)`;
    const expT = a === 0 ? "" : `e^{${coefX(numToTeX(a))}}`;
    for (let j = 0; j <= deg; j++) {
      const p = j + s;
      const xe = p === 0 ? "1" : `x^${p}`;
      if (b === 0) trial.push({ expr: `${xe}${expE}`, tex: `${xPow(p)}${expT}` || "1" });
      else {
        const bx = coefX(numToTeX(b));
        trial.push({ expr: `${xe}${expE}*cos((${numToExpr(b)})*x)`, tex: `${xPow(p)}${expT}\\cos(${bx})` });
        trial.push({ expr: `${xe}${expE}*sin((${numToExpr(b)})*x)`, tex: `${xPow(p)}${expT}\\sin(${bx})` });
      }
    }
  }
  if (trial.length > LETTERS.length) throw new Error("La propuesta de y_p tiene demasiados coeficientes.");

  // L(φ_j) para cada función de la propuesta y resolución numérica-exacta del sistema
  const Lphi = trial.map((t) => applyL(lin.coeffs, t.expr));
  const xs = Array.from({ length: trial.length + 6 }, (_, i) => -1.1 + (2.3 * i) / (trial.length + 5) + 0.013);
  const A = xs.map((x) => Lphi.map((L) => CAS.evalAt(L, { x })));
  const yv = xs.map((x) => CAS.evalAt(lin.g, { x }));
  const raw = leastSquares(A, yv);
  let coefs = raw.map((v) => {
    const r = rationalize(v, 5000, 1e-7);
    return r ? r.p / r.q : v;
  });
  const ypExprOf = (cs) => cs.map((c, j) => `(${numToExpr(c)})*(${trial[j].expr})`).join("+");
  let ypExpr = ypExprOf(coefs);
  if (!CAS.equal(applyL(lin.coeffs, ypExpr), lin.g, ["x"], { tol: 1e-6 })) {
    coefs = raw;
    ypExpr = ypExprOf(coefs);
  }
  const yp = CAS.simplify(ypExpr);

  const letters = trial.map((_, j) => LETTERS[j]);
  const trialTeX = trial.map((t, j) => `${letters[j]}${t.tex === "1" ? "" : t.tex}`).join(" + ");
  const trialExpr = trial.map((t, j) => `${letters[j]}*(${t.expr})`).join("+");
  const LyTeX = (() => {
    const s = CAS.expand(applyL(lin.coeffs, trialExpr));
    return s.length < 260 ? CAS.tex(s) : "L(y_p)";
  })();

  const steps = [
    step(
      "Paso 4: Aniquilador de g(x)",
      "Aniquilador",
      "Buscamos el operador diferencial que anula a g(x); su forma determina la propuesta de y_p:",
      `${annihilatorTeX(groups)}\\left[${CAS.tex(lin.g)}\\right] = 0`,
      "D = d/dx"
    ),
    step(
      "Paso 5: Proponer la forma de y_p",
      "Coef. indeterminados",
      notes.length
        ? `Se descartan los términos repetidos con y_c: ${notes.join("; ")}.`
        : "Ningún término de la propuesta aparece en y_c, así que no se multiplica por x:",
      `y_p = ${trialTeX}`,
      notes.length ? "Regla de multiplicación por x^s" : ""
    ),
    step(
      "Paso 6: Sustituir y_p en la ecuación e igualar coeficientes",
      "Sistema de ecuaciones",
      "Calculamos y_p', y_p''… sustituimos en el lado izquierdo y lo igualamos a g(x):",
      `${LyTeX} = ${CAS.tex(lin.g)} \\;\\Longrightarrow\\; ${letters.map((l, j) => `${l} = ${numToTeX(coefs[j])}`).join(",\\; ")}`,
      "Igualando coeficientes de términos semejantes"
    ),
    step(
      "Paso 7: Solución particular y_p",
      "Solución particular",
      "Sustituimos los coeficientes encontrados:",
      `y_p = ${CAS.tex(yp)}`
    ),
  ];
  return { yp, steps };
}

export function solveConstantNonHomogeneous(lin, variant = "uc") {
  const h = homogeneousPart(lin);
  let yp;
  let extra;
  if (variant === "uc") {
    ({ yp, steps: extra } = undeterminedCoefficients(lin, h));
  } else {
    ({ yp, steps: extra } = variationSteps(lin, h));
  }
  const ypTeX = CAS.tex(yp);
  const steps = [
    ...h.steps.map((s) => ({ ...s, title: s.title.replace("Paso 3: Solución complementaria", "Paso 3: Solución complementaria (homogénea asociada)") })),
    ...extra,
    step(
      `Paso ${4 + extra.length}: Solución general y = y_c + y_p`,
      "Resultado",
      "Sumamos la solución complementaria y la particular:",
      `y = ${h.yc.tex} + ${paren(ypTeX)}`
    ),
  ];
  return {
    methodTitle:
      variant === "uc"
        ? "No Homogénea • Coeficientes Indeterminados"
        : "No Homogénea • Variación de Parámetros",
    block: "Bloque B • Orden Superior",
    generalSolutionLatex: `y = ${h.yc.tex} ${ypTeX.startsWith("-") ? "" : "+ "}${ypTeX}`,
    validity: "y = y_c + y_p",
    steps,
    parts: [
      { label: "y_c", latex: h.yc.tex },
      { label: "y_p", latex: ypTeX },
    ],
    check: { kind: "explicit", y: `${h.yc.expr} + (${yp})` },
  };
}

function variationSteps(lin, h) {
  const n = lin.order;
  const basisExpr = h.basis.map((b) => b.expr);
  const vp = variationOfParameters(basisExpr, lin.coeffs[n], lin.coeffs[n - 1], lin.g, 0);
  const yNames = h.basis.map((b, i) => `y_{${i + 1}} = ${b.tex}`).join(",\\; ");
  const steps = [
    step(
      "Paso 4: Soluciones fundamentales y Wronskiano",
      "Wronskiano",
      "Tomamos la base de y_c y calculamos su Wronskiano W:",
      `${yNames} \\qquad W = ${CAS.tex(vp.W)}`,
      `f(x) = g(x)/a_${n} = ${vp.f}`
    ),
    step(
      "Paso 5: Calcular u_k' por la regla de Cramer",
      "Variación de parámetros",
      n === 2 ? "Usamos u₁' = −y₂ f(x)/W  y  u₂' = y₁ f(x)/W:" : "Cada u_k' = W_k·f(x)/W:",
      vp.uPrimes.map((u, i) => `u_{${i + 1}}' = ${CAS.tex(u)}`).join(",\\quad ")
    ),
    step(
      "Paso 6: Integrar para obtener u_k",
      "Integración",
      "Integramos cada u_k' (sin constantes; ya están en y_c):",
      vp.us.map((u, i) => `u_{${i + 1}} = ${CAS.tex(u)}`).join(",\\quad ")
    ),
    step(
      "Paso 7: Formar y_p = Σ u_k y_k",
      "Solución particular",
      "Multiplicamos cada u_k por su y_k y sumamos:",
      `y_p = ${CAS.tex(vp.yp)}`
    ),
  ];
  return { yp: vp.yp, steps };
}
