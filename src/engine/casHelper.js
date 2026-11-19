import nerdamer from "nerdamer";

/**
 * casHelper.js — Capa delgada sobre Nerdamer.
 *
 * Solo expone operaciones PRIMITIVAS de álgebra computacional (derivar, integrar,
 * sustituir, simplificar, convertir a LaTeX). Ninguna función de aquí resuelve
 * una EDO: la lógica de cada método vive en /solvers.
 *
 * Además incluye comprobaciones NUMÉRICAS (evaluar en puntos aleatorios) para
 * decidir igualdades como ∂M/∂y = ∂N/∂x. Son mucho más rápidas y robustas que
 * `simplify` de Nerdamer, que puede tardar minutos con expresiones como e^y.
 */

/** Las expresiones más largas que esto no se pasan por simplify (evita bloqueos). */
const MAX_SIMPLIFY_LEN = 140;

/** Puntos de muestreo: valores positivos para evitar log/sqrt de negativos. */
const SAMPLE_MIN = 0.55;
const SAMPLE_MAX = 2.35;

const fnCache = new Map();

function rand() {
  return SAMPLE_MIN + Math.random() * (SAMPLE_MAX - SAMPLE_MIN);
}

/** Separa una cadena en piezas al nivel 0 de paréntesis según un predicado. */
function splitTopLevel(str, isSep) {
  const parts = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && i > 0 && isSep(str, i)) {
      parts.push(str.slice(last, i));
      last = i;
    }
  }
  parts.push(str.slice(last));
  return parts.filter((p) => p.length > 0);
}

export const CAS = {
  /** Normaliza una expresión a la representación de Nerdamer. */
  str(expr) {
    return nerdamer(String(expr)).toString();
  },

  /** Simplifica sólo si la expresión es pequeña; devuelve la forma más corta. */
  simplify(expr) {
    const base = (() => {
      try {
        return this.str(expr);
      } catch {
        return String(expr);
      }
    })();
    if (base.length > MAX_SIMPLIFY_LEN) return base;
    let best = base;
    for (const op of ["simplify", "expand"]) {
      try {
        const s = nerdamer(`${op}(${base})`).toString();
        if (s.length < best.length) best = s;
      } catch {
        /* sigue con la mejor forma conocida */
      }
    }
    return best;
  },

  expand(expr) {
    try {
      return nerdamer(`expand(${expr})`).toString();
    } catch {
      return this.str(expr);
    }
  },

  factor(expr) {
    try {
      const s = this.str(expr);
      if (s.length > MAX_SIMPLIFY_LEN) return s;
      return nerdamer(`factor(${s})`).toString();
    } catch {
      return this.str(expr);
    }
  },

  diff(expr, variable = "x", times = 1) {
    let e = String(expr);
    for (let i = 0; i < times; i++) e = nerdamer(`diff(${e}, ${variable})`).toString();
    return e;
  },

  /**
   * Integral indefinida. Si Nerdamer no encuentra primitiva o devuelve números
   * imaginarios, se intenta con fracciones parciales. `ok` indica si quedó
   * una primitiva elemental.
   */
  integrate(expr, variable = "x") {
    const attempt = (e) => {
      try {
        return nerdamer(`integrate(${e}, ${variable})`).toString();
      } catch {
        return "integrate(error)";
      }
    };
    const isBad = (r) => r.includes("integrate(") || /(^|[^a-zA-Z_])i([^a-zA-Z_]|$)/.test(r);
    // Para funciones racionales se prueban formas equivalentes (simplificada, fracciones
    // parciales) y se queda la primitiva más corta. Con exponenciales/trig no se hace:
    // partfrac/simplify pueden tardar minutos en Nerdamer.
    const raw = this.str(expr);
    const isRational = raw.length < 200 && !/[a-z]/i.test(raw.replace(new RegExp(`\\b${variable}\\b`, "g"), ""));
    const forms = isRational
      ? [() => raw, () => this.simplify(raw), () => nerdamer(`partfrac(${this.simplify(raw)}, ${variable})`).toString()]
      : raw.length < 70
        ? [() => raw, () => this.simplify(raw)]
        : [() => raw];
    let best = null;
    let first = null;
    for (const form of forms) {
      let e;
      try {
        e = form();
      } catch {
        continue;
      }
      const r = attempt(e);
      if (first === null) first = r;
      if (!isBad(r) && (best === null || r.length < best.length)) best = r;
      if (best !== null && best.length < 60) break;
    }
    if (best === null && isRational) {
      // Respaldo: fracción racional normalizada (p. ej. 1/(y − y⁻²) = y²/(y³ − 1))
      try {
        const num = nerdamer(`numerator(${this.simplify(expr)})`).toString();
        const den = nerdamer(`denominator(${this.simplify(expr)})`).toString();
        const r = attempt(`(${this.expand(num)})/(${this.expand(den)})`);
        if (!isBad(r)) best = r;
      } catch {
        /* sin primitiva */
      }
    }
    return { result: best ?? first, ok: best !== null };
  },

  /** Integra y lanza un error claro si no hay primitiva elemental. */
  integrateStrict(expr, variable = "x") {
    const { result, ok } = this.integrate(expr, variable);
    if (!ok) {
      throw new Error(
        `La integral ∫(${expr}) d${variable} no tiene una primitiva elemental que el motor pueda calcular.`
      );
    }
    return result;
  },

  /** Sustituye variables: sub("x*y", { y: "u*x" }). */
  sub(expr, map) {
    let e = nerdamer(String(expr));
    for (const [k, v] of Object.entries(map)) e = e.sub(k, `(${v})`);
    return e.toString();
  },

  /** e^{∫P} con reglas de logaritmos: e^{k·ln(f)} = f^k. */
  expOf(intExpr) {
    const terms = this.terms(this.expand(intExpr));
    const factors = [];
    const rest = [];
    for (const t of terms) {
      const m = t.match(/log\(/);
      if (!m) {
        rest.push(t);
        continue;
      }
      // Reemplaza el log(...) por un símbolo L y comprueba que el término sea k·L
      const start = t.indexOf("log(");
      let depth = 0;
      let end = -1;
      for (let i = start + 3; i < t.length; i++) {
        if (t[i] === "(") depth++;
        else if (t[i] === ")") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      const arg = t.slice(start + 4, end);
      const withL = t.slice(0, start) + "LOGSYM" + t.slice(end + 1);
      try {
        const k = nerdamer(`diff(${withL}, LOGSYM)`).toString();
        const residual = nerdamer(`expand(${withL} - (${k})*LOGSYM)`).toString();
        if (!k.includes("LOGSYM") && !/[a-zA-Z]/.test(k.replace(/sqrt|pi/g, "")) && residual === "0") {
          factors.push(k === "1" ? `(${arg})` : `(${arg})^(${k})`);
          continue;
        }
      } catch {
        /* cae al caso general */
      }
      rest.push(t);
    }
    const parts = [...factors];
    if (rest.length) parts.push(`e^(${rest.join("+")})`);
    if (!parts.length) return "1";
    return this.simplify(parts.join("*"));
  },

  /** Términos sumados al nivel superior: "a+b-c" → ["a","+b","-c"]. */
  terms(expr) {
    const s = String(expr).replace(/\s+/g, "");
    return splitTopLevel(s, (str, i) => {
      const ch = str[i];
      if (ch !== "+" && ch !== "-") return false;
      const prev = str[i - 1];
      if (["^", "*", "/", "("].includes(prev)) return false;
      // notación científica 1e-7
      if ((prev === "e" || prev === "E") && /\de$/i.test(str.slice(0, i))) return false;
      return true;
    }).map((t) => (t.startsWith("+") ? t.slice(1) : t));
  },

  /** Factores multiplicativos al nivel superior: "a*(b)*c^-1" → ["a","(b)","c^-1"]. */
  factors(expr) {
    const s = String(expr).replace(/\s+/g, "");
    return splitTopLevel(s, (str, i) => str[i] === "*").map((f) => f.replace(/^\*/, ""));
  },

  /** Variables libres (sin constantes e, pi). */
  variables(expr) {
    return nerdamer(String(expr)).variables();
  },

  // ---------------------------------------------------------------------------
  // Evaluación numérica
  // ---------------------------------------------------------------------------

  /** Compila una expresión a función JS con el orden de variables dado. */
  fn(expr, vars) {
    const key = `${expr}|${vars.join(",")}`;
    if (fnCache.has(key)) return fnCache.get(key);
    let f;
    try {
      f = nerdamer(String(expr)).buildFunction(vars);
    } catch {
      f = () => NaN;
    }
    if (fnCache.size > 4000) fnCache.clear();
    fnCache.set(key, f);
    return f;
  },

  /** Evalúa en un punto { x: 1.2, y: 0.7 }. */
  evalAt(expr, point) {
    const vars = Object.keys(point);
    try {
      const v = this.fn(expr, vars)(...vars.map((k) => point[k]));
      return typeof v === "number" ? v : Number(v);
    } catch {
      return NaN;
    }
  },

  toNumber(expr) {
    try {
      const val = Number(nerdamer(String(expr)).evaluate().text("decimals"));
      return Number.isFinite(val) ? val : NaN;
    } catch {
      return NaN;
    }
  },

  /**
   * ¿a ≡ b? Se comprueba en varios puntos aleatorios con tolerancia relativa.
   * `vars` son las variables a muestrear; `extra` fija valores (opcional).
   */
  equal(a, b, vars = ["x", "y"], { samples = 8, tol = 1e-7, extra = {} } = {}) {
    let valid = 0;
    for (let i = 0; i < samples * 4 && valid < samples; i++) {
      const p = { ...extra };
      for (const v of vars) p[v] = rand();
      const va = this.evalAt(a, p);
      const vb = this.evalAt(b, p);
      if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
      valid++;
      if (Math.abs(va - vb) > tol * Math.max(1, Math.abs(va), Math.abs(vb))) return false;
    }
    return valid >= 3;
  },

  isZero(expr, vars = ["x", "y"], opts) {
    return this.equal(expr, "0", vars, opts);
  },

  /** ¿La expresión depende (numéricamente) de la variable `v`? */
  dependsOn(expr, v, vars = ["x", "y"]) {
    const others = vars.filter((w) => w !== v);
    let valid = 0;
    for (let i = 0; i < 40 && valid < 8; i++) {
      const p = {};
      for (const w of others) p[w] = rand();
      const p1 = { ...p, [v]: rand() };
      const p2 = { ...p, [v]: rand() };
      const a = this.evalAt(expr, p1);
      const b = this.evalAt(expr, p2);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      valid++;
      if (Math.abs(a - b) > 1e-7 * Math.max(1, Math.abs(a), Math.abs(b))) return true;
    }
    return valid < 3; // si no se pudo evaluar, por seguridad se asume que sí depende
  },

  /** Si `expr` no depende de `v`, devuelve la expresión sin `v` (sustituye v=1). */
  eliminate(expr, v) {
    const s = this.str(expr);
    if (!new RegExp(`(^|[^a-zA-Z_])${v}([^a-zA-Z_]|$)`).test(s)) return this.simplify(s);
    for (const val of ["1", "2", "3"]) {
      try {
        const r = this.simplify(this.sub(s, { [v]: val }));
        if (Number.isFinite(this.evalAt(r, { x: 1.37, y: 1.61, u: 1.13 }))) return r;
      } catch {
        /* probar con otro valor (p. ej. evita 0/0 en v = 1) */
      }
    }
    return s;
  },

  // ---------------------------------------------------------------------------
  // Presentación
  // ---------------------------------------------------------------------------

  /** Convierte a LaTeX y limpia la notación (ln, multiplicación implícita, C₁). */
  tex(expr) {
    if (expr === undefined || expr === null || expr === "") return "";
    let t;
    try {
      t = nerdamer(String(expr)).toTeX();
    } catch {
      return String(expr);
    }
    return this.cleanTeX(t);
  },

  cleanTeX(t) {
    return String(t)
      .replace(/\\mathrm\{log\}/g, "\\ln")
      .replace(/\\mathrm\{(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh)\}/g, "\\$1")
      .replace(/\\exp\\left\(([^()]*)\\right\)/g, "e^{$1}")
      .replace(/(\d) \\cdot (\d)/g, "$1 \\times $2")
      .replace(/ \\cdot /g, " ")
      .replace(/\bC([0-9])\b/g, "C_{$1}")
      .replace(/C_\{\{([0-9])\}\}/g, "C_{$1}")
      .replace(/\bLOGX\b/g, "\\ln x");
  },

  /** Raw → LaTeX sin evaluar (respeta el orden que escribió el usuario). */
  rawTeX(expr) {
    try {
      return this.cleanTeX(nerdamer.convertToLaTeX(String(expr)));
    } catch {
      return String(expr);
    }
  },

  splitTopLevel,
};

/** Convierte un número a fracción "p/q" si es racional sencillo (denominador ≤ maxDen). */
export function rationalize(value, maxDen = 2000, tol = 1e-9) {
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value - Math.round(value)) < tol) return { p: Math.round(value), q: 1 };
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1;
  let b = value;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(b);
    [h1, h0] = [a * h1 + h0, h1];
    [k1, k0] = [a * k1 + k0, k1];
    if (k1 > maxDen) break;
    if (Math.abs(value - h1 / k1) < tol * Math.max(1, Math.abs(value))) return { p: h1, q: k1 };
    const frac = b - a;
    if (frac < 1e-15) break;
    b = 1 / frac;
  }
  return null;
}

/** Número → cadena exacta si es racional, si no decimal con 6 cifras. */
export function numToExpr(value) {
  const r = rationalize(value);
  if (r) return r.q === 1 ? String(r.p) : `(${r.p}/${r.q})`;
  return String(Number(value.toPrecision(8)));
}

/** Número → LaTeX (fracciones con \frac). */
export function numToTeX(value) {
  const r = rationalize(value);
  if (r) {
    if (r.q === 1) return String(r.p);
    const sign = r.p < 0 ? "-" : "";
    return `${sign}\\frac{${Math.abs(r.p)}}{${r.q}}`;
  }
  return String(Number(value.toPrecision(6)));
}
