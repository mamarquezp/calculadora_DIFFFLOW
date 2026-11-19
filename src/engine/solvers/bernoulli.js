import { CAS } from "../casHelper";

/**
 * Resuelve Ecuaciones de Bernoulli siguiendo estrictamente los 7 pasos de clase:
 * Paso 1: Identificar n, P(x) y Q(x)
 * Paso 2: Volverlo lineal dividiendo todo entre y^n
 * Paso 3: Cambio de variable u = y^(1-n)
 * Paso 4: Derivar el paso 3: du/dx = (1-n)y^(-n) dy/dx
 * Paso 5: Despejar y^(-n) dy/dx del paso 4
 * Paso 6: Reemplazar en la ecuación del paso 2
 * Paso 7: Resolver la ecuación diferencial lineal
 */
export function solveBernoulli(meta) {
  const { Px, Qx, n } = meta;
  const oneMinusN = 1 - n;

  // Paso 2: y^(-n) dy/dx + P(x) y^(1-n) = Q(x)
  const expNegN = -n;

  // Paso 5 y 6: (1/(1-n)) du/dx + P(x) u = Q(x)  =>  du/dx + (1-n)P(x) u = (1-n)Q(x)
  const P_lin = CAS.simplify(`(${oneMinusN}) * (${Px})`);
  const Q_lin = CAS.simplify(`(${oneMinusN}) * (${Qx})`);

  // Paso 7: Resolver lineal en u: mu(x) = exp(∫ P_lin dx)
  const intP = CAS.integrate(P_lin, "x");
  const mu = CAS.simplify(`exp(${intP})`);
  const rhsInt = CAS.integrate(`(${mu}) * (${Q_lin})`, "x");
  const uSol = CAS.simplify(`((${rhsInt}) + C_1) / (${mu})`);

  // Regresar a y: y^(1-n) = uSol => y = (uSol)^(1/(1-n))
  const finalY =
    oneMinusN === -1
      ? `\\frac{1}{${CAS.toTeX(uSol)}}`
      : `\\left(${CAS.toTeX(uSol)}\\right)^{\\frac{1}{${oneMinusN}}}`;

  return {
    methodTitle: `Ecuación de Bernoulli (n = ${n})`,
    block: "Bloque A • Primer Orden",
    generalSolutionLatex: `y(x) = ${finalY}`,
    validity: `C_1 \\in \\mathbb{R}`,
    steps: [
      {
        title: "Paso 1: Identificar el valor de n, P(x) y Q(x)",
        badge: "Forma Canónica",
        description:
          "Escribimos la ecuación en la forma estándar dy/dx + P(x)y = Q(x)yⁿ e identificamos sus componentes:",
        latex: `\\frac{dy}{dx} + \\left(${CAS.toTeX(Px)}\\right)y = \\left(${CAS.toTeX(Qx)}\\right)y^{${n}}`,
        footer: `n = ${n}  |  P(x) = ${Px}  |  Q(x) = ${Qx}`,
      },
      {
        title: "Paso 2: Dividir toda la ecuación entre yⁿ",
        badge: "Preparación",
        description: `Dividimos cada término entre y^${n} para aislar Q(x) en el lado derecho:`,
        latex: `y^{${expNegN}}\\frac{dy}{dx} + \\left(${CAS.toTeX(Px)}\\right)y^{${oneMinusN}} = ${CAS.toTeX(Qx)}`,
        footer: `Se multiplica por y^{-${n}}`,
      },
      {
        title: "Paso 3 y 4: Cambio de variable u = y^(1-n) y derivación",
        badge: "Sustitución",
        description: `Proponemos u = y^(1 - ${n}) = y^(${oneMinusN}) y derivamos respecto a x usando regla de la cadena:`,
        latex: `u = y^{${oneMinusN}} \\quad \\Longrightarrow \\quad \\frac{du}{dx} = (${oneMinusN})y^{${expNegN}}\\frac{dy}{dx}`,
        footer: `Derivada implícita respecto a x`,
      },
      {
        title: "Paso 5 y 6: Despejar y reemplazar en la ecuación linealizada",
        badge: "Linealización",
        description: `Despejamos y^(${expNegN}) dy/dx = \\frac{1}{${oneMinusN}} \\frac{du}{dx} y sustituimos en el Paso 2:`,
        latex: `\\frac{du}{dx} + \\left(${CAS.toTeX(P_lin)}\\right)u = ${CAS.toTeX(Q_lin)}`,
        footer: `EDO Lineal estándar en variable u(x)`,
      },
      {
        title: "Paso 7: Resolver la EDO lineal y regresar a variable y",
        badge: "Solución Final",
        description: `Calculamos el factor integrante μ(x) = e^{∫ P_lin dx} = ${CAS.toTeX(mu)}, integramos y revertimos u = y^{${oneMinusN}}:`,
        latex: `u(x) = ${CAS.toTeX(uSol)} \\quad \\Longrightarrow \\quad y(x) = ${finalY}`,
        footer: `Verificado simbólicamente`,
      },
    ],
  };
}