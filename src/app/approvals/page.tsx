import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { ApprovalActions } from "@/components/ApprovalActions";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const entries = await prisma.overtimeEntry.findMany({
    where: { approvals: { some: { approverId: session.user.id } } },
    include: {
      employee: { select: { name: true, email: true } },
      project: true,
      approvals: { include: { approver: { select: { id: true, name: true } } } },
    },
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-navy">Approvals Queue</h1>
      <div className="space-y-3">
        {entries.length === 0 && <p className="text-sm text-navy/50">Nothing here.</p>}
        {entries.map((entry) => {
          const myApproval = entry.approvals.find((a) => a.approverId === session.user.id)!;
          const canAct = entry.status === "PENDING" && myApproval.decision === "PENDING";

          return (
            <div key={entry.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-navy">
                  {entry.employee.name} &middot; {format(entry.date, "d MMM yyyy")} &middot;{" "}
                  {entry.startTime}&ndash;{entry.endTime} ({entry.hours}h)
                </span>
                <StatusBadge status={entry.status} />
              </div>
              <p className="mt-1 text-sm text-navy/70">
                {entry.project.name} &middot; {entry.workMode}
              </p>
              <p className="mt-1 text-sm text-navy/50">{entry.reason}</p>

              <ul className="mt-2 space-y-0.5 text-xs text-navy/50">
                {entry.approvals.map((a) => (
                  <li key={a.id}>
                    {a.approver.name}: <StatusBadge status={a.decision} />
                  </li>
                ))}
              </ul>

              {canAct && <ApprovalActions entryId={entry.id} />}
              {!canAct && myApproval.decision !== "PENDING" && (
                <p className="mt-2 text-xs text-navy/50">
                  You already {myApproval.decision.toLowerCase()} this entry.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
