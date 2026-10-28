/* EP Energy — comportamentos do site (sem dependências além do Bootstrap) */
(function () {
  "use strict";

  /* Ano corrente no rodapé */
  document.querySelectorAll("[data-ano]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Barramento: "energiza" uma única vez ao entrar na tela */
  var barramentos = document.querySelectorAll("[data-energizar]");
  if ("IntersectionObserver" in window) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("is-energizado");
          observador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.25 });
    barramentos.forEach(function (el) { observador.observe(el); });
  } else {
    barramentos.forEach(function (el) { el.classList.add("is-energizado"); });
  }

  /* Galeria do produto: a miniatura clicada vira a foto principal */
  document.querySelectorAll("[data-galeria]").forEach(function (galeria) {
    var principal = galeria.querySelector("[data-galeria-principal]");
    var botoes = galeria.querySelectorAll("[data-foto]");
    botoes.forEach(function (botao) {
      botao.addEventListener("click", function () {
        principal.src = botao.getAttribute("data-foto");
        principal.alt = botao.getAttribute("data-alt");
        botoes.forEach(function (b) { b.setAttribute("aria-current", String(b === botao)); });
      });
    });
  });

  /* Formulário de contato: envia por e-mail (FormSubmit) ou abre o WhatsApp com a mensagem pronta */
  var form = document.getElementById("form-contato");
  if (!form) return;

  var destino = form.getAttribute("data-destino");
  var endpoint = form.getAttribute("action");
  var numeroWhats = form.getAttribute("data-whatsapp");
  var status = document.getElementById("form-status");
  var botaoEmail = form.querySelector('[data-acao="email"]');
  var botaoWhats = form.querySelector('[data-acao="whatsapp"]');
  var params = new URLSearchParams(window.location.search);
  var arquivo = form.attachment;
  var LIMITE_ARQUIVO = 5 * 1024 * 1024; // 5 MB

  // Projeto para análise (opcional): bloqueia arquivos acima do limite
  arquivo.addEventListener("change", function () {
    var grande = arquivo.files[0] && arquivo.files[0].size > LIMITE_ARQUIVO;
    arquivo.setCustomValidity(grande ? "Arquivo acima de 5 MB" : "");
    arquivo.classList.toggle("is-invalid", grande);
  });

  function nomeArquivo() {
    return arquivo.files[0] ? arquivo.files[0].name : "";
  }

  // Pré-preenchimento vindo dos links "Solicitar informações"
  var interesse = params.get("interesse");
  var produto = params.get("produto");
  if (interesse && form.interesse.querySelector('option[value="' + CSS.escape(interesse) + '"]')) {
    form.interesse.value = interesse;
  }
  if (produto && !form.mensagem.value) {
    form.mensagem.value = "Gostaria de receber informações sobre: " + produto + ".";
  }

  function mostrarStatus(tipo, html) {
    status.className = "ep-form__status ep-form__status--" + tipo;
    status.innerHTML = html;
  }

  function resumo(dados, separador) {
    return [
      "Nome: " + dados.get("nome"),
      dados.get("empresa") ? "Empresa: " + dados.get("empresa") : null,
      dados.get("email") ? "E-mail: " + dados.get("email") : null,
      dados.get("telefone") ? "Telefone: " + dados.get("telefone") : null,
      dados.get("interesse") ? "Assunto: " + dados.get("interesse") : null,
      nomeArquivo() ? "Projeto para análise: " + nomeArquivo() + " (anexo nesta conversa)" : null,
      "",
      dados.get("mensagem")
    ].filter(function (linha) { return linha !== null; }).join(separador);
  }

  function urlWhats(texto) {
    return "https://wa.me/" + numeroWhats + "?text=" + encodeURIComponent(texto);
  }

  function validar(campos) {
    var invalidos = campos.filter(function (campo) { return !campo.checkValidity(); });
    campos.forEach(function (campo) { campo.classList.toggle("is-invalid", !campo.checkValidity()); });
    if (invalidos.length) invalidos[0].focus();
    return invalidos.length === 0;
  }

  // Remove o destaque de erro assim que o campo é corrigido
  form.addEventListener("input", function (evento) {
    if (evento.target.classList.contains("is-invalid") && evento.target.checkValidity()) {
      evento.target.classList.remove("is-invalid");
    }
  });

  // Envio por e-mail
  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    status.textContent = "";
    if (!validar([form.nome, form.email, form.mensagem, arquivo])) return;
    if (form._honey.value) return; // robô preencheu o campo invisível

    var dados = new FormData(form);
    var corpo = {
      nome: dados.get("nome"),
      empresa: dados.get("empresa") || "-",
      email: dados.get("email"),
      telefone: dados.get("telefone") || "-",
      assunto: dados.get("interesse") || "-",
      mensagem: dados.get("mensagem"),
      _subject: "Contato pelo site EP Energy" + (dados.get("interesse") ? ": " + dados.get("interesse") : ""),
      _template: "table",
      _captcha: "false"
    };
    // multipart/form-data para o FormSubmit receber o anexo
    var envio = new FormData();
    Object.keys(corpo).forEach(function (chave) { envio.append(chave, corpo[chave]); });
    if (arquivo.files[0]) envio.append("attachment", arquivo.files[0]);

    var controle = "AbortController" in window ? new AbortController() : null;
    var limite = controle && setTimeout(function () { controle.abort(); }, arquivo.files[0] ? 60000 : 15000);
    botaoEmail.setAttribute("aria-busy", "true");
    botaoEmail.disabled = true;
    botaoEmail.textContent = "Enviando…";

    fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: envio,
      signal: controle ? controle.signal : undefined
    })
      .then(function (resposta) { return resposta.json().catch(function () { return {}; }).then(function (json) { return { ok: resposta.ok, json: json }; }); })
      .then(function (r) {
        if (!r.ok || String(r.json.success) !== "true") throw new Error(r.json.message || "Falha no envio");
        form.reset();
        arquivo.setCustomValidity("");
        mostrarStatus("ok", "<strong>Mensagem enviada.</strong> Nossa equipe responde no e-mail informado em breve.");
      })
      .catch(function () {
        mostrarStatus("erro",
          "<strong>Não foi possível enviar agora.</strong> Verifique a sua conexão e tente de novo, ou fale com a gente pelo " +
          '<a href="' + urlWhats(resumo(dados, "\n")) + '" target="_blank" rel="noopener">WhatsApp</a> ou pelo e-mail ' +
          '<a href="mailto:' + destino + '">' + destino + "</a>.");
      })
      .then(function () {
        if (limite) clearTimeout(limite);
        botaoEmail.removeAttribute("aria-busy");
        botaoEmail.disabled = false;
        botaoEmail.textContent = "Enviar por e-mail";
      });
  });

  // Envio pelo WhatsApp: só nome e mensagem são obrigatórios
  botaoWhats.addEventListener("click", function () {
    status.textContent = "";
    if (!validar([form.nome, form.mensagem])) return;
    var anexo = nomeArquivo();
    var texto = "Olá! Vim pelo site da EP Energy.\n\n" + resumo(new FormData(form), "\n");
    var janela = window.open(urlWhats(texto), "_blank");
    if (janela) janela.opener = null;
    else window.location.href = urlWhats(texto); // bloqueador de pop-up: abre na mesma aba
    mostrarStatus("ok", anexo
      ? "Abrimos o WhatsApp com a sua mensagem pronta. Envie o texto e, em seguida, toque no clipe (📎) para anexar o projeto <strong>" +
        anexo.replace(/[&<>"]/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }) + "</strong>."
      : "Abrimos o WhatsApp com a sua mensagem pronta. É só tocar em enviar.");
  });
})();
