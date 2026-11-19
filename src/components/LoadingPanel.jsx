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

const SYMBOLS = ["∫", "∂", "dy/dx", "λ", "eˣ", "Σ", "y″", "μ"];

/**
 * Panel de carga: anillos giratorios con símbolos matemáticos que cambian,
 * mensajes rotativos, barra indeterminada y tiempo transcurrido.
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
    <div role="status" aria-live="polite" className="glass rounded-3xl p-10 flex flex-col items-center gap-6 overflow-hidden df-fade-in">
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary-soft overflow-hidden rounded-t-3xl">
        <div className="h-full w-1/3 bg-gradient-to-r from-primary via-primary-2 to-primary df-indeterminate" />
      </div>

      <div className="relative w-28 h-28">
        <div className="absolute inset-0 rounded-full border-4 border-primary-soft" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary-2 animate-spin" />
        <div className="absolute inset-4 rounded-full border-2 border-transparent border-b-primary-2 border-l-primary df-spin-reverse" />
        <div className="absolute inset-7 rounded-full well flex items-center justify-center">
          <span key={symIdx} className="font-serif italic text-2xl text-primary df-pop">
            {SYMBOLS[symIdx]}
          </span>
        </div>
      </div>

      <div className="text-center min-h-[3.5rem]">
        <p key={msgIdx} className="font-serif italic text-3xl df-fade-in">
          {MESSAGES[msgIdx]}
        </p>
        <p className="text-xs text-muted mt-2 flex items-center justify-center gap-2">
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
          </span>
          <span className="font-mono">{elapsed.toFixed(1)} s</span>
        </p>
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-soft border border-line text-muted hover:text-error hover:border-error transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
      )}
    </div>
  );
}
