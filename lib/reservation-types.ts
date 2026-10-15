import { formatWorkspaceTime } from "@/lib/workspace-time";

export type User = { id: string; name: string; role: "ADMIN" | "MEMBER" };
export type ResourceType = "MEETING_ROOM" | "CREATIVE_SPACE" | "EQUIPMENT";
export type ApiResource = {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  capacity: number;
  status: "AVAILABLE" | "MAINTENANCE";
  maintenanceWindows?: { id: string; startTime: string; endTime: string }[];
};
export type ApiReservation = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  resource: ApiResource;
  user: User;
};
export type Resource = ApiResource & {
  displayStatus: "Available" | "In use" | "Maintenance";
  color: string;
};
export type Reservation = ApiReservation & {
  time: string;
  displayStatus: "Confirmed" | "Upcoming";
};
export type MaintenanceSchedule = {
  id: string;
  startTime: string;
  endTime: string;
  resource: ApiResource;
};

export const resourceTypeLabels: Record<ResourceType, string> = {
  MEETING_ROOM: "Meeting room",
  CREATIVE_SPACE: "Creative space",
  EQUIPMENT: "Equipment",
};

const colors: Record<string, string> = {
  "Orchid Meeting Room": "violet",
  "Focus Room 02": "orange",
  "Design Lab": "blue",
  "Projector Kit A": "rose",
};

export function mapDashboard(data: {
  resources: ApiResource[];
  reservations: ApiReservation[];
  todayReservations: ApiReservation[];
  maintenanceSchedules?: MaintenanceSchedule[];
}) {
  const now = new Date();
  const activeResourceIds = new Set(
    data.todayReservations
      .filter((item) => new Date(item.startTime) <= now && new Date(item.endTime) > now)
      .map((item) => item.resource.id),
  );
  const toReservation = (reservation: ApiReservation): Reservation => ({
    ...reservation,
    time: `${formatWorkspaceTime(reservation.startTime)} - ${formatWorkspaceTime(reservation.endTime)}`,
    displayStatus: new Date(reservation.startTime) > now ? "Upcoming" : "Confirmed",
  });

  return {
    resources: data.resources.map((resource): Resource => ({
      ...resource,
      color: colors[resource.name] ?? "blue",
      displayStatus:
        resource.status === "MAINTENANCE" ||
        resource.maintenanceWindows?.some(
          (window) => new Date(window.startTime) <= now && new Date(window.endTime) > now,
        )
          ? "Maintenance"
          : activeResourceIds.has(resource.id)
            ? "In use"
            : "Available",
    })),
    reservations: data.reservations.map(toReservation),
    todayReservations: data.todayReservations.map(toReservation),
    maintenanceSchedules: data.maintenanceSchedules ?? [],
  };
}
