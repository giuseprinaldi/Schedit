import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const POSITIONS = ["SERVER", "BARTENDER", "HOST", "COOK", "SOUS_CHEF", "HEAD_CHEF", "DISHWASHER", "BUSSER", "MANAGER", "GENERAL_MANAGER"] as const;
const ROLES = ["ADMIN", "EMPLOYEE"] as const;

const updateEmployeeSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(ROLES).optional(),
  position: z.enum(POSITIONS).optional(),
  department: z.string().optional(),
  phone: z.string().optional().nullable(),
  hourlyRate: z.number().positive().optional().nullable(),
  performanceScore: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  hireDate: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "EMPLOYEE" && session.user.id !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, email: true, role: true, position: true,
      department: true, phone: true, hourlyRate: true, performanceScore: true,
      isActive: true, hireDate: true, image: true,
      availability: true, _count: { select: { shifts: true } },
    },
  });

  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "EMPLOYEE" && session.user.id !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = updateEmployeeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
  }

  const { password, email, hireDate, ...rest } = result.data;
  const updateData: any = { ...rest };

  if (email) {
    const existing = await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id: params.id } } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    updateData.email = email.toLowerCase();
  }

  if (password) updateData.password = await bcrypt.hash(password, 12);
  if (hireDate) updateData.hireDate = new Date(hireDate);

  const employee = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true, name: true, email: true, role: true, position: true,
      department: true, phone: true, hourlyRate: true, performanceScore: true,
      isActive: true, hireDate: true, image: true,
      _count: { select: { shifts: true } },
    },
  });

  return NextResponse.json(employee);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (session.user.id === params.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
