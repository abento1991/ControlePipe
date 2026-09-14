import { stripAccents } from "./text";

export type DeclineReasonKey = "SEM_FIT" | "GARANTIA_RISCO" | "PRECO_RETORNO" | "CREDITO_FRACO" | "PRAZO" | "TICKET" | "ATIVO_RESOLVIDO" | "PERDEMOS_CONCORRENTE" | "CONTRAPARTE_DESISTIU" | "NAO_PARTICIPAMOS" | "OUTRO";
export type DeclinedByKey = "LETO" | "CONTRAPARTE";

/** Closed list of decline reasons, in the order they are shown in dropdowns and charts. */
export const DECLINE_REASONS: { key: DeclineReasonKey; label: string; short: string; hint: string }[] = [
  { key: "SEM_FIT", label: "Sem fit com a tese SS", short: "Sem fit", hint: "Setor, estrutura ou produto fora da estratégia de Special Situations" },
  { key: "GARANTIA_RISCO", label: "Garantia / risco de crédito", short: "Garantia / risco", hint: "Garantia insuficiente, capacidade de pagamento ou risco elevado" },
  { key: "PRECO_RETORNO", label: "Preço / retorno", short: "Preço / retorno", hint: "Expectativa do vendedor alta, taxa ou TIR abaixo do mínimo, proposta recusada" },
  { key: "CREDITO_FRACO", label: "Crédito ou ação fraca / imatura", short: "Crédito fraco", hint: "Estágio inicial, sem trânsito em julgado, jurisprudência fraca, muitas cessões" },
  { key: "PRAZO", label: "Prazo de recebimento / fila do ente", short: "Prazo", hint: "Prazo acima do limite do fundo, fila de pagamento atrasada" },
  { key: "TICKET", label: "Ticket fora do padrão", short: "Ticket", hint: "Valor pequeno (ou grande) demais para o fundo" },
  { key: "ATIVO_RESOLVIDO", label: "Ativo já vendido, pago ou resolvido", short: "Já resolvido", hint: "Precatório pago, ativo vendido antes da proposta, acordo fechado" },
  { key: "PERDEMOS_CONCORRENTE", label: "Perdemos para outro fundo", short: "Concorrente", hint: "Seguiram com outra casa ou proposta maior" },
  { key: "CONTRAPARTE_DESISTIU", label: "Contraparte desistiu / sem retorno", short: "Desistiu", hint: "Cliente ou cedente desistiu, travou ou parou de responder" },
  { key: "NAO_PARTICIPAMOS", label: "Não enviamos proposta", short: "Sem proposta", hint: "Não participamos do processo ou perdemos o prazo" },
  { key: "OUTRO", label: "Outro motivo", short: "Outro", hint: "Descreva no campo de texto" },
];

export const DECLINE_REASON_LABELS: Record<DeclineReasonKey, string> = Object.fromEntries(DECLINE_REASONS.map((r) => [r.key, r.label])) as Record<DeclineReasonKey, string>;
export const DECLINE_REASON_SHORT: Record<DeclineReasonKey, string> = Object.fromEntries(DECLINE_REASONS.map((r) => [r.key, r.short])) as Record<DeclineReasonKey, string>;
export const DECLINED_BY_LABELS: Record<DeclinedByKey, string> = { LETO: "Leto declinou", CONTRAPARTE: "Contraparte recusou / desistiu" };

// Keyword rules used to classify the free-text reasons of the historical spreadsheet. Order = priority.
const RULES: [DeclineReasonKey, RegExp][] = [
  ["SEM_FIT", /\bfit\b|feat com|estrateg|tese|perfil|nao olhamos|nao e (um )?case|nao e ss|por ss\b|fora do escopo|nao fazemos|nao atuamos|nao investimos|nao trabalhamos|nao financiamos|foco|setor|segmento|interesse|nao faz(iam|ia)? sentido|sem sentido|nao (esta|estar) alinhad|credito administrativo|nao (estamos|vamos) (olhando|adquirindo|investindo|entrar|antecipar|seguir por)|encaminhad[oa] para|enviamos para|high yield|\bhy\b|case para fa|compatibilidade|lista de preferencia|equity|cota de|\bfip\b|fidc|mesmo grupo|parte relacionada|greenfield|obra|energia solar|frigorifico|curta para ss|nao auditada|capital solution|principio|estrutura da operacao|estrutura de capital|sale leaseback|nao gostamos|consultoria|contra (banco|o bb|bnb|instituicoes financeiras|correios)|credito contra|litigar contra|em face do bb|padroes de ss|situacao financeira do clube/],
  ["TICKET", /pequen|valor baixo|baixo valor|ticket|valores? (mto|muito) (baixo|pequeno)|abaixo do (minimo|ticket)|tamanho|mt grande|muito grande|\(r\$ ?\d+ ?bi\)|carteira grande|1,5bi|so compraria/],
  ["PRECO_RETORNO", /expectativa|retorno|\btir\b|taxa|preco|caro|desagio|pricing|cdi|di\+|custo|barat|valuation|valor alto|valor (mto )?alto|pagando|nao (foi )?aceit|rechac|acharam|proposta (negada|recusada|declinada)|negad[oa]|queriam|queria \d|desejam|pedido alto|bid mto abaixo|contraproposta|% do (vf|pu|valor)|nao possuem interesse em vender por|remuneracao limitada|margem|nao (e|eh) atrativa|dificil fechar acordo|valor sendo|valor e alto|valores muito altos|proposta maior|proposta acima|abaixo do (que )?esperad|menor do que o esperado|recusou|% upfront/],
  ["GARANTIA_RISCO", /garantia|penhora|capacidade de p(a)?g(amen)?to|caixa|colateral|collateral|alavanc|risco|arriscad|subordina|inadimpl|passivo|dificuldade|turnaround|recupera|falen|short em ativos|hipoteca|endividad|divida|sem ativo|sem sucessor|socio|sem ingerencia|visibilidade|foragido|nao acharam bens|imoveis|plano suspenso|sem exclusividade|quorum|contraparte sem|problemas financeiros|situacao financeira|pouco confiavel|condicionados a uma venda|nao contratados/],
  ["CREDITO_FRACO", /credito(s)? (ruim|ruins|complicado|mto complicado)|creditos? ruim|caso ruim|acao ruim|acoes (sao )?ruins|carteira (ruim|pulverizada)|nomes ruins|produto parece ruim|sem fundamento|jurisprudencia|chances? de perda|estagio|pouco maduro|inicial|preliminar|nao vira precatorio|transito em julgado|acordao|declaratoria|nao (tem|tinha|ha) credito|nenhum credito|nenhuma boa|poucos ativos|pouco ativo|dificil (recebimento|receber|executar|ser pago|de liquidacao|de seguirmos)|dificl de receber|complicad|enrolad|cess(ao|oes)|cessionari|\btda\b|sucumbencia|honorarios|liquidacao|valor de face estava errado|valor da causa|valor nao condiz|nao conseguimos abrir|nao conseguimos visualizar|sem licitacao|\bstj\b|\bstf\b|\bpec\b|pericia|empacado|se pagar|ambiental|diligencia|informacoes cruciais|duvidas sobre|prova|nao homologada|nao ha sinais de expedir|discussao judicial|lucros? cessantes|\biaa\b|devedor que querem/],
  ["PRAZO", /prazo|limite do fundo|demora|longo|\d+ anos|regime|fila|expedid|expediu|orcamento|bem atrasad|atrasado|vai demorar|tempo para recebimento|estado (de|nao)|munic|federal|estadual|rpv|ano eleitoral|timing/],
  ["ATIVO_RESOLVIDO", /seguiram com|seguiu com|vao seguir com|outro fundo|outros fundos|muitos fundos|concorr|ja (comprad|cedid|vendid|negociad|fechad|adquirid|desembolsad|foi pag|estava sendo pag|analisad|esvaziad)|vendid|venderam|vendeu|negociad|fechou com|fecharam com|fechar com outra|foi com|levou|ganhou|lumina|jive|competid|comprou|comprad|pago\b|pagos|recebeu, recebeu|conseguiram funding|entraram em acordo|acordo|nao levamos|perdeu o bid|leilao ja foi|pegaram divida|vao fazer o fundo|capitalizaram|precatorio pago|quem recebeu|contrataram|melhores produtos|colocamos uma proposta de|enviou proposta de/],
  ["CONTRAPARTE_DESISTIU", /desist|decidiram nao|decidiu nao|nao quis|nao quer|optou por nao|optaram por nao|nao vao mais|nao precisaram|nao vai buscar|aguard|stand-by|segurar|sem_devolutiva|sem resposta|sem devolutiva|nao (retornou|respondeu|responde|voltou|voltaram)|nao (obtivemos|tivemos|houve) (resposta|retorno|devolutiva|atualizacao|update)|nao enviaram|nao recebemos|nao mandaram|pouca informacao|sumiu|esfriou|nao evolu|sem evolucao|sem novidade|nao aprov|amadurecer|resolver problemas|nao contratou|pendente|precisa\b|orientacao do banco/],
  ["NAO_PARTICIPAMOS", /nao (mandamos|colocamos|enviamos) (proposta|bid|o bid)|sem bid|nao participamos|nao precificamos|nao conseguimos precificar|prazo ultrapassado|prazo era ate|nao houve proposta|nao vimos angulo/],
];
// Who walked away: explicit signals that the counterparty refused, gave up or sold elsewhere.
const COUNTERPARTY = /recus|nao (foi )?aceit|rechac|declinad[oa] pel[oa]|desist|vendid|venderam|vendeu|seguiram com|seguiu com|vao seguir com|sem_devolutiva|sem resposta|sem devolutiva|nao (retornou|respondeu|responde|voltou|voltaram)|nao (vao|vai) (mais )?(vender|seguir|negociar|buscar)|acharam (nossa )?proposta|queriam|queria \d|desejam|nao possuem interesse|contraproposta|entraram em acordo|conseguiram funding|capitalizaram|proposta maior|proposta (negada|recusada|declinada)|nao aprov|pegaram divida|fechou com|fecharam com|optou por nao|optaram por nao|nao precisaram|comprou|levou|ganhou|perdeu o bid|nao levamos|melhores produtos/;
// Blank-looking texts from the sheet ("11/09 -", "Vamos negar") carry no category.
const NO_INFO = /^\s*(\d{1,2}\/\d{1,2}\s*-?\s*)?$/;

/** Classifies a free-text decline reason (legacy feedback / close reason). Returns null when the text is empty or unclassifiable. */
export function inferDeclineReason(text: string | null | undefined): { reason: DeclineReasonKey; declinedBy: DeclinedByKey } | null {
  if (!text || NO_INFO.test(text)) return null;
  const n = stripAccents(text).toLowerCase().replace(/sem retorno|nao (obtivemos|tivemos|houve) retorno|aguardando retorno/g, "sem_devolutiva");
  const rule = RULES.find(([, rx]) => rx.test(n));
  if (!rule) return null;
  const reason = rule[0];
  const declinedBy: DeclinedByKey = reason === "CONTRAPARTE_DESISTIU" || reason === "PERDEMOS_CONCORRENTE" || (reason === "ATIVO_RESOLVIDO" && COUNTERPARTY.test(n)) || (reason === "PRECO_RETORNO" && COUNTERPARTY.test(n)) ? "CONTRAPARTE" : "LETO";
  return { reason, declinedBy };
}
