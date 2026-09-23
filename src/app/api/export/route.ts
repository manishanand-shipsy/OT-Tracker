import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessExport } from "@/lib/authz";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !(await canAccessExport(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const employeeId = params.get("employeeId");
  const projectId = params.get("projectId");
  const status = params.get("status");
  const from = params.get("from");
  const to = params.get("to");

  const where: Prisma.OvertimeEntryWhereInput = {};
  if (employeeId) where.employeeId = employeeId;
  if (projectId) where.projectId = projectId;
  if (status) where.status = status as Prisma.EnumEntryStatusFilter["equals"];
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const entries = await prisma.overtimeEntry.findMany({
    where,
    include: {
      employee: { select: { name: true, email: true } },
      project: { select: { name: true } },
      approvals: { include: { approver: { select: { name: true } } } },
    },
    orderBy: { date: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Overtime Entries");
  sheet.columns = [
    { header: "Employee", key: "employee", width: 24 },
    { header: "Email", key: "email", width: 28 },
    { header: "Date", key: "date", width: 14 },
    { header: "From", key: "startTime", width: 10 },
    { header: "To", key: "endTime", width: 10 },
    { header: "Hours", key: "hours", width: 10 },
    { header: "Project", key: "project", width: 20 },
    { header: "Work Mode", key: "workMode", width: 12 },
    { header: "Reason", key: "reason", width: 40 },
    { header: "Status", key: "status", width: 12 },
    { header: "Approver 1", key: "approver1", width: 20 },
    { header: "Approver 1 Decision", key: "approver1Decision", width: 18 },
    { header: "Approver 2", key: "approver2", width: 20 },
    { header: "Approver 2 Decision", key: "approver2Decision", width: 18 },
  ];

  for (const entry of entries) {
    const [a1, a2] = entry.approvals;
    sheet.addRow({
      employee: entry.employee.name,
      email: entry.employee.email,
      date: entry.date.toISOString().slice(0, 10),
      startTime: entry.startTime,
      endTime: entry.endTime,
      hours: entry.hours,
      project: entry.project.name,
      workMode: entry.workMode,
      reason: entry.reason,
      status: entry.status,
      approver1: a1?.approver.name ?? "",
      approver1Decision: a1?.decision ?? "",
      approver2: a2?.approver.name ?? "",
      approver2Decision: a2?.decision ?? "",
    });
  }
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="overtime-entries-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
    },
  });
}
