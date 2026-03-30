"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Loader2, ArrowLeftRight, Gift } from "lucide-react";
import { ShiftWithUser } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatTime, positionLabel } from "@/lib/utils";

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

export function SwapRequestModal({ shift, open, onClose, defaultType }: SwapRequestModalProps) {
  const [type, setType] = useState<"SWAP" | "GIVEAWAY">(defaultType);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targetId, setTargetId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(defaultType);
    fetch("/api/employees?isActive=true")
      .then((r) => r.json())
      .then((data) => setEmployees(data.filter((e: any) => e.id !== shift.userId)))
      .catch(() => {});
  }, [open, defaultType, shift.userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/swap-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: shift.id,
          type,
          targetId: targetId || null,
          message: message.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
        return;
      }
      toast({ title: `${type === "SWAP" ? "Swap" : "Giveaway"} request submitted!`, description: "Waiting for admin approval." });
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
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition ${
                type === "SWAP" ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" /> Swap
            </button>
            <button
              type="button"
              onClick={() => setType("GIVEAWAY")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition ${
                type === "GIVEAWAY" ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <Gift className="w-4 h-4" /> Give Away
            </button>
          </div>

          <p className="text-xs text-gray-500">
            {type === "SWAP"
              ? "Swap your shift with another employee. Both of you must agree, and admin must approve."
              : "Give your shift to another employee. Admin must approve."}
          </p>

          {/* Target employee (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {type === "SWAP" ? "Swap with (optional)" : "Give to (optional)"}
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Open to anyone</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {positionLabel(emp.position)}
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Reason for the request..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
