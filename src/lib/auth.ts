import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "admin_session";

function secret() {
  return process.env.ADMIN_PASSWORD || "emeline";
}

export function sessionToken() {
  return createHmac("sha256", secret()).update("admin-ok").digest("hex");
}

export function checkPassword(password: string) {
  return password === secret();
}

export async function setAdminCookie() {
  const jar = await cookies();
  jar.set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdmin() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === sessionToken();
}

export async function requireAdmin() {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }
}
