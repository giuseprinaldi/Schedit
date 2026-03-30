"use client";

import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, CheckCircle } from "lucide-react";
import { ShiftWithUser } from "@/types";
import { cn, formatTime, positionColor, positionLabel, getInitials } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ShiftCardProps {
  shift: ShiftWithUser;
  canEdit: boolean;
  currentUserId: string;
  onEdit: (shift: ShiftWithUser) => void;
  onDelete: (id: string) => void;
}

export function ShiftCard({ shift, canEdit, currentUserId, onEdit, onDelete }: ShiftCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMyShift = shift.userId === currentUserId;

  const handleConfirm = async () => {
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Shift confirmed!" });
    } catch {
      toast({ title: "Error", description: "Failed to confirm shift.", variant: "destructive" });
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-lg px-2.5 py-2 text-xs border transition group",
        isMyShift
          ? "border-blue-200 bg-blue-50 hover:border-blue-300"
          : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm",
        shift.status === "CANCELLED" && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
            {getInitials(shift.user.name)}
          </div>
          <span className="font-medium text-gray-900 truncate">{shift.user.name.split(" ")[0]}</span>
        </div>

        {(canEdit || isMyShift) && (
          <div className="relative opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-0.5 rounded hover:bg-gray-100"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-5 z-20 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 overflow-hidden">
                  {canEdit && (
                    <button
                      onClick={() => { onEdit(shift); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                  {isMyShift && shift.status === "SCHEDULED" && (
                    <button
                      onClick={() => { handleConfirm(); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Confirm
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => { onDelete(shift.id); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <p className="text-gray-600 mb-1">
        {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
      </p>

      <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium", positionColor(shift.position))}>
        {positionLabel(shift.position)}
      </span>
    </div>
  );
}
