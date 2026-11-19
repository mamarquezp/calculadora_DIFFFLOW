import React, { useState } from "react";
import { Copy, Check, ShieldCheck, AlertTriangle, ListOrdered, Presentation, ChevronRight, RotateCcw } from "lucide-react";
import MathBlock from "./MathBlock";

const PART_LABEL = { Raíces: "Raíces de la ecuación auxiliar", y_c: "Solución complementaria", y_p: "Solución particular" };

/**
 * Solución general (LaTeX), y_c / y_p por separado, verificación y el
 * procedimiento. Los pasos se pueden ver todos juntos o revelar uno por uno.
 */
export default function SolutionView({ data, execTime }) {
  const { solution, verification, reason } = data;
  const [copied, setCopied] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [visible, setVisible] = useState(1);
  const total = solution.steps.length;
  const shown = presenting ? solution.steps.slice(0, visible) : solution.steps;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(solution.generalSolutionLatex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* portapapeles no disponible */
    }
  };

  const isBlockB = solution.block.includes("B");
  // Fórmulas largas con letra menor para evitar el scroll horizontal
  const len = solution.generalSolutionLatex.length;
  const solSize = len > 140 ? "text-sm sm:text-base" : len > 80 ? "text-base sm:text-lg" : "text-xl sm:text-2xl";

  return (
    <>
      {/* ---------- Resultado ---------- */}
      <article className="glass rounded-3xl p-5 sm:p-6 df-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg ${
                isBlockB ? "bg-soft-2 text-block-b" : "bg-primary-soft text-block-a"
              }`}
            >
              {solution.block}
            </span>
            <h2 className="font-bold text-lg">{solution.methodTitle}</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-mono">{execTime} ms</span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-soft border border-line hover:text-ink font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado" : "Copiar LaTeX"}
            </button>
          </div>
        </div>

        <p className="font-serif italic text-xl text-muted mb-2">Solución general</p>
        <div className={`ring-gradient rounded-2xl px-4 sm:px-6 py-5 ${solSize} text-center overflow-x-auto df-scroll shadow-[0_10px_40px_-18px_var(--primary)]`}>
          <MathBlock latex={solution.generalSolutionLatex} displayMode />
        </div>

        {solution.parts?.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {solution.parts.map((p) => (
              <div key={p.label} className="well rounded-2xl px-4 py-3 overflow-x-auto">
                <span className="text-xs font-semibold text-muted block mb-1">{PART_LABEL[p.label] || p.label}</span>
                <MathBlock latex={p.label === "Raíces" ? p.latex : `${p.label} = ${p.latex}`} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 items-center justify-between text-sm">
          <span className="text-muted">
            Condición: <MathBlock latex={solution.validity} />
          </span>
          {verification &&
            (verification.ok ? (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-soft text-success font-semibold text-xs"
                title={`Residuo máximo: ${verification.residual.toExponential(1)}`}
              >
                <ShieldCheck className="w-4 h-4" /> Verificada: satisface la EDO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-soft text-warn font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" /> No se pudo verificar
              </span>
            ))}
        </div>
        {reason && <p className="mt-2 text-xs text-muted leading-relaxed">Criterio: {reason}</p>}
      </article>

      {/* ---------- Procedimiento ---------- */}
      <article className="glass rounded-3xl p-5 sm:p-6 df-fade-in">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="font-serif italic text-3xl leading-none">Paso a paso</h2>
            <p className="text-sm text-muted mt-1">
              {total} pasos · {presenting ? `mostrando ${visible} de ${total}` : "procedimiento completo"}
            </p>
          </div>
          <div className="flex p-1 rounded-xl bg-soft border border-line text-xs">
            {[
              [false, "Ver todo", <ListOrdered key="l" className="w-3.5 h-3.5" />],
              [true, "Revelar uno a uno", <Presentation key="p" className="w-3.5 h-3.5" />],
            ].map(([val, label, icon]) => (
              <button
                key={label}
                type="button"
                aria-pressed={presenting === val}
                onClick={() => {
                  setPresenting(val);
                  setVisible(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  presenting === val ? "bg-primary text-on-primary" : "text-muted hover:text-ink"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        <ol className="relative space-y-4">
          <span aria-hidden className="absolute left-[17px] top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-primary via-primary-2 to-success opacity-40" />
          {shown.map((step, idx) => {
            const isLast = idx === total - 1;
            return (
              <li key={idx} className="relative flex items-start gap-3.5 df-fade-in" style={{ animationDelay: presenting ? "0ms" : `${Math.min(idx, 8) * 60}ms` }}>
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-mono font-bold shrink-0 z-10 ${
                    isLast ? "bg-success text-on-primary" : "btn-liquid"
                  }`}
                >
                  {idx + 1}
                </span>
                <div className={`flex-1 min-w-0 rounded-2xl p-4 ${isLast ? "well border-success/50" : "bg-soft border border-line"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <h3 className={`font-bold ${isLast ? "text-success" : ""}`}>{step.title.replace(/^Paso \d+:\s*/, "")}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-soft text-primary">{step.badge}</span>
                  </div>
                  <p className="text-sm text-muted mb-3 leading-relaxed">{step.description}</p>
                  <div className="well rounded-xl px-3 py-2.5 text-center overflow-x-auto">
                    <MathBlock latex={step.latex} displayMode />
                  </div>
                  {step.footer && <p className="mt-2 text-xs font-mono text-muted break-words">{step.footer}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {presenting && (
          <div className="mt-5 flex justify-center gap-2">
            {visible < total ? (
              <button
                type="button"
                onClick={() => setVisible((v) => Math.min(v + 1, total))}
                className="btn-liquid px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer"
              >
                Siguiente paso <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setVisible(1)}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 bg-soft border border-line hover:text-primary cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Volver al primer paso
              </button>
            )}
          </div>
        )}
      </article>
    </>
  );
}
