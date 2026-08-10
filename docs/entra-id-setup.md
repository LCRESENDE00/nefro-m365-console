# Configuracao do Microsoft Entra ID / Microsoft Graph

Este guia explica os tokens/credenciais usados nas variaveis de ambiente de
`apps/api/.env.example` para a futura integracao com Entra ID (MSAL) e
Microsoft Graph (ver Roadmap no README). Nenhum valor real deve ser
commitado - preencha apenas o seu `.env` local (que fica fora do git).

## Onde criar o app registration

Acesse o Portal do Azure (portal.azure.com) e va em "Microsoft Entra ID" >
"Registros de aplicativo" > "Novo registro". De um nome ao app (ex:
"Console M365 - Nefroclinicas") e registre.

## Variaveis e onde encontrar cada uma

### AZURE_TENANT_ID
ID do tenant (locatario) do Azure AD.
Encontrado em: Microsoft Entra ID > Visao geral > "ID do locatario".

### AZURE_CLIENT_ID
ID do aplicativo (client) criado no passo anterior.
Encontrado em: Registros de aplicativo > [seu app] > Visao geral >
"ID do aplicativo (cliente)".

### AZURE_CLIENT_SECRET
Segredo do cliente usado pela API para autenticar no Entra ID.
Gerado em: Registros de aplicativo > [seu app] > Certificados e segredos >
"Novo segredo do cliente". O valor so e exibido no momento da criacao,
copie e guarde em local seguro (nunca no git).

### AZURE_REDIRECT_URI
URI de redirecionamento do fluxo de login (MSAL).
Configurada em: Registros de aplicativo > [seu app] > Autenticacao >
"Adicionar uma URI".

### GRAPH_SCOPES
Permissoes de aplicativo do Microsoft Graph necessarias para a
sincronizacao (contas ociosas, licencas, relatorios de uso).
Configuradas em: Registros de aplicativo > [seu app] > Permissoes de API >
"Adicionar uma permissao" > Microsoft Graph > Permissoes de aplicativo >
`User.Read.All` e `Reports.Read.All`. Depois de adicionar, um administrador
do tenant precisa clicar em "Conceder consentimento do administrador".

## Resumo

| Variavel | Onde achar |
| --- | --- |
| AZURE_TENANT_ID | Entra ID > Visao geral |
| AZURE_CLIENT_ID | Registros de aplicativo > Visao geral |
| AZURE_CLIENT_SECRET | Registros de aplicativo > Certificados e segredos |
| AZURE_REDIRECT_URI | Registros de aplicativo > Autenticacao |
| GRAPH_SCOPES | Registros de aplicativo > Permissoes de API |
