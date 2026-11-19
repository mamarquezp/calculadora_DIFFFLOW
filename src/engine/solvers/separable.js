import { CAS } from "../casHelper.js";
import { step, paren } from "./helpers.js";

/**
 * Variables separables:  dy/dx = g(x)·h(y)
 *   1. Identificar g(x) y h(y)
 *   2. Separar:  dy / h(y) = g(x) dx
 *   3. Integrar ambos lados:  ∫ dy/h(y) = ∫ g(x) dx + C
 */

/** Detecta si f(x,y) = g(x)·h(y) comprobando f(x,y)·f(x₀,y₀) = f(x,y₀)·f(x₀,y). */
export function isSeparable(f) {
  for (const [x0, y0] of [["1", "1"], ["2", "2"], ["1", "3"], ["3", "0.5"]]) {
    const f00 = CAS.evalAt(f, { x: Number(x0), y: Number(y0) });
    if (!Number.isFinite(f00) || Math.abs(f00) < 1e-9) continue;
    const lhs = `(${f})*(${CAS.sub(f, { x: x0, y: y0 })})`;
    const rhs = `(${CAS.sub(f, { y: y0 })})*(${CAS.sub(f, { x: x0 })})`;
    return CAS.equal(lhs, rhs, ["x", "y"]);
  }
  // f ≡ 0 en esos puntos: y' = 0 es separable trivial
  return CAS.isZero(f);
}

/** Separa f en g(x)·h(y) de forma simbólica. */
export function splitSeparable(f) {
  const candidates = [CAS.factor(f), CAS.str(f), CAS.simplify(f)];
  for (const cand of candidates) {
    const xs = [];
    const ys = [];
    let bad = false;
    for (const fac of CAS.factors(cand)) {
      const dx = CAS.dependsOn(fac, "x");
      const dy = CAS.dependsOn(fac, "y");
      if (dx && dy) {
        bad = true;
        break;
      }
      (dy ? ys : xs).push(fac);
    }
    if (!bad) {
      const g = CAS.simplify(xs.join("*") || "1");
      const h = CAS.simplify(ys.join("*") || "1");
      if (CAS.equal(`(${g})*(${h})`, f)) return { g, h };
    }
  }
  // Respaldo: g(x) = f(x, y₀), h(y) = f(x₀, y) / f(x₀, y₀)
  for (const [x0, y0] of [["1", "1"], ["2", "2"], ["1", "2"]]) {
    const f00 = CAS.evalAt(f, { x: Number(x0), y: Number(y0) });
    if (!Number.isFinite(f00) || Math.abs(f00) < 1e-9) continue;
    const g = CAS.simplify(CAS.sub(f, { y: y0 }));
    const h = CAS.simplify(`(${CAS.sub(f, { x: x0 })})/(${CAS.simplify(CAS.sub(f, { x: x0, y: y0 }))})`);
    return { g, h };
  }
  throw new Error("No fue posible separar f(x,y) en g(x)·h(y).");
}

export function solveSeparable(fo, parsed) {
  const { f } = fo;
  const { g, h } = splitSeparable(f);
  const invH = CAS.simplify(`1/(${h})`);
  const Iy = CAS.integrateStrict(invH, "y");
  const Ix = CAS.integrateStrict(g, "x");

  const steps = [];
  if (parsed.form === "differential") {
    steps.push(
      step(
        "Paso 0: Escribir como dy/dx = f(x,y)",
        "Despeje",
        "A partir de M dx + N dy = 0 despejamos dy/dx = −M/N:",
        `\\frac{dy}{dx} = -\\frac{${CAS.tex(fo.M)}}{${CAS.tex(fo.N)}} = ${CAS.tex(f)}`
      )
    );
  }
  steps.push(
    step(
      "Paso 1: Identificar g(x) y h(y)",
      "Factorización",
      "Factorizamos el lado derecho como producto de una función solo de x y otra solo de y:",
      `\\frac{dy}{dx} = \\underbrace{${paren(CAS.tex(g))}}_{g(x)}\\cdot\\underbrace{${paren(CAS.tex(h))}}_{h(y)}`,
      `g(x) = ${g}   |   h(y) = ${h}`
    ),
    step(
      "Paso 2: Separar las variables",
      "Separación",
      "Pasamos todo lo que depende de y junto a dy y todo lo que depende de x junto a dx:",
      `${paren(CAS.tex(invH))}\\,dy = ${paren(CAS.tex(g))}\\,dx`,
      "Se supone h(y) ≠ 0 (las raíces de h(y) dan soluciones constantes)"
    ),
    step(
      "Paso 3: Integrar ambos lados",
      "Integración",
      "Integramos cada miembro respecto a su propia variable y agregamos una constante C:",
      `\\int ${paren(CAS.tex(invH))}\\,dy = \\int ${paren(CAS.tex(g))}\\,dx \\;\\Longrightarrow\\; ${CAS.tex(Iy)} = ${CAS.tex(Ix)} + C`,
      "Solución general (implícita)"
    )
  );

  let generalSolutionLatex = `${CAS.tex(Iy)} = ${CAS.tex(Ix)} + C`;
  // Caso frecuente: ∫dy/y = ln y  →  y = C e^{∫g}
  if (CAS.equal(Iy, "log(y)", ["y"])) {
    const eIx = CAS.expOf(Ix);
    const yExp = `C\\,${paren(CAS.tex(eIx))}`;
    generalSolutionLatex = `y = ${yExp}`;
    steps.push(
      step(
        "Paso 4: Despejar y",
        "Forma explícita",
        "Aplicamos exponencial en ambos lados y renombramos e^C como C:",
        `\\ln y = ${CAS.tex(Ix)} + C \\;\\Longrightarrow\\; y = ${yExp}`
      )
    );
  }

  return {
    methodTitle: "Variables Separables",
    block: "Bloque A • Primer Orden",
    generalSolutionLatex,
    validity: "h(y) \\neq 0",
    steps,
    check: { kind: "implicit", G: `(${Iy}) - (${Ix})` },
  };
}
