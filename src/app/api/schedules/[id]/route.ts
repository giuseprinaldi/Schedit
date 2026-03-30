import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title } = await req.json();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const schedule = await prisma.schedule.update({
    where: { id: params.id },
    data: { title: title.trim() },
    include: { _count: { select: { shifts: true } } },
  });

  return NextResponse.json(schedule);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Delete all DRAFT shifts in this schedule, then the schedule
  await prisma.shift.deleteMany({ where: { scheduleId: params.id, status: "DRAFT" } });
  await prisma.schedule.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
