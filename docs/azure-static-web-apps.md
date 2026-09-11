# Publicar o NefroControl no Azure Static Web Apps

O site que hoje fica em <https://lcresende00.github.io/nefro-m365-console/> é um build
estático da pasta `apps/web`: roda inteiro no navegador e fala direto com o Microsoft Graph
(MSAL). Por isso ele pode ser servido de qualquer lugar — aqui, do Azure Static Web Apps
(plano **Free**), com endereço próprio (`https://<nome>.azurestaticapps.net`) ou um domínio da
Nefroclínicas.

O workflow [`.github/workflows/azure-static-web-apps.yml`](../.github/workflows/azure-static-web-apps.yml)
faz o build (`VITE_SEM_BACKEND=true`, base `/`) e envia a pasta `apps/web/dist` para o Azure a
cada push na `main`. Enquanto o token do Azure não estiver cadastrado no GitHub, o job de
publicação é pulado e nada muda — o GitHub Pages continua funcionando em paralelo.

## 1. Criar o recurso no Azure

1. Em <https://portal.azure.com>, **Criar um recurso** > procure **Static Web App** > Criar.
2. Assinatura e grupo de recursos: os da Nefroclínicas (ou crie um `rg-nefrocontrol`).
3. Nome: `nefrocontrol` (vira parte do endereço `*.azurestaticapps.net`).
4. Tipo de plano: **Gratuito**.
5. Região: a mais próxima disponível (ex.: East US 2). O conteúdo estático é distribuído
   globalmente; a região só importa para funções de API, que este projeto não usa.
6. **Origem da implantação: "Outro"** — não escolha "GitHub". Se escolher GitHub, o Azure
   cria um workflow próprio que tenta buildar `apps/web` sozinho e falha, porque o front
   depende do pacote `@nefro/dominio` do monorepo. O workflow deste repositório já faz o
   build certo.
7. Revisar + criar.

## 2. Cadastrar o token no GitHub

1. No recurso criado, em **Visão geral**, clique em **Gerenciar token de implantação** e copie o
   valor.
2. No GitHub: **Settings > Secrets and variables > Actions > Secrets > New repository secret**
   - Nome: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Valor: o token copiado.
3. As variáveis `VITE_MSAL_CLIENT_ID` e `VITE_MSAL_TENANT_ID` (aba **Variables**) já são as
   mesmas do Pages; nada a fazer.

## 3. Publicar

**Actions > "Publicar no Azure Static Web Apps" > Run workflow**, ou simplesmente faça o
próximo merge na `main`. Ao terminar, o endereço aparece em Visão geral do recurso
(`https://<nome>.<sufixo>.azurestaticapps.net`).

## 4. Liberar o login Microsoft no novo endereço

O login usa `https://<endereço do site>/login` como URI de redirecionamento. Sem cadastrá-la
no Entra, o botão "Entrar com Microsoft" devolve `AADSTS50011`.

1. <https://portal.azure.com> > **Microsoft Entra ID > Registros de aplicativo** > o app do
   NefroControl (o mesmo `VITE_MSAL_CLIENT_ID`).
2. **Autenticação** > plataforma **Aplicativo de página única (SPA)** > **Adicionar URI**:
   `https://<nome>.<sufixo>.azurestaticapps.net/login`
3. Salvar. A URI do GitHub Pages pode continuar cadastrada; os dois endereços funcionam ao
   mesmo tempo.

## 5. (Opcional) Domínio da Nefroclínicas

1. No recurso Static Web App: **Domínios personalizados > Adicionar > Domínio personalizado em
   outro DNS** e informe, por exemplo, `nefrocontrol.nefroclinicas.com.br`.
2. No DNS do domínio, crie o registro **CNAME** `nefrocontrol` apontando para o endereço
   `*.azurestaticapps.net` mostrado na tela. O certificado HTTPS é emitido e renovado pelo Azure.
3. Repita o passo 4 com `https://nefrocontrol.nefroclinicas.com.br/login`.

## O que fica igual, o que muda

- **Dados**: como no Pages, não há servidor nem banco. Preferências e marcações ficam no
  `localStorage` do navegador; usuários, licenças e economia vêm do Graph após o login.
- **Rotas**: `apps/web/public/staticwebapp.config.json` manda toda rota desconhecida para
  `index.html`, então links diretos como `/usuarios` ou `/economia` abrem no lugar certo (no
  Pages isso é feito com o `404.html`).
- **Envio automático de relatórios**: continua no GitHub Actions
  (`envio-automatico.yml`), independente de onde o site está hospedado.
- **Custo**: plano Free — 100 GB de banda/mês, 2 domínios personalizados, SSL incluso.
