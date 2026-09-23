import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loggingWindowBounds } from "@/lib/overtime";
import { EntryForm } from "@/components/EntryForm";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [entries, projects, me] = await Promise.all([
    prisma.overtimeEntry.findMany({
      where: { employeeId: session.user.id },
      include: { project: true },
      orderBy: { date: "desc" },
    }),
    prisma.project.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);

  const { min, max } = loggingWindowBounds();
  const minDate = format(min, "yyyy-MM-dd");
  const maxDate = format(max, "yyyy-MM-dd");
  const hasApprovers = Boolean(me?.approver1Id && me?.approver2Id);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-navy">Log Overtime</h1>
        {hasApprovers ? (
          <EntryForm projects={projects} minDate={minDate} maxDate={maxDate} />
        ) : (
          <p className="rounded border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            You don&apos;t have two approvers assigned yet. Ask an admin to set them up under
            Approver Setup before you can log overtime.
          </p>
        )}
      </div>

      <div>
        <h1 className="mb-4 text-lg font-semibold text-navy">My Entries</h1>
        <div className="space-y-3">
          {entries.length === 0 && (
            <p className="text-sm text-navy/50">No entries yet.</p>
          )}
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/entry/${entry.id}`}
              className="block rounded-lg border border-line bg-white p-4 hover:border-accent"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-navy">
                  {format(entry.date, "d MMM yyyy")} &middot; {entry.startTime}&ndash;
                  {entry.endTime} ({entry.hours}h)
                </span>
                <StatusBadge status={entry.status} />
              </div>
              <p className="mt-1 text-sm text-navy/70">
                {entry.project.name} &middot; {entry.workMode}
              </p>
              <p className="mt-1 truncate text-sm text-navy/50">{entry.reason}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
