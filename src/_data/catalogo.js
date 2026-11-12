// Junta os ficheiros JSON de cada marca (src/_catalogo/*.json)
// e prepara as listas usadas para gerar as páginas de marca, linha e produto.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(aqui, "..", "_catalogo");
const raizImg = path.join(aqui, "..", "assets", "img", "produtos");
const EXT = ["webp", "jpg", "jpeg", "png"];
function imagemDe(marcaSlug, slug) {
  for (const e of EXT) {
    if (fs.existsSync(path.join(raizImg, marcaSlug, `${slug}.${e}`))) return `/assets/img/produtos/${marcaSlug}/${slug}.${e}`;
  }
  return "";
}

function slugify(str) {
  return String(str)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/Ø/g, "o").replace(/ø/g, "o")
    .replace(/&/g, " e ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function () {
  const marcas = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .sort((a, b) => a.ordem - b.ordem);

  const linhas = [];
  const produtos = [];

  for (const marca of marcas) {
    marca.nomeCurto = marca.nomeCurto || marca.nome;
    marca.url = `/marcas/${marca.slug}/`;
    marca.totalProdutos = 0;
    const grupos = [];
    for (const linha of marca.linhas) {
      linha.url = `${marca.url}${linha.slug}/`;
      linha.marcaSlug = marca.slug;
      if (!grupos.includes(linha.grupo)) grupos.push(linha.grupo);
      const vistos = new Set();
      for (const p of linha.produtos) {
        let slug = p.slug || slugify(p.nome);
        while (vistos.has(slug)) slug += "-2";
        vistos.add(slug);
        p.slug = slug;
        p.url = `${linha.url}${slug}/`;
        p.marcaSlug = marca.slug;
        p.linhaSlug = linha.slug;
        p.tamanhos = p.tamanhos || [];
        p.img = imagemDe(marca.slug, slug);
        produtos.push({ produto: p, linha, marca });
        marca.totalProdutos++;
      }
      linha.imagens = linha.produtos.filter((p) => p.img).slice(0, 3).map((p) => p.img);
      linhas.push({ linha, marca });
    }
    marca.grupos = grupos.map((g) => ({ nome: g, linhas: marca.linhas.filter((l) => l.grupo === g) }));
    // Imagens de montra da marca: o produto principal de linhas diferentes
    const escolha = (marca.montra || []).map((u) => produtos.find((x) => x.marca === marca && `${x.linha.slug}/${x.produto.slug}` === u)?.produto.img).filter(Boolean);
    for (const l of marca.linhas) { if (escolha.length >= 4) break; const i = l.imagens[0]; if (i && !escolha.includes(i)) escolha.push(i); }
    marca.imagens = escolha.slice(0, 4);
  }

  // Categorias profissionais (o que o salão procura), definidas em _data/categorias.json
  const defs = JSON.parse(fs.readFileSync(path.join(aqui, "categorias.json"), "utf8"));
  const categorias = defs.map((c) => {
    const blocos = c.linhas.map((ref) => {
      const [m, l] = ref.split("/");
      const marca = marcas.find((x) => x.slug === m);
      const linha = marca && marca.linhas.find((x) => x.slug === l);
      return linha ? { marca, linha } : null;
    }).filter(Boolean);
    const imagens = (c.montra || []).map((r) => { const [m, , pr] = r.split("/"); return imagemDe(m, pr); }).filter(Boolean);
    for (const b of blocos) { if (imagens.length >= 4) break; const i = b.linha.imagens[0]; if (i && !imagens.includes(i)) imagens.push(i); }
    const marcasCat = [...new Set(blocos.map((b) => b.marca))];
    const total = blocos.reduce((n, b) => n + b.linha.produtos.length, 0);
    return { ...c, url: `/categorias/${c.slug}/`, blocos, imagens, marcas: marcasCat, total };
  });
  for (const c of categorias) for (const b of c.blocos) { b.linha.categorias = (b.linha.categorias || []).concat([{ nome: c.nome, url: c.url }]); }

  return { marcas, linhas, produtos, categorias };
}
