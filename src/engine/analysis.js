import { CAS } from "./casHelper.js";

/**
 * analysis.js — Extrae la estructura de la ecuación ya parseada.
 *
 * Primer orden:  M(x,y) dx + N(x,y) dy = 0   y   dy/dx = f(x,y) = −M/N
 * Orden n lineal: a_n(x) y⁽ⁿ⁾ + … + a_1(x) y' + a_0(x) y = g(x)
 */

const D_SYMBOLS = ["y", "Dy", "Dyy", "Dyyy"]; // índice = orden de la derivada

/** Obtiene M, N y f(x,y) de una EDO de primer orden. */
export function firstOrderData(parsed) {
  if (parsed.order !== 1) return null;
  let M, N;
  if (parsed.form === "differential") {
    ({ M, N } = parsed);
  } else {
    // F(x, y, y') = 0 debe ser lineal en y' :  N·y' + M = 0
    N = CAS.simplify(CAS.diff(parsed.F, "Dy"));
    M = CAS.simplify(CAS.sub(parsed.F, { Dy: 0 }));
    const linearInDy = CAS.equal(parsed.F, `(${N})*Dy + (${M})`, ["x", "y", "Dy"]);
    if (!linearInDy) {
      throw new Error(
        "La ecuación no es de grado 1 en y' (aparece y' elevada a una potencia o dentro de una función). Despeja y' antes de resolver."
      );
    }
    if (CAS.isZero(N)) throw new Error("El coeficiente de y' es 0: la ecuación no es diferencial.");
  }
  const f = CAS.simplify(`-(${M})/(${N})`);
  return { M, N, f };
}

/**
 * Para orden ≥ 2: verifica que la EDO sea lineal y obtiene los coeficientes
 * a_k(x) (k = 0…n) y el término independiente g(x), de modo que
 *   Σ a_k(x)·y⁽ᵏ⁾ = g(x).
 */
export function linearData(parsed) {
  const { F, order } = parsed;
  const syms = D_SYMBOLS.slice(0, order + 1);
  const vars = ["x", ...syms];
  const coeffs = syms.map((s) => CAS.simplify(CAS.diff(F, s)));
  const zeroMap = Object.fromEntries(syms.map((s) => [s, 0]));
  const g = CAS.simplify(`-(${CAS.sub(F, zeroMap)})`);

  // Linealidad: F ≡ Σ a_k y⁽ᵏ⁾ − g  y los a_k sólo dependen de x
  const rebuilt = coeffs.map((a, k) => `(${a})*${syms[k]}`).join(" + ") + ` - (${g})`;
  const isLinear =
    CAS.equal(F, rebuilt, vars) && coeffs.every((a) => syms.every((s) => !CAS.dependsOn(a, s, vars)));

  if (!isLinear) {
    return { isLinear: false, order, coeffs, g };
  }
  // Ya sabemos que dependen sólo de x → expresiones limpias
  const clean = coeffs.map((a) => CAS.simplify(a));
  return {
    isLinear: true,
    order,
    coeffs: clean, // [a0, a1, a2, (a3)]
    g,
    isHomogeneous: CAS.isZero(g, ["x"]),
    constant: clean.every((a) => !CAS.dependsOn(a, "x", ["x"])),
  };
}

/** Coeficientes numéricos (para coeficientes constantes). */
export function numericCoeffs(coeffs) {
  return coeffs.map((a) => CAS.toNumber(a));
}

/**
 * Cauchy-Euler: a_k(x) = c_k · x^k con c_k constantes.
 * Devuelve [c0, c1, …] o null si no tiene esa estructura.
 */
export function cauchyEulerCoeffs(coeffs) {
  const cs = [];
  for (let k = 0; k < coeffs.length; k++) {
    const ratio = `(${coeffs[k]})/x^${k}`;
    if (CAS.dependsOn(ratio, "x", ["x"])) return null;
    const c = CAS.toNumber(CAS.simplify(ratio));
    if (!Number.isFinite(c)) return null;
    cs.push(c);
  }
  if (Math.abs(cs[cs.length - 1]) < 1e-12) return null;
  // Debe aparecer realmente x (si todos los coeficientes de derivadas son constantes no es Cauchy-Euler)
  const hasX = coeffs.some((a, k) => k > 0 && !CAS.isZero(a, ["x"]) && CAS.dependsOn(a, "x", ["x"]));
  return hasX ? cs : null;
}
