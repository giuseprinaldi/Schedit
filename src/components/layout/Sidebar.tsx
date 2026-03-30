"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  ChevronRight,
  ChefHat,
  Settings,
  CalendarOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Schedule", href: "/schedule", icon: Calendar },
  { label: "Employees", href: "/employees", icon: Users, roles: ["ADMIN", "MANAGER"] },
  { label: "Availability", href: "/availability", icon: Clock },
  { label: "Time Off", href: "/time-off", icon: CalendarOff },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role as Role | undefined;

  const filteredNav = navItems.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  );

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg tracking-tight">Schedit</span>
            <p className="text-xs text-slate-400 leading-none mt-0.5">Restaurant Scheduler</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              )}
            >
              <item.icon
                className={cn("flex-shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200")}
                size={18}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
            </Link>
          );
        })}
      </nav>

      {session?.user && (
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {session.user.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{session.user.name}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{session.user.role?.toLowerCase()}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
