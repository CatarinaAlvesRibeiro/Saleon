import fs from "node:fs";
import path from "node:path";

const EXT = ["webp", "jpg", "jpeg", "png", "avif"];

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });

  // Devolve o caminho público da imagem de um produto, se o ficheiro existir.
  // Convenção: src/assets/img/produtos/<marca>/<produto>.webp (ou jpg/png)
  // Imagem de cena do produto (resultado, tom): src/assets/img/produtos/<marca>/cena/<slug>.webp
  eleventyConfig.addFilter("imagemCena", (produto) => {
    const rel = `assets/img/produtos/${produto.marcaSlug}/cena/${produto.slug}.webp`;
    return fs.existsSync(path.join("src", rel)) ? `/${rel}` : "";
  });
  eleventyConfig.addFilter("comCena", (lista) => (lista || []).filter((p) => fs.existsSync(path.join("src", `assets/img/produtos/${p.marcaSlug}/cena/${p.slug}.webp`))));

  eleventyConfig.addFilter("imagemProduto", (produto) => {
    for (const ext of EXT) {
      const rel = `assets/img/produtos/${produto.marcaSlug}/${produto.slug}.${ext}`;
      if (fs.existsSync(path.join("src", rel))) return `/${rel}`;
    }
    return "";
  });

  // Imagem de marca/linha: src/assets/img/marcas/<marca>[-<linha>].webp
  eleventyConfig.addFilter("imagemMarca", (nome) => {
    for (const ext of EXT) {
      const rel = `assets/img/marcas/${nome}.${ext}`;
      if (fs.existsSync(path.join("src", rel))) return `/${rel}`;
    }
    return "";
  });

  // Logótipos: src/assets/img/logos/<nome>.svg|png|webp (ex.: saleon, glynt, original-mineral)
  const procura = (pasta, nome, exts) => {
    for (const ext of exts) {
      const rel = `assets/img/${pasta}/${nome}.${ext}`;
      if (fs.existsSync(path.join("src", rel))) return `/${rel}`;
    }
    return "";
  };
  eleventyConfig.addFilter("logo", (nome) => procura("logos", nome, ["svg", "png", "webp"]));
  // Fotografias de ambiente: src/assets/img/fotos/<nome>.jpg|webp (ex.: inicio, glynt)
  eleventyConfig.addFilter("foto", (nome) => procura("fotos", nome, ["webp", "jpg", "jpeg", "avif", "png"]));

  // Sequência de fotografias do topo da página inicial: fotos/inicio-1 … inicio-8
  eleventyConfig.addFilter("fotosSequencia", (prefixo) => {
    const lista = [];
    for (let i = 1; i <= 8; i++) {
      const f = procura("fotos", `${prefixo}-${i}`, ["webp", "jpg", "jpeg", "avif", "png"]);
      if (f) lista.push(f);
    }
    return lista;
  });

  eleventyConfig.addFilter("absoluto", (url, base) => new URL(url, base).href);
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("setAttribute", (obj, k, v) => ({ ...obj, [k]: v }));
  eleventyConfig.addFilter("limitar_lista", (l, n) => (l || []).slice(0, n));
  // Título SEO: mantém o início (o mais importante) e corta segmentos finais até caber em 60 caracteres.
  const semEntidades = (t) => String(t || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  eleventyConfig.addFilter("texto", semEntidades);
  eleventyConfig.addFilter("tituloSeo", (t) => {
    let partes = semEntidades(t).split(" | ").map((x) => x.trim()).filter(Boolean);
    while (partes.length > 1 && partes.join(" | ").length > 60) {
      if (partes.length > 2) partes.splice(partes.length - 2, 1); else partes.pop();
    }
    return partes.join(" | ");
  });
  eleventyConfig.addFilter("euro", (v) =>
    v == null ? "" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v)
  );
  eleventyConfig.addFilter("limitar", (txt, n = 155) => {
    const s = String(txt || "").replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
  });
  eleventyConfig.addFilter("produtoPorUrl", (lista, url) => lista.find((x) => x.produto.url === url));
  eleventyConfig.addFilter("marcaPorSlug", (marcas, slug) => marcas.find((m) => m.slug === slug));
  eleventyConfig.addFilter("primeiraLetra", (s) => String(s || "").trim().charAt(0));
  eleventyConfig.addGlobalData("versao", () => Date.now().toString(36));
  eleventyConfig.addGlobalData("ano", () => new Date().getFullYear());
  eleventyConfig.addGlobalData("dataBuild", () => new Date().toISOString().slice(0, 10));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
