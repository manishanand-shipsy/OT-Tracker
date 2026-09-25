const SLACK_API = "https://slack.com/api";

type SlackApprover = { email: string; name: string };
type SlackEntryInfo = {
  id: string;
  employeeName: string;
  date: string; // pre-formatted, e.g. "24 Sep 2026"
  hours: number;
  projectName: string;
  reason: string;
};

async function slackCall<T>(method: string, token: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Slack ${method} failed: ${json.error ?? res.status}`);
  }
  return json as T;
}

/**
 * DMs an approver via Slack with a link to review the entry. No-op (with a
 * console warning) if SLACK_BOT_TOKEN isn't configured, so notification
 * setup is optional and never blocks the approval flow itself.
 */
export async function sendSlackApprovalRequest(
  approver: SlackApprover,
  entry: SlackEntryInfo
): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn("SLACK_BOT_TOKEN not set — skipping Slack notification for", approver.email);
    return;
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const entryUrl = `${appUrl}/entry/${entry.id}`;

  const { user } = await slackCall<{ user: { id: string } }>("users.lookupByEmail", token, {
    email: approver.email,
  });

  const { channel } = await slackCall<{ channel: { id: string } }>("conversations.open", token, {
    users: user.id,
  });

  await slackCall("chat.postMessage", token, {
    channel: channel.id,
    text: `${entry.employeeName} needs your approval for ${entry.hours}h of overtime on ${entry.date}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Overtime approval needed*\n${entry.employeeName} logged *${entry.hours}h* on ${entry.date} (${entry.projectName}).\n>${entry.reason}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Review & approve" },
            url: entryUrl,
            style: "primary",
          },
        ],
      },
    ],
  });
}
