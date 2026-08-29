import { auth } from "@workdeal/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
