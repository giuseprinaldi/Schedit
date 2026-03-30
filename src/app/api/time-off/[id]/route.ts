import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "DENIED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const request = await prisma.timeOffRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const body = await req.json();

  // If employee, they can only cancel their own pending request
  if (session.user.role === "EMPLOYEE") {
    if (request.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (request.status !== "PENDING") {
      return NextResponse.json({ error: "Cannot modify a reviewed request" }, { status: 400 });
    }
    const updated = await prisma.timeOffRequest.update({
      where: { id: params.id },
      data: { status: "DENIED" },
      include: { user: { select: { id: true, name: true, email: true, image: true, position: true } } },
    });
    return NextResponse.json(updated);
  }

  // Manager/Admin review
  const result = reviewSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const updated = await prisma.timeOffRequest.update({
    where: { id: params.id },
    data: {
      status: result.data.status,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
    include: { user: { select: { id: true, name: true, email: true, image: true, position: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const request = await prisma.timeOffRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "EMPLOYEE" && request.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.timeOffRequest.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
