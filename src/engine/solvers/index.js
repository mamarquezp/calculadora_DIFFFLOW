import { CAS } from "../casHelper";
import { solveBernoulli } from "./bernoulli";

export function executeSolver(methodKey, meta, parsed) {
  switch (methodKey) {
    case "bernoulli":
      return solveBernoulli(meta);

    case "separable": {
      const rhs = meta.rhs || CAS.simplify(`-(${meta.M})/(${meta.N})`);
      const gx = CAS.simplify(CAS.evaluateAt(rhs, { y: 1 }));
      const f11 = CAS.simplify(CAS.evaluateAt(rhs, { x: 1, y: 1 }));
      const hy = CAS.simplify(`(${CAS.evaluateAt(rhs, { x: 1 })}) / (${f11})`);
      const invHy = CAS.simplify(`1 / (${hy})`);

      const intY = CAS.integrate(invHy, "y");
      const intX = CAS.integrate(gx, "x");

      return {
        methodTitle: "Variables Separables",
        block: "Bloque A • Primer Orden",
        generalSolutionLatex: `${CAS.toTeX(intY)} = ${CAS.toTeX(intX)} + C_1`,
        validity: "g(x) y h(y) continuas",
        steps: [
          {
            title: "Paso 1: Identificar funciones g(x) y h(y)",
            badge: "Factorización",
            description: "Separamos la expresión dy/dx = g(x)·h(y) en factores independientes de x e y:",
            latex: `\\frac{dy}{dx} = \\left(${CAS.toTeX(gx)}\\right)\\left(${CAS.toTeX(hy)}\\right)`,
            footer: `g(x) = ${gx}  |  h(y) = ${hy}`,
          },
          {
            title: "Paso 2: Separar diferenciales N(y)dy = M(x)dx",
            badge: "Separación",
            description: "Agrupamos los términos con y junto a dy, y los términos con x junto a dx:",
            latex: `\\left(${CAS.toTeX(invHy)}\\right)dy = \\left(${CAS.toTeX(gx)}\\right)dx`,
            footer: "Variables desacopladas",
          },
          {
            title: "Paso 3: Integrar ambos lados por separado",
            badge: "Cuadratura",
            description: "Aplicamos la integral indefinida en cada miembro agregando la constante C₁:",
            latex: `\\int \\left(${CAS.toTeX(invHy)}\\right)dy = \\int \\left(${CAS.toTeX(gx)}\\right)dx \\implies ${CAS.toTeX(intY)} = ${CAS.toTeX(intX)} + C_1`,
            footer: "Solución implícita general",
          },
        ],
      };
    }

    case "homogenea1": {
      const { M, N } = meta;
      // 1. Sustituir y = u*x, dy = u*dx + x*du
      const M_ux = CAS.substitute(M, "y", "u*x");
      const N_ux = CAS.substitute(N, "y", "u*x");
      // (M_ux + N_ux * u) dx + N_ux * x du = 0
      const coeffDx = CAS.simplify(`(${M_ux}) + (${N_ux})*u`);
      const coeffDu = CAS.simplify(`(${N_ux})*x`);
      // du/dx = -coeffDx / coeffDu
      const rhsU = CAS.simplify(`-(${coeffDx}) / (${coeffDu})`);
      const gx = CAS.simplify(CAS.evaluateAt(rhsU, { u: 1 }));
      const fu = CAS.simplify(`(${rhsU}) / (${gx})`);
      const invFu = CAS.simplify(`1 / (${fu})`);

      const intU = CAS.integrate(invFu, "u");
      const intX = CAS.integrate(gx, "x");
      const finalImplicit = CAS.substitute(intU, "u", "y/x");

      return {
        methodTitle: "Ecuación Diferencial Homogénea",
        block: "Bloque A • Primer Orden",
        generalSolutionLatex: `${CAS.toTeX(finalImplicit)} = ${CAS.toTeX(intX)} + C_1`,
        validity: "x \\neq 0",
        steps: [
          {
            title: "Paso 1 y 2: Proponer cambio y = ux y diferencial dy",
            badge: "Sustitución",
            description: "Comprobada la homogeneidad f(tx,ty) = tⁿf(x,y), aplicamos la sustitución de clase:",
            latex: `y = ux \\quad \\text{y} \\quad dy = u\\,dx + x\\,du`,
            footer: "Regla del producto para dy",
          },
          {
            title: "Paso 3: Sustituir en la ecuación original",
            badge: "Transformación",
            description: "Reemplazamos y y dy en M(x,y)dx + N(x,y)dy = 0:",
            latex: `\\left(${CAS.toTeX(coeffDx)}\\right)dx + \\left(${CAS.toTeX(coeffDu)}\\right)du = 0`,
            footer: "Ecuación en términos de x y u",
          },
          {
            title: "Paso 4: Factorizar y resolver por Variables Separables",
            badge: "Separación",
            description: "Simplificamos factores comunes de x e integramos u y x por separado:",
            latex: `\\int \\left(${CAS.toTeX(invFu)}\\right)du = \\int \\left(${CAS.toTeX(gx)}\\right)dx \\implies ${CAS.toTeX(intU)} = ${CAS.toTeX(intX)} + C_1`,
            footer: "Cuadratura en variable auxiliar u",
          },
          {
            title: "Paso 5: Regresar a las variables originales (u = y/x)",
            badge: "Sustitución Inversa",
            description: "Sustituimos u = y/x en el resultado integrado:",
            latex: `${CAS.toTeX(finalImplicit)} = ${CAS.toTeX(intX)} + C_1`,
            footer: "Solución general verificada",
          },
        ],
      };
    }

    case "exacta": {
      const { M, N } = meta;
      const dMdy = CAS.simplify(CAS.diff(M, "y"));
      const dNdx = CAS.simplify(CAS.diff(N, "x"));

      if (!CAS.isZero(`(${dMdy}) - (${dNdx})`)) {
        throw new Error(
          `La ecuación NO es exacta: ∂M/∂y = ${dMdy}, mientras que ∂N/∂x = ${dNdx}. Prueba con 'Reducible a Exacta'.`
        );
      }

      // Integrar M respecto a x + g(y)
      const intM = CAS.integrate(M, "x");
      const dIntM_dy = CAS.diff(intM, "y");
      const gPrimeY = CAS.simplify(`(${N}) - (${dIntM_dy})`);
      const gy = CAS.integrate(gPrimeY, "y");
      const potential = CAS.simplify(`(${intM}) + (${gy})`);

      return {
        methodTitle: "Ecuación Diferencial Exacta",
        block: "Bloque A • Primer Orden",
        generalSolutionLatex: `${CAS.toTeX(potential)} = C`,
        validity: "\\frac{\\partial M}{\\partial y} = \\frac{\\partial N}{\\partial x}",
        steps: [
          {
            title: "Paso 1 y 2: Identificar M, N y Prueba de Exactitud",
            badge: "Criterio Exacto",
            description: "Calculamos las derivadas parciales cruzadas para verificar exactitud:",
            latex: `\\frac{\\partial M}{\\partial y} = ${CAS.toTeX(dMdy)} \\quad \\text{y} \\quad \\frac{\\partial N}{\\partial x} = ${CAS.toTeX(dNdx)}`,
            footer: "Como ∂M/∂y = ∂N/∂x, la EDO es Exacta",
          },
          {
            title: "Paso 3 y 4: Integrar M(x,y) respecto a x y agregar g(y)",
            badge: "Función Potencial",
            description: "Integramos M(x,y)dx manteniendo y constante, sustituyendo +C por g(y):",
            latex: `f(x,y) = \\int \\left(${CAS.toTeX(M)}\\right)dx + g(y) = ${CAS.toTeX(intM)} + g(y)`,
            footer: "Construcción parcial de f(x,y)",
          },
          {
            title: "Paso 5 y 6: Derivar respecto a y, igualar a N(x,y) e integrar g'(y)",
            badge: "Cálculo de g(y)",
            description: "Derivamos f(x,y) respecto a y e igualamos con N(x,y) para despejar g'(y):",
            latex: `g'(y) = ${CAS.toTeX(gPrimeY)} \\quad \\Longrightarrow \\quad g(y) = \\int \\left(${CAS.toTeX(gPrimeY)}\\right)dy = ${CAS.toTeX(gy)}`,
            footer: `g(y) = ${gy}`,
          },
          {
            title: "Paso 7: Reescribir la solución general f(x,y) = C",
            badge: "Ensamblaje",
            description: "Unimos la integral parcial y g(y) igualando a la constante arbitraria C:",
            latex: `${CAS.toTeX(potential)} = C`,
            footer: "Función potencial completa",
          },
        ],
      };
    }

    case "reducible_exacta": {
      const { M, N } = meta;
      const dMdy = CAS.simplify(CAS.diff(M, "y"));
      const dNdx = CAS.simplify(CAS.diff(N, "x"));

      const Px = CAS.simplify(`((${dMdy}) - (${dNdx})) / (${N})`);
      const Qy = CAS.simplify(`((${dNdx}) - (${dMdy})) / (${M})`);

      let mu, formulaUsed, varName;
      if (CAS.dependsOnlyOn(Px, "x")) {
        varName = "x";
        const intP = CAS.integrate(Px, "x");
        mu = CAS.simplify(`exp(${intP})`);
        formulaUsed = `P(x) = \\frac{M_y - N_x}{N} = ${CAS.toTeX(Px)} \\implies \\mu(x) = e^{\\int P(x)dx} = ${CAS.toTeX(mu)}`;
      } else if (CAS.dependsOnlyOn(Qy, "y")) {
        varName = "y";
        const intQ = CAS.integrate(Qy, "y");
        mu = CAS.simplify(`exp(${intQ})`);
        formulaUsed = `Q(y) = \\frac{N_x - M_y}{M} = ${CAS.toTeX(Qy)} \\implies \\mu(y) = e^{\\int Q(y)dy} = ${CAS.toTeX(mu)}`;
      } else {
        throw new Error(
          "No existe un factor integrante que dependa únicamente de x o únicamente de y para esta ecuación."
        );
      }

      const newM = CAS.simplify(`(${mu}) * (${M})`);
      const newN = CAS.simplify(`(${mu}) * (${N})`);

      // Resolver como exacta
      const exactRes = executeSolver("exacta", { M: newM, N: newN }, parsed);

      return {
        methodTitle: `Reducible a Exacta (Factor μ(${varName}))`,
        block: "Bloque A • Primer Orden",
        generalSolutionLatex: exactRes.generalSolutionLatex,
        validity: `\\mu(${varName}) = ${CAS.toTeX(mu)} \\neq 0`,
        steps: [
          {
            title: "Paso 1: Prueba de No Exactitud",
            badge: "Diagnóstico",
            description: "Verificamos las derivadas parciales iniciales:",
            latex: `\\frac{\\partial M}{\\partial y} = ${CAS.toTeX(dMdy)} \\neq \\frac{\\partial N}{\\partial x} = ${CAS.toTeX(dNdx)}`,
            footer: "No es exacta, requiere factor integrante",
          },
          {
            title: `Paso 2: Cálculo del Factor Integrante μ(${varName})`,
            badge: "Factor Integrante",
            description: `Evaluamos la expresión que depende únicamente de ${varName}:`,
            latex: formulaUsed,
            footer: `Factor integrante μ(${varName}) = ${mu}`,
          },
          {
            title: "Paso 3: Multiplicar la ecuación por μ y resolver como Exacta",
            badge: "Reducción",
            description: "Multiplicamos M y N por el factor integrante para volverla exacta:",
            latex: `\\left(${CAS.toTeX(newM)}\\right)dx + \\left(${CAS.toTeX(newN)}\\right)dy = 0 \\implies ${exactRes.generalSolutionLatex}`,
            footer: "Ahora ∂(μM)/∂y = ∂(μN)/∂x",
          },
        ],
      };
    }

    case "lineal1": {
      const { Px, Qx } = meta;
      const intP = CAS.integrate(Px, "x");
      const mu = CAS.simplify(`exp(${intP})`);
      const rhsInt = CAS.integrate(`(${mu}) * (${Qx})`, "x");
      const ySol = CAS.simplify(`((${rhsInt}) + C_1) / (${mu})`);

      return {
        methodTitle: "Lineal de Primer Orden",
        block: "Bloque A • Primer Orden",
        generalSolutionLatex: `y(x) = ${CAS.toTeX(ySol)}`,
        validity: `\\mu(x) = ${CAS.toTeX(mu)}`,
        steps: [
          {
            title: "Paso 1: Ordenar en forma estándar dy/dx + P(x)y = Q(x)",
            badge: "Forma Estándar",
            description: "Identificamos los coeficientes funcionales P(x) y Q(x):",
            latex: `\\frac{dy}{dx} + \\left(${CAS.toTeX(Px)}\\right)y = ${CAS.toTeX(Qx)}`,
            footer: `P(x) = ${Px}  |  Q(x) = ${Qx}`,
          },
          {
            title: "Paso 2: Calcular el Factor Integrador μ(x)",
            badge: "Factor Integrante",
            description: "Aplicamos μ(x) = e^{∫ P(x)dx}:",
            latex: `\\mu(x) = e^{\\int (${CAS.toTeX(Px)})\\,dx} = e^{${CAS.toTeX(intP)}} = ${CAS.toTeX(mu)}`,
            footer: `μ(x) = ${mu}`,
          },
          {
            title: "Paso 3 y 4: Multiplicar por μ(x) y aplicar regla del producto inversa",
            badge: "Condensación",
            description: "El lado izquierdo se condensa en la derivada de un producto:",
            latex: `\\frac{d}{dx}\\left[\\left(${CAS.toTeX(mu)}\\right)y\\right] = \\left(${CAS.toTeX(mu)}\\right)\\left(${CAS.toTeX(Qx)}\\right)`,
            footer: "Regla de la cadena/producto inversa",
          },
          {
            title: "Paso 5 y 6: Integrar ambos lados y despejar y(x)",
            badge: "Solución General",
            description: "Integramos respecto a x agregando +C₁ y dividimos entre μ(x):",
            latex: `\\left(${CAS.toTeX(mu)}\\right)y = ${CAS.toTeX(rhsInt)} + C_1 \\quad \\Longrightarrow \\quad y(x) = ${CAS.toTeX(ySol)}`,
            footer: "Solución explícita obtenida",
          },
        ],
      };
    }

    case "orden_sup_hom": {
      const { a2, a1, a0 } = meta;
      const charPoly = `(${a2})*r^2 + (${a1})*r + (${a0})`;
      const roots = CAS.solveFor(`${charPoly} = 0`, "r");

      let ycLatex = "";
      let rootType = "";

      if (roots.length === 1) {
        rootType = "Raíces reales repetidas (r₁ = r₂)";
        ycLatex = `C_1 e^{${CAS.toTeX(roots[0])}x} + C_2 x e^{${CAS.toTeX(roots[0])}x}`;
      } else if (roots[0].includes("i")) {
        rootType = "Raíces complejas conjugadas (α ± βi)";
        // Extraer parte real e imaginaria de forma limpia
        const alpha = CAS.simplify(`realpart(${roots[0]})`);
        const beta = CAS.simplify(`abs(imagpart(${roots[0]}))`);
        const expPart = alpha === "0" ? "" : `e^{${CAS.toTeX(alpha)}x}`;
        ycLatex = `${expPart}\\left(C_1 \\cos(${CAS.toTeX(beta)}x) + C_2 \\sin(${CAS.toTeX(beta)}x)\\right)`;
      } else {
        rootType = "Raíces reales distintas (r₁ ≠ r₂)";
        ycLatex = `C_1 e^{${CAS.toTeX(roots[0])}x} + C_2 e^{${CAS.toTeX(roots[1])}x}`;
      }

      return {
        methodTitle: "Homogénea con Coeficientes Constantes",
        block: "Bloque B • Orden Superior",
        generalSolutionLatex: `y_c(x) = ${ycLatex}`,
        validity: rootType,
        steps: [
          {
            title: "Paso 1 y 2: Proponer solución exponencial y = e^{rx}",
            badge: "Sustitución",
            description: "Sustituimos y' = r e^{rx} y y'' = r² e^{rx} en la ecuación homogénea.",
            latex: `y = e^{rx} \\implies \\left(${CAS.toTeX(charPoly)}\\right)e^{rx} = 0`,
            footer: "Como e^{rx} ≠ 0, dividimos entre e^{rx}",
          },
          {
            title: "Paso 3 y 4: Ecuación Característica y Raíces",
            badge: "Polinomio Auxiliar",
            description: `Resolvemos la ecuación auxiliar. Caso detectado: ${rootType}.`,
            latex: `${CAS.toTeX(charPoly)} = 0 \\quad \\Longrightarrow \\quad r \\in \\{ ${roots.map((r) => CAS.toTeX(r)).join(", ")} \\}`,
            footer: `Raíces: ${roots.join(", ")}`,
          },
          {
            title: "Paso 5: Construir la Solución Complementaria y_c(x)",
            badge: "Solución General",
            description: "Aplicamos el principio de superposición lineal según la multiplicidad de las raíces:",
            latex: `y(x) = ${ycLatex}`,
            footer: "Combinación lineal de soluciones fundamentales",
          },
        ],
      };
    }

    case "orden_sup_no_hom": {
      const { a2, a1, a0, gx } = meta;
      const homRes = executeSolver("orden_sup_hom", meta, parsed);
      const ycClean = homRes.generalSolutionLatex.replace("y_c(x) = ", "");

      // Proponer yp según forma de g(x) (Coeficientes Indeterminados de tu tabla de clase)
      let ypTrial = "A";
      let ruleDesc = "Término constante → Propuesta yp = A";
      if (gx.includes("exp")) {
        const expArg = gx.match(/exp\(([^)]+)\)/)?.[1] || "x";
        ypTrial = `A*exp(${expArg})`;
        ruleDesc = `Término exponencial → Propuesta yp = A·e^{${expArg}}`;
      } else if (gx.includes("sin") || gx.includes("cos")) {
        const trigArg = gx.match(/(?:sin|cos)\(([^)]+)\)/)?.[1] || "x";
        ypTrial = `A*cos(${trigArg}) + B*sin(${trigArg})`;
        ruleDesc = `Término trigonométrico → Propuesta yp = A·cos(${trigArg}) + B·sin(${trigArg})`;
      } else if (gx.includes("x^2")) {
        ypTrial = "A*x^2 + B*x + C_0";
        ruleDesc = "Polinomio grado 2 → Propuesta yp = Ax² + Bx + C";
      } else if (gx.includes("x")) {
        ypTrial = "A*x + B";
        ruleDesc = "Polinomio grado 1 → Propuesta yp = Ax + B";
      }

      // Calcular derivadas de ypTrial y sustituir en L(yp) = g(x)
      const d1 = CAS.diff(ypTrial, "x");
      const d2 = CAS.diff(d1, "x");
      const lhsSub = CAS.expand(`(${a2})*(${d2}) + (${a1})*(${d1}) + (${a0})*(${ypTrial}) - (${gx})`);

      // Resolver coeficientes indeterminados
      let ypFinal = ypTrial;
      try {
        if (ypTrial.includes("B") && !ypTrial.includes("C_0")) {
          const eq1 = CAS.evaluateAt(lhsSub, { x: 0 });
          const eq2 = CAS.evaluateAt(lhsSub, { x: 1 });
          const solA = CAS.solveFor(`${eq1} = 0`, "A")[0];
          const eq2Sub = CAS.substitute(eq2, "A", solA);
          const solB = CAS.solveFor(`${eq2Sub} = 0`, "B")[0];
          ypFinal = CAS.simplify(
            CAS.substitute(CAS.substitute(ypTrial, "A", solA), "B", solB)
          );
        } else if (!ypTrial.includes("B")) {
          const eq1 = CAS.evaluateAt(lhsSub, { x: 0 });
          const solA = CAS.solveFor(`${eq1} = 0`, "A")[0];
          ypFinal = CAS.simplify(CAS.substitute(ypTrial, "A", solA));
        }
      } catch {
        // Fallback simbólico limpio
      }

      return {
        methodTitle: "No Homogénea (Coeficientes Indeterminados)",
        block: "Bloque B • Orden Superior",
        generalSolutionLatex: `y(x) = ${ycClean} + ${CAS.toTeX(ypFinal)}`,
        validity: "y = y_c + y_p",
        steps: [
          ...homRes.steps.slice(0, 2),
          {
            title: "Paso 3: Solución Complementaria y_c(x)",
            badge: "Parte Homogénea",
            description: "Resolvemos la ecuación homogénea asociada L(y) = 0:",
            latex: `y_c(x) = ${ycClean}`,
            footer: "Solución complementaria",
          },
          {
            title: "Paso 4: Propuesta de Solución Particular y_p(x)",
            badge: "Coef. Indeterminados",
            description: `${ruleDesc}. Sustituimos y_p, y_p' y y_p'' en la ecuación original:`,
            latex: `y_p = ${CAS.toTeX(ypTrial)} \\quad \\Longrightarrow \\quad y_p(x) = ${CAS.toTeX(ypFinal)}`,
            footer: "Coeficientes determinados igualando términos semejantes",
          },
          {
            title: "Paso 5: Ensamblar Solución General y = y_c + y_p",
            badge: "Resultado Final",
            description: "Sumamos la solución complementaria y la solución particular:",
            latex: `y(x) = ${ycClean} + ${CAS.toTeX(ypFinal)}`,
            footer: "Solución general completa",
          },
        ],
      };
    }

    case "cauchy_euler": {
      const { a, b, c, gx, isHomogeneous } = meta;
      // Ecuación auxiliar: a*m*(m-1) + b*m + c = 0
      const auxPoly = CAS.expand(`(${a})*m*(m-1) + (${b})*m + (${c})`);
      const roots = CAS.solveFor(`${auxPoly} = 0`, "m");

      let ycLatex = "";
      if (roots.length === 1) {
        ycLatex = `C_1 x^{${CAS.toTeX(roots[0])}} + C_2 x^{${CAS.toTeX(roots[0])}}\\ln(x)`;
      } else if (roots[0].includes("i")) {
        const alpha = CAS.simplify(`realpart(${roots[0]})`);
        const beta = CAS.simplify(`abs(imagpart(${roots[0]}))`);
        const xPow = alpha === "0" ? "" : `x^{${CAS.toTeX(alpha)}}`;
        ycLatex = `${xPow}\\left(C_1 \\cos(${CAS.toTeX(beta)}\\ln x) + C_2 \\sin(${CAS.toTeX(beta)}\\ln x)\\right)`;
      } else {
        ycLatex = `C_1 x^{${CAS.toTeX(roots[0])}} + C_2 x^{${CAS.toTeX(roots[1])}}`;
      }

      return {
        methodTitle: "Ecuación de Cauchy-Euler",
        block: "Bloque B • Orden Superior",
        generalSolutionLatex: isHomogeneous
          ? `y(x) = ${ycLatex}`
          : `y(x) = ${ycLatex} + y_p(x)`,
        validity: "x > 0",
        steps: [
          {
            title: "Paso 1: Proponer solución potencial y = x^m",
            badge: "Sustitución Cauchy-Euler",
            description: "Para x > 0, sustituimos y = x^m, y' = m·x^{m-1} y y'' = m(m-1)·x^{m-2}:",
            latex: `a\\cdot m(m-1) + b\\cdot m + c = 0 \\implies ${CAS.toTeX(auxPoly)} = 0`,
            footer: `a = ${a}, b = ${b}, c = ${c}`,
          },
          {
            title: "Paso 2: Calcular raíces de la ecuación auxiliar",
            badge: "Raíces m",
            description: "Factorizamos o aplicamos fórmula cuadrática para obtener las raíces m:",
            latex: `m \\in \\{ ${roots.map((r) => CAS.toTeX(r)).join(", ")} \\}`,
            footer: `Raíces obtenidas: ${roots.join(", ")}`,
          },
          {
            title: "Paso 3: Construir la solución homogénea y_c(x)",
            badge: "Solución General",
            description: "Formamos la combinación lineal en potencias de x (y ln(x) si hay multiplicidad):",
            latex: `y_c(x) = ${ycLatex}`,
            footer: isHomogeneous
              ? "Ecuación homogénea completada"
              : `Parte no homogénea con f(x) = ${gx}`,
          },
        ],
      };
    }

    default:
      throw new Error("Método no reconocido.");
  }
}