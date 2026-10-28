// Gerador do site estático da EP Energy.
// Lê o catálogo em fonte/dados/*.json e os conteúdos em fonte/paginas/, e grava o HTML final em site/.
// Uso: node fonte/gerar.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.resolve(RAIZ, "..", "site");
const IMG_PRODUTOS = path.join(SAIDA, "assets", "img", "produtos");

// Um único número: atende WhatsApp e ligações
const CONTATO = {
  telefone: "+55 (17) 99147-9585",
  telefoneHref: "tel:+5517991479585",
  whatsapp: "+55 (17) 99147-9585",
  whatsappNumero: "5517991479585",
  email: "danilo@ep-energy.com.br",
  cidade: "São José do Rio Preto, SP",
};
// Envio do formulário por e-mail via FormSubmit (serviço para sites estáticos, sem backend).
// No primeiro envio, o FormSubmit manda um e-mail de ativação para CONTATO.email: é preciso confirmar uma vez.
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${CONTATO.email}`;
const urlWhatsapp = (texto) => `https://wa.me/${CONTATO.whatsappNumero}?text=${encodeURIComponent(texto)}`;

const CDN = {
  bootstrapCss: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">',
  bootstrapJs: '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous" defer></script>',
};

/* --------------------------------------------------------------------------
   Catálogo
   -------------------------------------------------------------------------- */
const FONTES = [
  { arquivo: "gimi.json", fabricante: "GIMI" },
  { arquivo: "pogliano.json", fabricante: "GIMI Pogliano" },
  { arquivo: "bonomi.json", fabricante: "GIMI Bonomi" },
];

const CATEGORIAS = [
  {
    id: "media-tensao", nome: "Média tensão", titulo: "Cubículos de média tensão",
    resumo: "Cubículos blindados e modulares com isolação a ar, de 17,5 kV a 36 kV, para cabines primárias, indústrias e interface com subestações.",
    produtos: ["maggiore", "new-piccolo"], capa: "maggiore-1", interesse: "Média tensão",
  },
  {
    id: "media-tensao-compacta", nome: "Média tensão compacta", titulo: "Média tensão compacta: SF6 e livre de SF6",
    resumo: "Cubículos modulares compactos com isolação em SF6 até 36 kV, incluindo a versão livre de SF6.",
    produtos: ["gb-ring-sf6-free", "gb-ring", "microcompact", "esg-matic"], capa: "gb-ring-2", interesse: "Média tensão compacta",
  },
  {
    id: "baixa-tensao", nome: "Baixa tensão", titulo: "Quadros e painéis de baixa tensão",
    resumo: "Do quadro de distribuição de parede ao painel de 6300 A resistente ao arco interno, conforme NBR IEC 61439.",
    produtos: ["system-pro-e-power", "nottabile-arc-pro", "nottabile", "bimbo"], capa: "system-pro-e-power-1", interesse: "Baixa tensão",
  },
  {
    id: "barramentos", nome: "Barramentos e medição", titulo: "Barramentos blindados e medição centralizada",
    resumo: "Sistemas de barramentos blindados de baixa e média tensão e caixas de medição eletrônica centralizada.",
    produtos: ["bx-e", "bx-mt", "caixa-mec"], capa: "bx-e-1", interesse: "Barramentos e medição",
  },
];

// Correções de digitação presentes nos catálogos de origem (documentadas no README)
const CORRECOES = [
  [/\bexteno\b/g, "externo"], [/\bidenticados\b/g, "identificados"], [/\blongituadinalmente\b/g, "longitudinalmente"],
  [/participações metálicas/g, "partições metálicas"], [/\bprateameto\b/g, "prateamento"],
  [/\bCompartilhamento d/g, "Compartimento d"], [/coordenação parametrização/g, "coordenação e parametrização"],
  [/\bautosuportável\b/g, "autossuportável"], [/\bauto suportável\b/g, "autossuportável"],
  [/\b56-60\b/g, "50-60"], // frequência nominal: erro de digitação no catálogo Maggiore
];
const SIGLAS = ["NBR", "IEC", "TR", "ABNT", "TC", "TP", "TCs", "TPs", "QGBT", "CCM", "DPS", "IAC", "LSC2B", "PM", "ABB", "VD4", "HD4", "SF6", "RMU", "GIMI", "IP", "kV", "kA", "kVA", "MT", "BT", "NR"];

function limpar(texto) {
  if (texto == null) return "";
  let s = String(texto).replace(/\s+/g, " ").trim();
  // Referências internas da coleta, ex.: "(catálogo p.9)", "(folder Grupo GIMI)"
  s = s.replace(/\s*\((?:[^()]*\b)?(?:cat[aá]logo|folder|site|PDF)\b[^()]*\)/gi, "").replace(/\s+[–-]\s+(?:cat[aá]logo|folder)\b.*$/i, "").trim();
  for (const [de, para] of CORRECOES) s = s.replace(de, para);
  // "...31,5" nos catálogos significa "até 31,5"
  s = s.replace(/(^|\/\s*)\.\.\.\s*(?=\d)/g, "$1até ");
  // Valores iguais em todas as classes ("31,5 / 31,5 / 31,5") viram um só
  const partes = s.split(/\s+\/\s+/);
  if (partes.length > 1 && partes.every((p) => p === partes[0])) s = partes[0];
  // Trechos quase todos em caixa alta viram frase normal, preservando siglas
  const letras = s.replace(/[^A-Za-zÀ-ú]/g, "");
  const maiusculas = letras.replace(/[^A-ZÀ-Ý]/g, "").length;
  if (letras.length > 16 && maiusculas / letras.length > 0.85) s = suavizarMaiusculas(s);
  return s;
}

// Caixa alta → frase: minúscula em palavras comuns e longas; siglas curtas (IMS, QDC, ST1) preservadas
const PALAVRAS_CURTAS = new Set(["de", "da", "do", "das", "dos", "e", "em", "para", "com", "por", "a", "o", "as", "os", "no", "na", "nas", "nos", "ao", "tipo", "até", "sem", "uso", "fase", "terra", "linha", "chave", "peso"]);
const NOMES_PROPRIOS = { MAGGIORE: "Maggiore", NOTTABILE: "NoTTabile", PICCOLO: "Piccolo", BIMBO: "Bimbo", LEGGERO: "Leggero", ULTIMATE: "Ultimate", STANDARD: "Standard", MICROCOMPACT: "Microcompact", MATIC: "Matic", GIMI: "GIMI", NEOENERGIA: "Neoenergia", ENEL: "Enel" };
const UNIDADES = { KV: "kV", KVRMS: "kVrms", KA: "kA", HZ: "Hz", MM: "mm", KG: "kg", KVA: "kVA", KW: "kW" };
function suavizarMaiusculas(s) {
  const r = s.split(/([^A-Za-zÀ-ú0-9]+)/).map((p) => {
    if (!/[A-ZÀ-Ý]/.test(p) || p !== p.toUpperCase()) return p;
    if (UNIDADES[p]) return UNIDADES[p];
    if (NOMES_PROPRIOS[p]) return NOMES_PROPRIOS[p];
    if (SIGLAS.includes(p)) return p;
    if (PALAVRAS_CURTAS.has(p.toLowerCase()) || (p.length >= 5 && !/\d/.test(p))) return p.toLowerCase();
    return p;
  }).join("");
  return r.charAt(0).toUpperCase() + r.slice(1);
}
const NOMES = { "caixa-mec": "Caixa MEC", "gb-ring-sf6-free": "GB-RING SF6 Free" };
const semPontoFinal = (s) => limpar(s).replace(/[;,.]\s*$/, "");

function lerJson(nome) {
  const arq = path.join(RAIZ, "dados", nome);
  return fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, "utf8")) : null;
}

// Dimensões de JPEG (para width/height e evitar deslocamento de layout)
function dimensoesJpeg(arq) {
  const b = fs.readFileSync(arq);
  let i = 2;
  while (i < b.length) {
    const marcador = b[i + 1], tamanho = b.readUInt16BE(i + 2);
    if (marcador >= 0xc0 && marcador <= 0xc3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + tamanho;
  }
  return { w: 1200, h: 900 };
}

function imagem(base) {
  const grande = path.join(IMG_PRODUTOS, `${base}.jpg`);
  if (!fs.existsSync(grande)) return null;
  const pequena = path.join(IMG_PRODUTOS, `${base}-sm.jpg`);
  const temPequena = fs.existsSync(pequena);
  const d = dimensoesJpeg(grande), p = temPequena ? dimensoesJpeg(pequena) : d;
  return {
    src: `/assets/img/produtos/${base}.jpg`, w: d.w, h: d.h,
    srcSm: `/assets/img/produtos/${base}${temPequena ? "-sm" : ""}.jpg`, wSm: p.w, hSm: p.h,
  };
}

const produtos = new Map();
for (const fonte of FONTES) {
  const dados = lerJson(fonte.arquivo);
  if (!dados) continue;
  for (const p of dados.produtos) {
    const imagens = (p.imagens || [])
      .map((i) => ({ ...imagem(path.parse(i.arquivo).name), alt: limpar(i.alt) }))
      .filter((i) => i.src);
    // Miniatura de baixa resolução não pode ser a foto principal
    if (imagens.length > 1 && imagens[0].w < 600) {
      const maior = imagens.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
      imagens.splice(imagens.indexOf(maior), 1);
      imagens.unshift(maior);
    }
    const rotulo = (t) => { const s = semPontoFinal(t); return /[A-ZÀ-Ý]{5,}/.test(s) ? suavizarMaiusculas(s) : s; };
    const grupos = (p.especificacoes || []).map((g) => ({
      titulo: rotulo(g.grupo),
      itens: g.itens.map((i) => ({ nome: rotulo(i.nome), valor: limpar(i.valor) })).filter((i) => i.nome || i.valor),
    })).filter((g) => g.itens.length);
    produtos.set(p.slug, {
      slug: p.slug,
      nome: NOMES[p.slug] || limpar(p.nome),
      resumo: limpar(p.resumo),
      descricao: (p.descricao || []).map(limpar).filter(Boolean),
      caracteristicas: (p.caracteristicas || []).map(semPontoFinal).filter(Boolean),
      aplicacoes: (p.aplicacoes || []).map(semPontoFinal).filter(Boolean),
      normas: [...new Set((p.normas || []).map(semPontoFinal).filter(Boolean))],
      grupos,
      tabelas: p.tabelas || [],
      pdf: p.catalogo_pdf || null,
      origem: p.url_origem || dados.site,
      fabricante: fonte.fabricante,
      siteFabricante: dados.site,
      imagens,
    });
  }
}

const categorias = CATEGORIAS.map((c) => ({ ...c, itens: c.produtos.map((s) => produtos.get(s)).filter(Boolean) }))
  .filter((c) => c.itens.length);
for (const c of categorias) for (const p of c.itens) p.categoria = c;

const service = lerJson("service.json");
const servicos = (service?.servicos || []).map((s) => ({
  slug: s.slug, nome: limpar(s.nome),
  descricao: (s.descricao || []).map(limpar), itens: (s.itens || []).map(semPontoFinal),
  imagens: (s.imagens || []).map((i) => ({ ...imagem(path.parse(i.arquivo).name), alt: limpar(i.alt) })).filter((i) => i.src),
}));

/* --------------------------------------------------------------------------
   Valores-chave para a plaqueta e os cards
   -------------------------------------------------------------------------- */
const PRIORIDADE_CHAVES = [
  /^tens[aã]o nominal(?! de (isol|impulso|utiliza|teste|ensaio))|^classe de (tens|isol)|^tens[aã]o nominal de utiliza|^tens[aã]o$/i,
  /^corrente nominal(?! de curta)|^corrente$|^corrente nominal \(a\)/i,
  /curto|curta dura|^icc|^icw/i,
  /grau de prote/i,
  /n[ií]vel b[aá]sico|^nbi|uimp/i,
];

function separarUnidade(nome, valor) {
  const m = nome.match(/^(.*?)\s*\(([^)]{1,8})\)\s*$/);
  if (m && /^(k?V|k?A|kA\/1?s|Hz|mm|kg|kV\/min)$/i.test(m[2]) && !/[a-z]{2,}$/i.test(valor.replace(/\s/g, ""))) {
    return { nome: m[1], valor: `${valor} ${m[2]}` };
  }
  return { nome, valor };
}

// Valores definidos à mão quando a escolha automática não representa bem o produto (dados da própria ficha)
const CHAVES_FIXAS = {
  maggiore: [
    { nome: "Tensão nominal", valor: "17,5 / 24 / 36,2 kV" },
    { nome: "Corrente nominal das derivações", valor: "630 / 1250 / 2500 A" },
    { nome: "Corrente de curta duração", valor: "até 31,5 kA/1s" },
    { nome: "Grau de proteção", valor: "IP-4X abrigado, IP-54 ao tempo" },
  ],
};

function formatarChave({ nome, valor }) {
  const n = nome.replace(/\s*\([^)]{13,}\)/, "").replace(/\s+–\s+\w+$/, "");
  const v = valor.replace(/[;.]\s*$/, "").replace(/^de\s+/i, "").replace(/^Até\b/, "até");
  return { nome: n, valor: v };
}

function chavesDe(p, max = 4) {
  if (CHAVES_FIXAS[p.slug]) return CHAVES_FIXAS[p.slug].slice(0, max);
  const todos = p.grupos.flatMap((g) => g.itens).filter((i) => i.valor && i.valor.length <= 42);
  const escolhidos = [];
  for (const re of PRIORIDADE_CHAVES) {
    const achado = todos.find((i) => re.test(i.nome) && !escolhidos.includes(i));
    if (achado) escolhidos.push(achado);
    if (escolhidos.length === max) break;
  }
  return escolhidos.map((i) => formatarChave(separarUnidade(i.nome, i.valor)));
}

/* --------------------------------------------------------------------------
   Utilidades de HTML
   -------------------------------------------------------------------------- */
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const urlContato = (interesse, produto) => {
  const q = new URLSearchParams();
  if (interesse) q.set("interesse", interesse);
  if (produto) q.set("produto", produto);
  const s = q.toString().replace(/\+/g, "%20");
  return `/Contato/${s ? "?" + s : ""}`.replace(/&/g, "&amp;");
};
const ICONES = {
  telefone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  qualidade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 3 8.6 7 10 4-1.4 7-5.4 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  atendimento: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19c0 1.5-2 2-5 2"/></svg>',
  confiabilidade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  whatsapp: (() => {
    const d = fs.readFileSync(path.join(RAIZ, "icones", "whatsapp.svg"), "utf8").match(/<path d="([^"]+)"/)[1];
    return `<svg class="ep-icone-whats" viewBox="4 5 52.5 47" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  })(),
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6M9 15l3 3 3-3"/></svg>',
};

/* --------------------------------------------------------------------------
   Layout comum
   -------------------------------------------------------------------------- */
const NAV = [
  ["/", "Início", "inicio"],
  ["/NossasSolucoes/", "Nossas soluções", "solucoes"],
  ["/Sobre/", "Sobre", "sobre"],
  ["/Contato/", "Contato", "contato"],
];

function layout({ titulo, descricao, ativo, conteudo, ogTipo = "website", preload = "", ctaHref = "/Contato/",
  mensagemWhats = "Olá! Vim pelo site da EP Energy e gostaria de falar com a equipe." }) {
  const nav = NAV.map(([href, nome, id]) => {
    const atual = ativo === id ? ' aria-current="page"' : ativo === id + ":sub" ? ' aria-current="true"' : "";
    return `            <li class="nav-item"><a class="nav-link" href="${href}"${atual}>${nome}</a></li>`;
  }).join("\n");
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(descricao)}">
  <meta name="theme-color" content="#1F4247">
  <meta property="og:type" content="${ogTipo}">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="EP Energy">
  <meta property="og:title" content="${esc(titulo)}">
  <meta property="og:description" content="${esc(descricao)}">
  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap">
  ${CDN.bootstrapCss}
  <link rel="stylesheet" href="/assets/css/main.css">${preload}
  <script>document.documentElement.classList.add("js");</script>
</head>
<body>
  <a class="ep-pular" href="#conteudo">Pular para o conteúdo</a>

  <header class="ep-header">
    <nav class="navbar navbar-expand-lg" aria-label="Navegação principal">
      <div class="container-xl">
        <a class="navbar-brand ep-logo" href="/"><img src="/assets/img/logo-ep-energy.png" width="640" height="84" alt="EP Energy — Soluções em Energia"></a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu" aria-controls="menu" aria-expanded="false" aria-label="Abrir menu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="menu">
          <ul class="navbar-nav ms-auto me-lg-3">
${nav}
          </ul>
          <a class="ep-btn ep-btn--lima" href="${ctaHref}">Solicitar orçamento</a>
        </div>
      </div>
    </nav>
  </header>

  <main id="conteudo">
${conteudo}
  </main>

  <footer class="ep-rodape">
    <div class="container-xl">
      <div class="row g-4 g-lg-5">
        <div class="col-12 col-lg-4">
          <img class="ep-rodape__logo" src="/assets/img/logo-ep-energy.png" width="640" height="84" alt="EP Energy — Soluções em Energia" loading="lazy">
          <p>Soluções completas em distribuição de energia elétrica, com equipamentos modernos e seguros.</p>
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <h2>Navegação</h2>
          <ul>
${NAV.map(([href, nome]) => `            <li><a href="${href}">${nome}</a></li>`).join("\n")}
          </ul>
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <h2>Soluções</h2>
          <ul>
${categorias.map((c) => `            <li><a href="/NossasSolucoes/#${c.id}">${esc(c.nome)}</a></li>`).join("\n")}
            <li><a href="/NossasSolucoes/#servicos">Serviços</a></li>
          </ul>
        </div>
        <div class="col-12 col-md-4 col-lg-3">
          <h2>Contato</h2>
          <ul>
            <li><a href="${esc(urlWhatsapp("Olá! Vim pelo site da EP Energy e gostaria de falar com a equipe."))}" target="_blank" rel="noopener">WhatsApp ${CONTATO.whatsapp}</a></li>
            <li><a href="mailto:${CONTATO.email}">${CONTATO.email}</a></li>
            <li>${CONTATO.cidade}</li>
          </ul>
        </div>
      </div>
      <div class="ep-rodape__base">© <span data-ano>2026</span> EP Energy Soluções em Energia. Todos os direitos reservados.</div>
    </div>
  </footer>

  <a class="ep-whats-flutuante" href="${esc(urlWhatsapp(mensagemWhats))}" target="_blank" rel="noopener" aria-label="Conversar com a EP Energy no WhatsApp">${ICONES.whatsapp}<span>WhatsApp</span></a>

  ${CDN.bootstrapJs}
  <script src="/assets/js/main.js" defer></script>
</body>
</html>
`;
}

const chamada = (titulo, acoes) => `
    <section class="ep-chamada" aria-labelledby="chamada-titulo">
      <div class="container-xl">
        <div class="row g-4 align-items-center">
          <div class="col-lg-7">
            <h2 id="chamada-titulo">${titulo}</h2>
          </div>
          <div class="col-lg-5">
${acoes ?? `            <div class="ep-chamada__contatos">
              <a href="${esc(urlWhatsapp("Olá! Vim pelo site da EP Energy e gostaria de falar com a equipe."))}" target="_blank" rel="noopener">${ICONES.whatsapp} WhatsApp ${CONTATO.whatsapp}</a>
              <a href="mailto:${CONTATO.email}">${ICONES.email} ${CONTATO.email}</a>
            </div>`}
          </div>
        </div>
      </div>
    </section>`;

const trilha = (itens) => `
        <nav aria-label="Trilha de navegação">
          <ol class="breadcrumb ep-trilha">
${itens.map(([href, nome], i) => i === itens.length - 1
    ? `            <li class="breadcrumb-item active" aria-current="page">${esc(nome)}</li>`
    : `            <li class="breadcrumb-item"><a href="${href}">${esc(nome)}</a></li>`).join("\n")}
          </ol>
        </nav>`;

const img = (i, { classe = "", grande = false, lazy = true, extra = "" } = {}) =>
  `<img${classe ? ` class="${classe}"` : ""} src="${grande ? i.src : i.srcSm}" width="${grande ? i.w : i.wSm}" height="${grande ? i.h : i.hSm}" alt="${esc(i.alt)}"${lazy ? ' loading="lazy"' : ""}${extra}>`;

/* --------------------------------------------------------------------------
   Componentes do catálogo
   -------------------------------------------------------------------------- */
function cardProduto(p) {
  const chaves = chavesDe(p, 3);
  const capa = p.imagens[0];
  return `
          <article class="ep-produto">
            <a class="ep-produto__midia ep-produto__midia--contain d-block" href="/produtos/${p.slug}/" tabindex="-1" aria-hidden="true">${capa ? img(capa) : ""}</a>
            <div class="ep-produto__corpo">
              <h3><a class="stretched-link-off text-reset text-decoration-none" href="/produtos/${p.slug}/">${esc(p.nome)}</a></h3>
              <p>${esc(p.resumo)}</p>
${chaves.length ? `              <ul class="ep-produto__chaves" aria-label="Valores nominais">${chaves.map((c) => `<li title="${esc(c.nome)}">${esc(c.valor)}</li>`).join("")}</ul>` : ""}
              <a class="ep-link" href="/produtos/${p.slug}/">Ver ficha técnica</a>
            </div>
          </article>`;
}

const colunasPara = (n) => (n === 1 ? "col-12" : n === 2 ? "col-md-6" : n === 3 ? "col-md-6 col-lg-4" : "col-md-6 col-xl-3");

function tipoGrupo(g) {
  const vazios = g.itens.every((i) => !i.valor);
  if (vazios) return g.itens.length >= 10 && g.itens.every((i) => i.nome.length <= 30) ? "chips" : "lista";
  const media = g.itens.reduce((s, i) => s + i.valor.length, 0) / g.itens.length;
  return media > 60 ? "detalhes" : "tabela";
}

function renderGrupo(g) {
  const tipo = tipoGrupo(g);
  if (tipo === "chips") {
    return `
            <div class="ep-ficha-grupo ep-ficha-grupo--larga">
              <h3>${esc(g.titulo)}</h3>
              <ul class="ep-normas ep-normas--suave m-0 p-3">${g.itens.map((i) => `<li>${esc(i.nome)}</li>`).join("")}</ul>
            </div>`;
  }
  if (tipo === "lista") {
    return `
            <div class="ep-ficha-grupo ep-ficha-grupo--larga">
              <h3>${esc(g.titulo)}</h3>
              <ul class="ep-ficha-lista">${g.itens.map((i) => `<li>${esc(i.nome)}</li>`).join("")}</ul>
            </div>`;
  }
  const larga = tipo === "detalhes" || g.itens.length > 12;
  return `
            <div class="ep-ficha-grupo${larga ? " ep-ficha-grupo--larga" : ""}${tipo === "detalhes" ? " ep-ficha-grupo--empilhado" : ""}">
              <h3>${esc(g.titulo)}</h3>
              <dl>
${g.itens.map((i) => {
    const { nome, valor } = separarUnidade(i.nome, i.valor);
    return `                <div><dt>${esc(nome)}</dt><dd>${esc(valor) || "—"}</dd></div>`;
  }).join("\n")}
              </dl>
            </div>`;
}

/* --------------------------------------------------------------------------
   Páginas
   -------------------------------------------------------------------------- */
function paginaProduto(p) {
  const c = p.categoria;
  const chaves = chavesDe(p, 4);
  const [principal, ...outras] = p.imagens;
  const secoes = [
    p.caracteristicas.length && ["caracteristicas", "Características"],
    p.grupos.length && ["ficha-tecnica", "Ficha técnica"],
    p.aplicacoes.length && ["aplicacoes", "Aplicações"],
    p.normas.length && ["normas", "Normas"],
  ].filter(Boolean);
  const relacionados = c.itens.filter((o) => o !== p);
  const orcamento = urlContato(c.interesse, p.nome);
  const msgWhats = `Olá! Vim pelo site da EP Energy e gostaria de informações sobre ${p.nome}.`;
  const botaoWhats = `<a class="ep-btn ep-btn--whats" href="${esc(urlWhatsapp(msgWhats))}" target="_blank" rel="noopener">${ICONES.whatsapp} Falar no WhatsApp</a>`;

  const galeria = principal ? `
            <div class="ep-galeria" data-galeria>
              <div class="ep-galeria__principal">
                ${img(principal, { grande: true, lazy: false, extra: ' data-galeria-principal fetchpriority="high"' })}
              </div>
${outras.length ? `              <ul class="ep-galeria__miniaturas" aria-label="Fotos de ${esc(p.nome)}">
${p.imagens.map((i, n) => `                <li><button type="button" data-foto="${i.src}" data-alt="${esc(i.alt)}" aria-current="${n === 0}" aria-label="Ver foto ${n + 1} de ${p.imagens.length}">${img(i)}</button></li>`).join("\n")}
              </ul>` : ""}
            </div>` : `
            <div class="ep-galeria__principal"><div class="ep-sem-foto" role="img" aria-label="Imagem do produto em produção">Foto em produção</div></div>`;

  const aplicacoes = p.aplicacoes.map((a) => {
    const m = a.match(/^([^:]{3,60}):\s*(.+)$/);
    return m ? `<li><strong>${esc(m[1])}.</strong> ${esc(m[2])}</li>` : `<li>${esc(a)}</li>`;
  });

  const conteudo = `
    <section class="ep-pagina-topo pb-4" aria-label="Localização">
      <div class="container-xl">${trilha([["/", "Início"], ["/NossasSolucoes/", "Nossas soluções"], [`/NossasSolucoes/#${c.id}`, c.nome], ["", p.nome]]).replace('class="breadcrumb ep-trilha"', 'class="breadcrumb ep-trilha mb-0"')}
      </div>
    </section>

    <article aria-labelledby="produto-titulo">
      <div class="ep-secao pt-5">
        <div class="container-xl">
          <div class="row g-4 g-lg-5">
            <div class="col-lg-6">${galeria}
            </div>
            <div class="col-lg-6">
              <span class="ep-etiqueta mb-3">${esc(c.nome)}</span>
              <h1 id="produto-titulo">${esc(p.nome)}</h1>
              ${p.resumo && p.resumo !== p.nome ? `<p class="ep-lead mt-3 mb-2">${esc(p.resumo)}</p>` : ""}
              <p class="ep-fabricante">Fabricante: <strong>${esc(p.fabricante)}</strong></p>
${chaves.length ? `              <div class="ep-plaqueta">
                <dl>
${chaves.map((k) => `                  <div><dt>${esc(k.nome)}</dt><dd>${esc(k.valor)}</dd></div>`).join("\n")}
                </dl>
              </div>` : ""}
              <div class="ep-texto-corrido">
${p.descricao.map((d) => `                <p>${esc(d)}</p>`).join("\n")}
              </div>
              <div class="ep-acoes mt-4">
                <a class="ep-btn ep-btn--teal" href="${orcamento}">Solicitar orçamento</a>
                ${botaoWhats}
${p.pdf ? `                <a class="ep-btn ep-btn--contorno" href="${esc(p.pdf)}" target="_blank" rel="noopener">${ICONES.pdf} Catálogo do fabricante (PDF)</a>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

${secoes.length > 1 ? `      <nav class="ep-sumario" aria-label="Seções da ficha">
        <div class="container-xl">
          <ul>
${secoes.map(([id, nome]) => `            <li><a href="#${id}">${nome}</a></li>`).join("\n")}
          </ul>
        </div>
      </nav>` : ""}

      <div class="ep-secao ep-secao--papel">
        <div class="container-xl">
${p.caracteristicas.length ? `          <section id="caracteristicas" class="ep-bloco-produto" aria-labelledby="t-caracteristicas">
            <h2 id="t-caracteristicas">Características</h2>
            <ul class="ep-lista-tecnica">
${p.caracteristicas.map((t) => `              <li>${esc(t)}</li>`).join("\n")}
            </ul>
          </section>` : ""}
${p.grupos.length ? `          <section id="ficha-tecnica" class="ep-bloco-produto" aria-labelledby="t-ficha">
            <h2 id="t-ficha">Ficha técnica</h2>
            <div class="ep-ficha-grupos ep-ficha-grupos--duas">${p.grupos.map(renderGrupo).join("")}
            </div>
          </section>` : ""}
${p.aplicacoes.length ? `          <section id="aplicacoes" class="ep-bloco-produto" aria-labelledby="t-aplicacoes">
            <h2 id="t-aplicacoes">Aplicações</h2>
            <ul class="ep-lista-tecnica ep-lista-tecnica--aplicacoes">
              ${aplicacoes.join("\n              ")}
            </ul>
          </section>` : ""}
${p.normas.length ? `          <section id="normas" class="ep-bloco-produto" aria-labelledby="t-normas">
            <h2 id="t-normas">Normas de referência</h2>
            <ul class="ep-normas mb-0">${p.normas.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
          </section>` : ""}
          <p class="ep-fonte mt-5 mb-0">Informações técnicas do fabricante ${esc(p.fabricante)}. Confirme os valores para o seu projeto com a nossa equipe.</p>
        </div>
      </div>
    </article>
${relacionados.length ? `
    <section class="ep-secao" aria-labelledby="relacionados-titulo">
      <div class="container-xl">
        <div class="ep-titulo-secao">
          <h2 id="relacionados-titulo">Outros produtos da linha ${esc(c.nome.toLowerCase())}</h2>
        </div>
        <div class="row g-4">
${relacionados.map((o) => `          <div class="col-md-6 col-lg-4">${cardProduto(o)}
          </div>`).join("\n")}
        </div>
      </div>
    </section>` : ""}
${chamada(`Precisa dimensionar ${esc(p.nome.replace(/®/g, ""))} para o seu projeto?`, `            <div class="ep-acoes">
              <a class="ep-btn ep-btn--teal" href="${orcamento}">Solicitar orçamento</a>
              ${botaoWhats}
            </div>`)}`;

  return layout({
    titulo: `${p.nome} | ${c.nome} | EP Energy`,
    descricao: (p.descricao[0] || p.resumo).slice(0, 158),
    ativo: "solucoes:sub", conteudo, ogTipo: "product", mensagemWhats: msgWhats,
  });
}

const DIAGRAMA = (linkMedicao) => `
            <figure class="ep-unifilar" aria-labelledby="unifilar-legenda">
              <svg viewBox="0 0 400 420" role="group" aria-label="Diagrama unifilar da distribuição de energia, da rede da concessionária até as cargas">
                <circle class="u-no" cx="150" cy="16" r="6"/>
                <text class="u-rotulo" x="170" y="21">Rede da concessionária</text>
                <path class="u-linha" d="M150 22V70"/>
                <a href="/NossasSolucoes/#media-tensao">
                  <rect class="u-alvo" x="126" y="62" width="268" height="54" rx="4"/>
                  <rect class="u-simbolo" x="136" y="70" width="28" height="36" rx="2"/>
                  <text class="u-codigo" x="150" y="92">52</text>
                  <text class="u-rotulo" x="180" y="86">Cubículo de média tensão</text>
                  <text class="u-sub" x="180" y="104">Isolação a ar ou SF6, até 36 kV</text>
                </a>
                <path class="u-linha" d="M150 106V148"/>
                <a href="/NossasSolucoes/#transformadores">
                  <rect class="u-alvo" x="126" y="144" width="200" height="68" rx="4"/>
                  <circle class="u-linha" cx="150" cy="166" r="18"/>
                  <circle class="u-linha" cx="150" cy="190" r="18"/>
                  <text class="u-rotulo" x="180" y="176">Transformador</text>
                  <text class="u-sub" x="180" y="194">Média para baixa tensão</text>
                </a>
                <path class="u-linha" d="M150 208V258"/>
                <a href="/NossasSolucoes/#barramentos">
                  <rect class="u-alvo" x="34" y="226" width="344" height="42" rx="4"/>
                  <path class="u-linha u-barra" d="M40 258H370"/>
                  <text class="u-rotulo" x="370" y="244" text-anchor="end">Barramento blindado</text>
                </a>
                <a href="/NossasSolucoes/#baixa-tensao">
                  <rect class="u-alvo" x="30" y="262" width="100" height="152" rx="4"/>
                  <path class="u-linha" d="M80 258V292M80 318V348M72 340l8 10 8-10"/>
                  <rect class="u-simbolo" x="70" y="292" width="20" height="26" rx="2"/>
                  <text class="u-rotulo" x="80" y="384" text-anchor="middle">Painel de</text>
                  <text class="u-rotulo" x="80" y="402" text-anchor="middle">baixa tensão</text>
                </a>
                <a href="${linkMedicao}">
                  <rect class="u-alvo" x="150" y="262" width="110" height="152" rx="4"/>
                  <path class="u-linha" d="M205 258V297M205 331V350"/>
                  <circle class="u-simbolo" cx="205" cy="314" r="17"/>
                  <text class="u-codigo" x="205" y="318" style="font-size:9.5px">kWh</text>
                  <text class="u-rotulo" x="205" y="384" text-anchor="middle">Medição</text>
                  <text class="u-rotulo" x="205" y="402" text-anchor="middle">centralizada</text>
                </a>
                <a href="/NossasSolucoes/#energia-solar">
                  <rect class="u-alvo" x="280" y="262" width="96" height="152" rx="4"/>
                  <path class="u-linha" d="M325 258V290M325 324V344"/>
                  <rect class="u-simbolo" x="307" y="290" width="36" height="34" rx="2"/>
                  <path class="u-linha" d="M309 322L341 292" style="stroke-width:1.5"/>
                  <text class="u-codigo" x="316" y="304">~</text>
                  <text class="u-codigo" x="334" y="320">=</text>
                  <rect class="u-simbolo" x="309" y="344" width="32" height="22" rx="1"/>
                  <path class="u-linha" d="M309 355H341M320 344V366M331 344V366" style="stroke-width:1.2"/>
                  <text class="u-rotulo" x="325" y="384" text-anchor="middle">Energia</text>
                  <text class="u-rotulo" x="325" y="402" text-anchor="middle">solar</text>
                </a>
              </svg>
              <figcaption id="unifilar-legenda">Do ponto de entrega à carga: toque em uma etapa para ver as soluções.</figcaption>
            </figure>`;

function paginaInicio() {
  const destaque = produtos.get("maggiore");
  const dChaves = destaque ? chavesDe(destaque, 4) : [];
  const linkMedicao = produtos.has("caixa-mec") ? "/produtos/caixa-mec/" : "/NossasSolucoes/#barramentos";
  const conteudo = `
    <section class="ep-hero" aria-labelledby="hero-titulo">
      <div class="container-xl">
        <div class="row align-items-center g-4 g-lg-5">
          <div class="col-lg-6 pb-lg-5">
            <h1 id="hero-titulo" class="ep-display ep-hero__titulo">Energia distribuída com segurança e desempenho.</h1>
            <p class="ep-lead">Cubículos de média tensão, quadros e painéis de baixa tensão, barramentos blindados, medição centralizada e serviços de campo, além de transformadores e energia solar.</p>
            <div class="ep-acoes">
              <a class="ep-btn ep-btn--lima" href="/NossasSolucoes/">Conhecer as soluções</a>
              <a class="ep-btn ep-btn--contorno-claro" href="/Contato/">Falar com vendas</a>
            </div>
          </div>
          <div class="col-lg-6">${DIAGRAMA(linkMedicao)}
          </div>
        </div>
      </div>
    </section>

    <section class="ep-secao ep-secao--papel" aria-labelledby="linhas-titulo">
      <div class="container-xl">
        <div class="ep-titulo-secao">
          <h2 id="linhas-titulo">Linhas de produto</h2>
          <p class="ep-lead">Equipamentos ensaiados em laboratórios independentes e certificados conforme as normas NBR IEC, da entrada de energia à distribuição final.</p>
        </div>
        <ul class="ep-barramento ep-barramento--multi" style="--n: ${categorias.length}" data-energizar>
${categorias.map((c) => {
    const capa = imagem(c.capa) ? { ...imagem(c.capa), alt: c.titulo } : c.itens[0].imagens[0];
    return `          <li>
            <article class="ep-linha">
              <div class="ep-linha__img">${capa ? img({ ...capa, alt: `${c.titulo}: ${c.itens[0].nome}` }) : ""}</div>
              <div class="ep-linha__corpo">
                <h3>${esc(c.nome)}</h3>
                <p>${esc(c.resumo)}</p>
                <p class="ep-linha__produtos">${c.itens.map((p) => `<a href="/produtos/${p.slug}/">${esc(p.nome)}</a>`).join(", ")}</p>
                <a class="ep-link" href="/NossasSolucoes/#${c.id}">Ver linha completa</a>
              </div>
            </article>
          </li>`;
  }).join("\n")}
        </ul>
      </div>
    </section>

    <section class="ep-secao" aria-labelledby="diferenciais-titulo">
      <div class="container-xl">
        <div class="ep-titulo-secao">
          <h2 id="diferenciais-titulo">Por que escolher a EP Energy</h2>
        </div>
        <div class="row g-4 g-lg-5">
          <div class="col-md-4"><div class="ep-diferencial">${ICONES.qualidade}<h3>Qualidade dos produtos</h3><p>Cada item é cuidadosamente selecionado e testado para oferecer desempenho excepcional, durabilidade e eficiência energética.</p></div></div>
          <div class="col-md-4"><div class="ep-diferencial">${ICONES.atendimento}<h3>Atendimento eficiente</h3><p>Equipe capacitada para um serviço ágil, com suporte técnico e soluções personalizadas, da compra ao pós-venda.</p></div></div>
          <div class="col-md-4"><div class="ep-diferencial">${ICONES.confiabilidade}<h3>Confiabilidade</h3><p>Há anos construímos parcerias de confiança com empresas de diversos setores, entregando soluções de alto desempenho.</p></div></div>
        </div>
        <p class="mt-5 mb-0"><a class="ep-link" href="/Sobre/">Conheça a EP Energy</a></p>
      </div>
    </section>
${destaque ? `
    <section class="ep-secao ep-secao--teal" aria-labelledby="destaque-titulo">
      <div class="container-xl">
        <div class="row g-4 g-lg-5 align-items-center">
          <div class="col-lg-6">
            <div class="ep-destaque__placa">${img(destaque.imagens[0], { grande: true })}</div>
          </div>
          <div class="col-lg-5 offset-lg-1">
            <span class="ep-etiqueta mb-3">Produto em destaque</span>
            <h2 id="destaque-titulo">${esc(destaque.nome)}</h2>
            <p class="ep-lead mt-3 mb-4">${esc(destaque.resumo)}. Tipo metal-clad, para uso abrigado e ao tempo, certificado conforme NBR-IEC-62271-200.</p>
            <dl class="ep-specs mb-4">
${dChaves.map((k) => `              <div><dt>${esc(k.nome)}</dt><dd>${esc(k.valor)}</dd></div>`).join("\n")}
            </dl>
            <div class="ep-acoes">
              <a class="ep-btn ep-btn--lima" href="/produtos/${destaque.slug}/">Ver ficha técnica</a>
              <a class="ep-btn ep-btn--contorno-claro" href="${urlContato("Média tensão", destaque.nome)}">Solicitar orçamento</a>
            </div>
          </div>
        </div>
      </div>
    </section>` : ""}
${servicos.length ? `
    <section class="ep-secao" aria-labelledby="servicos-titulo">
      <div class="container-xl">
        <div class="row g-4 g-lg-5">
          <div class="col-lg-5">
            <h2 id="servicos-titulo">Serviços de campo</h2>
            <p class="ep-lead mt-3">Revisão, manutenção, comissionamento e estudos para manter a sua instalação em operação.</p>
            <p class="mt-4 mb-0"><a class="ep-link" href="/NossasSolucoes/#servicos">Ver todos os serviços</a></p>
          </div>
          <div class="col-lg-7">
            <ul class="ep-lista-linhas ep-lista-linhas--colunas">
${servicos.map((s) => `              <li><a href="/NossasSolucoes/#servico-${s.slug}">${esc(s.nome)}</a></li>`).join("\n")}
            </ul>
          </div>
        </div>
      </div>
    </section>` : ""}

    <section class="ep-manifesto" aria-label="Nosso compromisso">
      <img class="ep-manifesto__bg" src="/assets/img/subestacao.jpg" width="1920" height="694" alt="" loading="lazy">
      <div class="container-xl">
        <blockquote>
          <p class="m-0">Tecnologia que garante eficiência, segurança e economia, enquanto o seu negócio faz a diferença pelo meio ambiente.</p>
        </blockquote>
      </div>
    </section>
${chamada("Potencialize seu negócio com produtos de alta qualidade.")}`;

  return layout({
    titulo: "EP Energy | Cubículos, painéis elétricos e barramentos blindados",
    descricao: "Cubículos de média tensão, quadros e painéis de baixa tensão, barramentos blindados, medição centralizada e serviços de campo. São José do Rio Preto, SP.",
    ativo: "inicio", conteudo,
  });
}

function paginaSolucoes() {
  const navItens = [...categorias.map((c) => [c.id, c.nome]), servicos.length && ["servicos", "Serviços"]].filter(Boolean);
  const conteudo = `
    <section class="ep-pagina-topo" aria-labelledby="pagina-titulo">
      <div class="container-xl">${trilha([["/", "Início"], ["", "Nossas soluções"]])}
        <h1 id="pagina-titulo">Conheça nossas soluções</h1>
        <p class="ep-lead">Equipamentos modernos e seguros para distribuição de energia elétrica, da média à baixa tensão, com ficha técnica completa de cada produto.</p>
        <ul class="ep-barramento ep-barramento--nav ep-barramento--multi mt-5" style="--n: ${navItens.length}" aria-label="Linhas de solução">
${navItens.map(([id, nome]) => `          <li><a href="#${id}">${esc(nome)}</a></li>`).join("\n")}
        </ul>
        <p class="ep-pagina-topo__extra mt-4 mb-0">Também atendemos: <a href="#transformadores">transformadores</a> e <a href="#energia-solar">energia solar</a>.</p>
      </div>
    </section>
${categorias.map((c, n) => `
    <section id="${c.id}" class="ep-secao ep-categoria${n % 2 ? " ep-secao--papel" : ""}" aria-labelledby="t-${c.id}">
      <div class="container-xl">
        <div class="ep-titulo-secao">
          <h2 id="t-${c.id}">${esc(c.titulo)}</h2>
          <p class="ep-lead">${esc(c.resumo)}</p>
        </div>
        <div class="row g-4">
${c.itens.map((p) => `          <div class="${colunasPara(c.itens.length)}">${cardProduto(p)}
          </div>`).join("\n")}
        </div>
      </div>
    </section>`).join("")}
${servicos.length ? `
    <section id="servicos" class="ep-secao ep-secao--teal" aria-labelledby="t-servicos">
      <div class="container-xl">
        <div class="ep-titulo-secao">
          <h2 id="t-servicos">Serviços de campo</h2>
          <p class="ep-lead">Revisão, manutenção, comissionamento, estudos de proteção e termografia, executados pela equipe técnica do Grupo GIMI.</p>
        </div>
        <div class="row g-4 mb-5">
${servicos.filter((s) => s.imagens.length).slice(0, 3).map((s, i) => `          <div class="${i === 0 ? "col-md-6" : "col-6 col-md-3"}">${img(s.imagens[0], { classe: "ep-foto ep-foto--servico", grande: true })}</div>`).join("\n")}
        </div>
        <div class="row g-4 g-lg-5">
${servicos.map((s) => `          <div class="col-md-6 col-lg-4" id="servico-${s.slug}">
            <div class="ep-servico ep-servico--escuro">
              <h3>${esc(s.nome)}</h3>
${s.descricao.map((d) => `              <p>${esc(d)}</p>`).join("\n")}
${s.itens.length ? `              <ul>${s.itens.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
            </div>
          </div>`).join("\n")}
        </div>
        <div class="ep-acoes mt-5">
          <a class="ep-btn ep-btn--lima" href="${urlContato("Serviços")}">Solicitar serviço</a>
        </div>
      </div>
    </section>` : ""}

    <section class="ep-secao ep-secao--papel" aria-labelledby="t-outras">
      <div class="container-xl">
        <div class="ep-titulo-secao">
          <h2 id="t-outras">Transformadores e energia solar</h2>
        </div>
        <div class="row g-4">
          <div class="col-md-6" id="transformadores">
            <article class="ep-produto">
              <div class="ep-produto__midia ep-produto__midia--contain"><img src="/assets/img/transformador.jpg" width="684" height="846" alt="Transformador de potência com radiadores, buchas e tanque de expansão" loading="lazy"></div>
              <div class="ep-produto__corpo">
                <h3>Transformadores</h3>
                <p>Transformadores blindados que unem proteção, eficiência e segurança para a distribuição de energia do seu negócio. Fale com a nossa equipe para dimensionar o equipamento adequado à sua aplicação.</p>
                <a class="ep-link" href="${urlContato("Transformadores")}">Consultar transformadores</a>
              </div>
            </article>
          </div>
          <div class="col-md-6" id="energia-solar">
            <article class="ep-produto">
              <div class="ep-produto__midia ep-produto__midia--contain"><img src="/assets/img/painel-solar.jpg" width="680" height="828" alt="Módulo fotovoltaico de células monocristalinas" loading="lazy"></div>
              <div class="ep-produto__corpo">
                <h3>Energia solar</h3>
                <p>Painéis solares para gerar economia e dar um passo rumo a um futuro sustentável e vantajoso para o seu negócio, com desempenho, durabilidade e eficiência energética.</p>
                <a class="ep-link" href="${urlContato("Energia solar")}">Consultar energia solar</a>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
${chamada("Não encontrou o que procura? Fale com a nossa equipe.")}`;

  return layout({
    titulo: "Nossas soluções | EP Energy",
    descricao: "Cubículos de média tensão, média tensão compacta em SF6, quadros e painéis de baixa tensão, barramentos blindados, medição centralizada e serviços.",
    ativo: "solucoes", conteudo,
  });
}

const MARCADORES = {
  "{{EMAIL}}": CONTATO.email,
  "{{TELEFONE}}": CONTATO.telefone,
  "{{TELEFONE_HREF}}": CONTATO.telefoneHref,
  "{{WHATSAPP}}": CONTATO.whatsapp,
  "{{WHATSAPP_NUMERO}}": CONTATO.whatsappNumero,
  "{{WHATSAPP_HREF}}": esc(urlWhatsapp("Olá! Vim pelo site da EP Energy e gostaria de falar com a equipe.")),
  "{{FORM_ENDPOINT}}": FORM_ENDPOINT,
  "{{ICONE_WHATSAPP}}": ICONES.whatsapp,
  "{{ICONE_TELEFONE}}": ICONES.telefone,
  "{{ICONE_EMAIL}}": ICONES.email,
};
const parcial = (nome) => {
  let html = fs.readFileSync(path.join(RAIZ, "paginas", nome), "utf8").replace(/\s+$/, "");
  for (const [marcador, valor] of Object.entries(MARCADORES)) html = html.split(marcador).join(valor);
  const sobra = html.match(/\{\{[A-Z_]+\}\}/);
  if (sobra) throw new Error(`Marcador sem valor em ${nome}: ${sobra[0]}`);
  return html;
};

function paginaSobre() {
  return layout({
    titulo: "Sobre a EP Energy | Soluções em energia",
    descricao: "A EP Energy oferece soluções completas para distribuição secundária de energia elétrica, com equipamentos modernos e seguros, preparados para redes Smart Grid.",
    ativo: "sobre", conteudo: "\n" + parcial("sobre.html"),
  });
}

function paginaContato() {
  return layout({
    titulo: "Contato | EP Energy",
    descricao: `Fale com a EP Energy: ${CONTATO.telefone} ou ${CONTATO.email}. Orçamentos de cubículos, painéis, barramentos blindados e serviços.`,
    ativo: "contato", conteudo: "\n" + parcial("contato.html"), ctaHref: "#form-contato",
  });
}

const redirecionamento = (destino, titulo) => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titulo)} | EP Energy</title>
  <!-- Endereço antigo preservado para links e buscadores -->
  <meta name="robots" content="noindex">
  <meta http-equiv="refresh" content="0; url=${destino}">
</head>
<body>
  <p>Esta página mudou de endereço. <a href="${destino}">Abrir ${esc(titulo)}</a>.</p>
</body>
</html>
`;

/* --------------------------------------------------------------------------
   Gravação
   -------------------------------------------------------------------------- */
// Converte caminhos absolutos ("/assets/...", "/Sobre/") em relativos à página ("../assets/...", "../Sobre/index.html").
// Assim o site funciona aberto direto do disco (duplo clique) e em qualquer hospedagem, inclusive em subpasta.
function relativizar(html, rota) {
  const prefixo = "../".repeat(rota ? rota.split("/").length : 0);
  const converter = (caminho) => {
    const [, base, resto = ""] = caminho.match(/^([^?#]*)(.*)$/);
    if (base.startsWith("/assets/")) return prefixo + base.slice(1) + resto;
    const pasta = base.replace(/^\/|\/$/g, "");
    return prefixo + (pasta ? pasta + "/" : "") + "index.html" + resto;
  };
  return html
    .replace(/\b(href|src|data-foto)="(\/(?!\/)[^"]*)"/g, (m, attr, caminho) => `${attr}="${converter(caminho)}"`)
    .replace(/(content="0; url=)(\/[^"]*)"/g, (m, inicio, caminho) => `${inicio}${converter(caminho)}"`);
}

function gravar(rota, html) {
  const arq = path.join(SAIDA, rota, "index.html");
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fs.writeFileSync(arq, relativizar(html, rota));
  return rota || "/";
}

// Páginas de produto antigas que deixaram de existir
const pastaProdutos = path.join(SAIDA, "produtos");
if (fs.existsSync(pastaProdutos)) fs.rmSync(pastaProdutos, { recursive: true });

const geradas = [
  gravar("", paginaInicio()),
  gravar("NossasSolucoes", paginaSolucoes()),
  gravar("Sobre", paginaSobre()),
  gravar("Contato", paginaContato()),
  ...[...produtos.values()].filter((p) => p.categoria).map((p) => gravar(`produtos/${p.slug}`, paginaProduto(p))),
];
if (produtos.has("maggiore")) {
  geradas.push(gravar("desktop-26", redirecionamento("/produtos/maggiore/", "Maggiore®")));
  geradas.push(gravar("produtos/cubiculo-modular-2500a", redirecionamento("/produtos/maggiore/", "Maggiore®")));
}

const semCategoria = [...produtos.values()].filter((p) => !p.categoria).map((p) => p.slug);
console.log(`${geradas.length} páginas geradas em ${SAIDA}`);
if (semCategoria.length) console.warn("Produtos sem categoria (não publicados):", semCategoria.join(", "));
for (const c of CATEGORIAS) {
  const faltando = c.produtos.filter((s) => !produtos.has(s));
  if (faltando.length) console.warn(`Categoria ${c.id}: sem dados para ${faltando.join(", ")}`);
}
