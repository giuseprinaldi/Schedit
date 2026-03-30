"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2, Save, Store, Clock, Calendar, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DayOfWeek, DAYS_OF_WEEK, RestaurantSettings } from "@/types";

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu",
  FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

const schema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  openDays: z.array(z.string()).min(1, "Select at least one open day"),
  openTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time"),
  closeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time"),
  shiftTemplates: z.array(z.object({
    name: z.string().min(1, "Shift name required"),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time"),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time"),
  })).min(1, "Add at least one shift template"),
  minStaffPerShift: z.coerce.number().int().min(1).max(50),
});

type FormData = z.infer<typeof schema>;

export function RestaurantSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<Set<DayOfWeek>>(
    new Set(["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"] as DayOfWeek[])
  );

  const { register, handleSubmit, control, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "My Restaurant",
      openDays: [...DAYS_OF_WEEK],
      openTime: "09:00",
      closeTime: "22:00",
      shiftTemplates: [
        { name: "Morning", start: "09:00", end: "17:00" },
        { name: "Evening", start: "16:00", end: "23:00" },
      ],
      minStaffPerShift: 3,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "shiftTemplates" });

  useEffect(() => {
    fetch("/api/restaurant")
      .then((r) => r.json())
      .then((data: RestaurantSettings | null) => {
        if (data) {
          reset({
            name: data.name,
            openDays: data.openDays,
            openTime: data.openTime,
            closeTime: data.closeTime,
            shiftTemplates: data.shiftTemplates,
            minStaffPerShift: data.minStaffPerShift,
          });
          setSelectedDays(new Set(data.openDays));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

  const toggleDay = (day: DayOfWeek) => {
    const next = new Set(selectedDays);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
    }
    setSelectedDays(next);
    setValue("openDays", Array.from(next), { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/restaurant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Restaurant settings saved!" });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">

      {/* Restaurant name */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Restaurant Info</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Restaurant Name</label>
          <input {...register("name")} className={inputClass} placeholder="The Golden Fork" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
      </div>

      {/* Operating hours */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Operating Hours</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Opening Time</label>
            <input {...register("openTime")} type="time" className={inputClass} />
            {errors.openTime && <p className="mt-1 text-xs text-red-600">{errors.openTime.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Closing Time</label>
            <input {...register("closeTime")} type="time" className={inputClass} />
            {errors.closeTime && <p className="mt-1 text-xs text-red-600">{errors.closeTime.message}</p>}
          </div>
        </div>
      </div>

      {/* Open days */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Open Days</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                selectedDays.has(day)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
        {errors.openDays && <p className="mt-2 text-xs text-red-600">{errors.openDays.message as string}</p>}
      </div>

      {/* Shift templates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Shift Templates</h2>
          </div>
          <button
            type="button"
            onClick={() => append({ name: "New Shift", start: "09:00", end: "17:00" })}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Shift
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                {...register(`shiftTemplates.${index}.name`)}
                placeholder="Shift name"
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input
                {...register(`shiftTemplates.${index}.start`)}
                type="time"
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                {...register(`shiftTemplates.${index}.end`)}
                type="time"
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {errors.shiftTemplates && <p className="mt-2 text-xs text-red-600">Please fix shift template errors.</p>}
      </div>

      {/* Min staff */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Staffing</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimum Staff per Shift</label>
          <input
            {...register("minStaffPerShift")}
            type="number"
            min="1"
            max="50"
            className={`${inputClass} w-32`}
          />
          <p className="mt-1 text-xs text-gray-500">The scheduler will try to meet this minimum when auto-generating.</p>
          {errors.minStaffPerShift && <p className="mt-1 text-xs text-red-600">{errors.minStaffPerShift.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isSubmitting ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
