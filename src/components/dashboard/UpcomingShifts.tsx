import { format, isToday, isTomorrow } from "date-fns";
import { Clock } from "lucide-react";
import { ShiftWithUser } from "@/types";
import { formatTime, formatShiftDuration } from "@/lib/utils";

interface UpcomingShiftsProps {
  shifts: ShiftWithUser[];
}

function formatShiftDate(date: Date) {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

export function UpcomingShifts({ shifts }: UpcomingShiftsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-sm">My Upcoming Shifts</h2>
      </div>

      <div className="divide-y divide-gray-50">
        {shifts.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-500 text-xs">No upcoming shifts</p>
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="px-5 py-3.5">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-medium text-gray-900">{formatShiftDate(shift.date)}</p>
                <span className="text-xs text-gray-500">{formatShiftDuration(shift.startTime, shift.endTime)}</span>
              </div>
              <p className="text-xs text-gray-500">
                {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
