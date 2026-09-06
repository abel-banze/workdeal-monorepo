import { db, session } from "@workdeal/db";
import { eq } from "drizzle-orm";

const url = new URL(process.env.DATABASE_URL ?? "?").host;
const [row] = await db.select({ token: session.token }).from(session).where(eq(session.token, "0acab8cd-9762-4306-830a-d2829433fe00")).limit(1);
console.log(`host=${url} found=${row ? "YES" : "NO"}`);