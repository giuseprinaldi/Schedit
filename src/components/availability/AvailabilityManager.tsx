"use client";

import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { DayOfWeek } from "@/types";
import { toast } from "@/hooks/use-toast";

interface DayAvailability {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AvailabilityManagerProps {
  userId: string;
  userRole: string;
}

const DAYS_ORDER: DayOfWeek[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const DEFAULT_AVAILABILITY: DayAvailability[] = DAYS_ORDER.map((day) => ({
  dayOfWeek: day,
  startTime: "09:00",
  endTime: "17:00",
  isAvailable: true,
}));

export function AvailabilityManager({ userId }: AvailabilityManagerProps) {
  const [availability, setAvailability] = useState<DayAvailability[]>(DEFAULT_AVAILABILITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/availability?userId=${userId}`)
      .then((r) => r.json())
      .then((data: any[]) => {
        if (data.length > 0) {
          const mapped = DAYS_ORDER.map((day) => {
            const existing = data.find((a) => a.dayOfWeek === day);
            return existing
              ? { dayOfWeek: day, startTime: existing.startTime, endTime: existing.endTime, isAvailable: existing.isAvailable }
              : { dayOfWeek: day, startTime: "09:00", endTime: "17:00", isAvailable: false };
          });
          setAvailability(mapped);
        }
      })
      .catch(() => toast({ title: "Error", description: "Failed to load availability.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [userId]);

  const updateDay = (day: DayOfWeek, field: keyof DayAvailability, value: any) => {
    setAvailability((prev) =>
      prev.map((a) => (a.dayOfWeek === day ? { ...a, [field]: value } : a))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = availability.map((a) => ({ ...a, userId }));
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Availability saved!" });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const weekdays = availability.filter((a) => ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(a.dayOfWeek));
  const weekend = availability.filter((a) => ["SATURDAY", "SUNDAY"].includes(a.dayOfWeek));

  const DayRow = ({ day }: { day: DayAvailability }) => (
    <div className={`p-4 rounded-xl border transition ${day.isAvailable ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={day.isAvailable}
              onChange={(e) => updateDay(day.dayOfWeek, "isAvailable", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
          <span className="font-medium text-gray-900 text-sm">{DAY_LABELS[day.dayOfWeek]}</span>
        </div>
        {!day.isAvailable && (
          <span className="text-xs text-gray-400 font-medium">Unavailable</span>
        )}
      </div>

      {day.isAvailable && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="time"
              value={day.startTime}
              onChange={(e) => updateDay(day.dayOfWeek, "startTime", e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="time"
              value={day.endTime}
              onChange={(e) => updateDay(day.dayOfWeek, "endTime", e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        Set the days and hours you&apos;re available to work. Your manager will use this when building the schedule.
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Weekdays</h3>
        <div className="space-y-2">
          {weekdays.map((day) => <DayRow key={day.dayOfWeek} day={day} />)}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Weekend</h3>
        <div className="space-y-2">
          {weekend.map((day) => <DayRow key={day.dayOfWeek} day={day} />)}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Saving..." : "Save Availability"}
      </button>
    </div>
  );
}
