import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { addDays, startOfWeek } from "date-fns";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.shiftSwapRequest.deleteMany();
  await prisma.shiftNote.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Alex Johnson",
      email: "admin@schedit.com",
      password: passwordHash,
      role: "ADMIN",
      position: "GENERAL_MANAGER",
      phone: "555-0100",
      hourlyRate: 65.0,
      performanceScore: 95,
      hireDate: new Date("2020-01-15"),
    },
  });

  // Restaurant settings
  await prisma.restaurant.create({
    data: {
      name: "The Rustic Spoon",
      ownerId: admin.id,
      openDays: JSON.stringify(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
      openTime: "09:00",
      closeTime: "23:00",
      shiftTemplates: JSON.stringify([
        { name: "Morning", start: "09:00", end: "17:00" },
        { name: "Afternoon", start: "12:00", end: "20:00" },
        { name: "Evening", start: "16:00", end: "00:00" },
      ]),
      minStaffPerShift: 3,
    },
  });

  const employees = await Promise.all([
    prisma.user.create({
      data: {
        name: "Emily Chen",
        email: "emily@schedit.com",
        password: passwordHash,
        role: "EMPLOYEE",
        position: "SERVER",
        phone: "555-0103",
        hourlyRate: 15.0,
        performanceScore: 88,
        hireDate: new Date("2022-04-15"),
      },
    }),
    prisma.user.create({
      data: {
        name: "Marcus Brown",
        email: "marcus@schedit.com",
        password: passwordHash,
        role: "EMPLOYEE",
        position: "BARTENDER",
        phone: "555-0104",
        hourlyRate: 18.0,
        performanceScore: 72,
        hireDate: new Date("2022-07-20"),
      },
    }),
    prisma.user.create({
      data: {
        name: "Sofia Rodriguez",
        email: "sofia@schedit.com",
        password: passwordHash,
        role: "EMPLOYEE",
        position: "HOST",
        phone: "555-0105",
        hourlyRate: 14.0,
        performanceScore: 65,
        hireDate: new Date("2023-01-10"),
      },
    }),
    prisma.user.create({
      data: {
        name: "Tyler Davis",
        email: "tyler@schedit.com",
        password: passwordHash,
        role: "EMPLOYEE",
        position: "COOK",
        phone: "555-0106",
        hourlyRate: 20.0,
        performanceScore: 55,
        hireDate: new Date("2022-11-05"),
      },
    }),
    prisma.user.create({
      data: {
        name: "Aisha Patel",
        email: "aisha@schedit.com",
        password: passwordHash,
        role: "EMPLOYEE",
        position: "SERVER",
        phone: "555-0107",
        hourlyRate: 15.0,
        performanceScore: 91,
        hireDate: new Date("2023-03-22"),
      },
    }),
    prisma.user.create({
      data: {
        name: "Noah Kim",
        email: "noah@schedit.com",
        password: passwordHash,
        role: "EMPLOYEE",
        position: "SOUS_CHEF",
        phone: "555-0108",
        hourlyRate: 25.0,
        performanceScore: 78,
        hireDate: new Date("2022-09-14"),
      },
    }),
    prisma.user.create({
      data: {
        name: "Olivia Martinez",
        email: "olivia@schedit.com",
        password: passwordHash,
        role: "EMPLOYEE",
        position: "BUSSER",
        phone: "555-0109",
        hourlyRate: 13.0,
        performanceScore: 35,
        hireDate: new Date("2023-05-01"),
      },
    }),
    prisma.user.create({
      data: {
        name: "Lucas Thompson",
        email: "lucas@schedit.com",
        password: passwordHash,
        role: "EMPLOYEE",
        position: "DISHWASHER",
        phone: "555-0110",
        hourlyRate: 12.0,
        performanceScore: 42,
        hireDate: new Date("2023-08-15"),
      },
    }),
  ]);

  const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

  for (const employee of employees) {
    for (const day of daysOfWeek) {
      const isWeekend = day === "SATURDAY" || day === "SUNDAY";
      await prisma.availability.create({
        data: {
          userId: employee.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: isWeekend ? "22:00" : "20:00",
          isAvailable: true,
        },
      });
    }
  }

  // Create shifts for current week (published)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const shiftTemplates = [
    { startTime: "09:00", endTime: "17:00" },
    { startTime: "12:00", endTime: "20:00" },
    { startTime: "16:00", endTime: "00:00" },
  ];

  const shiftsToCreate = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const shiftDate = addDays(weekStart, dayOffset);
    const shuffled = [...employees].sort(() => Math.random() - 0.5).slice(0, 6);

    for (let i = 0; i < shuffled.length; i++) {
      const template = shiftTemplates[i % shiftTemplates.length];
      const isPast = shiftDate < today;
      shiftsToCreate.push({
        userId: shuffled[i].id,
        date: shiftDate,
        startTime: template.startTime,
        endTime: template.endTime,
        position: shuffled[i].position,
        status: isPast ? "COMPLETED" : "SCHEDULED",
        isPublished: true,
        createdById: admin.id,
      });
    }
  }

  await prisma.shift.createMany({ data: shiftsToCreate });

  await prisma.timeOffRequest.create({
    data: {
      userId: employees[0].id,
      startDate: addDays(today, 5),
      endDate: addDays(today, 7),
      reason: "Family vacation planned in advance.",
      status: "PENDING",
    },
  });

  await prisma.timeOffRequest.create({
    data: {
      userId: employees[2].id,
      startDate: addDays(today, 10),
      endDate: addDays(today, 10),
      reason: "Medical appointment",
      status: "APPROVED",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      title: "New time-off request",
      message: `${employees[0].name} has submitted a time-off request.`,
      recipientId: admin.id,
      senderId: employees[0].id,
      link: "/time-off",
    },
  });

  await prisma.notification.create({
    data: {
      title: "Schedule published",
      message: "The schedule for next week has been published.",
      recipientId: employees[0].id,
      senderId: admin.id,
      link: "/schedule",
    },
  });

  console.log("\nDatabase seeded successfully!");
  console.log("\nTest accounts:");
  console.log("  Admin:    admin@schedit.com / password123");
  console.log("  Employee: emily@schedit.com / password123");
  console.log("  Employee: marcus@schedit.com / password123");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
