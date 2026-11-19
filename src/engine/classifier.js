import { CAS } from "./casHelper.js";
import { firstOrderData, linearData, cauchyEulerCoeffs } from "./analysis.js";
import { isSeparable } from "./solvers/separable.js";
import { isHomogeneous } from "./solvers/homogeneous.js";
import { partials } from "./solvers/exact.js";
import { findIntegratingFactor } from "./solvers/reducibleExact.js";
import { linearForm } from "./solvers/linear.js";
import { bernoulliForm } from "./solvers/bernoulli.js";
import { analyzeForcing } from "./solvers/constantCoeff.js";

/**
 * classifier.js — Lógica propia de clasificación.
 *
 * Para cada método del curso hay un detector que responde:
 *   { ok: true,  reason }  → la ecuación cumple las condiciones del método
 *   { ok: false, reason }  → explicación de por qué NO aplica (se muestra en modo manual)
 *
 * El orden de METHODS define la prioridad de la Autoidentificación.
 */

export const METHODS = [
  { key: "separable", block: "A", label: "Variables Separables" },
  { key: "exacta", block: "A", label: "Ecuación Exacta" },
  { key: "lineal1", block: "A", label: "Lineal de Primer Orden" },
  { key: "homogenea1", block: "A", label: "Homogénea (y = ux)" },
  { key: "bernoulli", block: "A", label: "Bernoulli (reducible a lineal)" },
  { key: "reducible_exacta", block: "A", label: "Reducible a Exacta (factor integrante)" },
  { key: "cauchy_euler", block: "B", label: "Cauchy-Euler (homogénea y no homogénea)" },
  { key: "orden_sup_hom", block: "B", label: "Homogénea con Coeficientes Constantes" },
  { key: "orden_sup_no_hom", block: "B", label: "No Homogénea • Coeficientes Indeterminados" },
  { key: "variacion_parametros", block: "B", label: "No Homogénea • Variación de Parámetros" },
];

export const methodLabel = (key) => METHODS.find((m) => m.key === key)?.label || key;

const NEED_FIRST = "Este método es solo para ecuaciones de primer orden (y' o forma M dx + N dy = 0).";
const NEED_HIGHER = "Este método es para ecuaciones de orden superior (y'', y''').";

/** Evalúa todos los detectores. Devuelve { context, results: {key: {ok, reason}} }. */
export function classify(parsed) {
  const results = {};
  const context = { parsed };

  if (parsed.order === 1) {
    const fo = firstOrderData(parsed);
    context.fo = fo;
    const { M, N, f } = fo;
    const run = (key, fn) => {
      try {
        results[key] = fn();
      } catch (e) {
        results[key] = { ok: false, reason: e.message };
      }
    };

    run("separable", () =>
      isSeparable(f)
        ? { ok: true, reason: "dy/dx se puede escribir como g(x)·h(y)." }
        : { ok: false, reason: `dy/dx = ${f} no se puede factorizar como g(x)·h(y).` }
    );

    const { My, Nx } = partials(M, N);
    context.partials = { My, Nx };
    const exact = CAS.equal(My, Nx);
    results.exacta = exact
      ? { ok: true, reason: `∂M/∂y = ${My} = ∂N/∂x.` }
      : { ok: false, reason: `No es exacta: ∂M/∂y = ${My}, pero ∂N/∂x = ${Nx}. Prueba «Reducible a Exacta».` };

    run("lineal1", () => {
      const lf = linearForm(f);
      return lf
        ? { ok: true, reason: `Forma y' + P(x)y = Q(x) con P(x) = ${lf.P}, Q(x) = ${lf.Q}.` }
        : { ok: false, reason: "y no aparece de forma lineal (hay potencias de y, productos o funciones de y)." };
    });

    run("homogenea1", () =>
      isHomogeneous(f)
        ? { ok: true, reason: "f(tx, ty) = f(x, y): M y N son homogéneas del mismo grado." }
        : { ok: false, reason: "M y N no son funciones homogéneas del mismo grado (f(tx,ty) ≠ f(x,y))." }
    );

    run("bernoulli", () => {
      const bf = bernoulliForm(f);
      return bf
        ? { ok: true, reason: `Forma y' + P(x)y = Q(x)yⁿ con n = ${bf.n}, P(x) = ${bf.P}, Q(x) = ${bf.Q}.` }
        : { ok: false, reason: "No tiene la forma y' + P(x)y = Q(x)yⁿ con n ≠ 0, 1." };
    });

    run("reducible_exacta", () => {
      if (exact) return { ok: false, reason: "La ecuación ya es exacta; no necesita factor integrante." };
      const info = findIntegratingFactor(M, N);
      if (info.variable === "x") return { ok: true, reason: `(M_y − N_x)/N = ${info.R} depende solo de x → μ(x).` };
      if (info.variable === "y") return { ok: true, reason: `(N_x − M_y)/M = ${info.R} depende solo de y → μ(y).` };
      return { ok: false, reason: "Ni (M_y − N_x)/N depende solo de x, ni (N_x − M_y)/M depende solo de y." };
    });

    for (const m of METHODS.filter((m) => m.block === "B")) results[m.key] = { ok: false, reason: NEED_HIGHER };
    return { context, results };
  }

  // ----------------------------- Bloque B -----------------------------
  for (const m of METHODS.filter((m) => m.block === "A")) results[m.key] = { ok: false, reason: NEED_FIRST };
  const lin = linearData(parsed);
  context.lin = lin;
  if (!lin.isLinear) {
    const msg = "La ecuación no es lineal en y y sus derivadas (hay productos o potencias de y, y', y''…).";
    for (const m of METHODS.filter((m) => m.block === "B")) results[m.key] = { ok: false, reason: msg };
    return { context, results };
  }

  const cs = cauchyEulerCoeffs(lin.coeffs);
  context.cauchy = cs;
  results.cauchy_euler = cs
    ? { ok: true, reason: `Estructura Σ cₖ xᵏ y⁽ᵏ⁾ = g(x) con c = [${cs.join(", ")}].` }
    : { ok: false, reason: "Los coeficientes no tienen la forma a·xⁿ y⁽ⁿ⁾ + … (cada derivada k multiplicada por const·xᵏ)." };

  const constReason = lin.constant ? null : "Los coeficientes dependen de x: no son constantes.";
  const gText = lin.isHomogeneous ? "0" : lin.g;
  results.orden_sup_hom = constReason
    ? { ok: false, reason: constReason }
    : lin.isHomogeneous
      ? { ok: true, reason: `Lineal de orden ${lin.order}, coeficientes constantes y g(x) = 0.` }
      : { ok: false, reason: `No es homogénea: g(x) = ${gText} ≠ 0. Usa coeficientes indeterminados o variación de parámetros.` };

  if (constReason) {
    results.orden_sup_no_hom = { ok: false, reason: constReason };
    results.variacion_parametros = { ok: false, reason: constReason };
  } else if (lin.isHomogeneous) {
    const r = { ok: false, reason: "La ecuación es homogénea (g(x) = 0): no hay solución particular que calcular." };
    results.orden_sup_no_hom = r;
    results.variacion_parametros = r;
  } else {
    const groups = analyzeForcing(lin.g);
    results.orden_sup_no_hom = groups
      ? { ok: true, reason: `g(x) = ${lin.g} es combinación de polinomios, exponenciales y senos/cosenos.` }
      : {
          ok: false,
          reason: `g(x) = ${lin.g} no tiene la forma permitida (polinomio · e^{ax} · sen/cos bx). Usa Variación de Parámetros.`,
        };
    results.variacion_parametros =
      lin.order <= 3
        ? { ok: true, reason: `Lineal no homogénea con g(x) = ${lin.g}; se usa el Wronskiano de y_c.` }
        : { ok: false, reason: "Variación de parámetros implementada para orden 2 y 3." };
  }
  if (lin.order > 3) {
    results.cauchy_euler = { ok: false, reason: "Cauchy-Euler implementado para orden 2 y 3." };
  }
  return { context, results };
}

/** Método elegido por la Autoidentificación (primer método compatible según prioridad). */
export function autoDetect(results) {
  return METHODS.find((m) => results[m.key]?.ok)?.key || null;
}
