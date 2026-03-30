"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays, isToday, isBefore } from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw, ArrowLeftRight, Gift, StickyNote } from "lucide-react";
import { ShiftWithUser } from "@/types";
import { cn, formatTime, formatShiftDuration, positionLabel, getInitials } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { SwapRequestModal } from "../shifts/SwapRequestModal";
import { ShiftNotesViewModal } from "../shifts/ShiftNotesViewModal";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface EmployeeScheduleFeedProps {
  userId: string;
}

export function EmployeeScheduleFeed({ userId }: EmployeeScheduleFeedProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [allShifts, setAllShifts] = useState<ShiftWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapShift, setSwapShift] = useState<ShiftWithUser | null>(null);
  const [notesShift, setNotesShift] = useState<ShiftWithUser | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?startDate=${weekStartISO}&endDate=${weekEndISO}`);
      const data = await res.json();
      // Only show published shifts to employees
      setAllShifts(data.filter((s: ShiftWithUser) => s.status !== "DRAFT"));
    } catch {
      toast({ title: "Error", description: "Failed to load schedule.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartISO, weekEndISO]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return allShifts.filter((s) => format(new Date(s.date), "yyyy-MM-dd") === dateStr);
  };

  const myShiftsThisWeek = allShifts.filter((s) => s.userId === userId);
  const totalHours = myShiftsThisWeek.reduce((sum, s) => {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    return sum + mins / 60;
  }, 0);

  return (
    <div className="space-y-5">
      {/* Week summary banner */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-600 text-white rounded-xl p-4 shadow-sm">
          <p className="text-blue-200 text-xs font-medium">My Shifts This Week</p>
          <p className="text-2xl font-bold mt-1">{myShiftsThisWeek.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-xs font-medium">Total Hours</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-xs font-medium">Week of</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900 px-2">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </span>
          <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentWeek(new Date())} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
            This Week
          </button>
          <button onClick={fetchShifts} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-7 gap-3">
        {DAYS.map((dayLabel, i) => {
          const date = addDays(weekStart, i);
          const today = isToday(date);
          const dayShifts = getShiftsForDay(date);
          const myDayShifts = dayShifts.filter((s) => s.userId === userId);
          const otherShifts = dayShifts.filter((s) => s.userId !== userId);
          const isPast = isBefore(date, new Date()) && !today;

          return (
            <div key={i} className={cn("rounded-xl border overflow-hidden", today ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-200")}>
              {/* Day header */}
              <div className={cn("px-3 py-2 text-center", today ? "bg-blue-600 text-white" : isPast ? "bg-gray-50" : "bg-white border-b border-gray-100")}>
                <p className={cn("text-xs font-medium uppercase tracking-wide", today ? "text-blue-100" : "text-gray-500")}>{dayLabel}</p>
                <p className={cn("text-lg font-bold", today ? "text-white" : "text-gray-900")}>{format(date, "d")}</p>
              </div>

              {/* Shifts */}
              <div className={cn("p-2 min-h-[120px] space-y-1.5", isPast ? "bg-gray-50/50" : "bg-white")}>
                {loading ? (
                  <div className="space-y-1">
                    <div className="h-10 bg-gray-100 rounded animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    {/* My shifts — highlighted */}
                    {myDayShifts.map((shift) => (
                      <div key={shift.id} className="bg-blue-600 text-white rounded-lg p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">My Shift</span>
                          {shift.shiftNotes && shift.shiftNotes.length > 0 && (
                            <button onClick={() => setNotesShift(shift)} className="p-0.5 rounded hover:bg-blue-500">
                              <StickyNote className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-blue-100">{formatTime(shift.startTime)}–{formatTime(shift.endTime)}</p>
                        <p className="text-blue-200 text-[10px]">{formatShiftDuration(shift.startTime, shift.endTime)}</p>
                        {!isPast && (
                          <div className="flex gap-1 mt-1.5">
                            <button
                              onClick={() => setSwapShift({ ...shift, type: "SWAP" } as any)}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500 hover:bg-blue-400 rounded text-[10px] transition"
                            >
                              <ArrowLeftRight className="w-2.5 h-2.5" /> Swap
                            </button>
                            <button
                              onClick={() => setSwapShift({ ...shift, type: "GIVEAWAY" } as any)}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500 hover:bg-blue-400 rounded text-[10px] transition"
                            >
                              <Gift className="w-2.5 h-2.5" /> Give
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Other employees' shifts — dimmed */}
                    {otherShifts.slice(0, 3).map((shift) => (
                      <div key={shift.id} className="bg-gray-100 rounded-lg p-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-slate-500 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
                            {getInitials(shift.user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-gray-700 font-medium truncate">{shift.user.name.split(" ")[0]}</p>
                            <p className="text-gray-500 text-[10px]">{formatTime(shift.startTime)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {otherShifts.length > 3 && (
                      <p className="text-[10px] text-gray-400 text-center">+{otherShifts.length - 3} more</p>
                    )}

                    {myDayShifts.length === 0 && otherShifts.length === 0 && (
                      <p className="text-[10px] text-gray-300 text-center pt-3">Off</p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {swapShift && (
        <SwapRequestModal
          shift={swapShift}
          open={!!swapShift}
          onClose={() => setSwapShift(null)}
          defaultType={(swapShift as any).type ?? "SWAP"}
        />
      )}
      {notesShift && (
        <ShiftNotesViewModal
          shift={notesShift}
          userId={userId}
          open={!!notesShift}
          onClose={() => setNotesShift(null)}
        />
      )}
    </div>
  );
}
