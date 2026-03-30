import { Users, Calendar, Clock, DollarSign, TrendingUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface Stats {
  totalEmployees: number;
  scheduledShiftsToday: number;
  pendingTimeOffRequests: number;
  weeklyLaborCost: number;
  shiftsThisWeek: number;
}

interface DashboardStatsProps {
  stats: Stats;
  userRole: string;
}

export function DashboardStats({ stats, userRole }: DashboardStatsProps) {
  const isManager = userRole === "ADMIN" || userRole === "MANAGER";

  const cards = [
    {
      title: "Staff On Schedule Today",
      value: stats.scheduledShiftsToday,
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
      show: true,
    },
    {
      title: "Total Active Employees",
      value: stats.totalEmployees,
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-50",
      show: isManager,
    },
    {
      title: "Shifts This Week",
      value: stats.shiftsThisWeek,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
      show: true,
    },
    {
      title: "Pending Time-Off",
      value: stats.pendingTimeOffRequests,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
      show: isManager,
    },
    {
      title: "Weekly Labor Cost",
      value: formatCurrency(stats.weeklyLaborCost),
      icon: DollarSign,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      show: isManager,
    },
  ].filter((c) => c.show);

  return (
    <div className={cn("grid gap-4", isManager ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-2")}>
      {cards.map((card) => (
        <div key={card.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
            <div className={cn("p-2 rounded-lg", card.bg)}>
              <card.icon className={cn("w-5 h-5", card.color)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
