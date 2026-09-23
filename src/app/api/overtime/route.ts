import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeHoursFromRange, isWithinLoggingWindow } from "@/lib/overtime";
import { getOrCreateProjectByName } from "@/lib/projects";
import { overtimeEntrySchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const view = req.nextUrl.searchParams.get("view") ?? "mine";
  const userId = session.user.id;

  if (view === "approvals") {
    const entries = await prisma.overtimeEntry.findMany({
      where: { approvals: { some: { approverId: userId } } },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        project: true,
        approvals: { include: { approver: { select: { id: true, name: true } } } },
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(entries);
  }

  const entries = await prisma.overtimeEntry.findMany({
    where: { employeeId: userId },
    include: {
      project: true,
      approvals: { include: { approver: { select: { id: true, name: true } } } },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = overtimeEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (!isWithinLoggingWindow(data.date)) {
    return NextResponse.json(
      { error: "Date must be within 3 days before or after today" },
      { status: 400 }
    );
  }

  const employee = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!employee?.approver1Id || !employee?.approver2Id) {
    return NextResponse.json(
      { error: "You don't have two approvers assigned yet. Contact an admin." },
      { status: 400 }
    );
  }

  const project = await getOrCreateProjectByName(data.projectName);

  const entry = await prisma.overtimeEntry.create({
    data: {
      employeeId: employee.id,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      hours: computeHoursFromRange(data.startTime, data.endTime),
      projectId: project.id,
      reason: data.reason,
      workMode: data.workMode,
      approvals: {
        create: [{ approverId: employee.approver1Id }, { approverId: employee.approver2Id }],
      },
    },
    include: { approvals: true, project: true },
  });

  return NextResponse.json(entry, { status: 201 });
}
