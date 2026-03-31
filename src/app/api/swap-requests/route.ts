import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  shiftId: z.string(),
  type: z.enum(["SWAP", "GIVEAWAY"]),
  targetId: z.string().optional().nullable(),
  message: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (session.user.role === "EMPLOYEE") {
    // Own requests/targets + open GIVEAWAY shifts from others (so they can claim)
    where.OR = [
      { requesterId: session.user.id },
      { targetId: session.user.id },
      { type: "GIVEAWAY", status: "PENDING" },
    ];
  }
  if (status) where.status = status;

  const requests = await prisma.shiftSwapRequest.findMany({
    where,
    include: {
      requester: { select: { id: true, name: true, position: true, image: true } },
      target: { select: { id: true, name: true, position: true, image: true } },
      shift: { select: { id: true, date: true, startTime: true, endTime: true, position: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { shiftId, type, targetId, message } = result.data;

  // Verify the shift belongs to the requester
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift || shift.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only request swaps for your own shifts." }, { status: 403 });
  }

  // Check for existing pending request
  const existing = await prisma.shiftSwapRequest.findFirst({
    where: { shiftId, requesterId: session.user.id, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json({ error: "A pending request already exists for this shift." }, { status: 409 });
  }

  const swapRequest = await prisma.shiftSwapRequest.create({
    data: {
      requesterId: session.user.id,
      shiftId,
      type,
      targetId: targetId ?? null,
      message,
    },
    include: {
      requester: { select: { id: true, name: true, position: true, image: true } },
      target: { select: { id: true, name: true, position: true, image: true } },
      shift: { select: { id: true, date: true, startTime: true, endTime: true, position: true } },
    },
  });

  return NextResponse.json(swapRequest, { status: 201 });
}
