// Área de membro: login por link mágico (sem palavra-passe), sessão validada
// no servidor (Netlify Functions + Blobs), lista de encomenda e sugestões.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ø/g, "o").replace(/[^a-z0-9]+/g, " ").trim();
  const entrada = $("[data-entrada]"), area = $("[data-area]");
  let membro = null, lista = ler("saleon-lista", []), ultima = ler("saleon-ultima", null), produtos = [], sugestoes = {};

  // --- Sessão ---
  const sessaoGuardada = () => ler("saleon-sessao", null);
  const gravarSessao = (token) => gravar("saleon-sessao", token);
  const limparSessao = () => { try { localStorage.removeItem("saleon-sessao"); } catch {} };

  async function validarSessao(token) {
    if (!token) return null;
    try {
      const r = await fetch(`/.netlify/functions/sessao-membro?s=${encodeURIComponent(token)}`);
      if (!r.ok) return null;
      const d = await r.json();
      return d.ok ? { email: d.email, salao: d.salao } : null;
    } catch { return null; }
  }

  async function arrancar() {
    // Um login novo chega como #sessao=TOKEN vindo do link do email.
    const m = location.hash.match(/sessao=([a-f0-9]+)/);
    if (m) { gravarSessao(m[1]); history.replaceState(null, "", location.pathname + location.search); }

    const params = new URLSearchParams(location.search);
    if (params.get("erro") === "expirado") $("[data-pedir-link-estado]").hidden = false, ($("[data-pedir-link-estado]").textContent = "Esse link expirou. Pede um novo abaixo.");

    const token = sessaoGuardada();
    if (token) {
      const info = await validarSessao(token);
      if (info) { membro = { ...info, sessao: token }; mostrar(); return; }
      limparSessao();
      $("[data-sessao-invalida]").hidden = false;
    }
    mostrar();
  }

  const mostrar = () => {
    entrada.hidden = !!membro; area.hidden = !membro;
    if (!membro) return;
    $("[data-salao]").textContent = membro.salao;
    Promise.all([
      fetch("/pesquisa.json").then((r) => r.json()),
      fetch("/sugestoes-membro.json").then((r) => r.json()).catch(() => ({})),
    ]).then(([p, s]) => { produtos = p; sugestoes = s || {}; desenhar(); });
    alertas();
  };

  // --- Pedir link de acesso ---
  $("[data-pedir-link]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector("button"), estado = $("[data-pedir-link-estado]");
    const email = new FormData(f).get("email");
    btn.disabled = true; btn.textContent = "A enviar…";
    try {
      const r = await fetch("/.netlify/functions/pedir-acesso-membro", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      const d = await r.json();
      estado.hidden = false; estado.textContent = d.mensagem || "Se este email tiver acesso aprovado, vais receber um link.";
      f.reset();
    } catch {
      estado.hidden = false; estado.textContent = "Não foi possível enviar o pedido agora. Tenta de novo.";
    } finally {
      btn.disabled = false; btn.textContent = "Enviar link de acesso";
    }
  });

  $("[data-sair]").addEventListener("click", async () => {
    const token = sessaoGuardada();
    if (token) fetch("/.netlify/functions/sair-membro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessao: token }) }).catch(() => {});
    limparSessao(); membro = null; mostrar();
  });

  // --- Lista de encomenda e sugestões manuais ---
  const linha = (p, acao) => `<li><img src="${p.i || ""}" alt="" width="52" height="52" loading="lazy"><span><strong>${esc(p.n)}</strong><small>${esc(p.m)} · ${esc(p.l)}</small></span>${acao}</li>`;
  const juntar = (u) => { const i = lista.find((x) => x.u === u); if (i) i.q += 1; else lista.push({ u, q: 1 }); gravar("saleon-lista", lista); desenhar(); };
  const desenhar = () => {
    const itens = lista.map((x) => ({ ...x, p: produtos.find((p) => p.u === x.u) })).filter((x) => x.p);
    $("[data-vazia]").hidden = itens.length > 0; $("[data-encomenda]").hidden = itens.length === 0;
    $("[data-itens]").innerHTML = itens.map((x) => linha(x.p, `<span class="qtd"><button type="button" data-menos="${x.u}" aria-label="Menos">−</button><b>${x.q}</b><button type="button" data-mais="${x.u}" aria-label="Mais">+</button></span>`)).join("");
    // Sugestões manuais: pares definidos pela SALE.ON ("quem compra X, vê sugestão de Y").
    const na = new Set(lista.map((x) => x.u)); const urls = new Set();
    for (const x of itens) for (const u of (sugestoes[x.u] || [])) if (!na.has(u)) urls.add(u);
    const rec = [...urls].map((u) => produtos.find((p) => p.u === u)).filter(Boolean);
    $("[data-recomenda]").hidden = rec.length === 0;
    $("[data-recomenda-lista]").innerHTML = rec.slice(0, 4).map((p) => linha(p, `<button type="button" class="botao botao--pequeno" data-juntar="${p.u}">Juntar</button>`)).join("");
  };
  const alertas = () => {
    const a = [];
    if (ultima) { const dias = Math.floor((Date.now() - ultima.quando) / 864e5); a.push(`A tua última encomenda foi ${dias === 0 ? "hoje" : "há " + dias + (dias === 1 ? " dia" : " dias")} (${ultima.itens} ${ultima.itens === 1 ? "produto" : "produtos"}). Confirma se ainda tens stock.`); }
    $("[data-alertas]").hidden = a.length === 0; $("[data-alertas-lista]").innerHTML = a.map((t) => `<li>${esc(t)}</li>`).join("");
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
  arrancar();
})();
