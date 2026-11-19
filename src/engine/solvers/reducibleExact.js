import { CAS } from "../casHelper.js";
import { step } from "./helpers.js";
import { partials, exactCore } from "./exact.js";

/**
 * Reducible a exacta (factor integrante):
 *   Si (M_y − N_x)/N depende solo de x  →  μ(x) = e^{∫ (M_y − N_x)/N dx}
 *   Si (N_x − M_y)/M depende solo de y  →  μ(y) = e^{∫ (N_x − M_y)/M dy}
 * Luego μM dx + μN dy = 0 es exacta y se resuelve como tal.
 */

export function findIntegratingFactor(M, N) {
  const { My, Nx } = partials(M, N);
  if (CAS.equal(My, Nx)) return { exact: true, My, Nx };
  const Rx = `((${My}) - (${Nx}))/(${N})`;
  if (!CAS.dependsOn(Rx, "y")) {
    return { variable: "x", My, Nx, R: CAS.eliminate(Rx, "y"), RxRaw: Rx };
  }
  const Ry = `((${Nx}) - (${My}))/(${M})`;
  if (!CAS.dependsOn(Ry, "x")) {
    return { variable: "y", My, Nx, R: CAS.eliminate(Ry, "x"), RxRaw: Rx };
  }
  return { variable: null, My, Nx };
}

export function solveReducibleExact(fo) {
  const { M, N } = fo;
  const info = findIntegratingFactor(M, N);
  if (info.exact) throw new Error("La ecuación ya es exacta; no necesita factor integrante.");
  if (!info.variable) {
    throw new Error("No existe un factor integrante que dependa solo de x o solo de y para esta ecuación.");
  }
  const v = info.variable;
  const intR = CAS.integrateStrict(info.R, v);
  const mu = CAS.expOf(intR);
  const newM = CAS.simplify(`(${mu})*(${M})`);
  const newN = CAS.simplify(`(${mu})*(${N})`);
  if (!CAS.equal(CAS.diff(newM, "y"), CAS.diff(newN, "x"))) {
    throw new Error("El factor integrante obtenido no volvió exacta la ecuación.");
  }

  const steps = [
    step(
      "Paso 1: Verificar que NO es exacta",
      "Diagnóstico",
      "Calculamos las derivadas parciales de M y N:",
      `\\frac{\\partial M}{\\partial y} = ${CAS.tex(info.My)} \\;\\neq\\; \\frac{\\partial N}{\\partial x} = ${CAS.tex(info.Nx)}`,
      "No es exacta → buscamos un factor integrante μ"
    ),
  ];
  if (v === "x") {
    steps.push(
      step(
        "Paso 2: Probar un factor que dependa solo de x",
        "Factor μ(x)",
        "Calculamos (M_y − N_x)/N y comprobamos que solo depende de x:",
        `\\frac{M_y - N_x}{N} = ${CAS.tex(info.R)}`,
        "Depende únicamente de x ✓"
      )
    );
  } else {
    steps.push(
      step(
        "Paso 2: Probar factores μ(x) y μ(y)",
        "Factor μ(y)",
        "(M_y − N_x)/N depende de y, así que probamos (N_x − M_y)/M, que solo depende de y:",
        `\\frac{N_x - M_y}{M} = ${CAS.tex(info.R)}`,
        "Depende únicamente de y ✓"
      )
    );
  }
  steps.push(
    step(
      `Paso 3: Calcular el factor integrante μ(${v})`,
      "Factor integrante",
      `Aplicamos μ(${v}) = e^{∫ R d${v}}:`,
      `\\mu(${v}) = e^{\\int ${CAS.tex(info.R)}\\,d${v}} = e^{${CAS.tex(intR)}} = ${CAS.tex(mu)}`
    ),
    step(
      "Paso 4: Multiplicar la ecuación por μ",
      "Nueva ecuación exacta",
      "La ecuación μM dx + μN dy = 0 ahora sí cumple el criterio de exactitud:",
      `\\left(${CAS.tex(newM)}\\right)dx + \\left(${CAS.tex(newN)}\\right)dy = 0`
    )
  );

  const core = exactCore(newM, newN, 5);
  // El paso "identificar M y N" del núcleo exacto ya se mostró en el paso 4
  steps.push(...core.steps.slice(1).map((s, i) => ({ ...s, title: s.title.replace(/Paso \d+/, `Paso ${5 + i}`) })));

  return {
    methodTitle: `Reducible a Exacta (Factor μ(${v}))`,
    block: "Bloque A • Primer Orden",
    generalSolutionLatex: `${CAS.tex(core.potential)} = C`,
    validity: `\\mu(${v}) = ${CAS.tex(mu)}`,
    steps,
    check: { kind: "implicit", G: core.potential },
  };
}
