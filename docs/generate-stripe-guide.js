const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat, ExternalHyperlink,
} = require('docx');

// ─── Colors ───
const BRAND_BLUE = "2563EB";
const BRAND_DARK = "1E293B";
const LIGHT_BLUE = "EFF6FF";
const LIGHT_GRAY = "F8FAFC";
const BORDER_COLOR = "CBD5E1";
const SUCCESS_GREEN = "16A34A";
const WARNING_AMBER = "D97706";

// ─── Helpers ───
const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, font: "Arial", color: BRAND_DARK })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial", color: BRAND_BLUE })],
  });
}

function heading3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: BRAND_DARK })],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: opts.color || "374151", ...opts })],
  });
}

function richPara(runs) {
  return new Paragraph({
    spacing: { after: 120 },
    children: runs.map(r =>
      new TextRun({ size: 22, font: "Arial", color: "374151", ...r })
    ),
  });
}

function bulletItem(text, ref, level = 0) {
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "374151" })],
  });
}

function numberedItem(text, ref, level = 0) {
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "374151" })],
  });
}

function numberedItemRich(runs, ref, level = 0) {
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 80 },
    children: runs.map(r =>
      new TextRun({ size: 22, font: "Arial", color: "374151", ...r })
    ),
  });
}

function codeBlock(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [new TextRun({ text, size: 20, font: "Courier New", color: "334155" })],
  });
}

function spacer(pts = 200) {
  return new Paragraph({ spacing: { after: pts }, children: [] });
}

function alertBox(text, type = "info") {
  const colors = {
    info: { bg: LIGHT_BLUE, border: BRAND_BLUE, icon: "INFO" },
    warning: { bg: "FFFBEB", border: WARNING_AMBER, icon: "ATENCAO" },
    success: { bg: "F0FDF4", border: SUCCESS_GREEN, icon: "OK" },
  };
  const c = colors[type];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: c.border },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: c.border },
              left: { style: BorderStyle.SINGLE, size: 6, color: c.border },
              right: { style: BorderStyle.SINGLE, size: 1, color: c.border },
            },
            shading: { fill: c.bg, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            width: { size: 9360, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `[${c.icon}] `, bold: true, size: 22, font: "Arial", color: c.border }),
                  new TextRun({ text, size: 22, font: "Arial", color: "374151" }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function envRow(name, example, note) {
  return new TableRow({
    children: [
      new TableCell({
        borders, margins: cellMargins,
        width: { size: 3800, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: name, size: 20, font: "Courier New", bold: true, color: BRAND_DARK })] })],
      }),
      new TableCell({
        borders, margins: cellMargins,
        width: { size: 2800, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: example, size: 20, font: "Courier New", color: "6B7280" })] })],
      }),
      new TableCell({
        borders, margins: cellMargins,
        width: { size: 2760, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: note, size: 20, font: "Arial", color: "6B7280" })] })],
      }),
    ],
  });
}

// ─── Document ───
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: BRAND_DARK },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: BRAND_BLUE },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "steps",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { bold: true, color: BRAND_BLUE } },
        }],
      },
      {
        reference: "substeps",
        levels: [{
          level: 0, format: LevelFormat.LOWER_LETTER, text: "%1)", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
        }],
      },
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: "checks",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2610", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [
    // ═══════════════════════════════════════════
    // COVER PAGE
    // ═══════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        spacer(2000),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND_BLUE, space: 8 } },
          children: [new TextRun({ text: "BUUG.IO", size: 56, bold: true, font: "Arial", color: BRAND_BLUE })],
        }),
        spacer(200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Guia de Migra\u00E7\u00E3o", size: 48, font: "Arial", color: BRAND_DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "Stripe Test Mode \u2192 Produ\u00E7\u00E3o", size: 40, bold: true, font: "Arial", color: BRAND_BLUE })],
        }),
        spacer(400),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Documento interno \u2014 Confidencial", size: 22, font: "Arial", color: "9CA3AF", italics: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: "Mar\u00E7o 2026", size: 22, font: "Arial", color: "9CA3AF" })],
        }),
      ],
    },

    // ═══════════════════════════════════════════
    // MAIN CONTENT
    // ═══════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR, space: 4 } },
              children: [new TextRun({ text: "Buug.io \u2014 Stripe: Guia de Migra\u00E7\u00E3o para Produ\u00E7\u00E3o", size: 18, font: "Arial", color: "9CA3AF", italics: true })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR, space: 4 } },
              children: [
                new TextRun({ text: "P\u00E1gina ", size: 18, font: "Arial", color: "9CA3AF" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: "9CA3AF" }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ─── VISAO GERAL ───
        heading1("Vis\u00E3o Geral"),
        para("Este documento descreve o passo a passo para migrar o sistema de pagamentos do Buug.io do modo teste (demo) do Stripe para o modo de produ\u00E7\u00E3o (live), permitindo receber pagamentos reais."),
        spacer(100),

        alertBox("O Stripe em modo teste e produ\u00E7\u00E3o s\u00E3o ambientes completamente separados. Clientes, assinaturas e webhooks de teste N\u00C3O existem em produ\u00E7\u00E3o.", "warning"),
        spacer(100),

        heading2("O que muda na migra\u00E7\u00E3o"),
        bulletItem("Chaves de API: sk_test_ \u2192 sk_live_ e pk_test_ \u2192 pk_live_", "bullets"),
        bulletItem("Webhook Secret: novo whsec_ para o endpoint de produ\u00E7\u00E3o", "bullets"),
        bulletItem("Price IDs: novos IDs para os produtos criados no modo Live", "bullets"),
        bulletItem("Clientes: novos customers ser\u00E3o criados (clientes de teste n\u00E3o migram)", "bullets"),
        spacer(100),

        heading2("O que N\u00C3O muda"),
        bulletItem("Nenhuma altera\u00E7\u00E3o de c\u00F3digo \u00E9 necess\u00E1ria (tudo j\u00E1 usa vari\u00E1veis de ambiente)", "bullets"),
        bulletItem("O fluxo de checkout, webhooks e portal de billing continuam iguais", "bullets"),
        bulletItem("O banco de dados (Supabase) continua o mesmo", "bullets"),
        spacer(200),

        // ═══════════════════════════════════════════
        // ETAPA 1
        // ═══════════════════════════════════════════
        heading1("Etapa 1 \u2014 Ativar Conta Stripe"),
        para("Antes de usar o modo Live, sua conta Stripe precisa estar totalmente ativada."),
        spacer(80),

        numberedItem("Acesse dashboard.stripe.com", "steps"),
        numberedItem("No canto superior direito, desative o toggle \"Test mode\" (modo de teste)", "steps"),
        numberedItemRich([
          { text: "Se aparecer um banner pedindo ativa\u00E7\u00E3o, clique em " },
          { text: "\"Complete sua ativa\u00E7\u00E3o\"", bold: true },
        ], "steps"),
        numberedItem("Preencha: dados da empresa ou pessoa f\u00EDsica", "steps"),
        numberedItem("Preencha: conta banc\u00E1ria para recebimentos (onde o dinheiro cai)", "steps"),
        numberedItem("Preencha: documenta\u00E7\u00E3o exigida (RG, CNPJ, comprovante etc.)", "steps"),
        numberedItem("Aguarde a aprova\u00E7\u00E3o (geralmente leva de minutos a 1 dia \u00FAtil)", "steps"),
        spacer(100),

        alertBox("Voc\u00EA pode configurar produtos e webhooks enquanto a ativa\u00E7\u00E3o est\u00E1 em andamento. S\u00F3 n\u00E3o vai conseguir receber pagamentos reais at\u00E9 a aprova\u00E7\u00E3o.", "info"),
        spacer(200),

        // ═══════════════════════════════════════════
        // ETAPA 2
        // ═══════════════════════════════════════════
        heading1("Etapa 2 \u2014 Criar Produtos e Pre\u00E7os no Modo Live"),
        richPara([
          { text: "Os produtos do modo teste " },
          { text: "n\u00E3o existem", bold: true },
          { text: " no modo Live. Voc\u00EA precisa recri\u00E1-los." },
        ]),
        spacer(80),

        numberedItem("No Stripe Dashboard, certifique-se de que o \"Test mode\" est\u00E1 DESATIVADO", "steps"),
        numberedItemRich([
          { text: "V\u00E1 em " },
          { text: "Products \u2192 Add product", bold: true },
        ], "steps"),
        numberedItem("Crie o produto \"Plano PRO\" com os seguintes pre\u00E7os:", "steps"),
        numberedItemRich([
          { text: "PRO Mensal: " },
          { text: "R$ 49,00/m\u00EAs", bold: true },
          { text: " (recurring, monthly)" },
        ], "substeps"),
        numberedItemRich([
          { text: "PRO Anual: " },
          { text: "R$ XX/ano", bold: true },
          { text: " (recurring, yearly) \u2014 se aplic\u00E1vel" },
        ], "substeps"),
        numberedItem("Crie o produto \"Plano BUSINESS\" com os seguintes pre\u00E7os:", "steps"),
        numberedItemRich([
          { text: "BUSINESS Mensal: " },
          { text: "R$ 149,00/m\u00EAs", bold: true },
          { text: " (recurring, monthly)" },
        ], "substeps"),
        numberedItemRich([
          { text: "BUSINESS Anual: " },
          { text: "R$ XX/ano", bold: true },
          { text: " (recurring, yearly) \u2014 se aplic\u00E1vel" },
        ], "substeps"),
        spacer(80),

        numberedItemRich([
          { text: "Para cada pre\u00E7o criado, copie o " },
          { text: "Price ID", bold: true },
          { text: " (come\u00E7a com price_)" },
        ], "steps"),
        spacer(80),

        alertBox("Anote os 4 Price IDs \u2014 voc\u00EA vai precisar deles na Etapa 4.", "info"),
        spacer(100),

        // Tabela de Price IDs
        heading3("Tabela de Pre\u00E7os para Refer\u00EAncia"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2500, 2500, 2180, 2180],
          rows: [
            new TableRow({
              children: ["Plano", "Periodo", "Pre\u00E7o", "Price ID"].map(text =>
                new TableCell({
                  borders,
                  margins: cellMargins,
                  shading: { fill: BRAND_BLUE, type: ShadingType.CLEAR },
                  width: { size: 2340, type: WidthType.DXA },
                  children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: "Arial", bold: true, color: "FFFFFF" })] })],
                })
              ),
            }),
            ...["PRO|Mensal|R$ 49,00|price_XXXX", "PRO|Anual|R$ XX|price_XXXX", "BUSINESS|Mensal|R$ 149,00|price_XXXX", "BUSINESS|Anual|R$ XX|price_XXXX"].map((row, i) => {
              const [plan, period, price, id] = row.split("|");
              return new TableRow({
                children: [plan, period, price, id].map(text =>
                  new TableCell({
                    borders, margins: cellMargins,
                    shading: { fill: i % 2 === 0 ? LIGHT_GRAY : "FFFFFF", type: ShadingType.CLEAR },
                    width: { size: 2340, type: WidthType.DXA },
                    children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: text.startsWith("price_") ? "Courier New" : "Arial", color: "374151" })] })],
                  })
                ),
              });
            }),
          ],
        }),
        spacer(200),

        // ═══════════════════════════════════════════
        // ETAPA 3
        // ═══════════════════════════════════════════
        heading1("Etapa 3 \u2014 Obter Chaves de API Live"),
        spacer(80),

        numberedItemRich([
          { text: "No Stripe Dashboard (modo Live), v\u00E1 em " },
          { text: "Developers \u2192 API Keys", bold: true },
        ], "steps"),
        numberedItemRich([
          { text: "Copie a " },
          { text: "Publishable key", bold: true },
          { text: " (come\u00E7a com pk_live_)" },
        ], "steps"),
        numberedItemRich([
          { text: "Copie a " },
          { text: "Secret key", bold: true },
          { text: " (come\u00E7a com sk_live_)" },
        ], "steps"),
        spacer(100),

        alertBox("NUNCA compartilhe a Secret Key (sk_live_). Ela d\u00E1 acesso total \u00E0 sua conta Stripe.", "warning"),
        spacer(200),

        // ═══════════════════════════════════════════
        // ETAPA 4
        // ═══════════════════════════════════════════
        heading1("Etapa 4 \u2014 Configurar Webhook de Produ\u00E7\u00E3o"),
        para("O webhook \u00E9 como o Stripe avisa o Buug.io sobre eventos de pagamento (nova assinatura, cancelamento etc.)."),
        spacer(80),

        numberedItemRich([
          { text: "No Stripe Dashboard (modo Live), v\u00E1 em " },
          { text: "Developers \u2192 Webhooks", bold: true },
        ], "steps"),
        numberedItemRich([
          { text: "Clique em " },
          { text: "\"Add endpoint\"", bold: true },
        ], "steps"),
        numberedItem("Configure a URL do endpoint:", "steps"),
        codeBlock("https://buug.io/api/webhooks/stripe"),
        spacer(80),
        numberedItem("Selecione os 4 eventos abaixo:", "steps"),
        spacer(80),

        // Tabela de eventos
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4000, 5360],
          rows: [
            new TableRow({
              children: ["Evento", "Quando dispara"].map((text, i) =>
                new TableCell({
                  borders, margins: cellMargins,
                  shading: { fill: BRAND_BLUE, type: ShadingType.CLEAR },
                  width: { size: i === 0 ? 4000 : 5360, type: WidthType.DXA },
                  children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: "Arial", bold: true, color: "FFFFFF" })] })],
                })
              ),
            }),
            ...[
              ["checkout.session.completed", "Usu\u00E1rio finaliza o checkout e assina um plano"],
              ["invoice.paid", "Fatura paga (renova\u00E7\u00E3o autom\u00E1tica de assinatura)"],
              ["customer.subscription.updated", "Assinatura alterada (upgrade/downgrade de plano)"],
              ["customer.subscription.deleted", "Assinatura cancelada (reverte para Free)"],
            ].map(([event, desc], i) =>
              new TableRow({
                children: [
                  new TableCell({
                    borders, margins: cellMargins,
                    shading: { fill: i % 2 === 0 ? LIGHT_GRAY : "FFFFFF", type: ShadingType.CLEAR },
                    width: { size: 4000, type: WidthType.DXA },
                    children: [new Paragraph({ children: [new TextRun({ text: event, size: 20, font: "Courier New", color: "374151" })] })],
                  }),
                  new TableCell({
                    borders, margins: cellMargins,
                    shading: { fill: i % 2 === 0 ? LIGHT_GRAY : "FFFFFF", type: ShadingType.CLEAR },
                    width: { size: 5360, type: WidthType.DXA },
                    children: [new Paragraph({ children: [new TextRun({ text: desc, size: 20, font: "Arial", color: "374151" })] })],
                  }),
                ],
              })
            ),
          ],
        }),
        spacer(100),

        numberedItemRich([
          { text: "Ap\u00F3s criar, copie o " },
          { text: "Signing secret", bold: true },
          { text: " (come\u00E7a com whsec_)" },
        ], "steps"),
        spacer(200),

        // ═══════════════════════════════════════════
        // ETAPA 5
        // ═══════════════════════════════════════════
        heading1("Etapa 5 \u2014 Atualizar Vari\u00E1veis na Vercel"),
        para("Todas as chaves do Stripe s\u00E3o configuradas como vari\u00E1veis de ambiente na Vercel. N\u00E3o \u00E9 necess\u00E1rio alterar nenhum c\u00F3digo."),
        spacer(80),

        numberedItemRich([
          { text: "Acesse " },
          { text: "vercel.com \u2192 seu projeto \u2192 Settings \u2192 Environment Variables", bold: true },
        ], "steps"),
        numberedItem("Atualize as seguintes vari\u00E1veis (substitua os valores de teste pelos de produ\u00E7\u00E3o):", "steps"),
        spacer(80),

        // Tabela de env vars
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3800, 2800, 2760],
          rows: [
            new TableRow({
              children: ["Vari\u00E1vel", "Formato", "Onde encontrar"].map((text, i) =>
                new TableCell({
                  borders, margins: cellMargins,
                  shading: { fill: BRAND_BLUE, type: ShadingType.CLEAR },
                  width: { size: [3800, 2800, 2760][i], type: WidthType.DXA },
                  children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: "Arial", bold: true, color: "FFFFFF" })] })],
                })
              ),
            }),
            envRow("STRIPE_SECRET_KEY", "sk_live_...", "Developers > API Keys"),
            envRow("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_live_...", "Developers > API Keys"),
            envRow("STRIPE_WEBHOOK_SECRET", "whsec_...", "Developers > Webhooks"),
            envRow("STRIPE_PRO_MONTHLY_PRICE_ID", "price_...", "Products > PRO > Mensal"),
            envRow("STRIPE_PRO_YEARLY_PRICE_ID", "price_...", "Products > PRO > Anual"),
            envRow("STRIPE_BUSINESS_MONTHLY_PRICE_ID", "price_...", "Products > BUSINESS > Mensal"),
            envRow("STRIPE_BUSINESS_YEARLY_PRICE_ID", "price_...", "Products > BUSINESS > Anual"),
            envRow("NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID", "price_...", "Mesmo do PRO Mensal"),
            envRow("NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID", "price_...", "Mesmo do PRO Anual"),
            envRow("NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID", "price_...", "Mesmo do BUSINESS Mensal"),
            envRow("NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID", "price_...", "Mesmo do BUSINESS Anual"),
          ],
        }),
        spacer(100),

        alertBox("As vari\u00E1veis NEXT_PUBLIC_ e as sem prefixo devem ter o MESMO valor. A diferen\u00E7a \u00E9 que NEXT_PUBLIC_ fica vis\u00EDvel no frontend.", "info"),
        spacer(80),

        numberedItemRich([
          { text: "Ap\u00F3s salvar, fa\u00E7a um " },
          { text: "Redeploy", bold: true },
          { text: " na Vercel para aplicar as novas vari\u00E1veis" },
        ], "steps"),
        spacer(200),

        // ═══════════════════════════════════════════
        // ETAPA 6
        // ═══════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        heading1("Etapa 6 \u2014 Testar o Fluxo em Produ\u00E7\u00E3o"),
        para("Ap\u00F3s o deploy, teste o fluxo completo para garantir que tudo funciona."),
        spacer(80),

        heading3("Teste de Assinatura"),
        numberedItem("Acesse buug.io e fa\u00E7a login com uma conta de teste", "steps"),
        numberedItem("V\u00E1 em Planos e clique para assinar o plano PRO", "steps"),
        numberedItem("Use um cart\u00E3o real (ser\u00E1 cobrado de verdade)", "steps"),
        numberedItem("Verifique se o checkout redireciona para a p\u00E1gina de sucesso", "steps"),
        numberedItem("Verifique no Stripe Dashboard se o pagamento apareceu", "steps"),
        numberedItem("Verifique no Supabase se a Organization foi atualizada (plan = PRO)", "steps"),
        spacer(100),

        heading3("Teste de Webhook"),
        numberedItem("No Stripe Dashboard, v\u00E1 em Developers \u2192 Webhooks", "steps"),
        numberedItem("Clique no endpoint de produ\u00E7\u00E3o", "steps"),
        numberedItem("Verifique os \"Recent deliveries\" \u2014 devem mostrar status 200", "steps"),
        numberedItem("Se algum falhou (4xx/5xx), clique nele para ver o erro", "steps"),
        spacer(100),

        heading3("Teste de Cancelamento"),
        numberedItem("Use o portal de billing para cancelar a assinatura de teste", "steps"),
        numberedItem("Verifique se o webhook customer.subscription.deleted foi recebido", "steps"),
        numberedItem("Verifique no Supabase se a Organization voltou para FREE", "steps"),
        spacer(100),

        alertBox("Ap\u00F3s testar, voc\u00EA pode reembolsar a cobran\u00E7a de teste pelo Stripe Dashboard (Payments \u2192 selecione o pagamento \u2192 Refund).", "success"),
        spacer(200),

        // ═══════════════════════════════════════════
        // PRECOS DINAMICOS
        // ═══════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        heading1("Pre\u00E7os Din\u00E2micos (Importante)"),
        spacer(80),

        heading2("Como funciona hoje"),
        para("O Stripe j\u00E1 gerencia os pre\u00E7os automaticamente para cobran\u00E7as:"),
        bulletItem("Quando um usu\u00E1rio assina, o checkout usa o Price ID configurado", "bullets"),
        bulletItem("O valor cobrado \u00E9 o que est\u00E1 no Stripe, n\u00E3o no c\u00F3digo", "bullets"),
        bulletItem("Se voce alterar o pre\u00E7o no Stripe, novos assinantes pagam o novo valor", "bullets"),
        bulletItem("Assinantes existentes continuam pagando o valor original", "bullets"),
        spacer(100),

        alertBox("Para COBRAN\u00C7AS, n\u00E3o precisa fazer nada. O Stripe j\u00E1 garante que cada assinante paga o pre\u00E7o que contratou.", "success"),
        spacer(100),

        heading2("Problema: Pre\u00E7os exibidos no site"),
        para("Os pre\u00E7os mostrados no site (R$ 49, R$ 149) est\u00E3o escritos diretamente no c\u00F3digo (hardcoded) em 4 arquivos:"),
        spacer(80),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [5000, 4360],
          rows: [
            new TableRow({
              children: ["Arquivo", "O que mostra"].map((text, i) =>
                new TableCell({
                  borders, margins: cellMargins,
                  shading: { fill: BRAND_BLUE, type: ShadingType.CLEAR },
                  width: { size: i === 0 ? 5000 : 4360, type: WidthType.DXA },
                  children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: "Arial", bold: true, color: "FFFFFF" })] })],
                })
              ),
            }),
            ...[
              ["apps/web/app/plans/page.tsx", "P\u00E1gina de planos (plano atual)"],
              ["apps/web/app/plans/upgrade/page.tsx", "P\u00E1gina de upgrade (sele\u00E7\u00E3o)"],
              ["apps/web/components/ui/UpgradeModal.tsx", "Modal de upgrade"],
              ["apps/web/app/page.tsx", "Landing page (se\u00E7\u00E3o pricing)"],
            ].map(([file, desc], i) =>
              new TableRow({
                children: [
                  new TableCell({
                    borders, margins: cellMargins,
                    shading: { fill: i % 2 === 0 ? LIGHT_GRAY : "FFFFFF", type: ShadingType.CLEAR },
                    width: { size: 5000, type: WidthType.DXA },
                    children: [new Paragraph({ children: [new TextRun({ text: file, size: 18, font: "Courier New", color: "374151" })] })],
                  }),
                  new TableCell({
                    borders, margins: cellMargins,
                    shading: { fill: i % 2 === 0 ? LIGHT_GRAY : "FFFFFF", type: ShadingType.CLEAR },
                    width: { size: 4360, type: WidthType.DXA },
                    children: [new Paragraph({ children: [new TextRun({ text: desc, size: 20, font: "Arial", color: "374151" })] })],
                  }),
                ],
              })
            ),
          ],
        }),
        spacer(100),

        heading2("Solu\u00E7\u00E3o recomendada"),
        para("Para que os pre\u00E7os exibidos no site atualizem automaticamente quando voce mudar no Stripe, a melhor abordagem \u00E9:"),
        spacer(80),

        richPara([
          { text: "Op\u00E7\u00E3o A \u2014 API Route que busca do Stripe (recomendado): ", bold: true },
          { text: "Criar um endpoint /api/billing/prices que consulta os pre\u00E7os atuais no Stripe usando os Price IDs e retorna os valores formatados. O frontend busca desse endpoint ao carregar as p\u00E1ginas de planos." },
        ]),
        spacer(80),

        richPara([
          { text: "Op\u00E7\u00E3o B \u2014 Vari\u00E1veis de ambiente: ", bold: true },
          { text: "Adicionar NEXT_PUBLIC_PRO_PRICE=\"49\" e NEXT_PUBLIC_BUSINESS_PRICE=\"149\" na Vercel. Simples, mas requer redeploy a cada mudan\u00E7a de pre\u00E7o." },
        ]),
        spacer(80),

        richPara([
          { text: "Op\u00E7\u00E3o C \u2014 Tabela no Supabase: ", bold: true },
          { text: "Criar uma tabela plan_config no Supabase com os pre\u00E7os de exibi\u00E7\u00E3o. F\u00E1cil de atualizar, mas adiciona complexidade." },
        ]),
        spacer(100),

        alertBox("A Op\u00E7\u00E3o A \u00E9 a mais robusta: os pre\u00E7os v\u00EAm diretamente do Stripe, sem duplica\u00E7\u00E3o de dados. Uma mudan\u00E7a no Stripe reflete automaticamente no site.", "info"),
        spacer(200),

        // ═══════════════════════════════════════════
        // WEBHOOK FALLBACK
        // ═══════════════════════════════════════════
        heading1("Aten\u00E7\u00E3o: Valores de Fallback no Webhook"),
        para("O webhook tem um fallback que detecta o plano pelo valor em centavos. Se voce alterar os pre\u00E7os no Stripe, atualize tamb\u00E9m esses valores:"),
        spacer(80),

        heading3("Arquivo: apps/web/app/api/webhooks/stripe/route.ts"),
        codeBlock("// Linha 63-64 (fallback de detec\u00E7\u00E3o de plano)"),
        codeBlock("if (amount === 4900) plan = 'PRO'        // R$ 49,00"),
        codeBlock("if (amount === 14900) plan = 'BUSINESS'   // R$ 149,00"),
        spacer(80),

        alertBox("Esse fallback s\u00F3 \u00E9 usado se o metadata e o Price ID falharem. \u00C9 uma \u00FAltima linha de defesa. Ainda assim, mantenha atualizado se mudar os pre\u00E7os.", "warning"),
        spacer(200),

        // ═══════════════════════════════════════════
        // CHECKLIST
        // ═══════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        heading1("Checklist Final"),
        para("Use esta lista para confirmar que tudo foi configurado corretamente:"),
        spacer(100),

        heading3("Stripe Dashboard"),
        bulletItem("Conta Stripe ativada e aprovada", "checks"),
        bulletItem("Produto PRO criado no modo Live com pre\u00E7o mensal (e anual se aplic\u00E1vel)", "checks"),
        bulletItem("Produto BUSINESS criado no modo Live com pre\u00E7o mensal (e anual se aplic\u00E1vel)", "checks"),
        bulletItem("Webhook de produ\u00E7\u00E3o criado com URL correta e 4 eventos selecionados", "checks"),
        spacer(100),

        heading3("Vercel"),
        bulletItem("STRIPE_SECRET_KEY atualizada (sk_live_...)", "checks"),
        bulletItem("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY atualizada (pk_live_...)", "checks"),
        bulletItem("STRIPE_WEBHOOK_SECRET atualizada (whsec_...)", "checks"),
        bulletItem("4 Price IDs atualizados (STRIPE_*_PRICE_ID)", "checks"),
        bulletItem("4 Price IDs p\u00FAblicos atualizados (NEXT_PUBLIC_STRIPE_*_PRICE_ID)", "checks"),
        bulletItem("Redeploy realizado ap\u00F3s atualizar as vari\u00E1veis", "checks"),
        spacer(100),

        heading3("Testes"),
        bulletItem("Checkout funciona e redireciona para p\u00E1gina de sucesso", "checks"),
        bulletItem("Pagamento aparece no Stripe Dashboard", "checks"),
        bulletItem("Organization atualizada no Supabase (plan, stripeSubscriptionId)", "checks"),
        bulletItem("Webhook retornando status 200 no Stripe", "checks"),
        bulletItem("Cancelamento funciona e reverte para FREE", "checks"),
        bulletItem("Cobran\u00E7a de teste reembolsada", "checks"),
        spacer(200),

        // ═══════════════════════════════════════════
        // TROUBLESHOOTING
        // ═══════════════════════════════════════════
        heading1("Resolu\u00E7\u00E3o de Problemas"),
        spacer(80),

        heading3("Webhook retornando 400/401"),
        bulletItem("Verifique se o STRIPE_WEBHOOK_SECRET est\u00E1 correto na Vercel", "bullets"),
        bulletItem("Verifique se a URL do webhook est\u00E1 acessivel (https://buug.io/api/webhooks/stripe)", "bullets"),
        bulletItem("Confirme que o signing secret \u00E9 do endpoint de PRODU\u00C7\u00C3O, n\u00E3o do teste", "bullets"),
        spacer(80),

        heading3("Checkout n\u00E3o abre / erro 500"),
        bulletItem("Verifique se STRIPE_SECRET_KEY \u00E9 sk_live_ (n\u00E3o sk_test_)", "bullets"),
        bulletItem("Verifique se os Price IDs existem no modo Live (n\u00E3o s\u00E3o IDs de teste)", "bullets"),
        bulletItem("Verifique os logs da Vercel (Runtime Logs) para detalhes do erro", "bullets"),
        spacer(80),

        heading3("Plano n\u00E3o atualiza no banco ap\u00F3s pagamento"),
        bulletItem("Verifique se o webhook est\u00E1 chegando (Stripe > Webhooks > Recent deliveries)", "bullets"),
        bulletItem("Verifique se o orgId est\u00E1 no metadata da session/subscription", "bullets"),
        bulletItem("Verifique os logs do webhook na Vercel", "bullets"),
        spacer(200),
      ],
    },
  ],
});

// ─── Generate ───
Packer.toBuffer(doc).then(buffer => {
  const outPath = "/Users/lucas/Downloads/feedback_view/feedbackview/docs/stripe-producao-guia.docx";
  fs.writeFileSync(outPath, buffer);
  console.log(`Document created: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
});
