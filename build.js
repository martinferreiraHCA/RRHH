#!/usr/bin/env node
/*
  Genera dist/next-step.html: una versión de UN SOLO ARCHIVO del taller,
  con CSS, JS, datos, logo e ilustración embebidos. Sirve para compartir
  por correo, Drive o pendrive sin depender de la carpeta assets/.

  Uso:  node build.js
*/
const fs = require("fs");
const path = require("path");

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const dataUrl = (p, mime) => `data:${mime};base64,${fs.readFileSync(path.join(root, p)).toString("base64")}`;

let html = read("index.html");
const css = read("assets/styles.css");
let data = read("assets/data.js");
const app = read("assets/app.js");

// Imágenes embebidas como data URL para que el archivo sea autónomo
data = data
  .replace('"logo": "assets/logo.png"', JSON.stringify(dataUrl("assets/logo.png", "image/png")).replace(/^"/, '"logo": "'))
  .replace('"art": "assets/scene.svg"', JSON.stringify(dataUrl("assets/scene.svg", "image/svg+xml")).replace(/^"/, '"art": "'));

html = html
  .replace('<link rel="stylesheet" href="assets/styles.css">', `<style>\n${css}\n</style>`)
  .replace('<script src="assets/data.js"></script>', `<script>\n${data}\n</script>`)
  .replace('<script src="assets/app.js"></script>', `<script>\n${app}\n</script>`);

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const out = path.join(root, "dist", "next-step.html");
fs.writeFileSync(out, html);
console.log(`✔ Generado ${path.relative(root, out)} (${(html.length / 1024).toFixed(0)} KB)`);
