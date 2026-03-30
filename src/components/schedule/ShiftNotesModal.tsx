"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Trash2, StickyNote, Plus } from "lucide-react";
import { ShiftWithUser, ShiftNoteType } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatTime, positionLabel } from "@/lib/utils";

interface ShiftNotesModalProps {
  shift: ShiftWithUser;
  open: boolean;
  onClose: () => void;
}

interface Employee {
  id: string;
  name: string;
}

export function ShiftNotesModal({ shift, open, onClose }: ShiftNotesModalProps) {
  const [notes, setNotes] = useState<ShiftNoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [forUserId, setForUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [employeesInShift, setEmployeesInShift] = useState<Employee[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    // Load notes
    fetch(`/api/shifts/${shift.id}/notes`)
      .then((r) => r.json())
      .then(setNotes)
      .catch(() => toast({ title: "Failed to load notes", variant: "destructive" }))
      .finally(() => setLoading(false));

    // Fetch all employees assigned to this same shift slot for the "for employee" dropdown
    const dateStr = new Date(shift.date).toISOString();
    fetch(`/api/shifts?startDate=${dateStr}&endDate=${dateStr}`)
      .then((r) => r.json())
      .then((shifts: ShiftWithUser[]) => {
        const sameCellEmployees = shifts
          .filter((s) => s.startTime === shift.startTime && s.endTime === shift.endTime)
          .map((s) => ({ id: s.user.id, name: s.user.name }));
        setEmployeesInShift(sameCellEmployees);
      })
      .catch(() => {});
  }, [open, shift.id, shift.date, shift.startTime, shift.endTime]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/shifts/${shift.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim(), forUserId: forUserId || null }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setNotes((prev) => [saved, ...prev]);
      setNewNote("");
      setForUserId("");
      toast({ title: "Note added" });
    } catch {
      toast({ title: "Failed to save note", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/shifts/${shift.id}/notes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast({ title: "Note deleted" });
    } catch {
      toast({ title: "Failed to delete note", variant: "destructive" });
    }
  };

  const getEmployeeName = (userId: string) =>
    employeesInShift.find((e) => e.id === userId)?.name ?? "Unknown";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-4 h-4" />
            Shift Notes
          </DialogTitle>
        </DialogHeader>

        {/* Shift info */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="font-medium text-gray-900">{shift.user.name}</p>
          <p className="text-gray-500">
            {format(new Date(shift.date), "EEE, MMM d")} · {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
          </p>
          <p className="text-gray-500">{positionLabel(shift.position)}</p>
        </div>

        {/* Add note */}
        <div className="space-y-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note for this shift..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex items-center gap-2">
            <select
              value={forUserId}
              onChange={(e) => setForUserId(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">For: entire shift</option>
              {employeesInShift.map((emp) => (
                <option key={emp.id} value={emp.id}>For: {emp.name}</option>
              ))}
            </select>
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || saving}
              size="sm"
              className="flex items-center gap-1"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </Button>
          </div>
        </div>

        {/* Existing notes */}
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : notes.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-4">No notes yet</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="group flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  {note.forUserId && (
                    <p className="text-xs font-medium text-blue-600 mb-0.5">
                      For {getEmployeeName(note.forUserId)}
                    </p>
                  )}
                  <p className="text-sm text-gray-700">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(note.createdAt), "MMM d, h:mm a")}</p>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
