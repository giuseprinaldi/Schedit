"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { UserWithStats, POSITIONS, ROLES } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { positionLabel } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(2, "At least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"] as const),
  position: z.enum(POSITIONS as any),
  phone: z.string().optional(),
  hourlyRate: z.coerce.number().positive().optional().or(z.literal("")),
  hireDate: z.string().optional(),
});

const editSchema = z.object({
  name: z.string().min(2, "At least 2 characters").optional(),
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(8).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"] as const).optional(),
  position: z.enum(POSITIONS as any).optional(),
  phone: z.string().optional(),
  hourlyRate: z.coerce.number().positive().optional().or(z.literal("")),
  hireDate: z.string().optional(),
});

interface EmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (employee: UserWithStats) => void;
  editingEmployee: UserWithStats | null;
  isAdmin: boolean;
}

export function EmployeeModal({ open, onClose, onSave, editingEmployee, isAdmin }: EmployeeModalProps) {
  const schema = editingEmployee ? editSchema : createSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (editingEmployee) {
      reset({
        name: editingEmployee.name,
        email: editingEmployee.email,
        role: editingEmployee.role,
        position: editingEmployee.position,
        phone: editingEmployee.phone ?? "",
        hourlyRate: editingEmployee.hourlyRate ?? "",
        hireDate: editingEmployee.hireDate ? format(new Date(editingEmployee.hireDate), "yyyy-MM-dd") : "",
        password: "",
      });
    } else {
      reset({ name: "", email: "", password: "", role: "EMPLOYEE", position: "SERVER", phone: "", hourlyRate: "", hireDate: "" });
    }
  }, [editingEmployee, reset]);

  const onSubmit = async (data: any) => {
    const payload: any = { ...data };
    if (!payload.password) delete payload.password;
    if (!payload.phone) delete payload.phone;
    if (payload.hourlyRate === "" || payload.hourlyRate === undefined) {
      delete payload.hourlyRate;
    } else {
      payload.hourlyRate = Number(payload.hourlyRate);
    }
    if (!payload.hireDate) delete payload.hireDate;

    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : "/api/employees";
      const method = editingEmployee ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error ?? "Failed to save.", variant: "destructive" });
        return;
      }

      const saved = await res.json();
      onSave(saved);
      toast({ title: editingEmployee ? "Employee updated" : "Employee created" });
    } catch {
      toast({ title: "Error", description: "Unexpected error.", variant: "destructive" });
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
              <input {...register("name")} className={inputClass} placeholder="Jane Smith" />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
              <input {...register("email")} type="email" className={inputClass} placeholder="jane@restaurant.com" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message as string}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {editingEmployee ? "New Password (leave blank to keep)" : "Password *"}
            </label>
            <input
              {...register("password")}
              type="password"
              className={inputClass}
              placeholder={editingEmployee ? "Leave blank to keep current" : "Min. 8 characters"}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Position *</label>
              <select {...register("position")} className={inputClass}>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>{positionLabel(pos)}</option>
                ))}
              </select>
              {errors.position && <p className="mt-1 text-xs text-red-600">{errors.position.message as string}</p>}
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                <select {...register("role")} className={inputClass}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input {...register("phone")} type="tel" className={inputClass} placeholder="555-0100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Hourly Rate ($)</label>
              <input {...register("hourlyRate")} type="number" step="0.01" min="0" className={inputClass} placeholder="15.00" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hire Date</label>
            <input {...register("hireDate")} type="date" className={inputClass} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingEmployee ? "Update Employee" : "Create Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
