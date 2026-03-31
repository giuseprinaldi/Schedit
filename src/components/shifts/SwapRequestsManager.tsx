"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle, XCircle, ArrowLeftRight, Gift, Clock, Loader2, Trash2, Users, User } from "lucide-react";
import { ShiftSwapRequestWithDetails, SwapStatus } from "@/types";
import { cn, formatTime, positionLabel, getInitials } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface SwapRequestsManagerProps {
  userId: string;
  userRole: string;
}

const STATUS_CONFIG: Record<SwapStatus, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-orange-100 text-orange-700" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700" },
  DENIED: { label: "Denied", color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
};

export function SwapRequestsManager({ userId, userRole }: SwapRequestsManagerProps) {
  const [requests, setRequests] = useState<ShiftSwapRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");

  const isAdmin = userRole === "ADMIN";

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/swap-requests?${params}`);
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
      const res = await fetch(`/api/swap-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast({ title: `Request ${status.toLowerCase()}` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/swap-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) throw new Error();
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "CANCELLED" } : r)));
      toast({ title: "Request cancelled" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["", "PENDING", "APPROVED", "DENIED", "CANCELLED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition border",
              filterStatus === s
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            {s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-500">No swap requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const statusConfig = STATUS_CONFIG[req.status as SwapStatus];
            const isOwn = req.requesterId === userId;
            // Open giveaway = GIVEAWAY with no claimer yet → admin must wait
            const isOpenGiveaway = req.type === "GIVEAWAY" && !req.targetId;
            // Sub-label for giveaway kind
            const giveawayKind = req.type === "GIVEAWAY"
              ? (req.targetId ? (isOwn || req.requesterId !== userId ? "Direct Handoff" : "Direct Handoff") : "Open for Grabs")
              : null;

            return (
              <div key={req.id} className={cn(
                "bg-white rounded-xl border p-5 shadow-sm",
                isOpenGiveaway && req.status === "PENDING" ? "border-amber-200 bg-amber-50/30" : "border-gray-200"
              )}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                      req.type === "SWAP" ? "bg-blue-100" : isOpenGiveaway ? "bg-amber-100" : "bg-purple-100"
                    )}>
                      {req.type === "SWAP"
                        ? <ArrowLeftRight className="text-blue-600" size={18} />
                        : isOpenGiveaway
                          ? <Users className="text-amber-600" size={18} />
                          : <User className="text-purple-600" size={18} />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {req.type === "SWAP" ? "Shift Swap" : `Shift Giveaway${giveawayKind ? ` — ${giveawayKind}` : ""}`}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                        {isOpenGiveaway && req.status === "PENDING" && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Awaiting Claim
                          </span>
                        )}
                      </div>

                      {/* Shift info */}
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">{format(new Date(req.shift.date), "EEE, MMM d")}</span>
                        {" · "}{formatTime(req.shift.startTime)} – {formatTime(req.shift.endTime)}
                        {" · "}{positionLabel(req.shift.position)}
                      </p>

                      {/* Parties */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-[9px] font-bold text-white">
                            {getInitials(req.requester.name)}
                          </div>
                          <span className="text-xs text-gray-700">{req.requester.name}</span>
                          <span className="text-xs text-gray-400">(giving away)</span>
                        </div>
                        {req.target ? (
                          <>
                            <span className="text-gray-300">→</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-500 flex items-center justify-center text-[9px] font-bold text-white">
                                {getInitials(req.target.name)}
                              </div>
                              <span className="text-xs text-gray-700">{req.target.name}</span>
                              {req.type === "GIVEAWAY" && !isOwn && (
                                <span className="text-xs text-gray-400">(claimed)</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">→ Waiting for someone to claim</span>
                        )}
                      </div>

                      {req.message && (
                        <p className="text-xs text-gray-500 italic mt-1.5">&quot;{req.message}&quot;</p>
                      )}

                      {isOpenGiveaway && req.status === "PENDING" && isAdmin && (
                        <p className="text-xs text-amber-600 mt-2">
                          ⚠ An employee must claim this shift before you can approve.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && req.status === "PENDING" && !isOpenGiveaway && (
                      <>
                        <button
                          onClick={() => handleReview(req.id, "APPROVED")}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReview(req.id, "DENIED")}
                          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                          title="Deny"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {isOwn && req.status === "PENDING" && (
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                        title="Cancel"
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
    </div>
  );
}
