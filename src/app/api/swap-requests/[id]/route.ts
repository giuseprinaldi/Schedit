import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();

  const swapRequest = await prisma.shiftSwapRequest.findUnique({
    where: { id: params.id },
    include: { shift: true },
  });
  if (!swapRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Admin can approve/deny any request
  if (session.user.role === "ADMIN") {
    const updated = await prisma.shiftSwapRequest.update({
      where: { id: params.id },
      data: { status },
      include: {
        requester: { select: { id: true, name: true, position: true, image: true } },
        target: { select: { id: true, name: true, position: true, image: true } },
        shift: { select: { id: true, date: true, startTime: true, endTime: true, position: true } },
      },
    });

    // If approved + SWAP, reassign the shift to the target
    if (status === "APPROVED" && swapRequest.type === "SWAP" && swapRequest.targetId) {
      await prisma.shift.update({
        where: { id: swapRequest.shiftId },
        data: { userId: swapRequest.targetId },
      });
    }

    // If approved + GIVEAWAY, reassign to target if set, otherwise mark it open
    if (status === "APPROVED" && swapRequest.type === "GIVEAWAY" && swapRequest.targetId) {
      await prisma.shift.update({
        where: { id: swapRequest.shiftId },
        data: { userId: swapRequest.targetId },
      });
    }

    return NextResponse.json(updated);
  }

  // Employees can cancel their own pending requests
  if (swapRequest.requesterId === session.user.id && status === "CANCELLED") {
    const updated = await prisma.shiftSwapRequest.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
      include: {
        requester: { select: { id: true, name: true, position: true, image: true } },
        target: { select: { id: true, name: true, position: true, image: true } },
        shift: { select: { id: true, date: true, startTime: true, endTime: true, position: true } },
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
