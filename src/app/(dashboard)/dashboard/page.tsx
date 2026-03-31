import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { TodaySchedule } from "@/components/dashboard/TodaySchedule";
import { UpcomingShifts } from "@/components/dashboard/UpcomingShifts";
import { PendingTimeOff } from "@/components/dashboard/PendingTimeOff";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from "date-fns";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [totalEmployees, scheduledShiftsToday, pendingTimeOffRequests, weeklyShifts, upcomingShifts, todaySchedule, pendingRequests] =
    await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.shift.count({
        where: { date: { gte: todayStart, lte: todayEnd }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
      }),
      prisma.timeOffRequest.count({ where: { status: "PENDING" } }),
      session.user.role === "EMPLOYEE"
        ? prisma.shift.findMany({
            where: {
              userId: session.user.id,
              date: { gte: weekStart, lte: weekEnd },
              isPublished: true,
              status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
            },
            include: { user: { select: { hourlyRate: true } } },
          })
        : prisma.shift.findMany({
            where: { date: { gte: weekStart, lte: weekEnd }, status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] } },
            include: { user: { select: { hourlyRate: true } } },
          }),
      prisma.shift.findMany({
        where: {
          userId: session.user.id,
          date: { gte: todayStart },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        include: { user: { select: { id: true, name: true, email: true, image: true, position: true } } },
        orderBy: { date: "asc" },
        take: 5,
      }),
      prisma.shift.findMany({
        where: { date: { gte: todayStart, lte: todayEnd }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
        include: { user: { select: { id: true, name: true, email: true, image: true, position: true } } },
        orderBy: { startTime: "asc" },
      }),
      session.user.role !== "EMPLOYEE"
        ? prisma.timeOffRequest.findMany({
            where: { status: "PENDING" },
            include: { user: { select: { id: true, name: true, email: true, image: true, position: true } } },
            orderBy: { createdAt: "asc" },
            take: 5,
          })
        : [],
    ]);

  const weeklyLaborCost = weeklyShifts.reduce((total, shift) => {
    if (!shift.user.hourlyRate) return total;
    const [sh, sm] = shift.startTime.split(":").map(Number);
    const [eh, em] = shift.endTime.split(":").map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    return total + (mins / 60) * shift.user.hourlyRate;
  }, 0);

  const stats = {
    totalEmployees,
    scheduledShiftsToday,
    pendingTimeOffRequests,
    weeklyLaborCost,
    shiftsThisWeek: weeklyShifts.length,
  };

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <Header
        title={`${greeting}, ${session.user.name?.split(" ")[0]}`}
        subtitle="Here's what's happening today"
      />
      <div className="p-6 space-y-6">
        <DashboardStats stats={stats} userRole={session.user.role} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TodaySchedule shifts={todaySchedule as any} />
          </div>
          <div className="space-y-6">
            <UpcomingShifts shifts={upcomingShifts as any} />
            {session.user.role !== "EMPLOYEE" && (
              <PendingTimeOff requests={pendingRequests as any} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
