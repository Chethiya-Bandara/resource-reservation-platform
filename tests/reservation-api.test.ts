import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  ensureDemoData: vi.fn(),
  resourceFindUnique: vi.fn(),
  maintenanceFindFirst: vi.fn(),
  reservationCreate: vi.fn(),
  reservationFindUnique: vi.fn(),
  reservationUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  currentUser: mocks.currentUser,
  isAdmin: (user: { role: string }) => user.role === "ADMIN",
}));
vi.mock("@/lib/demo-data", () => ({ ensureDemoData: mocks.ensureDemoData }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    resource: { findUnique: mocks.resourceFindUnique },
    maintenanceWindow: { findFirst: mocks.maintenanceFindFirst },
    reservation: {
      create: mocks.reservationCreate,
      findUnique: mocks.reservationFindUnique,
      update: mocks.reservationUpdate,
    },
  },
}));

import { POST } from "@/app/api/reservations/route";
import { PATCH } from "@/app/api/reservations/[id]/route";

const futureBooking = {
  resourceId: "resource-1",
  title: "Planning",
  startTime: "2035-01-01T10:00:00",
  endTime: "2035-01-01T11:00:00",
};

describe("reservation API rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "user-1", role: "MEMBER" });
    mocks.resourceFindUnique.mockResolvedValue({ id: "resource-1", status: "AVAILABLE" });
    mocks.maintenanceFindFirst.mockResolvedValue(null);
  });

  it("rejects a booking that overlaps scheduled maintenance", async () => {
    mocks.maintenanceFindFirst.mockResolvedValue({ id: "maintenance-1" });

    const response = await POST(
      new Request("http://localhost/api/reservations", {
        method: "POST",
        body: JSON.stringify(futureBooking),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "This resource is scheduled for maintenance during that time.",
    });
    expect(mocks.reservationCreate).not.toHaveBeenCalled();
  });

  it("prevents a member from cancelling another member's reservation", async () => {
    mocks.reservationFindUnique.mockResolvedValue({ id: "booking-1", userId: "another-user" });

    const response = await PATCH(
      new Request("http://localhost/api/reservations/booking-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "CANCEL" }),
      }),
      { params: Promise.resolve({ id: "booking-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "You can only cancel your own reservations.",
    });
    expect(mocks.reservationUpdate).not.toHaveBeenCalled();
  });
});
