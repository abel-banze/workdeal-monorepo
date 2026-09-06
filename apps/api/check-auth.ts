import { auth } from "@workdeal/auth";
import { db, session } from "@workdeal/db";
import { eq } from "drizzle-orm";

const token = "0acab8cd-9762-4306-830a-d2829433fe00";
const rows = await db.select({ token: session.token }).from(session).where(eq(session.token, token));
console.log(`sessionRows=${rows.length}`);

const r = await auth.api.getSession({ headers: new Headers({ cookie: `better-auth.session_token=${token}` }) });
console.log(`session=${JSON.stringify(r)?.slice(0, 300)}`);