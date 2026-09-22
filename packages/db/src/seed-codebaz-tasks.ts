import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { and, eq, ilike } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "./client.js";
import { category, member, organization, profile, tag, task, taskTag, user } from "./schema.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

// Requisitante: empresa Codebaz (perfil público slug "codebaz").
// Resolução dinâmica — sem IDs hardcoded:
//   1. perfil slug "codebaz" → organizationId (via profile.organizationId)
//   2. fallback: organization slug "codebaz", ou nome ILIKE %codebaz%
// Utilizador requisitante: membro owner → admin → primeiro membro (override via CODEBAZ_REQUESTER_EMAIL).

const CODEBAZ_SLUG = "codebaz";

type TaskSeed = {
  title: string;
  description: string;
  categorySlug: string;
  contractType: "service" | "recurring" | "consulting" | "emergency" | "project" | "public_tender";
  priceMinMzn: number | null;
  priceMaxMzn: number | null;
  province: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  dueInDays: number;
  proposalDeadlineInDays: number;
  tagSlugs: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const TASKS: TaskSeed[] = [
  {
    title: "Website institucional com loja online",
    description:
      "A Codebaz precisa de um website institucional moderno com catálogo de serviços, blog e loja online com pagamentos M-Pesa e e-Mola. Inclui design responsivo, SEO técnico em português e formação da equipa para gestão de conteúdos.",
    categorySlug: "desenvolvimento-software",
    contractType: "project",
    priceMinMzn: 180000,
    priceMaxMzn: 350000,
    province: "Maputo Cidade",
    district: "KaMpfumo",
    address: "Av. Julius Nyerere, Maputo",
    latitude: -25.9655,
    longitude: 32.5832,
    dueInDays: 60,
    proposalDeadlineInDays: 14,
    tagSlugs: ["desenvolvimento-software", "orcamento-gratis", "garantia"],
  },
  {
    title: "Aplicação móvel de gestão de intervenções técnicas",
    description:
      "Desenvolvimento de aplicação móvel (Android e iOS) para as equipas de campo registarem intervenções, fotografias, assinaturas do cliente e sincronização offline. Backend com painel web de acompanhamento em tempo real.",
    categorySlug: "desenvolvimento-software",
    contractType: "project",
    priceMinMzn: 450000,
    priceMaxMzn: 800000,
    province: "Maputo Cidade",
    district: "KaMpfumo",
    address: "Av. Julius Nyerere, Maputo",
    latitude: -25.9691,
    longitude: 32.5858,
    dueInDays: 90,
    proposalDeadlineInDays: 14,
    tagSlugs: ["desenvolvimento-software", "certificado"],
  },
  {
    title: "Rede estruturada e fibra no escritório da Matola",
    description:
      "Instalação de rede estruturada Cat6 com 48 pontos, bastidor, switch gerido, access points e ligação de fibra com redundância. Inclui certificação dos pontos, diagrama da rede e garantia mínima de 12 meses.",
    categorySlug: "redes-telecom",
    contractType: "service",
    priceMinMzn: 120000,
    priceMaxMzn: 220000,
    province: "Maputo Província",
    district: "Matola",
    address: "Parque industrial da Matola",
    latitude: -25.9622,
    longitude: 32.4581,
    dueInDays: 30,
    proposalDeadlineInDays: 10,
    tagSlugs: ["redes-informaticas", "fibra-optica", "garantia"],
  },
  {
    title: "Auditoria de cibersegurança e teste de intrusão",
    description:
      "Auditoria completa à infraestrutura cloud e aos sistemas internos: análise de vulnerabilidades, teste de intrusão externo, revisão de políticas de acesso e relatório executivo com plano de remediação priorizado.",
    categorySlug: "suporte-informatico",
    contractType: "consulting",
    priceMinMzn: 150000,
    priceMaxMzn: 300000,
    province: "Maputo Cidade",
    district: "KaMpfumo",
    address: "Av. Julius Nyerere, Maputo",
    latitude: -25.9638,
    longitude: 32.5819,
    dueInDays: 45,
    proposalDeadlineInDays: 10,
    tagSlugs: ["ciberseguranca", "certificado"],
  },
  {
    title: "Suporte informático recorrente (helpdesk mensal)",
    description:
      "Contrato mensal de suporte informático para 35 colaboradores: helpdesk remoto e presencial, manutenção preventiva de equipamentos, gestão de backups e monitorização de servidores. SLA com resposta em menos de 4 horas úteis.",
    categorySlug: "suporte-informatico",
    contractType: "recurring",
    priceMinMzn: 45000,
    priceMaxMzn: 75000,
    province: "Maputo Cidade",
    district: "KaMpfumo",
    address: "Av. Julius Nyerere, Maputo",
    latitude: -25.9662,
    longitude: 32.5844,
    dueInDays: 365,
    proposalDeadlineInDays: 14,
    tagSlugs: ["suporte-tecnico", "disponivel-fds"],
  },
  {
    title: "Sistema solar de 10 kVA para o escritório",
    description:
      "Fornecimento e instalação de sistema solar híbrido de 10 kVA com baterias de lítio e autonomia mínima de 8 horas para o escritório. Inclui projecto eléctrico, homologação junto à EDM e monitorização remota do consumo.",
    categorySlug: "energia-solar",
    contractType: "project",
    priceMinMzn: 650000,
    priceMaxMzn: 950000,
    province: "Maputo Cidade",
    district: "KaMaxakeni",
    address: "Bairro da Polana, Maputo",
    latitude: -25.9436,
    longitude: 32.5928,
    dueInDays: 45,
    proposalDeadlineInDays: 14,
    tagSlugs: ["tag-energia-solar", "paineis-solares", "inversores", "garantia"],
  },
  {
    title: "Gerador de emergência com quadro de transferência",
    description:
      "Instalação de gerador de 60 kVA com quadro de transferência automática (ATS) para o data center interno, incluindo base antivibratória, insonorização e contrato de manutenção preventiva trimestral no primeiro ano.",
    categorySlug: "geradores",
    contractType: "service",
    priceMinMzn: 480000,
    priceMaxMzn: 700000,
    province: "Maputo Província",
    district: "Matola",
    address: "Parque industrial da Matola",
    latitude: -25.9641,
    longitude: 32.4597,
    dueInDays: 30,
    proposalDeadlineInDays: 7,
    tagSlugs: ["manutencao-geradores", "urgencia", "garantia"],
  },
  {
    title: "Furo de água e bomba submersível na Beira",
    description:
      "Abertura de furo de água com cerca de 80 metros, instalação de bomba submersível solar, reservatório de 5 000 litros e rede de distribuição para o novo armazém da Beira. Inclui análise laboratorial da água.",
    categorySlug: "furos-agua",
    contractType: "project",
    priceMinMzn: 220000,
    priceMaxMzn: 380000,
    province: "Sofala",
    district: "Beira",
    address: "Zona industrial do Munhava, Beira",
    latitude: -19.8436,
    longitude: 34.8549,
    dueInDays: 45,
    proposalDeadlineInDays: 14,
    tagSlugs: ["furos-agua", "bombas-agua", "garantia"],
  },
  {
    title: "Remodelação e pintura do escritório central",
    description:
      "Remodelação do escritório com 400 m²: pintura interior, tectos falsos, divisórias em gesso, pavimentação vinílica e iluminação LED. Obra em horário pós-laboral para não interromper a operação diária.",
    categorySlug: "pintura",
    contractType: "project",
    priceMinMzn: 350000,
    priceMaxMzn: 600000,
    province: "Maputo Cidade",
    district: "KaMpfumo",
    address: "Av. Julius Nyerere, Maputo",
    latitude: -25.9671,
    longitude: 32.5825,
    dueInDays: 60,
    proposalDeadlineInDays: 10,
    tagSlugs: ["pintura-decorativa", "estuque", "manutencao-predial"],
  },
  {
    title: "Climatização AVAC das salas de servidores",
    description:
      "Instalação de dois aparelhos de ar condicionado de precisão com redundância para a sala de servidores, incluindo drenagem, alimentação eléctrica dedicada e sensores de temperatura com alertas por SMS e email.",
    categorySlug: "avac",
    contractType: "service",
    priceMinMzn: 90000,
    priceMaxMzn: 160000,
    province: "Maputo Cidade",
    district: "KaMpfumo",
    address: "Av. Julius Nyerere, Maputo",
    latitude: -25.9647,
    longitude: 32.5839,
    dueInDays: 21,
    proposalDeadlineInDays: 7,
    tagSlugs: ["ar-condicionado", "tag-avac", "urgencia"],
  },
  {
    title: "Rebranding, logótipo e gestão de redes sociais",
    description:
      "Actualização da identidade visual da Codebaz: logótipo, manual de marca, templates para propostas e gestão mensal das redes sociais (LinkedIn, Facebook e Instagram) com 12 publicações, relatórios de desempenho e campanhas pagas.",
    categorySlug: "marketing-digital",
    contractType: "recurring",
    priceMinMzn: 35000,
    priceMaxMzn: 60000,
    province: "Maputo Cidade",
    district: "KaMpfumo",
    address: "Av. Julius Nyerere, Maputo",
    latitude: -25.9659,
    longitude: 32.5841,
    dueInDays: 90,
    proposalDeadlineInDays: 10,
    tagSlugs: ["branding", "gestao-redes-sociais", "marketing-digital"],
  },
  {
    title: "Catering e som para evento de lançamento",
    description:
      "Serviço de catering para 150 convidados no evento de lançamento de um produto: welcome drinks, buffet, serviço de mesa, som, iluminação e palco. Evento nocturno numa tenda na Marginal de Maputo.",
    categorySlug: "catering",
    contractType: "service",
    priceMinMzn: 180000,
    priceMaxMzn: 280000,
    province: "Maputo Cidade",
    district: "KaTembe",
    address: "Av. Marginal, Maputo",
    latitude: -25.9531,
    longitude: 32.6093,
    dueInDays: 30,
    proposalDeadlineInDays: 10,
    tagSlugs: ["catering", "som-luz", "organizacao-eventos"],
  },
  {
    title: "Contabilidade e fiscalidade trimestral",
    description:
      "Prestação de serviços de contabilidade organizada e fiscalidade: lançamentos mensais, reconciliações bancárias, declarações de IVA e IRPS/IRPC, mapa de remunerações e apoio em inspecções da Autoridade Tributária.",
    categorySlug: "fiscalidade",
    contractType: "recurring",
    priceMinMzn: 25000,
    priceMaxMzn: 45000,
    province: "Maputo Cidade",
    district: "KaMpfumo",
    address: "Av. Julius Nyerere, Maputo",
    latitude: -25.9666,
    longitude: 32.5822,
    dueInDays: 120,
    proposalDeadlineInDays: 14,
    tagSlugs: ["contabilidade", "tag-fiscalidade", "certificado"],
  },
  {
    title: "Transporte de equipamento Maputo–Nampula",
    description:
      "Transporte de equipamento informático e mobiliário de escritório de Maputo para a nova filial de Nampula: cerca de 20 m³ de carga sensível com embalagem protectora, seguro de transporte e entrega com descarga no destino.",
    categorySlug: "transporte-carga",
    contractType: "service",
    priceMinMzn: 95000,
    priceMaxMzn: 150000,
    province: "Nampula",
    district: "Nampula",
    address: "Av. Eduardo Mondlane, Nampula",
    latitude: -15.1165,
    longitude: 39.2666,
    dueInDays: 21,
    proposalDeadlineInDays: 7,
    tagSlugs: ["transporte-carga", "distribuicao", "mudancas"],
  },
];

function log(msg: string) {
  console.log(`[seed-codebaz-tasks] ${msg}`);
}

async function resolveOrganizationId(): Promise<string> {
  // 1. Via perfil público da Codebaz
  const [prof] = await db.select().from(profile).where(eq(profile.slug, CODEBAZ_SLUG)).limit(1);
  if (prof?.organizationId) {
    const [org] = await db.select().from(organization).where(eq(organization.id, prof.organizationId)).limit(1);
    if (org) {
      log(`Organização resolvida via perfil: "${org.name}" (id=${org.id})`);
      return org.id;
    }
  }
  // 2. Fallback: slug directo na organização
  const [bySlug] = await db.select().from(organization).where(eq(organization.slug, CODEBAZ_SLUG)).limit(1);
  if (bySlug) {
    log(`Organização resolvida via slug: "${bySlug.name}" (id=${bySlug.id})`);
    return bySlug.id;
  }
  // 3. Fallback: nome aproximado
  const [byName] = await db.select().from(organization).where(ilike(organization.name, "%codebaz%")).limit(1);
  if (byName) {
    log(`Organização resolvida via nome: "${byName.name}" (id=${byName.id})`);
    return byName.id;
  }
  throw new Error('Organização Codebaz não encontrada (perfil "codebaz", slug ou nome).');
}

async function resolveRequesterUserId(organizationId: string): Promise<string> {
  const overrideEmail = process.env.CODEBAZ_REQUESTER_EMAIL;
  if (overrideEmail) {
    const [u] = await db.select().from(user).where(eq(user.email, overrideEmail)).limit(1);
    if (!u) throw new Error(`CODEBAZ_REQUESTER_EMAIL="${overrideEmail}" não existe na tabela user.`);
    log(`Requisitante via CODEBAZ_REQUESTER_EMAIL: ${u.name} (${u.email})`);
    return u.id;
  }
  // owner → admin → membro mais antigo
  const members = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, organizationId));
  if (members.length === 0) throw new Error("Organização Codebaz sem membros — impossível atribuir requesterUserId.");
  const rank: Record<string, number> = { owner: 0, admin: 1, editor: 2, member: 3 };
  const sorted = [...members].sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9));
  const chosen = sorted[0]!;
  const [u] = await db.select().from(user).where(eq(user.id, chosen.userId)).limit(1);
  log(`Requisitante: ${u?.name ?? chosen.userId} (papel=${chosen.role})`);
  return chosen.userId;
}

async function main() {
  const organizationId = await resolveOrganizationId();
  const requesterUserId = await resolveRequesterUserId(organizationId);

  const allCategories = await db.select().from(category);
  const categoryBySlug = new Map(allCategories.map((c) => [c.slug, c.id]));
  const allTags = await db.select().from(tag);
  const tagBySlug = new Map(allTags.map((t) => [t.slug, t.id]));

  const now = Date.now();
  let created = 0;
  let skipped = 0;

  for (const [index, t] of TASKS.entries()) {
    const categoryId = categoryBySlug.get(t.categorySlug) ?? null;
    if (!categoryId) log(`AVISO: categoria "${t.categorySlug}" inexistente — tarefa "${t.title}" sem categoria.`);

    const [existing] = await db
      .select({ id: task.id })
      .from(task)
      .where(and(eq(task.title, t.title), eq(task.requesterOrganizationId, organizationId)))
      .limit(1);

    if (existing) {
      log(`Já existe: "${t.title}" (id=${existing.id}) — a saltar.`);
      skipped++;
      continue;
    }

    const [row] = await db
      .insert(task)
      .values({
        id: crypto.randomUUID(),
        requesterUserId,
        requesterOrganizationId: organizationId,
        categoryId,
        title: t.title,
        description: t.description,
        priceMinMzn: t.priceMinMzn,
        priceMaxMzn: t.priceMaxMzn,
        province: t.province,
        district: t.district,
        address: t.address,
        latitude: t.latitude,
        longitude: t.longitude,
        dueAt: new Date(now + t.dueInDays * DAY_MS),
        proposalDeadlineAt: new Date(now + t.proposalDeadlineInDays * DAY_MS),
        contractType: t.contractType,
        attachments: [],
        status: "open",
        // createdAt escalonado (1 min entre tarefas) para listagem cronológica legível
        createdAt: new Date(now - (TASKS.length - index) * 60_000),
        updatedAt: new Date(now - (TASKS.length - index) * 60_000),
      })
      .returning({ id: task.id });

    if (!row) throw new Error(`Falha ao criar tarefa "${t.title}".`);

    // Sincroniza coluna geography (PostGIS) — mesmo padrão do tasks.repository
    await db.execute(
      sql`UPDATE ${task} SET geom = ST_SetSRID(ST_MakePoint(${t.longitude}, ${t.latitude}), 4326)::geography WHERE ${task.id} = ${row.id}`,
    );

    // Tags (só as que existirem no catálogo)
    const tagIds = [...new Set(t.tagSlugs.map((s) => tagBySlug.get(s)).filter((v): v is string => Boolean(v)))];
    const missing = t.tagSlugs.filter((s) => !tagBySlug.has(s));
    if (missing.length > 0) log(`AVISO: tags inexistentes ignoradas em "${t.title}": ${missing.join(", ")}`);
    for (const tagId of tagIds) {
      await db.insert(taskTag).values({ taskId: row.id, tagId }).onConflictDoNothing();
    }

    log(`Criada: "${t.title}" (id=${row.id}, categoria=${t.categorySlug}, ${t.province})`);
    created++;
  }

  log(`\nResumo: ${created} tarefas criadas, ${skipped} já existentes (${TASKS.length} no catálogo do script).`);
  log("Concluído.");
}

// @ts-ignore - Bunism
if ((import.meta as unknown as { main?: boolean }).main) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
