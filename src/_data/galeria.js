// Galeria: cada pasta em src/assets/img/galeria/<album>/ é um álbum.
// Títulos, datas e locais ficam em galeria-albuns.json (opcional).
import fs from "node:fs";
import path from "node:path";
export default function () {
  const raiz = "src/assets/img/galeria";
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync("src/_data/galeria-albuns.json", "utf8")); } catch {}
  if (!fs.existsSync(raiz)) return [];
  return fs.readdirSync(raiz).filter((d) => fs.statSync(path.join(raiz, d)).isDirectory()).map((d) => {
    const fotos = fs.readdirSync(path.join(raiz, d)).filter((f) => /\.(webp|jpe?g|png)$/i.test(f)).sort().map((f) => `/assets/img/galeria/${d}/${f}`);
    const m = meta[d] || {};
    return { slug: d, titulo: m.titulo || d.replace(/-/g, " "), data: m.data || "", local: m.local || "", fotos };
  }).filter((a) => a.fotos.length).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
}
