import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeHoursFromRange, isWithinLoggingWindow } from "@/lib/overtime";
import { getOrCreateProjectByName } from "@/lib/projects";
import { overtimeEntrySchema } from "@/lib/validation";
import { notifyApprovers } from "@/lib/notifications";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const entry = await prisma.overtimeEntry.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      project: true,
      approvals: { include: { approver: { select: { id: true, name: true } } } },
    },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = entry.employeeId === session.user.id;
  const isApprover = entry.approvals.some((a) => a.approverId === session.user.id);
  if (!isOwner && !isApprover && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(entry);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.overtimeEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.employeeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending entries can be edited" },
      { status: 400 }
    );
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

  const project = await getOrCreateProjectByName(data.projectName);

  // Editing re-opens review: reset both approvals to PENDING regardless of
  // whether either approver had already acted.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.approval.updateMany({
      where: { overtimeEntryId: id },
      data: { decision: "PENDING", comment: null, decidedAt: null },
    });
    return tx.overtimeEntry.update({
      where: { id },
      data: {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        hours: computeHoursFromRange(data.startTime, data.endTime),
        projectId: project.id,
        reason: data.reason,
        workMode: data.workMode,
        status: "PENDING",
      },
      include: {
        approvals: { include: { approver: { select: { email: true, name: true } } } },
        project: true,
        employee: { select: { name: true } },
      },
    });
  });

  await notifyApprovers(
    updated,
    updated.approvals.map((a) => a.approver)
  );

  return NextResponse.json(updated);
}
