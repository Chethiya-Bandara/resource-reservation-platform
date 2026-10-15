import { ResourceStatus, ResourceType, UserRole } from "@/src/generated/prisma/enums";
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
  await prisma.user.upsert({
    where: { email: "chethiya@reservely.local" },
    update: { name: "Chethiya Bandara", role: UserRole.ADMIN },
    create: { name: "Chethiya Bandara", email: "chethiya@reservely.local", role: UserRole.ADMIN },
  });

  await prisma.user.upsert({
    where: { email: "maya@reservely.local" },
    update: { name: "Maya Chen", role: UserRole.MEMBER },
    create: { name: "Maya Chen", email: "maya@reservely.local", role: UserRole.MEMBER },
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
