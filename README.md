# Painel OPD Development — Sebring FL

Painel financeiro do projeto das casas em Sebring, com área de edição para Lucas e Tulio.

- **`/`**: painel público, só leitura (o link que vai para os sócios).
- **`/admin`**: área de edição com login. Altere lançamentos, premissas, sócios, cenários, riscos e textos e clique em **Salvar**: o painel atualiza na hora.
- Lucro, ROE, valores por sócio, cenários, sensibilidade, fluxo de caixa e gráficos são **recalculados automaticamente** a partir das premissas e dos lançamentos.
- Cada vez que alguém salva, a versão anterior fica no **Histórico** (dá para restaurar).
- Se os dois editarem ao mesmo tempo, quem salvar por último é avisado, e nada é sobrescrito sem querer.

Tecnologia: Next.js (Vercel) + Postgres (Neon).

## Como publicar (uma vez só)

### 1. Banco no Neon
1. Entre em [console.neon.tech](https://console.neon.tech) → **New Project** (nome: `sebring`, região: US East).
2. Clique em **Connect**, marque **Connection pooling** e copie a connection string (começa com `postgresql://` e termina com `?sslmode=require`).

Não precisa criar tabelas: o app cria tudo sozinho no primeiro acesso, já com os dados atuais do painel.

### 2. Projeto na Vercel
1. Em [vercel.com/new](https://vercel.com/new), importe o repositório do GitHub deste projeto.
2. Antes de clicar em Deploy, abra **Environment Variables** e cadastre:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | a connection string do Neon (passo 1) |
| `ADMIN_USERS` | `lucas:SENHA_DO_LUCAS,tulio:SENHA_DO_TULIO` (senhas com 8+ caracteres, sem vírgula) |
| `SESSION_SECRET` | um texto aleatório com 32+ caracteres (gere um em um gerador de senhas) |

3. Clique em **Deploy**. Em ~1 minuto o site está no ar em `https://<nome>.vercel.app`.

### 3. Usar
- Painel: `https://<nome>.vercel.app`
- Editar: `https://<nome>.vercel.app/admin`

### Trocar senha / tirar acesso
Na Vercel: **Settings → Environment Variables** → edite `ADMIN_USERS` → **Deployments → Redeploy**.
Quem for removido de `ADMIN_USERS` perde o acesso imediatamente, mesmo se estiver logado.
Para derrubar todas as sessões, troque o `SESSION_SECRET`.

### Manter o link antigo do Netlify
Publique no Netlify um `index.html` com apenas:
```html
<meta http-equiv="refresh" content="0; url=https://<nome>.vercel.app">
```

## Como os números funcionam

- **Lançamentos** (valores do projeto inteiro): `Aporte` = dinheiro dos sócios; `Empréstimo` = liberação do hard money (os juros correm da data da liberação até a venda); `Saídas` = pagamentos.
- **Listagem** e **venda** entram no fluxo automaticamente: a venda acontece em `data da listagem + dias no mercado`.
- **Juros** = soma de cada liberação × taxa anual ÷ 365 × dias até a venda.
- **Lucro** = preço × casas × (1 − closing%) − (abertura + casas × (lote + construção + gestão + taxas do empréstimo)) − juros.
- O editor mostra um aviso se as saídas lançadas não baterem com os custos das premissas, se os percentuais dos sócios não somarem 100% ou se o caixa ficar negativo.

## Rodar localmente (opcional)
```bash
cp .env.example .env.local   # preencha os valores
npm install
npm run dev                  # http://localhost:3000
npm test                     # testes do cálculo
```
