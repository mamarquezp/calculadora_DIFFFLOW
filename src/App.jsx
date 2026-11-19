import React, { useState, useEffect } from "react";
import {
  Calculator,
  Sparkles,
  Sliders,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  BookOpen,
  Copy,
  Code2,
  Delete,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { parseODE } from "./engine/parser";
import { classifyODE } from "./engine/classifier";
import { executeSolver } from "./engine/solvers";
import MathBlock from "./components/MathBlock";
import DocsSection from "./components/DocsSection";

const EXAMPLES = [
  {
    block: "A",
    title: "Ecuación de Bernoulli",
    badge: "Bernoulli (n=2)",
    ode: "x*(dy/dx) + y = x^2 * y^2",
    method: "bernoulli",
    hint: "u = y^(1-n) = y⁻¹",
  },
  {
    block: "A",
    title: "Ecuación Diferencial Exacta",
    badge: "∂M/∂y = ∂N/∂x",
    ode: "(3*x^2*y + exp(y))*dx + (x^3 + x*exp(y) - 2*y)*dy = 0",
    method: "exacta",
    hint: "Ejemplo de clase: función potencial f(x,y)=C",
  },
  {
    block: "A",
    title: "Reducible a Exacta (Factor Integrante)",
    badge: "μ(x) o μ(y)",
    ode: "(x^2 + y^2 + x)*dx + y*dy = 0",
    method: "reducible_exacta",
    hint: "Ejemplo de clase: P(x) = (My - Nx)/N",
  },
  {
    block: "A",
    title: "Homogénea de Primer Orden",
    badge: "y = ux",
    ode: "(x^2 + y^2)*dx - 2*x*y*dy = 0",
    method: "homogenea1",
    hint: "Ejemplo de clase: grado homogéneo 2",
  },
  {
    block: "A",
    title: "Variables Separables",
    badge: "g(x)dx = h(y)dy",
    ode: "dy/dx = (3*x^2 + 4*x - 4)/(2*y - 4)",
    method: "separable",
    hint: "Ejemplo de clase: separación directa",
  },
  {
    block: "A",
    title: "Lineal de Primer Orden",
    badge: "μ(x) = e^∫P(x)dx",
    ode: "dy/dx + (2/x)*y = 4*x",
    method: "lineal1",
    hint: "Factor integrante estándar",
  },
  {
    block: "B",
    title: "Orden Sup. Homogénea (Coef. Constantes)",
    badge: "Ecuación Auxiliar",
    ode: "y'' - 5*y' + 6*y = 0",
    method: "orden_sup_hom",
    hint: "Ejemplo de clase: raíces r = 2, r = 3",
  },
  {
    block: "B",
    title: "Orden Sup. No Homogénea",
    badge: "y = yc + yp",
    ode: "y'' - 3*y' + 2*y = 4",
    method: "orden_sup_no_hom",
    hint: "Ejemplo de clase: Coeficientes indeterminados",
  },
  {
    block: "B",
    title: "Ecuación de Cauchy-Euler",
    badge: "y = x^m",
    ode: "x^2*y'' - 2*x*y' - 4*y = 0",
    method: "cauchy_euler",
    hint: "Sustitución potencial m(m-1) - 2m - 4 = 0",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("calculadora"); // calculadora | docs
  const [mode, setMode] = useState("auto"); // auto | manual
  const [odeInput, setOdeInput] = useState("x*(dy/dx) + y = x^2 * y^2");
  const [selectedMethod, setSelectedMethod] = useState("bernoulli");
  const [showExamples, setShowExamples] = useState(false);

  const [previewLatex, setPreviewLatex] = useState("");
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [solution, setSolution] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [execTime, setExecTime] = useState("1.4");

  // Análisis y resolución reactiva
  const handleSolve = (customInput = odeInput, customMode = mode, customMethod = selectedMethod) => {
    const t0 = performance.now();
    setErrorMsg("");

    try {
      const parsed = parseODE(customInput);
      setPreviewLatex(parsed.latexPreview);

      let methodToRun = customMethod;
      let classification = null;

      if (customMode === "auto") {
        classification = classifyODE(parsed);
        methodToRun = classification.method;
        setSelectedMethod(methodToRun);
        setDetectedInfo(classification);
      } else {
        // En modo manual, intentar obtener metadatos si es compatible o validar
        try {
          classification = classifyODE(parsed);
        } catch {
          classification = {
            method: customMethod,
            label: "Selección Manual",
            reason: "Validando estructura según el método seleccionado en el menú.",
            meta: {
              M: parsed.M,
              N: parsed.N,
              rhs: parsed.rhs,
              gx: parsed.rhs,
            },
          };
        }
        setDetectedInfo(classification);
      }

      const result = executeSolver(methodToRun, classification.meta || {}, parsed);
      setSolution(result);
      const t1 = performance.now();
      setExecTime((t1 - t0).toFixed(2));
    } catch (err) {
      setErrorMsg(err.message || "Error al procesar la ecuación diferencial.");
      setSolution(null);
    }
  };

  useEffect(() => {
    handleSolve();
  }, []);

  const insertToken = (token) => {
    const next = odeInput + token;
    setOdeInput(next);
  };

  const handleLoadExample = (ex) => {
    setOdeInput(ex.ode);
    setSelectedMethod(ex.method);
    setShowExamples(false);
    setActiveTab("calculadora");
    handleSolve(ex.ode, mode, ex.method);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-sans">
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 h-14 bg-surface-container-lowest border-b border-outline-variant px-4 lg:px-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-primary">
            <Calculator className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg text-primary tracking-tight">
            DiffFlow EDO
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-surface-container text-secondary border border-outline-variant">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            Motor Analítico Paso a Paso
          </span>
        </div>

        {/* Navegación Central */}
        <nav className="flex items-center gap-6 text-sm">
          <button
            onClick={() => setActiveTab("calculadora")}
            className={`py-4 border-b-2 font-medium transition-colors ${
              activeTab === "calculadora"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Calculadora EDO
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`py-4 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "docs"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Manual & Arquitectura
          </button>
        </nav>

        {/* Botón Ejemplos Rápidos */}
        <div className="relative">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary bg-surface-container text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Ejemplos de Clase (9)</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showExamples && (
            <div className="absolute right-0 mt-2 w-[420px] max-w-[92vw] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-4 z-50 max-h-[520px] overflow-y-auto space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
                <span className="font-display font-bold text-sm">
                  Casos Precargados (Bloque A y B)
                </span>
                <button
                  onClick={() => setShowExamples(false)}
                  className="text-xs text-on-surface-variant hover:text-on-surface"
                >
                  Cerrar ✕
                </button>
              </div>
              {EXAMPLES.map((ex, idx) => (
                <div
                  key={idx}
                  onClick={() => handleLoadExample(ex)}
                  className="p-3 rounded-xl border border-outline-variant hover:border-primary bg-surface-container-low/40 hover:bg-surface-container-low cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-on-surface">
                      [Bloque {ex.block}] {ex.title}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-medium">
                      {ex.badge}
                    </span>
                  </div>
                  <div className="font-mono text-xs bg-white p-1.5 rounded border border-outline-variant/60 text-center my-1">
                    {ex.ode}
                  </div>
                  <div className="text-[11px] text-on-surface-variant">{ex.hint}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "docs" ? (
          <DocsSection />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* PANEL IZQUIERDO (40%) */}
            <section className="w-full lg:w-[40%] lg:sticky lg:top-20 flex flex-col gap-4">
              {/* Modo Automático / Manual */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3.5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-semibold text-on-surface-variant uppercase tracking-wider">
                    Modo de Operación
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-secondary-fixed text-on-secondary-fixed font-semibold">
                    +15% Autoidentificación
                  </span>
                </div>
                <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-lg border border-outline-variant text-xs">
                  <button
                    onClick={() => {
                      setMode("auto");
                      handleSolve(odeInput, "auto", selectedMethod);
                    }}
                    className={`py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                      mode === "auto"
                        ? "bg-white text-primary font-semibold shadow-xs border border-outline-variant/60"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-secondary" />
                    Autoidentificación
                  </button>
                  <button
                    onClick={() => setMode("manual")}
                    className={`py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                      mode === "manual"
                        ? "bg-white text-primary font-semibold shadow-xs border border-outline-variant/60"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Selección Manual
                  </button>
                </div>
              </div>

              {/* Entrada de Ecuación + Preview LaTeX */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="font-display text-sm font-semibold text-on-surface">
                    Ecuación Diferencial Ordinaria
                  </label>
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    Variables: x, y(x)
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={odeInput}
                    onChange={(e) => setOdeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSolve()}
                    placeholder="Ej: x*(dy/dx) + y = x^2 * y^2"
                    className="w-full font-mono text-sm px-3.5 py-2.5 pr-9 rounded-lg border border-outline-variant bg-white focus:border-primary focus:ring-2 focus:ring-primary-fixed focus:outline-none"
                  />
                  <button
                    onClick={() => setOdeInput("")}
                    title="Limpiar"
                    className="absolute right-2.5 top-2.5 text-on-surface-variant hover:text-on-surface"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>

                {/* Chips de Inserción Rápida */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-on-surface-variant mr-1">
                    Insertar:
                  </span>
                  {["dy/dx", "y'", "y''", "dx", "dy", "^2", "exp(x)", "sin(x)", "cos(x)"].map(
                    (sym) => (
                      <button
                        key={sym}
                        onClick={() => insertToken(sym)}
                        className="px-2 py-0.5 rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container font-mono text-[11px] text-on-surface transition-colors"
                      >
                        {sym}
                      </button>
                    )
                  )}
                </div>

                {/* Preview Matemático */}
                <div className="rounded-lg bg-surface-container-low/60 border border-outline-variant p-3">
                  <div className="flex justify-between text-[11px] font-mono text-on-surface-variant mb-1">
                    <span>Vista Previa Simbólica</span>
                    {!errorMsg ? (
                      <span className="text-secondary font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sintaxis Válida
                      </span>
                    ) : (
                      <span className="text-error font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Revisar Sintaxis
                      </span>
                    )}
                  </div>
                  <div className="text-center py-2 text-lg font-math overflow-x-auto">
                    <MathBlock latex={previewLatex || odeInput} />
                  </div>
                </div>
              </div>

              {/* Selector de Método (Desplegable Obligatorio Bloques A y B) */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-semibold">
                    Método de Resolución
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-container text-primary font-medium">
                    {mode === "auto" ? "Autodetectado" : "Manual Activo"}
                  </span>
                </div>

                <select
                  value={selectedMethod}
                  onChange={(e) => {
                    setSelectedMethod(e.target.value);
                    if (mode === "manual") {
                      handleSolve(odeInput, "manual", e.target.value);
                    }
                  }}
                  className="w-full text-xs bg-white border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface focus:border-primary focus:outline-none"
                >
                  <optgroup label="BLOQUE A: ECUACIONES DE PRIMER ORDEN">
                    <option value="separable">1. Variables Separables</option>
                    <option value="homogenea1">2. Homogéneas (Sustitución y = ux)</option>
                    <option value="exacta">3. Exactas (∂M/∂y = ∂N/∂x)</option>
                    <option value="reducible_exacta">4. Reducibles a Exactas (Factor Integrante)</option>
                    <option value="lineal1">5. Lineales de Primer Orden</option>
                    <option value="bernoulli">6. Ecuación de Bernoulli (u = y^(1-n))</option>
                  </optgroup>
                  <optgroup label="BLOQUE B: ORDEN SUPERIOR">
                    <option value="orden_sup_hom">7. Homogéneas con Coeficientes Constantes</option>
                    <option value="orden_sup_no_hom">8. No Homogéneas (Coeficientes Indeterminados)</option>
                    <option value="cauchy_euler">9. Ecuación de Cauchy-Euler</option>
                  </optgroup>
                </select>

                {detectedInfo && !errorMsg && (
                  <div className="p-3 rounded-lg bg-surface-container-low border-l-4 border-l-secondary text-xs space-y-1">
                    <div className="font-semibold text-secondary flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      {detectedInfo.label}
                    </div>
                    <p className="text-on-surface-variant leading-relaxed">
                      {detectedInfo.reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Botón Resolver */}
              <button
                onClick={() => handleSolve()}
                className="w-full py-3 px-4 rounded-xl bg-primary-container hover:bg-primary text-white font-display font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
              >
                <span>Resolver Paso a Paso</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </section>

            {/* PANEL DERECHO (60% - LIENZO DE TRAZABILIDAD) */}
            <section className="w-full lg:w-[60%] flex flex-col gap-5">
              {errorMsg ? (
                <div className="bg-error-container/60 border border-error rounded-xl p-5 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-error shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display font-bold text-error text-sm">
                      Validación de Entrada / Método Incompatible
                    </h3>
                    <p className="text-xs text-on-surface mt-1 leading-relaxed">
                      {errorMsg}
                    </p>
                  </div>
                </div>
              ) : (
                solution && (
                  <>
                    {/* TARJETA HERO DE SOLUCIÓN GENERAL */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-xs relative overflow-hidden">
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
                            onClick={() => {
                              navigator.clipboard.writeText(solution.generalSolutionLatex);
                              alert("LaTeX copiado al portapapeles");
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-container text-on-surface"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copiar LaTeX
                          </button>
                        </div>
                      </div>

                      <div className="text-center py-4">
                        <span className="text-xs font-display font-semibold text-on-surface-variant uppercase tracking-wider block mb-3">
                          Solución General Analítica
                        </span>
                        <div className="inline-block py-3 px-6 rounded-xl bg-surface-container-low/70 border border-outline-variant text-xl sm:text-2xl overflow-x-auto max-w-full">
                          <MathBlock latex={solution.generalSolutionLatex} displayMode />
                        </div>
                      </div>

                      <div className="pt-3 mt-2 border-t border-outline-variant/60 flex justify-between items-center text-xs text-on-surface-variant font-mono">
                        <span>Condición / Criterio: <MathBlock latex={solution.validity} /></span>
                        <span>C₁, C₂ ∈ ℝ</span>
                      </div>
                    </div>

                    {/* STEPPER VERTICAL DE TRAZABILIDAD */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col gap-6">
                      <div className="border-b border-outline-variant pb-3">
                        <h2 className="font-display text-base font-bold text-on-surface">
                          Derivación y Trazabilidad Didáctica
                        </h2>
                        <p className="text-xs text-on-surface-variant">
                          Procedimiento algebraico estructurado según las reglas vistas en clase.
                        </p>
                      </div>

                      <div className="space-y-5 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-outline-variant">
                        {solution.steps.map((step, idx) => {
                          const isLast = idx === solution.steps.length - 1;
                          return (
                            <div key={idx} className="relative flex items-start gap-4">
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 z-10 ${
                                  isLast
                                    ? "bg-secondary text-white"
                                    : "bg-primary text-white"
                                }`}
                              >
                                {idx + 1}
                              </span>

                              <div
                                className={`flex-1 rounded-xl p-4 border ${
                                  isLast
                                    ? "bg-white border-2 border-secondary/40 shadow-xs"
                                    : "bg-surface-container-low/40 border-outline-variant"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <h3
                                    className={`font-display text-sm font-bold ${
                                      isLast ? "text-secondary" : "text-on-surface"
                                    }`}
                                  >
                                    {step.title}
                                  </h3>
                                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                                    {step.badge}
                                  </span>
                                </div>

                                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                                  {step.description}
                                </p>

                                <div className="p-3 bg-white rounded-lg border border-outline-variant text-center overflow-x-auto">
                                  <MathBlock latex={step.latex} displayMode />
                                </div>

                                <div className="mt-2.5 pt-2 border-t border-outline-variant/60 text-[11px] font-mono text-on-surface-variant">
                                  {step.footer}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}