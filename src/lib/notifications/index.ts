import { format } from "date-fns";
import { sendSlackApprovalRequest } from "./slack";

type ApproverContact = { email: string; name: string };
type NotifiableEntry = {
  id: string;
  date: Date;
  hours: number;
  reason: string;
  employee: { name: string };
  project: { name: string };
};

/**
 * Notifies each approver on Slack that a new (or re-opened) entry needs
 * their decision. Per-approver failures (missing config, bad email, Slack
 * API error) are logged and skipped rather than blocking entry creation.
 */
export async function notifyApprovers(entry: NotifiableEntry, approvers: ApproverContact[]): Promise<void> {
  const info = {
    id: entry.id,
    employeeName: entry.employee.name,
    date: format(entry.date, "d MMM yyyy"),
    hours: entry.hours,
    projectName: entry.project.name,
    reason: entry.reason,
  };

  await Promise.all(
    approvers.map((approver) =>
      sendSlackApprovalRequest(approver, info).catch((err) =>
        console.error(`Slack notification failed for ${approver.email}:`, err)
      )
    )
  );
}
