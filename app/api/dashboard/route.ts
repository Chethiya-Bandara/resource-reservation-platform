import { ensureDemoData } from "@/lib/demo-data";
import { currentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceDayRange } from "@/lib/workspace-time";

export async function GET() {
  await ensureDemoData();
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to view reservations." }, { status: 401 });

  const { start: todayStart, end: tomorrowStart } = getWorkspaceDayRange();

  const [resources, reservations, todayReservations, maintenanceSchedules] = await Promise.all([
    prisma.resource.findMany({
      include: {
        maintenanceWindows: {
          where: { startTime: { lte: new Date() }, endTime: { gt: new Date() } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.reservation.findMany({
      where: { status: "CONFIRMED", ...(isAdmin(user) ? {} : { userId: user.id }) },
      include: { resource: true, user: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.reservation.findMany({
      where: { status: "CONFIRMED", startTime: { lt: tomorrowStart }, endTime: { gt: todayStart } },
      include: { resource: true, user: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.maintenanceWindow.findMany({
      where: { endTime: { gt: new Date() } },
      include: { resource: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  return Response.json({
    user,
    resources,
    reservations,
    todayReservations,
    maintenanceSchedules: isAdmin(user) ? maintenanceSchedules : [],
  });
}
