import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const POSITIONS = ["SERVER", "BARTENDER", "HOST", "COOK", "SOUS_CHEF", "HEAD_CHEF", "DISHWASHER", "BUSSER", "MANAGER", "GENERAL_MANAGER"] as const;
const ROLES = ["ADMIN", "MANAGER", "EMPLOYEE"] as const;

const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ROLES).default("EMPLOYEE"),
  position: z.enum(POSITIONS),
  phone: z.string().optional(),
  hourlyRate: z.number().positive().optional(),
  hireDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const position = searchParams.get("position");
  const isActive = searchParams.get("isActive");

  const employees = await prisma.user.findMany({
    where: {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      ...(position && { position }),
      ...(isActive !== null && isActive !== undefined && isActive !== "" && { isActive: isActive === "true" }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      phone: true,
      hourlyRate: true,
      isActive: true,
      hireDate: true,
      image: true,
      _count: { select: { shifts: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const result = createEmployeeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
  }

  const { name, email, password, role, position, phone, hourlyRate, hireDate } = result.data;

  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashedPassword = await bcrypt.hash(password, 12);

  const employee = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      position,
      phone,
      hourlyRate,
      hireDate: hireDate ? new Date(hireDate) : undefined,
    },
    select: {
      id: true, name: true, email: true, role: true, position: true,
      phone: true, hourlyRate: true, isActive: true, hireDate: true, image: true,
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
