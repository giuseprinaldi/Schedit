import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createRequestSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};

  // Employees only see their own requests
  if (session.user.role === "EMPLOYEE") {
    where.userId = session.user.id;
  }

  if (status) {
    where.status = status;
  }

  const requests = await prisma.timeOffRequest.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, image: true, position: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = createRequestSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
  }

  const { startDate, endDate, reason } = result.data;

  const request = await prisma.timeOffRequest.create({
    data: {
      userId: session.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, position: true } },
    },
  });

  return NextResponse.json(request, { status: 201 });
}
