import nerdamer from "nerdamer";

/**
 * Helper simbólico atómico.
 * PROHIBIDO usar funciones de resolución directa de EDOs.
 * Solo ejecuta operaciones primitivas: derivar, integrar, simplificar, despejar y raíces.
 */
export const CAS = {
  simplify(expr) {
    try {
      return nerdamer(`simplify(${expr})`).toString();
    } catch {
      return nerdamer(expr).toString();
    }
  },

  expand(expr) {
    try {
      return nerdamer(`expand(${expr})`).toString();
    } catch {
      return expr;
    }
  },

  diff(expr, variable = "x") {
    return nerdamer(`diff(${expr}, ${variable})`).toString();
  },

  integrate(expr, variable = "x") {
    return nerdamer(`integrate(${expr}, ${variable})`).toString();
  },

  solveFor(equation, variable) {
    // equation puede ser "expr = 0" o "lhs - rhs"
    const clean = equation.includes("=")
      ? `${equation.split("=")[0]} - (${equation.split("=")[1]})`
      : equation;
    const res = nerdamer.solve(clean, variable);
    return res.symbol.elements.map((el) => el.toString());
  },

  substitute(expr, target, replacement) {
    return nerdamer(expr).sub(target, `(${replacement})`).toString();
  },

  evaluateAt(expr, varsObj) {
    let e = nerdamer(expr);
    for (const [k, v] of Object.entries(varsObj)) {
      e = e.sub(k, `(${v})`);
    }
    return e.toString();
  },

  toTeX(expr) {
    try {
      if (!expr) return "";
      // Si tiene signo igual, formatear ambos lados
      if (typeof expr === "string" && expr.includes("=")) {
        const parts = expr.split("=");
        return parts.map((p) => nerdamer(p.trim()).toTeX()).join(" = ");
      }
      return nerdamer(String(expr)).toTeX();
    } catch {
      return String(expr);
    }
  },

  isZero(expr) {
    try {
      const s = nerdamer(`simplify(${expr})`).toString();
      return s === "0";
    } catch {
      return false;
    }
  },

  dependsOnlyOn(expr, allowedVar) {
    try {
      const s = nerdamer(`simplify(${expr})`).toString();
      const forbiddenVar = allowedVar === "x" ? "y" : "x";
      // Verificar si la derivada respecto a la variable prohibida es 0
      const d = nerdamer(`diff(${s}, ${forbiddenVar})`).toString();
      return d === "0";
    } catch {
      return false;
    }
  },
};