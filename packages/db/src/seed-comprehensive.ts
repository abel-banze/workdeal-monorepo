import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
import { category } from "./schema.js";
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: false });
dotenv.config({ path: "../../.env", override: false });
dotenv.config({ path: "../../.env.local", override: false });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL é obrigatória — defina no .env ou passe na linha de comando (ex: DATABASE_URL=postgres://... pnpm db:seed:comprehensive)");
}
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

// Taxonomia abrangente Workdeal — 20 L1 + ~130 L2
// PT-MZ, slugs estáveis, onConflictDoUpdate para actualizar sem quebrar retrocompat
const categories = [
  // L1 — Construção e Obras
  { id: "cat-construcao", slug: "construcao", name: "Construção e Obras", description: "Obras civis, remodelações e manutenção predial" },
  { id: "cat-construcao-eletrica", slug: "electrica", name: "Eléctrica", description: "Instalações, manutenção e certificação eléctrica", parentId: "cat-construcao" },
  { id: "cat-construcao-canalizacao", slug: "canalizacao", name: "Canalização", description: "Água, esgotos, canalização e fossas", parentId: "cat-construcao" },
  { id: "cat-construcao-carpintaria", slug: "carpintaria", name: "Carpintaria", description: "Móveis, portas, tectos e acabamentos em madeira", parentId: "cat-construcao" },
  { id: "cat-construcao-serralharia", slug: "serralharia", name: "Serralharia e Soldadura", description: "Portões, grades, estruturas metálicas", parentId: "cat-construcao" },
  { id: "cat-construcao-pintura", slug: "pintura", name: "Pintura e Acabamentos", description: "Pintura interior/exterior, estuque e revestimentos", parentId: "cat-construcao" },
  { id: "cat-construcao-alvenaria", slug: "alvenaria", name: "Alvenaria e Pavimentos", description: "Alvenaria, pavimentos, azulejos e ladrilhos", parentId: "cat-construcao" },
  { id: "cat-construcao-avac", slug: "avac", name: "Frio e Climatização (AVAC)", description: "Ar condicionado, frio industrial e ventilação", parentId: "cat-construcao" },
  { id: "cat-construcao-fundacoes", slug: "fundacoes", name: "Fundações e Geotecnia", description: "Sondagens, fundações e contenções", parentId: "cat-construcao" },
  { id: "cat-construcao-impermeabilizacao", slug: "impermeabilizacao", name: "Impermeabilização", description: "Impermeabilização de coberturas e caves", parentId: "cat-construcao" },
  { id: "cat-construcao-estruturas", slug: "estruturas-metalicas", name: "Estruturas Metálicas", description: "Estruturas, coberturas metálicas e galpões", parentId: "cat-construcao" },

  // L1 — Energia e Água
  { id: "cat-energia", slug: "energia-agua", name: "Energia e Água", description: "Energia eléctrica, solar, água e saneamento" },
  { id: "cat-energia-solar", slug: "energia-solar", name: "Energia Solar", description: "Painéis, inversores, instalação e manutenção solar", parentId: "cat-energia" },
  { id: "cat-energia-grupo", slug: "geradores", name: "Geradores e UPS", description: "Grupos geradores, UPS e sistemas de backup", parentId: "cat-energia" },
  { id: "cat-energia-furo", slug: "furos-agua", name: "Furos e Bombas de Água", description: "Captação, furos, bombas e reservatórios", parentId: "cat-energia" },
  { id: "cat-energia-eficiencia", slug: "eficiencia-energetica", name: "Eficiência Energética", description: "Auditorias e optimização de consumo", parentId: "cat-energia" },
  { id: "cat-energia-saneamento", slug: "saneamento", name: "Saneamento", description: "ETAR, fossas e tratamento de água", parentId: "cat-energia" },

  // L1 — Indústria e Manufatura
  { id: "cat-industria", slug: "industria", name: "Indústria e Manufatura", description: "Produção, montagem, manutenção industrial" },
  { id: "cat-industria-metal", slug: "metalurgia", name: "Metalurgia e Metalomecânica", description: "Tornearia, fresagem, metalomecânica", parentId: "cat-industria" },
  { id: "cat-industria-quimica", slug: "quimica", name: "Química e Plásticos", description: "Indústria química, plásticos e embalagens", parentId: "cat-industria" },
  { id: "cat-industria-textil", slug: "textil", name: "Têxtil e Confecções", description: "Fiação, tecelagem e confecções", parentId: "cat-industria" },
  { id: "cat-industria-alimentar", slug: "industria-alimentar", name: "Indústria Alimentar", description: "Processamento e conservação alimentar", parentId: "cat-industria" },
  { id: "cat-industria-mad", slug: "madeira", name: "Madeira e Mobiliário", description: "Serração e fabrico de mobiliário", parentId: "cat-industria" },

  // L1 — Agronegócio
  { id: "cat-agro", slug: "agronegocio", name: "Agronegócio", description: "Agricultura, pecuária, agro-processamento e insumos" },
  { id: "cat-agro-insumos", slug: "insumos-agricolas", name: "Insumos e Equipamentos Agrícolas", description: "Sementes, fertilizantes, tractores e alfaias", parentId: "cat-agro" },
  { id: "cat-agro-pecuaria", slug: "pecuaria", name: "Pecuária", description: "Bovinicultura, avicultura e suinicultura", parentId: "cat-agro" },
  { id: "cat-agro-pesca", slug: "pesca-aquacultura", name: "Pesca e Aquacultura", description: "Pesca artesanal, industrial e aquacultura", parentId: "cat-agro" },
  { id: "cat-agro-processamento", slug: "agro-processamento", name: "Agro-processamento", description: "Moagem, óleos e conservas", parentId: "cat-agro" },
  { id: "cat-agro-mecanizacao", slug: "mecanizacao", name: "Mecanização Agrícola", description: "Aluguer e manutenção de tractores e alfaias", parentId: "cat-agro" },

  // L1 — Transporte e Logística
  { id: "cat-transporte", slug: "transporte", name: "Transporte e Logística", description: "Transporte de bens e pessoas, mudanças e estiva" },
  { id: "cat-transporte-carga", slug: "transporte-carga", name: "Transporte de Carga", description: "Camiões, contentores e distribuição", parentId: "cat-transporte" },
  { id: "cat-transporte-passageiros", slug: "transporte-passageiros", name: "Transporte de Passageiros", description: "Machimbombo, transfers e rent-a-car", parentId: "cat-transporte" },
  { id: "cat-transporte-aduaneiro", slug: "despacho-aduaneiro", name: "Despacho Aduaneiro", description: "Desalfandegamento e transitários", parentId: "cat-transporte" },
  { id: "cat-transporte-logistica", slug: "logistica", name: "Logística e Armazenagem", description: "Armazéns, cadeia de frio e distribuição", parentId: "cat-transporte" },
  { id: "cat-transporte-maritimo", slug: "transporte-maritimo", name: "Transporte Marítimo", description: "Agenciamento, estiva e navegação", parentId: "cat-transporte" },

  // L1 — Tecnologia e Informática
  { id: "cat-ti", slug: "tecnologia", name: "Tecnologia e Informática", description: "Desenvolvimento, redes, suporte e telecom" },
  { id: "cat-ti-dev", slug: "desenvolvimento-software", name: "Desenvolvimento de Software", parentId: "cat-ti" },
  { id: "cat-ti-redes", slug: "redes-telecom", name: "Redes e Telecomunicações", description: "Fibra, VSAT, PABX e infraestrutura", parentId: "cat-ti" },
  { id: "cat-ti-suporte", slug: "suporte-informatico", name: "Suporte Informático", description: "Helpdesk, manutenção e cibersegurança", parentId: "cat-ti" },
  { id: "cat-ti-cloud", slug: "cloud-data-center", name: "Cloud e Data Center", description: "Hospedagem, cloud e data center", parentId: "cat-ti" },
  { id: "cat-ti-ciberseguranca", slug: "ciberseguranca", name: "Cibersegurança", description: "Auditoria, pentest e protecção de dados", parentId: "cat-ti" },

  // L1 — Comércio e Retalho
  { id: "cat-comercio", slug: "comercio", name: "Comércio e Retalho", description: "Grossista, retalho, importação e distribuição" },
  { id: "cat-comercio-grossista", slug: "grossista", name: "Comércio Grossista", description: "Distribuição e armazenagem grossista", parentId: "cat-comercio" },
  { id: "cat-comercio-retalho", slug: "retalho", name: "Retalho", description: "Lojas, minimercados e boutiques", parentId: "cat-comercio" },
  { id: "cat-comercio-ecommerce", slug: "ecommerce", name: "E-commerce", description: "Lojas online e marketplaces", parentId: "cat-comercio" },
  { id: "cat-comercio-import", slug: "importacao", name: "Importação e Exportação", description: "Trading e comércio internacional", parentId: "cat-comercio" },

  // L1 — Hotelaria, Turismo e Restauração
  { id: "cat-hotelaria", slug: "hotelaria-turismo", name: "Hotelaria e Turismo", description: "Hotéis, lodges, agências e restauração" },
  { id: "cat-hotelaria-hotel", slug: "hoteis", name: "Hotéis e Lodges", description: "Alojamento, resorts e safari", parentId: "cat-hotelaria" },
  { id: "cat-hotelaria-restauracao", slug: "restauracao", name: "Restauração", description: "Restaurantes, bares e catering", parentId: "cat-hotelaria" },
  { id: "cat-hotelaria-agencia", slug: "agencia-viagens", name: "Agência de Viagens", description: "Pacotes, voos e vistos", parentId: "cat-hotelaria" },

  // L1 — Banca, Seguros e Fintech
  { id: "cat-banca", slug: "banca-seguros", name: "Banca, Seguros e Fintech", description: "Bancos, seguradoras, microcrédito e fintech" },
  { id: "cat-banca-banco", slug: "banca", name: "Banca", description: "Bancos comerciais e de investimento", parentId: "cat-banca" },
  { id: "cat-banca-seguros", slug: "seguros", name: "Seguros", description: "Seguros gerais, vida e resseguro", parentId: "cat-banca" },
  { id: "cat-banca-fintech", slug: "fintech", name: "Fintech e Pagamentos", description: "Carteiras móveis, pagamentos e crédito", parentId: "cat-banca" },
  { id: "cat-banca-microcredito", slug: "microcredito", name: "Microcrédito", description: "Microfinanças e cooperativas", parentId: "cat-banca" },

  // L1 — Imobiliário
  { id: "cat-imobiliario", slug: "imobiliario", name: "Imobiliário", description: "Mediação, avaliação, gestão e promoção imobiliária" },
  { id: "cat-imobiliario-mediacao", slug: "mediacao-imobiliaria", name: "Mediação Imobiliária", description: "Compra, venda e arrendamento", parentId: "cat-imobiliario" },
  { id: "cat-imobiliario-avaliacao", slug: "avaliacao-imobiliaria", name: "Avaliações", description: "Peritagens e avaliações", parentId: "cat-imobiliario" },
  { id: "cat-imobiliario-gestao", slug: "gestao-imobiliaria", name: "Gestão Imobiliária", description: "Condomínios e property management", parentId: "cat-imobiliario" },

  // L1 — Mineração, Petróleo e Gás
  { id: "cat-mineracao", slug: "mineracao-petroleo-gas", name: "Mineração, Petróleo e Gás", description: "Extracção, exploração e serviços mineiros" },
  { id: "cat-mineracao-carvao", slug: "carvao", name: "Carvão Mineral", description: "Extracção e logística de carvão", parentId: "cat-mineracao" },
  { id: "cat-mineracao-grafite", slug: "grafite", name: "Grafite e Minerais", description: "Grafite, rubis e areias pesadas", parentId: "cat-mineracao" },
  { id: "cat-mineracao-gas", slug: "gas-natural", name: "Gás Natural e Petróleo", description: "GNL, exploração e serviços petrolíferos", parentId: "cat-mineracao" },
  { id: "cat-mineracao-servicos", slug: "servicos-mineiros", name: "Serviços Mineiros", description: "Sondagem, laboratório e topografia", parentId: "cat-mineracao" },

  // L1 — Serviços Empresariais
  { id: "cat-contabilidade", slug: "contabilidade", name: "Contabilidade e Finanças", description: "Contabilidade, fiscalidade, auditoria e Payroll" },
  { id: "cat-contabilidade-fiscal", slug: "fiscalidade", name: "Fiscalidade e IVA", description: "Declarações, IVA e obrigações AT", parentId: "cat-contabilidade" },
  { id: "cat-contabilidade-auditoria", slug: "auditoria", name: "Auditoria", description: "Auditoria financeira e interna", parentId: "cat-contabilidade" },
  { id: "cat-juridico", slug: "juridico", name: "Jurídico", description: "Advocacia, consultoria jurídica e notariado" },
  { id: "cat-rh", slug: "recursos-humanos", name: "Recursos Humanos", description: "Recrutamento, formação e gestão de pessoal", parentId: "cat-contabilidade" },
  { id: "cat-consultoria", slug: "consultoria", name: "Consultoria Empresarial", description: "Estratégia, gestão e certificações", parentId: "cat-contabilidade" },

  // L1 — Marketing, Design e Media
  { id: "cat-marketing", slug: "marketing", name: "Marketing e Design", description: "Design gráfico, marketing digital e branding" },
  { id: "cat-marketing-digital", slug: "marketing-digital", name: "Marketing Digital", description: "Gestão de redes, tráfego pago e SEO", parentId: "cat-marketing" },
  { id: "cat-marketing-design", slug: "design-grafico", name: "Design Gráfico", description: "Branding, embalagens e editorial", parentId: "cat-marketing" },
  { id: "cat-marketing-media", slug: "media", name: "Media e Publicidade", description: "Rádio, TV, outdoor e produção", parentId: "cat-marketing" },

  // L1 — Eventos
  { id: "cat-eventos", slug: "eventos", name: "Eventos", description: "Organização, catering, som, luz e decoração" },
  { id: "cat-eventos-catering", slug: "catering", name: "Catering", description: "Serviço de catering e restauração", parentId: "cat-eventos" },
  { id: "cat-eventos-som-luz", slug: "som-luz", name: "Som e Iluminação", description: "Palco, som, luz e audiovisual", parentId: "cat-eventos" },
  { id: "cat-eventos-decoracao", slug: "decoracao", name: "Decoração", description: "Decoração e montagem de stands", parentId: "cat-eventos" },

  // L1 — Segurança
  { id: "cat-seguranca", slug: "seguranca", name: "Segurança Privada", description: "Vigilância, alarmes, CCTV e segurança electrónica" },
  { id: "cat-seguranca-vigilancia", slug: "vigilancia", name: "Vigilância", description: "Guardas e escolta", parentId: "cat-seguranca" },
  { id: "cat-seguranca-cctv", slug: "cctv", name: "CCTV e Alarmes", description: "Videovigilância e alarmes", parentId: "cat-seguranca" },

  // L1 — Limpeza e Higiene
  { id: "cat-limpeza", slug: "limpeza", name: "Limpeza e Higiene", description: "Limpeza residencial, empresarial e industrial" },
  { id: "cat-limpeza-industrial", slug: "limpeza-industrial", name: "Limpeza Industrial", description: "Higienização técnica e gestão de resíduos", parentId: "cat-limpeza" },
  { id: "cat-limpeza-facilities", slug: "facilities", name: "Facilities Management", description: "Gestão integrada de facilities", parentId: "cat-limpeza" },

  // L1 — Saúde e Bem-estar
  { id: "cat-saude", slug: "saude", name: "Saúde e Bem-estar", description: "Serviços de saúde, clínicas e bem-estar" },
  { id: "cat-saude-clinica", slug: "clinica-medica", name: "Clínica Médica", description: "Consultas, análises e cuidados médicos", parentId: "cat-saude" },
  { id: "cat-saude-farmacia", slug: "farmacia", name: "Farmácia", description: "Farmácias e distribuição farmacêutica", parentId: "cat-saude" },
  { id: "cat-saude-bemestar", slug: "bem-estar", name: "Bem-estar e Estética", description: "Spas, ginásios e estética", parentId: "cat-saude" },

  // L1 — Educação e Formação
  { id: "cat-educacao", slug: "educacao", name: "Educação e Formação", description: "Ensino, formação profissional e explicações" },
  { id: "cat-educacao-tecnica", slug: "formacao-tecnica", name: "Formação Técnica", description: "Cursos técnicos, certificações e workshops", parentId: "cat-educacao" },
  { id: "cat-educacao-idiomas", slug: "idiomas", name: "Idiomas", description: "Escolas de línguas", parentId: "cat-educacao" },

  // L1 — Automóvel e Máquinas
  { id: "cat-automovel", slug: "automovel", name: "Automóvel e Máquinas", description: "Mecânica auto, bate-chapa, diagnóstico e aluguer de máquinas" },
  { id: "cat-automovel-mecanica", slug: "mecanica-auto", name: "Mecânica Auto", description: "Oficinas e auto-eléctrica", parentId: "cat-automovel" },
  { id: "cat-automovel-batechapa", slug: "bate-chapa", name: "Bate-Chapa e Pintura", description: "Chaparia e pintura auto", parentId: "cat-automovel" },
  { id: "cat-automovel-maquinas", slug: "aluguer-maquinas", name: "Aluguer de Máquinas", description: "Gruas, escavadoras e empilhadores", parentId: "cat-automovel" },

  // L1 — Alimentação e Bebidas
  { id: "cat-alimentacao", slug: "alimentacao", name: "Alimentação e Bebidas", description: "Produção, distribuição e catering alimentar" },
  { id: "cat-alimentacao-bebidas", slug: "bebidas", name: "Bebidas", description: "Águas, sumos, cervejas e destilados", parentId: "cat-alimentacao" },
];

export async function seedComprehensive() {
  console.log(`Upsert ${categories.length} categorias abrangentes...`);
  let inserted = 0, updated = 0;
  for (const c of categories) {
    const res = await db
      .insert(category)
      .values({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description ?? null,
        parentId: (c as { parentId?: string }).parentId ?? null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: category.slug,
        set: {
          name: c.name,
          description: c.description ?? null,
          parentId: (c as { parentId?: string }).parentId ?? null,
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning({ id: category.id });
    if (res.length) inserted++;
  }
  console.log(`  ${categories.length} categorias processadas (upsert).`);
  console.log("Seed abrangente concluído. Slugs antigos preservados.");
}

if ((import.meta as unknown as { main?: boolean }).main) {
  seedComprehensive()
    .then(async () => { await pool.end(); process.exit(0); })
    .catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
}
