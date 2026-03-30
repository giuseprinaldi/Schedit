// String literal types replacing Prisma enums (SQLite doesn't support native enums)

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

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

export type ShiftStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type TimeOffStatus = "PENDING" | "APPROVED" | "DENIED";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

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

export const ROLES: Role[] = ["EMPLOYEE", "MANAGER", "ADMIN"];

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export interface UserWithStats {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: Position;
  phone: string | null;
  hourlyRate: number | null;
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
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    position: Position;
  };
}

export interface AvailabilityWithUser {
  id: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  user: {
    id: string;
    name: string;
    position: Position;
  };
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

export interface DashboardStats {
  totalEmployees: number;
  scheduledShiftsToday: number;
  pendingTimeOffRequests: number;
  weeklyLaborCost: number;
  shiftsThisWeek: number;
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
