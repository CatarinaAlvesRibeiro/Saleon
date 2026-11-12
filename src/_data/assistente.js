// Assistente de produto: resolve cada necessidade (necessidades.json) em produtos reais do catálogo.
import fs from "node:fs";
import catalogo from "./catalogo.js";
const resumir = (t) => { if (t.length <= 220) return t; const c = t.slice(0, 220); const f = c.lastIndexOf(". "); return f > 80 ? c.slice(0, f + 1) : c.slice(0, c.lastIndexOf(" ")) + "…"; };
export default function () {
  const cat = catalogo();
  const lista = JSON.parse(fs.readFileSync(new URL("./necessidades.json", import.meta.url), "utf8"));
  return lista.map((n) => {
    const produtos = []; const linhas = [];
    for (const alvo of n.alvos) {
      const [ms, ls] = alvo.linha.split("/");
      const item = cat.linhas.find((x) => x.marca.slug === ms && x.linha.slug === ls);
      if (!item) continue;
      linhas.push({ n: `${item.marca.nomeCurto} ${item.linha.nome}`, u: item.linha.url });
      const filtros = alvo.filtro ? alvo.filtro.split("|") : null;
      const escolhidos = item.linha.produtos.filter((p) => !filtros || filtros.some((f) => p.nome.includes(f))).slice(0, filtros ? 3 : 3);
      for (const p of escolhidos) produtos.push({ n: p.nome, m: item.marca.nomeCurto, l: item.linha.nome, u: p.url, i: p.img || "", d: resumir(p.descricao || "") });
    }
    // Linhas por tons (cor): o mais recomendado é a linha, não um tom ao acaso.
    if (n.topLinha) {
      const [ms, ls] = n.alvos[0].linha.split("/");
      const item = cat.linhas.find((x) => x.marca.slug === ms && x.linha.slug === ls);
      if (item) produtos.unshift({ n: `${item.marca.nomeCurto} ${item.linha.nome}`, m: item.marca.nomeCurto, l: "Linha completa", u: item.linha.url, i: (item.linha.produtos.find((p) => p.img) || {}).img || "", d: (item.linha.descricao || item.linha.subtitulo || "").slice(0, 180) });
    }
    return { id: n.id, g: n.grupo, n: n.nome, t: n.termos, linhas, produtos: produtos.slice(0, 8) };
  });
}
