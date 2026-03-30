"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { ShiftWithUser } from "@/types";
import { ShiftCard } from "./ShiftCard";
import { ShiftModal } from "./ShiftModal";
import { cn, positionColor, positionLabel } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface WeeklyScheduleProps {
  userRole: string;
  userId: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklySchedule({ userRole, userId }: WeeklyScheduleProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [shifts, setShifts] = useState<ShiftWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftWithUser | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<Date | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  const isManager = userRole === "ADMIN" || userRole === "MANAGER";

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate: weekStartISO, endDate: weekEndISO });
      const res = await fetch(`/api/shifts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch shifts");
      const data = await res.json();
      setShifts(data);
    } catch {
      toast({ title: "Error", description: "Failed to load schedule.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartISO, weekEndISO]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.filter((s) => format(new Date(s.date), "yyyy-MM-dd") === dateStr);
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/shifts/${shiftId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      toast({ title: "Shift deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete shift.", variant: "destructive" });
    }
  };

  const handleSaveShift = (shift: ShiftWithUser) => {
    setShifts((prev) => {
      const exists = prev.find((s) => s.id === shift.id);
      if (exists) return prev.map((s) => (s.id === shift.id ? shift : s));
      return [...prev, shift];
    });
    setShowModal(false);
    setEditingShift(null);
  };

  const openAddShift = (date?: Date) => {
    setEditingShift(null);
    setPreselectedDate(date ?? null);
    setShowModal(true);
  };

  const openEditShift = (shift: ShiftWithUser) => {
    setEditingShift(shift);
    setPreselectedDate(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-900">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchShifts}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          {isManager && (
            <button
              onClick={() => openAddShift()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Shift
            </button>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAYS.map((day, i) => {
            const date = addDays(weekStart, i);
            const today = isToday(date);
            return (
              <div
                key={day}
                className={cn(
                  "px-3 py-3 text-center border-r border-gray-100 last:border-r-0",
                  today && "bg-blue-50"
                )}
              >
                <p className={cn("text-xs font-medium uppercase tracking-wide", today ? "text-blue-600" : "text-gray-500")}>
                  {day}
                </p>
                <p className={cn("text-lg font-semibold mt-0.5", today ? "text-blue-600" : "text-gray-900")}>
                  {format(date, "d")}
                </p>
              </div>
            );
          })}
        </div>

        {/* Shifts grid */}
        <div className="grid grid-cols-7 min-h-[480px]">
          {DAYS.map((day, i) => {
            const date = addDays(weekStart, i);
            const dayShifts = getShiftsForDay(date);
            const today = isToday(date);

            return (
              <div
                key={day}
                className={cn(
                  "border-r border-gray-100 last:border-r-0 p-2 space-y-1.5 min-h-[480px]",
                  today && "bg-blue-50/30"
                )}
              >
                {loading ? (
                  <div className="space-y-2 pt-1">
                    {[1, 2].map((k) => (
                      <div key={k} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    {dayShifts.map((shift) => (
                      <ShiftCard
                        key={shift.id}
                        shift={shift}
                        canEdit={isManager}
                        currentUserId={userId}
                        onEdit={openEditShift}
                        onDelete={handleDeleteShift}
                      />
                    ))}
                    {isManager && (
                      <button
                        onClick={() => openAddShift(date)}
                        className="w-full py-1.5 rounded-lg border border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition text-xs flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {(["SERVER", "BARTENDER", "HOST", "COOK", "SOUS_CHEF", "HEAD_CHEF", "BUSSER", "DISHWASHER"] as const).map((pos) => (
          <span key={pos} className={cn("px-2.5 py-1 rounded-full text-xs font-medium", positionColor(pos))}>
            {positionLabel(pos)}
          </span>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <ShiftModal
          open={showModal}
          onClose={() => { setShowModal(false); setEditingShift(null); }}
          onSave={handleSaveShift}
          editingShift={editingShift}
          preselectedDate={preselectedDate}
        />
      )}
    </div>
  );
}
