import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  ResourceStatus,
  ResourceType,
  ReservationStatus,
  UserRole,
} from "@/src/generated/prisma/enums";

const testRunId = `${process.pid}-${Date.now()}`;
let resourceId = "";
let firstUserId = "";
let secondUserId = "";

beforeAll(async () => {
  const [firstUser, secondUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Concurrency User One",
        email: `concurrency-one-${testRunId}@test.local`,
        role: UserRole.MEMBER,
      },
    }),
    prisma.user.create({
      data: {
        name: "Concurrency User Two",
        email: `concurrency-two-${testRunId}@test.local`,
        role: UserRole.MEMBER,
      },
    }),
  ]);
  firstUserId = firstUser.id;
  secondUserId = secondUser.id;

  const resource = await prisma.resource.create({
    data: {
      name: `Concurrency Test Resource ${testRunId}`,
      type: ResourceType.MEETING_ROOM,
      location: "Test suite",
      capacity: 4,
      status: ResourceStatus.AVAILABLE,
    },
  });
  resourceId = resource.id;
});

afterAll(async () => {
  if (resourceId) {
    await prisma.reservation.deleteMany({ where: { resourceId } });
    await prisma.maintenanceWindow.deleteMany({ where: { resourceId } });
    await prisma.resource.delete({ where: { id: resourceId } });
  }
  await prisma.user.deleteMany({
    where: { id: { in: [firstUserId, secondUserId].filter(Boolean) } },
  });
  await prisma.$disconnect();
});

describe("reservation database integrity", () => {
  it("allows only one of two simultaneous overlapping bookings", async () => {
    const startTime = new Date("2035-01-01T04:30:00.000Z");
    const endTime = new Date("2035-01-01T05:30:00.000Z");
    const createBooking = (userId: string) =>
      prisma.reservation.create({
        data: { resourceId, userId, title: "Concurrent booking", startTime, endTime },
      });

    const results = await Promise.allSettled([
      createBooking(firstUserId),
      createBooking(secondUserId),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(
      prisma.reservation.count({ where: { resourceId, status: ReservationStatus.CONFIRMED } }),
    ).resolves.toBe(1);
  });

  it("allows a new booking when an earlier booking in that slot was cancelled", async () => {
    const startTime = new Date("2035-01-01T06:30:00.000Z");
    const endTime = new Date("2035-01-01T07:30:00.000Z");
    await prisma.reservation.create({
      data: {
        resourceId,
        userId: firstUserId,
        title: "Cancelled booking",
        startTime,
        endTime,
        status: ReservationStatus.CANCELLED,
      },
    });

    await expect(
      prisma.reservation.create({
        data: {
          resourceId,
          userId: secondUserId,
          title: "Replacement booking",
          startTime,
          endTime,
        },
      }),
    ).resolves.toMatchObject({ status: ReservationStatus.CONFIRMED });
  });
});
