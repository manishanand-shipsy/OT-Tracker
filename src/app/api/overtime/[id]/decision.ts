import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeEntryStatus } from "@/lib/overtime";
import { approvalActionSchema } from "@/lib/validation";
import type { ApprovalDecision } from "@/generated/prisma/client";

/** Shared implementation for the approve/reject route handlers. */
export async function handleDecision(
  req: NextRequest,
  id: string,
  decision: ApprovalDecision
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entry = await prisma.overtimeEntry.findUnique({
    where: { id },
    include: { approvals: true },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const myApproval = entry.approvals.find((a) => a.approverId === session.user.id);
  if (!myApproval) {
    return NextResponse.json(
      { error: "You are not a designated approver for this entry" },
      { status: 403 }
    );
  }
  if (entry.status !== "PENDING") {
    return NextResponse.json(
      { error: "This entry has already been finalized" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = approvalActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.approval.update({
      where: { id: myApproval.id },
      data: { decision, comment: parsed.data.comment, decidedAt: new Date() },
    });

    const allApprovals = await tx.approval.findMany({ where: { overtimeEntryId: id } });
    const newStatus = computeEntryStatus(allApprovals.map((a) => a.decision));

    return tx.overtimeEntry.update({
      where: { id },
      data: { status: newStatus },
      include: { approvals: true, project: true },
    });
  });

  return NextResponse.json(updated);
}
