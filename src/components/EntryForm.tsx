"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { computeHoursFromRange } from "@/lib/overtime";

type Project = { id: string; name: string };

type ExistingEntry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  projectName: string;
  reason: string;
  workMode: "WFH" | "OFFICE";
};

export function EntryForm({
  projects,
  minDate,
  maxDate,
  existing,
}: {
  projects: Project[];
  minDate: string;
  maxDate: string;
  existing?: ExistingEntry;
}) {
  const router = useRouter();
  const [date, setDate] = useState(existing?.date ?? "");
  const [startTime, setStartTime] = useState(existing?.startTime ?? "");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "");
  const [projectName, setProjectName] = useState(existing?.projectName ?? "");
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [workMode, setWorkMode] = useState<"WFH" | "OFFICE">(existing?.workMode ?? "OFFICE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hoursPreview = useMemo(() => {
    if (!startTime || !endTime || startTime === endTime) return null;
    try {
      return computeHoursFromRange(startTime, endTime);
    } catch {
      return null;
    }
  }, [startTime, endTime]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = { date, startTime, endTime, projectName, reason, workMode };

    const url = existing ? `/api/overtime/${existing.id}` : "/api/overtime";
    const method = existing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] ?? body.error ?? "Something went wrong");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-line bg-white p-6">
      <div>
        <label className="block text-sm font-medium text-navy">Date</label>
        <input
          type="date"
          required
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-navy/50">
          Must be between {minDate} and {maxDate}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-navy">From</label>
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy">To</label>
          <input
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-navy/50">
        {hoursPreview !== null
          ? `${hoursPreview} hour${hoursPreview === 1 ? "" : "s"}${
              endTime && endTime <= startTime ? " (crosses midnight)" : ""
            }`
          : "Hours are calculated automatically from the times above."}
      </p>

      <div>
        <label className="block text-sm font-medium text-navy">Project</label>
        <input
          type="text"
          required
          maxLength={100}
          list="project-suggestions"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Type your project name"
          className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
        />
        <datalist id="project-suggestions">
          {projects.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy">Work Mode</label>
        <div className="mt-1 flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={workMode === "OFFICE"}
              onChange={() => setWorkMode("OFFICE")}
            />
            Office
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={workMode === "WFH"}
              onChange={() => setWorkMode("WFH")}
            />
            Work From Home
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy">Reason</label>
        <textarea
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting ? "Saving..." : existing ? "Save Changes" : "Submit Entry"}
      </button>
    </form>
  );
}
