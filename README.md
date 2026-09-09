# Console M365 — Nefroclínicas

Painel de **licenças Microsoft 365** para TI interna: mostra quem não acessa há meses, qual
licença está sendo paga sem uso e **quanto isso custa por mês**.

**⬇ Baixar para Windows:** [versão portátil](https://github.com/LCRESENDE00/nefro-m365-console/releases/latest) (baixa e abre, sem instalar) ou [instalador](https://github.com/LCRESENDE00/nefro-m365-console/releases/latest)
**▶ Demo no navegador: https://lcresende00.github.io/nefro-m365-console/**

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
| **Usuários** | Tabela com busca, filtro por setor e status, ordenação; painel lateral por conta com sugestão de economia |
| **Licenças** | Assentos contratados × atribuídos × em uso, por plano, com o custo desperdiçado de cada um |
| **Armazenamento** | Ocupação do OneDrive por conta e por setor, GB presos em contas inativas |
| **Relatórios** | Geração de CSV a partir do banco, preferências de envio automático e histórico de exportações |
| **Configurações** | Conexão, permissões de leitura, limiares de conta ociosa/inativa, contas marcadas para revisão |

---

## Aplicativo de desktop (Windows)

Duas formas de usar, ambas na [página de releases](https://github.com/LCRESENDE00/nefro-m365-console/releases/latest):

| Arquivo | O que faz |
| --- | --- |
| `ConsoleM365-<versão>-portatil.exe` | Baixa, dá dois cliques e abre. Não instala nada. |
| `ConsoleM365-<versão>-instalador.exe` | Instala com atalho no menu Iniciar e na área de trabalho. |

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

Requisitos: **Node 22+** e npm 10+.

```bash
git clone https://github.com/LCRESENDE00/nefro-m365-console.git
cd nefro-m365-console

cp apps/api/.env.example apps/api/.env   # no Windows: copy apps\api\.env.example apps\api\.env

npm run setup    # instala, cria o banco SQLite e popula com o tenant de demonstração
npm run dev      # API em :3333 e front em :5173
```

Abra <http://localhost:5173> e entre por **"Entrar em modo demo"**.

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
| `npm run build:pages` | Build da demo estática (o mesmo que o GitHub Actions publica) |

---

## Publicação

O push na `main` dispara [`.github/workflows/pages.yml`](.github/workflows/pages.yml), que publica a
demo em <https://lcresende00.github.io/nefro-m365-console/>.

Essa versão roda **inteira no navegador**: o build usa `VITE_SEM_BACKEND=true`, o que troca a
implementação HTTP dos repositórios pela de `src/data/estatico/`, que lê o mesmo seed e chama as
mesmas funções de cálculo. Os números são idênticos aos da versão com API.

O que muda na demo:

- não há servidor nem banco — o que você altera (preferências, marcações, histórico de exportações)
  fica no `localStorage` do seu navegador e não é compartilhado com ninguém;
- os relatórios continuam gerando CSV de verdade, montado no próprio navegador;
- o login não autentica nada: qualquer valor nos campos entra.

Para rodar a versão completa, com API e banco, siga [Como rodar](#como-rodar) acima.

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
      │  └─ estatico/          lê o seed no navegador (demo do Pages)
      ├─ components/           gráficos SVG, drawer, toast, switches
      ├─ layout/               sidebar, topbar, casca da aplicação
      └─ features/             uma pasta por tela
```

Três decisões que sustentam o resto:

**1. Toda leitura passa por interfaces em `apps/web/src/data/`.** Nenhuma tela chama `fetch` nem
conhece a URL da API — elas dependem de `ContaRepository`, `LicencaRepository`, `RelatorioRepository`
e afins. É isso que permite a mesma interface rodar contra a API em desenvolvimento e **sem backend
nenhum** na demo do GitHub Pages: a escolha acontece em `data/index.ts` e nenhum componente muda.

**2. A classificação da conta vive só em `@nefro/dominio`.** O front recebe o status pronto
(`ativo` / `ocioso` / `inativo` / `nunca`), então mudar um limiar não exige tocar em tela nenhuma.
Os limiares são editáveis na interface: o seletor `30d/60d/90d` no topo e as preferências em
Configurações alteram de fato os números de todas as telas.

**3. Os cálculos são funções puras no pacote compartilhado.** A API chama `calcularVisaoGeral()`
com o que veio do banco; a demo estática chama a mesma função com o que veio do seed. Não existem
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
- [ ] Disparo efetivo do resumo mensal por e-mail (as preferências já são persistidas)
- [ ] Filtro por plano vindo da tela de Licenças
- [ ] Exportação em `.xlsx` além do CSV

## Licença

MIT — veja [LICENSE](LICENSE).
