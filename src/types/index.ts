// String literal types (SQLite doesn't support native enums)

export type Role = "ADMIN" | "EMPLOYEE";

export type Position =
  | "SERVER"
  | "BARTENDER"
  | "HOST"
  | "COOK"
  | "SOUS_CHEF"
  | "HEAD_CHEF"
  | "DISHWASHER"
  | "BUSSER"
  | "MANAGER"
  | "GENERAL_MANAGER";

export type ShiftStatus = "DRAFT" | "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type TimeOffStatus = "PENDING" | "APPROVED" | "DENIED";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type SwapType = "SWAP" | "GIVEAWAY";
export type SwapStatus = "PENDING" | "APPROVED" | "DENIED" | "CANCELLED";

export const POSITIONS: Position[] = [
  "SERVER",
  "BARTENDER",
  "HOST",
  "COOK",
  "SOUS_CHEF",
  "HEAD_CHEF",
  "DISHWASHER",
  "BUSSER",
  "MANAGER",
  "GENERAL_MANAGER",
];

export const ROLES: Role[] = ["EMPLOYEE", "ADMIN"];

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export interface ShiftTemplate {
  name: string;
  start: string;
  end: string;
}

export interface RestaurantSettings {
  id: string;
  name: string;
  ownerId: string;
  openDays: DayOfWeek[];
  openTime: string;
  closeTime: string;
  shiftTemplates: ShiftTemplate[];
  minStaffPerShift: number;
}

export interface UserWithStats {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: Position;
  phone: string | null;
  hourlyRate: number | null;
  performanceScore: number;
  isActive: boolean;
  hireDate: Date;
  image: string | null;
  _count?: {
    shifts: number;
  };
}

export interface ShiftWithUser {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  position: Position;
  status: ShiftStatus;
  notes: string | null;
  isPublished: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    position: Position;
    performanceScore: number;
  };
  shiftNotes?: ShiftNoteType[];
}

export interface ShiftNoteType {
  id: string;
  shiftId: string;
  forUserId: string | null;
  content: string;
  createdById: string;
  createdAt: Date;
}

export interface ShiftSwapRequestWithDetails {
  id: string;
  requesterId: string;
  targetId: string | null;
  shiftId: string;
  type: SwapType;
  status: SwapStatus;
  message: string | null;
  createdAt: Date;
  requester: { id: string; name: string; position: Position; image: string | null };
  target: { id: string; name: string; position: Position; image: string | null } | null;
  shift: { id: string; date: Date; startTime: string; endTime: string; position: Position };
}

export interface AvailabilityEntry {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface TimeOffRequestWithUser {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: TimeOffStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    position: Position;
    image: string | null;
  };
}

// NextAuth type extensions
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      role: Role;
      position: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    position: string;
  }
}
