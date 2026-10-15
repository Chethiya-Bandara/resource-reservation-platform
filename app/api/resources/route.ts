import { currentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ResourceInput = { name?: unknown; type?: unknown; location?: unknown; capacity?: unknown };

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to add a resource." }, { status: 401 });
  if (!isAdmin(user))
    return Response.json({ error: "Only admins can add resources." }, { status: 403 });

  const body = (await request.json()) as ResourceInput;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const capacity = Number(body.capacity);
  if (!name || !type || !location || !Number.isInteger(capacity) || capacity < 1)
    return Response.json(
      { error: "Provide a name, type, location, and positive capacity." },
      { status: 400 },
    );

  try {
    const resource = await prisma.resource.create({ data: { name, type, location, capacity } });
    return Response.json({ resource }, { status: 201 });
  } catch {
    return Response.json({ error: "A resource with that name already exists." }, { status: 409 });
  }
}
