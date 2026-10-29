# NEXT STEP · HCA Bachillerato

Taller interactivo para que estudiantes de Bachillerato aprendan, en equipo, cómo se arma un currículum y qué pasa en una entrevista de trabajo. Funciona en cualquier navegador (computadora, tablet o celular), sin instalar nada y sin conexión a servidores.

## Qué incluye

| Nivel | Qué hacen los estudiantes | Qué aprenden |
|---|---|---|
| **Inicio** | Ponen nombre al equipo y leen la consigna y los objetivos. | Cómo trabajar la actividad en grupo. |
| **1 · Armá tu CV** | Eligen entre dos versiones (A/B) de cada bloque del CV de María (primer empleo) o Juan (con experiencia), lo ordenan y piden la revisión de RRHH. Cada bloque tiene una *pista* en forma de pregunta guía. | Distinguir información relevante de innecesaria; describir con hechos concretos. |
| **2 · Entrevista simulada** | Acompañan a María en 15 escenas con tres respuestas posibles. Pueden ver la devolución escena por escena o al final. Atajos de teclado A/B/C y Enter. | Qué transmite cada respuesta; la entrevista también es para preguntar. |
| **Resultados** | Nivel alcanzado, cantidad de respuestas más adecuadas / según el contexto / para repensar, y revisión guiada. | Reflexionar sin "respuesta única". |
| **Tablero final** | Puntajes de CV y entrevista, gráfico por escena, lista de errores con la explicación de RRHH y próximos pasos. Se puede imprimir. | Base para la puesta en común. |
| **3 · Recursos** | Guías cortas, buscador, filtros por categoría y checklist. Se imprime o guarda como PDF. | Material para llevarse. |
| **Modo RRHH** (engranaje) | Panel de facilitadoras: editar todos los textos, puntuaciones, pistas, recursos, dinámica, colores, logo e ilustración. Exportar/importar JSON. | — |

El avance del equipo (CV, respuestas, nombre) se guarda automáticamente en el navegador: si se cierra la pestaña, se retoma donde estaba. Desde **Modo RRHH → Dinámica** se puede borrar para que el siguiente grupo empiece de cero.

## Cómo usarlo con estudiantes

**Opción A · Publicarlo en internet (recomendada).** El repositorio está listo para GitHub Pages:

1. En GitHub: *Settings → Pages → Build and deployment → Source: Deploy from a branch*.
2. Elegir la rama `main` y la carpeta `/ (root)`. Guardar.
3. En unos minutos queda disponible en `https://<usuario>.github.io/<repositorio>/`. Compartir ese enlace (o un código QR) con los equipos.

El taller está publicado en **https://martinferreirahca.github.io/RRHH/**. Atención: GitHub Pages distingue mayúsculas en la ruta, así que `/rrhh/` en minúsculas da error 404. Para evitarlo, compartir el enlace tocable o el código QR de `docs/qr-next-step.png` (la página `docs/enlace.html` los muestra juntos, lista para proyectar o imprimir). Si se renombra el repositorio a `rrhh` en minúsculas (Settings → General → Repository name), la dirección pasa a ser `https://martinferreirahca.github.io/rrhh/` y hay que regenerar el QR.

**Opción B · Un solo archivo.** `dist/next-step.html` es la versión autónoma: se puede enviar por correo, Drive o pendrive y abrir con doble clic. Después de editar cualquier archivo, regenerarlo con:

```bash
node build.js
```

## Cómo editar el contenido

**Desde la app (sin tocar código).** Abrir *Modo RRHH* (icono de engranaje). Todo se edita en pantalla y se guarda en ese navegador. Para compartir los cambios con el equipo o publicarlos:

1. *Modo RRHH → Guardar y compartir → Exportar JSON*.
2. Abrir `assets/data.js` y reemplazar el objeto que sigue a `window.NEXTSTEP_SEED =` por el contenido del JSON exportado (dejar el `;` final).
3. Si se usa la versión de un solo archivo, correr `node build.js`.

**Desde los archivos.** El contenido vive en `assets/data.js`:

- `profiles.maria` / `profiles.juan`: bloques del CV. Cada bloque tiene `category`, `a`, `b`, `best` (A o B), `tip` (explicación de RRHH) y `hint` (pregunta guía que ven antes de decidir).
- `scenes`: escenas de la entrevista. `scores` (1 a 4) define los colores: el máximo es verde, el mínimo rojo, el resto naranja. `feedback` es la devolución de cada opción y `notes` la pregunta para conversar.
- `resources`: tarjetas del Nivel 3 (`category` es CV, Entrevista o Herramientas; `url` solo HTTPS).
- `settings`: `showHints` (mostrar pistas en el CV) y `revealPerScene` (permitir ver la devolución escena por escena).
- `palette`, `title`, `subtitle`, `logo`, `art`: identidad visual.

## Estructura del proyecto

```
index.html          Pantallas (inicio, CV, entrevista, resultados, tablero, recursos, Modo RRHH)
assets/styles.css   Estilos. Colores en variables CSS; responsive desde 320 px; estilos de impresión
assets/app.js       Lógica, comentada por secciones
assets/data.js      Contenido inicial (editable)
assets/logo.png     Logo HCA Bachillerato
assets/scene.svg    Ilustración de la entrevista
build.js            Genera dist/next-step.html (un solo archivo)
dist/next-step.html Versión autónoma para compartir
```

No hay dependencias ni paso de compilación: se abre `index.html` y listo. Para el script de empaquetado hace falta Node.js (cualquier versión reciente).

## Guion sugerido para el taller (≈ 80 min)

1. **Apertura (10 min).** Equipos de 3 o 4. Cada uno abre el enlace, escribe su nombre de equipo y lee *¿Cómo funciona?*.
2. **Nivel 1 (25 min).** Arman el CV de María. Se los invita a leer la pista de cada bloque antes de votar. Al terminar piden *Revisar con RRHH* y anotan dos coincidencias y dos diferencias. Opcional: repetir con Juan para comparar perfiles.
3. **Nivel 2 (25 min).** Hacen la entrevista. Sugerencia: la devolución escena por escena solo después de votar; si se quiere más tensión, desactivarla en *Modo RRHH → Dinámica* para que aparezca al final.
4. **Puesta en común (15 min).** Cada equipo abre su *Tablero final* y comparte una decisión "para repasar" y qué cambiaría. Las facilitadoras usan las notas *Para conversar* de cada escena.
5. **Cierre (5 min).** Nivel 3: cada estudiante elige un recurso para leer en casa; se recuerda que se puede imprimir o guardar como PDF.

## Ideas para seguir ampliando

- Agregar un tercer perfil (por ejemplo, alguien que cambia de rubro) copiando la estructura de `profiles.juan` y sumando un botón en `index.html`.
- Escenas con más de tres opciones: `options`, `scores` y `feedback` admiten cualquier cantidad (los atajos de teclado cubren A, B y C).
- Cambiar la ilustración por una foto o dibujo propio desde *Modo RRHH → Identidad visual*.
