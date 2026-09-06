import { auth } from "@workdeal/auth";
import { db, user } from "@workdeal/db";
import { eq } from "drizzle-orm";

const email = "test-admin@workdeal.local";
const password = "TestAdmin2026!";

let signUpError: unknown = null;
try {
  const created = await auth.api.signUpEmail({ body: { email, password, name: "Test Admin", phone: "840000000" } });
  signUpError = created?.error ?? null;
  if (created?.error) console.log("signUpError", created.error.code ?? created.error.message);
} catch (e) {
  signUpError = e;
  console.log("signUp threw", String(e));
}

await db.update(user).set({ systemRole: "admin" }).where(eq(user.email, email));

const session = await auth.api.signInEmail({ body: { email, password } });
if (session?.error) {
  console.log("signInError", session.error.code ?? session.error.message);
  process.exit(1);
}
const token = (session as { token?: string }).token ?? "";
console.log("token", token);
console.log("user", JSON.stringify(session?.user?.email), "role", JSON.stringify(session?.user?.systemRole));