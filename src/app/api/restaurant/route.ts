import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const settingsSchema = z.object({
  name: z.string().min(1).optional(),
  openDays: z.array(z.enum(["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"])).optional(),
  openTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  closeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  shiftTemplates: z.array(z.object({
    name: z.string(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  })).optional(),
  minStaffPerShift: z.number().int().min(1).max(50).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find the restaurant owned by an admin
  const restaurant = await prisma.restaurant.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!restaurant) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    ...restaurant,
    openDays: JSON.parse(restaurant.openDays),
    shiftTemplates: JSON.parse(restaurant.shiftTemplates),
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const result = settingsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
  }

  const { openDays, shiftTemplates, ...rest } = result.data;

  const existing = await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } });

  const data: any = { ...rest };
  if (openDays) data.openDays = JSON.stringify(openDays);
  if (shiftTemplates) data.shiftTemplates = JSON.stringify(shiftTemplates);

  const restaurant = existing
    ? await prisma.restaurant.update({ where: { id: existing.id }, data })
    : await prisma.restaurant.create({ data: { ...data, ownerId: session.user.id } });

  return NextResponse.json({
    ...restaurant,
    openDays: JSON.parse(restaurant.openDays),
    shiftTemplates: JSON.parse(restaurant.shiftTemplates),
  });
}
