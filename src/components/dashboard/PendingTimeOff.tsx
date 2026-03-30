import Link from "next/link";
import { format } from "date-fns";
import { CalendarOff, ChevronRight } from "lucide-react";
import { TimeOffRequestWithUser } from "@/types";
import { getInitials } from "@/lib/utils";

interface PendingTimeOffProps {
  requests: TimeOffRequestWithUser[];
}

export function PendingTimeOff({ requests }: PendingTimeOffProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">Pending Time-Off</h2>
        <Link href="/time-off" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-gray-50">
        {requests.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CalendarOff className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-500 text-xs">No pending requests</p>
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="px-5 py-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-semibold text-orange-700 flex-shrink-0">
                {getInitials(req.user.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{req.user.name}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(req.startDate), "MMM d")} – {format(new Date(req.endDate), "MMM d")}
                </p>
              </div>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 flex-shrink-0">
                Pending
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
