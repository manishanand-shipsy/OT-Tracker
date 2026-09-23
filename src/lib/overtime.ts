import { addDays, startOfDay, isWithinInterval } from "date-fns";
import type { ApprovalDecision } from "@/generated/prisma/client";

export const LOGGING_WINDOW_DAYS = 3;

/** Entries may only be logged for [today - 3 days, today + 3 days], inclusive. */
export function isWithinLoggingWindow(date: Date, now: Date = new Date()): boolean {
  const today = startOfDay(now);
  const start = addDays(today, -LOGGING_WINDOW_DAYS);
  const end = addDays(today, LOGGING_WINDOW_DAYS);
  const target = startOfDay(date);
  return isWithinInterval(target, { start, end });
}

export function loggingWindowBounds(now: Date = new Date()) {
  const today = startOfDay(now);
  return {
    min: addDays(today, -LOGGING_WINDOW_DAYS),
    max: addDays(today, LOGGING_WINDOW_DAYS),
  };
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parses "HH:mm" into minutes since midnight, or throws if malformed. */
function toMinutes(time: string): number {
  const match = TIME_RE.exec(time);
  if (!match) throw new Error(`Invalid time "${time}", expected HH:mm`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Hours worked between two "HH:mm" times on the same day. If `endTime` is
 * not after `startTime`, the shift is assumed to cross midnight (e.g.
 * 22:00 -> 02:00 is 4 hours), matching how overnight overtime is usually
 * logged.
 */
export function computeHoursFromRange(startTime: string, endTime: string): number {
  const start = toMinutes(startTime);
  let end = toMinutes(endTime);
  if (end <= start) end += 24 * 60;
  return Math.round(((end - start) / 60) * 100) / 100;
}

/** Parallel approval: APPROVED only when every decision is APPROVED; REJECTED if any is REJECTED. */
export function computeEntryStatus(
  decisions: ApprovalDecision[]
): "PENDING" | "APPROVED" | "REJECTED" {
  if (decisions.some((d) => d === "REJECTED")) return "REJECTED";
  if (decisions.every((d) => d === "APPROVED")) return "APPROVED";
  return "PENDING";
}
