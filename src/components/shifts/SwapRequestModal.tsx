"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, ArrowLeftRight, Gift, User, Users } from "lucide-react";
import { ShiftWithUser } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatTime, positionLabel, cn } from "@/lib/utils";

interface SwapRequestModalProps {
  shift: ShiftWithUser;
  open: boolean;
  onClose: () => void;
  defaultType: "SWAP" | "GIVEAWAY";
}

interface Employee {
  id: string;
  name: string;
  position: string;
}

// Giveaway sub-mode
type GiveMode = "direct" | "grabs";

export function SwapRequestModal({ shift, open, onClose, defaultType }: SwapRequestModalProps) {
  const [type, setType] = useState<"SWAP" | "GIVEAWAY">(defaultType);
  const [giveMode, setGiveMode] = useState<GiveMode>("grabs");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targetId, setTargetId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(defaultType);
    setGiveMode("grabs");
    setTargetId("");
    setMessage("");
    fetch("/api/employees?isActive=true")
      .then((r) => r.json())
      .then((data) => setEmployees(Array.isArray(data) ? data.filter((e: any) => e.id !== shift.userId) : []))
      .catch(() => {});
  }, [open, defaultType, shift.userId]);

  // Sort employees so same-role comes first
  const sortedEmployees = [...employees].sort((a, b) => {
    const aMatch = a.position === shift.position ? -1 : 1;
    const bMatch = b.position === shift.position ? -1 : 1;
    return aMatch - bMatch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Direct handoff requires a target
    if (type === "GIVEAWAY" && giveMode === "direct" && !targetId) {
      toast({ title: "Select an employee", description: "Choose who to give this shift to.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/swap-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: shift.id,
          type,
          targetId: type === "GIVEAWAY" && giveMode === "grabs" ? null : (targetId || null),
          message: message.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
        return;
      }

      if (type === "SWAP") {
        toast({ title: "Swap request submitted", description: "Awaiting admin approval." });
      } else if (giveMode === "direct") {
        toast({ title: "Shift handed off", description: "Awaiting admin approval." });
      } else {
        toast({ title: "Shift posted for grabs!", description: "Other employees can now claim it." });
      }
      onClose();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Shift Change</DialogTitle>
        </DialogHeader>

        {/* Shift info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-blue-900">{format(new Date(shift.date), "EEEE, MMMM d")}</p>
          <p className="text-blue-700">{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</p>
          <p className="text-blue-600 text-xs mt-0.5">{positionLabel(shift.position)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("SWAP")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition",
                type === "SWAP" ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <ArrowLeftRight className="w-4 h-4" /> Swap
            </button>
            <button
              type="button"
              onClick={() => setType("GIVEAWAY")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition",
                type === "GIVEAWAY" ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <Gift className="w-4 h-4" /> Give Away
            </button>
          </div>

          {/* SWAP: pick target (optional) */}
          {type === "SWAP" && (
            <>
              <p className="text-xs text-gray-500">
                Propose a shift swap with a specific colleague. Admin must approve.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Swap with (optional)</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a colleague…</option>
                  {sortedEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.position === shift.position ? "★ " : ""}{emp.name} — {positionLabel(emp.position)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* GIVEAWAY: direct vs open for grabs */}
          {type === "GIVEAWAY" && (
            <>
              {/* Sub-mode selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setGiveMode("grabs"); setTargetId(""); }}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-sm font-medium transition",
                    giveMode === "grabs"
                      ? "bg-amber-50 border-amber-400 text-amber-800"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Open for Grabs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGiveMode("direct")}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-sm font-medium transition",
                    giveMode === "direct"
                      ? "bg-purple-50 border-purple-400 text-purple-800"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}
                >
                  <User className="w-4 h-4" />
                  <span className="text-xs">Direct Handoff</span>
                </button>
              </div>

              {giveMode === "grabs" && (
                <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Your shift will be posted for any eligible colleague to claim. A manager approves once someone volunteers.
                </p>
              )}

              {giveMode === "direct" && (
                <>
                  <p className="text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                    Hand this shift directly to a specific colleague. A manager will approve the transfer.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Give to <span className="text-red-500">*</span></label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select a colleague…</option>
                      {sortedEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.position === shift.position ? "★ " : ""}{emp.name} — {positionLabel(emp.position)}
                        </option>
                      ))}
                    </select>
                    {sortedEmployees.some((e) => e.position === shift.position) && (
                      <p className="text-[11px] text-gray-400 mt-1">★ Same role as this shift</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Reason for the request…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={submitting}
              className={type === "GIVEAWAY" && giveMode === "grabs" ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {type === "SWAP" ? "Submit Swap" : giveMode === "direct" ? "Hand Off Shift" : "Post for Grabs"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
