import { CAS } from "./casHelper";

/**
 * Clasificador heurístico-simbólico para determinar automáticamente el método óptimo
 * entre los 9 métodos del curso (Bloque A y Bloque B).
 */
export function classifyODE(parsed) {
  // ================= BLOQUE B: ORDEN SUPERIOR (Orden >= 2) =================
  if (parsed.order >= 2) {
    const expr = parsed.exprZero;
    // Extraer coeficientes de D3Y, D2Y, D1Y
    const a3 = parsed.order === 3 ? CAS.simplify(CAS.diff(expr, "D3Y")) : "0";
    const a2 = CAS.simplify(CAS.diff(expr, "D2Y"));
    const a1 = CAS.simplify(CAS.diff(expr, "D1Y"));

    // Término independiente de derivadas: sustituir D3Y=0, D2Y=0, D1Y=0
    const rem = CAS.simplify(
      CAS.evaluateAt(expr, { D3Y: 0, D2Y: 0, D1Y: 0 })
    );
    const a0 = CAS.simplify(CAS.diff(rem, "y"));
    const minusGx = CAS.simplify(CAS.evaluateAt(rem, { y: 0 }));
    const gx = CAS.simplify(`-(${minusGx})`);

    const isHomogeneous = CAS.isZero(gx);

    // 1. Verificar estructura Cauchy-Euler (orden 2): a*x^2*y'' + b*x*y' + c*y = f(x)
    if (parsed.order === 2) {
      const checkA2 = CAS.simplify(`(${a2}) / x^2`);
      const checkA1 = CAS.simplify(`(${a1}) / x`);
      if (
        !checkA2.includes("x") &&
        !checkA1.includes("x") &&
        !a0.includes("x") &&
        a2.includes("x")
      ) {
        return {
          method: "cauchy_euler",
          block: "B",
          label: "Ecuación de Cauchy-Euler",
          confidence: "100%",
          reason: `Estructura detectada: (${a2})y'' + (${a1})y' + (${a0})y = ${gx}. Los exponentes de x coinciden con el orden de cada derivada.`,
          meta: { a: checkA2, b: checkA1, c: a0, gx, isHomogeneous },
        };
      }
    }

    // 2. Verificar Coeficientes Constantes
    const constCoeffs =
      !a3.includes("x") &&
      !a2.includes("x") &&
      !a1.includes("x") &&
      !a0.includes("x");

    if (constCoeffs) {
      if (isHomogeneous) {
        return {
          method: "orden_sup_hom",
          block: "B",
          label: "Orden Superior Homogénea (Coeficientes Constantes)",
          confidence: "100%",
          reason: `EDO lineal de orden ${parsed.order} con coeficientes constantes igualada a 0.`,
          meta: { a3, a2, a1, a0, order: parsed.order },
        };
      } else {
        return {
          method: "orden_sup_no_hom",
          block: "B",
          label: "Orden Superior No Homogénea (Coeficientes Constantes)",
          confidence: "100%",
          reason: `EDO lineal de orden ${parsed.order} con término independiente g(x) = ${gx} ≠ 0.`,
          meta: { a3, a2, a1, a0, gx, order: parsed.order },
        };
      }
    }

    throw new Error(
      "Las ecuaciones de orden superior soportadas deben tener coeficientes constantes o estructura de Cauchy-Euler."
    );
  }

  // ================= BLOQUE A: PRIMER ORDEN (Orden === 1) =================
  let M, N;
  if (parsed.form === "differential") {
    M = parsed.M;
    N = parsed.N;
  } else {
    // Convertir D1Y a forma M dx + N dy = 0
    // Coeficiente de D1Y es N, el resto es M
    N = CAS.simplify(CAS.diff(parsed.exprZero, "D1Y"));
    M = CAS.simplify(CAS.evaluateAt(parsed.exprZero, { D1Y: 0 }));
  }

  // 1. Verificar Exacta: ∂M/∂y == ∂N/∂x
  const dMdy = CAS.simplify(CAS.diff(M, "y"));
  const dNdx = CAS.simplify(CAS.diff(N, "x"));

  if (CAS.isZero(`(${dMdy}) - (${dNdx})`)) {
    return {
      method: "exacta",
      block: "A",
      label: "Ecuación Diferencial Exacta",
      confidence: "100%",
      reason: `Se cumple el criterio de exactitud: ∂M/∂y = ${dMdy} = ∂N/∂x.`,
      meta: { M, N, dMdy, dNdx },
    };
  }

  // 2. Verificar Lineal y Bernoulli (en forma dy/dx + P(x)y = Q(x)y^n)
  // dy/dx = -M/N
  try {
    const rhsDydx = CAS.simplify(`-(${M}) / (${N})`);
    // Probar si dy/dx es lineal en y: f(x,y) = -P(x)y + Q(x)
    const dFdy = CAS.simplify(CAS.diff(rhsDydx, "y"));
    if (!dFdy.includes("y")) {
      const Px = CAS.simplify(`-(${dFdy})`);
      const Qx = CAS.simplify(CAS.evaluateAt(rhsDydx, { y: 0 }));
      // Si Q(x) = 0 o P(x) = 0 podría ser separable, pero si ambos dependen de x es Lineal clásica
      if (!CAS.isZero(Px) && !CAS.isZero(Qx)) {
        return {
          method: "lineal1",
          block: "A",
          label: "Lineal de Primer Orden",
          confidence: "100%",
          reason: `Forma estándar y' + P(x)y = Q(x) con P(x) = ${Px} y Q(x) = ${Qx}.`,
          meta: { Px, Qx, M, N },
        };
      }
    }

    // Probar Bernoulli: dy/dx + P(x)y = Q(x)y^n
    // Dividiendo rhsDydx entre y: rhsDydx/y = -P(x) + Q(x)y^(n-1)
    for (const n of [2, 3, 4, -1, -2, 0.5]) {
      // Construir prueba: si aislamos el término con y^n
      const coeffYn = CAS.simplify(
        CAS.diff(CAS.expand(rhsDydx), `y^${n}`)
      );
      if (coeffYn !== "0" && !coeffYn.includes("y")) {
        const rem = CAS.simplify(`(${rhsDydx}) - (${coeffYn})*y^${n}`);
        const Px = CAS.simplify(`-(${rem}) / y`);
        if (!Px.includes("y")) {
          return {
            method: "bernoulli",
            block: "A",
            label: `Ecuación de Bernoulli (n = ${n})`,
            confidence: "100%",
            reason: `Se identificó forma y' + P(x)y = Q(x)y^${n} con P(x) = ${Px}, Q(x) = ${coeffYn} y n = ${n}.`,
            meta: { Px, Qx: coeffYn, n, M, N },
          };
        }
      }
    }
  } catch {
    // Continuar con pruebas diferenciales
  }

  // 3. Verificar Variables Separables: dy/dx = g(x)*h(y)
  try {
    const rhs = CAS.simplify(`-(${M}) / (${N})`);
    // Evaluar en (x,y) * (1,1) == (x,1) * (1,y) (identidad de separabilidad)
    const f_xy = rhs;
    const f_x1 = CAS.evaluateAt(rhs, { y: 1 });
    const f_1y = CAS.evaluateAt(rhs, { x: 1 });
    const f_11 = CAS.evaluateAt(rhs, { x: 1, y: 1 });
    if (
      !CAS.isZero(f_11) &&
      CAS.isZero(`(${f_xy})*(${f_11}) - (${f_x1})*(${f_1y})`)
    ) {
      return {
        method: "separable",
        block: "A",
        label: "Variables Separables",
        confidence: "100%",
        reason: `La ecuación se factoriza como producto de funciones independientes g(x)·h(y).`,
        meta: { M, N, rhs },
      };
    }
  } catch {
    // Continuar
  }

  // 4. Verificar Homogénea de grado n: M(tx, ty) = t^n M(x,y) y N(tx, ty) = t^n N(x,y)
  try {
    const Mtx = CAS.evaluateAt(M, { x: "t*x", y: "t*y" });
    const Ntx = CAS.evaluateAt(N, { x: "t*x", y: "t*y" });
    const ratio = CAS.simplify(`((${Mtx}) / (${M})) - ((${Ntx}) / (${N}))`);
    if (CAS.isZero(ratio)) {
      return {
        method: "homogenea1",
        block: "A",
        label: "Ecuación Diferencial Homogénea",
        confidence: "100%",
        reason: `M(tx, ty) y N(tx, ty) comparten el mismo grado de homogeneidad.`,
        meta: { M, N },
      };
    }
  } catch {
    // Continuar
  }

  // 5. Verificar Reducible a Exacta (Factor Integrante u(x) o u(y))
  const PxExact = CAS.simplify(`((${dMdy}) - (${dNdx})) / (${N})`);
  if (CAS.dependsOnlyOn(PxExact, "x")) {
    return {
      method: "reducible_exacta",
      block: "A",
      label: "Reducible a Exacta (Factor Integrante μ(x))",
      confidence: "100%",
      reason: `No es exacta inicialmente, pero P(x) = (My - Nx)/N = ${PxExact} depende solo de x.`,
      meta: { M, N, dMdy, dNdx, factorVar: "x", factorExpr: PxExact },
    };
  }

  const QyExact = CAS.simplify(`((${dNdx}) - (${dMdy})) / (${M})`);
  if (CAS.dependsOnlyOn(QyExact, "y")) {
    return {
      method: "reducible_exacta",
      block: "A",
      label: "Reducible a Exacta (Factor Integrante μ(y))",
      confidence: "100%",
      reason: `No es exacta inicialmente, pero Q(y) = (Nx - My)/M = ${QyExact} depende solo de y.`,
      meta: { M, N, dMdy, dNdx, factorVar: "y", factorExpr: QyExact },
    };
  }

  throw new Error(
    "No se pudo clasificar la ecuación en los 9 métodos del curso. Revisa la sintaxis o selecciona el método manualmente."
  );
}