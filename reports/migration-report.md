# Relatório de migração — Acompanhamento do Pipe_20260817.xlsx

- Batch: `cmtwf3io6000z7dx1ex4quify`
- SHA-256 do arquivo: `8ad4cfe48c0502fb612cccbac4dba13b9b5f4832da9d001753be28ba78aec917`
- Gerado em: 2026-09-11T03:49:56.175Z
- Abas lidas: Sheet4, Pipe, Originadores, Analise Originação 2025, Reestruturação, Vertical_1812, Vertical_1610, Vertical_2509, Vertical_2108, Reunião Vertical_1707, Reuniao Vertical_1505, Originação, Output, Reuniao Vertical_old, Sheet2, Sheet1

## Resumo

| Métrica | Valor |
|---|---:|
| Linhas na aba Pipe | 903 |
| Oportunidades criadas | 903 |
| Oportunidades atualizadas | 0 |
| Linhas sem alteração (idempotência) | 0 |
| Erros | 0 |
| Empresas criadas | 180 |
| Contatos criados | 185 |
| Atividades históricas geradas | 4105 |
| Oportunidades marcadas para revisão manual | 130 |
| Problemas de qualidade em aberto | 647 |

## Registros por ano (calculado da data de entrada)

| Ano | Registros |
|---|---:|
| 2024 | 245 |
| 2025 | 372 |
| 2026 | 267 |
| sem ano | 19 |

## Registros por status normalizado

| Status | Registros |
|---|---:|
| DECLINED | 736 |
| ON_HOLD | 100 |
| ANALYSIS | 38 |
| CONCLUDED | 27 |
| LEGACY_UNCLASSIFIED | 2 |

## Registros por tipo normalizado

| Tipo | Registros |
|---|---:|
| credito-estruturado | 231 |
| legal-claim | 156 |
| precatorio-estadual | 87 |
| dip-exit-financing | 67 |
| npl | 67 |
| precatorio-federal | 54 |
| precatorio-municipal | 50 |
| pre-precatorio-federal | 45 |
| outros | 29 |
| direitos-creditorios | 24 |
| precatorio-nao-identificado | 21 |
| titulos-de-credito | 10 |
| litigation-finance | 10 |
| falencia-distressed | 10 |
| pre-precatorio | 8 |
| pre-precatorio-estadual | 8 |
| nao-e-oportunidade | 7 |
| fidc | 7 |
| pre-precatorio-municipal | 6 |
| antecipacao-recebiveis | 6 |

## Dados incompletos / inconsistentes (Data Quality)

| Código | Descrição | Ocorrências |
|---|---|---:|
| COMPANY_UNIDENTIFIED | Pessoa sem empresa identificada | 274 |
| POSSIBLE_DUPLICATE | Possíveis duplicidades | 85 |
| ORIGINATOR_UNCLASSIFIED | Originador não classificado / ambíguo | 59 |
| ORIGINATOR_MISSING | Originador vazio | 36 |
| MISSING_NAME | Oportunidades sem nome | 33 |
| ORIGINATOR_CATEGORY_UNMAPPED | Tipo de contato não mapeado | 33 |
| TYPE_UNNORMALIZED | Tipo de operação com mapeamento incerto | 29 |
| TYPE_SPHERE_INFERRED | Esfera de precatório inferida pelo nome | 22 |
| MISSING_DATE | Oportunidades sem data de entrada | 19 |
| INVALID_YEAR | Coluna year inválida (1900 / #VALUE!) | 18 |
| TYPE_MISSING | Tipo de operação vazio | 14 |
| EXIT_BEFORE_ENTRY | Data de saída anterior à entrada | 10 |
| NOT_AN_OPPORTUNITY | Linhas que não são oportunidades (tarefas internas) | 7 |
| AMOUNT_NOT_NUMERIC | Valor não numérico (TBD, faixas) | 3 |
| ASSIGNEE_UNMAPPED | Responsável legado não mapeado | 2 |
| STATUS_UNNORMALIZED | Status/decisão não normalizado | 2 |

## Possíveis duplicidades na aba Pipe (não mescladas)

- **Elisa Agro** — #32, #281, #671
- **Aspometron** — #44, #117, #287
- **OI** — #83, #234, #374
- **IRGOVEL** — #203, #217
- **Brandili** — #90, #414
- **Casa Bahia** — #95, #98
- **Estre Ambiental** — #97, #318
- **Camargo Correa** — #103, #182
- **Sequoia** — #104, #136
- **Leilão do Itau** — #105, #119, #343
- **Minter** — #123, #263
- **São Paulo** — #125, #290
- **Precatório** — #157, #168
- **Precatorios Estaduais e Municipais** — #204, #779
- **Bunge** — #222, #527
- **Cocelpa** — #230, #555
- **Casa de Saúde Dr. Aragão Villar** — #233, #359
- **Allonda** — #246, #449, #673
- **Crédito Pis Cofins** — #714, #716
- **Allievo** — #273, #330
- **Sencinet** — #319, #614
- **Construtora Itau x SANEPAR** — #336, #439
- **Casas Bahia** — #339, #617
- **Grupo Monte Alegre** — #350, #639
- **Patense** — #356, #642
- **Precatório Fortaleza** — #381, #625
- **Precatório Paraná** — #387, #896
- **Packem** — #418, #685
- **Precatório de Alagoas** — #436, #814
- **Casal x Fazenda Nacional** — #446, #523
- **Eletrodata** — #453, #720
- **Cara Preta** — #491, #568
- **CTR Itaboraí x Itaboraí** — #513, #514
- **Tomé Carlos x  Instituto Chico Mendes (ICMBio)** — #571, #794
- **Zemax** — #627, #782
- **Minauro x SP** — #692, #842
- **Cunha vs. Gafisa** — #697, #823
- **Telemont** — #734, #812
- **Usina João de Deus x União (Tese do IAA)** — #763, #813
- **Construturor QGI x Petrobras** — #894, #895

## Responsáveis legados

| Membro mapeado | Ocorrências |
|---|---:|
| christopher | 58 |
| luiza | 47 |
| hugo | 23 |
| antonio | 16 |
| bernardo | 11 |
| mollica | 8 |

Tokens não mapeados (preservados em `assigneesRaw`, sinalizados em Data Quality):

- `jgp fa` — 1
- `todos` — 1

## De/para de tipos de operação (editável em Administração → Tipos de operação)

| Valor original | Tipo normalizado | Confiança | Revisar | Ocorrências |
|---|---|---:|:-:|---:|
| Crédito Estruturado | credito-estruturado | 100% |  | 160 |
| Legal Claim | legal-claim | 100% |  | 112 |
| NPL | npl | 100% |  | 52 |
| Precatório Estadual | precatorio-estadual | 100% |  | 51 |
| DIP | dip-exit-financing | 95% |  | 50 |
| Crédito | credito-estruturado | 90% |  | 43 |
| Precatório Federal | precatorio-federal | 100% |  | 33 |
| Precatório Municipal | precatorio-municipal | 100% |  | 33 |
| Pré Precatório Federal | pre-precatorio-federal | 95% |  | 29 |
| Precatórios | precatorio-nao-identificado | 90% |  | 14 |
| Ação Judicial | legal-claim | 90% |  | 12 |
| Precatório | precatorio-nao-identificado | 90% |  | 11 |
| Precatorio Municipal | precatorio-municipal | 100% |  | 9 |
| Litigation Finance | litigation-finance | 100% |  | 9 |
| Legal Claims | legal-claim | 90% |  | 9 |
| Precatorio Estadual | precatorio-estadual | 100% |  | 8 |
| Direito Creditórios | direitos-creditorios | 90% |  | 8 |
| Crédito para Operação | credito-estruturado | 80% |  | 7 |
| Precatorio Federal | precatorio-federal | 100% |  | 7 |
| Falência | falencia-distressed | 90% |  | 7 |
| DIP para RJ | dip-exit-financing | 95% |  | 5 |
| Credito | credito-estruturado | 90% |  | 5 |
| Antecipação de Recebíveis | antecipacao-recebiveis | 100% |  | 5 |
| Debenture | titulos-de-credito | 90% |  | 4 |
| Direitos Creditórios | direitos-creditorios | 100% |  | 4 |
| Precatorios | precatorio-nao-identificado | 90% |  | 4 |
| Pré precatório | pre-precatorio | 90% |  | 4 |
| Pré Precatorio | pre-precatorio | 90% |  | 4 |
| Pre precatorio | pre-precatorio | 90% |  | 4 |
| Precatorio federal | precatorio-federal | 100% |  | 4 |
| Pré Precatório Municipal | pre-precatorio-municipal | 95% |  | 4 |
| Leilão | direitos-creditorios | 60% | sim | 3 |
| Crédito para RJ | dip-exit-financing | 95% |  | 3 |
| Precatorio | precatorio-nao-identificado | 90% |  | 3 |
| Legal claim | legal-claim | 100% |  | 3 |
| Credito para RJ | dip-exit-financing | 95% |  | 3 |
| Pré-precatório Federal | pre-precatorio-federal | 100% |  | 3 |
| FIDC | fidc | 100% |  | 3 |
| Pré precatório Estadual | pre-precatorio-estadual | 95% |  | 3 |
| CRA | titulos-de-credito | 90% |  | 3 |
| Claims | legal-claim | 90% |  | 2 |
| Compra de NPL | npl | 95% |  | 2 |
| Pre precatório Federal | pre-precatorio-federal | 95% |  | 2 |
| Oportunidade de Crédito estressado | credito-estruturado | 80% |  | 2 |
| Crédito RJ | dip-exit-financing | 95% |  | 2 |
| Capital de Giro | credito-estruturado | 80% |  | 2 |
| Tunepe | legal-claim | 60% | sim | 2 |
| Precatorio TO | precatorio-estadual | 90% |  | 2 |
| Precatorio do Rio de Janeiro | precatorio-estadual | 90% |  | 2 |
| Pre Precatorio Federal | pre-precatorio-federal | 95% |  | 2 |
| Claim | legal-claim | 90% |  | 2 |
| Carteira de Crédito | npl | 75% |  | 2 |
| Precatórios Estaduais | precatorio-estadual | 90% |  | 2 |
| Leilao Single Names ITAÚ | npl | 95% |  | 1 |
| Honorário Advocatício Data Traffic | legal-claim | 90% |  | 1 |
| Ação Judicial x Transnordestina | legal-claim | 90% |  | 1 |
| Crédito para empresa em distress | credito-estruturado | 80% |  | 1 |
| Gazeta Mercantil | outros | 20% | sim | 1 |
| Honorários Advocatícios | legal-claim | 90% |  | 1 |
| Crédito para Empresa | credito-estruturado | 80% |  | 1 |
| Credito tributario ICMS | direitos-creditorios | 80% |  | 1 |
| Compra de créditos de RJ | dip-exit-financing | 95% |  | 1 |
| Financiamento imobiliário | credito-estruturado | 70% |  | 1 |
| Precatorio estadual Goias | precatorio-estadual | 90% |  | 1 |
| Leilao Itaú | npl | 95% |  | 1 |
| Precatorios Municipais RJ CNO | precatorio-municipal | 95% |  | 1 |
| Ativos para Monetização | outros | 50% | sim | 1 |
| Ação contra o estado do Pará | legal-claim | 90% |  | 1 |
| Precatorio Municipal do RJ | precatorio-municipal | 95% |  | 1 |
| Massa Falida | falencia-distressed | 90% |  | 1 |
| Crédito para compra de participação em empresa | credito-estruturado | 80% |  | 1 |
| TECHNION | outros | 20% | sim | 1 |
| Alongamento de Dívida | credito-estruturado | 80% |  | 1 |
| Precatorio Estadual RJ | precatorio-estadual | 90% |  | 1 |
| Precatorio Estadual SP | precatorio-estadual | 90% |  | 1 |
| Precatorio Estadual MT | precatorio-estadual | 90% |  | 1 |
| IAA Pre precatorio | pre-precatorio-federal | 95% |  | 1 |
| Carteira Precatorios A&M | precatorio-nao-identificado | 60% | sim | 1 |
| Precatorio 3A Investimentos | precatorio-nao-identificado | 60% | sim | 1 |
| Credito UST | direitos-creditorios | 50% | sim | 1 |
| Angatu | outros | 20% | sim | 1 |
| Precatorio TUNEP | precatorio-federal | 70% | sim | 1 |
| Marcelo Leonel | outros | 20% | sim | 1 |
| FIDCs | fidc | 95% |  | 1 |
| Sucumbência de Precatorio | legal-claim | 70% | sim | 1 |
| Pre precatório | pre-precatorio | 90% |  | 1 |
| Precatorio do Estado do PR | precatorio-estadual | 90% |  | 1 |
| Precatorio FA | precatorio-nao-identificado | 40% | sim | 1 |
| Antecipaçao de Metodista | antecipacao-recebiveis | 90% |  | 1 |
| Aquisição de carteira de NPL | npl | 95% |  | 1 |
| Venda de UPI | falencia-distressed | 90% |  | 1 |
| Precatório Federal TRF1 | precatorio-federal | 95% |  | 1 |
| Ativos Judiciais Tributarios | legal-claim | 90% |  | 1 |
| FIDC Agro | fidc | 95% |  | 1 |
| Precatório Federal Alimentar | precatorio-federal | 95% |  | 1 |
| Compra de Crédito | direitos-creditorios | 90% |  | 1 |
| Execução | legal-claim | 90% |  | 1 |
| Formulário de Referência/Leme Forense | nao-e-oportunidade | 90% |  | 1 |
| SITE RI | nao-e-oportunidade | 90% |  | 1 |
| Crédito Trabalhista | legal-claim | 90% |  | 1 |
| Pré-Precatório Federal | pre-precatorio-federal | 100% |  | 1 |
| Carta | nao-e-oportunidade | 90% |  | 1 |
| Apresentação | nao-e-oportunidade | 90% |  | 1 |
| Direto Creditório | credito-estruturado | 80% |  | 1 |
| Compra de UPI | falencia-distressed | 90% |  | 1 |
| Carteira de crédito | npl | 75% |  | 1 |
| Carteira de Ativos | outros | 50% | sim | 1 |
| Pré Precatório | pre-precatorio | 90% |  | 1 |
| Crédito ICMS | direitos-creditorios | 80% |  | 1 |
| Arbitragem | legal-claim | 90% |  | 1 |
| Precatórios Municipais | precatorio-municipal | 95% |  | 1 |
| Ativo Fiscal | direitos-creditorios | 80% |  | 1 |
| Pré precatorio | pre-precatorio | 90% |  | 1 |
| Aquisição de Empresa | outros | 70% | sim | 1 |
| Pré-precatório Estado | pre-precatorio-estadual | 95% |  | 1 |
| Precatórios Federal | precatorio-federal | 95% |  | 1 |
| Venda de ativo | outros | 60% | sim | 1 |
| Fiagro III | fidc | 95% |  | 1 |
| Equity | outros | 70% | sim | 1 |
| Pré Precatorio Estadual | pre-precatorio-estadual | 95% |  | 1 |
| DIP FINANCE | dip-exit-financing | 95% |  | 1 |
| Inventário | legal-claim | 60% | sim | 1 |
| Pre precatório Estadual | pre-precatorio-estadual | 95% |  | 1 |
| Pre precatorio Municipal | pre-precatorio-municipal | 95% |  | 1 |
| TDA | direitos-creditorios | 80% |  | 1 |
| Pre precatorio Estadual | pre-precatorio-estadual | 95% |  | 1 |
| Precatórios Federais | precatorio-federal | 95% |  | 1 |
| Crédito para CapEx | credito-estruturado | 80% |  | 1 |
| DIP/Equity para RJ | dip-exit-financing | 95% |  | 1 |
| Crédito para Pgto do Bond | credito-estruturado | 80% |  | 1 |
| CRA ou CRI | titulos-de-credito | 90% |  | 1 |
| Compra de Carteira de Crédito | npl | 75% |  | 1 |
| Pré-precatório | pre-precatorio | 100% |  | 1 |
| Refinanciamento da Dívida | credito-estruturado | 80% |  | 1 |
| Capital Solution | credito-estruturado | 80% |  | 1 |
| Credito para Empresa | credito-estruturado | 80% |  | 1 |
| Precatório Sergipe | precatorio-estadual | 90% |  | 1 |
| Precatorio Estado de SP | precatorio-estadual | 90% |  | 1 |
| Precatório Tocantis | precatorio-estadual | 90% |  | 1 |
| Precatórios Tocantis | precatorio-estadual | 90% |  | 1 |
| Precatório DF | precatorio-estadual | 90% |  | 1 |
| Apresentação de Special Sits | nao-e-oportunidade | 90% |  | 1 |
| Acordo de negociação das fazendas | outros | 50% | sim | 1 |
| Carteira | outros | 40% | sim | 1 |
| Carteira de Real Estate | outros | 60% | sim | 1 |
| Litigation | litigation-finance | 95% |  | 1 |
| Precatório Federal Brasilia | precatorio-federal | 95% |  | 1 |
| Sugestão de Parceria | nao-e-oportunidade | 80% |  | 1 |
| Tunep | legal-claim | 60% | sim | 1 |
| Compra de Créditos | direitos-creditorios | 90% |  | 1 |
| Compra de Debentures | titulos-de-credito | 90% |  | 1 |
| NPL do Itau | npl | 95% |  | 1 |
| Compra de Créditos do CS | direitos-creditorios | 60% | sim | 1 |
| Ativos Judiciais | legal-claim | 90% |  | 1 |
| Pre precatorio Municipal - Feira de Santana | pre-precatorio-municipal | 95% |  | 1 |
| Carteira de recebíveis | npl | 75% |  | 1 |
| Precatório Paraná | precatorio-estadual | 90% |  | 1 |
| Compra de CRI | titulos-de-credito | 90% |  | 1 |
| Imóveis em Leilão | outros | 60% | sim | 1 |
| Carteira de Créditos Municipais | npl | 75% |  | 1 |
| Precatório Estadual de Goiás | precatorio-estadual | 90% |  | 1 |
| Rafael Spinelli | outros | 20% | sim | 1 |
| Precatório de Camaçari | precatorio-municipal | 95% |  | 1 |
| Apresentação de NPL para o Banco do Brasil | nao-e-oportunidade | 90% |  | 1 |
| Precatório Estadual do RJ | precatorio-estadual | 90% |  | 1 |
| Honorário Advocatício sobre Legal Claim | legal-claim | 90% |  | 1 |
| Direitos Creditorios Federais | direitos-creditorios | 90% |  | 1 |
| Dívida para recompra de Imovel | credito-estruturado | 70% |  | 1 |
| Precatorios Estadual | precatorio-estadual | 90% |  | 1 |
| Antecipação de Acordo Trabalhista | legal-claim | 90% |  | 1 |
| Compra de crédito na RJ | dip-exit-financing | 95% |  | 1 |
| Venda de Carteira AGRO | npl | 75% |  | 1 |
| Carteira de credito | npl | 75% |  | 1 |
| Precatório Estadual Ceará | precatorio-estadual | 90% |  | 1 |
| Venda de Cia de Antecipação de Preca | outros | 50% | sim | 1 |
| Venda de Carteira de Recebíveis Agro | npl | 75% |  | 1 |
| FIDC Auto BV | fidc | 95% |  | 1 |
| Precatorio estadual RJ | precatorio-estadual | 90% |  | 1 |

## Reconciliação com abas auxiliares

Abas auxiliares nunca criam oportunidades: só enriquecem registros já existentes na aba Pipe (categoria do originador, responsáveis da aba Output, histórico de status).

| Aba | Linhas | Casadas com Pipe | Sem correspondência | Enriquecimentos aplicados |
|---|---:|---:|---:|---:|
| Analise Originação 2025 | 372 | 366 | 6 | 6 |
| Originação | 257 | 236 | 21 | 15 |
| Output | 67 | 66 | 1 | 56 |

| Aba de reunião vertical | Linhas | Casadas | Sem correspondência |
|---|---:|---:|---:|
| Vertical_1812 | 72 | 68 | 4 |
| Vertical_1610 | 60 | 55 | 5 |
| Vertical_2509 | 125 | 122 | 3 |
| Vertical_2108 | 105 | 104 | 1 |
| Reunião Vertical_1707 | 92 | 88 | 4 |
| Reuniao Vertical_1505 | 63 | 49 | 14 |
| Reuniao Vertical_old | 61 | 45 | 16 |

### Linhas de abas auxiliares sem correspondência na aba Pipe (revisão manual)

Estas linhas NÃO foram importadas como oportunidades para evitar duplicidade. Ficam registradas em `ImportRow` com status `unmatched`.

| Aba | Linha | Nome | Data |
|---|---:|---|---|
| Analise Originação 2025 | 19 |  | 2025-01-31 |
| Analise Originação 2025 | 24 |  | 2025-01-31 |
| Analise Originação 2025 | 43 |  | 2025-01-31 |
| Analise Originação 2025 | 44 |  | 2025-01-31 |
| Analise Originação 2025 | 88 |  | 2025-03-17 |
| Analise Originação 2025 | 256 |  | 2025-08-12 |
| Originação | 10 |  | 2024-08-21 |
| Originação | 19 |  | 2024-11-18 |
| Originação | 24 |  | 2024-12-10 |
| Originação | 31 |  | 2024-12-13 |
| Originação | 39 |  | 2024-07-30 |
| Originação | 51 |  | 2024-08-20 |
| Originação | 54 |  | 2024-04-19 |
| Originação | 126 |  | 2024-10-28 |
| Originação | 134 | OI |  |
| Originação | 142 | Petrobras | 2024-03-15 |
| Originação | 151 |  | 2024-06-06 |
| Originação | 157 |  | 2024-12-13 |
| Originação | 158 |  | 2024-08-02 |
| Originação | 192 |  | 2024-08-20 |
| Originação | 201 |  | 2024-10-10 |
| Originação | 212 | IRGOVEL |  |
| Originação | 227 |  | 2024-03-15 |
| Originação | 232 |  | 2024-08-30 |
| Originação | 240 |  | 2024-08-23 |
| Originação | 242 |  | 2024-08-30 |
| Originação | 261 |  | 2024-10-17 |
| Output | 37 | Nome |  |
