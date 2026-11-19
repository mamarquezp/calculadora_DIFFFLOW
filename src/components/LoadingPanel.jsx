import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

/** Mensajes que rotan mientras el motor trabaja. */
const MESSAGES = [
  "Analizando la ecuación…",
  "Identificando el método…",
  "Pensando…",
  "Haciendo los cálculos…",
  "Derivando e integrando…",
  "Buscando el factor integrante…",
  "Resolviendo la ecuación auxiliar…",
  "Ordenando el paso a paso…",
  "Verificando la solución…",
  "Casi listo…",
];

const SYMBOLS = ["∫", "∂", "dy/dx", "λ", "e^x", "Σ", "y''", "μ"];

/**
 * Panel de carga animado: anillo giratorio con símbolos matemáticos que cambian,
 * mensajes rotativos, barra de progreso indeterminada y tiempo transcurrido.
 */
export default function LoadingPanel({ onCancel }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [symIdx, setSymIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t0 = performance.now();
    const msgTimer = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 1300);
    const symTimer = setInterval(() => setSymIdx((i) => (i + 1) % SYMBOLS.length), 450);
    const clock = setInterval(() => setElapsed((performance.now() - t0) / 1000), 100);
    return () => {
      clearInterval(msgTimer);
      clearInterval(symTimer);
      clearInterval(clock);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-xs flex flex-col items-center gap-5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary-fixed overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-primary via-primary-container to-secondary df-indeterminate" />
      </div>

      <div className="relative w-24 h-24 mt-2">
        <div className="absolute inset-0 rounded-full border-4 border-primary-fixed" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary-container animate-spin" />
        <div
          className="absolute inset-3 rounded-full border-2 border-transparent border-b-secondary df-spin-reverse"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span key={symIdx} className="font-math text-xl text-primary font-semibold df-pop">
            {SYMBOLS[symIdx]}
          </span>
        </div>
      </div>

      <div className="text-center min-h-[3.25rem]">
        <p key={msgIdx} className="font-display text-base font-semibold text-on-surface df-fade-in">
          {MESSAGES[msgIdx]}
        </p>
        <p className="text-xs text-on-surface-variant mt-1 flex items-center justify-center gap-1">
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
          </span>
          <span className="ml-2 font-mono">{elapsed.toFixed(1)} s</span>
        </p>
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-error hover:border-error transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
      )}
    </div>
  );
}
