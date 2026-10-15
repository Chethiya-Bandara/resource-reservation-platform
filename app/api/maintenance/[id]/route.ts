import { currentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWorkspaceDateTime } from "@/lib/workspace-time";

export async function PATCH(request: Request, context: RouteContext<"/api/maintenance/[id]">) {
  const user = await currentUser();
  if (!user || !isAdmin(user))
    return Response.json({ error: "Only admins can manage maintenance." }, { status: 403 });
  const { id } = await context.params;
  const body = (await request.json()) as { startTime?: unknown; endTime?: unknown };
  const startTime = parseWorkspaceDateTime(body.startTime);
  const endTime = parseWorkspaceDateTime(body.endTime);
  const window = await prisma.maintenanceWindow.findUnique({ where: { id } });
  if (!window) return Response.json({ error: "Maintenance schedule not found." }, { status: 404 });
  if (
    Number.isNaN(startTime.valueOf()) ||
    Number.isNaN(endTime.valueOf()) ||
    startTime < new Date() ||
    endTime <= startTime
  )
    return Response.json({ error: "Choose a future maintenance time range." }, { status: 400 });
  const conflict = await prisma.reservation.findFirst({
    where: {
      resourceId: window.resourceId,
      status: "CONFIRMED",
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
  if (conflict)
    return Response.json(
      { error: "Maintenance overlaps an existing reservation." },
      { status: 409 },
    );
  return Response.json({
    maintenance: await prisma.maintenanceWindow.update({
      where: { id },
      data: { startTime, endTime },
    }),
  });
}

export async function DELETE(_: Request, context: RouteContext<"/api/maintenance/[id]">) {
  const user = await currentUser();
  if (!user || !isAdmin(user))
    return Response.json({ error: "Only admins can manage maintenance." }, { status: 403 });
  const { id } = await context.params;
  await prisma.maintenanceWindow.delete({ where: { id } });
  return Response.json({ success: true });
}
