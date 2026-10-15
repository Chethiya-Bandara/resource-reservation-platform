import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth";
import { ensureDemoData } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export async function POST(request: Request) {
  await ensureDemoData();
  const { email, password } = (await request.json()) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string")
    return Response.json({ error: "Enter your email and password." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !(await compare(password, user.passwordHash)))
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
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
