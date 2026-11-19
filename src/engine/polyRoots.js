import { rationalize } from "./casHelper.js";

/**
 * polyRoots.js — Raíces EXACTAS de la ecuación característica/auxiliar.
 *
 * 1. Teorema de la raíz racional (±p/q) + división sintética.
 * 2. Cuadrática restante con la fórmula general (radicales simplificados).
 * 3. Si un cúbico no tiene raíces racionales, se usa aproximación numérica.
 *
 * Cada raíz: { re, im, mult, reTeX, imTeX, reExpr, imExpr, texList }
 *   - Para pares complejos se guarda una sola entrada con im > 0 (α ± βi).
 */

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

/** Fracción p/q → LaTeX */
function fracTeX(p, q) {
  if (q < 0) [p, q] = [-p, -q];
  const g = gcd(Math.abs(p), q) || 1;
  p /= g;
  q /= g;
  if (q === 1) return String(p);
  return `${p < 0 ? "-" : ""}\\frac{${Math.abs(p)}}{${q}}`;
}
function fracExpr(p, q) {
  if (q < 0) [p, q] = [-p, -q];
  const g = gcd(Math.abs(p), q) || 1;
  p /= g;
  q /= g;
  return q === 1 ? String(p) : `(${p}/${q})`;
}

/** √n = k·√s con s libre de cuadrados */
function simplifySqrt(n) {
  let k = 1;
  let s = n;
  for (let d = 2; d * d <= s; d++) {
    while (s % (d * d) === 0) {
      s /= d * d;
      k *= d;
    }
  }
  return { k, s };
}

/** Convierte coeficientes reales a enteros (si son racionales). */
function toIntegerCoeffs(coeffs) {
  const fr = coeffs.map((c) => rationalize(c, 1000));
  if (fr.some((f) => f === null)) return null;
  const L = fr.reduce((acc, f) => lcm(acc, f.q), 1);
  return fr.map((f) => (f.p * L) / f.q);
}

function evalPoly(c, x) {
  // c[k] es el coeficiente de x^k
  return c.reduceRight((acc, ck) => acc * x + ck, 0);
}

function divisors(n) {
  n = Math.abs(n);
  const out = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d);
  return out;
}

/** Divide el polinomio (coef. ascendentes) entre (x − p/q) — exacto con enteros escalados. */
function syntheticDivide(c, p, q) {
  // c(x) = (q x − p)·b(x)  ; trabajamos en orden descendente
  const desc = [...c].reverse();
  const out = [];
  let carry = 0;
  for (let i = 0; i < desc.length - 1; i++) {
    const val = (desc[i] + carry) / q;
    out.push(val);
    carry = val * p;
  }
  return out.reverse();
}

/**
 * @param {number[]} coeffs coeficientes en orden ascendente [c0, c1, …, cn]
 */
export function polyRoots(coeffs) {
  let c = [...coeffs];
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-14) c.pop();
  const roots = [];
  const ints = toIntegerCoeffs(c);

  if (ints) {
    c = ints;
    // Raíz cero
    while (c.length > 1 && c[0] === 0) {
      addRoot(roots, { re: 0, im: 0, reTeX: "0", reExpr: "0" });
      c = c.slice(1);
    }
    // Raíces racionales
    let found = true;
    while (c.length > 3 && found) {
      found = false;
      const lead = c[c.length - 1];
      const cand = [];
      for (const p of divisors(c[0])) for (const q of divisors(lead)) cand.push([p, q], [-p, q]);
      for (const [p, q] of cand) {
        if (Math.abs(evalPoly(c, p / q)) < 1e-9) {
          addRoot(roots, { re: p / q, im: 0, reTeX: fracTeX(p, q), reExpr: fracExpr(p, q) });
          c = syntheticDivide(c, p, q).map((v) => Math.round(v * 1e9) / 1e9);
          found = true;
          break;
        }
      }
    }
    if (c.length === 3 && c.every(Number.isInteger)) {
      quadraticExact(c[2], c[1], c[0]).forEach((r) => addRoot(roots, r));
      return roots;
    }
    if (c.length === 2) {
      addRoot(roots, { re: -c[0] / c[1], im: 0, reTeX: fracTeX(-c[0], c[1]), reExpr: fracExpr(-c[0], c[1]) });
      return roots;
    }
  }
  // Respaldo numérico (Durand–Kerner)
  numericRoots(c).forEach((r) => addRoot(roots, r));
  return roots;
}

function addRoot(list, r) {
  const ex = list.find((o) => Math.abs(o.re - r.re) < 1e-7 && Math.abs(o.im - (r.im || 0)) < 1e-7);
  if (ex) ex.mult += 1;
  else list.push({ im: 0, imTeX: "0", imExpr: "0", ...r, mult: 1 });
}

/** a r² + b r + c = 0 con enteros → raíces exactas */
function quadraticExact(a, b, c) {
  const D = b * b - 4 * a * c;
  if (D === 0) {
    const r = { re: -b / (2 * a), im: 0, reTeX: fracTeX(-b, 2 * a), reExpr: fracExpr(-b, 2 * a) };
    return [r, { ...r }];
  }
  const { k, s } = simplifySqrt(Math.abs(D));
  const re = -b / (2 * a);
  const reTeX = fracTeX(-b, 2 * a);
  const reExpr = fracExpr(-b, 2 * a);
  const den = 2 * Math.abs(a);
  const g = gcd(k, den);
  const kk = k / g;
  const dd = den / g;
  const coefSqrt = `${kk === 1 ? "" : kk}\\sqrt{${s}}`;
  const surdTeX = s === 1 ? fracTeX(kk, dd) : dd === 1 ? coefSqrt : `\\frac{${coefSqrt}}{${dd}}`;
  const surdExpr = s === 1 ? fracExpr(kk, dd) : `(${kk}/${dd})*sqrt(${s})`;
  const surdVal = (k * Math.sqrt(s)) / den;

  if (D > 0) {
    if (s === 1) {
      // raíces racionales
      const r1 = re + surdVal;
      const r2 = re - surdVal;
      return [r1, r2].map((r) => {
        const fr = rationalize(r);
        return { re: r, im: 0, reTeX: fracTeX(fr.p, fr.q), reExpr: fracExpr(fr.p, fr.q) };
      });
    }
    const join = (sign) => ({
      re: re + sign * surdVal,
      im: 0,
      reTeX: `${re === 0 ? (sign < 0 ? "-" : "") : `${reTeX} ${sign < 0 ? "-" : "+"} `}${surdTeX}`,
      reExpr: `${reExpr}${sign < 0 ? "-" : "+"}${surdExpr}`,
    });
    return [join(1), join(-1)];
  }
  // Complejas conjugadas α ± βi
  return [{ re, im: surdVal, reTeX, reExpr, imTeX: surdTeX, imExpr: surdExpr }];
}

/** Durand–Kerner para polinomios sin raíces racionales. */
function numericRoots(c) {
  const n = c.length - 1;
  const lead = c[n];
  const a = c.map((v) => v / lead);
  let z = Array.from({ length: n }, (_, i) => ({ re: Math.cos((2 * Math.PI * i) / n + 0.4) * 0.9, im: Math.sin((2 * Math.PI * i) / n + 0.4) * 0.9 }));
  const mul = (p, q) => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re });
  const sub = (p, q) => ({ re: p.re - q.re, im: p.im - q.im });
  const div = (p, q) => {
    const d = q.re * q.re + q.im * q.im;
    return { re: (p.re * q.re + p.im * q.im) / d, im: (p.im * q.re - p.re * q.im) / d };
  };
  const ev = (x) => a.reduceRight((acc, ak) => ({ re: acc.re * x.re - acc.im * x.im + ak, im: acc.re * x.im + acc.im * x.re }), { re: 0, im: 0 });
  for (let it = 0; it < 500; it++) {
    z = z.map((zi, i) => {
      let den = { re: 1, im: 0 };
      z.forEach((zj, j) => {
        if (j !== i) den = mul(den, sub(zi, zj));
      });
      return sub(zi, div(ev(zi), den));
    });
  }
  const fmt = (v) => String(Number(v.toFixed(4)));
  const out = [];
  for (const r of z) {
    if (Math.abs(r.im) < 1e-7) out.push({ re: r.re, im: 0, reTeX: fmt(r.re), reExpr: fmt(r.re) });
    else if (r.im > 0) out.push({ re: r.re, im: r.im, reTeX: fmt(r.re), reExpr: fmt(r.re), imTeX: fmt(r.im), imExpr: fmt(r.im) });
  }
  return out;
}

/** Lista legible de raíces en LaTeX: r₁ = 2, r₂ = 3 … ó α ± βi */
export function rootsTeX(roots, name = "r") {
  const items = [];
  let i = 1;
  for (const r of roots) {
    if (r.im === 0) {
      for (let k = 0; k < r.mult; k++) items.push(`${name}_{${i++}} = ${r.reTeX}`);
    } else {
      const imPart = r.imTeX === "1" ? "" : r.imTeX;
      const reP = r.re === 0 ? "" : `${r.reTeX} `;
      for (let k = 0; k < r.mult; k++) {
        items.push(`${name}_{${i},${i + 1}} = ${reP}\\pm ${imPart}i`);
        i += 2;
      }
    }
  }
  return items.join(",\\quad ");
}

/** Clasificación textual del tipo de raíces */
export function rootsKind(roots) {
  if (roots.some((r) => r.im !== 0)) return "Raíces complejas conjugadas (α ± βi)";
  if (roots.some((r) => r.mult > 1)) return "Raíces reales repetidas";
  return "Raíces reales distintas";
}
