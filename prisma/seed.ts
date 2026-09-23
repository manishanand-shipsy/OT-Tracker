import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin User", role: "ADMIN" },
  });

  const approverA = await prisma.user.upsert({
    where: { email: "approver.a@example.com" },
    update: {},
    create: { email: "approver.a@example.com", name: "Approver A" },
  });

  const approverB = await prisma.user.upsert({
    where: { email: "approver.b@example.com" },
    update: {},
    create: { email: "approver.b@example.com", name: "Approver B" },
  });

  const employeeOne = await prisma.user.upsert({
    where: { email: "employee.one@example.com" },
    update: { approver1Id: approverA.id, approver2Id: approverB.id },
    create: {
      email: "employee.one@example.com",
      name: "Employee One",
      approver1Id: approverA.id,
      approver2Id: approverB.id,
    },
  });

  const employeeTwo = await prisma.user.upsert({
    where: { email: "employee.two@example.com" },
    update: { approver1Id: approverA.id, approver2Id: approverB.id },
    create: {
      email: "employee.two@example.com",
      name: "Employee Two",
      approver1Id: approverA.id,
      approver2Id: approverB.id,
    },
  });

  for (const name of ["Project Alpha", "Project Beta", "Internal Tools"]) {
    await prisma.project.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seeded:", {
    admin: admin.email,
    approverA: approverA.email,
    approverB: approverB.email,
    employeeOne: employeeOne.email,
    employeeTwo: employeeTwo.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
