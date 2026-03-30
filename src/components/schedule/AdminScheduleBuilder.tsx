"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays, isToday } from "date-fns";
import {
  ChevronLeft, ChevronRight, Wand2, Send, Plus, Trash2,
  RefreshCw, AlertCircle, CheckCircle2, StickyNote, X, Pencil,
} from "lucide-react";
import { ShiftWithUser, UserWithStats, ScheduleRecord } from "@/types";
import { cn, positionLabel, getInitials, formatTime, performanceColor } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ShiftModal } from "./ShiftModal";
import { ShiftNotesModal } from "./ShiftNotesModal";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Cell ID helpers — use "::" to avoid conflicts with date dashes
function makeCellId(dateStr: string, tIndex: number): string {
  return `cell::${dateStr}::${tIndex}`;
}
function parseCellId(cellId: string): { dateStr: string; templateIndex: number } | null {
  if (!cellId.startsWith("cell::")) return null;
  const parts = cellId.split("::");
  if (parts.length !== 3) return null;
  return { dateStr: parts[1], templateIndex: parseInt(parts[2]) };
}

// ── Draggable employee card ──────────────────────────────────────────────────
function DraggableEmployee({ employee }: { employee: UserWithStats }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `employee-${employee.id}`,
    data: { type: "employee", employee },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-gray-200 select-none transition",
        "cursor-grab active:cursor-grabbing touch-none",
        isDragging ? "opacity-40 shadow-lg" : "hover:border-blue-300 hover:shadow-sm"
      )}
    >
      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        {getInitials(employee.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-900 truncate">{employee.name}</p>
        <p className="text-xs text-gray-500 truncate">{positionLabel(employee.position)}</p>
      </div>
      <span className={cn("text-xs font-bold tabular-nums flex-shrink-0", performanceColor(employee.performanceScore))}>
        {employee.performanceScore}
      </span>
    </div>
  );
}

// ── Droppable shift cell ─────────────────────────────────────────────────────
function DroppableShiftCell({
  cellId, shifts, onDelete, onAddShift, onOpenNotes, date, templateStart, templateEnd,
}: {
  cellId: string;
  shifts: ShiftWithUser[];
  onDelete: (id: string) => void;
  onAddShift: (date: Date, start: string, end: string) => void;
  onOpenNotes: (shift: ShiftWithUser) => void;
  date: Date;
  templateStart: string;
  templateEnd: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: cellId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[80px] p-1.5 rounded-lg border-2 border-dashed transition-colors space-y-1",
        isOver ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
      )}
    >
      {shifts.map((shift) => (
        <ShiftCellCard key={shift.id} shift={shift} onDelete={onDelete} onOpenNotes={onOpenNotes} />
      ))}
      <button
        onClick={() => onAddShift(date, templateStart, templateEnd)}
        className="w-full py-1 rounded text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center gap-1 transition"
      >
        <Plus className="w-3 h-3" /> Add
      </button>
    </div>
  );
}

function ShiftCellCard({ shift, onDelete, onOpenNotes }: {
  shift: ShiftWithUser;
  onDelete: (id: string) => void;
  onOpenNotes: (shift: ShiftWithUser) => void;
}) {
  const isDraft = shift.status === "DRAFT";
  return (
    <div className={cn(
      "group flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs",
      isDraft ? "bg-yellow-50 border border-yellow-200" : "bg-blue-50 border border-blue-200"
    )}>
      <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
        {getInitials(shift.user.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{shift.user.name.split(" ")[0]}</p>
        <p className={cn("text-[10px]", performanceColor(shift.user.performanceScore))}>
          {shift.user.performanceScore} · {positionLabel(shift.position)}
        </p>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
        <button onClick={() => onOpenNotes(shift)} className="p-0.5 rounded hover:bg-white/80 text-gray-400 hover:text-blue-500" title="Notes">
          <StickyNote className="w-3 h-3" />
        </button>
        <button onClick={() => onDelete(shift.id)} className="p-0.5 rounded hover:bg-white/80 text-gray-400 hover:text-red-500" title="Remove">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── New Schedule Modal ───────────────────────────────────────────────────────
function NewScheduleModal({ onConfirm, onClose }: { onConfirm: (title: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">New Schedule</h3>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && title.trim() && onConfirm(title.trim())}
          placeholder="e.g. Main Floor, Bar, Ice Cream Stand…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => title.trim() && onConfirm(title.trim())}
            disabled={!title.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
interface AdminScheduleBuilderProps {
  currentUserId: string;
}

export function AdminScheduleBuilder({ currentUserId }: AdminScheduleBuilderProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [shifts, setShifts] = useState<ShiftWithUser[]>([]);
  const [employees, setEmployees] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shiftTemplates, setShiftTemplates] = useState<{ name: string; start: string; end: string }[]>([
    { name: "Morning", start: "09:00", end: "17:00" },
    { name: "Evening", start: "16:00", end: "23:00" },
  ]);
  const [activeEmployee, setActiveEmployee] = useState<UserWithStats | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<Date | null>(null);
  const [preselectedTimes, setPreselectedTimes] = useState<{ start: string; end: string } | null>(null);
  const [notesShift, setNotesShift] = useState<ShiftWithUser | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  // Use MouseSensor + TouchSensor for reliable cross-browser drag
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  // Load schedules for the week
  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch(`/api/schedules?weekOf=${weekStart.toISOString()}`);
      if (!res.ok) return;
      const data: ScheduleRecord[] = await res.json();
      setSchedules(data);
      // Auto-select first schedule if none selected or current one gone
      if (data.length > 0 && (!activeScheduleId || !data.find((s) => s.id === activeScheduleId))) {
        setActiveScheduleId(data[0].id);
      } else if (data.length === 0) {
        setActiveScheduleId(null);
        setShifts([]);
      }
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart.toISOString()]);

  // Load shifts for active schedule
  const fetchShifts = useCallback(async () => {
    if (!activeScheduleId) { setShifts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?scheduleId=${activeScheduleId}`);
      if (!res.ok) return;
      const data = await res.json();
      setShifts(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error", description: "Failed to load shifts.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeScheduleId]);

  // Load employees + restaurant settings once
  const fetchStatic = useCallback(async () => {
    try {
      const [empRes, restRes] = await Promise.all([
        fetch("/api/employees?isActive=true"),
        fetch("/api/restaurant"),
      ]);
      const [empData, restData] = await Promise.all([empRes.json(), restRes.json()]);
      setEmployees(Array.isArray(empData) ? empData : []);
      if (restData?.shiftTemplates) setShiftTemplates(restData.shiftTemplates);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStatic(); }, [fetchStatic]);
  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);
  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const activeSchedule = schedules.find((s) => s.id === activeScheduleId) ?? null;
  const hasDraftShifts = shifts.some((s) => s.status === "DRAFT");
  const hasPublishedShifts = shifts.some((s) => s.status === "SCHEDULED");

  const getShiftsForCell = (date: Date, templateStart: string, templateEnd: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.filter(
      (s) =>
        format(new Date(s.date), "yyyy-MM-dd") === dateStr &&
        s.startTime === templateStart &&
        s.endTime === templateEnd
    );
  };

  // ── Create schedule ──────────────────────────────────────────────────────
  const handleCreateSchedule = async (title: string) => {
    setShowNewScheduleModal(false);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, weekOf: weekStart.toISOString() }),
      });
      if (!res.ok) throw new Error();
      const created: ScheduleRecord = await res.json();
      setSchedules((prev) => [...prev, created]);
      setActiveScheduleId(created.id);
    } catch {
      toast({ title: "Error", description: "Failed to create schedule.", variant: "destructive" });
    }
  };

  // ── Delete schedule ──────────────────────────────────────────────────────
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Delete this schedule and all its draft shifts?")) return;
    try {
      await fetch(`/api/schedules/${scheduleId}`, { method: "DELETE" });
      const remaining = schedules.filter((s) => s.id !== scheduleId);
      setSchedules(remaining);
      if (activeScheduleId === scheduleId) {
        setActiveScheduleId(remaining[0]?.id ?? null);
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete schedule.", variant: "destructive" });
    }
  };

  // ── Rename schedule ──────────────────────────────────────────────────────
  const handleRename = async (scheduleId: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      if (!res.ok) throw new Error();
      const updated: ScheduleRecord = await res.json();
      setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? updated : s)));
    } catch {
      toast({ title: "Error", description: "Failed to rename.", variant: "destructive" });
    } finally {
      setRenamingId(null);
    }
  };

  // ── Auto-generate ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!activeScheduleId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekOf: weekStart.toISOString(), scheduleId: activeScheduleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Generation failed", description: data.error, variant: "destructive" });
        return;
      }
      setShifts(data.shifts);
      toast({ title: "Schedule generated", description: `${data.count} shifts created as draft.` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // ── Publish ──────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!activeScheduleId) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/schedule/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: activeScheduleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setShifts((prev) =>
        prev.map((s) => s.status === "DRAFT" ? { ...s, status: "SCHEDULED" as any, isPublished: true } : s)
      );
      setSchedules((prev) =>
        prev.map((s) => s.id === activeScheduleId ? { ...s, isPublished: true } : s)
      );
      toast({ title: "Schedule published!", description: `${data.published} shifts pushed to employees.` });
    } catch {
      toast({ title: "Error", description: "Failed to publish.", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  // ── Delete shift ─────────────────────────────────────────────────────────
  const handleDeleteShift = async (shiftId: string) => {
    try {
      await fetch(`/api/shifts/${shiftId}`, { method: "DELETE" });
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    } catch {
      toast({ title: "Error", description: "Failed to remove shift.", variant: "destructive" });
    }
  };

  // ── Drag events ──────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "employee") {
      setActiveEmployee(event.active.data.current.employee);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveEmployee(null);
    const { active, over } = event;
    if (!over || !activeScheduleId) return;

    const dragData = active.data.current;
    if (dragData?.type !== "employee") return;

    const parsed = parseCellId(String(over.id));
    if (!parsed) return;

    const { dateStr, templateIndex } = parsed;
    const template = shiftTemplates[templateIndex];
    if (!template) return;

    const employee: UserWithStats = dragData.employee;
    // Use noon to avoid timezone day-shift issues
    const date = new Date(`${dateStr}T12:00:00`);

    const existingInCell = getShiftsForCell(date, template.start, template.end);
    if (existingInCell.some((s) => s.userId === employee.id)) {
      toast({ title: "Already scheduled", description: `${employee.name} is already in this slot.` });
      return;
    }

    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: employee.id,
          date: date.toISOString(),
          startTime: template.start,
          endTime: template.end,
          position: employee.position,
          status: "DRAFT",
          scheduleId: activeScheduleId,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setShifts((prev) => [...prev, saved]);
      toast({ title: `${employee.name} → ${template.name}` });
    } catch {
      toast({ title: "Error", description: "Failed to assign shift.", variant: "destructive" });
    }
  };

  const handleAddShift = (date: Date, start: string, end: string) => {
    setPreselectedDate(date);
    setPreselectedTimes({ start, end });
    setShowShiftModal(true);
  };

  const handleShiftSaved = (shift: ShiftWithUser) => {
    setShifts((prev) => {
      const exists = prev.find((s) => s.id === shift.id);
      if (exists) return prev.map((s) => (s.id === shift.id ? shift : s));
      return [...prev, shift];
    });
    setShowShiftModal(false);
  };

  const filteredEmployees = employees
    .filter(
      (e) =>
        e.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        positionLabel(e.position).toLowerCase().includes(searchFilter.toLowerCase()) ||
        (e.department ?? "").toLowerCase().includes(searchFilter.toLowerCase())
    )
    .sort((a, b) => b.performanceScore - a.performanceScore);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-5 h-full">

        {/* ── Left panel — staff ──────────────────────────────────────────── */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Staff</p>
              <p className="text-xs text-gray-500 mt-0.5">Drag onto schedule</p>
            </div>
            <div className="px-3 pt-3">
              <input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter by name / dept…"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filteredEmployees.map((emp) => (
                <DraggableEmployee key={emp.id} employee={emp} />
              ))}
              {filteredEmployees.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No staff found</p>
              )}
            </div>
            <div className="px-3 pb-3">
              <div className="text-xs text-gray-400 space-y-0.5 pt-2 border-t border-gray-100">
                <p className="font-medium text-gray-600 mb-1">Performance</p>
                <p><span className="text-green-600 font-medium">80–100</span> Excellent</p>
                <p><span className="text-blue-600 font-medium">60–79</span> Good</p>
                <p><span className="text-yellow-600 font-medium">40–59</span> Average</p>
                <p><span className="text-red-600 font-medium">0–39</span> Needs work</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel — schedule ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Week navigation */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-900 min-w-[180px] text-center">
                {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
              </span>
              <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentWeek(new Date())} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                This Week
              </button>
              <button onClick={() => { fetchSchedules(); fetchShifts(); }} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50" title="Refresh">
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>

            {/* Publish / generate actions */}
            {activeSchedule && (
              <div className="flex items-center gap-2">
                {hasDraftShifts && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Draft — not visible to employees
                  </div>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50"
                >
                  <Wand2 className={cn("w-4 h-4", generating && "animate-pulse")} />
                  {generating ? "Generating…" : "Auto-Generate"}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={!hasDraftShifts || publishing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50 disabled:bg-gray-300"
                >
                  <Send className="w-4 h-4" />
                  {publishing ? "Publishing…" : "Publish"}
                </button>
              </div>
            )}
          </div>

          {/* Schedule tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
            {schedules.map((sched) => (
              <div
                key={sched.id}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition cursor-pointer",
                  activeScheduleId === sched.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
                onClick={() => setActiveScheduleId(sched.id)}
              >
                {renamingId === sched.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(sched.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(sched.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-28 px-1 text-sm border border-blue-400 rounded focus:outline-none"
                  />
                ) : (
                  <>
                    <span>{sched.title}</span>
                    {sched.isPublished && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); setRenamingId(sched.id); setRenameValue(sched.title); }}
                      className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(sched.id); }}
                      className="p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                      title="Delete schedule"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* + New schedule button */}
            <button
              onClick={() => setShowNewScheduleModal(true)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-t-lg transition border-b-2 border-transparent whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Schedule
            </button>
          </div>

          {/* Empty state */}
          {schedules.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 py-20 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-gray-500 font-medium">No schedules for this week</p>
              <p className="text-sm text-gray-400">Create a schedule to start adding shifts</p>
              <button
                onClick={() => setShowNewScheduleModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> New Schedule
              </button>
            </div>
          )}

          {/* Status legend */}
          {activeSchedule && (hasDraftShifts || hasPublishedShifts) && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {hasDraftShifts && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300 inline-block" />
                  Draft (admin only)
                </span>
              )}
              {hasPublishedShifts && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  Published
                </span>
              )}
            </div>
          )}

          {/* Grid */}
          {activeSchedule && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Day headers */}
              <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: `90px repeat(7, 1fr)` }}>
                <div className="px-3 py-3 bg-gray-50 text-xs font-medium text-gray-500 border-r border-gray-200">Shift</div>
                {DAYS.map((day, i) => {
                  const date = addDays(weekStart, i);
                  const today = isToday(date);
                  return (
                    <div key={day} className={cn("px-2 py-3 text-center border-r border-gray-100 last:border-r-0", today && "bg-blue-50")}>
                      <p className={cn("text-xs font-medium uppercase tracking-wide", today ? "text-blue-600" : "text-gray-500")}>{day}</p>
                      <p className={cn("text-base font-semibold", today ? "text-blue-600" : "text-gray-900")}>{format(date, "d")}</p>
                    </div>
                  );
                })}
              </div>

              {shiftTemplates.map((template, tIndex) => (
                <div key={tIndex} className="grid border-b border-gray-100 last:border-b-0" style={{ gridTemplateColumns: `90px repeat(7, 1fr)` }}>
                  <div className="px-3 py-3 bg-gray-50 border-r border-gray-200 flex flex-col justify-center">
                    <p className="text-xs font-semibold text-gray-700">{template.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatTime(template.start)}–{formatTime(template.end)}
                    </p>
                  </div>
                  {DAYS.map((_, dayIndex) => {
                    const date = addDays(weekStart, dayIndex);
                    const dateStr = format(date, "yyyy-MM-dd");
                    const cellId = makeCellId(dateStr, tIndex);
                    const cellShifts = getShiftsForCell(date, template.start, template.end);
                    const today = isToday(date);
                    return (
                      <div key={dayIndex} className={cn("p-1.5 border-r border-gray-100 last:border-r-0", today && "bg-blue-50/30")}>
                        {loading ? (
                          <div className="min-h-[80px] bg-gray-50 rounded-lg animate-pulse" />
                        ) : (
                          <DroppableShiftCell
                            cellId={cellId}
                            shifts={cellShifts}
                            onDelete={handleDeleteShift}
                            onAddShift={handleAddShift}
                            onOpenNotes={(s) => setNotesShift(s)}
                            date={date}
                            templateStart={template.start}
                            templateEnd={template.end}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeEmployee && (
          <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border-2 border-blue-400 shadow-xl w-52 cursor-grabbing opacity-95">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
              {getInitials(activeEmployee.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 truncate">{activeEmployee.name}</p>
              <p className="text-xs text-gray-500">{positionLabel(activeEmployee.position)}</p>
            </div>
          </div>
        )}
      </DragOverlay>

      {showNewScheduleModal && (
        <NewScheduleModal
          onConfirm={handleCreateSchedule}
          onClose={() => setShowNewScheduleModal(false)}
        />
      )}

      {showShiftModal && (
        <ShiftModal
          open={showShiftModal}
          onClose={() => setShowShiftModal(false)}
          onSave={handleShiftSaved}
          editingShift={null}
          preselectedDate={preselectedDate}
          preselectedTimes={preselectedTimes}
        />
      )}

      {notesShift && (
        <ShiftNotesModal
          shift={notesShift}
          open={!!notesShift}
          onClose={() => setNotesShift(null)}
        />
      )}
    </DndContext>
  );
}
