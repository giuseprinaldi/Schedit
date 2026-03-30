"use client";

import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, User, ChevronDown, Menu } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          onClick={() => router.push("/notifications")}
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
              {session?.user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">{session?.user?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">{session?.user?.role?.toLowerCase()}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { router.push("/settings"); setUserMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    Profile & Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
