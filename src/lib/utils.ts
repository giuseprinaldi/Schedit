import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Position, ShiftStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function calculateShiftDuration(startTime: string, endTime: string): number {
  const [startHours, startMins] = startTime.split(":").map(Number);
  const [endHours, endMins] = endTime.split(":").map(Number);
  let startTotal = startHours * 60 + startMins;
  let endTotal = endHours * 60 + endMins;
  if (endTotal <= startTotal) endTotal += 24 * 60;
  return (endTotal - startTotal) / 60;
}

export function formatShiftDuration(startTime: string, endTime: string): string {
  const hours = calculateShiftDuration(startTime, endTime);
  if (hours === Math.floor(hours)) return `${hours}h`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function positionLabel(position: Position | string): string {
  const labels: Record<string, string> = {
    SERVER: "Server",
    BARTENDER: "Bartender",
    HOST: "Host",
    COOK: "Line Cook",
    SOUS_CHEF: "Sous Chef",
    HEAD_CHEF: "Head Chef",
    DISHWASHER: "Dishwasher",
    BUSSER: "Busser",
    MANAGER: "Manager",
    GENERAL_MANAGER: "General Manager",
  };
  return labels[position] ?? position;
}

export function positionColor(position: Position | string): string {
  const colors: Record<string, string> = {
    SERVER: "bg-blue-100 text-blue-800",
    BARTENDER: "bg-purple-100 text-purple-800",
    HOST: "bg-pink-100 text-pink-800",
    COOK: "bg-orange-100 text-orange-800",
    SOUS_CHEF: "bg-yellow-100 text-yellow-800",
    HEAD_CHEF: "bg-red-100 text-red-800",
    DISHWASHER: "bg-gray-100 text-gray-800",
    BUSSER: "bg-teal-100 text-teal-800",
    MANAGER: "bg-green-100 text-green-800",
    GENERAL_MANAGER: "bg-indigo-100 text-indigo-800",
  };
  return colors[position] ?? "bg-gray-100 text-gray-800";
}

export function shiftStatusColor(status: ShiftStatus | string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-700",
    SCHEDULED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-green-100 text-green-700",
    COMPLETED: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-orange-100 text-orange-700",
  };
  return colors[status] ?? "bg-gray-100 text-gray-600";
}

export function shiftStatusLabel(status: ShiftStatus | string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SCHEDULED: "Scheduled",
    CONFIRMED: "Confirmed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No Show",
  };
  return labels[status] ?? status;
}

export function performanceColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

export function performanceLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Needs Improvement";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
