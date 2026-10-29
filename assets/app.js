/* =====================================================================
   NEXT STEP · HCA Bachillerato · lógica de la aplicación
   ---------------------------------------------------------------------
   Estructura:
     1. Carga de contenido (seed + guardado en localStorage) y estado de sesión
     2. Utilidades y navegación
     3. Nivel 1 · Armá tu CV
     4. Nivel 2 · Entrevista simulada y resultados
     5. Nivel 3 · Recursos
     6. Modo RRHH (editor de contenidos)
   ===================================================================== */

/* ---------- 1. Contenido y estado ---------- */
const seed = window.NEXTSTEP_SEED;
const KEY = "NEXTSTEP_HCA_V11";          // contenido editado por RRHH
const OLD_KEYS = ["NEXTSTEP_HCA_V9"];    // versiones anteriores (se migran)
const SESSION_KEY = "NEXTSTEP_HCA_SESION"; // avance del grupo (CV, entrevista, equipo)
const clone = (x) => JSON.parse(JSON.stringify(x));
const $ = (id) => document.getElementById(id);

let data = loadContent();
let session = loadSession();

let profile = session.profile || "maria";
let cv = session.cv;          // { maria: {idx: "A"|"B"}, juan: {...} }
let order = session.order;    // { maria: [idx...], juan: [...] }
let answers = session.answers; // índice de respuesta por escena
let step = session.step || 0;
let revealed = session.revealed; // escenas con devolución mostrada
let resourceFilter = "Todas";
let resourceQuery = "";
let tab = "maria";
let currentScreen = "home";

function loadContent() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(KEY));
    if (!stored) for (const k of OLD_KEYS) { stored = JSON.parse(localStorage.getItem(k)); if (stored) break; }
  } catch { stored = null; }
  if (!stored?.profiles?.maria?.blocks || !stored?.profiles?.juan?.blocks) return clone(seed);
  const d = { ...clone(seed), ...stored, version: seed.version };
  d.title = stored.title || seed.title;
  d.subtitle = stored.subtitle || seed.subtitle;
  d.art = stored.art || seed.art;
  d.logo = stored.logo || seed.logo;
  d.palette = { ...seed.palette, ...(stored.palette || {}) };
  d.settings = { ...seed.settings, ...(stored.settings || {}) };
  d.resources = Array.isArray(stored.resources) ? stored.resources : clone(seed.resources);
  // Completa campos nuevos (pistas) que una versión anterior no tenía
  for (const p of ["maria", "juan"]) d.profiles[p].blocks.forEach((b, i) => {
    if (b.hint === undefined) b.hint = seed.profiles[p].blocks[i]?.hint || "";
  });
  return d;
}
function loadSession() {
  const empty = { team: "", profile: "maria", cv: { maria: {}, juan: {} }, order: { maria: [], juan: [] }, answers: [], step: 0, revealed: [], finished: false, cvReviewed: {} };
  try { return { ...empty, ...(JSON.parse(localStorage.getItem(SESSION_KEY)) || {}) }; } catch { return empty; }
}
function saveSession() {
  session = { ...session, profile, cv, order, answers, step, revealed };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* modo privado, etc. */ }
}
function save(silent = false) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    if (!silent) toast("Cambios guardados en este navegador");
  } catch (e) {
    alert("No se pudo guardar. Exportá el JSON como respaldo: " + e.message);
  }
}

/* ---------- 2. Utilidades y navegación ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const nl = (s) => esc(s).replace(/\n/g, "<br>");
const L = "ABC";
let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function apply() {
  for (const [k, v] of Object.entries(data.palette)) document.documentElement.style.setProperty("--" + k, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", data.palette.panel);
  for (const id of ["homeLogo", "resourcesLogo"]) {
    const img = $(id); img.src = data.logo || seed.logo;
    img.onerror = () => { if (img.src !== seed.logo) img.src = seed.logo; };
  }
  const t = data.title || "NEXT STEP";
  $("brandTitle").innerHTML = t.includes(" ") ? esc(t).replace(/^(\S+)\s+/, "$1 <span>") + "</span>" : esc(t);
  $("homeTitle").textContent = t;
  $("homeSubtitle").textContent = data.subtitle || "";
  const art = $("sceneIllustration");
  art.src = data.art || seed.art;
  art.onerror = () => { if (art.src !== seed.art) art.src = seed.art; };
  document.title = t + " · HCA Bachillerato";
  $("teamName").value = session.team || "";
}

function go(id) {
  if (id === "how") { go("home"); $("how").scrollIntoView({ behavior: "smooth" }); return; }
  currentScreen = id;
  document.querySelectorAll(".screen").forEach((x) => x.classList.toggle("active", x.id === id));
  const navId = id === "results" ? "interview" : id;
  document.querySelectorAll("[data-nav]").forEach((x) => x.classList.toggle("active", x.dataset.nav === navId));
  if (id === "home") renderHome();
  if (id === "cv") renderCV();
  if (id === "resources") renderResources();
  if (id === "editor") editorTab(tab);
  if (id === "dashboard") renderDashboard();
  window.scrollTo(0, 0);
}

function renderHome() {
  const chosen = Object.keys(cv[profile]).length;
  const total = data.profiles[profile].blocks.length;
  $("stepCvStatus").textContent = chosen ? `${data.profiles[profile].name}: ${chosen} de ${total} bloques` : "";
  const answered = answers.filter((a) => a !== undefined).length;
  $("stepIntStatus").textContent = session.finished ? "Completada ✓" : answered ? `${answered} de ${data.scenes.length} escenas` : "";
  const reviewed = Object.values(session.cvReviewed || {}).some(Boolean);
  $("stepDashStatus").textContent = session.finished && reviewed ? "Listo para ver ✓" : session.finished || reviewed ? "Parcial" : "";
}
$("teamName").addEventListener("input", (e) => { session.team = e.target.value.trim(); saveSession(); if (currentScreen === "cv") renderCV(); });

/* ---------- 3. Nivel 1 · CV ---------- */
function setProfile(id) { profile = id; saveSession(); renderCV(); }
function chosen(k) { return cv[profile][k]; }
function selectCV(k, opt) {
  if (opt === "none") delete cv[profile][k];
  else { cv[profile][k] = opt; if (!order[profile].includes(k)) order[profile].push(k); }
  saveSession(); renderCV();
}
function moveCV(k, d) {
  const a = order[profile].filter((x) => cv[profile][x]);
  const i = a.indexOf(k), j = i + d;
  if (j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]];
  order[profile] = a; saveSession(); renderCV();
}
function resetCV() {
  if (!confirm("¿Reiniciar este CV? Se borran las elecciones del grupo para este perfil.")) return;
  cv[profile] = {}; order[profile] = []; saveSession(); renderCV();
}
function cvView(v) {
  $("cvgrid").dataset.view = v;
  $("viewBlocks").classList.toggle("active", v === "blocks");
  $("viewPreview").classList.toggle("active", v === "preview");
  window.scrollTo(0, 0);
}
function renderCV() {
  const p = data.profiles[profile];
  $("pmaria").setAttribute("aria-selected", profile === "maria");
  $("pjuan").setAttribute("aria-selected", profile === "juan");
  $("profileDescription").textContent = `${p.name} · ${p.age} años · ${p.description}`;
  const decided = p.blocks.filter((_, i) => chosen(i)).length;
  $("cvProgress").style.width = (100 * decided) / p.blocks.length + "%";
  $("cvCount").textContent = `${decided} de ${p.blocks.length} bloques en el CV`;
  const showHints = data.settings.showHints !== false;

  $("categories").innerHTML = p.blocks.map((b, i) => `
    <div class="category ${chosen(i) ? "done" : ""}">
      <div class="category-head"><b>${i + 1}. ${esc(b.category)}</b>
        <span class="tag ${chosen(i) ? "ok" : ""}">${chosen(i) ? "Opción " + chosen(i) + " elegida" : "Sin decidir"}</span></div>
      ${showHints && b.hint ? `<p class="hint">${esc(b.hint)}</p>` : ""}
      <div class="opts">
        ${["A", "B"].map((v) => `<button class="opt ${chosen(i) === v ? "selected" : ""}" data-letter="${v}" aria-pressed="${chosen(i) === v}" onclick="selectCV(${i},'${v}')">${nl(b[v.toLowerCase()])}</button>`).join("")}
      </div>
      <div class="actions"><button class="linkbtn" onclick="selectCV(${i},'none')">${chosen(i) ? "Quitar del CV" : "Dejar este bloque fuera"}</button></div>
    </div>`).join("");

  const ids = order[profile].filter((x) => cv[profile][x]);
  const team = session.team ? `Borrador construido por el equipo ${esc(session.team)}` : "Borrador construido por el grupo";
  $("cvpaper").innerHTML = `<h2 class="cvname">${esc(p.name)} · Currículum vitae</h2><p class="cvsub">${team}</p>` + (ids.length
    ? ids.map((i) => {
        const b = p.blocks[i];
        return `<div class="cvsection" draggable="true" data-i="${i}"
          ondragstart="dragCV(event,${i})" ondragend="this.classList.remove('dragging')" ondragover="event.preventDefault()" ondrop="dropCV(event,${i})">
          <div class="row between"><h3>${esc(b.category)}</h3>
          <div class="actions"><button title="Subir" aria-label="Subir" onclick="moveCV(${i},-1)">↑</button><button title="Bajar" aria-label="Bajar" onclick="moveCV(${i},1)">↓</button><button title="Quitar" aria-label="Quitar" onclick="selectCV(${i},'none')">×</button></div></div>
          <p>${nl(b[cv[profile][i].toLowerCase()])}</p></div>`;
      }).join("")
    : `<div class="cvempty"><b>El CV está vacío</b>Elegí la opción A o B de cada bloque para empezar a armarlo.</div>`);
  $("cvReview").classList.add("hidden");
  if (currentScreen === "home") renderHome();
}
function dragCV(e, i) { e.dataTransfer.setData("text/plain", String(i)); e.target.classList.add("dragging"); }
function dropCV(e, target) {
  e.preventDefault();
  const source = Number(e.dataTransfer.getData("text/plain"));
  if (!Number.isInteger(source) || source === target) return;
  const a = order[profile].filter((x) => cv[profile][x]);
  const i = a.indexOf(source), j = a.indexOf(target);
  if (i < 0 || j < 0) return;
  a.splice(i, 1); a.splice(j, 0, source);
  order[profile] = a; saveSession(); renderCV();
}
function revealCV() {
  const p = data.profiles[profile];
  const items = p.blocks.map((b, i) => ({ b, i, selected: cv[profile][i] }));
  const matches = items.filter((x) => x.selected && x.selected === x.b.best).length;
  const decided = items.filter((x) => x.selected).length;
  const ids = order[profile].filter((x) => cv[profile][x]);
  const contactIdx = p.blocks.findIndex((b) => /contacto/i.test(b.category));
  const orderOk = contactIdx < 0 || !cv[profile][contactIdx] || ids[0] === contactIdx;
  if (!decided) { toast("Elegí al menos un bloque antes de pedir la revisión"); return; }
  session.cvReviewed = { ...(session.cvReviewed || {}), [profile]: true }; saveSession();
  $("cvReview").innerHTML = `
    <div class="eyebrow">Devolución de RRHH</div>
    <div class="score"><div class="score-num">${matches}<small> / ${decided}</small></div>
      <div><b>bloques coinciden con la mirada de RRHH.</b><br><span class="muted small">No es un puntaje: es un punto de partida para conversar por qué.</span></div></div>
    ${contactIdx >= 0 && cv[profile][contactIdx] ? `<p class="small ${orderOk ? "muted" : ""}">${orderOk ? "✓ Los datos de contacto están al principio, donde se esperan." : "⚠ Los datos de contacto suelen ir primero: quien lee el CV necesita saber enseguida cómo comunicarse."}</p>` : ""}
    ${items.map(({ b, i, selected }) => {
      const st = !selected ? "none" : selected === b.best ? "good" : "mid";
      const icon = { good: "✓", mid: "~", none: "–" }[st];
      return `<details class="review"><summary><span class="mark ${st}">${icon}</span>${esc(b.category)} <span class="muted small">· ${selected ? "elegida " + selected : "no incluida"}</span></summary>
        <div class="rbody"><p><b>Más adecuada según RRHH: opción ${esc(b.best)}.</b> ${esc(b.tip)}</p>
        <p class="muted small">${!selected ? "El grupo decidió omitir esta sección. ¿Tiene sentido para este perfil? A veces omitir es la mejor decisión." : selected === b.best ? "El grupo coincidió. ¿Pueden explicar con sus palabras por qué esta versión funciona mejor?" : "El grupo eligió " + selected + ". ¿Qué los convenció? ¿Qué cambia al leer la explicación?"}</p></div></details>`;
    }).join("")}`;
  $("cvReview").classList.remove("hidden");
  if (window.innerWidth <= 760) cvView("preview");
  $("cvReview").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- 4. Nivel 2 · Entrevista ---------- */
function goInterview() {
  if (session.finished) { finish(); return; }
  if (!answers.some((a) => a !== undefined)) { startInterview(); return; }
  go("interview"); renderInterview();
}
function startInterview(restart = false) {
  if (restart && !confirm("¿Reiniciar la entrevista? Se borran las respuestas del grupo.")) return;
  answers = []; step = 0; revealed = []; session.finished = false; saveSession();
  go("interview"); renderInterview();
}
function renderInterview() {
  const s = data.scenes[step];
  const n = data.scenes.length;
  $("sceneTitle").textContent = s.title;
  $("sceneCounter").textContent = `Escena ${step + 1} de ${n}`;
  $("sceneDots").innerHTML = data.scenes.map((_, i) => `<i class="${i < step ? "done" : i === step ? "now" : ""}"></i>`).join("");
  $("speaker").textContent = s.speaker;
  $("question").textContent = s.question;
  const isRevealed = revealed.includes(step);
  $("answers").innerHTML = s.options.map((v, i) => {
    const cls = isRevealed ? scoreClass(s.scores, i) : "";
    return `<button class="answer ${answers[step] === i ? "selected" : ""} ${cls}" data-letter="${L[i]}" aria-pressed="${answers[step] === i}" onclick="answer(${i})">${esc(v)}${isRevealed ? `<span class="fb">${esc(s.feedback[i])}</span>` : ""}</button>`;
  }).join("");
  const fb = $("sceneFeedback");
  fb.classList.toggle("hidden", !isRevealed);
  if (isRevealed) fb.innerHTML = `<b>Para conversar:</b> ${esc(s.notes)}`;
  const canReveal = data.settings.revealPerScene !== false && answers[step] !== undefined && !isRevealed;
  $("revealScene").classList.toggle("hidden", !canReveal);
  $("prevScene").disabled = step === 0;
  $("nextScene").disabled = answers[step] === undefined;
  $("nextScene").textContent = step === n - 1 ? "Ver resultado →" : "Siguiente →";
}
function answer(i) {
  if (revealed.includes(step)) return; // una vez vista la devolución, la decisión queda
  answers[step] = i; saveSession(); renderInterview();
}
function revealScene() { if (!revealed.includes(step)) revealed.push(step); saveSession(); renderInterview(); }
function previousScene() { if (step > 0) { step--; saveSession(); renderInterview(); } }
function nextScene() {
  if (answers[step] === undefined) return;
  if (step < data.scenes.length - 1) { step++; saveSession(); renderInterview(); } else finish();
}
document.addEventListener("keydown", (e) => {
  if (currentScreen !== "interview" || e.target.matches("input,textarea,select")) return;
  const k = e.key.toUpperCase();
  if (k.length === 1 && L.includes(k)) { const i = L.indexOf(k); if (i < data.scenes[step].options.length) answer(i); }
  else if (e.key === "Enter") nextScene();
  else if (e.key === "ArrowLeft") previousScene();
});
function scoreClass(scores, i) {
  const lo = Math.min(...scores), hi = Math.max(...scores);
  return scores[i] === hi ? "good" : scores[i] === lo ? "bad" : "mid";
}
const LEVELS = [
  ["Nivel 1 · Recién empezamos 🌱", "Varias respuestas transmiten algo distinto de lo que el equipo quería. ¡Tranquilos! Revisarlas una por una es la mejor forma de aprender."],
  ["Nivel 2 · En camino 🚶", "Hay buenas intuiciones y también respuestas que conviene repensar. La revisión guiada muestra por qué."],
  ["Nivel 3 · En desarrollo 💪", "El equipo identifica lo esencial en la mayoría de las escenas. Faltan matices que se trabajan con ejemplos."],
  ["Nivel 4 · Buen ajuste ⭐", "Las decisiones del equipo son claras y pertinentes. Revisen las escenas en naranja para afinar."],
  ["Nivel 5 · Ajuste destacado 🏆", "Excelente lectura de cada situación. Ahora el desafío es explicar cada elección con sus propias palabras."],
];
function finish() {
  session.finished = true; saveSession();
  go("results");
  const vals = data.scenes.map((s, i) => Number(s.scores[answers[i]] ?? Math.min(...s.scores)));
  const sum = vals.reduce((a, b) => a + b, 0);
  const min = data.scenes.reduce((a, s) => a + Math.min(...s.scores.map(Number)), 0);
  const max = data.scenes.reduce((a, s) => a + Math.max(...s.scores.map(Number)), 0);
  const ratio = max === min ? 1 : (sum - min) / (max - min);
  const level = Math.min(5, Math.floor(ratio * 5) + 1);
  const counts = { good: 0, mid: 0, bad: 0 };
  data.scenes.forEach((s, i) => { if (answers[i] !== undefined) counts[scoreClass(s.scores, answers[i])]++; });
  $("resultTitle").textContent = session.team ? `¡Entrevista completada, equipo ${session.team}!` : "¡Entrevista completada!";
  $("resultLevel").textContent = LEVELS[level - 1][0];
  $("resultText").textContent = LEVELS[level - 1][1];
  setTimeout(() => { $("gaugeFill").style.width = Math.round(ratio * 100) + "%"; }, 50);
  $("resultStats").innerHTML = `
    <div class="stat good"><b>${counts.good}</b><span>más adecuadas</span></div>
    <div class="stat mid"><b>${counts.mid}</b><span>según el contexto</span></div>
    <div class="stat bad"><b>${counts.bad}</b><span>para repensar</span></div>`;
  $("review").classList.add("hidden");
  $("reviewList").innerHTML = data.scenes.map((s, i) => {
    const a = answers[i];
    const st = a === undefined ? "none" : scoreClass(s.scores, a);
    const icon = { good: "✓", mid: "~", bad: "✕", none: "–" }[st];
    return `<details class="review"><summary><span class="mark ${st}">${icon}</span>${i + 1}. ${esc(s.title)} <span class="muted small">· el grupo eligió ${a === undefined ? "nada" : L[a]}</span></summary>
      <div class="rbody"><h3>${esc(s.question)}</h3>
      ${s.options.map((v, k) => { const c = scoreClass(s.scores, k); return `<div class="reviewopt ${c} ${a === k ? "chosen" : ""}"><b>${L[k]} · ${{ good: "Más adecuada", mid: "Depende del contexto", bad: "Menos adecuada" }[c]}${a === k ? " · elegida por el grupo" : ""}</b><p>${esc(v)}</p><p class="fb">${esc(s.feedback[k])}</p></div>`; }).join("")}
      <p class="notice"><b>Para conversar:</b> ${esc(s.notes)}</p></div></details>`;
  }).join("");
}
function toggleReview() {
  const r = $("review"); r.classList.toggle("hidden");
  if (!r.classList.contains("hidden")) r.scrollIntoView({ behavior: "smooth" });
}

/* ---------- 5. Nivel 3 · Recursos ---------- */
const CATEGORIES = ["CV", "Entrevista", "Herramientas"];
function filterResources(k) { resourceFilter = k; renderResources(); }
$("resourceSearch").addEventListener("input", (e) => { resourceQuery = e.target.value.trim().toLowerCase(); renderResources(); });
function renderResources() {
  $("resourceFilters").innerHTML = ["Todas", ...CATEGORIES].map((k) => `<button class="${k === resourceFilter ? "active" : ""}" onclick="filterResources('${k}')">${k === "Todas" ? "Todos" : k}</button>`).join("");
  const arr = (data.resources || []).filter((r) => (resourceFilter === "Todas" || r.category === resourceFilter) &&
    (!resourceQuery || (r.title + " " + r.body).toLowerCase().includes(resourceQuery)));
  $("resourcesList").innerHTML = arr.length
    ? arr.map((r) => `<details class="panel resourceitem"><summary><span class="tag">${esc(r.category)}</span><h2>${esc(r.title)}</h2><span class="open-hint">Abrir ▾</span></summary>
        <div class="resourcebody">${nl(r.body)}</div>
        ${r.url && /^https:\/\//i.test(r.url) ? `<p><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.linkLabel || "Ver recurso externo")} ↗</a></p>` : ""}</details>`).join("")
    : '<div class="panel muted">No hay recursos que coincidan con la búsqueda.</div>';
}

/* ---------- 6. Modo RRHH ---------- */
function fld(label, value, path, area = false) {
  return `<label class="field"><span>${esc(label)}</span>${area ? `<textarea data-path="${esc(path)}">${esc(value)}</textarea>` : `<input data-path="${esc(path)}" value="${esc(value)}">`}</label>`;
}
function editorTab(t) {
  tab = t;
  document.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("active", x.dataset.tab === t));
  let h = "";
  if (t === "maria" || t === "juan") {
    const p = data.profiles[t];
    h = `<h2>Contenido de ${esc(p.name)}</h2><p class="muted">Editá las opciones A y B, cuál es la más adecuada, la pista para el grupo y la explicación de RRHH. No modifica el otro perfil.</p>
      ${fld("Nombre", p.name, `profiles.${t}.name`)}${fld("Edad", p.age, `profiles.${t}.age`)}${fld("Descripción", p.description, `profiles.${t}.description`, true)}
      ${p.blocks.map((b, i) => `<details class="edititem"><summary>${i + 1}. ${esc(b.category)}</summary>
        ${fld("Categoría", b.category, `profiles.${t}.blocks.${i}.category`)}
        ${fld("Pista para el grupo (pregunta guía, se ve antes de decidir)", b.hint || "", `profiles.${t}.blocks.${i}.hint`, true)}
        ${fld("Opción A", b.a, `profiles.${t}.blocks.${i}.a`, true)}${fld("Opción B", b.b, `profiles.${t}.blocks.${i}.b`, true)}
        <label class="field"><span>Más adecuada</span><select data-path="profiles.${t}.blocks.${i}.best"><option ${b.best === "A" ? "selected" : ""}>A</option><option ${b.best === "B" ? "selected" : ""}>B</option></select></label>
        ${fld("Explicación de RRHH (se ve en la revisión)", b.tip, `profiles.${t}.blocks.${i}.tip`, true)}</details>`).join("")}`;
  } else if (t === "scenes") {
    h = `<h2>Entrevista · ${data.scenes.length} escenas</h2><p class="muted">Las puntuaciones 1–4 determinan los colores: la opción con el máximo es verde (más adecuada), la del mínimo roja (menos adecuada) y las intermedias naranjas (depende del contexto).</p>
      ${data.scenes.map((s, i) => `<details class="edititem"><summary>${i + 1}. ${esc(s.title)}</summary>
        ${fld("Título", s.title, `scenes.${i}.title`)}${fld("Personaje", s.speaker, `scenes.${i}.speaker`)}${fld("Pregunta", s.question, `scenes.${i}.question`, true)}
        ${s.options.map((o, k) => `${fld("Respuesta " + L[k], o, `scenes.${i}.options.${k}`, true)}<label class="field"><span>Puntuación ${L[k]} (1–4)</span><input type="number" min="1" max="4" data-path="scenes.${i}.scores.${k}" value="${s.scores[k]}"></label>${fld("Devolución " + L[k], s.feedback[k], `scenes.${i}.feedback.${k}`, true)}`).join("")}
        ${fld("Nota para conversar", s.notes, `scenes.${i}.notes`, true)}
        <div class="editor-actions"><button class="btn sm ghost" onclick="moveScene(${i},-1)">↑ Subir</button><button class="btn sm ghost" onclick="moveScene(${i},1)">↓ Bajar</button><button class="btn sm ghost" onclick="duplicateScene(${i})">Duplicar</button><button class="btn sm danger" onclick="deleteScene(${i})">Eliminar</button></div></details>`).join("")}
      <button class="btn" onclick="addScene()">+ Agregar escena</button>`;
  } else if (t === "resources") {
    h = `<h2>Recursos para estudiantes</h2><p class="muted">Aparecen en el Nivel 3. Podés editar, agregar, eliminar y ordenar tarjetas. Los enlaces son opcionales (solo HTTPS).</p>
      <div class="row"><button class="btn primary" onclick="addResource()">+ Agregar recurso</button><button class="btn ghost" onclick="go('resources')">Ver como estudiante</button></div>
      ${data.resources.map((r, i) => `<details class="edititem"><summary>${i + 1}. ${esc(r.category)} · ${esc(r.title)}</summary>
        <div class="editor-actions"><button class="btn sm ghost" onclick="moveResource(${i},-1)">↑ Subir</button><button class="btn sm ghost" onclick="moveResource(${i},1)">↓ Bajar</button><button class="btn sm danger" onclick="removeResource(${i})">Eliminar</button></div>
        <label class="field"><span>Categoría</span><select data-path="resources.${i}.category">${CATEGORIES.map((c) => `<option value="${c}" ${r.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        ${fld("Título", r.title, `resources.${i}.title`)}${fld("Contenido", r.body, `resources.${i}.body`, true)}${fld("Texto del enlace (opcional)", r.linkLabel, `resources.${i}.linkLabel`)}${fld("Enlace externo HTTPS (opcional)", r.url, `resources.${i}.url`)}</details>`).join("")}`;
  } else if (t === "settings") {
    h = `<h2>Dinámica del taller</h2><p class="muted">Ajustes que cambian cómo viven la experiencia los grupos.</p>
      <label class="field inline"><input type="checkbox" data-path="settings.showHints" ${data.settings.showHints !== false ? "checked" : ""}><span>Mostrar la <b>pista</b> (pregunta guía) en cada bloque del CV antes de decidir.</span></label>
      <label class="field inline"><input type="checkbox" data-path="settings.revealPerScene" ${data.settings.revealPerScene !== false ? "checked" : ""}><span>Permitir <b>ver la devolución de RRHH escena por escena</b> en la entrevista. Si se desactiva, solo se ve al final.</span></label>
      <h3 style="margin-top:20px">Avance de los grupos</h3>
      <p class="muted small">El avance (CV armado, respuestas de la entrevista y nombre del equipo) se guarda en cada navegador. Para que el próximo grupo empiece de cero en esta computadora:</p>
      <button class="btn ghost" onclick="resetSession()">Borrar el avance del grupo en este navegador</button>`;
  } else if (t === "style") {
    h = `<h2>Identidad visual</h2>${fld("Nombre del taller", data.title || "NEXT STEP", "title")}${fld("Subtítulo", data.subtitle || "", "subtitle")}
      <h3>Paletas rápidas</h3><div class="row">${Object.keys(presets).map((k) => `<button class="btn sm ghost" onclick="setPreset('${k}')">${k}</button>`).join("")}</div>
      <h3 style="margin-top:16px">Colores</h3><div class="colorgrid">${Object.entries(data.palette).map(([k, v]) => `<label class="field"><span>${PALETTE_LABELS[k] || k}</span><input type="color" data-path="palette.${k}" value="${esc(v)}"></label>`).join("")}</div>
      <div class="preview"><div class="eyebrow">Vista previa</div><p>Texto normal y <span class="muted">texto atenuado</span>.</p><button class="btn primary">Botón destacado</button> <button class="btn">Botón normal</button> <button class="btn ghost">Botón secundario</button></div>
      <h3>Logo</h3><img class="logo" src="${esc(data.logo || seed.logo)}" alt="Logo actual"><label class="field"><span>Reemplazar logo (PNG o SVG, menor a 2 MB)</span><input id="logoInput" type="file" accept="image/*"></label>
      <h3>Ilustración de la entrevista</h3><img src="${esc(data.art || seed.art)}" alt="Ilustración actual" style="width:100%;max-width:520px;border-radius:12px"><label class="field"><span>Reemplazar ilustración (menor a 2,5 MB)</span><input id="artInput" type="file" accept="image/*"></label>`;
  } else {
    h = `<h2>Guardar y compartir</h2>
      <p>Lo que editás se guarda solo <b>en este navegador</b>. Para compartirlo con el equipo o llevarlo a otra computadora, exportá el archivo JSON e importalo allá. Para publicarlo para todos los estudiantes, reemplazá el contenido de <code>assets/data.js</code> con el JSON exportado (ver README).</p>
      <div class="row"><button class="btn primary" onclick="save()">Guardar ahora</button><button class="btn" onclick="exportJSON()">Exportar JSON</button><label class="btn ghost">Importar JSON <input type="file" accept=".json,application/json" id="importJSON" hidden></label><button class="btn danger" onclick="resetAll()">Restaurar contenido inicial</button></div>`;
  }
  $("editorBody").innerHTML = h;
  document.querySelectorAll("[data-path]").forEach((el) => el.addEventListener("input", () => {
    const keys = el.dataset.path.split(".");
    let o = data;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    const k = keys.at(-1);
    if (el.type === "checkbox") o[k] = el.checked;
    else if (keys.includes("scores")) o[k] = Math.max(1, Math.min(4, Number(el.value) || 1));
    else if (k === "age") o[k] = Number(el.value) || el.value;
    else o[k] = el.value;
    if (["palette", "title", "subtitle"].includes(keys[0])) apply();
    save(true);
  }));
  const fileInput = (id, max, prop) => {
    const input = $(id); if (!input) return;
    input.onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > max) return alert(`Usá un archivo menor a ${(max / 1e6).toFixed(1).replace(".0", "")} MB`);
      const r = new FileReader();
      r.onload = () => { data[prop] = r.result; save(true); apply(); editorTab("style"); toast("Imagen actualizada"); };
      r.readAsDataURL(f);
    };
  };
  fileInput("logoInput", 2000000, "logo");
  fileInput("artInput", 2500000, "art");
  if ($("importJSON")) $("importJSON").onchange = importJSON;
}
const PALETTE_LABELS = { bg: "Fondo", panel: "Paneles", accent: "Acento 1 (títulos)", accent2: "Acento 2 (destacados)", text: "Texto", button: "Botones", edge: "Bordes" };
const presets = {
  Arcade: { bg: "#111827", panel: "#242044", accent: "#18C9C1", accent2: "#F77CA8", text: "#FFFFFF", button: "#5135A5", edge: "#5A527B" },
  "Pixel Retro": { bg: "#17243C", panel: "#354D79", accent: "#FACC6B", accent2: "#A78BFA", text: "#FFFFFF", button: "#354D79", edge: "#69779D" },
  Pastel: { bg: "#30344F", panel: "#515A78", accent: "#F5DDA7", accent2: "#F4A9BA", text: "#FFFFFF", button: "#777CA8", edge: "#A8B7E8" },
  "HCA orientativa": { bg: "#173C65", panel: "#2F689C", accent: "#80B4D9", accent2: "#F3C76B", text: "#FFFFFF", button: "#24527E", edge: "#80B4D9" },
  Claro: { bg: "#F3F5F9", panel: "#FFFFFF", accent: "#0E8F89", accent2: "#E8567F", text: "#1A2234", button: "#3B2A8C", edge: "#CBD3E1" },
};
function setPreset(k) { data.palette = clone(presets[k]); apply(); save(true); editorTab("style"); }
function moveScene(i, d) { const j = i + d; if (j < 0 || j >= data.scenes.length) return; [data.scenes[i], data.scenes[j]] = [data.scenes[j], data.scenes[i]]; save(true); editorTab("scenes"); }
function duplicateScene(i) { data.scenes.splice(i + 1, 0, clone(data.scenes[i])); save(true); editorTab("scenes"); }
function deleteScene(i) { if (data.scenes.length < 2) return; if (confirm("¿Eliminar esta escena?")) { data.scenes.splice(i, 1); save(true); editorTab("scenes"); } }
function addScene() {
  data.scenes.push({ title: "Nueva escena", speaker: "ENTREVISTADORA", question: "Pregunta", options: ["Respuesta A", "Respuesta B", "Respuesta C"], scores: [1, 4, 2], feedback: ["Devolución A", "Devolución B", "Devolución C"], notes: "Nota para conversar" });
  save(true); editorTab("scenes");
}
function addResource() { data.resources.push({ id: "r" + Date.now(), category: "CV", title: "Nuevo recurso", body: "Escribí aquí el contenido.", linkLabel: "", url: "" }); save(true); editorTab("resources"); }
function removeResource(i) { if (confirm("¿Eliminar este recurso?")) { data.resources.splice(i, 1); save(true); editorTab("resources"); } }
function moveResource(i, d) { const j = i + d; if (j < 0 || j >= data.resources.length) return; [data.resources[i], data.resources[j]] = [data.resources[j], data.resources[i]]; save(true); editorTab("resources"); }
function exportJSON() {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.href = url; a.download = "NEXT_STEP_HCA_contenidos.json"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importJSON(e) {
  try {
    const x = JSON.parse(await e.target.files[0].text());
    if (!x.profiles?.maria?.blocks || !x.profiles?.juan?.blocks || !Array.isArray(x.scenes)) throw Error("archivo incompatible");
    data = { ...clone(seed), ...x, version: seed.version };
    data.settings = { ...seed.settings, ...(x.settings || {}) };
    data.resources = Array.isArray(x.resources) ? x.resources : clone(seed.resources);
    save(true); apply(); editorTab("files"); toast("Contenido importado correctamente");
  } catch (err) { alert("Error al importar: " + err.message); }
}
function resetAll() {
  if (!confirm("¿Restaurar todos los contenidos iniciales? Exportá una copia antes si querés conservar tus cambios.")) return;
  data = clone(seed); save(true); apply(); editorTab("files"); toast("Contenido inicial restaurado");
}
function resetSession() {
  if (!confirm("¿Borrar el avance del grupo (CV, entrevista y nombre del equipo) en este navegador?")) return;
  localStorage.removeItem(SESSION_KEY);
  session = loadSession(); profile = "maria"; cv = session.cv; order = session.order; answers = session.answers; step = 0; revealed = session.revealed;
  apply(); toast("Avance borrado");
}

/* ---------- Tablero final ---------- */
function interviewStats() {
  const done = session.finished;
  const answered = answers.filter((a) => a !== undefined).length;
  const max = data.scenes.reduce((a, s) => a + Math.max(...s.scores.map(Number)), 0);
  const min = data.scenes.reduce((a, s) => a + Math.min(...s.scores.map(Number)), 0);
  const sum = data.scenes.reduce((a, s, i) => a + (answers[i] === undefined ? 0 : Number(s.scores[answers[i]])), 0);
  const ratio = max === min ? 1 : Math.max(0, (sum - min) / (max - min));
  const level = Math.min(5, Math.floor(ratio * 5) + 1);
  const counts = { good: 0, mid: 0, bad: 0 };
  data.scenes.forEach((s, i) => { if (answers[i] !== undefined) counts[scoreClass(s.scores, answers[i])]++; });
  return { done, answered, sum, max, ratio, level, counts };
}
function cvStats(pid) {
  const p = data.profiles[pid];
  const items = p.blocks.map((b, i) => ({ b, i, selected: cv[pid][i] }));
  const decided = items.filter((x) => x.selected);
  const matches = decided.filter((x) => x.selected === x.b.best);
  const errors = decided.filter((x) => x.selected !== x.b.best);
  const omitted = items.filter((x) => !x.selected);
  const ids = order[pid].filter((x) => cv[pid][x]);
  const contactIdx = p.blocks.findIndex((b) => /contacto/i.test(b.category));
  const orderOk = contactIdx < 0 || !cv[pid][contactIdx] || ids[0] === contactIdx;
  return { p, decided, matches, errors, omitted, orderOk, reviewed: !!(session.cvReviewed || {})[pid], total: p.blocks.length };
}
function renderDashboard() {
  const team = session.team ? `equipo ${esc(session.team)}` : "equipo";
  $("dashTitle").innerHTML = `Así le fue al ${team}`;
  const iv = interviewStats();
  const cvs = ["maria", "juan"].map(cvStats).filter((c) => c.decided.length);
  const cvPts = cvs.reduce((a, c) => a + c.matches.length, 0);
  const cvMax = cvs.reduce((a, c) => a + c.total, 0);
  const cvErr = cvs.reduce((a, c) => a + c.errors.length, 0);
  const toReview = cvErr + iv.counts.bad + iv.counts.mid;
  const nothing = !cvs.length && !iv.answered;

  $("dashKpis").innerHTML = nothing ? "" : `
    <div class="kpi pink"><b>${cvPts + iv.sum}<small> / ${cvMax + iv.max}</small></b><span>Puntos totales (CV + entrevista)</span></div>
    <div class="kpi"><b>${cvs.length ? `${cvPts}<small> / ${cvMax}</small>` : "–"}</b><span>Bloques del CV que coinciden con RRHH</span></div>
    <div class="kpi good"><b>${iv.answered ? `${iv.sum}<small> / ${iv.max}</small>` : "–"}</b><span>Puntos en la entrevista${iv.answered ? " · " + LEVELS[iv.level - 1][0].split(" ·")[0] : ""}</span></div>
    <div class="kpi warn"><b>${toReview}</b><span>Decisiones para repasar</span></div>`;

  // --- CV ---
  let h = `<div class="eyebrow">Nivel 1 · CV</div>`;
  if (!cvs.length) h += `<div class="empty-dash">Todavía no armaron ningún CV.<br><button class="btn primary sm" onclick="go('cv')">Ir al Nivel 1 →</button></div>`;
  cvs.forEach((c) => {
    h += `<div class="dash-sub"><h3>${esc(c.p.name)}</h3><span class="tag ${c.matches.length === c.decided.length && c.orderOk ? "ok" : ""}">${c.matches.length} de ${c.decided.length} coinciden</span></div>
      <div class="bar" style="margin-bottom:10px"><div style="width:${(100 * c.matches.length) / c.total}%"></div></div>`;
    const errs = [];
    c.errors.forEach((x) => errs.push(`<li><b>${esc(x.b.category)}: eligieron ${x.selected}, RRHH sugiere ${esc(x.b.best)}</b><span class="muted">${esc(x.b.tip)}</span></li>`));
    if (!c.orderOk) errs.push(`<li><b>Orden: los datos de contacto no están primero</b><span class="muted">Quien lee el CV necesita saber enseguida cómo comunicarse.</span></li>`);
    c.omitted.forEach((x) => errs.push(`<li class="none"><b>${esc(x.b.category)}: quedó fuera del CV</b><span class="muted">¿Fue una decisión o un olvido? ${esc(x.b.tip)}</span></li>`));
    if (!c.reviewed) errs.unshift(`<li class="none"><b>Todavía no pidieron la revisión de RRHH</b><span class="muted">Vuelvan al Nivel 1 y toquen "Revisar con RRHH" para ver las explicaciones.</span></li>`);
    h += errs.length ? `<ul class="errlist">${errs.join("")}</ul>` : `<div class="allgood">🎉 ¡CV impecable! Todas las decisiones coinciden con la mirada de RRHH y el orden es el esperado.</div>`;
  });
  $("dashCV").innerHTML = h;

  // --- Entrevista ---
  h = `<div class="eyebrow">Nivel 2 · Entrevista</div>`;
  if (!iv.answered) h += `<div class="empty-dash">Todavía no hicieron la entrevista.<br><button class="btn primary sm" onclick="goInterview()">Ir al Nivel 2 →</button></div>`;
  else {
    h += `<div class="dash-sub"><h3>${esc(LEVELS[iv.level - 1][0])}</h3><span class="tag">${iv.done ? "Completada" : `${iv.answered} de ${data.scenes.length} escenas`}</span></div>
      <p class="muted small" style="margin:0 0 10px">Puntos por escena. Verde: más adecuada · Naranja: depende del contexto · Rojo: menos adecuada.</p>
      <div class="chart-wrap"><div class="chart">${data.scenes.map((s, i) => {
        const a = answers[i]; const mx = Math.max(...s.scores.map(Number));
        const val = a === undefined ? 0 : Number(s.scores[a]);
        return `<div class="col ${a === undefined ? "" : scoreClass(s.scores, a)}" title="${esc(s.title)}: ${val} de ${mx}"><i style="height:${(100 * val) / mx}%"></i><span>${i + 1}</span></div>`;
      }).join("")}</div></div>`;
    const errs = [];
    data.scenes.forEach((s, i) => {
      const a = answers[i]; if (a === undefined) return;
      const c = scoreClass(s.scores, a); if (c === "good") return;
      const bestIdx = s.scores.indexOf(Math.max(...s.scores.map(Number)));
      errs.push(`<li class="${c}"><b>${i + 1}. ${esc(s.title)}: eligieron ${L[a]} (${c === "bad" ? "menos adecuada" : "depende del contexto"})</b><span class="muted">Más adecuada: ${L[bestIdx]}. ${esc(s.options[bestIdx])}<br>${esc(s.feedback[a])}</span></li>`);
    });
    h += errs.length ? `<ul class="errlist">${errs.join("")}</ul>` : `<div class="allgood">🎉 ¡Entrevista perfecta! El equipo eligió la respuesta más adecuada en todas las escenas.</div>`;
  }
  $("dashInterview").innerHTML = h;

  // --- Próximos pasos ---
  const tips = [];
  if (cvErr) tips.push(["CV", "Relean los bloques marcados y expliquen con sus palabras por qué la otra versión funciona mejor."]);
  if (iv.counts.bad) tips.push(["Entrevista", "Vuelvan a las escenas en rojo: ¿qué transmite esa respuesta a quien entrevista?"]);
  if (iv.counts.mid) tips.push(["Entrevista", "Las escenas en naranja no están mal: discutan en qué contexto esa respuesta sería la mejor."]);
  if (!nothing && !toReview) tips.push(["Herramientas", "Como todo salió bien, el desafío ahora es preparar su propia presentación personal de un minuto."]);
  tips.push(["Herramientas", "Antes de una entrevista real, repasen la checklist del Nivel 3."]);
  $("dashNext").innerHTML = `<div class="eyebrow">Próximos pasos</div><ul class="goals">${tips.map(([cat, t]) => `<li>${esc(t)} <button class="linkbtn" onclick="filterResources('${cat}');go('resources')">Ver recursos de ${cat} →</button></li>`).join("")}</ul>`;
}
function resetSessionFromDash() { resetSession(); go("home"); }

/* ---------- Arranque ---------- */
apply();
go("home");
