# DiffFlow EDO — Calculadora de Ecuaciones Diferenciales Ordinarias

Calculadora con interfaz gráfica que resuelve EDO de forma **analítica** y muestra el **paso a paso** de cada método visto en clase.

## Ejecutar

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas del motor (≈50 ecuaciones) + validación del LaTeX
npm run build    # versión de producción en dist/
```

## Métodos implementados

| Bloque | Método | Detalles del paso a paso |
|---|---|---|
| A | Variables separables | g(x), h(y), separación e integración |
| A | Homogéneas | prueba f(tx,ty), sustitución y = ux (o x = vy) |
| A | Exactas | ∂M/∂y, ∂N/∂x, función potencial f(x,y) = C |
| A | Reducibles a exactas | (M_y − N_x)/N ó (N_x − M_y)/M, factor μ(x) ó μ(y) |
| A | Lineales | forma estándar, μ(x) = e^∫P dx |
| A | Bernoulli | n, u = y^(1−n), ecuación lineal en u |
| B | Homogéneas coef. constantes (orden 2 y 3) | ecuación característica, raíces reales/repetidas/complejas, y_c |
| B | No homogéneas — coeficientes indeterminados | aniquilador, propuesta de y_p (regla x^s), coeficientes, y = y_c + y_p |
| B | No homogéneas — variación de parámetros | Wronskiano, u_k', u_k, y_p |
| B | Cauchy-Euler (homogénea y no homogénea) | y = x^m, ecuación auxiliar, y_c; y_p por variación de parámetros |

## Sintaxis de entrada

- Derivadas: `y'`, `y''`, `y'''` o `dy/dx`, `d2y/dx2`
- Forma diferencial: `(2*x*y)*dx + (x^2 + 1)*dy = 0`
- Multiplicación explícita con `*`, potencias con `^`
- Funciones: `exp(x)` ó `e^x`, `ln(x)`, `sin(x)`/`sen(x)`, `cos(x)`, `tan(x)`, `sqrt(x)`

## Modos

- **Manual**: se elige el método en el menú desplegable. El menú marca con ✓/✗ qué métodos son compatibles y explica por qué; si se resuelve con un método que no aplica, se muestra una alerta con el motivo y una sugerencia.
- **Automático (autoidentificación)**: el clasificador detecta el método (Bloques A y B), lo activa en el menú y muestra la solución.

## Arquitectura

```
src/
├── App.jsx                     Interfaz (React + Tailwind)
├── components/                 MathBlock (KaTeX), SolutionView, LoadingPanel, DocsSection
├── data/examples.js            Ejemplos de clase
├── services/solverClient.js    Comunicación con el Web Worker (tiempo límite y cancelación)
└── engine/                     Motor matemático (sin dependencias de la interfaz)
    ├── parser.js               Validación y normalización de la entrada
    ├── analysis.js             Extrae M, N, f(x,y) o los coeficientes a_k(x) y g(x)
    ├── classifier.js           Detector por método (+ motivo) y autoidentificación
    ├── polyRoots.js            Raíces exactas de la ecuación característica/auxiliar
    ├── solvers/                Un archivo por método, cada uno programa sus pasos
    ├── verify.js               Comprueba la solución sustituyéndola en la EDO
    ├── casHelper.js            Operaciones primitivas (derivar, integrar, sustituir, LaTeX)
    ├── index.js                parse → classify → solve → verify
    └── solver.worker.js        Ejecuta el motor fuera del hilo de la interfaz
```

Nerdamer se usa **solo** para operaciones primitivas (derivadas, integrales, sustituciones y conversión a LaTeX). Ninguna función resuelve la EDO completa: la clasificación, la selección del método y cada paso están programados en `engine/`.

El motor corre en un **Web Worker**, así la página no se congela mientras calcula, y se muestra una animación de carga hasta que llega el resultado.
