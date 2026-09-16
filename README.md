# NefroControl — Nefroclínicas

Painel de **licenças Microsoft 365** para TI interna: mostra quem não acessa há meses, qual
licença está sendo paga sem uso e **quanto isso custa por mês**.

**⬇ Baixar para Windows:** [versão portátil](https://github.com/LCRESENDE00/nefro-m365-console/releases/latest) (baixa e abre, sem instalar) ou [instalador](https://github.com/LCRESENDE00/nefro-m365-console/releases/latest)
**🔒 Uso interno e só local:** repositório privado, nada publicado na internet — o console roda na máquina de quem usa, em `localhost` (ver [Só local](#só-local)).

Nasceu de um protótipo em HTML de arquivo único. Aqui ele virou aplicação de verdade:
React + TypeScript no front, API Express com Prisma e banco SQLite atrás.

> ⚠️ **Dados fictícios.** Nomes, cargos, IDs de tenant e o domínio `nefroclinicas.exemplo` do
> seed são inventados. O projeto ainda **não** se conecta ao Microsoft Graph — a integração é o
> próximo passo (ver [Roadmap](#roadmap)).

---

## Telas

| Tela | O que responde |
| --- | --- |
| **Visão geral** | Quanto se paga por mês em licença parada, distribuição por plano, série de acessos semanais, contas que precisam de revisão |
| **Usuários** | Tabela com busca, filtro por setor e status, ordenação; painel lateral por conta com sugestão de economia; assinatura de e-mail no padrão Nefroclínicas por conta (copiar, baixar .htm ou enviar com o passo a passo) — a mesma que o assistente de nova conta entrega ao final |
| **Licenças** | Assentos contratados × atribuídos × em uso, por plano, com o custo desperdiçado de cada um |
| **Relatórios** | Geração de CSV a partir do banco, preferências de envio automático e histórico de exportações |
| **Configurações** | Conexão, permissões de leitura, limiares de conta ociosa/inativa, contas marcadas para revisão |

---

## Aplicativo de desktop (Windows)

Duas formas de usar, ambas na [página de releases](https://github.com/LCRESENDE00/nefro-m365-console/releases/latest):

| Arquivo | O que faz |
| --- | --- |
| `NefroControl-<versão>-portatil.exe` | Baixa, dá dois cliques e abre. Não instala nada. |
| `NefroControl-<versão>-instalador.exe` | Instala com atalho no menu Iniciar e na área de trabalho. |

Não precisa de Node, nem de banco, nem de configuração: o app carrega a API e o SQLite por dentro
e **cria o banco já populado na primeira execução**, em `%APPDATA%\Console M365\dados.db`. Para
recomeçar do zero, feche o app e apague essa pasta.

O executável não é assinado digitalmente — o Windows SmartScreen vai mostrar um aviso na primeira
vez. É só **Mais informações → Executar assim mesmo**. Assinar exigiria um certificado pago.

Para gerar os executáveis a partir do código:

```bash
npm run desktop        # abre o app em modo de desenvolvimento
npm run desktop:dist   # gera os .exe em dist-desktop/
```

---

## Como rodar

Requisitos: **Node 22+** e npm 10+. Tudo roda só na sua máquina: nada é publicado e os servidores
escutam apenas em `localhost`.

```bash
git clone https://github.com/LCRESENDE00/nefro-m365-console.git   # repositório privado: precisa estar logado
cd nefro-m365-console

cp apps/web/.env.example apps/web/.env   # no Windows: copy apps\web\.env.example apps\web\.env
                                         # e preencha VITE_MSAL_CLIENT_ID e VITE_MSAL_TENANT_ID

npm install
npm run local    # compila e abre o console em http://localhost:5173
```

Abra <http://localhost:5173> e entre com a conta Microsoft de administrador do tenant. É a mesma versão
que antes ficava no GitHub Pages, agora só no seu computador: sem API nem banco, com os dados lidos da
Microsoft Graph direto no navegador e as preferências no `localStorage`.

### Com a API e o banco (desenvolvimento)

```bash
cp apps/api/.env.example apps/api/.env   # no Windows: copy apps\api\.env.example apps\api\.env

npm run setup    # instala, cria o banco SQLite e popula com o tenant de demonstração
npm run dev      # API em 127.0.0.1:3333 e front em localhost:5173
```

Na primeira instalação o npm pode pedir aprovação dos scripts do Prisma e do esbuild
(`npm approve-scripts --allow-scripts-pending`); as aprovações já vêm registradas em
`package.json`.

### Outros comandos

| Comando | O que faz |
| --- | --- |
| `npm run db:push` | Aplica o schema do Prisma no SQLite |
| `npm run db:seed` | Recria os dados de demonstração (apaga o que estiver lá) |
| `npm run db:studio` | Abre o Prisma Studio para inspecionar as tabelas |
| `npm run build` | Typecheck + build do pacote compartilhado, da API e do front |
| `npm run local` | Build sem API e servidor local em `localhost:5173` |
| `npm run build:local` | Só o build sem API (em `apps/web/dist`), sem abrir o servidor |

---

## Só local

O NefroControl não é publicado em lugar nenhum: o repositório é privado, não existe mais workflow de
GitHub Pages nem de Azure Static Web Apps, e cada pessoa roda o console na própria máquina.

- `npm run local` e `npm run dev` servem o front só em `localhost:5173`. A porta é fixa: se estiver
  ocupada, o comando para em vez de trocar de porta, porque o login da Microsoft volta exatamente para
  `http://localhost:5173/login`.
- A API (no `npm run dev` e dentro do app de desktop) escuta só em `127.0.0.1` — outras máquinas da
  rede não alcançam.
- No `npm run local` o build usa `VITE_SEM_BACKEND=true` (arquivo `apps/web/.env.estatico`), que troca
  a implementação HTTP dos repositórios pela de `src/data/estatico/`: mesmo seed, mesmas funções de
  cálculo, números idênticos aos da versão com API. O que você altera (preferências, marcações,
  histórico de exportações) fica no `localStorage` do navegador.

No app registration do Entra ID, a URI de redirecionamento SPA é `http://localhost:5173/login`; as de
quando o console era publicado (`https://lcresende00.github.io/nefro-m365-console/login`) podem ser
removidas — ver [docs/entra-id-setup.md](docs/entra-id-setup.md).

A única peça que ainda roda fora da sua máquina é o **envio automático de relatórios** por e-mail,
agendado no GitHub Actions ([docs/envio-automatico.md](docs/envio-automatico.md)). Para parar, desabilite
o workflow "Envio automático de relatórios" na aba Actions ou ponha `resumoMensal` e
`alertaContaInativa` como `false` em `apps/web/public/envio-automatico.json`.

---

## Arquitetura

```
packages/
└─ dominio/                    compartilhado entre API e front
   └─ src/
      ├─ dados.ts              o tenant fictício (38 contas, 4 planos)
      ├─ dominio.ts            status da conta, custo ocioso, geração de CSV
      ├─ calculos.ts           agregações das telas, como funções puras
      └─ relatorios.ts         definição das planilhas exportáveis
apps/
├─ api/                        Express + Prisma
│  ├─ prisma/schema.prisma     Sku · Usuario · AcessoSemanal · Exportacao · Configuracao
│  ├─ prisma/seed.ts           grava o tenant de `@nefro/dominio` no banco
│  └─ src/
│     ├─ consultas.ts          fonte única das contas já com status calculado
│     └─ rotas/                usuarios · licencas · metricas · armazenamento · relatorios · configuracoes
└─ web/                        Vite + React + TypeScript + CSS Modules
   └─ src/
      ├─ data/                 interfaces dos repositórios + duas implementações
      │  ├─ http/              fala com a API Express
      │  └─ estatico/          lê o seed no navegador (modo local sem API)
      ├─ components/           gráficos SVG, drawer, toast, switches
      ├─ layout/               sidebar, topbar, casca da aplicação
      └─ features/             uma pasta por tela
```

Três decisões que sustentam o resto:

**1. Toda leitura passa por interfaces em `apps/web/src/data/`.** Nenhuma tela chama `fetch` nem
conhece a URL da API — elas dependem de `ContaRepository`, `LicencaRepository`, `RelatorioRepository`
e afins. É isso que permite a mesma interface rodar contra a API em desenvolvimento e **sem backend
nenhum** no `npm run local`: a escolha acontece em `data/index.ts` e nenhum componente muda.

**2. A classificação da conta vive só em `@nefro/dominio`.** O front recebe o status pronto
(`ativo` / `ocioso` / `inativo` / `nunca`), então mudar um limiar não exige tocar em tela nenhuma.
Os limiares são editáveis na interface: o seletor `30d/60d/90d` no topo e as preferências em
Configurações alteram de fato os números de todas as telas.

**3. Os cálculos são funções puras no pacote compartilhado.** A API chama `calcularVisaoGeral()`
com o que veio do banco; o modo local sem API chama a mesma função com o que veio do seed. Não existem
duas implementações para divergirem — a equivalência foi verificada comparando as respostas dos dois
caminhos campo a campo.

### Endpoints

| Método | Rota | Devolve |
| --- | --- | --- |
| `GET` | `/api/metricas/visao-geral` | KPIs, custo ocioso por plano, séries e contas a revisar |
| `GET` | `/api/usuarios` | Contas filtradas (`q`, `depto`, `status`, `sort`, `dir`) + agregados |
| `GET` | `/api/usuarios/:upn` | Detalhe da conta com a série de acessos |
| `POST` | `/api/usuarios/:upn/revisao` | Marca/desmarca a conta para revisão |
| `GET` | `/api/licencas` | Assentos por plano e economia possível |
| `GET` | `/api/armazenamento` | OneDrive por conta e por setor |
| `GET` | `/api/relatorios` | Catálogo, histórico e preferências de envio |
| `POST` | `/api/relatorios/:tipo` | Gera o CSV, registra no histórico e devolve o arquivo |
| `POST` | `/api/relatorios/selecao/usuarios` | Exporta exatamente o filtro atual da tela de Usuários |
| `GET` `PATCH` | `/api/configuracoes` | Lê e grava preferências |

Os relatórios saem em **CSV com BOM e separador `;`**, que o Excel em pt-BR abre direto, com
acentuação correta e sem passar pelo assistente de importação.

### Banco

SQLite por padrão — o banco é um arquivo em `apps/api/prisma/dev.db`, sem nada para instalar.
Para migrar a PostgreSQL, basta trocar o `provider` em `schema.prisma` e a `DATABASE_URL`:
nenhuma consulta do app depende do dialeto.

---

## Roadmap

- [ ] Autenticacao real via Entra ID (MSAL) no lugar da sessao simulada (ja existe uma versao experimental em `/licencas-reais`, com login MSAL.js direto no navegador - ver `docs/entra-id-setup.md`)
- [ ] Sincronização com o Microsoft Graph (`User.Read.All`, `Reports.Read.All`) alimentando as mesmas tabelas
- [x] Disparo efetivo do resumo mensal por e-mail e alerta de conta inativa, pelo GitHub Actions com token de aplicativo, e "Enviar agora" pela Graph na tela Relatórios (ver `docs/envio-automatico.md`)
- [ ] Filtro por plano vindo da tela de Licenças
- [ ] Exportação em `.xlsx` além do CSV

## Licença

MIT — veja [LICENSE](LICENSE).
