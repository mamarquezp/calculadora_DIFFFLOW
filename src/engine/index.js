import { parseODE } from "./parser.js";
import { classify, autoDetect, methodLabel, METHODS } from "./classifier.js";
import { executeSolver } from "./solvers/index.js";
import { verifySolution } from "./verify.js";

/**
 * index.js — Punto de entrada del motor (independiente de la interfaz).
 *
 *   parseODE → classify → executeSolver → verifySolution
 *
 * La interfaz lo llama desde un Web Worker para no congelar la página.
 */

export { METHODS, methodLabel };

/** Analiza la ecuación y devuelve la compatibilidad con cada método. */
export function analyzeODE(input) {
  const parsed = parseODE(input);
  const { results } = classify(parsed);
  return { order: parsed.order, results, auto: autoDetect(results) };
}

/**
 * Resuelve la EDO.
 * @param {{input: string, mode: 'auto'|'manual', method?: string}} req
 */
export function solveODE({ input, mode, method }) {
  const parsed = parseODE(input);
  const { context, results } = classify(parsed);
  const auto = autoDetect(results);

  let chosen;
  if (mode === "manual") {
    if (!method) throw new Error("Selecciona un método en el menú desplegable.");
    const r = results[method];
    if (!r?.ok) {
      const suggestion = auto ? ` Sugerencia: esta ecuación se puede resolver con «${methodLabel(auto)}».` : "";
      const err = new Error(`La ecuación no corresponde al método «${methodLabel(method)}». ${r?.reason || ""}${suggestion}`);
      err.kind = "incompatible";
      throw err;
    }
    chosen = method;
  } else {
    if (!auto) {
      const hint = parsed.order >= 2 ? ` ${results.orden_sup_hom.reason}` : "";
      throw new Error(
        `La ecuación no coincide con ninguno de los métodos del curso.${hint} Revisa la sintaxis (usa '*' para multiplicar, ej: 2*x*y).`
      );
    }
    chosen = auto;
  }

  let solution;
  if (mode === "manual") {
    solution = executeSolver(chosen, context);
  } else {
    // Autoidentificación: si el método prioritario se atasca (p. ej. una integral no
    // elemental), se intenta con el siguiente método compatible.
    const candidates = METHODS.filter((m) => results[m.key]?.ok).map((m) => m.key);
    let lastError;
    for (const key of candidates) {
      try {
        solution = executeSolver(key, context);
        chosen = key;
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!solution) throw lastError;
  }
  const verification = verifySolution(parsed, solution.check, context.fo);
  delete solution.check;

  return {
    method: chosen,
    reason: results[chosen].reason,
    results,
    auto,
    solution,
    verification,
    latexPreview: parsed.latexPreview,
  };
}
