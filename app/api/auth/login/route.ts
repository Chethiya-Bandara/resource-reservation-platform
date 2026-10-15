import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth";
import { ensureDemoData } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { role } = (await request.json()) as { role?: unknown };
  const email =
    role === "ADMIN" ? "chethiya@reservely.local" : role === "USER" ? "maya@reservely.local" : null;
  if (!email) return Response.json({ error: "Choose a user role." }, { status: 400 });

  await ensureDemoData();
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return Response.json({ user });
}
