import { solveSeparable } from "./separable.js";
import { solveHomogeneous } from "./homogeneous.js";
import { solveExact } from "./exact.js";
import { solveReducibleExact } from "./reducibleExact.js";
import { solveLinear } from "./linear.js";
import { solveBernoulli } from "./bernoulli.js";
import { solveConstantHomogeneous, solveConstantNonHomogeneous } from "./constantCoeff.js";
import { solveCauchyEuler } from "./cauchyEuler.js";

/**
 * Despacha al solver de cada método. Cada solver programa explícitamente
 * los pasos del método (no se usa ninguna función que resuelva la EDO completa).
 */
export function executeSolver(methodKey, context) {
  const { fo, lin, cauchy, parsed } = context;
  switch (methodKey) {
    case "separable":
      return solveSeparable(fo, parsed);
    case "homogenea1":
      return solveHomogeneous(fo);
    case "exacta":
      return solveExact(fo);
    case "reducible_exacta":
      return solveReducibleExact(fo);
    case "lineal1":
      return solveLinear(fo);
    case "bernoulli":
      return solveBernoulli(fo);
    case "orden_sup_hom":
      return solveConstantHomogeneous(lin);
    case "orden_sup_no_hom":
      return solveConstantNonHomogeneous(lin, "uc");
    case "variacion_parametros":
      return solveConstantNonHomogeneous(lin, "vp");
    case "cauchy_euler":
      return solveCauchyEuler(lin, cauchy);
    default:
      throw new Error("Método no reconocido.");
  }
}
