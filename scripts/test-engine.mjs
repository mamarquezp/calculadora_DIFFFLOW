/**
 * Pruebas del motor: node scripts/test-engine.mjs
 * Para cada ecuación verifica: método autodetectado, que la solución
 * satisfaga la EDO (comprobación numérica) y el tiempo de cálculo.
 */
import { solveODE } from "../src/engine/index.js";

const CASES = [
  // [ecuación, método esperado (auto), métodos que también deben resolverse en manual]
  ["dy/dx = (3*x^2 + 4*x - 4)/(2*y - 4)", "separable"],
  ["y' = x*y", "separable"],
  ["dy/dx = exp(3*x + 2*y)", "separable"],
  ["(1 + x)*dy - y*dx = 0", "separable"],
  ["(3*x^2*y + exp(y))*dx + (x^3 + x*exp(y) - 2*y)*dy = 0", "exacta"],
  ["(2*x*y - 3*x^2)*dx + (x^2 + 2*y)*dy = 0", "exacta"],
  ["(cos(x)*sin(x) - x*y^2)*dx + y*(1 - x^2)*dy = 0", "exacta"],
  ["dy/dx + (2/x)*y = 4*x", "lineal1"],
  ["y' + 3*y = 6", "separable", ["lineal1"]],
  ["x*y' - 4*y = x^6*exp(x)", "lineal1"],
  ["y' + y = sin(x)", "lineal1"],
  ["(x^2 + y^2)*dx - 2*x*y*dy = 0", "homogenea1", ["bernoulli", "reducible_exacta"]],
  ["(x^2 + y^2)*dx + (x^2 - x*y)*dy = 0", "homogenea1"],
  ["x*y' = y + x", "lineal1", ["homogenea1"]],
  ["x*(dy/dx) + y = x^2 * y^2", "bernoulli"],
  ["y' + y = x*y^3", "bernoulli"],
  // ∫y²/(y³−1)dy no la resuelve Nerdamer: la autoidentificación pasa a Bernoulli
  ["x*y' + y = 1/y^2", "bernoulli"],
  ["y' = (y^2 - 1)/x", "separable"],
  ["(2*x*y^2 - 3*y^3)*dx + (7 - 3*x*y^2)*dy = 0", "reducible_exacta"],
  ["(x^2 + y^2 + x)*dx + x*y*dy = 0", "bernoulli", ["reducible_exacta"]],
  ["6*x*y*dx + (4*y + 9*x^2)*dy = 0", "reducible_exacta"],
  ["(3*x^2*y + 2*x*y + y^3)*dx + (x^2 + y^2)*dy = 0", "reducible_exacta"],
  ["x*y*dx + (2*x^2 + 3*y^2 - 20)*dy = 0", "reducible_exacta"],
  ["y'' - 5*y' + 6*y = 0", "orden_sup_hom"],
  ["y'' - 10*y' + 25*y = 0", "orden_sup_hom"],
  ["y'' + 4*y' + 7*y = 0", "orden_sup_hom"],
  ["y'' + 9*y = 0", "orden_sup_hom"],
  ["y'' + y' - 1*y = 0", "orden_sup_hom"],
  ["y''' - 6*y'' + 11*y' - 6*y = 0", "orden_sup_hom"],
  ["y''' + y = 0", "orden_sup_hom"],
  ["y''' - 3*y'' + 3*y' - y = 0", "orden_sup_hom"],
  ["y'' - 3*y' + 2*y = 4", "orden_sup_no_hom", ["variacion_parametros"]],
  ["y'' + 4*y' - 2*y = 2*x^2 - 3*x + 6", "orden_sup_no_hom"],
  ["y'' - y' + y = 2*sin(3*x)", "orden_sup_no_hom"],
  ["y'' - 2*y' - 3*y = 4*x - 5 + 6*x*exp(2*x)", "orden_sup_no_hom", ["variacion_parametros"]],
  ["y'' - 5*y' + 4*y = 8*exp(x)", "orden_sup_no_hom", ["variacion_parametros"]],
  ["y'' + 4*y = 3*sin(2*x)", "orden_sup_no_hom", ["variacion_parametros"]],
  ["y'' - 2*y' + y = exp(x)", "orden_sup_no_hom", ["variacion_parametros"]],
  ["y''' + y'' = exp(x)*cos(x)", "orden_sup_no_hom"],
  ["y'' + y = sec(x)", "variacion_parametros"],
  ["y'' - 4*y' + 4*y = (x + 1)*exp(2*x)", "orden_sup_no_hom", ["variacion_parametros"]],
  ["y'' - 2*y' + y = exp(x)/x", "variacion_parametros"],
  ["x^2*y'' - 2*x*y' - 4*y = 0", "cauchy_euler"],
  ["x^2*y'' + x*y' + 4*y = 0", "cauchy_euler"],
  ["x^2*y'' - 3*x*y' + 4*y = 0", "cauchy_euler"],
  ["4*x^2*y'' + 8*x*y' + y = 0", "cauchy_euler"],
  ["x^2*y'' - 3*x*y' + 3*y = 2*x^4*exp(x)", "cauchy_euler"],
  ["x^2*y'' - x*y' + y = 2*x", "cauchy_euler"],
  ["x^3*y''' + 5*x^2*y'' + 7*x*y' + 8*y = 0", "cauchy_euler"],
];

const ERRORS = [
  ["y' + = x", "sintaxis"],
  ["y'' + y", "sin ="],
  ["xy' + y = 0", "variable xy"],
  ["y' = x + (y", "paréntesis"],
  ["y'^2 + y = x", "no lineal en y'"],
  ["y''*y + y' = 0", "no lineal orden 2"],
];

let fail = 0;
for (const [ode, expected, alsoManual = []] of CASES) {
  const t0 = performance.now();
  let line;
  try {
    const r = solveODE({ input: ode, mode: "auto" });
    const ms = performance.now() - t0;
    const okMethod = r.method === expected;
    const okVer = r.verification?.ok === true;
    if (!okMethod || !okVer || ms > 4000) fail++;
    line = `${okMethod && okVer ? "✔" : "✘"} ${ode}\n     auto=${r.method}${okMethod ? "" : ` (esperado ${expected})`} verif=${r.verification ? (r.verification.ok ? "OK" : "FALLA " + r.verification.residual) : "n/a"} ${ms.toFixed(0)}ms\n     ${r.solution.generalSolutionLatex}`;
    for (const m of alsoManual) {
      try {
        const rm = solveODE({ input: ode, mode: "manual", method: m });
        const ok = rm.verification?.ok === true;
        if (!ok) fail++;
        line += `\n     [manual ${m}] ${ok ? "OK" : "FALLA"}: ${rm.solution.generalSolutionLatex}`;
      } catch (e) {
        fail++;
        line += `\n     [manual ${m}] ERROR: ${e.message}`;
      }
    }
  } catch (e) {
    fail++;
    line = `✘ ${ode}\n     ERROR: ${e.message}`;
  }
  console.log(line);
}
console.log("\n--- Entradas inválidas (deben dar error claro) ---");
for (const [ode, why] of ERRORS) {
  try {
    const r = solveODE({ input: ode, mode: "auto" });
    fail++;
    console.log(`✘ ${ode} (${why}) NO dio error → ${r.method}`);
  } catch (e) {
    console.log(`✔ ${ode} (${why}) → ${e.message}`);
  }
}
// Validación manual: método incompatible
try {
  solveODE({ input: "y'' - 5*y' + 6*y = 0", mode: "manual", method: "exacta" });
  fail++;
  console.log("✘ manual incompatible no dio error");
} catch (e) {
  console.log(`✔ manual incompatible → ${e.message}`);
}
console.log(`\n${fail === 0 ? "TODAS LAS PRUEBAS PASARON" : `${fail} FALLAS`}`);
process.exit(fail ? 1 : 0);
