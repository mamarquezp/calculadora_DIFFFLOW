import { CAS } from "../casHelper.js";
import { step, paren, solveLinearCore } from "./helpers.js";

/**
 * Lineal de primer orden:  dy/dx + P(x)·y = Q(x)
 *   1. Forma estándar, identificar P(x) y Q(x)
 *   2. Factor integrante μ(x) = e^{∫P dx}
 *   3. Multiplicar: d/dx[μ y] = μ Q
 *   4. Integrar y despejar y
 */

/** Si f(x,y) = −P(x)y + Q(x) devuelve {P, Q}; si no, null. */
export function linearForm(f) {
  const dfdy = CAS.diff(f, "y");
  if (CAS.dependsOn(dfdy, "y")) return null;
  const P = CAS.eliminate(`-(${dfdy})`, "y");
  const Q = CAS.simplify(`(${CAS.sub(f, { y: "1" })}) + (${P})`);
  if (!CAS.equal(f, `-(${P})*y + (${Q})`)) return null;
  return { P, Q };
}

export function solveLinear(fo) {
  const lf = linearForm(fo.f);
  if (!lf) throw new Error("La ecuación no tiene la forma lineal dy/dx + P(x)y = Q(x).");
  const { P, Q } = lf;
  const core = solveLinearCore(P, Q, "y");

  const steps = [
    step(
      "Paso 1: Escribir en forma estándar",
      "Forma estándar",
      "Dividimos entre el coeficiente de y' y ordenamos como dy/dx + P(x)y = Q(x):",
      core.texStd,
      `P(x) = ${P}   |   Q(x) = ${Q}`
    ),
    step(
      "Paso 2: Calcular el factor integrante μ(x)",
      "Factor integrante",
      "Aplicamos μ(x) = e^{∫P(x)dx} (se omite el valor absoluto, como en clase):",
      `\\mu(x) = e^{\\int ${paren(CAS.tex(P))}dx} = e^{${CAS.tex(core.intP)}} = ${CAS.tex(core.mu)}`
    ),
    step(
      "Paso 3: Multiplicar por μ(x)",
      "Regla del producto",
      "El lado izquierdo se convierte en la derivada del producto μ(x)·y:",
      `\\frac{d}{dx}\\left[${paren(CAS.tex(core.mu))}\\,y\\right] = ${CAS.tex(core.muQ)}`
    ),
    step(
      "Paso 4: Integrar ambos lados y despejar y",
      "Solución general",
      "Integramos respecto a x, agregamos C y dividimos entre μ(x):",
      core.integralOk
        ? `${paren(CAS.tex(core.mu))}\\,y = ${CAS.tex(core.integral)} + C \\;\\Longrightarrow\\; y = ${core.solTeX}`
        : `y = ${core.solTeX}`,
      core.integralOk ? "Solución explícita" : "La integral no tiene primitiva elemental; se deja indicada"
    ),
  ];

  return {
    methodTitle: "Lineal de Primer Orden",
    block: "Bloque A • Primer Orden",
    generalSolutionLatex: `y = ${core.solTeX}`,
    validity: `\\mu(x) = ${CAS.tex(core.mu)}`,
    steps,
    check: core.solExpr ? { kind: "explicit", y: core.solExpr } : null,
  };
}
