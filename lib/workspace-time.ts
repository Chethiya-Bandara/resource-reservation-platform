export const WORKSPACE_TIME_ZONE = "Asia/Colombo";

const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getWorkspaceDayRange(now = new Date()) {
  const shiftedNow = new Date(now.getTime() + COLOMBO_OFFSET_MS);
  const start = new Date(
    Date.UTC(shiftedNow.getUTCFullYear(), shiftedNow.getUTCMonth(), shiftedNow.getUTCDate()) -
      COLOMBO_OFFSET_MS,
  );

  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

export function toWorkspaceDateInputValue(value: string | Date = new Date()) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WORKSPACE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((currentPart) => currentPart.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatWorkspaceTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: WORKSPACE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function parseWorkspaceDateTime(value: unknown) {
  if (typeof value !== "string") return new Date("");

  const hasTimeZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
  return new Date(hasTimeZone ? value : `${value}+05:30`);
}
