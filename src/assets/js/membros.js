// Área de membro (demonstração): tudo fica guardado no browser, sem servidor.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ø/g, "o").replace(/[^a-z0-9]+/g, " ").trim();
  const entrada = $("[data-entrada]"), area = $("[data-area]");
  let membro = ler("saleon-membro", null), lista = ler("saleon-lista", []), ultima = ler("saleon-ultima", null), produtos = [];

  const mostrar = () => {
    entrada.hidden = !!membro; area.hidden = !membro;
    if (!membro) return;
    $("[data-salao]").textContent = membro.salao;
    try { localStorage.setItem("saleon-aprender", "1"); } catch {}
    fetch("/pesquisa.json").then((r) => r.json()).then((d) => { produtos = d; desenhar(); });
    alertas();
  };
  $("[data-entrar]").addEventListener("submit", (e) => { e.preventDefault(); const f = new FormData(e.target); membro = { salao: f.get("salao"), email: f.get("email") }; gravar("saleon-membro", membro); mostrar(); window.scrollTo(0, 0); });
  $("[data-sair]").addEventListener("click", () => { membro = null; try { localStorage.removeItem("saleon-membro"); } catch {} mostrar(); });

  const linha = (p, acao) => `<li><img src="${p.i || ""}" alt="" width="52" height="52" loading="lazy"><span><strong>${esc(p.n)}</strong><small>${esc(p.m)} · ${esc(p.l)}</small></span>${acao}</li>`;
  const juntar = (u) => { const i = lista.find((x) => x.u === u); if (i) i.q += 1; else lista.push({ u, q: 1 }); gravar("saleon-lista", lista); desenhar(); };
  const desenhar = () => {
    const itens = lista.map((x) => ({ ...x, p: produtos.find((p) => p.u === x.u) })).filter((x) => x.p);
    $("[data-vazia]").hidden = itens.length > 0; $("[data-encomenda]").hidden = itens.length === 0;
    $("[data-itens]").innerHTML = itens.map((x) => linha(x.p, `<span class="qtd"><button type="button" data-menos="${x.u}" aria-label="Menos">−</button><b>${x.q}</b><button type="button" data-mais="${x.u}" aria-label="Mais">+</button></span>`)).join("");
    // Recomendações: outros produtos das mesmas linhas que ainda não estão na lista
    const na = new Set(lista.map((x) => x.u)); const rec = [];
    for (const x of itens) for (const p of produtos) if (p.m === x.p.m && p.l === x.p.l && !na.has(p.u) && !rec.includes(p)) rec.push(p);
    $("[data-recomenda]").hidden = rec.length === 0;
    $("[data-recomenda-lista]").innerHTML = rec.slice(0, 4).map((p) => linha(p, `<button type="button" class="botao botao--pequeno" data-juntar="${p.u}">Juntar</button>`)).join("");
  };
  const alertas = () => {
    const a = [];
    if (ultima) { const dias = Math.floor((Date.now() - ultima.quando) / 864e5); a.push(`A tua última encomenda foi ${dias === 0 ? "hoje" : "há " + dias + (dias === 1 ? " dia" : " dias")} (${ultima.itens} ${ultima.itens === 1 ? "produto" : "produtos"}). Confirma se ainda tens stock.`); }
    else a.push("Exemplo de alerta: “Encomendaste CØR.color há 5 semanas. Confirma se ainda tens stock.”");
    $("[data-alertas]").hidden = false; $("[data-alertas-lista]").innerHTML = a.map((t) => `<li>${esc(t)}</li>`).join("");
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-juntar],[data-mais],[data-menos]"); if (!t) return;
    if (t.dataset.juntar) juntar(t.dataset.juntar);
    if (t.dataset.mais) juntar(t.dataset.mais);
    if (t.dataset.menos) { const i = lista.find((x) => x.u === t.dataset.menos); if (i && --i.q <= 0) lista = lista.filter((x) => x !== i); gravar("saleon-lista", lista); desenhar(); }
  });
  let espera; $("[data-procura]").addEventListener("input", (e) => { clearTimeout(espera); espera = setTimeout(() => {
    const q = norm(e.target.value).split(/\s+/).filter((w) => w.length > 1);
    $("[data-resultados]").innerHTML = q.length ? produtos.filter((p) => q.every((w) => norm(p.n + " " + p.m + " " + p.l).includes(w))).slice(0, 6).map((p) => linha(p, `<button type="button" class="botao botao--pequeno" data-juntar="${p.u}">Juntar</button>`)).join("") || `<li class="lista-vazia">Sem resultados.</li>` : "";
  }, 180); });
  $("[data-encomenda]").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.target;
    f.salao.value = membro.salao; f.email.value = membro.email;
    f.lista.value = lista.map((x) => { const p = produtos.find((p) => p.u === x.u); return `${x.q} x ${p ? p.m + " " + p.n : x.u}`; }).join("\n");
    const fim = () => { ultima = { quando: Date.now(), itens: lista.length }; gravar("saleon-ultima", ultima); lista = []; gravar("saleon-lista", lista); desenhar(); alertas(); $("[data-ok]").hidden = false; };
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(f)).toString() }).then(fim, fim);
  });
  mostrar();
})();
