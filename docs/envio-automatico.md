# Envio automático de relatórios por e-mail

O NefroControl manda dois e-mails sozinho, sem ninguém logado no console:

| Envio | Quando | O que vai |
| --- | --- | --- |
| Resumo mensal | todo dia 1º, 08:00 (Brasília) | licenças contratadas/em uso/livres, contas por situação, MFA pendente, economia possível, contas de "redução certa" e três CSVs em anexo (contas sem acesso, inventário de licenças, economia) |
| Alerta de conta inativa | toda segunda, 08:00 | contas que passaram de 90 dias sem acesso nos últimos 7 dias — só é enviado quando existe alguma |

Quem executa é o **GitHub Actions** do repositório (`.github/workflows/envio-automatico.yml`),
rodando `apps/web/scripts/envio-automatico.ts`. O script pega um token de aplicativo no
Entra ID, lê a Microsoft Graph, monta o e-mail com as mesmas funções da tela Relatórios
(`apps/web/src/lib/resumoEmail.ts`) e envia com `POST /users/{remetente}/sendMail`.

A tela **Relatórios** do site mostra a configuração, o resultado do último disparo e tem o
botão **Enviar agora**, que manda o mesmo e-mail na hora pela caixa de quem está logado
(escopo `Mail.Send`, pedido por consentimento na primeira vez).

## Configuração: `apps/web/public/envio-automatico.json`

```json
{
  "remetente": "lucas.silva@nefroclinicas.com.br",
  "destinatarios": ["lucas.silva@nefroclinicas.com.br"],
  "resumoMensal": true,
  "alertaContaInativa": true,
  "limiarOcioso": 30,
  "limiarInativo": 90,
  "janelaAlertaDias": 7
}
```

- `remetente`: caixa de onde o e-mail sai (pode ser uma caixa compartilhada, ex. `ti@...`).
- `destinatarios`: um ou mais e-mails.
- `resumoMensal` / `alertaContaInativa`: `false` desliga aquele envio (o job roda e sai sem enviar).
- `precos` (opcional): `{ "O365_BUSINESS_ESSENTIALS": 31.15 }` para mudar o valor unitário; sem ele valem os de `apps/web/src/lib/precosPadrao.ts`.

Mudou o arquivo na `main`, valeu para o próximo disparo — o site publicado também passa a mostrar o novo valor.
Para mudar os **horários**, edite os `cron` do workflow (em UTC; Brasília = UTC-3).

## O que precisa ser feito uma vez no Entra ID

O app registration é o mesmo do site (o `VITE_MSAL_CLIENT_ID` cadastrado nas Variables do
repositório). Hoje ele só tem permissões **delegadas** (valem com alguém logado). O job roda
sozinho, então precisa de permissões **de aplicativo** e de uma credencial.

### 1. Permissões de aplicativo

Portal do Azure → Microsoft Entra ID → Registros de aplicativo → o app do console →
**Permissões de API** → Adicionar uma permissão → Microsoft Graph → **Permissões de aplicativo**:

| Permissão | Para quê |
| --- | --- |
| `User.Read.All` | listar contas, licenças atribuídas e unidade |
| `AuditLog.Read.All` | último acesso (`signInActivity`) e relatório de registro de MFA |
| `Organization.Read.All` | planos contratados (`/subscribedSkus`) |
| `Mail.Send` | enviar o e-mail pela caixa do remetente |

Depois clique em **Conceder consentimento do administrador** (precisa de Administrador global).

> `Mail.Send` de aplicativo permite enviar por qualquer caixa do tenant. Para limitar ao
> remetente do JSON, crie uma política no Exchange Online (PowerShell):
> `New-ApplicationAccessPolicy -AppId <client id> -PolicyScopeGroupId lucas.silva@nefroclinicas.com.br -AccessRight RestrictAccess -Description "NefroControl envio automatico"`.
> É opcional, mas recomendado.

### 2. Credencial — opção A (recomendada): federação com o GitHub Actions, sem segredo guardado

No mesmo app: **Certificados e segredos** → aba **Credenciais federadas** → Adicionar credencial →
cenário **GitHub Actions implantando recursos do Azure**:

| Campo | Valor |
| --- | --- |
| Organização | `LCRESENDE00` |
| Repositório | `nefro-m365-console` |
| Tipo de entidade | **Branch** |
| Branch | `main` |
| Nome | `github-actions-main` (qualquer nome) |

Isso gera emissor `https://token.actions.githubusercontent.com`, assunto
`repo:LCRESENDE00/nefro-m365-console:ref:refs/heads/main` e público `api://AzureADTokenExchange`.
Os disparos agendados e os feitos à mão na `main` passam a autenticar sem nenhum segredo no GitHub.

### 2. Credencial — opção B: segredo de cliente

**Certificados e segredos** → Novo segredo do cliente → copie o valor na hora → no GitHub,
Settings → Secrets and variables → Actions → **Secrets** → `AZURE_CLIENT_SECRET`.
O script usa o segredo quando ele existe; senão, tenta a federação. Lembre da validade do segredo (máx. 24 meses).

### 3. Testar

GitHub → **Actions** → "Envio automático de relatórios" → **Run workflow**:

1. primeiro com **apenas_gerar** marcado: o job lê a Graph e anexa o HTML e os CSVs ao resultado
   (artifact `email-gerado`), sem enviar — serve para conferir permissões e conteúdo;
2. depois sem marcar: o e-mail chega em `destinatarios`.

Erros mais comuns aparecem no log do job:

| Mensagem | Causa provável |
| --- | --- |
| `o Entra ID recusou a credencial (401 invalid_client)` | credencial federada com repositório/branch diferente, ou segredo errado/expirado |
| `Microsoft Graph respondeu 403 em /users` | permissão de aplicativo faltando ou sem consentimento do administrador |
| `a Graph recusou o envio (404)` | `remetente` não existe como caixa no Exchange Online |
| `a Graph recusou o envio (403)` | falta `Mail.Send` de aplicativo, ou a ApplicationAccessPolicy bloqueou a caixa |

## Rodar localmente

```bash
AZURE_TENANT_ID=... AZURE_CLIENT_ID=... AZURE_CLIENT_SECRET=... \
ENVIO_APENAS_GERAR=1 npx tsx apps/web/scripts/envio-automatico.ts resumo-mensal
# gera ./email-gerado/email.html e os CSVs, sem enviar
```
