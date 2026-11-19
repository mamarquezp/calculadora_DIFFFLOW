import { CAS } from "./casHelper";

/**
 * Normaliza la entrada del usuario a una estructura estándar manejable:
 * - Forma diferencial: { form: 'differential', M: '...', N: '...' }
 * - Forma derivada: { form: 'derivative', order: 1|2|3, rawNormalized: '...', lhs: '...', rhs: '...' }
 */
export function parseODE(rawInput) {
  if (!rawInput || !rawInput.trim()) {
    throw new Error("Por favor ingresa una ecuación diferencial.");
  }

  let input = rawInput.trim();

  if (!input.includes("=")) {
    throw new Error("La ecuación debe contener un signo igual (=). Ejemplo: dy/dx + y = x^2");
  }

  // Reemplazos amigables de notación matemática
  input = input
    .replace(/e\^\(([^)]+)\)/g, "exp($1)")
    .replace(/e\^([a-zA-Z0-9_]+)/g, "exp($1)")
    .replace(/ln\(/g, "log(")
    .replace(/y'''/g, "D3Y")
    .replace(/d3y\/dx3/gi, "D3Y")
    .replace(/y''/g, "D2Y")
    .replace(/d2y\/dx2/gi, "D2Y")
    .replace(/y'/g, "D1Y")
    .replace(/dy\/dx/gi, "D1Y");

  // Validar paréntesis balanceados
  let balance = 0;
  for (const ch of input) {
    if (ch === "(") balance++;
    if (ch === ")") balance--;
    if (balance < 0) throw new Error("Paréntesis de cierre ')' sin apertura correspondiente.");
  }
  if (balance !== 0) {
    throw new Error("Tienes paréntesis sin cerrar en la ecuación.");
  }

  // Detectar si está en forma diferencial M(x,y)dx + N(x,y)dy = 0
  const hasDx = /\bdx\b/i.test(input);
  const hasDy = /\bdy\b/i.test(input);

  if (hasDx || hasDy) {
    if (!hasDx || !hasDy) {
      throw new Error("En forma diferencial debes incluir tanto 'dx' como 'dy' (ej: (2*x*y)*dx + (x^2)*dy = 0).");
    }
    const [lhs, rhs] = input.split("=");
    // Mover todo a la izquierda: (lhs) - (rhs) = 0
    const fullExpr = `(${lhs}) - (${rhs})`;
    // Extraer M como coeficiente de dx y N como coeficiente de dy
    // Truco algebraico limpio: derivar parcialmente respecto a dx y dy tratándolos como símbolos
    const M = CAS.simplify(CAS.diff(fullExpr, "dx"));
    const N = CAS.simplify(CAS.diff(fullExpr, "dy"));

    if (M === "0" && N === "0") {
      throw new Error("No se pudieron identificar los términos M(x,y)dx y N(x,y)dy. Verifica usar '*' para multiplicar (ej: (x+y)*dx).");
    }

    return {
      form: "differential",
      order: 1,
      M,
      N,
      raw: rawInput,
      latexPreview: `\\left(${CAS.toTeX(M)}\\right)dx + \\left(${CAS.toTeX(N)}\\right)dy = 0`,
    };
  }

  // Forma con derivadas explícitas (D1Y, D2Y, D3Y)
  let order = 0;
  if (input.includes("D3Y")) order = 3;
  else if (input.includes("D2Y")) order = 2;
  else if (input.includes("D1Y")) order = 1;

  if (order === 0) {
    throw new Error("No se detectó ninguna derivada. Usa y', y'', y''' o dy/dx.");
  }

  const parts = input.split("=");
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
    throw new Error("Formato de igualdad inválido. Asegúrate de tener expresiones a ambos lados del '='.");
  }

  const exprZero = `(${parts[0]}) - (${parts[1]})`;

  // Construir vista previa LaTeX limpia
  const latexPreview = rawInput
    .replace(/d2y\/dx2/gi, "\\frac{d^2y}{dx^2}")
    .replace(/dy\/dx/gi, "\\frac{dy}{dx}")
    .replace(/\*/g, " \\cdot ");

  return {
    form: "derivative",
    order,
    lhs: parts[0].trim(),
    rhs: parts[1].trim(),
    exprZero,
    raw: rawInput,
    latexPreview,
  };
}