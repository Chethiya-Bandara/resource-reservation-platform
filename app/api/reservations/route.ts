import { ResourceStatus } from "@/src/generated/prisma/enums";
import { currentUser } from "@/lib/auth";
import { ensureDemoData } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";
import { parseWorkspaceDateTime } from "@/lib/workspace-time";

type ReservationInput = {
  resourceId?: unknown;
  title?: unknown;
  startTime?: unknown;
  endTime?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ReservationInput;
  const resourceId = typeof body.resourceId === "string" ? body.resourceId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const startTime = parseWorkspaceDateTime(body.startTime);
  const endTime = parseWorkspaceDateTime(body.endTime);

  if (
    !resourceId ||
    !title ||
    Number.isNaN(startTime.valueOf()) ||
    Number.isNaN(endTime.valueOf()) ||
    endTime <= startTime
  ) {
    return Response.json(
      { error: "Provide a resource, title, and a valid time range." },
      { status: 400 },
    );
  }

  if (startTime < new Date()) {
    return Response.json(
      { error: "Reservations cannot be made for past dates and times." },
      { status: 400 },
    );
  }

  await ensureDemoData();
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to create a reservation." }, { status: 401 });
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });

  if (!resource || resource.status !== ResourceStatus.AVAILABLE) {
    return Response.json({ error: "This resource is unavailable." }, { status: 400 });
  }
  const maintenanceConflict = await prisma.maintenanceWindow.findFirst({
    where: { resourceId, startTime: { lt: endTime }, endTime: { gt: startTime } },
  });
  if (maintenanceConflict)
    return Response.json(
      { error: "This resource is scheduled for maintenance during that time." },
      { status: 409 },
    );

  try {
    const reservation = await prisma.reservation.create({
      data: { resourceId, userId: user.id, title, startTime, endTime },
      include: { resource: true, user: true },
    });

    return Response.json({ reservation }, { status: 201 });
  } catch {
    return Response.json(
      { error: "This resource already has a reservation in that time range." },
      { status: 409 },
    );
  }
}
