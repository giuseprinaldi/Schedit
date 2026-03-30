import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateWeeklySchedule } from "@/lib/scheduleGenerator";
import { startOfWeek, endOfWeek } from "date-fns";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { weekOf, scheduleId } = body;
  if (!weekOf) return NextResponse.json({ error: "weekOf date required" }, { status: 400 });
  if (!scheduleId) return NextResponse.json({ error: "scheduleId required" }, { status: 400 });

  const weekDate = new Date(weekOf);
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

  // Load restaurant config
  const restaurant = await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant settings not configured. Please set up your restaurant first." }, { status: 400 });
  }

  // Load active employees with availability
  const employees = await prisma.user.findMany({
    where: { isActive: true },
    include: { availability: true },
  });

  // Load approved time-off for this week
  const timeOff = await prisma.timeOffRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: weekEnd },
      endDate: { gte: weekStart },
    },
  });

  // Delete any existing DRAFT shifts for this specific schedule
  await prisma.shift.deleteMany({
    where: { scheduleId, status: "DRAFT" },
  });

  const config = {
    openDays: JSON.parse(restaurant.openDays),
    shiftTemplates: JSON.parse(restaurant.shiftTemplates),
    minStaffPerShift: restaurant.minStaffPerShift,
  };

  const generatedShifts = generateWeeklySchedule(weekDate, employees as any, timeOff as any, config);

  if (generatedShifts.length === 0) {
    return NextResponse.json({
      error: "No shifts could be generated. Check that employees have availability set for this week.",
    }, { status: 400 });
  }

  await prisma.shift.createMany({
    data: generatedShifts.map((s) => ({ ...s, scheduleId })),
  });

  // Return the created shifts with user details
  const shifts = await prisma.shift.findMany({
    where: { scheduleId, status: "DRAFT" },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, position: true, performanceScore: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ shifts, count: shifts.length });
}
