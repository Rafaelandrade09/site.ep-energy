# EP Energy — site

Site estático da EP Energy em HTML5, CSS3, Bootstrap 5.3.3 e JavaScript puro. Não há dependências para instalar.

## Comandos

```bash
npm run gerar     # regrava todas as páginas em site/ (node fonte/gerar.mjs)
npm run servir    # http://localhost:8080 (python -m http.server)
```

Para só visualizar, também dá para abrir `site/index.html` com dois cliques: todos os caminhos são relativos.
(O envio do formulário por e-mail só funciona com o site publicado ou rodando pelo `npm run servir`.)

Para publicar, envie o **conteúdo** da pasta `site/` para a raiz (ou uma subpasta) de qualquer hospedagem estática
(Hostinger, Locaweb, HostGator, Netlify, Vercel, GitHub Pages etc.).

## Estrutura

```
fonte/                 ← o que você edita
  gerar.mjs            cabeçalho, rodapé, capa, catálogo, ficha técnica, contatos (CONTATO)
  paginas/             conteúdo de Sobre e Contato
  dados/               catálogo de produtos (gimi, pogliano, bonomi) e serviços
  icones/              ícone do WhatsApp
site/                  ← o que vai para o ar (gerado; não edite os index.html à mão)
  assets/css/main.css  cores, tipografia e componentes (comece por :root)
  assets/js/main.js    formulário (e-mail e WhatsApp), galeria, animação do barramento
  assets/img/          imagens otimizadas
```

| URL | Conteúdo |
| --- | --- |
| `/` | Capa com diagrama unifilar navegável |
| `/NossasSolucoes/` | Catálogo por linha, serviços, transformadores e energia solar |
| `/produtos/<slug>/` | 13 fichas técnicas |
| `/Sobre/`, `/Contato/` | Institucional e formulário |
| `/desktop-26/`, `/produtos/cubiculo-modular-2500a/` | Redirecionam para `/produtos/maggiore/` |

## Contatos e integrações

Número e e-mail ficam só em `CONTATO`, no topo de `fonte/gerar.mjs`. Altere ali e rode `npm run gerar`.

- **WhatsApp e telefone** (+55 17 99147-9585, número único): botão flutuante em todas as páginas, botão em cada ficha de produto
  (a mensagem já cita o produto), rodapé, faixas de contato e opção "Enviar pelo WhatsApp" no formulário.
- **E-mail** (danilo@ep-energy.com.br): o formulário envia pelo [FormSubmit](https://formsubmit.co), serviço
  gratuito que entrega o formulário de sites estáticos por e-mail, sem servidor próprio.

### Ativação do envio por e-mail (uma única vez)

1. Publique o site e envie um formulário de teste pela página Contato.
2. O FormSubmit manda para danilo@ep-energy.com.br um e-mail **"Action Required: Activate FormSubmit"**.
   Clique em **Activate Form** (verifique o spam).
3. A partir daí, todo formulário chega como e-mail, com o e-mail do visitante como endereço de resposta.

Opcional: depois da ativação, o FormSubmit mostra um endereço aleatório (ex.: `https://formsubmit.co/ajax/a1b2c3...`)
que esconde o e-mail do código-fonte. Para usá-lo, troque `FORM_ENDPOINT` em `fonte/gerar.mjs` e rode `npm run gerar`.

Se o envio falhar (sem internet, serviço fora do ar), o formulário mostra o erro e oferece WhatsApp e e-mail direto.

**Projeto para análise (anexo opcional):** o formulário aceita um arquivo de até 5 MB (PDF, DWG, DXF, imagem, planilha
ou ZIP). Por e-mail, ele segue como anexo pelo FormSubmit. Pelo WhatsApp não é possível anexar via link, então a mensagem
cita o nome do arquivo e o site orienta o visitante a anexá-lo na conversa pelo clipe.

## Produtos

Textos, fichas técnicas e fotos vieram dos sites e catálogos PDF do Grupo GIMI. Cada ficha informa o fabricante e
linka o catálogo original. Para incluir um produto: adicione-o ao JSON do fabricante em `fonte/dados/`, coloque as
fotos em `site/assets/img/produtos/<slug>-N.jpg` (e `<slug>-N-sm.jpg`, com 640 px) e inclua o `slug` em `CATEGORIAS`.

O gerador corrige erros de digitação dos catálogos (exteno → externo, identicados → identificados,
longituadinalmente → longitudinalmente, participações metálicas → partições metálicas, prateameto → prateamento,
Compartilhamento → Compartimento, autosuportável → autossuportável, frequência 56-60 → 50-60 Hz no Maggiore,
"...31,5" → "até 31,5") e remove referências internas como "(catálogo p.9)".

## Pendências antes de publicar

- **Autorização do Grupo GIMI** para uso de textos e fotos: o rodapé de grupogimi.com.br proíbe reproduzir o
  conteúdo sem autorização prévia e expressa.
- Ativar o FormSubmit (acima).
- Revisar por amostragem as fichas transcritas de PDFs só com imagem: NoTTabile, BX-MT, GB-RING, Microcompact, ESG Matic.
- Divergências nas fontes da GIMI: GB-RING SF6 Free (17,5 kV ou também 24 kV), Microcompact (crista 40 ou 41,6 kA),
  ESG Matic (24 ou 36 kV), BX-E (3,5 kV/5s ou /1s), Caixa MEC (QDC5/MEC XVI), Bimbo ("Grau de poluição 4mm",
  "10kA / sim 26kA / crista" mantidos como no catálogo).
- System Pro E-Power: o texto vem de folheto ABB em português de Portugal ("manípulo", "cablagem").
- Definir o domínio para incluir `canonical` e `og:image`.
