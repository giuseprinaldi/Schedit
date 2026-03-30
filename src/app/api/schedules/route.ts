import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfWeek, endOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const weekOf = searchParams.get("weekOf");
  if (!weekOf) return NextResponse.json({ error: "weekOf required" }, { status: 400 });

  const weekStart = startOfWeek(new Date(weekOf), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(weekOf), { weekStartsOn: 1 });

  const schedules = await prisma.schedule.findMany({
    where: { weekOf: { gte: weekStart, lte: weekEnd } },
    include: { _count: { select: { shifts: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, weekOf } = await req.json();
  if (!title || !weekOf) return NextResponse.json({ error: "title and weekOf required" }, { status: 400 });

  const weekStart = startOfWeek(new Date(weekOf), { weekStartsOn: 1 });

  const schedule = await prisma.schedule.create({
    data: { title: title.trim(), weekOf: weekStart, createdById: session.user.id },
    include: { _count: { select: { shifts: true } } },
  });

  return NextResponse.json(schedule, { status: 201 });
}
