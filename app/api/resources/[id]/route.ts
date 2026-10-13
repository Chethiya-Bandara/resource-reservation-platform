import { currentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResourceStatus } from "@/src/generated/prisma/enums";

export async function PATCH(request: Request, context: RouteContext<"/api/resources/[id]">) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to manage resources." }, { status: 401 });
  if (!isAdmin(user)) return Response.json({ error: "Only admins can change a room's status." }, { status: 403 });

  const { id } = await context.params;
  const { status } = await request.json() as { status?: unknown };
  if (status !== ResourceStatus.AVAILABLE && status !== ResourceStatus.MAINTENANCE) {
    return Response.json({ error: "Choose Available or Maintenance." }, { status: 400 });
  }

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return Response.json({ error: "Resource not found." }, { status: 404 });
  if (resource.type !== "Meeting room") return Response.json({ error: "Only meeting rooms have a room status." }, { status: 400 });

  const updatedResource = await prisma.resource.update({ where: { id }, data: { status } });
  return Response.json({ resource: updatedResource });
}
