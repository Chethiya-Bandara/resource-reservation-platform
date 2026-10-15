import { hash } from "bcryptjs";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    role?: unknown;
  };
  if (
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    body.password.length < 8
  )
    return Response.json(
      { error: "Enter a name, email, and password of at least 8 characters." },
      { status: 400 },
    );
  try {
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        passwordHash: await hash(body.password, 12),
        role: body.role === "ADMIN" ? "ADMIN" : "MEMBER",
      },
    });
    (await cookies()).set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 28800,
    });
    return Response.json({ user }, { status: 201 });
  } catch {
    return Response.json({ error: "An account with that email already exists." }, { status: 409 });
  }
}
