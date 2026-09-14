# Histórico de versões — Leto Special Situations

Cada versão abaixo tem uma branch `baseline/<versão>` no GitHub apontando para o commit exato que estava em
produção naquele momento. Para voltar a uma versão: pedir a reversão (um commit de reversão na branch de
trabalho, que o Railway publica sozinho) ou usar *Redeploy* em um deploy antigo no painel do Railway.
Os dados ficam no banco, não no git: antes de mudanças grandes, gerar um "Exportar Excel (backup)".

## v1.0.0-base — 2026-09-14 · ponto de partida
Branch: `baseline/v1.0.0-base` · commit `041b2c0`

- App em produção no Railway (https://controlepipe-production.up.railway.app), 903 oportunidades importadas.
- Identidade visual Leto (preto + verde-lima), "Special Situations" em destaque em todas as telas.
- Login em duas etapas: senha da equipe, depois escolha de quem está entrando (sem nomes na tela inicial).
- Pipe Ativo como primeira tela, edição inline, filtros em todas as colunas, tabela única sem paginação.
- Botões "Novo caso" e "Exportar Excel (backup)".
- E-mails da equipe: apenido (admin), csoares, viglesias, loswald @letocapital.com.br.
