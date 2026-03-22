# Stripe: Migrar de Test para Producao

> Guia completo para ativar pagamentos reais no Buug.io

---

## Indice

1. [Ativar conta Stripe Live](#1-ativar-conta-stripe-live)
2. [Criar produtos e precos em producao](#2-criar-produtos-e-precos-em-producao)
3. [Copiar chaves live](#3-copiar-chaves-live)
4. [Criar webhook de producao](#4-criar-webhook-de-producao)
5. [Configurar variaveis na Vercel](#5-configurar-variaveis-na-vercel)
6. [Migrar clientes test para live](#6-migrar-clientes-test-para-live)
7. [Validacao pos-deploy](#7-validacao-pos-deploy)
8. [Referencia de variaveis de ambiente](#8-referencia-de-variaveis-de-ambiente)

---

## 1. Ativar conta Stripe Live

1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com)
2. Desligue o toggle **"Test mode"** (canto superior direito)
3. Complete a verificacao da conta:
   - Dados pessoais ou da empresa
   - Conta bancaria para recebimentos
   - Documentacao exigida pelo Stripe

> **Importante:** Sem a verificacao completa, voce nao consegue receber pagamentos reais.

---

## 2. Criar produtos e precos em producao

No Stripe Dashboard (modo live), va em **Products > Add product** e crie:

| Produto | Preco | Recorrencia | Campo no .env |
|---------|-------|-------------|---------------|
| Buug Pro Mensal | R$ 49,00 | Mensal | `STRIPE_PRO_MONTHLY_PRICE_ID` |
| Buug Pro Anual | R$ XXX,00 | Anual | `STRIPE_PRO_YEARLY_PRICE_ID` |
| Buug Business Mensal | R$ 149,00 | Mensal | `STRIPE_BUSINESS_MONTHLY_PRICE_ID` |
| Buug Business Anual | R$ XXX,00 | Anual | `STRIPE_BUSINESS_YEARLY_PRICE_ID` |

Apos criar cada preco, copie o **Price ID** (`price_...`) — voce vai precisar no passo 5.

---

## 3. Copiar chaves live

No Stripe Dashboard (modo live):

1. Va em **Developers > API Keys**
2. Copie:
   - **Secret key:** `sk_live_...` (nunca exponha publicamente)
   - **Publishable key:** `pk_live_...`

---

## 4. Criar webhook de producao

1. Va em **Developers > Webhooks > Add endpoint**
2. Configure:
   - **URL:** `https://buug.io/api/webhooks/stripe`
   - **Eventos:**
     - `checkout.session.completed`
     - `invoice.paid`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
3. Apos criar, copie o **Signing secret** (`whsec_...`)

---

## 5. Configurar variaveis na Vercel

Va em **Vercel > Projeto > Settings > Environment Variables**.

Configure as seguintes variaveis **somente no ambiente Production**:

```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_...

NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID=price_...
```

> **Dica:** Mantenha as chaves `sk_test_` nos ambientes Preview/Development da Vercel. Assim o ambiente de teste continua funcionando.

Depois de salvar, faca um **Redeploy**: Deployments > ultimo deploy > Redeploy.

---

## 6. Migrar clientes test para live

### Por que preciso migrar?

Clientes criados no modo test do Stripe (IDs `cus_test_...`, `sub_test_...`) **nao existem** no modo live. Se nao fizer a migracao, esses clientes vao:
- Ver erros ao tentar acessar o portal de billing
- Nao conseguir alterar/cancelar o plano
- Continuar com o plano ativo no banco mas sem assinatura real

### Passo a passo

#### 6.1 Identificar clientes test no banco

Execute no Supabase (SQL Editor):

```sql
-- Listar todos os clientes com dados de Stripe test
SELECT
  id,
  name,
  plan,
  "planPeriod",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "planExpiresAt"
FROM "Organization"
WHERE "stripeCustomerId" IS NOT NULL
   OR "stripeSubscriptionId" IS NOT NULL
   OR plan != 'FREE'
ORDER BY "createdAt" DESC;
```

#### 6.2 Decidir a estrategia por cliente

Para cada cliente da lista, escolha UMA opcao:

**Opcao A — Reset para FREE (recomendado para maioria)**

O cliente tera que assinar novamente. Ideal para contas de teste ou clientes que ainda nao pagaram de verdade.

```sql
-- Substitua 'ORG_ID' pelo ID real
UPDATE "Organization"
SET
  plan = 'FREE',
  "planPeriod" = NULL,
  "stripeCustomerId" = NULL,
  "stripeSubscriptionId" = NULL,
  "planExpiresAt" = NULL,
  "maxReportsPerMonth" = 50
WHERE id = 'ORG_ID';
```

**Opcao B — Resetar TODOS os clientes test de uma vez**

Se todos os clientes atuais foram criados em modo test:

```sql
UPDATE "Organization"
SET
  plan = 'FREE',
  "planPeriod" = NULL,
  "stripeCustomerId" = NULL,
  "stripeSubscriptionId" = NULL,
  "planExpiresAt" = NULL,
  "maxReportsPerMonth" = 50
WHERE "stripeCustomerId" IS NOT NULL
   OR "stripeSubscriptionId" IS NOT NULL;
```

**Opcao C — Manter plano ativo sem Stripe (cortesia temporaria)**

Se voce quer manter o acesso do cliente enquanto ele nao re-assina:

```sql
UPDATE "Organization"
SET
  "stripeCustomerId" = NULL,
  "stripeSubscriptionId" = NULL
WHERE id = 'ORG_ID';
```

> O cliente mantera o plano PRO/BUSINESS mas sem link com Stripe. Voce precisara gerenciar manualmente.

#### 6.3 Notificar clientes (se aplicavel)

Se havia clientes pagantes reais no modo test (improvavel, mas possivel), envie um email explicando:

- O sistema foi migrado para pagamentos em producao
- Eles precisam re-assinar o plano
- Oferecer um link direto: `https://buug.io/plans/upgrade`
- Opcional: oferecer um cupom de desconto no Stripe como cortesia

---

## 7. Validacao pos-deploy

Apos configurar tudo, siga este checklist:

- [ ] Acessar `https://buug.io/api/billing/prices` — deve retornar precos live
- [ ] Acessar `https://buug.io/plans/upgrade` — precos devem bater com o Stripe live
- [ ] Fazer uma compra real com cartao de teste do Stripe:
  - Use `4242 4242 4242 4242` (cartao de teste que funciona em live durante verificacao)
  - Ou use um cartao real de baixo valor
- [ ] No Stripe Dashboard (live), verificar que o pagamento apareceu
- [ ] Em **Developers > Webhooks**, verificar que o webhook retornou `200`
- [ ] No Supabase, verificar que a Organization foi atualizada:
  - `plan` = PRO ou BUSINESS
  - `stripeCustomerId` = `cus_...` (sem "test")
  - `stripeSubscriptionId` = `sub_...` (sem "test")
- [ ] Testar o portal de billing: clicar em "Gerenciar assinatura" na pagina de planos
- [ ] Cancelar a assinatura de teste e verificar que o webhook de `customer.subscription.deleted` reseta para FREE

---

## 8. Referencia de variaveis de ambiente

### Stripe

| Variavel | Descricao | Onde conseguir |
|----------|-----------|----------------|
| `STRIPE_SECRET_KEY` | Chave secreta (server-only) | Stripe > Developers > API Keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave publica (client-safe) | Stripe > Developers > API Keys |
| `STRIPE_WEBHOOK_SECRET` | Assinatura do webhook | Stripe > Developers > Webhooks > endpoint > Signing secret |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | ID do preco Pro mensal | Stripe > Products > Pro > Price ID |
| `STRIPE_PRO_YEARLY_PRICE_ID` | ID do preco Pro anual | Stripe > Products > Pro > Price ID |
| `STRIPE_BUSINESS_MONTHLY_PRICE_ID` | ID do preco Business mensal | Stripe > Products > Business > Price ID |
| `STRIPE_BUSINESS_YEARLY_PRICE_ID` | ID do preco Business anual | Stripe > Products > Business > Price ID |

### Supabase

Nenhuma variavel do Supabase precisa mudar para a migracao do Stripe.

### Vercel

Nenhuma variavel extra da Vercel e necessaria alem das listadas acima.

---

## Troubleshooting

### "No such customer" ao acessar portal de billing
O `stripeCustomerId` no banco aponta para um cliente test que nao existe em live.
**Solucao:** Limpar `stripeCustomerId` e `stripeSubscriptionId` da Organization (opcao A ou B do passo 6.2).

### Webhook retorna 400/401
O `STRIPE_WEBHOOK_SECRET` esta incorreto ou e do endpoint test.
**Solucao:** Copiar o signing secret do webhook de producao (nao o de test).

### Precos mostram R$ 0 ou valores errados
As env vars de Price ID estao vazias ou apontam para IDs test.
**Solucao:** Verificar as 8 variaveis de Price ID na Vercel.

### Checkout redireciona para pagina de erro
A `STRIPE_SECRET_KEY` ainda e test (`sk_test_...`) em producao.
**Solucao:** Verificar que a variavel na Vercel (Production) e `sk_live_...`.

---

*Documento gerado em Marco/2026 para o projeto Buug.io (FeedbackView)*
