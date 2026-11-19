import { solveODE, analyzeODE } from "./index.js";

/**
 * Web Worker del motor matemático.
 * Los cálculos simbólicos se ejecutan aquí, fuera del hilo de la interfaz,
 * para que la página nunca se congele mientras se resuelve una ecuación.
 *
 * Mensajes: { id, type: 'solve' | 'analyze', payload }
 * Respuesta: { id, ok: true, result } | { id, ok: false, error, kind }
 */
self.onmessage = (event) => {
  const { id, type, payload } = event.data;
  try {
    const result = type === "solve" ? solveODE(payload) : analyzeODE(payload.input);
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err?.message || "Error inesperado al procesar la ecuación.",
      kind: err?.kind || "error",
    });
  }
};
