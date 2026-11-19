/** Comprueba que todo el LaTeX generado (solución + pasos) compile en KaTeX. */
import katex from "katex";
import { solveODE } from "../src/engine/index.js";
import { EXAMPLES } from "../src/data/examples.js";
let bad = 0;
const check = (label, tex) => {
  try { katex.renderToString(tex, { throwOnError: true, displayMode: true }); }
  catch (e) { bad++; console.log(`✘ ${label}\n   ${e.message}\n   ${tex}`); }
};
for (const ex of EXAMPLES) {
  for (const mode of ["auto", "manual"]) {
    const r = solveODE({ input: ex.ode, mode, method: ex.method });
    if (mode === "manual" && r.method !== ex.method) { bad++; console.log("método distinto", ex.ode); }
    if (!r.verification?.ok) { bad++; console.log("✘ verificación", ex.ode); }
    check(`${ex.ode} [solución]`, r.solution.generalSolutionLatex);
    check(`${ex.ode} [validez]`, r.solution.validity);
    r.solution.parts?.forEach((p) => check(`${ex.ode} [${p.label}]`, p.latex));
    r.solution.steps.forEach((s, i) => check(`${ex.ode} [paso ${i + 1}]`, s.latex));
    check(`${ex.ode} [preview]`, r.latexPreview);
  }
}
console.log(bad ? `${bad} problemas` : `LaTeX OK en los ${EXAMPLES.length} ejemplos (auto y manual)`);
process.exit(bad ? 1 : 0);
