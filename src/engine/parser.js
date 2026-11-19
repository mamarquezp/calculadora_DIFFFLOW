import { CAS } from "./casHelper.js";

/**
 * parser.js — Valida y normaliza la entrada del usuario.
 *
 * Notación aceptada:
 *   y'  ó dy/dx      primera derivada
 *   y'' ó d2y/dx2    segunda derivada
 *   y'''             tercera derivada
 *   M*dx + N*dy = 0  forma diferencial
 *   '*' para multiplicar, '^' para potencias, exp(x) ó e^x, ln(x), sen/sin, cos, tan…
 *
 * Internamente las derivadas se representan con los símbolos Dy, Dyy, Dyyy.
 *
 * Devuelve:
 *   { form: 'differential', order: 1, M, N, F, latexPreview }
 *   { form: 'derivative',   order: 1|2|3, F, latexPreview }
 * donde F es la expresión "lado izquierdo − lado derecho" (F = 0).
 */

export const DERIV_SYMBOLS = ["Dyyy", "Dyy", "Dy"];
const ALLOWED_VARS = new Set(["x", "y", "Dy", "Dyy", "Dyyy", "dx", "dy"]);

function normalize(raw) {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[·×]/g, "*")
    .replace(/[−–]/g, "-")
    .replace(/’/g, "'")
    .replace(/y\s*\(\s*x\s*\)/g, "y") // y(x) → y
    .replace(/\bsen\s*\(/g, "sin(")
    .replace(/\btg\s*\(/g, "tan(")
    .replace(/\bln\s*\(/g, "log(")
    .replace(/\be\s*\^\s*\(/g, "exp(")
    .replace(/\be\s*\^\s*([a-zA-Z0-9_.]+)/g, "exp($1)")
    .replace(/d\^?3y\s*\/\s*dx\^?3/gi, "Dyyy")
    .replace(/d\^?2y\s*\/\s*dx\^?2/gi, "Dyy")
    .replace(/dy\s*\/\s*dx/gi, "Dy")
    .replace(/y\s*'''/g, "Dyyy")
    .replace(/y\s*''/g, "Dyy")
    .replace(/y\s*'/g, "Dy");
}

function checkParentheses(input) {
  let balance = 0;
  for (const ch of input) {
    if (ch === "(") balance++;
    if (ch === ")") balance--;
    if (balance < 0) throw new Error("Hay un paréntesis de cierre ')' sin su apertura '('.");
  }
  if (balance !== 0) throw new Error("Hay paréntesis sin cerrar en la ecuación.");
}

/** Devuelve la notación del usuario (y', y'') a partir de los símbolos internos. */
function denormalize(s) {
  return String(s).replace(/Dyyy/g, "y'''").replace(/Dyy/g, "y''").replace(/Dy/g, "y'");
}

function parseSide(side, label) {
  if (!side.trim()) throw new Error(`El lado ${label} del '=' está vacío.`);
  try {
    return CAS.str(side);
  } catch {
    throw new Error(
      `Error de sintaxis en el lado ${label}: "${denormalize(side.trim())}". Revisa que no falten operandos ni operadores y usa '*' para multiplicar (ej: 2*x*y).`
    );
  }
}

function checkVariables(expr) {
  const vars = CAS.variables(expr);
  const unknown = vars.filter((v) => !ALLOWED_VARS.has(v));
  if (unknown.length) {
    const v = denormalize(unknown[0]);
    let hint = "";
    if (/^[xy']{2,}$/.test(v) && /x/.test(v) && /y/.test(v)) {
      hint = ` ¿Quisiste decir ${v.replace(/x(?=y)/g, "x*").replace(/y(?=x)/g, "y*")}? Usa '*' para multiplicar.`;
    } else if (/^[a-z]+\(?$/i.test(v) && v.length > 1) {
      hint = " Si es una función, escríbela con paréntesis, p. ej. sin(x), exp(x), ln(x).";
    }
    throw new Error(
      `Símbolo no reconocido: "${v}". Solo se admiten x (variable independiente), y (dependiente) y sus derivadas.${hint}`
    );
  }
}

/** Vista previa LaTeX respetando el orden escrito por el usuario. */
function previewTeX(lhs, rhs) {
  const conv = (s) =>
    CAS.rawTeX(s)
      .replace(/\bDyyy\b/g, "y'''")
      .replace(/\bDyy\b/g, "y''")
      .replace(/\bDy\b/g, "y'")
      .replace(/\bdx\b/g, "\\,dx")
      .replace(/\bdy\b/g, "\\,dy");
  return `${conv(lhs)} = ${conv(rhs)}`;
}

export function parseODE(rawInput) {
  if (!rawInput || !rawInput.trim()) {
    throw new Error("Ingresa una ecuación diferencial.");
  }
  const input = normalize(rawInput);
  checkParentheses(input);

  const sides = input.split("=");
  if (sides.length !== 2) {
    throw new Error(
      sides.length === 1
        ? "La ecuación debe contener un signo igual (=). Ejemplo: y' + y = x^2"
        : "La ecuación solo debe tener un signo igual (=)."
    );
  }
  const [lhsRaw, rhsRaw] = sides;
  const lhs = parseSide(lhsRaw, "izquierdo");
  const rhs = parseSide(rhsRaw, "derecho");
  const F = CAS.expand(`(${lhs}) - (${rhs})`);
  checkVariables(F);

  const vars = new Set(CAS.variables(F));
  const latexPreview = previewTeX(lhsRaw, rhsRaw);

  // ----- Forma diferencial: M(x,y)dx + N(x,y)dy = 0 -----
  if (vars.has("dx") || vars.has("dy")) {
    if (!vars.has("dx") || !vars.has("dy")) {
      throw new Error("En forma diferencial debes incluir 'dx' y 'dy'. Ej: (2*x*y)*dx + (x^2)*dy = 0");
    }
    if (vars.has("Dy") || vars.has("Dyy") || vars.has("Dyyy")) {
      throw new Error("No mezcles la forma diferencial (dx, dy) con y' o dy/dx.");
    }
    const M = CAS.simplify(CAS.diff(F, "dx"));
    const N = CAS.simplify(CAS.diff(F, "dy"));
    const rest = CAS.sub(F, { dx: 0, dy: 0 });
    const linear = CAS.equal(F, `(${M})*dx + (${N})*dy`, ["x", "y", "dx", "dy"]);
    if (!linear || !CAS.isZero(rest, ["x", "y"])) {
      throw new Error(
        "La forma diferencial debe ser M(x,y)*dx + N(x,y)*dy = 0 (cada término multiplicado por dx o por dy)."
      );
    }
    if (CAS.isZero(N)) throw new Error("El coeficiente N(x,y) de dy no puede ser 0.");
    return { form: "differential", order: 1, M, N, F, raw: rawInput, latexPreview };
  }

  // ----- Forma con derivadas -----
  const order = vars.has("Dyyy") ? 3 : vars.has("Dyy") ? 2 : vars.has("Dy") ? 1 : 0;
  if (order === 0) {
    throw new Error("No se detectó ninguna derivada. Usa y', y'', y''' o dy/dx.");
  }
  return { form: "derivative", order, F, raw: rawInput, latexPreview };
}
