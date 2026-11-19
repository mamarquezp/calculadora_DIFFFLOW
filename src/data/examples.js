/**
 * Ejemplos precargados (uno o más por cada método del curso).
 * Todos están verificados por scripts/test-engine.mjs.
 */
export const EXAMPLES = [
  { block: "A", title: "Variables Separables", badge: "g(x)dx = h(y)dy", ode: "dy/dx = (3*x^2 + 4*x - 4)/(2*y - 4)", method: "separable", hint: "Separación directa e integración" },
  { block: "A", title: "Homogénea", badge: "y = ux", ode: "(x^2 + y^2)*dx + (x^2 - x*y)*dy = 0", method: "homogenea1", hint: "M y N homogéneas de grado 2" },
  { block: "A", title: "Exacta", badge: "∂M/∂y = ∂N/∂x", ode: "(3*x^2*y + exp(y))*dx + (x^3 + x*exp(y) - 2*y)*dy = 0", method: "exacta", hint: "Función potencial f(x,y) = C" },
  { block: "A", title: "Reducible a Exacta", badge: "Factor μ(y)", ode: "6*x*y*dx + (4*y + 9*x^2)*dy = 0", method: "reducible_exacta", hint: "(Nₓ − M_y)/M = 2/y → μ = y²" },
  { block: "A", title: "Reducible a Exacta", badge: "Factor μ(x)", ode: "(3*x^2*y + 2*x*y + y^3)*dx + (x^2 + y^2)*dy = 0", method: "reducible_exacta", hint: "(M_y − Nₓ)/N = 3 → μ = e^{3x}" },
  { block: "A", title: "Lineal de Primer Orden", badge: "μ(x) = e^∫P dx", ode: "dy/dx + (2/x)*y = 4*x", method: "lineal1", hint: "Factor integrante μ = x²" },
  { block: "A", title: "Bernoulli", badge: "u = y^(1−n)", ode: "x*(dy/dx) + y = x^2 * y^2", method: "bernoulli", hint: "n = 2 → u = y⁻¹" },
  { block: "B", title: "Homogénea Coef. Constantes", badge: "Raíces reales", ode: "y'' - 5*y' + 6*y = 0", method: "orden_sup_hom", hint: "r = 2, r = 3" },
  { block: "B", title: "Homogénea Coef. Constantes", badge: "Raíces complejas", ode: "y'' + 4*y' + 7*y = 0", method: "orden_sup_hom", hint: "r = −2 ± √3 i" },
  { block: "B", title: "Homogénea Orden 3", badge: "Raíz repetida", ode: "y''' - 3*y'' + 3*y' - y = 0", method: "orden_sup_hom", hint: "r = 1 (multiplicidad 3)" },
  { block: "B", title: "No Homogénea", badge: "Coef. indeterminados", ode: "y'' - 2*y' - 3*y = 4*x - 5 + 6*x*exp(2*x)", method: "orden_sup_no_hom", hint: "Aniquilador D²(D − 2)²" },
  { block: "B", title: "No Homogénea", badge: "Variación de parámetros", ode: "y'' - 2*y' + y = exp(x)/x", method: "variacion_parametros", hint: "Wronskiano W = e^{2x}" },
  { block: "B", title: "Cauchy-Euler Homogénea", badge: "y = x^m", ode: "x^2*y'' - 2*x*y' - 4*y = 0", method: "cauchy_euler", hint: "m(m−1) − 2m − 4 = 0" },
  { block: "B", title: "Cauchy-Euler No Homogénea", badge: "y_c + y_p", ode: "x^2*y'' - 3*x*y' + 3*y = 2*x^4*exp(x)", method: "cauchy_euler", hint: "m = 1, 3 y variación de parámetros" },
];
