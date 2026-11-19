import React from "react";
import { BookOpen, Cpu, Keyboard } from "lucide-react";

/** Bloques del diagrama de arquitectura (x, y en el viewBox). */
const NODES = [
  { x: 20, y: 20, title: "1. Interfaz", lines: ["React + Tailwind", "Modo auto / manual", "Vista previa KaTeX"], tone: "a" },
  { x: 215, y: 75, title: "2. Parser", lines: ["Valida sintaxis", "y', y'', dy/dx, dx, dy", "Mensajes de error"], tone: "n" },
  { x: 410, y: 20, title: "3. Clasificador", lines: ["Un detector por método", "con su motivo", "Autoidentificación"], tone: "n" },
  { x: 410, y: 130, title: "4. Solvers", lines: ["Un archivo por método", "Pasos programados", "CAS solo para ∫ y ∂"], tone: "n" },
  { x: 605, y: 130, title: "5. Verificación", lines: ["Sustituye la solución", "en la EDO original"], tone: "s" },
  { x: 20, y: 140, title: "6. Presentación", lines: ["Solución en LaTeX", "y_c / y_p separados", "Paso a paso"], tone: "a" },
];

const TONE = {
  a: "var(--primary)",
  n: "var(--muted)",
  s: "var(--success)",
};

function Node({ x, y, title, lines, tone }) {
  return (
    <g>
      <rect x={x} y={y} width="175" height="88" rx="14" style={{ fill: "var(--well)", stroke: TONE[tone] }} strokeWidth="1.5" />
      <text x={x + 87.5} y={y + 26} textAnchor="middle" fontSize="13.5" fontWeight="700" style={{ fill: TONE[tone] }}>
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={l} x={x + 87.5} y={y + 46 + i * 15} textAnchor="middle" fontSize="11" style={{ fill: "var(--muted)" }}>
          {l}
        </text>
      ))}
    </g>
  );
}

const ARROWS = [
  "M195 64 L211 100",
  "M390 105 L406 75",
  "M390 135 L406 165",
  "M497 108 L497 126",
  "M585 174 L601 174",
  "M692 218 L692 242 L107 242 L107 232",
];

const SYNTAX = [
  ["Primera derivada", "y'  ó  dy/dx"],
  ["Segunda / tercera derivada", "y''   y'''"],
  ["Forma diferencial", "(2*x*y)*dx + (x^2)*dy = 0"],
  ["Multiplicación", "2*x*y   (siempre con *)"],
  ["Potencias", "x^2   y^(1/2)"],
  ["Funciones", "exp(x)  e^x  ln(x)  sin(x)  sen(x)  cos(x)"],
];

const GUIDE = [
  ["Escribe la ecuación", "Usa la barra de símbolos si no recuerdas la notación. La vista previa confirma que la sintaxis es válida."],
  ["Elige el modo", "Automático identifica el método y lo activa en el menú. Manual te deja elegirlo: el menú marca ✓ los compatibles y explica por qué los demás no aplican."],
  ["Resuelve", "Presiona «Resolver paso a paso» o Enter. El cálculo corre en segundo plano; puedes cancelarlo."],
  ["Revisa el procedimiento", "Mira la solución general, y_c e y_p, la verificación y cada paso. Usa «Revelar uno a uno» para explicarlo en clase."],
];

export default function DocsSection() {
  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-6">
      <section className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="font-serif italic text-3xl">Arquitectura</h2>
        </div>
        <p className="text-sm text-muted mb-5 max-w-3xl leading-relaxed">
          La interfaz está separada del motor matemático. El motor (bloques 2 a 5) corre en un Web Worker, así la página no se congela
          mientras calcula. Nerdamer solo se usa para operaciones primitivas (derivar, integrar, sustituir); la clasificación y los pasos
          de cada método están programados en <code className="font-mono text-ink">src/engine</code>.
        </p>
        <div className="well rounded-2xl p-3 overflow-x-auto df-scroll">
          <svg viewBox="0 0 800 252" className="w-full min-w-[680px] h-auto" role="img" aria-label="Diagrama de bloques de la arquitectura">
            <defs>
              <marker id="df-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 1 L10 5 L0 9 z" style={{ fill: "var(--primary)" }} />
              </marker>
            </defs>
            <rect x="205" y="8" width="585" height="222" rx="18" fill="none" style={{ stroke: "var(--primary-2)" }} strokeDasharray="6 5" strokeWidth="1.2" />
            <text x="215" y="220" fontSize="11" fontWeight="600" style={{ fill: "var(--primary-2)" }}>
              Web Worker · motor matemático
            </text>
            {NODES.map((n) => (
              <Node key={n.title} {...n} />
            ))}
            {ARROWS.map((d) => (
              <path key={d} d={d} style={{ stroke: "var(--primary)" }} strokeWidth="2" fill="none" markerEnd="url(#df-arrow)" />
            ))}
          </svg>
        </div>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="font-serif italic text-3xl">Manual de usuario</h2>
        </div>
        <ol className="grid sm:grid-cols-2 gap-3">
          {GUIDE.map(([title, text], i) => (
            <li key={title} className="bg-soft border border-line rounded-2xl p-4 flex gap-3">
              <span className="btn-liquid w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-mono font-bold text-sm">{i + 1}</span>
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm text-muted mt-1 leading-relaxed">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="w-5 h-5 text-primary" />
          <h2 className="font-serif italic text-3xl">Cómo escribir la ecuación</h2>
        </div>
        <div className="well rounded-2xl divide-y divide-line">
          {SYNTAX.map(([what, how]) => (
            <div key={what} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-2.5">
              <span className="text-sm font-semibold">{what}</span>
              <code className="font-mono text-sm text-primary">{how}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
