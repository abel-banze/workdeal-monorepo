import { db } from "./client.js";
import { featureFlag } from "./schema.js";
import { FEATURE_CATALOG } from "@workdeal/shared";
import { PLANS_SEED } from "./seed-plans.js";

// Features → agrupamento pelo plano que primeiro a concede (free/trust/premium/enterprise).
// Usa o mesmo catálogo partilhado — fonte única de verdade.
function buildFeatureGroups(): Map<string, string> {
  const group = new Map<string, string>();
  for (const p of PLANS_SEED) {
    for (const [key] of p.features) {
      if (!group.has(key)) group.set(key, p.slug);
    }
  }
  return group;
}

/**
 * Seeds os flags operacionais a partir do catálogo, todos com `defaultEnabled=true`
 * — preserva o comportamento actual (features acessíveis por defeito). O admin
 * pode depois desactivar/activar globalmente ou por organização.
 *
 * Idempotente e não-destrutivo do controlo: o upsert só actualiza nome/descrição/
 * grupo/ordem — nunca repõe `defaultEnabled`/`emergencyDisabled` (estado de
 * operação) nem apaga sobreposições existentes.
 */
export async function seedFeatureFlags(): Promise<{ flags: number }> {
  const groups = buildFeatureGroups();
  let count = 0;

  for (const [index, f] of FEATURE_CATALOG.entries()) {
    await db
      .insert(featureFlag)
      .values({
        key: f.key,
        name: f.label,
        description: f.description,
        defaultEnabled: true,
        emergencyDisabled: false,
        group: groups.get(f.key) ?? "others",
        sortOrder: index,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: featureFlag.key,
        set: {
          name: f.label,
          description: f.description,
          group: groups.get(f.key) ?? "others",
          sortOrder: index,
          updatedAt: new Date(),
        },
      });
    count++;
  }

  console.log(`  ${count} feature flags seeded (default ON)`);
  return { flags: count };
}

// @ts-ignore - Bunism, tsc nodenext não tem `main` em ImportMeta
if ((import.meta as unknown as { main?: boolean }).main) {
  seedFeatureFlags()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}