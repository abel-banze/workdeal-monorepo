import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { eq, and } from "drizzle-orm";
import { db } from "./client.js";
import {
  profile,
  organization,
  badge,
  profileBadge,
  profileContactVerification,
  service,
  category,
} from "./schema.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const CODEBAZ_SLUG = "codebaz";

const contacts = [
  { channel: "email" as const, identifier: "geral@codebaz.cloud" },
  { channel: "email" as const, identifier: "comercial@codebaz.cloud" },
  { channel: "phone" as const, identifier: "+258847226843" },
  { channel: "phone" as const, identifier: "+258861276843" },
  { channel: "whatsapp" as const, identifier: "+258861276843" },
  { channel: "website" as const, identifier: "https://codebaz.cloud" },
];

const services = [
  {
    title: "Desenvolvimento Web Personalizado",
    description: "Websites responsivos e modernos, utilizando as mais avançadas tecnologias, garantindo alta performance e segurança ponta-a-ponta.",
    categorySlug: "desenvolvimento-software",
    sortOrder: 0,
  },
  {
    title: "Aplicativos Móveis Multiplataforma",
    description: "Aplicações móveis para iOS e Android usando tecnologias avançadas e consistentes, garantindo performance e design consistente.",
    categorySlug: "desenvolvimento-software",
    sortOrder: 1,
  },
  {
    title: "Software Empresarial Customizado",
    description: "Soluções de software sob medida para atender às necessidades específicas do seu negócio, integrando sistemas e automatizando processos.",
    categorySlug: "desenvolvimento-software",
    sortOrder: 2,
  },
  {
    title: "Integração e Automação de Sistemas",
    description: "Automatizamos processos e integramos sistemas empresariais para aumentar eficiência e reduzir custos operacionais.",
    categorySlug: "desenvolvimento-software",
    sortOrder: 3,
  },
  {
    title: "Infraestrutura em Nuvem",
    description: "Consultoria e implementação de infraestrutura na nuvem, garantindo escalabilidade, segurança e backups automáticos.",
    categorySlug: "redes-telecom",
    sortOrder: 4,
  },
  {
    title: "Segurança Cibernética",
    description: "Soluções robustas para proteger dados e sistemas contra ameaças e ataques cibernéticos.",
    categorySlug: "suporte-informatico",
    sortOrder: 5,
  },
  {
    title: "Consultoria em Dados e Análises",
    description: "Transformação de dados em insights acionáveis, utilizando ferramentas de análise avançada e dashboards personalizados.",
    categorySlug: "desenvolvimento-software",
    sortOrder: 6,
  },
  {
    title: "Desenvolvimento de Frontend",
    description: "Interfaces interativas e atraentes, focadas na experiência do utilizador e compatíveis com múltiplos dispositivos.",
    categorySlug: "desenvolvimento-software",
    sortOrder: 7,
  },
];

function log(msg: string) {
  console.log(`[seed-codebaz] ${msg}`);
}

async function main() {
  // 1. Find codebaz profile
  const [prof] = await db
    .select()
    .from(profile)
    .where(eq(profile.slug, CODEBAZ_SLUG))
    .limit(1);

  if (!prof) {
    log(`ERRO: Perfil com slug "${CODEBAZ_SLUG}" não encontrado na BD.`);
    process.exit(1);
  }

  log(`Perfil encontrado: id=${prof.id}, name="${prof.name}", orgId=${prof.organizationId}`);

  // 2. Ensure "verified" badge exists (seed the badge catalog if empty)
  let verifiedBadge = await db
    .select()
    .from(badge)
    .where(eq(badge.slug, "verified"))
    .limit(1)
    .then((r) => r[0]);

  if (!verifiedBadge) {
    log("Badge 'verified' não existe. A criar...");
    const id = "badge-verified";
    await db
      .insert(badge)
      .values({
        id,
        slug: "verified",
        name: "Verificado",
        description: "Identidade/NUIT verificada — empresa com todos os documentos de registo legal (1º grau)",
        type: "trust",
        origin: "manual",
        criteria: "Documento NUIT/BI + alvará validados manualmente (SLA 48h)",
      })
      .onConflictDoNothing();
    verifiedBadge = await db.select().from(badge).where(eq(badge.id, id)).limit(1).then((r) => r[0]);
    log("Badge 'verified' criado.");
  }

  // 3. Assign verified badge (1º grau) to profile
  const existingBadge = await db
    .select()
    .from(profileBadge)
    .where(
      and(
        eq(profileBadge.profileId, prof.id),
        eq(profileBadge.badgeId, verifiedBadge!.id),
      ),
    )
    .limit(1)
    .then((r) => r[0]);

  if (existingBadge) {
    log(`Selo "Verificado" (1º grau) já atribuído (status=${existingBadge.status}).`);
  } else {
    await db.insert(profileBadge).values({
      profileId: prof.id,
      badgeId: verifiedBadge!.id,
      origin: "manual",
      status: "active",
    });
    log("Selo 'Verificado' (1º grau) atribuído com sucesso.");
  }

  // 4. Mark organization as verified
  if (prof.organizationId) {
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, prof.organizationId))
      .limit(1);

    if (org) {
      if (org.verificationStatus === "verified") {
        log(`Organização "${org.name}" já está verificada.`);
      } else {
        await db
          .update(organization)
          .set({
            verificationStatus: "verified",
            verifiedAt: new Date(),
          })
          .where(eq(organization.id, prof.organizationId));
        log(`Organização "${org.name}" marcada como verificada.`);
      }
    }
  }

  // 5. Verify contacts
  for (const c of contacts) {
    const existing = await db
      .select()
      .from(profileContactVerification)
      .where(
        and(
          eq(profileContactVerification.profileId, prof.id),
          eq(profileContactVerification.channel, c.channel),
          eq(profileContactVerification.identifier, c.identifier),
        ),
      )
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      log(`Contacto ${c.channel}="${c.identifier}" já verificado.`);
    } else {
      await db.insert(profileContactVerification).values({
        id: `pcv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        profileId: prof.id,
        channel: c.channel,
        identifier: c.identifier,
      });
      log(`Contacto ${c.channel}="${c.identifier}" verificado.`);
    }
  }

  // 6. Create services
  const allCategories = await db.select().from(category);
  const slugToId = new Map(allCategories.map((c) => [c.slug, c.id]));

  let created = 0;
  let skipped = 0;

  for (const s of services) {
    const existing = await db
      .select()
      .from(service)
      .where(
        and(
          eq(service.profileId, prof.id),
          eq(service.title, s.title),
        ),
      )
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      log(`Serviço "${s.title}" já existe (id=${existing.id}).`);
      skipped++;
      continue;
    }

    const catId = slugToId.get(s.categorySlug) ?? null;

    await db.insert(service).values({
      id: `svc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      profileId: prof.id,
      title: s.title,
      description: s.description,
      priceMzn: null,
      imageUrl: null,
      categoryId: catId,
      sortOrder: s.sortOrder,
    });
    log(`Serviço "${s.title}" criado (categoryId=${catId}).`);
    created++;
  }

  log(`\nResumo: ${created} serviços criados, ${skipped} já existentes.`);
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
