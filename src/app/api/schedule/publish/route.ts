import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { scheduleId } = await req.json();
  if (!scheduleId) return NextResponse.json({ error: "scheduleId required" }, { status: 400 });

  const [shiftsResult] = await prisma.$transaction([
    prisma.shift.updateMany({
      where: { scheduleId, status: "DRAFT" },
      data: { status: "SCHEDULED", isPublished: true },
    }),
    prisma.schedule.update({
      where: { id: scheduleId },
      data: { isPublished: true },
    }),
  ]);

  return NextResponse.json({ published: shiftsResult.count });
}
