import { ensureDemoData } from "@/lib/demo-data";
import { currentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await ensureDemoData();
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to view reservations." }, { status: 401 });

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  const [resources, reservations, todayReservations] = await Promise.all([
    prisma.resource.findMany({ orderBy: { name: "asc" } }),
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
  ]);

  return Response.json({ user, resources, reservations, todayReservations });
}
