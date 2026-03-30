import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [
    totalEmployees,
    scheduledShiftsToday,
    pendingTimeOffRequests,
    weeklyShifts,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.shift.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
    }),
    prisma.timeOffRequest.count({ where: { status: "PENDING" } }),
    prisma.shift.findMany({
      where: {
        date: { gte: weekStart, lte: weekEnd },
        status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
      },
      include: { user: { select: { hourlyRate: true } } },
    }),
  ]);

  // Calculate weekly labor cost
  const weeklyLaborCost = weeklyShifts.reduce((total, shift) => {
    if (!shift.user.hourlyRate) return total;
    const [startH, startM] = shift.startTime.split(":").map(Number);
    const [endH, endM] = shift.endTime.split(":").map(Number);
    let hours = endH * 60 + endM - (startH * 60 + startM);
    if (hours <= 0) hours += 24 * 60;
    return total + (hours / 60) * shift.user.hourlyRate;
  }, 0);

  // Upcoming shifts for current user (next 7 days)
  const upcomingShifts = await prisma.shift.findMany({
    where: {
      userId: session.user.id,
      date: { gte: todayStart },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, position: true } },
    },
    orderBy: { date: "asc" },
    take: 5,
  });

  // Today's schedule for managers/admins
  const todaySchedule = await prisma.shift.findMany({
    where: {
      date: { gte: todayStart, lte: todayEnd },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, position: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({
    stats: {
      totalEmployees,
      scheduledShiftsToday,
      pendingTimeOffRequests,
      weeklyLaborCost,
      shiftsThisWeek: weeklyShifts.length,
    },
    upcomingShifts,
    todaySchedule,
  });
}
