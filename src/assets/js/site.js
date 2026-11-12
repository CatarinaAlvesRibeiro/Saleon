// Menu em ecrãs pequenos
const botao = document.querySelector(".menu-botao");
const menu = document.getElementById("menu");
if (botao && menu) {
  botao.addEventListener("click", () => {
    const aberto = menu.classList.toggle("aberto");
    botao.setAttribute("aria-expanded", String(aberto));
  });
}

// Preenche os formulários a partir do endereço (?assunto=, ?produto=, ?marca=)
const params = new URLSearchParams(location.search);
document.querySelectorAll("form[data-prefill]").forEach((form) => {
  form.querySelectorAll("[data-param]").forEach((campo) => {
    const v = params.get(campo.dataset.param);
    if (v) campo.value = v;
  });
  const marca = params.get("marca");
  if (marca) {
    form.querySelectorAll("[data-marca]").forEach((c) => {
      if (c.dataset.marca === marca) c.checked = true;
    });
  }
});

// Assistente de ajuda: abre e fecha o painel de perguntas
const ajuda = document.querySelector("[data-ajuda]");
if (ajuda) {
  const painel = ajuda.querySelector(".ajuda__painel");
  const abrir = ajuda.querySelector("[data-ajuda-abrir]");
  const muda = (estado) => { painel.hidden = !estado; abrir.setAttribute("aria-expanded", String(estado)); ajuda.classList.toggle("aberto", estado); };
  abrir.addEventListener("click", () => muda(painel.hidden));
  ajuda.querySelector("[data-ajuda-fechar]").addEventListener("click", () => muda(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") muda(false); });
}

// Menus Marcas e Categorias: abrem ao passar o rato e mantêm-se abertos
// enquanto o rato viaja até ao item, mesmo passando por cima de outro menu.
(() => {
  document.documentElement.classList.add("js");
  const megas = [...document.querySelectorAll("li.mega, li.menu__sub")];
  if (!megas.length) return;
  const largo = window.matchMedia("(min-width: 901px)");
  let temporizador;
  const abrir = (li) => megas.forEach((m) => m.classList.toggle("aberto", m === li));
  const fechar = () => megas.forEach((m) => m.classList.remove("aberto"));
  megas.forEach((li) => {
    li.addEventListener("mouseenter", () => {
      if (!largo.matches) return;
      clearTimeout(temporizador);
      const outroAberto = megas.some((m) => m !== li && m.classList.contains("aberto"));
      if (outroAberto) temporizador = setTimeout(() => abrir(li), 260); else abrir(li);
    });
    li.addEventListener("mouseleave", () => {
      if (!largo.matches) return;
      clearTimeout(temporizador);
      temporizador = setTimeout(fechar, 350);
    });
    li.addEventListener("focusin", () => { if (largo.matches) { clearTimeout(temporizador); abrir(li); } });
    li.addEventListener("focusout", (e) => { if (largo.matches && !li.contains(e.relatedTarget)) li.classList.remove("aberto"); });
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
})();

// Assistente de produto: duas perguntas em dropdown e o produto mais recomendado
(() => {
  const caixas = document.querySelectorAll("[data-assistente]");
  if (!caixas.length) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let dados = null;
  const carregar = () => dados ? Promise.resolve() : fetch("/assistente.json").then((r) => r.json()).then((d) => { dados = d; });
  const img = (p, cls) => p.i ? `<img class="${cls}" src="${p.i}" alt="${esc(p.m + " " + p.n)}" loading="lazy" width="600" height="600">` : `<div class="marcador ${cls}"><span class="marcador__marca">${esc(p.m)}</span><span class="marcador__nome">${esc(p.n)}</span></div>`;
  const cartao = (p) => `<a class="cartao" href="${p.u}">${img(p, "cartao__img")}<span class="cartao__corpo"><span class="cartao__nome">${esc(p.n)}</span><span class="cartao__desc">${esc(p.m)} · ${esc(p.l)}</span></span></a>`;
  caixas.forEach((caixa) => {
    const p1 = caixa.querySelector("[data-p1]"), p2 = caixa.querySelector("[data-p2]"), p2w = caixa.querySelector("[data-p2w]"), res = caixa.querySelector(".assistente__res");
    const opcoes = JSON.parse(caixa.querySelector("[data-opcoes]").textContent);
    const limpar = () => { res.hidden = true; res.innerHTML = ""; };
    p1.addEventListener("change", () => {
      limpar();
      const lista = opcoes.filter((o) => o.g === p1.value);
      p2.innerHTML = `<option value="">Escolhe uma opção</option>` + lista.map((o) => `<option value="${o.id}">${esc(o.n)}</option>`).join("");
      p2w.hidden = !p1.value;
      if (lista.length === 1) { p2.value = lista[0].id; p2.dispatchEvent(new Event("change")); }
    });
    p2.addEventListener("change", () => {
      if (!p2.value) return limpar();
      carregar().then(() => {
        const n = dados.find((x) => x.id === p2.value);
        if (!n || !n.produtos.length) return limpar();
        const [top, ...outros] = n.produtos;
        const eCalecim = (p) => p.m.indexOf("CALECIM") === 0;
        let nota = eCalecim(top)
          ? "Esta recomendação não dispensa uma consulta na clínica, no dermatologista ou no salão."
          : "Esta recomendação não dispensa a consulta no teu salão. Fala com o teu cabeleireiro para mais detalhes.";
        if (!eCalecim(top) && outros.slice(0, 3).some(eCalecim)) nota += " No caso da CALECIM®, consulta também a clínica ou o dermatologista.";
        res.hidden = false;
        res.innerHTML = `<div class="recomendado"><a class="recomendado__img" href="${top.u}">${img(top, "")}</a><div class="recomendado__texto"><p class="sobretitulo">O mais recomendado · ${esc(n.n)}</p><h3>${esc(top.n)}</h3><p class="recomendado__marca">${esc(top.m)} · ${esc(top.l)}</p><p>${esc(top.d)}</p><div class="botoes"><a class="botao" href="${top.u}">${top.l === "Linha completa" ? "Ver a linha" : "Ver o produto"}</a><button type="button" class="botao botao--contorno-escuro" data-recomecar>Recomeçar</button></div><p class="recomendado__nota">${nota}</p></div></div>`
          + (outros.length ? `<h4 class="assistente__tambem">Também indicado</h4><div class="grelha grelha--produtos">${outros.slice(0, 4).map(cartao).join("")}</div>` : "")
          + `<p class="assistente__linhas">Ver a linha completa: ${n.linhas.map((l) => `<a href="${l.u}">${esc(l.n)}</a>`).join(" · ")}</p>`;
        res.querySelector("[data-recomecar]").addEventListener("click", () => { p1.value = ""; p2w.hidden = true; limpar(); p1.focus(); });
        res.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  });
})();

// Galeria: visor de fotografias (capa + clique abre as restantes da mesma formação)
(() => {
  const visor = document.getElementById("visor");
  if (!visor) return;
  const img = visor.querySelector("img");
  let lista = [], atual = 0;
  const ver = (i) => { if (!lista.length) return; atual = (i + lista.length) % lista.length; img.src = lista[atual]; };
  const abrir = (l, i) => { lista = l; ver(i); visor.showModal(); };
  document.querySelectorAll("[data-fotos]").forEach((el) => {
    let l = [];
    try { l = JSON.parse(el.getAttribute("data-fotos")); } catch (e) { l = [el.getAttribute("href")]; }
    el.addEventListener("click", (e) => { e.preventDefault(); abrir(l, 0); });
  });
  const destaque = [...document.querySelectorAll(".galeria--destaque [data-foto]")];
  if (destaque.length) {
    const grupo = destaque.map((f) => f.getAttribute("href"));
    destaque.forEach((f, i) => f.addEventListener("click", (e) => { e.preventDefault(); abrir(grupo, i); }));
  }
  visor.querySelector(".visor__fechar").addEventListener("click", () => visor.close());
  visor.querySelector(".visor__seta--ant").addEventListener("click", () => ver(atual - 1));
  visor.querySelector(".visor__seta--seg").addEventListener("click", () => ver(atual + 1));
  visor.addEventListener("click", (e) => { if (e.target === visor) visor.close(); });
  visor.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") ver(atual - 1); if (e.key === "ArrowRight") ver(atual + 1); });
})();

// Aprender: filtro por marca e vídeo carregado só ao clicar
(() => {
  const filtros = [...document.querySelectorAll("[data-filtro]")];
  filtros.forEach((b) => b.addEventListener("click", () => {
    filtros.forEach((x) => x.classList.toggle("ativo", x === b));
    document.querySelectorAll(".video").forEach((v) => { v.hidden = !!b.dataset.filtro && v.dataset.marca !== b.dataset.filtro; });
  }));
  document.querySelectorAll("[data-youtube]").forEach((b) => b.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.youtube}?autoplay=1&rel=0`;
    f.allow = "autoplay; fullscreen; picture-in-picture"; f.allowFullscreen = true; f.title = b.getAttribute("aria-label");
    const d = document.createElement("div"); d.className = "video__capa"; d.appendChild(f); b.replaceWith(d);
  }));
})();

// Aprender: acesso aos tutoriais em troca do email
(() => {
  const portao = document.querySelector("[data-portao]");
  if (!portao) return;
  const chave = "saleon-aprender";
  const abrir = () => { document.body.classList.add("aprender-aberto"); portao.hidden = true; };
  try { if (localStorage.getItem(chave)) abrir(); } catch (e) {}
  const form = portao.querySelector("form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const dados = new URLSearchParams(new FormData(form)).toString();
    const fim = () => { try { localStorage.setItem(chave, "1"); } catch (err) {} abrir(); };
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: dados }).then(fim, fim);
  });
  document.querySelectorAll(".video__cadeado").forEach((b) => b.addEventListener("click", () => { portao.scrollIntoView({ behavior: "smooth", block: "center" }); portao.querySelector("input[name=nome]").focus({ preventScroll: true }); }));
})();

// Percurso (página Sobre): os passos aparecem com o scroll e a linha vai-se preenchendo
(() => {
  const lista = document.querySelector("[data-percurso]");
  if (!lista) return;
  const passos = [...lista.querySelectorAll(".percurso__passo")];
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { passos.forEach((p) => p.classList.add("visivel")); lista.style.setProperty("--progresso", "100%"); return; }
  lista.classList.add("animado");
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visivel"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -18% 0px", threshold: 0.15 });
  passos.forEach((p) => io.observe(p));
  const medir = () => { const r = lista.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (window.innerHeight * 0.72 - r.top) / r.height)); lista.style.setProperty("--progresso", (p * 100).toFixed(1) + "%"); };
  window.addEventListener("scroll", medir, { passive: true }); window.addEventListener("resize", medir); medir();
})();
