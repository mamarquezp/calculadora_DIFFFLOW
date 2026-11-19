/**
 * solverClient.js — Puente entre la interfaz y el Web Worker del motor.
 *
 * Cada canal ('solve', 'analyze') tiene su propio worker; si una petición
 * excede el tiempo límite o se cancela, el worker se termina y se recrea,
 * así un cálculo muy pesado nunca bloquea la aplicación.
 */

const createWorker = () => new Worker(new URL("../engine/solver.worker.js", import.meta.url), { type: "module" });

function createChannel(type, timeoutMs) {
  let worker = null;
  let seq = 0;
  let pending = null; // solo una petición activa por canal

  const reset = () => {
    worker?.terminate();
    worker = null;
  };

  const ensure = () => {
    if (!worker) {
      worker = createWorker();
      worker.onmessage = (e) => {
        if (!pending || e.data.id !== pending.id) return;
        const { resolve, reject, timer } = pending;
        clearTimeout(timer);
        pending = null;
        if (e.data.ok) resolve(e.data.result);
        else {
          const err = new Error(e.data.error);
          err.kind = e.data.kind;
          reject(err);
        }
      };
      worker.onerror = (e) => {
        if (!pending) return;
        clearTimeout(pending.timer);
        pending.reject(new Error(e.message || "Error interno del motor de cálculo."));
        pending = null;
        reset();
      };
    }
    return worker;
  };

  /** Cancela la petición en curso (si existe). */
  const cancel = (reason = "cancelled") => {
    if (!pending) return;
    clearTimeout(pending.timer);
    const err = new Error(reason === "timeout" ? "timeout" : "Cálculo cancelado.");
    err.kind = reason;
    pending.reject(err);
    pending = null;
    reset();
  };

  const run = (payload) => {
    cancel();
    const id = ++seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const err = new Error(
          "El cálculo tardó demasiado y se detuvo. La ecuación puede requerir integrales que no tienen primitiva elemental; prueba con otro método o simplifica la expresión."
        );
        err.kind = "timeout";
        pending?.reject(err);
        pending = null;
        reset();
      }, timeoutMs);
      pending = { id, resolve, reject, timer };
      ensure().postMessage({ id, type, payload });
    });
  };

  return { run, cancel };
}

export const solverClient = createChannel("solve", 25000);
export const analyzerClient = createChannel("analyze", 8000);
