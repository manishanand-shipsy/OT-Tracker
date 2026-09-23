import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessExport } from "@/lib/authz";

export default async function ExportPage() {
  const session = await auth();
  if (!session?.user || !(await canAccessExport(session.user.id, session.user.role))) {
    notFound();
  }

  const [users, projects] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-lg font-semibold text-navy">Export Overtime Entries</h1>
      <form
        method="get"
        action="/api/export"
        className="space-y-4 rounded-lg border border-line bg-white p-6"
      >
        <div>
          <label className="block text-sm font-medium text-navy">Employee</label>
          <select name="employeeId" className="mt-1 w-full rounded border border-line px-3 py-2 text-sm">
            <option value="">All employees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy">Project</label>
          <select name="projectId" className="mt-1 w-full rounded border border-line px-3 py-2 text-sm">
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy">Status</label>
          <select name="status" className="mt-1 w-full rounded border border-line px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-navy">From</label>
            <input type="date" name="from" className="mt-1 w-full rounded border border-line px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy">To</label>
            <input type="date" name="to" className="mt-1 w-full rounded border border-line px-3 py-2 text-sm" />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Download Excel
        </button>
      </form>
    </div>
  );
}
