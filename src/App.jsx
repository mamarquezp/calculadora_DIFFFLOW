import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  Sparkles,
  Sliders,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  BookOpen,
  Delete,
  ChevronDown,
  ShieldCheck,
  XCircle,
  Info,
} from "lucide-react";
import { parseODE } from "./engine/parser";
import { METHODS } from "./engine/classifier";
import { solverClient, analyzerClient } from "./services/solverClient";
import { EXAMPLES } from "./data/examples";
import MathBlock from "./components/MathBlock";
import DocsSection from "./components/DocsSection";
import LoadingPanel from "./components/LoadingPanel";
import SolutionView from "./components/SolutionView";

/** Formato esperado para cada método (ayuda en modo manual). */
const METHOD_FORMAT = {
  separable: "dy/dx = g(x)*h(y)   ó   M(x)*dx + N(y)*dy = 0",
  exacta: "M(x,y)*dx + N(x,y)*dy = 0   con ∂M/∂y = ∂N/∂x",
  lineal1: "y' + P(x)*y = Q(x)",
  homogenea1: "M(x,y)*dx + N(x,y)*dy = 0   (M, N del mismo grado)",
  bernoulli: "y' + P(x)*y = Q(x)*y^n",
  reducible_exacta: "M(x,y)*dx + N(x,y)*dy = 0   (no exacta)",
  cauchy_euler: "a*x^2*y'' + b*x*y' + c*y = g(x)",
  orden_sup_hom: "a*y'' + b*y' + c*y = 0",
  orden_sup_no_hom: "a*y'' + b*y' + c*y = g(x)   (g: polinomio, e^ax, sen, cos)",
  variacion_parametros: "a*y'' + b*y' + c*y = g(x)",
};

const MIN_LOADING_MS = 650; // la animación se ve al menos este tiempo (evita parpadeo)

export default function App() {
  const [activeTab, setActiveTab] = useState("calculadora");
  const [mode, setMode] = useState("auto");
  const [odeInput, setOdeInput] = useState("x*(dy/dx) + y = x^2 * y^2");
  const [selectedMethod, setSelectedMethod] = useState("bernoulli");
  const [showExamples, setShowExamples] = useState(false);

  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorKind, setErrorKind] = useState("error");
  const [execTime, setExecTime] = useState("0");
  // Compatibilidad calculada para una entrada concreta: { input, data: { results, auto } }
  const [analysisState, setAnalysisState] = useState({ input: null, data: null });
  const [notice, setNotice] = useState("");
  const inputRef = useRef(null);

  // ---- Vista previa (ligera, en el hilo principal) ----
  const preview = useMemo(() => {
    try {
      const parsed = parseODE(odeInput);
      return { ok: true, latex: parsed.latexPreview };
    } catch (e) {
      return { ok: false, latex: "", msg: e.message };
    }
  }, [odeInput]);

  // ---- Compatibilidad de métodos (en el worker, con retardo al escribir) ----
  useEffect(() => {
    if (!preview.ok) return undefined;
    const timer = setTimeout(() => {
      analyzerClient
        .run({ input: odeInput })
        .then((r) => setAnalysisState({ input: odeInput, data: r }))
        .catch(() => {});
    }, 450);
    return () => clearTimeout(timer);
  }, [odeInput, preview.ok]);

  const handleSolve = async () => {
    if (status === "loading") return;
    if (!preview.ok) {
      setStatus("error");
      setErrorKind("syntax");
      setErrorMsg(preview.msg);
      return;
    }
    setNotice("");
    setStatus("loading");
    setErrorMsg("");
    const t0 = performance.now();
    const minDelay = new Promise((r) => setTimeout(r, MIN_LOADING_MS));
    try {
      const res = await solverClient.run({ input: odeInput, mode, method: selectedMethod });
      const elapsed = performance.now() - t0;
      await minDelay;
      setExecTime(elapsed.toFixed(0));
      setResult(res);
      setAnalysisState({ input: odeInput, data: { results: res.results, auto: res.auto } });
      // Autoidentificación: activa en el menú el método detectado
      if (mode === "auto") setSelectedMethod(res.method);
      setStatus("done");
    } catch (err) {
      await minDelay;
      if (err.kind === "cancelled") {
        setStatus(result ? "done" : "idle");
        return;
      }
      setResult(null);
      setErrorKind(err.kind || "error");
      setErrorMsg(err.message || "Error al procesar la ecuación.");
      setStatus("error");
    }
  };

  const handleCancel = () => solverClient.cancel();

  const handleLoadExample = (ex) => {
    setOdeInput(ex.ode);
    setSelectedMethod(ex.method);
    setShowExamples(false);
    setActiveTab("calculadora");
    setResult(null);
    setStatus("idle");
    setNotice(`Ejemplo cargado: ${ex.title}. Presiona «Resolver Paso a Paso» para calcular.`);
  };

  const insertSymbol = (sym) => {
    const el = inputRef.current;
    if (!el) return setOdeInput((p) => p + sym);
    const start = el.selectionStart ?? odeInput.length;
    const end = el.selectionEnd ?? odeInput.length;
    const next = odeInput.slice(0, start) + sym + odeInput.slice(end);
    setOdeInput(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + sym.length, start + sym.length);
    });
  };

  const analysis = analysisState.input === odeInput ? analysisState.data : null;
  const results = analysis?.results;
  const compatibleCount = results ? METHODS.filter((m) => results[m.key]?.ok).length : 0;
  const autoKey = analysis?.auto;
  const shownMethod = mode === "auto" ? autoKey || "" : selectedMethod;
  const selectedInfo = results?.[selectedMethod];
  const loading = status === "loading";

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-sans">
      {/* BARRA SUPERIOR */}
      <header className="sticky top-0 z-40 min-h-14 bg-surface-container-lowest border-b border-outline-variant px-4 lg:px-8 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-primary">
            <Calculator className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg text-primary tracking-tight">DiffFlow EDO</span>
        </div>

        <nav className="flex items-center gap-6 text-sm">
          {[
            ["calculadora", "Calculadora EDO", null],
            ["docs", "Manual & Arquitectura", <BookOpen key="i" className="w-4 h-4" />],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`py-4 border-b-2 font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === key ? "border-primary text-primary font-semibold" : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary bg-surface-container text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Ejemplos de Clase ({EXAMPLES.length})</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showExamples && (
            <div className="absolute right-0 mt-2 w-[440px] max-w-[92vw] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-4 z-50 max-h-[70vh] overflow-y-auto space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
                <span className="font-display font-bold text-sm">Casos precargados (Bloques A y B)</span>
                <button type="button" onClick={() => setShowExamples(false)} className="text-xs text-on-surface-variant hover:text-on-surface cursor-pointer">
                  Cerrar ✕
                </button>
              </div>
              <p className="text-[11px] text-on-surface-variant">Al elegir un ejemplo se carga la ecuación; se resuelve al presionar «Resolver».</p>
              {EXAMPLES.map((ex, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleLoadExample(ex)}
                  className="w-full text-left p-3 rounded-xl border border-outline-variant hover:border-primary bg-surface-container-low/40 hover:bg-surface-container-low cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-on-surface">
                      [Bloque {ex.block}] {ex.title}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-medium whitespace-nowrap">{ex.badge}</span>
                  </div>
                  <div className="font-mono text-xs bg-white p-1.5 rounded border border-outline-variant/60 text-center my-1 break-all">{ex.ode}</div>
                  <div className="text-[11px] text-on-surface-variant">{ex.hint}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "docs" ? (
          <DocsSection />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* PANEL IZQUIERDO: entrada */}
            <section className="w-full lg:w-[40%] lg:sticky lg:top-20 flex flex-col gap-4">
              {/* Modo */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3.5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-semibold text-on-surface-variant uppercase tracking-wider">Modo de Resolución</span>
                  <span className="text-[11px] font-mono text-secondary font-medium">
                    {mode === "auto" ? "Autoidentificación" : "Selección manual"}
                  </span>
                </div>
                <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-lg border border-outline-variant text-xs">
                  {[
                    ["auto", "Automático", <Sparkles key="a" className="w-3.5 h-3.5" />],
                    ["manual", "Manual", <Sliders key="m" className="w-3.5 h-3.5" />],
                  ].map(([key, label, icon]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={loading}
                      onClick={() => setMode(key)}
                      className={`py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed ${
                        mode === key ? "bg-primary text-white font-semibold shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entrada */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="ode-input" className="font-display text-sm font-semibold text-on-surface">
                    Ecuación Diferencial
                  </label>
                  <span className="text-[11px] font-mono text-on-surface-variant">Enter para resolver</span>
                </div>

                <div className="relative">
                  <input
                    id="ode-input"
                    ref={inputRef}
                    type="text"
                    value={odeInput}
                    disabled={loading}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) => setOdeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSolve()}
                    placeholder="Ej: x*(dy/dx) + y = x^2 * y^2"
                    className="w-full font-mono text-sm px-3.5 py-2.5 pr-9 rounded-lg border border-outline-variant bg-white focus:border-primary focus:ring-2 focus:ring-primary-fixed focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setOdeInput("")}
                    title="Limpiar"
                    className="absolute right-2.5 top-2.5 text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-on-surface-variant mr-1">Insertar:</span>
                  {["dy/dx", "y'", "y''", "y'''", "*dx", "*dy", "^", "exp(x)", "ln(x)", "sin(x)", "cos(x)"].map((sym) => (
                    <button
                      type="button"
                      key={sym}
                      onClick={() => insertSymbol(sym)}
                      className="px-2 py-0.5 rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container font-mono text-[11px] text-on-surface transition-colors cursor-pointer"
                    >
                      {sym}
                    </button>
                  ))}
                </div>

                <div className="rounded-lg bg-surface-container-low/60 border border-outline-variant p-3">
                  <div className="flex justify-between text-[11px] font-mono text-on-surface-variant mb-1">
                    <span>Vista previa</span>
                    {preview.ok ? (
                      <span className="text-secondary font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sintaxis válida
                      </span>
                    ) : (
                      <span className="text-error font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Revisa la ecuación
                      </span>
                    )}
                  </div>
                  <div className="text-center py-2 text-lg overflow-x-auto">
                    {preview.ok ? (
                      <MathBlock latex={preview.latex} />
                    ) : (
                      <span className="text-xs text-error">{odeInput.trim() ? preview.msg : "Esperando ecuación…"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Menú de métodos */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="method-select" className="font-display text-sm font-semibold">
                    {mode === "auto" ? "Método identificado" : "Método de solución"}
                  </label>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-container text-primary font-medium">
                    {results ? `${compatibleCount} compatible${compatibleCount === 1 ? "" : "s"}` : preview.ok ? "analizando…" : "—"}
                  </span>
                </div>

                <select
                  id="method-select"
                  value={shownMethod}
                  disabled={mode === "auto" || loading}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-full text-xs bg-white border border-primary rounded-lg px-3 py-2.5 text-on-surface focus:outline-none disabled:bg-surface-container-low disabled:text-on-surface"
                >
                  {mode === "auto" && !autoKey && <option value="">{preview.ok ? "Se detectará al resolver…" : "Ingresa una EDO válida"}</option>}
                  {["A", "B"].map((block) => (
                    <optgroup key={block} label={block === "A" ? "Bloque A • Primer orden" : "Bloque B • Orden superior"}>
                      {METHODS.filter((m) => m.block === block).map((m) => {
                        const mark = results ? (results[m.key]?.ok ? "✓ " : "✗ ") : "";
                        return (
                          <option key={m.key} value={m.key}>
                            {mark}
                            {m.label}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>

                {mode === "manual" && (
                  <p className="text-[11px] font-mono text-on-surface-variant flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-px" /> Formato: {METHOD_FORMAT[selectedMethod]}
                  </p>
                )}

                {mode === "auto" && autoKey && results?.[autoKey] && (
                  <div className="p-2.5 rounded-lg bg-primary-fixed/40 border border-primary/30 text-xs">
                    <div className="font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Autoidentificación
                    </div>
                    <p className="text-on-surface-variant mt-0.5">{results[autoKey].reason}</p>
                  </div>
                )}

                {mode === "manual" && selectedInfo && (
                  <div
                    className={`p-2.5 rounded-lg border-l-4 text-xs bg-surface-container-low ${
                      selectedInfo.ok ? "border-l-secondary" : "border-l-error"
                    }`}
                  >
                    <div className={`font-semibold flex items-center gap-1 ${selectedInfo.ok ? "text-secondary" : "text-error"}`}>
                      {selectedInfo.ok ? <ShieldCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {selectedInfo.ok ? "La ecuación cumple las condiciones del método" : "La ecuación no corresponde a este método"}
                    </div>
                    <p className="text-on-surface-variant mt-0.5">{selectedInfo.reason}</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSolve}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-primary-container hover:bg-primary text-white font-display font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-70 disabled:cursor-wait"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    <span>Resolviendo…</span>
                  </>
                ) : (
                  <>
                    <span>Resolver Paso a Paso</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </section>

            {/* PANEL DERECHO: resultados */}
            <section className="w-full lg:w-[60%] flex flex-col gap-5 min-w-0" aria-live="polite">
              {notice && status === "idle" && (
                <div className="rounded-xl border border-primary/30 bg-primary-fixed/30 p-3 text-xs text-on-surface flex items-center gap-2 df-fade-in">
                  <Info className="w-4 h-4 text-primary shrink-0" /> {notice}
                </div>
              )}

              {loading && <LoadingPanel onCancel={handleCancel} />}

              {status === "error" && (
                <div role="alert" className="bg-error-container/60 border border-error rounded-xl p-5 flex items-start gap-3 df-fade-in">
                  <AlertTriangle className="w-6 h-6 text-error shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display font-bold text-error text-sm">
                      {errorKind === "incompatible"
                        ? "Método incompatible con la ecuación"
                        : errorKind === "syntax"
                          ? "Error en la ecuación ingresada"
                          : errorKind === "timeout"
                            ? "Cálculo detenido"
                            : "No se pudo resolver"}
                    </h3>
                    <p className="text-xs text-on-surface mt-1 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}

              {status === "done" && result && <SolutionView data={result} execTime={execTime} />}

              {status === "idle" && !result && (
                <div className="border-2 border-dashed border-outline-variant rounded-xl p-10 text-center text-on-surface-variant">
                  <Calculator className="w-10 h-10 mx-auto mb-3 text-primary/60" />
                  <p className="font-display font-semibold text-on-surface">Escribe una ecuación y presiona «Resolver Paso a Paso»</p>
                  <p className="text-xs mt-1">
                    Usa y', y'' o dy/dx para las derivadas y '*' para multiplicar. También puedes cargar un ejemplo de clase.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
