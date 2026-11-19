import React, { useEffect, useRef, useState } from "react";
import { Library, ChevronDown, X } from "lucide-react";
import { EXAMPLES } from "../data/examples";

/**
 * Menú desplegable de ejemplos de clase, filtrable por bloque.
 * Se cierra con clic afuera o con Escape. Elegir un ejemplo solo carga la ecuación.
 */
export default function ExamplesMenu({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [block, setBlock] = useState("all");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = EXAMPLES.filter((ex) => block === "all" || ex.block === block);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="h-9 inline-flex items-center gap-1.5 px-3 rounded-xl bg-primary-soft border border-primary/25 text-sm font-semibold text-primary hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
      >
        <Library className="w-4 h-4" />
        <span className="hidden sm:inline">Ejemplos</span>
        <span className="text-xs opacity-80">({EXAMPLES.length})</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="menu-surface absolute right-0 mt-2 w-[460px] max-w-[calc(100vw-1.5rem)] rounded-3xl p-4 z-50 df-fade-in">
          <div className="flex justify-between items-center mb-3">
            <span className="font-serif italic text-2xl">Ejemplos de clase</span>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-soft cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-soft border border-line text-xs mb-3">
            {[
              ["all", "Todos"],
              ["A", "Bloque A · 1er orden"],
              ["B", "Bloque B · Orden superior"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setBlock(key)}
                className={`flex-1 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                  block === key ? "bg-primary text-on-primary" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-[60vh] overflow-y-auto df-scroll space-y-2 pr-1">
            {list.map((ex) => (
              <button
                type="button"
                key={ex.ode}
                onClick={() => {
                  onSelect(ex);
                  setOpen(false);
                }}
                className="w-full text-left p-3 rounded-2xl well hover:border-primary hover:-translate-y-px transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center gap-2 mb-1.5">
                  <span className="text-sm font-bold text-ink flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        ex.block === "A" ? "bg-primary-soft text-block-a" : "bg-soft-2 text-block-b"
                      }`}
                    >
                      {ex.block}
                    </span>
                    {ex.title}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-soft border border-line text-muted whitespace-nowrap">{ex.badge}</span>
                </div>
                <div className="font-mono text-xs text-ink/90 break-all">{ex.ode}</div>
                <div className="text-xs text-muted mt-1">{ex.hint}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
