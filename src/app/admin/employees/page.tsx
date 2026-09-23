import { prisma } from "@/lib/prisma";
import { ApproverAssignment } from "@/components/ApproverAssignment";

export default async function AdminEmployeesPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-navy">Approver Setup</h1>
      <p className="mb-4 text-sm text-navy/50">
        Assign each employee&apos;s two fixed approvers. Both must approve for an entry to be
        approved.
      </p>
      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-lg border border-line bg-white p-4"
          >
            <div className="mb-2">
              <span className="font-medium text-navy">{user.name}</span>{" "}
              <span className="text-sm text-navy/50">({user.email})</span>
            </div>
            <ApproverAssignment
              employee={user}
              candidates={users.filter((u) => u.id !== user.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
