import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Sliders,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Eraser,
  ShieldCheck,
  XCircle,
  Info,
  Sun,
  Moon,
  FlaskConical,
  Sigma,
} from "lucide-react";
import { parseODE } from "./engine/parser";
import { METHODS } from "./engine/classifier";
import { solverClient, analyzerClient } from "./services/solverClient";
import MathBlock from "./components/MathBlock";
import DocsSection from "./components/DocsSection";
import LoadingPanel from "./components/LoadingPanel";
import SolutionView from "./components/SolutionView";
import ExamplesMenu from "./components/ExamplesMenu";

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

const SYMBOLS = ["dy/dx", "y'", "y''", "y'''", "*dx", "*dy", "^", "exp(x)", "ln(x)", "sin(x)", "cos(x)"];
const MIN_LOADING_MS = 650; // la animación se ve al menos este tiempo (evita parpadeo)

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("df-theme", theme);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [activeTab, setActiveTab] = useState("calculadora");
  const [mode, setMode] = useState("auto");
  const [odeInput, setOdeInput] = useState("x*(dy/dx) + y = x^2 * y^2");
  const [selectedMethod, setSelectedMethod] = useState("bernoulli");

  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorKind, setErrorKind] = useState("error");
  const [execTime, setExecTime] = useState("0");
  // Compatibilidad calculada para una entrada concreta: { input, data: { results, auto } }
  const [analysisState, setAnalysisState] = useState({ input: null, data: null });
  const [notice, setNotice] = useState("");
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // ---- Vista previa (ligera, en el hilo principal) ----
  const preview = useMemo(() => {
    try {
      return { ok: true, latex: parseODE(odeInput).latexPreview };
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

  // ---- El campo crece con ecuaciones largas ----
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [odeInput, activeTab]);

  /** Descarta la solución mostrada (ya no corresponde a lo que hay en pantalla). */
  const clearSolution = () => {
    if (status === "loading") solverClient.cancel();
    setResult(null);
    setErrorMsg("");
    setStatus("idle");
  };

  const changeInput = (value) => {
    setOdeInput(value);
    setNotice("");
    clearSolution();
  };

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
      if (mode === "auto") setSelectedMethod(res.method); // activa el método detectado
      setStatus("done");
    } catch (err) {
      await minDelay;
      if (err.kind === "cancelled") return;
      setResult(null);
      setErrorKind(err.kind || "error");
      setErrorMsg(err.message || "Error al procesar la ecuación.");
      setStatus("error");
    }
  };

  // En móvil, al terminar se lleva la vista a los resultados
  useEffect(() => {
    if ((status === "done" || status === "error") && window.innerWidth < 1024) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  const handleLoadExample = (ex) => {
    setOdeInput(ex.ode);
    setSelectedMethod(ex.method);
    setActiveTab("calculadora");
    clearSolution();
    setNotice(`Ejemplo cargado: ${ex.title}. Presiona «Resolver» para calcular.`);
  };

  const insertSymbol = (sym) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? odeInput.length;
    const end = el?.selectionEnd ?? odeInput.length;
    changeInput(odeInput.slice(0, start) + sym + odeInput.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + sym.length, start + sym.length);
    });
  };

  const analysis = analysisState.input === odeInput ? analysisState.data : null;
  const results = analysis?.results;
  const compatibleCount = results ? METHODS.filter((m) => results[m.key]?.ok).length : 0;
  const autoKey = analysis?.auto;
  const shownMethod = mode === "auto" ? autoKey || "" : selectedMethod;
  const selectedInfo = results?.[selectedMethod];
  const loading = status === "loading";

  const errorTitle =
    errorKind === "incompatible"
      ? "Método incompatible con la ecuación"
      : errorKind === "syntax"
        ? "Error en la ecuación ingresada"
        : errorKind === "timeout"
          ? "Cálculo detenido"
          : "No se pudo resolver";

  return (
    <div className="relative min-h-dvh lg:h-dvh flex flex-col text-ink">
      <div className="df-backdrop" aria-hidden="true">
        <div className="df-blob df-blob-1" />
        <div className="df-blob df-blob-2" />
        <div className="df-blob df-blob-3" />
      </div>

      {/* BARRA SUPERIOR flotante */}
      <header className="relative z-40 shrink-0 px-3 sm:px-6 pt-3">
        <div className="glass-strong rounded-2xl px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl btn-liquid flex items-center justify-center">
              <Sigma className="w-5 h-5" />
            </div>
            <div className="leading-none">
              <span className="font-serif italic text-2xl tracking-tight">DiffFlow</span>
              <span className="ml-1.5 align-middle text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-primary-soft text-primary">EDO</span>
            </div>
          </div>

          <nav className="order-3 sm:order-none w-full sm:w-auto flex p-1 rounded-xl bg-soft border border-line text-sm" aria-label="Secciones">
            {[
              ["calculadora", "Calculadora", <FlaskConical key="c" className="w-4 h-4" />],
              ["docs", "Manual", <BookOpen key="d" className="w-4 h-4" />, " y arquitectura"],
            ].map(([key, label, icon, extra]) => (
              <button
                key={key}
                type="button"
                aria-current={activeTab === key ? "page" : undefined}
                onClick={() => setActiveTab(key)}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === key ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {icon}
                {label}
                {extra && <span className="hidden md:inline -ml-1">{extra}</span>}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ExamplesMenu onSelect={handleLoadExample} />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              className="w-9 h-9 rounded-xl bg-soft border border-line flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-4">
        {activeTab === "docs" ? (
          <div className="h-full lg:overflow-y-auto df-scroll">
            <DocsSection />
          </div>
        ) : (
          <div className="h-full flex flex-col lg:flex-row gap-5">
            {/* PANEL IZQUIERDO: entrada (scroll propio) */}
            <section className="w-full lg:w-[40%] lg:max-w-[560px] lg:min-h-0 flex flex-col glass rounded-3xl overflow-hidden" aria-label="Entrada de la ecuación">
              <div className="flex-1 lg:min-h-0 lg:overflow-y-auto df-scroll p-4 sm:p-5 flex flex-col gap-5">
                {/* Modo */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">Modo</span>
                    <span className="text-xs text-muted">{mode === "auto" ? "Detecta el método por ti" : "Tú eliges el método"}</span>
                  </div>
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-soft border border-line text-sm">
                    {[
                      ["auto", "Automático", <Sparkles key="a" className="w-4 h-4" />],
                      ["manual", "Manual", <Sliders key="m" className="w-4 h-4" />],
                    ].map(([key, label, icon]) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={mode === key}
                        onClick={() => {
                          if (mode !== key) {
                            setMode(key);
                            clearSolution();
                          }
                        }}
                        className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          mode === key ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:text-ink"
                        }`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Entrada */}
                <div className="flex flex-col gap-2.5">
                  <label htmlFor="ode-input" className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Ecuación diferencial
                  </label>
                  <div className="relative">
                    <textarea
                      id="ode-input"
                      ref={inputRef}
                      rows={1}
                      value={odeInput}
                      spellCheck={false}
                      autoComplete="off"
                      onChange={(e) => changeInput(e.target.value.replace(/\n/g, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSolve();
                        }
                      }}
                      placeholder="Ej: x*(dy/dx) + y = x^2 * y^2"
                      className="w-full resize-none overflow-hidden font-mono text-[15px] leading-relaxed pl-4 pr-11 py-3 rounded-2xl well text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        changeInput("");
                        inputRef.current?.focus();
                      }}
                      title="Borrar ecuación"
                      aria-label="Borrar ecuación"
                      className="absolute right-2.5 top-2.5 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-error hover:bg-error-soft transition-colors cursor-pointer"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5" aria-label="Insertar símbolo">
                    {SYMBOLS.map((sym) => (
                      <button
                        type="button"
                        key={sym}
                        onClick={() => insertSymbol(sym)}
                        className="px-2.5 py-1 rounded-lg bg-soft border border-line hover:border-primary hover:text-primary font-mono text-xs text-ink transition-colors cursor-pointer"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl well px-4 py-3">
                    <div className="flex justify-between text-xs text-muted mb-1.5">
                      <span className="font-semibold uppercase tracking-wider">Vista previa</span>
                      {preview.ok ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sintaxis válida
                        </span>
                      ) : odeInput.trim() ? (
                        <span className="text-error font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Revisa la ecuación
                        </span>
                      ) : null}
                    </div>
                    <div className="text-center py-1 text-lg overflow-x-auto min-h-[2.25rem]">
                      {preview.ok ? (
                        <MathBlock latex={preview.latex} />
                      ) : (
                        <span className={`text-sm ${odeInput.trim() ? "text-error" : "text-muted"}`}>
                          {odeInput.trim() ? preview.msg : "Esperando ecuación…"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menú de métodos */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="method-select" className="text-xs font-semibold text-muted uppercase tracking-wider">
                      {mode === "auto" ? "Método identificado" : "Método de solución"}
                    </label>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-soft text-primary">
                      {results ? `${compatibleCount} compatible${compatibleCount === 1 ? "" : "s"}` : preview.ok ? "analizando…" : "—"}
                    </span>
                  </div>

                  <select
                    id="method-select"
                    value={shownMethod}
                    disabled={mode === "auto"}
                    onChange={(e) => {
                      setSelectedMethod(e.target.value);
                      clearSolution();
                    }}
                    className="w-full text-sm rounded-xl px-3.5 py-2.5 well text-ink focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-80 cursor-pointer disabled:cursor-default"
                  >
                    {mode === "auto" && !autoKey && <option value="">{preview.ok ? "Se detectará al resolver…" : "Ingresa una EDO válida"}</option>}
                    {["A", "B"].map((block) => (
                      <optgroup key={block} label={block === "A" ? "Bloque A · Primer orden" : "Bloque B · Orden superior"}>
                        {METHODS.filter((m) => m.block === block).map((m) => (
                          <option key={m.key} value={m.key}>
                            {results ? (results[m.key]?.ok ? "✓ " : "✗ ") : ""}
                            {m.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {mode === "manual" && (
                    <p className="text-xs font-mono text-muted flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-px" /> {METHOD_FORMAT[selectedMethod]}
                    </p>
                  )}

                  {mode === "auto" && autoKey && results?.[autoKey] && (
                    <div className="p-3 rounded-xl bg-primary-soft border border-primary/25 text-sm">
                      <div className="font-semibold text-primary flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Autoidentificación
                      </div>
                      <p className="text-muted mt-0.5 text-xs leading-relaxed">{results[autoKey].reason}</p>
                    </div>
                  )}

                  {mode === "manual" && selectedInfo && (
                    <div className={`p-3 rounded-xl border text-sm ${selectedInfo.ok ? "bg-success-soft border-success/30" : "bg-error-soft border-error/30"}`}>
                      <div className={`font-semibold flex items-center gap-1.5 ${selectedInfo.ok ? "text-success" : "text-error"}`}>
                        {selectedInfo.ok ? <ShieldCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {selectedInfo.ok ? "Cumple las condiciones del método" : "No corresponde a este método"}
                      </div>
                      <p className="text-muted mt-0.5 text-xs leading-relaxed">{selectedInfo.reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón fijo al pie del panel: siempre visible */}
              <div className="shrink-0 p-4 sm:p-5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={handleSolve}
                  disabled={loading}
                  className="btn-liquid w-full py-3.5 px-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:cursor-wait disabled:opacity-80"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Resolviendo…
                    </>
                  ) : (
                    <>
                      Resolver paso a paso
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="hidden lg:block text-center text-[11px] text-muted mt-2">
                  o presiona <kbd className="font-mono px-1.5 py-0.5 rounded bg-soft border border-line">Enter</kbd>
                </p>
              </div>
            </section>

            {/* PANEL DERECHO: resultados (scroll propio) */}
            <section
              ref={resultsRef}
              aria-live="polite"
              aria-label="Resultados"
              className="w-full lg:flex-1 lg:min-h-0 lg:overflow-y-auto df-scroll flex flex-col gap-5 min-w-0 scroll-mt-4 lg:pr-1 pb-4"
            >
              {notice && status === "idle" && (
                <div className="glass rounded-2xl p-3.5 text-sm flex items-center gap-2 df-fade-in">
                  <Info className="w-4 h-4 text-primary shrink-0" /> {notice}
                </div>
              )}

              {loading && <LoadingPanel onCancel={clearSolution} />}

              {status === "error" && (
                <div role="alert" className="glass rounded-3xl p-5 flex items-start gap-3 df-fade-in border-error/40">
                  <div className="w-10 h-10 rounded-xl bg-error-soft flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-error" />
                  </div>
                  <div>
                    <h3 className="font-bold text-error">{errorTitle}</h3>
                    <p className="text-sm text-ink/90 mt-1 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}

              {status === "done" && result && <SolutionView data={result} execTime={execTime} />}

              {status === "idle" && !result && (
                <div className="glass rounded-3xl flex-1 min-h-[320px] flex flex-col items-center justify-center text-center px-8 py-12">
                  <p className="font-serif italic text-4xl sm:text-5xl leading-tight">
                    Escribe una ecuación,
                    <br />
                    <span className="bg-gradient-to-r from-primary to-primary-2 bg-clip-text text-transparent">nosotros mostramos el camino.</span>
                  </p>
                  <p className="text-sm text-muted mt-4 max-w-md">
                    Usa <code className="font-mono text-ink">y'</code>, <code className="font-mono text-ink">y''</code> o{" "}
                    <code className="font-mono text-ink">dy/dx</code> para las derivadas y <code className="font-mono text-ink">*</code> para multiplicar.
                    También puedes cargar uno de los ejemplos de clase.
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
