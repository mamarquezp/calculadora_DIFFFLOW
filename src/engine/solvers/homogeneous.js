import { CAS } from "../casHelper.js";
import { step, paren } from "./helpers.js";

/**
 * Ecuación homogénea:  dy/dx = f(x,y) con f(tx,ty) = f(x,y)
 *   1. Verificar homogeneidad (mismo grado en M y N)
 *   2. Sustituir y = ux,  dy/dx = u + x du/dx
 *   3. Separar:  du / (F(u) − u) = dx / x
 *   4. Integrar y regresar u = y/x
 * Si la integral en u no es elemental se usa la sustitución alternativa x = vy.
 */

export function isHomogeneous(f) {
  return CAS.equal(CAS.sub(f, { x: "t*x", y: "t*y" }), f, ["x", "y", "t"]);
}

/** Grado de homogeneidad de una función (o null si no es homogénea). */
export function homogeneityDegree(expr) {
  const t = 1.7;
  const vals = [];
  for (const [x, y] of [[0.8, 1.3], [1.4, 0.9], [2.1, 1.6]]) {
    const a = CAS.evalAt(expr, { x: t * x, y: t * y });
    const b = CAS.evalAt(expr, { x, y });
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(b) < 1e-12 || a / b <= 0) return null;
    vals.push(Math.log(a / b) / Math.log(t));
  }
  if (Math.max(...vals) - Math.min(...vals) > 1e-6) return null;
  const n = Math.round(vals[0] * 1000) / 1000;
  return Number.isInteger(n) ? n : Number(n.toFixed(3));
}

export function solveHomogeneous(fo) {
  const { M, N, f } = fo;
  const degM = homogeneityDegree(M);
  const degN = homogeneityDegree(N);
  const steps = [];

  steps.push(
    step(
      "Paso 1: Verificar que la ecuación es homogénea",
      "Prueba f(tx, ty)",
      degM !== null && degN !== null
        ? `M(x,y) y N(x,y) son funciones homogéneas del mismo grado n = ${degM}, por lo que dy/dx = f(x,y) cumple f(tx,ty) = f(x,y).`
        : "Reemplazamos x → tx, y → ty y comprobamos que f no cambia (grado 0):",
      degM !== null && degN !== null
        ? `M(tx,ty) = t^{${degM}}M(x,y), \\quad N(tx,ty) = t^{${degN}}N(x,y)`
        : `f(tx,ty) = f(x,y) = ${CAS.tex(f)}`,
      "Se puede aplicar la sustitución y = ux"
    )
  );

  // ---- Sustitución y = ux ----
  const Fu = CAS.simplify(CAS.sub(f, { x: "1", y: "u" })); // f(x, ux) = f(1, u)
  const D = CAS.simplify(`(${Fu}) - u`);

  if (CAS.isZero(D, ["u"])) {
    steps.push(
      step(
        "Paso 2: Sustituir y = ux",
        "Sustitución",
        "Con y = ux se obtiene u + x du/dx = u, es decir du/dx = 0:",
        `u = C \\;\\Longrightarrow\\; y = Cx`
      )
    );
    return result("y = Cx", steps, { kind: "explicit", y: "C*x" });
  }

  const integrand = CAS.simplify(`1/(${D})`);
  const Iu = CAS.integrate(integrand, "u");

  if (Iu.ok) {
    const back = CAS.simplify(CAS.sub(Iu.result, { u: "y/x" }));
    steps.push(
      step(
        "Paso 2: Proponer y = ux y derivar",
        "Sustitución",
        "Usamos el cambio de variable de clase y su derivada (regla del producto):",
        `y = ux \\quad\\Longrightarrow\\quad \\frac{dy}{dx} = u + x\\frac{du}{dx}`
      ),
      step(
        "Paso 3: Sustituir en la ecuación",
        "Transformación",
        "Al reemplazar, todas las x se cancelan y el lado derecho queda solo en función de u:",
        `u + x\\frac{du}{dx} = ${CAS.tex(Fu)} \\;\\Longrightarrow\\; x\\frac{du}{dx} = ${CAS.tex(D)}`,
        `F(u) = f(1, u) = ${Fu}`
      ),
      step(
        "Paso 4: Separar variables e integrar",
        "Variables separables",
        "La nueva ecuación en u y x es separable:",
        `\\int ${paren(CAS.tex(integrand))}\\,du = \\int \\frac{dx}{x} \\;\\Longrightarrow\\; ${CAS.tex(Iu.result)} = \\ln x + C`
      ),
      step(
        "Paso 5: Regresar a la variable original (u = y/x)",
        "Sustitución inversa",
        "Reemplazamos u = y/x en el resultado:",
        `${CAS.tex(back)} = \\ln x + C`,
        "Solución general implícita"
      )
    );
    return result(`${CAS.tex(back)} = \\ln x + C`, steps, {
      kind: "implicit",
      G: `(${CAS.sub(Iu.result, { u: "y/x" })}) - log(x)`,
    });
  }

  // ---- Alternativa x = vy ----
  const g = CAS.simplify(`1/(${f})`); // dx/dy
  const Hv = CAS.simplify(CAS.sub(g, { y: "1", x: "v" }));
  const Dv = CAS.simplify(`(${Hv}) - v`);
  const integrandV = CAS.simplify(`1/(${Dv})`);
  const Iv = CAS.integrateStrict(integrandV, "v");
  const backV = CAS.simplify(CAS.sub(Iv, { v: "x/y" }));
  steps.push(
    step(
      "Paso 2: Elegir la sustitución x = vy",
      "Sustitución",
      "Con y = ux la integral en u no es elemental, así que usamos la alternativa x = vy:",
      `x = vy \\quad\\Longrightarrow\\quad \\frac{dx}{dy} = v + y\\frac{dv}{dy}`
    ),
    step(
      "Paso 3: Sustituir en dx/dy = 1/f(x,y)",
      "Transformación",
      "La ecuación queda solo en v y y:",
      `v + y\\frac{dv}{dy} = ${CAS.tex(Hv)} \\;\\Longrightarrow\\; y\\frac{dv}{dy} = ${CAS.tex(Dv)}`
    ),
    step(
      "Paso 4: Separar variables e integrar",
      "Variables separables",
      "Integramos ambos lados:",
      `\\int ${paren(CAS.tex(integrandV))}\\,dv = \\int\\frac{dy}{y} \\;\\Longrightarrow\\; ${CAS.tex(Iv)} = \\ln y + C`
    ),
    step(
      "Paso 5: Regresar a la variable original (v = x/y)",
      "Sustitución inversa",
      "Reemplazamos v = x/y:",
      `${CAS.tex(backV)} = \\ln y + C`
    )
  );
  return result(`${CAS.tex(backV)} = \\ln y + C`, steps, {
    kind: "implicit",
    G: `(${CAS.sub(Iv, { v: "x/y" })}) - log(y)`,
  });
}

function result(generalSolutionLatex, steps, check) {
  return {
    methodTitle: "Ecuación Diferencial Homogénea",
    block: "Bloque A • Primer Orden",
    generalSolutionLatex,
    validity: "x \\neq 0",
    steps,
    check,
  };
}
