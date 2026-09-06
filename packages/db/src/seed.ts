import { db } from "./client.js";
import { category, badge, tag } from "./schema.js";

// Taxonomia Workdeal — 8 domínios L1 + 42 subcategorias L2
// PT-MZ, slugs estáveis, serve directório e onboarding. Preserva slugs antigos para retrocompatibilidade.
const categories = [
  // L1 - Construção e Obras
  { id: "cat-construcao", slug: "construcao", name: "Construção e Obras", description: "Obras civis, remodelações e manutenção predial" },
  { id: "cat-construcao-eletrica", slug: "electrica", name: "Eléctrica", description: "Instalações, manutenção e certificação eléctrica", parentId: "cat-construcao" },
  { id: "cat-construcao-canalizacao", slug: "canalizacao", name: "Canalização", description: "Água, esgotos, canalização e fossas", parentId: "cat-construcao" },
  { id: "cat-construcao-carpintaria", slug: "carpintaria", name: "Carpintaria", description: "Móveis, portas, tectos e acabamentos em madeira", parentId: "cat-construcao" },
  { id: "cat-construcao-serralharia", slug: "serralharia", name: "Serralharia e Soldadura", description: "Portões, grades, estruturas metálicas", parentId: "cat-construcao" },
  { id: "cat-construcao-pintura", slug: "pintura", name: "Pintura e Acabamentos", description: "Pintura interior/exterior, estuque e revestimentos", parentId: "cat-construcao" },
  { id: "cat-construcao-alvenaria", slug: "alvenaria", name: "Alvenaria e Pavimentos", description: "Alvenaria, pavimentos, azulejos e ladrilhos", parentId: "cat-construcao" },
  { id: "cat-construcao-avac", slug: "avac", name: "Frio e Climatização (AVAC)", description: "Ar condicionado, frio industrial e ventilação", parentId: "cat-construcao" },
  // L1 - Energia e Água
  { id: "cat-energia", slug: "energia-agua", name: "Energia e Água", description: "Energia eléctrica, solar, água e saneamento" },
  { id: "cat-energia-solar", slug: "energia-solar", name: "Energia Solar", description: "Painéis, inversores, instalação e manutenção solar", parentId: "cat-energia" },
  { id: "cat-energia-grupo", slug: "geradores", name: "Geradores e UPS", description: "Grupos geradores, UPS e sistemas de backup", parentId: "cat-energia" },
  { id: "cat-energia-furo", slug: "furos-agua", name: "Furos e Bombas de Água", description: "Captação, furos, bombas e reservatórios", parentId: "cat-energia" },
  // L1 - Indústria e Manufatura
  { id: "cat-industria", slug: "industria", name: "Indústria e Manufatura", description: "Produção, montagem, manutenção industrial" },
  { id: "cat-industria-metal", slug: "metalurgia", name: "Metalurgia e Metalomecânica", description: "Tornearia, fresagem, metalomecânica", parentId: "cat-industria" },
  // L1 - Agronegócio
  { id: "cat-agro", slug: "agronegocio", name: "Agronegócio", description: "Agricultura, pecuária, agro-processamento e insumos" },
  { id: "cat-agro-insumos", slug: "insumos-agricolas", name: "Insumos e Equipamentos Agrícolas", description: "Sementes, fertilizantes, tractores e alfaias", parentId: "cat-agro" },
  // L1 - Transporte e Logística
  { id: "cat-transporte", slug: "transporte", name: "Transporte e Logística", description: "Transporte de bens e pessoas, mudanças e estiva" },
  { id: "cat-transporte-carga", slug: "transporte-carga", name: "Transporte de Carga", description: "Camiões, contentores e distribuição", parentId: "cat-transporte" },
  { id: "cat-transporte-passageiros", slug: "transporte-passageiros", name: "Transporte de Passageiros", description: "Machimbombo, transfers e rent-a-car", parentId: "cat-transporte" },
  // L1 - Tecnologia e Telecom
  { id: "cat-ti", slug: "tecnologia", name: "Tecnologia e Informática", description: "Desenvolvimento, redes, suporte e telecom" },
  { id: "cat-ti-dev", slug: "desenvolvimento-software", name: "Desenvolvimento de Software", parentId: "cat-ti" },
  { id: "cat-ti-redes", slug: "redes-telecom", name: "Redes e Telecomunicações", description: "Fibra, VSAT, PABX e infraestrutura", parentId: "cat-ti" },
  { id: "cat-ti-suporte", slug: "suporte-informatico", name: "Suporte Informático", description: "Helpdesk, manutenção e cibersegurança", parentId: "cat-ti" },
  // L1 - Serviços Empresariais
  { id: "cat-contabilidade", slug: "contabilidade", name: "Contabilidade e Finanças", description: "Contabilidade, fiscalidade, auditoria e Payroll" },
  { id: "cat-contabilidade-fiscal", slug: "fiscalidade", name: "Fiscalidade e IVA", description: "Declarações, IVA e obrigações AT", parentId: "cat-contabilidade" },
  { id: "cat-juridico", slug: "juridico", name: "Jurídico", description: "Advocacia, consultoria jurídica e notariado" },
  { id: "cat-rh", slug: "recursos-humanos", name: "Recursos Humanos", description: "Recrutamento, formação e gestão de pessoal", parentId: "cat-contabilidade" },
  { id: "cat-seguranca", slug: "seguranca", name: "Segurança Privada", description: "Vigilância, alarmes, CCTV e segurança electrónica", parentId: "cat-contabilidade" },
  // L1 - Marketing, Design e Eventos
  { id: "cat-marketing", slug: "marketing", name: "Marketing e Design", description: "Design gráfico, marketing digital e branding" },
  { id: "cat-marketing-digital", slug: "marketing-digital", name: "Marketing Digital", description: "Gestão de redes, tráfego pago e SEO", parentId: "cat-marketing" },
  { id: "cat-eventos", slug: "eventos", name: "Eventos", description: "Organização, catering, som, luz e decoração" },
  { id: "cat-eventos-catering", slug: "catering", name: "Catering", description: "Serviço de catering e restauração", parentId: "cat-eventos" },
  { id: "cat-eventos-som-luz", slug: "som-luz", name: "Som e Iluminação", description: "Palco, som, luz e audiovisual", parentId: "cat-eventos" },
  // L1 - Limpeza e Higiene
  { id: "cat-limpeza", slug: "limpeza", name: "Limpeza e Higiene", description: "Limpeza residencial, empresarial e industrial" },
  { id: "cat-limpeza-industrial", slug: "limpeza-industrial", name: "Limpeza Industrial", description: "Higienização técnica e gestão de resíduos", parentId: "cat-limpeza" },
  // L1 - Saúde e Bem-estar
  { id: "cat-saude", slug: "saude", name: "Saúde e Bem-estar", description: "Serviços de saúde, clínicas e bem-estar" },
  { id: "cat-saude-clinica", slug: "clinica-medica", name: "Clínica Médica", description: "Consultas, análises e cuidados médicos", parentId: "cat-saude" },
  // L1 - Educação e Formação
  { id: "cat-educacao", slug: "educacao", name: "Educação e Formação", description: "Ensino, formação profissional e explicações" },
  { id: "cat-educacao-tecnica", slug: "formacao-tecnica", name: "Formação Técnica", description: "Cursos técnicos, certificações e workshops", parentId: "cat-educacao" },
  // L1 extra for completeness
  { id: "cat-automovel", slug: "automovel", name: "Automóvel e Máquinas", description: "Mecânica auto, bate-chapa, diagnóstico e aluguer de máquinas", parentId: null as unknown as string },
  { id: "cat-agricola-mecanizacao", slug: "mecanizacao", name: "Mecanização Agrícola", description: "Aluguer e manutenção de tractores e alfaias", parentId: "cat-agro" },
];

const badges = [
  { id: "badge-verified", slug: "verified", name: "Verificado", description: "Identidade/NUIT verificada — empresa com todos os documentos de registo legal (1º grau)", type: "trust" as const, origin: "manual" as const, criteria: "Documento NUIT/BI + alvará validados manualmente (SLA 48h)" },
  { id: "badge-in-legalization", slug: "in-legalization", name: "Em Processo de Legalização", description: "Empresa em processo de legalização junto da conservatória / IAGE (2º grau)", type: "trust" as const, origin: "manual" as const, criteria: "Documentos de legalização em curso validados manualmente (SLA 48h)" },
  { id: "badge-profile-complete", slug: "profile-complete", name: "Perfil Completo", description: "Todos os campos essenciais + portfólio ≥1 item", type: "quality" as const, origin: "automatic" as const, criteria: "name, description, category ≥1, logo/cover, contacto, portfólio ≥1" },
  { id: "badge-quick-response", slug: "quick-response", name: "Resposta Rápida", description: "Tempo médio de resposta <2h nos últimos 30 dias", type: "activity" as const, origin: "automatic" as const, criteria: "p50 resposta <2h, mínimo 5 interacções em 30d" },
  { id: "badge-highly-rated", slug: "highly-rated", name: "Bem Avaliado", description: "Média ≥4.3 com pelo menos 5 avaliações", type: "reputation" as const, origin: "automatic" as const, criteria: "avg rating ≥4.3, count ≥5" },
  { id: "badge-specialist", slug: "specialist", name: "Especialista", description: "Certificação validada numa categoria", type: "specialization" as const, origin: "manual" as const, criteria: "Certificado/formação validado pela equipa" },
  { id: "badge-active-member", slug: "active-member", name: "Membro Activo", description: "Rede activa com conexões e interacções", type: "network" as const, origin: "automatic" as const, criteria: "≥10 conexões ou ≥20 interacções em 90d" },
  { id: "badge-completed-tasks", slug: "completed-tasks", name: "Tarefas Concluídas", description: "Histórico de tarefas concluídas com sucesso", type: "performance" as const, origin: "automatic" as const, criteria: "≥5 tarefas com avaliação ≥4" },
  { id: "badge-pro", slug: "pro", name: "Pro", description: "Assinante plano premium", type: "commercial" as const, origin: "paid" as const, criteria: "Subscrição activa" },
  { id: "badge-msme", slug: "msme", name: "MPME", description: "Micro, Pequena ou Média Empresa classificada pelo IPEME", type: "informational" as const, origin: "automatic" as const, criteria: "Porte micro/pequena/média por nº trabalhadores" },
  { id: "badge-large-company", slug: "large-company", name: "Grande Empresa", description: "Empresa de grande dimensão (>100 trabalhadores)", type: "informational" as const, origin: "automatic" as const, criteria: "Porte grande" },
];

const tags = [
  // --- Atributos de serviço (como a empresa atende) ---
  { id: "tag-orcamento-gratis", slug: "orcamento-gratis", name: "Orçamento Grátis", category: "servico" },
  { id: "tag-disponivel-fds", slug: "disponivel-fds", name: "Disponível Fim-de-Semana", category: "servico" },
  { id: "tag-24h", slug: "24h", name: "Atendimento 24h", category: "servico" },
  { id: "tag-deslocacao-incluida", slug: "deslocacao-incluida", name: "Deslocação Incluída", category: "servico" },
  { id: "tag-garantia", slug: "garantia", name: "Garantia", category: "servico" },
  { id: "tag-certificado", slug: "certificado", name: "Certificado", category: "servico" },
  { id: "tag-urgencia", slug: "urgencia", name: "Urgência", category: "servico" },
  { id: "tag-sustentavel", slug: "sustentavel", name: "Sustentável", category: "servico" },

  // --- Construção e Obras ---
  { id: "tag-estruturas-metalicas", slug: "estruturas-metalicas", name: "Estruturas Metálicas", category: "construcao" },
  { id: "tag-tectos-falsos", slug: "tectos-falsos", name: "Tectos Falsos", category: "construcao" },
  { id: "tag-estuque", slug: "estuque", name: "Estuque", category: "construcao" },
  { id: "tag-impermeabilizacao", slug: "impermeabilizacao", name: "Impermeabilização", category: "construcao" },
  { id: "tag-manutencao-predial", slug: "manutencao-predial", name: "Manutenção Predial", category: "construcao" },
  { id: "tag-pintura-decorativa", slug: "pintura-decorativa", name: "Pintura Decorativa", category: "construcao" },

  // --- Energia e Água ---
  { id: "tag-energia-solar", slug: "tag-energia-solar", name: "Energia Solar", category: "energia" },
  { id: "tag-paineis-solares", slug: "paineis-solares", name: "Painéis Solares", category: "energia" },
  { id: "tag-inversores", slug: "inversores", name: "Inversores e Baterias", category: "energia" },
  { id: "tag-manutencao-geradores", slug: "manutencao-geradores", name: "Manutenção de Geradores", category: "energia" },
  { id: "tag-bombas-agua", slug: "bombas-agua", name: "Bombas de Água", category: "energia" },
  { id: "tag-furos-agua", slug: "furos-agua", name: "Furos de Água", category: "energia" },

  // --- Frio e Climatização ---
  { id: "tag-avac", slug: "tag-avac", name: "AVAC", category: "avac" },
  { id: "tag-ar-condicionado", slug: "ar-condicionado", name: "Ar Condicionado", category: "avac" },
  { id: "tag-frio-industrial", slug: "frio-industrial", name: "Frio Industrial", category: "avac" },
  { id: "tag-ventilacao", slug: "ventilacao", name: "Ventilação", category: "avac" },

  // --- Tecnologia e Telecom ---
  { id: "tag-desenvolvimento-software", slug: "desenvolvimento-software", name: "Desenvolvimento de Software", category: "tecnologia" },
  { id: "tag-redes-informaticas", slug: "redes-informaticas", name: "Redes Informáticas", category: "tecnologia" },
  { id: "tag-ciberseguranca", slug: "ciberseguranca", name: "Cibersegurança", category: "tecnologia" },
  { id: "tag-suporte-tecnico", slug: "suporte-tecnico", name: "Suporte Técnico", category: "tecnologia" },
  { id: "tag-fibra-optica", slug: "fibra-optica", name: "Fibra Óptica", category: "tecnologia" },
  { id: "tag-cctv", slug: "cctv", name: "CCTV e Videovigilância", category: "tecnologia" },

  // --- Marketing, Design e Eventos ---
  { id: "tag-design-grafico", slug: "design-grafico", name: "Design Gráfico", category: "marketing" },
  { id: "tag-marketing-digital", slug: "marketing-digital", name: "Marketing Digital", category: "marketing" },
  { id: "tag-gestao-redes-sociais", slug: "gestao-redes-sociais", name: "Gestão de Redes Sociais", category: "marketing" },
  { id: "tag-branding", slug: "branding", name: "Branding e Identidade", category: "marketing" },
  { id: "tag-fotografia-video", slug: "fotografia-video", name: "Fotografia e Vídeo", category: "marketing" },
  { id: "tag-organizacao-eventos", slug: "organizacao-eventos", name: "Organização de Eventos", category: "eventos" },
  { id: "tag-catering", slug: "catering", name: "Catering", category: "eventos" },
  { id: "tag-som-luz", slug: "som-luz", name: "Som e Iluminação", category: "eventos" },
  { id: "tag-decoracao", slug: "decoracao", name: "Decoração", category: "eventos" },
  { id: "tag-aluguer-material", slug: "aluguer-material", name: "Aluguer de Material", category: "eventos" },

  // --- Transporte e Logística ---
  { id: "tag-transporte-carga", slug: "transporte-carga", name: "Transporte de Carga", category: "transporte" },
  { id: "tag-mudancas", slug: "mudancas", name: "Mudanças", category: "transporte" },
  { id: "tag-distribuicao", slug: "distribuicao", name: "Distribuição", category: "transporte" },
  { id: "tag-estiva", slug: "estiva", name: "Estiva e Descarregamento", category: "transporte" },

  // --- Limpeza e Higiene ---
  { id: "tag-limpeza-empresarial", slug: "limpeza-empresarial", name: "Limpeza Empresarial", category: "limpeza" },
  { id: "tag-limpeza-industrial", slug: "tag-limpeza-industrial", name: "Limpeza Industrial", category: "limpeza" },
  { id: "tag-higiene-saneamento", slug: "higiene-saneamento", name: "Higiene e Saneamento", category: "limpeza" },
  { id: "tag-controlo-pragas", slug: "controlo-pragas", name: "Controlo de Pragas", category: "limpeza" },

  // --- Segurança ---
  { id: "tag-vigilancia", slug: "vigilancia", name: "Vigilância Privada", category: "seguranca" },
  { id: "tag-alarmes", slug: "alarmes", name: "Alarmes e Sensores", category: "seguranca" },
  { id: "tag-seguranca-eletronica", slug: "seguranca-eletronica", name: "Segurança Electrónica", category: "seguranca" },

  // --- Agronegócio ---
  { id: "tag-agro-processamento", slug: "agro-processamento", name: "Agro-processamento", category: "agro" },
  { id: "tag-irrigacao", slug: "irrigacao", name: "Sistemas de Irrigação", category: "agro" },
  { id: "tag-mecanizacao-agricola", slug: "mecanizacao-agricola", name: "Mecanização Agrícola", category: "agro" },
  { id: "tag-insumos-agricolas", slug: "insumos-agricolas", name: "Insumos Agrícolas", category: "agro" },

  // --- Serviços Empresariais ---
  { id: "tag-contabilidade", slug: "contabilidade", name: "Contabilidade", category: "empresariais" },
  { id: "tag-fiscalidade", slug: "tag-fiscalidade", name: "Fiscalidade e IVA", category: "empresariais" },
  { id: "tag-recursos-humanos", slug: "recursos-humanos", name: "Recursos Humanos", category: "empresariais" },
  { id: "tag-recrutamento", slug: "recrutamento", name: "Recrutamento e Selecção", category: "empresariais" },
  { id: "tag-formacao", slug: "tag-formacao", name: "Formação Profissional", category: "empresariais" },
  { id: "tag-juridico", slug: "tag-juridico", name: "Consultoria Jurídica", category: "empresariais" },

  // --- Saúde ---
  { id: "tag-cuidados-clinicos", slug: "cuidados-clinicos", name: "Cuidados Clínicos", category: "saude" },
  { id: "tag-analises-clinicas", slug: "analises-clinicas", name: "Análises Clínicas", category: "saude" },

  // --- Automóvel e Máquinas ---
  { id: "tag-mecanica-auto", slug: "mecanica-auto", name: "Mecânica Automóvel", category: "automovel" },
  { id: "tag-eletricidade-auto", slug: "eletricidade-auto", name: "Electricidade Automóvel", category: "automovel" },
  { id: "tag-bate-chapa-pintura", slug: "bate-chapa-pintura", name: "Bate-Chapa e Pintura Auto", category: "automovel" },
];

export async function seed() {
  console.log("Seeding categories...");
  for (const c of categories) {
    await db
      .insert(category)
      .values({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description ?? null,
        parentId: (c as { parentId?: string }).parentId ?? null,
        isActive: true,
      })
      .onConflictDoNothing();
  }
  console.log(`  ${categories.length} categories seeded`);

  console.log("Seeding badges...");
  for (const b of badges) {
    await db
      .insert(badge)
      .values({
        id: b.id,
        slug: b.slug,
        name: b.name,
        description: b.description,
        type: b.type,
        origin: b.origin,
        criteria: b.criteria,
      })
      .onConflictDoNothing();
  }
  console.log(`  ${badges.length} badges seeded`);

  console.log("Seeding tags...");
  for (const t of tags) {
    await db
      .insert(tag)
      .values({ id: t.id, slug: t.slug, name: t.name, category: t.category ?? null })
      .onConflictDoNothing();
  }
  console.log(`  ${tags.length} tags seeded`);
  console.log("Seed concluído.");
}

// @ts-ignore - Bunism, tsc nodenext não tem `main` em ImportMeta
if ((import.meta as unknown as { main?: boolean }).main) {
  seed()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
