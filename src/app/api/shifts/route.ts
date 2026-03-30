import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const POSITIONS = ["SERVER", "BARTENDER", "HOST", "COOK", "SOUS_CHEF", "HEAD_CHEF", "DISHWASHER", "BUSSER", "MANAGER", "GENERAL_MANAGER"] as const;

const createShiftSchema = z.object({
  userId: z.string(),
  date: z.string(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  position: z.enum(POSITIONS),
  notes: z.string().optional(),
  status: z.string().optional(),
  scheduleId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const userId = searchParams.get("userId");
  const scheduleId = searchParams.get("scheduleId");

  const where: any = {};

  if (startDate && endDate) {
    where.date = { gte: new Date(startDate), lte: new Date(endDate) };
  }
  if (scheduleId) {
    where.scheduleId = scheduleId;
  }

  if (session.user.role === "EMPLOYEE") {
    where.userId = session.user.id;
  } else if (userId) {
    where.userId = userId;
  }

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, image: true, position: true, performanceScore: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(shifts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const result = createShiftSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
  }

  const { userId, date, startTime, endTime, position, notes, status, scheduleId } = result.data;

  const employee = await prisma.user.findUnique({ where: { id: userId } });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const shift = await prisma.shift.create({
    data: {
      userId, date: new Date(date), startTime, endTime, position, notes,
      status: status ?? "SCHEDULED",
      scheduleId: scheduleId ?? null,
      createdById: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, position: true, performanceScore: true } },
    },
  });

  return NextResponse.json(shift, { status: 201 });
}
