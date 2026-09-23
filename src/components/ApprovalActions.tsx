"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApprovalActions({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(decision: "approve" | "reject") {
    setSubmitting(decision === "approve" ? "APPROVED" : "REJECTED");
    setError(null);
    const res = await fetch(`/api/overtime/${entryId}/${decision}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: comment || undefined }),
    });
    setSubmitting(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="w-full rounded border border-line px-2 py-1 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => act("approve")}
          disabled={submitting !== null}
          className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {submitting === "APPROVED" ? "Approving..." : "Approve"}
        </button>
        <button
          onClick={() => act("reject")}
          disabled={submitting !== null}
          className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting === "REJECTED" ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </div>
  );
}
