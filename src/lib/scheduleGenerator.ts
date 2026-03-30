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
  const availEnd = timeToMinutes(avail.endTime);
  const shiftStartMins = timeToMinutes(shiftStart);
  let shiftEndMins = timeToMinutes(shiftEnd);
  if (shiftEndMins <= shiftStartMins) shiftEndMins += 24 * 60; // overnight

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
 * Performance balancing rules:
 * - For each shift slot, sort candidates by score descending.
 * - Track how many low-scorers (< 40) are already assigned to this shift.
 * - Limit low-scorers to at most 1 per shift (if other options exist).
 */
export function generateWeeklySchedule(
  weekOf: Date,
  employees: EmployeeRecord[],
  timeOff: TimeOffRecord[],
  config: RestaurantConfig
): GeneratedShift[] {
  const shifts: GeneratedShift[] = [];
  const weekStart = startOfWeek(weekOf, { weekStartsOn: 1 });
  // Track shifts assigned per employee per week to limit overloading
  const employeeShiftCount: Record<string, number> = {};
  const MAX_SHIFTS_PER_WEEK = 5;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = addDays(weekStart, dayOffset);
    const dayOfWeek = DAYS_OF_WEEK[dayOffset];

    if (!config.openDays.includes(dayOfWeek)) continue;

    for (const template of config.shiftTemplates) {
      // Find all eligible employees for this slot
      const eligible = employees.filter(
        (emp) =>
          isEmployeeAvailableForShift(emp, dayOfWeek, template.start, template.end) &&
          !isEmployeeOnTimeOff(emp, date, timeOff) &&
          (employeeShiftCount[emp.id] ?? 0) < MAX_SHIFTS_PER_WEEK
      );

      // Sort by performance score descending
      const sorted = [...eligible].sort((a, b) => b.performanceScore - a.performanceScore);

      const assigned: EmployeeRecord[] = [];
      let lowPerformerCount = 0;

      for (const emp of sorted) {
        if (assigned.length >= config.minStaffPerShift) break;

        const isLowPerformer = emp.performanceScore < 40;
        // Limit to max 1 low-performer per shift, only if we still need bodies
        if (isLowPerformer && lowPerformerCount >= 1 && assigned.length < config.minStaffPerShift - 1) {
          // Skip this low performer for now, try next
          continue;
        }

        assigned.push(emp);
        if (isLowPerformer) lowPerformerCount++;
      }

      // If still under min and we skipped some, add skipped low-performers
      if (assigned.length < config.minStaffPerShift) {
        for (const emp of sorted) {
          if (assigned.length >= config.minStaffPerShift) break;
          if (!assigned.find((a) => a.id === emp.id)) {
            assigned.push(emp);
          }
        }
      }

      for (const emp of assigned) {
        employeeShiftCount[emp.id] = (employeeShiftCount[emp.id] ?? 0) + 1;
        shifts.push({
          userId: emp.id,
          date,
          startTime: template.start,
          endTime: template.end,
          position: emp.position,
          status: "DRAFT",
        });
      }
    }
  }

  return shifts;
}
