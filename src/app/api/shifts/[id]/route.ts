import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const POSITIONS = ["SERVER", "BARTENDER", "HOST", "COOK", "SOUS_CHEF", "HEAD_CHEF", "DISHWASHER", "BUSSER", "MANAGER", "GENERAL_MANAGER"] as const;
const STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const updateShiftSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  position: z.enum(POSITIONS).optional(),
  status: z.enum(STATUSES).optional(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  if (session.user.role === "EMPLOYEE" && shift.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = updateShiftSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.shift.update({
    where: { id: params.id },
    data: result.data,
    include: {
      user: { select: { id: true, name: true, email: true, image: true, position: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  await prisma.shift.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
