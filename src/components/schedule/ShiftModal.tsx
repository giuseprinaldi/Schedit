"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { ShiftWithUser, POSITIONS } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { positionLabel } from "@/lib/utils";

const shiftSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time"),
  position: z.enum(POSITIONS as any),
  notes: z.string().optional(),
  status: z.string().optional(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

interface Employee {
  id: string;
  name: string;
  position: string;
  isActive: boolean;
}

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (shift: ShiftWithUser) => void;
  editingShift: ShiftWithUser | null;
  preselectedDate: Date | null;
  preselectedTimes?: { start: string; end: string } | null;
}

export function ShiftModal({ open, onClose, onSave, editingShift, preselectedDate, preselectedTimes }: ShiftModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      date: preselectedDate ? format(preselectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      startTime: preselectedTimes?.start ?? "09:00",
      endTime: preselectedTimes?.end ?? "17:00",
    },
  });

  const selectedUserId = watch("userId");

  useEffect(() => {
    fetch("/api/employees?isActive=true")
      .then((r) => r.json())
      .then((data) => { setEmployees(data); setLoadingEmployees(false); })
      .catch(() => setLoadingEmployees(false));
  }, []);

  useEffect(() => {
    if (editingShift) {
      reset({
        userId: editingShift.userId,
        date: format(new Date(editingShift.date), "yyyy-MM-dd"),
        startTime: editingShift.startTime,
        endTime: editingShift.endTime,
        position: editingShift.position,
        notes: editingShift.notes ?? "",
        status: editingShift.status,
      });
    } else {
      reset({
        date: preselectedDate ? format(preselectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        startTime: preselectedTimes?.start ?? "09:00",
        endTime: preselectedTimes?.end ?? "17:00",
        userId: "",
        notes: "",
        status: "DRAFT",
      });
    }
  }, [editingShift, preselectedDate, preselectedTimes, reset]);

  useEffect(() => {
    if (selectedUserId && !editingShift) {
      const emp = employees.find((e) => e.id === selectedUserId);
      if (emp) setValue("position", emp.position as any);
    }
  }, [selectedUserId, employees, editingShift, setValue]);

  const onSubmit = async (data: ShiftFormData) => {
    try {
      const url = editingShift ? `/api/shifts/${editingShift.id}` : "/api/shifts";
      const method = editingShift ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error ?? "Failed to save.", variant: "destructive" });
        return;
      }
      const saved = await res.json();
      onSave(saved);
      toast({ title: editingShift ? "Shift updated" : "Shift created" });
    } catch {
      toast({ title: "Error", description: "Unexpected error.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingShift ? "Edit Shift" : "Add Shift"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee *</label>
            <select
              {...register("userId")}
              disabled={loadingEmployees}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name} — {positionLabel(emp.position)}</option>
              ))}
            </select>
            {errors.userId && <p className="mt-1 text-xs text-red-600">{errors.userId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
            <input {...register("date")} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start *</label>
              <input {...register("startTime")} type="time" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.startTime && <p className="mt-1 text-xs text-red-600">{errors.startTime.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End *</label>
              <input {...register("endTime")} type="time" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.endTime && <p className="mt-1 text-xs text-red-600">{errors.endTime.message as string}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Position *</label>
            <select {...register("position")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select position...</option>
              {POSITIONS.map((pos) => <option key={pos} value={pos}>{positionLabel(pos)}</option>)}
            </select>
            {errors.position && <p className="mt-1 text-xs text-red-600">{errors.position.message as string}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea {...register("notes")} rows={2} placeholder="Optional notes..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingShift ? "Update" : "Create Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
