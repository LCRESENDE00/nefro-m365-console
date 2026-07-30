# Console M365 — Nefroclínicas

Painel de **licenças Microsoft 365** para TI interna: mostra quem não acessa há meses, qual
licença está sendo paga sem uso e **quanto isso custa por mês**.

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
| `npm run build` | Typecheck + build da API e do front |

---

## Arquitetura

```
apps/
├─ api/                        Express + Prisma
│  ├─ prisma/schema.prisma     Sku · Usuario · AcessoSemanal · Exportacao · Configuracao
│  ├─ prisma/seed.ts           38 contas e 4 planos fictícios
│  └─ src/
│     ├─ dominio.ts            regras de negócio (status da conta, custo ocioso, CSV)
│     ├─ consultas.ts          fonte única das contas já com status calculado
│     └─ rotas/                usuarios · licencas · metricas · armazenamento · relatorios · configuracoes
└─ web/                        Vite + React + TypeScript + CSS Modules
   └─ src/
      ├─ data/                 interfaces dos repositórios + implementação HTTP
      ├─ components/           gráficos SVG, drawer, toast, switches
      ├─ layout/               sidebar, topbar, casca da aplicação
      └─ features/             uma pasta por tela
```

Duas decisões que sustentam o resto:

**1. Toda leitura passa por interfaces em `apps/web/src/data/`.** Nenhuma tela chama `fetch` nem
conhece a URL da API — elas dependem de `ContaRepository`, `LicencaRepository`, `RelatorioRepository`
e afins. Trocar a implementação HTTP por uma que fale direto com o Microsoft Graph, ou por um mock
de teste, é mexer só em `data/index.ts`.

**2. A classificação da conta vive só na API** (`apps/api/src/dominio.ts`). O front recebe o status
pronto (`ativo` / `ocioso` / `inativo` / `nunca`), então mudar um limiar não exige tocar em tela
nenhuma. Os limiares ficam gravados no banco e são editáveis na interface: o seletor `30d/60d/90d`
no topo e as preferências em Configurações alteram de fato os números de todas as telas.

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

- [ ] Autenticação real via Entra ID (MSAL) no lugar da sessão simulada
- [ ] Sincronização com o Microsoft Graph (`User.Read.All`, `Reports.Read.All`) alimentando as mesmas tabelas
- [ ] Disparo efetivo do resumo mensal por e-mail (as preferências já são persistidas)
- [ ] Filtro por plano vindo da tela de Licenças
- [ ] Exportação em `.xlsx` além do CSV

## Licença

MIT — veja [LICENSE](LICENSE).
