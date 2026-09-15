export type AdminTaskCategoryKey = "APRESENTACAO_MATERIAL" | "RELACIONAMENTO_ORIGINADOR" | "FUNDO_ESTRUTURA" | "FERRAMENTAS_FORNECEDORES" | "JURIDICO_COMPLIANCE" | "MARKETING_COMUNICACAO" | "INTERNO_OUTRO";
export type AdminTaskStatusKey = "TODO" | "IN_PROGRESS" | "WAITING" | "DONE" | "CANCELED";
export type AdminTaskPriorityKey = "LOW" | "MEDIUM" | "HIGH";

export const ADMIN_TASK_CATEGORIES: { key: AdminTaskCategoryKey; label: string; hint: string }[] = [
  { key: "APRESENTACAO_MATERIAL", label: "Apresentações e materiais", hint: "Deck institucional, carta ao comercial, TIR dos fundos, gráficos" },
  { key: "RELACIONAMENTO_ORIGINADOR", label: "Relacionamento com originadores", hint: "Calls de apresentação, NDA de parceria, cobrar deals, agradecer indicações" },
  { key: "FUNDO_ESTRUTURA", label: "Fundos e estrutura", hint: "Regulamento, administrador, assembleia, chamada de capital, novo fundo" },
  { key: "FERRAMENTAS_FORNECEDORES", label: "Ferramentas e fornecedores", hint: "Testes de sistemas, cadastros, contratos com prestadores" },
  { key: "JURIDICO_COMPLIANCE", label: "Jurídico e compliance", hint: "KYC, CVM, políticas, contratos internos" },
  { key: "MARKETING_COMUNICACAO", label: "Marketing e comunicação", hint: "Site, design, newsletter, eventos" },
  { key: "INTERNO_OUTRO", label: "Interno / outro", hint: "Qualquer outra tarefa que não seja um caso do pipe" },
];
export const ADMIN_TASK_CATEGORY_LABELS = Object.fromEntries(ADMIN_TASK_CATEGORIES.map((c) => [c.key, c.label])) as Record<AdminTaskCategoryKey, string>;

export const ADMIN_TASK_STATUSES: { key: AdminTaskStatusKey; label: string; color: string; open: boolean }[] = [
  { key: "TODO", label: "A fazer", color: "#6b6f66", open: true },
  { key: "IN_PROGRESS", label: "Em andamento", color: "#587f28", open: true },
  { key: "WAITING", label: "Aguardando terceiro", color: "#c99a3b", open: true },
  { key: "DONE", label: "Concluída", color: "#050505", open: false },
  { key: "CANCELED", label: "Cancelada", color: "#9a4b4b", open: false },
];
export const ADMIN_TASK_STATUS_LABELS = Object.fromEntries(ADMIN_TASK_STATUSES.map((s) => [s.key, s.label])) as Record<AdminTaskStatusKey, string>;
export const ADMIN_TASK_OPEN_STATUSES: AdminTaskStatusKey[] = ["TODO", "IN_PROGRESS", "WAITING"];

export const ADMIN_TASK_PRIORITIES: { key: AdminTaskPriorityKey; label: string }[] = [
  { key: "HIGH", label: "Alta" },
  { key: "MEDIUM", label: "Média" },
  { key: "LOW", label: "Baixa" },
];
export const ADMIN_TASK_PRIORITY_LABELS = Object.fromEntries(ADMIN_TASK_PRIORITIES.map((p) => [p.key, p.label])) as Record<AdminTaskPriorityKey, string>;

/**
 * Historical pipeline rows (legacy # from the spreadsheet) that are administrative work rather than opportunities.
 * They are duplicated into admin tasks first; the pipeline rows stay untouched until the team agrees to swap.
 */
export const LEGACY_ADMIN_TASKS: { legacyId: number; title: string; category: AdminTaskCategoryKey; counterpart?: string; note: string }[] = [
  { legacyId: 48, title: "Atualizar apresentação institucional para os players", category: "APRESENTACAO_MATERIAL", note: "Pedido do Maurício; inclui atualizar a TIR do Estruturado III" },
  { legacyId: 73, title: "Responder e-mail do Wlademir Aguiar agradecendo e pedindo a oportunidade", category: "RELACIONAMENTO_ORIGINADOR", counterpart: "Wlademir Aguiar", note: "Sem caso associado" },
  { legacyId: 127, title: "Reunião com o Banco do Brasil em Brasília", category: "RELACIONAMENTO_ORIGINADOR", counterpart: "Banco do Brasil", note: "Agenda institucional, sem crédito específico" },
  { legacyId: 137, title: "Relacionamento com Ricardo Jacomassi (TCP Partners): reunião e NDA", category: "RELACIONAMENTO_ORIGINADOR", counterpart: "TCP Partners", note: "Aguardando o envio de oportunidades" },
  { legacyId: 167, title: "Call de apresentação com Luciano (site de RI)", category: "RELACIONAMENTO_ORIGINADOR", counterpart: "Luciano", note: "Ficaram de enviar legal claims e precatórios" },
  { legacyId: 279, title: "Período de teste de sistema (comparar com QI Tech)", category: "FERRAMENTAS_FORNECEDORES", note: "Decidido não seguir; QI Tech oferece produtos melhores" },
  { legacyId: 284, title: "PAGOOS (tarefa interna)", category: "INTERNO_OUTRO", counterpart: "PAGOOS", note: "Sem histórico registrado; confirmar o que era" },
  { legacyId: 303, title: "Carta para o comercial antes do lançamento do Fundo IV", category: "APRESENTACAO_MATERIAL", note: "Revisar gráficos; soltar antes do lançamento" },
  { legacyId: 304, title: "Ajustes de marketing e design", category: "MARKETING_COMUNICACAO", note: "Marketing ajustou, aguardando design" },
  { legacyId: 688, title: "Análise de informações para consultoria à Península (Pessoa Física x Supricel)", category: "RELACIONAMENTO_ORIGINADOR", counterpart: "Península", note: "Não era aquisição; apoio ao parceiro" },
  { legacyId: 719, title: "Call com escritórios Souto Correa e Perez Llorca", category: "RELACIONAMENTO_ORIGINADOR", counterpart: "Souto Correa / Perez Llorca", note: "Reunião de relacionamento com advogados" },
  { legacyId: 767, title: "Relacionamento com Pantalica: cobrar oportunidades e NDA", category: "RELACIONAMENTO_ORIGINADOR", counterpart: "Pantalica", note: "Aguardando trazerem deal" },
  { legacyId: 793, title: "Triagem do lote de oportunidades enviado pela JGP FA", category: "RELACIONAMENTO_ORIGINADOR", counterpart: "JGP FA", note: "Lote genérico, não um caso" },
  { legacyId: 843, title: "Atualização de cadastro no Banco do Brasil", category: "FERRAMENTAS_FORNECEDORES", counterpart: "Banco do Brasil", note: "E-mail de atualização cadastral" },
];
