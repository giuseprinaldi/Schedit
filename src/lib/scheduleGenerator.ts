import { addDays, format, startOfWeek } from "date-fns";
import { DayOfWeek, ShiftTemplate, DAYS_OF_WEEK } from "@/types";

interface EmployeeRecord {
  id: string;
  name: string;
  position: string;
  performanceScore: number;
  availability: { dayOfWeek: string; startTime: string; endTime: string; isAvailable: boolean }[];
}

interface TimeOffRecord {
  userId: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

interface RestaurantConfig {
  openDays: DayOfWeek[];
  shiftTemplates: ShiftTemplate[];
  minStaffPerShift: number;
}

interface GeneratedShift {
  userId: string;
  date: Date;
  startTime: string;
  endTime: string;
  position: string;
  status: "DRAFT";
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isEmployeeAvailableForShift(
  employee: EmployeeRecord,
  dayOfWeek: DayOfWeek,
  shiftStart: string,
  shiftEnd: string
): boolean {
  const avail = employee.availability.find((a) => a.dayOfWeek === dayOfWeek);
  if (!avail || !avail.isAvailable) return false;

  const availStart = timeToMinutes(avail.startTime);
  let availEnd = timeToMinutes(avail.endTime);
  // "00:00" as an end time means midnight (end of day = 1440 mins)
  if (availEnd === 0) availEnd = 24 * 60;

  const shiftStartMins = timeToMinutes(shiftStart);
  let shiftEndMins = timeToMinutes(shiftEnd);
  if (shiftEndMins === 0) shiftEndMins = 24 * 60; // "00:00" end = midnight
  if (shiftEndMins <= shiftStartMins) shiftEndMins += 24 * 60; // other overnight

  return availStart <= shiftStartMins && availEnd >= shiftEndMins;
}

function isEmployeeOnTimeOff(employee: EmployeeRecord, date: Date, timeOffRecords: TimeOffRecord[]): boolean {
  const dateStr = format(date, "yyyy-MM-dd");
  return timeOffRecords.some(
    (req) =>
      req.userId === employee.id &&
      req.status === "APPROVED" &&
      format(req.startDate, "yyyy-MM-dd") <= dateStr &&
      format(req.endDate, "yyyy-MM-dd") >= dateStr
  );
}

/**
 * Generate a draft schedule for the given week.
 *
 * Position-aware: when a shift template has `positions`, one employee per
 * position is assigned (matching by emp.position). Falls back to minStaffPerShift
 * when no positions are defined.
 *
 * Fairness: candidates are sorted by current week shift count (ascending) first,
 * then performance score (descending). This distributes shifts evenly across days
 * instead of frontloading top performers on Mon–Wed.
 */
export function generateWeeklySchedule(
  weekOf: Date,
  employees: EmployeeRecord[],
  timeOff: TimeOffRecord[],
  config: RestaurantConfig
): GeneratedShift[] {
  const shifts: GeneratedShift[] = [];
  const weekStart = startOfWeek(weekOf, { weekStartsOn: 1 });
  const employeeShiftCount: Record<string, number> = {};

  // Max shifts per employee per week — generous enough to fill all 7 days
  // when there's only one employee of a given position.
  const MAX_SHIFTS_PER_WEEK = 6;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = addDays(weekStart, dayOffset);
    const dayOfWeek = DAYS_OF_WEEK[dayOffset];

    if (!config.openDays.includes(dayOfWeek)) continue;

    for (const template of config.shiftTemplates) {
      // If the template defines position slots, fill one employee per slot.
      // Otherwise fall back to generic minStaffPerShift behaviour.
      const positionSlots: (string | null)[] =
        template.positions && template.positions.length > 0
          ? template.positions
          : [null];

      for (const slotPosition of positionSlots) {
        // Eligible: matches position (if slot requires it), available, not on leave, under max
        const eligible = employees.filter((emp) => {
          if (slotPosition && emp.position !== slotPosition) return false;
          return (
            isEmployeeAvailableForShift(emp, dayOfWeek, template.start, template.end) &&
            !isEmployeeOnTimeOff(emp, date, timeOff) &&
            (employeeShiftCount[emp.id] ?? 0) < MAX_SHIFTS_PER_WEEK
          );
        });

        // Sort by: fewest shifts this week first (fairness), then highest score
        const sorted = [...eligible].sort((a, b) => {
          const countDiff = (employeeShiftCount[a.id] ?? 0) - (employeeShiftCount[b.id] ?? 0);
          if (countDiff !== 0) return countDiff;
          return b.performanceScore - a.performanceScore;
        });

        // Position-based slot: 1 person per slot.
        // Generic slot: up to minStaffPerShift (with low-performer cap).
        const targetCount = slotPosition ? 1 : config.minStaffPerShift;
        const assigned: EmployeeRecord[] = [];

        if (slotPosition) {
          // Simple: take the best available employee for this position
          if (sorted.length > 0) assigned.push(sorted[0]);
        } else {
          // Generic: fill up to target, limit low-performers to 1
          let lowPerformerCount = 0;
          for (const emp of sorted) {
            if (assigned.length >= targetCount) break;
            const isLow = emp.performanceScore < 40;
            if (isLow && lowPerformerCount >= 1 && assigned.length < targetCount - 1) continue;
            assigned.push(emp);
            if (isLow) lowPerformerCount++;
          }
          // Fill any remaining gaps with whoever is left
          for (const emp of sorted) {
            if (assigned.length >= targetCount) break;
            if (!assigned.find((a) => a.id === emp.id)) assigned.push(emp);
          }
        }

        for (const emp of assigned) {
          employeeShiftCount[emp.id] = (employeeShiftCount[emp.id] ?? 0) + 1;
          shifts.push({
            userId: emp.id,
            date,
            startTime: template.start,
            endTime: template.end,
            position: slotPosition ?? emp.position,
            status: "DRAFT",
          });
        }
      }
    }
  }

  return shifts;
}
