# Site SALE.ON (Netlify)

Site estático gerado com [Eleventy](https://www.11ty.dev/). Todo o catálogo vive em ficheiros de dados, um por marca: para mudar produtos, não é preciso mexer no código das páginas.

- 5 marcas, 46 linhas, 281 produtos, cada um com página própria
- Loja CALECIM® com botões de pagamento Stripe
- Formulários (contacto, condições profissionais, O&M Color Talent) com Netlify Forms
- SEO: títulos e descrições por página, dados estruturados (Organization, Brand, Product, BreadcrumbList), sitemap.xml, robots.txt e redirecionamentos 301 dos endereços antigos

## Estrutura

| Onde | O quê |
| --- | --- |
| `src/_catalogo/*.json` | Catálogo de cada marca: textos da marca, linhas e produtos |
| `src/_data/site.json` | Nome, morada, contactos, redes sociais, email da loja |
| `src/assets/img/produtos/<marca>/` | Fotografias dos produtos |
| `src/_redirects` | Redirecionamentos dos endereços antigos do Squarespace |
| `src/*.njk` | Páginas (início, marca, linha, produto, loja, etc.) |
| `src/assets/css/site.css` | Estilos |

## 1. Pôr o site no ar na Netlify

1. Criar uma conta em netlify.com e ligar um repositório (GitHub) com esta pasta, ou arrastar a pasta para "Deploy manually" depois de correr `npm install && npm run build` (nesse caso arrasta-se a pasta `_site`).
2. Com repositório, a Netlify lê o `netlify.toml` sozinha: comando `npm run build`, pasta `_site`.
3. Em **Forms**, ativar a deteção de formulários e definir o email que recebe as notificações.

## 2. Mudar o domínio do Squarespace para a Netlify

1. Antes de mudar: no Google Search Console, exportar as páginas indexadas de saleon.pt e confirmar que cada endereço antigo tem uma linha em `src/_redirects`.
2. Na Netlify: **Domain management → Add domain → www.saleon.pt**.
3. No fornecedor do domínio (ou no Squarespace Domains), apontar o DNS para a Netlify: registo `CNAME www → <o-site>.netlify.app` e registo `A @ → 75.2.60.5` (ou mudar os nameservers para os da Netlify). A Netlify emite o certificado HTTPS automaticamente.
4. Depois de o site novo responder, submeter `https://www.saleon.pt/sitemap.xml` no Google Search Console.
5. Só então cancelar o plano do Squarespace.

## 3. Fotografias dos produtos

Cada produto procura a sua fotografia em `src/assets/img/produtos/<marca>/<produto>.webp` (também aceita `.jpg` ou `.png`). Enquanto não existir, o site mostra um marcador com o nome do produto.

A lista completa dos nomes de ficheiro esperados está em `IMAGENS-PRODUTOS.csv`. Recomendado: fundo branco, quadrado, 1200 × 1200 px, formato WebP.

Imagem de partilha nas redes: `src/assets/img/og-saleon.jpg` (1200 × 630). Logótipo para o Google: `src/assets/img/logo-saleon.png`.

## 3b. Logótipos e fotografias de ambiente

| Ficheiro | Onde aparece |
| --- | --- |
| `src/assets/img/logos/saleon.svg` | Topo do site (SVG ou PNG transparente) |
| `src/assets/img/logos/<marca>.svg` | Faixa de marcas, cartões e topo da página da marca. Nomes: `glynt`, `original-mineral`, `graham-hill`, `calecim`, `pahi` |
| `src/assets/img/fotos/inicio-1.jpg` … `inicio-8.jpg` | Fotografias do topo da página inicial, em sequência: cada uma ganha nitidez e volta a desfocar-se. Horizontais, 2400 × 1350 px, motivo à direita |
| `src/assets/img/fotos/<marca>.webp` | Fotografia do topo de cada marca (horizontal 5:4, ≥ 1600 px de largura) |

Sem ficheiro, o site mostra o nome em texto ou um marcador. Basta copiar o ficheiro e voltar a publicar.

### Converter fotografias de produto automaticamente

```
npm run imagens -- caminho/para/pasta
```

O script associa cada ficheiro ao produto pelo nome (ex.: `GLYNT_REVITAL_Mask_200ml.jpg` → REVITAL Mask), converte para WebP 1200 × 1200 com fundo branco e grava no sítio certo. Subpastas com o nome da marca (`glynt`, `om`, `graham-hill`, `calecim`, `pahi`) evitam confusões. O ficheiro `relatorio-imagens.csv` lista o que foi associado, o que falhou e os produtos ainda sem imagem. Para forçar uma associação: `imagens-mapa.csv` com `ficheiro.jpg;/marcas/glynt/revital/revital-mask/`.

## 4. Loja CALECIM® (Stripe Payment Links)

1. Na Stripe, criar um produto e um **Payment Link** para cada artigo (com envio e NIF na fatura, se necessário).
2. Em `src/_catalogo/calecim.json`, preencher em cada produto `"preco": 99.00` e `"stripe": "https://buy.stripe.com/..."`.
3. Enquanto `preco` ou `stripe` estiverem vazios, o botão é "Encomendar por email".

## 5. Acrescentar ou corrigir produtos

Editar o JSON da marca. Cada produto tem `nome`, `tamanhos` (lista), `descricao` e, se for só de salão, `"uso": "Salão"`. O endereço da página é criado a partir do nome.

## Antes de publicar: o que falta preencher

- Textos legais em `src/paginas-simples.njk` (privacidade e termos da loja): denominação social, NIF, envios, devoluções. Validar com jurista.
- Preços em euros e Payment Links da CALECIM®.
- Fotografias de produtos, imagem de partilha e logótipo.
- Confirmar as contas de Instagram em `src/_data/site.json`.
- Rever as descrições dos produtos com os catálogos oficiais (foram adaptadas dos sites das marcas). As alegações da CALECIM® devem ser validadas para a UE.
- Coloração profissional GLYNT (SHADOWS, Blond System) e CØR.color: acrescentar as referências de tons quando houver o catálogo profissional.

## Trabalhar localmente

```
npm install
npm start        # pré-visualização em http://localhost:8080
npm run build    # gera a pasta _site
```

## Categorias, montra e pesquisa

- `src/_data/categorias.json`: as categorias profissionais (o que o salão procura). Cada categoria junta linhas de várias marcas (`"marca/linha"`) e escolhe até 4 produtos para a imagem (`"montra"`).
- `"montra"` em cada `src/_catalogo/<marca>.json`: os 4 produtos que representam a marca no Universo SALE.ON e no topo da página da marca, enquanto não houver fotografia de campanha.
- A pesquisa (`/pesquisa/`) usa o ficheiro `/pesquisa.json`, gerado automaticamente a partir do catálogo.
- Fotografia da página inicial: `src/assets/img/fotos/equipa.webp` (e `equipa-mobile.webp`).
- Tipo de letra: Arimo (SIL OFL), alojado em `src/assets/fonts/`.
