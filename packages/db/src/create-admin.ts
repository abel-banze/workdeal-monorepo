import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { user } from "./schema.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const ADMIN_EMAIL = "admin@workdeal.co.mz";
const ADMIN_PASSWORD = "$Katukuta06";
const ADMIN_NAME = "Workdeal Admin";
const ADMIN_PHONE = "+25884000000";

async function main() {
  // Import dinâmico APÓS o dotenv — evita o hoisting ESM que leria o env antes do .env carregar.
  const { auth } = await import("@workdeal/auth");

  const existing = await db
    .select({ id: user.id, systemRole: user.systemRole })
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL))
    .limit(1);

  let userId: string;
  if (existing.length > 0) {
    userId = existing[0].id;
    console.log(`Utilizador ${ADMIN_EMAIL} já existe (id=${userId}, systemRole=${existing[0].systemRole})`);
  } else {
    // Usa o próprio better-auth para criar — garante hash de password compatível com o login.
    const created = await auth.api.signUpEmail({
      body: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        phone: ADMIN_PHONE,
      },
    });
    const id = (created.user as { id?: string })?.id;
    if (!id) throw new Error("auth.api.signUpEmail não devolveu user id");
    userId = id;
    console.log(`Utilizador ${ADMIN_EMAIL} criado (id=${userId})`);
  }

  await db
    .update(user)
    .set({ systemRole: "admin", emailVerified: true })
    .where(eq(user.id, userId));

  console.log(`systemRole=admin aplicado a ${ADMIN_EMAIL}`);
}

// @ts-ignore - Bunism, tsc nodenext não tem `main` em ImportMeta
if ((import.meta as unknown as { main?: boolean }).main) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
