"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus, CheckCircle, XCircle, Clock, Loader2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TimeOffRequestWithUser, TimeOffStatus } from "@/types";
import { positionLabel, getInitials, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const requestSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().optional(),
}).refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

type RequestFormData = z.infer<typeof requestSchema>;

interface TimeOffManagerProps {
  userId: string;
  userRole: string;
}

const STATUS_CONFIG: Record<TimeOffStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: "Pending", color: "bg-orange-100 text-orange-700", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  DENIED: { label: "Denied", color: "bg-red-100 text-red-700", icon: XCircle },
};

export function TimeOffManager({ userId, userRole }: TimeOffManagerProps) {
  const [requests, setRequests] = useState<TimeOffRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  const isManager = userRole === "ADMIN" || userRole === "MANAGER";

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/time-off?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(data);
    } catch {
      toast({ title: "Error", description: "Failed to load requests.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleReview = async (id: string, status: "APPROVED" | "DENIED") => {
    try {
      const res = await fetch(`/api/time-off/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      toast({ title: `Request ${status.toLowerCase()}` });
    } catch {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/time-off/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Request deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleCreate = (request: TimeOffRequestWithUser) => {
    setRequests((prev) => [request, ...prev]);
    setShowModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["", "PENDING", "APPROVED", "DENIED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition",
                filterStatus === s
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Request Time Off
        </button>
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-500">No time-off requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const config = STATUS_CONFIG[request.status];
            const Icon = config.icon;
            const isOwn = request.userId === userId;

            return (
              <div key={request.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {isManager && (
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {getInitials(request.user.name)}
                      </div>
                    )}
                    <div>
                      {isManager && (
                        <p className="font-medium text-gray-900">
                          {request.user.name}
                          <span className="ml-2 text-sm text-gray-500 font-normal">
                            ({positionLabel(request.user.position)})
                          </span>
                        </p>
                      )}
                      <p className="text-sm font-medium text-gray-700">
                        {format(new Date(request.startDate), "MMM d, yyyy")}
                        {request.startDate !== request.endDate && (
                          <> – {format(new Date(request.endDate), "MMM d, yyyy")}</>
                        )}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Submitted {format(new Date(request.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium", config.color)}>
                      <Icon className="w-3.5 h-3.5" />
                      {config.label}
                    </span>

                    {isManager && request.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleReview(request.id, "APPROVED")}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReview(request.id, "DENIED")}
                          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                          title="Deny"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {(isOwn && request.status === "PENDING") && (
                      <button
                        onClick={() => handleDelete(request.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                        title="Cancel request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <RequestModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

function RequestModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (req: TimeOffRequestWithUser) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const onSubmit = async (data: RequestFormData) => {
    try {
      const res = await fetch("/api/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
        return;
      }
      const saved = await res.json();
      onCreate(saved);
      toast({ title: "Time-off request submitted" });
    } catch {
      toast({ title: "Error", description: "Unexpected error.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date *</label>
              <input
                {...register("startDate")}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date *</label>
              <input
                {...register("endDate")}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason (optional)</label>
            <textarea
              {...register("reason")}
              rows={3}
              placeholder="Briefly describe the reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
