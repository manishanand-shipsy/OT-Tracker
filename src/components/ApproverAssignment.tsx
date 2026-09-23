"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type User = { id: string; name: string; email: string };

export function ApproverAssignment({
  employee,
  candidates,
}: {
  employee: { id: string; approver1Id: string | null; approver2Id: string | null };
  candidates: User[];
}) {
  const router = useRouter();
  const [approver1Id, setApprover1Id] = useState(employee.approver1Id ?? "");
  const [approver2Id, setApprover2Id] = useState(employee.approver2Id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/admin/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approver1Id: approver1Id || null,
        approver2Id: approver2Id || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={approver1Id}
        onChange={(e) => setApprover1Id(e.target.value)}
        className="rounded border border-line px-2 py-1 text-sm"
      >
        <option value="">Approver 1...</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={approver2Id}
        onChange={(e) => setApprover2Id(e.target.value)}
        className="rounded border border-line px-2 py-1 text-sm"
      >
        <option value="">Approver 2...</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={saving}
        className="rounded bg-accent px-3 py-1 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
      {saved && <span className="text-xs text-green-600">Saved</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
