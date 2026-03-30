import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const upsertAvailabilitySchema = z.object({
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  isAvailable: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const targetUserId = session.user.role === "EMPLOYEE" ? session.user.id : (userId ?? undefined);

  const availability = await prisma.availability.findMany({
    where: targetUserId ? { userId: targetUserId } : undefined,
    include: {
      user: { select: { id: true, name: true, position: true } },
    },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json(availability);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Support bulk upsert of availability
  const items = Array.isArray(body) ? body : [body];

  const results = [];
  for (const item of items) {
    const result = upsertAvailabilitySchema.safeParse(item);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
    }

    const { dayOfWeek, startTime, endTime, isAvailable } = result.data;
    const userId = item.userId && session.user.role !== "EMPLOYEE" ? item.userId : session.user.id;

    const availability = await prisma.availability.upsert({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
      create: { userId, dayOfWeek, startTime, endTime, isAvailable },
      update: { startTime, endTime, isAvailable },
      include: { user: { select: { id: true, name: true, position: true } } },
    });

    results.push(availability);
  }

  return NextResponse.json(results, { status: 201 });
}
