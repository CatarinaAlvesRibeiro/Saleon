// Prepara as fotografias dos produtos para o site.
//
// Uso:  npm run imagens -- <pasta-com-imagens> [--forcar]
//
// - Lê todas as imagens da pasta (e subpastas). Se uma subpasta tiver o nome
//   de uma marca (glynt, om, original-mineral, graham-hill, calecim, pahi),
//   só procura produtos dessa marca.
// - Associa cada ficheiro ao produto pelo nome do ficheiro
//   (ex.: "GLYNT_REVITAL_Mask_200ml.jpg" -> REVITAL Mask).
// - Converte para WebP quadrado 1200x1200, fundo branco, e grava em
//   src/assets/img/produtos/<marca>/<produto>.webp
// - Escreve relatorio-imagens.csv com o que foi associado, o que ficou por
//   associar e os produtos ainda sem imagem.
// - Para forçar uma associação, criar imagens-mapa.csv com linhas
//   "nome-do-ficheiro.jpg;/marcas/glynt/revital/revital-mask/"
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import carregarCatalogo from "../src/_data/catalogo.js";

const args = process.argv.slice(2);
const pasta = args.find((a) => !a.startsWith("--"));
const forcar = args.includes("--forcar");
if (!pasta || !fs.existsSync(pasta)) {
  console.error("Indique a pasta com as imagens: npm run imagens -- <pasta>");
  process.exit(1);
}

const { produtos } = carregarCatalogo();
const ALIAS_MARCA = { glynt: "glynt", om: "original-mineral", "o-m": "original-mineral", "original-mineral": "original-mineral", "graham-hill": "graham-hill", grahamhill: "graham-hill", calecim: "calecim", pahi: "pahi" };
const IGNORAR = new Set(["glynt", "om", "o", "m", "e", "original", "mineral", "graham", "hill", "calecim", "pahi", "barcelona", "packshot", "front", "frente", "web", "final", "hd", "img", "image", "foto", "new", "novo", "copy", "copia", "the", "and", "de", "da", "do", "r"]);

const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[Øø]/g, "o").replace(/&/g, " ").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const tokens = (s) => slug(s).split("-").filter((t) => t && !IGNORAR.has(t) && !/^\d+(ml|g|l|x)?$/.test(t));

const mapa = new Map();
if (fs.existsSync("imagens-mapa.csv")) {
  for (const linha of fs.readFileSync("imagens-mapa.csv", "utf8").split(/\r?\n/)) {
    const [f, url] = linha.split(";").map((x) => x && x.trim());
    if (f && url) mapa.set(f.toLowerCase(), url);
  }
}

function listar(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return listar(p);
    return /\.(jpe?g|png|webp|tiff?|avif)$/i.test(d.name) ? [p] : [];
  });
}

function marcaDoCaminho(f) {
  for (const parte of path.relative(pasta, f).split(path.sep).slice(0, -1)) {
    const m = ALIAS_MARCA[slug(parte)];
    if (m) return m;
  }
  const nome = slug(path.basename(f));
  for (const [k, v] of Object.entries(ALIAS_MARCA)) if (nome.startsWith(k + "-")) return v;
  return null;
}

function melhorProduto(f) {
  const manual = mapa.get(path.basename(f).toLowerCase());
  if (manual) return { item: produtos.find((x) => x.produto.url === manual), pontos: 1 };
  const marca = marcaDoCaminho(f);
  const tf = new Set(tokens(path.basename(f, path.extname(f))));
  let melhor = null;
  for (const item of produtos) {
    if (marca && item.marca.slug !== marca) continue;
    const tp = tokens(item.produto.nome);
    if (!tp.length) continue;
    const certos = tp.filter((t) => tf.has(t)).length;
    const extra = [...tf].filter((t) => !tp.includes(t)).length;
    const pontos = certos / tp.length - extra * 0.05;
    if (!melhor || pontos > melhor.pontos) melhor = { item, pontos };
  }
  return melhor && melhor.pontos >= 0.75 ? melhor : { item: null, pontos: melhor ? melhor.pontos : 0 };
}

const relatorio = ["ficheiro;resultado;produto;destino"];
const usados = new Set();
let ok = 0;
for (const f of listar(pasta)) {
  const { item, pontos } = melhorProduto(f);
  if (!item) { relatorio.push(`${f};SEM CORRESPONDÊNCIA (${pontos.toFixed(2)});;`); continue; }
  const destino = path.join("src/assets/img/produtos", item.marca.slug, `${item.produto.slug}.webp`);
  if (fs.existsSync(destino) && !forcar && !usados.has(destino)) { relatorio.push(`${f};JÁ EXISTE;${item.produto.nome};${destino}`); usados.add(destino); continue; }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  // Corta a margem branca do original, para o produto ocupar a moldura de forma igual em todas as fotos
  const limpo = await sharp(f).rotate().flatten({ background: "#ffffff" }).trim({ background: "#ffffff", threshold: 12 }).toBuffer();
  await sharp(limpo).resize(1000, 1000, { fit: "contain", background: "#ffffff" })
    .extend({ top: 100, bottom: 100, left: 100, right: 100, background: "#ffffff" })
    .flatten({ background: "#ffffff" }).webp({ quality: 85 }).toFile(destino);
  usados.add(destino); ok++;
  relatorio.push(`${f};OK;${item.produto.nome};${destino}`);
}

relatorio.push("", "PRODUTOS SEM IMAGEM;;;");
for (const { produto, marca } of produtos) {
  const tem = ["webp", "jpg", "jpeg", "png"].some((e) => fs.existsSync(path.join("src/assets/img/produtos", marca.slug, `${produto.slug}.${e}`)));
  if (!tem) relatorio.push(`;${marca.nomeCurto};${produto.nome};src/assets/img/produtos/${marca.slug}/${produto.slug}.webp`);
}
fs.writeFileSync("relatorio-imagens.csv", "﻿" + relatorio.join("\n"));
console.log(`${ok} imagens convertidas. Ver relatorio-imagens.csv.`);
