"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, StickyNote } from "lucide-react";
import { ShiftWithUser, ShiftNoteType } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatTime } from "@/lib/utils";

interface ShiftNotesViewModalProps {
  shift: ShiftWithUser;
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function ShiftNotesViewModal({ shift, userId, open, onClose }: ShiftNotesViewModalProps) {
  const [notes, setNotes] = useState<ShiftNoteType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/shifts/${shift.id}/notes`)
      .then((r) => r.json())
      .then((data) => {
        // Show notes that are for everyone or specifically for this employee
        setNotes(data.filter((n: ShiftNoteType) => !n.forUserId || n.forUserId === userId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, shift.id, userId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-4 h-4" />
            Shift Notes
          </DialogTitle>
        </DialogHeader>

        <div className="bg-gray-50 rounded-lg p-3 text-sm mb-3">
          <p className="font-medium">{format(new Date(shift.date), "EEE, MMM d")}</p>
          <p className="text-gray-500">{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : notes.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">No notes for this shift</p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note.id} className={`p-3 rounded-lg text-sm ${note.forUserId ? "bg-blue-50 border border-blue-200" : "bg-gray-100"}`}>
                {note.forUserId && <p className="text-xs font-medium text-blue-600 mb-0.5">Personal note</p>}
                <p className="text-gray-700">{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">{format(new Date(note.createdAt), "MMM d, h:mm a")}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
