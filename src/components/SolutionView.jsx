import React, { useState } from "react";
import { Copy, Check, ShieldCheck, AlertTriangle } from "lucide-react";
import MathBlock from "./MathBlock";

/**
 * Muestra la solución general (LaTeX), y_c / y_p por separado, la verificación
 * y la trazabilidad paso a paso.
 */
export default function SolutionView({ data, execTime }) {
  const { solution, verification, reason } = data;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(solution.generalSolutionLatex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* portapapeles no disponible */
    }
  };

  return (
    <>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-xs relative overflow-hidden df-fade-in">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-fixed-dim to-secondary" />
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-surface-container text-primary font-semibold border border-primary-fixed-dim">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {solution.block} • {solution.methodTitle}
          </span>
          <div className="flex items-center gap-3 text-xs font-mono text-on-surface-variant">
            <span>
              Tiempo: <strong className="text-secondary">{execTime} ms</strong>
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-container text-on-surface cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado" : "Copiar LaTeX"}
            </button>
          </div>
        </div>

        <div className="text-center py-2">
          <span className="text-xs font-display font-semibold text-on-surface-variant uppercase tracking-wider block mb-3">
            Solución General
          </span>
          <div className="inline-block py-3 px-6 rounded-xl bg-surface-container-low/70 border border-outline-variant text-lg sm:text-xl overflow-x-auto max-w-full">
            <MathBlock latex={solution.generalSolutionLatex} displayMode />
          </div>
        </div>

        {solution.parts?.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {solution.parts.map((p) => (
              <div key={p.label} className="rounded-lg border border-outline-variant bg-white px-3 py-2 overflow-x-auto">
                <span className="text-[11px] font-mono text-on-surface-variant block mb-1">
                  {p.label === "Raíces" ? "Raíces de la ecuación auxiliar" : p.label === "y_c" ? "Solución complementaria" : "Solución particular"}
                </span>
                <MathBlock latex={p.label === "Raíces" ? p.latex : `${p.label} = ${p.latex}`} />
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 mt-4 border-t border-outline-variant/60 flex flex-wrap gap-2 justify-between items-center text-xs text-on-surface-variant">
          <span className="font-mono">
            Condición: <MathBlock latex={solution.validity} />
          </span>
          {verification &&
            (verification.ok ? (
              <span className="inline-flex items-center gap-1 text-secondary font-semibold" title={`Residuo máximo: ${verification.residual.toExponential(1)}`}>
                <ShieldCheck className="w-4 h-4" /> Verificada: satisface la EDO ({verification.points} puntos)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-tertiary font-semibold">
                <AlertTriangle className="w-4 h-4" /> No se pudo verificar numéricamente
              </span>
            ))}
        </div>
        {reason && <p className="mt-2 text-[11px] text-on-surface-variant">Criterio: {reason}</p>}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col gap-6 df-fade-in">
        <div className="border-b border-outline-variant pb-3">
          <h2 className="font-display text-base font-bold text-on-surface">Procedimiento Paso a Paso</h2>
          <p className="text-xs text-on-surface-variant">Trazabilidad del método, con los resultados intermedios.</p>
        </div>

        <ol className="space-y-5 relative before:absolute before:top-0 before:bottom-0 before:left-3.5 before:w-0.5 before:bg-outline-variant">
          {solution.steps.map((step, idx) => {
            const isLast = idx === solution.steps.length - 1;
            return (
              <li key={idx} className="relative flex items-start gap-4">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 z-10 ${
                    isLast ? "bg-secondary text-white" : "bg-primary text-white"
                  }`}
                >
                  {idx + 1}
                </span>
                <div
                  className={`flex-1 min-w-0 rounded-xl p-4 border ${
                    isLast ? "bg-white border-2 border-secondary/40 shadow-xs" : "bg-surface-container-low/40 border-outline-variant"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className={`font-display text-sm font-bold ${isLast ? "text-secondary" : "text-on-surface"}`}>{step.title}</h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">{step.badge}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">{step.description}</p>
                  <div className="p-3 bg-white rounded-lg border border-outline-variant text-center overflow-x-auto">
                    <MathBlock latex={step.latex} displayMode />
                  </div>
                  {step.footer && (
                    <div className="mt-2.5 pt-2 border-t border-outline-variant/60 text-[11px] font-mono text-on-surface-variant break-words">
                      {step.footer}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
