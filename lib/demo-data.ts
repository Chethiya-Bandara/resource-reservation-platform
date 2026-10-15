import { ResourceStatus, ResourceType, UserRole } from "@/src/generated/prisma/enums";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

const resources = [
  {
    name: "Orchid Meeting Room",
    type: ResourceType.MEETING_ROOM,
    location: "Level 3",
    capacity: 12,
    status: ResourceStatus.AVAILABLE,
  },
  {
    name: "Focus Room 02",
    type: ResourceType.MEETING_ROOM,
    location: "Level 2",
    capacity: 4,
    status: ResourceStatus.AVAILABLE,
  },
  {
    name: "Design Lab",
    type: ResourceType.CREATIVE_SPACE,
    location: "Level 4",
    capacity: 8,
    status: ResourceStatus.AVAILABLE,
  },
  {
    name: "Projector Kit A",
    type: ResourceType.EQUIPMENT,
    location: "IT Store",
    capacity: 1,
    status: ResourceStatus.MAINTENANCE,
  },
];

export async function ensureDemoData() {
  const demoPasswordHash = await hash("Reservely123", 12);
  await prisma.user.upsert({
    where: { email: "chethiya@reservely.local" },
    update: { name: "Chethiya Bandara", role: UserRole.ADMIN, passwordHash: demoPasswordHash },
    create: {
      name: "Chethiya Bandara",
      email: "chethiya@reservely.local",
      role: UserRole.ADMIN,
      passwordHash: demoPasswordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "maya@reservely.local" },
    update: { name: "Maya Chen", role: UserRole.MEMBER, passwordHash: demoPasswordHash },
    create: {
      name: "Maya Chen",
      email: "maya@reservely.local",
      role: UserRole.MEMBER,
      passwordHash: demoPasswordHash,
    },
  });

  await Promise.all(
    resources.map((resource) =>
      prisma.resource.upsert({
        where: { name: resource.name },
        update: {},
        create: resource,
      }),
    ),
  );
}
