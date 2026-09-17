import { writeFile } from "node:fs/promises";
import path from "node:path";
import { asc, count, eq } from "drizzle-orm";
import { db, tender, ugea } from "@workdeal/db";

async function main(): Promise<void> {
  const rows = await db
    .select({
      name: ugea.name,
      slug: ugea.slug,
      description: ugea.description,
      totalTenders: count(tender.id),
    })
    .from(ugea)
    .leftJoin(tender, eq(tender.ugeaId, ugea.id))
    .groupBy(ugea.id, ugea.name, ugea.slug, ugea.description)
    .orderBy(asc(ugea.name));

  await writeFile(path.resolve(process.cwd(), "ugeas.json"), JSON.stringify(rows, null, 2) + "\n", "utf8");
  console.log(`[extract-ugeas-db] exportou ${rows.length} UGEAs`);
}

main().catch((error) => {
  console.error("[extract-ugeas-db] falha na exportação", error);
  process.exitCode = 1;
});