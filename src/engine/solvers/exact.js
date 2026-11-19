import { CAS } from "../casHelper.js";
import { step, paren } from "./helpers.js";

/**
 * Ecuación exacta:  M(x,y) dx + N(x,y) dy = 0  con  ∂M/∂y = ∂N/∂x
 *   1. Identificar M y N
 *   2. Verificar el criterio de exactitud
 *   3. f(x,y) = ∫ M dx + g(y)
 *   4. Derivar f respecto a y
 *   5. Igualar a N → g'(y)
 *   6. Integrar g'(y)
 *   7. Solución f(x,y) = C
 */

export function partials(M, N) {
  return { My: CAS.simplify(CAS.diff(M, "y")), Nx: CAS.simplify(CAS.diff(N, "x")) };
}

export function isExact(M, N) {
  const { My, Nx } = partials(M, N);
  return CAS.equal(My, Nx);
}

/** Pasos y solución de una exacta. `labelPrefix` permite numerar dentro de Reducible a Exacta. */
export function exactCore(M, N, startAt = 1) {
  const { My, Nx } = partials(M, N);
  const F1 = CAS.integrateStrict(M, "x");
  const dF1dy = CAS.simplify(CAS.diff(F1, "y"));
  const gpRaw = CAS.simplify(`(${N}) - (${dF1dy})`);
  if (CAS.dependsOn(gpRaw, "x")) {
    throw new Error("g'(y) depende de x: la ecuación no es exacta.");
  }
  const gp = CAS.eliminate(gpRaw, "x");
  const g = CAS.integrateStrict(gp, "y");
  const potential = CAS.simplify(`(${F1}) + (${g})`);
  const n = (k) => startAt + k;

  const steps = [
    step(
      `Paso ${n(0)}: Identificar M(x,y) y N(x,y)`,
      "Forma diferencial",
      "Escribimos la ecuación como M(x,y)dx + N(x,y)dy = 0:",
      `M(x,y) = ${CAS.tex(M)}, \\qquad N(x,y) = ${CAS.tex(N)}`
    ),
    step(
      `Paso ${n(1)}: Criterio de exactitud`,
      "Derivadas parciales",
      "Calculamos las derivadas parciales cruzadas:",
      `\\frac{\\partial M}{\\partial y} = ${CAS.tex(My)} \\qquad \\frac{\\partial N}{\\partial x} = ${CAS.tex(Nx)}`,
      "Como ∂M/∂y = ∂N/∂x, la ecuación es exacta"
    ),
    step(
      `Paso ${n(2)}: Integrar M respecto a x`,
      "Función potencial",
      "Integramos M(x,y) tratando y como constante; la «constante» de integración es una función g(y):",
      `f(x,y) = \\int ${paren(CAS.tex(M))}\\,dx = ${CAS.tex(F1)} + g(y)`
    ),
    step(
      `Paso ${n(3)}: Derivar f respecto a y`,
      "Derivada parcial",
      "Derivamos el resultado anterior respecto a y:",
      `\\frac{\\partial f}{\\partial y} = ${CAS.tex(dF1dy)} + g'(y)`
    ),
    step(
      `Paso ${n(4)}: Igualar a N(x,y) y despejar g'(y)`,
      "Cálculo de g'(y)",
      "Como ∂f/∂y debe ser igual a N(x,y):",
      `${CAS.tex(dF1dy)} + g'(y) = ${CAS.tex(N)} \\;\\Longrightarrow\\; g'(y) = ${CAS.tex(gp)}`
    ),
    step(
      `Paso ${n(5)}: Integrar g'(y)`,
      "Cálculo de g(y)",
      "Integramos respecto a y:",
      `g(y) = \\int ${paren(CAS.tex(gp))}\\,dy = ${CAS.tex(g) || "0"}`
    ),
    step(
      `Paso ${n(6)}: Solución general f(x,y) = C`,
      "Resultado",
      "Sustituimos g(y) en f(x,y) e igualamos a una constante:",
      `${CAS.tex(potential)} = C`,
      "Solución general implícita"
    ),
  ];
  return { My, Nx, potential, steps };
}

export function solveExact(fo) {
  const { M, N } = fo;
  const core = exactCore(M, N);
  return {
    methodTitle: "Ecuación Diferencial Exacta",
    block: "Bloque A • Primer Orden",
    generalSolutionLatex: `${CAS.tex(core.potential)} = C`,
    validity: "\\frac{\\partial M}{\\partial y} = \\frac{\\partial N}{\\partial x}",
    steps: core.steps,
    check: { kind: "implicit", G: core.potential },
  };
}
