import { currentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWorkspaceDateTime } from "@/lib/workspace-time";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || !isAdmin(user))
    return Response.json({ error: "Only admins can schedule maintenance." }, { status: 403 });
  const body = (await request.json()) as {
    resourceId?: unknown;
    startTime?: unknown;
    endTime?: unknown;
  };
  const resourceId = typeof body.resourceId === "string" ? body.resourceId : "";
  const startTime = parseWorkspaceDateTime(body.startTime);
  const endTime = parseWorkspaceDateTime(body.endTime);
  if (
    !resourceId ||
    Number.isNaN(startTime.valueOf()) ||
    Number.isNaN(endTime.valueOf()) ||
    startTime < new Date() ||
    endTime <= startTime
  ) {
    return Response.json({ error: "Choose a future maintenance time range." }, { status: 400 });
  }
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) return Response.json({ error: "Resource not found." }, { status: 404 });
  const conflict = await prisma.reservation.findFirst({
    where: {
      resourceId,
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
  const maintenance = await prisma.maintenanceWindow.create({
    data: { resourceId, startTime, endTime },
  });
  return Response.json({ maintenance }, { status: 201 });
}
