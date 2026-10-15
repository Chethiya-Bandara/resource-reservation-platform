import { currentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResourceStatus } from "@/src/generated/prisma/enums";

export async function PATCH(request: Request, context: RouteContext<"/api/reservations/[id]">) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to manage reservations." }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json()) as {
    action?: unknown;
    title?: unknown;
    resourceId?: unknown;
    startTime?: unknown;
    endTime?: unknown;
  };
  const { action } = body;
  if (action !== "CANCEL" && action !== "UPDATE")
    return Response.json({ error: "Unsupported reservation action." }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return Response.json({ error: "Reservation not found." }, { status: 404 });
  if (!isAdmin(user) && reservation.userId !== user.id)
    return Response.json({ error: "You can only cancel your own reservations." }, { status: 403 });

  if (action === "CANCEL") {
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return Response.json({ reservation: updatedReservation });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const resourceId = typeof body.resourceId === "string" ? body.resourceId : "";
  const startTime = new Date(typeof body.startTime === "string" ? body.startTime : "");
  const endTime = new Date(typeof body.endTime === "string" ? body.endTime : "");
  if (
    !title ||
    !resourceId ||
    Number.isNaN(startTime.valueOf()) ||
    Number.isNaN(endTime.valueOf()) ||
    endTime <= startTime
  ) {
    return Response.json(
      { error: "Provide a resource, title, and valid time range." },
      { status: 400 },
    );
  }
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource || resource.status !== ResourceStatus.AVAILABLE)
    return Response.json({ error: "This resource is unavailable." }, { status: 400 });

  try {
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: { title, resourceId, startTime, endTime },
      include: { resource: true, user: true },
    });
    return Response.json({ reservation: updatedReservation });
  } catch {
    return Response.json(
      { error: "This resource already has a reservation in that time range." },
      { status: 409 },
    );
  }
}
