import React from "react";
import { BookOpen, Cpu } from "lucide-react";

export default function DocsSection() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Diagrama de Bloques de Arquitectura */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-bold text-on-surface">
            Diagrama de Bloques • Arquitectura Modular DiffFlow EDO
          </h2>
        </div>
        <p className="text-sm text-on-surface-variant mb-6">
          Separación estricta entre la capa de presentación (React + KaTeX) y el motor simbólico propio (Parser, Clasificador y Solvers por método). El motor corre en un Web Worker, así la interfaz nunca se congela mientras calcula, y cada solución se verifica sustituyéndola en la EDO original.
        </p>

        {/* Diagrama SVG limpio */}
        <div className="bg-surface-container-low/60 border border-outline-variant rounded-xl p-4 overflow-x-auto">
          <svg viewBox="0 0 820 220" className="w-full min-w-[680px] h-auto font-sans">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5" />
              </marker>
            </defs>

            {/* Bloque 1: GUI */}
            <rect x="20" y="55" width="160" height="110" rx="10" fill="#ffffff" stroke="#3525cd" strokeWidth="2" />
            <text x="100" y="85" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#3525cd">1. Interfaz (GUI)</text>
            <text x="100" y="106" textAnchor="middle" fontSize="11" fill="#464555">React + Tailwind</text>
            <text x="100" y="124" textAnchor="middle" fontSize="11" fill="#464555">Modo Auto / Manual</text>
            <text x="100" y="142" textAnchor="middle" fontSize="11" fill="#006c49">Preview KaTeX</text>

            <line x1="180" y1="110" x2="225" y2="110" stroke="#4f46e5" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* Bloque 2: Parser */}
            <rect x="230" y="55" width="160" height="110" rx="10" fill="#ffffff" stroke="#c7c4d8" strokeWidth="2" />
            <text x="310" y="85" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0b1c30">2. Parser & Validador</text>
            <text x="310" y="106" textAnchor="middle" fontSize="11" fill="#464555">Normaliza y', y'', dy/dx</text>
            <text x="310" y="124" textAnchor="middle" fontSize="11" fill="#464555">Extrae M(x,y) y N(x,y)</text>
            <text x="310" y="142" textAnchor="middle" fontSize="11" fill="#ba1a1a">Control de Errores</text>

            <line x1="390" y1="110" x2="435" y2="110" stroke="#4f46e5" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* Bloque 3: Clasificador */}
            <rect x="440" y="25" width="165" height="75" rx="10" fill="#eff4ff" stroke="#3525cd" strokeWidth="1.5" />
            <text x="522" y="50" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#3525cd">3A. Clasificador (+15%)</text>
            <text x="522" y="68" textAnchor="middle" fontSize="10.5" fill="#464555">Detector por método con</text>
            <text x="522" y="83" textAnchor="middle" fontSize="10.5" fill="#464555">motivo (manual y auto)</text>

            {/* Bloque 3B: Solvers */}
            <rect x="440" y="120" width="165" height="75" rx="10" fill="#ffffff" stroke="#006c49" strokeWidth="2" />
            <text x="522" y="145" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#006c49">3B. Solvers por método</text>
            <text x="522" y="163" textAnchor="middle" fontSize="10.5" fill="#464555">Sustituciones y pasos</text>
            <text x="522" y="178" textAnchor="middle" fontSize="10.5" fill="#464555">(Usa CAS solo p/ ∫ y ∂)</text>

            <line x1="522" y1="100" x2="522" y2="117" stroke="#4f46e5" strokeWidth="2" markerEnd="url(#arrow)" />
            <line x1="605" y1="157" x2="645" y2="157" stroke="#4f46e5" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* Bloque 4: Trazabilidad */}
            <rect x="650" y="55" width="150" height="110" rx="10" fill="#ffffff" stroke="#006c49" strokeWidth="2" />
            <text x="725" y="85" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#006c49">4. Trazabilidad</text>
            <text x="725" y="106" textAnchor="middle" fontSize="11" fill="#464555">Stepper paso a paso</text>
            <text x="725" y="124" textAnchor="middle" fontSize="11" fill="#464555">Renderizado KaTeX</text>
            <text x="725" y="142" textAnchor="middle" fontSize="11" fill="#3525cd">Verificación + copiar LaTeX</text>
          </svg>
        </div>
      </div>

      {/* Manual Rápido de Usuario */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-secondary" />
          <h2 className="font-display text-lg font-bold text-on-surface">
            Manual de Usuario Rápido
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <h3 className="font-bold text-primary mb-1">1. Ingreso de Ecuación</h3>
            <p className="text-on-surface-variant">
              Usa <code className="font-mono text-xs bg-white px-1 rounded">y'</code> o <code className="font-mono text-xs bg-white px-1 rounded">dy/dx</code> para 1er orden, <code className="font-mono text-xs bg-white px-1 rounded">y''</code> y <code className="font-mono text-xs bg-white px-1 rounded">y'''</code> para orden superior, o la forma <code className="font-mono text-xs bg-white px-1 rounded">M*dx + N*dy = 0</code>. Indica multiplicaciones explícitas con <code className="font-mono text-xs bg-white px-1 rounded">*</code> (ej: <code className="font-mono text-xs">2*x*y</code>).
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <h3 className="font-bold text-primary mb-1">2. Modo Automático o Manual</h3>
            <p className="text-on-surface-variant">
              En <strong>Autoidentificación</strong>, el sistema detecta el método y activa la opción correspondiente. En <strong>Selección Manual</strong>, valida que la ecuación cumpla las reglas del método elegido.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <h3 className="font-bold text-primary mb-1">3. Trazabilidad Didáctica</h3>
            <p className="text-on-surface-variant">
              Consulta cada etapa intermedia (derivadas parciales, factores integrantes μ(x), sustituciones u = y^(1−n) o raíces características) formateadas en LaTeX.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}