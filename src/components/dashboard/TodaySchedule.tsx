import Link from "next/link";
import { format } from "date-fns";
import { Calendar, ChevronRight } from "lucide-react";
import { ShiftWithUser } from "@/types";
import { formatTime, positionLabel, positionColor, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TodayScheduleProps {
  shifts: ShiftWithUser[];
}

export function TodaySchedule({ shifts }: TodayScheduleProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Today&apos;s Schedule</h2>
          <p className="text-sm text-gray-500">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <Link
          href="/schedule"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View schedule <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-gray-50">
        {shifts.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No shifts scheduled for today</p>
          </div>
        ) : (
          shifts.slice(0, 8).map((shift) => (
            <div key={shift.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                {getInitials(shift.user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{shift.user.name}</p>
                <p className="text-xs text-gray-500">
                  {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                </p>
              </div>
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", positionColor(shift.position))}>
                {positionLabel(shift.position)}
              </span>
            </div>
          ))
        )}
        {shifts.length > 8 && (
          <div className="px-6 py-3 text-center">
            <Link href="/schedule" className="text-sm text-blue-600 hover:text-blue-700">
              +{shifts.length - 8} more shifts
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
