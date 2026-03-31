"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays, isToday, isBefore } from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw, ArrowLeftRight, Gift, StickyNote, UserCheck } from "lucide-react";
import { ShiftWithUser, ShiftSwapRequestWithDetails } from "@/types";
import { cn, formatTime, formatShiftDuration, positionLabel } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { SwapRequestModal } from "../shifts/SwapRequestModal";
import { ShiftNotesViewModal } from "../shifts/ShiftNotesViewModal";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface EmployeeScheduleFeedProps {
  userId: string;
}

export function EmployeeScheduleFeed({ userId }: EmployeeScheduleFeedProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [myShifts, setMyShifts] = useState<ShiftWithUser[]>([]);
  const [forGrabsRequests, setForGrabsRequests] = useState<ShiftSwapRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [swapShift, setSwapShift] = useState<ShiftWithUser | null>(null);
  const [notesShift, setNotesShift] = useState<ShiftWithUser | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [shiftsRes, swapRes] = await Promise.all([
        fetch(`/api/shifts?startDate=${weekStartISO}&endDate=${weekEndISO}&userId=${userId}`),
        fetch(`/api/swap-requests?status=PENDING`),
      ]);
      const [shiftsData, swapData] = await Promise.all([shiftsRes.json(), swapRes.json()]);

      // Only show own published shifts
      const published = Array.isArray(shiftsData)
        ? shiftsData.filter((s: ShiftWithUser) => s.userId === userId && s.isPublished)
        : [];
      setMyShifts(published);

      // For grabs: PENDING GIVEAWAY from other employees (no claimer yet)
      const grabs = Array.isArray(swapData)
        ? swapData.filter(
            (r: ShiftSwapRequestWithDetails) =>
              r.type === "GIVEAWAY" &&
              r.status === "PENDING" &&
              r.requesterId !== userId &&
              !r.targetId
          )
        : [];
      setForGrabsRequests(grabs);
    } catch {
      toast({ title: "Error", description: "Failed to load schedule.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartISO, weekEndISO, userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getMyShiftsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return myShifts.filter((s) => format(new Date(s.date), "yyyy-MM-dd") === dateStr);
  };

  const totalHours = myShifts.reduce((sum, s) => {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    return sum + mins / 60;
  }, 0);

  const handleClaim = async (requestId: string) => {
    setClaimingId(requestId);
    try {
      const res = await fetch(`/api/swap-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast({ title: "Claim submitted!", description: "Awaiting admin approval." });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Week summary banner */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-600 text-white rounded-xl p-4 shadow-sm">
          <p className="text-blue-200 text-xs font-medium">My Shifts This Week</p>
          <p className="text-2xl font-bold mt-1">{myShifts.length}</p>
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
        <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Weekly grid — my shifts only */}
      <div className="grid grid-cols-7 gap-3">
        {DAYS.map((dayLabel, i) => {
          const date = addDays(weekStart, i);
          const today = isToday(date);
          const dayShifts = getMyShiftsForDay(date);
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
                  <div className="h-10 bg-gray-100 rounded animate-pulse" />
                ) : dayShifts.length > 0 ? (
                  dayShifts.map((shift) => (
                    <div key={shift.id} className="bg-blue-600 text-white rounded-lg p-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{positionLabel(shift.position)}</span>
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
                  ))
                ) : (
                  <p className="text-[10px] text-gray-300 text-center pt-4">Off</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* For Grabs section */}
      {!loading && forGrabsRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-900">Shifts Up for Grabs</h3>
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">{forGrabsRequests.length}</span>
          </div>
          <div className="space-y-2">
            {forGrabsRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {req.requester.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.requester.name}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(req.shift.date), "EEE MMM d")} · {formatTime(req.shift.startTime)}–{formatTime(req.shift.endTime)}
                    </p>
                    <p className="text-xs text-amber-700 font-medium">{positionLabel(req.shift.position)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleClaim(req.id)}
                  disabled={claimingId === req.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {claimingId === req.id ? "Claiming…" : "Claim Shift"}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2">Claims require admin approval before the shift is reassigned.</p>
        </div>
      )}

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
