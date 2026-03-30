import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfWeek, endOfWeek } from "date-fns";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { weekOf } = await req.json();
  if (!weekOf) return NextResponse.json({ error: "weekOf required" }, { status: 400 });

  const weekStart = startOfWeek(new Date(weekOf), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(weekOf), { weekStartsOn: 1 });

  const result = await prisma.shift.updateMany({
    where: {
      date: { gte: weekStart, lte: weekEnd },
      status: "DRAFT",
    },
    data: { status: "SCHEDULED", isPublished: true },
  });

  return NextResponse.json({ published: result.count });
}
