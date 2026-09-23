import { notFound } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loggingWindowBounds } from "@/lib/overtime";
import { EntryForm } from "@/components/EntryForm";
import { StatusBadge } from "@/components/StatusBadge";

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const entry = await prisma.overtimeEntry.findUnique({
    where: { id },
    include: {
      project: true,
      employee: { select: { id: true, name: true } },
      approvals: { include: { approver: { select: { name: true } } } },
    },
  });
  if (!entry) notFound();

  const isOwner = entry.employee.id === session.user.id;
  const isApprover = entry.approvals.some((a) => a.approverId === session.user.id);
  if (!isOwner && !isApprover && session.user.role !== "ADMIN") {
    notFound();
  }

  const { min, max } = loggingWindowBounds();
  const minDate = format(min, "yyyy-MM-dd");
  const maxDate = format(max, "yyyy-MM-dd");

  const projects = await prisma.project.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-navy">
            {format(entry.date, "d MMM yyyy")} &middot; {entry.startTime}&ndash;{entry.endTime} (
            {entry.hours}h)
          </h1>
          <StatusBadge status={entry.status} />
        </div>
        <p className="text-sm text-navy/70">
          {entry.employee.name} &middot; {entry.project.name} &middot; {entry.workMode}
        </p>
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-navy">Approvals</h2>
        <ul className="space-y-1 text-sm">
          {entry.approvals.map((a) => (
            <li key={a.id} className="flex items-center justify-between">
              <span>{a.approver.name}</span>
              <StatusBadge status={a.decision} />
            </li>
          ))}
        </ul>
      </div>

      {isOwner && entry.status === "PENDING" && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-navy">
            Edit Entry (re-opens both approvals)
          </h2>
          <EntryForm
            projects={projects}
            minDate={minDate}
            maxDate={maxDate}
            existing={{
              id: entry.id,
              date: format(entry.date, "yyyy-MM-dd"),
              startTime: entry.startTime,
              endTime: entry.endTime,
              projectName: entry.project.name,
              reason: entry.reason,
              workMode: entry.workMode,
            }}
          />
        </div>
      )}
    </div>
  );
}
