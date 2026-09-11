# Leto Pipeline

**Origination & Opportunities CRM — Leto Capital · Special Situations**

Aplicação web interna que substitui a planilha `Acompanhamento do Pipe` por um CRM de originação e pipeline: todo o histórico (903 oportunidades) é importado de forma reexecutável, normalizado sem perder o dado original, e passa a ser gerido com pipe ativo, on hold/inativo, CRM de originadores e empresas, dashboard executivo, relatórios exportáveis, auditoria e controle de qualidade de dados.

---

## Sumário

1. [Visão geral](#visão-geral)
2. [Stack](#stack)
3. [Arquitetura](#arquitetura)
4. [Como rodar](#como-rodar)
5. [Banco de dados](#banco-de-dados)
6. [Variáveis de ambiente](#variáveis-de-ambiente)
7. [Como importar a planilha](#como-importar-a-planilha)
8. [Como criar usuários](#como-criar-usuários)
9. [Como executar migrations](#como-executar-migrations)
10. [Como fazer deploy](#como-fazer-deploy)
11. [Estrutura dos dados](#estrutura-dos-dados)
12. [Decisões de normalização](#decisões-de-normalização)
13. [Problemas de qualidade encontrados na planilha](#problemas-de-qualidade-encontrados-na-planilha)
14. [Testes, lint e build](#testes-lint-e-build)
15. [Decisões técnicas](#decisões-técnicas)

---

## Visão geral

| Módulo | O que faz |
|---|---|
| **Dashboard** | KPIs (recebidas no ano/mês, pipe ativo, on hold, concluídas, declinadas, volume, ticket médio, conversão, tempo médio), evolução mensal, funil, composição por tipo/canal/aging, originação por empresa/pessoa/categoria, análise por responsável, casos por ano, conversão por tipo. Filtros globais por ano, período, tipo, status, originador, empresa, categoria, responsável e canal. Seção pessoal: *Meu pipeline*, *Precisa de atenção*, *Próximos follow-ups*. |
| **Pipe Ativo** (tela inicial) | Barra de inclusão rápida ("Novo caso" em uma linha: nome, tipo, data, empresa, originador, responsável, valor, canal, próxima ação, follow-up) e botão **+ Novo caso** com o formulário completo. Tabela com **filtro em todas as colunas** (texto, datas `2026-08`/`15/08/2026`, números `>30`, `5-20`), ordenação, filtros persistentes na URL, busca, mostrar/ocultar colunas, redimensionar, coluna do nome fixa, paginação server-side, seleção múltipla e bulk actions, views salvas. **Edição direta em toda célula**: nome, tipo, data de entrada, empresa, originador, canal, responsáveis, status, valor, próxima ação, follow-up, setor. Coluna **Status da operação / atualizações** com o histórico datado (o log da planilha + novas linhas registradas em um clique) e coluna **Motivo / feedback** (negativas). Botão **Exportar Excel (backup)** baixa um arquivo completo (oportunidades com colunas originais, histórico, empresas, contatos). |
| **On Hold / Inativo** | Abas *On Hold*, *Inativas/Declinadas*, *Concluídas* e *Legado*. Reativação com um clique (registra data, usuário, status anterior/novo e atividade na timeline). |
| **Todas as Oportunidades** | Histórico completo com os mesmos recursos de tabela. |
| **Oportunidade** | Cabeçalho (nome, tipo, status, valor, responsáveis, entrada, dias no pipe), abas *Visão Geral*, *Originação*, *Análise* (notas com autor/data), *Histórico* (timeline cronológica incluindo o log da planilha), *Arquivos* (teaser, modelo, apresentações, jurídico, proposta, NDA), *Auditoria* e *Planilha original* (célula a célula). |
| **Originadores** | CRM de pessoas: casos no ano, histórico, ativos, concluídos, avançaram, conversão, volume, última interação, próximo follow-up; filtros rápidos (*com casos*, *ativos*, *concluíram*, *follow-up*, *esfriando*); botões *Enviar e-mail* (`mailto:`) e *WhatsApp* (`wa.me`). Página do originador com todas as oportunidades e histórico de interações. |
| **Empresas** | Mesmo CRM para empresas originadoras, com contatos vinculados. |
| **Relatórios** | Perguntas prontas (casos por mês/ano, precatórios, NPL, crédito estruturado, empresas, originadores, responsáveis, e-mail, conversão…) + qualquer combinação de filtros; agrupamento por 11 dimensões; exportação CSV, Excel, copiar tabela; gráficos com **Presentation Mode** (fundo limpo, logo Leto, título, período, números grandes, proporção 16:9) e exportação PNG/SVG. |
| **Administração** | Usuários (Admin/User), de/para de tipos de operação (reclassifica em massa), Data Quality (problemas por código, resolução manual), Importações (batches e linhas brutas), Auditoria. |
| **Busca global** | `⌘K` — oportunidades, empresas, originadores, responsáveis, descrições, comentários e número da planilha. |

## Stack

- **Next.js 15 (App Router) + React 19 + TypeScript**
- **Tailwind CSS 3.4** + componentes no padrão shadcn/ui (Radix UI) escritos no projeto
- **PostgreSQL 14+** com **Prisma 6** (schema, migrations, client)
- **Auth.js v5 (next-auth)** com credenciais (e-mail + senha, bcrypt) e JWT
- **Recharts** para gráficos, **html-to-image** para PNG/SVG
- **SheetJS (xlsx)** para leitura da planilha e exportação Excel/CSV
- **TanStack Table** para as tabelas
- **Vitest** para testes (unitários + integração com PostgreSQL real)

## Arquitetura

```
src/
├─ app/                     # App Router
│  ├─ login/                # tela de login (logo Leto)
│  ├─ (app)/                # área autenticada (sidebar recolhível + topbar)
│  │  ├─ dashboard/  pipeline/  on-hold/  opportunities/[id]/
│  │  ├─ originators/[id]/  companies/[id]/  reports/
│  │  └─ admin/{users,operation-types,data-quality,imports,audit}/
│  └─ api/{auth,search,lookup,export,health}/
├─ components/
│  ├─ ui/                   # button, dialog, select, table, tabs… (shadcn-style)
│  ├─ layout/               # app-shell, sidebar, topbar, busca global, user menu
│  ├─ data-table/           # tabela genérica (sort, colunas, resize, seleção, export, cards mobile)
│  ├─ opportunities/        # tabela do pipe, quick-edit, filtros + views, formulário, detalhe/*
│  ├─ originators/          # CRM (tabela, resumo, detalhes, formulários)
│  ├─ dashboard/ charts/ reports/ admin/ common/
├─ lib/
│  ├─ normalization/        # status, operation-types, assignees, originators, legacy-timeline, values
│  ├─ import/               # workbook.ts (leitura), importer.ts (idempotente), report.ts (relatório)
│  ├─ queries/              # filters, opportunities, dashboard, originators, reports, search
│  ├─ actions/              # server actions (opportunities, activities, originators, saved-views, admin)
│  ├─ auth/session helpers, audit.ts, db.ts, utils.ts, constants.ts
├─ auth.ts  middleware.ts
prisma/schema.prisma  prisma/migrations/  prisma/seed.ts
scripts/import-pipeline.ts  scripts/create-user.ts  scripts/dev-reset-db.sh
tests/unit/*  tests/integration/*
data/Acompanhamento do Pipe_20260817.xlsx   # planilha de origem
reports/migration-report.md                  # relatório de migração gerado
public/brand/*.svg                           # logos
```

Fluxo de dados: **páginas (server components)** leem via `lib/queries` (filtros sempre server-side, paginação, índices) → **componentes client** disparam **server actions** (`lib/actions`) validadas com Zod → toda alteração relevante grava `AuditLog` e, quando aplicável, `Activity` na timeline.

## Como rodar

Pré-requisitos: Node 20+, PostgreSQL 14+ (local, Docker, Supabase ou Neon).

```bash
git clone <repo> && cd leto-pipeline-crm
npm install
cp .env.example .env            # ajuste DATABASE_URL, AUTH_SECRET, SEED_DEFAULT_PASSWORD
npm run db:migrate              # aplica as migrations (prisma migrate deploy)
npm run db:seed                 # statuses, tipos de operação e os 4 usuários da equipe
npm run import:pipeline         # importa a planilha (idempotente)
npm run dev                     # http://localhost:3000
```

Login inicial: e-mails `apenido@`, `viglesias@`, `csoares@`, `loswald@letocapital.com.br` com a senha definida em `SEED_DEFAULT_PASSWORD` (troque no primeiro acesso pelo menu do usuário → *Alterar senha*). Antônio Penido é criado como **Admin**; os demais como **User** (ajustável em Administração → Usuários).

Banco local rápido com Docker:

```bash
docker run --name leto-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
createdb -h localhost -U postgres leto_pipeline
```

## Banco de dados

PostgreSQL + Prisma. Entidades principais (ver `prisma/schema.prisma`):

| Entidade | Papel |
|---|---|
| `User` | usuários (Admin/User); membros antigos da planilha viram *Archived User* (sem login, preservam histórico) |
| `Opportunity` | oportunidade, com campos normalizados **e** campos `*Raw` (nome, tipo, status, datas, valor, responsável, contato) |
| `OperationType` / `OperationTypeMapping` | tipos normalizados e o de/para de cada grafia da planilha |
| `OpportunityStatus` | status estruturado com `group` (ACTIVE/ON_HOLD/CONCLUDED/CLOSED/LEGACY) e `outcome` (OPEN/WON/LOST/ON_HOLD/INACTIVE/UNKNOWN) |
| `OpportunityAssignee` | responsáveis (many-to-many) |
| `Company`, `CompanyAlias`, `Contact` | empresa originadora, apelidos (A&M, Alvarez& Marsal…) e pessoas |
| `OpportunityOriginator` | vínculo oportunidade → empresa/contato com `rawText`, `confidence`, `migrationNotes`, `needsReview` |
| `Activity`, `Note`, `FollowUp`, `Attachment` | timeline, notas de análise, follow-ups, documentos |
| `ContactInteraction` | interações de CRM fora de uma oportunidade |
| `SavedView` | filtros salvos por página (pessoais ou compartilhados) |
| `AuditLog` | usuário, data, campo, valor anterior, valor novo |
| `ImportBatch`, `ImportRow` | **raw_import_data**: cada linha da planilha com os valores originais em JSON |
| `DataQualityIssue` | problemas detectados (código, severidade, entidade, resolução) |

Índices em data de entrada, ano, status, tipo, empresa, contato, responsável, canal, categoria do originador, follow-up e atualização.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | conexão PostgreSQL (Supabase: use a *connection string* com `?pgbouncer=true` no runtime e a direta para migrations, se preferir) |
| `AUTH_SECRET` | segredo do Auth.js (`openssl rand -base64 32`) |
| `AUTH_URL` | URL pública da aplicação |
| `AUTH_TRUST_HOST` | `true` atrás de proxies/Vercel |
| `APP_PASSWORD` | **senha única de acesso** da equipe (modo recomendado para começar): a tela de login pede só essa senha; opcionalmente a pessoa marca seu nome para atribuição das ações (senão fica como "Equipe Leto") |
| `SEED_DEFAULT_PASSWORD` | senha inicial por usuário (modo alternativo, e-mail + senha individual) |
| `PIPELINE_WORKBOOK` | caminho da planilha usado por `npm run import:pipeline` |

Nenhuma senha é armazenada em código. `.env` está no `.gitignore`; use `.env.example` como modelo.

## Como importar a planilha

```bash
npm run import:pipeline                        # usa PIPELINE_WORKBOOK
npm run import:pipeline -- ./caminho/arquivo.xlsx
```

O que a importação faz:

1. Lê a aba **`Pipe`** (fonte principal, header na linha 8, colunas C–P) — cada linha vira uma `Opportunity` identificada pelo `#` (legacyId) e uma `ImportRow` (arquivo + aba + linha, com todos os valores originais).
2. Lê **`Originadores`** para o cadastro-mestre de empresas/contatos e categorias.
3. Reconcilia **`Analise Originação 2025`**, **`Originação`** e **`Output`** por nome + data com a aba Pipe. Essas abas **nunca criam oportunidades**: só enriquecem (categoria do originador, responsáveis da aba Output, histórico de status). Linhas sem correspondência ficam em `ImportRow` com status `unmatched` e listadas no relatório para revisão manual.
4. Lê as abas de **reunião vertical** (`Vertical_*`, `Reuni(ã|a)o Vertical_*`) e cria snapshots na timeline (status na data da reunião) + setor.
5. Gera problemas de **Data Quality** e o relatório `reports/migration-report.md` (+ `.json`).

**Idempotência**: rodar duas vezes não cria registros novos. Linhas cuja célula não mudou são puladas (hash do raw); linhas alteradas atualizam a oportunidade e registram auditoria com ação `import`. Mapeamentos de tipo corrigidos manualmente (`source = manual`) são preservados em reimportações.

Testes de sanidade (executados na suíte): 903 linhas; 245/372/267 por ano (2024/2025/2026) + 19 sem ano válido; 736 `Não`, 100 `On Hold`, 38 `Em análise`, 27 `Concluído`, 2 sem decisão. Os totais das células de resumo da planilha **não** são usados: todos os indicadores são calculados do banco.

## Como criar usuários

- **Seed** (`npm run db:seed`): cria Antônio Penido (Admin), Vitória Iglesias, Christopher Soares e Luiza Oswald com a senha de `SEED_DEFAULT_PASSWORD`, além dos usuários arquivados (Hugo, Bernardo, Mollica, Mauad).
- **CLI**: `npm run users:create -- --email nome@letocapital.com.br --name "Nome" --password "senha" [--role ADMIN|USER]` (cria ou atualiza, inclusive para redefinir senha).
- **Interface**: Administração → Usuários (somente Admin).

## Como executar migrations

```bash
npm run db:migrate        # produção/CI: prisma migrate deploy
npm run db:migrate:dev    # desenvolvimento: cria uma nova migration a partir do schema
npm run db:generate       # regenera o Prisma Client
scripts/dev-reset-db.sh   # DEV: dropa/recria o banco local, aplica migrations, seed e importa
```

## Como fazer deploy

O app precisa de um servidor Node e de um PostgreSQL. Três caminhos prontos no repositório:

**1. Render (mais rápido — banco + app em um clique).** O arquivo `render.yaml` é um *Blueprint* que provisiona o PostgreSQL 16 e o serviço web (Docker) juntos.
1. No Render: *New → Blueprint*, conecte este repositório e a branch.
2. Preencha `SEED_DEFAULT_PASSWORD` quando o Render pedir (única variável manual; `AUTH_SECRET` é gerado, `DATABASE_URL` e `AUTH_URL` são ligados automaticamente).
3. No primeiro boot o container aplica migrations, cria os usuários e importa a planilha `data/*.xlsx` (idempotente). Depois, acesse a URL `https://leto-pipeline.onrender.com` (ou a que o Render atribuir) e faça login.

**2. Railway.** *New Project → Deploy from GitHub repo* (o Dockerfile é detectado). Depois: (a) *+ New → Database → PostgreSQL* no mesmo projeto; (b) no serviço da app, *Variables*: `DATABASE_URL = ${{Postgres.DATABASE_URL}}`, `AUTH_SECRET` (`openssl rand -base64 32`), `SEED_DEFAULT_PASSWORD`; `AUTH_URL` é preenchida sozinha a partir de `RAILWAY_PUBLIC_DOMAIN` (não a defina como `http://localhost:3000` — um valor local é ignorado pelo container); (c) *Settings → Networking → Generate Domain* para obter a URL pública. O primeiro boot aplica migrations, cria usuários e importa a planilha.

**3. Docker em qualquer host (Fly.io, VPS).** `Dockerfile` + `docker-entrypoint.sh` fazem o mesmo bootstrap (migrate → seed → import → start). Variáveis: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST=true`, `SEED_DEFAULT_PASSWORD`; opcionais `IMPORT_ON_BOOT=0` e `SKIP_SEED=1` após a primeira execução.

```bash
docker build -t leto-pipeline .
docker run -p 3000:3000 --env-file .env leto-pipeline
```

**4. Vercel + Supabase/Neon.** `vercel.json` já define o build (`prisma generate && prisma migrate deploy && next build`). Crie o banco (Supabase/Neon), defina as variáveis no projeto Vercel e importe a planilha uma vez localmente apontando `DATABASE_URL` para o banco de produção: `npm run import:pipeline`.

Health check em todos os casos: `GET /api/health`.

## Estrutura dos dados

Regra fundamental: **nenhuma normalização apaga o valor original**.

| Normalizado | Original preservado |
|---|---|
| `Opportunity.name` | `nameRaw` (+ `ImportRow.rawData.E`) |
| `operationTypeId` → `OperationType` | `operationTypeRaw` + `OperationTypeMapping.rawValue` |
| `statusId` → `OpportunityStatus` | `statusRaw` (coluna *Decisão*), `legacyStatusText` (*Status da Operação*), `legacyFeedback` (*Feedback*) |
| `entryDate`, `entryYear`, `exitDate` | `entryDateRaw`, `entryYearRaw`, `exitDateRaw` |
| `amount` (Decimal, R$ mm) | `amountRaw` (`TBD`, `5 a 10mm`…) |
| `assignees` (many-to-many) | `assigneesRaw` (`Christopher/Antonio`) |
| `originators` (empresa + contato) | `originatorRaw`, `originatorTypeRaw`, `OpportunityOriginator.rawText/confidence/migrationNotes` |
| timeline (`Activity` com `isLegacy=true`) | texto integral em `legacyStatusText` / `legacyFeedback`; cada `Activity` guarda `sourceSheet` e `sourceRow` |

A aba **Planilha original** de cada oportunidade mostra a linha exatamente como estava.

## Decisões de normalização

**Status.** A coluna *Decisão* tinha `Não/não`, `On Hold/On hold`, `Em análise`, `Concluído` e vazios. Mapeamento: `Não` → **Declinada** (outcome LOST); `On Hold` → **On Hold**; `Em análise` → **Em análise** (OPEN); `Concluído` → **Concluído / Investido** (WON); vazio ou não reconhecido → **Legado / não classificado** (grupo LEGACY, outcome UNKNOWN) + issue `STATUS_UNNORMALIZED`. Não se infere etapa (triagem, proposta, comitê…) a partir do texto livre; o funil do dashboard usa evidências do histórico apenas como indicador (ex.: “enviamos proposta”, “data room”).

**Tipos de operação.** 179 grafias distintas → 20 tipos em 14 categorias. Regras (acentos, singular/plural, palavras-chave) com confiança; grafias abaixo de 70% ficam `needsReview` e aparecem em Data Quality. Casos notáveis: `Crédito`/`Credito` → *Crédito Estruturado*; `DIP para RJ`/`Crédito para RJ` → *DIP / Exit Financing*; carteiras de crédito → *NPL*; debêntures/CRA/CRI → *Títulos de Crédito*; `Precatórios`/`Precatório` sem esfera → *Precatório (esfera não identificada)*, e quando o **nome** deixa a esfera evidente (“Precatórios do Estado do RN”) o tipo é ajustado com issue informativa `TYPE_SPHERE_INFERRED`; nomes de pessoas na coluna de tipo (`Rafael Spinelli`, `Angatu`…) → *Outros* + revisão; tarefas internas (`Apresentação`, `Carta`, `SITE RI`) → *Não é oportunidade*. Todo o de/para é editável em Administração → Tipos de operação e reclassifica em massa preservando o raw.

**Responsáveis.** `Antonio`→Antônio Penido, `Christopher`/`Chris`→Christopher Soares, `Luiza`→Luiza Oswald; Vitória Iglesias adicionada. Combinações (`Christopher/Antonio`, `Hugo e Christopher`, `Luiza / Bernardo`) viram múltiplos responsáveis. Hugo, Bernardo, Mollica e Mauad viram **Archived User** (sem login). `Todos` e `JGP FA` **não** são atribuídos a ninguém: ficam em `assigneesRaw` com issue `ASSIGNEE_UNMAPPED`. A aba `Output` preenche responsáveis apenas quando a linha da aba Pipe não tinha nenhum (auditado como `import`).

**Originadores.** A célula *Contato* misturava pessoa e empresa. Padrões reconhecidos: `Pessoa (Empresa)`, `Empresa (Pessoa)`, `Pessoa - Empresa`, `Empresa / Pessoa`, `Empresa (Categoria)` (`CM Capital (Broker)`), `Pessoa (Cargo)` (`Marcus (CFO)`). Nomes isolados são classificados usando a aba *Originadores* (tipo), palavras-chave de empresa (Capital, Partners, Advogados, Asset, Banco…), lista de primeiros nomes e apelidos canônicos (`A&M`, `Alvarez& Marsal` → Alvarez & Marsal; `Itau BBA` → Itaú BBA; `Galdino` → Galdino Advogados…). Placeholders (`Broker`, `Advogado`, `Empresário`) não criam entidade: só definem a categoria do originador. `Originação Própria`/`Cross sell` viram empresas internas. Casos ambíguos (`Beam Capital / Almeida Mota`, `Paulo Viola (assessor)\nCelso Paes (CFO)`) recebem `confidence` baixa e `needsReview`, com o texto original preservado, e podem ser corrigidos na aba *Originação* da oportunidade (“Corrigir vínculo”).

**Categoria do originador.** Segue o de/para que já existia na planilha (`Advisor`→Consultoria, `Advogado`→Escritório Adv., `Gestora`/`Fundo`→Asset, `BNDES`→Banco, `JGP FA`→Consultoria), com exceção de *Advisor* e *Boutique*, mantidas como categorias próprias (pedido do time). A categoria da empresa prevalece; sem empresa, usa-se o *Tipo de Contato* da linha; sem ambos, a categoria da pessoa.

**Datas e valores.** `-`/vazio → sem data (issue `MISSING_DATE`); `year = 1900`/`#VALUE!` → issue `INVALID_YEAR` (o ano usado nos relatórios é sempre o da data de entrada); `TBD`, `5 a 10mm`, `12 a 15` → valor nulo, raw preservado. Nenhum valor é “corrigido” silenciosamente.

**Timeline.** O log `dd/mm - texto` da coluna *Status da Operação* vira uma atividade por linha; o ano é inferido da data de entrada (rolando para o ano seguinte quando o mês retrocede) e marcado com `dateInferred` (`*` na interface). *Feedback* vira atividade `LEGACY_FEEDBACK`. Datas de saída com decisão geram o evento de encerramento/on hold.

**Duplicidades.** Nomes idênticos dentro da aba Pipe (ex.: `Construturor QGI x Petrobras` #894/#895) recebem `POSSIBLE_DUPLICATE` em ambos os registros; nada é mesclado automaticamente.

## Problemas de qualidade encontrados na planilha

Resumo da última importação (detalhes em `reports/migration-report.md` e em Administração → Data Quality):

| Problema | Ocorrências |
|---|---:|
| Pessoa originadora sem empresa identificada | 186 |
| Possíveis duplicidades por nome idêntico | 85 |
| Originador ambíguo / não classificado (revisão) | ~60 |
| Originador vazio | 36 |
| Oportunidades sem nome | 33 |
| Tipo de contato não mapeado (`#N/A`, `0`, `Companhia`…) | 33 |
| Tipo de operação com mapeamento incerto | 29 |
| Esfera de precatório inferida pelo nome | 22 |
| Sem data de entrada | 19 |
| Ano inválido (`1900`, `#VALUE!`) | 18 |
| Tipo de operação vazio | 14 |
| Data de saída anterior à entrada | 10 |
| Linhas que não são oportunidades (apresentação, carta, site) | 7 |
| Valor não numérico (`TBD`, faixas) | 3 |
| Status/decisão vazio | 2 |
| Responsável legado não mapeado (`Todos`, `JGP FA`) | 2 |

Outras inconsistências tratadas: `On Hold`/`On hold`, `Não`/`não`, 179 grafias de tipo, 24 combinações de responsáveis, contatos que ora são pessoa ora empresa, colunas usadas de formas diferentes ao longo do tempo (2024 sem *Tipo de Contato*; abas auxiliares com categorias próprias). Cerca de 27 linhas de abas auxiliares não têm correspondência na aba Pipe e ficam listadas para revisão manual (não foram importadas como oportunidades).

## Testes, lint e build

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest: 56 testes (unitários + integração com PostgreSQL)
npm run build       # prisma generate && next build
```

Os testes de integração criam o banco `leto_pipeline_test` (variável `TEST_DATABASE_URL`), aplicam as migrations, fazem seed e importam a planilha. Cobrem: importação e contagens de sanidade, idempotência (segunda execução não cria nada), normalização de status/tipos/responsáveis/originadores, timeline legada, duplicidades, filtros server-side, criação/edição/quick edit/encerramento/reativação com auditoria, notas e atividades, de/para manual (e sua preservação em reimportação), views salvas, métricas do dashboard, CRM de originadores, relatórios e busca global.

## Decisões técnicas

- **Auth.js (credenciais) em vez de Supabase Auth**: sistema interno com 4 usuários; login por e-mail/senha com bcrypt e JWT evita dependência de serviço externo e funciona com qualquer PostgreSQL (inclusive o do Supabase). Papéis Admin/User aplicados em `middleware.ts` (rotas `/admin`) e nas server actions.
- **Prisma** pela maturidade das migrations e tipagem; agregados do CRM usam SQL nativo (`$queryRaw`) por performance.
- **Filtros na URL**: todo estado de filtro/ordenação/página fica na query string, então views são compartilháveis e as *views salvas* apenas armazenam esses parâmetros.
- **Dashboard em memória sobre projeção estreita**: com ~1k (até dezenas de milhares) de linhas, carregar a projeção filtrada e agregar em memória é mais rápido e simples que dezenas de `groupBy`; listagens continuam paginadas no servidor.
- **Anexos por link** nesta versão (SharePoint/Drive); a tabela `Attachment` já tem `storageKey`/`mimeType`/`sizeBytes` para upload direto (S3/Supabase Storage) depois.
- **Logos**: `public/brand/*.svg` são versões vetoriais derivadas do logo enviado (marca olive/lime + wordmark). Substitua pelos SVGs oficiais mantendo os nomes `leto-logo.svg` (fundo escuro), `leto-logo-dark.svg` (fundo claro) e `leto-mark.svg` (ícone).
- **Identidade visual**: tokens derivados do logo — ink `#0f1411`, leto green `#a6b85a` (accent), green-deep `#5c7a2e`, sand `#f6f7f3` (fundo), stone `#6b7266` (muted), line `#e2e5dc` (bordas); estados success/warning/danger/info sóbrios (`tailwind.config.ts`).
- **Repositório**: o código vive neste repositório (`ControlePipe`, branch de trabalho) porque a sessão só tem acesso a ele; para usar o nome `leto-pipeline-crm`, renomeie o repositório no GitHub (Settings → Rename) — nada no código depende do nome.
