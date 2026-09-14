# Histórico de versões — Leto Special Situations

Cada versão abaixo tem uma branch `baseline/<versão>` no GitHub apontando para o commit exato que estava em
produção naquele momento. Para voltar a uma versão: pedir a reversão (um commit de reversão na branch de
trabalho, que o Railway publica sozinho) ou usar *Redeploy* em um deploy antigo no painel do Railway.
Os dados ficam no banco, não no git: antes de mudanças grandes, gerar um "Exportar Excel (backup)".

## v1.2.1 — 2026-09-14 · recusas em barras empilhadas + waterfall
Branch: `baseline/v1.2.1`

- O donut "Quem recusou" saiu. O gráfico "Motivos de recusa" passou a mostrar, em cada barra, a parte
  "Leto declinou" e a parte "contraparte recusou / desistiu".
- Novo waterfall "Como se somam as recusas": começa do zero e empilha motivo a motivo (mais as sem
  motivo) até o total de oportunidades declinadas.

## v1.2.0 — 2026-09-14 · motivos de recusa estruturados
Branch: `baseline/v1.2.0`

- Ao marcar uma oportunidade como **Declinada** (tabela, Minha mesa ou página do caso) abre uma janela
  para escolher o **motivo** em lista fechada (sem fit, garantia/risco, preço/retorno, crédito fraco,
  prazo, ticket, já resolvido, concorrente, contraparte desistiu, sem proposta, outro) e **quem recusou**
  (Leto ou contraparte), com detalhes em texto.
- A coluna "Motivo / feedback" mostra a categoria e permite corrigir motivo e quem recusou.
- **Dashboard:** novos gráficos "Motivos de recusa" e "Quem recusou".
- As 736 recusas históricas foram classificadas automaticamente a partir do texto da planilha
  (98% das que tinham texto) e aparecem marcadas com * até alguém confirmar/corrigir.
- Backup Excel ganha as colunas "Motivo (categoria)", "Quem recusou" e "Motivo inferido do texto".
- Estrutura do banco: migration `20260914194221_decline_reason` (aplicada sozinha no deploy).

## v1.1.1 — 2026-09-14 · um só lugar para cadastrar
Branch: `baseline/v1.1.1`

- Cadastro de oportunidade só pelo botão "Nova oportunidade" no topo. Removidos o botão "Novo caso" e a
  linha verde de inclusão rápida do Pipe Ativo, e o botão duplicado em Todas as Oportunidades. O botão
  "Exportar Excel (backup)" continua.

## v1.1.0 — 2026-09-14 · Minha mesa (dashboard pessoal)
Branch: `baseline/v1.1.0`

- Nova tela **Minha mesa** (segundo item do menu): à esquerda, os casos sob responsabilidade do usuário
  (ativos / on hold / todos, com busca), follow-ups vencidos primeiro e dias parado; à direita, o caso
  selecionado com status, responsáveis, próxima ação e follow-up editáveis, follow-ups pendentes com
  "Concluir", campo "Registrar andamento" e a lista dos últimos andamentos.
- Seletor "Mesa de" para abrir a mesa de qualquer pessoa da equipe.
- O caso selecionado fica na URL (`?op=`), então o link pode ser compartilhado.

## v1.0.0-base — 2026-09-14 · ponto de partida
Branch: `baseline/v1.0.0-base` · commit `041b2c0`

- App em produção no Railway (https://controlepipe-production.up.railway.app), 903 oportunidades importadas.
- Identidade visual Leto (preto + verde-lima), "Special Situations" em destaque em todas as telas.
- Login em duas etapas: senha da equipe, depois escolha de quem está entrando (sem nomes na tela inicial).
- Pipe Ativo como primeira tela, edição inline, filtros em todas as colunas, tabela única sem paginação.
- Botões "Novo caso" e "Exportar Excel (backup)".
- E-mails da equipe: apenido (admin), csoares, viglesias, loswald @letocapital.com.br.
