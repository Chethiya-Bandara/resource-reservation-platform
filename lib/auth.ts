import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "reservely_user_id";

export async function currentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  return userId ? prisma.user.findUnique({ where: { id: userId } }) : null;
}

export function isAdmin(user: { role: string }) {
  return user.role === "ADMIN";
}
